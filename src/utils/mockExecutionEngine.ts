import { StrategyDetail, CostDimension, FactorTarget } from '../types/wms';
import {
  ExecutionTrace, RuleTrace, StepTrace, FilterTrace,
  CandidateTrace, FactorScoreEntry, GuardrailHit,
  ResourceLockEvent, CostBreakdown,
} from '../types/trace';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

type LockEntry = { lockType: 'SOFT' | 'HARD'; stepId: string; ruleId: string };

function genFactorScores(sorters: StrategyDetail['rules'][0]['steps'][0]['sorters']): FactorScoreEntry[] {
  return sorters.map(s => {
    const score = randomFloat(0.1, 1.0);
    return {
      factorId: s.factorId,
      factorName: s.factorName,
      score,
      rawValue: randomFloat(0, 100),
      weight: s.weight,
      weightedContribution: Math.round(score * s.weight) / 100,
    };
  });
}

function genCostBreakdown(
  costDimensionIds: string[],
  allDimensions: CostDimension[],
  candidateIndex: number
): CostBreakdown[] {
  return costDimensionIds
    .map(id => allDimensions.find(d => d.id === id))
    .filter((d): d is CostDimension => !!d && d.enabled)
    .map(d => ({
      dimensionId: d.id,
      dimensionName: d.name,
      type: d.type,
      estimatedCost: Math.round(d.baseRate * randomFloat(0.5, 3.0) * (1 + candidateIndex * 0.05) * 100) / 100,
      unit: d.unit,
    }));
}

function genCandidates(
  count: number,
  sorters: StrategyDetail['rules'][0]['steps'][0]['sorters'],
  subject: string,
  costOpt: StrategyDetail['rules'][0]['steps'][0]['costOptimization'],
  allDimensions: CostDimension[]
): CandidateTrace[] {
  const candidates = Array.from({ length: count }, (_, i) => {
    const factorScores = genFactorScores(sorters);
    let totalScore = factorScores.reduce((acc, f) => acc + f.weightedContribution, 0);

    let costBreakdown: CostBreakdown[] | undefined;
    let estimatedTotalCost: number | undefined;

    if (costOpt?.enabled && costOpt.costDimensionIds.length > 0) {
      costBreakdown = genCostBreakdown(costOpt.costDimensionIds, allDimensions, i);
      estimatedTotalCost = Math.round(costBreakdown.reduce((acc, c) => acc + c.estimatedCost, 0) * 100) / 100;

      // Blend cost into score: higher cost → lower score contribution
      const costWeight = (costOpt.costWeightInSorter ?? 0) / 100;
      if (costWeight > 0 && estimatedTotalCost > 0) {
        const costScore = 1 / (1 + estimatedTotalCost / 100); // normalize to 0-1 inversely
        totalScore = totalScore * (1 - costWeight) + costScore * costWeight;
      }
    }

    return {
      candidateId: `${subject}-${String(i + 1).padStart(3, '0')}`,
      candidateLabel: `${subject} #${i + 1}`,
      factorScores,
      totalScore: Math.round(totalScore * 100) / 100,
      rank: 0,
      selected: false,
      costBreakdown,
      estimatedTotalCost,
    };
  }).sort((a, b) => b.totalScore - a.totalScore)
    .map((c, i) => ({ ...c, rank: i + 1, selected: i === 0 }));
  return candidates.slice(0, Math.min(count, 5));
}

function genStepTrace(
  step: StrategyDetail['rules'][0]['steps'][0],
  ruleId: string,
  inputCount: number,
  lockRegistry: Map<string, LockEntry>,
  allDimensions: CostDimension[]
): StepTrace {
  const filtersApplied: FilterTrace[] = step.filters.map(f => ({
    filterId: f.id,
    field: f.field,
    operator: f.operator,
    value: f.value,
    candidatesRemovedCount: randomInt(1, Math.max(1, Math.floor(inputCount * 0.2))),
  }));

  const removedTotal = filtersApplied.reduce((acc, f) => acc + f.candidatesRemovedCount, 0);
  let outputCount = Math.max(1, inputCount - removedTotal);

  let truncatedByConstraint: StepTrace['truncatedByConstraint'];
  const constraints = step.executionConstraints;
  if (constraints?.maxCandidates && inputCount > constraints.maxCandidates) {
    outputCount = Math.min(outputCount, constraints.maxCandidates);
    truncatedByConstraint = 'MAX_CANDIDATES';
  }
  if (constraints?.maxOutputCount && outputCount > constraints.maxOutputCount) {
    outputCount = constraints.maxOutputCount;
    truncatedByConstraint = 'MAX_OUTPUT';
  }

  // Resource locking simulation
  const lockEvents: ResourceLockEvent[] = [];
  const rl = step.resourceLocking;
  if (rl?.acquireOnEntry) {
    const resourceType = (step.outputSubject ?? step.targetSubject ?? 'LOCATION') as FactorTarget;
    const lockCount = randomInt(1, Math.min(3, outputCount));
    for (let i = 0; i < lockCount; i++) {
      const resourceId = `${resourceType}-res-${randomInt(1, 20)}`;
      const existing = lockRegistry.get(resourceId);
      if (existing) {
        lockEvents.push({
          eventType: 'CONFLICT',
          resourceId,
          resourceType,
          lockType: rl.lockType,
          stepId: step.id,
          ruleId,
          conflictingStepId: existing.stepId,
        });
        if (existing.lockType === 'HARD') {
          outputCount = Math.max(1, outputCount - 1);
        }
      } else {
        lockRegistry.set(resourceId, { lockType: rl.lockType, stepId: step.id, ruleId });
        lockEvents.push({ eventType: 'ACQUIRE', resourceId, resourceType, lockType: rl.lockType, stepId: step.id, ruleId });
      }
    }
  }

  const subject = (step.outputSubject ?? step.targetSubject ?? 'LOCATION') as string;
  const topCandidates = step.sorters.length > 0
    ? genCandidates(Math.min(outputCount, 5), step.sorters, subject, step.costOptimization, allDimensions)
    : [];

  // Cost summary for the step
  let costSummary: StepTrace['costSummary'];
  if (step.costOptimization?.enabled && topCandidates.length > 0) {
    const allCosts = topCandidates.flatMap(c => c.costBreakdown ?? []);
    const byDimension: CostBreakdown[] = [];
    for (const cb of allCosts) {
      const existing = byDimension.find(b => b.dimensionId === cb.dimensionId);
      if (existing) {
        existing.estimatedCost = Math.round((existing.estimatedCost + cb.estimatedCost / topCandidates.length) * 100) / 100;
      } else {
        byDimension.push({ ...cb, estimatedCost: Math.round(cb.estimatedCost / topCandidates.length * 100) / 100 });
      }
    }
    costSummary = {
      totalEstimated: Math.round(byDimension.reduce((acc, b) => acc + b.estimatedCost, 0) * 100) / 100,
      byDimension,
    };
  }

  return {
    stepId: step.id,
    stepName: step.name,
    inputCount,
    outputCount,
    filtersApplied,
    topCandidates,
    flowDecision: step.flowControl === 'TERMINATE' ? 'TERMINATE' : 'CONTINUE',
    durationMs: randomInt(5, constraints?.timeoutMs ? Math.min(constraints.timeoutMs - 10, 200) : 200),
    truncatedByConstraint,
    lockEvents: lockEvents.length > 0 ? lockEvents : undefined,
    costSummary,
  };
}

function genRuleTrace(
  rule: StrategyDetail['rules'][0],
  inputCount: number,
  lockRegistry: Map<string, LockEntry>,
  allDimensions: CostDimension[]
): RuleTrace {
  const hasCriteria = rule.matchingCriteria.length > 0;
  const activated = !hasCriteria || Math.random() > 0.2;

  if (!activated) {
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      activated: false,
      skippedReason: '匹配条件不满足，跳过此规则',
      steps: [],
      durationMs: randomInt(1, 5),
    };
  }

  const steps: StepTrace[] = [];
  let currentCount = inputCount;
  for (const step of rule.steps) {
    const stepTrace = genStepTrace(step, rule.id, currentCount, lockRegistry, allDimensions);
    steps.push(stepTrace);
    if (stepTrace.flowDecision === 'TERMINATE') break;
    currentCount = stepTrace.outputCount;
  }

  const totalDuration = steps.reduce((acc, s) => acc + s.durationMs, 0);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    activated: true,
    activationReason: hasCriteria ? '匹配准入条件通过' : '无准入条件，默认执行',
    steps,
    durationMs: totalDuration,
  };
}

export function executeStrategy(
  strategy: StrategyDetail,
  inputContext: Record<string, unknown> = {},
  costDimensions: CostDimension[] = []
): ExecutionTrace {
  const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const startTime = new Date().toISOString();
  const initialCandidateCount = randomInt(80, 500);

  // Guardrail evaluation
  const guardrailsEvaluated: GuardrailHit[] = (strategy.guardrails ?? [])
    .filter(g => g.active)
    .map(g => ({
      guardrailId: g.id,
      guardrailName: g.name,
      type: g.type,
      hitCount: g.type === 'BLOCK' ? randomInt(0, 15) : randomInt(0, 5),
      sampleCandidateIds: Array.from({ length: randomInt(1, 3) }, (_, i) => `cand-${i + 1}`),
      reason: g.criteria.map(c => `${c.field} ${c.operator} ${c.value}`).join(', '),
    }));

  const blockedCount = guardrailsEvaluated
    .filter(g => g.type === 'BLOCK')
    .reduce((acc, g) => acc + g.hitCount, 0);
  const afterGuardrails = Math.max(10, initialCandidateCount - blockedCount);

  // Shared lock registry across all rules in this execution
  const lockRegistry = new Map<string, LockEntry>();

  // Rule execution
  const ruleTraces: RuleTrace[] = [];
  let currentCount = afterGuardrails;

  for (const rule of strategy.rules) {
    if (!rule.enabled) continue;
    const ruleTrace = genRuleTrace(rule, currentCount, lockRegistry, costDimensions);
    ruleTraces.push(ruleTrace);

    if (ruleTrace.activated && ruleTrace.steps.length > 0) {
      const lastStep = ruleTrace.steps[ruleTrace.steps.length - 1];
      if (rule.flowControl === 'TERMINATE' || lastStep.flowDecision === 'TERMINATE') {
        currentCount = lastStep.outputCount;
        break;
      }
      currentCount = lastStep.outputCount;
    }
  }

  // Aggregate lock summary
  const allLockEvents = ruleTraces.flatMap(r => r.steps.flatMap(s => s.lockEvents ?? []));
  const resourceLockSummary = allLockEvents.length > 0 ? {
    acquired:   allLockEvents.filter(e => e.eventType === 'ACQUIRE').length,
    released:   allLockEvents.filter(e => e.eventType === 'RELEASE').length,
    conflicts:  allLockEvents.filter(e => e.eventType === 'CONFLICT').length,
    rolledBack: allLockEvents.filter(e => e.eventType === 'ROLLBACK').length,
  } : undefined;

  // Aggregate cost summary
  const allCostSummaries = ruleTraces.flatMap(r => r.steps.map(s => s.costSummary).filter(Boolean));
  let totalEstimatedCost: number | undefined;
  let costBreakdownSummary: CostBreakdown[] | undefined;
  if (allCostSummaries.length > 0) {
    const merged: Record<string, CostBreakdown> = {};
    for (const cs of allCostSummaries) {
      if (!cs) continue;
      for (const b of cs.byDimension) {
        if (merged[b.dimensionId]) {
          merged[b.dimensionId].estimatedCost = Math.round((merged[b.dimensionId].estimatedCost + b.estimatedCost) * 100) / 100;
        } else {
          merged[b.dimensionId] = { ...b };
        }
      }
    }
    costBreakdownSummary = Object.values(merged);
    totalEstimatedCost = Math.round(costBreakdownSummary.reduce((acc, b) => acc + b.estimatedCost, 0) * 100) / 100;
  }

  const totalDurationMs = ruleTraces.reduce((acc, r) => acc + r.durationMs, 0) + randomInt(5, 30);
  const finalCount = Math.max(1, currentCount);
  const subject = strategy.primarySubject;

  const topCandidates: CandidateTrace[] = Array.from({ length: Math.min(finalCount, 5) }, (_, i) => ({
    candidateId: `${subject}-final-${String(i + 1).padStart(3, '0')}`,
    candidateLabel: `${subject} 候选 #${i + 1}`,
    factorScores: [],
    totalScore: randomFloat(0.5, 1.0),
    rank: i + 1,
    selected: i === 0,
  }));

  return {
    traceId,
    strategyId: strategy.id,
    strategyName: strategy.name,
    startTime,
    totalDurationMs,
    inputContext,
    guardrailsEvaluated,
    rules: ruleTraces,
    finalOutput: { subject, count: finalCount, topCandidates },
    decisionSummary: `输入 ${initialCandidateCount} 个候选，护栏拦截 ${blockedCount} 个，经 ${ruleTraces.filter(r => r.activated).length} 条规则处理，最终输出 ${finalCount} 个结果。`,
    resourceLockSummary,
    totalEstimatedCost,
    costBreakdownSummary,
  };
}

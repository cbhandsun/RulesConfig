import { StrategyDetail } from '../types/wms';
import {
  ExecutionTrace, RuleTrace, StepTrace, FilterTrace,
  CandidateTrace, FactorScoreEntry, GuardrailHit
} from '../types/trace';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

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

function genCandidates(count: number, sorters: StrategyDetail['rules'][0]['steps'][0]['sorters'], subject: string): CandidateTrace[] {
  const candidates = Array.from({ length: count }, (_, i) => {
    const factorScores = genFactorScores(sorters);
    const totalScore = factorScores.reduce((acc, f) => acc + f.weightedContribution, 0);
    return {
      candidateId: `${subject}-${String(i + 1).padStart(3, '0')}`,
      candidateLabel: `${subject} #${i + 1}`,
      factorScores,
      totalScore: Math.round(totalScore * 100) / 100,
      rank: 0,
      selected: false,
    };
  }).sort((a, b) => b.totalScore - a.totalScore)
    .map((c, i) => ({ ...c, rank: i + 1, selected: i === 0 }));
  return candidates.slice(0, Math.min(count, 5));
}

function genStepTrace(
  step: StrategyDetail['rules'][0]['steps'][0],
  inputCount: number
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

  const subject = (step.outputSubject ?? step.targetSubject ?? 'LOCATION') as string;
  const topCandidates = step.sorters.length > 0 ? genCandidates(Math.min(outputCount, 5), step.sorters, subject) : [];

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
  };
}

function genRuleTrace(rule: StrategyDetail['rules'][0], inputCount: number): RuleTrace {
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
    const stepTrace = genStepTrace(step, currentCount);
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
  inputContext: Record<string, unknown> = {}
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

  // Rule execution
  const ruleTraces: RuleTrace[] = [];
  let currentCount = afterGuardrails;

  for (const rule of strategy.rules) {
    if (!rule.enabled) continue;
    const ruleTrace = genRuleTrace(rule, currentCount);
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
  };
}

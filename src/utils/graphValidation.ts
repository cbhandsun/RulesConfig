import { StrategyDetail, StrategyRule, GlobalGuardrail } from '../types/wms';

export type ValidationIssueType = 'CYCLE' | 'DEAD_RULE' | 'MISSING_JUMP_TARGET' | 'GUARDRAIL_CONFLICT';
export type ValidationSeverity = 'ERROR' | 'WARNING';

export interface ValidationIssue {
  type: ValidationIssueType;
  severity: ValidationSeverity;
  ruleIds: string[];
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function detectJumpCycles(rules: StrategyRule[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const ruleMap = new Map(rules.map(r => [r.id, r]));

  const dfs = (ruleId: string, path: string[]): boolean => {
    if (inStack.has(ruleId)) {
      const cycleStart = path.indexOf(ruleId);
      const cyclePath = path.slice(cycleStart);
      issues.push({
        type: 'CYCLE',
        severity: 'ERROR',
        ruleIds: cyclePath,
        message: `规则 JUMP 形成环路：${cyclePath.map(id => ruleMap.get(id)?.name ?? id).join(' → ')} → ${ruleMap.get(ruleId)?.name ?? ruleId}`
      });
      return true;
    }
    if (visited.has(ruleId)) return false;

    visited.add(ruleId);
    inStack.add(ruleId);

    const rule = ruleMap.get(ruleId);
    if (rule?.flowControl === 'JUMP' && rule.jumpTargetId) {
      dfs(rule.jumpTargetId, [...path, ruleId]);
    }
    if (rule?.branches) {
      for (const branch of rule.branches) {
        if (branch.targetRuleId) dfs(branch.targetRuleId, [...path, ruleId]);
      }
    }

    inStack.delete(ruleId);
    return false;
  };

  for (const rule of rules) {
    if (!visited.has(rule.id)) {
      dfs(rule.id, []);
    }
  }

  return issues;
}

export function detectMissingJumpTargets(rules: StrategyRule[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ruleIds = new Set(rules.map(r => r.id));

  for (const rule of rules) {
    if (rule.flowControl === 'JUMP' && rule.jumpTargetId) {
      if (!ruleIds.has(rule.jumpTargetId)) {
        issues.push({
          type: 'MISSING_JUMP_TARGET',
          severity: 'ERROR',
          ruleIds: [rule.id],
          message: `规则「${rule.name}」的 JUMP 目标 ID「${rule.jumpTargetId}」不存在于当前策略中`
        });
      }
    }
    if (rule.branches) {
      for (const branch of rule.branches) {
        if (branch.targetRuleId && !ruleIds.has(branch.targetRuleId)) {
          issues.push({
            type: 'MISSING_JUMP_TARGET',
            severity: 'ERROR',
            ruleIds: [rule.id],
            message: `规则「${rule.name}」分支「${branch.conditionLabel}」的目标 ID「${branch.targetRuleId}」不存在`
          });
        }
      }
    }
  }

  return issues;
}

export function detectDeadRules(rules: StrategyRule[]): ValidationIssue[] {
  if (rules.length <= 1) return [];

  const reachable = new Set<string>();
  if (rules[0]) reachable.add(rules[0].id);

  for (const rule of rules) {
    if (rule.flowControl === 'JUMP' && rule.jumpTargetId) reachable.add(rule.jumpTargetId);
    if (rule.branches) {
      for (const branch of rule.branches) {
        if (branch.targetRuleId) reachable.add(branch.targetRuleId);
      }
    }
    // CONTINUE 流控下，顺序可达下一条
    if (rule.flowControl === 'CONTINUE' || !rule.flowControl) {
      const idx = rules.findIndex(r => r.id === rule.id);
      if (idx >= 0 && idx + 1 < rules.length) reachable.add(rules[idx + 1].id);
    }
  }

  const issues: ValidationIssue[] = [];
  for (const rule of rules) {
    if (!reachable.has(rule.id) && rule.enabled) {
      issues.push({
        type: 'DEAD_RULE',
        severity: 'WARNING',
        ruleIds: [rule.id],
        message: `规则「${rule.name}」无法从任何路径到达，可能永远不会执行`
      });
    }
  }

  return issues;
}

export function detectGuardrailConflicts(
  rules: StrategyRule[],
  guardrails: GlobalGuardrail[] = []
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const blockGuardrails = guardrails.filter(g => g.type === 'BLOCK' && g.active);

  const CONFLICT_PAIRS: Record<string, string> = {
    '==': '!=', '!=': '==', '>': '<=', '<': '>=', '>=': '<', '<=': '>',
  };

  for (const guardrail of blockGuardrails) {
    for (const rule of rules) {
      for (const step of rule.steps) {
        for (const filter of step.filters) {
          for (const gc of guardrail.criteria) {
            if (
              filter.field === gc.field &&
              filter.value === gc.value &&
              CONFLICT_PAIRS[gc.operator] === filter.operator
            ) {
              issues.push({
                type: 'GUARDRAIL_CONFLICT',
                severity: 'WARNING',
                ruleIds: [rule.id],
                message: `规则「${rule.name}」步骤「${step.name}」的过滤条件（${filter.field} ${filter.operator} ${filter.value}）与护栏「${guardrail.name}」的拦截条件可能存在逻辑矛盾`
              });
            }
          }
        }
      }
    }
  }

  return issues;
}

export function validateStrategyGraph(strategy: StrategyDetail): ValidationResult {
  const allIssues: ValidationIssue[] = [
    ...detectJumpCycles(strategy.rules),
    ...detectMissingJumpTargets(strategy.rules),
    ...detectDeadRules(strategy.rules),
    ...detectGuardrailConflicts(strategy.rules, strategy.guardrails),
  ];

  return {
    valid: allIssues.every(i => i.severity !== 'ERROR'),
    issues: allIssues,
  };
}

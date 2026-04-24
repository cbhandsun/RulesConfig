import { FactorTarget, ResourceLockType, CostDimensionType } from './wms';

export interface FilterTrace {
  filterId: string;
  field: string;
  operator: string;
  value: string;
  candidatesRemovedCount: number;
}

export interface FactorScoreEntry {
  factorId: string;
  factorName: string;
  score: number;           // normalized 0-1
  rawValue: number;
  weight: number;
  weightedContribution: number;
}

export interface CandidateTrace {
  candidateId: string;
  candidateLabel: string;
  factorScores: FactorScoreEntry[];
  totalScore: number;
  rank: number;
  selected: boolean;
  costBreakdown?: CostBreakdown[];
  estimatedTotalCost?: number;
}

export interface GuardrailHit {
  guardrailId: string;
  guardrailName: string;
  type: 'BLOCK' | 'WARNING';
  hitCount: number;
  sampleCandidateIds: string[];
  reason: string;
}

export interface StepTrace {
  stepId: string;
  stepName: string;
  inputCount: number;
  outputCount: number;
  filtersApplied: FilterTrace[];
  topCandidates: CandidateTrace[];
  flowDecision: 'TERMINATE' | 'CONTINUE' | 'FAILOVER';
  durationMs: number;
  truncatedByConstraint?: 'MAX_CANDIDATES' | 'TIMEOUT' | 'MAX_OUTPUT';
  lockEvents?: ResourceLockEvent[];
  costSummary?: { totalEstimated: number; byDimension: CostBreakdown[] };
}

export interface RuleTrace {
  ruleId: string;
  ruleName: string;
  activated: boolean;
  activationReason?: string;
  skippedReason?: string;
  steps: StepTrace[];
  durationMs: number;
}

export interface ExecutionTrace {
  traceId: string;
  strategyId: string;
  strategyName: string;
  startTime: string;
  totalDurationMs: number;
  inputContext: Record<string, unknown>;
  guardrailsEvaluated: GuardrailHit[];
  rules: RuleTrace[];
  finalOutput: {
    subject: FactorTarget;
    count: number;
    topCandidates: CandidateTrace[];
  };
  decisionSummary: string;
  resourceLockSummary?: {
    acquired: number;
    released: number;
    conflicts: number;
    rolledBack: number;
  };
  totalEstimatedCost?: number;
  costBreakdownSummary?: CostBreakdown[];
}

export type LockEventType = 'ACQUIRE' | 'RELEASE' | 'ROLLBACK' | 'CONFLICT';

export interface ResourceLockEvent {
  eventType: LockEventType;
  resourceId: string;
  resourceType: FactorTarget;
  lockType: ResourceLockType;
  stepId: string;
  ruleId: string;
  conflictingStepId?: string;
}

export interface CostBreakdown {
  dimensionId: string;
  dimensionName: string;
  type: CostDimensionType;
  estimatedCost: number;
  unit: string;
}

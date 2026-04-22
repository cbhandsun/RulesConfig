import { FactorTarget, RuleStep, RuleStepAction, RuleStepType } from '../types/wms';

export const getEffectiveInputSubject = (step: RuleStep, strategyPrimarySubject: FactorTarget): FactorTarget => {
  return step.inputSubject ?? step.targetSubject ?? strategyPrimarySubject;
};

export const getEffectiveOutputSubject = (step: RuleStep, strategyPrimarySubject: FactorTarget): FactorTarget => {
  return step.outputSubject ?? step.inputSubject ?? step.targetSubject ?? strategyPrimarySubject;
};

export const inferLegacyStepType = (step: RuleStep): RuleStepType => {
  if (step.sorters.length > 0) {
    return step.outputSubject && step.outputSubject !== getEffectiveInputSubject(step, step.outputSubject) ? 'TRANSFORM' : 'SELECT';
  }

  if (step.outputSubject && step.outputSubject !== getEffectiveInputSubject(step, step.outputSubject)) {
    return 'TRANSFORM';
  }

  return 'FILTER';
};

export const inferLegacyStepAction = (step: RuleStep): RuleStepAction => {
  const configValues = Object.values(step.config ?? {}).map(value => String(value).toUpperCase());
  const text = `${step.name} ${step.description ?? ''} ${configValues.join(' ')}`.toUpperCase();

  if (step.failoverAction === 'SPLIT_NEW_WO' || text.includes('SPLIT')) return 'SPLIT';
  if (text.includes('SUSPEND') || text.includes('HOLD') || step.failoverAction === 'ERROR_SUSPEND') return 'SUSPEND';
  if (text.includes('TASK')) return 'GENERATE_TASK';
  if (text.includes('ALLOCATE')) return 'ALLOCATE';
  if (text.includes('LOCK')) return 'LOCK';
  if (text.includes('ASSIGN') || text.includes('MANUAL_OVERRIDE')) return 'ASSIGN';
  if (text.includes('ROUTE') || text.includes('ZONEPREFERENCE') || text.includes('CROSS-DOCK')) return 'ROUTE';
  if (step.sorters.length > 0) return 'SELECT';
  if (step.filters.length > 0) return 'VALIDATE';

  return 'NONE';
};

export const getEffectiveStepType = (step: RuleStep): RuleStepType => {
  return step.stepType ?? inferLegacyStepType(step);
};

export const getEffectiveStepAction = (step: RuleStep): RuleStepAction => {
  return step.action ?? inferLegacyStepAction(step);
};

export const createDefaultStep = (strategyPrimarySubject: FactorTarget, index: number): RuleStep => ({
  id: `st-${Date.now()}-${index}`,
  name: '新步骤',
  stepType: 'FILTER',
  inputSubject: strategyPrimarySubject,
  outputSubject: strategyPrimarySubject,
  action: 'VALIDATE',
  filters: [],
  sorters: [],
  failoverAction: 'NEXT_STEP',
  flowControl: 'TERMINATE',
});

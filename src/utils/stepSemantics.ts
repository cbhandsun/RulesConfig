import { FactorTarget, RuleStep, RuleStepAction, RuleStepType } from '../types/wms';

export type DecisionFamily =
  | 'ADMISSION'
  | 'SELECTION'
  | 'ASSIGNMENT'
  | 'ROUTING'
  | 'TASKING'
  | 'EXCEPTION'
  | 'INTERMEDIATE';

export const decisionFamilyMeta: Record<DecisionFamily, {
  label: string;
  description: string;
  businessQuestion: string;
}> = {
  ADMISSION: {
    label: '准入 / 校验',
    description: '在正式处理前先判断这笔业务能不能继续。',
    businessQuestion: '这笔需求或对象当前是否满足继续执行的条件？',
  },
  SELECTION: {
    label: '候选优选',
    description: '在候选集合里比较优先级，挑出最值得进入下一步的对象。',
    businessQuestion: '在这些候选里，优先选谁更合适？',
  },
  ASSIGNMENT: {
    label: '分配 / 分拨',
    description: '把需求、库存、库位或资源正式落到承接对象上。',
    businessQuestion: '这笔业务最终该分给谁、给哪里、切给哪一边？',
  },
  ROUTING: {
    label: '路由 / 改道',
    description: '决定下一跳流向、后续节点或处理路径。',
    businessQuestion: '接下来应该走哪条路径、去哪个区域、进入哪个后续节点？',
  },
  TASKING: {
    label: '任务生成',
    description: '把当前决策结果固化为可执行任务。',
    businessQuestion: '现在是否应该落成作业任务，并按什么模板下发？',
  },
  EXCEPTION: {
    label: '拆分 / 异常处理',
    description: '对无法按默认链路处理的业务做拆分、挂起、锁定、释放或推荐处理。',
    businessQuestion: '异常或特殊情况该如何兜底、拆分、冻结或人工接管？',
  },
  INTERMEDIATE: {
    label: '中间处理',
    description: '当前 step 主要承担中间计算、上下文聚合或过程性转换。',
    businessQuestion: '这一步主要在沉淀什么中间结果，供后续判断使用？',
  },
};

export const stepPatternMeta: Record<RuleStepType, { label: string; description: string; focus: string }> = {
  FILTER: {
    label: '过滤',
    description: '先筛掉不满足条件的对象或候选。',
    focus: '重点看过滤属性和硬约束。',
  },
  SELECT: {
    label: '优选',
    description: '对候选对象做评分、排序和择优。',
    focus: '重点看排序因子和优先级逻辑。',
  },
  TRANSFORM: {
    label: '转换',
    description: '把一种对象形态、上下文或中间结果转成另一种业务结果。',
    focus: '重点看输入输出对象如何转化，以及最终执行动作。',
  },
  GATEWAY: {
    label: '网关',
    description: '在多种后续路径之间做分流、改道或异常路由。',
    focus: '重点看放行条件、改道逻辑和后续路径。',
  },
};

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

export const classifyDecisionFamily = (action: RuleStepAction, stepType: RuleStepType): DecisionFamily => {
  if (action === 'VALIDATE' || (stepType === 'FILTER' && action === 'NONE')) return 'ADMISSION';
  if (action === 'SELECT' || action === 'RECOMMEND') return 'SELECTION';
  if (action === 'ASSIGN' || action === 'ALLOCATE' || action === 'LOCK' || action === 'RELEASE') return 'ASSIGNMENT';
  if (action === 'ROUTE' || action === 'REDIRECT' || stepType === 'GATEWAY') return 'ROUTING';
  if (action === 'GENERATE_TASK') return 'TASKING';
  if (action === 'SPLIT' || action === 'SUSPEND') return 'EXCEPTION';
  return 'INTERMEDIATE';
};

export const summarizeSubjectFlow = (inputSubject: FactorTarget, outputSubject: FactorTarget) => {
  return inputSubject === outputSubject ? inputSubject : `${inputSubject} → ${outputSubject}`;
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

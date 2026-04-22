export type StrategyCategory = 'RECEIVING' | 'PUTAWAY' | 'ALLOCATION' | 'WAVE' | 'REPLENISHMENT';
export type StrategyStatus = 'ACTIVE' | 'DRAFT';

export interface Strategy {
  id: string;
  name: string;
  category: StrategyCategory;
  primarySubject: FactorTarget; // 该策略最终寻找/操作的目标业务对象 (如：拣货找库存，上架找库位)
  owner: string;
  scenario: string;
  version: string;
  status: StrategyStatus;
  priority: number;
}

export interface MatchingCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logicalOperator?: 'AND' | 'OR';
}

export type RuleStepType = 'FILTER' | 'SELECT' | 'TRANSFORM' | 'GATEWAY';

export type RuleStepAction =
  | 'NONE'
  | 'VALIDATE'
  | 'SELECT'
  | 'RECOMMEND'
  | 'ASSIGN'
  | 'ROUTE'
  | 'LOCK'
  | 'ALLOCATE'
  | 'GENERATE_TASK'
  | 'SPLIT'
  | 'SUSPEND'
  | 'RELEASE'
  | 'REDIRECT';

export interface StepInputBinding {
  stepId: string;
  alias: string;
  subject: FactorTarget;
  required: boolean;
  mode?: 'ONE' | 'LIST' | 'MAP';
}

export interface RuleStep {
  id: string;
  name: string;
  description?: string; // 步骤说明，描述该配置的内容和业务目的
  stepType?: RuleStepType;
  inputSubject?: FactorTarget;
  upstreamBindings?: StepInputBinding[];
  outputSubject?: FactorTarget;
  action?: RuleStepAction;
  targetSubject?: FactorTarget; // 兼容旧模型，优先使用 input/outputSubject
  filters: MatchingCondition[];
  sorters: { factorId: string; factorName: string; weight: number; direction: 'ASC' | 'DESC' }[];
  failoverAction: 'NEXT_STEP' | 'ERROR_SUSPEND' | 'PIPELINE_NEXT' | 'SPLIT_NEW_WO';
  flowControl: 'TERMINATE' | 'CONTINUE'; // TERMINATE: 满足即跳出, CONTINUE: 继续流转至下一节点
  config?: Record<string, string | number | boolean>; // 节点特定的高级参数配置
}

export type StrategyRuleType = 'DIMENSION' | 'GATE';

export interface StrategyRule {
  id: string;
  name: string;
  description?: string;
  type?: StrategyRuleType; // DIMENSION: 标准寻址维度, GATE: 逻辑分流网关
  enabled: boolean;
  priorityGroup?: string;
  flowControl?: 'TERMINATE' | 'CONTINUE' | 'JUMP';
  jumpTargetId?: string; // 如果是 JUMP，跳转到的目的地 ID
  matchingCriteria: MatchingCondition[];
  steps: RuleStep[];
  branches?: { id: string; conditionLabel: string; targetRuleId: string; criteria: MatchingCondition[] }[]; // 网关分支定义
}

export interface GlobalGuardrail {
  id: string;
  name: string;
  description: string;
  active: boolean;
  type: 'BLOCK' | 'WARNING';
  target: FactorTarget;
  criteria: MatchingCondition[];
}

export interface StrategyDetail extends Strategy {
  rules: StrategyRule[];
  guardrails?: GlobalGuardrail[]; // 该策略绑定的全局合规拦截规则
}

export type FactorTarget = 'CONTEXT' | 'LOCATION' | 'INVENTORY_LOT' | 'EQUIPMENT' | 'OPERATOR' | 'CARRIER' | 'ORDER_LINE' | 'STAGING_AREA';

export type FactorImpactType = 'CONSTRAINT' | 'ADJUSTMENT' | 'BEHAVIORAL';

export interface Factor {
  id: string;
  name: string;
  targetObject: FactorTarget; // 此因子所度量的业务对象
  description: string;
  category: 'PHYSICAL' | 'LOGICAL' | 'TEMPORAL' | 'EQUIPMENT' | 'COMPLIANCE'; // 因子分类
  impactType: FactorImpactType; // 业务影响类型：约束类(准入)、调节类(评分)、行为类(执行)
  logic?: {
    formula: string;    // 计算公式 (表达式)
    unit?: string;      // 结果单位
  };
}

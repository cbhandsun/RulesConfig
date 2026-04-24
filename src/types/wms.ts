export type StrategyCategory = 'RECEIVING' | 'PUTAWAY' | 'ALLOCATION' | 'WAVE' | 'REPLENISHMENT';
export type StrategyStatus = 'ACTIVE' | 'DRAFT';

export type TriggerEventType =
  | 'INVENTORY_CHANGE'
  | 'ORDER_ARRIVED'
  | 'EQUIPMENT_STATUS'
  | 'WIP_THRESHOLD'
  | 'TIME_SCHEDULE'
  | 'MANUAL';

export interface TriggerCondition {
  id: string;
  name: string;
  enabled: boolean;
  eventType: TriggerEventType;
  subject: FactorTarget;
  conditions: MatchingCondition[];
  cooldownMs?: number; // 冷却时间，防止频繁触发
}

export interface TrafficSplitConfig {
  enabled: boolean;
  baselineStrategyId: string;
  experimentStrategyId: string;
  splitRatio: number; // 实验流量百分比 0-100
  splitKey: 'ORDER_ID' | 'ZONE' | 'TIME_SLOT' | 'OPERATOR';
  startTime?: string;
  endTime?: string;
  targetKpi?: string;
}

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
  triggerConditions?: TriggerCondition[];
  trafficSplit?: TrafficSplitConfig;
}

export type ConditionType = 'INSTANT' | 'TIME_WINDOW' | 'AGGREGATE';

export interface MatchingCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logicalOperator?: 'AND' | 'OR';
  conditionType?: ConditionType; // 默认 INSTANT
  timeWindow?: {
    duration: number;
    unit: 'MINUTES' | 'HOURS' | 'DAYS';
    aggregator: 'COUNT' | 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'TREND_UP' | 'TREND_DOWN';
  };
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

export type ResourceLockType = 'SOFT' | 'HARD';

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
  sorters: {
    factorId: string;
    factorName: string;
    weight: number;
    direction: 'ASC' | 'DESC';
    weightOverrides?: Array<{
      id: string;
      label: string;               // 覆盖规则描述，如"节假日旺季"
      conditions: MatchingCondition[];
      weight: number;              // 覆盖后的权重值
    }>;
  }[];
  failoverAction: 'NEXT_STEP' | 'ERROR_SUSPEND' | 'PIPELINE_NEXT' | 'SPLIT_NEW_WO';
  flowControl: 'TERMINATE' | 'CONTINUE'; // TERMINATE: 满足即跳出, CONTINUE: 继续流转至下一节点
  config?: Record<string, string | number | boolean>; // 节点特定的高级参数配置
  executionConstraints?: {
    maxCandidates?: number;      // 候选集上限，防止爆炸式扩散
    timeoutMs?: number;          // 步骤超时，超时触发 failoverAction
    maxOutputCount?: number;     // 最终输出数量上限
  };
  resourceLocking?: {
    lockType: ResourceLockType;      // SOFT=可抢占（警告），HARD=排他（阻断）
    acquireOnEntry: boolean;         // 步骤开始时对输出候选加锁
    releaseOnSuccess: boolean;       // 步骤成功后释放锁
    releaseOnFailover: boolean;      // 步骤 failover 时回滚并释放锁
    lockTtlMs?: number;              // 仅 SOFT 有效，超时自动释放
  };
  costOptimization?: {
    enabled: boolean;
    objective: 'MINIMIZE_TOTAL_COST' | 'MINIMIZE_LABOR' | 'MINIMIZE_EQUIPMENT' | 'BALANCE';
    costDimensionIds: string[];      // 关联的 CostDimension IDs
    maxAcceptableCost?: number;      // 单次操作成本上限（¥）
    costWeightInSorter?: number;     // 成本混入排序权重 0-100（越高越倾向成本最优）
  };
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
  sourceRuleId?: string; // 来自独立规则库时，指向源规则 ID
}

export interface GlobalGuardrail {
  id: string;
  name: string;
  description: string;
  active: boolean;
  type: 'BLOCK' | 'WARNING';
  target: FactorTarget;
  criteria: MatchingCondition[];
  sourceGuardrailId?: string; // 从全局库挂载时记录来源
}

export interface StrategyDetail extends Strategy {
  rules: StrategyRule[];
  guardrails?: GlobalGuardrail[];
  rollbackPolicy?: 'FULL' | 'PARTIAL' | 'NONE'; // 步骤失败时的资源锁回滚策略
}

export type FactorTarget = 'CONTEXT' | 'LOCATION' | 'INVENTORY_LOT' | 'EQUIPMENT' | 'OPERATOR' | 'CARRIER' | 'ORDER_LINE' | 'STAGING_AREA';

export type FactorImpactType = 'CONSTRAINT' | 'ADJUSTMENT' | 'BEHAVIORAL';
export type AttributeValueType = 'string' | 'number' | 'boolean' | 'enum' | 'date' | 'datetime';
export type ActionParamType = 'string' | 'number' | 'boolean' | 'select';
export type ParamGroup = 'CONSTRAINT' | 'ADJUSTMENT' | 'BEHAVIORAL' | 'EXECUTION';

export interface BusinessObjectMeta {
  code: FactorTarget;
  name: string;
  description?: string;
  category?: 'MASTER' | 'TRANSACTION' | 'RESOURCE' | 'RUNTIME';
  icon?: string;
  supportedActions?: RuleStepAction[];
  businessMeaning?: string;
  typicalRoleInStep?: string;
  commonDecisions?: string[];
  businessOwner?: string;
  lifecycleStage?: 'PLANNED' | 'ACTIVE' | 'LEGACY';
  sourceSystems?: string[];
  coreAttributes?: string[];
  primaryActions?: RuleStepAction[];
  upstreamObjects?: FactorTarget[];
  downstreamObjects?: FactorTarget[];
  governanceNotes?: string[];
}

export interface BusinessAttributeMeta {
  id: string;
  objectCode: FactorTarget;
  key: string;
  name: string;
  description?: string;
  valueType: AttributeValueType;
  operators?: string[];
  enumOptions?: string[];
  unit?: string;
  searchable?: boolean;
  filterable?: boolean;
  sortable?: boolean;
  decisionRole?: 'IDENTITY' | 'FILTER' | 'RANKING' | 'CONSTRAINT' | 'OUTPUT';
  businessMeaning?: string;
  exampleValues?: string[];
}

export interface ActionParamSchema {
  key: string;
  label: string;
  description?: string;
  valueType: ActionParamType;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: string[];
  unit?: string;
  placeholder?: string;
  group?: ParamGroup;
  appliesToInputSubjects?: FactorTarget[];
  appliesToOutputSubjects?: FactorTarget[];
}

export interface ActionMeta {
  code: RuleStepAction;
  name: string;
  description?: string;
  supportedStepTypes?: RuleStepType[];
  recommendedInputSubjects?: FactorTarget[];
  recommendedOutputSubjects?: FactorTarget[];
  params?: ActionParamSchema[];
  executionMeaning?: string;
  decisionGuidance?: string;
  typicalOutputs?: string[];
}

export interface FactorNormalization {
  method?: 'MIN_MAX_ASC' | 'MIN_MAX_DESC' | 'BOOLEAN' | 'ENUM_MAP' | 'CUSTOM';
  range?: [number, number];
  outputUnit?: string;
}

export type FactorType = 'STATIC' | 'DYNAMIC' | 'ML_SCORE';

export type CostDimensionType = 'LABOR' | 'EQUIPMENT' | 'INVENTORY_RISK' | 'SLA_PENALTY' | 'CUSTOM';

export interface CostDimension {
  id: string;
  name: string;
  type: CostDimensionType;
  unit: string;       // 如 ¥/min, ¥/km, ¥/unit/day, ¥/单
  baseRate: number;   // 基础费率
  formula?: string;   // 自定义公式（可选）
  enabled: boolean;
}

export interface Factor {
  id: string;
  name: string;
  targetObject: FactorTarget; // 此因子所度量的业务对象
  description: string;
  category: 'PHYSICAL' | 'LOGICAL' | 'TEMPORAL' | 'EQUIPMENT' | 'COMPLIANCE'; // 因子分类
  impactType: FactorImpactType; // 业务影响类型：约束类(准入)、调节类(评分)、行为类(执行)
  factorType?: FactorType; // 默认 STATIC
  logic?: {
    formula: string;    // 计算公式 (表达式)
    unit?: string;      // 结果单位
  };
  externalSource?: {
    endpoint: string;        // mock URL，如 /api/factors/deadhead-score
    method: 'GET' | 'POST';
    inputFields: string[];   // 传入字段
    outputField: string;     // 返回的得分字段
    cacheTtlMs?: number;     // 结果缓存时长
    fallbackValue?: number;  // 调用失败时的降级值
  };
  feedbackLoop?: {
    enabled: boolean;
    kpiMetric: string;       // 用于自动调整权重的 KPI
    adjustmentInterval: 'DAILY' | 'WEEKLY';
  };
  attributeRefs?: string[];
  applicableActions?: RuleStepAction[];
  applicableStepTypes?: RuleStepType[];
  tags?: string[];
  normalization?: FactorNormalization;
  businessMeaning?: string;
  decisionPurpose?: string;
  interpretationHint?: string;
  costMetadata?: {
    costDimensionId: string;   // 关联的 CostDimension ID
    costMultiplier: number;    // 该因子对应的成本系数
  };
}

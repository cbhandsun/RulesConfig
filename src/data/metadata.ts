import { ActionMeta, ActionParamSchema, BusinessAttributeMeta, BusinessObjectMeta, FactorTarget, RuleStepAction } from '../types/wms';

export const objectMetas: BusinessObjectMeta[] = [
  {
    code: 'CONTEXT',
    name: '环境',
    description: '全局流程上下文与治理开关',
    category: 'RUNTIME',
    icon: '⚙️',
    supportedActions: ['VALIDATE', 'ROUTE', 'GENERATE_TASK'],
    primaryActions: ['VALIDATE', 'ROUTE'],
    businessOwner: '流程治理 / 策略平台',
    lifecycleStage: 'ACTIVE',
    sourceSystems: ['RULE_ENGINE', 'CONTROL_TOWER'],
    coreAttributes: ['CONTEXT.strictMode'],
    upstreamObjects: [],
    downstreamObjects: ['ORDER_LINE', 'STAGING_AREA'],
    businessMeaning: '承载本次策略运行的全局约束、开关和场内状态，不直接代表某一类实物。',
    typicalRoleInStep: '通常作为 step 的全局输入背景，用来决定规则是否放行、是否改道、是否生成后续任务。',
    commonDecisions: ['是否启用严格校验', '是否切换降级路径', '是否暂停或挂起任务生成'],
    governanceNotes: ['适合作为全局输入背景，不建议作为大量中间结果的承载对象。', '优先沉淀治理开关、策略环境状态和统一控制参数。'],
  },
  {
    code: 'LOCATION',
    name: '库位',
    description: '用于选址、分配、路径优化的物理对象',
    category: 'MASTER',
    icon: '🏬',
    supportedActions: ['SELECT', 'ASSIGN', 'ROUTE', 'LOCK'],
    primaryActions: ['ASSIGN', 'ROUTE', 'LOCK'],
    businessOwner: '仓储主数据 / 库内规划',
    lifecycleStage: 'ACTIVE',
    sourceSystems: ['WMS_MASTER', 'SLOTTING_ENGINE'],
    coreAttributes: ['LOCATION.tempZone', 'LOCATION.availableCapacity', 'LOCATION.lockStatus', 'LOCATION.routeDistance'],
    upstreamObjects: ['ORDER_LINE', 'INVENTORY_LOT', 'CONTEXT'],
    downstreamObjects: ['STAGING_AREA'],
    businessMeaning: '仓内最核心的物理承载单元，策略通常围绕“找哪个库位、分给哪个库位、走哪条路径到库位”展开。',
    typicalRoleInStep: '常作为候选目标或最终落点对象，step 会先筛掉不合规库位，再按距离、容量、温区等依据做排序和分配。',
    commonDecisions: ['选择哪个库位最合适', '是否锁定该库位', '路径应优先经过哪个库区'],
    governanceNotes: ['路径距离、容量和锁定状态是最常见的高频治理信息。', '优先保证主数据准确，再做选址和路径类策略优化。'],
  },
  {
    code: 'INVENTORY_LOT',
    name: '库存批次',
    description: '用于库存筛选、分配和效期决策',
    category: 'TRANSACTION',
    icon: '📦',
    supportedActions: ['VALIDATE', 'SELECT', 'ALLOCATE', 'LOCK', 'RELEASE'],
    primaryActions: ['SELECT', 'ALLOCATE', 'LOCK'],
    businessOwner: '库存控制 / 履约分配',
    lifecycleStage: 'ACTIVE',
    sourceSystems: ['WMS_INVENTORY', 'ATP_ENGINE'],
    coreAttributes: ['INVENTORY_LOT.availableQty', 'INVENTORY_LOT.tempZoneMatch', 'INVENTORY_LOT.inventoryStatus', 'INVENTORY_LOT.shelfLifeRatio'],
    upstreamObjects: ['ORDER_LINE', 'CONTEXT'],
    downstreamObjects: ['LOCATION', 'CARRIER'],
    businessMeaning: '代表可被消耗、分配、冻结或释放的真实库存池，是分拨和履约决策的直接对象。',
    typicalRoleInStep: '常作为被筛选和排序的候选库存集合，重点看可用量、效期、状态、温区一致性等。',
    commonDecisions: ['选哪个批次出库', '是否冻结该批次', '是否允许参与当前分拨'],
    governanceNotes: ['效期、状态、可用量是库存治理里的基础准入面。', '当库存既做候选又做分拨对象时，应明确区分“筛选”和“占用”两个动作语义。'],
  },
  {
    code: 'EQUIPMENT',
    name: '设备',
    description: '叉车、AGV 等执行资源',
    category: 'RESOURCE',
    icon: '🤖',
    supportedActions: ['ASSIGN', 'ALLOCATE', 'ROUTE'],
    primaryActions: ['ASSIGN', 'ROUTE'],
    businessOwner: '设备调度 / RCS',
    lifecycleStage: 'ACTIVE',
    sourceSystems: ['RCS', 'WCS'],
    coreAttributes: ['EQUIPMENT.loadRate', 'EQUIPMENT.batteryLevel'],
    upstreamObjects: ['ORDER_LINE', 'LOCATION', 'STAGING_AREA'],
    downstreamObjects: ['LOCATION', 'STAGING_AREA'],
    businessMeaning: '执行搬运、补货、上架等动作的资源载体，策略会决定把什么任务交给哪类设备。',
    typicalRoleInStep: '通常作为执行资源被挑选或分配，重点评估负载率、电量、当前位置和可达性。',
    commonDecisions: ['哪个设备接单', '当前设备是否还能承载新任务', '设备下一跳应去哪里'],
    governanceNotes: ['设备对象更强调资源平衡与作业可达性，而不是库存约束。', '当设备作为输出对象时，建议同步检查待执行动作的任务上下文是否完整。'],
  },
  {
    code: 'OPERATOR',
    name: '人员',
    description: '作业人员与技能资源',
    category: 'RESOURCE',
    icon: '👤',
    supportedActions: ['ASSIGN', 'ALLOCATE'],
    primaryActions: ['ASSIGN'],
    businessOwner: '现场作业 / 劳动调度',
    lifecycleStage: 'ACTIVE',
    sourceSystems: ['LABOR_MGMT', 'WMS_RESOURCE'],
    coreAttributes: [],
    upstreamObjects: ['ORDER_LINE', 'CONTEXT'],
    downstreamObjects: [],
    businessMeaning: '仓内人工执行资源，常与技能、班次、负载能力绑定。',
    typicalRoleInStep: '通常作为作业承接人被筛选和分配，适合出现在任务派工和人工兜底链路。',
    commonDecisions: ['谁来接这票任务', '当前班组是否具备处理能力'],
    governanceNotes: ['人员对象后续适合继续补技能、班组和作业资质类属性。'],
  },
  {
    code: 'CARRIER',
    name: '载具',
    description: '托盘、周转箱等容器与载具',
    category: 'RESOURCE',
    icon: '🚢',
    supportedActions: ['ASSIGN', 'LOCK'],
    primaryActions: ['ASSIGN', 'LOCK'],
    businessOwner: '载具管理 / 现场运营',
    lifecycleStage: 'ACTIVE',
    sourceSystems: ['WMS_RESOURCE'],
    coreAttributes: [],
    upstreamObjects: ['INVENTORY_LOT', 'ORDER_LINE'],
    downstreamObjects: ['STAGING_AREA'],
    businessMeaning: '承接货物装载和搬运的中间介质，用于约束载运容量与物理组织方式。',
    typicalRoleInStep: '通常作为分拨或装载的目标资源，需结合体积、载重、混载规则来判断。',
    commonDecisions: ['哪个载具承接本次分拨', '是否锁定载具避免重复占用'],
    governanceNotes: ['载具对象适合继续补容量、载重和混载规则类属性。'],
  },
  {
    code: 'ORDER_LINE',
    name: '单据',
    description: '订单行、补货需求等业务需求对象',
    category: 'TRANSACTION',
    icon: '📑',
    supportedActions: ['VALIDATE', 'SELECT', 'ASSIGN', 'SPLIT', 'GENERATE_TASK'],
    primaryActions: ['VALIDATE', 'SPLIT', 'GENERATE_TASK'],
    businessOwner: '订单履约 / 补货运营',
    lifecycleStage: 'ACTIVE',
    sourceSystems: ['OMS', 'ERP', 'REPLENISHMENT_ENGINE'],
    coreAttributes: ['ORDER_LINE.needQty', 'ORDER_LINE.storeStatus', 'ORDER_LINE.priority', 'ORDER_LINE.docType'],
    upstreamObjects: ['CONTEXT'],
    downstreamObjects: ['INVENTORY_LOT', 'LOCATION', 'STAGING_AREA'],
    businessMeaning: '代表真实业务需求，是多数策略起点；后续库存、库位、任务等对象都围绕它展开服务。',
    typicalRoleInStep: '常作为需求输入对象，step 会先识别需求优先级、数量、单据类型，再驱动后续选库存和分配。',
    commonDecisions: ['是否放行该需求', '该需求是否要拆分', '应生成什么作业任务'],
    governanceNotes: ['单据对象通常是大部分策略链路的起点，优先保证需求语义完整。', '若后续策略越来越复杂，可继续补来源渠道、履约时窗和服务等级类属性。'],
  },
  {
    code: 'STAGING_AREA',
    name: '集货区',
    description: '用于波次、集货与发运协同的暂存区域',
    category: 'MASTER',
    icon: '🏢',
    supportedActions: ['ASSIGN', 'ROUTE', 'GENERATE_TASK'],
    primaryActions: ['ROUTE', 'GENERATE_TASK'],
    businessOwner: '波次运营 / 发运协同',
    lifecycleStage: 'ACTIVE',
    sourceSystems: ['WMS_MASTER', 'YARD_CONTROL'],
    coreAttributes: [],
    upstreamObjects: ['LOCATION', 'ORDER_LINE', 'CARRIER'],
    downstreamObjects: ['EQUIPMENT'],
    businessMeaning: '波次汇流和发运前的过渡承接点，用于削峰、合流和临时缓存。',
    typicalRoleInStep: '常作为输出落点或任务生成目的地，需要关注拥塞、容量和时间窗。',
    commonDecisions: ['货先汇到哪个集货区', '是否从这里生成出库任务'],
    governanceNotes: ['适合继续补拥塞、容量和时间窗类属性，以支撑路由和任务生成决策。'],
  },
];

export const attributeMetas: BusinessAttributeMeta[] = [
  {
    id: 'ORDER_LINE.needQty', objectCode: 'ORDER_LINE', key: 'needQty', name: '需求数量', description: '本次业务真实需要满足的件数或箱数。', valueType: 'number', operators: ['==', '!=', '>', '>=', '<', '<='], unit: '件', filterable: true, sortable: true,
    decisionRole: 'CONSTRAINT', businessMeaning: '用于判断需求是否有效、是否值得进入后续库存查找与任务生成。', exampleValues: ['1', '12', '240']
  },
  {
    id: 'ORDER_LINE.storeStatus', objectCode: 'ORDER_LINE', key: 'storeStatus', name: '门店状态', description: '需求所属门店当前是否处于可履约状态。', valueType: 'enum', operators: ['==', '!=', 'IN'], enumOptions: ['ACTIVE', 'INACTIVE'], filterable: true,
    decisionRole: 'FILTER', businessMeaning: '常用来在 step 初期先剔除停业、禁配或异常门店需求。', exampleValues: ['ACTIVE', 'INACTIVE']
  },
  {
    id: 'ORDER_LINE.priority', objectCode: 'ORDER_LINE', key: 'priority', name: '优先级', description: '业务紧急程度或服务等级。', valueType: 'number', operators: ['==', '>=', '<='], filterable: true, sortable: true,
    decisionRole: 'RANKING', businessMeaning: '用于需求排序，帮助 step 决定先处理谁、先保障谁。', exampleValues: ['20', '60', '95']
  },
  {
    id: 'ORDER_LINE.docType', objectCode: 'ORDER_LINE', key: 'docType', name: '单据类型', description: '需求来源的业务单据类型。', valueType: 'enum', operators: ['==', '!=', 'IN'], enumOptions: ['ASN', 'STORE_REPLENISHMENT', 'TRANSFER'], filterable: true,
    decisionRole: 'IDENTITY', businessMeaning: '帮助策略识别这是收货、补货还是调拨类需求，从而走不同处理链。', exampleValues: ['ASN', 'STORE_REPLENISHMENT']
  },
  {
    id: 'INVENTORY_LOT.availableQty', objectCode: 'INVENTORY_LOT', key: 'availableQty', name: '可用数量', description: '当前批次可实际参与分配的可用库存。', valueType: 'number', operators: ['==', '!=', '>', '>=', '<', '<='], unit: '件', filterable: true, sortable: true,
    decisionRole: 'CONSTRAINT', businessMeaning: '用于判断某个批次是否具备参与本轮分配的基本资格。', exampleValues: ['0', '24', '360']
  },
  {
    id: 'INVENTORY_LOT.tempZoneMatch', objectCode: 'INVENTORY_LOT', key: 'tempZoneMatch', name: '温区匹配', description: '库存批次与需求温控要求是否匹配。', valueType: 'boolean', operators: ['==', '!='], filterable: true,
    decisionRole: 'CONSTRAINT', businessMeaning: '常作为冷链与温控场景的硬门槛。', exampleValues: ['true', 'false']
  },
  {
    id: 'INVENTORY_LOT.inventoryStatus', objectCode: 'INVENTORY_LOT', key: 'inventoryStatus', name: '库存状态', description: '库存可用、冻结、保留等当前状态。', valueType: 'enum', operators: ['==', '!=', 'IN'], enumOptions: ['AVAILABLE', 'LOCKED', 'HOLD'], filterable: true,
    decisionRole: 'FILTER', businessMeaning: '帮助 step 快速排除冻结或保留库存。', exampleValues: ['AVAILABLE', 'LOCKED']
  },
  {
    id: 'INVENTORY_LOT.shelfLifeRatio', objectCode: 'INVENTORY_LOT', key: 'shelfLifeRatio', name: '剩余保质期占比', description: '批次剩余寿命与总保质期的相对比例。', valueType: 'number', operators: ['==', '!=', '>', '>=', '<', '<='], unit: '%', filterable: true, sortable: true,
    decisionRole: 'RANKING', businessMeaning: '用于 FEFO/效期优先等场景，帮助优先消耗更接近临期的批次。', exampleValues: ['12', '45', '88']
  },
  {
    id: 'LOCATION.tempZone', objectCode: 'LOCATION', key: 'tempZone', name: '温区', description: '库位所属温控分区。', valueType: 'enum', operators: ['==', '!=', 'IN'], enumOptions: ['AMBIENT', 'CHILLED', 'FROZEN'], filterable: true,
    decisionRole: 'FILTER', businessMeaning: '常用于判断目标库位是否允许承接当前货物。', exampleValues: ['AMBIENT', 'CHILLED']
  },
  {
    id: 'LOCATION.availableCapacity', objectCode: 'LOCATION', key: 'availableCapacity', name: '可用容量', description: '库位剩余可承载容量。', valueType: 'number', operators: ['==', '!=', '>', '>=', '<', '<='], unit: '%', filterable: true, sortable: true,
    decisionRole: 'CONSTRAINT', businessMeaning: '用于判断库位能不能放，以及放进去后是否还能保持安全余量。', exampleValues: ['8', '35', '72']
  },
  {
    id: 'LOCATION.lockStatus', objectCode: 'LOCATION', key: 'lockStatus', name: '锁定状态', description: '库位是否已被占用或冻结。', valueType: 'boolean', operators: ['==', '!='], filterable: true,
    decisionRole: 'CONSTRAINT', businessMeaning: '常作为分配前的硬性校验条件。', exampleValues: ['true', 'false']
  },
  {
    id: 'LOCATION.routeDistance', objectCode: 'LOCATION', key: 'routeDistance', name: '路径距离', description: '从当前锚点到目标库位的作业路径长度。', valueType: 'number', operators: ['==', '!=', '>', '>=', '<', '<='], unit: 'm', filterable: true, sortable: true,
    decisionRole: 'RANKING', businessMeaning: '用于选址、派工和路由排序，距离越短通常越优。', exampleValues: ['12', '65', '180']
  },
  {
    id: 'EQUIPMENT.loadRate', objectCode: 'EQUIPMENT', key: 'loadRate', name: '负载率', description: '设备当前已承载任务占能力上限的比例。', valueType: 'number', operators: ['==', '!=', '>', '>=', '<', '<='], unit: '%', filterable: true, sortable: true,
    decisionRole: 'RANKING', businessMeaning: '用于判断设备是否还能接单，以及接单后的均衡程度。', exampleValues: ['20', '68', '91']
  },
  {
    id: 'EQUIPMENT.batteryLevel', objectCode: 'EQUIPMENT', key: 'batteryLevel', name: '电量', description: '设备当前剩余电量。', valueType: 'number', operators: ['==', '!=', '>', '>=', '<', '<='], unit: '%', filterable: true, sortable: true,
    decisionRole: 'CONSTRAINT', businessMeaning: '用于避免把长路径或高强度任务分给低电量设备。', exampleValues: ['18', '52', '96']
  },
  {
    id: 'CONTEXT.strictMode', objectCode: 'CONTEXT', key: 'strictMode', name: '全局严谨模式', description: '当前策略运行采用的治理严格程度。', valueType: 'enum', operators: ['==', '!=', 'IN'], enumOptions: ['LOOSE', 'STANDARD', 'STRICT'], filterable: true,
    decisionRole: 'CONSTRAINT', businessMeaning: '决定当前 step 更偏向提示、限制还是硬拦截。', exampleValues: ['LOOSE', 'STANDARD', 'STRICT']
  },
];

const sharedBehaviorParams: ActionParamSchema[] = [
  { key: 'strictMode', label: '业务校验严谨度 (Control Level)', valueType: 'select', options: ['宽松(仅记录)', '标准(强提醒)', '严格(硬拦截)'], group: 'CONSTRAINT', appliesToInputSubjects: ['CONTEXT'] },
  { key: 'retryLimit', label: '失败自动重试次数', valueType: 'number', unit: '次', placeholder: '3', group: 'ADJUSTMENT', appliesToInputSubjects: ['CONTEXT'] },
  { key: 'fallbackRoute', label: '拦截后处理路径', valueType: 'select', options: ['抛出异常(人工处理)', '自动切换备选策略', '跳过并执行下一动作'], group: 'BEHAVIORAL', appliesToInputSubjects: ['CONTEXT'] },
];

export const actionMetas: ActionMeta[] = [
  {
    code: 'VALIDATE',
    name: '校验',
    description: '做准入判断与规则校验',
    supportedStepTypes: ['FILTER', 'GATEWAY'],
    executionMeaning: 'step 处理完成后，给出是否放行、是否拦截、是否需要人工介入的执行结论。',
    decisionGuidance: '更适合和约束属性、合规因子、全局上下文一起使用，重点回答“这笔业务能不能继续”。',
    typicalOutputs: ['放行', '阻断', '告警', '降级'],
    params: [
      { key: 'allowOverReceive', label: '允许超量收货', valueType: 'boolean', group: 'CONSTRAINT', appliesToInputSubjects: ['ORDER_LINE'] },
      { key: 'allowShortReceive', label: '允许缺量收货', valueType: 'boolean', group: 'CONSTRAINT', appliesToInputSubjects: ['ORDER_LINE'] },
      { key: 'overReceiveTol', label: '溢收容忍度', valueType: 'number', unit: '%', placeholder: '5', group: 'CONSTRAINT', appliesToInputSubjects: ['ORDER_LINE'] },
      { key: 'minExpiryDays', label: '效期硬性拦截阈值', valueType: 'number', unit: '天', placeholder: '30', group: 'CONSTRAINT', appliesToInputSubjects: ['INVENTORY_LOT'] },
      { key: 'batchConsistency', label: '批次一致性校验', valueType: 'boolean', group: 'CONSTRAINT', appliesToInputSubjects: ['INVENTORY_LOT'] },
      ...sharedBehaviorParams,
    ],
  },
  {
    code: 'SELECT',
    name: '优选',
    description: '对候选集评分并排序',
    supportedStepTypes: ['SELECT', 'FILTER'],
    executionMeaning: 'step 处理完成后，从候选集中挑出最应被保留或进入下一步的一批对象。',
    decisionGuidance: '通常和排序因子一起使用，重点回答“在这些候选里优先选谁”。',
    typicalOutputs: ['最优候选', '候选列表', 'Top-N 结果'],
    params: [
      { key: 'selectionMode', label: '候选选择模式', valueType: 'select', options: ['FIRST_MATCH', 'ALL_MATCHED', 'TOP_N'], group: 'BEHAVIORAL' },
      { key: 'maxDistance', label: '最大拣选动线距离', valueType: 'number', unit: 'm', placeholder: '500', group: 'CONSTRAINT', appliesToInputSubjects: ['LOCATION'] },
      { key: 'tempTolerance', label: '温控波动容忍度', valueType: 'select', options: ['±0.5℃ (高精)', '±1.0℃ (标准)', '±2.0℃ (宽松)'], group: 'CONSTRAINT', appliesToInputSubjects: ['LOCATION'] },
      { key: 'fifoWeight', label: 'FIFO 执行权重', valueType: 'number', unit: '%', placeholder: '100', group: 'ADJUSTMENT', appliesToInputSubjects: ['INVENTORY_LOT'] },
      { key: 'zonePreference', label: '库区优先策略', valueType: 'select', options: ['自动(全局平衡)', '就近优先', '空位率优先', '订单任务聚合', '周转路径最优'], group: 'ADJUSTMENT', appliesToInputSubjects: ['LOCATION'] },
      { key: 'inventoryScope', label: '库存候选范围', valueType: 'select', options: ['DC_AVAILABLE_POOL', 'SAME_TEMP_ZONE', 'ALL_AVAILABLE'], group: 'BEHAVIORAL', appliesToOutputSubjects: ['INVENTORY_LOT'] },
    ],
  },
  {
    code: 'ASSIGN',
    name: '分配',
    description: '将输入对象分配到目标对象',
    supportedStepTypes: ['SELECT', 'TRANSFORM'],
    executionMeaning: 'step 处理完成后，把某个需求、任务或对象正式落到目标承接方上。',
    decisionGuidance: '通常基于已筛好的候选结果继续做最终落点决策，重点回答“最后给谁/给哪里”。',
    typicalOutputs: ['目标库位', '承接设备', '任务归属'],
    params: [
      { key: 'priorityPolicy', label: '优先级策略', valueType: 'select', options: ['STORE_PRIORITY_FIRST', 'FIFO_FIRST', 'LOAD_BALANCED'], group: 'ADJUSTMENT' },
      { key: 'friendlySequence', label: '门店友好顺序', valueType: 'select', options: ['AISLE_DISPLAY_ORDER', 'ROUTE_FIRST', 'HEAVY_FIRST'], group: 'ADJUSTMENT', appliesToInputSubjects: ['ORDER_LINE'] },
      { key: 'loadLimit', label: '设备任务负载上限', valueType: 'number', unit: '%', placeholder: '85', group: 'CONSTRAINT', appliesToOutputSubjects: ['EQUIPMENT'] },
      { key: 'capacityBuffer', label: '库位预留容量', valueType: 'number', unit: '%', placeholder: '10', group: 'BEHAVIORAL', appliesToOutputSubjects: ['LOCATION'] },
    ],
  },
  {
    code: 'ROUTE',
    name: '路由',
    description: '决定后续流向和路径',
    supportedStepTypes: ['GATEWAY', 'TRANSFORM'],
    executionMeaning: 'step 处理完成后，决定对象、任务或流程应流向哪条路径、哪个区域、哪个后续节点。',
    decisionGuidance: '常结合路径距离、拥塞和暂存能力使用，重点回答“下一跳去哪里”。',
    typicalOutputs: ['路由分支', '目标区域', '下游节点'],
    params: [
      { key: 'congestionControl', label: '拥堵规避因子', valueType: 'number', unit: '%', placeholder: '20', group: 'ADJUSTMENT', appliesToOutputSubjects: ['LOCATION', 'STAGING_AREA'] },
      { key: 'packingSequence', label: '堆叠顺序策略', valueType: 'select', options: ['重下轻上', '动线优先', '体积填充率优先'], group: 'BEHAVIORAL', appliesToInputSubjects: ['ORDER_LINE'] },
    ],
  },
  {
    code: 'ALLOCATE',
    name: '分拨',
    description: '进行资源或库存池分拨',
    supportedStepTypes: ['SELECT', 'TRANSFORM'],
    executionMeaning: 'step 处理完成后，把库存或资源切分到不同承接池或不同需求侧。',
    decisionGuidance: '适合多需求共享资源场景，重点回答“这部分量该切给哪一边”。',
    typicalOutputs: ['分拨结果', '资源切分方案', '库存占用方案'],
    params: [
      { key: 'crossDockPriority', label: '越库紧急系数', valueType: 'number', unit: 'P', placeholder: '10', group: 'ADJUSTMENT', appliesToInputSubjects: ['ORDER_LINE'] },
      { key: 'lotMixControl', label: '混批管控级别', valueType: 'select', options: ['严禁混批', '允许同SKU混批', '完全允许'], group: 'CONSTRAINT', appliesToInputSubjects: ['INVENTORY_LOT'] },
      { key: 'volumeUtilization', label: '最低体积装载率阈值', valueType: 'number', unit: '%', placeholder: '60', group: 'ADJUSTMENT', appliesToOutputSubjects: ['CARRIER'] },
    ],
  },
  {
    code: 'GENERATE_TASK',
    name: '生成任务',
    description: '从当前结果生成可执行任务',
    supportedStepTypes: ['TRANSFORM', 'GATEWAY'],
    executionMeaning: 'step 处理完成后，把当前决策结果固化成可调度、可执行、可跟踪的作业任务。',
    decisionGuidance: '适合在需求已明确、承接对象已选定后生成执行指令，重点回答“现在是不是该下发任务了”。',
    typicalOutputs: ['上架任务', '补货任务', '拣选任务', '搬运任务'],
    params: [
      { key: 'autoSuspend', label: '异常自动挂起任务', valueType: 'boolean', group: 'BEHAVIORAL', appliesToInputSubjects: ['CONTEXT'] },
      { key: 'taskTemplate', label: '任务模板', valueType: 'select', options: ['PUTAWAY', 'REPLENISHMENT', 'PICKING', 'MOVE'], group: 'BEHAVIORAL' },
      { key: 'consolidationWindow', label: '合流时间窗', valueType: 'number', unit: 'min', placeholder: '60', group: 'ADJUSTMENT', appliesToOutputSubjects: ['STAGING_AREA'] },
    ],
  },
  {
    code: 'SPLIT',
    name: '拆分',
    description: '按规则拆分对象或任务',
    supportedStepTypes: ['TRANSFORM', 'GATEWAY'],
    executionMeaning: 'step 处理完成后，把一条需求、一票任务或一个对象拆成多个可独立处理的子单元。',
    decisionGuidance: '适合库存不足、波次切分、任务分流等场景，重点回答“要不要拆，以及怎么拆”。',
    typicalOutputs: ['子任务', '拆分需求', '分流结果'],
    params: [
      { key: 'splitAllowed', label: '允许自动拆分 WO', valueType: 'boolean', group: 'BEHAVIORAL', appliesToInputSubjects: ['ORDER_LINE'] },
      { key: 'priorityMapping', label: '子任务优先级映射表', valueType: 'select', options: ['跟随母单', '固定最高', '动态加权提升'], group: 'BEHAVIORAL', appliesToInputSubjects: ['ORDER_LINE'] },
    ],
  },
  { code: 'NONE', name: '未声明动作', description: '占位动作', executionMeaning: '当前 step 只做中间处理，不直接产生业务动作。', decisionGuidance: '适合纯中间计算或上下文聚合节点。', typicalOutputs: ['中间结果'], params: [] },
  { code: 'RECOMMEND', name: '推荐', description: '输出推荐结果', executionMeaning: '给出可解释的建议结果，供人工或下游系统确认。', decisionGuidance: '适合需要保留人工判断空间的场景。', typicalOutputs: ['推荐库位', '推荐路径', '推荐任务'], params: [] },
  { code: 'LOCK', name: '锁定', description: '对目标对象加锁', executionMeaning: '阻止目标对象被其他并发流程再次分配或占用。', decisionGuidance: '常用于库存、库位、载具的并发保护。', typicalOutputs: ['锁定库存', '锁定库位'], params: [] },
  { code: 'SUSPEND', name: '挂起', description: '挂起当前流程', executionMeaning: '停止当前 step 后续执行，等待人工处理或后续触发。', decisionGuidance: '适合异常处理和人工兜底场景。', typicalOutputs: ['挂起任务', '挂起流程'], params: [] },
  { code: 'RELEASE', name: '释放', description: '释放占用或锁定', executionMeaning: '解除之前对对象的占用、冻结或锁定状态。', decisionGuidance: '适合回滚、撤销或资源归还场景。', typicalOutputs: ['释放库存', '释放库位'], params: [] },
  { code: 'REDIRECT', name: '改道', description: '重定向到新路径', executionMeaning: '把当前对象或流程切换到另一条后续处理路径。', decisionGuidance: '适合异常分流、拥堵绕行、策略降级。', typicalOutputs: ['改道路径', '改派节点'], params: [] },
];

export const instantOperators = ['==', '!=', '>', '>=', '<', '<=', 'IN', 'NOT_IN', 'MATCH', 'EXCLUDE'];

export const timeWindowOperators = [
  { value: 'TIME_WINDOW_GT', label: '时间窗口内 > N', conditionType: 'TIME_WINDOW' as const },
  { value: 'TIME_WINDOW_LT', label: '时间窗口内 < N', conditionType: 'TIME_WINDOW' as const },
  { value: 'TIME_WINDOW_GTE', label: '时间窗口内 >= N', conditionType: 'TIME_WINDOW' as const },
  { value: 'AGG_COUNT_GT', label: '统计次数 > N', conditionType: 'AGGREGATE' as const },
  { value: 'AGG_SUM_GT', label: '统计求和 > N', conditionType: 'AGGREGATE' as const },
  { value: 'AGG_AVG_GT', label: '统计均值 > N', conditionType: 'AGGREGATE' as const },
  { value: 'TREND_UP', label: '趋势上升', conditionType: 'AGGREGATE' as const },
  { value: 'TREND_DOWN', label: '趋势下降', conditionType: 'AGGREGATE' as const },
];

export const allOperatorsGrouped = [
  { group: '即时比较', operators: instantOperators.map(v => ({ value: v, label: v, conditionType: 'INSTANT' as const })) },
  { group: '时间窗口', operators: timeWindowOperators.filter(o => o.conditionType === 'TIME_WINDOW') },
  { group: '趋势/聚合', operators: timeWindowOperators.filter(o => o.conditionType === 'AGGREGATE') },
];

export const subjectOptions = objectMetas.map(({ code, name, icon }) => ({ value: code, label: `${icon ? `${icon} ` : ''}${name}` }));

export const getObjectMeta = (code: FactorTarget) => objectMetas.find(objectMeta => objectMeta.code === code);

export const getAttributesByObject = (code: FactorTarget) => attributeMetas.filter(attribute => attribute.objectCode === code);

export const getActionMeta = (code: RuleStepAction) => actionMetas.find(actionMeta => actionMeta.code === code);

export const getActionParams = (action: RuleStepAction, inputSubject?: FactorTarget, outputSubject?: FactorTarget) => {
  const actionMeta = getActionMeta(action);
  if (!actionMeta?.params) return [];

  return actionMeta.params.filter(param => {
    const inputMatches = !param.appliesToInputSubjects || !inputSubject || param.appliesToInputSubjects.includes(inputSubject);
    const outputMatches = !param.appliesToOutputSubjects || !outputSubject || param.appliesToOutputSubjects.includes(outputSubject);
    return inputMatches && outputMatches;
  });
};

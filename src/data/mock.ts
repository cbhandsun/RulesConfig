import { StrategyDetail, Factor, StrategyRule } from '../types/wms';

export const mockStrategies: StrategyDetail[] = [
  {
    id: 'STG-WAVE-SMART-BATCH',
    name: '【波次策略】AI 智能订单聚类与波次自适应释放 (Smart Wave Matrix)',
    category: 'WAVE',
    primarySubject: 'ORDER_LINE',
    owner: '算法优化赋能组 (AI-Ops)',
    scenario: '【业务场景】适用于高密度电商及零售 B2B 配送，旨在解决传统固定时间点波次导致的作业波峰波谷问题。\n\n【配置逻辑：动态聚类】\n- 智能监控订单池，当特定承运商或特定送货网格的并发订单池中“SKU重合度(Affinity)”超过 75%，或者集货道(Staging)可用承载率告警时，自适应触发微波次(Micro-Wave)切割与释放任务，实现生产线平准化流转。',
    version: 'v8.2.3',
    status: 'ACTIVE',
    priority: 95,
    guardrails: [
      {
        id: 'GR-WAVE-OVERLOAD',
        name: '下层作业单元负荷熔断 (WIP Limit)',
        description: '防止过量波次释放导致拣货区拥堵或分拨线崩溃。当现场在途任务(WIP)超过安全阈值时硬阻断释放。',
        active: true,
        type: 'BLOCK',
        target: 'CONTEXT',
        criteria: [{ id: 'gr-w1', field: '全局 WIP 拥堵水位', operator: '>=', value: '95%' }]
      }
    ],
    rules: [
      {
        id: 'rule-wave-affinity',
        name: '维度 1：基于 SKU 重合度的聚合算法',
        description: '计算池中订单商品交集，合并相似单据可以最高减少 40% 的拣选行走步数。',
        enabled: true,
        priorityGroup: '波次聚合',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-wave-1',
            name: '订单重合度亲和力计算',
            description: '基于 K-Means 计算待发货订单的 SKU 相似度，聚合度高于 65% 的单据优先切分为同一波次。',
            targetSubject: 'ORDER_LINE',
            filters: [{ id: 'f-w1', field: '截单倒计时', operator: '>', value: '30min' }],
            sorters: [{ factorId: 'fact-sku-affinity', factorName: '波次内 SKU 聚合重合度', weight: 100, direction: 'DESC' }],
            failoverAction: 'NEXT_STEP',
            flowControl: 'CONTINUE',
            config: { 'Min Cluster Match Rate': '65%', 'Algo Mode': 'K-Means Affinity' }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-TASK-INTERLEAVING',
    name: '【任务协同】基于动线的存拣双重交叉调度 (Task Interleaving)',
    category: 'REPLENISHMENT',
    primarySubject: 'EQUIPMENT',
    owner: '设备资源管控平台 (RCS)',
    scenario: '【业务场景】叉车/AGV 设备的高级资源调度。传统操作由于上架和拣选在时间上隔离，导致设备严重“空跑空回”。\n\n【配置逻辑：资源复用】\n- 分析设备当前持有的上架任务落点，在释放下行路段时，系统立即扫描落点周边是否有挂起的拉动补货（下架）任务。若有，在下发任务时指派设备“顺路带回”，理论可降低 35% 设备空驶死角。',
    version: 'v4.0.0',
    status: 'ACTIVE',
    priority: 90,
    rules: [
      {
        id: 'rule-task-deadhead',
        name: '网关：就近复用寻址',
        description: '拦截所有上架完成脉冲，分配周边 5 米半径内的同区下架任务。',
        enabled: true,
        type: 'DIMENSION',
        priorityGroup: '任务调度',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-task-1',
            name: '计算目标点空驶距离',
            description: '评估当前上架落点与潜在补货需求点之间的导航距离，距离小于 5 米且电量健康的设备将被指派双重任务。',
            targetSubject: 'EQUIPMENT',
            filters: [{ id: 'f-t1', field: '设备类型', operator: '==', value: 'FORKLIFT_REACH' }],
            sorters: [{ factorId: 'fact-deadhead-dist', factorName: '设备次任务空跑距离', weight: 100, direction: 'ASC' }],
            failoverAction: 'PIPELINE_NEXT',
            flowControl: 'TERMINATE',
            config: { 'Max Search Radius (m)': 5, 'Battery Limit Penalty': 2 }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-RET-ALLOC-STORE',
    name: '“门店分拣专家”配送中心全量分配策略 (High-Performance Store Replenishment)',
    category: 'ALLOCATION',
    primarySubject: 'INVENTORY_LOT',
    owner: '零售事业部调度中心',
    scenario: '【业务场景】应用于大型商超 DC 的门店补货场景。核心目标是实现“贴合店面（Store-Friendly）”，确保门店收货后可直接按巷道上架，大幅减少理货工作量。\n\n【配置逻辑：分层择优】\n- 第一层：质量过滤。强制先进先出（FIFO），并检查温层一致性，拦截过期批次。\n- 第二层：动线顺位。核心考量因子是“陈列顺位”，系统自动将商品按门店货架摆放顺序进行排列。\n- 第三层：物理安全。通过“重下轻上”因子确保堆栈稳固。',
    version: 'v4.2.0',
    status: 'ACTIVE',
    priority: 100,
    guardrails: [
      {
        id: 'GR-EXPIRE-BLOCK',
        name: '生鲜及食品临期强制合规拦截 (BLOCK)',
        description: '【逻辑解释】基于食品安全法，防止过期或临期商品流入门店。当商品剩余保质期占比低于预设阈值时，直接触发系统级拦截，不进入后续分配环节。',
        active: true,
        type: 'BLOCK',
        target: 'INVENTORY_LOT',
        criteria: [
          { id: 'gr-c1', field: '剩余保质期占比', operator: '<', value: '20' },
          { id: 'gr-c2', field: '绝对到期天数', operator: '<', value: '30', logicalOperator: 'OR' }
        ]
      },
      {
        id: 'GR-TEMP-VIOLATION',
        name: '库位-商品温层一致性硬锁',
        description: '【逻辑解释】冷链合规防线。校验待分配库位与商品的温区因子是否匹配，防止冷链断链导致货物变质。',
        active: true,
        type: 'BLOCK',
        target: 'LOCATION',
        criteria: [{ id: 'gr-c3', field: '温区非法匹配标识', operator: '==', value: 'TRUE' }]
      }
    ],
    rules: [
      {
        id: 'rule-retail-fefo',
        name: '寻址序列 A：高频日配生鲜 FEFO 严格分配',
        description: '【配置目标】针对短效期生鲜。优先清空老批次，并强制要求库位温层与商品温层绝对匹配。\n【计算权重】FEFO 占比因子权重 80%，储位清空权重 20%。',
        enabled: true,
        priorityGroup: '阶段 1: 质量与合规分配',
        flowControl: 'CONTINUE',
        matchingCriteria: [
          { id: 'mc-r1', field: '商品大类', operator: 'IN', value: '生鲜, 熟食, 乳制品' },
          { id: 'mc-r2', field: '订单紧急度', operator: '>=', value: '80', logicalOperator: 'AND' }
        ],
        steps: [
          {
            id: 'st-r1-1',
            name: '精细温区匹配与效期过滤',
            description: '通过物理温区限制和批次剩余寿命筛选，防止因发错温区引发的合规性事件并优化保质期库存模型。',
            targetSubject: 'INVENTORY_LOT',
            filters: [
              { id: 'f-1', field: '库存可用状态', operator: '==', value: 'AVAILABLE' },
              { id: 'f-2', field: '库位温层代码', operator: 'MATCH', value: 'REQ_TEMP_ZONE', logicalOperator: 'AND' }
            ],
            sorters: [
              { factorId: 'fact-shelf-life-ratio', factorName: '剩余保质期占比 (FEFO%)', weight: 80, direction: 'ASC' },
              { factorId: 'fact-clear-bin', factorName: '储位清空倾向度', weight: 20, direction: 'DESC' }
            ],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: {
              "Strict Temperature Match": "TRUE",
              "Max Expiry Deviation": "10%"
            }
          }
        ]
      },
      {
        id: 'rule-retail-friendly',
        name: '寻址序列 B：门店经营动线顺排 (Shelf-Friendly Sorting)',
        description: '【配置目标】提高门店上架效率。按照目标门店的陈列地图顺序（Aisle-Level-Map）生成拣货指令，确保重物（>15KG）在底部，易碎轻物在顶部。',
        enabled: true,
        priorityGroup: '阶段 2: 作业效率与门店友好度',
        flowControl: 'TERMINATE',
        matchingCriteria: [{ id: 'mc-r3', field: '分配环节', operator: '==', value: 'STORE_PICKING' }],
        steps: [
          {
            id: 'st-r2-1',
            name: '执行物理拓扑与陈列顺位权衡',
            description: '针对发往商超的商品，在作业调度层面保证拣选顺位与目标店铺理货顺位的完美匹配，降低门店重新理货的工作量。',
            targetSubject: 'LOCATION',
            filters: [
              { id: 'f-3', field: '巷道作业人员数', operator: '<', value: '3' }
            ],
            sorters: [
              { factorId: 'fact-store-aisle-seq', factorName: '门店陈列动线顺位', weight: 50, direction: 'ASC' },
              { factorId: 'fact-item-weight-grade', factorName: '货物负载重量等级', weight: 30, direction: 'DESC' },
              { factorId: 'fact-pick-density', factorName: '库位高度拣选密度', weight: 20, direction: 'DESC' }
            ],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: {
              "Sequence Base": "Aisle-Level-Map",
              "Heavy Item Threshold(KG)": "15"
            }
          },
          {
            id: 'st-r2-2',
            name: '兜底：按最短路径优先',
            description: '当复杂约束匹配失败时触发的基础降级机制，优先考虑内部搬运路径最短以挽救操作时效。',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [
              { factorId: 'fact-route-dist', factorName: '路径行驶距离', weight: 100, direction: 'ASC' }
            ],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'TERMINATE'
          }
        ]
      }
    ]
  },
  {
    id: 'STG-INBOUND-PURCHASE',
    name: '【收货策略】采购入库收货策略 (Purchase Inbound)',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '供应链收货组',
    scenario: '【业务场景】适用于常规供应商送货入库。',
    version: 'v2.1.0',
    status: 'ACTIVE',
    priority: 80,
    rules: [
      {
        id: 'rule-pur-1',
        name: '寻址动作 1：采购收货准入拦截',
        enabled: true,
        priorityGroup: '准入阶段',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-pur-1',
            name: '采购拦截算子',
            targetSubject: 'ORDER_LINE',
            filters: [
              { id: 'f-pur-1', field: '允许超收校验', operator: '==', value: '禁止超收' },
              { id: 'f-pur-2', field: '拣选面限制', operator: '==', value: '必须存在拣选面' }
            ],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: {
              "allowOverReceive": false,
              "allowShortReceive": true,
              "allowReverse": true,
              "pickingFaceRequired": true,
              "autoFullInbound": false,
              "autoInbound": false
            }
          }
        ]
      },
      {
        id: 'rule-pur-2',
        name: '寻址动作 2：储位指派 (SH)',
        type: 'DIMENSION',
        enabled: true,
        priorityGroup: '指派阶段',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-pur-2-1',
            name: '人工指定收货位寻源',
            description: '优先级最高。检查作业人员在 PDA 或工作台上是否手动预设了目标储位。',
            targetSubject: 'LOCATION',
            filters: [
              { id: 'f-pur-sh-1', field: '用户预设位置', operator: '!=', value: 'null' }
            ],
            sorters: [
              { factorId: 'fact-manual-preset-loc', factorName: '用户指定收货位置权重', weight: 100, direction: 'DESC' }
            ],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: {
              "priority": "MANUAL_OVERRIDE",
              "impactType": "BEHAVIORAL"
            }
          },
          {
            id: 'st-pur-2-2',
            name: 'SKU 主档默认收货位寻源',
            description: '降级第一级。当无人工指定时，自动匹配该商品在主数据中预设的专属收货道口或存储区。',
            targetSubject: 'LOCATION',
            filters: [
              { id: 'f-pur-sh-2', field: 'SKU默认收货位', operator: '!=', value: 'null' }
            ],
            sorters: [
              { factorId: 'fact-sku-inbound-loc', factorName: 'SKU 主档默认收货区', weight: 100, direction: 'DESC' }
            ],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: {
              "priority": "SKU_MASTER_DEFAULT",
              "impactType": "BEHAVIORAL"
            }
          },
          {
            id: 'st-pur-2-3',
            name: '订单类型兜底收货位寻源',
            description: '最终兜底逻辑。根据采购单类型（如：常规采购 vs 紧急采购）指派至对应的默认收货缓冲区。',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [
              { factorId: 'fact-doctype-inbound-loc', factorName: '单据类型兜底收货位', weight: 100, direction: 'DESC' }
            ],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'TERMINATE',
            config: {
              "priority": "DOC_TYPE_FALLBACK",
              "impactType": "BEHAVIORAL",
              "zonePreference": "就近优先 (SH)"
            }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-INBOUND-TRANSFER',
    name: '【收货策略】调拨入库收货策略 (Transfer Inbound)',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '库存调度组',
    scenario: '【业务场景】适用于大仓或库间调拨入库。',
    version: 'v1.2.0',
    status: 'ACTIVE',
    priority: 75,
    rules: [
      {
        id: 'rule-trans-1',
        name: '寻址动作 1：调拨收货准入拦截',
        enabled: true,
        priorityGroup: '准入阶段',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-trans-1',
            name: '调拨拦截算子',
            targetSubject: 'ORDER_LINE',
            filters: [
              { id: 'f-trans-1', field: '允许超收校验', operator: '==', value: '禁止超收' },
              { id: 'f-trans-2', field: '允许冲销校验', operator: '==', value: '禁止冲销' },
              { id: 'f-trans-3', field: '拣选面限制', operator: '==', value: '必须存在拣选面' }
            ],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: {
              "allowOverReceive": false,
              "allowShortReceive": true,
              "allowReverse": false,
              "pickingFaceRequired": true,
              "autoInbound": false
            }
          }
        ]
      },
      {
        id: 'rule-trans-2',
        name: '寻址动作 2：储位指派 (SH)',
        enabled: true,
        priorityGroup: '指派阶段',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-trans-2',
            name: '储位路由算子',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: { "zonePreference": "就近优先 (SH)" }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-INBOUND-DIRECT',
    name: '【收货策略】直送自动入库收货策略 (Direct Inbound)',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '越库中心',
    scenario: '【业务场景】直送商品收货，收货即自动入库。',
    version: 'v1.5.0',
    status: 'ACTIVE',
    priority: 85,
    rules: [
      {
        id: 'rule-dir-1',
        name: '寻址动作 1：直送收货准入拦截',
        enabled: true,
        priorityGroup: '准入阶段',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-dir-1',
            name: '直送拦截算子',
            targetSubject: 'ORDER_LINE',
            filters: [
              { id: 'f-dir-1', field: '允许超收校验', operator: '==', value: '禁止超收' },
              { id: 'f-dir-2', field: '拣选面限制', operator: '==', value: '必须存在拣选面' }
            ],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: {
              "allowOverReceive": false,
              "allowShortReceive": true,
              "allowReverse": true,
              "pickingFaceRequired": true,
              "autoInbound": true
            }
          }
        ]
      },
      {
        id: 'rule-dir-2',
        name: '寻址动作 2：储位指派 (SH)',
        enabled: true,
        priorityGroup: '指派阶段',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-dir-2',
            name: '储位路由算子',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: { "zonePreference": "就近优先 (SH)" }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-INBOUND-CROSSDOCK',
    name: '【收货策略】货到即配收货策略 (Cross-Docking)',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '越库运营组',
    scenario: '【业务场景】货到即配场景，直接进入越库区。',
    version: 'v2.0.0',
    status: 'ACTIVE',
    priority: 90,
    rules: [
      {
        id: 'rule-cd-1',
        name: '寻址动作 1：越库收货准入拦截',
        enabled: true,
        priorityGroup: '准入阶段',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-cd-1',
            name: '越库拦截算子',
            targetSubject: 'ORDER_LINE',
            filters: [
              { id: 'f-cd-1', field: '允许超收校验', operator: '==', value: '禁止超收' },
              { id: 'f-cd-2', field: '拣选面限制', operator: '==', value: '无限制' }
            ],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: {
              "allowOverReceive": false,
              "allowShortReceive": true,
              "allowReverse": true,
              "pickingFaceRequired": false,
              "autoInbound": false
            }
          }
        ]
      },
      {
        id: 'rule-cd-2',
        name: '寻址动作 2：储位指派 (IN)',
        enabled: true,
        priorityGroup: '指派阶段',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-cd-2',
            name: '越库储位指派',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: { "zonePreference": "就近优先 (IN)" }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-INBOUND-RETURN-SALES',
    name: '【收货策略】返配入库、销售退货收货策略',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '售后组',
    scenario: '【业务场景】处理门店返配或消费者退货。',
    version: 'v3.0.1',
    status: 'ACTIVE',
    priority: 70,
    rules: [
      {
        id: 'rule-ret-1',
        name: '寻址动作 1：退货收货准入拦截',
        enabled: true,
        priorityGroup: '准入阶段',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-ret-1',
            name: '退货拦截算子',
            targetSubject: 'ORDER_LINE',
            filters: [
              { id: 'f-ret-1', field: '允许超量校验', operator: '==', value: '禁止超收' },
              { id: 'f-ret-2', field: '允许缺量校验', operator: '==', value: '禁止缺收' },
              { id: 'f-ret-3', field: '允许冲销校验', operator: '==', value: '禁止冲销' }
            ],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: {
              "allowOverReceive": false,
              "allowShortReceive": false,
              "allowReverse": false,
              "pickingFaceRequired": false,
              "autoFullInbound": true,
              "autoInbound": false
            }
          }
        ]
      },
      {
        id: 'rule-ret-2',
        name: '寻址动作 2：储位指派 (THSH)',
        enabled: true,
        priorityGroup: '指派阶段',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-ret-2',
            name: '退货储位指派',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: { "zonePreference": "就近优先 (THSH)" }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-INBOUND-INTER-WH',
    name: '【收货策略】仓间调拨二次收货收货策略',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '调度中心',
    scenario: '【业务场景】仓间二次收货场景。',
    version: 'v1.0.0',
    status: 'ACTIVE',
    priority: 65,
    rules: [
      {
        id: 'rule-iwh-1',
        name: '寻址动作 1：二次收货准入拦截',
        enabled: true,
        priorityGroup: '准入阶段',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-iwh-1',
            name: '二次收货拦截算子',
            targetSubject: 'ORDER_LINE',
            filters: [
              { id: 'f-iwh-1', field: '允许缺量校验', operator: '==', value: '禁止缺收' }
            ],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: {
              "allowOverReceive": false,
              "allowShortReceive": false,
              "allowReverse": false,
              "pickingFaceRequired": false,
              "autoFullInbound": true,
              "autoInbound": false
            }
          }
        ]
      },
      {
        id: 'rule-iwh-2',
        name: '寻址动作 2：储位指派 (SCDCL)',
        enabled: true,
        priorityGroup: '指派阶段',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-iwh-2',
            name: '二次收货储位指派',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: { "zonePreference": "就近优先 (SCDCL)" }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-INBOUND-CLAIM-STD',
    name: '【收货策略】申偿收货收货策略',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '财务组',
    scenario: '【业务场景】普通申偿收货。',
    version: 'v1.0.0',
    status: 'ACTIVE',
    priority: 60,
    rules: [
      {
        id: 'rule-clm-1',
        name: '寻址动作 1：申偿准入拦截',
        enabled: true,
        priorityGroup: '准入阶段',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-clm-1',
            name: '申偿拦截算子',
            targetSubject: 'ORDER_LINE',
            filters: [],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: {
              "allowOverReceive": false,
              "allowShortReceive": false,
              "allowReverse": false,
              "pickingFaceRequired": false,
              "autoFullInbound": true,
              "autoInbound": false
            }
          }
        ]
      },
      {
        id: 'rule-clm-2',
        name: '寻址动作 2：储位指派 (SCSH)',
        enabled: true,
        priorityGroup: '指派阶段',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-clm-2',
            name: '申偿储位指派',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: { "zonePreference": "就近优先 (SCSH)" }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-INBOUND-CLAIM-QUALITY',
    name: '【收货策略】质量申偿收货收货策略',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '质检组',
    scenario: '【业务场景】质量申偿收货场景。',
    version: 'v1.0.0',
    status: 'ACTIVE',
    priority: 55,
    rules: [
      {
        id: 'rule-qclm-1',
        name: '寻址动作 1：质量申偿准入拦截',
        enabled: true,
        priorityGroup: '准入阶段',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-qclm-1',
            name: '质量申偿拦截算子',
            targetSubject: 'ORDER_LINE',
            filters: [],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: {
              "allowOverReceive": false,
              "allowShortReceive": false,
              "allowReverse": false,
              "pickingFaceRequired": false,
              "autoFullInbound": true,
              "autoInbound": false
            }
          }
        ]
      },
      {
        id: 'rule-qclm-2',
        name: '寻址动作 2：储位指派 (ZLSCSH)',
        enabled: true,
        priorityGroup: '指派阶段',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-qclm-2',
            name: '质量申偿储位指派',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: { "zonePreference": "就近优先 (ZLSCSH)" }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-OMNI-FRESH-B2C',
    name: '【出库策略】全渠道生鲜电商 B2C 弹性履约策略',
    category: 'ALLOCATION',
    primarySubject: 'INVENTORY_LOT',
    owner: '全渠道履约中心',
    scenario: '【业务场景】处理生鲜 B2C 全渠道订单。通过“分流阶段”进行决策，通过“分配阶段”进行择优。',
    version: 'v4.2.0',
    status: 'ACTIVE',
    priority: 200,
    rules: [
      {
        id: 'rule-omni-1-1-gate',
        name: '规则 1.1：VIP 渠道分流决策',
        type: 'GATE',
        enabled: true,
        priorityGroup: '阶段 1：订单决策分流',
        flowControl: 'JUMP',
        jumpTargetId: 'rule-omni-3-1-jit',
        matchingCriteria: [
          { id: 'mc-omni-1', field: '渠道类型', operator: 'IN', value: '美团,饿了么,极速达' }
        ],
        steps: [],
        branches: [
          { 
            id: 'br-vip', 
            conditionLabel: 'VIP/极速达订单', 
            targetRuleId: 'rule-omni-3-1-jit', 
            criteria: [
              { id: 'brc-vip-1', field: '订单等级', operator: '==', value: 'VIP' }
            ] 
          }
        ]
      },
      {
        id: 'rule-omni-1-2-wave',
        name: '规则 1.2：常规波次聚合逻辑',
        enabled: true,
        priorityGroup: '阶段 1：订单决策分流',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-omni-1-2-1',
            name: '波次池水位校验',
            targetSubject: 'ORDER_LINE',
            filters: [],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'CONTINUE',
            config: { "maxWaveSize": 50 }
          }
        ]
      },
      {
        id: 'rule-omni-2-1-hard',
        name: '规则 2.1：库存效期与温层硬拦截',
        enabled: true,
        priorityGroup: '阶段 2：库存智能分配',
        flowControl: 'CONTINUE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-omni-2-1-1',
            name: 'GSP 效期强控',
            targetSubject: 'INVENTORY_LOT',
            filters: [{ id: 'f-omni-exp', field: '剩余效期比例', operator: '>=', value: '20%' }],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: { "minExpiryDays": 30 }
          }
        ]
      },
      {
        id: 'rule-omni-2-2-smart',
        name: '规则 2.2：清尾与动线择优',
        enabled: true,
        priorityGroup: '阶段 2：库存智能分配',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-omni-2-2-1',
            name: '库位热度打分',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [
              { factorId: 'fact-clear', factorName: '清尾优先', weight: 60, direction: 'DESC' },
              { factorId: 'fact-dist', factorName: '就近优先', weight: 40, direction: 'ASC' }
            ],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: { "zonePreference": "就近优先" }
          }
        ]
      },
      {
        id: 'rule-omni-3-1-jit',
        name: '规则 3.1：前置仓 JIT 锁定',
        enabled: true,
        priorityGroup: '阶段 3：极速履约',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-omni-3-1-1',
            name: 'JIT 库区寻址',
            targetSubject: 'LOCATION',
            filters: [{ id: 'f-omni-jit', field: '库区属性', operator: '==', value: '前置分拣区' }],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE'
          }
        ]
      }
    ]
  },
  {
    id: 'STG-COMPLEX-INBOUND-DC',
    name: '【收货上架】分销中心多级降级智能寻址策略 (Precision & Fallback)',
    category: 'PUTAWAY',
    primarySubject: 'LOCATION',
    owner: 'DC运营指挥中心',
    scenario: '【业务场景】大型混合分销中心。支持“AS/RS ➡️ 标准区 ➡️ 溢出区”三级自动降级。每一级包含多个细分业务场景与多步骤精密校验。',
    version: 'v5.1.0',
    status: 'ACTIVE',
    priority: 300,
    rules: [
      {
        id: 'rule-dc-p1-1',
        name: '规则 1.1：自动化冷链立库 (AS/RS Cold)',
        type: 'DIMENSION',
        enabled: true,
        priorityGroup: '第一阶段：极致精细寻址 (Precision)',
        flowControl: 'TERMINATE',
        matchingCriteria: [{ id: 'mc-dc-1', field: '存储环境', operator: '==', value: 'COLD' }],
        steps: [
          {
            id: 'st-dc-p1-1-1',
            name: '托盘/载具规格强检',
            targetSubject: 'CARRIER',
            filters: [{ id: 'f-dc-1', field: '载具高度', operator: '<=', value: '1.8m' }],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'CONTINUE'
          },
          {
            id: 'st-dc-p1-1-2',
            name: '立库巷道温度实时校验',
            targetSubject: 'CONTEXT',
            filters: [{ id: 'f-dc-2', field: '巷道探针状态', operator: '==', value: 'NORMAL' }],
            sorters: [{ factorId: 'fact-temp', factorName: '温度稳定性偏差', weight: 100, direction: 'ASC' }],
            failoverAction: 'PIPELINE_NEXT',
            flowControl: 'TERMINATE'
          }
        ]
      },
      {
        id: 'rule-dc-p1-2',
        name: '规则 1.2：重型重力货架 (Gravity Rack)',
        type: 'DIMENSION',
        enabled: true,
        priorityGroup: '第一阶段：极致精细寻址 (Precision)',
        flowControl: 'TERMINATE',
        matchingCriteria: [{ id: 'mc-dc-2', field: '商品重量等级', operator: '==', value: 'HEAVY' }],
        steps: [
          {
            id: 'st-dc-p1-2-1',
            name: '货位承重上限校验',
            targetSubject: 'LOCATION',
            filters: [{ id: 'f-dc-3', field: '承重余量', operator: '>=', value: '1000kg' }],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'CONTINUE'
          },
          {
            id: 'st-dc-p1-2-2',
            name: '库位周转率深度择优',
            targetSubject: 'LOCATION',
            sorters: [{ factorId: 'fact-turnover', factorName: '历史周转频次', weight: 80, direction: 'DESC' }],
            filters: [],
            failoverAction: 'PIPELINE_NEXT',
            flowControl: 'TERMINATE'
          }
        ]
      },
      {
        id: 'rule-dc-p2-1',
        name: '规则 2.1：同 SKU 散货位合并 (Consolidation)',
        type: 'DIMENSION',
        enabled: true,
        priorityGroup: '第二阶段：标准区域整合 (Standard)',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-dc-p2-1-1',
            name: '已有散货库位扫描',
            targetSubject: 'INVENTORY_LOT',
            filters: [{ id: 'f-dc-4', field: '库位状态', operator: '==', value: 'PARTIAL' }],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'CONTINUE'
          },
          {
            id: 'st-dc-p2-1-2',
            name: '合并后填充率计算',
            targetSubject: 'LOCATION',
            filters: [{ id: 'f-dc-5', field: '预测填充率', operator: '<=', value: '95%' }],
            sorters: [{ factorId: 'fact-fill', factorName: '空间利用率', weight: 100, direction: 'DESC' }],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE'
          }
        ]
      },
      {
        id: 'rule-dc-p2-2',
        name: '规则 2.2：动线与流量热度平抑',
        type: 'DIMENSION',
        enabled: true,
        priorityGroup: '第二阶段：标准区域整合 (Standard)',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-dc-p2-2-1',
            name: '月台路径最优计算',
            targetSubject: 'LOCATION',
            filters: [],
            sorters: [{ factorId: 'fact-dist', factorName: '月台物理距离', weight: 70, direction: 'ASC' }],
            failoverAction: 'NEXT_STEP',
            flowControl: 'CONTINUE'
          },
          {
            id: 'st-dc-p2-2-2',
            name: '作业拥堵实时规避',
            targetSubject: 'LOCATION',
            filters: [{ id: 'f-dc-6', field: '当前巷道人数', operator: '<', value: '3' }],
            sorters: [{ factorId: 'fact-traffic', factorName: '流量平衡因子', weight: 30, direction: 'DESC' }],
            failoverAction: 'PIPELINE_NEXT',
            flowControl: 'TERMINATE'
          }
        ]
      },
      {
        id: 'rule-dc-p3-1',
        name: '规则 3.1：应急溢出与越库路由',
        type: 'DIMENSION',
        enabled: true,
        priorityGroup: '第三阶段：应急溢出兜底 (Overflow)',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-dc-p3-1-1',
            name: '待出库订单 JIT 预匹配',
            targetSubject: 'ORDER_LINE',
            filters: [{ id: 'f-dc-7', field: '2H内出库需求', operator: '>', value: '0' }],
            sorters: [],
            failoverAction: 'NEXT_STEP',
            flowControl: 'CONTINUE',
            config: { "zonePreference": "越库暂存区 (CROSS-DOCK)" }
          },
          {
            id: 'st-dc-p3-1-2',
            name: '地堆应急位指派',
            targetSubject: 'LOCATION',
            filters: [{ id: 'f-dc-8', field: '库位类型', operator: '==', value: 'FLOOR_STACK' }],
            sorters: [],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'TERMINATE'
          }
        ]
      }
    ]
  },
  {
    id: 'STG-RET-PUTAWAY-SMART',
    name: '“全温层分布式”上架寻址策略 (Omni-Temp Dynamic Putaway)',
    category: 'PUTAWAY',
    primarySubject: 'LOCATION',
    owner: '冷链物流部',
    scenario: '【业务场景】解决生鲜电商与商超混存背景下的多温区上架寻址问题。自动匹配商品温标，并结合拣货频率进行动态分区。\n\n【配置逻辑：效率导向】\n- 第一步：温区匹配。通过 Filter 强行锁定与商品一致的温区货架。\n- 第二步：热度对齐。调取商品动销 ABC 分级，将热销品（A类）引导至月台附近的黄金位。\n- 第三步：空间均衡。优先填充已使用的半空库位，减少货位碎片化。',
    version: 'v2.8.5',
    status: 'ACTIVE',
    priority: 90,
    rules: [
      {
        id: 'rule-temp-put',
        name: '温控一致性与热力均衡上架',
        description: '【配置目标】实现温区硬匹配与品项热度分区。强制过滤器限制库位高度在 1.2m - 1.6m 之间以适配人工拣货。',
        enabled: true,
        matchingCriteria: [],
        steps: [
          {
            id: 'st-p1-1',
            name: '温区硬匹配与 ABC 热力筛选',
            description: '强制执行温区物理隔离，并根据 Sku 历史动销（ABC）将其分配至最优拣选层级（Level 1/2），平衡库容利用率与拣选动线。',
            targetSubject: 'LOCATION',
            filters: [
              { id: 'f-p1', field: '库区温层', operator: 'MATCH', value: 'ITEM_TEMP_REQ' },
              { id: 'f-p2', field: '当前储位余量比例', operator: '>=', value: '20%' },
              { id: 'f-p3', field: '库位高度层级', operator: 'IN', value: 'Level_1, Level_2', logicalOperator: 'AND' }
            ],
            sorters: [
              { factorId: 'fact-temp-suitability', factorName: '温区匹配度系数', weight: 30, direction: 'DESC' },
              { factorId: 'fact-abc-hit', factorName: '门店动销 ABC 吻合度', weight: 30, direction: 'DESC' },
              { factorId: 'fact-shelf-utilization', factorName: '库位容纳利用率', weight: 40, direction: 'DESC' }
            ],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: {
               "Hot Zone Radius(M)": "50",
               "Max Height(M)": "2.5"
            }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-RET-O2O-OMNI',
    name: '“即时达”O2O 与前置仓弹性拣选策略',
    category: 'ALLOCATION',
    primarySubject: 'INVENTORY_LOT',
    owner: '新零售交付中心',
    scenario: '【业务场景】应对极速达（1H/2H达）的高并发散单。通过分流策略确保即时配订单的履约优先级，同时平衡大宗预售单的库容占用。\n\n【配置逻辑】通过决策网关（Decision Gateway）实现流控：\n1. 渠道识别：识别“美团/饿了么/闪送”等即时配渠道，分配至【JIT 模式】规则。\n2. 区域锁定：JIT 模式强制锁定“前置拣货区”，忽略微小效期差异，保障出库时效。\n3. 常规处理：其他渠道进入【Standard 模式】，执行全局 FEFO 择优，优化库容利用率。',
    version: 'v1.1.2',
    status: 'ACTIVE',
    priority: 150,
    rules: [
      {
        id: 'gate-o2o-flow',
        name: '履约时效分流决策网关',
        type: 'GATE',
        description: '【配置目标】基于配送商 SLA (服务等级协议) 进行订单寻址路由分发。',
        enabled: true,
        matchingCriteria: [],
        steps: [],
        branches: [
          {
            id: 'br-jit',
            conditionLabel: '同城即时配 (1小时达)',
            targetRuleId: 'rule-jit-forward',
            criteria: [{ id: 'brc-1', field: '配送渠道', operator: 'IN', value: '美团, 饿了么, 闪送' }]
          },
          {
            id: 'br-std',
            conditionLabel: '次日达/标准件',
            targetRuleId: 'rule-std-bulk',
            criteria: [{ id: 'brc-2', field: '配送渠道', operator: 'NOT_IN', value: '美团, 饿了么, 闪送' }]
          }
        ]
      },
      {
        id: 'rule-jit-forward',
        name: 'JIT 模式：前置区动力库存锁定',
        description: '【逻辑解释】针对即时配送。系统仅检索“FORWARD_PICK”库区，通过“最短路径”因子排序，旨在 5 分钟内完成拣货下架。',
        enabled: true,
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-jit-1',
            name: '前置快速拣货区硬匹配',
            description: '针对 O2O 极速达订单，系统强制优先锁定前置仓（Forward Pick）的动力库存，最大限度缩短订单出库时间。',
            targetSubject: 'INVENTORY_LOT',
            filters: [
              { id: 'f-j1', field: '库区特性', operator: '==', value: 'FORWARD_PICK' }
            ],
            sorters: [
              { factorId: 'fact-route-dist', factorName: '出货月台测距', weight: 100, direction: 'ASC' }
            ],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'TERMINATE'
          }
        ]
      },
      {
        id: 'rule-std-bulk',
        name: 'Standard 模式：高密度存储区寻址',
        description: '【逻辑解释】常规配送订单。不限定库核区，执行全局最老批次优先（FEFO），最大限度利用存储纵深。',
        enabled: true,
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-std-1',
            name: '存储区全局效期择优',
            description: '在无 SLA 压力的情况下，执行标准 FEFO 逻辑，优先清空深层库区中的老批次批次以防止损耗。',
            targetSubject: 'INVENTORY_LOT',
            filters: [],
            sorters: [
              { factorId: 'fact-shelf-life-ratio', factorName: '剩余保质期占比', weight: 80, direction: 'ASC' },
              { factorId: 'fact-clear-bin', factorName: '容器清空倾向度', weight: 20, direction: 'DESC' }
            ],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'TERMINATE'
          }
        ]
      }
    ]
  },
  {
    id: 'STG-RET-BULK-SPLIT',
    name: '“整托+拆零”分层阶梯分配策略 (Bulk-to-Piece Tiered Allocation)',
    category: 'ALLOCATION',
    primarySubject: 'INVENTORY_LOT',
    owner: '零售仓储物流部',
    scenario: '【业务场景】解决商超补货中“整箱出库”与“零星拆单”并存的复杂需求。优先从高位存储区下架整托盘货物以提升大宗效率。\n\n【配置逻辑：先整后零】\n- 第一阶段：整托寻址。识别订单需求，若为整件单位，则锁定“高位存储区”，执行 FIFO（先进先出）。\n- 第二阶段：散件降级。若整区不足或存在零星尾数，则降级至“低价拣选面”，执行路径最短优化，最小化人工拣选动作。',
    version: 'v1.0.1',
    status: 'ACTIVE',
    priority: 120,
    guardrails: [],
    rules: [
      {
        id: 'rule-pallet-first',
        name: '阶段 1：存储区整托 FIFO 分配 (Pallet Logic)',
        description: '【配置目标】优先清空整库位。强制匹配“仓库存储中心”，并按入库时间顺序执行。',
        enabled: true,
        priorityGroup: '阶段 1: 大项优先',
        flowControl: 'CONTINUE',
        matchingCriteria: [
          { id: 'mc-p1', field: '单位体积', operator: '==', value: 'PALLET' }
        ],
        steps: [
          {
            id: 'st-p1',
            name: '高位存储区搜寻项',
            description: '针对托盘级大宗补货单，系统优先扫描 3 层以上的高位储位，并执行 FIFO 逻辑以保证库存流转一致。',
            targetSubject: 'INVENTORY_LOT',
            filters: [
              { id: 'f-p1', field: '库位高度层级', operator: '>=', value: 'Level_3' }
            ],
            sorters: [
              { factorId: 'fact-fifo-date', factorName: '入库时间轴 (FIFO)', weight: 100, direction: 'ASC' }
            ],
            failoverAction: 'NEXT_STEP',
            flowControl: 'CONTINUE',
            config: {
               "Area Match": "Bulk-Zone"
            }
          }
        ]
      },
      {
        id: 'rule-piece-second',
        name: '阶段 2：拣选面散件/拆零分配 (Piece Logic)',
        description: '【配置目标】处理剩余零散需求。锁定“地面拣选区”，追求最短拣选动线。',
        enabled: true,
        priorityGroup: '阶段 2: 零散处理',
        flowControl: 'TERMINATE',
        matchingCriteria: [],
        steps: [
          {
            id: 'st-p2',
            name: '地面拣选区搜寻项',
            description: '对于零散拆单部分，策略自动降级至地面拣选层（Level 1），追求人工作业路径最短化。',
            targetSubject: 'INVENTORY_LOT',
            filters: [
              { id: 'f-p3', field: '库区类型', operator: '==', value: 'PICK_FACE' }
            ],
            sorters: [
              { factorId: 'fact-route-dist', factorName: '路径行驶距离', weight: 80, direction: 'ASC' },
              { factorId: 'fact-shelf-life-ratio', factorName: '剩余保质期 (FEFO)', weight: 20, direction: 'ASC' }
            ],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'TERMINATE',
            config: {
               "Area Match": "Face-Zone"
            }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-RET-RCV-STD',
    name: '“食用标品”自动化去向分配策略 (Standard Edible Receiving)',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '标品课收货组',
    scenario: '【业务场景】应用于米面粮油、调味品等带条码的食用标品。目标是通过“预约匹配”实现极速入库。\n\n【配置逻辑：自动化协同】\n- 第一步：对账校验。匹配 ASN (高级收货预报) 的合规性因子。\n- 第二步：最优去向。识别订单是否为“紧急缺货”类目，若是则直接分配至 Cross-Dock 越库区域，跳过存储环节；否则引导至标品高位货架。',
    version: 'v2.0.0',
    status: 'ACTIVE',
    priority: 80,
    rules: [
      {
        id: 'rule-std-rcv-flow',
        name: '标品收货：自动化入库流',
        description: '【配置目标】实现无感上架。优先执行 Cross-Dock 校验，最大化减少库内停留。',
        enabled: true,
        matchingCriteria: [],
        steps: [
          {
            id: 'st-std-rcv-1',
            name: '越库作业 (Cross-Dock) 识别',
            description: '通过识别收货通知单（ASN）中的紧急补货标记，系统直接将货物路由至发货月台，实现入库即出。',
            targetSubject: 'ORDER_LINE',
            filters: [
              { id: 'f-std-1', field: '订单类型', operator: '==', value: 'CROSS_DOCK_REQUIRED' }
            ],
            sorters: [
              { factorId: 'fact-asn-match', factorName: 'ASN 匹配度', weight: 100, direction: 'ASC' }
            ],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE',
            config: { "Scan Mode": "Batch-OCR", "Auto-Confirm": "TRUE" }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-RET-RCV-FRESH-STD',
    name: '生鲜收货：冷链准入与【数量强控】策略',
    category: 'RECEIVING',
    primarySubject: 'CONTEXT',
    owner: '品控管理部 (QC)',
    scenario: '【业务重点: 数量强控】应用于冷链标品。核心逻辑分为：\n1. 准入：执行【数量合规强检】，容差控制在 ±5% 以内，超标直接回退 ASN。\n2. 寻址（硬优先级链）：\n   - [优先级1] 用户现场指定位：尊重现场灵活性，优先识别 Context 录入；\n   - [优先级2] SKU 预设收货位：执行生鲜分品项（如冻肉、活鱼）的特定库区布局；\n   - [优先级3] 单据类型兜底位：根据“供应商直送/大仓调拨”等业务类型分配默认暂存区。',
    version: 'v4.0.0',
    status: 'ACTIVE',
    priority: 140,
    rules: [
      {
        id: 'rule-fresh-qc-admission',
        name: '01 准入合规闸口【数量强控模式】',
        description: '【业务目的】确保实物收货符合冷链与采购合规。通过 IoT 监测与 ASN 容差双重校验。\n【核心逻辑】1. 温度偏离度检查；2. 报收数量与送货单（ASN）的差异控制在 ±5% 以内。',
        enabled: true,
        type: 'DIMENSION',
        flowControl: 'CONTINUE',
        matchingCriteria: [
          { id: 'mc-fresh-qc-1', field: 'SKU.存储温层', operator: 'IN', value: 'CHILLED, FROZEN' },
          { id: 'mc-fresh-qc-2', field: '单据类型', operator: '==', value: 'PURCHASE_ORDER', logicalOperator: 'AND' }
        ],
        steps: [
          {
            id: 'st-fresh-iot-admission',
            name: '冷链与数量强控',
            description: '准入拦截。验证供应商冷链设备在线且温度达标，同时校验实收数是否超过订单允许的溢收比例。',
            targetSubject: 'CONTEXT',
            filters: [
              { id: 'f-fstd-1', field: '冷链实时传感器状态', operator: '==', value: 'NORMAL' },
              { id: 'f-fstd-qty', field: '实收数量溢收比', operator: '<=', value: '1.05', logicalOperator: 'AND' },
              { id: 'f-fstd-2', field: '供应商等级', operator: '!=', value: 'BLACK_LIST', logicalOperator: 'AND' }
            ],
            sorters: [
              { factorId: 'fact-temp-suitability', factorName: '温区匹配度系数', weight: 60, direction: 'DESC' },
              { factorId: 'fact-asn-match', factorName: 'ASN 匹配度系数', weight: 40, direction: 'DESC' }
            ],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'CONTINUE',
            config: { 
              "Max_Qty_Deviation_Rate": "5%", 
              "IoT_Temperature_Sensor": "IoT-T01",
              "Qty_Strict_Lock_Mode": "STRICT_MATCH",
              "Compliance_Check_Level": "HIGH",
              "Auto_Kickback_Threshold": "1.05"
            }
          }
        ]
      },
      {
        id: 'rule-fresh-loc-routing',
        name: '02 智能选位寻址 (Intelligent Location Routing)',
        description: '【业务目的】在准入通过后，根据实物属性导向至理货位或暂存轨道。\n【核心逻辑】遵循“人脑优先 -> 主档锚定 -> 场景补位”阶梯，且必须强制满足【温区一致性】过滤。',
        enabled: true,
        type: 'DIMENSION',
        flowControl: 'TERMINATE',
        matchingCriteria: [
          { id: 'mc-fresh-loc-1', field: 'SKU.存储温层', operator: 'IN', value: 'CHILLED, FROZEN' }
        ],
        steps: [
          {
            id: 'st-user-manual-loc',
            name: '用户覆盖：紧急手动指定',
            description: '优先级1：若作业员在收货台手动录入了目标位（如：010101A），系统强制指向该核准位。仅需校验库位可用。',
            targetSubject: 'LOCATION',
            filters: [
              { id: 'f-manual-1', field: '用户手动指定标识', operator: '==', value: 'TRUE' },
              { id: 'f-manual-2', field: '库位锁定状态', operator: '==', value: 'UNLOCKED', logicalOperator: 'AND' }
            ],
            sorters: [
              { factorId: 'fact-manual-preset-loc', factorName: '用户指定收货位置权重', weight: 100, direction: 'DESC' }
            ],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE'
          },
          {
            id: 'st-sku-master-loc',
            name: '主档路由：SKU 推荐位匹配',
            description: '优先级2：前步落空。执行核心路由——寻找 SKU 属性关联的默认暂存位。此处增加【温区匹配】过滤器，严防冷冻货路由至常温位。',
            targetSubject: 'LOCATION',
            filters: [
              { id: 'f-sku-1', field: 'SKU主档是否有预设位', operator: '==', value: 'TRUE' },
              { id: 'f-sku-temp', field: '库位存取温区', operator: 'MATCH', value: 'SKU_STORE_TEMP', logicalOperator: 'AND' }
            ],
            sorters: [
              { factorId: 'fact-sku-inbound-loc', factorName: 'SKU 主档默认收货区', weight: 100, direction: 'DESC' }
            ],
            failoverAction: 'NEXT_STEP',
            flowControl: 'TERMINATE'
          },
          {
            id: 'st-fallback-dock-loc',
            name: '场景兜底：按单据类型分配月台',
            description: '优先级3：系统保底逻辑。根据业务来源分配至通用月台（Dock）或缓冲区（Staging）。主要考虑当前各通道的繁忙度和拥挤率。',
            targetSubject: 'LOCATION',
            filters: [
              { id: 'f-fallback-1', field: '库位利用率', operator: '<', value: '85%' }
            ],
            sorters: [
              { factorId: 'fact-doctype-inbound-loc', factorName: '单据类型兜底收货位', weight: 60, direction: 'DESC' },
              { factorId: 'fact-loc-util', factorName: '实时库容剩余率', weight: 40, direction: 'DESC' }
            ],
            failoverAction: 'ERROR_SUSPEND',
            flowControl: 'TERMINATE',
            config: { "Allow Group Received": "TRUE", "Auto Release Lock Minutes": 30 }
          }
        ]
      }
    ]
  },
  {
    id: 'STG-RET-RCV-FRESH-BULK',
    name: '“生鲜散货”称重与品质分级策略 (Fresh Bulk Catch-Weight)',
    category: 'RECEIVING',
    primarySubject: 'ORDER_LINE',
    owner: '大宗生鲜采购组',
    scenario: '【业务场景】针对散装蔬菜、活鱼、等非标生鲜。重点解决“称重容差”与“品质实时打分”问题。\n\n【配置逻辑：动态适配】\n- 第一步：重量对齐。系统自动剔除载具重量，计算单品“称重溢出率”，超标则触发成本预警。\n- 第二步：等级路由。根据 QC 录入的品相打分（A/B/C），自动寻址至不同的存储或加工工艺区（如 A 级冷藏，C 级直供打折台）。',
    version: 'v1.4.5',
    status: 'ACTIVE',
    priority: 110,
    rules: [
      {
        id: 'rule-fresh-bulk-weight',
        name: '散货称重：自动溢出处理',
        description: '【配置目标】管控收货损耗。动态匹配“称重容差”参数，自动处理溢收任务。',
        enabled: true,
        matchingCriteria: [],
        steps: [
          {
            id: 'st-bulk-1',
            name: '称重数据同步与溢收校验',
            description: '实时对接 IoT 电子秤，校验散货实际称重与订单采购数的差异。若溢收超过 5% 阈值，系统将自动触发任务截断并生成差异补差单（WOCR）。',
            targetSubject: 'ORDER_LINE',
            filters: [
              { id: 'f-bulk-1', field: '称重容差', operator: '<=', value: '5%' }
            ],
            sorters: [
              { factorId: 'fact-catch-weight-tol', factorName: '称重容差溢出率', weight: 100, direction: 'ASC' }
            ],
            failoverAction: 'SPLIT_NEW_WO',
            flowControl: 'CONTINUE',
            config: { "Catch Weight Required": "TRUE", "Scale Integration": "WCS-IoT-S01" }
          }
        ]
      }
    ]
  }
];

export const mockFactors: Factor[] = [
  {
    id: 'fact-sku-affinity',
    name: '波次内 SKU 聚合重合度',
    targetObject: 'ORDER_LINE',
    category: 'LOGICAL',
    impactType: 'ADJUSTMENT',
    description: '波次计算核心因子。量化一组订单中共同包含的 SKU 比例，重合度越高，越倾向于打包至同一拣货波次，提升边际拣选效率。',
    logic: { formula: 'Intersection(Orders.SKUs) / Union(Orders.SKUs)', unit: '%' }
  },
  {
    id: 'fact-deadhead-dist',
    name: '设备次任务空跑距离',
    targetObject: 'EQUIPMENT',
    category: 'PHYSICAL',
    impactType: 'ADJUSTMENT',
    description: '任务交叉(Interleaving)核心因子。计算上一个任务卸货点到下一个任务拾货点之间的导航距离，避免设备重载去、空载回。',
    logic: { formula: 'Route(DropLocation, NextPickLocation)', unit: 'm' }
  },
  {
    id: 'fact-staging-capacity',
    name: '集货道(Staging)可用承载率',
    targetObject: 'STAGING_AREA',
    category: 'PHYSICAL',
    impactType: 'ADJUSTMENT',
    description: '发货路由控制因子。评估候选集货月台或缓存道的可用托盘位/体积，优先向空闲度高的发货门分配波次任务。',
    logic: { formula: '1 - (StagingOccupiedVol / StagingLimitVol)', unit: '%' }
  },
  { 
    id: 'fact-shelf-life-ratio', 
    name: '剩余保质期占比 (FEFO%)', 
    targetObject: 'INVENTORY_LOT', 
    category: 'TEMPORAL',
    impactType: 'ADJUSTMENT',
    description: '绝对核心生鲜因子。公式：(过期日期 - 当前时间) / 总保质期。值越小表示越迫切需出库，用于支持严格的 FEFO 管理。',
    logic: { formula: '(ExpiryDate - Now) / TotalShelfLife', unit: '%' }
  },
  { 
    id: 'fact-fifo-date', 
    name: '入库时间轴 (FIFO)', 
    targetObject: 'INVENTORY_LOT', 
    category: 'TEMPORAL',
    impactType: 'ADJUSTMENT',
    description: '标准先进先出。按货物实际进入仓库的时间排序，确保库存周转健康。',
    logic: { formula: 'InboundTimestamp', unit: 'Timestamp' }
  },
  { 
    id: 'fact-temp-suitability', 
    name: '库位温区匹配度系数', 
    targetObject: 'LOCATION', 
    category: 'PHYSICAL',
    impactType: 'CONSTRAINT',
    description: '检查库位实际温控值（如感应器实时温度）与商品存储要求温层的吻合程度。',
    logic: { formula: 'abs(CurrentSensorTemp - TargetTempRange.Mid) < Range ? 1.0 : -999', unit: 'Score' }
  },
  { 
    id: 'fact-store-aisle-seq', 
    name: '门店陈列动线顺位 (Store-Friendly)', 
    targetObject: 'LOCATION', 
    category: 'LOGICAL',
    impactType: 'ADJUSTMENT',
    description: '核心零售因子。对比候选库位在仓库的坐标与该零售单目标门店的陈列路径匹配分，旨在产出“上架友好”的拣货箱。',
    logic: { formula: 'abs(Loc.AisleIndex - StorePlanogram.PathIndex)', unit: 'Idx_Diff' }
  },
  {
    id: 'fact-shelf-utilization',
    name: '货位利用率深度优化盘扣',
    targetObject: 'LOCATION',
    category: 'PHYSICAL',
    impactType: 'ADJUSTMENT',
    description: '优先选择由于出库导致的“半空”库位进行上架，以减少库位碎片化（碎片整理）。',
    logic: { formula: '1 - (BinOccupiedVol / BinTotalVol)', unit: '%' }
  },
  {
    id: 'fact-fragile-protection',
    name: '易碎品保护包装系数',
    targetObject: 'INVENTORY_LOT',
    category: 'PHYSICAL',
    impactType: 'BEHAVIORAL',
    description: '识别鸡蛋、玻璃瓶装奶等易碎品，在生成的搬运任务中自动增加“轻拿轻放”标记，并优化在容器中的堆码位置。',
    logic: { formula: 'ItemType == "FRAGILE" ? 100 : 0' }
  },
  { 
    id: 'fact-item-weight-grade', 
    name: '货物负载重量等级', 
    targetObject: 'INVENTORY_LOT', 
    category: 'PHYSICAL',
    impactType: 'ADJUSTMENT',
    description: '用于实现“重下轻上”物理堆叠逻辑。将重货因子分赋予大米、大桶油、成箱饮料等商品，在寻址时强制排序靠前。',
    logic: { formula: 'WeightPerUOM > RetailThresholdWeight ? 100 : 0', unit: 'Index' }
  },
  { 
    id: 'fact-pick-density', 
    name: '库位高度拣选密度', 
    targetObject: 'LOCATION', 
    category: 'PHYSICAL',
    impactType: 'ADJUSTMENT',
    description: '优先选择在黄金作业高度区域（0.8m - 1.5m）的储位，以提高人工拣货效率并降低疲劳度。',
    logic: { formula: '1 / (abs(BinHeight - 1.2) + 0.1)', unit: 'Score' }
  },
  { 
    id: 'fact-clear-bin', 
    name: '储位清空倾向度', 
    targetObject: 'INVENTORY_LOT', 
    category: 'LOGICAL',
    impactType: 'ADJUSTMENT',
    description: '衡量订单需求量与现有储位存量的契合度。若分配后可清空储位以腾出库容，则获得加分。',
    logic: { formula: 'InventoryQty == OrderQty ? 1.0 : 0.0' }
  },
  { 
    id: 'fact-abc-hit', 
    name: '门店动销 ABC 吻合度', 
    targetObject: 'INVENTORY_LOT', 
    category: 'LOGICAL',
    impactType: 'ADJUSTMENT',
    description: '基于大数据分析的 SKU 动销热度画像与物理储位热度规划的匹配分。',
    logic: { formula: 'SkuABC == LocationABC ? 1.0 : 0.2' }
  },
  { 
    id: 'fact-route-dist', 
    name: '路径行驶距离 (Manhattan)', 
    targetObject: 'LOCATION', 
    category: 'PHYSICAL',
    impactType: 'ADJUSTMENT',
    description: '计算作业员或移动设备从当前任务锚点到目标库位的物理行驶路径。',
    logic: { formula: 'abs(X2-X1) + abs(Y2-Y1)', unit: 'M' }
  },
  { 
    id: 'fact-volume-fill', 
    name: '包装容器体积利用率', 
    targetObject: 'CARRIER', 
    category: 'PHYSICAL',
    impactType: 'ADJUSTMENT',
    description: '在打包阶段计算。优先分配能最大化填满周转箱或物流台车的物品组合。',
    logic: { formula: '(AccVol + ItemVol) / CarrierLimitVol', unit: '%' }
  },
  {
    id: 'fact-asn-match',
    name: 'ASN 匹配度系数 (ASN Deviation)',
    targetObject: 'ORDER_LINE',
    category: 'COMPLIANCE',
    impactType: 'CONSTRAINT',
    description: '衡量实际收货数量与预录入通知单（ASN）的差异百分比。差异越小表示供应商交付质量越高。',
    logic: { formula: 'abs(RecvQty - AsnQty) / AsnQty', unit: '%' }
  },
  {
    id: 'fact-quality-grade',
    name: '收货品质准入等级 (Grading)',
    targetObject: 'INVENTORY_LOT',
    category: 'COMPLIANCE',
    impactType: 'CONSTRAINT',
    description: '生鲜行业专用。收货时由品控人员根据新鲜度、外观分级（A/B/C），直接决定该批次的分配优先级。',
    logic: { formula: 'GradeScale[Item.InputGrade]', unit: 'Level' }
  },
  {
    id: 'fact-catch-weight-tol',
    name: '生鲜称重容差溢出率',
    targetObject: 'ORDER_LINE',
    category: 'COMPLIANCE',
    impactType: 'CONSTRAINT',
    description: '针对散货生鲜（如活鱼、散装果蔬）。监控实际称重入库数与订单采购数的偏移，支持业务级的损耗分析。',
    logic: { formula: '(NetWeight - OrderedWeight) / OrderedWeight', unit: '%' }
  },
  {
    id: 'fact-manual-preset-loc',
    name: '用户指定收货位置权重',
    targetObject: 'CONTEXT',
    category: 'LOGICAL',
    impactType: 'BEHAVIORAL',
    description: '作业员在 PDA 或工作台上手动指定的收货理货位。作为最高优先级，系统将忽略算法逻辑强制指向该位置以便于现场灵活调度。',
    logic: { formula: 'Context.ManualLocationId != null ? 1.0 : 0.0' }
  },
  {
    id: 'fact-sku-inbound-loc',
    name: 'SKU 主档默认收货区',
    targetObject: 'LOCATION',
    category: 'LOGICAL',
    impactType: 'BEHAVIORAL',
    description: '来源于 SKU 主数据配置。针对特定品项（如活鲜、高价值冻品）设定的固定收货道口，旨在保障特殊装卸设备或温控设施的就近原则。',
    logic: { formula: 'Location.Id == Sku.DefaultInboundLoc ? 1.0 : 0.0' }
  },
  {
    id: 'fact-doctype-inbound-loc',
    name: '单据类型兜底收货位',
    targetObject: 'LOCATION',
    category: 'LOGICAL',
    impactType: 'BEHAVIORAL',
    description: '策略链的最终兜底逻辑。根据业务单据类型（如：大仓补货 vs 供应商直送）自动分配至对应的月台组 or 缓冲区。',
    logic: { formula: 'Location.Id == DocType.DefaultLoc ? 1.0 : 0.0' }
  }
];

export const mockIndependentRules: StrategyRule[] = [
  {
    id: 'RULE-IND-STORE-SEQUENCE',
    name: '【门店分单】基于门店路径的任务拆分规则',
    description: '【业务解释】在波次生成阶段执行。防止作业任务跨度过大。\n【拦截逻辑】如果订单商品分布跨距超过 3 个巷道，或涉及由不同温层设备搬运，则强制进行任务截断，确保单个 Pick-Walk 路径最优。',
    enabled: true,
    matchingCriteria: [{ id: 'mc-ind-1', field: '作业单元类', operator: '==', value: 'STORE_B2B' }],
    steps: [
      {
        id: 'st-ind-1',
        name: '货架区物理限界隔离',
        description: '基于物理巷道逻辑，强制限制单次拣选路线横跨的货位范围（如 3 个巷道以内），以防止拣货员行走功耗过大。',
        targetSubject: 'CONTEXT',
        filters: [],
        sorters: [],
        failoverAction: 'ERROR_SUSPEND',
        flowControl: 'CONTINUE',
        config: { "Max Cross-Aisle Span": "3" }
      }
    ]
  },
  {
    id: 'RULE-IND-REPLENISH-TRIGGER',
    name: '【自动补货】动态水位拉动网关',
    description: '【业务解释】实时监控拣货区与前置仓水位。\n【驱动逻辑】当 SKU 的实时库存满足天数（DOS）低于 1.5 天时，直接生成跨温层内调任务。针对 A 类高频品，允许更激进的补货阈值（0.8）以防止缺货。',
    enabled: true,
    matchingCriteria: [],
    steps: [
      {
        id: 'st-ind-2',
        name: '低水位报警与拉动计算',
        description: '实时监控商品在拣货位的手边库存。一旦 DOS（库存可用天数）触发临界阈值，系统自动拉动高位存储区进行就近补货。',
        targetSubject: 'CONTEXT',
        filters: [
          { id: 'f-ind-1', field: '库存可用天数(DOS)', operator: '<', value: '1.5' }
        ],
        sorters: [
          { factorId: 'fact-abc-hit', factorName: '动销 ABC 吻合度', weight: 100, direction: 'DESC' }
        ],
        failoverAction: 'NEXT_STEP',
        flowControl: 'TERMINATE',
        config: { "Replenishment Mode": "JIT-Pull", "Aggressive Threshold": "0.8" }
      }
    ]
  },
  {
    id: 'RULE-IND-FOOD-SAFETY',
    name: '【食安拦截】生鲜与非食混放强制拦截规则',
    description: '【业务解释】严格执行食品安全合规准则。\n【强控逻辑】建立类目隔离矩阵。系统在寻址时强制执行 EXCLUDE 过滤器，严禁将食品分配至存储过洗涤剂、杀虫剂等化学品的库位及其周边相邻库位。',
    enabled: true,
    matchingCriteria: [{ id: 'mc-ind-fs-1', field: '行业 compliance', operator: '==', value: 'FOOD_SAFETY' }],
    steps: [
      {
        id: 'st-ind-fs-1',
        name: '污染防线硬校验',
        description: '食品安全核心拦截器。禁止将食品类 SKU 分配至曾存放过化学品或强气味商品的货位及其相邻 1 米半径内的储位。',
        targetSubject: 'LOCATION',
        filters: [
          { id: 'f-fs-1', field: '周边库位物品类目', operator: 'EXCLUDE', value: 'Chemicals/Detergents' }
        ],
        sorters: [],
        failoverAction: 'ERROR_SUSPEND',
        flowControl: 'CONTINUE',
        config: { "Incompatibility Group": "Group_07_Chem", "Audit Level": "High" }
      }
    ]
  }
];

import React from 'react';
import { Card, Button, Badge } from '../components/ui';
import { ShoppingCart, Snowflake, Truck, Package, HeartPulse, Sparkles, Scale, RefreshCcw, Handshake, Layers, Cpu, Database, Box, Scissors, BookOpen, LayoutGrid } from 'lucide-react';
import { StrategyDetail } from '../types/wms';

interface TemplateDefinition {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  color: string;
  bgColor: string;
  description: string;
  tags: string[];
  preset: Partial<StrategyDetail>;
}

interface TemplateLibraryProps {
  onUseTemplate: (template: Partial<StrategyDetail>) => void;
  onOpenHelp: () => void;
}

const templates: TemplateDefinition[] = [
  {
    id: 'TPL-RET-FRESH-PUT',
    name: '生鲜全温区智能上架逻辑 (Fresh Focus)',
    icon: Snowflake,
    category: 'PUTAWAY',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    description: '专为生鲜零售设计。集成传感器温压监测，自动识别库位实时波段；结合ABC热力图，将高周转生鲜引导至月台就近区域。',
    tags: ['温控隔离', '生鲜热力图', '冷链断链监控'],
    preset: {
      category: 'PUTAWAY' as const,
      name: '生鲜全温层智能上架策略',
      scenario: '包含常温、冷藏(2-8℃)、冷冻(-18℃)的多温层零售配送中心。',
      rules: [
        {
          id: 'rule-fresh-temp',
          name: '温层强制匹配准入',
          enabled: true,
          matchingCriteria: [{ id: 'mc-f-1', field: '商品温控等级', operator: '!=', value: 'NORMAL' }],
          steps: [
            {
              id: 'st-f-1',
              name: '动态传感器温域过滤',
              stepType: 'SELECT',
              inputSubject: 'LOCATION',
              outputSubject: 'LOCATION',
              action: 'RECOMMEND',
              filters: [{ id: 'f-f-1', field: '库位实时温度', operator: 'MATCHES', value: '商品要求温域' }],
              sorters: [{ factorId: 'fact-abc-hit', factorName: '品项热度匹配', weight: 100, direction: 'DESC' as const }],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const,
              config: { tempTolerance: '±1.5℃', heatMapSync: 'Realtime' }
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-RET-STORE-PICK',
    name: '门店友好型拣选组合策略 (Store-Friendly)',
    icon: ShoppingCart,
    category: 'ALLOCATION',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    description: '优化门店上架效率。按门店陈列顺序生成拣货动线，并强制执行“重下轻上”打包原则，减少商品损耗与理货成本。',
    tags: ['排列顺序对齐', '重下轻上', '门店动线优化'],
    preset: {
      category: 'ALLOCATION' as const,
      name: '零售门店补货拣选策略',
      scenario: '服务于连锁超市及便利店的前置拣选中心。',
      rules: [
        {
          id: 'rule-store-sort',
          name: '门店动线与物理堆叠平衡',
          enabled: true,
          matchingCriteria: [],
          steps: [
            {
              id: 'st-s-1',
              name: '门店友好型权重计算',
              stepType: 'SELECT',
              inputSubject: 'ORDER_LINE',
              outputSubject: 'LOCATION',
              action: 'RECOMMEND',
              filters: [],
              sorters: [
                { factorId: 'fact-store-aisle-seq', factorName: '门店货架动线顺序', weight: 60, direction: 'ASC' as const },
                { factorId: 'fact-item-weight-grade', factorName: '重物沉底系数', weight: 40, direction: 'DESC' as const }
              ],
              failoverAction: 'NEXT_STEP' as const,
              flowControl: 'TERMINATE' as const,
              config: { heavyThreshold: '5kg', sequenceWeighting: 'Strict' }
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-RCV-001',
    name: '多源混合收货与QC拦截防线',
    icon: Handshake,
    category: 'RECEIVING',
    color: 'text-violet-500',
    bgColor: 'bg-violet-50',
    description: '采购入库严查效期与超收，客退等逆向物流强制直接打入质检待定区，通过多套规则完美路由异常源头。',
    tags: ['QC拦截', '效期防线', '退货隔离'],
    preset: {
      category: 'RECEIVING' as const,
      name: '全场景入库收发调度',
      scenario: '采购送货与C端退件混流的大型分拨中心。',
      rules: [
        {
          id: 'rule-tpl-rcv-1',
          name: '供应商采购 (ASN)',
          enabled: true,
          matchingCriteria: [{ id: 'mc1', field: '收货类型', operator: '==', value: 'PO_ASN' }],
          steps: [
            {
              id: 'step1',
              name: '查效期并分配快收站',
              stepType: 'SELECT',
              inputSubject: 'ORDER_LINE',
              outputSubject: 'LOCATION',
              action: 'ASSIGN',
              filters: [{ id: 'f1', field: '剩余效期', operator: '>=', value: '70%' }],
              sorters: [{ factorId: 'fact-route', factorName: '最优动线', weight: 100, direction: 'ASC' as const }],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        },
        {
          id: 'rule-tpl-rcv-2',
          name: '售后退货 (RMA)',
          enabled: true,
          matchingCriteria: [{ id: 'mc2', field: '收货类型', operator: '==', value: 'RETURN' }],
          steps: [
            {
              id: 'step2',
              name: '锁入退货隔离区',
              stepType: 'SELECT',
              inputSubject: 'ORDER_LINE',
              outputSubject: 'LOCATION',
              action: 'LOCK',
              filters: [{ id: 'f2', field: '库位类型', operator: '==', value: 'QC_HOLD' }],
              sorters: [{ factorId: 'fact-capacity', factorName: '容量', weight: 100, direction: 'DESC' as const }],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-GSP-002',
    name: 'GSP医药合规收货与上架',
    icon: HeartPulse,
    category: 'PUTAWAY',
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    description: '符合国家医药GSP强制标准的入库策略，深度集成效期前置拦截、冷链强制分配与精麻毒化学品铁门隔离。',
    tags: ['GSP强校验', '冷链专属区', '批号严格隔离'],
    preset: {
      category: 'PUTAWAY' as const,
      name: 'GSP合规级医药入库',
      scenario: '医药流通、特殊管控药品、近效期拦截',
      rules: [
        {
          id: 'rule-gsp-cold',
          name: '2~8℃冷藏药品专属分配',
          enabled: true,
          matchingCriteria: [
            { id: 'mc-c1', field: '商品温控级', operator: '==', value: 'COLD_2_8C' }
          ],
          steps: [
            {
              id: 'step-ph1',
              name: '自动化冷库首存区',
              filters: [
                { id: 'f1', field: '库区温层', operator: '==', value: '2_8C' },
                { id: 'f2', field: '库位状态', operator: '==', value: 'EMPTY' },
              ],
              sorters: [
                { factorId: 'fact-temp-diff', factorName: '温差波动率', weight: 40, direction: 'ASC' as const },
                { factorId: 'fact-capacity', factorName: '容量利用率', weight: 60, direction: 'DESC' as const }
              ],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        },
        {
          id: 'rule-gsp-hazard',
          name: '毒麻精放管控药品金库分配',
          enabled: true,
          matchingCriteria: [
            { id: 'mc-h1', field: '商品属性', operator: 'IN', value: '[毒性, 麻醉, 精神类]' }
          ],
          steps: [
            {
              id: 'step-ph3',
              name: '高安防铁网防死防盗区',
              filters: [
                { id: 'f7', field: '库区类型', operator: '==', value: 'HIGH_SECURITY' }
              ],
              sorters: [
                { factorId: 'fact-weight-cap', factorName: '安全承重余量', weight: 100, direction: 'DESC' as const }
              ],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-OMNI-002',
    name: '全渠道B2B/B2C混合拣货分配',
    icon: Scale,
    category: 'ALLOCATION',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    description: '全渠道一盘货模式。零售散单与批发大单同群处理：B2C引导清退阁楼散架零托，B2B大宗直切高架整托。',
    tags: ['整散分离', '动态清库', '一盘货'],
    preset: {
      category: 'ALLOCATION' as const,
      name: '全渠道订单库存定位',
      scenario: '融合B2B门店调拨与B2C电商零售的分发网络',
      rules: [
        {
          id: 'rule-b2c-retail',
          name: 'B2C 海量散单去零',
          enabled: true,
          matchingCriteria: [
            { id: 'mc-b2c', field: '业务线', operator: '==', value: 'B2C_RETAIL' }
          ],
          steps: [
            {
              id: 'step-b2c-1',
              name: '拆零区找零活优先FEFO',
              filters: [
                { id: 'f-b2c-1', field: '库区', operator: '==', value: 'ACTIVE_PICK' }
              ],
              sorters: [
                { factorId: 'fact-fefo', factorName: '批次效期(FEFO)', weight: 60, direction: 'ASC' as const },
                { factorId: 'fact-clear-bin', factorName: '清空储位倾向度', weight: 40, direction: 'DESC' as const }
              ],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        },
        {
          id: 'rule-b2b-bulk',
          name: 'B2B 大宗单据整出',
          enabled: true,
          matchingCriteria: [
            { id: 'mc-b2b', field: '单行需求量', operator: '>=', value: '托规大小' }
          ],
          steps: [
            {
              id: 'step-b2b-1',
              name: '存储区原托直发',
              filters: [
                { id: 'f-b2b-1', field: '库存形态', operator: '==', value: 'FULL_PALLET' }
              ],
              sorters: [
                { factorId: 'fact-fifo', factorName: '入库时间(FIFO)', weight: 70, direction: 'ASC' as const },
                { factorId: 'fact-aisle-cong', factorName: '通道拥挤度', weight: 30, direction: 'ASC' as const }
              ],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-CROSS-003',
    name: '爆品越库直发联动 (Cross-Docking)',
    icon: Sparkles,
    category: 'ALLOCATION',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    description: '卸车后不做实质上架，而是将收货月台库存直接许配给等货急单或波次，通过“即收即发”做到零库存停留。',
    tags: ['收发联动', '零库存流转', '即收即发'],
    preset: {
      category: 'ALLOCATION' as const,
      name: '急单越库流转分拨',
      scenario: '背靠背极速补发、双十一热销爆品到货',
      rules: [
        {
          id: 'rule-cross-dock',
          name: '爆品越库分配逻辑',
          enabled: true,
          matchingCriteria: [
             { id: 'mc-cd-1', field: '商品动销等级', operator: '==', value: 'S_CLASS' },
             { id: 'mc-cd-2', field: '当前缺货排队单', operator: '>', value: '0' }
          ],
          steps: [
            {
              id: 'step-cd-1',
              name: '收货月台直送发货缓存区',
              filters: [
                 { id: 'f-cd-1', field: '库存节点', operator: '==', value: 'INBOUND_DOCK' }
              ],
              sorters: [
                 { factorId: 'fact-in-time', factorName: '滞留时长', weight: 100, direction: 'DESC' as const }
              ],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-REP-004',
    name: '前置拣货区智能预测补货',
    icon: RefreshCcw,
    category: 'REPLENISHMENT',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    description: '结合动态库存水位(Min-Max)和波次缺货预警，在拣货人员取空货架前，由AGV提前从存储区下架托盘补充拣货位。',
    tags: ['Min-Max水位', '波次协同拉动', '避免断货'],
    preset: {
      category: 'REPLENISHMENT' as const,
      name: '波次联动动态补货',
      scenario: '阁楼或轻型货架区被快速消耗时的自动化立体库拉动调拨。',
      rules: [
        {
          id: 'rule-rep-surge',
          name: '波次中断缺货拉动(反应性)',
          enabled: true,
          matchingCriteria: [
            { id: 'mc-rep-1', field: '补货触发源', operator: '==', value: 'SHORTAGE_DURING_WAVE' }
          ],
          steps: [
            {
              id: 'step-rep-1',
              name: '高优分配就近满托',
              filters: [
                { id: 'f-rep-1', field: '当前库容形态', operator: '==', value: 'FULL_PALLET' }
              ],
              sorters: [
                { factorId: 'fact-route', factorName: '最优动线距离', weight: 100, direction: 'ASC' as const }
              ],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-WAVE-005',
    name: '爆品单件与时效急送混合波次',
    icon: Layers,
    category: 'WAVE',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    description: '复杂的订单池聚类。自动剥离纯单件爆品订单进行“一单一波”海量聚合；同时拦截即将超时的同城急送单优先落波。',
    tags: ['结构化波次', '一单一波', '时效截单'],
    preset: {
      category: 'WAVE' as const,
      name: '智能波次混排策略',
      scenario: '混业且包裹结构复杂的发货区。',
      rules: [
        {
          id: 'rule-wave-1',
          name: '单件订单海量聚合',
          enabled: true,
          matchingCriteria: [
             { id: 'm-w-1', field: '订单行数', operator: '==', value: '1' }
          ],
          steps: [
            {
              id: 'st-w-1',
              name: '建立超大波次 (500单)',
              filters: [{ id: 'f-w-1', field: '区域密度', operator: '>', value: '高密度' }],
              sorters: [{ factorId: 'fact-turnover', factorName: '品项集中度', weight: 100, direction: 'DESC' as const }],
              failoverAction: 'NEXT_STEP' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        },
        {
          id: 'rule-wave-2',
          name: '时效急送订单抢发',
          enabled: true,
          matchingCriteria: [
             { id: 'm-w-2', field: '剩余截单时间', operator: '<', value: '2h' }
          ],
          steps: [
            {
              id: 'st-w-2',
              name: '强制同承运商建波',
              filters: [{ id: 'f-w-2', field: '承运商', operator: '==', value: '一致' }],
              sorters: [{ factorId: 'fact-fefo', factorName: '紧急程度', weight: 100, direction: 'ASC' as const }],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-EWM-006',
    name: 'WOCR与POSC多步任务打包',
    icon: Package,
    category: 'WAVE',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    description: '引入SAP EWM核心思想。支持按捡货车容量限制打包Warehouse Order，并通过POSC工序流转控制下放VAS增值服务工作台。',
    tags: ['WO打包', 'POSC路由', '容器校验'],
    preset: {
      category: 'WAVE' as const,
      name: '仓储订单动态组合与拆分',
      scenario: '具有高度自动化设备以及分步流程操作的大型电商/零售仓库。',
      rules: [
        {
          id: 'rule-tpl-wocr-1',
          name: '按捡货车格口数打包(WOCR)',
          enabled: true,
          matchingCriteria: [{ id: 'm-wocr-1', field: '作业环节', operator: '==', value: 'PICKING' }],
          steps: [
            {
              id: 'st-wocr-1',
              name: '计算设备载具阈值',
              filters: [{ id: 'f-wocr-1', field: '当前WO行数', operator: '<=', value: '设备格口数' }],
              sorters: [{ factorId: 'fact-wo-max-wt', factorName: '装载利用率', weight: 100, direction: 'DESC' as const }],
              failoverAction: 'NEXT_STEP' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        },
        {
          id: 'rule-tpl-posc-1',
          name: '特殊贴标流转工序 (POSC)',
          enabled: true,
          matchingCriteria: [{ id: 'm-posc-1', field: 'VAS需求', operator: '==', value: 'TRUE' }],
          steps: [
            {
              id: 'st-posc-1',
              name: '目的地强制映射',
              filters: [],
              sorters: [{ factorId: 'fact-posc-step', factorName: '最优转运距离', weight: 100, direction: 'ASC' as const }],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-ASRS-007',
    name: '立库多深位防倒库与少移库最优分配',
    icon: Cpu,
    category: 'ALLOCATION',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    description: '专为四向穿梭车/双深位立库打造。避免出库导致的高额挖库理货成本，系统自动通过博弈算法找出最容易抓取的外侧同批次托盘。',
    tags: ['少理库算法', '多深位死锁防范', '底层设备测距'],
    preset: {
      category: 'ALLOCATION' as const,
      name: '自动化仓高并发分配',
      scenario: '大型穿梭母子车多深位库出库拣选分配。',
      rules: [
        {
          id: 'rule-tpl-asrs-1',
          name: '紧急单直寻探头区',
          enabled: true,
          matchingCriteria: [{ id: 'm-asrs-1', field: '单据时效', operator: '==', value: 'URGENT' }],
          steps: [
            {
              id: 'st-asrs-1',
              name: '探头最外侧锁定',
              filters: [{ id: 'f-asrs-1', field: '阻挡板数', operator: '==', value: '0' }],
              sorters: [{ factorId: 'fact-equipment-dist', factorName: '最优转运距离', weight: 100, direction: 'ASC' as const }],
              failoverAction: 'NEXT_STEP' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        },
        {
          id: 'rule-tpl-asrs-2',
          name: '常规单移库成本博弈',
          enabled: true,
          matchingCriteria: [{ id: 'm-asrs-2', field: '单据时效', operator: '==', value: 'NORMAL' }],
          steps: [
            {
              id: 'st-asrs-2',
              name: '理库代价叠加效期计算',
              filters: [],
              sorters: [
                { factorId: 'fact-depth-penalty', factorName: '防倒库惩罚', weight: 60, direction: 'ASC' as const },
                { factorId: 'fact-fefo', factorName: '效期', weight: 40, direction: 'ASC' as const }
              ],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-ASRS-008',
    name: '自动化巷道负载打散与重心安全上架',
    icon: Database,
    category: 'PUTAWAY',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-50',
    description: '与WCS设备层深度联动。结合巷道级热力图打散任务防止单巷道排队瘫痪，并按重度/轮廓保证数十米高位货架三维重心稳定。',
    tags: ['WCS联动均衡', '货架重心控制', '排队死锁解除'],
    preset: {
      category: 'PUTAWAY' as const,
      name: '无人车道载荷均衡自适应',
      scenario: '拥有10+车道的大型无人立体仓库的智能上架分流。',
      rules: [
        {
          id: 'rule-tpl-put-asrs-1',
          name: '重型异常托盘底层保护',
          enabled: true,
          matchingCriteria: [{ id: 'm-p-asrs-1', field: '托盘重量(KG)', operator: '>=', value: '1000' }],
          steps: [
            {
              id: 'st-p-asrs-1',
              name: '底层设备健康过滤',
              filters: [
                { id: 'f-p-asrs-1', field: '货架高度限制', operator: '<=', value: '层数3' },
                { id: 'f-p-asrs-2', field: '设备健康度', operator: '==', value: 'HEALTHY' }
              ],
              sorters: [{ factorId: 'fact-rack-stability', factorName: '重心绝对平稳', weight: 100, direction: 'DESC' as const }],
              failoverAction: 'NEXT_STEP' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        },
        {
          id: 'rule-tpl-put-asrs-2',
          name: '常规托盘全局均衡',
          enabled: true,
          matchingCriteria: [{ id: 'm-p-asrs-2', field: '托盘规格', operator: '==', value: 'STANDARD' }],
          steps: [
            {
              id: 'st-p-asrs-2',
              name: '跨巷道打散',
              filters: [{ id: 'f-p-asrs-3', field: '排队限制', operator: '<=', value: '5' }],
              sorters: [
                { factorId: 'fact-aisle-load', factorName: '设备空闲度', weight: 70, direction: 'ASC' as const },
                { factorId: 'fact-abc', factorName: '巷道口热力匹配', weight: 30, direction: 'DESC' as const }
              ],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-ALLOC-009',
    name: '整托直发与散件清尾统筹分配',
    icon: Box,
    category: 'ALLOCATION',
    color: 'text-violet-500',
    bgColor: 'bg-violet-50',
    description: '经典的UOM(单位量纲)剥离分配阵列。将高于整托的大订单切割，满托部分直接跨楼层打向高架存储库下架；打散的尾数则路由给底层拣货面完成。',
    tags: ['整散分离', 'UOM圆整', '保护拣货面'],
    preset: {
      category: 'ALLOCATION' as const,
      name: '整托与尾数切分分配策略',
      scenario: '处理包含数百件商品的大单时，避免底部货架（拣选面）被单笔大单顺间击穿缺货。',
      rules: [
        {
          id: 'rule-tpl-uom-1',
          name: '满托部分去高架存储区',
          enabled: true,
          matchingCriteria: [{ id: 'm-uom-1', field: '需求量', operator: '>=', value: '一托' }],
          steps: [
            {
              id: 'st-uom-1',
              name: '满载容器锁定',
              filters: [{ id: 'f-uom-1', field: '容器满载度', operator: '==', value: 'FULL_PALLET' }],
              sorters: [{ factorId: 'fact-uom-rounding', factorName: '整托圆整度', weight: 100, direction: 'DESC' as const }],
              failoverAction: 'NEXT_STEP' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        },
        {
          id: 'rule-tpl-uom-2',
          name: '零散尾数去低排拣货面',
          enabled: true,
          matchingCriteria: [{ id: 'm-uom-2', field: '剩余待分量', operator: '>', value: '0' }],
          steps: [
            {
              id: 'st-uom-2',
              name: '清除散库',
              filters: [{ id: 'f-uom-2', field: '库位属性', operator: '==', value: 'PICK_FACE' }],
              sorters: [{ factorId: 'fact-clear-bin', factorName: '清空倾向度', weight: 100, direction: 'DESC' as const }],
              failoverAction: 'ERROR_SUSPEND' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  },
  {
    id: 'TPL-WAVE-010',
    name: '【WOCR标准引擎】分组->排序->截断拆单全链路',
    icon: Scissors,
    category: 'WAVE',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    description: 'SAP EWM标准Warehouse Order Creation Rule全流程。严格执行「1.同类拣货区聚合过滤 -> 2.动线排序 -> 3.承重/体积物理限制截断包并切割新单(WO)」。避免司机跨区作业与超载。',
    tags: ['WO切割', 'Item Filter过滤', '排序与包装'],
    preset: {
      category: 'WAVE' as const,
      name: '拣配WOCR分拣打包全链路',
      scenario: '完全复刻大型物流软件的核心引擎。第一步按活动区(AA)分组，第二步计算最优物理拣货短路线(动线排序)，第三步按托盘的最大容积和承重来阻断并切出新WO单。',
      rules: [
        {
          id: 'rule-tpl-wocr-pipe',
          name: '标准三段式WOCR发单逻辑',
          enabled: true,
          matchingCriteria: [{ id: 'm-wocr-pal', field: '作业环节', operator: '==', value: 'PICKING(拣配)' }],
          steps: [
            {
              id: 'st-wocr-g1',
              name: '阶段1: 任务过滤与同组聚合 (Item Filter & Grouping)',
              stepType: 'TRANSFORM',
              inputSubject: 'ORDER_LINE',
              outputSubject: 'ORDER_LINE',
              action: 'VALIDATE',
              filters: [
                { id: 'f-wocr-aa', field: '作业活动区', operator: '==', value: '当前绑定作业区' },
                { id: 'f-wocr-cg', field: '集货组', operator: '==', value: '同组聚合', logicalOperator: 'AND' as const }
              ],
              sorters: [], // 此阶段仅聚合
              failoverAction: 'PIPELINE_NEXT' as const,
              flowControl: 'CONTINUE' as const
            },
            {
              id: 'st-wocr-s1',
              name: '阶段2: 拣货动线全局排序 (Sort Rules)',
              stepType: 'SELECT',
              inputSubject: 'ORDER_LINE',
              outputSubject: 'ORDER_LINE',
              action: 'RECOMMEND',
              filters: [],
              sorters: [{ factorId: 'fact-route', factorName: '最优动线距离', weight: 100, direction: 'ASC' as const }],
              failoverAction: 'PIPELINE_NEXT' as const,
              flowControl: 'CONTINUE' as const
            },
            {
              id: 'st-wocr-l1',
              name: '阶段3: 物理限制截断与拆箱拆单 (Limits)',
              stepType: 'SELECT',
              inputSubject: 'ORDER_LINE',
              outputSubject: 'ORDER_LINE',
              action: 'SPLIT',
              filters: [
                { id: 'f-wocr-vol', field: 'WO累计体积', operator: '<=', value: '托盘极限可用容积' },
                { id: 'f-wocr-wt', field: 'WO累计重量', operator: '<=', value: '载具额定承载(kg)', logicalOperator: 'AND' as const }
              ],
              sorters: [{ factorId: 'fact-wo-pallet-split', factorName: '装载限制阀门(触线生成新WO)', weight: 100, direction: 'DESC' as const }],
              failoverAction: 'SPLIT_NEW_WO' as const,
              flowControl: 'TERMINATE' as const
            }
          ]
        }
      ]
    }
  }
];

export default function TemplateLibrary({ onUseTemplate, onOpenHelp }: TemplateLibraryProps) {
  return (
    <div className="p-8 pb-16 bg-theme-bg min-h-[calc(100vh-60px)] font-sans text-theme-ink flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2">行业标杆规则模板库</h1>
            <p className="text-theme-muted text-[13px] max-w-2xl leading-relaxed">
              基于先进的一盘货(Omnichannel)、自动化冷链、智能波次算法沉淀的开箱即用行业级 WMS 策略配置。您可以直接克隆下方的经典商业最佳实践应用到您自营的仓网中去。
            </p>
          </div>
          <button 
            onClick={onOpenHelp}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 text-[12px] font-bold hover:bg-blue-100 transition-colors shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" /> 模板逻辑套件说明
          </button>
        </header>

        {/* Global Template Logic Guide */}
        <div className="mb-8 p-5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl text-white flex items-start gap-4 shadow-xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 relative z-10">
            <h4 className="text-[14px] font-bold tracking-wide uppercase opacity-90">模板设计规范：行业蓝图与参数化克隆</h4>
            <div className="grid grid-cols-2 gap-8 mt-3">
              <div className="text-[12px] text-white/60 leading-relaxed">
                <b className="text-white/80 block mb-1 underline decoration-indigo-500/50 underline-offset-4">基于蓝图的快速部署</b>
                模板由资深行业解决方案专家设计，内置了符合医药 GSP、生鲜冷流等规范的 <b>专家级因子组合</b>，确保基础逻辑零误差。
              </div>
              <div className="text-[12px] text-white/60 leading-relaxed">
                <b className="text-white/80 block mb-1 underline decoration-indigo-500/50 underline-offset-4">参数热重载与隔离</b>
                点击“应用”后，对应逻辑会完整拷贝至您的私有空间。您可以独立修改其中的 <b>阈值细节</b> 而不影响全局基准模板。
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {templates.map(tpl => (
            <Card key={tpl.id} className="p-0 overflow-hidden flex flex-col group border-theme-border hover:border-theme-primary/30 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] bg-theme-card">
              <div className="p-6 flex flex-col h-full relative">
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-current to-transparent opacity-[0.03] rounded-bl-[100%] ${tpl.color}`} />
                
                <div className="flex items-start gap-4 mb-3 relative z-10">
                  <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0 ${tpl.bgColor} ${tpl.color}` }>
                     <tpl.icon className="w-6 h-6 stroke-2" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base text-theme-ink">{tpl.name}</h3>
                      <Badge variant="neutral" className={`${tpl.color} border-current bg-white px-1.5 py-0 border`}>
                        {tpl.category}
                      </Badge>
                    </div>
                    <div className="text-[12px] font-mono text-theme-muted opacity-80">ID: {tpl.id}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4 relative z-10 mt-1">
                  {tpl.tags.map(tag => (
                    <span key={tag} className="text-[11px] bg-[#F2F2F7] text-theme-muted px-2 py-0.5 rounded-[4px] border border-[#E5E5EA]">
                      # {tag}
                    </span>
                  ))}
                </div>

                <p className="text-theme-muted text-[13px] leading-relaxed mb-6 flex-1 relative z-10">
                  {tpl.description}
                </p>

                <div className="pt-4 border-t border-theme-border mt-auto relative z-10">
                  <Button 
                     variant="outline" 
                     className="w-full justify-center group-hover:bg-theme-ink group-hover:text-white group-hover:border-theme-ink transition-colors"
                     onClick={() => onUseTemplate(tpl.preset)}
                  >
                     套用该架构并开始定制
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

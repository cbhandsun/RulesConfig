import React from 'react';
import { X, BookOpen, Layers, GitBranch, Zap, ChevronDown, PlusCircle, Database, LayoutGrid, ShieldAlert, History, Share2, ClipboardList, Box } from 'lucide-react';
import { Button } from './ui';

interface StrategyHelpProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: 'DASHBOARD' | 'EDITOR' | 'TEMPLATES' | 'LOGS' | 'FACTORS' | 'RULES';
}

export default function StrategyHelp({ isOpen, onClose, currentView }: StrategyHelpProps) {
  if (!isOpen) return null;

  const getHelpContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Box className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">架构原理解析：三层决策塔</h4>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                参考 Manhattan Active WM 与 Blue Yonder 的设计，系统采用了高度解耦的<b>「策略 ➔ 序列 ➔ 维度」</b>三层架构，以应对极复杂的全渠道物流场景：
              </p>
              
              <div className="space-y-4 mt-6">
                 {/* Tier 1 */}
                 <div className="p-4 bg-slate-900 rounded-2xl text-white relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/30 transition-all"></div>
                   <div className="flex items-center gap-2 mb-2">
                      <LayoutGrid className="w-4 h-4 text-blue-400" />
                      <span className="text-[13px] font-bold">L1: 业务策略场景 (Strategy Scenario)</span>
                   </div>
                   <p className="text-[11px] text-white/60">
                     <b>入口层</b>：定义业务的大背景，如“生鲜入库”。它决定了整个管线的准入门槛。
                   </p>
                 </div>

                 {/* Tier 2 */}
                 <div className="p-4 bg-blue-600 rounded-2xl text-white relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                   <div className="flex items-center gap-2 mb-2">
                      <GitBranch className="w-4 h-4 text-blue-200" />
                      <span className="text-[13px] font-bold">L2: 寻址流水线 (Search Stream)</span>
                   </div>
                   <p className="text-[11px] text-white/80">
                     <b>执行层</b>：编辑器顶部的 <b>Waterfall 链路</b>。定义了多个“维度”的先后执行顺序与降级逻辑（D1 ➔ D2 ➔ D3）。
                   </p>
                 </div>

                 {/* Tier 3 */}
                 <div className="p-4 bg-white border border-blue-200 rounded-2xl relative overflow-hidden group">
                   <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <span className="text-[13px] font-bold text-slate-800">L3: 业务逻辑维度 (Strategic Dimension)</span>
                   </div>
                   <p className="text-[11px] text-slate-500 italic">
                     <b>原子层</b>：链路上的<b>规则卡片节点</b>。每个节点负责一个具体的管控逻辑（如 QA、温控、物理约束）。每个维度可以包含多个硬性约束与业务偏好。
                   </p>
                 </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Box className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">深度澄清：寻址序列 vs 业务维度</h4>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-[12px] text-amber-900 leading-relaxed">
                <p className="font-bold mb-2">为什么有时会觉得这两个概念混淆？</p>
                在传统的简单 WMS 中，往往一个寻址序列就对应一个固定的逻辑。但在 MAWM 等现代系统中：
                <ul className="list-disc ml-4 space-y-1 mt-2">
                  <li><b>筛选优选序列 (Sequence)</b> 是执行的<b>「管道」</b>。它决定了系统失败后如何从 D1 降级到 D2。它是动态的关系集合。</li>
                  <li><b>业务评分维度 (Dimension)</b> 是执行的<b>「执行动作节点」</b>。它是静态的逻辑模块，可以被复用。</li>
                </ul>
                <p className="mt-2 text-slate-500 italic">
                  * 因此，顶部的可视化链路是“寻址序列”，而链路上的每一个“节点”都是一个“业务维度”。
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Box className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">执行因子详述：控制塔内部逻辑</h4>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                每一个业务维度节点内部，由以下四类控制因子聚合而成，形成最终的调度指令：
              </p>
              
              <div className="space-y-3 mt-4 relative before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-slate-200">
                 {/* Tier 1 */}
                 <div className="relative pl-10">
                    <div className="absolute left-[11px] top-1 w-2 h-2 rounded-full bg-blue-600 border-[3px] border-white ring-2 ring-blue-100"></div>
                    <h5 className="text-[12px] font-bold text-slate-800">控制项 A: 策略矩阵 (Strategy Matrix)</h5>
                    <p className="text-[11px] text-slate-500 mt-1">触发因子。系统根据业务快照自动命中场景门槛。</p>
                 </div>
                 
                 {/* Tier 2 */}
                 <div className="relative pl-10">
                    <div className="absolute left-[11px] top-1 w-2 h-2 rounded-full bg-indigo-500 border-[3px] border-white ring-2 ring-indigo-100"></div>
                    <h5 className="text-[12px] font-bold text-slate-800">控制项 B: 流控指令 (Flow Directions)</h5>
                    <p className="text-[11px] text-slate-500 mt-1">熔断指令。定义了异常时的“下一步”路由逻辑。</p>
                 </div>
                 
                 {/* Tier 3 */}
                 <div className="relative pl-10">
                    <div className="absolute left-[11px] top-1 w-2 h-2 rounded-full bg-emerald-500 border-[3px] border-white ring-2 ring-emerald-100"></div>
                    <h5 className="text-[12px] font-bold text-slate-800">控制项 C: 硬性约束 (Hard Constraints / Filters)</h5>
                    <p className="text-[11px] text-slate-500 mt-1">物理红线。如温度带、重量、高度约束。不满足即被剔除。</p>
                 </div>
                 
                 {/* Tier 4 */}
                 <div className="relative pl-10 pb-2">
                    <div className="absolute left-[11px] top-1 w-2 h-2 rounded-full bg-orange-500 border-[3px] border-white ring-2 ring-orange-100"></div>
                    <h5 className="text-[12px] font-bold text-slate-800">控制项 D: 业务偏好评估 (Optimizers / Sorters)</h5>
                    <p className="text-[11px] text-slate-500 mt-1">权重算法。如最短动线、最先出库。负责在可达资源中择优。</p>
                 </div>
              </div>
            </section>
          </>
        );
      case 'EDITOR':
        return (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Layers className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">架构层次：从场景到原子动作</h4>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                在编辑器中，您正在通过三层嵌套结构来构建复杂的自动化逻辑：
              </p>
              
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <LayoutGrid className="w-4 h-4 text-slate-400" />
                    <span className="text-[12px] font-bold text-slate-800">1. 策略 (Strategy) - 业务场景</span>
                  </div>
                  <p className="text-[11px] text-slate-500">顶层容器，定义如“生鲜采购入库”。它决定了何时触发这套逻辑。</p>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="w-4 h-4 text-blue-500" />
                    <span className="text-[12px] font-bold text-blue-800">2. 规则 (Rule) - 业务维度/阶段</span>
                  </div>
                  <p className="text-[11px] text-blue-600/70">横向流水线上的卡片。代表一个决策阶段（如：先看温控，再看动线）。支持降级流转。</p>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    <span className="text-[12px] font-bold text-indigo-800">3. 步骤 (Step) - 原子执行动作</span>
                  </div>
                  <p className="text-[11px] text-indigo-600/70">规则内部的每一行。包含具体的“硬性过滤”与“软性评分”。是最终计算出结果的原子单元。</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Layers className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">执行编排：筛选与优选漏斗</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[11px] font-black text-slate-400 mb-2 uppercase tracking-tight">第一层：硬性约束法则</div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">通过 <b>Constraints(Filters)</b> 筛选。只有满足物理区、状态、属性等条件的候选者才能进入评估区。</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="text-[11px] font-black text-blue-400 mb-2 uppercase tracking-tight">第二层：多维算法优化</div>
                  <p className="text-[11px] text-blue-600 mt-2 leading-relaxed">通过 <b>Optimizers(Sorters)</b> 因子加权。在合格资源中，根据动线、周转率等因子评分择优。</p>
                </div>
              </div>
            </section>
            
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-orange-500">
                <GitBranch className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">执行流控制状态 (Flow Control)</h4>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                每个序列规则 (Rule) 卡片底部都会有一个反映其阶段执行意图的流控降级标签，它决定了系统在当前阶段处理完毕后的流转去向：
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-xl hover:bg-orange-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-600 rounded">拦截/终结节点 (TERMINATE)</span>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-relaxed">
                    <b>短路阻断效应：</b>这是绝大部分业务控制流的常态。当引擎在这个节点匹配并执行成功（例如：成功计算出有余量的可行库位），整个策略执行上下文将<b>立刻跳出并返回优选结果</b>（Short-Circuit）。排在它后面的次优级降级序列不会被执行。
                  </p>
                </div>
                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-colors">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-600 rounded">流转/过渡节点 (CONTINUE)</span>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-relaxed">
                    <b>管道流转组合：</b>当前节点不作为拦截层。它完成过滤和打分后，会将幸存的候选资源集合（如：所有1层楼的库位）<b>全量透传给下一个序列节点</b>继续加工。非常适合在巨量数据下做“预过滤清洗”。
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <LayoutGrid className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">03. 策略输出产物 (Output Payload)</h4>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                策略执行的最终产物是 <b>作业指令集 (Work Instructions)</b>。
              </p>
              <div className="bg-slate-900 rounded-2xl p-4 shadow-inner">
                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                  <span className="text-[10px] font-mono text-white/40 uppercase">JSON Result Preview</span>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  </div>
                </div>
                <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed overflow-x-auto">
{`{
  "instructionId": "WI-20240417-001",
  "action": "PICK_AND_MOVE",
  "assignments": [
    { "loc": "A-10-01", "qty": 50, "rank": 1 },
    { "loc": "B-05-02", "qty": 20, "rank": 2 }
  ],
  "routingPath": ["ZONE_A", "GATE_4"],
  "meta": { "execTime": "45ms", "rule": "FIFO_PRIO" }
}`}
                </pre>
              </div>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                系统会将编排好的逻辑转化为上述结构化报文，推送至 <b>WCS (设备控制系统)</b> 或 <b>PDA 终端</b>，直接驱动物理作业。
              </p>
            </section>
          </>
        );
      case 'RULES':
        return (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <ShieldAlert className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">冲突破局：全局维度的高优先级控制</h4>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                独立规则库（Independent Rules / Global Dimensions）存在的意义是为了解决<strong>跨策略、高优级的横向业务管控</strong>。
              </p>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <ul className="space-y-3">
                  <li className="flex gap-3 text-[12px] text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">1</span>
                    <span><b>凌驾于普通大策略之上</b>：例如“防爆隔离”，它比通用的上架连招更为重要，一经触发，可执行 <strong className="text-red-500">满足即跳出 (TERMINATE)</strong> 来阻断后续逻辑。</span>
                  </li>
                  <li className="flex gap-3 text-[12px] text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">2</span>
                    <span><b>一次编写，多处挂载</b>：您可以将独立维度的逻辑编写好后，将其无缝挂载插拔到任意“大波次”或者“存货作业”场景中。</span>
                  </li>
                </ul>
              </div>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <History className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">节点级参数在独立库为什么被锁定？</h4>
              </div>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                独立规则在库中只是一个<span className="text-emerald-600 font-bold">逻辑模板</span>。在它被挂载进真正的业务大场景（如“生鲜入库”）之前，系统并不知道它最终所处的物理上下文。
                因此，若需深度调整其节点刻度参数（例如要求抽检的百分比等），请在具体的大策略编辑器中去修改。
              </p>
            </section>
          </>
        );
      case 'FACTORS':
        return (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-purple-600">
                <Database className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">计算因子：核心度量</h4>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                因子是算法编排的最小原子，分为三个核心维度：
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-fuchsia-50 rounded-xl border border-fuchsia-100">
                  <span className="text-[12px] font-bold text-fuchsia-700">物理属性 (PHYSICAL)</span>
                  <span className="text-[10px] text-fuchsia-400">长/宽/高/温层</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <span className="text-[12px] font-bold text-blue-700">逻辑属性 (LOGICAL)</span>
                  <span className="text-[10px] text-blue-400">周转率/ABC分类/动线顺序</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <span className="text-[12px] font-bold text-orange-700">动态公式 (DYNAMIC)</span>
                  <span className="text-[10px] text-orange-400">实时库存水位/设备负载</span>
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-700">
                <Zap className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">绑定对象约束</h4>
              </div>
              <p className="text-[12px] text-slate-500 leading-relaxed">
                每个因子必须绑定一个 <b>Target Object</b>（如库位、库存、AGV）。在编排策略时，系统会自动过滤不兼容的因子。
              </p>
            </section>
          </>
        );
      case 'TEMPLATES':
        return (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <LayoutGrid className="w-5 h-5" />
                <h4 className="text-[14px] font-black uppercase tracking-wider">行业最佳实践模板</h4>
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                模板库沉淀了医药 GSP、冷链物流、电商大促等典型业务场景的 <b>标准逻辑蓝图</b>。
              </p>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-start gap-3">
                   <Share2 className="w-4 h-4 text-indigo-600 mt-0.5" />
                   <p className="text-[11px] text-indigo-700 font-medium"><b>克隆模式</b>：快速生成私有策略，并根据自身仓库布局进行微调参数。</p>
                </div>
                <div className="flex items-start gap-3">
                   <ClipboardList className="w-4 h-4 text-indigo-600 mt-0.5" />
                   <p className="text-[11px] text-indigo-700 font-medium"><b>参数预设</b>：模板自带了专家级的过滤器阈值，大大缩短了冷启动时间。</p>
                </div>
              </div>
            </section>
          </>
        );
      default:
        return <p className="text-slate-500 italic">暂无该模块的详细逻辑说明。</p>;
    }
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'DASHBOARD': return '业务策略管理逻辑';
      case 'EDITOR': return '策略编排与控制';
      case 'RULES': return '业务序列降级模式与优先级';
      case 'FACTORS': return '算法因子度量体系';
      case 'TEMPLATES': return '行业模板应用指南';
      default: return '策略系统操作指南';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[480px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-theme-border flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold leading-none">{getViewTitle()}</h3>
              <p className="text-[10px] text-white/50 mt-1.5 uppercase font-black tracking-widest">Logic Guide - {currentView}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {getHelpContent()}

          {/* User Feedback Callout */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-center">
             <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-slate-400" />
             </div>
             <p className="text-[14px] font-bold text-slate-800 mb-2">需要针对性业务咨询？</p>
             <p className="text-[12px] text-slate-500 leading-relaxed mb-4">如果您对复杂的业务逻辑（如多级库存分配或动态波次平衡）有具体疑问，请联系系统架构师。</p>
             <Button variant="outline" className="w-full h-11 border-slate-300 text-slate-600 rounded-xl" onClick={onClose}>
               我已了解
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

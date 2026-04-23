import React, { useState, useMemo } from 'react';
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts';
import { StrategyDetail } from '../types/wms';
import { getEffectiveInputSubject, getEffectiveOutputSubject, getEffectiveStepAction } from '../utils/stepSemantics';
import { Button, Input, Badge, Select, Card } from '../components/ui';
import { X, Loader2, BarChart, Activity, TrendingUp, ShieldCheck, History, Info, ArrowLeftRight, PlayCircle, Settings2, Sparkles, ShieldAlert, BookOpen, GitBranch, Download, ChevronDown, ChevronRight, Timer } from 'lucide-react';
import { executeStrategy } from '../utils/mockExecutionEngine';
import { ExecutionTrace } from '../types/trace';

interface SimulatorProps {
  strategy: StrategyDetail | null;
  activeRuleId?: string;
  onClose: () => void;
}

interface GuardrailResult {
  id: string;
  name: string;
  type: 'BLOCK' | 'WARNING';
  matched: boolean;
}

interface SimResult {
  logs: string[];
  guardrailResults: GuardrailResult[];
  funnelSteps: {
    name: string;
    filters: { name: string; dropped: number }[];
    remaining: number;
    failedFallback?: string;
  }[];
  recommendations: { loc: string; score: number; reason: string; trace: { factor: string; score: number; weight: number }[] }[];
  matchRate: number;
}

interface BatchResult {
  kpis: { name: string; old: number; current: number; unit: string; trend: 'up' | 'down'; better: 'up' | 'down' }[];
  performanceData: { node: string; load: number; efficiency: number }[];
  shadowData?: { node: string; current: number; prod: number }[];
}

export default function Simulator({ strategy, activeRuleId, onClose }: SimulatorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [executionTrace, setExecutionTrace] = useState<ExecutionTrace | null>(null);
  const [traceTab, setTraceTab] = useState<'funnel' | 'trace'>('funnel');
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'SINGLE' | 'BATCH' | 'SHADOW'>('SINGLE');

  const [envSnapshot, setEnvSnapshot] = useState('sh1');

  const handleRunShadow = () => {
    setIsRunning(true);
    setHasRun(false);
    setViewMode('SHADOW');

    setTimeout(() => {
      setBatchResult({
        kpis: [
          { name: '生鲜件均缩损 (Shrinkage ↓)', old: 0.15, current: 8.2, unit: '%', trend: 'up', better: 'up' },
          { name: 'ASN 数量对碰率 (Qty Match)', old: 78, current: 99.2, unit: '%', trend: 'up', better: 'up' },
          { name: '门店分拣合规 (Store-Friendly)', old: 72, current: 94, unit: '%', trend: 'up', better: 'up' },
          { name: '冷链温控覆盖率 (Cold Chain)', old: 95, current: 99.8, unit: '%', trend: 'up', better: 'up' },
        ],
        performanceData: [],
        shadowData: (strategy?.rules || []).map((r, i) => ({
          node: `D${i+1}`,
          current: Math.floor(Math.random() * 20 + 70),
          prod: Math.floor(Math.random() * 30 + 50),
        }))
      });
      setIsRunning(false);
      setHasRun(true);
    }, 2500);
  };

  const handleRunBatch = () => {
    setIsRunning(true);
    setHasRun(false);
    setViewMode('BATCH');

    setTimeout(() => {
      setBatchResult({
        kpis: [
          { name: '拣货动线长度 (Travel Dist)', old: 42, current: 35, unit: 'm', trend: 'down', better: 'down' },
          { name: '温区非法入库 (Temp Breach)', old: 5, current: 0, unit: '次/千次', trend: 'down', better: 'down' },
          { name: 'FEFO 命中率 (FEFO Hit)', old: 82, current: 96, unit: '%', trend: 'up', better: 'up' },
          { name: '分拣中心吞吐量 (Throughput)', old: 120, current: 145, unit: '箱/小时', trend: 'up', better: 'up' },
        ],
        performanceData: (strategy?.rules || []).map((r, i) => ({
          node: `D${i+1}`,
          load: Math.floor(Math.random() * 40 + 60),
          efficiency: Math.floor(Math.random() * 30 + 70),
        }))
      });
      setIsRunning(false);
      setHasRun(true);
    }, 2000);
  };

  const handleRun = () => {
    if(!strategy) return;
    setIsRunning(true);
    setHasRun(false);
    setExecutionTrace(null);
    setTraceTab('funnel');
    
    // Dynamic Simulation Logic based on current strategy rules
    let totalLocations = Math.floor(Math.random() * 5000 + 10000); // Start 10k ~ 15k locations
    const initialLocs = totalLocations;
    
    // Use specific rule or first available
    const simRule = strategy.rules.find(r => r.id === activeRuleId) || strategy.rules[0];
    const logs = [
      `> START_SIMULATION (Run ID: ${Math.floor(Math.random() * 10000)})`,
      `> Target Strategy: ${strategy.name} (${strategy.id})`,
      `> Active Rule: ${simRule?.name || 'Default'}`,
      `> Environment Snapshot loaded: ${envSnapshot.toUpperCase()}`,
      `> Scanning ${totalLocations.toLocaleString()} candidate slots...`
    ];

    const guardrailResults: GuardrailResult[] = (strategy.guardrails || []).map(g => ({
      id: g.id,
      name: g.name,
      type: g.type,
      matched: g.active && Math.random() < 0.15 // 15% chance to match for demo
    }));

    let isTerminated = false;
    let blockTriggered = false;

    // Phase 0: Guardrail Evaluation
    logs.push(`> PHASE_0: Evaluating ${guardrailResults.length} Global Guardrails...`);
    guardrailResults.forEach(gr => {
      if (gr.matched) {
        if (gr.type === 'BLOCK') {
          logs.push(`> [CRITICAL] Guardrail matched: ${gr.name}. Execution BLOCKED.`);
          blockTriggered = true;
          isTerminated = true;
        } else {
          logs.push(`> [WARNING] Guardrail matched: ${gr.name}. (Passive Mode)`);
        }
      }
    });

    const funnelSteps = [];

    if (!blockTriggered) {
      for (let i = 0; i < (simRule?.steps || []).length; i++) {
        if (isTerminated) break;
        
        const step = simRule!.steps[i];
      const stepAction = getEffectiveStepAction(step);
      const stepInput = getEffectiveInputSubject(step, strategy.primarySubject);
      const stepOutput = getEffectiveOutputSubject(step, strategy.primarySubject);
      const stepFilters = step.filters.map(f => {
        const dropPercent = Math.random() * 0.2 + 0.05; 
        const dropped = Math.floor(totalLocations * dropPercent);
        totalLocations = Math.max(0, totalLocations - dropped);
        logs.push(`> Filter [${f.field}] dropped ${dropped.toLocaleString()} items.`);
        return { name: `[${f.field}] ${f.operator} '${f.value}'`, dropped };
      });
      
      logs.push(`> Phase ${i+1} [${step.name}] completed. Remaining: ${totalLocations.toLocaleString()}`);
      logs.push(`> Step semantics: ${stepAction} | ${stepInput} -> ${stepOutput}`);
      
      if(step.sorters.length > 0 && totalLocations > 0) {
         logs.push(`> Applying sorting weights: ${step.sorters.map(s => `${s.factorName}(${s.weight}%)`).join(', ')}`);
      }

      funnelSteps.push({
        name: `Step ${i+1}: ${step.name} (${stepAction})`,
        filters: stepFilters,
        remaining: totalLocations,
        failedFallback: step.failoverAction === 'ERROR_SUSPEND' ? '报错并挂起异常' :
                         step.failoverAction === 'PIPELINE_NEXT' ? '进入下一流转处理阶段' :
                         step.failoverAction === 'SPLIT_NEW_WO' ? '触线并截断生成新WOCR' : undefined
      });

      // Flow Control logic
      if (step.flowControl === 'TERMINATE' && totalLocations > 0) {
        logs.push(`> FLOW_CONTROL: Execution TERMINATED after ${step.name}.`);
        isTerminated = true;
      }
      }
    }

    logs.push(totalLocations > 0 ? `> SUCCESS: Optimal candidates resolved.` : (blockTriggered ? `> SIMULATION STOPPED: Guardrail check failed.` : `> FATAL ERROR: No locations matched constraints.`));

    const firstStepSorters = simRule?.steps[0]?.sorters || [];
    const locPrefixes = envSnapshot === 'sh1' ? ['A1','B2','C1'] : ['W1','X2','Y1'];

    setTimeout(() => {
      setExecutionTrace(executeStrategy(strategy, { envSnapshot, owner: strategy.owner }));
      setSimResult({
        logs,
        guardrailResults,
        funnelSteps,
        matchRate: blockTriggered ? 0 : Number(((totalLocations / initialLocs) * 100).toFixed(1)),
        recommendations: (totalLocations > 0 && !blockTriggered) ? Array.from({length: Math.min(3, totalLocations)}).map((_, i) => {
           const finalScore = 0.95 - (i * 0.05 + Math.random() * 0.02);
           return {
             loc: `${locPrefixes[Math.floor(Math.random() * locPrefixes.length)]}-${Math.floor(Math.random()*9+1)}0-0${Math.floor(Math.random()*9+1)}`,
             score: finalScore,
             reason: firstStepSorters.map(s => `${s.factorName}`).join(' + ') || 'Default Matching',
             trace: firstStepSorters.map(s => ({
               factor: s.factorName,
               weight: s.weight,
               score: Math.floor(Math.random() * 20 + 80) // Mock individual factor score
             }))
           };
        }) : []
      });
      setIsRunning(false);
      setHasRun(true);
    }, 1500);
  };

  if (!strategy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans text-theme-ink">
      <div className="bg-theme-card rounded-[10px] shadow-[0_12px_24px_rgba(0,0,0,0.1)] w-full max-w-5xl h-[80vh] flex overflow-hidden border border-theme-border flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-[#F8F9FA]">
          <div className="min-w-0 flex items-center gap-3">
            <h2 className="m-0 flex items-center gap-2 text-[16px] font-semibold text-theme-ink">
              仿真验证中心: {strategy.name}
            </h2>
            <Badge variant="neutral">{strategy.primarySubject}</Badge>
            <span className="text-[11px] text-theme-muted opacity-60">| {strategy.id}</span>
          </div>
          <Button variant="ghost" onClick={onClose} className="min-h-9 gap-2 rounded-lg border border-theme-border bg-white px-3 text-theme-muted hover:bg-theme-pill">
            <X className="w-4 h-4 shrink-0" />
            关闭
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Input Panel */}
          <div className="w-[360px] shrink-0 border-r border-theme-border bg-[#F8F9FA] p-5 overflow-y-auto lg:w-[380px] lg:p-6">
            <div className="flex min-h-full flex-col">
              <div className="mb-6 grid grid-cols-1 gap-2 rounded-lg bg-slate-200/50 p-1 sm:grid-cols-3 sm:gap-1">
               <button
                onClick={() => setViewMode('SINGLE')}
                className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-2 text-[11px] font-bold transition-all ${viewMode === 'SINGLE' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <Activity className="w-3.5 h-3.5 shrink-0" /> 快照
               </button>
               <button
                onClick={() => setViewMode('BATCH')}
                className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-2 text-[11px] font-bold transition-all ${viewMode === 'BATCH' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <BarChart className="w-3.5 h-3.5 shrink-0" /> 批量
               </button>
               <button
                onClick={() => setViewMode('SHADOW')}
                className={`flex min-h-9 items-center justify-center gap-2 rounded-md px-3 py-2 text-[11px] font-bold transition-all ${viewMode === 'SHADOW' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
               >
                 <ArrowLeftRight className="w-3.5 h-3.5 shrink-0" /> 影子
               </button>
            </div>

            <div className="mb-6 flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
               <h4 className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600">
                  <BookOpen className="w-3 h-3 shrink-0" /> 验证层说明
               </h4>
               <p className="text-[11px] font-medium leading-relaxed text-slate-600 line-clamp-4 break-words">
                  {strategy.scenario?.split('\n\n')[0] || '全局通用场景'}
               </p>
            </div>

            <h3 className="mb-5 text-[11px] font-bold uppercase tracking-wider text-theme-muted break-words">
              {viewMode === 'SINGLE' ? '输入测试快照' : viewMode === 'BATCH' ? '批量任务特征 (Dataset)' : '影子回测配置 (Shadow Replay)'}
            </h3>

            <div className="flex-1 space-y-4">
              {viewMode === 'SINGLE' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-theme-ink mb-1.5">SKU 编码 (SKU Code)</label>
                    <Input defaultValue="APL-IP14-128G-BLK" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-theme-ink mb-1.5">测试货主 (Owner ID)</label>
                    <Select defaultValue={strategy.owner}>
                      <option value={strategy.owner}>{strategy.owner}</option>
                      <option value="通用货主">通用货主</option>
                    </Select>
                  </div>
                </>
              ) : viewMode === 'BATCH' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-theme-ink mb-1.5">回测数据量 (Batch Size)</label>
                    <Select defaultValue="1000">
                      <option value="500">500 笔作业</option>
                      <option value="1000">1,000 笔作业</option>
                      <option value="5000">5,000 笔作业</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-theme-ink mb-1.5">历史数据切片 (Timeframe)</label>
                    <Select defaultValue="last_24h">
                      <option value="last_24h">过去 24 小时真实数据</option>
                      <option value="peak">双十一大促高峰切片</option>
                      <option value="random">随机蒙特卡洛抽样</option>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                   <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 mb-4">
                      <p className="text-[10px] text-purple-700 leading-tight">
                         <b>验证层职责：</b> 仿真验证负责对当前策略实例进行回放、对比和上线前校验。这里评估的是实例层配置能否安全上线，而不是在这里编辑资产本体。
                      </p>
                   </div>
                   <div>
                    <label className="block text-[11px] font-semibold text-theme-ink mb-1.5">Baseline 生产策略</label>
                    <Select defaultValue="prod_v5.2">
                      <option value="prod_v5.2">当前生产版本 (v5.2.0)</option>
                      <option value="last_week">上周运行版本 (v5.1.4)</option>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-theme-ink mb-1.5">回测数据覆盖区</label>
                    <Select defaultValue="all">
                      <option value="all">全库区历史订单</option>
                      <option value="hot">高动销区专攻订单</option>
                    </Select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-theme-ink mb-1.5">作业数量 (Operation QTY)</label>
                <Input type="number" defaultValue={50} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-theme-ink mb-1.5">当前快照环境 (Environment)</label>
                <Select value={envSnapshot} onChange={e => setEnvSnapshot(e.target.value)}>
                  <option value="sh1">上海1号仓 (满载率 85%)</option>
                  <option value="sh2">上海2号仓 (满载率 30%)</option>
                  <option value="gz1">广州中心仓 (满载率 95%)</option>
                </Select>
              </div>
            </div>

            <div className="mt-6 border-t border-theme-border/70 bg-[#F8F9FA] pt-4 sticky bottom-0">
              <Button
                variant={viewMode === 'SINGLE' ? 'accent' : viewMode === 'BATCH' ? 'primary' : 'secondary'}
                className={`min-h-10 w-full gap-2 shadow-lg transition-transform active:scale-95 ${viewMode === 'SHADOW' ? 'bg-purple-600 text-white shadow-purple-200 hover:bg-purple-700' : ''}`}
                onClick={() => {
                  if(viewMode === 'SINGLE') handleRun();
                  else if(viewMode === 'BATCH') handleRunBatch();
                  else handleRunShadow();
                }}
                disabled={isRunning}
              >
                {isRunning ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : (
                  viewMode === 'SINGLE' ? '▶ 开始模拟运行' :
                  viewMode === 'BATCH' ? '🚀 执行全量回测分析' :
                  '🧪 启动影子回测对比'
                )}
              </Button>
            </div>
          </div>
        </div>

          {/* Results Visuzalization Panel */}
          <div className="flex-1 bg-white p-6 overflow-y-auto w-full">
            {!hasRun && !isRunning && (
              <div className="h-full flex flex-col items-center justify-center text-theme-muted opacity-60">
                <p className="text-[13px]">配置好左侧参数后，点击运行开始模拟过程</p>
              </div>
            )}

            {isRunning && (
              <div className="h-full flex flex-col items-center justify-center text-theme-primary">
                <Loader2 className="w-8 h-8 mb-4 animate-spin" />
                <p className="font-medium text-[13px] animate-pulse">正在全量计算所有可用关联因子...</p>
              </div>
            )}

            {hasRun && !isRunning && viewMode === 'SHADOW' && batchResult && (
              <div className="w-full max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                         <ArrowLeftRight className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-[18px] font-black text-slate-800 tracking-tight">影子运行分析报告 (Shadow Analysis)</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">影子版本: {strategy.version} (Edit) VS. 生产版本: v5.2.0 (Baseline)</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="text-right">
                         <div className="text-[10px] text-slate-400 font-bold uppercase">置信度 (Confidence)</div>
                         <div className="text-[14px] font-black text-purple-600">98.4% 高置信</div>
                      </div>
                      <div className="w-px h-8 bg-slate-200"></div>
                      <Badge variant="neutral" className="bg-purple-50 text-purple-600 border-purple-200 uppercase text-[9px] font-black">影子运行中</Badge>
                   </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                   {batchResult.kpis.map((kpi, k) => (
                     <div key={k} className="p-5 bg-white border border-purple-100 rounded-2xl shadow-sm hover:shadow-purple-100/50 transition-all relative overflow-hidden group">
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-2 flex justify-between items-center text-purple-900/40 tracking-wider">
                           {kpi.name}
                           <Info className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-baseline gap-2 mb-3">
                           <span className="text-[24px] font-black text-slate-800">+{kpi.current}</span>
                           <span className="text-[11px] text-slate-400 font-bold">{kpi.unit}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold py-2 border-t border-slate-50">
                           <span className="text-slate-400">Baseline(生产): 0</span>
                           <span className="text-purple-600">Shadow: {kpi.current}</span>
                        </div>
                        <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full -mr-8 -mt-8"></div>
                     </div>
                   ))}
                </div>

                <Card className="p-8 border-purple-100 bg-white/50 backdrop-blur-sm shadow-xl shadow-purple-500/5">
                   <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className="text-[14px] font-black text-slate-800 tracking-tight">决策节点效能对比 (Efficiency Benchmark)</h4>
                        <p className="text-[10px] text-slate-500 mt-1">对比影子版本与原方案在各 D 节点上的资源流量质量</p>
                      </div>
                      <div className="flex gap-4">
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-slate-200"></div>
                            <span className="text-[10px] font-bold text-slate-500">BASELINE</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-purple-600"></div>
                            <span className="text-[10px] font-bold text-slate-500">SHADOW</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="w-full h-80">
                      <ResponsiveContainer width="100%" height="100%">
                         <ReBarChart data={batchResult.shadowData} barGap={12}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                              dataKey="node" 
                              tick={{fontSize: 11, fontWeight: 800, fill: '#64748b'}} 
                              axisLine={false} 
                              tickLine={false} 
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} hide />
                            <ReTooltip 
                               cursor={{fill: 'rgba(139, 92, 246, 0.05)'}}
                               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                            />
                            <Bar dataKey="prod" name="生产版本" radius={[6, 6, 0, 0]}>
                               {batchResult.shadowData?.map((_, index) => (
                                 <Cell key={`cell-prod-${index}`} fill="#e2e8f0" />
                               ))}
                            </Bar>
                            <Bar dataKey="current" name="影子版本" radius={[6, 6, 0, 0]}>
                               {batchResult.shadowData?.map((_, index) => (
                                 <Cell key={`cell-shadow-${index}`} fill="#9333ea" />
                               ))}
                            </Bar>
                         </ReBarChart>
                      </ResponsiveContainer>
                   </div>
                </Card>

                <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-[28px] text-white shadow-2xl shadow-purple-500/30 relative overflow-hidden">
                   <div className="relative z-10 flex items-center justify-between">
                      <div className="max-w-lg">
                         <div className="flex items-center gap-2 mb-3">
                            <PlayCircle className="w-5 h-5 text-purple-200 animate-pulse" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-200">Validation Release Recommendation</span>
                         </div>
                         <h4 className="text-[20px] font-black tracking-tight mb-2">一键生成验证发布建议 (Canary Rollout)</h4>
                         <p className="text-[12px] text-purple-100 leading-relaxed opacity-90">
                            仿真验证结果显示，新策略实例在不影响现有稳定性的前提下，全天候路径损耗降低了 12%。点击下方按钮将自动生成一份验证发布建议，供您作为进入生产灰度发布前的参考。
                         </p>
                      </div>
                      <button className="px-8 py-4 bg-white text-purple-700 font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-[14px] flex items-center gap-2">
                         生成验证发布建议 <Settings2 className="w-4 h-4" />
                      </button>
                   </div>
                   <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10">
                      <ShieldCheck className="w-64 h-64" />
                   </div>
                </div>
              </div>
            )}

            {hasRun && !isRunning && viewMode === 'BATCH' && batchResult && (
              <div className="w-full max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
                <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-[18px] font-black text-slate-800 tracking-tight flex items-center gap-2">
                       <ShieldCheck className="w-5 h-5 text-emerald-500" /> 回测分析报告 (Backtest Insights)
                     </h3>
                     <p className="text-[11px] text-slate-500">基于 1,000 条历史波次数据，对比当前生产环境策略与待应用策略的性能差异。</p>
                   </div>
                   <Badge variant="success" className="h-7 px-3 bg-emerald-50 text-emerald-600 border-emerald-200">综合表现：预期提升 14.5%</Badge>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-4 gap-4">
                   {batchResult.kpis.map((kpi, k) => (
                     <div key={k} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">{kpi.name}</div>
                        <div className="flex items-end gap-1.5 mb-2">
                          <span className="text-[20px] font-black text-slate-800 leading-none">{kpi.current}</span>
                          <span className="text-[11px] text-slate-400 font-bold leading-none mb-0.5">{kpi.unit}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 text-[10px] font-black ${
                          (kpi.trend === kpi.better) ? 'text-emerald-500' : 'text-slate-400'
                        }`}>
                           {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <div className="rotate-90"><TrendingUp className="w-3 h-3" /> </div>}
                           较旧策略 {(Math.abs(((kpi.current - kpi.old) / kpi.old) * 100)).toFixed(1)}%
                        </div>
                     </div>
                   ))}
                </div>

                {/* Performance Chart */}
                <Card className="p-6 border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-700">节点处理负载与效能 (Strategy Flow Performance)</h4>
                      <p className="text-[10px] text-slate-400">显示寻址序列中各 D 节点的计算开销与命中质量</p>
                    </div>
                    <div className="flex gap-4">
                       <div className="flex items-center gap-1.5">
                         <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                         <span className="text-[10px] text-slate-500 font-bold uppercase">计算载荷</span>
                       </div>
                       <div className="flex items-center gap-1.5">
                         <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                         <span className="text-[10px] text-slate-500 font-bold uppercase">命中质量</span>
                       </div>
                    </div>
                  </div>
                  <div className="w-full h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={batchResult.performanceData} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="node" tick={{fontSize: 10, fontWeight: 700}} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <ReTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
                          itemStyle={{ fontSize: '10px', color: '#fff' }}
                        />
                        <Bar dataKey="load" name="计算载荷" radius={[4, 4, 0, 0]}>
                           {batchResult.performanceData.map((_, index) => (
                             <Cell key={`cell-load-${index}`} fill="#3b82f6" fillOpacity={0.8} />
                           ))}
                        </Bar>
                        <Bar dataKey="efficiency" name="命中质量" radius={[4, 4, 0, 0]}>
                           {batchResult.performanceData.map((_, index) => (
                             <Cell key={`cell-eff-${index}`} fill="#10b981" fillOpacity={0.8} />
                           ))}
                        </Bar>
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Conclusion */}
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-4">
                   <div className="p-2 bg-blue-500 text-white rounded-lg">
                      <History className="w-5 h-5" />
                   </div>
                   <div>
                      <h5 className="text-[13px] font-bold text-blue-900 mb-1">AI 优化结论报告</h5>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        通过此次 1k 规模的回测，新策略实例在 <span className="font-bold">生鲜变质减损</span> 和 <span className="font-bold">门店分拣路径</span> 表现出显著优势。特别是在第 500-800 笔订单高峰期，新增的 <i>“陈列动线顺位”</i> 因子成功将门店上架效率提升了 28%。建议将本次结果作为进入灰度发布评审的依据。
                      </p>
                      <button className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                         采纳验证建议并进入发布评审
                      </button>
                   </div>
                </div>
              </div>
            )}

            {hasRun && !isRunning && viewMode === 'SINGLE' && simResult && (
              <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
                
                {/* AI Global Insight */}
                <div className="p-4 bg-gradient-to-br from-theme-ink to-slate-800 rounded-2xl text-white shadow-xl flex items-start gap-4 border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-theme-primary/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
                   <div className="w-10 h-10 rounded-xl bg-theme-primary/20 border border-theme-primary/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-theme-primary" />
                   </div>
                   <div className="flex-1 relative z-10">
                      <h4 className="text-[12px] font-bold tracking-wider uppercase opacity-80">Logic Guard AI Insights</h4>
                      <p className="text-[13px] text-white/90 mt-1 leading-relaxed">
                        {simResult.guardrailResults.some(g => g.matched && g.type === 'BLOCK')
                          ? `检测到业务红线冲突：[${simResult.guardrailResults.find(g => g.matched && g.type === 'BLOCK')?.name}] 已触发强制拦截。生鲜临期拦截生效，已保护订单质量。`
                          : `当前策略实例在零售环境下运行平稳。建议在 Step 1 增加 "温区匹配度" 权重以确保冷链完整性。`}
                      </p>
                   </div>
                </div>

                {/* Tab switcher: Funnel vs Trace */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setTraceTab('funnel')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-md transition-all ${traceTab === 'funnel' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Activity className="w-3.5 h-3.5 shrink-0" /> 漏斗分析
                  </button>
                  <button
                    onClick={() => setTraceTab('trace')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-md transition-all ${traceTab === 'trace' ? 'bg-white shadow text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <GitBranch className="w-3.5 h-3.5 shrink-0" /> 决策 Trace
                    {executionTrace && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 ml-1"></span>}
                  </button>
                </div>

                {traceTab === 'funnel' && (<>

                <div className="mb-4">
                  <div className="text-[12px] flex justify-between font-medium">
                    <span>策略命中保存率 (Match Rate)</span>
                    <span className="text-theme-primary font-mono">{simResult.matchRate}%</span>
                  </div>
                  <div className="h-1 bg-theme-pill-border rounded-[2px] my-2 relative">
                    <div className="absolute top-0 left-0 h-full bg-theme-primary rounded-[2px] transition-all" style={{width: `${simResult.matchRate}%`}}></div>
                  </div>
                </div>

                {/* Guardrails View */}
                {simResult.guardrailResults.length > 0 && (
                  <div className="bg-slate-50 border border-theme-border rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                       <h5 className="text-[11px] font-bold text-theme-muted uppercase tracking-wider flex items-center gap-2">
                         <ShieldCheck className="w-3.5 h-3.5" /> 跨越策略的强制合规拦截 (Global Guardrails)
                       </h5>
                       <span className="text-[10px] text-theme-muted">{simResult.guardrailResults.filter(g => g.matched).length} 项触发</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       {simResult.guardrailResults.map(gr => (
                         <div key={gr.id} className={`flex items-center justify-between p-2 rounded-lg border bg-white ${gr.matched ? (gr.type === 'BLOCK' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50') : 'border-theme-border opacity-60'}`}>
                            <div className="flex items-center gap-2 overflow-hidden">
                               {gr.matched ? (gr.type === 'BLOCK' ? <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> : <Info className="w-3.5 h-3.5 text-amber-500" />) : <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />}
                               <span className={`text-[11px] font-medium truncate ${gr.matched ? (gr.type === 'BLOCK' ? 'text-red-700' : 'text-amber-700') : 'text-slate-500'}`}>
                                 {gr.name}
                               </span>
                            </div>
                            <Badge variant={gr.matched ? (gr.type === 'BLOCK' ? 'warning' : 'warning') : 'neutral'} className="text-[8px] h-4 px-1">
                               {gr.matched ? (gr.type === 'BLOCK' ? 'BLOCKED' : 'WARNING') : 'PASS'}
                            </Badge>
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                <div className="font-mono text-[11px] text-theme-success bg-theme-ink p-4 rounded-[6px] h-[180px] overflow-y-auto leading-relaxed shadow-inner">
                  {simResult.logs.map((log, i) => (
                    <div key={i} className={log.includes('dropped') ? 'text-red-400' : log.includes('FATAL') ? 'text-red-500 font-bold' : log.includes('SUCCESS') ? 'text-white mt-2 border-t border-white/20 pt-2' : ''}>
                      {log}
                    </div>
                  ))}
                </div>

                {/* Dynamic Funnel View */}
                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider mb-4">筛选与优选漏斗 (Execution Stream)</div>
                  <div className="space-y-0">
                    {simResult.funnelSteps.map((stepData, idx) => (
                      <div key={idx}>
                        {idx > 0 && (
                          <div className="flex gap-4">
                            <div className="w-10 flex justify-center"><div className="w-0.5 h-6 bg-theme-border"></div></div>
                          </div>
                        )}
                        <div className={`border border-theme-border rounded-[10px] p-4 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.02)] border-l-4 ${stepData.remaining === 0 ? 'border-l-red-500' : 'border-l-theme-primary'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-[13px] text-theme-ink">执行动作 (Execution Node) - {stepData.name.replace('Phase', 'Node')}</span>
                            <Badge variant={stepData.remaining === 0 ? "warning" : "neutral"}>
                              {stepData.remaining === 0 && stepData.failedFallback ? `熔断：${stepData.failedFallback}` : (stepData.failedFallback ? `执行后动作: ${stepData.failedFallback}` : "过滤 & 排序")}
                            </Badge>
                          </div>
                          <div className="space-y-2 text-[12px] text-theme-muted">
                            {stepData.filters.map((f, fi) => (
                              <div key={fi} className="flex items-center justify-between text-red-500/80">
                                <span>- 拦截器 {f.name} 淘汰</span>
                                <span className="font-mono">- {f.dropped.toLocaleString()}</span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between text-theme-primary font-medium pt-2 border-t border-theme-pill text-[13px]">
                              <span>Remaining 候选集 (加权排序计算面)</span>
                              <span className="font-mono">{stepData.remaining.toLocaleString()} 个预备资源点</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Recommendations */}
                {simResult.recommendations.length > 0 && (
                  <div className="pt-6 border-t border-theme-border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider">执行输出：作业指令产生 (Work Instructions)</div>
                      <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">READY FOR EXECUTION</Badge>
                    </div>
                    <div className="space-y-3">
                      {simResult.recommendations.map((res, i) => (
                        <div key={i} className={`border ${i===0 ? 'border-theme-accent/30 bg-theme-accent/5' : 'border-theme-border bg-[#F8F9FA]'} rounded-[8px] p-3 flex gap-4 items-center`}>
                          <div className={`w-8 h-8 flex items-center justify-center rounded-[6px] font-mono font-bold text-[13px] ${i===0 ? 'bg-theme-accent text-white' : 'bg-[#E5E5EA] text-theme-muted'}`}>
                            #{i+1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 text-white rounded font-bold">WI-CMD</span>
                               <div className="text-[14px] font-semibold text-theme-ink font-mono">{res.loc}</div>
                            </div>
                            <div className="text-[10px] text-theme-muted mt-1 uppercase tracking-tighter opacity-70">指令执行路径：{strategy.category} → 推荐去向库位</div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                              {res.trace.map((t, ti) => (
                                <div key={ti} className="text-[10px] font-mono flex items-center gap-1">
                                  <span className="text-theme-muted">{t.factor}</span>
                                  <span className="text-theme-primary font-bold">{(t.score * (t.weight/100)).toFixed(1)}</span>
                                  <span className="text-[9px] opacity-40">({t.score}x{t.weight}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-theme-primary font-bold font-mono text-[16px]">
                              {(res.score * 100).toFixed(1)} pt
                            </div>
                            <div className="text-[9px] text-theme-muted opacity-50 font-mono">Total Normalized</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                </>)}

                {traceTab === 'trace' && executionTrace && (
                  <div className="space-y-4">
                    {/* Trace header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-theme-ink">{executionTrace.decisionSummary}</p>
                        <p className="text-[10px] text-theme-muted font-mono mt-0.5">Trace: {executionTrace.traceId} | 总耗时 {executionTrace.totalDurationMs}ms</p>
                      </div>
                      <button
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(executionTrace, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `trace-${executionTrace.traceId}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> 导出 JSON
                      </button>
                    </div>

                    {/* Guardrail hits */}
                    {executionTrace.guardrailsEvaluated.some(g => g.hitCount > 0) && (
                      <div className="border border-red-100 bg-red-50/50 rounded-xl p-4">
                        <h5 className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <ShieldAlert className="w-3.5 h-3.5" /> 护栏命中记录
                        </h5>
                        <div className="space-y-2">
                          {executionTrace.guardrailsEvaluated.filter(g => g.hitCount > 0).map(g => (
                            <div key={g.guardrailId} className="flex items-start justify-between gap-2 text-[11px]">
                              <span className={`font-semibold ${g.type === 'BLOCK' ? 'text-red-700' : 'text-amber-700'}`}>{g.guardrailName}</span>
                              <span className="font-mono text-slate-500 text-right">命中 {g.hitCount} 次</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rule timeline */}
                    <div>
                      <h5 className="text-[11px] font-bold text-theme-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5" /> 规则执行时间线
                      </h5>
                      <div className="space-y-2">
                        {executionTrace.rules.map(ruleTrace => (
                          <div key={ruleTrace.ruleId} className="border border-theme-border rounded-xl bg-white overflow-hidden">
                            <button
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                              onClick={() => setExpandedRuleId(expandedRuleId === ruleTrace.ruleId ? null : ruleTrace.ruleId)}
                            >
                              {expandedRuleId === ruleTrace.ruleId
                                ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[12px] font-semibold text-theme-ink truncate">{ruleTrace.ruleName}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${ruleTrace.activated ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                    {ruleTrace.activated ? '激活' : '跳过'}
                                  </span>
                                </div>
                                <p className={`text-[10px] mt-0.5 truncate ${ruleTrace.activated ? 'text-slate-500' : 'text-red-400'}`}>
                                  {ruleTrace.activated ? ruleTrace.activationReason : ruleTrace.skippedReason}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${ruleTrace.activated ? 'bg-blue-400' : 'bg-slate-300'}`}
                                    style={{ width: `${Math.min(100, Math.max(4, (ruleTrace.durationMs / Math.max(executionTrace.totalDurationMs, 1)) * 300))}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 w-12 text-right">{ruleTrace.durationMs}ms</span>
                              </div>
                            </button>

                            {expandedRuleId === ruleTrace.ruleId && ruleTrace.activated && ruleTrace.steps.length > 0 && (
                              <div className="border-t border-theme-border bg-slate-50/50 px-4 py-3 space-y-4">
                                {ruleTrace.steps.map((stepTrace, si) => (
                                  <div key={stepTrace.stepId} className="space-y-2">
                                    {/* Step header */}
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">{si + 1}</span>
                                      <span className="text-[11px] font-semibold text-theme-ink flex-1 truncate">{stepTrace.stepName}</span>
                                      {stepTrace.truncatedByConstraint && (
                                        <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5 font-bold flex items-center gap-1 shrink-0">
                                          <Timer className="w-2.5 h-2.5" /> {stepTrace.truncatedByConstraint}
                                        </span>
                                      )}
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold shrink-0 ${stepTrace.flowDecision === 'TERMINATE' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {stepTrace.flowDecision}
                                      </span>
                                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{stepTrace.durationMs}ms</span>
                                    </div>

                                    {/* Input → Output bar */}
                                    <div className="flex items-center gap-2 pl-7">
                                      <span className="text-[11px] font-mono text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-0.5 shrink-0">{stepTrace.inputCount} 输入</span>
                                      <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-emerald-200"></div>
                                      <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 shrink-0">{stepTrace.outputCount} 输出</span>
                                      <span className="text-[10px] text-red-400 font-mono shrink-0">(-{stepTrace.inputCount - stepTrace.outputCount})</span>
                                    </div>

                                    {/* Filters */}
                                    {stepTrace.filtersApplied.length > 0 && (
                                      <div className="pl-7 space-y-0.5">
                                        {stepTrace.filtersApplied.map(f => (
                                          <div key={f.filterId} className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400 font-mono truncate">{f.field} {f.operator} {f.value}</span>
                                            <span className="text-red-400 font-mono shrink-0 ml-2">-{f.candidatesRemovedCount}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Top candidates factor score table */}
                                    {stepTrace.topCandidates.length > 0 && stepTrace.topCandidates[0].factorScores.length > 0 && (
                                      <div className="pl-7">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Top 候选因子得分</p>
                                        <div className="overflow-x-auto rounded-lg border border-slate-100">
                                          <table className="text-[10px] w-full">
                                            <thead>
                                              <tr className="bg-slate-50 text-slate-400">
                                                <th className="text-left px-2 py-1.5 font-bold">候选</th>
                                                {stepTrace.topCandidates[0].factorScores.map(f => (
                                                  <th key={f.factorId} className="text-right px-2 py-1.5 font-bold">{f.factorName}</th>
                                                ))}
                                                <th className="text-right px-2 py-1.5 font-bold">总分</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                              {stepTrace.topCandidates.map(c => (
                                                <tr key={c.candidateId} className={c.selected ? 'bg-emerald-50/50' : ''}>
                                                  <td className="px-2 py-1 font-mono text-slate-600">{c.candidateLabel}</td>
                                                  {c.factorScores.map(f => (
                                                    <td key={f.factorId} className="text-right px-2 py-1 font-mono font-bold"
                                                      style={{ color: `hsl(${Math.round(f.score * 120)}, 55%, 38%)` }}
                                                    >
                                                      {f.score.toFixed(2)}
                                                    </td>
                                                  ))}
                                                  <td className={`text-right px-2 py-1 font-mono font-bold ${c.selected ? 'text-emerald-600' : 'text-slate-600'}`}>
                                                    {c.totalScore.toFixed(2)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

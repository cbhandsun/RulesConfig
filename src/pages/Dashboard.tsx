import React from 'react';
import { StrategyDetail, StrategyCategory } from '../types/wms';
import { Button, Card, Badge, Input } from '../components/ui';
import { Plus, Search, Edit2, Play, Info, BookOpen, Layers, Shuffle, LayoutGrid, ArrowLeftRight, Zap } from 'lucide-react';
import { getEffectiveInputSubject, getEffectiveOutputSubject, getEffectiveStepAction } from '../utils/stepSemantics';

interface DashboardProps {
  strategies: StrategyDetail[];
  onEdit: (id: string) => void;
  onSimulate: (id: string) => void;
  onCreate: () => void;
  onOpenHelp: () => void;
}

export default function Dashboard({ strategies, onEdit, onSimulate, onCreate, onOpenHelp }: DashboardProps) {
  const [activeTab, setActiveTab] = React.useState<StrategyCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');

  const tabs: { label: string; value: StrategyCategory | 'ALL' }[] = [
    { label: '全部场景', value: 'ALL' },
    { label: '入库与直通收货 (Receiving)', value: 'RECEIVING' },
    { label: '上架货位推荐 (Putaway)', value: 'PUTAWAY' },
    { label: '订单库存分配 (Allocation)', value: 'ALLOCATION' },
    { label: '智能补货 (Replenishment)', value: 'REPLENISHMENT' },
    { label: '波次与集货出库 (Wave)', value: 'WAVE' },
  ];

  const filteredStrategies = strategies.filter(s => {
    if (activeTab !== 'ALL' && s.category !== activeTab) return false;
    if (searchQuery && !s.name.includes(searchQuery) && !s.owner.includes(searchQuery)) return false;
    return true;
  });

  const portfolioStats = React.useMemo(() => {
    const allRules = strategies.flatMap(strategy => strategy.rules);
    const allSteps = strategies.flatMap(strategy => strategy.rules.flatMap(rule => rule.steps.map(step => ({ strategy, step }))));
    const actionSet = new Set(allSteps.map(({ step }) => getEffectiveStepAction(step)));
    const subjectTransitions = new Set(allSteps.map(({ strategy, step }) => `${getEffectiveInputSubject(step, strategy.primarySubject)}→${getEffectiveOutputSubject(step, strategy.primarySubject)}`));

    return {
      strategies: strategies.length,
      rules: allRules.length,
      steps: allSteps.length,
      actions: actionSet.size,
      transitions: subjectTransitions.size,
    };
  }, [strategies]);

  return (
    <div className="flex-1 p-6 flex flex-col gap-6 w-full max-w-[1024px] mx-auto overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-medium text-theme-ink tracking-tight m-0">策略实例中心</h1>
          <p className="text-[12px] text-theme-muted mt-1">实例层总览：查看当前生效与草稿策略实例，并从这里进入编辑或仿真验证。</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenHelp}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 text-[12px] font-bold hover:bg-blue-100 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" /> 实例层说明
          </button>
          <Button onClick={onCreate} className="gap-2">
            <Plus className="w-4 h-4" /> 新建策略实例
          </Button>
        </div>
      </div>

      {/* Logic Insight Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-[14px] p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex items-start gap-4">
           <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
             <Info className="w-5 h-5 text-blue-400" />
           </div>
           <div>
               <h3 className="text-[14px] font-bold tracking-wide uppercase opacity-90">实例层视角：策略实例汇聚公共规则、私有规则与执行步骤</h3>
               <p className="text-[12px] text-white/60 mt-2 leading-relaxed max-w-[800px]">
                 这里展示的是当前仓、货主或业务场景实际生效的策略实例。实例会引用元数据治理提供的语义底座，也可以装配公共规则或从场景模板克隆生成。
                 <span className="mx-2 opacity-30">|</span>
                 从这里进入编辑器后，您编辑的是实例层配置；进入仿真验证后，您验证的是实例层上线效果。
               </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Card className="p-4 border-theme-border bg-white">
          <div className="text-[11px] text-theme-muted uppercase tracking-wider">策略场景</div>
          <div className="mt-2 text-[22px] font-bold text-theme-ink">{portfolioStats.strategies}</div>
        </Card>
        <Card className="p-4 border-theme-border bg-white">
          <div className="text-[11px] text-theme-muted uppercase tracking-wider">规则阶段</div>
          <div className="mt-2 text-[22px] font-bold text-theme-ink">{portfolioStats.rules}</div>
        </Card>
        <Card className="p-4 border-theme-border bg-white">
          <div className="text-[11px] text-theme-muted uppercase tracking-wider">语义步骤</div>
          <div className="mt-2 text-[22px] font-bold text-theme-ink">{portfolioStats.steps}</div>
        </Card>
        <Card className="p-4 border-theme-border bg-white">
          <div className="text-[11px] text-theme-muted uppercase tracking-wider">动作类型</div>
          <div className="mt-2 text-[22px] font-bold text-theme-ink">{portfolioStats.actions}</div>
        </Card>
        <Card className="p-4 border-theme-border bg-white">
          <div className="text-[11px] text-theme-muted uppercase tracking-wider">主体迁移</div>
          <div className="mt-2 text-[22px] font-bold text-theme-ink">{portfolioStats.transitions}</div>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-theme-border pb-4">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 text-[13px] font-medium rounded-[6px] transition-colors ${
                activeTab === tab.value 
                  ? 'bg-theme-primary text-white' 
                  : 'text-theme-ink hover:bg-theme-pill'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
          <Input 
            placeholder="搜索策略名称 / 货主..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden flex-1 overflow-y-auto">
        <div className="overflow-x-auto">
          {/* Dashboard Table represents the Global Strategy Matrix */}
          <table className="w-full text-left">
            <thead className="bg-[#F8F9FA] text-theme-muted font-semibold text-[11px] uppercase tracking-wider border-b border-theme-border">
              <tr>
                <th className="px-4 py-4 w-20 text-center">系统优选</th>
                <th className="px-4 py-4 w-64">全局策略大场景 (Strategy Matrix)</th>
                <th className="px-4 py-4">核心驱动对象</th>
                <th className="px-4 py-4">业务上下文匹配 (Business Context)</th>
                <th className="px-4 py-4 w-24">版本</th>
                <th className="px-4 py-4 w-24">状态</th>
                <th className="px-4 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border text-[13px] bg-white">
              {filteredStrategies.sort((a,b) => b.priority - a.priority).map((strategy) => {
                const strategyRules = strategy.rules;
                const strategySteps = strategyRules.flatMap(rule => rule.steps);
                const actionSummary = Array.from(new Set(strategySteps.map(step => getEffectiveStepAction(step)))).slice(0, 3);
                const transitionSummary = Array.from(new Set(strategySteps.map(step => `${getEffectiveInputSubject(step, strategy.primarySubject)}→${getEffectiveOutputSubject(step, strategy.primarySubject)}`))).slice(0, 2);

                return (
                <tr key={strategy.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-500 font-mono text-[11px] font-bold group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      {strategy.priority}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-medium text-theme-ink">
                    <button 
                      onClick={() => onEdit(strategy.id)}
                      className="hover:text-theme-primary transition-colors cursor-pointer text-left focus:outline-none flex flex-col"
                    >
                      <span className="font-semibold text-[14px]">{strategy.name}</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-theme-muted font-mono px-1.5 py-0.5 bg-slate-100 rounded" title="Strategy ID">{strategy.id}</span>
                        {strategy.rules.some(r => r.steps.some(s => s.name?.includes('数量') || (s.config && Object.keys(s.config).some(k => k.includes('数量'))))) && (
                          <span className="text-[9px] bg-red-50 text-red-600 border border-red-100 rounded px-1.5 py-0.5 font-black tracking-tighter flex items-center gap-1">
                             <Shuffle className="w-2.5 h-2.5" /> 核心管控: 数量收网
                          </span>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 rounded-[4px] bg-blue-50 text-blue-600 font-mono text-[10px] border border-blue-100 uppercase tracking-tighter">
                      {strategy.primarySubject}
                    </span>
                  </td>
                   <td className="px-4 py-4">
                     <div className="flex flex-col gap-2 min-w-[320px]">
                       <div className="flex items-start gap-2 text-[12px] group/scene relative">
                         <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                         <span className="text-theme-ink/80 line-clamp-3 leading-relaxed font-medium transition-all group-hover/scene:line-clamp-none bg-white z-10" title={strategy.scenario}>
                           {strategy.scenario}
                         </span>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1.5 text-[10px] text-theme-muted font-bold font-mono">
                           <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">货主: {strategy.owner}</span>
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                           <LayoutGrid className="w-3 h-3" />
                           含 {strategy.category} 核心架构
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] text-violet-600 font-bold bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">
                           <Layers className="w-3 h-3" />
                           {strategyRules.length} 规则 / {strategySteps.length} 步骤
                         </div>
                       </div>
                       <div className="flex flex-wrap items-center gap-2">
                         {actionSummary.map((action) => (
                           <span key={action} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 font-black tracking-tighter flex items-center gap-1">
                             <Zap className="w-2.5 h-2.5" /> {action}
                           </span>
                         ))}
                         {transitionSummary.map((transition) => (
                           <span key={transition} className="text-[10px] bg-sky-50 text-sky-700 border border-sky-100 rounded px-1.5 py-0.5 font-black tracking-tighter flex items-center gap-1">
                             <ArrowLeftRight className="w-2.5 h-2.5" /> {transition}
                           </span>
                         ))}
                       </div>
                     </div>
                   </td>
                  <td className="px-4 py-4 text-theme-muted font-mono text-[12px]">{strategy.version}</td>
                  <td className="px-4 py-4">
                    <Badge variant={strategy.status === 'ACTIVE' ? 'success' : 'neutral'} className={strategy.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}>
                      {strategy.status === 'ACTIVE' ? '执行中' : '已停用'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 flex flex-col items-end gap-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" className="!h-8 px-3 gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100" onClick={() => onEdit(strategy.id)}>
                        <Edit2 className="w-3.5 h-3.5" /> 编辑实例
                      </Button>
                      <Button variant="accent" className="!h-8 px-3 gap-2" onClick={() => onSimulate(strategy.id)}>
                        <Play className="w-3.5 h-3.5" /> 仿真验证
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {filteredStrategies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-theme-muted">
                    当前分类下没有子策略，点击右上角新建。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

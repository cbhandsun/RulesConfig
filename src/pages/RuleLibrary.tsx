import React, { useState } from 'react';
import { StrategyDetail, StrategyRule, MatchingCondition } from '../types/wms';
import { createDefaultStep, getEffectiveInputSubject, getEffectiveOutputSubject, getEffectiveStepAction } from '../utils/stepSemantics';
import { Button, Card, Badge, Input } from '../components/ui';
import {
  Search, Plus, GitBranch, Edit3, Trash2,
  PlayCircle, BookOpen, Layers, Info, X, CheckCircle2, Settings
} from 'lucide-react';

interface RuleLibraryProps {
  strategies: StrategyDetail[];
  independentRules: StrategyRule[];
  onUpdateStrategy: (updated: StrategyDetail) => void;
  onUpdateIndependentRules: (updated: StrategyRule[]) => void;
  onSimulate: (id: string, ruleId?: string) => void;
  onOpenHelp: () => void;
}

export default function RuleLibrary({ 
  strategies, 
  independentRules, 
  onUpdateStrategy, 
  onUpdateIndependentRules, 
  onSimulate,
  onOpenHelp 
}: RuleLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'INDEPENDENT' | 'STRATEGY'>('ALL');
  const [editingRule, setEditingRule] = useState<{ strategyId: string; rule: StrategyRule } | null>(null);

  // Flatten rules with their origin info for display
  const allDisplayRules = [
    ...independentRules.map(r => ({ ...r, strategyId: 'INDEPENDENT', strategyName: '全局独立规则库', isIndependent: true })),
    ...strategies.flatMap(s => s.rules.map(r => ({ ...r, strategyId: s.id, strategyName: s.name, isIndependent: false })))
  ];

  const filteredRules = allDisplayRules.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab = activeTab === 'ALL' || 
                       (activeTab === 'INDEPENDENT' && r.isIndependent) || 
                       (activeTab === 'STRATEGY' && !r.isIndependent);
    return matchesSearch && matchesTab;
  });

  const handleDeleteRule = (ruleId: string, strategyId: string) => {
    if (strategyId === 'INDEPENDENT') {
      onUpdateIndependentRules(independentRules.filter(r => r.id !== ruleId));
    } else {
      const strategy = strategies.find(s => s.id === strategyId);
      if (strategy) {
        onUpdateStrategy({
          ...strategy,
          rules: strategy.rules.filter(r => r.id !== ruleId)
        });
      }
    }
  };

  const handleCreateIndependentRule = () => {
    const newRule: StrategyRule = {
      id: `RULE-IND-${Math.floor(Math.random() * 10000)}`,
      name: '新建独立业务规则',
      description: '描述该独立规则的业务管控意图...',
      enabled: true,
      flowControl: 'CONTINUE',
      matchingCriteria: [],
      steps: []
    };
    onUpdateIndependentRules([newRule, ...independentRules]);
    setEditingRule({ strategyId: 'INDEPENDENT', rule: newRule });
  };

  const handleSaveEdit = () => {
    if (!editingRule) return;
    if (editingRule.strategyId === 'INDEPENDENT') {
      onUpdateIndependentRules(independentRules.map(r => r.id === editingRule.rule.id ? editingRule.rule : r));
    } else {
      const strategy = strategies.find(s => s.id === editingRule.strategyId);
      if (strategy) {
        onUpdateStrategy({
          ...strategy,
          rules: strategy.rules.map(r => r.id === editingRule.rule.id ? editingRule.rule : r)
        });
      }
    }
    setEditingRule(null);
  };

  return (
    <div className="flex-1 w-full overflow-y-auto bg-theme-bg px-4 py-4 font-sans text-theme-ink sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1360px]">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
               <Layers className="w-5 h-5 text-theme-primary" />
               <h1 className="text-2xl font-bold tracking-tight">全局规则库</h1>
            </div>
            <p className="text-theme-muted text-[13px] max-w-2xl leading-relaxed">
              平台公共规则组件的主归口。这里管理跨策略复用的公共规则资产，同时区分展示策略实例中的私有规则，避免把实例层内容误认为公共规则主数据。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <button
              onClick={onOpenHelp}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 text-[12px] font-bold text-blue-600 transition-colors hover:bg-blue-100"
            >
              <BookOpen className="w-3.5 h-3.5" /> 规则资产说明
            </button>
            <Button variant="primary" className="min-h-9 gap-2 shadow-lg shadow-theme-primary/20" onClick={handleCreateIndependentRule}>
              <Plus className="w-4 h-4" /> 新建公共规则
            </Button>
          </div>
        </header>

        {/* Rule Asset Guide Banner */}
        <div className="relative mb-8 flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-blue-900 to-indigo-950 p-5 text-white shadow-xl sm:flex-row sm:items-start">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-3xl"></div>
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-blue-300" />
          </div>
          <div className="flex-1 relative z-10">
            <h4 className="text-[14px] font-bold tracking-wide uppercase opacity-90">规则资产分层：公共规则沉淀复用，实例规则承接落地</h4>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-8">
              <div className="text-[12px] text-white/60 leading-relaxed">
                <b className="text-white/80 block mb-1">公共规则是规则资产层主真相</b>
                在这里维护的独立规则应作为平台公共组件被多个策略实例复用，它们引用元数据治理提供的对象、属性、动作和因子，而不是重新造一套底层资产。
              </div>
              <div className="text-[12px] text-white/60 leading-relaxed">
                <b className="text-white/80 block mb-1">策略私有规则只在这里做区分展示</b>
                策略实例中的私有规则属于实例层真相，本页可帮助对比和引用，但不应把实例规则与公共规则混成同一类资产口径。
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 rounded-[12px] border border-theme-border bg-white p-2 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1 overflow-x-auto md:overflow-visible">
            {[
              { id: 'ALL', label: '全部规则视图' },
              { id: 'INDEPENDENT', label: '公共规则资产' },
              { id: 'STRATEGY', label: '策略实例规则' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-[8px] text-[13px] font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-theme-bg text-theme-ink shadow-sm border border-theme-border' 
                    : 'text-theme-muted hover:bg-theme-bg'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72 md:pr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
            <Input 
              placeholder="搜索规则 ID、名称或意图..." 
              className="pl-10 h-9 border-theme-border bg-theme-bg text-[12px] rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 gap-4">
          {filteredRules.map((rule, idx) => (
            <Card key={`${rule.id}-${idx}`} className={`p-0 overflow-hidden flex flex-col border-theme-border hover:border-theme-primary/30 transition-all duration-300 bg-white ${rule.strategyId === 'INDEPENDENT' ? 'ring-1 ring-blue-500/20 shadow-[0_4px_24px_rgba(0,100,250,0.05)]' : ''}`}>
              <div className="flex">
                <div className={`w-[4px] shrink-0 ${rule.enabled ? 'bg-theme-success' : 'bg-[#E5E5EA]'}`}></div>
                <div className="flex w-full flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 sm:gap-3">
                      <h3 className="font-semibold text-[15px] text-theme-ink">{rule.name}</h3>
                      <Badge variant={rule.enabled ? 'neutral' : 'warning'} className="bg-[#F8F9FA] border-theme-border text-[10px] py-0">
                        {rule.enabled ? 'ACTIVE' : 'DRAFT'}
                      </Badge>
                      <span className="text-[11px] font-mono text-theme-muted bg-[#F2F2F7] px-1.5 rounded-[4px]">{rule.id}</span>
                      <span className="text-[11px] text-theme-muted">来自: <span className={rule.strategyId === 'INDEPENDENT' ? 'text-blue-500 font-bold underline decoration-blue-500/30' : 'text-theme-primary'}>{rule.strategyName}</span></span>
                    </div>
                    <p className="text-[12px] text-theme-muted mb-4 max-w-3xl leading-relaxed">
                      {rule.description || '无详细业务说明'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 lg:gap-6">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-theme-muted font-medium uppercase tracking-wider">准入条件:</span>
                        {rule.matchingCriteria && rule.matchingCriteria.length > 0 ? (
                           <div className="flex flex-wrap gap-1">
                             {rule.matchingCriteria.slice(0, 2).map((mc, i) => (
                               <span key={i} className="text-[11px] bg-theme-bg text-theme-ink px-1.5 py-0.5 rounded border border-theme-border border-dashed font-mono">
                                 {mc.field} {mc.operator} '{mc.value}'
                               </span>
                             ))}
                             {rule.matchingCriteria.length > 2 && <span className="text-[11px] text-theme-muted">+{rule.matchingCriteria.length - 2}</span>}
                           </div>
                        ) : (
                          <span className="text-[11px] italic text-theme-muted">- 无门槛 -</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5 text-theme-muted" />
                        <span className="text-[11px] text-theme-muted">
                          包含 <span className="font-semibold text-theme-ink">{rule.steps ? rule.steps.length : 0}</span> 个执行跳步逻辑
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(rule.flowControl === 'TERMINATE' || (!rule.flowControl && rule.steps.some(s => s.flowControl === 'TERMINATE'))) ? (
                          <Badge variant="warning" className="text-[9px] bg-orange-50 text-orange-600 border-none px-1 py-0">终结节点</Badge>
                        ) : (
                          <Badge variant="success" className="text-[9px] bg-emerald-50 text-emerald-600 border-none px-1 py-0">流转节点</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 self-start xl:self-center">
                    <Button 
                      variant="outline" 
                      className="h-8 px-3 text-[12px] gap-1 bg-white hover:bg-slate-50 transition-all active:scale-95"
                      onClick={() => setEditingRule({ strategyId: rule.strategyId, rule: JSON.parse(JSON.stringify(rule)) })}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> 编辑
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-8 !w-8 p-0 text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200 transition-all active:scale-95"
                      onClick={() => handleDeleteRule(rule.id, rule.strategyId)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <div className="w-[1px] h-6 bg-theme-border mx-1"></div>
                    <Button 
                      variant="primary" 
                      className="h-8 px-3 text-[12px] gap-1 shadow-sm active:scale-95"
                      onClick={() => {
                        if (rule.strategyId !== 'INDEPENDENT') {
                           onSimulate(rule.strategyId, rule.id);
                        } else {
                           // For independent rules, we'd need a ghost strategy or allow simulator to handle just a rule
                           // For now, only allow simulation if it belongs to a strategy
                           onSimulate(strategies[0]?.id, rule.id); 
                        }
                      }}
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> 仿真验证
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {filteredRules.length === 0 && (
            <div className="py-20 text-center text-theme-muted flex flex-col items-center border-2 border-theme-border border-dashed rounded-[16px] bg-white/50">
              <Search className="w-10 h-10 mb-4 opacity-20" />
              <p className="font-medium">未找到符合条件的业务规则，请调整过滤条件或新建规则。</p>
            </div>
          )}
        </div>
      </div>

      {/* Editing Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-[#F8F9FA]">
              <div>
                <h3 className="font-semibold text-theme-ink text-[16px]">业务规则核心逻辑编辑</h3>
                <p className="text-[11px] text-theme-muted mt-0.5">正在编辑: {editingRule.rule.id} (所属来源: {editingRule.strategyId === 'INDEPENDENT' ? '全局独立规则库' : strategies.find(s => s.id === editingRule.strategyId)?.name})</p>
              </div>
              <button onClick={() => setEditingRule(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-theme-muted hover:text-theme-ink transition-all">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
               <section className="space-y-4">
                  <h4 className="text-[12px] font-bold text-theme-muted uppercase tracking-wider border-l-4 border-theme-primary pl-3">基础信息 (Metadata)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-theme-muted font-semibold ml-1">规则显示名称</label>
                      <Input 
                        value={editingRule.rule.name}
                        className="h-9"
                        onChange={(e) => setEditingRule({ ...editingRule, rule: { ...editingRule.rule, name: e.target.value } })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-theme-muted font-semibold ml-1">层级流控降级意图 (Flow Control)</label>
                      <select 
                        className="w-full h-9 rounded-[6px] border border-theme-border text-[13px] px-2 bg-white outline-none focus:ring-1 focus:ring-theme-primary"
                        value={editingRule.rule.flowControl || 'TERMINATE'}
                        onChange={(e) => setEditingRule({ ...editingRule, rule: { ...editingRule.rule, flowControl: e.target.value as any } })}
                      >
                        <option value="TERMINATE">TERMINATE (计算完成即跳离策略上下文)</option>
                        <option value="CONTINUE">CONTINUE (作为中间件流转透传至下一规则)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-theme-muted font-semibold ml-1">业务背景/决策意图描述</label>
                      <textarea 
                        className="w-full min-h-[60px] p-3 rounded-[8px] border border-theme-border text-[12px] text-theme-muted focus:outline-none focus:ring-1 focus:ring-theme-primary transition-all resize-none bg-white font-sans"
                        value={editingRule.rule.description || ''}
                        onChange={(e) => setEditingRule({ ...editingRule, rule: { ...editingRule.rule, description: e.target.value } })}
                        placeholder="为什么要制定这条规则？拦截的边界条件是什么？"
                      />
                    </div>
                    <div className="space-y-1.5 pt-6 pl-4 flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-theme-border text-theme-primary focus:ring-theme-primary transition-all"
                          checked={editingRule.rule.enabled}
                          onChange={(e) => setEditingRule({ ...editingRule, rule: { ...editingRule.rule, enabled: e.target.checked } })}
                        />
                        <span className="text-[13px] text-theme-ink group-hover:text-theme-primary transition-colors">激活此业务规则生效</span>
                      </label>
                    </div>
                  </div>
               </section>

               <section className="space-y-4">
                  <h4 className="text-[12px] font-bold text-theme-muted uppercase tracking-wider border-l-4 border-emerald-500 pl-3">准入触发条件 (Triggers)</h4>
                  <div className="flex flex-col gap-2">
                     {editingRule.rule.matchingCriteria.map((cond, ci) => (
                       <div key={cond.id} className="flex items-center gap-2 bg-theme-bg p-2 rounded-lg border border-theme-border">
                          <Input 
                            value={cond.field} 
                            className="bg-white h-8 text-[12px]" 
                            onChange={(e) => {
                              const newC = [...editingRule.rule.matchingCriteria];
                              newC[ci] = { ...newC[ci], field: e.target.value };
                              setEditingRule({ ...editingRule, rule: { ...editingRule.rule, matchingCriteria: newC } });
                            }}
                          />
                          <select 
                            className="h-8 border border-theme-border rounded px-1 text-[12px] bg-white min-w-[60px]"
                            value={cond.operator}
                            onChange={(e) => {
                              const newC = [...editingRule.rule.matchingCriteria];
                              newC[ci] = { ...newC[ci], operator: e.target.value };
                              setEditingRule({ ...editingRule, rule: { ...editingRule.rule, matchingCriteria: newC } });
                            }}
                          >
                            <option value="==">==</option>
                            <option value="!=">!=</option>
                            <option value="IN">IN</option>
                            <option value=">=">&gt;=</option>
                            <option value="<=">&lt;=</option>
                          </select>
                          <Input 
                            value={cond.value} 
                            className="bg-white h-8 text-[12px]"
                            onChange={(e) => {
                              const newC = [...editingRule.rule.matchingCriteria];
                              newC[ci] = { ...newC[ci], value: e.target.value };
                              setEditingRule({ ...editingRule, rule: { ...editingRule.rule, matchingCriteria: newC } });
                            }}
                          />
                          <button 
                            onClick={() => {
                              const newC = editingRule.rule.matchingCriteria.filter((_, i) => i !== ci);
                              setEditingRule({ ...editingRule, rule: { ...editingRule.rule, matchingCriteria: newC } });
                            }}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                       </div>
                     ))}
                     <button 
                       onClick={() => {
                         const newC: MatchingCondition = { id: `mc-${Math.random()}`, field: '', operator: '==', value: '' };
                         setEditingRule({ ...editingRule, rule: { ...editingRule.rule, matchingCriteria: [...editingRule.rule.matchingCriteria, newC] } });
                       }}
                       className="text-[11px] text-theme-primary font-bold hover:underline flex items-center gap-1 w-fit mt-1"
                     >
                       <Plus className="w-3 h-3" /> 新加一层过滤准入
                     </button>
                  </div>
               </section>

               <section className="space-y-4">
                  <h4 className="text-[12px] font-bold text-theme-muted uppercase tracking-wider border-l-4 border-blue-500 pl-3">执行动作 (Execution Steps)</h4>
                  <div className="space-y-4">
                    {editingRule.rule.steps.map((step, si) => (
                      <div key={step.id} className="bg-slate-50 border border-theme-border rounded-[12px] p-4 group relative">
                         <div className="flex items-center justify-between mb-3 pb-2 border-b border-theme-border/50">
                            <div className="flex items-center gap-2">
                               <span className="w-6 h-6 rounded-full bg-slate-800 text-white text-[11px] flex items-center justify-center font-bold">{si + 1}</span>
                               <input
                                 className="font-bold text-[13px] bg-transparent border-none focus:outline-none"
                                 value={step.name}
                                 onChange={(e) => {
                                   const newSteps = [...editingRule.rule.steps];
                                   newSteps[si] = { ...newSteps[si], name: e.target.value };
                                   setEditingRule({ ...editingRule, rule: { ...editingRule.rule, steps: newSteps } });
                                 }}
                               />
                               <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-bold">
                                 {getEffectiveStepAction(step)} · {getEffectiveInputSubject(step, 'CONTEXT')} → {getEffectiveOutputSubject(step, 'CONTEXT')}
                               </span>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="flex items-center gap-1 text-[11px] text-theme-muted mr-4">
                                 <Settings className="w-3 h-3" /> 
                                 <span>{step.sorters.length} 因子 / {step.filters.length} 过滤</span>
                               </div>
                               <select 
                                 className="text-[11px] border border-theme-border rounded px-1 h-7 bg-white outline-none"
                                 value={step.flowControl}
                                 onChange={(e) => {
                                   const newSteps = [...editingRule.rule.steps];
                                   newSteps[si] = { ...newSteps[si], flowControl: e.target.value as any };
                                   setEditingRule({ ...editingRule, rule: { ...editingRule.rule, steps: newSteps } });
                                 }}
                               >
                                  <option value="TERMINATE">匹配即跳出</option>
                                  <option value="CONTINUE">向后续流转</option>
                               </select>
                               <button 
                                 onClick={() => {
                                   const newSteps = editingRule.rule.steps.filter((_, i) => i !== si);
                                   setEditingRule({ ...editingRule, rule: { ...editingRule.rule, steps: newSteps } });
                                 }}
                                 className="text-slate-400 hover:text-red-500 transition-colors"
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                            </div>
                         </div>
                         <div className="flex justify-between items-center bg-white p-2 border border-theme-border rounded-[8px]">
                            <div className="text-[11px] text-theme-muted flex items-center gap-2">
                               <Info className="w-3.5 h-3.5 text-blue-400" />
                               <span>当前执行参数在独立库中以模板形式锁定。具体的偏移量、权重比与拦截阈值，需在引用该规则的策略编辑器中针对性装配。</span>
                            </div>
                         </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => {
                        const newStep = createDefaultStep('CONTEXT', editingRule.rule.steps.length + 1);
                        newStep.failoverAction = 'ERROR_SUSPEND';
                        setEditingRule({ ...editingRule, rule: { ...editingRule.rule, steps: [...editingRule.rule.steps, newStep] } });
                      }}
                      className="w-full h-10 border-2 border-dashed border-theme-border rounded-xl text-theme-muted hover:text-theme-primary hover:border-theme-primary transition-all flex items-center justify-center gap-2 group"
                    >
                      <Plus className="w-4 h-4 group-hover:rotate-90 transition-all font-bold" />
                      <span className="text-[12px] font-bold">增加业务执行流水线阶段</span>
                    </button>
                  </div>
               </section>
            </div>
            
            <div className="px-6 py-4 border-t border-theme-border flex justify-end gap-3 bg-white">
              <Button variant="ghost" onClick={() => setEditingRule(null)}>丢弃更改</Button>
              <Button variant="primary" className="px-8 shadow-md" onClick={handleSaveEdit}>保存配置并分发全局</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

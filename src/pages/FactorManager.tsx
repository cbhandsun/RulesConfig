import React, { useState } from 'react';
import { Factor, RuleStepAction, RuleStepType } from '../types/wms';
import { mockFactors } from '../data/mock';
import { attributeMetas, getObjectMeta, subjectOptions } from '../data/metadata';
import { Button, Card, Badge, Input, Select } from '../components/ui';
import { Settings, Plus, Search, Layers, Box, Filter, BookOpen, Database } from 'lucide-react';

interface FactorManagerProps {
  onOpenHelp: () => void;
}

export default function FactorManager({ onOpenHelp }: FactorManagerProps) {
  const [factors, setFactors] = useState<Factor[]>(mockFactors);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'LOCATION' | 'INVENTORY' | 'RESOURCE' | 'TASK' | 'CONTAINER' | 'LOAD'>('ALL');
  const [editingFactor, setEditingFactor] = useState<Factor | null>(null);
  const [showWeightGuide, setShowWeightGuide] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFactor, setNewFactor] = useState<Partial<Factor>>({
    targetObject: 'LOCATION',
    category: 'PHYSICAL',
    logic: { formula: 'target.attribute / total * 100', unit: 'Pts' }
  });

  const handleRegisterFactor = () => {
    if (!newFactor.name || !newFactor.id) return;
    const factor: Factor = {
      ...newFactor as Factor,
      id: newFactor.id || `F-${Math.random().toString(36).substr(2, 5)}`
    };
    setFactors([factor, ...factors]);
    setIsCreating(false);
    setNewFactor({
      targetObject: 'LOCATION',
      category: 'PHYSICAL',
      logic: { formula: 'target.attribute / total * 100', unit: 'Pts' }
    });
  };

  const filteredFactors = factors.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab = activeTab === 'ALL' || f.targetObject === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleSaveFactor = () => {
    if (!editingFactor) return;
    setFactors(prev => prev.map(f => f.id === editingFactor.id ? editingFactor : f));
    setEditingFactor(null);
  };

  const getAttributeLabels = (factor: Factor) => factor.attributeRefs?.map(attributeRef => {
    const meta = attributeMetas.find(attribute => attribute.id === attributeRef);
    return meta?.name ?? attributeRef;
  }) ?? [];

  const getActionLabels = (actions?: RuleStepAction[]) => actions ?? [];
  const getStepTypeLabels = (stepTypes?: RuleStepType[]) => stepTypes ?? [];

  const renderMetaChips = (values: string[], emptyLabel: string) => {
    if (values.length === 0) {
      return <span className="text-[10px] text-theme-muted opacity-60">{emptyLabel}</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5">
        {values.map(value => (
          <span key={value} className="inline-flex items-center rounded-full border border-theme-border bg-theme-bg px-2 py-0.5 text-[10px] font-medium text-theme-ink">
            {value}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 w-full overflow-y-auto bg-theme-bg px-4 py-4 font-sans text-theme-ink sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1360px]">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold mb-2">因子工作台</h1>
            <p className="max-w-2xl text-[13px] leading-relaxed text-theme-muted">
              元数据治理下的专业子域视图，用于维护同一份因子主数据。这里管理因子公式、归一化方式、适用对象与动作约束，而不是创建第二套独立真相。
              <button
                onClick={() => setShowWeightGuide(true)}
                className="ml-0 mt-2 inline-flex items-center gap-1 font-medium text-theme-primary hover:underline sm:ml-2 sm:mt-0"
              >
                如何计算权重分值?
              </button>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
            <button
              onClick={onOpenHelp}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 text-[12px] font-bold text-blue-600 transition-colors hover:bg-blue-100"
            >
              <BookOpen className="w-3.5 h-3.5" /> 因子治理说明
            </button>
            <Button variant="primary" className="min-h-9 gap-2" onClick={() => setIsCreating(true)}>
              <Plus className="w-4 h-4" /> 新建因子
            </Button>
          </div>
        </header>

        {/* Factor Governance Guide */}
        <div className="relative mb-8 flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white shadow-xl sm:flex-row sm:items-start">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 blur-xl"></div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex-1 relative z-10">
            <h4 className="text-[14px] font-bold tracking-wide uppercase opacity-90">因子治理原则：专业工作台编辑，同源主数据回写</h4>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-8">
              <div className="text-[12px] text-white/60 leading-relaxed">
                <b className="text-white/80 block mb-1 underline decoration-purple-500/50 underline-offset-4">元数据子域，不是第二套资产库</b>
                因子属于元数据资产的一部分，本页只是因子域的专业工作台。所有编辑都应回写同一份因子主数据，避免“元数据一份、因子集一份”的双真相结构。
              </div>
              <div className="text-[12px] text-white/60 leading-relaxed">
                <b className="text-white/80 block mb-1 underline decoration-purple-500/50 underline-offset-4">面向规则、模板与实例复用</b>
                因子在这里被治理，但会被规则库、模板库和策略实例共同引用；这页负责专业维护，不负责完整规则编排和策略实例落地。
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 overflow-hidden rounded-[10px] border border-theme-border bg-white p-2 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex gap-1 overflow-x-auto no-scrollbar scroll-smooth md:min-w-0">
            {['ALL', 'LOCATION', 'INVENTORY', 'RESOURCE', 'TASK', 'CONTAINER', 'LOAD'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-3 py-1.5 rounded-[6px] text-[12px] whitespace-nowrap font-medium transition-colors ${
                  activeTab === tab 
                    ? 'bg-theme-bg text-theme-ink shadow-sm border border-theme-border' 
                    : 'text-theme-muted hover:bg-[#F8F9FA]'
                }`}
              >
                {tab === 'ALL' ? '全部维度' : 
                 tab === 'LOCATION' ? '库位/物理' : 
                 tab === 'INVENTORY' ? '库存/批次' : 
                 tab === 'RESOURCE' ? '设备' :
                 tab === 'TASK' ? '作业' :
                 tab === 'CONTAINER' ? '载具' : '负载'}
              </button>
            ))}
          </div>
          <div className="relative w-full shrink-0 md:ml-4 md:w-56 lg:w-64 md:pr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-muted" />
            <Input 
              placeholder="搜索因子 ID、名称" 
              className="pl-9 h-8 border-theme-border bg-theme-bg text-[11px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Factor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFactors.map(factor => (
            <Card key={factor.id} className="p-5 flex flex-col hover:border-theme-primary/40 transition-colors bg-white group cursor-pointer shadow-sm relative overflow-hidden">
              <div className="flex items-start justify-between mb-2 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 border ${
                    factor.targetObject === 'LOCATION' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' :
                    factor.targetObject === 'INVENTORY' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                    'bg-amber-50 text-amber-500 border-amber-100'
                  }`}>
                    {factor.targetObject === 'LOCATION' ? <Box className="w-4 h-4" /> : 
                     factor.targetObject === 'INVENTORY' ? <Filter className="w-4 h-4" /> : 
                     <Layers className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[13px] text-theme-ink group-hover:text-theme-primary transition-colors">{factor.name}</h3>
                    <div className="text-[10px] font-mono text-theme-muted opacity-60">ID: {factor.id}</div>
                  </div>
                </div>
                <Badge variant="neutral" className="text-[9px] py-0 px-1 bg-theme-bg uppercase text-theme-muted border-none opacity-60">
                   {factor.category}
                </Badge>
              </div>
              
              <div className="flex-1 relative z-10 py-3">
                <p className="text-[12px] text-theme-muted leading-relaxed line-clamp-2 mb-2">
                  {factor.description}
                </p>
                {factor.logic?.formula && (
                  <div className="bg-[#F2F2F7] rounded-[4px] p-2 border border-[#E5E5EA]">
                    <div className="text-[9px] uppercase font-bold text-theme-muted mb-1 opacity-60">指标逻辑 (Logic)</div>
                    <code className="text-[10px] font-mono text-indigo-600 break-all">{factor.logic.formula}</code>
                  </div>
                )}
                <div className="mt-3 space-y-2">
                  <div>
                    <div className="text-[9px] uppercase font-bold text-theme-muted mb-1 opacity-60">关联属性</div>
                    {renderMetaChips(getAttributeLabels(factor), '未声明属性依赖')}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-theme-muted mb-1 opacity-60">适用动作</div>
                    {renderMetaChips(getActionLabels(factor.applicableActions), '未限制动作')}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-theme-muted mb-1 opacity-60">适用步骤类型</div>
                    {renderMetaChips(getStepTypeLabels(factor.applicableStepTypes), '未限制步骤类型')}
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-theme-muted mb-1 opacity-60">标签 / 归一化</div>
                    {renderMetaChips([
                      ...(factor.tags ?? []),
                      ...(factor.normalization?.method ? [factor.normalization.method] : []),
                      ...(factor.normalization?.outputUnit ? [factor.normalization.outputUnit] : []),
                    ], '未声明标签与归一化')}
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-4 border-t border-[#F2F2F7] mt-auto">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-theme-muted uppercase tracking-tighter opacity-50">度量对象 (Target)</span>
                    <span className="text-[11px] font-bold text-theme-ink truncate">
                      {getObjectMeta(factor.targetObject)?.name ?? factor.targetObject}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingFactor(factor)}
                      className="p-1.5 border border-theme-border hover:bg-theme-bg rounded-[6px] transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-theme-muted" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {filteredFactors.length === 0 && (
          <div className="py-20 text-center text-theme-muted flex flex-col items-center">
            <Search className="w-10 h-10 mb-4 opacity-20" />
            <p>未找到匹配的因子，请尝试换个关键词。</p>
          </div>
        )}
      </div>

      {/* Factor Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[12px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center">
              <h3 className="font-semibold text-theme-ink uppercase tracking-tight">注册新调度算法因子</h3>
              <button onClick={() => setIsCreating(false)} className="text-theme-muted hover:text-theme-ink transition-colors">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
               <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                 <div>
                   <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5">因子唯一标识 (ID)</label>
                   <Input
                     placeholder="e.g. F_DIST_PATH"
                     value={newFactor.id || ''}
                     onChange={(e) => setNewFactor({ ...newFactor, id: e.target.value.toUpperCase() })}
                   />
                 </div>
                 <div>
                   <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5">针对对象 (Subject)</label>
                   <select
                     className="w-full h-9 rounded-[6px] border border-theme-border text-[12px] px-2 bg-white outline-none"
                     value={newFactor.targetObject}
                     onChange={(e) => setNewFactor({ ...newFactor, targetObject: e.target.value as any })}
                   >
                     {subjectOptions.map(option => (
                       <option key={option.value} value={option.value}>{option.label}</option>
                     ))}
                   </select>
                 </div>
               </div>
               <div>
                 <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5">因子显示名称</label>
                 <Input 
                   placeholder="e.g. 最短路径优先"
                   value={newFactor.name || ''}
                   onChange={(e) => setNewFactor({ ...newFactor, name: e.target.value })}
                 />
               </div>
               <div>
                  <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5 scroll-m-20">算法分类</label>
                  <select 
                    className="w-full h-9 rounded-[6px] border border-theme-border text-[12px] px-2 bg-white outline-none"
                    value={newFactor.category}
                    onChange={(e) => setNewFactor({ ...newFactor, category: e.target.value as any })}
                  >
                    <option value="PHYSICAL">物理属性 (Physical)</option>
                    <option value="LOGICAL">逻辑属性 (Logical)</option>
                    <option value="TEMPORAL">时间属性 (Temporal)</option>
                    <option value="EQUIPMENT">设备约束 (Equip)</option>
                    <option value="COMPLIANCE">合规约束 (Compliance)</option>
                  </select>
               </div>
               <div className="flex justify-end gap-2 pt-2 border-t border-theme-border mt-4 overflow-hidden">
                  <Button variant="ghost" onClick={() => setIsCreating(false)}>取消</Button>
                  <Button variant="primary" onClick={handleRegisterFactor} disabled={!newFactor.name || !newFactor.id}>提交注册因子</Button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Factor Edit Modal */}
      {editingFactor && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[12px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center">
              <h3 className="font-semibold text-theme-ink">因子计算参数配置</h3>
              <button onClick={() => setEditingFactor(null)} className="text-theme-muted hover:text-theme-ink transition-colors">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
               <div>
                 <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5">因子名称</label>
                 <Input 
                   value={editingFactor.name}
                   onChange={(e) => setEditingFactor({ ...editingFactor, name: e.target.value })}
                 />
               </div>
               <div>
                 <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5">计算逻辑描述</label>
                 <textarea 
                   className="w-full min-h-[80px] p-3 rounded-[6px] border border-theme-border text-[13px] outline-none"
                   value={editingFactor.description || ''}
                   onChange={(e) => setEditingFactor({ ...editingFactor, description: e.target.value })}
                 />
               </div>
               <div>
                 <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5">指标计算逻辑 (Script / Formula)</label>
                 <div className="bg-[#1C1C1E] rounded-[6px] p-3 border border-black overflow-hidden group">
                   <textarea 
                     className="w-full min-h-[100px] bg-transparent text-emerald-400 font-mono text-[12px] outline-none resize-none no-scrollbar"
                     spellCheck="false"
                     value={editingFactor.logic?.formula || ''}
                     onChange={(e) => setEditingFactor({ 
                       ...editingFactor, 
                       logic: { ...editingFactor.logic, formula: e.target.value } 
                     })}
                   />
                   <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                     <span className="text-[9px] text-white/40 font-mono">Status: Draft</span>
                     <span className="text-[9px] text-white/40 font-mono">Unit: {editingFactor.logic?.unit || 'N/A'}</span>
                   </div>
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5">默认权重基数</label>
                   <Input type="number" defaultValue="1.0" />
                 </div>
                 <div>
                   <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5">计算优先级</label>
                   <Input type="number" defaultValue="10" />
                 </div>
               </div>
               <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setEditingFactor(null)}>取消</Button>
                  <Button variant="primary" onClick={handleSaveFactor}>应用配置</Button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Weight Guide Modal */}
      {showWeightGuide && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-theme-border flex justify-between items-center bg-[#F8F9FA]">
              <div>
                <h3 className="font-bold text-[18px] text-theme-ink m-0">权重计算与归一化逻辑指南</h3>
                <p className="text-[12px] text-theme-muted mt-1">Weight Calculation & Normalization Guide</p>
              </div>
              <button onClick={() => setShowWeightGuide(false)} className="text-theme-muted hover:text-theme-ink transition-colors p-2 hover:bg-theme-bg rounded-full">✕</button>
            </div>
            <div className="px-8 py-8 space-y-8 overflow-y-auto max-h-[70vh]">
              <section>
                <h4 className="flex items-center gap-2 text-[14px] font-bold text-theme-ink mb-3">
                  <div className="w-1.5 h-4 bg-theme-primary rounded-full"></div>
                  1. 为什么要进行归一化 (Normalization)?
                </h4>
                <p className="text-[13px] text-theme-muted leading-relaxed">
                  不同因子的量纲完全不同（如距离单位是“米”，效期单位是“天”，利用率是“%”）。为了将它们合并计算，必须先将原始值转化为统一的 <strong>0.0 ~ 100.0</strong> 的标量分值。
                </p>
              </section>

              <section>
                <h4 className="flex items-center gap-2 text-[14px] font-bold text-theme-ink mb-3">
                  <div className="w-1.5 h-4 bg-theme-primary rounded-full"></div>
                  2. 总分计算公式 (Total Score)
                </h4>
                <div className="bg-theme-bg p-6 rounded-[10px] border border-theme-border font-mono text-[14px] text-center shadow-inner">
                  Total Score = Σ ( Normalized_Factor_i * Weight_i / 100 )
                </div>
                <p className="text-[12px] text-theme-muted mt-3 italic text-center">
                  * 所有启用的因子权重之和通常建议为 100%，以保证最终得分在 0-100 范围内。
                </p>
              </section>

              <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div>
                  <h5 className="text-[12px] font-bold text-theme-ink mb-2 uppercase tracking-tight">升序排列 (ASC)</h5>
                  <div className="text-[12px] text-theme-muted space-y-2">
                    <p>原始值越小，得分越高。</p>
                    <p className="bg-indigo-50 p-2 rounded border border-indigo-100 font-mono text-indigo-600">Score = (MaxVal - Current) / (MaxVal - MinVal) * 100</p>
                    <p className="text-[11px] opacity-70">适用场景：动线距离（越近越好）、出库FIFO（时间戳越早越好）。</p>
                  </div>
                </div>
                <div>
                  <h5 className="text-[12px] font-bold text-theme-ink mb-2 uppercase tracking-tight">降序排列 (DESC)</h5>
                  <div className="text-[12px] text-theme-muted space-y-2">
                    <p>原始值越大，得分越高。</p>
                    <p className="bg-emerald-50 p-2 rounded border border-emerald-100 font-mono text-emerald-600">Score = (Current - MinVal) / (MaxVal - MinVal) * 100</p>
                    <p className="text-[11px] opacity-70">适用场景：库存余量（优先清空）、库位高度（优先底层）。</p>
                  </div>
                </div>
              </section>

              <div className="pt-4 flex justify-center">
                <Button variant="primary" onClick={() => setShowWeightGuide(false)} className="px-12">我明白了</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, RadarChart, ResponsiveContainer } from 'recharts';
import { StrategyDetail, RuleStep, Factor, StrategyRule, FactorTarget, RuleStepAction, RuleStepType, StepInputBinding, ActionParamSchema, TriggerCondition, TriggerEventType, TrafficSplitConfig, MatchingCondition, ConditionType, CostDimension, GlobalGuardrail } from '../types/wms';
import { mockFactors, mockCostDimensions } from '../data/mock';
import { allOperatorsGrouped, timeWindowOperators, getActionMeta, getActionParams, getAttributesByObject, getObjectMeta, subjectOptions } from '../data/metadata';
import { Button, Card, Badge, Input } from '../components/ui';
import { createDefaultStep, getEffectiveInputSubject, getEffectiveOutputSubject, getEffectiveStepAction, getEffectiveStepType } from '../utils/stepSemantics';
import { validateStrategyGraph, ValidationResult } from '../utils/graphValidation';
import { ArrowLeft, ArrowRight, Save, Play, Plus, X, ArrowDown, ChevronRight, Settings, PlusCircle, Search, ChevronDown, GitBranch, GitMerge, HelpCircle, BookOpen, Layers, Zap, Code, Filter, Info, LayoutGrid, Sparkles, Activity, ShieldCheck, ShieldAlert, Box, Workflow, AlertCircle, Link as LinkIcon, ArrowDownRight, Scale, Timer, Sliders, Bell, FlaskConical, SlidersHorizontal, RotateCcw } from 'lucide-react';

const calculateRadarData = (rule: StrategyRule) => {
  const text = JSON.stringify(rule).toLowerCase();
  let efficiency = 40, compliance = 35, freshness = 30, storeFriendly = 30, density = 35;

  if (text.includes('route') || text.includes('dist') || text.includes('fast') || text.includes('cross')) efficiency += 45;
  if (text.includes('temp') || text.includes('expir') || text.includes('fefo') || text.includes('fresh')) freshness += 50;
  if (text.includes('shelf-life') || text.includes('policy') || text.includes('strict')) compliance += 45;
  if (text.includes('aisle') || text.includes('seq') || text.includes('friendly') || text.includes('weight') || text.includes('pallet')) storeFriendly += 50;
  if (text.includes('capacity') || text.includes('fill') || text.includes('density') || text.includes('clear')) density += 45;

  return [
    { subject: '执行效率', A: Math.min(efficiency, 95) },
    { subject: '质量合规', A: Math.min(compliance, 95) },
    { subject: '新鲜受控', A: Math.min(freshness, 95) },
    { subject: '对店友好', A: Math.min(storeFriendly, 95) },
    { subject: '空间密度', A: Math.min(density, 95) },
  ];
};

const RadarInsight = ({ rule }: { rule: StrategyRule }) => {
  const data = useMemo(() => calculateRadarData(rule), [rule]);
  return (
    <div className="w-full h-48 mt-2 relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
          <Radar
            name="Balance"
            dataKey="A"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="absolute top-0 right-0 p-1">
         <div className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse shadow-sm shadow-blue-500/50">SMART_ALGO</div>
      </div>
    </div>
  );
};

type AvailableParam = {
  key: string;
  label: string;
  type: string;
  group: string;
  description?: string;
  unit?: string;
  placeholder?: string;
  options?: string[];
};

const defaultFilterOperators = ['==', '!=', '>', '>=', '<', '<=', 'IN'];

const toAvailableParam = (param: ActionParamSchema): AvailableParam => ({
  key: param.key,
  label: param.label,
  type: param.valueType,
  group: param.group ?? 'ADJUSTMENT',
  description: param.description,
  unit: param.unit,
  placeholder: param.placeholder,
  options: param.options,
});

const getFilterFieldKey = (field: string) => field.includes('.') ? field.split('.').slice(1).join('.') : field;

const getFilterMeta = (subject: FactorTarget, field: string) => {
  const fieldKey = getFilterFieldKey(field);
  return getAttributesByObject(subject).find(attribute => attribute.key === fieldKey || attribute.id === field || attribute.name === field);
};

const BusinessInsight = ({ rule }: { rule: StrategyRule }) => {
  const isGate = rule.type === 'GATE';
  const hasManual = rule.steps.some(s => s.id.includes('manual') || (s.description && s.description.includes('手动')));
  const hasFilter = rule.steps.some(s => (s.filters ?? []).length > 0);
  const hasQtyControl = rule.steps.some(s => {
    const filters = s.filters ?? [];
    const config = s.config ?? {};
    return (
      s.name?.includes('数量') ||
      s.description?.includes('数量') ||
      filters.some(f => f.field.includes('数量')) ||
      Object.keys(config).some(k => k.includes('Quantity'))
    );
  });
  
  return (
    <div className="mt-4 p-4 bg-slate-900 rounded-xl border border-white/5 shadow-2xl relative overflow-hidden group">
       <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none"></div>
       <div className="relative z-10">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
             <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest">业务逻辑特征分析</span>
             </div>
             <Badge variant="neutral" className="bg-blue-500/20 text-blue-300 border-none text-[8px] h-4">PRO</Badge>
          </div>
          
          <div className="space-y-2.5">
             <div className="flex items-start gap-2.5">
                <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${isGate ? 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]' : 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]'}`}></div>
                <p className="text-[11px] text-slate-300 leading-tight">
                   {isGate ? '该维度包含“决策网关”，执行严格的业务合规性硬阻断。' : '该维度属于“多级算法推荐”，通过线性叠加寻找全局最优。'}
                </p>
             </div>
             {hasQtyControl && (
               <div className="flex items-start gap-2.5">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)] shrink-0"></div>
                  <p className="text-[11px] text-slate-300 leading-tight font-bold text-white">
                     检测到“数量管控”环节：已开启 ASN 数量偏差与收货溢收比例合规强考量。
                  </p>
               </div>
             )}
             {hasManual && (
               <div className="flex items-start gap-2.5">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                     检测到“人脑覆盖”逻辑，尊重现场作业灵活性，允许强制覆盖系统结果。
                  </p>
               </div>
             )}
             {hasFilter && (
               <div className="flex items-start gap-2.5">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                  <p className="text-[11px] text-slate-300 leading-tight">
                     包含多重约束过滤器，已实现“温区/载具/库容”硬合规隔离。
                  </p>
               </div>
             )}
          </div>
       </div>
    </div>
  );
};

interface EditorProps {
  strategy: StrategyDetail | null;
  allStrategies: StrategyDetail[];
  independentRules?: StrategyRule[];
  globalGuardrails?: GlobalGuardrail[];
  onUpdateGlobalGuardrails?: (updated: GlobalGuardrail[]) => void;
  onBack: () => void;
  onSimulate: (id: string, ruleId?: string) => void;
  onSave: (strategy: StrategyDetail) => void;
  onOpenHelp: () => void;
}

function ExecutionConstraintsPanel({ step, onUpdate }: {
  step: import('../types/wms').RuleStep;
  onUpdate: (id: string, updates: Partial<import('../types/wms').RuleStep>) => void;
}) {
  const [ecOpen, setEcOpen] = useState(false);
  const ec = step.executionConstraints;
  const hasConstraints = ec?.maxCandidates !== undefined || ec?.timeoutMs !== undefined || ec?.maxOutputCount !== undefined;
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setEcOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
          <Timer className="w-3.5 h-3.5" />
          执行约束
          {hasConstraints && (
            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 text-[9px] font-black ml-1">
              已配置
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${ecOpen ? 'rotate-180' : ''}`} />
      </button>
      {ecOpen && (
        <div className="border-t border-slate-100 px-4 py-3 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">最大候选数</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                className="w-full h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-bold focus:outline-none focus:border-blue-400"
                placeholder="如 500"
                value={ec?.maxCandidates ?? ''}
                onChange={e => {
                  const v = e.target.value ? Number(e.target.value) : undefined;
                  onUpdate(step.id, { executionConstraints: { ...ec, maxCandidates: v } });
                }}
              />
              <span className="text-[10px] text-slate-400 shrink-0">条</span>
            </div>
            {ec?.maxCandidates !== undefined && ec.maxCandidates > 2000 && (
              <p className="text-[9px] text-amber-600 mt-1">超过推荐上限 2000</p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">步骤超时</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                className="w-full h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-bold focus:outline-none focus:border-blue-400"
                placeholder="如 500"
                value={ec?.timeoutMs ?? ''}
                onChange={e => {
                  const v = e.target.value ? Number(e.target.value) : undefined;
                  onUpdate(step.id, { executionConstraints: { ...ec, timeoutMs: v } });
                }}
              />
              <span className="text-[10px] text-slate-400 shrink-0">ms</span>
            </div>
            {ec?.timeoutMs !== undefined && ec.timeoutMs < 50 && (
              <p className="text-[9px] text-amber-600 mt-1">超时过短，建议 ≥ 50ms</p>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">最大输出数</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                className="w-full h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-bold focus:outline-none focus:border-blue-400"
                placeholder="如 50"
                value={ec?.maxOutputCount ?? ''}
                onChange={e => {
                  const v = e.target.value ? Number(e.target.value) : undefined;
                  onUpdate(step.id, { executionConstraints: { ...ec, maxOutputCount: v } });
                }}
              />
              <span className="text-[10px] text-slate-400 shrink-0">条</span>
            </div>
          </div>
          <p className="col-span-3 text-[9px] text-slate-400 mt-1">超时触发步骤的兜底动作（failoverAction）；候选数超限时截断后继续评分。</p>
        </div>
      )}
    </div>
  );
}

function ResourceLockingPanel({ step, onUpdate }: {
  step: RuleStep;
  onUpdate: (id: string, updates: Partial<RuleStep>) => void;
}) {
  const [open, setOpen] = useState(false);
  const rl = step.resourceLocking;
  const isConfigured = !!rl;
  const isHard = rl?.lockType === 'HARD';
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          资源锁定
          {isConfigured && (
            <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[9px] font-black ml-1 ${isHard ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {isHard ? 'HARD' : 'SOFT'}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider w-16 shrink-0">锁定类型</span>
            <div className="flex gap-1.5">
              {(['SOFT', 'HARD'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => onUpdate(step.id, { resourceLocking: { lockType: t, acquireOnEntry: rl?.acquireOnEntry ?? true, releaseOnSuccess: rl?.releaseOnSuccess ?? true, releaseOnFailover: rl?.releaseOnFailover ?? true, lockTtlMs: rl?.lockTtlMs } })}
                  className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-all ${rl?.lockType === t ? (t === 'HARD' ? 'bg-red-600 text-white border-red-600' : 'bg-amber-500 text-white border-amber-500') : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >{t}</button>
              ))}
              {isConfigured && (
                <button type="button" onClick={() => onUpdate(step.id, { resourceLocking: undefined })}
                  className="px-2 py-1 rounded-lg text-[11px] font-black border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-all ml-1">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          {isConfigured && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: 'acquireOnEntry', label: '步骤启动时加锁' },
                  { key: 'releaseOnSuccess', label: '成功后释放' },
                  { key: 'releaseOnFailover', label: 'Failover 时回滚' },
                ] as const).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={!!rl?.[key]}
                      onChange={e => onUpdate(step.id, { resourceLocking: { ...rl!, [key]: e.target.checked } })}
                      className="w-3.5 h-3.5 rounded accent-blue-600" />
                    <span className="text-[11px] text-slate-600">{label}</span>
                  </label>
                ))}
              </div>
              {rl?.lockType === 'SOFT' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider w-16 shrink-0">锁TTL</span>
                  <input type="number" placeholder="如 5000" value={rl.lockTtlMs ?? ''}
                    onChange={e => onUpdate(step.id, { resourceLocking: { ...rl, lockTtlMs: e.target.value ? Number(e.target.value) : undefined } })}
                    className="w-28 h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-bold focus:outline-none focus:border-blue-400" />
                  <span className="text-[10px] text-slate-400">ms（超时自动释放）</span>
                </div>
              )}
              {isHard && (
                <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  硬锁（HARD）将排他性占用资源，其他步骤尝试获取同一资源时将被阻断并产生 CONFLICT 事件。
                </p>
              )}
            </>
          )}
          {!isConfigured && (
            <button type="button"
              onClick={() => onUpdate(step.id, { resourceLocking: { lockType: 'SOFT', acquireOnEntry: true, releaseOnSuccess: true, releaseOnFailover: true } })}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
              <Plus className="w-3 h-3" /> 启用资源锁定
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CostOptimizationPanel({ step, costDimensions, onUpdate }: {
  step: RuleStep;
  costDimensions: CostDimension[];
  onUpdate: (id: string, updates: Partial<RuleStep>) => void;
}) {
  const [open, setOpen] = useState(false);
  const co = step.costOptimization;
  const isEnabled = co?.enabled;
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
          <span className="text-[13px]">¥</span>
          成本优化
          {isEnabled && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 text-[9px] font-black ml-1">
              已启用
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!co?.enabled}
              onChange={e => onUpdate(step.id, { costOptimization: { enabled: e.target.checked, objective: co?.objective ?? 'MINIMIZE_TOTAL_COST', costDimensionIds: co?.costDimensionIds ?? [], maxAcceptableCost: co?.maxAcceptableCost, costWeightInSorter: co?.costWeightInSorter } })}
              className="w-3.5 h-3.5 rounded accent-emerald-600" />
            <span className="text-[12px] font-bold text-slate-700">启用成本优化目标</span>
          </label>
          {co?.enabled && (
            <>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">优化目标</label>
                <select value={co.objective}
                  onChange={e => onUpdate(step.id, { costOptimization: { ...co, objective: e.target.value as typeof co.objective } })}
                  className="w-full h-9 border border-slate-200 rounded-xl px-3 text-[12px] font-bold appearance-none focus:outline-none focus:border-emerald-400">
                  <option value="MINIMIZE_TOTAL_COST">最小化总成本</option>
                  <option value="MINIMIZE_LABOR">最小化人工成本</option>
                  <option value="MINIMIZE_EQUIPMENT">最小化设备成本</option>
                  <option value="BALANCE">均衡（多维度平衡）</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">启用成本维度</label>
                <div className="grid grid-cols-2 gap-2">
                  {costDimensions.filter(d => d.enabled).map(d => (
                    <label key={d.id} className="flex items-center gap-2 cursor-pointer border border-slate-100 rounded-lg px-3 py-2 hover:border-emerald-200 transition-colors">
                      <input type="checkbox"
                        checked={co.costDimensionIds.includes(d.id)}
                        onChange={e => {
                          const ids = e.target.checked
                            ? [...co.costDimensionIds, d.id]
                            : co.costDimensionIds.filter(id => id !== d.id);
                          onUpdate(step.id, { costOptimization: { ...co, costDimensionIds: ids } });
                        }}
                        className="w-3.5 h-3.5 rounded accent-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-slate-700 leading-none">{d.name}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{d.baseRate} {d.unit}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">成本上限</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-slate-400">¥</span>
                    <input type="number" placeholder="如 200" value={co.maxAcceptableCost ?? ''}
                      onChange={e => onUpdate(step.id, { costOptimization: { ...co, maxAcceptableCost: e.target.value ? Number(e.target.value) : undefined } })}
                      className="w-full h-8 rounded-lg border border-slate-200 px-2.5 text-[12px] font-bold focus:outline-none focus:border-emerald-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">成本权重 {co.costWeightInSorter ?? 0}%</label>
                  <input type="range" min={0} max={100} value={co.costWeightInSorter ?? 0}
                    onChange={e => onUpdate(step.id, { costOptimization: { ...co, costWeightInSorter: Number(e.target.value) } })}
                    className="w-full accent-emerald-600 mt-1.5" />
                  <div className="flex justify-between text-[9px] text-slate-400"><span>纯因子排序</span><span>纯成本排序</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Editor({ strategy, allStrategies, independentRules = [], globalGuardrails = [], onUpdateGlobalGuardrails, onBack, onSimulate, onSave, onOpenHelp }: EditorProps) {
  const [data, setData] = useState<StrategyDetail | null>(strategy);
  const [draggedFactor, setDraggedFactor] = useState<Factor | null>(null);
  const [activeRuleId, setActiveRuleId] = useState<string | null>(data?.rules?.[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [focusedStepId, setFocusedStepId] = useState<string | null>(null);
  const [hoveredFactor, setHoveredFactor] = useState<Factor | null>(null);
  const [editingParamsStepId, setEditingParamsStepId] = useState<string | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isGuardrailsOpen, setIsGuardrailsOpen] = useState(false);
  const [isStrategySettingsOpen, setIsStrategySettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'triggers' | 'traffic'>('triggers');

  const [isPayloadModalOpen, setIsPayloadModalOpen] = useState(false);

  // Auto-focus the first step when the active rule changes
  useEffect(() => {
    if (activeRule && activeRule.steps.length > 0) {
      setFocusedStepId(activeRule.steps[0].id);
    } else {
      setFocusedStepId(null);
    }
  }, [activeRuleId]);

  const handleUpdateStepSemantics = (stepId: string, patch: Partial<RuleStep>) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            steps: r.steps.map(s => {
              if (s.id !== stepId) return s;

              const nextStep = { ...s, ...patch };
              let newName = nextStep.name;
              if (s.name.includes('执行动作') || s.name.includes('执行步骤') || s.name.startsWith('新增节点') || s.name === '新步骤') {
                const input = getEffectiveInputSubject(nextStep, prev.primarySubject);
                const output = getEffectiveOutputSubject(nextStep, prev.primarySubject);
                const action = getEffectiveStepAction(nextStep);
                newName = getStepIntentLabel(action, input, output);
              }

              return { ...nextStep, name: newName };
            })
          };
        })
      };
    });
    setFocusedStepId(stepId);
  };

  // Scene complexity analytics for the intelligence header
  const sceneStats = useMemo(() => {
    if (!data) return { branched: false, subjects: [], steps: 0, priorityGroups: 0, hasGuardrails: false };
    const branches = data.rules.some(r => r.type === 'GATE');
    const subjects = Array.from(new Set(data.rules.flatMap(r => r.steps.flatMap(s => [getEffectiveInputSubject(s, data.primarySubject), getEffectiveOutputSubject(s, data.primarySubject)]))));
    const steps = data.rules.reduce((acc, current) => acc + current.steps.length, 0);
    const groups = new Set(data.rules.map(r => r.priorityGroup || 'default')).size;
    const guardrails = (data.guardrails || []).length > 0;
    return { branched: branches, subjects, steps, priorityGroups: groups, hasGuardrails: guardrails };
  }, [data]);

  const handleImportRule = (rule: StrategyRule, isFromIndependentLib: boolean = false) => {
    const clonedRule: StrategyRule = {
      ...rule,
      id: `rule-ref-${Math.floor(Math.random() * 10000)}`,
      name: `${rule.name} (引用)`,
      enabled: false,
      sourceRuleId: isFromIndependentLib ? rule.id : undefined,
    };

    setData(prev => {
      if (!prev) return prev;
      return { ...prev, rules: [...prev.rules, clonedRule] };
    });
    setActiveRuleId(clonedRule.id);
    setIsImportModalOpen(false);
  };

  function getStepOverrideCount(step: RuleStep, sourceStep: RuleStep | undefined): number {
    if (!sourceStep) return 0;
    const fields = ['filters', 'sorters', 'flowControl', 'failoverAction', 'config',
                    'executionConstraints', 'resourceLocking', 'costOptimization'] as const;
    return fields.filter(f => JSON.stringify(step[f]) !== JSON.stringify(sourceStep[f])).length;
  }

  const handleResetStepToSource = (stepId: string) => {
    if (!activeRuleId || !data) return;
    const activeRuleInData = data.rules.find(r => r.id === activeRuleId);
    const srcRule = independentRules.find(r => r.id === activeRuleInData?.sourceRuleId);
    const srcStep = srcRule?.steps.find(s => s.id === stepId);
    if (!srcStep) return;
    handleUpdateStep(stepId, {
      filters: srcStep.filters,
      sorters: srcStep.sorters,
      flowControl: srcStep.flowControl,
      failoverAction: srcStep.failoverAction,
      config: srcStep.config,
      executionConstraints: srcStep.executionConstraints,
      resourceLocking: srcStep.resourceLocking,
      costOptimization: srcStep.costOptimization,
    });
  };

  const handleAddStep = () => {
    if (!activeRuleId) return;
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          const newStep = createDefaultStep(prev.primarySubject, r.steps.length + 1);
          newStep.name = `${getStepIntentLabel(newStep.action || 'VALIDATE', newStep.inputSubject || prev.primarySubject, newStep.outputSubject || prev.primarySubject)} (新动作 #${r.steps.length + 1})`;
          return { ...r, steps: [...r.steps, newStep] };
        })
      };
    });
  };

  const handleRemoveStep = (stepId: string) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            steps: r.steps
              .filter(s => s.id !== stepId)
              .map(s => ({
                ...s,
                upstreamBindings: s.upstreamBindings?.filter(binding => binding.stepId !== stepId),
              }))
          };
        })
      };
    });
  };

  const handleAddUpstreamBinding = (stepId: string) => {
    setData((prev: StrategyDetail | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map((r: StrategyRule) => {
          if (r.id !== activeRuleId) return r;
          const stepIndex = r.steps.findIndex((s: RuleStep) => s.id === stepId);
          if (stepIndex <= 0) return r;

          const currentStep = r.steps[stepIndex];
          const availableSteps = r.steps.slice(0, stepIndex);
          const existingBindingStepIds = new Set((currentStep.upstreamBindings ?? []).map((binding: StepInputBinding) => binding.stepId));
          const sourceStep = [...availableSteps].reverse().find((candidate: RuleStep) => !existingBindingStepIds.has(candidate.id));
          if (!sourceStep) return r;

          const sourceOutputSubject = getEffectiveOutputSubject(sourceStep, prev.primarySubject);
          const aliasBase = sourceStep.name
            .replace(/\s+/g, '_')
            .replace(/[^\w一-龥]/g, '')
            .slice(0, 24) || 'upstream';

          return {
            ...r,
            steps: r.steps.map((s: RuleStep) => {
              if (s.id !== stepId) return s;
              return {
                ...s,
                upstreamBindings: [
                  ...(s.upstreamBindings ?? []),
                  {
                    stepId: sourceStep.id,
                    alias: aliasBase,
                    subject: sourceOutputSubject,
                    required: true,
                    mode: 'LIST',
                  },
                ],
              };
            }),
          };
        }),
      };
    });
  };

  const handleUpdateUpstreamBinding = (stepId: string, bindingStepId: string, patch: Partial<StepInputBinding>) => {
    setData((prev: StrategyDetail | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map((r: StrategyRule) => {
          if (r.id !== activeRuleId) return r;
          const stepIndex = r.steps.findIndex((s: RuleStep) => s.id === stepId);
          if (stepIndex === -1) return r;
          const availableSteps = r.steps.slice(0, stepIndex);

          return {
            ...r,
            steps: r.steps.map((s: RuleStep) => {
              if (s.id !== stepId) return s;
              return {
                ...s,
                upstreamBindings: (s.upstreamBindings ?? []).map((binding: StepInputBinding) => {
                  if (binding.stepId !== bindingStepId) return binding;
                  const nextBinding = { ...binding, ...patch };
                  if (patch.stepId) {
                    const sourceStep = availableSteps.find((candidate: RuleStep) => candidate.id === patch.stepId);
                    if (sourceStep) {
                      nextBinding.subject = getEffectiveOutputSubject(sourceStep, prev.primarySubject);
                    }
                  }
                  return nextBinding;
                }),
              };
            }),
          };
        }),
      };
    });
  };

  const handleRemoveUpstreamBinding = (stepId: string, bindingStepId: string) => {
    setData((prev: StrategyDetail | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map((r: StrategyRule) => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            steps: r.steps.map((s: RuleStep) => {
              if (s.id !== stepId) return s;
              return {
                ...s,
                upstreamBindings: (s.upstreamBindings ?? []).filter((binding: StepInputBinding) => binding.stepId !== bindingStepId),
              };
            }),
          };
        }),
      };
    });
  };

  const handleSave = () => {
    if (data) onSave(data);
  };

  const handleDropFactor = (stepId: string, factor: Factor) => {
    setData(prev => {
      if (!prev) return prev;
      const newRules = prev.rules.map(rule => {
        if (rule.id !== activeRuleId) return rule;
        const newSteps = rule.steps.map(s => {
          if (s.id === stepId) {
            if (s.sorters.some(x => x.factorId === factor.id)) return s; // prevent duplicate
            return {
               ...s,
               sorters: [...s.sorters, { factorId: factor.id, factorName: factor.name, weight: 10, direction: 'DESC' as const }]
            }
          }
          return s;
        });
        return { ...rule, steps: newSteps };
      });
      return { ...prev, rules: newRules };
    });
  };

  const handleRemoveFactor = (stepId: string, factorId: string) => {
    setData(prev => {
      if (!prev) return prev;
      const newRules = prev.rules.map(rule => {
        if (rule.id !== activeRuleId) return rule;
        const newSteps = rule.steps.map(s => {
          if (s.id === stepId) {
            return {
               ...s,
               sorters: s.sorters.filter(x => x.factorId !== factorId)
            }
          }
          return s;
        });
        return { ...rule, steps: newSteps };
      });
      return { ...prev, rules: newRules };
    });
  };
  
  const handleWeightChange = (stepId: string, factorId: string, newWeight: number) => {
    setData(prev => {
      if (!prev) return prev;
      const newRules = prev.rules.map(rule => {
        if (rule.id !== activeRuleId) return rule;
        const newSteps = rule.steps.map(s => {
          if (s.id === stepId) {
            return {
               ...s,
               sorters: s.sorters.map(x => x.factorId === factorId ? { ...x, weight: newWeight } : x)
            }
          }
          return s;
        });
        return { ...rule, steps: newSteps };
      });
      return { ...prev, rules: newRules };
    });
  };

  const handleAddRule = (atIndex?: number) => {
    const rules = data?.rules || [];
    // If no index provided, add to end. Otherwise insert at specified index.
    const insertIndex = atIndex !== undefined ? atIndex : rules.length;
    
    // Inherit group from context: either the current node at that index, or the last one
    const contextGroup = atIndex !== undefined && atIndex > 0 
      ? rules[atIndex - 1].priorityGroup 
      : (rules[rules.length - 1]?.priorityGroup);

    const newRule: StrategyRule = {
      id: `rule-${Math.floor(Math.random() * 1000)}`,
      name: `新增规则 ${rules.length + 1}`,
      description: '',
      enabled: true,
      priorityGroup: contextGroup,
      matchingCriteria: [],
      steps: [
        {
          id: `step-${Date.now()}`,
          name: '默认寻址动作',
          filters: [],
          sorters: [],
          failoverAction: 'NEXT_STEP' as const,
          flowControl: 'TERMINATE' as const
        }
      ]
    };

    setData(prev => {
      if (!prev) return prev;
      const newRules = [...prev.rules];
      newRules.splice(insertIndex, 0, newRule);
      return { ...prev, rules: newRules };
    });
    setActiveRuleId(newRule.id);
  };

  const handleMoveRule = (ruleId: string, direction: 'left' | 'right') => {
    setData(prev => {
      if (!prev) return prev;
      const index = prev.rules.findIndex(r => r.id === ruleId);
      if (index === -1) return prev;
      if (direction === 'left' && index === 0) return prev;
      if (direction === 'right' && index === prev.rules.length - 1) return prev;

      const newRules = [...prev.rules];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];
      return { ...prev, rules: newRules };
    });
  };

  const handleMoveGroup = (groupName: string, direction: 'left' | 'right') => {
    setData(prev => {
      if (!prev) return prev;
      
      // Identify unique groups in their current sequence order
      const groupsInOrder: string[] = [];
      prev.rules.forEach(r => {
        const gn = r.priorityGroup || '未命名分组';
        if (!groupsInOrder.includes(gn)) groupsInOrder.push(gn);
      });
      
      const currentGroupIndex = groupsInOrder.indexOf(groupName);
      if (currentGroupIndex === -1) return prev;
      if (direction === 'left' && currentGroupIndex === 0) return prev;
      if (direction === 'right' && currentGroupIndex === groupsInOrder.length - 1) return prev;
      
      const targetGroupIndex = direction === 'left' ? currentGroupIndex - 1 : currentGroupIndex + 1;
      
      // Swap group names in the order array
      const newGroupOrder = [...groupsInOrder];
      [newGroupOrder[currentGroupIndex], newGroupOrder[targetGroupIndex]] = [newGroupOrder[targetGroupIndex], newGroupOrder[currentGroupIndex]];
      
      // Rebuild rules list based on the new group order
      const newRules: StrategyRule[] = [];
      newGroupOrder.forEach(gn => {
        newRules.push(...prev.rules.filter(r => (r.priorityGroup || '未命名分组') === gn));
      });
      
      return { ...prev, rules: newRules };
    });
  };

  const handleUpdateRuleProperty = (ruleId: string, field: keyof StrategyRule, value: any) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => r.id === ruleId ? { ...r, [field]: value } : r)
      };
    });
  };

  const setRuleArchitecture = (mode: 'PIPELINE' | 'WATERFALL' | 'JUMP' | 'GATE') => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== (activeRuleId)) return r;
          let updates: Partial<StrategyRule> = {};
          if (mode === 'PIPELINE') updates = { type: 'DIMENSION', flowControl: 'CONTINUE' };
          if (mode === 'WATERFALL') updates = { type: 'DIMENSION', flowControl: 'TERMINATE' };
          if (mode === 'JUMP') updates = { type: 'DIMENSION', flowControl: 'JUMP' };
          if (mode === 'GATE') updates = { type: 'GATE', flowControl: 'TERMINATE' };
          
          // Ensure branches exist if switching to GATE
          if (mode === 'GATE' && (!r.branches || r.branches.length === 0)) {
            updates.branches = [
              { id: `br-${Date.now()}-1`, conditionLabel: '分支 1', targetRuleId: '', criteria: [] },
              { id: `br-${Date.now()}-2`, conditionLabel: '分支 2', targetRuleId: '', criteria: [] }
            ];
          }
          
          return { ...r, ...updates };
        })
      };
    });
  };

  const handleRemoveRule = (ruleId: string) => {
    setData(prev => {
      if (!prev) return prev;
      const newRules = prev.rules.filter(r => r.id !== ruleId);
      
      // If we're removing the active rule, let's pick another one
      if (activeRuleId === ruleId) {
        const nextActive = newRules[0]?.id || null;
        // This is a bit hacky to update another state during functional update of one state,
        // but it ensures they stay in sync relative to the same snapshotted data.
        setTimeout(() => setActiveRuleId(nextActive), 0);
      }
      
      return { ...prev, rules: newRules };
    });
  };

  const handleUpdateStepName = (stepId: string, newName: string) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            steps: r.steps.map(s => s.id === stepId ? { ...s, name: newName } : s)
          };
        })
      };
    });
  };

  const handleUpdateCriteria = (criteriaId: string, field: string, operator: any, value: string) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            matchingCriteria: r.matchingCriteria.map(c =>
              c.id === criteriaId ? { ...c, field, operator, value } : c
            )
          };
        })
      };
    });
  };

  const handleUpdateCriteriaFull = (criteriaId: string, updates: Partial<MatchingCondition>) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            matchingCriteria: r.matchingCriteria.map(c =>
              c.id === criteriaId ? { ...c, ...updates } : c
            )
          };
        })
      };
    });
  };

  const handleMoveStep = (stepId: string, direction: 'up' | 'down') => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          const index = r.steps.findIndex(s => s.id === stepId);
          if (index === -1) return r;
          if (direction === 'up' && index === 0) return r;
          if (direction === 'down' && index === r.steps.length - 1) return r;

          const newSteps = [...r.steps];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
          return { ...r, steps: newSteps };
        })
      };
    });
  };

  const handleAddCriteria = () => {
    setData(prev => {
      if (!prev || !activeRuleId) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            matchingCriteria: [
              ...r.matchingCriteria,
              { id: `c-${Date.now()}`, field: '新增属性', operator: '==', value: '待填', logicalOperator: 'AND' }
            ]
          };
        })
      };
    });
  };

  const handleAddBranch = () => {
    setData(prev => {
      if (!prev || !activeRuleId) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          const currentBranches = r.branches || [];
          return {
            ...r,
            branches: [
              ...currentBranches,
              { id: `br-${Date.now()}`, criteria: [], targetRuleId: '', label: '新决策路径' }
            ]
          };
        })
      };
    });
  };

  const handleRemoveBranch = (id: string) => {
    setData(prev => {
      if (!prev || !activeRuleId) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            branches: (r.branches || []).filter(b => b.id !== id)
          };
        })
      };
    });
  };

  const handleUpdateBranch = (id: string, field: string, value: any) => {
    setData(prev => {
      if (!prev || !activeRuleId) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            branches: (r.branches || []).map(b => b.id === id ? { ...b, [field]: value } : b)
          };
        })
      };
    });
  };

  const handleRemoveCriteria = (id: string) => {
    setData(prev => {
      if (!prev || !activeRuleId) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            matchingCriteria: r.matchingCriteria.filter(c => c.id !== id)
          };
        })
      };
    });
  };

  const handleAddFilter = (stepId: string) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            steps: r.steps.map(s => {
              if (s.id !== stepId) return s;
              return {
                ...s,
                filters: [
                  ...s.filters,
                  { id: `f-${Math.random().toString(36).substr(2, 9)}`, field: '新条件', operator: '==', value: '' }
                ]
              };
            })
          };
        })
      };
    });
  };

  const handleUpdateFilter = (stepId: string, filterId: string, field: string, operator: string, value: string) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            steps: r.steps.map(s => {
              if (s.id !== stepId) return s;
              return {
                ...s,
                filters: s.filters.map(f => f.id === filterId ? { ...f, field, operator, value } : f)
              };
            })
          };
        })
      };
    });
  };

  const handleUpdateStepConfig = (stepId: string, key: string, value: any) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            steps: r.steps.map(s => {
              if (s.id !== stepId) return s;
              return {
                ...s,
                config: { ...s.config, [key]: value }
              };
            })
          };
        })
      };
    });
  };

  const handleUpdateStep = (stepId: string, updates: Partial<RuleStep>) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            steps: r.steps.map(s => s.id === stepId ? { ...s, ...updates } : s)
          };
        })
      };
    });
  };

  const handleRemoveFilter = (stepId: string, filterId: string) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rules: prev.rules.map(r => {
          if (r.id !== activeRuleId) return r;
          return {
            ...r,
            steps: r.steps.map(s => {
              if (s.id !== stepId) return s;
              return {
                ...s,
                filters: s.filters.filter(f => f.id !== filterId)
              };
            })
          };
        })
      };
    });
  };

  if (!data) return <div className="p-8">策略未找到</div>;

  const activeRule = data.rules.find(r => r.id === activeRuleId) || data.rules[0];
  const focusedStep = activeRule?.steps.find(s => s.id === focusedStepId);
  const activeDragOrHoverFactor = draggedFactor || hoveredFactor;
  const effectiveInputSubject = focusedStep ? getEffectiveInputSubject(focusedStep, data.primarySubject) : data.primarySubject;
  const effectiveOutputSubject = focusedStep ? getEffectiveOutputSubject(focusedStep, data.primarySubject) : data.primarySubject;
  const effectiveAction = focusedStep ? getEffectiveStepAction(focusedStep) : 'VALIDATE';

  const getSubjectLabel = (subject: FactorTarget) => {
    const meta = getObjectMeta(subject);
    return meta ? `${meta.icon ? `${meta.icon} ` : ''}${meta.name}` : '⚙️ 环境';
  };

  const stepTypeDescriptions: Record<RuleStepType, string> = {
    FILTER: '处理模式：先判断当前主体是否保留',
    SELECT: '处理模式：对候选集做评分、排序与选优',
    TRANSFORM: '处理模式：把输入主体转换成新的输出主体',
    GATEWAY: '处理模式：基于条件决定后续分支路径',
  };

  const stepActionDescriptions: Record<RuleStepAction, string> = {
    NONE: '暂不声明具体动作',
    VALIDATE: '做校验判断',
    SELECT: '做选优',
    RECOMMEND: '输出推荐结果',
    ASSIGN: '执行分配或指派',
    ROUTE: '决定路由去向',
    LOCK: '执行锁定',
    ALLOCATE: '执行资源分拨',
    GENERATE_TASK: '生成任务',
    SPLIT: '拆分对象或任务',
    SUSPEND: '挂起等待处理',
    RELEASE: '执行释放',
    REDIRECT: '重定向到新去向',
  };

  type StepDetailSectionKey = 'filters' | 'sorters' | 'config';
  type StepDetailPriority = 'primary' | 'secondary' | 'tertiary';

  const sectionPriorityClasses: Record<StepDetailPriority, { container: string; title: string; hint: string }> = {
    primary: {
      container: 'rounded-[16px] border border-blue-200 bg-blue-50/40 p-4',
      title: 'text-theme-ink',
      hint: 'text-blue-700',
    },
    secondary: {
      container: 'rounded-[16px] border border-slate-200 bg-white p-4',
      title: 'text-theme-ink',
      hint: 'text-slate-500',
    },
    tertiary: {
      container: 'rounded-[16px] border border-slate-100 bg-slate-50/70 p-4',
      title: 'text-slate-600',
      hint: 'text-slate-400',
    },
  };

  const getStepDetailPresentation = (stepType: RuleStepType) => {
    switch (stepType) {
      case 'SELECT':
        return {
          sections: [
            { key: 'filters' as const, priority: 'primary' as const, hint: '先用硬性约束过滤不合格候选，再进入评分选优。', hideEmptyState: false },
            { key: 'sorters' as const, priority: 'secondary' as const, hint: '在通过约束的候选中做评分、排序和最优选择。', hideEmptyState: false },
            { key: 'config' as const, priority: 'tertiary' as const, hint: '通过参数补充排序偏好或选择模式。', hideEmptyState: false },
          ],
        };
      case 'TRANSFORM':
        return {
          sections: [
            { key: 'config' as const, priority: 'primary' as const, hint: '本步骤重点在主体迁移、映射规则和转换参数。', hideEmptyState: false },
            { key: 'filters' as const, priority: 'secondary' as const, hint: '先约束哪些输入对象可以进入转换。', hideEmptyState: false },
            { key: 'sorters' as const, priority: 'tertiary' as const, hint: '评分只作为辅助，不是当前步骤主轴。', hideEmptyState: false },
          ],
        };
      case 'GATEWAY':
        return {
          sections: [
            { key: 'filters' as const, priority: 'primary' as const, hint: '本步骤重点在条件判断和后续流向控制。', hideEmptyState: false },
            { key: 'config' as const, priority: 'secondary' as const, hint: '通过参数补充分支、路由或门槛逻辑。', hideEmptyState: false },
            { key: 'sorters' as const, priority: 'tertiary' as const, hint: '网关步骤通常不依赖评分排序。', hideEmptyState: true },
          ],
        };
      case 'FILTER':
      default:
        return {
          sections: [
            { key: 'filters' as const, priority: 'primary' as const, hint: '本步骤重点在判断是否保留当前主体。', hideEmptyState: false },
            { key: 'config' as const, priority: 'secondary' as const, hint: '通过参数补充过滤门槛与执行边界。', hideEmptyState: false },
            { key: 'sorters' as const, priority: 'tertiary' as const, hint: '评分只作为补充能力，不抢主视觉。', hideEmptyState: false },
          ],
        };
    }
  };

  const stepBindingModeDescriptions: Record<NonNullable<StepInputBinding['mode']>, { label: string; hint: string }> = {
    ONE: {
      label: '单结果',
      hint: '只引用一个明确结果，适合最优库位、最终推荐项。',
    },
    LIST: {
      label: '候选列表',
      hint: '引用一批候选结果，适合库存池、需求集合、评分输入。',
    },
    MAP: {
      label: '索引映射',
      hint: '按键组织上游结果，适合按 SKU / 门店 / 温区做索引查询。',
    },
  };

  const getStepIntentLabel = (action: RuleStepAction, input: FactorTarget, output: FactorTarget) => {
    const actionLabel = {
      VALIDATE: '校验',
      SELECT: '优选',
      RECOMMEND: '推荐',
      ASSIGN: '分配',
      ROUTE: '路由',
      LOCK: '锁定',
      ALLOCATE: '分拨',
      GENERATE_TASK: '生成任务',
      SPLIT: '拆分',
      SUSPEND: '挂起',
      RELEASE: '释放',
      REDIRECT: '改道',
      NONE: '处理',
    }[action] ?? '处理';

    if (input === output) {
      return `${actionLabel}${getSubjectLabel(input).replace(/^.[ ]/, '')}`;
    }

    return `${actionLabel}${getSubjectLabel(input).replace(/^.[ ]/, '')} → ${getSubjectLabel(output).replace(/^.[ ]/, '')}`;
  };

  const stepIntentName = getStepIntentLabel(effectiveAction, effectiveInputSubject, effectiveOutputSubject);
  const focusedActionMeta = getActionMeta(effectiveAction);
  const focusedAttributes = getAttributesByObject(effectiveInputSubject);

  const factorGroups = mockFactors
    .filter(f =>
      (f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase())))
      && (!focusedStep || f.targetObject === effectiveInputSubject || !f.applicableActions?.length)
      && (!focusedStep || !f.applicableActions?.length || f.applicableActions.includes(effectiveAction))
      && (!focusedStep || !f.applicableStepTypes?.length || f.applicableStepTypes.includes(getEffectiveStepType(focusedStep)))
    )
    .sort((a, b) => {
       // Primary sorting by focused step subject
       if (a.targetObject === effectiveInputSubject && b.targetObject !== effectiveInputSubject) return -1;
       if (a.targetObject !== effectiveInputSubject && b.targetObject === effectiveInputSubject) return 1;
       
       // Secondary sorting by strategy default
       if (a.targetObject === data.primarySubject && b.targetObject !== data.primarySubject) return -1;
       if (a.targetObject !== data.primarySubject && b.targetObject === data.primarySubject) return 1;
       
       return 0;
    })
    .reduce((acc, f) => {
      if (!acc[f.targetObject]) acc[f.targetObject] = [];
      acc[f.targetObject].push(f);
      return acc;
    }, {} as Record<string, Factor[]>);

  const validationResult: ValidationResult | null = useMemo(() => {
    if (!data) return null;
    return validateStrategyGraph(data);
  }, [data]);

  const hasValidationErrors = validationResult && !validationResult.valid;
  const hasValidationWarnings = validationResult && validationResult.valid && validationResult.issues.length > 0;

  return (
    <div className="flex flex-col bg-theme-bg h-full font-sans text-theme-ink overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-theme-border bg-theme-card px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Button variant="ghost" onClick={onBack} className="min-h-9 px-2 text-theme-muted">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline">
                <h1 className="m-0 text-[18px] font-medium tracking-tight">策略实例编辑器：{data.name}</h1>
                <span className="break-all text-[12px] font-mono opacity-60 lg:ml-3">ID: {data.id} / {data.version} ({data.status})</span>
              </div>
              <span className="text-[11px] text-theme-muted">实例层 · 装配公共规则、私有规则、Guardrail 与参数化配置</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Button
              variant="ghost"
              className="relative min-h-9 gap-2 rounded-full px-3 text-blue-600 transition-colors hover:bg-blue-50"
              onClick={() => setIsGuideModalOpen(true)}
            >
              <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-white bg-blue-500 animate-pulse"></div>
              <HelpCircle className="w-4 h-4" />
              <span className="text-[13px] font-bold">实例装配指南</span>
            </Button>
            <Button
              variant="ghost"
              className="min-h-9 gap-2 rounded-full border border-theme-border px-3 text-theme-muted transition-colors hover:bg-theme-pill"
              onClick={() => setIsPayloadModalOpen(true)}
            >
              <Code className="w-4 h-4" />
              <span className="text-[13px] font-medium">查看实例报文</span>
            </Button>
            <div className="hidden h-6 w-px bg-theme-border xl:block"></div>
            <Button variant="secondary" className="min-h-9 bg-black/5 text-theme-ink hover:bg-black/10">实例版本</Button>
            <Button variant="outline" className="min-h-9 gap-2 relative" onClick={() => setIsStrategySettingsOpen(true)}>
              <Settings className="w-4 h-4" /> 实例属性
              {(data?.triggerConditions?.some(t => t.enabled) || data?.trafficSplit?.enabled) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
              )}
            </Button>
            <Button variant="accent" className="min-h-9 gap-2" onClick={() => onSimulate(data!.id, activeRuleId || undefined)}>
              <Play className="w-3.5 h-3.5 fill-current" /> 仿真验证
            </Button>
            <Button variant="primary" className="min-h-9 gap-2" onClick={handleSave}>
              保存实例
            </Button>
          </div>
        </div>
      </header>

      {/* Validation Status Bar */}
      {validationResult && validationResult.issues.length > 0 && (
        <div className={`shrink-0 border-b px-4 py-2 flex items-center gap-3 flex-wrap ${hasValidationErrors ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className={`flex items-center gap-1.5 text-[11px] font-black ${hasValidationErrors ? 'text-red-700' : 'text-amber-700'}`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            策略校验
          </div>
          <div className="flex flex-wrap gap-2">
            {validationResult.issues.map((issue, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-default ${
                  issue.severity === 'ERROR'
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-amber-100 text-amber-700 border-amber-200'
                }`}
                title={issue.message}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${issue.severity === 'ERROR' ? 'bg-red-500' : 'bg-amber-500'}`} />
                {issue.message.length > 60 ? issue.message.slice(0, 60) + '…' : issue.message}
              </span>
            ))}
          </div>
          {hasValidationErrors && (
            <span className="ml-auto text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
              存在错误，无法激活
            </span>
          )}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 overflow-hidden min-h-0 xl:grid-cols-[280px_minmax(0,1fr)]">
        
        {/* Factor Library Sidebar */}
        <aside className="border-b border-theme-border bg-[#FBFBFB] flex flex-col h-full relative z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)] min-h-0 xl:border-b-0 xl:border-r">
          <div className="p-5 border-b border-theme-border bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black uppercase text-theme-muted tracking-[0.1em] flex items-center gap-2">
                 <div className="w-1 h-3 bg-theme-primary rounded-full"></div>
                 算法因子实验室
              </h2>
              {focusedStep && (
                <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-90">
                   <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                   <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">联动中</span>
                </div>
              )}
            </div>
            
            <div className="relative group/search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-theme-muted group-focus-within/search:text-theme-primary transition-colors" />
              <Input
                type="text"
                className="pl-9 h-10 text-[12px] bg-theme-bg border-theme-border focus:bg-white focus:ring-4 focus:ring-theme-primary/5 transition-all rounded-xl"
                placeholder="搜索因子名称或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {focusedStep && (
              <div className="mt-4 p-3 bg-blue-600 rounded-[12px] shadow-lg shadow-blue-500/20 border border-blue-400/50 animate-in slide-in-from-top-3 duration-300">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                     <Settings className="w-3 h-3 text-blue-100" />
                     <span className="text-[10px] text-white font-bold tracking-wider">智能算法推荐</span>
                   </div>
                   <Badge variant="neutral" className="bg-white/20 text-white border-none text-[9px] h-4">Context</Badge>
                </div>
                <p className="text-[11px] text-blue-50 leading-relaxed font-medium">
                  基于 <span className="text-white font-black underline decoration-blue-300/50 underline-offset-4">{stepIntentName}</span> 业务特征，已自动为您重排并置顶原生维度因子。
                </p>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {['CONTEXT', 'ORDER_LINE', 'INVENTORY_LOT', 'LOCATION', 'EQUIPMENT', 'OPERATOR', 'CARRIER', 'STAGING_AREA'].map(target => {
              const groupFactors = factorGroups[target] || [];
              if (groupFactors.length === 0) return null;
              
              return (
                <div key={target} className="py-2 border-b border-[#F2F2F7] last:border-none">
                  <div className="px-5 py-2 text-[10px] font-bold text-theme-muted uppercase tracking-[0.15em] bg-[#F2F2F7]/50 flex items-center justify-between sticky top-[-1px] z-[5] backdrop-blur-sm">
                    <span className="flex items-center gap-2">
                      {target === effectiveInputSubject && <div className="w-1 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>}
                      {target === 'LOCATION' ? '🏬 库位空间 (Location)' : 
                       target === 'INVENTORY_LOT' ? '📦 库存批次 (Inv Lot)' : 
                       target === 'EQUIPMENT' ? '🤖 物理设备 (Equipment)' : 
                       target === 'ORDER_LINE' ? '📑 单据细项 (Order Line)' : 
                       target === 'CONTEXT' ? '⚖️ 运行环境 (Context)' : 
                       target === 'OPERATOR' ? '👤 班次人员 (Operator)' : 
                       target === 'CARRIER' ? '🚢 载具容器 (Carrier)' : '🏢 发货月台 (Staging)'}
                    </span>
                    <Badge variant="neutral" className="text-[9px] h-4 min-w-[1.5rem] px-1.5 bg-white border-theme-border shadow-sm text-theme-muted font-bold">
                      {groupFactors.length}
                    </Badge>
                  </div>
                  <div className="px-2 space-y-1 py-1">
                  {groupFactors.map(factor => (
                    <div 
                      key={factor.id} 
                      draggable
                      onDragStart={() => {
                        setDraggedFactor(factor);
                        setFocusedStepId(null); 
                      }}
                      onDragEnd={() => setDraggedFactor(null)}
                      onMouseEnter={() => setHoveredFactor(factor)}
                      onMouseLeave={() => setHoveredFactor(null)}
                      className={`px-3 py-3 rounded-[10px] flex items-center gap-3 text-[12px] cursor-grab active:cursor-grabbing transition-all border border-transparent ${factor.targetObject === effectiveInputSubject ? 'bg-blue-50/40 border-blue-100/50' : 'hover:bg-white hover:border-theme-border/50 hover:shadow-md'}`}
                    >
                      <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-[14px] transition-all shadow-sm shrink-0 ${factor.targetObject === effectiveInputSubject ? 'bg-blue-600 text-white ring-4 ring-blue-500/10' : 'bg-white border border-theme-border group-hover:bg-theme-bg'}`}>
                        {factor.targetObject === 'LOCATION' ? '🏬' : 
                         factor.targetObject === 'INVENTORY_LOT' ? '📦' : 
                         factor.targetObject === 'EQUIPMENT' ? '🤖' : 
                         factor.targetObject === 'ORDER_LINE' ? '📑' : 
                         factor.targetObject === 'CONTEXT' ? '⚖️' : 
                         factor.targetObject === 'OPERATOR' ? '👤' : 
                         factor.targetObject === 'CARRIER' ? '🚢' : '🏢'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className={`font-bold tracking-tight truncate ${factor.targetObject === effectiveInputSubject ? 'text-blue-900' : 'text-theme-ink opacity-85'}`}>
                            {factor.name}
                          </div>
                          {factor.targetObject === effectiveInputSubject && (
                            <div className="h-1 w-1 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>
                          )}
                        </div>
                        <div className="text-[9px] text-theme-muted mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="px-1.5 py-0.5 bg-[#F8F9FA] rounded-[4px] border border-theme-border font-mono font-bold leading-none">{factor.category}</span>
                          <span className={`px-1.5 py-0.5 rounded-[4px] font-bold leading-none border ${
                            factor.impactType === 'CONSTRAINT' ? 'bg-red-50 text-red-600 border-red-100' :
                            factor.impactType === 'ADJUSTMENT' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            'bg-purple-50 text-purple-600 border-purple-100'
                          }`}>
                            {factor.impactType === 'CONSTRAINT' ? '约束' :
                             factor.impactType === 'ADJUSTMENT' ? '调节' : '行为'}
                          </span>
                          
                          {/* Recognition Badge */}
                          {factor.targetObject === effectiveInputSubject ? (
                            <span className="text-[9px] text-blue-700 font-extrabold bg-blue-100/50 px-1.5 rounded-[3px] border border-blue-200/40">
                               NATIVE (原生)
                            </span>
                          ) : (
                            <span className="text-[9px] text-theme-muted font-medium bg-[#F2F2F7] px-1.5 rounded-[3px] border border-transparent">
                               MAPPED (跨对象)
                            </span>
                          )}
                        </div>
                        
                        {/* Recommendation Highlight */}
                        {factor.targetObject === effectiveInputSubject && (
                          <div className="mt-2 text-[8px] bg-theme-success/10 text-theme-success border border-theme-success/20 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit animate-in fade-in zoom-in-95">
                             <div className="w-1 h-1 rounded-full bg-theme-success animate-pulse"></div>
                             完美匹配当前阶段
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Editor Canvas */}
        <div className="min-h-0 space-y-0 overflow-y-auto bg-[#F8F9FA] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 flex flex-col items-center">
          <div className="w-full max-w-[1360px] flex flex-col gap-5">
            
            {/* Strategy Intelligence Header - Replaces the old context banner for higher polish */}
            <div className="-mt-4 -mx-4 mb-8 overflow-hidden border-b border-theme-border bg-white px-4 py-6 shadow-sm relative sm:-mt-6 sm:-mx-6 sm:px-6 lg:-mt-8 lg:-mx-8 lg:px-8 xl:flex xl:items-start xl:justify-between">
               <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/20 to-transparent pointer-events-none"></div>
               <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-4">
                  <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                     <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-white shadow-xl shadow-slate-200">
                        <Zap className="w-6 h-6 text-theme-primary" />
                     </div>
                     <div className="flex min-w-0 flex-col">
                        <div className="flex flex-wrap items-center gap-3">
                           <h1 className="text-[24px] font-black text-theme-ink tracking-tight uppercase leading-none">{data.name}</h1>
                           {data.name.includes('数量') && (
                             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 text-white rounded-[4px] text-[10px] font-black shadow-sm animate-pulse">
                                <Scale className="w-3.5 h-3.5" />
                                数量强控
                             </div>
                           )}
                           <Badge variant="neutral" className="bg-slate-100 text-slate-500 font-mono tracking-tighter uppercase text-[10px] h-5">
                              {data.id}
                           </Badge>
                        </div>
                        
                        {/* 层次结构引导 (Hierarchy Guide) */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 bg-slate-50 w-fit px-3 py-1 rounded-full border border-slate-200/60 shadow-inner">
                           <div className="flex items-center gap-1.5">
                              <LayoutGrid className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">策略 (Strategy)</span>
                           </div>
                           <ChevronRight className="w-3 h-3 text-slate-300" />
                           <div className="flex items-center gap-1.5">
                              <GitBranch className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">规则 (Rule)</span>
                           </div>
                           <ChevronRight className="w-3 h-3 text-slate-300" />
                           <div className="flex items-center gap-1.5">
                              <Zap className="w-3 h-3 text-indigo-500" />
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">步骤 (Step)</span>
                           </div>
                        </div>

                            <div className="mt-3 flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-4">
                               <div className="flex items-center gap-1.5 text-theme-muted text-[11px] font-bold opacity-60">
                                  <Code className="w-3.5 h-3.5" />
                                  Ver. {data.version}
                               </div>
                               <div className="flex items-center gap-1.5 text-theme-muted text-[11px] font-bold opacity-60">
                                  <Workflow className="w-3.5 h-3.5" />
                                  驱动对象: {data.primarySubject}
                               </div>
                            </div>
                            <div className="max-w-[860px] rounded-2xl border border-blue-100/60 bg-blue-50/40 p-4 shadow-sm xl:max-w-[760px]">
                               <div className="flex items-center gap-2 text-blue-600 mb-2">
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">策略业务蓝图与逻辑说明</span>
                               </div>
                               <p className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                                  {data.scenario || '暂无详细业务场景说明'}
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>

                  <div className="flex flex-wrap items-center gap-3 mt-4">
                     {sceneStats.branched && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-100 text-[11px] font-bold shadow-sm">
                           <GitMerge className="w-4 h-4" />
                           分支决策图
                        </div>
                     )}
                     {sceneStats.priorityGroups > 1 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 text-[11px] font-bold shadow-sm">
                           <Layers className="w-4 h-4" />
                           多级流水线
                        </div>
                     )}
                     {sceneStats.subjects.length > 1 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full border border-teal-100 text-[11px] font-bold shadow-sm">
                           <Workflow className="w-4 h-4" />
                           跨对象协同
                        </div>
                     )}
                     {sceneStats.hasGuardrails && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-full border border-red-100 text-[11px] font-bold shadow-sm">
                           <ShieldCheck className="w-4 h-4" />
                           全局合规拦截防护
                        </div>
                     )}
                     <div className="w-px h-4 bg-slate-200 mx-1"></div>
                     <span className="text-[11px] text-theme-muted font-medium italic opacity-70">
                        * 已挂载 {data.rules.length} 个规则维度及 {sceneStats.steps} 个语义步骤
                     </span>
                  </div>
               </div>

               <div className="relative z-10 mt-4 flex shrink-0 flex-col gap-3 xl:mt-0 xl:items-end">
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                       <div className="flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white shadow-lg shadow-emerald-500/20 animate-pulse">
                          <Activity className="w-3 h-3" />
                          已同步最新业务逻辑 v4.1.0
                       </div>
                       <Button variant="ghost" className="min-h-10 gap-2 border border-slate-200 bg-white px-4 text-[13px] font-bold hover:bg-slate-50" onClick={onOpenHelp}>
                        <BookOpen className="w-4 h-4" />
                        最佳实践
                     </Button>
                     <Button variant="primary" className="min-h-10 gap-2 px-6 text-[13px] font-bold shadow-lg shadow-blue-500/20" onClick={handleSave}>
                        <Save className="w-4 h-4" />
                        持久化保存
                     </Button>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-theme-muted opacity-60">
                     <Activity className="w-3.5 h-3.5 text-orange-400" />
                     实时资产计算健康度: <span className="ml-1 font-black text-emerald-500">EXCELLENT</span>
                  </div>
               </div>
            </div>

            {/* Old Strategy Context Banner Section removed for polish */}

             {/* MEGASCENARIO PIPELINE NAVIGATOR (Searching Sequence) */}
            <div className="w-full mb-8 relative p-6 bg-white border border-theme-border rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                 <GitBranch className="w-32 h-32" />
              </div>
              <div className="flex items-center justify-between mb-10 relative z-10">
                  <div className="flex items-center gap-4">
                   <div className="h-8 w-2 bg-gradient-to-b from-blue-600 to-blue-400 rounded-full"></div>
                   <div>
                     <h2 className="text-[17px] font-black text-slate-800 uppercase tracking-tight">业务全链路决策流图 (Business Strategy Flow)</h2>
                     <p className="text-[12px] text-theme-muted mt-1 leading-relaxed">
                        支持 <b>多维并行计算</b>、<b>按序分层回退</b> 与 <b>智能分支路由</b>。节点间的连接逻辑定义了策略是“叠加优选”还是“降级兜底”。
                     </p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsGuardrailsOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-all font-bold text-[12px] shadow-sm active:scale-95 group"
                  >
                    <ShieldAlert className="w-4 h-4 group-hover:animate-pulse" />
                    全局合规红线 ({data?.guardrails?.length || 0})
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">当前序列节点数: {data.rules.length}</span>
                  </div>
                </div>
              </div>
               
              <div className="flex items-start w-full px-2 overflow-x-auto custom-scrollbar relative pt-12 pb-12 min-h-[400px] scroll-smooth">
                {/* Background Track Line */}
                <div className="absolute left-[4rem] right-[4rem] top-[4.75rem] h-0.5 bg-slate-100/50 z-0"></div>
                
                {/* Horizontal Scroll Hint (Fade edges) */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 
                 {data.rules.map((rule, idx) => {
                  const showGroupHeader = idx === 0 || rule.priorityGroup !== data.rules[idx - 1].priorityGroup;
                  const isLast = idx === data.rules.length - 1;
                  const nextRule = !isLast ? data.rules[idx + 1] : null;
                  const ruleSteps = rule.steps ?? [];
                  const firstRuleStep = ruleSteps[0];
                  const ruleSubjects = Array.from(new Set(ruleSteps.flatMap((s: RuleStep) => [getEffectiveInputSubject(s, data.primarySubject), getEffectiveOutputSubject(s, data.primarySubject)])));

                  return (
                  <React.Fragment key={rule.id}>
                    {showGroupHeader && rule.priorityGroup && (
                      <div className="flex flex-col items-center justify-start pt-1 px-8 border-l border-dashed border-slate-200 h-[340px] relative group/group-header">
                        <div className="writing-mode-vertical text-[10px] font-black text-blue-500/60 uppercase tracking-[0.2em] whitespace-nowrap mb-6 flex items-center">
                           {rule.priorityGroup.split(/[:：]/)[0]}
                        </div>
                        
                        {/* Group Move Controls */}
                        <div className="flex flex-col items-center gap-2 mb-4 opacity-0 group-hover/group-header:opacity-100 transition-opacity">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleMoveGroup(rule.priorityGroup!, 'left'); }}
                             className="p-1.5 hover:bg-white rounded-lg text-blue-600 border border-blue-100 shadow-sm"
                           >
                             <ArrowLeft className="w-3.5 h-3.5" />
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleMoveGroup(rule.priorityGroup!, 'right'); }}
                             className="p-1.5 hover:bg-white rounded-lg text-blue-600 border border-blue-100 shadow-sm"
                           >
                             <ArrowRight className="w-3.5 h-3.5" />
                           </button>
                        </div>

                        <div className="w-px h-8 bg-gradient-to-b from-blue-100/50 to-transparent"></div>
                        <div className="mt-4 text-[10px] font-black text-blue-600 bg-blue-50/80 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm whitespace-nowrap">
                           {rule.priorityGroup.split(/[:：]/)[1]?.trim() || rule.priorityGroup}
                        </div>
                        {/* Decorative Gradient Shading for Grouping */}
                        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-blue-50/10 to-transparent pointer-events-none -z-10"></div>
                      </div>
                    )}
                    <div 
                      className={`relative z-10 flex flex-col items-center gap-4 cursor-pointer group w-[240px] shrink-0 transition-all ${activeRuleId === rule.id ? '-translate-y-1' : ''}`}
                      onClick={() => setActiveRuleId(rule.id)}
                    >
                      {/* Flow Connection Indicator (TO NEXT NODE) */}
                      {!isLast && (
                        <div className="absolute top-[22px] left-[130px] w-[200px] h-[2px] z-0">
                           <div className={`h-full w-full ${rule.flowControl === 'CONTINUE' ? 'bg-emerald-200/50 border-t-2 border-dashed border-emerald-400' : 'bg-slate-200/50'}`}></div>
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                              {rule.flowControl === 'CONTINUE' ? (
                                <div className="px-2.5 py-1 bg-white text-emerald-600 border border-emerald-200 rounded-full text-[9px] font-black flex items-center gap-1.5 shadow-md animate-in zoom-in-50 duration-300">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                   综合评分 (Scoring)
                                </div>
                              ) : rule.flowControl === 'JUMP' ? (
                                <div className="px-2.5 py-1 bg-white text-purple-600 border border-purple-200 rounded-full text-[9px] font-black flex items-center gap-1.5 shadow-md animate-in zoom-in-50 duration-300">
                                   <GitBranch className="w-3 h-3" />
                                   特殊通道 (Jump)
                                </div>
                              ) : (
                                <div className="px-2.5 py-1 bg-white text-slate-500 border border-slate-200 rounded-full text-[9px] font-black flex items-center gap-1.5 shadow-sm">
                                   <ArrowDownRight className="w-3 h-3" />
                                   降级匹配 (Waterfall)
                                </div>
                              )}
                           </div>
                        </div>
                      )}

                      {/* Node Circle */}
                      <div className="flex flex-col items-center gap-1 group/node relative">
                        {/* Survivor Count Pill (Funnel Effect) */}
                        <div className="absolute -top-7 px-2 py-0.5 bg-slate-800 text-white rounded text-[9px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                           REMAINING: {Math.max(10, 1000 - (idx * 150) - Math.floor(Math.random() * 50))} / 1000
                        </div>
                        {/* Hover Reorder Controls */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover/node:opacity-100 transition-all transform group-hover/node:translate-y-1 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-blue-100 rounded-full px-2 py-1 z-50">
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleMoveRule(rule.id, 'left'); }}
                             className={`p-1.5 rounded-full hover:bg-blue-50 transition-colors ${idx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                             disabled={idx === 0}
                           >
                             <ArrowLeft className="w-3.5 h-3.5" />
                           </button>
                           <div className="w-px h-4 bg-slate-100 mx-1"></div>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleMoveRule(rule.id, 'right'); }}
                             className={`p-1.5 rounded-full hover:bg-blue-50 transition-colors ${idx === data.rules.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-600'}`}
                             disabled={idx === data.rules.length - 1}
                           >
                             <ArrowRight className="w-3.5 h-3.5" />
                           </button>
                           <div className="w-px h-4 bg-slate-100 mx-1"></div>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleRemoveRule(rule.id); }}
                             className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                             title="移除此业务维度节点"
                           >
                             <X className="w-3.5 h-3.5" />
                           </button>
                        </div>

                        <div className={`w-11 h-11 flex items-center justify-center font-bold text-[14px] transition-all shadow-md relative ${
                          rule.type === 'GATE' ? 'rotate-45 rounded-[4px]' : 'rounded-full'
                        } ${
                          activeRuleId === rule.id 
                            ? 'bg-blue-600 text-white ring-4 ring-blue-500/20' 
                            : 'bg-white border-2 border-theme-border text-theme-muted group-hover:border-blue-400 group-hover:text-blue-500'
                        }`}>
                          {/* Survivor Count Pill (Funnel Effect) */}
                          <div className={`absolute -top-7 px-2 py-0.5 bg-slate-800 text-white rounded text-[9px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 ${rule.type === 'GATE' ? '-rotate-45' : ''}`}>
                             REMAINING: {Math.max(10, 1000 - (idx * 150) - Math.floor(Math.random() * 50))} / 1000
                          </div>
                          <span className={rule.type === 'GATE' ? '-rotate-45' : ''}>{rule.type === 'GATE' ? <GitMerge className="w-4 h-4" /> : `L${idx + 1}`}</span>
                          {/* Absolute Priority Badge */}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-sm ${rule.type === 'GATE' ? '-rotate-45' : ''}`}>
                            #{idx + 1}
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                           <span className={`text-[10px] font-black uppercase tracking-tighter ${activeRuleId === rule.id ? 'text-blue-600' : 'text-slate-300'}`}>
                              {rule.type === 'GATE' ? 'Logical Gate' : 'Strategy Rule (规则)'}
                           </span>
                           <span className="text-[8px] font-bold text-slate-400/60 uppercase tracking-[0.1em] mt-0.5">业务决策维度</span>
                        </div>
                      </div>

                      {/* Branch Indicators for Gates */}
                      {rule.type === 'GATE' && rule.branches && (
                        <div className="absolute top-[80px] left-1/2 -translate-x-1/2 flex gap-12 z-0">
                           {rule.branches.map((br, bi) => (
                             <div key={bi} className="flex flex-col items-center">
                                <div className="w-px h-8 bg-blue-100"></div>
                                <div className="px-3 py-1 bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-full text-[9px] font-black text-blue-600 whitespace-nowrap shadow-sm flex items-center gap-1.5 animate-in slide-in-from-top-1">
                                   <Zap className="w-3 h-3 text-blue-400" />
                                   PATH: {br.conditionLabel}
                                </div>
                                <div className="w-px h-6 bg-blue-100"></div>
                                <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                             </div>
                           ))}
                        </div>
                      )}

                      {/* Header + Tooltip Info Box */}
                      <div className={`w-full bg-white rounded-[12px] border transition-all p-3 shadow-md relative group-hover:shadow-lg ${activeRuleId === rule.id ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-theme-border opacity-75 group-hover:opacity-100 group-hover:border-blue-300'}`}>
                         {/* Connection point dot */}
                         <div className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white transition-colors z-20 ${activeRuleId === rule.id ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                         
                         <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-[12px] font-bold leading-tight line-clamp-2 min-h-[30px] flex-1 ${activeRuleId === rule.id ? 'text-blue-800' : 'text-slate-700'}`}>
                              {rule.name}
                            </h4>
                            {rule.name.includes('数量') && (
                               <Badge className="bg-red-600 text-white border-none text-[8px] h-4 font-black">QTY</Badge>
                            )}
                         </div>
                         
                         <div className="mt-3 flex flex-col gap-1.5 border-t border-theme-border/50 pt-2">
                            {/* Matching Summary */}
                            <div className="flex items-start gap-1">
                               <Filter className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                               <div className="text-[9px] text-theme-muted leading-tight line-clamp-2 font-mono">
                                  {rule.matchingCriteria.length > 0 
                                    ? rule.matchingCriteria.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ')
                                    : '无条件(默认拦截)'}
                               </div>
                            </div>
                            {/* Target Subject Summary */}
                            <div className="flex items-center gap-1 mt-1">
                               <div className="w-3 h-3 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[8px] shrink-0 font-bold">
                                  {(firstRuleStep ? getSubjectLabel(getEffectiveInputSubject(firstRuleStep, data.primarySubject)) : getSubjectLabel(data.primarySubject)).charAt(0)}
                               </div>
                               <div className="text-[10px] font-bold text-slate-600 line-clamp-1">
                                 {ruleSubjects.length > 0 ? ruleSubjects.join(' / ') : getSubjectLabel(data.primarySubject)}
                               </div>
                            </div>
                            
                            {/* Steps Summary Overlay */}
                            {rule.steps.length > 0 && (
                               <div className="mt-2 pt-1.5 border-t border-slate-100/50 space-y-1">
                                  {rule.steps.map((s, si) => (
                                     <div key={si} className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50/50 border border-slate-100 hover:bg-blue-50 transition-colors group/tiny-step">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 group-hover/tiny-step:scale-125 transition-transform"></div>
                                        <span className="text-[9px] font-bold text-slate-500 line-clamp-1">{s.name}</span>
                                     </div>
                                  ))}
                               </div>
                            )}

                            {/* Flow Control Badge */}
                            <div className="mt-1 flex">
                               {rule.flowControl === 'JUMP' ? (
                                  <Badge variant="neutral" className="text-[8px] bg-purple-50 text-purple-600 border-purple-200">决策路由节点 (Decision)</Badge>
                               ) : (rule.flowControl === 'TERMINATE' || (!rule.flowControl && ruleSteps.some(s => s.flowControl === 'TERMINATE'))) ? (
                                  <Badge variant="warning" className="text-[8px] bg-orange-50 text-orange-600 border-orange-200">拦截/终结节点</Badge>
                               ) : (
                                  <Badge variant="success" className="text-[8px] bg-emerald-50 text-emerald-600 border-emerald-200">流转/过渡节点</Badge>
                               )}
                            </div>
                         </div>
                      </div>
                    </div>
                      
                    {/* Connector Arrow (Sequence Path) - only show if NOT at group boundary to keep it clean, or show thin line */}
                    {idx < data.rules.length - 1 && (
                      <div className="z-10 shrink-0 flex flex-col items-center justify-center w-12 -mt-4 relative group/connector">
                        {/* Insertion Point Trigger */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAddRule(idx + 1); }}
                          className="absolute top-0 -translate-y-4 w-6 h-6 rounded-full bg-blue-500 text-white shadow-lg flex items-center justify-center opacity-0 group-hover/connector:opacity-100 transition-all scale-75 hover:scale-110 z-30 cursor-pointer border-2 border-white"
                          title="在此处插入新寻址维度"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>

                        {rule.priorityGroup === data.rules[idx+1].priorityGroup && <div className="text-[9px] font-bold text-slate-300 mb-1 uppercase tracking-widest">Pipeline</div>}
                        <div className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center border border-theme-border group-hover/connector:border-blue-300 group-hover/connector:shadow-md transition-all relative">
                          {/* Funnel Flow Indicator */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full flex items-center gap-1 shadow-sm opacity-0 group-hover/connector:opacity-100 transition-all scale-75 z-40 whitespace-nowrap">
                             <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                             <span className="text-[9px] font-bold text-blue-600">Decision Funnel</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-theme-muted group-hover/connector:text-blue-500" />
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
                })}
                 
                {/* Append New Dimension Hook */}
                <div className="z-10 shrink-0 flex flex-col items-center gap-4 w-16 ml-8 pt-12">
                  <button 
                    onClick={handleAddRule}
                    className="w-14 h-14 rounded-full border-2 border-dashed border-blue-200 text-blue-400 flex flex-col items-center justify-center hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all bg-white shadow-sm"
                  >
                     <Plus className="w-6 h-6 mb-0.5" />
                     <span className="text-[10px] font-black uppercase">Add</span>
                  </button>
                  <span className="text-[10px] text-theme-muted font-bold tracking-tight">加分支</span>
                </div>
              </div>
            </div>

            {/* Active Dimension Body */}
            {activeRule && (
              <div className="flex flex-col gap-6 animation-fade-in pb-20">
                {/* Metadata Section */}
                <div className="bg-white border border-theme-border rounded-[12px] shadow-sm p-6 relative">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-4 bg-theme-primary rounded-full"></div>
                    <div className="font-bold text-[14px] text-theme-ink tracking-tight uppercase group flex items-center gap-2">
                       业务维度属性定义 (Dimension Definition)
                    </div>
                    {activeRule.sourceRuleId && (() => {
                      const src = independentRules.find(r => r.id === activeRule.sourceRuleId);
                      return src ? (
                        <span className="text-[10px] text-blue-500 border border-blue-100 bg-blue-50 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 normal-case">
                          <LinkIcon className="w-3 h-3" /> 引用自：{src.name}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
                    <div className="space-y-4">
                      {/* Priority Group Editor */}
                      <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50 mb-2 relative group-edit">
                        <div className="flex items-center gap-2 mb-3">
                           <Layers className="w-3.5 h-3.5 text-blue-500" />
                           <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">业务逻辑所属执行序列 (Logic Sequence Group)</span>
                        </div>
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <Input 
                               value={activeRule.priorityGroup || ''}
                               onChange={(e) => handleUpdateRuleProperty(activeRule.id, 'priorityGroup', e.target.value)}
                               placeholder="尚未分配序列组 (示例 优先级 1: 拦截链)..."
                               className="h-9 text-[12px] border-blue-200 focus:border-blue-500 bg-white"
                             />
                           </div>
                           <p className="text-[10px] text-blue-400/80 italic leading-tight">
                             * 修改此项将动态调整顶部的顺延降级分组。建议格式为 “分组前缀: 分组描述”。
                           </p>
                        </div>
                      </div>

                      {/* Explicit Priority Rank Display */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">执行物理优先级 (Rank)</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <div className="px-3 py-1 bg-slate-800 text-white rounded-[6px] font-mono text-[14px] font-black">
                               #{data.rules.findIndex(r => r.id === activeRule.id) + 1}
                            </div>
                         </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="text-[12px] text-theme-muted font-medium ml-1">维度名称 (Dimension Name)</label>
                          <Input 
                            value={activeRule.name} 
                            onChange={(e) => handleUpdateRuleProperty(activeRule.id, 'name', e.target.value)}
                            placeholder="输入业务维度名称..."
                            className="h-11 text-[14px] border-theme-border bg-white focus:bg-white font-bold text-blue-900"
                          />
                        </div>
                        <div className="w-[140px] space-y-2">
                           <label className="text-[12px] text-theme-muted font-medium ml-1">顺位分组 (Group)</label>
                           <Input 
                             value={activeRule.priorityGroup || ''} 
                             onChange={(e) => handleUpdateRuleProperty(activeRule.id, 'priorityGroup', e.target.value)}
                             placeholder="如：优先级1"
                             className="h-11 text-[12px] border-theme-border bg-white"
                           />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[12px] text-theme-muted font-medium ml-1">业务功能逻辑描述 (Intent)</label>
                        <textarea 
                          value={activeRule.description || ''} 
                          onChange={(e) => {
                            const val = e.target.value;
                            setData(prev => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                rules: prev.rules.map(r => r.id === activeRuleId ? { ...r, description: val } : r)
                              };
                            });
                          }}
                          placeholder="描述该业务维度的核心控制意图..."
                          className="w-full min-h-[100px] p-3 rounded-[8px] font-sans border border-theme-border text-[13px] text-theme-ink focus:outline-none focus:ring-2 focus:ring-theme-primary/20 transition-all resize-none bg-white"
                        />
                      </div>

                      {/* Flow Control Mode Switcher - REFACTORED UNIFIED VERSION (Moved to Left Col) */}
                      <div className="mt-2 p-5 bg-theme-bg rounded-2xl border border-theme-border/50 relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                           <Workflow className="w-4 h-4 text-theme-primary" />
                           <span className="text-[12px] font-black text-theme-ink uppercase tracking-tight italic">架构与流转控制 (ARCHITECTURE & FLOW CONTROL)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                           {/* Mode 1: Sequential Additive */}
                           <div 
                              onClick={() => setRuleArchitecture('PIPELINE')}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 relative ${
                                 (activeRule.type === 'DIMENSION' || !activeRule.type) && activeRule.flowControl === 'CONTINUE' 
                                    ? 'border-emerald-500 bg-emerald-50/30' 
                                    : 'border-transparent bg-white hover:border-slate-200 shadow-sm'
                              }`}
                           >
                              <div className="flex items-center justify-between">
                                 <div className={`p-1.5 rounded-lg ${(activeRule.type === 'DIMENSION' || !activeRule.type) && activeRule.flowControl === 'CONTINUE' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <LinkIcon className="w-4 h-4" />
                                 </div>
                              </div>
                              <h5 className={`text-[12px] font-black ${(activeRule.type === 'DIMENSION' || !activeRule.type) && activeRule.flowControl === 'CONTINUE' ? 'text-emerald-900' : 'text-slate-700'}`}>综合评分</h5>
                              <p className="text-[9px] text-slate-400 leading-tight">线性流水线。此节点执行后无缝进入下一维度，实现因子叠加。</p>
                           </div>

                           {/* Mode 2: Waterfall Fallback */}
                           <div 
                              onClick={() => setRuleArchitecture('WATERFALL')}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 relative ${
                                 (activeRule.type === 'DIMENSION' || !activeRule.type) && activeRule.flowControl === 'TERMINATE' 
                                    ? 'border-orange-500 bg-orange-50/30' 
                                    : 'border-transparent bg-white hover:border-slate-200 shadow-sm'
                              }`}
                           >
                              <div className="flex items-center justify-between">
                                 <div className={`p-1.5 rounded-lg ${(activeRule.type === 'DIMENSION' || !activeRule.type) && activeRule.flowControl === 'TERMINATE' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <ArrowDownRight className="w-4 h-4" />
                                 </div>
                              </div>
                              <h5 className={`text-[12px] font-black ${(activeRule.type === 'DIMENSION' || !activeRule.type) && activeRule.flowControl === 'TERMINATE' ? 'text-orange-900' : 'text-slate-700'}`}>降级匹配</h5>
                              <p className="text-[9px] text-slate-400 leading-tight">分层搜索。当前节点满足则立即终结，失败则向下“溢出”降级。</p>
                           </div>

                           {/* Mode 3: Conditional Jump */}
                           <div 
                              onClick={() => setRuleArchitecture('JUMP')}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 relative ${
                                 (activeRule.type === 'DIMENSION' || !activeRule.type) && activeRule.flowControl === 'JUMP' 
                                    ? 'border-purple-500 bg-purple-50/30' 
                                    : 'border-transparent bg-white hover:border-slate-200 shadow-sm'
                              }`}
                           >
                              <div className="flex items-center justify-between">
                                 <div className={`p-1.5 rounded-lg ${(activeRule.type === 'DIMENSION' || !activeRule.type) && activeRule.flowControl === 'JUMP' ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <Zap className="w-4 h-4" />
                                 </div>
                              </div>
                              <h5 className={`text-[12px] font-black ${(activeRule.type === 'DIMENSION' || !activeRule.type) && activeRule.flowControl === 'JUMP' ? 'text-purple-900' : 'text-slate-700'}`}>特殊通道</h5>
                              <p className="text-[9px] text-slate-400 leading-tight">逻辑跳跃。满足先验条件后越过常规序列，直达目标场景（如异常）。</p>
                           </div>

                           {/* Mode 4: Decision Gate */}
                           <div 
                              onClick={() => setRuleArchitecture('GATE')}
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-2 relative ${
                                 activeRule.type === 'GATE' 
                                    ? 'border-blue-600 bg-blue-50/30' 
                                    : 'border-transparent bg-white hover:border-slate-200 shadow-sm'
                              }`}
                           >
                              <div className="flex items-center justify-between">
                                 <div className={`p-1.5 rounded-lg ${activeRule.type === 'GATE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <GitBranch className="w-4 h-4" />
                                 </div>
                              </div>
                              <h5 className={`text-[12px] font-black ${activeRule.type === 'GATE' ? 'text-blue-900' : 'text-slate-700'}`}>决策分流</h5>
                              <p className="text-[9px] text-slate-400 leading-tight">多叉网关。基于业务指纹对流量进行深度分拣（Case A/B/C）。</p>
                           </div>
                        </div>

                        {activeRule.flowControl === 'JUMP' && (
                           <div className="mt-4 animate-in slide-in-from-top-2 p-4 bg-white rounded-xl border border-purple-100">
                              <label className="text-[10px] font-black text-purple-600 uppercase mb-2 block tracking-widest">目标特殊通道 (Jump Target)</label>
                              <div className="relative">
                                 <select 
                                   value={activeRule.jumpTargetId || ''}
                                   onChange={(e) => handleUpdateRuleProperty(activeRule.id, 'jumpTargetId', e.target.value)}
                                   className="w-full h-10 px-3 bg-slate-50 border border-purple-200 rounded-lg text-[12px] font-bold text-purple-900 focus:ring-2 focus:ring-purple-500/20"
                                 >
                                    <option value="">-- 选择跳转目标 --</option>
                                    {data?.rules.filter(r => r.id !== activeRule.id).map(r => {
                                       // Basic cycle check: if we jump to r, can r reach activeRule?
                                       const causesCycle = (() => {
                                          const canReach = (fromId: string, toId: string, visited = new Set<string>()): boolean => {
                                             if (fromId === toId) return true;
                                             if (visited.has(fromId)) return false;
                                             visited.add(fromId);
                                             const rule = data?.rules.find(x => x.id === fromId);
                                             if (!rule) return false;
                                             
                                             // Jump target
                                             if (rule.flowControl === 'JUMP' && rule.jumpTargetId) {
                                                if (canReach(rule.jumpTargetId, toId, visited)) return true;
                                             }
                                             // Gate branches
                                             if (rule.type === 'GATE' && rule.branches) {
                                                for (const br of rule.branches) {
                                                   if (br.targetRuleId && canReach(br.targetRuleId, toId, visited)) return true;
                                                }
                                             }
                                             // Sequential flow (if not JUMP/TERMINATE)
                                             const idx = data?.rules.findIndex(x => x.id === fromId) ?? -1;
                                             if (idx !== -1 && idx < (data?.rules.length ?? 0) - 1) {
                                                const nextId = data?.rules[idx + 1].id;
                                                if (canReach(nextId, toId, visited)) return true;
                                             }
                                             return false;
                                          };
                                          return canReach(r.id, activeRule.id);
                                       })();

                                       return (
                                          <option key={r.id} value={r.id} disabled={causesCycle}>
                                             {r.name} {causesCycle ? '(会产生死循环)' : ''}
                                          </option>
                                       );
                                    })}
                                 </select>
                              </div>
                           </div>
                        )}

                        {/* AI Context Warning */}
                        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-slate-900/5 rounded-lg border border-slate-200/50">
                           <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                           <span className="text-[10px] font-bold text-slate-500">
                              {activeRule.flowControl === 'CONTINUE' 
                                 ? "AI 建议：由于后续节点包含 '距离排序'，当前维度应保持 CONTINUE 以合并筛选。" 
                                 : "AI 建议：检测到这是个 '合规拦截' 节点，TERMINATE 是正确的路径。"}
                           </span>
                        </div>
                      </div>

                      <div 
                        className="mt-4 flex items-center gap-3 cursor-pointer group bg-theme-bg p-4 rounded-xl border border-transparent hover:border-theme-primary/20 transition-all"
                        onClick={() => {
                          setData(prev => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              rules: prev.rules.map(r => r.id === activeRuleId ? { ...r, enabled: !r.enabled } : r)
                            };
                          });
                        }}
                      >
                        <div 
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${activeRule.enabled ? 'bg-theme-primary border-theme-primary' : 'bg-white border-theme-border group-hover:border-theme-primary'}`}
                        >
                          {activeRule.enabled && <X className="w-3.5 h-3.5 text-white rotate-45" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-theme-ink uppercase tracking-tight">激活该维度节点 (Active)</span>
                          <span className="text-[10px] text-theme-muted italic">停用后此维度模块及其包含的动作将被直接跳过</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4 justify-start pt-0 md:pt-8 min-w-0">
                       <Card className="p-5 border-blue-100 shadow-[0_8px_30px_rgba(59,130,246,0.05)] bg-gradient-to-br from-white to-blue-50/30 overflow-hidden relative">
                         <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                            <Zap className="w-16 h-16 text-blue-500" />
                         </div>
                         <h4 className="text-[12px] font-black text-blue-900 mb-2 flex items-center gap-2">
                           <Activity className="w-3.5 h-3.5" /> 策略权重与逻辑洞察 (Insights)
                         </h4>
                         <p className="text-[10px] text-blue-700/70 mb-4 leading-tight">基于当前语义步骤的平衡性与业务特征实时评估：</p>
                         <RadarInsight rule={activeRule} />
                         <BusinessInsight rule={activeRule} />
                         
                         <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="p-2 bg-white/80 rounded border border-blue-100/50">
                               <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">倾向性 (Focus)</div>
                               <div className="text-[11px] font-bold text-slate-700">高效寻址型</div>
                            </div>
                            <div className="p-2 bg-white/80 rounded border border-blue-100/50">
                               <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">风险度 (Risk)</div>
                               <div className="text-[11px] font-bold text-green-600">低风险</div>
                            </div>
                         </div>
                       </Card>

                       <div className="p-5 bg-slate-900 rounded-[12px] text-white shadow-xl relative overflow-hidden group">
                          {/* Glass morphism effect background */}
                          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full"></div>
                          
                          <div className="relative z-10">
                            <h4 className="text-[11px] font-bold text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Sparkles className="w-3 h-3" /> AI 诊断视角 (Copilot)
                            </h4>
                            <div className="space-y-3">
                               <div className="flex items-start gap-3">
                                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0"></div>
                                  <p className="text-[10px] text-slate-300 leading-normal">
                                    当前 <span className="text-white font-bold">“准入链”</span> 配置完整，已覆盖 GSP 强控要求。
                                  </p>
                                </div>
                               <div className="flex items-start gap-3">
                                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"></div>
                                  <p className="text-[10px] text-slate-300 leading-normal">
                                    建议：在 业务偏好列表末尾增加一个 <span className="text-blue-300">“库内容错因子”</span> 以提升极端波峰下的抗压能力。
                                  </p>
                               </div>
                               <button className="w-full py-2 bg-white/10 hover:bg-white/20 rounded text-[10px] font-bold transition-colors border border-white/5 mt-2">
                                 一键执行优化方案
                               </button>
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Matching Criteria Layer */}
                <div className="bg-white border border-theme-border rounded-[20px] shadow-sm p-6 relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                       <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                       <div className="font-bold text-[14px] text-emerald-900 tracking-tight uppercase">
                          场景准入守门员机制 (Scenario Entry Gate)
                       </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleAddCriteria}
                      className="h-9 px-4 text-[13px] border-theme-border font-black bg-white hover:bg-slate-50 transition-all gap-2 rounded-xl"
                    >
                      <Plus className="w-4 h-4" /> 
                      设定适用条件
                    </Button>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {activeRule.matchingCriteria.map((cond, idx) => {
                      const effectiveCondType: ConditionType = cond.conditionType ?? 'INSTANT';
                      const isTimeWindow = effectiveCondType === 'TIME_WINDOW' || effectiveCondType === 'AGGREGATE';
                      return (
                      <div key={cond.id} className="flex flex-col gap-2 p-3 bg-white border border-theme-border rounded-lg group shadow-sm transition-all hover:border-theme-primary/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="neutral" className="bg-theme-bg text-[10px] text-theme-muted border-theme-border/50 h-5 px-1.5 leading-none flex items-center gap-1">
                              {cond.field.includes('SKU') ? '📦 SKU(商品)' :
                               cond.field.includes('收货') ? '📑 ORDER(单据)' :
                               cond.field.includes('订单') ? '📑 ORDER(出库单)' :
                               cond.field.includes('库') ? '🏬 WH(仓库)' : '⚙️ CONTEXT(上文)'}
                            </Badge>
                            {/* ConditionType chip */}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold flex items-center gap-0.5 ${
                              effectiveCondType === 'INSTANT' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                              effectiveCondType === 'TIME_WINDOW' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                              'bg-violet-50 text-violet-600 border-violet-200'
                            }`}>
                              {effectiveCondType === 'INSTANT' ? '即时' : effectiveCondType === 'TIME_WINDOW' ? '时间窗口' : '趋势/聚合'}
                            </span>
                          </div>
                          <div className="text-[10px] text-theme-muted font-mono opacity-40">Index: {idx + 1}</div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex-1 flex items-center bg-[#F8F9FA] border border-theme-border rounded-[8px] px-3 h-10 focus-within:ring-2 focus-within:ring-theme-primary/10 transition-all bg-white">
                              <input
                                value={cond.field}
                                onChange={(e) => handleUpdateCriteria(cond.id, e.target.value, cond.operator, cond.value)}
                                className="w-full bg-transparent border-none text-theme-ink text-[13px] font-bold focus:outline-none"
                                placeholder="业务属性 (e.g. 订单类型)"
                              />
                           </div>

                           <div className="relative shrink-0">
                             <select
                               className={`h-10 px-3 pr-8 bg-theme-bg border rounded-[8px] text-[12px] font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-theme-primary/10 ${
                                 effectiveCondType === 'INSTANT' ? 'border-theme-border text-theme-ink' :
                                 effectiveCondType === 'TIME_WINDOW' ? 'border-blue-300 text-blue-700 bg-blue-50' :
                                 'border-violet-300 text-violet-700 bg-violet-50'
                               }`}
                               value={cond.operator}
                               onChange={(e) => {
                                 const newOp = e.target.value;
                                 const twOp = timeWindowOperators.find(o => o.value === newOp);
                                 const newCondType: ConditionType = twOp ? twOp.conditionType : 'INSTANT';
                                 handleUpdateCriteriaFull(cond.id, {
                                   operator: newOp,
                                   conditionType: newCondType,
                                   timeWindow: newCondType === 'INSTANT' ? undefined : (cond.timeWindow ?? { duration: 1, unit: 'HOURS', aggregator: 'COUNT' })
                                 });
                               }}
                             >
                               {allOperatorsGrouped.map(group => (
                                 <optgroup key={group.group} label={group.group}>
                                   {group.operators.map(op => (
                                     <option key={op.value} value={op.value}>{op.label ?? op.value}</option>
                                   ))}
                                 </optgroup>
                               ))}
                             </select>
                             <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                           </div>

                           <div className="flex-1 flex items-center bg-white border border-theme-border rounded-[8px] px-3 h-10 focus-within:ring-2 focus-within:ring-theme-primary/10 transition-all group/val relative">
                              <input
                                value={cond.value}
                                onChange={(e) => handleUpdateCriteria(cond.id, cond.field, cond.operator, e.target.value)}
                                className="w-full bg-transparent border-none text-theme-ink text-[13px] font-medium focus:outline-none text-theme-accent"
                                placeholder="匹配值..."
                              />
                              <button
                                onClick={() => handleRemoveCriteria(cond.id)}
                                className="absolute -right-2 top-1/2 -translate-y-1/2 bg-red-50 text-red-500 w-5 h-5 rounded-full items-center justify-center border border-red-100 shadow-sm opacity-0 group-hover:opacity-100 group-hover/val:opacity-100 transition-all flex"
                              >
                                <X className="w-3 h-3" />
                              </button>
                           </div>
                        </div>

                        {/* Time-window sub-fields */}
                        {isTimeWindow && (
                          <div className={`flex items-center gap-2 pt-2 border-t ${effectiveCondType === 'TIME_WINDOW' ? 'border-blue-100' : 'border-violet-100'}`}>
                            <span className={`text-[10px] font-bold shrink-0 ${effectiveCondType === 'TIME_WINDOW' ? 'text-blue-600' : 'text-violet-600'}`}>
                              {effectiveCondType === 'TIME_WINDOW' ? '时间窗口:' : '聚合设置:'}
                            </span>
                            {effectiveCondType === 'TIME_WINDOW' && (<>
                              <input
                                type="number"
                                className="w-16 h-7 px-2 text-[11px] font-mono border border-blue-200 rounded bg-blue-50 text-blue-800 outline-none"
                                value={cond.timeWindow?.duration ?? 1}
                                onChange={(e) => handleUpdateCriteriaFull(cond.id, { timeWindow: { ...cond.timeWindow!, duration: Number(e.target.value) } })}
                                min={1}
                              />
                              <select
                                className="h-7 px-2 text-[11px] font-bold border border-blue-200 rounded bg-blue-50 text-blue-800 outline-none"
                                value={cond.timeWindow?.unit ?? 'HOURS'}
                                onChange={(e) => handleUpdateCriteriaFull(cond.id, { timeWindow: { ...cond.timeWindow!, unit: e.target.value as any } })}
                              >
                                <option value="MINUTES">分钟</option>
                                <option value="HOURS">小时</option>
                                <option value="DAYS">天</option>
                              </select>
                              <span className="text-[10px] text-blue-500 font-bold">内聚合方式:</span>
                            </>)}
                            <select
                              className={`h-7 px-2 text-[11px] font-bold border rounded outline-none ${effectiveCondType === 'TIME_WINDOW' ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-violet-200 bg-violet-50 text-violet-800'}`}
                              value={cond.timeWindow?.aggregator ?? 'COUNT'}
                              onChange={(e) => handleUpdateCriteriaFull(cond.id, { timeWindow: { ...(cond.timeWindow ?? { duration: 1, unit: 'HOURS' }), aggregator: e.target.value as any } })}
                            >
                              {['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'TREND_UP', 'TREND_DOWN'].map(agg => (
                                <option key={agg} value={agg}>{agg}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 mb-2 ml-1">
                  <div className="w-1.5 h-4 bg-theme-accent rounded-full"></div>
                  <div className="font-bold text-[14px] text-theme-ink uppercase tracking-wider">
                    {activeRule.type === 'GATE' ? '分流路径逻辑配置 (Routing Branches)' : '语义步骤流 (Semantic Step Sequence)'}
                  </div>
                </div>

                {activeRule.type === 'GATE' ? (
                   <div className="space-y-4">
                     <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-start gap-4">
                        <div className="p-2 bg-purple-600 rounded-lg text-white">
                           <GitMerge className="w-5 h-5" />
                        </div>
                        <div>
                           <h5 className="text-[14px] font-bold text-purple-900 mb-1">分流决策网关模式</h5>
                           <p className="text-[12px] text-purple-700 leading-relaxed">
                              网关节点不执行具体过滤或排序，而是根据特定的业务条件（分支条件）将寻址流量导向后续的不同维度。
                              <br /><span className="opacity-70">注：若无匹配分支，通常会自动流转至物理顺序的下一个节点。</span>
                           </p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-3">
                        {(activeRule.branches || []).map((branch, bidx) => (
                           <div key={branch.id} className="bg-white border border-theme-border rounded-[20px] shadow-sm p-6 hover:border-purple-300 transition-all group/branch relative">
                              <div className="flex items-center gap-4">
                                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[12px] font-black text-slate-500">
                                    {bidx + 1}
                                 </div>
                                 <div className="flex-1 grid grid-cols-[1fr_1fr_1.5fr] gap-4 items-end">
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">分支显示标签</label>
                                       <Input 
                                          value={branch.label}
                                          onChange={(e) => handleUpdateBranch(branch.id, 'label', e.target.value)}
                                          className="h-9 text-[12px] font-bold"
                                       />
                                    </div>
                                    <div className="space-y-1.5 col-span-2">
                                       <div className="flex items-center justify-between mb-1">
                                          <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">判定条件 (Criteria)</label>
                                          <button 
                                             onClick={() => {
                                                const newCondition = { id: `brc-${Date.now()}`, field: '属性', operator: '==', value: '值' };
                                                handleUpdateBranch(branch.id, 'criteria', [...(branch.criteria || []), newCondition]);
                                             }}
                                             className="text-[9px] text-blue-600 font-bold hover:underline"
                                          >
                                             + 添加条件
                                          </button>
                                       </div>
                                       <div className="flex flex-col gap-1.5">
                                          {(!branch.criteria || branch.criteria.length === 0) ? (
                                             <div className="text-[10px] text-slate-400 italic py-2 px-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                                无判定条件 (默认流转)
                                             </div>
                                          ) : (
                                             branch.criteria.map((c: any, ci: number) => (
                                                <div key={c.id} className="flex items-center gap-2 group/brc">
                                                   <Input 
                                                      value={c.field}
                                                      onChange={(e) => {
                                                         const newCriteria = [...branch.criteria];
                                                         newCriteria[ci] = { ...c, field: e.target.value };
                                                         handleUpdateBranch(branch.id, 'criteria', newCriteria);
                                                      }}
                                                      className="h-8 text-[11px] flex-1"
                                                      placeholder="属性"
                                                   />
                                                   <select 
                                                      value={c.operator}
                                                      onChange={(e) => {
                                                         const newCriteria = [...branch.criteria];
                                                         newCriteria[ci] = { ...c, operator: e.target.value };
                                                         handleUpdateBranch(branch.id, 'criteria', newCriteria);
                                                      }}
                                                      className="h-8 px-1 text-[11px] border border-theme-border rounded bg-white"
                                                   >
                                                      <option value="==">==</option>
                                                      <option value="!=">!=</option>
                                                      <option value="IN">IN</option>
                                                   </select>
                                                   <Input 
                                                      value={c.value}
                                                      onChange={(e) => {
                                                         const newCriteria = [...branch.criteria];
                                                         newCriteria[ci] = { ...c, value: e.target.value };
                                                         handleUpdateBranch(branch.id, 'criteria', newCriteria);
                                                      }}
                                                      className="h-8 text-[11px] flex-1"
                                                      placeholder="值"
                                                   />
                                                   <button 
                                                      onClick={() => {
                                                         const newCriteria = branch.criteria.filter((_: any, i: number) => i !== ci);
                                                         handleUpdateBranch(branch.id, 'criteria', newCriteria);
                                                      }}
                                                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/brc:opacity-100 transition-opacity"
                                                   >
                                                      <X className="w-3 h-3" />
                                                   </button>
                                                </div>
                                             ))
                                          )}
                                       </div>
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">跳转目标通道 (Jump Target)</label>
                                       <div className="relative">
                                          <select 
                                             className="w-full h-9 px-3 pr-8 bg-theme-bg border border-theme-border rounded-[8px] text-[12px] font-bold text-purple-700 appearance-none cursor-pointer focus:outline-none"
                                             value={branch.targetRuleId}
                                             onChange={(e) => handleUpdateBranch(branch.id, 'targetRuleId', e.target.value)}
                                          >
                                             <option value="">-- 选择目标流转节点 --</option>
                                             {data.rules.filter(r => r.id !== activeRule.id).map(r => {
                                                const causesCycle = (() => {
                                                   const canReach = (fromId: string, toId: string, visited = new Set<string>()): boolean => {
                                                      if (fromId === toId) return true;
                                                      if (visited.has(fromId)) return false;
                                                      visited.add(fromId);
                                                      const rule = data?.rules.find(x => x.id === fromId);
                                                      if (!rule) return false;
                                                      if (rule.flowControl === 'JUMP' && rule.jumpTargetId) {
                                                         if (canReach(rule.jumpTargetId, toId, visited)) return true;
                                                      }
                                                      if (rule.type === 'GATE' && rule.branches) {
                                                         for (const br of rule.branches) {
                                                            if (br.targetRuleId && canReach(br.targetRuleId, toId, visited)) return true;
                                                         }
                                                      }
                                                      const idx = data?.rules.findIndex(x => x.id === fromId) ?? -1;
                                                      if (idx !== -1 && idx < (data?.rules.length ?? 0) - 1) {
                                                         const nextId = data?.rules[idx + 1].id;
                                                         if (canReach(nextId, toId, visited)) return true;
                                                      }
                                                      return false;
                                                   };
                                                   return canReach(r.id, activeRule.id);
                                                })();

                                                return (
                                                   <option key={r.id} value={r.id} disabled={causesCycle}>
                                                      {r.name} {causesCycle ? '(会产生死循环)' : ''}
                                                   </option>
                                                );
                                             })}
                                          </select>
                                          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none" />
                                       </div>
                                    </div>
                                 </div>
                                 <button 
                                    onClick={() => handleRemoveBranch(branch.id)}
                                    className="w-8 h-8 flex items-center justify-center text-theme-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-all group-hover/branch:opacity-100"
                                 >
                                    <X className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                        ))}

                        <Button 
                           variant="outline" 
                           onClick={handleAddBranch}
                           className="h-12 border-dashed border-2 border-theme-border rounded-[20px] text-theme-muted hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 group/addbr"
                        >
                           <Plus className="w-4 h-4 transition-transform group-hover/addbr:rotate-90" />
                           <span className="font-bold text-[13px]">新增决策分支路径</span>
                        </Button>
                     </div>
                   </div>
                ) : (
                   /* Execution Steps Layer (Standard Dimension) */
                   <div className="flex flex-col gap-4 relative">
                  {/* Vertical Connection Line */}
                  {activeRule.steps.length > 1 && (
                    <div className="absolute left-9 top-8 bottom-8 w-[2px] bg-theme-bg pointer-events-none"></div>
                  )}

                  {activeRule.steps.map((step, idx) => {
                    const stepFilters = step.filters ?? [];
                    const stepSorters = step.sorters ?? [];
                    const stepConfig = step.config ?? {};
                    const stepUpstreamBindings = step.upstreamBindings ?? [];
                    const stepInputSubject = getEffectiveInputSubject(step, data.primarySubject);
                    const stepOutputSubject = getEffectiveOutputSubject(step, data.primarySubject);
                    const stepAction = getEffectiveStepAction(step);
                    const stepType = getEffectiveStepType(step);
                    const stepAttributes = getAttributesByObject(stepInputSubject);
                    const stepIntent = getStepIntentLabel(stepAction, stepInputSubject, stepOutputSubject);
                    const isSubjectFocused = activeDragOrHoverFactor?.targetObject === stepInputSubject;
                    const detailPresentation = getStepDetailPresentation(stepType);
                    const stepTypeTone = stepType === 'SELECT'
                      ? 'bg-orange-50 text-orange-700 border-orange-100'
                      : stepType === 'TRANSFORM'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : stepType === 'GATEWAY'
                          ? 'bg-purple-50 text-purple-700 border-purple-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200';
                    const configEntries = Object.entries(stepConfig);
                    const configCount = configEntries.length;
                    const hasQtySensitiveConfig = configEntries.some(([key]) => key.includes('数量') || key.includes('Qty'));
                    const primaryConfigEntries = configEntries.slice(0, 3);
                    return (
                      <div key={step.id}>
                    <div 
                      className="relative z-10"
                      onClick={() => setFocusedStepId(step.id)}
                    >
                      <div className={`bg-white border rounded-[20px] shadow-sm p-4 transition-all duration-300 cursor-pointer group/step ${focusedStepId === step.id ? 'border-theme-primary ring-8 ring-theme-primary/5 shadow-2xl -translate-y-1' : isSubjectFocused ? 'border-blue-400 bg-blue-50/10 ring-4 ring-blue-500/10 scale-[1.01]' : 'border-theme-border hover:border-theme-primary/30 hover:shadow-md'}`}>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-[16px] shadow-lg shrink-0 transition-all ${focusedStepId === step.id ? 'bg-theme-primary rotate-3 transform' : isSubjectFocused ? 'bg-blue-600 animate-bounce' : 'bg-slate-700'}`}>
                                {idx + 1}
                                <div className="absolute -top-6 -left-1 flex flex-col items-start opacity-0 group-hover/step:opacity-100 transition-opacity">
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white/80 px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                                      步骤 (Step) #{idx + 1}
                                   </span>
                                </div>
                              </div>
                              <div className="flex flex-col flex-1 min-w-0 gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${stepTypeTone}`}>
                                    {stepType}
                                  </span>
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                                    {stepAction}
                                  </span>
                                  <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 text-[10px] font-black tracking-tight max-w-full">
                                    <span className="truncate">{stepInputSubject} → {stepOutputSubject}</span>
                                  </span>
                                  <span className="inline-flex items-center rounded-full bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px] font-black tracking-tight">
                                    过滤 {stepFilters.length} · 因子 {stepSorters.length} · 参数 {configCount}
                                  </span>
                                  {activeRule.sourceRuleId && (() => {
                                    const srcRule = independentRules.find(r => r.id === activeRule.sourceRuleId);
                                    const srcStep = srcRule?.steps.find(s => s.id === step.id);
                                    const count = getStepOverrideCount(step, srcStep);
                                    return count > 0 ? (
                                      <span className="inline-flex items-center rounded-full bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 text-[10px] font-black tracking-tight gap-1">
                                        ↗ 已覆盖 {count} 项
                                      </span>
                                    ) : null;
                                  })()}
                                </div>

                                <input
                                  className="font-bold text-[14px] text-theme-ink bg-transparent border-b border-transparent hover:border-theme-border focus:border-theme-primary focus:outline-none transition-all px-1 w-full min-w-0"
                                  value={step.name}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateStepName(step.id, e.target.value)}
                                  placeholder="步骤显示名称..."
                                />

                                <div className="rounded-[14px] border border-slate-200 bg-slate-50/70 px-3 py-2 space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                    <div className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white pl-2 pr-1.5 gap-1.5 group/subj relative min-w-0 max-w-full hover:border-blue-200 hover:bg-blue-50/40 transition-colors">
                                      <span className="font-black text-slate-500 uppercase tracking-wider shrink-0">输入</span>
                                      <span className="font-black text-blue-600 truncate">{getSubjectLabel(stepInputSubject)}</span>
                                      <select
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        value={stepInputSubject}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                          e.stopPropagation();
                                          handleUpdateStepSemantics(step.id, { inputSubject: e.target.value as FactorTarget });
                                        }}
                                      >
                                        {subjectOptions.map(option => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                      <ChevronDown className="w-3 h-3 text-slate-400 group-hover/subj:text-blue-500 transition-colors shrink-0" />
                                    </div>

                                    <div className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 px-2 text-blue-500 text-[11px] font-black shrink-0">→</div>

                                    <div className="inline-flex h-8 items-center rounded-lg border border-blue-100 bg-blue-50 pl-2 pr-1.5 gap-1.5 group/out relative min-w-0 max-w-full hover:bg-blue-100/70 transition-colors">
                                      <span className="font-black text-blue-700 uppercase tracking-wider shrink-0">输出</span>
                                      <span className="font-black text-blue-700 truncate">{getSubjectLabel(stepOutputSubject)}</span>
                                      <select
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        value={stepOutputSubject}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                          e.stopPropagation();
                                          handleUpdateStepSemantics(step.id, { outputSubject: e.target.value as FactorTarget });
                                        }}
                                      >
                                        {subjectOptions.map(option => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                      <ChevronDown className="w-3 h-3 text-blue-400 group-hover/out:text-blue-600 transition-colors shrink-0" />
                                    </div>

                                    <div className="inline-flex h-8 items-center rounded-lg border border-violet-100 bg-white/80 pl-2 pr-1.5 gap-1.5 text-violet-800 min-w-0 max-w-full relative group/type hover:border-violet-200">
                                      <span className="font-black shrink-0">决策</span>
                                      <span className="truncate">{stepTypeDescriptions[stepType] ?? '处理模式：按当前步骤配置执行'}</span>
                                      <select
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        value={stepType}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                          e.stopPropagation();
                                          handleUpdateStep(step.id, { stepType: e.target.value as RuleStep['stepType'] });
                                        }}
                                      >
                                        <option value="FILTER">FILTER</option>
                                        <option value="TRANSFORM">TRANSFORM</option>
                                        <option value="RECOMMEND">RECOMMEND</option>
                                      </select>
                                      <ChevronDown className="w-3 h-3 text-violet-400 group-hover/type:text-violet-600 transition-colors shrink-0" />
                                    </div>

                                    <div className="inline-flex h-8 items-center rounded-lg border border-emerald-100 bg-white/80 pl-2 pr-1.5 gap-1.5 text-emerald-800 min-w-0 max-w-full relative group/action hover:border-emerald-200">
                                      <span className="font-black shrink-0">动作</span>
                                      <span className="truncate">{stepActionDescriptions[stepAction] ?? '按当前步骤结果执行动作'}</span>
                                      <select
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        value={stepAction}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                          e.stopPropagation();
                                          handleUpdateStep(step.id, { action: e.target.value as RuleStep['action'] });
                                        }}
                                      >
                                        <option value="NONE">NONE</option>
                                        <option value="VALIDATE">VALIDATE</option>
                                        <option value="SELECT">SELECT</option>
                                        <option value="RECOMMEND">RECOMMEND</option>
                                        <option value="ALLOCATE">ALLOCATE</option>
                                        <option value="ASSIGN">ASSIGN</option>
                                        <option value="ROUTE">ROUTE</option>
                                        <option value="LOCK">LOCK</option>
                                        <option value="GENERATE_TASK">GENERATE_TASK</option>
                                        <option value="SPLIT">SPLIT</option>
                                        <option value="SUSPEND">SUSPEND</option>
                                        <option value="RELEASE">RELEASE</option>
                                        <option value="REDIRECT">REDIRECT</option>
                                      </select>
                                      <ChevronDown className="w-3 h-3 text-emerald-400 group-hover/action:text-emerald-600 transition-colors shrink-0" />
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed border-blue-200 bg-white/90 px-2 py-1.5 min-w-0">
                                    <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-blue-600 shrink-0">
                                      <LinkIcon className="w-3 h-3 shrink-0" />
                                      <span>上游依赖</span>
                                      {stepUpstreamBindings.length > 0 && (
                                        <span className="inline-flex items-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white">{stepUpstreamBindings.length}</span>
                                      )}
                                    </div>

                                    {stepUpstreamBindings.length > 0 ? (
                                      <div className="flex flex-1 flex-wrap items-center gap-1 min-w-0">
                                        {stepUpstreamBindings.map((binding: StepInputBinding) => {
                                          const availableSourceSteps = activeRule.steps.slice(0, idx);
                                          const sourceStep = availableSourceSteps.find((candidate: RuleStep) => candidate.id === binding.stepId);
                                          const duplicateStepIds = new Set(
                                            stepUpstreamBindings
                                              .filter((candidate: StepInputBinding) => candidate.stepId !== binding.stepId)
                                              .map((candidate: StepInputBinding) => candidate.stepId)
                                          );
                                          const selectableSourceSteps = availableSourceSteps.filter((candidate: RuleStep) => candidate.id === binding.stepId || !duplicateStepIds.has(candidate.id));
                                          const bindingMode = binding.mode ?? 'LIST';
                                          const bindingModeMeta = stepBindingModeDescriptions[bindingMode];
                                          return (
                                            <div key={`${step.id}-${binding.stepId}-${binding.alias}`} className="inline-flex h-8 items-center rounded-lg border border-blue-100 bg-blue-50/50 min-w-0 max-w-full overflow-hidden">
                                              <div className="relative flex min-w-[110px] max-w-[180px] items-center px-2 py-1">
                                                <span className="block truncate pr-4 text-[10px] font-black text-slate-800">{sourceStep?.name ?? '选择前序步骤'}</span>
                                                <select
                                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                                  value={binding.stepId}
                                                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                    e.stopPropagation();
                                                    const nextStepId = e.target.value;
                                                    const nextSourceStep = availableSourceSteps.find((candidate: RuleStep) => candidate.id === nextStepId);
                                                    handleUpdateUpstreamBinding(step.id, binding.stepId, {
                                                      stepId: nextStepId,
                                                      alias: nextSourceStep
                                                        ? nextSourceStep.name.replace(/\s+/g, '_').replace(/[^\w一-龥]/g, '').slice(0, 24) || 'upstream'
                                                        : binding.alias,
                                                    });
                                                  }}
                                                >
                                                  {selectableSourceSteps.map((candidate: RuleStep) => (
                                                    <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                                                  ))}
                                                </select>
                                                <ChevronDown className="w-3 h-3 text-blue-400 absolute right-2 top-1/2 -translate-y-1/2" />
                                              </div>

                                              <span className="h-4 w-px bg-blue-100 shrink-0" />

                                              <Input
                                                value={binding.alias}
                                                className="h-8 w-[84px] rounded-none border-0 bg-transparent px-2 text-[10px] shadow-none focus-visible:ring-0"
                                                onClick={(e: React.MouseEvent<HTMLInputElement>) => e.stopPropagation()}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                  e.stopPropagation();
                                                  handleUpdateUpstreamBinding(step.id, binding.stepId, { alias: e.target.value });
                                                }}
                                              />

                                              <span className="h-4 w-px bg-blue-100 shrink-0" />

                                              <div className="relative flex items-center px-2 py-1 shrink-0">
                                                <span className="pr-4 text-[10px] font-black text-indigo-700">{bindingModeMeta.label}</span>
                                                <select
                                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                                  value={bindingMode}
                                                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                    e.stopPropagation();
                                                    handleUpdateUpstreamBinding(step.id, binding.stepId, { mode: e.target.value as StepInputBinding['mode'] });
                                                  }}
                                                >
                                                  <option value="ONE">ONE</option>
                                                  <option value="LIST">LIST</option>
                                                  <option value="MAP">MAP</option>
                                                </select>
                                                <ChevronDown className="w-3 h-3 text-indigo-400 absolute right-2 top-1/2 -translate-y-1/2" />
                                              </div>

                                              <button
                                                className={`inline-flex h-8 items-center px-2 text-[10px] font-black shrink-0 transition-colors border-l border-blue-100 ${binding.required ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                  e.stopPropagation();
                                                  handleUpdateUpstreamBinding(step.id, binding.stepId, { required: !binding.required });
                                                }}
                                              >
                                                {binding.required ? '必需' : '可选'}
                                              </button>

                                              <button
                                                className="inline-flex h-8 w-8 items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors border-l border-blue-100 shrink-0"
                                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                  e.stopPropagation();
                                                  handleRemoveUpstreamBinding(step.id, binding.stepId);
                                                }}
                                                title="删除依赖"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-[10px] text-slate-600">当前只使用主输入；需要时再组合前序结果。</div>
                                    )}

                                    <Button
                                      variant="outline"
                                      className="h-6 px-2 text-[10px] border-blue-200 bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-40 shrink-0 ml-auto"
                                      disabled={idx === 0 || stepUpstreamBindings.length >= idx}
                                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                        e.stopPropagation();
                                        handleAddUpstreamBinding(step.id);
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />新增
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-start">
                              <div className="flex flex-col gap-1 mr-1">
                                 <button
                                   onClick={() => handleMoveStep(step.id, 'up')}
                                   disabled={idx === 0}
                                   className={`p-1 rounded hover:bg-slate-100 ${idx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-500'}`}
                                 >
                                   <ChevronDown className="w-4 h-4 rotate-180" />
                                 </button>
                                 <button
                                   onClick={() => handleMoveStep(step.id, 'down')}
                                   disabled={idx === activeRule.steps.length - 1}
                                   className={`p-1 rounded hover:bg-slate-100 ${idx === activeRule.steps.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-blue-500'}`}
                                 >
                                   <ChevronDown className="w-4 h-4" />
                                 </button>
                              </div>

                              {activeRule.sourceRuleId && (() => {
                                const srcRule = independentRules.find(r => r.id === activeRule.sourceRuleId);
                                const srcStep = srcRule?.steps.find(s => s.id === step.id);
                                const count = getStepOverrideCount(step, srcStep);
                                return count > 0 ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleResetStepToSource(step.id); }}
                                    className="h-9 px-2 flex items-center gap-1 text-[10px] font-bold text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-all border border-orange-100 hover:border-orange-300"
                                    title="重置到库原始值"
                                  >
                                    <RotateCcw className="w-3 h-3" /> 重置
                                  </button>
                                ) : null;
                              })()}
                              <button
                                onClick={() => handleRemoveStep(step.id)}
                                className="w-9 h-9 flex items-center justify-center text-theme-muted hover:text-red-500 hover:bg-red-50 rounded-full transition-all group/del active:scale-95 border border-transparent hover:border-red-100"
                                title="删除阶段"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2.5 items-center">
                            <div className="rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 flex flex-wrap items-center gap-2.5">
                              <div className="flex items-center bg-slate-100/70 rounded-xl p-1 border border-slate-200/70">
                                <button
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    handleUpdateStep(step.id, { flowControl: 'TERMINATE' });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${step.flowControl === 'TERMINATE' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                  满足即止
                                </button>
                                <button
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    handleUpdateStep(step.id, { flowControl: 'CONTINUE' });
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${step.flowControl === 'CONTINUE' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                  继续流转
                                </button>
                              </div>

                              <div className="flex items-center gap-1 group/failover cursor-pointer relative bg-slate-50 py-1.5 px-2.5 rounded-xl border border-slate-200 min-w-0 hover:border-theme-border flex-1">
                                <span className="text-[10px] font-black text-slate-500 shrink-0">兜底</span>
                                <span className={`truncate text-[10px] ${step.failoverAction === 'ERROR_SUSPEND' ? 'text-red-500 font-bold' : 'text-slate-700'}`}>
                                  {step.failoverAction === 'ERROR_SUSPEND' ? '报错并挂起' :
                                   step.failoverAction === 'PIPELINE_NEXT' ? '流转全链路下一环节' :
                                   step.failoverAction === 'SPLIT_NEW_WO' ? '截断生成新WOCR' : '降级/下一环节'}
                                </span>
                                <select
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  value={step.failoverAction}
                                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    const val = e.target.value;
                                    setData((prev: StrategyDetail | null) => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        rules: prev.rules.map((r: StrategyRule) => {
                                          if (r.id !== activeRuleId) return r;
                                          return {
                                            ...r,
                                            steps: r.steps.map((s: RuleStep) => s.id === step.id ? { ...s, failoverAction: val as any } : s)
                                          };
                                        })
                                      };
                                    });
                                  }}
                                >
                                  <option value="NEXT_STEP">降级重试</option>
                                  <option value="PIPELINE_NEXT">全链路下一步</option>
                                  <option value="SPLIT_NEW_WO">触发拆单</option>
                                  <option value="ERROR_SUSPEND">挂起异常</option>
                                </select>
                                <ChevronDown className="w-3 h-3 opacity-40 group-hover/failover:opacity-100 transition-opacity shrink-0" />
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-theme-muted font-medium justify-start xl:justify-end">
                              <Button
                                variant="outline"
                                className={`h-8 px-3 text-[12px] border-theme-border font-medium shadow-xs transition-all justify-center ${editingParamsStepId === step.id ? 'bg-theme-primary/10 border-theme-primary/50 text-theme-primary' : 'bg-white hover:bg-theme-bg'}`}
                                onClick={() => setEditingParamsStepId(editingParamsStepId === step.id ? null : step.id)}
                              >
                                <Settings className={`w-3 h-3 mr-1.5 ${configCount > 0 ? 'text-blue-500' : 'text-slate-400'}`} />
                                参数
                                {configCount > 0 && <span className="ml-1 text-[10px] font-black">{configCount}</span>}
                              </Button>
                              <span className="opacity-80"><strong className="text-theme-ink">{stepSorters.length}</strong> 因子</span>
                              <span className="opacity-80"><strong className="text-theme-ink">{stepFilters.length}</strong> 过滤</span>
                            </div>

                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-600 xl:max-w-[260px]">
                              <span className="font-black">关系：</span>先处理，再决定动作与流转。
                            </div>
                          </div>

                          <input
                            className="font-medium text-[11px] text-theme-muted bg-theme-bg/50 border border-transparent hover:border-slate-200 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all px-2 py-1.5 w-full rounded-md block placeholder:text-slate-300 shadow-sm"
                            value={step.description || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateStep(step.id, { description: e.target.value })}
                            placeholder="添加步骤说明，描述该配置的内容和业务目的..."
                          />
                        </div>

                        {/* Step Details Sub-layers */}
                        <div className="mt-4 pt-4 border-t border-[#F2F2F7] grid grid-cols-1 gap-4">
                          {detailPresentation.sections.map((section) => {
                            const priorityStyle = sectionPriorityClasses[section.priority];

                            if (section.key === 'filters') {
                              return (
                                <div key="filters" className={`${priorityStyle.container} space-y-2.5`}>
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 ${priorityStyle.title}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-theme-primary shadow-[0_0_8px_rgba(0,102,204,0.3)]"></span>
                                        硬性拦截规则/红线 (Hard Constraints)
                                        <Info className="w-3.5 h-3.5 text-blue-400 cursor-pointer hover:text-blue-600 transition-colors ml-1" onClick={() => setIsGuideModalOpen(true)} title="了解约束限制的作用" />
                                      </div>
                                      <p className={`text-[11px] mt-1 ${priorityStyle.hint}`}>{section.hint}</p>
                                    </div>
                                    <button
                                      onClick={() => handleAddFilter(step.id)}
                                      className="text-[10px] text-theme-primary hover:underline font-bold flex items-center gap-1 group/add shrink-0"
                                    >
                                      <Plus className="w-3 h-3 transition-transform group-hover/add:rotate-90" /> 新增拦截条件
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-4">
                                    {stepFilters.map((filter: RuleStep['filters'][number]) => {
                                      const filterMeta = getFilterMeta(stepInputSubject, filter.field);
                                      const filterOperators = filterMeta?.operators?.length ? filterMeta.operators : defaultFilterOperators;
                                      const hasEnumOptions = Boolean(filterMeta?.enumOptions?.length);
                                      const fieldDisplay = filterMeta?.name ?? filter.field;
                                      const isNumericField = filterMeta?.valueType === 'number' || filter.field.includes('数量');

                                      return (
                                      <div key={filter.id} className="group/f flex items-center h-12 bg-white border border-slate-200 rounded-[14px] p-1 shadow-sm hover:shadow-lg hover:border-blue-400 transition-all animate-in zoom-in-95 duration-200">
                                        <div className={`h-full px-4 flex items-center ${isNumericField ? 'bg-red-50 text-red-700' : 'bg-[#F9FAFB]'} rounded-l-[11px] border-r border-slate-100 min-w-[100px] max-w-[160px]`}>
                                          <div className="relative flex items-center w-full">
                                            {isNumericField && (
                                              <div className="absolute -top-6 left-0 whitespace-nowrap bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-pulse shadow-sm">
                                                QTY_STRICT
                                              </div>
                                            )}
                                            {isNumericField && <Scale className="w-3.5 h-3.5 mr-2 text-red-500" />}
                                            <select
                                              className="w-full bg-transparent text-[13px] font-black focus:outline-none appearance-none pr-4"
                                              value={filterMeta?.id ?? filter.field}
                                              onChange={(e) => {
                                                const nextMeta = stepAttributes.find(attribute => attribute.id === e.target.value);
                                                handleUpdateFilter(step.id, filter.id, nextMeta?.id ?? e.target.value, nextMeta?.operators?.[0] ?? filterOperators[0], '');
                                              }}
                                            >
                                              {!filterMeta && <option value={filter.field}>{filter.field || '过滤字段'}</option>}
                                              {stepAttributes.map(attribute => (
                                                <option key={attribute.id} value={attribute.id}>{attribute.name}</option>
                                              ))}
                                            </select>
                                            <ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                          </div>
                                        </div>
                                        <div className="relative px-3 h-full flex items-center">
                                          <select
                                            className="bg-transparent text-[13px] font-mono font-bold text-slate-500 appearance-none cursor-pointer focus:outline-none pr-4 hover:text-blue-600"
                                            value={filter.operator}
                                            onChange={(e) => handleUpdateFilter(step.id, filter.id, filter.field, e.target.value, filter.value)}
                                          >
                                            {filterOperators.map(operator => (
                                              <option key={operator} value={operator}>{operator}</option>
                                            ))}
                                          </select>
                                          <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                        </div>
                                        <div className={`h-full px-4 flex items-center border-l border-slate-100 min-w-[120px] relative ${isNumericField ? 'bg-red-50/30' : 'bg-white hover:bg-blue-50/50'}`}>
                                          {hasEnumOptions ? (
                                            <div className="relative w-full">
                                              <select
                                                className="w-full bg-transparent text-[13px] font-black text-orange-600 appearance-none focus:outline-none pr-4"
                                                value={filter.value}
                                                onChange={(e) => handleUpdateFilter(step.id, filter.id, filter.field, filter.operator, e.target.value)}
                                              >
                                                <option value="">请选择</option>
                                                {filterMeta?.enumOptions?.map(option => <option key={option} value={option}>{option}</option>)}
                                              </select>
                                              <ChevronDown className="w-3 h-3 absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                            </div>
                                          ) : (
                                            <input
                                              className={`w-full bg-transparent text-[13px] font-black focus:outline-none ${isNumericField ? 'text-red-600' : 'text-orange-600'}`}
                                              value={filter.value}
                                              onChange={(e) => handleUpdateFilter(step.id, filter.id, filter.field, filter.operator, e.target.value)}
                                              placeholder={fieldDisplay}
                                            />
                                          )}
                                        </div>
                                        <button
                                          onClick={() => handleRemoveFilter(step.id, filter.id)}
                                          className="w-8 h-8 mr-1 flex items-center justify-center rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover/f:opacity-100 ml-1"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                      );
                                    })}
                                    {stepFilters.length === 0 && (
                                      <div className="w-full py-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-[14px] text-center text-slate-400 text-[12px] italic flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                        未配置针对属性的过滤拦截条件
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }

                            if (section.key === 'sorters') {
                              if (section.hideEmptyState && stepSorters.length === 0) {
                                return (
                                  <div key="sorters" className={`${priorityStyle.container} space-y-2.5`}>
                                    <div className="min-w-0">
                                      <div className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${priorityStyle.title}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-theme-accent border-2 border-orange-200"></div>
                                        智能评估与加权优选因子 (Scoring & Ranking Optimizers)
                                        <Info className="w-4 h-4 text-orange-400 cursor-pointer hover:text-orange-600 transition-colors ml-1" onClick={() => setIsGuideModalOpen(true)} title="了解优化因子的作用" />
                                      </div>
                                      <p className={`text-[11px] mt-1 ${priorityStyle.hint}`}>{section.hint}</p>
                                    </div>
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-5 text-[12px] text-slate-400 italic">
                                      当前步骤不强调评分因子；如确有需要，仍可拖入因子后参与排序。
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key="sorters" className={`${priorityStyle.container} space-y-2.5`}>
                                  <div className="flex items-center justify-between mb-4 gap-4">
                                    <div className="min-w-0">
                                      <div className={`text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${priorityStyle.title}`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-theme-accent border-2 border-orange-200"></div>
                                        智能评估与加权优选因子 (Scoring & Ranking Optimizers)
                                        <Info className="w-4 h-4 text-orange-400 cursor-pointer hover:text-orange-600 transition-colors ml-1" onClick={() => setIsGuideModalOpen(true)} title="了解优化因子的作用" />
                                      </div>
                                      <p className={`text-[11px] mt-1 ${priorityStyle.hint}`}>{section.hint}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-wrap justify-end">
                                      <div className="relative group/subj">
                                        <select
                                          className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full bg-blue-600 text-white border-none shadow-md appearance-none cursor-pointer pr-7 transition-all hover:bg-blue-700"
                                          value={stepInputSubject}
                                          onChange={(e) => handleUpdateStepSemantics(step.id, { inputSubject: e.target.value as FactorTarget })}
                                        >
                                          {subjectOptions.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                          ))}
                                        </select>
                                        <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
                                      </div>
                                      <span className="text-[10px] text-theme-muted bg-[#F8F9FA] px-2.5 py-1 rounded-full border border-theme-border/50 uppercase font-mono font-bold font-black tracking-tighter">评分输入主体: {stepInputSubject}</span>
                                      {stepSorters.length > 0 && (
                                        <div className="h-6 flex items-center px-3 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-black tracking-tight">
                                          综合权重: {stepSorters.reduce((sum: number, s: RuleStep['sorters'][number]) => sum + s.weight, 0)}%
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    className={`rounded-2xl p-4 transition-all min-h-[80px] flex flex-wrap gap-2 items-center ${draggedFactor ? 'bg-blue-50/50 border-2 border-dashed border-blue-400 ring-8 ring-blue-500/5 animate-pulse' : 'bg-[#F9FAFB] border border-theme-border/30'}`}
                                    onDragOver={(e) => { e.preventDefault(); }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (draggedFactor) handleDropFactor(step.id, draggedFactor);
                                    }}
                                  >
                                    {stepSorters.length === 0 && (
                                      <div className="w-full text-center py-4 text-[10px] text-slate-400 font-medium italic flex flex-col items-center gap-2">
                                        <Plus className="w-6 h-6 opacity-20" />
                                        将建议因子拖入此区域开启加权计算
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-3">
                                      {stepSorters.map((sorter: RuleStep['sorters'][number]) => {
                                        const factor = mockFactors.find(f => f.id === sorter.factorId);
                                        const hasOverrides = (sorter.weightOverrides?.length ?? 0) > 0;
                                        return (
                                          <div key={sorter.factorId} className="flex flex-col gap-1.5">
                                            <div className="bg-white border border-theme-border pl-3 pr-1 py-1 gap-3 rounded-full flex items-center shadow-sm hover:shadow-md hover:border-theme-primary transition-all group/chip relative">
                                              {hasOverrides && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" title="已配置条件权重覆盖" />
                                              )}
                                              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[12px] group-hover/chip:bg-blue-50 transition-colors">
                                                {factor?.targetObject === 'LOCATION' ? '📦' : factor?.targetObject === 'INVENTORY_LOT' ? '📊' : factor?.targetObject === 'CONTEXT' ? '⚖️' : factor?.targetObject === 'EQUIPMENT' ? '⚡' : factor?.targetObject === 'ORDER_LINE' ? '📋' : '⚙️'}
                                              </div>
                                              <span className="text-[11px] font-bold text-slate-700 tracking-tight">{sorter.factorName}</span>
                                              <div className="flex items-center gap-1.5 bg-[#F2F2F7] rounded-full px-2 py-0.5 ml-1">
                                                <input
                                                  type="number"
                                                  className="w-8 bg-transparent text-[11px] font-black text-theme-primary focus:outline-none text-center"
                                                  value={sorter.weight}
                                                  onChange={(e) => handleWeightChange(step.id, sorter.factorId, Number(e.target.value))}
                                                />
                                                <span className="text-[10px] font-bold text-theme-muted">%</span>
                                              </div>
                                              <button
                                                title="条件权重覆盖"
                                                className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-colors"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newOverride = { id: `wo-${Date.now()}`, label: '新条件', conditions: [], weight: sorter.weight };
                                                  setData((prev: StrategyDetail | null) => {
                                                    if (!prev) return prev;
                                                    return {
                                                      ...prev,
                                                      rules: prev.rules.map(r => r.id !== activeRuleId ? r : {
                                                        ...r,
                                                        steps: r.steps.map((s: RuleStep) => s.id !== step.id ? s : {
                                                          ...s,
                                                          sorters: s.sorters.map(x => x.factorId !== sorter.factorId ? x : {
                                                            ...x,
                                                            weightOverrides: [...(x.weightOverrides ?? []), newOverride]
                                                          })
                                                        })
                                                      })
                                                    };
                                                  });
                                                }}
                                              >
                                                <SlidersHorizontal className="w-3 h-3" />
                                              </button>
                                              <button
                                                className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleRemoveFactor(step.id, sorter.factorId);
                                                }}
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                            {hasOverrides && (
                                              <div className="ml-2 flex flex-col gap-1.5 pl-3 border-l-2 border-blue-200">
                                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">条件权重覆盖</p>
                                                {sorter.weightOverrides!.map((wo) => (
                                                  <div key={wo.id} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5">
                                                    <input
                                                      className="text-[11px] font-bold text-slate-700 bg-transparent border-none focus:outline-none flex-1 min-w-0"
                                                      value={wo.label}
                                                      placeholder="条件描述"
                                                      onChange={e => {
                                                        setData((prev: StrategyDetail | null) => {
                                                          if (!prev) return prev;
                                                          return {
                                                            ...prev,
                                                            rules: prev.rules.map(r => r.id !== activeRuleId ? r : {
                                                              ...r,
                                                              steps: r.steps.map((s: RuleStep) => s.id !== step.id ? s : {
                                                                ...s,
                                                                sorters: s.sorters.map(x => x.factorId !== sorter.factorId ? x : {
                                                                  ...x,
                                                                  weightOverrides: x.weightOverrides!.map(w => w.id !== wo.id ? w : { ...w, label: e.target.value })
                                                                })
                                                              })
                                                            })
                                                          };
                                                        });
                                                      }}
                                                    />
                                                    <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-full px-2 py-0.5">
                                                      <input
                                                        type="number"
                                                        className="w-8 text-[11px] font-black text-blue-600 bg-transparent focus:outline-none text-center"
                                                        value={wo.weight}
                                                        onChange={e => {
                                                          const newW = Number(e.target.value);
                                                          setData((prev: StrategyDetail | null) => {
                                                            if (!prev) return prev;
                                                            return {
                                                              ...prev,
                                                              rules: prev.rules.map(r => r.id !== activeRuleId ? r : {
                                                                ...r,
                                                                steps: r.steps.map((s: RuleStep) => s.id !== step.id ? s : {
                                                                  ...s,
                                                                  sorters: s.sorters.map(x => x.factorId !== sorter.factorId ? x : {
                                                                    ...x,
                                                                    weightOverrides: x.weightOverrides!.map(w => w.id !== wo.id ? w : { ...w, weight: newW })
                                                                  })
                                                                })
                                                              })
                                                            };
                                                          });
                                                        }}
                                                      />
                                                      <span className="text-[9px] text-blue-400">%</span>
                                                    </div>
                                                    <button
                                                      className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors"
                                                      onClick={() => {
                                                        setData((prev: StrategyDetail | null) => {
                                                          if (!prev) return prev;
                                                          return {
                                                            ...prev,
                                                            rules: prev.rules.map(r => r.id !== activeRuleId ? r : {
                                                              ...r,
                                                              steps: r.steps.map((s: RuleStep) => s.id !== step.id ? s : {
                                                                ...s,
                                                                sorters: s.sorters.map(x => x.factorId !== sorter.factorId ? x : {
                                                                  ...x,
                                                                  weightOverrides: x.weightOverrides!.filter(w => w.id !== wo.id)
                                                                })
                                                              })
                                                            })
                                                          };
                                                        });
                                                      }}
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            if (section.key === 'config') {
                              return null;
                            }

                            return null;
                          })}

                          {/* Execution Constraints Panel */}
                          <ExecutionConstraintsPanel step={step} onUpdate={handleUpdateStep} />
                          {/* Resource Locking Panel */}
                          <ResourceLockingPanel step={step} onUpdate={handleUpdateStep} />
                          {/* Cost Optimization Panel */}
                          <CostOptimizationPanel step={step} costDimensions={mockCostDimensions} onUpdate={handleUpdateStep} />
                        </div>
                      </div>
                    </div>

                    {/* STEP INTER-CONNECTOR (NEW Logic Visual) */}
                        {idx < activeRule.steps.length - 1 && (
                          <div className="flex flex-col items-center py-5 relative group/connector no-select">
                             <div className="w-[1.5px] h-12 bg-slate-200 group-hover/connector:bg-blue-300 transition-colors"></div>
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                <div
                                  className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-md text-[11px] font-black transition-all bg-white whitespace-nowrap ${
                                    step.flowControl === 'CONTINUE'
                                      ? 'text-emerald-700 border-emerald-100 group-hover/connector:shadow-emerald-100 group-hover/connector:border-emerald-300'
                                      : 'text-orange-700 border-orange-100 group-hover/connector:shadow-orange-100 group-hover/connector:border-orange-300'
                                  }`}
                                >
                                   {step.flowControl === 'CONTINUE' ? (
                                      <><LinkIcon className="w-3.5 h-3.5" /> 结果继续流转到下一步</>
                                   ) : (
                                      <><ArrowDownRight className="w-3.5 h-3.5" /> 当前结果在此终止</>
                                   )}
                                </div>
                             </div>
                             <div className="w-[1.5px] h-12 bg-slate-200 group-hover/connector:bg-blue-300 transition-colors"></div>
                          </div>
                        )}
                    </div>
                    );
                  })}

                  <button
                    onClick={handleAddStep}
                    className="w-full py-6 bg-white border-2 border-dashed border-theme-border rounded-xl text-theme-muted hover:text-theme-primary hover:border-theme-primary hover:bg-theme-primary/5 transition-all flex flex-col items-center justify-center gap-2 group shadow-sm z-10"
                  >
                    <div className="w-10 h-10 rounded-full bg-white border border-theme-border shadow-md flex items-center justify-center group-hover:scale-110 transition-all">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[14px] font-bold text-theme-ink">追加语义步骤节点 (Append Semantic Step)</span>
                      <span className="text-[11px] text-theme-muted opacity-60">定义新的过滤、转换、评分选优或分支判断步骤</span>
                    </div>
                  </button>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Import Rule Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center bg-[#F8F9FA]">
              <div>
                <h3 className="font-semibold text-theme-ink text-[16px]">从全局共享库引入业务维度</h3>
                <p className="text-[11px] text-theme-muted mt-0.5">您可以选择现有的原子化业务管控维度，将其挂载到当前大场景流中。</p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-theme-muted transition-all">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-theme-bg/30">
              {[
                ...allStrategies.flatMap(s => s.rules.map(r => ({ ...r, sourceName: s.name, isIndependent: false }))),
                ...independentRules.map(r => ({ ...r, sourceName: '全局独立规则库', isIndependent: true }))
              ].map(rule => (
                <div key={rule.id} className={`bg-white border rounded-[10px] p-4 flex items-center justify-between transition-all group ${rule.isIndependent ? 'border-blue-200 hover:border-blue-500 shadow-sm' : 'border-theme-border hover:border-theme-primary/40'}`}>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[14px] text-theme-ink">{rule.name}</span>
                      {rule.isIndependent && <Badge variant="neutral" className="bg-blue-50 text-blue-600 border-none scale-90">独立规则</Badge>}
                      <Badge variant="neutral" className="bg-[#F2F2F7] scale-90">{rule.id}</Badge>
                    </div>
                    <p className="text-[11px] text-theme-muted mt-1">{rule.description || '无详细描述'}</p>
                    <div className="flex gap-4 mt-2">
                       <div className="text-[10px] text-theme-muted flex items-center gap-1">
                          <GitBranch className="w-3 h-3" /> {rule.steps?.length || 0} 语义步骤
                       </div>
                       <div className="text-[10px] text-theme-muted flex items-center gap-1">
                          <Search className="w-3 h-3" /> {rule.matchingCriteria?.length || 0} 前置触发器
                       </div>
                       <div className="text-[10px] font-medium text-theme-muted flex items-center gap-1">
                          源自: <span className={rule.isIndependent ? 'text-blue-500 font-bold' : 'text-theme-ink'}>{rule.sourceName}</span>
                       </div>
                    </div>
                  </div>
                  <Button variant="outline" className="h-8 text-[11px] font-bold group-hover:bg-theme-primary group-hover:text-white group-hover:border-theme-primary" onClick={() => {
                     const { sourceName, isIndependent, ...cleanRule } = rule as any;
                     handleImportRule(cleanRule, !!isIndependent);
                  }}>
                    挂载该维度
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="px-6 py-4 border-t border-theme-border flex justify-end bg-[#F8F9FA]">
              <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
      {/* Node Parameters Side Drawer */}
      {editingParamsStepId && (() => {
        const step = activeRule?.steps.find(s => s.id === editingParamsStepId);
        if (!step) return null;
        
        const subject = getEffectiveInputSubject(step, data.primarySubject);
        const outputSubject = getEffectiveOutputSubject(step, data.primarySubject);
        const action = getEffectiveStepAction(step);
        const metadataParams = getActionParams(action, subject, outputSubject).map(toAvailableParam);
        const fallbackParams: AvailableParam[] = (() => {
          switch (subject) {
            case 'LOCATION':
              return [
                { key: 'maxDistance', label: '最大拣选动线距离 (Limit)', type: 'number', unit: 'm', placeholder: '500', group: 'CONSTRAINT' },
                { key: 'tempTolerance', label: '温控波动容忍度 (Temp)', type: 'select', options: ['±0.5℃ (高精)', '±1.0℃ (标准)', '±2.0℃ (宽松)'], group: 'CONSTRAINT' },
                { key: 'zonePreference', label: '库区优先策略 (Zoning)', type: 'select', options: ['自动(全局平衡)', '就近优先', '空位率优先', '订单任务聚合', '周转路径最优'], group: 'ADJUSTMENT' },
                { key: 'congestionControl', label: '拥堵规避因子 (Traffic)', type: 'number', unit: '%', placeholder: '20', group: 'ADJUSTMENT' },
                { key: 'aisleSorting', label: '巷道内拣选权重方向', type: 'select', options: ['顺动线', '逆动线', '交替蛇形'], group: 'ADJUSTMENT' },
                { key: 'capacityBuffer', label: '库位预留周转容积 (Buffer)', type: 'number', unit: '%', placeholder: '10', group: 'BEHAVIORAL' },
              ];
            case 'INVENTORY_LOT':
              return [
                { key: 'minExpiryDays', label: '效期硬性拦截阈值 (Shelf-Life)', type: 'number', unit: '天', placeholder: '30', group: 'CONSTRAINT' },
                { key: 'batchConsistency', label: '批次一致性校验 (Strict Lot)', type: 'boolean', group: 'CONSTRAINT' },
                { key: 'lotMixControl', label: '混批管控级别', type: 'select', options: ['严禁混批', '允许同SKU混批', '完全允许'], group: 'CONSTRAINT' },
                { key: 'fifoWeight', label: 'FIFO(先进先出)执行权重', type: 'number', unit: '%', placeholder: '100', group: 'ADJUSTMENT' },
                { key: 'freshnessLevel', label: '生鲜等级准入 (Grade)', type: 'select', options: ['A级(极鲜)', 'B级(标准)', '通用'], group: 'ADJUSTMENT' },
                { key: 'palletToPieceThreshold', label: '整托转拆零临界系数', type: 'number', unit: '%', placeholder: '70', group: 'BEHAVIORAL' },
              ];
            case 'EQUIPMENT':
              return [
                { key: 'loadLimit', label: '设备任务负载上限', type: 'number', unit: '%', placeholder: '85', group: 'CONSTRAINT' },
                { key: 'rechargeThreshold', label: '低电量强制返场阈值', type: 'number', unit: '%', placeholder: '20', group: 'CONSTRAINT' },
                { key: 'speedMode', label: '作业运行能效模式', type: 'select', options: ['高能效(极速)', '标准平衡', '节能低噪'], group: 'ADJUSTMENT' },
              ];
            case 'ORDER_LINE':
              return [
                { key: 'allowOverReceive', label: '允许超量收货 (Over-Receive)', type: 'boolean', group: 'CONSTRAINT' },
                { key: 'allowShortReceive', label: '允许缺量收货 (Short-Receive)', type: 'boolean', group: 'CONSTRAINT' },
                { key: 'allowReverse', label: '允许冲销 (Reverse/Void)', type: 'boolean', group: 'CONSTRAINT' },
                { key: 'pickingFaceRequired', label: '拣选面限制 (Picking Face)', type: 'boolean', group: 'CONSTRAINT', description: '无拣选面是否允许收货' },
                { key: 'overReceiveTol', label: '溢收容忍度 (Tolerance %)', type: 'number', unit: '%', placeholder: '5', group: 'CONSTRAINT' },
                { key: 'crossDockPriority', label: '越库(Cross-Dock)紧急系数', type: 'number', unit: 'P', placeholder: '10', group: 'ADJUSTMENT' },
                { key: 'packingSequence', label: '堆叠顺序策略 (Sorting)', type: 'select', options: ['重下轻上 (Heavy-First)', '动线优先 (Route-First)', '体积填充率优先'], group: 'ADJUSTMENT' },
                { key: 'autoFullInbound', label: '到期自动满单收货', type: 'boolean', group: 'BEHAVIORAL' },
                { key: 'autoInbound', label: '是否自动入库 (Auto-Putaway)', type: 'boolean', group: 'BEHAVIORAL' },
                { key: 'splitAllowed', label: '允许在节点自动拆分 WO (Split)', type: 'boolean', group: 'BEHAVIORAL' },
                { key: 'priorityMapping', label: '子任务优先级映射表', type: 'select', options: ['跟随母单', '固定最高', '动态加权提升'], group: 'BEHAVIORAL' },
              ];
            case 'CONTEXT':
              return [
                { key: 'strictMode', label: '业务校验严谨度 (Control Level)', type: 'select', options: ['宽松(仅记录)', '标准(强提醒)', '严格(硬拦截)'], group: 'CONSTRAINT' },
                { key: 'retryLimit', label: '失败自动重试次数', type: 'number', unit: '次', placeholder: '3', group: 'ADJUSTMENT' },
                { key: 'autoSuspend', label: '异常自动挂起任务 (Auto-Suspend)', type: 'boolean', description: '触发拦截时自动挂起相关单据', group: 'BEHAVIORAL' },
                { key: 'fallbackRoute', label: '拦截后处理路径', type: 'select', options: ['抛出异常(人工处理)', '自动切换备选策略', '跳过并执行下一动作'], group: 'BEHAVIORAL' },
              ];
            case 'OPERATOR':
              return [
                { key: 'skillRequired', label: '操作技能要求 (Skill)', type: 'select', options: ['L1(实习)', 'L2(熟练)', 'L3(专家/资质)'], group: 'CONSTRAINT' },
                { key: 'safetyCheckStep', label: '作业前置安全强检', type: 'boolean', group: 'CONSTRAINT' },
                { key: 'shiftEndLeadTime', label: '班次结束前禁派单阀值', type: 'number', unit: 'min', placeholder: '30', group: 'BEHAVIORAL' },
              ];
            case 'CARRIER':
              return [
                { key: 'carrierTypeLock', label: '强制载具选型约束', type: 'select', options: ['无限制', '保温箱专用', '原箱发货(不换箱)', '托盘/地堆'], group: 'CONSTRAINT' },
                { key: 'mixOrderAllowed', label: '允许合行/合批混装', type: 'boolean', group: 'CONSTRAINT' },
                { key: 'volumeUtilization', label: '最低体积装载率阈值', type: 'number', unit: '%', placeholder: '60', group: 'ADJUSTMENT' },
                { key: 'stackingTolerance', label: '码垛溢位容忍度', type: 'number', unit: '%', placeholder: '5', group: 'BEHAVIORAL' },
              ];
            case 'STAGING_AREA':
              return [
                { key: 'dedicatedLane', label: '独占发货道优先级', type: 'boolean', group: 'CONSTRAINT' },
                { key: 'consolidationWindow', label: '波次合流集货时间窗', type: 'number', unit: 'min', placeholder: '60', group: 'ADJUSTMENT' },
                { key: 'maxWaitTime', label: '集货区最大滞留周期', type: 'number', unit: 'Hrs', placeholder: '4', group: 'BEHAVIORAL' },
              ];
            default:
              return [
                { key: 'customParam', label: '自定义业务挂载参数', type: 'number', placeholder: '0', group: 'ADJUSTMENT' },
              ];
          }
        })();

        const availableParams: AvailableParam[] = metadataParams.length > 0 ? metadataParams : fallbackParams;
        const groupedParams = availableParams.reduce<Record<string, AvailableParam[]>>((acc, param) => {
          if (!acc[param.group]) acc[param.group] = [];
          acc[param.group].push(param);
          return acc;
        }, {});

        const groupLabels = {
          'CONSTRAINT': { label: '约束类参数 (筛选时用)', color: 'text-red-600', bg: 'bg-red-50' },
          'ADJUSTMENT': { label: '调节类参数 (打分时用)', color: 'text-blue-600', bg: 'bg-blue-50' },
          'BEHAVIORAL': { label: '行为类参数 (决策后用)', color: 'text-emerald-600', bg: 'bg-emerald-50' }
        };

        return (
          <div className="fixed inset-0 z-[250] flex justify-end animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setEditingParamsStepId(null)} />
            <div className="relative w-[380px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-theme-border flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-slate-900 leading-tight">参数配置中心 (Step Config Center)</h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                       <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Target:</span>
                       <Badge variant="neutral" className="bg-blue-100 text-blue-700 border-none font-bold text-[9px] h-4">
                          {getSubjectLabel(subject)}
                       </Badge>
                       <span className="text-[9px] text-slate-300 ml-1">|</span>
                       <span className="text-[10px] text-slate-400 italic">同一套 step.config，统一承载节点参数与执行参数</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setEditingParamsStepId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {Object.entries(groupLabels).map(([groupId, info]) => {
                  const params = groupedParams[groupId];
                  if (!params || params.length === 0) return null;

                  return (
                    <div key={groupId} className="space-y-4">
                      <div className={`flex items-center gap-2 px-3 py-1.5 ${info.bg} ${info.color} rounded-lg`}>
                        <div className={`w-1.5 h-3 rounded-full ${groupId === 'CONSTRAINT' ? 'bg-red-500' : groupId === 'ADJUSTMENT' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                        <span className="text-[11px] font-black uppercase tracking-wider">{info.label}</span>
                      </div>
                      <div className="space-y-6 pl-2">
                        {params.map(param => (
                          <div key={param.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[12px] font-bold text-slate-700">{param.label}</label>
                              {param.unit && <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">{param.unit}</span>}
                            </div>

                            {param.type === 'number' && (
                              <div className="relative">
                                <input 
                                  type="number"
                                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[13px] font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                                  placeholder={param.placeholder}
                                  value={step.config?.[param.key] ?? ''}
                                  onChange={(e) => handleUpdateStepConfig(step.id, param.key, e.target.value)}
                                />
                              </div>
                            )}

                            {param.type === 'select' && (
                              <div className="relative">
                                <select 
                                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-[13px] font-bold focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all appearance-none"
                                  value={step.config?.[param.key] ?? ''}
                                  onChange={(e) => handleUpdateStepConfig(step.id, param.key, e.target.value)}
                                >
                                  <option value="">请选择类型</option>
                                  {param.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>
                            )}

                            {param.type === 'boolean' && (
                              <div 
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${step.config?.[param.key] ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                                onClick={() => handleUpdateStepConfig(step.id, param.key, !step.config?.[param.key])}
                              >
                                <span className="text-[11px] font-medium text-slate-600">{param.description || '状态启用控制'}</span>
                                <div className={`w-10 h-6 rounded-full relative transition-all ${step.config?.[param.key] ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${step.config?.[param.key] ? 'left-5' : 'left-1'}`} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                   <div className="flex items-center gap-2 mb-2 text-blue-700">
                     <AlertCircle className="w-4 h-4" />
                     <span className="text-[12px] font-bold">配置指引</span>
                   </div>
                   <p className="text-[11px] text-blue-600/80 leading-relaxed font-medium">
                     这里是当前步骤唯一的深度参数编辑入口。它编辑的是同一套 step.config：从步骤视角看是节点参数，从动作视角看是执行参数，系统会在过滤、评分和动作执行阶段按需读取。
                   </p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-theme-border bg-slate-50 p-6">
                <Button variant="primary" className="min-h-11 flex-1 rounded-xl shadow-lg shadow-blue-500/20" onClick={() => setEditingParamsStepId(null)}>
                  保存并应用
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Payload Entity Modal */}
      {isPayloadModalOpen && data && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <Code className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-white">策略规则编译报文 (Compiled Strategy Payload)</h3>
                    <p className="text-[10px] text-white/40 uppercase font-mono mt-0.5 tracking-widest">WMS Core Strategy Exchange Entity</p>
                  </div>
                </div>
                <button onClick={() => setIsPayloadModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-slate-900/50 custom-scrollbar">
                 <div className="bg-black/40 rounded-2xl border border-white/5 p-6 relative">
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                       <Badge variant="neutral" className="bg-white/5 border-white/10 text-emerald-400 font-mono text-[10px]">JSON_STRUCT</Badge>
                    </div>
                    <pre className="text-[12px] font-mono text-emerald-400/90 leading-relaxed">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                 </div>
                 
                 <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
                       <span className="text-[10px] text-white/30 font-bold uppercase block mb-1">指令映射</span>
                       <p className="text-[11px] text-white/70 leading-relaxed">映射为业务系统的指令模型，直接驱动物理执行。</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
                       <span className="text-[10px] text-white/30 font-bold uppercase block mb-1">原子化规则</span>
                       <p className="text-[11px] text-white/70 leading-relaxed">每条规则包含完整的条件组与多流水线计算逻辑。</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center">
                       <span className="text-[10px] text-white/30 font-bold uppercase block mb-1">热分发特性</span>
                       <p className="text-[11px] text-white/70 leading-relaxed">报文秒级下发至集群，实现逻辑动态热更新。</p>
                    </div>
                 </div>
              </div>
              <div className="p-6 border-t border-white/5 bg-slate-900 flex justify-end">
                 <Button variant="primary" className="h-11 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20" onClick={() => setIsPayloadModalOpen(false)}>
                   我已确认报文规范
                 </Button>
              </div>
           </div>
        </div>
      )}
      {/* Guide/Concept Modal */}
      <AnimatePresence>
        {isGuideModalOpen && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans"
            onClick={() => setIsGuideModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-theme-card rounded-[16px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-theme-border flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border bg-[#F8F9FA]">
                <h2 className="text-[16px] font-bold text-theme-ink flex items-center gap-2 m-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  WMS 策略编排架构指南 & 最佳实践 (Architecture Patterns)
                </h2>
                <Button variant="ghost" onClick={() => setIsGuideModalOpen(false)} className="!w-8 !h-8 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 prose prose-slate prose-sm max-w-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-blue-800 font-black uppercase tracking-tight border-b border-blue-100 pb-2">
                          <Workflow className="w-4 h-4" /> 架构模式 1: 降级流水线 (Waterfall)
                      </h4>
                      <p className="text-[13px] leading-relaxed">
                        这是最经典的寻址逻辑：从 <b>“最理想但最稀缺”</b> 的库位资源点开始尝试，如果被 Filter 拦截，则自动进入下一个维度。例如：
                        <br/><code className="bg-slate-100 px-1 text-[11px]">D1: 极速月台越库</code> → <code className="bg-slate-100 px-1 text-[11px]">D2: 自动化ASRS直存</code> → <code className="bg-slate-100 px-1 text-[11px]">D3: 阁楼手工拣选面</code>。
                      </p>
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-700 text-[12px] font-medium italic">
                          * 关键心法：将高成本、高时效、高风险的拦截器放在最左侧。
                      </div>
                      
                      <h4 className="flex items-center gap-2 text-emerald-800 font-black uppercase tracking-tight border-b border-emerald-100 pb-2 mt-8">
                          <LinkIcon className="w-4 h-4" /> 架构模式 2: 综合评分流 (Pipeline/Join)
                      </h4>
                      <p className="text-[13px] leading-relaxed">
                        当业务需要对库位进行 <b>“综合多维评分”</b> 时使用。逻辑是累加的。
                        <br/>例如：将 <code className="bg-slate-100 px-1 text-[11px]">库位距离评分</code> 与 <code className="bg-slate-100 px-1 text-[11px]">库位热度权重</code> 进行 Merge，得到最终排序，而不是简单过滤。
                      </p>

                      <h4 className="flex items-center gap-2 text-purple-800 font-black uppercase tracking-tight border-b border-purple-100 pb-2 mt-8">
                          <ArrowDownRight className="w-4 h-4" /> 架构模式 3: 特殊通道决策 (Jump)
                      </h4>
                      <p className="text-[13px] leading-relaxed">
                        当识别到特定特征（如：VIP、大件、急单）时，直接通过 <b>Jump</b> 越过常规降级链。这能极大提升复杂策略的响应效率和配置灵活性。
                      </p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-red-800 font-black uppercase tracking-tight border-b border-red-100 pb-2">
                          <ShieldCheck className="w-4 h-4" /> 安全边界: 强制合规拦截 (Guardrails)
                      </h4>
                      <p className="text-[13px] leading-relaxed">
                        独立于业务逻辑的 <b>“硬物理限制”</b>。无论上层业务如何寻址，强制合规拦截具有最高否决权。
                        <br/>常见应用：<code className="bg-slate-100 px-1 text-[11px]">巷道故障临时封锁</code>、<code className="bg-slate-100 px-1 text-[11px]">消防疏散通道禁止侵占</code>。
                      </p>
                      
                      <h4 className="flex items-center gap-2 text-purple-800 font-black uppercase tracking-tight border-b border-purple-100 pb-2 mt-8">
                          <Zap className="w-4 h-4" /> 性能极致: 影子回测 (Shadow Analysis)
                      </h4>
                      <p className="text-[13px] leading-relaxed">
                        在 Simulator 中利用 <b>“Shadow Mode”</b> 对比实际生产环境与新策略的性能差异。系统会自动抓取生产订单指纹进行蒙特卡洛模拟。
                      </p>

                      <h4 className="flex items-center gap-2 text-blue-900 font-bold text-[14px] mt-8 bg-blue-50/50 p-2 rounded">
                        <GitBranch className="w-4 h-4 ml-1" /> 动作节点执行逻辑 (Step Relationships)
                      </h4>
                      <ul className="text-[12px] space-y-2 mt-2 list-disc list-inside">
                        <li><b>满足即止 (Terminate)</b>: 找到最优库位立即锁定并返回。</li>
                        <li><b>综合评分流转 (Continue/Join)</b>: 结果将传递给下个语义步骤继续计算。</li>
                      </ul>

                      <h4 className="flex items-center gap-2 text-slate-900 font-bold text-[14px] mt-8 bg-slate-100 p-2 rounded">
                        <Settings className="w-4 h-4 ml-1" /> 节点参数与动作上下文 (Param Context)
                      </h4>
                      <p className="text-[13px] leading-relaxed">
                        每个动作步骤的参数是 <b>“主体驱动 (Subject-Driven)”</b> 的。系统会根据步骤聚焦的主体（如：库位、库存、资源）自动装配不同的业务参数，这些参数最终作为上下文注入算法引擎或脚本。
                      </p>
                    </div>
                </div>
              </div>
              <div className="p-6 border-t border-theme-border bg-slate-50 flex justify-end">
                  <Button variant="primary" className="h-10 px-6 rounded-lg text-[13px]" onClick={() => setIsGuideModalOpen(false)}>
                    了解了，继续配置
                  </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Guardrails Configuration Modal */}
      <AnimatePresence>
        {isGuardrailsOpen && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 font-sans"
            onClick={() => setIsGuardrailsOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden border border-red-100 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-8 py-6 border-b border-red-50 bg-red-50/30">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-[18px] font-black text-red-900 tracking-tight m-0 uppercase">全局策略拦截管控 (Global Guardrails)</h2>
                      <p className="text-[11px] text-red-600/70 font-bold">这些约束具有最高优先级，强制应用于当前策略下的所有维度寻址。</p>
                    </div>
                </div>
                <Button variant="ghost" onClick={() => setIsGuardrailsOpen(false)} className="rounded-full hover:bg-red-100 text-red-400">
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                  {(() => {
                    const mountedSourceIds = new Set((data?.guardrails || []).map(g => g.sourceGuardrailId).filter(Boolean));
                    const available = globalGuardrails.filter(gg => !mountedSourceIds.has(gg.id));
                    if (available.length === 0) return null;
                    return (
                      <div className="p-4 border border-blue-100 rounded-2xl bg-blue-50/40 space-y-2">
                        <div className="text-[10px] font-black text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> 从全局红线库挂载
                        </div>
                        {available.map(gg => (
                          <div key={gg.id} className="flex items-center justify-between bg-white border border-blue-100 rounded-xl px-4 py-2.5 gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-bold text-slate-800 truncate">{gg.name}</span>
                                <span className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded border ${gg.type === 'BLOCK' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                  {gg.type === 'BLOCK' ? '强制阻断' : '强控预警'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{gg.description}</p>
                            </div>
                            <button
                              onClick={() => {
                                const mounted = { ...gg, id: `gg-ref-${Date.now()}`, sourceGuardrailId: gg.id };
                                setData(prev => prev ? { ...prev, guardrails: [...(prev.guardrails || []), mounted] } : prev);
                              }}
                              className="shrink-0 h-7 px-3 text-[11px] font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                            >
                              挂载
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {data?.guardrails?.map((gr) => (
                    <div key={gr.id} className="p-5 border border-red-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${gr.active ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                      
                      <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-[15px] font-black text-slate-800">{gr.name}</h4>
                              {gr.sourceGuardrailId && (
                                <span className="text-[10px] text-slate-400 border border-slate-200 bg-slate-50 px-1.5 py-0.5 rounded-full font-bold">来自全局库</span>
                              )}
                            </div>
                            <p className="text-[12px] text-slate-500 mt-1">{gr.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={gr.type === 'BLOCK' ? 'warning' : 'neutral'} className="h-6 px-2 text-[10px] bg-red-50 text-red-600 border-red-100">
                                {gr.type === 'BLOCK' ? '强制阻断' : '强控预警'}
                            </Badge>
                            <button className={`w-10 h-6 rounded-full transition-colors relative ${gr.active ? 'bg-red-500' : 'bg-slate-200'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${gr.active ? 'left-5' : 'left-1'}`}></div>
                            </button>
                          </div>
                      </div>

                      <div className="p-3 bg-red-50/30 rounded-xl border border-dashed border-red-200">
                          <div className="text-[10px] text-red-900 font-bold uppercase tracking-wider mb-2 opacity-60">触发拦截条件 (Triggers)</div>
                          <div className="flex flex-wrap gap-2">
                            {gr.criteria.map((c, i) => (
                              <div key={i} className="px-2 py-1 bg-white border border-red-100 rounded-lg text-[11px] font-mono font-bold text-red-800 shadow-sm">
                                  {c.field} <span className="text-red-400">{c.operator}</span> {c.value}
                              </div>
                            ))}
                          </div>
                      </div>
                    </div>
                  ))}

                  <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-[13px] hover:border-red-500 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> 新增全局阻断逻辑
                  </button>
              </div>
              
              <div className="p-8 border-t border-red-50 bg-red-50/10 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setIsGuardrailsOpen(false)}>暂不保存</Button>
                  <Button variant="primary" className="bg-red-600 hover:bg-red-700 text-white shadow-red-200" onClick={() => setIsGuardrailsOpen(false)}>
                      更新合规拦截设置
                  </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Global Guardrails Intelligence Panel */}
      <AnimatePresence>
        {isGuardrailsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-[800px] bg-white rounded-[24px] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="bg-red-600 p-8 text-white relative">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                 <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <ShieldAlert className="w-8 h-8 text-white" />
                       </div>
                       <div>
                          <h2 className="text-[24px] font-black tracking-tight uppercase">全局阻断与强制拦截管控</h2>
                          <p className="text-[14px] opacity-80 font-medium">Global Strategy Guardrails (Physical Enforcement Layer)</p>
                       </div>
                    </div>
                    <button onClick={() => setIsGuardrailsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                       <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <div className="p-10">
                 <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                       <Info className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1">
                       <h3 className="text-[15px] font-bold text-red-900 mb-1">什么是全局合规红线？</h3>
                       <p className="text-[13px] text-red-700 leading-relaxed font-medium">
                          此图层独立于具体的上架或分配策略。无论业务规则如何配置，凡是触发全局红线的路径（如禁入维护通道、消防预留位、非合规供应商等）都将在底层被<b>硬截断</b>，确保系统物理安全与基线合规。
                       </p>
                    </div>
                 </div>

                 <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {(data?.guardrails || []).length > 0 ? (
                       data?.guardrails?.map((gr) => (
                          <div key={gr.id} className="p-6 bg-white border border-slate-200 rounded-2xl hover:border-red-200 transition-all group shadow-sm flex items-center justify-between">
                             <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-red-50 group-hover:border-red-100 transition-colors">
                                   {gr.type === 'BLOCK' ? <X className="w-6 h-6 text-red-500" /> : <ShieldCheck className="w-6 h-6 text-emerald-500" />}
                                </div>
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-black text-slate-800 text-[16px] uppercase tracking-tight">{gr.name}</h4>
                                      <Badge variant="neutral" className="bg-slate-100 text-[10px] font-bold">{gr.id}</Badge>
                                   </div>
                                   <p className="text-[12px] text-slate-500 font-medium max-w-[450px]">{gr.description}</p>
                                   <div className="flex gap-2 mt-3">
                                      {gr.criteria.map(c => (
                                         <span key={c.id} className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-mono text-slate-400">
                                            {c.field} {c.operator} {c.value}
                                         </span>
                                      ))}
                                   </div>
                                </div>
                             </div>
                             <div className="flex flex-col items-end gap-2 text-right">
                                <div className={`text-[10px] font-black uppercase tracking-widest ${gr.active ? 'text-emerald-500' : 'text-slate-400'}`}>
                                   STATUS: {gr.active ? 'ENFORCING' : 'DISABLED'}
                                </div>
                                <Button variant="ghost" className="h-8 px-3 text-[11px] font-bold border border-slate-200" onClick={() => {
                                   setData(prev => {
                                      if (!prev) return prev;
                                      return {
                                         ...prev,
                                         guardrails: prev.guardrails?.map(g => g.id === gr.id ? { ...g, active: !g.active } : g)
                                      };
                                   });
                                }}>
                                   {gr.active ? '停用此拦截' : '立即强制执行'}
                                </Button>
                             </div>
                          </div>
                       ))
                    ) : (
                       <div className="py-20 flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                          <ShieldCheck className="w-12 h-12 text-slate-200 mb-4" />
                          <p className="text-slate-400 font-bold text-[14px]">暂未定义任何全局管控策略</p>
                          <Button variant="ghost" className="mt-4 text-[12px] font-bold">+ 定义第一条合规拦截</Button>
                       </div>
                    )}
                 </div>
                 
                 <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button variant="ghost" className="font-bold text-[13px]" onClick={() => setIsGuardrailsOpen(false)}>暂不调整</Button>
                    <Button variant="primary" className="bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] px-8" onClick={() => setIsGuardrailsOpen(false)}>应用并同步全域容器</Button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Strategy Settings Modal (Triggers + Traffic Split) */}
      <AnimatePresence>
        {isStrategySettingsOpen && data && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 font-sans"
            onClick={() => setIsStrategySettingsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-black text-slate-900 tracking-tight m-0">实例属性配置</h2>
                    <p className="text-[11px] text-slate-400 font-medium">{data.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsStrategySettingsOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-8 pt-5 border-b border-slate-100 pb-0">
                {([
                  { key: 'triggers', label: '事件触发条件', icon: Bell },
                  { key: 'traffic', label: '灰度发布', icon: FlaskConical },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setSettingsTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-black rounded-t-xl border-b-2 transition-all -mb-px ${
                      settingsTab === tab.key
                        ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                        : 'text-slate-400 border-transparent hover:text-slate-600'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.key === 'triggers' && data.triggerConditions?.some((t: { enabled: boolean }) => t.enabled) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                    {tab.key === 'traffic' && data.trafficSplit?.enabled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">

                {/* Trigger Conditions Tab */}
                {settingsTab === 'triggers' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] text-slate-500">配置仓库事件自动触发此策略，无需手动调度。</p>
                      <button
                        onClick={() => {
                          const newTrigger: TriggerCondition = {
                            id: `tc-${Date.now()}`,
                            name: '新触发器',
                            enabled: true,
                            eventType: 'ORDER_ARRIVED',
                            subject: data.primarySubject,
                            conditions: [],
                          };
                          setData(prev => prev ? { ...prev, triggerConditions: [...(prev.triggerConditions ?? []), newTrigger] } : prev);
                        }}
                        className="flex items-center gap-1.5 text-[11px] font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> 添加触发器
                      </button>
                    </div>
                    {(data.triggerConditions ?? []).length === 0 && (
                      <div className="py-12 text-center text-slate-400 text-[12px] border-2 border-dashed border-slate-200 rounded-xl">
                        暂未配置事件触发器，策略仅支持手动调用
                      </div>
                    )}
                    {(data.triggerConditions ?? []).map((tc: TriggerCondition) => (
                      <div key={tc.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={tc.enabled}
                              onChange={e => setData(prev => prev ? {
                                ...prev,
                                triggerConditions: prev.triggerConditions!.map((t: TriggerCondition) => t.id === tc.id ? { ...t, enabled: e.target.checked } : t)
                              } : prev)}
                              className="w-4 h-4 rounded accent-blue-600"
                            />
                            <input
                              className="flex-1 bg-transparent text-[13px] font-black text-slate-800 focus:outline-none min-w-0"
                              value={tc.name}
                              onChange={e => setData(prev => prev ? {
                                ...prev,
                                triggerConditions: prev.triggerConditions!.map((t: TriggerCondition) => t.id === tc.id ? { ...t, name: e.target.value } : t)
                              } : prev)}
                            />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="relative">
                              <select
                                value={tc.eventType}
                                className="text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 pr-6 appearance-none focus:outline-none cursor-pointer"
                                onChange={e => setData(prev => prev ? {
                                  ...prev,
                                  triggerConditions: prev.triggerConditions!.map((t: TriggerCondition) => t.id === tc.id ? { ...t, eventType: e.target.value as TriggerEventType } : t)
                                } : prev)}
                              >
                                {(['INVENTORY_CHANGE','ORDER_ARRIVED','EQUIPMENT_STATUS','WIP_THRESHOLD','TIME_SCHEDULE','MANUAL'] as TriggerEventType[]).map(ev => (
                                  <option key={ev} value={ev}>{ev}</option>
                                ))}
                              </select>
                              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" />
                            </div>
                            <button onClick={() => setData(prev => prev ? { ...prev, triggerConditions: prev.triggerConditions!.filter((t: TriggerCondition) => t.id !== tc.id) } : prev)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="px-4 py-3 flex items-center gap-4">
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-black">冷却时间</span>
                            <input
                              type="number"
                              className="w-20 h-7 border border-slate-200 rounded-lg px-2 text-[11px] font-black focus:outline-none focus:border-blue-400"
                              value={(tc.cooldownMs ?? 0) / 1000}
                              onChange={e => setData(prev => prev ? {
                                ...prev,
                                triggerConditions: prev.triggerConditions!.map((t: TriggerCondition) => t.id === tc.id ? { ...t, cooldownMs: Number(e.target.value) * 1000 } : t)
                              } : prev)}
                            />
                            <span>秒</span>
                          </div>
                          <span className="text-[10px] text-slate-400">触发条件数: {tc.conditions.length}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Traffic Split Tab */}
                {settingsTab === 'traffic' && (
                  <div className="space-y-5">
                    <p className="text-[12px] text-slate-500">将一部分真实流量路由到此策略（实验版本），与基线策略并排运行，比较 KPI 差异。</p>
                    <div className="flex items-center justify-between border border-slate-200 rounded-xl px-4 py-3">
                      <span className="text-[13px] font-black text-slate-700">启用灰度发布</span>
                      <button
                        onClick={() => setData(prev => {
                          if (!prev) return prev;
                          const current = prev.trafficSplit;
                          if (!current) {
                            const newSplit: TrafficSplitConfig = { enabled: true, baselineStrategyId: '', experimentStrategyId: prev.id, splitRatio: 10, splitKey: 'ORDER_ID' };
                            return { ...prev, trafficSplit: newSplit };
                          }
                          return { ...prev, trafficSplit: { ...current, enabled: !current.enabled } };
                        })}
                        className={`w-11 h-6 rounded-full transition-colors relative ${data.trafficSplit?.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${data.trafficSplit?.enabled ? 'left-5.5' : 'left-0.5'}`} />
                      </button>
                    </div>
                    {data.trafficSplit && (
                      <div className={`space-y-4 transition-opacity ${data.trafficSplit.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">基线策略</label>
                          <div className="relative">
                            <select
                              value={data.trafficSplit.baselineStrategyId}
                              onChange={e => setData(prev => prev ? { ...prev, trafficSplit: { ...prev.trafficSplit!, baselineStrategyId: e.target.value } } : prev)}
                              className="w-full h-9 border border-slate-200 rounded-xl px-3 pr-8 text-[12px] font-bold appearance-none focus:outline-none focus:border-blue-400"
                            >
                              <option value="">请选择基线策略</option>
                              {allStrategies.filter(s => s.id !== data.id && s.status === 'ACTIVE').map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">实验流量比例: {data.trafficSplit.splitRatio}%</label>
                          <input
                            type="range" min={1} max={50}
                            value={data.trafficSplit.splitRatio}
                            onChange={e => setData(prev => prev ? { ...prev, trafficSplit: { ...prev.trafficSplit!, splitRatio: Number(e.target.value) } } : prev)}
                            className="w-full accent-blue-600"
                          />
                          <div className="flex justify-between text-[9px] text-slate-400 mt-1"><span>1%</span><span>50%</span></div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">流量切分键</label>
                          <div className="flex gap-2 flex-wrap">
                            {(['ORDER_ID','ZONE','TIME_SLOT','OPERATOR'] as const).map(k => (
                              <button
                                key={k}
                                onClick={() => setData(prev => prev ? { ...prev, trafficSplit: { ...prev.trafficSplit!, splitKey: k } } : prev)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-black border transition-all ${data.trafficSplit!.splitKey === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}
                              >{k}</button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">对比 KPI 指标</label>
                          <input
                            className="w-full h-9 border border-slate-200 rounded-xl px-3 text-[12px] font-bold focus:outline-none focus:border-blue-400"
                            placeholder="如：称重误差率、拣货效率"
                            value={data.trafficSplit.targetKpi ?? ''}
                            onChange={e => setData(prev => prev ? { ...prev, trafficSplit: { ...prev.trafficSplit!, targetKpi: e.target.value } } : prev)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Rollback Policy — always visible */}
              <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-black text-slate-700">步骤失败回滚策略</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">资源锁定的步骤失败时，决定已获取的锁如何回滚</p>
                  </div>
                  <select
                    value={data.rollbackPolicy ?? 'NONE'}
                    onChange={e => setData(prev => prev ? { ...prev, rollbackPolicy: e.target.value as 'FULL' | 'PARTIAL' | 'NONE' } : prev)}
                    className="h-9 border border-slate-200 rounded-xl px-3 pr-8 text-[12px] font-bold appearance-none focus:outline-none focus:border-blue-400 bg-white"
                  >
                    <option value="NONE">不回滚（保留现有行为）</option>
                    <option value="PARTIAL">部分回滚（仅失败步骤之后）</option>
                    <option value="FULL">全量回滚（释放所有已锁资源）</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 px-8 py-5">
                <Button variant="ghost" className="font-bold" onClick={() => setIsStrategySettingsOpen(false)}>取消</Button>
                <Button variant="primary" className="flex-1 font-bold" onClick={() => { handleSave(); setIsStrategySettingsOpen(false); }}>保存配置</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

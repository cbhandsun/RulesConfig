import React, { useState } from 'react';
/**
 * WMS 策略编排中心 (RulesConfig)
 * 
 * 本项目是一个工业级仓储管理系统 (WMS) 的策略编排平台。
 * 核心架构包含：
 * 1. 领域模型 (src/types/wms.ts): 定义策略、规则、算子及因子。
 * 2. 策略编辑器 (src/pages/Editor.tsx): 可视化编排逻辑的核心组件。
 * 3. 影子模拟 (src/pages/Simulator.tsx): 验证策略有效性的沙箱环境。
 * 
 * 详细文档请参考根目录下的 PROJECT_STRUCTURE.md。
 */
import { StrategyDetail, StrategyRule, GlobalGuardrail } from './types/wms';
import { mockStrategies, mockIndependentRules, mockGlobalGuardrails } from './data/mock';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Simulator from './pages/Simulator';
import TemplateLibrary from './pages/TemplateLibrary';
import FactorManager from './pages/FactorManager';
import MetadataCenter from './pages/MetadataCenter';
import RuleLibrary from './pages/RuleLibrary';
import { Button } from './components/ui';
import StrategyHelp from './components/StrategyHelp';
import { HelpCircle } from 'lucide-react';

// --- Generic Modal Component ---
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[12px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-theme-border flex justify-between items-center">
          <h3 className="font-semibold text-theme-ink">{title}</h3>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-ink transition-colors">✕</button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

// --- Simple Toast Hooks ---
const useToast = () => {
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-full text-sm font-medium shadow-xl animate-in slide-in-from-bottom-4 duration-300 ${
      type === 'success' ? 'bg-theme-ink text-white' : type === 'error' ? 'bg-red-600 text-white' : 'bg-theme-primary text-white'
    }`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('animate-out', 'fade-out', 'slide-out-to-bottom-4');
      setTimeout(() => {
        if (document.body.contains(toast)) document.body.removeChild(toast);
      }, 300);
    }, 2500);
  };
  return { showToast };
};

function App() {
  const [strategies, setStrategies] = useState<StrategyDetail[]>(mockStrategies);
  const [independentRules, setIndependentRules] = useState<StrategyRule[]>(mockIndependentRules);
  const [globalGuardrails, setGlobalGuardrails] = useState<GlobalGuardrail[]>(mockGlobalGuardrails);
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'EDITOR' | 'TEMPLATES' | 'LOGS' | 'FACTORS' | 'RULES' | 'METADATA'>('DASHBOARD');

  const navItems = [
    { key: 'DASHBOARD', label: '策略实例中心', description: '实例层 · 总览与编辑入口', active: currentView === 'DASHBOARD' || currentView === 'EDITOR' },
    { key: 'METADATA', label: '元数据治理', description: '语义底座层 · 对象/属性/动作/因子', active: currentView === 'METADATA' },
    { key: 'FACTORS', label: '因子工作台', description: '元数据子域 · 同源因子主数据', active: currentView === 'FACTORS' },
    { key: 'RULES', label: '全局规则库', description: '规则资产层 · 公共规则组件', active: currentView === 'RULES' },
    { key: 'TEMPLATES', label: '场景模板库', description: '场景方案层 · 模板创建实例', active: currentView === 'TEMPLATES' },
  ] as const;
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
  
  const [simulatorStrategyId, setSimulatorStrategyId] = useState<string | null>(null);
  const [simulatorRuleId, setSimulatorRuleId] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { showToast } = useToast();

  const handleEdit = (id: string) => {
    setActiveStrategyId(id);
    setCurrentView('EDITOR');
  };

  const handleSimulate = (id: string, ruleId?: string) => {
    setSimulatorStrategyId(id);
    if (ruleId) setSimulatorRuleId(ruleId);
    else setSimulatorRuleId(null);
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');

  const confirmCreate = () => {
    if (!newStrategyName.trim()) {
      showToast('请输入策略名称', 'error');
      return;
    }
    const newId = `STG-NEW-${Math.floor(Math.random() * 1000)}`;
    const newStrategy: StrategyDetail = {
      id: newId,
      name: newStrategyName,
      category: 'PUTAWAY',
      primarySubject: 'LOCATION',
      owner: '通用',
      scenario: '自定义配置场景',
      version: 'v1.0.0',
      status: 'DRAFT',
      priority: 50,
      rules: [
        {
          id: `rule-${Math.floor(Math.random() * 1000)}`,
          name: '默认分拨规则',
          enabled: true,
          matchingCriteria: [],
          steps: []
        }
      ]
    };
    setStrategies([newStrategy, ...strategies]);
    setActiveStrategyId(newId);
    setCurrentView('EDITOR');
    setIsCreateModalOpen(false);
    setNewStrategyName('');
    showToast('策略创建成功');
  };

  const handleCreateFromTemplate = (templateData: Partial<StrategyDetail>) => {
    const newId = `STG-TPL-${Math.floor(Math.random() * 1000)}`;
    const newStrategy: StrategyDetail = {
      id: newId,
      name: templateData.name || '新建策略',
      category: templateData.category || 'PUTAWAY',
      primarySubject: templateData.primarySubject || (templateData.category === 'ALLOCATION' ? 'INVENTORY_LOT' : 'LOCATION'),
      owner: '通用货主',
      scenario: templateData.scenario || '从模板克隆生成的场景',
      version: 'v1.0.0',
      status: 'DRAFT',
      priority: 50,
      rules: templateData.rules || []
    };
    setStrategies([newStrategy, ...strategies]);
    setActiveStrategyId(newId);
    setCurrentView('EDITOR');
    showToast('行业模板应用成功', 'info');
  };

  const handleSaveStrategy = (updatedStrategy: StrategyDetail) => {
    setStrategies((prev: StrategyDetail[]) => prev.map((s: StrategyDetail) => s.id === updatedStrategy.id ? updatedStrategy : s));
    showToast('策略实例已保存');
  };

  const activeStrategy = strategies.find(s => s.id === activeStrategyId) || null;
  const simulatorStrategy = strategies.find(s => s.id === simulatorStrategyId) || null;

  return (
    <div className="h-screen bg-theme-bg font-sans text-theme-ink flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <nav className="bg-theme-ink text-white h-[60px] flex items-center px-6 shrink-0 relative z-20 border-b border-white/10 justify-between">
        <div className="flex items-center">
          <div className="flex flex-col">
            <h1 className="text-[18px] font-medium tracking-tight m-0">RulesConfig 规则平台</h1>
            <span className="text-[11px] opacity-60 font-medium">语义底座、规则资产、场景方案、策略实例、仿真验证</span>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentView(item.key)}
              title={item.description}
              className={`px-4 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors ${
                item.active
                  ? 'bg-white/20 text-white'
                  : 'bg-transparent text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="w-px h-6 bg-white/10 mx-2"></div>
          
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <HelpCircle className="w-4 h-4" />
            <span>配置指南</span>
            <div className="w-1.5 h-1.5 rounded-full bg-blue-100 animate-pulse"></div>
          </button>
        </div>
      </nav>

      {/* Main Area */}
      <div className="flex-1 w-full bg-theme-bg relative flex flex-col overflow-hidden">
        {currentView === 'DASHBOARD' && (
          <Dashboard 
            strategies={strategies} 
            onEdit={handleEdit} 
            onCreate={() => setIsCreateModalOpen(true)}
            onSimulate={handleSimulate}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}
        {currentView === 'EDITOR' && (
          <Editor
            strategy={activeStrategy}
            allStrategies={strategies}
            independentRules={independentRules}
            globalGuardrails={globalGuardrails}
            onUpdateGlobalGuardrails={setGlobalGuardrails}
            onBack={() => setCurrentView('DASHBOARD')}
            onSimulate={handleSimulate}
            onSave={handleSaveStrategy}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}
        {currentView === 'TEMPLATES' && (
          <TemplateLibrary onUseTemplate={handleCreateFromTemplate} onOpenHelp={() => setIsHelpOpen(true)} />
        )}
        {currentView === 'FACTORS' && (
          <FactorManager onOpenHelp={() => setIsHelpOpen(true)} />
        )}
        {currentView === 'METADATA' && (
          <MetadataCenter strategies={strategies} onOpenHelp={() => setIsHelpOpen(true)} />
        )}
        {currentView === 'RULES' && (
          <RuleLibrary
            strategies={strategies}
            independentRules={independentRules}
            globalGuardrails={globalGuardrails}
            onUpdateStrategy={handleSaveStrategy}
            onUpdateIndependentRules={setIndependentRules}
            onUpdateGlobalGuardrails={setGlobalGuardrails}
            onSimulate={handleSimulate}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}
      </div>

      {simulatorStrategyId && (
        <Simulator 
          strategy={simulatorStrategy} 
          activeRuleId={simulatorRuleId || undefined}
          onClose={() => setSimulatorStrategyId(null)} 
        />
      )}

      <StrategyHelp 
        isOpen={isHelpOpen} 
        onClose={() => setIsHelpOpen(false)} 
        currentView={currentView}
      />

      {/* Application Modals */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        title="新建策略实例"
      >
        <div className="space-y-4">
          <p className="text-[12px] text-theme-muted">创建后您将进入策略实例编辑器，在实例层装配公共规则、私有规则和参数化配置。</p>
          <div>
            <label className="text-[11px] text-theme-muted font-semibold uppercase tracking-wider block mb-1.5">策略实例名称</label>
            <input 
              autoFocus
              className="w-full h-10 px-3 rounded-[6px] border border-theme-border focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary outline-none transition-all text-sm bg-theme-bg"
              placeholder="例如: 冷链一号仓出库分段策略"
              value={newStrategyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewStrategyName(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && confirmCreate()}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>取消</Button>
            <Button variant="primary" onClick={confirmCreate}>确认并进入实例编辑器</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;

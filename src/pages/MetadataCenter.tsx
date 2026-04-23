import React, { useEffect, useMemo, useState } from 'react';

import { actionMetas, attributeMetas, objectMetas } from '../data/metadata';
import { mockFactors } from '../data/mock';
import { BusinessAttributeMeta, BusinessObjectMeta, Factor, FactorTarget, RuleStepAction, RuleStepType, StrategyDetail } from '../types/wms';
import { Badge, Button, Card, Input, Select } from '../components/ui';
import { BookOpen, Boxes, Edit3, Layers, Save, Search, Sparkles } from 'lucide-react';
import {
  classifyDecisionFamily,
  decisionFamilyMeta,
  getEffectiveInputSubject,
  getEffectiveOutputSubject,
  getEffectiveStepAction,
  getEffectiveStepType,
  stepPatternMeta,
  summarizeSubjectFlow,
  type DecisionFamily,
} from '../utils/stepSemantics';

interface MetadataCenterProps {
  strategies: StrategyDetail[];
  onOpenHelp: () => void;
}

type GovernanceView = 'DECISIONS' | 'PATTERNS' | 'OBJECTS' | 'COVERAGE';

type GovernanceStepRecord = {
  strategyId: string;
  strategyName: string;
  strategyCategory: StrategyDetail['category'];
  strategyPrimarySubject: FactorTarget;
  ruleId: string;
  ruleName: string;
  stepId: string;
  stepName: string;
  stepDescription?: string;
  stepType: RuleStepType;
  action: RuleStepAction;
  decisionFamily: DecisionFamily;
  inputSubject: FactorTarget;
  outputSubject: FactorTarget;
  subjectFlow: string;
  filterCount: number;
  sorterCount: number;
  configCount: number;
  hasBindings: boolean;
  bindingCount: number;
  filterFields: string[];
  sorterFactorIds: string[];
  sorterFactorNames: string[];
  configKeys: string[];
};

type GovernanceCard = {
  family: DecisionFamily;
  meta: typeof decisionFamilyMeta[DecisionFamily];
  steps: GovernanceStepRecord[];
  stepTypes: RuleStepType[];
  actions: RuleStepAction[];
  inputSubjects: FactorTarget[];
  outputSubjects: FactorTarget[];
  subjectFlows: string[];
  filterFields: string[];
  factorNames: string[];
  sampleSteps: GovernanceStepRecord[];
};

type PatternCard = {
  stepType: RuleStepType;
  meta: typeof stepPatternMeta[RuleStepType];
  steps: GovernanceStepRecord[];
  actions: RuleStepAction[];
  subjectFlows: string[];
  inputSubjects: FactorTarget[];
  outputSubjects: FactorTarget[];
  filterFields: string[];
  factorNames: string[];
  averageFilters: string;
  averageSorters: string;
  bindingUsage: number;
  sampleSteps: GovernanceStepRecord[];
};

type DraftAction = {
  code: RuleStepAction;
  name: string;
  executionMeaning: string;
  decisionGuidance: string;
  typicalOutputs: string[];
};

type DraftAttribute = {
  id: string;
  key: string;
  name: string;
  valueType: BusinessAttributeMeta['valueType'];
  decisionRole: NonNullable<BusinessAttributeMeta['decisionRole']>;
  businessMeaning: string;
};

type DraftFactor = {
  id: string;
  name: string;
  impactType: Factor['impactType'];
  attributeRefs: string[];
  formula: string;
  decisionPurpose: string;
  businessMeaning: string;
};

type ObjectDraft = {
  description: string;
  category: NonNullable<BusinessObjectMeta['category']>;
  businessOwner: string;
  lifecycleStage: NonNullable<BusinessObjectMeta['lifecycleStage']>;
  sourceSystems: string;
  businessMeaning: string;
  typicalRoleInStep: string;
  commonDecisions: string;
  primaryActions: RuleStepAction[];
  draftActions: DraftAction[];
  coreAttributes: string;
  keyFactorIds: string[];
  draftAttributes: DraftAttribute[];
  draftFactors: DraftFactor[];
  upstreamObjects: FactorTarget[];
  downstreamObjects: FactorTarget[];
  governanceNotes: string;
};


type ObjectUsageRecord = {
  stepType: RuleStepType;
  action: RuleStepAction;
  decisionFamily: DecisionFamily;
  strategyName: string;
  ruleName: string;
  stepName: string;
  role: 'INPUT' | 'OUTPUT';
};

const toDraftAction = (action: typeof actionMetas[number]): DraftAction => ({
  code: action.code,
  name: action.name,
  executionMeaning: action.executionMeaning ?? '',
  decisionGuidance: action.decisionGuidance ?? '',
  typicalOutputs: action.typicalOutputs ?? [],
});

const toDraftAttribute = (attribute: BusinessAttributeMeta): DraftAttribute => ({
  id: attribute.id,
  key: attribute.key,
  name: attribute.name,
  valueType: attribute.valueType,
  decisionRole: attribute.decisionRole ?? 'FILTER',
  businessMeaning: attribute.businessMeaning ?? '',
});

const toDraftFactor = (factor: Factor): DraftFactor => ({
  id: factor.id,
  name: factor.name,
  impactType: factor.impactType,
  attributeRefs: factor.attributeRefs ?? [],
  formula: factor.logic?.formula ?? '',
  decisionPurpose: factor.decisionPurpose ?? '',
  businessMeaning: factor.businessMeaning ?? '',
});

const createObjectDraft = (objectMeta: BusinessObjectMeta): ObjectDraft => ({
  description: objectMeta.description ?? '',
  category: objectMeta.category ?? 'MASTER',
  businessOwner: objectMeta.businessOwner ?? '',
  lifecycleStage: objectMeta.lifecycleStage ?? 'ACTIVE',
  sourceSystems: (objectMeta.sourceSystems ?? []).join(', '),
  businessMeaning: objectMeta.businessMeaning ?? '',
  typicalRoleInStep: objectMeta.typicalRoleInStep ?? '',
  commonDecisions: (objectMeta.commonDecisions ?? []).join('\n'),
  primaryActions: [...(objectMeta.primaryActions ?? [])],
  draftActions: [],
  coreAttributes: (objectMeta.coreAttributes ?? []).join('\n'),
  keyFactorIds: [],
  draftAttributes: [],
  draftFactors: [],
  upstreamObjects: [...(objectMeta.upstreamObjects ?? [])],
  downstreamObjects: [...(objectMeta.downstreamObjects ?? [])],
  governanceNotes: (objectMeta.governanceNotes ?? []).join('\n'),
});


const splitLines = (value: string) => value.split(/\r?\n|,/).map(item => item.trim()).filter(Boolean);
const joinLines = (items: string[]) => items.join('\n');

const governanceViews: { key: GovernanceView; label: string; description: string }[] = [
  { key: 'DECISIONS', label: '业务决策', description: '按业务问题组织治理视角' },
  { key: 'PATTERNS', label: 'Step 模式', description: '按 FILTER / SELECT / TRANSFORM / GATEWAY 理解骨架' },
  { key: 'OBJECTS', label: '业务对象', description: '按参与角色查看对象、属性、动作和因子' },
  { key: 'COVERAGE', label: '治理覆盖度', description: '诊断 metadata 解释强弱和薄弱区域' },
];

const attributeGroups = [
  { key: 'IDENTITY', label: '识别类属性', description: '帮助 step 识别对象身份、类型和业务来源。' },
  { key: 'FILTER', label: '过滤类属性', description: '用于先筛掉不符合条件的候选对象。' },
  { key: 'RANKING', label: '排序类属性', description: '用于对候选对象做优先级比较和排序。' },
  { key: 'CONSTRAINT', label: '约束类属性', description: '用于做硬门槛、容量、安全、合规等限制判断。' },
  { key: 'OUTPUT', label: '结果类属性', description: '用于承接 step 输出结果或结果表达。' },
  { key: 'UNCLASSIFIED', label: '未分类属性', description: '尚未明确归入具体判断角色的属性。' },
] as const;

const unique = <T,>(values: T[]) => Array.from(new Set(values));
const percent = (value: number, total: number) => (total === 0 ? 0 : Math.round((value / total) * 100));

const matchesObjectQuery = (objectMeta: BusinessObjectMeta, query: string) => {
  if (!query) return true;

  const lower = query.toLowerCase();
  return [
    objectMeta.code,
    objectMeta.name,
    objectMeta.description,
    objectMeta.businessMeaning,
    objectMeta.typicalRoleInStep,
    ...(objectMeta.commonDecisions ?? []),
  ].some(value => value?.toLowerCase().includes(lower));
};

export default function MetadataCenter({ strategies, onOpenHelp }: MetadataCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<GovernanceView>('DECISIONS');
  const [activeObjectCode, setActiveObjectCode] = useState<FactorTarget>(objectMetas[0]?.code ?? 'CONTEXT');
  const [editingObjectCode, setEditingObjectCode] = useState<FactorTarget | null>(null);
  const [objectEditorSection, setObjectEditorSection] = useState<'PROFILE' | 'ACTION' | 'ATTRIBUTE' | 'FACTOR' | 'FLOW' | 'NOTE'>('PROFILE');
  const [expandedEditorCards, setExpandedEditorCards] = useState<Record<string, boolean>>({});
  const [runtimeLookupExpanded, setRuntimeLookupExpanded] = useState(false);
  const [objectDrafts, setObjectDrafts] = useState<Record<FactorTarget, ObjectDraft>>(() => (
    Object.fromEntries(objectMetas.map(objectMeta => [objectMeta.code, createObjectDraft(objectMeta)])) as Record<FactorTarget, ObjectDraft>
  ));

  const governanceSteps = useMemo<GovernanceStepRecord[]>(() => (
    strategies.flatMap(strategy => strategy.rules.flatMap(rule => rule.steps.map(step => {
      const stepType = getEffectiveStepType(step);
      const action = getEffectiveStepAction(step);
      const inputSubject = getEffectiveInputSubject(step, strategy.primarySubject);
      const outputSubject = getEffectiveOutputSubject(step, strategy.primarySubject);

      return {
        strategyId: strategy.id,
        strategyName: strategy.name,
        strategyCategory: strategy.category,
        strategyPrimarySubject: strategy.primarySubject,
        ruleId: rule.id,
        ruleName: rule.name,
        stepId: step.id,
        stepName: step.name,
        stepDescription: step.description,
        stepType,
        action,
        decisionFamily: classifyDecisionFamily(action, stepType),
        inputSubject,
        outputSubject,
        subjectFlow: summarizeSubjectFlow(inputSubject, outputSubject),
        filterCount: step.filters.length,
        sorterCount: step.sorters.length,
        configCount: Object.keys(step.config ?? {}).length,
        hasBindings: Boolean(step.upstreamBindings?.length),
        bindingCount: step.upstreamBindings?.length ?? 0,
        filterFields: unique(step.filters.map(filter => filter.field)),
        sorterFactorIds: unique(step.sorters.map(sorter => sorter.factorId)),
        sorterFactorNames: unique(step.sorters.map(sorter => sorter.factorName)),
        configKeys: Object.keys(step.config ?? {}),
      };
    })))
  ), [strategies]);

  const searchLower = searchQuery.trim().toLowerCase();

  const filteredObjectMetas = useMemo(() => objectMetas.filter(objectMeta => {
    if (matchesObjectQuery(objectMeta, searchLower)) return true;

    return attributeMetas.some(attribute => (
      attribute.objectCode === objectMeta.code
      && [attribute.id, attribute.key, attribute.name, attribute.businessMeaning].some(value => value?.toLowerCase().includes(searchLower))
    )) || mockFactors.some(factor => (
      factor.targetObject === objectMeta.code
      && [factor.id, factor.name, factor.description, factor.businessMeaning, factor.decisionPurpose].some(value => value?.toLowerCase().includes(searchLower))
    ));
  }), [searchLower]);

  const activeObject = filteredObjectMetas.find(objectMeta => objectMeta.code === activeObjectCode) ?? filteredObjectMetas[0] ?? objectMetas[0];
  const activeObjectDraft = activeObject ? objectDrafts[activeObject.code] ?? createObjectDraft(activeObject) : null;
  const isEditingObject = activeObject ? editingObjectCode === activeObject.code : false;

  useEffect(() => {
    if (!activeObject) return;
    if (!objectDrafts[activeObject.code]) {
      setObjectDrafts(prev => ({ ...prev, [activeObject.code]: createObjectDraft(activeObject) }));
    }
  }, [activeObject, objectDrafts]);

  useEffect(() => {
    setRuntimeLookupExpanded(false);
    setExpandedEditorCards({});
  }, [activeObjectCode]);

  const decisionCards = useMemo<GovernanceCard[]>(() => {
    return (Object.keys(decisionFamilyMeta) as DecisionFamily[])
      .map(family => {
        const steps = governanceSteps.filter(step => step.decisionFamily === family);
        if (!steps.length) return null;

        return {
          family,
          meta: decisionFamilyMeta[family],
          steps,
          stepTypes: unique(steps.map(step => step.stepType)),
          actions: unique(steps.map(step => step.action)),
          inputSubjects: unique(steps.map(step => step.inputSubject)),
          outputSubjects: unique(steps.map(step => step.outputSubject)),
          subjectFlows: unique(steps.map(step => step.subjectFlow)),
          filterFields: unique(steps.flatMap(step => step.filterFields)).slice(0, 10),
          factorNames: unique(steps.flatMap(step => step.sorterFactorNames)).slice(0, 10),
          sampleSteps: steps.slice(0, 3),
        };
      })
      .filter((card): card is GovernanceCard => card !== null)
      .filter(card => {
        if (!searchLower) return true;
        return [
          card.meta.label,
          card.meta.description,
          card.meta.businessQuestion,
          ...card.actions,
          ...card.inputSubjects,
          ...card.outputSubjects,
          ...card.filterFields,
          ...card.factorNames,
          ...card.sampleSteps.map(step => `${step.strategyName} ${step.ruleName} ${step.stepName}`),
        ].some(value => value.toLowerCase().includes(searchLower));
      });
  }, [governanceSteps, searchLower]);

  const patternCards = useMemo<PatternCard[]>(() => {
    return (Object.keys(stepPatternMeta) as RuleStepType[])
      .map(stepType => {
        const steps = governanceSteps.filter(step => step.stepType === stepType);
        if (!steps.length) return null;

        return {
          stepType,
          meta: stepPatternMeta[stepType],
          steps,
          actions: unique(steps.map(step => step.action)),
          subjectFlows: unique(steps.map(step => step.subjectFlow)),
          inputSubjects: unique(steps.map(step => step.inputSubject)),
          outputSubjects: unique(steps.map(step => step.outputSubject)),
          filterFields: unique(steps.flatMap(step => step.filterFields)).slice(0, 8),
          factorNames: unique(steps.flatMap(step => step.sorterFactorNames)).slice(0, 8),
          averageFilters: (steps.reduce((sum, step) => sum + step.filterCount, 0) / steps.length).toFixed(1),
          averageSorters: (steps.reduce((sum, step) => sum + step.sorterCount, 0) / steps.length).toFixed(1),
          bindingUsage: steps.filter(step => step.hasBindings).length,
          sampleSteps: steps.slice(0, 3),
        };
      })
      .filter((card): card is PatternCard => card !== null)
      .filter(card => {
        if (!searchLower) return true;
        return [
          card.meta.label,
          card.meta.description,
          card.meta.focus,
          ...card.actions,
          ...card.subjectFlows,
          ...card.factorNames,
          ...card.filterFields,
        ].some(value => value.toLowerCase().includes(searchLower));
      });
  }, [governanceSteps, searchLower]);

  const activeObjectAttributes = attributeMetas.filter(attribute => attribute.objectCode === activeObject?.code);
  const editableAttributes = activeObjectAttributes.map(attribute => {
    const draftAttribute = (activeObjectDraft?.draftAttributes ?? []).find(item => item.id === attribute.id);
    return draftAttribute ?? toDraftAttribute(attribute);
  });
  const customDraftAttributes = (activeObjectDraft?.draftAttributes ?? []).filter(attribute => !activeObjectAttributes.some(item => item.id === attribute.id));
  const draftAttributes = [...editableAttributes, ...customDraftAttributes];
  const activeObjectFactors = mockFactors.filter(factor => factor.targetObject === activeObject?.code);
  const editableFactors = activeObjectFactors.map(factor => {
    const draftFactor = (activeObjectDraft?.draftFactors ?? []).find(item => item.id === factor.id);
    return draftFactor ?? toDraftFactor(factor);
  });
  const customDraftFactors = (activeObjectDraft?.draftFactors ?? []).filter(factor => !activeObjectFactors.some(item => item.id === factor.id));
  const draftFactors = [...editableFactors, ...customDraftFactors];
  const editableActions = actionMetas
    .filter(action => activeObjectDraft?.primaryActions.includes(action.code) || activeObject?.supportedActions?.includes(action.code))
    .map(action => {
      const draftAction = (activeObjectDraft?.draftActions ?? []).find(item => item.code === action.code);
      return draftAction ?? toDraftAction(action);
    });
  const customDraftActions = (activeObjectDraft?.draftActions ?? []).filter(action => !actionMetas.some(item => item.code === action.code));
  const draftActions = [...editableActions, ...customDraftActions];
  const activeObjectActions = draftActions;
  const activeObjectStepUsage = governanceSteps.filter(step => step.inputSubject === activeObject?.code || step.outputSubject === activeObject?.code);
  const relevantFactorIds = new Set(activeObjectStepUsage.flatMap(step => step.sorterFactorIds));
  const relatedFactors = mockFactors.filter(factor => factor.targetObject !== activeObject?.code && relevantFactorIds.has(factor.id));

  const objectInputUsage = activeObjectStepUsage.filter(step => step.inputSubject === activeObject?.code);
  const objectOutputUsage = activeObjectStepUsage.filter(step => step.outputSubject === activeObject?.code);
  const objectUsageByRole: { title: string; description: string; records: ObjectUsageRecord[] }[] = [
    {
      title: '作为输入对象',
      description: '这个对象以什么身份进入 step，供后续判断、筛选和计算使用。',
      records: objectInputUsage.map(step => ({
        stepType: step.stepType,
        action: step.action,
        decisionFamily: step.decisionFamily,
        strategyName: step.strategyName,
        ruleName: step.ruleName,
        stepName: step.stepName,
        role: 'INPUT',
      })),
    },
    {
      title: '作为输出对象',
      description: '这个对象在 step 处理后作为结果产出、承接对象或下一跳落点出现。',
      records: objectOutputUsage.map(step => ({
        stepType: step.stepType,
        action: step.action,
        decisionFamily: step.decisionFamily,
        strategyName: step.strategyName,
        ruleName: step.ruleName,
        stepName: step.stepName,
        role: 'OUTPUT',
      })),
    },
  ];

  const groupedAttributes = attributeGroups
    .map(group => ({
      ...group,
      attributes: activeObjectAttributes.filter(attribute => (attribute.decisionRole ?? 'UNCLASSIFIED') === group.key),
    }))
    .filter(group => group.attributes.length > 0);

  const activeObjectDecisionFamilies = unique(activeObjectStepUsage.map(step => step.decisionFamily));
  const activeObjectFrequentActions = unique(activeObjectStepUsage.map(step => step.action));
  const activeObjectFrequentFactors = unique(activeObjectStepUsage.flatMap(step => step.sorterFactorNames));
  const activeObjectFrequentFields = unique(activeObjectStepUsage.flatMap(step => step.filterFields));
  const supportedActions = activeObject?.supportedActions ?? [];
  const primaryActions = activeObjectDraft?.primaryActions.length ? activeObjectDraft.primaryActions : activeObject?.primaryActions ?? [];
  const actualUsageActions = activeObjectFrequentActions;
  const allRegisteredActions = actionMetas.map(action => action.code);
  const allActionCodes = draftActions.map(action => action.code);
  const allAttributeKeys = draftAttributes.map(attribute => attribute.key);
  const keyAttributeKeys = splitLines(activeObjectDraft?.coreAttributes ?? '').length
    ? splitLines(activeObjectDraft?.coreAttributes ?? '')
    : activeObject.coreAttributes ?? [];
  const allFactorIds = draftFactors.map(factor => factor.id);
  const keyFactorIds = activeObjectDraft?.keyFactorIds.length
    ? activeObjectDraft.keyFactorIds
    : activeObjectFactors.filter(factor => activeObjectFrequentFactors.includes(factor.name)).map(factor => factor.id);
  const keyFactors = keyFactorIds
    .map(factorId => draftFactors.find(factor => factor.id === factorId) ?? activeObjectFactors.find(factor => factor.id === factorId))
    .filter((factor): factor is DraftFactor | Factor => Boolean(factor));
  const nonPrimaryActions = allActionCodes.filter(actionCode => !primaryActions.includes(actionCode));
  const nonKeyAttributeKeys = allAttributeKeys.filter(attributeKey => !keyAttributeKeys.includes(attributeKey));
  const nonKeyFactorIds = allFactorIds.filter(factorId => !keyFactorIds.includes(factorId));

  const updateActiveObjectDraft = (patch: Partial<ObjectDraft>) => {
    if (!activeObject) return;
    setObjectDrafts(prev => ({
      ...prev,
      [activeObject.code]: {
        ...(prev[activeObject.code] ?? createObjectDraft(activeObject)),
        ...patch,
      },
    }));
  };

  const toggleDraftAction = (action: RuleStepAction) => {
    if (!activeObjectDraft) return;
    const nextActions = activeObjectDraft.primaryActions.includes(action)
      ? activeObjectDraft.primaryActions.filter(code => code !== action)
      : [...activeObjectDraft.primaryActions, action];
    updateActiveObjectDraft({ primaryActions: nextActions });
  };

  const addDraftAction = () => {
    if (!activeObject) return;
    const draft = objectDrafts[activeObject.code] ?? createObjectDraft(activeObject);
    const nextIndex = draft.draftActions.filter(action => action.code.startsWith(`CUSTOM_${activeObject.code}_`)).length + 1;
    const actionCode = `CUSTOM_${activeObject.code}_${nextIndex}` as RuleStepAction;
    updateActiveObjectDraft({
      primaryActions: draft.primaryActions.includes(actionCode) ? draft.primaryActions : [...draft.primaryActions, actionCode],
      draftActions: [
        ...draft.draftActions,
        {
          code: actionCode,
          name: `新动作 ${nextIndex}`,
          executionMeaning: '',
          decisionGuidance: '',
          typicalOutputs: [],
        },
      ],
    });
  };

  const updateDraftAction = (actionCode: RuleStepAction, patch: Partial<DraftAction>) => {
    if (!activeObject) return;
    const draft = objectDrafts[activeObject.code] ?? createObjectDraft(activeObject);
    const existingAction = actionMetas.find(action => action.code === actionCode);
    const baseAction = draft.draftActions.find(action => action.code === actionCode)
      ?? (existingAction ? toDraftAction(existingAction) : null);
    if (!baseAction) return;
    const nextDraftActions = draft.draftActions.some(action => action.code === actionCode)
      ? draft.draftActions.map(action => action.code === actionCode ? { ...action, ...patch } : action)
      : [...draft.draftActions, { ...baseAction, ...patch }];
    updateActiveObjectDraft({ draftActions: nextDraftActions });
  };

  const removeDraftAction = (actionCode: RuleStepAction) => {
    if (!activeObject) return;
    const draft = objectDrafts[activeObject.code] ?? createObjectDraft(activeObject);
    updateActiveObjectDraft({
      primaryActions: draft.primaryActions.filter(code => code !== actionCode),
      draftActions: draft.draftActions.filter(action => action.code !== actionCode),
    });
  };

  const toggleDraftCoreAttribute = (attributeKey: string) => {
    if (!activeObject) return;
    const currentKeys = splitLines((objectDrafts[activeObject.code] ?? createObjectDraft(activeObject)).coreAttributes);
    const nextKeys = currentKeys.includes(attributeKey)
      ? currentKeys.filter(key => key !== attributeKey)
      : [...currentKeys, attributeKey];
    updateActiveObjectDraft({ coreAttributes: nextKeys.join('\n') });
  };

  const addDraftAttribute = () => {
    if (!activeObject) return;
    const draft = objectDrafts[activeObject.code] ?? createObjectDraft(activeObject);
    const nextIndex = draft.draftAttributes.filter(attribute => attribute.id.startsWith(`draft.${activeObject.code}.attribute.`)).length + 1;
    updateActiveObjectDraft({
      draftAttributes: [
        ...draft.draftAttributes,
        {
          id: `draft.${activeObject.code}.attribute.${nextIndex}`,
          key: `newAttribute${nextIndex}`,
          name: `新属性 ${nextIndex}`,
          valueType: 'string',
          decisionRole: 'FILTER',
          businessMeaning: '',
        },
      ],
    });
  };

  const updateDraftAttribute = (attributeId: string, patch: Partial<DraftAttribute>) => {
    if (!activeObject) return;
    const draft = objectDrafts[activeObject.code] ?? createObjectDraft(activeObject);
    const existingAttribute = activeObjectAttributes.find(attribute => attribute.id === attributeId);
    const baseAttribute = draft.draftAttributes.find(attribute => attribute.id === attributeId)
      ?? (existingAttribute ? toDraftAttribute(existingAttribute) : null);
    if (!baseAttribute) return;
    const nextDraftAttributes = draft.draftAttributes.some(attribute => attribute.id === attributeId)
      ? draft.draftAttributes.map(attribute => attribute.id === attributeId ? { ...attribute, ...patch } : attribute)
      : [...draft.draftAttributes, { ...baseAttribute, ...patch }];
    updateActiveObjectDraft({ draftAttributes: nextDraftAttributes });
  };

  const removeDraftAttribute = (attributeId: string) => {
    if (!activeObject) return;
    const draft = objectDrafts[activeObject.code] ?? createObjectDraft(activeObject);
    const attribute = draftAttributes.find(item => item.id === attributeId);
    updateActiveObjectDraft({
      draftAttributes: draft.draftAttributes.filter(item => item.id !== attributeId),
      coreAttributes: joinLines(splitLines(draft.coreAttributes).filter(key => key !== attribute?.key)),
    });
  };

  const toggleDraftKeyFactor = (factorId: string) => {
    if (!activeObjectDraft) return;
    const nextFactorIds = activeObjectDraft.keyFactorIds.includes(factorId)
      ? activeObjectDraft.keyFactorIds.filter(id => id !== factorId)
      : [...activeObjectDraft.keyFactorIds, factorId];
    updateActiveObjectDraft({ keyFactorIds: nextFactorIds });
  };

  const addDraftFactor = () => {
    if (!activeObject) return;
    const draft = objectDrafts[activeObject.code] ?? createObjectDraft(activeObject);
    const nextIndex = draft.draftFactors.filter(factor => factor.id.startsWith(`draft.${activeObject.code}.`)).length + 1;
    updateActiveObjectDraft({
      draftFactors: [
        ...draft.draftFactors,
        {
          id: `draft.${activeObject.code}.${nextIndex}`,
          name: `新因子 ${nextIndex}`,
          impactType: 'ADJUSTMENT',
          attributeRefs: [],
          formula: '',
          decisionPurpose: '',
          businessMeaning: '',
        },
      ],
    });
  };

  const updateDraftFactor = (factorId: string, patch: Partial<DraftFactor>) => {
    if (!activeObject) return;
    const draft = objectDrafts[activeObject.code] ?? createObjectDraft(activeObject);
    const existingFactor = activeObjectFactors.find(factor => factor.id === factorId);
    const baseFactor = draft.draftFactors.find(factor => factor.id === factorId)
      ?? (existingFactor ? toDraftFactor(existingFactor) : null);
    if (!baseFactor) return;
    const nextDraftFactors = draft.draftFactors.some(factor => factor.id === factorId)
      ? draft.draftFactors.map(factor => factor.id === factorId ? { ...factor, ...patch } : factor)
      : [...draft.draftFactors, { ...baseFactor, ...patch }];
    updateActiveObjectDraft({ draftFactors: nextDraftFactors });
  };

  const removeDraftFactor = (factorId: string) => {
    if (!activeObject) return;
    const draft = objectDrafts[activeObject.code] ?? createObjectDraft(activeObject);
    updateActiveObjectDraft({
      draftFactors: draft.draftFactors.filter(factor => factor.id !== factorId),
      keyFactorIds: draft.keyFactorIds.filter(id => id !== factorId),
    });
  };

  const addDraftListItem = (field: 'sourceSystems' | 'commonDecisions' | 'governanceNotes', value: string) => {
    if (!activeObject) return;
    const nextValue = value.trim();
    if (!nextValue) return;
    const currentItems = splitLines((objectDrafts[activeObject.code] ?? createObjectDraft(activeObject))[field]);
    if (currentItems.includes(nextValue)) return;
    updateActiveObjectDraft({ [field]: joinLines([...currentItems, nextValue]) });
  };

  const removeDraftListItem = (field: 'sourceSystems' | 'commonDecisions' | 'governanceNotes', value: string) => {
    if (!activeObject) return;
    const currentItems = splitLines((objectDrafts[activeObject.code] ?? createObjectDraft(activeObject))[field]);
    updateActiveObjectDraft({ [field]: joinLines(currentItems.filter(item => item !== value)) });
  };

  const addDraftObjectRelation = (field: 'upstreamObjects' | 'downstreamObjects') => {
    if (!activeObjectDraft || !activeObject) return;
    const available = objectMetas.find(objectMeta => objectMeta.code !== activeObject.code && !(activeObjectDraft[field] ?? []).includes(objectMeta.code));
    if (!available) return;
    updateActiveObjectDraft({ [field]: [...(activeObjectDraft[field] ?? []), available.code] });
  };

  const removeDraftObjectRelation = (field: 'upstreamObjects' | 'downstreamObjects', code: FactorTarget) => {
    if (!activeObjectDraft) return;
    updateActiveObjectDraft({ [field]: (activeObjectDraft[field] ?? []).filter(item => item !== code) });
  };

  const toggleEditorCard = (key: string) => {
    setExpandedEditorCards(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const coverage = useMemo(() => {
    const objectMissing = objectMetas.filter(objectMeta => !objectMeta.businessMeaning || !objectMeta.typicalRoleInStep || !(objectMeta.commonDecisions?.length));
    const attributeMissing = attributeMetas.filter(attribute => !attribute.decisionRole || !attribute.businessMeaning || !(attribute.exampleValues?.length));
    const actionMissing = actionMetas.filter(action => !action.executionMeaning || !action.decisionGuidance || !(action.typicalOutputs?.length));

    const factorUsageCount = new Map<string, number>();
    governanceSteps.forEach(step => {
      step.sorterFactorIds.forEach(factorId => factorUsageCount.set(factorId, (factorUsageCount.get(factorId) ?? 0) + 1));
    });

    const factorsByUsage = [...mockFactors]
      .map(factor => ({ ...factor, usageCount: factorUsageCount.get(factor.id) ?? 0 }))
      .sort((a, b) => b.usageCount - a.usageCount);

    const factorMissing = factorsByUsage.filter(factor => factor.usageCount > 0 && (!factor.businessMeaning || !factor.decisionPurpose || !factor.interpretationHint));
    const freeTextHeavySteps = governanceSteps.filter(step => step.configCount > 0 && step.sorterCount === 0 && step.filterCount === 0);

    return {
      objectMissing,
      attributeMissing,
      actionMissing,
      factorMissing,
      freeTextHeavySteps,
      factorUsageCount,
    };
  }, [governanceSteps]);

  const summaryCards = [
    { label: '业务对象', value: objectMetas.length, icon: Boxes },
    { label: '属性元数据', value: attributeMetas.length, icon: Layers },
    { label: '动作元数据', value: actionMetas.length, icon: Sparkles },
    { label: '真实步骤', value: governanceSteps.length, icon: BookOpen },
  ];

  const renderDecisionView = () => (
    <div className="space-y-6">
      <Card className="p-5 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[16px] font-semibold text-theme-ink">业务决策视图</h3>
            <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-theme-muted">
              不再按“对象 / 动作 / 因子”拆散看，而是先回答业务真正关心的问题：先校验能不能继续、再优选候选、再分配落点、再决定路由或生成任务。
            </p>
          </div>
          <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">decision-first</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {decisionCards.map(card => (
          <Card key={card.family} className="p-5 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[17px] font-semibold text-theme-ink">{card.meta.label}</div>
                <div className="mt-2 text-[13px] leading-relaxed text-theme-muted">{card.meta.description}</div>
                <div className="mt-2 text-[12px] text-theme-ink/80">核心业务问题：{card.meta.businessQuestion}</div>
              </div>
              <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">{card.steps.length} steps</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-theme-muted xl:grid-cols-4">
              <div className="rounded-xl border border-theme-border bg-theme-bg p-3">
                <div className="font-semibold text-theme-ink">常见 Step 模式</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {card.stepTypes.map(value => <span key={value} className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">{value}</span>)}
                </div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-3">
                <div className="font-semibold text-theme-ink">常见动作</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {card.actions.map(value => <span key={value} className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{value}</span>)}
                </div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-3">
                <div className="font-semibold text-theme-ink">输入主体</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {card.inputSubjects.map(value => <span key={value} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{value}</span>)}
                </div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-3">
                <div className="font-semibold text-theme-ink">输出主体</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {card.outputSubjects.map(value => <span key={value} className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{value}</span>)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4">
                <div className="text-[12px] font-semibold text-theme-ink">常见过滤属性</div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  {card.filterFields.length > 0 ? card.filterFields.map(value => (
                    <span key={value} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-700">{value}</span>
                  )) : <span className="text-theme-muted">该类决策下还没有明显过滤字段。</span>}
                </div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4">
                <div className="text-[12px] font-semibold text-theme-ink">常见排序 / 约束因子</div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  {card.factorNames.length > 0 ? card.factorNames.map(value => (
                    <span key={value} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">{value}</span>
                  )) : <span className="text-theme-muted">该类决策下暂无显式 sorter 因子。</span>}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-theme-border bg-theme-bg p-4">
              <div className="mb-3 text-[12px] font-semibold text-theme-ink">真实策略步骤示例</div>
              <div className="space-y-2">
                {card.sampleSteps.map(step => (
                  <div key={step.stepId} className="rounded-lg border border-white bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[12px] font-semibold text-theme-ink">{step.stepName}</div>
                        <div className="mt-1 text-[11px] text-theme-muted">{step.strategyName} / {step.ruleName}</div>
                      </div>
                      <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">{step.subjectFlow}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">{step.stepType}</span>
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{step.action}</span>
                      {step.hasBindings ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{step.bindingCount} upstream bindings</span> : null}
                      {step.filterCount > 0 ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{step.filterCount} filters</span> : null}
                      {step.sorterCount > 0 ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{step.sorterCount} sorters</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPatternView = () => (
    <div className="space-y-6">
      <Card className="p-5 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[16px] font-semibold text-theme-ink">Step 模式视图</h3>
            <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-theme-muted">
              这一层直接对齐 Editor 里的 step 语义骨架：FILTER 负责筛，SELECT 负责择优，TRANSFORM 负责转换承接，GATEWAY 负责分流与改道。
            </p>
          </div>
          <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">editor-aligned</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {patternCards.map(card => (
          <Card key={card.stepType} className="p-5 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[17px] font-semibold text-theme-ink">{card.meta.label}</div>
                <div className="mt-2 text-[13px] leading-relaxed text-theme-muted">{card.meta.description}</div>
                <div className="mt-2 text-[12px] text-theme-ink/80">阅读重点：{card.meta.focus}</div>
              </div>
              <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">{card.steps.length} steps</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-xl border border-theme-border bg-theme-bg p-3 text-[11px] text-theme-muted">
                <div className="font-semibold text-theme-ink">常见动作</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{card.actions.map(value => <span key={value} className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{value}</span>)}</div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-3 text-[11px] text-theme-muted">
                <div className="font-semibold text-theme-ink">主体流向</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{card.subjectFlows.slice(0, 5).map(value => <span key={value} className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{value}</span>)}</div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-3 text-[11px] text-theme-muted">
                <div className="font-semibold text-theme-ink">平均 filters</div>
                <div className="mt-2 text-[20px] font-semibold text-theme-ink">{card.averageFilters}</div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-3 text-[11px] text-theme-muted">
                <div className="font-semibold text-theme-ink">平均 sorters</div>
                <div className="mt-2 text-[20px] font-semibold text-theme-ink">{card.averageSorters}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4">
                <div className="text-[12px] font-semibold text-theme-ink">常见过滤字段 / 配置线索</div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  {card.filterFields.length > 0 ? card.filterFields.map(value => <span key={value} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-700">{value}</span>) : <span className="text-theme-muted">这类 step 主要不靠显式 filter 字段。</span>}
                </div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4">
                <div className="text-[12px] font-semibold text-theme-ink">常见排序 / 约束因子</div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  {card.factorNames.length > 0 ? card.factorNames.map(value => <span key={value} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">{value}</span>) : <span className="text-theme-muted">这类 step 暂无显式 sorter 因子。</span>}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-theme-border bg-theme-bg p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-[12px]">
                <span className="font-semibold text-theme-ink">真实步骤示例</span>
                <span className="text-theme-muted">upstream bindings 出现 {card.bindingUsage} 次</span>
              </div>
              <div className="space-y-2">
                {card.sampleSteps.map(step => (
                  <div key={step.stepId} className="rounded-lg border border-white bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[12px] font-semibold text-theme-ink">{step.stepName}</div>
                        <div className="mt-1 text-[11px] text-theme-muted">{step.strategyName} / {step.ruleName}</div>
                      </div>
                      <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">{step.action}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{step.subjectFlow}</span>
                      {step.hasBindings ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{step.bindingCount} bindings</span> : null}
                      {step.configCount > 0 ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{step.configCount} config</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderObjectView = () => (
    <div className="grid grid-cols-1 gap-6 items-start xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="sticky top-6 p-4 bg-white">
        <div className="mb-4 text-[13px] font-semibold text-theme-ink">业务对象</div>
        <div className="space-y-2">
          {filteredObjectMetas.map(objectMeta => {
            const attributeCount = attributeMetas.filter(attribute => attribute.objectCode === objectMeta.code).length;
            const factorCount = mockFactors.filter(factor => factor.targetObject === objectMeta.code).length;
            const usageCount = governanceSteps.filter(step => step.inputSubject === objectMeta.code || step.outputSubject === objectMeta.code).length;
            const isActive = objectMeta.code === activeObject?.code;

            return (
              <button
                key={objectMeta.code}
                onClick={() => setActiveObjectCode(objectMeta.code)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${isActive ? 'border-theme-primary bg-blue-50/70 shadow-sm' : 'border-theme-border bg-white hover:bg-theme-bg'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{objectMeta.icon}</span>
                      <span className="font-semibold text-[13px] text-theme-ink">{objectMeta.name}</span>
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-theme-muted">{objectMeta.code}</div>
                  </div>
                  <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">{objectMeta.category}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-theme-muted">
                  <span>{attributeCount} 属性</span>
                  <span>{factorCount} 因子</span>
                  <span>{usageCount} step 使用</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {activeObject && (
        <div className="space-y-6">
          <Card className="p-6 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeObject.icon}</span>
                  <div>
                    <h3 className="text-[20px] font-semibold text-theme-ink">{activeObject.name}</h3>
                    <div className="mt-1 text-[11px] font-mono text-theme-muted">{activeObject.code}</div>
                  </div>
                </div>
                {isEditingObject && activeObjectDraft ? (
                  <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-theme-ink">对象描述</div>
                        <textarea className="min-h-[84px] w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={activeObjectDraft.description} onChange={event => updateActiveObjectDraft({ description: event.target.value })} />
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-theme-ink">业务归口</div>
                        <Input value={activeObjectDraft.businessOwner} onChange={event => updateActiveObjectDraft({ businessOwner: event.target.value })} className="h-9 bg-theme-bg text-[12px]" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="mb-1 text-[11px] font-semibold text-theme-ink">业务分类</div>
                          <Select value={activeObjectDraft.category} onChange={event => updateActiveObjectDraft({ category: event.target.value as NonNullable<BusinessObjectMeta['category']> })} className="h-9 bg-theme-bg text-[12px]">
                            <option value="MASTER">MASTER</option>
                            <option value="TRANSACTION">TRANSACTION</option>
                            <option value="RESOURCE">RESOURCE</option>
                            <option value="RUNTIME">RUNTIME</option>
                          </Select>
                        </div>
                        <div>
                          <div className="mb-1 text-[11px] font-semibold text-theme-ink">治理阶段</div>
                          <Select value={activeObjectDraft.lifecycleStage} onChange={event => updateActiveObjectDraft({ lifecycleStage: event.target.value as NonNullable<BusinessObjectMeta['lifecycleStage']> })} className="h-9 bg-theme-bg text-[12px]">
                            <option value="PLANNED">PLANNED</option>
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="LEGACY">LEGACY</option>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-theme-ink">源系统（逗号分隔）</div>
                        <Input value={activeObjectDraft.sourceSystems} onChange={event => updateActiveObjectDraft({ sourceSystems: event.target.value })} className="h-9 bg-theme-bg text-[12px]" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-theme-ink">业务含义</div>
                        <textarea className="min-h-[84px] w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={activeObjectDraft.businessMeaning} onChange={event => updateActiveObjectDraft({ businessMeaning: event.target.value })} />
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-theme-ink">Step 角色</div>
                        <textarea className="min-h-[84px] w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={activeObjectDraft.typicalRoleInStep} onChange={event => updateActiveObjectDraft({ typicalRoleInStep: event.target.value })} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-[13px] leading-relaxed text-theme-muted">{activeObjectDraft?.description || activeObject.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">participant-view</Badge>
                <Button variant="outline" className="gap-2" onClick={() => {
                  if (isEditingObject) {
                    setEditingObjectCode(null);
                  } else {
                    setEditingObjectCode(activeObject.code);
                    setObjectEditorSection('PROFILE');
                  }
                }}>
                  <Edit3 className="w-3.5 h-3.5" /> {isEditingObject ? '完成编辑' : '编辑对象'}
                </Button>
                {isEditingObject ? (
                  <Button variant="ghost" className="gap-2" onClick={() => setObjectDrafts(prev => ({ ...prev, [activeObject.code]: createObjectDraft(activeObject) }))}>
                    <Save className="w-3.5 h-3.5" /> 重置
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink mb-2">业务分类</div>
                <div>{activeObjectDraft?.category ?? activeObject.category ?? '未定义'}</div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink mb-2">治理阶段</div>
                <div>{activeObjectDraft?.lifecycleStage ?? activeObject.lifecycleStage ?? '未定义'}</div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink mb-2">业务归口</div>
                <div>{activeObjectDraft?.businessOwner || activeObject.businessOwner || '未定义'}</div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink mb-2">源系统</div>
                <div className="flex flex-wrap gap-1.5">
                  {splitLines(activeObjectDraft?.sourceSystems ?? '').length ? splitLines(activeObjectDraft?.sourceSystems ?? '').map(system => (
                    <span key={system} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-700">{system}</span>
                  )) : activeObject.sourceSystems?.length ? activeObject.sourceSystems.map(system => (
                    <span key={system} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-700">{system}</span>
                  )) : <span>未定义</span>}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-theme-ink">治理维护台</div>
                    <div className="mt-1 text-[11px] text-theme-muted">把对象维护拆成基础信息、动作、属性、因子、链路、提示六个区，避免说明和结果重复铺开。</div>
                  </div>
                  {isEditingObject ? <Badge variant="neutral" className="border-none bg-white text-theme-muted">editing</Badge> : <Badge variant="neutral" className="border-none bg-white text-theme-muted">read-only</Badge>}
                </div>

                {isEditingObject ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 xl:grid-cols-6">
                      {[
                        { key: 'PROFILE', label: '基础信息' },
                        { key: 'ACTION', label: '动作' },
                        { key: 'ATTRIBUTE', label: '属性' },
                        { key: 'FACTOR', label: '因子' },
                        { key: 'FLOW', label: '链路' },
                        { key: 'NOTE', label: '提示' },
                      ].map(section => (
                        <button
                          key={section.key}
                          onClick={() => setObjectEditorSection(section.key as typeof objectEditorSection)}
                          className={`rounded-xl border px-3 py-2 text-[11px] ${objectEditorSection === section.key ? 'border-theme-primary bg-blue-50 text-blue-700' : 'border-theme-border bg-white text-theme-muted hover:bg-theme-bg'}`}
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>

                    {objectEditorSection === 'PROFILE' ? (
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <div className="mb-1 text-[11px] font-semibold text-theme-ink">对象描述</div>
                            <textarea className="min-h-[84px] w-full rounded-xl border border-theme-border bg-white px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={activeObjectDraft?.description ?? ''} onChange={event => updateActiveObjectDraft({ description: event.target.value })} />
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] font-semibold text-theme-ink">业务归口</div>
                            <Input value={activeObjectDraft?.businessOwner ?? ''} onChange={event => updateActiveObjectDraft({ businessOwner: event.target.value })} className="h-9 bg-white text-[12px]" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-theme-ink">业务分类</div>
                              <Select value={activeObjectDraft?.category ?? 'MASTER'} onChange={event => updateActiveObjectDraft({ category: event.target.value as NonNullable<BusinessObjectMeta['category']> })} className="h-9 bg-white text-[12px]">
                                <option value="MASTER">MASTER</option>
                                <option value="TRANSACTION">TRANSACTION</option>
                                <option value="RESOURCE">RESOURCE</option>
                                <option value="RUNTIME">RUNTIME</option>
                              </Select>
                            </div>
                            <div>
                              <div className="mb-1 text-[11px] font-semibold text-theme-ink">治理阶段</div>
                              <Select value={activeObjectDraft?.lifecycleStage ?? 'ACTIVE'} onChange={event => updateActiveObjectDraft({ lifecycleStage: event.target.value as NonNullable<BusinessObjectMeta['lifecycleStage']> })} className="h-9 bg-white text-[12px]">
                                <option value="PLANNED">PLANNED</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="LEGACY">LEGACY</option>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] font-semibold text-theme-ink">源系统</div>
                            <div className="mb-2 text-[11px] text-theme-muted">支持逐项新增和删除，避免只能在一行文本里维护。</div>
                            <div className="flex flex-wrap gap-1.5">
                              {splitLines(activeObjectDraft?.sourceSystems ?? '').map(system => (
                                <button key={system} onClick={() => removeDraftListItem('sourceSystems', system)} className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-700 hover:border-red-200 hover:text-red-600">
                                  {system} ×
                                </button>
                              ))}
                              {!splitLines(activeObjectDraft?.sourceSystems ?? '').length ? <span className="text-[10px] text-theme-muted">暂无</span> : null}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Input id="object-source-system-input" placeholder="新增源系统后回车" className="h-9 bg-white text-[12px]" onKeyDown={event => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  addDraftListItem('sourceSystems', event.currentTarget.value);
                                  event.currentTarget.value = '';
                                }
                              }} />
                              <Button variant="outline" className="shrink-0" onClick={() => {
                                const input = document.getElementById('object-source-system-input') as HTMLInputElement | null;
                                if (!input) return;
                                addDraftListItem('sourceSystems', input.value);
                                input.value = '';
                              }}>
                                新增
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="mb-1 text-[11px] font-semibold text-theme-ink">业务含义</div>
                            <textarea className="min-h-[84px] w-full rounded-xl border border-theme-border bg-white px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={activeObjectDraft?.businessMeaning ?? ''} onChange={event => updateActiveObjectDraft({ businessMeaning: event.target.value })} />
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] font-semibold text-theme-ink">Step 角色</div>
                            <textarea className="min-h-[84px] w-full rounded-xl border border-theme-border bg-white px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={activeObjectDraft?.typicalRoleInStep ?? ''} onChange={event => updateActiveObjectDraft({ typicalRoleInStep: event.target.value })} />
                          </div>
                          <div>
                            <div className="mb-1 text-[11px] font-semibold text-theme-ink">典型业务判断</div>
                            <div className="mb-2 text-[11px] text-theme-muted">支持逐条新增和删除，让判断口径维护得更像清单而不是长文本。</div>
                            <div className="space-y-2">
                              {splitLines(activeObjectDraft?.commonDecisions ?? '').map(decision => (
                                <div key={decision} className="flex items-center justify-between gap-3 rounded-xl border border-theme-border bg-white px-3 py-2 text-[11px] text-theme-ink">
                                  <span>{decision}</span>
                                  <button onClick={() => removeDraftListItem('commonDecisions', decision)} className="text-theme-muted hover:text-red-600">删除</button>
                                </div>
                              ))}
                              {!splitLines(activeObjectDraft?.commonDecisions ?? '').length ? <div className="rounded-xl border border-dashed border-theme-border bg-white px-3 py-3 text-[11px] text-theme-muted">当前还没有维护典型业务判断。</div> : null}
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Input id="object-common-decision-input" placeholder="新增一条典型业务判断" className="h-9 bg-white text-[12px]" onKeyDown={event => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  addDraftListItem('commonDecisions', event.currentTarget.value);
                                  event.currentTarget.value = '';
                                }
                              }} />
                              <Button variant="outline" className="shrink-0" onClick={() => {
                                const input = document.getElementById('object-common-decision-input') as HTMLInputElement | null;
                                if (!input) return;
                                addDraftListItem('commonDecisions', input.value);
                                input.value = '';
                              }}>
                                新增
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {objectEditorSection === 'ACTION' ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-theme-border bg-white p-4">
                          <div className="text-[12px] font-semibold text-theme-ink">动作治理定位</div>
                          <div className="mt-2 text-[11px] leading-relaxed text-theme-muted">动作表示这个对象在 step 处理后可以承接什么业务结果，因此动作治理的重点不是“怎么算”，而是“这个对象应该重点承接哪些结果”。</div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold text-theme-ink">动作建模</div>
                              <div className="mt-1 text-[11px] text-theme-muted">现有承接动作进入统一编辑模型，支持治理解释、执行含义和典型输出的结构化维护。</div>
                            </div>
                            <Button variant="outline" className="h-7 px-2 text-[10px] shrink-0" onClick={addDraftAction}>新增动作</Button>
                          </div>
                          <div className="space-y-3">
                            {activeObjectActions.map(action => {
                              const checked = primaryActions.includes(action.code);
                              const isRegistered = actionMetas.some(item => item.code === action.code);
                              const isDraftOverride = Boolean(activeObjectDraft?.draftActions.some(item => item.code === action.code));
                              const cardKey = `action:${action.code}`;
                              const expanded = Boolean(expandedEditorCards[cardKey]);
                              return (
                                <div key={action.code} className="rounded-xl border border-theme-border bg-white p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-[11px] font-semibold text-theme-ink">{action.name}</div>
                                        <span className="rounded-full border border-slate-200 bg-theme-bg px-2 py-0.5 text-[9px] text-slate-600">{action.code}</span>
                                        {isRegistered ? <span className="rounded-full border border-slate-200 bg-theme-bg px-2 py-0.5 text-[9px] text-slate-600">已登记</span> : null}
                                        {isDraftOverride ? <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[9px] text-violet-700">draft 覆盖</span> : null}
                                        {checked ? <span className="rounded-full border border-blue-100 bg-blue-100 px-2 py-0.5 text-[9px] text-blue-700">关键动作</span> : null}
                                      </div>
                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-theme-muted">
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">执行：{action.executionMeaning ? `${action.executionMeaning.slice(0, 24)}${action.executionMeaning.length > 24 ? '…' : ''}` : '未维护'}</span>
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">指引：{action.decisionGuidance ? `${action.decisionGuidance.slice(0, 24)}${action.decisionGuidance.length > 24 ? '…' : ''}` : '未维护'}</span>
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">输出 {action.typicalOutputs.length} 项</span>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <button onClick={() => toggleDraftAction(action.code)} className={`rounded-full border px-2 py-0.5 text-[10px] ${checked ? 'border-theme-primary bg-blue-50 text-blue-700' : 'border-theme-border bg-white text-theme-muted hover:bg-theme-bg'}`}>
                                        {checked ? '取消关键' : '设为关键'}
                                      </button>
                                      <button onClick={() => toggleEditorCard(cardKey)} className="rounded-full border border-theme-border bg-white px-2 py-0.5 text-[10px] text-theme-muted hover:bg-theme-bg hover:text-theme-ink">
                                        {expanded ? '收起编辑' : '展开编辑'}
                                      </button>
                                      <button onClick={() => removeDraftAction(action.code)} className="text-[11px] text-theme-muted hover:text-red-600">移除</button>
                                    </div>
                                  </div>
                                  {expanded ? (
                                    <>
                                      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                                        <div className="xl:col-span-2">
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">执行含义</div>
                                          <textarea className="min-h-[72px] w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={action.executionMeaning} onChange={event => updateDraftAction(action.code, { executionMeaning: event.target.value })} />
                                        </div>
                                        <div className="xl:col-span-2">
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">决策指引</div>
                                          <textarea className="min-h-[72px] w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={action.decisionGuidance} onChange={event => updateDraftAction(action.code, { decisionGuidance: event.target.value })} />
                                        </div>
                                        <div className="xl:col-span-2">
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">典型输出</div>
                                          <Input value={action.typicalOutputs.join(', ')} onChange={event => updateDraftAction(action.code, { typicalOutputs: splitLines(event.target.value) })} className="h-9 bg-theme-bg text-[12px]" placeholder="例如 放行, 阻断, 告警" />
                                        </div>
                                      </div>
                                      <div className="mt-3 rounded-lg border border-dashed border-theme-border bg-theme-bg px-3 py-2 text-[10px] text-theme-muted">
                                        {isDraftOverride ? '当前动作已被 draft 覆盖，页面展示的是未保存修改。' : '当前编辑先落在对象 draft 层；还没有回写到底层 action registry。'}
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                              );
                            })}
                            {!activeObjectActions.length ? <div className="rounded-xl border border-dashed border-theme-border bg-white px-3 py-3 text-[11px] text-theme-muted">当前对象还没有纳入维护的承接动作。</div> : null}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold text-theme-ink">全量动作池</div>
                              <div className="mt-1 text-[11px] text-theme-muted">在全量动作池里直接勾选关键动作；选中即表示当前对象重点承接该动作。</div>
                            </div>
                            <button onClick={() => toggleEditorCard('action-library')} className="rounded-full border border-theme-border bg-white px-2 py-0.5 text-[10px] text-theme-muted hover:bg-theme-bg hover:text-theme-ink">
                              {expandedEditorCards['action-library'] ? '收起全量' : '展开全量'}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-theme-muted">
                            <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">全量 {allActionCodes.length} 项</span>
                            <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">关键 {primaryActions.length} 项</span>
                          </div>
                          {expandedEditorCards['action-library'] ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {draftActions.map(action => {
                                const checked = primaryActions.includes(action.code);
                                return (
                                  <button key={action.code} onClick={() => toggleDraftAction(action.code)} className={`rounded-full border px-2 py-0.5 text-[10px] ${checked ? 'border-theme-primary bg-blue-50 text-blue-700' : 'border-theme-border bg-white text-theme-muted hover:bg-theme-bg'}`}>
                                    {action.name}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {objectEditorSection === 'ATTRIBUTE' ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-theme-border bg-white p-4">
                          <div className="text-[12px] font-semibold text-theme-ink">属性治理定位</div>
                          <div className="mt-2 text-[11px] leading-relaxed text-theme-muted">属性是对象身上可被筛选、排序、约束和输出的原始字段。属性治理的重点是：哪些字段值得被清晰定义，哪些字段应该进入关键判断口径。</div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold text-theme-ink">属性建模</div>
                              <div className="mt-1 text-[11px] text-theme-muted">现有属性和新增属性统一进入同一套编辑模型，至少维护 key、名称、值类型、决策角色和业务解释。</div>
                            </div>
                            <Button variant="outline" className="h-7 px-2 text-[10px] shrink-0" onClick={addDraftAttribute}>新增属性</Button>
                          </div>
                          <div className="space-y-3">
                            {draftAttributes.map(attribute => {
                              const checked = keyAttributeKeys.includes(attribute.key);
                              const isRegistered = activeObjectAttributes.some(item => item.id === attribute.id);
                              const isDraftOverride = Boolean(activeObjectDraft?.draftAttributes.some(item => item.id === attribute.id));
                              const cardKey = `attribute:${attribute.id}`;
                              const expanded = Boolean(expandedEditorCards[cardKey]);
                              return (
                                <div key={attribute.id} className="rounded-xl border border-theme-border bg-white p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-[11px] font-semibold text-theme-ink">{attribute.name || attribute.key || '未命名属性'}</div>
                                        {isRegistered ? <span className="rounded-full border border-slate-200 bg-theme-bg px-2 py-0.5 text-[9px] text-slate-600">已登记</span> : <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] text-amber-700">草稿</span>}
                                        {isDraftOverride ? <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[9px] text-violet-700">draft 覆盖</span> : null}
                                        {checked ? <span className="rounded-full border border-blue-100 bg-blue-100 px-2 py-0.5 text-[9px] text-blue-700">关键属性</span> : null}
                                      </div>
                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-theme-muted">
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">key：{attribute.key || '未维护'}</span>
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">{attribute.valueType}</span>
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">{attribute.decisionRole}</span>
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">解释：{attribute.businessMeaning ? `${attribute.businessMeaning.slice(0, 20)}${attribute.businessMeaning.length > 20 ? '…' : ''}` : '未维护'}</span>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <button onClick={() => toggleDraftCoreAttribute(attribute.key)} className={`rounded-full border px-2 py-0.5 text-[10px] ${checked ? 'border-theme-primary bg-blue-50 text-blue-700' : 'border-theme-border bg-white text-theme-muted hover:bg-theme-bg'}`}>
                                        {checked ? '取消关键' : '设为关键'}
                                      </button>
                                      <button onClick={() => toggleEditorCard(cardKey)} className="rounded-full border border-theme-border bg-white px-2 py-0.5 text-[10px] text-theme-muted hover:bg-theme-bg hover:text-theme-ink">
                                        {expanded ? '收起编辑' : '展开编辑'}
                                      </button>
                                      <button onClick={() => removeDraftAttribute(attribute.id)} className="text-[11px] text-theme-muted hover:text-red-600">删除</button>
                                    </div>
                                  </div>
                                  {expanded ? (
                                    <>
                                      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                                        <div>
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">属性 key</div>
                                          <Input value={attribute.key} onChange={event => updateDraftAttribute(attribute.id, { key: event.target.value })} className="h-9 bg-theme-bg text-[12px]" />
                                        </div>
                                        <div>
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">属性名称</div>
                                          <Input value={attribute.name} onChange={event => updateDraftAttribute(attribute.id, { name: event.target.value })} className="h-9 bg-theme-bg text-[12px]" />
                                        </div>
                                        <div>
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">值类型</div>
                                          <Select value={attribute.valueType} onChange={event => updateDraftAttribute(attribute.id, { valueType: event.target.value as BusinessAttributeMeta['valueType'] })} className="h-9 bg-theme-bg text-[12px]">
                                            <option value="string">string</option>
                                            <option value="number">number</option>
                                            <option value="boolean">boolean</option>
                                            <option value="enum">enum</option>
                                            <option value="date">date</option>
                                            <option value="datetime">datetime</option>
                                          </Select>
                                        </div>
                                        <div>
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">决策角色</div>
                                          <Select value={attribute.decisionRole} onChange={event => updateDraftAttribute(attribute.id, { decisionRole: event.target.value as NonNullable<BusinessAttributeMeta['decisionRole']> })} className="h-9 bg-theme-bg text-[12px]">
                                            <option value="IDENTITY">IDENTITY</option>
                                            <option value="FILTER">FILTER</option>
                                            <option value="RANKING">RANKING</option>
                                            <option value="CONSTRAINT">CONSTRAINT</option>
                                            <option value="OUTPUT">OUTPUT</option>
                                          </Select>
                                        </div>
                                        <div className="xl:col-span-2">
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">业务解释</div>
                                          <textarea className="min-h-[84px] w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={attribute.businessMeaning} onChange={event => updateDraftAttribute(attribute.id, { businessMeaning: event.target.value })} />
                                        </div>
                                      </div>
                                      {isRegistered ? (
                                        <div className="mt-3 rounded-lg border border-dashed border-theme-border bg-theme-bg px-3 py-2 text-[10px] text-theme-muted">
                                          {isDraftOverride ? '当前属性已被 draft 覆盖，页面展示的是未保存修改。' : '当前编辑先落在对象 draft 层；还没有回写到底层 attribute registry。'}
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              );
                            })}
                            {!draftAttributes.length ? <div className="rounded-xl border border-dashed border-theme-border bg-white px-3 py-3 text-[11px] text-theme-muted">当前还没有可维护属性。</div> : null}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold text-theme-ink">全量属性池</div>
                              <div className="mt-1 text-[11px] text-theme-muted">在全量属性池里直接标记关键属性；被选中就表示进入重点治理口径。</div>
                            </div>
                            <button onClick={() => toggleEditorCard('attribute-key-selection')} className="rounded-full border border-theme-border bg-white px-2 py-0.5 text-[10px] text-theme-muted hover:bg-theme-bg hover:text-theme-ink">
                              {expandedEditorCards['attribute-key-selection'] ? '收起全量' : '展开全量'}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-theme-muted">
                            <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">全量 {allAttributeKeys.length} 项</span>
                            <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">关键 {keyAttributeKeys.length} 项</span>
                          </div>
                          {expandedEditorCards['attribute-key-selection'] ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {draftAttributes.map(attribute => {
                                const checked = keyAttributeKeys.includes(attribute.key);
                                return (
                                  <button key={`key-${attribute.id}`} onClick={() => toggleDraftCoreAttribute(attribute.key)} className={`rounded-full border px-2 py-0.5 text-[10px] ${checked ? 'border-theme-primary bg-blue-50 text-blue-700' : 'border-theme-border bg-white text-theme-muted hover:bg-theme-bg'}`}>
                                    {attribute.name || attribute.key}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {objectEditorSection === 'FACTOR' ? (
                      <div className="space-y-4">
                        <div className="rounded-xl border border-theme-border bg-white p-4">
                          <div className="text-[12px] font-semibold text-theme-ink">因子治理定位</div>
                          <div className="mt-2 text-[11px] leading-relaxed text-theme-muted">因子不是原始字段，而是基于属性、公式或业务规则加工得到的判断信号。因子治理的重点不是简单挑字段，而是明确：哪些信号值得作为评分、约束或行为触发的核心依据。</div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                          <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[11px] text-theme-muted">
                            <div className="font-semibold text-theme-ink">推导基础</div>
                            <div className="mt-2 leading-relaxed">优先看因子依赖了哪些属性、是否有清晰公式，以及它是在做评分、约束还是行为触发。</div>
                          </div>
                          <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[11px] text-theme-muted">
                            <div className="font-semibold text-theme-ink">运行信号</div>
                            <div className="mt-2 leading-relaxed">高频出现的因子代表真实 step 更常依赖哪些判断信号，适合拿来反向校准治理重点。</div>
                          </div>
                          <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[11px] text-theme-muted">
                            <div className="font-semibold text-theme-ink">治理重点</div>
                            <div className="mt-2 leading-relaxed">关键因子应是“最值得解释”的信号集合，不一定等于全量因子，也不只是高频因子名单。</div>
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold text-theme-ink">因子建模</div>
                              <div className="mt-1 text-[11px] text-theme-muted">现有因子和新增因子统一进入同一套编辑模型，不再区分只读展示与新增草稿。</div>
                            </div>
                            <Button variant="outline" className="h-7 px-2 text-[10px] shrink-0" onClick={addDraftFactor}>新增因子</Button>
                          </div>
                          <div className="space-y-3">
                            {draftFactors.map(factor => {
                              const checked = keyFactorIds.includes(factor.id);
                              const isFrequentlyUsed = activeObjectFrequentFactors.includes(factor.name);
                              const isRegistered = activeObjectFactors.some(item => item.id === factor.id);
                              const isDraftOverride = Boolean(activeObjectDraft?.draftFactors.some(item => item.id === factor.id));
                              const cardKey = `factor:${factor.id}`;
                              const expanded = Boolean(expandedEditorCards[cardKey]);
                              return (
                                <div key={factor.id} className="rounded-xl border border-theme-border bg-white p-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <div className="text-[11px] font-semibold text-theme-ink">{factor.name || '未命名因子'}</div>
                                        {isRegistered ? <span className="rounded-full border border-slate-200 bg-theme-bg px-2 py-0.5 text-[9px] text-slate-600">已登记</span> : <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] text-amber-700">草稿</span>}
                                        {isDraftOverride ? <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-[9px] text-violet-700">draft 覆盖</span> : null}
                                        {isFrequentlyUsed ? <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-700">高频使用</span> : null}
                                        {checked ? <span className="rounded-full border border-blue-100 bg-blue-100 px-2 py-0.5 text-[9px] text-blue-700">关键治理</span> : null}
                                      </div>
                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-theme-muted">
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">{factor.impactType}</span>
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">属性 {factor.attributeRefs.length} 个</span>
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">目的：{factor.decisionPurpose ? `${factor.decisionPurpose.slice(0, 18)}${factor.decisionPurpose.length > 18 ? '…' : ''}` : '未维护'}</span>
                                        <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">解释：{factor.businessMeaning ? `${factor.businessMeaning.slice(0, 18)}${factor.businessMeaning.length > 18 ? '…' : ''}` : '未维护'}</span>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
                                      <button onClick={() => toggleDraftKeyFactor(factor.id)} className={`rounded-full border px-2 py-0.5 text-[10px] ${checked ? 'border-theme-primary bg-blue-50 text-blue-700' : 'border-theme-border bg-white text-theme-muted hover:bg-theme-bg'}`}>
                                        {checked ? '取消关键' : '设为关键'}
                                      </button>
                                      <button onClick={() => toggleEditorCard(cardKey)} className="rounded-full border border-theme-border bg-white px-2 py-0.5 text-[10px] text-theme-muted hover:bg-theme-bg hover:text-theme-ink">
                                        {expanded ? '收起编辑' : '展开编辑'}
                                      </button>
                                      <button onClick={() => removeDraftFactor(factor.id)} className="text-[11px] text-theme-muted hover:text-red-600">删除</button>
                                    </div>
                                  </div>
                                  {expanded ? (
                                    <>
                                      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
                                        <div>
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">因子名称</div>
                                          <Input value={factor.name} onChange={event => updateDraftFactor(factor.id, { name: event.target.value })} className="h-9 bg-theme-bg text-[12px]" />
                                        </div>
                                        <div>
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">影响类型</div>
                                          <Select value={factor.impactType} onChange={event => updateDraftFactor(factor.id, { impactType: event.target.value as Factor['impactType'] })} className="h-9 bg-theme-bg text-[12px]">
                                            <option value="CONSTRAINT">CONSTRAINT</option>
                                            <option value="ADJUSTMENT">ADJUSTMENT</option>
                                            <option value="BEHAVIORAL">BEHAVIORAL</option>
                                          </Select>
                                        </div>
                                        <div className="xl:col-span-2">
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">属性来源</div>
                                          <Input value={factor.attributeRefs.join(', ')} onChange={event => updateDraftFactor(factor.id, { attributeRefs: splitLines(event.target.value) })} className="h-9 bg-theme-bg text-[12px]" placeholder="例如 availableQty, shelfLifeRatio" />
                                        </div>
                                        <div className="xl:col-span-2">
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">公式 / 规则表达</div>
                                          <textarea className="min-h-[84px] w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={factor.formula} onChange={event => updateDraftFactor(factor.id, { formula: event.target.value })} />
                                        </div>
                                        <div>
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">业务目的</div>
                                          <textarea className="min-h-[72px] w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={factor.decisionPurpose} onChange={event => updateDraftFactor(factor.id, { decisionPurpose: event.target.value })} />
                                        </div>
                                        <div>
                                          <div className="mb-1 text-[10px] font-semibold text-theme-ink">业务解释</div>
                                          <textarea className="min-h-[72px] w-full rounded-xl border border-theme-border bg-theme-bg px-3 py-2 text-[12px] text-theme-ink outline-none focus:ring-2 focus:ring-theme-primary/20" value={factor.businessMeaning} onChange={event => updateDraftFactor(factor.id, { businessMeaning: event.target.value })} />
                                        </div>
                                      </div>
                                      {isRegistered ? (
                                        <div className="mt-3 rounded-lg border border-dashed border-theme-border bg-theme-bg px-3 py-2 text-[10px] text-theme-muted">
                                          {isDraftOverride ? '当前因子已被 draft 覆盖，页面展示的是未保存修改。' : '当前编辑先落在对象 draft 层，用来统一治理台交互；还没有回写到底层 registry 文件。'}
                                        </div>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              );
                            })}
                            {!draftFactors.length ? <div className="rounded-xl border border-dashed border-theme-border bg-white px-3 py-3 text-[11px] text-theme-muted">当前还没有可维护因子。</div> : null}
                          </div>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold text-theme-ink">全量因子池</div>
                              <div className="mt-1 text-[11px] text-theme-muted">在全量因子池里直接标记关键因子；选中即表示纳入重点治理信号。</div>
                            </div>
                            <button onClick={() => toggleEditorCard('factor-key-selection')} className="rounded-full border border-theme-border bg-white px-2 py-0.5 text-[10px] text-theme-muted hover:bg-theme-bg hover:text-theme-ink">
                              {expandedEditorCards['factor-key-selection'] ? '收起全量' : '展开全量'}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-theme-muted">
                            <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">全量 {allFactorIds.length} 项</span>
                            <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">关键 {keyFactorIds.length} 项</span>
                          </div>
                          {expandedEditorCards['factor-key-selection'] ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {draftFactors.map(factor => {
                                const checked = keyFactorIds.includes(factor.id);
                                return (
                                  <button key={factor.id} onClick={() => toggleDraftKeyFactor(factor.id)} className={`rounded-full border px-2 py-0.5 text-[10px] ${checked ? 'border-theme-primary bg-blue-50 text-blue-700' : 'border-theme-border bg-white text-theme-muted hover:bg-theme-bg'}`}>
                                    {factor.name}
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold text-theme-ink">运行高频信号</div>
                              <div className="mt-1 text-[11px] text-theme-muted">这些是当前真实 step 更常使用的判断信号，用来辅助校准治理重点。</div>
                            </div>
                            <button onClick={() => toggleEditorCard('factor-runtime-signals')} className="rounded-full border border-theme-border bg-white px-2 py-0.5 text-[10px] text-theme-muted hover:bg-theme-bg hover:text-theme-ink">
                              {expandedEditorCards['factor-runtime-signals'] ? '收起信号' : '展开信号'}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-theme-muted">
                            <span className="rounded-full border border-theme-border bg-theme-bg px-2 py-0.5">高频 {activeObjectFrequentFactors.length} 项</span>
                          </div>
                          {expandedEditorCards['factor-runtime-signals'] ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {activeObjectFrequentFactors.length ? activeObjectFrequentFactors.map(factorName => (
                                <span key={factorName} className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">{factorName}</span>
                              )) : <span className="text-[10px] text-theme-muted">暂无高频因子</span>}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {objectEditorSection === 'FLOW' ? (
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div>
                          <div className="mb-1 text-[11px] font-semibold text-theme-ink">常见上游对象</div>
                          <div className="mb-2 text-[11px] text-theme-muted">支持新增和删除，表示这个对象通常由哪些对象驱动、筛出或加工而来。</div>
                          <div className="flex flex-wrap gap-2">
                            {(activeObjectDraft?.upstreamObjects ?? []).map(objectCode => (
                              <button key={`up-selected-${objectCode}`} onClick={() => removeDraftObjectRelation('upstreamObjects', objectCode)} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700 hover:border-red-200 hover:text-red-600">
                                {objectCode} ×
                              </button>
                            ))}
                            {!(activeObjectDraft?.upstreamObjects ?? []).length ? <span className="text-[10px] text-theme-muted">暂无</span> : null}
                          </div>
                          <Button variant="outline" className="mt-2" onClick={() => addDraftObjectRelation('upstreamObjects')}>新增上游对象</Button>
                        </div>
                        <div>
                          <div className="mb-1 text-[11px] font-semibold text-theme-ink">常见下游对象</div>
                          <div className="mb-2 text-[11px] text-theme-muted">支持新增和删除，表示这个对象处理完成后通常还会继续流向哪些承接对象。</div>
                          <div className="flex flex-wrap gap-2">
                            {(activeObjectDraft?.downstreamObjects ?? []).map(objectCode => (
                              <button key={`down-selected-${objectCode}`} onClick={() => removeDraftObjectRelation('downstreamObjects', objectCode)} className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700 hover:border-red-200 hover:text-red-600">
                                {objectCode} ×
                              </button>
                            ))}
                            {!(activeObjectDraft?.downstreamObjects ?? []).length ? <span className="text-[10px] text-theme-muted">暂无</span> : null}
                          </div>
                          <Button variant="outline" className="mt-2" onClick={() => addDraftObjectRelation('downstreamObjects')}>新增下游对象</Button>
                        </div>
                      </div>
                    ) : null}

                    {objectEditorSection === 'NOTE' ? (
                      <div>
                        <div className="mb-1 text-[11px] font-semibold text-theme-ink">治理提示</div>
                        <div className="mb-2 text-[11px] text-theme-muted">支持逐条新增和删除，补充对象维护和使用时的治理提醒。</div>
                        <div className="space-y-2">
                          {splitLines(activeObjectDraft?.governanceNotes ?? '').map(note => (
                            <div key={note} className="flex items-center justify-between gap-3 rounded-xl border border-theme-border bg-white px-3 py-2 text-[11px] text-theme-ink">
                              <span>{note}</span>
                              <button onClick={() => removeDraftListItem('governanceNotes', note)} className="text-theme-muted hover:text-red-600">删除</button>
                            </div>
                          ))}
                          {!splitLines(activeObjectDraft?.governanceNotes ?? '').length ? <div className="rounded-xl border border-dashed border-theme-border bg-white px-3 py-3 text-[11px] text-theme-muted">当前对象还没有治理提示。</div> : null}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Input id="object-governance-note-input" placeholder="新增一条治理提示" className="h-9 bg-white text-[12px]" onKeyDown={event => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              addDraftListItem('governanceNotes', event.currentTarget.value);
                              event.currentTarget.value = '';
                            }
                          }} />
                          <Button variant="outline" className="shrink-0" onClick={() => {
                            const input = document.getElementById('object-governance-note-input') as HTMLInputElement | null;
                            if (!input) return;
                            addDraftListItem('governanceNotes', input.value);
                            input.value = '';
                          }}>
                            新增
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-white bg-white p-4">
                    <div className="mb-2 text-[12px] font-semibold text-theme-ink">维护摘要</div>
                    <div className="space-y-3 text-[11px] text-theme-muted">
                      <div>
                        <div className="font-semibold text-theme-ink">关键动作</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {primaryActions.length ? primaryActions.map(action => <span key={action} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">{action}</span>) : <span>未定义</span>}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-theme-ink">关键属性</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {keyAttributeKeys.length ? keyAttributeKeys.map(attributeKey => <span key={attributeKey} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">{attributeKey}</span>) : <span>未定义</span>}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-theme-ink">关键因子</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {keyFactors.length ? keyFactors.map(factor => <span key={factor.id} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">{factor.name}</span>) : <span>未定义</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-semibold text-theme-ink">运行反查</h4>
                  <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">只读</Badge>
                </div>
                <div className="mt-1 text-[11px] text-theme-muted">根据真实策略 step 自动生成，用来反查这个对象作为输入或输出时的实际使用情况。</div>
              </div>
              <Button variant="outline" className="gap-2" onClick={() => setRuntimeLookupExpanded(prev => !prev)}>
                {runtimeLookupExpanded ? '收起明细' : '查看明细'}
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink mb-2">输入使用摘要</div>
                <div className="text-[24px] font-semibold text-theme-ink">{objectInputUsage.length}</div>
                <div className="mt-1 text-[11px]">这个对象作为输入进入 step 的记录数。</div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink mb-2">输出使用摘要</div>
                <div className="text-[24px] font-semibold text-theme-ink">{objectOutputUsage.length}</div>
                <div className="mt-1 text-[11px]">这个对象作为输出被 step 产出或承接的记录数。</div>
              </div>
            </div>

            {runtimeLookupExpanded ? (
              <div className="mt-4 grid grid-cols-1 gap-6 xl:grid-cols-2">
                {objectUsageByRole.map(section => (
                  <div key={section.title} className="rounded-xl border border-theme-border bg-theme-bg p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <h5 className="text-[13px] font-semibold text-theme-ink">{section.title}</h5>
                        <div className="mt-1 text-[11px] text-theme-muted">{section.description}</div>
                      </div>
                      <Badge variant="neutral" className="border-none bg-white text-theme-muted">{section.records.length} uses</Badge>
                    </div>
                    <div className="space-y-2">
                      {section.records.length > 0 ? section.records.slice(0, 6).map((record, index) => (
                        <div key={`${record.role}-${record.stepName}-${index}`} className="rounded-xl border border-white bg-white px-4 py-3">
                          <div className="text-[12px] font-semibold text-theme-ink">{record.stepName}</div>
                          <div className="mt-1 text-[11px] text-theme-muted">{record.strategyName} / {record.ruleName}</div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                            <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">{record.stepType}</span>
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{record.action}</span>
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">{decisionFamilyMeta[record.decisionFamily].label}</span>
                          </div>
                        </div>
                      )) : <div className="rounded-xl border border-dashed border-theme-border bg-white px-4 py-5 text-[12px] text-theme-muted">当前还没有这类对象参与记录。</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="p-5 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-semibold text-theme-ink">一致性校验</h4>
                  <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">对比</Badge>
                </div>
                <div className="mt-1 text-[11px] text-theme-muted">对比维护配置和真实使用，帮助判断对象治理重点是否贴近运行事实。</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink mb-2">动作对比</div>
                <div className="space-y-3 text-[11px]">
                  <div>
                    <div className="font-semibold text-theme-ink">关键动作</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {primaryActions.length ? primaryActions.map(action => <span key={action} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">{action}</span>) : <span>未定义</span>}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-theme-ink">真实使用动作</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {actualUsageActions.length ? actualUsageActions.map(action => <span key={action} className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-700">{action}</span>) : <span>暂无</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink mb-2">属性对比</div>
                <div className="space-y-3 text-[11px]">
                  <div>
                    <div className="font-semibold text-theme-ink">关键属性</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {keyAttributeKeys.length ? keyAttributeKeys.map(attributeKey => <span key={attributeKey} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">{attributeKey}</span>) : <span>未定义</span>}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-theme-ink">高频过滤字段</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {activeObjectFrequentFields.length ? activeObjectFrequentFields.map(field => <span key={field} className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-700">{field}</span>) : <span>暂无</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-theme-border bg-theme-bg p-4 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink mb-2">因子与决策对比</div>
                <div className="space-y-3 text-[11px]">
                  <div>
                    <div className="font-semibold text-theme-ink">关键因子</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {keyFactorIds.length ? keyFactorIds.map(factorId => {
                        const factor = activeObjectFactors.find(item => item.id === factorId);
                        return factor ? <span key={factor.id} className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-blue-700">{factor.name}</span> : null;
                      }) : <span>未定义</span>}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-theme-ink">覆盖的业务决策</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {activeObjectDecisionFamilies.length ? activeObjectDecisionFamilies.map((family: DecisionFamily) => <span key={family} className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-amber-700">{decisionFamilyMeta[family].label}</span>) : <span>暂无</span>}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-theme-ink">高频判断因子</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {[...activeObjectFactors, ...relatedFactors].length > 0 ? [...activeObjectFactors, ...relatedFactors].slice(0, 8).map((factor: Factor) => (
                        <span key={factor.id} className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-700">{factor.name}</span>
                      )) : <span>暂无</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );

  const renderCoverageView = () => {
    const objectCoverage = percent(objectMetas.length - coverage.objectMissing.length, objectMetas.length);
    const attributeCoverage = percent(attributeMetas.length - coverage.attributeMissing.length, attributeMetas.length);
    const actionCoverage = percent(actionMetas.length - coverage.actionMissing.length, actionMetas.length);
    const usedFactors = mockFactors.filter(factor => (coverage.factorUsageCount.get(factor.id) ?? 0) > 0);
    const factorCoverage = percent(usedFactors.length - coverage.factorMissing.length, usedFactors.length);

    return (
      <div className="space-y-6">
        <Card className="p-5 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-[16px] font-semibold text-theme-ink">治理覆盖度视图</h3>
              <p className="mt-2 max-w-4xl text-[13px] leading-relaxed text-theme-muted">
                这一页不是看“有什么 metadata”，而是看“这些 metadata 是否已经足够帮助业务理解判断逻辑”。它会把解释充分和解释薄弱的位置直接暴露出来。
              </p>
            </div>
            <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">read-only diagnosis</Badge>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {[
            { label: '对象解释覆盖', value: objectCoverage, total: objectMetas.length, missing: coverage.objectMissing.length },
            { label: '属性解释覆盖', value: attributeCoverage, total: attributeMetas.length, missing: coverage.attributeMissing.length },
            { label: '动作解释覆盖', value: actionCoverage, total: actionMetas.length, missing: coverage.actionMissing.length },
            { label: '高频因子解释覆盖', value: factorCoverage, total: usedFactors.length, missing: coverage.factorMissing.length },
          ].map(card => (
            <Card key={card.label} className="p-4 bg-white">
              <div className="text-[11px] uppercase tracking-wider text-theme-muted">{card.label}</div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="text-[28px] font-semibold text-theme-ink">{card.value}%</div>
                <div className="text-right text-[11px] text-theme-muted">
                  <div>{card.total} 总量</div>
                  <div>{card.missing} 待补</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="p-5 bg-white">
            <h4 className="text-[14px] font-semibold text-theme-ink">对象层薄弱点</h4>
            <div className="mt-4 space-y-2">
              {coverage.objectMissing.map(objectMeta => (
                <div key={objectMeta.code} className="rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-[12px] text-theme-muted">
                  <div className="font-semibold text-theme-ink">{objectMeta.name}</div>
                  <div className="mt-1 font-mono text-[10px]">{objectMeta.code}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    {!objectMeta.businessMeaning ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 businessMeaning</span> : null}
                    {!objectMeta.typicalRoleInStep ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 typicalRoleInStep</span> : null}
                    {!objectMeta.commonDecisions?.length ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 commonDecisions</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 bg-white">
            <h4 className="text-[14px] font-semibold text-theme-ink">属性层薄弱点</h4>
            <div className="mt-4 space-y-2">
              {coverage.attributeMissing.slice(0, 12).map(attribute => (
                <div key={attribute.id} className="rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-[12px] text-theme-muted">
                  <div className="font-semibold text-theme-ink">{attribute.name}</div>
                  <div className="mt-1 font-mono text-[10px]">{attribute.id}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    {!attribute.decisionRole ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 decisionRole</span> : null}
                    {!attribute.businessMeaning ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 businessMeaning</span> : null}
                    {!attribute.exampleValues?.length ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 exampleValues</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 bg-white">
            <h4 className="text-[14px] font-semibold text-theme-ink">动作层薄弱点</h4>
            <div className="mt-4 space-y-2">
              {coverage.actionMissing.map(action => (
                <div key={action.code} className="rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-[12px] text-theme-muted">
                  <div className="font-semibold text-theme-ink">{action.name}</div>
                  <div className="mt-1 font-mono text-[10px]">{action.code}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    {!action.executionMeaning ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 executionMeaning</span> : null}
                    {!action.decisionGuidance ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 decisionGuidance</span> : null}
                    {!action.typicalOutputs?.length ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 typicalOutputs</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 bg-white">
            <h4 className="text-[14px] font-semibold text-theme-ink">高频因子薄弱点</h4>
            <div className="mt-4 space-y-2">
              {coverage.factorMissing.map(factor => (
                <div key={factor.id} className="rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-[12px] text-theme-muted">
                  <div className="font-semibold text-theme-ink">{factor.name}</div>
                  <div className="mt-1 font-mono text-[10px]">{factor.id}</div>
                  <div className="mt-2 text-[11px]">真实 step 使用 {coverage.factorUsageCount.get(factor.id) ?? 0} 次</div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    {!factor.businessMeaning ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 businessMeaning</span> : null}
                    {!factor.decisionPurpose ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 decisionPurpose</span> : null}
                    {!factor.interpretationHint ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-700">缺 interpretationHint</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="p-5 bg-white">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="text-[14px] font-semibold text-theme-ink">自由文本 / 配置型步骤提示</h4>
            <Badge variant="neutral" className="border-none bg-theme-bg text-theme-muted">{coverage.freeTextHeavySteps.length} steps</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {coverage.freeTextHeavySteps.map(step => (
              <div key={step.stepId} className="rounded-xl border border-theme-border bg-theme-bg px-4 py-3 text-[12px] text-theme-muted">
                <div className="font-semibold text-theme-ink">{step.stepName}</div>
                <div className="mt-1 text-[11px]">{step.strategyName} / {step.ruleName}</div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">{step.stepType}</span>
                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{step.action}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{step.configCount} config keys</span>
                </div>
                <div className="mt-2 text-[11px]">这类 step 主要靠 config 驱动，但筛选字段和排序因子都较弱，后续适合补强业务解释。</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex-1 w-full overflow-y-auto bg-theme-bg px-4 py-4 font-sans text-theme-ink sm:px-6 sm:py-6 lg:px-8 lg:py-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1360px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="mb-2 text-2xl font-semibold">元数据治理中心</h1>
            <p className="max-w-4xl text-[13px] leading-relaxed text-theme-muted">
              语义底座层工作台。这里治理对象、属性、动作、因子与覆盖分析，并尽量从真实规则结构推导业务决策和 Step 模式，而不是维护与运行事实平行的第二套真相。
            </p>
          </div>
          <button
            onClick={onOpenHelp}
            className="inline-flex min-h-9 items-center justify-center gap-2 self-start rounded-lg border border-blue-100 bg-blue-50 px-3 text-[12px] font-bold text-blue-600 transition-colors hover:bg-blue-100 shrink-0"
          >
            <BookOpen className="h-3.5 w-3.5" /> 语义底座说明
          </button>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="p-4 bg-white">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-theme-muted"><Icon className="h-4 w-4" />{card.label}</div>
                <div className="mt-2 text-[24px] font-bold text-theme-ink">{card.value}</div>
              </Card>
            );
          })}
        </div>

        <Card className="p-4 bg-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {governanceViews.map(view => (
                <button
                  key={view.key}
                  onClick={() => setActiveView(view.key)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${activeView === view.key ? 'border-theme-primary bg-blue-50 text-blue-700' : 'border-theme-border bg-theme-bg text-theme-muted hover:bg-white'}`}
                >
                  <div className="text-[13px] font-semibold">{view.label}</div>
                  <div className="mt-1 text-[11px] leading-relaxed">{view.description}</div>
                </button>
              ))}
            </div>
            <div className="relative w-full xl:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-theme-muted" />
              <Input
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="搜索业务问题 / 对象 / 属性 / 因子..."
                className="h-9 border-theme-border bg-theme-bg pl-9 text-[12px]"
              />
            </div>
          </div>
        </Card>

        {activeView === 'DECISIONS' && renderDecisionView()}
        {activeView === 'PATTERNS' && renderPatternView()}
        {activeView === 'OBJECTS' && renderObjectView()}
        {activeView === 'COVERAGE' && renderCoverageView()}
      </div>
    </div>
  );
}

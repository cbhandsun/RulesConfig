# WMS 策略编排中心 (RulesConfig) 项目理解文档

## 1. 项目定位
本项目是一个面向工业级仓储管理系统 (WMS) 的 **高级策略配置与编排平台**。它旨在通过可视化的方式，让业务专家能够灵活配置复杂的逻辑规则，而无需直接编写代码。

## 2. 核心业务领域
项目涵盖了 WMS 的核心作业环节：
- **收货 (RECEIVING)**: 入库策略配置。
- **上架 (PUTAWAY)**: 寻找最优库位。
- **分配 (ALLOCATION)**: 订单寻址逻辑（库存/库位）。
- **波次 (WAVE)**: 订单聚类与释放策略。
- **补货 (REPLENISHMENT)**: 库内任务协同与动线优化。

## 3. 核心技术栈
- **前端框架**: React 19 + Vite (现代、高效的渲染与构建)。
- **语言**: TypeScript (强类型保证业务逻辑准确性)。
- **样式**: Tailwind CSS (原子化 CSS，快速构建 UI)。
- **动画**: Framer Motion (用于平滑的交互体验)。
- **图表**: Recharts (用于策略平衡度的雷达图可视化)。
- **图标**: Lucide-React (一致性的图标语言)。
- **AI 能力**: 集成 Google Gemini API，提供智能策略分析。

## 4. 关键架构概念
### 4.1 策略管道 (Strategy Pipeline)
支持多种流转模式：
- **Waterfall (瀑布降级)**: 逐级尝试，失败则降级。
- **Pipeline (维度累加)**: 逻辑增强，多维评分叠加。
- **Jump (条件跳转)**: 满足特定条件直接跳转到目标规则。

### 4.2 算子逻辑 (Step Execution)
每个规则内部由多个 **算子 (Step)** 组成：
- **过滤 (Filters)**: 排除不符合条件的候选对象。
- **排序 (Sorters)**: 基于 **因子 (Factor)** 的权重进行打分排序。
- **流控 (Flow Control)**: 决定满足条件后是继续流转还是终止。

### 4.3 全局红线 (Global Guardrails)
独立于具体策略的高优先级约束，用于处理跨场景的强制合规要求（如：冷链分区、过期拦截）。

### 4.4 影子模式 (Shadow Mode)
在正式发布前，通过历史数据回演和蒙特卡洛模拟，验证新策略的有效性和稳定性。

## 5. 项目结构指南
- [wms.ts](file:///d:/DEV/WorkSapce/Playgroud/RulesConfig/src/types/wms.ts): 定义了整个系统的领域模型。
- [Editor.tsx](file:///d:/DEV/WorkSapce/Playgroud/RulesConfig/src/pages/Editor.tsx): 核心策略编辑器实现，包含复杂的交互逻辑。
- [mock.ts](file:///d:/DEV/WorkSapce/Playgroud/RulesConfig/src/data/mock.ts): 包含了丰富的业务案例，如“AI 智能波次”、“任务协同”等。
- [ui/](file:///d:/DEV/WorkSapce/Playgroud/RulesConfig/src/components/ui/): 封装了符合工业审美的组件库。

## 6. 延伸阅读

> **注意**：本文档是项目的快速概览。完整的技术规范、类型定义、扩展指南及模拟引擎实现细节，请参阅权威参考文档：
> **[docs/developer-guide.md](./docs/developer-guide.md)**

---
*此文档由 AI 辅助生成，用于帮助开发者快速理解项目结构与业务逻辑。*

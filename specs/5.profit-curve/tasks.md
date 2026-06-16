# profit-curve — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始任务 |

## 项目信息

- 项目名: trade-pilot
- 架构类型: pnpm monorepo (Turborepo)
- specs 路径: specs/5.profit-curve/

## 任务列表

### 功能 1: 数据库 Schema

- [ ] T-001: 在 `packages/db/src/schema/profit-curve.ts` 定义 `capital_snapshots` 和 `ai_alerts` 表，执行 `pnpm db:push` ~15min

### 功能 2: 资金快照采集

- [ ] T-002: 实现 `packages/api/src/services/capital-tracker.ts`：调用 Binance `/api/v3/account` 获取 USDT 余额，upsert 写入 `capital_snapshots` ~30min

### 功能 3: 指标计算

- [ ] T-003: 实现 `packages/api/src/services/capital-metrics.ts`：最大回撤计算（`calcMaxDrawdown`）、连续盈亏统计（`calcConsecutiveStreak`）、总 PnL 汇总 ~30min

### 功能 4: 触发检测与 AI 提醒生成

- [ ] T-004: 实现 `packages/api/src/services/alert-trigger.ts`：连续盈亏触发检测（含 24h 去重）、AI prompt 构建 + LLM 调用 + 写入 `ai_alerts` ~30min
- [ ] T-005: 实现周度风险提示逻辑（最大回撤 > 20% 时生成 weekly_risk alert） ~15min

### 功能 5: 定时任务

- [ ] T-006: 实现 `apps/server/src/jobs/profit-tracker.ts`：每日快照采集 cron（00:05 UTC）+ 每周风险检查 cron（周一 00:10 UTC）；在 order-sync job 中调用 `checkAndTriggerAlerts()` ~30min

### 功能 6: tRPC 路由

- [ ] T-007: 实现 `packages/api/src/routers/profit-curve.ts`（getSnapshots / getMetrics / getAlerts / markAlertRead），注册到 `appRouter` ~30min

### 功能 7: 前端资金曲线页

- [ ] T-008: 安装 `recharts`（`pnpm add recharts -F web`），实现资金曲线折线图组件，支持 7d/30d/90d/all 范围切换 ~30min
- [ ] T-009: 实现关键指标卡片区（最大回撤、连续盈亏次数、总盈亏），接入 `profitCurve.getMetrics` tRPC query ~20min
- [ ] T-010: 实现 AI 提醒展示（未读 banner + 历史列表 + 标记已读），接入 `profitCurve.getAlerts` ~20min

### 集成与测试

- [ ] T-011: 端到端验证：资金快照采集 → 曲线图展示 → 模拟连续亏损触发 AI alert → 前端 banner 出现 → 标记已读后消失；验证去重逻辑（24h 内不重复触发） ~30min

## 依赖关系

- T-001 为基础，所有后续任务依赖
- T-002 依赖 T-001；依赖 Feature 3 的加密工具（decrypt API Key）
- T-003 依赖 T-001；依赖 Feature 4 的 `trade_orders` schema（连续盈亏）
- T-004、T-005 依赖 T-001、T-003；依赖 `packages/llm`（Feature 1 T-001）
- T-006 依赖 T-002、T-004、T-005；依赖 Feature 4 的 order-sync job（调用 checkAndTriggerAlerts）
- T-007 依赖 T-001、T-003
- T-008–T-010 依赖 T-007
- T-011 依赖所有前置任务

## 风险点

- Binance `/api/v3/account` 每分钟调用频率有限制（Weight: 20），每日采集一次完全在限额内，但需避免重试风暴。
- 首次用户注册时无历史快照，资金曲线为空；前端需展示"开始使用后，您的资金曲线将逐步呈现"引导文案。
- recharts 默认 bundle 体积约 ~300KB，可按需懒加载（`React.lazy` + `Suspense`）降低首屏影响。

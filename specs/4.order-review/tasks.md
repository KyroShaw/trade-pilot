# order-review — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始任务 |

## 项目信息

- 项目名: trade-pilot
- 架构类型: pnpm monorepo (Turborepo)
- specs 路径: specs/4.order-review/

## 任务列表

### 功能 1: 数据库 Schema

- [ ] T-001: 在 `packages/db/src/schema/reviews.ts` 定义 `trade_reviews` 表，执行 `pnpm db:push` ~15min

### 功能 2: Binance 订单同步

- [ ] T-002: 实现 `packages/api/src/services/binance-sync.ts`：历史成交拉取（`/api/v3/myTrades`）、增量同步记录（存 lastSyncedTradeId）、upsert 写入 `trade_orders` ~1h
- [ ] T-003: 实现买卖配对 + PnL 计算（`matchAndCalculatePnl()`）：按 symbol 分组，时序 FIFO 配对，更新 `trade_orders.pnl` / `closedAt` ~30min

### 功能 3: AI 复盘生成

- [ ] T-004: 实现 `packages/api/src/services/trade-review.ts`：基础复盘 prompt 构建 + LLM 调用 + 写入 `trade_reviews.basicReview` ~30min
- [ ] T-005: 实现对照诊断 prompt（含用户理由）+ 写入 `trade_reviews.diagnosisReview` ~20min

### 功能 4: 定时同步任务

- [ ] T-006: 实现 `apps/server/src/jobs/order-sync.ts`：每 15 分钟同步所有有绑定 Key 的用户订单，同步后对新平仓订单触发异步基础复盘；注册到 node-cron ~30min

### 功能 5: tRPC 路由

- [ ] T-007: 实现 `packages/api/src/routers/orders.ts`（getOrders / getOrderDetail / updateTradeNote / syncNow / regenerateDiagnosis），注册到 `appRouter` ~30min

### 功能 6: 前端订单页

- [ ] T-008: 创建 `apps/web/src/routes/_auth/orders.tsx`：订单列表（交易对筛选 + 盈亏 tabs + 分页 + 立即同步按钮 + AI 复盘 badge） ~30min
- [ ] T-009: 创建 `apps/web/src/routes/_auth/orders.$orderId.tsx`：基础数据 + AI 复盘展示 + 用户逻辑输入表单 + 对照诊断展示 ~30min

### 集成与测试

- [ ] T-010: 端到端验证：API Key 已绑定 → 触发同步 → 订单出现在列表 → 填写理由 → AI 对照诊断生成；验证数据隔离（不同用户看不到彼此订单） ~30min

## 依赖关系

- T-001 依赖 Feature 3 的 `trading.ts` schema（`trade_orders` 表已存在）
- T-002、T-003 依赖 T-001、Feature 3（binance-trade.ts 的加解密工具）
- T-004、T-005 依赖 T-001；依赖 `packages/llm`（Feature 1 T-001）
- T-006 依赖 T-002、T-003、T-004
- T-007 依赖 T-001、T-004、T-005
- T-008、T-009 依赖 T-007
- T-010 依赖所有前置任务

## 风险点

- Binance `/api/v3/myTrades` 必须指定 symbol，无法全量获取——需维护用户曾交易过的 symbol 列表，或遍历 `alpha_projects` 中的交易对。MVP 仅同步 `alpha_projects` 中的交易对，其他交易对不在范围内。
- PnL 计算精度：涉及手续费（commission asset 可能是 BNB），MVP 简化为不扣手续费计算净盈亏，在 UI 中标注"不含手续费"。
- AI 复盘生成耗时：对历史大量订单初次生成时可能需几分钟，需后台异步处理，前端轮询状态。

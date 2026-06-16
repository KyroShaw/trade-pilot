# alpha-dca-strategy — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始任务 |

## 项目信息

- 项目名: trade-pilot
- 架构类型: pnpm monorepo (Turborepo)
- specs 路径: specs/2.alpha-dca-strategy/

## 任务列表

### 功能 1: 数据库 Schema

- [x] T-001: 在 `packages/db/src/schema/alpha.ts` 定义 `alpha_projects`、`alpha_kline_cache`、`alpha_signals` 三张表，执行 `pnpm db:push`；添加初始 Alpha 项目种子数据（≥5 个常见 Binance Alpha 项目） ~30min

### 功能 2: Binance 行情采集

- [x] T-002: 实现 `packages/api/src/services/binance-market.ts`：封装 K 线采集（`/api/v3/klines`）和价格查询（`/api/v3/ticker/price`），含错误处理和重试逻辑 ~30min
- [x] T-003: 实现 K 线数据写入 `alpha_kline_cache`（upsert），对所有活跃项目批量采集 ~20min

### 功能 3: 盘整策略算法

- [x] T-004: 实现 `packages/api/src/services/consolidation-strategy.ts`：ATR 计算、价格百分位计算、盘整天数统计、策略入选判断 ~1h

### 功能 4: 定时扫描任务

- [x] T-005: 实现 `apps/server/src/jobs/alpha-scan.ts`：采集 → 策略判断 → LLM 生成 aiReason → 写入 `alpha_signals`（更新 isActive），注册到 node-cron（每 6 小时），启动时执行一次 ~30min

### 功能 5: tRPC 路由

- [x] T-006: 实现 `packages/api/src/routers/alpha.ts`，提供 `getSignals`、`listProjects`、`addProject`、`removeProject`，注册到 `appRouter` ~30min

### 功能 6: 前端 Alpha 定投页

- [x] T-007: 创建 `apps/web/src/routes/alpha-dca.tsx`，添加导航入口 ~15min
- [x] T-008: 实现 `AlphaSignalCard` 组件（项目信息 + 量化指标 badges + AI 理由折叠 + 风险提示） ~30min
- [x] T-009: 接入 tRPC query，处理 loading / error / 空状态；展示上次扫描时间 ~15min

### 集成与测试

- [x] T-010: 端到端验证：Binance API 采集 → 盘整算法 → 信号入库 → 前端展示全链路；验证空候选状态 ~30min

## 依赖关系

- T-002、T-003 依赖 T-001（DB schema）
- T-004 依赖 T-001
- T-005 依赖 T-002、T-003、T-004；依赖 `packages/llm`（Feature 1 T-001）
- T-006 依赖 T-001
- T-007–T-009 依赖 T-006
- T-010 依赖所有前置任务

## 风险点

- Binance API 对同一 IP 有频率限制：批量采集多个项目时需串行或加间隔（100ms），不可并发。
- 盘整算法参数（14天、60%回撤等）为初始假设值，需在 MVP 验证后根据实际信号质量调整。
- 种子数据中的 Binance Alpha 项目列表需人工确认交易对存在于 Binance，否则 K 线采集会 404。

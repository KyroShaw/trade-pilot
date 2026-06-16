# market-research — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始任务 |

## 项目信息

- 项目名: trade-pilot
- 架构类型: pnpm monorepo (Turborepo)
- specs 路径: specs/1.market-research/

## 任务列表

### 功能 1: LLM 抽象包

- [ ] T-001: 创建 `packages/llm`，实现 `callLLM(config, prompt)` 统一接口，支持 OpenAI（gpt-4o）和 Anthropic（claude-sonnet-4-6） ~30min

### 功能 2: 数据库 Schema

- [ ] T-002: 在 `packages/db/src/schema/market-research.ts` 定义 `sector_cache` 和 `news_cache` 表，执行 `pnpm db:push` ~15min

### 功能 3: 后端数据采集

- [ ] T-003: 实现 CoinGecko API 客户端（`packages/api/src/services/coingecko.ts`），封装板块列表、板块代币、新闻三个端点 ~30min
- [ ] T-004: 实现板块数据刷新任务（拉取 → AI 研判 → 写 DB），使用 node-cron 每 5 分钟调度 ~30min
- [ ] T-005: 实现新闻刷新任务（拉取 → AI 解读 → 写 DB），每 15 分钟调度；AI 解读逐条异步生成 ~30min
- [ ] T-006: 在 `apps/server/src/index.ts` 注册两个定时任务；首次启动时立即执行一次 ~15min

### 功能 4: tRPC 路由

- [ ] T-007: 实现 `marketResearch` tRPC router（getSectors / getNews / getLastUpdated），在 `appRouter` 中注册 ~30min

### 功能 5: 前端行情页

- [ ] T-008: 创建 `apps/web/src/routes/market-research.tsx` 路由，添加导航入口 ~15min
- [ ] T-009: 实现 `SectorCard` + `SectorInsight` 组件（板块列表 + AI 研判面板） ~30min
- [ ] T-010: 实现 `NewsFeed` + `NewsItem` 组件（新闻流 + AI 解读） ~30min
- [ ] T-011: 接入 tRPC query，处理 loading / error / 空数据状态；展示上次更新时间 ~15min

### 集成与测试

- [ ] T-012: 端到端验证：CoinGecko → DB 缓存 → tRPC → 前端展示全链路；验证 LLM 未配置时降级展示 ~30min

## 依赖关系

- T-003 依赖 T-001（callLLM）、T-002（DB schema）
- T-004、T-005 依赖 T-003
- T-006 依赖 T-004、T-005
- T-007 依赖 T-002
- T-008–T-011 依赖 T-007
- T-012 依赖所有前置任务

## 风险点

- CoinGecko 免费 tier 限速（约 30 req/min）：定时任务间隔已覆盖，但首次启动多任务同时触发需错开延迟。
- LLM 响应延迟：AI 解读设置超时（10s），超时则跳过、保留 null，不阻塞数据展示。

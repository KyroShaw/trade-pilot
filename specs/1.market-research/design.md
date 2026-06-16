# market-research — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo (Turborepo)
- 涉及层: 数据库（缓存表）/ 后端 API（tRPC + 定时任务）/ 前端（行情页面）/ 新增包（`packages/llm`）

## 新增包：packages/llm

提供统一的 LLM 客户端，从 DB 读取用户配置的 provider（openai/anthropic）和 API Key，屏蔽底层差异。

```typescript
// packages/llm/src/index.ts
export type LLMProvider = "openai" | "anthropic";

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string; // 默认: gpt-4o / claude-sonnet-4-6
}

export async function callLLM(config: LLMConfig, prompt: string): Promise<string>
```

依赖：`openai` npm 包（OpenAI SDK）+ `@anthropic-ai/sdk`（Anthropic SDK）。

## 功能模块设计

### 模块 1: 数据采集与缓存

**后端定时任务**（`apps/server/src/jobs/market-research.ts`）：
- 使用 `node-cron` 调度：板块数据每 5 分钟，新闻每 15 分钟。
- 调用 CoinGecko Public API → 写入 DB 缓存表。
- AI 解读在缓存刷新时异步生成（如用户已配置 LLM）。

**CoinGecko API 端点：**
- 板块列表：`GET /api/v3/coins/categories` （返回所有分类，按 market_cap_change_24h 排序）
- 板块龙头：`GET /api/v3/coins/markets?category={id}&order=volume_desc&per_page=5`
- 新闻：`GET /api/v3/news` （返回最新加密新闻）

### 模块 2: 数据库 Schema

新增两张缓存表（`packages/db/src/schema/market-research.ts`）：

```typescript
// sector_cache — 板块热度缓存
export const sectorCache = pgTable("sector_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: text("category_id").notNull(),
  name: text("name").notNull(),
  marketCapChange24h: numeric("market_cap_change_24h"),
  topTokens: jsonb("top_tokens").notNull(), // [{symbol, name, priceChange24h, volume}]
  aiSummary: text("ai_summary"),            // AI 研判摘要（可为 null）
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull(),
});

// news_cache — 新闻缓存
export const newsCache = pgTable("news_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  externalId: text("external_id").unique().notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  source: text("source"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  aiInterpretation: text("ai_interpretation"), // AI 一句话解读
  cachedAt: timestamp("cached_at", { withTimezone: true }).notNull(),
});
```

### 模块 3: tRPC 路由

新增文件 `packages/api/src/routers/market-research.ts`：

```typescript
marketResearch.getSectors()    // 返回 Top 10 板块 + 各板块 Top 5 代币
marketResearch.getNews()       // 返回近 24h Top 20 新闻（含 AI 解读）
marketResearch.getLastUpdated() // 返回各数据源上次刷新时间
```

### 模块 4: 前端行情研判页

路由：`apps/web/src/routes/market-research.tsx`

**布局：**
- 顶部：上次更新时间 + 手动刷新按钮（触发后端 on-demand 刷新）
- 左侧/上方：板块轮动卡片列表（Top 10），每张卡片展示板块名、热度变化、龙头代币 chips
- 右侧/下方：AI 板块研判摘要（Top 3 板块）
- 底部：宏观要闻流（新闻列表），每条附带 AI 解读 badge

**组件：**
- `SectorCard` — 单个板块卡片
- `SectorInsight` — AI 板块研判面板
- `NewsFeed` — 新闻流列表
- `NewsItem` — 单条新闻（标题 + 来源 + AI 解读）

## 接口契约

```typescript
// tRPC output types
type Sector = {
  categoryId: string;
  name: string;
  marketCapChange24h: number;
  topTokens: Array<{ symbol: string; name: string; priceChange24h: number }>;
  aiSummary: string | null;
};

type NewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  aiInterpretation: string | null;
};
```

## 安全考虑

- CoinGecko API Key（如有）存于服务端 `packages/env`，不泄露客户端。
- LLM API Key 从 DB 读取（见 user_settings，在通用设置 feature 中实现），服务端调用，不暴露给前端。
- 新闻 URL 在前端渲染时加 `rel="noopener noreferrer"`。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| AI 解读时机 | 后端缓存刷新时预生成 | 避免用户请求链路等待 LLM，牺牲实时性换取响应速度 |
| LLM 抽象 | 新建 packages/llm | 多个 feature 需要 LLM，统一封装避免重复 |
| 新闻来源 | CoinGecko /news | 已选定 CoinGecko 作为数据源，保持一致，减少外部依赖 |
| 调度方案 | node-cron（内嵌服务端） | 无需额外基础设施，MVP 复杂度最低 |

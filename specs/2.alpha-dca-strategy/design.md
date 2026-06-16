# alpha-dca-strategy — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo (Turborepo)
- 涉及层: 数据库（alpha_projects / alpha_signals 表）/ 后端（采集 + 策略算法 + 定时任务）/ 前端（信号列表页）

## 功能模块设计

### 模块 1: 数据库 Schema

新增文件 `packages/db/src/schema/alpha.ts`：

```typescript
// alpha_projects — Alpha 项目注册表
export const alphaProjects = pgTable("alpha_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  symbol: text("symbol").notNull().unique(),   // e.g. "ALPHABTC"
  name: text("name").notNull(),                // e.g. "Alpha Token"
  binancePair: text("binance_pair").notNull(), // e.g. "ALPHAUSDT"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// alpha_kline_cache — K 线数据缓存（日线）
export const alphaKlineCache = pgTable("alpha_kline_cache", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => alphaProjects.id),
  date: date("date").notNull(),
  open: numeric("open").notNull(),
  high: numeric("high").notNull(),
  low: numeric("low").notNull(),
  close: numeric("close").notNull(),
  volume: numeric("volume").notNull(),
}, (t) => ({ uniq: unique().on(t.projectId, t.date) }));

// alpha_signals — 每次筛选结果
export const alphaSignals = pgTable("alpha_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => alphaProjects.id),
  consolidationDays: integer("consolidation_days").notNull(),
  drawdownFromAth: numeric("drawdown_from_ath").notNull(), // 0.0–1.0
  pricePercentile: numeric("price_percentile").notNull(),  // 0.0–1.0，近90天百分位
  atrRatio: numeric("atr_ratio").notNull(),                // 近14天ATR / 20日ATR均值
  aiReason: text("ai_reason"),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").notNull().default(true),  // false = 已失效（价格脱离盘整区间）
});
```

### 模块 2: Binance 行情采集服务

文件：`packages/api/src/services/binance-market.ts`

- **K 线采集**：`GET https://api.binance.com/api/v3/klines?symbol={pair}&interval=1d&limit=90`
  - 返回日线 OHLCV，写入 `alpha_kline_cache`（upsert by projectId + date）
- **当前价格**：`GET https://api.binance.com/api/v3/ticker/price?symbol={pair}`
- 无需 API Key（公共端点）

### 模块 3: 盘整策略算法

文件：`packages/api/src/services/consolidation-strategy.ts`

```typescript
// 输入：某项目近90天日线数据
// 输出：{ qualified: boolean, consolidationDays, drawdownFromAth, pricePercentile, atrRatio }

function detectConsolidation(klines: Kline[]): StrategyResult {
  const ath = Math.max(...klines.map(k => k.high));
  const currentPrice = klines[klines.length - 1].close;
  const drawdown = (ath - currentPrice) / ath;

  // 价格百分位（近90天收盘价）
  const closes = klines.map(k => k.close).sort((a, b) => a - b);
  const percentile = closes.indexOf(currentPrice) / closes.length;

  // ATR（Average True Range）计算
  const atr14 = calcATR(klines.slice(-14));
  const atr20Avg = calcATRAvg(klines.slice(-34), 20); // 20日ATR均值
  const atrRatio = atr14 / atr20Avg;

  // 盘整天数：价格在当前价 ±15% 区间内连续的天数（从最近往前数）
  const consolidationDays = countConsolidationDays(klines, currentPrice, 0.15);

  const qualified =
    consolidationDays >= 14 &&
    atrRatio < 1.0 &&
    drawdown >= 0.6 &&
    percentile < 0.3;

  return { qualified, consolidationDays, drawdownFromAth: drawdown, pricePercentile: percentile, atrRatio };
}
```

### 模块 4: 定时采集与信号生成任务

文件：`apps/server/src/jobs/alpha-scan.ts`，每 6 小时执行：

1. 拉取所有活跃 `alpha_projects`
2. 对每个项目调用 Binance API 采集 K 线（写入 `alpha_kline_cache`）
3. 对每个项目运行 `detectConsolidation()`
4. 通过的项目：调用 LLM 生成 `aiReason`，写入 `alpha_signals`（旧信号设 isActive=false）
5. 未通过的项目：将其旧信号设 isActive=false

### 模块 5: tRPC 路由

`packages/api/src/routers/alpha.ts`：

```typescript
alpha.getSignals()          // 返回当前 isActive=true 的所有信号（含项目信息）
alpha.getSignalHistory()    // 返回历史信号（分页）
alpha.listProjects()        // 管理：列出所有 Alpha 项目
alpha.addProject(input)     // 管理：新增项目
alpha.removeProject(id)     // 管理：停用项目
```

### 模块 6: 前端 Alpha 定投页

路由：`apps/web/src/routes/alpha-dca.tsx`

**布局：**
- 顶部：上次扫描时间 + 免责声明 banner
- 主体：信号卡片列表（`AlphaSignalCard`）
  - 项目名 + 交易对
  - 关键指标：盘整天数 badge、回撤幅度 badge、价格百分位
  - AI 入选理由（折叠展开）
  - 免责声明 tooltip
- 空状态：当前无候选标的时的说明文案

## 接口契约

```typescript
type AlphaSignal = {
  id: string;
  project: { symbol: string; name: string; binancePair: string };
  consolidationDays: number;
  drawdownFromAth: number;     // 0.0–1.0
  pricePercentile: number;     // 0.0–1.0
  atrRatio: number;
  aiReason: string | null;
  generatedAt: string;
};
```

## 安全考虑

- Binance 市场数据 API 为公共端点，无需用户 API Key，零风险。
- AI 生成的入选理由始终伴随固定风险免责声明，不可被 AI 内容覆盖。
- 管理员操作（addProject / removeProject）需要 `protectedProcedure`，仅认证用户可执行。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| K 线采集周期 | 日线（1d） | 盘整判断是中期策略，不需要分钟级数据；减少存储量 |
| 扫描频率 | 每 6 小时 | 日线策略对实时性要求低，6h 兼顾时效与 API 调用量 |
| ATH 定义 | 90 天内最高价 | 全周期 ATH 需爬取历史全量，复杂度过高；90天已能覆盖近期拉盘周期 |
| 盘整判断 | 规则算法 + AI 辅助 | 规则算法保证可解释性和一致性；AI 仅生成摘要，不参与筛选判断 |

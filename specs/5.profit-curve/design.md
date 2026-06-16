# profit-curve — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo (Turborepo)
- 涉及层: 数据库（capital_snapshots / ai_alerts）/ 后端（资金采集 + 指标计算 + 触发检测 + AI 生成）/ 前端（资金曲线图 + 提醒）

## 功能模块设计

### 模块 1: 数据库 Schema

新增文件 `packages/db/src/schema/profit-curve.ts`：

```typescript
// capital_snapshots — 每日资金快照
export const capitalSnapshots = pgTable("capital_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  date: date("date").notNull(),
  usdtBalance: numeric("usdt_balance").notNull(), // USDT 现货余额
  source: text("source").notNull().default("binance"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => ({ uniq: unique().on(t.userId, t.date) }));

// ai_alerts — AI 阶段性复盘 + 风险提示
export const aiAlerts = pgTable("ai_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),    // "consecutive_loss" | "consecutive_win" | "weekly_risk"
  content: text("content").notNull(),  // AI 生成的复盘/提示内容
  triggerContext: jsonb("trigger_context"), // { consecutiveCount: 3, recentPnl: -150 }
  isRead: boolean("is_read").notNull().default(false),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
});
```

### 模块 2: 资金快照采集服务

文件：`packages/api/src/services/capital-tracker.ts`

- **Binance 接口**：`GET https://api.binance.com/api/v3/account`（需签名）
  - 解析 `balances` 数组，找到 `asset="USDT"` 的 `free` + `locked` 合计
- **写入策略**：upsert by（userId, date），每日最多写一条
- **调用时机**：每日 cron + 订单同步完成后按需更新

```typescript
export async function captureCapitalSnapshot(userId: string, apiKey: string, secret: string): Promise<number>  // 返回 USDT 余额
```

### 模块 3: 指标计算服务

文件：`packages/api/src/services/capital-metrics.ts`

```typescript
// 输入：时间序列的 capital_snapshots
// 输出：统计指标

function calcMaxDrawdown(snapshots: CapitalSnapshot[]): { maxDrawdownPct: number; peakDate: string; troughDate: string }

function calcConsecutiveStreak(orders: TradeOrder[]): { consecutiveWins: number; consecutiveLosses: number }
// 基于 trade_orders 按时间排序，计算当前连续盈/亏次数（从最近往前数）
```

### 模块 4: 触发检测与 AI 生成

文件：`packages/api/src/services/alert-trigger.ts`

- **触发检测**（在订单同步后调用）：
  1. 计算 `consecutiveWins` / `consecutiveLosses`
  2. 若 ≥ 3 且距上次同类型 alert 生成时间 > 24h（去重）：触发 AI 生成
- **AI Prompt（连续亏损）：**
```
你是一个交易风险管理助手，语气克制、冷静。
用户最近连续亏损 {n} 笔交易，近期亏损合计 {amount} USDT。
请提供：1) 客观的近期交易统计总结，2) 连续亏损对心理的潜在影响提示，3) 1–2 条行动建议（如暂停交易、回顾策略）。
不要做市场预测，不要给出任何买卖建议。结尾加：「以上为风险提示，不构成投资建议。」
```
- **每周风险提示**（独立 cron）：
  1. 计算最大回撤，若 > 20% 则生成 `weekly_risk` 类型 alert

### 模块 5: 定时任务

文件：`apps/server/src/jobs/profit-tracker.ts`：
- 每日 00:05 UTC：对所有绑定 Key 的用户采集资金快照
- 每周一 00:10 UTC：检查最大回撤，生成周度风险提示

订单同步后的触发检测在 `order-sync.ts` job 中调用 `checkAndTriggerAlerts(userId)`。

### 模块 6: tRPC 路由

文件：`packages/api/src/routers/profit-curve.ts`（protectedProcedure）：

```typescript
profitCurve.getSnapshots(input: { range: "7d" | "30d" | "90d" | "all" })
profitCurve.getMetrics()            // 返回 maxDrawdown, consecutiveWins/Losses, totalPnl
profitCurve.getAlerts(input: { unreadOnly?: boolean })
profitCurve.markAlertRead(input: { alertId: string })
```

### 模块 7: 前端资金曲线页

路由：`apps/web/src/routes/_auth/profit-curve.tsx`

**布局：**
- 顶部：未读 AI 提醒 banner（若有未读 alert，显示折叠卡片，点击展开阅读）
- 资金曲线折线图（使用 `recharts` 库）：时间范围切换 tabs
- 关键指标卡片区域：最大回撤、连续盈亏、总盈亏
- AI 提醒历史列表（已读/未读）

**图表方案**：`recharts`（轻量，与 React 无缝集成，无需额外安装重型库）

## 接口契约

```typescript
type CapitalSnapshot = { date: string; usdtBalance: number };

type Metrics = {
  maxDrawdownPct: number;
  peakDate: string;
  troughDate: string;
  consecutiveWins: number;
  consecutiveLosses: number;
  totalPnl: number;
};

type AIAlert = {
  id: string;
  type: "consecutive_loss" | "consecutive_win" | "weekly_risk";
  content: string;
  isRead: boolean;
  generatedAt: string;
};
```

## 安全考虑

- Binance 账户接口需签名，使用 Feature 3 已存储的加密 Key，服务端解密后调用。
- AI 复盘内容 Prompt 强制约束不产生投资建议；每条 alert 结尾包含固定免责声明。
- 所有路由为 `protectedProcedure`，数据隔离 `WHERE userId = ctx.session.user.id`。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| 图表库 | recharts | 轻量 React 原生，无需引入 ECharts 等重型依赖 |
| 快照粒度 | 每日 | 日线级别足够看清资金趋势，分钟级快照无必要且成本高 |
| 触发去重 | 24h 冷却期 | 防止同一事件反复触发，同时不错过持续恶化的情况 |
| 权益定义 | USDT 现货余额 | MVP 最简单且最直观，在 UI 中标注范围说明 |

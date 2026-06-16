# order-review — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo (Turborepo)
- 涉及层: 数据库（trade_orders 扩展 + trade_reviews）/ 后端（订单同步 + AI 复盘生成）/ 前端（订单列表 + 详情）

## 功能模块设计

### 模块 1: 数据库 Schema 扩展

`trade_orders` 表由 Feature 3 定义，本 feature 需补充的同步字段已包含在内（`binanceOrderId`、`executedPrice`、`executedQty`、`commission`、`closedAt`、`pnl`、`userOpenReason`、`userCloseReason`）。

新增文件 `packages/db/src/schema/reviews.ts`：

```typescript
// trade_reviews — AI 复盘报告
export const tradeReviews = pgTable("trade_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => tradeOrders.id).unique(),
  userId: text("user_id").notNull(),
  basicReview: text("basic_review"),           // AI 基础复盘（无需用户逻辑）
  diagnosisReview: text("diagnosis_review"),   // AI 对照诊断（用户填写逻辑后生成）
  basicGeneratedAt: timestamp("basic_generated_at", { withTimezone: true }),
  diagnosisGeneratedAt: timestamp("diagnosis_generated_at", { withTimezone: true }),
});

// user_trade_notes — 用户开/平仓逻辑记录（冗余存储，便于查询）
// 注：MVP 直接存在 trade_orders 表的 userOpenReason / userCloseReason 字段
// 无需额外表，此处不创建
```

### 模块 2: Binance 历史订单同步服务

文件：`packages/api/src/services/binance-sync.ts`

- **接口**：`GET https://api.binance.com/api/v3/myTrades?symbol={symbol}&limit=500`
  - 需逐个 symbol 请求（Binance 不支持全量拉取所有 symbol）
  - 首次同步：拉取 `alpha_projects` 中所有已知 symbol
  - 增量同步：记录每个 symbol 上次同步的 `tradeId`，从该 ID 往后拉
- **买卖配对**：按 symbol 分组，时间排序后简单配对（buy → sell）计算 PnL
- **写入策略**：upsert by `binanceOrderId`（避免重复）

```typescript
export async function syncUserTrades(userId: string, apiKey: string, secret: string): Promise<{ synced: number }>
export async function matchAndCalculatePnl(orders: RawBinanceTrade[]): Promise<MatchedTrade[]>
```

### 模块 3: AI 复盘生成服务

文件：`packages/api/src/services/trade-review.ts`

**基础复盘 prompt（无用户逻辑）：**
```
你是一个专业的加密货币交易复盘助手。请对以下交易进行简洁的复盘分析：
- 交易对: {symbol}
- 方向: {side}
- 入场价: {entryPrice}，平仓价: {exitPrice}
- 持仓时长: {duration}
- 盈亏: {pnl}（{pnlPct}%）
- 市场背景（入场时段）: {marketContext}

请提供：1) 技术面时机判断（入场/出场点是否合理），2) 1–3个具体可执行的改进建议。语气克制，避免空泛。
```

**对照诊断 prompt（含用户逻辑）：**
```
同上基础信息，附加：
- 用户开仓理由: {openReason}
- 用户平仓理由: {closeReason}

请额外提供：用户的判断哪里对了、哪里错了、下次如何改进（结合用户自述逻辑诊断，而非泛泛而谈）。
```

### 模块 4: 定时同步任务

文件：`apps/server/src/jobs/order-sync.ts`

- 每 15 分钟：拉取所有有绑定 API Key 的用户 → 逐一同步订单 → 对新增已平仓订单异步触发 AI 基础复盘
- "立即同步"功能：tRPC mutation 触发同一逻辑（单个用户）

### 模块 5: tRPC 路由

文件：`packages/api/src/routers/orders.ts`（protectedProcedure）：

```typescript
orders.getOrders(input: { symbol?: string; status?: "win"|"loss"|"open"; limit: number; offset: number })
orders.getOrderDetail(input: { orderId: string })
orders.updateTradeNote(input: { orderId: string; openReason: string; closeReason: string })
orders.syncNow()                     // 触发立即同步，返回 { synced: number }
orders.regenerateDiagnosis(input: { orderId: string }) // 重新生成对照诊断
```

### 模块 6: 前端

**订单列表页** (`apps/web/src/routes/_auth/orders.tsx`)：
- 顶部：筛选栏（交易对 select + 盈亏状态 tabs）+ 立即同步按钮
- 订单卡片列表：交易对、方向 chip、成交价、盈亏额（绿/红）、持仓时长、AI 复盘 badge
- 分页（无限滚动或分页按钮）

**订单详情页** (`apps/web/src/routes/_auth/orders.$orderId.tsx`)：
- 基础数据面板
- AI 基础复盘区域（markdown 渲染）
- 用户逻辑输入表单（开仓理由 + 平仓理由 textareas）
- AI 对照诊断区域（填写逻辑后展示，未填写时显示引导文案）

## 安全考虑

- 订单同步使用已存储的加密 API Key（只读权限即可），通过 `decryptApiKey()` 解密后在服务端使用。
- 所有 tRPC 路由为 `protectedProcedure`，查询时 `WHERE userId = ctx.session.user.id` 确保数据隔离。
- AI 复盘不包含对未来价格的预测，Prompt 明确约束 LLM 角色定位为"复盘助手"而非"投资顾问"。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| 买卖配对算法 | 简单时序配对（FIFO） | MVP 已足够，避免实现复杂的成本基础计算 |
| AI 复盘时机 | 订单同步后异步触发 | 不阻塞列表展示，用 badge 提示状态 |
| 复盘存储 | 独立 trade_reviews 表 | 复盘字段大（text），独立存储避免 trade_orders 过宽 |
| 订单详情路由 | TanStack Router 动态路由 `$orderId` | 符合项目已有路由规范 |

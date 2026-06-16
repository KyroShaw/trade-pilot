# semi-auto-trading — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始设计 |

## 项目架构

- 架构类型: pnpm monorepo (Turborepo)
- 涉及层: 数据库（user_exchange_keys / trade_orders）/ 后端（Binance 签名下单 + 加密）/ 前端（设置页 + 下单弹窗）

## 功能模块设计

### 模块 1: 数据库 Schema

新增文件 `packages/db/src/schema/trading.ts`：

```typescript
// user_exchange_keys — 交易所 API Key 加密存储
export const userExchangeKeys = pgTable("user_exchange_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),          // better-auth user id
  exchange: text("exchange").notNull().default("binance"),
  encryptedApiKey: text("encrypted_api_key").notNull(),    // AES-256-GCM 密文
  encryptedSecret: text("encrypted_secret").notNull(),     // AES-256-GCM 密文
  keyHint: text("key_hint"),                  // 末4位明文，用于展示
  hasTradePermission: boolean("has_trade_permission"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// trade_orders — 下单记录（M3 写入，M4 读取）
export const tradeOrders = pgTable("trade_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  binanceOrderId: text("binance_order_id"),
  symbol: text("symbol").notNull(),           // e.g. "ALPHAUSDT"
  side: text("side").notNull(),               // "BUY" | "SELL"
  type: text("type").notNull().default("MARKET"),
  requestedQtyUsdt: numeric("requested_qty_usdt"),
  executedQty: numeric("executed_qty"),       // 实际成交数量
  executedPrice: numeric("executed_price"),   // 成交均价
  commission: numeric("commission"),
  commissionAsset: text("commission_asset"),
  status: text("status").notNull(),           // "FILLED" | "FAILED" | "PENDING"
  errorMessage: text("error_message"),
  source: text("source").default("manual"),   // "alpha_signal" | "manual"
  alphaSignalId: uuid("alpha_signal_id"),     // 关联的 Alpha 信号（可为 null）
  // M4 复盘字段
  userOpenReason: text("user_open_reason"),   // 用户填写的开仓逻辑
  userCloseReason: text("user_close_reason"), // 用户填写的平仓逻辑
  closedAt: timestamp("closed_at", { withTimezone: true }),
  pnl: numeric("pnl"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

### 模块 2: 加密工具

文件：`packages/api/src/utils/encryption.ts`

```typescript
// 使用 Node.js 内置 crypto 模块，AES-256-GCM
// 加密密钥来自环境变量 ENCRYPTION_KEY（32字节 hex）

export function encrypt(plaintext: string): string   // 返回 "iv:authTag:ciphertext" base64
export function decrypt(ciphertext: string): string
```

### 模块 3: Binance 下单服务

文件：`packages/api/src/services/binance-trade.ts`

- **签名**：Binance REST API 使用 HMAC-SHA256 签名（timestamp + queryString/body）
- **下单**：`POST https://api.binance.com/api/v3/order`
  - params: `symbol`, `side=BUY`, `type=MARKET`, `quoteOrderQty`（USDT 金额）
- **权限校验**：`GET https://api.binance.com/api/v3/account` 解析 permissions 字段
- **幂等性**：每次下单生成唯一 `newClientOrderId`（UUID），Binance 会拒绝重复的 clientOrderId

```typescript
export async function validateApiKey(apiKey: string, secret: string): Promise<{ valid: boolean; hasTradePermission: boolean }>
export async function placeMarketBuy(apiKey: string, secret: string, symbol: string, quoteQtyUsdt: number): Promise<BinanceOrderResult>
```

### 模块 4: tRPC 路由

文件：`packages/api/src/routers/trading.ts`（protectedProcedure）：

```typescript
trading.bindApiKey(input: { apiKey: string; secret: string })   // 加密存储，返回 keyHint
trading.getApiKeyStatus()                                        // 返回是否已绑定 + keyHint + hasTradePermission
trading.removeApiKey()                                           // 删除绑定
trading.placeOrder(input: { symbol: string; quoteQtyUsdt: number; alphaSignalId?: string })
trading.getMyOrders(input: { limit: number; offset: number })
```

### 模块 5: 前端

**设置页** (`apps/web/src/routes/_auth/settings.tsx`)：
- API Key 绑定表单（两个 password 输入框）
- 已绑定状态：展示 keyHint + 权限状态 + "解除绑定"按钮
- 风险声明 + Binance 文档链接

**下单弹窗** (`apps/web/src/components/place-order-dialog.tsx`)：
- 由 `AlphaSignalCard` 上的"下单"按钮触发
- 展示：标的、当前市价、输入金额（USDT）、预估获得数量
- 二次确认按钮（有 loading 状态、防重复点击）
- 成功/失败 toast（通过 sonner）

## 安全考虑

- API Key 和 Secret **绝不**进入前端 state 或浏览器存储；表单提交后立即加密，前端只知道 keyHint。
- 加密密钥（`ENCRYPTION_KEY`）存于服务端 `.env`，通过 `packages/env` 校验，不进入 DB。
- 下单 tRPC 接口为 `protectedProcedure`，未登录无法调用。
- `ENCRYPTION_KEY` 轮换策略：MVP 不做，但需在 `.env.example` 中注明"生产环境必须使用强随机密钥"。

## 技术决策

| 决策 | 选项 | 理由 |
| ---- | ---- | ---- |
| 加密算法 | AES-256-GCM | 业界标准，支持认证加密（防篡改），Node.js 原生支持 |
| 下单类型 | 市价单（MARKET） | MVP 最简单，避免限价单的挂单管理复杂度 |
| 下单金额单位 | quoteOrderQty（USDT） | 用户直觉更好（"花多少钱"而非"买多少个"） |
| 幂等性 | Binance clientOrderId（UUID） | 利用交易所原生幂等机制，无需额外实现 |

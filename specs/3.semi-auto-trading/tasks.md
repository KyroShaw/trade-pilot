# semi-auto-trading — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-16 | v1   | 初始任务 |

## 项目信息

- 项目名: trade-pilot
- 架构类型: pnpm monorepo (Turborepo)
- specs 路径: specs/3.semi-auto-trading/

## 任务列表

### 功能 1: 数据库 Schema

- [ ] T-001: 在 `packages/db/src/schema/trading.ts` 定义 `user_exchange_keys` 和 `trade_orders` 表，执行 `pnpm db:push`；在 `packages/env` 中添加 `ENCRYPTION_KEY` 环境变量声明 ~20min

### 功能 2: 加密工具

- [ ] T-002: 实现 `packages/api/src/utils/encryption.ts`（AES-256-GCM encrypt/decrypt），使用 Node.js 内置 `crypto` 模块，含单元测试验证加解密往返 ~30min

### 功能 3: Binance 下单服务

- [ ] T-003: 实现 `packages/api/src/services/binance-trade.ts`：HMAC-SHA256 签名工具、`validateApiKey()`、`placeMarketBuy()`，含详细错误码映射 ~1h

### 功能 4: tRPC 路由

- [ ] T-004: 实现 `packages/api/src/routers/trading.ts`（bindApiKey / getApiKeyStatus / removeApiKey / placeOrder / getMyOrders），注册到 `appRouter` ~30min

### 功能 5: 前端设置页

- [ ] T-005: 创建 `apps/web/src/routes/_auth/settings.tsx`，实现 API Key 绑定表单 + 已绑定状态展示 + 解除绑定 + 风险声明 ~30min

### 功能 6: 前端下单弹窗

- [ ] T-006: 实现 `apps/web/src/components/place-order-dialog.tsx`：下单参数输入 + 预览摘要 + 二次确认 + loading 状态 + 成功/失败 toast ~30min
- [ ] T-007: 在 `AlphaSignalCard`（Feature 2 组件）上添加"下单"按钮，触发 `PlaceOrderDialog`；未绑定 Key 时跳转设置页 ~15min

### 集成与测试

- [ ] T-008: 端到端验证：绑定 API Key → 触发下单 → Binance 返回成功 → 记录入库 → 验证 DB 数据正确；验证重复点击不重复下单 ~30min

## 依赖关系

- T-003 依赖 T-002（encryption）
- T-004 依赖 T-001（DB schema）、T-002、T-003
- T-005 依赖 T-004
- T-006、T-007 依赖 T-004；T-007 依赖 Feature 2 的 `AlphaSignalCard`
- T-008 依赖所有前置任务

## 风险点

- **真实资金风险**：开发调试时使用 Binance 测试网（`https://testnet.binance.vision`）；在 `binance-trade.ts` 中通过环境变量 `BINANCE_TESTNET=true` 切换端点，上线前必须切回主网。
- **加密密钥丢失**：若 `ENCRYPTION_KEY` 丢失，用户的 API Key 将无法解密，需重新绑定。需在运维文档中注明密钥备份要求。
- **Binance 签名错误**：时间戳偏差 > 1000ms 会导致签名拒绝，服务端需保持时间同步。

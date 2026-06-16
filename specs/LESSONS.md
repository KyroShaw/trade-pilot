# LESSONS.md — 架构决策与踩坑记录

## Feature 1: market-research

### L-001: Biome noVoid 规则
**问题**: `void asyncFn()` 模式被 Biome `lint/complexity/noVoid` 规则禁止。
**解决**: 改为 `asyncFn().catch(console.error)` 或 `asyncFn().catch(() => {})` 显式处理 Promise。

### L-002: Biome useAwait 规则
**问题**: 函数声明为 `async` 但内部只有 `return somePromise()` 而没有 `await` 会触发 `lint/suspicious/useAwait`。
**解决**: 去掉 `async` 关键字，函数仍然返回 Promise，调用方无感知。

### L-003: Biome noNestedTernary 规则
**问题**: React 组件中三层嵌套三元表达式被禁止。
**解决**: 使用 `let content: React.ReactNode; if/else if/else { content = ... }; return <div>{content}</div>` 替代。

### L-004: 骨架屏 key 不用 index
**问题**: `Array.from({length:5}).map((_,i) => <div key={i}/>)` 触发 `noArrayIndexKey`。
**解决**: 预定义常量数组 `const SKELETON_KEYS = ["s1","s2",...] as const` 用固定字符串作 key。

### L-005: pnpm add vs pnpm install
**问题**: 新建 package 后执行 `pnpm install` 显示 "Already up to date"，新包依赖未安装。
**解决**: 对新包的外部依赖须用 `pnpm add <dep> --filter <package-name>` 显式安装。

### L-006: Biome 排序规则
**问题**: Biome 会自动排序 interface 字段、JSX 属性按字母顺序，可能改变文件内容布局。
**结论**: 接受自动排序，不要手动维护排序，依赖 `biome --write` 保持一致性。

### L-007: CoinGecko /news 返回结构
**问题**: CoinGecko `/news` 端点返回 `{ data: NewsItem[] }` 而非直接 `NewsItem[]`。
**解决**: 在 `fetchNews()` 中解包 `data.data ?? []`。

## Feature 2: alpha-dca-strategy

### L-008: @trade-pilot/ui 导入路径
**问题**: `import ... from "@trade-pilot/ui/card"` 或 `"@trade-pilot/ui/skeleton"` 会导致 Vite/rolldown 报错："./card is not exported under the conditions"。
**解决**: 必须使用完整组件路径 `@trade-pilot/ui/components/card`、`@trade-pilot/ui/components/skeleton` 等（匹配 package.json 中 `"./components/*"` 导出模式）。

### L-009: noUncheckedIndexedAccess 与 for 循环
**问题**: tsconfig 中 `noUncheckedIndexedAccess: true` 导致 `for (let i=0; i<arr.length; i++) arr[i]` 被标记为 `T | undefined`，TypeScript 报错。
**解决**: 改用 `for...of` 遍历，或用 `const item = arr[i]; if (item === undefined) continue;` 明确守卫。对需要前一个元素的场景（如 ATR 计算），用 `let prevClose: number | undefined; for (const kline of klines) { if (prevClose !== undefined) { ... } prevClose = ... }` 模式。

### L-010: noImplicitAnyLet + noEvolvingTypes
**问题**: `let klines;` 后在 try 块内赋值，Biome 报 `noImplicitAnyLet` 和 `noEvolvingTypes` 错误（变量类型隐式为 any）。
**解决**: 必须显式标注类型：`let klines: (typeof alphaKlineCache.$inferSelect)[] = [];`，使用 Drizzle 的 `$inferSelect` 获取表的推断类型。

### L-011: 新包 workspace 依赖需手动添加到 package.json
**问题**: `apps/server` 的 job 文件直接导入 `@trade-pilot/llm`，但 server 的 `package.json` 中没有该依赖，导致 `tsc` 报 `Cannot find module '@trade-pilot/llm'`。
**解决**: workspace 包依赖 `pnpm add @package --filter ...` 无法用于内部包，需手动在 `package.json` 中添加 `"@trade-pilot/llm": "workspace:*"` 后 `pnpm install`。

### L-012: Biome noNonNullAssertion 与 .at(-1)
**问题**: 用 `.at(-1)!` 强制解包非空时触发 `lint/style/noNonNullAssertion`。  
**解决**: 改用可选链 `?.` 加空值合并：`klines.at(-1)?.close ?? 0`。

## Feature 3: semi-auto-trading

### L-013: shadcn Dialog 组件需手动添加
**问题**: `@trade-pilot/ui` 中只有基础组件（Button/Card/Input/Label/Skeleton/Sonner），Dialog 组件不存在，直接 import 会报"not exported"。
**解决**: 在 `packages/ui` 目录下运行 `pnpm dlx shadcn@latest add dialog --yes`，会自动创建 `src/components/dialog.tsx`。

### L-014: TanStack Router `_auth` 是 pathless 前缀
**问题**: 在代码中使用 `{ to: "/_auth/settings" }` 导航，TypeScript 报错"not assignable to valid routes"。
**解决**: `_auth` 是 TanStack Router 的 pathless layout route 前缀，实际 URL 路径是 `/settings`，代码中应使用 `{ to: "/settings" }`。

### L-015: Binance API `Record<number, string>` 键类型
**问题**: 定义错误码映射 `Record<number, string>`，然后用 `String(err.code) as keyof typeof map` 访问时，TypeScript 报 "Conversion of type 'string' to type 'number' may be a mistake"。
**解决**: 改用 `Record<string, string>`，直接用 `map[String(err.code)]` 访问，无需类型断言。

### L-016: Biome noNestedTernary 与按钮文本
**问题**: 按钮文本用双层三元表达式 `isPending ? "..." : confirmed ? "..." : "..."` 触发 `noNestedTernary` 规则，且无自动修复。
**解决**: 提取独立函数 `function buttonLabel(isPending: boolean, confirmed: boolean): string { if/else }`，在 JSX 中调用该函数。

## Feature 4: order-review

### L-017: Drizzle timestamp 返回 string 非 Date
**问题**: TypeScript 报类型不匹配，自定义 interface 中的 `createdAt: Date | null` 与 Drizzle 查询返回的实际类型不符。
**解决**: Drizzle ORM 的 `timestamp` 字段在查询结果中返回 `string | null`（ISO 格式），不是 `Date`。自定义 interface 或类型应使用 `string | null`。

### L-018: Biome 复杂度限制（Excessive complexity）
**问题**: 订单列表中 `orders.map(order => {...})` 回调函数内容复杂（包含多层条件和 JSX），触发 Biome `noExcessiveCognitiveComplexity`（最大复杂度 20，实际 24）。
**解决**: 将 map 回调中的 JSX 提取为独立的子组件（`function OrderCard({order}: {order: Order})`），放在同文件中但在父组件之外定义。

### L-019: 避免在 server job 中直接使用 drizzle-orm
**问题**: `apps/server/src/jobs/order-sync.ts` 直接导入 `drizzle-orm` 的操作符导致 TS2307（server 的 package.json 中没有 drizzle-orm）。
**解决**: 将所有 DB 操作封装进 `packages/api/src/services/order-sync-service.ts`，server job 只调用服务函数，不直接使用 drizzle-orm。这也符合项目分层规范（DB 操作在 packages/api，不在 apps/server）。

### L-020: Biome type alias vs interface
**问题**: `type Order = {...}` 导致 Biome 报 "Use of the type detected"（`noTypeAlias` 规则）。
**解决**: 改用 `interface Order {...}` 声明，Biome 偏好 interface 而非 type alias 用于对象形状定义。

## Feature 5: profit-curve

### L-021: recharts Tooltip 自定义 formatter 类型不兼容
**问题**: 给 recharts `<Tooltip>` 传 `formatter` 和 `labelFormatter` 属性时，TypeScript 报类型不匹配（参数类型为 `ValueType | NameType`，而期望 `string | number`）。
**解决**: 不传 formatter prop，直接用 `<Tooltip />` 裸组件，recharts 默认的 tooltip 格式对大多数场景够用。若需自定义，需先 `as unknown as string` 转换类型。

### L-022: async 函数无 await 触发 useAwait 规则
**问题**: tRPC `.query(async ({ ctx, input }) => { ... return query; })` 中只 return 了 Promise 而没有 `await`，Biome 报 `lint/suspicious/useAwait`。
**解决**: 去掉 `async` 关键字（`.query(({ ctx, input }) => { ... return query; })`），Drizzle 查询返回 Promise，tRPC 可正常处理。同见 L-002。

### L-023: noNestedTernary 在 JSX 中的三路分支
**问题**: 图表区域需要三路条件渲染（加载中 / 无数据 / 渲染图表），内联三元嵌套触发 `noNestedTernary`。
**解决**: 提取为独立辅助函数 `function chartContent(isPending: boolean, snapshots: {...}[]): React.ReactNode`，在组件 JSX 中调用 `{chartContent(query.isPending, snapshots)}`。

### L-024: callLLM 返回 string | null 需守卫
**问题**: `@trade-pilot/llm` 的 `callLLM()` 返回 `Promise<string | null>`，直接传给 `createAlert(content)` 时 TypeScript 报 "Argument of type 'string | null' is not assignable to parameter of type 'string'"。
**解决**: 每次 LLM 调用后均需 `if (content) { await createAlert(...) }` 守卫，不可假设返回非空。

### L-025: onConflictDoUpdate target 用数组而非复合唯一索引名
**问题**: `capitalSnapshots` 表有复合唯一约束 `unique().on(t.userId, t.date)`，调用 `.onConflictDoUpdate({ target: capitalSnapshots.userId })` 仅传单字段时 PostgreSQL 报"there is no unique or exclusion constraint matching ON CONFLICT specification"。
**解决**: target 必须传完整的列数组 `target: [capitalSnapshots.userId, capitalSnapshots.date]`，与 unique 约束的列一一对应。

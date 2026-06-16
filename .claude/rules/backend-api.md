---
description: Hono + tRPC 后端 API 规范
globs: "apps/server/**,packages/api/**"
---

# 后端 API 规范

## 架构分层

- HTTP 服务器: Hono（`apps/server/src/index.ts`，port 3000）
- API 层: tRPC 路由定义在 `packages/api/src/routers/`，通过 `@hono/trpc-server` 挂载
- Context: `packages/api/src/context.ts` 构建，包含 DB 客户端和 better-auth session
- 路由汇总: `packages/api/src/routers/index.ts` 合并为 `appRouter`

## tRPC 路由规范

- 每个业务域一个 router 文件（如 `routers/todo.ts`）
- 使用 `publicProcedure` 处理无需认证的操作
- 使用 `protectedProcedure` 处理需要认证的操作（从 context 中获取 session）
- 所有输入用 `input(z.object({...}))` 校验，不接受未校验的原始数据
- 在 `routers/index.ts` 导出 `AppRouter` 类型供前端使用

## 错误处理

- 使用 `TRPCError` 抛出业务错误（`NOT_FOUND`、`UNAUTHORIZED`、`BAD_REQUEST`）
- 不暴露内部错误堆栈给客户端
- 异步过程用 `try-catch`，不静默吞掉错误
- 早返回（early return）处理错误场景，减少嵌套

## 开发与构建

- 开发模式: `tsx watch src/index.ts`（热重载）
- 生产构建: `tsdown` 打包为 ESM（`dist/index.mjs`）
- 单二进制编译: `bun build --compile`（可选，用于容器部署）

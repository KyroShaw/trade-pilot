---
description: 安全规范：密钥处理、输入校验、认证守卫
---

# 安全规范

## 环境变量

- 所有密钥和连接字符串通过 `packages/env` 的 Zod schema 校验后使用
- 每个 app 的 `.env` 文件已列入 `.gitignore`，绝不提交
- 服务端密钥（`DATABASE_URL`、`BETTER_AUTH_SECRET` 等）绝不暴露给前端（`packages/env` 中区分 server/client）

## 输入校验

- 所有 tRPC 过程输入用 Zod schema 校验（`input(z.object({...}))`）
- 不信任客户端传来的用户 ID，从 better-auth session 中获取（`packages/api/src/context.ts`）
- SQL 查询通过 Drizzle ORM 参数化，不拼接原始 SQL 字符串

## 前端安全

- `<a target="_blank">` 必须加 `rel="noopener noreferrer"`
- 避免 `dangerouslySetInnerHTML`
- 禁止 `eval()`
- 禁止直接赋值 `document.cookie`

## 认证与授权

- 保护路由放在 `apps/web/src/routes/_auth/`，通过 `route.tsx` 的 `beforeLoad` 守卫认证状态
- better-auth session 验证在 tRPC context 中完成
- 需要认证的 tRPC 过程使用 `protectedProcedure`，未认证时抛出 `TRPCError({ code: "UNAUTHORIZED" })`

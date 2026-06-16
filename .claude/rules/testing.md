---
description: 测试规范（建议引入 Vitest，项目当前无测试框架）
---

# 测试规范

## 当前状态

项目尚未配置测试框架。推荐引入 **Vitest**（与 Vite 生态无缝集成）。

## 文件约定

- 测试文件命名: `*.test.ts` / `*.test.tsx`，与被测文件同目录
- 所有断言写在 `it()` 或 `test()` 块内
- 使用 `async/await` 而非 done 回调
- 不提交含 `.only` 或 `.skip` 的测试代码
- 避免过多嵌套 `describe` 层级

## tRPC 路由测试

- 使用 `createCallerFactory` 进行服务端单元测试，不走 HTTP 层
- 在 context 中注入测试用 DB 客户端和模拟 session

## 数据库测试

- 使用真实 PostgreSQL 测试库，不 mock Drizzle
- 每个测试前清理相关表数据（`beforeEach`）

## 前端组件测试

- 推荐 `@testing-library/react` + Vitest
- 测试用户行为而非实现细节

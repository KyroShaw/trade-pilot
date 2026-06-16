---
description: React + Vite + TanStack Router 前端开发规范
globs: "apps/web/**"
---

# 前端规范

## 路由

- 使用 TanStack Router 文件路由，路由文件放在 `apps/web/src/routes/`
- 保护路由放在 `_auth/` 目录，通过 `_auth/route.tsx` 的 `beforeLoad` 守卫认证状态
- 不要手动修改 `routeTree.gen.ts`（由 `@tanstack/router-plugin` 自动生成）
- 导航使用 `<Link>` 组件或 `useNavigate()`，不使用 `window.location`

## 数据获取

- 通过 tRPC + TanStack Query 获取服务端数据（`src/utils/trpc.ts`）
- 使用 `trpc.<router>.<procedure>.useQuery()` / `.useMutation()`
- 不使用裸 `fetch` 直接调用后端 API
- 认证操作通过 `src/lib/auth-client.ts` 的 better-auth 客户端

## 组件规范

- 函数组件 + TypeScript，禁止 class 组件
- Hooks 只在组件顶层调用，不在条件分支内
- 不在其他组件内部定义组件
- React 19：`ref` 作为普通 prop 传递，不用 `React.forwardRef`
- shadcn/ui 组件从 `@trade-pilot/ui` 导入

## 样式

- TailwindCSS v4 utility classes
- 通过 `cn()` 合并动态类名（来自 `@trade-pilot/ui`）
- 暗色模式通过 `next-themes` 的 `ThemeProvider` 支持（`src/components/theme-provider.tsx`）
- Biome 自动排序 `cn()`/`clsx()`/`cva()` 内的类名

## 表单

- 使用 `@tanstack/react-form` 处理表单状态
- Zod schema 做输入校验，与 tRPC input schema 共享（定义在 `packages/api`）

## 可访问性

- 图片提供有意义的 alt 文本
- 表单输入必须有对应 label
- 使用语义化 HTML 元素（`<button>`、`<nav>`、`<main>` 等）
- 鼠标事件必须配套键盘事件处理

# trade-pilot

Full-stack trading application monorepo built with the Better-T-Stack (React + Hono + tRPC + Drizzle + PostgreSQL).

## 技术栈

- 语言: TypeScript
- 前端: React 19 + Vite + TanStack Router + TailwindCSS v4
- 后端: Hono + tRPC + Node.js
- 数据库: Drizzle ORM + PostgreSQL
- 认证: better-auth
- 包管理: pnpm (v11) + Turborepo
- 代码质量: Biome via Ultracite（Tab 缩进，双引号）
- Git hooks: Husky

## 常用命令

- 安装依赖: `pnpm install`
- 全栈开发: `pnpm dev`
- 仅前端: `pnpm dev:web`（port 5173）
- 仅后端: `pnpm dev:server`（port 3000）
- 构建: `pnpm build`
- 类型检查: `pnpm check-types`
- Lint 检查: `pnpm check`
- Lint 修复: `pnpm fix`（提交前必须执行）
- 数据库推送: `pnpm db:push`
- 数据库迁移: `pnpm db:migrate`
- 数据库 Studio: `pnpm db:studio`

## 目录结构

```
trade-pilot/
├── apps/
│   ├── web/          # React SPA (Vite + TanStack Router)
│   ├── server/       # Hono API server
│   └── fumadocs/     # 文档站点
├── packages/
│   ├── api/          # tRPC 路由定义（前后端共享）
│   ├── auth/         # better-auth 配置
│   ├── config/       # 共享 TypeScript / Biome 配置
│   ├── db/           # Drizzle schema + DB 客户端
│   ├── env/          # Zod 环境变量校验
│   └── ui/           # shadcn/ui 组件库
├── biome.json
├── turbo.json
└── pnpm-workspace.yaml
```

## 规则

@rules/coding-style.md
@rules/testing.md
@rules/security.md
@rules/git-workflow.md
@rules/frontend.md
@rules/backend-api.md
@rules/database.md

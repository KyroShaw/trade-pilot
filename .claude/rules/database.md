---
description: Drizzle ORM + PostgreSQL 数据库规范
globs: "packages/db/**"
---

# 数据库规范

## Schema 定义

- Schema 文件放在 `packages/db/src/schema/`，按业务域拆分（`todo.ts`、`auth.ts` 等）
- 在 `schema/index.ts` 中统一导出所有 schema
- 使用 Drizzle 的 `pgTable` 定义表，字段类型明确标注
- better-auth 相关表定义在 `schema/auth.ts`（由 `packages/auth` 管理，不要手动修改）

## 迁移工作流

- 开发阶段: `pnpm db:push`（直接推送 schema 变更，适合快速迭代）
- 生产前: `pnpm db:generate` 生成迁移文件 → `pnpm db:migrate` 执行
- 不手动修改 `drizzle/` 目录下的自动生成文件

## 查询规范

- 通过 Drizzle ORM 查询，不拼接原始 SQL 字符串（必须用时使用 `sql` 标签模板）
- 复杂关联查询优先使用 Drizzle 关系查询 API（`db.query.<table>.findMany()`）
- 在 `packages/api` 中通过 context 获取 DB 实例，不在路由层直接 import DB

## 字段约定

- 主键: UUID 类型（`uuid()` 默认值）
- 时间字段: `created_at`、`updated_at` 使用 `timestamp` 类型（`withTimezone: true`）
- 软删除（如需要）: `deleted_at` 字段而非直接 DELETE

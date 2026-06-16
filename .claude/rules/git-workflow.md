---
description: Git 工作流、Conventional Commits 规范、分支命名
---

# Git 工作流

## Commit 消息格式

遵循 Conventional Commits：

```
<type>(<scope>): <subject>
```

**types:** `feat` | `fix` | `chore` | `docs` | `refactor` | `test` | `style` | `perf`

**scopes:** `web` | `server` | `db` | `api` | `auth` | `ui` | `env` | `config`

示例：
- `feat(web): add dashboard route with portfolio overview`
- `fix(api): handle missing session in todo router`
- `chore(db): add created_at column to todos table`
- `refactor(server): extract auth middleware to separate module`

## 分支命名

- 功能: `feat/<short-description>`
- 修复: `fix/<short-description>`
- 文档: `docs/<short-description>`
- 重构: `refactor/<short-description>`

## 提交前检查

Husky pre-commit hook 自动运行 `ultracite fix`。手动提交前确认：

1. `pnpm fix` — 格式化和 lint 修复
2. `pnpm check-types` — 类型检查通过
3. 不包含 `.env`、`node_modules/`、`dist/`、`.turbo/` 文件

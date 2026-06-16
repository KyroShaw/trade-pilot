---
description: TypeScript 代码风格规范，基于 Biome + Ultracite 配置（Tab 缩进，双引号）
globs: "**/*.ts,**/*.tsx"
---

# 代码风格

## 格式化

- 缩进: **Tab**（`biome.json` formatter 配置）
- 引号: **双引号**（`javascript.formatter.quoteStyle: "double"`）
- 提交前运行 `pnpm fix` 自动修复所有格式问题

## TypeScript

- 默认 `const`，需要重赋值用 `let`，禁止 `var`
- 优先 `unknown` 而非 `any`；避免不必要的类型标注（`noInferrableTypes`）
- 使用 `as const` 标记不可变字面量
- 优先类型收窄（type narrowing）而非类型断言
- 枚举成员必须显式初始化（`useEnumInitializers`）
- 禁止参数重新赋值（`noParameterAssign`）

## 语法偏好

- 使用 `for...of` 而非 `.forEach()` 和索引 `for`
- 使用可选链 `?.` 和空值合并 `??`
- 优先模板字面量而非字符串拼接
- 使用解构赋值
- 自闭合空标签（`useSelfClosingElements`）
- 禁止不必要的 `else`（`noUselessElse`）
- 单变量声明语句（`useSingleVarDeclarator`）
- 使用 `Number.*` 命名空间方法（`useNumberNamespace`）

## Import

- Biome 自动排序 import（`assist.actions.source.organizeImports: "on"`）
- TailwindCSS 类名通过 `cn()` / `clsx()` / `cva()` 传入时 Biome 自动排序
- 避免 barrel 文件（`packages/*/src/index.ts` 除外，那些是公共 API 入口）
- 优先具名导入而非命名空间导入

## 注释

- 只在 "为什么" 非显而易见时添加（隐藏约束、反直觉行为、绕过特定 bug）
- 禁止保留调试用 `console.log`、`debugger`、`alert`
- 不写描述代码在做什么的注释（代码命名已经说明）

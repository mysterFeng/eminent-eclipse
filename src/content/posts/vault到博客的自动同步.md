---
title: 给知识库接一条自动发布管道：/publish 一下，博客就上线
date: '2026-04-10'
description: 用 GitHub Actions 把私有知识库 vault 中标记 publish 的文章自动同步到公开博客仓库的完整方案
category: 工程实践
tags:
  - GitHub Actions
  - 自动化
  - Astro
  - Claude Code
  - 知识管理
source: vault
summary: vault 和 blog 是两个独立 repo。用一个 slash command 加一个 GitHub Actions 工作流，把'写完文章 → 发布到博客'压缩成一句话。
---

我有两个 repo：

- `knowledge-vault`（私有）—— 所有的笔记、概念、博客草稿都在这里
- `eminent-eclipse`（公开）—— 基于 Astro 的个人博客，Netlify 部署

之前的发布流程很笨重：在 vault 写完 → 切到 blog repo → 复制粘贴 → 改 frontmatter → commit → push → 等 Netlify。来回切目录、容易漏字段、每次都得想"我刚才同步了哪几篇"。

理想体验只有一句话：**在 vault 写完，`/publish` 一下，喝杯咖啡的时间博客就更新了。**

## 架构

四块拼图：

```
vault (private)                GitHub                      my-blog (public)
─────────────                  ──────                      ────────────────
/publish slash command  ───→   push vault main
                               │
                               ↓ gh workflow run
                          ┌─────────────────────────┐
                          │ sync-from-vault.yml     │
                          │  1. checkout my-blog    │
                          │  2. checkout vault      │  ←── VAULT_TOKEN (PAT)
                          │  3. npm ci              │
                          │  4. npm run sync        │
                          │  5. commit & push       │  ───→ Netlify rebuild
                          └─────────────────────────┘
```

各组件职责：

| 组件 | 位置 | 职责 |
| :-- | :-- | :-- |
| `scripts/sync-vault.mjs` | my-blog | 把 vault/blog 下 `publish: true` 的文件同步进 `src/content/posts` |
| `sync-from-vault.yml` | my-blog Actions | 串起 clone vault → 跑脚本 → 自动 commit |
| `/publish` slash command | vault `.claude/commands/` | 用户入口：校验 + 加 `publish: true` + 触发工作流 |
| `VAULT_TOKEN` secret | my-blog repo | fine-grained PAT，让 Action 能 clone 私有 vault |

## 同步脚本：单向 + 幂等 + 可撤回

`sync-vault.mjs` 是整套方案的核心。逻辑很短，但每条规则都是被某个边界情况逼出来的：

```javascript
// 1. 扫描 vault/blog 下所有 .md
// 2. 解析 frontmatter，过滤 publish: true
// 3. 每个文件：
//    - 强校验 category 存在（缺失 → 报错退出）
//    - 文件名 YYYY-MM-DD-xxx.md → xxx.md（剥日期前缀）
//    - 写入 src/content/posts，加 source: vault 标记
// 4. 陈旧清理：
//    - 扫现有 src/content/posts 里所有 source: vault 的文件
//    - 不在本次同步集合里的，自动删除
```

关键性质：

- **幂等**：内容没变，重跑无副作用
- **冲突直接覆盖**：vault 始终是真相，my-blog 那侧手改一律会被回写
- **撤回友好**：把 vault 的 `publish: true` 删掉再同步一次，文件会自动从博客消失

## 几个我犹豫过的设计决策

### 为什么需要一个 `publish: true` 字段，而不是同步全部

vault 是私人知识库，什么都有：草稿、未脱敏的笔记、临时的想法。`blog/` 目录里的文件不等于"想发布"。需要一个明确的开关。

更重要的是：**这个开关只能由 `/publish` 命令加，不能手工编辑加**。这其实是个契约——`publish: true` 的存在等价于"我已经审查并批准发布"。物理上没法强制（谁都能 vim 一下），但作为约定写进了 `/publish` 命令的前置说明里。

### 为什么文章需要标 `source: vault`

同步是单向的，但 my-blog 也有手写的文章（不来自 vault）。如果 `/publish` 后又把某篇撤回（删掉 `publish: true`），同步脚本怎么知道该删哪些文件？

答：脚本写入 my-blog 时给 frontmatter 加 `source: vault` 标记。每次同步扫描所有带这个标记的文件，凡是不在当前 publish 集合里的就删除。**没标这个字段的文件永远不会被脚本碰**。这条不变量让"vault 自动管理"和"手写文章"可以在同一个目录共存。

### 为什么去掉了默认分类

旧的博客 schema 写过 `category: z.string().default("Flutter")`。这是个糖衣陷阱：忘了写分类的文章会被默默归到 Flutter 下面。

新规则：分类必填，没填就报错退出。强制每篇文章在 vault 那一侧就把分类想清楚，而不是在脚本里兜底。这条规则也写进了 `/publish` 命令的校验流程——缺 `category` 时它会停下来问你要一个，而不是默默替你填。

## 第一个坑：分支不一致差点删文章

第一次跑工作流时差点把博客上已发布的两篇文章误删。原因：

- 我之前手工往 vault 的某个 feature branch 加了 `publish: true`
- 同步工作流默认 clone vault 的 **main** 分支
- main 上没有这两个 publish 标记 → 同步集合是空 → 陈旧清理逻辑认为这两篇该删

修复有两层：

1. 把 feature branch fast-forward 到 main，让 main 成为 vault 的真相之源
2. 在 `/publish` 命令的前置约束里硬编码"必须在 main 分支才能发布"

教训：**单一真相源**不能省。任何分布式同步都依赖一个明确的 source of truth，分支偏移就是最常见的祸源。

## 第二个坑：`[skip ci]` 的连环套娃

整条链路第一次跑完，绿勾，sync 成功，my-blog main 也确实多了一条 commit。但博客上死活看不到那篇新文章。

回查一圈：

- ✅ vault main 有 `publish: true`
- ✅ Sync workflow 跑了，绿勾
- ✅ my-blog main 多了一条 sync commit
- ❌ Cloudflare Pages 部署列表里那条 commit 状态是「**已跳过**」

原因藏在我自己埋的坑里。Sync workflow 的 commit message 我是这么写的：

```text
sync: 从 knowledge-vault 同步博客文章

[skip ci]
```

加 `[skip ci]` 的本意是防止其它 GitHub Actions 被这条自动 commit 触发——这是 CI 圈子里的常用约定。**但 Cloudflare Pages 也识别这个标记**。结果就是：同步推上去了，CF Pages 看到 message 里有 `[skip ci]`，直接跳过部署。Action 显示成功（它确实成功了），但部署没发生，博客没更新。

发现后我立刻删掉了 workflow 里那行，做了一条修复 commit。结果——**这条修复 commit 也被跳过了** 🤦

为什么？因为我的修复 commit message 是这样的：

```text
sync workflow: 移除 commit message 里的 [skip ci]

Cloudflare Pages 会识别 [skip ci] 并跳过构建...
```

**body 里我又写了 `[skip ci]` 做说明文字**。CF Pages 扫的是整条 message（subject + body），不只看标题。所以这条"用来修复 `[skip ci]` 的 commit"自己又被自己 `[skip ci]` 了。

最后用一条空 commit 才把构建踢起来：

```bash
git commit --allow-empty -m "chore: trigger Cloudflare Pages rebuild"
git push
```

教训三条：

1. **Magic strings 是平台级共识**。`[skip ci]` 不是 GitHub Actions 独有，Cloudflare Pages、GitLab CI、CircleCI 都会响应。在多 CI 系统的项目里加这种标记前要先确认所有下游平台的行为。
2. **不要在 commit message 里讨论 magic strings**。即使是 body 里的说明文字也会被扫到。要讨论就写在 PR description、代码注释、或文档里——反正不在 commit message。
3. **避免修一个不存在的问题**。Sync workflow 根本不需要 `[skip ci]`：本仓库目前只有这一个 workflow，且它只在 `workflow_dispatch` / `repository_dispatch` 上触发，不监听 `push`，根本不会循环触发自己。我加 `[skip ci]` 是在防一个不存在的问题，引入了一个真实的 bug。

## 跑通后的效果

现在的发布流程：

```text
# 在 vault 的 Claude Code 会话里
> /publish vault博客同步

✓ 找到候选文件：2026-04-10-vault到博客的自动同步.md
✓ 校验通过，category: 工程实践
✓ 加 publish: true
✓ git commit + push vault main
✓ gh workflow run sync-from-vault.yml -R mysterFeng/eminent-eclipse

同步工作流已派发，约 1-2 分钟内完成。
https://github.com/mysterFeng/eminent-eclipse/actions
```

约一分半钟后：

- my-blog 的 main 多一条 `sync: 从 knowledge-vault 同步博客文章` 的 commit
- Netlify 检测到变化，重新构建
- 博客上线

整个过程我**不需要打开 my-blog 的本地副本**。事实上为了让这个流程跑得彻底，我已经把本地的 my-blog clone 删了——以后所有博客内容的来源都只从 vault 进入。

## 下一步可能的改进

- vault main 加一个 push 触发器，往 my-blog 自动 dispatch（省掉 `/publish` 里 `gh workflow run` 这步）
- 同步时顺便在 CI 里跑一遍 `astro build`，build 失败就拒绝 commit
- 给 `/publish` 加 `--watch` 选项，等 Netlify 部署完成再返回

不过这些都是锦上添花。当前版本已经把"发布一篇文章"的心智成本压到了一句话以下。

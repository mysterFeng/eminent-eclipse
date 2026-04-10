---
title: 用 Claude Code 搭建 Karpathy 式个人知识库：从零到自动化编译
date: '2026-04-06'
description: 基于 Karpathy LLM Wiki 方法论，用 Claude Code slash command 搭建个人知识库的完整实践
category: AI 工具
tags:
  - Claude Code
  - Obsidian
  - 知识管理
  - LLM
  - Karpathy
source: vault
summary: 基于 Karpathy 的 LLM Knowledge Bases 方法论，用 Claude Code 的 slash command 实现了 raw → wiki → blog 的自动化知识编译流水线。
---

# 用 Claude Code 搭建 Karpathy 式个人知识库：从零到自动化编译

Karpathy 前几天发了一篇 Gist，讲怎么用 LLM 构建个人知识库。核心思路是把知识库当代码仓库管——原始资料是源码，LLM 是编译器，产出结构化的 wiki。我花了一个下午用 Claude Code 把这套方法论落地了，记录一下完整过程。

## 为什么要搞这个

之前用 Obsidian 记笔记，攒了不少内容，但越攒越乱。三个月前收藏的文章，现在根本想不起来在哪、讲了什么。手动整理？试了两周就放弃了。

Karpathy 的思路解决了这个问题：**别让人整理，让 LLM 整理。** 而且不是随便整理，是按软件工程的方式——分层、增量、可追溯。

## 三层目录结构

整个知识库就是一个普通文件夹，里面全是 markdown 文件：

```
knowledge-vault/
├── raw/                    # 原始资料（只进不改）
│   ├── articles/           # 网页文章
│   ├── podcasts/           # 播客转录
│   └── papers/             # 论文
│
├── wiki/                   # 编译产物（LLM 维护）
│   ├── indexes/            # All-Sources.md, All-Concepts.md
│   ├── concepts/           # 概念条目（一个概念一个文件）
│   └── summaries/          # 逐篇摘要
│
├── outputs/                # 运行时输出
│   ├── qa/                 # 问答沉淀
│   └── health/             # 健康检查报告
│
├── blog/                   # 可发布的博客文章
├── brain/                  # 个人目标和模式
└── .claude/commands/       # Claude Code 自定义命令
```

类比软件工程：`raw/` 是 `src/`，`wiki/` 是 `build/`，`outputs/` 是 `logs/`。你不会把 `.java` 和 `.class` 混在一起，笔记也一样。

## 用 Claude Code Slash Command 做自动化

这是整个方案的核心。我写了几个 Claude Code 的自定义命令，放在 `.claude/commands/` 目录下，实现了完整的知识编译流水线。

### /ingest — 摄取资料

看到一篇好文章，在 Claude Code 里敲一行命令：

```
/ingest https://example.com/some-article
```

Claude 自动用 defuddle 提取网页内容，转成干净的 markdown，存到 `raw/articles/`，同时更新索引。也可以用 Obsidian 的 Web Clipper 插件直接保存，效果一样。

### /compile — 编译知识库

攒了几篇 raw 之后：

```
/compile
```

Claude 扫描 `raw/` 里所有未编译的资料，对每篇做三件事：

1. **生成摘要** → 存到 `wiki/summaries/`，包含核心结论、关键证据、术语表、疑点
2. **提取概念** → 新概念建条目存到 `wiki/concepts/`，旧概念追加新证据
3. **更新索引** → `All-Sources.md` 和 `All-Concepts.md`

关键是**增量编译**——只处理新增的 raw，不全量重建。跑通第一次之后，后面每次编译都很快。

命令的实现就是一个 markdown 文件，写清楚步骤和规范，Claude 按指令执行：

```markdown
# .claude/commands/compile.md
---
description: "编译知识库 — 扫描 raw/ 新增资料，生成摘要、提取概念、更新索引"
---

执行知识库编译。扫描 raw/ 中的新增资料，生成编译产物到 wiki/。

## 步骤
1. 扫描 raw/ 列出所有 .md 文件
2. 对比 All-Sources.md 索引，找出未编译的
3. 对每篇未编译资料：生成摘要、提取概念、更新索引
4. 确保交叉链接完整
5. 输出编译报告
```

### /blog — 生成博客

做完一个项目或学了一个知识点：

```
/blog
```

Claude 回顾当前会话内容，自动生成一篇可发布的中文博客文章，自动脱敏（IP 用 `x.x.x.x` 替代，token 用占位符），存到 `blog/` 目录。你现在看到的这篇文章就是这么生成的。

### /health — 健康检查

```
/health
```

检查知识库的一致性（同一概念在不同地方定义是否矛盾）、完整性（哪些概念缺定义）、孤岛（哪些笔记没有链接），生成报告到 `outputs/health/`。

## 实际编译效果

我拿 Karpathy 的原文和一篇解读文章做了测试。两篇 raw 编译后产出：

- **2 份结构化摘要**（核心结论 + 证据 + 术语表 + 疑点）
- **7 个概念条目**：知识编译、三层知识架构、增量编译、知识健康检查、QA 沉淀、RAG vs 轻量索引、Memex
- **2 个索引文件**自动更新
- 所有概念之间有交叉链接，每个摘要链回原文

概念条目长这样：

```markdown
# 知识编译

## 定义
将原始资料通过 LLM "编译"为结构化知识条目的过程。
Obsidian Vault = 代码仓库，LLM = 编译器，CLAUDE.md = 编译规范。

## 关键要点
- 靠人手动整理笔记不可持续，让 LLM 代劳
- 质量靠规范保证
- 第一次编译耗时较长，后续增量很快

## 证据与来源
- [[Karpathy 原文]]
- [[Yanhua 解读]]

## 相关概念
- [[三层知识架构]]
- [[增量编译]]
```

## 踩坑记录

1. **X/Twitter 内容抓取**：defuddle 和 WebFetch 都拿不到 X 的内容（反爬严格）。解决方案：用 Chrome 浏览器扩展（claude-in-chrome）直接读取已打开的页面。

2. **Obsidian Web Clipper 保存路径**：默认存到 `Clippings/` 而不是 `raw/articles/`。需要在 Web Clipper 设置里把默认文件夹改为 `raw/articles`。

3. **博客文章不应该有 wikilinks**：vault 的校验脚本会警告没有 `[[wikilinks]]` 的文件。但博客是对外发布的纯 markdown，需要在校验脚本里把 `blog/` 加到跳过列表。

## 日常工作流

最终沉淀下来的日常流程非常简单：

```
看到好文章  → /ingest <url>（或 Web Clipper 一键保存）
攒了几篇   → /compile
做完项目   → /blog
每周维护   → /health
```

四个命令覆盖了从输入到输出的完整链路。知识库就是一个 git 仓库，多设备同步用 `git push/pull` 搞定。

## 总结

这套方案的本质就一句话：**把知识当代码管，用 LLM 当编译器。**

不需要 RAG、不需要向量数据库、不需要复杂的基础设施。一个文件夹 + 几个 Claude Code 自定义命令 + Obsidian（可选）就够了。整个搭建过程不到一个下午。

Karpathy 说这套东西目前还像一堆 hacky scripts。确实，但流程已经跑通了，后面就是往 `raw/` 里不断喂素材，让编译器持续工作。

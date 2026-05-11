---
title: 拆掉 CLAUDE.md：从 178k 星的 ECC 里只抄了一个借鉴点
date: '2026-05-11'
description: 看完 GitHub 上 178k 星的 Everything Claude Code，决定不装它，但抄了它的『拟人化元配置三件套』思路：把 CLAUDE.md 按角色拆成 SOUL / RULES / CONTEXT。落地一小时，省下的是后面每次会话的注意力。
category: AI 工作流
tags:
  - claude-code
  - vault
  - everything-claude-code
  - agent-harness
  - prompt-engineering
source: vault
summary: 看完 GitHub 上 178k 星的 Everything Claude Code，决定不装它，但抄了它的『拟人化元配置三件套』思路：把 CLAUDE.md 按角色拆成 SOUL / RULES / CONTEXT。落地一小时，省下的是后面每次会话的注意力。
---

# 拆掉 CLAUDE.md：从 178k 星的 ECC 里只抄了一个借鉴点

我用 Claude Code 搭知识库快一年了，根目录的 `CLAUDE.md` 一路从几十行涨到 260 行。每次新增子系统（学习区、阅读区、源码解读区、飞书同步……），就往里加一段约定，没人 review，没人重构，越攒越像一个垃圾抽屉。

昨天浅读了 GitHub 上一个叫 **Everything Claude Code**（下文简称 ECC）的项目，178k 星，Anthropic Hackathon 出品的"Claude Code 增强包"。看完决定不装它，但抄了它一个思路回来：**把 CLAUDE.md 按角色拆成三件套**。今天花了一小时落地，文末讲怎么做的。

---

## 这是个什么东西

ECC 的作者 Affaan Mustafa 把它定位成"agent harness 性能优化系统"。换个说法——你日常在 `.claude/skills/` `.claude/commands/` `.claude/hooks/` 里手搓的那一堆配置，ECC 把它工业化抽象成一套**预装套件**：

- 48 个专家 agents（planner / code-reviewer / security-reviewer / 各语言 reviewer……）
- 182 个 skills
- 68 个 slash commands
- 一整套 hooks / rules / instincts

更狠的是，**同一份资产同时落地到 8 个 agent harness**：Claude Code、Codex、Cursor、OpenCode、Gemini、Trae、Kiro、CodeBuddy 各有镜像目录。装一次，全平台通用。

如果还嫌不够，它还有：

- 一个独立 npm 包 `ecc-agentshield`，扫 prompt injection / secret 泄漏 / 工具沙箱安全（102 个静态规则）
- 一个 Rust 写的 alpha 控制面 `ecc2/`，目标做成"daemon 管理多个 Claude Code session"
- 一个 GitHub App，可以从你的 git 历史里反向生成 skill 文件
- ……

打个不太严谨的类比：**Claude Code 自己是 Linux Kernel，ECC 是 Ubuntu/Debian 发行版**。Kernel 给你最小能跑的基底，发行版给你预装一切。

## 但我没装

野心这么大、星数这么高的项目，看完为什么不装？

### 178k 星这个数字本身就值得挑刺

GitHub 上 Linux Kernel 的镜像才 18 万星，Rust 才 10 万。一个三个月前刚 hackathon 出来的项目，**stars / forks / watchers / contributors 是 178k / 27k / 178k / 170**——stars 和 watchers 一模一样，对比 170 个真实 contributors，这个数据形态非常异常。最可能的解释是早期通过 star farm 或社交媒体（作者 X 上 170k 粉丝）批量导入。

不是说项目质量差——README 写得极认真、CI 跑 992 个测试、CHANGELOG 详尽到一周一版本，这些都是真功夫。但**不要拿 star 数当市场验证**。

### 自助餐综合症

48 agents + 182 skills + 68 commands 的体量，普通用户基本会瘫痪：

- 我什么时候用 `code-reviewer` agent？什么时候用 `/code-review` command？什么时候用 `security-reviewer`？
- 12 种语言 reviewer，怎么知道一个 PR 该路由到哪个？
- `continuous-learning` 跟 `continuous-learning-v2` 跟 `/learn` 跟 `/learn-eval` 区别在哪？

ECC 自己也意识到这个问题，给了一个 `npx ecc consult "<topic>"` 的 advisor 命令——加一层抽象解决"抽象太多"。这是个红旗。

### 我是单人单 harness 内容场景

我的 vault 只用 Claude Code，主要做的事是写博客、读书、学新东西、解读 GitHub 项目，不是软件工程。ECC 80% 的能力（跨 harness 镜像、12 种语言 reviewer、企业级 operator workflows、PR 安全审查）我用不上。

杀鸡用牛刀。

## 但它有一个 idea 我抄了

ECC 仓库根下平铺着三个特殊文件，**ECC 自己的项目级配置就用这套约定写**：

| 文件 | 角色 | 内容性质 |
|---|---|---|
| `SOUL.md` | "我是谁" | Core Identity、Core Principles、Orchestration Philosophy。长期不变 |
| `RULES.md` | "我必须做什么 / 不做什么" | Must Always、Must Never、各种 Format 规范。半稳定 |
| `WORKING-CONTEXT.md` | "我现在在干什么" | Last updated 字段、Current Truth、Active Queues。频繁更新 |

这是一个**拟人化的项目元配置**——给 LLM 看的"自我介绍 + 制度手册 + 周报"。SessionStart hook 会把这三个文件注入 system prompt 头部，让每次会话开场就读到"ECC 是个什么人、有什么规矩、当下在忙什么"。

我看到这个分层的瞬间就明白为什么我的 CLAUDE.md 越写越胖：

> 把"哲学"、"硬约束"、"当下能力清单"三种**性质完全不同**的信息塞进一个文件，LLM 每次开会话都得 re-read 整坨，注意力没有清晰分配；这文件越积越多，更新的时候我自己都嫌长。

拆开之后好处：

1. **LLM 注意力分配更清晰**：读到 SOUL 时知道这是世界观，读到 RULES 时知道这是检查项，读到 CONTEXT 时知道这是查工具用的
2. **变更频率匹配**：SOUL 几乎不动、RULES 偶尔加条 Must Never、CONTEXT 频繁加 commands。三个文件的 git diff 历史会反映三种不同的演化节奏
3. **薄入口扛兼容**：Claude Code 启动会自动读根目录 `CLAUDE.md`——保留这个文件作 30 行的薄壳，里面 reference 三件套即可，不破坏任何现有行为

## 实战：把我的 CLAUDE.md 拆掉

### 拆分映射

我对照原来 260 行的 `CLAUDE.md`，按下面这张表分配：

| 原章节 | 拆到哪 | 为什么 |
|---|---|---|
| Vault 物理结构 | SOUL | 心智地图，长期不变 |
| 三层架构哲学（raw → wiki → blog） | SOUL | Karpathy 方法论根基 |
| Teaching Style（教学风格） | SOUL | 三大子系统的灵魂 |
| 编译规范（raw / 摘要 / 概念 / 博客） | RULES | 硬要求，逐条可检查 |
| 索引维护 | RULES | 必须做的 |
| 链接规则 | RULES | wikilink 硬约定 |
| Learn / Read / Code-Study 子系统约定 | RULES | 单文件模式、不污染等硬约束 |
| Graph View 过滤规则 | RULES | 写死的 query |
| Must / Must Never | RULES | 本来就是 |
| 日常使用速查表 | CONTEXT | 场景 → 命令的查询 |
| Slash Commands 全表 | CONTEXT | 命令清单经常加减 |
| Skills 列表 | CONTEXT | skill 列表也在变 |

### 入口处理

CLAUDE.md 没删，瘦身成 30 行：

```markdown
# Knowledge Vault

个人知识库 — 基于 Karpathy 三层架构。

## 元配置三件套（必读）

| 文件 | 角色 | 何时读 |
|---|---|---|
| SOUL.md | 我是谁 — 世界观、物理结构、教学哲学 | 进入会话前 |
| RULES.md | 必须做 / 必不做 — 编译规范、Must Never | 写笔记前对照 |
| CONTEXT.md | 当下能力库存 — commands / skills / 速查表 | 想用什么命令时查 |

Claude 在 vault 内任何会话开始时，先读完三件套，再处理用户请求。

## 5 条 must-know（不读三件套也得记的底线）

1. raw 只进不改、wiki 由 LLM 增量编译
2. 博客必须脱敏：IP 用 `x.x.x.x`，token 用 `<your-xxx>`
3. learn / read / code-study 单文件模式
4. code-study 默认不克隆，源码隔离在 vault 之外
5. `/lesson` 完成后自动 sync 飞书
```

Claude Code 仍然自动加载 `CLAUDE.md`，但内容是导航而不是知识本身。底线规则保留在入口（避免 LLM 偷懒不读三件套时还是知道脱敏这种红线），详细规则在 RULES.md。

### 顺手收尾

拆完之后还要做一件事：Obsidian 的 Graph View 过滤规则也要加上新文件，不然这三个 vault 元配置节点会污染知识图谱。直接改 `.obsidian/graph.json` 的 `search` 字段，加上 `-file:SOUL -file:RULES -file:CONTEXT`。

最终 4 个文件的行数：CLAUDE.md（32）+ SOUL.md（150）+ RULES.md（130）+ CONTEXT.md（134）= 446 行，比原来 260 行胖了，但**每一行都待在对的位置**，而且后续单独迭代任何一个文件都不会牵动另两个。

## 还想抄的，剩下没做

ECC 真正最值钱的部分，是它把"agent 工作环境"当成可优化对象的整套思路。除了三件套，我还看上了它另外几个 idea，列出来留作后续：

- **`ECC_HOOK_PROFILE=minimal|standard|strict` 环境变量**：给 SessionStart hook 加一层运行时强度开关。平时 standard，深度对话切 minimal 省 token，跨 vault 大操作切 strict 加全文件列表
- **AgentShield 安全扫描**：独立的 `npx ecc-agentshield scan` 可以脱离 ECC 主体用，扫一遍 vault 的 skill 文件看有没有意外的 secret 或 prompt injection 风险
- **从 git 历史抽 skill 模板**：ECC 的 `/skill-create` 思路。我的 vault 已经有 ~30 个 commands/skills 是手搓的，应该可以让 Claude 扫一遍发布过的博客，把里面的"经验/教训段落"自动抽成 `wiki/concepts/<topic>.md` 候选
- **instincts → skills 进化机制**：ECC 的 Stop hook 从 session 抽 pattern 写成 instinct，攒够了 `/evolve` 升级成正式 skill。这个机制装到 vault 里能让 vault 自己长起来

## 总结

拆三件套这件事本身不复杂，难的是想清楚为什么拆。

178k 星的项目，最值钱的可能是**一个心智模型**，不是整套软件。ECC 装与不装是次要选择，但它给我灌输了一个观点：

> 你的 `CLAUDE.md` 不是项目文档，它是 LLM 协作伙伴的"个人资料 + 制度手册 + 工作 backlog"。三种东西不该混在一个文件里。

按这个角度看，每个用 Claude Code 长期写代码或建知识库的人，都应该回头看看自己的 `CLAUDE.md` 是不是也长成了垃圾抽屉。如果是，拆一次。

不需要装 178k 星的项目就能做这件事。

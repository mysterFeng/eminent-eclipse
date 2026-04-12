---
title: 我的 Claude Code 实践装备清单（持续更新）
date: '2026-04-12'
description: 从 slash commands 到 skills 再到 plugins，记录我这套 Claude Code 装备是怎么一层一层长出来的——每加一件都是被实际问题逼出来的，不是为了凑数。
category: AI 工作流
tags:
  - claude-code
  - workflow
  - skills
  - slash-commands
source: vault
summary: 从 slash commands 到 skills 再到 plugins，记录我这套 Claude Code 装备是怎么一层一层长出来的——每加一件都是被实际问题逼出来的，不是为了凑数。
---

# 我的 Claude Code 实践装备清单（持续更新）

用 Claude Code 快三个月了，从一开始只会 `claude` 敲一下问问题，到现在装了一整套 slash commands、skills、plugins、MCP servers。这篇算是给自己的一份「装备总览」，以后每加/删一件都会回来改。

目的不是炫装备，而是想回答一个问题：**哪些东西真的每天都在用，哪些是装完就吃灰**。后者会被我陆续删掉。

---

## 分层：Commands / Skills / Plugins / MCP

我的心智模型是这样的：

| 层 | 谁触发 | 适合做什么 | 例子 |
|---|---|---|---|
| Slash Command | 我主动敲 `/xxx` | 固定流程、可复用工作流 | `/ingest`、`/compile`、`/blog` |
| Skill | Claude 自己判断要不要加载 | 领域知识、特定格式、工具使用说明 | `obsidian-markdown`、`baoyu-markdown-to-html` |
| Plugin | 装一次永久生效 | 一组相关工具/技能的打包 | `playwright`、`context7`、`claude-mem` |
| MCP Server | 后台常驻 | 给 Claude 新的「手」和「眼睛」 | `claude-in-chrome`、`playwright` |

搞清楚这个分层很关键——它决定**新能力该往哪塞**。流程型的进 command，知识型的进 skill，工具型的进 plugin/MCP。

---

## 一、Slash Commands：我的工作流骨架

项目里现在有 18 个 `.claude/commands/*.md`，按用途分成三组。

### 知识库组（对应这个 obsidian-mind vault）

```
/ingest       抓 URL 存到 raw/
/compile      扫 raw → 增量生成摘要和概念到 wiki/
/blog         把本次会话整理成可发布的中文博客
/publish      一键把 blog/ 同步到 Astro 博客仓库
/publish-clean 清理发布产物
/xhs          一篇博客 → 小红书卡片 + 文案 + 公众号 HTML
/cover        给博客生成封面图
/dump         自由记录、自动分类到对的位置
/vault-audit  审计 vault（断链、孤岛、frontmatter）
/vault-upgrade 迁移老笔记到新结构
```

这套是 Karpathy「LLM 知识库」方法论的落地：**raw（只进不改）→ wiki（LLM 维护的编译产物）→ blog/xhs/wechat（对外输出）**。三层分开最大的好处是可追溯——任何一个概念都能顺着 `sources` 字段点回原文。

### 学习/阅读组

```
/curriculum <主题>   拟新主题大纲
/learn <主题>        进入学习会话，自动续上次断点
/book add <书名>     添加一本书，问元数据并建骨架
/read [<书>]         进入阅读会话
/lesson              把当前会话沉淀成 lesson/reading note，更新进度
/quiz <主题或书>     从复习队列抽题考我
/review              看所有主题和在读书的复习状态
```

`learn/` 和 `read/` 是和 `raw/→wiki/` 平行的另一个子系统。两者的区别：
- raw→wiki 是「被动消化文章」，一篇一篇进
- learn/read 是「主动系统化学」，按课程/书的顺序推进，带进度条和复习队列

`/lesson` 很妙——它会**自动判断当前是 learn 会话还是 read 会话**，生成对应的笔记，不用我每次指定。

### 通用组

```
/health      知识库健康检查
/standup     每日启动
/wrap-up     会话收尾
/humanize    去 AI 味
/weekly      每周回顾
```

**踩过的坑**：`/health` 是我装完用了两次就不再碰的典型——一跑就几万 token，而且现在 vault 还小，没什么可检查的。装完不用不可耻，及时识别比硬撑更重要。

---

## 二、Skills：让 Claude「自动补上」领域知识

Skills 的价值是**按需加载**：不用每次对话都把几千字的说明塞进 context，Claude 只在判断相关时才去读 `SKILL.md`。

我现在用得最多的几个：

### `defuddle`（/ingest 背后的抽取器）

专门把网页 HTML 干干净净地转成 Markdown。`/ingest` 命令就是套了一层流程，核心靠它。碰到付费墙、反爬、动态加载的页面会失败，这时候我一般手动下载 HTML 本地喂给它。

### `obsidian-markdown`

写 `.md` 文件时自动加载，确保 frontmatter 格式对、wikilinks 语法对、不会在 blog 里乱用 `[[]]`（blog/ 要脱链对外发布，不能带 wikilinks）。

### `baoyu-markdown-to-html`

**这个是我用得最多的 skill**。`/xhs` 命令里调它把 blog 转成微信公众号风格的 HTML：

```bash
bun skills/baoyu-markdown-to-html/scripts/main.ts <blog.md> \
  --theme grace --color blue --cite
```

生成的 HTML 可以直接粘到公众号后台，样式全保留。`--cite` 会把链接变成底部引用的形式，符合公众号不能外链的规定。

### `baoyu-cover-image` / `baoyu-xhs-images`

封面图和小红书卡片的生成器。前者走 `/cover`，后者被 `/xhs` 调用。视觉统一是靠这两个 skill 的 CSS 规范硬约束出来的——我在 `/xhs` 命令里写死了「封面深蓝科技、内容卡白底紫色 accent、结尾卡紫渐变」，不靠 Claude 现场发挥。

### `qmd`

对 vault 做语义搜索。`/dump` 在归档之前会先用它查一遍「是不是已经有相关笔记了」，有就追加，没有才新建——防止同一个主题散成十个文件。

### `playwright-cli` 🆕（2026-04-12 刚装）

微软 26 年初新开的 `@playwright/cli`，和 Playwright MCP 并列但走完全不同的路线。官方基准说比 MCP 省 **4 倍 token**（27k vs 114k），我今天装完跑 smoke test 就直观看到了差距。

**核心机制**：
- `snapshot` 命令不返回整个 DOM，只给你一个**语义结构 + 元素 ref**（`e1/e2/e3...`），而且**存到磁盘**（`.playwright-cli/*.yml`），Agent 决定要不要读
- 截图也是存盘，不塞进上下文
- 点击直接用 ref：`playwright-cli click e6`

我在 example.com 上跑的第一个 snapshot 只有 250 字符：

```yaml
- generic [ref=e2]:
  - heading "Example Domain" [level=1] [ref=e3]
  - paragraph [ref=e4]: This domain is for use in...
  - paragraph [ref=e5]:
    - link "Learn more" [ref=e6] [cursor=pointer]
```

对比 Playwright MCP 每次把整个 accessibility tree 塞进上下文，差距一目了然。

**安装**：

```bash
npm install -g @playwright/cli@latest
cd <your-project>
playwright-cli install --skills   # 把 skill 装到 .claude/skills/playwright-cli/
```

**几个高频命令**：

```bash
playwright-cli open <url>                    # 开一个浏览器（默认 Chrome）
playwright-cli open <url> --persistent       # 保留 cookies 和登录态
playwright-cli snapshot                      # 拍语义快照（省 token 关键）
playwright-cli click e6                      # 按 ref 点击
playwright-cli type "hello"                  # 往当前焦点输入
playwright-cli screenshot                    # 截图存盘
playwright-cli close                         # 关浏览器
```

**踩坑**：`.playwright-cli/` 目录会堆快照文件，**一定要加 .gitignore**，否则每次运行都会污染 diff。

**用法上的智慧**（来自 UP 主「技术爬爬虾」的视频）：
1. 第一次让 AI 自己摸索完成复杂任务（他测的抓评论案例用了 41% 上下文）
2. 让 AI 把过程提炼成一个**新的 skill** 放进项目
3. 再跑同样任务，只要 5% 上下文（**~10 倍提升**）
4. 如果流程完全固定，让 AI 生成脚本 → **0 token** 直接跑

这条「AI 摸索 → 固化 skill → 编成脚本」的三级优化曲线我觉得特别有价值——它承认了**不是所有事都需要 AI 智能**，固化下来的东西就该用便宜的方式跑。

#### 实战：重构 `/xhs` 的截图环节

装完 playwright-cli 当天，我顺手拿 `/xhs` 命令开了刀。

**重构前的问题**：`/xhs` 命令的 markdown 里内嵌了一段 Playwright 的 Node 代码示例，每次生成卡片 Claude 都会「现场写一段截图脚本 → cd /tmp → node 执行」。这段代码**逻辑完全固定**——打开 HTML → 遍历 `.card` → 每张截图成 `card-NN.png`，没有任何需要 AI 判断的地方。但因为它藏在命令文档里作为「示例」，Claude 每次都老老实实把十几行 Playwright API 重写一遍。

**重构后**：

1. 在 vault 根建 `scripts/xhs-screenshot.mjs`，一个接受 HTML 路径、输出 PNG 到同目录的固定脚本
2. 用 `createRequire` 从 `/tmp/node_modules/` 加载 `playwright`，避免在 vault 里建 `node_modules` 污染 git
3. `/xhs` 命令步骤 5 从「示例代码块」改成一行命令：
   ```bash
   node scripts/xhs-screenshot.mjs blog/publish/xhs/{slug}.html
   ```
4. 加了一行严肃注记在命令里：**「不要再现场写 Playwright 代码。截图这步是完全固定的流程，已经沉淀到脚本，改需求就改脚本，不要绕过脚本。」**

**收益**：
- 每次 `/xhs` 少写几十行 Playwright API 代码 → token 省了一截
- 脚本 2.4 秒跑完两张 2160×2880 @2x 的 PNG，比 Claude 现场写还快
- 命令文件更短更清楚：以前的 Playwright 代码块现在变成一行调用

**收获**：
- 不是所有「可复用」都要做成 skill。**完全零变量的流程直接写脚本**，skill 这一层都省了。
- 「写进命令文档的示例代码」是一种陷阱——它看起来像文档，实际上是让 LLM 每次重新生成的提示词，比脚本贵得多。
- 重构命令时的心态是「从命令里挖出所有不需要智能的部分，塞到脚本里」。命令只保留**需要判断**的步骤，执行型的步骤都外包给脚本。

接下来想对 `/ingest` 的 defuddle 调用和 `/cover` 的 ComfyUI 调用做同样的手术，先看能挖出多少「伪智能」步骤。

---

## 三、Plugins：一次装好，永久在线

Plugins 是 commands + skills + agents 的打包。我装的几个：

| Plugin | 实际用途 |
|---|---|
| `playwright` | 截图、浏览器自动化，`/xhs` 生成卡片 PNG 就靠它 |
| `context7` | 问库/框架用法时现场拉最新官方文档，比靠训练数据的记忆准得多 |
| `github` | `gh` 命令的加强版，开 PR、查 issue、merge |
| `claude-mem` | 跨会话记忆，每次开会话自动注入相关历史 |
| `frontend-design` | 写前端时用的一套工具 |
| `code-simplifier` | 专门简化/重构代码的 subagent |

**最值回票价的两个是 `context7` 和 `claude-mem`**。前者解决了「Claude 训练数据过时」的问题——问 Astro 5.17 的新 API，直接去拉官网文档，不靠猜。后者解决了「每次新会话都要重新解释项目背景」的问题——今天这次会话开头自动注入的 180 条历史 observation，省了我至少 5 分钟的背景铺陈。

---

## 四、MCP Servers：Claude 的新手脚

MCP 是 Claude「真正能做事」的通道。我现在接了四个：

- **`claude-in-chrome`** — 操作我自己的 Chrome 浏览器（不是 headless）。看我当前打开的标签页、点按钮、填表单、读控制台。调试前端、自动发布到各种后台都靠它。
- **`playwright`** — headless 浏览器，和上面的区别是「一次性任务用 playwright，要保持登录态/操作真实浏览器用 claude-in-chrome」。⚠️ **注意**：自从装了上面的 `playwright-cli` skill，我打算慢慢把这个 MCP 弃掉——CLI 版本在 token 消耗上碾压 MCP，但现在 `/xhs` 的发布管道还在用 MCP，先不敢贸然切。等 CLI 版本稳定跑一周再说。
- **`context7`** — 上面说过，拉官方文档。
- **`claude-mem`** — 上面说过，历史记忆。

---

## 五、这一个月沉淀下来的几条规则

这些不是 Claude Code 的官方文档，是我自己踩出来的：

### 1. 命令要写「为什么」，不只是「做什么」

以前我的 `.md` 命令只写步骤，结果 Claude 经常跑偏。后来每个命令都加了「Why」和「How to apply」两行，告诉它这一步是**为了**什么——偏差立刻小了一半。

### 2. 视觉风格要硬约束，不能靠 Claude 现场发挥

小红书卡片的颜色、间距、字号，我全写死在 `/xhs` 命令里。一开始偷懒让 Claude「自己看着办」，生成出来每次都不一样，客户看了会精分。固化成 CSS 规范后，**一致性 = 品牌感**，这步必须认怂。

### 3. 发布流程必须原子化

`/xhs` 一开始只生成小红书卡片。结果每次还要手动跑另一个命令生成公众号 HTML，经常忘记，发完了才想起来。后来把「卡片 + 文案 + 公众号 HTML」三件套合进一个命令，并且在 `~/.claude/projects/.../memory/` 里写了一条 feedback rule：**`/xhs` 必须同时生成这三样，缺一个不算完**。这条规则会在未来每次会话开头被注入，Claude 不会忘。

### 4. 冲突时优先保留远程

我在多台机器之间同步 vault，git 冲突时默认 `checkout --ours` 选远程的版本——本地的改动通常是零碎的随手笔记，远程的是结构性的变更。这条直接写进了项目 CLAUDE.md，Claude 会自动遵守。

### 5. 定期删没用的

`/health` 被我标记为「不常用」，下个月可能直接删掉。装了一堆 subagent 但只用过一次的也会清理。**装备多不等于生产力高**，反而会让 Claude 每次启动都要加载一堆不相关的上下文，拖慢响应。

---

## 六、接下来想加的

- **自动发布到 Cloudflare Pages 后的状态回传**——现在推完要自己去看 deploy log，想让 Claude 监控部署状态
- **`/daily-review`**——每天自动汇总今天的 commits、新增 raw 文章、完成的 lesson，生成一条短的日报
- **更好的 `/quiz`**——现在抽题太随机，想加入 SM-2 间隔重复算法

---

## 最后

这篇会持续更新。我的习惯是**每装一个新东西用满两周**，确认真的有价值才写进这里；用两次就吃灰的会被删掉，不留在清单里制造幻觉。

如果你也在搭自己的 Claude Code 工作流，最大的一条建议是：**从你实际的痛点出发，不要照抄别人的命令列表**。我这套是为了「持续输出技术文章 + 系统化学新东西」两个目标设计的，如果你是写代码为主，大概率不需要 `/ingest` `/compile` 这套，而会更需要 `code-simplifier`、测试生成、代码 review 这类 subagent。

工具是给工作流服务的，不是反过来。

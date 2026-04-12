---
title: 给知识库接上 Notion：打通手机到 Vault 的最后一公里
date: '2026-04-12'
description: 用 Notion 作为移动端入口和全局记忆库，单向同步到本地 Obsidian 知识库，打通手机随手记 → 编译 → 发布的完整链路。
category: AI 工具
tags:
  - Claude Code
  - Notion
  - 知识库
  - 自动化
source: vault
summary: 用 Notion 作为移动端入口和全局记忆库，单向同步到本地 Obsidian 知识库，打通手机随手记 → 编译 → 发布的完整链路。
---

# 给知识库接上 Notion：打通手机到 Vault 的最后一公里

我的知识库跑在本地 Obsidian + Claude Code 上，编译、发博客都很顺。但有个痛点——**手机上没法写入**。看到一篇好文章、聊天时冒出一个想法，只能先收藏到微信或者备忘录，回到电脑再手动搬。

Notion 天然解决这个问题：手机 App 体验好，云端同步，API 开放。所以我决定把 Notion 接进来，但**不是迁移到 Notion**，而是让它当一个输入口，内容最终还是落回本地 Vault。

## 设计：Notion 的两个角色

想清楚 Notion 在这套系统里该干什么：

```
Notion
├── 📥 Inbox (数据库)     → 手机随手记资料
└── 🧠 Memory (数据库)    → Claude 全局跨设备记忆
```

**Inbox** 是内容入口，手机上随手往里丢文章链接、想法、笔记，回到电脑跑 `/notion-sync inbox`，内容就会拉到 `raw/articles/`，然后走 `/compile → /blog → /publish` 现有管道。

**Memory** 解决另一个问题。Claude Code 的记忆是项目级的，绑在 `~/.claude/projects/xxx/memory/` 下面，换个项目、换台电脑就读不到了。Notion Memory 做全局层，跨设备、跨项目共享。

| 层级 | 存储 | 范围 |
|---|---|---|
| 项目级 | 本地 memory/ | 仅当前项目 |
| 全局级 | Notion Memory | 任何设备、任何项目 |

关键决策：**单向同步，Notion → Vault，本地为准**。Notion 是纯中转站，不搞双向同步的复杂度。

## 搭建过程

### 1. 创建 Notion Integration

去 [notion.so/my-integrations](https://www.notion.so/my-integrations) 新建一个 Internal Integration，拿到 API Token。

然后要把 Integration **连接到目标页面**。这一步有个坑——不是在"共享"面板里加，而是要走：

```
页面右上角 ... → 滚到底部 → 集成 → 添加连接 → 搜索你的 Integration 名字
```

### 2. 用 API 创建数据库

本来想在 Notion UI 里手动建，但通过 API 创建更快，而且自动继承 Integration 权限：

```bash
# 创建 Inbox 数据库
curl -X POST 'https://api.notion.com/v1/databases' \
  -H "Authorization: Bearer <your-notion-token>" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"page_id": "<parent-page-id>"},
    "title": [{"text": {"content": "Inbox"}}],
    "icon": {"type": "emoji", "emoji": "📥"},
    "properties": {
      "Name": {"title": {}},
      "URL": {"url": {}},
      "Author": {"rich_text": {}},
      "Tags": {"multi_select": {"options": [
        {"name": "AI", "color": "blue"},
        {"name": "编程", "color": "green"},
        {"name": "工具", "color": "orange"}
      ]}}
    }
  }'
```

Memory 数据库类似，多了 `Type`（select: user/feedback/project/reference）和 `Description` 字段。

### 3. 同步脚本

核心脚本 `scripts/notion-sync.mjs`，三个模式：

```bash
node scripts/notion-sync.mjs inbox   # Notion Inbox → raw/articles/
node scripts/notion-sync.mjs memory  # Notion Memory 索引 → MEMORY.md
node scripts/notion-sync.mjs push    # 本地 memory/ → Notion Memory
```

技术栈：`@notionhq/client` + `notion-to-md`，装在 `/tmp/node_modules/`（不污染 vault）。

Inbox 同步做了几件事：
- 查询数据库，拉取所有页面
- 用 `notion-to-md` 把 Notion blocks 转成 Markdown
- 生成带 frontmatter 的 `.md` 文件（包含 source_url、author、date、tags、notion_id）
- **增量同步**：按文件名去重，已存在则跳过

### 4. Memory 轻量索引

一开始的设计是把 Notion Memory 的全部内容拉到本地 `memory/notion/` 子目录。但很快意识到一个问题：**记忆多了每个文件都要读，token 会爆**。

最终方案——**MEMORY.md 只存索引，详情按需查询**：

```
之前：Notion Memory → 拉全文到 memory/notion/*.md → Claude 读文件（token 炸）
现在：Notion Memory → 只拉标题+描述到 MEMORY.md → 需要时通过 MCP 读 Notion
```

MEMORY.md 里每条 Notion 记忆只占一行：

```markdown
<!-- notion-memory-start -->
## Notion Memory (cloud, query via MCP)
- **User Profile** [user] — Tech content creator... <!-- notion_id -->
- **Style Preferences** [feedback] — Confirmed visual styles... <!-- notion_id -->
<!-- notion-memory-end -->
```

`notion_id` 藏在 HTML 注释里，Claude 能看到，需要详情时用 Notion MCP 按 ID 查询。200 行限制能存 200 条记忆，而不是之前的 7 个文件就占满。

### 5. 配置 Notion MCP Server

最后装了官方 Notion MCP Server，这样 Claude Code 可以在对话中直接读写 Notion，不用每次都跑脚本：

```json
// .mcp.json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "<your-notion-token>"
      }
    }
  }
}
```

记得把 `.mcp.json` 加到 `.gitignore`，里面有 token。

## 踩坑记录

### Notion SDK v5 的 breaking change

`@notionhq/client` v5.17.0 把 `databases.query()` 移除了，改成了 `dataSources.query()`，参数也从 `database_id` 变成 `data_source_id`，API 路径从 `databases/{id}/query` 变成 `data_sources/{id}/query`。

但问题是——新路径调用旧数据库会报 `object_not_found`。最后的兼容方案是用 `notion.request()` 直接调旧版端点：

```javascript
async function queryDatabase(dbId, opts = {}) {
  const body = {};
  if (opts.start_cursor) body.start_cursor = opts.start_cursor;
  if (opts.sorts) body.sorts = opts.sorts;
  if (opts.filter) body.filter = opts.filter;
  return notion.request({
    path: `databases/${dbId}/query`,
    method: "post",
    body,
  });
}
```

同时在 Client 初始化时锁定 API 版本：`notionVersion: "2022-06-28"`。

### Sort 字段名不是属性名

Notion API 的 sort 有两种类型：按属性排序用 `property`，按时间戳排序用 `timestamp`。我一开始写的 `{ property: "Created" }` 报错，改成 `{ timestamp: "created_time" }` 才对。

### Integration 权限不自动继承子页面

通过 API 在一个共享页面下创建的数据库，Integration 权限会自动继承。但如果是在 UI 里手动建的子页面，需要单独添加连接。

### 跨项目上下文污染防治

MEMORY.md 有 200 行限制，Claude 每次会话都会读。如果把 Notion 里所有记忆都拉下来，一个前端项目里塞满了 VPS 配置和博客发布的记忆，纯属噪音。

解决方案是 `--type` 过滤：

```bash
# 本项目：拉全部（自己的项目）
node scripts/notion-sync.mjs memory

# 其他项目：只拉通用记忆
node scripts/notion-sync.mjs memory --type "user,feedback"
```

Memory 数据库里每条记忆有 Type 字段（user/feedback/project/reference），`user` 和 `feedback` 是跨项目通用的（你的偏好、你纠正过的行为），`project` 和 `reference` 是项目相关的。跨项目只拉前两种就够了。

另外脚本还会在 MEMORY.md 超过 160 行（80%）时自动警告，提醒你该用过滤了。

## 完整链路

最终跑通的链路：

```
手机 Notion Inbox                    电脑 Claude Code
       │                                    │
       │  /notion-sync inbox                │  /notion-sync push
       ▼                                    ▼
raw/articles/*.md                    Notion Memory (云端)
       │                                    │
       │  /compile                          │  /notion-sync memory
       ▼                                    ▼
wiki/ (摘要+概念)                    MEMORY.md (轻量索引，按需 MCP 查询)
       │
       │  /blog → /publish
       ▼
博客站上线
```

全程命令行操作，没有手动复制粘贴。

## 总结

这次做的事情不复杂，但解决了两个实际痛点：**移动端输入**和**跨设备记忆**。

关键的设计决策：
- Notion 只做输入口和中转站，不做主存储
- Memory 不拉全文，只存一行索引到 MEMORY.md，详情通过 Notion MCP 按需查询
- `--type` 过滤机制防止跨项目上下文污染
- MEMORY.md 行数监控，超限自动提醒

另外装了官方 Notion MCP Server，Claude 可以在对话中直接读写 Notion，配合轻量索引实现"索引本地、详情云端"的分层架构。

---
title: 手机遥控 Claude Code：cc-connect + Telegram 搭建指南
date: '2026-04-23'
description: 用 cc-connect 把 Claude Code 桥接到 Telegram，实现手机随时随地给本地项目下指令、看结果、管理会话，5 分钟搞定。
category: AI 工具
tags:
  - Claude Code
  - Telegram
  - 远程开发
  - 自动化
source: vault
summary: 用 cc-connect 把 Claude Code 桥接到 Telegram，实现手机随时随地给本地项目下指令、看结果、管理会话，5 分钟搞定。
---

# 手机遥控 Claude Code：cc-connect + Telegram 搭建指南

Claude Code 很强，但有个限制——**只能在电脑终端里用**。出门在外想让它帮忙改个文件、跑个命令、问个问题，只能等回到电脑前。

之前我用 Notion 解决了「手机往知识库写入」的问题，但那只是单向的内容输入。这次要解决的是：**手机上直接跟 Claude Code 对话，它能读文件、改代码、跑终端命令，跟坐在电脑前一模一样**。

## 方案选型

调研了一圈现有方案：

| 方案 | 原理 | 优缺点 |
|------|------|--------|
| SSH + tmux | 手机终端 SSH 回电脑 | 能用但打字体验差 |
| claude.ai/code | 官方 Web 版 | 不一定连得上本地项目 |
| Anthropic Channels | 官方 Telegram 插件 | 还在 preview，功能有限 |
| **cc-connect** | 本地桥接进程 | 多平台、会话管理、开箱即用 |

最终选了 [cc-connect](https://github.com/chenhg5/cc-connect)。它是一个本地运行的桥接进程，把 Claude Code 的输入输出转发到 Telegram（也支持飞书、钉钉、Discord、微信等）。核心架构很简单：

```
手机 Telegram ──→ cc-connect (本地进程) ──→ Claude Code (子进程)
     ↑                                           │
     └───────────── 结果回传 ←──────────────────┘
```

不需要公网 IP，不需要部署服务器——cc-connect 用 Telegram 的 Long Polling 模式，主动去拉消息。

## 搭建过程

### 1. 安装 cc-connect

```bash
npm install -g cc-connect
```

验证：

```bash
cc-connect --version
# cc-connect v1.3.2
```

也可以用 `brew install cc-connect` 或者从 [GitHub Releases](https://github.com/chenhg5/cc-connect/releases) 下载二进制。

### 2. 创建 Telegram Bot

1. 打开 Telegram，搜索 **@BotFather**
2. 发送 `/newbot`
3. 设置 bot 名称和用户名（用户名必须以 `bot` 结尾）
4. 复制 Bot Token

整个过程 30 秒。

### 3. 写配置文件

```bash
mkdir -p ~/.cc-connect
```

创建 `~/.cc-connect/config.toml`：

```toml
language = "zh"

[log]
level = "info"

[[projects]]
name = "my-project"

[projects.agent]
type = "claudecode"

[projects.agent.options]
work_dir = "/path/to/your/project"
mode = "auto"

[[projects.platforms]]
type = "telegram"

[projects.platforms.options]
token = "<your-bot-token>"
```

几个关键配置说明：

| 字段 | 说明 |
|------|------|
| `work_dir` | Claude Code 的工作目录，就是你的项目路径 |
| `mode` | 权限模式：`default`（每次确认）、`auto`（自动批准大部分）、`yolo`（全自动） |
| `language` | 界面语言，`zh` 中文 |

### 4. 启动

```bash
cc-connect
```

看到这些日志就说明连上了：

```
level=INFO msg="telegram: connected" bot=yourBotName
level=INFO msg="platform ready" project=my-project platform=telegram
level=INFO msg="cc-connect is running" projects=1
```

然后打开 Telegram 给你的 bot 发条消息，试试效果。

## 踩坑：国内网络

在国内直接连 `api.telegram.org` 会超时。解决办法是启动时指定代理：

```bash
https_proxy=http://127.0.0.1:7890 http_proxy=http://127.0.0.1:7890 cc-connect
```

端口号换成你自己代理的端口（Clash 默认 7890）。

如果用 daemon 模式后台运行，需要在 systemd/launchd 配置里加环境变量，或者直接在 shell profile 里 export。

## 另一个坑：Claude Code 会话内启动

如果你是在 Claude Code 会话里安装和配置的 cc-connect，**不能在同一个终端启动它**。因为 Claude Code 会设置 `CLAUDECODE` 环境变量，cc-connect 检测到后会拒绝启动子进程（避免嵌套）。

解决办法：

```bash
# 方式一：unset 环境变量
unset CLAUDECODE && cc-connect

# 方式二：开一个新终端窗口直接跑
cc-connect
```

## 会话管理

cc-connect 不是接入当前终端会话，而是**启动独立的 Claude Code 子进程**。每个 Telegram 对话是一个独立会话，跟你电脑上开的 Claude Code 互不干扰，但操作的是同一个项目目录。

常用 Telegram 命令：

| 命令 | 作用 |
|------|------|
| `/new [名称]` | 开新会话 |
| `/list` | 列出所有会话 |
| `/switch <id>` | 切换到某个会话 |
| `/current` | 查看当前会话 |
| `/stop` | 中断当前执行 |
| `/mode [name]` | 切换权限模式 |
| `allow` / `allow all` | 批准工具权限 |

## 多项目管理

如果你有多个项目，在 `config.toml` 里追加 `[[projects]]` 块就行。每个项目需要一个独立的 Telegram bot：

```toml
# 项目 A
[[projects]]
name = "knowledge-vault"
# ...bot A 的配置

# 项目 B
[[projects]]
name = "web-app"
# ...bot B 的配置
```

**给哪个 bot 发消息，就操作哪个项目**，不需要切换。

## 后台常驻

不想每次手动启动，可以用 daemon 模式：

```bash
cc-connect daemon install --config ~/.cc-connect/config.toml
cc-connect daemon start
```

macOS 上会注册为 LaunchAgent，开机自动启动。管理命令：

```bash
cc-connect daemon status    # 查看状态
cc-connect daemon logs -f   # 跟踪日志
cc-connect daemon stop      # 停止
cc-connect daemon uninstall # 卸载
```

## 安全建议

默认配置下任何人都能给你的 bot 发消息触发 Claude Code，建议加上白名单：

```toml
[[projects.platforms]]
type = "telegram"

[projects.platforms.options]
token = "<your-bot-token>"
allow_from = "你的TelegramUserID"
admin_from = "你的TelegramUserID"
```

`allow_from` 限制谁能用，`admin_from` 限制谁能执行管理命令。Telegram User ID 可以通过给 bot 发消息后在 cc-connect 日志里看到。

## 完整链路

加上之前的 Notion 通道，现在手机到本地项目有两条路：

```
手机
├── Notion Inbox    → /notion-sync → raw/ → /compile → wiki/
│   (异步写入，适合收藏资料)
│
└── Telegram Bot    → cc-connect → Claude Code
    (实时对话，适合改代码、跑命令、问问题)
```

两条路互补：Notion 负责轻量输入和资料收藏，Telegram 负责重度交互和代码操作。

## 总结

cc-connect 解决的问题很明确——**把 Claude Code 从电脑终端解放出来**。5 分钟安装配置，之后手机就是你的远程终端。

几个关键点：
- 本地运行，不需要公网 IP 和服务器
- Telegram Long Polling，国内加个代理就能用
- 独立会话，不影响电脑上的 Claude Code
- 一个 bot 对应一个项目，多项目天然隔离
- 支持后台常驻，开机自启

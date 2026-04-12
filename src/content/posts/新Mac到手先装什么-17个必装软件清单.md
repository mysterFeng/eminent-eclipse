---
title: 2026 年我的 Mac 工具箱：开发者视角的装机方案
date: '2026-04-08'
description: 从开发者和内容创作者的角度整理 Mac 装机方案，不只推荐软件，更讲选择逻辑和工具链搭配。
category: AI 工具
tags:
  - mac
  - 工具
  - 效率
  - 开发环境
source: vault
summary: 从开发者和内容创作者的角度整理 Mac 装机方案，不只推荐软件，更讲选择逻辑和工具链搭配。
---

# 2026 年我的 Mac 工具箱：开发者视角的装机方案

最近看到一份 Mac 软件清单，17 个品类每个都给了推荐和免费替代，还附了 brew 一键安装命令。整理得很实用，但我更想从自己的使用经验出发，聊聊每个品类的选择逻辑——不只是"装什么"，还有"为什么选这个"和"我踩过什么坑"。

## 2026 年最大的变化：终端成了主战场

先说一个趋势判断。

两年前我的工作流是：VS Code 写代码 → 终端跑命令 → 浏览器看效果。编辑器是绝对的中心。

现在变了。Claude Code 出来之后，我大部分时间在终端里跟 AI 对话——需求描述、代码生成、测试运行、文件操作全在终端完成。编辑器变成了偶尔查看文件结构的辅助工具。

这个变化直接影响了我的软件优先级：终端体验 > 编辑器体验。

## 第一层：基础设施（装完这些才装别的）

**Homebrew** 不用多说，Mac 软件管理的事实标准。所有能用 `brew install --cask` 装的就不手动下载 dmg。好处是统一管理、一条命令批量安装、重装系统恢复快。

**Raycast** 替代系统自带的 Spotlight。启动应用、剪贴板历史、窗口管理、计算器、翻译——全部一个快捷键搞定。我之前用过 Alfred，对比下来 Raycast 免费版覆盖了 Alfred 付费版绝大部分功能。**省了一笔 Alfred Powerpack 的钱**，功能上没有明显缺失。

```bash
brew install --cask raycast
```

## 第二层：开发核心

**Ghostty（终端）**——GPU 渲染，启动快，字体渲染清晰。配置文件是纯文本，比 iTerm2 的 plist 格式好维护得多。之前从 iTerm2 切过来，适应期大概半天，没什么迁移成本。

```bash
brew install --cask ghostty
```

**Claude Code（AI 编程）**——目前的主力开发工具，Pro 版 $20/月起步。我用它搭了一套完整的内容创作自动化流程（`/ingest` 抓文章、`/compile` 编译知识库、`/blog` 生成博客），日常开发效率提升非常明显。缺点是 Max 套餐很贵，重度使用一个月 $100-200。

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**ClaudeBar（额度监控）**——菜单栏实时显示 Claude Code 剩余额度。用 Max 套餐的话这个是刚需——不然总得登网页查还剩多少，很打断心流。免费。

```bash
brew install --cask claudebar
```

**VS Code / GoLand（编辑器）**——我写 Go 用 GoLand，其他用 VS Code。但说实话，编辑器的打开频率在持续下降。如果你不需要特定语言的深度 IDE 支持，VS Code 一个就够了。

```bash
brew install --cask visual-studio-code
```

## 第三层：内容创作

**Obsidian（笔记 + 知识库）**——本地 Markdown 文件，数据在自己手里，插件生态强大。我用它配合 Claude Code 搭了从选题到多平台发布的全链路。关键不是 Obsidian 本身多好用，而是 Markdown + 本地文件这个模式跟 Claude Code 完美兼容——AI 能直接读写你的笔记文件。

```bash
brew install --cask obsidian
```

**CleanShot X（截图）**——这是我 Mac 上少数觉得"付费完全值"的软件。截图、标注、滚动截图、GIF 录制、OCR、历史截图一个 app 搞定。之前在 Windows 上用 Snipaste（免费，截图贴图很好用），切 Mac 之后 CleanShot X 是全方位的上位替代。免费方案的话 Snipaste 也有 Mac 版，日常截图够用。

**Screen Studio（录屏）**——$108/年，自动加动效和鼠标追踪，录完直接能发。适合做技术演示和产品 Demo。如果只是偶尔录屏，OBS 免费且功能更全，但后期需要自己剪辑。

**语音输入**——试过 Typeless（付费）和豆包输入法（免费），最后主力是豆包。免费，识别准确，按住说话自动转文字。写长文的时候先语音输入一个草稿再改，比从零打字快很多。

## 第四层：日常效率

**Arc（浏览器）**——竖向标签页 + Space 分组的设计确实解决了"100 个 tab 找不到谁"的问题。不过有个隐忧：The Browser Company 最近重心转向了新产品 Dia，Arc 的长期维护节奏可能会变。目前还在用，但开始关注备选方案。

**Keka（压缩）**——免费，支持所有格式，右键用，不弹广告。这类工具没什么好纠结的。

**Bob（翻译 + OCR）**——App Store 约 ¥30。划词翻译、截图 OCR、输入翻译三种模式。免费替代 Easydict 日常翻译够用，但 OCR 准确度有差距。

**IINA（视频播放）**——免费开源，Mac 原生设计风格，所有格式通吃。

**Bartender（菜单栏管理）**——装的软件多了菜单栏会很乱，Bartender 折叠不常用的图标。免费替代 iBar 够用。

**滴答清单（待办）**——免费版够用，跨平台同步。

## 一键安装

新机装完 Homebrew 之后，一条命令把核心免费工具全装上：

```bash
brew install --cask arc raycast keka iina ghostty obsidian visual-studio-code easydict snipaste claudebar
```

然后按需加付费的（CleanShot X、Screen Studio、Bob 等）。十分钟进入工作状态。

## 我的选择逻辑

总结几条原则：

1. **能 brew 装的不手动下**——统一管理，重装可恢复
2. **免费优先，付费补位**——大部分品类免费方案够用，只在有明显差距的地方花钱
3. **跟着工作流走**——AI 编程兴起后，终端和 CLI 工具权重上升，GUI 编辑器权重下降。工具选择要跟上使用习惯的变化
4. **一个问题一个工具**——不追求全能 app，专注工具组合起来比全家桶灵活

这份清单是我 2026 年 4 月的状态。AI 工具变化很快，半年后可能就不一样了。

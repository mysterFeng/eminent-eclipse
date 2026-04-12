---
title: 从 Copilot 到 CTO：拆解 GStack 的 AI 团队编程模式
date: '2026-04-08'
description: YC CEO 开源的 gstack 用 23 个 AI 角色组成虚拟开发团队。拆解它的核心设计，分析哪些思路值得借鉴。
category: AI 工具
tags:
  - ai-coding
  - claude-code
  - gstack
  - 工具
source: vault
summary: YC CEO 开源的 gstack 用 23 个 AI 角色组成虚拟开发团队。拆解它的核心设计，分析哪些思路值得借鉴。
---

# 从 Copilot 到 CTO：拆解 GStack 的 AI 团队编程模式

YC 现任 CEO Garry Tan 开源了一个叫 gstack 的项目，三周拿了六万多 Star。我花了点时间研究了一下，发现它和目前主流的 AI 编程工具走了一条完全不同的路。

## gstack 是什么

一句话概括：**一套跑在 Claude Code 上的 AI 编程工作流，用 23 个专职角色组成虚拟开发团队。**

不是一个 app，不需要额外安装什么服务端。它本质上是一组 Claude Code 的 slash command（自定义命令），每个命令背后对应一个有明确角色定义的 AI 代理。安装就是把仓库 clone 到 skills 目录：

```bash
git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
```

之后在 Claude Code 里就能用 `/plan-ceo-review`、`/qa`、`/ship` 这些命令了。

## 核心设计：角色分离 + 流水线串联

gstack 的角色大致分三类：

**规划类**——帮你想清楚做什么：
- `/office-hours` 模拟 YC Office Hours，用 6 个问题挑战你的假设，输出实现方案
- `/plan-ceo-review` 从产品角度审视方向，找 10 倍机会
- `/plan-eng-review` 锁定架构，画数据流，列出边界条件和测试矩阵
- `/plan-design-review` 对设计打分，专门检测 AI 生成代码常见的设计"泡沫"

**执行类**——帮你把事情做出来：
- `/review` Staff Engineer 级别代码审查，能自动修的直接修
- `/qa` 用 Playwright 控制真实浏览器跑端到端测试
- `/cso` 安全审计，OWASP Top 10 + STRIDE 威胁建模
- `/ship` 跑测试、审覆盖率、push、开 PR 一条龙

**辅助类**——维护长期质量：
- `/learn` 跨会话记忆项目经验
- `/retro` 周维度回顾，跨项目跨工具统计产出
- `/document-release` 发布时自动同步 README 等文档

但单看角色列表，其实跟市面上很多 prompt 模板集合没有本质区别。gstack 真正不同的地方在于**它把角色串成了流水线**：

```
Think → Plan → Build → Review → Test → Ship → Reflect
```

每个环节自动读取上一个环节的输出。`/plan-eng-review` 产出的测试矩阵，`/qa` 会拿来执行；`/review` 发现的 bug，`/ship` 时会验证是否已修复。上下文在环节间自动传递，不会断。

据 Garry Tan 说，他配合编排工具 Conductor 同时跑 10 到 15 个 Sprint，每个在独立工作区里——这在没有流水线保障的情况下是不可能的。

## /qa：我最感兴趣的部分

gstack 里最让我眼前一亮的是浏览器测试。`/qa` 不是做静态分析或者生成单元测试，而是用 Playwright 控制一个真实的 Chrome 浏览器——点按钮、填表单、跳转页面、截图对比。发现 bug 之后自动改代码，然后生成回归测试防复发。

`/browse` 的 connect 模式更直观：启动你本地的 Chrome，浏览器顶部有绿色微光标记哪个窗口在被 AI 控制，你能实时看到每一步操作。

Garry Tan 提到这个能力让他从 6 个并行任务扩展到了 12 个——因为测试环节不用人盯了。

## 其他值得注意的设计

**交叉模型审查**：`/codex` 命令调用 OpenAI Codex 对同一段代码做独立审查，然后跟 Claude 的结果对比。两个模型都报的问题大概率是真 bug，只有一个模型报的值得额外关注。gstack 不绑定单一 AI，还兼容 Gemini CLI 和 Cursor。

**安全护栏**：`/careful` 拦截 `rm -rf`、`DROP TABLE` 等破坏性命令；`/freeze` 把编辑范围锁死在一个目录；`/guard` 两个一起开。对于并行跑多个 AI 的场景，这些不是可选项，是必要的。

**品味记忆**：`/design-shotgun` 生成多个设计变体让你选，还会记住你的审美偏好。这个细节很有意思——AI 不只在学你的代码风格，还在学你的审美。

## 一些数据背景

- 据 Garry Tan 说，过去 60 天用 gstack 写了 60 万行以上生产代码，35% 是测试
- 三周从 v0.1 迭代到 v0.15，734 个 PR
- MIT 协议，遥测默认关闭，无付费版

不过 60 万行代码的"质量"和"可维护性"是另一个问题。每天一两万行的速度，人工审查是不可能跟上的，最终还是得靠 AI 审 AI。

## 跟我现有工作流的关系

我目前用 Claude Code 搭了一套知识库编译流水线（`/ingest` → `/compile` → `/blog`）。对比 gstack 之后有几个想法：

**流水线传递这个思路我已经在用了**，但 gstack 做得更彻底。我的 `/compile` 是从 raw 到 wiki 的单向流，gstack 是多角色之间的双向传递。我可以考虑在编译流程里加一个"审查"环节——编译完之后自动检查摘要质量和概念提取的准确性。

**角色分离值得借鉴**。我现在让 Claude Code 同时负责"生成"和"审查"，效果有时候不稳定。如果把审查单独拆成一个有明确标准的角色命令，输出质量应该更可控。比如写完博客后，用一个 `/review-blog` 专门检查原创性、技术准确性、脱敏是否完整。

**浏览器测试我目前用不上**，但思路很好——AI 做你懒得做但应该做的事，ROI 可能比"AI 帮你写代码"更高。

**交叉审查可以小范围试**。涉及安全或数据的关键代码，花两倍 token 让不同模型各审一遍，用模型差异提高可信度。

## 总结

gstack 的核心洞察不复杂：**把 AI 从"一个助手"变成"一个团队"，开发者的角色从写代码变成管团队。**

对独立开发者来说，这意味着你不需要真的雇人也能有代码审查、安全审计、自动化测试这些原本需要团队才有的能力。

当然，23 个角色对我的项目规模来说太重了。但里面几个设计思路——角色分离、流水线传递、交叉审查、安全护栏——是通用的，可以按需吸收到自己的工作流里。后面找个实际项目跑一遍再写实测。

---
title: "Cloudflare Pages 部署"
description: "记录 Astro 静态站点在 Cloudflare Pages 上的正确部署流程，并补充常见方案对比。"
date: "2026-02-06"
category: "部署"
tags: ["静态网站部署"]
author: "JJ"
summary: "梳理 Pages 与 Workers 的差别，给出正确配置与常见错误的解决方案。"
featured: false
draft: false
---

这篇记录一次真实的部署排错过程：同样的静态站点，在 Cloudflare 上走了错误的入口会导致部署失败。核心问题不在代码，而在“项目类型”和“部署流程”是否匹配。

## 1. 现象：构建成功但部署失败

构建日志显示 `npm run build` 正常完成，`dist` 目录也生成了静态文件，但随后出现错误：

- 报错提示：**Missing entry-point to Worker script or to assets directory**
- 日志出现 `wrangler deploy`

这说明平台在用 **Workers** 的方式部署，而不是 **Pages** 的静态站点流程。

## 2. 根因：把 Pages 当成 Workers 部署

Cloudflare 有两个不同产品：

- **Pages**：静态网站托管  
- **Workers**：运行后端脚本/边缘函数

当你在 Pages 配置里填了 `Deploy command`，系统会走 Workers 的流程并调用 `wrangler deploy`。  
而静态站点并不需要这个步骤。

## 3. 正确的 Pages 配置

在 Cloudflare Pages 项目里，只需要以下配置：

- **Build command**：`npm run build`  
- **Build output directory**：`dist`  
- **Deploy command**：留空

一旦 `Deploy command` 为空，系统就会直接发布 `dist` 目录的静态内容。

## 4. 正确的创建路径

为了避免进入错误界面，推荐直接新建 Pages 项目：

1. Cloudflare → Pages → Create a project  
2. Connect to Git → 选择 GitHub 仓库  
3. 填写构建参数（build/output）  
4. 保存并部署

这样创建的项目不会要求你填写 Deploy command。

## 5. 如果必须走 Workers 流程（不推荐）

只有当你确实要用 Workers 托管静态资源时，才需要配置：

```
npx wrangler deploy --assets=./dist
```

并且需要额外的 `wrangler.jsonc` 配置。这对纯静态站点来说是多余的。

## 6. 其他部署方案对比（优缺点）

如果你希望“国内可访问 + 低成本”，下面是常见选择的优缺点：

1) **Cloudflare Pages**  
- 优点：免费额度高、部署简单、全球节点  
- 缺点：国内访问速度受网络影响，稳定性不如国内平台

2) **GitHub Pages**  
- 优点：免费、与 GitHub 集成顺畅  
- 缺点：国内偶尔不稳定，构建能力有限

3) **国内云厂商静态托管（阿里/腾讯/华为）**  
- 优点：国内访问稳定、带 CDN  
- 缺点：通常需要备案；部分服务非免费

4) **自建服务器（Nginx）**  
- 优点：可控性最高、性能稳定  
- 缺点：需要运维与备案成本

如果你只想快速上线，优先选 Cloudflare Pages；  
若目标是国内稳定访问，建议国内云厂商或自建服务器。

## 7. 最后确认点

部署成功后，可以在构建日志中看到以下信息：

- `output: "static"`  
- `directory: /opt/buildhome/repo/dist/`  
- `✓ Completed`  
- 页面路由正常生成

如果日志还出现 `wrangler deploy`，说明仍在走 Workers 流程，需要回到配置检查。

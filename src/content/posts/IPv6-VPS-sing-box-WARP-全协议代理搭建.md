---
title: IPv6-only VPS 搭建全协议代理：sing-box + Cloudflare WARP 实战
date: '2026-04-06'
description: IPv6-only VPS 通过 Cloudflare WARP 获取 IPv4 出口，sing-box 分发五种代理协议的完整搭建教程
category: 网络运维
tags:
  - VPS
  - sing-box
  - Cloudflare WARP
  - 代理
  - IPv6
source: vault
summary: 在只有 IPv6 的 VPS 上通过 sing-box + WARP 实现 IPv4 出口，部署 VLESS、VMess、Hysteria2、TUIC、Shadowsocks 五种协议。
---

# IPv6-only VPS 搭建全协议代理：sing-box + Cloudflare WARP 实战

买了台便宜的 IPv6-only VPS，结果发现 GitHub、Docker Hub 这些服务根本不支持 IPv6，等于半残。折腾了一番，用 Cloudflare WARP 做 IPv4 出口，sing-box 做协议分发，最终跑通了五种代理协议。记录一下完整方案。

## 问题：IPv6-only 的尴尬

VPS 是 Ubuntu 22.04，只分配了 IPv6 地址。直接后果：

- `curl github.com` → 超时
- `apt update` 部分源挂掉（很多镜像还没上 IPv6）
- 基本上只有 Cloudflare 和 Google 的服务能正常访问

核心需求：**给这台机器一个 IPv4 出口**，同时在上面跑代理服务。

## 方案：WARP 提供 IPv4，sing-box 做分发

整体架构很简单：

```
客户端 → sing-box (多协议入站) → WARP SOCKS5 代理 → IPv4 互联网
```

### 第一步：安装 Cloudflare WARP

WARP 官方支持 Linux，安装后以 proxy 模式运行，在本地开一个 SOCKS5 端口：

```bash
# 安装 WARP（官方源）
curl -fsSL https://pkg.cloudflareclient.com/pubkey.gpg | gpg --dearmor -o /usr/share/keyrings/cloudflare-warp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-warp-archive-keyring.gpg] https://pkg.cloudflareclient.com/ $(lsb_release -cs) main" > /etc/apt/sources.list.d/cloudflare-client.list
apt update && apt install cloudflare-warp

# 注册并设置为 proxy 模式
warp-cli register
warp-cli set-mode proxy  # 不接管系统全局网络，只开 SOCKS5 端口
warp-cli connect
```

连接成功后，WARP 会在 `127.0.0.1:40000` 开一个 SOCKS5 代理。验证一下：

```bash
curl --proxy socks5://127.0.0.1:40000 https://ipinfo.io
# 应该返回 Cloudflare 的 IPv4 地址
```

用 systemd 管理（`warp-svc`），开机自启。

### 第二步：配置 sing-box

sing-box 负责接收客户端连接，然后把流量转发给 WARP。核心配置思路：

```json
{
  "outbounds": [
    {
      "tag": "warp-out",
      "type": "socks",
      "server": "127.0.0.1",
      "server_port": 40000
    }
  ],
  "dns": {
    "servers": [
      {
        "address": "tls://[2606:4700:4700::1111]",  // Cloudflare DoT，走 IPv6 直连
        "tag": "cloudflare"
      }
    ]
  }
}
```

关键点：
- **DNS 必须走 IPv6**：VPS 本身没有 IPv4，DNS 查询不能走 WARP（鸡生蛋问题），所以用 Cloudflare 的 IPv6 DoT 地址
- **所有出站流量走 `warp-out`**：通过 SOCKS5 转发给 WARP 获取 IPv4 能力

### 第三步：部署多协议入站

根据不同场景配了五种协议：

| 协议 | 用途 | 特点 |
|------|------|------|
| VLESS-Reality | 主力日常使用 | 伪装 TLS 握手，最难被识别 |
| VMess-WS | 套 CDN 使用 | 走 WebSocket + Nginx 反代 + Argo Tunnel |
| Hysteria2 | 高速下载/视频 | 基于 QUIC，UDP 传输，速度快 |
| TUIC | 备用 UDP 协议 | 类似 Hysteria2 的替代方案 |
| Shadowsocks | 兼容老客户端 | 简单稳定 |

端口分配示例：

```
VLESS-Reality  → TCP :9811
VMess-WS       → TCP :8001 → Nginx :9812 → Argo Tunnel
Hysteria2      → UDP :9814
TUIC           → UDP :9813
Shadowsocks    → TCP :8388
```

VMess-WS 那条链路稍微复杂一点：客户端连 Cloudflare CDN → Argo Tunnel → Nginx → sing-box，好处是 IP 完全隐藏在 CDN 后面。

### 第四步：备用通道

装了 Tailscale 作为 SSH 的备用通道。万一 sing-box 配置改挂了连不上，还能通过 Tailscale 的内网 IP 登进去救场。

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up --ssh  # 开启 Tailscale SSH
```

## 踩坑记录

1. **WARP 注册失败**：IPv6-only 环境下 `warp-cli register` 可能超时，需要确保 Cloudflare 的 IPv6 端点可达。实测 `engage.cloudflareclient.com` 支持 IPv6。

2. **DNS 死循环**：最初把 DNS 也配成走 WARP 出站，结果 WARP 本身需要 DNS 来连接 Cloudflare 端点 → 死循环。解决方案：DNS 走 IPv6 直连。

3. **Hysteria2/TUIC 的 UDP 端口**：部分 VPS 商默认防火墙不开 UDP，需要手动放行。

## 总结

IPv6-only VPS + WARP 这个组合成本很低（VPS 便宜，WARP 免费），唯一的代价是多一跳延迟。实际体验下来 VLESS-Reality 延迟增加大概 10-20ms，Hysteria2 因为 UDP 多路复用反而感觉不明显。

这套方案的核心思路——**用免费隧道弥补网络缺陷**——其实可以推广到很多场景，比如没有公网 IP 的家庭服务器。

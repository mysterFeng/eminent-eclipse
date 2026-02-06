---
title: "Flutter WebView 组件"
description: "基于 flutter_inappwebview 的 WebView 组件封装与安全配置。"
date: "2025-02-11"
category: "Flutter"
tags: ["组件"]
author: "JJ"
summary: "给出可复用的 WebView 封装：加载状态、导航拦截、JS 交互与平台配置。"
featured: false
---

WebView 是高频又敏感的组件，封装的目标是：**统一交互、统一安全策略**。下面以 **flutter_inappwebview** 给出可落地范式。

## 0. 依赖

```yaml
dependencies:
  flutter_inappwebview: ^6.0.0
```

## 1. 统一 WebView 组件

```dart
class AppWebView extends StatefulWidget {
  final String url;
  const AppWebView({super.key, required this.url});

  @override
  State<AppWebView> createState() => _AppWebViewState();
}

class _AppWebViewState extends State<AppWebView> {
  InAppWebViewController? _controller;
  bool _loading = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('WebView')),
      body: Stack(
        children: [
          InAppWebView(
            initialUrlRequest: URLRequest(url: WebUri(widget.url)),
            onWebViewCreated: (c) => _controller = c,
            onLoadStart: (_, __) => setState(() => _loading = true),
            onLoadStop: (_, __) => setState(() => _loading = false),
            shouldOverrideUrlLoading: (controller, nav) async {
              final uri = nav.request.url;
              if (uri == null) return NavigationActionPolicy.CANCEL;
              return NavigationActionPolicy.ALLOW;
            },
          ),
          if (_loading) const Center(child: CircularProgressIndicator()),
        ],
      ),
    );
  }
}
```

## 2. JS 交互

```dart
_controller?.addJavaScriptHandler(
  handlerName: 'bridge',
  callback: (args) {
    // JS -> Flutter
  },
);

_controller?.evaluateJavascript(source: "window.bridgeReady()");
```

## 3. 平台配置（关键）

Android：如需加载非 HTTPS，配置 `usesCleartextTraffic` 与网络安全策略。  
iOS：如需加载非 HTTPS，配置 `NSAppTransportSecurity`。

## 4. 常用扩展

### 4.1 返回键处理

```dart
WillPopScope(
  onWillPop: () async {
    if (await _controller?.canGoBack() ?? false) {
      _controller?.goBack();
      return false;
    }
    return true;
  },
  child: AppWebView(url: url),
)
```

### 4.2 白名单拦截

```dart
final allowHosts = {'example.com'};
if (!allowHosts.contains(uri.host)) return NavigationActionPolicy.CANCEL;
```

## 5. 常见坑点

- **返回键未处理**：用户体验差
- **HTTP 资源加载失败**：需要平台安全配置
- **JS 通信名不一致**：handlerName 必须统一

## 6. 实践清单

- [ ] 统一封装
- [ ] 加载状态
- [ ] URL 拦截
- [ ] JS 通信

---


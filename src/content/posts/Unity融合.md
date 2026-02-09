---
title: "25. Flutter + Unity 融合"
description: "基于 flutter_unity_widget 的实战流程，讲清初始化、通信、生命周期与性能策略。"
date: "2023-12-07"
category: "Flutter"
tags: ["混合架构"]
author: "JJ"
summary: "从 Flutter 侧接入到 Unity 侧消息处理，给出可直接复用的代码与工程化实践。"
featured: false
---

下面以 **flutter_unity_widget** 为核心交互框架，给出一套可以直接落地的 Flutter + Unity 融合流程。重点讲清三件事：**如何接入、如何通信、如何管理生命周期与性能**。

## 1. 接入方式：推荐 flutter_unity_widget

Flutter 与 Unity 的融合通常有两种方案：

- **平台通道 + 原生桥接**（成本高、维护复杂）
- **flutter_unity_widget**（社区成熟、接入成本低）

本文以 `flutter_unity_widget` 为主：

```yaml
dependencies:
  flutter_unity_widget:
    git:
      url: <your git repo>
      ref: master
```

## 2. Flutter 侧：UnityView + Controller

Flutter 侧的核心是 **UnityWidget** 和 **UnityWidgetController**。

```dart
class UnityPage extends StatefulWidget {
  const UnityPage({super.key});

  @override
  State<UnityPage> createState() => _UnityPageState();
}

class _UnityPageState extends State<UnityPage> {
  UnityWidgetController? _controller;

  void _onUnityCreated(UnityWidgetController controller) {
    _controller = controller;
  }

  void _sendToUnity() {
    final msg = {
      "event": "enterScene",
      "payload": {"sceneId": "world_001"}
    };
    _controller?.postMessage('Bridge', 'onMessage', jsonEncode(msg));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Unity Page')),
      body: UnityWidget(
        onUnityCreated: _onUnityCreated,
        onUnityMessage: (msg) {
          // Unity 回调
          debugPrint('Unity -> Flutter: $msg');
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _sendToUnity,
        child: const Icon(Icons.send),
      ),
    );
  }
}
```

关键点：

- `onUnityCreated` 拿到控制器
- `postMessage` 发送消息到 Unity
- `onUnityMessage` 接收 Unity 回调

## 3. Unity 侧：Bridge 脚本与消息解析

Unity 侧需要一个统一的消息入口（Bridge）：

```csharp
using UnityEngine;

public class Bridge : MonoBehaviour
{
    public void onMessage(string message)
    {
        Debug.Log("Flutter -> Unity: " + message);
        // 解析 JSON
        // 根据 event 执行逻辑
    }

    public void sendToFlutter(string eventName, string payload)
    {
        string msg = "{\"event\":\"" + eventName + "\",\"payload\":" + payload + "}";
        UnityMessageManager.Instance.SendMessageToFlutter(msg);
    }
}
```

重点：

- 所有消息通过 `Bridge` 集中处理
- 返回 Flutter 的消息也统一结构化

## 4. 通信协议：必须统一

建议定义固定格式：

```json
{
  "event": "enterScene",
  "payload": {"sceneId": "world_001"}
}
```

这样 Flutter 与 Unity 都不需要猜参数结构。

## 5. 生命周期管理：避免频繁销毁 Unity

Unity 启动成本高，建议：

- 首次打开时初始化 Unity
- 页面离开时暂停渲染
- 返回时直接恢复

flutter_unity_widget 支持：

```dart
_controller?.pause();
_controller?.resume();
```

## 6. 性能策略：控制 Unity 与 Flutter 并发负载

- Unity 场景内尽量减少动态光影
- Flutter 页面避免复杂动画与 Unity 同时高负载
- 必要时降低 Unity 渲染帧率

## 7. 打包与集成流程（核心步骤）

打包流程的关键是：**让 Unity 输出 Library/工程，再由 Flutter 工程集成并构建**。以下是稳定可复用的流程。

### 7.1 Unity 侧导出

1) 在 Unity 中安装对应导出工具（通常随 `flutter_unity_widget` 提供）  
2) 选择导出类型：
   - **Android**：导出为 `unityLibrary`  
   - **iOS**：导出为 `UnityFramework`  
3) 执行导出脚本，产出 Unity 工程文件（`unityLibrary/` 或 `UnityFramework`）

### 7.2 Flutter 侧接入（Android）

Unity 导出后，会生成 `unityLibrary/`，Flutter 侧需要把它接入到 `android/` 工程。

常见做法：  

- 把 Unity 导出目录放到 Flutter 根目录  
- `android/settings.gradle` 中 include `:unityLibrary`  
- `android/app/build.gradle` 里依赖 `implementation project(':unityLibrary')`

### 7.3 Flutter 侧接入（iOS）

iOS 通常是把 `UnityFramework` 嵌入到 Runner 工程：  

- 将 `UnityFramework.framework` 添加到 `Runner`  
- 确保 `Framework Search Paths` 正确  
- 在 `Podfile` 中添加 Unity 相关配置  

### 7.4 CI / 构建注意点

- Unity 导出产物建议缓存，不要每次 CI 重新导出  
- Android 打包要注意 `minSdkVersion` 与 Unity 一致  
- iOS 打包注意 bitcode、模拟器架构与真机架构切换  

## 8. 实践清单

- [ ] Flutter 侧统一用 `UnityWidgetController`
- [ ] Unity 侧统一 `Bridge` 入口
- [ ] 通信协议固定 JSON 格式
- [ ] 生命周期控制 pause/resume
- [ ] 性能负载分离

## 总结

Flutter + Unity 融合的核心不是“能跑”，而是**可维护**。只要框架选对、通信统一、生命周期可控，再把打包流程固化成脚本或规范，才能让 3D 能力稳定地融入 Flutter 应用。

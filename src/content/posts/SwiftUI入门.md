---
title: "03. SwiftUI 入门"
date: "2021-03-02"
description: "核心状态管理、列表与 UIKit 混用。"
category: "iOS"
tags: ["SwiftUI", "状态", "UI"]
author: "JJ"
draft: false
---

# 03. SwiftUI 入门

SwiftUI 的关键点是：状态驱动 UI、数据单向流动、声明式结构清晰。

## 一、最小页面

```swift
import SwiftUI

struct HomeView: View {
    var body: some View {
        VStack(spacing: 12) {
            Text("Hello SwiftUI")
                .font(.title)
            Button("Tap") {
                print("tap")
            }
        }
        .padding()
    }
}
```

## 二、状态管理

### 1. @State

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("+1") { count += 1 }
        }
    }
}
```

### 2. @StateObject / @ObservedObject

```swift
final class UserVM: ObservableObject {
    @Published var name: String = "JJ"
}

struct ProfileView: View {
    @StateObject private var vm = UserVM()

    var body: some View {
        Text(vm.name)
    }
}
```

## 三、列表与导航

```swift
struct Post: Identifiable {
    let id: Int
    let title: String
}

struct ListView: View {
    let items = [Post(id: 1, title: "A"), Post(id: 2, title: "B")]

    var body: some View {
        NavigationView {
            List(items) { item in
                NavigationLink(item.title) {
                    Text("Detail \(item.id)")
                }
            }
            .navigationTitle("Posts")
        }
    }
}
```

## 四、UIKit 混用

### 1. SwiftUI 嵌入 UIKit

```swift
let vc = UIHostingController(rootView: HomeView())
```

### 2. UIKit 组件包一层

```swift
struct ActivityView: UIViewRepresentable {
    func makeUIView(context: Context) -> UIActivityIndicatorView {
        UIActivityIndicatorView(style: .medium)
    }

    func updateUIView(_ uiView: UIActivityIndicatorView, context: Context) {
        uiView.startAnimating()
    }
}
```

SwiftUI 适合新页面与轻量功能，核心是把状态管理清楚，再去做复杂 UI。

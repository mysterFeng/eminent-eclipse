---
title: "01. Swift 入门"
date: "2019-04-18"
description: "从语法到 UIKit 基础，建立可上手的 Swift 能力。"
category: "iOS"
tags: ["Swift", "入门", "基础"]
author: "JJ"
draft: false
---

# 01. Swift 入门

Swift 入门的目标是把“语言能力 + iOS 结构”搭起来：能读懂项目、能写出组件、能排查基本问题。按关键知识点逐条梳理如下。

## 一、变量、常量与类型系统

### 1. let / var 与类型推断

- `let` 常量：一旦赋值不可改变
- `var` 变量：允许修改
- Swift 会自动推断类型，但重要场景建议显式声明

```swift
let appName: String = "MyApp"
var count: Int = 0
let price = 9.9 // Double
```

### 2. 类型转换与字符串插值

```swift
let width: Int = 120
let height: Int = 80
let area = width * height
let text = "Area: \(area)" // 字符串插值

let ratio = Double(width) / Double(height)
```

## 二、可选值（Optional）是 Swift 的核心

### 1. 为什么需要 Optional

Swift 不允许 `nil` 直接赋给非可选类型，避免空指针崩溃。

```swift
var nickname: String? = nil
nickname = "JJ"
```

### 2. 解包方式

- `if let`：安全解包
- `guard let`：提前退出，代码更清晰
- `??`：默认值
- `?.`：可选链

```swift
if let name = nickname {
    print("Hello, \(name)")
}

func greet(_ name: String?) {
    guard let name else { return }
    print("Hi, \(name)")
}

let displayName = nickname ?? "Guest"
let length = nickname?.count // 可选链
```

### 3. 常见场景：URL 解析

```swift
let urlString = "https://example.com"
let url = URL(string: urlString)

guard let url else {
    print("invalid url")
    return
}
```

## 三、集合类型：Array / Dictionary / Set

### 1. Array 常用操作

```swift
var numbers = [1, 2, 3]
numbers.append(4)
let first = numbers.first
let doubled = numbers.map { $0 * 2 }
let evens = numbers.filter { $0 % 2 == 0 }
```

### 2. Dictionary 常用操作

```swift
var user = ["name": "JJ", "role": "iOS"]
user["role"] = "iOS Dev"
let name = user["name"] ?? "Unknown"
```

### 3. Set 去重与集合运算

```swift
let a: Set = [1, 2, 3]
let b: Set = [3, 4, 5]
let union = a.union(b)
let intersect = a.intersection(b)
```

## 四、函数与闭包

### 1. 函数参数与返回值

Swift 支持外部参数名、默认值、返回元组。

```swift
func login(user name: String, retry count: Int = 3) -> (success: Bool, message: String) {
    return (true, "ok")
}

let result = login(user: "JJ")
print(result.success)
```

### 2. 闭包与回调

```swift
let numbers = [1, 2, 3]
let squared = numbers.map { n in n * n }
```

### 3. 逃逸闭包（常见于异步）

```swift
func fetch(completion: @escaping (String) -> Void) {
    DispatchQueue.global().async {
        completion("data")
    }
}
```

## 五、结构体与类

### 1. 值类型 vs 引用类型

- `struct`：拷贝传值
- `class`：引用共享

```swift
struct User {
    var name: String
}

class UserStore {
    var users: [User] = []
}

var a = User(name: "A")
var b = a
b.name = "B"
print(a.name) // A（值拷贝）
```

### 2. mutating 与不可变

```swift
struct Counter {
    private(set) var value = 0
    mutating func increase() {
        value += 1
    }
}
```

## 六、枚举与状态建模

### 1. 业务状态用 enum 最清晰

```swift
enum LoadState {
    case idle
    case loading
    case success([String])
    case failure(Error)
}
```

### 2. switch 模式匹配

```swift
func render(state: LoadState) {
    switch state {
    case .idle:
        print("idle")
    case .loading:
        print("loading")
    case .success(let list):
        print(list.count)
    case .failure(let error):
        print(error.localizedDescription)
    }
}
```

## 七、协议与扩展（入门必须会用）

协议是 Swift 代码复用和解耦的基础。

```swift
protocol Cacheable {
    func save()
}

extension Cacheable {
    func save() {
        print("default save")
    }
}

struct LocalCache: Cacheable {}
```

## 八、UIKit 入门：最小页面搭建

### 1. 创建视图与约束

```swift
class HomeVC: UIViewController {
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Hello iOS"
        label.font = .systemFont(ofSize: 20, weight: .bold)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private let actionButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Tap", for: .normal)
        button.translatesAutoresizingMaskIntoConstraints = false
        return button
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        view.addSubview(titleLabel)
        view.addSubview(actionButton)

        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 40),
            actionButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            actionButton.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 20)
        ])

        actionButton.addTarget(self, action: #selector(onTap), for: .touchUpInside)
    }

    @objc private func onTap() {
        print("tap")
    }
}
```

### 2. 生命周期要点

```swift
class DetailVC: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        print("viewDidLoad")
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        print("viewWillAppear")
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        print("viewDidDisappear")
    }
}
```

## 九、常见坑（入门必须避免）

1. 强行解包 `!` 导致崩溃
2. 异步回调不回主线程更新 UI
3. 在 `viewDidLoad` 里做耗时操作
4. Auto Layout 约束不完整导致布局报警
5. 在 Controller 里堆积业务逻辑，后期难维护

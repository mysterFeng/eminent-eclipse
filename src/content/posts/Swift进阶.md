---
title: "02. Swift 进阶"
date: "2019-08-16"
description: "泛型、协议、错误链路与类型擦除的实用写法。"
category: "iOS"
tags: ["Swift", "泛型", "协议"]
author: "JJ"
draft: false
---

# 02. Swift 进阶

Swift 进阶的关键在于：用泛型与协议表达抽象，用错误链路保证可控，用类型擦除避免耦合。

## 一、泛型与约束

```swift
struct Box<T> {
    var value: T
}

func swapTwo<T>(_ a: inout T, _ b: inout T) {
    let temp = a
    a = b
    b = temp
}
```

### 约束类型

```swift
func indexOf<T: Equatable>(_ value: T, in array: [T]) -> Int? {
    for (i, v) in array.enumerated() {
        if v == value { return i }
    }
    return nil
}
```

## 二、协议与关联类型

```swift
protocol Cache {
    associatedtype Item
    func get(_ key: String) -> Item?
    func set(_ item: Item, for key: String)
}

final class MemoryCache<T>: Cache {
    private var map: [String: T] = [:]
    func get(_ key: String) -> T? { map[key] }
    func set(_ item: T, for key: String) { map[key] = item }
}
```

### 协议组合

```swift
protocol Identifiable { var id: Int { get } }
protocol Nameable { var name: String { get } }

typealias UserType = Identifiable & Nameable
```

## 三、错误链路与 Result

```swift
enum APIError: Error {
    case badURL
    case decoding(Error)
}

func decode<T: Decodable>(_ data: Data, as type: T.Type) -> Result<T, APIError> {
    do {
        let value = try JSONDecoder().decode(T.self, from: data)
        return .success(value)
    } catch {
        return .failure(.decoding(error))
    }
}
```

## 四、属性包装器

```swift
@propertyWrapper
struct Clamped {
    private var value: Int
    private let range: ClosedRange<Int>

    init(wrappedValue: Int, _ range: ClosedRange<Int>) {
        self.range = range
        self.value = min(max(wrappedValue, range.lowerBound), range.upperBound)
    }

    var wrappedValue: Int {
        get { value }
        set { value = min(max(newValue, range.lowerBound), range.upperBound) }
    }
}

struct Player {
    @Clamped(0...100) var volume: Int = 50
}
```

## 五、类型擦除

协议带关联类型时不易作为属性使用，需要类型擦除。

```swift
final class AnyCache<T>: Cache {
    private let _get: (String) -> T?
    private let _set: (T, String) -> Void

    init<C: Cache>(_ cache: C) where C.Item == T {
        _get = cache.get
        _set = cache.set
    }

    func get(_ key: String) -> T? { _get(key) }
    func set(_ item: T, for key: String) { _set(item, key) }
}
```

## 六、KeyPath 与动态访问

```swift
struct User {
    let id: Int
    let name: String
}

let users = [User(id: 1, name: "A"), User(id: 2, name: "B")]
let names = users.map(\.name)
```

Swift 进阶能力的核心不是“记住语法”，而是用正确的抽象让代码可复用、可测试、可维护。

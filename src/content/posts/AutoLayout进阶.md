---
title: "04. Auto Layout 进阶"
date: "2018-05-19"
description: "约束优先级、压缩阻力与动态布局实战。"
category: "iOS"
tags: ["AutoLayout", "布局", "UI"]
author: "JJ"
draft: false
---

# 04. Auto Layout 进阶

Auto Layout 进阶的关键是“优先级 + 抗压缩/抱紧 + 动态高度”。只会加约束不够，要能解决冲突和抖动。

## 一、约束优先级

```swift
let width = label.widthAnchor.constraint(equalToConstant: 120)
width.priority = .defaultHigh
width.isActive = true

let minWidth = label.widthAnchor.constraint(greaterThanOrEqualToConstant: 60)
minWidth.priority = .defaultLow
minWidth.isActive = true
```

## 二、抗压缩与抱紧

- `compressionResistance`：抗压缩
- `hugging`：抱紧内容

```swift
label.setContentCompressionResistancePriority(.required, for: .horizontal)
label.setContentHuggingPriority(.defaultHigh, for: .horizontal)
```

常见应用：一行内两个 label，靠优先级决定谁先被压缩。

## 三、动态高度

```swift
tableView.estimatedRowHeight = 88
tableView.rowHeight = UITableView.automaticDimension
```

确保 cell 内约束完整（顶部 + 底部 + 内容约束）才会稳定。

## 四、UIStackView 的正确用法

```swift
let stack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
stack.axis = .vertical
stack.spacing = 6
stack.alignment = .fill
stack.distribution = .fill
```

不要在 stack 的子视图上加相互冲突的约束，否则会报警。

## 五、布局冲突排查

```swift
UIView.setAnimationsEnabled(false)
view.layoutIfNeeded()
UIView.setAnimationsEnabled(true)
```

打开 Xcode 的 Auto Layout 日志，定位冲突约束。

## 六、约束优化建议

- 高度可固定就固定
- 能用 stack 就用 stack
- 复杂布局拆成多个容器

Auto Layout 稳定与否，决定了 UI 是否可维护。

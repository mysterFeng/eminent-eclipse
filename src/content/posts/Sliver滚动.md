---
title: "07. Flutter Sliver 滚动实战"
description: "从 Sliver 体系到缓存策略，解析 Flutter 滚动性能与复杂列表实现。"
date: "2023-06-20"
category: "Flutter"
tags: ["滚动", "列表", "Sliver", "性能"]
author: "JJ"
summary: "深入剖析 Flutter 的滚动渲染机制，掌握 Sliver 组合、缓存与性能优化的关键策略。"
featured: false
---

Flutter 的列表与滚动看似简单，但复杂业务的性能问题几乎都藏在这里。本篇从 Sliver 体系入手，拆解滚动渲染模型、缓存策略与高性能列表实现。

## 1. Sliver 是什么：滚动的真正核心

Flutter 的滚动视图底层都是 Sliver。  
ListView、GridView 只是 Sliver 的封装。

理解 Sliver 的关键：

- Sliver 是“滚动中的 RenderObject”  
- 它决定了在可视区内渲染哪些内容  
- 滚动效率取决于 Sliver 的布局与缓存策略


## 2. 组合能力：为什么 CustomScrollView 是核心武器

CustomScrollView 允许你像搭积木一样组合：

- `SliverAppBar`  
- `SliverList`  
- `SliverGrid`  
- `SliverToBoxAdapter`

这样可以把“复杂页面”拆成多个滚动块，减少单个列表的复杂度。

示例：混合 Sliver 的页面结构

```dart
CustomScrollView(
  slivers: [
    const SliverAppBar(
      pinned: true,
      expandedHeight: 180,
      flexibleSpace: FlexibleSpaceBar(title: Text('Profile')),
    ),
    SliverToBoxAdapter(child: HeaderCard()),
    SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) => PostTile(index: index),
        childCount: 20,
      ),
    ),
  ],
);
```

## 3. 缓存策略：cacheExtent 与渲染边界

滚动性能的关键是：**可视区 + 预渲染区**。

- `cacheExtent` 决定预加载范围  
- 过大：内存与绘制开销增加  
- 过小：滚动时容易掉帧

建议根据页面密度与设备性能调整。

示例：为长列表设置更合理的预渲染范围

```dart
ListView.builder(
  cacheExtent: 800,
  itemBuilder: (context, index) => ItemCard(index: index),
  itemCount: 200,
);
```

## 4. 性能陷阱：你可能正在踩的坑

- 列表项使用 `IntrinsicHeight`  
- 列表内嵌 `Column` + `ListView`  
- item 中执行复杂计算  
- 图片加载无缓存

解决思路：

- item 拆分 + `const`  
- 使用 `ListView.builder`/`SliverList`  
- 计算逻辑提前到数据层  
- 图片使用缓存与占位

## 5. 复杂场景方案：瀑布流/吸顶/混合布局

- 瀑布流：优先使用成熟组件或自定义 Sliver  
- 吸顶：`SliverPersistentHeader`  
- 混合布局：`SliverToBoxAdapter` + `SliverList`


示例：吸顶 Header 的实现

```dart
SliverPersistentHeader(
  pinned: true,
  delegate: _StickyHeaderDelegate(
    minHeight: 56,
    maxHeight: 120,
    child: const HeaderBar(),
  ),
)
```

## 6. 优化清单（可直接执行）

- 列表 item 拆分成小组件  
- 图片预加载与缓存  
- 合理设置 `cacheExtent`  
- 滚动区域减少透明层  
- 滑动性能问题优先看 `Raster` 指标

## 7. 结语：把滚动当成一套系统

滚动性能不是某个 widget 的问题，而是 Sliver 体系 + 缓存策略 + 渲染边界的整体设计。  
当你理解这套系统，就能稳住复杂页面的性能底盘。

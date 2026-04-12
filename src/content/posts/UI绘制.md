---
title: "06. UI 绘制"
date: "2018-07-08"
description: "自绘视图、图层与渲染性能要点。"
category: "iOS"
tags: ["绘制", "Core Graphics", "CALayer"]
author: "myster"
draft: false
---

# 06. UI 绘制

UI 绘制的核心是：理解渲染链路、选择合适的绘制方式、避免无意义的重绘。下面按关键知识点展开。

## 一、渲染链路与重绘时机

- `layoutSubviews` 负责布局
- `draw(_:)` 负责像素绘制
- 调用 `setNeedsLayout` 会触发布局
- 调用 `setNeedsDisplay` 会触发重绘

```swift
final class ScoreView: UIView {
    var score: CGFloat = 0 {
        didSet { setNeedsDisplay() }
    }

    override func draw(_ rect: CGRect) {
        UIColor.systemBlue.setFill()
        let bar = CGRect(x: 0, y: rect.height - 8, width: rect.width * score, height: 8)
        UIBezierPath(rect: bar).fill()
    }
}
```

## 二、最小自绘：路径与填充

```swift
final class BadgeView: UIView {
    override func draw(_ rect: CGRect) {
        let path = UIBezierPath(ovalIn: rect.insetBy(dx: 2, dy: 2))
        UIColor.systemRed.setFill()
        path.fill()
    }
}
```

关键点：不要在 `draw(_:)` 里做 IO 或复杂计算，绘制应尽量“纯计算”。

## 三、文本绘制

```swift
override func draw(_ rect: CGRect) {
    let attrs: [NSAttributedString.Key: Any] = [
        .font: UIFont.systemFont(ofSize: 14, weight: .medium),
        .foregroundColor: UIColor.darkText
    ]
    let text = "Score"
    (text as NSString).draw(in: rect.insetBy(dx: 8, dy: 8), withAttributes: attrs)
}
```

## 四、使用 CAShapeLayer 替代大量自绘

`CAShapeLayer` 由系统管理绘制，性能稳定，动画友好。

```swift
final class RingView: UIView {
    private let ring = CAShapeLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        layer.addSublayer(ring)
        ring.fillColor = UIColor.clear.cgColor
        ring.strokeColor = UIColor.systemGreen.cgColor
        ring.lineWidth = 6
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        let radius = min(bounds.width, bounds.height) / 2 - 6
        let path = UIBezierPath(arcCenter: CGPoint(x: bounds.midX, y: bounds.midY),
                                radius: radius,
                                startAngle: -.pi / 2,
                                endAngle: 1.5 * .pi,
                                clockwise: true)
        ring.path = path.cgPath
    }
}
```

## 五、避免离屏渲染

阴影、蒙版、圆角组合容易触发离屏渲染。常见解决方式：

- 设置 `shadowPath`
- 尽量不用 `masksToBounds` + `shadow`

```swift
final class CardView: UIView {
    override func layoutSubviews() {
        super.layoutSubviews()
        layer.cornerRadius = 12
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOpacity = 0.1
        layer.shadowOffset = CGSize(width: 0, height: 4)
        layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: 12).cgPath
    }
}
```

## 六、预渲染与缓存

当绘制内容不经常变化时，可以预渲染成图片，提高滚动性能。

```swift
func renderBadge(size: CGSize, color: UIColor) -> UIImage {
    let renderer = UIGraphicsImageRenderer(size: size)
    return renderer.image { ctx in
        color.setFill()
        UIBezierPath(ovalIn: CGRect(origin: .zero, size: size)).fill()
    }
}
```

## 七、清晰度与像素密度

- 视图默认 `contentScaleFactor` 跟随屏幕
- 自绘位图时需要注意 scale

```swift
let scale = UIScreen.main.scale
UIGraphicsBeginImageContextWithOptions(size, false, scale)
```

绘制是否稳定，直接决定列表滑动是否流畅。能用图层就不用大量自绘，能复用就不要重复绘制。

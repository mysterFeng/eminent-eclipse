---
title: "18. RxSwift + Moya 登录模板"
date: "2020-04-14"
description: "MVVM 结构、输入校验与网络登录完整流程。"
category: "iOS"
tags: ["RxSwift", "Moya", "MVVM", "登录"]
author: "myster"
draft: false
---

# 18. RxSwift + Moya 登录模板

模板目标：输入校验、点击事件、请求、状态输出全部走响应式链路。

## 一、安装（SPM）

```
https://github.com/ReactiveX/RxSwift
https://github.com/Moya/Moya
```

在 Xcode 添加 Moya 时勾选 `RxMoya` 产品。

## 二、API 定义

```swift
import Moya

enum AuthAPI {
    case login(username: String, password: String)
}

extension AuthAPI: TargetType {
    var baseURL: URL { URL(string: "https://api.example.com")! }
    var path: String { "/login" }
    var method: Moya.Method { .post }
    var task: Task {
        switch self {
        case let .login(u, p):
            return .requestParameters(parameters: ["username": u, "password": p], encoding: JSONEncoding.default)
        }
    }
    var headers: [String : String]? { ["Content-Type": "application/json"] }
    var sampleData: Data { Data() }
}
```

## 三、Service（RxMoya）

```swift
import RxSwift
import Moya

struct Token: Decodable {
    let value: String
}

final class AuthService {
    private let provider = MoyaProvider<AuthAPI>()

    func login(username: String, password: String) -> Single<Token> {
        provider.rx.request(.login(username: username, password: password))
            .filterSuccessfulStatusCodes()
            .map(Token.self)
    }
}
```

## 四、ViewModel（MVVM）

```swift
import RxSwift
import RxCocoa

final class LoginViewModel {
    struct Input {
        let username: Observable<String>
        let password: Observable<String>
        let loginTap: Observable<Void>
    }

    struct Output {
        let canLogin: Observable<Bool>
        let loading: Observable<Bool>
        let success: Observable<Token>
        let error: Observable<Error>
    }

    private let service: AuthService
    private let activity = ActivityIndicator()
    private let errorTracker = PublishSubject<Error>()

    init(service: AuthService) {
        self.service = service
    }

    func transform(_ input: Input) -> Output {
        let canLogin = Observable.combineLatest(input.username, input.password)
            .map { !$0.isEmpty && !$1.isEmpty }
            .distinctUntilChanged()

        let request = input.loginTap
            .withLatestFrom(Observable.combineLatest(input.username, input.password))
            .flatMapLatest { [service, errorTracker, activity] u, p in
                service.login(username: u, password: p)
                    .trackActivity(activity)
                    .do(onError: { errorTracker.onNext($0) })
                    .asObservable()
                    .catch { _ in .empty() }
            }
            .share()

        return Output(
            canLogin: canLogin,
            loading: activity.asObservable(),
            success: request,
            error: errorTracker.asObservable()
        )
    }
}
```

## 五、ActivityIndicator（可直接用）

```swift
import RxSwift
import RxCocoa

final class ActivityIndicator: SharedSequenceConvertibleType {
    typealias SharingStrategy = DriverSharingStrategy
    private let relay = BehaviorRelay(value: 0)

    func trackActivity<O: ObservableConvertibleType>(_ source: O) -> Observable<O.Element> {
        Observable.using({ () -> ActivityToken<O.Element> in
            self.increment()
            return ActivityToken(source: source.asObservable(), disposeAction: self.decrement)
        }) { $0.asObservable() }
    }

    func asSharedSequence() -> SharedSequence<DriverSharingStrategy, Bool> {
        relay.asDriver().map { $0 > 0 }.distinctUntilChanged()
    }

    func asObservable() -> Observable<Bool> {
        relay.asObservable().map { $0 > 0 }.distinctUntilChanged()
    }

    private func increment() { relay.accept(relay.value + 1) }
    private func decrement() { relay.accept(relay.value - 1) }
}

private struct ActivityToken<E>: ObservableConvertibleType, Disposable {
    private let source: Observable<E>
    private let disposeAction: () -> Void

    init(source: Observable<E>, disposeAction: @escaping () -> Void) {
        self.source = source
        self.disposeAction = disposeAction
    }

    func dispose() { disposeAction() }
    func asObservable() -> Observable<E> { source }
}
```

## 六、ViewController 绑定

```swift
import UIKit
import RxSwift
import RxCocoa

final class LoginVC: UIViewController {
    private let username = UITextField()
    private let password = UITextField()
    private let loginButton = UIButton(type: .system)
    private let loadingView = UIActivityIndicatorView(style: .medium)

    private let disposeBag = DisposeBag()
    private let viewModel = LoginViewModel(service: AuthService())

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white

        username.placeholder = "Username"
        password.placeholder = "Password"
        password.isSecureTextEntry = true
        loginButton.setTitle("Login", for: .normal)

        let stack = UIStackView(arrangedSubviews: [username, password, loginButton, loadingView])
        stack.axis = .vertical
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24)
        ])

        let input = LoginViewModel.Input(
            username: username.rx.text.orEmpty.asObservable(),
            password: password.rx.text.orEmpty.asObservable(),
            loginTap: loginButton.rx.tap.asObservable()
        )

        let output = viewModel.transform(input)

        output.canLogin
            .bind(to: loginButton.rx.isEnabled)
            .disposed(by: disposeBag)

        output.loading
            .bind(to: loadingView.rx.isAnimating)
            .disposed(by: disposeBag)

        output.success
            .subscribe(onNext: { token in
                print("token: \(token.value)")
            })
            .disposed(by: disposeBag)

        output.error
            .subscribe(onNext: { error in
                print(error)
            })
            .disposed(by: disposeBag)
    }
}
```

这个模板是完整可运行的登录链路，直接替换 API 地址与 Token 模型即可落地。

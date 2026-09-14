---
title: Vue 3 响应式：从 ref 到 effect 的一条主线
date: 2026-09-14 10:00:00
updated: 2026-09-15
tags: [Vue, 前端, 源码]
categories: [技术, 前端]
cover: /images/covers/vue-reactivity.svg
description: 把 @vue/reactivity 拆到只剩三个角色：被观察的容器、收集依赖的副作用、以及把它们连起来的 activeEffect。理解这条主线之后，ref 和 reactive 的差异就不再是「记住的两个 API」。
sticky: 10
---

网上讲 Vue 响应式的文章大多从 Proxy 讲起，但 Proxy 只是**手段**。真正值得先想清楚的是：
当 `count` 变了，框架凭什么知道该重新跑哪个函数？

答案只有三个角色，先把它们记住，再看实现就不会迷路。

## 三个角色

一次完整的响应式循环里，永远只有这三样东西在互相咬合：

1. **被观察的容器** —— `reactive()` 包出来的 Proxy，或者 `ref()` 里那个 `{ value }`
2. **副作用** —— 一个「现在跑一次，以后还要再跑」的函数，比如组件的 `render`
3. **当前正在执行的副作用** —— 一个模块级的 `activeEffect` 指针

第 3 点是整套机制的枢纽。依赖收集本质上就是：

> 在副作用执行的过程中，任何被读到的属性，都把这个副作用记到自己名下。

### 为什么必须是全局指针

因为「读属性」这个动作（`get` 陷阱）本身没有携带任何上下文。`obj.count` 被读取时，
Proxy 只知道有人读了 `count`，不知道是谁读的。想知道「谁」，只能靠执行期间挂一个全局变量。

这也是为什么依赖收集必须发生在**副作用同步执行**的过程中：

```ts
import { effect } from './mini-reactivity'

const state = reactive({ count: 0 })

// 执行期间 activeEffect 指向这个 effect，
// 于是 state.count 的 get 陷阱会把 effect 记到 count 的依赖集合里
effect(() => {
  console.log(state.count)
})

state.count++ // 触发依赖集合里的 effect 重跑，打印 1
```

### 一个常见的误解

很多人以为「依赖集合挂在对象上」。实际上它挂得更细：**每个属性一个集合**。
`state.count` 和 `state.name` 有各自独立的依赖集合，改其中一个不会惊动另一个。

## 最小实现

去掉调度器、去掉嵌套 effect 栈、去掉 `dirty` 缓存，剩下的骨架大概是这样：

```ts
type EffectFn = () => void

let activeEffect: EffectFn | null = null

// 用 WeakMap 逐层往下挂，避免给业务对象加不可枚举属性
const targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>()

function track(target: object, key: string | symbol) {
  if (!activeEffect) return
  let depsMap = targetMap.get(target)
  if (!depsMap) targetMap.set(target, (depsMap = new Map()))

  let deps = depsMap.get(key)
  if (!deps) depsMap.set(key, (deps = new Set()))

  deps.add(activeEffect)
}

function trigger(target: object, key: string | symbol) {
  const deps = targetMap.get(target)?.get(key)
  if (!deps) return
  // 必须复制一份再遍历：effect 执行过程中可能再次触发同一次依赖修改
  for (const fn of [...deps]) fn()
}

export function effect(fn: EffectFn) {
  const runner = () => {
    activeEffect = runner
    try {
      fn()
    } finally {
      activeEffect = null
    }
  }
  runner()
  return runner
}

export function reactive<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, key, receiver) {
      track(obj, key)
      return Reflect.get(obj, key, receiver)
    },
    set(obj, key, value, receiver) {
      const result = Reflect.set(obj, key, value, receiver)
      trigger(obj, key)
      return result
    },
  })
}
```

三十行不到，核心机制已经完整了。Vue 的真实实现多出来的部分，几乎都花在下面这些「例外情况」上。

## 真实实现多做了什么

### 调度与批量更新

`trigger` 里直接 `fn()` 是同步的：改三次状态就渲染三次。Vue 用 `scheduler` 把副作用
塞进微任务队列，同一轮 tick 内的所有变更合并成一次渲染。

### 嵌套与自触发防护

两个细节缺一不可：

- `effectStack`：嵌套 effect 里内层跑完必须把 `activeEffect` 还原成外层，而不是直接置 `null`
- 触发时把自身从依赖集合里摘掉：否则 effect 内部的写入会把自己再次触发，直接栈溢出

#### 为什么不能直接置 null

内层 effect 执行完如果粗暴地把 `activeEffect = null`，回到外层之后，外层剩余的读取
就全部丢失收集。用一个栈压入 / 弹出才是正确做法。

#### 清理顺序同样重要

摘除自身依赖要放在 `try/finally` 里。effect 内部抛异常时如果不清理，
这个 effect 会永久残留在依赖集合里，之后每次写入都会把它重新唤醒 —— 表现为
「改了数据就报同一个错」，而且堆栈指向的位置和真正的问题毫无关系。

### 惰性与缓存

`computed` 不是「每次都重算的函数」，而是**带缓存的副作用**。它内部维护一个 `dirty` 标记，
只有依赖真的脏了才重算 —— 这就是 `computed` 和普通 getter 的本质区别。

| 特性 | `ref` | `reactive` |
| --- | --- | --- |
| 可包装的值 | 任意类型 | 仅对象 |
| 访问方式 | `.value` | 直接访问 |
| 解构后 | 仍是响应式 | **丢失响应性** |
| 模板中 | 自动解包 | 直接使用 |

## 收尾

把这条主线记住之后，绝大部分响应式相关的 bug 都能归位：

- **「我改了数据但视图没更新」** —— 读的时候没在副作用里，或者根本没被 `track` 到
- **「视图更新了两次」** —— 调度器没生效，同步触发了
- **「解构之后失效」** —— 丢的是 getter 陷阱，不是值本身

先问「谁是副作用、它有没有在依赖收集期间执行」，比直接翻 `Proxy` 的 `handler` 有效得多。

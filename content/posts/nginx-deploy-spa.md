---
title: 用 Nginx 部署纯静态 SPA：一份能长期用的配置
date: 2026-09-05 21:30:00
updated: 2026-09-06
tags: [Nginx, 部署, 运维]
categories: [技术, 运维]
sticky: 5
---

纯静态站点最大的优点是「没有后端可挂」，但前提是 Nginx 配置写对。这份配置我用了很久，
每一段都对应一个踩过的坑。

## 最小可用配置

先看骨架，细节在后面逐段解释。

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name blog.example.com;

    root /srv/blog/current;
    index index.html;

    # 关键：history 模式下，找不到的路径一律回退到 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## history 模式回退

前端路由有两种模式，Nginx 的写法完全不同：

- **hash 模式**（`/#/posts/foo`）—— 井号后面的内容浏览器不会发给服务器，**不需要任何配置**
- **history 模式**（`/posts/foo`）—— 服务器会真的去找 `/posts/foo` 这个文件，必须回退

`try_files $uri $uri/ /index.html` 的语义是：

1. 先找有没有同名文件 → 有就直接返回（静态资源命中）
2. 再找有没有同名目录 → 有就用目录里的 `index.html`
3. 都没有 → 内部重写到 `/index.html`，由前端路由接手

### 一个容易忽略的例外

`try_files` 会把**所有** 404 都变成 200。这对 SEO 不友好：一个不存在的路径应该返回 404，
而不是 200 + 一个「页面不存在」的前端页面。

如果站点将来要做预渲染，记得把真实存在的路由文件优先命中，别让回退逻辑把它盖住。

## 缓存策略

静态站点的性能几乎全由缓存决定。原则只有一条：**带内容指纹的走长缓存，不带的一律不缓存。**

```nginx
# 构建产物带 hash，内容变了文件名就变，可以放心长缓存
location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;
}

# index.html 和搜索索引这类「入口文件」绝不能缓存，
# 否则用户会一直拿到旧的资源引用，发布新版本后页面直接白屏
location = /index.html {
    add_header Cache-Control "no-cache";
}

location = /blog-search-index.json {
    add_header Cache-Control "no-cache";
}
```

### 为什么 `index.html` 不能缓存

这是「发布后白屏」最常见的成因：旧的 `index.html` 引用了旧的 `assets/index-abc123.js`，
而新版本已经把它删掉了。用户浏览器拿缓存里的 HTML，去请求一个不存在的文件，404，白屏。

`no-cache` 不是「不缓存」，而是「每次都用缓存前先回源验证」。这个语义差别很关键 ——
它保留了 304 的带宽优势，又保证了内容最新。

## gzip 与 brotli

```nginx
gzip on;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_vary on;
gzip_types
    text/plain
    text/css
    application/javascript
    application/json
    image/svg+xml;
```

`gzip_vary on` 很容易漏，但它是必需的：它让响应带上 `Vary: Accept-Encoding`，
避免 CDN 把 gzip 版本发给不支持压缩的客户端。

### brotli 值得开吗

值得，但要注意它是**动态模块**，不同发行版的包名不一样：

```bash
# Debian / Ubuntu
sudo apt install -y libnginx-mod-http-brotli

# 检查模块是否已加载
nginx -V 2>&1 | tr ' ' '\n' | grep -i brotli
```

brotli 相比 gzip 通常再省 15% ~ 20%，主要是文本资源。JS 体积大的站点收益明显。

## HTTPS 与自动续期

```bash
sudo certbot --nginx -d blog.example.com --redirect
sudo systemctl list-timers | grep certbot
```

第二行别省 —— 证书自动续期是**自建服务器的头号事故源**。确认 timer 存在，
比相信「装的时候它说会续期」可靠得多。

## 收尾

三句话总结：

1. `try_files` 决定 history 模式能不能用
2. 缓存策略决定发布会不会白屏
3. 证书续期决定半年后站点会不会打不开

其余都是优化，只有这三条是「不做就出事」。

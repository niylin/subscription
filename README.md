# 分享链接订阅管理

Cloudflare Worker 订阅管理面板。面板维护一个或多个来源订阅，抓取远程原始配置后提取节点，并将其转换为通用分享链接文本订阅（V2Ray 系客户端常用的 Base64 订阅格式）。

## 支持的来源

- 纯文本分享链接：`vless://`、`vmess://`、`trojan://`、`ss://`、`hysteria2://`、`tuic://`、`anytls://` 等
- Clash/Mihomo YAML 中的 `proxies`
- sing-box JSON 中的 `outbounds`
- 以 Base64 编码的分享链接文本

当前支持转换 VMess、VLESS、Trojan、Shadowsocks、Hysteria、Hysteria2、TUIC 和 AnyTLS 节点。输出只包含节点 URI，不带模板、路由或策略组。

## 部署与面板

配置 Cloudflare Worker KV 绑定 `CONFIG_KV`，设置 `ADMIN_USER` 和 `ADMIN_PASSWORD`，部署后登录面板。默认订阅地址为 `/sub`，可在配置页修改。

面板只有一个订阅集列表，可添加、更新和删除。添加或更新时会重新拉取来源 URL 并生成分享链接。删除会同时移除订阅来源和其节点内容。

V2Ray 系客户端（包括 v2rayNG、v2rayN、NekoRay、NekoBox、Hiddify、Shadowrocket 等）请求订阅地址时返回 Base64 编码的 URI 列表；普通浏览器返回可读的逐行 URI 文本。

## 外部 API

在配置页设置 API Token 后可调用：

```http
POST /external-api
Authorization: Bearer <token>
Content-Type: application/json

{"name":"节点订阅","url":"https://example.com/subscription.txt"}
```

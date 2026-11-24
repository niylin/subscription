# 分享链接订阅管理

Cloudflare Worker 订阅管理面板。面板维护来源订阅，抓取远程原始配置并提取节点，生成通用 URI 分享链接订阅；Mihomo 则独立使用 `proxy-providers` 管理远程订阅，不会与分享链接节点合并。

## 部署教程

1. Fork 本仓库。
2. 在 Cloudflare 控制台进入 **Workers & Pages → KV**，创建 KV 命名空间。
3. 修改 `wrangler.toml` 中 `[[kv_namespaces]]` 的 `id`，填入新建 KV 命名空间的 ID；绑定名称保持 `CONFIG_KV`。
4. 创建 Worker 并连接此 Git 仓库，或使用 Wrangler 部署。部署后确认 Worker 已绑定该 KV 命名空间。
5. 为 Worker 设置管理员凭据后登录面板。订阅默认路径是 `/sub`，建议登录后在“配置”页修改公开订阅路径。

## 机密与环境变量

在 Cloudflare Worker 的 **Settings → Variables and Secrets** 中设置：

- `ADMIN_USER`：管理员用户名，可设为普通变量；仓库默认值为 `admin`。
- `ADMIN_PASSWORD`：管理员密码，必须作为 **Secret** 添加。也可用 `npx wrangler secret put ADMIN_PASSWORD` 设置。
- `INIT_USER`、`INIT_PASSWORD`：兼容旧部署的初始凭据变量；仅在对应 `ADMIN_*` 未设置时使用。
- `ALLOW_URL`：可选的远程订阅 URL 白名单，值为 JSON 数组字符串，例如 `["https://example.com/**"]`。未设置时不限制订阅来源 URL。

不要把密码、API Token 或订阅链接等凭据提交到 Git。管理员凭据仍为默认的 `admin/admin` 时，登录会被禁用；部署前请设置 `ADMIN_PASSWORD`。外部 API 默认关闭，在面板配置页设置 API Token 后才会启用。请修改默认 `/sub` 下载路径，避免使用容易被扫描的路径。

## 订阅与输出

面板提供一个订阅集列表，可添加、更新和删除。更新会重新抓取原始来源并重建节点 URI，删除会一并移除来源和其生成内容。支持纯文本 URI 订阅（含 Base64）、Clash/Mihomo YAML 的 `proxies` 和 sing-box JSON 的 `outbounds`。当前转换支持 VMess、VLESS、Trojan、Shadowsocks、Hysteria、Hysteria2、TUIC 和 AnyTLS。

顶部三个按钮只复制链接：

- `自动`：根据客户端 User-Agent 返回 Mihomo YAML 或 URI 文本。
- `V2Ray`：返回逐行排列的 URI 文本，方便检查转换结果。
- `Mihomo`：返回配置页模板，并写入单独维护的 `proxy-providers` 远程订阅集。

自动识别常见 V2Ray 系客户端（如 v2rayNG、v2rayN、NekoRay、NekoBox、Hiddify），以及 Mihomo、Clash、Stash、Surge、Shadowrocket、Loon、Quantumult、Karing 等客户端。V2Ray 分享链接始终以每行一个 URI 的纯文本返回，方便检查转换结果。

## Mihomo 模板

在面板的“配置”页面可直接编辑 YAML/JSON 模板，也可填写远程模板 URL 并点击“更新远程模板”。Mihomo provider 在配置页独立添加或删除，下载配置时写入模板的 `proxy-providers` 字段；Worker 不拉取或合并 provider 节点。模板中的 `proxy-groups` 和 `rules` 等配置会保留。

## 外部 API

配置页设置 API Token 后，可通过 `POST` 添加并立即拉取来源订阅。未配置 Token 时 API 禁用。

```http
POST /external-api
Authorization: Bearer <token>
Content-Type: application/json

{"name":"节点订阅","url":"https://example.com/subscription.txt"}
```

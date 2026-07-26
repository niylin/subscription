# subscription

Cloudflare Worker 订阅管理面板，用一个 KV 存储 sing-box 与 mihomo 的模板、订阅集、合并结果和面板配置。

## 部署

- fork本项目
- Cloudflare控制台,存储与数据库/Workers KV/创建KV命名空间 
- 修改wrangler.toml中 kv_namespaces/id 为 KV/id 
- 创建Workers应用程序,连接你的仓库即可

## 重要安全事项

部署完成后：

1. 默认禁用admin/admin登录。
- 在 Workers项目控制台,设置中添加环境变量 `ADMIN_PASSWORD` `ADMIN_USER`

2. 登录面板后进入 `配置` 页面，修改面板路径、订阅路径、外部 API 路径和 API Token。
- 不设置token ,默认禁用API
  
3. 不建议使用默认 /sub 路径作为下载链接,务必修改

## 默认模板

内置两个模板：

- `template/template.json`：sing-box 默认模板
- `template/template.yaml`：mihomo 默认模板

首次使用时会从这两个模板初始化。mihomo 模板中的 `proxy-providers` 会被抽离为面板可管理的订阅集；下载 mihomo 配置时再写回 `proxy-providers`。

## 下载逻辑与 UA 自动识别

默认订阅路径是 `/sub`，可在 `配置` 页面修改。

同一个订阅地址会根据 User-Agent 自动返回不同格式：

- mihomo / Clash 类 UA：返回 YAML
- SFA / Android / sing-box Android 类 UA：返回 Android sing-box JSON
- 其他 UA：返回普通 sing-box JSON

也可以用参数强制指定：

```text
/sub?target=mihomo
/sub?target=sing-box
/sub?target=sing-box-android
```

面板顶部的 `auto`、`sing-box`、`mihomo` 按钮只复制链接，不直接下载。

## sing-box 合并逻辑

sing-box 不直接使用订阅集格式。Worker 会在添加或更新 sing-box 订阅集时拉取远程配置，将其中的节点提取出来，与 sing-box 模板合并，并把完整结果缓存到 KV。

下载时不会每次重新合并，而是直接返回已缓存的完整配置。

合并时会：

- 提取各订阅集中的节点出站。
- 根据节点名称识别国家/地区，动态生成地区分组。
- 将地区分组插入模板中已有的分组。
- 根据 Android / 其他平台覆写生成两份 sing-box 配置。

高级页 `覆写与分组` 可以配置：

- Android / 其他平台覆写
- 每个模板分组是否包含所有节点
- 是否包含国家分组
- 排除指定协议
- 按名称关键字或正则排除节点

覆写规则中对象会递归合并，数组会整体替换。

## mihomo 逻辑

mihomo 只管理 `proxy-providers` 订阅集，不会自动修改模板里的 `proxy-groups` 分组策略。

添加 mihomo 订阅集后会：

1. 写入 mihomo 的 `proxy-providers`。
2. 拉取该 YAML。
3. 提取其中的 `proxies`。
4. 尝试翻译为 sing-box 节点。
5. 同步保存为一个 sing-box 订阅集。

也就是说，mihomo 侧如果希望这些 provider 被具体分组使用，需要手动修改 mihomo 模板里的 `proxy-groups`,默认模板大多数分组已设置 `include-all: true`  。

当前 mihomo 到 sing-box 翻译器支持基础协议：

- VMess
- VLESS
- Trojan
- anytls
- Hysteria / Hysteria2
- TUIC

不支持的协议会跳过；如果没有任何可支持节点，会返回错误。

## 外部 API
主要用途是在脚本配置完节点后自动合并订阅,无需再手动通过面板添加

外部 API 路径和 Token 在 `配置` 页面设置。默认路径是：

```text
/external-api
```

如果未设置 API Token，外部 API 默认禁用。

认证方式支持：

```http
Authorization: Bearer <token>
X-API-Token: <token>
```

也支持 `?token=<token>`。

### 添加订阅集

默认添加 mihomo yaml订阅集。外部 API 默认采用宽松模式：先保存订阅名称和 URL，清理同名旧 sing-box 订阅内容，并返回待拉取状态，不会因为 DNS 尚未生效或远程 URL 暂时不可访问而添加失败。之后可在面板点击更新完成拉取和翻译。

```bash
curl -X POST "https://example.com/external-api" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"provider-name","url":"https://example.com/provider.yaml"}'
```

如需恢复同步校验，添加 `strict: true` 或 `deferFetch: false`。严格模式会立即拉取远程内容，失败时直接返回错误。

### 单独添加 mihomo 订阅集

```json
{
  "type": "mihomo",
  "name": "provider-name",
  "url": "https://example.com/provider.yaml"
}
```

### 单独添加 sing-box 订阅集

```json
{
  "type": "sing-box",
  "name": "sing-name",
  "url": "https://example.com/sing-box.json"
}
```

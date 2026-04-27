# Subscription Manager

这是一个基于 Cloudflare Workers 的配置管理工具，用于动态维护和生成代理工具（如 Clash）的 YAML 配置文件。

## 功能特性
- 动态添加/删除订阅源。
- 自动合并多个订阅源到模板配置。
- **安全性与限制**:
    - 模板大小限制（最大 10MB）。
    - URL 白名单控制。
    - 自动处理重定向。

## 环境变量配置 (Cloudflare 控制台)

在 Cloudflare Workers 的设置中，请进入 **设置 > 变量** 进行配置：

| 变量名          | 类型 | 说明                                                         |
| :-------------- | :--- | :----------------------------------------------------------- |
| `CONFIG_KV`     | KV   | 绑定一个 KV 命名空间用于持久化存储配置数据                         |
| `SUB_PATH`      | Text | 访问路径（如 `/secret-sub`），只有匹配该路径的请求才会被处理 |
| `Template_link` | Text | 默认的远程 YAML 模板下载地址                                 |
| `ALLOW_URL`     | JSON | 可选。URL 白名单模式，JSON 数组格式。例如 `["https://example.com/**"]` |

## 使用参数 (Query Parameters)

所有请求必须访问指定的 `SUB_PATH`，并通过 `gte` 参数指定操作。

### 路径正确,但未指定任何参数时,会返回用法提示
```
curl https://mihomo*.org/f47b5095-*-c02ec4ac24f8                                                                                             
{
  "message": "Subscription Manager Usage",
  "endpoints": {
    "download": "/f47b5095-*-c02ec4ac24f8?gte=download",
    "update": "/f47b5095-*-c02ec4ac24f8?gte=update[&url=TEMPLATE_URL]",
    "add": "/f47b5095-*-c02ec4ac24f8?gte=add&name=NAME&url=PROXY_URL",
    "del": "/f47b5095-*-c02ec4ac24f8?gte=del&name=NAME",
    "list": "/f47b5095-*-c02ec4ac24f8?gte=list"
  },
  "note": "Non-matched paths return 404."
}⏎  
```

### 1. 更新模板 (`update`)
从远程获取基础配置并更新。
- **示例**: `?gte=update`
- **可选**: `&url=URL` (覆盖默认的 `Template_link`)
- **注意**: 更新模板不会删除原有的订阅源，只更新其他规则。

### 2. 下载配置 (`download`)
获取合并后的完整 YAML 配置文件。
- **示例**: `?gte=download`

### 3. 添加/修改条目 (`add`)
添加或更新一个代理订阅源。
- **示例**: `?gte=add&name=ProviderA&url=HTTP_URL`

### 4. 删除条目 (`del`)
- **示例**: `?gte=del&name=ProviderA`

### 5. 列出条目 (`list`)
以 JSON 格式列出所有已添加的 Provider 名称。
- **示例**: `?gte=list`

## 更新限制与安全性

### 1. 模板大小限制
- **最大限制**: 10 MB (10,485,760 字节)。
- **说明**: 系统会检查 HTTP 响应头的 `content-length` 以及实际下载的内容大小。
- **错误处理**: 如果超过限制，系统将返回 `413 Payload Too Large`。

### 2. URL 白名单控制 (`ALLOW_URL`)
- **配置格式**: 包含匹配模式的 JSON 数组。
- **通配符支持**:
  - `*`：匹配除 `/` 之外的任何字符。
  - `**`：匹配包括 `/` 在内的任何字符。
- **默认行为**: 如果 `ALLOW_URL` 未设置或为空，则允许所有 URL。
- **重定向支持**: 只要初始 URL 匹配白名单，系统会自动跟随后续的重定向。

#### 配置示例：
- **仅允许特定域名**: `["https://config.example.com/**"]`
- **允许特定路径**: `["https://example.com/config/**"]`
- **允许所有 HTTPS URL**: `["https://**"]`

## HTTP 状态码说明

| 状态码 | 说明 |
|------|--------|
| 200 | 操作成功 |
| 400 | 请求参数缺失（如未提供有效的 Template link） |
| 403 | URL 不在白名单内 |
| 413 | 模板文件大小超过 10 MB 限制 |
| 500 | 服务器内部错误（如解析失败等） |

## 使用示例

### 白名单限制示例
假设 `ALLOW_URL` 被设置为 `["https://trusted.com/**"]`：

```bash
# ✅ 允许 - 匹配白名单模式
curl "https://api.example.com/sub?gte=update&url=https://trusted.com/config.yaml"

# ❌ 拒绝 - 不在白名单中
curl "https://api.example.com/sub?gte=update&url=https://untrusted.com/config.yaml"
# 响应: 403 URL not allowed
```

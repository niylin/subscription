# Subscription Manager

这是一个基于 Cloudflare Workers 的配置管理工具，用于动态维护和生成代理工具（如 Clash）的 YAML 配置文件。

## 环境变量配置 (Cloudflare 控制台)

在 Cloudflare Workers 的设置中，请配置以下变量：

| 变量名          | 类型 | 说明                                                         |
| :-------------- | :--- | :----------------------------------------------------------- |
| `CONFIG_KV`     |      | 绑定一个 KV 命名空间用于持久化存储配置数据,控制台手动连接所需的变量名                  |
| `SUB_PATH`      | Text | 访问路径（如 `/secret-sub`），只有匹配该路径的请求才会被处理 |
| `Template_link` | Text | 默认的远程 YAML 模板下载地址                                 |

## 使用参数 (Query Parameters)

所有请求必须访问指定的 `SUB_PATH`，并通过 `gte` 参数指定操作。

### 1. 更新模板 (`update`)
从远程获取基础配置并更新。
- **示例**: `?gte=update`
- **可选**: `&url=URL` (覆盖默认的 `Template_link`)

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
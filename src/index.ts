import yaml from 'js-yaml';

export interface Env {
  CONFIG_KV: KVNamespace;
  Template_link: string;
  SUB_PATH: string;
}

interface ConfigData {
  base: any;
  providers: Record<string, any>;
}

const STORAGE_KEY = 'config_data';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    // 规范化路径：移除末尾斜杠
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const configPath = env.SUB_PATH.replace(/\/+$/, '') || '/';

    // 非指定路径一律返回 404
    if (path !== configPath) {
      return new Response('Not Found', { status: 404 });
    }

    const gte = url.searchParams.get('gte');

    // 读取单个 KV 条目
    let dataStr = await env.CONFIG_KV.get(STORAGE_KEY);
    let configData: ConfigData = dataStr ? JSON.parse(dataStr) : { base: {}, providers: {} };

    try {
      switch (gte) {
        case 'update': {
          // 更新模板：优先使用 URL 参数中的 url，其次使用环境变量
          const templateLink = url.searchParams.get('url') || env.Template_link;
          if (!templateLink) return new Response('Template link not provided (parameter or environment)', { status: 400 });
          
          const response = await fetch(templateLink);
          if (!response.ok) throw new Error(`Fetch template failed: ${response.statusText}`);
          const rawYaml = await response.text();
          const config: any = yaml.load(rawYaml);

          // 提取并更新 Providers
          const templateProviders = config['proxy-providers'] || {};
          configData.providers = { ...configData.providers, ...templateProviders };
          
          // 移除 providers 部分并存储基础配置
          delete config['proxy-providers'];
          configData.base = config;

          await env.CONFIG_KV.put(STORAGE_KEY, JSON.stringify(configData));
          return new Response('Template updated successfully');
        }

        case 'download': {
          // 下载配置
          const mergedConfig = { ...configData.base };
          mergedConfig['proxy-providers'] = configData.providers;
          
          return new Response(yaml.dump(mergedConfig, { indent: 2, lineWidth: -1 }), {
            headers: {
              'Content-Type': 'application/yaml; charset=utf-8',
              'Content-Disposition': 'attachment; filename="config.yaml"'
            }
          });
        }

        case 'add': {
          // 添加条目
          const name = url.searchParams.get('name');
          const proxyUrl = url.searchParams.get('url');
          if (!name || !proxyUrl) return new Response('Missing name or url', { status: 400 });

          // 使用现有的第一个作为模板，或者使用默认模板
          const firstProvider = Object.values(configData.providers)[0] || {
            type: 'http',
            'health-check': { enable: true, url: 'https://cp.cloudflare.com', interval: 3600 }
          };

          configData.providers[name] = { ...firstProvider, url: proxyUrl };
          await env.CONFIG_KV.put(STORAGE_KEY, JSON.stringify(configData));
          return new Response(`Added/Updated: ${name}`);
        }

        case 'del': {
          // 删除条目
          const name = url.searchParams.get('name');
          if (!name) return new Response('Missing name', { status: 400 });
          
          if (configData.providers[name]) {
            delete configData.providers[name];
            await env.CONFIG_KV.put(STORAGE_KEY, JSON.stringify(configData));
            return new Response(`Deleted: ${name}`);
          }
          return new Response(`Not found: ${name}`, { status: 404 });
        }

        case 'list': {
          // 列出条目
          return new Response(JSON.stringify(Object.keys(configData.providers), null, 2), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        default: {
          const usage = {
            message: "Subscription Manager Usage",
            endpoints: {
              download: `${env.SUB_PATH}?gte=download`,
              update: `${env.SUB_PATH}?gte=update[&url=TEMPLATE_URL]`,
              add: `${env.SUB_PATH}?gte=add&name=NAME&url=PROXY_URL`,
              del: `${env.SUB_PATH}?gte=del&name=NAME`,
              list: `${env.SUB_PATH}?gte=list`
            },
            note: "Non-matched paths return 404."
          };
          return new Response(JSON.stringify(usage, null, 2), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    } catch (e: any) {
      return new Response(`Error: ${e.message}`, { status: 500 });
    }
  },
};

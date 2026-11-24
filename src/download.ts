import yaml from 'js-yaml';
import type { AppState, Env } from './types';

export async function downloadConfig(request: Request, _env: Env, state: AppState): Promise<Response> {
  const url = new URL(request.url);
  const target = (url.searchParams.get('target') || '').toLowerCase();
  const ua = request.headers.get('User-Agent') || '';
  const mihomo = target === 'mihomo' || (target !== 'v2ray' && /mihomo|clash|stash|verge|meta/i.test(ua));
  if (mihomo) {
    const config = structuredClone(state.mihomoTemplate || {});
    config['proxy-providers'] = Object.fromEntries(Object.entries(state.mihomoProviders).map(([name, provider]) => [name, {
      type: 'http',
      url: typeof provider === 'string' ? provider : provider?.url,
    }]));
    return new Response(yaml.dump(config, { lineWidth: -1, noRefs: true }), { headers: { 'Content-Type': 'application/yaml; charset=utf-8', 'Content-Disposition': 'inline; filename="mihomo.yaml"', 'Cache-Control': 'no-store' } });
  }
  const text = state.shareSubs.flatMap((sub) => sub.links || []).join('\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Profile-Title': encodeURIComponent('Proxy Subscription'), 'Content-Disposition': 'inline; filename="subscription.txt"' } });
}

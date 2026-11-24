import type { AppState, Env } from './types';

export async function downloadConfig(request: Request, _env: Env, state: AppState): Promise<Response> {
  const url = new URL(request.url);
  const links = state.shareSubs.flatMap((sub) => sub.links || []);
  const body = links.join('\n');
  const ua = request.headers.get('User-Agent') || '';
  const v2rayClient = /v2ray|nekoray|nekobox|hiddify|sing-box|shadowrocket|loon|surge|stash|clash|mihomo|quantumult|surfboard|karing|hysteria/i.test(ua);
  const output = v2rayClient ? btoa(unescape(encodeURIComponent(body))) : body;
  return new Response(output, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Profile-Title': encodeURIComponent('Proxy Subscription'), 'Content-Disposition': 'inline; filename="subscription.txt"' } });
}

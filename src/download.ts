import yaml from 'js-yaml';
import type { AppState, Env } from './types';

export async function downloadConfig(request: Request, _env: Env, state: AppState): Promise<Response> {
  const url = new URL(request.url);
  const target = (url.searchParams.get('target') || '').toLowerCase();
  const ua = request.headers.get('User-Agent') || '';
  const mihomo = target === 'mihomo' || (target !== 'v2ray' && /mihomo|clash|stash|verge|meta/i.test(ua));
  const links = state.shareSubs.flatMap((sub) => sub.links || []);
  if (mihomo) {
    const config = structuredClone(state.mihomoTemplate || {});
    config.proxies = links.map(toMihomoProxy).filter(Boolean);
    return new Response(yaml.dump(config, { lineWidth: -1, noRefs: true }), { headers: { 'Content-Type': 'application/yaml; charset=utf-8', 'Content-Disposition': 'inline; filename="mihomo.yaml"', 'Cache-Control': 'no-store' } });
  }
  const text = links.join('\n');
  const knownClient = /v2ray|nekoray|nekobox|hiddify|shadowrocket|loon|surge|quantumult|surfboard|karing|hysteria/i.test(ua);
  const output = target === 'v2ray' || knownClient ? btoa(unescape(encodeURIComponent(text))) : text;
  return new Response(output, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Profile-Title': encodeURIComponent('Proxy Subscription'), 'Content-Disposition': 'inline; filename="subscription.txt"' } });
}

function toMihomoProxy(link: string): any | null {
  try {
    if (link.startsWith('vmess://')) {
      const node = JSON.parse(decodeURIComponent(escape(atob(link.slice(8)))));
      const p: any = { name: node.ps, type: 'vmess', server: node.add, port: Number(node.port), uuid: node.id, alterId: Number(node.aid || 0), cipher: node.scy || 'auto', tls: node.tls === 'tls' };
      if (node.net && node.net !== 'tcp') { p.network = node.net; if (node.net === 'ws') p['ws-opts'] = { path: node.path || '/', headers: node.host ? { Host: node.host } : undefined }; if (node.net === 'grpc') p['grpc-opts'] = { 'grpc-service-name': node.path }; }
      if (node.sni) p.servername = node.sni;
      return p;
    }
    const hash = link.indexOf('#');
    const label = hash >= 0 ? decodeURIComponent(link.slice(hash + 1)) : 'node';
    const parsed = new URL(hash >= 0 ? link.slice(0, hash) : link);
    const q = parsed.searchParams;
    const type = parsed.protocol.slice(0, -1).toLowerCase();
    const base: any = { name: label, server: parsed.hostname, port: Number(parsed.port) };
    if (type === 'vless') Object.assign(base, { type, uuid: decodeURIComponent(parsed.username), tls: ['tls','reality'].includes(q.get('security') || ''), servername: q.get('sni'), 'client-fingerprint': q.get('fp'), network: q.get('type') === 'tcp' ? undefined : q.get('type'), flow: q.get('flow'), 'reality-opts': q.get('security') === 'reality' ? { 'public-key': q.get('pbk'), 'short-id': q.get('sid') } : undefined, 'ws-opts': q.get('type') === 'ws' ? { path: q.get('path'), headers: q.get('host') ? { Host: q.get('host') } : undefined } : undefined, 'grpc-opts': q.get('type') === 'grpc' ? { 'grpc-service-name': q.get('serviceName') } : undefined });
    else if (type === 'trojan') Object.assign(base, { type, password: decodeURIComponent(parsed.username), sni: q.get('sni'), tls: true, network: q.get('type') === 'tcp' ? undefined : q.get('type'), 'ws-opts': q.get('type') === 'ws' ? { path: q.get('path'), headers: q.get('host') ? { Host: q.get('host') } : undefined } : undefined });
    else if (type === 'hysteria2' || type === 'hy2') Object.assign(base, { type: 'hysteria2', password: decodeURIComponent(parsed.username), sni: q.get('sni'), 'skip-cert-verify': q.get('insecure') === '1', obfs: q.get('obfs'), 'obfs-password': q.get('obfs-password') });
    else if (type === 'tuic') Object.assign(base, { type, uuid: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password), sni: q.get('sni') });
    else if (type === 'anytls') Object.assign(base, { type, password: decodeURIComponent(parsed.username), sni: q.get('sni') });
    else if (type === 'ss') { const auth = atob(parsed.username); const i = auth.indexOf(':'); Object.assign(base, { type: 'ss', cipher: auth.slice(0, i), password: auth.slice(i + 1) }); }
    else return null;
    return base;
  } catch { return null; }
}

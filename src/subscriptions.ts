import { translateMihomoProxies } from './mihomo-to-nodes';
import { saveSubscriptions } from './state';
import type { AppState, Env, ShareSubscription } from './types';
import { fetchText, parseConfigText } from './utils';

export async function addShareSubscription(env: Env, state: AppState, input: { name: string; url: string; id?: string }): Promise<ShareSubscription> {
  const item: ShareSubscription = { id: input.id || crypto.randomUUID(), name: input.name, url: input.url, links: [], status: 'pending' };
  state.shareSubs = state.shareSubs.filter((s) => s.id !== item.id && s.name !== item.name).concat(item);
  await saveSubscriptions(env, state);
  return updateShareSubscription(env, state, item.id) as Promise<ShareSubscription>;
}

export async function updateShareSubscription(env: Env, state: AppState, id: string): Promise<ShareSubscription | null> {
  const item = state.shareSubs.find((sub) => sub.id === id);
  if (!item) return null;
  const at = new Date().toISOString();
  try {
    item.links = parseShareLinks(await fetchText(item.url, env), item.name);
    item.status = 'ready'; item.updatedAt = at; item.lastAttemptAt = at; item.lastError = undefined; item.size = item.links.join('\n').length;
    await saveSubscriptions(env, state);
    return item;
  } catch (error: any) {
    item.status = 'error'; item.lastAttemptAt = at; item.lastError = error?.message || String(error);
    await saveSubscriptions(env, state);
    throw error;
  }
}

export function parseShareLinks(source: string, name = ''): string[] {
  let text = source.trim();
  if (!text) throw new Error('Empty subscription content');
  if (!/^(?:vmess|vless|trojan|ss|ssr|hysteria|hysteria2|hy2|tuic|anytls):\/\//im.test(text) && /^[A-Za-z0-9+/=\r\n]+$/.test(text)) {
    try { const decoded = atob(text.replace(/\s+/g, '')); if (/(?:vmess|vless|trojan|ss|ssr|hysteria|hysteria2|hy2|tuic|anytls):\/\//i.test(decoded)) text = decoded; } catch { /* source may simply be a config */ }
  }
  const direct = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^(?:vmess|vless|trojan|ss|ssr|hysteria|hysteria2|hy2|tuic|anytls):\/\//i.test(line));
  if (direct.length) return [...new Set(direct)];
  const parsed = parseConfigText(text);
  let nodes: any[] = [];
  if (Array.isArray(parsed?.proxies)) nodes = translateMihomoProxies(text);
  else if (Array.isArray(parsed?.outbounds)) nodes = parsed.outbounds.filter((x: any) => x && ['vmess','vless','trojan','shadowsocks','hysteria','hysteria2','tuic','anytls'].includes(x.type));
  const links = nodes.map(outboundToUri).filter(Boolean);
  if (!links.length) throw new Error(`No supported nodes found${name ? `: ${name}` : ''}`);
  return [...new Set(links)];
}

function outboundToUri(n: any): string {
  const host = encodeURIComponent(n.server || ''), port = Number(n.server_port || 0), tag = encodeURIComponent(n.tag || 'node');
  if (!host || !port) return '';
  const tls = n.tls?.enabled ? n.tls : null, tr = n.transport || {};
  const query = new URLSearchParams();
  if (tls) { query.set('security', tls.reality?.enabled ? 'reality' : 'tls'); if (tls.server_name) query.set('sni', tls.server_name); if (tls.insecure) query.set('allowInsecure', '1'); if (tls.alpn?.length) query.set('alpn', tls.alpn.join(',')); }
  if (tr.type) { query.set('type', tr.type); const transportPath = tr.type === 'grpc' ? tr.service_name : tr.path; if (transportPath) query.set(tr.type === 'grpc' ? 'serviceName' : 'path', transportPath); const h=tr.headers?.Host; if(h) query.set('host',h); }
  if (tls?.utls?.fingerprint) query.set('fp', tls.utls.fingerprint);
  if (tls?.reality?.public_key) query.set('pbk', tls.reality.public_key);
  if (tls?.reality?.short_id) query.set('sid', tls.reality.short_id);
  const q=query.toString();
  if (n.type === 'vmess') return `vmess://${btoa(unescape(encodeURIComponent(JSON.stringify({v:'2',ps:n.tag,add:n.server,port:String(port),id:n.uuid,aid:String(n.alter_id||0),scy:n.security||'auto',net:tr.type||'tcp',type:'none',host:tr.headers?.Host||'',path:tr.path||'',tls:tls?'tls':'',sni:tls?.server_name||''}))))}`;
  if (n.type === 'vless') { const qs=[q,`encryption=none`,n.flow?`flow=${encodeURIComponent(n.flow)}`:''].filter(Boolean).join('&'); return `vless://${encodeURIComponent(n.uuid||'')}@${host}:${port}?${qs}#${tag}`; }
  if (n.type === 'trojan') return `trojan://${encodeURIComponent(n.password||'')}@${host}:${port}?${q}#${tag}`;
  if (n.type === 'hysteria2') { if(n.obfs?.type==='salamander') query.set('obfs','salamander'); if(n.obfs?.password) query.set('obfs-password',n.obfs.password); return `hysteria2://${encodeURIComponent(n.password||'')}@${host}:${port}?${query.toString()}#${tag}`; }
  if (n.type === 'hysteria') return `hysteria://${encodeURIComponent(n.auth_str||n.auth||n.password||'')}@${host}:${port}?${q}#${tag}`;
  if (n.type === 'tuic') return `tuic://${encodeURIComponent(n.uuid||'')}:${encodeURIComponent(n.password||'')}@${host}:${port}?${q}#${tag}`;
  if (n.type === 'anytls') return `anytls://${encodeURIComponent(n.password||'')}@${host}:${port}?${q}#${tag}`;
  if (n.type === 'shadowsocks') { const user=btoa(`${n.method}:${n.password}`).replace(/=+$/,''); return `ss://${user}@${host}:${port}#${tag}`; }
  return '';
}

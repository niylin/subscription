import { parseConfigText } from './utils';

export function translateMihomoProxies(text: string): any[] {
  const config = parseConfigText(text);
  const proxies = Array.isArray(config?.proxies) ? config.proxies : [];
  return proxies.map(translateProxy).filter(Boolean);
}

function translateProxy(proxy: any): any | null {
  const type = String(proxy.type || '').toLowerCase();
  if (!proxy.name || !type) return null;

  if (type === 'vmess') return translateVmess(proxy);
  if (type === 'vless') return translateVless(proxy);
  if (type === 'trojan') return translateTrojan(proxy);
  if (type === 'anytls') return translateAnytls(proxy);
  if (type === 'hysteria' || type === 'hysteria2' || type === 'hy2') return translateHysteria(proxy, type);
  if (type === 'tuic') return translateTuic(proxy);
  return null;
}

function base(proxy: any, type: string): any {
  return {
    type,
    tag: String(proxy.name),
    server: proxy.server,
    server_port: Number(proxy.port || proxy['server-port'] || proxy.server_port),
  };
}

function translateVmess(proxy: any): any {
  const outbound = {
    ...base(proxy, 'vmess'),
    uuid: proxy.uuid,
    security: proxy.cipher || proxy.security || 'auto',
    alter_id: Number(proxy.alterId || proxy['alter-id'] || proxy.alter_id || 0),
  };
  addTls(outbound, proxy);
  addTransport(outbound, proxy);
  return outbound;
}

function translateVless(proxy: any): any {
  const outbound = {
    ...base(proxy, 'vless'),
    uuid: proxy.uuid,
    flow: proxy.flow,
  };
  addTls(outbound, proxy);
  addTransport(outbound, proxy);
  clean(outbound);
  return outbound;
}

function translateTrojan(proxy: any): any {
  const outbound = {
    ...base(proxy, 'trojan'),
    password: proxy.password,
  };
  addTls(outbound, { tls: true, ...proxy });
  addTransport(outbound, proxy);
  return outbound;
}

function translateAnytls(proxy: any): any {
  const outbound = {
    ...base(proxy, 'anytls'),
    password: proxy.password,
  };
  addTls(outbound, { tls: true, ...proxy });
  return outbound;
}

function translateHysteria(proxy: any, sourceType: string): any {
  const outbound = {
    ...base(proxy, sourceType === 'hysteria' ? 'hysteria' : 'hysteria2'),
    password: proxy.password || proxy.auth || proxy['auth-str'],
    up_mbps: numberOrUndefined(proxy.up || proxy.upmbps || proxy['up-mbps']),
    down_mbps: numberOrUndefined(proxy.down || proxy.downmbps || proxy['down-mbps']),
    obfs: proxy.obfs
      ? {
          type: proxy.obfs,
          password: proxy['obfs-password'] || proxy['obfs_password'],
        }
      : undefined,
  };
  addTls(outbound, { tls: true, ...proxy });
  clean(outbound);
  return outbound;
}

function translateTuic(proxy: any): any {
  const outbound = {
    ...base(proxy, 'tuic'),
    uuid: proxy.uuid,
    password: proxy.password,
    congestion_control: proxy['congestion-controller'] || proxy['congestion_control'] || proxy.congestion_control,
    udp_relay_mode: proxy['udp-relay-mode'] || proxy.udp_relay_mode,
  };
  addTls(outbound, { tls: true, ...proxy });
  clean(outbound);
  return outbound;
}

function addTls(outbound: any, proxy: any): void {
  const ech = proxy['ech-opts'] || proxy.ech || {};
  const enabled = proxy.tls === true || proxy.tls === 'true' || proxy.network === 'grpc' || proxy.network === 'ws' || proxy.sni || ech.enable || ech.enabled;
  if (!enabled && !proxy.reality) return;

  outbound.tls = {
    enabled: true,
    server_name: proxy.sni || proxy.servername || proxy['server-name'],
    insecure: proxy['skip-cert-verify'] || proxy.skipCertVerify,
    alpn: proxy.alpn,
  };

  if (ech.enable || ech.enabled || ech.config) {
    outbound.tls.ech = {
      enabled: ech.enable ?? ech.enabled ?? true,
      config: normalizeEchConfig(ech.config),
    };
  }

  if (proxy.reality || proxy['reality-opts']) {
    const reality = proxy['reality-opts'] || proxy.reality || {};
    outbound.tls.utls = {
      enabled: true,
      fingerprint: proxy['client-fingerprint'] || proxy.fingerprint || proxy.utls?.fingerprint || 'chrome',
    };
    outbound.tls.reality = {
      enabled: true,
      public_key: reality['public-key'] || reality.public_key,
      short_id: stringifyOptional(reality['short-id'] ?? reality.short_id),
    };
  }
  clean(outbound.tls);
}

function stringifyOptional(value: any): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function normalizeEchConfig(config: any): string[] | undefined {
  if (!config) return undefined;
  if (Array.isArray(config)) return config.map(String);

  const value = String(config).trim();
  if (!value) return undefined;
  if (value.includes('BEGIN ECH CONFIGS')) return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return ['-----BEGIN ECH CONFIGS-----', value, '-----END ECH CONFIGS-----'];
}

function addTransport(outbound: any, proxy: any): void {
  const network = String(proxy.network || '').toLowerCase();
  if (network === 'ws') {
    outbound.transport = {
      type: 'ws',
      path: proxy['ws-opts']?.path || proxy.path,
      headers: proxy['ws-opts']?.headers || (proxy.host ? { Host: proxy.host } : undefined),
    };
  }
  if (network === 'grpc') {
    outbound.transport = {
      type: 'grpc',
      service_name: proxy['grpc-opts']?.['grpc-service-name'] || proxy['grpc-service-name'] || proxy.serviceName,
    };
  }
  if (network === 'http') {
    outbound.transport = {
      type: 'http',
      host: proxy['http-opts']?.headers?.Host || proxy.host,
      path: proxy['http-opts']?.path || proxy.path,
    };
  }
  if (outbound.transport) clean(outbound.transport);
}

function numberOrUndefined(value: any): number | undefined {
  if (value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function clean(value: any): any {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined || value[key] === '' || (Array.isArray(value[key]) && value[key].length === 0)) delete value[key];
    if (value[key] && typeof value[key] === 'object' && !Array.isArray(value[key])) clean(value[key]);
  }
  return value;
}

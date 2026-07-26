import { translateMihomoProxies } from './mihomo-to-sing';
import { saveMihomo, saveSingBox } from './state';
import { rebuildSingCaches } from './sing-box';
import type { AppState, Env, JsonMap, RemoteItem } from './types';
import { fetchText, parseJsonObject } from './utils';

type ParsedRemoteSourceType = 'sing-box' | 'mihomo';

export async function addSingBoxSubscription(env: Env, state: AppState, input: { name: string; url: string; id?: string }): Promise<any> {
  const attemptedAt = new Date().toISOString();
  const parsed = parseSingSubscriptionSource(await fetchText(input.url, env), input.name);
  const item = upsertSingBoxConfig(state, input.name, input.url, parsed.config, input.id, parsed.sourceType, { status: 'ready', lastAttemptAt: attemptedAt });
  await rebuildSingCaches(env, state);
  return { item, imported: parsed.imported, updatedAt: state.singCache.updatedAt };
}

export async function addPendingSingBoxSubscription(env: Env, state: AppState, input: { name: string; url: string; id?: string }): Promise<any> {
  const item = upsertSingBoxConfig(state, input.name, input.url, {}, input.id, 'sing-box', { status: 'pending', updatedAt: null });
  await rebuildSingCaches(env, state);
  return { item, status: 'pending', updatedAt: state.singCache.updatedAt };
}

export async function addMihomoSubscription(env: Env, state: AppState, input: { name: string; url: string; id?: string; healthCheck?: string; interval?: number }): Promise<any> {
  const attemptedAt = new Date().toISOString();
  const source = await fetchText(input.url, env);
  const outbounds = translateMihomoProxies(source);
  if (outbounds.length === 0) throw new Error('No supported proxies found');

  state.mihomoProviders[input.name] = {
    type: 'http',
    interval: Number(input.interval || 3600),
    url: input.url,
    'health-check': { enable: true, url: input.healthCheck || 'https://cp.cloudflare.com' },
  };
  await saveMihomo(env, state);

  const item = upsertSingBoxConfig(state, input.name, input.url, { outbounds }, input.id, 'mihomo', { status: 'ready', lastAttemptAt: attemptedAt });
  await rebuildSingCaches(env, state);
  return { item, imported: outbounds.length, updatedAt: state.singCache.updatedAt };
}

export async function addMihomoDirectSubscription(env: Env, state: AppState, input: { name: string; url: string; id?: string; healthCheck?: string; interval?: number }): Promise<any> {
  state.mihomoProviders[input.name] = {
    type: 'http',
    interval: Number(input.interval || 3600),
    url: input.url,
    'health-check': { enable: true, url: input.healthCheck || 'https://cp.cloudflare.com' },
  };
  await saveMihomo(env, state);

  const item = upsertSingBoxConfig(state, input.name, input.url, {}, input.id, 'mihomo-raw', { status: 'pending', updatedAt: null });
  await rebuildSingCaches(env, state);
  return { item, status: 'pending', updatedAt: state.singCache.updatedAt };
}

export async function importMihomoProxies(env: Env, state: AppState, input: { name: string; url?: string; content?: string; id?: string }): Promise<any> {
  const source = input.url ? await fetchText(input.url, env) : input.content || '';
  if (!source.trim()) throw new Error('Missing subscription content or url');

  const attemptedAt = new Date().toISOString();
  const parsed = parseSingSubscriptionSource(source, input.name);
  const sourceType = input.url ? parsed.sourceType : parsed.sourceType === 'mihomo' ? 'mihomo-inline' : 'sing-box-inline';
  const item = upsertSingBoxConfig(state, input.name, input.url || `${sourceType}://inline`, parsed.config, input.id, sourceType, { status: 'ready', lastAttemptAt: attemptedAt });
  await rebuildSingCaches(env, state);
  return { item, imported: parsed.imported, updatedAt: state.singCache.updatedAt };
}

export async function updateSingBoxSubscription(env: Env, state: AppState, id: string): Promise<any | null> {
  const item = state.singSubs.find((sub) => sub.id === id);
  if (!item) return null;
  const attemptedAt = new Date().toISOString();
  try {
    if (item.url.startsWith('mihomo-proxies://') || item.url.startsWith('mihomo-inline://') || item.url.startsWith('sing-box-inline://')) {
      item.sourceType = item.url.startsWith('sing-box-inline://') ? 'sing-box-inline' : 'mihomo-inline';
      item.status = 'ready';
      item.lastError = undefined;
      item.lastAttemptAt = attemptedAt;
      item.updatedAt = attemptedAt;
      await rebuildSingCaches(env, state);
      return item;
    }

    const parsed = parseSingSubscriptionSource(await fetchText(item.url, env), item.name);
    const config = parsed.config;
    item.sourceType = parsed.sourceType;
    item.status = 'ready';
    item.lastError = undefined;
    item.lastAttemptAt = attemptedAt;
    item.updatedAt = attemptedAt;
    item.size = JSON.stringify(config).length;
    state.singSubConfigs[id] = config;
    await rebuildSingCaches(env, state);
    return item;
  } catch (error: any) {
    item.status = 'error';
    item.lastError = error?.message || String(error);
    item.lastAttemptAt = attemptedAt;
    await saveSingBox(env, state);
    throw error;
  }
}

function parseSingSubscriptionSource(source: string, name = ''): { config: JsonMap; sourceType: ParsedRemoteSourceType; imported?: number } {
  const text = source.trim();
  if (!text) throw new Error('Empty subscription content');

  if (isJsonText(text)) {
    return { config: parseJsonObject(text), sourceType: 'sing-box' };
  }

  const outbounds = translateMihomoProxies(text);
  if (outbounds.length === 0) throw new Error(name ? `No supported proxies found: ${name}` : 'No supported proxies found');
  return { config: { outbounds }, sourceType: 'mihomo', imported: outbounds.length };
}

function isJsonText(text: string): boolean {
  return text.startsWith('{') || text.startsWith('[');
}

function upsertSingBoxConfig(
  state: AppState,
  name: string,
  url: string,
  config: any,
  id?: string,
  sourceType: NonNullable<RemoteItem['sourceType']> = 'sing-box',
  metadata: { status?: RemoteItem['status']; lastError?: string; lastAttemptAt?: string; updatedAt?: string | null } = {},
): any {
  const sameNameItem = state.singSubs.find((sub) => sub.name === name);
  const itemId = id || sameNameItem?.id || crypto.randomUUID();
  const updatedAt = Object.hasOwn(metadata, 'updatedAt') ? metadata.updatedAt : new Date().toISOString();
  const item = {
    id: itemId,
    name,
    url,
    sourceType,
    status: metadata.status || 'ready',
    lastError: metadata.lastError,
    lastAttemptAt: metadata.lastAttemptAt,
    updatedAt: updatedAt || undefined,
    size: JSON.stringify(config).length,
  };
  const removedIds = state.singSubs.filter((sub) => sub.id !== itemId && sub.name === name).map((sub) => sub.id);
  state.singSubs = state.singSubs.filter((sub) => sub.id !== itemId && sub.name !== name).concat(item);
  for (const removedId of removedIds) delete state.singSubConfigs[removedId];
  state.singSubConfigs[itemId] = config;
  return item;
}

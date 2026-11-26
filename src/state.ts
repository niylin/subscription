import { SETTINGS_KEY, SHARE_SUBSCRIPTIONS_KEY, MIHOMO_TEMPLATE_KEY, LEGACY_MIHOMO_KEY, DEFAULT_SETTINGS } from './defaults';
import type { AppState, Env, JsonMap } from './types';

export async function loadState(env: Env): Promise<AppState> {
  const [settingsRaw, subsRaw, oldRaw, templateRaw, oldMihomoRaw] = await Promise.all([env.CONFIG_KV.get(SETTINGS_KEY), env.CONFIG_KV.get(SHARE_SUBSCRIPTIONS_KEY), env.CONFIG_KV.get('sing_box_v1'), env.CONFIG_KV.get(MIHOMO_TEMPLATE_KEY), env.CONFIG_KV.get(LEGACY_MIHOMO_KEY)]);
  let shareSubs: any[] = subsRaw ? JSON.parse(subsRaw) : [];
  if (!subsRaw && oldRaw) {
    const old = JSON.parse(oldRaw);
    shareSubs = (old.singSubs || []).map((item: any) => ({ ...item, links: [], status: 'pending' }));
  }
  const oldMihomo = oldMihomoRaw ? JSON.parse(oldMihomoRaw) : {};
  const template = templateRaw ? JSON.parse(templateRaw) : oldMihomo.mihomoTemplate ? { template: oldMihomo.mihomoTemplate, url: oldMihomo.mihomoTemplateUrl || '', providers: oldMihomo.mihomoProviders || {} } : { template: { 'mixed-port': 7890, mode: 'rule', 'log-level': 'info', proxies: [], 'proxy-groups': [{ name: 'PROXY', type: 'select', proxies: ['DIRECT'] }], rules: ['MATCH,PROXY'] }, url: '', providers: {} };
  const mihomoTemplate = template.template as JsonMap;
  const embedded = mihomoTemplate['proxy-providers'] || {};
  delete mihomoTemplate['proxy-providers'];
  const mihomoProviders: Record<string, any> = { ...(oldMihomo.mihomoProviders || {}), ...embedded, ...(template.providers || {}) };

  // Bring provider-only legacy entries into the one managed subscription list.
  for (const [name, provider] of Object.entries(mihomoProviders)) {
    if (shareSubs.some((sub) => sub.name === name)) continue;
    const providerUrl = typeof provider === 'string' ? provider : provider?.url;
    if (providerUrl) shareSubs.push({ id: `legacy-mihomo-${name}`, name, url: providerUrl, links: [], status: 'pending' });
  }

  // The main subscription is authoritative for its matching provider URL.
  for (const sub of shareSubs) mihomoProviders[sub.name] = { type: 'http', url: sub.url };

  return { settings: { ...DEFAULT_SETTINGS, ...(settingsRaw ? JSON.parse(settingsRaw) : {}) }, shareSubs, mihomoTemplate, mihomoTemplateUrl: template.url || '', mihomoProviders };
}
export async function saveSettings(env: Env, state: AppState): Promise<void> { await env.CONFIG_KV.put(SETTINGS_KEY, JSON.stringify(state.settings)); }
export async function saveSubscriptions(env: Env, state: AppState): Promise<void> { await env.CONFIG_KV.put(SHARE_SUBSCRIPTIONS_KEY, JSON.stringify(state.shareSubs)); }
export async function saveMihomoTemplate(env: Env, state: AppState): Promise<void> {
  const providers = Object.fromEntries(Object.entries(state.mihomoProviders).map(([name, provider]) => [name, { type: 'http', url: typeof provider === 'string' ? provider : provider?.url }]));
  await Promise.all([
    env.CONFIG_KV.put(MIHOMO_TEMPLATE_KEY, JSON.stringify({ template: state.mihomoTemplate, url: state.mihomoTemplateUrl, providers })),
    env.CONFIG_KV.put(LEGACY_MIHOMO_KEY, JSON.stringify({ mihomoTemplate: state.mihomoTemplate, mihomoTemplateUrl: state.mihomoTemplateUrl, mihomoProviders: providers })),
  ]);
}

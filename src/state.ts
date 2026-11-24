import { SETTINGS_KEY, SHARE_SUBSCRIPTIONS_KEY, MIHOMO_TEMPLATE_KEY, DEFAULT_SETTINGS } from './defaults';
import type { AppState, Env, JsonMap } from './types';

export async function loadState(env: Env): Promise<AppState> {
  const [settingsRaw, subsRaw, oldRaw, templateRaw] = await Promise.all([env.CONFIG_KV.get(SETTINGS_KEY), env.CONFIG_KV.get(SHARE_SUBSCRIPTIONS_KEY), env.CONFIG_KV.get('sing_box_v1'), env.CONFIG_KV.get(MIHOMO_TEMPLATE_KEY)]);
  let shareSubs: any[] = subsRaw ? JSON.parse(subsRaw) : [];
  if (!subsRaw && oldRaw) {
    const old = JSON.parse(oldRaw);
    shareSubs = (old.singSubs || []).map((item: any) => ({ ...item, links: [], status: 'pending' }));
  }
  const template = templateRaw ? JSON.parse(templateRaw) : { template: { 'mixed-port': 7890, mode: 'rule', 'log-level': 'info', proxies: [], 'proxy-groups': [{ name: 'PROXY', type: 'select', proxies: ['DIRECT'] }], rules: ['MATCH,PROXY'] }, url: '' };
  return { settings: { ...DEFAULT_SETTINGS, ...(settingsRaw ? JSON.parse(settingsRaw) : {}) }, shareSubs, mihomoTemplate: template.template as JsonMap, mihomoTemplateUrl: template.url || '' };
}
export async function saveSettings(env: Env, state: AppState): Promise<void> { await env.CONFIG_KV.put(SETTINGS_KEY, JSON.stringify(state.settings)); }
export async function saveSubscriptions(env: Env, state: AppState): Promise<void> { await env.CONFIG_KV.put(SHARE_SUBSCRIPTIONS_KEY, JSON.stringify(state.shareSubs)); }
export async function saveMihomoTemplate(env: Env, state: AppState): Promise<void> { await env.CONFIG_KV.put(MIHOMO_TEMPLATE_KEY, JSON.stringify({ template: state.mihomoTemplate, url: state.mihomoTemplateUrl })); }

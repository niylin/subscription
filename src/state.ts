import { SETTINGS_KEY, SHARE_SUBSCRIPTIONS_KEY, DEFAULT_SETTINGS } from './defaults';
import type { AppState, Env } from './types';

export async function loadState(env: Env): Promise<AppState> {
  const [settingsRaw, subsRaw, oldRaw] = await Promise.all([env.CONFIG_KV.get(SETTINGS_KEY), env.CONFIG_KV.get(SHARE_SUBSCRIPTIONS_KEY), env.CONFIG_KV.get('sing_box_v1')]);
  let shareSubs: any[] = subsRaw ? JSON.parse(subsRaw) : [];
  if (!subsRaw && oldRaw) {
    const old = JSON.parse(oldRaw);
    shareSubs = (old.singSubs || []).map((item: any) => ({ ...item, links: [], status: 'pending' }));
  }
  return { settings: { ...DEFAULT_SETTINGS, ...(settingsRaw ? JSON.parse(settingsRaw) : {}) }, shareSubs };
}
export async function saveSettings(env: Env, state: AppState): Promise<void> { await env.CONFIG_KV.put(SETTINGS_KEY, JSON.stringify(state.settings)); }
export async function saveSubscriptions(env: Env, state: AppState): Promise<void> { await env.CONFIG_KV.put(SHARE_SUBSCRIPTIONS_KEY, JSON.stringify(state.shareSubs)); }

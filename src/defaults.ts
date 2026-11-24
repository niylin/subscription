import type { Settings } from './types';
export const MAX_FETCH_SIZE = 10 * 1024 * 1024;
export const SETTINGS_KEY = 'settings_v1';
export const SHARE_SUBSCRIPTIONS_KEY = 'share_subscriptions_v1';
export const MIHOMO_TEMPLATE_KEY = 'mihomo_template_v1';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365;
export const DEFAULT_SETTINGS: Settings = { publicPath: '/sub', panelPath: '/', apiPath: '/external-api', apiToken: '' };

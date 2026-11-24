export interface Env { CONFIG_KV: KVNamespace; ADMIN_USER?: string; ADMIN_PASSWORD?: string; INIT_USER?: string; INIT_PASSWORD?: string; ALLOW_URL?: string }
export type JsonMap = Record<string, any>;
export interface Settings { publicPath: string; panelPath: string; apiPath: string; apiToken: string; updatedAt?: string }
export interface RemoteItem { id: string; name: string; url: string; status?: 'pending'|'ready'|'error'; lastError?: string; lastAttemptAt?: string; updatedAt?: string; size?: number }
export interface ShareSubscription extends RemoteItem { links: string[] }
export interface AppState { settings: Settings; shareSubs: ShareSubscription[] }

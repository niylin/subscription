export interface Env {
  CONFIG_KV: KVNamespace;
  ADMIN_USER?: string;
  ADMIN_PASSWORD?: string;
  INIT_USER?: string;
  INIT_PASSWORD?: string;
  ALLOW_URL?: string;
}

export type JsonMap = Record<string, any>;

export interface Settings {
  publicPath: string;
  panelPath: string;
  apiPath: string;
  apiToken: string;
  updatedAt?: string;
}

export interface RemoteItem {
  id: string;
  name: string;
  url: string;
  sourceType?: 'sing-box' | 'sing-box-inline' | 'mihomo' | 'mihomo-inline' | 'mihomo-raw';
  status?: 'pending' | 'ready' | 'error';
  lastError?: string;
  lastAttemptAt?: string;
  updatedAt?: string;
  size?: number;
}

export interface SingPlatformPatch {
  android: JsonMap;
  other: JsonMap;
}

export interface SingGroupRule {
  tag: string;
  includeAll?: boolean;
  includeRegions?: boolean;
  includeGroups?: string[];
  excludeName?: string;
  excludeTypes?: string[];
}

export interface AppState {
  settings: Settings;
  singTemplate: JsonMap;
  singSubs: RemoteItem[];
  singSubConfigs: Record<string, JsonMap>;
  singPatches: SingPlatformPatch;
  singGroupRules: SingGroupRule[];
  singCache: {
    android: JsonMap | null;
    other: JsonMap | null;
    updatedAt?: string;
  };
  singTemplateUrl?: string;
  mihomoTemplate: JsonMap;
  mihomoTemplateUrl?: string;
  mihomoProviders: Record<string, any>;
}

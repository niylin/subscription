import yaml from 'js-yaml';
import { MAX_FETCH_SIZE } from './defaults';
import type { Env, JsonMap } from './types';

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function textResponse(body: string, status = 200, headers: HeadersInit = {}): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers } });
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function normalizePath(path: string | undefined, fallback: string): string {
  if (!path) return fallback;
  const cleaned = `/${path}`.replace(/\/+/g, '/').replace(/\/+$/, '');
  return cleaned || '/';
}

export function isUrlAllowed(url: string, env: Env): boolean {
  if (!env.ALLOW_URL) return true;
  let allowList: string[];
  try {
    allowList = JSON.parse(env.ALLOW_URL);
  } catch {
    return false;
  }
  return allowList.some((pattern) => {
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '___DOUBLE_STAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DOUBLE_STAR___/g, '.*');
    return new RegExp(`^${regexPattern}$`).test(url);
  });
}

export async function fetchText(url: string, env: Env): Promise<string> {
  if (!/^https?:\/\//i.test(url)) throw new Error('URL must start with http:// or https://');
  if (!isUrlAllowed(url, env)) throw new Error(`URL is not allowed: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'subscription-manager/1.0',
      Accept: 'application/json, application/yaml, text/yaml, text/plain, */*',
    },
  });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_FETCH_SIZE) throw new Error('Remote file is larger than 10MB');
  const body = await response.text();
  if (new TextEncoder().encode(body).length > MAX_FETCH_SIZE) throw new Error('Remote file is larger than 10MB');
  return body;
}

export function parseConfigText(text: string): any {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Empty config');
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed);
  return yaml.load(trimmed);
}

export function parseJsonObject(text: string): JsonMap {
  const parsed = parseConfigText(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected a JSON/YAML object');
  return parsed as JsonMap;
}

export function deepMerge(base: any, patch: any): any {
  if (Array.isArray(base) || Array.isArray(patch)) return patch === undefined ? base : clone(patch);
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch === undefined ? base : patch;
  const output: JsonMap = { ...clone(base) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete output[key];
    } else {
      output[key] = deepMerge(output[key], value);
    }
  }
  return output;
}

export function isPlainObject(value: any): value is JsonMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function escapeHtml(value: any): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

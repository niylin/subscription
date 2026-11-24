import { addShareSubscription } from './subscriptions';
import type { AppState, Env } from './types';
import { jsonResponse } from './utils';

export async function handleExternalApi(request: Request, env: Env, state: AppState): Promise<Response> {
  if (!state.settings.apiToken) return jsonResponse({ error: 'External API token is not configured' }, 403);
  const auth = request.headers.get('Authorization') || '';
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (bearer !== state.settings.apiToken && new URL(request.url).searchParams.get('token') !== state.settings.apiToken && request.headers.get('X-API-Token') !== state.settings.apiToken) return jsonResponse({ error: 'Unauthorized' }, 401);
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  const body = await request.json().catch(() => ({})) as any;
  if (!body.name || !body.url) return jsonResponse({ error: 'Missing name or url' }, 400);
  const item = await addShareSubscription(env, state, { id: body.id, name: String(body.name), url: String(body.url) });
  return jsonResponse({ ok: true, ...item });
}

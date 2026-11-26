import { SESSION_TTL_SECONDS } from './defaults';
import { createSession, getAdminPassword, getAdminUser, isDefaultCredential, requireAuth } from './auth';
import { renderLogin } from './panel';
import { saveSettings, saveSubscriptions, saveMihomoTemplate } from './state';
import { addShareSubscription, updateShareSubscription } from './subscriptions';
import type { AppState, Env } from './types';
import { fetchText, jsonResponse, normalizePath, parseConfigText } from './utils';

export async function handleApi(request: Request, env: Env, state: AppState): Promise<Response> {
  const url = new URL(request.url);
  const action = url.pathname.replace(/^\/api\/?/, '');

  if (action === 'login' && request.method === 'POST') {
    if (isDefaultCredential(env)) return renderLogin('默认 admin/admin 已禁用，请到 Cloudflare 控制台或 Wrangler 设置 ADMIN_PASSWORD 后再登录');

    const body = await request.formData();
    if (body.get('username') === getAdminUser(env) && body.get('password') === getAdminPassword(env)) {
      const session = await createSession(env);
      return new Response(null, {
        status: 303,
        headers: { Location: state.settings.panelPath || '/', 'Set-Cookie': `session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}` },
      });
    }
    return renderLogin('登录失败');
  }

  const authError = await requireAuth(request, env);
  if (authError) return authError;

  if (action === 'state') return renderState(state);
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const body = await readBody(request);

  if (action === 'settings') {
    state.settings.publicPath = normalizePath(body.publicPath, '/sub');
    state.settings.panelPath = normalizePath(body.panelPath, '/');
    state.settings.apiPath = normalizePath(body.apiPath, '/external-api');
    state.settings.apiToken = String(body.apiToken || '');
    state.settings.updatedAt = new Date().toISOString();
    await saveSettings(env, state);
    return jsonResponse({ ok: true, settings: state.settings });
  }

  if (action === 'mihomo/template') {
    const remoteUrl = String(body.url || state.mihomoTemplateUrl || '').trim();
    if (body.mode === 'fetch') {
      if (!remoteUrl) return jsonResponse({ error: 'Missing template URL' }, 400);
      state.mihomoTemplate = parseConfigText(await fetchText(remoteUrl, env));
      state.mihomoTemplateUrl = remoteUrl;
    } else {
      state.mihomoTemplate = parseConfigText(String(body.template || ''));
      state.mihomoTemplateUrl = remoteUrl;
    }
    delete state.mihomoTemplate['proxy-providers'];
    await saveMihomoTemplate(env, state);
    return jsonResponse({ ok: true });
  }

  if (action === 'subscription/add') {
    if (!String(body.name || '').trim() || !String(body.url || '').trim()) return jsonResponse({ error: 'Missing name or url' }, 400);
    const result = await addShareSubscription(env, state, { id: body.id, name: String(body.name), url: String(body.url) });
    return jsonResponse({ ok: true, ...result });
  }

  if (action === 'subscription/update') {
    const ids = body.id ? [String(body.id)] : state.shareSubs.map((sub) => sub.id);
    for (const id of ids) {
      await updateShareSubscription(env, state, id);
    }
    return jsonResponse({ ok: true });
  }

  if (action === 'subscription/delete') {
    const id = String(body.id || '');
    const removed = state.shareSubs.find((sub) => sub.id === id);
    state.shareSubs = state.shareSubs.filter((sub) => sub.id !== id);
    if (removed) delete state.mihomoProviders[removed.name];
    await Promise.all([saveSubscriptions(env, state), saveMihomoTemplate(env, state)]);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

function renderState(state: AppState): Response {
  return jsonResponse({
    settings: state.settings,
    subscriptions: state.shareSubs,
    publicUrls: {
      auto: state.settings.publicPath,
      v2ray: `${state.settings.publicPath}?target=v2ray`,
      mihomo: `${state.settings.publicPath}?target=mihomo`,
    },
  });
}

async function readBody(request: Request): Promise<any> {
  const contentType = request.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) return request.json();
  const form = await request.formData();
  return Object.fromEntries(form.entries());
}

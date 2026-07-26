import yaml from 'js-yaml';
import { COUNTRY_RULES } from './defaults';
import type { AppState, RemoteItem } from './types';
import { escapeHtml } from './utils';

export function renderLogin(error = ''): Response {
  return new Response(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>订阅管理登录</title>
  <style>${styles()}</style>
</head>
<body>
  <main class="login">
    <form method="post" action="/api/login" class="panel">
      <h1>订阅管理</h1>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}
      <label>用户名<input name="username" autocomplete="username" required></label>
      <label>密码<input name="password" type="password" autocomplete="current-password" required></label>
      <button type="submit">登录</button>
    </form>
  </main>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export function renderPanel(state: AppState): Response {
  return new Response(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>订阅管理面板</title>
  <style>${styles()}</style>
</head>
<body>
  <header class="topbar">
    <div class="head-main">
      <h1>订阅管理</h1>
    </div>
    <nav class="top-actions">
      <button type="button" data-copy="${escapeHtml(state.settings.publicPath)}">auto</button>
      <button type="button" data-copy="${escapeHtml(`${state.settings.publicPath}?target=sing-box`)}">sing-box</button>
      <button type="button" data-copy="${escapeHtml(`${state.settings.publicPath}?target=mihomo`)}">mihomo</button>
      <a href="${configPath(state)}">配置</a>
      <a href="${advancedPath(state)}">覆写与分组</a>
    </nav>
  </header>
  <main class="dashboard">
    <section class="hero-panel">
      <div>
        <h2>订阅输出</h2>
        <p class="muted">点击顶部按钮复制订阅地址。mihomo 订阅添加后会同步翻译为 sing-box 节点。</p>
      </div>
      <div class="stats">
        <span><strong>${state.singSubs.length}</strong><small>sing-box 集</small></span>
        <span><strong>${Object.keys(state.mihomoProviders).length}</strong><small>mihomo provider</small></span>
        <span><strong>${escapeHtml(state.singCache.updatedAt ? '已合并' : '未合并')}</strong><small>sing-box 缓存</small></span>
      </div>
    </section>
    <section class="work-grid subscription-grid">
      <div class="panel-block">
      <div class="block-head">
        <h2>sing-box 订阅集</h2>
        <span>${state.singSubs.length}</span>
      </div>
      <form data-api="sing/sub/add" class="subscription-form">
        <input name="name" placeholder="名称" required>
        <input name="url" placeholder="订阅 URL（JSON/YAML 自动识别）" required>
        <button>添加/覆盖</button>
      </form>
      <div class="table">${state.singSubs.map((sub) => `
        <form data-api="sing/sub/update" class="row">
          <input type="hidden" name="id" value="${escapeHtml(sub.id)}">
          <div class="item-main">
            <span>${escapeHtml(sub.name)}</span>
            <small>${escapeHtml(sub.url)}</small>
          </div>
          ${renderSubscriptionStatus(sub)}
          <button>更新</button>
          <button formaction="/api/sing/sub/delete" data-delete="${escapeHtml(sub.id)}">删除</button>
        </form>`).join('') || '<p class="muted">暂无 sing-box 订阅集</p>'}</div>
      </div>

      <div class="panel-block">
      <div class="block-head">
        <h2>mihomo proxy-providers</h2>
        <span>${Object.keys(state.mihomoProviders).length}</span>
      </div>
      <form data-api="mihomo/provider/add" class="subscription-form">
        <input name="name" placeholder="provider 名称" required>
        <input name="url" placeholder="Clash/Mihomo provider URL" required>
        <button>添加/覆盖</button>
      </form>
      <div class="table">${Object.entries(state.mihomoProviders).map(([name, provider]) => `
        <form data-api="mihomo/provider/delete" class="row provider-row">
          <input type="hidden" name="name" value="${escapeHtml(name)}">
          <div class="item-main">
            <span>${escapeHtml(name)}</span>
            <small>${escapeHtml(provider.url || '')}</small>
          </div>
          <button>删除</button>
        </form>`).join('') || '<p class="muted">暂无 proxy-providers</p>'}</div>
      </div>

      <div class="panel-block">
      <h2>sing-box 模板</h2>
      <form data-api="sing/template">
        <label>远程模板 URL<input name="url" value="${escapeHtml(state.singTemplateUrl || '')}" placeholder="https://example.com/sing-box.json"></label>
        <label>或直接编辑模板 JSON<textarea name="template" rows="10">${escapeHtml(JSON.stringify(state.singTemplate, null, 2))}</textarea></label>
        <div class="actions">
          <button name="mode" value="fetch">更新远程模板</button>
          <button name="mode" value="save">保存当前内容</button>
        </div>
      </form>
      </div>

      <div class="panel-block">
      <h2>mihomo 模板</h2>
      <form data-api="mihomo/template">
        <label>远程模板 URL<input name="url" value="${escapeHtml(state.mihomoTemplateUrl || '')}" placeholder="https://example.com/config.yaml"></label>
        <label>或直接编辑 YAML/JSON<textarea name="template" rows="10">${escapeHtml(yaml.dump(state.mihomoTemplate, { lineWidth: -1 }))}</textarea></label>
        <div class="actions">
          <button name="mode" value="fetch">更新远程模板</button>
          <button name="mode" value="save">保存当前内容</button>
        </div>
      </form>
      </div>
    </section>
  </main>
  <div id="toast"></div>
  <script>${panelScript()}</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export function renderAdvancedPanel(state: AppState): Response {
  return new Response(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>覆写与分组</title>
  <style>${styles()}</style>
</head>
<body>
  <header class="topbar">
    <div class="head-main">
      <h1>覆写与分组</h1>
      <a class="back-link" href="${escapeHtml(state.settings.panelPath)}">返回面板</a>
    </div>
  </header>
  <main class="layout">
    <section class="wide">
      <h2>sing-box 覆写</h2>
      <form data-api="sing/patches" class="split">
        <label>Android 额外配置 JSON<textarea name="android" rows="12">${escapeHtml(JSON.stringify(state.singPatches.android, null, 2))}</textarea></label>
        <label>其他平台额外配置 JSON<textarea name="other" rows="12">${escapeHtml(JSON.stringify(state.singPatches.other, null, 2))}</textarea></label>
        <button>保存并重新合并</button>
      </form>
    </section>
    <section class="wide">
      <h2>分组筛选规则</h2>
      <form data-api="sing/group-rules" class="group-rules">
        ${renderGroupRules(state)}
        <button>保存并重新合并</button>
      </form>
    </section>
  </main>
  <div id="toast"></div>
  <script>${panelScript()}</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export function renderConfigPanel(state: AppState): Response {
  return new Response(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>配置</title>
  <style>${styles()}</style>
</head>
<body>
  <header class="topbar">
    <div class="head-main">
      <h1>配置</h1>
      <a class="back-link" href="${escapeHtml(state.settings.panelPath)}">返回面板</a>
    </div>
  </header>
  <main class="layout">
    <section class="wide">
      <h2>路径与外部 API</h2>
      <form data-api="settings" class="settings-grid">
        <label>订阅路径<input name="publicPath" value="${escapeHtml(state.settings.publicPath)}"></label>
        <label>面板路径<input name="panelPath" value="${escapeHtml(state.settings.panelPath)}"></label>
        <label>暴露 API 路径<input name="apiPath" value="${escapeHtml(state.settings.apiPath)}"></label>
        <label>API Token<input name="apiToken" value="${escapeHtml(state.settings.apiToken)}" placeholder="留空则禁用外部 API"></label>
        <button>保存配置</button>
      </form>
    </section>
    <section class="wide">
      <h2>外部 API</h2>
      <pre class="code-block">POST ${escapeHtml(state.settings.apiPath || '/external-api')}
Authorization: Bearer ${escapeHtml(state.settings.apiToken || '<token>')}
Content-Type: application/json

{"type":"mihomo","name":"provider-name","url":"https://example.com/provider.yaml"}
{"type":"sing-box","name":"sing-name","url":"https://example.com/sing-box.json"}</pre>
    </section>
  </main>
  <div id="toast"></div>
  <script>${panelScript()}</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export function advancedPath(state: AppState): string {
  const base = state.settings.panelPath.replace(/\/+$/, '') || '';
  return `${base}/advanced`;
}

export function configPath(state: AppState): string {
  const base = state.settings.panelPath.replace(/\/+$/, '') || '';
  return `${base}/config`;
}

function renderGroupRules(state: AppState): string {
  const groups = extractTemplateGroups(state);
  if (groups.length === 0) return '<p class="muted">模板中没有可配置分组</p>';

  return groups.map((group) => {
    const rule = state.singGroupRules.find((item) => item.tag === group.tag) || { tag: group.tag };
    const includeRegions = rule.includeRegions ?? group.hasRegionPlaceholder;
    const excludeTypes = new Set(rule.excludeTypes || []);
    const includeGroupOrder = rule.includeGroups || group.groupRefs;
    const includeGroups = new Set(includeGroupOrder);
    const selectableItems = [
      ...(group.tag === '🏴‍☠️全球拦截' ? [{ tag: 'block', label: 'block' }] : []),
      { tag: '🔥AUTO', label: '🔥AUTO' },
      { tag: 'direct', label: 'direct' },
      ...groups.filter((item) => item.tag !== group.tag).map((item) => ({ tag: item.tag, label: item.tag })),
    ];
    const itemByTag = new Map(selectableItems.map((item) => [item.tag, item]));
    const includedItems = includeGroupOrder.map((tag) => itemByTag.get(tag)).filter(Boolean) as Array<{ tag: string; label: string }>;
    const availableItems = selectableItems.filter((item) => !includeGroups.has(item.tag));
    return `
      <div class="group-rule" data-tag="${escapeHtml(group.tag)}">
        <div class="group-head">
          <div class="item-main">
            <strong>${escapeHtml(group.tag)}</strong>
            <small>${escapeHtml(group.type)} · 模板出站 ${group.outbounds.length}</small>
          </div>
          <label class="check"><input type="checkbox" name="includeAll" ${rule.includeAll ? 'checked' : ''}>包含所有节点</label>
          <label class="check"><input type="checkbox" name="includeRegions" ${includeRegions ? 'checked' : ''}>包含国家分组</label>
        </div>
        <div class="group-controls">
          <label>排除名字关键字/正则<input name="excludeName" value="${escapeHtml(rule.excludeName || '')}" placeholder="例如 CF|中国|HY"></label>
          <div class="dual-list">
            <div>
              <span>未包含</span>
              <ul data-list="available">${availableItems.map((item) => `<li data-value="${escapeHtml(item.tag)}">${escapeHtml(item.label)}</li>`).join('')}</ul>
            </div>
            <div>
              <span>已包含</span>
              <ul data-list="included">${includedItems.map((item) => `<li data-value="${escapeHtml(item.tag)}">${escapeHtml(item.label)}</li>`).join('')}</ul>
            </div>
          </div>
          <fieldset>
            <legend>排除协议</legend>
            ${PROXY_TYPES.map((type) => `<label class="check"><input type="checkbox" name="excludeTypes" value="${type}" ${excludeTypes.has(type) ? 'checked' : ''}>${type}</label>`).join('')}
          </fieldset>
        </div>
      </div>`;
  }).join('');
}

function renderSubscriptionStatus(sub: RemoteItem): string {
  if (sub.status === 'pending') return '<small class="status status-pending">待拉取</small>';
  if (sub.status === 'error') return `<small class="status status-error">失败：${escapeHtml(sub.lastError || '等待重试')}</small>`;
  return `<small class="status">${escapeHtml(sub.updatedAt || '未更新')}</small>`;
}

const PROXY_TYPES = ['vmess', 'vless', 'trojan', 'anytls', 'hysteria', 'hysteria2', 'tuic'];

function extractTemplateGroups(state: AppState): Array<{ tag: string; type: string; outbounds: string[]; hasRegionPlaceholder: boolean; groupRefs: string[] }> {
  const outbounds = Array.isArray(state.singTemplate?.outbounds) ? state.singTemplate.outbounds : [];
  const groupTags = new Set(outbounds.filter((outbound) => outbound?.tag && !isInternalGroup(outbound.tag) && isConfigurableGroup(outbound)).map((outbound) => outbound.tag));
  return outbounds
    .filter((outbound) => outbound?.tag && !isInternalGroup(outbound.tag) && isConfigurableGroup(outbound) && Array.isArray(outbound.outbounds))
    .map((outbound) => ({
      tag: outbound.tag,
      type: outbound.type,
      outbounds: outbound.outbounds,
      hasRegionPlaceholder: outbound.outbounds.some((tag: string) => isRegionTag(tag)),
      groupRefs: outbound.outbounds.filter((tag: string) => groupTags.has(tag) || tag === 'direct' || tag === '🔥AUTO' || (outbound.tag === '🏴‍☠️全球拦截' && tag === 'block')),
    }));
}

function isConfigurableGroup(outbound: any): boolean {
  return ['selector', 'urltest', 'url-test', 'fallback', 'loadbalance'].includes(outbound?.type);
}

function isInternalGroup(tag: string): boolean {
  return tag === '🔥AUTO' || isRegionTag(tag);
}

function isRegionTag(tag: string): boolean {
  return tag === '🌐OTHER' || COUNTRY_RULES.some((rule) => rule.tag === tag);
}

function styles(): string {
  return `
    :root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, system-ui, sans-serif; background: #000; color: #ccc; }
    body { margin: 0; background: #000; color: #ccc; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-bottom: 1px solid #222; background: #050505; position: sticky; top: 0; z-index: 2; }
    .head-main { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; }
    h1 { margin: 0; font-size: 19px; font-weight: 650; letter-spacing: 0; white-space: nowrap; color: #fff; }
    h2 { margin: 0 0 9px; font-size: 15px; font-weight: 650; letter-spacing: 0; color: #f2f2f2; }
    h3 { margin: 2px 0 0; font-size: 13px; letter-spacing: 0; color: #aaa; }
    nav { display: flex; gap: 5px; flex-wrap: wrap; }
    a, button { color: #4fc3f7; }
    .top-actions a, .top-actions button { border: 1px solid #333; background: #080808; color: #ccc; padding: 5px 8px; font-size: 12px; line-height: 1.2; text-decoration: none; border-radius: 2px; }
    .top-actions a:hover, .top-actions button:hover { background: #111; color: #fff; border-color: #444; }
    .dashboard { display: grid; gap: 10px; padding: 12px; max-width: 1320px; margin: 0 auto; }
    .hero-panel { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #060606; border: 1px solid #222; border-radius: 2px; padding: 10px 12px; }
    .hero-panel h2 { margin-bottom: 4px; }
    .hero-panel p { margin: 0; font-size: 13px; }
    .stats { display: flex; gap: 6px; flex-wrap: wrap; }
    .stats span { min-width: 92px; display: grid; gap: 2px; padding: 7px 9px; border: 1px solid #222; border-radius: 2px; background: #020202; }
    .stats strong { font-size: 15px; color: #fff; }
    .stats small { font-size: 12px; }
    .work-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .subscription-grid { align-items: start; }
    .layout { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 12px; max-width: 1320px; margin: 0 auto; }
    section, .panel, .panel-block { background: #060606; border: 1px solid #222; border-radius: 2px; padding: 12px; }
    .panel-block { display: grid; gap: 9px; align-content: start; }
    .block-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .block-head h2 { margin: 0; }
    .block-head span { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 20px; padding: 0 6px; border: 1px solid #2a2a2a; border-radius: 2px; background: #000; color: #888; font-size: 12px; }
    form { display: grid; gap: 7px; }
    .inline { grid-template-columns: minmax(120px, 180px) minmax(240px, 1fr) auto; align-items: end; }
    .subscription-form { grid-template-columns: minmax(110px, 150px) minmax(220px, 1fr) auto; align-items: center; gap: 7px; }
    .header-settings { grid-template-columns: minmax(110px, 150px) minmax(110px, 150px) auto; align-items: end; gap: 8px; max-width: 430px; }
    .header-settings label { font-size: 12px; }
    .header-settings input { padding: 6px 8px; }
    .wide { grid-column: 1 / -1; }
    .split { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .split button { grid-column: 1 / -1; justify-self: start; }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .settings-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .settings-grid button { justify-self: start; }
    .code-block { margin: 0; overflow: auto; white-space: pre-wrap; border: 1px solid #222; border-radius: 2px; padding: 10px; background: #000; color: #aaa; }
    .advanced-link, .back-link { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; border: 1px solid #333; background: #080808; color: #ccc; border-radius: 2px; padding: 5px 8px; font-size: 12px; }
    .advanced-link:hover, .back-link:hover { background: #111; color: #fff; border-color: #444; }
    .advanced-link { position: fixed; right: 18px; bottom: 18px; z-index: 3; }
    .group-rules { gap: 10px; }
    .group-rule { display: grid; gap: 9px; border: 1px solid #222; border-radius: 2px; padding: 10px; background: #020202; }
    .group-head { display: grid; grid-template-columns: minmax(200px, 1fr) auto auto; gap: 10px; align-items: center; }
    .group-controls { display: grid; grid-template-columns: minmax(220px, 300px) minmax(340px, 1fr) minmax(0, 1fr); gap: 10px; align-items: start; }
    .dual-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .dual-list span { display: block; margin-bottom: 5px; color: #888; font-size: 12px; }
    .dual-list ul { min-height: 164px; max-height: 220px; overflow: auto; margin: 0; padding: 6px; list-style: none; border: 1px solid #222; border-radius: 2px; background: #000; }
    .dual-list li { padding: 6px 7px; border-radius: 2px; color: #ccc; cursor: pointer; user-select: none; }
    .dual-list li + li { margin-top: 3px; }
    .dual-list li:hover { background: #111; color: #fff; }
    fieldset { border: 1px solid #222; border-radius: 2px; padding: 7px 8px; display: flex; flex-wrap: wrap; gap: 7px 10px; margin: 0; }
    legend { color: #888; padding: 0 4px; font-size: 12px; }
    .check { display: inline-flex; grid-auto-flow: column; align-items: center; gap: 6px; color: #bbb; white-space: nowrap; }
    .check input { width: auto; margin: 0; }
    label { display: grid; gap: 5px; font-size: 12px; color: #888; }
    input, textarea, select { box-sizing: border-box; width: 100%; border: 1px solid #333; border-radius: 2px; padding: 6px 8px; font: inherit; color: #ddd; background: #000; }
    input:focus, textarea:focus, select:focus { outline: 1px solid #4fc3f7; outline-offset: 0; border-color: #4fc3f7; }
    input::placeholder { color: #555; }
    textarea { resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; line-height: 1.42; }
    button { border: 1px solid #333; background: #080808; color: #ddd; border-radius: 2px; padding: 6px 9px; font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap; }
    button:hover { background: #111; color: #fff; border-color: #4fc3f7; }
    .subscription-form button, .actions button:first-child, .settings-grid button, .split button { color: #4fc3f7; border-color: #333; }
    button[formaction], .row button:last-child { border-color: #333; background: #080808; color: #d98d8d; }
    button[formaction]:hover, .row button:last-child:hover { border-color: #7a3a3a; background: #120808; color: #ffb0b0; }
    .table { display: grid; gap: 5px; }
    .row { grid-template-columns: minmax(180px, 1fr) minmax(120px, 142px) auto auto; align-items: center; gap: 7px; border-top: 1px solid #1c1c1c; padding-top: 5px; }
    .provider-row { grid-template-columns: minmax(180px, 1fr) auto; }
    .item-main { display: grid; gap: 3px; min-width: 0; }
    .item-main span { color: #ddd; }
    .status { overflow-wrap: anywhere; }
    .status-pending { color: #d6b35a; }
    .status-error, .error { color: #ff7777; }
    small, .muted { color: #777; overflow-wrap: anywhere; }
    .login { min-height: 100vh; display: grid; place-items: center; padding: 18px; box-sizing: border-box; }
    .login .panel { width: min(380px, 100%); }
    .error { margin: 0; }
    #toast { position: fixed; right: 18px; bottom: 18px; background: #eee; color: #000; padding: 9px 11px; border-radius: 2px; opacity: 0; transform: translateY(8px); transition: 160ms ease; max-width: min(420px, calc(100vw - 36px)); }
    #toast.show { opacity: 1; transform: translateY(0); }
    @media (max-width: 980px) { .topbar, .head-main { align-items: flex-start; flex-direction: column; } .header-settings { grid-template-columns: 1fr 1fr auto; max-width: 100%; } }
    @media (max-width: 860px) { .layout, .dashboard { grid-template-columns: 1fr; padding: 10px; } .work-grid, .hero-panel, .inline, .subscription-form, .row, .provider-row, .split, .header-settings, .group-head, .group-controls, .settings-grid { grid-template-columns: 1fr; flex-direction: column; align-items: stretch; } .wide { grid-column: auto; } }
  `;
}

function panelScript(): string {
  return `
    const toast = document.querySelector('#toast');
    function show(message) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2400);
    }
    document.querySelectorAll('form[data-api]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitter = event.submitter;
        const api = submitter?.getAttribute('formaction')?.replace('/api/', '') || form.dataset.api;
        const body = api === 'sing/group-rules' ? readGroupRules(form) : Object.fromEntries(new FormData(form).entries());
        if (api === 'sing/group-rules') {
          const cycle = findGroupCycle(body.rules);
          if (cycle) {
            show('分组循环: ' + cycle);
            return;
          }
        }
        if (submitter?.dataset.delete) body.id = submitter.dataset.delete;
        if (submitter?.name) body[submitter.name] = submitter.value;
        const res = await fetch('/api/' + api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok || data.error) {
          show(data.error || '请求失败');
          return;
        }
        show('已保存');
        setTimeout(() => location.reload(), 500);
      });
    });
    function readGroupRules(form) {
      const rules = Array.from(form.querySelectorAll('.group-rule')).map((card) => ({
        tag: card.dataset.tag,
        includeAll: card.querySelector('input[name="includeAll"]').checked,
        includeRegions: card.querySelector('input[name="includeRegions"]').checked,
        includeGroups: Array.from(card.querySelectorAll('[data-list="included"] li')).map((item) => item.dataset.value),
        excludeName: card.querySelector('input[name="excludeName"]').value.trim(),
        excludeTypes: Array.from(card.querySelectorAll('input[name="excludeTypes"]:checked')).map((input) => input.value),
      }));
      return { rules };
    }
    function findGroupCycle(rules) {
      const graph = new Map(rules.map((rule) => [rule.tag, rule.includeGroups || []]));
      const visiting = new Set();
      const visited = new Set();
      function visit(tag, path) {
        if (visiting.has(tag)) return path.concat(tag).join(' -> ');
        if (visited.has(tag)) return null;
        visiting.add(tag);
        for (const next of graph.get(tag) || []) {
          if (!graph.has(next)) continue;
          const cycle = visit(next, path.concat(tag));
          if (cycle) return cycle;
        }
        visiting.delete(tag);
        visited.add(tag);
        return null;
      }
      for (const tag of graph.keys()) {
        const cycle = visit(tag, []);
        if (cycle) return cycle;
      }
      return null;
    }
    document.querySelectorAll('[data-copy]').forEach((button) => {
      button.addEventListener('click', async () => {
        const value = new URL(button.dataset.copy, location.href).toString();
        await navigator.clipboard.writeText(value);
        show('已复制');
      });
    });
    document.querySelectorAll('.dual-list li').forEach((item) => {
      item.addEventListener('dblclick', () => {
        const current = item.closest('ul');
        const pair = item.closest('.dual-list');
        const targetName = current.dataset.list === 'available' ? 'included' : 'available';
        pair.querySelector('[data-list="' + targetName + '"]').appendChild(item);
      });
    });
  `;
}

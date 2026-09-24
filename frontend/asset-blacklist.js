(() => {
  'use strict';
  const root = document.getElementById('assetBlacklistRoot');
  if (!root) return;
  const state = { items: [], markets: [], categories: [], query: '', loaded: false, loading: null, error: '', acknowledgedSymbol: '' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const current = () => state.items.find(item => item.symbol === String(document.getElementById('tradeAsset')?.value || '').trim().toUpperCase());
  const date = value => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(value)) : '—';
  function notify(message) { if (typeof window.showToast === 'function') window.showToast(message); else window.alert(message); }

  function load() {
    if (state.loading) return state.loading;
    if (!window.healthyTrendApi?.isAuthenticated()) return Promise.resolve();
    state.loaded = false;
    state.loading = window.healthyTrendApi.request('/api/asset-blacklist').then(result => {
      state.items = Array.isArray(result.items) ? result.items : [];
      state.markets = Array.isArray(result.markets) ? result.markets : [];
      state.categories = Array.isArray(result.categories) ? result.categories : [];
      state.error = '';
      state.loaded = true;
      renderOptions();
    }).catch(error => {
      state.items = [];
      state.error = error.message || 'Não foi possível carregar a Blacklist.';
    }).finally(() => {
      state.loading = null;
      renderRows();
      renderTradeNotice();
    });
    return state.loading;
  }

  root.innerHTML = `<div class="ab-page">
    <header class="ab-hero"><div class="ab-hero-content"><span class="ab-eyebrow">CARTEIRA & RISCO</span><div class="ab-title"><span aria-hidden="true">☠</span><h1>Ativos <em>Blacklist</em></h1></div><p>Opere o que combina com você.<br>Evite o que cobra um preço que não aparece no gráfico.</p></div></header>
    <section class="ab-panel" aria-label="Meus ativos em Blacklist"><div class="ab-panel-head"><h2>Meus Ativos em Blacklist <span id="abCount">0</span></h2><div class="ab-tools"><label class="ab-search"><span aria-hidden="true">⌕</span><input id="abSearch" type="search" placeholder="Buscar ativo..." aria-label="Buscar ativo"></label><button class="ab-add" id="abAdd" type="button">⊕ &nbsp;Adicionar Ativo</button></div></div><div id="abList"></div></section>
    <aside class="ab-focus"><span class="ab-focus-icon" aria-hidden="true">◎</span><div><h2>Foco no que funciona para você</h2><p>Identifique os ativos que não combinam com seu perfil e mantenha sua operação mais alinhada, consistente e tranquila.</p></div></aside>
    </div><div class="ab-modal-backdrop" id="abModal" hidden><div class="ab-modal" role="dialog" aria-modal="true" aria-labelledby="abModalTitle"><header><div><small>CARTEIRA & RISCO</small><h2 id="abModalTitle">Adicionar ativo</h2></div><button type="button" class="ab-close" id="abClose" aria-label="Fechar">×</button></header><form id="abForm"><input type="hidden" name="id"><div class="ab-form-grid"><label>Mercado<select name="market" required></select></label><label>Ticker / símbolo<input name="symbol" list="abInstrumentSuggestions" maxlength="20" required placeholder="Ex.: WDO" autocomplete="off"></label><label class="ab-wide">Nome do ativo<input name="name" maxlength="120" placeholder="Ex.: Mini Dólar"></label><label class="ab-wide">Por que prefere evitar este ativo?<textarea name="reason" maxlength="2000" required rows="4" placeholder="Registre o motivo com suas próprias palavras."></textarea></label><label class="ab-wide">Categoria<select name="category" required></select></label></div><fieldset><legend>Restrição pessoal</legend><label class="ab-choice ab-choice-alert"><input type="radio" name="restrictionLevel" value="alert" checked><span><b>⚠ Alertar</b><small>O sistema avisa no Novo Trade e pede confirmação para continuar.</small></span></label><label class="ab-choice ab-choice-block"><input type="radio" name="restrictionLevel" value="block"><span><b>☠ Bloquear</b><small>Impede registrar uma operação com este ativo enquanto a regra existir.</small></span></label></fieldset><footer><button type="button" class="secondary" id="abCancel">Cancelar</button><button type="submit" class="ab-add" id="abSubmit">Salvar ativo</button></footer></form></div></div><datalist id="abInstrumentSuggestions"></datalist>`;
  const list = root.querySelector('#abList');
  const modal = root.querySelector('#abModal');
  const form = root.querySelector('#abForm');
  const instrumentList = root.querySelector('#abInstrumentSuggestions');
  const catalog = window.HealthyTrendInstruments;
  const dynamicInstruments = () => typeof tradeAssetSuggestions !== 'undefined' ? [...tradeAssetSuggestions.values()] : [];
  function syncInstrumentOptions() {
    const market = form.elements.market.value;
    const items = catalog?.forMarket(market, dynamicInstruments()) || [];
    instrumentList.replaceChildren(...items.map(item => new Option(`${item.symbol} — ${item.name}`, item.symbol)));
  }
  function fillInstrumentName() {
    const item = catalog?.find(form.elements.symbol.value, form.elements.market.value, dynamicInstruments());
    if (item && !form.elements.name.value.trim()) form.elements.name.value = item.name || '';
  }

  function renderOptions() {
    for (const [field, values] of [['market', state.markets], ['category', state.categories]]) {
      const select = form.elements[field];
      const selected = select.value;
      select.replaceChildren(...values.map(value => new Option(value, value)));
      if (values.includes(selected)) select.value = selected;
    }
    syncInstrumentOptions();
  }

  function renderRows() {
    root.querySelector('#abCount').textContent = String(state.items.length);
    if (state.error) { list.innerHTML = `<div class="ab-empty"><p>${escape(state.error)}</p><button type="button" class="secondary" data-action="reload">Tentar novamente</button></div>`; return; }
    if (!state.loaded) { list.innerHTML = '<div class="ab-empty">Carregando ativos...</div>'; return; }
    const term = state.query.trim().toLocaleLowerCase('pt-BR');
    const items = state.items.filter(item => [item.symbol, item.name, item.reason, item.category].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(term)));
    if (!items.length) {
      list.innerHTML = `<div class="ab-empty"><p>${term ? 'Nenhum ativo encontrado para esta busca.' : 'Registre ativos que você prefere evitar e deixe o sistema lembrá-lo antes da próxima operação.'}</p>${term ? '' : '<button type="button" class="ab-add" data-action="add">Adicionar primeiro ativo</button>'}</div>`;
      return;
    }
    list.innerHTML = `<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>ATIVO</th><th>MERCADO</th><th>MOTIVO</th><th>CATEGORIA</th><th>RESTRIÇÃO</th><th>DATA</th><th>AÇÕES</th></tr></thead><tbody>${items.map(item => `<tr><td data-label="ATIVO"><b>${escape(item.symbol)}</b><small>${escape(item.name || item.symbol)}</small></td><td data-label="MERCADO"><span class="ab-market">${escape(item.market)}</span></td><td class="ab-reason" data-label="MOTIVO">${escape(item.reason)}</td><td data-label="CATEGORIA"><span class="ab-category">${escape(item.category)}</span></td><td data-label="RESTRIÇÃO"><span class="ab-restriction ${item.restrictionLevel === 'block' ? 'block' : 'alert'}">${item.restrictionLevel === 'block' ? '☠ Bloquear' : '⚠ Alertar'}</span></td><td data-label="DATA">${date(item.createdAt)}</td><td data-label="AÇÕES"><div class="ab-actions"><button type="button" data-action="edit" data-id="${escape(item.id)}" aria-label="Editar ${escape(item.symbol)}" title="Editar ativo">✎</button><button type="button" data-action="delete" data-id="${escape(item.id)}" aria-label="Excluir ${escape(item.symbol)}" title="Remover da Blacklist">🗑</button></div></td></tr>`).join('')}</tbody></table></div>`;
  }

  async function open(item) {
    if (!state.loaded) await load();
    if (!state.loaded) return notify('Não foi possível carregar as opções da Blacklist. Tente novamente.');
    form.reset();
    form.elements.id.value = item?.id || '';
    for (const key of ['market', 'symbol', 'name', 'reason', 'category']) if (item?.[key] != null) form.elements[key].value = item[key];
    if (item) form.querySelector(`[name="restrictionLevel"][value="${item.restrictionLevel}"]`).checked = true;
    syncInstrumentOptions();
    root.querySelector('#abModalTitle').textContent = item ? `Editar ${item.symbol}` : 'Adicionar ativo';
    modal.hidden = false;
    form.elements.market.focus();
  }
  function close() { modal.hidden = true; }
  root.querySelector('#abAdd').addEventListener('click', () => open());
  root.querySelector('#abClose').addEventListener('click', close);
  root.querySelector('#abCancel').addEventListener('click', close);
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.hidden) close(); });
  root.querySelector('#abSearch').addEventListener('input', event => { state.query = event.target.value; renderRows(); });
  list.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const item = state.items.find(entry => entry.id === button.dataset.id);
    if (button.dataset.action === 'add') return open();
    if (button.dataset.action === 'reload') return load();
    if (button.dataset.action === 'edit' && item) return open(item);
    if (button.dataset.action !== 'delete' || !item || !window.confirm(`Remover ${item.symbol} da sua Blacklist?`)) return;
    try { await window.healthyTrendApi.request(`/api/asset-blacklist/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); await load(); notify(`${item.symbol} removido da Blacklist.`); }
    catch (error) { notify(error.message || 'Não foi possível remover o ativo.'); }
  });
  form.elements.symbol.addEventListener('input', event => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9.\-]/g, ''); });
  form.elements.market.addEventListener('change', () => { syncInstrumentOptions(); fillInstrumentName(); });
  form.elements.symbol.addEventListener('blur', fillInstrumentName);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const id = values.id; delete values.id;
    const submit = root.querySelector('#abSubmit'); submit.disabled = true;
    try {
      await window.healthyTrendApi.request(id ? `/api/asset-blacklist/${encodeURIComponent(id)}` : '/api/asset-blacklist', { method: id ? 'PUT' : 'POST', body: JSON.stringify(values) });
      close(); await load(); notify(id ? 'Ativo atualizado.' : 'Ativo adicionado à Blacklist.');
    } catch (error) { notify(error.message || 'Não foi possível salvar o ativo.'); }
    finally { submit.disabled = false; }
  });

  function renderTradeNotice() {
    const asset = document.getElementById('tradeAsset'); const field = asset?.closest('.field'); if (!asset || !field) return;
    let notice = document.getElementById('tradeBlacklistNotice');
    if (!notice) { notice = document.createElement('div'); notice.id = 'tradeBlacklistNotice'; notice.className = 'ab-trade-notice'; notice.setAttribute('role', 'alert'); field.append(notice); }
    const item = current();
    if (!item) { notice.hidden = true; state.acknowledgedSymbol = ''; return; }
    const blocked = item.restrictionLevel === 'block';
    notice.hidden = false;
    notice.classList.toggle('blocked', blocked);
    notice.innerHTML = `<b>${blocked ? '☠ ATIVO BLOQUEADO' : '⚠ ATIVO NA BLACKLIST'} · ${escape(item.symbol)}${item.name ? ' — ' + escape(item.name) : ''}</b><p>Você colocou este ativo na Blacklist porque:</p><blockquote>“${escape(item.reason)}”</blockquote><p>Lembre-se por que você decidiu não operar este ativo.</p><div class="ab-notice-actions"><button type="button" data-choice="other">Escolher outro ativo</button>${blocked ? '<button type="button" data-choice="list">Consultar Blacklist →</button>' : '<button type="button" data-choice="continue">Continuar mesmo assim</button>'}</div>${blocked ? '' : `<label class="ab-ack" ${state.acknowledgedSymbol === item.symbol ? '' : 'hidden'}><input type="checkbox" ${state.acknowledgedSymbol === item.symbol ? 'checked' : ''}> Estou ciente de que este ativo está na minha Blacklist e desejo continuar.</label>`}`;
  }
  document.addEventListener('input', event => { if (event.target?.id === 'tradeAsset') { state.acknowledgedSymbol = ''; renderTradeNotice(); } });
  document.addEventListener('change', event => { if (event.target?.id === 'tradeAsset') renderTradeNotice(); });
  document.addEventListener('click', event => {
    const button = event.target.closest('#tradeBlacklistNotice [data-choice]'); if (!button) return;
    if (button.dataset.choice === 'list') return window.go('assetblacklist');
    if (button.dataset.choice === 'other') { const asset = document.getElementById('tradeAsset'); asset.value = ''; asset.focus(); asset.dispatchEvent(new Event('input', { bubbles: true })); return; }
    const label = document.querySelector('#tradeBlacklistNotice .ab-ack'); if (label) { label.hidden = false; label.querySelector('input')?.focus(); }
  });
  document.addEventListener('change', event => { if (event.target.matches('#tradeBlacklistNotice .ab-ack input')) state.acknowledgedSymbol = event.target.checked ? current()?.symbol || '' : ''; });

  const oldPayload = window.plannerPayload;
  if (typeof oldPayload === 'function') window.plannerPayload = function (...args) { const plan = oldPayload.apply(this, args); plan.blacklistOverride = Boolean(current()?.restrictionLevel === 'alert' && state.acknowledgedSymbol === current()?.symbol); return plan; };
  async function allowed() {
    if (!state.loaded) await load();
    if (!state.loaded) { notify('Não foi possível verificar a Blacklist. Tente novamente antes de registrar.'); return false; }
    const item = current();
    if (!item) return true;
    renderTradeNotice();
    if (item.restrictionLevel === 'block') { notify(`${item.symbol} está bloqueado pela sua regra pessoal. Consulte a Blacklist.`); return false; }
    if (state.acknowledgedSymbol !== item.symbol) { notify('Confirme que deseja continuar com este ativo da Blacklist.'); return false; }
    return true;
  }
  const oldSave = window.saveTradePlan;
  if (typeof oldSave === 'function') window.saveTradePlan = async function (...args) { if (!await allowed()) return; return oldSave.apply(this, args); };
  const registerButton = [...document.querySelectorAll('#newtrade button.primary')].find(button => button.textContent.includes('Registrar trade'));
  if (registerButton) registerButton.onclick = window.saveTradePlan;
  const oldManual = window.confirmTradeExecution;
  if (typeof oldManual === 'function') window.confirmTradeExecution = async function (...args) { if (!await allowed()) return; return oldManual.apply(this, args); };
  const oldGo = window.go;
  window.go = function (page, ...args) { const result = oldGo.call(this, page, ...args); if (page === 'assetblacklist' || page === 'newtrade') load(); if (page === 'newtrade') renderTradeNotice(); return result; };
  window.addEventListener('healthyTrend:authenticated', () => { state.items = []; state.loaded = false; load(); });
  window.AssetBlacklist = { load, current, renderTradeNotice };
  renderRows();
  if (window.healthyTrendApi?.isAuthenticated()) load();
})();

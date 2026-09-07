(function () {
  const api = window.MARKET_DATA_API_URL || 'http://localhost:8787/api';
  const storageKey = 'healthy-trend-market-scans-watchlist-v1';
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const number = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '—';
  const percent = (value) => Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? '+' : ''}${number(value)}%` : '—';
  const volume = (value) => Number.isFinite(Number(value)) ? new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : '—';
  let payload = null;
  let selectedScan = 'rs-leaders';

  function watched() { try { return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]')); } catch { return new Set(); } }
  function saveWatched(values) { try { localStorage.setItem(storageKey, JSON.stringify([...values].sort())); } catch {} }
  function isPro() { return typeof isProfessional === 'function' && isProfessional(); }
  function selectedCard() { return payload?.cards?.find((card) => card.id === selectedScan) || payload?.cards?.[0]; }
  function formattedUpdate(value) { return value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }) : 'aguardando primeira atualização'; }

  function upgrade() {
    return `<section class="market-scans-upgrade"><div class="market-scans-pro-pill">PRO</div><div class="eyebrow">Radar de mercado</div><h1>Encontre onde algo interessante está acontecendo.</h1><p>Os Scans de Mercado reduzem o universo acompanhado a uma lista objetiva de ativos que merecem atenção — sem substituir o seu critério, o gráfico ou o setup.</p><div class="market-scans-upgrade-grid"><div><b>🚀 Movimentos e fluxo</b><span>Altas, quedas e volume fora do padrão.</span></div><div><b>🏆 Força e tendência</b><span>RS, aceleração, ATR e estrutura saudável.</span></div><div><b>☆ Acompanhar</b><span>Leve ativos para a watchlist e aguarde o seu gatilho.</span></div></div><button class="primary" type="button" onclick="go('plan')">Desbloquear Scans de Mercado →</button><small>Disponível no plano Professional.</small></section>`;
  }
  function cardMarkup(card) {
    const active = card.id === selectedCard()?.id;
    const unavailable = !card.available;
    return `<button class="market-scan-card ${active ? 'active' : ''} ${unavailable ? 'unavailable' : ''}" type="button" data-scan="${esc(card.id)}"><i>${card.icon}</i><span><b>${esc(card.title)}</b><small>${esc(card.description)}</small></span><strong>${unavailable ? '—' : card.count}</strong></button>`;
  }
  function resultRows(card) {
    if (!card.available) return `<div class="market-scans-empty"><b>Dados em preparação</b><span>Este scan será ativado na próxima atualização diária do cache, quando volume, ATR e médias forem registrados.</span></div>`;
    if (!card.results.length) return `<div class="market-scans-empty"><b>Nenhum ativo no filtro agora</b><span>Não é uma recomendação negativa; apenas não há ativos que atendam ao critério nesta atualização.</span></div>`;
    const tracked = watched();
    return `<div class="market-scans-table-wrap"><table class="market-scans-table"><thead><tr><th>Ativo</th><th>Evento</th><th>Hoje</th><th>Volume</th><th>RS</th><th>ATR%</th><th>Status</th><th></th></tr></thead><tbody>${card.results.map((item) => `<tr><td><button type="button" class="scan-asset" data-open-ticker="${esc(item.symbol)}"><b>${esc(item.symbol)}</b><small>${esc(item.sector)}</small></button></td><td>${esc(card.title)}</td><td class="${Number(item.dayChangePct) >= 0 ? 'positive' : 'negative'}">${percent(item.dayChangePct)}</td><td>${item.volumeRatio ? `${number(item.volumeRatio)}× <small>${volume(item.volume)}</small>` : '—'}</td><td><span class="scan-rs">${item.score ?? '—'}</span></td><td>${item.atrPct == null ? '—' : `${number(item.atrPct)}%`}</td><td><span class="scan-status">${esc(item.status)}</span></td><td><button type="button" class="scan-watch ${tracked.has(item.symbol) ? 'tracked' : ''}" data-watch-ticker="${esc(item.symbol)}">${tracked.has(item.symbol) ? '★ Acompanhando' : '☆ Acompanhar'}</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  function render() {
    const root = document.getElementById('marketScansRoot');
    if (!root) return;
    if (!isPro()) { root.innerHTML = upgrade(); return; }
    if (!payload) { root.innerHTML = '<div class="market-scans-loading">Preparando o radar de mercado…</div>'; return; }
    const card = selectedCard();
    if (!card) { root.innerHTML = `<div class="market-scans-loading">${esc(payload.disclaimer || 'Não foi possível carregar os scans agora.')}</div>`; return; }
    root.innerHTML = `<section class="market-scans-shell"><header class="market-scans-hero"><div><div class="eyebrow">Scans de Mercado <span>PRO</span></div><h1>Encontre onde algo interessante está acontecendo.</h1><p>O Scan reduz o universo; a decisão, a leitura de contexto e a validação do setup continuam sendo suas.</p></div><div class="market-scans-update"><b>Última atualização</b><span>${formattedUpdate(payload.updatedAt)}</span><small>${payload.universe.total} ativos acompanhados</small></div></header><section class="market-scans-relationship"><div><b>Força Relativa</b><span>Quem está forte?</span></div><i>→</i><div><b>Ciclo de Mercado</b><span>O ambiente está favorável?</span></div><i>→</i><div class="current"><b>Scans</b><span>Onde merece atenção agora?</span></div><i>→</i><div><b>Rubric</b><span>Quantas probabilidades se alinham?</span></div></section><section class="market-scans-grid">${payload.cards.map(cardMarkup).join('')}</section><section class="market-scans-results"><header><div><div class="eyebrow">Scan selecionado</div><h2>${card.icon} ${esc(card.title)}</h2><p>${esc(card.criteria)} · ${esc(card.description)}</p></div><div class="market-scans-watch-count">☆ ${watched().size} na watchlist</div></header>${resultRows(card)}</section><footer class="market-scans-disclaimer">${esc(payload.disclaimer)}</footer></section>`;
    root.querySelectorAll('[data-scan]').forEach((button) => button.addEventListener('click', () => { selectedScan = button.dataset.scan; render(); }));
    root.querySelectorAll('[data-watch-ticker]').forEach((button) => button.addEventListener('click', () => {
      const values = watched(); const ticker = button.dataset.watchTicker;
      values.has(ticker) ? values.delete(ticker) : values.add(ticker); saveWatched(values); render();
    }));
    root.querySelectorAll('[data-open-ticker]').forEach((button) => button.addEventListener('click', () => openTicker(button.dataset.openTicker)));
  }
  function openTicker(ticker) {
    go('fundamentals');
    requestAnimationFrame(() => { const input = document.getElementById('fundTicker'); const form = document.getElementById('fundSearch'); if (input && form) { input.value = ticker; form.requestSubmit(); } });
  }
  async function load() {
    if (!isPro()) { render(); return; }
    render();
    try { const response = await fetch(`${api}/market-scans`); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar os scans.'); payload = data; if (!payload.cards?.some((card) => card.id === selectedScan)) selectedScan = payload.cards?.[0]?.id; }
    catch (error) { payload = { cards: [], universe: { total: 0 }, updatedAt: null, disclaimer: error.message }; }
    render();
  }
  function init() {
    const nav = document.querySelector('.sidebar'); const main = document.querySelector('main.main');
    if (!nav || !main) return;
    if (!document.getElementById('marketscans')) main.insertAdjacentHTML('beforeend', '<section class="page" id="marketscans"><div id="marketScansRoot"></div></section>');
    document.querySelectorAll('[data-page="marketscans"]').forEach((button) => button.addEventListener('click', load));
    const previousGo = window.go;
    window.go = function (id) { previousGo(id); if (id === 'marketscans') load(); };
    render();
  }
  window.reloadMarketScans = load;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());

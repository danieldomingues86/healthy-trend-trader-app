(function () {
  const fmt = (value) => value == null ? 'N/D' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
  const pct = (value) => value == null ? 'N/D' : `${fmt(value * 100)}%`;
  const money = (value) => value == null ? 'N/D' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value);
  const text = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const normalizeTicker = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

  function render(state) {
    const root = document.getElementById('fundamentalsRoot');
    if (!root) return;
    const analysis = state?.analysis;
    root.innerHTML = `<div class="fund-head"><div><div class="eyebrow">Análise Fundamentalista</div><h1>Fundamentos simples. Decisões mais assertivas.</h1><p>Somente o contexto financeiro que pode adicionar Edge ao seu Trading Rubric.</p></div><form id="fundSearch"><input id="fundTicker" value="${text(analysis?.ticker || state?.ticker)}" placeholder="PETR4" aria-label="Ticker B3"><button class="primary" type="submit">Analisar</button></form></div>${state?.loading ? '<div class="fund-loading">Consultando dados fundamentalistas…</div>' : state?.error ? `<div class="fund-error">${text(state.error)}</div>` : analysis ? overview(analysis) : '<div class="fund-empty">Pesquise um ticker da B3 para analisar a qualidade fundamental da empresa.</div>'}`;
    root.querySelector('#fundSearch')?.addEventListener('submit', search);
    root.querySelector('#fundTicker')?.addEventListener('input', (event) => {
      event.currentTarget.value = normalizeTicker(event.currentTarget.value);
    });
  }

  async function search(event) {
    event.preventDefault();
    const ticker = normalizeTicker(document.getElementById('fundTicker')?.value);
    if (!ticker) { render({ error: 'Informe um ticker da B3 antes de analisar.' }); return; }
    render({ loading: true, ticker });
    try {
      const response = await fetch(`http://localhost:8787/api/fundamentals?ticker=${encodeURIComponent(ticker)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar os dados');
      render({ analysis: FundamentalScore.analyze(payload) });
    } catch (error) {
      render({ error: `Não foi possível analisar ${ticker || 'o ticker'}. ${error.message}` });
    }
  }

  function overview(analysis) {
    const metrics = analysis.metrics || {};
    const cards = [['ROE', pct(metrics.roe)], ['ROIC', pct(metrics.roic)], ['ROA', pct(metrics.roa)], ['Margem líquida', pct(metrics.netMargin)], ['Dív. líq. / EBITDA', metrics.netDebtToEbitda == null ? 'N/D' : `${fmt(metrics.netDebtToEbitda)}x`], ['P/L', metrics.priceEarnings == null ? 'N/D' : `${fmt(metrics.priceEarnings)}x`], ['EV/EBITDA', metrics.enterpriseToEbitda == null ? 'N/D' : `${fmt(metrics.enterpriseToEbitda)}x`], ['Dividend Yield', pct(metrics.dividendYield)]];
    const years = (analysis.incomeHistory || []).map((item) => `<span class="${Number(item.netIncome) > 0 ? 'yes' : 'no'}">${text(item.year)}<b>${Number(item.netIncome) > 0 ? '✓' : '×'}</b></span>`).join('') || 'Histórico indisponível';
    const highlights = (analysis.highlights || []).map(([kind, label]) => `<p class="${kind}">${kind === 'good' ? '✓' : '⚠'} ${text(label)}</p>`).join('') || '<p>N/D — dados insuficientes para destaques.</p>';
    return `<article class="fund-company"><div><div class="eyebrow">Empresa analisada</div><h2>${text(analysis.ticker)} <small>${text(analysis.company?.name)}</small></h2><p>${text(analysis.company?.sector || 'Setor N/D')} · ${text(analysis.company?.industry || 'Segmento N/D')}</p></div><div class="fund-market"><div><small>Preço atual</small><b>${money(analysis.market?.price)}</b></div><div><small>Variação</small><b>${analysis.market?.changePct == null ? 'N/D' : `${fmt(analysis.market.changePct)}%`}</b></div><div><small>Market Cap</small><b>${money(analysis.market?.marketCap)}</b></div></div></article><nav class="fund-tabs"><b>VISÃO GERAL</b><span>HISTÓRICO</span><span>COMPARAÇÃO SETORIAL</span><span>DETALHES</span></nav><div class="fund-grid"><section class="fund-score"><h3>SCORE FUNDAMENTALISTA</h3><div class="fund-gauge" style="--score:${analysis.score * 10}%"><strong>${analysis.score}</strong><small>/10</small></div><b>${text(analysis.classification)}</b><p>${text(analysis.takeaway)}</p></section><section class="fund-metrics"><h3>PRINCIPAIS INDICADORES</h3><div>${cards.map(([label, value]) => `<article><small>${label}</small><b>${value}</b><span>${value === 'N/D' ? 'Indisponível' : 'Contexto disponível'}</span></article>`).join('')}</div></section><section class="fund-profit-history"><h3>ANOS DE LUCRO LÍQUIDO</h3><b class="fund-big">${analysis.positiveYears} de ${analysis.yearsCount || 'N/D'} anos</b><div class="fund-years">${years}</div></section><section class="fund-highlights"><h3>DESTAQUES QUALITATIVOS</h3>${highlights}</section><section class="fund-takeaway"><h3>TAKEAWAY PARA O TRADER</h3><p>${text(analysis.takeaway)}</p><small>Fonte: ${text(analysis.provider)} · ${new Date(analysis.fetchedAt).toLocaleString('pt-BR')}</small></section></div>`;
  }

  function init() {
    const nav = document.querySelector('.sidebar .nav');
    const main = document.querySelector('main.main');
    if (!nav || !main) return;
    if (typeof navigationTiles !== 'undefined' && !navigationTiles.some(([id]) => id === 'fundamentals')) {
      navigationTiles.splice(5, 0, ['fundamentals', '◉', 'Análise Fundamentalista', 'Avalie a qualidade financeira da empresa']);
    }
    if (!document.getElementById('fundamentals')) {
      nav.insertAdjacentHTML('beforeend', '<button data-page="fundamentals"><span class="ico">◉</span>Análise Fundamentalista</button>');
      main.insertAdjacentHTML('beforeend', '<section class="page" id="fundamentals"><div id="fundamentalsRoot"></div></section>');
      document.querySelector('[data-page="fundamentals"]')?.addEventListener('click', () => go('fundamentals'));
    }
    if (typeof setupTopNavigation === 'function') setupTopNavigation();
    if (document.getElementById('navigationHub')?.classList.contains('open') && typeof openNavigationHub === 'function') openNavigationHub();
    render({});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
}());

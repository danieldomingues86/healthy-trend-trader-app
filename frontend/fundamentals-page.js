(function () {
  const copy = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const localized = (value) => window.appLanguage === 'en-US' && typeof window.translateString === 'function' ? window.translateString(value, 'en-US') : value;
  const locale = () => window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR';
  const fmt = (value) => value == null ? 'N/D' : new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(value);
  const pct = (value) => value == null ? 'N/D' : `${fmt(value * 100)}%`;
  const money = (value) => value == null ? 'N/D' : new Intl.NumberFormat(locale(), { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value);
  const text = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const normalizeTicker = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const marketApi = window.MARKET_DATA_API_URL || 'http://localhost:8787/api';
  let tickerSuggestions = [];
  let tickerSuggestionsLoading = null;

  async function loadTickerSuggestions() {
    if (tickerSuggestions.length) return tickerSuggestions;
    if (!tickerSuggestionsLoading) tickerSuggestionsLoading = fetch(`${marketApi}/relative-strength?limit=100`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Lista indisponível')))
      .then((payload) => tickerSuggestions = (payload.items || []).map((item) => ({ ticker: normalizeTicker(item.symbol), name: item.name || item.symbol, score: item.score })).filter((item) => item.ticker))
      .catch(() => []);
    return tickerSuggestionsLoading;
  }

  function setupTickerCombo(root) {
    const input = root.querySelector('#fundTicker');
    if (!input) return;
    input.autocomplete = 'off';
    input.autocapitalize = 'characters';
    const form = input.closest('#fundSearch');
    const field = input.closest('.ticker-combo-field') || form;
    const toggle = document.createElement('button');
    const menu = document.createElement('div');
    toggle.type = 'button';
    toggle.className = 'ticker-combo-toggle';
    toggle.setAttribute('aria-label', copy('Mostrar ativos acompanhados', 'Show tracked assets'));
    toggle.textContent = '⌄';
    menu.className = 'ticker-combo-menu';
    menu.hidden = true;
    field?.append(toggle, menu);
    const paint = (filter = '', all = false) => {
      const term = all ? '' : normalizeTicker(filter);
      const items = tickerSuggestions.filter((item) => !term || item.ticker.includes(term) || item.name.toUpperCase().includes(term));
      menu.replaceChildren(...items.map((item) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'ticker-combo-option';
        option.innerHTML = `<b>${text(item.ticker)}</b><span>${text(item.name)}</span>`;
        option.addEventListener('mousedown', (event) => event.preventDefault());
        option.addEventListener('click', () => { input.value = item.ticker; menu.hidden = true; input.dataset.comboSelection = 'true'; input.dispatchEvent(new Event('input', { bubbles: true })); });
        return option;
      }));
      if (!items.length) menu.textContent = copy('Nenhum ativo acompanhado encontrado.', 'No tracked assets found.');
    };
    const show = (all = false) => { paint(input.value, all); menu.hidden = false; };
    toggle.addEventListener('click', () => { if (menu.hidden) show(true); else menu.hidden = true; });
    input.addEventListener('focus', () => show(false));
    input.addEventListener('input', () => { if (input.dataset.comboSelection === 'true') { delete input.dataset.comboSelection; return; } show(false); });
    document.addEventListener('click', (event) => { if (!form?.contains(event.target)) menu.hidden = true; });
    loadTickerSuggestions().then((items) => {
      if (!menu.hidden) paint(input.value);
    });
  }

  function render(state) {
    const root = document.getElementById('fundamentalsRoot');
    if (!root) return;
    const analysis = state?.analysis;
    root.innerHTML = `<div class="fund-head"><div><div class="eyebrow">${copy('Análise Fundamentalista', 'Fundamental Analysis')}</div><h1>${copy('Fundamentos simples. Decisões mais assertivas.', 'Simple fundamentals. Better decisions.')}</h1><p>${copy('Somente o contexto financeiro que pode adicionar Edge ao seu Trading Rubric.', 'Financial context that can add an edge to your Trading Rubric.')}</p></div><form id="fundSearch"><div class="ticker-combo-field"><input id="fundTicker" value="${text(analysis?.ticker || state?.ticker)}" placeholder="PETR4" aria-label="Ticker B3"></div><button class="primary" type="submit">${copy('Analisar', 'Analyze')}</button></form></div>${state?.loading ? `<div class="fund-loading">${copy('Consultando dados fundamentalistas…', 'Loading fundamental data…')}</div>` : state?.error ? `<div class="fund-error">${text(state.error)}</div>` : analysis ? overview(analysis) : `<div class="fund-empty">${copy('Pesquise um ticker da B3 para analisar a qualidade fundamental da empresa.', 'Search for a B3 ticker to analyze the company’s fundamental quality.')}</div>`}`;
    root.querySelector('#fundSearch')?.addEventListener('submit', search);
    root.querySelector('#fundTicker')?.addEventListener('input', (event) => {
      event.currentTarget.value = normalizeTicker(event.currentTarget.value);
    });
    setupTickerCombo(root);
  }

  async function search(event) {
    event.preventDefault();
    const ticker = normalizeTicker(document.getElementById('fundTicker')?.value);
    if (!ticker) { render({ error: copy('Informe um ticker da B3 antes de analisar.', 'Enter a B3 ticker before analyzing.') }); return; }
    await analyzeTicker(ticker);
  }

  async function analyzeTicker(ticker) {
    render({ loading: true, ticker });
    try {
      const response = await fetch(`http://localhost:8787/api/fundamentals?ticker=${encodeURIComponent(ticker)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || copy('Não foi possível carregar os dados', 'Could not load the data'));
      render({ analysis: FundamentalScore.analyze(payload) });
    } catch (error) {
      render({ error: copy(`Não foi possível analisar ${ticker || 'o ticker'}. ${error.message}`, `Could not analyze ${ticker || 'the ticker'}. ${error.message}`) });
    }
  }

  window.openFundamentalsForTicker = async (value) => {
    const ticker = normalizeTicker(value);
    if (!ticker) return;
    if (typeof go === 'function') go('fundamentals');
    await analyzeTicker(ticker);
  };

  function overview(analysis) {
    const metrics = analysis.metrics || {};
    const cards = [['ROE', pct(metrics.roe)], ['ROIC', pct(metrics.roic)], [copy('Margem líquida', 'Net margin'), pct(metrics.netMargin)], ['EBIT margin', pct(metrics.ebitMargin)], ['P/E', metrics.priceEarnings == null ? 'N/D' : `${fmt(metrics.priceEarnings)}x`], ['P/B', metrics.priceToBook == null ? 'N/D' : `${fmt(metrics.priceToBook)}x`], ['EV/EBITDA', metrics.enterpriseToEbitda == null ? 'N/D' : `${fmt(metrics.enterpriseToEbitda)}x`], [copy('Dív. líq. / PL', 'Net debt / equity'), metrics.netDebtToEquity == null ? 'N/D' : `${fmt(metrics.netDebtToEquity)}x`], ['Dividend yield', pct(metrics.dividendYield)], [copy('Crescimento 5a', '5-year growth'), pct(metrics.earningsCagr)]];
    const years = (analysis.incomeHistory || []).map((item) => `<span class="${Number(item.netIncome) > 0 ? 'yes' : 'no'}">${text(item.year)}<b>${Number(item.netIncome) > 0 ? '✓' : '×'}</b></span>`).join('') || copy('Histórico indisponível', 'History unavailable');
    const highlights = (analysis.highlights || []).map(([kind, label]) => `<p class="${kind}">${kind === 'good' ? '✓' : '⚠'} ${text(localized(label))}</p>`).join('') || `<p>${copy('N/D — dados insuficientes para destaques.', 'N/A — insufficient data for highlights.')}</p>`;
    return `<article class="fund-company"><div><div class="eyebrow">${copy('Empresa analisada', 'Company analyzed')}</div><h2>${text(analysis.ticker)} <small>${text(analysis.company?.name)}</small></h2><p>${text(analysis.company?.sector || copy('Setor N/D', 'Sector N/A'))} · ${text(analysis.company?.industry || copy('Segmento N/D', 'Industry N/A'))}</p></div><div class="fund-market"><div><small>${copy('Preço atual', 'Current price')}</small><b>${money(analysis.market?.price)}</b></div><div><small>${copy('Variação', 'Change')}</small><b>${analysis.market?.changePct == null ? 'N/D' : `${fmt(analysis.market?.changePct)}%`}</b></div><div><small>Market cap</small><b>${money(analysis.market?.marketCap)}</b></div></div></article><div class="fund-grid"><section class="fund-score"><h3>${copy('SCORE FUNDAMENTALISTA', 'FUNDAMENTAL SCORE')}</h3><div class="fund-gauge" style="--score:${analysis.score * 10}%"><strong>${analysis.score}</strong><small>/10</small></div><b>${text(localized(analysis.classification))}</b><p>${text(localized(analysis.takeaway))}</p></section><section class="fund-metrics"><h3>${copy('PRINCIPAIS INDICADORES', 'KEY METRICS')}</h3><div>${cards.map(([label, value]) => `<article><small>${label}</small><b>${value}</b><span>${value === 'N/D' ? copy('Indisponível', 'Unavailable') : copy('Contexto disponível', 'Context available')}</span></article>`).join('')}</div></section><section class="fund-profit-history"><h3>${copy('ANOS COM LUCRO LÍQUIDO POSITIVO', 'YEARS WITH POSITIVE NET INCOME')}</h3><b class="fund-big">${analysis.positiveYears} ${copy('de', 'of')} ${analysis.yearsCount || 'N/D'} ${copy('anos', 'years')}</b><div class="fund-years">${years}</div></section><section class="fund-highlights"><h3>${copy('DESTAQUES QUALITATIVOS', 'QUALITATIVE HIGHLIGHTS')}</h3>${highlights}</section><section class="fund-takeaway"><h3>${copy('TAKEAWAY PARA O TRADER', 'TRADER TAKEAWAY')}</h3><p>${text(localized(analysis.takeaway))}</p><small>${copy('Fonte', 'Source')}: ${text(analysis.provider)} · ${new Date(analysis.fetchedAt).toLocaleString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR')}</small></section></div>`;
  }

  function init() {
    const nav = document.querySelector('.sidebar .nav');
    const main = document.querySelector('main.main');
    if (!nav || !main) return;
    if (typeof navigationTiles !== 'undefined' && !navigationTiles.some(([id]) => id === 'fundamentals')) {
      navigationTiles.splice(5, 0, ['fundamentals', '◉', 'Análise Fundamentalista', 'Avalie a qualidade financeira da empresa']);
    }
    if (!document.getElementById('fundamentals')) {
      if (!nav.querySelector('[data-page="fundamentals"]')) {
        nav.insertAdjacentHTML('beforeend', '<button data-page="fundamentals"><span class="ico">◉</span>Análise Fundamentalista</button>');
      }
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

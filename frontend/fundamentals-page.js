(function () {
  const copy = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const localized = (value) => window.appLanguage === 'en-US' && typeof window.translateString === 'function' ? window.translateString(value, 'en-US') : value;
  const locale = () => window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR';
  const fmt = (value) => value == null ? 'N/D' : new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(value);
  const pct = (value) => value == null ? 'N/D' : `${fmt(value * 100)}%`;
  const money = (value) => value == null ? 'N/D' : new Intl.NumberFormat(locale(), { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value);
  const text = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const normalizeTicker = (value) => String(value || '').toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 12);
  const marketApi = window.MARKET_DATA_API_URL || 'http://localhost:8787/api';
  let tickerSuggestions = [];
  let tickerSuggestionsLoading = null;

  const BDR_SUGGESTIONS = [
    { ticker: 'ROXO34', name: 'Nu Holdings (Nubank)' },
    { ticker: 'MELI34', name: 'MercadoLibre' },
    { ticker: 'M1TA34', name: 'Meta Platforms (Facebook)' },
    { ticker: 'NVDC34', name: 'NVIDIA' },
    { ticker: 'TSLA34', name: 'Tesla' },
    { ticker: 'ITLC34', name: 'Intel' },
    { ticker: 'AMZO34', name: 'Amazon' },
    { ticker: 'GOGL34', name: 'Alphabet (Google)' },
    { ticker: 'MSFT34', name: 'Microsoft' },
    { ticker: 'M2ST34', name: 'MicroStrategy' },
    { ticker: 'SPCX34', name: 'SpaceX / Destiny Tech100' },
    { ticker: 'TSMC34', name: 'TSMC' },
    { ticker: 'P2LT34', name: 'Palantir' },
    { ticker: 'ORCL34', name: 'Oracle' },
    { ticker: 'MUTC34', name: 'Micron Technology' },
    { ticker: 'AAPL34', name: 'Apple' },
    { ticker: 'NFLX34', name: 'Netflix' },
    { ticker: 'BABA34', name: 'Alibaba' },
    { ticker: 'LILY34', name: 'Eli Lilly' },
    { ticker: 'A1MD34', name: 'AMD' },
    { ticker: 'JPMC34', name: 'JPMorgan Chase' },
    { ticker: 'AVGO34', name: 'Broadcom' },
    { ticker: 'BOAC34', name: 'Bank of America' },
    { ticker: 'C2OI34', name: 'Coinbase' },
    { ticker: 'COCA34', name: 'Coca-Cola' },
    { ticker: 'BERK34', name: 'Berkshire Hathaway' },
    { ticker: 'BKNG34', name: 'Booking Holdings' },
    { ticker: 'S2GM34', name: 'Sigma Lithium' },
    { ticker: 'NIKE34', name: 'Nike' },
    { ticker: 'WALM34', name: 'Walmart' },
    { ticker: 'JNJB34', name: 'Johnson & Johnson' },
    { ticker: 'DISB34', name: 'Walt Disney' },
    { ticker: 'PAGS34', name: 'PagSeguro' },
    { ticker: 'CHVX34', name: 'Chevron' }
  ];

  async function loadTickerSuggestions() {
    if (tickerSuggestions.length) return tickerSuggestions;
    if (!tickerSuggestionsLoading) {
      tickerSuggestionsLoading = Promise.allSettled([
        fetch(`${marketApi}/relative-strength?limit=100`).then((r) => r.ok ? r.json() : null),
        fetch(`${marketApi}/relative-strength?assetClass=bdr&limit=50`).then((r) => r.ok ? r.json() : null)
      ]).then(([stocksRes, bdrsRes]) => {
        const set = new Map();
        for (const item of BDR_SUGGESTIONS) {
          set.set(item.ticker, { ticker: item.ticker, name: item.name });
        }
        const stockItems = stocksRes.status === 'fulfilled' && stocksRes.value?.items ? stocksRes.value.items : [];
        const bdrItems = bdrsRes.status === 'fulfilled' && bdrsRes.value?.items ? bdrsRes.value.items : [];
        for (const item of [...stockItems, ...bdrItems]) {
          const t = normalizeTicker(item.symbol);
          if (t && !set.has(t)) {
            set.set(t, { ticker: t, name: item.name || item.symbol, score: item.score });
          }
        }
        tickerSuggestions = [...set.values()];
        return tickerSuggestions;
      }).catch(() => {
        tickerSuggestions = BDR_SUGGESTIONS.map((i) => ({ ...i }));
        return tickerSuggestions;
      });
    }
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
        option.addEventListener('click', () => {
          input.value = item.ticker;
          menu.hidden = true;
          input.dataset.comboSelection = 'true';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        return option;
      }));
      if (!items.length) menu.textContent = copy('Nenhum ativo acompanhado encontrado.', 'No tracked assets found.');
    };
    const show = (all = false) => { paint(input.value, all); menu.hidden = false; };
    toggle.addEventListener('click', () => { if (menu.hidden) show(true); else menu.hidden = true; });
    input.addEventListener('focus', () => show(false));
    input.addEventListener('input', () => {
      if (input.dataset.comboSelection === 'true') { delete input.dataset.comboSelection; return; }
      show(false);
    });
    document.addEventListener('click', (event) => { if (!form?.contains(event.target)) menu.hidden = true; });
    loadTickerSuggestions().then(() => {
      if (!menu.hidden) paint(input.value);
    });
  }

  function render(state) {
    const root = document.getElementById('fundamentalsRoot');
    if (!root) return;
    const analysis = state?.analysis;
    root.innerHTML = `
      <div class="fund-head">
        <div>
          <div class="eyebrow">${copy('Análise Fundamentalista', 'Fundamental Analysis')}</div>
          <h1>${copy('Fundamentos simples. Decisões mais assertivas.', 'Simple fundamentals. Better decisions.')}</h1>
          <p>${copy('Somente o contexto financeiro que pode adicionar Edge ao seu Trading Rubric — Ações B3 e BDRs Internacionais.', 'Financial context that can add an edge to your Trading Rubric — B3 Stocks & International BDRs.')}</p>
        </div>
        <form id="fundSearch">
          <div class="ticker-combo-field">
            <input id="fundTicker" value="${text(analysis?.ticker || state?.ticker)}" placeholder="PETR4, AAPL34, NVDC34, CEAB3..." aria-label="Ticker B3 ou BDR">
          </div>
          <button class="primary" type="submit">${copy('Analisar', 'Analyze')}</button>
        </form>
      </div>
      ${state?.loading
        ? `<div class="fund-loading">${copy('Consultando dados fundamentalistas…', 'Loading fundamental data…')}</div>`
        : state?.error
          ? `<div class="fund-error">${text(state.error)}</div>`
          : analysis
            ? overview(analysis)
            : `<div class="fund-empty">${copy('Pesquise um ticker da B3 ou BDR internacional (ex: PETR4, AAPL34, NVDC34, ROXO34, TSLA34, CEAB3) para analisar a qualidade financeira da empresa.', 'Search for a B3 stock or international BDR (e.g. PETR4, AAPL34, NVDC34, ROXO34, TSLA34, CEAB3) to analyze the company’s financial quality.')}</div>`
      }
    `;
    root.querySelector('#fundSearch')?.addEventListener('submit', search);
    root.querySelector('#fundTicker')?.addEventListener('input', (event) => {
      event.currentTarget.value = normalizeTicker(event.currentTarget.value);
    });
    setupTickerCombo(root);
  }

  async function search(event) {
    event.preventDefault();
    const ticker = normalizeTicker(document.getElementById('fundTicker')?.value);
    if (!ticker) {
      render({ error: copy('Informe um ticker antes de analisar (ex: PETR4, AAPL34, NVDC34, CEAB3).', 'Enter a ticker before analyzing (e.g. PETR4, AAPL34, NVDC34, CEAB3).') });
      return;
    }
    await analyzeTicker(ticker);
  }

  async function analyzeTicker(ticker) {
    render({ loading: true, ticker });
    try {
      const response = await fetch(`${marketApi}/fundamentals?ticker=${encodeURIComponent(ticker)}`);
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

  // Helper para gerar badges contextuais com base em critérios financeiros
  function getContextBadge(type, value) {
    if (value == null) return { label: copy('Indisponível', 'Unavailable'), status: 'unavailable' };
    const num = Number(value);
    switch (type) {
      case 'roe':
      case 'roic':
        return num >= 0.18
          ? { label: copy('Excelente', 'Excellent'), status: 'good' }
          : num >= 0.10
            ? { label: copy('Saudável', 'Healthy'), status: 'good' }
            : { label: copy('Baixo', 'Low'), status: 'warn' };
      case 'netMargin':
        return num >= 0.15
          ? { label: copy('Alta margem', 'High margin'), status: 'good' }
          : num >= 0.05
            ? { label: copy('Saudável', 'Healthy'), status: 'good' }
            : { label: copy('Comprimida', 'Compressed'), status: 'warn' };
      case 'ebitMargin':
        return num >= 0.15
          ? { label: copy('Forte', 'Strong'), status: 'good' }
          : num >= 0.08
            ? { label: copy('Regular', 'Fair'), status: 'neutral' }
            : { label: copy('Baixa', 'Low'), status: 'warn' };
      case 'earningsCagr':
        return num >= 0.12
          ? { label: copy('Expressivo', 'Expressive'), status: 'good' }
          : num >= 0.05
            ? { label: copy('Saudável', 'Healthy'), status: 'good' }
            : { label: copy('Modesto', 'Modest'), status: 'warn' };
      case 'debt':
        return num <= 0
          ? { label: copy('Caixa líquido', 'Net cash'), status: 'good' }
          : num <= 1.0
            ? { label: copy('Baixo', 'Low'), status: 'good' }
            : num <= 2.5
              ? { label: copy('Controlado', 'Controlled'), status: 'neutral' }
              : { label: copy('Elevado', 'High'), status: 'warn' };
      case 'pe':
        return num <= 0
          ? { label: copy('Prejuízo', 'Loss'), status: 'warn' }
          : num <= 8.0
            ? { label: copy('Atrativo', 'Attractive'), status: 'good' }
            : num <= 15.0
              ? { label: copy('Justo', 'Fair'), status: 'neutral' }
              : { label: copy('Expandido', 'Premium'), status: 'warn' };
      case 'pb':
        return num <= 1.0
          ? { label: copy('Abaixo VP', 'Below BV'), status: 'good' }
          : num <= 2.5
            ? { label: copy('Moderado', 'Moderate'), status: 'neutral' }
            : { label: copy('Prêmio alto', 'High premium'), status: 'warn' };
      case 'evEbitda':
        return num <= 6.0
          ? { label: copy('Atrativo', 'Attractive'), status: 'good' }
          : num <= 12.0
            ? { label: copy('Razoável', 'Reasonable'), status: 'neutral' }
            : { label: copy('Esticado', 'Stretched'), status: 'warn' };
      case 'dy':
        return num >= 0.06
          ? { label: copy('Excelente', 'Excellent'), status: 'good' }
          : num >= 0.03
            ? { label: copy('Sólido', 'Solid'), status: 'good' }
            : num > 0
              ? { label: copy('Moderado', 'Moderate'), status: 'neutral' }
              : { label: copy('Sem proventos', 'No dividends'), status: 'unavailable' };
      default:
        return { label: copy('Disponível', 'Available'), status: 'good' };
    }
  }

  function overview(analysis) {
    const metrics = analysis.metrics || {};
    const isBdr = Boolean(analysis.isBdr || analysis.originalSymbol || analysis.bdrTicker);

    // 1. Market Cap humanizado
    const marketCapObj = typeof FundamentalScore?.formatLargeNumber === 'function'
      ? FundamentalScore.formatLargeNumber(analysis.market?.marketCap)
      : { formatted: money(analysis.market?.marketCap), full: money(analysis.market?.marketCap) };

    // 2. Cálculo da Régua Horizontal
    const scoreClamped = Math.min(10, Math.max(0, analysis.score || 0));
    const scorePct = `${(scoreClamped * 10).toFixed(1)}%`;
    const coverageClass = analysis.dataCoveragePct === 100 ? 'complete' : 'partial';

    // 3. Montagem da fórmula matemática auditada
    const breakdown = analysis.dimensionsBreakdown || [];
    const formulaEquation = breakdown.map((d) => {
      const pts = d.displayContribution != null ? d.displayContribution.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0,0';
      if (d.available) {
        return `<span>${text(d.name)}: <b>+${pts}</b></span>`;
      }
      return `<span style="opacity:0.55">${text(d.name)}: <b>N/D (0,0)</b></span>`;
    }).join(' <span style="opacity:0.4">+</span> ');

    // 4. Raio-X Categorizado
    const raioxCategories = [
      {
        title: copy('Rentabilidade', 'Profitability'),
        items: [
          { name: 'ROE', value: pct(metrics.roe), ...getContextBadge('roe', metrics.roe) },
          { name: 'ROIC', value: pct(metrics.roic), ...getContextBadge('roic', metrics.roic) },
          { name: copy('Margem Líquida', 'Net Margin'), value: pct(metrics.netMargin), ...getContextBadge('netMargin', metrics.netMargin) },
          { name: copy('Margem EBIT', 'EBIT Margin'), value: pct(metrics.ebitMargin), ...getContextBadge('ebitMargin', metrics.ebitMargin) }
        ]
      },
      {
        title: copy('Crescimento & Consistência', 'Growth & Consistency'),
        items: [
          { name: copy('Crescimento 5a (CAGR)', '5y Earnings Growth'), value: pct(metrics.earningsCagr), ...getContextBadge('earningsCagr', metrics.earningsCagr) },
          {
            name: copy('Consistência de Lucros', 'Earnings Consistency'),
            value: analysis.hasHistory ? `${analysis.positiveYears} ${copy('de', 'of')} ${analysis.yearsCount} ${copy('anos', 'yrs')}` : copy('Indisponível', 'Unavailable'),
            label: !analysis.hasHistory ? copy('Não pontuado', 'Not scored') : analysis.positiveYears === analysis.yearsCount ? copy('100% positivo', '100% positive') : copy('Misto', 'Mixed'),
            status: !analysis.hasHistory ? 'unavailable' : analysis.positiveYears === analysis.yearsCount ? 'good' : 'neutral'
          }
        ]
      },
      {
        title: copy('Endividamento', 'Debt & Solvency'),
        items: [
          { name: copy('Dív. Líquida / PL', 'Net Debt / Equity'), value: metrics.netDebtToEquity == null ? 'N/D' : `${fmt(metrics.netDebtToEquity)}x`, ...getContextBadge('debt', metrics.netDebtToEquity) },
          { name: copy('Dív. Líquida / EBITDA', 'Net Debt / EBITDA'), value: metrics.netDebtToEbitda == null ? 'N/D' : `${fmt(metrics.netDebtToEbitda)}x`, ...getContextBadge('debt', metrics.netDebtToEbitda) }
        ]
      },
      {
        title: copy('Valuation', 'Valuation'),
        items: [
          { name: 'P/L', value: metrics.priceEarnings == null ? 'N/D' : `${fmt(metrics.priceEarnings)}x`, ...getContextBadge('pe', metrics.priceEarnings) },
          { name: 'P/VP', value: metrics.priceToBook == null ? 'N/D' : `${fmt(metrics.priceToBook)}x`, ...getContextBadge('pb', metrics.priceToBook) },
          { name: 'EV/EBITDA', value: metrics.enterpriseToEbitda == null ? 'N/D' : `${fmt(metrics.enterpriseToEbitda)}x`, ...getContextBadge('evEbitda', metrics.enterpriseToEbitda) }
        ]
      },
      {
        title: copy('Retorno ao Acionista', 'Shareholder Return'),
        items: [
          { name: 'Dividend Yield', value: pct(metrics.dividendYield), ...getContextBadge('dy', metrics.dividendYield) }
        ]
      }
    ];

    // 5. Histórico de Lucros
    const historySectionHtml = analysis.hasHistory && analysis.yearsCount > 0
      ? `
        <div class="fund-history-years">
          ${(analysis.incomeHistory || []).map((item) => `
            <span class="fund-year-pill ${Number(item.netIncome) > 0 ? 'positive' : 'negative'}">
              <span>${text(item.year)}</span>
              <b>${Number(item.netIncome) > 0 ? '✓' : '×'}</b>
            </span>
          `).join('')}
        </div>
      `
      : `
        <div class="fund-history-unavailable">
          <b>${copy('Dados históricos indisponíveis', 'Historical data unavailable')}</b>
          <p>${copy(
            'Não há série contábil anual suficiente sincronizada para este ativo na base CVM / Fundamentus. Conforme a regra de transparência (dado ausente não é zero), este componente foi reponderado e não penalizou a nota.',
            'Insufficient annual financial history synchronized for this ticker from CVM / Fundamentus. Per the transparency rule (missing data is not zero), this component was re-weighted and did not penalize the score.'
          )}</p>
        </div>
      `;

    // 6. Destaques Qualitativos
    const highlightsHtml = (analysis.highlights || []).length > 0
      ? `<div class="fund-highlights-list">
          ${(analysis.highlights || []).map(([kind, label]) => `
            <div class="fund-highlight-item ${kind}">
              <span>${kind === 'good' ? '✓' : '⚠'}</span>
              <span>${text(localized(label))}</span>
            </div>
          `).join('')}
        </div>`
      : `<p style="color:var(--muted); font-size:12px;">${copy('Dados insuficientes para destaques qualitativos.', 'Insufficient data for qualitative highlights.')}</p>`;

    return `
      <!-- COMPANY SNAPSHOT -->
      <article class="fund-snapshot">
        <div class="fund-snapshot-main">
          <div class="eyebrow">${copy('Empresa analisada', 'Company analyzed')}</div>
          <div class="fund-snapshot-title">
            <h2>${text(analysis.ticker)}</h2>
            <small>${text(analysis.company?.name || analysis.ticker)}</small>
          </div>
          <div class="fund-snapshot-tags">
            ${isBdr ? `<span class="fund-tag fund-tag-bdr">🌐 ${copy('BDR B3', 'B3 BDR')} · ${text(analysis.originalSymbol || analysis.ticker)} (${text(analysis.exchange || 'EUA')})</span>` : ''}
            <span class="fund-tag">${text(analysis.company?.sector || copy('Setor N/D', 'Sector N/A'))}</span>
            <span class="fund-tag">${text(analysis.company?.industry || copy('Segmento N/D', 'Industry N/A'))}</span>
          </div>
          <button type="button" class="fund-watchlist-btn" onclick="if(typeof window.addToWatchlist==='function'){window.addToWatchlist('${text(analysis.ticker)}', { origin: 'fundamentalista', scoreFundamentals: ${Math.round(analysis.score * 10)}, price: ${analysis.market?.price || 0}, name: '${text(analysis.company?.name || analysis.ticker)}', sector: '${text(analysis.company?.sector || '')}' })}">
            ★ ${copy('Adicionar à Watchlist', 'Add to Watchlist')}
          </button>
        </div>
        <div class="fund-snapshot-market">
          <div class="fund-snapshot-metric">
            <small>${copy('Preço atual', 'Current price')}</small>
            <b>${money(analysis.market?.price)}</b>
          </div>
          <div class="fund-snapshot-metric">
            <small>${copy('Variação', 'Change')}</small>
            <b>${analysis.market?.changePct == null ? 'N/D' : `${fmt(analysis.market?.changePct)}%`}</b>
          </div>
          <div class="fund-snapshot-metric">
            <small>Market Cap</small>
            <b>${text(marketCapObj.formatted)}</b>
            <span class="metric-sub">${text(marketCapObj.full)}</span>
          </div>
        </div>
      </article>

      <!-- HERO DO SCORE & RÉGUA HORIZONTAL -->
      <section class="fund-score-card">
        <div class="fund-score-header">
          <h3>${copy('Score Fundamentalista', 'Fundamental Score')}</h3>
          <div class="fund-coverage-pill ${coverageClass}">
            <span class="fund-coverage-dot"></span>
            <span>${copy('Cobertura dos dados', 'Data coverage')}: <b>${analysis.dataCoveragePct}%</b></span>
          </div>
        </div>

        <div class="fund-score-hero-row">
          <div class="fund-score-number">
            ${analysis.score.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}<small>/10</small>
          </div>
          <div class="fund-badge-class ${text(analysis.classification)}">
            ${text(localized(analysis.classification))}
          </div>
          <div class="fund-score-takeaway-inline">
            ${text(localized(analysis.takeaway))}
          </div>
        </div>

        ${analysis.isPartial && analysis.coverageWarning ? `
          <div class="fund-warning-box">
            <span>⚠</span>
            <span>${text(analysis.coverageWarning)}</span>
          </div>
        ` : ''}

        <!-- RÉGUA HORIZONTAL MATEMATICAMENTE PRECISA -->
        <div class="fund-ruler-container">
          <div class="fund-ruler-labels">
            <span>${copy('Ruim', 'Poor')} (&lt;3)</span>
            <span>${copy('Fraco', 'Weak')} (3-5)</span>
            <span>${copy('Médio', 'Fair')} (5-7)</span>
            <span>${copy('Bom', 'Good')} (7-9)</span>
            <span>${copy('Excelente', 'Great')} (9+)</span>
          </div>
          <div class="fund-ruler-track">
            <div class="fund-ruler-pointer" style="--score-pos: ${scorePct};">
              <div class="fund-ruler-badge">${analysis.score.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
              <div class="fund-ruler-pin"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- SEÇÃO TRANSPARÊNCIA: COMO ESTA NOTA FOI CALCULADA -->
      <section class="fund-calculation-section">
        <div class="fund-section-head">
          <div class="eyebrow">${copy('Auditoria e Transparência', 'Audit & Transparency')}</div>
          <h3>${copy('Como esta nota foi calculada', 'How this score was calculated')}</h3>
          <p>${copy(
            'Demonstração matemática das 6 dimensões fundamentais, seus pesos oficiais e a contribuição real de cada componente para a formação do Score.',
            'Mathematical breakdown of all 6 fundamental dimensions, their official weights, and their exact contribution to the final Score.'
          )}</p>
        </div>

        <div class="fund-formula-bar">
          <div class="fund-formula-equation">
            <span>${copy('Soma das Contribuições', 'Sum of Contributions')}:</span>
            ${formulaEquation}
          </div>
          <div class="fund-formula-score">
            = ${analysis.score.toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} / 10
          </div>
        </div>

        <div class="fund-dims-grid">
          ${breakdown.map((d) => `
            <article class="fund-dim-card ${d.available ? '' : 'unavailable'}">
              <div class="fund-dim-header">
                <div>
                  <h4 class="fund-dim-title">${text(d.name)}</h4>
                  <span class="fund-dim-weight-badge">
                    ${copy('Peso', 'Weight')}: ${d.officialWeightPct}% ${d.effectiveWeightPct && d.effectiveWeightPct !== d.officialWeightPct ? `· ${d.effectiveWeightPct}% ${copy('efetivo', 'eff.')}` : ''}
                  </span>
                </div>
                <span class="fund-dim-status-pill ${d.status}">${text(d.statusLabel)}</span>
              </div>

              <div class="fund-dim-body">
                <div class="fund-dim-score-row">
                  <div class="fund-dim-score-val">
                    ${d.available ? `${d.dimensionScore.toLocaleString(locale(), { minimumFractionDigits: 1 })}<small>/10</small>` : copy('Indisponível', 'N/A')}
                  </div>
                  <div class="fund-dim-contrib-val ${d.available ? '' : 'zero'}">
                    ${d.available ? `+${d.displayContribution.toLocaleString(locale(), { minimumFractionDigits: 1 })} pts` : `0,0 pts (${copy('reponderado', 'reweighted')})`}
                  </div>
                </div>
                <div class="fund-dim-bar">
                  <div class="fund-dim-bar-fill ${d.status}" style="width: ${d.available ? `${d.dimensionScore * 10}%` : '0%'};"></div>
                </div>
              </div>

              ${d.indicators && d.indicators.length > 0 ? `
                <details class="fund-dim-details">
                  <summary>${copy('Ver indicadores e regras', 'View metrics & benchmarks')} (${d.indicators.length})</summary>
                  <div class="fund-dim-indicator-list">
                    ${d.indicators.map((ind) => `
                      <div class="fund-dim-ind-item">
                        <div class="fund-dim-ind-top">
                          <span>${text(ind.label)}</span>
                          <b>${text(ind.formatted)}</b>
                        </div>
                        <div class="fund-dim-ind-desc">
                          <span>${text(ind.interpretation)}</span>
                          ${ind.benchmark ? `<br><small style="color:var(--muted); opacity:0.85;">${text(ind.benchmark)}</small>` : ''}
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </details>
              ` : ''}
            </article>
          `).join('')}
        </div>
      </section>

      <!-- RAIO-X FUNDAMENTALISTA -->
      <section class="fund-raiox-section">
        <div class="fund-section-head">
          <div class="eyebrow">${copy('Visão Abrangente', 'Comprehensive Overview')}</div>
          <h3>${copy('Raio-X Fundamentalista', 'Fundamental X-Ray')}</h3>
          <p>${copy('Métricas organizadas por significado econômico com leitura contextualizada baseada em regras reais.', 'Financial metrics organized by economic meaning with contextual interpretations.')}</p>
        </div>

        <div class="fund-raiox-grid">
          ${raioxCategories.map((cat) => `
            <div class="fund-raiox-group">
              <div class="fund-raiox-group-title">
                <span>◉</span>
                <span>${text(cat.title)}</span>
              </div>
              <div class="fund-raiox-items">
                ${cat.items.map((item) => `
                  <div class="fund-raiox-item">
                    <div class="fund-raiox-info">
                      <span class="fund-raiox-name">${text(item.name)}</span>
                      <b class="fund-raiox-val">${text(item.value)}</b>
                    </div>
                    <span class="fund-context-badge ${item.status}">${text(item.label)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- HISTÓRICO & DESTAQUES -->
      <div class="fund-bottom-grid">
        <section class="fund-bottom-card">
          <h3>${copy('Consistência de Lucros Líquidos', 'Net Income Consistency')}</h3>
          ${historySectionHtml}
        </section>

        <section class="fund-bottom-card">
          <h3>${copy('Destaques Qualitativos', 'Qualitative Highlights')}</h3>
          ${highlightsHtml}
        </section>
      </div>

      <!-- TAKEAWAY PARA O TRADER -->
      <section class="fund-trader-takeaway">
        <h3>${copy('Takeaway para o Trader', 'Trader Takeaway')}</h3>
        <p>${text(localized(analysis.takeaway))}</p>
        <small>${copy('Fonte dos dados', 'Data source')}: ${text(analysis.provider || 'CVM / Fundamentus')} · ${copy('Sincronizado em', 'Synchronized at')}: ${new Date(analysis.fetchedAt || Date.now()).toLocaleString(locale())}</small>
      </section>
    `;
  }

  function init() {
    const nav = [...document.querySelectorAll('.sidebar .nav-group')]
      .find((group) => group.querySelector('.nav-label')?.textContent.trim() === 'Inteligência de Mercado')?.querySelector('.nav');
    const main = document.querySelector('main.main');
    if (!nav || !main) return;
    if (typeof navigationTiles !== 'undefined' && !navigationTiles.some(([id]) => id === 'fundamentals')) {
      navigationTiles.splice(5, 0, ['fundamentals', '◉', 'Análise Fundamentalista', 'Avalie a qualidade financeira da empresa']);
    }
    if (!document.getElementById('fundamentals')) {
      if (!document.querySelector('[data-page="fundamentals"]')) {
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

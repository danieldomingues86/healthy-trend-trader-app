/* Presentation only: retain the existing universe, filter and row renderers. */
(function () {
  'use strict';
  const baseRender = renderRelativeStrengthClassesPage;
  const text = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const sectorNames = {
    'commercial services': ['Serviços comerciais', 'Commercial services'],
    'communications': ['Comunicações', 'Communications'],
    'consumer durables': ['Bens de consumo duráveis', 'Consumer durables'],
    'consumer non-durables': ['Bens de consumo não duráveis', 'Consumer non-durables'],
    'consumer services': ['Serviços ao consumidor', 'Consumer services'],
    'distribution services': ['Serviços de distribuição', 'Distribution services'],
    'electronic technology': ['Tecnologia eletrônica', 'Electronic technology'],
    'energy minerals': ['Energia e minerais', 'Energy minerals'],
    'finance': ['Financeiro', 'Financials'],
    'financials': ['Financeiro', 'Financials'],
    'health services': ['Serviços de saúde', 'Health services'],
    'health technology': ['Tecnologia em saúde', 'Health technology'],
    'industrial services': ['Serviços industriais', 'Industrial services'],
    'non-energy minerals': ['Materiais não energéticos', 'Non-energy minerals'],
    'process industries': ['Indústrias de processo', 'Process industries'],
    'producer manufacturing': ['Indústria de transformação', 'Producer manufacturing'],
    'retail trade': ['Comércio varejista', 'Retail trade'],
    'technology services': ['Serviços de tecnologia', 'Technology services'],
    'transportation': ['Transportes', 'Transportation'],
    'utilities': ['Serviços públicos', 'Utilities'],
    'comércio varejista': ['Comércio varejista', 'Retail trade'],
    'tecnologia eletrônica': ['Tecnologia eletrônica', 'Electronic technology'],
    'materiais não energéticos': ['Materiais não energéticos', 'Non-energy minerals'],
    'serviços de saúde': ['Serviços de saúde', 'Health services'],
    'financeiro': ['Financeiro', 'Financials'],
    'indústria de transformação': ['Indústria de transformação', 'Producer manufacturing'],
    'indústrias de processo': ['Indústrias de processo', 'Process industries'],
    'bens de consumo duráveis': ['Bens de consumo duráveis', 'Consumer durables'],
    'bens de consumo não duráveis': ['Bens de consumo não duráveis', 'Consumer non-durables'],
    'serviços de distribuição': ['Serviços de distribuição', 'Distribution services'],
    'serviços comerciais': ['Serviços comerciais', 'Commercial services'],
    'serviços ao consumidor': ['Serviços ao consumidor', 'Consumer services'],
    'energia e minerais': ['Energia e minerais', 'Energy minerals'],
    'transportes': ['Transportes', 'Transportation'],
    'serviços de tecnologia': ['Serviços de tecnologia', 'Technology services'],
    'serviços públicos': ['Serviços públicos', 'Utilities'],
    'serviços industriais': ['Serviços industriais', 'Industrial services'],
    'comunicações': ['Comunicações', 'Communications'],
    'tecnologia em saúde': ['Tecnologia em saúde', 'Health technology'],
    'logística': ['Logística', 'Logistics'],
    'lajes corporativas': ['Lajes corporativas', 'Corporate offices'],
    'papel/cri': ['Papel/CRI', 'Paper/CRI'],
    'shopping': ['Shopping', 'Shopping'],
    'híbridos': ['Híbridos', 'Hybrid'],
    'outros': ['Outros', 'Other'],
    'tecnologia': ['Tecnologia', 'Technology'],
    'comunicação': ['Comunicação', 'Communication'],
    'consumo': ['Consumo', 'Consumer']
  };

  function localizedSector(value) {
    const source = String(value || '').trim();
    const pair = sectorNames[source.toLocaleLowerCase('pt-BR')];
    if (pair) return pair[window.appLanguage === 'en-US' ? 1 : 0];
    return source || text('Não classificado', 'Unclassified');
  }

  // Use one reversible dictionary for the selector and table in both languages.
  relativeClassSectorLabel = localizedSector;
  localizeRelativeClassSectors = function () {
    document.querySelectorAll('#relativeStrengthRows tr:not(.rs-band-divider) td:nth-child(4)').forEach(cell => {
      if (!cell.dataset.rawSector) cell.dataset.rawSector = cell.textContent.trim();
      cell.textContent = localizedSector(cell.dataset.rawSector);
    });
    document.querySelectorAll('#rsSector option').forEach(option => {
      if (!option.value) return;
      const rawSector = option.dataset.rawSector || option.value;
      option.dataset.rawSector = rawSector;
      // Set an explicit value before translating the label. Without it, changing
      // textContent also changes the implicit option value and breaks exact filtering.
      option.setAttribute('value', rawSector);
      option.textContent = localizedSector(rawSector);
    });
  };

  // These five display levels do not change the stored scores, universe or sort order.
  function visualLevel(score) {
    if (score >= 90) return 'leader';
    if (score >= 70) return 'qualified';
    if (score >= 40) return 'watch';
    if (score >= 30) return 'observation';
    return 'laggard';
  }

  function presentRows() {
    const target = document.getElementById('relativeStrengthRows');
    if (!target) return;
    target.querySelectorAll('[data-rs-extra-band]').forEach(row => row.remove());
    let lastLevel = '';
    target.querySelectorAll('tr').forEach(row => {
      if (row.classList.contains('rs-benchmark-divider')) lastLevel = '';
      const badge = row.querySelector('.rs-score');
      if (!badge) return;
      const score = Number(badge.textContent);
      const level = visualLevel(score);
      row.dataset.rsVisual = level;
      // Color intensity follows the existing RS value, never the filtered row index.
      row.style.setProperty('--rs-emphasis', String(Math.max(0, Math.min(1, (score - 90) / 10))));
      row.style.setProperty('--rs-qualified-strength', `${Math.max(0, Math.min(100, (score - 70) * 5))}%`);
      const labels = {
        leader: text('Líder', 'Leader'), qualified: text('Qualificado', 'Qualified'),
        watch: text('Acompanhar', 'Watch'), observation: text('Em observação', 'Under observation'),
        laggard: text('Abaixo do filtro', 'Below filter')
      };
      row.querySelector('.rs-template').textContent = labels[level];
      if (level === 'watch' && row.previousElementSibling?.classList.contains('rs-band-divider')) {
        row.previousElementSibling.firstElementChild.textContent = text('Em formação · RS 40–69', 'Developing · RS 40–69');
      }
      if (level === 'observation' || level === 'laggard') {
        const title = level === 'observation' ? text('Em observação · RS 30–39', 'Under observation · RS 30–39') : text('Abaixo do filtro · RS 0–29', 'Below filter · RS 0–29');
        const previous = row.previousElementSibling;
        if (previous?.classList.contains('rs-band-divider')) previous.firstElementChild.textContent = title;
        else if (level !== lastLevel) {
          const divider = document.createElement('tr');
          divider.className = 'rs-band-divider';
          divider.dataset.rsExtraBand = 'true';
          const cell = document.createElement('td');
          cell.colSpan = 9;
          cell.textContent = title;
          divider.append(cell);
          row.before(divider);
        }
      }
      lastLevel = level;
      const actionCell = row.querySelector('.rs-table-chevron');
      if (actionCell && !actionCell.querySelector('.rs-analysis-action')) {
        const symbol = row.children[1].querySelector('b').textContent;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rs-analysis-action';
        button.textContent = text('Ver Análise ›', 'View Analysis ›');
        button.setAttribute('aria-label', text(`Ver análise de ${symbol}`, `View analysis for ${symbol}`));
        button.addEventListener('click', () => {
          if (typeof window.openFundamentalsForTicker === 'function') {
            window.openFundamentalsForTicker(symbol);
          } else if (typeof go === 'function') {
            go('fundamentals');
          }
        });
        const wlBtn = document.createElement('button');
        wlBtn.type = 'button';
        wlBtn.className = 'rs-watchlist-action';
        wlBtn.textContent = '+ Watchlist';
        wlBtn.setAttribute('aria-label', text(`Adicionar ${symbol} à Watchlist`, `Add ${symbol} to Watchlist`));
        wlBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof window.addToWatchlist === 'function') {
            window.addToWatchlist(symbol, { origin: 'relative-strength', rsScore: score });
          }
        });
        actionCell.replaceChildren(button, wlBtn);
      }
    });
  }

  function classificationMarkup() {
    const cards = [
      ['leader', '★', text('LÍDER', 'LEADER'), text('RS 90+ · força ascendente', 'RS 90+ · rising strength')],
      ['qualified', '↗', text('QUALIFICADO', 'QUALIFIED'), text('RS 70+ · força acima da média', 'RS 70+ · above-average strength')],
      ['watch', '◉', text('ACOMPANHAR', 'WATCH'), text('RS 40–69 · em formação', 'RS 40–69 · developing')],
      ['observation', '♧', text('EM OBSERVAÇÃO', 'UNDER OBSERVATION'), text('RS 30–39 · atenção', 'RS 30–39 · attention')],
      ['laggard', '!', text('ABAIXO DO FILTRO', 'BELOW FILTER'), text('RS 0–29 · evitando no momento', 'RS 0–29 · avoiding for now')]
    ];
    return cards.map(([level, icon, title, description]) => `<article class="rs-classification-card ${level}"><i aria-hidden="true">${icon}</i><div><b>${title}</b><strong>${description}</strong></div></article>`).join('');
  }

  function presentRaceLayout() {
    const root = document.getElementById('relativestrength');
    const shell = root?.querySelector('.rs-simple-shell');
    if (!shell) return;
    const dashboard = shell.querySelector('.rs-simple-dashboard');
    if (!dashboard) return;

    // Clean up any stray or legacy elements
    shell.querySelectorAll('.rs-simple-intro').forEach(el => el.remove());
    shell.querySelectorAll('.rs-v3-closing').forEach(el => el.remove());
    document.querySelectorAll('.rs-v3-header-tools').forEach(el => el.remove());

    const disclaimer = shell.querySelector('.rs-simple-disclaimer');
    const tabs = shell.querySelector('.rs-class-tabs');
    let classification = shell.querySelector('.rs-classification');
    root.classList.add('rs-v3-page');

    if (!shell.querySelector('.rs-v3-hero')) {
      shell.insertAdjacentHTML('afterbegin', `<header class="rs-v3-hero">
        <div class="rs-race-scene" role="img" aria-hidden="true">
          <picture>
            <source media="(min-width: 1953px)" srcset="assets/relative-strength-race-wide-v1.webp">
            <img class="rs-race-art" src="assets/relative-strength-race-v4.webp" width="1536" height="1024" alt="" fetchpriority="high" decoding="async">
          </picture>
        </div>
        <div class="rs-v3-copy">
          <div class="rs-v3-eyebrow">${text('— ANÁLISE DE MERCADO', '— MARKET ANALYSIS')}</div>
          <h1>${text('Força Relativa', 'Relative Strength')}</h1>
          <p>${text('Encontre as ações que estão rendendo mais que o Ibovespa.<br>Foque nos líderes e deixe o mercado trabalhar a seu favor.', 'Find stocks outperforming the Ibovespa.<br>Focus on leaders and let the market work in your favor.')}</p>
        </div>
        <aside class="rs-v3-hero-quote">
          ${text('“A força do mercado revela seus líderes.”', '“Market strength reveals its leaders.”')}
        </aside>
      </header><div class="rs-v3-selector"></div>`);
    }

    const selector = shell.querySelector('.rs-v3-selector');
    if (selector) {
      if (!classification) {
        classification = document.createElement('section');
        classification.className = 'rs-classification';
      }
      classification.innerHTML = classificationMarkup();
      if (tabs) {
        selector.replaceChildren(tabs, classification);
      } else {
        selector.replaceChildren(classification);
      }
    }

    if (tabs) {
      tabs.querySelectorAll('button').forEach((button, index) => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
        if (!button.querySelector('.rs-v3-universe-icon')) {
          button.insertAdjacentHTML('afterbegin', `<i class="rs-v3-universe-icon" aria-hidden="true">${['▥','▥','▦','◎'][index] || '▥'}</i>`);
        }
      });
    }

    const content = dashboard.querySelector('.rs-compact-content');
    if (content) {
      dashboard.replaceChildren(...content.children);
    }
    dashboard.querySelectorAll('.rs-class-overview, .rs-bdr-perspectives').forEach(el => el.remove());
    dashboard.querySelectorAll('.rs-classification').forEach(el => el.remove());

    const head = dashboard.querySelector('.rs-simple-dashboard-head');
    if (head) {
      head.querySelectorAll('p').forEach(p => p.remove());
      const h2 = head.querySelector('h2');
      if (h2) {
        h2.innerHTML = `<span class="rs-heading-icon" aria-hidden="true">▥</span> ${text('Ranking de Força Relativa', 'Relative Strength Ranking')}`;
      }
      const freshness = dashboard.querySelector('.relative-data-freshness');
      if (freshness) {
        freshness.className = 'relative-data-freshness';
        freshness.innerHTML = `<span class="rs-freshness-icon" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span><span class="rs-freshness-text">${relativeClassUpdatedLabel()}</span>`;
        head.append(freshness);
      }
    }

    const theadRow = dashboard.querySelector('.relative-table thead tr');
    if (theadRow && theadRow.children.length === 8) {
      const companyTh = document.createElement('th');
      companyTh.textContent = text('Empresa', 'Company');
      theadRow.children[1].after(companyTh);
    }

    const lastHeader = dashboard.querySelector('.relative-table thead th:last-child');
    if (lastHeader) lastHeader.textContent = text('AÇÕES', 'ACTIONS');

    if (!shell.querySelector('.rs-v3-closing')) {
      dashboard.insertAdjacentHTML('afterend', `<footer class="rs-v3-closing">${text('“Consistência é a verdadeira vantagem.”', '“Consistency is the real advantage.”')}</footer>`);
    }

    if (disclaimer) {
      disclaimer.classList.add('rs-v3-disclaimer');
      disclaimer.innerHTML = `<span class="rs-disclaimer-icon">ⓘ</span> <strong>${text('A FORÇA RELATIVA É CONTEXTO, NÃO RECOMENDAÇÃO DE COMPRA OU VENDA', 'RELATIVE STRENGTH IS CONTEXT, NOT A BUY OR SELL RECOMMENDATION')}</strong>`;
      dashboard.insertAdjacentElement('beforebegin', disclaimer);
    }

    presentRows();
  }

  const baseRows = renderRelativeStrengthClassRows;
  renderRelativeStrengthClassRows = function () {
    baseRows.apply(this, arguments);
    presentRows();
  };
  renderRelativeStrengthClassesPage = function () {
    baseRender.apply(this, arguments);
    presentRaceLayout();
  };

  renderRelativeStrengthClassesPage();
}());

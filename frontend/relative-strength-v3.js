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
    document.querySelectorAll('#relativeStrengthRows tr:not(.rs-band-divider) td:nth-child(3)').forEach(cell => {
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
          cell.colSpan = 8;
          cell.textContent = title;
          divider.append(cell);
          row.before(divider);
        }
      }
      lastLevel = level;
      const actionCell = row.querySelector('.rs-table-chevron');
      if (actionCell && !actionCell.querySelector('button') && typeof window.openFundamentalsForTicker === 'function') {
        const symbol = row.children[1].querySelector('b').textContent;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rs-analysis-action';
        button.textContent = text('Ver Análise', 'View Analysis');
        button.setAttribute('aria-label', text(`Ver análise de ${symbol}`, `View analysis for ${symbol}`));
        button.addEventListener('click', () => window.openFundamentalsForTicker(symbol));
        actionCell.replaceChildren(button);
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
    if (!shell || shell.querySelector('.rs-v3-hero')) return;
    shell.querySelector('.rs-simple-intro')?.remove();
    const disclaimer = shell.querySelector('.rs-simple-disclaimer');
    const dashboard = shell.querySelector('.rs-simple-dashboard');
    const tabs = shell.querySelector('.rs-class-tabs');
    const classification = shell.querySelector('.rs-classification');
    root.classList.add('rs-v3-page');
    classification.innerHTML = classificationMarkup();
    shell.insertAdjacentHTML('afterbegin', `<header class="rs-v3-hero" data-race-hint="${text('Deslize para acompanhar a corrida →', 'Swipe to follow the race →')}">
      <div class="rs-race-viewport" tabindex="0" aria-label="${text('Corrida de força relativa. Em telas pequenas, deslize para acompanhar todos os cavalos.', 'Relative strength race. On small screens, scroll to follow all five horses.')}"><div class="rs-race-scene" role="img" aria-label="${text('Cinco cavalos correm na mesma direção: líderes, em ascensão, em observação, laggards e abaixo do filtro. O líder verde, grande e iluminado, é seguido por cavalos progressivamente menores e mais apagados.', 'Five horses race in the same direction: leaders, rising, observing, laggards and below filter. A large, brightly lit green leader is followed by progressively smaller, more faded horses.')}">
        <picture><source media="(min-width: 1953px)" srcset="assets/relative-strength-race-wide-v1.webp"><img class="rs-race-art" src="assets/relative-strength-race-v4.webp" width="1536" height="1024" alt="" fetchpriority="high" decoding="async"></picture>
        <div class="rs-race-labels" aria-hidden="true">
          <span class="race-leader"><b>${text('LÍDERES','LEADERS')}</b><small>${text('Resultados acima<br>da média','Above-average<br>results')}</small></span>
          <span class="race-rising"><b>${text('EM ASCENSÃO','RISING')}</b><small>${text('Oportunidade','Opportunity')}</small></span>
          <span class="race-observation"><b>${text('EM OBSERVAÇÃO','OBSERVING')}</b><small>${text('Analisar','Analyze')}</small></span>
          <span class="race-laggard"><b>${text('ATRASADOS','LAGGARDS')}</b><small>${text('Evitar','Avoid')}</small></span>
          <span class="race-below"><b>${text('ABAIXO DO FILTRO','BELOW FILTER')}</b><small>${text('Ficando para trás','Falling behind')}</small></span>
        </div>
      </div></div>
      <div class="rs-v3-copy"><h1>${text('Força Relativa','Relative Strength')}</h1>
      <p>${text('Encontre as ações que estão rendendo mais que o Ibovespa.<br>Foque nos líderes e deixe o mercado trabalhar a seu favor.','Find stocks outperforming the Ibovespa.<br>Focus on leaders and let the market work in your favor.')}</p>
      <blockquote>${text('“O dinheiro tende a fluir para a força.”','“Money tends to flow toward strength.”')}</blockquote>
      <small>${text('OPERE O QUE ESTÁ FORTE. DEIXE COM QUE A FORÇA DO MERCADO TE DIGA AONDE COLOCAR SEU DINHEIRO E NÃO A SUA OPNIÃO.','TRADE WHAT IS STRONG. LET MARKET STRENGTH TELL YOU WHERE TO PUT YOUR MONEY, NOT YOUR OPINION.')}</small></div>
      <aside class="rs-v3-editorial"><b>${text('A FORÇA<br>MOVE O MERCADO.','STRENGTH<br>MOVES THE MARKET.')}</b><i></i><small>${text('MESMO MERCADO.<br>RESULTADOS DIFERENTES.','SAME MARKET.<br>DIFFERENT RESULTS.')}</small></aside>
    </header><div class="rs-v3-selector"></div>`);
    const selector = shell.querySelector('.rs-v3-selector');
    selector.append(tabs, classification);
    tabs.querySelectorAll('button').forEach((button, index) => {
      button.setAttribute('aria-pressed', String(button.classList.contains('active')));
      button.insertAdjacentHTML('afterbegin', `<i class="rs-v3-universe-icon" aria-hidden="true">${['▥','▥','▦','◎'][index]}</i>`);
    });
    const content = dashboard.querySelector('.rs-compact-content');
    if (content) dashboard.replaceChildren(...content.children);
    const headingIcon = dashboard.querySelector('h2 span');
    if (headingIcon) headingIcon.textContent = '▥';
    const freshness = dashboard.querySelector('.relative-data-freshness');
    if (freshness) dashboard.querySelector('.rs-simple-toolbar').append(freshness);
    const lastHeader = dashboard.querySelector('.relative-table thead th:last-child');
    if (lastHeader) lastHeader.textContent = text('FUNDAMENTOS', 'FUNDAMENTALS');
    dashboard.insertAdjacentHTML('afterend', `<footer class="rs-v3-closing">${text('“Consistência é a verdadeira vantagem.”','“Consistency is the real advantage.”')}</footer>`);
    if (disclaimer) {
      disclaimer.classList.add('rs-v3-disclaimer');
      dashboard.insertAdjacentElement('beforebegin', disclaimer);
    }
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
  const actions = document.querySelector('.top-actions');
  if (actions && !actions.querySelector('.rs-v3-header-tools')) {
    const tools = document.createElement('div');
    tools.className = 'rs-v3-header-tools';
    tools.innerHTML = `<button type="button" aria-label="Configurações" title="Configurações" data-destination="settings">⚙</button><button type="button" aria-label="Ajuda" title="Ajuda" data-destination="manual">?</button><details><summary aria-label="Menu" title="Menu">☰</summary><nav aria-label="Navegação do workspace"></nav></details>`;
    const nav = tools.querySelector('nav');
    document.querySelectorAll('.sidebar .nav button[data-page]').forEach(source => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = source.textContent.trim();
      button.addEventListener('click', () => { tools.querySelector('details').open = false; source.click(); });
      nav.append(button);
    });
    tools.querySelectorAll('[data-destination]').forEach(button => button.addEventListener('click', () => go(button.dataset.destination)));
    actions.append(tools);
  }
  renderRelativeStrengthClassesPage();
}());

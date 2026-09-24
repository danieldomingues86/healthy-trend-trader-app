(function () {
  'use strict';
  const model = window.TradeAnatomyModel;
  if (!model) return;

  const state = { year: '', month: '', market: '', direction: '', selectedId: null, selectedRank: null };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
  const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const num = (value, digits = 1) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const date = value => value instanceof Date && !Number.isNaN(value.getTime()) ? value.toLocaleDateString('pt-BR') : 'Não registrado';
  const available = value => value == null || value === '' ? 'Não registrado' : esc(value);

  function trades() {
    try { return Array.isArray(synchronizedTrades) ? synchronizedTrades : []; } catch (_) { return []; }
  }

  function selectOptions(items, selected, empty) {
    return `<option value="">${empty}</option>${items.map(item => `<option value="${esc(item)}" ${String(selected) === String(item) ? 'selected' : ''}>${esc(item)}</option>`).join('')}`;
  }

  function summaryMetric(label, value, tone = '') {
    return `<div class="ta-summary-item ${tone}"><small>${label}</small><strong>${value}</strong></div>`;
  }

  function tradeCard(item, rank, kind) {
    const r = item.r == null ? 'R não registrado' : `${item.r >= 0 ? '+' : ''}${num(item.r, 1)}R`;
    return `<article class="ta-trade-card ${kind} rank-${Math.min(rank, 4)}" data-ta-detail="${esc(item.id)}" data-ta-rank="${rank}" tabindex="0" role="button" aria-label="Abrir Raio-X de ${esc(item.symbol)}">
      <div class="ta-rank"><span>#${rank}</span>${rank <= 3 ? '<i>★</i>' : ''}</div>
      <div class="ta-card-symbol">${esc(item.symbol)}</div>
      <div class="ta-result"><strong>${money(item.result)}</strong><span>${r}</span></div>
      <div class="ta-card-essential"><span>GRADE <b>${available(item.grade)}</b></span><span>RS <b>${available(item.relativeStrength)}</b></span></div>
      <div class="ta-card-link">Ver Raio-X <span>→</span></div>
    </article>`;
  }

  function rankingSection(kind, items, gross) {
    const winner = kind === 'winner';
    const total = Math.abs(items.reduce((sum, item) => sum + item.result, 0));
    const avgRItems = items.filter(item => item.r != null);
    const avgR = avgRItems.length ? avgRItems.reduce((sum, item) => sum + item.r, 0) / avgRItems.length : null;
    const contribution = gross ? total / gross * 100 : 0;
    const title = winner ? 'TOP 10 MAIORES VENCEDORES' : 'TOP 10 MAIORES PERDEDORES';
    const question = winner ? 'QUEM MAIS CONSTRUIU?' : 'QUEM MAIS CUSTOU?';
    const description = items.length ? `Estes trades representaram ${num(contribution, 1)}% do ${winner ? 'lucro' : 'prejuízo'} bruto no período.` : `Nenhum trade ${winner ? 'vencedor' : 'perdedor'} neste recorte.`;
    return `<section class="ta-ranking ${kind}">
      <div class="ta-section-question">${winner ? '🏆' : '☠'} ${question}</div>
      <header class="ta-section-head"><div><h2>${title}</h2><p>${description}</p></div><div class="ta-ranking-metrics">
        ${summaryMetric(`${winner ? 'Lucro' : 'Prejuízo'} Top 10`, items.length ? money(winner ? total : -total) : '—', winner ? 'positive' : 'negative')}
        ${summaryMetric(`% ${winner ? 'lucro' : 'prejuízo'} bruto`, items.length ? `${num(contribution, 1)}%` : '—')}
        ${summaryMetric('R médio', avgR == null ? '—' : `${avgR >= 0 ? '+' : ''}${num(avgR, 1)}R`, winner ? 'positive' : 'negative')}
      </div></header>
      <div class="ta-card-rail">${items.map((item, index) => tradeCard(item, index + 1, kind)).join('') || `<div class="ta-empty-rail">Encerre mais operações para formar este ranking.</div>`}</div>
    </section>`;
  }

  function dnaRow(entry) {
    const bar = (data, tone) => `<div class="ta-dna-bar ${tone}"><span>${tone === 'winner' ? 'Vencedores' : 'Perdedores'}</span><i><em style="width:${data.percentage || 0}%"></em></i><b>${data.percentage == null ? '—' : `${num(data.percentage, 0)}%`}</b><small>${data.denominator ? `${data.matches}/${data.denominator}` : 'sem dado'}</small></div>`;
    return `<article class="ta-dna-row"><h3>${esc(entry.feature)}</h3><div>${bar(entry.winners, 'winner')}${bar(entry.losers, 'loser')}</div></article>`;
  }

  function patternTags(comparison, side) {
    return comparison.filter(item => item[side].percentage != null).sort((a, b) => b[side].percentage - a[side].percentage).slice(0, 5).map(item => `<span>${esc(item.feature)}</span>`).join('') || '<span>Dados insuficientes</span>';
  }

  function drawerMarkup(item) {
    if (!item) return '';
    const r = item.r == null ? 'Não registrado' : `${item.r >= 0 ? '+' : ''}${num(item.r, 1)}R`;
    const direction = item.direction === 'short' ? 'Short' : item.direction === 'long' ? 'Long' : null;
    const duration = item.durationDays == null ? null : `${Math.max(0, Math.round(item.durationDays))} dia(s)`;
    const rows = [
      ['Grade', item.grade], ['Força Relativa', item.relativeStrength], ['Contexto Diário', item.assetContext],
      ['Ciclo de Mercado', item.marketContext], ['ATR%', item.atrPct == null ? null : `${num(item.atrPct, 2)}%`],
      ['Gatilho', item.setup], ['Fundamentos', item.fundamentals], ['Direção', direction],
      ['Data de entrada', date(item.openedAt)], ['Duração', duration]
    ];
    return `<div class="ta-drawer-backdrop" data-ta-close></div><aside class="ta-drawer" role="dialog" aria-modal="true" aria-label="Raio-X do trade ${esc(item.symbol)}">
      <header><div><span class="ta-drawer-eyebrow">RAIO-X DO TRADE #${state.selectedRank || '—'}</span><h2>Fotografia da entrada</h2></div><button type="button" data-ta-close aria-label="Fechar">×</button></header>
      <section class="ta-drawer-result"><div><small>${available(item.market)}</small><h3>${esc(item.symbol)}</h3></div><div><strong>${money(item.result)}</strong><span>${r}</span></div></section>
      <p class="ta-drawer-note">Dados preservados conforme estavam registrados no momento da entrada.</p>
      <div class="ta-xray-grid">${rows.map(([label, value]) => `<div><span>${label}</span><b>${available(value)}</b></div>`).join('')}</div>
      <footer><button type="button" data-ta-original="${esc(item.id)}">Abrir trade original <span>→</span></button></footer>
    </aside>`;
  }

  function render() {
    const root = document.getElementById('tradeanatomy');
    if (!root) return;
    const source = trades();
    const choices = model.filtersFor(source);
    if (!state.year && choices.years.length) state.year = String(choices.years[0]);
    const filtered = model.filterTrades(source, state);
    const metrics = model.metrics(filtered);
    const ranks = model.ranking(filtered);
    const comparison = model.compare(ranks.winners, ranks.losers);
    const selected = filtered.find(item => String(item.id) === String(state.selectedId));
    if (state.selectedId && !selected) { state.selectedId = null; state.selectedRank = null; }
    root.innerHTML = `<main class="ta-page">
      <header class="ta-hero">
        <div class="ta-title"><span class="ta-logo" aria-hidden="true"><i></i><i></i><i></i></span><div><div class="ta-eyebrow">DADOS & PERFORMANCE</div><h1>Anatomia dos <em>Trades</em></h1><h2>Os 10 que mais construíram — e os 10 que mais custaram.</h2></div></div>
        <p>Investigue seus melhores resultados e maiores erros sem perder de vista o que realmente importa.</p>
      </header>
      <section class="ta-filterbar" aria-label="Filtros do período">
        <label><span>Ano</span><select data-ta-filter="year">${selectOptions(choices.years, state.year, 'Todos')}</select></label>
        <label><span>Mês</span><select data-ta-filter="month"><option value="">Todos</option>${['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((label,index)=>`<option value="${index+1}" ${String(state.month)===String(index+1)?'selected':''}>${label}</option>`).join('')}</select></label>
        <label><span>Mercado</span><select data-ta-filter="market">${selectOptions(choices.markets, state.market, 'Todos')}</select></label>
        <label><span>Direção</span><select data-ta-filter="direction"><option value="">Todas</option><option value="long" ${state.direction==='long'?'selected':''}>Long</option><option value="short" ${state.direction==='short'?'selected':''}>Short</option></select></label>
        <button type="button" class="ta-refresh" data-ta-refresh>↻ Atualizar</button>
      </section>
      <section class="ta-summary">
        <div class="ta-summary-primary"><small>RESULTADO LÍQUIDO</small><strong class="${metrics.net >= 0 ? 'positive' : 'negative'}">${money(metrics.net)}</strong><span>${money(metrics.grossProfit)} ganhos · ${money(-metrics.grossLoss)} perdas</span></div>
        <div class="ta-summary-secondary">${summaryMetric('Trades', metrics.total)}${summaryMetric('Profit Factor', metrics.profitFactor == null ? '—' : metrics.profitFactor === Infinity ? '∞' : num(metrics.profitFactor, 2))}${summaryMetric('Taxa de acerto', `${num(metrics.winRate, 1)}%`)}</div>
      </section>
      ${rankingSection('winner', ranks.winners, metrics.grossProfit)}
      ${rankingSection('loser', ranks.losers, metrics.grossLoss)}
      <section class="ta-dna">
        <header><div class="ta-section-question">🧬 O QUE ELES TINHAM EM COMUM?</div><h2>DNA DOS VENCEDORES × PERDEDORES</h2><p>Comparação descritiva dos dados registrados na entrada. Associação não significa causalidade.</p></header>
        <div class="ta-dna-list">${comparison.map(dnaRow).join('')}</div>
      </section>
      <section class="ta-insights"><header><div class="ta-section-question">💡 O QUE POSSO APRENDER?</div><h2>Conclusões deste recorte</h2></header><div class="ta-insight-grid">
        <article><div class="ta-insight-icon">🧬</div><div><h3>DNA dos seus melhores trades</h3><p>Características mais frequentes entre os vencedores.</p><div class="ta-tags">${patternTags(comparison,'winners')}</div></div></article>
        <article class="loss"><div class="ta-insight-icon">⚠</div><div><h3>Padrões dos seus maiores prejuízos</h3><p>Características mais frequentes entre os perdedores.</p><div class="ta-tags">${patternTags(comparison,'losers')}</div></div></article>
      </div></section>
      <div class="ta-drawer-host">${drawerMarkup(selected)}</div>
    </main>`;
    bind(root);
  }

  function bind(root) {
    root.querySelectorAll('[data-ta-filter]').forEach(control => control.addEventListener('change', () => { state[control.dataset.taFilter] = control.value; state.selectedId = null; render(); }));
    root.querySelector('[data-ta-refresh]')?.addEventListener('click', async () => { if (typeof syncOperationalFromDatabase === 'function') await syncOperationalFromDatabase(); else render(); });
    root.querySelectorAll('[data-ta-detail]').forEach(card => {
      const open = event => { if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return; event.preventDefault(); state.selectedId = card.dataset.taDetail; state.selectedRank = Number(card.dataset.taRank); render(); };
      card.addEventListener('click', open); card.addEventListener('keydown', open);
    });
    root.querySelectorAll('[data-ta-close]').forEach(button => button.addEventListener('click', () => { state.selectedId = null; state.selectedRank = null; render(); }));
    root.querySelector('[data-ta-original]')?.addEventListener('click', event => {
      const id = event.currentTarget.dataset.taOriginal;
      state.selectedId = null;
      render();
      if (typeof window.openPosition === 'function') window.openPosition(id);
    });
    if (state.selectedId) window.requestAnimationFrame(() => root.querySelector('.ta-drawer [data-ta-close]')?.focus());
  }

  window.renderTradeAnatomy = render;
  window.addEventListener('healthyTrend:tradesUpdated', render);
  const previousGo = window.go;
  if (typeof previousGo === 'function') window.go = function (id) { previousGo(id); if (id === 'tradeanatomy') window.requestAnimationFrame(render); };
})();

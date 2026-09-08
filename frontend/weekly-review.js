(() => {
  const root = document.getElementById('weeklyReviewRoot');
  if (!root) return;
  const storage = window.healthyTrendWorkspace?.storage;
  let anchor = new Date();
  let initialPeriodSelected = false;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const dayKey = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const dateFromKey = value => new Date(`${value}T12:00:00`);
  const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const percent = value => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(value || 0)}%`;
  function range() {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
    return { start, end, startKey: dayKey(start), endKey: dayKey(end) };
  }
  function dateLabel(value) { return value.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); }
  function monthLabel(value) { return value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); }
  function readJournal() {
    try { return JSON.parse(storage?.getItem('healthy-trend-journal-v2') || '{"records":[]}').records || []; }
    catch { return []; }
  }
  function closedAt(trade) {
    const close = [...(trade.events || [])].reverse().find(event => event?.type === 'close');
    return dayKey(trade.closed_at || trade.closedAt || close?.at);
  }
  function result(trade) {
    const events = trade.events || [], entry = Number(events.find(event => event.type === 'entry')?.price ?? trade.execution_price ?? trade.entry_price ?? 0);
    const sign = trade.direction === 'short' ? -1 : 1;
    return events.filter(event => event.type === 'close' || event.type === 'peeloff').reduce((total, event) => total + ((Number(event.price || 0) - entry) * sign * Number(event.qty || 0)), 0);
  }
  function data() {
    const period = range();
    const synchronized = typeof synchronizedTrades === 'undefined' ? [] : synchronizedTrades;
    const trades = synchronized.filter(trade => trade.status === 'closed' && (() => { const date = closedAt(trade); return date && date >= period.startKey && date <= period.endKey; })());
    const records = readJournal().filter(record => record.date >= period.startKey && record.date <= period.endKey);
    const values = trades.map(result), total = values.reduce((sum, value) => sum + value, 0), wins = values.filter(value => value > 0).length;
    const scored = records.map(record => Number(record.technical?.executionScore)).filter(Number.isFinite);
    const execution = scored.length ? scored.reduce((sum, value) => sum + value, 0) / scored.length : null;
    const avoidable = records.filter(record => ['no', 'partial'].includes(record.technical?.planRespected) || ['some', 'yes'].includes(record.emotional?.impact)).length;
    const emotions = records.flatMap(record => record.emotional?.states || []);
    const linked = records.flatMap(record => (record.technical?.tradeIds || []).map(id => ({ record, id }))).filter(item => trades.some(trade => String(trade.id) === String(item.id)));
    return { period, trades, records, values, total, wins, execution, avoidable, emotions, linked };
  }
  function selectLatestAvailablePeriod() {
    if (initialPeriodSelected) return;
    const journalDates = readJournal().map(record => record.date).filter(Boolean);
    const synchronized = typeof synchronizedTrades === 'undefined' ? [] : synchronizedTrades;
    const tradeDates = synchronized.filter(trade => trade.status === 'closed').map(closedAt).filter(Boolean);
    const latest = [...journalDates, ...tradeDates].sort().at(-1);
    if (!latest) return;
    anchor = dateFromKey(latest);
    initialPeriodSelected = true;
  }
  function render() {
    selectLatestAvailablePeriod();
    const summary = data(), { period } = summary;
    const tradeCount = summary.trades.length, winRate = tradeCount ? summary.wins / tradeCount * 100 : 0;
    const aPlus = summary.trades.filter(trade => trade.rubric_grade === 'A+').length;
    const mostFrequentEmotion = [...new Set(summary.emotions)].sort((a, b) => summary.emotions.filter(item => item === b).length - summary.emotions.filter(item => item === a).length)[0];
    const reflection = tradeCount
      ? summary.total >= 0 ? 'O resultado foi positivo. Revise o processo que permitiu repetir decisões de qualidade antes de aumentar o risco.' : 'O resultado foi negativo. Use o mês para separar o que pertence à variância do que precisa ser ajustado no processo.'
      : 'Ainda não há trades encerrados neste período. Registros de espera e contexto também ajudam a construir a próxima decisão.';
    const notes = summary.linked.map(({ record, id }) => {
      const trade = summary.trades.find(item => String(item.id) === String(id));
      const body = record.shared?.lesson || record.technical?.session || record.emotional?.note;
      return body ? `<article class="weekly-note"><b>${esc(trade?.ticker || trade?.asset || 'Trade')} · ${dateLabel(dateFromKey(record.date))}</b><p>${esc(body)}</p></article>` : '';
    }).filter(Boolean).join('');
    const plays = summary.trades.map(trade => {
      const tradeResult = result(trade), finished = closedAt(trade), grade = trade.rubric_grade || '—';
      return `<article class="weekly-play"><div class="weekly-play-main"><span class="weekly-play-symbol">${esc(trade.ticker || trade.asset || '—')}</span><div><b>${esc(trade.setup || 'Setup não informado')}</b><small>${esc(trade.direction === 'short' ? 'Short' : 'Long')} · encerrado em ${finished ? dateLabel(dateFromKey(finished)) : '—'}</small></div></div><div class="weekly-play-result"><span class="weekly-grade ${grade === 'A+' ? 'is-a-plus' : ''}">${esc(grade)}</span><strong class="${tradeResult >= 0 ? 'positive' : 'negative'}">${tradeResult >= 0 ? '+' : ''}${money(tradeResult)}</strong><button type="button" data-position-id="${esc(trade.id)}">Ver posição →</button></div></article>`;
    }).join('');
    root.innerHTML = `<main class="weekly-review-page">
      <header class="weekly-review-hero"><div><span>REVISÃO MENSAL · DADOS REAIS</span><h1>O processo aparece<br>quando você olha a amostra.</h1><p>Trades encerrados e registros do Diário reunidos para transformar execução em aprendizado.</p></div><div class="weekly-period"><button type="button" data-period="previous" aria-label="Mês anterior">‹</button><div><small>PERÍODO ANALISADO</small><b>${monthLabel(period.start)}</b></div><button type="button" data-period="next" aria-label="Próximo mês">›</button></div></header>
      <section class="weekly-metrics"><article><small>RESULTADO REALIZADO</small><strong class="${summary.total >= 0 ? 'positive' : 'negative'}">${money(summary.total)}</strong><span>${tradeCount} trade(s) encerrado(s)</span></article><article><small>TAXA DE ACERTO</small><strong>${percent(winRate)}</strong><span>${summary.wins} ganho(s) · ${tradeCount - summary.wins} perda(s)</span></article><article><small>EXECUÇÃO NO DIÁRIO</small><strong>${summary.execution == null ? '—' : `${summary.execution.toFixed(1).replace('.', ',')} / 10`}</strong><span>${summary.records.length} registro(s) no período</span></article><article><small>TRADES A+</small><strong>${aPlus}/${tradeCount || '—'}</strong><span>${tradeCount ? percent(aPlus / tradeCount * 100) : 'Sem trades encerrados'}</span></article></section>
      <section class="weekly-summary-grid"><article class="weekly-reflection"><small>LEITURA DO MÊS</small><h2>${reflection}</h2><span>${monthLabel(period.start)} · leitura baseada nos dados disponíveis</span></article><article class="weekly-behaviour"><header><small>COMPORTAMENTO E EXECUÇÃO</small><h2>O que o Diário registrou</h2></header><dl><div><dt>Registros com ponto de atenção</dt><dd class="${summary.avoidable ? 'warning' : 'positive'}">${summary.avoidable ? `${summary.avoidable} para revisar` : 'Nenhum registrado'}</dd></div><div><dt>Emoção mais recorrente</dt><dd>${esc(mostFrequentEmotion || 'Sem registro')}</dd></div><div><dt>Plano respeitado</dt><dd>${summary.records.length ? `${summary.records.filter(record => record.technical?.planRespected === 'yes').length}/${summary.records.length}` : 'Sem registro'}</dd></div></dl></article></section>
      <section class="weekly-details"><header><div><small>PLAYS DO MÊS</small><h2>Operações que geraram este resultado</h2></div><button type="button" data-period="journal">Abrir Diário →</button></header><div class="weekly-plays">${plays || '<div class="weekly-empty">Nenhum trade foi encerrado neste período.</div>'}</div><div class="weekly-learning"><small>APRENDIZADOS VINCULADOS</small><div class="weekly-notes">${notes || '<div class="weekly-empty">Nenhuma anotação do Diário foi vinculada a estes plays. O vínculo é opcional e pode ser criado no Diário.</div>'}</div></div></section>
    </main>`;
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.period === 'journal') {
      const monthKey = range().startKey.slice(0, 7);
      if (!window.openJournalForMonth?.(monthKey)) go('journal');
      return;
    }
    if (button.dataset.positionId) { window.openPositionFromJournal?.(button.dataset.positionId); return; }
    if (button.dataset.period === 'previous' || button.dataset.period === 'next') { anchor.setMonth(anchor.getMonth() + (button.dataset.period === 'previous' ? -1 : 1)); render(); }
  });
  window.renderWeeklyReview = render;
  const previousGo = window.go;
  window.go = function (id) { previousGo(id); if (id === 'review') render(); };
  window.addEventListener('healthyTrend:workspaceLoaded', render);
  window.addEventListener('healthyTrend:authenticated', () => window.setTimeout(render, 400));
  render();
})();

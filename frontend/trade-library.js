(function () {
  'use strict';
  const root = document.getElementById('tradelibrary');
  if (!root) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const state = { year: '', month: '', day: '', urls: [], previewId: null };
  const text = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const storage = () => window.healthyTrendWorkspace?.storage;
  const dateLabel = value => new Date(`${value}T12:00:00`).toLocaleDateString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  const ticker = name => String(name || '').toUpperCase().match(/\b[A-Z]{4}\d{1,2}\b/)?.[0] || null;
  function closePreview() { root.querySelector('.trade-library-lightbox')?.remove(); state.previewId = null; }
  function previewItems() { return filtered(images()); }
  function navigatePreview(step) {
    const items = previewItems();
    const index = items.findIndex(item => item.id === state.previewId);
    const next = items[index + step];
    if (!next) return;
    root.querySelector(`button[data-action="preview"][data-evidence-id="${CSS.escape(next.id)}"]`) && openPreview(root.querySelector(`button[data-action="preview"][data-evidence-id="${CSS.escape(next.id)}"]`));
  }
  async function openPreview(button) {
    const previewId = button.dataset.evidenceId;
    const title = button.dataset.name || text('Print de trade', 'Trade screenshot');
    let source = button.querySelector('img')?.getAttribute('src');
    if (!source && button.dataset.evidenceId && window.healthyTrendApi?.requestBlob) {
      try { source = URL.createObjectURL(await window.healthyTrendApi.requestBlob(`/api/journal-attachments/${encodeURIComponent(button.dataset.evidenceId)}/content`)); state.urls.push(source); }
      catch (_) { return; }
    }
    if (!source) return;
    closePreview(); state.previewId = previewId;
    const items = previewItems(), index = items.findIndex(item => item.id === previewId);
    const dialog = document.createElement('section'); dialog.className = 'trade-library-lightbox'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', title);
    dialog.innerHTML = `<figure><button type="button" class="trade-library-close" data-action="close-preview" aria-label="${text('Fechar visualização', 'Close preview')}">×</button><button type="button" class="trade-library-preview-nav previous" data-action="previous-preview" ${index <= 0 ? 'disabled' : ''} aria-label="${text('Print anterior', 'Previous screenshot')}">←</button><img src="${esc(source)}" alt="${esc(title)}"><button type="button" class="trade-library-preview-nav next" data-action="next-preview" ${index < 0 || index >= items.length - 1 ? 'disabled' : ''} aria-label="${text('Próximo print', 'Next screenshot')}">→</button><figcaption>${esc(title)}<small>← → ${text('Use as setas do teclado para navegar pelos prints', 'Use your keyboard arrows to browse screenshots')}</small></figcaption></figure>`;
    root.append(dialog); dialog.querySelector('button').focus();
  }
  function records() {
    try { return window.JournalV2Model?.load(storage(), []).records || []; }
    catch (_) { return []; }
  }
  function images() {
    return records().flatMap(record => (record.evidence || [])
      .filter(item => item.type?.startsWith('image/'))
      .map(item => ({ ...item, date: record.date, recordId: record.id, ticker: ticker(item.name) })))
      .sort((a, b) => `${b.date}${b.createdAt || ''}`.localeCompare(`${a.date}${a.createdAt || ''}`));
  }
  function clearUrls() { state.urls.forEach(URL.revokeObjectURL); state.urls = []; }
  function choices(values, selected, all) { return `<option value="">${all}</option>${values.map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('')}`; }
  function filtered(items) {
    return items.filter(item => (!state.year || item.date?.slice(0, 4) === state.year)
      && (!state.month || item.date?.slice(0, 7) === state.month)
      && (!state.day || item.date === state.day));
  }
  async function hydrate() {
    for (const item of filtered(images())) {
      const image = root.querySelector(`[data-trade-library-image="${CSS.escape(item.id)}"]`);
      if (!image || !window.healthyTrendApi?.requestBlob) continue;
      try { const url = URL.createObjectURL(await window.healthyTrendApi.requestBlob(`/api/journal-attachments/${encodeURIComponent(item.id)}/content`)); state.urls.push(url); if (image.isConnected) image.src = url; }
      catch (_) { /* The tile retains its neutral fallback if the private file is unavailable. */ }
    }
  }
  function render() {
    clearUrls();
    const all = images(), years = [...new Set(all.map(item => item.date?.slice(0, 4)).filter(Boolean))].sort().reverse();
    const months = [...new Set(all.map(item => item.date?.slice(0, 7)).filter(Boolean))].sort().reverse();
    const days = [...new Set(all.map(item => item.date).filter(Boolean))].sort().reverse();
    const items = filtered(all);
    root.innerHTML = `<div class="trade-library"><header class="trade-library-head"><div><p>${text('Acompanhamento · evidências', 'Tracking · evidence')}</p><h1>${text('Biblioteca de Trades', 'Playbook - Trades')}</h1><span>${text('Todos os prints salvos no Diário, organizados para sua revisão.', 'Every screenshot saved in the Journal, organised for your review.')}</span></div><b>${items.length} ${text(items.length === 1 ? 'print' : 'prints', items.length === 1 ? 'screenshot' : 'screenshots')}</b></header><section class="trade-library-filter" aria-label="${text('Filtros da Biblioteca de Trades', 'Playbook filters')}"><label>${text('Ano', 'Year')}<select data-filter="year">${choices(years, state.year, text('Todos os anos', 'All years'))}</select></label><label>${text('Mês', 'Month')}<select data-filter="month">${choices(months, state.month, text('Todos os meses', 'All months'))}</select></label><label>${text('Dia', 'Day')}<select data-filter="day">${choices(days, state.day, text('Todos os dias', 'All days'))}</select></label><button type="button" data-action="clear">${text('Limpar filtros', 'Clear filters')}</button></section>${items.length ? `<section class="trade-library-grid">${items.map(item => `<article class="trade-library-card"><button type="button" class="trade-library-image" data-action="preview" data-evidence-id="${esc(item.id)}" data-name="${esc(item.name)}" aria-label="${text('Ampliar', 'Enlarge')} ${esc(item.name)}"><img data-trade-library-image="${esc(item.id)}" alt="${esc(item.name)}"><span>⌁</span></button><div><small>${esc(dateLabel(item.date))}</small>${item.ticker ? `<h2>${esc(item.ticker)}</h2>` : ''}<p>${esc(item.name)}</p><button type="button" data-record="${esc(item.recordId)}">${text('Abrir no Diário →', 'Open in Journal →')}</button></div></article>`).join('')}</section>` : `<section class="trade-library-empty"><b>${text('Ainda não há prints para este período.', 'There are no screenshots for this period yet.')}</b><p>${text('No Diário do Trader, use Anexar / Ctrl+V para que seus prints apareçam automaticamente aqui.', 'In the Trader Journal, use Attach / Ctrl+V and your screenshots will appear here automatically.')}</p><button type="button" data-action="journal">${text('Abrir Diário do Trader', 'Open Trader Journal')}</button></section>`}</div>`;
    hydrate();
  }
  root.addEventListener('change', event => {
    const filter = event.target.dataset.filter; if (!filter) return;
    state[filter] = event.target.value;
    if (filter === 'year') { state.month = ''; state.day = ''; }
    if (filter === 'month') { state.day = ''; }
    render();
  });
  root.addEventListener('click', event => {
    if (event.target.classList.contains('trade-library-lightbox')) { closePreview(); return; }
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.action === 'close-preview') { closePreview(); return; }
    if (button.dataset.action === 'previous-preview') { navigatePreview(-1); return; }
    if (button.dataset.action === 'next-preview') { navigatePreview(1); return; }
    if (button.dataset.action === 'preview') { openPreview(button); return; }
    if (button.dataset.action === 'clear') { state.year = ''; state.month = ''; state.day = ''; render(); return; }
    if (button.dataset.action === 'journal') { window.go?.('journal'); return; }
    if (button.dataset.record) window.openJournalRecord?.(button.dataset.record);
  });
  document.addEventListener('keydown', event => {
    if (!root.querySelector('.trade-library-lightbox')) return;
    if (event.key === 'Escape') { closePreview(); return; }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); navigatePreview(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  window.renderTradeLibrary = render;
  const goWithTradeLibrary = window.go;
  window.go = function (id) { goWithTradeLibrary(id); if (id === 'tradelibrary') render(); };
  window.addEventListener('healthyTrend:workspaceLoaded', render);
  render();
}());

(function () {
  'use strict';
  const M = window.JournalV2Model;
  const root = document.getElementById('journal');
  if (!root || !M) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const text = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const locale = () => window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR';
  const emotions = ['Paciente', 'Disciplinado', 'Calmo', 'Ansioso', 'Confiante', 'Frustrado', 'Impulsivo', 'Raiva / Irritado', 'Medroso', 'Ganancioso'];
  const checks = ['Trades somente no Diário + 4H', 'Somente setup A', 'Entrada na contração do 4H', 'Não comprei expansão', 'Position sizing correto', 'Volatilidade considerada', 'Regras não foram alteradas'];
  const patterns = ['Monitorar risco em andamento antes de decidir zerar uma posição', 'Esperar o fechamento do candle gatilho antes de executar'];
  const icons = {
    technical: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V11M10 19V6M16 19V9M22 19V3"/><path d="m3 8 5-4 5 3 8-6"/></svg>',
    emotional: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4a4 4 0 0 0-7 2 4 4 0 0 0 1 7 4 4 0 0 0 5 6h1M15 4a4 4 0 0 1 7 2 4 4 0 0 1-1 7 4 4 0 0 1-5 6h-1M12 4v16M8 8h1m6 0h1M7 13h2m6 0h2"/></svg>',
    lessons: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H11v17H5.5A2.5 2.5 0 0 0 3 22.5zM21 5.5A2.5 2.5 0 0 0 18.5 3H13v17h5.5a2.5 2.5 0 0 1 2.5 2.5z"/></svg>',
    patterns: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0 1 5"/><path d="M20 4v7h-7"/></svg>'
  };
  const storage = window.healthyTrendWorkspace?.storage;
  const tradeLocalUrls = new Map();
  function stripDataUrls(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj.records)) {
      obj.records.forEach(r => {
        (r.evidence || []).forEach(e => { delete e.dataUrl; });
        (r.trades || []).forEach(t => {
          (t.images || []).forEach(i => { delete i.dataUrl; });
        });
      });
    }
  }
  let data, selected, pane = 'technical', month, saveError = '', busy = false, activeView = 'day';
  let evidenceUrls = [];
  try {
    data = M.load(storage, []);
    stripDataUrls(data);
    if (!data.records.length) M.ensureDay(data, M.today());
    selected = [...data.records].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0].id;
    month = (current().date || '').slice(0, 7);
  } catch (error) {
    window.renderJournalBook = () => { root.innerHTML = `<section class="jv-load-error"><h1>${text('Seus registros foram preservados.', 'Your records have been preserved.')}</h1><p>${text('Não foi possível ler os dados do diário. Nenhum registro foi substituído. Exporte uma cópia para recuperar o conteúdo.', 'The journal could not be read. No record was replaced. Export a copy to recover the content.')}</p><button type="button" id="jv-recovery">${text('Exportar dados originais', 'Export original data')}</button></section>`; root.querySelector('button').onclick = () => download(new Blob([JSON.stringify({ v1: storage.getItem(M.LEGACY_KEY), v2: storage.getItem(M.KEY) })], { type: 'application/json' }), 'diario-recuperacao.json'); };
    window.renderJournalBook(); return;
  }
  function current() { return data.records.find(item => item.id === selected); }
  function dateLabel(date, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
    return date ? new Date(`${date}T12:00:00`).toLocaleDateString(locale(), options) : text('Data antiga não reconhecida', 'Unrecognised legacy date');
  }
  function status(message, error = false, saved = false) {
    const els = root.querySelectorAll('#jv-save-status, #jv-trade-save-status');
    els.forEach(el => {
      el.textContent = message;
      el.classList.toggle('is-error', error);
      el.classList.remove('is-saved-flash');
      if (saved) {
        void el.offsetWidth;
        el.classList.add('is-saved-flash');
      }
    });
  }
  let persistTimer = null;
  function persist(explicit = false) {
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    stripDataUrls(data);
    current().updatedAt = new Date().toISOString();
    try {
      M.save(storage, data);
      saveError = '';
      if (explicit) {
        const timeStr = new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const successMsg = text(`✓ Salvo às ${timeStr}`, `✓ Saved at ${timeStr}`);
        status(successMsg, false, true);
        window.showToast?.(text('Salvo na sua conta.', 'Saved to your account.'));
      } else {
        status(text('Alterações salvas.', 'Changes saved.'));
      }
      return true;
    }
    catch (error) {
      saveError = text('Não foi possível salvar. Suas alterações continuam nesta tela; libere espaço e tente salvar novamente.', 'Could not save. Your changes remain on this screen; free up space and try saving again.');
      status(saveError, true);
      return false;
    }
  }
  function debouncePersist(delay = 400) {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persist();
    }, delay);
  }
  function openDay(date) {
    if (saveError && !persist()) return;
    try { selected = M.ensureDay(data, date).id; month = date.slice(0, 7); activeView = 'day'; render(true); }
    catch (error) { status(error.message, true); }
  }
  function field(path, label, value, placeholder = '', rows = 4) {
    return `<label class="jv-field">${label}<textarea data-field="${path}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea></label>`;
  }
  const JOURNAL_MARKETS = {
    ibov: { key: 'ibov', marketCycleId: 'stock_b3', name: 'Ações B3', benchmark: 'IBOV', fullName: 'Índice Bovespa' },
    bdr: { key: 'bdr', marketCycleId: 'bdr', name: 'BDRs', benchmark: 'BDRX', fullName: 'Índice de BDRs Não Patrocinados' },
    ifix: { key: 'ifix', marketCycleId: 'ifix', name: 'FIIs', benchmark: 'IFIX', fullName: 'Índice de Fundos Imobiliários' }
  };
  function journalMarketMeta(key) {
    return JOURNAL_MARKETS[key] || JOURNAL_MARKETS.ibov;
  }
  function getMarketCycleSnapshot(marketKey) {
    try {
      const raw = storage.getItem('healthy-trend-market-cycle-snapshots-v1') || (typeof localStorage !== 'undefined' ? localStorage.getItem('healthy-trend-market-cycle-snapshots-v1') : null);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const meta = journalMarketMeta(marketKey);
      return parsed[meta.marketCycleId] || null;
    } catch (_) {
      return null;
    }
  }
  function marketContextSection(tech) {
    const activeMarkets = Array.isArray(tech.markets) && tech.markets.length
      ? tech.markets
      : (tech.market ? [tech.market] : []);
    const availableToAdd = Object.values(JOURNAL_MARKETS).filter(m => !activeMarkets.includes(m.key));

    let bodyHtml = '';
    if (activeMarkets.length === 0) {
      bodyHtml = `
        <div class="jv-market-empty-state">
          <span class="jv-hint">${text('Nenhum mercado selecionado para este dia. Escolha qual mercado operou ou avaliou:', 'No market selected for this day. Choose which market you operated or evaluated:')}</span>
          <div class="jv-market-add-bar">
            ${Object.values(JOURNAL_MARKETS).map(m => `
              <button type="button" class="jv-market-add-btn" data-action="add-journal-market" data-market="${m.key}" data-set="technical.market" data-value="${m.key}">
                <span class="jv-add-plus">＋</span>
                <b>${m.name}</b>
                <span class="jv-market-badge">${m.benchmark}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      bodyHtml = `
        <div class="jv-active-markets-list">
          ${activeMarkets.map(mKey => {
            const meta = journalMarketMeta(mKey);
            const currentState = (tech.marketStates && tech.marketStates[mKey]) || (mKey === tech.market ? tech.marketState : null);
            return `
              <div class="jv-market-card" data-market-key="${mKey}">
                <div class="jv-market-card-header">
                  <div class="jv-market-card-title">
                    <span class="jv-market-card-dot"></span>
                    <b>${meta.name}</b>
                    <span class="jv-market-badge">${meta.benchmark}</span>
                  </div>
                  <button type="button" class="jv-market-remove-btn" data-action="remove-journal-market" data-market="${mKey}" title="${text('Remover este mercado deste dia', 'Remove this market from this day')}" aria-label="${text('Remover', 'Remove')} ${meta.name}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    <span>${text('Remover', 'Remove')}</span>
                  </button>
                </div>
                <div class="jv-market-card-body">
                  <span class="jv-hint">${text('Permissão do mercado', 'Market permission')}</span>
                  <div class="jv-options">
                    ${[['down', 'Down'], ['transition', text('Transição', 'Transition')], ['up', text('Saudável', 'Healthy')]].map(([val, lbl]) => `
                      <button type="button" 
                              class="${String(currentState) === val ? 'chosen' : ''}" 
                              data-action="set-market-state" 
                              data-market="${mKey}" 
                              data-value="${val}" 
                              data-set="technical.marketState"
                              aria-pressed="${String(currentState) === val}">
                        ${lbl}
                      </button>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${availableToAdd.length > 0 ? `
          <div class="jv-market-add-more">
            <button type="button" class="jv-market-add-toggle" data-action="toggle-add-market">
              <span class="jv-add-plus">＋</span> ${text('Adicionar outro mercado para este dia', 'Add another market for this day')}
            </button>
            <div class="jv-market-add-dropdown" id="jv-add-market-dropdown" hidden>
              <span class="jv-hint">${text('Selecione o mercado adicional:', 'Select additional market:')}</span>
              <div class="jv-market-add-options">
                ${availableToAdd.map(m => `
                  <button type="button" class="jv-market-add-btn" data-action="add-journal-market" data-market="${m.key}" data-set="technical.market" data-value="${m.key}">
                    <span class="jv-add-plus">＋</span> <b>${m.name}</b> <span class="jv-market-badge">${m.benchmark}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}
      `;
    }

    return `<fieldset class="jv-market-fieldset">
      <legend>1. ${text('Contexto do mercado', 'Market context')}</legend>
      ${bodyHtml}
    </fieldset>`;
  }
  function options(path, values, selectedValue) {
    return `<div class="jv-options">${values.map(([value, label]) => `<button type="button" data-set="${path}" data-value="${value}" aria-pressed="${String(selectedValue) === String(value)}" class="${String(selectedValue) === String(value) ? 'chosen' : ''}">${label}</button>`).join('')}</div>`;
  }
  function dayTrades() {
    const remote = typeof synchronizedTrades === 'undefined' ? [] : synchronizedTrades;
    const local = typeof operationalState === 'undefined' ? [] : [...(operationalState.positions || []), ...(operationalState.closedPositions || [])];
    return M.tradesForDay(current().date, [...remote, ...local]);
  }
  function tradeMoment(item) {
    const opened = M.entryDate(item), closed = M.closeDate(item);
    if (closed === current().date) return text('Encerrado neste dia', 'Closed on this day');
    if (opened === current().date) return text('Aberto neste dia', 'Opened on this day');
    return text('Trade relacionado', 'Related trade');
  }
  function linkedTradeSummary() {
    const linked = dayTrades().filter(item => current().technical.tradeIds.includes(item.id));
    if (!linked.length) return `<section class="jv-linked-trades jv-linked-trades-inline is-empty"><div><span>${text('Trades deste registro', 'Trades in this entry')}</span><p>${text('Conecte um trade para registrar a execução dentro deste dia.', 'Connect a trade to record its execution in this day.')}</p></div><button type="button" data-action="trades">＋ ${text('Vincular trade', 'Link trade')}</button></section>`;
    const trades = linked.map(item => `<div class="jv-linked-trade"><b>${esc(item.ticker || item.asset)} · ${esc(tradeMoment(item))}</b><button type="button" data-position-id="${esc(item.id)}">${text('Ver posição', 'View position')} →</button></div>`).join('');
    return `<section class="jv-linked-trades jv-linked-trades-inline"><div class="jv-linked-trades-copy"><span>${text('Trades deste registro', 'Trades in this entry')}</span><div class="jv-linked-trade-list">${trades}</div></div><button type="button" data-action="trades">${text('Gerenciar', 'Manage')} →</button></section>`;
  }
  function evidenceLabel() {
    const files = current().evidence;
    const images = files.filter(item => item.type.startsWith('image/')).length;
    const audio = files.filter(item => item.type.startsWith('audio/')).length;
    const other = files.length - images - audio;
    return files.length ? [images && `📷 ${images} prints`, audio && `♫ ${audio} ${text('áudios', 'audio')}`, other && `📎 ${other} ${text('anexos', 'files')}`].filter(Boolean).join(' · ') : text('Adicionar prints, áudio ou anexos', 'Add screenshots, audio or files');
  }
  function evidenceKind(item) { return item.kind === 'market' ? 'market' : 'asset'; }
  function evidenceKindLabel(kind) { return kind === 'market' ? text('Mercado / índice', 'Market / index') : text('Ativo / trade', 'Asset / trade'); }
  function evidenceStrip() {
    const items = current().evidence.slice(0, 3);
    const imageCount = current().evidence.filter(item => item.type?.startsWith('image/') && item.type !== 'image/svg+xml').length;
    return `<div class="jv-evidence-strip">${items.map(item => `<button type="button" class="jv-evidence-thumb" data-evidence-id="${esc(item.id)}" title="${esc(item.name)}" aria-label="${text('Abrir', 'Open')} ${esc(item.name)}">${item.type.startsWith('image/') ? `<img data-evidence-thumb="${esc(item.id)}" alt="${esc(item.name)}">` : `<span>${item.type.startsWith('audio/') ? '♫' : '📎'}</span>`}<small>${esc(item.name)}</small></button>`).join('')}${current().evidence.length > 3 ? `<div class="jv-evidence-more">+${current().evidence.length - 3}</div>` : ''}<button type="button" class="jv-evidence-add" data-action="evidence" aria-label="${text('Anexar arquivo ou colar print', 'Attach a file or paste a screenshot')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 6-6a3 3 0 1 1 4 4l-8 8a5 5 0 0 1-7-7l8-8"/></svg><small>${text('Anexar / Ctrl+V', 'Attach / Ctrl+V')}</small></button></div>${imageCount > 1 ? `<small class="jv-evidence-keyboard-hint">← → ${text('Abra um print e use as setas do teclado para navegar entre as imagens.', 'Open a screenshot and use the keyboard arrows to browse images.')}</small>` : ''}`;
  }
  function patternsSection(e) {
    return `<section class="jv-patterns"><header><span class="jv-title-icon">${icons.patterns}</span><div><h3>${text('Padrões e soluções', 'Patterns and solutions')}</h3><p>${text('(observações adicionais)', '(additional observations)')}</p></div></header>${field('shared.patterns', text('O que está se repetindo e como você quer responder?', 'What is repeating and how do you want to respond?'), e.shared.patterns, text('Registre o padrão que percebeu e a solução que pretende aplicar.', 'Record the pattern you noticed and the solution you intend to apply.'), 4)}<div class="jv-pattern-save"><button class="jv-save" type="button" data-action="save">✓ ${text('Salvar registro', 'Save entry')}</button><p id="jv-save-status" role="status" class="${saveError ? 'is-error' : ''}">${esc(saveError || (e.updatedAt ? text('Registro salvo na sua conta.', 'Entry saved in your account.') : text('Escreva no seu ritmo. As alterações são salvas na sua conta.', 'Write at your own pace.')))}</p></div></section>`;
  }
  function importedSourceSection(e) {
    if (!e.imports?.length) return '';
    return `<details class="jv-evernote-source"><summary>${text('Histórico importado do Evernote', 'History imported from Evernote')} · ${e.imports.length} ${text('notas', 'notes')}</summary><p>${text('Os textos e transcrições originais foram preservados. Emoções importadas são apenas as opções marcadas. Intensidade não foi estimada. Aderência, quando preenchida, foi mapeada conservadoramente a partir do checklist.', 'Original texts and transcripts were preserved. Imported emotions are only checked options. Intensity was not estimated. Adherence, when available, was conservatively mapped from the checklist.')}</p>${e.imports.map(source => `<section><b>${esc(source.title)}</b>${source.warning ? `<p>${esc(source.warning)}</p>` : ''}${source.coveredDates?.length > 1 ? `<p>${text('Abrange', 'Covers')}: ${source.coveredDates.map(date => esc(dateLabel(date))).join(' · ')}${source.sourceExecutionScore !== null ? ` · ${text('Avaliação conjunta original', 'Original combined score')}: ${esc(source.sourceExecutionScore)}/10` : ''}</p>` : ''}${source.scoreBasis === 'number-written-after-hoje-fui' ? `<p>${text('Nota de execução recuperada do número escrito após “Hoje fui”, em vez do campo “Nota”. Confira no texto original.', 'Execution score recovered from the number written after “Today I was”, rather than the score field. Check the original text.')}</p>` : ''}${source.conflicts?.length ? `<p>${text('Valores existentes preservados; divergências', 'Existing values preserved; differences')}: ${source.conflicts.map(esc).join(' · ')}</p>` : ''}</section>`).join('')}<pre>${esc(e.shared.observations || '')}</pre></details>`;
  }

  function getTrades(record = current()) {
    if (!record) return [];
    record.trades = Array.isArray(record.trades) ? record.trades : [];
    return record.trades;
  }

  function currentTrade() {
    if (activeView === 'day') return null;
    return getTrades().find(t => t.id === activeView) || null;
  }

  function tradeTabLabel(trade, allTrades) {
    const sameTicker = allTrades.filter(t => t.ticker === trade.ticker);
    if (sameTicker.length > 1) {
      const idx = sameTicker.findIndex(t => t.id === trade.id) + 1;
      return `${trade.ticker} #${idx}`;
    }
    return trade.ticker;
  }

  function setTradeValue(tradeId, fieldPath, value, debounce = false) {
    const trade = getTrades().find(t => t.id === tradeId);
    if (!trade) return;
    const parts = fieldPath.split('.');
    let target = trade;
    while (parts.length > 1) {
      const key = parts.shift();
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      target = target[key];
    }
    target[parts[0]] = value;
    if (fieldPath === 'setup' || fieldPath === 'setupTrigger') {
      const cat = window.SetupTriggersCatalog;
      if (cat) {
        const norm = cat.normalizeKey(value);
        if (norm) {
          trade.setupTrigger = norm;
          trade.setup = cat.getTriggerLabel(norm);
        } else {
          trade.setup = value || 'Não informado';
        }
      }
    }
    if (debounce) debouncePersist();
    else persist();
  }

  function renderSessionNav(record) {
    const trades = getTrades(record);
    return `
      <nav class="jv-session-nav" role="tablist" aria-label="${text('Seções do dia e trades', 'Session and trades navigation')}">
        <button type="button" class="jv-session-tab ${activeView === 'day' ? 'is-active' : ''}" data-nav-view="day" role="tab" aria-selected="${activeView === 'day'}">
          <span class="jv-tab-icon">📖</span>
          <span class="jv-tab-title">${text('DIÁRIO DO DIA', 'DAY JOURNAL')}</span>
          <span class="jv-tab-subtag">${text('Sessão', 'Session')}</span>
        </button>

        <span class="jv-session-nav-divider" aria-hidden="true"></span>
        <span class="jv-trades-nav-label" aria-hidden="true">${text('TRADES DO DIA:', 'TRADES OF THE DAY:')}</span>

        ${trades.map(tr => {
          const label = tradeTabLabel(tr, trades);
          const isLong = tr.direction !== 'short';
          const isSelected = activeView === tr.id;
          const gradeClass = tr.grade ? `grade-${tr.grade.toLowerCase().replace('+', 'plus')}` : '';
          return `
            <button type="button" class="jv-session-tab jv-trade-tab ${isSelected ? 'is-active' : ''}" data-nav-view="${esc(tr.id)}" role="tab" aria-selected="${isSelected}">
              <span class="jv-tab-dir-pill ${isLong ? 'is-long' : 'is-short'}">${isLong ? text('COMPRA', 'LONG') : text('VENDA', 'SHORT')}</span>
              <span class="jv-tab-title"><b>${esc(label)}</b></span>
              ${tr.grade ? `<span class="jv-tab-grade ${gradeClass}">${esc(tr.grade)}</span>` : ''}
              ${tr.management?.rMultiple ? `<span class="jv-tab-r">${esc(tr.management.rMultiple)}</span>` : ''}
            </button>
          `;
        }).join('')}

        <button type="button" class="jv-session-tab jv-add-trade-btn" data-action="new-trade" title="${text('Adicionar novo trade neste dia', 'Add new trade on this day')}">
          <span class="jv-tab-icon">＋</span>
          <span>${text('Adicionar Trade', 'Add Trade')}</span>
        </button>
      </nav>
    `;
  }

  function renderDayTradesOverview(record) {
    const trades = getTrades(record);
    const count = trades.length;
    return `
      <section class="jv-trades-day-section" aria-labelledby="jv-trades-day-title">
        <header class="jv-trades-day-header">
          <div class="jv-trades-day-title">
            <span class="jv-title-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V11M10 19V6M16 19V9M22 19V3"/><path d="m3 8 5-4 5 3 8-6"/></svg></span>
            <div>
              <h3 id="jv-trades-day-title">${text('TRADES DO DIA', 'TRADES OF THE DAY')} <span class="jv-trades-count">${count}</span></h3>
              <p>${text('Operações individuais executadas nesta sessão · Cada ativo possui análise, prints e pós-trade próprios.', 'Individual trades executed in this session · Each asset has its own analysis, screenshots, and post-trade.')}</p>
            </div>
          </div>
        </header>

        ${!count ? `
          <div class="jv-trades-empty-box">
            <div class="jv-trades-empty-icon">📈</div>
            <h4>${text('Nenhum trade individual registrado para este dia', 'No individual trades recorded for this day')}</h4>
            <p>${text('Documente seus trades individualmente para catalogar o PlayBook. Cada operação conta com identificação, o que você viu, parâmetros da execução, print do gráfico, condução e lições pós-trade.', 'Document your trades individually to build an auditable PlayBook. Each trade includes setup, chart thesis, execution parameters, screenshot, management, and post-trade review.')}</p>
            <button type="button" class="jv-btn-add-trade-primary" data-action="new-trade">＋ ${text('Adicionar Trade', 'Add Trade')}</button>
          </div>
        ` : `
          <div class="jv-trades-cards-grid">
            ${trades.map((tr, idx) => {
              const isLong = tr.direction !== 'short';
              const label = tradeTabLabel(tr, trades);
              const ex = tr.execution || {};
              const mg = tr.management || {};
              const pt = tr.postTrade || {};
              const gradeClass = tr.grade ? `grade-${tr.grade.toLowerCase().replace('+', 'plus')}` : '';
              return `
                <article class="jv-trade-card" data-nav-view="${esc(tr.id)}">
                  <header class="jv-trade-card-header">
                    <div class="jv-trade-card-ticker">
                      <span class="jv-card-dir-pill ${isLong ? 'is-long' : 'is-short'}">${isLong ? text('COMPRA', 'LONG') : text('VENDA', 'SHORT')}</span>
                      <h4>${esc(label)}</h4>
                      <span class="jv-trade-card-num">Trade #${idx + 1}</span>
                    </div>
                    <div class="jv-trade-card-badges">
                      ${tr.grade ? `<span class="jv-badge-grade ${gradeClass}">${esc(tr.grade)}</span>` : ''}
                      ${mg.rMultiple ? `<span class="jv-badge-r">${esc(mg.rMultiple)}</span>` : ''}
                    </div>
                  </header>
                  <div class="jv-trade-card-body">
                    <div class="jv-card-info-row">
                      <span class="jv-card-info-label">${text('Gatilho de Entrada', 'Entry Trigger')}:</span>
                      <b class="jv-card-info-val">${esc((window.SetupTriggersCatalog ? window.SetupTriggersCatalog.getTriggerLabel(tr.setupTrigger || tr.setup) : null) || tr.setup || 'Não informado')}</b>
                    </div>
                    <div class="jv-card-info-row">
                      <span class="jv-card-info-label">${text('Tempo / Horário', 'Timeframe / Time')}:</span>
                      <span class="jv-card-info-val">${esc(tr.timeframe || 'Diário + 4H')} · ${esc(tr.entryTime || '—')}</span>
                    </div>
                    ${ex.entryPrice != null ? `
                      <div class="jv-card-info-row">
                        <span class="jv-card-info-label">${text('Entrada / Stop', 'Entry / Stop')}:</span>
                        <span class="jv-card-info-val"><b>${esc(ex.entryPrice)}</b> / ${ex.initialStop != null ? esc(ex.initialStop) : '—'}</span>
                      </div>
                    ` : ''}
                    ${tr.whatISaw ? `<p class="jv-card-excerpt">“${esc(tr.whatISaw)}”</p>` : ''}
                  </div>
                  <footer class="jv-trade-card-footer">
                    <span class="jv-card-plan-status">${pt.planRespected === 'yes' ? '✓ ' + text('Plano respeitado', 'Plan followed') : pt.planRespected === 'no' ? '× ' + text('Plano não respeitado', 'Plan not followed') : pt.planRespected === 'partial' ? '– ' + text('Parcial', 'Partial') : text('Plano em aberto', 'Plan open')}</span>
                    <button type="button" class="jv-btn-open-trade" data-nav-view="${esc(tr.id)}">${text('Abrir Análise', 'Open Analysis')} →</button>
                  </footer>
                </article>
              `;
            }).join('')}
          </div>
        `}
      </section>
    `;
  }

  function renderTradeSheet(trade, record) {
    if (!trade) {
      activeView = 'day';
      return `<div class="jv-sheet"><p>${text('Trade não encontrado.', 'Trade not found.')}</p><button type="button" data-nav-view="day">← ${text('Voltar ao Diário do Dia', 'Back to Day Journal')}</button></div>`;
    }
    const trades = getTrades(record);
    const tradeIdx = trades.findIndex(t => t.id === trade.id);
    const label = tradeTabLabel(trade, trades);
    const isLong = trade.direction !== 'short';
    const ex = trade.execution || {};
    const mg = trade.management || {};
    const pt = trade.postTrade || {};
    const images = Array.isArray(trade.images) ? trade.images : [];

    let riskDiff = null, riskPct = null;
    if (ex.entryPrice != null && ex.initialStop != null && ex.entryPrice > 0) {
      riskDiff = Math.abs(ex.entryPrice - ex.initialStop);
      riskPct = (riskDiff / ex.entryPrice) * 100;
    }

    return `
      <section class="jv-trade-sheet" data-trade-id="${esc(trade.id)}">
        <header class="jv-trade-sheet-header">
          <div class="jv-trade-breadcrumb">
            <button type="button" class="jv-back-btn" data-nav-view="day">← ${text('Voltar ao Diário do Dia', 'Back to Day Journal')}</button>
            <span class="jv-crumb-sep">/</span>
            <span>${text('TRADES DO DIA', 'TRADES OF THE DAY')}</span>
            <span class="jv-crumb-sep">/</span>
            <strong>${esc(label)}</strong>
          </div>
          <div class="jv-trade-sheet-titlebar">
            <div class="jv-trade-title-left">
              <span class="jv-trade-badge-dir ${isLong ? 'is-long' : 'is-short'}">${isLong ? text('COMPRA', 'LONG') : text('VENDA', 'SHORT')}</span>
              <h2>Trade #${tradeIdx + 1} · ${esc(trade.ticker)}</h2>
              <span class="jv-trade-badge-setup">${esc((window.SetupTriggersCatalog ? window.SetupTriggersCatalog.getTriggerLabel(trade.setupTrigger || trade.setup) : null) || trade.setup || 'Não informado')}</span>
              <span class="jv-trade-badge-tf">${esc(trade.timeframe || 'Diário + 4H')}</span>
              <span class="jv-trade-badge-time">🕒 ${esc(trade.entryTime || '—')}</span>
            </div>
            <div class="jv-trade-title-actions">
              <button type="button" class="jv-btn-delete-trade" data-action="delete-trade" data-trade-id="${esc(trade.id)}" title="${text('Excluir este trade', 'Delete this trade')}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                <span>${text('Excluir', 'Delete')}</span>
              </button>
            </div>
          </div>
        </header>

        <div class="jv-trade-form-grid">
          <!-- 1. IDENTIFICAÇÃO -->
          <fieldset class="jv-trade-section">
            <legend>1. ${text('Identificação do trade', 'Trade identification')}</legend>
            <div class="jv-ident-row">
              <label class="jv-field jv-field-ticker">
                <span>${text('Ticker', 'Ticker')}</span>
                <input type="text" class="jv-input-ticker" data-trade-id="${esc(trade.id)}" data-trade-field="ticker" value="${esc(trade.ticker)}" maxlength="10">
              </label>

              <div class="jv-field jv-field-dir">
                <span>${text('Direção', 'Direction')}</span>
                <div class="jv-toggle-group">
                  <button type="button" class="jv-toggle-opt ${isLong ? 'chosen' : ''}" data-trade-set="direction" data-value="long" data-trade-id="${esc(trade.id)}">🟢 ${text('Compra', 'Long')}</button>
                  <button type="button" class="jv-toggle-opt ${!isLong ? 'chosen' : ''}" data-trade-set="direction" data-value="short" data-trade-id="${esc(trade.id)}">🔴 ${text('Venda', 'Short')}</button>
                </div>
              </div>

              <label class="jv-field jv-field-setup">
                <span>${text('Gatilho de Entrada', 'Entry Trigger')}</span>
                <select data-trade-id="${esc(trade.id)}" data-trade-field="setup">
                  ${(() => {
                    const catalog = window.SetupTriggersCatalog;
                    const triggers = catalog ? catalog.getAllTriggers() : [
                      { id: 'INSIDE_BAR', name: 'Inside Bar' },
                      { id: 'PFR_COMPRA', name: 'PFR de Compra' },
                      { id: '123_COMPRA', name: '1-2-3 de Compra' },
                      { id: 'DAVE_LANDRY', name: 'Dave Landry' },
                      { id: 'RBI', name: 'Barra Vermelha Ignorada (RBI)' }
                    ];
                    const currentSetup = trade.setup;
                    const currentTrigger = trade.setupTrigger || (catalog ? catalog.normalizeKey(currentSetup) : null);
                    let items = triggers.map(t => [t.id, t.name]);
                    if (currentSetup && !items.some(([id, name]) => id === currentTrigger || name === currentSetup)) {
                      items = [['', currentSetup], ...items];
                    }
                    return items.map(([val, label]) => `
                      <option value="${esc(val)}" ${(trade.setupTrigger === val || trade.setup === label) ? 'selected' : ''}>${esc(label)}</option>
                    `).join('');
                  })()}
                </select>
              </label>
            </div>

            <div class="jv-ident-row">
              <div class="jv-field jv-field-grade">
                <span>${text('Grade da Rubric', 'Rubric Grade')}</span>
                <div class="jv-grade-pills">
                  ${['A+', 'A', 'B', 'C', 'D'].map(g => `
                    <button type="button" class="jv-grade-pill grade-${g.toLowerCase().replace('+', 'plus')} ${trade.grade === g ? 'chosen' : ''}" data-trade-set="grade" data-value="${g}" data-trade-id="${esc(trade.id)}">${g}</button>
                  `).join('')}
                </div>
              </div>

              <label class="jv-field jv-field-tf">
                <span>${text('Timeframe', 'Timeframe')}</span>
                <select data-trade-id="${esc(trade.id)}" data-trade-field="timeframe">
                  ${['Diário + 4H', 'Diário', '4H', '60 minutos', 'Semanal', 'Intraday'].map(tf => `
                    <option value="${esc(tf)}" ${trade.timeframe === tf ? 'selected' : ''}>${esc(tf)}</option>
                  `).join('')}
                </select>
              </label>

              <label class="jv-field jv-field-time">
                <span>${text('Horário da Entrada', 'Entry Time')}</span>
                <input type="time" data-trade-id="${esc(trade.id)}" data-trade-field="entryTime" value="${esc(trade.entryTime || '')}">
              </label>
            </div>
          </fieldset>

          <!-- 2. O QUE VI / PORQUE ENTREI? -->
          <fieldset class="jv-trade-section">
            <legend>2. ${text('O que vi / porque entrei?', 'What I saw / why I entered?')}</legend>
            <span class="jv-hint">${text('Contexto técnico, gatilho gráfico, confluências de edges e tese da operação.', 'Technical context, chart trigger, edge confluences, and trade thesis.')}</span>
            <label class="jv-field">
              <textarea data-trade-id="${esc(trade.id)}" data-trade-field="whatISaw" rows="4" placeholder="${text('Ex: Base de consolidação rompida com volume. No 4H formou pivô com estreitamento de volatilidade alinhado à MM21.', 'E.g.: Consolidation base broken with volume. 4H chart formed pivot with volatility contraction aligned to 21 EMA.')}">${esc(trade.whatISaw || trade.whyIEntered || '')}</textarea>
            </label>
          </fieldset>

          <!-- 3. PRINT DA ENTRADA -->
          <fieldset class="jv-trade-section">
            <legend>3. ${text('Print da entrada', 'Entry screenshot')}</legend>
            <span class="jv-hint">${text('Vincule o print do gráfico exclusivo deste trade para auditoria visual.', 'Attach the chart screenshot exclusive to this trade for visual review.')}</span>
            <div class="jv-trade-images-container">
              ${images.length ? `
                <div class="jv-trade-images-list">
                  ${images.map(img => `
                    <div class="jv-trade-image-card">
                      <div class="jv-trade-image-preview" data-action="zoom-trade-img" data-img-id="${esc(img.id)}" role="button" tabindex="0" title="${text('Clique na imagem para ampliar', 'Click image to zoom')}">
                        <img data-trade-img-thumb="${esc(img.id)}" alt="${esc(img.name || trade.ticker)}">
                        <span class="jv-img-zoom-hint">🔍 ${text('Ampliar', 'Zoom')}</span>
                      </div>
                      <div class="jv-trade-image-meta">
                        <b>${esc(img.name || `${trade.ticker}_print`)}</b>
                        <div class="jv-trade-image-actions">
                          <button type="button" class="jv-btn-img-zoom" data-action="zoom-trade-img" data-img-id="${esc(img.id)}" title="${text('Ampliar print', 'Zoom screenshot')}">🔍 ${text('Ampliar', 'Zoom')}</button>
                          <button type="button" class="jv-btn-img-remove" data-action="remove-trade-img" data-trade-id="${esc(trade.id)}" data-img-id="${esc(img.id)}" title="${text('Remover print', 'Remove screenshot')}">🗑 ${text('Remover', 'Remove')}</button>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div class="jv-trade-upload-dropzone" data-action="trigger-trade-upload" data-trade-id="${esc(trade.id)}">
                  <div class="jv-dropzone-icon">📷</div>
                  <h4>${text('Anexar Print do Gráfico', 'Attach Chart Screenshot')}</h4>
                  <p>${text('Clique para selecionar um arquivo ou pressione Ctrl+V para colar diretamente.', 'Click to choose a file or press Ctrl+V to paste directly.')}</p>
                  <button type="button" class="jv-btn-browse-img" data-action="trigger-trade-upload" data-trade-id="${esc(trade.id)}">＋ ${text('Selecionar Imagem', 'Select Image')}</button>
                </div>
              `}
              <input type="file" class="jv-hidden-file-input" id="jv-trade-file-${esc(trade.id)}" data-trade-id="${esc(trade.id)}" accept="image/*" style="display:none">
            </div>
          </fieldset>

          <!-- PÓS-TRADE / APRENDIZADO -->
          <fieldset class="jv-trade-section">
            <div class="jv-post-grid">
              <label class="jv-field">
                <span>${text('O que fiz certo?', 'What did I do right?')}</span>
                <textarea data-trade-id="${esc(trade.id)}" data-trade-field="postTrade.whatWentRight" rows="3" placeholder="${text('Quais regras e comportamentos foram executados com perfeição?', 'Which rules and behaviors were executed perfectly?')}">${esc(pt.whatWentRight || '')}</textarea>
              </label>
              <label class="jv-field">
                <span>${text('O que fiz errado?', 'What did I do wrong?')}</span>
                <textarea data-trade-id="${esc(trade.id)}" data-trade-field="postTrade.whatWentWrong" rows="3" placeholder="${text('Houve hesitação, antecipação, violação de stop ou saída prematura?', 'Was there hesitation, anticipation, stop violation or premature exit?')}">${esc(pt.whatWentWrong || '')}</textarea>
              </label>
              <label class="jv-field jv-post-full">
                <span>${text('O que aprendi?', 'What did I learn?')}</span>
                <textarea data-trade-id="${esc(trade.id)}" data-trade-field="postTrade.lessonsLearned" rows="3" placeholder="${text('Qual a principal lição desta operação que fortalece o seu PlayBook?', 'What is the key takeaway strengthening your PlayBook?')}">${esc(pt.lessonsLearned || '')}</textarea>
              </label>
            </div>
          </fieldset>
        </div>

        <footer class="jv-trade-sheet-footer">
          <button type="button" class="jv-btn-secondary" data-nav-view="day">← ${text('Voltar ao Diário do Dia', 'Back to Day Journal')}</button>
          <div class="jv-trade-save-area">
            <span id="jv-trade-save-status" class="${saveError ? 'is-error' : ''}">${saveError ? esc(saveError) : (trade.createdAt ? text('Alterações salvas.', 'Changes saved.') : '')}</span>
            <button type="button" class="jv-save" data-action="save">✓ ${text('Salvar Trade', 'Save Trade')}</button>
          </div>
        </footer>
      </section>
    `;
  }

  function showAddTradeModal() {
    const e = current();
    const existingDayTrades = dayTrades();
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const linkOptions = existingDayTrades.length ? `
      <div class="jv-modal-quick-import">
        <label>
          <span>${text('Ou importe um trade executado na plataforma hoje:', 'Or import a trade executed on the platform today:')}</span>
          <select id="jv-modal-linked-trade">
            <option value="">${text('— Selecionar trade executado —', '— Select executed trade —')}</option>
            ${existingDayTrades.map(t => `
              <option value="${esc(t.id)}" data-ticker="${esc(t.ticker || t.asset)}" data-direction="${esc(t.direction || 'long')}" data-setup="${esc(t.setup || '')}" data-entry="${esc(t.entryPrice || t.price || '')}">
                ${esc(t.ticker || t.asset)} (${t.direction === 'short' ? 'SHORT' : 'LONG'}) · ${esc(tradeMoment(t))}
              </option>
            `).join('')}
          </select>
        </label>
      </div>
    ` : '';

    const content = `
      <form id="jv-add-trade-form" class="jv-add-trade-form">
        <p class="jv-modal-desc">${text('Inicie o cadastro de um trade realizado nesta sessão. Cada operação terá sua própria aba de análise, métricas e prints.', 'Start recording a trade from this session. Each trade gets its own tab for analysis, metrics, and screenshots.')}</p>

        ${linkOptions}

        <div class="jv-form-row">
          <label class="jv-field">
            <span>${text('Ticker *', 'Ticker *')}</span>
            <input type="text" id="jv-modal-ticker" required placeholder="Ex: MSFT" autofocus style="text-transform:uppercase;font-weight:800">
          </label>

          <div class="jv-field">
            <span>${text('Direção *', 'Direction *')}</span>
            <div class="jv-toggle-group">
              <button type="button" class="jv-toggle-opt chosen" data-modal-dir="long">🟢 ${text('Compra', 'Long')}</button>
              <button type="button" class="jv-toggle-opt" data-modal-dir="short">🔴 ${text('Venda', 'Short')}</button>
            </div>
            <input type="hidden" id="jv-modal-direction" value="long">
          </div>
        </div>

        <div class="jv-form-row">
          <label class="jv-field">
            <span>${text('Gatilho de Entrada *', 'Entry Trigger *')}</span>
            <select id="jv-modal-setup" required>
              <option value="">${text('— Selecione o gatilho —', '— Select entry trigger —')}</option>
              ${(() => {
                const catalog = window.SetupTriggersCatalog;
                const triggers = catalog ? catalog.getAllTriggers() : [
                  { id: 'INSIDE_BAR', name: 'Inside Bar' },
                  { id: 'PFR_COMPRA', name: 'PFR de Compra' },
                  { id: '123_COMPRA', name: '1-2-3 de Compra' },
                  { id: 'DAVE_LANDRY', name: 'Dave Landry' },
                  { id: 'RBI', name: 'Barra Vermelha Ignorada (RBI)' }
                ];
                return triggers.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
              })()}
            </select>
          </label>

          <div class="jv-field">
            <span>${text('Grade da Rubric', 'Rubric Grade')}</span>
            <div class="jv-grade-pills">
              ${['A+', 'A', 'B', 'C', 'D'].map(g => `
                <button type="button" class="jv-grade-pill grade-${g.toLowerCase().replace('+', 'plus')} ${g === 'A' ? 'chosen' : ''}" data-modal-grade="${g}">${g}</button>
              `).join('')}
            </div>
            <input type="hidden" id="jv-modal-grade" value="A">
          </div>
        </div>

        <div class="jv-form-row">
          <label class="jv-field">
            <span>${text('Timeframe', 'Timeframe')}</span>
            <select id="jv-modal-timeframe">
              <option value="Diário + 4H" selected>Diário + 4H</option>
              <option value="Diário">Diário</option>
              <option value="4H">4H</option>
              <option value="60 minutos">60 minutos</option>
              <option value="Semanal">Semanal</option>
              <option value="Intraday">Intraday</option>
            </select>
          </label>

          <label class="jv-field">
            <span>${text('Horário da Entrada', 'Entry Time')}</span>
            <input type="time" id="jv-modal-time" value="${defaultTime}">
          </label>
        </div>

        <footer class="jv-modal-footer">
          <button type="button" data-action="close-dialog" class="jv-btn-cancel">${text('Cancelar', 'Cancel')}</button>
          <button type="submit" class="jv-btn-primary">＋ ${text('Criar Registro do Trade', 'Create Trade Record')}</button>
        </footer>
      </form>
    `;

    dialog(text('Adicionar Trade do Dia', 'Add Trade of the Day'), content);

    const form = root.querySelector('#jv-add-trade-form');
    if (!form) return;

    form.querySelectorAll('[data-modal-dir]').forEach(btn => {
      btn.onclick = () => {
        form.querySelectorAll('[data-modal-dir]').forEach(b => b.classList.remove('chosen'));
        btn.classList.add('chosen');
        form.querySelector('#jv-modal-direction').value = btn.dataset.modalDir;
      };
    });

    form.querySelectorAll('[data-modal-grade]').forEach(btn => {
      btn.onclick = () => {
        form.querySelectorAll('[data-modal-grade]').forEach(b => b.classList.remove('chosen'));
        btn.classList.add('chosen');
        form.querySelector('#jv-modal-grade').value = btn.dataset.modalGrade;
      };
    });

    const linkedSelect = form.querySelector('#jv-modal-linked-trade');
    if (linkedSelect) {
      linkedSelect.onchange = () => {
        const opt = linkedSelect.selectedOptions[0];
        if (!opt || !opt.value) return;
        const ticker = opt.dataset.ticker;
        const dir = opt.dataset.direction;
        const setup = opt.dataset.setup;
        if (ticker) form.querySelector('#jv-modal-ticker').value = ticker;
        if (dir) {
          form.querySelector('#jv-modal-direction').value = dir;
          form.querySelectorAll('[data-modal-dir]').forEach(b => b.classList.toggle('chosen', b.dataset.modalDir === dir));
        }
        if (setup) {
          const norm = window.SetupTriggersCatalog ? window.SetupTriggersCatalog.normalizeKey(setup) : setup;
          if (norm && form.querySelector(`#jv-modal-setup option[value="${norm}"]`)) {
            form.querySelector('#jv-modal-setup').value = norm;
          }
        }
      };
    }

    form.onsubmit = e => {
      e.preventDefault();
      const ticker = (form.querySelector('#jv-modal-ticker').value || '').trim().toUpperCase();
      if (!ticker) {
        alert(text('Por favor, informe o ticker do ativo.', 'Please enter the asset ticker.'));
        return;
      }
      const direction = form.querySelector('#jv-modal-direction').value || 'long';
      const rawSetup = form.querySelector('#jv-modal-setup').value;
      const catalog = window.SetupTriggersCatalog;
      const setupTrigger = catalog ? catalog.normalizeKey(rawSetup) : rawSetup;
      if (!setupTrigger) {
        alert(text('Por favor, selecione um dos 5 Gatilhos de Entrada.', 'Please select one of the 5 Entry Triggers.'));
        return;
      }
      const setup = catalog ? catalog.getTriggerLabel(setupTrigger) : rawSetup;
      const grade = form.querySelector('#jv-modal-grade').value || 'A';
      const timeframe = form.querySelector('#jv-modal-timeframe').value || 'Diário + 4H';
      const entryTime = form.querySelector('#jv-modal-time').value || defaultTime;

      const newTrade = M.addTrade(current(), {
        ticker,
        direction,
        setup,
        setupTrigger,
        grade,
        timeframe,
        entryTime
      });

      persist();
      root.querySelector('#jv-dialog').close();
      activeView = newTrade.id;
      render(true);
    };
  }

  async function hydrateTradeImages() {
    const tradeImgs = root.querySelectorAll('[data-trade-img-thumb]');
    for (const imgEl of tradeImgs) {
      const imgId = imgEl.dataset.tradeImgThumb;
      if (!imgId) continue;
      if (tradeLocalUrls.has(imgId)) {
        imgEl.src = tradeLocalUrls.get(imgId);
        continue;
      }
      const item = current().evidence?.find(e => e.id === imgId) ||
                   getTrades().flatMap(t => t.images || []).find(i => i.id === imgId);
      if (!item) continue;
      try {
        const blob = await evidenceBlob(item);
        if (!blob || !imgEl.isConnected) continue;
        const url = URL.createObjectURL(blob);
        evidenceUrls.push(url);
        imgEl.src = url;
      } catch (_) {}
    }
  }

  async function uploadTradeFiles(tradeId, files) {
    if (busy) return;
    busy = true;
    const trade = getTrades().find(t => t.id === tradeId);
    if (!trade) { busy = false; return; }
    try {
      trade.images = Array.isArray(trade.images) ? trade.images : [];
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) throw new Error(text('O arquivo ultrapassa o limite de 20 MB.', 'File exceeds 20 MB limit.'));
        let attachment = null;
        if (window.healthyTrendApi?.uploadFile) {
          try {
            const res = await window.healthyTrendApi.uploadFile('/api/journal-attachments', file, {
              'X-Journal-Record': current().id,
              'X-File-Name': `${trade.ticker}_entry_${current().date || 'print'}.png`
            });
            attachment = res.attachment;
          } catch (_) {}
        }
        if (!attachment) {
          const id = `trade-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          attachment = {
            id,
            name: `${trade.ticker}_entry.png`,
            type: file.type || 'image/png',
            size_bytes: file.size,
            created_at: new Date().toISOString()
          };
        }
        const localBlobUrl = URL.createObjectURL(file);
        tradeLocalUrls.set(attachment.id, localBlobUrl);
        evidenceUrls.push(localBlobUrl);

        attachment.kind = 'trade';
        attachment.tradeId = trade.id;
        delete attachment.dataUrl;
        trade.images.push(attachment);
        current().evidence = Array.isArray(current().evidence) ? current().evidence : [];
        current().evidence.push(attachment);
      }
      persist();
      render(true);
    } catch (err) {
      alert(err.message);
    } finally {
      busy = false;
    }
  }
  function render(force = false) {
    if (!force && root.contains(document.activeElement) && document.activeElement.matches('input,textarea,select')) return;
    const e = current(), tech = e.technical, emotional = e.emotional;

    const records = [...data.records].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const months = [...new Set(records.map(item => (item.date || '').slice(0, 7)))];
    const visible = records.filter(item => (item.date || '').slice(0, 7) === month);
    const allEmotions = [...new Set([...emotions, ...emotional.states])];
    const legacyLabels = e.legacyEntries.flatMap(item => Array.isArray(item.attachments) ? item.attachments : []);
    root.innerHTML = `<div class="jv-workspace">
      <header class="jv-heading"><div><span class="jv-kicker">${text('Observar · Registrar · Entender · Evoluir', 'Observe · Record · Understand · Grow')}</span><h1>${text('Diário do Trader', 'Trader Journal')}</h1><p>${text('Mais que registros. Um processo de evolução.', 'More than entries. A process of growth.')}</p></div><p class="jv-heading-quote">${text('Conheça o mercado.<br>Conheça a si mesmo.<br>E evolua todos os dias.', 'Know the market.<br>Know yourself.<br>Grow every day.')}</p></header>
      <div class="jv-layout"><aside class="jv-history"><h2>${text('Meu Caderno', 'My Notebook')}</h2><label class="jv-sr" for="jv-month">${text('Mês do histórico', 'History month')}</label><select id="jv-month">${months.map(value => `<option value="${value}" ${value === month ? 'selected' : ''}>${value ? dateLabel(`${value}-01`, { month: 'long', year: 'numeric' }) : text('Datas a revisar', 'Dates to review')}</option>`).join('')}</select><small>${visible.length} ${text(visible.length === 1 ? 'dia registrado' : 'dias registrados', visible.length === 1 ? 'recorded day' : 'recorded days')}</small><button type="button" class="jv-new" data-action="today">＋ ${text('Registro de hoje', 'Today’s entry')}</button><nav aria-label="${text('Histórico do diário', 'Journal history')}">${visible.map(item => `<button type="button" data-day="${esc(item.id)}" ${item.id === selected ? 'aria-current="date"' : ''}><time>${item.date ? dateLabel(item.date, { day: '2-digit', month: 'short' }) : '—'}</time><span>${esc(item.date === M.today() ? text('Hoje', 'Today') : item.title || item.emotional.states[0] || text('Registro', 'Entry'))}</span></button>`).join('')}</nav><button type="button" class="jv-export-trigger" data-action="export-journal" title="${text('Exportar Diário (preparado para IA)', 'Export Journal (AI ready)')}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>${text('Exportar Diário', 'Export Journal')}</span></button><p>${text('Um dia. Duas perspectivas.<br>Um só aprendizado.', 'One day. Two perspectives.<br>One shared lesson.')}</p></aside>
      <main class="jv-notebook"><header class="jv-book-header"><div><span class="jv-kicker">${text('Seu Caderno de Processo', 'Your Process Notebook')}</span><h2>${dateLabel(e.date)}</h2></div><div class="jv-date-nav"><button type="button" data-action="previous" aria-label="${text('Registro anterior', 'Previous entry')}">‹</button><label><span class="jv-sr">${text('Abrir registro de uma data', 'Open a date')}</span><input id="jv-date" type="date" value="${e.date || ''}"></label><button type="button" data-action="next" aria-label="${text('Próximo registro', 'Next entry')}">›</button></div></header>
      ${renderSessionNav(e)}
      ${activeView === 'day' ? `
        <div class="jv-tabs" role="tablist" aria-label="${text('Página do caderno', 'Notebook page')}"><button type="button" id="jv-tab-technical" role="tab" aria-controls="jv-technical" aria-selected="${pane === 'technical'}" tabindex="${pane === 'technical' ? 0 : -1}" data-pane="technical">▥ ${text('Técnico', 'Technical')}</button><button type="button" id="jv-tab-emotional" role="tab" aria-controls="jv-emotional" aria-selected="${pane === 'emotional'}" tabindex="${pane === 'emotional' ? 0 : -1}" data-pane="emotional">◉ ${text('Emocional', 'Emotional')}</button></div>
        <div class="jv-spread" data-focus="${pane}">
          <section id="jv-technical" class="jv-sheet jv-technical ${pane === 'technical' ? 'is-focused' : ''}" aria-labelledby="jv-tech-title"><header><i class="jv-title-icon">${icons.technical}</i><div><h3 id="jv-tech-title">${text('Diário Técnico', 'Technical Journal')}</h3><p>${text('Como eu executei hoje?', 'How did I execute today?')}</p></div></header>
            <div class="jv-fields">${marketContextSection(tech)}
            ${field('technical.session', `2. ${text('O que eu observei hoje?', 'What did I observe today?')}`, tech.session, text('Contexto, decisões e execução. O que merece ficar registrado?', 'Context, decisions and execution. What is worth recording?'), 5)}
            <fieldset><legend>3. ${text('Execução', 'Execution')}</legend><div class="jv-execution"><div class="jv-execution-card"><span class="jv-execution-label">${text('Qualidade da execução', 'Execution quality')}</span><strong><output id="jv-execution-score">${tech.executionScore ?? '—'}</output> <small>/ 10</small></strong><input class="jv-score-slider" type="range" min="0" max="10" step="0.1" data-field="technical.executionScore" value="${tech.executionScore ?? 0}" aria-label="${text('Qualidade da execução', 'Execution quality')}"></div><div class="jv-execution-card"><span class="jv-execution-label">${text('Plano', 'Plan')}</span><div class="jv-plan-options" role="group" aria-label="${text('Plano respeitado', 'Plan followed')}">${[['yes', '✓', text('Respeitado', 'Followed')], ['partial', '–', text('Parcialmente', 'Partially')], ['no', '×', text('Não respeitado', 'Not followed')]].map(([value, icon, label]) => `<button type="button" class="jv-plan-option ${tech.planRespected === value ? 'chosen' : ''}" data-set="technical.planRespected" data-value="${value}" aria-pressed="${tech.planRespected === value}"><i aria-hidden="true">${icon}</i><span>${label}</span></button>`).join('')}</div></div></div></fieldset>
            ${linkedTradeSummary()}
            ${importedSourceSection(e)}
            <fieldset><legend>4. ${text('Evidências da sessão', 'Session evidence')}</legend><span class="jv-hint">${text('Anexe arquivos ou abra “Anexar / Ctrl+V” para colar um print. Quando reconhecido, o ticker entra no nome do print junto à data do registro.', 'Attach files or open “Attach / Ctrl+V” to paste a screenshot. When recognised, the ticker is added to the screenshot name with the record date.')}</span>${evidenceStrip()}${legacyLabels.length ? `<small class="jv-hint">${text('Referências antigas preservadas nos detalhes.', 'Legacy references preserved in details.')}</small>` : ''}</fieldset>
            </div>
            <div class="jv-page-preview"><span class="jv-page-number">01 / ${text('Leitura do processo', 'Process reading')}</span><p>${esc(tech.session || text('O que aconteceu no mercado e como você executou?', 'What happened in the market and how did you execute?'))}</p><div>${text('Mercado', 'Market')}: <b>${(Array.isArray(tech.markets) && tech.markets.length ? tech.markets : (tech.market ? [tech.market] : [])).map(k => journalMarketMeta(k).name + ' (' + journalMarketMeta(k).benchmark + ') · ' + ((tech.marketStates && tech.marketStates[k]) || (k === tech.market ? tech.marketState : null) ? (((tech.marketStates && tech.marketStates[k]) || tech.marketState) === 'up' ? text('Saudável', 'Healthy') : ((tech.marketStates && tech.marketStates[k]) || tech.marketState) === 'down' ? 'Down' : text('Transição', 'Transition')) : '—')).join(' | ') || text('Nenhum mercado adicionado', 'No market added')}</b></div><div>${text('Execução', 'Execution')}: <b>${tech.executionScore ?? '—'} / 10</b></div><div>${text('Plano', 'Plan')}: <b>${tech.planRespected === 'yes' ? text('Respeitado', 'Followed') : tech.planRespected === 'no' ? text('Não respeitado', 'Not followed') : tech.planRespected === 'partial' ? text('Parcialmente', 'Partially') : '—'}</b></div><button type="button" data-pane="technical">${text('Escrever na página técnica', 'Write on the technical page')} →</button></div>
          </section>
          <section id="jv-emotional" class="jv-sheet jv-emotional ${pane === 'emotional' ? 'is-focused' : ''}" aria-labelledby="jv-emotion-title"><header><i class="jv-title-icon">${icons.emotional}</i><div><h3 id="jv-emotion-title">${text('Diário Emocional', 'Emotional Journal')}</h3><p>${text('Como eu estava enquanto tomava minhas decisões?', 'How was I feeling while making decisions?')}</p></div></header>
            <div class="jv-fields"><fieldset><legend>1. ${text('Como me senti hoje?', 'How did I feel today?')}</legend><span class="jv-hint">${text('Selecione os estados que representam seu dia.', 'Select the states that represent your day.')}</span><div class="jv-emotions">${allEmotions.map(emotion => `<button type="button" data-emotion="${esc(emotion)}" aria-pressed="${emotional.states.includes(emotion)}">${esc(emotion)}</button>`).join('')}</div></fieldset>
            <fieldset><legend>2. ${text('Intensidade emocional', 'Emotional intensity')}</legend><span class="jv-hint">${text('Em uma escala de 1 a 5, como você avalia seu nível de ativação emocional hoje?', 'On a scale from 1 to 5, how activated did you feel today?')}</span><div class="jv-intensity">${[1, 2, 3, 4, 5].map(value => `<button type="button" data-set="emotional.intensity" data-value="${value}" aria-pressed="${emotional.intensity === value}" class="${emotional.intensity === value ? 'chosen' : ''}">${value}</button>`).join('')}</div><div class="jv-scale-labels"><span>${text('Calmo', 'Calm')}</span><span>${text('Muito ativado', 'Highly activated')}</span></div></fieldset>
            ${field('emotional.note', `3. ${text('O que estava acontecendo comigo?', 'What was happening within me?')}`, emotional.note, text('Como suas emoções apareceram diante das decisões?', 'How did your emotions show up as you made decisions?'), 5)}
            <fieldset><legend>4. ${text('Minhas emoções interferiram na execução?', 'Did my emotions affect execution?')}</legend>${options('emotional.impact', [['no', text('Não', 'No')], ['some', text('Um pouco', 'A little')], ['yes', text('Sim', 'Yes')]], emotional.impact)}<div id="jv-impact-explanation" ${emotional.impact === 'yes' || emotional.impact === 'some' || emotional.impactNote ? '' : 'hidden'}>${field('emotional.impactNote', text('Se quiser, conte como.', 'If you wish, describe how.'), emotional.impactNote, '', 2)}</div></fieldset></div>
            ${patternsSection(e)}
            <div class="jv-page-preview"><span class="jv-page-number">02 / ${text('Um olhar para dentro', 'A look within')}</span><p>${esc(emotional.note || text('Você não é o resultado de um trade. Este espaço é para observar como você estava — sem julgamento.', 'You are not the outcome of a trade. This space is for noticing how you felt — without judgement.'))}</p><div class="jv-preview-emotions">${emotional.states.map(value => `<span>${esc(value)}</span>`).join('') || text('Nenhum estado registrado ainda.', 'No states recorded yet.')}</div><div>${text('Intensidade', 'Intensity')}: <b>${emotional.intensity ?? '—'} / 5</b></div><button type="button" data-pane="emotional">${text('Escrever na página emocional', 'Write on the emotional page')} →</button></div>
          </section>
        </div>
        ${renderDayTradesOverview(e)}
      ` : `
        ${renderTradeSheet(currentTrade(), e)}
      `}
      <footer class="jv-lessons"><div class="jv-lesson-title"><span class="jv-title-icon">${icons.lessons}</span><div><h3>${text('Lições do dia', 'Lessons of the day')}</h3><p>${text('Mercado + execução + emoção → aprendizado', 'Market + execution + emotion → learning')}</p></div></div><div class="jv-lesson-write">${field('shared.lesson', text('O que vou levar para amanhã?', 'What will I take into tomorrow?'), e.shared.lesson, text('Uma lição que conecta o que você fez e como se sentiu.', 'One lesson connecting what you did and how you felt.'), 3)}</div>
      </footer>
      </main></div><dialog id="jv-dialog" aria-labelledby="jv-dialog-title"><header><h2 id="jv-dialog-title"></h2><button type="button" data-action="close-dialog" aria-label="${text('Fechar', 'Close')}">×</button></header><div id="jv-dialog-body"></div></dialog>
    </div>`;
    hydrateEvidenceStrip();
    hydrateTradeImages();
    root.querySelector('.jv-lessons')?.remove();
  }
  function setValue(path, value, debounce = false) {
    const allowed = ['title', 'technical.market', 'technical.markets', 'technical.marketState', 'technical.marketStates', 'technical.session', 'technical.executionScore', 'technical.planRespected', 'technical.permissionMoney', 'emotional.intensity', 'emotional.note', 'emotional.impact', 'emotional.impactNote', 'shared.lesson', 'shared.patterns', 'shared.observations', 'shared.phrase'];
    if (!allowed.includes(path)) return;
    const keys = path.split('.');
    let target = current(); if (keys.length === 2) target = target[keys.shift()];
    target[keys[0]] = value;
    if (debounce) debouncePersist();
    else persist();
  }
  function dialog(title, content) {
    const el = root.querySelector('#jv-dialog');
    el.classList.remove('jv-evidence-dialog');
    root.querySelector('#jv-dialog-title').textContent = title;
    root.querySelector('#jv-dialog-body').innerHTML = content;
    if (!el.open) el.showModal();
  }
  function clearEvidenceUrls() { evidenceUrls.forEach(url => URL.revokeObjectURL(url)); evidenceUrls = []; }
  function attachmentPath(id) { return `/api/journal-attachments/${encodeURIComponent(id)}/content`; }
  function screenshotEvidence() { return current().evidence.filter(item => item.type?.startsWith('image/') && item.type !== 'image/svg+xml'); }
  function navigateEvidence(id, step) {
    const items = screenshotEvidence(), index = items.findIndex(item => item.id === id), next = items[index + step];
    if (next) openEvidence(next.id);
  }
  async function evidenceBlob(item) {
    if (!window.healthyTrendApi?.requestBlob) throw new Error(text('Entre novamente para acessar os anexos.', 'Sign in again to access attachments.'));
    return window.healthyTrendApi.requestBlob(attachmentPath(item.id));
  }
  async function hydrateEvidenceStrip() {
    const items = current().evidence.filter(item => item.type.startsWith('image/'));
    for (const item of items) {
      const image = root.querySelector(`[data-evidence-thumb="${CSS.escape(item.id)}"]`);
      if (!image) continue;
      try {
        const blob = await evidenceBlob(item);
        if (!blob || !image.isConnected) continue;
        const url = URL.createObjectURL(blob); evidenceUrls.push(url); image.src = url;
      } catch (_) { /* The item remains as a neutral thumbnail when it is unavailable. */ }
    }
  }
  async function openEvidence(id) {
    const item = current().evidence.find(candidate => candidate.id === id);
    if (!item) return;
    const screenshots = screenshotEvidence(), screenshotIndex = screenshots.findIndex(candidate => candidate.id === id);
    dialog(esc(item.name), `<p>${text('Carregando evidência…', 'Loading evidence…')}</p>`);
    root.querySelector('#jv-dialog').classList.add('jv-evidence-dialog');
    try {
      let url = tradeLocalUrls.get(item.id);
      if (!url) {
        const blob = await evidenceBlob(item);
        url = URL.createObjectURL(blob); evidenceUrls.push(url);
      }
      const body = root.querySelector('#jv-dialog-body');
      if (!body) return;
      body.innerHTML = item.type.startsWith('image/') && item.type !== 'image/svg+xml'
        ? `<nav class="jv-evidence-navigation" aria-label="${text('Navegação entre prints', 'Screenshot navigation')}"><button type="button" data-action="evidence-previous" data-evidence-id="${esc(item.id)}" ${screenshotIndex <= 0 ? 'disabled' : ''} aria-label="${text('Print anterior', 'Previous screenshot')}">← ${text('Anterior', 'Previous')}</button><span>${screenshotIndex + 1} ${text('de', 'of')} ${screenshots.length}</span><button type="button" data-action="evidence-next" data-evidence-id="${esc(item.id)}" ${screenshotIndex >= screenshots.length - 1 ? 'disabled' : ''} aria-label="${text('Próximo print', 'Next screenshot')}">${text('Próximo', 'Next')} →</button></nav><img class="jv-evidence-preview" src="${url}" alt="${esc(item.name)}"><p class="jv-evidence-keyboard-help">← → ${text('Use as setas do teclado para navegar entre os prints.', 'Use the keyboard arrows to browse screenshots.')}</p>`
        : item.type.startsWith('audio/')
          ? `<audio class="jv-evidence-audio" controls autoplay src="${url}"></audio>`
          : `<a href="${url}" download="${esc(item.name)}">${text('Baixar arquivo', 'Download file')}</a>`;
    } catch (_) { const body = root.querySelector('#jv-dialog-body'); if (body) body.textContent = text('Não foi possível abrir este arquivo salvo na sua conta.', 'This file could not be opened from your account.'); }
  }
  async function showEvidence() {
    clearEvidenceUrls();
    const e = current(), labels = e.legacyEntries.flatMap(item => Array.isArray(item.attachments) ? item.attachments : []);
    dialog(text('Evidências da sessão', 'Session evidence'), `<label class="jv-evidence-kind">${text('Este print representa', 'This screenshot represents')}<select id="jv-evidence-kind"><option value="asset">${text('Ativo / trade', 'Asset / trade')}</option><option value="market">${text('Mercado / índice (Ciclo de Mercado)', 'Market / index (Market Cycle)')}</option></select></label><label class="jv-upload">＋ ${text('Adicionar prints, áudio ou arquivos', 'Add screenshots, audio or files')}<input id="jv-files" type="file" multiple></label><div class="jv-upload-paste" data-evidence-paste tabindex="0">${text('Ou cole um print da área de transferência com Ctrl + V.', 'Or paste a screenshot from the clipboard with Ctrl + V.')}</div><p>${text('A classificação organiza a Biblioteca de Trades e separa os prints de ativos dos prints do mercado.', 'This classification organises the Trade Library and separates asset screenshots from market screenshots.')}</p><p>${text('Até 20 MB por arquivo. Guardados de forma privada na sua conta.', 'Up to 20 MB per file. Stored privately in your account.')}</p><p id="jv-upload-status" role="status"></p><div id="jv-evidence-list"></div>${labels.length ? `<details><summary>${text('Referências do registro antigo', 'Legacy entry references')}</summary><p>${labels.map(esc).join(' · ')}</p><p>${text('O diário antigo guardava esses rótulos, mas não os arquivos. Nenhum arquivo foi reconstruído.', 'The old journal stored these labels, but no files. No file was reconstructed.')}</p></details>` : ''}`);
    for (const item of e.evidence) {
      const host = root.querySelector('#jv-evidence-list'); if (!host) return;
      const row = document.createElement('article'); row.className = 'jv-file';
      row.innerHTML = `<b>${esc(item.name)}</b><small>${evidenceKindLabel(evidenceKind(item))}</small>`; host.append(row);
      try {
        const blob = await evidenceBlob(item);
        if (!row.isConnected || !root.querySelector('#jv-dialog')?.open) return;
        const url = URL.createObjectURL(blob); evidenceUrls.push(url);
        if (item.type.startsWith('image/') && item.type !== 'image/svg+xml') { const img = document.createElement('img'); img.src = url; img.alt = item.name; row.append(img); }
        else if (item.type.startsWith('audio/')) { const audio = document.createElement('audio'); audio.controls = true; audio.src = url; row.append(audio); }
        const link = document.createElement('a'); link.href = url; link.download = item.name; link.textContent = text('Baixar arquivo', 'Download file'); row.append(link);
        const remove = document.createElement('button'); remove.type = 'button'; remove.dataset.removeEvidence = item.id; remove.textContent = text('Remover', 'Remove'); row.append(remove);
      } catch (error) { row.insertAdjacentHTML('beforeend', `<p>${text('Arquivo não encontrado na sua conta.', 'File not found in your account.')}</p>`); }
    }
  }
  async function upload(files) {
    if (busy) return; busy = true;
    const e = current(), input = root.querySelector('#jv-files'), kind = root.querySelector('#jv-evidence-kind')?.value === 'market' ? 'market' : 'asset'; if (input) input.disabled = true;
    let uploaded = 0;
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) throw new Error(text('Um arquivo ultrapassa o limite de 20 MB.', 'A file exceeds the 20 MB limit.'));
        if (!window.healthyTrendApi?.uploadFile) throw new Error(text('Entre novamente antes de enviar um arquivo.', 'Sign in again before uploading a file.'));
        const result = await window.healthyTrendApi.uploadFile('/api/journal-attachments', file, { 'X-Journal-Record': e.id });
        e.evidence.push({ ...result.attachment, kind });
        if (!persist()) {
          e.evidence = e.evidence.filter(item => item.id !== result.attachment.id);
          await window.healthyTrendApi.request(`/api/journal-attachments/${encodeURIComponent(result.attachment.id)}`, { method: 'DELETE' }).catch(() => {});
          throw new Error(saveError);
        }
        uploaded++;
      }
      render(true);
      await showEvidence();
      root.querySelector('#jv-upload-status').textContent = `${uploaded} ${text('arquivo(s) salvo(s).', 'file(s) saved.')}`;
    } catch (error) { const status = root.querySelector('#jv-upload-status'); if (status) status.textContent = error.message; }
    finally { busy = false; if (input?.isConnected) input.disabled = false; }
  }
  function clipboardImageFiles(clipboard) {
    const files = [];
    for (const item of clipboard?.items || []) {
      if (!item.type?.startsWith('image/')) continue;
      const image = item.getAsFile?.();
      if (image) files.push(image);
    }
    return files;
  }
  async function tickerInImage(image) {
    if (typeof window.TextDetector !== 'function' || typeof window.createImageBitmap !== 'function') return null;
    let bitmap;
    try {
      bitmap = await window.createImageBitmap(image);
      const blocks = await new window.TextDetector().detect(bitmap);
      const textInImage = blocks.map(block => block.rawValue || '').join(' ').toUpperCase();
      return textInImage.match(/\b[A-Z]{4}\d{1,2}\b/)?.[0] || null;
    } catch (_) { return null; }
    finally { bitmap?.close?.(); }
  }
  async function clipboardImages(files) {
    const day = current().date || new Date().toISOString().slice(0, 10);
    return Promise.all(files.map(async (image, index) => {
      const ticker = await tickerInImage(image);
      const extension = image.type.split('/')[1]?.replace(/[^a-z0-9]+/gi, '') || 'png';
      const prefix = ticker || 'print';
      return new File([image], `${prefix}_${day}_${String(index + 1).padStart(2, '0')}.${extension}`, { type: image.type });
    }));
  }
  async function uploadClipboardImages(event) {
    const files = clipboardImageFiles(event.clipboardData);
    if (!files.length) return;
    event.preventDefault();
    const images = await clipboardImages(files);
    if (!root.querySelector('#jv-dialog')?.open) await showEvidence();
    await upload(images);
  }
  async function removeEvidence(id) {
    if (busy) return; busy = true;
    try {
      if (!window.healthyTrendApi?.request) throw new Error(text('Entre novamente antes de remover um arquivo.', 'Sign in again before removing a file.'));
      const removed = current().evidence.find(item => item.id === id);
      current().evidence = current().evidence.filter(item => item.id !== id);
      if (!persist()) { if (removed) current().evidence.push(removed); throw new Error(saveError); }
      try { await window.healthyTrendApi.request(`/api/journal-attachments/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
      catch (error) {
        if (removed) { current().evidence.push(removed); persist(); }
        throw error;
      }
      await showEvidence();
      const message = root.querySelector('#jv-upload-status'); if (message) message.textContent = text('Arquivo removido.', 'File removed.');
    } catch (error) {
      const message = root.querySelector('#jv-upload-status'); if (message) message.textContent = error.message;
      render(true);
    }
    finally { busy = false; }
  }
  function showTrades() {
    const trades = dayTrades();
    const cat = window.SetupTriggersCatalog;
    dialog(text('Trades do dia', 'Day’s trades'), trades.length ? `<p>${text('O vínculo é opcional. Escolha apenas os trades que ajudarem a explicar o seu processo.', 'The link is optional. Choose only the trades that help explain your process.')}</p><ul class="jv-trades">${trades.map(item => {
      const trig = (cat ? cat.getTriggerLabel(item.setupTrigger || item.setup) : null) || item.setup || '—';
      return `<li><b>${esc(item.ticker || item.asset)}</b><span>${esc(trig)} · ${esc(item.direction || '')} · ${tradeMoment(item)}</span><label><input type="checkbox" data-trade="${esc(item.id)}" ${current().technical.tradeIds.includes(item.id) ? 'checked' : ''}> ${text('Vincular ao registro', 'Link to entry')}</label></li>`;
    }).join('')}</ul>` : `<p>${text('Nenhum trade aberto ou encerrado nesta data foi encontrado. Dias de espera também fazem parte do processo.', 'No trade opened or closed on this date was found. Waiting days are also part of the process.')}</p>`);
  }
  function sendHabit(suggestion) {
    if (!suggestion.trim()) { status(text('Escreva uma lição antes de enviá-la.', 'Write a lesson before sending it.'), true); return; }
    try {
      const key = 'healthy-trend-habit-suggestions', items = JSON.parse(storage.getItem(key) || '[]');
      items.unshift({ suggestion, createdAt: new Date().toISOString(), source: 'journal', journalId: current().id, date: current().date });
      storage.setItem(key, JSON.stringify(items)); status(text('Sugestão enviada para os hábitos.', 'Suggestion sent to habits.'));
    } catch (error) { status(text('Não foi possível salvar a sugestão.', 'Could not save the suggestion.'), true); }
  }
  function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  const exportState = {
    period: 'current_month',
    startDate: '',
    endDate: '',
    content: 'all',
    format: 'markdown',
    forAi: true
  };

  function getActivePeriodLabel() {
    const p = exportState.period;
    if (p === 'today') return text('Dia atual (' + M.today() + ')', 'Today (' + M.today() + ')');
    if (p === 'current_month') {
      const ym = month || M.today().slice(0, 7);
      return dateLabel(`${ym}-01`, { month: 'long', year: 'numeric' });
    }
    if (p === 'last_30_days') return text('Últimos 30 dias', 'Last 30 days');
    if (p === 'last_3_months') return text('Últimos 3 meses', 'Last 3 months');
    if (p === 'current_year') return (month || M.today()).slice(0, 4);
    if (p === 'custom') return `${exportState.startDate} até ${exportState.endDate}`;
    return text('Todo o histórico', 'Full history');
  }

  function renderExportPreview() {
    const EM = window.JournalExportModel;
    if (!EM) return;
    const filtered = EM.filterRecords(data.records, {
      period: exportState.period,
      activeMonth: month,
      startDate: exportState.startDate,
      endDate: exportState.endDate
    });

    const periodLabel = getActivePeriodLabel();
    const formatted = EM.formatExport(filtered, {
      format: exportState.format,
      content: exportState.content,
      forAi: exportState.forAi,
      periodLabel,
      startDate: exportState.startDate,
      endDate: exportState.endDate,
      activeMonth: month
    });

    const pre = root.querySelector('#jv-export-preview');
    if (pre) pre.textContent = formatted;

    const badge = root.querySelector('#jv-export-meta-badge');
    if (badge) {
      const byteLen = new TextEncoder().encode(formatted).length;
      const kb = (byteLen / 1024).toFixed(1);
      badge.textContent = `${filtered.length} ${text(filtered.length === 1 ? 'dia' : 'dias', filtered.length === 1 ? 'day' : 'days')} · ${kb} KB`;
    }

    const copyLabel = root.querySelector('#jv-export-copy-label');
    if (copyLabel) {
      copyLabel.textContent = exportState.forAi
        ? text('Copiar para IA', 'Copy to AI')
        : text('Copiar conteúdo', 'Copy content');
    }
  }

  async function copyExportContent() {
    const pre = root.querySelector('#jv-export-preview');
    if (!pre) return;
    const textToCopy = pre.textContent || '';
    const label = root.querySelector('#jv-export-copy-label');
    const copyBtn = root.querySelector('#jv-export-copy-btn');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (label) {
        const original = label.textContent;
        label.textContent = text('✓ Copiado! Cole no ChatGPT, Claude ou Gemini', '✓ Copied! Paste into ChatGPT, Claude or Gemini');
        copyBtn?.classList.add('jv-btn-success');
        setTimeout(() => {
          if (label.isConnected) {
            label.textContent = original;
            copyBtn?.classList.remove('jv-btn-success');
          }
        }, 3000);
      }
    } catch (err) {
      console.error('Falha ao copiar:', err);
      alert(text('Não foi possível copiar automaticamente. Selecione o texto da prévia e use Ctrl+C.', 'Could not copy automatically. Select the preview text and use Ctrl+C.'));
    }
  }

  function downloadExportFile() {
    const EM = window.JournalExportModel;
    if (!EM) return;
    const pre = root.querySelector('#jv-export-preview');
    if (!pre) return;
    const content = pre.textContent || '';
    const filename = EM.getExportFilename({
      format: exportState.format,
      period: exportState.period,
      activeMonth: month,
      startDate: exportState.startDate,
      endDate: exportState.endDate
    });
    const mimeTypes = {
      markdown: 'text/markdown;charset=utf-8',
      text: 'text/plain;charset=utf-8',
      json: 'application/json;charset=utf-8',
      csv: 'text/csv;charset=utf-8'
    };
    const mime = mimeTypes[exportState.format] || 'text/plain;charset=utf-8';
    download(new Blob([content], { type: mime }), filename);
  }

  function bindExportModalEvents() {
    const dialogEl = root.querySelector('#jv-dialog');
    if (!dialogEl) return;

    const periodSelect = dialogEl.querySelector('#jv-export-period');
    if (periodSelect) {
      periodSelect.addEventListener('change', e => {
        exportState.period = e.target.value;
        const customGroup = dialogEl.querySelector('#jv-export-custom-dates');
        if (customGroup) customGroup.hidden = exportState.period !== 'custom';
        renderExportPreview();
      });
    }

    const startInput = dialogEl.querySelector('#jv-export-start');
    if (startInput) {
      startInput.addEventListener('change', e => {
        exportState.startDate = e.target.value;
        renderExportPreview();
      });
    }

    const endInput = dialogEl.querySelector('#jv-export-end');
    if (endInput) {
      endInput.addEventListener('change', e => {
        exportState.endDate = e.target.value;
        renderExportPreview();
      });
    }

    dialogEl.querySelectorAll('[data-export-content]').forEach(btn => {
      btn.addEventListener('click', () => {
        exportState.content = btn.dataset.exportContent;
        dialogEl.querySelectorAll('[data-export-content]').forEach(b => {
          const chosen = b === btn;
          b.classList.toggle('chosen', chosen);
          b.setAttribute('aria-pressed', String(chosen));
        });
        renderExportPreview();
      });
    });

    dialogEl.querySelectorAll('[data-export-format]').forEach(btn => {
      btn.addEventListener('click', () => {
        exportState.format = btn.dataset.exportFormat;
        dialogEl.querySelectorAll('[data-export-format]').forEach(b => {
          const chosen = b === btn;
          b.classList.toggle('chosen', chosen);
          b.setAttribute('aria-pressed', String(chosen));
        });
        renderExportPreview();
      });
    });

    const aiCheck = dialogEl.querySelector('#jv-export-for-ai');
    if (aiCheck) {
      aiCheck.addEventListener('change', e => {
        exportState.forAi = e.target.checked;
        renderExportPreview();
      });
    }

    const copyBtn = dialogEl.querySelector('#jv-export-copy-btn');
    if (copyBtn) copyBtn.addEventListener('click', copyExportContent);

    const downloadBtn = dialogEl.querySelector('#jv-export-download-btn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadExportFile);
  }

  function showExportModal() {
    const EM = window.JournalExportModel;
    if (!EM) return;
    const el = root.querySelector('#jv-dialog');
    if (!el) return;
    el.classList.remove('jv-evidence-dialog');
    el.classList.add('jv-export-dialog');

    if (!exportState.startDate) exportState.startDate = `${month || M.today().slice(0, 7)}-01`;
    if (!exportState.endDate) exportState.endDate = M.today();

    const title = text('Exportar Diário do Trader', 'Export Trader Journal');
    const periods = [
      ['current_month', text('Mês atual', 'Current month')],
      ['today', text('Dia atual', 'Today')],
      ['last_30_days', text('Últimos 30 dias', 'Last 30 days')],
      ['last_3_months', text('Últimos 3 meses', 'Last 3 months')],
      ['current_year', text('Ano atual', 'Current year')],
      ['custom', text('Período personalizado', 'Custom period')],
      ['all', text('Todo o histórico', 'Full history')]
    ];
    const contents = [
      ['all', text('Ambos (Técnico + Emocional)', 'Both (Technical + Emotional)')],
      ['technical', text('Diário Técnico', 'Technical Journal')],
      ['emotional', text('Diário Emocional', 'Emotional Journal')]
    ];
    const formats = [
      ['markdown', 'Markdown (.md) · ' + text('Ideal para IA', 'Ideal for AI')],
      ['text', text('Texto (.txt)', 'Text (.txt)')],
      ['json', 'JSON (.json)'],
      ['csv', 'CSV (.csv)']
    ];

    const bodyHtml = `
      <div class="jv-export-shell">
        <p class="jv-export-desc">${text('Exporte seus registros estruturados e prontos para estudo pessoal ou análise aprofundada em modelos de IA (ChatGPT, Claude, Gemini).', 'Export your records structured and ready for personal study or in-depth analysis in AI models (ChatGPT, Claude, Gemini).')}</p>
        
        <div class="jv-export-grid">
          <div class="jv-export-control-group">
            <label class="jv-export-label" for="jv-export-period">${text('Período:', 'Period:')}</label>
            <select id="jv-export-period" class="jv-export-select">
              ${periods.map(([val, lbl]) => `<option value="${val}" ${exportState.period === val ? 'selected' : ''}>${lbl}</option>`).join('')}
            </select>
          </div>

          <div id="jv-export-custom-dates" class="jv-export-dates" ${exportState.period === 'custom' ? '' : 'hidden'}>
            <div>
              <label for="jv-export-start">${text('Data inicial:', 'Start date:')}</label>
              <input type="date" id="jv-export-start" value="${exportState.startDate}">
            </div>
            <div>
              <label for="jv-export-end">${text('Data final:', 'End date:')}</label>
              <input type="date" id="jv-export-end" value="${exportState.endDate}">
            </div>
          </div>

          <div class="jv-export-control-group">
            <span class="jv-export-label">${text('Conteúdo:', 'Content:')}</span>
            <div class="jv-export-pills" role="radiogroup" aria-label="${text('Conteúdo a exportar', 'Content to export')}">
              ${contents.map(([val, lbl]) => `<button type="button" class="jv-export-pill ${exportState.content === val ? 'chosen' : ''}" data-export-content="${val}" aria-pressed="${exportState.content === val}">${lbl}</button>`).join('')}
            </div>
          </div>

          <div class="jv-export-control-group">
            <span class="jv-export-label">${text('Formato:', 'Format:')}</span>
            <div class="jv-export-pills" role="radiogroup" aria-label="${text('Formato do arquivo', 'File format')}">
              ${formats.map(([val, lbl]) => `<button type="button" class="jv-export-pill ${exportState.format === val ? 'chosen' : ''}" data-export-format="${val}" aria-pressed="${exportState.format === val}">${lbl}</button>`).join('')}
            </div>
          </div>

          <div class="jv-export-ai-opt">
            <label class="jv-export-checkbox-label">
              <input type="checkbox" id="jv-export-for-ai" ${exportState.forAi ? 'checked' : ''}>
              <span><b>${text('Preparar para análise por IA', 'Prepare for AI analysis')}</b> — ${text('organiza o documento de forma semântica e inclui instruções prontas para o ChatGPT, Claude ou Gemini identificarem padrões recorrentes e correlações emocionais/técnicas.', 'organises document semantically and includes prompt instructions for ChatGPT, Claude or Gemini to identify patterns and emotional/technical correlations.')}</span>
            </label>
          </div>
        </div>

        <div class="jv-export-preview-box">
          <div class="jv-export-preview-header">
            <span>${text('Prévia do documento:', 'Document preview:')}</span>
            <span id="jv-export-meta-badge" class="jv-export-badge">—</span>
          </div>
          <pre id="jv-export-preview" class="jv-export-preview-content" tabindex="0"></pre>
        </div>

        <footer class="jv-export-actions">
          <button type="button" id="jv-export-copy-btn" class="jv-btn-primary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span id="jv-export-copy-label">${text('Copiar para IA', 'Copy to AI')}</span>
          </button>
          <button type="button" id="jv-export-download-btn" class="jv-btn-secondary">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>${text('Baixar arquivo', 'Download file')}</span>
          </button>
          <button type="button" data-action="close-dialog" class="jv-btn-cancel">${text('Fechar', 'Close')}</button>
        </footer>
      </div>
    `;

    dialog(title, bodyHtml);
    bindExportModalEvents();
    renderExportPreview();
  }
  root.addEventListener('input', event => {
    const el = event.target;
    if (el.dataset.tradeField) {
      const tradeId = el.dataset.tradeId || activeView;
      const val = el.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value;
      setTradeValue(tradeId, el.dataset.tradeField, val, true);
      if (el.dataset.tradeField === 'execution.entryPrice' || el.dataset.tradeField === 'execution.initialStop') {
        const trade = getTrades().find(t => t.id === tradeId);
        if (trade && trade.execution?.entryPrice != null && trade.execution?.initialStop != null && trade.execution.entryPrice > 0) {
          const diff = Math.abs(trade.execution.entryPrice - trade.execution.initialStop);
          const pct = (diff / trade.execution.entryPrice) * 100;
          const hintEl = root.querySelector('.jv-calc-hint');
          if (hintEl) {
            hintEl.innerHTML = `<span>ℹ ${text('Cálculo automático de risco:', 'Automatic risk calculation:')}</span> <b>${diff.toFixed(2)} ${text('por unidade', 'per unit')} (${pct.toFixed(2)}%)</b>`;
          }
        }
      }
      return;
    }
    if (!el.dataset.field) return;
    if (el.type === 'number' && !el.validity.valid) { status(text('Use uma nota de 0 a 10.', 'Use a score from 0 to 10.'), true); return; }
    setValue(el.dataset.field, el.type === 'number' || el.type === 'range' ? M.score(el.value) : el.value || (el.tagName === 'SELECT' ? null : ''), true);
    if (el.type === 'range') { const output = root.querySelector('#jv-execution-score'); if (output) output.value = M.score(el.value); }
  });
  root.addEventListener('change', event => {
    if (persistTimer) persist();
    const el = event.target;
    if (el.id === 'jv-date') openDay(el.value);
    if (el.id === 'jv-month') { month = el.value; render(true); }
    if (el.id === 'jv-files') upload([...el.files]);
    if (el.classList.contains('jv-hidden-file-input')) {
      const tradeId = el.dataset.tradeId;
      if (tradeId && el.files?.length) uploadTradeFiles(tradeId, [...el.files]);
    }
    if (el.dataset.check !== undefined) { current().technical.checklist[el.dataset.check] = el.checked; persist(); }
    if (el.dataset.trade) { const ids = current().technical.tradeIds; current().technical.tradeIds = el.checked ? [...new Set([...ids, el.dataset.trade])] : ids.filter(id => id !== el.dataset.trade); persist(); }
  });
  root.addEventListener('paste', event => {
    const evidenceDialogOpen = root.querySelector('#jv-dialog')?.open;
    const evidenceControl = event.target.closest?.('[data-action="evidence"], .jv-evidence-strip, [data-evidence-paste]');
    if (activeView !== 'day' && !evidenceDialogOpen) {
      const files = clipboardImageFiles(event.clipboardData);
      if (files.length) {
        event.preventDefault();
        uploadTradeFiles(activeView, files);
        return;
      }
    }
    if (evidenceDialogOpen || evidenceControl) uploadClipboardImages(event);
  });
  root.addEventListener('keydown', event => {
    const evidenceDialog = root.querySelector('#jv-dialog.jv-evidence-dialog[open]');
    if (evidenceDialog && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const id = evidenceDialog.querySelector('[data-evidence-id]')?.dataset.evidenceId;
      if (id) { event.preventDefault(); navigateEvidence(id, event.key === 'ArrowLeft' ? -1 : 1); return; }
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const zoomTarget = event.target.closest?.('.jv-trade-image-preview[data-action="zoom-trade-img"]');
      if (zoomTarget) {
        event.preventDefault();
        openEvidence(zoomTarget.dataset.imgId);
        return;
      }
    }
    if (event.target.getAttribute('role') === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); pane = event.key === 'Home' ? 'technical' : event.key === 'End' ? 'emotional' : pane === 'technical' ? 'emotional' : 'technical'; render(true); root.querySelector(`#jv-tab-${pane}`).focus();
    }
  });
  root.addEventListener('close', event => {
    if (event.target.id === 'jv-dialog') {
      event.target.classList.remove('jv-export-dialog');
      event.target.querySelectorAll('audio').forEach(audio => audio.pause());
      clearEvidenceUrls();
      render(true);
    }
  }, true);
  root.addEventListener('click', event => {
    const zoomTarget = event.target.closest('[data-action="zoom-trade-img"]');
    if (zoomTarget) {
      openEvidence(zoomTarget.dataset.imgId);
      return;
    }
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.navView) {
      if (saveError && !persist()) return;
      activeView = button.dataset.navView;
      render(true);
      root.querySelector('.jv-notebook')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (button.dataset.action === 'new-trade') { showAddTradeModal(); return; }
    if (button.dataset.action === 'delete-trade') {
      const tradeId = button.dataset.tradeId;
      const trade = getTrades().find(t => t.id === tradeId);
      if (trade && confirm(text(`Deseja realmente excluir o trade de ${trade.ticker}?`, `Are you sure you want to delete the trade for ${trade.ticker}?`))) {
        M.removeTrade(current(), tradeId);
        persist();
        activeView = 'day';
        render(true);
      }
      return;
    }
    if (button.dataset.action === 'trigger-trade-upload') {
      const tradeId = button.dataset.tradeId;
      const input = root.querySelector(`#jv-trade-file-${CSS.escape(tradeId)}`);
      if (input) input.click();
      return;
    }
    if (button.dataset.action === 'zoom-trade-img') {
      openEvidence(button.dataset.imgId);
      return;
    }
    if (button.dataset.action === 'remove-trade-img') {
      const tradeId = button.dataset.tradeId;
      const imgId = button.dataset.imgId;
      const trade = getTrades().find(t => t.id === tradeId);
      if (trade && trade.images) {
        trade.images = trade.images.filter(i => i.id !== imgId);
        current().evidence = (current().evidence || []).filter(e => e.id !== imgId);
        persist();
        render(true);
      }
      return;
    }
    if (button.dataset.tradeSet) {
      const tradeId = button.dataset.tradeId || activeView;
      setTradeValue(tradeId, button.dataset.tradeSet, button.dataset.value);
      render(true);
      return;
    }
    if (button.dataset.action === 'evidence-previous') { navigateEvidence(button.dataset.evidenceId, -1); return; }
    if (button.dataset.action === 'evidence-next') { navigateEvidence(button.dataset.evidenceId, 1); return; }
    if (button.dataset.evidenceId) { openEvidence(button.dataset.evidenceId); return; }
    if (button.dataset.removeEvidence) { removeEvidence(button.dataset.removeEvidence); return; }
    if (button.dataset.positionId) { window.openPositionFromJournal?.(button.dataset.positionId); return; }
    if (button.dataset.day) { if (saveError && !persist()) return; selected = button.dataset.day; activeView = 'day'; render(true); return; }
    if (button.dataset.pane) { pane = button.dataset.pane; render(true); root.querySelector(`#jv-tab-${pane}`).focus({ preventScroll: true }); return; }
    if (button.dataset.set) {
      const path = button.dataset.set;
      const value = path === 'emotional.intensity' ? Number(button.dataset.value) : button.dataset.value;
      setValue(path, value);
      if (path === 'technical.market') {
        const cur = current();
        const tech = cur.technical;
        tech.markets = Array.isArray(tech.markets) && tech.markets.length ? tech.markets : [];
        if (!tech.markets.includes(value)) {
          tech.markets.push(value);
        }
        tech.market = value;
        persist();
        render(true);
        return;
      }
      const fieldset = button.closest('fieldset');
      fieldset.querySelectorAll(`[data-set="${CSS.escape(path)}"]`).forEach(b => {
        const chosen = b === button;
        b.setAttribute('aria-pressed', chosen);
        b.classList.toggle('chosen', chosen);
      });
      if (path === 'emotional.impact') root.querySelector('#jv-impact-explanation').hidden = button.dataset.value === 'no' && !current().emotional.impactNote;
      return;
    }
    if (button.dataset.emotion) { const states = current().emotional.states, value = button.dataset.emotion; current().emotional.states = states.includes(value) ? states.filter(item => item !== value) : [...states, value]; button.setAttribute('aria-pressed', current().emotional.states.includes(value)); persist(); return; }
    if (button.dataset.pattern !== undefined) { sendHabit(patterns[Number(button.dataset.pattern)]); return; }
        if (button.dataset.action === 'add-journal-market') {
      const marketKey = button.dataset.market;
      if (marketKey && JOURNAL_MARKETS[marketKey]) {
        const cur = current();
        const tech = cur.technical;
        tech.markets = Array.isArray(tech.markets) && tech.markets.length ? tech.markets : (tech.market ? [tech.market] : []);
        if (!tech.markets.includes(marketKey)) {
          tech.markets.push(marketKey);
        }
        tech.market = tech.markets[0] || marketKey;
        tech.marketStates = tech.marketStates || {};
        persist();
        render(true);
      }
      return;
    }
    if (button.dataset.action === 'remove-journal-market') {
      const marketKey = button.dataset.market;
      if (marketKey) {
        const cur = current();
        const tech = cur.technical;
        tech.markets = (Array.isArray(tech.markets) && tech.markets.length ? tech.markets : (tech.market ? [tech.market] : [])).filter(k => k !== marketKey);
        if (tech.marketStates) delete tech.marketStates[marketKey];
        tech.market = tech.markets[0] || null;
        tech.marketState = (tech.markets.length && tech.marketStates && tech.marketStates[tech.market]) || null;
        persist();
        render(true);
      }
      return;
    }
    if (button.dataset.action === 'toggle-add-market') {
      const drop = root.querySelector('#jv-add-market-dropdown');
      if (drop) {
        drop.hidden = !drop.hidden;
      }
      return;
    }
    if (button.dataset.action === 'set-market-state') {
      const marketKey = button.dataset.market;
      const stateVal = button.dataset.value;
      const cur = current();
      const tech = cur.technical;
      tech.marketStates = tech.marketStates || {};
      tech.marketStates[marketKey] = stateVal;
      if (!tech.market || tech.market === marketKey) {
        tech.market = marketKey;
        tech.marketState = stateVal;
      }
      persist();
      render(true);
      return;
    }
    switch (button.dataset.action) {
      case 'today': openDay(M.today()); break;
      case 'previous': case 'next': { const sorted = [...data.records].sort((a, b) => (a.date || '').localeCompare(b.date || '')); const i = sorted.findIndex(item => item.id === selected), next = sorted[i + (button.dataset.action === 'previous' ? -1 : 1)]; if (next) { if (saveError && !persist()) return; selected = next.id; month = (next.date || '').slice(0, 7); activeView = 'day'; render(true); } break; }
      case 'save': {
        const btn = button;
        const originalHtml = btn.innerHTML;
        btn.classList.add('is-saving-feedback');
        btn.innerHTML = `✓ ${text('Salvo!', 'Saved!')}`;
        persist(true);
        setTimeout(() => {
          if (btn.isConnected) {
            btn.classList.remove('is-saving-feedback');
            btn.innerHTML = originalHtml;
          }
        }, 1600);
        break;
      }
      case 'evidence': showEvidence(); break;
      case 'trades': showTrades(); break;
      case 'positions': root.querySelector('#jv-dialog').close(); go('positions'); break;
      case 'habit': sendHabit(current().shared.lesson); break;
      case 'export-journal': showExportModal(); break;
      case 'close-dialog': root.querySelector('#jv-dialog').close(); clearEvidenceUrls(); break;
    }
  });
  window.renderJournalBook = render;
  window.openJournalEditor = () => { go('journal'); openDay(M.today()); };
  window.openJournalRecord = id => {
    const record = data.records.find(item => item.id === id);
    if (!record) return false;
    selected = record.id;
    month = (record.date || '').slice(0, 7);
    go('journal');
    render(true);
    return true;
  };
  window.openJournalForMonth = monthKey => {
    if (!/^\d{4}-\d{2}$/.test(monthKey || '')) return false;
    const records = data.records
      .filter(record => (record.date || '').slice(0, 7) === monthKey)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (!records.length) return false;
    if (saveError && !persist()) return false;
    selected = records[0].id;
    month = monthKey;
    go('journal');
    render(true);
    return true;
  };
  window.openJournalForTradeReview = (tradeId) => {
    const targetId = String(tradeId);
    const linkedRecord = data.records.find(record => (record.technical?.tradeIds || []).some(id => String(id) === targetId));
    const remote = typeof synchronizedTrades === 'undefined' ? [] : synchronizedTrades;
    const local = typeof operationalState === 'undefined' ? [] : [...(operationalState.closedPositions || []), ...(operationalState.positions || [])];
    const trade = [...remote, ...local].find(item => String(item.id || item.databaseId) === targetId);
    const date = trade && (M.closeDate(trade) || M.entryDate(trade));
    go('journal');
    requestAnimationFrame(() => {
      if (linkedRecord) {
        selected = linkedRecord.id;
        month = (linkedRecord.date || '').slice(0, 7);
        render(true);
        status(text('Registro já vinculado a esta posição aberto.', 'The entry already linked to this position is open.'));
        return;
      }
      openDay(date || M.today());
      status(text('Revisão pós-trade pronta. Vincule este trade somente se fizer sentido para este registro.', 'Post-trade review ready. Link this trade only if it belongs in this entry.'));
    });
  };
  window.journalToggleComposer = open => { if (open) openDay(M.today()); };
  window.addEventListener('healthyTrend:workspaceLoaded', () => {
    try {
      data = M.load(storage, []);
      stripDataUrls(data);
      if (!data.records.length) M.ensureDay(data, M.today());
      selected = [...data.records].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0].id;
      month = (current().date || '').slice(0, 7);
      render(true);
    } catch (error) { console.warn('Não foi possível atualizar o Diário do Trader.', error); }
  });
  window.addEventListener('beforeunload', event => {
    if (persistTimer) persist();
    if (saveError || busy) { event.preventDefault(); event.returnValue = ''; }
  });
  render(true);
}());

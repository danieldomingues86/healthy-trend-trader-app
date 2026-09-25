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
  let data, selected, pane = 'technical', month, saveError = '', busy = false;
  let evidenceUrls = [];
  try {
    data = M.load(storage, []);
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
  function status(message, error = false) {
    const el = root.querySelector('#jv-save-status');
    if (el) { el.textContent = message; el.classList.toggle('is-error', error); }
  }
  function persist(explicit = false) {
    current().updatedAt = new Date().toISOString();
    try { M.save(storage, data); saveError = ''; status(text(explicit ? 'Registro salvo na sua conta.' : 'Alterações salvas.', explicit ? 'Entry saved to your account.' : 'Changes saved.')); return true; }
    catch (error) { saveError = text('Não foi possível salvar. Suas alterações continuam nesta tela; libere espaço e tente salvar novamente.', 'Could not save. Your changes remain on this screen; free up space and try saving again.'); status(saveError, true); return false; }
  }
  function openDay(date) {
    if (saveError && !persist()) return;
    try { selected = M.ensureDay(data, date).id; month = date.slice(0, 7); render(true); }
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
    const selectedMarket = tech.market || 'ibov';
    const meta = journalMarketMeta(selectedMarket);
    const snapshot = getMarketCycleSnapshot(selectedMarket);
    let feedbackHtml = '';
    if (snapshot && (snapshot.score != null || snapshot.classification)) {
      const snapLabel = snapshot.classification === 'healthy' ? text('Saudável', 'Healthy') : snapshot.classification === 'defensive' ? 'Down' : text('Transição', 'Transition');
      feedbackHtml = `<div class="jv-market-cycle-badge"><span class="jv-cycle-pulse"></span><span>${text('Ciclo de Mercado (', 'Market Cycle (')}${meta.benchmark}): <strong>${snapshot.score != null ? `${snapshot.score} pts` : ''}</strong> · <em class="jv-cycle-${snapshot.classification || 'healthy'}">${snapLabel}</em></span><small>${text('Sincronizado', 'Synchronized')}</small></div>`;
    } else {
      feedbackHtml = `<div class="jv-market-cycle-badge is-neutral"><span class="jv-cycle-neutral-icon">ℹ</span><span>${text('Benchmark de referência:', 'Benchmark:')} <b>${meta.benchmark}</b> (${meta.fullName})</span></div>`;
    }

    return `<fieldset class="jv-market-fieldset">
      <legend>1. ${text('Contexto do mercado', 'Market context')}</legend>
      <span class="jv-hint">${text('Qual mercado você está avaliando hoje?', 'Which market are you evaluating today?')}</span>
      <div class="jv-market-selector" role="group" aria-label="${text('Mercado avaliado', 'Evaluated market')}">
        ${Object.values(JOURNAL_MARKETS).map(m => `
          <button type="button" class="jv-market-opt ${m.key === selectedMarket ? 'chosen' : ''}" data-set="technical.market" data-value="${m.key}" aria-pressed="${m.key === selectedMarket}">
            <b>${m.name}</b>
            <span class="jv-market-badge">${m.benchmark}</span>
          </button>
        `).join('')}
      </div>
      ${feedbackHtml}
      <span class="jv-hint" style="margin-top:12px">${text('Permissão do mercado', 'Market permission')}</span>
      ${options('technical.marketState', [['down', 'Down'], ['transition', text('Transição', 'Transition')], ['up', text('Saudável', 'Healthy')]], tech.marketState)}
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
  function render(force = false) {
    if (!force && root.contains(document.activeElement) && document.activeElement.matches('input,textarea,select')) return;
    const e = current(), tech = e.technical, emotional = e.emotional;
    if (tech.marketState == null) {
      const snap = getMarketCycleSnapshot(tech.market || 'ibov');
      if (snap && snap.classification) {
        const stateMap = { healthy: 'up', transition: 'transition', defensive: 'down' };
        tech.marketState = stateMap[snap.classification] || 'transition';
      }
    }
    const records = [...data.records].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const months = [...new Set(records.map(item => (item.date || '').slice(0, 7)))];
    const visible = records.filter(item => (item.date || '').slice(0, 7) === month);
    const allEmotions = [...new Set([...emotions, ...emotional.states])];
    const legacyLabels = e.legacyEntries.flatMap(item => Array.isArray(item.attachments) ? item.attachments : []);
    root.innerHTML = `<div class="jv-workspace">
      <header class="jv-heading"><div><span class="jv-kicker">${text('Observar · Registrar · Entender · Evoluir', 'Observe · Record · Understand · Grow')}</span><h1>${text('Diário do Trader', 'Trader Journal')}</h1><p>${text('Mais que registros. Um processo de evolução.', 'More than entries. A process of growth.')}</p></div><p class="jv-heading-quote">${text('Conheça o mercado.<br>Conheça a si mesmo.<br>E evolua todos os dias.', 'Know the market.<br>Know yourself.<br>Grow every day.')}</p></header>
      <div class="jv-layout"><aside class="jv-history"><h2>${text('Meu Caderno', 'My Notebook')}</h2><label class="jv-sr" for="jv-month">${text('Mês do histórico', 'History month')}</label><select id="jv-month">${months.map(value => `<option value="${value}" ${value === month ? 'selected' : ''}>${value ? dateLabel(`${value}-01`, { month: 'long', year: 'numeric' }) : text('Datas a revisar', 'Dates to review')}</option>`).join('')}</select><small>${visible.length} ${text(visible.length === 1 ? 'dia registrado' : 'dias registrados', visible.length === 1 ? 'recorded day' : 'recorded days')}</small><button type="button" class="jv-new" data-action="today">＋ ${text('Registro de hoje', 'Today’s entry')}</button><nav aria-label="${text('Histórico do diário', 'Journal history')}">${visible.map(item => `<button type="button" data-day="${esc(item.id)}" ${item.id === selected ? 'aria-current="date"' : ''}><time>${item.date ? dateLabel(item.date, { day: '2-digit', month: 'short' }) : '—'}</time><span>${esc(item.date === M.today() ? text('Hoje', 'Today') : item.title || item.emotional.states[0] || text('Registro', 'Entry'))}</span></button>`).join('')}</nav><button type="button" class="jv-export-trigger" data-action="export-journal" title="${text('Exportar Diário (preparado para IA)', 'Export Journal (AI ready)')}"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>${text('Exportar Diário', 'Export Journal')}</span></button><p>${text('Um dia. Duas perspectivas.<br>Um só aprendizado.', 'One day. Two perspectives.<br>One shared lesson.')}</p></aside>
      <main class="jv-notebook"><header class="jv-book-header"><div><span class="jv-kicker">${text('Seu Caderno de Processo', 'Your Process Notebook')}</span><h2>${dateLabel(e.date)}</h2></div><div class="jv-date-nav"><button type="button" data-action="previous" aria-label="${text('Registro anterior', 'Previous entry')}">‹</button><label><span class="jv-sr">${text('Abrir registro de uma data', 'Open a date')}</span><input id="jv-date" type="date" value="${e.date || ''}"></label><button type="button" data-action="next" aria-label="${text('Próximo registro', 'Next entry')}">›</button></div></header>
      <div class="jv-tabs" role="tablist" aria-label="${text('Página do caderno', 'Notebook page')}"><button type="button" id="jv-tab-technical" role="tab" aria-controls="jv-technical" aria-selected="${pane === 'technical'}" tabindex="${pane === 'technical' ? 0 : -1}" data-pane="technical">▥ ${text('Técnico', 'Technical')}</button><button type="button" id="jv-tab-emotional" role="tab" aria-controls="jv-emotional" aria-selected="${pane === 'emotional'}" tabindex="${pane === 'emotional' ? 0 : -1}" data-pane="emotional">◉ ${text('Emocional', 'Emotional')}</button></div>
      <div class="jv-spread" data-focus="${pane}">
        <section id="jv-technical" class="jv-sheet jv-technical ${pane === 'technical' ? 'is-focused' : ''}" aria-labelledby="jv-tech-title"><header><i class="jv-title-icon">${icons.technical}</i><div><h3 id="jv-tech-title">${text('Diário Técnico', 'Technical Journal')}</h3><p>${text('Como eu executei hoje?', 'How did I execute today?')}</p></div></header>
          <div class="jv-fields">${marketContextSection(tech)}
          ${field('technical.session', `2. ${text('O que eu observei hoje?', 'What did I observe today?')}`, tech.session, text('Contexto, decisões e execução. O que merece ficar registrado?', 'Context, decisions and execution. What is worth recording?'), 5)}
          <fieldset><legend>3. ${text('Execução', 'Execution')}</legend><div class="jv-execution"><div class="jv-execution-card"><span class="jv-execution-label">${text('Qualidade da execução', 'Execution quality')}</span><strong><output id="jv-execution-score">${tech.executionScore ?? '—'}</output> <small>/ 10</small></strong><input class="jv-score-slider" type="range" min="0" max="10" step="0.1" data-field="technical.executionScore" value="${tech.executionScore ?? 0}" aria-label="${text('Qualidade da execução', 'Execution quality')}"></div><div class="jv-execution-card"><span class="jv-execution-label">${text('Plano', 'Plan')}</span><div class="jv-plan-options" role="group" aria-label="${text('Plano respeitado', 'Plan followed')}">${[['yes', '✓', text('Respeitado', 'Followed')], ['partial', '–', text('Parcialmente', 'Partially')], ['no', '×', text('Não respeitado', 'Not followed')]].map(([value, icon, label]) => `<button type="button" class="jv-plan-option ${tech.planRespected === value ? 'chosen' : ''}" data-set="technical.planRespected" data-value="${value}" aria-pressed="${tech.planRespected === value}"><i aria-hidden="true">${icon}</i><span>${label}</span></button>`).join('')}</div></div></div></fieldset>
          ${linkedTradeSummary()}
          ${importedSourceSection(e)}
          <fieldset><legend>4. ${text('Evidências da sessão', 'Session evidence')}</legend><span class="jv-hint">${text('Anexe arquivos ou abra “Anexar / Ctrl+V” para colar um print. Quando reconhecido, o ticker entra no nome do print junto à data do registro.', 'Attach files or open “Attach / Ctrl+V” to paste a screenshot. When recognised, the ticker is added to the screenshot name with the record date.')}</span>${evidenceStrip()}${legacyLabels.length ? `<small class="jv-hint">${text('Referências antigas preservadas nos detalhes.', 'Legacy references preserved in details.')}</small>` : ''}</fieldset>
          <details class="jv-extra"><summary>${text('Checklist e permissão operacional', 'Checklist and trading permission')}</summary><label class="jv-field">${text('O mercado merece meu dinheiro hoje?', 'Does the market deserve my money today?')}<select data-field="technical.permissionMoney"><option value="">${text('Não informado', 'Not recorded')}</option><option value="wait" ${tech.permissionMoney === 'wait' ? 'selected' : ''}>${text('Não — meu trabalho é esperar', 'No — my job is to wait')}</option><option value="grade-a" ${['grade-a','a-plus'].includes(tech.permissionMoney) ? 'selected' : ''}>${text('Sim — somente cenário A', 'Yes — A conditions only')}</option></select></label>${checks.map((label, i) => `<label class="jv-check"><input type="checkbox" data-check="${i}" ${tech.checklist?.[i] ? 'checked' : ''}>${label}</label>`).join('')}</details></div>
          <div class="jv-page-preview"><span class="jv-page-number">01 / ${text('Leitura do processo', 'Process reading')}</span><p>${esc(tech.session || text('O que aconteceu no mercado e como você executou?', 'What happened in the market and how did you execute?'))}</p><div>${text('Mercado', 'Market')}: <b>${journalMarketMeta(tech.market || 'ibov').name} (${journalMarketMeta(tech.market || 'ibov').benchmark})</b> · <b>${tech.marketState ? (tech.marketState === 'up' ? text('Saudável', 'Healthy') : tech.marketState === 'down' ? 'Down' : text('Transição', 'Transition')) : '—'}</b></div><div>${text('Execução', 'Execution')}: <b>${tech.executionScore ?? '—'} / 10</b></div><div>${text('Plano', 'Plan')}: <b>${tech.planRespected === 'yes' ? text('Respeitado', 'Followed') : tech.planRespected === 'no' ? text('Não respeitado', 'Not followed') : tech.planRespected === 'partial' ? text('Parcialmente', 'Partially') : '—'}</b></div><button type="button" data-pane="technical">${text('Escrever na página técnica', 'Write on the technical page')} →</button></div>
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
      <footer class="jv-lessons"><div class="jv-lesson-title"><span class="jv-title-icon">${icons.lessons}</span><div><h3>${text('Lições do dia', 'Lessons of the day')}</h3><p>${text('Mercado + execução + emoção → aprendizado', 'Market + execution + emotion → learning')}</p></div></div><div class="jv-lesson-write">${field('shared.lesson', text('O que vou levar para amanhã?', 'What will I take into tomorrow?'), e.shared.lesson, text('Uma lição que conecta o que você fez e como se sentiu.', 'One lesson connecting what you did and how you felt.'), 3)}</div>
      </footer>
      </main></div><dialog id="jv-dialog" aria-labelledby="jv-dialog-title"><header><h2 id="jv-dialog-title"></h2><button type="button" data-action="close-dialog" aria-label="${text('Fechar', 'Close')}">×</button></header><div id="jv-dialog-body"></div></dialog>
    </div>`;
    hydrateEvidenceStrip();
    root.querySelector('.jv-lessons')?.remove();
  }
  function setValue(path, value) {
    const allowed = ['title', 'technical.market', 'technical.marketState', 'technical.session', 'technical.executionScore', 'technical.planRespected', 'technical.permissionMoney', 'emotional.intensity', 'emotional.note', 'emotional.impact', 'emotional.impactNote', 'shared.lesson', 'shared.patterns', 'shared.observations', 'shared.phrase'];
    if (!allowed.includes(path)) return;
    const keys = path.split('.');
    let target = current(); if (keys.length === 2) target = target[keys.shift()];
    target[keys[0]] = value; persist();
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
      const blob = await evidenceBlob(item);
      const url = URL.createObjectURL(blob); evidenceUrls.push(url);
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
    dialog(text('Trades do dia', 'Day’s trades'), trades.length ? `<p>${text('O vínculo é opcional. Escolha apenas os trades que ajudarem a explicar o seu processo.', 'The link is optional. Choose only the trades that help explain your process.')}</p><ul class="jv-trades">${trades.map(item => `<li><b>${esc(item.ticker || item.asset)}</b><span>${esc(item.setup || '—')} · ${esc(item.direction || '')} · ${tradeMoment(item)}</span><label><input type="checkbox" data-trade="${esc(item.id)}" ${current().technical.tradeIds.includes(item.id) ? 'checked' : ''}> ${text('Vincular ao registro', 'Link to entry')}</label></li>`).join('')}</ul>` : `<p>${text('Nenhum trade aberto ou encerrado nesta data foi encontrado. Dias de espera também fazem parte do processo.', 'No trade opened or closed on this date was found. Waiting days are also part of the process.')}</p>`);
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
    const el = event.target; if (!el.dataset.field) return;
    if (el.type === 'number' && !el.validity.valid) { status(text('Use uma nota de 0 a 10.', 'Use a score from 0 to 10.'), true); return; }
    setValue(el.dataset.field, el.type === 'number' || el.type === 'range' ? M.score(el.value) : el.value || (el.tagName === 'SELECT' ? null : ''));
    if (el.type === 'range') { const output = root.querySelector('#jv-execution-score'); if (output) output.value = M.score(el.value); }
  });
  root.addEventListener('change', event => {
    const el = event.target;
    if (el.id === 'jv-date') openDay(el.value);
    if (el.id === 'jv-month') { month = el.value; render(true); }
    if (el.id === 'jv-files') upload([...el.files]);
    if (el.dataset.check !== undefined) { current().technical.checklist[el.dataset.check] = el.checked; persist(); }
    if (el.dataset.trade) { const ids = current().technical.tradeIds; current().technical.tradeIds = el.checked ? [...new Set([...ids, el.dataset.trade])] : ids.filter(id => id !== el.dataset.trade); persist(); }
  });
  root.addEventListener('paste', event => {
    const evidenceDialogOpen = root.querySelector('#jv-dialog')?.open;
    const evidenceControl = event.target.closest?.('[data-action="evidence"], .jv-evidence-strip, [data-evidence-paste]');
    if (evidenceDialogOpen || evidenceControl) uploadClipboardImages(event);
  });
  root.addEventListener('keydown', event => {
    const evidenceDialog = root.querySelector('#jv-dialog.jv-evidence-dialog[open]');
    if (evidenceDialog && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const id = evidenceDialog.querySelector('[data-evidence-id]')?.dataset.evidenceId;
      if (id) { event.preventDefault(); navigateEvidence(id, event.key === 'ArrowLeft' ? -1 : 1); return; }
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
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.action === 'evidence-previous') { navigateEvidence(button.dataset.evidenceId, -1); return; }
    if (button.dataset.action === 'evidence-next') { navigateEvidence(button.dataset.evidenceId, 1); return; }
    if (button.dataset.evidenceId) { openEvidence(button.dataset.evidenceId); return; }
    if (button.dataset.removeEvidence) { removeEvidence(button.dataset.removeEvidence); return; }
    if (button.dataset.positionId) { window.openPositionFromJournal?.(button.dataset.positionId); return; }
    if (button.dataset.day) { if (saveError && !persist()) return; selected = button.dataset.day; render(true); return; }
    if (button.dataset.pane) { pane = button.dataset.pane; render(true); root.querySelector(`#jv-tab-${pane}`).focus({ preventScroll: true }); return; }
    if (button.dataset.set) {
      const path = button.dataset.set;
      const value = path === 'emotional.intensity' ? Number(button.dataset.value) : button.dataset.value;
      setValue(path, value);
      if (path === 'technical.market') {
        const snapshot = getMarketCycleSnapshot(value);
        if (snapshot && snapshot.classification) {
          const stateMap = { healthy: 'up', transition: 'transition', defensive: 'down' };
          setValue('technical.marketState', stateMap[snapshot.classification] || 'transition');
        }
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
    switch (button.dataset.action) {
      case 'today': openDay(M.today()); break;
      case 'previous': case 'next': { const sorted = [...data.records].sort((a, b) => (a.date || '').localeCompare(b.date || '')); const i = sorted.findIndex(item => item.id === selected), next = sorted[i + (button.dataset.action === 'previous' ? -1 : 1)]; if (next) { if (saveError && !persist()) return; selected = next.id; month = (next.date || '').slice(0, 7); render(true); } break; }
      case 'save': persist(true); break;
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
      if (!data.records.length) M.ensureDay(data, M.today());
      selected = [...data.records].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0].id;
      month = (current().date || '').slice(0, 7);
      render(true);
    } catch (error) { console.warn('Não foi possível atualizar o Diário do Trader.', error); }
  });
  window.addEventListener('beforeunload', event => { if (saveError || busy) { event.preventDefault(); event.returnValue = ''; } });
  render(true);
}());

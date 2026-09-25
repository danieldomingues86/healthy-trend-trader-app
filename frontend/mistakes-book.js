(function () {
  'use strict';
  const root = document.getElementById('mistakesbook'), masteredRoot = document.getElementById('masteredlessons');
  if (!root || !masteredRoot) return;
  const M = window.MistakesBookModel;
  const storage = () => window.healthyTrendWorkspace?.storage;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const lang = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const state = { selected: null, filter: 'Todos', query: '', section: 'records', modal: false, editing: null, annotation: 'Entrada', urls: [], error: '' };
  let data;
  function reload() { try { data = M.load(storage()); state.error = ''; } catch (error) { state.error = error.message; data = { version: 1, records: [] }; } }
  function persist() { M.save(storage(), data); }
  const formatR = value => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}R`;
  const dateLabel = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
  function trades() {
    const remote = typeof synchronizedTrades === 'undefined' ? [] : synchronizedTrades;
    const local = typeof operationalState === 'undefined' ? [] : [...(operationalState.positions || []), ...(operationalState.closedPositions || [])];
    return [...new Map([...remote, ...local].filter(item => item.id || item.databaseId).map(item => [String(item.id || item.databaseId), item])).values()];
  }
  function tradeById(id) { return trades().find(item => String(item.id || item.databaseId) === String(id)); }
  function journalRecords() { try { return window.JournalV2Model?.load(storage(), []).records || []; } catch (_) { return []; } }
  function evidenceFor(record) {
    const day = journalRecords().find(item => item.date === record.date);
    const images = (day?.evidence || []).filter(item => item.type?.startsWith('image/') && item.type !== 'image/svg+xml');
    const ticker = String(record.ticker || '').toUpperCase();
    return images.filter(item => !ticker || item.name?.toUpperCase().includes(ticker));
  }
  // Legacy records may only have preTradeScreenshot. Keep it visible as the
  // single screenshot while newer records always use tradeScreenshot.
  function screenshot(record) { return record.tradeScreenshot || record.preTradeScreenshot || evidenceFor(record)[0] || null; }
  const attachmentUrlCache = new Map();
  function clearUrls() { /* Keep cached URLs alive across page turns */ }
  function closeImagePreview() { root.querySelector('.mb-image-preview')?.remove(); }
  function openImagePreview(source) {
    if (!source?.src && !source?.dataset?.attachment) return;
    closeImagePreview();
    const dialog = document.createElement('section');
    dialog.className = 'mb-image-preview'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', source.alt || lang('Visualização do print', 'Screenshot preview'));
    const figure = document.createElement('figure');
    const close = document.createElement('button'); close.type = 'button'; close.className = 'mb-image-preview-close'; close.dataset.closeImagePreview = ''; close.setAttribute('aria-label', lang('Fechar visualização', 'Close preview')); close.textContent = '×';
    const image = new Image();
    const srcUrl = source.currentSrc || source.src || (source.dataset?.attachment && attachmentUrlCache.get(source.dataset.attachment));
    image.src = srcUrl || '';
    image.alt = source.alt || lang('Print ampliado', 'Expanded screenshot');
    const caption = document.createElement('figcaption'); caption.textContent = source.alt || lang('Print', 'Screenshot');
    figure.append(close, image, caption); dialog.append(figure); root.append(dialog); close.focus();
  }
  function fitAnnotationLayer(image) {
    const layer = image.closest('.mb-chart')?.querySelector('.mb-annotation-layer'); if (!layer || !image.naturalWidth) return;
    const box = image.getBoundingClientRect(), ratio = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
    const width = image.naturalWidth * ratio, height = image.naturalHeight * ratio;
    Object.assign(layer.style, { left: `${(box.width - width) / 2}px`, top: `${(box.height - height) / 2}px`, width: `${width}px`, height: `${height}px`, right: 'auto', bottom: 'auto' });
  }
  async function hydrateImages() {
    for (const image of root.querySelectorAll('img[data-attachment]')) {
      const id = image.dataset.attachment;
      if (attachmentUrlCache.has(id)) {
        image.src = attachmentUrlCache.get(id);
        image.onload = () => fitAnnotationLayer(image);
        if (image.complete) fitAnnotationLayer(image);
        continue;
      }
      try {
        const blob = await window.healthyTrendApi.requestBlob(`/api/journal-attachments/${encodeURIComponent(id)}/content`);
        if (image.isConnected) {
          const url = URL.createObjectURL(blob);
          attachmentUrlCache.set(id, url);
          state.urls.push(url);
          image.onload = () => fitAnnotationLayer(image);
          image.src = url;
          if (image.complete) fitAnnotationLayer(image);
        }
      } catch (_) { image.closest('.mb-chart')?.classList.add('mb-image-unavailable'); }
    }
  }
  function attachmentField(name, multiple = false) {
    return `<label class="wide mb-print-upload">${lang('Prints e evidências', 'Screenshots and evidence')}<input name="${name}" type="file" accept="image/*" ${multiple ? 'multiple' : ''}><small data-print-status>${lang('Escolha uma imagem ou cole um print com Ctrl + V.', 'Choose an image or paste a screenshot with Ctrl + V.')}</small></label>`;
  }
  function clipboardImages(clipboard) {
    return [...(clipboard?.items || [])].filter(item => item.type?.startsWith('image/')).map(item => item.getAsFile?.()).filter(Boolean);
  }
  function setInputFiles(input, files) {
    const transfer = new DataTransfer(); files.forEach(file => transfer.items.add(file)); input.files = transfer.files;
    const status = input.closest('label')?.querySelector('[data-print-status]');
    if (status) status.textContent = files.length === 1 ? files[0].name : `${files.length} ${lang('prints prontos para salvar.', 'screenshots ready to save.')}`;
  }
  function filtered() {
    return data.records.filter(record => {
      const match = state.filter === 'Todos' || (state.filter === 'Lições Dominadas' ? record.isMastered : (M.GROUPS[state.filter] || []).some(type => record.mistakeTypes?.includes(type)));
      const haystack = [record.ticker, record.setup, record.whatWentWrong, record.lessonLearned, ...(record.mistakeTypes || [])].join(' ').toLocaleLowerCase();
      return match && haystack.includes(state.query.toLocaleLowerCase());
    }).sort((a, b) => `${b.date || ''}${b.createdAt || ''}`.localeCompare(`${a.date || ''}${a.createdAt || ''}`));
  }
  function annotationMarkup(record) {
    return (record.annotations || []).map(item => `<div class="mb-annotation" style="left:${Math.max(0, Math.min(100, Number(item.x) || 0))}%;top:${Math.max(0, Math.min(100, Number(item.y) || 0))}%"><span class="mb-annotation-point"></span><span>${esc(item.label)}</span></div>`).join('');
  }
  function imageMarkup(record, label) {
    const item = screenshot(record);
    return `<div class="mb-chart mb-chart-main">${item ? `<img data-attachment="${esc(item.id)}" alt="${esc(label)}" draggable="false"><button type="button" class="mb-chart-zoom-btn" data-chart-zoom title="${lang('Ampliar print em tela cheia (Zoom)', 'Enlarge screenshot (Zoom)')}">🔍 ${lang('Ampliar print', 'Zoom print')}</button><div class="mb-annotation-layer ${state.annotation === 'zoom' ? 'mb-mode-zoom' : ''}" data-chart-annotate="${esc(record.id)}">${annotationMarkup(record)}</div>` : `<div class="mb-chart-placeholder"><span>⌁</span><p>${esc(lang('Adicione o print do trade para localizar o erro no gráfico.', 'Add a trade screenshot to locate the mistake on the chart.'))}</p></div>`}</div>`;
  }
  function navigateRecord(delta) {
    if (state.section === 'marketLessons') return;
    const items = filtered();
    if (!items.length) return;
    const nextId = M.nextRecordId ? M.nextRecordId(items, state.selected, delta) : null;
    if (nextId && nextId !== state.selected) {
      state.selected = nextId;
      render();
    }
  }
  function evolution(record) {
    const type = record.mistakeTypes?.[0]; if (!type) return lang('Classifique o erro para acompanhar sua evolução.', 'Classify the mistake to follow your progress.');
    const trend = M.change(data.records, type), max = Math.max(1, ...trend.months.map(item => item.count));
    const bars = trend.months.map(item => `<i title="${esc(item.key)}: ${item.count}" style="height:${Math.max(7, item.count / max * 100)}%"></i>`).join('');
    const line = trend.percentage === null ? lang('Registre mais meses para comparar o padrão.', 'Record more months to compare the pattern.') : trend.percentage > 0 ? lang(`Você reduziu ${trend.percentage}% desse erro nos últimos 3 meses.`, `You reduced this mistake by ${trend.percentage}% in the last 3 months.`) : trend.percentage < 0 ? lang(`Esse erro aumentou ${Math.abs(trend.percentage)}% nos últimos 3 meses.`, `This mistake increased by ${Math.abs(trend.percentage)}% in the last 3 months.`) : lang('A frequência ficou estável nos últimos 3 meses.', 'Frequency stayed stable in the last 3 months.');
    return `<div class="mb-evolution-bars">${bars}</div><p>${esc(line)}</p>`;
  }
  function bookTabsMarkup() {
    const tabs = ['Todos', 'Entrada', 'Saída', 'Gestão', 'Emocional', 'Setup', 'Lições Dominadas'];
    const tabsHtml = tabs.map((name, i) => `<button style="--tab-index:${i}" class="${state.section !== 'marketLessons' && state.filter === name ? 'active' : ''}" data-filter="${esc(name)}">${esc(name)}</button>`).join('');
    const marketTab = `<button class="${state.section === 'marketLessons' ? 'active' : ''}" data-market-lessons>${lang('Lições importantes', 'Important lessons')}</button>`;
    return `<div class="mb-book-tabs" role="tablist" aria-label="${lang('Capítulos do livro', 'Book chapters')}">${tabsHtml}${marketTab}</div>`;
  }
  function spread(record, items) {
    const index = items.findIndex(item => item.id === record.id), type = record.mistakeTypes?.[0], impact = type ? M.impact(data.records, type) : null;
    const number = data.records.indexOf(record) + 1;
    const tools = M.ANNOTATION_TOOLS || ['Entrada', 'Stop', 'Saída', 'Região de interesse', 'Breakout', 'Erro', 'Confirmação correta'];
    return `<div class="mb-book-wrap">${bookTabsMarkup()}<div class="mb-book"><div class="mb-page mb-page-left"><div class="mb-folio"><i>#${String(number).padStart(3, '0')}</i><span>${esc(dateLabel(record.date))}</span></div><div class="mb-trade-title"><div><h2>${esc(record.ticker || lang('Sem ativo', 'No asset'))}</h2><p>${esc(record.assetName || record.market || '')}</p></div><div class="mb-result"><small>${lang('RESULTADO', 'RESULT')}</small><b>${formatR(M.number(record.resultR))}</b></div></div><div class="mb-trade-meta"><div><small>Setup</small><b>${esc(record.setup || '—')}</b></div><div><small>Timeframe</small><b>${esc(record.timeframe || '—')}</b></div><div><small>${lang('Mercado', 'Market')}</small><b>${esc(record.market || '—')}</b></div></div>${imageMarkup(record, lang('Print do trade', 'Trade screenshot'))}<div class="mb-annotation-controls"><span>${lang('Modo / Ferramenta:', 'Mode / Tool:')}</span><select data-annotation-tool aria-label="${lang('Modo de marcação ou zoom', 'Annotation or zoom mode')}"><option value="zoom" ${state.annotation === 'zoom' ? 'selected' : ''}>🔍 ${lang('Modo Zoom (clicar amplia)', 'Zoom mode (click to zoom)')}</option><optgroup label="${lang('Marcar no gráfico', 'Mark on chart')}">${tools.map(value => `<option value="${value}" ${state.annotation === value ? 'selected' : ''}>✏️ ${value}</option>`).join('')}</optgroup></select><button type="button" data-chart-zoom title="${lang('Ampliar imagem em tela cheia', 'Enlarge image full screen')}">🔍 ${lang('Ampliar print', 'Zoom print')}</button><button data-undo-annotation="${esc(record.id)}" ${(record.annotations || []).length ? '' : 'disabled'}>${lang('Desfazer', 'Undo')}</button><small>${state.annotation === 'zoom' ? lang('Clique no gráfico para dar zoom em tela cheia.', 'Click chart to zoom full screen.') : lang(`Clique no gráfico para marcar: ${state.annotation}.`, `Click on chart to mark: ${state.annotation}.`)}</small></div><div class="mb-before-note"><div><h3>Print to Trade <small>(${lang('setup original', 'original setup')})</small></h3>${imageMarkup(record, 'Print to Trade')}</div><blockquote class="mb-sticky">${esc(record.notes || lang('Sua nota pessoal aparecerá aqui.', 'Your personal note will appear here.'))}</blockquote></div></div><div class="mb-book-spine"></div><div class="mb-page mb-page-right"><div class="mb-analysis-grid"><section><h3>1. ${lang('Onde errei?', 'Where did I go wrong?')}</h3><p>${esc(record.whatWentWrong || '—')}</p></section><section><h3>2. ${lang('Tipo do erro', 'Mistake type')}</h3><div class="mb-tags">${(record.mistakeTypes || []).map(tag => `<span>${esc(tag)}</span>`).join('') || '<span>—</span>'}</div></section><section><h3>3. ${lang('Por que fiz isso?', 'Why did I do it?')}</h3><p>${esc(record.whyIDidIt || '—')}</p>${(record.emotionalTags || []).length ? `<small class="mb-emotions">${record.emotionalTags.map(esc).join(' · ')}</small>` : ''}</section><section><h3>4. ${lang('O que deveria ter feito?', 'What should I have done?')}</h3><p>${esc(record.whatShouldHaveDone || '—')}</p></section><section><h3>5. ${lang('Lição aprendida', 'Lesson learned')}</h3><blockquote class="mb-lesson">“${esc(record.lessonLearned || '—')}”</blockquote></section><section><h3>6. ${lang('Nova regra', 'New rule')}</h3><blockquote class="mb-rule"><span>✓</span>${esc(record.newRule || '—')}</blockquote></section><section><h3>7. ${lang('Já repeti esse erro?', 'Have I repeated this mistake?')}</h3><p>${impact && impact.count > 1 ? lang(`Sim. Este erro apareceu ${impact.count} vezes.`, `Yes. This mistake has appeared ${impact.count} times.`) : lang('Ainda não há repetição desta categoria.', 'No repetition of this category yet.')}</p>${type ? `<button class="mb-inline-button" data-related="${esc(type)}">${lang('Ver todos os erros de', 'See all mistakes of')} ${esc(type)} →</button>` : ''}</section><section><h3>${lang('Impacto deste erro', 'Impact of this mistake')}</h3><div class="mb-impact"><p>${lang('Total de ocorrências', 'Occurrences')}: <b>${impact?.count ?? '—'}</b></p><p>${lang('Percentual dos erros', 'Share of mistakes')}: <b>${impact?.percentage ?? '—'}%</b></p><p>${lang('Custo total', 'Total cost')}: <b class="mb-negative">${formatR(impact?.costR ?? null)}</b></p></div></section><section class="mb-evolution"><h3>${lang('Evolução', 'Progress')}</h3>${evolution(record)}</section><section class="mb-page-quote">“${lang('Disciplina é a ponte entre o erro de hoje e o resultado de amanhã.', 'Discipline is the bridge between today’s mistake and tomorrow’s result.')}”</section></div><div class="mb-page-actions"><button data-edit="${esc(record.id)}">${lang('Editar registro', 'Edit entry')}</button><button data-master="${esc(record.id)}">${record.isMastered ? lang('Reabrir lição', 'Reopen lesson') : lang('Marcar como Lição Dominada', 'Mark as Mastered Lesson')}</button></div></div></div></div><nav class="mb-page-nav"><button data-move="-1" ${index <= 0 ? 'disabled' : ''}>← ${lang('Anterior', 'Previous')}</button><span>${index + 1} / ${items.length}</span><button data-move="1" ${index >= items.length - 1 ? 'disabled' : ''}>${lang('Próximo', 'Next')} →</button></nav>`;
  }
  function empty() { const hasRecords = data.records.length > 0; return `<div class="mb-book-wrap">${bookTabsMarkup()}<div class="mb-book mb-book-empty"><div class="mb-page mb-page-left"><div class="mb-empty-art">📖</div><h2>${hasRecords ? lang('Nenhum registro neste capítulo.', 'No entries in this chapter.') : lang('Seu Mistakes Book ainda está vazio.', 'Your Mistakes Book is still empty.')}</h2><p>${hasRecords ? lang('Experimente outra aba ou palavra-chave para encontrar uma lição.', 'Try another tab or keyword to find a lesson.') : lang('O mercado cobra algumas lições. Aqui você garante que não precisará pagar duas vezes pela mesma.', 'The market charges for some lessons. Here you make sure you do not pay twice for the same one.')}</p><button ${hasRecords ? 'data-clear-filters' : 'data-new'}>${hasRecords ? lang('Ver todos os registros', 'See all entries') : lang('Registrar minha primeira lição', 'Record my first lesson')}</button></div><div class="mb-book-spine"></div><div class="mb-page mb-page-right"><div class="mb-empty-steps"><span>Trade</span><i>→</i><span>Erro</span><i>→</i><span>Causa</span><i>→</i><span>Correção</span><i>→</i><span>Lição</span><i>→</i><span>Regra</span><i>→</i><span>Evolução</span></div><blockquote>“${lang('O erro aconteceu no passado. O aprendizado precisa permanecer para sempre.', 'The mistake happened in the past. The learning should last forever.')}”</blockquote></div></div></div>`; }
  function marketLessonsView() {
    const lessons = [...(data.marketLessons || [])].sort((a, b) => `${b.date || ''}${b.createdAt || ''}`.localeCompare(`${a.date || ''}${a.createdAt || ''}`));
    return `<section class="mb-market-lessons"><header><div><small>HEALTHY TREND TRADER</small><h2>${lang('Lições importantes', 'Important lessons')}</h2><p>${lang('Registre leituras do mercado que devem acompanhar suas próximas decisões. Elas não são filtros de trade.', 'Record market readings that should guide your next decisions. They are not trade filters.')}</p></div><div><button data-records>${lang('Voltar ao livro', 'Back to book')}</button><button data-new-market-lesson>＋ ${lang('Registrar lição de mercado', 'Record market lesson')}</button></div></header>${lessons.length ? `<div class="mb-market-lesson-list">${lessons.map(item => `<article><time>${esc(dateLabel(item.date))}</time><h3>${esc(item.title)}</h3><p>${esc(item.lesson)}</p>${(item.screenshots || []).length ? `<div class="mb-market-lesson-images">${item.screenshots.map((image, index) => `<img data-attachment="${esc(image.id)}" alt="${lang('Print', 'Screenshot')} ${index + 1}">`).join('')}</div>` : ''}<footer>${esc(item.context || '')}<button data-delete-market-lesson="${esc(item.id)}" aria-label="${lang('Excluir lição', 'Delete lesson')}">×</button></footer></article>`).join('')}</div>` : `<div class="mb-market-lessons-empty"><b>✦</b><h3>${lang('Ainda não há lições de mercado registradas.', 'No market lessons have been recorded yet.')}</h3><p>${lang('Anote o que o ciclo, a amplitude ou a liderança do mercado ensinou hoje.', 'Capture what the cycle, breadth, or market leadership taught you today.')}</p><button data-new-market-lesson>${lang('Registrar primeira lição', 'Record first lesson')}</button></div>`}</section>`;
  }
  function openMarketLessonModal() {
    const today = new Date().toISOString().slice(0, 10);
    root.insertAdjacentHTML('beforeend', `<div class="mb-modal-backdrop"><form class="mb-form" id="mbMarketLessonForm"><div class="mb-form-head"><div><small>LIÇÕES IMPORTANTES</small><h2>${lang('Lição de mercado', 'Market lesson')}</h2></div><button type="button" data-close aria-label="${lang('Fechar', 'Close')}">×</button></div><div class="mb-form-grid"><label>${lang('Data', 'Date')}<input name="date" type="date" value="${today}" required></label><label>${lang('Contexto', 'Context')}<input name="context" placeholder="${lang('Ex.: ciclo, amplitude, líderes', 'E.g.: cycle, breadth, leaders')}"></label><label class="wide">${lang('Título da lição', 'Lesson title')}<input name="title" required></label><label class="wide">${lang('O que o mercado ensinou?', 'What did the market teach you?')}<textarea name="lesson" required></textarea></label>${attachmentField('screenshots', true)}</div><div class="mb-form-foot"><span></span><button type="button" data-close>${lang('Cancelar', 'Cancel')}</button><button type="submit">${lang('Salvar lição', 'Save lesson')}</button></div></form></div>`);
    state.modal = true; root.querySelector('#mbMarketLessonForm input[name=title]')?.focus();
  }
  async function saveMarketLesson(event) {
    event.preventDefault(); const values = new FormData(event.target), now = new Date().toISOString();
    const id = `market_lesson_${crypto.randomUUID()}`;
    const screenshots = [];
    for (const image of values.getAll('screenshots').filter(file => file?.size)) screenshots.push(await uploadImage(image, id));
    const lesson = { id, date: values.get('date'), context: String(values.get('context') || '').trim(), title: String(values.get('title') || '').trim(), lesson: String(values.get('lesson') || '').trim(), screenshots, createdAt: now };
    const next = { ...data, marketLessons: [lesson, ...(data.marketLessons || [])] }; M.save(storage(), next); data = next; closeModal(); render();
  }
  function render() {
    if (state.section === 'marketLessons') {
      clearUrls(); root.innerHTML = `<div class="mb-scene"><div class="mb-content">${marketLessonsView()}</div></div>`; hydrateImages(); renderMastered(); return;
    }
    clearUrls(); const items = filtered(), metrics = M.metrics(data.records);
    const record = items.find(item => item.id === state.selected) || items[0]; state.selected = record?.id || null;
    root.innerHTML = `<div class="mb-scene"><div class="mb-content"><header class="mb-header"><div class="mb-heading"><div class="mb-book-icon" aria-hidden="true">📖</div><div><h1>Mistakes Book</h1><span>${lang('Livro dos Erros', 'Book of Mistakes')}</span></div><p>“${lang('As melhores lições vêm dos momentos mais difíceis.', 'The best lessons come from the hardest moments.')}”</p></div><div class="mb-header-actions"><label class="mb-search"><span>⌕</span><input data-search placeholder="${lang('Buscar por ativo, erro ou palavra-chave...', 'Search asset, mistake or keyword...')}" value="${esc(state.query)}"></label><button data-new>＋ ${lang('Novo Registro', 'New Entry')}</button></div></header><div class="mb-metrics"><div><small>${lang('Total de Erros', 'Total Mistakes')}</small><b>${metrics.total}</b></div><div><small>${lang('Erros Repetidos', 'Repeated Mistakes')}</small><b>${metrics.repeated} <em>(${metrics.repeatedPercent}%)</em></b></div><div><small>${lang('Custo dos Erros', 'Mistake Cost')}</small><b class="mb-negative">${formatR(metrics.costR)}</b></div><div><small>${lang('Lições Dominadas', 'Mastered Lessons')}</small><b>${metrics.mastered}</b></div></div>${state.error ? `<p class="mb-data-error">${esc(state.error)} ${lang('Seus dados originais foram preservados.', 'Your original data was preserved.')}</p>` : ''}${record ? spread(record, items) : empty()}${items.length ? `<div class="mb-index"><span>${lang('Neste capítulo', 'In this chapter')}</span>${items.map(item => `<button class="${item.id === state.selected ? 'active' : ''}" data-select="${esc(item.id)}">${esc(item.ticker || lang('Registro', 'Entry'))} · ${esc(dateLabel(item.date))}</button>`).join('')}</div>` : ''}</div></div>`;
    // A single chart keeps the book focused. Existing legacy second prints are
    // intentionally preserved in storage but are no longer rendered.
    root.querySelectorAll('.mb-before-note').forEach(element => element.remove());
    hydrateImages(); renderMastered();
  }
  function renderMastered() {
    const items = data.records.filter(item => item.isMastered).sort((a, b) => `${b.masteredAt || ''}`.localeCompare(`${a.masteredAt || ''}`));
    masteredRoot.innerHTML = `<div class="mb-mastered"><header><small>HEALTHY TREND TRADER</small><h1>${lang('Lições Dominadas', 'Mastered Lessons')}</h1><p>${lang('Comportamentos transformados em regras e prática.', 'Behaviors turned into rules and practice.')}</p></header>${items.length ? `<div class="mb-mastered-list">${items.map(item => `<button data-open-mistake="${esc(item.id)}"><span>✦</span><b>${esc(item.lessonLearned || item.ticker || 'Lição')}</b><small>${esc(item.newRule || '')}</small><i>→</i></button>`).join('')}</div>` : `<div class="mb-mastered-empty"><span>✦</span><h2>${lang('Sua próxima conquista começa com uma lição registrada.', 'Your next achievement starts with a recorded lesson.')}</h2><button data-book>${lang('Abrir Mistakes Book', 'Open Mistakes Book')}</button></div>`}</div>`;
  }
  function openModal(id) {
    state.editing = id || null; const record = data.records.find(item => item.id === id) || {};
    const choices = trades().filter(item => item.status !== 'planned').map(item => `<option value="${esc(item.id || item.databaseId)}" ${String(record.tradeId) === String(item.id || item.databaseId) ? 'selected' : ''}>${esc(item.ticker || item.asset || 'Trade')} · ${esc(item.setup || '')}</option>`).join('');
    const html = `<div class="mb-modal-backdrop"><form class="mb-form" id="mbForm"><div class="mb-form-head"><div><small>MISTAKES BOOK</small><h2>${id ? lang('Editar lição', 'Edit lesson') : lang('Novo Registro', 'New Entry')}</h2></div><button type="button" data-close aria-label="Fechar">×</button></div><div class="mb-form-grid"><label>${lang('Reaproveitar trade existente', 'Reuse existing trade')}<select name="tradeId" data-trade-choice><option value="">${lang('Registro independente', 'Independent entry')}</option>${choices}</select></label><label>${lang('Ativo', 'Asset')}<input name="ticker" value="${esc(record.ticker)}" placeholder="Ex.: WEGE3" required></label><label>${lang('Data', 'Date')}<input name="date" type="date" value="${esc(record.date || new Date().toISOString().slice(0, 10))}" required></label><label>Setup<input name="setup" value="${esc(record.setup)}"></label><label>Timeframe<input name="timeframe" value="${esc(record.timeframe)}" placeholder="1H / 4H"></label><label>${lang('Mercado', 'Market')}<input name="market" value="${esc(record.market)}"></label><label>${lang('Resultado em R', 'Result in R')}<input name="resultR" inputmode="decimal" value="${esc(record.resultR)}" placeholder="Ex.: -1,2"></label><label>${lang('Print do trade', 'Trade screenshot')}<input name="tradeScreenshotFile" type="file" accept="image/*"><small>${record.tradeScreenshot?.name ? esc(record.tradeScreenshot.name) : lang('Ou usar print do Diário para esta data.', 'Or use a Journal screenshot from this date.')}</small></label><label>Print to Trade<input name="preTradeScreenshotFile" type="file" accept="image/*"><small>${record.preTradeScreenshot?.name ? esc(record.preTradeScreenshot.name) : lang('Análise anterior à execução, se disponível.', 'Pre-trade analysis, if available.')}</small></label><fieldset class="mb-form-types"><legend>${lang('Tipo do erro · selecione mais de um se necessário', 'Mistake type · select more than one if needed')}</legend>${M.TYPES.map(type => `<label><input type="checkbox" name="mistakeTypes" value="${esc(type)}" ${record.mistakeTypes?.includes(type) ? 'checked' : ''}><span>${esc(type)}</span></label>`).join('')}</fieldset><label class="wide">1. ${lang('Onde errei?', 'Where did I go wrong?')}<textarea name="whatWentWrong">${esc(record.whatWentWrong)}</textarea></label><label class="wide">3. ${lang('Por que fiz isso?', 'Why did I do it?')}<textarea name="whyIDidIt">${esc(record.whyIDidIt)}</textarea></label><label class="wide">4. ${lang('O que deveria ter feito?', 'What should I have done?')}<textarea name="whatShouldHaveDone">${esc(record.whatShouldHaveDone)}</textarea></label><label class="wide">5. ${lang('Lição aprendida', 'Lesson learned')}<textarea name="lessonLearned">${esc(record.lessonLearned)}</textarea></label><label class="wide">6. ${lang('Nova regra', 'New rule')}<textarea name="newRule">${esc(record.newRule)}</textarea></label><label class="wide">${lang('Estados emocionais · separados por vírgula', 'Emotional states · comma-separated')}<input name="emotionalTags" value="${esc((record.emotionalTags || []).join(', '))}"></label><label class="wide">${lang('Nota pessoal / observações', 'Personal note / observations')}<textarea name="notes">${esc(record.notes)}</textarea></label></div><div class="mb-form-foot"><span id="mbFormStatus" role="status"></span><button type="button" data-close>${lang('Cancelar', 'Cancel')}</button><button type="submit">${lang('Salvar no livro', 'Save in book')}</button></div></form></div>`;
    root.insertAdjacentHTML('beforeend', html);
    root.querySelector('.mb-form input[name=preTradeScreenshotFile]')?.closest('label')?.remove();
    const printInput = root.querySelector('.mb-form input[name=tradeScreenshotFile]');
    const printStatus = printInput?.closest('label')?.querySelector('small');
    if (printStatus) { printStatus.dataset.printStatus = ''; printStatus.textContent = lang('Escolha uma imagem ou cole um print com Ctrl + V.', 'Choose an image or paste a screenshot with Ctrl + V.'); }
    state.modal = true; root.querySelector('.mb-form input[name=ticker]')?.focus();
  }
  function fillFromTrade(select) {
    const trade = tradeById(select.value); if (!trade) return;
    const form = select.form, field = name => form.elements.namedItem(name);
    field('ticker').value = trade.ticker || trade.asset || '';
    field('setup').value = trade.setup || trade.metadata?.setup || '';
    field('market').value = trade.market || '';
    field('timeframe').value = trade.timeframe || trade.metadata?.timeframe || '';
    const day = window.JournalV2Model?.closeDate(trade) || window.JournalV2Model?.entryDate(trade);
    if (day) field('date').value = day;
    const hasExit = (trade.events || []).some(item => item.type === 'close' || item.type === 'peeloff');
    const analysis = typeof analyticsTrade === 'function' && trade.status === 'closed' && hasExit ? analyticsTrade(trade) : null;
    if (analysis?.initialRisk > 0) field('resultR').value = analysis.r.toFixed(2);
    const journal = journalRecords().find(item => item.date === day);
    if (journal && !field('emotionalTags').value) field('emotionalTags').value = (journal.emotional?.states || []).join(', ');
    if (journal && !field('whyIDidIt').value) field('whyIDidIt').value = journal.emotional?.note || '';
  }
  async function uploadImage(file, recordId) {
    if (!file) return null;
    if (!file.type.startsWith('image/')) throw new Error(lang('Selecione uma imagem.', 'Select an image.'));
    if (!window.healthyTrendApi?.uploadFile) throw new Error(lang('Entre no workspace para guardar prints privados.', 'Sign in to save private screenshots.'));
    const response = await window.healthyTrendApi.uploadFile('/api/journal-attachments', file, { 'X-Journal-Record': recordId });
    return response.attachment;
  }
  async function saveForm(event) {
    event.preventDefault(); const form = event.target, status = form.querySelector('#mbFormStatus'), values = new FormData(form), old = data.records.find(item => item.id === state.editing);
    const id = old?.id || `mistake_${crypto.randomUUID()}`; const now = new Date().toISOString();
    const record = { ...old, id, tradeId: values.get('tradeId') || null, ticker: String(values.get('ticker') || '').trim().toUpperCase(), date: values.get('date'), setup: String(values.get('setup') || '').trim(), timeframe: String(values.get('timeframe') || '').trim(), market: String(values.get('market') || '').trim(), resultR: M.number(values.get('resultR')), mistakeTypes: values.getAll('mistakeTypes'), whatWentWrong: String(values.get('whatWentWrong') || '').trim(), whyIDidIt: String(values.get('whyIDidIt') || '').trim(), whatShouldHaveDone: String(values.get('whatShouldHaveDone') || '').trim(), lessonLearned: String(values.get('lessonLearned') || '').trim(), newRule: String(values.get('newRule') || '').trim(), emotionalTags: String(values.get('emotionalTags') || '').split(',').map(item => item.trim()).filter(Boolean), notes: String(values.get('notes') || '').trim(), annotations: old?.annotations || [], isMastered: old?.isMastered || false, masteredAt: old?.masteredAt || null, createdAt: old?.createdAt || now, updatedAt: now };
    if (!record.mistakeTypes.length) { status.textContent = lang('Selecione pelo menos um tipo de erro.', 'Select at least one mistake type.'); return; }
    try {
      status.textContent = lang('Salvando...', 'Saving...');
      record.tradeScreenshot = await uploadImage(values.get('tradeScreenshotFile'), id) || old?.tradeScreenshot || old?.preTradeScreenshot || null;
      record.preTradeScreenshot = await uploadImage(values.get('preTradeScreenshotFile'), id) || old?.preTradeScreenshot || null;
      const next = { ...data, records: old ? data.records.map(item => item.id === id ? record : item) : [record, ...data.records] };
      M.save(storage(), next); data = next; state.selected = id; state.filter = 'Todos'; state.query = ''; closeModal(); render(); window.showToast?.(lang('Lição salva no livro.', 'Lesson saved in the book.'));
    } catch (error) { status.textContent = error.message || lang('Não foi possível salvar.', 'Could not save.'); }
  }
  function closeModal() { root.querySelector('.mb-modal-backdrop')?.remove(); state.modal = false; }
  root.addEventListener('submit', event => { if (event.target.id === 'mbForm') saveForm(event); if (event.target.id === 'mbMarketLessonForm') saveMarketLesson(event).catch(error => window.showToast?.(error.message || lang('Não foi possível salvar os prints.', 'Could not save screenshots.'))); });
  root.addEventListener('paste', event => {
    const form = event.target.closest?.('.mb-form') || root.querySelector('.mb-form');
    if (!form) return;
    const images = clipboardImages(event.clipboardData); if (!images.length) return;
    const input = form.querySelector('input[name=screenshots], input[name=tradeScreenshotFile]'); if (!input) return;
    event.preventDefault(); setInputFiles(input, input.multiple ? images : [images[0]]);
  });
  root.addEventListener('change', event => {
    if (event.target.matches('[data-trade-choice]')) fillFromTrade(event.target);
    if (event.target.matches('[data-annotation-tool]')) {
      state.annotation = event.target.value;
      const layer = root.querySelector('.mb-annotation-layer');
      if (layer) layer.classList.toggle('mb-mode-zoom', state.annotation === 'zoom');
      const helper = root.querySelector('.mb-annotation-controls small');
      if (helper) {
        helper.textContent = state.annotation === 'zoom'
          ? lang('Clique no gráfico para dar zoom em tela cheia.', 'Click chart to zoom full screen.')
          : lang(`Clique no gráfico para marcar: ${state.annotation}.`, `Click on chart to mark: ${state.annotation}.`);
      }
    }
  });
  root.addEventListener('input', event => { if (event.target.matches('[data-search]')) { state.query = event.target.value; const pos = event.target.selectionStart; render(); const input = root.querySelector('[data-search]'); input.focus(); input.setSelectionRange(pos, pos); } });
  root.addEventListener('click', event => {
    if (event.target.classList.contains('mb-modal-backdrop')) { closeModal(); return; }
    if (event.target.classList.contains('mb-image-preview')) { closeImagePreview(); return; }
    if (event.target.closest('[data-close-image-preview]')) { closeImagePreview(); return; }
    if (event.target.closest('[data-chart-zoom]')) {
      const zoomBtn = event.target.closest('[data-chart-zoom]');
      const chart = zoomBtn.closest('.mb-chart') || root.querySelector('.mb-chart');
      const img = chart?.querySelector('img[data-attachment]');
      if (img) openImagePreview(img);
      return;
    }
    const layer = event.target.closest('[data-chart-annotate]');
    if (layer) {
      if (state.annotation === 'zoom') {
        const img = layer.closest('.mb-chart')?.querySelector('img[data-attachment]');
        if (img) openImagePreview(img);
        return;
      }
      const record = data.records.find(item => item.id === layer.dataset.chartAnnotate), box = layer.getBoundingClientRect();
      if (!record) return;
      record.annotations ||= [];
      record.annotations.push({
        x: Math.round((event.clientX - box.left) / box.width * 1000) / 10,
        y: Math.round((event.clientY - box.top) / box.height * 1000) / 10,
        label: state.annotation
      });
      record.updatedAt = new Date().toISOString();
      try { persist(); render(); } catch (error) { window.showToast?.(error.message); }
      return;
    }
    const marketImg = event.target.closest('.mb-market-lesson-images img');
    if (marketImg) {
      openImagePreview(marketImg);
      return;
    }
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-close')) { closeModal(); return; }
    if (button.hasAttribute('data-new')) { openModal(); return; }
    if (button.hasAttribute('data-market-lessons')) { state.section = 'marketLessons'; render(); return; }
    if (button.hasAttribute('data-records')) { state.section = 'records'; render(); return; }
    if (button.hasAttribute('data-new-market-lesson')) { openMarketLessonModal(); return; }
    if (button.dataset.deleteMarketLesson) { const next = { ...data, marketLessons: (data.marketLessons || []).filter(item => item.id !== button.dataset.deleteMarketLesson) }; M.save(storage(), next); data = next; render(); return; }
    if (button.hasAttribute('data-clear-filters')) { state.filter = 'Todos'; state.query = ''; state.selected = null; render(); return; }
    if (button.dataset.edit) { openModal(button.dataset.edit); return; }
    if (button.dataset.select) { state.selected = button.dataset.select; render(); return; }
    if (button.dataset.filter) { state.filter = button.dataset.filter; state.selected = null; render(); return; }
    if (button.dataset.related) { state.filter = 'Todos'; state.query = button.dataset.related; state.selected = null; render(); return; }
    if (button.dataset.undoAnnotation) { const record = data.records.find(item => item.id === button.dataset.undoAnnotation); record.annotations?.pop(); record.updatedAt = new Date().toISOString(); try { persist(); render(); } catch (error) { window.showToast?.(error.message); } return; }
    if (button.dataset.move) { navigateRecord(Number(button.dataset.move)); return; }
    if (button.dataset.master) { const record = data.records.find(item => item.id === button.dataset.master); record.isMastered = !record.isMastered; record.masteredAt = record.isMastered ? new Date().toISOString() : null; record.updatedAt = new Date().toISOString(); try { persist(); render(); } catch (error) { window.showToast?.(error.message); } }
  });
  masteredRoot.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; if (button.dataset.openMistake) state.selected = button.dataset.openMistake; window.go?.('mistakesbook'); render(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (root.querySelector('.mb-image-preview')) { closeImagePreview(); return; }
      if (state.modal) { closeModal(); return; }
    }
    if (!root.classList.contains('active')) return;
    if (state.modal || root.querySelector('.mb-modal-backdrop') || root.querySelector('.mb-image-preview')) return;
    const target = event.target;
    if (target) {
      const tag = target.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigateRecord(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigateRecord(1);
    }
  });
  const previousGo = window.go; window.go = function (id) { previousGo(id); if (id === 'masteredlessons') document.querySelectorAll('.nav button[data-page="mistakesbook"],#topNavigationMenu button[data-page="mistakesbook"]').forEach(button => button.classList.add('active')); if (id === 'mistakesbook' || id === 'masteredlessons') render(); };
  window.addEventListener('healthyTrend:workspaceLoaded', () => { reload(); render(); });
  window.addEventListener('healthyTrend:tradesUpdated', () => { if (root.classList.contains('active')) render(); });
  reload(); render();
}());

(function () {
  'use strict';
  const M = window.JournalV2Model;
  const root = document.getElementById('journal');
  if (!root || !M) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const text = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const locale = () => window.appLanguage === 'en-US' ? 'en-US' : 'pt-BR';
  const emotions = ['Paciente', 'Disciplinado', 'Calmo', 'Ansioso', 'Confiante', 'Frustrado', 'Impulsivo', 'Raiva / Irritado', 'Medroso', 'Ganancioso'];
  const checks = ['Trades somente no Diário + 4H', 'Somente setup A+', 'Entrada na contração do 4H', 'Não comprei expansão', 'Position sizing correto', 'Volatilidade considerada', 'Regras não foram alteradas'];
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
  function evidenceStrip() {
    const items = current().evidence.slice(0, 3);
    return `<div class="jv-evidence-strip">${items.map(item => `<button type="button" class="jv-evidence-thumb" data-evidence-id="${esc(item.id)}" title="${esc(item.name)}" aria-label="${text('Abrir', 'Open')} ${esc(item.name)}">${item.type.startsWith('image/') ? `<img data-evidence-thumb="${esc(item.id)}" alt="${esc(item.name)}">` : `<span>${item.type.startsWith('audio/') ? '♫' : '📎'}</span>`}<small>${esc(item.name)}</small></button>`).join('')}${current().evidence.length > 3 ? `<div class="jv-evidence-more">+${current().evidence.length - 3}</div>` : ''}<button type="button" class="jv-evidence-add" data-action="evidence" aria-label="${text('Adicionar evidências', 'Add evidence')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 6-6a3 3 0 1 1 4 4l-8 8a5 5 0 0 1-7-7l8-8"/></svg><small>${text('Adicionar', 'Add')}</small></button></div>`;
  }
  function patternsSection(e) {
    return `<section class="jv-patterns"><header><span class="jv-title-icon">${icons.patterns}</span><div><h3>${text('Padrões e soluções', 'Patterns and solutions')}</h3><p>${text('(observações adicionais)', '(additional observations)')}</p></div></header>${field('shared.patterns', text('O que está se repetindo e como você quer responder?', 'What is repeating and how do you want to respond?'), e.shared.patterns, text('Registre o padrão que percebeu e a solução que pretende aplicar.', 'Record the pattern you noticed and the solution you intend to apply.'), 4)}</section>`;
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
      <div class="jv-layout"><aside class="jv-history"><h2>${text('Meu Caderno', 'My Notebook')}</h2><label class="jv-sr" for="jv-month">${text('Mês do histórico', 'History month')}</label><select id="jv-month">${months.map(value => `<option value="${value}" ${value === month ? 'selected' : ''}>${value ? dateLabel(`${value}-01`, { month: 'long', year: 'numeric' }) : text('Datas a revisar', 'Dates to review')}</option>`).join('')}</select><small>${visible.length} ${text(visible.length === 1 ? 'dia registrado' : 'dias registrados', visible.length === 1 ? 'recorded day' : 'recorded days')}</small><nav aria-label="${text('Histórico do diário', 'Journal history')}">${visible.map(item => `<button type="button" data-day="${esc(item.id)}" ${item.id === selected ? 'aria-current="date"' : ''}><time>${item.date ? dateLabel(item.date, { day: '2-digit', month: 'short' }) : '—'}</time><span>${esc(item.date === M.today() ? text('Hoje', 'Today') : item.title || item.emotional.states[0] || text('Registro', 'Entry'))}</span></button>`).join('')}</nav><button type="button" class="jv-new" data-action="today">＋ ${text('Registro de hoje', 'Today’s entry')}</button><p>${text('Um dia. Duas perspectivas.<br>Um só aprendizado.', 'One day. Two perspectives.<br>One shared lesson.')}</p></aside>
      <main class="jv-notebook"><header class="jv-book-header"><div><span class="jv-kicker">${text('Seu Caderno de Processo', 'Your Process Notebook')}</span><h2>${dateLabel(e.date)}</h2></div><div class="jv-date-nav"><button type="button" data-action="previous" aria-label="${text('Registro anterior', 'Previous entry')}">‹</button><label><span class="jv-sr">${text('Abrir registro de uma data', 'Open a date')}</span><input id="jv-date" type="date" value="${e.date || ''}"></label><button type="button" data-action="next" aria-label="${text('Próximo registro', 'Next entry')}">›</button></div></header>
      <div class="jv-tabs" role="tablist" aria-label="${text('Página do caderno', 'Notebook page')}"><button type="button" id="jv-tab-technical" role="tab" aria-controls="jv-technical" aria-selected="${pane === 'technical'}" tabindex="${pane === 'technical' ? 0 : -1}" data-pane="technical">▥ ${text('Técnico', 'Technical')}</button><button type="button" id="jv-tab-emotional" role="tab" aria-controls="jv-emotional" aria-selected="${pane === 'emotional'}" tabindex="${pane === 'emotional' ? 0 : -1}" data-pane="emotional">◉ ${text('Emocional', 'Emotional')}</button></div>
      <div class="jv-spread" data-focus="${pane}">
        <section id="jv-technical" class="jv-sheet jv-technical ${pane === 'technical' ? 'is-focused' : ''}" aria-labelledby="jv-tech-title"><header><i class="jv-title-icon">${icons.technical}</i><div><h3 id="jv-tech-title">${text('Diário Técnico', 'Technical Journal')}</h3><p>${text('Como eu executei hoje?', 'How did I execute today?')}</p></div></header>
          <div class="jv-fields"><fieldset><legend>1. ${text('Contexto do mercado', 'Market context')}</legend><span class="jv-hint">${text('Permissão do mercado', 'Market permission')}</span>${options('technical.marketState', [['down', 'Down'], ['transition', text('Transição', 'Transition')], ['up', text('Saudável', 'Healthy')]], tech.marketState)}</fieldset>
          ${field('technical.session', `2. ${text('O que eu observei hoje?', 'What did I observe today?')}`, tech.session, text('Contexto, decisões e execução. O que merece ficar registrado?', 'Context, decisions and execution. What is worth recording?'), 5)}
          <fieldset><legend>3. ${text('Execução', 'Execution')}</legend><div class="jv-execution"><div class="jv-execution-card"><span class="jv-execution-label">${text('Qualidade da execução', 'Execution quality')}</span><strong><output id="jv-execution-score">${tech.executionScore ?? '—'}</output> <small>/ 10</small></strong><input class="jv-score-slider" type="range" min="0" max="10" step="0.1" data-field="technical.executionScore" value="${tech.executionScore ?? 0}" aria-label="${text('Qualidade da execução', 'Execution quality')}"></div><div class="jv-execution-card"><span class="jv-execution-label">${text('Plano', 'Plan')}</span><div class="jv-plan-options" role="group" aria-label="${text('Plano respeitado', 'Plan followed')}">${[['yes', '✓', text('Respeitado', 'Followed')], ['partial', '–', text('Parcialmente', 'Partially')], ['no', '×', text('Não respeitado', 'Not followed')]].map(([value, icon, label]) => `<button type="button" class="jv-plan-option ${tech.planRespected === value ? 'chosen' : ''}" data-set="technical.planRespected" data-value="${value}" aria-pressed="${tech.planRespected === value}"><i aria-hidden="true">${icon}</i><span>${label}</span></button>`).join('')}</div></div></div></fieldset>
          ${linkedTradeSummary()}
          <fieldset><legend>4. ${text('Evidências da sessão', 'Session evidence')}</legend><span class="jv-hint">${text('Anexos, prints, áudios e materiais complementares.', 'Attachments, screenshots, audio and supporting material.')}</span>${evidenceStrip()}${legacyLabels.length ? `<small class="jv-hint">${text('Referências antigas preservadas nos detalhes.', 'Legacy references preserved in details.')}</small>` : ''}</fieldset>
          <details class="jv-extra"><summary>${text('Checklist e permissão operacional', 'Checklist and trading permission')}</summary><label class="jv-field">${text('O mercado merece meu dinheiro hoje?', 'Does the market deserve my money today?')}<select data-field="technical.permissionMoney"><option value="">${text('Não informado', 'Not recorded')}</option><option value="wait" ${tech.permissionMoney === 'wait' ? 'selected' : ''}>${text('Não — meu trabalho é esperar', 'No — my job is to wait')}</option><option value="a-plus" ${tech.permissionMoney === 'a-plus' ? 'selected' : ''}>${text('Sim — somente cenário A+', 'Yes — A+ conditions only')}</option></select></label>${checks.map((label, i) => `<label class="jv-check"><input type="checkbox" data-check="${i}" ${tech.checklist?.[i] ? 'checked' : ''}>${label}</label>`).join('')}</details></div>
          <div class="jv-page-preview"><span class="jv-page-number">01 / ${text('Leitura do processo', 'Process reading')}</span><p>${esc(tech.session || text('O que aconteceu no mercado e como você executou?', 'What happened in the market and how did you execute?'))}</p><div>${text('Execução', 'Execution')}: <b>${tech.executionScore ?? '—'} / 10</b></div><div>${text('Plano', 'Plan')}: <b>${tech.planRespected === 'yes' ? text('Respeitado', 'Followed') : tech.planRespected === 'no' ? text('Não respeitado', 'Not followed') : tech.planRespected === 'partial' ? text('Parcialmente', 'Partially') : '—'}</b></div><button type="button" data-pane="technical">${text('Escrever na página técnica', 'Write on the technical page')} →</button></div>
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
      <footer class="jv-lessons"><div class="jv-lesson-title"><span class="jv-title-icon">${icons.lessons}</span><div><h3>${text('Lições do dia', 'Lessons of the day')}</h3><p>${text('Mercado + execução + emoção → aprendizado', 'Market + execution + emotion → learning')}</p></div></div><div class="jv-lesson-write">${field('shared.lesson', text('O que vou levar para amanhã?', 'What will I take into tomorrow?'), e.shared.lesson, text('Uma lição que conecta o que você fez e como se sentiu.', 'One lesson connecting what you did and how you felt.'), 3)}<button class="jv-save" type="button" data-action="save">✓ ${text('Salvar registro', 'Save entry')}</button></div><p id="jv-save-status" role="status" class="${saveError ? 'is-error' : ''}">${esc(saveError || (e.updatedAt ? text('Registro salvo na sua conta.', 'Entry saved in your account.') : text('Escreva no seu ritmo. As alterações são salvas na sua conta.', 'Write at your own pace.')))}</p>
      </footer>
      </main></div><dialog id="jv-dialog" aria-labelledby="jv-dialog-title"><header><h2 id="jv-dialog-title"></h2><button type="button" data-action="close-dialog" aria-label="${text('Fechar', 'Close')}">×</button></header><div id="jv-dialog-body"></div></dialog>
    </div>`;
    hydrateEvidenceStrip();
  }
  function setValue(path, value) {
    const allowed = ['title', 'technical.marketState', 'technical.session', 'technical.executionScore', 'technical.planRespected', 'technical.permissionMoney', 'emotional.intensity', 'emotional.note', 'emotional.impact', 'emotional.impactNote', 'shared.lesson', 'shared.patterns', 'shared.observations', 'shared.phrase'];
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
    dialog(esc(item.name), `<p>${text('Carregando evidência…', 'Loading evidence…')}</p>`);
    root.querySelector('#jv-dialog').classList.add('jv-evidence-dialog');
    try {
      const blob = await evidenceBlob(item);
      const url = URL.createObjectURL(blob); evidenceUrls.push(url);
      const body = root.querySelector('#jv-dialog-body');
      if (!body) return;
      body.innerHTML = item.type.startsWith('image/') && item.type !== 'image/svg+xml'
        ? `<img class="jv-evidence-preview" src="${url}" alt="${esc(item.name)}">`
        : item.type.startsWith('audio/')
          ? `<audio class="jv-evidence-audio" controls autoplay src="${url}"></audio>`
          : `<a href="${url}" download="${esc(item.name)}">${text('Baixar arquivo', 'Download file')}</a>`;
    } catch (_) { const body = root.querySelector('#jv-dialog-body'); if (body) body.textContent = text('Não foi possível abrir este arquivo salvo na sua conta.', 'This file could not be opened from your account.'); }
  }
  async function showEvidence() {
    clearEvidenceUrls();
    const e = current(), labels = e.legacyEntries.flatMap(item => Array.isArray(item.attachments) ? item.attachments : []);
    dialog(text('Evidências da sessão', 'Session evidence'), `<label class="jv-upload">＋ ${text('Adicionar prints, áudio ou arquivos', 'Add screenshots, audio or files')}<input id="jv-files" type="file" multiple></label><p>${text('Até 20 MB por arquivo. Guardados de forma privada na sua conta.', 'Up to 20 MB per file. Stored privately in your account.')}</p><p id="jv-upload-status" role="status"></p><div id="jv-evidence-list"></div>${labels.length ? `<details><summary>${text('Referências do registro antigo', 'Legacy entry references')}</summary><p>${labels.map(esc).join(' · ')}</p><p>${text('O diário antigo guardava esses rótulos, mas não os arquivos. Nenhum arquivo foi reconstruído.', 'The old journal stored these labels, but not the files. No file was reconstructed.')}</p></details>` : ''}`);
    for (const item of e.evidence) {
      const host = root.querySelector('#jv-evidence-list'); if (!host) return;
      const row = document.createElement('article'); row.className = 'jv-file';
      row.innerHTML = `<b>${esc(item.name)}</b>`; host.append(row);
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
    const e = current(), input = root.querySelector('#jv-files'); if (input) input.disabled = true;
    let uploaded = 0;
    try {
      for (const file of files) {
        if (file.size > 20 * 1024 * 1024) throw new Error(text('Um arquivo ultrapassa o limite de 20 MB.', 'A file exceeds the 20 MB limit.'));
        if (!window.healthyTrendApi?.uploadFile) throw new Error(text('Entre novamente antes de enviar um arquivo.', 'Sign in again before uploading a file.'));
        const result = await window.healthyTrendApi.uploadFile('/api/journal-attachments', file, { 'X-Journal-Record': e.id });
        e.evidence.push(result.attachment);
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
  root.addEventListener('keydown', event => {
    if (event.target.getAttribute('role') === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); pane = event.key === 'Home' ? 'technical' : event.key === 'End' ? 'emotional' : pane === 'technical' ? 'emotional' : 'technical'; render(true); root.querySelector(`#jv-tab-${pane}`).focus();
    }
  });
  root.addEventListener('close', event => {
    if (event.target.id === 'jv-dialog') {
      event.target.querySelectorAll('audio').forEach(audio => audio.pause());
      clearEvidenceUrls();
      render(true);
    }
  }, true);
  root.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.evidenceId) { openEvidence(button.dataset.evidenceId); return; }
    if (button.dataset.removeEvidence) { removeEvidence(button.dataset.removeEvidence); return; }
    if (button.dataset.positionId) { window.openPositionFromJournal?.(button.dataset.positionId); return; }
    if (button.dataset.day) { if (saveError && !persist()) return; selected = button.dataset.day; render(true); return; }
    if (button.dataset.pane) { pane = button.dataset.pane; render(true); root.querySelector(`#jv-tab-${pane}`).focus({ preventScroll: true }); return; }
    if (button.dataset.set) { const path = button.dataset.set; setValue(path, path === 'emotional.intensity' ? Number(button.dataset.value) : button.dataset.value); const fieldset = button.closest('fieldset'); fieldset.querySelectorAll('[data-set]').forEach(b => { const chosen = b === button; b.setAttribute('aria-pressed', chosen); b.classList.toggle('chosen', chosen); }); if (path === 'emotional.impact') root.querySelector('#jv-impact-explanation').hidden = button.dataset.value === 'no' && !current().emotional.impactNote; return; }
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
      case 'close-dialog': root.querySelector('#jv-dialog').close(); clearEvidenceUrls(); break;
    }
  });
  window.renderJournalBook = render;
  window.openJournalEditor = () => { go('journal'); openDay(M.today()); };
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

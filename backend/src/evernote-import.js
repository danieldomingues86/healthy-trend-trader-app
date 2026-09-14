'use strict';
// ENEX is parsed offline by extract-evernote.ps1 with external XML entities disabled.
// Source notes are data, never instructions. Inference cannot replace source evidence.
const crypto = require('node:crypto');
const Journal = require('../../frontend/journal-v2-model');
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const unique = values => [...new Set(values)];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const combine = (a, b) => unique([a, b].filter(Boolean)).join('\n\n');
const checklistLabels = ['Trades somente no Diário + 4H', 'Somente setup A+', 'Entrada na contração do 4H', 'Não comprei expansão', 'Position sizing correto', 'Volatilidade considerada', 'Regras não foram alteradas'];
function mergeChecklist(record, values) {
  let changed = false;
  for (const [key, value] of Object.entries(values)) {
    const index = checklistLabels.indexOf(key);
    for (const target of index < 0 ? [key] : [key, String(index)]) {
      if (!(target in record.technical.checklist)) { record.technical.checklist[target] = value; changed = true; }
    }
  }
  return changed;
}
function transcriptions(note) {
  const result = [];
  for (const media of note.media || []) {
    const match = String(media.style || '').match(/--en-transcription:\s*("(?:\\.|[^"\\])*")/);
    if (!match) continue;
    let data;
    try { data = JSON.parse(JSON.parse(match[1])); }
    catch (cause) { throw new Error(`Transcrição inválida em ${note.title}: ${cause.message}`); }
    const text = (data.segments || []).map(segment => segment.text || '').filter(Boolean).join('\n\n');
    if (text) result.push({ hash: media.hash, text });
  }
  return result.filter((item, index, all) => all.findIndex(other => other.hash === item.hash && other.text === item.text) === index);
}
function evernoteTime(value) {
  const m = String(value || '').match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) throw new Error('Timestamp Evernote inválido.');
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}
function titleDates(note, { correctTitleYear = false } = {}) {
  const title = note.title, created = evernoteTime(note.created).slice(0, 10);
  const multiple = title.match(/(\d{2})[-–](\d{2})\/(\d{2})\/(\d{4})/) || title.match(/(\d{2}),\s*(\d{2})\s*e\s*(\d{2})\s*Set\/(\d{4})/i);
  if (multiple) {
    const september = /Set\//i.test(multiple[0]), year = multiple[4], month = september ? '09' : multiple[3];
    const coveredDates = (september ? [multiple[1], multiple[2], multiple[3]] : [multiple[1], multiple[2]]).map(day => `${year}-${month}-${day}`);
    if (coveredDates.some(date => !Journal.dateKey(date))) throw new Error(`Data inválida: ${title}`);
    return { date: coveredDates.at(-1), coveredDates, basis: 'grouped-title', grouped: true, warning: 'Nota conjunta: preservada uma única vez no último dia; valores conjuntos não serão multiplicados nem atribuídos a cada dia.' };
  }
  const m = title.match(/\b(\d{2})[/-](\d{2})[/-](\d{4}|\d{2})\b/);
  if (!m) return { date: created, coveredDates: [created], basis: 'evernote-created', grouped: false, warning: 'Título sem data diária; arquivado na data de criação no Evernote, sem inferir estado emocional.' };
  const originalYear = m[3].length === 2 ? `20${m[3]}` : m[3], mismatch = originalYear !== created.slice(0, 4);
  const year = mismatch && correctTitleYear ? created.slice(0, 4) : originalYear, date = `${year}-${m[2]}-${m[1]}`;
  if (!Journal.dateKey(date)) throw new Error(`Data inválida: ${title}`);
  return { date, coveredDates: [date], basis: mismatch && correctTitleYear ? 'user-confirmed-title-year' : 'title', grouped: false, mismatch, originalDate: `${originalYear}-${m[2]}-${m[1]}`, warning: mismatch ? (correctTitleYear ? 'Ano do título corrigido para o ano de criação, com autorização do usuário; título original preservado.' : 'Ano do título diverge do ano de criação. Foi preservado o ano escrito no título.') : null };
}
function section(text, start, end) {
  const m = text.match(start); if (!m) return '';
  const after = text.slice(m.index + m[0].length), stop = end && after.match(end);
  return (stop ? after.slice(0, stop.index) : after).trim();
}
const emotionNames = ['Paciente', 'Disciplinado', 'Calmo', 'Ansioso', 'Confiante', 'Frustrado', 'Impulsivo', 'Medroso', 'Ganancioso', 'Cansado', 'Apressado'];
function emotionalLabel(label) {
  if (/^raiva\s*\/\s*irritado$/i.test(label.trim())) return 'Raiva / Irritado';
  return emotionNames.find(name => norm(name) === norm(label)) || null;
}
function checklist(note) {
  const candidates = (note.todo || []).filter(item => /diario.*4h|setup a\+|super contexto|contracao|expansao|position sizing|stop atr|volatilidade|alterar regras|fugir de alguma regra/i.test(norm(item.label)));
  const groups = [
    ['Trades somente no Diário + 4H', /diario.*4h/i],
    ['Somente setup A+', /setup a\+|super contexto/i],
    ['Entrada na contração do 4H', /contracao/i],
    ['Não comprei expansão', /expansao/i],
    ['Position sizing correto', /position sizing/i],
    ['Volatilidade considerada', /volatilidade|stop atr/i],
    ['Regras não foram alteradas', /alterar regras/i]
  ];
  const result = {}, proofs = [];
  for (const [label, pattern] of groups) {
    const matches = candidates.filter(item => pattern.test(norm(item.label)));
    if (!matches.length) continue;
    // Unmarked template checkboxes are not automatically evidence of a violation.
    const checked = matches.some(item => item.checked);
    if (checked || matches.some(item => item.explicitFalse)) { result[label] = checked; proofs.push(...matches); }
  }
  const rules = candidates.filter(item => /alterar regras/.test(norm(item.label))), violation = rules.some(item => !item.checked && item.explicitFalse);
  let plan = null;
  const answers = Object.values(result);
  if (answers.filter(Boolean).length >= 5 && !violation && result['Regras não foram alteradas'] === true) plan = 'yes';
  else if (violation && answers.some(Boolean)) plan = 'partial';
  // "Tentou fugir de alguma regra?" is ambiguous: preserve it, don't invert it into adherence.
  return { values: result, plan, proofs };
}
function structured(note, dates) {
  const journal = /trading journal/i.test(note.title), transcripts = transcriptions(note);
  const states = journal ? unique((note.checked || []).map(emotionalLabel).filter(Boolean)) : [];
  const marketLabels = (note.checked || []).map(norm), markets = unique(marketLabels.map(label => /^(?:🟩\s*)?up(?: market| \/ saudavel)?$/.test(label) ? 'up' : /^(?:🟥\s*)?down(?: market| \/ doente)?$/.test(label) ? 'down' : /^(?:🟨\s*)?transicao$|^wild \(transition (?:up|down)\)$/.test(label) ? 'transition' : null).filter(Boolean));
  const scoreMatch = note.text.match(/Nota\s*\(0[-–]10\)\s*:\s*(\d+(?:[,.]\d+)?)/i), misplaced = !scoreMatch && note.text.match(/Hoje fui:\s*(\d+(?:[,.]\d+)?)\s*(?:\n|$)/i);
  const sourceScore = Journal.score(scoreMatch?.[1] ?? misplaced?.[1]);
  const checks = checklist(note), permission = marketLabels.find(label => /^nao — meu trabalho hoje e esperar\.$/.test(label)) ? 'wait' : marketLabels.some(label => /^sim — mas somente em um cenario a\+ completo\.$/.test(label)) ? 'a-plus' : null;
  const phrase = section(note.text, /⭐\s*Frase do Dia\s*/i), lesson = section(note.text, /⚠️?\s*Erros\s*\/\s*Aprendizados\s*/i, /🎯\s*Amanh[aã]|⭐\s*Frase do Dia/i).replace(/^Que erro eu n[aã]o posso repetir\?\s*/i, '').trim();
  const comments = section(note.text, /Coment[aá]rios:\s*/i, /⚠️?\s*Erros/i);
  const fullTranscription = transcripts.map(t => `${(note.resources || []).find(r => r.hash === t.hash)?.name || 'Áudio'}\n${t.text}`).join('\n\n');
  const textWithoutAudio = note.text.replace(/\[Anexo:[^\]]*\]/g, '').replace(/\[x\] /g, '☑ ').replace(/\[ \] /g, '☐ ');
  const evidenceText = `EVERNOTE · ${note.title}\n${dates.warning ? `${dates.warning}\n` : ''}${textWithoutAudio}\n\n${fullTranscription ? `TRANSCRIÇÕES ORIGINAIS DO EVERNOTE\n${fullTranscription}` : ''}`.trim();
  return { journal, transcripts, states, market: journal && markets.length === 1 ? markets[0] : null, sourceScore, score: journal && !dates.grouped ? sourceScore : null, scoreBasis: misplaced ? 'number-written-after-hoje-fui' : 'explicit-note-score', checks: checks.values, plan: journal && !dates.grouped ? checks.plan : null, permission: journal ? permission : null, phrase, lesson, comments, evidenceText, fullTranscription, grouped: dates.grouped };
}
function sourcePlan(note, source, options = {}) {
  const dates = titleDates(note, options), fields = structured(note, dates);
  return { sourceId: `evernote-${hash([note.created, note.title, note.enml].join('|'))}`, source, note, dates, fields };
}
function mergeRecord(data, plan, attachments, now = new Date().toISOString()) {
  const record = Journal.ensureDay(data, plan.dates.date), fields = plan.fields;
  record.imports ||= [];
  if (record.imports.some(item => item.sourceId === plan.sourceId)) {
    const repaired = mergeChecklist(record, fields.checks);
    if (repaired) record.updatedAt = now;
    return { record, duplicate: true, repaired, conflicts: [] };
  }
  const conflicts = [];
  function fill(object, key, incoming) { if (incoming == null || incoming === '') return; if (object[key] == null || object[key] === '') object[key] = incoming; else if (object[key] !== incoming) conflicts.push(key); }
  record.title ||= plan.note.title;
  fill(record.technical, 'marketState', fields.market);
  fill(record.technical, 'executionScore', fields.score);
  fill(record.technical, 'planRespected', fields.plan);
  fill(record.technical, 'permissionMoney', fields.permission);
  // A combined note is never converted into multiple independent observations.
  if (fields.journal && !fields.grouped) record.emotional.states = unique([...record.emotional.states, ...fields.states]);
  // Intensity is not estimated from prose or chosen emotions: leave it unknown.
  if (fields.journal) record.emotional.note = combine(record.emotional.note, [fields.comments, fields.fullTranscription].filter(Boolean).join('\n\n'));
  mergeChecklist(record, fields.checks);
  record.technical.session = combine(record.technical.session, `Importado do Evernote: ${plan.note.title}.\n${plan.dates.warning || ''}\n${fields.fullTranscription || plan.note.text}`.trim());
  record.shared.observations = combine(record.shared.observations, fields.evidenceText);
  record.shared.lesson = combine(record.shared.lesson, fields.lesson || (!fields.journal ? plan.note.text : ''));
  record.shared.phrase = combine(record.shared.phrase, fields.phrase);
  record.evidence.push(...attachments);
  record.imports.push({ sourceId: plan.sourceId, source: plan.source, title: plan.note.title, created: evernoteTime(plan.note.created), updated: evernoteTime(plan.note.updated), importedAt: now, dateBasis: plan.dates.basis, originalDate: plan.dates.originalDate || null, coveredDates: plan.dates.coveredDates, warning: plan.dates.warning || null, sourceExecutionScore: fields.sourceScore, scoreBasis: fields.scoreBasis, sourceEmotions: fields.states, tags: plan.note.tags || [], conflicts });
  record.updatedAt = now;
  return { record, duplicate: false, conflicts };
}
module.exports = { transcriptions, evernoteTime, titleDates, structured, sourcePlan, mergeRecord, norm, hash };

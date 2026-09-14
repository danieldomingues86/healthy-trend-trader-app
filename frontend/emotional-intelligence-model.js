(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.EmotionalIntelligenceModel = model;
}(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const DAY = 86400000;
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const hourFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' });
  const number = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const mean = values => { const valid = values.map(number).filter(v => v !== null); return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null; };
  const key = value => { if (!value || !Number.isFinite(new Date(value).getTime())) return null; if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value ? value : null; return dateFormatter.format(new Date(value)); };
  const stamp = date => new Date(`${date}T12:00:00Z`).getTime();
  const date = time => new Date(time).toISOString().slice(0, 10);
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  function correlation(rows, x, y) {
    const pairs = rows.filter(row => number(x(row)) !== null && number(y(row)) !== null);
    if (pairs.length < 7) return { value: null, count: pairs.length };
    const mx = mean(pairs.map(x)), my = mean(pairs.map(y));
    const cross = pairs.reduce((sum, row) => sum + (x(row) - mx) * (y(row) - my), 0);
    const vx = pairs.reduce((sum, row) => sum + (x(row) - mx) ** 2, 0), vy = pairs.reduce((sum, row) => sum + (y(row) - my) ** 2, 0);
    return { value: vx && vy ? cross / Math.sqrt(vx * vy) : null, count: pairs.length };
  }
  function tradeData(trades) {
    const unique = new Map();
    trades.forEach(trade => { const id = trade.id || trade.databaseId; if (id && trade.status !== 'planned' && !unique.has(id)) unique.set(id, trade); });
    return [...unique.values()].map(trade => {
      const events = Array.isArray(trade.events) ? trade.events : [], entryEvent = events.find(e => e.type === 'entry'), close = [...events].reverse().find(e => e.type === 'close');
      const openedAt = trade.executed_at || trade.entryDate || trade.metadata?.entryDate || trade.openedAt || entryEvent?.at;
      const closedAt = trade.closed_at || trade.closedAt || close?.at;
      const entry = number(entryEvent?.price ?? trade.execution_price ?? trade.entry_price ?? trade.entry);
      const qty = number(entryEvent?.qty ?? trade.executed_quantity ?? trade.initialQty);
      const initialStop = number(entryEvent?.stop ?? trade.initialStop ?? trade.metadata?.initialStop);
      const risk = number(trade.initialRisk) ?? (entry !== null && initialStop !== null && qty !== null ? Math.abs(entry - initialStop) * qty : null);
      const exits = events.filter(e => ['close', 'peeloff'].includes(e.type));
      const validExits = exits.length && exits.every(e => number(e.price) !== null && number(e.qty) !== null);
      const money = entry !== null && validExits ? exits.reduce((sum, e) => sum + (Number(e.price) - entry) * (trade.direction === 'short' ? -1 : 1) * Number(e.qty), 0) : null;
      const explicit = number(trade.resultR ?? trade.rMultiple ?? trade.rubric_responses?.resultR ?? trade.metadata?.resultR);
      const resultR = closedAt ? explicit ?? (risk > 0 && money !== null ? money / risk : null) : null;
      return { id: trade.id || trade.databaseId, asset: trade.ticker || trade.asset || '', setup: trade.setup || null, mode: trade.mode || trade.metadata?.mode || 'real', openedAt, closedAt, openedDate: key(openedAt), closedDate: key(closedAt), resultR, money, events };
    });
  }
  function buildDays(records, sessions, trades, now = new Date(), activity = []) {
    const days = new Map(), normalizedTrades = tradeData(trades);
    function get(day) { if (!day) return null; if (!days.has(day)) days.set(day, { date: day, recordId: null, states: [], intensity: null, execution: null, adherence: null, market: null, note: '', observations: '', access: null, sessions: [], trades: [], entries: [], results: [], resultR: null }); return days.get(day); }
    records.forEach(record => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date || '') || !Number.isFinite(stamp(record.date))) return;
      const day = get(record.date), emotional = record.emotional || {}, technical = record.technical || {};
      const intensity = number(emotional.intensity), execution = number(technical.executionScore);
      Object.assign(day, { recordId: record.id, states: emotional.states || [], intensity: intensity >= 1 && intensity <= 5 ? intensity : null, execution: execution >= 0 && execution <= 10 ? execution : null, adherence: ['yes', 'partial', 'no'].includes(technical.planRespected) ? (technical.planRespected === 'yes' ? 1 : 0) : null, plan: technical.planRespected, market: technical.marketState || null, note: emotional.note || '', observations: [technical.session, record.shared?.patterns, record.shared?.observations].filter(Boolean).join('\n'), linkedTradeIds: technical.tradeIds || [] });
    });
    const validSessions = sessions.filter(session => key(session.openedAt)).sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt));
    const accessStart = validSessions.length ? key(validSessions[0].openedAt) : null;
    validSessions.forEach(session => get(key(session.openedAt)).sessions.push(session));
    normalizedTrades.forEach(trade => {
      const opened = get(trade.openedDate); if (opened) { opened.entries.push(trade); opened.trades.push(trade); }
      const closed = get(trade.closedDate); if (closed) { if (!closed.trades.some(t => t.id === trade.id)) closed.trades.push(trade); if (trade.resultR !== null) closed.results.push(trade.resultR); }
    });
    const today = key(now);
    activity.forEach(item => { const day = get(key(item.date)); if (!day) return; day.areas = item.areas || {}; day.views = number(item.views); day.monitoring = ['positions', 'positiondetail', 'relativestrength', 'marketscans', 'marketmap'].reduce((sum, id) => sum + (number(day.areas[id]) || 0), 0); });
    days.forEach(day => { if (accessStart && day.date >= accessStart) day.access = day.sessions.length; day.resultR = day.results.length ? day.results.reduce((a, b) => a + b, 0) : null; });
    return { days: [...days.values()].filter(day => day.date <= today).sort((a, b) => a.date.localeCompare(b.date)), trades: normalizedTrades, sessions: validSessions, accessStart };
  }
  function periodBounds(period, now, earliest) {
    const end = stamp(key(now));
    const lengths = { '7': 7, '30': 30, '90': 90, '180': 180, '365': 365 };
    const length = lengths[period] || Math.max(1, Math.round((end - stamp(earliest || key(now))) / DAY) + 1);
    const start = end - (length - 1) * DAY;
    return { start: date(start), end: date(end), previousStart: date(start - length * DAY), previousEnd: date(start - DAY), length, comparable: period !== 'all' };
  }
  function summary(days, range, accessStart) {
    const emotions = new Map(); days.forEach(day => day.states.forEach(state => emotions.set(state, (emotions.get(state) || 0) + 1)));
    const dominant = [...emotions].sort((a, b) => b[1] - a[1])[0];
    const coverageStart = accessStart && accessStart <= range.end ? (accessStart > range.start ? accessStart : range.start) : null;
    const accessDays = coverageStart ? Math.round((stamp(range.end) - stamp(coverageStart)) / DAY) + 1 : 0;
    return { dominant: dominant?.[0] || null, dominantCount: dominant?.[1] || 0, records: days.filter(day => day.recordId).length, trades: days.reduce((sum, day) => sum + day.entries.length, 0), access: accessDays ? days.reduce((sum, day) => sum + (day.access || 0), 0) / accessDays : null, accessDays, accessTotal: days.reduce((sum, day) => sum + (day.access || 0), 0), adherence: mean(days.map(day => day.adherence)), adherenceCount: days.filter(day => day.adherence !== null).length, execution: mean(days.map(day => day.execution)), executionCount: days.filter(day => day.execution !== null).length, intensity: mean(days.map(day => day.intensity)), intensityCount: days.filter(day => day.intensity !== null).length };
  }
  function confidence(n, control) { return n >= 15 && control >= 8 ? 'high' : n >= 7 && control >= 5 ? 'medium' : 'low'; }
  function groupMetrics(rows) { return { count: rows.length, intensity: mean(rows.map(d => d.intensity)), adherence: mean(rows.map(d => d.adherence)), execution: mean(rows.map(d => d.execution)), access: mean(rows.map(d => d.access)), resultR: mean(rows.flatMap(d => d.results)), resultsCount: rows.reduce((sum, d) => sum + d.results.length, 0) }; }
  function patternsFor(days, trades) {
    const patterns = [];
    function compare(id, title, metric, selected, control, kind, minDifference, explanation) {
      const a = days.filter(d => selected(d) && number(metric(d)) !== null), b = days.filter(d => control(d) && number(metric(d)) !== null);
      if (a.length < 3 || b.length < 3) return;
      const value = mean(a.map(metric)), baseline = mean(b.map(metric)), difference = value - baseline;
      if (Math.abs(difference) < minDifference) return;
      patterns.push({ id, title, kind: typeof kind === 'function' ? kind(difference) : kind, metric: id, value, baseline, difference, count: a.length, controlCount: b.length, confidence: confidence(a.length, b.length), days: a, control: b, explanation });
    }
    const calm = d => d.states.some(s => normalize(s) === 'calmo') && d.intensity !== null && d.intensity <= 2;
    const anxious = d => d.states.some(s => normalize(s) === 'ansioso') && d.intensity >= 4;
    if (days.some(d => d.recordId && d.states.length && d.intensity === null)) {
      // Legacy journals can carry explicit emotional checkboxes without a 1–5 scale.
      // Analyse those labels separately; never manufacture activation or scatter points.
      [['ansioso', 'declared-anxiety-execution', 'Ansiedade marcada e qualidade da execução'], ['calmo', 'declared-calm-execution', 'Calma marcada e qualidade da execução'], ['confiante', 'declared-confidence-execution', 'Confiança marcada e qualidade da execução']].forEach(([state, id, title]) => {
        const has = d => d.states.some(s => normalize(s) === state);
        compare(id, title, d => d.execution, has, d => d.states.length > 0 && !has(d), 'neutral', .7, `Dias com “${state}” explicitamente marcado versus dias com outras emoções marcadas, sem esse rótulo. Outras emoções podem coexistir. A escala 1–5 não é necessária para esta associação nem foi estimada. Não se atribui causalidade ou ordem temporal.`);
      });
    }
    compare('anxiety-access', 'Ansiedade e frequência de monitoramento', d => d.access, anxious, calm, 'attention', 2, 'Dias ansiosos com intensidade 4–5 comparados a dias calmos com intensidade 1–2. São acessos registrados, não uma medida clínica de ansiedade.');
    compare('calm-plan', 'Calma e aderência ao plano', d => d.adherence, calm, d => d.states.length > 0 && d.intensity !== null && !calm(d), diff => diff > 0 ? 'positive' : 'attention', .12, 'Dias calmos comparados a outros estados registrados. Aderência significa plano integralmente respeitado; respostas parciais não contam como aderência integral.');
    compare('calm-execution', 'Calma e qualidade da execução', d => d.execution, calm, d => d.states.length > 0 && d.intensity !== null && !calm(d), diff => diff > 0 ? 'positive' : 'attention', .7, 'Qualidade autodeclarada no Diário: dias calmos de baixa intensidade comparados aos demais estados registrados.');
    compare('market-emotion', 'Mercado saudável e ativação emocional', d => d.intensity, d => d.market === 'up', d => ['down', 'transition'].includes(d.market), diff => diff < 0 ? 'positive' : 'attention', .5, 'Estado do mercado registrado no Diário: contexto saudável comparado a down e transição.');
    compare('anxiety-monitoring', 'Ansiedade e consultas a áreas de monitoramento', d => d.monitoring, anxious, calm, 'attention', 2, 'Consultas registradas às áreas de posições, panorama, scans e força relativa: dias ansiosos de intensidade 4–5 versus dias calmos de intensidade 1–2. Histórico de áreas começa com a ativação desta funcionalidade.');
    compare('market-calm-execution', 'Mercado saudável, calma e execução', d => d.execution, d => d.market === 'up' && calm(d), d => d.market && d.states.length > 0 && !(d.market === 'up' && calm(d)), diff => diff > 0 ? 'positive' : 'attention', .8, 'Dias com contexto saudável e calma versus os demais dias com mercado e emoção registrados.');
    compare('trade-count-plan', 'Número de operações e aderência', d => d.adherence, d => d.entries.length <= 1 && d.entries.length > 0, d => d.entries.length > 1, diff => diff > 0 ? 'positive' : 'attention', .12, 'Dias com uma entrada versus dias com múltiplas entradas, usando respeito integral ao plano.');
    const accessValues = days.filter(d => d.access !== null).map(d => d.access).sort((a, b) => a - b), median = accessValues.length ? accessValues[Math.floor(accessValues.length / 2)] : null;
    if (median !== null) {
      compare('access-execution', 'Monitoramento e execução', d => d.execution, d => d.access !== null && d.access > median, d => d.access !== null && d.access <= median, diff => diff < 0 ? 'attention' : 'positive', .7, `Dias acima da mediana de ${median} acessos registrados comparados aos demais dias com histórico de acesso.`);
      compare('access-trades', 'Frequência de acesso e novas operações', d => d.entries.length, d => d.access !== null && d.access > median, d => d.access !== null && d.access <= median, 'neutral', .5, 'Entradas reais no dia; trades planejados foram excluídos. A intensidade de monitoramento foi separada pela mediana do período.');
      compare('access-plan', 'Frequência de acesso e aderência', d => d.adherence, d => d.access !== null && d.access > median, d => d.access !== null && d.access <= median, diff => diff < 0 ? 'attention' : 'positive', .12, 'Respeito integral ao plano nos dias acima da mediana de acessos versus os demais dias registrados.');
    }
    // Temporal patterns require precise timestamps. Dates alone cannot establish event order.
    const closed = trades.filter(t => t.closedAt && /T\d/.test(t.closedAt) && t.resultR !== null).sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt));
    const periodDates = new Set(days.map(d => d.date));
    const lossDays = new Set(closed.filter(t => t.resultR < 0 && periodDates.has(t.closedDate)).map(t => t.closedDate));
    const winDays = new Set(closed.filter(t => t.resultR > 0 && periodDates.has(t.closedDate)).map(t => t.closedDate));
    const after = (d, sign) => {
      const events = closed.filter(t => t.closedDate === d.date && (sign < 0 ? t.resultR < 0 : t.resultR > 0));
      return events.length ? d.sessions.filter(s => new Date(s.openedAt) > new Date(events[0].closedAt)).length : null;
    };
    const loss = days.filter(d => lossDays.has(d.date) && !winDays.has(d.date) && d.access !== null), win = days.filter(d => winDays.has(d.date) && !lossDays.has(d.date) && d.access !== null);
    if (loss.length >= 3 && win.length >= 3) {
      const value = mean(loss.map(d => after(d, -1))), baseline = mean(win.map(d => after(d, 1)));
      if (Math.abs(value - baseline) >= 1) patterns.push({ id: 'loss-after-access', title: 'Atividade depois de encerramentos perdedores', kind: 'attention', value, baseline, difference: value - baseline, count: loss.length, controlCount: win.length, confidence: confidence(loss.length, win.length), days: loss, control: win, explanation: 'Acessos com horário posterior ao primeiro encerramento negativo do dia comparados a dias com encerramentos positivos. Dias mistos foram excluídos. Horários dos encerramentos podem variar, por isso esta associação é exploratória.' });
    }
    const lossReentry = days.filter(d => closed.some(t => t.resultR < 0 && t.closedDate === d.date && d.entries.some(entry => /T\d/.test(entry.openedAt || '') && new Date(entry.openedAt) > new Date(t.closedAt))));
    if (lossReentry.length >= 3 && lossDays.size >= 5) patterns.push({ id: 'loss-reentry', title: 'Novas operações após encerramentos perdedores', kind: 'attention', count: lossReentry.length, controlCount: lossDays.size, confidence: confidence(lossReentry.length, lossDays.size - lossReentry.length), value: lossReentry.length / lossDays.size, baseline: null, days: lossReentry, control: [], explanation: `${lossReentry.length} dias tiveram uma entrada com horário posterior a um encerramento negativo, em ${lossDays.size} dias com perdas. Isso descreve a sequência registrada; não avalia a intenção nem a qualidade da nova operação.` });
    const streaks = [-1, 1].map(sign => {
      const dates = new Set(); let streak = 0;
      closed.forEach(t => { streak = (sign < 0 ? t.resultR < 0 : t.resultR > 0) ? streak + 1 : 0; if (streak >= 2) dates.add(t.closedDate); });
      return { sign, dates };
    });
    streaks.forEach(({ sign, dates }) => compare(sign < 0 ? 'loss-streak-emotion' : 'win-streak-activity', sign < 0 ? 'Sequências de perdas e ativação emocional' : 'Sequências de ganhos e atividade', sign < 0 ? d => d.intensity : d => d.access, d => dates.has(d.date), d => !dates.has(d.date), 'neutral', sign < 0 ? .6 : 2, 'Dias com pelo menos dois encerramentos consecutivos do mesmo sinal na sequência histórica, comparados aos demais dias. O registro emocional não tem horário: não se infere que ocorreu depois dos trades.'));
    compare('weekday-execution', 'Primeira metade da semana e execução', d => d.execution, d => [1, 2, 3].includes(new Date(`${d.date}T12:00:00Z`).getUTCDay()), d => [4, 5].includes(new Date(`${d.date}T12:00:00Z`).getUTCDay()), 'neutral', .8, 'Segunda a quarta versus quinta e sexta, usando a avaliação pessoal da execução.');
    return patterns.sort((a, b) => b.count - a.count).slice(0, 14);
  }
  function contexts(days) {
    const groups = new Map();
    days.filter(d => d.states.length && d.intensity !== null && d.execution !== null).forEach(day => {
      const states = [...day.states].sort(), band = day.intensity <= 2 ? '1–2' : day.intensity >= 4 ? '4–5' : '3', id = `${states.join('+')}|${band}`;
      if (!groups.has(id)) groups.set(id, { title: states.join(' + '), band, days: [] }); groups.get(id).days.push(day);
    });
    const valid = [...groups.values()].filter(g => g.days.length >= 3).map(g => ({ ...g, ...groupMetrics(g.days), confidence: confidence(g.days.length, days.length - g.days.length) })).sort((a, b) => b.execution - a.execution);
    return { best: valid.length ? valid[0] : null, attention: valid.length > 1 ? valid.at(-1) : null };
  }
  function analyze(input = {}) {
    const now = input.now || new Date(), all = buildDays(input.records || [], input.sessions || [], input.trades || [], now, input.activity || []);
    const bounds = periodBounds(input.period || '90', now, all.days[0]?.date);
    const days = all.days.filter(d => d.date >= bounds.start && d.date <= bounds.end), previous = all.days.filter(d => d.date >= bounds.previousStart && d.date <= bounds.previousEnd);
    const current = summary(days, bounds, all.accessStart), prior = summary(previous, { start: bounds.previousStart, end: bounds.previousEnd }, all.accessStart);
    const relationships = [
      ['emotion-access', 'Ativação emocional × Acessos', d => d.intensity, d => d.access],
      ['emotion-execution', 'Ativação emocional × Execução', d => d.intensity, d => d.execution],
      ['access-trades', 'Acessos × Nº de trades', d => d.access, d => d.entries.length],
      ['access-plan', 'Acessos × Aderência', d => d.access, d => d.adherence],
      ['market-emotion', 'Mercado × Ativação emocional', d => ({ down: 0, transition: 1, up: 2 })[d.market] ?? null, d => d.intensity]
    ].map(([id, label, x, y]) => ({ id, label, ...correlation(days, x, y) }));
    const weekday = [1, 2, 3, 4, 5].map(day => ({ day, ...groupMetrics(days.filter(d => new Date(`${d.date}T12:00:00Z`).getUTCDay() === day)) }));
    const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    all.sessions.forEach(session => { const day = key(session.openedAt); if (day >= bounds.start && day <= bounds.end) hourly[Number(hourFormatter.format(new Date(session.openedAt)))].count++; });
    return { bounds, days, current, previous: bounds.comparable ? prior : null, patterns: patternsFor(days, all.trades.filter(t => t.closedDate <= bounds.end)), contexts: contexts(days), relationships, weekday, hourly, accessStart: all.accessStart, scatter: days.filter(d => d.intensity !== null && d.execution !== null) };
  }
  return { analyze, buildDays, tradeData, mean, correlation, periodBounds, normalize };
}));

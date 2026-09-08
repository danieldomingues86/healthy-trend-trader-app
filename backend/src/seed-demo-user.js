require('./env');
const crypto = require('node:crypto');
const database = require('./database');
const { hashPassword } = require('./auth');

const EMAIL = 'test.user@healthytrendtrader.local';
const PASSWORD = 'HealthyTrendDemo2026!';
const NAME = 'Healthy Trader Demo';
const TICKERS = ['WEGE3', 'PETR4', 'VALE3', 'ITUB4', 'UGPA3', 'CMIN3', 'B3SA3', 'SUZB3', 'BBAS3', 'RENT3'];
const SETUPS = ['Contração 1-2-3', 'Breakout', 'Pullback na MM20', 'Earnings', 'Reentrada de tendência'];
const GRADE_PLAN = ['A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A+', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];

function rng(seed = 20260908) { let state = seed >>> 0; return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296); }
function pick(random, values) { return values[Math.floor(random() * values.length)]; }
function isoDay(date) { return date.toISOString().slice(0, 10); }
function uuid() { return crypto.randomUUID(); }
function scoreFor(grade) { return ({ 'A+': 9.2, A: 8.1, B: 6.7, C: 5.1, D: 3.8 })[grade]; }
function marketFor(grade, index) {
  if (grade === 'A+' || grade === 'A') return index % 5 ? 'healthy' : 'improving';
  if (grade === 'D') return index % 2 ? 'defensive' : 'transition';
  return index % 3 ? 'improving' : 'transition';
}
function resultR(random, grade, index) {
  const winning = { 'A+': .78, A: .66, B: .54, C: .42, D: .24 }[grade];
  const forcedLoss = grade === 'D' && index % 3 !== 0;
  if (!forcedLoss && random() < winning) {
    const base = { 'A+': 1.7, A: 1.2, B: .8, C: .55, D: .35 }[grade];
    const bonus = (grade === 'A+' && index % 11 === 0) ? 2.8 : random() * (grade === 'A+' ? 1.8 : 1.1);
    return Number((base + bonus).toFixed(2));
  }
  return Number((-(.45 + random() * (grade === 'D' ? 1.15 : .75))).toFixed(2));
}
function emotionsFor(grade, r, index) {
  if (grade === 'D') return r < 0 ? ['FOMO', 'Frustrado', 'Impulsivo'] : ['Ansioso', 'FOMO'];
  if (r < 0) return index % 2 ? ['Frustração após loss', 'Ansioso'] : ['Medo de devolver lucro', 'Calmo'];
  return grade === 'A+' ? ['Disciplinado', 'Paciente', 'Confiante'] : ['Calmo', 'Disciplinado'];
}
function journalRecord({ id, date, ticker, grade, r, market, setup, index }) {
  const disciplined = grade === 'A+' || grade === 'A';
  const emotions = emotionsFor(grade, r, index);
  return {
    id: `day-${date}`,
    date,
    title: `${ticker} · ${setup}`,
    technical: {
      marketState: market === 'healthy' ? 'up' : market === 'improving' ? 'transition' : 'down',
      session: disciplined
        ? `${ticker} apresentou contexto favorável, força relativa alinhada e gatilho ${setup}. A entrada respeitou o plano e o risco definido.`
        : `${ticker} foi operado em contexto ${market}. Houve menor alinhamento entre ciclo, força relativa e gatilho; revisar seletividade antes da próxima entrada.`,
      executionScore: disciplined ? 8.5 : grade === 'D' ? 4.2 : 6.4,
      planRespected: disciplined ? 'yes' : grade === 'D' ? 'no' : 'partial',
      checklist: { 0: disciplined, 1: grade === 'A+', 4: true, 5: true },
      permissionMoney: disciplined ? 'a-plus' : 'wait',
      tradeIds: [id]
    },
    emotional: {
      states: emotions,
      intensity: emotions.includes('FOMO') || emotions.includes('Impulsivo') ? 4 : 2,
      note: emotions.includes('FOMO')
        ? 'Percebi urgência para entrar antes do fechamento. O resultado reforça a necessidade de esperar confirmação.'
        : r < 0
          ? 'Aceitei o stop e registrei o aprendizado sem alterar a regra durante a operação.'
          : 'Mantive o plano, acompanhei o risco e deixei a tendência trabalhar sem antecipar a saída.',
      impact: emotions.includes('FOMO') ? 'yes' : 'no',
      impactNote: emotions.includes('FOMO') ? 'A pressa reduziu a qualidade da decisão e a paciência na execução.' : ''
    },
    shared: {
      lesson: r > 0 ? 'Quando ciclo, contexto e força relativa se alinham, o trabalho é dimensionar corretamente e respeitar o processo.' : 'Um loss é custo do processo; a qualidade da decisão precisa ser avaliada separadamente do resultado.',
      patterns: emotions.includes('FOMO') ? 'Esperar o fechamento do candle gatilho antes de executar.' : 'Monitorar risco em andamento e manter o stop técnico.',
      observations: '', phrase: ''
    },
    evidence: [], legacyEntries: [], updatedAt: `${date}T18:00:00.000Z`
  };
}

async function seed() {
  await database.migrate();
  const random = rng();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 10, 2, 12);
  const trades = [];
  const journals = [];
  let equity = 400_000;
  const openTrade = {
    id: uuid(), ticker: 'WEGE3', market: 'healthy', direction: 'long', setup: 'Contração 1-2-3',
    entry: 44.8, stop: 42.95, atr: 1.24, quantity: 800, riskPct: .0025, score: 8.4, grade: 'A',
    entryDate: new Date(now.getTime() - 3 * 86400000),
    responses: { marketCycleRegime: 'healthy', dailyContext: 'favorable', relativeStrength: 'leader', fundamentals: 'strong', demo: true }
  };

  for (let index = 0; index < 100; index += 1) {
    const grade = GRADE_PLAN[(index * 37) % GRADE_PLAN.length];
    const ticker = TICKERS[(index * 7) % TICKERS.length];
    const setup = SETUPS[(index * 3) % SETUPS.length];
    const direction = index % 9 === 0 ? 'short' : 'long';
    const market = marketFor(grade, index);
    const entryDate = new Date(start); entryDate.setDate(start.getDate() + index * 3 + Math.floor(random() * 2));
    const exitDate = new Date(entryDate); exitDate.setDate(entryDate.getDate() + 2 + Math.floor(random() * 15));
    const atr = Number((.85 + random() * 2.4).toFixed(2));
    const entry = Number((18 + random() * 72).toFixed(2));
    const stopDistance = Number((atr * (1 + random() * .35)).toFixed(2));
    const stop = Number((direction === 'long' ? entry - stopDistance : entry + stopDistance).toFixed(2));
    const riskPct = grade === 'A+' ? .004 : grade === 'A' ? .003 : grade === 'B' ? .002 : .001;
    const quantity = Math.max(100, Math.round((equity * riskPct) / stopDistance / 100) * 100);
    const r = resultR(random, grade, index);
    const exit = Number((direction === 'long' ? entry + r * stopDistance : entry - r * stopDistance).toFixed(2));
    const id = uuid();
    const score = scoreFor(grade) + Number((random() * .45 - .2).toFixed(2));
    const responses = {
      marketCycleRegime: market,
      dailyContext: grade === 'A+' || grade === 'A' ? 'favorable' : grade === 'D' ? 'unfavorable' : 'mixed',
      relativeStrength: grade === 'A+' ? 'leader' : grade === 'A' ? 'strong' : grade === 'D' ? 'laggard' : 'neutral',
      fundamentals: grade === 'A+' || grade === 'A' ? 'strong' : grade === 'D' ? 'weak' : 'neutral',
      volatility: atr / entry * 100,
      resultR: r,
      demo: true
    };
    const contributions = [
      ['marketCycle', market === 'healthy' ? 'good' : market === 'improving' ? 'medium' : 'bad', market === 'healthy' ? 3.5 : market === 'improving' ? 2.5 : .8, 3.5],
      ['relativeStrength', responses.relativeStrength === 'leader' ? 'good' : responses.relativeStrength === 'laggard' ? 'bad' : 'medium', responses.relativeStrength === 'leader' ? 2 : responses.relativeStrength === 'laggard' ? .3 : 1.1, 2],
      ['fundamentals', responses.fundamentals === 'strong' ? 'good' : responses.fundamentals === 'weak' ? 'bad' : 'medium', responses.fundamentals === 'strong' ? 1.5 : responses.fundamentals === 'weak' ? .2 : .8, 1.5],
      ['setup', grade === 'A+' || grade === 'A' ? 'good' : grade === 'D' ? 'bad' : 'medium', grade === 'A+' ? 2.4 : grade === 'A' ? 1.9 : grade === 'D' ? .3 : 1.2, 2.5]
    ];
    trades.push({ id, ticker, setup, direction, market, entry, stop, atr, quantity, riskPct, score, grade, responses, contributions, entryDate, exitDate, exit, r });
    journals.push(journalRecord({ id, date: isoDay(entryDate), ticker, grade, r, market, setup, index }));
    equity += r * stopDistance * quantity;
  }

  const userId = uuid();
  const profile = { name: NAME, email: EMAIL, language: 'pt-BR', timezone: 'America/Sao_Paulo', currency: 'BRL', demo: true };
  const workspace = {
    'healthy-trend-profile-v1': JSON.stringify(profile),
    'healthy-trend-avatar-v1': JSON.stringify({ initials: 'TD', colour: '#e6c675' }),
    'healthy-trend-subscription-v1': JSON.stringify({ plan: 'professional', trialStartedAt: null, trialStatus: 'inactive', trialUsed: true, trialAlertedDays: [], usageMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, tradesUsed: 100, demo: true }),
    'healthy-trend-journal-v2': JSON.stringify({ version: 2, records: journals }),
    'healthy-trend-habit-tracker-v2': JSON.stringify({ habits: [{ id: 'plan', label: 'Planejar antes de operar', icon: '◌' }, { id: 'journal', label: 'Registrar o diário', icon: '✎' }, { id: 'risk', label: 'Respeitar o risco', icon: '◇' }], records: {}, ignoredDays: {}, demo: true }),
    'healthy-trend-trader-profile-v1': JSON.stringify({ active: 'risk', results: { risk: { completedAt: now.toISOString(), score: 78 }, behavior: { completedAt: now.toISOString(), score: 71 } } }),
    'healthy-trend-mental-audio-v1': JSON.stringify({ favorites: ['premarket', 'peace'], history: ['premarket', 'wealth'] }),
    'healthy-trend-trader-wisdom-v1': JSON.stringify({ favorites: ['mark-douglas-process', 'minervini-circle'] }),
    'healthy-trend-market-focus-v1': JSON.stringify({ enabled: true, start: '10:00', end: '17:55', days: 'weekdays' })
  };

  await database.transaction(async (client) => {
    await client.query('DELETE FROM app.app_users WHERE email = $1', [EMAIL]);
    await client.query('INSERT INTO app.app_users (id, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5)', [userId, EMAIL, await hashPassword(PASSWORD), NAME, 'member']);
    for (const trade of trades) {
      await client.query(
        `INSERT INTO app.trades (id, user_id, ticker, market, direction, setup, entry_price, stop_price, atr, planned_quantity, risk_pct, rubric_score, rubric_max_score, rubric_grade, rubric_responses, status, metadata, execution_price, executed_quantity, executed_at, created_at)
         VALUES ($1,$2,$3,'Ações',$4,$5,$6,$7,$8,$9,$10,$11,10,$12,$13::jsonb,'closed',$14::jsonb,$6,$9,$15,$15)`,
        [trade.id, userId, trade.ticker, trade.direction, trade.setup, trade.entry, trade.stop, trade.atr, trade.quantity, trade.riskPct, trade.score, trade.grade, JSON.stringify(trade.responses), JSON.stringify({ mode: 'real', thesis: `TEST DATA · ${trade.grade} · ${trade.market} · ${trade.responses.relativeStrength}`, entryDate: isoDay(trade.entryDate), riskProfile: trade.grade === 'A+' ? 'standard' : 'rampUp', marketFactor: trade.market === 'healthy' ? 1 : .7 }), trade.entryDate]
      );
      for (const [key, rating, points, weight] of trade.contributions) await client.query('INSERT INTO app.trade_rubric_ratings (id, trade_id, criterion_key, selected_rating, score, max_score) VALUES ($1,$2,$3,$4,$5,$6)', [uuid(), trade.id, key, rating, points, weight]);
      await client.query('INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, stop_price, atr, note, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [uuid(), trade.id, 'entry', trade.quantity, trade.entry, trade.stop, trade.atr, 'TEST DATA · entrada registrada conforme o plano.', trade.entryDate]);
      if (trade.r > .9 && trades.indexOf(trade) % 4 === 0) {
        const partial = Math.floor(trade.quantity / 2 / 100) * 100;
        const partialPrice = Number((trade.direction === 'long' ? trade.entry + trade.atr * .7 : trade.entry - trade.atr * .7).toFixed(2));
        await client.query('INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, note, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [uuid(), trade.id, 'peeloff', partial, partialPrice, 'TEST DATA · parcial para reduzir risco em andamento.', new Date(trade.entryDate.getTime() + 86400000)]);
        await client.query('INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, note, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [uuid(), trade.id, 'close', trade.quantity - partial, trade.exit, `TEST DATA · saída final em ${trade.r}R.`, trade.exitDate]);
      } else {
        await client.query('INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, note, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [uuid(), trade.id, 'close', trade.quantity, trade.exit, `TEST DATA · saída final em ${trade.r}R.`, trade.exitDate]);
      }
    }
    await client.query(
      `INSERT INTO app.trades (id, user_id, ticker, market, direction, setup, entry_price, stop_price, atr, planned_quantity, risk_pct, rubric_score, rubric_max_score, rubric_grade, rubric_responses, status, metadata, execution_price, executed_quantity, executed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,10,$13,$14::jsonb,'open',$15::jsonb,$7,$10,$16,$16)`,
      [openTrade.id, userId, openTrade.ticker, 'Ações', openTrade.direction, openTrade.setup, openTrade.entry, openTrade.stop, openTrade.atr, openTrade.quantity, openTrade.riskPct, openTrade.score, openTrade.grade, JSON.stringify(openTrade.responses), JSON.stringify({ mode: 'real', thesis: 'TEST DATA · posição aberta para validar a revisão opcional no Diário.', entryDate: isoDay(openTrade.entryDate), riskProfile: 'standard', marketFactor: 1 }), openTrade.entryDate]
    );
    await client.query(
      `INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, stop_price, atr, note, occurred_at)
       VALUES ($1,$2,'entry',$3,$4,$5,$6,$7,$8)`,
      [uuid(), openTrade.id, openTrade.quantity, openTrade.entry, openTrade.stop, openTrade.atr, 'TEST DATA · posição aberta para testar a revisão pós-trade opcional.', openTrade.entryDate]
    );
    await client.query('INSERT INTO app.wealth_settings (user_id, strategy_base) VALUES ($1,$2)', [userId, 400000]);
    await client.query('INSERT INTO app.wealth_movements (id,user_id,movement_type,amount,occurred_at,note) VALUES ($1,$2,$3,$4,$5,$6),($7,$2,$8,$9,$10,$11)', [uuid(), userId, 'deposit', 400000, start, 'TEST DATA · capital inicial', uuid(), 'deposit', 100000, new Date(start.getTime() + 120 * 86400000), 'TEST DATA · aporte para expansão da conta']);
    const allocations = [['Ações Brasil', 'Renda variável', 285000, 55], ['Reserva operacional', 'Caixa', 140000, 27], ['Renda fixa', 'Proteção', 70000, 14], ['Internacional', 'Diversificação', 20000, 4]];
    for (const [sortOrder, [label, assetClass, amount, targetPct]] of allocations.entries()) await client.query('INSERT INTO app.wealth_allocations (id,user_id,label,asset_class,amount,target_pct,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)', [uuid(), userId, label, assetClass, amount, targetPct, sortOrder]);
    let snapshotEquity = 400000;
    for (let month = 0; month < 10; month += 1) {
      const date = new Date(start.getFullYear(), start.getMonth() + month + 1, 1);
      const monthly = trades.filter(item => item.exitDate < date && item.exitDate >= new Date(date.getFullYear(), date.getMonth() - 1, 1)).reduce((sum, item) => sum + item.r * Math.abs(item.entry - item.stop) * item.quantity, 0);
      snapshotEquity += monthly;
      await client.query('INSERT INTO app.wealth_snapshots (id,user_id,snapshot_type,amount,occurred_at,source) VALUES ($1,$2,$3,$4,$5,$6),($7,$2,$8,$9,$5,$6)', [uuid(), userId, 'strategy_equity', snapshotEquity, date, 'demo-seed', uuid(), 'real_wealth', 500000 + (snapshotEquity - 400000)]);
    }
    await client.query('INSERT INTO app.workspace_state (user_id,state) VALUES ($1,$2::jsonb)', [userId, JSON.stringify(workspace)]);
    for (const materialId of ['rubric', 'risk', 'checklist', 'zen']) await client.query('INSERT INTO app.material_entitlements (id,user_id,material_id,source) VALUES ($1,$2,$3,$4)', [uuid(), userId, materialId, 'migration']);
    for (const ticker of ['WEGE3', 'PETR4', 'UGPA3', 'VALE3']) await client.query('INSERT INTO app.watchlist_items (id,user_id,ticker) VALUES ($1,$2,$3)', [uuid(), userId, ticker]);
  });
  const summary = await database.query(`SELECT rubric_grade, COUNT(*)::int AS trades, ROUND(AVG((rubric_responses->>'resultR')::numeric), 2) AS average_r FROM app.trades WHERE user_id = $1 GROUP BY rubric_grade ORDER BY rubric_grade`, [userId]);
  console.table(summary.rows);
  console.log(`Demo criado: ${EMAIL}`);
  console.log(`Senha de teste: ${PASSWORD}`);
  console.log('Os dados são identificados como TEST DATA / DEMO e podem ser recriados com npm run demo:seed.');
}

seed().catch((error) => { console.error(error); process.exitCode = 1; });

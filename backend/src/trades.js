const crypto = require('node:crypto');
const database = require('./database');
const management = require('../../frontend/position-management-model');
const rubricModel = require('../../frontend/trading-rubrics');
const scaleInModel = require('../../frontend/scale-in-model');
const assetBlacklist = require('./asset-blacklist');
const marketPause = require('./market-pause');
const setupTriggers = require('../../frontend/setup-triggers-catalog');
const paperPendingModel = require('../../frontend/paper-trading-pending-model');

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function number(value, field, { minimum = 0, required = false } = {}) {
  if (value === '' || value == null) {
    if (required) throw invalid(`${field} é obrigatório.`);
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum) throw invalid(`${field} é inválido.`);
  return parsed;
}

function ratingFromValue(value) {
  const score = Number(value);
  if (score >= 2) return 'good';
  if (score >= 1) return 'medium';
  return 'bad';
}

function entryTimestamp(value) {
  if (value == null || value === '') return new Date().toISOString();
  const date = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw invalid('Data de entrada é inválida.');
  const timestamp = new Date(date + 'T12:00:00-03:00');
  if (Number.isNaN(timestamp.getTime())) throw invalid('Data de entrada é inválida.');
  if (timestamp > new Date()) return new Date().toISOString();
  return timestamp.toISOString();
}

function normalizePlan(payload = {}) {
  const ticker = String(payload.asset || payload.ticker || '').trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{2,20}$/.test(ticker)) throw invalid('Ticker inválido.');
  const entry = number(payload.entry ?? payload.entryPrice, 'Preço de entrada', { minimum: 0.000001, required: true });
  const stop = number(payload.stop ?? payload.stopPrice, 'Stop inicial', { minimum: 0.000001, required: true });
  const plannedQuantity = number(payload.suggestedQty ?? payload.plannedQuantity, 'Quantidade planejada', { minimum: 1, required: true });
  const riskPct = number(payload.executableRiskPct ?? payload.riskPct, 'Risco executável', { minimum: 0, required: true });
  const riskBudgetPct = number(payload.riskBudgetPct, 'Orçamento de risco', { minimum: 0 });
  if (riskPct > 1) throw invalid('Risco executável é inválido.');
  if (riskBudgetPct != null && riskBudgetPct > 1) throw invalid('Orçamento de risco é inválido.');
  const rubric = payload.rubricResponses && typeof payload.rubricResponses === 'object' ? payload.rubricResponses : {};
  const contributions = Array.isArray(payload.rubricContributions) ? payload.rubricContributions : [];
  const rubricGrade = String(payload.grade || payload.rubricGrade || '').trim();
  if (!['A', 'B', 'C', 'D'].includes(rubricGrade)) throw invalid('Grade da Rubric inválido. Reavalie o trade com a classificação atual.');

  const rawTrigger = payload.setupTrigger || payload.setup_trigger;
  let setupTrigger = null;
  if (rawTrigger) {
    setupTrigger = setupTriggers.normalizeKey(rawTrigger);
    if (!setupTrigger || !setupTriggers.isValidTrigger(setupTrigger)) {
      throw invalid('Gatilho de entrada inválido. Selecione um dos 5 gatilhos homologados.');
    }
  } else if (payload.setup) {
    setupTrigger = setupTriggers.normalizeKey(payload.setup);
  }

  const setupLabel = setupTrigger ? setupTriggers.getTriggerLabel(setupTrigger) : (String(payload.setup || '').slice(0, 100) || null);

  return {
    ticker,
    market: String(payload.market || '').slice(0, 50) || null,
    direction: ['long', 'short'].includes(payload.direction) ? payload.direction : null,
    setup: setupLabel,
    setupTrigger,
    entry,
    stop,
    atr: number(payload.atr, 'ATR', { minimum: 0 }),
    plannedQuantity,
    riskPct,
    rubricScore: number(payload.rubricScore, 'Score da Rubric', { minimum: -1000 }),
    rubricMaxScore: number(payload.rubricMaxScore, 'Score máximo da Rubric', { minimum: 0 }),
    rubricGrade,
    rubricResponses: rubric,
    contributions: contributions
      .filter((item) => item && typeof item.key === 'string')
      .map((item) => ({
        key: item.key.slice(0, 80),
        rating: ['bad', 'medium', 'good'].includes(item.selectedRating) ? item.selectedRating : ratingFromValue(item.value),
        score: number(item.points, 'Pontuação da Rubric', { minimum: -1000, required: true }),
        maxScore: Math.max(0, Number(item.weight || 0) * 2)
      })),
    metadata: {
      gradingVersion: 2,
      mode: payload.mode === 'paper' ? 'paper' : 'real',
      thesis: String(payload.thesis || '').slice(0, 4000),
      executedQuantity: number(payload.executedQty, 'Quantidade da operação', { minimum: 1, required: true }),
      entryDate: String(payload.entryDate || '').slice(0, 10) || null,
      riskProfile: ['rampUp', 'standard'].includes(payload.riskProfile) ? payload.riskProfile : 'standard',
      marketFactor: number(payload.marketFactor, 'Multiplicador de mercado', { minimum: 0 }),
      riskBudgetPct,
      executableRiskPct: riskPct,
      limitingLayer: String(payload.limitingLayer || '').slice(0, 40) || null,
      limitingLayerName: String(payload.limitingLayerName || '').slice(0, 120) || null,
      blacklistOverride: payload.blacklistOverride === true,
      benchmark: payload.benchmark ? String(payload.benchmark).slice(0, 20) : null,
      marketBenchmark: payload.marketBenchmark ? String(payload.marketBenchmark).slice(0, 20) : (payload.benchmark ? String(payload.benchmark).slice(0, 20) : null),
      marketType: payload.marketType ? String(payload.marketType).slice(0, 40) : null,
      marketCycleScore: Number.isFinite(Number(payload.marketCycleScore)) ? Number(payload.marketCycleScore) : null,
      marketCycleSource: payload.marketCycleSource ? String(payload.marketCycleSource).slice(0, 20) : null,
      marketCycleSuggested: payload.marketCycleSuggested ? String(payload.marketCycleSuggested).slice(0, 40) : null,
      marketCycleUsed: payload.marketCycleUsed ? String(payload.marketCycleUsed).slice(0, 40) : null,
      marketCycleOverride: payload.marketCycleOverride === true,
      timeframe: String(payload.timeframe || 'Diário').slice(0, 30),
      tradeContext: (payload.tradeContext && typeof payload.tradeContext === 'object') ? payload.tradeContext : null
    },
    entryTimestamp: entryTimestamp(payload.entryDate)
  };
}

function validateRareTrade(plan, policy) {
  if (plan.rubricGrade !== 'A') return;
  const verified = rubricModel.calculateRubric(plan.rubricResponses, policy);
  if (!verified.qualityAllowed || Math.abs(verified.score - plan.rubricScore) > 0.11) {
    throw invalid('Grade A exige score de pelo menos 95 e excelência em todos os critérios da Rubric. Reavalie o trade.');
  }
}

function parseMissionState(missionState) {
  let m = missionState;
  while (typeof m === 'string') {
    try {
      m = JSON.parse(m);
    } catch (_) {
      break;
    }
  }
  return m && typeof m === 'object' ? m : null;
}

function isMissionStateActive(missionState) {
  const m = parseMissionState(missionState);
  return Boolean(m && m.status === 'ACTIVE' && Number(m.riskPct) > 0);
}

// Valida o risco do trade contra a Missão ativa. Não confia apenas no percentual enviado
// pelo cliente: quando há equity, recalcula o risco real a partir de entrada, stop e
// quantidade executada e utiliza o maior valor entre o declarado e o recalculado.
function validateMissionRisk(plan, missionState, equity) {
  const m = parseMissionState(missionState);
  if (!m || m.status !== 'ACTIVE' || !(Number(m.riskPct) > 0)) return;
  const missionLimitPct = Number(m.riskPct) * 100;
  const declaredRiskPct = (Number(plan.riskPct) || 0) * 100;
  const executedQuantity = Number(plan.metadata?.executedQuantity ?? plan.executedQuantity);
  const distance = Math.abs(Number(plan.entry) - Number(plan.stop));
  const accountEquity = Number(equity);
  let computedRiskPct = 0;
  if (accountEquity > 0 && executedQuantity > 0 && distance > 0) {
    computedRiskPct = (distance * executedQuantity / accountEquity) * 100;
  }
  const executedRiskPct = Math.max(declaredRiskPct, computedRiskPct);
  if (executedRiskPct > (missionLimitPct + 0.0201)) {
    const label = m.mode === 'REBUILD' ? 'pelo seu Modo Recuperação (Rebuild) ativo' : 'pela sua Missão ativa';
    throw invalid(`Operação bloqueada: o risco (${executedRiskPct.toFixed(2).replace('.', ',')}%) excede o limite de ${missionLimitPct.toFixed(2).replace('.', ',')}% definido ${label}. Reduza a quantidade ou ajuste o stop.`);
  }
}

async function createPlan(userId, payload) {
  const plan = normalizePlan(payload);
  const id = crypto.randomUUID();
  await database.transaction(async (client) => {
    const restriction = await assetBlacklist.find(userId, plan.ticker, plan.market, client);
    if (restriction?.restrictionLevel === 'block') throw invalid(`${plan.ticker} está bloqueado na sua Blacklist. Consulte a regra pessoal antes de operar.`);
    if (restriction?.restrictionLevel === 'alert' && !plan.metadata.blacklistOverride) throw invalid(`${plan.ticker} está na sua Blacklist. Confirme conscientemente antes de continuar.`);
    if (!restriction) plan.metadata.blacklistOverride = false;
    const activePause = await marketPause.getActive(userId, client);
    if (activePause) {
      throw invalid(`Você está em período de pausa fora do mercado até ${activePause.expectedReturnDate}. Encerre a pausa antes de registrar uma nova operação.`);
    }
    const wsRes = await client.query('SELECT state FROM app.workspace_state WHERE user_id = $1', [userId]);
    const missionState = wsRes.rows[0]?.state?.missionState;
    if (isMissionStateActive(missionState)) {
      const equity = await getAccountEquity(userId, client);
      validateMissionRisk(plan, missionState, equity);

      const parsedMission = parseMissionState(missionState);
      if (parsedMission?.mode === 'REBUILD') {
        const openPositionsRes = await client.query(
          "SELECT count(*) as count FROM app.trades WHERE user_id = $1 AND status = 'open'",
          [userId]
        );
        const openPositionsCount = Number(openPositionsRes.rows[0]?.count || 0);
        if (openPositionsCount >= 1) {
          throw invalid('Operação bloqueada pelo Modo Recuperação: você já possui uma posição aberta. Durante o Rebuild, é permitido operar apenas uma posição por vez.');
        }
        plan.metadata = plan.metadata || {};
        plan.metadata.missionId = parsedMission.id;
        plan.metadata.missionMode = 'REBUILD';
        plan.metadata.rebuild_mode_id = parsedMission.id;
        plan.metadata.isRebuild = true;
      } else if (parsedMission) {
        plan.metadata = plan.metadata || {};
        plan.metadata.missionId = parsedMission.id;
        plan.metadata.missionMode = 'STANDARD';
      }
    }
    if (plan.rubricGrade === 'A') {
      const savedPolicy = await client.query('SELECT policy FROM app.risk_policies WHERE user_id = $1', [userId]);
      validateRareTrade(plan, savedPolicy.rows[0]?.policy);
    }
    const totalCapital = plan.entry * plan.metadata.executedQuantity;
    await client.query(
      `INSERT INTO app.trades (
        id, user_id, ticker, market, direction, setup, entry_price, stop_price, atr,
        planned_quantity, risk_pct, rubric_score, rubric_max_score, rubric_grade,
        rubric_responses, status, metadata, execution_price, executed_quantity, executed_at, setup_trigger,
        scale_in_enabled, scale_in_count, total_quantity, average_entry_price, total_allocated_capital, current_risk_percent
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15::jsonb, 'open', $16::jsonb, $7, $17, $18, $19,
        true, 0, $17, $7, $20, $11
      )`,
      [id, userId, plan.ticker, plan.market, plan.direction, plan.setup, plan.entry, plan.stop, plan.atr,
        plan.plannedQuantity, plan.riskPct, plan.rubricScore, plan.rubricMaxScore, plan.rubricGrade,
        JSON.stringify(plan.rubricResponses), JSON.stringify(plan.metadata), plan.metadata.executedQuantity, plan.entryTimestamp, plan.setupTrigger, totalCapital]
    );
    for (const item of plan.contributions) {
      await client.query(
        `INSERT INTO app.trade_rubric_ratings (id, trade_id, criterion_key, selected_rating, score, max_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), id, item.key, item.rating, item.score, item.maxScore]
      );
    }
    await client.query(
      `INSERT INTO app.trade_entries (
        id, trade_id, entry_type, entry_date, entry_time, price, quantity,
        capital_allocated, initial_stop, risk_amount, risk_percent,
        r_multiple_at_entry, note, context, created_at, updated_at
      ) VALUES ($1, $2, 'INITIAL', $3, $4, $5, $6, $7, $8, $9, $10, 0, $11, $12::jsonb, $13, $13)`,
      [crypto.randomUUID(), id, plan.metadata.entryDate || plan.entryTimestamp.slice(0, 10),
        new Date(plan.entryTimestamp).toTimeString().slice(0, 8),
        plan.entry, plan.metadata.executedQuantity, totalCapital, plan.stop,
        Math.abs(plan.entry - plan.stop) * plan.metadata.executedQuantity,
        plan.riskPct, 'Entrada inicial registrada no plano.',
        JSON.stringify({ initialRisk: Math.abs(plan.entry - plan.stop) * plan.metadata.executedQuantity }), plan.entryTimestamp]
    );
    await client.query(
      `INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, stop_price, atr, note, occurred_at)
       VALUES ($1, $2, 'entry', $3, $4, $5, $6, $7, $8)`,
      [crypto.randomUUID(), id, plan.metadata.executedQuantity, plan.entry, plan.stop, plan.atr,
        plan.metadata.executedQuantity === plan.plannedQuantity ? 'Trade registrado conforme quantidade sugerida.' : `Quantidade registrada diferente da sugestão: ${plan.plannedQuantity} unidades.`, plan.entryTimestamp]
    );
  });
  return { id, ticker: plan.ticker, status: 'open', rubricGrade: plan.rubricGrade, setupTrigger: plan.setupTrigger, executionPrice: plan.entry, executedQuantity: plan.metadata.executedQuantity };
}

async function createPendingOrder(userId, payload) {
  const norm = paperPendingModel.normalizePendingOrderPayload(payload);

  return database.transaction(async (client) => {
    // 1. Impede ordens pendentes duplicadas para o mesmo ativo no Paper Trading
    const existing = await client.query(
      `SELECT id, ticker, status FROM app.trades
        WHERE user_id = $1 AND ticker = $2 AND status = 'pending'
        LIMIT 1`,
      [userId, norm.ticker]
    );
    if (existing.rowCount > 0) {
      throw invalid(`Já existe uma ordem pendente para o ativo ${norm.ticker} aguardando execução no Paper Trading.`);
    }

    const id = crypto.randomUUID();
    const metadata = {
      gradingVersion: 2,
      mode: 'paper',
      isPendingOrder: true,
      thesis: norm.notes,
      signalDate: norm.signalDate,
      triggerId: norm.setupTrigger,
      triggerName: norm.setup,
      snapshotMarketData: norm.snapshotMarketData
    };

    const pendingSnapshot = {
      signalDate: norm.signalDate,
      createdAt: new Date().toISOString(),
      plannedEntry: norm.entry,
      plannedStop: norm.stop,
      plannedQuantity: norm.quantity,
      trigger: norm.setupTrigger,
      triggerName: norm.setup,
      validitySessions: norm.validitySessions,
      rule: 'buy_stop_above_level',
      snapshotMarketData: norm.snapshotMarketData
    };

    await client.query(
      `INSERT INTO app.trades (
        id, user_id, ticker, market, direction, setup, entry_price, stop_price, atr,
        planned_quantity, risk_pct, rubric_score, rubric_max_score, rubric_grade,
        rubric_responses, status, metadata, pending_snapshot, setup_trigger,
        scale_in_enabled, scale_in_count, total_quantity, average_entry_price, total_allocated_capital, current_risk_percent
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14, $15::jsonb, 'pending', $16::jsonb, $17::jsonb, $18,
        false, 0, $10, $7, 0, 0
      )`,
      [
        id, userId, norm.ticker, norm.market, norm.direction, norm.setup, norm.entry, norm.stop,
        norm.snapshotMarketData.lastPrice ? Number(norm.snapshotMarketData.lastPrice) : null,
        norm.quantity, norm.riskPct, norm.snapshotMarketData.rubricScore, 100, norm.snapshotMarketData.grade,
        JSON.stringify({}), JSON.stringify(metadata), JSON.stringify(pendingSnapshot), norm.setupTrigger
      ]
    );

    return {
      id,
      ticker: norm.ticker,
      status: 'pending',
      mode: 'paper',
      entry: norm.entry,
      stop: norm.stop,
      quantity: norm.quantity,
      setup: norm.setup,
      setupTrigger: norm.setupTrigger,
      signalDate: norm.signalDate,
      pendingSnapshot
    };
  });
}

async function verifyPendingOrders(userId, options = {}) {
  let b3Histories = null;
  if (options.candlesMap) {
    b3Histories = options.candlesMap;
  } else {
    try {
      const tickerChart = options.tickerChart || require('./ticker-chart');
      if (tickerChart && typeof tickerChart.loadB3History === 'function') {
        b3Histories = tickerChart.loadB3History();
      }
    } catch (_) {}
  }

  const queryParams = userId ? [userId] : [];
  const whereClause = userId
    ? `WHERE user_id = $1 AND status = 'pending' AND (metadata->>'mode') = 'paper'`
    : `WHERE status = 'pending' AND (metadata->>'mode') = 'paper'`;

  const pendingRows = await database.query(
    `SELECT id, user_id, ticker, market, direction, setup, setup_trigger,
            entry_price, stop_price, planned_quantity, risk_pct, metadata, pending_snapshot
       FROM app.trades
       ${whereClause}
       ORDER BY created_at ASC`,
    queryParams
  );

  const results = [];
  let executedCount = 0;
  let discardedCount = 0;
  let pendingCount = 0;

  for (const trade of pendingRows.rows) {
    const symbol = String(trade.ticker || '').trim().toUpperCase();
    const candles = b3Histories ? (b3Histories.get(symbol) || []) : [];
    const evaluation = paperPendingModel.verifyPendingOrder(trade, candles, options);

    if (evaluation.outcome === 'EXECUTED') {
      await database.transaction(async (client) => {
        const totalCapital = evaluation.executionPrice * evaluation.executedQuantity;
        const executedAt = evaluation.executedAt || new Date().toISOString().slice(0, 10);
        const executionTimestamp = new Date(executedAt + 'T17:00:00-03:00').toISOString();

        await client.query(
          `UPDATE app.trades
              SET status = 'open',
                  execution_price = $1,
                  executed_quantity = $2,
                  executed_at = $3,
                  total_quantity = $2,
                  average_entry_price = $1,
                  total_allocated_capital = $4,
                  current_risk_percent = risk_pct,
                  verified_at = now(),
                  metadata = jsonb_set(
                    jsonb_set(metadata, '{executedAt}', to_jsonb($5::text), true),
                    '{verificationLog}', to_jsonb($6::text)::jsonb, true
                  ),
                  updated_at = now()
            WHERE id = $7 AND status = 'pending'`,
          [
            evaluation.executionPrice,
            evaluation.executedQuantity,
            executionTimestamp,
            totalCapital,
            executedAt,
            JSON.stringify(evaluation),
            trade.id
          ]
        );

        await client.query(
          `INSERT INTO app.trade_entries (
            id, trade_id, entry_type, entry_date, entry_time, price, quantity,
            capital_allocated, initial_stop, risk_amount, risk_percent,
            r_multiple_at_entry, note, context, created_at, updated_at
          ) VALUES ($1, $2, 'INITIAL', $3, '17:00:00', $4, $5, $6, $7, $8, $9, 0, $10, $11::jsonb, $12, $12)`,
          [
            crypto.randomUUID(),
            trade.id,
            executedAt,
            evaluation.executionPrice,
            evaluation.executedQuantity,
            totalCapital,
            trade.stop_price,
            Math.abs(evaluation.executionPrice - Number(trade.stop_price)) * evaluation.executedQuantity,
            trade.risk_pct,
            'Entrada executada automaticamente no fechamento do pregão.',
            JSON.stringify({ verifiedOutcome: 'EXECUTED', candle: evaluation.dataSnapshot }),
            executionTimestamp
          ]
        );

        await client.query(
          `INSERT INTO app.trade_events (
            id, trade_id, event_type, quantity, price, stop_price, note, occurred_at
          ) VALUES ($1, $2, 'entry', $3, $4, $5, $6, $7)`,
          [
            crypto.randomUUID(),
            trade.id,
            evaluation.executedQuantity,
            evaluation.executionPrice,
            trade.stop_price,
            'Entrada confirmada automaticamente após fechamento do pregão.',
            executionTimestamp
          ]
        );
      });

      executedCount++;
      results.push({ id: trade.id, ticker: trade.ticker, outcome: 'EXECUTED', status: 'open', details: evaluation });
    } else if (evaluation.isDiscarded) {
      await database.transaction(async (client) => {
        await client.query(
          `UPDATE app.trades
              SET status = 'cancelled',
                  discard_reason = $1,
                  verified_at = now(),
                  metadata = jsonb_set(metadata, '{discardLog}', to_jsonb($2::text)::jsonb, true),
                  updated_at = now()
            WHERE id = $3 AND status = 'pending'`,
          [
            evaluation.discardReason || evaluation.reason,
            JSON.stringify(evaluation),
            trade.id
          ]
        );
      });

      discardedCount++;
      results.push({ id: trade.id, ticker: trade.ticker, outcome: evaluation.outcome, status: 'cancelled', details: evaluation });
    } else {
      pendingCount++;
      results.push({ id: trade.id, ticker: trade.ticker, outcome: 'PENDING', status: 'pending', details: evaluation });
    }
  }

  return {
    verifiedCount: pendingRows.rowCount || 0,
    executedCount,
    discardedCount,
    pendingCount,
    results
  };
}

async function listPlans(userId) {
  const result = await database.query(
    `SELECT t.id, t.ticker, t.market, t.direction, t.setup, t.setup_trigger, t.entry_price, t.stop_price, t.atr, t.planned_quantity,
            t.risk_pct, t.rubric_score, t.rubric_max_score, t.rubric_grade, t.rubric_responses, t.status, t.metadata,
            t.pending_snapshot, t.discard_reason, t.verified_at,
            t.execution_price, t.executed_quantity, t.executed_at, t.created_at, t.updated_at,
            t.scale_in_enabled, t.scale_in_count, t.total_quantity, t.average_entry_price, t.total_allocated_capital, t.current_risk_percent,
            COALESCE(events.items, '[]'::jsonb) AS events,
            COALESCE(entries.items, '[]'::jsonb) AS entries
       FROM app.trades t
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(jsonb_build_object(
           'id', e.id, 'type', e.event_type, 'qty', e.quantity, 'price', e.price,
           'stop', e.stop_price, 'atr', e.atr, 'note', e.note, 'at', e.occurred_at, 'createdAt', e.created_at, 'context', e.context
         ) ORDER BY CASE WHEN e.event_type = 'entry' THEN 0 ELSE 1 END, e.occurred_at, e.created_at) AS items
         FROM app.trade_events e WHERE e.trade_id = t.id
       ) events ON true
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(jsonb_build_object(
           'id', en.id, 'type', en.entry_type, 'date', en.entry_date, 'time', en.entry_time,
           'price', en.price, 'qty', en.quantity, 'capital', en.capital_allocated,
           'stop', en.initial_stop, 'riskAmount', en.risk_amount, 'riskPct', en.risk_percent,
           'rAtEntry', en.r_multiple_at_entry, 'note', en.note, 'context', en.context,
           'createdAt', en.created_at
         ) ORDER BY en.created_at) AS items
         FROM app.trade_entries en WHERE en.trade_id = t.id
       ) entries ON true
       WHERE t.user_id = $1 ORDER BY t.created_at DESC`,
    [userId]
  );
  return result.rows.map(row => ({
    ...row,
    setupTrigger: row.setup_trigger || setupTriggers.normalizeKey(row.setup) || null,
    pending_snapshot: row.pending_snapshot || row.metadata?.pendingSnapshot || null,
    discard_reason: row.discard_reason || null,
    verified_at: row.verified_at || null,
    scale_in_enabled: row.scale_in_enabled !== false,
    scale_in_count: Number(row.scale_in_count || 0),
    total_quantity: Number(row.total_quantity || row.executed_quantity || row.planned_quantity || 0),
    average_entry_price: Number(row.average_entry_price || row.execution_price || row.entry_price || 0),
    total_allocated_capital: Number(row.total_allocated_capital || 0),
    current_risk_percent: Number(row.current_risk_percent || row.risk_pct || 0)
  }));
}

function normalizePositionEvent(type, payload = {}) {
  if (!['update', 'peeloff', 'close'].includes(type)) throw invalid('Tipo de evento inválido.');
  const event = { type, note: String(payload.note || '').slice(0, 4000) };
  if (type === 'update') {
    event.price = number(payload.price, 'Preço atual', { minimum: 0.000001, required: true });
    event.stop = number(payload.stop, 'Novo stop', { minimum: 0.000001, required: true });
    event.atr = number(payload.atr, 'ATR atual', { minimum: 0 });
  } else {
    event.quantity = number(payload.qty ?? payload.quantity, 'Quantidade', { minimum: 1, required: true });
    if (!Number.isSafeInteger(event.quantity)) throw invalid('Quantidade deve ser um número inteiro de unidades.');
    event.price = number(payload.price, type === 'close' ? 'Preço de saída' : 'Preço da parcial', { minimum: 0.000001, required: true });
  }
  if (payload.occurredAt != null && payload.occurredAt !== '') {
    const date = new Date(payload.occurredAt);
    if (Number.isNaN(date.getTime())) throw invalid('Data/hora da parcial é inválida.');
    event.occurredAt = date.toISOString();
  }
  return event;
}

async function recordPositionEvent(userId, tradeId, type, payload) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Trade inválido.');
  if (type === 'scale_in') {
    return addScaleIn(userId, tradeId, payload);
  }
  const event = normalizePositionEvent(type, payload);
  return database.transaction(async (client) => {
    const current = await client.query(
      `SELECT id, status, executed_quantity, execution_price, entry_price, stop_price, direction,
              total_quantity, average_entry_price, total_allocated_capital, current_risk_percent
         FROM app.trades WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [tradeId, userId]
    );
    if (!current.rowCount) throw invalid('Trade não encontrado.');
    if (current.rows[0].status !== 'open') throw invalid('A gestão só está disponível para posições abertas.');
    const exits = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) AS total FROM app.trade_events
        WHERE trade_id = $1 AND event_type IN ('peeloff', 'close')`, [tradeId]
    );
    const totalBought = Number(current.rows[0].total_quantity || current.rows[0].executed_quantity || 0);
    const remaining = totalBought - Number(exits.rows[0].total);
    if (event.quantity && event.quantity > remaining) throw invalid('A quantidade precisa ser menor ou igual ao saldo da posição.');
    if (event.type === 'peeloff' && event.quantity >= remaining) throw invalid('Para encerrar toda a posição, registre um encerramento.');
    const history = await client.query(
      `SELECT event_type AS type, quantity AS qty, price, stop_price AS stop, context
         FROM app.trade_events WHERE trade_id = $1 ORDER BY CASE WHEN event_type = 'entry' THEN 0 ELSE 1 END, occurred_at, created_at`, [tradeId]
    );
    const trade = current.rows[0];
    const entryEvent = history.rows.find(item => item.type === 'entry');
    const events = entryEvent ? history.rows : [{ type: 'entry', qty: trade.executed_quantity, price: trade.execution_price ?? trade.entry_price, stop: trade.stop_price }, ...history.rows];
    const entry = Number(entryEvent?.price ?? trade.execution_price ?? trade.entry_price);
    const avgEntry = Number(trade.average_entry_price || entry);
    const priceBearingEvents = events.filter(item => Number(item.price) > 0);
    const latestUpdateEvent = priceBearingEvents.filter(item => item.type === 'update').pop();
    const currentPrice = Number(latestUpdateEvent?.price ?? priceBearingEvents.pop()?.price ?? entry);
    const basis = { entry, initialStop: Number(entryEvent?.stop ?? trade.stop_price), initialQty: Number(entryEvent?.qty ?? trade.executed_quantity),
      direction: trade.direction || 'long', currentPrice, currentStop: Number(trade.stop_price), events };
    const before = management.state(basis, management.metricsFromEvents(basis));
    const afterEvents = [...events, { type: event.type, qty: event.quantity, price: event.price, stop: event.stop }];
    const next = { ...basis, currentPrice: event.price, currentStop: event.stop ?? basis.currentStop, events: afterEvents };
    const after = management.state(next, management.metricsFromEvents(next));
    const r = after.currentR;
    if (event.type === 'peeloff' && payload?.source === 'sell_into_strength') {
      const policy = await client.query('SELECT policy FROM app.risk_policies WHERE user_id = $1', [userId]);
      const sell = management.settings(policy.rows[0]?.policy?.sellIntoStrength);
      if (!sell.enabled || r == null || r < sell.startR) throw invalid('Sell Into Strength só está disponível na zona configurada.');
    }
    const historicalR = events.map(item => management.currentR({ ...basis, currentPrice: Number(item.price) || entry })).filter(Number.isFinite);
    const previousPeak = Math.max(...historicalR, -Infinity);
    const previousTrough = Math.min(...historicalR, Infinity);
    const milestones = [2, 3].filter(level => r != null && r >= level && previousPeak < level).map(level => `${level}R`);
    const source = event.type === 'peeloff' && payload?.source === 'sell_into_strength' ? 'sell_into_strength' : event.type === 'peeloff' ? 'risk_peel' : event.type;
    const partialProfit = event.quantity ? (event.price - avgEntry) * (basis.direction === 'short' ? -1 : 1) * event.quantity : 0;
    const context = {
      source, rAtEvent: r, rAtExit: event.quantity ? r : null,
      percentRealized: event.quantity ? event.quantity / remaining * 100 : null,
      partialProfit, totalRealizedProfit: after.realizedProfit,
      runnerProfit: event.type === 'close' && event.quantity === remaining && before.runner ? partialProfit : null,
      remainingQuantity: after.remaining, ongoingRisk: after.ongoingRisk,
      freeRollCoverage: Number.isFinite(after.coverage) ? after.coverage : null,
      freeRollActivated: !before.freeRoll && after.freeRoll,
      freeRollActive: after.freeRoll, peakR: Math.max(previousPeak, r ?? -Infinity),
      troughR: Math.min(previousTrough, r ?? Infinity), milestones
    };
    const eventId = crypto.randomUUID();
    await client.query(
      `INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, stop_price, atr, note, context, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, COALESCE($10::timestamptz, now()))`,
      [eventId, tradeId, event.type, event.quantity || null, event.price, event.stop || null, event.atr || null, event.note, JSON.stringify(context), event.occurredAt || null]
    );
    const shouldClose = event.type === 'close' && event.quantity === remaining;
    if (event.type === 'update') {
      await client.query(`UPDATE app.trades SET stop_price = $3, atr = COALESCE($4, atr), updated_at = now() WHERE id = $1 AND user_id = $2`, [tradeId, userId, event.stop, event.atr]);
    } else if (shouldClose) {
      await client.query(`UPDATE app.trades SET status = 'closed', total_allocated_capital = 0, current_risk_percent = 0, updated_at = now() WHERE id = $1 AND user_id = $2`, [tradeId, userId]);
    } else if (event.type === 'peeloff') {
      const remainingCapital = Math.max(0, after.remaining * avgEntry);
      await client.query(`UPDATE app.trades SET total_allocated_capital = $3, updated_at = now() WHERE id = $1 AND user_id = $2`, [tradeId, userId, remainingCapital]);
    }
    return { id: eventId, ...event, context, remaining: remaining - (event.quantity || 0), status: shouldClose ? 'closed' : 'open' };
  });
}

function normalizeExecution(payload = {}) {
  return {
    quantity: number(payload.executedQty ?? payload.executedQuantity, 'Quantidade executada', { minimum: 1, required: true }),
    price: number(payload.executionPrice ?? payload.execution_price, 'Preço de execução', { minimum: 0.000001, required: true })
  };
}

async function executePlan(userId, tradeId, payload) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Plano inválido.');
  const execution = normalizeExecution(payload);
  return database.transaction(async (client) => {
    const current = await client.query(
      `SELECT id, ticker, status, planned_quantity, entry_price, stop_price, risk_pct, metadata
         FROM app.trades WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [tradeId, userId]
    );
    if (!current.rowCount) throw invalid('Plano não encontrado.');
    if (current.rows[0].status !== 'planned') throw invalid('Este plano já foi executado ou não está disponível.');
    const totalAllocatedCapital = execution.price * execution.quantity;
    const result = await client.query(
      `UPDATE app.trades
          SET status = 'open', execution_price = $3, executed_quantity = $4, executed_at = now(),
              total_quantity = $4, average_entry_price = $3, total_allocated_capital = $5,
              metadata = jsonb_set(metadata, '{executedQuantity}', to_jsonb($4::numeric), true)
        WHERE id = $1 AND user_id = $2
        RETURNING id, ticker, status, execution_price, executed_quantity, executed_at,
                  total_quantity, average_entry_price, total_allocated_capital, scale_in_enabled, scale_in_count`,
      [tradeId, userId, execution.price, execution.quantity, totalAllocatedCapital]
    );
    await client.query(
      `INSERT INTO app.trade_entries (
        id, trade_id, entry_type, entry_date, entry_time, price, quantity,
        capital_allocated, initial_stop, risk_amount, risk_percent,
        r_multiple_at_entry, note, context
      ) VALUES ($1, $2, 'INITIAL', CURRENT_DATE, CURRENT_TIME, $3, $4, $5, $6, $7, $8, 0, 'Execução do plano confirmada.', '{}'::jsonb)
      ON CONFLICT (id) DO NOTHING`,
      [
        crypto.randomUUID(), tradeId, execution.price, execution.quantity,
        totalAllocatedCapital, current.rows[0].stop_price || null,
        Math.abs(execution.price - (Number(current.rows[0].stop_price) || 0)) * execution.quantity,
        Number(current.rows[0].risk_pct) || 0
      ]
    );
    return result.rows[0];
  });
}

async function updateTrade(userId, tradeId, payload = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Trade inválido.');
  let setupTrigger = undefined;
  let setupLabel = undefined;
  if (payload.setupTrigger !== undefined || payload.setup_trigger !== undefined) {
    const raw = payload.setupTrigger ?? payload.setup_trigger;
    if (raw === null || raw === '') {
      setupTrigger = null;
      setupLabel = null;
    } else {
      const normalized = setupTriggers.normalizeKey(raw);
      if (!normalized || !setupTriggers.isValidTrigger(normalized)) {
        throw invalid('Gatilho de entrada inválido. Selecione um dos 5 gatilhos homologados.');
      }
      setupTrigger = normalized;
      setupLabel = setupTriggers.getTriggerLabel(normalized);
    }
  }
  let scaleInEnabled = undefined;
  if (payload.scale_in_enabled !== undefined || payload.scaleInEnabled !== undefined) {
    scaleInEnabled = Boolean(payload.scale_in_enabled ?? payload.scaleInEnabled);
  }

  const result = await database.query(
    `UPDATE app.trades
        SET setup_trigger = COALESCE($3, setup_trigger),
            setup = COALESCE($4, setup),
            scale_in_enabled = COALESCE($5, scale_in_enabled),
            updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING id, ticker, status, setup, setup_trigger, scale_in_enabled, scale_in_count, total_quantity, average_entry_price, total_allocated_capital, current_risk_percent`,
    [tradeId, userId, setupTrigger, setupLabel, scaleInEnabled]
  );
  if (!result.rowCount) throw invalid('Trade não encontrado.');
  return {
    ...result.rows[0],
    setupTrigger: result.rows[0].setup_trigger
  };
}

async function getAccountEquity(userId, client = database) {
  try {
    const adj = await client.query(
      `SELECT new_amount FROM app.wealth_adjustments WHERE user_id = $1 ORDER BY adjusted_at DESC, created_at DESC LIMIT 1`,
      [userId]
    ).catch(() => ({ rowCount: 0, rows: [] }));
    if (adj.rowCount && Number(adj.rows[0].new_amount) > 0) return Number(adj.rows[0].new_amount);

    const snap = await client.query(
      `SELECT amount FROM app.wealth_snapshots WHERE user_id = $1 AND snapshot_type = 'real_wealth' ORDER BY occurred_at DESC, created_at DESC LIMIT 1`,
      [userId]
    ).catch(() => ({ rowCount: 0, rows: [] }));
    if (snap.rowCount && Number(snap.rows[0].amount) > 0) return Number(snap.rows[0].amount);

    const stratSnap = await client.query(
      `SELECT amount FROM app.wealth_snapshots WHERE user_id = $1 AND snapshot_type = 'strategy_equity' ORDER BY occurred_at DESC, created_at DESC LIMIT 1`,
      [userId]
    ).catch(() => ({ rowCount: 0, rows: [] }));
    if (stratSnap.rowCount && Number(stratSnap.rows[0].amount) > 0) return Number(stratSnap.rows[0].amount);

    const set = await client.query(
      `SELECT strategy_base FROM app.wealth_settings WHERE user_id = $1`,
      [userId]
    ).catch(() => ({ rowCount: 0, rows: [] }));
    if (set.rowCount && Number(set.rows[0].strategy_base) > 0) return Number(set.rows[0].strategy_base);
  } catch (_) {}
  return 1029500;
}

async function validateScaleIn(userId, tradeId, payload = {}, clientOverride = null) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Trade inválido.');
  const query = clientOverride ? clientOverride.query.bind(clientOverride) : database.query.bind(database);

  const tradeRes = await query(
    `SELECT t.*,
            COALESCE(events.items, '[]'::jsonb) AS events,
            COALESCE(entries.items, '[]'::jsonb) AS entries
       FROM app.trades t
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(jsonb_build_object(
           'id', e.id, 'type', e.event_type, 'qty', e.quantity, 'price', e.price,
           'stop', e.stop_price, 'atr', e.atr, 'note', e.note, 'at', e.occurred_at, 'context', e.context
         ) ORDER BY CASE WHEN e.event_type = 'entry' THEN 0 ELSE 1 END, e.occurred_at, e.created_at) AS items
         FROM app.trade_events e WHERE e.trade_id = t.id
       ) events ON true
       LEFT JOIN LATERAL (
         SELECT jsonb_agg(jsonb_build_object(
           'id', en.id, 'type', en.entry_type, 'date', en.entry_date, 'time', en.entry_time,
           'price', en.price, 'qty', en.quantity, 'capital', en.capital_allocated,
           'stop', en.initial_stop, 'riskAmount', en.risk_amount, 'riskPct', en.risk_percent,
           'rAtEntry', en.r_multiple_at_entry, 'note', en.note, 'context', en.context,
           'createdAt', en.created_at
         ) ORDER BY en.created_at) AS items
         FROM app.trade_entries en WHERE en.trade_id = t.id
       ) entries ON true
       WHERE t.id = $1 AND t.user_id = $2`,
    [tradeId, userId]
  );
  if (!tradeRes.rowCount) throw invalid('Trade não encontrado.');
  const trade = tradeRes.rows[0];

  const policyRes = await query('SELECT policy FROM app.risk_policies WHERE user_id = $1', [userId]);
  const policy = policyRes.rows?.[0]?.policy || {};

  let openTrades = [];
  try {
    const openTradesRes = await query(
      `SELECT t.id, t.direction, t.execution_price, t.entry_price, t.stop_price, t.executed_quantity, t.planned_quantity, t.status, t.metadata,
              COALESCE(events.items, '[]'::jsonb) AS events
         FROM app.trades t
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(jsonb_build_object(
             'id', e.id, 'type', e.event_type, 'qty', e.quantity, 'price', e.price,
             'stop', e.stop_price, 'atr', e.atr, 'note', e.note, 'at', e.occurred_at
           ) ORDER BY CASE WHEN e.event_type = 'entry' THEN 0 ELSE 1 END, e.occurred_at, e.created_at) AS items
           FROM app.trade_events e WHERE e.trade_id = t.id
         ) events ON true
         WHERE t.user_id = $1 AND t.status = 'open'`,
      [userId]
    );
    openTrades = openTradesRes.rows || [];
  } catch (_) {}

  const equity = payload.equity ? Number(payload.equity) : await getAccountEquity(userId, { query });
  return scaleInModel.canExecuteScaleIn({
    trade,
    scaleIn: payload,
    equity,
    policy,
    openTrades
  });
}

async function addScaleIn(userId, tradeId, payload = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Trade inválido.');
  return database.transaction(async (client) => {
    const lockedTrade = await client.query(
      `SELECT id, status, scale_in_enabled FROM app.trades WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [tradeId, userId]
    );
    if (!lockedTrade.rowCount) throw invalid('Trade não encontrado.');
    if (lockedTrade.rows[0].status !== 'open') throw invalid('A gestão só está disponível para posições abertas.');

    const validation = await validateScaleIn(userId, tradeId, payload, client);
    if (!validation.allowed) {
      throw invalid(validation.reason || 'Scale-In não autorizado pela Política de Risco.');
    }

    const { metrics } = validation;
    const additionNumber = metrics.additionNumber;
    const now = new Date();
    const entryDate = payload.date || payload.entryDate || now.toISOString().slice(0, 10);
    const entryTime = payload.time || payload.entryTime || now.toTimeString().slice(0, 8);
    const occurredAt = payload.occurredAt ? new Date(payload.occurredAt).toISOString() : now.toISOString();
    const note = String(payload.note || '').trim() || `Scale-In #${additionNumber}: +${metrics.quantity} ações @ R$ ${metrics.price.toFixed(2)}`;

    const context = {
      additionNumber,
      price: metrics.price,
      quantity: metrics.quantity,
      stop: metrics.stop,
      additionalCapital: metrics.additionalCapital,
      additionalRiskCash: metrics.additionalRiskCash,
      additionalRiskPct: metrics.additionalRiskPct,
      averageEntryBefore: metrics.currentAvgPrice,
      averageEntryAfter: metrics.newAvgPrice,
      totalCapitalAfter: metrics.totalCapitalAfter,
      totalRiskPctAfter: metrics.totalRiskPctAfter,
      heatBefore: metrics.currentHeatPct,
      heatAfter: metrics.projectedHeatPct,
      rAtEntry: metrics.currentR
    };

    const entryId = crypto.randomUUID();
    const eventId = crypto.randomUUID();

    await client.query(
      `INSERT INTO app.trade_entries (
        id, trade_id, entry_type, entry_date, entry_time, price, quantity,
        capital_allocated, initial_stop, risk_amount, risk_percent,
        r_multiple_at_entry, note, context, created_at, updated_at
      ) VALUES ($1, $2, 'SCALE_IN', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $14)`,
      [
        entryId, tradeId, entryDate, entryTime, metrics.price, metrics.quantity,
        metrics.additionalCapital, metrics.stop, metrics.additionalRiskCash, metrics.additionalRiskPct,
        metrics.currentR, note, JSON.stringify(context), occurredAt
      ]
    );

    await client.query(
      `INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, stop_price, atr, note, context, occurred_at)
       VALUES ($1, $2, 'scale_in', $3, $4, $5, null, $6, $7::jsonb, $8)`,
      [
        eventId, tradeId, metrics.quantity, metrics.price, metrics.stop,
        note, JSON.stringify(context), occurredAt
      ]
    );

    const updatedRes = await client.query(
      `UPDATE app.trades
          SET scale_in_count = scale_in_count + 1,
              total_quantity = $3,
              average_entry_price = $4,
              total_allocated_capital = $5,
              current_risk_percent = $6,
              updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING id, ticker, status, scale_in_enabled, scale_in_count, total_quantity, average_entry_price, total_allocated_capital, current_risk_percent`,
      [tradeId, userId, metrics.newQuantity, metrics.newAvgPrice, metrics.totalCapitalAfter, metrics.totalRiskPctAfter]
    );

    return {
      success: true,
      scaleIn: {
        id: entryId,
        tradeId,
        entryType: 'SCALE_IN',
        date: entryDate,
        time: entryTime,
        price: metrics.price,
        quantity: metrics.quantity,
        capital: metrics.additionalCapital,
        stop: metrics.stop,
        riskAmount: metrics.additionalRiskCash,
        riskPct: metrics.additionalRiskPct,
        rAtEntry: metrics.currentR,
        note,
        context
      },
      validation,
      trade: updatedRes.rows[0]
    };
  });
}

async function listScaleIns(userId, tradeId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Trade inválido.');
  const result = await database.query(
    `SELECT id, entry_type AS "entryType", entry_date AS date, entry_time AS time,
            price, quantity, capital_allocated AS capital, initial_stop AS stop,
            risk_amount AS "riskAmount", risk_percent AS "riskPct",
            r_multiple_at_entry AS "rAtEntry", note, context, created_at AS "createdAt"
       FROM app.trade_entries
      WHERE trade_id = $1 AND entry_type = 'SCALE_IN'
      ORDER BY created_at ASC`,
    [tradeId]
  );
  return result.rows;
}

async function deleteTrade(userId, tradeId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(tradeId || ''))) throw invalid('Trade inválido.');
  return database.transaction(async (client) => {
    const tradeRes = await client.query(
      `SELECT id, user_id, ticker, status, scale_in_count, metadata
         FROM app.trades
        WHERE id = $1 AND user_id = $2
        FOR UPDATE`,
      [tradeId, userId]
    );

    if (!tradeRes.rowCount) throw invalid('Posição não encontrada.');
    const trade = tradeRes.rows[0];

    if (trade.status !== 'open' && trade.status !== 'pending') {
      throw invalid('Apenas posições em aberto ou pendentes podem ser excluídas.');
    }

    const eventsRes = await client.query(
      `SELECT event_type AS type, quantity AS qty, price
         FROM app.trade_events
        WHERE trade_id = $1`,
      [tradeId]
    );

    const entriesRes = await client.query(
      `SELECT entry_type AS type, quantity AS qty
         FROM app.trade_entries
        WHERE trade_id = $1`,
      [tradeId]
    );

    const positionData = {
      ...trade,
      events: eventsRes.rows,
      entries: entriesRes.rows
    };

    const validation = management.canDeletePosition(positionData);
    if (!validation.eligible) {
      throw invalid(validation.reason);
    }

    await client.query(`DELETE FROM app.trades WHERE id = $1 AND user_id = $2`, [tradeId, userId]);

    const metadata = trade.metadata && typeof trade.metadata === 'object' ? trade.metadata : {};
    return {
      success: true,
      deletedId: tradeId,
      ticker: trade.ticker,
      mode: metadata.mode === 'paper' ? 'paper' : 'real'
    };
  });
}


module.exports = {
  createPlan,
  createPendingOrder,
  verifyPendingOrders,
  listPlans,
  executePlan,
  updateTrade,
  deleteTrade,
  recordPositionEvent,
  canExecuteScaleIn: validateScaleIn,
  addScaleIn,
  listScaleIns,
  getAccountEquity,
  normalizePlan,
  validateRareTrade,
  validateMissionRisk,
  normalizeExecution,
  normalizePositionEvent,
  ratingFromValue
};


const crypto = require('node:crypto');
const database = require('./database');
const model = require('../../frontend/trade-simulator-model');
let tickerChart = null;
try {
  tickerChart = require('./ticker-chart');
} catch {
  // Opcional para ambientes de teste isolados
}

function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function mapSimulation(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    symbol: row.symbol,
    companyName: row.company_name || '',
    triggerName: row.trigger_name,
    grade: row.grade || '',
    sector: row.sector || '',
    signalDate: toIsoDate(row.signal_date),
    entryPrice: Number(row.entry_price),
    stopLoss: Number(row.stop_loss),
    status: row.status,
    executedEntryPrice: row.executed_entry_price != null ? Number(row.executed_entry_price) : null,
    entryDate: toIsoDate(row.entry_date),
    currentStop: row.current_stop != null ? Number(row.current_stop) : null,
    currentPrice: row.current_price != null ? Number(row.current_price) : null,
    exitPrice: row.exit_price != null ? Number(row.exit_price) : null,
    exitDate: toIsoDate(row.exit_date),
    exitReason: row.exit_reason || null,
    resultR: row.result_r != null ? Number(row.result_r) : null,
    mfeR: row.mfe_r != null ? Number(row.mfe_r) : null,
    maeR: row.mae_r != null ? Number(row.mae_r) : null,
    timeline: Array.isArray(row.timeline) ? row.timeline : (typeof row.timeline === 'string' ? JSON.parse(row.timeline || '[]') : []),
    managementScenario: row.management_scenario || '2R',
    scaleIn: row.scale_in ? (typeof row.scale_in === 'string' ? JSON.parse(row.scale_in) : row.scale_in) : null,
    notes: row.notes || '',
    createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)) : null,
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null
  };
}

/**
 * Retorna as simulações do usuário. Caso não haja registros no banco,
 * retorna a lista padrão de simulações idênticas ao design aprovado.
 */
async function list(userId, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  const result = await client.query(
    `SELECT * FROM app.trade_simulations
     WHERE user_id = $1 AND trigger_name != 'Pullback'
     ORDER BY signal_date DESC, created_at DESC`,
    [userId]
  );

  let simulations;
  if (!result.rows || result.rows.length === 0) {
    // Retorna as simulações de referência calibradas sem Pullback
    simulations = model.getDefaultSeedSimulations('2R');
  } else {
    simulations = result.rows.map(mapSimulation).filter(s => s && s.triggerName !== 'Pullback');
  }

  const stats = model.calculateSimulatorStats(simulations);
  const comparison = model.compareManagementScenarios(simulations.length === 42 ? null : simulations);
  return {
    simulations,
    stats,
    comparison
  };
}

/**
 * Cria uma nova simulação virtual.
 * REGRA INVIOLÁVEL: Clicar em Simular Trade NÃO executa a entrada.
 * O status inicial é SEMPRE 'WAITING_ENTRY'.
 */
async function create(userId, payload = {}, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  const symbol = String(payload.symbol || '').trim().toUpperCase();
  if (!symbol) throw invalid('Ativo é obrigatório.');

  const triggerName = String(payload.triggerName || '').trim();
  if (!triggerName) throw invalid('Nome do gatilho é obrigatório.');

  const entryPrice = Number(payload.entryPrice);
  if (!entryPrice || Number.isNaN(entryPrice) || entryPrice <= 0) {
    throw invalid('Preço de entrada inválido.');
  }

  const stopLoss = Number(payload.stopLoss);
  if (!stopLoss || Number.isNaN(stopLoss) || stopLoss <= 0) {
    throw invalid('Stop loss inválido.');
  }

  const signalDate = toIsoDate(payload.signalDate) || new Date().toISOString().slice(0, 10);
  const companyName = String(payload.companyName || '').trim();
  const grade = String(payload.grade || '').trim();
  const sector = String(payload.sector || '').trim();
  const notes = String(payload.notes || '').trim();

  const id = crypto.randomUUID();
  const initialStatus = model.STATUS.WAITING_ENTRY;

  const timeline = [
    {
      type: 'SIGNAL_IDENTIFIED',
      date: signalDate,
      label: 'Gatilho identificado',
      desc: `${triggerName}${grade ? ' (' + grade + ')' : ''} em ${symbol}`
    },
    {
      type: 'SIMULATION_ADDED',
      date: signalDate,
      label: 'Simulação adicionada',
      desc: 'Registrado no Simulador de Trades'
    },
    {
      type: 'WAITING_ENTRY',
      date: signalDate,
      label: 'Aguardando entrada',
      desc: `Entrada planejada: R$ ${entryPrice.toFixed(2).replace('.', ',')} | Stop: R$ ${stopLoss.toFixed(2).replace('.', ',')}`
    }
  ];

  await client.query(
    `INSERT INTO app.trade_simulations (
      id, user_id, symbol, company_name, trigger_name, grade, sector,
      signal_date, entry_price, stop_loss, status,
      timeline, notes
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11,
      $12, $13
    )`,
    [
      id, userId, symbol, companyName, triggerName, grade, sector,
      signalDate, entryPrice, stopLoss, initialStatus,
      JSON.stringify(timeline), notes
    ]
  );

  const inserted = await client.query(
    `SELECT * FROM app.trade_simulations WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return mapSimulation(inserted.rows[0]);
}

/**
 * Atualiza campos de uma simulação (anotações, stop manual, etc.)
 */
async function update(userId, id, payload = {}, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  if (!id) throw invalid('ID da simulação é obrigatório.');

  const existing = await client.query(
    `SELECT * FROM app.trade_simulations WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (!existing.rows.length) {
    throw invalid('Simulação não encontrada.', 404);
  }

  const updates = [];
  const values = [id, userId];
  let pIdx = 3;

  if (payload.notes !== undefined) {
    updates.push(`notes = $${pIdx++}`);
    values.push(String(payload.notes || ''));
  }
  if (payload.currentStop !== undefined) {
    updates.push(`current_stop = $${pIdx++}`);
    values.push(payload.currentStop != null ? Number(payload.currentStop) : null);
  }
  if (payload.status !== undefined) {
    updates.push(`status = $${pIdx++}`);
    values.push(String(payload.status));
  }

  if (updates.length > 0) {
    await client.query(
      `UPDATE app.trade_simulations
       SET ${updates.join(', ')}
       WHERE id = $1 AND user_id = $2`,
      values
    );
  }

  const res = await client.query(
    `SELECT * FROM app.trade_simulations WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return mapSimulation(res.rows[0]);
}

/**
 * Remove uma simulação virtual.
 */
async function remove(userId, id, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  if (!id) throw invalid('ID da simulação é obrigatório.');

  const res = await client.query(
    `DELETE FROM app.trade_simulations WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return { deleted: res.rows.length > 0 };
}

/**
 * Reseta as simulações para a base padrão calibrada no cenário selecionado ('2R', '2.5R' ou 'PYRAMID_1R_2R').
 */
async function reset(userId, options = {}, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  let opts = options;
  let dbClient = client;
  if (options && typeof options.query === 'function') {
    dbClient = options;
    opts = {};
  }

  const scenario = (typeof opts === 'string' ? opts : opts?.scenario) || '2R';

  await dbClient.query(`DELETE FROM app.trade_simulations WHERE user_id = $1`, [userId]);

  const seeds = model.generateSeedSimulationsForScenario(scenario);
  for (const s of seeds) {
    const id = crypto.randomUUID();
    await dbClient.query(
      `INSERT INTO app.trade_simulations (
        id, user_id, symbol, company_name, trigger_name, grade, sector,
        signal_date, entry_price, stop_loss, status,
        executed_entry_price, entry_date, current_stop, current_price,
        exit_price, exit_date, exit_reason, result_r, mfe_r, mae_r,
        timeline, notes, management_scenario, scale_in
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21,
        $22, $23, $24, $25
      )`,
      [
        id, userId, s.symbol, s.companyName || '', s.triggerName, s.grade || '', s.sector || '',
        s.signalDate, s.entryPrice, s.stopLoss, s.status,
        s.executedEntryPrice, s.entryDate, s.currentStop, s.currentPrice,
        s.exitPrice, s.exitDate, s.exitReason, s.resultR, s.mfeR, s.maeR,
        JSON.stringify(s.timeline || []), s.notes || '',
        scenario, s.scaleIn ? JSON.stringify(s.scaleIn) : null
      ]
    );
  }

  return list(userId, dbClient);
}

/**
 * Retorna a comparação consolidada entre os 3 cenários de gestão de risco
 */
async function compare(userId, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  const data = await list(userId, client);
  return {
    comparison: model.compareManagementScenarios(data.simulations.length === 42 ? null : data.simulations)
  };
}

/**
 * Reavalia simulações ativas contra o histórico diário de candles.
 */
async function evaluate(userId, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  const activeResult = await client.query(
    `SELECT * FROM app.trade_simulations
     WHERE user_id = $1 AND status IN ('WAITING_ENTRY', 'IN_OPERATION')`,
    [userId]
  );

  let updatedCount = 0;
  if (!activeResult.rows.length || !tickerChart) {
    return { updatedCount: 0 };
  }

  for (const row of activeResult.rows) {
    const sim = mapSimulation(row);
    try {
      const tickerData = await tickerChart.getTickerData(sim.symbol);
      const candles = tickerData && Array.isArray(tickerData.ohlc) ? tickerData.ohlc : [];
      if (!candles.length) continue;

      const evaluated = model.evaluateSimulationOnCandles(sim, candles);
      if (evaluated.status !== sim.status || evaluated.resultR !== sim.resultR || evaluated.currentPrice !== sim.currentPrice) {
        await client.query(
          `UPDATE app.trade_simulations
           SET status = $3,
               executed_entry_price = $4,
               entry_date = $5,
               current_stop = $6,
               current_price = $7,
               exit_price = $8,
               exit_date = $9,
               exit_reason = $10,
               result_r = $11,
               mfe_r = $12,
               mae_r = $13,
               timeline = $14
           WHERE id = $1 AND user_id = $2`,
          [
            sim.id, userId, evaluated.status,
            evaluated.executedEntryPrice, evaluated.entryDate,
            evaluated.currentStop, evaluated.currentPrice,
            evaluated.exitPrice, evaluated.exitDate,
            evaluated.exitReason, evaluated.resultR,
            evaluated.mfeR, evaluated.maeR,
            JSON.stringify(evaluated.timeline || [])
          ]
        );
        updatedCount++;
      }
    } catch {
      // Ignora erro individual para não abortar o lote
    }
  }

  return { updatedCount };
}

/**
 * Remove todas as simulações do usuário para limpar a massa de teste.
 */
async function clearAll(userId, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  await client.query(`DELETE FROM app.trade_simulations WHERE user_id = $1`, [userId]);
  return {
    deleted: true,
    simulations: [],
    stats: model.calculateSimulatorStats([])
  };
}

module.exports = {
  list,
  create,
  update,
  remove,
  reset,
  clearAll,
  evaluate,
  compare,
  mapSimulation
};

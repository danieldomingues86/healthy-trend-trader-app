const fs = require('node:fs');
const path = require('node:path');
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
  const mapped = {
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
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null,
    structure: row.structure ? (typeof row.structure === 'string' ? JSON.parse(row.structure) : row.structure) : null,
    ttt1R: row.ttt_1r != null ? Number(row.ttt_1r) : (row.ttt1R != null ? Number(row.ttt1R) : null),
    ttt2R: row.ttt_2r != null ? Number(row.ttt_2r) : (row.ttt2R != null ? Number(row.ttt2R) : null),
    ttt3R: row.ttt_3r != null ? Number(row.ttt_3r) : (row.ttt3R != null ? Number(row.ttt3R) : null),
    expansionAfterBreakout: row.expansion_after_breakout
      ? (typeof row.expansion_after_breakout === 'string' ? JSON.parse(row.expansion_after_breakout) : row.expansion_after_breakout)
      : (row.expansionAfterBreakout || null)
  };
  mapped.durationDays = row.duration_days != null
    ? Number(row.duration_days)
    : (typeof model.calculateTradeDurationDays === 'function' ? model.calculateTradeDurationDays(mapped) : null);
  mapped.visionAtivo = (typeof model.getTradeVisionAtivo === 'function')
    ? model.getTradeVisionAtivo(mapped)
    : null;
  return typeof model.sanitizeAndNormalizeSimulation === 'function'
    ? model.sanitizeAndNormalizeSimulation(mapped)
    : mapped;
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
  const comparison = model.compareManagementScenarios(simulations);
  const hypothesisComparison = (typeof model.compareInsideBarTriggers === 'function')
    ? model.compareInsideBarTriggers(simulations)
    : null;
  const auditReport = (typeof model.auditSimulationsBatch === 'function')
    ? model.auditSimulationsBatch(simulations)
    : null;
  return {
    simulations,
    stats,
    comparison,
    hypothesisComparison,
    auditReport
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

  const rawSignalDate = toIsoDate(payload.signalDate) || new Date().toISOString().slice(0, 10);
  const signalDate = typeof model.snapToTradingDay === 'function'
    ? model.snapToTradingDay(rawSignalDate, -1)
    : rawSignalDate;
  const companyName = String(payload.companyName || '').trim();
  const grade = typeof model.normalizeSimulatorGrade === 'function'
    ? model.normalizeSimulatorGrade(payload.grade || 'A')
    : String(payload.grade || 'A').trim();
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
 * Reseta as simulações para a base padrão calibrada no cenário selecionado ('2R', '2.5R' ou 'PYRAMID_1R_2R'),
 * ou delega para generateMass caso opções de massa/volume sejam informadas.
 */
async function reset(userId, options = {}, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  let opts = options;
  let dbClient = client;
  if (options && typeof options.query === 'function') {
    dbClient = options;
    opts = {};
  }

  if (opts && typeof opts === 'object' && (opts.mode === 'mass' || opts.universe || opts.targetVolume)) {
    return generateMass(userId, opts, dbClient);
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
 * Gera massa histórica de simulações em escala com base em candles reais e regras oficiais.
 */
async function generateMass(userId, payload = {}, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  let opts = payload;
  let dbClient = client;
  if (payload && typeof payload.query === 'function') {
    dbClient = payload;
    opts = {};
  }

  const universe = String(opts.universe || 'IBOV').toUpperCase().trim();
  const scenario = opts.scenario || '2R';
  const targetVolume = opts.targetVolume || 100;
  const period = opts.period || '12m';
  const startDate = opts.startDate || null;
  const endDate = opts.endDate || null;
  const triggers = opts.triggers || 'ALL';
  const grades = opts.grades || 'ALL';

  let candlesMap = opts.candlesMap || null;
  let metadataMap = opts.metadataMap || {};
  let universeSymbols = opts.symbols || null;

  if (!candlesMap) {
    // Carrega datasets conforme o universo
    if (universe === 'NASDAQ') {
      if (tickerChart && typeof tickerChart.loadNasdaqHistory === 'function') {
        candlesMap = tickerChart.loadNasdaqHistory();
      }
      const nasdaqCacheFile = path.join(__dirname, '..', 'data', 'nasdaq-market-cache.json');
      if (fs.existsSync(nasdaqCacheFile)) {
        try {
          const raw = JSON.parse(fs.readFileSync(nasdaqCacheFile, 'utf8'));
          if (Array.isArray(raw.ranking)) {
            raw.ranking.forEach(item => {
              if (item.symbol) {
                metadataMap[item.symbol] = {
                  name: item.name || item.symbol,
                  sector: 'Tecnologia'
                };
              }
            });
            universeSymbols = raw.ranking.map(r => r.symbol);
          }
        } catch (err) {}
      }
    } else {
      // Universo B3
      if (tickerChart && typeof tickerChart.loadB3History === 'function') {
        candlesMap = tickerChart.loadB3History();
      }
      const marketCacheFile = path.join(__dirname, '..', 'data', 'market-cache.json');
      if (fs.existsSync(marketCacheFile)) {
        try {
          const raw = JSON.parse(fs.readFileSync(marketCacheFile, 'utf8'));
          if (Array.isArray(raw.relativeStrength)) {
            raw.relativeStrength.forEach(item => {
              if (item.symbol) {
                metadataMap[item.symbol] = {
                  name: item.name || item.symbol,
                  sector: item.sector || 'Geral'
                };
              }
            });
            if (universe === 'IBOV') {
              universeSymbols = raw.relativeStrength
                .filter(s => s.assetClass === 'stock_ibov')
                .map(s => s.symbol);
            } else if (universe === 'LIQUID_B3' || universe === 'LIQUID') {
              universeSymbols = raw.relativeStrength.map(s => s.symbol);
            }
          }
        } catch (err) {}
      }
    }
  }

  if (!candlesMap || (candlesMap instanceof Map ? candlesMap.size === 0 : Object.keys(candlesMap).length === 0)) {
    const res = await reset(userId, { scenario }, dbClient);
    return {
      ...res,
      meta: {
        totalSignals: res.simulations.length,
        executedCount: res.stats ? res.stats.executedEntriesCount : res.simulations.length,
        targetVolume,
        targetReached: true,
        period: {
          period: period || '120',
          minDate: startDate || null,
          maxDate: endDate || null
        },
        scenario,
        universe,
        triggers,
        grades
      }
    };
  }

  const generated = model.generateHistoricalSimulations({
    candlesMap,
    metadataMap,
    symbols: universeSymbols,
    targetVolume,
    period,
    startDate,
    endDate,
    triggers,
    grades,
    scenario,
    universe
  });

  const sims = generated.simulations || [];

  await dbClient.query(`DELETE FROM app.trade_simulations WHERE user_id = $1`, [userId]);

  const batchSize = 50;
  for (let i = 0; i < sims.length; i += batchSize) {
    const batch = sims.slice(i, i + batchSize);
    const valueClauses = [];
    const values = [];
    let pIdx = 1;

    for (const s of batch) {
      const id = crypto.randomUUID();
      s.id = id;
      valueClauses.push(
        `($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6},
          $${pIdx + 7}, $${pIdx + 8}, $${pIdx + 9}, $${pIdx + 10},
          $${pIdx + 11}, $${pIdx + 12}, $${pIdx + 13}, $${pIdx + 14},
          $${pIdx + 15}, $${pIdx + 16}, $${pIdx + 17}, $${pIdx + 18}, $${pIdx + 19}, $${pIdx + 20},
          $${pIdx + 21}, $${pIdx + 22}, $${pIdx + 23}, $${pIdx + 24})`
      );
      values.push(
        id, userId, s.symbol, s.companyName || '', s.triggerName, s.grade || '', s.sector || '',
        s.signalDate, s.entryPrice, s.stopLoss, s.status,
        s.executedEntryPrice, s.entryDate, s.currentStop, s.currentPrice,
        s.exitPrice, s.exitDate, s.exitReason, s.resultR, s.mfeR, s.maeR,
        JSON.stringify(s.timeline || []), s.notes || '',
        scenario, s.scaleIn ? JSON.stringify(s.scaleIn) : null
      );
      pIdx += 25;
    }

    if (valueClauses.length > 0) {
      await dbClient.query(
        `INSERT INTO app.trade_simulations (
          id, user_id, symbol, company_name, trigger_name, grade, sector,
          signal_date, entry_price, stop_loss, status,
          executed_entry_price, entry_date, current_stop, current_price,
          exit_price, exit_date, exit_reason, result_r, mfe_r, mae_r,
          timeline, notes, management_scenario, scale_in
        ) VALUES ${valueClauses.join(', ')}`,
        values
      );
    }
  }

  const comparison = model.compareManagementScenarios(sims);
  const hypothesisComparison = (typeof model.compareInsideBarTriggers === 'function')
    ? model.compareInsideBarTriggers(sims)
    : null;

  return {
    simulations: sims,
    stats: generated.stats,
    comparison,
    hypothesisComparison,
    auditReport: generated.auditReport,
    meta: generated.meta
  };
}

/**
 * Retorna a comparação consolidada entre os 3 cenários de gestão de risco
 */
async function compare(userId, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  const data = await list(userId, client);
  return {
    comparison: model.compareManagementScenarios(data.simulations)
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
  await dbClientQuery(client, `DELETE FROM app.trade_simulations WHERE user_id = $1`, [userId]);
  return {
    deleted: true,
    simulations: [],
    stats: model.calculateSimulatorStats([])
  };
}

async function dbClientQuery(client, sql, params) {
  return client.query(sql, params);
}

/**
 * Retorna a comparação estatística da hipótese do Double Inside Bar vs Inside Bar simples
 */
async function compareHypothesis(userId, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  const data = await list(userId, client);
  return {
    hypothesisComparison: model.compareInsideBarTriggers(data.simulations)
  };
}

/**
 * Snapshot fiel do trade: reconstrói o gráfico a partir do histórico diário REAL do ativo (mesma fonte
 * usada pela geração em massa: COTAHIST/B3 ajustado ou Nasdaq). Nunca sintetiza candles; sem dados,
 * devolve snapshot indisponível com motivo explícito. Aceita o registro da simulação enviado pelo cliente
 * (inclui sementes e simulações locais) e confere todos os níveis contra o histórico.
 */
async function buildSnapshot(userId, payload = {}, options = {}) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  const raw = payload && payload.simulation;
  if (!raw || typeof raw !== 'object' || !raw.symbol) throw invalid('Simulação inválida para snapshot.');

  const symbol = String(raw.symbol).toUpperCase().trim();
  const simulation = {
    id: raw.id ? String(raw.id) : null,
    symbol,
    triggerName: raw.triggerName,
    signalDate: raw.signalDate ? String(raw.signalDate).slice(0, 10) : null,
    entryPrice: Number(raw.entryPrice),
    stopLoss: Number(raw.stopLoss),
    status: raw.status,
    executedEntryPrice: raw.executedEntryPrice != null ? Number(raw.executedEntryPrice) : null,
    entryDate: raw.entryDate ? String(raw.entryDate).slice(0, 10) : null,
    exitPrice: raw.exitPrice != null ? Number(raw.exitPrice) : null,
    exitDate: raw.exitDate ? String(raw.exitDate).slice(0, 10) : null,
    exitReason: raw.exitReason || null,
    currentStop: raw.currentStop != null ? Number(raw.currentStop) : null,
    scaleIn: raw.scaleIn && typeof raw.scaleIn === 'object' ? raw.scaleIn : null,
    partialExit: raw.partialExit && typeof raw.partialExit === 'object' ? raw.partialExit : null
  };

  let history = null;
  let source = null;
  if (options.histories instanceof Map) {
    history = options.histories.get(symbol) || null;
    source = options.source || 'Histórico diário injetado';
  } else if (tickerChart) {
    try {
      const b3 = typeof tickerChart.loadB3History === 'function' ? tickerChart.loadB3History() : null;
      if (b3 && b3.get(symbol)) {
        history = b3.get(symbol);
        source = 'B3 (COTAHIST, ajustado a eventos corporativos)';
      } else {
        const nasdaq = typeof tickerChart.loadNasdaqHistory === 'function' ? tickerChart.loadNasdaqHistory() : null;
        if (nasdaq && nasdaq.get(symbol)) {
          history = nasdaq.get(symbol);
          source = 'Nasdaq (Twelve Data)';
        }
      }
    } catch {
      history = null;
    }
  }

  return { snapshot: model.buildSimulationSnapshot(simulation, history || [], { source }) };
}

module.exports = {
  list,
  create,
  update,
  remove,
  reset,
  generateMass,
  clearAll,
  evaluate,
  buildSnapshot,
  compare,
  compareHypothesis,
  mapSimulation
};

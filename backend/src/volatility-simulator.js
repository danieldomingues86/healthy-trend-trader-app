'use strict';

/**
 * Healthy Trend Trader — Backend Volatility Simulator Service
 *
 * Serviço de execução e persistência de simulações em escala e experimentos do mundo
 * VOLATILITY TRADING (IFR2 Mean Reversion):
 * - Carrega universo de mercado (B3 e Nasdaq)
 * - Integração com Strategy Configuration Center (perfis e versionamento)
 * - Executa simulações completas de carteira sem look-ahead bias
 * - Compara experimentos de múltiplos perfis (ex: IFR2 nível 5, 10, 15, 20)
 * - Persistência em app.volatility_simulation_experiments (PostgreSQL) com fallback em memória
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const database = require('./database');
const tickerChart = require('./ticker-chart');
const strategyConfigs = require('./strategy-configs');
const VolatilitySimulatorModel = require('../../frontend/volatility-trade-simulator-model');
const VolatilityEngineModel = require('../../frontend/volatility-trading-engine-model');
const StrategyConfigModel = require('../../frontend/strategy-configuration-model');

function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Fallback em memória quando o banco não estiver configurado
const inMemoryExperiments = new Map();

/**
 * Carrega o mapa de candles do universo solicitado.
 */
function loadUniverseCandles(universe = 'IBOV', market = 'B3') {
  const u = String(universe || 'IBOV').toUpperCase().trim();
  const m = String(market || 'B3').toUpperCase().trim();

  let candlesMap;
  const metadataMap = {};
  let universeSymbols = null;

  if (m === 'US' || u === 'NASDAQ') {
    candlesMap = tickerChart.loadNasdaqHistory();
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
      } catch (_) {}
    }
  } else {
    // Universo B3
    candlesMap = tickerChart.loadB3History();
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
          if (u === 'IBOV') {
            universeSymbols = raw.relativeStrength
              .filter(s => s.assetClass === 'stock_ibov')
              .map(s => s.symbol);
          } else if (u === 'LIQUID_B3' || u === 'LIQUID') {
            universeSymbols = raw.relativeStrength.map(s => s.symbol);
          }
        }
      } catch (_) {}
    }
  }

  return {
    candlesMap: candlesMap || new Map(),
    metadataMap,
    universeSymbols
  };
}

/**
 * Executa uma simulação de Volatility Trading em escala no universo selecionado.
 */
async function runUniverseSimulation({
  userId = 'default-user',
  name = null,
  universe = 'IBOV',
  market = 'B3',
  profileId = null,
  customParameters = null,
  period = '120',
  startDate = null,
  endDate = null,
  initialCapital = 100000,
  fixedCapitalPerTrade = 10000,
  costsPerTrade = 0,
  slippagePct = 0,
  persist = true
} = {}, client = database) {
  // Resolve perfil de configuração
  let profile = null;
  if (profileId) {
    try {
      profile = await strategyConfigs.get(userId, profileId);
    } catch (_) {}
  }
  if (!profile) {
    try {
      const activeList = await strategyConfigs.list(userId, VolatilityEngineModel.STRATEGY_TYPE);
      profile = activeList.find(p => p.isActive) || activeList[0];
    } catch (_) {}
  }

  const baseParams = profile?.parameters || VolatilityEngineModel.DEFAULT_PARAMETERS;
  const rawParams = customParameters ? { ...baseParams, ...customParameters } : baseParams;
  const validatedParams = StrategyConfigModel.validateParameters(VolatilityEngineModel.STRATEGY_TYPE, rawParams);

  const { candlesMap, metadataMap, universeSymbols } = loadUniverseCandles(universe, market);

  if (!candlesMap || (candlesMap instanceof Map ? candlesMap.size === 0 : Object.keys(candlesMap).length === 0)) {
    throw invalid('Dados históricos de mercado indisponíveis para o universo solicitado.', 503);
  }

  const simResult = VolatilitySimulatorModel.simulateUniverse(candlesMap, {
    symbols: universeSymbols,
    metadataMap,
    universe,
    market,
    period,
    startDate,
    endDate,
    name: name || (profile ? `${profile.name} (${universe})` : `IFR(2) ≤ ${validatedParams.oversoldLevel} (${universe})`),
    profileId: profile?.id || null,
    profileVersion: profile?.version || '1.0',
    shortMaPeriod: validatedParams.shortMaPeriod,
    longMaPeriod: validatedParams.longMaPeriod,
    rsiPeriod: validatedParams.rsiPeriod,
    oversoldLevel: validatedParams.oversoldLevel,
    holdingPeriodSessions: validatedParams.holdingPeriodSessions,
    fixedCapitalPerTrade: fixedCapitalPerTrade || validatedParams.fixedCapitalPerTrade,
    initialCapital,
    costsPerTrade,
    slippagePct
  });

  const experimentId = crypto.randomUUID();
  const experimentRecord = {
    id: experimentId,
    userId,
    name: simResult.metadata.experimentName,
    strategyType: VolatilitySimulatorModel.STRATEGY_TYPE,
    simulatorVersion: simResult.simulatorVersion,
    universe,
    market,
    periodLabel: String(period),
    startDate: simResult.metadata.period.startDate,
    endDate: simResult.metadata.period.endDate,
    config: simResult.metadata.config,
    configHash: simResult.metadata.configHash,
    metrics: simResult.metrics,
    tradesCount: simResult.metrics.totalTrades,
    winRate: simResult.metrics.winRatePct,
    profitFactor: simResult.metrics.profitFactor,
    expectancyPct: simResult.metrics.expectancyPct,
    netProfit: simResult.metrics.netProfit,
    maxDrawdownPct: simResult.metrics.maxDrawdownPct,
    trades: simResult.trades,
    equityCurve: simResult.equityCurve,
    createdAt: simResult.executedAt,
    updatedAt: simResult.executedAt
  };

  if (persist) {
    if (client.configured && client.configured()) {
      try {
        await client.query(
          `INSERT INTO app.volatility_simulation_experiments (
            id, user_id, name, strategy_type, simulator_version, universe, market,
            period_label, start_date, end_date, config, config_hash, metrics,
            trades_count, win_rate, profit_factor, expectancy_pct, net_profit, max_drawdown_pct,
            trades, equity_curve, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23
          )`,
          [
            experimentRecord.id, experimentRecord.userId, experimentRecord.name, experimentRecord.strategyType,
            experimentRecord.simulatorVersion, experimentRecord.universe, experimentRecord.market,
            experimentRecord.periodLabel, experimentRecord.startDate, experimentRecord.endDate,
            JSON.stringify(experimentRecord.config), experimentRecord.configHash, JSON.stringify(experimentRecord.metrics),
            experimentRecord.tradesCount, experimentRecord.winRate, experimentRecord.profitFactor,
            experimentRecord.expectancyPct, experimentRecord.netProfit, experimentRecord.maxDrawdownPct,
            JSON.stringify(experimentRecord.trades), JSON.stringify(experimentRecord.equityCurve),
            experimentRecord.createdAt, experimentRecord.updatedAt
          ]
        );
      } catch (_) {
        // Fallback em memória caso tabela não exista ou erro
        inMemoryExperiments.set(experimentId, experimentRecord);
      }
    } else {
      inMemoryExperiments.set(experimentId, experimentRecord);
    }
  }

  return {
    ...simResult,
    experimentId
  };
}

/**
 * Executa e compara múltiplos experimentos / variantes de parâmetros lado a lado.
 */
async function runComparativeExperiment({
  userId = 'default-user',
  universe = 'IBOV',
  market = 'B3',
  variants = null,
  period = '120',
  startDate = null,
  endDate = null,
  initialCapital = 100000,
  fixedCapitalPerTrade = 10000,
  costsPerTrade = 0,
  slippagePct = 0
} = {}) {
  const { candlesMap, metadataMap, universeSymbols } = loadUniverseCandles(universe, market);

  if (!candlesMap || (candlesMap instanceof Map ? candlesMap.size === 0 : Object.keys(candlesMap).length === 0)) {
    throw invalid('Dados históricos de mercado indisponíveis para comparação.', 503);
  }

  const comparison = VolatilitySimulatorModel.compareExperiments(candlesMap, variants, {
    symbols: universeSymbols,
    metadataMap,
    universe,
    market,
    period,
    startDate,
    endDate,
    initialCapital,
    fixedCapitalPerTrade,
    costsPerTrade,
    slippagePct
  });

  return comparison;
}

/**
 * Lista experimentos salvos do usuário.
 */
async function listExperiments(userId, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  if (client.configured && client.configured()) {
    try {
      const res = await client.query(
        `SELECT id, user_id, name, strategy_type, simulator_version, universe, market,
                period_label, start_date, end_date, config, config_hash, metrics,
                trades_count, win_rate, profit_factor, expectancy_pct, net_profit, max_drawdown_pct,
                created_at, updated_at
         FROM app.volatility_simulation_experiments
         WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 50`,
        [userId]
      );
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          name: r.name,
          strategyType: r.strategy_type,
          simulatorVersion: r.simulator_version,
          universe: r.universe,
          market: r.market,
          periodLabel: r.period_label,
          startDate: r.start_date,
          endDate: r.end_date,
          config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config,
          configHash: r.config_hash,
          metrics: typeof r.metrics === 'string' ? JSON.parse(r.metrics) : r.metrics,
          tradesCount: r.trades_count,
          winRate: Number(r.win_rate),
          profitFactor: Number(r.profit_factor),
          expectancyPct: Number(r.expectancy_pct),
          netProfit: Number(r.net_profit),
          maxDrawdownPct: Number(r.max_drawdown_pct),
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }));
      }
    } catch (_) {}
  }

  // Fallback em memória
  const list = Array.from(inMemoryExperiments.values()).filter(e => e.userId === userId);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list.map(e => ({
    id: e.id,
    userId: e.userId,
    name: e.name,
    strategyType: e.strategyType,
    simulatorVersion: e.simulatorVersion,
    universe: e.universe,
    market: e.market,
    periodLabel: e.periodLabel,
    startDate: e.startDate,
    endDate: e.endDate,
    config: e.config,
    configHash: e.configHash,
    metrics: e.metrics,
    tradesCount: e.tradesCount,
    winRate: e.winRate,
    profitFactor: e.profitFactor,
    expectancyPct: e.expectancyPct,
    netProfit: e.netProfit,
    maxDrawdownPct: e.maxDrawdownPct,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt
  }));
}

/**
 * Obtém os detalhes completos de um experimento (incluindo lista de trades e curva de equity).
 */
async function getExperiment(userId, experimentId, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  if (!experimentId) throw invalid('ID do experimento é obrigatório.');

  if (client.configured && client.configured()) {
    try {
      const res = await client.query(
        `SELECT * FROM app.volatility_simulation_experiments WHERE user_id = $1 AND id = $2`,
        [userId, experimentId]
      );
      if (res.rows && res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          userId: r.user_id,
          name: r.name,
          strategyType: r.strategy_type,
          simulatorVersion: r.simulator_version,
          universe: r.universe,
          market: r.market,
          periodLabel: r.period_label,
          startDate: r.start_date,
          endDate: r.end_date,
          config: typeof r.config === 'string' ? JSON.parse(r.config) : r.config,
          configHash: r.config_hash,
          metrics: typeof r.metrics === 'string' ? JSON.parse(r.metrics) : r.metrics,
          tradesCount: r.trades_count,
          winRate: Number(r.win_rate),
          profitFactor: Number(r.profit_factor),
          expectancyPct: Number(r.expectancy_pct),
          netProfit: Number(r.net_profit),
          maxDrawdownPct: Number(r.max_drawdown_pct),
          trades: typeof r.trades === 'string' ? JSON.parse(r.trades) : r.trades,
          equityCurve: typeof r.equity_curve === 'string' ? JSON.parse(r.equity_curve) : r.equity_curve,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      }
    } catch (_) {}
  }

  const exp = inMemoryExperiments.get(experimentId);
  if (exp && exp.userId === userId) {
    return exp;
  }

  throw invalid('Experimento não encontrado.', 404);
}

/**
 * Remove um experimento salvo.
 */
async function deleteExperiment(userId, experimentId, client = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  if (!experimentId) throw invalid('ID do experimento é obrigatório.');

  if (client.configured && client.configured()) {
    try {
      const res = await client.query(
        `DELETE FROM app.volatility_simulation_experiments WHERE user_id = $1 AND id = $2 RETURNING id`,
        [userId, experimentId]
      );
      if (res.rows && res.rows.length > 0) {
        return { success: true, id: experimentId };
      }
    } catch (_) {}
  }

  if (inMemoryExperiments.has(experimentId)) {
    inMemoryExperiments.delete(experimentId);
    return { success: true, id: experimentId };
  }

  throw invalid('Experimento não encontrado para exclusão.', 404);
}

module.exports = {
  loadUniverseCandles,
  runUniverseSimulation,
  runComparativeExperiment,
  listExperiments,
  getExperiment,
  deleteExperiment
};

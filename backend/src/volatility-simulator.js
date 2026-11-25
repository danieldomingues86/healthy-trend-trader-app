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
const TradeSimulatorModel = require('../../frontend/trade-simulator-model');

function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Fallback em memória quando o banco não estiver configurado
const inMemoryExperiments = new Map();

/**
 * Carrega o mapa de candles do universo solicitado (suporta classes de ativos multiclasse e seleção por tickers).
 */
function loadUniverseCandles(universe = 'IBOV', market = 'B3', options = {}) {
  const u = String(universe || 'IBOV').toUpperCase().trim();
  const m = String(market || 'B3').toUpperCase().trim();
  const assetClasses = options.assetClasses || null;
  const explicitSymbols = Array.isArray(options.symbols) && options.symbols.length > 0
    ? Array.from(new Set(options.symbols.map(s => String(s || '').toUpperCase().trim()).filter(s => s && s !== 'ALL')))
    : null;

  const normalizedClasses = Array.isArray(assetClasses)
    ? assetClasses.map(c => String(c || '').toUpperCase().trim()).filter(Boolean)
    : (typeof assetClasses === 'string' && assetClasses.trim() ? assetClasses.split(',').map(c => c.trim().toUpperCase()) : []);
  const hasMultiOrCustomClasses = normalizedClasses.length > 0 && !normalizedClasses.includes('ALL');
  const isAllClasses = normalizedClasses.includes('ALL') || u === 'ALL' || u === 'MULTI';

  const needsUs = m === 'US' || u === 'NASDAQ' || u === 'STOCK_US' || isAllClasses ||
    normalizedClasses.includes('STOCK_US') || normalizedClasses.includes('ETF_INTL') ||
    (Array.isArray(explicitSymbols) && explicitSymbols.some(s => /^[A-Z]{1,5}$/.test(s) && !['IBOV', 'IFIX', 'SMLL', 'BDRX'].includes(s)));
  const needsB3 = (m !== 'US' && u !== 'NASDAQ') || isAllClasses || hasMultiOrCustomClasses ||
    (Array.isArray(explicitSymbols) && explicitSymbols.some(s => /\d/.test(s) || ['IBOV', 'IFIX', 'SMLL', 'BDRX'].includes(s)));

  const combinedMap = new Map();
  const metadataMap = {};
  const b3StocksByClass = { stock_ibov: [], stock_all: [], fii: [], bdr: [] };
  let nasdaqSymbols = [];

  if (needsB3) {
    const b3Map = tickerChart.loadB3History();
    if (b3Map instanceof Map) {
      for (const [k, v] of b3Map.entries()) combinedMap.set(k, v);
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
                sector: item.sector || 'Geral',
                assetClass: 'STOCK_BR'
              };
              b3StocksByClass.stock_all.push(item.symbol);
              if (item.assetClass === 'stock_ibov') {
                b3StocksByClass.stock_ibov.push(item.symbol);
              }
            }
          });
        }
        const fiiItems = raw.relativeStrengthByClass?.fii?.items || [];
        fiiItems.forEach(item => {
          if (item.symbol) {
            metadataMap[item.symbol] = {
              name: item.name || item.symbol,
              sector: item.sector || 'Fundos Imobiliários',
              assetClass: 'FII'
            };
            b3StocksByClass.fii.push(item.symbol);
          }
        });
        const bdrItems = raw.relativeStrengthByClass?.bdr?.items || [];
        bdrItems.forEach(item => {
          if (item.symbol) {
            metadataMap[item.symbol] = {
              name: item.name || item.symbol,
              sector: item.sector || 'BDRs',
              assetClass: 'BDR'
            };
            b3StocksByClass.bdr.push(item.symbol);
          }
        });
      } catch (_) {}
    }
  }

  if (needsUs) {
    const usMap = tickerChart.loadNasdaqHistory();
    if (usMap instanceof Map) {
      for (const [k, v] of usMap.entries()) {
        if (!combinedMap.has(k)) combinedMap.set(k, v);
      }
    }
    const nasdaqCacheFile = path.join(__dirname, '..', 'data', 'nasdaq-market-cache.json');
    if (fs.existsSync(nasdaqCacheFile)) {
      try {
        const raw = JSON.parse(fs.readFileSync(nasdaqCacheFile, 'utf8'));
        if (Array.isArray(raw.ranking)) {
          raw.ranking.forEach(item => {
            if (item.symbol) {
              const isUsEtf = ['QQQ', 'SPY', 'IWM', 'DIA', 'VTI', 'VOO', 'EWZ'].includes(String(item.symbol).toUpperCase());
              metadataMap[item.symbol] = {
                name: item.name || item.companyName || item.symbol,
                sector: item.sector || 'Tecnologia',
                assetClass: isUsEtf ? 'ETF_INTL' : 'STOCK_US',
                market: 'US'
              };
            }
          });
          nasdaqSymbols = raw.ranking.map(r => r.symbol);
        }
      } catch (_) {}
    }
  }

  if (TradeSimulatorModel && typeof TradeSimulatorModel.getAvailableSimulatorAssetsCatalog === 'function') {
    const refCatalog = TradeSimulatorModel.getAvailableSimulatorAssetsCatalog();
    for (const item of refCatalog.assets) {
      if (!metadataMap[item.symbol]) {
        metadataMap[item.symbol] = {
          name: item.name,
          sector: item.sector,
          assetClass: item.assetClass,
          market: item.market
        };
      }
    }
  }

  let universeSymbols = explicitSymbols;
  if (!universeSymbols || universeSymbols.length === 0) {
    if (hasMultiOrCustomClasses || isAllClasses) {
      const classesToLoad = isAllClasses
        ? (TradeSimulatorModel.SIMULATOR_ASSET_CLASS_ORDER || ['STOCK_BR', 'FII', 'BDR', 'ETF_BR', 'ETF_INTL', 'STOCK_US', 'OTHER'])
        : normalizedClasses;
      const refCatalog = TradeSimulatorModel && typeof TradeSimulatorModel.getAvailableSimulatorAssetsCatalog === 'function'
        ? TradeSimulatorModel.getAvailableSimulatorAssetsCatalog()
        : { byClass: {} };
      const resolvedSet = new Set();

      for (const cls of classesToLoad) {
        if (cls === 'STOCK_BR') {
          const pool = u === 'IBOV' && b3StocksByClass.stock_ibov.length > 0
            ? b3StocksByClass.stock_ibov
            : (b3StocksByClass.stock_all.length > 0 ? b3StocksByClass.stock_all : (refCatalog.byClass?.STOCK_BR?.assets || []).map(a => a.symbol));
          pool.forEach(s => resolvedSet.add(s));
        } else if (cls === 'FII') {
          const pool = b3StocksByClass.fii.length > 0
            ? b3StocksByClass.fii
            : (refCatalog.byClass?.FII?.assets || []).map(a => a.symbol);
          pool.forEach(s => resolvedSet.add(s));
        } else if (cls === 'BDR') {
          const pool = b3StocksByClass.bdr.length > 0
            ? b3StocksByClass.bdr
            : (refCatalog.byClass?.BDR?.assets || []).map(a => a.symbol);
          pool.forEach(s => resolvedSet.add(s));
        } else if (cls === 'STOCK_US') {
          const pool = nasdaqSymbols.length > 0
            ? nasdaqSymbols.filter(s => s !== 'QQQ')
            : (refCatalog.byClass?.STOCK_US?.assets || []).map(a => a.symbol);
          pool.forEach(s => resolvedSet.add(s));
        } else {
          const classAssets = (refCatalog.byClass?.[cls]?.assets || []).map(a => a.symbol);
          classAssets.forEach(s => resolvedSet.add(s));
        }
      }
      universeSymbols = Array.from(resolvedSet);
    } else if (m === 'US' || u === 'NASDAQ') {
      universeSymbols = nasdaqSymbols;
    } else if (u === 'IBOV') {
      universeSymbols = b3StocksByClass.stock_ibov;
    } else if (u === 'LIQUID_B3' || u === 'LIQUID') {
      universeSymbols = b3StocksByClass.stock_all;
    }
  }

  return {
    candlesMap: combinedMap,
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
  assetClasses = null,
  symbols = null,
  profileId = null,
  customParameters = null,
  period = '120',
  startDate = null,
  endDate = null,
  initialCapital = 100000,
  positionSizingModel = 'FIXED_FINANCIAL',
  fixedCapitalPerTrade = 10000,
  equityPercentPerTrade = 10,
  exitExecutionTiming = 'NEXT_OPEN',
  rsFilterMode = 'NONE',
  financialRiskUnitMode = 'PERCENT_OF_POSITION',
  financialRiskUnitValue = 5,
  extremeEventProtectionEnabled = true,
  maxConcurrentPositions = 10,
  minDailyLiquidity = 500000,
  liquidityWindowSessions = 21,
  minDailyTrades = 500,
  costsPerTrade = 0,
  slippagePct = 0,
  persist = true
} = {}, client = database) {
  if (startDate && endDate && String(startDate).slice(0, 10) > String(endDate).slice(0, 10)) {
    throw invalid('A Data Inicial não pode ser maior que a Data Final.', 400);
  }

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

  const { candlesMap, metadataMap, universeSymbols } = loadUniverseCandles(universe, market, { assetClasses, symbols });

  if (!candlesMap || (candlesMap instanceof Map ? candlesMap.size === 0 : Object.keys(candlesMap).length === 0)) {
    throw invalid('Dados históricos de mercado indisponíveis para o universo solicitado.', 503);
  }

  const extraParams = customParameters || {};
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
    positionSizingModel: extraParams.positionSizingModel || positionSizingModel || validatedParams.positionSizingModel || 'FIXED_FINANCIAL',
    fixedCapitalPerTrade: fixedCapitalPerTrade || extraParams.fixedCapitalPerTrade || validatedParams.fixedCapitalPerTrade,
    equityPercentPerTrade: extraParams.equityPercentPerTrade || equityPercentPerTrade,
    exitExecutionTiming: extraParams.exitExecutionTiming || exitExecutionTiming || 'NEXT_OPEN',
    rsFilterMode: extraParams.rsFilterMode || rsFilterMode || 'NONE',
    financialRiskUnitMode: extraParams.financialRiskUnitMode || financialRiskUnitMode || 'PERCENT_OF_POSITION',
    financialRiskUnitValue: extraParams.financialRiskUnitValue !== undefined ? extraParams.financialRiskUnitValue : financialRiskUnitValue,
    extremeEventProtectionEnabled: extraParams.extremeEventProtectionEnabled !== undefined ? extraParams.extremeEventProtectionEnabled : extremeEventProtectionEnabled,
    maxConcurrentPositions: extraParams.maxConcurrentPositions || maxConcurrentPositions || 10,
    minDailyLiquidity: extraParams.minDailyLiquidity || minDailyLiquidity || 500000,
    liquidityWindowSessions: extraParams.liquidityWindowSessions || liquidityWindowSessions || 21,
    minDailyTrades: extraParams.minDailyTrades !== undefined ? extraParams.minDailyTrades : minDailyTrades,
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
  positionSizingModel = 'FIXED_FINANCIAL',
  fixedCapitalPerTrade = 10000,
  equityPercentPerTrade = 10,
  exitExecutionTiming = 'NEXT_OPEN',
  rsFilterMode = 'NONE',
  financialRiskUnitMode = 'PERCENT_OF_POSITION',
  financialRiskUnitValue = 5,
  extremeEventProtectionEnabled = true,
  minDailyLiquidity = 500000,
  liquidityWindowSessions = 21,
  minDailyTrades = 500,
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
    positionSizingModel,
    fixedCapitalPerTrade,
    equityPercentPerTrade,
    exitExecutionTiming,
    rsFilterMode,
    financialRiskUnitMode,
    financialRiskUnitValue,
    extremeEventProtectionEnabled,
    minDailyLiquidity,
    liquidityWindowSessions,
    minDailyTrades,
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

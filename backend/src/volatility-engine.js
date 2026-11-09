'use strict';

/**
 * Healthy Trend Trader — Backend Volatility Engine
 *
 * Serviço de execução e auditoria do mundo VOLATILITY TRADING no backend:
 * - Varredura de oportunidades (Scanner de mercado)
 * - Simulação/Backtest de ativos individuais e carteiras
 * - Integração transparente com Strategy Configuration Center (perfis ativos e snapshots)
 * - Integração com Liquidity Gate e Asset Blacklist
 */

const tickerChart = require('./ticker-chart');
const strategyConfigs = require('./strategy-configs');
const assetBlacklist = require('./asset-blacklist');
const VolatilityEngineModel = require('../../frontend/volatility-trading-engine-model');
const StrategyConfigModel = require('../../frontend/strategy-configuration-model');

function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Resolve o perfil de configuração a ser utilizado na operação.
 * Se profileId for informado, busca-o especificamente; caso contrário, usa o perfil ativo do usuário.
 */
async function resolveProfile(userId, profileId = null) {
  if (profileId) {
    try {
      const cfg = await strategyConfigs.get(userId, profileId);
      if (cfg && cfg.strategyType === VolatilityEngineModel.STRATEGY_TYPE) {
        return cfg;
      }
    } catch (_) {}
  }

  // Busca perfil ativo para VOLATILITY_TRADING
  try {
    const list = await strategyConfigs.list(userId, VolatilityEngineModel.STRATEGY_TYPE);
    const active = list.find(p => p.isActive) || list[0];
    if (active) {
      return active;
    }
  } catch (_) {}

  // Fallback seguro em memória caso o banco não esteja disponível
  const defaultParams = StrategyConfigModel.VOLATILITY_SWING_DEFAULTS;
  return {
    id: 'default-volatility-swing',
    strategyType: VolatilityEngineModel.STRATEGY_TYPE,
    name: 'IFR(2) Sobrevenda 10 — Padrão Oficial',
    version: '1.0',
    isActive: true,
    parameters: defaultParams,
    parametersHash: StrategyConfigModel.computeParametersHash(defaultParams)
  };
}

/**
 * Varre o universo de ativos selecionado identificando sinais confirmados de Volatility Swing.
 */
async function scanOpportunities({ userId, asOfDate = null, profileId = null, market = 'B3', limit = 50 } = {}) {
  const profile = await resolveProfile(userId, profileId);
  const parameters = profile.parameters || VolatilityEngineModel.DEFAULT_PARAMETERS;

  // Carrega Blacklist do usuário para filtragem rigorosa
  let blacklistedSymbols = [];
  try {
    const blList = await assetBlacklist.list(userId);
    blacklistedSymbols = (blList || []).map(b => String(b.symbol || '').toUpperCase());
  } catch (_) {}

  // Carrega histórico de mercado
  let candlesMap;
  if (String(market).toUpperCase() === 'US') {
    candlesMap = tickerChart.loadNasdaqHistory();
  } else {
    candlesMap = tickerChart.loadB3History();
  }

  const scanResult = VolatilityEngineModel.scanUniverse(candlesMap, {
    asOfDate,
    shortMaPeriod: parameters.shortMaPeriod,
    longMaPeriod: parameters.longMaPeriod,
    rsiPeriod: parameters.rsiPeriod,
    oversoldLevel: parameters.oversoldLevel,
    holdingPeriodSessions: parameters.holdingPeriodSessions,
    fixedCapitalPerTrade: parameters.fixedCapitalPerTrade,
    blacklist: blacklistedSymbols,
    market
  });

  const cappedSignals = scanResult.signals.slice(0, Math.max(1, Math.min(100, Number(limit) || 50)));

  return {
    strategyType: VolatilityEngineModel.STRATEGY_TYPE,
    setupName: VolatilityEngineModel.SETUP_NAME,
    asOfDate: scanResult.asOfDate,
    profile: {
      id: profile.id,
      name: profile.name,
      version: profile.version,
      parameters,
      parametersHash: profile.parametersHash
    },
    totalEvaluated: scanResult.totalEvaluated,
    signalsCount: scanResult.signalsFound,
    signals: cappedSignals,
    scannedAt: new Date().toISOString()
  };
}

/**
 * Executa simulação histórica (backtest) de um ticker com os parâmetros da estratégia.
 */
async function simulateAsset({ userId, symbol, profileId = null, customParameters = null, market = 'B3', startDate = null, endDate = null } = {}) {
  const sym = String(symbol || '').trim().toUpperCase();
  if (!sym) throw invalid('Símbolo/Ticker do ativo é obrigatório para simulação.');

  const profile = await resolveProfile(userId, profileId);
  const baseParams = customParameters ? { ...profile.parameters, ...customParameters } : profile.parameters;
  const parameters = StrategyConfigModel.validateParameters(VolatilityEngineModel.STRATEGY_TYPE, baseParams);

  // Carrega histórico de candles
  let candlesMap;
  if (String(market).toUpperCase() === 'US') {
    candlesMap = tickerChart.loadNasdaqHistory();
  } else {
    candlesMap = tickerChart.loadB3History();
  }

  let candles = candlesMap.get(sym);
  if (!candles || candles.length < 200) {
    throw invalid(`Histórico insuficiente para simulação de ${sym} (mínimo exigido: 200 pregões).`, 422);
  }

  // Filtra intervalo de datas se fornecido
  if (startDate || endDate) {
    candles = candles.filter(c => {
      if (startDate && c.time < startDate) return false;
      if (endDate && c.time > endDate) return false;
      return true;
    });
  }

  const result = VolatilityEngineModel.simulateAsset(candles, {
    symbol: sym,
    market,
    ...parameters
  });

  return {
    ...result,
    profile: {
      id: profile.id,
      name: profile.name,
      version: profile.version,
      parameters,
      parametersHash: StrategyConfigModel.computeParametersHash(parameters)
    },
    simulatedAt: new Date().toISOString()
  };
}

module.exports = {
  resolveProfile,
  scanOpportunities,
  simulateAsset
};

'use strict';

/**
 * Healthy Trend Trader — Backend Strategy Analytics Service
 *
 * Fornece a camada analítica de métricas individuais, comparação e consolidado de carteira:
 * - Carrega trades do banco/persistência (trades.js)
 * - Suporta isolamento estrito entre Trend Following e Volatility Trading
 * - Consolidação cronológica sobre o patrimônio real com correlação de retornos e exposição simultânea
 */

const tradesService = require('./trades');
const StrategyAnalyticsModel = require('../../frontend/strategy-analytics-model');

function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Obtém o pacote analítico completo para o usuário no escopo/filtros solicitados.
 */
async function getAnalytics({
  userId,
  strategy = 'ALL',
  period = 'ALL',
  startDate = null,
  endDate = null,
  market = 'ALL',
  symbol = 'ALL',
  profileId = null,
  initialCapital = 100000,
  trades = null
} = {}) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  // Carrega histórico completo de trades do usuário ou usa trades fornecidos
  const userTrades = Array.isArray(trades)
    ? trades
    : await tradesService.listPlans(userId, { strategy: null });

  // Aplica filtros gerais
  const filtered = StrategyAnalyticsModel.filterTrades(userTrades, {
    strategy,
    period,
    startDate,
    endDate,
    market,
    symbol,
    profileId
  });

  const closed = filtered.filter(t => t.status === 'closed' || t.status === 'CLOSED');

  // Se a estratégia solicitada for específica, calcula o pacote individual
  if (strategy === 'TREND_FOLLOWING') {
    const metrics = StrategyAnalyticsModel.calculateStrategyMetrics(closed, {
      initialCapital,
      strategyType: 'TREND_FOLLOWING'
    });
    const breakdowns = StrategyAnalyticsModel.calculateTrendBreakdowns(closed);
    return {
      scope: 'TREND_FOLLOWING',
      initialCapital,
      metrics,
      breakdowns,
      trades: closed,
      definitions: StrategyAnalyticsModel.METRIC_DEFINITIONS
    };
  }

  if (strategy === 'VOLATILITY_TRADING') {
    const metrics = StrategyAnalyticsModel.calculateStrategyMetrics(closed, {
      initialCapital,
      strategyType: 'VOLATILITY_TRADING'
    });
    const breakdowns = StrategyAnalyticsModel.calculateVolatilityBreakdowns(closed);
    return {
      scope: 'VOLATILITY_TRADING',
      initialCapital,
      metrics,
      breakdowns,
      trades: closed,
      definitions: StrategyAnalyticsModel.METRIC_DEFINITIONS
    };
  }

  // Visão Consolidada de Carteira (Default / ALL)
  const consolidated = StrategyAnalyticsModel.calculateConsolidatedPortfolio(filtered, { initialCapital });
  const trendBreakdowns = StrategyAnalyticsModel.calculateTrendBreakdowns(filtered);
  const volBreakdowns = StrategyAnalyticsModel.calculateVolatilityBreakdowns(filtered);

  return {
    scope: 'CONSOLIDATED',
    initialCapital,
    consolidated,
    breakdowns: {
      trendFollowing: trendBreakdowns,
      volatilityTrading: volBreakdowns
    },
    trades: closed,
    definitions: StrategyAnalyticsModel.METRIC_DEFINITIONS
  };
}

module.exports = {
  getAnalytics
};

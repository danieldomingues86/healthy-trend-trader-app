/**
 * Healthy Trend Trader — Liquidity Gate Model
 *
 * Trava Global e Obrigatória de Liquidez (Liquidity Gate):
 * - Condição inegociável de elegibilidade operacional (Hard Gate)
 * - NENHUM trade pode ser criado, validado, executado ou simulado se o ativo não cumprir os requisitos de liquidez
 * - Janela de avaliação: últimos 21 pregões completos anteriores à data da entrada (estritamente < targetDate, sem look-ahead bias)
 * - Critério principal: volume financeiro médio diário na janela >= mínimo configurado (B3: R$ 500.000 | US: US$ 1.000.000)
 * - Critério alternativo / complementar: média mínima de 500 negócios/dia quando o volume financeiro não estiver disponível
 * - Continuidade temporal: 21 pregões devem ter ocorrido dentro de um limite máximo de dias corridos (ex: 45 dias)
 * - Fail-closed: dados ausentes, incompletos ou não confiáveis bloqueiam a operação por segurança
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LiquidityGateModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_LIQUIDITY_CONFIG = Object.freeze({
    enabled: true,
    windowSessions: 21,
    minDailyFinancialVolumeB3: 500000,
    minDailyFinancialVolumeUs: 1000000,
    minDailyTrades: 500,
    maxCalendarDaysSpan: 45
  });

  const STATUS_CODES = Object.freeze({
    APPROVED: 'APROVADO',
    VOLUME_BELOW_MINIMUM: 'VOLUME_INSUFICIENTE',
    TRADES_BELOW_MINIMUM: 'NEGOCIOS_INSUFICIENTES',
    INSUFFICIENT_HISTORY: 'HISTORICO_INSUFICIENTE',
    SPARSE_TRADING: 'NEGOCIACAO_ESPURIA',
    DATA_UNAVAILABLE: 'DADOS_INDISPONIVEIS',
    GATE_DISABLED: 'GATE_DESATIVADO'
  });

  function toIsoDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return null;
      return value.toISOString().slice(0, 10);
    }
    const s = String(value).trim();
    if (/^\d{8}$/.test(s)) {
      return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    }
    return s.slice(0, 10);
  }

  function getCandleDate(candle) {
    if (!candle) return null;
    return toIsoDate(candle.time || candle.date || candle.datetime);
  }

  function formatMoney(value, currency = 'R$') {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return `${currency} ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatCompactMoney(value, currency = 'R$') {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return '—';
    if (num >= 1e9) return `${currency} ${(num / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`;
    if (num >= 1e6) return `${currency} ${(num / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
    if (num >= 1e3) return `${currency} ${(num / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mil`;
    return `${currency} ${num.toFixed(2).replace('.', ',')}`;
  }

  function isUsMarket(symbol, market) {
    const m = String(market || '').trim().toUpperCase();
    if (m === 'US' || m === 'USA' || m === 'NASDAQ' || m === 'NYSE' || m === 'US MARKET') {
      return true;
    }
    const s = String(symbol || '').trim().toUpperCase();
    if (/^[A-Z]{1,5}$/.test(s) && !/(3|4|5|6|11|31|32|33|34|35|39)$/.test(s)) {
      // Ticker de 1 a 5 letras sem dígitos tipicamente é mercado americano (AAPL, NVDA, TSLA)
      return true;
    }
    return false;
  }

  function normalizeLiquidityConfig(rawConfig = {}) {
    const base = DEFAULT_LIQUIDITY_CONFIG;
    const cfg = rawConfig?.liquidityGate || rawConfig || {};
    const finite = (v, fb) => (Number.isFinite(Number(v)) ? Number(v) : fb);

    return {
      enabled: cfg.enabled !== false,
      windowSessions: Math.max(5, Math.floor(finite(cfg.windowSessions, base.windowSessions))),
      minDailyFinancialVolumeB3: Math.max(1000, finite(cfg.minDailyFinancialVolumeB3, base.minDailyFinancialVolumeB3)),
      minDailyFinancialVolumeUs: Math.max(1000, finite(cfg.minDailyFinancialVolumeUs, base.minDailyFinancialVolumeUs)),
      minDailyTrades: Math.max(10, Math.floor(finite(cfg.minDailyTrades, base.minDailyTrades))),
      maxCalendarDaysSpan: Math.max(25, Math.floor(finite(cfg.maxCalendarDaysSpan, base.maxCalendarDaysSpan)))
    };
  }

  /**
   * Avalia a elegibilidade de liquidez de um ativo.
   *
   * @param {Object} params
   * @param {Array} params.candles Histórico de candles OHLCV
   * @param {string|Date} [params.targetDate] Data do sinal/entrada (avalia apenas candles estritamente < targetDate)
   * @param {string} [params.symbol] Ticker do ativo
   * @param {string} [params.market] Mercado ('B3', 'US', etc.)
   * @param {Object} [params.policy] Política de risco contendo liquidityGate
   * @returns {Object} Resultado detalhado da avaliação de liquidez
   */
  function evaluateLiquidity({ candles, targetDate, symbol, market, policy } = {}) {
    const config = normalizeLiquidityConfig(policy);
    const sym = String(symbol || '').trim().toUpperCase();
    const isUs = isUsMarket(sym, market);
    const currency = isUs ? 'US$' : 'R$';
    const minVolume = isUs ? config.minDailyFinancialVolumeUs : config.minDailyFinancialVolumeB3;

    if (!config.enabled) {
      return {
        isEligible: true,
        status: STATUS_CODES.GATE_DISABLED,
        code: 'GATE_DISABLED',
        reason: 'Trava de liquidez desativada na Política de Risco.',
        metrics: null,
        badge: {
          text: 'LIQUIDEZ NÃO MONITORADA',
          shortText: 'Desativado',
          class: 'badge-liquidity-neutral',
          color: '#64748b'
        }
      };
    }

    // Fail closed: dados vazios ou inválidos
    if (!Array.isArray(candles) || candles.length === 0) {
      return {
        isEligible: false,
        status: STATUS_CODES.DATA_UNAVAILABLE,
        code: 'DATA_UNAVAILABLE',
        reason: 'Dados de negociação não disponíveis para avaliar a liquidez (Fail Closed).',
        metrics: {
          evaluatedSessions: 0,
          windowSessions: config.windowSessions,
          averageDailyVolume: 0,
          minDailyVolume: minVolume,
          calendarDaysSpan: 0,
          symbol: sym,
          market: isUs ? 'US' : 'B3'
        },
        badge: {
          text: 'BLOQUEADO POR LIQUIDEZ',
          shortText: 'Sem dados',
          class: 'badge-liquidity-blocked',
          color: '#b91c1c'
        }
      };
    }

    const targetDateIso = targetDate ? toIsoDate(targetDate) : null;

    // Regra anti look-ahead bias: avalia estritamente candles anteriores à data do sinal/entrada
    let priorCandles = candles;
    if (targetDateIso) {
      priorCandles = candles.filter(c => {
        const d = getCandleDate(c);
        return d && d < targetDateIso;
      });
    }

    // Histórico insuficiente (< windowSessions pregões prévios)
    if (priorCandles.length < config.windowSessions) {
      const avail = priorCandles.length;
      return {
        isEligible: false,
        status: STATUS_CODES.INSUFFICIENT_HISTORY,
        code: 'INSUFFICIENT_HISTORY',
        reason: `Histórico insuficiente: o ativo possui apenas ${avail} pregão(ões) anterior(es) disponível(is) na janela (mínimo exigido: ${config.windowSessions} pregões).`,
        metrics: {
          evaluatedSessions: avail,
          windowSessions: config.windowSessions,
          averageDailyVolume: 0,
          minDailyVolume: minVolume,
          calendarDaysSpan: 0,
          symbol: sym,
          market: isUs ? 'US' : 'B3'
        },
        badge: {
          text: 'BLOQUEADO POR LIQUIDEZ',
          shortText: 'Histórico insuficiente',
          class: 'badge-liquidity-blocked',
          color: '#b91c1c'
        }
      };
    }

    // Recorta exatamente os últimos windowSessions (21) pregões
    const windowCandles = priorCandles.slice(-config.windowSessions);
    const startDate = getCandleDate(windowCandles[0]);
    const endDate = getCandleDate(windowCandles[windowCandles.length - 1]);

    let calendarDaysSpan = 0;
    if (startDate && endDate) {
      const startMs = new Date(startDate + 'T12:00:00Z').getTime();
      const endMs = new Date(endDate + 'T12:00:00Z').getTime();
      calendarDaysSpan = Math.max(1, Math.round((endMs - startMs) / (1000 * 3600 * 24)) + 1);
    }

    // Continuidade temporal: 21 pregões não podem demorar meses (ativos zumbis ou esporádicos)
    if (calendarDaysSpan > config.maxCalendarDaysSpan) {
      return {
        isEligible: false,
        status: STATUS_CODES.SPARSE_TRADING,
        code: 'SPARSE_TRADING',
        reason: `Negociação esparsa / descontinuidade: os últimos ${config.windowSessions} pregões do ativo levaram ${calendarDaysSpan} dias corridos (limite máximo permitido: ${config.maxCalendarDaysSpan} dias corridos). Ativo sem liquidez contínua.`,
        metrics: {
          evaluatedSessions: windowCandles.length,
          windowSessions: config.windowSessions,
          averageDailyVolume: 0,
          minDailyVolume: minVolume,
          calendarDaysSpan,
          maxCalendarDaysSpan: config.maxCalendarDaysSpan,
          windowStartDate: startDate,
          windowEndDate: endDate,
          symbol: sym,
          market: isUs ? 'US' : 'B3'
        },
        badge: {
          text: 'BLOQUEADO POR LIQUIDEZ',
          shortText: 'Negociação esparsa',
          class: 'badge-liquidity-blocked',
          color: '#b91c1c'
        }
      };
    }

    // Volume financeiro diário
    const sumVolume = windowCandles.reduce((acc, c) => acc + (Number(c.volume) || 0), 0);
    const avgDailyVolume = sumVolume / config.windowSessions;
    const hasVolumeData = windowCandles.some(c => Number(c.volume) > 0);

    // Quantidade de negócios
    const sumTrades = windowCandles.reduce((acc, c) => acc + (Number(c.trades || c.negocios) || 0), 0);
    const avgDailyTrades = sumTrades / config.windowSessions;
    const hasTradesData = windowCandles.some(c => Number(c.trades || c.negocios) > 0);

    const baseMetrics = {
      evaluatedSessions: windowCandles.length,
      windowSessions: config.windowSessions,
      averageDailyVolume: round2(avgDailyVolume),
      averageDailyVolumeFormatted: formatMoney(avgDailyVolume, currency),
      averageDailyVolumeCompact: formatCompactMoney(avgDailyVolume, currency),
      minDailyVolume: minVolume,
      minDailyVolumeFormatted: formatMoney(minVolume, currency),
      minDailyVolumeCompact: formatCompactMoney(minVolume, currency),
      averageDailyTrades: Math.round(avgDailyTrades),
      minDailyTrades: config.minDailyTrades,
      calendarDaysSpan,
      maxCalendarDaysSpan: config.maxCalendarDaysSpan,
      windowStartDate: startDate,
      windowEndDate: endDate,
      targetDate: targetDateIso,
      symbol: sym,
      market: isUs ? 'US' : 'B3'
    };

    // Critério Principal: Volume financeiro
    if (hasVolumeData) {
      if (avgDailyVolume < minVolume) {
        return {
          isEligible: false,
          status: STATUS_CODES.VOLUME_BELOW_MINIMUM,
          code: 'VOLUME_BELOW_MINIMUM',
          reason: `Volume financeiro médio diário de ${formatMoney(avgDailyVolume, currency)} nos últimos ${config.windowSessions} pregões está abaixo do mínimo exigido de ${formatMoney(minVolume, currency)}.`,
          metrics: baseMetrics,
          badge: {
            text: 'BLOQUEADO POR LIQUIDEZ',
            shortText: `${formatCompactMoney(avgDailyVolume, currency)}/dia`,
            class: 'badge-liquidity-blocked',
            color: '#b91c1c'
          }
        };
      }

      return {
        isEligible: true,
        status: STATUS_CODES.APPROVED,
        code: 'APPROVED',
        reason: `Liquidez aprovada: volume financeiro médio diário de ${formatMoney(avgDailyVolume, currency)} nos últimos ${config.windowSessions} pregões (mínimo: ${formatMoney(minVolume, currency)}).`,
        metrics: baseMetrics,
        badge: {
          text: 'LIQUIDEZ APROVADA',
          shortText: `${formatCompactMoney(avgDailyVolume, currency)}/dia`,
          class: 'badge-liquidity-approved',
          color: '#15803d'
        }
      };
    }

    // Critério Alternativo: Quantidade de negócios diários (quando volume financeiro não está disponível)
    if (hasTradesData) {
      if (avgDailyTrades < config.minDailyTrades) {
        return {
          isEligible: false,
          status: STATUS_CODES.TRADES_BELOW_MINIMUM,
          code: 'TRADES_BELOW_MINIMUM',
          reason: `Volume financeiro não informado e média de negócios (${Math.round(avgDailyTrades)}/dia) nos últimos ${config.windowSessions} pregões está abaixo do mínimo exigido de ${config.minDailyTrades} negócios/dia.`,
          metrics: baseMetrics,
          badge: {
            text: 'BLOQUEADO POR LIQUIDEZ',
            shortText: `${Math.round(avgDailyTrades)} neg/dia`,
            class: 'badge-liquidity-blocked',
            color: '#b91c1c'
          }
        };
      }

      return {
        isEligible: true,
        status: STATUS_CODES.APPROVED,
        code: 'APPROVED',
        reason: `Liquidez aprovada pelo critério de negócios: média de ${Math.round(avgDailyTrades)} negócios/dia nos últimos ${config.windowSessions} pregões (mínimo: ${config.minDailyTrades} negócios/dia).`,
        metrics: baseMetrics,
        badge: {
          text: 'LIQUIDEZ APROVADA',
          shortText: `${Math.round(avgDailyTrades)} neg/dia`,
          class: 'badge-liquidity-approved',
          color: '#15803d'
        }
      };
    }

    // Falta tanto de volume quanto de negócios -> Fail closed
    return {
      isEligible: false,
      status: STATUS_CODES.DATA_UNAVAILABLE,
      code: 'DATA_UNAVAILABLE',
      reason: `Dados de volume financeiro e quantidade de negócios ausentes na janela de ${config.windowSessions} pregões (Fail Closed).`,
      metrics: baseMetrics,
      badge: {
        text: 'BLOQUEADO POR LIQUIDEZ',
        shortText: 'Sem métricas',
        class: 'badge-liquidity-blocked',
        color: '#b91c1c'
      }
    };
  }

  function round2(v) {
    return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
  }

  return {
    DEFAULT_LIQUIDITY_CONFIG,
    STATUS_CODES,
    evaluateLiquidity,
    normalizeLiquidityConfig,
    formatMoney,
    formatCompactMoney,
    isUsMarket
  };
});

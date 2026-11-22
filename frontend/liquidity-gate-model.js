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

  const NUMBER_FORMAT_2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const NUMBER_FORMAT_1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  function toIsoDate(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      if (value.length === 10 && value.charCodeAt(4) === 45 && value.charCodeAt(7) === 45) {
        return value;
      }
      const s = value.trim();
      if (s.length === 8 && /^\d{8}$/.test(s)) {
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
      }
      return s.slice(0, 10);
    }
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
    const raw = candle.time || candle.date || candle.datetime;
    if (typeof raw === 'string' && raw.length === 10 && raw.charCodeAt(4) === 45 && raw.charCodeAt(7) === 45) {
      return raw;
    }
    return toIsoDate(raw);
  }

  function formatMoney(value, currency = 'R$') {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return `${currency} ${NUMBER_FORMAT_2.format(num)}`;
  }

  function formatCompactMoney(value, currency = 'R$') {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return '—';
    if (num >= 1e9) return `${currency} ${NUMBER_FORMAT_1.format(num / 1e9)} bi`;
    if (num >= 1e6) return `${currency} ${NUMBER_FORMAT_1.format(num / 1e6)} mi`;
    if (num >= 1e3) return `${currency} ${NUMBER_FORMAT_1.format(num / 1e3)} mil`;
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
  function evaluateLiquidity({ candles, targetDate, targetIndex, symbol, market, policy } = {}) {
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
    let priorArray = candles;
    let priorCount = candles.length;

    if (Number.isInteger(targetIndex) && targetIndex >= 0 && targetIndex <= candles.length && candles._isChronological) {
      priorCount = targetIndex;
    } else if (targetDateIso && candles._isChronological) {
      let cutoff = candles.length;
      while (cutoff > 0) {
        const d = getCandleDate(candles[cutoff - 1]);
        if (d && d < targetDateIso) break;
        cutoff--;
      }
      priorCount = cutoff;
    } else if (targetDateIso) {
      priorArray = candles.filter(c => {
        const d = getCandleDate(c);
        return d && d < targetDateIso;
      });
      priorCount = priorArray.length;
    }

    // Histórico insuficiente (< windowSessions pregões prévios)
    if (priorCount < config.windowSessions) {
      const avail = priorCount;
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
    const winStart = priorCount - config.windowSessions;
    const winEnd = priorCount - 1;
    const startDate = getCandleDate(priorArray[winStart]);
    const endDate = getCandleDate(priorArray[winEnd]);

    let calendarDaysSpan = 0;
    if (startDate && endDate) {
      const startMs = Date.parse(startDate);
      const endMs = Date.parse(endDate);
      calendarDaysSpan = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
    }

    // Continuidade temporal: 21 pregões não podem demorar meses (ativos zumbis ou esporádicos)
    if (calendarDaysSpan > config.maxCalendarDaysSpan) {
      return {
        isEligible: false,
        status: STATUS_CODES.SPARSE_TRADING,
        code: 'SPARSE_TRADING',
        reason: `Negociação esparsa / descontinuidade: os últimos ${config.windowSessions} pregões do ativo levaram ${calendarDaysSpan} dias corridos (limite máximo permitido: ${config.maxCalendarDaysSpan} dias corridos). Ativo sem liquidez contínua.`,
        metrics: {
          evaluatedSessions: config.windowSessions,
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

    // Volume financeiro diário e quantidade de negócios em uma única passagem pela janela
    let sumVolume = 0;
    let hasVolumeData = false;
    let sumTrades = 0;
    let hasTradesData = false;
    for (let i = winStart; i <= winEnd; i++) {
      const c = priorArray[i];
      const vol = Number(c.volume) || 0;
      if (vol > 0) {
        sumVolume += vol;
        hasVolumeData = true;
      }
      const trd = Number(c.trades || c.negocios) || 0;
      if (trd > 0) {
        sumTrades += trd;
        hasTradesData = true;
      }
    }
    const avgDailyVolume = sumVolume / config.windowSessions;
    const avgDailyTrades = sumTrades / config.windowSessions;

    const avgVolFormatted = formatMoney(avgDailyVolume, currency);
    const avgVolCompact = formatCompactMoney(avgDailyVolume, currency);
    const minVolFormatted = formatMoney(minVolume, currency);
    const minVolCompact = formatCompactMoney(minVolume, currency);

    const baseMetrics = {
      evaluatedSessions: config.windowSessions,
      windowSessions: config.windowSessions,
      averageDailyVolume: round2(avgDailyVolume),
      averageDailyVolumeFormatted: avgVolFormatted,
      averageDailyVolumeCompact: avgVolCompact,
      minDailyVolume: minVolume,
      minDailyVolumeFormatted: minVolFormatted,
      minDailyVolumeCompact: minVolCompact,
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
          reason: `Volume financeiro médio diário de ${avgVolFormatted} nos últimos ${config.windowSessions} pregões está abaixo do mínimo exigido de ${minVolFormatted}.`,
          metrics: baseMetrics,
          badge: {
            text: 'BLOQUEADO POR LIQUIDEZ',
            shortText: `${avgVolCompact}/dia`,
            class: 'badge-liquidity-blocked',
            color: '#b91c1c'
          }
        };
      }

      return {
        isEligible: true,
        status: STATUS_CODES.APPROVED,
        code: 'APPROVED',
        reason: `Liquidez aprovada: volume financeiro médio diário de ${avgVolFormatted} nos últimos ${config.windowSessions} pregões (mínimo: ${minVolFormatted}).`,
        metrics: baseMetrics,
        badge: {
          text: 'LIQUIDEZ APROVADA',
          shortText: `${avgVolCompact}/dia`,
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

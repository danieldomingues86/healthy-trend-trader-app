'use strict';

/**
 * HEALTHY TREND TRADER — CORPORATE EVENTS REGISTRY & ADJUSTMENTS
 *
 * Gerencia ajustes retroativos de eventos corporativos (splits / desdobramentos,
 * reverse splits / grupamentos e bonificações) para a B3.
 *
 * Princípio: O B3 COTAHIST fornece cotações nominais históricas no dia da negociação.
 * Quando ocorre um desdobramento ou grupamento, os preços anteriores à data-ex
 * precisam ser multiplicados pelo fator de ajuste para que retornos e médias
 * móveis reflitam a variação real de patrimônio e não saltos artificiais.
 */

// Registro de eventos corporativos canônicos conhecidos da B3
const CORPORATE_EVENTS = [
  {
    symbol: 'LUPA3',
    exDate: '2026-08-14',
    ratio: 10.0,
    type: 'reverse_split',
    description: 'Grupamento 10:1 homologado em ago/2026'
  },
  {
    symbol: 'ESPA3',
    exDate: '2026-06-15',
    ratio: 10.0,
    type: 'reverse_split',
    description: 'Grupamento 10:1 homologado em jun/2026'
  },
  {
    symbol: 'ENJU3',
    exDate: '2026-10-09',
    ratio: 10.0,
    type: 'reverse_split',
    description: 'Grupamento 10:1 homologado em out/2026'
  },
  {
    symbol: 'AGXY3',
    exDate: '2025-05-06',
    ratio: 15.0,
    type: 'reverse_split',
    description: 'Grupamento 15:1 homologado em mai/2025'
  },
  {
    symbol: 'DIRR3',
    exDate: '2025-08-11',
    ratio: 1 / 3,
    type: 'split',
    description: 'Desdobramento 1:3 homologado em ago/2025'
  }
];

/**
 * Retorna todos os eventos corporativos para um determinado símbolo
 */
function getEventsForSymbol(symbol) {
  if (!symbol) return [];
  const sym = String(symbol).trim().toUpperCase();
  return CORPORATE_EVENTS.filter(e => e.symbol === sym).sort((a, b) => a.exDate.localeCompare(b.exDate));
}

/**
 * Normaliza o campo de data de um candle (suporta time no formato YYYY-MM-DD ou date no formato YYYYMMDD ou YYYY-MM-DD)
 */
function normalizeDate(candle) {
  if (!candle) return '';
  const d = String(candle.time || candle.date || '');
  if (/^\d{8}$/.test(d)) {
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }
  return d.slice(0, 10);
}

/**
 * Ajusta um conjunto de candles diários (OHLCV) aplicando fatores retroativos
 * para todos os pregões anteriores à data-ex de cada evento.
 */
function adjustCandles(candles, symbol) {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  const events = getEventsForSymbol(symbol);
  if (events.length === 0) return candles;

  return candles.map(candle => {
    let factor = 1.0;
    const candleDate = normalizeDate(candle);

    for (const evt of events) {
      if (candleDate < evt.exDate) {
        factor *= evt.ratio;
      }
    }

    if (factor === 1.0) return candle;

    const adjusted = { ...candle };
    if (Number.isFinite(adjusted.open)) adjusted.open = Number((adjusted.open * factor).toFixed(4));
    if (Number.isFinite(adjusted.high)) adjusted.high = Number((adjusted.high * factor).toFixed(4));
    if (Number.isFinite(adjusted.low)) adjusted.low = Number((adjusted.low * factor).toFixed(4));
    if (Number.isFinite(adjusted.close)) adjusted.close = Number((adjusted.close * factor).toFixed(4));
    if (Number.isFinite(adjusted.adjustedClose)) adjusted.adjustedClose = Number((adjusted.adjustedClose * factor).toFixed(4));
    if (Number.isFinite(adjusted.volume)) adjusted.volume = Math.round(adjusted.volume / factor);

    return adjusted;
  });
}

/**
 * Ajusta uma série histórica simplificada [{ date, close }]
 */
function adjustHistoricalSeries(history, symbol) {
  if (!Array.isArray(history) || history.length === 0) return [];
  const events = getEventsForSymbol(symbol);
  if (events.length === 0) return history;

  return history.map(item => {
    let factor = 1.0;
    const itemDate = normalizeDate(item);

    for (const evt of events) {
      if (itemDate < evt.exDate) {
        factor *= evt.ratio;
      }
    }

    if (factor === 1.0) return item;

    return {
      ...item,
      close: Number((item.close * factor).toFixed(4)),
      adjustedClose: Number(((item.adjustedClose ?? item.close) * factor).toFixed(4))
    };
  });
}

module.exports = {
  CORPORATE_EVENTS,
  getEventsForSymbol,
  adjustCandles,
  adjustHistoricalSeries
};

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  toWeekKey,
  aggregateWeeklyCandles,
  weeklyReturns,
  getWeeklyTrendState,
  resolveWeeklyClassification,
  rankWeeklyItems
} = require('../src/weekly-relative-strength');

test('toWeekKey normaliza datas para a segunda-feira da semana', () => {
  assert.equal(toWeekKey('20261009'), '2026-10-05'); // Sexta-feira
  assert.equal(toWeekKey('20261008'), '2026-10-05'); // Quinta-feira
  assert.equal(toWeekKey('20261005'), '2026-10-05'); // Segunda-feira
  assert.equal(toWeekKey('2026-10-09'), '2026-10-05');
  assert.equal(toWeekKey('2026-10-05T12:00:00Z'), '2026-10-05');
});

test('aggregateWeeklyCandles agrupa candles diários em candles semanais OHLCV', () => {
  const daily = [
    // Semana 1: 2026-10-05 a 2026-10-09
    { date: '20261005', open: 10, high: 11, low: 9.5, close: 10.5, volume: 100 },
    { date: '20261006', open: 10.5, high: 12, low: 10.2, close: 11.8, volume: 150 },
    { date: '20261007', open: 11.8, high: 12.5, low: 11.5, close: 12.0, volume: 200 },
    { date: '20261008', open: 12.0, high: 13.0, low: 11.9, close: 12.8, volume: 180 },
    { date: '20261009', open: 12.8, high: 13.2, low: 12.4, close: 13.0, volume: 220 },
    // Semana 2: 2026-10-12 a 2026-10-14 (semana parcial/feriado)
    { date: '20261013', open: 13.0, high: 14.0, low: 12.8, close: 13.5, volume: 120 },
    { date: '20261014', open: 13.5, high: 14.2, low: 13.1, close: 14.1, volume: 130 }
  ];

  const weekly = aggregateWeeklyCandles(daily);
  assert.equal(weekly.length, 2);

  // Semana 1
  assert.equal(weekly[0].weekKey, '2026-10-05');
  assert.equal(weekly[0].date, '20261009'); // Último pregão da semana
  assert.equal(weekly[0].open, 10);
  assert.equal(weekly[0].high, 13.2);
  assert.equal(weekly[0].low, 9.5);
  assert.equal(weekly[0].close, 13.0);
  assert.equal(weekly[0].volume, 850);
  assert.equal(weekly[0].daysCount, 5);

  // Semana 2
  assert.equal(weekly[1].weekKey, '2026-10-12');
  assert.equal(weekly[1].date, '20261014');
  assert.equal(weekly[1].open, 13.0);
  assert.equal(weekly[1].high, 14.2);
  assert.equal(weekly[1].low, 12.8);
  assert.equal(weekly[1].close, 14.1);
  assert.equal(weekly[1].volume, 250);
  assert.equal(weekly[1].daysCount, 2);
});

test('weeklyReturns calcula 1M (4 semanas) e 3M (13 semanas) corretamente', () => {
  // Gera 20 semanas com preços conhecidos
  const weekly = Array.from({ length: 20 }, (_, i) => ({
    weekKey: `2026-W${i + 1}`,
    close: 100 + i * 5 // 100, 105, 110, ...
  }));

  const res = weeklyReturns(weekly);
  assert.equal(res.currentPrice, 195); // semana 20 (índice 19)
  // 1M: 4 semanas atrás -> semana 16 (índice 15, preço 175)
  // Retorno = (195 - 175) / 175 * 100 = 11.42857%
  assert.ok(Math.abs(res.m1 - ((195 - 175) / 175 * 100)) < 0.001);
  // 3M: 13 semanas atrás -> semana 7 (índice 6, preço 130)
  // Retorno = (195 - 130) / 130 * 100 = 50.0%
  assert.equal(res.m3, 50);
  assert.equal(res.has1M, true);
  assert.equal(res.has3M, true);
});

test('getWeeklyTrendState classifica tendência estrutural com médias semanais', () => {
  // Série em forte alta: 30 semanas subindo
  const uptrend = Array.from({ length: 30 }, (_, i) => ({ close: 50 + i * 2 }));
  const upState = getWeeklyTrendState(uptrend);
  assert.equal(upState.state, 'BULLISH');
  assert.ok(upState.ema9 > upState.ema21);

  // Série em forte queda: 30 semanas caindo
  const downtrend = Array.from({ length: 30 }, (_, i) => ({ close: 100 - i * 2 }));
  const downState = getWeeklyTrendState(downtrend);
  assert.equal(downState.state, 'BEARISH');
  assert.ok(downState.ema9 < downState.ema21);
});

test('resolveWeeklyClassification aplica faixas visuais da régua de Position Trade', () => {
  // RS >= 90 com tendência de alta -> Líder
  const leader = resolveWeeklyClassification(95, 'BULLISH');
  assert.equal(leader.classification, 'Líder');
  assert.equal(leader.bandKey, 'leader');

  // RS >= 90 mas tendência semanal baixista -> bloqueado de ser Líder (vai para Em observação)
  const blocked = resolveWeeklyClassification(95, 'BEARISH');
  assert.equal(blocked.classification, 'Em observação');
  assert.equal(blocked.bandKey, 'observation');

  // RS 80–89 -> Qualificado
  const qualified = resolveWeeklyClassification(85, 'BULLISH');
  assert.equal(qualified.classification, 'Qualificado');
  assert.equal(qualified.bandKey, 'qualified');

  // RS 70–79 -> Acompanhar
  const watch = resolveWeeklyClassification(75, 'NEUTRAL');
  assert.equal(watch.classification, 'Acompanhar');
  assert.equal(watch.bandKey, 'watch');

  // RS 50–69 -> Em observação
  const obs = resolveWeeklyClassification(60, 'NEUTRAL');
  assert.equal(obs.classification, 'Em observação');
  assert.equal(obs.bandKey, 'observation');

  // RS < 50 -> Abaixo do filtro
  const laggard = resolveWeeklyClassification(42, 'NEUTRAL');
  assert.equal(laggard.classification, 'Abaixo do filtro');
  assert.equal(laggard.bandKey, 'laggard');
});

test('rankWeeklyItems gera ordenação e scores percentis de 0 a 100', () => {
  const items = [
    { symbol: 'A', relativeScore: 50, trendState: 'BULLISH' },
    { symbol: 'B', relativeScore: 10, trendState: 'BULLISH' },
    { symbol: 'C', relativeScore: 30, trendState: 'BULLISH' },
    { symbol: 'D', relativeScore: -20, trendState: 'BEARISH' }
  ];

  const ranked = rankWeeklyItems(items);
  assert.equal(ranked.length, 4);
  assert.equal(ranked[0].symbol, 'A');
  assert.equal(ranked[0].score, 100);
  assert.equal(ranked[0].rank, 1);

  assert.equal(ranked[1].symbol, 'C');
  assert.equal(ranked[1].score, 67);
  assert.equal(ranked[1].rank, 2);

  assert.equal(ranked[2].symbol, 'B');
  assert.equal(ranked[2].score, 33);
  assert.equal(ranked[2].rank, 3);

  assert.equal(ranked[3].symbol, 'D');
  assert.equal(ranked[3].score, 0);
  assert.equal(ranked[3].rank, 4);
});

test('buildWeeklyClass agrega, ranqueia e estrutura classe completa no semanal', () => {
  const benchmarkDaily = Array.from({ length: 30 }, (_, i) => ({
    date: `2026${String(Math.floor(i / 5) + 1).padStart(2, '0')}${String((i % 5) + 1).padStart(2, '0')}`,
    close: 100 + i * 2
  }));

  const stock1Daily = Array.from({ length: 30 }, (_, i) => ({
    date: `2026${String(Math.floor(i / 5) + 1).padStart(2, '0')}${String((i % 5) + 1).padStart(2, '0')}`,
    close: 50 + i * 3
  }));

  const stock2Daily = Array.from({ length: 30 }, (_, i) => ({
    date: `2026${String(Math.floor(i / 5) + 1).padStart(2, '0')}${String((i % 5) + 1).padStart(2, '0')}`,
    close: 80 - i
  }));

  const histories = new Map([
    ['ALFA3', stock1Daily],
    ['BETA3', stock2Daily]
  ]);

  const catalog = [
    { symbol: 'ALFA3', name: 'Alfa SA', sector: 'Tecnologia' },
    { symbol: 'BETA3', name: 'Beta SA', sector: 'Financeiro' }
  ];

  const result = require('../src/weekly-relative-strength').buildWeeklyClass({
    assetClass: 'stock_ibov',
    catalogItems: catalog,
    histories,
    benchmarkDailyHistory: benchmarkDaily,
    benchmarkSymbol: 'IBOV'
  });

  assert.equal(result.assetClass, 'stock_ibov');
  assert.equal(result.timeframe, 'weekly');
  assert.equal(result.available, 2);
  assert.equal(result.items[0].symbol, 'ALFA3');
  assert.equal(result.items[0].score, 100);
  assert.equal(result.items[1].symbol, 'BETA3');
  assert.equal(result.items[1].score, 0);
});


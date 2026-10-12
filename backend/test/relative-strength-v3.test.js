'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  readCache,
  classStrengthFromCache,
  classStrengthWeeklyFromCache
} = require('../src/market-data');
const { nasdaqRelativeStrengthEngine } = require('../src/nasdaq-relative-strength');
const {
  aggregateWeeklyCandles,
  weeklyReturns,
  getWeeklyTrendState,
  resolveWeeklyClassification,
  rankWeeklyItems
} = require('../src/weekly-relative-strength');

test('Força Relativa: preserva 100% da integridade do Diário (Swing Trade)', async () => {
  const cache = await readCache();
  const daily = classStrengthFromCache(cache);

  assert.ok(daily.stock_ibov, 'Universo stock_ibov deve existir no Diário');
  assert.ok(daily.stock_other, 'Universo stock_other deve existir no Diário');
  assert.ok(daily.fii, 'Universo fii deve existir no Diário');
  assert.ok(daily.bdr, 'Universo bdr deve existir no Diário');

  assert.strictEqual(daily.stock_ibov.items.length, 76, 'Ibov diário deve conter 76 ativos');
  assert.strictEqual(daily.fii.items.length, 106, 'FIIs diário deve conter 106 ativos');
  assert.strictEqual(daily.bdr.items.length, 34, 'BDRs diário deve conter 34 ativos');

  // Verify daily returns are present and valid
  const firstItem = daily.stock_ibov.items[0];
  assert.ok(Number.isFinite(firstItem.m1), '1M diário deve ser numérico');
  assert.ok(Number.isFinite(firstItem.m3), '3M diário deve ser numérico');
  assert.ok(Number.isFinite(firstItem.score), 'RS score diário deve ser numérico');
  assert.strictEqual(firstItem.score, 100, 'Primeiro colocado diário tem RS 100');
});

test('Força Relativa: calcula e entrega dados do Semanal (Position Trade)', async () => {
  const cache = await readCache();
  const weekly = classStrengthWeeklyFromCache(cache);

  assert.ok(weekly.stock_ibov, 'Universo stock_ibov semanal deve existir');
  assert.ok(weekly.stock_other, 'Universo stock_other semanal deve existir');
  assert.ok(weekly.fii, 'Universo fii semanal deve existir');
  assert.ok(weekly.bdr, 'Universo bdr semanal deve existir');

  assert.strictEqual(weekly.stock_ibov.items.length, 76, 'Ibov semanal deve conter 76 ativos');
  assert.strictEqual(weekly.fii.items.length, 106, 'FIIs semanal deve conter 106 ativos');
  assert.strictEqual(weekly.bdr.items.length, 34, 'BDRs semanal deve conter 34 ativos');

  const topWeekly = weekly.stock_ibov.items[0];
  assert.strictEqual(topWeekly.timeframe, 'weekly', 'Ativo semanal deve ter timeframe=weekly');
  assert.ok(Number.isFinite(topWeekly.m1), '1M semanal deve ser numérico');
  assert.ok(Number.isFinite(topWeekly.m3), '3M semanal deve ser numérico');
  assert.ok(Number.isFinite(topWeekly.score), 'RS score semanal deve ser numérico');
  assert.ok(topWeekly.weeklyTrend, 'Ativo semanal deve ter weeklyTrend calculado');
  assert.ok(['BULLISH', 'BEARISH', 'NEUTRAL'].includes(topWeekly.weeklyTrend.state));
  assert.ok(Number.isFinite(topWeekly.weeklyTrend.ema9));
  assert.ok(Number.isFinite(topWeekly.weeklyTrend.ema21));
  assert.ok(Number.isFinite(topWeekly.weeklyTrend.sma40));
});

test('Força Relativa: regra de negócio semanal impede Líder com tendência de baixa/neutra', () => {
  const resBullish = resolveWeeklyClassification(95, 'BULLISH');
  assert.strictEqual(resBullish.classification, 'Líder', 'RS 95 com alta semanal é Líder');
  assert.strictEqual(resBullish.bandKey, 'leader');

  const resBearish = resolveWeeklyClassification(95, 'BEARISH');
  assert.strictEqual(resBearish.classification, 'Em observação', 'RS 95 com baixa semanal deve cair para Em observação');
  assert.strictEqual(resBearish.bandKey, 'observation');

  const resNeutral = resolveWeeklyClassification(92, 'NEUTRAL');
  assert.strictEqual(resNeutral.classification, 'Qualificado', 'RS 92 com tendência neutra fica como Qualificado');
  assert.strictEqual(resNeutral.bandKey, 'qualified');
});

test('Força Relativa: Nasdaq-100 entrega ranking Diário e Semanal', () => {
  const nasdaqDaily = nasdaqRelativeStrengthEngine.getNasdaqRelativeStrength('daily');
  assert.strictEqual(nasdaqDaily.status, 'OK');
  assert.strictEqual(nasdaqDaily.ranking.length, 100, 'Nasdaq diário deve conter 100 ativos');

  const nasdaqWeekly = nasdaqRelativeStrengthEngine.getNasdaqRelativeStrength('weekly');
  assert.strictEqual(nasdaqWeekly.status, 'OK');
  assert.strictEqual(nasdaqWeekly.ranking.length, 100, 'Nasdaq semanal deve conter 100 ativos');
  assert.strictEqual(nasdaqWeekly.timeframe, 'weekly');
  assert.ok(nasdaqWeekly.ranking[0].weeklyTrend, 'Top ativo da Nasdaq semanal tem weeklyTrend');
});

test('Força Relativa: Cache estático do frontend contém todos os universos Diários e Semanais', () => {
  const staticCache = require('../../frontend/relative-strength-data-cache.js');
  assert.ok(staticCache, 'Cache estático deve carregar');
  assert.ok(staticCache.dataAsOf, 'Cache estático deve conter dataAsOf');

  // Daily
  assert.strictEqual(staticCache.daily.stock_ibov.items.length, 76, '76 Ibov Diário');
  assert.strictEqual(staticCache.daily.stock_other.items.length, 201, '201 Demais ações Diário');
  assert.strictEqual(staticCache.daily.fii.items.length, 106, '106 FIIs Diário');
  assert.strictEqual(staticCache.daily.bdr.items.length, 34, '34 BDRs Diário');

  // Weekly
  assert.strictEqual(staticCache.weekly.stock_ibov.items.length, 76, '76 Ibov Semanal');
  assert.strictEqual(staticCache.weekly.stock_other.items.length, 201, '201 Demais ações Semanal');
  assert.strictEqual(staticCache.weekly.fii.items.length, 106, '106 FIIs Semanal');
  assert.strictEqual(staticCache.weekly.bdr.items.length, 34, '34 BDRs Semanal');

  // Nasdaq
  assert.strictEqual(staticCache.nasdaq.daily.ranking.length, 100, '100 Nasdaq Diário');
  assert.strictEqual(staticCache.nasdaq.weekly.ranking.length, 100, '100 Nasdaq Semanal');
});


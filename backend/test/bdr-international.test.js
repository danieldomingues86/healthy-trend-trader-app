'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const bdrInternational = require('../src/bdr-international');

test('bdrInternational.isBdr identifica BDRs e rejeita outros ativos', () => {
  assert.equal(bdrInternational.isBdr('NVDC34'), true);
  assert.equal(bdrInternational.isBdr('AAPL34'), true);
  assert.equal(bdrInternational.isBdr('ROXO34'), true);
  assert.equal(bdrInternational.isBdr('GOGL35'), true);
  assert.equal(bdrInternational.isBdr('SPCX34'), true);

  // Não BDRs
  assert.equal(bdrInternational.isBdr('PETR4'), false);
  assert.equal(bdrInternational.isBdr('VALE3'), false);
  assert.equal(bdrInternational.isBdr('HGLG11'), false);
  assert.equal(bdrInternational.isBdr('IBOV'), false);
  assert.equal(bdrInternational.isBdr('IFIX'), false);
  assert.equal(bdrInternational.isBdr(null), false);
  assert.equal(bdrInternational.isBdr(''), false);
});

test('bdrInternational.getUnderlyingDetails resolve tickers e exchanges internacionais com precisão', () => {
  const nvda = bdrInternational.getUnderlyingDetails('NVDC34');
  assert.equal(nvda.underlyingSymbol, 'NVDA');
  assert.equal(nvda.exchange, 'NASDAQ');

  const nubank = bdrInternational.getUnderlyingDetails('ROXO34');
  assert.equal(nubank.underlyingSymbol, 'NU');
  assert.equal(nubank.exchange, 'NYSE');

  const meli = bdrInternational.getUnderlyingDetails('MELI34');
  assert.equal(meli.underlyingSymbol, 'MELI');
  assert.equal(meli.exchange, 'NASDAQ');

  const baba = bdrInternational.getUnderlyingDetails('BABA34');
  assert.equal(baba.underlyingSymbol, 'BABA');
  assert.equal(baba.exchange, 'NYSE');

  // Fallback discreto quando não há mapeamento
  assert.equal(bdrInternational.getUnderlyingDetails('XZYX34'), null);
  assert.equal(bdrInternational.getUnderlyingDetails('PETR4'), null);
});

test('bdrInternational.getStockChartsUrl gera URL canônica e segura', () => {
  assert.equal(bdrInternational.getStockChartsUrl('NVDA'), 'https://stockcharts.com/acp/?s=NVDA');
  assert.equal(bdrInternational.getStockChartsUrl('BRK.B'), 'https://stockcharts.com/acp/?s=BRK.B');
  assert.equal(bdrInternational.getStockChartsUrl('AAPL'), 'https://stockcharts.com/acp/?s=AAPL');
  assert.equal(bdrInternational.getStockChartsUrl(null), null);
  assert.equal(bdrInternational.getStockChartsUrl(''), null);
});

test('bdrInternational.parseNasdaqEarningsPayload avalia janela estrita de 0 a 10 dias corridos e flags estimadas', () => {
  const refDate = '2026-11-13';

  // 1. Evento em 4 dias (17/11/2026) com indicação estimada
  const nvdaPayload = {
    reportText: 'NVIDIA Corporation Common Stock is expected* to report earnings on 11/17/2026 after market close.',
    announcement: 'Earnings announcement* for NVDA: Nov 17, 2026'
  };
  const nvdaResult = bdrInternational.parseNasdaqEarningsPayload(nvdaPayload, refDate);
  assert.ok(nvdaResult);
  assert.equal(nvdaResult.hasUpcoming, true);
  assert.equal(nvdaResult.date, '2026-11-17');
  assert.equal(nvdaResult.dateFormatted, '17/11/2026');
  assert.equal(nvdaResult.daysRemaining, 4);
  assert.equal(nvdaResult.isWithinWindow, true);
  assert.equal(nvdaResult.isEstimated, true);
  assert.equal(nvdaResult.status, 'ESTIMADA');

  // 2. Evento exatamente hoje (0 dias)
  const todayPayload = {
    reportText: 'Company X is confirmed to report earnings on 11/13/2026 before market open.',
    announcement: 'Earnings announcement for X: Nov 13, 2026'
  };
  const todayResult = bdrInternational.parseNasdaqEarningsPayload(todayPayload, refDate);
  assert.equal(todayResult.daysRemaining, 0);
  assert.equal(todayResult.isWithinWindow, true);
  assert.equal(todayResult.isEstimated, false);
  assert.equal(todayResult.status, 'CONFIRMADA');

  // 3. Evento no limite da janela (10 dias: 23/11/2026)
  const limitPayload = {
    reportText: 'Company Y is expected* to report earnings on 11/23/2026.',
    announcement: 'Earnings announcement* for Y: Nov 23, 2026'
  };
  const limitResult = bdrInternational.parseNasdaqEarningsPayload(limitPayload, refDate);
  assert.equal(limitResult.daysRemaining, 10);
  assert.equal(limitResult.isWithinWindow, true);

  // 4. Evento fora da janela (11 dias: 24/11/2026)
  const outsidePayload = {
    reportText: 'Company Z is expected* to report earnings on 11/24/2026.',
    announcement: 'Earnings announcement* for Z: Nov 24, 2026'
  };
  const outsideResult = bdrInternational.parseNasdaqEarningsPayload(outsidePayload, refDate);
  assert.equal(outsideResult.daysRemaining, 11);
  assert.equal(outsideResult.isWithinWindow, false, '11 dias deve estar fora da janela de alerta');

  // 5. Evento passado (ex: ontem 12/11/2026)
  const pastPayload = {
    reportText: 'Company W is confirmed to report earnings on 11/12/2026.',
    announcement: 'Earnings announcement for W: Nov 12, 2026'
  };
  const pastResult = bdrInternational.parseNasdaqEarningsPayload(pastPayload, refDate);
  assert.equal(pastResult.daysRemaining, -1);
  assert.equal(pastResult.isWithinWindow, false);

  // 6. Sem dados futuros reportados
  const noDataPayload = {
    reportText: "Our vendor, Zacks Investment Research, hasn't provided us with the upcoming earnings report date."
  };
  assert.equal(bdrInternational.parseNasdaqEarningsPayload(noDataPayload, refDate), null);
});

test('bdrInternational.getBdrIntegrationData integra StockCharts e Earnings para BDRs e isola ações brasileiras', async () => {
  // Ações brasileiras retornam null
  const petr4 = await bdrInternational.getBdrIntegrationData('PETR4');
  assert.equal(petr4, null, 'Ativos brasileiros não devem poluir a interface com dados de BDR');

  // BDRs conhecidas retornam underlying e StockCharts
  const nvdaBdr = await bdrInternational.getBdrIntegrationData('NVDC34', { referenceDate: '2026-11-13' });
  assert.ok(nvdaBdr);
  assert.equal(nvdaBdr.isBdr, true);
  assert.equal(nvdaBdr.underlyingSymbol, 'NVDA');
  assert.equal(nvdaBdr.exchange, 'NASDAQ');
  assert.equal(nvdaBdr.stockChartsUrl, 'https://stockcharts.com/acp/?s=NVDA');
  assert.ok(nvdaBdr.earnings);
  assert.equal(nvdaBdr.earnings.isWithinWindow, true);
  assert.equal(nvdaBdr.earnings.daysRemaining, 4);

  // BDR sem mapeamento seguro
  const unknownBdr = await bdrInternational.getBdrIntegrationData('ZZZZ34');
  assert.ok(unknownBdr);
  assert.equal(unknownBdr.isBdr, true);
  assert.equal(unknownBdr.underlyingSymbol, null);
  assert.equal(unknownBdr.stockChartsUrl, null);
  assert.equal(unknownBdr.earnings, null);
});

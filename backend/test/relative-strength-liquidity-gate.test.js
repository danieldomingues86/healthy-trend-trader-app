'use strict';

// Setup minimal browser globals for testing frontend module
if (typeof global.window === 'undefined') {
  global.window = global;
  global.document = {
    addEventListener: () => {},
    getElementById: () => null
  };
}

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const {
  readCache,
  classStrengthFromCache,
  classStrengthWeeklyFromCache,
  classifyAsset
} = require('../src/market-data');
const tickerChart = require('../src/ticker-chart');
const LiquidityGateModel = require('../../frontend/liquidity-gate-model');
const relativeStrengthV3 = require('../../frontend/relative-strength-v3');

test('Liquidity Gate em Força Relativa: SEQL3 é reprovado pelo LiquidityGate global com dados reais da B3', () => {
  const b3Hist = tickerChart.loadB3History();
  const seql3History = b3Hist.get('SEQL3');

  assert.ok(Array.isArray(seql3History) && seql3History.length > 0, 'Histórico B3 de SEQL3 deve existir no cache');

  const evaluation = LiquidityGateModel.evaluateLiquidity({
    candles: seql3History,
    symbol: 'SEQL3',
    market: 'B3'
  });

  // Comprova que SEQL3 não cumpre o requisito de liquidez (R$ 214,5 mil/dia < R$ 500 mil/dia)
  assert.strictEqual(evaluation.isEligible, false, 'SEQL3 deve ser inelegível operacionalmente');
  assert.strictEqual(evaluation.code, 'VOLUME_BELOW_MINIMUM');
  assert.strictEqual(evaluation.status, 'VOLUME_INSUFICIENTE');
  assert.ok(evaluation.metrics.averageDailyVolume < 500000, 'Volume diário deve ser inferior a R$ 500.000');
  assert.ok(evaluation.reason.includes('500.000'), 'Motivo deve citar o mínimo de R$ 500.000,00');
  assert.strictEqual(evaluation.badge.text, 'BLOQUEADO POR LIQUIDEZ');
});

test('Liquidity Gate em Força Relativa: SEQL3 é estritamente excluído do ranking oficial e de Líderes', async () => {
  const cache = await readCache();
  const classes = classStrengthFromCache(cache);
  const stockOther = classes.stock_other;

  // 1. SEQL3 não deve estar em items do ranking
  const inItems = stockOther.items.find(x => x.symbol === 'SEQL3');
  assert.strictEqual(inItems, undefined, 'SEQL3 não pode aparecer no ranking oficial de Demais Ações');

  // 2. SEQL3 não pode estar no top-level cache.relativeStrength
  const inTopRelative = cache.relativeStrength.find(x => x.symbol === 'SEQL3');
  assert.strictEqual(inTopRelative, undefined, 'SEQL3 não pode aparecer no array unificado relativeStrength');

  // 3. SEQL3 deve estar preservado no array excludedByLiquidity com seu diagnóstico
  const inExcluded = stockOther.excludedByLiquidity.find(x => x.symbol === 'SEQL3');
  assert.ok(inExcluded, 'SEQL3 deve constar no repositório de ativos excluídos por liquidez');
  assert.strictEqual(inExcluded.liquidity.isEligible, false);
  assert.strictEqual(inExcluded.liquidity.code, 'VOLUME_BELOW_MINIMUM');
  assert.strictEqual(inExcluded.rank, null, 'Ativo excluído não pode ter rank ordinal');
  assert.ok(inExcluded.score === null || inExcluded.score === 0, 'Ativo excluído não pode ter score competitivo');

  // 4. O primeiro colocado (#1) de Demais Ações deve ser um ativo elegível e com liquidez aprovada
  const top1 = stockOther.items[0];
  assert.ok(top1, 'Deve existir um primeiro colocado no ranking');
  assert.notStrictEqual(top1.symbol, 'SEQL3', 'SEQL3 jamais pode ser o #1');
  assert.strictEqual(top1.rank, 1, 'Primeiro colocado deve ter rank 1');
  assert.strictEqual(top1.score, 100, 'Primeiro colocado elegível deve ter score 100');
  assert.strictEqual(top1.liquidity.isEligible, true, 'Primeiro colocado deve ter liquidez aprovada');
});

test('Liquidity Gate em Força Relativa: posições 1..N e percentis 100..0 calculados estritamente sobre elegíveis', async () => {
  const cache = await readCache();
  const classes = classStrengthFromCache(cache);
  const stockOther = classes.stock_other;

  assert.ok(stockOther.items.length > 100, 'Devem existir mais de 100 ativos elegíveis em stock_other');

  // Verifica ausência de gaps e ordenação ordinal estrita
  for (let i = 0; i < stockOther.items.length; i++) {
    const item = stockOther.items[i];
    assert.strictEqual(item.rank, i + 1, `Rank do item ${i} deve ser ${i + 1}`);
    assert.ok(item.score >= 0 && item.score <= 100, 'Score deve estar entre 0 e 100');
    assert.strictEqual(item.liquidity?.isEligible, true, `Ativo ranqueado ${item.symbol} deve ter liquidez aprovada`);
    if (i > 0) {
      assert.ok(
        stockOther.items[i - 1].relativeScore >= item.relativeScore,
        `Item ${i - 1} deve ter relativeScore >= item ${i}`
      );
    }
  }
});

test('Liquidity Gate em Força Relativa: classifyAsset identifica SEQL3 como excluído por liquidez', async () => {
  const cache = await readCache();
  const classified = classifyAsset('SEQL3', cache);

  assert.strictEqual(classified.ticker, 'SEQL3');
  assert.strictEqual(classified.assetClass, 'stock_other');
  assert.strictEqual(classified.available, false, 'SEQL3 não pode estar disponível como ativo elegível');
  assert.strictEqual(classified.excludedByLiquidity, true, 'SEQL3 deve ser sinalizado como excludedByLiquidity');
  assert.ok(classified.excludedItem, 'Detalhes do ativo excluído devem ser retornados');
  assert.strictEqual(classified.excludedItem.liquidity.isEligible, false);
});

test('Liquidity Gate em Força Relativa: FIIs e BDRs também aplicam o gate preventivo', async () => {
  const cache = await readCache();
  const classes = classStrengthFromCache(cache);

  // FIIs
  assert.ok(classes.fii.excludedByLiquidity.length > 0, 'Devem existir FIIs excluídos por liquidez');
  for (const excludedFii of classes.fii.excludedByLiquidity) {
    assert.strictEqual(excludedFii.liquidity.isEligible, false);
    assert.strictEqual(classes.fii.items.some(x => x.symbol === excludedFii.symbol), false);
  }

  // BDRs
  for (const bdr of classes.bdr.items) {
    assert.strictEqual(bdr.liquidity.isEligible, true, 'Todos os BDRs ranqueados devem ter liquidez aprovada');
  }
});

test('Liquidity Gate no Frontend: pesquisa direta por SEQL3 diagnostica REPROVADO — LIQUIDITY GATE', () => {
  const staticCache = require('../../frontend/relative-strength-data-cache.js');
  const stockOther = staticCache.daily.stock_other;

  // Simula busca por SEQL3
  window.relativeStrengthSearchQuery = 'SEQL3';
  window.relativeStrengthSelectedGroup = '';
  window.relativeStrengthSelectedResilience = '';
  window.relativeStrengthPageSize = 20;
  window.relativeStrengthCurrentPage = 1;
  window.relativeStrengthViewMode = 'ranking';

  const result = relativeStrengthV3.getFilteredAndPagedItems(
    stockOther.items,
    stockOther.excludedByLiquidity
  );

  // SEQL3 não aparece nos ativos elegíveis filtrados
  assert.strictEqual(result.filtered.length, 0, 'Nenhum ativo elegível deve corresponder a SEQL3');

  // SEQL3 aparece nos ativos excluídos correspondentes à pesquisa
  assert.strictEqual(result.matchedExcluded.length, 1, 'SEQL3 deve ser capturado em matchedExcluded');
  const matched = result.matchedExcluded[0];
  assert.strictEqual(matched.symbol, 'SEQL3');
  assert.strictEqual(matched.liquidity.isEligible, false);
  assert.strictEqual(matched.liquidity.code, 'VOLUME_BELOW_MINIMUM');

  // Geração do alerta HTML de diagnóstico
  const alertHtml = relativeStrengthV3.renderLiquiditySearchAlert(result.matchedExcluded, 'b3');
  assert.ok(alertHtml.includes('REPROVADO — LIQUIDITY GATE'), 'Alerta deve conter REPROVADO — LIQUIDITY GATE');
  assert.ok(alertHtml.includes('SEQL3'), 'Alerta deve citar o ticker SEQL3');
  assert.ok(alertHtml.includes('BLOQUEADO POR LIQUIDEZ'), 'Alerta deve conter badge BLOQUEADO POR LIQUIDEZ');
  assert.ok(alertHtml.includes('214.516') || alertHtml.includes('214,5 mil') || alertHtml.includes('391.836') || alertHtml.includes('391,8 mil'), 'Alerta deve apresentar a métrica apurada');
  assert.ok(alertHtml.includes('500.000'), 'Alerta deve apresentar o limite mínimo exigido');
});

test('Liquidity Gate no Frontend: modo excluídos pagina e exibe tabela informativa', () => {
  const staticCache = require('../../frontend/relative-strength-data-cache.js');
  const stockOther = staticCache.daily.stock_other;

  window.relativeStrengthSearchQuery = '';
  window.relativeStrengthSelectedGroup = '';
  window.relativeStrengthPageSize = 10;
  window.relativeStrengthCurrentPage = 1;
  window.relativeStrengthViewMode = 'excluded';

  const result = relativeStrengthV3.getFilteredAndPagedItems(
    stockOther.items,
    stockOther.excludedByLiquidity
  );

  assert.strictEqual(result.filtered.length, stockOther.excludedByLiquidity.length);
  assert.strictEqual(result.paged.length, Math.min(10, stockOther.excludedByLiquidity.length));
  assert.ok(result.totalPages >= 1);

  const tableHtml = relativeStrengthV3.renderExcludedTableRows(result.paged, 'b3');
  assert.ok(tableHtml.includes('rs-row-excluded'));
  assert.ok(tableHtml.includes('BLOQUEADO'));
});

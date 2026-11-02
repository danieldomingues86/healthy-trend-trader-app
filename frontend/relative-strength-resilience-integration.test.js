'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Mock browser globals
global.window = global;
window.currentRelativeStrengthMarket = 'b3';
window.currentRelativeStrengthTimeframe = 'daily';
window.relativeStrengthSearchQuery = '';
window.relativeStrengthSelectedGroup = '';
window.relativeStrengthSelectedResilience = '';
window.relativeStrengthPageSize = 20;
window.relativeStrengthCurrentPage = 1;
window.appLanguage = 'pt-BR';

const MarketResilienceModel = require('./market-resilience-model.js');
window.MarketResilienceModel = MarketResilienceModel;
global.MarketResilienceModel = MarketResilienceModel;
const { getFilteredAndPagedItems, getLeituraInfo, renderTableRows } = require('./relative-strength-v3.js');

test('Resiliência 12M: não altera, não substitui e não interfere no score ou classificação RS', () => {
  // Test item: RS 92 (Líder), with weak resilience
  const itemLiderFraco = {
    symbol: 'ANIM3',
    score: 92,
    trendState: 'BULLISH',
    resilience12m: {
      score: 32,
      label: 'Fraca',
      badgeColor: 'red',
      dot: '🔴',
      outperformance: -1.2,
      beatRate: 35.0,
      avgAssetDrop: -2.8,
      avgBenchDrop: -1.6
    }
  };

  const leitura = getLeituraInfo(itemLiderFraco, 'daily');
  assert.equal(leitura.label, 'Líder', 'Ativo com RS 92 DEVE ser classificado estritamente como Líder');
  assert.equal(leitura.tierClass, 'leader', 'Classe do tier deve ser leader');

  // Test item: RS 36 (Abaixo do filtro), with excellent resilience
  const itemFiltroExcelente = {
    symbol: 'VALE3',
    score: 36,
    trendState: 'BEARISH',
    resilience12m: {
      score: 83,
      label: 'Excelente',
      badgeColor: 'green',
      dot: '🟢',
      outperformance: 0.35,
      beatRate: 58.0,
      avgAssetDrop: -0.55,
      avgBenchDrop: -0.90
    }
  };

  const leituraFiltro = getLeituraInfo(itemFiltroExcelente, 'daily');
  assert.equal(leituraFiltro.label, 'Abaixo do filtro', 'Ativo com RS 36 DEVE ser Abaixo do filtro mesmo com Resiliência Excelente');
  assert.equal(leituraFiltro.tierClass, 'laggard');
});

test('Resiliência 12M: filtro por faixa de resiliência preserva RS e ranking original', () => {
  const items = [
    { symbol: 'WEGE3', score: 98, globalRank: 1, sector: 'Indústria', resilience12m: { score: 87, label: 'Excelente' } },
    { symbol: 'PETR4', score: 95, globalRank: 2, sector: 'Petróleo', resilience12m: { score: 99, label: 'Excelente' } },
    { symbol: 'ITUB4', score: 88, globalRank: 3, sector: 'Financeiro', resilience12m: { score: 41, label: 'Moderada' } },
    { symbol: 'ANIM3', score: 85, globalRank: 4, sector: 'Educação', resilience12m: { score: 32, label: 'Fraca' } }
  ];

  global.window = {
    relativeStrengthSearchQuery: '',
    relativeStrengthSelectedGroup: '',
    relativeStrengthSelectedResilience: 'excelente',
    relativeStrengthPageSize: 20,
    relativeStrengthCurrentPage: 1
  };

  const resExcelente = getFilteredAndPagedItems(items);
  assert.equal(resExcelente.filtered.length, 2, 'Deveria filtrar exatamente 2 ativos excelentes');
  assert.equal(resExcelente.filtered[0].symbol, 'WEGE3');
  assert.equal(resExcelente.filtered[0].globalRank, 1, 'Rank global do WEGE3 deve ser preservado como 1');
  assert.equal(resExcelente.filtered[0].score, 98, 'Score RS deve ser rigorosamente preservado');

  // Filtrar por moderada
  global.window.relativeStrengthSelectedResilience = 'moderada';
  const resModerada = getFilteredAndPagedItems(items);
  assert.equal(resModerada.filtered.length, 1);
  assert.equal(resModerada.filtered[0].symbol, 'ITUB4');
  assert.equal(resModerada.filtered[0].globalRank, 3, 'Rank global do ITUB4 deve permanecer 3');

  // Filtrar por todas
  global.window.relativeStrengthSelectedResilience = '';
  const resTodas = getFilteredAndPagedItems(items);
  assert.equal(resTodas.filtered.length, 4, 'Todas deve retornar os 4 ativos intactos');
});

test('Resiliência 12M: renderTableRows gera ícone discreto de resiliência e não coluna permanente de nota', () => {
  const pagedItems = [
    {
      symbol: 'PETR3',
      name: 'PETROBRAS',
      sector: 'Energia e minerais',
      m1: 11.4,
      m3: 22.4,
      score: 100,
      globalRank: 1,
      resilience12m: {
        score: 97,
        label: 'Excelente',
        badgeColor: 'green',
        dot: '🟢',
        outperformance: 1.7,
        beatRate: 78.0
      }
    }
  ];

  global.window = {
    appLanguage: 'pt-BR',
    openTickerAnalysis: () => {},
    openResilienceAnalysis: () => {},
    addToWatchlist: () => {}
  };

  const html = renderTableRows(pagedItems, 'daily', false);
  assert.ok(!html.includes('class="td-resilience"'), 'NÃO deve conter coluna fixa de resiliência com texto/pills');
  assert.ok(html.includes('td-resilience-col'), 'Deveria conter a coluna compacta com ícone');
  assert.ok(html.includes('rs-icon-btn-resilience'), 'Deveria conter o botão discreto com ícone de escudo');
  assert.ok(html.includes('Ver resiliência (12M)'), 'Deveria conter o tooltip "Ver resiliência (12M)"');
  assert.ok(html.includes('rs-btn-analysis'), 'Deveria manter o botão Ver gráfico');
  assert.ok(html.includes('td-reading'), 'Deveria conter a coluna td-reading');
});

test('Resiliência 12M: tooltips canônicos e explicabilidade', () => {
  assert.ok(MarketResilienceModel.TOOLTIPS.rsReading.includes('Classificação baseada exclusivamente na Força Relativa'));
  assert.ok(MarketResilienceModel.TOOLTIPS.resilience12m.includes('dados EOD / Diário'));
  assert.ok(MarketResilienceModel.TOOLTIPS.explanationBanner.includes('métrica complementar'));
});

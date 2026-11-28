'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BdrIntelligenceModel = require('./bdr-intelligence-model');
const bdrIntelligenceService = require('../backend/src/bdr-intelligence');

function makeTrendCandles(startPrice, step, count = 80, baseDatePrefix = '2026-') {
  const list = [];
  for (let i = 0; i < count; i++) {
    const month = String(Math.floor(i / 28) + 8).padStart(2, '0');
    const day = String((i % 28) + 1).padStart(2, '0');
    const close = Number((startPrice + i * step).toFixed(4));
    list.push({
      date: `${baseDatePrefix}${month}-${day}`,
      open: Number((close - step * 0.3).toFixed(4)),
      high: Number((close + Math.abs(step) * 0.5 + 0.2).toFixed(4)),
      low: Number((close - Math.abs(step) * 0.5 - 0.2).toFixed(4)),
      close
    });
  }
  return list;
}

test('BdrIntelligenceModel: identifica mercado de origem, índice internacional (sem usar BDRX) e paridade de cada BDR', () => {
  const aaplMeta = BdrIntelligenceModel.getBdrMetadata('AAPL34');
  assert.equal(aaplMeta.bdrSymbol, 'AAPL34');
  assert.equal(aaplMeta.underlyingSymbol, 'AAPL');
  assert.equal(aaplMeta.exchange, 'NASDAQ');
  assert.equal(aaplMeta.benchmarkId, 'NASDAQ');
  assert.equal(aaplMeta.benchmarkName, 'Nasdaq-100');
  assert.equal(aaplMeta.conversionFactor, 0.05);

  const walmMeta = BdrIntelligenceModel.getBdrMetadata('WALM34');
  assert.equal(walmMeta.underlyingSymbol, 'WMT');
  assert.equal(walmMeta.exchange, 'NYSE');
  assert.equal(walmMeta.benchmarkId, 'SP500');
  assert.equal(walmMeta.benchmarkName, 'S&P 500');

  // Mesmo se alguém passar benchmarkId = 'BDRX', o modelo substitui pelo índice de origem real
  const guardedMeta = BdrIntelligenceModel.getBdrMetadata('AAPL34', { benchmarkId: 'BDRX' });
  assert.notEqual(guardedMeta.benchmarkId, 'BDRX', 'Nunca deve usar BDRX como substituto do índice de origem');
  assert.equal(guardedMeta.benchmarkId, 'NASDAQ');
});

test('BdrIntelligenceModel: Ciclo do Mercado de Origem utiliza EMA 10 e EMA 30 no Diário e não confunde 1 pregão isolado com mudança de ciclo', () => {
  // 1. Tendência de alta consistente -> Ciclo Positivo
  const bullCandles = makeTrendCandles(20000, 35, 60);
  const bullCycle = BdrIntelligenceModel.evaluateOriginMarketCycle(bullCandles, {
    benchmarkId: 'NASDAQ',
    benchmarkName: 'Nasdaq-100'
  });
  assert.equal(bullCycle.isComplete, true);
  assert.equal(bullCycle.emaFastPeriod, 10);
  assert.equal(bullCycle.emaSlowPeriod, 30);
  assert.equal(bullCycle.state, 'POSITIVE');
  assert.equal(bullCycle.classification, 'Ciclo Positivo');
  assert.ok(bullCycle.ema10 > bullCycle.ema30);

  // 2. Tendência de baixa com repique de 1 único pregão acima da EMA 10 -> Ciclo de Transição (não Positivo!)
  const bearCandles = makeTrendCandles(21000, -40, 60);
  // Último candle dá um salto de 1 pregão acima da EMA 10, mas EMA 10 segue abaixo da EMA 30
  bearCandles[bearCandles.length - 1].close = bearCandles[bearCandles.length - 2].close + 220;
  const singleDayBounce = BdrIntelligenceModel.evaluateOriginMarketCycle(bearCandles, {
    benchmarkId: 'NASDAQ',
    benchmarkName: 'Nasdaq-100'
  });
  assert.notEqual(singleDayBounce.state, 'POSITIVE', 'Recuperação de 1 pregão não deve ser confundida com Ciclo Positivo');
  assert.equal(singleDayBounce.state, 'TRANSITION');
  assert.equal(singleDayBounce.classification, 'Ciclo de Transição');

  // 3. Tendência de baixa persistente -> Ciclo Negativo
  const pureBearCandles = makeTrendCandles(21000, -45, 60);
  const bearCycle = BdrIntelligenceModel.evaluateOriginMarketCycle(pureBearCandles, {
    benchmarkId: 'SP500',
    benchmarkName: 'S&P 500'
  });
  assert.equal(bearCycle.state, 'NEGATIVE');
  assert.equal(bearCycle.classification, 'Ciclo Negativo');
});

test('BdrIntelligenceModel: Força Individual da Empresa utiliza EMA 10 e EMA 72 no Diário da ação original', () => {
  const bullStock = makeTrendCandles(150, 0.65, 90);
  const companyPos = BdrIntelligenceModel.evaluateCompanyStructure(bullStock, {
    underlyingSymbol: 'AAPL',
    exchange: 'NASDAQ',
    rsScore: 91
  });
  assert.equal(companyPos.isComplete, true);
  assert.equal(companyPos.emaFastPeriod, 10);
  assert.equal(companyPos.emaSlowPeriod, 72);
  assert.equal(companyPos.state, 'POSITIVE');
  assert.equal(companyPos.classification, 'Estrutura Positiva');
  assert.ok(companyPos.ema10 > companyPos.ema72);

  const bearStock = makeTrendCandles(220, -0.8, 90);
  const companyNeg = BdrIntelligenceModel.evaluateCompanyStructure(bearStock, {
    underlyingSymbol: 'INTC',
    exchange: 'NASDAQ',
    rsScore: 18
  });
  assert.equal(companyNeg.state, 'NEGATIVE');
  assert.equal(companyNeg.classification, 'Estrutura Negativa');
});

test('BdrIntelligenceModel: Decomposição do preço reproduz exatamente o exemplo (+2,00% ação e -3,00% câmbio = -1,06% BDR teórica) e separa preço efetivo B3', () => {
  const decomp = BdrIntelligenceModel.calculatePriceDecomposition({
    underlyingPriceUsd: 195.20,
    underlyingChangePct: 2.00,
    fxRate: 5.50,
    fxChangePct: -3.00,
    conversionFactor: 1.0, // Exemplo 1 BDR = 1 ação ou com fator específico
    observedBdrPriceBrl: 1070.00,
    observedBdrChangePct: -1.15
  });

  assert.equal(decomp.isComplete, true);
  assert.equal(decomp.underlyingContributionPct, 2.00);
  assert.equal(decomp.fxContributionPct, -3.00);
  assert.equal(decomp.theoreticalBdrChangePct, -1.06);
  assert.equal(decomp.observedBdrChangePct, -1.15);
  assert.equal(decomp.theoreticalPriceBrl, 1073.60);
  assert.equal(decomp.observedPriceBrl, 1070.00);
  assert.equal(
    decomp.message,
    'A empresa está valorizando no mercado de origem, mas a desvalorização do dólar está superando essa valorização. A queda da BDR não representa necessariamente fraqueza da empresa.'
  );
});

test('BdrIntelligenceModel: Matriz de Interpretação e Hierarquia de 3 Níveis impedem que o câmbio compense ciclo ou estrutura negativa', () => {
  // Caso 1: Positivo + Positiva + Favorável -> Cenário ideal
  const r1 = BdrIntelligenceModel.resolveDecisionHierarchy(
    { isComplete: true, state: 'POSITIVE', classification: 'Ciclo Positivo', tone: 'good' },
    { isComplete: true, state: 'POSITIVE', classification: 'Estrutura Positiva', tone: 'good' },
    { isComplete: true, state: 'FAVORABLE', classification: 'Câmbio Favorável', tone: 'good' }
  );
  assert.equal(r1.guidance, 'Cenário ideal');
  assert.equal(r1.topDiagnosis, 'Favorável para análise');
  assert.equal(r1.isOperable, true);

  // Caso 2: Positivo + Positiva + Desfavorável -> Oportunidade com pressão cambial (Conflito entre fatores)
  const r2 = BdrIntelligenceModel.resolveDecisionHierarchy(
    { isComplete: true, state: 'POSITIVE', classification: 'Ciclo Positivo', tone: 'good' },
    { isComplete: true, state: 'POSITIVE', classification: 'Estrutura Positiva', tone: 'good' },
    { isComplete: true, state: 'UNFAVORABLE', classification: 'Câmbio Desfavorável', tone: 'bad' }
  );
  assert.equal(r2.guidance, 'Oportunidade com pressão cambial');
  assert.equal(r2.topDiagnosis, 'Atenção: conflito entre fatores');
  assert.equal(r2.hasConflict, true);
  assert.equal(r2.isOperable, true);

  // Caso 3: Positivo + Positiva + Neutro -> Cenário favorável
  const r3 = BdrIntelligenceModel.resolveDecisionHierarchy(
    { isComplete: true, state: 'POSITIVE', classification: 'Ciclo Positivo', tone: 'good' },
    { isComplete: true, state: 'POSITIVE', classification: 'Estrutura Positiva', tone: 'good' },
    { isComplete: true, state: 'NEUTRAL', classification: 'Câmbio Neutro', tone: 'info' }
  );
  assert.equal(r3.guidance, 'Cenário favorável');

  // Caso 4: Positivo + Negativa + Favorável -> Não operar
  const r4 = BdrIntelligenceModel.resolveDecisionHierarchy(
    { isComplete: true, state: 'POSITIVE', classification: 'Ciclo Positivo', tone: 'good' },
    { isComplete: true, state: 'NEGATIVE', classification: 'Estrutura Negativa', tone: 'bad' },
    { isComplete: true, state: 'FAVORABLE', classification: 'Câmbio Favorável', tone: 'good' }
  );
  assert.equal(r4.guidance, 'Não operar');
  assert.equal(r4.isOperable, false);

  // Caso 5: Transição + Positiva + Favorável -> Aguardar confirmação do ciclo
  const r5 = BdrIntelligenceModel.resolveDecisionHierarchy(
    { isComplete: true, state: 'TRANSITION', classification: 'Ciclo de Transição', tone: 'warn' },
    { isComplete: true, state: 'POSITIVE', classification: 'Estrutura Positiva', tone: 'good' },
    { isComplete: true, state: 'FAVORABLE', classification: 'Câmbio Favorável', tone: 'good' }
  );
  assert.equal(r5.guidance, 'Aguardar confirmação do ciclo');
  assert.equal(r5.isOperable, false);

  // Caso 6: Negativo + Positiva + Favorável -> Bloqueado pela metodologia padrão
  const r6 = BdrIntelligenceModel.resolveDecisionHierarchy(
    { isComplete: true, state: 'NEGATIVE', classification: 'Ciclo Negativo', tone: 'bad' },
    { isComplete: true, state: 'POSITIVE', classification: 'Estrutura Positiva', tone: 'good' },
    { isComplete: true, state: 'FAVORABLE', classification: 'Câmbio Favorável', tone: 'good' }
  );
  assert.equal(r6.guidance, 'Bloqueado pela metodologia padrão');
  assert.equal(r6.isOperable, false);

  // Caso 7: Negativo + Negativa + Qualquer -> Desfavorável
  const r7 = BdrIntelligenceModel.resolveDecisionHierarchy(
    { isComplete: true, state: 'NEGATIVE', classification: 'Ciclo Negativo', tone: 'bad' },
    { isComplete: true, state: 'NEGATIVE', classification: 'Estrutura Negativa', tone: 'bad' },
    { isComplete: true, state: 'FAVORABLE', classification: 'Câmbio Favorável', tone: 'good' }
  );
  assert.equal(r7.guidance, 'Desfavorável');
  assert.equal(r7.isOperable, false);
});

test('BdrIntelligenceModel: Dados incompletos ou defasados são sinalizados e nunca geram diagnóstico conclusivo falso', () => {
  const incompleteEval = BdrIntelligenceModel.evaluateBdrIntelligence({
    bdrSymbol: 'AAPL34',
    bdrCandles: [{ date: '2026-11-26', close: 102.5 }],
    underlyingCandles: [{ date: '2026-11-26', close: 195.2 }], // < 30 candles
    benchmarkCandles: [],
    fxCandles: [{ date: '2026-11-26', close: 5.74 }]
  });

  assert.equal(incompleteEval.decision.isComplete, false);
  assert.equal(incompleteEval.diagnosis.isOperable, false);
  assert.equal(incompleteEval.dataQuality.isComplete, false);
  assert.equal(incompleteEval.dataQuality.status, 'INCOMPLETE');

  // Teste de defasagem entre B3 e EUA
  const staleQuality = BdrIntelligenceModel.evaluateDataQuality({
    isComplete: true,
    bdrDate: '2026-11-26',
    underlyingDate: '2026-11-10',
    benchmarkDate: '2026-11-26',
    fxDate: '2026-11-26'
  });
  assert.equal(staleQuality.isStale, true);
  assert.equal(staleQuality.status, 'STALE');
  assert.ok(staleQuality.warningMessage.includes('Não confunda cotação defasada com variação real'));
});

test('Backend bdr-intelligence service: avalia catálogo real de BDRs com caches em disco e expõe watchlistBadge', async () => {
  const data = await bdrIntelligenceService.getBdrIntelligenceData(null, { ticker: 'AAPL34' });
  assert.ok(data, 'Deve retornar payload de Inteligência BDR');
  assert.equal(data.selectedTicker, 'AAPL34');
  assert.ok(Array.isArray(data.catalog) && data.catalog.length >= 30, 'Catálogo deve conter as BDRs monitoradas');
  assert.ok(data.selected.factors.originMarket.isComplete, 'Fator Mercado de Origem deve estar completo');
  assert.ok(data.selected.factors.company.isComplete, 'Fator Empresa deve estar completo');
  assert.ok(data.selected.factors.fx.isComplete, 'Fator Câmbio deve estar completo');
  assert.ok(data.selected.decomposition.isComplete, 'Decomposição do preço deve estar completa');
  assert.ok(data.selected.watchlistBadge.consolidatedDiagnosis, 'Deve gerar badge consolidado para a Watchlist');
});

test('Integração Frontend: Menu Análise de Mercado, index.html e Watchlist incluem Inteligência BDR', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const watchlistJs = fs.readFileSync(path.join(__dirname, 'watchlist-page.js'), 'utf8');
  const navModelJs = fs.readFileSync(path.join(__dirname, 'navigation-system-model.js'), 'utf8');

  assert.ok(indexHtml.includes('id="bdrintelligence"'), 'index.html deve ter a section #bdrintelligence');
  assert.ok(indexHtml.includes('frontend/bdr-intelligence-model.js'), 'index.html deve carregar bdr-intelligence-model.js');
  assert.ok(indexHtml.includes('frontend/bdr-intelligence.js'), 'index.html deve carregar bdr-intelligence.js');
  assert.ok(navModelJs.includes("id: 'bdrintelligence'"), 'NavigationSystemModel deve registrar bdrintelligence');
  assert.ok(watchlistJs.includes('renderWatchlistCompactBadge'), 'Watchlist deve exibir o indicador compacto de BDRs');
  assert.ok(watchlistJs.includes('openBdrIntelligence'), 'Clicar em uma BDR na Watchlist deve abrir o Painel de Inteligência BDR preenchido');
});

test('Otimização de Layout Full-Width e Matriz Completa de 27 Combinações: ocupa 100% da área útil sem fundo claro lateral', () => {
  const css = fs.readFileSync(path.join(__dirname, 'bdr-intelligence.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, 'bdr-intelligence.js'), 'utf8');

  // 1. Matriz completa com todas as 27 combinações explícitas (3 Ciclo x 3 Empresa x 3 Câmbio)
  assert.equal(
    BdrIntelligenceModel.INTERPRETATION_MATRIX.length,
    27,
    'A Matriz de Interpretação deve conter todas as 27 combinações explícitas (3x3x3)'
  );

  const markets = ['POSITIVE', 'TRANSITION', 'NEGATIVE'];
  const companies = ['POSITIVE', 'RECOVERY', 'NEGATIVE'];
  const fxs = ['FAVORABLE', 'NEUTRAL', 'UNFAVORABLE'];

  for (const m of markets) {
    for (const c of companies) {
      for (const f of fxs) {
        const match = BdrIntelligenceModel.INTERPRETATION_MATRIX.find(
          (r) => r.market === m && r.company === c && r.fx === f
        );
        assert.ok(match, `Combinação ausente na matriz: ${m} + ${c} + ${f}`);
        if (m === 'NEGATIVE') {
          assert.equal(match.isOperable, false, `Ciclo negativo jamais pode ser operável (${m}+${c}+${f})`);
        }
      }
    }
  }

  // 2. Layout 100% full-width sem max-width artificial e sem fundo claro nas laterais
  assert.ok(!css.includes('max-width: 1580px'), 'Não deve existir limite artificial max-width: 1580px no container');
  assert.ok(css.includes('max-width: none !important'), 'Container principal deve ter max-width: none !important');
  assert.ok(css.includes('width: 100% !important'), 'Container principal deve ocupar 100% da largura disponível');
  assert.ok(css.includes('body:has(#bdrintelligence.active) .main'), 'Deve aplicar fundo escuro em .main');
  assert.ok(css.includes('body:has(#bdrintelligence.active) .content'), 'Deve aplicar fundo escuro e padding 0 em .content');
  assert.ok(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'Bloco 2 deve distribuir os 3 fatores em 3 colunas proporcionais');
  assert.ok(css.includes('grid-template-columns: 1.28fr 1fr'), 'Bloco 3 deve distribuir Decomposição e Orientação em 2 colunas lado a lado');
  assert.ok(js.includes('bdr-full-matrix-table'), 'Bloco 4 deve exibir a tabela da Matriz de Interpretação em largura total');
});

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Mock browser globals for frontend module testing
global.window = global;
window.currentRelativeStrengthMarket = 'b3';
window.currentRelativeStrengthTimeframe = 'daily';
window.relativeStrengthSearchQuery = '';
window.relativeStrengthSelectedGroup = '';
window.relativeStrengthPageSize = 20;
window.relativeStrengthCurrentPage = 1;
window.relativeStrengthSortColumn = 'score';
window.relativeStrengthSortDirection = 'desc';

const staticCache = require('./relative-strength-data-cache.js');
const rsModel = require('./relative-strength-v3.js');
const nasdaqEngine = require('../backend/src/nasdaq-relative-strength.js');

test('Auditoria 1: Regra mandatória ORDER BY score DESC em todos os universos B3 e Nasdaq', () => {
  const universes = [
    { market: 'b3', timeframe: 'daily', key: 'stock_ibov' },
    { market: 'b3', timeframe: 'daily', key: 'stock_other' },
    { market: 'b3', timeframe: 'daily', key: 'fii' },
    { market: 'b3', timeframe: 'daily', key: 'bdr' },
    { market: 'b3', timeframe: 'weekly', key: 'stock_ibov' },
    { market: 'b3', timeframe: 'weekly', key: 'stock_other' },
    { market: 'b3', timeframe: 'weekly', key: 'fii' },
    { market: 'b3', timeframe: 'weekly', key: 'bdr' },
    { market: 'nasdaq', timeframe: 'daily', key: 'nasdaq_100' },
    { market: 'nasdaq', timeframe: 'weekly', key: 'nasdaq_100' }
  ];

  for (const u of universes) {
    window.currentRelativeStrengthMarket = u.market;
    window.currentRelativeStrengthTimeframe = u.timeframe;
    window.relativeStrengthSortColumn = 'score';
    window.relativeStrengthSortDirection = 'desc';

    if (u.market === 'b3') {
      window.relativeStrengthClassesState = {
        selected: u.key,
        classes: {
          [u.key]: staticCache[u.timeframe][u.key]
        }
      };
    } else {
      window[`__nasdaqRelativeStrengthCache_${u.timeframe}`] = staticCache.nasdaq[u.timeframe];
    }

    const dataset = rsModel.getActiveDataset();
    assert.ok(dataset.items.length > 0, `Universo ${u.market}/${u.timeframe}/${u.key} deve ter itens`);

    // Validação estrita: Nenhum ativo com score menor pode vir antes de um com score maior
    for (let i = 1; i < dataset.items.length; i++) {
      const prev = dataset.items[i - 1];
      const curr = dataset.items[i];
      const prevScore = Number(prev.score ?? prev.rsScore ?? 0);
      const currScore = Number(curr.score ?? curr.rsScore ?? 0);

      assert.ok(
        prevScore >= currScore,
        `Violação de ordenação em ${u.market} (${u.timeframe}): ${prev.symbol} (score ${prevScore}) está acima de ${curr.symbol} (score ${currScore})`
      );

      // Ranks devem ser estritamente contíguos de 1 a N
      assert.equal(curr.rank, i + 1, `Item no índice ${i} deve ter rank ${i + 1}`);
      assert.equal(curr.globalRank, i + 1, `Item no índice ${i} deve ter globalRank ${i + 1}`);
    }
  }
});

test('Auditoria 2: Teste de regressão específico do cenário Americano (Nasdaq-100)', () => {
  window.currentRelativeStrengthMarket = 'nasdaq';
  window.currentRelativeStrengthTimeframe = 'daily';
  window.relativeStrengthSortColumn = 'score';
  window.relativeStrengthSortDirection = 'desc';
  window[`__nasdaqRelativeStrengthCache_daily`] = staticCache.nasdaq.daily;

  const dataset = rsModel.getActiveDataset();
  const items = dataset.items;

  // Localiza ativos emblemáticos da divergência relatada
  const highTier = items.filter(i => Number(i.score) >= 70);
  const lowTier = items.filter(i => Number(i.score) < 50);

  assert.ok(highTier.length > 0, 'Deve haver ativos com score >= 70');
  assert.ok(lowTier.length > 0, 'Deve haver ativos com score < 50');

  // Garante que o rank máximo dos ativos highTier seja estritamente MENOR que o rank mínimo dos lowTier
  const maxHighRank = Math.max(...highTier.map(i => i.rank));
  const minLowRank = Math.min(...lowTier.map(i => i.rank));

  assert.ok(
    maxHighRank < minLowRank,
    `Regressão prevenida: Ativo de score alto (#${maxHighRank}) não pode estar abaixo de ativo de score baixo (#${minLowRank})`
  );

  // Verifica explicitamente se existe PYPL e ON no dataset e valida sua ordem relativa se presentes
  const pypl = items.find(i => i.symbol === 'PYPL');
  const on = items.find(i => i.symbol === 'ON');
  if (pypl && on) {
    if (pypl.score > on.score) {
      assert.ok(pypl.rank < on.rank, `PYPL (${pypl.score}) deve estar acima de ON (${on.score})`);
    } else if (on.score > pypl.score) {
      assert.ok(on.rank < pypl.rank, `ON (${on.score}) deve estar acima de PYPL (${pypl.score})`);
    }
  }
});

test('Auditoria 3: Consistência rigorosa entre Score, Faixas, Classificação e Cores', () => {
  const getClassification = rsModel.getScoreClassification;
  const getBadgeClass = rsModel.getScoreBadgeClass;

  const testCases = [
    { score: 100, tier: 'leader', label: 'Líder', badge: 'rs-score-leader', color: 'green' },
    { score: 95, tier: 'leader', label: 'Líder', badge: 'rs-score-leader', color: 'green' },
    { score: 90, tier: 'leader', label: 'Líder', badge: 'rs-score-leader', color: 'green' },
    { score: 89, tier: 'qualified', label: 'Qualificado', badge: 'rs-score-qualified', color: 'green' },
    { score: 80, tier: 'qualified', label: 'Qualificado', badge: 'rs-score-qualified', color: 'green' },
    { score: 79, tier: 'watch', label: 'Acompanhar', badge: 'rs-score-watch', color: 'yellow' },
    { score: 70, tier: 'watch', label: 'Acompanhar', badge: 'rs-score-watch', color: 'yellow' },
    { score: 69, tier: 'observation', label: 'Em observação', badge: 'rs-score-observation', color: 'gray' },
    { score: 50, tier: 'observation', label: 'Em observação', badge: 'rs-score-observation', color: 'gray' },
    { score: 49, tier: 'laggard', label: 'Abaixo do filtro', badge: 'rs-score-laggard', color: 'red' },
    { score: 30, tier: 'laggard', label: 'Abaixo do filtro', badge: 'rs-score-laggard', color: 'red' },
    { score: 0, tier: 'laggard', label: 'Abaixo do filtro', badge: 'rs-score-laggard', color: 'red' }
  ];

  for (const tc of testCases) {
    const res = getClassification(tc.score);
    assert.equal(res.tier, tc.tier, `Score ${tc.score} deve ter tier ${tc.tier}`);
    assert.equal(res.label, tc.label, `Score ${tc.score} deve ter label ${tc.label}`);
    assert.equal(res.badgeClass, tc.badge, `Score ${tc.score} deve ter badgeClass ${tc.badge}`);
    assert.equal(res.colorGroup, tc.color, `Score ${tc.score} deve ter colorGroup ${tc.color}`);
    assert.equal(getBadgeClass(tc.score), tc.badge, `getScoreBadgeClass(${tc.score}) deve retornar ${tc.badge}`);
  }
});

test('Auditoria 4: Ordenação por colunas (manual sort) respeita estritamente o critério escolhido', () => {
  window.currentRelativeStrengthMarket = 'nasdaq';
  window.currentRelativeStrengthTimeframe = 'daily';
  window[`__nasdaqRelativeStrengthCache_daily`] = staticCache.nasdaq.daily;

  const dataset = rsModel.getActiveDataset();

  // 1. Ordenação por Ticker ASC
  window.relativeStrengthSortColumn = 'symbol';
  window.relativeStrengthSortDirection = 'asc';
  const sortSymbolAsc = rsModel.getFilteredAndPagedItems(dataset.items).filtered;
  for (let i = 1; i < sortSymbolAsc.length; i++) {
    assert.ok(
      sortSymbolAsc[i - 1].symbol.localeCompare(sortSymbolAsc[i].symbol) <= 0,
      `Ticker ${sortSymbolAsc[i - 1].symbol} deve vir antes ou igual a ${sortSymbolAsc[i].symbol}`
    );
  }

  // 2. Ordenação por Ticker DESC
  window.relativeStrengthSortColumn = 'symbol';
  window.relativeStrengthSortDirection = 'desc';
  const sortSymbolDesc = rsModel.getFilteredAndPagedItems(dataset.items).filtered;
  for (let i = 1; i < sortSymbolDesc.length; i++) {
    assert.ok(
      sortSymbolDesc[i - 1].symbol.localeCompare(sortSymbolDesc[i].symbol) >= 0,
      `Ticker ${sortSymbolDesc[i - 1].symbol} deve vir depois ou igual a ${sortSymbolDesc[i].symbol}`
    );
  }

  // 3. Ordenação por Retorno 1M DESC
  window.relativeStrengthSortColumn = 'm1';
  window.relativeStrengthSortDirection = 'desc';
  const sortM1Desc = rsModel.getFilteredAndPagedItems(dataset.items).filtered;
  for (let i = 1; i < sortM1Desc.length; i++) {
    assert.ok(
      (Number(sortM1Desc[i - 1].m1) || 0) >= (Number(sortM1Desc[i].m1) || 0),
      `1M de ${sortM1Desc[i - 1].symbol} deve ser >= a ${sortM1Desc[i].symbol}`
    );
  }

  // 4. Retorno para ordenação padrão por Score DESC
  window.relativeStrengthSortColumn = 'score';
  window.relativeStrengthSortDirection = 'desc';
  const restoredScore = rsModel.getFilteredAndPagedItems(dataset.items).filtered;
  for (let i = 1; i < restoredScore.length; i++) {
    assert.ok(
      restoredScore[i - 1].score >= restoredScore[i].score,
      `Ordem padrão restaurada: score ${restoredScore[i - 1].score} deve ser >= ${restoredScore[i].score}`
    );
  }
});

test('Auditoria 5: Paginação preserva a ordenação global e valores entre páginas', () => {
  window.currentRelativeStrengthMarket = 'nasdaq';
  window.currentRelativeStrengthTimeframe = 'daily';
  window.relativeStrengthSortColumn = 'score';
  window.relativeStrengthSortDirection = 'desc';
  window.relativeStrengthPageSize = 20;
  window[`__nasdaqRelativeStrengthCache_daily`] = staticCache.nasdaq.daily;

  const dataset = rsModel.getActiveDataset();

  // Página 1
  window.relativeStrengthCurrentPage = 1;
  const p1 = rsModel.getFilteredAndPagedItems(dataset.items).paged;
  assert.equal(p1.length, 20);

  // Página 2
  window.relativeStrengthCurrentPage = 2;
  const p2 = rsModel.getFilteredAndPagedItems(dataset.items).paged;
  assert.equal(p2.length, 20);

  // O menor score da página 1 deve ser >= ao maior score da página 2
  const minP1 = p1[p1.length - 1].score;
  const maxP2 = p2[0].score;
  assert.ok(
    minP1 >= maxP2,
    `Paginação coerente: Menor score da Pag 1 (${minP1}) deve ser >= Maior score da Pag 2 (${maxP2})`
  );

  // Ranks globais devem ser contíguos: Pag 1 termina em #20, Pag 2 começa em #21
  assert.equal(p1[p1.length - 1].globalRank, 20);
  assert.equal(p2[0].globalRank, 21);
});

test('Auditoria 6: Filtros por setor e busca não desordenam a lista resultante', () => {
  window.currentRelativeStrengthMarket = 'nasdaq';
  window.currentRelativeStrengthTimeframe = 'daily';
  window.relativeStrengthSortColumn = 'score';
  window.relativeStrengthSortDirection = 'desc';
  window.relativeStrengthPageSize = 100;
  window[`__nasdaqRelativeStrengthCache_daily`] = staticCache.nasdaq.daily;

  const dataset = rsModel.getActiveDataset();

  // Filtro por busca
  window.relativeStrengthSearchQuery = 'A';
  window.relativeStrengthSelectedGroup = '';
  const searchResult = rsModel.getFilteredAndPagedItems(dataset.items).filtered;
  assert.ok(searchResult.length > 5);
  for (let i = 1; i < searchResult.length; i++) {
    assert.ok(
      searchResult[i - 1].score >= searchResult[i].score,
      `Filtro de busca não pode desordenar scores: ${searchResult[i - 1].score} >= ${searchResult[i].score}`
    );
  }

  // Reset
  window.relativeStrengthSearchQuery = '';
});

test('Auditoria 7: Tratamento defensivo de dados anômalos ou nulos', () => {
  const dirtyItems = [
    { symbol: 'AAA', score: 85, m3: 10 },
    { symbol: 'BBB', score: null, m3: 5 },
    { symbol: 'CCC', score: undefined, m3: 0 },
    { symbol: 'DDD', score: '92', m3: 15 },
    { symbol: 'EEE', score: 70, m3: 8 }
  ];

  window.relativeStrengthSortColumn = 'score';
  window.relativeStrengthSortDirection = 'desc';
  window.relativeStrengthSearchQuery = '';
  window.relativeStrengthSelectedGroup = '';
  window.relativeStrengthPageSize = 100;

  const res = rsModel.getFilteredAndPagedItems(dirtyItems).filtered;
  assert.equal(res.length, 5);
  // DDD (92) deve ser o primeiro, AAA (85) o segundo, EEE (70) o terceiro, e BBB/CCC com score 0 ao final
  assert.equal(res[0].symbol, 'DDD');
  assert.equal(res[1].symbol, 'AAA');
  assert.equal(res[2].symbol, 'EEE');
});

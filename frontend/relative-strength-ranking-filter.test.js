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

const staticCache = require('./relative-strength-data-cache.js');
const rsModel = require('./relative-strength-v3.js');

test('Ranking RS: todos os ativos de Demais Ações (stock_other) possuem posições de ranking estritamente únicas', () => {
  const dailyOther = staticCache.daily.stock_other.items;
  assert.ok(dailyOther.length > 100, 'stock_other deve conter ativos');

  const seen = new Set();
  const duplicates = [];
  for (const item of dailyOther) {
    if (seen.has(item.rank)) {
      duplicates.push({ symbol: item.symbol, rank: item.rank });
    }
    seen.add(item.rank);
  }

  assert.equal(duplicates.length, 0, `Não deve haver ranks duplicados em stock_other. Encontrados: ${JSON.stringify(duplicates)}`);
});

test('Ranking RS: posições globais são contíguas e ordenadas de 1 a N', () => {
  const dailyOther = staticCache.daily.stock_other.items;
  for (let i = 0; i < dailyOther.length; i++) {
    assert.equal(dailyOther[i].rank, i + 1, `Item no índice ${i} (${dailyOther[i].symbol}) deve ter rank ${i + 1}`);
    if (i > 0) {
      assert.ok(
        dailyOther[i - 1].score >= dailyOther[i].score,
        `Score do item anterior (${dailyOther[i - 1].score}) deve ser >= ao atual (${dailyOther[i].score})`
      );
    }
  }
});

test('Ranking RS: filtro por busca preserva a posição global "#" imutável de cada ativo', () => {
  window.relativeStrengthSearchQuery = 'LU';
  window.relativeStrengthSelectedGroup = '';
  window.relativeStrengthPageSize = 100;
  window.relativeStrengthCurrentPage = 1;

  const dataset = {
    market: 'b3',
    universeKey: 'stock_other',
    items: staticCache.daily.stock_other.items.map(it => ({
      ...it,
      globalRank: it.rank
    }))
  };

  const { filtered } = rsModel.getFilteredAndPagedItems(dataset.items);
  assert.ok(filtered.length >= 3, 'Deve encontrar múltiplos ativos correspondentes a "LU"');

  // Cada ativo filtrado deve manter seu globalRank e seu rank inalterados
  for (const item of filtered) {
    assert.equal(item.globalRank, item.rank, `Ativo ${item.symbol} deve manter globalRank igual a rank`);
  }

  // A ordenação dos ranks filtrados deve ser estritamente crescente
  for (let i = 1; i < filtered.length; i++) {
    assert.ok(
      filtered[i].globalRank > filtered[i - 1].globalRank,
      `Rank filtrado ${filtered[i].globalRank} (${filtered[i].symbol}) deve ser maior que o anterior ${filtered[i - 1].globalRank} (${filtered[i - 1].symbol})`
    );
  }

  // Renderização da tabela deve exibir o globalRank
  const html = rsModel.renderTableRows(filtered, 'daily', false);
  for (const item of filtered) {
    assert.ok(
      html.includes(`<td class="td-rank">${item.globalRank}</td>`),
      `HTML da tabela deve conter <td class="td-rank">${item.globalRank}</td> para o ativo ${item.symbol}`
    );
  }
});

test('Ranking RS: LUPA3 e SIMH3 possuem posições distintas e corretas', () => {
  const dailyOther = staticCache.daily.stock_other.items;
  const simh3 = dailyOther.find(i => i.symbol === 'SIMH3');
  const lupa3 = dailyOther.find(i => i.symbol === 'LUPA3');

  assert.ok(simh3, 'SIMH3 deve existir em stock_other');
  assert.ok(lupa3, 'LUPA3 deve existir em stock_other');

  // SIMH3 é um forte líder com RS alto
  assert.ok(simh3.score >= 90, `SIMH3 deve ter RS >= 90 (atual: ${simh3.score})`);
  assert.ok(simh3.rank <= 15, `SIMH3 deve estar entre os primeiros colocados (atual: #${simh3.rank})`);

  // LUPA3 com grupamento 10:1 ajustado possui retorno negativo de 3M e RS baixo
  assert.ok(lupa3.m3 < 0, `LUPA3 deve ter retorno de 3M negativo após ajuste de grupamento (atual: ${lupa3.m3}%)`);
  assert.ok(lupa3.score <= 50, `LUPA3 deve ter RS <= 50 ("Abaixo do filtro") (atual: ${lupa3.score})`);
  assert.ok(lupa3.rank > 150, `LUPA3 deve estar no final do ranking (atual: #${lupa3.rank})`);

  // Jamais devem compartilhar a mesma posição
  assert.notEqual(simh3.rank, lupa3.rank, 'SIMH3 e LUPA3 não podem ter o mesmo rank');
});

test('Ranking RS: normalização defensiva de getActiveDataset resolve duplicidades automaticamente', () => {
  window.relativeStrengthClassesState = {
    selected: 'stock_other',
    dailyClasses: {
      stock_other: {
        items: [
          { symbol: 'XPTO1', score: 80, m3: 10, rank: 1 },
          { symbol: 'XPTO2', score: 95, m3: 50, rank: 2 },
          { symbol: 'XPTO3', score: 90, m3: 30, rank: 1 } // Duplicata do rank 1
        ]
      }
    }
  };

  const dataset = rsModel.getActiveDataset();
  assert.equal(dataset.items.length, 3);
  assert.equal(dataset.items[0].symbol, 'XPTO2', 'XPTO2 (score 95) deve ser o primeiro colocado');
  assert.equal(dataset.items[0].globalRank, 1);
  assert.equal(dataset.items[1].symbol, 'XPTO3', 'XPTO3 (score 90) deve ser o segundo colocado');
  assert.equal(dataset.items[1].globalRank, 2);
  assert.equal(dataset.items[2].symbol, 'XPTO1', 'XPTO1 (score 80) deve ser o terceiro colocado');
  assert.equal(dataset.items[2].globalRank, 3);
});

test('Ranking RS: paginação preserva a posição global nas páginas seguintes', () => {
  window.relativeStrengthSearchQuery = '';
  window.relativeStrengthSelectedGroup = '';
  window.relativeStrengthPageSize = 10;
  window.relativeStrengthCurrentPage = 2;

  const dataset = {
    market: 'b3',
    universeKey: 'stock_other',
    items: staticCache.daily.stock_other.items.map(it => ({
      ...it,
      globalRank: it.rank
    }))
  };

  const { paged } = rsModel.getFilteredAndPagedItems(dataset.items);
  assert.equal(paged.length, 10);
  assert.equal(paged[0].globalRank, 11, 'O primeiro item da página 2 (tam 10) deve ter globalRank 11');
  assert.equal(paged[9].globalRank, 20, 'O último item da página 2 (tam 10) deve ter globalRank 20');

  const html = rsModel.renderTableRows(paged, 'daily', false);
  assert.ok(html.includes('<td class="td-rank">11</td>'), 'Deve renderizar rank 11');
  assert.ok(html.includes('<td class="td-rank">20</td>'), 'Deve renderizar rank 20');
});

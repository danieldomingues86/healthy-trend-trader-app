'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Mock browser environment
global.window = global;
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => []
};
window.currentRelativeStrengthMarket = 'b3';
window.currentRelativeStrengthTimeframe = 'daily';
window.relativeStrengthSearchQuery = '';
window.relativeStrengthSelectedGroup = '';
window.relativeStrengthPageSize = 20;
window.relativeStrengthCurrentPage = 1;
window.renderRelativeStrengthClassesPage = () => {};

const rsModel = require('./relative-strength-v3.js');

test('Força Relativa: loadRelativeStrengthClassesForTimeframe atualiza atomicamente dailyClasses e classes com os dados mais recentes', async () => {
  // Simula estado inicial com cache estático antigo (MGLU3 líder fictício de 07/10)
  window.relativeStrengthClassesState = {
    selected: 'stock_ibov',
    dailyClasses: {
      stock_ibov: {
        key: 'stock_ibov',
        items: [
          { symbol: 'MGLU3', score: 100, rank: 1, name: 'MAGAZINE LUIZA S.A.' },
          { symbol: 'PETR3', score: 76, rank: 19, name: 'PETROBRAS' }
        ]
      }
    },
    classes: {
      stock_ibov: {
        key: 'stock_ibov',
        items: [
          { symbol: 'MGLU3', score: 100, rank: 1, name: 'MAGAZINE LUIZA S.A.' },
          { symbol: 'PETR3', score: 76, rank: 19, name: 'PETROBRAS' }
        ]
      }
    },
    dataAsOf: '2026-10-07',
    dailyFresh: false,
    loading: false
  };

  // Mock API response simulando o último fechamento real da B3 (PETR3 líder, MGLU3 na posição 21/24)
  const mockFreshPayload = {
    updatedAt: '2026-10-31T00:13:32.216Z',
    dataAsOf: '20261030',
    source: 'B3 (COTAHIST)',
    timeframe: 'daily',
    classes: {
      stock_ibov: {
        key: 'stock_ibov',
        items: [
          { symbol: 'PETR3', score: 100, rank: 1, name: 'PETROLEO BRASILEIRO S.A. PETROBRAS', sector: 'Energy Minerals', m1: 11.4, m3: 22.4 },
          { symbol: 'PRIO3', score: 99, rank: 2, name: 'PRIO S.A.', sector: 'Energy Minerals', m1: 17.4, m3: 17.5 },
          { symbol: 'PETR4', score: 97, rank: 3, name: 'PETROLEO BRASILEIRO S.A. PETROBRAS', sector: 'Energy Minerals', m1: 7.3, m3: 21.4 },
          { symbol: 'MGLU3', score: 73, rank: 21, name: 'MAGAZINE LUIZA S.A.', sector: 'Retail Trade', m1: -28.3, m3: 6.4 }
        ]
      }
    }
  };

  global.fetch = async (url) => {
    return {
      ok: true,
      json: async () => mockFreshPayload
    };
  };

  await window.loadRelativeStrengthClassesForTimeframe('daily', true);

  // Verificação de atomicidade do estado
  const state = window.relativeStrengthClassesState;
  assert.equal(state.dailyFresh, true, 'dailyFresh deve ser marcado como true após carga da API');
  assert.equal(state.dataAsOf, '20261030', 'dataAsOf deve refletir a data da API');
  assert.equal(state.dailyDataAsOf, '20261030', 'dailyDataAsOf deve ser sincronizado com a data da API');
  assert.equal(state.dailyClasses.stock_ibov.items[0].symbol, 'PETR3', 'PETR3 deve ser o líder oficial no dailyClasses');
  assert.equal(state.classes.stock_ibov.items[0].symbol, 'PETR3', 'PETR3 deve ser o líder oficial no classes');
  assert.equal(state.dailyClasses.stock_ibov.items[0].score, 100);

  // Verificação do getActiveDataset: deve consumir os dados frescos da API
  const dataset = rsModel.getActiveDataset();
  assert.equal(dataset.items[0].symbol, 'PETR3', 'getActiveDataset deve retornar PETR3 como #1');
  assert.equal(dataset.items[0].globalRank, 1);
  assert.equal(dataset.items[3].symbol, 'MGLU3', 'getActiveDataset deve conter MGLU3 na posição correta');
  assert.equal(dataset.items[3].globalRank, 21);
  assert.equal(dataset.items[3].score, 73);
  assert.equal(dataset.dateLabel, '30/10/2026', 'dateLabel deve exibir 30/10/2026 e não a data antiga');
});

test('Força Relativa: busca por ticker atua estritamente em memória sobre os dados atualizados sem alterar o ranking base', () => {
  // Configura busca por MGLU
  window.relativeStrengthSearchQuery = 'MGLU';
  const dataset = rsModel.getActiveDataset();
  const { filtered, paged, totalCount } = rsModel.getFilteredAndPagedItems(dataset.items);

  assert.equal(totalCount, 1, 'Deve encontrar exatamente 1 ativo para MGLU');
  assert.equal(paged[0].symbol, 'MGLU3');
  assert.equal(paged[0].globalRank, 21, 'MGLU3 deve manter sua posição global de ranking (#21)');
  assert.equal(paged[0].score, 73, 'MGLU3 deve manter seu RS real (73)');

  // Base principal do dataset permanece intocada
  assert.equal(dataset.items.length, 4, 'O dataset completo subjacente não pode ser modificado pelo filtro de busca');
  assert.equal(dataset.items[0].symbol, 'PETR3', 'PETR3 continua sendo o #1 da base');
});

test('Força Relativa: remoção da busca restaura 100% do ranking original sem divergências', () => {
  // Limpa busca
  window.relativeStrengthSearchQuery = '';
  const dataset = rsModel.getActiveDataset();
  const { filtered, paged, totalCount } = rsModel.getFilteredAndPagedItems(dataset.items);

  assert.equal(totalCount, 4, 'Todos os 4 ativos devem voltar a ser exibidos');
  assert.equal(paged[0].symbol, 'PETR3', 'PETR3 deve ser o primeiro colocado');
  assert.equal(paged[0].globalRank, 1);
  assert.equal(paged[1].symbol, 'PRIO3', 'PRIO3 deve ser o segundo colocado');
  assert.equal(paged[1].globalRank, 2);
  assert.equal(paged[2].symbol, 'PETR4', 'PETR4 deve ser o terceiro colocado');
  assert.equal(paged[2].globalRank, 3);
  assert.equal(paged[3].symbol, 'MGLU3', 'MGLU3 deve estar na posição correta');
  assert.equal(paged[3].globalRank, 21);
});

test('Força Relativa: em caso de falha da API, modo offline é ativado com identificação transparente da data do fallback', async () => {
  // Simula erro de conexão (offline/indisponível)
  global.fetch = async () => {
    throw new Error('Falha de conexão com a API de mercado');
  };

  // Limpa estado fresco
  window.relativeStrengthClassesState = {
    selected: 'stock_ibov',
    dailyClasses: null,
    classes: null,
    dailyFresh: false,
    loading: false
  };

  window.__relativeStrengthStaticCache = {
    dataAsOf: '2026-10-07',
    source: 'B3 (COTAHIST)',
    daily: {
      stock_ibov: {
        key: 'stock_ibov',
        items: [
          { symbol: 'MGLU3', score: 100, rank: 1, name: 'MAGAZINE LUIZA S.A.' }
        ]
      }
    }
  };

  await window.loadRelativeStrengthClassesForTimeframe('daily', true);

  const state = window.relativeStrengthClassesState;
  assert.equal(state.error, true, 'state.error deve ser true');
  assert.equal(state.offlineFallback, true, 'state.offlineFallback deve ser true');
  assert.equal(state.dailyFresh, false, 'dailyFresh deve ser false');

  const dataset = rsModel.getActiveDataset();
  assert.ok(dataset.sourceLabel.includes('Offline'), 'sourceLabel deve indicar claramente modo Offline');
  assert.equal(dataset.dateLabel, '07/10/2026', 'dateLabel deve exibir a data real do cache offline (07/10/2026) e jamais a data de hoje');
});

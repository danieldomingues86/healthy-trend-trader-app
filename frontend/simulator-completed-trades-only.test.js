'use strict';

const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const TradeSimulatorModel = require('./trade-simulator-model');

test('Critério 1 — Trade encerrado por Stop Loss entra na amostra final como perdedor', () => {
  const sim = {
    symbol: 'VALE3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-06-01',
    entryPrice: 60.00,
    stopLoss: 58.00, // Risco = R$ 2,00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  const candles = [
    { date: '2026-06-01', open: 59.00, high: 59.80, low: 58.20, close: 59.50 }, // T (Sinal)
    { date: '2026-06-02', open: 59.50, high: 60.50, low: 59.00, close: 60.20 }, // T+1 (Entrada executada a 60.00)
    { date: '2026-06-03', open: 60.00, high: 60.20, low: 57.80, close: 57.90 }  // T+2 (Mínima 57.80 toca Stop 58.00)
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(sim, candles);

  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_LOSS);
  assert.equal(evaluated.executedEntryPrice, 60.00);
  assert.equal(evaluated.entryDate, '2026-06-02');
  assert.equal(evaluated.exitDate, '2026-06-03');
  assert.equal(evaluated.exitPrice, 58.00);
  assert.equal(evaluated.resultR, -1.0);
  assert.equal(evaluated.isIncomplete, false);
  assert.ok(evaluated.exitReason.includes('Stop Loss'));
});

test('Critério 2 — Trade encerrado por outra regra válida (Alvo 2R) entra na amostra final como vencedor', () => {
  const sim = {
    symbol: 'PETR4',
    triggerName: '1-2-3 de Compra',
    grade: 'A',
    signalDate: '2026-06-01',
    entryPrice: 30.00,
    stopLoss: 28.00, // Risco = R$ 2,00 -> Alvo 2R = R$ 34,00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  // Obs: 2026-06-04 é feriado nacional de Corpus Christi na B3, o próximo pregão útil é 2026-06-05
  const candles = [
    { date: '2026-06-01', open: 29.00, high: 29.90, low: 28.50, close: 29.50 }, // T (Sinal)
    { date: '2026-06-02', open: 29.50, high: 30.80, low: 29.20, close: 30.50 }, // T+1 (Entrada executada a 30.00)
    { date: '2026-06-03', open: 30.50, high: 32.50, low: 30.20, close: 32.20 }, // T+2
    { date: '2026-06-05', open: 32.20, high: 34.50, low: 32.00, close: 34.20 }  // T+3 (Máxima 34.50 atinge Alvo 34.00)
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(sim, candles);

  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(evaluated.executedEntryPrice, 30.00);
  assert.equal(evaluated.entryDate, '2026-06-02');
  assert.equal(evaluated.exitDate, '2026-06-05');
  assert.equal(evaluated.exitPrice, 34.00);
  assert.equal(evaluated.resultR, 2.0);
  assert.equal(evaluated.isIncomplete, false);
  assert.ok(evaluated.exitReason.includes('Sell Into Strength'));
});

test('Critério 3 — Sinal não acionado (NOT_TRIGGERED) é cancelado e não entra como trade executado', () => {
  const sim = {
    symbol: 'BBAS3',
    triggerName: 'Inside Bar',
    grade: 'A',
    signalDate: '2026-06-01',
    entryPrice: 30.00,
    stopLoss: 28.50,
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  const candles = [
    { date: '2026-06-01', open: 29.00, high: 29.90, low: 28.60, close: 29.50 }, // T (Sinal)
    { date: '2026-06-02', open: 29.40, high: 29.80, low: 28.80, close: 29.20 }  // T+1: máxima 29.80 não rompe 30.00
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(sim, candles);

  assert.equal(evaluated.status, TradeSimulatorModel.STATUS.NOT_TRIGGERED);
  assert.equal(evaluated.executedEntryPrice, null, 'Preço executado deve ser null');
  assert.equal(evaluated.entryDate, null, 'Data de entrada deve ser null');
  assert.equal(evaluated.resultR, null, 'Resultado R deve ser null');
  assert.equal(evaluated.exitDate, '2026-06-02');
  assert.ok(evaluated.exitReason.includes('candle seguinte (T+1)'));
});

test('Critério 4 — Trade ainda aberto ao fim dos dados históricos é marcado como incompleto sem fabricar desfecho', () => {
  const sim = {
    symbol: 'ITUB4',
    triggerName: 'PFR de Compra',
    grade: 'A',
    signalDate: '2026-06-01',
    entryPrice: 35.00,
    stopLoss: 33.00, // Risco = R$ 2,00 -> Alvo 2R = 39,00
    status: TradeSimulatorModel.STATUS.WAITING_ENTRY,
    managementScenario: '2R'
  };

  // Os dados históricos acabam em 2026-06-05 sem que a cotação atinja o stop (33.00) nem o alvo (39.00)
  const candles = [
    { date: '2026-06-01', open: 34.00, high: 34.90, low: 33.50, close: 34.50 }, // T (Sinal)
    { date: '2026-06-02', open: 34.80, high: 35.50, low: 34.50, close: 35.20 }, // T+1 (Entrada executada a 35.00)
    { date: '2026-06-03', open: 35.20, high: 36.00, low: 34.80, close: 35.80 }, // T+2
    { date: '2026-06-05', open: 35.80, high: 36.20, low: 35.00, close: 36.00 }  // T+3 (Último candle disponível: fechamento 36.00)
  ];

  const evaluated = TradeSimulatorModel.evaluateSimulationOnCandles(sim, candles);

  // Regra Inviolável: Não inventa saída artificial no último preço (36.00) nem classifica como gain/loss
  assert.equal(evaluated.isIncomplete, true, 'Deve ser marcado internamente como incompleto');
  assert.equal(evaluated.isCensored, true, 'Deve ser marcado internamente como censurado');
  assert.equal(evaluated.resultR, null, 'Resultado R definitivo DEVE ser null para não poluir amostra');
  assert.equal(evaluated.exitPrice, null, 'Preço de saída DEVE ser null');
  assert.equal(evaluated.exitDate, null, 'Data de saída DEVE ser null');
  assert.ok(evaluated.incompleteReason.includes('Janela histórica terminou antes'));
  // Flutuação intradiária pode ser consultada isoladamente em unrealizedR sem poluir o resultado final
  assert.equal(evaluated.unrealizedR, 0.5); // (36.00 - 35.00) / 2.0 = +0.50R flutuante
});

test('Critério 5 — Reconciliação estatística: somente trades efetivamente finalizados participam da amostra principal', () => {
  const simulations = [
    // 2 trades finalizados
    {
      id: 'trade-gain',
      symbol: 'PETR4',
      triggerName: 'Inside Bar',
      grade: 'A',
      marketCycle: 'Positivo',
      status: TradeSimulatorModel.STATUS.CLOSED_GAIN,
      signalDate: '2026-05-04',
      entryDate: '2026-05-05',
      exitDate: '2026-05-08',
      entryPrice: 30.00,
      stopLoss: 28.00,
      executedEntryPrice: 30.00,
      currentStop: 28.00,
      exitPrice: 34.00,
      resultR: 2.0,
      mfeR: 2.2,
      maeR: -0.3,
      durationDays: 3
    },
    {
      id: 'trade-loss',
      symbol: 'VALE3',
      triggerName: 'Inside Bar',
      grade: 'A',
      marketCycle: 'Positivo',
      status: TradeSimulatorModel.STATUS.CLOSED_LOSS,
      signalDate: '2026-05-04',
      entryDate: '2026-05-05',
      exitDate: '2026-05-07',
      entryPrice: 60.00,
      stopLoss: 58.00,
      executedEntryPrice: 60.00,
      currentStop: 58.00,
      exitPrice: 58.00,
      resultR: -1.0,
      mfeR: 0.4,
      maeR: -1.0,
      durationDays: 2
    },
    // 2 sinais não acionados
    {
      id: 'signal-not-trig-1',
      symbol: 'ITUB4',
      triggerName: '1-2-3 de Compra',
      grade: 'A',
      marketCycle: 'Positivo',
      status: TradeSimulatorModel.STATUS.NOT_TRIGGERED,
      signalDate: '2026-05-04',
      entryPrice: 32.00,
      stopLoss: 30.00,
      exitDate: '2026-05-05',
      resultR: null
    },
    {
      id: 'signal-not-trig-2',
      symbol: 'BBDC4',
      triggerName: '1-2-3 de Compra',
      grade: 'A',
      marketCycle: 'Positivo',
      status: TradeSimulatorModel.STATUS.NOT_TRIGGERED,
      signalDate: '2026-05-04',
      entryPrice: 15.00,
      stopLoss: 14.00,
      exitDate: '2026-05-05',
      resultR: null
    },
    // 2 operações incompletas / censuradas pelo fim do histórico
    {
      id: 'trade-incomplete-1',
      symbol: 'WEGE3',
      triggerName: 'PFR de Compra',
      grade: 'A',
      marketCycle: 'Positivo',
      status: TradeSimulatorModel.STATUS.IN_OPERATION,
      isIncomplete: true,
      signalDate: '2026-05-04',
      entryDate: '2026-05-05',
      entryPrice: 50.00,
      stopLoss: 48.00,
      executedEntryPrice: 50.00,
      currentStop: 48.00,
      resultR: null
    },
    {
      id: 'trade-incomplete-2',
      symbol: 'BPAC11',
      triggerName: 'PFR de Compra',
      grade: 'A',
      marketCycle: 'Positivo',
      status: TradeSimulatorModel.STATUS.INCOMPLETE,
      isIncomplete: true,
      signalDate: '2026-05-04',
      entryDate: '2026-05-05',
      entryPrice: 38.00,
      stopLoss: 36.00,
      executedEntryPrice: 38.00,
      currentStop: 36.00,
      resultR: null
    }
  ];

  const stats = TradeSimulatorModel.calculateSimulatorStats(simulations);

  // 1. Contagens
  assert.equal(stats.totalCreated, 6, 'Total criado deve ser 6');
  assert.equal(stats.closedTradesCount, 2, 'Apenas 2 trades finalizados entram na amostra');
  assert.equal(stats.incompleteCount, 2, '2 operações incompletas identificadas');
  assert.equal(stats.excludedCount, 2, '2 operações excluídas da amostra de resultados');
  assert.equal(stats.notTriggeredCount, 2, '2 sinais não acionados');
  assert.equal(stats.executedEntriesCount, 4, '4 entradas executadas no total (2 finalizadas + 2 incompletas)');

  // 2. Métricas de Desempenho (calculadas EXCLUSIVAMENTE sobre trades finalizados)
  assert.equal(stats.winningTradesCount, 1, '1 vencedor');
  assert.equal(stats.losingTradesCount, 1, '1 perdedor');
  assert.equal(stats.winRate, 50.0, 'Win Rate = 1/2 = 50% (incompletos e não acionados não contaminam o denominador)');
  assert.equal(stats.lossRate, 50.0, 'Loss Rate = 1/2 = 50%');
  assert.equal(stats.totalR, 1.0, 'Total R = 2.0 - 1.0 = +1.0R');
  assert.equal(stats.avgR, 0.5, 'R médio = +1.0R / 2 = +0.50R');
  assert.equal(stats.expectancyR, 0.5, 'Expectancy = +0.50R');
  assert.equal(stats.profitFactor, 2.0, 'Profit Factor = 2.0 / 1.0 = 2.0');

  // 3. Auditoria transparente
  const recon = TradeSimulatorModel.auditSimulationsBatch(simulations);
  assert.equal(recon.isConsistent, true, 'Auditoria deve confirmar reconciliação matemática exata');
});

test('Critério 6 — Filtros da interface histórica organizam claramente as categorias e removem abas operacionais ativas', () => {
  const simulations = [
    { id: '1', status: TradeSimulatorModel.STATUS.CLOSED_GAIN, resultR: 2.0 },
    { id: '2', status: TradeSimulatorModel.STATUS.CLOSED_LOSS, resultR: -1.0 },
    { id: '3', status: TradeSimulatorModel.STATUS.NOT_TRIGGERED, resultR: null },
    { id: '4', status: TradeSimulatorModel.STATUS.INCOMPLETE, isIncomplete: true, resultR: null }
  ];

  // Aba Trades Encerrados: retorna estritamente operações finalizadas
  const closedOnly = TradeSimulatorModel.filterSimulations(simulations, { tab: 'CLOSED' });
  assert.equal(closedOnly.length, 2);
  assert.ok(closedOnly.every(s => s.status === TradeSimulatorModel.STATUS.CLOSED_GAIN || s.status === TradeSimulatorModel.STATUS.CLOSED_LOSS));

  // Aba Não Acionados: retorna estritamente sinais não acionados
  const notTrigOnly = TradeSimulatorModel.filterSimulations(simulations, { tab: 'NOT_TRIGGERED' });
  assert.equal(notTrigOnly.length, 1);
  assert.equal(notTrigOnly[0].id, '3');

  // Aba Incompletos / Excluídos: retorna operações excluídas da amostra
  const incompleteOnly = TradeSimulatorModel.filterSimulations(simulations, { tab: 'INCOMPLETE' });
  assert.equal(incompleteOnly.length, 1);
  assert.equal(incompleteOnly[0].id, '4');

  // Aba Todos: retorna todos os registros históricos do cenário
  const allRecords = TradeSimulatorModel.filterSimulations(simulations, { tab: 'ALL' });
  assert.equal(allRecords.length, 4);
});

test('Critério 7 — Interface do Simulador não expõe aba nem KPI de Incompletos / Excluídos conforme solicitação do usuário', () => {
  const simJs = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');
  const simCss = fs.readFileSync(path.join(__dirname, 'trade-simulator.css'), 'utf8');

  // 1. Aba INCOMPLETE deve estar completamente removida da barra de abas da tabela
  assert.ok(!simJs.includes('data-tab="INCOMPLETE"'), 'Aba INCOMPLETE não deve existir na UI');
  assert.ok(!simJs.includes('Incompletos / Excluídos ('), 'Texto de aba Incompletos não deve existir na UI');

  // 2. KPI Card Operações incompletas deve estar removido
  assert.ok(!simJs.includes('<span class="sim-kpi-title">Operações incompletas</span>'), 'KPI Card Operações incompletas deve ser removido');

  // 3. Grid de KPIs deve ter 7 colunas proporcionais
  assert.ok(simCss.includes('grid-template-columns: repeat(7, minmax(0, 1fr));'), 'Grid deve ter 7 colunas simétricas');

  // 4. Operações incompletas devem ser expurgadas da listagem da tabela
  assert.ok(simJs.includes("source.filter(s => s && s.status !== 'INCOMPLETE' && !s.isIncomplete)"), 'getFilteredSimulations deve expurgar incompletos');
});

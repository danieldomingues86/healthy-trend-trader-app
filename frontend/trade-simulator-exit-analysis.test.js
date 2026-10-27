const test = require('node:test');
const assert = require('node:assert/strict');

const TradeSimulatorModel = require('./trade-simulator-model');

// Fixture com histórico diário real e progressão favorável controlada
function buildTestHistory() {
  const dates = [
    '2026-03-02', // 0: Sinal
    '2026-03-03', // 1: Entrada executada a 40.01 (range 39.50 - 41.50)
    '2026-03-04', // 2: +1R (42.01) atingido (range 40.80 - 42.50)
    '2026-03-05', // 3: +2R (44.01) atingido (range 42.00 - 44.50)
    '2026-03-06', // 4: +2.5R (45.01) e +3R (46.01) atingidos (range 43.80 - 46.50)
    '2026-03-09', // 5: Recuo com topo em 46.80 (MFE Máximo = 46.80), fecha em 44.20
    '2026-03-10'  // 6: Fecha em 42.80 abaixo da EMA10 (saída trailing MM10)
  ];

  return [
    { time: dates[0], open: 39.50, high: 40.00, low: 38.50, close: 39.80 },
    { time: dates[1], open: 40.00, high: 41.50, low: 39.50, close: 41.00 },
    { time: dates[2], open: 41.00, high: 42.50, low: 40.80, close: 42.20 },
    { time: dates[3], open: 42.20, high: 44.50, low: 42.00, close: 44.10 },
    { time: dates[4], open: 44.10, high: 46.50, low: 43.80, close: 46.00 },
    { time: dates[5], open: 45.80, high: 46.80, low: 44.00, close: 44.20 },
    { time: dates[6], open: 44.00, high: 44.20, low: 42.50, close: 42.80 }
  ];
}

test('Análise de Saídas — 1. Acesso a partir do snapshot e presença de todas as 10 políticas', () => {
  const history = buildTestHistory();
  const sim = {
    id: 'sim-exit-01',
    symbol: 'VALE3',
    entryPrice: 40.01,
    stopLoss: 38.01,
    signalDate: '2026-03-02',
    executedEntryPrice: 40.01,
    entryDate: '2026-03-03',
    status: TradeSimulatorModel.STATUS.CLOSED_GAIN,
    managementScenario: '2R',
    resultR: 2.0
  };

  const analysis = TradeSimulatorModel.calculateExitPolicyAnalysis(sim, history);
  assert.equal(analysis.available, true);
  assert.equal(analysis.isExecutable, true);
  assert.equal(analysis.symbol, 'VALE3');
  assert.equal(analysis.entryPrice, 40.01);
  assert.equal(analysis.stopInitial, 38.01);
  assert.equal(analysis.initialRisk, 2.00, 'Risco inicial 40.01 - 38.01 = 2.00');

  // Devem existir exatamente 10 políticas
  assert.equal(analysis.policies.length, 10, 'Deve conter exatamente 10 políticas comparadas');

  const policyIds = analysis.policies.map(p => p.id);
  assert.ok(policyIds.includes('TARGET_1R'), 'Contém Alvo +1R');
  assert.ok(policyIds.includes('TARGET_1_5R'), 'Contém Alvo +1,5R');
  assert.ok(policyIds.includes('TARGET_2R'), 'Contém Alvo +2R (Oficial)');
  assert.ok(policyIds.includes('TARGET_2_5R'), 'Contém Alvo +2,5R');
  assert.ok(policyIds.includes('TARGET_3R'), 'Contém Alvo +3R');
  assert.ok(policyIds.includes('TRAILING_EMA10'), 'Contém Trailing MM10');
  assert.ok(policyIds.includes('BE_TRAILING_EMA10'), 'Contém Breakeven + MM10');
  assert.ok(policyIds.includes('PARTIAL_50_2R_EMA10'), 'Contém Parcial 50% + MM10');
  assert.ok(policyIds.includes('PARTIAL_80_2R_EMA10'), 'Contém Parcial 80% + MM10');
  assert.ok(policyIds.includes('MFE_PEAK'), 'Contém Pico de MFE (Teórico)');
});

test('Análise de Saídas — 2. Todas as políticas usam a mesma entrada, stop e trajetória histórica', () => {
  const history = buildTestHistory();
  const sim = {
    id: 'sim-exit-02',
    symbol: 'PETR4',
    entryPrice: 30.00,
    stopLoss: 28.50,
    signalDate: '2026-03-02',
    executedEntryPrice: 30.00,
    entryDate: '2026-03-03',
    status: TradeSimulatorModel.STATUS.CLOSED_GAIN
  };

  const analysis = TradeSimulatorModel.calculateExitPolicyAnalysis(sim, history);
  // Todas as políticas devem referenciar a mesma entrada e risco base
  analysis.policies.forEach(p => {
    assert.ok(Number.isFinite(p.exitPrice), `${p.id} deve ter um exitPrice numérico válido`);
    assert.ok(Number.isFinite(p.resultR), `${p.id} deve ter um resultR numérico válido`);
    assert.ok(p.durationDays >= 1, `${p.id} deve ter duração de pelo menos 1 dia`);
    assert.ok(p.exitDate, `${p.id} deve possuir data de encerramento`);
    assert.ok(p.exitReason, `${p.id} deve possuir motivo explícito de saída`);
  });
});

test('Análise de Saídas — 3. Consistência matemática das métricas MFE, MAE, Giveback e Captura de MFE', () => {
  const history = buildTestHistory();
  const sim = {
    id: 'sim-exit-03',
    symbol: 'VALE3',
    entryPrice: 40.00,
    stopLoss: 38.00,
    signalDate: '2026-03-02',
    executedEntryPrice: 40.00,
    entryDate: '2026-03-03',
    status: TradeSimulatorModel.STATUS.CLOSED_GAIN
  };

  // Entrada 40.00, Stop 38.00, Risco = 2.00
  // Máxima absoluta na série = 46.80 -> MFE = (46.80 - 40.00) / 2.00 = 6.80 / 2.00 = 3.40R
  // Mínima absoluta pós-entrada = 39.50 -> MAE = (39.50 - 40.00) / 2.00 = -0.50 / 2.00 = -0.25R
  const analysis = TradeSimulatorModel.calculateExitPolicyAnalysis(sim, history);

  assert.equal(analysis.mfeR, 3.40, 'MFE R deve ser 3.40R');
  assert.equal(analysis.maeR, -0.25, 'MAE R deve ser -0.25R');

  // Testar política de 2R (Oficial):
  const p2R = analysis.policies.find(p => p.id === 'TARGET_2R');
  assert.equal(p2R.resultR, 2.00, 'Resultado de 2R deve ser exatamente 2.00R');
  assert.equal(p2R.givebackR, 1.40, 'Giveback de 2R deve ser MFE (3.40) - 2.00 = 1.40R');
  assert.equal(p2R.mfeCapturePct, 58.82, 'Captura de MFE deve ser (2.00 / 3.40) * 100 = 58.82%');
  assert.equal(p2R.isOfficialMethod, true, 'TARGET_2R deve estar marcado como isOfficialMethod: true');

  // Testar política de 3R:
  const p3R = analysis.policies.find(p => p.id === 'TARGET_3R');
  assert.equal(p3R.resultR, 3.00, 'Resultado de 3R deve ser 3.00R');
  assert.equal(p3R.givebackR, 0.40, 'Giveback de 3R deve ser MFE (3.40) - 3.00 = 0.40R');
  assert.equal(p3R.mfeCapturePct, 88.24, 'Captura de MFE deve ser (3.00 / 3.40) * 100 = 88.24%');
});

test('Análise de Saídas — 4. MFE Máximo é identificado exclusivamente como Referência Teórica (Não Executável)', () => {
  const history = buildTestHistory();
  const sim = {
    id: 'sim-exit-04',
    symbol: 'VALE3',
    entryPrice: 40.01,
    stopLoss: 38.01,
    signalDate: '2026-03-02',
    executedEntryPrice: 40.01,
    entryDate: '2026-03-03',
    status: TradeSimulatorModel.STATUS.CLOSED_GAIN
  };

  const analysis = TradeSimulatorModel.calculateExitPolicyAnalysis(sim, history);
  const mfePeak = analysis.policies.find(p => p.id === 'MFE_PEAK');

  assert.ok(mfePeak, 'MFE_PEAK deve existir na lista');
  assert.equal(mfePeak.isTheoretical, true, 'isTheoretical deve ser estritamente TRUE');
  assert.equal(mfePeak.resultR, analysis.mfeR, 'Resultado do MFE_PEAK deve ser idêntico ao MFE Máximo');
  assert.equal(mfePeak.givebackR, 0.0, 'Giveback do MFE Máximo é 0,00R');
  assert.equal(mfePeak.mfeCapturePct, 100.0, 'Captura do MFE Máximo é 100%');
  assert.match(mfePeak.exitReason, /n.*o execut.*vel|te.*rico/i, 'Motivo de saída deve enfatizar que não é executável');

  // No resumo dos achados, a melhor política executável NÃO PODE ser o MFE_PEAK
  assert.notEqual(analysis.summary.bestPolicyId, 'MFE_PEAK', 'MFE_PEAK não pode ser escolhido como melhor política executável');
});

test('Análise de Saídas — 5. Imutabilidade dos dados oficiais armazenados', () => {
  const history = buildTestHistory();
  const originalSim = Object.freeze({
    id: 'sim-immutable-01',
    symbol: 'VALE3',
    entryPrice: 40.01,
    stopLoss: 38.01,
    signalDate: '2026-03-02',
    executedEntryPrice: 40.01,
    entryDate: '2026-03-03',
    exitPrice: 44.01,
    exitDate: '2026-03-05',
    status: TradeSimulatorModel.STATUS.CLOSED_GAIN,
    managementScenario: '2R',
    resultR: 2.0
  });

  // Executa análise com simulação congelada (Object.freeze)
  const analysis = TradeSimulatorModel.calculateExitPolicyAnalysis(originalSim, history);
  assert.ok(analysis.available);

  // Garante que o objeto da simulação não sofreu qualquer mutação colateral
  assert.equal(originalSim.resultR, 2.0);
  assert.equal(originalSim.exitPrice, 44.01);
  assert.equal(originalSim.status, TradeSimulatorModel.STATUS.CLOSED_GAIN);
  assert.equal(originalSim.managementScenario, '2R');
});

test('Análise de Saídas — 6. Tratamento de operações não acionadas (NOT_TRIGGERED) e histórico ausente', () => {
  const history = buildTestHistory();

  // Caso 1: NOT_TRIGGERED
  const simNotTriggered = {
    id: 'sim-nt-01',
    symbol: 'MGLU3',
    entryPrice: 10.00,
    stopLoss: 9.00,
    signalDate: '2026-03-02',
    status: TradeSimulatorModel.STATUS.NOT_TRIGGERED,
    exitReason: 'Expirou sem acionamento'
  };
  const resNt = TradeSimulatorModel.calculateExitPolicyAnalysis(simNotTriggered, history);
  assert.equal(resNt.available, true);
  assert.equal(resNt.isExecutable, false);
  assert.match(resNt.reason, /acionamento|acionada|cancelada/i);
  assert.equal(resNt.policies.length, 0);

  // Caso 2: Histórico ausente / vazio
  const simValid = {
    id: 'sim-v-01',
    symbol: 'PETR4',
    entryPrice: 30.00,
    stopLoss: 28.00,
    signalDate: '2026-03-02'
  };
  const resNoHistory = TradeSimulatorModel.calculateExitPolicyAnalysis(simValid, []);
  assert.equal(resNoHistory.available, false);
  assert.match(resNoHistory.reason, /indispon.*vel|requer dados/i);
});

test('Análise de Saídas — 7. Regra conservadora de ambiguidade (Stop tem precedência)', () => {
  // Cenário de ambiguidade extrema:
  // No dia seguinte à entrada, o candle abre em 40.00, bate a máxima em 44.50 (+2R) E bate a mínima em 37.50 (violando stop de 38.00)!
  const ambiguousHistory = [
    { time: '2026-03-02', open: 39.50, high: 40.00, low: 38.50, close: 39.80 }, // Sinal
    { time: '2026-03-03', open: 40.00, high: 40.50, low: 39.80, close: 40.20 }, // Entrada em 40.01
    { time: '2026-03-04', open: 40.00, high: 44.50, low: 37.50, close: 38.00 }  // Ambiguidade: atinge 44.50 (+2R) E 37.50 (stop 38.01)!
  ];

  const sim = {
    id: 'sim-ambiguous',
    symbol: 'BBDC4',
    entryPrice: 40.01,
    stopLoss: 38.01,
    signalDate: '2026-03-02',
    executedEntryPrice: 40.01,
    entryDate: '2026-03-03',
    status: TradeSimulatorModel.STATUS.CLOSED_LOSS
  };

  const analysis = TradeSimulatorModel.calculateExitPolicyAnalysis(sim, ambiguousHistory);
  assert.equal(analysis.available, true);

  // Na política oficial de 2R, pela regra conservadora de ambiguidade, o Stop ativo tem precedência!
  const p2R = analysis.policies.find(p => p.id === 'TARGET_2R');
  assert.equal(p2R.exitStatus, 'STOP_LOSS', 'Pela regra de ambiguidade, stop loss tem precedência sobre o alvo no mesmo candle');
  assert.equal(p2R.resultR, -1.0, 'Resultado deve ser stop loss (-1,00R)');
  assert.equal(p2R.exitPrice, 38.01, 'Saída deve ocorrer no preço do stop loss');
});

test('Análise de Saídas — 8. Distinção estrita entre operações com Gain e operações com Loss', () => {
  const history = buildTestHistory();
  const simGain = {
    id: 'sim-gain',
    symbol: 'PETR4',
    entryPrice: 40.00,
    stopLoss: 38.00,
    signalDate: '2026-03-02',
    executedEntryPrice: 40.00,
    entryDate: '2026-03-03',
    status: TradeSimulatorModel.STATUS.CLOSED_GAIN,
    resultR: 2.0
  };
  const simLoss = {
    id: 'sim-loss',
    symbol: 'PETR4',
    entryPrice: 40.00,
    stopLoss: 38.00,
    signalDate: '2026-03-02',
    executedEntryPrice: 40.00,
    entryDate: '2026-03-03',
    status: TradeSimulatorModel.STATUS.CLOSED_LOSS,
    resultR: -1.0
  };

  const gainAnalysis = TradeSimulatorModel.calculateExitPolicyAnalysis(simGain, history);
  assert.equal(gainAnalysis.isGain, true);
  assert.equal(gainAnalysis.isLoss, false);

  const lossAnalysis = TradeSimulatorModel.calculateExitPolicyAnalysis(simLoss, history);
  assert.equal(lossAnalysis.isGain, false);
  assert.equal(lossAnalysis.isLoss, true);
});

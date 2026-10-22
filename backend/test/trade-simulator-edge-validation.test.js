const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../../frontend/trade-simulator-model');
const edgeValidation = require('../src/trade-simulator-edge-validation');

test('Validação de Edge: inventário canônico e tipos experimentais', () => {
  assert.equal(edgeValidation.CANONICAL_INVENTORY.length, 6);
  const ids = edgeValidation.CANONICAL_INVENTORY.map(i => i.id);
  assert.deepEqual(ids, [
    'DOUBLE_INSIDE_BAR',
    'INSIDE_BAR',
    '123_COMPRA',
    'PFR_COMPRA',
    'DAVE_LANDRY',
    'RBI'
  ]);

  assert.ok(model.EXPERIMENTAL_TRIGGERS.COMBO_IB_STOP);
  assert.ok(model.EXPERIMENTAL_TRIGGERS.COMBO_VERTEX_STOP);
  assert.ok(model.EXPERIMENTAL_TRIGGERS.STRUCTURAL_123_NO_IB);
});

test('Validação de Edge: detectAllSetupTriggers detecta combo 1-2-3 + Inside Bar com includeExperimental', () => {
  // Candle 3: alta=22, baixa=20, fecha=21
  // Candle 2: alta=21, baixa=18 (vértice, < c3.low), fecha=19
  // Candle 1: alta=20.5 (<= c2.high), baixa=18.5 (>= c2.low), fecha=20 (Inside Bar em relação a c2, e c1.low > c2.low)
  // Médias: EMA 9 = 17, EMA 30 = 16 (Preço acima de ambas)
  const candles = [
    { time: '2026-01-02', open: 19, high: 22, low: 20, close: 21, ema9: 17, ema30: 16 },
    { time: '2026-01-05', open: 21, high: 21, low: 18, close: 19, ema9: 17, ema30: 16 },
    { time: '2026-01-06', open: 19, high: 20.5, low: 18.5, close: 20, ema9: 17, ema30: 16 }
  ];

  const standard = model.detectAllSetupTriggers(candles);
  const exp = model.detectAllSetupTriggers(candles, { includeExperimental: true });

  // Padrão canônico encontra Inside Bar
  assert.ok(standard.some(t => t.id === 'INSIDE_BAR'));
  // Não encontra 123_COMPRA canônico porque c1.close (20) não é > c2.high (21)
  assert.ok(!standard.some(t => t.id === '123_COMPRA'));

  // Com includeExperimental = true, encontra COMBO_IB_STOP e COMBO_VERTEX_STOP
  assert.ok(exp.some(t => t.id === 'EXP_123_IB'));
  assert.ok(exp.some(t => t.id === 'EXP_123_IB_VERTEX'));

  const comboIb = exp.find(t => t.id === 'EXP_123_IB');
  assert.equal(comboIb.entry, 20.51); // c1.high + 0.01
  assert.equal(comboIb.stop, 18.49);  // c1.low - 0.01 (stop da IB)

  const comboVertex = exp.find(t => t.id === 'EXP_123_IB_VERTEX');
  assert.equal(comboVertex.entry, 20.51);
  assert.equal(comboVertex.stop, 17.99); // c2.low - 0.01 (stop do vértice)
});

test('Validação de Edge: buildScenarios cria os 15 cenários de validação (P1-P6, X1-X5, C1-C4)', () => {
  const scenarios = edgeValidation.buildScenarios();
  assert.equal(scenarios.length, 15);
  const keys = scenarios.map(s => s.key);
  assert.deepEqual(keys, [
    'P1', 'P2', 'P3', 'P4', 'P5', 'P6',
    'X1', 'X2', 'X3', 'X4', 'X5',
    'C1', 'C2', 'C3', 'C4'
  ]);
});

test('Validação de Edge: compare e summarize calculam métricas estatísticas e Welch z', () => {
  const fakeSimsA = [
    { status: 'CLOSED_GAIN', resultR: 2 },
    { status: 'CLOSED_GAIN', resultR: 2 },
    { status: 'CLOSED_LOSS', resultR: -1 }
  ];
  const summaryA = edgeValidation.summarize(fakeSimsA, new Map());
  assert.equal(summaryA.lowSample, true); // < 30
  assert.equal(summaryA.counts.closed, 3);
  assert.equal(summaryA.winRate, 66.7);

  const comp = edgeValidation.compare('Teste de comparação', summaryA, summaryA);
  assert.ok(comp.verdict.includes('Amostra insuficiente'));
});

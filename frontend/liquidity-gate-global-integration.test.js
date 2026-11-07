const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LiquidityGateModel = require('./liquidity-gate-model');
const TradingRubrics = require('./trading-rubrics');
const TradeSimulatorModel = require('./trade-simulator-model');
const OpportunityRadarModel = require('./opportunity-radar-model');

test('Liquidity Gate Global: TradingRubrics força Grade D e risco zero quando liquidez é reprovada', () => {
  const illiquidEval = {
    isEligible: false,
    status: 'VOLUME_INSUFICIENTE',
    reason: 'Volume financeiro médio diário de R$ 10.506 nos últimos 21 pregões está abaixo do mínimo exigido de R$ 500.000.'
  };

  const rubric = TradingRubrics.calculateRubric({
    ratings: {
      trendQuality: 'good',
      marketCycle: 'healthy',
      relativeStrength: 'good',
      volatility: 'good',
      setupQuality: 'good',
      fundamentalScore: 'good'
    },
    liquidity: illiquidEval
  });

  // Hard Gate inegociável
  assert.equal(rubric.grade, 'D');
  assert.equal(rubric.riskBudgetPct, 0);
  assert.equal(rubric.isBuyPermitted, false);
  assert.equal(rubric.qualityAllowed, false);
  assert.equal(rubric.isLiquidityApproved, false);

  const liqGate = rubric.gates.find(g => g.key === 'liquidity');
  assert.ok(liqGate, 'Deve conter gate explícito de liquidez');
  assert.equal(liqGate.status, 'blocked');
  assert.match(liqGate.message, /NÃO ELEGÍVEL \/ BLOQUEADO POR LIQUIDEZ/);
});

test('Liquidity Gate Global: Trade Simulator rejeita geração e auditoria de BGAR39 na data 2026-11-03', () => {
  const cachePath = path.join(__dirname, '..', 'backend', 'data', 'b3-spot-candles-cache.json');
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const bgarCandles = cache['BGAR39'];
  assert.ok(bgarCandles && bgarCandles.length > 0, 'BGAR39 deve existir no cache B3');

  // 1. evaluateSetupTriggerWithAudit com BGAR39
  const auditResult = TradeSimulatorModel.evaluateSetupTriggerWithAudit(bgarCandles, {
    symbol: 'BGAR39',
    date: '2026-11-03',
    simulationMode: 'OFFICIAL'
  });

  assert.equal(auditResult.isValid, false, 'BGAR39 não pode ser validado no Modo Oficial');
  assert.equal(auditResult.hasTrigger, false);
  assert.equal(auditResult.rejectionCode, 'LIQUIDITY_GATE_BLOCKED');
  assert.match(auditResult.rejectionReason, /LIQUIDEZ INSUFICIENTE/);

  // 2. generateHistoricalSimulations com universo contendo apenas BGAR39
  const candlesMap = new Map([['BGAR39', bgarCandles]]);
  const genResult = TradeSimulatorModel.generateHistoricalSimulations({
    candlesMap,
    symbols: ['BGAR39'],
    simulationMode: 'OFFICIAL'
  });

  // Nenhuma simulação executada ou permitida para BGAR39
  assert.equal(genResult.simulations.length, 0, 'Simulador de Trades NÃO pode gerar operações em BGAR39');
});

test('Liquidity Gate Global: Radar de Oportunidades exclui ativos sem liquidez', () => {
  const illiquidCandles = Array.from({ length: 35 }, (_, i) => ({
    time: `2026-09-${String(i + 1).padStart(2, '0')}`,
    open: 20,
    high: 21,
    low: 19.5,
    close: 20.8,
    volume: 5000 // R$ 5.000 diários (muito abaixo dos R$ 500.000)
  }));

  const item = {
    symbol: 'ILLIQ3',
    name: 'Empresa Ilíquida',
    sector: 'Financeiro',
    score: 85
  };

  const ready = OpportunityRadarModel.evaluateAssetReadiness(item, illiquidCandles, 'healthy');
  assert.equal(ready, null, 'Ativo sem liquidez não pode ser qualificado como Pronto para entrada no Radar');
});

test('Liquidity Gate Global: Visão do Ativo no Simulator inclui status e badges da liquidez', () => {
  const liquidCandles = Array.from({ length: 30 }, (_, i) => ({
    time: `2026-09-${String(i + 1).padStart(2, '0')}`,
    open: 40,
    high: 41,
    low: 39,
    close: 40.5,
    volume: 25000000 // R$ 25 mi diários
  }));

  const sim = {
    symbol: 'WEGE3',
    grade: 'A',
    signalDate: '2026-09-25',
    triggerName: 'Inside Bar',
    entryPrice: 40.5,
    stopLoss: 39.5,
    candles: liquidCandles
  };

  const vision = TradeSimulatorModel.getTradeVisionAtivo(sim);
  assert.ok(vision.liquidity, 'Visão do Ativo deve incluir campo liquidity');
  assert.equal(vision.liquidity.isEligible, true);
  assert.equal(vision.liquidity.status, 'good');
  assert.match(vision.liquidity.text, /Aprovada/);
});

test('Liquidity Gate Global: Radar de Oportunidades inclui campo liquidity e filtra ativos ilíquidos no filterOpportunities', () => {
  const liquidCandles = Array.from({ length: 30 }, (_, i) => ({
    time: `2026-09-${String(i + 1).padStart(2, '0')}`,
    open: 40 + i * 0.1,
    high: 41 + i * 0.1,
    low: 39 + i * 0.1,
    close: 40.5 + i * 0.1,
    volume: 15000000 // R$ 15 mi diários
  }));

  // Cria setup válido (Inside Bar no final)
  liquidCandles[28] = { time: '2026-09-29', open: 43.0, high: 45.0, low: 42.0, close: 44.5, volume: 15000000 };
  liquidCandles[29] = { time: '2026-09-30', open: 43.5, high: 44.2, low: 42.5, close: 43.8, volume: 15000000 };

  const item = {
    symbol: 'WEGE3',
    name: 'Weg',
    sector: 'Bens Industriais',
    score: 90
  };

  const ready = OpportunityRadarModel.evaluateAssetReadiness(item, liquidCandles, 'healthy');
  if (ready) {
    assert.ok(ready.liquidity, 'Ativo pronto deve possuir metadados de liquidez');
    assert.equal(ready.liquidity.isEligible, true);
    assert.ok(ready.liquidity.metrics.averageDailyVolume > 500000);
  }

  // filterOpportunities exclui qualquer ativo com liquidez reprovada
  const list = [
    { symbol: 'PETR4', status: 'Pronto para entrada', market: 'IBOV', liquidity: { isEligible: true } },
    { symbol: 'ILLIQ3', status: 'Pronto para entrada', market: 'IBOV', liquidity: { isEligible: false } },
    { symbol: 'FAIL3', status: 'Pronto para entrada', market: 'IBOV', liquidityEligible: false }
  ];
  const filtered = OpportunityRadarModel.filterOpportunities(list);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].symbol, 'PETR4');
});

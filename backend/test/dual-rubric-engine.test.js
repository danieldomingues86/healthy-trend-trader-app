'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TradingRubrics = require('../../frontend/trading-rubrics');

test('PASSO 5 — Dual Rubric Engine: Separação Arquitetural e Versionamento', async (t) => {
  await t.test('Estruturas canônicas independentes para Trend Following e Volatility Trading', () => {
    // Trend Following oficial preservado com 6 critérios
    assert.equal(TradingRubrics.DEFAULT_POLICY.criteria.length, 6);
    const trendKeys = TradingRubrics.DEFAULT_POLICY.criteria.map(c => c.key);
    assert.deepEqual(trendKeys, ['trendQuality', 'marketCycle', 'relativeStrength', 'volatility', 'setupQuality', 'fundamentalScore']);

    // Volatility Trading independente com 7 critérios
    assert.ok(TradingRubrics.DEFAULT_VOLATILITY_POLICY);
    assert.equal(TradingRubrics.DEFAULT_VOLATILITY_POLICY.strategyType, 'VOLATILITY_TRADING');
    assert.equal(TradingRubrics.DEFAULT_VOLATILITY_POLICY.criteria.length, 7);
    const volKeys = TradingRubrics.DEFAULT_VOLATILITY_POLICY.criteria.map(c => c.key);
    assert.deepEqual(volKeys, [
      'primaryTrend',
      'meanReversionTrigger',
      'distanceShortMa',
      'volatilityContext',
      'liquidity',
      'historicalEdge',
      'executionExposure'
    ]);
  });

  await t.test('Pesos de Volatility Trading somam exatamente 100 pontos', () => {
    const totalWeight = TradingRubrics.DEFAULT_VOLATILITY_POLICY.criteria.reduce((sum, c) => sum + c.weight, 0);
    assert.equal(totalWeight, 100);
  });

  await t.test('Versionamento imutável e resolução correta de critérios por estratégia', () => {
    assert.equal(TradingRubrics.getRubricVersion('TREND_FOLLOWING'), 'trend-v2');
    assert.equal(TradingRubrics.getRubricVersion('VOLATILITY_TRADING'), 'volatility-v1');

    const trendCrit = TradingRubrics.getRubricCriteriaForStrategy('TREND_FOLLOWING');
    assert.equal(trendCrit.length, 6);
    assert.ok(trendCrit.some(c => c.key === 'relativeStrength'));

    const volCrit = TradingRubrics.getRubricCriteriaForStrategy('VOLATILITY_TRADING');
    assert.equal(volCrit.length, 7);
    assert.ok(!volCrit.some(c => c.key === 'relativeStrength'));
  });
});

test('PASSO 5 — Dual Rubric Engine: Zero Contaminação de Trend Following em Volatilidade', async (t) => {
  await t.test('Força Relativa e Ranking de Líderes não existem na Volatility Rubric', () => {
    const volCriteria = TradingRubrics.DEFAULT_VOLATILITY_POLICY.criteria;
    assert.equal(volCriteria.some(c => c.key === 'relativeStrength'), false);
    assert.equal(volCriteria.some(c => c.key === 'leadersRank'), false);
    assert.equal(volCriteria.some(c => c.key === 'emergingLeader'), false);
  });

  await t.test('Critérios ou ratings de Trend Following passados não reduzem nem bloqueiam Volatility Rubric', () => {
    const result = TradingRubrics.calculateRubric({
      strategyType: 'VOLATILITY_TRADING',
      ratings: {
        primaryTrend: 'good',
        meanReversionTrigger: 'good',
        distanceShortMa: 'good',
        volatilityContext: 'good',
        liquidity: 'good',
        historicalEdge: 'good',
        executionExposure: 'good'
      },
      // Passando campos de Trend Following que poderiam tentar poluir:
      relativeStrength: 'bad',
      relativeStrengthRating: 'bad',
      marketCycle: 'defensive',
      marketCycleRegime: 'defensive'
    });

    assert.equal(result.strategyType, 'VOLATILITY_TRADING');
    assert.equal(result.rubricVersion, 'volatility-v1');
    assert.equal(result.score, 100);
    assert.equal(result.grade, 'A');
    assert.equal(result.isBuyPermitted, true);
    assert.equal(result.gates.some(g => g.key === 'market' || g.key === 'relativeStrength'), false);
  });
});

test('PASSO 5 — Dual Rubric Engine: Avaliação Manual e Inferência Automática em Volatilidade', async (t) => {
  await t.test('Cálculo determinístico com ratings manuais completos', () => {
    const fullGood = TradingRubrics.calculateVolatilityRubric({
      ratings: {
        primaryTrend: 'good',          // 20
        meanReversionTrigger: 'good',  // 25
        distanceShortMa: 'good',       // 15
        volatilityContext: 'good',     // 15
        liquidity: 'good',             // 10
        historicalEdge: 'good',        // 10
        executionExposure: 'good'      // 5
      }
    });
    assert.equal(fullGood.score, 100);
    assert.equal(fullGood.grade, 'A');
    assert.equal(fullGood.riskBudgetPct, 0.004);
    assert.equal(fullGood.qualityAllowed, true);

    const allMedium = TradingRubrics.calculateVolatilityRubric({
      ratings: {
        primaryTrend: 'medium',
        meanReversionTrigger: 'medium',
        distanceShortMa: 'medium',
        volatilityContext: 'medium',
        liquidity: 'medium',
        historicalEdge: 'medium',
        executionExposure: 'medium'
      }
    });
    // 0.55 * 100 = 55.0 pontos -> Grade C
    assert.equal(allMedium.score, 55);
    assert.equal(allMedium.grade, 'C');
    assert.equal(allMedium.riskBudgetPct, 0.001);
  });

  await t.test('Inferência automática inteligente a partir de dados e indicadores reais', () => {
    const autoInferred = TradingRubrics.calculateVolatilityRubric({
      close: 30.0,
      smaLong: 28.0,      // (30 - 28)/28 = 7.1% acima da SMA200 -> 'good' (20 pts)
      smaShort: 31.5,     // (31.5 - 30)/31.5 = 4.76% abaixo da SMA7 -> 'good' (15 pts)
      ifr: 1.8,           // IFR <= 2.0 -> 'good' (25 pts)
      entry: 30.0,
      atr: 0.5,           // ATR% = (0.5 / 30) = 1.66% (< 2% excelente) -> 'good' (15 pts)
      entryGapPct: 0.8,   // Gap < 2% -> 'good' (5 pts)
      winRate: 65,        // Win rate histórico 65% >= 60% -> 'good' (10 pts)
      liquidity: { isEligible: true, reason: 'Aprovado' } // -> 'good' (10 pts)
    });

    assert.equal(autoInferred.score, 100);
    assert.equal(autoInferred.grade, 'A');
    assert.equal(autoInferred.qualityAllowed, true);
  });
});

test('PASSO 5 — Dual Rubric Engine: Hard Gate de Liquidez e Regras de Bloqueio', async (t) => {
  await t.test('Reprovação no Liquidity Gate força Grade D e risco-base 0%, não compensável por pontos', () => {
    const illiquidResult = TradingRubrics.calculateVolatilityRubric({
      ratings: {
        primaryTrend: 'good',
        meanReversionTrigger: 'good',
        distanceShortMa: 'good',
        volatilityContext: 'good',
        historicalEdge: 'good',
        executionExposure: 'good'
      },
      liquidity: {
        isEligible: false,
        code: 'VOLUME_INSUFICIENTE',
        reason: 'Volume financeiro diário de R$ 80.000 abaixo do mínimo de R$ 500.000.'
      }
    });

    // Mesmo com 90 pontos nos outros critérios, o Liquidity Gate é um Hard Gate inegociável
    assert.equal(illiquidResult.isLiquidityApproved, false);
    assert.equal(illiquidResult.grade, 'D');
    assert.equal(illiquidResult.riskBudgetPct, 0);
    assert.equal(illiquidResult.qualityAllowed, false);
    assert.equal(illiquidResult.isBuyPermitted, false);

    const liqGate = illiquidResult.gates.find(g => g.key === 'liquidity');
    assert.ok(liqGate);
    assert.equal(liqGate.status, 'blocked');
    assert.match(liqGate.message, /NÃO ELEGÍVEL \/ BLOQUEADO POR LIQUIDEZ/);
  });

  await t.test('Falha na Tendência Primária (Close <= SMA200) bloqueia Grade A e B', () => {
    const belowTrend = TradingRubrics.calculateVolatilityRubric({
      close: 25.0,
      smaLong: 28.0, // Abaixo da SMA200 -> Tendência de baixa
      ratings: {
        meanReversionTrigger: 'good',
        distanceShortMa: 'good',
        volatilityContext: 'good',
        liquidity: 'good',
        historicalEdge: 'good',
        executionExposure: 'good'
      }
    });

    // Score alto em sobrevenda não pode gerar Grade A nem B sem tendência de alta
    assert.ok(belowTrend.grade === 'C' || belowTrend.grade === 'D');
    assert.notEqual(belowTrend.grade, 'A');
    assert.notEqual(belowTrend.grade, 'B');
    const trendGate = belowTrend.gates.find(g => g.key === 'primaryTrend');
    assert.ok(trendGate);
    assert.equal(trendGate.status, 'limited');
  });

  await t.test('Falha no Gatilho de Sobrevenda (IFR > 10) impede notas de excelência', () => {
    const notOversold = TradingRubrics.calculateVolatilityRubric({
      ifr: 35.0, // Não sobrevendido
      ratings: {
        primaryTrend: 'good',
        distanceShortMa: 'good',
        volatilityContext: 'good',
        liquidity: 'good',
        historicalEdge: 'good',
        executionExposure: 'good'
      }
    });

    assert.ok(notOversold.grade === 'C' || notOversold.grade === 'D');
    assert.notEqual(notOversold.grade, 'A');
    assert.notEqual(notOversold.grade, 'B');
    const triggerGate = notOversold.gates.find(g => g.key === 'meanReversionTrigger');
    assert.ok(triggerGate);
    assert.equal(triggerGate.status, 'limited');
  });
});

test('PASSO 5 — Dual Rubric Engine: Isolamento e Independência entre Políticas', async (t) => {
  await t.test('Alterar pesos na Rubric de Trend Following não altera Volatility Rubric', () => {
    const customPolicy = {
      criteria: [
        { key: 'trendQuality', weight: 40 },
        { key: 'marketCycle', weight: 30 },
        { key: 'relativeStrength', weight: 30 },
        { key: 'volatility', weight: 0 },
        { key: 'setupQuality', weight: 0 },
        { key: 'fundamentalScore', weight: 0 }
      ]
    };

    const norm = TradingRubrics.normalizePolicy(customPolicy);
    assert.equal(norm.criteria.find(c => c.key === 'trendQuality').weight, 40);

    // Volatility Rubric permanece com os pesos oficiais originais
    assert.equal(norm.volatilityRubric.criteria.find(c => c.key === 'primaryTrend').weight, 20);
    assert.equal(norm.volatilityRubric.criteria.find(c => c.key === 'meanReversionTrigger').weight, 25);
  });

  await t.test('Alterar pesos na Volatility Rubric não altera Trend Following', () => {
    const customPolicy = {
      volatilityRubric: {
        criteria: [
          { key: 'primaryTrend', weight: 30 },
          { key: 'meanReversionTrigger', weight: 30 },
          { key: 'distanceShortMa', weight: 20 },
          { key: 'volatilityContext', weight: 10 },
          { key: 'liquidity', weight: 10 },
          { key: 'historicalEdge', weight: 0 },
          { key: 'executionExposure', weight: 0 }
        ]
      }
    };

    const norm = TradingRubrics.normalizePolicy(customPolicy);
    assert.equal(norm.volatilityRubric.criteria.find(c => c.key === 'primaryTrend').weight, 30);

    // Trend Following permanece com os pesos padrão de 25, 20, 20, 15, 15, 5
    assert.equal(norm.criteria.find(c => c.key === 'trendQuality').weight, 25);
    assert.equal(norm.criteria.find(c => c.key === 'marketCycle').weight, 20);
    assert.equal(norm.criteria.find(c => c.key === 'relativeStrength').weight, 20);
  });
});

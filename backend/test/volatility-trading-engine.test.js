'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const VolatilityEngineModel = require('../../frontend/volatility-trading-engine-model');
const volatilityEngine = require('../src/volatility-engine');
const StrategyConfigModel = require('../../frontend/strategy-configuration-model');

test('PASSO 4 — Volatility Trading Engine: Fórmulas Canônicas de Indicadores', async (t) => {
  await t.test('calculateSMA calcula média móvel simples com precisão e preenche nulls iniciais', () => {
    const closes = [10, 20, 30, 40, 50];
    const sma3 = VolatilityEngineModel.calculateSMA(closes, 3);

    assert.equal(sma3.length, 5);
    assert.equal(sma3[0], null);
    assert.equal(sma3[1], null);
    assert.equal(sma3[2], 20); // (10 + 20 + 30) / 3
    assert.equal(sma3[3], 30); // (20 + 30 + 40) / 3
    assert.equal(sma3[4], 40); // (30 + 40 + 50) / 3
  });

  await t.test('calculateSMA aceita tanto array de números quanto array de candles', () => {
    const candles = [
      { time: '2026-01-01', close: 12 },
      { time: '2026-01-02', close: 14 },
      { time: '2026-01-03', close: 16 }
    ];
    const sma2 = VolatilityEngineModel.calculateSMA(candles, 2);
    assert.equal(sma2[0], null);
    assert.equal(sma2[1], 13);
    assert.equal(sma2[2], 15);
  });

  await t.test('calculateRSI calcula IFR(2) canônico com suavização de Welles Wilder', () => {
    // Série determinística de testes:
    // Dia 0: 100
    // Dia 1: 90  (Delta: -10, Loss: 10, Gain: 0)
    // Dia 2: 80  (Delta: -10, Loss: 10, Gain: 0) -> IFR(2) = 0.00
    // Dia 3: 85  (Delta: +5,  Gain: 5,  Loss: 0) -> IFR(2) = 33.33
    // Dia 4: 82  (Delta: -3,  Gain: 0,  Loss: 3) -> IFR(2) = 23.81
    const testCloses = [100, 90, 80, 85, 82];
    const rsi2 = VolatilityEngineModel.calculateRSI(testCloses, 2, 'WILDER');

    assert.equal(rsi2[0], null);
    assert.equal(rsi2[1], null);
    assert.equal(rsi2[2], 0);
    assert.equal(Math.round(rsi2[3] * 100) / 100, 33.33);
    assert.equal(Math.round(rsi2[4] * 100) / 100, 23.81);
  });

  await t.test('calculateRSI trata fronteiras e casos extremos (preços estáveis e altas contínuas)', () => {
    const flatCloses = [50, 50, 50, 50];
    const rsiFlat = VolatilityEngineModel.calculateRSI(flatCloses, 2);
    assert.equal(rsiFlat[2], 50); // sem ganhos nem perdas -> nível neutro 50

    const upCloses = [10, 20, 30, 40];
    const rsiUp = VolatilityEngineModel.calculateRSI(upCloses, 2);
    assert.equal(rsiUp[2], 100); // somente ganhos -> nível máximo 100
    assert.equal(rsiUp[3], 100);
  });
});

test('PASSO 4 — Volatility Trading Engine: Regras de Entrada e Gating Rigoroso', async (t) => {
  // Constrói histórico sintético de 210 dias com tendência de alta (preços subindo gradualmente)
  function makeSyntheticHistory(lastDaysOverrides = []) {
    const candles = [];
    let basePrice = 20.0;
    const baseDate = new Date('2025-01-01T12:00:00Z');

    for (let i = 0; i < 210; i++) {
      const d = new Date(baseDate.getTime() + i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      // Tendência de alta suave
      basePrice += 0.15;
      candles.push({
        time: iso,
        open: round(basePrice - 0.1),
        high: round(basePrice + 0.3),
        low: round(basePrice - 0.2),
        close: round(basePrice),
        volume: 2000000,
        trades: 1500
      });
    }

    // Aplica eventuais overrides nos últimos candles
    for (const ov of lastDaysOverrides) {
      const idx = candles.length - 1 - (ov.offset || 0);
      if (idx >= 0) {
        candles[idx] = { ...candles[idx], ...ov };
      }
    }

    return candles;
  }

  function round(val) {
    return Math.round(val * 100) / 100;
  }

  await t.test('Rejeita sinal se o histórico possuir menos de 200 barras (falha na média de 200)', () => {
    const shortHistory = makeSyntheticHistory().slice(0, 150);
    const result = VolatilityEngineModel.evaluateSignal(shortHistory, shortHistory.length - 1);

    assert.equal(result.isValid, false);
    assert.equal(result.code, VolatilityEngineModel.SIGNAL_CODES.INSUFFICIENT_HISTORY_LONG_MA);
    assert.match(result.reason, /no mínimo 200 pregões/);
  });

  await t.test('Rejeita sinal se o fechamento estiver abaixo da SMA200 (tendência primária não é de alta)', () => {
    // Força último preço muito abaixo da média de 200
    const candles = makeSyntheticHistory([
      { offset: 0, close: 10.0, open: 10.5, high: 11.0, low: 9.8 }
    ]);

    const result = VolatilityEngineModel.evaluateSignal(candles, candles.length - 1, { checkLiquidity: false });
    assert.equal(result.isValid, false);
    assert.equal(result.code, VolatilityEngineModel.SIGNAL_CODES.NOT_ABOVE_LONG_MA);
    assert.match(result.reason, /Filtro estrutural reprovado/);
  });

  await t.test('Rejeita sinal se o fechamento não estiver abaixo da SMA7', () => {
    // Força preço atual em máxima, acima da SMA7
    const candles = makeSyntheticHistory([
      { offset: 0, close: 95.0, open: 90.0, high: 96.0, low: 89.0 }
    ]);

    const result = VolatilityEngineModel.evaluateSignal(candles, candles.length - 1, { checkLiquidity: false });
    assert.equal(result.isValid, false);
    assert.equal(result.code, VolatilityEngineModel.SIGNAL_CODES.NOT_BELOW_SHORT_MA);
    assert.match(result.reason, /Condição de preço reprovada/);
  });

  await t.test('Teste de Fronteira do IFR: aprova IFR exatamente igual a 10.00 e rejeita IFR a 10.01', () => {
    // Criamos série onde Close > SMA200 e Close < SMA7
    // Simulamos série enriquecida direta para controle numérico exato de fronteira
    const mockSeries = [
      {
        time: '2026-10-01',
        open: 50,
        high: 51,
        low: 47,
        close: 48,
        smaShort: 52, // 48 < 52 -> OK
        smaLong: 40,  // 48 > 40 -> OK
        ifr: 10.00    // Exatamente no limite de 10
      },
      {
        time: '2026-10-02',
        open: 50,
        high: 51,
        low: 47,
        close: 48,
        smaShort: 52,
        smaLong: 40,
        ifr: 10.01    // 0.01 acima do limite
      }
    ];

    const evalExact = VolatilityEngineModel.evaluateSignal(mockSeries, 0, { oversoldLevel: 10, checkLiquidity: false });
    assert.equal(evalExact.isValid, true, 'IFR == 10.00 deve ser aceito');
    assert.equal(evalExact.code, VolatilityEngineModel.SIGNAL_CODES.SIGNAL_CONFIRMED);

    const evalAbove = VolatilityEngineModel.evaluateSignal(mockSeries, 1, { oversoldLevel: 10, checkLiquidity: false });
    assert.equal(evalAbove.isValid, false, 'IFR == 10.01 deve ser rejeitado');
    assert.equal(evalAbove.code, VolatilityEngineModel.SIGNAL_CODES.RSI_NOT_OVERSOLD);
  });

  await t.test('Bloqueia sinal caso o ativo esteja na Blacklist comportamental', () => {
    const mockSeries = [
      {
        time: '2026-10-01',
        close: 48,
        smaShort: 52,
        smaLong: 40,
        ifr: 8.5
      }
    ];

    const evalBl = VolatilityEngineModel.evaluateSignal(mockSeries, 0, {
      symbol: 'OIBR3',
      blacklist: ['OIBR3', 'IRBR3'],
      checkLiquidity: false
    });

    assert.equal(evalBl.isValid, false);
    assert.equal(evalBl.code, VolatilityEngineModel.SIGNAL_CODES.BLACKLISTED);
    assert.match(evalBl.reason, /Blacklist Comportamental/);
  });

  await t.test('Bloqueia sinal caso reprovado no Liquidity Gate (volume diário < R$ 500k)', () => {
    // Histórico com 210 dias mas volume diário pífio (R$ 50.000 por dia)
    const illiquidCandles = makeSyntheticHistory().map(c => ({
      ...c,
      volume: 50000 // volume muito abaixo de R$ 500.000
    }));

    // Força sinal técnico nos preços
    const last = illiquidCandles.length - 1;
    illiquidCandles[last - 1].close = 60;
    illiquidCandles[last].close = 45; // queda forte para gerar IFR baixo

    const evalLiq = VolatilityEngineModel.evaluateSignal(illiquidCandles, last, {
      symbol: 'ILLIQ3',
      market: 'B3',
      checkLiquidity: true
    });

    assert.equal(evalLiq.isValid, false);
    assert.equal(evalLiq.code, VolatilityEngineModel.SIGNAL_CODES.LIQUIDITY_REJECTED);
    assert.match(evalLiq.reason, /Bloqueado pelo Liquidity Gate/);
  });
});

test('PASSO 4 — Volatility Trading Engine: Execução sem Look-Ahead, Gaps e Contagem D0/D1', async (t) => {
  await t.test('Execução realista na abertura de T+1 (D0) com absorção de Gap', () => {
    const series = [
      // Candle 0: Sinal confirmado
      { time: '2026-03-02', open: 50, high: 50.5, low: 46.8, close: 47.0, smaShort: 51.0, smaLong: 40.0, ifr: 6.5 },
      // Candle 1: Abertura T+1 (D0) com gap de baixa para 46.00
      { time: '2026-03-03', open: 46.0, high: 47.2, low: 45.8, close: 46.5, smaShort: 50.2, smaLong: 40.1 },
      // Candle 2: D1 - Fechamento 46.80 < SMA7 49.50 (sem saída)
      { time: '2026-03-04', open: 46.5, high: 47.0, low: 46.2, close: 46.8, smaShort: 49.5, smaLong: 40.2 },
      // Candle 3: D2 - Fechamento 51.50 > SMA7 49.20 (Saída por recuperação!)
      { time: '2026-03-05', open: 47.0, high: 52.0, low: 46.9, close: 51.5, smaShort: 49.2, smaLong: 40.3 }
    ];

    const trade = VolatilityEngineModel.simulateTradeLifecycle({
      series,
      signalIndex: 0,
      options: { fixedCapitalPerTrade: 10000, symbol: 'TEST3' }
    });

    assert.equal(trade.status, 'CLOSED');
    assert.equal(trade.signalDate, '2026-03-02');
    assert.equal(trade.entryDate, '2026-03-03');
    assert.equal(trade.entryPrice, 46.0); // Entrou na abertura de T+1
    assert.equal(trade.entryGapPct, -2.13); // Gap de (46 - 47) / 47 = -2.13%
    assert.equal(trade.sharesQuantity, 217); // Math.floor(10000 / 46) = 217 ações
    assert.equal(trade.allocatedCapital, 9982.0); // 217 * 46
    assert.equal(trade.remainingCash, 18.0);
    assert.equal(trade.exitDate, '2026-03-05'); // Saiu em D2
    assert.equal(trade.exitPrice, 51.5);
    assert.equal(trade.exitReason, VolatilityEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY);
    assert.equal(trade.holdingSessions, 2); // D1, D2 = 2 pregões
    assert.equal(trade.outcome, 'WIN');
    assert.equal(trade.grossPnl, 1193.5); // 217 * (51.5 - 46.0)
    assert.equal(trade.returnPct, 11.96); // (51.5 - 46.0) / 46.0 * 100
  });

  await t.test('Saída Temporal exata no fechamento de D7 se a recuperação na média não ocorrer', () => {
    // Constrói série com sinal em 0, entrada em 1 (D0), e 7 sessões D1..D7 onde Close SEMPRE fica abaixo de SMA7
    const series = [
      { time: '2026-04-01', open: 50, high: 50, low: 45, close: 46, smaShort: 51, smaLong: 38, ifr: 7.0 }, // Sinal (T)
      { time: '2026-04-02', open: 46.2, high: 47, low: 45.8, close: 46.0, smaShort: 50, smaLong: 38.1 }    // Entrada (D0)
    ];

    // Adiciona D1 até D7
    for (let k = 1; k <= 7; k++) {
      const dayNum = String(2 + k).padStart(2, '0');
      series.push({
        time: `2026-04-${dayNum}`,
        open: 46,
        high: 47,
        low: 45,
        close: 45.5, // 45.5 < SMA7 49 -> recuperação não atingida
        smaShort: 49.0,
        smaLong: 38.2
      });
    }

    const trade = VolatilityEngineModel.simulateTradeLifecycle({
      series,
      signalIndex: 0,
      options: { fixedCapitalPerTrade: 10000, symbol: 'TIME3' }
    });

    assert.equal(trade.status, 'CLOSED');
    assert.equal(trade.exitReason, VolatilityEngineModel.EXIT_REASONS.TIME_EXIT);
    assert.equal(trade.holdingSessions, 7);
    assert.equal(trade.exitDate, '2026-04-09'); // D7
    assert.equal(trade.exitPrice, 45.5);
  });

  await t.test('Se a recuperação ocorrer exatamente no pregão D7, ela tem precedência técnica sobre Saída Temporal', () => {
    const series = [
      { time: '2026-04-01', open: 50, high: 50, low: 45, close: 46, smaShort: 51, smaLong: 38, ifr: 7.0 }, // Sinal (T)
      { time: '2026-04-02', open: 46.2, high: 47, low: 45.8, close: 46.0, smaShort: 50, smaLong: 38.1 }    // Entrada (D0)
    ];

    // D1 a D6 abaixo da média
    for (let k = 1; k <= 6; k++) {
      series.push({
        time: `2026-04-${String(2 + k).padStart(2, '0')}`,
        open: 46,
        high: 47,
        low: 45,
        close: 45.5,
        smaShort: 49.0,
        smaLong: 38.2
      });
    }
    // D7 explode acima da SMA curta (Close 52 > SMA7 48.5)
    series.push({
      time: '2026-04-09',
      open: 46,
      high: 53,
      low: 45.8,
      close: 52.0,
      smaShort: 48.5,
      smaLong: 38.5
    });

    const trade = VolatilityEngineModel.simulateTradeLifecycle({
      series,
      signalIndex: 0,
      options: { fixedCapitalPerTrade: 10000, symbol: 'PREC3' }
    });

    assert.equal(trade.status, 'CLOSED');
    assert.equal(trade.exitReason, VolatilityEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY);
    assert.equal(trade.holdingSessions, 7);
    assert.equal(trade.exitPrice, 52.0);
  });
});

test('PASSO 4 — Volatility Trading Engine: Separação Arquitetural e Preservação do Trend Following', async (t) => {
  await t.test('Volatility Engine não contamina Trend Following nem exige Força Relativa ou Rubric', () => {
    assert.equal(VolatilityEngineModel.STRATEGY_TYPE, 'VOLATILITY_TRADING');
    assert.equal(VolatilityEngineModel.SETUP_NAME, 'VOLATILITY_SWING_IFR2');

    // Confirma parâmetros oficiais
    const p = VolatilityEngineModel.DEFAULT_PARAMETERS;
    assert.equal(p.timeframe, 'Diário');
    assert.equal(p.shortMaPeriod, 7);
    assert.equal(p.longMaPeriod, 200);
    assert.equal(p.rsiPeriod, 2);
    assert.equal(p.oversoldLevel, 10);
    assert.equal(p.holdingPeriodSessions, 7);
    assert.equal(p.stopModel, 'NONE');

    // Nenhuma menção a Rubric, Mansfield, RS rank ou Trend setups
    assert.equal('rubricVersion' in p, false);
    assert.equal('relativeStrength' in p, false);
    assert.equal('trendEma' in p, false);
  });

  await t.test('Serviço Backend resolve perfil oficial padrão e realiza varredura sem erros', async () => {
    const defaultProfile = await volatilityEngine.resolveProfile('test-user-id');
    assert.ok(defaultProfile);
    assert.equal(defaultProfile.strategyType, 'VOLATILITY_TRADING');
    assert.equal(defaultProfile.parameters.rsiPeriod, 2);
    assert.equal(defaultProfile.parameters.oversoldLevel, 10);
  });
});

test('PASSO 4 — Volatility Trading Engine: Backtest de Ativo e Varredura de Universo', async (t) => {
  await t.test('simulateAsset calcula métricas de desempenho consolidadas e curva de capital em dados reais', () => {
    const { loadB3History } = require('../src/ticker-chart');
    const petr = loadB3History().get('PETR4');
    assert.ok(petr && petr.length >= 200, 'PETR4 deve possuir histórico de candles');

    const sim = VolatilityEngineModel.simulateAsset(petr, {
      symbol: 'PETR4',
      market: 'B3',
      fixedCapitalPerTrade: 10000,
      checkLiquidity: false
    });

    assert.equal(sim.strategyType, 'VOLATILITY_TRADING');
    assert.equal(sim.entrySetup, 'VOLATILITY_SWING_IFR2');
    assert.ok(sim.summary);
    assert.ok(Array.isArray(sim.trades));
    assert.ok(Array.isArray(sim.equityCurve));
    assert.equal(sim.summary.totalTrades, 8);
    assert.equal(sim.summary.winningTrades, 5);
    assert.equal(sim.summary.losingTrades, 3);
    assert.equal(sim.summary.winRatePct, 62.5);
    assert.equal(sim.summary.exitsBreakdown.TARGET_MA_RECOVERY, 6);
    assert.equal(sim.summary.exitsBreakdown.TIME_EXIT, 2);
    assert.ok(sim.summary.maxDrawdownPct > 0);
    assert.ok(sim.equityCurve.length > 1);
  });

  await t.test('scanUniverse ordena candidatos pelo IFR2 ascendente (mais sobrevendido primeiro)', () => {
    const candlesMap = new Map();

    function makeAsset(symbol, ifrLevel) {
      const arr = [];
      for (let i = 0; i < 210; i++) {
        arr.push({
          time: `2026-05-${String(i + 1).padStart(3, '0')}`,
          open: 40,
          high: 42,
          low: 39,
          close: 40,
          smaShort: 45,
          smaLong: 30,
          ifr: ifrLevel,
          volume: 2000000
        });
      }
      return arr;
    }

    candlesMap.set('ASSET_B', makeAsset('ASSET_B', 8.5));
    candlesMap.set('ASSET_A', makeAsset('ASSET_A', 2.1));
    candlesMap.set('ASSET_C', makeAsset('ASSET_C', 5.0));

    const scan = VolatilityEngineModel.scanUniverse(candlesMap, { checkLiquidity: false });
    assert.equal(scan.signalsFound, 3);
    assert.equal(scan.signals[0].symbol, 'ASSET_A'); // 2.1
    assert.equal(scan.signals[1].symbol, 'ASSET_C'); // 5.0
    assert.equal(scan.signals[2].symbol, 'ASSET_B'); // 8.5
  });
});

const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const strategyAnalyticsModel = require(path.join(__dirname, '../../frontend/strategy-analytics-model.js'));
const strategyAnalyticsService = require(path.join(__dirname, '../src/strategy-analytics.js'));

test('Capital Efficiency Analytics Suite', async (t) => {
  await t.test('countBusinessDays correctly calculates trading sessions excluding weekends', () => {
    // Friday to Monday = 2 business days (Friday, Monday)
    const fri = '2026-01-02'; // Friday
    const mon = '2026-01-05'; // Monday
    const sessions = strategyAnalyticsModel.countBusinessDays(fri, mon);
    assert.strictEqual(sessions, 2);

    // Same day = 1 business day
    assert.strictEqual(strategyAnalyticsModel.countBusinessDays('2026-01-05', '2026-01-05'), 1);

    // Full week Monday to Friday = 5 business days
    assert.strictEqual(strategyAnalyticsModel.countBusinessDays('2026-01-05', '2026-01-09'), 5);
  });

  await t.test('analyzeTrade calculates Capital-Days and Capital-Sessions for simple trade', () => {
    // Simple trade: entered 2026-01-05 (Mon), exited 2026-01-09 (Fri) = 5 days, 5 sessions
    // Capital committed: R$ 10.000. Net result: +R$ 500
    const trade = {
      id: 'trade-simple-1',
      ticker: 'PETR4',
      strategyType: 'TREND_FOLLOWING',
      entryDate: '2026-01-05',
      exitDate: '2026-01-09',
      entryPrice: 30.00,
      exitPrice: 31.50,
      positionSize: 333,
      financialInvested: 9990.00,
      netResult: 500.00,
      initialStop: 28.50,
      rMultiple: 1.0
    };

    const analyzed = strategyAnalyticsModel.analyzeTrade(trade);
    assert.strictEqual(analyzed.calendarDays, 5);
    assert.strictEqual(analyzed.holdingSessions, 5);
    // Capital Days = 9990 * 5 = 49950
    assert.strictEqual(analyzed.capitalDays, 9990 * 5);
    assert.strictEqual(analyzed.capitalSessions, 9990 * 5);
    assert.strictEqual(analyzed.allocatedCapital, 9990.00);
    assert.strictEqual(analyzed.tradedVolume, 20479.50);
  });

  await t.test('analyzeTrade tracks Capital-Days accurately with partial exit (peel-off) without double-counting', () => {
    // Trade with scale-in or peel-off:
    // Entry: 2026-01-05 with 1000 shares @ 20.00 = R$ 20.000
    // Partial exit on 2026-01-09 (5 days later): sold 500 shares @ 22.00 (R$ 10.000 initial capital exited)
    // Final exit on 2026-01-15 (6 days later): remaining 500 shares exited @ 24.00
    // Segment 1 (Jan 5 to Jan 9): 5 days with R$ 20.000 = 100.000 Capital-Days
    // Segment 2 (Jan 9 to Jan 15): 6 days with R$ 10.000 = 60.000 Capital-Days
    // Expected Total Capital-Days = 160.000 (NOT 20.000 * 11 = 220.000)
    const tradeWithPartial = {
      id: 'trade-peeloff-1',
      ticker: 'VALE3',
      strategyType: 'TREND_FOLLOWING',
      entryDate: '2026-01-05',
      exitDate: '2026-01-15',
      entryPrice: 20.00,
      positionSize: 1000,
      financialInvested: 20000.00,
      netResult: 3000.00,
      events: [
        { type: 'ENTRY', date: '2026-01-05', quantity: 1000, price: 20.00 },
        { type: 'PARTIAL_EXIT', date: '2026-01-09', quantity: 500, price: 22.00 },
        { type: 'EXIT', date: '2026-01-15', quantity: 500, price: 24.00 }
      ]
    };

    const analyzed = strategyAnalyticsModel.analyzeTrade(tradeWithPartial);
    assert.strictEqual(analyzed.calendarDays, 11);
    assert.ok(analyzed.capitalDays < 20000 * 11, 'Capital-Days must reflect reduced exposure after partial exit');
    assert.strictEqual(analyzed.capitalDays, 150000);
  });

  await t.test('calculateStrategyMetrics computes all required efficiency, frequency and turnover metrics', () => {
    // 6 trades over 2 months (60 calendar days)
    // Strategy capital: R$ 100.000
    // Total profit: R$ 6.000
    const trades = [
      {
        id: 't1',
        strategyType: 'VOLATILITY_TRADING',
        entryDate: '2026-01-05',
        exitDate: '2026-01-08', // 4 days, 4 sessions
        financialInvested: 25000,
        netResult: 1200,
        rMultiple: 0.8
      },
      {
        id: 't2',
        strategyType: 'VOLATILITY_TRADING',
        entryDate: '2026-01-12',
        exitDate: '2026-01-14', // 3 days, 3 sessions
        financialInvested: 25000,
        netResult: -400,
        rMultiple: -0.3
      },
      {
        id: 't3',
        strategyType: 'VOLATILITY_TRADING',
        entryDate: '2026-01-19',
        exitDate: '2026-01-22', // 4 days, 4 sessions
        financialInvested: 25000,
        netResult: 1500,
        rMultiple: 1.0
      },
      {
        id: 't4',
        strategyType: 'VOLATILITY_TRADING',
        entryDate: '2026-02-02',
        exitDate: '2026-02-05', // 4 days, 4 sessions
        financialInvested: 25000,
        netResult: 1100,
        rMultiple: 0.7
      },
      {
        id: 't5',
        strategyType: 'VOLATILITY_TRADING',
        entryDate: '2026-02-09',
        exitDate: '2026-02-12', // 4 days, 4 sessions
        financialInvested: 25000,
        netResult: 1400,
        rMultiple: 0.9
      },
      {
        id: 't6',
        strategyType: 'VOLATILITY_TRADING',
        entryDate: '2026-02-23',
        exitDate: '2026-02-26', // 4 days, 4 sessions
        financialInvested: 25000,
        netResult: 1200,
        rMultiple: 0.8
      }
    ];

    const initialCapital = 100000;
    const metrics = strategyAnalyticsModel.calculateStrategyMetrics(trades, {
      initialCapital,
      strategyType: 'VOLATILITY_TRADING'
    });

    // 1. Total trades & Net Profit
    assert.strictEqual(metrics.totalTrades, 6);
    assert.strictEqual(metrics.netProfit, 6000);

    // 2. Trades per month
    assert.ok(metrics.tradesPerMonth > 0, 'Trades per month should be positive');

    // 3. Average Holding Period
    assert.ok(metrics.avgHoldingSessions >= 3 && metrics.avgHoldingSessions <= 4);
    assert.ok(metrics.avgHoldingDays >= 3 && metrics.avgHoldingDays <= 4);

    // 4. Capital Turnover
    // Total allocated = 6 * 25.000 = 150.000 -> Turnover = 150.000 / 100.000 = 1.5x
    assert.strictEqual(metrics.totalAllocatedCapital, 150000);
    assert.strictEqual(metrics.capitalTurnover, 1.5);

    // 5. Total Capital-Days & Return per Capital-Day
    // t1: 25000 * 4 = 100.000
    // t2: 25000 * 3 = 75.000
    // t3: 25000 * 4 = 100.000
    // t4: 25000 * 4 = 100.000
    // t5: 25000 * 4 = 100.000
    // t6: 25000 * 4 = 100.000
    // Total Capital Days = 575.000
    assert.strictEqual(metrics.totalCapitalDays, 575000);

    // Return per Capital-Day (%) = (6000 / 575000) * 100 = 1.043478%
    const expectedCapDayPct = (6000 / 575000) * 100;
    assert.ok(Math.abs(metrics.returnPerCapitalDayPct - expectedCapDayPct) < 0.001);

    // Net per R$ 1.000 Capital-Days = (6000 / 575000) * 1000 = R$ 10.43
    assert.ok(Math.abs(metrics.netPerThousandCapitalDays - 10.43) < 0.05);

    // 6. Return on Capital Deployed (ROCD)
    assert.ok(metrics.returnOnCapitalDeployedPct > 0);

    // 7. Projected vs Observed Monthly Return
    assert.ok(metrics.projectedMonthlyExpectancy > 0);
    assert.ok(metrics.observedMonthlyAverage > 0);
  });

  await t.test('compareStrategies shows how high turnover & short holding in Volatility can beat high individual payoff in Trend Following on Return per Capital-Day', () => {
    // Identical period (Jan - Feb 2026, ~54 days)
    // Initial capital = R$ 100.000
    // Trend Following: 2 trades, high payoff (+3.0R average), but long holding (25 days each).
    // Total profit: R$ 5.000. Capital committed: R$ 30.000 each -> Total Capital-Days = 30.000 * 25 * 2 = 1.500.000 Capital-Days.
    // Return per Capital-Day (Trend) = 5.000 / 1.500.000 * 100 = 0.333%/dia.
    //
    // Volatility Trading: 10 trades, smaller payoff (+0.7R average), short holding (3 days each).
    // Total profit: R$ 5.500. Capital committed: R$ 25.000 each -> Total Capital-Days = 25.000 * 3 * 10 = 750.000 Capital-Days.
    // Return per Capital-Day (Vol) = 5.500 / 750.000 * 100 = 0.733%/dia (MORE THAN DOUBLE the capital efficiency!).

    const trendTrades = [
      {
        id: 'tf-1',
        strategyType: 'TREND_FOLLOWING',
        entryDate: '2026-01-05',
        exitDate: '2026-01-30', // 26 days
        financialInvested: 30000,
        netResult: 3500,
        rMultiple: 3.5,
        exitReason: 'TRAILING_STOP'
      },
      {
        id: 'tf-2',
        strategyType: 'TREND_FOLLOWING',
        entryDate: '2026-02-02',
        exitDate: '2026-02-27', // 26 days
        financialInvested: 30000,
        netResult: 1500,
        rMultiple: 1.5,
        exitReason: 'TARGET'
      }
    ];

    const volTrades = [
      { id: 'vol-1', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-01-05', exitDate: '2026-01-07', financialInvested: 25000, netResult: 600, rMultiple: 0.6 },
      { id: 'vol-2', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-01-08', exitDate: '2026-01-12', financialInvested: 25000, netResult: 550, rMultiple: 0.55 },
      { id: 'vol-3', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-01-13', exitDate: '2026-01-15', financialInvested: 25000, netResult: 700, rMultiple: 0.7 },
      { id: 'vol-4', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-01-19', exitDate: '2026-01-21', financialInvested: 25000, netResult: -300, rMultiple: -0.3 },
      { id: 'vol-5', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-01-22', exitDate: '2026-01-26', financialInvested: 25000, netResult: 800, rMultiple: 0.8 },
      { id: 'vol-6', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-02-02', exitDate: '2026-02-04', financialInvested: 25000, netResult: 650, rMultiple: 0.65 },
      { id: 'vol-7', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-02-05', exitDate: '2026-02-09', financialInvested: 25000, netResult: 750, rMultiple: 0.75 },
      { id: 'vol-8', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-02-10', exitDate: '2026-02-12', financialInvested: 25000, netResult: -250, rMultiple: -0.25 },
      { id: 'vol-9', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-02-16', exitDate: '2026-02-18', financialInvested: 25000, netResult: 900, rMultiple: 0.9 },
      { id: 'vol-10', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-02-23', exitDate: '2026-02-25', financialInvested: 25000, netResult: 1100, rMultiple: 1.1 }
    ];

    const allTrades = [...trendTrades, ...volTrades];
    const comparison = strategyAnalyticsModel.compareStrategies(allTrades, {
      initialCapital: 100000
    });

    assert.ok(comparison, 'Comparison must be generated');
    assert.strictEqual(comparison.scope, 'COMPARISON');

    // Payoff Winner must be Trend Following
    const payoffDim = comparison.dimensions.find(d => d.id === 'payoffRatio');
    assert.strictEqual(payoffDim.winner, 'TREND_FOLLOWING');

    // Exposure Time Winner must be Volatility Trading (shorter holding is preferred)
    const exposureDim = comparison.dimensions.find(d => d.id === 'avgHoldingPeriod');
    assert.strictEqual(exposureDim.winner, 'VOLATILITY_TRADING');

    // Capital Turnover Winner must be Volatility Trading (higher turnover)
    const turnoverDim = comparison.dimensions.find(d => d.id === 'capitalTurnover');
    assert.strictEqual(turnoverDim.winner, 'VOLATILITY_TRADING');

    // Frequency Winner must be Volatility Trading
    const freqDim = comparison.dimensions.find(d => d.id === 'tradesPerMonth');
    assert.strictEqual(freqDim.winner, 'VOLATILITY_TRADING');

    // PRIORITY METRIC: Return per Capital-Day Winner must be Volatility Trading!
    const capDayDim = comparison.dimensions.find(d => d.id === 'returnPerCapitalDay');
    assert.strictEqual(capDayDim.isPriority, true);
    assert.strictEqual(capDayDim.winner, 'VOLATILITY_TRADING');

    // Primary verdict must state the economic truth:
    assert.ok(comparison.primaryVerdict.includes('gerar mais riqueza por unidade de capital e tempo de exposição'));
    assert.ok(comparison.dualSynergySummary.length > 0);
  });

  await t.test('Backend strategyAnalytics service handles COMPARISON scope cleanly', async () => {
    const mockTrades = [
      { id: 't1', ticker: 'PETR4', status: 'closed', strategyType: 'TREND_FOLLOWING', entryDate: '2026-01-05', exitDate: '2026-01-20', financialInvested: 20000, netResult: 1500 },
      { id: 'v1', ticker: 'VALE3', status: 'closed', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-01-08', exitDate: '2026-01-11', financialInvested: 15000, netResult: 800 }
    ];

    const res = await strategyAnalyticsService.getAnalytics({
      userId: 'test-user',
      strategy: 'COMPARISON',
      initialCapital: 100000,
      trades: mockTrades
    });

    assert.ok(res);
    assert.strictEqual(res.scope, 'COMPARISON');
    assert.ok(res.comparison);
    assert.ok(res.comparison.dimensions);
    assert.ok(res.definitions);
    assert.ok(res.definitions.returnPerCapitalDay);
    assert.ok(res.definitions.capitalTurnover);
  });

  await t.test('Consolidated Portfolio includes capital efficiency and comparison', () => {
    const trades = [
      { id: 'c1', strategyType: 'TREND_FOLLOWING', entryDate: '2026-01-05', exitDate: '2026-01-20', financialInvested: 20000, netResult: 1500 },
      { id: 'c2', strategyType: 'VOLATILITY_TRADING', entryDate: '2026-01-08', exitDate: '2026-01-11', financialInvested: 15000, netResult: 800 }
    ];

    const consolidated = strategyAnalyticsModel.calculateConsolidatedPortfolio(trades, {
      initialCapital: 100000
    });

    assert.ok(consolidated.capitalEfficiency);
    assert.ok(consolidated.capitalEfficiency.totalCapitalDays > 0);
    assert.ok(consolidated.capitalEfficiency.capitalTurnover > 0);
    assert.ok(consolidated.capitalEfficiency.returnPerCapitalDayPct > 0);
    assert.ok(consolidated.comparison);
  });
});

const test = require('node:test');
const assert = require('node:assert/strict');

const Catalog = require('./setup-triggers-catalog');
const TradingRubrics = require('./trading-rubrics');
const JournalV2Model = require('./journal-v2-model');
const TradeAnatomyModel = require('./trade-anatomy-model');
const tradesBackend = require('../backend/src/trades');

test('IFR2 appears in Trigger Options when Volatility Trading is selected and disappears in Trend Following', () => {
  const volOptions = Catalog.getTriggerOptions('VOLATILITY_TRADING');
  const volValues = volOptions.map(o => o.value);
  assert.ok(volValues.includes('IFR2'), 'IFR2 must be present in Volatility Trading options');

  const ifrOption = volOptions.find(o => o.value === 'IFR2');
  assert.equal(ifrOption.label, '⚡ IFR2 (Volatilidade)');
  assert.equal(ifrOption.name, 'IFR2 (Volatilidade)');
  assert.equal(ifrOption.strategy, 'VOLATILITY_TRADING');
  // Positioned right after INSIDE_BAR as in the Novo Trade dropdown
  assert.equal(volValues[0], 'INSIDE_BAR');
  assert.equal(volValues[1], 'IFR2');

  const trendOptions = Catalog.getTriggerOptions('TREND_FOLLOWING');
  const trendValues = trendOptions.map(o => o.value);
  assert.equal(trendValues.includes('IFR2'), false, 'IFR2 must NOT appear in Trend Following options');
  assert.deepEqual(trendValues, ['INSIDE_BAR', 'PFR_COMPRA', '123_COMPRA', 'RBI', 'BREAKOUT']);

  const defaultOptions = Catalog.getTriggerOptions();
  assert.equal(defaultOptions.some(o => o.value === 'IFR2'), false, 'Default (Trend Following) options must not include IFR2');
});

test('IFR2 strategy-aware validation and normalization', () => {
  assert.equal(Catalog.normalizeKey('IFR2'), 'IFR2');
  assert.equal(Catalog.normalizeKey('ifr2'), 'IFR2');
  assert.equal(Catalog.normalizeKey('IFR2 (Volatilidade)'), 'IFR2');
  assert.equal(Catalog.normalizeKey('⚡ IFR2 (Volatilidade)'), 'IFR2');
  assert.equal(Catalog.normalizeKey('VOLATILITY_SWING_IFR2'), 'IFR2');
  assert.equal(Catalog.normalizeKey('Volatility Swing — IFR2'), 'IFR2');

  assert.equal(Catalog.isValidTrigger('IFR2', 'VOLATILITY_TRADING'), true);
  assert.equal(Catalog.isValidTrigger('IFR2'), true);
  assert.equal(Catalog.isValidTrigger('IFR2', 'TREND_FOLLOWING'), false);

  // Existing 5 triggers remain valid without regression
  for (const id of ['INSIDE_BAR', 'PFR_COMPRA', '123_COMPRA', 'RBI', 'BREAKOUT']) {
    assert.equal(Catalog.isValidTrigger(id, 'TREND_FOLLOWING'), true);
    assert.equal(Catalog.isValidTrigger(id, 'VOLATILITY_TRADING'), true);
    assert.equal(Catalog.isValidTrigger(id), true);
  }

  assert.equal(Catalog.getTriggerLabel('IFR2'), 'IFR2 (Volatilidade)');
  assert.equal(Catalog.getTriggerLabel('VOLATILITY_SWING_IFR2'), 'IFR2 (Volatilidade)');
  const badge = Catalog.formatTriggerBadge('IFR2');
  assert.equal(badge.isAssigned, true);
  assert.equal(badge.label, 'IFR2 (Volatilidade)');
  assert.equal(badge.badgeText, 'GATILHO: IFR2 (Volatilidade)');
});

test('Backend trades.normalizePlan saves IFR2 properly for Volatility Trading and blocks IFR2 on Trend Following', () => {
  const savedVol = tradesBackend.normalizePlan({
    strategyType: 'VOLATILITY_TRADING',
    asset: 'WEGE3',
    market: 'Ações',
    direction: 'long',
    setupTrigger: 'IFR2',
    entry: 48.30,
    stop: 46.50,
    atr: 1.72,
    suggestedQty: 100,
    executedQty: 100,
    riskPct: 0.0025,
    riskBudgetPct: 0.0025,
    grade: 'A'
  });

  assert.equal(savedVol.strategyType, 'VOLATILITY_TRADING');
  assert.equal(savedVol.setupTrigger, 'IFR2');
  assert.equal(savedVol.setup, 'IFR2 (Volatilidade)');

  // Rejects IFR2 when strategy is Trend Following
  assert.throws(
    () => tradesBackend.normalizePlan({
      strategyType: 'TREND_FOLLOWING',
      asset: 'WEGE3',
      market: 'Ações',
      direction: 'long',
      setupTrigger: 'IFR2',
      entry: 48.30,
      stop: 46.50,
      atr: 1.72,
      suggestedQty: 100,
      executedQty: 100,
      riskPct: 0.0025,
      riskBudgetPct: 0.0025,
      grade: 'A'
    }),
    /Gatilho de entrada inválido/
  );
});

test('Journal and Trade Anatomy display IFR2 (Volatilidade) properly', () => {
  const journalTrade = JournalV2Model.createTrade({
    ticker: 'WEGE3',
    strategyType: 'VOLATILITY_TRADING',
    setupTrigger: 'IFR2',
    grade: 'A'
  });
  assert.equal(journalTrade.strategyType, 'VOLATILITY_TRADING');
  assert.equal(journalTrade.setupTrigger, 'IFR2');
  assert.equal(journalTrade.setup, 'IFR2 (Volatilidade)');

  const anatomyItem = TradeAnatomyModel.analyzeTrade({
    id: 'vol-1',
    ticker: 'WEGE3',
    strategy_type: 'VOLATILITY_TRADING',
    setup_trigger: 'IFR2',
    rubric_grade: 'A',
    rubric_score: 92,
    entry_price: 48.30,
    stop_price: 46.50,
    executed_quantity: 100,
    events: [
      { type: 'entry', price: 48.30, qty: 100, stop: 46.50, at: '2026-11-20T10:00:00Z' },
      { type: 'close', price: 50.10, qty: 100, at: '2026-11-24T16:00:00Z' }
    ]
  });
  assert.equal(anatomyItem.setupTrigger, 'IFR2');
  assert.equal(anatomyItem.triggerLabel, 'IFR2 (Volatilidade)');
  assert.equal(anatomyItem.setup, 'IFR2 (Volatilidade)');

  const dna = TradeAnatomyModel.dna([anatomyItem]);
  const ifrDna = dna.find(d => d.key === 'triggerIfr2');
  assert.ok(ifrDna, 'DNA must include triggerIfr2 feature');
  assert.equal(ifrDna.matches, 1);
  assert.equal(ifrDna.percentage, 100);
});

test('Trading Rubric evaluates IFR2 trigger and impacts quality score and Risk Budget', () => {
  // 1. Evaluate IFR2 rule directly (reusing VolatilityTradingEngineModel rules: close > smaLong, close < smaShort, ifr <= oversoldLevel)
  const validExtreme = TradingRubrics.evaluateIfr2Trigger({ close: 48.3, smaLong: 42.0, smaShort: 49.8, ifr: 1.8 });
  assert.equal(validExtreme.isValid, true);
  assert.equal(validExtreme.rating, 'good');
  assert.equal(validExtreme.score, 1.0);

  const invalidAboveThreshold = TradingRubrics.evaluateIfr2Trigger({ close: 48.3, smaLong: 42.0, smaShort: 49.8, ifr: 14.5 });
  assert.equal(invalidAboveThreshold.isValid, false);
  assert.equal(invalidAboveThreshold.rating, 'bad');
  assert.equal(invalidAboveThreshold.score, 0);

  // 2. Volatility Rubric with strong IFR2 trigger vs weak IFR2 trigger
  const goodVolRubric = TradingRubrics.calculateRubric({
    strategyType: 'VOLATILITY_TRADING',
    setupTrigger: 'IFR2',
    close: 48.30,
    smaLong: 42.00,
    smaShort: 50.10,
    ifr: 1.5,
    atr: 0.90,
    entry: 48.30,
    winRate: 65,
    entryGapPct: 0.5
  });
  assert.equal(goodVolRubric.setupTrigger, 'IFR2');
  assert.equal(goodVolRubric.grade, 'A');
  assert.ok(goodVolRubric.riskBudgetPct > 0, 'Valid IFR2 Grade A setup must release positive Risk Budget');

  const badVolRubric = TradingRubrics.calculateRubric({
    strategyType: 'VOLATILITY_TRADING',
    setupTrigger: 'IFR2',
    close: 48.30,
    smaLong: 42.00,
    smaShort: 50.10,
    ifr: 22.0, // Not oversold -> fails IFR2 trigger gate
    atr: 0.90,
    entry: 48.30,
    winRate: 65,
    entryGapPct: 0.5
  });
  assert.notEqual(badVolRubric.grade, 'A', 'Failed IFR2 trigger must cap grade below A/B');
  assert.ok(badVolRubric.score < goodVolRubric.score);
  assert.ok(badVolRubric.riskBudgetPct < goodVolRubric.riskBudgetPct);
});

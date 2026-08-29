const PLAN_CATALOG = {
  trial: {
    id: 'trial',
    durationDays: 7,
    monthlyPriceBRL: 0,
    monthlyTradeLimit: null,
    features: ['workspace', 'positionSizing', 'manual', 'marketIntelligence', 'traderZen', 'habitTracker', 'traderJournal', 'weeklyReview']
  },
  basic: {
    id: 'basic',
    monthlyPriceBRL: 29,
    annualPriceBRL: 278.4,
    monthlyTradeLimit: 50,
    features: ['workspace', 'positionSizing', 'manual']
  },
  professional: {
    id: 'professional',
    monthlyPriceBRL: 69,
    annualPriceBRL: 662.4,
    monthlyTradeLimit: null,
    features: ['workspace', 'positionSizing', 'manual', 'marketIntelligence', 'traderZen', 'habitTracker', 'traderJournal', 'weeklyReview']
  }
};

module.exports = { PLAN_CATALOG };

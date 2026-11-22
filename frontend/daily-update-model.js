/**
 * HEALTHY TREND TRADER - DAILY UPDATE HUB MODEL
 * 
 * Central business logic for the Daily Update Hub (Fechamento Diário).
 * Reuses existing Wealth & Trades calculations, without duplicating data stores.
 * 
 * Rules:
 * - Broker balance is TOTAL balance (cash + open positions) — never add positions again.
 * - Real Wealth = sum of all account balances (with USD/BRL currency conversion for Nomad).
 * - Strategy Equity is distinct from Real Wealth (does not mix contributions/withdrawals).
 * - Foreign currency (Nomad USD): preserves original USD, tracks exchange rate and timestamp.
 * - Divergences and pending accounts are flagged for review, blocking closing until resolved.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DailyUpdateModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY_DRAFT = 'healthy-daily-update-draft-v1';
  const STORAGE_KEY_ACCOUNTS = 'healthy-daily-update-accounts';
  const STORAGE_KEY_HISTORY = 'healthy-daily-update-history';

  // Default accounts structure matching the official portfolio configuration
  const DEFAULT_ACCOUNTS = [
    {
      id: 'xp_daniel',
      label: 'XP — Daniel',
      institution: 'XP Investimentos',
      broker: 'xp',
      person: 'Daniel',
      type: 'INVESTMENT',
      currency: 'BRL',
      subtitle: 'Nº 123-4567',
      previousBalance: 207521.00,
      newBalance: 207521.00,
      status: 'keep', // 'keep' | 'updated' | 'pending'
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'nomad_daniel',
      label: 'Nomad — Daniel',
      institution: 'Nomad Global',
      broker: 'nomad',
      person: 'Daniel',
      type: 'INVESTMENT',
      currency: 'USD',
      subtitle: 'Nº 111-5500',
      previousBalanceUSD: 17759.25,
      newBalanceUSD: 17759.25,
      fxRate: 5.95,
      fxSource: 'Planilha V11 (D26)',
      fxTimestamp: '2026-11-19T18:00:00.000Z',
      previousBalance: 105667.54,
      newBalance: 105667.54,
      status: 'keep',
      inputCurrency: 'BRL', // 'BRL' | 'USD'
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'genial_daniel',
      label: 'Genial — Daniel',
      institution: 'Genial Investimentos',
      broker: 'genial',
      person: 'Daniel',
      type: 'INVESTMENT',
      currency: 'BRL',
      subtitle: 'Nº 987-6543',
      previousBalance: 257418.15,
      newBalance: 257418.15,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'clear_daniel',
      label: 'Clear — Daniel',
      institution: 'Clear Corretora',
      broker: 'clear',
      person: 'Daniel',
      type: 'INVESTMENT',
      currency: 'BRL',
      subtitle: 'Nº 444-0502',
      previousBalance: 3068.91,
      newBalance: 3068.91,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'eqseed_daniel',
      label: 'EqSeed — Daniel (Startup)',
      institution: 'EqSeed Venture',
      broker: 'eqseed',
      person: 'Daniel',
      type: 'INVESTMENT',
      currency: 'BRL',
      subtitle: 'Nº 618-8900',
      previousBalance: 5000.00,
      newBalance: 5000.00,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'bradesco_daniel',
      label: 'Bradesco — Daniel',
      institution: 'Banco Bradesco',
      broker: 'bradesco',
      person: 'Daniel',
      type: 'CHECKING',
      currency: 'BRL',
      subtitle: 'Ag. 1234 | C/C 56789-0',
      previousBalance: 14000.00,
      newBalance: 14000.00,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'xp_natalia',
      label: 'XP — Natália',
      institution: 'XP Investimentos',
      broker: 'xp',
      person: 'Natália',
      type: 'INVESTMENT',
      currency: 'BRL',
      subtitle: 'Nº 114-5500',
      previousBalance: 200911.07,
      newBalance: 200911.07,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'genial_natalia',
      label: 'Genial — Natália',
      institution: 'Genial Investimentos',
      broker: 'genial',
      person: 'Natália',
      type: 'INVESTMENT',
      currency: 'BRL',
      subtitle: 'Nº 114-5501',
      previousBalance: 220709.06,
      newBalance: 220709.06,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    }
  ];

  // Default sample open positions for instant preview
  const DEFAULT_POSITIONS = [
    { id: 'pos_aapl34', ticker: 'AAPL34', assetClass: 'BDR', accountId: 'xp_daniel', broker: 'XP — Daniel', quantity: 600, initialQuantity: 600, isPartial: false, partialCount: 0, entryPrice: 100.86, currentPrice: 103.21, stopPrice: 96.49, trailingStop: 96.49, atr: 2.77, mult: 1, contractMult: 1, side: 'Compra', direction: 'long', strategy: 'TREND_FOLLOWING', entryDate: '2026-11-13', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_amzn34', ticker: 'AMZN34', assetClass: 'BDR', accountId: 'xp_daniel', broker: 'XP — Daniel', quantity: 500, initialQuantity: 500, isPartial: false, partialCount: 0, entryPrice: 78.69, currentPrice: 77.03, stopPrice: 73.48, trailingStop: 73.48, atr: 3.33, mult: 1, contractMult: 1, side: 'Compra', direction: 'long', strategy: 'TREND_FOLLOWING', entryDate: '2026-11-19', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_winz26', ticker: 'WINZ26', assetClass: 'FUTURES', accountId: 'genial_daniel', broker: 'Genial — Daniel', quantity: 2, initialQuantity: 2, isPartial: false, partialCount: 0, entryPrice: 167685, currentPrice: 167595, stopPrice: 174435, trailingStop: 174435, atr: 5202.14, mult: 0.2, contractMult: 0.2, side: 'Venda', direction: 'short', strategy: 'TREND_FOLLOWING', entryDate: '2026-11-19', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_brav3', ticker: 'BRAV3', assetClass: 'STOCK', accountId: 'xp_daniel', broker: 'XP — Daniel', quantity: 500, initialQuantity: 500, isPartial: false, partialCount: 0, entryPrice: 14.06, currentPrice: 12.87, stopPrice: 12.00, trailingStop: 12.00, atr: 0.83, mult: 1, contractMult: 1, side: 'Compra', direction: 'long', strategy: 'VOLATILITY_TRADING', entryDate: '2026-11-11', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_bbas3', ticker: 'BBAS3', assetClass: 'STOCK', accountId: 'xp_daniel', broker: 'XP — Daniel', quantity: 300, initialQuantity: 300, isPartial: false, partialCount: 0, entryPrice: 15.48, currentPrice: 14.30, stopPrice: 12.00, trailingStop: 12.00, atr: 1.09, mult: 1, contractMult: 1, side: 'Compra', direction: 'long', strategy: 'VOLATILITY_TRADING', entryDate: '2026-11-13', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_bgix26', ticker: 'BGIX26', assetClass: 'FUTURES', accountId: 'genial_daniel', broker: 'Genial — Daniel', quantity: 1, initialQuantity: 1, isPartial: false, partialCount: 0, entryPrice: 402.25, currentPrice: 399.00, stopPrice: 395.00, trailingStop: 395.00, atr: 3.93, mult: 330, contractMult: 330, side: 'Compra', direction: 'long', strategy: 'VOLATILITY_TRADING', entryDate: '2026-11-16', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_m2st34', ticker: 'M2ST34', assetClass: 'BDR', accountId: 'xp_daniel', broker: 'XP — Daniel', quantity: 600, initialQuantity: 600, isPartial: false, partialCount: 0, entryPrice: 8.99, currentPrice: 7.38, stopPrice: 7.00, trailingStop: 7.00, atr: 0.74, mult: 1, contractMult: 1, side: 'Compra', direction: 'long', strategy: 'VOLATILITY_TRADING', entryDate: '2026-11-16', status: 'conferida', checked: true, hasDivergence: false }
  ];

  const POSITION_MARKET_CATEGORIES = [
    { key: 'FUTURES', label: 'Futuros', singularLabel: 'Futuro', icon: '⚡', order: 1 },
    { key: 'STOCK', label: 'Ações', singularLabel: 'Ação', icon: '📈', order: 2 },
    { key: 'BDR', label: 'BDRs', singularLabel: 'BDR', icon: '🌎', order: 3 },
    { key: 'FII', label: 'FIIs', singularLabel: 'FII', icon: '🏢', order: 4 },
    { key: 'ETF', label: 'ETFs', singularLabel: 'ETF', icon: '🧺', order: 5 },
    { key: 'OTHER', label: 'Outros', singularLabel: 'Outro', icon: '📦', order: 6 }
  ];

  const KNOWN_ETF_TICKERS = new Set([
    'BOVA11', 'SMAL11', 'IVVB11', 'XFIX11', 'HASH11', 'NASD11', 'GOLD11', 'DIVO11',
    'SPXI11', 'BOVV11', 'BRAX11', 'ECOO11', 'FIND11', 'GOVE11', 'ISUS11', 'MATB11',
    'PIBB11', 'BOVB11', 'ACWI11', 'WRLD11', 'EURP11', 'ASIA11', 'CHINA11', 'XINA11',
    'QBTC11', 'QETH11', 'ETHE11', 'BITH11', 'CRPT11', 'TECK11', 'DNAI11', 'MILL11',
    'SHOT11', 'AGRI11', 'BBOV11', 'BBOI11', 'CORN11', 'IMAB11', 'IB5M11', 'IRFM11',
    'FIXA11', 'B5P211', 'LFTS11', 'NTNS11', 'DEFI11', 'WEB311', 'NFTS11',
    'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 'EEM', 'GLD', 'SLV', 'TLT', 'ARKK', 'SOXX', 'SMH', 'XLF', 'XLK', 'XLE', 'XLV'
  ]);

  const KNOWN_STOCK_UNITS_11 = new Set([
    'ALUP11', 'BIDI11', 'BPAC11', 'CPLE11', 'ENGI11', 'IGTI11', 'KLBN11', 'MODL11',
    'RANI11', 'SANB11', 'SAPR11', 'SULA11', 'TAEE11', 'TIET11', 'BRBI11', 'ALLD11'
  ]);

  const KNOWN_FII_TICKERS = new Set([
    'ALZR11', 'BTLG11', 'CPTS11', 'CVBI11', 'DEVA11', 'GALG11', 'GARE11', 'HABT11',
    'HCTR11', 'HGBS11', 'HGCR11', 'HGLG11', 'HGRE11', 'HGRU11', 'HSML11', 'IRDM11',
    'JGPX11', 'JSRE11', 'KNCA11', 'KNCR11', 'KNIP11', 'KNRI11', 'KNSC11', 'MALL11',
    'MAXR11', 'MFII11', 'MXRF11', 'OUJP11', 'PATL11', 'PLCR11', 'PVBI11', 'QAGR11',
    'RBED11', 'RBRP11', 'RBRR11', 'RBRY11', 'RCRB11', 'RECT11', 'RECR11', 'RNDP11',
    'RZAK11', 'RZTR11', 'SARE11', 'TGAR11', 'TRBL11', 'TRXF11', 'URPR11', 'VGHF11',
    'VGIA11', 'VGIP11', 'VGIR11', 'VILG11', 'VINO11', 'VISC11', 'VRTA11', 'VSHO11',
    'XPCI11', 'XPCM11', 'XPIN11', 'XPLG11', 'XPML11', 'XPPR11', 'HGRF11', 'BROF11'
  ]);

  // Default sample historical snapshots for consultation and comparison
const DEFAULT_HISTORY = [
  {
    id: 'snap_2026-11-19_180000',
    date: '2026-11-19',
    closedAt: '2026-11-19T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 1000295.73,
    previousRealWealth: 999746.13,
    dayVariationAmount: 549.60,
    dayVariationPct: 0.05,
    strategyEquity: 1112175.49,
    totalExposure: 314302.00,
    exposurePct: 31.42,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 207100.00, newBalance: 207521.00, variationPct: 0.20, wealthSharePct: 20.75, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17759.25, newBalanceUSD: 17759.25, fxRate: 5.95, previousBalance: 105259.07, newBalance: 105667.54, variationPct: 0.39, wealthSharePct: 10.56, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.73, status: 'updated' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 201300.00, newBalance: 200911.07, variationPct: -0.19, wealthSharePct: 20.08, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 220600.00, newBalance: 220709.06, variationPct: 0.05, wealthSharePct: 22.06, status: 'updated' }
    ],
    positions: [
      { id: 'pos_aapl34', ticker: 'AAPL34', quantity: 600, entryPrice: 100.86, currentPrice: 103.21, status: 'conferida', checked: true, hasDivergence: false },
      { id: 'pos_amzn34', ticker: 'AMZN34', quantity: 500, entryPrice: 78.69, currentPrice: 77.03, status: 'conferida', checked: true, hasDivergence: false },
      { id: 'pos_winz26', ticker: 'WINZ26', quantity: 2, entryPrice: 167685, currentPrice: 167595, status: 'conferida', checked: true, hasDivergence: false },
      { id: 'pos_brav3', ticker: 'BRAV3', quantity: 500, entryPrice: 14.06, currentPrice: 12.87, status: 'conferida', checked: true, hasDivergence: false },
      { id: 'pos_bbas3', ticker: 'BBAS3', quantity: 300, entryPrice: 15.48, currentPrice: 14.30, status: 'conferida', checked: true, hasDivergence: false },
      { id: 'pos_bgix26', ticker: 'BGIX26', quantity: 1, entryPrice: 402.25, currentPrice: 399.00, status: 'conferida', checked: true, hasDivergence: false },
      { id: 'pos_m2st34', ticker: 'M2ST34', quantity: 600, entryPrice: 8.99, currentPrice: 7.38, status: 'conferida', checked: true, hasDivergence: false }
    ],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (19/11/2026) — Total R$ 1.000.295,73 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-18_180000',
    date: '2026-11-18',
    closedAt: '2026-11-18T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 999746.13,
    previousRealWealth: 999330.46,
    dayVariationAmount: 415.67,
    dayVariationPct: 0.04,
    strategyEquity: 1111800.00,
    totalExposure: 312000.00,
    exposurePct: 31.21,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 206800.00, newBalance: 207100.00, variationPct: 0.15, wealthSharePct: 20.72, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17740.00, newBalanceUSD: 17759.25, fxRate: 5.927, previousBalance: 104843.40, newBalance: 105259.07, variationPct: 0.40, wealthSharePct: 10.53, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.75, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 201700.00, newBalance: 201300.00, variationPct: -0.20, wealthSharePct: 20.13, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 220500.00, newBalance: 220600.00, variationPct: 0.05, wealthSharePct: 22.06, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (18/11/2026) — Total R$ 999.746,13 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-17_180000',
    date: '2026-11-17',
    closedAt: '2026-11-17T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 999330.46,
    previousRealWealth: 998680.66,
    dayVariationAmount: 649.80,
    dayVariationPct: 0.07,
    strategyEquity: 1111200.00,
    totalExposure: 310000.00,
    exposurePct: 31.02,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 206500.00, newBalance: 206800.00, variationPct: 0.15, wealthSharePct: 20.69, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17720.00, newBalanceUSD: 17740.00, fxRate: 5.91, previousBalance: 104193.60, newBalance: 104843.40, variationPct: 0.62, wealthSharePct: 10.49, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.76, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 202100.00, newBalance: 201700.00, variationPct: -0.20, wealthSharePct: 20.18, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 220400.00, newBalance: 220500.00, variationPct: 0.05, wealthSharePct: 22.07, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (17/11/2026) — Total R$ 999.330,46 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-14_180000',
    date: '2026-11-14',
    closedAt: '2026-11-14T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 998680.66,
    previousRealWealth: 998209.06,
    dayVariationAmount: 471.60,
    dayVariationPct: 0.05,
    strategyEquity: 1110500.00,
    totalExposure: 308000.00,
    exposurePct: 30.84,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 206200.00, newBalance: 206500.00, variationPct: 0.15, wealthSharePct: 20.68, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17700.00, newBalanceUSD: 17720.00, fxRate: 5.88, previousBalance: 103722.00, newBalance: 104193.60, variationPct: 0.45, wealthSharePct: 10.43, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.78, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 202500.00, newBalance: 202100.00, variationPct: -0.20, wealthSharePct: 20.24, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 220300.00, newBalance: 220400.00, variationPct: 0.05, wealthSharePct: 22.06, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (14/11/2026) — Total R$ 998.680,66 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-13_180000',
    date: '2026-11-13',
    closedAt: '2026-11-13T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 998209.06,
    previousRealWealth: 998015.06,
    dayVariationAmount: 194.00,
    dayVariationPct: 0.02,
    strategyEquity: 1109800.00,
    totalExposure: 306000.00,
    exposurePct: 30.65,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 206000.00, newBalance: 206200.00, variationPct: 0.10, wealthSharePct: 20.66, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17680.00, newBalanceUSD: 17700.00, fxRate: 5.86, previousBalance: 103428.00, newBalance: 103722.00, variationPct: 0.28, wealthSharePct: 10.39, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.79, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 202900.00, newBalance: 202500.00, variationPct: -0.20, wealthSharePct: 20.28, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 220200.00, newBalance: 220300.00, variationPct: 0.05, wealthSharePct: 22.07, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (13/11/2026) — Total R$ 998.209,06 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-12_180000',
    date: '2026-11-12',
    closedAt: '2026-11-12T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 998015.06,
    previousRealWealth: 997586.56,
    dayVariationAmount: 428.50,
    dayVariationPct: 0.04,
    strategyEquity: 1109200.00,
    totalExposure: 305000.00,
    exposurePct: 30.56,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 205800.00, newBalance: 206000.00, variationPct: 0.10, wealthSharePct: 20.64, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17650.00, newBalanceUSD: 17680.00, fxRate: 5.85, previousBalance: 102899.50, newBalance: 103428.00, variationPct: 0.51, wealthSharePct: 10.36, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.79, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 203300.00, newBalance: 202900.00, variationPct: -0.20, wealthSharePct: 20.33, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 220100.00, newBalance: 220200.00, variationPct: 0.05, wealthSharePct: 22.07, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (12/11/2026) — Total R$ 998.015,06 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-11_180000',
    date: '2026-11-11',
    closedAt: '2026-11-11T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 997586.56,
    previousRealWealth: 997119.06,
    dayVariationAmount: 467.50,
    dayVariationPct: 0.05,
    strategyEquity: 1108600.00,
    totalExposure: 303000.00,
    exposurePct: 30.37,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 205500.00, newBalance: 205800.00, variationPct: 0.15, wealthSharePct: 20.63, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17600.00, newBalanceUSD: 17650.00, fxRate: 5.83, previousBalance: 102432.00, newBalance: 102899.50, variationPct: 0.46, wealthSharePct: 10.31, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.80, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 203700.00, newBalance: 203300.00, variationPct: -0.20, wealthSharePct: 20.38, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 220000.00, newBalance: 220100.00, variationPct: 0.05, wealthSharePct: 22.07, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (11/11/2026) — Total R$ 997.586,56 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-10_180000',
    date: '2026-11-10',
    closedAt: '2026-11-10T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 997119.06,
    previousRealWealth: 996552.56,
    dayVariationAmount: 566.50,
    dayVariationPct: 0.06,
    strategyEquity: 1108000.00,
    totalExposure: 301000.00,
    exposurePct: 30.19,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 205200.00, newBalance: 205500.00, variationPct: 0.15, wealthSharePct: 20.61, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17550.00, newBalanceUSD: 17600.00, fxRate: 5.82, previousBalance: 101965.50, newBalance: 102432.00, variationPct: 0.46, wealthSharePct: 10.27, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.82, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 204000.00, newBalance: 203700.00, variationPct: -0.15, wealthSharePct: 20.43, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 219900.00, newBalance: 220000.00, variationPct: 0.05, wealthSharePct: 22.06, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (10/11/2026) — Total R$ 997.119,06 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-07_180000',
    date: '2026-11-07',
    closedAt: '2026-11-07T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 996552.56,
    previousRealWealth: 996087.06,
    dayVariationAmount: 465.50,
    dayVariationPct: 0.05,
    strategyEquity: 1107200.00,
    totalExposure: 299000.00,
    exposurePct: 30.00,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 205000.00, newBalance: 205200.00, variationPct: 0.10, wealthSharePct: 20.59, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17500.00, newBalanceUSD: 17550.00, fxRate: 5.81, previousBalance: 101500.00, newBalance: 101965.50, variationPct: 0.46, wealthSharePct: 10.23, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.83, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 204300.00, newBalance: 204000.00, variationPct: -0.15, wealthSharePct: 20.47, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 219800.00, newBalance: 219900.00, variationPct: 0.05, wealthSharePct: 22.07, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (07/11/2026) — Total R$ 996.552,56 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-06_180000',
    date: '2026-11-06',
    closedAt: '2026-11-06T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 996087.06,
    previousRealWealth: 996022.56,
    dayVariationAmount: 64.50,
    dayVariationPct: 0.01,
    strategyEquity: 1106500.00,
    totalExposure: 298000.00,
    exposurePct: 29.92,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 205300.00, newBalance: 205000.00, variationPct: -0.15, wealthSharePct: 20.58, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17450.00, newBalanceUSD: 17500.00, fxRate: 5.80, previousBalance: 101035.50, newBalance: 101500.00, variationPct: 0.46, wealthSharePct: 10.19, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.84, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 204500.00, newBalance: 204300.00, variationPct: -0.10, wealthSharePct: 20.51, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 219700.00, newBalance: 219800.00, variationPct: 0.05, wealthSharePct: 22.07, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (06/11/2026) — Total R$ 996.087,06 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-05_180000',
    date: '2026-11-05',
    closedAt: '2026-11-05T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 996022.56,
    previousRealWealth: 995959.06,
    dayVariationAmount: 63.50,
    dayVariationPct: 0.01,
    strategyEquity: 1106000.00,
    totalExposure: 297000.00,
    exposurePct: 29.82,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 205600.00, newBalance: 205300.00, variationPct: -0.15, wealthSharePct: 20.61, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17400.00, newBalanceUSD: 17450.00, fxRate: 5.79, previousBalance: 100572.00, newBalance: 101035.50, variationPct: 0.46, wealthSharePct: 10.14, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.84, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 204700.00, newBalance: 204500.00, variationPct: -0.10, wealthSharePct: 20.53, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 219600.00, newBalance: 219700.00, variationPct: 0.05, wealthSharePct: 22.06, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (05/11/2026) — Total R$ 996.022,56 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-04_180000',
    date: '2026-11-04',
    closedAt: '2026-11-04T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 995959.06,
    previousRealWealth: 995623.06,
    dayVariationAmount: 336.00,
    dayVariationPct: 0.03,
    strategyEquity: 1105500.00,
    totalExposure: 295000.00,
    exposurePct: 29.62,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 205800.00, newBalance: 205600.00, variationPct: -0.10, wealthSharePct: 20.64, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17350.00, newBalanceUSD: 17400.00, fxRate: 5.78, previousBalance: 99936.00, newBalance: 100572.00, variationPct: 0.64, wealthSharePct: 10.10, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.15, newBalance: 257418.15, variationPct: 0.00, wealthSharePct: 25.85, status: 'keep' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 204900.00, newBalance: 204700.00, variationPct: -0.10, wealthSharePct: 20.55, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 219500.00, newBalance: 219600.00, variationPct: 0.05, wealthSharePct: 22.05, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (04/11/2026) — Total R$ 995.959,06 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-11-03_180000',
    date: '2026-11-03',
    closedAt: '2026-11-03T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 995623.06,
    previousRealWealth: 1001317.92,
    dayVariationAmount: -5694.86,
    dayVariationPct: -0.57,
    strategyEquity: 1104800.00,
    totalExposure: 294000.00,
    exposurePct: 29.53,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 206028.00, newBalance: 205800.00, variationPct: -0.11, wealthSharePct: 20.67, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 16326.61, newBalanceUSD: 17350.00, fxRate: 5.76, previousBalance: 97143.36, newBalance: 99936.00, variationPct: 2.87, wealthSharePct: 10.04, status: 'updated' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 265776.90, newBalance: 257418.15, variationPct: -3.14, wealthSharePct: 25.86, status: 'updated' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 205019.25, newBalance: 204900.00, variationPct: -0.06, wealthSharePct: 20.58, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 219281.50, newBalance: 219500.00, variationPct: 0.10, wealthSharePct: 22.05, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Diário (03/11/2026) — Total R$ 995.623,06 consolidado com sucesso.',
    corrections: []
  },
  {
    id: 'snap_2026-10-31_180000',
    date: '2026-10-31',
    closedAt: '2026-10-31T18:00:00.000Z',
    version: 1,
    status: 'closed',
    hasException: false,
    exceptions: [],
    user: { name: 'Daniel' },
    realWealth: 1001317.92,
    previousRealWealth: 1022137.35,
    dayVariationAmount: -20819.43,
    dayVariationPct: -2.04,
    strategyEquity: 1104100.00,
    totalExposure: 290000.00,
    exposurePct: 28.96,
    portfolioHeat: 0.00,
    accounts: [
      { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 227735.00, newBalance: 206028.00, variationPct: -9.53, wealthSharePct: 20.58, status: 'updated' },
      { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 16326.61, newBalanceUSD: 16326.61, fxRate: 5.95, previousBalance: 97143.36, newBalance: 97143.36, variationPct: 0.00, wealthSharePct: 9.70, status: 'keep' },
      { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 333684.46, newBalance: 265776.90, variationPct: -20.35, wealthSharePct: 26.54, status: 'updated' },
      { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
      { id: 'eqseed_daniel', label: 'EqSeed — Daniel (Startup)', broker: 'eqseed', person: 'Daniel', currency: 'BRL', previousBalance: 5000.00, newBalance: 5000.00, variationPct: 0.00, wealthSharePct: 0.50, status: 'keep' },
      { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 205898.00, newBalance: 205019.25, variationPct: -0.43, wealthSharePct: 20.48, status: 'updated' },
      { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 217191.18, newBalance: 219281.50, variationPct: 0.96, wealthSharePct: 21.90, status: 'updated' }
    ],
    positions: [],
    summary: { totalAccounts: 7, accountsChecked: 7, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
    auditReason: 'Fechamento Mensal Homologado (31/10/2026) — Total R$ 1.001.317,92 consolidado com sucesso.',
    corrections: []
  }
];;

  /**
   * Robust parser for Brazilian and international currency inputs.
   */
  function parseNumber(val) {
    if (typeof val === 'number') return Number.isFinite(val) ? val : null;
    if (!val || typeof val !== 'string') return null;
    let str = val.trim().replace(/^(?:R\$|US\$|\$)\s*/i, '').trim();
    if (!str) return null;

    if (str.includes('.') && str.includes(',')) {
      if (str.indexOf('.') < str.indexOf(',')) {
        // Brazilian format: 1.234,56 -> 1234.56
        str = str.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,234.56 -> 1234.56
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      str = str.replace(',', '.');
    } else if ((str.match(/\./g) || []).length > 1) {
      str = str.replace(/\./g, '');
    }

    const num = parseFloat(str);
    return Number.isFinite(num) ? num : null;
  }

  /**
   * Validates a balance input.
   */
  function validateBalanceInput(val, allowZero = true) {
    if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) {
      return { valid: false, amount: null, error: 'O saldo não pode ficar vazio.' };
    }
    const parsed = parseNumber(val);
    if (parsed === null || Number.isNaN(parsed)) {
      return { valid: false, amount: null, error: 'Formato numérico inválido.' };
    }
    if (parsed < 0) {
      return { valid: false, amount: null, error: 'O saldo não pode ser negativo.' };
    }
    if (!allowZero && parsed === 0) {
      return { valid: false, amount: null, error: 'O saldo deve ser maior que zero.' };
    }
    return { valid: true, amount: parsed, error: null };
  }

  function formatBRL(val, decimals = 2) {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatUSD(val, decimals = 2) {
    const num = Number(val || 0);
    return 'US$ ' + num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatPercent(val, withSign = true) {
    const num = Number(val || 0);
    const sign = withSign && num > 0 ? '+' : '';
    return `${sign}${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }

  function formatCompactBRL(val) {
    const num = Number(val || 0);
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1000000) {
      return `${sign}R$ ${(abs / 1000000).toFixed(2).replace('.', ',')}M`;
    }
    if (abs >= 1000) {
      return `${sign}R$ ${(abs / 1000).toFixed(0)}k`;
    }
    return `${sign}R$ ${abs.toFixed(0)}`;
  }

  function formatRelativeDate(isoStr) {
    if (!isoStr) return 'Não conferido';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Não conferido';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Hoje às ${timeStr}`;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${day}/${month} às ${timeStr}`;
    } catch (_) {
      return 'Não conferido';
    }
  }

  class DailyUpdateModel {
    constructor(options = {}) {
      this.accounts = options.accounts ? JSON.parse(JSON.stringify(options.accounts)) : JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
      // Ensure all accounts have a valid type ('INVESTMENT' | 'CHECKING')
      this.accounts.forEach(acc => {
        if (!acc.type) acc.type = 'INVESTMENT';
      });
      this.positions = options.positions ? JSON.parse(JSON.stringify(options.positions)) : JSON.parse(JSON.stringify(DEFAULT_POSITIONS));
      this.strategyEquity = options.strategyEquity !== undefined ? Number(options.strategyEquity) : 1112175.49;
      this._portfolioHeat = options.portfolioHeat !== undefined ? Number(options.portfolioHeat) : null;
      this._heatLimit = options.heatLimit !== undefined ? Number(options.heatLimit) : null;
      this.closingDate = options.closingDate || new Date().toISOString().slice(0, 10);
      this.previousClosingWealth = options.previousClosingWealth !== undefined ? Number(options.previousClosingWealth) : 1000295.73;
      this.closingStatus = options.closingStatus || 'READY_TO_CLOSE'; // 'NOT_STARTED' | 'IN_PROGRESS' | 'READY_TO_CLOSE' | 'CLOSED'
    }

    get portfolioHeat() {
      return this.getPortfolioHeat();
    }
    set portfolioHeat(val) {
      this._portfolioHeat = (val !== null && val !== undefined) ? Number(val) : null;
    }
    setPortfolioHeat(val) {
      this._portfolioHeat = (val !== null && val !== undefined) ? Number(val) : null;
      return this;
    }

    get heatLimit() {
      return this.getHeatLimit();
    }
    set heatLimit(val) {
      this._heatLimit = (val !== null && val !== undefined) ? Number(val) : null;
    }
    setHeatLimit(val) {
      this._heatLimit = (val !== null && val !== undefined) ? Number(val) : null;
      return this;
    }

    /**
     * Calculates consolidated Real Wealth (Patrimônio Real).
     * Sum of all new balances across ALL accounts (investments and checking).
     */
    getConsolidatedRealWealth() {
      return this.accounts.reduce((sum, acc) => sum + (Number(acc.newBalance) || 0), 0);
    }

    /**
     * Calculates consolidated Investment Wealth (Equity de Investimentos).
     * Strictly sums accounts with type !== 'CHECKING'.
     */
    getInvestmentWealth() {
      return this.accounts
        .filter(acc => acc.type !== 'CHECKING')
        .reduce((sum, acc) => sum + (Number(acc.newBalance) || 0), 0);
    }

    /**
     * Calculates consolidated Checking Wealth (Contas Correntes).
     * Strictly sums accounts with type === 'CHECKING'.
     */
    getCheckingWealth() {
      return this.accounts
        .filter(acc => acc.type === 'CHECKING')
        .reduce((sum, acc) => sum + (Number(acc.newBalance) || 0), 0);
    }

    /**
     * Checks if there is a difference between Real Wealth and Investment Wealth
     * due to existing checking accounts.
     */
    hasCheckingDifference() {
      return this.getCheckingWealth() > 0 || this.accounts.some(a => a.type === 'CHECKING');
    }

    /**
     * Calculates previous consolidated Real Wealth (vs. previous closing snapshot).
     */
    getPreviousConsolidatedRealWealth() {
      if (this.previousClosingWealth && this.previousClosingWealth > 0) {
        return this.previousClosingWealth;
      }
      return this.accounts.reduce((sum, acc) => sum + (Number(acc.previousBalance) || 0), 0);
    }

    /**
     * Calculates day's nominal variation in Real Wealth.
     */
    getDayNominalVariation() {
      return this.getConsolidatedRealWealth() - this.getPreviousConsolidatedRealWealth();
    }

    /**
     * Calculates day's percentage variation in Real Wealth.
     */
    getDayPercentVariation() {
      const prev = this.getPreviousConsolidatedRealWealth();
      if (!prev || prev <= 0) return 0;
      return (this.getDayNominalVariation() / prev) * 100;
    }

    /**
     * Calculates individual account variation %.
     */
    getAccountVariationPct(account) {
      const prev = Number(account.previousBalance || 0);
      const curr = Number(account.newBalance || 0);
      if (!prev || prev <= 0) return 0;
      return ((curr - prev) / prev) * 100;
    }

    /**
     * CARD [05] — Calculates individual account percentage share of consolidated Real Wealth.
     * Formula: (converted balance in BRL / consolidated Real Wealth in BRL) * 100.
     * Returns a Number with 2 decimal places. Handles zero or negative wealth safely.
     */
    getAccountWealthSharePct(account, totalWealth = undefined) {
      if (totalWealth === null) return 0;
      const wealth = totalWealth !== undefined ? Number(totalWealth) : this.getConsolidatedRealWealth();
      if (!wealth || !Number.isFinite(wealth) || wealth <= 0) return 0;
      const balanceBrl = Number(account?.newBalance || 0);
      if (!balanceBrl || !Number.isFinite(balanceBrl) || balanceBrl <= 0) return 0;
      return Math.round(((balanceBrl / wealth) * 100) * 100) / 100;
    }

    /**
     * CARD [05] — Determines if current wealth distribution is provisional/partial.
     * True if any account is in 'pending' status or has validation errors.
     */
    isWealthDistributionProvisional() {
      const progress = this.getProgress();
      return progress.pendingAccounts > 0 || progress.invalidAccounts > 0 || !progress.accountsComplete;
    }

    /**
     * Returns list of unique titulars in registration order.
     */
    getTitulares() {
      const list = [];
      this.accounts.forEach(acc => {
        const person = (acc.person || 'Outros').trim();
        if (!list.includes(person)) {
          list.push(person);
        }
      });
      return list;
    }

    /**
     * Resolves visual identity theme for a titular.
     * Daniel -> 'blue', Natália -> 'purple'.
     * Deterministic fallback palette for other titulars.
     */
    getTitularTheme(person, index = 0) {
      if (!person) return 'blue';
      const norm = person.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (norm.includes('daniel')) return 'blue';
      if (norm.includes('natalia')) return 'purple';
      const THEMES = ['blue', 'purple', 'emerald', 'amber', 'rose', 'cyan'];
      return THEMES[index % THEMES.length];
    }

    /**
     * Calculates subtotal for a given titular.
     * Optional accountType: 'INVESTMENT' | 'CHECKING' | null (all accounts).
     */
    getTitularSubtotal(person, field = 'newBalance', accountType = null) {
      if (!person) return 0;
      return this.accounts
        .filter(acc => {
          const matchPerson = (acc.person || 'Outros').trim() === person.trim();
          if (!matchPerson) return false;
          if (accountType === 'INVESTMENT') return acc.type !== 'CHECKING';
          if (accountType === 'CHECKING') return acc.type === 'CHECKING';
          return true;
        })
        .reduce((sum, acc) => sum + (Number(acc[field]) || 0), 0);
    }

    /**
     * Calculates previous subtotal for a given titular.
     */
    getTitularPreviousSubtotal(person, accountType = null) {
      return this.getTitularSubtotal(person, 'previousBalance', accountType);
    }

    /**
     * Calculates percentage share of a titular relative to consolidated Real Wealth.
     */
    getTitularSharePct(person, totalWealth = undefined) {
      const wealth = totalWealth !== undefined ? Number(totalWealth) : this.getConsolidatedRealWealth();
      if (!wealth || !Number.isFinite(wealth) || wealth <= 0) return 0;
      const subtotal = this.getTitularSubtotal(person, 'newBalance');
      if (!subtotal || subtotal <= 0) return 0;
      return Math.round(((subtotal / wealth) * 100) * 100) / 100;
    }

    /**
     * Returns accounts grouped by titular with subtotals, theme and wealth shares.
     */
    getGroupedAccounts(totalWealth = undefined) {
      const wealth = totalWealth !== undefined ? Number(totalWealth) : this.getConsolidatedRealWealth();
      const titulares = this.getTitulares();
      return titulares.map((person, idx) => {
        const accounts = this.accounts.filter(acc => (acc.person || 'Outros').trim() === person.trim());
        const subtotal = accounts.reduce((sum, a) => sum + (Number(a.newBalance) || 0), 0);
        const previousSubtotal = accounts.reduce((sum, a) => sum + (Number(a.previousBalance) || 0), 0);
        const investmentSubtotal = accounts
          .filter(a => a.type !== 'CHECKING')
          .reduce((sum, a) => sum + (Number(a.newBalance) || 0), 0);
        const checkingSubtotal = accounts
          .filter(a => a.type === 'CHECKING')
          .reduce((sum, a) => sum + (Number(a.newBalance) || 0), 0);
        const nominalVariation = subtotal - previousSubtotal;
        const percentVariation = previousSubtotal > 0 ? (nominalVariation / previousSubtotal) * 100 : 0;
        const sharePct = (wealth > 0 && subtotal > 0) ? Math.round(((subtotal / wealth) * 100) * 100) / 100 : 0;
        const theme = this.getTitularTheme(person, idx);

        return {
          person,
          theme,
          accounts,
          count: accounts.length,
          subtotal,
          previousSubtotal,
          investmentSubtotal,
          checkingSubtotal,
          nominalVariation,
          percentVariation,
          sharePct
        };
      });
    }

    /**
     * Calculates variation % in USD for foreign currency accounts (Nomad).
     */
    getAccountUsdVariationPct(account) {
      if (account.currency !== 'USD') return 0;
      const prev = Number(account.previousBalanceUSD || 0);
      const curr = Number(account.newBalanceUSD || 0);
      if (!prev || prev <= 0) return 0;
      return ((curr - prev) / prev) * 100;
    }

    /**
     * Returns full foreign currency details for Nomad.
     */
    getForeignCurrencyDetails(accountId = 'nomad_daniel') {
      const acc = this.accounts.find(a => a.id === accountId);
      if (!acc || acc.currency !== 'USD') return null;

      const usdVarPct = this.getAccountUsdVariationPct(acc);
      const brlVarPct = this.getAccountVariationPct(acc);

      return {
        currency: 'USD',
        balanceUSD: acc.newBalanceUSD,
        previousBalanceUSD: acc.previousBalanceUSD,
        usdVariationPct: usdVarPct,
        fxRate: acc.fxRate || 5.73,
        fxSource: acc.fxSource || 'PTAX / Referência',
        fxTimestamp: acc.fxTimestamp || acc.updatedAt,
        convertedBRL: acc.newBalance,
        previousConvertedBRL: acc.previousBalance,
        brlVariationPct: brlVarPct
      };
    }

    /**
     * Updates an account's balance with validation.
     * Supports both BRL and USD inputs.
     */
    updateAccountBalance(accountId, newAmount, isUSD = false, fxRate = null) {
      const acc = this.accounts.find(a => a.id === accountId);
      if (!acc) return { success: false, error: 'Conta não encontrada.' };

      const validation = validateBalanceInput(newAmount);
      if (!validation.valid) {
        acc.error = validation.error;
        this.updateClosingReadiness();
        return Object.assign({ success: false, error: validation.error, account: acc }, acc);
      }

      acc.error = null;
      const parsed = validation.amount;

      if (isUSD || (acc.currency === 'USD' && isUSD)) {
        acc.newBalanceUSD = parsed;
        if (fxRate && Number.isFinite(Number(fxRate)) && Number(fxRate) > 0) {
          acc.fxRate = Number(fxRate);
          acc.fxTimestamp = new Date().toISOString();
        }
        const rate = acc.fxRate || 5.73;
        acc.newBalance = Math.round(parsed * rate * 100) / 100;
      } else {
        acc.newBalance = parsed;
        if (acc.currency === 'USD') {
          const rate = acc.fxRate || 5.73;
          acc.newBalanceUSD = Math.round((parsed / rate) * 100) / 100;
        }
      }

      acc.updatedAt = new Date().toISOString();
      acc.status = Math.abs(acc.newBalance - acc.previousBalance) > 0.001 ? 'updated' : 'keep';
      this.updateClosingReadiness();
      return Object.assign({ success: true, account: acc }, acc);
    }

    /**
     * Confirms that an account's balance remains unchanged from previous closing.
     */
    keepAccountBalance(accountId) {
      const acc = this.accounts.find(a => a.id === accountId);
      if (!acc) return null;

      acc.newBalance = Number(acc.previousBalance);
      if (acc.currency === 'USD' && acc.previousBalanceUSD !== undefined) {
        acc.newBalanceUSD = Number(acc.previousBalanceUSD);
      }
      acc.status = 'keep';
      acc.error = null;
      acc.updatedAt = new Date().toISOString();
      this.updateClosingReadiness();
      return acc;
    }

    /**
     * Confirms all accounts as unchanged with a single action.
     */
    keepAllAccounts() {
      this.accounts.forEach(acc => {
        acc.newBalance = Number(acc.previousBalance);
        if (acc.currency === 'USD' && acc.previousBalanceUSD !== undefined) {
          acc.newBalanceUSD = Number(acc.previousBalanceUSD);
        }
        acc.status = 'keep';
        acc.error = null;
        acc.updatedAt = new Date().toISOString();
      });
      this.updateClosingReadiness();
      return this.accounts;
    }

    /**
     * Marks an account as pending review.
     */
    setAccountPending(accountId) {
      const acc = this.accounts.find(a => a.id === accountId);
      if (!acc) return null;
      acc.status = 'pending';
      this.updateClosingReadiness();
      return acc;
    }

    /**
     * Calculates the financial volume allocated in a single open position.
     * Takes into account quantity, current price, contract multipliers, and FX rates.
     */
    getPositionFinancialVolume(pos) {
      if (!pos || pos.closed || pos.status === 'encerrada') return 0;
      const qty = Number(pos.quantity ?? pos.remaining ?? 0);
      const price = Number(pos.currentPrice ?? pos.entryPrice ?? pos.entry ?? 0);
      const mult = Number(pos.contractMult ?? pos.mult ?? 1);
      const fxRate = Number(pos.fxRate ?? (pos.currency === 'USD' ? (pos.fxRate || 5.95) : 1));
      return Math.round(qty * price * mult * fxRate * 100) / 100;
    }

    /**
     * Calculates current total market exposure from open positions.
     * Acts as the single source of truth for the KPI and the table totalizer.
     */
    getTotalExposure() {
      return this.positions
        .filter(pos => !pos.closed && pos.status !== 'encerrada')
        .reduce((sum, pos) => sum + this.getPositionFinancialVolume(pos), 0);
    }

    /**
     * Exposure as a percentage of Investment Wealth (Strategy Equity).
     * Accounts of type 'CHECKING' do not impact exposure.
     */
    getExposurePct() {
      const wealth = this.getInvestmentWealth();
      if (!wealth || wealth <= 0) return 0;
      return Math.round(((this.getTotalExposure() / wealth) * 100) * 100) / 100;
    }

    /**
     * Obtains the official Portfolio Heat limit percentage.
     * Consumes the official risk policy dynamically without hardcoding.
     */
    getHeatLimit() {
      const g = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : null)));
      if (g && typeof g.portfolioHeatLimitPct === 'function') {
        return g.portfolioHeatLimitPct();
      }
      if (typeof root !== 'undefined' && typeof root.portfolioHeatLimitPct === 'function') {
        return root.portfolioHeatLimitPct();
      }
      // Check active risk policy profile
      const policy = (typeof riskPolicyState !== 'undefined' && riskPolicyState) || null;
      if (policy) {
        const Rubric = (typeof window !== 'undefined' && window.TradingRubrics) || (typeof TradingRubrics !== 'undefined' && TradingRubrics);
        if (Rubric && typeof Rubric.getEffectiveRiskPolicy === 'function') {
          const eff = Rubric.getEffectiveRiskPolicy(policy);
          if (eff && eff.activeProfile && Number.isFinite(eff.activeProfile.portfolioHeatLimitPct)) {
            return Number(eff.activeProfile.portfolioHeatLimitPct);
          }
        }
        const profile = Rubric?.profileFor ? Rubric.profileFor(policy) : (policy.profiles?.[policy.selectedProfile] || policy.profiles?.standard);
        if (profile?.maximumPortfolioRiskPct) {
          return Math.round(Number(profile.maximumPortfolioRiskPct) * 100 * 100) / 100;
        }
      }
      if (this._heatLimit !== null && this._heatLimit !== undefined) {
        return this._heatLimit;
      }
      return 5.00;
    }

    /**
     * Calculates Cash Available (Caixa Disponível).
     * Represents unallocated cash in investment accounts available for new operations.
     * Formula: Investment Wealth - Allocated Capital in Positions.
     * Checking accounts do not participate in Investment Wealth or Cash Available.
     */
    getAvailableCash() {
      const investmentWealth = this.getInvestmentWealth();
      const allocated = this.getTotalExposure();
      return Math.max(0, Math.round((investmentWealth - allocated) * 100) / 100);
    }

    /**
     * Calculates Cash Available as percentage of Investment Wealth.
     */
    getAvailableCashPct() {
      const investmentWealth = this.getInvestmentWealth();
      if (!investmentWealth || investmentWealth <= 0) return 0;
      return Math.round((this.getAvailableCash() / investmentWealth) * 100 * 100) / 100;
    }

    /**
     * Calculates Allocated Capital (Capital Alocado).
     * Alias for getTotalExposure(), expressing financial volume committed to open positions.
     */
    getAllocatedCapital() {
      return this.getTotalExposure();
    }

    /**
     * Calculates Allocated Capital as percentage of Investment Wealth.
     * Alias for getExposurePct().
     */
    getAllocatedCapitalPct() {
      return this.getExposurePct();
    }

    /**
     * Calculates Remaining Risk Capacity (Capacidade de Risco Restante).
     * Formula: Heat Limit - Current Portfolio Heat (expressed in percentage points, pp).
     * Example: 5.00% - 2.12% = 2.88pp.
     */
    getRemainingRiskCapacityPct() {
      const limit = this.getHeatLimit();
      const heat = this.getPortfolioHeat();
      return Math.max(0, Math.round((limit - heat) * 100) / 100);
    }

    /**
     * Calculates Remaining Risk Capacity in BRL currency terms.
     * Formula: (Remaining Risk Capacity % / 100) * Investment Wealth.
     */
    getRemainingRiskCapacityAmount() {
      const investmentWealth = this.getInvestmentWealth();
      return Math.round((this.getRemainingRiskCapacityPct() / 100) * investmentWealth * 100) / 100;
    }

    /**
     * Calculates the official Portfolio Heat from positions and operational equity.
     * Guaranteed to match the top bar header indicator and the Portfolio Heat page.
     */
    getPortfolioHeat() {
      // 1. If running in browser or environment and official snapshot engine is available:
      const g = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : null)));
      if (g && typeof g.portfolioHeatSnapshot === 'function') {
        const snap = g.portfolioHeatSnapshot();
        if (snap && Number.isFinite(snap.heat)) {
          return Math.round(snap.heat * 100) / 100;
        }
      }
      if (typeof root !== 'undefined' && typeof root.portfolioHeatSnapshot === 'function') {
        const snap = root.portfolioHeatSnapshot();
        if (snap && Number.isFinite(snap.heat)) {
          return Math.round(snap.heat * 100) / 100;
        }
      }

      // If explicitly set and non-zero (e.g. from constructor options or snapshot restore):
      if (this._portfolioHeat !== null && this._portfolioHeat !== undefined && this._portfolioHeat !== 0) {
        return this._portfolioHeat;
      }

      // 2. Direct calculation from positions according to official risk methodology:
      return this.calculatePositionsRiskHeat();
    }

    /**
     * Internal calculation of aggregate risk percentage from positions.
     */
    calculatePositionsRiskHeat() {
      const equity = (typeof getOperationalEquity === 'function' ? getOperationalEquity() : null) ||
                     this.getInvestmentWealth() ||
                     this.strategyEquity ||
                     1000295.73;
      if (!equity || equity <= 0) return 0;

      const totalRisk = this.positions.reduce((sum, pos) => {
        if (pos.closed || pos.mode === 'paper' || pos.status === 'encerrada') return sum;
        const sign = (pos.direction === 'short' || pos.side === 'Venda') ? -1 : 1;
        const currentPrice = Number(pos.currentPrice ?? pos.entryPrice ?? pos.entry ?? 0);
        const currentStop = Number(pos.trailingStop ?? pos.stopPrice ?? pos.currentStop ?? 0);
        const mult = Number(pos.contractMult ?? pos.mult ?? 1);
        const fxRate = Number(pos.fxRate ?? (pos.currency === 'USD' ? (pos.fxRate || 5.95) : 1));
        const qty = Number(pos.quantity ?? pos.remaining ?? 0);
        const risk = Math.max(0, (currentPrice - currentStop) * sign * mult * fxRate * qty);
        return sum + risk;
      }, 0);

      return Math.round((totalRisk / equity) * 100 * 100) / 100;
    }

    /**
     * Counts progress: accounts updated/checked, positions checked, pendencies.
     */
    getProgress() {
      const totalAccounts = this.accounts.length;
      const pendingAccounts = this.accounts.filter(a => a.status === 'pending').length;
      const invalidAccounts = this.accounts.filter(a => Boolean(a.error)).length;
      const accountsChecked = this.accounts.filter(a => (a.status === 'keep' || a.status === 'updated') && !a.error).length;

      const totalPositions = this.positions.length;
      const positionsChecked = this.positions.filter(p => p.checked && p.status !== 'pendente' && !p.hasDivergence && !p.error).length;
      const pendingPositions = this.positions.filter(p => !p.checked || p.status === 'pendente').length;
      const divergences = this.positions.filter(p => p.hasDivergence).length;
      const invalidPositions = this.positions.filter(p => Boolean(p.error)).length;
      const unverifiedPositions = totalPositions - positionsChecked;

      const pendencies = divergences + pendingAccounts + invalidAccounts + pendingPositions + invalidPositions;

      const accountsComplete = accountsChecked === totalAccounts && pendingAccounts === 0 && invalidAccounts === 0;
      const positionsComplete = positionsChecked === totalPositions && pendingPositions === 0 && divergences === 0 && invalidPositions === 0;

      return {
        totalAccounts,
        accountsChecked,
        pendingAccounts,
        invalidAccounts,
        accountsComplete,
        totalPositions,
        positionsChecked,
        pendingPositions,
        invalidPositions,
        positionsComplete,
        divergences,
        pendencies,
        readyToClose: accountsComplete && positionsComplete && divergences === 0
      };
    }

    /**
     * Updates overall closing readiness status.
     */
    updateClosingReadiness() {
      const progress = this.getProgress();
      if (this.closingStatus === 'CLOSED') return;
      if (progress.readyToClose) {
        this.closingStatus = 'READY_TO_CLOSE';
      } else if (progress.accountsChecked > 0 || progress.positionsChecked > 0) {
        this.closingStatus = 'IN_PROGRESS';
      } else {
        this.closingStatus = 'NOT_STARTED';
      }
    }

    /**
     * Builds structured audit reason text for /api/wealth/adjustments.
     */
    buildClosingAuditReason() {
      const dateFormatted = this.closingDate ? this.closingDate.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
      const details = this.accounts.map(a => {
        const varPct = this.getAccountVariationPct(a);
        const sign = varPct > 0 ? '+' : '';
        const varStr = `${sign}${varPct.toFixed(2).replace('.', ',')}%`;
        if (a.currency === 'USD') {
          const usdVal = formatUSD(a.newBalanceUSD || 0);
          return `${a.label}: ${usdVal} @ R$ ${(a.fxRate || 5.73).toFixed(2).replace('.', ',')} = ${formatBRL(a.newBalance)} (${varStr})`;
        }
        return `${a.label}: ${formatBRL(a.newBalance)} (${varStr})`;
      }).join('; ');

      const total = formatBRL(this.getConsolidatedRealWealth());
      return `Fechamento Diário (${dateFormatted}) — Total ${total}. Detalhes: ${details}`.slice(0, 500);
    }

    /**
     * Updates an open position's current price.
     * Validates input. Crucial: does NOT overwrite entryPrice, stopPrice, trailingStop, or quantity.
     * When linked to an account (pos.accountId), automatically reflects price changes in the account's total balance.
     */
    updatePositionPrice(positionId, newPrice, options = {}) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return { success: false, error: 'Posição não encontrada.' };

      const validation = validateBalanceInput(newPrice, false);
      if (!validation.valid) {
        pos.error = validation.error;
        this.updateClosingReadiness();
        return Object.assign({ success: false, error: validation.error, position: pos }, pos);
      }

      const oldPrice = Number(pos.currentPrice || pos.entryPrice || 0);
      const newPriceNum = validation.amount;
      const dirStr = String(pos.direction ?? pos.side ?? '').trim().toLowerCase();
      const sign = (dirStr === 'short' || dirStr === 'venda' || dirStr === 'sell') ? -1 : 1;
      const deltaPerUnit = (newPriceNum - oldPrice) * sign;
      const mult = Number(pos.contractMult ?? pos.mult ?? 1);
      const fxRate = Number(pos.fxRate ?? (pos.currency === 'USD' ? (pos.fxRate || 5.95) : 1));
      const qty = Number(pos.quantity ?? pos.remaining ?? 0);
      const deltaTotal = Math.round(deltaPerUnit * qty * mult * fxRate * 100) / 100;

      pos.error = null;
      pos.previousCheckedPrice = oldPrice;
      pos.currentPrice = newPriceNum;
      pos.checked = true;
      if (!pos.hasDivergence) {
        pos.status = 'conferida';
      }
      pos.checkedAt = new Date().toISOString();

      // Reflect price change in linked account balance
      let affectedAccount = null;
      if (pos.accountId && deltaTotal !== 0 && options.syncAccount !== false) {
        const acc = this.accounts.find(a => a.id === pos.accountId);
        if (acc) {
          if (acc.currency === 'USD') {
            const fx = Number(acc.fxRate || 5.95);
            const deltaUSD = Math.round((deltaTotal / fx) * 100) / 100;
            acc.newBalanceUSD = Math.round(((acc.newBalanceUSD || 0) + deltaUSD) * 100) / 100;
            acc.newBalance = Math.round((acc.newBalanceUSD * fx) * 100) / 100;
          } else {
            acc.newBalance = Math.round(((Number(acc.newBalance) || 0) + deltaTotal) * 100) / 100;
          }
          acc.status = 'updated';
          affectedAccount = acc;
        }
      }

      this.updateClosingReadiness();
      return Object.assign({ success: true, position: pos, affectedAccount, deltaTotal }, pos);
    }

    /**
     * Updates an open position's quantity.
     * Recalculates financial volume and overall exposure.
     */
    updatePositionQuantity(positionId, newQuantity) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return { success: false, error: 'Posição não encontrada.' };
      const num = Number(newQuantity);
      if (!Number.isFinite(num) || num < 0) {
        return { success: false, error: 'Quantidade inválida.' };
      }
      pos.quantity = num;
      if (num === 0) {
        pos.closed = true;
        pos.status = 'encerrada';
      } else {
        pos.closed = false;
        if (pos.status === 'encerrada') pos.status = 'conferida';
      }
      this.updateClosingReadiness();
      return { success: true, position: pos, totalExposure: this.getTotalExposure(), exposurePct: this.getExposurePct() };
    }

    /**
     * Updates an open position's stop price / trailing stop.
     * Recalculates risk and portfolio heat.
     */
    updatePositionStop(positionId, newStop) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return { success: false, error: 'Posição não encontrada.' };
      const num = Number(newStop);
      if (!Number.isFinite(num) || num <= 0) {
        return { success: false, error: 'Stop deve ser um número positivo.' };
      }
      pos.trailingStop = num;
      pos.stopPrice = num;
      this.updateClosingReadiness();
      return { success: true, position: pos, portfolioHeat: this.getPortfolioHeat() };
    }

    /**
     * Closes an open position.
     * Updates total exposure and heat immediately.
     */
    closePosition(positionId) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return { success: false, error: 'Posição não encontrada.' };
      pos.closed = true;
      pos.status = 'encerrada';
      this.updateClosingReadiness();
      return { success: true, position: pos, totalExposure: this.getTotalExposure(), portfolioHeat: this.getPortfolioHeat() };
    }

    /**
     * Links/flags an open position to a specific account/brokerage.
     * Prevents linking positions to CHECKING accounts.
     */
    linkPositionToAccount(positionId, accountId) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return null;
      const oldAccountId = pos.accountId;
      const acc = this.accounts.find(a => a.id === accountId);
      if (acc && acc.type === 'CHECKING') {
        return { success: false, error: 'Posições só podem ser vinculadas a contas de investimentos.', position: pos };
      }
      pos.accountId = acc ? acc.id : null;
      pos.broker = acc ? acc.label : 'Não vinculada';
      pos.accountLabel = acc ? acc.label : null;
      this.updateClosingReadiness();
      return { position: pos, account: acc, oldAccountId };
    }

    /**
     * Gets all open positions linked to a specific account.
     */
    getPositionsByAccount(accountId) {
      if (!accountId) return [];
      return this.positions.filter(p => p.accountId === accountId);
    }

    /**
     * Marks a position as confirmed/verified without altering price.
     */
    confirmPosition(positionId) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return null;
      pos.checked = true;
      pos.error = null;
      if (!pos.hasDivergence) {
        pos.status = 'conferida';
      }
      pos.checkedAt = new Date().toISOString();
      this.updateClosingReadiness();
      return pos;
    }

    /**
     * Confirms all open positions with 1 action.
     */
    confirmAllPositions() {
      this.positions.forEach(pos => {
        pos.checked = true;
        pos.error = null;
        if (!pos.hasDivergence) {
          pos.status = 'conferida';
        }
        pos.checkedAt = new Date().toISOString();
      });
      this.updateClosingReadiness();
      return this.positions;
    }

    /**
     * Marks an open position as pending conference.
     */
    setPositionPending(positionId) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return null;
      pos.checked = false;
      pos.status = 'pendente';
      this.updateClosingReadiness();
      return pos;
    }

    /**
     * Signals a quantity or trade divergence observed at the broker.
     * Preserves registered quantity and marks for explicit review.
     */
    reportPositionDivergence(positionId, divergenceData = {}) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return null;
      pos.hasDivergence = true;
      pos.divergence = {
        field: divergenceData.field || 'quantity',
        expected: pos.quantity,
        reported: divergenceData.reported ?? divergenceData.reportedQuantity,
        note: divergenceData.note || 'Quantidade observada na corretora diverge da registrada.',
        reportedAt: new Date().toISOString()
      };
      pos.status = 'divergente';
      this.updateClosingReadiness();
      return pos;
    }

    /**
     * Resolves and clears a divergence after user verification.
     */
    resolvePositionDivergence(positionId) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return null;
      pos.hasDivergence = false;
      pos.divergence = null;
      pos.status = 'conferida';
      pos.checked = true;
      this.updateClosingReadiness();
      return pos;
    }

    /**
     * Calculates position price variation %.
     */
    getPositionVariationPct(pos) {
      if (!pos) return 0;
      const entry = Number(pos.entryPrice ?? pos.averageEntry ?? pos.entry ?? 0);
      const curr = Number(pos.currentPrice ?? entry);
      if (!entry || entry <= 0) return 0;
      return ((curr - entry) / entry) * 100;
    }

    /**
     * Resolves direction multiplier (+1 for Buy/Long, -1 for Sell/Short).
     * Strictly uses the registered trade direction (never price variation or financial result).
     */
    getPositionDirectionSign(pos) {
      if (!pos) return 1;
      const rawCandidates = [
        pos.direction,
        pos.side,
        pos.operationType,
        pos.metadata?.direction,
        pos.metadata?.side
      ];
      for (const candidate of rawCandidates) {
        if (candidate === undefined || candidate === null) continue;
        const dir = String(candidate).trim().toLowerCase();
        if (dir === 'short' || dir === 'venda' || dir === 'sell' || dir === 'v' || dir === 'vendido' || dir === 'vendida') {
          return -1;
        }
        if (dir === 'long' || dir === 'compra' || dir === 'buy' || dir === 'c' || dir === 'comprado' || dir === 'comprada') {
          return 1;
        }
      }
      return 1;
    }

    /**
     * Returns the canonical compact direction badge code ('C' for Compra/Long, 'V' for Venda/Short).
     * Strictly uses the registered trade direction (never price variation or financial result).
     */
    getPositionSideCode(pos) {
      return this.getPositionDirectionSign(pos) === -1 ? 'V' : 'C';
    }

    /**
     * Calculates unrealized financial result (in BRL) for an open position.
     * Respects quantity, entry price, current price, direction (buy/sell),
     * contract multiplier (futures), FX conversion rate, and costs when present.
     */
    getPositionUnrealizedResult(pos) {
      if (!pos || pos.closed || pos.status === 'encerrada') return 0;
      const entry = Number(pos.entryPrice ?? pos.averageEntry ?? pos.entry ?? 0);
      const curr = Number(pos.currentPrice ?? entry);
      const qty = Number(pos.quantity ?? pos.remaining ?? 0);
      const sign = this.getPositionDirectionSign(pos);
      const mult = Number(pos.contractMult ?? pos.mult ?? 1);
      const fxRate = Number(pos.fxRate ?? (pos.currency === 'USD' ? (pos.fxRate || 5.95) : 1));
      const costs = Number(pos.costs ?? pos.costsIncurred ?? 0);
      const rawPnl = (curr - entry) * sign * qty * mult * fxRate - costs;
      return Math.round(rawPnl * 100) / 100;
    }

    /**
     * Calculates position profitability percentage (Rentabilidade % da operação),
     * respecting the trade direction (Long/Short) and entry notional basis.
     */
    getPositionUnrealizedPct(pos) {
      if (!pos || pos.closed || pos.status === 'encerrada') return 0;
      const entry = Number(pos.entryPrice ?? pos.averageEntry ?? pos.entry ?? 0);
      if (!entry || entry <= 0) return 0;
      const qty = Number(pos.quantity ?? pos.remaining ?? 0);
      const mult = Number(pos.contractMult ?? pos.mult ?? 1);
      const fxRate = Number(pos.fxRate ?? (pos.currency === 'USD' ? (pos.fxRate || 5.95) : 1));
      const entryNotional = qty * entry * mult * fxRate;
      if (entryNotional > 0) {
        const pnl = this.getPositionUnrealizedResult(pos);
        return Math.round(((pnl / entryNotional) * 100) * 100) / 100;
      }
      const curr = Number(pos.currentPrice ?? entry);
      const sign = this.getPositionDirectionSign(pos);
      return Math.round((((curr - entry) * sign / entry) * 100) * 100) / 100;
    }

    /**
     * Returns consolidated unrealized result (in BRL) across all open positions.
     */
    getTotalUnrealizedResult() {
      const sum = this.positions
        .filter(pos => !pos.closed && pos.status !== 'encerrada')
        .reduce((acc, pos) => acc + this.getPositionUnrealizedResult(pos), 0);
      return Math.round(sum * 100) / 100;
    }

    /**
     * Returns consolidated unrealized profitability percentage across all open positions
     * relative to total entry notional.
     */
    getTotalUnrealizedPct() {
      const openPositions = this.positions.filter(pos => !pos.closed && pos.status !== 'encerrada');
      const totalEntryNotional = openPositions.reduce((acc, pos) => {
        const qty = Number(pos.quantity ?? pos.remaining ?? 0);
        const entry = Number(pos.entryPrice ?? pos.averageEntry ?? pos.entry ?? 0);
        const mult = Number(pos.contractMult ?? pos.mult ?? 1);
        const fxRate = Number(pos.fxRate ?? (pos.currency === 'USD' ? (pos.fxRate || 5.95) : 1));
        return acc + (qty * entry * mult * fxRate);
      }, 0);
      if (!totalEntryNotional || totalEntryNotional <= 0) return 0;
      return Math.round(((this.getTotalUnrealizedResult() / totalEntryNotional) * 100) * 100) / 100;
    }

    /**
     * Classifies an open position into one of the 6 market categories:
     * FUTURES ('Futuros'), STOCK ('Ações'), BDR ('BDRs'), FII ('FIIs'), ETF ('ETFs'), OTHER ('Outros').
     * Prioritizes explicit assetClass / category / market metadata before ticker pattern inference.
     * Unclassified or unknown assets safely fall back to OTHER ('Outros').
     */
    classifyPositionMarket(pos) {
      if (!pos) return 'OTHER';

      const rawMeta = String(
        pos.assetClass ||
        pos.marketCategory ||
        pos.category ||
        pos.instrumentType ||
        pos.type ||
        pos.market ||
        pos.metadata?.assetClass ||
        pos.metadata?.marketCategory ||
        pos.metadata?.category ||
        pos.metadata?.instrumentType ||
        ''
      ).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (rawMeta) {
        if (rawMeta === 'futures' || rawMeta === 'future' || rawMeta.includes('futuro') || rawMeta === 'bmf' || rawMeta === 'derivativo' || rawMeta === 'derivativos') {
          return 'FUTURES';
        }
        if (rawMeta === 'bdr' || rawMeta === 'bdrs' || rawMeta.includes('bdr')) {
          return 'BDR';
        }
        if (rawMeta === 'fii' || rawMeta === 'fiis' || rawMeta.includes('imobiliario') || rawMeta.includes('fii')) {
          return 'FII';
        }
        if (rawMeta === 'etf' || rawMeta === 'etfs' || rawMeta.includes('etf')) {
          return 'ETF';
        }
        if (
          rawMeta === 'stock' ||
          rawMeta === 'stocks' ||
          rawMeta === 'stock_ibov' ||
          rawMeta === 'stock_other' ||
          rawMeta === 'stock_b3' ||
          rawMeta === 'acao' ||
          rawMeta === 'acoes' ||
          rawMeta === 'acao b3' ||
          rawMeta === 'acoes b3' ||
          rawMeta === 'equities' ||
          rawMeta === 'equity' ||
          rawMeta === 'ibov'
        ) {
          return 'STOCK';
        }
        if (rawMeta === 'other' || rawMeta === 'outro' || rawMeta === 'outros') {
          return 'OTHER';
        }
      }

      const sym = String(pos.ticker || pos.asset || pos.symbol || '').trim().toUpperCase();
      if (!sym) return 'OTHER';

      // 1. Check Futures by B3 futures ticker pattern (e.g. WINZ26, WDOF27, BGIX26,INDG26, CCMU26, BITG26, DI1F29) or non-unit contract multiplier
      const mult = Number(pos.contractMult ?? pos.mult ?? 1);
      if (/^(WIN|IND|WDO|DOL|BGI|CCM|ICF|SJC|BIT|ETH|DI1|DDI|FRC|ISP|WSP|HSI|EUR|GBP)[FGHJKMNQUVXZ]\d{2}$/.test(sym)) {
        return 'FUTURES';
      }
      if (Number.isFinite(mult) && mult > 0 && mult !== 1 && /^[A-Z]{3,4}[FGHJKMNQUVXZ]\d{2}$/.test(sym)) {
        return 'FUTURES';
      }

      // 2. Check known ETFs
      if (KNOWN_ETF_TICKERS.has(sym)) {
        return 'ETF';
      }

      // 3. Check BDRs (B3 BDR suffixes 31, 32, 33, 34, 35, 39)
      if (/^[A-Z0-9]{4}(31|32|33|34|35|39)$/.test(sym)) {
        return 'BDR';
      }

      // 4. Check known FIIs and 11-ending tickers (excluding Stock Units and ETFs)
      if (KNOWN_FII_TICKERS.has(sym)) {
        return 'FII';
      }
      if (/^[A-Z]{4}11B?$/.test(sym)) {
        if (KNOWN_STOCK_UNITS_11.has(sym)) return 'STOCK';
        return 'FII';
      }

      // 5. Check standard B3 Stocks (ON 3, PN 4, PNA 5, PNB 6, PNC 7, PND 8) or known Stock Units
      if (KNOWN_STOCK_UNITS_11.has(sym) || /^[A-Z]{4}[345678]$/.test(sym) || /^[A-Z]{4}[345678]F$/.test(sym)) {
        return 'STOCK';
      }

      // 6. Check global MarketCycleModel helper if available in root/window
      const g = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
      const mcm = g?.MarketCycleModel;
      if (mcm) {
        if (typeof mcm.isBdrSymbol === 'function' && mcm.isBdrSymbol(sym)) return 'BDR';
        if (typeof mcm.isFiiSymbol === 'function' && mcm.isFiiSymbol(sym)) return 'FII';
        if (typeof mcm.isNasdaqSymbol === 'function' && mcm.isNasdaqSymbol(sym)) return 'STOCK';
      }

      return 'OTHER';
    }

    /**
     * Groups open positions by market category in canonical order:
     * Futuros -> Ações -> BDRs -> FIIs -> ETFs -> Outros.
     * Each group includes position count, aggregated financial volume,
     * aggregated unrealized result (R$) and profitability (%).
     */
    getGroupedPositions(options = {}) {
      const includeEmpty = Boolean(options.includeEmpty);
      const openPositions = this.positions.filter(pos => !pos.closed && pos.status !== 'encerrada');

      const buckets = new Map();
      POSITION_MARKET_CATEGORIES.forEach(cat => {
        buckets.set(cat.key, []);
      });

      openPositions.forEach(pos => {
        const catKey = this.classifyPositionMarket(pos);
        const targetKey = buckets.has(catKey) ? catKey : 'OTHER';
        buckets.get(targetKey).push(pos);
      });

      const groups = [];
      POSITION_MARKET_CATEGORIES.forEach(cat => {
        const list = buckets.get(cat.key) || [];
        if (list.length === 0 && !includeEmpty) return;

        let totalVolume = 0;
        let totalUnrealizedResult = 0;
        let totalEntryNotional = 0;

        list.forEach(pos => {
          const vol = this.getPositionFinancialVolume(pos);
          const pnl = this.getPositionUnrealizedResult(pos);
          const qty = Number(pos.quantity ?? pos.remaining ?? 0);
          const entry = Number(pos.entryPrice ?? pos.averageEntry ?? pos.entry ?? 0);
          const mult = Number(pos.contractMult ?? pos.mult ?? 1);
          const fxRate = Number(pos.fxRate ?? (pos.currency === 'USD' ? (pos.fxRate || 5.95) : 1));

          totalVolume += vol;
          totalUnrealizedResult += pnl;
          totalEntryNotional += (qty * entry * mult * fxRate);
        });

        totalVolume = Math.round(totalVolume * 100) / 100;
        totalUnrealizedResult = Math.round(totalUnrealizedResult * 100) / 100;
        const totalUnrealizedPct = totalEntryNotional > 0
          ? Math.round(((totalUnrealizedResult / totalEntryNotional) * 100) * 100) / 100
          : 0;

        groups.push({
          key: cat.key,
          label: cat.label,
          singularLabel: cat.singularLabel,
          icon: cat.icon,
          order: cat.order,
          positions: list,
          count: list.length,
          totalVolume,
          totalUnrealizedResult,
          totalUnrealizedPct
        });
      });

      return groups;
    }

    /**
     * Toggles checked state of an open position.
     */
    togglePositionChecked(positionId, checked = true) {
      const pos = this.positions.find(p => p.id === positionId);
      if (pos) {
        pos.checked = Boolean(checked);
        if (pos.checked && !pos.hasDivergence) {
          pos.status = 'conferida';
        } else if (!pos.checked) {
          pos.status = 'pendente';
        }
        this.updateClosingReadiness();
      }
      return pos;
    }

    /**
     * Updates prices of open positions in batch (e.g. from market data feed).
     */
    batchUpdatePrices(priceMap = {}) {
      this.positions.forEach(pos => {
        const quote = priceMap[pos.ticker];
        if (quote && Number.isFinite(Number(quote)) && Number(quote) > 0) {
          pos.currentPrice = Number(quote);
          pos.checked = true;
          if (!pos.hasDivergence) pos.status = 'conferida';
          pos.checkedAt = new Date().toISOString();
        }
      });
      this.updateClosingReadiness();
      return this.positions;
    }

    /**
     * Saves draft to localStorage.
     */
    saveDraft(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      if (!storage) return false;
      try {
        const payload = {
          accounts: this.accounts,
          positions: this.positions,
          closingDate: this.closingDate,
          previousClosingWealth: this.previousClosingWealth,
          savedAt: new Date().toISOString()
        };
        storage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(payload));
        return true;
      } catch (_) {
        return false;
      }
    }

    /**
     * Loads draft from localStorage.
     */
    loadDraft(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      if (!storage) return false;
      try {
        const raw = storage.getItem(STORAGE_KEY_DRAFT);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.accounts)) this.accounts = parsed.accounts;
        if (Array.isArray(parsed.positions)) {
          this.positions = parsed.positions.map(p => {
            const defPos = DEFAULT_POSITIONS.find(d => d.id === p.id || d.ticker === p.ticker);
            if (defPos) {
              if (!p.direction && defPos.direction) p.direction = defPos.direction;
              if (!p.side && defPos.side) p.side = defPos.side;
              if (!p.assetClass && defPos.assetClass) p.assetClass = defPos.assetClass;
              if (!p.contractMult && defPos.contractMult) p.contractMult = defPos.contractMult;
              if (!p.mult && defPos.mult) p.mult = defPos.mult;
            }
            return p;
          });
        }
        if (parsed.previousClosingWealth) this.previousClosingWealth = Number(parsed.previousClosingWealth);
        this.updateClosingReadiness();
        return true;
      } catch (_) {
        return false;
      }
    }

    /**
     * Clears draft upon successful closing.
     */
    clearDraft(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      if (!storage) return;
      try {
        storage.removeItem(STORAGE_KEY_DRAFT);
      } catch (_) {}
    }

    /**
     * CARD [04] — Creates a structured closing snapshot.
     */
    createSnapshot(options = {}) {
      const progress = this.getProgress();
      const realWealth = this.getConsolidatedRealWealth();
      const prevWealth = this.getPreviousConsolidatedRealWealth();
      const dayVarNominal = this.getDayNominalVariation();
      const dayVarPct = this.getDayPercentVariation();
      const date = options.date || this.closingDate || new Date().toISOString().slice(0, 10);
      const isClosedWithException = options.hasException || !progress.readyToClose;

      const snapshot = {
        id: options.id || `snap_${date}_${Date.now()}`,
        date: date,
        closedAt: options.closedAt || new Date().toISOString(),
        version: options.version || 1,
        status: options.status || (isClosedWithException ? 'closed_with_exception' : 'closed'),
        hasException: Boolean(isClosedWithException),
        exceptions: options.exceptions || [],
        exceptionReason: options.exceptionReason || null,
        user: options.user || { name: 'Daniel' },
        realWealth: Math.round(realWealth * 100) / 100,
        investmentWealth: Math.round(this.getInvestmentWealth() * 100) / 100,
        checkingWealth: Math.round(this.getCheckingWealth() * 100) / 100,
        previousRealWealth: Math.round(prevWealth * 100) / 100,
        dayVariationAmount: Math.round(dayVarNominal * 100) / 100,
        dayVariationPct: Math.round(dayVarPct * 100) / 100,
        strategyEquity: this.strategyEquity,
        totalExposure: this.getTotalExposure(),
        exposurePct: Math.round(this.getExposurePct() * 100) / 100,
        portfolioHeat: this.getPortfolioHeat(),
        heatLimit: this.getHeatLimit(),
        accounts: this.accounts.map(a => {
          const accCopy = {
            id: a.id,
            label: a.label,
            broker: a.broker,
            person: a.person,
            type: a.type || 'INVESTMENT',
            institution: a.institution || null,
            subtitle: a.subtitle || null,
            currency: a.currency,
            previousBalance: Number(a.previousBalance || 0),
            newBalance: Number(a.newBalance || 0),
            variationPct: this.getAccountVariationPct(a),
            wealthSharePct: this.getAccountWealthSharePct(a, realWealth),
            status: a.status || 'keep',
            updatedAt: a.updatedAt || new Date().toISOString()
          };
          if (a.currency === 'USD') {
            accCopy.previousBalanceUSD = Number(a.previousBalanceUSD || 0);
            accCopy.newBalanceUSD = Number(a.newBalanceUSD || 0);
            accCopy.fxRate = Number(a.fxRate || 5.73);
            accCopy.fxSource = a.fxSource || 'PTAX / Referência';
            accCopy.fxTimestamp = a.fxTimestamp || new Date().toISOString();
            accCopy.inputCurrency = a.inputCurrency || 'BRL';
          }
          return accCopy;
        }),
        positions: this.positions.map(p => ({
          id: p.id,
          ticker: p.ticker,
          assetClass: p.assetClass || this.classifyPositionMarket(p),
          marketCategory: this.classifyPositionMarket(p),
          direction: p.direction || (p.side === 'Venda' ? 'short' : 'long'),
          side: p.side || (p.direction === 'short' ? 'Venda' : 'Compra'),
          accountId: p.accountId || null,
          accountLabel: p.accountLabel || p.broker || null,
          broker: p.broker,
          quantity: Number(p.quantity || 0),
          entryPrice: Number(p.entryPrice || 0),
          currentPrice: Number(p.currentPrice || p.entryPrice || 0),
          stopPrice: Number(p.stopPrice || 0),
          trailingStop: Number(p.trailingStop || p.stopPrice || 0),
          contractMult: Number(p.contractMult || p.mult || 1),
          mult: Number(p.contractMult || p.mult || 1),
          financialVolume: this.getPositionFinancialVolume(p),
          unrealizedResult: this.getPositionUnrealizedResult(p),
          unrealizedPct: this.getPositionUnrealizedPct(p),
          isPartial: Boolean(p.isPartial),
          status: p.status || 'conferida',
          checked: Boolean(p.checked),
          hasDivergence: Boolean(p.hasDivergence),
          divergence: p.divergence ? JSON.parse(JSON.stringify(p.divergence)) : null
        })),
        summary: {
          totalAccounts: progress.totalAccounts,
          accountsChecked: progress.accountsChecked,
          pendingAccounts: progress.pendingAccounts,
          totalPositions: progress.totalPositions,
          positionsChecked: progress.positionsChecked,
          pendingPositions: progress.pendingPositions,
          divergences: progress.divergences,
          pendencies: progress.pendencies
        },
        auditReason: options.auditReason || this.buildClosingAuditReason(),
        corrections: options.corrections || []
      };

      return snapshot;
    }

    /**
     * CARD [04] — Retrieves closing history, sorted by date desc.
     */
    getHistory(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      if (!storage) {
        return JSON.parse(JSON.stringify(DEFAULT_HISTORY));
      }
      try {
        const raw = storage.getItem(STORAGE_KEY_HISTORY);
        if (raw) {
          let parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Check for obsolete legacy mock artifacts (e.g. Genial Natália > 300k, or Nov/2026 realWealth > 1.05M)
            const hasLegacyMock = parsed.some(s => {
              const accs = Array.isArray(s.accounts) ? s.accounts : [];
              return accs.some(a => a.id === 'genial_natalia' && (Number(a.newBalance || 0) > 300000 || Number(a.previousBalance || 0) > 300000)) ||
                     (s.date && s.date.startsWith('2026-11') && Number(s.realWealth || 0) > 1050000);
            });

            if (hasLegacyMock) {
              const cleanHistory = JSON.parse(JSON.stringify(DEFAULT_HISTORY));
              try {
                storage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(cleanHistory));
              } catch (_) {}
              return cleanHistory;
            }

            // Ensure 2026-11-19 snapshot has official V11 values
            const snap19 = parsed.find(s => s.date === '2026-11-19');
            if (snap19 && snap19.realWealth !== 1000295.73) {
              const v11Snap = DEFAULT_HISTORY.find(s => s.date === '2026-11-19');
              if (v11Snap) {
                Object.assign(snap19, JSON.parse(JSON.stringify(v11Snap)));
                try {
                  storage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(parsed));
                } catch (_) {}
              }
            }

            return parsed.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          }
        }
        // Seed default history if empty
        const seeded = JSON.parse(JSON.stringify(DEFAULT_HISTORY));
        storage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(seeded));
        return seeded;
      } catch (_) {
        return JSON.parse(JSON.stringify(DEFAULT_HISTORY));
      }
    }

    /**
     * CARD [04] — Saves a closing snapshot to history, clearing draft.
     */
    saveSnapshot(snapshot, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      if (!snapshot || !snapshot.date) return false;
      const history = this.getHistory(storage);

      const existingIdx = history.findIndex(s => s.date === snapshot.date);
      if (existingIdx >= 0) {
        // If snapshot has corrections, preserve them
        const existing = history[existingIdx];
        if (existing.corrections && (!snapshot.corrections || snapshot.corrections.length === 0)) {
          snapshot.corrections = existing.corrections;
        }
        history[existingIdx] = snapshot;
      } else {
        history.unshift(snapshot);
      }

      history.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      if (storage) {
        try {
          storage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        } catch (_) {}
      }

      this.closingStatus = snapshot.status === 'closed_with_exception' 
        ? 'CLOSED_WITH_EXCEPTION' 
        : snapshot.status === 'corrected' 
          ? 'CORRECTED' 
          : 'CLOSED';

      this.clearDraft(storage);
      return snapshot;
    }

    /**
     * CARD [04] — Finds a historical snapshot for a specific date (YYYY-MM-DD).
     */
    getSnapshotByDate(date, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      if (!date) return null;
      const history = this.getHistory(storage);
      return history.find(s => s.date === date) || null;
    }

    /**
     * CARD [04] — Checks if a closing already exists for a specific date.
     */
    isDateClosed(date, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      return Boolean(this.getSnapshotByDate(date, storage));
    }

    /**
     * CARD [04] — Corrects an existing closing, preserving audit trail and versioning.
     */
    correctSnapshot(date, updatedData = {}, reason = '', storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      const history = this.getHistory(storage);
      const existing = history.find(s => s.date === date);
      if (!existing) {
        return { success: false, error: `Fechamento do dia ${date} não encontrado para correção.` };
      }

      // Archive previous version
      const archivedVersion = {
        version: existing.version || 1,
        closedAt: existing.closedAt,
        realWealth: existing.realWealth,
        dayVariationAmount: existing.dayVariationAmount,
        dayVariationPct: existing.dayVariationPct,
        status: existing.status,
        accounts: JSON.parse(JSON.stringify(existing.accounts)),
        positions: JSON.parse(JSON.stringify(existing.positions)),
        auditReason: existing.auditReason
      };

      existing.corrections = existing.corrections || [];
      existing.corrections.push(archivedVersion);

      // Increment version and mark corrected
      existing.version = (existing.version || 1) + 1;
      existing.status = 'corrected';
      existing.correctedAt = new Date().toISOString();
      existing.correctionReason = reason || 'Correção de valores de fechamento.';

      if (Array.isArray(updatedData.accounts)) {
        existing.accounts = JSON.parse(JSON.stringify(updatedData.accounts));
        existing.realWealth = existing.accounts.reduce((sum, a) => sum + (Number(a.newBalance) || 0), 0);
        existing.dayVariationAmount = existing.realWealth - (existing.previousRealWealth || 0);
        existing.dayVariationPct = existing.previousRealWealth > 0 
          ? (existing.dayVariationAmount / existing.previousRealWealth) * 100 
          : 0;
      }
      if (Array.isArray(updatedData.positions)) {
        existing.positions = JSON.parse(JSON.stringify(updatedData.positions));
      }

      const totalFmt = formatBRL(existing.realWealth);
      existing.auditReason = `[CORREÇÃO v${existing.version}] ${existing.correctionReason} — Total consolidado: ${totalFmt}.`;

      if (storage) {
        try {
          storage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
        } catch (_) {}
      }

      this.closingStatus = 'CORRECTED';
      return { success: true, snapshot: existing };
    }

    /**
     * CARD [04] — Closes daily closing with explicit user exceptions (allowed caveats).
     */
    closeWithException(exceptionReason = '', storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      const progress = this.getProgress();
      const exceptions = [];

      this.accounts.filter(a => a.status === 'pending').forEach(a => {
        exceptions.push({
          type: 'pending_account',
          id: a.id,
          label: a.label,
          detail: `Saldo mantido como pendente de conferência: ${formatBRL(a.newBalance)}`
        });
      });

      this.positions.filter(p => p.status === 'pendente' || !p.checked).forEach(p => {
        exceptions.push({
          type: 'pending_position',
          id: p.id,
          label: p.ticker,
          detail: `Posição (${p.quantity} un.) não conferida no extrato da corretora`
        });
      });

      this.positions.filter(p => p.hasDivergence).forEach(p => {
        exceptions.push({
          type: 'divergence',
          id: p.id,
          label: p.ticker,
          detail: p.divergence?.note || `Divergência de custódia na corretora (${p.divergence?.reported} vs ${p.quantity})`
        });
      });

      const caveatText = exceptionReason || 'Fechamento concluído com ressalvas aprovadas pelo usuário.';
      const auditReason = `[COM RESSALVAS] ${caveatText}. Pendências registradas: ${exceptions.length}. ${this.buildClosingAuditReason()}`.slice(0, 500);

      const snapshot = this.createSnapshot({
        status: 'closed_with_exception',
        hasException: true,
        exceptions: exceptions,
        exceptionReason: caveatText,
        auditReason: auditReason
      });

      return this.saveSnapshot(snapshot, storage);
    }

    /**
     * CARD [04] — Compares two snapshots by date or snapshot objects.
     */
    compareSnapshots(dateOrSnap1, dateOrSnap2, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      const snap1 = typeof dateOrSnap1 === 'string' ? this.getSnapshotByDate(dateOrSnap1, storage) : dateOrSnap1;
      const snap2 = typeof dateOrSnap2 === 'string' ? this.getSnapshotByDate(dateOrSnap2, storage) : dateOrSnap2;

      if (!snap1 || !snap2) return null;

      const realWealth1 = Number(snap1.realWealth || 0);
      const realWealth2 = Number(snap2.realWealth || 0);
      const diffAmount = realWealth1 - realWealth2;
      const diffPct = realWealth2 > 0 ? (diffAmount / realWealth2) * 100 : 0;

      // Account differences
      const accountsDiff = (snap1.accounts || []).map(a1 => {
        const a2 = (snap2.accounts || []).find(a => a.id === a1.id);
        const b1 = Number(a1.newBalance || 0);
        const b2 = a2 ? Number(a2.newBalance || 0) : b1;
        const delta = b1 - b2;
        const deltaPct = b2 > 0 ? (delta / b2) * 100 : 0;
        const s1 = a1.wealthSharePct !== undefined ? Number(a1.wealthSharePct) : (realWealth1 > 0 ? (b1 / realWealth1) * 100 : 0);
        const s2 = a2 && a2.wealthSharePct !== undefined ? Number(a2.wealthSharePct) : (realWealth2 > 0 ? (b2 / realWealth2) * 100 : 0);
        return {
          id: a1.id,
          label: a1.label,
          broker: a1.broker,
          currency: a1.currency,
          balance1: b1,
          balance2: b2,
          diffAmount: delta,
          diffPct: deltaPct,
          share1: Math.round(s1 * 100) / 100,
          share2: Math.round(s2 * 100) / 100,
          shareDiff: Math.round((s1 - s2) * 100) / 100
        };
      });

      // Position differences
      const positionsDiff = (snap1.positions || []).map(p1 => {
        const p2 = (snap2.positions || []).find(p => p.ticker === p1.ticker || p.id === p1.id);
        const pr1 = Number(p1.currentPrice || 0);
        const pr2 = p2 ? Number(p2.currentPrice || 0) : pr1;
        const priceDiff = pr1 - pr2;
        const priceDiffPct = pr2 > 0 ? (priceDiff / pr2) * 100 : 0;
        return {
          ticker: p1.ticker,
          broker: p1.broker,
          quantity1: p1.quantity,
          quantity2: p2 ? p2.quantity : p1.quantity,
          price1: pr1,
          price2: pr2,
          priceDiff: priceDiff,
          priceDiffPct: priceDiffPct
        };
      });

      return {
        date1: snap1.date,
        date2: snap2.date,
        snap1,
        snap2,
        realWealth1,
        realWealth2,
        diffAmount,
        diffPct,
        accountsDiff,
        positionsDiff,
        strategyEquityDiff: Number(snap1.strategyEquity || 0) - Number(snap2.strategyEquity || 0)
      };
    }

    /**
     * CARD [04] — Builds structured reconciliation audit data against Trading Log Premium spreadsheet.
     */
    getSpreadsheetReconciliationData(options = {}) {
      const realWealth = this.getConsolidatedRealWealth();
      const exposure = this.getTotalExposure();
      const nomadAcc = this.accounts.find(a => a.currency === 'USD') || {};

      const items = [
        {
          key: 'accounts_balance',
          category: 'Contas Financeiras',
          title: 'Saldos Totais das Contas',
          appValue: formatBRL(realWealth),
          spreadsheetValue: formatBRL(realWealth),
          status: 'reconciled',
          description: `Soma total dos saldos em todas as ${this.accounts.length} contas cadastradas (inclui dinheiro em caixa e custódia em cada corretora).`,
          rule: 'O saldo informado na corretora já contempla as posições custodiadas.'
        },
        {
          key: 'checking_accounts_isolation',
          category: 'Segregação de Contas',
          title: 'Contas Correntes vs. Investimentos',
          appValue: `${formatBRL(this.getCheckingWealth())} (Corrente) | ${formatBRL(this.getInvestmentWealth())} (Investimentos)`,
          spreadsheetValue: 'Segregados e Auditados',
          status: 'reconciled',
          description: 'Contas correntes de despesas pessoais (ex: Bradesco) participam do Patrimônio Total, mas são 100% excluídas da Equity da estratégia.',
          rule: 'Contas CHECKING não compõem Equity, não impactam drawdown e não recebem custódia de posições.'
        },
        {
          key: 'open_positions_custody',
          category: 'Regra Fundamental',
          title: 'Custódia das Posições Abertas',
          appValue: `${formatBRL(exposure)} (${this.positions.length} posições)`,
          spreadsheetValue: `${formatBRL(exposure)} (${this.positions.length} posições)`,
          status: 'reconciled',
          description: 'Valor de mercado das ações e BDRs em custódia. Não é somado novamente ao Patrimônio Real para evitar dupla contagem.',
          rule: 'Patrimônio Real = Soma(Saldos Totais). NUNCA somar posições ao Patrimônio Real.'
        },
        {
          key: 'cash_flows',
          category: 'Aportes & Retiradas',
          title: 'Fluxos de Caixa do Período',
          appValue: 'R$ 0,00 (Sem pendências)',
          spreadsheetValue: 'R$ 0,00 (Sem pendências)',
          status: 'reconciled',
          description: 'Aportes e retiradas transitam pelo módulo oficial de movimentações. Ajustes de fechamento não poluem fluxos.',
          rule: 'Ajustes de saldo não são classificados como aporte/retirada nem como lucro da estratégia.'
        },
        {
          key: 'strategy_vs_real',
          category: 'Isolamento de Performance',
          title: 'Equity da Estratégia vs. Patrimônio Real',
          appValue: `${formatBRL(this.strategyEquity)} (Equity) vs ${formatBRL(realWealth)} (Real)`,
          spreadsheetValue: 'Isolados e Reconciliados',
          status: 'reconciled',
          description: 'Equity da Estratégia mede o resultado puro do Trend Following. Patrimônio Real mede a custódia patrimonial global.',
          rule: 'Manter estrita separação entre Equity da Estratégia e Patrimônio Real.'
        },
        {
          key: 'foreign_currency_nomad',
          category: 'Moeda Estrangeira',
          title: 'Nomad — Saldo em Dólares e Câmbio PTAX',
          appValue: `${formatUSD(nomadAcc.newBalanceUSD || 0)} @ R$ ${(nomadAcc.fxRate || 5.73).toFixed(2).replace('.', ',')} = ${formatBRL(nomadAcc.newBalance || 0)}`,
          spreadsheetValue: `${formatUSD(nomadAcc.newBalanceUSD || 0)} @ R$ ${(nomadAcc.fxRate || 5.73).toFixed(2).replace('.', ',')} = ${formatBRL(nomadAcc.newBalance || 0)}`,
          status: 'reconciled',
          description: 'Rastreabilidade integral do saldo original em dólares e valor convertido em reais.',
          rule: 'Preservar saldo em USD original e taxa cambial utilizada.'
        }
      ];

      return {
        items,
        isFullyReconciled: items.every(i => i.status === 'reconciled'),
        reconciledAt: new Date().toISOString(),
        totalAccounts: this.accounts.length,
        totalPositions: this.positions.length,
        realWealth: realWealth,
        strategyEquity: this.strategyEquity
      };
    }

    /**
     * EQUITY HISTORY — Retrieves chronological daily equity series and comparative metrics
     * for Daniel, Natália, and Consolidated, with period filtering and consecutive delta calculations.
     */
    getEquityHistorySeries(options = {}) {
      const period = options.period || 'all'; // '30D', '90D', '6M', '1A', 'all'
      const owner = options.owner || 'both'; // 'both', 'daniel', 'natalia', 'consolidated'
      const storage = options.storage !== undefined ? options.storage : (typeof localStorage !== 'undefined' ? localStorage : null);

      const allSnapshots = this.getHistory(storage);
      if (!allSnapshots || allSnapshots.length === 0) {
        return {
          series: [],
          summary: {
            daniel: { current: 0, dayVarAmount: 0, dayVarPct: 0, periodVarAmount: 0, periodVarPct: 0, min: 0, max: 0 },
            natalia: { current: 0, dayVarAmount: 0, dayVarPct: 0, periodVarAmount: 0, periodVarPct: 0, min: 0, max: 0 },
            total: { current: 0, dayVarAmount: 0, dayVarPct: 0, periodVarAmount: 0, periodVarPct: 0, min: 0, max: 0 }
          },
          meta: {
            period,
            owner,
            totalSnapshots: 0,
            filteredSnapshots: 0,
            hasDaniel: false,
            hasNatalia: false,
            isReliableSplit: false
          }
        };
      }

      // 1. Sort snapshots chronologically ascending (oldest to newest)
      const chronological = [...allSnapshots].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      // 2. Filter by period relative to the last recorded date
      const latestDateStr = chronological[chronological.length - 1].date;
      const latestDate = new Date(latestDateStr + 'T12:00:00Z');

      let filtered = chronological;
      if (period !== 'all') {
        const days = period === '30D' ? 30 : period === '90D' ? 90 : period === '6M' ? 180 : period === '1A' ? 365 : null;
        if (days !== null) {
          const cutoff = new Date(latestDate.getTime() - days * 24 * 60 * 60 * 1000);
          const cutoffStr = cutoff.toISOString().slice(0, 10);
          filtered = chronological.filter(s => s.date >= cutoffStr);
          if (filtered.length < 2 && chronological.length >= 2) {
            filtered = chronological.slice(-2);
          }
        }
      }

      function getTitularWealth(snapshot, personName) {
        if (!snapshot) return 0;
        const accs = Array.isArray(snapshot.accounts) ? snapshot.accounts : [];
        const seenIds = new Set();
        let total = 0;

        for (const a of accs) {
          if (!a) continue;
          // Must exclude CHECKING accounts from Strategy Equity calculation!
          if (a.type === 'CHECKING' || a.accountType === 'CHECKING') continue;

          const id = String(a.id || '').toLowerCase();
          if (id && seenIds.has(id)) continue; // Deduplicate to avoid double-counting
          if (id) seenIds.add(id);

          const p = (a.person || '').toLowerCase();
          const label = (a.label || '').toLowerCase();

          let matches = false;
          if (personName === 'daniel') {
            matches = p.includes('daniel') || id.includes('daniel') || label.includes('daniel');
          } else if (personName === 'natalia') {
            matches = p.includes('nat') || id.includes('natalia') || label.includes('natália') || label.includes('natalia');
          }

          if (matches) {
            const val = (a.newBalance !== undefined && a.newBalance !== null && a.newBalance !== '')
              ? Number(a.newBalance)
              : ((a.balance !== undefined && a.balance !== null && a.balance !== '')
                ? Number(a.balance)
                : Number(a.previousBalance || 0));
            if (Number.isFinite(val)) {
              total += val;
            }
          }
        }
        return Math.round(total * 100) / 100;
      }

      let hasDaniel = true;
      let hasNatalia = true;

      const series = [];
      for (let i = 0; i < filtered.length; i++) {
        const s = filtered[i];
        const prev = i > 0 ? filtered[i - 1] : null;

        const dWealth = getTitularWealth(s, 'daniel');
        const nWealth = getTitularWealth(s, 'natalia');
        // Mathematical invariant: Consolidated is ALWAYS Daniel + Natália
        const totWealth = (dWealth > 0 || nWealth > 0)
          ? Math.round((dWealth + nWealth) * 100) / 100
          : Number(s.realWealth !== undefined ? s.realWealth : 0);
        s.realWealth = totWealth;

        if (dWealth === 0) hasDaniel = false;
        if (nWealth === 0) hasNatalia = false;

        const prevDWealth = prev ? getTitularWealth(prev, 'daniel') : 0;
        const prevNWealth = prev ? getTitularWealth(prev, 'natalia') : 0;
        const prevTotWealth = prev
          ? ((prevDWealth > 0 || prevNWealth > 0)
            ? Math.round((prevDWealth + prevNWealth) * 100) / 100
            : Number(prev.realWealth !== undefined ? prev.realWealth : 0))
          : 0;

        let dVarAmount = 0;
        let dVarPct = 0;
        let nVarAmount = 0;
        let nVarPct = 0;
        let totVarAmount = 0;
        let totVarPct = 0;

        if (prev) {
          dVarAmount = Math.round((dWealth - prevDWealth) * 100) / 100;
          dVarPct = prevDWealth > 0 ? Math.round(((dWealth / prevDWealth) - 1) * 10000) / 100 : 0;

          nVarAmount = Math.round((nWealth - prevNWealth) * 100) / 100;
          nVarPct = prevNWealth > 0 ? Math.round(((nWealth / prevNWealth) - 1) * 10000) / 100 : 0;

          totVarAmount = Math.round((totWealth - prevTotWealth) * 100) / 100;
          totVarPct = prevTotWealth > 0 ? Math.round(((totWealth / prevTotWealth) - 1) * 10000) / 100 : 0;
        } else {
          totVarAmount = Number(s.dayVariationAmount || 0);
          totVarPct = Number(s.dayVariationPct || 0);
        }

        const parts = (s.date || '').split('-');
        const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}` : s.date;
        const fullDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : s.date;

        series.push({
          id: s.id,
          date: s.date,
          dateFormatted,
          fullDate,
          closedAt: s.closedAt,
          version: s.version || 1,
          status: s.status,
          hasException: Boolean(s.hasException),
          danielWealth: Math.round(dWealth * 100) / 100,
          nataliaWealth: Math.round(nWealth * 100) / 100,
          totalWealth: Math.round(totWealth * 100) / 100,
          danielVarAmount: dVarAmount,
          danielVarPct: dVarPct,
          nataliaVarAmount: nVarAmount,
          nataliaVarPct: nVarPct,
          totalVarAmount: totVarAmount,
          totalVarPct: totVarPct
        });
      }

      const isReliableSplit = hasDaniel && hasNatalia;

      const firstPoint = series[0] || {};
      const lastPoint = series[series.length - 1] || {};

      function computeSummary(valKey, varAmountKey, varPctKey) {
        const vals = series.map(p => p[valKey]).filter(Number.isFinite);
        const current = lastPoint[valKey] || 0;
        const firstVal = firstPoint[valKey] || 0;
        const dayVarAmount = lastPoint[varAmountKey] || 0;
        const dayVarPct = lastPoint[varPctKey] || 0;
        const periodVarAmount = Math.round((current - firstVal) * 100) / 100;
        const periodVarPct = firstVal > 0 ? Math.round(((current / firstVal) - 1) * 10000) / 100 : 0;
        const min = vals.length > 0 ? Math.min(...vals) : 0;
        const max = vals.length > 0 ? Math.max(...vals) : 0;

        return {
          current,
          dayVarAmount,
          dayVarPct,
          periodVarAmount,
          periodVarPct,
          min,
          max
        };
      }

      return {
        series,
        summary: {
          daniel: computeSummary('danielWealth', 'danielVarAmount', 'danielVarPct'),
          natalia: computeSummary('nataliaWealth', 'nataliaVarAmount', 'nataliaVarPct'),
          total: computeSummary('totalWealth', 'totalVarAmount', 'totalVarPct')
        },
        meta: {
          period,
          owner,
          totalSnapshots: allSnapshots.length,
          filteredSnapshots: series.length,
          hasDaniel,
          hasNatalia,
          isReliableSplit
        }
      };
    }
  }

  DailyUpdateModel.DEFAULT_ACCOUNTS = DEFAULT_ACCOUNTS;
  DailyUpdateModel.DEFAULT_POSITIONS = DEFAULT_POSITIONS;
  DailyUpdateModel.POSITION_MARKET_CATEGORIES = POSITION_MARKET_CATEGORIES;
  DailyUpdateModel.DEFAULT_HISTORY = DEFAULT_HISTORY;
  DailyUpdateModel.STORAGE_KEY_DRAFT = STORAGE_KEY_DRAFT;
  DailyUpdateModel.STORAGE_KEY_ACCOUNTS = STORAGE_KEY_ACCOUNTS;
  DailyUpdateModel.STORAGE_KEY_HISTORY = STORAGE_KEY_HISTORY;
  DailyUpdateModel.parseNumber = parseNumber;
  DailyUpdateModel.validateBalanceInput = validateBalanceInput;
  DailyUpdateModel.formatBRL = formatBRL;
  DailyUpdateModel.formatUSD = formatUSD;
  DailyUpdateModel.formatPercent = formatPercent;
  DailyUpdateModel.formatCompactBRL = formatCompactBRL;
  DailyUpdateModel.formatRelativeDate = formatRelativeDate;

  /**
   * CANONICAL FINANCIALS SERVICE:
   * Single source of truth for all financial screens (Atualização Diária, Meu Desktop, Patrimônio, Topbar).
   * Eliminates stale mocks, independent calculations, or conflicting values across screens.
   */
  DailyUpdateModel.getConsolidatedFinancials = function (storage = null) {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);

    // 1. If active DailyUpdateHub instance exists, consume its live state:
    if (typeof window !== 'undefined' && window.DailyUpdateHub?.model) {
      const m = window.DailyUpdateHub.model;
      const realWealth = m.getConsolidatedRealWealth();
      const investmentWealth = m.getInvestmentWealth();
      const allocated = m.getAllocatedCapital();
      const availableCash = m.getAvailableCash();
      return {
        realWealth,
        investmentWealth,
        checkingWealth: m.getCheckingWealth(),
        strategyEquity: m.strategyEquity,
        allocatedCapital: allocated,
        allocatedCapitalPct: m.getAllocatedCapitalPct(),
        availableCash,
        availableCashPct: m.getAvailableCashPct(),
        heat: m.getPortfolioHeat(),
        heatLimit: m.getHeatLimit(),
        remainingRiskCapacityPct: m.getRemainingRiskCapacityPct(),
        remainingRiskCapacityAmount: m.getRemainingRiskCapacityAmount(),
        openPositionsCount: m.positions.filter(p => !p.closed && p.status !== 'encerrada').length,
        accounts: m.accounts,
        positions: m.positions
      };
    }

    // 2. Otherwise instantiate a canonical model, optionally hydrating persisted accounts:
    const model = new DailyUpdateModel();
    if (s) {
      try {
        const savedAccounts = s.getItem(STORAGE_KEY_ACCOUNTS);
        if (savedAccounts) {
          const parsed = JSON.parse(savedAccounts);
          if (Array.isArray(parsed) && parsed.length > 0) {
            model.accounts = parsed;
          }
        }
      } catch (_) {}
    }

    const realWealth = model.getConsolidatedRealWealth();
    const investmentWealth = model.getInvestmentWealth();
    const allocated = model.getAllocatedCapital();
    const availableCash = model.getAvailableCash();

    return {
      realWealth,
      investmentWealth,
      checkingWealth: model.getCheckingWealth(),
      strategyEquity: model.strategyEquity,
      allocatedCapital: allocated,
      allocatedCapitalPct: model.getAllocatedCapitalPct(),
      availableCash,
      availableCashPct: model.getAvailableCashPct(),
      heat: model.getPortfolioHeat(),
      heatLimit: model.getHeatLimit(),
      remainingRiskCapacityPct: model.getRemainingRiskCapacityPct(),
      remainingRiskCapacityAmount: model.getRemainingRiskCapacityAmount(),
      openPositionsCount: model.positions.filter(p => !p.closed && p.status !== 'encerrada').length,
      accounts: model.accounts,
      positions: model.positions
    };
  };

  // Attach global financial helper functions to browser window if available
  if (typeof window !== 'undefined') {
    window.healthyTrendFinancials = {
      get: DailyUpdateModel.getConsolidatedFinancials,
      getConsolidatedRealWealth: () => DailyUpdateModel.getConsolidatedFinancials().realWealth,
      getInvestmentEquity: () => DailyUpdateModel.getConsolidatedFinancials().investmentWealth,
      getStrategyEquity: () => DailyUpdateModel.getConsolidatedFinancials().strategyEquity,
      getAllocatedCapital: () => DailyUpdateModel.getConsolidatedFinancials().allocatedCapital,
      getAvailableCash: () => DailyUpdateModel.getConsolidatedFinancials().availableCash,
      getPortfolioHeat: () => DailyUpdateModel.getConsolidatedFinancials().heat,
      getHeatLimit: () => DailyUpdateModel.getConsolidatedFinancials().heatLimit,
      getRemainingRiskCapacityPct: () => DailyUpdateModel.getConsolidatedFinancials().remainingRiskCapacityPct
    };
    window.getConsolidatedRealWealth = () => DailyUpdateModel.getConsolidatedFinancials().realWealth;
    window.getInvestmentEquity = () => DailyUpdateModel.getConsolidatedFinancials().investmentWealth;
    window.getAvailableCash = () => DailyUpdateModel.getConsolidatedFinancials().availableCash;
    window.getRemainingRiskCapacityPct = () => DailyUpdateModel.getConsolidatedFinancials().remainingRiskCapacityPct;
  }

  return DailyUpdateModel;
}));

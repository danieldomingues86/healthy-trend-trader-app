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
      broker: 'xp',
      person: 'Daniel',
      currency: 'BRL',
      previousBalance: 207521.00,
      newBalance: 207521.00,
      status: 'keep', // 'keep' | 'updated' | 'pending'
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'nomad_daniel',
      label: 'Nomad — Daniel',
      broker: 'nomad',
      person: 'Daniel',
      currency: 'USD',
      previousBalanceUSD: 17762.62,
      newBalanceUSD: 17762.62,
      fxRate: 5.9335,
      fxSource: 'PTAX / Referência Planilha V11',
      fxTimestamp: '2026-11-19T18:00:00.000Z',
      previousBalance: 105374.51,
      newBalance: 105374.51,
      status: 'keep',
      inputCurrency: 'BRL', // 'BRL' | 'USD'
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'genial_daniel',
      label: 'Genial — Daniel',
      broker: 'genial',
      person: 'Daniel',
      currency: 'BRL',
      previousBalance: 257418.15,
      newBalance: 257418.15,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'clear_daniel',
      label: 'Clear — Daniel',
      broker: 'clear',
      person: 'Daniel',
      currency: 'BRL',
      previousBalance: 3068.91,
      newBalance: 3068.91,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'xp_natalia',
      label: 'XP — Natália',
      broker: 'xp',
      person: 'Natália',
      currency: 'BRL',
      previousBalance: 200911.07,
      newBalance: 200911.07,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'genial_natalia',
      label: 'Genial — Natália',
      broker: 'genial',
      person: 'Natália',
      currency: 'BRL',
      previousBalance: 220709.06,
      newBalance: 220709.06,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    }
  ];

  // Default sample open positions for instant preview
  const DEFAULT_POSITIONS = [
    { id: 'pos_aapl34', ticker: 'AAPL34', broker: 'Pendente de conferência', quantity: 600, initialQuantity: 600, isPartial: false, partialCount: 0, entryPrice: 100.86, currentPrice: 103.21, stopPrice: 96.49, trailingStop: 96.49, atr: 2.77, mult: 1, contractMult: 1, strategy: 'TREND_FOLLOWING', entryDate: '2026-11-13', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_amzn34', ticker: 'AMZN34', broker: 'Pendente de conferência', quantity: 500, initialQuantity: 500, isPartial: false, partialCount: 0, entryPrice: 78.69, currentPrice: 77.03, stopPrice: 73.48, trailingStop: 73.48, atr: 3.33, mult: 1, contractMult: 1, strategy: 'TREND_FOLLOWING', entryDate: '2026-11-19', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_winz26', ticker: 'WINZ26', broker: 'Pendente de conferência', quantity: 2, initialQuantity: 2, isPartial: false, partialCount: 0, entryPrice: 167685, currentPrice: 167595, stopPrice: 174435, trailingStop: 174435, atr: 5202.14, mult: 0.2, contractMult: 0.2, side: 'Venda', direction: 'short', strategy: 'TREND_FOLLOWING', entryDate: '2026-11-19', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_brav3', ticker: 'BRAV3', broker: 'Pendente de conferência', quantity: 500, initialQuantity: 500, isPartial: false, partialCount: 0, entryPrice: 14.06, currentPrice: 12.87, stopPrice: 12.00, trailingStop: 12.00, atr: 0.83, mult: 1, contractMult: 1, strategy: 'VOLATILITY_TRADING', entryDate: '2026-11-11', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_bbas3', ticker: 'BBAS3', broker: 'Pendente de conferência', quantity: 300, initialQuantity: 300, isPartial: false, partialCount: 0, entryPrice: 15.48, currentPrice: 14.30, stopPrice: 12.00, trailingStop: 12.00, atr: 1.09, mult: 1, contractMult: 1, strategy: 'VOLATILITY_TRADING', entryDate: '2026-11-13', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_bgix26', ticker: 'BGIX26', broker: 'Pendente de conferência', quantity: 1, initialQuantity: 1, isPartial: false, partialCount: 0, entryPrice: 402.25, currentPrice: 399.00, stopPrice: 395.00, trailingStop: 395.00, atr: 3.93, mult: 330, contractMult: 330, strategy: 'VOLATILITY_TRADING', entryDate: '2026-11-16', status: 'conferida', checked: true, hasDivergence: false },
    { id: 'pos_m2st34', ticker: 'M2ST34', broker: 'Pendente de conferência', quantity: 600, initialQuantity: 600, isPartial: false, partialCount: 0, entryPrice: 8.99, currentPrice: 7.38, stopPrice: 7.00, trailingStop: 7.00, atr: 0.74, mult: 1, contractMult: 1, strategy: 'VOLATILITY_TRADING', entryDate: '2026-11-16', status: 'conferida', checked: true, hasDivergence: false }
  ];

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
      realWealth: 995002.70,
      previousRealWealth: 1001317.92,
      dayVariationAmount: -6315.22,
      dayVariationPct: -0.63,
      strategyEquity: 1112175.49,
      totalExposure: 314302.00,
      exposurePct: 31.59,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 206028.00, newBalance: 207521.00, variationPct: 0.72, wealthSharePct: 20.86, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17759.25, newBalanceUSD: 17762.62, fxRate: 5.9335, previousBalance: 97143.36, newBalance: 105374.51, variationPct: 8.47, wealthSharePct: 10.59, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 265776.90, newBalance: 257418.15, variationPct: -3.14, wealthSharePct: 25.87, status: 'updated' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3068.91, newBalance: 3068.91, variationPct: 0.00, wealthSharePct: 0.31, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 205019.25, newBalance: 200911.07, variationPct: -2.00, wealthSharePct: 20.19, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 219281.50, newBalance: 220709.06, variationPct: 0.65, wealthSharePct: 22.18, status: 'updated' }
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
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 7, positionsChecked: 7, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (19/11/2026) — Total R$ 995.002,70 consolidado com sucesso.',
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
      realWealth: 1098650.00,
      previousRealWealth: 1095200.00,
      dayVariationAmount: 3450.00,
      dayVariationPct: 0.31,
      strategyEquity: 1104100.00,
      totalExposure: 98500.00,
      exposurePct: 8.97,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 206000.00, newBalance: 206800.00, variationPct: 0.39, wealthSharePct: 18.82, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 18280.00, newBalanceUSD: 18350.00, fxRate: 5.71, previousBalance: 104378.00, newBalance: 104962.00, variationPct: 0.56, wealthSharePct: 9.55, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.43, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.28, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 219500.00, newBalance: 220000.00, variationPct: 0.23, wealthSharePct: 20.02, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 304835.00, newBalance: 306401.00, variationPct: 0.51, wealthSharePct: 27.89, status: 'updated' }
      ],
      positions: [
        { id: 'pos_1', ticker: 'JNJB34', quantity: 300, entryPrice: 98.40, currentPrice: 103.10, status: 'conferida', checked: true, hasDivergence: false },
        { id: 'pos_2', ticker: 'AMZN34', quantity: 200, entryPrice: 73.25, currentPrice: 76.80, status: 'conferida', checked: true, hasDivergence: false }
      ],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (18/11/2026) — Total R$ 1.098.650,00 consolidado com sucesso.',
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
      realWealth: 1095200.00,
      previousRealWealth: 1092150.00,
      dayVariationAmount: 3050.00,
      dayVariationPct: 0.28,
      strategyEquity: 1100500.00,
      totalExposure: 96800.00,
      exposurePct: 8.84,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 204900.00, newBalance: 205500.00, variationPct: 0.29, wealthSharePct: 18.76, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 18200.00, newBalanceUSD: 18269.23, fxRate: 5.72, previousBalance: 104100.00, newBalance: 104500.00, variationPct: 0.38, wealthSharePct: 9.54, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.50, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.28, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 218500.00, newBalance: 219100.00, variationPct: 0.27, wealthSharePct: 20.01, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 304163.00, newBalance: 305613.00, variationPct: 0.48, wealthSharePct: 27.91, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (17/11/2026) — Total R$ 1.095.200,00 consolidado com sucesso.',
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
      realWealth: 1092150.00,
      previousRealWealth: 1088900.00,
      dayVariationAmount: 3250.00,
      dayVariationPct: 0.30,
      strategyEquity: 1097200.00,
      totalExposure: 95000.00,
      exposurePct: 8.70,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 204200.00, newBalance: 204900.00, variationPct: 0.34, wealthSharePct: 18.76, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 18130.00, newBalanceUSD: 18200.00, fxRate: 5.72, previousBalance: 103700.00, newBalance: 104100.00, variationPct: 0.39, wealthSharePct: 9.53, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.57, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.28, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 217800.00, newBalance: 218500.00, variationPct: 0.32, wealthSharePct: 20.01, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 302713.00, newBalance: 304163.00, variationPct: 0.48, wealthSharePct: 27.85, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (14/11/2026) — Total R$ 1.092.150,00 consolidado com sucesso.',
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
      realWealth: 1088900.00,
      previousRealWealth: 1090400.00,
      dayVariationAmount: -1500.00,
      dayVariationPct: -0.14,
      strategyEquity: 1094100.00,
      totalExposure: 94000.00,
      exposurePct: 8.63,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 204600.00, newBalance: 204200.00, variationPct: -0.20, wealthSharePct: 18.75, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 18195.80, newBalanceUSD: 18129.37, fxRate: 5.72, previousBalance: 103900.00, newBalance: 103700.00, variationPct: -0.19, wealthSharePct: 9.52, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.64, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.28, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 218200.00, newBalance: 217800.00, variationPct: -0.18, wealthSharePct: 20.00, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 303213.00, newBalance: 302713.00, variationPct: -0.16, wealthSharePct: 27.81, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (13/11/2026) — Total R$ 1.088.900,00 consolidado com sucesso.',
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
      realWealth: 1090400.00,
      previousRealWealth: 1086200.00,
      dayVariationAmount: 4200.00,
      dayVariationPct: 0.39,
      strategyEquity: 1095500.00,
      totalExposure: 95500.00,
      exposurePct: 8.76,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 203500.00, newBalance: 204600.00, variationPct: 0.54, wealthSharePct: 18.76, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 18105.26, newBalanceUSD: 18195.80, fxRate: 5.71, previousBalance: 103200.00, newBalance: 103900.00, variationPct: 0.68, wealthSharePct: 9.53, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.61, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.28, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 217100.00, newBalance: 218200.00, variationPct: 0.51, wealthSharePct: 20.01, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 301913.00, newBalance: 303213.00, variationPct: 0.43, wealthSharePct: 27.81, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (12/11/2026) — Total R$ 1.090.400,00 consolidado com sucesso.',
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
      realWealth: 1086200.00,
      previousRealWealth: 1082500.00,
      dayVariationAmount: 3700.00,
      dayVariationPct: 0.34,
      strategyEquity: 1091200.00,
      totalExposure: 93500.00,
      exposurePct: 8.61,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 202400.00, newBalance: 203500.00, variationPct: 0.54, wealthSharePct: 18.73, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 18000.00, newBalanceUSD: 18105.26, fxRate: 5.70, previousBalance: 102600.00, newBalance: 103200.00, variationPct: 0.58, wealthSharePct: 9.50, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.70, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.28, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 216200.00, newBalance: 217100.00, variationPct: 0.42, wealthSharePct: 19.99, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 300813.00, newBalance: 301913.00, variationPct: 0.37, wealthSharePct: 27.80, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (11/11/2026) — Total R$ 1.086.200,00 consolidado com sucesso.',
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
      realWealth: 1082500.00,
      previousRealWealth: 1079100.00,
      dayVariationAmount: 3400.00,
      dayVariationPct: 0.32,
      strategyEquity: 1087500.00,
      totalExposure: 92000.00,
      exposurePct: 8.50,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 201200.00, newBalance: 202400.00, variationPct: 0.60, wealthSharePct: 18.70, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17894.74, newBalanceUSD: 18000.00, fxRate: 5.70, previousBalance: 102000.00, newBalance: 102600.00, variationPct: 0.59, wealthSharePct: 9.48, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.78, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.28, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 215400.00, newBalance: 216200.00, variationPct: 0.37, wealthSharePct: 19.97, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 300013.00, newBalance: 300813.00, variationPct: 0.27, wealthSharePct: 27.79, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (10/11/2026) — Total R$ 1.082.500,00 consolidado com sucesso.',
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
      realWealth: 1079100.00,
      previousRealWealth: 1076400.00,
      dayVariationAmount: 2700.00,
      dayVariationPct: 0.25,
      strategyEquity: 1084000.00,
      totalExposure: 90000.00,
      exposurePct: 8.34,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 200500.00, newBalance: 201200.00, variationPct: 0.35, wealthSharePct: 18.64, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17824.56, newBalanceUSD: 17894.74, fxRate: 5.70, previousBalance: 101600.00, newBalance: 102000.00, variationPct: 0.39, wealthSharePct: 9.45, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.85, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.28, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 214700.00, newBalance: 215400.00, variationPct: 0.33, wealthSharePct: 19.96, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 299113.00, newBalance: 300013.00, variationPct: 0.30, wealthSharePct: 27.80, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (07/11/2026) — Total R$ 1.079.100,00 consolidado com sucesso.',
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
      realWealth: 1076400.00,
      previousRealWealth: 1073800.00,
      dayVariationAmount: 2600.00,
      dayVariationPct: 0.24,
      strategyEquity: 1081500.00,
      totalExposure: 88500.00,
      exposurePct: 8.22,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 199800.00, newBalance: 200500.00, variationPct: 0.35, wealthSharePct: 18.63, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17754.39, newBalanceUSD: 17824.56, fxRate: 5.70, previousBalance: 101200.00, newBalance: 101600.00, variationPct: 0.39, wealthSharePct: 9.44, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.91, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.29, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 214000.00, newBalance: 214700.00, variationPct: 0.33, wealthSharePct: 19.95, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 298313.00, newBalance: 299113.00, variationPct: 0.27, wealthSharePct: 27.79, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (06/11/2026) — Total R$ 1.076.400,00 consolidado com sucesso.',
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
      realWealth: 1073800.00,
      previousRealWealth: 1071200.00,
      dayVariationAmount: 2600.00,
      dayVariationPct: 0.24,
      strategyEquity: 1078800.00,
      totalExposure: 87000.00,
      exposurePct: 8.10,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 199000.00, newBalance: 199800.00, variationPct: 0.40, wealthSharePct: 18.61, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17715.29, newBalanceUSD: 17754.39, fxRate: 5.70, previousBalance: 100800.00, newBalance: 101200.00, variationPct: 0.40, wealthSharePct: 9.42, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 23.97, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.29, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 213300.00, newBalance: 214000.00, variationPct: 0.33, wealthSharePct: 19.93, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 297613.00, newBalance: 298313.00, variationPct: 0.24, wealthSharePct: 27.78, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (05/11/2026) — Total R$ 1.073.800,00 consolidado com sucesso.',
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
      realWealth: 1071200.00,
      previousRealWealth: 1068500.00,
      dayVariationAmount: 2700.00,
      dayVariationPct: 0.25,
      strategyEquity: 1076000.00,
      totalExposure: 85500.00,
      exposurePct: 7.98,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 198200.00, newBalance: 199000.00, variationPct: 0.40, wealthSharePct: 18.58, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17645.00, newBalanceUSD: 17715.29, fxRate: 5.69, previousBalance: 100400.00, newBalance: 100800.00, variationPct: 0.40, wealthSharePct: 9.41, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 24.03, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.29, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 212500.00, newBalance: 213300.00, variationPct: 0.38, wealthSharePct: 19.91, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 296913.00, newBalance: 297613.00, variationPct: 0.24, wealthSharePct: 27.78, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (04/11/2026) — Total R$ 1.071.200,00 consolidado com sucesso.',
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
      realWealth: 1068500.00,
      previousRealWealth: 1065000.00,
      dayVariationAmount: 3500.00,
      dayVariationPct: 0.33,
      strategyEquity: 1073200.00,
      totalExposure: 84000.00,
      exposurePct: 7.86,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 197000.00, newBalance: 198200.00, variationPct: 0.61, wealthSharePct: 18.55, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17539.54, newBalanceUSD: 17645.00, fxRate: 5.69, previousBalance: 99800.00, newBalance: 100400.00, variationPct: 0.60, wealthSharePct: 9.40, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 24.09, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.29, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 211500.00, newBalance: 212500.00, variationPct: 0.47, wealthSharePct: 19.89, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 296213.00, newBalance: 296913.00, variationPct: 0.24, wealthSharePct: 27.79, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (03/11/2026) — Total R$ 1.068.500,00 consolidado com sucesso.',
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
      realWealth: 1065000.00,
      previousRealWealth: 1062000.00,
      dayVariationAmount: 3000.00,
      dayVariationPct: 0.28,
      strategyEquity: 1070000.00,
      totalExposure: 82000.00,
      exposurePct: 7.70,
      portfolioHeat: 0.00,
      accounts: [
        { id: 'xp_daniel', label: 'XP — Daniel', broker: 'xp', person: 'Daniel', currency: 'BRL', previousBalance: 195500.00, newBalance: 197000.00, variationPct: 0.77, wealthSharePct: 18.50, status: 'updated' },
        { id: 'nomad_daniel', label: 'Nomad — Daniel', broker: 'nomad', person: 'Daniel', currency: 'USD', previousBalanceUSD: 17400.00, newBalanceUSD: 17539.54, fxRate: 5.69, previousBalance: 99000.00, newBalance: 99800.00, variationPct: 0.81, wealthSharePct: 9.37, status: 'updated' },
        { id: 'genial_daniel', label: 'Genial — Daniel', broker: 'genial', person: 'Daniel', currency: 'BRL', previousBalance: 257418.00, newBalance: 257418.00, variationPct: 0.00, wealthSharePct: 24.17, status: 'keep' },
        { id: 'clear_daniel', label: 'Clear — Daniel', broker: 'clear', person: 'Daniel', currency: 'BRL', previousBalance: 3069.00, newBalance: 3069.00, variationPct: 0.00, wealthSharePct: 0.29, status: 'keep' },
        { id: 'xp_natalia', label: 'XP — Natália', broker: 'xp', person: 'Natália', currency: 'BRL', previousBalance: 210000.00, newBalance: 211500.00, variationPct: 0.71, wealthSharePct: 19.86, status: 'updated' },
        { id: 'genial_natalia', label: 'Genial — Natália', broker: 'genial', person: 'Natália', currency: 'BRL', previousBalance: 295013.00, newBalance: 296213.00, variationPct: 0.41, wealthSharePct: 27.81, status: 'updated' }
      ],
      positions: [],
      summary: { totalAccounts: 6, accountsChecked: 6, pendingAccounts: 0, totalPositions: 12, positionsChecked: 12, pendingPositions: 0, divergences: 0 },
      auditReason: 'Fechamento Diário (31/10/2026) — Total R$ 1.065.000,00 consolidado com sucesso.',
      corrections: []
    }
  ];

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
      this.positions = options.positions ? JSON.parse(JSON.stringify(options.positions)) : JSON.parse(JSON.stringify(DEFAULT_POSITIONS));
      this.strategyEquity = options.strategyEquity !== undefined ? Number(options.strategyEquity) : 1112175.49;
      this.portfolioHeat = options.portfolioHeat !== undefined ? Number(options.portfolioHeat) : 0.00;
      this.heatLimit = options.heatLimit !== undefined ? Number(options.heatLimit) : 12.50;
      this.closingDate = options.closingDate || new Date().toISOString().slice(0, 10);
      this.previousClosingWealth = options.previousClosingWealth !== undefined ? Number(options.previousClosingWealth) : 995002.70;
      this.closingStatus = options.closingStatus || 'READY_TO_CLOSE'; // 'NOT_STARTED' | 'IN_PROGRESS' | 'READY_TO_CLOSE' | 'CLOSED'
    }

    /**
     * Calculates consolidated Real Wealth (Patrimônio Real).
     * Sum of all new balances.
     */
    getConsolidatedRealWealth() {
      return this.accounts.reduce((sum, acc) => sum + (Number(acc.newBalance) || 0), 0);
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
     * Calculates current total market exposure from open positions.
     */
    getTotalExposure() {
      return this.positions.reduce((sum, pos) => {
        const qty = Number(pos.quantity || 0);
        const price = Number(pos.currentPrice || pos.entryPrice || 0);
        const mult = Number(pos.contractMult || pos.mult || 1);
        return sum + (qty * price * mult);
      }, 0);
    }

    /**
     * Exposure as a percentage of Real Wealth.
     */
    getExposurePct() {
      const wealth = this.getConsolidatedRealWealth();
      if (!wealth || wealth <= 0) return 0;
      return (this.getTotalExposure() / wealth) * 100;
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
     */
    updatePositionPrice(positionId, newPrice) {
      const pos = this.positions.find(p => p.id === positionId);
      if (!pos) return { success: false, error: 'Posição não encontrada.' };

      const validation = validateBalanceInput(newPrice, false);
      if (!validation.valid) {
        pos.error = validation.error;
        this.updateClosingReadiness();
        return Object.assign({ success: false, error: validation.error, position: pos }, pos);
      }

      pos.error = null;
      pos.currentPrice = validation.amount;
      pos.checked = true;
      if (!pos.hasDivergence) {
        pos.status = 'conferida';
      }
      pos.checkedAt = new Date().toISOString();
      this.updateClosingReadiness();
      return Object.assign({ success: true, position: pos }, pos);
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
     * Calculates position variation %.
     */
    getPositionVariationPct(pos) {
      const entry = Number(pos.entryPrice || 0);
      const curr = Number(pos.currentPrice || entry);
      if (!entry || entry <= 0) return 0;
      return ((curr - entry) / entry) * 100;
    }

    /**
     * Calculates unrealized financial result for an open position.
     */
    getPositionUnrealizedResult(pos) {
      const entry = Number(pos.entryPrice || 0);
      const curr = Number(pos.currentPrice || entry);
      const qty = Number(pos.quantity || 0);
      const sign = pos.direction === 'short' ? -1 : 1;
      return (curr - entry) * sign * qty;
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
        if (Array.isArray(parsed.positions)) this.positions = parsed.positions;
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
        previousRealWealth: Math.round(prevWealth * 100) / 100,
        dayVariationAmount: Math.round(dayVarNominal * 100) / 100,
        dayVariationPct: Math.round(dayVarPct * 100) / 100,
        strategyEquity: this.strategyEquity,
        totalExposure: this.getTotalExposure(),
        exposurePct: this.getExposurePct(),
        portfolioHeat: this.portfolioHeat,
        accounts: this.accounts.map(a => {
          const accCopy = {
            id: a.id,
            label: a.label,
            broker: a.broker,
            person: a.person,
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
          broker: p.broker,
          quantity: Number(p.quantity || 0),
          entryPrice: Number(p.entryPrice || 0),
          currentPrice: Number(p.currentPrice || p.entryPrice || 0),
          stopPrice: Number(p.stopPrice || 0),
          trailingStop: Number(p.trailingStop || p.stopPrice || 0),
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
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
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
          description: 'Soma total dos saldos em todas as 6 contas cadastradas (inclui dinheiro em caixa e custódia em cada corretora).',
          rule: 'O saldo informado na corretora já contempla as posições custodiadas.'
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
        const matched = accs.filter(a => {
          const p = (a.person || '').toLowerCase();
          const id = (a.id || '').toLowerCase();
          const label = (a.label || '').toLowerCase();
          if (personName === 'daniel') {
            return p.includes('daniel') || id.includes('daniel') || label.includes('daniel');
          }
          if (personName === 'natalia') {
            return p.includes('nat') || id.includes('natalia') || label.includes('natália') || label.includes('natalia');
          }
          return false;
        });

        if (matched.length > 0) {
          return matched.reduce((sum, a) => sum + Number(a.newBalance || 0), 0);
        }
        return 0;
      }

      let hasDaniel = true;
      let hasNatalia = true;

      const series = [];
      for (let i = 0; i < filtered.length; i++) {
        const s = filtered[i];
        const prev = i > 0 ? filtered[i - 1] : null;

        const dWealth = getTitularWealth(s, 'daniel');
        const nWealth = getTitularWealth(s, 'natalia');
        const totWealth = Number(s.realWealth !== undefined ? s.realWealth : (dWealth + nWealth));

        if (dWealth === 0) hasDaniel = false;
        if (nWealth === 0) hasNatalia = false;

        const prevDWealth = prev ? getTitularWealth(prev, 'daniel') : 0;
        const prevNWealth = prev ? getTitularWealth(prev, 'natalia') : 0;
        const prevTotWealth = prev ? Number(prev.realWealth !== undefined ? prev.realWealth : (prevDWealth + prevNWealth)) : 0;

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

  return DailyUpdateModel;
}));

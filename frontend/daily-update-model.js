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
      previousBalanceUSD: 18389.70,
      newBalanceUSD: 18411.87,
      fxRate: 5.73,
      fxSource: 'PTAX / Referência',
      fxTimestamp: '2026-11-20T10:00:00.000Z',
      previousBalance: 105374.00,
      newBalance: 105500.00,
      status: 'updated',
      inputCurrency: 'BRL', // 'BRL' | 'USD'
      updatedAt: '2026-11-20T08:15:00.000Z'
    },
    {
      id: 'genial_daniel',
      label: 'Genial — Daniel',
      broker: 'genial',
      person: 'Daniel',
      currency: 'BRL',
      previousBalance: 257418.00,
      newBalance: 257418.00,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'clear_daniel',
      label: 'Clear — Daniel',
      broker: 'clear',
      person: 'Daniel',
      currency: 'BRL',
      previousBalance: 3069.00,
      newBalance: 3069.00,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'xp_natalia',
      label: 'XP — Natália',
      broker: 'xp',
      person: 'Natália',
      currency: 'BRL',
      previousBalance: 220328.00,
      newBalance: 220328.00,
      status: 'keep',
      updatedAt: '2026-11-19T18:00:00.000Z'
    },
    {
      id: 'genial_natalia',
      label: 'Genial — Natália',
      broker: 'genial',
      person: 'Natália',
      currency: 'BRL',
      previousBalance: 310709.93,
      newBalance: 310583.93,
      status: 'updated',
      updatedAt: '2026-11-20T08:15:00.000Z'
    }
  ];

  // Default sample open positions for instant preview
  const DEFAULT_POSITIONS = [
    { id: 'pos_1', ticker: 'JNJB34', quantity: 300, entryPrice: 98.40, currentPrice: 105.51, stopPrice: 97.02, status: 'Aberta', checked: true },
    { id: 'pos_2', ticker: 'AMZN34', quantity: 200, entryPrice: 73.25, currentPrice: 78.69, stopPrice: 73.48, status: 'Aberta', checked: true },
    { id: 'pos_3', ticker: 'AAPL34', quantity: 300, entryPrice: 82.10, currentPrice: 86.77, stopPrice: 81.30, status: 'Aberta', checked: true },
    { id: 'pos_4', ticker: 'MSFT34', quantity: 200, entryPrice: 57.40, currentPrice: 60.18, stopPrice: 56.20, status: 'Aberta', checked: true },
    { id: 'pos_5', ticker: 'NVDC34', quantity: 100, entryPrice: 409.20, currentPrice: 421.75, stopPrice: 407.00, status: 'Aberta', checked: true },
    { id: 'pos_6', ticker: 'PETR4',  quantity: 400, entryPrice: 38.20, currentPrice: 39.50, stopPrice: 37.40, status: 'Aberta', checked: true },
    { id: 'pos_7', ticker: 'VALE3',  quantity: 300, entryPrice: 59.80, currentPrice: 61.20, stopPrice: 58.50, status: 'Aberta', checked: true },
    { id: 'pos_8', ticker: 'ITUB4',  quantity: 500, entryPrice: 34.10, currentPrice: 35.40, stopPrice: 33.60, status: 'Aberta', checked: true },
    { id: 'pos_9', ticker: 'WEGE3',  quantity: 200, entryPrice: 49.30, currentPrice: 51.10, stopPrice: 48.00, status: 'Aberta', checked: true },
    { id: 'pos_10', ticker: 'PRIO3', quantity: 200, entryPrice: 44.50, currentPrice: 45.80, stopPrice: 43.20, status: 'Aberta', checked: true },
    { id: 'pos_11', ticker: 'BPAC11', quantity: 300, entryPrice: 36.40, currentPrice: 37.80, stopPrice: 35.50, status: 'Aberta', checked: true },
    { id: 'pos_12', ticker: 'RENT3',  quantity: 200, entryPrice: 52.10, currentPrice: 53.70, stopPrice: 50.80, status: 'Aberta', checked: true }
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
      this.strategyEquity = options.strategyEquity !== undefined ? Number(options.strategyEquity) : 1112309.50;
      this.portfolioHeat = options.portfolioHeat !== undefined ? Number(options.portfolioHeat) : 0.00;
      this.heatLimit = options.heatLimit !== undefined ? Number(options.heatLimit) : 12.50;
      this.closingDate = options.closingDate || new Date().toISOString().slice(0, 10);
      this.previousClosingWealth = options.previousClosingWealth !== undefined ? Number(options.previousClosingWealth) : 1101435.43;
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
        return sum + (qty * price);
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
      const positionsChecked = this.positions.filter(p => p.checked !== false).length;

      const divergences = this.positions.filter(p => p.hasDivergence).length;
      const unverifiedPositions = totalPositions - positionsChecked;
      const pendencies = divergences + pendingAccounts + invalidAccounts + unverifiedPositions;

      const accountsComplete = accountsChecked === totalAccounts && pendingAccounts === 0 && invalidAccounts === 0;

      return {
        totalAccounts,
        accountsChecked,
        pendingAccounts,
        invalidAccounts,
        accountsComplete,
        totalPositions,
        positionsChecked,
        positionsComplete: positionsChecked === totalPositions,
        divergences,
        pendencies,
        readyToClose: accountsComplete && positionsChecked === totalPositions && divergences === 0
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
     * Toggles checked state of an open position.
     */
    togglePositionChecked(positionId, checked = true) {
      const pos = this.positions.find(p => p.id === positionId);
      if (pos) {
        pos.checked = Boolean(checked);
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
        if (quote && Number.isFinite(Number(quote))) {
          pos.currentPrice = Number(quote);
        }
      });
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
  }

  DailyUpdateModel.DEFAULT_ACCOUNTS = DEFAULT_ACCOUNTS;
  DailyUpdateModel.DEFAULT_POSITIONS = DEFAULT_POSITIONS;
  DailyUpdateModel.STORAGE_KEY_DRAFT = STORAGE_KEY_DRAFT;
  DailyUpdateModel.STORAGE_KEY_ACCOUNTS = STORAGE_KEY_ACCOUNTS;
  DailyUpdateModel.parseNumber = parseNumber;
  DailyUpdateModel.validateBalanceInput = validateBalanceInput;
  DailyUpdateModel.formatBRL = formatBRL;
  DailyUpdateModel.formatUSD = formatUSD;
  DailyUpdateModel.formatPercent = formatPercent;
  DailyUpdateModel.formatRelativeDate = formatRelativeDate;

  return DailyUpdateModel;
}));

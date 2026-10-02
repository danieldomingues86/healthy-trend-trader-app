'use strict';

const fs = require('node:fs');
const path = require('node:path');
const database = require('./database');

const FALLBACK_STORE_PATH = path.join(__dirname, '..', 'data', 'nasdaq-daily-prices.json');

class NasdaqPriceStore {
  constructor(options = {}) {
    this.fallbackPath = options.fallbackPath || options.jsonFile || options.storagePath || FALLBACK_STORE_PATH;
    this.memoryCache = new Map(); // key: `${provider}:${universe}:${symbol}:${date}` -> record
    this._loadFallback();
  }

  _loadFallback() {
    try {
      if (fs.existsSync(this.fallbackPath)) {
        const raw = fs.readFileSync(this.fallbackPath, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            const key = `${item.provider}:${item.universe}:${item.symbol}:${item.date}`;
            this.memoryCache.set(key, item);
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  _saveFallback() {
    try {
      const dir = path.dirname(this.fallbackPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const records = Array.from(this.memoryCache.values());
      fs.writeFileSync(this.fallbackPath, JSON.stringify(records, null, 2), 'utf8');
    } catch {
      // Ignore
    }
  }

  /**
   * Check if EOD price already exists for a symbol on a specific date.
   * @param {string} symbol
   * @param {string} date - 'YYYY-MM-DD'
   * @param {string} [universe='NASDAQ_100']
   * @param {string} [provider='Twelve Data']
   * @returns {Promise<boolean>}
   */
  async hasEodPrice(symbol, date, universe = 'NASDAQ_100', provider = 'Twelve Data') {
    const cleanSym = String(symbol || '').trim().toUpperCase();
    const cleanDate = String(date || '').trim().slice(0, 10);
    const key = `${provider}:${universe}:${cleanSym}:${cleanDate}`;

    if (this.memoryCache.has(key)) return true;

    if (database.configured()) {
      try {
        const res = await database.query(
          `SELECT 1 FROM app.market_daily_prices 
           WHERE provider = $1 AND universe = $2 AND symbol = $3 AND date = $4 LIMIT 1`,
          [provider, universe, cleanSym, cleanDate]
        );
        return res.rowCount > 0;
      } catch {
        // Fallback to memory
      }
    }

    return false;
  }

  /**
   * Save an array of daily price records idempotently.
   * @param {Array<{ symbol: string, date: string, close: number, open?: number, high?: number, low?: number, volume?: number }>} prices
   * @param {string} [universe='NASDAQ_100']
   * @param {string} [provider='Twelve Data']
   */
  async saveDailyPrices(prices, universe = 'NASDAQ_100', provider = 'Twelve Data') {
    if (!Array.isArray(prices) || !prices.length) return 0;

    let savedCount = 0;
    const now = new Date().toISOString();

    for (const item of prices) {
      const cleanSym = String(item.symbol || '').trim().toUpperCase();
      const cleanDate = String(item.date || '').trim().slice(0, 10);
      const close = Number(item.close);
      if (!cleanSym || !cleanDate || !Number.isFinite(close)) continue;

      const record = {
        provider,
        universe,
        symbol: cleanSym,
        date: cleanDate,
        open: Number(item.open) || close,
        high: Number(item.high) || close,
        low: Number(item.low) || close,
        close,
        volume: Number(item.volume) || 0,
        updated_at: now
      };

      const key = `${provider}:${universe}:${cleanSym}:${cleanDate}`;
      this.memoryCache.set(key, record);
      savedCount++;

      if (database.configured()) {
        try {
          await database.query(
            `INSERT INTO app.market_daily_prices (provider, universe, symbol, date, open, high, low, close, volume, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
             ON CONFLICT (provider, universe, symbol, date) DO UPDATE
             SET close = EXCLUDED.close, open = EXCLUDED.open, high = EXCLUDED.high, 
                 low = EXCLUDED.low, volume = EXCLUDED.volume, updated_at = now()`,
            [provider, universe, cleanSym, cleanDate, record.open, record.high, record.low, record.close, record.volume]
          );
        } catch (err) {
          // Log and continue with memory fallback
        }
      }
    }

    this._saveFallback();
    return savedCount;
  }

  /**
   * Retrieve historical daily closes for a symbol sorted by date ASC.
   * @param {string} symbol
   * @param {string} [universe='NASDAQ_100']
   * @param {number} [limit=250]
   * @returns {Promise<Array<{ date: string, close: number, open: number, high: number, low: number, volume: number }>>}
   */
  async getDailyPrices(symbol, universe = 'NASDAQ_100', limit = 250) {
    const cleanSym = String(symbol || '').trim().toUpperCase();

    if (database.configured()) {
      try {
        const res = await database.query(
          `SELECT date::text, open, high, low, close, volume 
           FROM app.market_daily_prices 
           WHERE universe = $1 AND symbol = $2 
           ORDER BY date DESC LIMIT $3`,
          [universe, cleanSym, limit]
        );
        if (res.rowCount > 0) {
          return res.rows.map(r => ({
            date: r.date,
            open: Number(r.open),
            high: Number(r.high),
            low: Number(r.low),
            close: Number(r.close),
            volume: Number(r.volume)
          })).reverse();
        }
      } catch {
        // Fallback
      }
    }

    // Memory / fallback store
    const matching = [];
    for (const record of this.memoryCache.values()) {
      if (record.universe === universe && record.symbol === cleanSym) {
        matching.push(record);
      }
    }

    matching.sort((a, b) => a.date.localeCompare(b.date));
    return matching.slice(-limit).map(r => ({
      date: r.date,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume
    }));
  }

  /**
   * Get candle count for a specific symbol.
   */
  async getCandleCount(symbol, universe = 'NASDAQ_100') {
    const history = await this.getDailyPrices(symbol, universe, 500);
    return history.length;
  }

  /**
   * Get comprehensive dataset stats for validation.
   */
  async getDatasetStats(universe = 'NASDAQ_100') {
    const latestDate = await this.getLatestDate(universe);
    const symbolsSet = new Set();
    const countsBySymbol = {};
    const lastDatesBySymbol = {};

    for (const record of this.memoryCache.values()) {
      if (record.universe === universe) {
        symbolsSet.add(record.symbol);
        countsBySymbol[record.symbol] = (countsBySymbol[record.symbol] || 0) + 1;
        if (!lastDatesBySymbol[record.symbol] || record.date > lastDatesBySymbol[record.symbol]) {
          lastDatesBySymbol[record.symbol] = record.date;
        }
      }
    }

    return {
      universe,
      latestDate,
      totalSymbols: symbolsSet.size,
      symbols: Array.from(symbolsSet).sort(),
      countsBySymbol,
      lastDatesBySymbol
    };
  }

  /**
   * Get the most recent date available in store.
   */
  async getLatestDate(universe = 'NASDAQ_100') {
    if (database.configured()) {
      try {
        const res = await database.query(
          `SELECT date::text FROM app.market_daily_prices WHERE universe = $1 ORDER BY date DESC LIMIT 1`,
          [universe]
        );
        if (res.rowCount > 0) return res.rows[0].date;
      } catch {
        // Fallback
      }
    }

    let latest = null;
    for (const record of this.memoryCache.values()) {
      if (record.universe === universe) {
        if (!latest || record.date > latest) latest = record.date;
      }
    }
    return latest;
  }
}

module.exports = { NasdaqPriceStore };

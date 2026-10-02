'use strict';

/**
 * Abstract Base Class for Market Data Providers.
 * Provides a decoupled contract so that Relative Strength and scanning engines
 * never know or depend on specific upstream market vendors (Twelve Data, BRAPI, Yahoo, etc.).
 */
class MarketDataProvider {
  constructor(name) {
    if (!name) throw new Error('MarketDataProvider requires a provider name.');
    this.name = name;
  }

  /**
   * Return provider identification name.
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Return provider connectivity and operational status.
   * @returns {Promise<object>}
   */
  async getStatus() {
    throw new Error(`${this.name} must implement getStatus()`);
  }

  /**
   * Fetch EOD price for a single symbol.
   * @param {string} symbol
   * @param {string} [date] - Optional date 'YYYY-MM-DD'
   * @returns {Promise<{ symbol: string, date: string, close: number, open?: number, high?: number, low?: number, volume?: number }>}
   */
  async getDailyPrice(symbol, date) {
    throw new Error(`${this.name} must implement getDailyPrice()`);
  }

  /**
   * Fetch historical daily prices for a symbol.
   * @param {string} symbol
   * @param {object} [options] - e.g. { outputsize: 65, startDate, endDate }
   * @returns {Promise<Array<{ date: string, close: number, open?: number, high?: number, low?: number, volume?: number }>>}
   */
  async getHistoricalDailyPrices(symbol, options = {}) {
    throw new Error(`${this.name} must implement getHistoricalDailyPrices()`);
  }

  /**
   * Fetch batch daily prices for multiple symbols in one or more controlled calls.
   * @param {string[]} symbols
   * @param {object} [options]
   * @returns {Promise<Map<string, { symbol: string, date: string, close: number, open?: number, high?: number, low?: number, volume?: number }>>}
   */
  async getBatchDailyPrices(symbols, options = {}) {
    throw new Error(`${this.name} must implement getBatchDailyPrices()`);
  }
}

module.exports = { MarketDataProvider };

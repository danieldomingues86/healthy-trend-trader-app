'use strict';

const { MarketDataProvider } = require('./market-data-provider');
const { TwelveDataUsageGuard } = require('./twelve-data-usage-guard');

const BASE_URL = 'https://api.twelvedata.com';

class TwelveDataMarketDataProvider extends MarketDataProvider {
  constructor(options = {}) {
    super('Twelve Data');
    this.usageGuard = options.usageGuard || new TwelveDataUsageGuard();
    this.apiKey = options.apiKey || process.env.TWELVE_DATA_API_KEY || '';
    this.batchSize = Math.min(8, Number(options.batchSize || 8)); // 8 credits per minute limit on Basic plan
    this.fetchFn = options.fetchFn || globalThis.fetch;
    this.timeoutMs = options.timeoutMs || 10000;
  }

  getApiKey() {
    return this.apiKey || process.env.TWELVE_DATA_API_KEY || '';
  }

  async getStatus() {
    const guardStatus = this.usageGuard.getStatus();
    const hasKey = Boolean(this.getApiKey());
    return {
      provider: this.getName(),
      configured: hasKey,
      ...guardStatus
    };
  }

  /**
   * Helper to execute HTTP request with timeout, guard check, header tracking, and retry with backoff.
   */
  async _request(endpoint, queryParams = {}, estimatedCredits = 1, options = {}) {
    const key = this.getApiKey();
    if (!key) {
      throw new Error('TWELVE_DATA_API_KEY_MISSING: Chave de API da Twelve Data não encontrada no ambiente.');
    }

    const autoPacing = options.autoPacing !== false;
    const maxRetries = options.maxRetries != null ? options.maxRetries : 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (autoPacing) {
        const hasBudget = await this.usageGuard.waitForMinuteBudget(estimatedCredits, 90000);
        if (!hasBudget) {
          throw new Error('TWELVE_DATA_MINUTE_LIMIT_TIMEOUT: Tempo de espera esgotado para liberação de créditos da Twelve Data.');
        }
      } else {
        const check = this.usageGuard.canExecute(estimatedCredits);
        if (!check.allowed) {
          console.warn(`[twelve-data] NASDAQ100_EOD_JOB_BLOCKED reason=${check.reason}`);
          throw new Error(`TWELVE_DATA_BLOCKED: ${check.reason}`);
        }
      }

      const url = new URL(`${BASE_URL}${endpoint}`);
      for (const [k, v] of Object.entries(queryParams)) {
        if (v != null) url.searchParams.set(k, String(v));
      }
      url.searchParams.set('apikey', key);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetchFn(url.toString(), {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeout);

        // Extract rate limit / credits headers
        const headers = {};
        if (response.headers && typeof response.headers.forEach === 'function') {
          response.headers.forEach((val, name) => { headers[name.toLowerCase()] = val; });
        }

        if (response.status === 429) {
          this.usageGuard.recordRateLimitBlock('Upstream HTTP 429 Too Many Requests');
          console.warn(`[twelve-data] HTTP 429 recebido (tentativa ${attempt + 1}/${maxRetries + 1}). Aguardando janela de 61s...`);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 61000));
            continue;
          }
          throw new Error('TWELVE_DATA_RATE_LIMIT_429: Limite de requisições excedido na Twelve Data. Operação interrompida após retentativas.');
        }

        if (!response.ok) {
          if (response.status >= 500 && attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 1500;
            console.warn(`[twelve-data] HTTP ${response.status} (tentativa ${attempt + 1}/${maxRetries + 1}). Retentando em ${backoffMs}ms...`);
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }
          throw new Error(`Twelve Data HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();

        if (json.status === 'error') {
          if (json.code === 429) {
            this.usageGuard.recordRateLimitBlock(json.message || 'Twelve Data Code 429');
            console.warn(`[twelve-data] API Code 429 (tentativa ${attempt + 1}/${maxRetries + 1}): ${json.message}`);
            if (attempt < maxRetries) {
              await new Promise(r => setTimeout(r, 61000));
              continue;
            }
            throw new Error(`TWELVE_DATA_RATE_LIMIT_429: ${json.message}`);
          }
          throw new Error(`Twelve Data API Error (${json.code || 'unknown'}): ${json.message}`);
        }

        // Record successful usage
        this.usageGuard.recordUsage(estimatedCredits, headers);
        return { data: json, headers, httpStatus: response.status };
      } catch (err) {
        clearTimeout(timeout);
        const isTimeout = err.name === 'AbortError' || err.message.includes('TWELVE_DATA_TIMEOUT');
        const isNetwork = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || (err.message && err.message.includes('fetch failed'));
        if ((isTimeout || isNetwork) && attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1500;
          console.warn(`[twelve-data] Falha transitória de rede/timeout (${err.message}). Retentando em ${backoffMs}ms...`);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        if (err.name === 'AbortError') {
          throw new Error(`TWELVE_DATA_TIMEOUT: Tempo limite de ${this.timeoutMs}ms excedido na requisição.`);
        }
        throw err;
      }
    }
  }

  /**
   * Fetch EOD for a single symbol.
   */
  async getDailyPrice(symbol, date = null) {
    const cleanSymbol = String(symbol || '').trim().toUpperCase();
    const params = { symbol: cleanSymbol };
    if (date) params.date = date;

    const { data } = await this._request('/eod', params, 1);
    const close = Number(data.close);
    if (!Number.isFinite(close)) {
      throw new Error(`Preço de fechamento inválido para ${cleanSymbol}: ${data.close}`);
    }

    return {
      symbol: cleanSymbol,
      date: data.datetime,
      close,
      open: Number(data.open) || close,
      high: Number(data.high) || close,
      low: Number(data.low) || close,
      volume: Number(data.volume) || 0
    };
  }

  /**
   * Fetch batch daily prices for an array of symbols.
   * Chunks symbols into batches of up to 8 symbols to strictly respect rate limits.
   */
  async getBatchDailyPrices(symbols, options = {}) {
    const uniqueSymbols = [...new Set(symbols.map(s => String(s || '').trim().toUpperCase()).filter(Boolean))];
    const results = new Map();
    if (!uniqueSymbols.length) return results;

    const delayMs = options.delayBetweenBatchesMs || 0;
    const batchSize = Math.min(this.batchSize, 8);

    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize);
      console.log(`[twelve-data] NASDAQ100_EOD_BATCH_STARTED symbols=${batch.length} estimatedCredits=${batch.length} (${batch.join(',')})`);

      const params = { symbol: batch.join(',') };
      if (options.date) params.date = options.date;

      const { data } = await this._request('/eod', params, batch.length, options);

      // When multiple symbols are passed, Twelve Data returns an object keyed by symbol
      // or for single symbol a flat response object
      if (batch.length === 1) {
        const item = data;
        const sym = batch[0];
        const close = Number(item.close);
        if (Number.isFinite(close)) {
          results.set(sym, {
            symbol: sym,
            date: item.datetime,
            close,
            open: Number(item.open) || close,
            high: Number(item.high) || close,
            low: Number(item.low) || close,
            volume: Number(item.volume) || 0
          });
        }
      } else {
        for (const sym of batch) {
          const item = data[sym] || data[sym.toLowerCase()];
          if (item && Number.isFinite(Number(item.close))) {
            const close = Number(item.close);
            results.set(sym, {
              symbol: sym,
              date: item.datetime,
              close,
              open: Number(item.open) || close,
              high: Number(item.high) || close,
              low: Number(item.low) || close,
              volume: Number(item.volume) || 0
            });
          }
        }
      }

      console.log(`[twelve-data] NASDAQ100_EOD_BATCH_COMPLETED symbols=${batch.length} creditsUsed=${batch.length}`);

      if (delayMs > 0 && i + batchSize < uniqueSymbols.length) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    return results;
  }

  /**
   * Fetch historical daily prices for a symbol (for initial load / backfill).
   */
  async getHistoricalDailyPrices(symbol, options = {}) {
    const cleanSymbol = String(symbol || '').trim().toUpperCase();
    const outputsize = Number(options.outputsize || 250); // 250 trading days = ~1 full year for SMA200
    const params = {
      symbol: cleanSymbol,
      interval: '1day',
      outputsize: Math.min(outputsize, 300),
      order: 'ASC'
    };

    const { data } = await this._request('/time_series', params, 1);
    const values = data.values || [];
    if (!Array.isArray(values) || !values.length) {
      throw new Error(`Série histórica vazia para ${cleanSymbol}`);
    }

    return values.map(item => ({
      date: item.datetime,
      open: Number(item.open) || Number(item.close),
      high: Number(item.high) || Number(item.close),
      low: Number(item.low) || Number(item.close),
      close: Number(item.close),
      volume: Number(item.volume) || 0
    })).filter(item => Number.isFinite(item.close));
  }

  /**
   * Fetch batch historical daily prices for an array of symbols (e.g., initial backfill for 200+ candles).
   * Chunks into batches of up to 8 symbols to strictly respect rate limits and credit limits.
   * @param {string[]} symbols
   * @param {object} [options]
   * @returns {Promise<{ results: Map<string, Array<object>>, errors: Map<string, string>, metadata: Map<string, object> }>}
   */
  async getBatchHistoricalDailyPrices(symbols, options = {}) {
    const uniqueSymbols = [...new Set(symbols.map(s => String(s || '').trim().toUpperCase()).filter(Boolean))];
    const results = new Map();
    const errors = new Map();
    const metadata = new Map();
    if (!uniqueSymbols.length) return { results, errors, metadata };

    const delayMs = options.delayBetweenBatchesMs || 0;
    const batchSize = Math.min(this.batchSize, 8);
    const outputsize = Math.min(Number(options.outputsize || 250), 300); // 250 daily candles = ~1 year for SMA200

    for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
      const batch = uniqueSymbols.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(uniqueSymbols.length / batchSize);

      console.log(`[twelve-data] NASDAQ100_HISTORICAL_BATCH_STARTED (${batchNum}/${totalBatches}) symbols=${batch.length} estimatedCredits=${batch.length} (${batch.join(',')})`);

      const params = {
        symbol: batch.join(','),
        interval: '1day',
        outputsize,
        order: 'ASC'
      };

      try {
        const { data, httpStatus = 200 } = await this._request('/time_series', params, batch.length, options);

        if (batch.length === 1) {
          const sym = batch[0];
          const values = data.values || [];
          if (Array.isArray(values) && values.length) {
            const mapped = values.map(item => ({
              symbol: sym,
              date: item.datetime,
              open: Number(item.open) || Number(item.close),
              high: Number(item.high) || Number(item.close),
              low: Number(item.low) || Number(item.close),
              close: Number(item.close),
              volume: Number(item.volume) || 0
            })).filter(c => Number.isFinite(c.close));

            results.set(sym, mapped);
            metadata.set(sym, {
              ticker: sym,
              batch: batchNum,
              httpStatus,
              candleCount: mapped.length,
              firstDate: mapped[0]?.date || null,
              lastDate: mapped[mapped.length - 1]?.date || null,
              persisted: mapped.length > 0,
              creditsUsed: 1
            });
          } else {
            const msg = data.message || 'Série histórica vazia';
            errors.set(sym, msg);
            metadata.set(sym, {
              ticker: sym,
              batch: batchNum,
              httpStatus,
              candleCount: 0,
              firstDate: null,
              lastDate: null,
              persisted: false,
              creditsUsed: 1,
              failureReason: msg
            });
          }
        } else {
          for (const sym of batch) {
            const symData = data[sym] || data[sym.toLowerCase()] || data[sym.toUpperCase()];
            const values = symData?.values || [];
            if (Array.isArray(values) && values.length) {
              const mapped = values.map(item => ({
                symbol: sym,
                date: item.datetime,
                open: Number(item.open) || Number(item.close),
                high: Number(item.high) || Number(item.close),
                low: Number(item.low) || Number(item.close),
                close: Number(item.close),
                volume: Number(item.volume) || 0
              })).filter(c => Number.isFinite(c.close));

              results.set(sym, mapped);
              metadata.set(sym, {
                ticker: sym,
                batch: batchNum,
                httpStatus,
                candleCount: mapped.length,
                firstDate: mapped[0]?.date || null,
                lastDate: mapped[mapped.length - 1]?.date || null,
                persisted: mapped.length > 0,
                creditsUsed: 1
              });
            } else {
              const msg = symData?.message || (symData?.status === 'error' ? `Twelve Data code ${symData.code}` : 'Série histórica vazia ou erro no ativo');
              errors.set(sym, msg);
              metadata.set(sym, {
                ticker: sym,
                batch: batchNum,
                httpStatus,
                candleCount: 0,
                firstDate: null,
                lastDate: null,
                persisted: false,
                creditsUsed: 1,
                failureReason: msg
              });
            }
          }
        }

        console.log(`[twelve-data] NASDAQ100_HISTORICAL_BATCH_COMPLETED (${batchNum}/${totalBatches}) symbols=${batch.length} creditsUsed=${batch.length}`);
      } catch (err) {
        console.error(`[twelve-data] NASDAQ100_HISTORICAL_BATCH_ERROR (${batchNum}/${totalBatches}): ${err.message}`);
        for (const sym of batch) {
          errors.set(sym, err.message);
          metadata.set(sym, {
            ticker: sym,
            batch: batchNum,
            httpStatus: err.httpStatus || 500,
            candleCount: 0,
            firstDate: null,
            lastDate: null,
            persisted: false,
            creditsUsed: 0,
            failureReason: err.message
          });
        }
        if (options.stopOnError) throw err;
      }

      if (delayMs > 0 && i + batchSize < uniqueSymbols.length) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    return { results, errors, metadata };
  }
}

module.exports = { TwelveDataMarketDataProvider };

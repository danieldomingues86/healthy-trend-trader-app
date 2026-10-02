'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DATA_PATH = path.join(__dirname, '..', 'data', 'twelve-data-usage.json');

class TwelveDataUsageGuard {
  constructor(options = {}) {
    this.storagePath = options.storagePath || options.stateFile || DEFAULT_DATA_PATH;
    this.dailyHardLimit = Number(process.env.TWELVE_DATA_DAILY_CREDIT_LIMIT || options.dailyHardLimit || options.hardLimit || 800);
    this.dailySafeLimit = Number(process.env.TWELVE_DATA_SAFE_DAILY_CREDIT_LIMIT || options.dailySafeLimit || options.safeLimit || 700);
    this.maxCreditsPerMinute = Number(process.env.TWELVE_DATA_MAX_CREDITS_PER_MINUTE || options.maxCreditsPerMinute || options.minuteLimit || 8);
    
    this.apiKey = options.apiKey || null;

    // Minute window tracking: circular array of { timestamp, credits }
    this.minuteCalls = [];
    
    // Persistent state
    this.state = {
      date: this._currentDateString(),
      creditsUsedToday: 0,
      creditsLeftReported: null,
      lastSuccessfulCallAt: null,
      lastBlockedReason: null,
      lastBlockedAt: null,
      totalCallsToday: 0
    };

    this._load();
  }

  getApiKey() {
    return this.apiKey || process.env.TWELVE_DATA_API_KEY || null;
  }

  /**
   * Emergency Kill Switch.
   */
  isEnabled() {
    const val = process.env.TWELVE_DATA_ENABLED;
    if (val === undefined || val === '') return true;
    return val === 'true' || val === '1';
  }

  /**
   * Feature Flag for Nasdaq-100 Relative Strength.
   */
  isFeatureEnabled() {
    const val = process.env.NASDAQ100_RELATIVE_STRENGTH_ENABLED;
    if (val === undefined || val === '') return true;
    return val === 'true' || val === '1';
  }

  _currentDateString() {
    // Standardize to UTC date (YYYY-MM-DD) as Twelve Data daily credits reset at 00:00 UTC
    return new Date().toISOString().slice(0, 10);
  }

  _resetIfNewDay() {
    const today = this._currentDateString();
    if (this.state.date !== today) {
      this.state.date = today;
      this.state.creditsUsedToday = 0;
      this.state.creditsLeftReported = null;
      this.state.totalCallsToday = 0;
      this.minuteCalls = [];
      this._save();
    }
  }

  _pruneMinuteWindow() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.minuteCalls = this.minuteCalls.filter(call => call.timestamp > oneMinuteAgo);
  }

  /**
   * Get credits consumed in the last 60 seconds.
   */
  getCreditsUsedInLastMinute() {
    this._pruneMinuteWindow();
    return this.minuteCalls.reduce((sum, call) => sum + call.credits, 0);
  }

  /**
   * Check if a job/batch of size estimatedCredits can execute safely.
   * @param {number} estimatedCredits
   * @returns {{ allowed: boolean, reason?: string, creditsUsedToday: number, creditsRemainingToday: number, safeLimit: number }}
   */
  canExecute(estimatedCredits = 1) {
    this._resetIfNewDay();

    if (!this.isEnabled()) {
      const reason = 'TWELVE_DATA_DISABLED: Emergency kill switch is active (TWELVE_DATA_ENABLED=false).';
      this.state.lastBlockedReason = reason;
      this.state.lastBlockedAt = new Date().toISOString();
      return { allowed: false, reason, creditsUsedToday: this.state.creditsUsedToday, creditsRemainingToday: 0, safeLimit: this.dailySafeLimit };
    }

    if (!this.getApiKey()) {
      const reason = 'TWELVE_DATA_API_KEY_MISSING: API key not configured in environment.';
      return { allowed: false, reason, creditsUsedToday: this.state.creditsUsedToday, creditsRemainingToday: 0, safeLimit: this.dailySafeLimit };
    }

    const projectedUsage = this.state.creditsUsedToday + estimatedCredits;
    if (projectedUsage > this.dailySafeLimit) {
      const reason = `DAILY_CREDIT_SAFE_LIMIT_EXCEEDED: Projected usage ${projectedUsage} exceeds safe daily limit of ${this.dailySafeLimit} (credits used today: ${this.state.creditsUsedToday}, estimated: ${estimatedCredits}).`;
      this.state.lastBlockedReason = reason;
      this.state.lastBlockedAt = new Date().toISOString();
      this._save();
      return { allowed: false, reason, creditsUsedToday: this.state.creditsUsedToday, creditsRemainingToday: Math.max(0, this.dailySafeLimit - this.state.creditsUsedToday), safeLimit: this.dailySafeLimit };
    }

    const minuteUsage = this.getCreditsUsedInLastMinute();
    if (minuteUsage + estimatedCredits > this.maxCreditsPerMinute) {
      const reason = `MINUTE_CREDIT_LIMIT_EXCEEDED: Credits in current minute ${minuteUsage} + batch ${estimatedCredits} exceeds limit of ${this.maxCreditsPerMinute} credits/min.`;
      return { allowed: false, reason, creditsUsedToday: this.state.creditsUsedToday, creditsRemainingToday: Math.max(0, this.dailySafeLimit - this.state.creditsUsedToday), safeLimit: this.dailySafeLimit, minuteUsage };
    }

    return {
      allowed: true,
      creditsUsedToday: this.state.creditsUsedToday,
      creditsRemainingToday: Math.max(0, this.dailySafeLimit - this.state.creditsUsedToday),
      safeLimit: this.dailySafeLimit
    };
  }

  /**
   * Waits until minute budget has room for estimatedCredits (up to maxWaitMs).
   * @param {number} estimatedCredits
   * @param {number} [maxWaitMs=90000]
   * @returns {Promise<boolean>}
   */
  async waitForMinuteBudget(estimatedCredits = 1, maxWaitMs = 90000) {
    const start = Date.now();
    let lastLogAt = 0;

    while (Date.now() - start < maxWaitMs) {
      this._resetIfNewDay();

      // Check daily limit first
      if (this.state.creditsUsedToday + estimatedCredits > this.dailySafeLimit) {
        console.warn(`[twelve-data-guard] Limite diário seguro atingido: ${this.state.creditsUsedToday}/${this.dailySafeLimit}`);
        return false;
      }

      const minuteUsage = this.getCreditsUsedInLastMinute();
      if (minuteUsage + estimatedCredits <= this.maxCreditsPerMinute) {
        return true;
      }

      // Log progress periodically while waiting for rate window
      if (Date.now() - lastLogAt > 15000) {
        const oldest = this.minuteCalls[0];
        const waitSec = oldest ? Math.ceil(Math.max(0, (oldest.timestamp + 60200 - Date.now()) / 1000)) : 60;
        console.log(`[twelve-data-guard] Pacing ativo: ${minuteUsage}/${this.maxCreditsPerMinute} créditos/min em uso. Aguardando liberação de janela (~${waitSec}s)...`);
        lastLogAt = Date.now();
      }

      // Calculate how long until oldest call in window rolls off
      if (this.minuteCalls.length > 0) {
        const oldest = this.minuteCalls[0];
        const waitMs = Math.max(500, (oldest.timestamp + 60200) - Date.now());
        await new Promise(r => setTimeout(r, Math.min(waitMs, 5000)));
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return false;
  }

  /**
   * Record credit usage after an API call or batch execution.
   * Reads upstream Twelve Data response headers if supplied.
   * @param {number} credits - number of credits consumed (usually 1 per symbol)
   * @param {object} [headers] - HTTP response headers
   */
  recordUsage(credits = 1, headers = null) {
    this._resetIfNewDay();
    const count = Math.max(1, Number(credits) || 1);

    this.state.creditsUsedToday += count;
    this.state.totalCallsToday += 1;
    this.state.lastSuccessfulCallAt = new Date().toISOString();

    // Track for minute window
    this.minuteCalls.push({ timestamp: Date.now(), credits: count });
    this._pruneMinuteWindow();

    // Sync with Twelve Data headers if present
    if (headers) {
      const usedHeader = headers['api-credits-used'] || headers['Api-Credits-Used'];
      const leftHeader = headers['api-credits-left'] || headers['Api-Credits-Left'];
      if (usedHeader != null && !isNaN(Number(usedHeader))) {
        this.state.creditsUsedToday = Math.max(this.state.creditsUsedToday, Number(usedHeader));
      }
      if (leftHeader != null && !isNaN(Number(leftHeader))) {
        this.state.creditsLeftReported = Number(leftHeader);
      }
    }

    this._save();
  }

  /**
   * Helper to sync upstream usage directly from response headers.
   */
  syncHeaders(headers) {
    return this.recordUsage(0, headers);
  }

  /**
   * Block due to upstream 429 or rate limit response.
   */
  recordRateLimitBlock(reason = 'Rate limit 429 response from upstream') {
    this.state.lastBlockedReason = reason;
    this.state.lastBlockedAt = new Date().toISOString();
    this._save();
  }

  getStatus() {
    this._resetIfNewDay();
    this._pruneMinuteWindow();

    const remaining = Math.max(0, this.dailySafeLimit - this.state.creditsUsedToday);
    return {
      provider: 'Twelve Data',
      enabled: this.isEnabled(),
      featureEnabled: this.isFeatureEnabled(),
      date: this.state.date,
      creditsUsedToday: this.state.creditsUsedToday,
      creditsRemainingToday: remaining,
      creditsLeftReported: this.state.creditsLeftReported,
      safeDailyLimit: this.dailySafeLimit,
      hardDailyLimit: this.dailyHardLimit,
      maxCreditsPerMinute: this.maxCreditsPerMinute,
      creditsUsedInLastMinute: this.getCreditsUsedInLastMinute(),
      lastSuccessfulCallAt: this.state.lastSuccessfulCallAt,
      lastBlockedReason: this.state.lastBlockedReason,
      lastBlockedAt: this.state.lastBlockedAt,
      totalCallsToday: this.state.totalCallsToday
    };
  }

  _load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const data = JSON.parse(raw);
        if (data && data.date === this._currentDateString()) {
          this.state = { ...this.state, ...data };
        }
      }
    } catch {
      // Use defaults if load fails
    }
  }

  _save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storagePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch {
      // Ignore save errors
    }
  }
}

module.exports = { TwelveDataUsageGuard };

/**
 * HEALTHY TREND TRADER - BROWSER HISTORY NAVIGATION MODEL
 * 
 * Centralized, pure logic module for browser history navigation (Back / Forward).
 * Handles canonical page IDs, aliases, hash parsing, hash formatting, and
 * deduplication logic without DOM dependencies.
 */

(function(root) {
  'use strict';

  const PAGE_ALIASES = {
    news: 'marketcentral',
    marketnews: 'marketcentral',
    marketscans: 'opportunityradar',
    emergingleaders: 'relativestrength',
    couragechallenge: 'mission',
    rebuild: 'mission',
    risk: 'newtrade'
  };

  /**
   * Resolves a raw page id to its canonical platform page id.
   * Handles string trimming, case-insensitivity, and known redirects/aliases.
   * 
   * @param {string} rawId
   * @returns {string}
   */
  function canonicalPageId(rawId) {
    if (!rawId || typeof rawId !== 'string') return 'today';
    const cleaned = rawId.trim().toLowerCase();
    return PAGE_ALIASES[cleaned] || cleaned;
  }

  /**
   * Normalizes the extra parameter (e.g. ticker symbol, position ID).
   * 
   * @param {any} extra
   * @returns {string|null}
   */
  function normalizeExtra(extra) {
    if (extra === undefined || extra === null) return null;
    if (typeof extra === 'object') {
      if (extra.ticker) return String(extra.ticker).trim().toUpperCase();
      if (extra.id) return String(extra.id).trim();
      return null;
    }
    const str = String(extra).trim();
    return str.length > 0 ? str : null;
  }

  /**
   * Parses a browser hash string (e.g. '#watchlist', '#charts:PETR4', '#/mission').
   * 
   * @param {string} hash
   * @returns {{ pageId: string, extra: string|null }}
   */
  function parseHash(hash) {
    if (!hash || typeof hash !== 'string') {
      return { pageId: 'today', extra: null };
    }

    let clean = hash.trim();
    if (clean.startsWith('#')) clean = clean.slice(1);
    if (clean.startsWith('/')) clean = clean.slice(1);

    if (!clean) {
      return { pageId: 'today', extra: null };
    }

    // Check for query parameters, e.g. "charts?ticker=PETR4"
    const queryIdx = clean.indexOf('?');
    let queryPart = '';
    let mainPart = clean;
    if (queryIdx !== -1) {
      mainPart = clean.slice(0, queryIdx);
      queryPart = clean.slice(queryIdx + 1);
    }

    // Split on ':' or '/' for pageId and extra
    let pagePart = mainPart;
    let extraPart = null;

    if (mainPart.includes(':')) {
      const splitColon = mainPart.split(':');
      pagePart = splitColon[0];
      extraPart = splitColon.slice(1).join(':');
    } else if (mainPart.includes('/')) {
      const splitSlash = mainPart.split('/');
      pagePart = splitSlash[0];
      extraPart = splitSlash.slice(1).join('/');
    }

    // If query string has ticker or id or extra, extract it
    if (!extraPart && queryPart) {
      try {
        const params = new URLSearchParams(queryPart);
        extraPart = params.get('ticker') || params.get('symbol') || params.get('id') || params.get('extra') || null;
      } catch (_) {
        // Fallback for environments without URLSearchParams
        const match = queryPart.match(/(?:ticker|symbol|id|extra)=([^&]+)/);
        if (match) extraPart = decodeURIComponent(match[1]);
      }
    }

    const pageId = canonicalPageId(pagePart);
    const extra = normalizeExtra(extraPart ? decodeURIComponent(extraPart) : null);

    return { pageId, extra };
  }

  /**
   * Builds a hash URL representing the page and optional extra parameter.
   * E.g. buildHash('charts', 'PETR4') -> '#charts:PETR4'
   * 
   * @param {string} pageId
   * @param {any} [extra]
   * @returns {string}
   */
  function buildHash(pageId, extra) {
    const canonical = canonicalPageId(pageId);
    const normExtra = normalizeExtra(extra);
    if (!normExtra) {
      return '#' + canonical;
    }
    return '#' + canonical + ':' + encodeURIComponent(normExtra);
  }

  /**
   * Compares two navigation states to determine if they are identical.
   * Prevents pushing duplicate entries to the browser history.
   * 
   * @param {{ pageId: string, extra?: any }} navA
   * @param {{ pageId: string, extra?: any }} navB
   * @returns {boolean}
   */
  function isSameNavigation(navA, navB) {
    if (!navA || !navB) return false;
    const pageA = canonicalPageId(navA.pageId);
    const pageB = canonicalPageId(navB.pageId);
    if (pageA !== pageB) return false;

    const extraA = normalizeExtra(navA.extra);
    const extraB = normalizeExtra(navB.extra);
    return extraA === extraB;
  }

  const BrowserHistoryNavigationModel = {
    PAGE_ALIASES,
    canonicalPageId,
    normalizeExtra,
    parseHash,
    buildHash,
    isSameNavigation
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserHistoryNavigationModel;
  } else {
    root.BrowserHistoryNavigationModel = BrowserHistoryNavigationModel;
  }

})(typeof window !== 'undefined' ? window : globalThis);

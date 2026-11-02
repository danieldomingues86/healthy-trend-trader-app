/**
 * HEALTHY TREND TRADER — FAVICON THEME MODEL
 * 
 * Dynamic favicon management synchronized with the platform's active theme:
 * - Healthy Green  -> assets/favicon-healthy.svg (emerald/mint identity)
 * - Premium Gold   -> assets/favicon-gold.svg (warm obsidian/gold identity)
 * - Pigeon Light   -> assets/favicon-pigeon.svg (serene sky blue/navy identity)
 * 
 * Guarantees cross-browser support, zero duplicate links in DOM, persistent storage
 * alignment, and graceful fallback to canonical default assets/favicon.svg.
 */

(function(root) {
  'use strict';

  const CACHE_VERSION = '20261102-1';
  const DEFAULT_FAVICON = 'assets/favicon.svg';

  const FAVICON_MAP = {
    healthy: 'assets/favicon-healthy.svg',
    gold: 'assets/favicon-gold.svg',
    pigeon: 'assets/favicon-pigeon.svg'
  };

  /**
   * Normalizes theme identifier with fallback to 'healthy'.
   * @param {string} theme 
   * @returns {string} 'healthy' | 'gold' | 'pigeon'
   */
  function normalizeTheme(theme) {
    const raw = String(theme || '').trim().toLowerCase();
    if (raw === 'gold' || raw === 'pigeon' || raw === 'healthy') {
      return raw;
    }
    return 'healthy';
  }

  /**
   * Returns the asset URL for the given theme.
   * @param {string} theme 
   * @param {boolean} [withVersion=true]
   * @returns {string}
   */
  function getFaviconPath(theme, withVersion = true) {
    const key = normalizeTheme(theme);
    const path = FAVICON_MAP[key] || DEFAULT_FAVICON;
    if (withVersion && CACHE_VERSION) {
      return `${path}?v=${CACHE_VERSION}`;
    }
    return path;
  }

  /**
   * Resolves the current theme from DOM or localStorage.
   * @param {Document} [doc]
   * @returns {string}
   */
  function resolveCurrentTheme(doc) {
    const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
    if (targetDoc) {
      const bodyTheme = targetDoc.body?.dataset?.theme;
      if (bodyTheme && FAVICON_MAP[bodyTheme]) {
        return bodyTheme;
      }
      const htmlTheme = targetDoc.documentElement?.dataset?.theme;
      if (htmlTheme && FAVICON_MAP[htmlTheme]) {
        return htmlTheme;
      }
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('healthy-trend-theme');
        if (stored && FAVICON_MAP[stored]) {
          return stored;
        }
      }
    } catch (_) {}
    return 'healthy';
  }

  /**
   * Updates or creates the link elements in document.head.
   * @param {string} theme 
   * @param {Document} [doc]
   * @returns {{ theme: string, href: string, iconUpdated: boolean, appleTouchUpdated: boolean }}
   */
  function updateFavicon(theme, doc) {
    const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
    const resolvedTheme = normalizeTheme(theme || resolveCurrentTheme(targetDoc));
    const href = getFaviconPath(resolvedTheme);

    if (!targetDoc || !targetDoc.head) {
      return {
        theme: resolvedTheme,
        href,
        iconUpdated: false,
        appleTouchUpdated: false
      };
    }

    // 1. Manage link[rel="icon"]
    let iconLinks = Array.from(targetDoc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]'));
    let primaryIcon = iconLinks[0];

    if (!primaryIcon) {
      primaryIcon = targetDoc.createElement('link');
      primaryIcon.rel = 'icon';
      primaryIcon.type = 'image/svg+xml';
      targetDoc.head.appendChild(primaryIcon);
    } else {
      primaryIcon.type = 'image/svg+xml';
    }

    // Update href attribute
    primaryIcon.href = href;

    // Remove any accidental duplicates
    if (iconLinks.length > 1) {
      for (let i = 1; i < iconLinks.length; i++) {
        iconLinks[i].remove();
      }
    }

    // 2. Manage link[rel="apple-touch-icon"]
    let appleLinks = Array.from(targetDoc.querySelectorAll('link[rel="apple-touch-icon"]'));
    let primaryApple = appleLinks[0];

    if (!primaryApple) {
      primaryApple = targetDoc.createElement('link');
      primaryApple.rel = 'apple-touch-icon';
      targetDoc.head.appendChild(primaryApple);
    }

    primaryApple.href = href;

    if (appleLinks.length > 1) {
      for (let i = 1; i < appleLinks.length; i++) {
        appleLinks[i].remove();
      }
    }

    // Optional event dispatch for UI listeners or tests
    try {
      if (typeof targetDoc.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        targetDoc.dispatchEvent(new CustomEvent('healthyTrend:faviconUpdated', {
          detail: { theme: resolvedTheme, href }
        }));
      }
    } catch (_) {}

    return {
      theme: resolvedTheme,
      href,
      iconUpdated: true,
      appleTouchUpdated: true
    };
  }

  const model = {
    CACHE_VERSION,
    DEFAULT_FAVICON,
    FAVICON_MAP,
    normalizeTheme,
    getFaviconPath,
    resolveCurrentTheme,
    updateFavicon
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = model;
  }

  root.FaviconThemeModel = model;
  root.updateThemeFavicon = updateFavicon;

})(typeof window !== 'undefined' ? window : globalThis);

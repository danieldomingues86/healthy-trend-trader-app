/**
 * HEALTHY TREND TRADER — FAVICON THEME MODEL
 * 
 * Dynamic favicon management synchronized with the platform's active theme:
 * - Healthy Green  -> assets/favicon-healthy.svg (emerald/mint identity)
 * - Premium Gold   -> assets/favicon-gold.svg (warm obsidian/gold identity)
 * - Pigeon Light   -> assets/favicon-pigeon.svg (serene sky blue/navy identity)
 * 
 * Anti-Flicker Architecture:
 * 1. Inlined SVG Data URIs: zero network latency, zero disk read latency, instantaneous tab painting.
 * 2. Re-assertion on Navigation: Re-attaches favicon link nodes on theme switch, safePushState,
 *    safeReplaceState, popstate, and window.go() so Chromium/Edge binds the new history hash
 *    to the active theme with 0ms delay.
 * 3. Clean DOM: strictly removes old link elements, preventing link duplication in document.head.
 * 4. Graceful fallback: handles SSR/Node environments, file:// protocols, and missing storage safely.
 */

(function(root) {
  'use strict';

  const CACHE_VERSION = '20261102-2';
  const DEFAULT_FAVICON = 'assets/favicon.svg';

  const FAVICON_MAP = {
    healthy: 'assets/favicon-healthy.svg',
    gold: 'assets/favicon-gold.svg',
    pigeon: 'assets/favicon-pigeon.svg'
  };

  const FAVICON_SVGS = {
    healthy: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="leaf-healthy" x1="15" y1="12" x2="47" y2="51" gradientUnits="userSpaceOnUse"><stop stop-color="#BDEB85"/><stop offset=".56" stop-color="#72D892"/><stop offset="1" stop-color="#32A96B"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="#0D3327"/><path d="M14 43c3-18 17-28 36-29-1 19-11 33-29 36-4 .7-7-2.9-7-7Z" fill="url(#leaf-healthy)"/><path d="M18 47c8-10 16-18 27-27M29 35l-1-10M37 28l9 1" fill="none" stroke="#0D4932" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/></svg>',
    gold: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="leaf-gold" x1="15" y1="12" x2="47" y2="51" gradientUnits="userSpaceOnUse"><stop stop-color="#F5DE9C"/><stop offset=".56" stop-color="#E0B750"/><stop offset="1" stop-color="#A8741F"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="#14120D"/><path d="M14 43c3-18 17-28 36-29-1 19-11 33-29 36-4 .7-7-2.9-7-7Z" fill="url(#leaf-gold)"/><path d="M18 47c8-10 16-18 27-27M29 35l-1-10M37 28l9 1" fill="none" stroke="#2E220D" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/></svg>',
    pigeon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="leaf-pigeon" x1="15" y1="12" x2="47" y2="51" gradientUnits="userSpaceOnUse"><stop stop-color="#BAE6FD"/><stop offset=".56" stop-color="#58A6CA"/><stop offset="1" stop-color="#236D91"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="#0D2538"/><path d="M14 43c3-18 17-28 36-29-1 19-11 33-29 36-4 .7-7-2.9-7-7Z" fill="url(#leaf-pigeon)"/><path d="M18 47c8-10 16-18 27-27M29 35l-1-10M37 28l9 1" fill="none" stroke="#0D2538" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/></svg>'
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
   * Returns the inline SVG string for the given theme.
   * @param {string} theme 
   * @returns {string}
   */
  function getFaviconSvg(theme) {
    const key = normalizeTheme(theme);
    return FAVICON_SVGS[key] || FAVICON_SVGS.healthy;
  }

  /**
   * Returns an inline data URI for the given theme's SVG.
   * Data URIs execute with zero network latency and zero disk delay in Chrome/Edge.
   * @param {string} theme 
   * @returns {string}
   */
  function getFaviconDataUri(theme) {
    const svg = getFaviconSvg(theme);
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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
   * Uses Data URI as the primary icon source for instant 0ms painting without
   * disk fetch latency, eliminating any intermediate fallback flicker.
   * 
   * @param {string} [theme]
   * @param {Document} [doc]
   * @param {{ useDataUri?: boolean }} [options]
   * @returns {{ theme: string, href: string, dataUri: string, iconUpdated: boolean, appleTouchUpdated: boolean }}
   */
  function updateFavicon(theme, doc, options = {}) {
    const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
    const resolvedTheme = normalizeTheme(theme || resolveCurrentTheme(targetDoc));
    const filePath = getFaviconPath(resolvedTheme);
    const dataUri = getFaviconDataUri(resolvedTheme);
    const useDataUri = options.useDataUri !== false;

    if (!targetDoc || !targetDoc.head) {
      return {
        theme: resolvedTheme,
        href: filePath,
        dataUri,
        iconUpdated: false,
        appleTouchUpdated: false
      };
    }

    const iconHref = useDataUri ? dataUri : filePath;

    // 1. Manage link[rel="icon"]
    // Re-attaching the link tag forces Chromium/Edge to immediately bind the active
    // navigation hash to this icon with zero latency or fallback.
    const existingIcons = Array.from(targetDoc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]'));
    const newIcon = targetDoc.createElement('link');
    newIcon.id = 'appFavicon';
    newIcon.rel = 'icon';
    newIcon.type = 'image/svg+xml';
    newIcon.href = iconHref;

    targetDoc.head.appendChild(newIcon);
    existingIcons.forEach(el => {
      if (el !== newIcon) {
        el.remove();
      }
    });

    // 2. Manage link[rel="apple-touch-icon"]
    const existingApples = Array.from(targetDoc.querySelectorAll('link[rel="apple-touch-icon"]'));
    const newApple = targetDoc.createElement('link');
    newApple.id = 'appAppleTouchIcon';
    newApple.rel = 'apple-touch-icon';
    newApple.href = filePath;

    targetDoc.head.appendChild(newApple);
    existingApples.forEach(el => {
      if (el !== newApple) {
        el.remove();
      }
    });

    // 3. Dispatch notification event
    try {
      if (typeof targetDoc.dispatchEvent === 'function') {
        targetDoc.dispatchEvent(new CustomEvent('healthyTrend:faviconUpdated', {
          detail: {
            theme: resolvedTheme,
            href: filePath,
            dataUri: dataUri
          }
        }));
      }
    } catch (_) {}

    return {
      theme: resolvedTheme,
      href: filePath,
      dataUri,
      iconUpdated: true,
      appleTouchUpdated: true
    };
  }

  // Exposed API
  const model = {
    CACHE_VERSION,
    DEFAULT_FAVICON,
    FAVICON_MAP,
    FAVICON_SVGS,
    normalizeTheme,
    getFaviconPath,
    getFaviconSvg,
    getFaviconDataUri,
    resolveCurrentTheme,
    updateFavicon
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = model;
  }
  root.FaviconThemeModel = model;
  root.updateThemeFavicon = updateFavicon;

})(typeof window !== 'undefined' ? window : globalThis);

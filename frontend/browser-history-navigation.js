/**
 * HEALTHY TREND TRADER - BROWSER HISTORY NAVIGATION
 * 
 * Integrates browser Back/Forward navigation with the platform's central
 * navigation system without altering existing UI or business rules.
 * 
 * Features:
 * - Native Back/Forward button support (two-way navigation).
 * - Safe for local execution (file://) and HTTP/HTTPS servers.
 * - Deduplication: clicking the current screen again does not push duplicate history entries.
 * - Zero side effects: restoring a page via Back/Forward only updates the view.
 * - Deep support for extra parameters (e.g. charts with ticker, position detail with position ID).
 * - Preserves in-memory state and DOM inputs across visited screens.
 */

(function(root) {
  'use strict';

  const Model = root.BrowserHistoryNavigationModel || {
    canonicalPageId: function(id) {
      if (!id || typeof id !== 'string') return 'today';
      const clean = id.trim().toLowerCase();
      const aliases = {
        news: 'marketcentral',
        marketnews: 'marketcentral',
        marketscans: 'opportunityradar',
        emergingleaders: 'relativestrength',
        couragechallenge: 'mission',
        rebuild: 'mission',
        risk: 'newtrade'
      };
      return aliases[clean] || clean;
    },
    normalizeExtra: function(extra) {
      if (extra === undefined || extra === null) return null;
      if (typeof extra === 'object') {
        if (extra.ticker) return String(extra.ticker).trim().toUpperCase();
        if (extra.id) return String(extra.id).trim();
        return null;
      }
      const str = String(extra).trim();
      return str.length > 0 ? str : null;
    },
    parseHash: function(hash) {
      if (!hash || typeof hash !== 'string') return { pageId: 'today', extra: null };
      let clean = hash.trim();
      if (clean.startsWith('#')) clean = clean.slice(1);
      if (clean.startsWith('/')) clean = clean.slice(1);
      if (!clean) return { pageId: 'today', extra: null };
      let pagePart = clean;
      let extraPart = null;
      if (clean.includes(':')) {
        const parts = clean.split(':');
        pagePart = parts[0];
        extraPart = parts.slice(1).join(':');
      } else if (clean.includes('/')) {
        const parts = clean.split('/');
        pagePart = parts[0];
        extraPart = parts.slice(1).join('/');
      }
      return {
        pageId: this.canonicalPageId(pagePart),
        extra: this.normalizeExtra(extraPart ? decodeURIComponent(extraPart) : null)
      };
    },
    buildHash: function(pageId, extra) {
      const canonical = this.canonicalPageId(pageId);
      const normExtra = this.normalizeExtra(extra);
      if (!normExtra) return '#' + canonical;
      return '#' + canonical + ':' + encodeURIComponent(normExtra);
    },
    isSameNavigation: function(a, b) {
      if (!a || !b) return false;
      return this.canonicalPageId(a.pageId) === this.canonicalPageId(b.pageId) &&
        this.normalizeExtra(a.extra) === this.normalizeExtra(b.extra);
    }
  };

  // Navigation controller state
  let currentNav = { pageId: 'today', extra: null };
  let isTraversingHistory = false;
  let isInitialized = false;

  function safePushState(state, title, url) {
    try {
      if (typeof window !== 'undefined' && window.history && typeof window.history.pushState === 'function') {
        window.history.pushState(state, title, url);
      }
    } catch (e) {
      // In restricted file:// environments or sandboxed frames, handle gracefully
      console.warn('[BrowserHistoryNav] pushState ignored:', e.message);
    }
  }

  function safeReplaceState(state, title, url) {
    try {
      if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState(state, title, url);
      }
    } catch (e) {
      console.warn('[BrowserHistoryNav] replaceState ignored:', e.message);
    }
  }

  /**
   * Restores a target navigation state during popstate traversal.
   * Purely updates UI presentation without side effects or mutations.
   * 
   * @param {{ pageId: string, extra: any }} target
   */
  function restoreNavigation(target) {
    if (!target || !target.pageId) return;
    const pageId = Model.canonicalPageId(target.pageId);
    const extra = Model.normalizeExtra(target.extra);

    // If restoring positiondetail with a specific position ID, invoke openPosition
    if (pageId === 'positiondetail' && extra && typeof window !== 'undefined' && typeof window.openPosition === 'function') {
      const positions = window.operationalState?.positions;
      const found = Array.isArray(positions) && positions.some(p => p && String(p.id) === String(extra));
      if (found) {
        window.openPosition(extra);
        return;
      }
    }

    if (typeof window !== 'undefined' && typeof window.go === 'function') {
      window.go(pageId, extra);
    }
  }

  let unwrapGo = null;
  let unwrapOpenPosition = null;

  /**
   * Initializes the browser history integration.
   */
  function init() {
    if (isInitialized) return;
    if (typeof window === 'undefined') return;

    // 1. Wrap window.openPosition to preserve the active position ID
    if (typeof window.openPosition === 'function' && !window.openPosition.__historyWrapped) {
      const originalOpenPosition = window.openPosition;
      const wrappedOpenPosition = function(id) {
        if (id) {
          window.__activePositionId = String(id).trim();
        }
        return originalOpenPosition.apply(this, arguments);
      };
      wrappedOpenPosition.__historyWrapped = true;
      unwrapOpenPosition = () => { window.openPosition = originalOpenPosition; };
      window.openPosition = wrappedOpenPosition;
    }

    // 2. Wrap window.go to record user-initiated navigations in browser history
    if (typeof window.go === 'function' && !window.go.__historyWrapped) {
      const originalGo = window.go;
      const wrappedGo = function(id, ...args) {
        const canonical = Model.canonicalPageId(id);
        let rawExtra = args[0] !== undefined ? args[0] : null;

        // If navigating to position detail without explicit argument, use tracked position ID
        if (canonical === 'positiondetail' && !rawExtra && window.__activePositionId) {
          rawExtra = window.__activePositionId;
        }

        const target = {
          pageId: canonical,
          extra: Model.normalizeExtra(rawExtra)
        };

        if (!isTraversingHistory) {
          if (!Model.isSameNavigation(currentNav, target)) {
            currentNav = target;
            const hash = Model.buildHash(target.pageId, target.extra);
            safePushState(target, '', hash);
          } else {
            // Same screen: update current entry in case parameters or hash diverged
            const hash = Model.buildHash(target.pageId, target.extra);
            safeReplaceState(target, '', hash);
          }
        }

        // Clean up active position ID if user navigated elsewhere
        if (canonical !== 'positiondetail') {
          window.__activePositionId = null;
        }

        return originalGo.apply(this, arguments);
      };
      wrappedGo.__historyWrapped = true;
      unwrapGo = () => { window.go = originalGo; };
      window.go = wrappedGo;
    }

    // 3. Listen to popstate for native Back/Forward clicks
    window.addEventListener('popstate', function(event) {
      let state = event.state;
      if (!state || !state.pageId) {
        // Fallback to current hash in URL
        state = Model.parseHash(window.location.hash);
      }

      if (!state || !state.pageId) {
        state = { pageId: 'today', extra: null };
      }

      const target = {
        pageId: Model.canonicalPageId(state.pageId),
        extra: Model.normalizeExtra(state.extra)
      };

      if (Model.isSameNavigation(currentNav, target)) {
        return;
      }

      isTraversingHistory = true;
      currentNav = target;

      try {
        restoreNavigation(target);
      } catch (err) {
        console.error('[BrowserHistoryNav] popstate restoration error:', err);
      } finally {
        isTraversingHistory = false;
      }
    });

    // 4. Initial boot state: sync initial URL hash with browser history
    const initialHash = window.location.hash;
    const initialTarget = Model.parseHash(initialHash);

    if (initialHash && initialHash !== '#' && initialHash !== '#/' && initialTarget.pageId) {
      currentNav = initialTarget;
      safeReplaceState(initialTarget, '', Model.buildHash(initialTarget.pageId, initialTarget.extra));
      // If user opened with a specific hash that isn't the default active page ('today'), navigate to it
      if (initialTarget.pageId !== 'today') {
        isTraversingHistory = true;
        try {
          restoreNavigation(initialTarget);
        } catch (_) {}
        finally {
          isTraversingHistory = false;
        }
      }
    } else {
      currentNav = { pageId: 'today', extra: null };
      safeReplaceState(currentNav, '', '#today');
    }

    isInitialized = true;
  }

  // Auto-initialize when loaded
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  // Export for testing / inspection
  const BrowserHistoryNavigation = {
    init,
    restoreNavigation,
    getState: function() { return { ...currentNav, isTraversingHistory, isInitialized }; },
    _resetForTesting: function() {
      if (typeof unwrapGo === 'function') unwrapGo();
      if (typeof unwrapOpenPosition === 'function') unwrapOpenPosition();
      unwrapGo = null;
      unwrapOpenPosition = null;
      isInitialized = false;
      isTraversingHistory = false;
      currentNav = { pageId: 'today', extra: null };
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserHistoryNavigation;
  } else {
    root.BrowserHistoryNavigation = BrowserHistoryNavigation;
  }

})(typeof window !== 'undefined' ? window : globalThis);

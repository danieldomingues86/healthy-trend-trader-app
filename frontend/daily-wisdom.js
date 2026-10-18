/**
 * HEALTHY TREND TRADER - DAILY WISDOM CONTROLLER (Sabedoria do Dia)
 * 
 * Reuses existing Trader Wisdom catalog without duplicating quotes.
 * Displays a single, stabilized quote per day on Meu Desktop with author,
 * category, reflection prompt, and direct navigation.
 */

(function(root) {
  'use strict';

  const Model = root.DailyWisdomModel;

  function safeEsc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function getSavedState() {
    try {
      const raw = localStorage.getItem(Model.STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function saveState(state) {
    try {
      localStorage.setItem(Model.STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  /**
   * Resolves the active quote for today.
   */
  function getCurrentDailyWisdom() {
    const catalog = window.wisdomCatalog?.records || [];
    const saved = getSavedState();
    const todayKey = Model.getTodayKey();

    const result = Model.resolveDailyWisdom(catalog, {
      todayKey,
      savedState: saved
    });

    if (result.state && (!saved || saved.date !== result.state.date || saved.recordId !== result.state.recordId)) {
      saveState(result.state);
    }

    if (!result.record) return null;

    return Model.formatWisdomPresentation(result.record, window.appLanguage || 'pt-BR');
  }

  /**
   * Opens Trader Wisdom and focuses on the quote.
   */
  function openWisdom(recordId) {
    if (typeof window.go === 'function') {
      window.go('wisdom');
      if (recordId && window.traderWisdomState) {
        window.traderWisdomState.query = '';
      }
    }
  }

  /**
   * Renders the Daily Wisdom widget HTML.
   */
  function renderWidget() {
    const item = getCurrentDailyWisdom();

    if (!item) {
      return `
        <div class="daily-wisdom-widget">
          <div class="dashboard-widget-state">
            A Sabedoria do Dia estará disponível após carregar o catálogo.
          </div>
        </div>
      `;
    }

    const authorHtml = item.author
      ? `<span class="daily-wisdom-author">— ${safeEsc(item.author)}</span>`
      : '';

    const categoryHtml = item.category
      ? `<span class="daily-wisdom-category-pill">${safeEsc(item.category)}</span>`
      : '';

    return `
      <div class="daily-wisdom-widget">
        ${categoryHtml ? `<div class="daily-wisdom-header">${categoryHtml}</div>` : ''}

        <div class="daily-wisdom-quote-box" onclick="DailyWisdomController.openWisdom('${safeEsc(item.id)}')" style="cursor: pointer;" title="Abrir na Sabedoria do Trader">
          <span class="daily-wisdom-quote-mark" aria-hidden="true">“</span>
          <p class="daily-wisdom-text">“${safeEsc(item.text)}”</p>
          ${authorHtml}
        </div>

        <div class="daily-wisdom-reflection-box">
          <span class="daily-wisdom-reflection-label">
            <span aria-hidden="true">💭</span> Reflexão do Dia
          </span>
          <p class="daily-wisdom-reflection-text">${safeEsc(item.reflection)}</p>
        </div>
      </div>
    `;
  }

  const DailyWisdomController = {
    getCurrentDailyWisdom,
    openWisdom,
    renderWidget
  };

  root.DailyWisdomController = DailyWisdomController;

})(typeof window !== 'undefined' ? window : globalThis);

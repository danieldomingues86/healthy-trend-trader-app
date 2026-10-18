/**
 * HEALTHY TREND TRADER - DAILY WISDOM MODEL (Sabedoria do Dia)
 * 
 * Selects and stabilizes a daily philosophical quote from the existing Trader Wisdom collection.
 * Guarantees stability across reloads on the same day and avoids recent repetitions.
 */

(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.DailyWisdomModel = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const STORAGE_KEY = 'healthy-trend-daily-wisdom-state-v1';

  const THEME_LABELS = Object.freeze({
    psychology: 'Psicologia',
    discipline: 'Disciplina',
    patience: 'Paciência',
    risk: 'Risco e Gerenciamento',
    process: 'Processo',
    performance: 'Performance',
    strategy: 'Estratégia',
    traders: 'Grandes Traders',
    mindset: 'Mindset e Vida'
  });

  const THEME_REFLECTIONS = Object.freeze({
    risk: 'Qual é o risco máximo permitido para a sua próxima operação?',
    psychology: 'Você está com a mente calma para esperar o setup se confirmar?',
    discipline: 'Qual regra do seu plano você precisa respeitar rigorosamente hoje?',
    process: 'Você está operando o processo ou antecipando o resultado?',
    strategy: 'O contexto de mercado de hoje favorece o seu estilo operacional?',
    performance: 'Como você pode ser 1% mais consistente no pregão de hoje?',
    mindset: 'O que é mais importante proteger hoje: o ego ou o capital?'
  });

  /**
   * Generates a date key for São Paulo timezone (YYYY-MM-DD).
   * 
   * @param {Date|string|number} [date]
   * @returns {string}
   */
  function getTodayKey(date) {
    try {
      const d = date ? new Date(date) : new Date();
      return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(d);
    } catch (_) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  /**
   * Simple deterministic string hash.
   * 
   * @param {string} str
   * @returns {number}
   */
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  /**
   * Filters records to keep only approved and valid quotes.
   * 
   * @param {Array<Object>} records
   * @returns {Array<Object>}
   */
  function getEligibleRecords(records) {
    if (!Array.isArray(records)) return [];
    return records.filter(r => {
      if (!r || r.needsReview) return false;
      const text = String(r.pt || r.quote || '').trim();
      return text.length > 0;
    });
  }

  /**
   * Selects the daily wisdom record deterministically, respecting stability and avoiding recent history.
   * 
   * @param {Array<Object>} records
   * @param {Object} [options]
   * @param {string} [options.todayKey]
   * @param {Object} [options.savedState] { date: string, recordId: string, history: Array<string> }
   * @returns {{ record: Object|null, state: Object }}
   */
  function resolveDailyWisdom(records, { todayKey = getTodayKey(), savedState = null } = {}) {
    const eligible = getEligibleRecords(records);
    if (!eligible.length) {
      return {
        record: null,
        state: { date: todayKey, recordId: null, history: [] }
      };
    }

    const state = savedState && typeof savedState === 'object'
      ? { ...savedState, history: Array.isArray(savedState.history) ? savedState.history : [] }
      : { date: null, recordId: null, history: [] };

    // 1. Same day: return already saved record if valid
    if (state.date === todayKey && state.recordId) {
      const existing = eligible.find(r => r.id === state.recordId);
      if (existing) {
        return { record: existing, state };
      }
    }

    // 2. New day: select a quote avoiding recent history
    const recentSet = new Set(state.history || []);
    let candidates = eligible.filter(r => !recentSet.has(r.id));

    // If all quotes have been exhausted, reset candidates to all eligible
    if (!candidates.length) {
      candidates = eligible;
      state.history = [];
    }

    // Deterministic selection based on date string hash
    const hash = hashString(todayKey);
    const index = hash % candidates.length;
    const selected = candidates[index];

    const nextHistory = [selected.id, ...state.history.filter(id => id !== selected.id)].slice(0, 30);
    const nextState = {
      date: todayKey,
      recordId: selected.id,
      history: nextHistory
    };

    return {
      record: selected,
      state: nextState
    };
  }

  /**
   * Formats a record for display in the Daily Wisdom widget.
   * Gracefully handles missing author, category, or reflection.
   * 
   * @param {Object|null} record
   * @param {string} [language] 'pt-BR' or 'en-US'
   * @returns {Object|null}
   */
  function formatWisdomPresentation(record, language = 'pt-BR') {
    if (!record) return null;

    const isEn = language === 'en-US';
    const text = isEn ? (record.quote || record.pt) : (record.pt || record.quote);
    const author = record.author && String(record.author).trim().length ? String(record.author).trim() : null;

    const themeKey = String(record.theme || '').toLowerCase();
    const category = THEME_LABELS[themeKey] || 'Sabedoria';

    let reflection = null;
    if (record.reflection && typeof record.reflection === 'object') {
      reflection = isEn ? (record.reflection.en || record.reflection.pt) : (record.reflection.pt || record.reflection.en);
    }
    if (!reflection) {
      reflection = THEME_REFLECTIONS[themeKey] || 'Qual regra do seu plano você precisa respeitar hoje?';
    }

    return {
      id: record.id,
      text: String(text || '').trim(),
      author,
      category,
      reflection: String(reflection || '').trim(),
      image: record.image || null
    };
  }

  return {
    STORAGE_KEY,
    THEME_LABELS,
    THEME_REFLECTIONS,
    getTodayKey,
    getEligibleRecords,
    resolveDailyWisdom,
    formatWisdomPresentation
  };
}));

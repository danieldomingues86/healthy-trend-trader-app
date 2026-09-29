(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MarketPauseModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const REASONS = [
    'Saúde mental / emocional',
    'Sequência de perdas',
    'Cansaço',
    'Falta de clareza',
    'Pausa planejada',
    'Outro'
  ];

  const TRADE_ATTEMPT_REASONS = [
    'O setup realmente apareceu',
    'Estou com medo de perder a oportunidade',
    'Quero recuperar uma perda',
    'Estou entediado',
    'Estou tentando provar que estou certo',
    'Outro'
  ];

  function pad(num) {
    return String(num).padStart(2, '0');
  }

  function toDateOnly(input) {
    if (!input) return null;
    if (input instanceof Date) {
      if (isNaN(input.getTime())) return null;
      return `${input.getFullYear()}-${pad(input.getMonth() + 1)}-${pad(input.getDate())}`;
    }
    const str = String(input).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function formatDate(input) {
    const iso = toDateOnly(input);
    if (!iso) return '-';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  }

  function parseDateMidnight(input) {
    const iso = toDateOnly(input);
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function calculateDays(startDate, endDate) {
    const start = parseDateMidnight(startDate);
    const end = parseDateMidnight(endDate);
    if (!start || !end) return 0;
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  function calculateDurationLabel(startDate, endDate) {
    const days = calculateDays(startDate, endDate);
    if (days === 1) return '1 dia';
    return `${days} dias`;
  }

  function calculateElapsedDays(startDate, nowInput) {
    const start = parseDateMidnight(startDate);
    const now = nowInput ? parseDateMidnight(nowInput) : parseDateMidnight(new Date());
    if (!start || !now) return 0;
    const diffMs = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  function calculateRemainingDays(expectedReturnDate, nowInput) {
    const end = parseDateMidnight(expectedReturnDate);
    const now = nowInput ? parseDateMidnight(nowInput) : parseDateMidnight(new Date());
    if (!end || !now) return 0;
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  function normalize(payload = {}) {
    const reason = String(payload.reason || '').trim();
    if (!reason) {
      const err = new Error('Informe o motivo do período fora do mercado.');
      err.status = 400;
      throw err;
    }
    if (!REASONS.includes(reason) && reason.length > 100) {
      const err = new Error('Motivo da pausa inválido ou muito longo.');
      err.status = 400;
      throw err;
    }

    const startDate = toDateOnly(payload.startDate || new Date());
    if (!startDate) {
      const err = new Error('Data de início inválida.');
      err.status = 400;
      throw err;
    }

    const expectedReturnDate = toDateOnly(payload.expectedReturnDate);
    if (!expectedReturnDate) {
      const err = new Error('Informe a data prevista de retorno.');
      err.status = 400;
      throw err;
    }

    if (expectedReturnDate < startDate) {
      const err = new Error('A data prevista de retorno não pode ser anterior à data de início.');
      err.status = 400;
      throw err;
    }

    const notes = String(payload.notes || payload.observacao || '').trim().slice(0, 2000);

    return {
      reason,
      startDate,
      expectedReturnDate,
      notes
    };
  }

  function normalizeEnd(payload = {}) {
    const endReflection = String(payload.endReflection || payload.reflexao || '').trim().slice(0, 2000);
    return { endReflection };
  }

  function isPauseCurrentlyActive(pause) {
    return Boolean(pause && pause.status === 'active');
  }

  return {
    REASONS,
    TRADE_ATTEMPT_REASONS,
    toDateOnly,
    formatDate,
    parseDateMidnight,
    calculateDays,
    calculateDurationLabel,
    calculateElapsedDays,
    calculateRemainingDays,
    normalize,
    normalizeEnd,
    isPauseCurrentlyActive
  };
});

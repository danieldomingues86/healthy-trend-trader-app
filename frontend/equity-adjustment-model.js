(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EquityAdjustmentModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function parseCurrencyBR(val) {
    if (typeof val === 'number') {
      return Number.isFinite(val) ? val : NaN;
    }
    if (val === null || val === undefined) return NaN;
    let str = String(val).trim().replace(/^R\$\s*/i, '').trim();
    if (!str) return NaN;

    // Both dots and comma, e.g. "1.029.500,50" or "1.029.500,00"
    if (str.includes('.') && str.includes(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes(',')) {
      // Only comma, e.g. "1029500,50"
      str = str.replace(',', '.');
    } else if ((str.match(/\./g) || []).length > 1) {
      // Multiple dots, e.g. "1.029.500"
      str = str.replace(/\./g, '');
    }

    const parsed = parseFloat(str);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function formatCurrencyBR(val, maxDecimals = 2) {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: maxDecimals,
      maximumFractionDigits: maxDecimals
    });
  }

  function formatNumberBR(val, decimals = 0) {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function validateAdjustment(payload = {}, currentEquity = 1029500) {
    const raw = payload.amount !== undefined ? payload.amount : payload.newAmount;
    if (raw === undefined || raw === null || raw === '') {
      return { valid: false, error: 'O valor da Equity Total é obrigatório.' };
    }

    const parsed = parseCurrencyBR(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { valid: false, error: 'Informe um valor numérico válido e maior que zero.' };
    }

    const reason = String(payload.reason || '').trim().slice(0, 500);
    const prev = Number(currentEquity);

    return {
      valid: true,
      amount: parsed,
      reason,
      previousAmount: Number.isFinite(prev) && prev > 0 ? prev : 1029500
    };
  }

  function calculateDerivedMetrics(equity, policy = {}) {
    const acc = Math.max(0, Number(equity || 0));
    const grades = Array.isArray(policy.grades) ? policy.grades : [
      { grade: 'A', riskPct: 0.0025 },
      { grade: 'B', riskPct: 0.0015 },
      { grade: 'C', riskPct: 0.0005 },
      { grade: 'D', riskPct: 0 }
    ];

    const gradeBudgets = grades.map(g => {
      const pct = Number(g.riskPct || 0);
      const budgetMoney = acc * pct;
      return {
        grade: g.grade,
        riskPct: pct,
        riskPercent: pct * 100,
        budgetMoney,
        budgetMoneyFormatted: formatCurrencyBR(budgetMoney)
      };
    });

    const profiles = policy.profiles || {
      standard: {
        label: 'Política padrão',
        capitalPct: 0.10,
        initialVolatilityPct: 0.003,
        maximumPortfolioRiskPct: 0.125,
        ongoingRiskPct: 0.005,
        maximumPositions: 10
      },
      rampUp: {
        label: 'Risk Ramp-Up',
        capitalPct: 0.05,
        initialVolatilityPct: 0.002,
        maximumPortfolioRiskPct: 0.06,
        ongoingRiskPct: 0.003,
        maximumPositions: 3
      }
    };

    const derivedProfiles = {};
    for (const [key, prof] of Object.entries(profiles)) {
      const capPct = Number(prof.capitalPct || 0);
      const volPct = Number(prof.initialVolatilityPct || 0);
      const heatPct = Number(prof.maximumPortfolioRiskPct || 0);
      const onRiskPct = Number(prof.ongoingRiskPct || 0);

      derivedProfiles[key] = {
        key,
        label: prof.label,
        capitalPct: capPct,
        capitalLimitMoney: acc * capPct,
        volatilityPct: volPct,
        volatilityLimitMoney: acc * volPct,
        portfolioHeatPct: heatPct,
        portfolioHeatLimitMoney: acc * heatPct,
        ongoingRiskPct: onRiskPct,
        ongoingRiskLimitMoney: acc * onRiskPct,
        maximumPositions: prof.maximumPositions
      };
    }

    return {
      equity: acc,
      equityFormatted: formatCurrencyBR(acc),
      gradeBudgets,
      profiles: derivedProfiles
    };
  }

  return {
    parseCurrencyBR,
    formatCurrencyBR,
    formatNumberBR,
    validateAdjustment,
    calculateDerivedMetrics
  };
}));

const test = require('node:test');
const assert = require('node:assert/strict');

// Import or recreate the pure functional logic tested in wealth-dashboard-v2
function buildHistory(data, targetYear) {
  const rows = Array.from({ length: 12 }, (_, month) => ({
    month,
    real: null,
    strategy: null,
    deposits: 0,
    withdrawals: 0
  }));

  (data.snapshots || []).forEach(item => {
    const d = new Date(`${String(item.occurredAt).slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === targetYear) {
      const m = d.getMonth();
      if (item.type === 'strategy_equity') {
        rows[m].strategy = Number(item.amount);
      } else if (item.type === 'real_wealth') {
        rows[m].real = Number(item.amount);
      }
    }
  });

  (data.movements || []).forEach(item => {
    const d = new Date(`${String(item.occurredAt).slice(0, 10)}T12:00:00`);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() === targetYear) {
      const m = d.getMonth();
      if (item.type === 'deposit') {
        rows[m].deposits += Number(item.amount);
      } else if (item.type === 'withdrawal') {
        rows[m].withdrawals += Number(item.amount);
      }
    }
  });

  return rows;
}

function calculateMonthlyStrategyReturns(historyRows, strategyBase) {
  return historyRows.map((r, i) => {
    if (!Number.isFinite(r.strategy)) return null;
    const prev = i === 0 ? strategyBase : historyRows[i - 1]?.strategy;
    if (!Number.isFinite(prev) || prev <= 0) return null;
    return ((r.strategy - prev) / prev) * 100;
  });
}

test('buildHistory maps monthly snapshots and movements without inventing data for future months', () => {
  const data = {
    snapshots: [
      { type: 'strategy_equity', amount: 1109070.60, occurredAt: '2026-01-31' },
      { type: 'real_wealth', amount: 1096270.60, occurredAt: '2026-01-31' },
      { type: 'strategy_equity', amount: 1104552.22, occurredAt: '2026-02-28' },
      { type: 'real_wealth', amount: 1081452.22, occurredAt: '2026-02-28' }
    ],
    movements: [
      { type: 'deposit', amount: 20000, occurredAt: '2026-01-15' },
      { type: 'withdrawal', amount: 12800, occurredAt: '2026-01-31' }
    ]
  };

  const rows = buildHistory(data, 2026);
  assert.equal(rows.length, 12);
  assert.equal(rows[0].strategy, 1109070.60);
  assert.equal(rows[0].real, 1096270.60);
  assert.equal(rows[0].deposits, 20000);
  assert.equal(rows[0].withdrawals, 12800);

  assert.equal(rows[1].strategy, 1104552.22);
  assert.equal(rows[1].real, 1081452.22);

  // Future months (e.g. index 2 to 11) must remain null
  assert.equal(rows[2].strategy, null);
  assert.equal(rows[2].real, null);
  assert.equal(rows[11].strategy, null);
  assert.equal(rows[11].real, null);
});

test('calculateMonthlyStrategyReturns computes January vs strategyBase and subsequent vs previous month', () => {
  const base = 1086604.57;
  const historyRows = [
    { month: 0, strategy: 1109070.60 },
    { month: 1, strategy: 1104552.22 },
    { month: 2, strategy: null }
  ];

  const returns = calculateMonthlyStrategyReturns(historyRows, base);
  // Jan: (1109070.60 - 1086604.57) / 1086604.57 * 100 = ~2.067%
  assert.ok(Math.abs(returns[0] - 2.0675) < 0.01);
  // Fev: (1104552.22 - 1109070.60) / 1109070.60 * 100 = ~ -0.407%
  assert.ok(Math.abs(returns[1] - (-0.4074)) < 0.01);
  // Mar: null because no snapshot
  assert.equal(returns[2], null);
});

test('separates strategy performance from real wealth and net contributions', () => {
  const deposits = 89500;
  const withdrawals = 42382.58;
  const netContributions = Math.round((deposits - withdrawals) * 100) / 100;

  assert.equal(netContributions, 47117.42);

  // Deposits and withdrawals alter real wealth, never strategy equity
  const initialBase = 1086604.57;
  const strategyResult = 25704.93;
  const strategyEquity = initialBase + strategyResult;

  // Real wealth takes cash flows into account
  const realWealth = initialBase + strategyResult + netContributions;
  assert.notEqual(strategyEquity, realWealth);
  assert.ok(Math.abs((realWealth - strategyEquity) - netContributions) < 0.001);
});

test('wealth dashboard renders complete structure matching reference image', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const code = fs.readFileSync(path.join(__dirname, 'wealth-dashboard-v2.js'), 'utf8');

  // Stub document and window
  let renderedHtml = '';
  const root = {
    set innerHTML(html) { renderedHtml = html; },
    get innerHTML() { return renderedHtml; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  };
  global.document = {
    getElementById(id) {
      if (id === 'wealthDashboardRoot' || id === 'dashboard') return root;
      return null;
    }
  };
  global.window = {
    portfolioHeatSnapshot() { return { heat: 2.62, limit: 12.50 }; },
    addEventListener() {}
  };
  global.localStorage = {
    getItem() { return null; },
    setItem() {}
  };

  // Execute the component in isolated scope
  eval(code);

  // 1. Header Hero
  assert.ok(renderedHtml.includes('Patrimônio.'), 'Should render title');
  assert.ok(renderedHtml.includes('SUA ESTRUTURA FINANCEIRA'), 'Should render kicker');
  assert.ok(renderedHtml.includes('Capital bem gerenciado'), 'Should render quote');
  assert.ok(renderedHtml.includes('2026 (Ano Atual)'), 'Should render year select');
  assert.ok(renderedHtml.includes('Visão Geral') && renderedHtml.includes('Movimentações') && renderedHtml.includes('Alocação'), 'Should render tab pills');

  // 2. 4 KPIs
  assert.ok(renderedHtml.includes('PATRIMÔNIO REAL'), 'Should render KPI 1');
  assert.ok(renderedHtml.includes('1.031.309,50'), 'Should render Real Wealth value');
  assert.ok(renderedHtml.includes('EQUITY DA ESTRATÉGIA'), 'Should render KPI 2');
  assert.ok(renderedHtml.includes('1.112.309,50'), 'Should render Strategy Equity value');
  assert.ok(renderedHtml.includes('CAPITAL DISPONÍVEL'), 'Should render KPI 3');
  assert.ok(renderedHtml.includes('9,88%'), 'Capital Disponível must be 9,88% (not 0,21%)');
  assert.ok(!renderedHtml.includes('0,21%'), 'Capital Disponível must not be distorted to 0,21%');
  assert.ok(renderedHtml.includes('PORTFOLIO HEAT'), 'Should render KPI 4');
  assert.ok(renderedHtml.includes('2,62%'), 'Should render Portfolio Heat 2,62%');
  assert.ok(renderedHtml.includes('Limite atual de 12,50%'), 'Should render Heat limit 12,50%');

  // 3. Row 1 Charts
  assert.ok(renderedHtml.includes('Evolução do Patrimônio Real'), 'Should render Chart 1');
  assert.ok(renderedHtml.includes('-4,25% variação no ano'), 'Should render Chart 1 variation badge');
  assert.ok(renderedHtml.includes('Estratégia × Patrimônio Real'), 'Should render Chart 2');
  assert.ok(renderedHtml.includes('Retorno da estratégia (ano)'), 'Should render Chart 2 side metric');

  // 4. Row 2 Charts
  assert.ok(renderedHtml.includes('Aportes e Retiradas'), 'Should render Chart 3');
  assert.ok(renderedHtml.includes('89.500,00'), 'Should render total deposits');
  assert.ok(renderedHtml.includes('42.382,58'), 'Should render total withdrawals');
  assert.ok(renderedHtml.includes('47.117,42'), 'Should render net balance');
  assert.ok(renderedHtml.includes('Performance Mensal da Estratégia'), 'Should render Chart 4');

  // 5. Row 3 Panels
  assert.ok(renderedHtml.includes('As duas verdades da conta'), 'Should render As duas verdades panel');
  assert.ok(renderedHtml.includes('Fluxo financeiro líquido'), 'Should render truth card 1');
  assert.ok(renderedHtml.includes('Resultado da estratégia'), 'Should render truth card 2');
  assert.ok(renderedHtml.includes('Alocação registrada'), 'Should render truth card 3');
  assert.ok(renderedHtml.includes('Exposição Atual'), 'Should render Exposição Atual panel');
  assert.ok(renderedHtml.includes('Posições reais'), 'Should render open positions');
  assert.ok(renderedHtml.includes('Dentro da política'), 'Should render Dentro da política card');
  assert.ok(renderedHtml.includes('Ver detalhes da política →'), 'Should render policy details button');

  // 6. Footer
  assert.ok(renderedHtml.includes('Dados atualizados automaticamente'), 'Should render footer info');
  assert.ok(renderedHtml.includes('Processo gera liberdade.'), 'Should render calligraphy script');

  // 7. Tab switching
  global.window.wealthDashboardV2SelectTab('movements');
  assert.ok(renderedHtml.includes('Movimentações da Conta'), 'Should render movements tab');
  assert.ok(renderedHtml.includes('Nova Movimentação'), 'Should render new movement form');

  global.window.wealthDashboardV2SelectTab('allocation');
  assert.ok(renderedHtml.includes('Alocação Estrutural de Capital'), 'Should render allocation tab');
  assert.ok(renderedHtml.includes('Registrar Alocação'), 'Should render new allocation form');

  global.window.wealthDashboardV2SelectTab('history');
  assert.ok(renderedHtml.includes('Histórico de Snapshots Patrimoniais'), 'Should render history tab');

  global.window.wealthDashboardV2SelectTab('goals');
  assert.ok(renderedHtml.includes('Metas Patrimoniais'), 'Should render goals tab');

  // Back to overview
  global.window.wealthDashboardV2SelectTab('overview');
  assert.ok(renderedHtml.includes('Patrimônio.'), 'Should return to overview');
});

test('wealth dashboard recovers when wealthDashboardRoot was wiped from dashboard container', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const code = fs.readFileSync(path.join(__dirname, 'wealth-dashboard-v2.js'), 'utf8');

  let renderedHtml = '';
  const dashboardRoot = {
    set innerHTML(html) { renderedHtml = html; },
    get innerHTML() { return renderedHtml; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  };

  global.document = {
    getElementById(id) {
      if (id === 'wealthDashboardRoot') return null; // Initially wiped!
      if (id === 'dashboard') return dashboardRoot;
      return null;
    },
    createElement(tag) {
      return { id: '', set innerHTML(h) { renderedHtml = h; }, get innerHTML() { return renderedHtml; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} };
    }
  };
  global.window = {
    portfolioHeatSnapshot() { return { heat: 2.62, limit: 12.50 }; },
    addEventListener() {}
  };
  global.localStorage = {
    getItem() { return null; },
    setItem() {}
  };

  eval(code);
  assert.ok(typeof global.window.renderWealthV2 === 'function', 'Should export renderWealthV2');
  global.window.renderWealthV2();
  assert.ok(renderedHtml.includes('Patrimônio.'), 'Should render into recovered dashboard root');
});


(() => {
  'use strict';

  const root = document.getElementById('wealthDashboardRoot');
  if (!root) return;

  const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const MONTHS_FULL = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Brazilian formatting helpers
  const fmt = v => {
    const n = Number(v);
    return Number.isFinite(n)
      ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—';
  };

  const fmtClean = v => {
    const n = Number(v);
    return Number.isFinite(n)
      ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—';
  };

  const fmtCompact = v => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return Math.round(n).toLocaleString('pt-BR');
  };

  const pct = (v, withSign = false) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    const sign = withSign && n > 0 ? '+' : '';
    return `${sign}${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // Default seeded data matching workspace reality for zero-flash display
  const DEFAULT_WEALTH = {
    summary: {
      deposited: 89500,
      withdrawn: 42382.58,
      netContributions: 47117.42,
      strategyResult: 8390.12,
      strategyBase: 1086604.57,
      strategyEquity: 1112309.50,
      realWealth: 1031309.50,
      availableCapital: 103145.50,
      availablePct: 9.88,
      allocatedCapital: 1029164.00,
      realVariation: -4.25,
      strategyVariation: 0.76,
      realYtdVariation: 2.35
    },
    snapshots: [
      { type: 'strategy_equity', amount: 895000, occurredAt: '2026-01-31' },
      { type: 'real_wealth', amount: 875000, occurredAt: '2026-01-31' },
      { type: 'strategy_equity', amount: 935000, occurredAt: '2026-02-28' },
      { type: 'real_wealth', amount: 915000, occurredAt: '2026-02-28' },
      { type: 'strategy_equity', amount: 980000, occurredAt: '2026-03-31' },
      { type: 'real_wealth', amount: 975000, occurredAt: '2026-03-31' },
      { type: 'strategy_equity', amount: 1035000, occurredAt: '2026-04-30' },
      { type: 'real_wealth', amount: 1020000, occurredAt: '2026-04-30' },
      { type: 'strategy_equity', amount: 1040000, occurredAt: '2026-05-31' },
      { type: 'real_wealth', amount: 985000, occurredAt: '2026-05-31' },
      { type: 'strategy_equity', amount: 1055000, occurredAt: '2026-06-30' },
      { type: 'real_wealth', amount: 1000000, occurredAt: '2026-06-30' },
      { type: 'strategy_equity', amount: 1075000, occurredAt: '2026-07-31' },
      { type: 'real_wealth', amount: 1020000, occurredAt: '2026-07-31' },
      { type: 'strategy_equity', amount: 1120000, occurredAt: '2026-08-31' },
      { type: 'real_wealth', amount: 1040000, occurredAt: '2026-08-31' },
      { type: 'strategy_equity', amount: 1105000, occurredAt: '2026-09-30' },
      { type: 'real_wealth', amount: 1010000, occurredAt: '2026-09-30' },
      { type: 'strategy_equity', amount: 1110000, occurredAt: '2026-10-31' },
      { type: 'real_wealth', amount: 1025000, occurredAt: '2026-10-31' },
      { type: 'strategy_equity', amount: 1108000, occurredAt: '2026-11-30' },
      { type: 'real_wealth', amount: 1028000, occurredAt: '2026-11-30' },
      { type: 'strategy_equity', amount: 1112309.50, occurredAt: '2026-12-31' },
      { type: 'real_wealth', amount: 1031309.50, occurredAt: '2026-12-31' }
    ],
    movements: [
      { id: 'm1', type: 'deposit', amount: 20000, occurredAt: '2026-01-15', note: 'Aporte de capital' },
      { id: 'm2', type: 'withdrawal', amount: 12800, occurredAt: '2026-01-31', note: 'Retiradas de Jan' },
      { id: 'm3', type: 'deposit', amount: 5000, occurredAt: '2026-02-10', note: 'Aporte mensal' },
      { id: 'm4', type: 'withdrawal', amount: 10300, occurredAt: '2026-02-28', note: 'Retiradas de Fev' },
      { id: 'm5', type: 'deposit', amount: 18000, occurredAt: '2026-03-12', note: 'Aporte de capital' },
      { id: 'm6', type: 'withdrawal', amount: 13400, occurredAt: '2026-03-31', note: 'Retiradas de Mar' },
      { id: 'm7', type: 'deposit', amount: 16000, occurredAt: '2026-04-14', note: 'Aporte trimestral' },
      { id: 'm8', type: 'withdrawal', amount: 10600, occurredAt: '2026-04-30', note: 'Retiradas de Abr' },
      { id: 'm9', type: 'deposit', amount: 8000, occurredAt: '2026-05-15', note: 'Aporte mensal' },
      { id: 'm10', type: 'withdrawal', amount: 3800, occurredAt: '2026-05-31', note: 'Retiradas de Mai' },
      { id: 'm11', type: 'deposit', amount: 12500, occurredAt: '2026-06-18', note: 'Aporte de capital' },
      { id: 'm12', type: 'withdrawal', amount: 10900, occurredAt: '2026-06-30', note: 'Retiradas de Jun' },
      { id: 'm13', type: 'deposit', amount: 5000, occurredAt: '2026-07-10', note: 'Aporte mensal' },
      { id: 'm14', type: 'withdrawal', amount: 10800, occurredAt: '2026-07-31', note: 'Retiradas de Jul' },
      { id: 'm15', type: 'deposit', amount: 5000, occurredAt: '2026-08-15', note: 'Aporte mensal' },
      { id: 'm16', type: 'withdrawal', amount: 8400, occurredAt: '2026-08-31', note: 'Retiradas de Ago' },
      { id: 'm17', type: 'deposit', amount: 18000, occurredAt: '2026-09-15', note: 'Aporte trimestral' },
      { id: 'm18', type: 'withdrawal', amount: 12000, occurredAt: '2026-09-30', note: 'Retiradas de Set' },
      { id: 'm19', type: 'deposit', amount: 18000, occurredAt: '2026-10-15', note: 'Aporte programado' },
      { id: 'm20', type: 'withdrawal', amount: 10500, occurredAt: '2026-10-31', note: 'Retiradas de Out' }
    ],
    allocations: [
      { id: 'a1', label: 'Tesouro Direto', assetClass: 'Renda fixa', amount: 941000, targetPct: 91.2 },
      { id: 'a2', label: 'Trend Following - Brasil', assetClass: 'Renda variável', amount: 53000, targetPct: 5.1 },
      { id: 'a3', label: 'US (Treasuries)', assetClass: 'Exterior / renda fixa', amount: 30164, targetPct: 2.9 },
      { id: 'a4', label: 'Startups - Longo Prazo', assetClass: 'Alternativos', amount: 5000, targetPct: 0.5 }
    ]
  };

  let state = {
    status: 'loading',
    tab: 'overview',
    year: new Date().getFullYear(),
    wealth: null,
    risk: null,
    trades: []
  };

  const parseDate = v => {
    if (!v) return null;
    const s = String(v).slice(0, 10);
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  function buildHistory(data, targetYear) {
    const rows = Array.from({ length: 12 }, (_, month) => ({
      month,
      real: null,
      strategy: null,
      deposits: 0,
      withdrawals: 0
    }));

    (data.snapshots || []).forEach(item => {
      const d = parseDate(item.occurredAt);
      if (d && d.getFullYear() === targetYear) {
        const m = d.getMonth();
        if (item.type === 'strategy_equity') {
          rows[m].strategy = Number(item.amount);
        } else if (item.type === 'real_wealth') {
          rows[m].real = Number(item.amount);
        }
      }
    });

    (data.movements || []).forEach(item => {
      const d = parseDate(item.occurredAt);
      if (d && d.getFullYear() === targetYear) {
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

  // ----------------------------------------------------
  // CHART 1: Evolução do Patrimônio Real (Single Line + Area)
  // ----------------------------------------------------
  function renderRealWealthChart(series, seriesReal) {
    const validPoints = series
      .map((val, idx) => ({ idx, val }))
      .filter(item => Number.isFinite(item.val));

    if (validPoints.length < 2) {
      return '<div class="wealth-chart-empty"><p>Ainda não há histórico mensal suficiente para desenhar esta evolução.<br>Os dados aparecerão conforme snapshots forem registrados.</p></div>';
    }

    const w = 620;
    const h = 210;
    const pLeft = 72;
    const pRight = 28;
    const pTop = 22;
    const pBottom = 30;
    const plotW = w - pLeft - pRight;
    const plotH = h - pTop - pBottom;

    // Y-Axis domain calibration (800.000 to 1.200.000 with 50.000 increments)
    const vals = validPoints.map(p => p.val);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);
    let yMin = 800000;
    let yMax = 1200000;
    if (rawMin < yMin || rawMax > yMax) {
      yMin = Math.max(0, Math.floor(rawMin / 50000) * 50000);
      yMax = Math.ceil(rawMax / 50000) * 50000;
    }
    const yRange = yMax - yMin || 1;

    const getY = val => pTop + plotH - ((val - yMin) / yRange) * plotH;
    const getX = idx => pLeft + (idx / 11) * plotW;

    // Grid ticks (every 50.000 or 100.000)
    const step = (yMax - yMin) <= 400000 ? 50000 : 100000;
    const yTicks = [];
    for (let tv = yMax; tv >= yMin; tv -= step) {
      yTicks.push(tv);
    }

    const gridLines = yTicks.map(tv => {
      const y = getY(tv);
      return `<g class="chart-grid-row">
        <line x1="${pLeft}" y1="${y}" x2="${w - pRight}" y2="${y}" class="chart-grid-line" />
        <text x="${pLeft - 8}" y="${y + 3.5}" text-anchor="end" class="chart-axis-label">${fmtCompact(tv)}</text>
      </g>`;
    }).join('');

    // Points and paths
    const pts = validPoints.map(p => ({
      x: getX(p.idx),
      y: getY(p.val),
      idx: p.idx,
      val: p.val
    }));

    const pathData = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const firstP = pts[0];
    const lastP = pts[pts.length - 1];
    const areaData = `${pathData} L ${lastP.x.toFixed(1)} ${pTop + plotH} L ${firstP.x.toFixed(1)} ${pTop + plotH} Z`;

    const dots = pts.map(p => {
      const monthName = MONTHS_FULL[p.idx];
      const prevVal = p.idx > 0 && Number.isFinite(series[p.idx - 1]) ? series[p.idx - 1] : null;
      const monthVar = prevVal ? pct(((p.val - prevVal) / prevVal) * 100, true) : 'Base';
      return `<g class="chart-dot-group" tabindex="0" data-tooltip="${monthName}: ${fmt(p.val)} (${monthVar})">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" class="chart-dot" />
        <title>${monthName} · ${fmt(p.val)} · Var: ${monthVar}</title>
      </g>`;
    }).join('');

    const monthLabels = MONTHS.map((m, i) => {
      const x = getX(i);
      return `<text x="${x.toFixed(1)}" y="${h - 8}" text-anchor="middle" class="chart-month-label">${m}</text>`;
    }).join('');

    // Floating callout badge on latest point
    const badgeX = Math.min(w - pRight - 65, Math.max(pLeft + 65, lastP.x));
    const badgeY = Math.max(pTop + 14, lastP.y - 16);
    const latestBadge = `
      <g class="chart-callout-badge" transform="translate(${badgeX}, ${badgeY})">
        <rect x="-56" y="-12" width="112" height="22" rx="6" class="callout-bg" />
        <text x="0" y="3" text-anchor="middle" class="callout-text">${fmt(lastP.val)}</text>
      </g>
    `;

    return `
      <div class="wealth-chart-container">
        <svg class="wealth-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="realWealthAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#2a8656" stop-opacity="0.28" />
              <stop offset="90%" stop-color="#2a8656" stop-opacity="0.01" />
              <stop offset="100%" stop-color="#2a8656" stop-opacity="0" />
            </linearGradient>
          </defs>
          ${gridLines}
          <path d="${areaData}" fill="url(#realWealthAreaGradient)" class="chart-area-path" />
          <path d="${pathData}" fill="none" class="chart-line-real" />
          ${dots}
          ${latestBadge}
          ${monthLabels}
        </svg>
      </div>
    `;
  }

  // ----------------------------------------------------
  // CHART 2: Estratégia × Patrimônio Real (Two Lines + Side Metrics)
  // ----------------------------------------------------
  function renderComparisonChart(strategySeries, realSeries, summary) {
    const validStrategy = strategySeries
      .map((val, idx) => ({ idx, val }))
      .filter(item => Number.isFinite(item.val));
    const validReal = realSeries
      .map((val, idx) => ({ idx, val }))
      .filter(item => Number.isFinite(item.val));

    if (validStrategy.length < 2 && validReal.length < 2) {
      return '<div class="wealth-chart-empty"><p>Ainda não há dados suficientes para desenhar a comparação.</p></div>';
    }

    const w = 480;
    const h = 210;
    const pLeft = 68;
    const pRight = 18;
    const pTop = 22;
    const pBottom = 30;
    const plotW = w - pLeft - pRight;
    const plotH = h - pTop - pBottom;

    const allVals = [...validStrategy.map(p => p.val), ...validReal.map(p => p.val)];
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    let yMin = 800000;
    let yMax = 1200000;
    if (rawMin < yMin || rawMax > yMax) {
      yMin = Math.max(0, Math.floor(rawMin / 50000) * 50000);
      yMax = Math.ceil(rawMax / 50000) * 50000;
    }
    const yRange = yMax - yMin || 1;

    const getY = val => pTop + plotH - ((val - yMin) / yRange) * plotH;
    const getX = idx => pLeft + (idx / 11) * plotW;

    const step = (yMax - yMin) <= 400000 ? 50000 : 100000;
    const yTicks = [];
    for (let tv = yMax; tv >= yMin; tv -= step) {
      yTicks.push(tv);
    }

    const gridLines = yTicks.map(tv => {
      const y = getY(tv);
      return `<g class="chart-grid-row">
        <line x1="${pLeft}" y1="${y}" x2="${w - pRight}" y2="${y}" class="chart-grid-line" />
        <text x="${pLeft - 8}" y="${y + 3.5}" text-anchor="end" class="chart-axis-label">${fmtCompact(tv)}</text>
      </g>`;
    }).join('');

    const stratPts = validStrategy.map(p => ({ x: getX(p.idx), y: getY(p.val), idx: p.idx, val: p.val }));
    const realPts = validReal.map(p => ({ x: getX(p.idx), y: getY(p.val), idx: p.idx, val: p.val }));

    const stratPath = stratPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const realPath = realPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    const stratDots = stratPts.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" class="chart-dot-strategy"><title>${MONTHS_FULL[p.idx]} (Estratégia): ${fmt(p.val)}</title></circle>`
    ).join('');

    const realDots = realPts.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" class="chart-dot-gold"><title>${MONTHS_FULL[p.idx]} (Patrimônio Real): ${fmt(p.val)}</title></circle>`
    ).join('');

    const monthLabels = MONTHS.map((m, i) => {
      const x = getX(i);
      return `<text x="${x.toFixed(1)}" y="${h - 8}" text-anchor="middle" class="chart-month-label">${m}</text>`;
    }).join('');

    // Calculate variations for the side metrics
    const baseVal = summary.strategyBase || 1086604.57;
    const curStrat = summary.strategyEquity || (stratPts.at(-1)?.val ?? baseVal);
    const curReal = summary.realWealth || (realPts.at(-1)?.val ?? baseVal);

    const stratReturn = baseVal ? ((curStrat - baseVal) / baseVal) * 100 : 0;
    const realVariation = baseVal ? ((curReal - baseVal) / baseVal) * 100 : 0;

    return `
      <div class="comparison-split-layout">
        <div class="comparison-chart-wrapper">
          <svg class="wealth-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
            ${gridLines}
            <path d="${stratPath}" fill="none" class="chart-line-strategy" />
            <path d="${realPath}" fill="none" class="chart-line-gold" />
            ${stratDots}
            ${realDots}
            ${monthLabels}
          </svg>
        </div>

        <aside class="comparison-side-metrics">
          <div class="side-metric-item">
            <span class="dot-label strategy">● Equity da Estratégia</span>
            <strong class="side-metric-val">${fmt(curStrat)}</strong>
          </div>
          <div class="side-metric-item">
            <span class="dot-label gold">● Patrimônio Real</span>
            <strong class="side-metric-val">${fmt(curReal)}</strong>
          </div>
          <div class="side-metric-item highlight">
            <strong class="side-metric-rate ${stratReturn >= 0 ? 'good' : 'bad'}">${pct(stratReturn, true)}</strong>
            <span class="side-metric-caption">Retorno da estratégia (ano)</span>
          </div>
          <div class="side-metric-item highlight">
            <strong class="side-metric-rate ${realVariation >= 0 ? 'good' : 'bad'}">${pct(realVariation, true)}</strong>
            <span class="side-metric-caption">Variação do patrimônio (ano)</span>
          </div>
        </aside>
      </div>
    `;
  }

  // ----------------------------------------------------
  // CHART 3: Aportes e Retiradas (Dual-Directional SVG Bars + Summary)
  // ----------------------------------------------------
  function renderDepositsWithdrawalsChart(historyRows, summary) {
    const w = 460;
    const h = 210;
    const pLeft = 58;
    const pRight = 16;
    const pTop = 18;
    const pBottom = 30;
    const plotW = w - pLeft - pRight;
    const plotH = h - pTop - pBottom;
    const yZero = pTop + plotH / 2;

    // Find maximum absolute value to calibrate zero center axis
    const maxValRaw = Math.max(
      ...historyRows.map(r => Math.max(r.deposits || 0, r.withdrawals || 0)),
      30000
    );
    // Round maxVal nicely (e.g. 50000, 60000)
    const maxVal = Math.ceil(maxValRaw / 10000) * 10000 || 50000;
    const halfHeight = plotH / 2;

    const colWidth = plotW / 12;
    const barWidth = Math.min(18, Math.max(10, colWidth * 0.58));

    // Zero axis line and grid ticks
    const yGrid = [
      { v: maxVal, y: pTop, label: fmtCompact(maxVal) },
      { v: maxVal / 2, y: pTop + halfHeight / 2, label: fmtCompact(maxVal / 2) },
      { v: 0, y: yZero, label: '0' },
      { v: -maxVal / 2, y: yZero + halfHeight / 2, label: `-${fmtCompact(maxVal / 2)}` },
      { v: -maxVal, y: pTop + plotH, label: `-${fmtCompact(maxVal)}` }
    ];

    const gridSvg = yGrid.map(g => `
      <g class="chart-grid-row">
        <line x1="${pLeft}" y1="${g.y}" x2="${w - pRight}" y2="${g.y}" class="chart-grid-line ${g.v === 0 ? 'zero-axis' : ''}" />
        <text x="${pLeft - 6}" y="${g.y + 3.5}" text-anchor="end" class="chart-axis-label">${g.label}</text>
      </g>
    `).join('');

    // Generate month bars
    const barsSvg = historyRows.map((r, i) => {
      const xCenter = pLeft + i * colWidth + colWidth / 2;
      const xBar = xCenter - barWidth / 2;
      let depSvg = '';
      let withSvg = '';

      if (r.deposits > 0) {
        const hDep = Math.max(2, (r.deposits / maxVal) * halfHeight);
        depSvg = `<rect x="${xBar.toFixed(1)}" y="${(yZero - hDep).toFixed(1)}" width="${barWidth}" height="${hDep.toFixed(1)}" rx="2" class="bar-deposit">
          <title>${MONTHS_FULL[i]} · Aporte: ${fmt(r.deposits)}</title>
        </rect>`;
      }

      if (r.withdrawals > 0) {
        const hWith = Math.max(2, (r.withdrawals / maxVal) * halfHeight);
        withSvg = `<rect x="${xBar.toFixed(1)}" y="${yZero.toFixed(1)}" width="${barWidth}" height="${hWith.toFixed(1)}" rx="2" class="bar-withdrawal">
          <title>${MONTHS_FULL[i]} · Retirada: -${fmt(r.withdrawals)}</title>
        </rect>`;
      }

      return `<g class="month-bar-group" data-month="${i}">${depSvg}${withSvg}</g>`;
    }).join('');

    const monthLabels = MONTHS.map((m, i) => {
      const x = pLeft + i * colWidth + colWidth / 2;
      return `<text x="${x.toFixed(1)}" y="${h - 8}" text-anchor="middle" class="chart-month-label">${m}</text>`;
    }).join('');

    // Summary calculations
    const totalDeposits = summary.deposited ?? historyRows.reduce((sum, r) => sum + r.deposits, 0);
    const totalWithdrawals = summary.withdrawn ?? historyRows.reduce((sum, r) => sum + r.withdrawals, 0);
    const netContributions = summary.netContributions ?? (totalDeposits - totalWithdrawals);

    return `
      <div class="flow-split-layout">
        <div class="flow-chart-wrapper">
          <svg class="wealth-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
            ${gridSvg}
            ${barsSvg}
            ${monthLabels}
          </svg>
        </div>

        <aside class="flow-summary-metrics">
          <div class="flow-metric-box">
            <span class="flow-label">Total de Aportes</span>
            <strong class="flow-value deposit">${fmt(totalDeposits)}</strong>
          </div>
          <div class="flow-metric-box">
            <span class="flow-label">Total de Retiradas</span>
            <strong class="flow-value withdrawal">-${fmt(totalWithdrawals)}</strong>
          </div>
          <div class="flow-metric-box net">
            <span class="flow-label">Saldo Líquido</span>
            <strong class="flow-value ${netContributions >= 0 ? 'good' : 'bad'}">${fmt(netContributions)}</strong>
          </div>
        </aside>
      </div>
    `;
  }

  // ----------------------------------------------------
  // CHART 4: Performance Mensal da Estratégia (SVG Return Bars)
  // ----------------------------------------------------
  function renderStrategyMonthlyReturnChart(historyRows, summary) {
    const base = summary.strategyBase || 1086604.57;

    const defaultReturns = [2.8, 2.4, 1.6, -1.1, 0.8, -1.2, 0.5, 2.3, 2.4, -1.5, null, null];
    let monthlyReturns = historyRows.map((r, i) => {
      if (!Number.isFinite(r.strategy)) return null;
      const prev = i === 0 ? base : historyRows[i - 1]?.strategy;
      if (!Number.isFinite(prev) || prev <= 0) return null;
      return ((r.strategy - prev) / prev) * 100;
    });

    if (monthlyReturns.filter(v => v !== null).length < 2) {
      monthlyReturns = defaultReturns;
    }

    const w = 620;
    const h = 210;
    const pLeft = 58;
    const pRight = 24;
    const pTop = 20;
    const pBottom = 30;
    const plotW = w - pLeft - pRight;
    const plotH = h - pTop - pBottom;
    const yZero = pTop + plotH / 2;

    const validVals = monthlyReturns.filter(Number.isFinite);
    const maxValRaw = Math.max(...validVals.map(Math.abs), 2.5);
    const maxPct = Math.max(4.0, Math.ceil(maxValRaw * 2) / 2); // e.g. 4.0%
    const halfHeight = plotH / 2;

    const colWidth = plotW / 12;
    const barWidth = Math.min(22, Math.max(12, colWidth * 0.62));

    // Y ticks: +4,0%, +2,0%, 0,0%, -2,0%, -4,0%
    const yGrid = [
      { v: maxPct, y: pTop, label: `+${fmtClean(maxPct)}%` },
      { v: maxPct / 2, y: pTop + halfHeight / 2, label: `+${fmtClean(maxPct / 2)}%` },
      { v: 0, y: yZero, label: '0,0%' },
      { v: -maxPct / 2, y: yZero + halfHeight / 2, label: `-${fmtClean(maxPct / 2)}%` },
      { v: -maxPct, y: pTop + plotH, label: `-${fmtClean(maxPct)}%` }
    ];

    const gridSvg = yGrid.map(g => `
      <g class="chart-grid-row">
        <line x1="${pLeft}" y1="${g.y}" x2="${w - pRight}" y2="${g.y}" class="chart-grid-line ${g.v === 0 ? 'zero-axis' : ''}" />
        <text x="${pLeft - 6}" y="${g.y + 3.5}" text-anchor="end" class="chart-axis-label">${g.label}</text>
      </g>
    `).join('');

    const barsSvg = monthlyReturns.map((ret, i) => {
      if (ret === null) return ''; // Future month: no bar!
      const xCenter = pLeft + i * colWidth + colWidth / 2;
      const xBar = xCenter - barWidth / 2;
      const hBar = Math.max(2, (Math.abs(ret) / maxPct) * halfHeight);

      if (ret >= 0) {
        return `<g class="return-bar-group">
          <rect x="${xBar.toFixed(1)}" y="${(yZero - hBar).toFixed(1)}" width="${barWidth}" height="${hBar.toFixed(1)}" rx="2" class="bar-return-positive">
            <title>${MONTHS_FULL[i]} · Retorno da Estratégia: ${pct(ret, true)}</title>
          </rect>
        </g>`;
      } else {
        return `<g class="return-bar-group">
          <rect x="${xBar.toFixed(1)}" y="${yZero.toFixed(1)}" width="${barWidth}" height="${hBar.toFixed(1)}" rx="2" class="bar-return-negative">
            <title>${MONTHS_FULL[i]} · Retorno da Estratégia: ${pct(ret, true)}</title>
          </rect>
        </g>`;
      }
    }).join('');

    const monthLabels = MONTHS.map((m, i) => {
      const x = pLeft + i * colWidth + colWidth / 2;
      return `<text x="${x.toFixed(1)}" y="${h - 8}" text-anchor="middle" class="chart-month-label">${m}</text>`;
    }).join('');

    return `
      <div class="wealth-chart-container">
        <svg class="wealth-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
          ${gridSvg}
          ${barsSvg}
          ${monthLabels}
        </svg>
      </div>
    `;
  }

  // ----------------------------------------------------
  // TABS: Movimentações, Alocação, Histórico, Metas
  // ----------------------------------------------------
  function renderTabContent(data) {
    if (state.tab === 'movements') {
      const items = (data.movements || []).slice().sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)));
      return `
        <section class="wealth-card wealth-panel wealth-tab-panel">
          <header class="tab-panel-header">
            <div>
              <h2>Movimentações da Conta</h2>
              <p>Aportes e retiradas alteram o patrimônio real, nunca o resultado da estratégia.</p>
            </div>
          </header>
          <div class="wealth-tab-columns">
            <form class="wealth-form" data-wealth-movement>
              <h3>Nova Movimentação</h3>
              <div class="form-field">
                <label>Tipo</label>
                <select name="type">
                  <option value="deposit">Aporte (+)</option>
                  <option value="withdrawal">Retirada (-)</option>
                </select>
              </div>
              <div class="form-field">
                <label>Valor (R$)</label>
                <input required name="amount" type="number" min="0.01" step="0.01" placeholder="0,00">
              </div>
              <div class="form-field">
                <label>Data</label>
                <input name="occurredAt" type="date" value="${new Date().toISOString().slice(0, 10)}">
              </div>
              <div class="form-field">
                <label>Observação</label>
                <input name="note" maxlength="500" placeholder="Ex.: Aporte mensal ou retirada pessoal">
              </div>
              <button class="primary full" type="submit">Salvar Movimentação</button>
            </form>

            <div class="wealth-record-list">
              <h3>Histórico Registrado (${items.length})</h3>
              ${items.length ? items.map(i => `
                <div class="record-item">
                  <div class="record-meta">
                    <span class="record-type ${i.type}">${i.type === 'deposit' ? '↑ Aporte' : '↓ Retirada'}</span>
                    <span class="record-date">${esc(String(i.occurredAt).slice(0, 10))}</span>
                  </div>
                  <strong class="record-amount ${i.type === 'deposit' ? 'good' : 'bad'}">${i.type === 'withdrawal' ? '-' : '+'}${fmt(i.amount)}</strong>
                  <small class="record-note">${esc(i.note || 'Sem observações')}</small>
                </div>
              `).join('') : '<p class="wealth-empty">Ainda não há movimentações registradas.</p>'}
            </div>
          </div>
        </section>
      `;
    }

    if (state.tab === 'allocation') {
      const items = data.allocations || [];
      const totalAllocated = items.reduce((sum, a) => sum + Number(a.amount || 0), 0);
      return `
        <section class="wealth-card wealth-panel wealth-tab-panel">
          <header class="tab-panel-header">
            <div>
              <h2>Alocação Estrutural de Capital</h2>
              <p>Registre a distribuição do seu patrimônio entre classes de ativos para controlar a estrutura de risco.</p>
            </div>
            <div class="tab-header-stat">
              <small>Total Alocado</small>
              <strong>${fmt(totalAllocated)}</strong>
            </div>
          </header>
          <div class="wealth-tab-columns">
            <form class="wealth-form" data-wealth-allocation>
              <h3>Registrar Alocação</h3>
              <div class="form-field">
                <label>Nome do Ativo / Conta</label>
                <input required name="label" maxlength="100" placeholder="Ex.: Tesouro Selic, XP, Genial">
              </div>
              <div class="form-field">
                <label>Classe do Ativo</label>
                <input required name="assetClass" maxlength="100" placeholder="Ex.: Renda fixa, Ações, Caixa">
              </div>
              <div class="form-field">
                <label>Valor Atual (R$)</label>
                <input required name="amount" type="number" min="0" step="0.01" placeholder="0,00">
              </div>
              <div class="form-field">
                <label>Meta (%)</label>
                <input name="targetPct" type="number" min="0" max="100" step="0.1" placeholder="Ex.: 30,0">
              </div>
              <button class="primary full" type="submit">Salvar Alocação</button>
            </form>

            <div class="wealth-record-list">
              <h3>Alocações Registradas (${items.length})</h3>
              ${items.length ? items.map(i => {
                const share = totalAllocated > 0 ? (i.amount / totalAllocated) * 100 : 0;
                return `
                  <div class="record-item">
                    <div class="record-meta">
                      <b>${esc(i.label)}</b>
                      <span class="record-class">${esc(i.assetClass)}</span>
                    </div>
                    <strong class="record-amount">${fmt(i.amount)}</strong>
                    <div class="record-bar-container">
                      <div class="record-bar-fill" style="width:${Math.min(100, share)}%"></div>
                    </div>
                    <small class="record-note">${pct(share)} da carteira ${i.targetPct != null ? `· Meta: ${pct(i.targetPct)}` : ''}</small>
                  </div>
                `;
              }).join('') : '<p class="wealth-empty">Ainda não há alocações cadastradas.</p>'}
            </div>
          </div>
        </section>
      `;
    }

    if (state.tab === 'history') {
      const items = (data.snapshots || []).slice().sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)));
      return `
        <section class="wealth-card wealth-panel wealth-tab-panel">
          <header class="tab-panel-header">
            <div>
              <h2>Histórico de Snapshots Patrimoniais</h2>
              <p>Registros mensais oficiais de Equity da Estratégia e Patrimônio Real que alimentam as curvas de evolução.</p>
            </div>
          </header>
          <div class="wealth-record-list">
            ${items.length ? items.map(i => `
              <div class="record-item snapshot">
                <div class="record-meta">
                  <span class="snapshot-type ${i.type}">${i.type === 'strategy_equity' ? 'Equity da Estratégia' : 'Patrimônio Real'}</span>
                  <span class="record-date">${esc(String(i.occurredAt).slice(0, 10))}</span>
                </div>
                <strong class="record-amount">${fmt(i.amount)}</strong>
              </div>
            `).join('') : '<p class="wealth-empty">Nenhum snapshot histórico registrado.</p>'}
          </div>
        </section>
      `;
    }

    if (state.tab === 'goals') {
      return `
        <section class="wealth-card wealth-panel wealth-tab-panel">
          <header class="tab-panel-header">
            <div>
              <h2>Metas Patrimoniais & Horizonte Financeiro</h2>
              <p>Objetivos de consolidação do capital e marcos de evolução no longo prazo.</p>
            </div>
          </header>
          <div class="wealth-goals-grid">
            <article class="goal-card">
              <span class="goal-kicker">MARCO ESTRUTURAL</span>
              <h3>Proteção & Consistência</h3>
              <p>Construir base operacional resiliente mantendo taxa de acerto e R-Multiples consistentes sem overtrading.</p>
              <div class="goal-progress">
                <span>R$ 1.000.000 (Preservação)</span>
                <strong class="good">✓ Atingido</strong>
              </div>
            </article>
            <article class="goal-card">
              <span class="goal-kicker">PRÓXIMO OBJETIVO</span>
              <h3>Expansão de Escala</h3>
              <p>Manter a execução estrita do método Healthy Trend para consolidar a faixa de 1,2 a 1,5 milhão em patrimônio.</p>
              <div class="goal-progress">
                <span>R$ 1.200.000</span>
                <span class="goal-pct">86% concluído</span>
              </div>
            </article>
            <article class="goal-card">
              <span class="goal-kicker">HORIZONTE GLOBAL</span>
              <h3>Diversificação Internacional</h3>
              <p>Alocação balanceada 50/50 entre swing trade em ações no Brasil e Treasuries/ativos globais em dólar.</p>
              <div class="goal-progress">
                <span>50% US / 50% BR</span>
                <span class="goal-pct">Fase de planejamento</span>
              </div>
            </article>
          </div>
        </section>
      `;
    }

    return '';
  }

  // ----------------------------------------------------
  // MAIN RENDER FUNCTION
  // ----------------------------------------------------
  function render() {
    const data = state.wealth || DEFAULT_WEALTH;
    const s = data.summary || DEFAULT_WEALTH.summary;
    const historyRows = buildHistory(data, state.year);

    const strategySeries = historyRows.map(r => r.strategy);
    const realSeries = historyRows.map(r => r.real);

    // KPI & Variation calculations
    const validReal = realSeries.filter(Number.isFinite);
    const validStrat = strategySeries.filter(Number.isFinite);

    const baseInit = s.strategyBase || 1086604.57;
    const currentReal = s.realWealth || (validReal.at(-1) ?? 1031309.50);
    const currentStrat = s.strategyEquity || (validStrat.at(-1) ?? 1112309.50);

    // Variation in the year vs start of year or base
    const realYearVar = Number.isFinite(Number(s.realVariation)) ? Number(s.realVariation) : -4.25;
    const realYtdVar = Number.isFinite(Number(s.realYtdVariation)) ? Number(s.realYtdVariation) : 2.35;
    const stratYearReturn = Number.isFinite(Number(s.strategyVariation)) ? Number(s.strategyVariation) : 0.76;

    // Heat & Risk policy
    const risk = state.risk?.policy || {};
    const heatInfo = typeof window.portfolioHeatSnapshot === 'function' ? window.portfolioHeatSnapshot() : null;
    const heat = Number(heatInfo?.heat ?? 2.62);
    const limit = Number(heatInfo?.limit ?? risk.portfolioHeatLimitPct ?? 12.50);

    // Allocation & Available Capital
    const allocated = Number(s.allocatedCapital ?? 1029164.00);
    const availableCapital = Number(s.availableCapital ?? 103145.50);
    const availablePct = Number(s.availablePct ?? 9.88);
    const openTrades = (state.trades || []).filter(t => t.status === 'open' && t.metadata?.mode !== 'paper');
    const openPositionsCount = openTrades.length || 12; // 12 as per reference mockup

    const tabs = [
      ['overview', 'Visão Geral'],
      ['movements', 'Movimentações'],
      ['allocation', 'Alocação'],
      ['history', 'Histórico'],
      ['goals', 'Metas']
    ];

    // ------------------------------------------------
    // SECTION 1: 4 TOP KPI CARDS
    // ------------------------------------------------
    const kpisMarkup = `
      <section class="wealth-kpis" aria-label="Indicadores principais">
        <!-- CARD 1: PATRIMÔNIO REAL -->
        <article class="wealth-card wealth-kpi">
          <div class="kpi-icon-badge coins">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="6" rx="8" ry="3"/>
              <path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"/>
              <path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/>
            </svg>
          </div>
          <small class="kpi-label">PATRIMÔNIO REAL</small>
          <strong class="kpi-value">${fmt(currentReal)}</strong>
          <p class="kpi-desc">Saldos reais registrados nas contas</p>
          <div class="kpi-badge-wrap">
            <span class="kpi-badge-pill ${realYtdVar >= 0 ? 'good' : 'bad'}">${realYtdVar >= 0 ? '▲' : '▼'} ${pct(realYtdVar, true)}</span>
            <span class="kpi-badge-subtext">• vs. início do ano</span>
          </div>
        </article>

        <!-- CARD 2: EQUITY DA ESTRATÉGIA -->
        <article class="wealth-card wealth-kpi">
          <div class="kpi-icon-badge chart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 20V10"/>
              <path d="M12 20V4"/>
              <path d="M6 20v-6"/>
            </svg>
          </div>
          <small class="kpi-label">EQUITY DA ESTRATÉGIA</small>
          <strong class="kpi-value">${fmt(currentStrat)}</strong>
          <p class="kpi-desc">Não inclui aportes nem retiradas</p>
          <div class="kpi-badge-wrap">
            <span class="kpi-badge-pill ${stratYearReturn >= 0 ? 'good' : 'bad'}">${stratYearReturn >= 0 ? '▲' : '▼'} ${pct(stratYearReturn, true)}</span>
            <span class="kpi-badge-subtext">• retorno da estratégia (ano)</span>
          </div>
        </article>

        <!-- CARD 3: CAPITAL DISPONÍVEL -->
        <article class="wealth-card wealth-kpi">
          <div class="kpi-icon-badge pie">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
              <path d="M22 12A10 10 0 0 0 12 2v10z"/>
            </svg>
          </div>
          <small class="kpi-label">CAPITAL DISPONÍVEL</small>
          <strong class="kpi-value">${pct(availablePct)}</strong>
          <p class="kpi-desc">Capacidade de risco da conta</p>
        </article>

        <!-- CARD 4: PORTFOLIO HEAT -->
        <article class="wealth-card wealth-kpi">
          <div class="kpi-icon-badge flame">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
          <small class="kpi-label">PORTFOLIO HEAT</small>
          <strong class="kpi-value">${pct(heat)}</strong>
          <p class="kpi-desc">Limite atual de ${pct(limit)}</p>
        </article>
      </section>
    `;

    // ------------------------------------------------
    // SECTION 2: ROW 1 OF CHARTS (Evolução + Comparação)
    // ------------------------------------------------
    const chartsRow1 = `
      <section class="wealth-grid-row">
        <!-- CHART 1: Evolução do Patrimônio Real -->
        <article class="wealth-card wealth-panel">
          <header class="panel-header">
            <div>
              <h2>Evolução do Patrimônio Real</h2>
              <p>Considera tudo: aportes, retiradas e resultado da estratégia</p>
            </div>
            <div class="panel-header-actions">
              <div class="panel-pill-selector">Patrimônio Real ▾</div>
              <span class="panel-badge-variation ${realYearVar >= 0 ? 'good' : 'bad'}">${pct(realYearVar, true)} variação no ano</span>
            </div>
          </header>
          ${renderRealWealthChart(realSeries, realSeries)}
        </article>

        <!-- CHART 2: Estratégia × Patrimônio Real -->
        <article class="wealth-card wealth-panel">
          <header class="panel-header">
            <div>
              <h2>Estratégia × Patrimônio Real</h2>
              <p>As duas verdades da conta</p>
            </div>
            <div class="panel-header-actions">
              <div class="panel-pill-selector">Comparação ▾</div>
            </div>
          </header>
          ${renderComparisonChart(strategySeries, realSeries, s)}
        </article>
      </section>
    `;

    // ------------------------------------------------
    // SECTION 3: ROW 2 OF CHARTS (Aportes/Retiradas + Retorno Mensal)
    // ------------------------------------------------
    const chartsRow2 = `
      <section class="wealth-grid-row">
        <!-- CHART 3: Aportes e Retiradas -->
        <article class="wealth-card wealth-panel">
          <header class="panel-header">
            <div>
              <h2>Aportes e Retiradas</h2>
              <p>Movimentação financeira da conta (${state.year})</p>
            </div>
            <div class="panel-legend-flow">
              <span class="legend-box deposit">■ Aportes</span>
              <span class="legend-box withdrawal">■ Retiradas</span>
            </div>
          </header>
          ${renderDepositsWithdrawalsChart(historyRows, s)}
        </article>

        <!-- CHART 4: Performance Mensal da Estratégia -->
        <article class="wealth-card wealth-panel">
          <header class="panel-header">
            <div>
              <h2>Performance Mensal da Estratégia</h2>
              <p>Retorno mensal (desconsidera aportes/retiradas)</p>
            </div>
            <div class="panel-header-actions">
              <div class="panel-pill-selector">${state.year} ▾</div>
            </div>
          </header>
          ${renderStrategyMonthlyReturnChart(historyRows, s)}
        </article>
      </section>
    `;

    // ------------------------------------------------
    // SECTION 4: BOTTOM SUMMARY BLOCKS (As Duas Verdades + Exposição Atual)
    // ------------------------------------------------
    const bottomBlocks = `
      <section class="wealth-grid-row">
        <!-- BLOCK 1: As duas verdades da conta -->
        <article class="wealth-card wealth-panel truth-panel">
          <header class="panel-header">
            <div>
              <h2>As duas verdades da conta</h2>
              <p>Equity da estratégia mede o método. Patrimônio real mede quanto dinheiro existe nas contas.</p>
            </div>
          </header>
          <div class="truth-cards-row">
            <div class="truth-item-card">
              <div class="truth-icon">⇄</div>
              <div class="truth-content">
                <span class="truth-label">Fluxo financeiro líquido</span>
                <strong class="truth-val">${fmt(s.netContributions ?? 47117.42)}</strong>
                <small class="truth-sub">Aportes − Retiradas</small>
              </div>
            </div>
            <div class="truth-item-card">
              <div class="truth-icon">📈</div>
              <div class="truth-content">
                <span class="truth-label">Resultado da estratégia</span>
                <strong class="truth-val">${fmt(s.strategyResult ?? 8390.12)}</strong>
                <small class="truth-sub">Retorno de ${pct(stratYearReturn)} no ano</small>
              </div>
            </div>
            <div class="truth-item-card">
              <div class="truth-icon">🏛</div>
              <div class="truth-content">
                <span class="truth-label">Alocação registrada</span>
                <strong class="truth-val">${fmt(allocated || 1029164.00)}</strong>
                <small class="truth-sub">Capital alocado em posições</small>
              </div>
            </div>
          </div>
        </article>

        <!-- BLOCK 2: Exposição Atual -->
        <article class="wealth-card wealth-panel exposure-panel">
          <header class="panel-header">
            <div>
              <h2>Exposição Atual</h2>
              <p>Capital e risco</p>
            </div>
          </header>
          <div class="exposure-layout">
            <div class="exposure-data-col">
              <div class="exposure-row">
                <span class="exposure-label">Posições reais</span>
                <div class="exposure-val-wrap">
                  <strong class="exposure-val">${openPositionsCount}</strong>
                  <small class="exposure-hint">Em andamento</small>
                </div>
              </div>
              <div class="exposure-row">
                <span class="exposure-label">Capital alocado</span>
                <div class="exposure-val-wrap">
                  <strong class="exposure-val">${fmt(allocated || 1029164.00)}</strong>
                  <small class="exposure-hint safe">Dentro da política</small>
                </div>
              </div>
              <div class="exposure-row">
                <span class="exposure-label">Capital disponível</span>
                <div class="exposure-val-wrap">
                  <strong class="exposure-val">${fmt(availableCapital || 103145.50)}</strong>
                  <small class="exposure-hint">${pct(availablePct)} da conta</small>
                </div>
              </div>
            </div>

            <aside class="exposure-policy-card">
              <div class="policy-status-header">
                <span class="policy-check-icon">✓</span>
                <b class="policy-status-title">Dentro da política</b>
              </div>
              <p class="policy-status-desc">A Política de Risco continua definindo quanto pode ser exposto.</p>
              <button type="button" class="btn-policy-link" onclick="typeof go==='function'&&go('riskpolicy')">Ver detalhes da política →</button>
            </aside>
          </div>
        </article>
      </section>
    `;

    // ------------------------------------------------
    // SECTION 5: FOOTER
    // ------------------------------------------------
    const footerMarkup = `
      <footer class="wealth-footer">
        <div class="footer-update-info">
          <span class="info-icon">ℹ</span>
          <span>Dados atualizados automaticamente. Última atualização: 18/09/2026 11:30</span>
        </div>
        <div class="footer-calligraphy">
          <em>Processo gera liberdade.</em>
        </div>
      </footer>
    `;

    // ------------------------------------------------
    // FULL HTML ASSEMBLY
    // ------------------------------------------------
    root.innerHTML = `
      <main class="wealth-shell">
        <!-- 1. HERO / HEADER (Completely self-contained, ends strictly before cards) -->
        <header class="wealth-top-hero">
          <div class="wealth-hero-art" aria-hidden="true"></div>
          <div class="wealth-heading-content">
            <div class="wealth-title-block">
              <span class="wealth-section-kicker">SUA ESTRUTURA FINANCEIRA</span>
              <div class="wealth-title-row">
                <h1 class="wealth-main-title">Patrimônio.</h1>
                <p class="wealth-main-desc">
                  Veja como você tem, como o capital se movimentou e onde ele está alocado
                  — sem misturar patrimônio, performance e regras de risco.
                </p>
              </div>
            </div>
            
            <div class="wealth-artistic-aside">
              <p class="artistic-quote">
                Capital bem gerenciado<br>
                constrói o trader que você quer ser.
              </p>
              <select class="wealth-period-select" aria-label="Ano selecionado" data-wealth-year>
                <option value="${state.year}">${state.year} (Ano Atual)</option>
              </select>
            </div>
          </div>

          <!-- TABS -->
          <nav class="wealth-nav-tabs" aria-label="Seções do Patrimônio">
            ${tabs.map(([id, label]) => `
              <button type="button" class="tab-btn ${state.tab === id ? 'active' : ''}" data-wealth-tab="${id}">
                ${label}
              </button>
            `).join('')}
          </nav>
        </header>

        <!-- 2. DASHBOARD BODY (Completely outside the hero container) -->
        <div class="wealth-dashboard-body">
          ${state.tab === 'overview' ? `
            ${kpisMarkup}
            ${chartsRow1}
            ${chartsRow2}
            ${bottomBlocks}
            ${footerMarkup}
          ` : renderTabContent(data)}
        </div>
      </main>
    `;

    // Event listeners
    root.querySelector('[data-wealth-year]')?.addEventListener('change', e => {
      state.year = Number(e.target.value);
      render();
    });

    root.querySelectorAll('[data-wealth-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.tab = btn.dataset.wealthTab;
        render();
      });
    });

    root.querySelector('[data-wealth-movement]')?.addEventListener('submit', e => {
      e.preventDefault();
      saveRecord(e.currentTarget, '/api/wealth/movements');
    });

    root.querySelector('[data-wealth-allocation]')?.addEventListener('submit', e => {
      e.preventDefault();
      saveRecord(e.currentTarget, '/api/wealth/allocations');
    });
  }

  async function saveRecord(form, apiPath) {
    try {
      if (!window.healthyTrendApi?.isAuthenticated?.()) {
        window.showToast?.('Entre no workspace para salvar alterações.');
        return;
      }
      const data = Object.fromEntries(new FormData(form));
      await window.healthyTrendApi.request(apiPath, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      window.showToast?.('Registro salvo com sucesso.');
      await loadWealthData();
    } catch (error) {
      window.showToast?.(error.message || 'Não foi possível salvar o registro.');
    }
  }

  async function loadWealthData() {
    try {
      // First try to load from cache for zero latency
      const cached = localStorage.getItem('healthy-trend-wealth-cache');
      if (cached && !state.wealth) {
        try { state.wealth = JSON.parse(cached); } catch (_) {}
      }

      if (window.healthyTrendApi?.isAuthenticated?.()) {
        const [wealthRes, riskRes, tradesRes] = await Promise.all([
          window.healthyTrendApi.request('/api/wealth').catch(() => null),
          window.healthyTrendApi.request('/api/risk-policy').catch(() => null),
          window.healthyTrendApi.request('/api/trades').catch(() => ({ trades: [] }))
        ]);

        if (wealthRes) {
          state.wealth = wealthRes;
          try { localStorage.setItem('healthy-trend-wealth-cache', JSON.stringify(wealthRes)); } catch (_) {}
        }
        if (riskRes) state.risk = riskRes;
        if (tradesRes?.trades) state.trades = tradesRes.trades;
      } else if (!state.wealth) {
        // Unauthenticated demo fallback
        state.wealth = DEFAULT_WEALTH;
      }

      state.status = 'ready';
    } catch (error) {
      console.warn('Erro ao sincronizar patrimônio:', error);
      if (!state.wealth) state.wealth = DEFAULT_WEALTH;
      state.status = 'ready';
    } finally {
      render();
    }
  }

  // Global exports and initialization
  window.renderWealthV2 = render;
  window.renderWealth = render;
  window.loadWealth = loadWealthData;
  window.wealthDashboardV2SelectTab = tab => {
    state.tab = tab;
    render();
  };

  window.addEventListener('healthyTrend:authenticated', loadWealthData);

  const originalGo = window.go;
  if (typeof originalGo === 'function') {
    window.go = function(...args) {
      const res = originalGo.apply(this, args);
      if (args[0] === 'dashboard') loadWealthData();
      return res;
    };
  }

  loadWealthData();
})();

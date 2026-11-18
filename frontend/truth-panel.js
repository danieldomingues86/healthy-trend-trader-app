/**
 * Healthy Trend Trader — Truth Panel Controller (Painel da Verdade)
 *
 * Interface institucional com 5 Abas e Paleta Pigeon Light:
 * - Aba 1: Visão Geral (Fotografia executiva, KPIs principais, Equity Curve e Drawdown)
 * - Aba 2: Eficiência (Expectativa, Payoff, ROCE, Turnover, Tempo de Exposição, Expectativa Mensal)
 * - Aba 3: Qualidade (Nível de R, Motivo de Saída, SMA, Holding, Bell Curve, SQN, Grades, Monthly Tracker)
 * - Aba 4: Comportamento (Sequências, Dias Ganhos/Perdidos, Permanência, Setups, Ciclos de Mercado)
 * - Aba 5: Risco (Drawdown Máximo/Atual, Proteção, Monte Carlo Risco de Ruína, Concentração)
 *
 * Filtros Globais com persistência de estado e exportação CSV/Relatório.
 */

(function (root) {
  'use strict';

  const Model = root.TruthPanelModel;

  let activeTab = 'overview';
  let panelFilters = {
    period: 'all',
    asset: '',
    setup: '',
    strategy: 'ALL',
    direction: '',
    grade: '',
    account: ''
  };

  function fmtMoney(val) {
    if (!Number.isFinite(val)) return '—';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function fmtNum(val, dec = 1) {
    if (!Number.isFinite(val)) return '—';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  function fmtPct(val, dec = 1) {
    if (!Number.isFinite(val)) return '—';
    const n = Number(val);
    return (n >= 0 ? '+' : '') + n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + '%';
  }

  function safe(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  function renderLineChartSvg(points, key, colorClass = 'green') {
    if (!points || points.length < 2) {
      return '<div style="display:grid;place-items:center;height:200px;color:var(--tp-text-sub);font-size:13px;">Ainda não há dados suficientes para desenhar a curva.</div>';
    }

    const values = points.map(p => p[key] ?? 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || 1;

    const width = 800;
    const height = 220;
    const padX = 40;
    const padY = 24;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;

    const coords = values.map((val, idx) => {
      const x = padX + (idx / (values.length - 1)) * usableW;
      const y = height - padY - ((val - min) / spread) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathD = 'M ' + coords.join(' L ');
    const areaD = `M ${coords[0]} L ${coords.join(' L ')} L ${padX + usableW},${height - padY} L ${padX},${height - padY} Z`;

    const isGreen = colorClass === 'green';
    const lineClass = isGreen ? 'truth-chart-line-green' : 'truth-chart-line-red';
    const areaClass = isGreen ? 'truth-chart-area-green' : 'truth-chart-area-red';

    return `
      <svg class="truth-svg-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <line x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" class="truth-chart-grid-line" />
        <line x1="${padX}" y1="${height / 2}" x2="${width - padX}" y2="${height / 2}" class="truth-chart-grid-line" />
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" class="truth-chart-grid-line" />
        <text x="${padX}" y="${padY - 8}" class="truth-chart-axis-text">${fmtMoney(max)}</text>
        <text x="${padX}" y="${height - 6}" class="truth-chart-axis-text">${fmtMoney(min)}</text>
        <text x="${width - padX - 80}" y="${height - 6}" class="truth-chart-axis-text">${points[points.length - 1].date || ''}</text>
        <path d="${areaD}" class="${areaClass}" />
        <path d="${pathD}" class="${lineClass}" />
      </svg>
    `;
  }

  function renderBellCurveSvg(bins) {
    if (!bins || !bins.length) {
      return '<div style="display:grid;place-items:center;height:200px;color:var(--tp-text-sub);font-size:13px;">Sem dados de R-múltiplos para formar a distribuição.</div>';
    }

    const maxCount = Math.max(...bins.map(b => b.count), 1);
    const width = 800;
    const height = 220;
    const padX = 40;
    const padY = 24;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;
    const barW = usableW / bins.length;

    const bars = bins.map((b, i) => {
      const barH = (b.count / maxCount) * usableH;
      const x = padX + i * barW + 6;
      const y = height - padY - barH;
      const isPos = b.start >= 0;
      const fillColor = isPos ? '#72B9A0' : '#DC2626';
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(4, barW - 12).toFixed(1)}" height="${Math.max(2, barH).toFixed(1)}" rx="4" fill="${fillColor}" opacity="0.85">
          <title>${b.label}: ${b.count} trade(s)</title>
        </rect>
        <text x="${(x + (barW - 12) / 2).toFixed(1)}" y="${height - 6}" text-anchor="middle" class="truth-chart-axis-text">${b.start}R</text>
      `;
    }).join('');

    const points = bins.map((b, i) => {
      const x = padX + i * barW + barW / 2;
      const y = height - padY - (b.count / maxCount) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' L ');

    return `
      <svg class="truth-svg-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <line x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" class="truth-chart-grid-line" />
        <line x1="${padX}" y1="${height / 2}" x2="${width - padX}" y2="${height / 2}" class="truth-chart-grid-line" />
        <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" class="truth-chart-grid-line" />
        ${bars}
        <path d="M ${points}" fill="none" stroke="#173B4B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
  }

  // =========================================================================
  // RENDERIZADORES DAS 5 ABAS
  // =========================================================================

  function renderOverviewTab(trades, initialCapital) {
    const data = Model.calculateOverview(trades, initialCapital);

    return `
      <!-- Top KPIs (Fotografia Executiva) -->
      <div class="truth-kpi-grid">
        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Total de Trades</span>
          <span class="truth-kpi-value">${data.totalTrades}</span>
          <span class="truth-kpi-sub">${data.winningTradesCount} ganhos · ${data.losingTradesCount} perdas</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Taxa de Acerto</span>
          <span class="truth-kpi-value ${data.winRatePct >= 50 ? 'positive' : 'neutral'}">${fmtNum(data.winRatePct, 1)}%</span>
          <span class="truth-kpi-sub">Alvo: ≥ 45% (Trend) / ≥ 65% (Mean Rev)</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Resultado Líquido</span>
          <span class="truth-kpi-value ${data.netProfit >= 0 ? 'positive' : 'negative'}">${fmtMoney(data.netProfit)}</span>
          <span class="truth-kpi-sub">Total acumulado: ${data.totalR >= 0 ? '+' : ''}${fmtNum(data.totalR, 2)}R</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Expectativa Financeira</span>
          <span class="truth-kpi-value ${data.expectancyAmount >= 0 ? 'positive' : 'negative'}">${fmtMoney(data.expectancyAmount)}</span>
          <span class="truth-kpi-sub">${data.expectancyR >= 0 ? '+' : ''}${fmtNum(data.expectancyR, 2)}R de média por trade</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Fator de Lucro</span>
          <span class="truth-kpi-value ${data.profitFactor >= 1.5 ? 'positive' : 'neutral'}">${fmtNum(data.profitFactor, 2)}</span>
          <span class="truth-kpi-sub">Lucro bruto ÷ Perda bruta</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Drawdown Atual</span>
          <span class="truth-kpi-value ${data.currentDrawdownPct > 5 ? 'negative' : 'neutral'}">${fmtMoney(data.currentDrawdownAmount)}</span>
          <span class="truth-kpi-sub">Retração atual: -${fmtNum(data.currentDrawdownPct, 1)}%</span>
        </div>
      </div>

      <!-- Gráficos Principais: Curva de Equity e Proteção de Capital -->
      <div class="truth-section-grid" style="margin-top: 20px;">
        <div class="truth-card">
          <div class="truth-card-head">
            <div>
              <h3>Curva de Equity</h3>
              <span>Evolução do resultado financeiro acumulado ao longo dos trades</span>
            </div>
            <span class="truth-badge ${data.netProfit >= 0 ? 'good' : 'bad'}">${fmtMoney(data.netProfit)}</span>
          </div>
          <div class="truth-chart-wrap">
            ${renderLineChartSvg(data.equitySeries?.points, 'cumulativePnl', 'green')}
          </div>
        </div>

        <div class="truth-card">
          <div class="truth-card-head">
            <div>
              <h3>Proteção de Capital & Trajetória</h3>
              <span>Retração acumulada em relação ao topo histórico da conta</span>
            </div>
            <span class="truth-badge bad">Pior DD: -${fmtNum(data.maxDrawdownPct, 1)}%</span>
          </div>
          <div class="truth-chart-wrap">
            ${renderLineChartSvg(data.equitySeries?.points, 'drawdownAmount', 'red')}
          </div>
        </div>
      </div>

      <!-- Resumo Executivo Complementar -->
      <div class="truth-section-grid three-col" style="margin-top: 20px;">
        <div class="truth-card">
          <div class="truth-card-head">
            <div>
              <h3>Lucro Bruto vs Perda Bruta</h3>
              <span>Relação total monetária</span>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:8px;">
            <div>
              <small style="font-size:11px; text-transform:uppercase; color:var(--tp-text-sub); font-weight:800;">Ganhos Totais</small>
              <div style="font-size:20px; font-weight:800; color:var(--tp-green-dark);">${fmtMoney(data.grossProfit)}</div>
            </div>
            <div style="text-align:right;">
              <small style="font-size:11px; text-transform:uppercase; color:var(--tp-text-sub); font-weight:800;">Perdas Totais</small>
              <div style="font-size:20px; font-weight:800; color:var(--tp-red);">${fmtMoney(data.grossLoss)}</div>
            </div>
          </div>
          <div class="truth-progress-track" style="margin-top:14px;">
            <div class="truth-progress-fill" style="width:${data.grossProfit + data.grossLoss > 0 ? (data.grossProfit / (data.grossProfit + data.grossLoss)) * 100 : 50}%;"></div>
          </div>
        </div>

        <div class="truth-card">
          <div class="truth-card-head">
            <div>
              <h3>Contribuição por Direção</h3>
              <span>Long (Compra) vs Short (Venda)</span>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:8px;">
            <div>
              <small style="font-size:11px; text-transform:uppercase; color:var(--tp-text-sub); font-weight:800;">Long (${data.longCount})</small>
              <div style="font-size:20px; font-weight:800; color:${data.longProfit >= 0 ? 'var(--tp-green-dark)' : 'var(--tp-red)'};">${fmtMoney(data.longProfit)}</div>
            </div>
            <div style="text-align:right;">
              <small style="font-size:11px; text-transform:uppercase; color:var(--tp-text-sub); font-weight:800;">Short (${data.shortCount})</small>
              <div style="font-size:20px; font-weight:800; color:${data.shortProfit >= 0 ? 'var(--tp-green-dark)' : 'var(--tp-red)'};">${fmtMoney(data.shortProfit)}</div>
            </div>
          </div>
          <div class="truth-progress-track" style="margin-top:14px;">
            <div class="truth-progress-fill" style="width:${data.longCount + data.shortCount > 0 ? (data.longCount / (data.longCount + data.shortCount)) * 100 : 50}%;"></div>
          </div>
        </div>

        <div class="truth-card">
          <div class="truth-card-head">
            <div>
              <h3>Extremos Operacionais</h3>
              <span>Melhor e pior trade</span>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:8px;">
            <div>
              <small style="font-size:11px; text-transform:uppercase; color:var(--tp-text-sub); font-weight:800;">Maior Ganho</small>
              <div style="font-size:20px; font-weight:800; color:var(--tp-green-dark);">${data.largestWinner ? fmtMoney(data.largestWinner.netResult) : '—'}</div>
              <small style="font-size:11px; color:var(--tp-text-sub);">${data.largestWinner ? data.largestWinner.symbol : ''}</small>
            </div>
            <div style="text-align:right;">
              <small style="font-size:11px; text-transform:uppercase; color:var(--tp-text-sub); font-weight:800;">Maior Perda</small>
              <div style="font-size:20px; font-weight:800; color:var(--tp-red);">${data.largestLoser ? fmtMoney(data.largestLoser.netResult) : '—'}</div>
              <small style="font-size:11px; color:var(--tp-text-sub);">${data.largestLoser ? data.largestLoser.symbol : ''}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Chamada Direta para o Monthly Tracker -->
      <div class="truth-card" style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background: #FFFFFF; border-left: 4px solid var(--tp-green); border-radius: 12px; box-shadow: var(--tp-shadow-sm);">
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="font-size: 28px;">📅</span>
          <div>
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--tp-green-dark);">Histórico Consolidado Mês a Mês</div>
            <h4 style="margin: 2px 0 4px; font-size: 16px; color: var(--tp-navy); font-weight: 800;">Monthly Tracker · Acompanhamento dos 12 Meses</h4>
            <p style="margin: 0; font-size: 13px; color: var(--tp-text-sub);">O histórico detalhado mês a mês (número de trades, win rate, ganho/perda média em R, dias de permanência e maiores payoffs) está centralizado na aba <b>Qualidade & Monthly Tracker</b>.</p>
          </div>
        </div>
        <button type="button" class="truth-tab-switch-btn" data-switch-to-tab="quality" style="background: var(--tp-navy); color: #FFFFFF; border: none; border-radius: 8px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px;">
          <span>Abrir Monthly Tracker Completo</span>
          <span>→</span>
        </button>
      </div>
    `;
  }

  function renderEfficiencyTab(trades, initialCapital) {
    const data = Model.calculateEfficiency(trades, initialCapital, {
      strategy: panelFilters.strategy,
      period: panelFilters.period
    });

    return `
      <!-- Super Hero Card de Eficiência Econômica (ROCE) -->
      <div class="truth-hero-metric-card">
        <div>
          <div class="truth-hero-metric-title">⭐ MÉTRICA PRIORITÁRIA DE EFICIÊNCIA DO CAPITAL</div>
          <div class="truth-hero-metric-val ${data.returnPerCapitalDayPct >= 0 ? 'good' : 'bad'}">
            ${fmtPct(data.returnPerCapitalDayPct, 3)} <small style="font-size:16px; font-weight:600; color:var(--tp-text-sub);">/ dia</small>
          </div>
          <div class="truth-hero-metric-desc">
            Gera <b>${fmtMoney(data.netPerThousandCapitalDays)}</b> líquido para cada R$ 1.000,00 de capital mantido sob risco por 1 dia no mercado.
          </div>
        </div>
        <div class="truth-hero-metric-footer">
          <span><b>${(data.totalCapitalDays || 0).toLocaleString('pt-BR')}</b> Capital-Dias apurados</span>
          <span>•</span>
          <span>Equiv. Anual: <b>${fmtPct((data.returnPerCapitalDayPct || 0) * 365, 1)} a.a.</b></span>
          <span>•</span>
          <span>Capital de Referência: <b>${fmtMoney(initialCapital)}</b></span>
        </div>
      </div>

      <!-- Grid de Métricas de Eficiência e Giro -->
      <div class="truth-kpi-grid" style="margin-top: 20px;">
        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Expectativa por Trade</span>
          <span class="truth-kpi-value ${data.expectancyPerTradeAmount >= 0 ? 'positive' : 'negative'}">${fmtMoney(data.expectancyPerTradeAmount)}</span>
          <span class="truth-kpi-sub">${data.expectancyPerTradeR >= 0 ? '+' : ''}${fmtNum(data.expectancyPerTradeR, 2)}R por operação</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Payoff Ratio</span>
          <span class="truth-kpi-value ${data.payoffRatio >= 2.0 ? 'positive' : 'neutral'}">${fmtNum(data.payoffRatio, 2)}x</span>
          <span class="truth-kpi-sub">Ganho médio ÷ Perda média</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Payoff Ajustado</span>
          <span class="truth-kpi-value neutral">${fmtNum(data.adjustedPayoff, 2)}x</span>
          <span class="truth-kpi-sub">Ponderado pela taxa de acerto</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Ganho Médio</span>
          <span class="truth-kpi-value positive">${fmtMoney(data.avgWinAmount)}</span>
          <span class="truth-kpi-sub">${data.avgWinR ? `+${fmtNum(data.avgWinR, 2)}R médio` : 'Operações vencedoras'}</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Perda Média</span>
          <span class="truth-kpi-value negative">${fmtMoney(data.avgLossAmount)}</span>
          <span class="truth-kpi-sub">${data.avgLossR ? `-${fmtNum(data.avgLossR, 2)}R médio` : 'Operações perdedoras'}</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Fator de Lucro</span>
          <span class="truth-kpi-value ${data.profitFactor >= 1.5 ? 'positive' : 'neutral'}">${fmtNum(data.profitFactor, 2)}</span>
          <span class="truth-kpi-sub">Lucro bruto ÷ Perda bruta</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Rotatividade (Turnover)</span>
          <span class="truth-kpi-value neutral">${fmtNum(data.capitalTurnover, 1)}x</span>
          <span class="truth-kpi-sub">Reciclagem do capital da carteira</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Frequência Operacional</span>
          <span class="truth-kpi-value neutral">${fmtNum(data.tradesPerMonth, 1)} <small style="font-size:14px;">trades/mês</small></span>
          <span class="truth-kpi-sub">Cadência de oportunidades</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Tempo Médio de Exposição</span>
          <span class="truth-kpi-value neutral">${fmtNum(data.avgHoldingSessions, 1)} <small style="font-size:14px;">pregões</small></span>
          <span class="truth-kpi-sub">Mediana: ${fmtNum(data.medianHoldingSessions, 0)}p (${fmtNum(data.avgHoldingDays, 1)} dias)</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Expectativa Mensal Projetada</span>
          <span class="truth-kpi-value ${data.projectedMonthlyExpectancy >= 0 ? 'positive' : 'negative'}">${fmtMoney(data.projectedMonthlyExpectancy)}</span>
          <span class="truth-kpi-sub">Média real observada: <b>${fmtMoney(data.observedMonthlyAverage)}/mês</b></span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Retorno s/ Capital Empregado</span>
          <span class="truth-kpi-value ${data.returnOnCapitalDeployedPct >= 0 ? 'positive' : 'negative'}">${fmtPct(data.returnOnCapitalDeployedPct, 1)}</span>
          <span class="truth-kpi-sub">Rentabilidade pura alocada (ROCD)</span>
        </div>
      </div>
    `;
  }

  function renderQualityTab(trades) {
    const data = Model.calculateQuality(trades);

    return `
      <!-- Breakdowns de Qualidade e Edge Técnico (Cards compactos e alinhados) -->
      <div class="truth-section-grid four-col">
        <div class="truth-card truth-breakdown-card">
          <div class="truth-card-head">
            <div>
              <h3>Resultado por Nível de R</h3>
              <span>Assimetria de retorno</span>
            </div>
          </div>
          <div class="truth-breakdown-list">
            ${data.byRLevel.map(b => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:6px 0; border-bottom:1px solid var(--tp-border);">
                <div>
                  <b style="color:var(--tp-navy);">${safe(b.label)}</b>
                  <small style="display:block; color:var(--tp-text-sub);">${b.count} trade(s) · ${b.pct}%</small>
                </div>
                <strong style="color:${b.net >= 0 ? 'var(--tp-green-dark)' : 'var(--tp-red)'}; font-size:13px;">${fmtMoney(b.net)}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="truth-card truth-breakdown-card">
          <div class="truth-card-head">
            <div>
              <h3>Motivo de Saída</h3>
              <span>Categorias canônicas</span>
            </div>
          </div>
          <div class="truth-breakdown-list">
            ${data.byExitReason.map(b => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:6px 0; border-bottom:1px solid var(--tp-border);">
                <div>
                  <b style="color:var(--tp-navy);">${safe(b.label)}</b>
                  <small style="display:block; color:var(--tp-text-sub);">${b.count} trade(s) · ${b.winRatePct}% win</small>
                </div>
                <strong style="color:${b.net >= 0 ? 'var(--tp-green-dark)' : 'var(--tp-red)'}; font-size:13px;">${fmtMoney(b.net)}</strong>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="truth-card truth-breakdown-card">
          <div class="truth-card-head">
            <div>
              <h3>Distância da SMA na Entrada</h3>
              <span>Localização técnica</span>
            </div>
          </div>
          <div class="truth-breakdown-list">
            ${data.byDistSma.map(b => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:10px 0; border-bottom:1px solid var(--tp-border);">
                <b style="color:var(--tp-navy);">${safe(b.label)}</b>
                <span class="truth-badge neutral">${b.count} trade(s)</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="truth-card truth-breakdown-card">
          <div class="truth-card-head">
            <div>
              <h3>Permanência (Holding)</h3>
              <span>Tempo de exposição</span>
            </div>
          </div>
          <div class="truth-breakdown-list">
            ${data.byHoldingPeriod.map(b => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:6px 0; border-bottom:1px solid var(--tp-border);">
                <div>
                  <b style="color:var(--tp-navy);">${safe(b.label)}</b>
                  <small style="display:block; color:var(--tp-text-sub);">${b.count} trade(s) · ${b.winRatePct}% win</small>
                </div>
                <strong style="color:${b.net >= 0 ? 'var(--tp-green-dark)' : 'var(--tp-red)'}; font-size:13px;">${fmtMoney(b.net)}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Personal Bell Curve & Qualidade Estatística (SQN) -->
      <div class="truth-section-grid" style="margin-top: 20px;">
        <div class="truth-card">
          <div class="truth-card-head">
            <div>
              <h3>Personal Bell Curve (Distribuição em R)</h3>
              <span>Histograma dos retornos reais normalizados pelo risco inicial</span>
            </div>
          </div>
          <div class="truth-chart-wrap">
            ${renderBellCurveSvg(data.bellCurve.bins)}
          </div>
        </div>

        <div class="truth-card">
          <div class="truth-card-head">
            <div>
              <h3>Qualidade Estatística do Sistema (SQN)</h3>
              <span>Métrica de Van Tharp: Consistência do edge matemático</span>
            </div>
            <button type="button" class="truth-btn-secondary" onclick="typeof go==='function'&&go('systemquality')">
              Explorar SQN →
            </button>
          </div>
          <div style="display:flex; align-items:center; gap:24px; padding:16px 0;">
            <div>
              <div style="font-size:36px; font-weight:850; color:var(--tp-navy); line-height:1;">
                ${data.sqn > 0 ? fmtNum(data.sqn, 2) : '—'}
              </div>
              <div style="margin-top:4px;">
                <span class="truth-badge ${data.sqn >= 2.0 ? 'good' : 'neutral'}">${safe(data.sqnLabel)}</span>
              </div>
            </div>
            <p style="margin:0; font-size:12px; color:var(--tp-text-sub); line-height:1.5;">
              O SQN mede a facilidade de rentabilizar um método com dimensionamento de posições. Scores acima de 2.0 indicam sistemas robustos e reprodutíveis.
            </p>
          </div>

          <!-- Expected Value por Grade A, B, C, D -->
          <div style="margin-top:16px; border-top:1px solid var(--tp-border); padding-top:14px;">
            <h4 style="margin:0 0 10px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; color:var(--tp-navy);">Expected Value por Qualidade (Grade)</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px;">
              ${data.byGrade.map(g => `
                <div style="padding:10px 12px; border:1px solid var(--tp-border); border-radius:var(--tp-radius-sm); background:#F8FAFC;">
                  <span class="truth-badge grade-${g.grade.toLowerCase()}">Grade ${safe(g.grade)}</span>
                  <div style="font-size:14px; font-weight:800; color:var(--tp-navy); margin-top:6px;">${fmtMoney(g.expectancyAmount)} <small style="font-size:10px; color:var(--tp-text-sub);">/ trade</small></div>
                  <small style="display:block; font-size:11px; color:var(--tp-text-sub);">${g.count} trades · ${g.winRatePct}% win</small>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela Monthly Tracker (12 Meses) -->
      <div class="truth-card truth-monthly-tracker-card" style="margin-top: 20px;">
        <div class="truth-card-head">
          <div>
            <div class="truth-card-eyebrow">Acompanhamento Mensal</div>
            <h3 style="display: flex; align-items: center; gap: 8px;">
              <span>📅</span> Monthly Tracker · Ano ${data.year}
            </h3>
            <span>Acompanhamento sistemático mensal de resultados, perdas e permanência</span>
          </div>
        </div>
        <div class="truth-table-wrap">
          <table class="truth-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Trades</th>
                <th>Ganho Médio</th>
                <th>Perda Média</th>
                <th>Win %</th>
                <th>Maior Ganho</th>
                <th>Maior Perda</th>
                <th>Dias Ganhos</th>
                <th>Dias Perdas</th>
              </tr>
            </thead>
            <tbody>
              ${data.monthlyStats.map(m => `
                <tr>
                  <td><b>${m.month}</b></td>
                  <td>${m.tradesCount}</td>
                  <td>${m.avgWinR !== null ? `${fmtNum(m.avgWinR, 2)}R` : '—'}</td>
                  <td>${m.avgLossR !== null ? `${fmtNum(m.avgLossR, 2)}R` : '—'}</td>
                  <td>${m.winRatePct !== null ? `${fmtNum(m.winRatePct, 0)}%` : '—'}</td>
                  <td class="money good">${m.largestGain > 0 ? fmtMoney(m.largestGain) : '—'}</td>
                  <td class="money bad">${m.largestLoss < 0 ? fmtMoney(m.largestLoss) : '—'}</td>
                  <td>${m.avgWinDays !== null ? fmtNum(m.avgWinDays, 1) : '—'}</td>
                  <td>${m.avgLossDays !== null ? fmtNum(m.avgLossDays, 1) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderBehaviorTab(trades) {
    const data = Model.calculateBehavior(trades);

    return `
      <!-- Indicadores de Comportamento e Disciplina -->
      <div class="truth-kpi-grid">
        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Maior Sequência de Ganhos</span>
          <span class="truth-kpi-value positive">${data.maxConsecutiveWins} <small style="font-size:14px;">trades</small></span>
          <span class="truth-kpi-sub">Recorde consecutivo positivo</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Maior Sequência de Perdas</span>
          <span class="truth-kpi-value negative">${data.maxConsecutiveLosses} <small style="font-size:14px;">trades</small></span>
          <span class="truth-kpi-sub">Controle emocional nos drawdowns</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Dias Ganhos vs Dias Perdidos</span>
          <span class="truth-kpi-value neutral">${data.winDaysCount} / ${data.lossDaysCount}</span>
          <span class="truth-kpi-sub">${data.winDaysCount + data.lossDaysCount} dias com encerramentos</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Permanência nos Ganhos</span>
          <span class="truth-kpi-value positive">${fmtNum(data.avgWinDays, 1)} <small style="font-size:14px;">dias</small></span>
          <span class="truth-kpi-sub">Deixar o lucro correr</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Permanência nas Perdas</span>
          <span class="truth-kpi-value negative">${fmtNum(data.avgLossDays, 1)} <small style="font-size:14px;">dias</small></span>
          <span class="truth-kpi-sub">Cortar perdas rapidamente</span>
        </div>
      </div>

      <!-- Leitura por Contexto (Setup e Ciclo) -->
      <div class="truth-section-grid" style="margin-top: 20px;">
        <div class="truth-card">
          <div class="truth-card-head">
            <div>
              <h3>Resultado por Setup</h3>
              <span>Comparativo de eficácia dos padrões operados</span>
            </div>
          </div>
          <div class="truth-table-wrap">
            <table class="truth-table">
              <thead>
                <tr>
                  <th>Setup</th>
                  <th>Trades</th>
                  <th>Win %</th>
                  <th>Resultado</th>
                  <th>Expectativa</th>
                </tr>
              </thead>
              <tbody>
                ${data.bySetup.map(s => `
                  <tr>
                    <td><b>${safe(s.label)}</b></td>
                    <td>${s.count}</td>
                    <td>${fmtNum(s.winRatePct, 0)}%</td>
                    <td class="money ${s.net >= 0 ? 'good' : 'bad'}">${fmtMoney(s.net)}</td>
                    <td>${s.expectancyR >= 0 ? '+' : ''}${fmtNum(s.expectancyR, 2)}R</td>
                  </tr>
                `).join('') || '<tr><td colspan="5" style="text-align:center;">Sem operações encerradas.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="truth-card">
          <div class="truth-card-head">
            <div>
              <h3>Resultado por Ciclo de Mercado</h3>
              <span>Aderência à permissão de mercado</span>
            </div>
          </div>
          <div class="truth-table-wrap">
            <table class="truth-table">
              <thead>
                <tr>
                  <th>Contexto de Mercado</th>
                  <th>Trades</th>
                  <th>Win %</th>
                  <th>Resultado</th>
                  <th>Expectativa</th>
                </tr>
              </thead>
              <tbody>
                ${data.byMarketCycle.map(c => `
                  <tr>
                    <td><b>${safe(c.label)}</b></td>
                    <td>${c.count}</td>
                    <td>${fmtNum(c.winRatePct, 0)}%</td>
                    <td class="money ${c.net >= 0 ? 'good' : 'bad'}">${fmtMoney(c.net)}</td>
                    <td>${c.expectancyR >= 0 ? '+' : ''}${fmtNum(c.expectancyR, 2)}R</td>
                  </tr>
                `).join('') || '<tr><td colspan="5" style="text-align:center;">Sem operações encerradas.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Leitura do Processo e Disciplina Operacional -->
      <div class="truth-card" style="margin-top: 20px;">
        <div class="truth-card-head">
          <div>
            <h3>Leitura do Processo & Disciplina</h3>
            <span>O dado aponta a direção; o processo decide o risco.</span>
          </div>
        </div>
        <p style="margin:0; font-size:13px; color:var(--tp-text-sub); line-height:1.6;">
          A consistência profissional não vem de evitar perdas, mas de mantê-las estritamente truncadas em no máximo 1R, enquanto os ganhos nos melhores setups pagam a conta e expandem a curva patrimonial. Se o seu tempo médio nas perdas for maior que nos ganhos, interrompa novas entradas e revise sua adesão ao stop técnico.
        </p>
      </div>
    `;
  }

  function renderRiskTab(trades, initialCapital) {
    const data = Model.calculateRisk(trades, initialCapital);

    // Dados de Monte Carlo se disponível
    let mcData = null;
    if (RiskOfRuinModel && typeof RiskOfRuinModel.runMonteCarloSimulation === 'function') {
      try {
        mcData = RiskOfRuinModel.runMonteCarloSimulation(trades, {
          simulationsCount: 1000,
          horizonTrades: 200,
          maxDrawdownLimitPct: 20,
          ruinProbabilityTolerancePct: 5,
          minSampleRequired: 20
        }, {
          accountCurrentDrawdownPct: data.currentDrawdownPct,
          accountMaxDrawdownPct: data.maxDrawdownPct
        });
      } catch (_) {}
    }

    return `
      <!-- KPIs de Risco e Proteção -->
      <div class="truth-kpi-grid">
        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Drawdown Máximo</span>
          <span class="truth-kpi-value negative">-${fmtNum(data.maxDrawdownPct, 1)}%</span>
          <span class="truth-kpi-sub">${fmtMoney(data.maxDrawdownAmount)} de pico histórico</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Drawdown Atual</span>
          <span class="truth-kpi-value ${data.currentDrawdownPct > 5 ? 'negative' : 'neutral'}">-${fmtNum(data.currentDrawdownPct, 1)}%</span>
          <span class="truth-kpi-sub">${fmtMoney(data.currentDrawdownAmount)} do topo</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Recuperação de DD</span>
          <span class="truth-kpi-value ${data.currentDrawdownPct === 0 ? 'positive' : 'neutral'}">
            ${data.currentDrawdownPct === 0 ? 'No Topo' : 'Sob Risco'}
          </span>
          <span class="truth-kpi-sub">${data.currentDrawdownPct === 0 ? 'Patrimônio em máxima histórica' : 'Em fase de amortecimento'}</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Volatilidade dos Retornos</span>
          <span class="truth-kpi-value neutral">${fmtMoney(data.volatility)}</span>
          <span class="truth-kpi-sub">Desvio padrão financeiro</span>
        </div>

        <div class="truth-kpi-card">
          <span class="truth-kpi-label">Pico de Exposição</span>
          <span class="truth-kpi-value neutral">${fmtMoney(data.peakSimultaneousCapital)}</span>
          <span class="truth-kpi-sub">Capital máximo alocado</span>
        </div>
      </div>

      <!-- Proteção de Capital & Curva de Drawdown -->
      <div class="truth-card" style="margin-top: 20px;">
        <div class="truth-card-head">
          <div>
            <h3>Proteção de Capital (Curva Histórica de Drawdown)</h3>
            <span>Profundidade e duração de retrações temporárias</span>
          </div>
          <span class="truth-badge bad">Limite de Política: 20%</span>
        </div>
        <div class="truth-chart-wrap">
          ${renderLineChartSvg(data.equitySeries?.points, 'drawdownAmount', 'red')}
        </div>
      </div>

      <!-- Projeção Estatística de Risco de Ruína (Monte Carlo) -->
      <div class="truth-card" style="margin-top: 20px;">
        <div class="truth-card-head">
          <div>
            <span class="truth-eyebrow">HISTÓRICO OBSERVADO VS PROJEÇÃO ESTATÍSTICA</span>
            <h3 style="margin-top:4px;">Projeção de Risco de Ruína (Monte Carlo 200 Trades)</h3>
            <span>Separação rigorosa entre o que ocorreu no histórico e o risco estocástico futuro</span>
          </div>
          <button type="button" class="truth-btn-secondary" onclick="typeof go==='function'&&go('riskofruin')">
            Ver simulação completa →
          </button>
        </div>

        <div class="truth-section-grid three-col" style="margin-top:14px;">
          <div style="padding:14px; border:1px solid var(--tp-border); border-radius:var(--tp-radius-md); background:#F8FAFC;">
            <small style="font-size:10px; font-weight:800; text-transform:uppercase; color:var(--tp-text-sub);">1. Histórico Realizado (Passado)</small>
            <div style="font-size:12px; color:var(--tp-text-sub); margin-top:4px;">Drawdown Máximo Observado</div>
            <strong style="font-size:22px; font-weight:800; color:var(--tp-navy); display:block; margin:4px 0;">-${fmtNum(data.maxDrawdownPct, 1)}%</strong>
            <small style="font-size:11px; color:var(--tp-text-sub);">${trades.length} trade(s) na amostra</small>
          </div>

          <div style="padding:14px; border:1px solid var(--tp-border); border-radius:var(--tp-radius-md); background:#F8FAFC;">
            <small style="font-size:10px; font-weight:800; text-transform:uppercase; color:var(--tp-text-sub);">2. Estado Atual da Conta (Presente)</small>
            <div style="font-size:12px; color:var(--tp-text-sub); margin-top:4px;">Drawdown Atual vs Topo</div>
            <strong style="font-size:22px; font-weight:800; color:var(--tp-navy); display:block; margin:4px 0;">-${fmtNum(data.currentDrawdownPct, 1)}%</strong>
            <small style="font-size:11px; color:var(--tp-text-sub);">Distância da máxima patrimonial</small>
          </div>

          <div style="padding:14px; border:1px solid var(--tp-border); border-radius:var(--tp-radius-md); background:#F8FAFC;">
            <small style="font-size:10px; font-weight:800; text-transform:uppercase; color:var(--tp-text-sub);">3. Projeção Monte Carlo (Futuro)</small>
            <div style="font-size:12px; color:var(--tp-text-sub); margin-top:4px;">Probabilidade de Atingir 20% DD</div>
            <strong style="font-size:22px; font-weight:800; color:${mcData?.ruinProbabilityPct > 5 ? 'var(--tp-red)' : 'var(--tp-green-dark)'}; display:block; margin:4px 0;">
              ${mcData ? (mcData.isSufficientSample ? fmtPct(mcData.ruinProbabilityPct, 1) : 'Dados insuficientes') : '0,0%'}
            </strong>
            <small style="font-size:11px; color:var(--tp-text-sub);">1.000 trajetórias estocásticas</small>
          </div>
        </div>
      </div>

      <!-- Concentração de Risco por Ativo -->
      <div class="truth-card" style="margin-top: 20px;">
        <div class="truth-card-head">
          <div>
            <h3>Concentração por Ativo</h3>
            <span>Top ativos com maior capital comprometido e resultado gerado</span>
          </div>
        </div>
        <div class="truth-table-wrap">
          <table class="truth-table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Capital Alocado</th>
                <th>Trades</th>
                <th>Resultado Líquido</th>
              </tr>
            </thead>
            <tbody>
              ${data.topAssets.map(a => `
                <tr>
                  <td><b>${safe(a.symbol)}</b></td>
                  <td>${fmtMoney(a.capitalAllocated)}</td>
                  <td>${a.tradesCount}</td>
                  <td class="money ${a.netResult >= 0 ? 'good' : 'bad'}">${fmtMoney(a.netResult)}</td>
                </tr>
              `).join('') || '<tr><td colspan="4" style="text-align:center;">Sem ativos registrados.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // EXPORTAÇÕES E UTILITÁRIOS
  // =========================================================================

  function exportCsv(filteredTrades) {
    const rows = [
      ['Fechamento', 'Ativo', 'Estratégia', 'Setup', 'Direção', 'Grau', 'Conta', 'Ciclo de Mercado', 'Resultado (R$)', 'Resultado (R)'],
      ...filteredTrades.map(t => {
        const norm = Model.normalizeTrade(t);
        return [
          norm.exitDate || norm.closedAt?.toISOString?.() || '',
          norm.symbol,
          norm.strategyType,
          norm.setup,
          norm.direction,
          norm.grade,
          norm.accountLabel,
          norm.marketCycleLabel,
          norm.netResult,
          norm.r
        ];
      })
    ];

    const csvContent = rows.map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `painel-da-verdade-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  // =========================================================================
  // COMPONENTE PRINCIPAL RENDER
  // =========================================================================

  function render(container, rawTrades = null) {
    if (!container) return;
    const trades = Array.isArray(rawTrades)
      ? rawTrades
      : (Array.isArray(window.synchronizedTrades) ? window.synchronizedTrades : []);

    const closedTrades = trades.filter(t => t && String(t.status || '').toLowerCase() === 'closed');
    const filteredTrades = Model.filterTrades(closedTrades, panelFilters);
    const initialCapital = (typeof root.getOperationalEquity === 'function' ? root.getOperationalEquity() : 100000);

    // Lista de opções únicas para os selects
    const assets = [...new Set(closedTrades.map(t => t.ticker || t.asset).filter(Boolean))].sort();
    const setups = [...new Set(closedTrades.map(t => t.setup || 'Setup não informado').filter(Boolean))].sort();

    let tabContentHtml = '';
    if (activeTab === 'efficiency') {
      tabContentHtml = renderEfficiencyTab(filteredTrades, initialCapital);
    } else if (activeTab === 'quality') {
      tabContentHtml = renderQualityTab(filteredTrades);
    } else if (activeTab === 'behavior') {
      tabContentHtml = renderBehaviorTab(filteredTrades);
    } else if (activeTab === 'risk') {
      tabContentHtml = renderRiskTab(filteredTrades, initialCapital);
    } else {
      tabContentHtml = renderOverviewTab(filteredTrades, initialCapital);
    }

    container.innerHTML = `
      <div class="truth-shell">
        <!-- 1. Header Hero -->
        <header class="truth-hero">
          <div class="truth-hero-main">
            <div class="truth-eyebrow">
              <span>●</span> PAINEL DA VERDADE · HEALTHY ANALYTICS
            </div>
            <h1>O Espelho do Seu Trading.</h1>
            <p>Performance, risco e comportamento calculados com rigor matemático somente a partir das operações encerradas.</p>
          </div>
          <div class="truth-hero-badge">
            <span class="truth-badge-dot"></span>
            <span>${filteredTrades.length} de ${closedTrades.length} trades selecionados</span>
          </div>
        </header>

        <!-- 2. Navegação por Abas (5 Abas) -->
        <nav class="truth-tabs-bar" role="tablist">
          <button type="button" class="truth-tab-btn ${activeTab === 'overview' ? 'active' : ''}" data-truth-tab="overview">
            <span class="truth-tab-icon">📊</span>
            <span>Visão Geral</span>
          </button>
          <button type="button" class="truth-tab-btn ${activeTab === 'efficiency' ? 'active' : ''}" data-truth-tab="efficiency">
            <span class="truth-tab-icon">⚡</span>
            <span>Eficiência</span>
          </button>
          <button type="button" class="truth-tab-btn ${activeTab === 'quality' ? 'active' : ''}" data-truth-tab="quality">
            <span class="truth-tab-icon">🎯</span>
            <span>Qualidade & Monthly Tracker</span>
          </button>
          <button type="button" class="truth-tab-btn ${activeTab === 'behavior' ? 'active' : ''}" data-truth-tab="behavior">
            <span class="truth-tab-icon">🧠</span>
            <span>Comportamento</span>
          </button>
          <button type="button" class="truth-tab-btn ${activeTab === 'risk' ? 'active' : ''}" data-truth-tab="risk">
            <span class="truth-tab-icon">🛡️</span>
            <span>Risco</span>
          </button>
        </nav>

        <!-- 3. Barra de Filtros Global -->
        <section class="truth-filter-bar">
          <div class="truth-filter-fields">
            <div class="truth-filter-group">
              <label>Período</label>
              <select class="truth-filter-select" data-truth-filter="period">
                <option value="all" ${panelFilters.period === 'all' ? 'selected' : ''}>Todo o histórico</option>
                <option value="30" ${panelFilters.period === '30' ? 'selected' : ''}>Últimos 30 dias</option>
                <option value="90" ${panelFilters.period === '90' ? 'selected' : ''}>Últimos 90 dias</option>
                <option value="120" ${panelFilters.period === '120' ? 'selected' : ''}>Últimos 120 dias</option>
                <option value="180" ${panelFilters.period === '180' ? 'selected' : ''}>Últimos 6 meses</option>
                <option value="365" ${panelFilters.period === '365' ? 'selected' : ''}>Últimos 12 meses</option>
              </select>
            </div>

            <div class="truth-filter-group">
              <label>Ativo</label>
              <select class="truth-filter-select" data-truth-filter="asset">
                <option value="">Todos os ativos</option>
                ${assets.map(a => `<option value="${safe(a)}" ${panelFilters.asset === a ? 'selected' : ''}>${safe(a)}</option>`).join('')}
              </select>
            </div>

            <div class="truth-filter-group">
              <label>Setup</label>
              <select class="truth-filter-select" data-truth-filter="setup">
                <option value="">Todos os setups</option>
                ${setups.map(s => `<option value="${safe(s)}" ${panelFilters.setup === s ? 'selected' : ''}>${safe(s)}</option>`).join('')}
              </select>
            </div>

            <div class="truth-filter-group">
              <label>Estratégia</label>
              <select class="truth-filter-select" data-truth-filter="strategy">
                <option value="ALL" ${panelFilters.strategy === 'ALL' ? 'selected' : ''}>Todas as estratégias</option>
                <option value="TREND_FOLLOWING" ${panelFilters.strategy === 'TREND_FOLLOWING' ? 'selected' : ''}>Trend Following</option>
                <option value="VOLATILITY_TRADING" ${panelFilters.strategy === 'VOLATILITY_TRADING' ? 'selected' : ''}>Volatility Trading</option>
              </select>
            </div>

            <div class="truth-filter-group">
              <label>Direção</label>
              <select class="truth-filter-select" data-truth-filter="direction">
                <option value="">Long e short</option>
                <option value="long" ${panelFilters.direction === 'long' ? 'selected' : ''}>Long (Compra)</option>
                <option value="short" ${panelFilters.direction === 'short' ? 'selected' : ''}>Short (Venda)</option>
              </select>
            </div>

            <div class="truth-filter-group">
              <label>Grau</label>
              <select class="truth-filter-select" data-truth-filter="grade">
                <option value="">Todos os graus</option>
                <option value="A" ${panelFilters.grade === 'A' ? 'selected' : ''}>Grade A</option>
                <option value="B" ${panelFilters.grade === 'B' ? 'selected' : ''}>Grade B</option>
                <option value="C" ${panelFilters.grade === 'C' ? 'selected' : ''}>Grade C</option>
                <option value="D" ${panelFilters.grade === 'D' ? 'selected' : ''}>Grade D</option>
              </select>
            </div>

            <div class="truth-filter-group">
              <label>Conta</label>
              <select class="truth-filter-select" data-truth-filter="account">
                <option value="">Todas as contas</option>
                <option value="Conta real" ${panelFilters.account === 'Conta real' ? 'selected' : ''}>Conta Real</option>
                <option value="Paper Trading" ${panelFilters.account === 'Paper Trading' ? 'selected' : ''}>Paper Trading</option>
              </select>
            </div>
          </div>

          <div class="truth-filter-actions">
            <button type="button" class="truth-btn-ghost" data-truth-action="reset">
              <span>🔄</span> Limpar filtros
            </button>
            <button type="button" class="truth-btn-secondary" data-truth-action="export-csv">
              <span>📥</span> Exportar CSV
            </button>
            <button type="button" class="truth-btn-secondary" data-truth-action="print">
              <span>🖨️</span> Imprimir relatório
            </button>
          </div>
        </section>

        <!-- 4. Conteúdo da Aba Selecionada -->
        <main class="truth-tab-content" id="truthTabContent">
          ${tabContentHtml}
        </main>
      </div>
    `;

    bindEvents(container, trades);
  }

  function bindEvents(container, trades) {
    // 1. Troca de Abas
    container.querySelectorAll('[data-truth-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-truth-tab');
        if (targetTab && targetTab !== activeTab) {
          activeTab = targetTab;
          render(container, trades);
        }
      });
    });

    // 1.1 Mudança direta de aba via links/botões internos
    container.querySelectorAll('[data-switch-to-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-switch-to-tab');
        if (targetTab) {
          activeTab = targetTab;
          render(container, trades);
          if (targetTab === 'quality') {
            setTimeout(() => {
              container.querySelector('.truth-monthly-tracker-card')?.scrollIntoView({ behavior: 'smooth' });
            }, 60);
          }
        }
      });
    });

    // 2. Mudança nos Filtros
    container.querySelectorAll('[data-truth-filter]').forEach(select => {
      select.addEventListener('change', () => {
        const key = select.getAttribute('data-truth-filter');
        if (key) {
          panelFilters[key] = select.value;
          render(container, trades);
        }
      });
    });

    // 3. Ações: Limpar Filtros
    container.querySelector('[data-truth-action="reset"]')?.addEventListener('click', () => {
      panelFilters = {
        period: 'all',
        asset: '',
        setup: '',
        strategy: 'ALL',
        direction: '',
        grade: '',
        account: ''
      };
      render(container, trades);
    });

    // 4. Ações: Exportar CSV
    container.querySelector('[data-truth-action="export-csv"]')?.addEventListener('click', () => {
      const closedTrades = trades.filter(t => t && String(t.status || '').toLowerCase() === 'closed');
      const filteredTrades = Model.filterTrades(closedTrades, panelFilters);
      exportCsv(filteredTrades);
    });

    // 5. Ações: Imprimir Relatório
    container.querySelector('[data-truth-action="print"]')?.addEventListener('click', () => {
      window.print();
    });
  }

  root.TruthPanel = {
    render,
    getActiveTab: () => activeTab,
    setActiveTab: (tab) => { activeTab = tab; },
    getFilters: () => ({ ...panelFilters }),
    setFilters: (f) => { panelFilters = { ...panelFilters, ...f }; }
  };

  // Garante exposição definitiva do renderizador global para eliminar intermitência
  root.renderAnalyticsFromDatabase = function (trades) {
    const container = document.getElementById('analytics');
    if (!container) return;
    const tr = trades || root.synchronizedTrades || (typeof synchronizedTrades !== 'undefined' ? synchronizedTrades : []);
    render(container, tr);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('healthyTrend:tradesUpdated', () => {
      const page = document.getElementById('analytics');
      if (page && (page.classList.contains('active') || page.querySelector('.truth-shell'))) {
        const tr = window.synchronizedTrades || [];
        render(page, tr);
      }
    });

    window.addEventListener('healthyTrend:authenticated', () => {
      const page = document.getElementById('analytics');
      if (page && page.classList.contains('active')) {
        const tr = window.synchronizedTrades || [];
        render(page, tr);
      }
    });

    const checkAndMount = () => {
      const page = document.getElementById('analytics');
      if (page && page.classList.contains('active')) {
        const tr = window.synchronizedTrades || (typeof synchronizedTrades !== 'undefined' ? synchronizedTrades : []);
        render(page, tr);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', checkAndMount);
    } else {
      checkAndMount();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

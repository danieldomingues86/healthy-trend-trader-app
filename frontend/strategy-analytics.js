/**
 * Healthy Trend Trader — Strategy Analytics UI Component
 *
 * Componente de visualização analítica multi-estratégia:
 * 1. Trend Following Analytics (Setups, Regimes, RS, Grades, R-multiples, SQN)
 * 2. Volatility Trading Analytics (Níveis IFR2, SMA7, SMA200, ATR%, Holding, Motivos de Saída)
 * 3. Consolidado de Carteira (Resultado total, contribuição, exposição simultânea, correlação de retornos, drawdown real)
 */

(function (root) {
  'use strict';

  const model = root.StrategyAnalyticsModel;

  let activeScope = 'CONSOLIDATED'; // 'TREND_FOLLOWING' | 'VOLATILITY_TRADING' | 'CONSOLIDATED'
  let activePeriod = 'ALL';
  let activeMarket = 'ALL';

  function money(val) {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function pct(val, decimals = 1) {
    const n = Number(val || 0);
    return (n >= 0 ? '+' : '') + n.toFixed(decimals) + '%';
  }

  function num(val, decimals = 1) {
    return Number(val || 0).toFixed(decimals);
  }

  function render(container, rawTrades = null) {
    if (!container) return;
    const trades = Array.isArray(rawTrades)
      ? rawTrades
      : (Array.isArray(window.synchronizedTrades) ? window.synchronizedTrades : []);

    // Se o usuário selecionou uma estratégia global no workspace e nunca alternou a aba aqui,
    // sincroniza com a estratégia ativa
    if (window.healthyTrendWorkspace && !window._analyticsUserToggledScope) {
      const gStrat = window.healthyTrendWorkspace.getStrategy();
      if (gStrat === 'volatility_trading' && activeScope === 'CONSOLIDATED') {
        activeScope = 'VOLATILITY_TRADING';
      } else if (gStrat === 'trend_following' && activeScope === 'CONSOLIDATED') {
        activeScope = 'TREND_FOLLOWING';
      }
    }

    const filtered = model ? model.filterTrades(trades, {
      strategy: activeScope === 'CONSOLIDATED' ? 'ALL' : activeScope,
      period: activePeriod,
      market: activeMarket
    }) : trades;

    container.innerHTML = `
      <div class="analytics-strat-nav">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:12px; font-weight:800; color:#94a3b8; text-transform:uppercase;">Visão Analítica:</span>
          <div class="analytics-strat-switcher">
            <button type="button" class="analytics-strat-btn is-trend ${activeScope === 'TREND_FOLLOWING' ? 'active' : ''}" data-analytics-scope="TREND_FOLLOWING">
              <span>🌿 Trend Following</span>
            </button>
            <button type="button" class="analytics-strat-btn is-vol ${activeScope === 'VOLATILITY_TRADING' ? 'active' : ''}" data-analytics-scope="VOLATILITY_TRADING">
              <span>⚡ Volatility Trading</span>
            </button>
            <button type="button" class="analytics-strat-btn is-comparison ${activeScope === 'COMPARISON' ? 'active' : ''}" data-analytics-scope="COMPARISON">
              <span>⚖️ Comparativo de Sistemas</span>
            </button>
            <button type="button" class="analytics-strat-btn is-consolidated ${activeScope === 'CONSOLIDATED' ? 'active' : ''}" data-analytics-scope="CONSOLIDATED">
              <span>🌐 Carteira Consolidada</span>
            </button>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          <select id="analyticsFilterPeriod" class="sim-header-select" style="font-size:12px; padding:6px 12px;">
            <option value="ALL" ${activePeriod === 'ALL' ? 'selected' : ''}>Todo o Histórico</option>
            <option value="30" ${activePeriod === '30' ? 'selected' : ''}>Últimos 30 dias</option>
            <option value="90" ${activePeriod === '90' ? 'selected' : ''}>Últimos 90 dias</option>
            <option value="120" ${activePeriod === '120' ? 'selected' : ''}>Últimos 120 dias</option>
            <option value="180" ${activePeriod === '180' ? 'selected' : ''}>Últimos 6 meses</option>
            <option value="365" ${activePeriod === '365' ? 'selected' : ''}>Últimos 12 meses</option>
          </select>

          <select id="analyticsFilterMarket" class="sim-header-select" style="font-size:12px; padding:6px 12px;">
            <option value="ALL" ${activeMarket === 'ALL' ? 'selected' : ''}>Todos os Mercados</option>
            <option value="B3" ${activeMarket === 'B3' ? 'selected' : ''}>B3 (Brasil)</option>
            <option value="US" ${activeMarket === 'US' ? 'selected' : ''}>Nasdaq (EUA)</option>
          </select>
        </div>
      </div>

      <div id="analyticsBodyContent">
        ${renderScopeContent(filtered, trades)}
      </div>

      <!-- Glossário e Explicabilidade -->
      <div class="analytics-glossary-card">
        <details>
          <summary style="font-size:13px; font-weight:800; color:#38bdf8; cursor:pointer;">
            📖 Definições, Fórmulas e Critérios Metodológicos das Métricas (Clique para expandir)
          </summary>
          <div class="analytics-glossary-grid">
            ${Object.values(model ? model.METRIC_DEFINITIONS : {}).map(def => `
              <div class="analytics-glossary-item">
                <strong>${def.name}</strong>
                <code>Fórmula: ${def.formula}</code>
                <p>${def.description}</p>
              </div>
            `).join('')}
          </div>
        </details>
      </div>
    `;

    bindEvents(container, trades);
  }

  function renderScopeContent(filteredTrades, allTrades) {
    if (!model) return '<p>Modelo analítico indisponível.</p>';
    const initialCap = (typeof root.getOperationalEquity === 'function' ? root.getOperationalEquity() : 100000);

    if (activeScope === 'COMPARISON') {
      const comparison = model.compareStrategies(filteredTrades, {
        initialCapital: initialCap,
        period: activePeriod,
        market: activeMarket
      });
      return renderComparisonHtml(comparison, initialCap);
    }

    if (activeScope === 'CONSOLIDATED') {
      const consolidated = model.calculateConsolidatedPortfolio(allTrades, {
        initialCapital: initialCap,
        period: activePeriod,
        market: activeMarket
      });
      return renderConsolidatedHtml(consolidated, initialCap);
    }

    if (activeScope === 'VOLATILITY_TRADING') {
      const volTrades = filteredTrades.filter(t => t.strategyType === 'VOLATILITY_TRADING');
      const metrics = model.calculateStrategyMetrics(volTrades, { initialCapital: initialCap, strategyType: 'VOLATILITY_TRADING', period: activePeriod });
      const breakdowns = model.calculateVolatilityBreakdowns(volTrades);
      return renderVolatilityHtml(metrics, breakdowns, initialCap);
    }

    // TREND_FOLLOWING
    const trendTrades = filteredTrades.filter(t => t.strategyType === 'TREND_FOLLOWING');
    const metrics = model.calculateStrategyMetrics(trendTrades, { initialCapital: initialCap, strategyType: 'TREND_FOLLOWING', period: activePeriod });
    const breakdowns = model.calculateTrendBreakdowns(trendTrades);
    return renderTrendHtml(metrics, breakdowns, initialCap);
  }

  function renderConsolidatedHtml(cons) {
    const c = cons.contribution || { trendFollowing: {}, volatilityTrading: {} };
    const tf = c.trendFollowing || {};
    const vol = c.volatilityTrading || {};
    const tfPct = Math.max(0, Math.min(100, tf.contributionPct || 50));
    const volPct = Math.max(0, Math.min(100, vol.contributionPct || 50));

    return `
      <!-- Alerta de Amostra Combinada -->
      ${cons.sampleSizeAlert ? `
        <div class="vol-sim-alert" style="margin-bottom:16px;">
          <span>⚠️</span>
          <div>${cons.sampleSizeWarning}</div>
        </div>
      ` : ''}

      <!-- Grid Principal Consolidado -->
      <div class="analytics-consolidated-grid">
        <div class="analytics-consolidated-card">
          <span class="vol-sim-kpi-label">Resultado Consolidado</span>
          <span class="vol-sim-kpi-val ${cons.totalNetProfit >= 0 ? 'positive' : 'negative'}">${money(cons.totalNetProfit)}</span>
          <span class="vol-sim-kpi-sub">${cons.totalTradesCount} operações concluídas no total</span>
        </div>

        <div class="analytics-consolidated-card">
          <span class="vol-sim-kpi-label">Drawdown Real da Carteira</span>
          <span class="vol-sim-kpi-val negative">${(cons.portfolioDrawdown?.maxDrawdownPct || 0).toFixed(2)}%</span>
          <span class="vol-sim-kpi-sub">${money(cons.portfolioDrawdown?.maxDrawdownAmount || 0)} (Amortecimento real)</span>
        </div>

        <div class="analytics-consolidated-card" style="border-color: rgba(245, 158, 11, 0.4);">
          <span class="vol-sim-kpi-label" style="color: #fbbf24;">⭐ Retorno / Capital-Dia</span>
          <span class="vol-sim-kpi-val ${(cons.capitalEfficiency?.returnPerCapitalDayPct || 0) >= 0 ? 'positive' : 'negative'}">
            ${(cons.capitalEfficiency?.returnPerCapitalDayPct || 0) >= 0 ? '+' : ''}${(cons.capitalEfficiency?.returnPerCapitalDayPct || 0).toFixed(3)}%/dia
          </span>
          <span class="vol-sim-kpi-sub">${money(cons.capitalEfficiency?.netPerThousandCapitalDays || 0)}/R$ 1k-dia alocado</span>
        </div>

        <div class="analytics-consolidated-card">
          <span class="vol-sim-kpi-label">Rotatividade da Carteira</span>
          <span class="vol-sim-kpi-val neutral">${(cons.capitalEfficiency?.capitalTurnover || 0).toFixed(1)}x</span>
          <span class="vol-sim-kpi-sub">Alocação total: ${money(cons.capitalEfficiency?.totalAllocatedCapital || 0)}</span>
        </div>

        <div class="analytics-consolidated-card">
          <span class="vol-sim-kpi-label">Correlação entre Estratégias</span>
          <span class="vol-sim-kpi-val neutral">${cons.correlation?.pearsonCorrelation != null ? cons.correlation.pearsonCorrelation.toFixed(2) : '0.00'}</span>
          <span class="vol-sim-kpi-sub">${cons.correlation?.interpretation || 'Descorrelação temporal'}</span>
        </div>

        <div class="analytics-consolidated-card">
          <span class="vol-sim-kpi-label">Pico de Exposição Simultânea</span>
          <span class="vol-sim-kpi-val neutral">${money(cons.exposure?.maxSimultaneousCapital || 0)}</span>
          <span class="vol-sim-kpi-sub">Máximo: ${cons.exposure?.maxSimultaneousPositions || 0} posições simultâneas</span>
        </div>
      </div>

      <!-- Card de Contribuição por Estratégia -->
      <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:20px; margin-bottom:20px;">
        <h3 style="font-size:14px; font-weight:800; color:#f8fafc; margin:0 0 12px 0; text-transform:uppercase;">Contribuição para o Resultado da Carteira</h3>
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700; margin-bottom:8px;">
          <span style="color:#34d399;">🌿 Trend Following: ${money(tf.netProfit || 0)} (${tfPct.toFixed(1)}%)</span>
          <span style="color:#38bdf8;">⚡ Volatility Trading: ${money(vol.netProfit || 0)} (${volPct.toFixed(1)}%)</span>
        </div>
        <div class="analytics-contrib-track">
          <div class="analytics-contrib-segment is-trend" style="width:${tfPct}%;"></div>
          <div class="analytics-contrib-segment is-vol" style="width:${volPct}%;"></div>
        </div>
      </div>

      <!-- Concentração por Ativo e Setor -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:18px;">
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#f8fafc; margin:0 0 12px 0; text-transform:uppercase;">Top Ativos por Capital Alocado</h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${(cons.concentration?.topAssets || []).slice(0, 5).map(a => `
              <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <strong>${a.symbol}</strong>
                <span>${money(a.capitalAllocated)} · <b style="color:${a.netResult >= 0 ? '#10b981' : '#f87171'}">${money(a.netResult)}</b></span>
              </div>
            `).join('') || '<p style="color:#94a3b8; font-size:12px;">Sem dados de concentração ainda.</p>'}
          </div>
        </div>

        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#f8fafc; margin:0 0 12px 0; text-transform:uppercase;">Distribuição Setorial</h4>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${(cons.concentration?.topSectors || []).slice(0, 5).map(s => `
              <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <strong>${s.sector}</strong>
                <span>${money(s.capitalAllocated)} · <b style="color:${s.netResult >= 0 ? '#10b981' : '#f87171'}">${money(s.netResult)}</b></span>
              </div>
            `).join('') || '<p style="color:#94a3b8; font-size:12px;">Sem dados setoriais ainda.</p>'}
          </div>
        </div>
      </div>
    `;
  }


  function renderCapitalEfficiencyBlock(m, initialCapital, strategyType) {
    const isVol = strategyType === 'VOLATILITY_TRADING';
    const tagThemeClass = isVol ? 'is-vol' : '';
    const capDayPct = m.returnPerCapitalDayPct || 0;
    const netPer1k = m.netPerThousandCapitalDays || 0;
    const annRet = m.annualizedCapitalDayReturnPct || 0;

    return `
      <div class="analytics-capital-efficiency-box" style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
          <h3 style="font-size:13px; font-weight:800; color:#f8fafc; margin:0; text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; gap:8px;">
            <span>💎</span> Eficiência Econômica, Giro & Tempo de Exposição
          </h3>
          <span style="font-size:11px; font-weight:700; color:#94a3b8; background:rgba(255,255,255,0.06); padding:4px 10px; border-radius:999px;">
            Capital de Referência: ${money(initialCapital)}
          </span>
        </div>

        <div class="analytics-efficiency-grid">
          <!-- Super Destaque: Retorno por Capital-Dia -->
          <div class="analytics-capital-day-hero ${tagThemeClass}">
            <div>
              <div class="analytics-cd-tag">⭐ MÉTRICA PRIORITÁRIA DE EFICIÊNCIA</div>
              <div class="analytics-cd-title">Retorno por Capital-Dia</div>
              <div class="analytics-cd-value ${capDayPct >= 0 ? 'positive' : 'negative'}">
                ${capDayPct >= 0 ? '+' : ''}${capDayPct.toFixed(3)}% <small style="font-size:14px; font-weight:600; color:#94a3b8;">/ dia</small>
              </div>
              <div class="analytics-cd-sub">
                Gera <b>${money(netPer1k)}</b> líquido para cada R$ 1.000,00 de capital mantido sob risco por 1 dia no mercado.
              </div>
            </div>
            <div class="analytics-cd-footer">
              <span><b>${(m.totalCapitalDays || 0).toLocaleString('pt-BR')}</b> Capital-Dias</span>
              <span>•</span>
              <span>Equiv. Anual: <b>${annRet >= 0 ? '+' : ''}${annRet.toFixed(1)}%</b></span>
            </div>
          </div>

          <!-- Card: Rotatividade de Capital -->
          <div class="analytics-efficiency-kpi-card">
            <span class="vol-sim-kpi-label">Rotatividade do Capital (Turnover)</span>
            <span class="vol-sim-kpi-val neutral">${(m.capitalTurnover || 0).toFixed(1)}x</span>
            <span class="vol-sim-kpi-sub">Total alocado: ${money(m.totalAllocatedCapital || 0)}</span>
            <span class="analytics-kpi-hint">Reciclagem do capital da carteira no período</span>
          </div>

          <!-- Card: Frequência Operacional -->
          <div class="analytics-efficiency-kpi-card">
            <span class="vol-sim-kpi-label">Frequência Operacional</span>
            <span class="vol-sim-kpi-val neutral">${(m.tradesPerMonth || 0).toFixed(1)} <small style="font-size:13px;">trades/mês</small></span>
            <span class="vol-sim-kpi-sub">${m.totalTrades || 0} trades em ${(m.monthsSpan || 1).toFixed(1)} meses</span>
            <span class="analytics-kpi-hint">Cadência de oportunidades acionadas</span>
          </div>

          <!-- Card: Expectativa Mensal -->
          <div class="analytics-efficiency-kpi-card">
            <span class="vol-sim-kpi-label">Expectativa Mensal Projetada</span>
            <span class="vol-sim-kpi-val ${(m.projectedMonthlyExpectancy || 0) >= 0 ? 'positive' : 'negative'}">
              ${money(m.projectedMonthlyExpectancy || 0)}
            </span>
            <span class="vol-sim-kpi-sub">Média real observada: <b>${money(m.observedMonthlyAverage || 0)}/mês</b></span>
            <span class="analytics-kpi-hint">E(trade) × Frequência mensal de operações</span>
          </div>

          <!-- Card: Tempo Médio de Exposição -->
          <div class="analytics-efficiency-kpi-card">
            <span class="vol-sim-kpi-label">Tempo Médio de Exposição</span>
            <span class="vol-sim-kpi-val neutral">${(m.avgHoldingSessions || 0).toFixed(1)} <small style="font-size:13px;">pregões</small></span>
            <span class="vol-sim-kpi-sub">${(m.avgHoldingDays || 0).toFixed(1)} dias corridos (Mediana: ${(m.medianHoldingSessions || 0).toFixed(0)}p)</span>
            <span class="analytics-kpi-hint">Menor permanência = menor risco exógeno</span>
          </div>

          <!-- Card: Retorno sobre Capital Empregado (ROCD) -->
          <div class="analytics-efficiency-kpi-card">
            <span class="vol-sim-kpi-label">Retorno s/ Capital Empregado (ROCD)</span>
            <span class="vol-sim-kpi-val ${(m.returnOnCapitalDeployedPct || 0) >= 0 ? 'positive' : 'negative'}">
              ${(m.returnOnCapitalDeployedPct || 0) >= 0 ? '+' : ''}${(m.returnOnCapitalDeployedPct || 0).toFixed(1)}%
            </span>
            <span class="vol-sim-kpi-sub">Cap. médio comprometido: ${money(m.avgCapitalCommitted || 0)}</span>
            <span class="analytics-kpi-hint">Rentabilidade pura do capital alocado</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderComparisonHtml(comp, initialCapital) {
    if (!comp) return '<p style="color:#94a3b8; font-size:13px;">Dados comparativos indisponíveis para o período selecionado.</p>';
    const tf = comp.trendFollowing || {};
    const vol = comp.volatilityTrading || {};
    const tfCapDay = tf.returnPerCapitalDayPct || 0;
    const volCapDay = vol.returnPerCapitalDayPct || 0;
    const isVolWinner = volCapDay >= tfCapDay;

    return `
      <!-- Banner de Princípio Fundamental -->
      <div style="background:linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(15,23,42,0.85) 100%); border:1px solid rgba(245,158,11,0.3); border-radius:14px; padding:18px 22px; margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
          <span style="font-size:18px;">💡</span>
          <strong style="font-size:14px; color:#fbbf24; text-transform:uppercase; letter-spacing:0.04em;">
            Princípio Fundamental de Eficiência Econômica
          </strong>
        </div>
        <p style="font-size:13px; color:#f8fafc; margin:0 0 4px 0; font-weight:700;">
          Payoff elevado não significa necessariamente maior eficiência de capital.
        </p>
        <p style="font-size:12px; color:#94a3b8; margin:0; line-height:1.5;">
          Enquanto o Trend Following amarra o capital por semanas em busca de grandes assimetrias (+2R a +5R), o Volatility Trading recicla o capital rapidamente em 2 a 4 pregões com alta probabilidade. Avaliar apenas o ganho nominal por operação mascara o poder multiplicador do tempo e da rotatividade.
        </p>
      </div>

      <!-- Super Hero Card: Retorno por Capital-Dia Lado a Lado -->
      <div class="analytics-comparison-hero-grid">
        <!-- Card Trend Following -->
        <div class="analytics-side-card is-trend ${!isVolWinner ? 'is-winner' : ''}">
          <div class="analytics-side-header">
            <span class="analytics-side-title trend">🌿 Trend Following</span>
            ${!isVolWinner ? '<span class="analytics-winner-pill trend">★ Maior Retorno/Capital-Dia</span>' : ''}
          </div>
          <div style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Retorno por Capital-Dia</div>
          <div class="analytics-cd-value ${tfCapDay >= 0 ? 'positive' : 'negative'}" style="font-size:28px;">
            ${tfCapDay >= 0 ? '+' : ''}${tfCapDay.toFixed(3)}% <small style="font-size:13px; color:#94a3b8;">/ dia</small>
          </div>
          <div style="font-size:12px; color:#cbd5e1; margin-bottom:12px;">
            Gera <b>${money(tf.netPerThousandCapitalDays || 0)}</b> por R$ 1.000 alocados/dia
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
            <div>Payoff: <b style="color:#f8fafc;">${(tf.payoffRatio || 0).toFixed(2)}x</b></div>
            <div>Giro: <b style="color:#f8fafc;">${(tf.capitalTurnover || 0).toFixed(1)}x</b></div>
            <div>Exposição: <b style="color:#f8fafc;">${(tf.avgHoldingSessions || 0).toFixed(1)}p</b></div>
            <div>Frequência: <b style="color:#f8fafc;">${(tf.tradesPerMonth || 0).toFixed(1)}/mês</b></div>
          </div>
        </div>

        <!-- VS Badge -->
        <div class="analytics-vs-badge">VS</div>

        <!-- Card Volatility Trading -->
        <div class="analytics-side-card is-vol ${isVolWinner ? 'is-winner' : ''}">
          <div class="analytics-side-header">
            <span class="analytics-side-title vol">⚡ Volatility Trading</span>
            ${isVolWinner ? '<span class="analytics-winner-pill vol">★ Maior Retorno/Capital-Dia</span>' : ''}
          </div>
          <div style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Retorno por Capital-Dia</div>
          <div class="analytics-cd-value ${volCapDay >= 0 ? 'positive' : 'negative'}" style="font-size:28px;">
            ${volCapDay >= 0 ? '+' : ''}${volCapDay.toFixed(3)}% <small style="font-size:13px; color:#94a3b8;">/ dia</small>
          </div>
          <div style="font-size:12px; color:#cbd5e1; margin-bottom:12px;">
            Gera <b>${money(vol.netPerThousandCapitalDays || 0)}</b> por R$ 1.000 alocados/dia
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px;">
            <div>Payoff: <b style="color:#f8fafc;">${(vol.payoffRatio || 0).toFixed(2)}x</b></div>
            <div>Giro: <b style="color:#f8fafc;">${(vol.capitalTurnover || 0).toFixed(1)}x</b></div>
            <div>Exposição: <b style="color:#f8fafc;">${(vol.avgHoldingSessions || 0).toFixed(1)}p</b></div>
            <div>Frequência: <b style="color:#f8fafc;">${(vol.tradesPerMonth || 0).toFixed(1)}/mês</b></div>
          </div>
        </div>
      </div>

      <!-- Tabela Comparativa Lado a Lado -->
      <div class="analytics-comparison-table-wrap">
        <div style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <h4 style="font-size:13px; font-weight:800; color:#f8fafc; margin:0; text-transform:uppercase;">
              Matriz Comparativa de Sistemas
            </h4>
            <span style="font-size:11px; color:#94a3b8;">Base homogênea no mesmo período histórico avaliado</span>
          </div>
          <div style="display:flex; gap:12px; font-size:12px; font-weight:700;">
            <span style="color:#34d399;">🌿 Tendência: ${comp.trendWins || 0} vitórias</span>
            <span style="color:#38bdf8;">⚡ Volatilidade: ${comp.volWins || 0} vitórias</span>
          </div>
        </div>

        <table class="analytics-comparison-table">
          <thead>
            <tr>
              <th style="width:28%;">Dimensão Avaliada</th>
              <th style="width:24%;">🌿 Trend Following</th>
              <th style="width:24%;">⚡ Volatility Trading</th>
              <th style="width:24%;">Vantagem Econômica</th>
            </tr>
          </thead>
          <tbody>
            ${(comp.dimensions || []).map(dim => {
              const isPriority = dim.isPriority;
              let winPill = '<span class="analytics-winner-pill tie">⚖️ Equivalente</span>';
              if (dim.winner === 'TREND_FOLLOWING') {
                winPill = '<span class="analytics-winner-pill trend">🌿 Trend Following</span>';
              } else if (dim.winner === 'VOLATILITY_TRADING') {
                winPill = '<span class="analytics-winner-pill vol">⚡ Volatility</span>';
              }

              return `
                <tr class="${isPriority ? 'priority-row' : ''}">
                  <td>
                    <div style="display:flex; align-items:center; gap:6px;">
                      <strong>${dim.name}</strong>
                      ${isPriority ? '<span style="font-size:10px; background:#f59e0b; color:#0f172a; padding:1px 6px; border-radius:4px; font-weight:800;">PRIORITÁRIA</span>' : ''}
                    </div>
                    <small style="font-size:11px; color:#94a3b8; display:block; margin-top:2px;">${dim.description}</small>
                  </td>
                  <td><b style="font-size:13px;">${dim.trendFormatted}</b></td>
                  <td><b style="font-size:13px;">${dim.volFormatted}</b></td>
                  <td>${winPill}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Veredito de Eficiência & Inteligência de Portfólio Dual -->
      <div class="analytics-verdict-box">
        <h4 style="font-size:13px; font-weight:800; color:#fbbf24; margin:0 0 10px 0; text-transform:uppercase; letter-spacing:0.04em;">
          Veredito de Eficiência Econômica
        </h4>
        <p style="font-size:13px; color:#f8fafc; line-height:1.55; margin-bottom:16px;">
          ${comp.primaryVerdict}
        </p>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-top:16px;">
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px;">
            <strong style="display:block; font-size:12px; color:#38bdf8; margin-bottom:6px; text-transform:uppercase;">1. Efeito Giro vs Efeito Payoff</strong>
            <p style="font-size:11px; color:#cbd5e1; margin:0; line-height:1.45;">
              Um payoff modesto com alta taxa de acerto e rápida saída (2 a 4 dias) permite que o mesmo capital seja reinvestido continuamente, gerando um retorno composto diário frequentemente superior a um trade longo de alto payoff.
            </p>
          </div>

          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px;">
            <strong style="display:block; font-size:12px; color:#34d399; margin-bottom:6px; text-transform:uppercase;">2. Custo de Oportunidade do Tempo</strong>
            <p style="font-size:11px; color:#cbd5e1; margin:0; line-height:1.45;">
              Cada dia que o capital permanece alocado carrega um custo de oportunidade e risco de mercado. A métrica de Retorno por Capital-Dia quantifica exatamente a remuneração desse tempo sob risco.
            </p>
          </div>

          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px;">
            <strong style="display:block; font-size:12px; color:#c084fc; margin-bottom:6px; text-transform:uppercase;">3. Sinergia do Portfólio Dual</strong>
            <p style="font-size:11px; color:#cbd5e1; margin:0; line-height:1.45;">
              Não é preciso escolher: alocar parte da carteira em Trend Following (para surfar tendências) e parte em Volatilidade (para rentabilizar consolidações) produz uma carteira com menor Drawdown e maior eficiência composta.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  function renderVolatilityHtml(metrics, breakdowns, initialCapital = 100000) {
    const m = metrics || {};
    return `
      ${m.sampleSizeAlert ? `
        <div class="vol-sim-alert" style="margin-bottom:16px;">
          <span>⚠️</span>
          <div>${m.sampleSizeWarning}</div>
        </div>
      ` : ''}

      <div class="vol-sim-kpi-grid" style="margin-bottom:20px;">
        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Total de Trades</span>
          <span class="vol-sim-kpi-val neutral">${m.totalTrades || 0}</span>
          <span class="vol-sim-kpi-sub">${m.winningTradesCount || 0} Ganhos · ${m.losingTradesCount || 0} Perdas</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Taxa de Acerto</span>
          <span class="vol-sim-kpi-val ${(m.winRatePct || 0) >= 65 ? 'positive' : 'neutral'}">${(m.winRatePct || 0).toFixed(1)}%</span>
          <span class="vol-sim-kpi-sub">Alvo: ≥ 65% em Mean Reversion</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Fator de Lucro</span>
          <span class="vol-sim-kpi-val ${(m.profitFactor || 0) >= 1.5 ? 'positive' : 'neutral'}">${(m.profitFactor || 0).toFixed(2)}</span>
          <span class="vol-sim-kpi-sub">Lucro bruto / Perda bruta</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Expectativa Financeira</span>
          <span class="vol-sim-kpi-val ${(m.expectancyAmount || 0) >= 0 ? 'positive' : 'negative'}">${money(m.expectancyAmount || 0)}</span>
          <span class="vol-sim-kpi-sub">${pct(m.expectancyPct || 0)} sobre capital alocado</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Permanência Média / Mediana</span>
          <span class="vol-sim-kpi-val neutral">${(m.avgHoldingSessions || 0).toFixed(1)} / ${(m.medianHoldingSessions || 0).toFixed(0)} pregões</span>
          <span class="vol-sim-kpi-sub">Saída temporal limite: D7</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Resultado Líquido</span>
          <span class="vol-sim-kpi-val ${(m.netProfit || 0) >= 0 ? 'positive' : 'negative'}">${money(m.netProfit || 0)}</span>
          <span class="vol-sim-kpi-sub">Retorno médio: ${pct(m.avgTradeReturnPct || 0)}/trade</span>
        </div>
      </div>

      ${renderCapitalEfficiencyBlock(m, initialCapital, 'VOLATILITY_TRADING')}

      <!-- Breakdowns de Volatilidade -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:18px;">
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#38bdf8; margin:0 0 12px 0; text-transform:uppercase;">Resultado por Nível de IFR(2)</h4>
          ${(breakdowns.byIfrLevel || []).map(b => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span>${b.label} (${b.total} trades)</span>
              <span>Win: <b>${b.winRate.toFixed(0)}%</b> · <b style="color:${b.net >= 0 ? '#10b981' : '#f87171'}">${money(b.net)}</b></span>
            </div>
          `).join('')}
        </div>

        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#38bdf8; margin:0 0 12px 0; text-transform:uppercase;">Motivo de Saída</h4>
          ${(breakdowns.byExitReason || []).map(b => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span>${b.label} (${b.total} trades)</span>
              <span>Win: <b>${b.winRate.toFixed(0)}%</b> · <b style="color:${b.net >= 0 ? '#10b981' : '#f87171'}">${money(b.net)}</b></span>
            </div>
          `).join('')}
        </div>

        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#38bdf8; margin:0 0 12px 0; text-transform:uppercase;">Distância da SMA(7) na Entrada</h4>
          ${(breakdowns.byDistSma7 || []).map(b => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span>${b.label} (${b.total} trades)</span>
              <span>Win: <b>${b.winRate.toFixed(0)}%</b> · <b style="color:${b.net >= 0 ? '#10b981' : '#f87171'}">${money(b.net)}</b></span>
            </div>
          `).join('')}
        </div>

        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#38bdf8; margin:0 0 12px 0; text-transform:uppercase;">Permanência (Holding Sessions)</h4>
          ${(breakdowns.byHoldingPeriod || []).map(b => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span>${b.label} (${b.total} trades)</span>
              <span>Win: <b>${b.winRate.toFixed(0)}%</b> · <b style="color:${b.net >= 0 ? '#10b981' : '#f87171'}">${money(b.net)}</b></span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderTrendHtml(metrics, breakdowns, initialCapital = 100000) {
    const m = metrics || {};
    return `
      ${m.sampleSizeAlert ? `
        <div class="vol-sim-alert" style="margin-bottom:16px;">
          <span>⚠️</span>
          <div>${m.sampleSizeWarning}</div>
        </div>
      ` : ''}

      <div class="vol-sim-kpi-grid" style="margin-bottom:20px;">
        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Total de Trades</span>
          <span class="vol-sim-kpi-val neutral">${m.totalTrades || 0}</span>
          <span class="vol-sim-kpi-sub">${m.winningTradesCount || 0} Ganhos · ${m.losingTradesCount || 0} Perdas</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Taxa de Acerto</span>
          <span class="vol-sim-kpi-val ${(m.winRatePct || 0) >= 45 ? 'positive' : 'neutral'}">${(m.winRatePct || 0).toFixed(1)}%</span>
          <span class="vol-sim-kpi-sub">Alvo: 40% a 55% em Tendência</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Relação Payoff</span>
          <span class="vol-sim-kpi-val ${(m.payoffRatio || 0) >= 2.0 ? 'positive' : 'neutral'}">${(m.payoffRatio || 0).toFixed(2)}x</span>
          <span class="vol-sim-kpi-sub">Ganho Médio ÷ Perda Média</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Expectativa Matemática</span>
          <span class="vol-sim-kpi-val ${(m.expectancyR || 0) >= 0 ? 'positive' : 'negative'}">${(m.expectancyR || 0) >= 0 ? '+' : ''}${(m.expectancyR || 0).toFixed(2)}R</span>
          <span class="vol-sim-kpi-sub">${money(m.expectancyAmount || 0)} por trade</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Fator de Lucro</span>
          <span class="vol-sim-kpi-val ${(m.profitFactor || 0) >= 1.5 ? 'positive' : 'neutral'}">${(m.profitFactor || 0).toFixed(2)}</span>
          <span class="vol-sim-kpi-sub">Lucro bruto / Perda bruta</span>
        </div>

        <div class="vol-sim-kpi-card">
          <span class="vol-sim-kpi-label">Resultado Líquido</span>
          <span class="vol-sim-kpi-val ${(m.netProfit || 0) >= 0 ? 'positive' : 'negative'}">${money(m.netProfit || 0)}</span>
          <span class="vol-sim-kpi-sub">Total acumulado: ${(m.totalR || 0) >= 0 ? '+' : ''}${(m.totalR || 0).toFixed(2)}R</span>
        </div>
      </div>

      ${renderCapitalEfficiencyBlock(m, initialCapital, 'TREND_FOLLOWING')}

      <!-- Breakdowns de Trend Following -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:18px;">
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#34d399; margin:0 0 12px 0; text-transform:uppercase;">Resultado por Gatilho / Setup</h4>
          ${(breakdowns.bySetup || []).map(b => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span>${b.label} (${b.total})</span>
              <span>Win: <b>${b.winRate.toFixed(0)}%</b> · ${b.avgR != null ? `<b>${b.avgR >= 0 ? '+' : ''}${b.avgR}R</b>` : ''} · <b style="color:${b.net >= 0 ? '#10b981' : '#f87171'}">${money(b.net)}</b></span>
            </div>
          `).join('')}
        </div>

        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#34d399; margin:0 0 12px 0; text-transform:uppercase;">Por Regime de Mercado</h4>
          ${(breakdowns.byMarketCycle || []).map(b => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span>${b.label} (${b.total})</span>
              <span>Win: <b>${b.winRate.toFixed(0)}%</b> · <b style="color:${b.net >= 0 ? '#10b981' : '#f87171'}">${money(b.net)}</b></span>
            </div>
          `).join('')}
        </div>

        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#34d399; margin:0 0 12px 0; text-transform:uppercase;">Por Força Relativa</h4>
          ${(breakdowns.byRelativeStrength || []).map(b => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span>${b.label} (${b.total})</span>
              <span>Win: <b>${b.winRate.toFixed(0)}%</b> · <b style="color:${b.net >= 0 ? '#10b981' : '#f87171'}">${money(b.net)}</b></span>
            </div>
          `).join('')}
        </div>

        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:18px;">
          <h4 style="font-size:13px; font-weight:800; color:#34d399; margin:0 0 12px 0; text-transform:uppercase;">Por Nota da Rubric</h4>
          ${(breakdowns.byGrade || []).map(b => `
            <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span>Grade ${b.label} (${b.total})</span>
              <span>Win: <b>${b.winRate.toFixed(0)}%</b> · <b style="color:${b.net >= 0 ? '#10b981' : '#f87171'}">${money(b.net)}</b></span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function bindEvents(container, trades) {
    container.querySelectorAll('[data-analytics-scope]').forEach(btn => {
      btn.addEventListener('click', () => {
        window._analyticsUserToggledScope = true;
        activeScope = btn.getAttribute('data-analytics-scope');
        render(container, trades);
      });
    });

    container.querySelector('#analyticsFilterPeriod')?.addEventListener('change', (e) => {
      activePeriod = e.target.value;
      render(container, trades);
    });

    container.querySelector('#analyticsFilterMarket')?.addEventListener('change', (e) => {
      activeMarket = e.target.value;
      render(container, trades);
    });
  }

  // Global listeners e auto-montagem
  if (typeof window !== 'undefined') {
    window.addEventListener('healthyTrend:strategyChanged', (e) => {
      const strat = e.detail && e.detail.strategy;
      if (!window._analyticsUserToggledScope) {
        if (strat === 'volatility_trading') activeScope = 'VOLATILITY_TRADING';
        else if (strat === 'trend_following') activeScope = 'TREND_FOLLOWING';
        const root = document.getElementById('analyticsStrategyContainer');
        if (root) render(root);
      }
    });

    const ensureMounted = () => {
      const page = document.getElementById('analytics');
      if (page) {
        let stratBox = document.getElementById('analyticsStrategyContainer');
        if (!stratBox) {
          stratBox = document.createElement('div');
          stratBox.id = 'analyticsStrategyContainer';
          const hero = page.querySelector('.hero');
          if (hero) hero.insertAdjacentElement('afterend', stratBox);
          else page.prepend(stratBox);
        }
        render(stratBox);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureMounted);
    } else {
      setTimeout(ensureMounted, 100);
    }

    window.addEventListener('healthyTrend:tradesUpdated', ensureMounted);
    window.addEventListener('healthyTrend:authenticated', () => setTimeout(ensureMounted, 200));
  }

  root.StrategyAnalytics = {
    render,
    setScope: (scope) => { activeScope = scope; }
  };
})(typeof window !== 'undefined' ? window : this);

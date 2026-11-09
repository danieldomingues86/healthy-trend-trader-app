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

    if (activeScope === 'CONSOLIDATED') {
      const consolidated = model.calculateConsolidatedPortfolio(allTrades, {
        initialCapital: (typeof root.getOperationalEquity === 'function' ? root.getOperationalEquity() : 100000)
      });
      return renderConsolidatedHtml(consolidated);
    }

    if (activeScope === 'VOLATILITY_TRADING') {
      const volTrades = filteredTrades.filter(t => t.strategyType === 'VOLATILITY_TRADING');
      const metrics = model.calculateStrategyMetrics(volTrades, { strategyType: 'VOLATILITY_TRADING' });
      const breakdowns = model.calculateVolatilityBreakdowns(volTrades);
      return renderVolatilityHtml(metrics, breakdowns);
    }

    // TREND_FOLLOWING
    const trendTrades = filteredTrades.filter(t => t.strategyType === 'TREND_FOLLOWING');
    const metrics = model.calculateStrategyMetrics(trendTrades, { strategyType: 'TREND_FOLLOWING' });
    const breakdowns = model.calculateTrendBreakdowns(trendTrades);
    return renderTrendHtml(metrics, breakdowns);
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
          <span class="vol-sim-kpi-sub">${money(cons.portfolioDrawdown?.maxDrawdownAmount || 0)} (Efeito de amortecimento real)</span>
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

  function renderVolatilityHtml(metrics, breakdowns) {
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

  function renderTrendHtml(metrics, breakdowns) {
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

  // Global listener to strategyChanged
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
  }

  root.StrategyAnalytics = {
    render,
    setScope: (scope) => { activeScope = scope; }
  };
})(typeof window !== 'undefined' ? window : this);

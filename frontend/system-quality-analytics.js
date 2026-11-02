/**
 * Healthy Trend Trader — System Quality Analytics (SQN) View & Controller
 * Renderizador de Inteligência Estatística de Sistemas de Trading (Van K. Tharp).
 *
 * Integração:
 * - Painel da Verdade (Analytics)
 * - Anatomia dos Trades (Trade Anatomy)
 * - Simulador de Trades (Trade Simulator)
 * - Política de Risco (Risk Policy)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SystemQualityAnalytics = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function getModel() {
    return (typeof window !== 'undefined' && window.SystemQualityAnalyticsModel)
      ? window.SystemQualityAnalyticsModel
      : (typeof require === 'function' ? require('./system-quality-analytics-model') : null);
  }

  const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);

  /**
   * Gera o SVG da Curva de Evolução do SQN (Rolling SQN)
   */
  function renderEvolutionSvg(evolution = [], options = {}) {
    if (!evolution || evolution.length < 2) {
      return `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted,#64748b);font-size:13px;text-align:center;padding:20px;">
          Encerre ao menos 2 operações para formar a curva histórica de qualidade estatística do sistema.
        </div>
      `;
    }

    const width = options.width || 760;
    const height = options.height || 220;
    const padX = 40;
    const padY = 24;

    const sqnVals = evolution.map(p => p.sqnRaw != null ? p.sqnRaw : 0);
    // Definir mínimo e máximo da escala incluindo as referências críticas (1.6 a 5.0)
    let minVal = Math.min(-0.5, ...sqnVals);
    let maxVal = Math.max(5.5, ...sqnVals);
    const range = (maxVal - minVal) || 1;

    const getX = (idx, total) => padX + (idx / (total - 1 || 1)) * (width - padX * 2);
    const getY = val => height - padY - ((val - minVal) / range) * (height - padY * 2);

    // Linhas de referência Van Tharp (1.6, 2.5, 3.0, 5.0)
    const guides = [
      { val: 1.6, label: '1,6 (Mínimo)', class: 'guide-1-6', color: '#ef4444' },
      { val: 2.0, label: '2,0 (Mediano)', class: 'guide-2', color: '#3b82f6' },
      { val: 3.0, label: '3,0 (Excelente)', class: 'guide-3', color: '#10b981' },
      { val: 5.0, label: '5,0 (Excepcional)', class: 'guide-3', color: '#047857' }
    ];

    const guideLinesMarkup = guides.map(g => {
      if (g.val < minVal || g.val > maxVal) return '';
      const y = getY(g.val);
      return `
        <line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" class="sqn-chart-guide-line ${g.class}" />
        <text x="${width - padX + 6}" y="${y + 3}" class="sqn-chart-guide-text">${g.label}</text>
      `;
    }).join('');

    // Pontos do caminho
    const points = evolution.map((step, idx) => {
      const x = getX(idx, evolution.length);
      const y = getY(step.sqnRaw != null ? step.sqnRaw : 0);
      return { x, y, step };
    });

    const pathD = points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

    // Amostragem de pontos para não sobrecarregar com 100+ dots
    const stepInterval = Math.max(1, Math.floor(points.length / 25));
    const dotsMarkup = points.filter((_, idx) => idx === 0 || idx === points.length - 1 || idx % stepInterval === 0).map(p => `
      <circle cx="${p.x}" cy="${p.y}" r="3.5" class="sqn-chart-dot" title="Trade #${p.step.tradeIndex} (${p.step.r >= 0 ? '+' : ''}${p.step.r}R) → SQN ${p.step.sqn} (${p.step.classification})">
        <title>Trade #${p.step.tradeIndex}: Resultado ${p.step.r >= 0 ? '+' : ''}${p.step.r}R | SQN: ${p.step.sqn} (${p.step.classification})</title>
      </circle>
    `).join('');

    return `
      <svg class="sqn-evolution-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Gráfico de Evolução do SQN">
        <defs>
          <linearGradient id="sqnAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Linhas de Base e Escala -->
        <line x1="${padX}" y1="${getY(0)}" x2="${width - padX}" y2="${getY(0)}" class="sqn-chart-grid-line" />
        ${guideLinesMarkup}

        <!-- Área e Linha de Dados -->
        <path d="${areaD}" class="sqn-chart-area-fill" />
        <path d="${pathD}" class="sqn-chart-path-line" />

        <!-- Pontos Interativos -->
        ${dotsMarkup}

        <!-- Eixo X: Legendas de Trades -->
        <text x="${padX}" y="${height - 6}" class="sqn-chart-guide-text">Trade #2</text>
        <text x="${width / 2}" y="${height - 6}" text-anchor="middle" class="sqn-chart-guide-text">${Math.round(evolution.length / 2)} trades</text>
        <text x="${width - padX}" y="${height - 6}" text-anchor="end" class="sqn-chart-guide-text">${evolution[evolution.length - 1].tradeIndex} trades</text>
      </svg>
    `;
  }

  /**
   * Renderiza a régua de escala Van Tharp com a faixa ativa
   */
  function renderScaleBarMarkup(sqn) {
    const isVal = sqn != null && Number.isFinite(sqn);
    const activeSeg = !isVal ? '' :
      (sqn < 1.6 ? 'poor' :
      (sqn < 2.0 ? 'below-avg' :
      (sqn < 2.5 ? 'avg' :
      (sqn < 3.0 ? 'good' :
      (sqn <= 5.0 ? 'exc' : 'excep')))));

    return `
      <div class="sqn-scale-wrapper">
        <div class="sqn-scale-bar" title="Escala Van Tharp: Fraco (<1,6) | Abaixo da média (1,6-2,0) | Mediano (2,0-2,5) | Bom (2,5-3,0) | Excelente (3,0-5,0) | Excepcional (>5,0)">
          <div class="sqn-scale-segment seg-poor ${activeSeg === 'poor' ? 'active' : ''}"></div>
          <div class="sqn-scale-segment seg-below-avg ${activeSeg === 'below-avg' ? 'active' : ''}"></div>
          <div class="sqn-scale-segment seg-avg ${activeSeg === 'avg' ? 'active' : ''}"></div>
          <div class="sqn-scale-segment seg-good ${activeSeg === 'good' ? 'active' : ''}"></div>
          <div class="sqn-scale-segment seg-exc ${activeSeg === 'exc' ? 'active' : ''}"></div>
          <div class="sqn-scale-segment seg-excep ${activeSeg === 'excep' ? 'active' : ''}"></div>
        </div>
        <div class="sqn-scale-labels">
          <span class="${activeSeg === 'poor' ? 'active' : ''}">&lt;1,6 Fraco</span>
          <span class="${activeSeg === 'below-avg' ? 'active' : ''}">1,6 Média</span>
          <span class="${activeSeg === 'avg' ? 'active' : ''}">2,0 Mediano</span>
          <span class="${activeSeg === 'good' ? 'active' : ''}">2,5 Bom</span>
          <span class="${activeSeg === 'exc' ? 'active' : ''}">3,0 Excelente</span>
          <span class="${activeSeg === 'excep' ? 'active' : ''}">&gt;5,0 Excepcional</span>
        </div>
      </div>
    `;
  }

  /**
   * Gera a Seção Completa de SYSTEM QUALITY ANALYTICS (SQN)
   */
  function generateSectionHtml(tradesOrReport) {
    const model = getModel();
    if (!model) return '<p>Modelo SystemQualityAnalyticsModel não carregado.</p>';

    let report = tradesOrReport;
    if (Array.isArray(tradesOrReport) || !tradesOrReport?.classification) {
      report = model.calculateSystemQualityAnalytics(tradesOrReport);
    }

    const sqnVal = report.sqn != null ? report.sqnFormatted : '—';
    const classification = report.classification || model.classifySQN(null);
    const badgeClass = classification.badgeClass || 'sqn-badge-unclassified';
    const toneClass = `tone-${classification.key || 'unclassified'}`;
    const significance = report.significance || model.evaluateSampleSignificance(report.sampleSize);

    const trendText = report.trendLabel || 'Estável';
    const trendTone = `trend-${report.trend || 'stable'}`;

    const svgChart = renderEvolutionSvg(report.evolution || []);
    const scaleBar = renderScaleBarMarkup(report.sqn);

    return `
      <section class="sqn-analytics-section" id="systemQualityAnalyticsSection" aria-label="System Quality Analytics (SQN)">
        <!-- Cabeçalho da Seção -->
        <header class="sqn-section-head">
          <div>
            <div class="sqn-eyebrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Inteligência Estatística · Metodologia Van K. Tharp
            </div>
            <h2 class="sqn-title">System Quality Analytics (SQN)</h2>
            <p class="sqn-subtitle">
              Avaliação matemática da consistência, dispersão e facilidade de execução do seu sistema de trading através da Expectancy e do Desvio-Padrão dos R-Múltiplos.
            </p>
          </div>
          <div class="sqn-chart-trend-pill ${trendTone}">
            <span>● Tendência: <strong>${esc(trendText)}</strong></span>
          </div>
        </header>

        <!-- Grid Principal: Card Destaque + 3 Mini Cards -->
        <div class="sqn-overview-grid">
          <!-- Card de Destaque: SQN e Régua de Qualidade -->
          <article class="sqn-highlight-card">
            <div class="sqn-highlight-header">
              <div class="sqn-highlight-title-group">
                <small>Qualidade Estatística do Sistema</small>
                <h3>System Quality Number (SQN)</h3>
              </div>
              <span class="sqn-badge ${badgeClass}">${esc(classification.label)}</span>
            </div>

            <div class="sqn-big-score-row">
              <span class="sqn-big-number ${toneClass}">${sqnVal}</span>
              <div style="flex:1;">
                <p style="margin:0 0 6px;font-size:13px;color:var(--text-primary,#e2ece6);font-weight:700;">
                  ${esc(classification.description)}
                </p>
                ${scaleBar}
              </div>
            </div>

            <div class="sqn-sample-status-box">
              <span style="font-size:16px;">📊</span>
              <div>
                <strong>${esc(significance.label)}:</strong> ${esc(significance.note)}
              </div>
            </div>
          </article>

          <!-- 3 Mini Cards de Métricas Complementares -->
          <div class="sqn-metrics-col">
            <!-- 1. Expectancy (Expectativa Matemática) -->
            <div class="sqn-mini-card">
              <div class="sqn-mini-card-info">
                <div class="sqn-mini-card-label">
                  Expectancy Matemática (R)
                  <span class="sqn-tooltip-trigger" title="Média aritmética dos resultados de todas as operações expressos em R-Múltiplos. Mede quanto o sistema produz em média por trade.">ⓘ</span>
                </div>
                <div class="sqn-mini-card-desc">Retorno médio esperado por trade</div>
              </div>
              <div class="sqn-mini-card-value ${report.expectancy >= 0 ? 'good' : 'bad'}">
                ${report.expectancyFormatted || '—'}
              </div>
            </div>

            <!-- 2. Standard Deviation (Desvio-Padrão Amostral) -->
            <div class="sqn-mini-card">
              <div class="sqn-mini-card-info">
                <div class="sqn-mini-card-label">
                  Desvio-Padrão Amostral (s)
                  <span class="sqn-tooltip-trigger" title="Desvio-padrão amostral (N-1) dos R-Múltiplos. Mede a dispersão dos resultados em torno da Expectancy. Quanto menor, mais consistentes e regulares são os resultados.">ⓘ</span>
                </div>
                <div class="sqn-mini-card-desc">Dispersão e irregularidade dos R</div>
              </div>
              <div class="sqn-mini-card-value">
                ${report.standardDeviationFormatted || '—'}
              </div>
            </div>

            <!-- 3. Tamanho da Amostra (Trades Encerrados) -->
            <div class="sqn-mini-card">
              <div class="sqn-mini-card-info">
                <div class="sqn-mini-card-label">
                  Trades Analisados (N)
                  <span class="sqn-tooltip-trigger" title="Total de operações encerradas com resultado efetivo em R. O SQN requer no mínimo 2 trades; ≥30 para representatividade e ≥100 para validação robusta.">ⓘ</span>
                </div>
                <div class="sqn-mini-card-desc">Base de operações encerradas</div>
              </div>
              <div class="sqn-mini-card-value">
                ${report.sampleSize} trades
              </div>
            </div>
          </div>
        </div>

        <!-- Gráfico de Evolução Histórica do SQN -->
        <article class="sqn-chart-card">
          <div class="sqn-chart-head">
            <div>
              <div class="sqn-eyebrow">Acompanhamento Temporal</div>
              <h3 style="margin:2px 0 0;font-size:17px;font-weight:800;color:var(--text-primary,#e2ece6);">
                Evolução Acumulada da Qualidade Estatística (Rolling SQN)
              </h3>
              <p style="margin:2px 0 0;font-size:12.5px;color:var(--text-muted,#94a3b8);">
                Acompanhe trade a trade se o sistema está ganhando consistência estatística ou perdendo qualidade operacional.
              </p>
            </div>
            <div style="font-size:12px;color:var(--text-muted,#94a3b8);">
              Amostra: <strong>${report.sampleSize} trades</strong>
            </div>
          </div>

          <div class="sqn-svg-chart-container">
            ${svgChart}
          </div>
        </article>

        <!-- Callout Pedagógico Metodológico -->
        <div class="sqn-pedagogical-card">
          <div class="sqn-pedagogical-icon">💡</div>
          <div class="sqn-pedagogical-content">
            <h4>O que o SQN revela sobre o seu trading?</h4>
            <p>
              Diferente de métricas puras de lucro (como Rentabilidade em R$ ou Win Rate isolada), o <strong>System Quality Number (SQN)</strong> mede a <em>qualidade intrínseca do processo</em> através da fórmula <code>SQN = (Expectancy / Desvio-Padrão) × √N</code>.
              Um sistema com alto lucro mas desvio-padrão excessivo é perigoso porque depende de poucos "tiros de sorte" e impõe grandes retrações emocionais.
              Quanto maior o SQN, mais suave é a curva de resultados e mais fácil é dimensionar posições com tranquilidade.
            </p>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Renderiza card compacto de governança para inclusão na Política de Risco (#riskpolicy)
   */
  function generateRiskPolicyCardHtml(tradesOrReport) {
    const model = getModel();
    if (!model) return '';

    let report = tradesOrReport;
    if (Array.isArray(tradesOrReport) || !tradesOrReport?.classification) {
      report = model.calculateSystemQualityAnalytics(tradesOrReport);
    }

    const sqnVal = report.sqn != null ? report.sqnFormatted : '—';
    const classification = report.classification || model.classifySQN(null);
    const badgeClass = classification.badgeClass || 'sqn-badge-unclassified';

    return `
      <section class="sqn-embedded-risk-card" id="riskPolicySqnCard">
        <div class="sqn-embedded-risk-head">
          <div>
            <span class="sqn-eyebrow">GOVERNANÇA ESTATÍSTICA DO SISTEMA</span>
            <h3 style="margin:2px 0 0;font-size:16px;font-weight:800;color:var(--text-primary,#e2ece6);">
              Qualidade do Sistema (SQN) — Indicador Complementar de Risco
            </h3>
            <p style="margin:2px 0 0;font-size:12px;color:var(--text-muted,#94a3b8);">
              Avalia a consistência matemática das operações reais para calibrar o perfil de exposição com disciplina.
            </p>
          </div>
          <span class="sqn-badge ${badgeClass}">${esc(classification.label)}</span>
        </div>

        <div class="sqn-embedded-risk-grid">
          <div style="background:rgba(0,0,0,0.15);padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted,#94a3b8);text-transform:uppercase;">SQN Atual</div>
            <strong style="font-size:24px;color:var(--text-primary,#e2ece6);">${sqnVal}</strong>
            <small style="display:block;font-size:11px;color:var(--text-muted,#64748b);">${classification.label}</small>
          </div>

          <div style="background:rgba(0,0,0,0.15);padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted,#94a3b8);text-transform:uppercase;">Expectancy (R)</div>
            <strong style="font-size:24px;color:${report.expectancy >= 0 ? 'var(--primary,#10b981)' : '#ef4444'};">${report.expectancyFormatted || '—'}</strong>
            <small style="display:block;font-size:11px;color:var(--text-muted,#64748b);">Média por trade</small>
          </div>

          <div style="background:rgba(0,0,0,0.15);padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted,#94a3b8);text-transform:uppercase;">Desvio-Padrão (s)</div>
            <strong style="font-size:24px;color:var(--text-primary,#e2ece6);">${report.standardDeviationFormatted || '—'}</strong>
            <small style="display:block;font-size:11px;color:var(--text-muted,#64748b);">Dispersão de R</small>
          </div>

          <div style="background:rgba(0,0,0,0.15);padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
            <div style="font-size:11px;font-weight:700;color:var(--text-muted,#94a3b8);text-transform:uppercase;">Amostra Analisada</div>
            <strong style="font-size:24px;color:var(--text-primary,#e2ece6);">${report.sampleSize}</strong>
            <small style="display:block;font-size:11px;color:var(--text-muted,#64748b);">${report.significance?.label || 'Trades'}</small>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 14px;border-radius:10px;background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);">
          <div style="font-size:12px;color:var(--text-muted,#94a3b8);">
            <strong style="color:var(--text-primary,#e2ece6);">Diretriz de Risco:</strong> Este indicador é estritamente consultivo e informativo; ele <strong>não altera automaticamente</strong> o Risk Budget por Grade, o position sizing ou os limites de alocação de capital vigentes.
          </div>
          <button type="button" class="secondary" style="font-size:12px;padding:6px 14px;" onclick="typeof go==='function'&&go('analytics')">
            Ver Análise Estatística Completa →
          </button>
        </div>
      </section>
    `;
  }

  /**
   * Renderiza o card do SQN dentro da aba Resumo do Simulador de Trades
   */
  function generateSimulatorSqnCardHtml(stats) {
    const model = getModel();
    if (!model || !stats) return '';

    const sqnReport = stats.sqnAnalytics;
    if (!sqnReport) return '';

    const classification = sqnReport.classification || model.classifySQN(stats.sqn);
    const badgeClass = classification.badgeClass || 'sqn-badge-unclassified';
    const scaleBar = renderScaleBarMarkup(sqnReport.sqn);

    return `
      <div class="sim-rebuild-card" style="margin-top: 20px;">
        <div class="sim-rebuild-card-head">
          <div class="sim-rebuild-card-head-left">
            <span class="sim-rebuild-head-icon icon-chart">📐</span>
            <div>
              <h2 class="sim-rebuild-card-title">System Quality Analytics (SQN)</h2>
              <p class="sim-rebuild-card-desc">Qualidade estatística da simulação segundo Van Tharp: SQN = (Expectancy ÷ Desvio-Padrão) × √N</p>
            </div>
          </div>
          <span class="sqn-badge ${badgeClass}">${esc(classification.label)}</span>
        </div>

        <div class="sim-summary-subcards-row" style="margin-top: 14px;">
          <!-- Subcard 1: SQN e Classificação -->
          <div class="sim-subcard-box subcard-total">
            <div class="sim-subcard-icon icon-coins">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12h8M12 8v8"></path>
              </svg>
            </div>
            <div class="sim-subcard-body">
              <div class="sim-subcard-label">System Quality Number (SQN)</div>
              <div class="sim-subcard-main-val pos">
                ${sqnReport.sqnFormatted || '—'}
              </div>
              <div class="sim-subcard-sub-line">
                <span class="equiv-tag">Classificação: <strong>${esc(classification.label)}</strong></span>
                <span class="count-tag">${sqnReport.sampleSize} trades na amostra</span>
              </div>
              <div style="margin-top: 10px;">
                ${scaleBar}
              </div>
            </div>
          </div>

          <!-- Subcard 2: Expectancy e Desvio-Padrão -->
          <div class="sim-subcard-box subcard-trophy">
            <div class="sim-subcard-icon icon-trophy">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 20V10M10 20V4M16 20v-7M22 20V7"></path>
              </svg>
            </div>
            <div class="sim-subcard-body">
              <div class="sim-subcard-trophy-title">Dispersão e Vantagem Estatística</div>
              <p class="sim-subcard-trophy-text" style="margin-bottom: 8px;">
                Expectancy: <strong style="color: #059669;">${sqnReport.expectancyFormatted}</strong> | Desvio-Padrão: <strong style="color: #0f172a;">${sqnReport.standardDeviationFormatted}</strong>
              </p>
              <div style="font-size: 11.5px; color: #64748b; line-height: 1.4;">
                ${esc(sqnReport.significance?.note || '')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return Object.freeze({
    renderEvolutionSvg,
    renderScaleBarMarkup,
    generateSectionHtml,
    generateRiskPolicyCardHtml,
    generateSimulatorSqnCardHtml
  });
});

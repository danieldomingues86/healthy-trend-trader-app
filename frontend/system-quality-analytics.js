/**
 * Healthy Trend Trader — System Quality Analytics (SQN) View & Controller
 * Renderizador de Inteligência Estatística de Sistemas de Trading (Metodologia Van K. Tharp).
 *
 * Módulos integrados:
 * - Nova tela oficial: Qualidade Estatística do Sistema (#systemquality)
 * - Painel da Verdade: Card de Acesso Executivo (#analytics)
 * - Simulador de Trades: SQN Simulado (#tradesimulator)
 * - Política de Risco: Governança Consultiva (#riskpolicy)
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
   * 2.3. Gera o SVG da Curva de Evolução do SQN (Rolling SQN)
   * Com largura ampla e margem direita protegida para evitar cortes de legendas.
   */
  function renderEvolutionSvg(evolution = [], options = {}) {
    if (!evolution || evolution.length < 2) {
      return `
        <div class="sqn-empty-chart-placeholder">
          Encerre ao menos 2 operações para formar a curva histórica de qualidade estatística do sistema.
        </div>
      `;
    }

    const width = options.width || 920;
    const height = options.height || 240;
    const padLeft = 46;
    const padRight = 140; // Espaço protegido na lateral direita para textos de referência
    const padY = 28;

    const sqnVals = evolution.map(p => p.sqnRaw != null ? p.sqnRaw : 0);
    let minVal = Math.min(-0.5, ...sqnVals);
    let maxVal = Math.max(5.5, ...sqnVals);
    const range = (maxVal - minVal) || 1;

    const plotWidth = width - padLeft - padRight;
    const getX = (idx, total) => padLeft + (idx / (total - 1 || 1)) * plotWidth;
    const getY = val => height - padY - ((val - minVal) / range) * (height - padY * 2);

    // Linhas de referência Van Tharp (1.6, 2.0, 3.0, 5.0)
    const guides = [
      { val: 1.6, label: '1,6 (Mínimo)', class: 'guide-1-6', color: '#f87171' },
      { val: 2.0, label: '2,0 (Mediano)', class: 'guide-2', color: '#60a5fa' },
      { val: 3.0, label: '3,0 (Excelente)', class: 'guide-3', color: '#34d399' },
      { val: 5.0, label: '5,0 (Excepcional)', class: 'guide-5', color: '#10b981' }
    ];

    const guideLinesMarkup = guides.map(g => {
      if (g.val < minVal || g.val > maxVal) return '';
      const y = getY(g.val);
      return `
        <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="sqn-chart-guide-line ${g.class}" />
        <text x="${width - padRight + 12}" y="${y + 4}" class="sqn-chart-guide-text">${g.label}</text>
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

    // Amostragem de marcadores
    const stepInterval = Math.max(1, Math.floor(points.length / 25));
    const dotsMarkup = points.filter((_, idx) => idx === 0 || idx === points.length - 1 || idx % stepInterval === 0).map(p => `
      <circle cx="${p.x}" cy="${p.y}" r="3.5" class="sqn-chart-dot">
        <title>Trade #${p.step.tradeIndex}: ${p.step.r >= 0 ? '+' : ''}${p.step.r}R | SQN: ${p.step.sqn} (${p.step.classification})</title>
      </circle>
    `).join('');

    const midTradeIndex = Math.round(evolution.length / 2);
    const lastTradeIndex = evolution[evolution.length - 1].tradeIndex;

    return `
      <svg class="sqn-evolution-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Gráfico de Evolução do SQN">
        <defs>
          <linearGradient id="sqnAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="var(--sqn-area-stop-0, #10b981)" stop-opacity="0.25" />
            <stop offset="100%" stop-color="var(--sqn-area-stop-1, rgba(16, 185, 129, 0))" stop-opacity="0.0" />
          </linearGradient>
        </defs>

        <!-- Linha Zero / Base -->
        <line x1="${padLeft}" y1="${getY(0)}" x2="${width - padRight}" y2="${getY(0)}" class="sqn-chart-grid-line" />
        ${guideLinesMarkup}

        <!-- Área Sombreada e Linha da Série -->
        <path d="${areaD}" class="sqn-chart-area-fill" />
        <path d="${pathD}" class="sqn-chart-path-line" />

        <!-- Pontos Interativos -->
        ${dotsMarkup}

        <!-- Eixo X: Identificação de Trades -->
        <text x="${padLeft}" y="${height - 6}" class="sqn-chart-guide-text">Trade #2</text>
        <text x="${padLeft + plotWidth / 2}" y="${height - 6}" text-anchor="middle" class="sqn-chart-guide-text">${midTradeIndex} trades</text>
        <text x="${width - padRight}" y="${height - 6}" text-anchor="end" class="sqn-chart-guide-text">${lastTradeIndex} trades</text>
      </svg>
    `;
  }

  /**
   * 2.2. Gera o SVG do Histograma de Distribuição dos R-Múltiplos por Faixas
   */
  function renderRDistributionChartSvg(distribution, options = {}) {
    if (!distribution || !distribution.buckets || !distribution.buckets.length) {
      return `
        <div class="sqn-empty-chart-placeholder">
          Encerre ao menos 2 operações para formar o histograma de distribuição em R.
        </div>
      `;
    }

    const width = options.width || 880;
    const height = options.height || 210;
    const padLeft = 36;
    const padRight = 36;
    const padTop = 32;
    const padBottom = 48;

    const buckets = distribution.buckets;
    const maxCount = Math.max(1, ...buckets.map(b => b.count));
    const chartWidth = width - padLeft - padRight;
    const chartHeight = height - padTop - padBottom;
    const slotWidth = chartWidth / buckets.length;
    const barWidth = Math.max(22, Math.floor(slotWidth) - 16);

    const barsMarkup = buckets.map((b, idx) => {
      const centerX = padLeft + idx * slotWidth + slotWidth / 2;
      const x = centerX - barWidth / 2;
      const barH = b.count > 0 ? Math.max(8, (b.count / maxCount) * chartHeight) : 2;
      const y = padTop + chartHeight - barH;

      return `
        <g class="sqn-dist-bar-group" data-bucket="${b.key}">
          <!-- Barra do Histograma -->
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="5" fill="${b.color}" opacity="${b.count > 0 ? '0.85' : '0.22'}" class="sqn-dist-rect">
            <title>${b.label} (${b.desc}): ${b.count} trade(s) — ${b.pct.toFixed(1).replace('.', ',')}%</title>
          </rect>
          <!-- Quantidade em cima da barra -->
          <text x="${centerX}" y="${y - 8}" text-anchor="middle" class="sqn-dist-count-text ${b.count > 0 ? 'has-trades' : ''}">${b.count}</text>
          <!-- Rótulo da Faixa no Eixo X -->
          <text x="${centerX}" y="${padTop + chartHeight + 18}" text-anchor="middle" class="sqn-dist-label-text">${b.label}</text>
          <!-- Percentual abaixo do rótulo -->
          <text x="${centerX}" y="${padTop + chartHeight + 32}" text-anchor="middle" class="sqn-dist-pct-text">${b.pct.toFixed(1).replace('.', ',')}%</text>
        </g>
      `;
    }).join('');

    return `
      <svg class="sqn-distribution-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="Distribuição dos R-Múltiplos">
        <!-- Linha de Base do Eixo X -->
        <line x1="${padLeft}" y1="${padTop + chartHeight}" x2="${width - padRight}" y2="${padTop + chartHeight}" class="sqn-chart-grid-line" />
        ${barsMarkup}
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
   * 2. Gera o HTML completo da nova tela: Qualidade Estatística do Sistema
   */
  function generateSystemQualityPageHtml(tradesOrReport, activeFilter = 'all') {
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

    const rDist = report.rDistribution || model.calculateRDistribution(report.rValues || []);
    const svgChart = renderEvolutionSvg(report.evolution || []);
    const distChart = renderRDistributionChartSvg(rDist);
    const scaleBar = renderScaleBarMarkup(report.sqn);

    return `
      <main class="sqn-page-shell" id="systemQualityPageRoot">
        <!-- Hero Header -->
        <header class="sqn-page-hero">
          <div>
            <div class="sqn-eyebrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 12h8M12 8v8"></path>
              </svg>
              DADOS &amp; PERFORMANCE · INTELIGÊNCIA ESTATÍSTICA
            </div>
            <h1 class="sqn-page-title">Qualidade Estatística<br>do Sistema</h1>
            <p class="sqn-page-subtitle">
              Avaliação matemática profunda da consistência, expectativa matemática e dispersão dos resultados reais do método Healthy Trend Trader segundo a metodologia de Van K. Tharp.
            </p>
          </div>
          <div class="sqn-hero-actions">
            <div class="sqn-chart-trend-pill ${trendTone}">
              <span>● Tendência do SQN: <strong>${esc(trendText)}</strong></span>
            </div>
          </div>
        </header>

        <!-- Barra de Filtro de Período -->
        <section class="sqn-filter-toolbar card">
          <div class="sqn-filter-left">
            <span class="sqn-filter-label">Recorte Temporal:</span>
            <div class="sqn-filter-buttons">
              <button type="button" class="sqn-filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-sqn-period="all">Todo o Histórico</button>
              <button type="button" class="sqn-filter-btn ${activeFilter === '30' ? 'active' : ''}" data-sqn-period="30">Últimos 30 dias</button>
              <button type="button" class="sqn-filter-btn ${activeFilter === '90' ? 'active' : ''}" data-sqn-period="90">Últimos 90 dias</button>
              <button type="button" class="sqn-filter-btn ${activeFilter === '365' ? 'active' : ''}" data-sqn-period="365">Últimos 12 meses</button>
            </div>
          </div>
          <div class="sqn-filter-info">
            Amostra válida: <strong>${report.sampleSize} trades encerrados</strong>
          </div>
        </section>

        <!-- 2.1. Quatro Indicadores Principais (Cards Superiores) -->
        <section class="sqn-top-kpi-grid">
          <!-- Card 1: System Quality Number (SQN) -->
          <article class="card sqn-kpi-card sqn-kpi-hero">
            <div class="sqn-kpi-head">
              <span class="sqn-kpi-eyebrow">Qualidade Estatística</span>
              <span class="sqn-badge ${badgeClass}">${esc(classification.label)}</span>
            </div>
            <div class="sqn-kpi-big-value ${toneClass}">${sqnVal}</div>
            <p class="sqn-kpi-desc">${esc(classification.description)}</p>
            ${scaleBar}
            <div class="sqn-sample-status-box" style="margin-top:14px;">
              <span>📊</span>
              <div><strong>${esc(significance.label)}:</strong> ${esc(significance.note)}</div>
            </div>
          </article>

          <!-- Card 2: Expectancy Matemática (R) -->
          <article class="card sqn-kpi-card">
            <div class="sqn-kpi-head">
              <span class="sqn-kpi-eyebrow">Expectancy (R)</span>
              <span class="sqn-tooltip-trigger" title="Média aritmética dos resultados de todas as operações em R-Múltiplos. Média esperada que o sistema produz por unidade de risco assumida.">ⓘ</span>
            </div>
            <div class="sqn-kpi-big-value ${report.expectancy >= 0 ? 'good' : 'bad'}">
              ${report.expectancyFormatted || '—'}
            </div>
            <div class="sqn-kpi-sub">
              Média esperada por trade executado
            </div>
            <p class="sqn-kpi-desc">
              Cada trade arriscando 1R produz em média <strong>${report.expectancyFormatted}</strong> de retorno líquido.
            </p>
          </article>

          <!-- Card 3: Desvio-Padrão Amostral (R) -->
          <article class="card sqn-kpi-card">
            <div class="sqn-kpi-head">
              <span class="sqn-kpi-eyebrow">Desvio-Padrão Amostral (s)</span>
              <span class="sqn-tooltip-trigger" title="Desvio-padrão amostral (N-1) dos R-Múltiplos. Mede a dispersão em torno da Expectancy. Quanto menor, mais suave e previsível é a curva de resultados.">ⓘ</span>
            </div>
            <div class="sqn-kpi-big-value">
              ${report.standardDeviationFormatted || '—'}
            </div>
            <div class="sqn-kpi-sub">
              Grau de dispersão e variabilidade dos R
            </div>
            <p class="sqn-kpi-desc">
              Valores baixos de dispersão facilitam o dimensionamento de posição e protegem o estado psicológico.
            </p>
          </article>

          <!-- Card 4: Trades Analisados (N) -->
          <article class="card sqn-kpi-card">
            <div class="sqn-kpi-head">
              <span class="sqn-kpi-eyebrow">Trades Analisados (N)</span>
              <span class="sqn-tooltip-trigger" title="Quantidade de operações efetivamente encerradas e válidas para o cálculo. Nunca inclui trades em aberto ou ordens canceladas.">ⓘ</span>
            </div>
            <div class="sqn-kpi-big-value">
              ${report.sampleSize}
            </div>
            <div class="sqn-kpi-sub">
              Operações encerradas com R realizado
            </div>
            <p class="sqn-kpi-desc">
              ${report.sampleSize >= 30 ? 'Base com significância estatística representativa (≥30 trades).' : 'Amostra em consolidação histórica (<30 trades).'}
            </p>
          </article>
        </section>

        <!-- 2.2. Seção: Distribuição e Anatomia Estatística dos R-Múltiplos -->
        <section class="card sqn-dist-section">
          <div class="sqn-section-header">
            <div>
              <span class="sqn-eyebrow">ANATOMIA MATEMÁTICA</span>
              <h2 class="sqn-section-title">Distribuição dos R-Múltiplos</h2>
              <p class="sqn-section-desc">
                Análise aprofundada da dispersão e frequência dos resultados em R para avaliar se a consistência é homogênea ou se depende de trades excepcionais isolados.
              </p>
            </div>
          </div>

          <!-- Métricas de Dispersão e Assimetria de R -->
          <div class="sqn-dist-metrics-grid">
            <div class="sqn-dist-mini-metric">
              <small>R Médio Geral</small>
              <strong>${report.expectancyFormatted}</strong>
            </div>
            <div class="sqn-dist-mini-metric">
              <small>R Médio Vencedores</small>
              <strong class="good">+${rDist.avgWinR.toFixed(2).replace('.', ',')}R</strong>
            </div>
            <div class="sqn-dist-mini-metric">
              <small>R Médio Perdedores</small>
              <strong class="bad">-${rDist.avgLossR.toFixed(2).replace('.', ',')}R</strong>
            </div>
            <div class="sqn-dist-mini-metric">
              <small>Melhor Trade (Max R)</small>
              <strong class="good">${rDist.bestR >= 0 ? '+' : ''}${rDist.bestR.toFixed(2).replace('.', ',')}R</strong>
            </div>
            <div class="sqn-dist-mini-metric">
              <small>Pior Trade (Min R)</small>
              <strong class="bad">${rDist.worstR.toFixed(2).replace('.', ',')}R</strong>
            </div>
            <div class="sqn-dist-mini-metric">
              <small>Win / Loss Ratio (R)</small>
              <strong>${rDist.winLossRatio ? rDist.winLossRatio.toFixed(2).replace('.', ',') : '—'}</strong>
            </div>
          </div>

          <!-- Histograma de Barras por Faixas de R -->
          <div class="sqn-dist-chart-wrap" style="margin-top:20px;">
            <div class="sqn-dist-chart-title">Frequência por Faixa de R-Múltiplos</div>
            <div class="sqn-svg-chart-container" style="height:210px;">
              ${distChart}
            </div>
          </div>
        </section>

        <!-- 2.3. Seção: Evolução Histórica — Rolling SQN -->
        <section class="card sqn-chart-card">
          <div class="sqn-chart-head">
            <div>
              <span class="sqn-eyebrow">ACOMPANHAMENTO TEMPORAL</span>
              <h2 class="sqn-section-title">Evolução Acumulada da Qualidade Estatística (Rolling SQN)</h2>
              <p class="sqn-section-desc">
                Acompanhe trade a trade se o método está construindo consistência estatística, estabilizando ou degradando a qualidade operacional ao longo do tempo.
              </p>
            </div>
            <div class="sqn-chart-trend-pill ${trendTone}">
              <span>Tendência: <strong>${esc(trendText)}</strong></span>
            </div>
          </div>

          <div class="sqn-svg-chart-container">
            ${svgChart}
          </div>
        </section>

        <!-- 2.4. Interpretação Estatística Pedagógica -->
        <section class="sqn-pedagogical-grid">
          <article class="card sqn-pedagogical-box">
            <div class="sqn-pedagogical-icon">📐</div>
            <div class="sqn-pedagogical-body">
              <h3>Como o SQN avalia o sistema</h3>
              <p>
                O <strong>System Quality Number (SQN)</strong> de Van K. Tharp quantifica quão fácil é extrair lucro do sistema de forma consistente: <code>SQN = (Expectancy ÷ Desvio-Padrão) × √N</code>. Ele equilibra o ganho médio esperado com a estabilidade dos desfechos.
              </p>
            </div>
          </article>

          <article class="card sqn-pedagogical-box">
            <div class="sqn-pedagogical-icon">⚖️</div>
            <div class="sqn-pedagogical-body">
              <h3>Por que o Desvio-Padrão importa</h3>
              <p>
                Um sistema com lucro alto mas desvio-padrão descontrolado gera drawdowns agressivos e desconforto emocional. Desvio-padrão reduzido significa que as perdas são contidas no stop padrão e os ganhos são regulares, permitindo dimensionamento seguro.
              </p>
            </div>
          </article>

          <article class="card sqn-pedagogical-box">
            <div class="sqn-pedagogical-icon">🛡️</div>
            <div class="sqn-pedagogical-body">
              <h3>Confiabilidade da Amostra (N)</h3>
              <p>
                O SQN requer no mínimo 30 operações encerradas para que a inferência estatística tenha relevância, e mais de 100 operações para atingir o padrão ouro. Um SQN alto com menos de 30 trades é preliminar e não garante consistência futura.
              </p>
            </div>
          </article>
        </section>
      </main>
    `;
  }

  /**
   * 3. Card de Acesso Executivo para o Painel da Verdade (#analytics)
   */
  function generateTruthPanelAccessCardHtml(tradesOrReport) {
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
      <article class="card truth-system-quality-access-card" id="truthSystemQualityAccessCard" onclick="typeof go==='function'&&go('systemquality')" role="button" tabindex="0" aria-label="Acessar Qualidade Estatística do Sistema">
        <div class="truth-sqn-access-left">
          <div class="sqn-eyebrow">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 12h8M12 8v8"></path>
            </svg>
            INTELIGÊNCIA ESTATÍSTICA
          </div>
          <h3 class="truth-sqn-access-title">Qualidade Estatística do Sistema (SQN)</h3>
          <p class="truth-sqn-access-desc">Explore o SQN, Expectancy, desvio-padrão e distribuição dos R-múltiplos do seu método.</p>
        </div>
        <div class="truth-sqn-access-right">
          <div class="truth-sqn-access-kpi">
            <small>SQN Atual</small>
            <strong class="sqn-kpi-val">${sqnVal}</strong>
            <span class="sqn-badge ${badgeClass}">${esc(classification.label)}</span>
          </div>
          <button type="button" class="primary truth-sqn-access-btn" onclick="typeof go==='function'&&go('systemquality');event.stopPropagation();">
            Explorar Qualidade Estatística →
          </button>
        </div>
      </article>
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
      <section class="card sqn-embedded-risk-card" id="riskPolicySqnCard">
        <div class="sqn-embedded-risk-head">
          <div>
            <span class="sqn-eyebrow">GOVERNANÇA ESTATÍSTICA DO SISTEMA</span>
            <h3 class="sqn-embedded-risk-title">
              Qualidade do Sistema (SQN) — Indicador Complementar de Risco
            </h3>
            <p class="sqn-embedded-risk-desc">
              Avalia a consistência matemática das operações reais para calibrar o perfil de exposição com disciplina.
            </p>
          </div>
          <span class="sqn-badge ${badgeClass}">${esc(classification.label)}</span>
        </div>

        <div class="sqn-embedded-risk-grid">
          <div class="sqn-dist-mini-metric">
            <small>SQN Atual</small>
            <strong>${sqnVal}</strong>
            <span>${classification.label}</span>
          </div>

          <div class="sqn-dist-mini-metric">
            <small>Expectancy (R)</small>
            <strong class="${report.expectancy >= 0 ? 'good' : 'bad'}">${report.expectancyFormatted || '—'}</strong>
            <span>Média por trade</span>
          </div>

          <div class="sqn-dist-mini-metric">
            <small>Desvio-Padrão (s)</small>
            <strong>${report.standardDeviationFormatted || '—'}</strong>
            <span>Dispersão de R</span>
          </div>

          <div class="sqn-dist-mini-metric">
            <small>Amostra Analisada</small>
            <strong>${report.sampleSize}</strong>
            <span>${report.significance?.label || 'Trades'}</span>
          </div>
        </div>

        <div class="sqn-risk-banner">
          <div class="sqn-risk-banner-text">
            <strong>Diretriz de Risco:</strong> Este indicador é estritamente consultivo e informativo; ele <strong>não altera automaticamente</strong> o Risk Budget por Grade, o position sizing ou os limites de alocação de capital vigentes.
          </div>
          <button type="button" class="secondary" style="font-size:12px;padding:6px 14px;" onclick="typeof go==='function'&&go('systemquality')">
            Ver Qualidade Estatística Completa →
          </button>
        </div>
      </section>
    `;
  }

  /**
   * 5. Renderiza o card do SQN dentro do Simulador de Trades (estritamente isolado aos dados simulados)
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
              <h2 class="sim-rebuild-card-title">SQN da Simulação — Qualidade Estatística do Cenário</h2>
              <p class="sim-rebuild-card-desc">Cálculo hipotético segundo Van Tharp: SQN = (Expectancy ÷ Desvio-Padrão) × √N (não interfere nos dados reais).</p>
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
              <div class="sim-subcard-label">SQN Simulado</div>
              <div class="sim-subcard-main-val pos">
                ${sqnReport.sqnFormatted || '—'}
              </div>
              <div class="sim-subcard-sub-line">
                <span class="equiv-tag">Classificação: <strong>${esc(classification.label)}</strong></span>
                <span class="count-tag">${sqnReport.sampleSize} trades simulados</span>
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
              <div class="sim-subcard-trophy-title">Dispersão e Vantagem Estatística Simulada</div>
              <p class="sim-subcard-trophy-text" style="margin-bottom: 8px;">
                Expectancy: <strong style="color: var(--sqn-kpi-val-good, #059669);">${sqnReport.expectancyFormatted}</strong> | Desvio-Padrão: <strong style="color: var(--sqn-text-primary, #0f172a);">${sqnReport.standardDeviationFormatted}</strong>
              </p>
              <div style="font-size: 11.5px; color: var(--sqn-text-muted, #64748b); line-height: 1.4;">
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
    renderRDistributionChartSvg,
    renderScaleBarMarkup,
    generateSystemQualityPageHtml,
    generateTruthPanelAccessCardHtml,
    generateRiskPolicyCardHtml,
    generateSimulatorSqnCardHtml
  });
});

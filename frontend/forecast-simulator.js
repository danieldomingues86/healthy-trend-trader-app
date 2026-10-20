/**
 * HEALTHY TREND TRADER — SIMULADOR DE RESULTADOS (CONTROLLER & UI)
 *
 * Implementa o simulador probabilístico de Monte Carlo com suporte estrito a duas fontes:
 * 1. Trades Reais (Diário de Trades / Carteira)
 * 2. Trades Simulados (Simulador de Trades)
 * Sem fontes híbridas, sem dados fictícios.
 */

(function(root) {
  'use strict';

  // Estado da aplicação para o Simulador de Resultados
  const state = {
    source: 'simulated', // 'simulated' | 'real' (ESTRITAMENTE DUAS FONTES)
    period: 'ALL',       // 'ALL' | '30d' | '90d' | '180d' | '365d' | 'ytd'
    trigger: 'ALL',      // 'ALL' | string
    mode: 'target',      // 'target' (Quero chegar em X%) | 'horizon' (Depois de X trades)
    targetPct: 30,
    targetEquity: 0,
    trades: 200,
    tradesPerMonth: 12,
    profile: 'current',  // 'conservative' | 'current' | 'aggressive'
    runs: 5000,
    customEquity: null,
    showHelpModal: false,
    showSampleModal: false
  };

  // Formatadores de valores
  const formatMoney = (val, maxDigits = 0) => {
    if (val == null || !Number.isFinite(Number(val))) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: maxDigits,
      minimumFractionDigits: maxDigits
    }).format(val);
  };

  const parseMoney = val => {
    if (typeof val === 'number') return val;
    return Number(String(val).replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  };

  const formatPct = (val, digits = 1) => {
    if (val == null || !Number.isFinite(Number(val))) return '—';
    const num = Number(val);
    return `${(num > 1 ? num : num * 100).toLocaleString('pt-BR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })}%`;
  };

  const formatR = (val, digits = 2) => {
    if (val == null || !Number.isFinite(Number(val))) return '—';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toLocaleString('pt-BR', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })}R`;
  };

  const timeLabel = months => {
    if (months == null || !Number.isFinite(months) || months <= 0) return '—';
    if (months < 1) return '< 1 mês';
    if (months < 12) return `~${Math.round(months)} meses`;
    const years = months / 12;
    return `~${years.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos`;
  };

  // Patrimônio operacional base
  const getEquity = () => {
    if (state.customEquity != null && state.customEquity > 0) {
      return state.customEquity;
    }
    if (typeof OPERATIONAL_EQUITY === 'number' && OPERATIONAL_EQUITY > 0) {
      return OPERATIONAL_EQUITY;
    }
    if (typeof root.OPERATIONAL_EQUITY === 'number' && root.OPERATIONAL_EQUITY > 0) {
      return root.OPERATIONAL_EQUITY;
    }
    return 100000;
  };

  // Risco percentual por trade
  const getCurrentRisk = () => {
    try {
      if (typeof riskPolicyState !== 'undefined' && Array.isArray(riskPolicyState?.grades)) {
        const gradeB = riskPolicyState.grades.find(item => item.grade === 'B');
        if (gradeB && Number.isFinite(Number(gradeB.riskPct))) {
          return Number(gradeB.riskPct);
        }
      }
    } catch (_) {}
    return 0.002; // Padrão seguro 0.20%
  };

  const getRisks = () => {
    const curr = getCurrentRisk();
    return {
      conservative: Math.max(0.0005, Number((curr * 0.5).toFixed(4))),
      current: curr,
      aggressive: Math.min(0.02, Number((curr * 1.65).toFixed(4)))
    };
  };

  const riskFor = profile => getRisks()[profile] || getRisks().current;

  // Valor alvo do patrimônio
  const getTargetValue = () => {
    const eq = getEquity();
    if (state.targetEquity > eq) return state.targetEquity;
    return eq * (1 + (state.targetPct || 30) / 100);
  };

  /**
   * Extração de trades reais encerrados (Diário / Posições Fechadas)
   * Filtra estritamente status === 'closed'
   */
  function getRealClosedTrades() {
    try {
      const dbTrades = (typeof synchronizedTrades !== 'undefined' && Array.isArray(synchronizedTrades))
        ? synchronizedTrades.filter(t => t && String(t.status).toLowerCase() === 'closed')
        : [];

      if (dbTrades.length > 0) {
        return dbTrades.map(t => {
          let r = null;
          if (typeof analyticsTrade === 'function') {
            try { r = analyticsTrade(t).r; } catch (_) {}
          }
          if (!Number.isFinite(r)) {
            r = Number(t.resultR ?? t.result_r ?? t.r ?? 0);
          }
          return {
            id: t.id,
            ticker: t.ticker || t.asset || 'Ativo',
            r: Number.isFinite(r) ? r : 0,
            triggerName: t.triggerName || t.trigger_name || t.setup_trigger || t.setupTrigger || t.trigger || 'Outros',
            entryDate: t.entryDate || t.entry_date || t.date,
            exitDate: t.exitDate || t.exit_date || t.closedAt || t.closed_at,
            mfeR: Number(t.mfeR ?? t.mfe_r ?? t.mfe),
            maeR: Number(t.maeR ?? t.mae_r ?? t.mae),
            duration: Number(t.duration ?? t.days ?? t.pregoes)
          };
        }).filter(t => Number.isFinite(t.r));
      }

      const localPositions = (typeof operationalState !== 'undefined' && Array.isArray(operationalState.closedPositions))
        ? operationalState.closedPositions
        : [];

      return localPositions.map(p => {
        let realized = 0;
        if (typeof operationMetrics === 'function') {
          try {
            const m = operationMetrics(p);
            realized = m.realized || 0;
          } catch (_) {}
        }
        const risk = Number(p.initialRisk) || Math.abs((p.entry || 0) - (p.initialStop || p.currentStop || 0)) * (p.initialQty || 1);
        const r = risk > 0 ? realized / risk : (Number(p.r) || 0);

        return {
          id: p.id,
          ticker: p.ticker || p.asset || 'Ativo',
          r: Number.isFinite(r) ? r : 0,
          triggerName: p.triggerName || p.trigger || p.setup || 'Outros',
          entryDate: p.entryDate || p.openedAt,
          exitDate: p.exitDate || p.closedAt,
          mfeR: Number(p.mfeR ?? p.mfe),
          maeR: Number(p.maeR ?? p.mae),
          duration: Number(p.duration)
        };
      }).filter(t => Number.isFinite(t.r));
    } catch (err) {
      console.warn('Erro ao carregar trades reais:', err);
      return [];
    }
  }

  /**
   * Extração de trades simulados encerrados (Simulador de Trades)
   * Filtra estritamente status === 'CLOSED_GAIN' || status === 'CLOSED_LOSS' || status === 'CLOSED'
   */
  function getSimulatedClosedTrades() {
    try {
      let sims = [];
      if (root.TradeSimulator && typeof root.TradeSimulator.getState === 'function') {
        const simState = root.TradeSimulator.getState();
        if (simState && Array.isArray(simState.simulations)) {
          sims = simState.simulations;
        }
      }

      // Filtra estritamente posições que foram executadas e ENCERRADAS
      const closed = sims.filter(s => {
        if (!s || !s.status) return false;
        const st = String(s.status).toUpperCase();
        return st === 'CLOSED_GAIN' || st === 'CLOSED_LOSS' || st === 'CLOSED';
      });

      return closed.map(s => {
        const r = Number(s.resultR ?? s.result_r ?? s.r);
        return {
          id: s.id,
          ticker: s.ticker || 'Simulação',
          r: Number.isFinite(r) ? r : 0,
          triggerName: s.triggerName || s.setupTrigger || s.trigger || 'Outros',
          entryDate: s.entryDate || s.executedEntryDate || s.signalDate,
          exitDate: s.exitDate || s.evaluatedAt,
          mfeR: Number(s.mfeR ?? s.mfe_r ?? s.maxR),
          maeR: Number(s.maeR ?? s.mae_r ?? s.minR),
          duration: Number(s.durationDays ?? s.duration)
        };
      }).filter(t => Number.isFinite(t.r));
    } catch (err) {
      console.warn('Erro ao carregar trades simulados:', err);
      return [];
    }
  }

  /**
   * Retorna os trades brutos da fonte ativa
   */
  function getSourceTrades() {
    if (state.source === 'real') {
      return getRealClosedTrades();
    }
    return getSimulatedClosedTrades();
  }

  /**
   * Extrai a lista de gatilhos disponíveis na fonte ativa
   */
  function getAvailableTriggers(rawTrades) {
    const list = Array.isArray(rawTrades) ? rawTrades : [];
    const set = new Set();
    list.forEach(t => {
      const name = String(t.triggerName || 'Outros').trim();
      if (name && name !== 'null' && name !== 'undefined') set.add(name);
    });
    return Array.from(set).sort();
  }

  /**
   * Renderiza o gráfico SVG de Curvas de Patrimônio (Monte Carlo)
   */
  function renderChart(result, targetVal, sampleCount) {
    if (!sampleCount || !result || !result.bands || !result.bands.length) {
      return `
        <div class="forecast-chart-empty-state">
          <div class="forecast-empty-icon">∿</div>
          <h3>Nenhum trade encerrado disponível para simulação</h3>
          <p>
            ${state.source === 'real'
              ? 'Registre e encerre operações no Diário de Trades para compor a distribuição empírica de R.'
              : 'O Simulador de Trades ainda não possui simulações encerradas. Execute e encerre estudos para visualizar projeções probabilísticas.'}
          </p>
          <button type="button" class="forecast-empty-btn" onclick="go('${state.source === 'real' ? 'positions' : 'tradesimulator'}')">
            ${state.source === 'real' ? 'Ver Posições e Diário →' : 'Ir para o Simulador de Trades →'}
          </button>
        </div>
      `;
    }

    const bands = result.bands;
    const paths = result.paths || [];
    const width = 1000;
    const height = 320;
    const pad = { l: 85, r: 40, t: 30, b: 40 };

    const allValues = bands.flatMap(p => [p.p10, p.p90, targetVal]);
    const minVal = Math.min(...allValues) * 0.96;
    const maxVal = Math.max(...allValues) * 1.04;
    const range = maxVal - minVal || 1;

    const x = i => pad.l + (i / (bands.length - 1)) * (width - pad.l - pad.r);
    const y = v => pad.t + ((maxVal - v) / range) * (height - pad.t - pad.b);

    const linePath = values => values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

    const bandPath = `M${bands.map((p, i) => `${x(i).toFixed(1)},${y(p.p90).toFixed(1)}`).join(' L')} L${[...bands].reverse().map((p, i) => `${x(bands.length - 1 - i).toFixed(1)},${y(p.p10).toFixed(1)}`).join(' L')} Z`;

    // 5 linhas horizontais de grade
    const yTicks = [0, 0.25, 0.5, 0.75, 1];
    const gridLines = yTicks.map(t => {
      const yPos = pad.t + t * (height - pad.t - pad.b);
      const val = maxVal - t * range;
      return `
        <line class="forecast-grid-line" x1="${pad.l}" x2="${width - pad.r}" y1="${yPos}" y2="${yPos}" />
        <text class="forecast-axis-y" x="${pad.l - 12}" y="${yPos + 4}" text-anchor="end">${formatMoney(val)}</text>
      `;
    }).join('');

    // Ticks do eixo X (número de trades)
    const maxTrades = bands.length - 1;
    const stepCount = 8;
    const xStep = Math.max(1, Math.round(maxTrades / stepCount));
    const xTicks = [];
    for (let t = 0; t <= maxTrades; t += xStep) {
      xTicks.push(t);
    }
    if (xTicks[xTicks.length - 1] !== maxTrades) {
      xTicks.push(maxTrades);
    }

    const xAxisLabels = xTicks.map(tradeNum => `
      <text class="forecast-axis-x" x="${x(tradeNum).toFixed(1)}" y="${height - 12}" text-anchor="middle">${tradeNum}</text>
    `).join('');

    const targetY = y(targetVal);

    return `
      <svg class="forecast-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Curvas de Patrimônio Monte Carlo">
        <defs>
          <linearGradient id="pBandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.04" />
          </linearGradient>
        </defs>

        <!-- Grade horizontal e labels Y -->
        ${gridLines}

        <!-- Faixa de confiança P10-P90 -->
        <path class="forecast-band-area" d="${bandPath}" fill="url(#pBandGrad)" />

        <!-- Amostras de trajetórias individuais (linhas orgânicas finas) -->
        ${paths.slice(0, 22).map(p => `<path class="forecast-single-path" d="${linePath(p)}" />`).join('')}

        <!-- Linha da Mediana (P50) -->
        <path class="forecast-median-line" d="${linePath(bands.map(p => p.p50))}" />

        <!-- Linha de Meta -->
        ${targetVal ? `
          <line class="forecast-target-dash" x1="${pad.l}" x2="${width - pad.r}" y1="${targetY}" y2="${targetY}" />
          <rect class="forecast-target-badge-bg" x="${pad.l + 8}" y="${Math.max(6, targetY - 22)}" width="145" height="18" rx="4" />
          <text class="forecast-target-badge-text" x="${pad.l + 14}" y="${Math.max(18, targetY - 9)}">Meta: ${formatMoney(targetVal)}</text>
        ` : ''}

        <!-- Eixo X labels -->
        ${xAxisLabels}
        <text class="forecast-axis-title" x="${(width + pad.l - pad.r) / 2}" y="${height - 2}" text-anchor="middle">Número de trades</text>
      </svg>
    `;
  }

  /**
   * Renderiza o histograma de distribuição empírica de R em 7 faixas
   */
  function renderDistributionHistogram(buckets, totalTrades) {
    if (!totalTrades) {
      return `
        <div class="forecast-histogram-empty">
          <p>Sem dados para calcular a distribuição empírica.</p>
        </div>
      `;
    }

    const maxPct = Math.max(...buckets.map(b => b.pct), 1);

    const bars = buckets.map(b => {
      const barHeightPct = Math.max(6, (b.pct / maxPct) * 100);
      return `
        <div class="forecast-hist-col" title="${b.label}: ${b.count} trades (${b.pct.toFixed(1)}%)">
          <div class="forecast-hist-value">${b.pct > 0 ? `${b.pct.toFixed(0)}%` : '0'}</div>
          <div class="forecast-hist-bar-track">
            <div class="forecast-hist-bar ${b.color}" style="height: ${barHeightPct}%;"></div>
          </div>
          <div class="forecast-hist-label">${b.label}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="forecast-hist-wrapper">
        <div class="forecast-hist-bars">${bars}</div>
      </div>
    `;
  }

  /**
   * Renderiza a tabela de quebra por gatilho
   */
  function renderTriggerTable(triggerList) {
    if (!triggerList || !triggerList.length) {
      return `
        <div class="forecast-trigger-empty">
          <p>Nenhum gatilho registrado no conjunto filtrado.</p>
        </div>
      `;
    }

    const maxR = Math.max(...triggerList.map(t => Math.max(0.1, t.totalR)), 1);

    return `
      <div class="forecast-trigger-table">
        <div class="forecast-trigger-head">
          <span>Gatilho</span>
          <span style="text-align: right;">Resultado (R)</span>
          <span style="text-align: right;">Trades</span>
        </div>
        <div class="forecast-trigger-body">
          ${triggerList.slice(0, 6).map(item => {
            const barWidth = Math.max(4, Math.min(100, (Math.max(0, item.totalR) / maxR) * 100));
            const isPos = item.totalR >= 0;
            return `
              <div class="forecast-trigger-row">
                <div class="forecast-trigger-name" title="${item.name}">${item.name}</div>
                <div class="forecast-trigger-bar-col">
                  <div class="forecast-trigger-bar-bg">
                    <div class="forecast-trigger-bar-fill ${isPos ? 'pos' : 'neg'}" style="width: ${barWidth}%;"></div>
                  </div>
                  <span class="forecast-trigger-val ${isPos ? 'pos' : 'neg'}">${formatR(item.totalR, 1)}</span>
                </div>
                <div class="forecast-trigger-count">${item.count}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Modal "? Como funciona?"
   */
  function renderHelpModal() {
    if (!state.showHelpModal) return '';
    return `
      <div class="forecast-modal-overlay open" id="forecastHelpModal">
        <div class="forecast-modal-box">
          <div class="forecast-modal-header">
            <div>
              <div class="forecast-modal-badge">GUIA METODOLÓGICO</div>
              <h2>Como funciona o Simulador de Resultados?</h2>
            </div>
            <button class="forecast-modal-close" type="button" id="forecastHelpClose" title="Fechar">×</button>
          </div>
          <div class="forecast-modal-body">
            <article class="forecast-help-card">
              <div class="forecast-help-step">1</div>
              <div>
                <h3>Simulador de Resultados vs. Simulador de Trades</h3>
                <p>
                  O <strong>Simulador de Trades</strong> investiga o passado/recente de cada ativo ("O que teria acontecido com este sinal?").<br>
                  O <strong>Simulador de Resultados</strong> projeta o futuro do seu patrimônio usando modelagem estocástica ("Quais trajetórias de capital são possíveis a partir do comportamento histórico do meu método?").
                </p>
              </div>
            </article>

            <article class="forecast-help-card">
              <div class="forecast-help-step">2</div>
              <div>
                <h3>Fontes de Dados Exclusivas (Sem dados fictícios)</h3>
                <p>
                  Você pode simular usando seus <strong>Trades Reais</strong> (do Diário de Operações) ou seus <strong>Trades Simulados</strong> (do Simulador de Trades).
                  Não combinamos as fontes nem injetamos distribuições teóricas gaussianas. Apenas operações fechadas compõem a distribuição empírica.
                </p>
              </div>
            </article>

            <article class="forecast-help-card">
              <div class="forecast-help-step">3</div>
              <div>
                <h3>Simulação de Monte Carlo (5.000 caminhos)</h3>
                <p>
                  O algoritmo sorteia 5.000 sequências aleatórias da sua distribuição histórica de R, aplicando compounding e o Position Sizing definido pela sua política de risco. Isso revela o impacto de sequências de perdas, ganhos e oscilações normais.
                </p>
              </div>
            </article>

            <article class="forecast-help-card">
              <div class="forecast-help-step">4</div>
              <div>
                <h3>Como interpretar as métricas probabilísticas</h3>
                <p>
                  <strong>Mediana (P50):</strong> o caminho central esperado. Metade das trajetórias ficou acima e metade abaixo.<br>
                  <strong>Faixa Provável (P10 - P90):</strong> 80% das trajetórias ficaram dentro deste intervalo sombreado.<br>
                  <strong>Drawdown Provável:</strong> a oscilação negativa máxima típica esperada ao longo do processo.
                </p>
              </div>
            </article>
          </div>
          <div class="forecast-modal-footer">
            <button type="button" class="forecast-modal-btn primary" id="forecastHelpGotIt">Entendi, continuar simulação</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Modal "Detalhes da amostra"
   */
  function renderSampleModal(trades) {
    if (!state.showSampleModal) return '';
    return `
      <div class="forecast-modal-overlay open" id="forecastSampleModal">
        <div class="forecast-modal-box forecast-sample-box">
          <div class="forecast-modal-header">
            <div>
              <div class="forecast-modal-badge">AMOSTRA DE DADOS</div>
              <h2>Operações que compõem a simulação (${trades.length})</h2>
              <p>Fonte: <strong>${state.source === 'real' ? 'Trades Reais' : 'Trades Simulados'}</strong></p>
            </div>
            <button class="forecast-modal-close" type="button" id="forecastSampleClose" title="Fechar">×</button>
          </div>
          <div class="forecast-modal-body" style="max-height: 400px; overflow-y: auto;">
            <table class="forecast-sample-table">
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Gatilho</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Duração</th>
                  <th style="text-align: right;">Resultado (R)</th>
                </tr>
              </thead>
              <tbody>
                ${trades.length ? trades.map(t => `
                  <tr>
                    <td><strong>${t.ticker}</strong></td>
                    <td>${t.triggerName}</td>
                    <td>${t.entryDate ? new Date(t.entryDate).toLocaleDateString('pt-BR') : '—'}</td>
                    <td>${t.exitDate ? new Date(t.exitDate).toLocaleDateString('pt-BR') : '—'}</td>
                    <td>${t.duration ? `${t.duration} d` : '—'}</td>
                    <td style="text-align: right;" class="${t.r >= 0 ? 'pos-cell' : 'neg-cell'}">
                      <strong>${formatR(t.r)}</strong>
                    </td>
                  </tr>
                `).join('') : `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 24px;">Nenhum trade encontrado nesta amostra.</td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
          <div class="forecast-modal-footer">
            <button type="button" class="forecast-modal-btn" id="forecastSampleGotIt">Fechar</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Função principal de renderização da tela
   */
  function render() {
    const rootEl = document.getElementById('forecastRoot');
    if (!rootEl) return;

    // 1. Obter trades da fonte selecionada
    const rawTrades = getSourceTrades();
    const availableTriggers = getAvailableTriggers(rawTrades);

    // Ajusta o gatilho caso o selecionado não exista na fonte atual
    if (state.trigger !== 'ALL' && !availableTriggers.includes(state.trigger)) {
      state.trigger = 'ALL';
    }

    // 2. Filtrar trades por período e gatilho
    const filteredTrades = ForecastSimulator.filterTrades(rawTrades, {
      period: state.period,
      trigger: state.trigger
    });

    const rValues = filteredTrades.map(t => t.r);
    const sampleCount = rValues.length;

    // 3. Cálculos estatísticos
    const stats = ForecastSimulator.keyStatistics(filteredTrades);
    const buckets = ForecastSimulator.distributionBuckets(rValues);
    const triggerData = ForecastSimulator.triggerBreakdown(filteredTrades);
    const summary = ForecastSimulator.summary(rValues);

    const equity = getEquity();
    const target = getTargetValue();
    const risk = riskFor(state.profile);

    // 4. Executar Simulação Monte Carlo
    let simResult = null;
    let estimatedTrades = null;
    let tradeRange = null;
    let hitProb = null;
    let probableDd = null;
    let projectedEquity = null;

    if (sampleCount > 0) {
      try {
        if (state.mode === 'target') {
          simResult = ForecastSimulator.simulateTarget({
            equity,
            riskPct: risk,
            rValues,
            target,
            runs: state.runs,
            maxTrades: 1200,
            seed: 20260907
          });
          estimatedTrades = simResult.estimatedTrades;
          tradeRange = simResult.tradeRange;
          hitProb = simResult.hitProbability;
          probableDd = simResult.drawdownLikely;
          projectedEquity = target;

          // Executa simulação com horizonte correspondente para renderizar curvas visuais no gráfico
          const horizon = Math.min(1200, Math.max(60, Math.ceil((simResult.tradeRange?.[1] || 250) / 20) * 20));
          const chartProxy = ForecastSimulator.simulateFixed({
            equity,
            riskPct: risk,
            rValues,
            runs: state.runs,
            trades: horizon,
            target,
            seed: 20260907
          });
          simResult.bands = chartProxy.bands;
          simResult.paths = chartProxy.paths;
        } else {
          simResult = ForecastSimulator.simulateFixed({
            equity,
            riskPct: risk,
            rValues,
            trades: state.trades,
            target,
            runs: state.runs,
            seed: 20260907
          });
          estimatedTrades = state.trades;
          hitProb = simResult.targetProbability;
          probableDd = simResult.drawdownLikely;
          projectedEquity = simResult.median;
        }
      } catch (err) {
        console.error('Falha na simulação Monte Carlo:', err);
      }
    }

    // Cálculos de tempo até a meta
    const monthsUntilTarget = estimatedTrades != null ? (estimatedTrades / Math.max(1, state.tradesPerMonth)) : null;

    // 5. Construção do HTML da tela
    rootEl.innerHTML = `
      <div class="forecast-page-container">
        <!-- Topo da página: Título, Badge Beta, Subtítulo e Filtros -->
        <header class="forecast-header-bar">
          <div class="forecast-title-group">
            <div class="forecast-title-row">
              <h1>Simulador de Resultados</h1>
              <span class="forecast-beta-badge">BETA</span>
            </div>
            <p class="forecast-subtitle">Projete a evolução do seu patrimônio com base no desempenho histórico do seu método.</p>
          </div>

          <div class="forecast-top-controls">
            <button type="button" class="forecast-help-pill" id="forecastHelpBtn">
              <span class="forecast-help-icon">?</span> Como funciona?
            </button>

            <!-- Dropdown 1: Fonte dos Dados (ESTRITAMENTE DUAS OPÇÕES) -->
            <div class="forecast-filter-item">
              <label>Fonte dos dados</label>
              <div class="forecast-select-wrapper">
                <select id="forecastSourceSelect" class="forecast-top-select">
                  <option value="simulated" ${state.source === 'simulated' ? 'selected' : ''}>Trades Simulados</option>
                  <option value="real" ${state.source === 'real' ? 'selected' : ''}>Trades Reais</option>
                </select>
              </div>
            </div>

            <!-- Dropdown 2: Período -->
            <div class="forecast-filter-item">
              <label>Período</label>
              <div class="forecast-select-wrapper">
                <select id="forecastPeriodSelect" class="forecast-top-select">
                  <option value="ALL" ${state.period === 'ALL' ? 'selected' : ''}>Todos os períodos</option>
                  <option value="30d" ${state.period === '30d' ? 'selected' : ''}>Últimos 30 dias</option>
                  <option value="90d" ${state.period === '90d' ? 'selected' : ''}>Últimos 90 dias</option>
                  <option value="180d" ${state.period === '180d' ? 'selected' : ''}>Últimos 6 meses</option>
                  <option value="365d" ${state.period === '365d' ? 'selected' : ''}>Último 1 ano</option>
                  <option value="ytd" ${state.period === 'ytd' ? 'selected' : ''}>Ano atual (YTD)</option>
                </select>
              </div>
            </div>

            <!-- Dropdown 3: Gatilho -->
            <div class="forecast-filter-item">
              <label>Gatilho</label>
              <div class="forecast-select-wrapper">
                <select id="forecastTriggerSelect" class="forecast-top-select">
                  <option value="ALL" ${state.trigger === 'ALL' ? 'selected' : ''}>Todos os gatilhos</option>
                  ${availableTriggers.map(trig => `
                    <option value="${trig}" ${state.trigger === trig ? 'selected' : ''}>${trig}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Botão Mais Opções -->
            <button type="button" class="forecast-more-btn" id="forecastMoreBtn" title="Mais opções">•••</button>
          </div>
        </header>

        <!-- Banner Hero Artístico — Processo Probabilístico -->
        <section class="forecast-hero-banner">
          <div class="forecast-hero-content">
            <div class="forecast-hero-eyebrow">— PROCESSO PROBABILÍSTICO</div>
            <h2 class="forecast-hero-title">Simulador de<br>Resultados</h2>
            <p class="forecast-hero-desc">
              Transforme o comportamento do seu método em milhares de trajetórias possíveis — com compounding, Position Sizing e tempo operacional.
            </p>
          </div>

          <div class="forecast-hero-nodes">
            <div class="forecast-node-item">
              <div class="forecast-node-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
              </div>
              <div class="forecast-node-title">DADOS HISTÓRICOS</div>
              <div class="forecast-node-sub">Trades fechados (${state.source === 'real' ? 'reais' : 'simulados'})</div>
            </div>

            <div class="forecast-node-connector"></div>

            <div class="forecast-node-item">
              <div class="forecast-node-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              </div>
              <div class="forecast-node-title">DISTRIBUIÇÃO DE R</div>
              <div class="forecast-node-sub">Baseada no histórico selecionado</div>
            </div>

            <div class="forecast-node-connector"></div>

            <div class="forecast-node-item">
              <div class="forecast-node-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c4-8 8-8 12 0s8 8 12 0"/></svg>
              </div>
              <div class="forecast-node-title">MONTE CARLO</div>
              <div class="forecast-node-sub">Múltiplas trajetórias (5.000 simulações)</div>
            </div>

            <div class="forecast-node-connector"></div>

            <div class="forecast-node-item">
              <div class="forecast-node-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="7 7 17 7 17 17"/><line x1="7" y1="17" x2="17" y2="7"/></svg>
              </div>
              <div class="forecast-node-title">PROJEÇÃO</div>
              <div class="forecast-node-sub">Faixa provável de resultados</div>
            </div>

            <div class="forecast-node-connector"></div>

            <div class="forecast-node-item">
              <div class="forecast-node-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div class="forecast-node-title">OBJETIVO</div>
              <div class="forecast-node-sub">Tempo e probabilidade de atingir a meta</div>
            </div>
          </div>
        </section>

        <!-- Faixa de 7 Cards KPI -->
        <section class="forecast-kpi-row">
          <!-- 1. Expectancy -->
          <article class="forecast-kpi-card">
            <header class="forecast-kpi-head">
              <span class="forecast-kpi-label">Expectancy ⓘ</span>
              <span class="forecast-kpi-ico green">◎</span>
            </header>
            <strong class="forecast-kpi-val ${summary.expectancy >= 0 ? 'pos' : 'neg'}">
              ${sampleCount ? formatR(summary.expectancy) : '—'}
            </strong>
            <small class="forecast-kpi-sub">média por trade</small>
          </article>

          <!-- 2. Trades na amostra -->
          <article class="forecast-kpi-card">
            <header class="forecast-kpi-head">
              <span class="forecast-kpi-label">Trades na amostra</span>
              <span class="forecast-kpi-ico blue">▥</span>
            </header>
            <strong class="forecast-kpi-val">${sampleCount}</strong>
            <small class="forecast-kpi-sub">trades ${state.source === 'real' ? 'reais' : 'simulados'} fechados</small>
          </article>

          <!-- 3. Trades estimados -->
          <article class="forecast-kpi-card">
            <header class="forecast-kpi-head">
              <span class="forecast-kpi-label">Trades estimados</span>
              <span class="forecast-kpi-ico gray">⏳</span>
            </header>
            <strong class="forecast-kpi-val">
              ${estimatedTrades ? `~${Math.round(estimatedTrades)}` : '—'}
            </strong>
            <small class="forecast-kpi-sub">
              ${tradeRange ? `faixa ${Math.round(tradeRange[0])}–${Math.round(tradeRange[1])}` : (sampleCount ? `${state.trades} trades` : '—')}
            </small>
          </article>

          <!-- 4. Tempo até a meta -->
          <article class="forecast-kpi-card">
            <header class="forecast-kpi-head">
              <span class="forecast-kpi-label">Tempo até a meta</span>
              <span class="forecast-kpi-ico green">⏱</span>
            </header>
            <strong class="forecast-kpi-val">
              ${timeLabel(monthsUntilTarget)}
            </strong>
            <small class="forecast-kpi-sub">${state.tradesPerMonth} trades/mês</small>
          </article>

          <!-- 5. Probabilidade da meta -->
          <article class="forecast-kpi-card">
            <header class="forecast-kpi-head">
              <span class="forecast-kpi-label">Probabilidade da meta</span>
              <span class="forecast-kpi-ico coral">🎯</span>
            </header>
            <strong class="forecast-kpi-val">
              ${hitProb != null ? formatPct(hitProb, 0) : '—'}
            </strong>
            <small class="forecast-kpi-sub">5.000 simulações</small>
          </article>

          <!-- 6. Drawdown provável -->
          <article class="forecast-kpi-card">
            <header class="forecast-kpi-head">
              <span class="forecast-kpi-label">Drawdown provável</span>
              <span class="forecast-kpi-ico red">📉</span>
            </header>
            <strong class="forecast-kpi-val neg">
              ${probableDd != null ? `-${formatPct(probableDd, 1)}` : '—'}
            </strong>
            <small class="forecast-kpi-sub">mediana das trajetórias</small>
          </article>

          <!-- 7. Equity projetada -->
          <article class="forecast-kpi-card">
            <header class="forecast-kpi-head">
              <span class="forecast-kpi-label">Equity projetada</span>
              <span class="forecast-kpi-ico emerald">💰</span>
            </header>
            <strong class="forecast-kpi-val">
              ${projectedEquity ? formatMoney(projectedEquity) : '—'}
            </strong>
            <small class="forecast-kpi-sub">resultado mediano</small>
          </article>
        </section>

        <!-- Workbench Principal: Controles à esquerda, Gráfico e Cards à direita -->
        <div class="forecast-workbench-grid">
          <!-- Coluna Esquerda: Controles de Configuração -->
          <aside class="forecast-sidebar-col">
            <div class="forecast-panel-card">
              <div class="forecast-panel-overline">CONFIGURE A SIMULAÇÃO</div>
              <h3 class="forecast-panel-heading">O que você quer descobrir?</h3>
              <p class="forecast-panel-desc">
                Os resultados são recalculados a partir da distribuição de R do histórico selecionado.
              </p>

              <!-- Alternador de Modo -->
              <div class="forecast-mode-switch">
                <button type="button" class="forecast-mode-btn ${state.mode === 'target' ? 'active' : ''}" data-mode="target">
                  Quero chegar em X%
                </button>
                <button type="button" class="forecast-mode-btn ${state.mode === 'horizon' ? 'active' : ''}" data-mode="horizon">
                  Depois de X trades
                </button>
              </div>

              <!-- Formulário de Parâmetros -->
              <div class="forecast-form-fields">
                <div class="forecast-form-row">
                  <div class="forecast-input-group">
                    <label>Patrimônio atual</label>
                    <input type="text" id="forecastEquityInput" class="forecast-input" value="${formatMoney(equity)}" />
                  </div>
                  <div class="forecast-input-group">
                    <label>${state.mode === 'target' ? 'Objetivo (%)' : 'Quantidade de trades'}</label>
                    ${state.mode === 'target' ? `
                      <input type="number" id="forecastTargetPctInput" class="forecast-input" min="1" max="500" value="${state.targetPct}" />
                    ` : `
                      <select id="forecastTradesInput" class="forecast-select">
                        ${[50, 100, 200, 300, 500].map(cnt => `
                          <option value="${cnt}" ${state.trades === cnt ? 'selected' : ''}>${cnt} trades</option>
                        `).join('')}
                      </select>
                    `}
                  </div>
                </div>

                <div class="forecast-form-row">
                  <div class="forecast-input-group">
                    <label>Trades por mês</label>
                    <input type="number" id="forecastTradesPerMonthInput" class="forecast-input" min="1" max="100" value="${state.tradesPerMonth}" />
                  </div>
                  <div class="forecast-input-group">
                    <label>Política de risco</label>
                    <select id="forecastProfileSelect" class="forecast-select">
                      <option value="conservative" ${state.profile === 'conservative' ? 'selected' : ''}>Conservador (${formatPct(getRisks().conservative, 2)})</option>
                      <option value="current" ${state.profile === 'current' ? 'selected' : ''}>Atual (${formatPct(getRisks().current, 2)})</option>
                      <option value="aggressive" ${state.profile === 'aggressive' ? 'selected' : ''}>Agressivo (${formatPct(getRisks().aggressive, 2)})</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Botão Principal de Simulação -->
              <button type="button" class="forecast-action-btn" id="forecastRunBtn">
                Simular 5.000 trajetórias →
              </button>
            </div>

            <!-- Card Fonte dos dados atual -->
            <div class="forecast-source-info-card">
              <div class="forecast-source-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div class="forecast-source-details">
                <strong>Fonte dos dados atual</strong>
                <p>
                  ${sampleCount} trades ${state.source === 'real' ? 'reais' : 'simulados'} fechados compõem a distribuição empírica.
                </p>
                <a href="javascript:void(0)" class="forecast-source-link" id="forecastViewSampleBtn">
                  Ver detalhes da amostra →
                </a>
              </div>
            </div>
          </aside>

          <!-- Coluna Direita: Gráfico de Curvas + Grid de 3 Cards Inferiores -->
          <main class="forecast-main-col">
            <!-- Card Principal: Curvas de Patrimônio (Monte Carlo) -->
            <section class="forecast-chart-card">
              <header class="forecast-chart-header">
                <div>
                  <div class="forecast-panel-overline">CURVAS DE PATRIMÔNIO (MONTE CARLO)</div>
                  <h3 class="forecast-chart-title">Não existe uma única trajetória futura.</h3>
                  <p class="forecast-chart-desc">
                    A área mostra a faixa entre os percentis 10 e 90; a linha central representa a mediana.
                  </p>
                </div>

                <div class="forecast-chart-legend">
                  <div class="forecast-legend-item">
                    <span class="forecast-legend-line median"></span>
                    <span>Mediana</span>
                  </div>
                  <div class="forecast-legend-item">
                    <span class="forecast-legend-box range"></span>
                    <span>Faixa provável (P10 - P90)</span>
                  </div>
                  <div class="forecast-legend-item">
                    <span class="forecast-legend-line target"></span>
                    <span>Meta</span>
                  </div>
                </div>
              </header>

              <div class="forecast-chart-body">
                ${renderChart(simResult, target, sampleCount)}
              </div>
            </section>

            <!-- Grid com os 3 Cards Inferiores -->
            <section class="forecast-bottom-grid">
              <!-- Card 1: Distribuição de Resultados (R) -->
              <article class="forecast-subcard">
                <header class="forecast-subcard-head">
                  <span class="forecast-subcard-icon">📊</span>
                  <div>
                    <h4>Distribuição de Resultados (R)</h4>
                    <p>Frequência empírica por faixa de R-Multiple</p>
                  </div>
                </header>
                <div class="forecast-subcard-content">
                  ${renderDistributionHistogram(buckets, sampleCount)}
                </div>
              </article>

              <!-- Card 2: Principais Estatísticas -->
              <article class="forecast-subcard">
                <header class="forecast-subcard-head">
                  <span class="forecast-subcard-icon">⚡</span>
                  <div>
                    <h4>Principais Estatísticas</h4>
                    <p>Métricas do período selecionado</p>
                  </div>
                </header>
                <div class="forecast-subcard-content">
                  <div class="forecast-stats-grid">
                    <div class="forecast-stat-cell">
                      <span>Win Rate</span>
                      <strong>${sampleCount ? `${stats.winRate.toFixed(1)}%` : '—'}</strong>
                    </div>
                    <div class="forecast-stat-cell">
                      <span>Loss Rate</span>
                      <strong class="neg">${sampleCount ? `${stats.lossRate.toFixed(1)}%` : '—'}</strong>
                    </div>
                    <div class="forecast-stat-cell">
                      <span>R Médio (wins)</span>
                      <strong class="pos">${sampleCount && stats.avgWinR ? formatR(stats.avgWinR) : '—'}</strong>
                    </div>
                    <div class="forecast-stat-cell">
                      <span>R Médio (losses)</span>
                      <strong class="neg">${sampleCount && stats.avgLossR ? formatR(stats.avgLossR) : '—'}</strong>
                    </div>
                    <div class="forecast-stat-cell">
                      <span>Profit Factor</span>
                      <strong>${sampleCount ? stats.profitFactor.toFixed(2) : '—'}</strong>
                    </div>
                    <div class="forecast-stat-cell">
                      <span>MFE Médio</span>
                      <strong class="pos">${sampleCount && stats.avgMfeR ? formatR(stats.avgMfeR) : '—'}</strong>
                    </div>
                    <div class="forecast-stat-cell">
                      <span>MAE Médio</span>
                      <strong class="neg">${sampleCount && stats.avgMaeR ? formatR(stats.avgMaeR) : '—'}</strong>
                    </div>
                    <div class="forecast-stat-cell">
                      <span>Tempo Médio (dias)</span>
                      <strong>${sampleCount ? `${stats.avgDuration} pregões` : '—'}</strong>
                    </div>
                  </div>
                </div>
              </article>

              <!-- Card 3: Resultado por Gatilho -->
              <article class="forecast-subcard">
                <header class="forecast-subcard-head">
                  <span class="forecast-subcard-icon">🎯</span>
                  <div>
                    <h4>Resultado por Gatilho</h4>
                    <p>Distribuição de R por tipo de entrada</p>
                  </div>
                </header>
                <div class="forecast-subcard-content">
                  ${renderTriggerTable(triggerData)}
                </div>
              </article>
            </section>
          </main>
        </div>

        <!-- Modais de Ajuda e Amostra -->
        ${renderHelpModal()}
        ${renderSampleModal(filteredTrades)}
      </div>
    `;

    bindEvents();
  }

  /**
   * Associa os eventos da interface
   */
  function bindEvents() {
    const rootEl = document.getElementById('forecastRoot');
    if (!rootEl) return;

    // Dropdown de Fonte de Dados (ESTRITAMENTE DUAS OPÇÕES)
    const sourceSel = document.getElementById('forecastSourceSelect');
    if (sourceSel) {
      sourceSel.onchange = e => {
        state.source = e.target.value === 'real' ? 'real' : 'simulated';
        state.trigger = 'ALL'; // Reseta o filtro de gatilho ao trocar de fonte
        render();
      };
    }

    // Dropdown de Período
    const periodSel = document.getElementById('forecastPeriodSelect');
    if (periodSel) {
      periodSel.onchange = e => {
        state.period = e.target.value;
        render();
      };
    }

    // Dropdown de Gatilho
    const triggerSel = document.getElementById('forecastTriggerSelect');
    if (triggerSel) {
      triggerSel.onchange = e => {
        state.trigger = e.target.value;
        render();
      };
    }

    // Botões de modo (Quero chegar em X% vs Depois de X trades)
    rootEl.querySelectorAll('[data-mode]').forEach(btn => {
      btn.onclick = () => {
        state.mode = btn.dataset.mode;
        render();
      };
    });

    // Inputs de configuração
    const equityInp = document.getElementById('forecastEquityInput');
    if (equityInp) {
      equityInp.onblur = () => {
        const val = parseMoney(equityInp.value);
        if (val > 0) {
          state.customEquity = val;
          equityInp.value = formatMoney(val);
        } else {
          state.customEquity = null;
          equityInp.value = formatMoney(getEquity());
        }
        render();
      };
      equityInp.onkeydown = e => {
        if (e.key === 'Enter') equityInp.blur();
      };
    }

    const targetPctInp = document.getElementById('forecastTargetPctInput');
    if (targetPctInp) {
      targetPctInp.onchange = () => {
        state.targetPct = Math.max(1, Number(targetPctInp.value) || 30);
        state.targetEquity = 0;
        render();
      };
    }

    const tradesInp = document.getElementById('forecastTradesInput');
    if (tradesInp) {
      tradesInp.onchange = () => {
        state.trades = Math.max(10, Number(tradesInp.value) || 200);
        render();
      };
    }

    const tradesPerMonthInp = document.getElementById('forecastTradesPerMonthInput');
    if (tradesPerMonthInp) {
      tradesPerMonthInp.onchange = () => {
        state.tradesPerMonth = Math.max(1, Number(tradesPerMonthInp.value) || 12);
        render();
      };
    }

    const profileSel = document.getElementById('forecastProfileSelect');
    if (profileSel) {
      profileSel.onchange = () => {
        state.profile = profileSel.value;
        render();
      };
    }

    // Botão Simular
    const runBtn = document.getElementById('forecastRunBtn');
    if (runBtn) {
      runBtn.onclick = () => {
        render();
      };
    }

    // Botão "? Como funciona?"
    const helpBtn = document.getElementById('forecastHelpBtn');
    if (helpBtn) {
      helpBtn.onclick = () => {
        state.showHelpModal = true;
        render();
      };
    }

    const helpClose = document.getElementById('forecastHelpClose');
    const helpGotIt = document.getElementById('forecastHelpGotIt');
    const closeHelp = () => {
      state.showHelpModal = false;
      render();
    };
    if (helpClose) helpClose.onclick = closeHelp;
    if (helpGotIt) helpGotIt.onclick = closeHelp;

    // Botão "Ver detalhes da amostra"
    const viewSampleBtn = document.getElementById('forecastViewSampleBtn');
    if (viewSampleBtn) {
      viewSampleBtn.onclick = () => {
        state.showSampleModal = true;
        render();
      };
    }

    const sampleClose = document.getElementById('forecastSampleClose');
    const sampleGotIt = document.getElementById('forecastSampleGotIt');
    const closeSample = () => {
      state.showSampleModal = false;
      render();
    };
    if (sampleClose) sampleClose.onclick = closeSample;
    if (sampleGotIt) sampleGotIt.onclick = closeSample;

    // Fechar modal ao clicar no overlay
    const helpModal = document.getElementById('forecastHelpModal');
    if (helpModal) {
      helpModal.onclick = e => {
        if (e.target === helpModal) closeHelp();
      };
    }
    const sampleModal = document.getElementById('forecastSampleModal');
    if (sampleModal) {
      sampleModal.onclick = e => {
        if (e.target === sampleModal) closeSample();
      };
    }
  }

  // Exportação da API no namespace global
  root.renderForecastSimulator = render;
  root.ForecastSimulatorController = {
    render,
    getState: () => state,
    setSource: s => {
      if (s === 'real' || s === 'simulated') {
        state.source = s;
        render();
      }
    }
  };

  // Intercepta navegação do roteador `go(pageId)`
  if (typeof go === 'function') {
    const previousGo = go;
    go = function(id, extra) {
      previousGo(id, extra);
      if (id === 'forecast') {
        render();
      }
    };
  }

  // Auto-renderiza quando o DOM estiver pronto ou se a página já estiver ativa
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('forecast')?.classList.contains('active')) {
        render();
      }
    });
  } else {
    if (document.getElementById('forecast')?.classList.contains('active')) {
      render();
    }
  }

})(typeof window !== 'undefined' ? window : globalThis);

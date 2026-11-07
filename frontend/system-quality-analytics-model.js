/**
 * Healthy Trend Trader — System Quality Analytics Model (SQN)
 *
 * Motor de Inteligência Estatística baseado na metodologia de Van K. Tharp:
 * - Expectancy (Expectativa Matemática em R-Múltiplos)
 * - Sample Standard Deviation (Desvio-Padrão Amostral N-1 dos R-Múltiplos)
 * - System Quality Number: SQN = (Expectancy / StdDev) * sqrt(N)
 * - Escala oficial de classificação de qualidade de sistemas de trading
 * - Evolução temporal acumulada (Rolling SQN) e integridade amostral
 *
 * Suporte dual: CommonJS (Node.js para testes) e Browser (window.SystemQualityAnalyticsModel).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SystemQualityAnalyticsModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Escala oficial de classificação de qualidade do sistema (Van K. Tharp)
  const SQN_TIERS = Object.freeze([
    {
      key: 'poor',
      min: -Infinity,
      max: 1.6,
      label: 'Fraco',
      tone: 'bad',
      badgeClass: 'sqn-badge-poor',
      color: '#ef4444',
      bgLight: 'rgba(239, 68, 68, 0.12)',
      description: 'Sistema com pouca ou nenhuma vantagem estatística comprovada; elevado risco de ruína ou dependência de sorte temporária.'
    },
    {
      key: 'below_average',
      min: 1.6,
      max: 2.0,
      label: 'Abaixo da média',
      tone: 'warn',
      badgeClass: 'sqn-badge-below-average',
      color: '#f59e0b',
      bgLight: 'rgba(245, 158, 11, 0.12)',
      description: 'Vantagem estatística modesta; vulnerável a períodos prolongados de drawdown e sequências de perdas.'
    },
    {
      key: 'average',
      min: 2.0,
      max: 2.5,
      label: 'Mediano',
      tone: 'info',
      badgeClass: 'sqn-badge-average',
      color: '#3b82f6',
      bgLight: 'rgba(59, 130, 246, 0.12)',
      description: 'Sistema operável com consistência moderada; gera vantagem líquida positiva quando executado com rigor.'
    },
    {
      key: 'good',
      min: 2.5,
      max: 3.0,
      label: 'Bom',
      tone: 'good',
      badgeClass: 'sqn-badge-good',
      color: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.12)',
      description: 'Boa consistência e relação sólida entre recompensa gerada e dispersão do risco.'
    },
    {
      key: 'excellent',
      min: 3.0,
      max: 5.0,
      label: 'Excelente',
      tone: 'excellent',
      badgeClass: 'sqn-badge-excellent',
      color: '#059669',
      bgLight: 'rgba(5, 150, 105, 0.15)',
      description: 'Alta consistência estatística, dispersão controlada e forte previsibilidade nos resultados operacionais.'
    },
    {
      key: 'exceptional',
      min: 5.0,
      max: Infinity,
      label: 'Excepcional',
      tone: 'exceptional',
      badgeClass: 'sqn-badge-exceptional',
      color: '#047857',
      bgLight: 'rgba(4, 120, 87, 0.18)',
      description: 'Desempenho estatístico fora de série (Santo Graal de Van Tharp); altíssima expectativa com baixa dispersão de perdas.'
    }
  ]);

  /**
   * Arredonda com precisão especificada
   */
  function round(value, decimals = 2) {
    if (value == null || !Number.isFinite(Number(value))) return null;
    const factor = Math.pow(10, decimals);
    return Math.round(Number(value) * factor) / factor;
  }

  /**
   * Extrai e sanitiza os R-múltiplos de uma coleção de trades ou números
   * @param {Array} tradesOuR Lista de objetos de trades ou números brutos de R
   * @returns {Array<number>} Array de valores finitos em R
   */
  function extractRMultiples(tradesOuR = []) {
    if (!Array.isArray(tradesOuR)) return [];
    const rValues = [];

    for (let i = 0; i < tradesOuR.length; i++) {
      const item = tradesOuR[i];
      if (item == null) continue;

      let r = null;
      if (typeof item === 'number') {
        r = item;
      } else if (typeof item === 'object') {
        // Suporte unificado para:
        // - TradeSimulator / Backtest: item.resultR, item.netResultR
        // - Workspace / Diário: item.r, item.netR, item.realizedR
        if (Number.isFinite(Number(item.resultR))) {
          r = Number(item.resultR);
        } else if (Number.isFinite(Number(item.netResultR))) {
          r = Number(item.netResultR);
        } else if (Number.isFinite(Number(item.r))) {
          r = Number(item.r);
        } else if (Number.isFinite(Number(item.realizedR))) {
          r = Number(item.realizedR);
        } else if (item.status === 'closed' || item.status === 'CLOSED_GAIN' || item.status === 'CLOSED_LOSS') {
          // Extração direta a partir de preços/eventos caso necessário
          const initialRisk = Number(item.initialRisk || item.riskAmount || 0);
          const pnl = Number(item.result || item.netPnL || 0);
          if (initialRisk > 0) {
            r = pnl / initialRisk;
          }
        }
      }

      if (r != null && Number.isFinite(r)) {
        rValues.push(r);
      }
    }

    return rValues;
  }

  /**
   * 2.1. Expectancy (Expectativa Matemática)
   * Média aritmética dos resultados expressos em R-Múltiplos.
   * Fórmula: Expectancy = Soma(R) / N
   * @param {Array<number>} rValues 
   * @returns {number|null} Expectativa em R ou null se vazio
   */
  function calculateExpectancy(rValues = []) {
    const list = extractRMultiples(rValues);
    if (!list.length) return null;
    const sum = list.reduce((acc, val) => acc + val, 0);
    return sum / list.length;
  }

  /**
   * 2.2. Standard Deviation (Desvio-Padrão Amostral N - 1)
   * Mede a dispersão dos resultados em torno da Expectancy.
   * Fórmula: s = sqrt( Soma((R_i - media)^2) / (N - 1) )
   * Convenção explícita: Desvio-padrão amostral com divisor N - 1.
   * @param {Array<number>} rValues 
   * @param {number|null} precomputedExpectancy 
   * @returns {number|null} Desvio-padrão amostral ou null se N < 2
   */
  function calculateSampleStandardDeviation(rValues = [], precomputedExpectancy = null) {
    const list = extractRMultiples(rValues);
    const n = list.length;
    if (n < 2) return null; // Não calculável com amostra inferior a 2 operações

    const mean = precomputedExpectancy != null && Number.isFinite(precomputedExpectancy)
      ? precomputedExpectancy
      : calculateExpectancy(list);

    if (mean == null) return null;

    let sumSquaredDiffs = 0;
    for (let i = 0; i < n; i++) {
      const diff = list[i] - mean;
      sumSquaredDiffs += diff * diff;
    }

    const variance = sumSquaredDiffs / (n - 1);
    if (!Number.isFinite(variance) || variance < 0) return null;

    return Math.sqrt(variance);
  }

  /**
   * 2.3. System Quality Number (SQN)
   * Fórmula: SQN = (Expectancy / Desvio-Padrão) * sqrt(N)
   * Regras:
   * - Não calcular com amostra inferior a 2 operações.
   * - Não calcular quando desvio-padrão for zero ou inválido.
   * @param {number} expectancy Média aritmética dos R
   * @param {number} stdDev Desvio-padrão amostral (N - 1)
   * @param {number} count Número de operações (N)
   * @returns {number|null} Valor numérico do SQN ou null se inválido
   */
  function calculateRawSQN(expectancy, stdDev, count) {
    if (!Number.isFinite(expectancy) || !Number.isFinite(stdDev) || !Number.isFinite(count)) {
      return null;
    }
    if (count < 2) return null; // Mínimo de 2 operações
    if (stdDev <= 0) return null; // Divisão por zero ou dispersão nula

    const sqn = (expectancy / stdDev) * Math.sqrt(count);
    return Number.isFinite(sqn) ? sqn : null;
  }

  /**
   * 2.4. Classificação da qualidade do sistema conforme escala Van Tharp
   * @param {number} sqn 
   * @returns {object} Dados completos da faixa de classificação
   */
  function classifySQN(sqn) {
    if (sqn == null || !Number.isFinite(sqn)) {
      return {
        key: 'unclassified',
        label: 'Não classificado',
        tone: 'neutral',
        badgeClass: 'sqn-badge-unclassified',
        color: '#64748b',
        bgLight: 'rgba(100, 116, 139, 0.12)',
        description: 'Dados insuficientes para determinar a qualidade estatística.'
      };
    }

    if (sqn < 1.6) return SQN_TIERS[0];
    if (sqn < 2.0) return SQN_TIERS[1];
    if (sqn < 2.5) return SQN_TIERS[2];
    if (sqn < 3.0) return SQN_TIERS[3];
    if (sqn <= 5.0) return SQN_TIERS[4];
    return SQN_TIERS[5];
  }

  /**
   * Avalia a confiabilidade estatística com base no tamanho da amostra
   * @param {number} n Número de operações
   * @returns {object} Status de confiabilidade
   */
  function evaluateSampleSignificance(n) {
    const count = Number(n) || 0;
    if (count < 2) {
      return {
        isEligible: false,
        isReliable: false,
        status: 'insufficient',
        label: 'Amostra insuficiente',
        tone: 'bad',
        note: 'Necessário o encerramento de no mínimo 2 operações para calcular o desvio-padrão amostral.',
        minRequired: 2,
        recommendedMin: 30
      };
    }
    if (count < 30) {
      return {
        isEligible: true,
        isReliable: false,
        status: 'preliminary',
        label: 'Amostra preliminar',
        tone: 'warn',
        note: `Amostra em desenvolvimento (${count} trades < 30). O SQN é indicativo e preliminar; requer mais trades para significância estatística robusta.`,
        minRequired: 2,
        recommendedMin: 30
      };
    }
    if (count < 100) {
      return {
        isEligible: true,
        isReliable: true,
        status: 'representative',
        label: 'Amostra representativa',
        tone: 'good',
        note: `Amostra estatisticamente representativa (${count} trades ≥ 30). Confiabilidade sólida da vantagem estatística.`,
        minRequired: 2,
        recommendedMin: 100
      };
    }
    return {
      isEligible: true,
      isReliable: true,
      status: 'robust',
      label: 'Amostra robusta',
      tone: 'excellent',
      note: `Amostra de alta significância estatística (${count} trades ≥ 100). Padrão ouro de validação conforme Van Tharp.`,
      minRequired: 2,
      recommendedMin: 100
    };
  }

  /**
   * 4. Evolução Histórica (Rolling SQN trade a trade)
   * Calcula o SQN acumulado e métricas a cada operação subsequente
   * @param {Array<number|object>} tradesOuR 
   * @returns {Array<object>} Série temporal da evolução
   */
  function calculateSQNEvolution(tradesOuR = []) {
    const list = extractRMultiples(tradesOuR);
    if (list.length < 2) return [];

    const evolution = [];
    let runningSum = 0;
    let runningM2 = 0; // Algoritmo de Welford online para variância numericamente estável

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      const count = i + 1;
      runningSum += r;

      // Atualização Welford:
      const mean = runningSum / count;
      if (i === 0) {
        runningM2 = 0;
      } else {
        const delta = r - (runningSum - r) / i;
        const delta2 = r - mean;
        runningM2 += delta * delta2;
      }

      if (count >= 2) {
        const variance = runningM2 / (count - 1);
        const stdDev = variance > 0 ? Math.sqrt(variance) : 0;
        const sqn = (stdDev > 0) ? (mean / stdDev) * Math.sqrt(count) : null;
        const tier = classifySQN(sqn);

        evolution.push({
          tradeIndex: count,
          r: round(r, 2),
          cumulativeExpectancy: round(mean, 3),
          cumulativeStdDev: round(stdDev, 3),
          sqn: sqn != null ? round(sqn, 2) : null,
          sqnRaw: sqn,
          classification: tier.label,
          classificationKey: tier.key,
          tone: tier.tone,
          badgeClass: tier.badgeClass,
          color: tier.color
        });
      }
    }

    return evolution;
  }

  /**
   * 2.2. Distribuição e anatomia estatística dos R-múltiplos
   * Calcula estatísticas detalhadas de R e categorização por faixas (buckets)
   * @param {Array<number>} rValues
   * @param {number|null} precomputedExpectancy
   * @param {number|null} precomputedStdDev
   * @returns {object} Estatísticas e buckets de distribuição
   */
  function calculateRDistribution(rValues = [], precomputedExpectancy = null, precomputedStdDev = null) {
    const list = extractRMultiples(rValues);
    const n = list.length;
    if (!n) {
      return {
        count: 0,
        avgR: 0,
        avgWinR: 0,
        avgLossR: 0,
        bestR: 0,
        worstR: 0,
        stdDev: 0,
        winLossRatio: null,
        buckets: []
      };
    }

    const mean = precomputedExpectancy != null && Number.isFinite(precomputedExpectancy)
      ? precomputedExpectancy
      : calculateExpectancy(list);

    const stdDev = precomputedStdDev != null && Number.isFinite(precomputedStdDev)
      ? precomputedStdDev
      : calculateSampleStandardDeviation(list, mean);

    const wins = list.filter(r => r > 0);
    const losses = list.filter(r => r < 0);
    const avgWinR = wins.length ? round(wins.reduce((sum, r) => sum + r, 0) / wins.length, 2) : 0;
    const avgLossR = losses.length ? round(Math.abs(losses.reduce((sum, r) => sum + r, 0) / losses.length), 2) : 0;
    const bestR = round(Math.max(...list), 2);
    const worstR = round(Math.min(...list), 2);
    const winLossRatio = avgLossR > 0 ? round(avgWinR / avgLossR, 2) : null;

    // 7 faixas canônicas de R para distribuição
    const bucketsDef = [
      { key: 'severe_loss', label: '< -2R', rangeText: 'Menor que -2,0R', desc: 'Perdas severas (>2R de risco)', tone: 'bad', color: '#ef4444', match: r => r < -2.0 },
      { key: 'stop_loss', label: '-2R a -1R', rangeText: '-2,0R a -1,0R', desc: 'Perda acima do stop padrão', tone: 'bad', color: '#f87171', match: r => r >= -2.0 && r < -1.0 },
      { key: 'normal_loss', label: '-1R a 0R', rangeText: '-1,0R a 0,0R', desc: 'Perdas no stop padrão / breakeven', tone: 'warn', color: '#f59e0b', match: r => r >= -1.0 && r < 0.0 },
      { key: 'small_gain', label: '0R a +1R', rangeText: '0,0R a +1,0R', desc: 'Pequenos ganhos / defesas', tone: 'info', color: '#60a5fa', match: r => r >= 0.0 && r < 1.0 },
      { key: 'standard_gain', label: '+1R a +2R', rangeText: '+1,0R a +2,0R', desc: 'Alvo padrão (+2R) do método', tone: 'good', color: '#10b981', match: r => r >= 1.0 && r < 2.0 },
      { key: 'extended_gain', label: '+2R a +3R', rangeText: '+2,0R a +3,0R', desc: 'Alvos estendidos e condução', tone: 'excellent', color: '#059669', match: r => r >= 2.0 && r < 3.0 },
      { key: 'exceptional_gain', label: '≥ +3R', rangeText: 'Maior ou igual a +3,0R', desc: 'Ganhos excepcionais (runners)', tone: 'exceptional', color: '#047857', match: r => r >= 3.0 }
    ];

    const buckets = bucketsDef.map(b => {
      const matched = list.filter(b.match);
      const count = matched.length;
      const pct = round((count / n) * 100, 1);
      return {
        key: b.key,
        label: b.label,
        rangeText: b.rangeText,
        desc: b.desc,
        tone: b.tone,
        color: b.color,
        count,
        pct
      };
    });

    return {
      count: n,
      avgR: round(mean, 2),
      avgWinR,
      avgLossR,
      bestR,
      worstR,
      stdDev: stdDev != null ? round(stdDev, 2) : 0,
      winLossRatio,
      buckets
    };
  }

  /**
   * Motor principal de cálculo do System Quality Analytics
   * @param {Array} tradesOuR Lista de trades ou valores R
   * @returns {object} Relatório estatístico completo
   */
  function calculateSystemQualityAnalytics(tradesOuR = []) {
    const rValues = extractRMultiples(tradesOuR);
    const count = rValues.length;
    const significance = evaluateSampleSignificance(count);

    if (count < 2) {
      return {
        isEligible: false,
        sampleSize: count,
        expectancy: count === 1 ? round(rValues[0], 2) : 0,
        expectancyFormatted: count === 1 ? `${rValues[0] >= 0 ? '+' : ''}${rValues[0].toFixed(2).replace('.', ',')}R` : '—',
        standardDeviation: null,
        standardDeviationFormatted: '—',
        sqn: null,
        sqnFormatted: '—',
        classification: classifySQN(null),
        significance,
        evolution: [],
        rDistribution: calculateRDistribution(rValues),
        summaryNote: significance.note,
        rValues
      };
    }

    const expectancy = calculateExpectancy(rValues);
    const stdDev = calculateSampleStandardDeviation(rValues, expectancy);
    const sqn = calculateRawSQN(expectancy, stdDev, count);
    const classification = classifySQN(sqn);
    const evolution = calculateSQNEvolution(rValues);

    // Métricas complementares da distribuição de R
    const wins = rValues.filter(r => r > 0);
    const losses = rValues.filter(r => r < 0);
    const winRate = count > 0 ? (wins.length / count) * 100 : 0;
    const totalR = rValues.reduce((sum, r) => sum + r, 0);

    // Tendência recente do SQN (últimos 10 trades vs histórico)
    let trend = 'stable';
    let trendLabel = 'Estável';
    if (evolution.length >= 10) {
      const recent = evolution[evolution.length - 1].sqnRaw || 0;
      const prior = evolution[Math.max(0, evolution.length - 10)].sqnRaw || 0;
      const diff = recent - prior;
      if (diff > 0.3) {
        trend = 'improving';
        trendLabel = 'Melhorando';
      } else if (diff < -0.3) {
        trend = 'degrading';
        trendLabel = 'Em declínio';
      }
    }

    return {
      isEligible: true,
      sampleSize: count,
      totalR: round(totalR, 2),
      winRate: round(winRate, 1),
      expectancy: round(expectancy, 3),
      expectancyFormatted: `${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2).replace('.', ',')}R`,
      standardDeviation: stdDev != null ? round(stdDev, 3) : null,
      standardDeviationFormatted: stdDev != null ? `${stdDev.toFixed(2).replace('.', ',')}R` : '—',
      sqn: sqn != null ? round(sqn, 2) : null,
      sqnRaw: sqn,
      sqnFormatted: sqn != null ? sqn.toFixed(2).replace('.', ',') : '—',
      classification,
      significance,
      evolution,
      rDistribution: calculateRDistribution(rValues, expectancy, stdDev),
      trend,
      trendLabel,
      summaryNote: significance.note,
      rValues
    };
  }

  /**
   * Formata número para apresentação em PT-BR
   */
  function formatNumber(val, decimals = 2) {
    if (val == null || !Number.isFinite(Number(val))) return '—';
    return Number(val).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  return Object.freeze({
    SQN_TIERS,
    extractRMultiples,
    calculateExpectancy,
    calculateSampleStandardDeviation,
    calculateRawSQN,
    classifySQN,
    evaluateSampleSignificance,
    calculateSQNEvolution,
    calculateRDistribution,
    calculateSystemQualityAnalytics,
    formatNumber
  });
});

/**
 * HEALTHY TREND TRADER — RISK OF RUIN MODEL (Proteção Patrimonial e Sobrevivência Estatística)
 *
 * Motor estatístico determinístico de Monte Carlo (reamostragem com reposição dos resultados líquidos em R),
 * cálculo de drawdown histórico e atual, intervalo de confiança binomial de 95%, comparação de cenários
 * e recomendação consultiva de redução de mão integrada à Política de Risco e Position Sizing.
 */

(function (root, factory) {
  'use strict';
  const tradingRubrics = (typeof module === 'object' && module.exports)
    ? require('./trading-rubrics')
    : (root ? root.TradingRubrics : null);
  const api = factory(tradingRubrics);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.RiskOfRuinModel = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (TradingRubrics) {
  'use strict';

  const MODEL_VERSION = '1.0.0-mc-bootstrap';
  const STORAGE_KEY_CONFIG = 'healthy-trend-risk-of-ruin-config-v1';
  const STORAGE_KEY_LAST_RESULT = 'healthy-trend-risk-of-ruin-last-result-v1';

  const DEFAULT_CONFIG = Object.freeze({
    maxDrawdownLimitPct: 30,          // Limite de drawdown máximo configurável (%)
    ruinProbabilityTolerancePct: 2.0, // Tolerância máxima aceitável de probabilidade de ruína (%)
    horizonTrades: 250,               // Horizonte padrão de trades
    simulationsCount: 10000,          // Número padrão de trajetórias Monte Carlo
    riskPerTradePct: 0.50,            // Risco por trade (%)
    riskModel: 'compounding',         // 'compounding' (fração do patrimônio atualizado) | 'fixed' (fração monetária fixa do capital inicial)
    historyWindow: 'ALL',             // 'ALL' | 'LAST_100' | 'LAST_50' | 'LAST_365D' | 'LAST_180D'
    initialEquity: 100,               // Base 100 padrão para curvas normalizadas
    seed: 20261018,                   // Seed determinística para reprodutibilidade
    minSampleRequired: 5,             // Mínimo absoluto de trades fechados para habilitar simulação
    minSampleRecommended: 30          // Tamanho de amostra recomendado para estabilidade estatística
  });

  const STATISTICAL_LIMITATIONS = Object.freeze([
    'Reamostragem independente e identicamente distribuída (i.i.d.) com reposição a partir dos resultados históricos líquidos em R.',
    'Dependência serial (sequências prolongadas de ganhos ou perdas além do agrupamento aleatório) e mudanças estruturais de regime de mercado não são capturadas pelo bootstrap simples (block bootstrap previsto como evolução futura).',
    'Eventos extremos de cauda (gaps além do stop ou crise de liquidez) que nunca ocorreram na amostra histórica não estão representados na distribuição empírica.',
    'A simulação projeta trajetórias sequenciais de operações. A exposição simultânea de múltiplas posições correlacionadas é monitorada pelo Portfolio Heat e não deve ser confundida com a soma linear de probabilidades individuais.'
  ]);

  /**
   * Gerador pseudoaleatório determinístico de 32 bits (Mulberry32).
   * Garante 100% de reprodutibilidade para os mesmos dados, parâmetros e seed.
   *
   * @param {number} seed
   * @returns {function(): number} Função que retorna float em [0, 1)
   */
  function createRng(seed = DEFAULT_CONFIG.seed) {
    let state = (Number(seed) || DEFAULT_CONFIG.seed) >>> 0;
    return function nextRandom() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Calcula o percentil linear de um vetor numérico.
   *
   * @param {number[]} values
   * @param {number} p Fração em [0, 1] (ex: 0.5 para mediana, 0.95 para P95)
   * @returns {number}
   */
  function percentile(values, p) {
    if (!Array.isArray(values) || values.length === 0) return 0;
    const clampedP = Math.max(0, Math.min(1, Number(p) || 0));
    const sorted = [...values].sort((a, b) => a - b);
    const idx = (sorted.length - 1) * clampedP;
    const lower = Math.floor(idx);
    const weight = idx - lower;
    const a = sorted[lower];
    const b = sorted[lower + 1] !== undefined ? sorted[lower + 1] : a;
    return a + (b - a) * weight;
  }

  /**
   * Calcula o percentil sobre um vetor JÁ ordenado crescentemente (otimização para 10.000+ trajetórias).
   */
  function percentileSorted(sortedValues, p) {
    if (!Array.isArray(sortedValues) || sortedValues.length === 0) return 0;
    const clampedP = Math.max(0, Math.min(1, Number(p) || 0));
    const idx = (sortedValues.length - 1) * clampedP;
    const lower = Math.floor(idx);
    const weight = idx - lower;
    const a = sortedValues[lower];
    const b = sortedValues[lower + 1] !== undefined ? sortedValues[lower + 1] : a;
    return a + (b - a) * weight;
  }

  /**
   * Normaliza e valida os parâmetros de configuração da simulação.
   *
   * @param {Object} rawConfig
   * @returns {Object}
   */
  function normalizeConfig(rawConfig = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...(rawConfig || {}) };

    const maxDrawdownLimitPct = Number(cfg.maxDrawdownLimitPct);
    const ruinProbabilityTolerancePct = Number(cfg.ruinProbabilityTolerancePct);
    const horizonTrades = Math.floor(Number(cfg.horizonTrades));
    const simulationsCount = Math.floor(Number(cfg.simulationsCount));
    const riskPerTradePct = Number(cfg.riskPerTradePct);
    const initialEquity = Number(cfg.initialEquity);
    const seed = Number.isFinite(Number(cfg.seed)) ? Math.floor(Number(cfg.seed)) : DEFAULT_CONFIG.seed;

    const validWindows = ['ALL', 'LAST_100', 'LAST_50', 'LAST_365D', 'LAST_180D'];
    const historyWindow = validWindows.includes(cfg.historyWindow) ? cfg.historyWindow : 'ALL';
    const riskModel = cfg.riskModel === 'fixed' ? 'fixed' : 'compounding';

    return {
      maxDrawdownLimitPct: Number.isFinite(maxDrawdownLimitPct) && maxDrawdownLimitPct > 0 && maxDrawdownLimitPct <= 100
        ? maxDrawdownLimitPct
        : DEFAULT_CONFIG.maxDrawdownLimitPct,
      ruinProbabilityTolerancePct: Number.isFinite(ruinProbabilityTolerancePct) && ruinProbabilityTolerancePct >= 0 && ruinProbabilityTolerancePct <= 100
        ? ruinProbabilityTolerancePct
        : DEFAULT_CONFIG.ruinProbabilityTolerancePct,
      horizonTrades: Number.isFinite(horizonTrades) && horizonTrades >= 1 && horizonTrades <= 5000
        ? horizonTrades
        : DEFAULT_CONFIG.horizonTrades,
      simulationsCount: Number.isFinite(simulationsCount) && simulationsCount >= 100 && simulationsCount <= 100000
        ? simulationsCount
        : DEFAULT_CONFIG.simulationsCount,
      riskPerTradePct: Number.isFinite(riskPerTradePct) && riskPerTradePct > 0 && riskPerTradePct <= 50
        ? riskPerTradePct
        : DEFAULT_CONFIG.riskPerTradePct,
      riskModel,
      historyWindow,
      initialEquity: Number.isFinite(initialEquity) && initialEquity > 0
        ? initialEquity
        : DEFAULT_CONFIG.initialEquity,
      seed,
      minSampleRequired: Math.max(1, Math.floor(Number(cfg.minSampleRequired) || DEFAULT_CONFIG.minSampleRequired)),
      minSampleRecommended: Math.max(5, Math.floor(Number(cfg.minSampleRecommended) || DEFAULT_CONFIG.minSampleRecommended))
    };
  }

  /**
   * Calcula o intervalo de confiança binomial de 95% (Wilson Score com tratamento exato para 0 ocorrências).
   * Para 0 ocorrências em N simulações independentes, o limite superior exato de 95% é 1 - (0.05)^(1/N),
   * equivalente a ~0,03% para 10.000 simulações. Nunca retorna "risco zero" sem explicitar a incerteza.
   *
   * @param {number} hits Trajetórias que atingiram o limite
   * @param {number} total Total de trajetórias simuladas
   * @returns {Object}
   */
  function computeConfidenceInterval95(hits, total) {
    const n = Math.max(0, Math.floor(Number(total) || 0));
    const k = Math.max(0, Math.min(n, Math.floor(Number(hits) || 0)));

    if (n === 0) {
      return {
        probabilityPct: 0,
        lowerPct: 0,
        upperPct: 0,
        hits: 0,
        total: 0,
        zeroOccurrences: true,
        displayText: 'Sem simulações executadas'
      };
    }

    const p = k / n;
    const probabilityPct = p * 100;

    if (k === 0) {
      // Limite superior unilateral / Clopper-Pearson para k = 0 ao nível de 95%: 1 - (0.05)^(1/n)
      const exactUpper = (1 - Math.pow(0.05, 1 / n)) * 100;
      return {
        probabilityPct: 0,
        lowerPct: 0,
        upperPct: exactUpper,
        hits: 0,
        total: n,
        zeroOccurrences: true,
        displayText: '0 ocorrências observadas nesta simulação'
      };
    }

    if (k === n) {
      const exactLower = Math.pow(0.05, 1 / n) * 100;
      return {
        probabilityPct: 100,
        lowerPct: exactLower,
        upperPct: 100,
        hits: k,
        total: n,
        zeroOccurrences: false,
        displayText: '100,0%'
      };
    }

    // Intervalo de Wilson Score 95% (z = 1.959963984540054)
    const z = 1.959963984540054;
    const z2 = z * z;
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;

    const lowerPct = Math.max(0, (center - margin) * 100);
    const upperPct = Math.min(100, (center + margin) * 100);

    return {
      probabilityPct,
      lowerPct,
      upperPct,
      hits: k,
      total: n,
      zeroOccurrences: false,
      displayText: `${probabilityPct.toFixed(1).replace('.', ',')}%`
    };
  }

  /**
   * Extrai e normaliza um único trade do formato do banco (Trading Log), posição local ou objeto R.
   * Não modifica o objeto original.
   *
   * @param {Object|number} raw
   * @returns {Object|null}
   */
  function normalizeTradeRecord(raw) {
    if (typeof raw === 'number') {
      if (!Number.isFinite(raw)) return null;
      return {
        id: null,
        symbol: 'TRADE',
        r: raw,
        netResult: null,
        initialRisk: null,
        closedAt: null,
        closedTimestamp: null
      };
    }

    if (!raw || typeof raw !== 'object') return null;

    // Se houver status explícito e não for 'closed' (ou 'CLOSED' / 'ENCERRADO'), ignorar posições ainda abertas
    if (raw.status !== undefined && raw.status !== null) {
      const st = String(raw.status).trim().toLowerCase();
      if (st !== 'closed' && st !== 'encerrado' && st !== 'finalizado') {
        return null;
      }
    }

    // 1. Verifica se o R líquido já está calculado diretamente no registro
    let rValue = null;
    if (raw.r !== undefined && raw.r !== null && Number.isFinite(Number(raw.r))) {
      rValue = Number(raw.r);
    } else if (raw.rMultiple !== undefined && raw.rMultiple !== null && Number.isFinite(Number(raw.rMultiple))) {
      rValue = Number(raw.rMultiple);
    } else if (raw.resultR !== undefined && raw.resultR !== null && Number.isFinite(Number(raw.resultR))) {
      rValue = Number(raw.resultR);
    }

    let netResult = Number.isFinite(Number(raw.result)) ? Number(raw.result) : (Number.isFinite(Number(raw.realized)) ? Number(raw.realized) : null);
    let initialRisk = Number.isFinite(Number(raw.initialRisk)) ? Number(raw.initialRisk) : null;

    // 2. Se não tiver rValue direto, calcula a partir dos eventos de execução/saída (formato Trading Log / Position Management)
    if (rValue === null) {
      const events = Array.isArray(raw.events) ? raw.events : [];
      const entryEvent = events.find(e => e && e.type === 'entry');
      const exitEvents = events.filter(e => e && (e.type === 'peeloff' || e.type === 'close' || e.type === 'partial'));
      const entryPrice = Number(entryEvent?.price ?? raw.execution_price ?? raw.entry_price ?? raw.entry);
      const quantity = Number(entryEvent?.qty ?? raw.executed_quantity ?? raw.planned_quantity ?? raw.initialQty);
      const stopPrice = Number(entryEvent?.stop ?? raw.stop_price ?? raw.initialStop ?? raw.currentStop ?? raw.stopLoss);
      const directionSign = String(raw.direction || '').toLowerCase() === 'short' ? -1 : 1;

      if (Number.isFinite(entryPrice) && entryPrice > 0 && Number.isFinite(stopPrice) && stopPrice > 0 && Number.isFinite(quantity) && quantity > 0) {
        const computedRisk = Math.abs(entryPrice - stopPrice) * quantity;
        if (computedRisk > 0) {
          initialRisk = computedRisk;
          if (exitEvents.length > 0) {
            const realizedPnl = exitEvents.reduce((acc, ev) => {
              const evPrice = Number(ev.price);
              const evQty = Number(ev.qty);
              if (!Number.isFinite(evPrice) || !Number.isFinite(evQty)) return acc;
              return acc + (evPrice - entryPrice) * directionSign * evQty;
            }, 0);
            netResult = realizedPnl;
            rValue = realizedPnl / computedRisk;
          } else if (netResult !== null) {
            rValue = netResult / computedRisk;
          }
        }
      } else if (netResult !== null && initialRisk !== null && initialRisk > 0) {
        rValue = netResult / initialRisk;
      }
    }

    if (!Number.isFinite(rValue)) return null;

    // Data de fechamento
    const events = Array.isArray(raw.events) ? raw.events : [];
    const closeEvent = [...events].reverse().find(e => e && e.type === 'close');
    const rawDate = closeEvent?.at || raw.closedAt || raw.exitDate || raw.updated_at || raw.executed_at || raw.signalDate || raw.created_at || null;
    let closedTimestamp = null;
    let closedAtIso = null;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!Number.isNaN(parsed.getTime())) {
        closedTimestamp = parsed.getTime();
        closedAtIso = parsed.toISOString();
      }
    }

    return {
      id: raw.id || raw.databaseId || null,
      symbol: String(raw.ticker || raw.symbol || raw.asset || 'TRADE').toUpperCase(),
      r: rValue,
      netResult: Number.isFinite(netResult) ? netResult : null,
      initialRisk: Number.isFinite(initialRisk) ? initialRisk : null,
      closedAt: closedAtIso,
      closedTimestamp
    };
  }

  /**
   * Extrai, valida e aplica o filtro de janela histórica sobre os trades elegíveis,
   * sem modificar a lista original.
   *
   * @param {Array} rawTrades Lista bruta de trades ou números em R
   * @param {Object} [options]
   * @param {string} [options.historyWindow='ALL']
   * @param {number|Date} [options.referenceDate]
   * @returns {Object}
   */
  function extractEligibleTrades(rawTrades = [], options = {}) {
    if (!Array.isArray(rawTrades)) {
      return {
        allEligible: [],
        filteredTrades: [],
        rValues: [],
        invalidCount: 0,
        totalInputCount: 0,
        periodStart: null,
        periodEnd: null
      };
    }

    const valid = [];
    let invalidCount = 0;

    for (let i = 0; i < rawTrades.length; i++) {
      const norm = normalizeTradeRecord(rawTrades[i]);
      if (norm) {
        valid.push({ ...norm, _index: i });
      } else {
        invalidCount++;
      }
    }

    // Ordena cronologicamente mantendo ordem estável quando não há timestamp
    valid.sort((a, b) => {
      if (a.closedTimestamp !== null && b.closedTimestamp !== null && a.closedTimestamp !== b.closedTimestamp) {
        return a.closedTimestamp - b.closedTimestamp;
      }
      return a._index - b._index;
    });

    const windowType = options.historyWindow || 'ALL';
    const refTime = options.referenceDate ? new Date(options.referenceDate).getTime() : Date.now();
    let filtered = valid;

    if (windowType === 'LAST_100') {
      filtered = valid.slice(-100);
    } else if (windowType === 'LAST_50') {
      filtered = valid.slice(-50);
    } else if (windowType === 'LAST_365D') {
      const cutoff = refTime - 365 * 24 * 60 * 60 * 1000;
      const byDate = valid.filter(t => t.closedTimestamp === null || t.closedTimestamp >= cutoff);
      filtered = byDate.length > 0 ? byDate : valid;
    } else if (windowType === 'LAST_180D') {
      const cutoff = refTime - 180 * 24 * 60 * 60 * 1000;
      const byDate = valid.filter(t => t.closedTimestamp === null || t.closedTimestamp >= cutoff);
      filtered = byDate.length > 0 ? byDate : valid;
    }

    const withDates = filtered.filter(t => t.closedAt !== null);
    const periodStart = withDates.length > 0 ? withDates[0].closedAt.slice(0, 10) : null;
    const periodEnd = withDates.length > 0 ? withDates[withDates.length - 1].closedAt.slice(0, 10) : null;

    return {
      allEligible: valid,
      filteredTrades: filtered,
      rValues: filtered.map(t => t.r),
      invalidCount,
      totalInputCount: rawTrades.length,
      periodStart,
      periodEnd
    };
  }

  /**
   * Calcula a evolução de equity, pico e drawdown para uma sequência conhecida de R-multiples
   * (usado tanto para o histórico observado quanto para validação determinística de fórmulas).
   *
   * Fórmulas oficiais:
   *   Peak_t = max(Equity_0, ..., Equity_t)
   *   DD_t = (Peak_t - Equity_t) / Peak_t * 100
   *   MDD = max(DD_t)
   *
   * @param {number[]} rSequence Sequência de resultados líquidos em R
   * @param {Object} options
   * @param {number} [options.initialEquity=100] Patrimônio inicial (> 0)
   * @param {number} [options.riskPerTradePct=0.5] Risco percentual por trade (ex: 0.5 para 0,50%)
   * @param {string} [options.riskModel='compounding'] 'compounding' | 'fixed'
   * @returns {Object}
   */
  function calculateEquityAndDrawdownSeries(rSequence = [], options = {}) {
    const initialEquity = Number(options.initialEquity ?? 100);
    if (!Number.isFinite(initialEquity) || initialEquity <= 0) {
      throw new Error('O patrimônio inicial deve ser um número estritamente positivo.');
    }

    const riskPerTradePct = Number(options.riskPerTradePct ?? DEFAULT_CONFIG.riskPerTradePct);
    if (!Number.isFinite(riskPerTradePct) || riskPerTradePct < 0) {
      throw new Error('O risco por trade deve ser um número não negativo.');
    }

    const riskFraction = riskPerTradePct / 100;
    const riskModel = options.riskModel === 'fixed' ? 'fixed' : 'compounding';
    const fixedRiskAmount = initialEquity * riskFraction;

    let currentEquity = initialEquity;
    let peakEquity = initialEquity;
    let maxDrawdownPct = 0;
    let currentDrawdownPct = 0;

    const equityCurve = [initialEquity];
    const peakCurve = [initialEquity];
    const drawdownCurve = [0];

    for (let i = 0; i < rSequence.length; i++) {
      const r = Number(rSequence[i]);
      if (!Number.isFinite(r)) continue;

      if (riskModel === 'fixed') {
        currentEquity = Math.max(0, currentEquity + fixedRiskAmount * r);
      } else {
        currentEquity = Math.max(0, currentEquity * (1 + riskFraction * r));
      }

      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }

      currentDrawdownPct = peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 100;
      if (currentDrawdownPct > maxDrawdownPct) {
        maxDrawdownPct = currentDrawdownPct;
      }

      equityCurve.push(currentEquity);
      peakCurve.push(peakEquity);
      drawdownCurve.push(currentDrawdownPct);
    }

    return {
      initialEquity,
      finalEquity: currentEquity,
      peakEquity,
      maxDrawdownPct,
      currentDrawdownPct,
      equityCurve,
      peakCurve,
      drawdownCurve
    };
  }

  /**
   * Calcula estatísticas descritivas observadas da amostra de trades (Expectancy, Win Rate, Payoff, DD Histórico).
   *
   * @param {Array} tradesOrRValues
   * @param {Object} [options]
   * @returns {Object}
   */
  function computeHistoricalSampleStats(tradesOrRValues = [], options = {}) {
    const extracted = extractEligibleTrades(tradesOrRValues, options);
    const rValues = extracted.rValues;
    const count = rValues.length;

    if (count === 0) {
      return {
        count: 0,
        winsCount: 0,
        lossesCount: 0,
        breakevenCount: 0,
        winRatePct: 0,
        avgWinR: 0,
        avgLossR: 0,
        payoffRatio: null,
        expectancyR: 0,
        profitFactorR: null,
        observedMaxDrawdownPct: 0,
        observedCurrentDrawdownPct: 0,
        observedMaxDrawdownR: 0,
        periodStart: null,
        periodEnd: null
      };
    }

    const wins = rValues.filter(r => r > 0);
    const losses = rValues.filter(r => r < 0);
    const breakevens = rValues.filter(r => r === 0);

    const sumR = rValues.reduce((acc, r) => acc + r, 0);
    const grossWinR = wins.reduce((acc, r) => acc + r, 0);
    const grossLossR = Math.abs(losses.reduce((acc, r) => acc + r, 0));

    const expectancyR = sumR / count;
    const winRatePct = (wins.length / count) * 100;
    const avgWinR = wins.length > 0 ? grossWinR / wins.length : 0;
    const avgLossR = losses.length > 0 ? grossLossR / losses.length : 0;
    const payoffRatio = avgLossR > 0 ? avgWinR / avgLossR : null;
    const profitFactorR = grossLossR > 0 ? grossWinR / grossLossR : (grossWinR > 0 ? Infinity : null);

    // Drawdown histórico em R acumulado
    let cumR = 0;
    let peakR = 0;
    let maxDdR = 0;
    for (let i = 0; i < rValues.length; i++) {
      cumR += rValues[i];
      if (cumR > peakR) peakR = cumR;
      const ddR = peakR - cumR;
      if (ddR > maxDdR) maxDdR = ddR;
    }

    // Drawdown histórico percentual sob o risco por trade configurado (ou realizado na série monetária)
    const riskPerTradePct = Number(options.riskPerTradePct ?? DEFAULT_CONFIG.riskPerTradePct);
    const riskModel = options.riskModel || 'compounding';
    const initialEquity = Number(options.initialEquity ?? 100);

    // Se todos os trades tiverem netResult monetário e tivermos operationalEquity, também podemos medir o DD monetário real
    const simObserved = calculateEquityAndDrawdownSeries(rValues, {
      initialEquity: initialEquity > 0 ? initialEquity : 100,
      riskPerTradePct: riskPerTradePct > 0 ? riskPerTradePct : 0.5,
      riskModel
    });

    // Caso o usuário informe drawdown real da conta (a partir do pico real do patrimônio), preserva-o separadamente
    const accountCurrentDrawdownPct = Number.isFinite(Number(options.accountCurrentDrawdownPct))
      ? Math.max(0, Number(options.accountCurrentDrawdownPct))
      : simObserved.currentDrawdownPct;

    const accountMaxDrawdownPct = Number.isFinite(Number(options.accountMaxDrawdownPct))
      ? Math.max(simObserved.maxDrawdownPct, Number(options.accountMaxDrawdownPct))
      : simObserved.maxDrawdownPct;

    return {
      count,
      winsCount: wins.length,
      lossesCount: losses.length,
      breakevenCount: breakevens.length,
      winRatePct,
      avgWinR,
      avgLossR,
      payoffRatio,
      expectancyR,
      profitFactorR,
      observedMaxDrawdownPct: accountMaxDrawdownPct,
      observedSeriesMaxDrawdownPct: simObserved.maxDrawdownPct,
      observedCurrentDrawdownPct: accountCurrentDrawdownPct,
      observedMaxDrawdownR: maxDdR,
      periodStart: extracted.periodStart,
      periodEnd: extracted.periodEnd
    };
  }

  /**
   * Constrói os bins do histograma da distribuição de Drawdowns Máximos (Monte Carlo).
   *
   * @param {number[]} maxDrawdowns Vetor com o MDD (%) de cada trajetória
   * @param {number} limitPct Limite de drawdown configurado (%)
   * @returns {Array<Object>}
   */
  function buildDrawdownHistogram(maxDrawdowns, limitPct = 30) {
    const binWidth = 1; // Bins de 1% (0% a 50%+)
    const maxBinEdge = 50;
    const numBins = Math.floor(maxBinEdge / binWidth) + 1;
    const bins = Array.from({ length: numBins }, (_, idx) => {
      const start = idx * binWidth;
      const end = start + binWidth;
      return {
        binIndex: idx,
        startPct: start,
        endPct: end,
        label: idx === numBins - 1 ? `${start}%+` : `${start}%`,
        count: 0,
        frequencyPct: 0,
        isRuinZone: start + 1e-9 >= limitPct
      };
    });

    const total = maxDrawdowns.length;
    if (total === 0) return bins;

    for (let i = 0; i < total; i++) {
      const dd = Math.max(0, maxDrawdowns[i]);
      const idx = Math.min(numBins - 1, Math.floor(dd / binWidth));
      bins[idx].count += 1;
    }

    for (let i = 0; i < bins.length; i++) {
      bins[i].frequencyPct = (bins[i].count / total) * 100;
    }

    return bins;
  }

  /**
   * Executa a simulação central de Monte Carlo para o módulo Risk of Ruin.
   *
   * Regras invioláveis:
   * - Reamostragem com reposição dos resultados líquidos em R.
   * - Determinístico para os mesmos dados, parâmetros e seed.
   * - Sem arredondamentos intermediários.
   * - Uma trajetória conta como ruína se MDD >= maxDrawdownLimitPct em qualquer ponto do horizonte.
   *
   * @param {Array} rawTrades Lista de trades ou valores em R
   * @param {Object} rawConfig Parâmetros da simulação
   * @param {Object} [context] Contexto adicional (ex: accountCurrentDrawdownPct, calculatedAt)
   * @returns {Object}
   */
  function runMonteCarloSimulation(rawTrades = [], rawConfig = {}, context = {}) {
    const config = normalizeConfig(rawConfig);
    const extracted = extractEligibleTrades(rawTrades, {
      historyWindow: config.historyWindow,
      referenceDate: context.referenceDate
    });

    const rValues = extracted.rValues;
    const sampleCount = rValues.length;
    const calculatedAt = context.calculatedAt || new Date().toISOString();

    const sampleStats = computeHistoricalSampleStats(extracted.filteredTrades, {
      ...config,
      accountCurrentDrawdownPct: context.accountCurrentDrawdownPct,
      accountMaxDrawdownPct: context.accountMaxDrawdownPct
    });

    // Validação de tamanho mínimo de amostra
    if (sampleCount < config.minSampleRequired) {
      return {
        status: 'INSUFFICIENT_DATA',
        isSufficientSample: false,
        isLowSampleWarning: false,
        modelVersion: MODEL_VERSION,
        calculatedAt,
        config,
        sampleStats,
        invalidRecordsIgnored: extracted.invalidCount,
        ruinProbabilityPct: null,
        confidenceInterval95: null,
        drawdownPercentiles: null,
        histogram: [],
        samplePaths: [],
        horizonBands: [],
        limitations: STATISTICAL_LIMITATIONS,
        message: sampleCount === 0
          ? 'Não há trades encerrados com R-Multiple válido na janela selecionada para executar a simulação de Monte Carlo.'
          : `Amostra insuficiente (${sampleCount} trade${sampleCount === 1 ? '' : 's'}). São necessários pelo menos ${config.minSampleRequired} trades encerrados para estimar a distribuição empírica.`
      };
    }

    const isLowSampleWarning = sampleCount < config.minSampleRecommended;
    const random = createRng(config.seed);

    const N = config.simulationsCount;
    const H = config.horizonTrades;
    const limitPct = config.maxDrawdownLimitPct;
    const riskFraction = config.riskPerTradePct / 100;
    const initialEquity = config.initialEquity;
    const isFixedModel = config.riskModel === 'fixed';
    const fixedRiskAmount = initialEquity * riskFraction;
    const EPSILON = 1e-9;

    const maxDrawdowns = new Float64Array(N);
    const finalEquities = new Float64Array(N);
    let ruinedTrajectories = 0;

    // Contagem acumulada de ruína até cada passo t (para curva de probabilidade por horizonte)
    const firstRuinStepCounts = new Int32Array(H + 1);

    // Amostragem de trajetórias para plotagem visual (máx 45 trajetórias)
    const maxSamplePaths = Math.min(45, N);
    const samplePaths = [];

    // Pontos de amostragem ao longo do horizonte para calcular bandas P10 / P50 / P90 sem estourar memória
    const stepStride = H <= 250 ? 5 : Math.max(5, Math.floor(H / 50));
    const checkpointSteps = [];
    for (let s = 0; s <= H; s += stepStride) {
      checkpointSteps.push(s);
    }
    if (checkpointSteps[checkpointSteps.length - 1] !== H) {
      checkpointSteps.push(H);
    }
    const checkpointMap = new Map();
    checkpointSteps.forEach((step, idx) => checkpointMap.set(step, idx));
    const stepSamples = checkpointSteps.map(() => new Float64Array(N));

    const rLen = rValues.length;

    for (let run = 0; run < N; run++) {
      let equity = initialEquity;
      let peak = initialEquity;
      let mdd = 0;
      let ruinedAtStep = 0; // 0 = não atingiu ruína

      const recordPath = run < maxSamplePaths;
      const pathPoints = recordPath ? new Array(checkpointSteps.length) : null;

      // t = 0
      stepSamples[0][run] = initialEquity;
      if (recordPath) {
        pathPoints[0] = { step: 0, equity: initialEquity };
      }

      for (let step = 1; step <= H; step++) {
        const randIdx = Math.floor(random() * rLen);
        const r = rValues[randIdx];

        if (isFixedModel) {
          equity = Math.max(0, equity + fixedRiskAmount * r);
        } else {
          equity = Math.max(0, equity * (1 + riskFraction * r));
        }

        if (equity > peak) {
          peak = equity;
        }

        const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 100;
        if (dd > mdd) {
          mdd = dd;
        }

        if (ruinedAtStep === 0 && mdd + EPSILON >= limitPct) {
          ruinedAtStep = step;
        }

        const cpIdx = checkpointMap.get(step);
        if (cpIdx !== undefined) {
          stepSamples[cpIdx][run] = equity;
          if (recordPath) {
            pathPoints[cpIdx] = { step, equity, maxDrawdownPct: mdd };
          }
        }
      }

      maxDrawdowns[run] = mdd;
      finalEquities[run] = equity;

      if (ruinedAtStep > 0) {
        ruinedTrajectories += 1;
        firstRuinStepCounts[ruinedAtStep] += 1;
      }

      if (recordPath) {
        samplePaths.push({
          runIndex: run,
          ruined: ruinedAtStep > 0,
          maxDrawdownPct: mdd,
          finalEquity: equity,
          points: pathPoints
        });
      }
    }

    // Ordena drawdowns e equities finais para cálculo exato de percentis
    const sortedDrawdowns = Array.from(maxDrawdowns).sort((a, b) => a - b);
    const sortedEquities = Array.from(finalEquities).sort((a, b) => a - b);

    const drawdownPercentiles = {
      p50: percentileSorted(sortedDrawdowns, 0.50),
      p75: percentileSorted(sortedDrawdowns, 0.75),
      p90: percentileSorted(sortedDrawdowns, 0.90),
      p95: percentileSorted(sortedDrawdowns, 0.95),
      p99: percentileSorted(sortedDrawdowns, 0.99),
      max: sortedDrawdowns[sortedDrawdowns.length - 1] || 0
    };

    const equityPercentiles = {
      p10: percentileSorted(sortedEquities, 0.10),
      p50: percentileSorted(sortedEquities, 0.50),
      p90: percentileSorted(sortedEquities, 0.90)
    };

    // Bandas de evolução patrimonial e curva acumulada de ruína ao longo do horizonte
    let cumulativeRuined = 0;
    const ruinByStep = new Float64Array(H + 1);
    for (let s = 1; s <= H; s++) {
      cumulativeRuined += firstRuinStepCounts[s];
      ruinByStep[s] = (cumulativeRuined / N) * 100;
    }

    const horizonBands = checkpointSteps.map((step, cpIdx) => {
      const sortedStepEq = Array.from(stepSamples[cpIdx]).sort((a, b) => a - b);
      return {
        step,
        p10: percentileSorted(sortedStepEq, 0.10),
        p50: percentileSorted(sortedStepEq, 0.50),
        p90: percentileSorted(sortedStepEq, 0.90),
        cumulativeRuinProbabilityPct: ruinByStep[step] || 0
      };
    });

    const ci95 = computeConfidenceInterval95(ruinedTrajectories, N);
    const histogram = buildDrawdownHistogram(sortedDrawdowns, limitPct);

    return {
      status: isLowSampleWarning ? 'LOW_SAMPLE' : 'CALCULATED',
      isSufficientSample: true,
      isLowSampleWarning,
      modelVersion: MODEL_VERSION,
      calculatedAt,
      config,
      sampleStats,
      invalidRecordsIgnored: extracted.invalidCount,
      ruinedTrajectories,
      totalTrajectories: N,
      ruinProbabilityPct: ci95.probabilityPct,
      confidenceInterval95: ci95,
      drawdownPercentiles,
      equityPercentiles,
      histogram,
      samplePaths,
      horizonBands,
      limitations: STATISTICAL_LIMITATIONS,
      message: isLowSampleWarning
        ? `Amostra reduzida (${sampleCount} trades). O cálculo foi concluído, mas amostras abaixo de ${config.minSampleRecommended} operações apresentam maior variância estatística.`
        : 'Simulação concluída com sucesso sobre a distribuição empírica de resultados em R.'
    };
  }

  /**
   * Executa uma simulação rápida enxuta (sem guardar paths/histogramas pesados) para um dado risco por trade,
   * usando exatamente a mesma semente, dados e horizonte.
   */
  function runScenarioCore(rValues, config, riskPerTradePct) {
    const random = createRng(config.seed);
    const N = config.simulationsCount;
    const H = config.horizonTrades;
    const limitPct = config.maxDrawdownLimitPct;
    const riskFraction = riskPerTradePct / 100;
    const initialEquity = config.initialEquity;
    const isFixedModel = config.riskModel === 'fixed';
    const fixedRiskAmount = initialEquity * riskFraction;
    const EPSILON = 1e-9;
    const rLen = rValues.length;

    const maxDrawdowns = new Float64Array(N);
    const firstRuinStepCounts = new Int32Array(H + 1);
    let ruinedTrajectories = 0;

    for (let run = 0; run < N; run++) {
      let equity = initialEquity;
      let peak = initialEquity;
      let mdd = 0;
      let ruinedAtStep = 0;

      for (let step = 1; step <= H; step++) {
        const r = rValues[Math.floor(random() * rLen)];
        if (isFixedModel) {
          equity = Math.max(0, equity + fixedRiskAmount * r);
        } else {
          equity = Math.max(0, equity * (1 + riskFraction * r));
        }
        if (equity > peak) peak = equity;
        const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 100;
        if (dd > mdd) mdd = dd;
        if (ruinedAtStep === 0 && mdd + EPSILON >= limitPct) {
          ruinedAtStep = step;
        }
      }

      maxDrawdowns[run] = mdd;
      if (ruinedAtStep > 0) {
        ruinedTrajectories += 1;
        firstRuinStepCounts[ruinedAtStep] += 1;
      }
    }

    const sortedDrawdowns = Array.from(maxDrawdowns).sort((a, b) => a - b);
    const ci95 = computeConfidenceInterval95(ruinedTrajectories, N);

    // Curva de probabilidade em função do horizonte (de 25 em 25 trades)
    const horizonCurve = [{ step: 0, ruinProbabilityPct: 0 }];
    const stride = Math.max(1, Math.floor(H / 10));
    let cumRuined = 0;
    for (let s = 1; s <= H; s++) {
      cumRuined += firstRuinStepCounts[s];
      if (s % stride === 0 || s === H) {
        horizonCurve.push({
          step: s,
          ruinProbabilityPct: (cumRuined / N) * 100
        });
      }
    }

    return {
      riskPerTradePct,
      ruinedTrajectories,
      totalTrajectories: N,
      ruinProbabilityPct: ci95.probabilityPct,
      confidenceInterval95: ci95,
      medianDrawdownPct: percentileSorted(sortedDrawdowns, 0.50),
      p75DrawdownPct: percentileSorted(sortedDrawdowns, 0.75),
      p90DrawdownPct: percentileSorted(sortedDrawdowns, 0.90),
      p95DrawdownPct: percentileSorted(sortedDrawdowns, 0.95),
      p99DrawdownPct: percentileSorted(sortedDrawdowns, 0.99),
      horizonCurve
    };
  }

  /**
   * Compara múltiplos cenários de risco por trade mantendo rigorosamente o mesmo histórico,
   * horizonte, seed e premissas.
   *
   * @param {Array} rawTrades
   * @param {Object} rawConfig
   * @param {number[]} [customRiskLevels] Lista opcional de riscos em % (ex: [0.10, 0.25, 0.50, 1.00])
   * @returns {Object}
   */
  function compareRiskScenarios(rawTrades = [], rawConfig = {}, customRiskLevels = null) {
    const config = normalizeConfig(rawConfig);
    const extracted = extractEligibleTrades(rawTrades, {
      historyWindow: config.historyWindow
    });
    const rValues = extracted.rValues;

    if (rValues.length < config.minSampleRequired) {
      return {
        status: 'INSUFFICIENT_DATA',
        scenarios: [],
        currentScenario: null
      };
    }

    const currentRisk = Number(config.riskPerTradePct.toFixed(4));

    const hasCustom = Array.isArray(customRiskLevels) && customRiskLevels.length > 0;
    let levels = hasCustom
      ? customRiskLevels.map(Number).filter(v => Number.isFinite(v) && v > 0)
      : [0.10, 0.25, 0.50, 1.00];

    if (!hasCustom) {
      const halfCurrent = Number((currentRisk * 0.5).toFixed(2));
      const quarterCurrent = Number((currentRisk * 0.25).toFixed(2));
      const doubleCurrent = Number(Math.min(5.0, currentRisk * 2).toFixed(2));
      if (halfCurrent >= 0.05 && !levels.some(l => Math.abs(l - halfCurrent) < 0.005)) {
        levels.push(halfCurrent);
      }
      if (quarterCurrent >= 0.05 && !levels.some(l => Math.abs(l - quarterCurrent) < 0.005)) {
        levels.push(quarterCurrent);
      }
      if (doubleCurrent > currentRisk && !levels.some(l => l > currentRisk + 0.005)) {
        levels.push(doubleCurrent);
      }
    }

    if (!levels.some(l => Math.abs(l - currentRisk) < 0.005)) {
      levels.push(currentRisk);
    }

    levels.sort((a, b) => a - b);

    const evaluatedAll = levels.map((riskPct, idx) => {
      const isCurrent = Math.abs(riskPct - currentRisk) < 0.005;
      const metrics = runScenarioCore(rValues, config, riskPct);
      let id = `risk_${riskPct}`;
      let label = `${riskPct.toFixed(2).replace('.', ',')}%`;

      if (isCurrent) {
        id = 'current';
        label = 'Atual';
      } else if (riskPct < currentRisk) {
        id = idx === 0 ? 'conservative' : 'moderate';
        label = idx === 0 ? 'Conservador' : 'Moderado';
      } else {
        id = 'aggressive';
        label = 'Agressivo';
      }

      return {
        id,
        label,
        isCurrent,
        ...metrics
      };
    });

    const currentItem = evaluatedAll.find(s => s.isCurrent) || evaluatedAll[0];

    if (hasCustom) {
      return {
        status: 'CALCULATED',
        scenarios: evaluatedAll,
        allCandidates: evaluatedAll,
        currentScenario: currentItem
      };
    }

    const smaller = evaluatedAll.filter(s => s.riskPerTradePct < currentRisk - 0.005);
    const larger = evaluatedAll.filter(s => s.riskPerTradePct > currentRisk + 0.005);

    const displayScenarios = [];
    if (smaller.length >= 2) {
      const cons = { ...smaller[0], id: 'conservative', label: 'Conservador' };
      const mod = { ...smaller[smaller.length - 1], id: 'moderate', label: 'Moderado' };
      displayScenarios.push(cons, mod);
    } else if (smaller.length === 1) {
      displayScenarios.push({ ...smaller[0], id: 'conservative', label: 'Conservador' });
    }
    if (currentItem) {
      displayScenarios.push({ ...currentItem, id: 'current', label: 'Atual' });
    }
    if (larger.length >= 1) {
      displayScenarios.push({ ...larger[larger.length - 1], id: 'aggressive', label: 'Agressivo' });
    }

    return {
      status: 'CALCULATED',
      scenarios: displayScenarios,
      allCandidates: evaluatedAll,
      currentScenario: currentItem
    };
  }

  /**
   * Gera a recomendação consultiva de redução de mão quando a probabilidade estimada
   * ultrapassa a tolerância configurada pelo usuário, respeitando as restrições existentes
   * da Política de Risco (Risk Budget, ATR, Capital, Portfolio Heat, máximo de posições).
   *
   * Regras de domínio invioláveis:
   * - Nunca recomenda aumentar automaticamente o risco quando a estimativa for baixa.
   * - Nunca altera ordens, stops, quantidades reais ou parâmetros operacionais.
   * - Não bloqueia operações nesta versão.
   *
   * @param {Object} params
   * @param {Object} params.simulationResult Resultado de runMonteCarloSimulation
   * @param {Object} [params.scenarioComparison] Resultado de compareRiskScenarios
   * @param {Object} [params.riskPolicy] Política de risco atual (TradingRubrics)
   * @param {Object} [params.portfolioHeat] Snapshot do Portfolio Heat { heat, limit, openCount, maxPositions }
   * @returns {Object}
   */
  function evaluateHandRecommendation({
    simulationResult,
    scenarioComparison = null,
    riskPolicy = null,
    portfolioHeat = null
  } = {}) {
    if (!simulationResult || !simulationResult.isSufficientSample) {
      return {
        status: 'UNAVAILABLE',
        shouldReduceHand: false,
        neverAutoIncrease: true,
        severity: 'neutral',
        badgeLabel: 'Aguardando Dados',
        headline: 'Amostra insuficiente para recomendação estatística.',
        justification: 'Registre operações encerradas suficientes no Trading Log para habilitar a análise de redução de mão.',
        currentRiskPct: simulationResult?.config?.riskPerTradePct ?? DEFAULT_CONFIG.riskPerTradePct,
        recommendedRiskPct: null,
        currentRuinProbPct: null,
        recommendedRuinProbPct: null,
        probabilityReductionPp: null,
        policyConstraintsSummary: null
      };
    }

    const config = simulationResult.config;
    const currentRiskPct = config.riskPerTradePct;
    const currentRuinProbPct = simulationResult.ruinProbabilityPct;
    const tolerancePct = config.ruinProbabilityTolerancePct;
    const limitPct = config.maxDrawdownLimitPct;
    const horizon = config.horizonTrades;

    // Extrai restrições ativas da Política de Risco se fornecida
    let policySummary = null;
    if (riskPolicy && TradingRubrics && typeof TradingRubrics.normalizePolicy === 'function') {
      const norm = TradingRubrics.normalizePolicy(riskPolicy);
      const activeProfileKey = norm.activeProfile || 'standard';
      const profile = norm.profiles?.[activeProfileKey] || norm.profiles?.standard || {};
      const gradeA = norm.grades?.find(g => g.grade === 'A');
      const gradeB = norm.grades?.find(g => g.grade === 'B');
      policySummary = {
        activeProfile: activeProfileKey,
        profileLabel: profile.label || (activeProfileKey === 'rampUp' ? 'Risk Ramp-Up' : 'Política Padrão'),
        gradeARiskPct: gradeA ? gradeA.riskPct * 100 : 0.50,
        gradeBRiskPct: gradeB ? gradeB.riskPct * 100 : 0.25,
        maxPortfolioHeatPct: (profile.portfolioHeatMaxPct || 0.06) * 100,
        maxPositions: profile.maximumPositions || 6,
        capitalLimitPct: (profile.capitalLimitPct || 0.25) * 100
      };
    }

    const candidates = (scenarioComparison?.allCandidates || scenarioComparison?.scenarios || [])
      .filter(c => c.riskPerTradePct < currentRiskPct - 0.001)
      .sort((a, b) => b.riskPerTradePct - a.riskPerTradePct); // Do maior candidato menor que o atual até o mais conservador

    const exceedsTolerance = currentRuinProbPct > tolerancePct;
    const highCurrentDrawdown = (simulationResult.sampleStats?.observedCurrentDrawdownPct || 0) >= limitPct * 0.5;
    const heatNearLimit = portfolioHeat && Number.isFinite(portfolioHeat.heat) && Number.isFinite(portfolioHeat.limit) && portfolioHeat.limit > 0
      ? (portfolioHeat.heat / portfolioHeat.limit) >= 0.80
      : false;

    if (exceedsTolerance) {
      // Busca o candidato de redução de mão que traz a probabilidade para dentro da tolerância (ou o mais seguro disponível)
      const targetCandidate = candidates.find(c => c.ruinProbabilityPct <= tolerancePct) || candidates[candidates.length - 1] || null;
      const recommendedRiskPct = targetCandidate ? targetCandidate.riskPerTradePct : Number((currentRiskPct * 0.5).toFixed(2));
      const recommendedRuinProbPct = targetCandidate ? targetCandidate.ruinProbabilityPct : null;
      const probabilityReductionPp = recommendedRuinProbPct !== null ? Math.max(0, currentRuinProbPct - recommendedRuinProbPct) : null;

      const fmtNum = (v, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

      const justification = recommendedRuinProbPct !== null
        ? `Com o risco atual de ${fmtNum(currentRiskPct, 2)}% por operação, a probabilidade estimada de atingir o drawdown de ${fmtNum(limitPct, 0)}% em ${horizon} trades é de ${fmtNum(currentRuinProbPct, 1)}% (acima da tolerância de ${fmtNum(tolerancePct, 1)}%). Uma redução para ${fmtNum(recommendedRiskPct, 2)}% diminui essa probabilidade para ${fmtNum(recommendedRuinProbPct, 1)}% (-${fmtNum(probabilityReductionPp, 1)} pp), com impacto relevante na proteção do seu patrimônio.`
        : `Com o risco atual de ${fmtNum(currentRiskPct, 2)}% por operação, a probabilidade estimada de atingir o drawdown de ${fmtNum(limitPct, 0)}% em ${horizon} trades é de ${fmtNum(currentRuinProbPct, 1)}% (acima da tolerância de ${fmtNum(tolerancePct, 1)}%). Considere reduzir o risco por trade para ${fmtNum(recommendedRiskPct, 2)}%.`;

      return {
        status: 'REDUCE_HAND_RECOMMENDED',
        shouldReduceHand: true,
        neverAutoIncrease: true,
        severity: currentRuinProbPct >= tolerancePct * 2 ? 'critical' : 'warning',
        badgeLabel: 'Redução de Mão Recomendada',
        headline: 'Considere reduzir o risco por trade.',
        justification,
        currentRiskPct,
        recommendedRiskPct,
        currentRuinProbPct,
        recommendedRuinProbPct,
        probabilityReductionPp,
        heatNearLimit,
        highCurrentDrawdown,
        policyConstraintsSummary: policySummary
      };
    }

    // Dentro da tolerância configurada: não recomenda redução nem aumento automático
    const fmtNum = (v, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
    return {
      status: 'WITHIN_POLICY',
      shouldReduceHand: false,
      neverAutoIncrease: true,
      severity: 'good',
      badgeLabel: 'Risco Controlado',
      headline: 'Risco dentro da política configurada.',
      justification: `Com o risco atual de ${fmtNum(currentRiskPct, 2)}% por operação, a probabilidade estimada de atingir ${fmtNum(limitPct, 0)}% de drawdown em ${horizon} trades é de ${fmtNum(currentRuinProbPct, 1)}%, permanecendo dentro da tolerância configurada (${fmtNum(tolerancePct, 1)}%). O sistema mantém o dimensionamento atual sem ampliar o risco automaticamente.`,
      currentRiskPct,
      recommendedRiskPct: currentRiskPct,
      currentRuinProbPct,
      recommendedRuinProbPct: currentRuinProbPct,
      probabilityReductionPp: 0,
      heatNearLimit,
      highCurrentDrawdown,
      policyConstraintsSummary: policySummary
    };
  }

  /**
   * Avalia o contexto de proteção patrimonial antes da entrada na tela Novo Trade.
   *
   * Regra crítica do domínio:
   * - Nunca apresentar o risco atual como se fosse o risco pós-entrada sem distinguir claramente.
   * - Estima o efeito de operar na taxa de risco planejada para o novo trade e o impacto imediato
   *   do stop planejado sobre a folga até o limite de drawdown da conta.
   * - Declara explicitamente a limitação sobre correlação entre múltiplas posições simultâneas.
   *
   * @param {Object} params
   * @param {Array} params.rawTrades Histórico de trades encerrados
   * @param {Object} params.config Configuração atual do Risk of Ruin
   * @param {number} params.plannedTradeRiskPct Risco executável planejado para o novo trade (proveniente do Position Sizing, em %)
   * @param {number} [params.currentDrawdownPct=0] Drawdown atual da conta em relação ao pico real (%)
   * @param {Object} [params.portfolioHeat] Snapshot { heat, limit, openCount, maxPositions }
   * @returns {Object}
   */
  function evaluateNewTradePreEntryContext({
    rawTrades = [],
    config = {},
    plannedTradeRiskPct = null,
    currentDrawdownPct = 0,
    portfolioHeat = null
  } = {}) {
    const normConfig = normalizeConfig(config);
    const baseSim = runMonteCarloSimulation(rawTrades, normConfig, {
      accountCurrentDrawdownPct: currentDrawdownPct
    });

    const hasValidPlannedRisk = Number.isFinite(Number(plannedTradeRiskPct)) && Number(plannedTradeRiskPct) > 0;
    const effectivePlannedRiskPct = hasValidPlannedRisk ? Number(plannedTradeRiskPct) : normConfig.riskPerTradePct;

    if (!baseSim.isSufficientSample) {
      return {
        status: 'INSUFFICIENT_DATA',
        currentRuinProbPct: null,
        drawdownLimitPct: normConfig.maxDrawdownLimitPct,
        currentDrawdownPct: Math.max(0, Number(currentDrawdownPct) || 0),
        currentPolicyRiskPct: normConfig.riskPerTradePct,
        plannedTradeRiskPct: hasValidPlannedRisk ? effectivePlannedRiskPct : null,
        projectedRuinProbAtPlannedRiskPct: null,
        postStopDrawdownBufferLimitPct: null,
        recommendation: evaluateHandRecommendation({ simulationResult: baseSim }),
        modelScopeNotice: 'Amostra histórica insuficiente para projetar o Risco de Ruína. Preencha e encerre trades no Trading Log para ativar a estimativa probabilística.'
      };
    }

    const extracted = extractEligibleTrades(rawTrades, { historyWindow: normConfig.historyWindow });
    const comparison = compareRiskScenarios(rawTrades, normConfig);
    const recommendation = evaluateHandRecommendation({
      simulationResult: baseSim,
      scenarioComparison: comparison,
      portfolioHeat
    });

    // Calcula o efeito de um impacto adverso imediato (-1R com o risco planejado deste trade)
    // reduzindo a distância restante até o limite de drawdown, seguido do horizonte sob o risco planejado:
    const currentDd = Math.max(0, Math.min(99, Number(currentDrawdownPct) || 0));
    // Se a conta já está em drawdown D_0 e sofre perda de f_plan sobre o equity atual:
    // Novo Equity / Peak = (1 - D_0/100) * (1 - f_plan/100)
    const equityRatioAfterStop = (1 - currentDd / 100) * (1 - effectivePlannedRiskPct / 100);
    const ddAfterPlannedStopPct = (1 - equityRatioAfterStop) * 100;

    // Simula a probabilidade de atingir o limite de drawdown para a taxa de risco planejada neste trade
    const plannedScenario = runScenarioCore(extracted.rValues, normConfig, effectivePlannedRiskPct);

    // Simula também a trajetória condicionada caso este novo trade acione o stop inicial (efeito marginal de entrada)
    const remainingFactorToLimit = (1 - normConfig.maxDrawdownLimitPct / 100) / Math.max(0.0001, equityRatioAfterStop);
    const effectiveRemainingLimitPct = Math.max(0.5, (1 - remainingFactorToLimit) * 100);
    const conditionalAfterStopConfig = {
      ...normConfig,
      maxDrawdownLimitPct: effectiveRemainingLimitPct,
      horizonTrades: Math.max(1, normConfig.horizonTrades - 1)
    };
    const conditionalAfterStopSim = runScenarioCore(extracted.rValues, conditionalAfterStopConfig, normConfig.riskPerTradePct);

    return {
      status: 'CALCULATED',
      currentRuinProbPct: baseSim.ruinProbabilityPct,
      currentConfidenceInterval95: baseSim.confidenceInterval95,
      drawdownLimitPct: normConfig.maxDrawdownLimitPct,
      currentDrawdownPct: currentDd,
      currentPolicyRiskPct: normConfig.riskPerTradePct,
      plannedTradeRiskPct: effectivePlannedRiskPct,
      hasExplicitPlannedTrade: hasValidPlannedRisk,
      projectedRuinProbAtPlannedRiskPct: plannedScenario.ruinProbabilityPct,
      projectedConfidenceInterval95: plannedScenario.confidenceInterval95,
      conditionalRuinProbIfStoppedPct: conditionalAfterStopSim.ruinProbabilityPct,
      ddAfterPlannedStopPct,
      portfolioHeat: portfolioHeat || null,
      recommendation,
      modelScopeNotice: 'Nota metodológica: "Risco de Ruína atual" reflete a política vigente da conta. "Cenário com este trade" avalia a sensibilidade sob o risco planejado do Position Sizing e o impacto de 1 stop na folga até o limite de drawdown (sem presumir matriz de correlação intradiária entre ativos simultâneos).'
    };
  }

  return {
    MODEL_VERSION,
    STORAGE_KEY_CONFIG,
    STORAGE_KEY_LAST_RESULT,
    DEFAULT_CONFIG,
    STATISTICAL_LIMITATIONS,
    createRng,
    percentile,
    normalizeConfig,
    computeConfidenceInterval95,
    normalizeTradeRecord,
    extractEligibleTrades,
    calculateEquityAndDrawdownSeries,
    computeHistoricalSampleStats,
    buildDrawdownHistogram,
    runMonteCarloSimulation,
    compareRiskScenarios,
    evaluateHandRecommendation,
    evaluateNewTradePreEntryContext
  };
});

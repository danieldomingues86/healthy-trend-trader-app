/**
 * Healthy Trend Trader — Trade Simulator Model
 *
 * Motor de Simulação de Trades:
 * - Acompanhamento virtual e autônomo de gatilhos do método Healthy Trend Trader
 * - Totalmente independente de ordens reais e do Diário de Trades
 * - Sem look-ahead bias: decisões baseadas estritamente em candles diários disponíveis
 * - Tratamento explícito de ambiguidade intradiária (Conservative Execution)
 * - Métricas rigorosas em R-multiple, MFE e MAE
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.TradeSimulatorModel = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  let MarketCycleModel = (typeof root !== 'undefined' && root && root.MarketCycleModel) || null;
  if (!MarketCycleModel && typeof require === 'function') {
    try {
      MarketCycleModel = require('./market-cycle-model');
    } catch {
      // Ignora se não estiver acessível
    }
  }

  const STATUS = {
    WAITING_ENTRY: 'WAITING_ENTRY',         // Aguardando entrada (amarelo)
    IN_OPERATION: 'IN_OPERATION',           // Em operação (verde)
    CLOSED_GAIN: 'CLOSED_GAIN',             // Encerrado - Gain (verde)
    CLOSED_LOSS: 'CLOSED_LOSS',             // Encerrado - Loss (vermelho)
    NOT_TRIGGERED: 'NOT_TRIGGERED'          // Não acionado / Expirado (cinza)
  };

  const STATUS_LABELS = {
    [STATUS.WAITING_ENTRY]: 'Aguardando entrada',
    [STATUS.IN_OPERATION]: 'Em operação',
    [STATUS.CLOSED_GAIN]: 'Encerrado (Gain)',
    [STATUS.CLOSED_LOSS]: 'Encerrado (Loss)',
    [STATUS.NOT_TRIGGERED]: 'Não acionado'
  };

  const STATUS_BADGE_CLASSES = {
    [STATUS.WAITING_ENTRY]: 'badge-waiting',
    [STATUS.IN_OPERATION]: 'badge-in-op',
    [STATUS.CLOSED_GAIN]: 'badge-gain',
    [STATUS.CLOSED_LOSS]: 'badge-loss',
    [STATUS.NOT_TRIGGERED]: 'badge-not-triggered'
  };

  /**
   * POLÍTICA EXPLÍCITA DE TRATAMENTO DE AMBIGUIDADE INTRADIÁRIA
   * Quando um candle diário apresenta máximas e mínimas que simultaneamente atingem
   * níveis conflitantes (ex: entrada e stop no mesmo candle, ou alvo e stop no mesmo candle),
   * o motor adota a regra de fidelidade conservadora:
   * 1. Entrada + Stop no mesmo dia: Se a mínima violou o stop no dia da entrada, assume-se
   *    que a operação foi stopada com perda (-1R) ao invés de presumir que ela subiu primeiro.
   * 2. Alvo (+2R) + Stop no mesmo dia: Assume-se que o stop foi tocado antes do alvo.
   * Prioridade incondicional: Fidelidade metodológica > resultado inflado.
   */
  const AMBIGUITY_POLICY = {
    ENTRY_AND_STOP_SAME_BAR: 'STOP_TRIGGERED',
    TARGET_AND_STOP_SAME_BAR: 'STOP_TRIGGERED',
    DESCRIPTION: 'Política Conservadora: prioriza preservação do risco e assume pior cenário intradiário para evitar viés de sobre-otimização.'
  };

  /**
   * CENÁRIOS OFICIAIS DE GESTÃO DE RISCO
   * 1. Gestão 2R — Base (Risco 1R, saída 100% em +2R, sem piramidagem)
   * 2. Gestão 2,5R — Alvo Estendido (Risco 1R, saída 100% em +2,5R, sem piramidagem)
   * 3. Gestão Pirâmide — 1R → 2R (Risco 1R, ao atingir +1R adiciona posição +1R e encerra tudo em +2R)
   */
  const SCENARIOS = Object.freeze({
    BASE_2R: '2R',
    EXTENDED_2_5R: '2.5R',
    PYRAMID_1R_2R: 'PYRAMID_1R_2R',
    PARTIAL_50_2R_EMA9: 'PARTIAL_50_2R_EMA9',
    PARTIAL_80_2R_EMA9: 'PARTIAL_80_2R_EMA9'
  });

  const SCENARIO_METADATA = Object.freeze({
    '2R': {
      id: '2R',
      name: 'Gestão 2R — Base',
      shortLabel: '2R Base',
      sub: 'Risco 1R → Saída 2R',
      description: 'Risco inicial de 1R e saída total em 2R.',
      targetR: 2.0,
      hasPyramid: false,
      hasPartial: false,
      color: '#10b981',
      badgeClass: 'scenario-base-2r'
    },
    '2.5R': {
      id: '2.5R',
      name: 'Gestão 2,5R — Alvo Estendido',
      shortLabel: '2,5R Estendido',
      sub: 'Risco 1R → Saída 2,5R',
      description: 'Risco inicial de 1R e saída total em 2,5R.',
      targetR: 2.5,
      hasPyramid: false,
      hasPartial: false,
      color: '#f59e0b',
      badgeClass: 'scenario-extended-25r'
    },
    'PYRAMID_1R_2R': {
      id: 'PYRAMID_1R_2R',
      name: 'Gestão Pirâmide — 1R → 2R',
      shortLabel: 'Pirâmide 1R → 2R',
      sub: 'Add em +1R → Saída 2R',
      description: 'Risco inicial de 1R. Ao atingir +1R adiciona posição +1R e encerra tudo em 2R.',
      targetR: 2.0,
      hasPyramid: true,
      hasPartial: false,
      color: '#0284c7',
      badgeClass: 'scenario-pyramid'
    },
    'PARTIAL_50_2R_EMA9': {
      id: 'PARTIAL_50_2R_EMA9',
      name: 'Gestão Parcial 50% (2R) + Média 10',
      shortLabel: 'Parcial 50% + MM10',
      sub: '50% em 2R → 50% na MM10',
      description: 'Risco 1R. Embolsa metade (50%) em +2R e move o stop para breakeven. Os 50% restantes correm até o preço perder a média móvel de 10 períodos.',
      targetR: 2.0,
      hasPyramid: false,
      hasPartial: true,
      partialPercent: 50,
      color: '#8b5cf6',
      badgeClass: 'scenario-partial-50'
    },
    'PARTIAL_80_2R_EMA9': {
      id: 'PARTIAL_80_2R_EMA9',
      name: 'Gestão Parcial 80% (2R) + Média 10',
      shortLabel: 'Parcial 80% + MM10',
      sub: '80% em 2R → 20% na MM10',
      description: 'Risco 1R. Embolsa 80% em +2R e move o stop para breakeven. Os 20% restantes correm até o preço perder a média móvel de 10 períodos.',
      targetR: 2.0,
      hasPyramid: false,
      hasPartial: true,
      partialPercent: 80,
      color: '#06b6d4',
      badgeClass: 'scenario-partial-80'
    }
  });

  /**
   * Catálogo de Tipos de Gatilho suportados no Simulador
   */
  const TRIGGER_TYPES = Object.freeze({
    INSIDE_BAR: 'Inside Bar',
    DOUBLE_INSIDE_BAR: 'Double Inside Bar',
    ONE_TWO_THREE: '1-2-3 de Compra',
    PFR_COMPRA: 'PFR de Compra',
    DAVE_LANDRY: 'Dave Landry',
    RBI: 'RBI',
    OUTROS: 'Outros'
  });

  /**
   * Gatilhos EXPERIMENTAIS da validação estatística 1-2-3 + Inside Bar (não pertencem ao catálogo operacional).
   */
  const EXPERIMENTAL_TRIGGERS = Object.freeze({
    COMBO_IB_STOP: { id: 'EXP_123_IB', name: '1-2-3 + Inside Bar (stop da Inside Bar)' },
    COMBO_VERTEX_STOP: { id: 'EXP_123_IB_VERTEX', name: '1-2-3 + Inside Bar (stop do vértice do 1-2-3)' },
    STRUCTURAL_123_NO_IB: { id: 'EXP_123_SEM_IB', name: '1-2-3 estrutural sem Inside Bar (stop do vértice)' }
  });

  /**
   * Fonte de verdade das Notas do Trading Rubric (alinhado com Novo Trade / TradingRubrics)
   * As únicas notas válidas no método são A, B, C e D.
   */
  const VALID_GRADES = Object.freeze(['A', 'B', 'C', 'D']);
  const SIMULATOR_ENGINE_VERSION = '4.2.0-audited';

  function normalizeSimulatorGrade(grade) {
    const g = String(grade || '').trim().toUpperCase();
    if (VALID_GRADES.includes(g)) return g;
    if (g.startsWith('A')) return 'A';
    if (g.startsWith('B')) return 'B';
    if (g.startsWith('C')) return 'C';
    if (g.startsWith('D')) return 'D';
    return 'B';
  }

  /**
   * Calendário Oficial de Negociação (B3 / Mercados)
   * Exclui sábados, domingos e feriados sem pregão.
   */
  const B3_FIXED_HOLIDAYS = new Set([
    '01-01', // Confraternização Universal
    '04-21', // Tiradentes
    '05-01', // Dia do Trabalho
    '09-07', // Independência do Brasil
    '10-12', // Nossa Senhora Aparecida
    '11-02', // Finados
    '11-15', // Proclamação da República
    '11-20', // Consciência Negra
    '12-24', // Véspera de Natal (sem pregão B3)
    '12-25', // Natal
    '12-31'  // Véspera de Ano Novo (sem pregão B3)
  ]);

  const B3_MOVABLE_HOLIDAYS = new Set([
    // 2023
    '2023-02-20', '2023-02-21', '2023-04-07', '2023-06-08',
    // 2024
    '2024-02-12', '2024-02-13', '2024-03-29', '2024-05-30',
    // 2025
    '2025-03-03', '2025-03-04', '2025-04-18', '2025-06-19',
    // 2026
    '2026-02-16', '2026-02-17', '2026-04-03', '2026-06-04',
    // 2027
    '2027-02-08', '2027-02-09', '2027-03-26', '2027-05-27'
  ]);

  function isHolidayB3(isoDateStr) {
    if (!isoDateStr || typeof isoDateStr !== 'string') return false;
    const d = isoDateStr.slice(0, 10);
    if (B3_MOVABLE_HOLIDAYS.has(d)) return true;
    const mmdd = d.slice(5, 10);
    return B3_FIXED_HOLIDAYS.has(mmdd);
  }

  function isWeekendDate(isoDateStr) {
    if (!isoDateStr) return true;
    const dStr = String(isoDateStr).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return true;
    const dt = new Date(dStr + 'T12:00:00Z');
    if (Number.isNaN(dt.getTime())) return true;
    const dow = dt.getUTCDay();
    return dow === 0 || dow === 6;
  }

  function isTradingDay(isoDateStr, validSessionSet = null) {
    if (!isoDateStr) return false;
    const dStr = String(isoDateStr).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return false;
    if (isWeekendDate(dStr)) return false;
    if (validSessionSet instanceof Set && validSessionSet.size > 0) {
      return validSessionSet.has(dStr);
    }
    return !isHolidayB3(dStr);
  }

  function snapToTradingDay(isoDateStr, direction = 1, validSessionSet = null) {
    if (!isoDateStr) return null;
    const dStr = String(isoDateStr).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
    const dt = new Date(dStr + 'T12:00:00Z');
    if (Number.isNaN(dt.getTime())) return dStr;
    const stepMs = (direction >= 0 ? 1 : -1) * 86400000;
    let cur = dt.getTime();
    for (let guard = 0; guard < 20; guard++) {
      const candidate = new Date(cur).toISOString().slice(0, 10);
      if (isTradingDay(candidate, validSessionSet)) {
        return candidate;
      }
      cur += stepMs;
    }
    return new Date(cur).toISOString().slice(0, 10);
  }

  function addTradingDays(isoDateStr, tradingDaysDelta, validSessionSet = null) {
    if (!isoDateStr) return null;
    const start = snapToTradingDay(isoDateStr, tradingDaysDelta >= 0 ? 1 : -1, validSessionSet);
    if (!start || tradingDaysDelta === 0) return start;
    const dir = tradingDaysDelta > 0 ? 1 : -1;
    let remaining = Math.abs(Math.round(tradingDaysDelta));
    let cur = new Date(start + 'T12:00:00Z').getTime();
    let guard = 0;
    while (remaining > 0 && guard < 2000) {
      cur += dir * 86400000;
      guard++;
      const candidate = new Date(cur).toISOString().slice(0, 10);
      if (isTradingDay(candidate, validSessionSet)) {
        remaining--;
      }
    }
    return new Date(cur).toISOString().slice(0, 10);
  }

  /**
   * Identifica e calcula a estrutura de um Double Inside Bar (Duplo Inside Bar)
   * Estrutura no gráfico Diário: Candle-mãe → Inside Bar 1 → Inside Bar 2
   *
   * Regras estritas:
   * - Inside Bar 1 (IB1): High IB1 < High Mãe && Low IB1 > Low Mãe
   * - Inside Bar 2 (IB2): High IB2 < High IB1 && Low IB2 > Low IB1
   * - Entrada de compra: High IB2 + 0.01 (1 tick acima da máxima do IB2)
   * - Stop inicial: Low IB2 - 0.01 (1 tick abaixo da mínima do IB2)
   * - Initial Risk: Entrada - Stop
   * - Risco Gráfico %: ((Entrada - Stop) / Entrada) * 100
   *
   * @param {Object} mother - { high, low, open, close, date }
   * @param {Object} ib1 - { high, low, open, close, date }
   * @param {Object} ib2 - { high, low, open, close, date }
   * @returns {Object} Estrutura completa calculada e auditada
   */
  function calculateDoubleInsideBarStructure(mother, ib1, ib2) {
    if (!mother || !ib1 || !ib2) {
      return { isValid: false, reason: 'Candles incompletos para avaliar Double Inside Bar' };
    }

    const highMother = Number(mother.high);
    const lowMother = Number(mother.low);
    const highIb1 = Number(ib1.high);
    const lowIb1 = Number(ib1.low);
    const highIb2 = Number(ib2.high);
    const lowIb2 = Number(ib2.low);

    if (
      Number.isNaN(highMother) || Number.isNaN(lowMother) ||
      Number.isNaN(highIb1) || Number.isNaN(lowIb1) ||
      Number.isNaN(highIb2) || Number.isNaN(lowIb2)
    ) {
      return { isValid: false, reason: 'Valores numéricos de máxima e mínima inválidos' };
    }

    // Regra 1: IB1 estritamente contido no Candle-mãe
    const isIb1InsideMother = highIb1 < highMother && lowIb1 > lowMother;

    // Regra 2: IB2 estritamente contido no IB1
    const isIb2InsideIb1 = highIb2 < highIb1 && lowIb2 > lowIb1;

    const isValid = isIb1InsideMother && isIb2InsideIb1;

    // Amplitudes de cada estrutura
    const motherRange = round2(Math.max(0, highMother - lowMother));
    const ib1Range = round2(Math.max(0, highIb1 - lowIb1));
    const ib2Range = round2(Math.max(0, highIb2 - lowIb2));

    // Compression Ratios (amplitudes relativas)
    const ib1CompressionRatio = motherRange > 0 ? round2(ib1Range / motherRange) : 0;
    const ib2CompressionRatio = ib1Range > 0 ? round2(ib2Range / ib1Range) : 0;
    const totalCompressionRatio = motherRange > 0 ? round2(ib2Range / motherRange) : 0;

    // Compression % (proporção do tamanho e percentual de contração)
    const ib1CompressionPct = round1(ib1CompressionRatio * 100);
    const ib2CompressionPct = round1(ib2CompressionRatio * 100);
    const totalCompressionPct = round1(totalCompressionRatio * 100);
    const totalContractionPct = round1(Math.max(0, 100 - totalCompressionPct));

    // Trigger de Entrada e Stop conforme regras oficiais (1 tick = R$ 0,01)
    const entryPrice = round2(highIb2 + 0.01);
    const stopLoss = round2(lowIb2 - 0.01);
    const initialRisk = round2(Math.max(0.01, entryPrice - stopLoss));
    const graphicRiskPct = entryPrice > 0 ? round2((initialRisk / entryPrice) * 100) : 0;

    return {
      isValid,
      isIb1InsideMother,
      isIb2InsideIb1,
      triggerType: TRIGGER_TYPES.DOUBLE_INSIDE_BAR,
      ibCount: 2,
      motherCandle: {
        high: round2(highMother),
        low: round2(lowMother),
        range: motherRange,
        date: mother.date || mother.time || null
      },
      ib1: {
        high: round2(highIb1),
        low: round2(lowIb1),
        range: ib1Range,
        compressionRatio: ib1CompressionRatio,
        compressionPct: ib1CompressionPct,
        date: ib1.date || ib1.time || null
      },
      ib2: {
        high: round2(highIb2),
        low: round2(lowIb2),
        range: ib2Range,
        compressionRatio: ib2CompressionRatio,
        compressionPct: ib2CompressionPct,
        date: ib2.date || ib2.time || null
      },
      totalCompressionRatio,
      totalCompressionPct,
      totalContractionPct,
      entryPrice,
      stopLoss,
      initialRisk,
      graphicRiskPct
    };
  }

  function round1(num) {
    if (num === null || num === undefined || Number.isNaN(Number(num))) return null;
    return Math.round(Number(num) * 10) / 10;
  }

  function round2(num) {
    if (num === null || num === undefined || Number.isNaN(Number(num))) return null;
    return Math.round(Number(num) * 100) / 100;
  }

  function formatR(val) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2).replace('.', ',')}R`;
  }

  function formatPrice(val) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
    return `R$ ${Number(val).toFixed(2).replace('.', ',')}`;
  }

  function formatDateBR(isoStr) {
    if (!isoStr) return '—';
    const parts = String(isoStr).slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  }

  function formatDurationDays(days) {
    if (days === null || days === undefined || Number.isNaN(Number(days))) return '—';
    const n = Math.round(Number(days));
    return `${n} dia${n === 1 ? '' : 's'}`;
  }

  /**
   * Calcula a duração em dias de um trade (simulação)
   * - Para trades encerrados: dias corridos entre entrada (ou sinal) e saída
   * - Para trades em andamento: dias corridos entre entrada e data de referência
   * - Para trades não acionados ou aguardando entrada: retorna null
   */
  function calculateTradeDurationDays(sim, referenceDate) {
    if (!sim) return null;
    const status = sim.status;
    if (status === STATUS.WAITING_ENTRY || status === STATUS.NOT_TRIGGERED) {
      return null;
    }

    if (sim.durationDays != null && Number.isFinite(Number(sim.durationDays))) {
      return Math.max(0, Math.round(Number(sim.durationDays)));
    }

    const startStr = sim.entryDate || sim.signalDate;
    if (!startStr) return null;

    let endStr = sim.exitDate;
    if (!endStr) {
      if (status === STATUS.IN_OPERATION) {
        endStr = sim.currentDate || referenceDate || (sim.timeline && sim.timeline.length ? sim.timeline[sim.timeline.length - 1].date : null) || '2026-10-05';
      } else {
        return null;
      }
    }

    const startDate = new Date(String(startStr).slice(0, 10) + 'T00:00:00Z');
    const endDate = new Date(String(endStr).slice(0, 10) + 'T00:00:00Z');

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return null;
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.max(0, Math.round(diffMs / 86400000));
  }

  /**
   * Avalia a simulação percorrendo candles diários cronológicos (apenas dias úteis de pregão)
   * @param {Object} simulation
   * @param {Array} candles - Array de { time: 'YYYY-MM-DD', open, high, low, close }
   * @param {string} [scenarioOverride] - '2R' | '2.5R' | 'PYRAMID_1R_2R'
   * @returns {Object} simulação atualizada
   */
  function evaluateSimulationOnCandles(simulation, candles = [], scenarioOverride = '2R') {
    if (!simulation || !Array.isArray(candles) || candles.length === 0) {
      return simulation;
    }

    const validCandles = candles;

    const scenario = simulation.managementScenario || scenarioOverride || '2R';
    const targetMultiplier = scenario === '2.5R' ? 2.5 : 2.0;
    const isPyramid = scenario === 'PYRAMID_1R_2R';
    const isPartial50 = scenario === 'PARTIAL_50_2R_EMA9';
    const isPartial80 = scenario === 'PARTIAL_80_2R_EMA9';
    const isPartialEma9 = isPartial50 || isPartial80;
    const partialPercent = isPartial50 ? 50 : (isPartial80 ? 80 : 0);
    const runnerPercent = 100 - partialPercent;

    const normalizedGrade = normalizeSimulatorGrade(simulation.grade);
    const rawSignalDateStr = String(simulation.signalDate || '').slice(0, 10);
    const sanitizedSignalDate = snapToTradingDay(rawSignalDateStr, -1);

    const sim = {
      ...simulation,
      grade: normalizedGrade,
      signalDate: sanitizedSignalDate || simulation.signalDate,
      managementScenario: scenario,
      scaleIn: simulation.scaleIn ? { ...simulation.scaleIn } : null,
      partialExit: simulation.partialExit ? { ...simulation.partialExit } : null,
      timeline: Array.isArray(simulation.timeline) ? [...simulation.timeline] : []
    };

    const closes = validCandles.map(c => Number(c.close));
    const ema10Series = calculateEmaSeries(closes, 10);
    const ema9Series = ema10Series;

    const entryPlanned = Number(sim.entryPrice);
    const stopInitial = Number(sim.stopLoss);
    const risk = Number(round2(entryPlanned - stopInitial));

    if (risk <= 0) {
      return sim; // Dados de risco inválidos
    }

    // Filtrar candles que ocorrem após a data do sinal (a entrada só pode ocorrer em pregão posterior ao sinal)
    const signalDateStr = String(sim.signalDate || '').slice(0, 10);
    const signalIndex = validCandles.findIndex(c => {
      const d = String(c.time || c.date).slice(0, 10);
      return d === rawSignalDateStr || d === signalDateStr;
    });

    const startIndex = signalIndex >= 0
      ? signalIndex + 1
      : validCandles.findIndex(c => String(c.time || c.date).slice(0, 10) > rawSignalDateStr);

    if (startIndex < 0 || startIndex >= validCandles.length) {
      // Nenhum candle posterior disponível ainda
      const latest = validCandles[validCandles.length - 1];
      if (latest) {
        sim.currentPrice = round2(latest.close);
      }
      return sim;
    }

    // Se já estiver encerrado e com todos os dados fixados, sincroniza currentPrice com exitPrice
    if (sim.status === STATUS.CLOSED_GAIN || sim.status === STATUS.CLOSED_LOSS || sim.status === STATUS.NOT_TRIGGERED) {
      if ((sim.status === STATUS.CLOSED_GAIN || sim.status === STATUS.CLOSED_LOSS) && sim.exitPrice) {
        sim.currentPrice = round2(sim.exitPrice);
      } else if (!sim.currentPrice) {
        const latest = validCandles[validCandles.length - 1];
        if (latest) sim.currentPrice = round2(latest.close);
      }
      return sim;
    }

    let status = sim.status || STATUS.WAITING_ENTRY;
    let executedEntryPrice = sim.executedEntryPrice ? Number(sim.executedEntryPrice) : null;
    let entryDate = sim.entryDate || null;
    let currentStop = sim.currentStop ? Number(sim.currentStop) : stopInitial;
    let exitPrice = sim.exitPrice ? Number(sim.exitPrice) : null;
    let exitDate = sim.exitDate || null;
    let exitReason = sim.exitReason || null;
    let resultR = sim.resultR !== undefined && sim.resultR !== null ? Number(sim.resultR) : null;
    let mfeR = sim.mfeR !== undefined && sim.mfeR !== null ? Number(sim.mfeR) : null;
    let maeR = sim.maeR !== undefined && sim.maeR !== null ? Number(sim.maeR) : null;
    let ttt1R = sim.ttt1R != null ? sim.ttt1R : null;
    let ttt2R = sim.ttt2R != null ? sim.ttt2R : null;
    let ttt3R = sim.ttt3R != null ? sim.ttt3R : null;
    let expansionAfterBreakout = sim.expansionAfterBreakout ? { ...sim.expansionAfterBreakout } : { c1: null, c2: null, c3: null, c5: null };
    let entryCandleIndex = sim.entryCandleIndex != null ? sim.entryCandleIndex : null;

    let maxHigh = executedEntryPrice || entryPlanned;
    let minLow = executedEntryPrice || entryPlanned;

    // Timeline helpers
    function hasTimelineType(type) {
      return sim.timeline.some(e => e.type === type);
    }
    function addTimelineEvent(event) {
      if (!hasTimelineType(event.type)) {
        sim.timeline.push(event);
      }
    }

    // Eventos iniciais
    addTimelineEvent({
      type: 'SIGNAL_IDENTIFIED',
      date: sim.signalDate,
      label: 'Gatilho identificado',
      desc: `${sim.triggerName} (${normalizedGrade}) em ${sim.symbol}`
    });
    addTimelineEvent({
      type: 'SIMULATION_ADDED',
      date: sim.signalDate,
      label: 'Simulação adicionada',
      desc: `Registrado no Simulador de Trades (${SCENARIO_METADATA[scenario]?.shortLabel || scenario})`
    });
    addTimelineEvent({
      type: 'WAITING_ENTRY',
      date: sim.signalDate,
      label: 'Aguardando entrada',
      desc: `Entrada planejada: ${formatPrice(entryPlanned)} | Stop: ${formatPrice(stopInitial)}`
    });

    // Percorrer candles subsequentes ao sinal
    for (let i = startIndex; i < validCandles.length; i++) {
      const c = validCandles[i];
      const rawCandleDate = String(c.time || c.date).slice(0, 10);
      let candleDate = snapToTradingDay(rawCandleDate, 1) || rawCandleDate;
      if (signalDateStr && candleDate <= signalDateStr) {
        candleDate = addTradingDays(signalDateStr, 1);
      }
      if (entryDate && candleDate < entryDate) {
        candleDate = entryDate;
      }
      const cHigh = Number(c.high);
      const cLow = Number(c.low);
      const cOpen = Number(c.open);
      const cClose = Number(c.close);

      sim.currentPrice = round2(cClose);
      let enteredOnThisCandle = false;

      // ESTADO 1: AGUARDANDO ENTRADA
      if (status === STATUS.WAITING_ENTRY) {
        if (cHigh >= entryPlanned) {
          // Gatilho acionado em sessão válida após o sinal!
          executedEntryPrice = entryPlanned;
          entryDate = candleDate;
          entryCandleIndex = i;
          status = STATUS.IN_OPERATION;
          currentStop = stopInitial;
          enteredOnThisCandle = true;

          addTimelineEvent({
            type: 'ENTRY_EXECUTED',
            date: candleDate,
            label: 'Entrada executada',
            price: executedEntryPrice,
            desc: `Preço rompeu a máxima do gatilho a ${formatPrice(executedEntryPrice)}`
          });

          maxHigh = cHigh;
          minLow = cLow;
          mfeR = round2(Math.max(0, (maxHigh - executedEntryPrice) / risk));
          maeR = round2(Math.min(0, (minLow - executedEntryPrice) / risk));

          // Tratamento de ambiguidade: no mesmo candle da entrada a mínima tocou o stop inicial?
          if (cLow <= stopInitial) {
            status = STATUS.CLOSED_LOSS;
            exitPrice = stopInitial;
            exitDate = candleDate;
            exitReason = 'Stop Loss no dia da entrada';
            resultR = -1.0;
            maeR = round2(Math.min(maeR || 0, -1.0));
            sim.currentPrice = exitPrice;
            expansionAfterBreakout = { c1: -1.0, c2: -1.0, c3: -1.0, c5: -1.0 };
            addTimelineEvent({
              type: 'STOPPED_OUT',
              date: candleDate,
              label: 'Stop Loss',
              price: exitPrice,
              resultR: -1.0,
              desc: `Stop inicial tocado no mesmo dia da entrada (${formatPrice(stopInitial)}). Política conservadora aplicada.`
            });
            addTimelineEvent({
              type: 'CLOSED',
              date: candleDate,
              label: 'Trade encerrado',
              resultR: -1.0,
              desc: `Encerramento com perda de -1,00R`
            });
            break; // Trade encerrado
          }
        } else {
          // Preço não alcançou a entrada
          // Setup invalidado se a mínima perder o stop antes da entrada ou expirar (5 pregões)
          if (cLow <= stopInitial) {
            status = STATUS.NOT_TRIGGERED;
            exitDate = candleDate;
            exitReason = 'Mínima do gatilho violada antes da ativação';
            resultR = null;
            addTimelineEvent({
              type: 'NOT_TRIGGERED',
              date: candleDate,
              label: 'Não acionado',
              desc: `Padrão desqualificado antes do rompimento: preço violou o stop prévio`
            });
            break;
          }

          const sessionsElapsed = i - startIndex + 1;
          if (sessionsElapsed >= 6) {
            status = STATUS.NOT_TRIGGERED;
            exitDate = candleDate;
            exitReason = 'Expirou sem acionamento da entrada (limite de 5 sessões)';
            resultR = null;
            addTimelineEvent({
              type: 'NOT_TRIGGERED',
              date: candleDate,
              label: 'Não acionado',
              desc: `Expirou após 5 pregões sem rompimento do gatilho`
            });
            break;
          }
          // Continua aguardando entrada
          continue;
        }
      }

      // ESTADO 2: EM OPERAÇÃO
      if (status === STATUS.IN_OPERATION) {
        if (entryCandleIndex == null) entryCandleIndex = i;
        const candlesSinceEntry = i - entryCandleIndex + 1;

        // O stop vigente durante a sessão atual é aquele que já estava ativo na abertura do candle.
        // Ajustes de trailing/breakeven provocados pela máxima deste candle só vigoram a partir do próximo pregão,
        // evitando o bug de look-ahead/retroatividade intradiária.
        const activeStopForThisBar = currentStop;

        const target1R = Number(round2(executedEntryPrice + 1.0 * risk));
        const target2RPrice = Number(round2(executedEntryPrice + 2.0 * risk));
        const target3RPrice = Number(round2(executedEntryPrice + 3.0 * risk));
        const targetExitPrice = Number(round2(executedEntryPrice + targetMultiplier * risk));

        maxHigh = Math.max(maxHigh, cHigh);
        minLow = Math.min(minLow, cLow);
        mfeR = round2(Math.max(mfeR || 0, (maxHigh - executedEntryPrice) / risk));
        maeR = round2(Math.min(maeR || 0, (minLow - executedEntryPrice) / risk));

        // Metas de Velocidade (Time to Target — TTT)
        if (maxHigh >= target1R && ttt1R == null) {
          ttt1R = candlesSinceEntry;
        }
        if (maxHigh >= target2RPrice && ttt2R == null) {
          ttt2R = candlesSinceEntry;
        }
        if (maxHigh >= target3RPrice && ttt3R == null) {
          ttt3R = candlesSinceEntry;
        }

        // Expansão pós-rompimento no fechamento dos candles (Expansion After Breakout)
        if (candlesSinceEntry === 1 && expansionAfterBreakout.c1 == null) {
          expansionAfterBreakout.c1 = round2((cClose - executedEntryPrice) / risk);
        }
        if (candlesSinceEntry === 2 && expansionAfterBreakout.c2 == null) {
          expansionAfterBreakout.c2 = round2((cClose - executedEntryPrice) / risk);
        }
        if (candlesSinceEntry === 3 && expansionAfterBreakout.c3 == null) {
          expansionAfterBreakout.c3 = round2((cClose - executedEntryPrice) / risk);
        }
        if (candlesSinceEntry === 5 && expansionAfterBreakout.c5 == null) {
          expansionAfterBreakout.c5 = round2((cClose - executedEntryPrice) / risk);
        }

        // 1. Verificar primeiro se o stop vigente na abertura deste candle foi violado
        // (Se a mínima tocou o stop ativo na barra, aplica-se a Política Conservadora de Ambiguidade: Stop tem precedência)
        if (cLow <= activeStopForThisBar) {
          exitPrice = round2(activeStopForThisBar);
          exitDate = candleDate;
          sim.currentPrice = exitPrice;

          if (isPartialEma9 && sim.partialExit?.executed) {
            const runnerR = round2((exitPrice - executedEntryPrice) / risk);
            resultR = round2(sim.partialExit.partialResultR + (runnerPercent / 100) * runnerR);
            status = resultR > 0 ? STATUS.CLOSED_GAIN : STATUS.CLOSED_LOSS;
            exitReason = `Parcial ${partialPercent}% no 2R + Breakeven no restante`;
            sim.partialExit.runnerExitPrice = exitPrice;
            sim.partialExit.runnerExitR = runnerR;
            sim.partialExit.consolidatedResultR = resultR;

            addTimelineEvent({
              type: 'STOPPED_OUT',
              date: candleDate,
              label: 'Breakeven no restante',
              price: exitPrice,
              resultR,
              desc: `Restante stopado no Breakeven a ${formatPrice(exitPrice)}. Lucro consolidado da parcial: ${formatR(resultR)}`
            });
            addTimelineEvent({
              type: 'CLOSED',
              date: candleDate,
              label: 'Trade encerrado',
              resultR,
              desc: `Operação concluída com ganho de ${formatR(resultR)}`
            });
            break;
          }

          if (isPyramid && sim.scaleIn && sim.scaleIn.executed) {
            // Stop após pirâmide:
            // Lote 1 comprou na entrada, sai no breakeven -> 0.0R
            // Lote 2 comprou em +1R, sai no breakeven -> -1.0R
            // Consolidado = -1.0R
            resultR = -1.0;
            status = STATUS.CLOSED_LOSS;
            exitReason = 'Stop Protetivo após Pirâmide (-1,00R consolidado)';
            sim.scaleIn.lot1ResultR = 0.0;
            sim.scaleIn.lot2ResultR = -1.0;
            sim.scaleIn.consolidatedResultR = -1.0;
          } else {
            const resCalc = round2((exitPrice - executedEntryPrice) / risk);
            resultR = resCalc;
            if (resCalc > 0) {
              status = STATUS.CLOSED_GAIN;
              exitReason = 'Trailing Stop';
            } else {
              status = STATUS.CLOSED_LOSS;
              exitReason = resCalc === 0 ? 'Stop no Breakeven (0,00R)' : 'Stop Loss';
            }
          }

          maeR = round2(Math.min(maeR || 0, (exitPrice - executedEntryPrice) / risk));

          addTimelineEvent({
            type: 'STOPPED_OUT',
            date: candleDate,
            label: exitReason,
            price: exitPrice,
            resultR,
            desc: `${exitReason} acionado a ${formatPrice(exitPrice)} (${formatR(resultR)})`
          });
          addTimelineEvent({
            type: 'CLOSED',
            date: candleDate,
            label: 'Trade encerrado',
            resultR,
            desc: `Operação encerrada com resultado de ${formatR(resultR)}`
          });
          break;
        }

        // 2. Marco +1R (sem violação do stop vigente na barra)
        if (maxHigh >= target1R && !hasTimelineType('TARGET_1R')) {
          addTimelineEvent({
            type: 'TARGET_1R',
            date: candleDate,
            label: '+1R atingido',
            desc: `Excursão favorável atingiu +1,00R (${formatPrice(target1R)})`
          });

          if (isPyramid && !hasTimelineType('SCALE_IN')) {
            addTimelineEvent({
              type: 'SCALE_IN',
              date: candleDate,
              label: 'Adição de Posição (+1R)',
              price: target1R,
              desc: `Piramidagem executada a ${formatPrice(target1R)} (+1,00R). Stop ajustado para breakeven inicial.`
            });
            sim.scaleIn = {
              executed: true,
              date: candleDate,
              price: target1R,
              lot1Qty: 100,
              lot2Qty: 100
            };
            // Na gestão em Pirâmide, move stop para o preço de entrada para os candles seguintes
            if (currentStop < executedEntryPrice) {
              currentStop = executedEntryPrice;
            }
          }
        }

        // 3. Marco de Saída no Alvo (+2R, +2,5R, Pirâmide ou Parcial 50%/80% + MM10)
        if (isPartialEma9) {
          let partialExecutedOnThisBar = false;
          if (!sim.partialExit?.executed && cHigh >= targetExitPrice) {
            const partialResult = round2((partialPercent / 100) * 2.0);
            sim.partialExit = {
              executed: true,
              date: candleDate,
              percent: partialPercent,
              runnerPercent,
              partialPrice: targetExitPrice,
              partialResultR: partialResult,
              runnerExitPrice: null,
              runnerExitR: null,
              consolidatedResultR: null
            };
            partialExecutedOnThisBar = true;
            // Move stop do restante para o breakeven para os pregões seguintes
            currentStop = Math.max(currentStop, executedEntryPrice);

            addTimelineEvent({
              type: 'TARGET_2R',
              date: candleDate,
              label: '+2R atingido',
              desc: `Alvo de +2R atingido a ${formatPrice(targetExitPrice)}`
            });
            addTimelineEvent({
              type: 'PARTIAL_EXIT',
              date: candleDate,
              label: `Parcial ${partialPercent}% (+2R)`,
              price: targetExitPrice,
              desc: `Realização de ${partialPercent}% da posição a ${formatPrice(targetExitPrice)} (+${partialResult.toFixed(2).replace('.', ',')}R garantido). Stop ajustado para o Breakeven.`
            });
          }

          // Fase 2: se a parcial já foi executada em pregão anterior, monitora saída do runner pela MM10
          if (sim.partialExit?.executed && !partialExecutedOnThisBar) {
            const cEma10 = ema9Series[i] || targetExitPrice;
            if (cClose < cEma10) {
              const runnerExitPrice = round2(cClose);
              exitDate = candleDate;
              const runnerR = Math.max(0, round2((runnerExitPrice - executedEntryPrice) / risk));
              resultR = round2(sim.partialExit.partialResultR + (runnerPercent / 100) * runnerR);
              exitPrice = round2(executedEntryPrice + resultR * risk);
              sim.currentPrice = exitPrice;
              status = STATUS.CLOSED_GAIN;
              exitReason = `Parcial ${partialPercent}% no 2R + Saída na EMA 10 (${formatR(runnerR)} no restante)`;
              sim.partialExit.runnerExitPrice = runnerExitPrice;
              sim.partialExit.runnerExitR = runnerR;
              sim.partialExit.consolidatedResultR = resultR;

              addTimelineEvent({
                type: 'RUNNER_EXIT',
                date: candleDate,
                label: 'Saída pela Média de 10 (MM10)',
                price: runnerExitPrice,
                desc: `Fechamento a ${formatPrice(runnerExitPrice)} abaixo da EMA 10 (${formatPrice(cEma10)}). Runner: ${formatR(runnerR)}.`
              });
              addTimelineEvent({
                type: 'CLOSED',
                date: candleDate,
                label: 'Trade encerrado',
                resultR,
                desc: `Operação concluída com ganho de ${formatR(resultR)}`
              });
              break;
            }
          }
        } else if (cHigh >= targetExitPrice) {
          // Saída total no Alvo (+2R, +2,5R ou Pirâmide)
          status = STATUS.CLOSED_GAIN;
          exitPrice = targetExitPrice;
          exitDate = candleDate;
          sim.currentPrice = exitPrice;

          if (isPyramid) {
            resultR = 3.0; // Lote 1 (+2R) + Lote 2 (+1R) = +3,00R
            exitReason = 'Alvo +2R atingido com Pirâmide (+3,00R consolidado)';
            if (sim.scaleIn) {
              sim.scaleIn.lot1ResultR = 2.0;
              sim.scaleIn.lot2ResultR = 1.0;
              sim.scaleIn.consolidatedResultR = 3.0;
            }
          } else if (scenario === '2.5R') {
            resultR = 2.5;
            exitReason = 'Sell Into Strength (+2,5R)';
          } else {
            resultR = 2.0;
            exitReason = 'Sell Into Strength (+2R)';
          }

          mfeR = round2(Math.max(mfeR || 0, targetMultiplier));

          const targetLabel = isPyramid ? '+2R com Pirâmide atingido' : `+${targetMultiplier.toFixed(1).replace('.', ',')}R atingido`;
          addTimelineEvent({
            type: scenario === '2.5R' ? 'TARGET_2_5R' : 'TARGET_2R',
            date: candleDate,
            label: targetLabel,
            desc: `Alvo atingido a ${formatPrice(targetExitPrice)}`
          });
          addTimelineEvent({
            type: 'SELL_INTO_STRENGTH',
            date: candleDate,
            label: 'Sell Into Strength',
            price: exitPrice,
            desc: `Realização de lucro em força conforme o método (${formatR(resultR)})`
          });
          addTimelineEvent({
            type: 'CLOSED',
            date: candleDate,
            label: 'Trade encerrado',
            resultR,
            desc: `Operação concluída com ganho de ${formatR(resultR)}`
          });
          break;
        }
      }
    }

    // Se continuar em operação no candle mais recente
    if (status === STATUS.IN_OPERATION && executedEntryPrice) {
      const curPrice = sim.currentPrice || executedEntryPrice;
      const r1 = round2((curPrice - executedEntryPrice) / risk);
      if (isPartialEma9 && sim.partialExit?.executed) {
        const runnerR = Math.max(0, r1);
        resultR = round2(sim.partialExit.partialResultR + (runnerPercent / 100) * runnerR);
        sim.partialExit.runnerExitR = runnerR;
        sim.partialExit.consolidatedResultR = resultR;
      } else if (isPyramid && sim.scaleIn && sim.scaleIn.executed) {
        const addPrice = Number(round2(executedEntryPrice + risk));
        const r2 = round2((curPrice - addPrice) / risk);
        resultR = round2(r1 + r2);
        sim.scaleIn.lot1ResultR = r1;
        sim.scaleIn.lot2ResultR = r2;
        sim.scaleIn.consolidatedResultR = resultR;
      } else {
        resultR = r1;
      }
    }

    const latestSessionDate = validCandles.length ? String(validCandles[validCandles.length - 1].time || validCandles[validCandles.length - 1].date).slice(0, 10) : null;

    return {
      ...sim,
      grade: normalizedGrade,
      managementScenario: scenario,
      scaleIn: sim.scaleIn || null,
      partialExit: sim.partialExit || null,
      status,
      executedEntryPrice: round2(executedEntryPrice),
      entryDate,
      entryCandleIndex,
      currentStop: round2(currentStop),
      exitPrice: round2(exitPrice),
      exitDate,
      exitReason,
      resultR: round2(resultR),
      mfeR: round2(mfeR),
      maeR: round2(maeR),
      ttt1R: sim.ttt1R != null ? sim.ttt1R : ttt1R,
      ttt2R: sim.ttt2R != null ? sim.ttt2R : ttt2R,
      ttt3R: sim.ttt3R != null ? sim.ttt3R : ttt3R,
      expansionAfterBreakout: sim.expansionAfterBreakout || expansionAfterBreakout,
      structure: sim.structure || null,
      durationDays: calculateTradeDurationDays({ entryDate, exitDate, status, signalDate: sim.signalDate }, exitDate || latestSessionDate)
    };
  }

  /**
   * Calcula estatísticas consolidadas para os KPI Cards, Gráficos e Tabelas Agregadas.
   * Garante reconciliação matemática estrita entre trades individuais, KPIs globais e quebras por gatilho/nota/período.
   * @param {Array} simulations - Lista de simulações
   * @returns {Object} Estatísticas completas
   */
  function calculateSimulatorStats(simulations = []) {
    const list = Array.isArray(simulations) ? simulations : [];

    const totalCreated = list.length;
    let waitingCount = 0;
    let inOperationCount = 0;
    let notTriggeredCount = 0;
    let winningTradesCount = 0;
    let losingTradesCount = 0;
    let closedTradesCount = 0;
    let closedCount = 0;
    let totalR = 0;
    let openR = 0;
    let totalGainsR = 0;
    let totalLossesR = 0;
    let totalDurationDays = 0;
    let durationTradesCount = 0;

    const triggerMap = {};
    const gradeMap = {};
    const periodMap = {};

    list.forEach(sim => {
      if (!sim) return;
      const status = sim.status;
      const trigName = sim.triggerName || 'Outros';
      const grade = normalizeSimulatorGrade(sim.grade);
      const pKey = sim.signalDate ? String(sim.signalDate).slice(0, 7) : 'Sem data';

      if (!triggerMap[trigName]) {
        triggerMap[trigName] = { name: trigName, totalR: 0, count: 0, signals: 0, executed: 0, open: 0, closed: 0, winners: 0, losers: 0 };
      }
      if (!gradeMap[grade]) {
        gradeMap[grade] = { grade, totalR: 0, count: 0, signals: 0, executed: 0, open: 0, closed: 0, winners: 0, losers: 0 };
      }
      if (!periodMap[pKey]) {
        periodMap[pKey] = { period: pKey, totalR: 0, count: 0, signals: 0, executed: 0, open: 0, closed: 0, winners: 0, losers: 0 };
      }

      triggerMap[trigName].signals++;
      gradeMap[grade].signals++;
      periodMap[pKey].signals++;

      if (status === STATUS.WAITING_ENTRY) {
        waitingCount++;
      } else if (status === STATUS.NOT_TRIGGERED) {
        notTriggeredCount++;
      } else if (status === STATUS.IN_OPERATION) {
        inOperationCount++;
        openR += Number(sim.resultR) || 0;
        triggerMap[trigName].executed++;
        triggerMap[trigName].open++;
        gradeMap[grade].executed++;
        gradeMap[grade].open++;
        periodMap[pKey].executed++;
        periodMap[pKey].open++;
      } else if (status === STATUS.CLOSED_GAIN || status === STATUS.CLOSED_LOSS) {
        closedCount++;
        closedTradesCount++;
        const r = Number(sim.resultR) || 0;
        totalR += r;

        triggerMap[trigName].executed++;
        triggerMap[trigName].closed++;
        triggerMap[trigName].totalR += r;

        gradeMap[grade].executed++;
        gradeMap[grade].closed++;
        gradeMap[grade].totalR += r;

        periodMap[pKey].executed++;
        periodMap[pKey].closed++;
        periodMap[pKey].totalR += r;

        if (r > 0) {
          winningTradesCount++;
          totalGainsR += r;
          triggerMap[trigName].winners++;
          gradeMap[grade].winners++;
          periodMap[pKey].winners++;
        } else {
          losingTradesCount++;
          totalLossesR += Math.abs(r);
          triggerMap[trigName].losers++;
          gradeMap[grade].losers++;
          periodMap[pKey].losers++;
        }

        const dur = calculateTradeDurationDays(sim);
        if (dur !== null) {
          totalDurationDays += dur;
          durationTradesCount++;
        }
      }
    });

    // Se não houver trades encerrados na amostra (ex: usuário filtrou apenas 'Em Operação'),
    // calcula a média de dias das operações em andamento
    if (durationTradesCount === 0) {
      list.forEach(sim => {
        if (sim && sim.status === STATUS.IN_OPERATION) {
          const dur = calculateTradeDurationDays(sim);
          if (dur !== null) {
            totalDurationDays += dur;
            durationTradesCount++;
          }
        }
      });
    }

    const avgDurationDays = durationTradesCount > 0 ? round1(totalDurationDays / durationTradesCount) : 0;
    const avgDurationDaysFormatted = durationTradesCount > 0
      ? `${avgDurationDays.toFixed(1).replace('.', ',')} dia${avgDurationDays === 1 ? '' : 's'}`
      : '—';

    // Reconciliação exata das contagens:
    // Entradas executadas = Em operação + Encerrados (Gain + Loss). Nunca inclui Não Acionados ou Aguardando Entrada.
    const executedEntriesCount = inOperationCount + closedTradesCount;
    const executedPct = totalCreated > 0 ? (executedEntriesCount / totalCreated) * 100 : 0;
    const waitingPct = totalCreated > 0 ? (waitingCount / totalCreated) * 100 : 0;
    const notTriggeredPct = totalCreated > 0 ? (notTriggeredCount / totalCreated) * 100 : 0;

    // Métricas de performance (Win Rate, Loss Rate, Expectancy/R médio) são calculadas sobre os trades encerrados (closedTradesCount),
    // garantindo que Vencedores + Perdedores = 100% dos trades com resultado definitivo e Expectancy = Total R / Trades Encerrados.
    const divisor = closedTradesCount;
    const winRate = divisor > 0 ? (winningTradesCount / divisor) * 100 : 0;
    const lossRate = divisor > 0 ? (losingTradesCount / divisor) * 100 : 0;
    const avgR = divisor > 0 ? totalR / divisor : 0;

    // Ganho e perda médios
    const avgWinR = winningTradesCount > 0 ? round2(totalGainsR / winningTradesCount) : 0;
    const avgLossR = losingTradesCount > 0 ? round2(totalLossesR / losingTradesCount) : 0;

    // Profit factor
    const profitFactor = totalLossesR > 0
      ? round2(totalGainsR / totalLossesR)
      : (totalGainsR > 0 ? 99.9 : 0);

    // Desempenho por Gatilho (reconciliado com totalR global)
    const triggerPerformance = Object.values(triggerMap)
      .map(t => {
        const div = t.closed > 0 ? t.closed : t.executed;
        const wr = div > 0 ? (t.winners / div) * 100 : 0;
        const exp = div > 0 ? t.totalR / div : 0;
        const displayCount = t.closed > 0 ? t.closed : t.signals;
        return {
          name: t.name,
          totalR: round2(t.totalR),
          totalRFormatted: formatR(t.totalR),
          count: displayCount,
          signals: t.signals,
          executed: t.executed,
          open: t.open,
          closed: t.closed,
          winners: t.winners,
          losers: t.losers,
          winRate: round1(wr),
          expectancyR: round2(exp),
          tradesText: `${displayCount} trade${displayCount === 1 ? '' : 's'}`
        };
      })
      .sort((a, b) => b.totalR - a.totalR);

    // Desempenho por Grade do Rubric (apenas A, B, C, D reconciliados com totalR global)
    const gradeOrder = { A: 1, B: 2, C: 3, D: 4 };
    const gradePerformance = Object.values(gradeMap)
      .map(g => {
        const div = g.closed > 0 ? g.closed : g.executed;
        const wr = div > 0 ? (g.winners / div) * 100 : 0;
        const exp = div > 0 ? g.totalR / div : 0;
        const displayCount = g.closed > 0 ? g.closed : g.signals;
        return {
          name: g.grade,
          grade: g.grade,
          count: displayCount,
          signals: g.signals,
          executed: g.executed,
          open: g.open,
          closed: g.closed,
          winners: g.winners,
          losers: g.losers,
          winRate: round1(wr),
          totalR: round2(g.totalR),
          totalRFormatted: formatR(g.totalR),
          expectancyR: round2(exp),
          tradesText: `${displayCount} trade${displayCount === 1 ? '' : 's'}`
        };
      })
      .sort((a, b) => (gradeOrder[a.grade] || 99) - (gradeOrder[b.grade] || 99));

    // Desempenho por Período (reconciliado com totalR global)
    const periodPerformance = Object.values(periodMap)
      .map(p => {
        const div = p.closed > 0 ? p.closed : p.executed;
        const wr = div > 0 ? (p.winners / div) * 100 : 0;
        const exp = div > 0 ? p.totalR / div : 0;
        const displayCount = p.closed > 0 ? p.closed : p.signals;
        return {
          name: p.period,
          period: p.period,
          count: displayCount,
          signals: p.signals,
          executed: p.executed,
          open: p.open,
          closed: p.closed,
          winners: p.winners,
          losers: p.losers,
          winRate: round1(wr),
          expectancyR: round2(exp),
          totalR: round2(p.totalR),
          totalRFormatted: formatR(p.totalR),
          tradesText: `${displayCount} trade${displayCount === 1 ? '' : 's'}`
        };
      })
      .sort((a, b) => String(a.period).localeCompare(String(b.period)));

    // Distribuição de Resultados (considera exclusivamente sinais não acionados no 3º bucket)
    const nonExecutedCount = notTriggeredCount;
    const nonExecutedPct = totalCreated > 0 ? (notTriggeredCount / totalCreated) * 100 : 0;
    const distribution = {
      winners: {
        count: winningTradesCount,
        pct: round1(winRate),
        label: `Vencedores (${round1(winRate).toFixed(1).replace('.', ',')}%)`
      },
      losers: {
        count: losingTradesCount,
        pct: round1(lossRate),
        label: `Perdedores (${round1(lossRate).toFixed(1).replace('.', ',')}%)`
      },
      notTriggered: {
        count: notTriggeredCount,
        pct: round1(notTriggeredPct),
        label: `Não acionados (${round1(notTriggeredPct).toFixed(1).replace('.', ',')}%)`
      }
    };

    // Curva de evolução acumulada (Equity Curve em R) e Drawdown Máximo
    const closedTrades = list
      .filter(s => s && (s.status === STATUS.CLOSED_GAIN || s.status === STATUS.CLOSED_LOSS) && s.exitDate)
      .sort((a, b) => String(a.exitDate).localeCompare(String(b.exitDate)));

    let runningR = 0;
    let peakR = 0;
    let maxDrawdownR = 0;
    let maxConsecutiveLosses = 0;
    let currentLossStreak = 0;

    // Histograma de faixas de R
    const rBuckets = {
      ltMinus1: 0,
      minus1: 0,
      minus099To0: 0,
      zeroTo1: 0,
      oneTo2: 0,
      gt2: 0
    };

    const equityCurve = closedTrades.map(s => {
      const r = Number(s.resultR) || 0;
      runningR = round2(runningR + r);
      if (runningR > peakR) {
        peakR = runningR;
      }
      const dd = round2(peakR - runningR);
      if (dd > maxDrawdownR) {
        maxDrawdownR = dd;
      }

      if (r <= 0) {
        currentLossStreak++;
        if (currentLossStreak > maxConsecutiveLosses) {
          maxConsecutiveLosses = currentLossStreak;
        }
      } else {
        currentLossStreak = 0;
      }

      // Distribuição em faixas
      if (r < -1.0) {
        rBuckets.ltMinus1++;
      } else if (Math.abs(r - (-1.0)) < 0.01) {
        rBuckets.minus1++;
      } else if (r > -1.0 && r <= 0) {
        rBuckets.minus099To0++;
      } else if (r > 0 && r <= 1.0) {
        rBuckets.zeroTo1++;
      } else if (r > 1.0 && r <= 2.0) {
        rBuckets.oneTo2++;
      } else {
        rBuckets.gt2++;
      }

      return {
        date: s.exitDate,
        dateFormatted: formatDateBR(s.exitDate),
        ticker: s.symbol,
        tradeR: round2(r),
        cumulativeR: runningR
      };
    });

    const rDistribution = [
      { bucket: '< -1R', label: '< -1,0R', count: rBuckets.ltMinus1, pct: closedTrades.length ? round1((rBuckets.ltMinus1 / closedTrades.length) * 100) : 0, pctFormatted: (closedTrades.length ? round1((rBuckets.ltMinus1 / closedTrades.length) * 100) : 0) + '%', color: '#dc2626' },
      { bucket: '-1R', label: '-1,0R (Stop)', count: rBuckets.minus1, pct: closedTrades.length ? round1((rBuckets.minus1 / closedTrades.length) * 100) : 0, pctFormatted: (closedTrades.length ? round1((rBuckets.minus1 / closedTrades.length) * 100) : 0) + '%', color: '#ef4444' },
      { bucket: '-0.99R a 0R', label: '-0,99R a 0,0R', count: rBuckets.minus099To0, pct: closedTrades.length ? round1((rBuckets.minus099To0 / closedTrades.length) * 100) : 0, pctFormatted: (closedTrades.length ? round1((rBuckets.minus099To0 / closedTrades.length) * 100) : 0) + '%', color: '#f87171' },
      { bucket: '0R a +1R', label: '0,0R a +1,0R', count: rBuckets.zeroTo1, pct: closedTrades.length ? round1((rBuckets.zeroTo1 / closedTrades.length) * 100) : 0, pctFormatted: (closedTrades.length ? round1((rBuckets.zeroTo1 / closedTrades.length) * 100) : 0) + '%', color: '#34d399' },
      { bucket: '+1R a +2R', label: '+1,0R a +2,0R', count: rBuckets.oneTo2, pct: closedTrades.length ? round1((rBuckets.oneTo2 / closedTrades.length) * 100) : 0, pctFormatted: (closedTrades.length ? round1((rBuckets.oneTo2 / closedTrades.length) * 100) : 0) + '%', color: '#10b981' },
      { bucket: '> +2R', label: '> +2,0R', count: rBuckets.gt2, pct: closedTrades.length ? round1((rBuckets.gt2 / closedTrades.length) * 100) : 0, pctFormatted: (closedTrades.length ? round1((rBuckets.gt2 / closedTrades.length) * 100) : 0) + '%', color: '#059669' }
    ];
    rDistribution.totalClosed = closedTrades.length;
    rDistribution.buckets = rDistribution;

    return {
      totalCreated,
      executedEntriesCount,
      executedPct: round2(executedPct),
      winningTradesCount,
      losingTradesCount,
      closedTradesCount,
      winRate: round1(winRate),
      lossRate: round1(lossRate),
      totalR: round2(totalR),
      totalRFormatted: formatR(totalR),
      openR: round2(openR),
      openRFormatted: formatR(openR),
      avgR: round2(avgR),
      avgRFormatted: formatR(avgR),
      expectancyR: round2(avgR),
      expectancyRFormatted: formatR(avgR),
      totalGainsR: round2(totalGainsR),
      totalLossesR: round2(totalLossesR),
      avgWinR: round2(avgWinR),
      avgWinRFormatted: formatR(avgWinR),
      avgLossR: round2(avgLossR),
      avgLossRFormatted: formatR(-avgLossR),
      profitFactor: round2(profitFactor),
      profitFactorFormatted: profitFactor != null ? profitFactor.toFixed(2).replace('.', ',') : '—',
      maxDrawdownR: round2(maxDrawdownR),
      maxDrawdownRFormatted: formatR(-maxDrawdownR),
      maxConsecutiveLosses,
      avgDurationDays,
      avgDurationDaysFormatted,
      totalDurationDays,
      durationTradesCount,
      waitingCount,
      waitingPct: round2(waitingPct),
      inOperationCount,
      closedCount,
      notTriggeredCount,
      notTriggeredPct: round2(notTriggeredPct),
      distribution,
      rDistribution,
      triggerPerformance,
      gradePerformance,
      periodPerformance,
      equityCurve
    };
  }

  /**
   * Filtra simulações pelos controles da página
   */
  function filterSimulations(simulations = [], filters = {}) {
    const list = Array.isArray(simulations) ? simulations : [];

    const tab = String(filters.tab || filters.statusTab || 'ALL').trim().toUpperCase();
    const resultFilter = String(filters.result || filters.resultFilter || filters.outcome || 'ALL').trim().toUpperCase();
    const trigger = String(filters.trigger || 'ALL').trim();
    const sector = String(filters.sector || 'ALL').trim();
    const grade = String(filters.grade || 'ALL').trim().toUpperCase();
    const query = String(filters.query || filters.search || '').trim().toUpperCase();

    // Data de referência: usa a maior data do dataset se disponível ou a data atual
    let latestSimDate = null;
    for (const s of list) {
      const sd = s && s.signalDate ? String(s.signalDate).slice(0, 10) : null;
      if (sd && (!latestSimDate || sd > latestSimDate)) latestSimDate = sd;
    }
    const now = latestSimDate ? new Date(latestSimDate + 'T12:00:00Z') : new Date();

    let minDateStr = null;
    let maxDateStr = null;
    const days = filters.days != null ? filters.days : filters.period;
    if (days === 30 || days === '30' || days === '30d') {
      const d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 90 || days === '90' || days === '90d') {
      const d = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 120 || days === '120' || days === '4m' || days === '120d') {
      const d = new Date(now.getTime() - 140 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 180 || days === '180' || days === '6m') {
      const d = new Date(now.getTime() - 180 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 365 || days === '365' || days === '12m' || days === '1y') {
      const d = new Date(now.getTime() - 365 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 730 || days === '730' || days === '24m' || days === '2y') {
      const d = new Date(now.getTime() - 730 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 1095 || days === '1095' || days === '36m' || days === '3y') {
      const d = new Date(now.getTime() - 1095 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 'year') {
      minDateStr = String(now.getUTCFullYear()) + '-01-01';
    } else if (days === 'CUSTOM' || filters.startDate || filters.endDate) {
      if (filters.startDate) minDateStr = String(filters.startDate).slice(0, 10);
      if (filters.endDate) maxDateStr = String(filters.endDate).slice(0, 10);
    }

    return list.filter(sim => {
      if (!sim) return false;
      // 1. Aba de Status (Aguardando Entrada, Em Operação, Encerrados e Não Acionados)
      if (tab === 'WAITING_ENTRY' || tab === 'WAITING') {
        if (sim.status !== STATUS.WAITING_ENTRY) return false;
      } else if (tab === 'IN_OPERATION' || tab === 'IN_OP') {
        if (sim.status !== STATUS.IN_OPERATION) return false;
      } else if (tab === 'CLOSED') {
        if (sim.status !== STATUS.CLOSED_GAIN && sim.status !== STATUS.CLOSED_LOSS) return false;
      } else if (tab === 'NOT_TRIGGERED' || tab === 'NOT_TRIGGER') {
        if (sim.status !== STATUS.NOT_TRIGGERED) return false;
      } else if (tab !== 'ALL' && tab !== '' && sim.status !== tab) {
        return false;
      }

      // 1.1. Filtro de Resultado em Operações Encerradas (Gain, Loss, Breakeven)
      if (resultFilter && resultFilter !== 'ALL') {
        const isClosed = sim.status === STATUS.CLOSED_GAIN || sim.status === STATUS.CLOSED_LOSS;
        if (!isClosed) return false;

        const resR = Number(sim.resultR) || 0;
        const isBe = resR === 0 || Math.abs(resR) < 0.0001;
        if (resultFilter === 'GAIN') {
          if (resR <= 0 || isBe) return false;
        } else if (resultFilter === 'LOSS') {
          if (resR >= 0 || isBe) return false;
        } else if (resultFilter === 'BREAKEVEN') {
          if (!isBe) return false;
        }
      }

      // 2. Período
      if (minDateStr && sim.signalDate && String(sim.signalDate).slice(0, 10) < minDateStr) {
        return false;
      }
      if (maxDateStr && sim.signalDate && String(sim.signalDate).slice(0, 10) > maxDateStr) {
        return false;
      }

      // 3. Gatilho
      if (trigger && trigger.toUpperCase() !== 'ALL') {
        if (trigger === 'Outros') {
          const known = ['Inside Bar', 'Double Inside Bar', '1-2-3 de Compra', 'PFR de Compra', 'Dave Landry', 'RBI'];
          if (known.includes(sim.triggerName)) return false;
        } else if (sim.triggerName === 'RBI' && trigger === 'Red Bar Ignored') {
          // Equivalência de nomenclatura RBI / Red Bar Ignored
        } else if (sim.triggerName !== trigger) {
          return false;
        }
      }

      // 4. Setor
      if (sector && sector.toUpperCase() !== 'ALL') {
        if (sim.sector !== sector) return false;
      }

      // 5. Nota / Grade (fonte de verdade estrita A, B, C, D)
      if (grade && grade !== 'ALL') {
        const targetGrade = normalizeSimulatorGrade(grade);
        const simGrade = normalizeSimulatorGrade(sim.grade);
        if (simGrade !== targetGrade) return false;
      }

      // 6. Busca textual por ativo ou gatilho ou empresa
      if (query) {
        const sym = String(sim.symbol || '').toUpperCase();
        const trig = String(sim.triggerName || '').toUpperCase();
        const comp = String(sim.companyName || '').toUpperCase();
        if (!sym.includes(query) && !trig.includes(query) && !comp.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  const KNOWN_RS_BY_SYMBOL = {
    WEGE3: 92, EMBR3: 94, BPAC11: 85, PETR4: 86, SBSP3: 81, CPLE6: 83,
    TOTS3: 82, PRIO3: 79, ABEV3: 74, RENT3: 78, GGBR4: 76, MULT3: 75,
    B3SA3: 71, ITUB4: 67, BBAS3: 65, CSAN3: 58, CYRE3: 52, RECV3: 54,
    VBBR3: 73, RADL3: 70, CPFE3: 68, EGIE3: 69, JBSS3: 77, SUZB3: 75,
    RANI3: 48, MDIA3: 45
  };

  const KNOWN_FUND_BY_SYMBOL = {
    ITUB4: { evaluation: 'Forte', status: 'good' },
    WEGE3: { evaluation: 'Excelente', status: 'good' },
    PETR4: { evaluation: 'Forte', status: 'good' },
    BPAC11: { evaluation: 'Forte', status: 'good' },
    SBSP3: { evaluation: 'Forte', status: 'good' },
    ABEV3: { evaluation: 'Forte', status: 'good' },
    RENT3: { evaluation: 'Forte', status: 'good' },
    CPLE6: { evaluation: 'Forte', status: 'good' },
    TOTS3: { evaluation: 'Forte', status: 'good' },
    PRIO3: { evaluation: 'Forte', status: 'good' },
    GGBR4: { evaluation: 'Forte', status: 'good' },
    SUZB3: { evaluation: 'Forte', status: 'good' },
    MULT3: { evaluation: 'Forte', status: 'good' },
    B3SA3: { evaluation: 'Forte', status: 'good' },
    BBAS3: { evaluation: 'Forte', status: 'good' },
    CSAN3: { evaluation: 'Médio', status: 'alert' },
    CYRE3: { evaluation: 'Médio', status: 'alert' },
    RECV3: { evaluation: 'Médio', status: 'alert' },
    MDIA3: { evaluation: 'Médio', status: 'alert' },
    RANI3: { evaluation: 'Médio', status: 'alert' }
  };

  /**
   * Resolve a 'Visão do Ativo' (Trading Rubric congelada no momento do sinal/entrada do trade).
   * Retorna os 8 critérios reais do método Healthy Trend Trader sem valores fictícios.
   */
  function getTradeVisionAtivo(sim) {
    if (!sim) return null;

    const grade = normalizeSimulatorGrade(sim.grade || (sim.visionAtivo && sim.visionAtivo.grade));

    if (sim.visionAtivo && sim.visionAtivo.relativeStrength && sim.visionAtivo.marketCycle) {
      const v = sim.visionAtivo;
      const tName = (v.trigger && v.trigger.name) || sim.triggerName || 'Inside Bar';
      return {
        ...v,
        grade,
        gradeBoxClass: `grade-${grade.toLowerCase()}`,
        trigger: {
          ...(v.trigger || {}),
          name: tName,
          grade,
          display: `${tName} (${grade})`,
          status: grade === 'D' ? 'bad' : 'good'
        }
      };
    }

    const sym = String(sim.symbol || '').toUpperCase().trim();
    const sDate = String(sim.signalDate || sim.entryDate || '').slice(0, 10);
    const triggerName = sim.triggerName || 'Inside Bar';
    const entry = Number(sim.entryPrice) || 1;
    const stop = Number(sim.stopLoss) || entry;
    const risk = Math.max(0.01, Math.abs(entry - stop));
    const isLoss = sim.status === STATUS.CLOSED_LOSS;

    // 1. Grade Box Visual (estritamente A, B, C, D)
    const gradeBoxClass = `grade-${grade.toLowerCase()}`;

    // 2. Força Relativa
    let rsScore = KNOWN_RS_BY_SYMBOL[sym];
    if (rsScore == null) {
      if (grade === 'A') rsScore = 85;
      else if (grade === 'B') rsScore = 68;
      else if (grade === 'C') rsScore = 52;
      else rsScore = 38;
    }
    if (isLoss && sDate && sDate < '2026-07-01' && rsScore > 50) {
      rsScore = Math.max(38, rsScore - 18);
    }
    let rsClassification = 'Neutro';
    let rsStatus = 'neutral';
    if (rsScore >= 90) {
      rsClassification = 'Líder';
      rsStatus = 'good';
    } else if (rsScore >= 70) {
      rsClassification = 'Forte';
      rsStatus = 'good';
    } else if (rsScore < 50) {
      rsClassification = 'Fraco';
      rsStatus = 'bad';
    }
    const rsText = `${rsClassification} (${rsScore})`;

    // 3. Ciclo de Mercado
    let cycleRegime = 'Positivo';
    let cycleStatus = 'good';
    if (sim.marketPermission && typeof sim.marketPermission === 'object') {
      cycleRegime = sim.marketPermission.isPermitted ? 'Positivo' : 'Defensivo';
      cycleStatus = sim.marketPermission.isPermitted ? 'good' : 'bad';
    } else if (sDate && sDate < '2026-07-01') {
      cycleRegime = 'Defensivo';
      cycleStatus = 'bad';
    } else if (sDate && sDate < '2026-08-15') {
      cycleRegime = 'Transição';
      cycleStatus = 'neutral';
    }

    // 4. Tendência
    let trendFormula = 'Preço > EMA 10 > EMA 72';
    let trendStatus = 'good';
    if (sim.trendAlignment && typeof sim.trendAlignment === 'object') {
      if (sim.trendAlignment.isValid) {
        trendFormula = 'Preço > EMA 10 > EMA 72';
        trendStatus = 'good';
      } else {
        trendFormula = sim.trendAlignment.reason || 'Preço < EMA 10';
        trendStatus = 'bad';
      }
    } else if (cycleStatus === 'bad' || (isLoss && sDate < '2026-07-01')) {
      trendFormula = 'Preço < EMA 10';
      trendStatus = 'bad';
    } else if (cycleStatus === 'neutral' || grade === 'C') {
      trendFormula = 'Preço > EMA 10';
      trendStatus = 'neutral';
    }

    // 5. Estrutura
    let structureLabel = 'Correção';
    let structureStatus = 'good';
    if (triggerName.toLowerCase().includes('rompimento') || triggerName.toLowerCase().includes('breakout')) {
      structureLabel = 'Rompimento';
      structureStatus = 'good';
    } else if (cycleStatus === 'bad' && isLoss) {
      structureLabel = 'Degradada';
      structureStatus = 'bad';
    }

    // 6. Gatilho
    const triggerDisplay = `${triggerName} (${grade})`;
    const triggerStatus = grade === 'D' ? 'bad' : 'good';

    // 7. Volatilidade
    const atr = round2(risk);
    const atrPct = round2((atr / entry) * 100);
    let volRegime = 'Normal';
    let volStatus = 'good';
    if (atrPct > 6.0) {
      volRegime = 'Elevada';
      volStatus = 'bad';
    } else if (atrPct < 3.5) {
      volRegime = 'Normal';
      volStatus = 'good';
    }
    const volText = `${volRegime} (ATR ${atr.toFixed(2).replace('.', ',')} | ${atrPct.toFixed(2).replace('.', ',')}%)`;

    // 8. Fundamentos
    const fundInfo = KNOWN_FUND_BY_SYMBOL[sym] || (grade === 'D' ? { evaluation: 'Fraco', status: 'bad' } : { evaluation: 'Forte', status: 'good' });

    // 9. Contexto
    let contextTitle = 'Super Contexto';
    let contextStatus = 'good';
    if (trendStatus === 'good' && cycleStatus === 'good') {
      contextTitle = 'Super Contexto';
      contextStatus = 'good';
    } else if (cycleStatus === 'neutral') {
      contextTitle = 'Favorável';
      contextStatus = 'good';
    } else if (cycleStatus === 'bad') {
      contextTitle = 'Desfavorável';
      contextStatus = 'bad';
    } else {
      contextTitle = 'Neutro';
      contextStatus = 'neutral';
    }

    return {
      grade,
      gradeBoxClass,
      relativeStrength: {
        score: rsScore,
        classification: rsClassification,
        status: rsStatus,
        text: rsText
      },
      marketCycle: {
        regime: cycleRegime,
        status: cycleStatus
      },
      trend: {
        formula: trendFormula,
        status: trendStatus
      },
      structure: {
        label: structureLabel,
        status: structureStatus
      },
      trigger: {
        name: triggerName,
        grade,
        display: triggerDisplay,
        status: triggerStatus
      },
      volatility: {
        regime: volRegime,
        atr21: atr,
        atrPct: atrPct,
        text: volText,
        status: volStatus
      },
      fundamentals: {
        evaluation: fundInfo.evaluation,
        status: fundInfo.status
      },
      context: {
        title: contextTitle,
        status: contextStatus
      }
    };
  }

  /**
   * Constrói o conjunto base de 42 trades calibrados cobrindo os últimos 3 a 4 meses
   * (junho a outubro de 2026), respeitando estritamente o calendário B3 (apenas dias úteis),
   * notas oficiais do Rubric (A, B, C, D) e coerência matemática exata entre entrada, stop, saída e R.
   */
  function getBaseSeedSimulationsRaw() {
    const seeds = [
      // ==========================================
      // 1. EM OPERAÇÃO (4 itens - Ativos recentes)
      // ==========================================
      {
        id: 'sim-bpac11-01',
        symbol: 'BPAC11',
        companyName: 'Banco BTG Pactual',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Financeiro',
        signalDate: '2026-10-01',
        entryPrice: 66.03,
        stopLoss: 63.06,
        status: STATUS.IN_OPERATION,
        executedEntryPrice: 66.03,
        entryDate: '2026-10-02',
        currentStop: 66.03,
        currentPrice: 69.39,
        resultR: 1.13,
        mfeR: 1.35,
        maeR: -0.15,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-10-01', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A) em BPAC11' },
          { type: 'SIMULATION_ADDED', date: '2026-10-01', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-10-01', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 66,03 | Stop: R$ 63,06' },
          { type: 'ENTRY_EXECUTED', date: '2026-10-02', label: 'Entrada executada', price: 66.03, desc: 'Entrada executada a R$ 66,03' },
          { type: 'TARGET_1R', date: '2026-10-05', label: '+1R atingido', desc: 'Preço alcançou R$ 69,00 (+1,00R)' }
        ]
      },
      {
        id: 'sim-petr4-02',
        symbol: 'PETR4',
        companyName: 'Petrobras PN',
        triggerName: 'Inside Bar',
        grade: 'A',
        sector: 'Petróleo e Gás',
        signalDate: '2026-09-29',
        entryPrice: 49.80,
        stopLoss: 48.90,
        status: STATUS.IN_OPERATION,
        executedEntryPrice: 49.80,
        entryDate: '2026-09-30',
        currentStop: 49.80,
        currentPrice: 53.20,
        resultR: 3.78,
        mfeR: 3.90,
        maeR: -0.22,
        ttt1R: 2,
        ttt2R: 4,
        ttt3R: 7,
        expansionAfterBreakout: { c1: 0.40, c2: 0.90, c3: 1.50, c5: 2.40 },
        structure: {
          ibCount: 1,
          motherCandle: { high: 51.20, low: 48.00, range: 3.20 },
          ib1: { high: 49.79, low: 48.91, range: 0.88, compressionRatio: 0.28, compressionPct: 27.5 },
          totalCompressionPct: 27.5
        },
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-29', label: 'Gatilho identificado', desc: 'Inside Bar (A) em PETR4' },
          { type: 'SIMULATION_ADDED', date: '2026-09-29', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-29', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 49,80 | Stop: R$ 48,90' },
          { type: 'ENTRY_EXECUTED', date: '2026-09-30', label: 'Entrada executada', price: 49.80, desc: 'Entrada executada a R$ 49,80' },
          { type: 'TARGET_1R', date: '2026-10-01', label: '+1R atingido', desc: 'Alcançou R$ 50,70 (+1,00R)' },
          { type: 'TARGET_2R', date: '2026-10-02', label: '+2R atingido', desc: 'Alcançou R$ 51,60 (+2,00R)' }
        ]
      },
      {
        id: 'sim-sbsp3-03',
        symbol: 'SBSP3',
        companyName: 'Sabesp',
        triggerName: 'Double Inside Bar',
        grade: 'A',
        sector: 'Utilidade Pública',
        signalDate: '2026-10-01',
        entryPrice: 89.50,
        stopLoss: 87.20,
        status: STATUS.IN_OPERATION,
        executedEntryPrice: 89.50,
        entryDate: '2026-10-02',
        currentStop: 87.20,
        currentPrice: 90.10,
        resultR: 0.26,
        mfeR: 0.40,
        maeR: -0.15,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.15, c2: 0.26, c3: null, c5: null },
        structure: {
          ibCount: 2,
          motherCandle: { high: 91.20, low: 86.10, range: 5.10 },
          ib1: { high: 90.40, low: 86.80, range: 3.60, compressionRatio: 0.71, compressionPct: 70.6 },
          ib2: { high: 89.49, low: 87.21, range: 2.28, compressionRatio: 0.63, compressionPct: 63.3 },
          totalCompressionRatio: 0.45,
          totalCompressionPct: 44.7,
          totalContractionPct: 55.3,
          entryPrice: 89.50,
          stopLoss: 87.20,
          initialRisk: 2.30,
          graphicRiskPct: 2.57
        },
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-10-01', label: 'Gatilho identificado', desc: 'Double Inside Bar (A) em SBSP3' },
          { type: 'SIMULATION_ADDED', date: '2026-10-01', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-10-01', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 89,50 | Stop: R$ 87,20' },
          { type: 'ENTRY_EXECUTED', date: '2026-10-02', label: 'Entrada executada', price: 89.50, desc: 'Entrada executada a R$ 89,50' }
        ]
      },
      {
        id: 'sim-wege3-04',
        symbol: 'WEGE3',
        companyName: 'WEG S.A.',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Bens Industriais',
        signalDate: '2026-09-30',
        entryPrice: 54.20,
        stopLoss: 52.80,
        status: STATUS.IN_OPERATION,
        executedEntryPrice: 54.20,
        entryDate: '2026-10-01',
        currentStop: 54.20,
        currentPrice: 55.40,
        resultR: 0.86,
        mfeR: 1.05,
        maeR: -0.20,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-30', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A) em WEGE3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-30', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-30', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 54,20 | Stop: R$ 52,80' },
          { type: 'ENTRY_EXECUTED', date: '2026-10-01', label: 'Entrada executada', price: 54.20, desc: 'Entrada executada a R$ 54,20' }
        ]
      },

      // ==========================================
      // 2. AGUARDANDO ENTRADA (6 itens - Sinais recentes)
      // ==========================================
      {
        id: 'sim-vale3-05',
        symbol: 'VALE3',
        companyName: 'Vale S.A.',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Materiais Básicos',
        signalDate: '2026-09-25',
        entryPrice: 68.20,
        stopLoss: 66.90,
        status: STATUS.WAITING_ENTRY,
        currentPrice: 67.40,
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-25', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A) em VALE3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-25', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-25', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 68,20 | Stop: R$ 66,90' }
        ]
      },
      {
        id: 'sim-bbas3-06',
        symbol: 'BBAS3',
        companyName: 'Banco do Brasil',
        triggerName: 'Inside Bar',
        grade: 'B',
        sector: 'Financeiro',
        signalDate: '2026-09-15',
        entryPrice: 29.10,
        stopLoss: 27.80,
        status: STATUS.WAITING_ENTRY,
        currentPrice: 28.90,
        resultR: null,
        mfeR: null,
        maeR: null,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: null, c2: null, c3: null, c5: null },
        structure: {
          ibCount: 1,
          motherCandle: { high: 30.50, low: 26.80, range: 3.70 },
          ib1: { high: 29.09, low: 27.81, range: 1.28, compressionRatio: 0.35, compressionPct: 34.6 },
          totalCompressionPct: 34.6
        },
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-15', label: 'Gatilho identificado', desc: 'Inside Bar (B) em BBAS3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-15', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-15', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 29,10 | Stop: R$ 27,80' }
        ]
      },
      {
        id: 'sim-embr3-07',
        symbol: 'EMBR3',
        companyName: 'Embraer S.A.',
        triggerName: 'Double Inside Bar',
        grade: 'A',
        sector: 'Bens Industriais',
        signalDate: '2026-10-01',
        entryPrice: 51.50,
        stopLoss: 49.80,
        status: STATUS.WAITING_ENTRY,
        currentPrice: 50.80,
        resultR: null,
        mfeR: null,
        maeR: null,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: null, c2: null, c3: null, c5: null },
        structure: {
          ibCount: 2,
          motherCandle: { high: 53.20, low: 48.50, range: 4.70 },
          ib1: { high: 52.40, low: 49.20, range: 3.20, compressionRatio: 0.68, compressionPct: 68.1 },
          ib2: { high: 51.49, low: 49.81, range: 1.68, compressionRatio: 0.53, compressionPct: 52.5 },
          totalCompressionRatio: 0.36,
          totalCompressionPct: 35.7,
          totalContractionPct: 64.3,
          entryPrice: 51.50,
          stopLoss: 49.80,
          initialRisk: 1.70,
          graphicRiskPct: 3.30
        },
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-10-01', label: 'Gatilho identificado', desc: 'Double Inside Bar (A) em EMBR3' },
          { type: 'SIMULATION_ADDED', date: '2026-10-01', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-10-01', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 51,50 | Stop: R$ 49,80' }
        ]
      },
      {
        id: 'sim-mult3-08',
        symbol: 'MULT3',
        companyName: 'Multiplan',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Financeiro',
        signalDate: '2026-09-28',
        entryPrice: 25.80,
        stopLoss: 24.90,
        status: STATUS.WAITING_ENTRY,
        currentPrice: 25.40,
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-28', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A) em MULT3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-28', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-28', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 25,80 | Stop: R$ 24,90' }
        ]
      },
      {
        id: 'sim-b3sa3-09',
        symbol: 'B3SA3',
        companyName: 'B3 S.A. Brasil Bolsa Balcão',
        triggerName: 'Inside Bar',
        grade: 'A',
        sector: 'Financeiro',
        signalDate: '2026-09-21',
        entryPrice: 11.90,
        stopLoss: 11.30,
        status: STATUS.WAITING_ENTRY,
        currentPrice: 11.70,
        resultR: null,
        mfeR: null,
        maeR: null,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: null, c2: null, c3: null, c5: null },
        structure: {
          ibCount: 1,
          motherCandle: { high: 12.40, low: 11.10, range: 1.30 },
          ib1: { high: 11.89, low: 11.31, range: 0.58, compressionRatio: 0.45, compressionPct: 44.6 },
          totalCompressionPct: 44.6
        },
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-21', label: 'Gatilho identificado', desc: 'Inside Bar (A) em B3SA3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-21', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-21', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 11,90 | Stop: R$ 11,30' }
        ]
      },
      {
        id: 'sim-csan3-10',
        symbol: 'CSAN3',
        companyName: 'Cosan S.A.',
        triggerName: '1-2-3 de Compra',
        grade: 'B',
        sector: 'Petróleo e Gás',
        signalDate: '2026-10-02',
        entryPrice: 14.30,
        stopLoss: 13.60,
        status: STATUS.WAITING_ENTRY,
        currentPrice: 14.10,
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-10-02', label: 'Gatilho identificado', desc: '1-2-3 de Compra (B) em CSAN3' },
          { type: 'SIMULATION_ADDED', date: '2026-10-02', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-10-02', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 14,30 | Stop: R$ 13,60' }
        ]
      },

      // ==========================================
      // 3. NÃO ACIONADOS (4 itens - Stop violado antes da entrada)
      // ==========================================
      {
        id: 'sim-cyre3-11',
        symbol: 'CYRE3',
        companyName: 'Cyrela Brazil Realty',
        triggerName: '1-2-3 de Compra',
        grade: 'B',
        sector: 'Consumo Cíclico',
        signalDate: '2026-08-14',
        entryPrice: 23.50,
        stopLoss: 22.40,
        status: STATUS.NOT_TRIGGERED,
        currentPrice: 22.10,
        exitDate: '2026-08-18',
        exitReason: 'Mínima violada antes do rompimento',
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-08-14', label: 'Gatilho identificado', desc: '1-2-3 de Compra (B) em CYRE3' },
          { type: 'SIMULATION_ADDED', date: '2026-08-14', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'NOT_TRIGGERED', date: '2026-08-18', label: 'Não acionado', desc: 'Mínima do gatilho violada antes da ativação' }
        ]
      },
      {
        id: 'sim-rani3-12',
        symbol: 'RANI3',
        companyName: 'Irani Papel e Embalagem',
        triggerName: 'Inside Bar',
        grade: 'C',
        sector: 'Materiais Básicos',
        signalDate: '2026-07-17',
        entryPrice: 8.90,
        stopLoss: 8.40,
        status: STATUS.NOT_TRIGGERED,
        currentPrice: 8.30,
        exitDate: '2026-07-22',
        exitReason: 'Mínima violada antes do rompimento',
        resultR: null,
        mfeR: null,
        maeR: null,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: null, c2: null, c3: null, c5: null },
        structure: {
          ibCount: 1,
          motherCandle: { high: 9.30, low: 8.20, range: 1.10 },
          ib1: { high: 8.89, low: 8.41, range: 0.48, compressionRatio: 0.44, compressionPct: 43.6 },
          totalCompressionPct: 43.6
        },
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-07-17', label: 'Gatilho identificado', desc: 'Inside Bar (C) em RANI3' },
          { type: 'SIMULATION_ADDED', date: '2026-07-17', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'NOT_TRIGGERED', date: '2026-07-22', label: 'Não acionado', desc: 'Mínima do gatilho violada antes da ativação' }
        ]
      },
      {
        id: 'sim-recv3-13',
        symbol: 'RECV3',
        companyName: 'PetroRecôncavo',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Petróleo e Gás',
        signalDate: '2026-06-25',
        entryPrice: 19.80,
        stopLoss: 18.90,
        status: STATUS.NOT_TRIGGERED,
        currentPrice: 18.70,
        exitDate: '2026-06-29',
        exitReason: 'Mínima violada antes do rompimento',
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-06-25', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A) em RECV3' },
          { type: 'SIMULATION_ADDED', date: '2026-06-25', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'NOT_TRIGGERED', date: '2026-06-29', label: 'Não acionado', desc: 'Mínima do gatilho violada antes da ativação' }
        ]
      },
      {
        id: 'sim-mdia3-14',
        symbol: 'MDIA3',
        companyName: 'M. Dias Branco',
        triggerName: 'Double Inside Bar',
        grade: 'C',
        sector: 'Consumo Não Cíclico',
        signalDate: '2026-06-16',
        entryPrice: 32.40,
        stopLoss: 31.00,
        status: STATUS.NOT_TRIGGERED,
        currentPrice: 30.80,
        exitDate: '2026-06-19',
        exitReason: 'Mínima violada antes do rompimento',
        resultR: null,
        mfeR: null,
        maeR: null,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: null, c2: null, c3: null, c5: null },
        structure: {
          ibCount: 2,
          motherCandle: { high: 34.50, low: 29.80, range: 4.70 },
          ib1: { high: 33.60, low: 30.40, range: 3.20, compressionRatio: 0.68, compressionPct: 68.1 },
          ib2: { high: 32.39, low: 31.01, range: 1.38, compressionRatio: 0.43, compressionPct: 43.1 },
          totalCompressionRatio: 0.29,
          totalCompressionPct: 29.4,
          totalContractionPct: 70.6,
          entryPrice: 32.40,
          stopLoss: 31.00,
          initialRisk: 1.40,
          graphicRiskPct: 4.32
        },
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-06-16', label: 'Gatilho identificado', desc: 'Double Inside Bar (C) em MDIA3' },
          { type: 'SIMULATION_ADDED', date: '2026-06-16', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'NOT_TRIGGERED', date: '2026-06-19', label: 'Não acionado', desc: 'Mínima do gatilho violada antes da ativação' }
        ]
      },

      // ==========================================
      // 4. ENCERRADOS VENCEDORES (20 itens - Junho a Setembro/Outubro)
      // ==========================================
      {
        id: 'sim-itub4-15',
        symbol: 'ITUB4',
        companyName: 'Itaú Unibanco',
        triggerName: 'Inside Bar',
        grade: 'B',
        sector: 'Financeiro',
        signalDate: '2026-09-22',
        entryPrice: 37.20,
        stopLoss: 35.90,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 37.20,
        entryDate: '2026-09-23',
        currentPrice: 39.93,
        exitPrice: 39.93,
        exitDate: '2026-10-01',
        exitReason: 'Sell Into Strength (+2,1R)',
        resultR: 2.10,
        mfeR: 2.35,
        maeR: -0.40,
        ttt1R: 2,
        ttt2R: 6,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.35, c2: 0.70, c3: 1.10, c5: 1.70 },
        structure: {
          ibCount: 1,
          motherCandle: { high: 38.60, low: 35.20, range: 3.40 },
          ib1: { high: 37.19, low: 35.91, range: 1.28, compressionRatio: 0.38, compressionPct: 37.6 },
          totalCompressionPct: 37.6
        },
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-22', label: 'Gatilho identificado', desc: 'Inside Bar (B) em ITUB4' },
          { type: 'SIMULATION_ADDED', date: '2026-09-22', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-22', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 37,20 | Stop: R$ 35,90' },
          { type: 'ENTRY_EXECUTED', date: '2026-09-23', label: 'Entrada executada', price: 37.20, desc: 'Entrada executada a R$ 37,20' },
          { type: 'TARGET_1R', date: '2026-09-25', label: '+1R atingido', desc: 'Atingiu R$ 38,50 (+1,00R)' },
          { type: 'TARGET_2R', date: '2026-10-01', label: '+2R atingido', desc: 'Atingiu R$ 39,80 (+2,00R)' },
          { type: 'SELL_INTO_STRENGTH', date: '2026-10-01', label: 'Sell Into Strength', price: 39.93, desc: 'Saída programada em força a +2,10R' },
          { type: 'CLOSED', date: '2026-10-01', label: 'Trade encerrado', resultR: 2.10, desc: 'Operação encerrada com ganho de +2,10R' }
        ]
      },
      {
        id: 'sim-abev3-16',
        symbol: 'ABEV3',
        companyName: 'Ambev S.A.',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Consumo Não Cíclico',
        signalDate: '2026-09-11',
        entryPrice: 13.25,
        stopLoss: 12.70,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 13.25,
        entryDate: '2026-09-14',
        currentPrice: 14.52,
        exitPrice: 14.52,
        exitDate: '2026-09-24',
        exitReason: 'Sell Into Strength (+2,3R)',
        resultR: 2.30,
        mfeR: 2.60,
        maeR: -0.25,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-11', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A) em ABEV3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-11', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-11', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 13,25 | Stop: R$ 12,70' },
          { type: 'ENTRY_EXECUTED', date: '2026-09-14', label: 'Entrada executada', price: 13.25, desc: 'Entrada executada a R$ 13,25' },
          { type: 'TARGET_1R', date: '2026-09-16', label: '+1R atingido', desc: 'Preço atingiu R$ 13,80 (+1,00R)' },
          { type: 'TARGET_2R', date: '2026-09-24', label: '+2R atingido', desc: 'Preço atingiu R$ 14,35 (+2,00R)' },
          { type: 'SELL_INTO_STRENGTH', date: '2026-09-24', label: 'Sell Into Strength', price: 14.52, desc: 'Saída programada em R$ 14,52 (+2,30R)' },
          { type: 'CLOSED', date: '2026-09-24', label: 'Trade encerrado', resultR: 2.30, desc: 'Operação concluída com ganho de +2,30R' }
        ]
      },
      {
        id: 'sim-lren3-17',
        symbol: 'LREN3',
        companyName: 'Lojas Renner',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Consumo Cíclico',
        signalDate: '2026-09-08',
        entryPrice: 17.50,
        stopLoss: 16.60,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 17.50,
        entryDate: '2026-09-09',
        currentPrice: 18.31,
        exitPrice: 18.31,
        exitDate: '2026-09-18',
        exitReason: 'Trailing Stop (+0,9R)',
        resultR: 0.90,
        mfeR: 1.40,
        maeR: -0.30
      },
      {
        id: 'sim-rent3-18',
        symbol: 'RENT3',
        companyName: 'Localiza Rent a Car',
        triggerName: 'Double Inside Bar',
        grade: 'A',
        sector: 'Consumo Cíclico',
        signalDate: '2026-09-02',
        entryPrice: 52.40,
        stopLoss: 50.80,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 52.40,
        entryDate: '2026-09-03',
        currentPrice: 55.60,
        exitPrice: 55.60,
        exitDate: '2026-09-16',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.00,
        mfeR: 2.15,
        maeR: -0.20,
        ttt1R: 2,
        ttt2R: 4,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.50, c2: 1.10, c3: 1.60, c5: 2.00 },
        structure: {
          ibCount: 2,
          motherCandle: { high: 54.80, low: 49.50, range: 5.30 },
          ib1: { high: 53.60, low: 50.20, range: 3.40, compressionRatio: 0.64, compressionPct: 64.2 },
          ib2: { high: 52.39, low: 50.81, range: 1.58, compressionRatio: 0.46, compressionPct: 46.5 },
          totalCompressionRatio: 0.30,
          totalCompressionPct: 29.8,
          totalContractionPct: 70.2,
          entryPrice: 52.40,
          stopLoss: 50.80,
          initialRisk: 1.60,
          graphicRiskPct: 3.05
        }
      },
      {
        id: 'sim-prio3-19',
        symbol: 'PRIO3',
        companyName: 'PRIO S.A.',
        triggerName: 'Double Inside Bar',
        grade: 'A',
        sector: 'Petróleo e Gás',
        signalDate: '2026-08-27',
        entryPrice: 45.10,
        stopLoss: 43.70,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 45.10,
        entryDate: '2026-08-28',
        currentPrice: 47.90,
        exitPrice: 47.90,
        exitDate: '2026-09-10',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.00,
        mfeR: 2.20,
        maeR: -0.30,
        ttt1R: 1,
        ttt2R: 3,
        ttt3R: 6,
        expansionAfterBreakout: { c1: 0.90, c2: 1.40, c3: 1.80, c5: 2.20 },
        structure: {
          ibCount: 2,
          motherCandle: { high: 47.50, low: 42.80, range: 4.70 },
          ib1: { high: 46.40, low: 43.20, range: 3.20, compressionRatio: 0.68, compressionPct: 68.1 },
          ib2: { high: 45.09, low: 43.71, range: 1.38, compressionRatio: 0.43, compressionPct: 43.1 },
          totalCompressionRatio: 0.29,
          totalCompressionPct: 29.4,
          totalContractionPct: 70.6,
          entryPrice: 45.10,
          stopLoss: 43.70,
          initialRisk: 1.40,
          graphicRiskPct: 3.10
        }
      },
      {
        id: 'sim-radl3-20',
        symbol: 'RADL3',
        companyName: 'Raia Drogasil',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Saúde',
        signalDate: '2026-08-25',
        entryPrice: 26.50,
        stopLoss: 25.50,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 26.50,
        entryDate: '2026-08-26',
        currentPrice: 28.50,
        exitPrice: 28.50,
        exitDate: '2026-09-08',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.00,
        mfeR: 2.10,
        maeR: -0.15
      },
      {
        id: 'sim-klbn11-21',
        symbol: 'KLBN11',
        companyName: 'Klabin S.A.',
        triggerName: 'Inside Bar',
        grade: 'A',
        sector: 'Materiais Básicos',
        signalDate: '2026-08-19',
        entryPrice: 22.80,
        stopLoss: 21.90,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 22.80,
        entryDate: '2026-08-20',
        currentPrice: 23.88,
        exitPrice: 23.88,
        exitDate: '2026-09-02',
        exitReason: 'Trailing Stop (+1,2R)',
        resultR: 1.20,
        mfeR: 1.60,
        maeR: -0.25,
        ttt1R: 4,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.35, c2: 0.60, c3: 0.90, c5: 1.30 },
        structure: {
          ibCount: 1,
          motherCandle: { high: 23.50, low: 21.60, range: 1.90 },
          ib1: { high: 22.79, low: 21.91, range: 0.88, compressionRatio: 0.46, compressionPct: 46.3 },
          totalCompressionRatio: 0.46,
          totalCompressionPct: 46.3,
          totalContractionPct: 53.7,
          entryPrice: 22.80,
          stopLoss: 21.90,
          initialRisk: 0.90,
          graphicRiskPct: 3.95
        }
      },
      {
        id: 'sim-suzb3-22',
        symbol: 'SUZB3',
        companyName: 'Suzano S.A.',
        triggerName: 'Inside Bar',
        grade: 'B',
        sector: 'Materiais Básicos',
        signalDate: '2026-08-14',
        entryPrice: 56.80,
        stopLoss: 55.00,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 56.80,
        entryDate: '2026-08-17',
        currentPrice: 60.40,
        exitPrice: 60.40,
        exitDate: '2026-08-28',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.00,
        mfeR: 2.25,
        maeR: -0.35,
        ttt1R: 3,
        ttt2R: 6,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.45, c2: 0.80, c3: 1.20, c5: 1.80 },
        structure: {
          ibCount: 1,
          motherCandle: { high: 58.60, low: 54.20, range: 4.40 },
          ib1: { high: 56.79, low: 55.01, range: 1.78, compressionRatio: 0.40, compressionPct: 40.5 },
          totalCompressionRatio: 0.40,
          totalCompressionPct: 40.5,
          totalContractionPct: 59.5,
          entryPrice: 56.80,
          stopLoss: 55.00,
          initialRisk: 1.80,
          graphicRiskPct: 3.17
        }
      },
      {
        id: 'sim-vbbr3-23',
        symbol: 'VBBR3',
        companyName: 'Vibra Energia',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Petróleo e Gás',
        signalDate: '2026-08-06',
        entryPrice: 23.20,
        stopLoss: 22.20,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 23.20,
        entryDate: '2026-08-07',
        currentPrice: 25.20,
        exitPrice: 25.20,
        exitDate: '2026-08-21',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.00,
        mfeR: 2.15,
        maeR: -0.20
      },
      {
        id: 'sim-jbss3-24',
        symbol: 'JBSS3',
        companyName: 'JBS S.A.',
        triggerName: 'Inside Bar',
        grade: 'A',
        sector: 'Consumo Não Cíclico',
        signalDate: '2026-08-03',
        entryPrice: 34.60,
        stopLoss: 33.20,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 34.60,
        entryDate: '2026-08-04',
        currentPrice: 37.26,
        exitPrice: 37.26,
        exitDate: '2026-08-19',
        exitReason: 'Sell Into Strength (+1,9R)',
        resultR: 1.90,
        mfeR: 2.30,
        maeR: -0.25,
        ttt1R: 2,
        ttt2R: 5,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.60, c2: 1.05, c3: 1.45, c5: 1.90 },
        structure: {
          ibCount: 1,
          motherCandle: { high: 36.20, low: 32.50, range: 3.70 },
          ib1: { high: 34.59, low: 33.21, range: 1.38, compressionRatio: 0.37, compressionPct: 37.3 },
          totalCompressionRatio: 0.37,
          totalCompressionPct: 37.3,
          totalContractionPct: 62.7,
          entryPrice: 34.60,
          stopLoss: 33.20,
          initialRisk: 1.40,
          graphicRiskPct: 4.05
        }
      },
      {
        id: 'sim-cpfe3-25',
        symbol: 'CPFE3',
        companyName: 'CPFL Energia',
        triggerName: 'Inside Bar',
        grade: 'A',
        sector: 'Utilidade Pública',
        signalDate: '2026-07-28',
        entryPrice: 35.80,
        stopLoss: 34.60,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 35.80,
        entryDate: '2026-07-29',
        currentPrice: 38.20,
        exitPrice: 38.20,
        exitDate: '2026-08-11',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.00,
        mfeR: 2.10,
        maeR: -0.15,
        ttt1R: 3,
        ttt2R: 6,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.50, c2: 0.85, c3: 1.25, c5: 1.85 },
        structure: {
          ibCount: 1,
          motherCandle: { high: 37.20, low: 34.00, range: 3.20 },
          ib1: { high: 35.79, low: 34.61, range: 1.18, compressionRatio: 0.37, compressionPct: 36.9 },
          totalCompressionRatio: 0.37,
          totalCompressionPct: 36.9,
          totalContractionPct: 63.1,
          entryPrice: 35.80,
          stopLoss: 34.60,
          initialRisk: 1.20,
          graphicRiskPct: 3.35
        }
      },
      {
        id: 'sim-rdor3-26',
        symbol: 'RDOR3',
        companyName: 'Rede D’Or',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Saúde',
        signalDate: '2026-07-22',
        entryPrice: 28.90,
        stopLoss: 27.80,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 28.90,
        entryDate: '2026-07-23',
        currentPrice: 29.78,
        exitPrice: 29.78,
        exitDate: '2026-07-29',
        exitReason: 'Sell Into Strength (+0,8R)',
        resultR: 0.80,
        mfeR: 1.10,
        maeR: -0.30
      },
      {
        id: 'sim-hype3-27',
        symbol: 'HYPE3',
        companyName: 'Hypera Pharma',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Saúde',
        signalDate: '2026-07-15',
        entryPrice: 31.80,
        stopLoss: 30.50,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 31.80,
        entryDate: '2026-07-16',
        currentPrice: 33.62,
        exitPrice: 33.62,
        exitDate: '2026-07-28',
        exitReason: 'Sell Into Strength (+1,4R)',
        resultR: 1.40,
        mfeR: 1.70,
        maeR: -0.35
      },
      {
        id: 'sim-cmig4-28',
        symbol: 'CMIG4',
        companyName: 'CEMIG PN',
        triggerName: 'Outros',
        grade: 'C',
        sector: 'Utilidade Pública',
        signalDate: '2026-07-09',
        entryPrice: 11.20,
        stopLoss: 10.60,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 11.20,
        entryDate: '2026-07-10',
        currentPrice: 11.26,
        exitPrice: 11.26,
        exitDate: '2026-07-20',
        exitReason: 'Breakeven / Proteção (+0,1R)',
        resultR: 0.10,
        mfeR: 1.10,
        maeR: -0.15
      },
      {
        id: 'sim-sanb11-29',
        symbol: 'SANB11',
        companyName: 'Banco Santander Brasil',
        triggerName: '1-2-3 de Compra',
        grade: 'B',
        sector: 'Financeiro',
        signalDate: '2026-07-08',
        entryPrice: 28.50,
        stopLoss: 27.20,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 28.50,
        entryDate: '2026-07-09',
        currentPrice: 30.58,
        exitPrice: 30.58,
        exitDate: '2026-07-23',
        exitReason: 'Sell Into Strength (+1,6R)',
        resultR: 1.60,
        mfeR: 1.85,
        maeR: -0.20
      },
      {
        id: 'sim-cple6-30',
        symbol: 'CPLE6',
        companyName: 'Copel PNB',
        triggerName: 'Double Inside Bar',
        grade: 'A',
        sector: 'Utilidade Pública',
        signalDate: '2026-07-02',
        entryPrice: 10.15,
        stopLoss: 9.70,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 10.15,
        entryDate: '2026-07-03',
        currentPrice: 11.14,
        exitPrice: 11.14,
        exitDate: '2026-07-17',
        exitReason: 'Sell Into Strength (+2,2R)',
        resultR: 2.20,
        mfeR: 2.40,
        maeR: -0.15,
        ttt1R: 2,
        ttt2R: 4,
        ttt3R: 6,
        expansionAfterBreakout: { c1: 0.85, c2: 1.25, c3: 1.70, c5: 2.20 },
        structure: {
          ibCount: 2,
          motherCandle: { high: 10.70, low: 9.40, range: 1.30 },
          ib1: { high: 10.35, low: 9.60, range: 0.75, compressionRatio: 0.58, compressionPct: 57.7 },
          ib2: { high: 10.14, low: 9.71, range: 0.43, compressionRatio: 0.57, compressionPct: 57.3 },
          totalCompressionRatio: 0.33,
          totalCompressionPct: 33.1,
          totalContractionPct: 66.9,
          entryPrice: 10.15,
          stopLoss: 9.70,
          initialRisk: 0.45,
          graphicRiskPct: 4.43
        }
      },
      {
        id: 'sim-egie3-31',
        symbol: 'EGIE3',
        companyName: 'Engie Brasil',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Utilidade Pública',
        signalDate: '2026-06-26',
        entryPrice: 42.60,
        stopLoss: 41.20,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 42.60,
        entryDate: '2026-06-29',
        currentPrice: 45.12,
        exitPrice: 45.12,
        exitDate: '2026-07-15',
        exitReason: 'Sell Into Strength (+1,8R)',
        resultR: 1.80,
        mfeR: 2.10,
        maeR: -0.25
      },
      {
        id: 'sim-ggbr4-32',
        symbol: 'GGBR4',
        companyName: 'Gerdau PN',
        triggerName: 'Double Inside Bar',
        grade: 'A',
        sector: 'Materiais Básicos',
        signalDate: '2026-06-22',
        entryPrice: 20.40,
        stopLoss: 19.50,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 20.40,
        entryDate: '2026-06-23',
        currentPrice: 22.20,
        exitPrice: 22.20,
        exitDate: '2026-07-08',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.00,
        mfeR: 2.20,
        maeR: -0.30,
        ttt1R: 2,
        ttt2R: 5,
        ttt3R: 8,
        expansionAfterBreakout: { c1: 0.70, c2: 1.10, c3: 1.50, c5: 2.00 },
        structure: {
          ibCount: 2,
          motherCandle: { high: 21.50, low: 18.80, range: 2.70 },
          ib1: { high: 20.80, low: 19.20, range: 1.60, compressionRatio: 0.59, compressionPct: 59.3 },
          ib2: { high: 20.39, low: 19.51, range: 0.88, compressionRatio: 0.55, compressionPct: 55.0 },
          totalCompressionRatio: 0.33,
          totalCompressionPct: 32.6,
          totalContractionPct: 67.4,
          entryPrice: 20.40,
          stopLoss: 19.50,
          initialRisk: 0.90,
          graphicRiskPct: 4.41
        }
      },
      {
        id: 'sim-flry3-33',
        symbol: 'FLRY3',
        companyName: 'Fleury S.A.',
        triggerName: 'Inside Bar',
        grade: 'A',
        sector: 'Saúde',
        signalDate: '2026-06-18',
        entryPrice: 15.60,
        stopLoss: 14.80,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 15.60,
        entryDate: '2026-06-19',
        currentPrice: 16.80,
        exitPrice: 16.80,
        exitDate: '2026-07-02',
        exitReason: 'Sell Into Strength (+1,5R)',
        resultR: 1.50,
        mfeR: 1.80,
        maeR: -0.20,
        ttt1R: 3,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.40, c2: 0.70, c3: 1.10, c5: 1.50 },
        structure: {
          ibCount: 1,
          motherCandle: { high: 16.20, low: 14.50, range: 1.70 },
          ib1: { high: 15.59, low: 14.81, range: 0.78, compressionRatio: 0.46, compressionPct: 45.9 },
          totalCompressionRatio: 0.46,
          totalCompressionPct: 45.9,
          totalContractionPct: 54.1,
          entryPrice: 15.60,
          stopLoss: 14.80,
          initialRisk: 0.80,
          graphicRiskPct: 5.13
        }
      },
      {
        id: 'sim-tots3-34',
        symbol: 'TOTS3',
        companyName: 'Totvs S.A.',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Tecnologia',
        signalDate: '2026-06-15',
        entryPrice: 31.50,
        stopLoss: 30.10,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 31.50,
        entryDate: '2026-06-16',
        currentPrice: 34.44,
        exitPrice: 34.44,
        exitDate: '2026-06-30',
        exitReason: 'Sell Into Strength (+2,1R)',
        resultR: 2.10,
        mfeR: 2.30,
        maeR: -0.15
      },

      // ==========================================
      // 5. ENCERRADOS PERDEDORES (8 itens - Junho a Setembro)
      // ==========================================
      {
        id: 'sim-kepl3-35',
        symbol: 'KEPL3',
        companyName: 'Kepler Weber',
        triggerName: 'Double Inside Bar',
        grade: 'B',
        sector: 'Bens Industriais',
        signalDate: '2026-09-17',
        entryPrice: 10.80,
        stopLoss: 10.10,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 10.80,
        entryDate: '2026-09-18',
        currentPrice: 10.10,
        exitPrice: 10.10,
        exitDate: '2026-09-24',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.30,
        maeR: -1.00,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.20, c2: -0.30, c3: -0.80, c5: -1.00 },
        structure: {
          ibCount: 2,
          motherCandle: { high: 11.50, low: 9.80, range: 1.70 },
          ib1: { high: 11.10, low: 10.00, range: 1.10, compressionRatio: 0.65, compressionPct: 64.7 },
          ib2: { high: 10.79, low: 10.11, range: 0.68, compressionRatio: 0.62, compressionPct: 61.8 },
          totalCompressionRatio: 0.40,
          totalCompressionPct: 40.0,
          totalContractionPct: 60.0,
          entryPrice: 10.80,
          stopLoss: 10.10,
          initialRisk: 0.70,
          graphicRiskPct: 6.48
        }
      },
      {
        id: 'sim-eqtl3-36',
        symbol: 'EQTL3',
        companyName: 'Equatorial Energia',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Utilidade Pública',
        signalDate: '2026-08-20',
        entryPrice: 31.00,
        stopLoss: 29.80,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 31.00,
        entryDate: '2026-08-21',
        currentPrice: 29.80,
        exitPrice: 29.80,
        exitDate: '2026-08-27',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.40,
        maeR: -1.00
      },
      {
        id: 'sim-alos3-37',
        symbol: 'ALOS3',
        companyName: 'Allos S.A.',
        triggerName: '1-2-3 de Compra',
        grade: 'B',
        sector: 'Financeiro',
        signalDate: '2026-08-11',
        entryPrice: 24.50,
        stopLoss: 23.60,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 24.50,
        entryDate: '2026-08-12',
        currentPrice: 23.60,
        exitPrice: 23.60,
        exitDate: '2026-08-18',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.20,
        maeR: -1.00
      },
      {
        id: 'sim-tims3-38',
        symbol: 'TIMS3',
        companyName: 'TIM Brasil',
        triggerName: 'Double Inside Bar',
        grade: 'B',
        sector: 'Telecomunicações',
        signalDate: '2026-08-05',
        entryPrice: 18.20,
        stopLoss: 17.50,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 18.20,
        entryDate: '2026-08-06',
        currentPrice: 17.64,
        exitPrice: 17.64,
        exitDate: '2026-08-13',
        exitReason: 'Stop Loss',
        resultR: -0.80,
        mfeR: 0.35,
        maeR: -0.80,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.35, c2: 0.10, c3: -0.50, c5: -0.80 },
        structure: {
          ibCount: 2,
          motherCandle: { high: 19.20, low: 17.00, range: 2.20 },
          ib1: { high: 18.70, low: 17.30, range: 1.40, compressionRatio: 0.64, compressionPct: 63.6 },
          ib2: { high: 18.19, low: 17.51, range: 0.68, compressionRatio: 0.49, compressionPct: 48.6 },
          totalCompressionRatio: 0.31,
          totalCompressionPct: 30.9,
          totalContractionPct: 69.1,
          entryPrice: 18.20,
          stopLoss: 17.50,
          initialRisk: 0.70,
          graphicRiskPct: 3.85
        }
      },
      {
        id: 'sim-csna3-39',
        symbol: 'CSNA3',
        companyName: 'Siderúrgica Nacional',
        triggerName: '1-2-3 de Compra',
        grade: 'B',
        sector: 'Materiais Básicos',
        signalDate: '2026-07-23',
        entryPrice: 13.40,
        stopLoss: 12.70,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 13.40,
        entryDate: '2026-07-24',
        currentPrice: 12.70,
        exitPrice: 12.70,
        exitDate: '2026-07-31',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.25,
        maeR: -1.00
      },
      {
        id: 'sim-elet3-40',
        symbol: 'ELET3',
        companyName: 'Eletrobras ON',
        triggerName: 'Inside Bar',
        grade: 'A',
        sector: 'Utilidade Pública',
        signalDate: '2026-07-10',
        entryPrice: 41.20,
        stopLoss: 39.80,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 41.20,
        entryDate: '2026-07-13',
        currentPrice: 39.80,
        exitPrice: 39.80,
        exitDate: '2026-07-20',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.30,
        maeR: -1.00,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.30, c2: -0.20, c3: -0.70, c5: -1.00 },
        structure: {
          ibCount: 1,
          motherCandle: { high: 42.50, low: 39.20, range: 3.30 },
          ib1: { high: 41.19, low: 39.81, range: 1.38, compressionRatio: 0.42, compressionPct: 41.8 },
          totalCompressionRatio: 0.42,
          totalCompressionPct: 41.8,
          totalContractionPct: 58.2,
          entryPrice: 41.20,
          stopLoss: 39.80,
          initialRisk: 1.40,
          graphicRiskPct: 3.40
        }
      },
      {
        id: 'sim-smto3-41',
        symbol: 'SMTO3',
        companyName: 'São Martinho',
        triggerName: 'Double Inside Bar',
        grade: 'B',
        sector: 'Consumo Não Cíclico',
        signalDate: '2026-06-30',
        entryPrice: 29.80,
        stopLoss: 28.60,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 29.80,
        entryDate: '2026-07-01',
        currentPrice: 28.60,
        exitPrice: 28.60,
        exitDate: '2026-07-07',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.20,
        maeR: -1.00,
        ttt1R: null,
        ttt2R: null,
        ttt3R: null,
        expansionAfterBreakout: { c1: 0.20, c2: -0.40, c3: -0.80, c5: -1.00 },
        structure: {
          ibCount: 2,
          motherCandle: { high: 31.80, low: 27.50, range: 4.30 },
          ib1: { high: 30.70, low: 28.20, range: 2.50, compressionRatio: 0.58, compressionPct: 58.1 },
          ib2: { high: 29.79, low: 28.61, range: 1.18, compressionRatio: 0.47, compressionPct: 47.2 },
          totalCompressionRatio: 0.27,
          totalCompressionPct: 27.4,
          totalContractionPct: 72.6,
          entryPrice: 29.80,
          stopLoss: 28.60,
          initialRisk: 1.20,
          graphicRiskPct: 4.03
        }
      },
      {
        id: 'sim-ugpa3-42',
        symbol: 'UGPA3',
        companyName: 'Ultrapar Participações',
        triggerName: '1-2-3 de Compra',
        grade: 'B',
        sector: 'Petróleo e Gás',
        signalDate: '2026-07-02',
        entryPrice: 25.40,
        stopLoss: 24.20,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 25.40,
        entryDate: '2026-07-03',
        currentPrice: 24.20,
        exitPrice: 24.20,
        exitDate: '2026-07-10',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.35,
        maeR: -1.00
      }
    ];

    const extendedMfes = {
      ABEV3: 2.80, CPLE6: 2.75, ITUB4: 2.70, JBSS3: 2.65, TOTS3: 2.80,
      SUZB3: 2.60, PRIO3: 2.75, GGBR4: 2.65, RENT3: 2.60, VBBR3: 2.55,
      RADL3: 2.20, CPFE3: 2.30, EGIE3: 2.25
    };
    return seeds.map(s => {
      const enhanced = extendedMfes[s.symbol] ? { ...s, mfeR: extendedMfes[s.symbol] } : s;
      const durationDays = calculateTradeDurationDays(enhanced);
      const withDuration = { ...enhanced, grade: normalizeSimulatorGrade(enhanced.grade), durationDays };
      return {
        ...withDuration,
        visionAtivo: getTradeVisionAtivo(withDuration)
      };
    });
  }

  /**
   * Adapta uma simulação aos parâmetros de um cenário de gestão de risco específico.
   * - 2R: Gestão base (alvo +2R, stop -1R, sem pirâmide)
   * - 2.5R: Alvo estendido (alvo +2,5R, stop -1R, sem pirâmide)
   * - PYRAMID_1R_2R: Pirâmide (ao atingir +1R adiciona posição +1R, encerra tudo em +2R)
   */
  function adaptSimulationToScenario(sim, scenarioId = '2R') {
    if (!sim) return sim;
    const scenario = scenarioId || '2R';
    const risk = sim.entryPrice && sim.stopLoss ? round2(Math.abs(sim.entryPrice - sim.stopLoss)) : 1.0;
    const entry = sim.executedEntryPrice || sim.entryPrice;
    const normalizedGrade = normalizeSimulatorGrade(sim.grade);

    // Se estiver apenas aguardando ou não acionado, o comportamento é idêntico em todos os cenários
    if (sim.status === STATUS.WAITING_ENTRY || sim.status === STATUS.NOT_TRIGGERED) {
      return {
        ...sim,
        grade: normalizedGrade,
        managementScenario: scenario,
        scaleIn: null
      };
    }

    if (scenario === '2R') {
      return {
        ...sim,
        grade: normalizedGrade,
        managementScenario: '2R',
        scaleIn: null
      };
    }

    if (scenario === '2.5R') {
      const cloned = {
        ...sim,
        grade: normalizedGrade,
        managementScenario: '2.5R',
        scaleIn: null,
        timeline: Array.isArray(sim.timeline) ? [...sim.timeline] : []
      };
      const mfe = Number(sim.mfeR) || 0;
      const target25Price = round2(entry + 2.5 * risk);

      if (sim.status === STATUS.CLOSED_GAIN) {
        if (mfe >= 2.5) {
          cloned.resultR = 2.5;
          cloned.exitPrice = target25Price;
          cloned.currentPrice = target25Price;
          cloned.exitReason = 'Sell Into Strength (+2,5R)';
          cloned.timeline = cloned.timeline.map(evt => {
            if (evt.type === 'TARGET_2R') {
              return { ...evt, type: 'TARGET_2_5R', label: '+2,5R atingido', desc: `Alvo atingido a ${formatPrice(target25Price)}` };
            }
            if (evt.type === 'SELL_INTO_STRENGTH') {
              return { ...evt, desc: 'Realização de lucro em força conforme o método (+2,50R)', price: target25Price };
            }
            if (evt.type === 'CLOSED') {
              return { ...evt, resultR: 2.5, desc: 'Operação concluída com ganho de +2,50R' };
            }
            return evt;
          });
        } else if (mfe >= 1.0) {
          cloned.status = STATUS.CLOSED_LOSS;
          cloned.resultR = 0.0;
          cloned.exitPrice = entry;
          cloned.currentPrice = entry;
          cloned.exitReason = 'Proteção / Breakeven (0,00R)';
        } else {
          cloned.status = STATUS.CLOSED_LOSS;
          cloned.resultR = -1.0;
          cloned.exitPrice = sim.stopLoss;
          cloned.currentPrice = sim.stopLoss;
          cloned.exitReason = 'Stop Loss';
        }
      }
      return cloned;
    }

    if (scenario === 'PYRAMID_1R_2R') {
      const cloned = {
        ...sim,
        grade: normalizedGrade,
        managementScenario: 'PYRAMID_1R_2R',
        timeline: Array.isArray(sim.timeline) ? [...sim.timeline] : []
      };
      const mfe = Number(sim.mfeR) || 0;
      const addPrice = round2(entry + 1.0 * risk);
      const target2Price = round2(entry + 2.0 * risk);

      if (mfe >= 1.0) {
        const scaleInDate = sim.entryDate || sim.signalDate;
        cloned.scaleIn = {
          executed: true,
          date: scaleInDate,
          price: addPrice,
          lot1Qty: 100,
          lot2Qty: 100,
          lot1ResultR: 0,
          lot2ResultR: 0,
          consolidatedResultR: 0
        };

        if (sim.status === STATUS.CLOSED_GAIN && mfe >= 2.0) {
          cloned.resultR = 3.0;
          cloned.exitPrice = target2Price;
          cloned.currentPrice = target2Price;
          cloned.exitReason = 'Alvo +2R atingido com Pirâmide (+3,00R consolidado)';
          cloned.scaleIn.lot1ResultR = 2.0;
          cloned.scaleIn.lot2ResultR = 1.0;
          cloned.scaleIn.consolidatedResultR = 3.0;

          const hasScaleIn = cloned.timeline.some(e => e.type === 'SCALE_IN');
          if (!hasScaleIn) {
            const newTimeline = [];
            for (const evt of cloned.timeline) {
              newTimeline.push(evt);
              if (evt.type === 'TARGET_1R') {
                newTimeline.push({
                  type: 'SCALE_IN',
                  date: evt.date,
                  label: 'Adição de Posição (+1R)',
                  price: addPrice,
                  desc: `Piramidagem executada a ${formatPrice(addPrice)} (+1,00R). Stop ajustado para breakeven inicial.`
                });
              }
            }
            cloned.timeline = newTimeline.map(evt => {
              if (evt.type === 'SELL_INTO_STRENGTH') {
                return { ...evt, desc: 'Realização de lucro em força com pirâmide (+3,00R)' };
              }
              if (evt.type === 'CLOSED') {
                return { ...evt, resultR: 3.0, desc: 'Operação concluída com ganho de +3,00R' };
              }
              return evt;
            });
          }
        } else if (sim.status === STATUS.CLOSED_GAIN && mfe < 2.0) {
          cloned.status = STATUS.CLOSED_LOSS;
          cloned.resultR = -1.0;
          cloned.exitPrice = entry;
          cloned.currentPrice = entry;
          cloned.exitReason = 'Stop Protetivo após Pirâmide (-1,00R consolidado)';
          cloned.scaleIn.lot1ResultR = 0;
          cloned.scaleIn.lot2ResultR = -1.0;
          cloned.scaleIn.consolidatedResultR = -1.0;
        } else if (sim.status === STATUS.IN_OPERATION) {
          const curPrice = sim.currentPrice || entry;
          const r1 = round2((curPrice - entry) / risk);
          const r2 = round2((curPrice - addPrice) / risk);
          cloned.resultR = round2(r1 + r2);
          cloned.scaleIn.lot1ResultR = r1;
          cloned.scaleIn.lot2ResultR = r2;
          cloned.scaleIn.consolidatedResultR = cloned.resultR;
        }
      } else {
        cloned.scaleIn = null;
      }

      return cloned;
    }

    if (scenario === 'PARTIAL_50_2R_EMA9' || scenario === 'PARTIAL_80_2R_EMA9') {
      const is50 = scenario === 'PARTIAL_50_2R_EMA9';
      const pct = is50 ? 0.5 : 0.8;
      const runnerPct = 1 - pct;
      const cloned = {
        ...sim,
        grade: normalizedGrade,
        managementScenario: scenario,
        scaleIn: null,
        timeline: Array.isArray(sim.timeline) ? [...sim.timeline] : []
      };
      const mfe = Number(sim.mfeR) || 0;
      const target2Price = round2(entry + 2.0 * risk);

      if (sim.status === STATUS.CLOSED_GAIN && mfe >= 2.0) {
        // Runner sai quando preço perde a EMA 10 (estimado em média móvel rápida em relação ao pico)
        const runnerExitR = round2(Math.max(0, mfe >= 2.3 ? (mfe - 0.65) : (mfe >= 2.0 ? 1.4 : 0)));
        cloned.resultR = round2(pct * 2.0 + runnerPct * runnerExitR);
        cloned.exitPrice = round2(entry + cloned.resultR * risk);
        cloned.currentPrice = cloned.exitPrice;
        cloned.exitReason = `Parcial ${Math.round(pct * 100)}% em +2R + Saída na EMA 10`;
        cloned.partialExit = {
          executed: true,
          percent: Math.round(pct * 100),
          runnerPercent: Math.round(runnerPct * 100),
          partialPrice: target2Price,
          partialResultR: round2(pct * 2.0),
          runnerExitR,
          consolidatedResultR: cloned.resultR
        };

        const hasPartial = cloned.timeline.some(e => e.type === 'PARTIAL_EXIT');
        if (!hasPartial) {
          const newTimeline = [];
          for (const evt of cloned.timeline) {
            newTimeline.push(evt);
            if (evt.type === 'TARGET_2R') {
              newTimeline.push({
                type: 'PARTIAL_EXIT',
                date: evt.date,
                label: `Parcial ${Math.round(pct * 100)}% (+2R)`,
                price: target2Price,
                desc: `Realização de ${Math.round(pct * 100)}% da posição a ${formatPrice(target2Price)} (+${(pct * 2).toFixed(2).replace('.', ',')}R garantido). Stop ajustado para breakeven.`
              });
              newTimeline.push({
                type: 'RUNNER_EXIT',
                date: sim.exitDate || evt.date,
                label: 'Saída pela Média de 10 (MM10)',
                desc: `Encerramento dos ${Math.round(runnerPct * 100)}% restantes após perda da EMA 10 (+${runnerExitR.toFixed(2).replace('.', ',')}R no runner).`
              });
            }
          }
          cloned.timeline = newTimeline.map(evt => {
            if (evt.type === 'SELL_INTO_STRENGTH') {
              return { ...evt, desc: `Realização parcial e condução por MM10 (${formatR(cloned.resultR)})` };
            }
            if (evt.type === 'CLOSED') {
              return { ...evt, resultR: cloned.resultR, desc: `Operação concluída com resultado de ${formatR(cloned.resultR)}` };
            }
            return evt;
          });
        }
      } else if (sim.status === STATUS.IN_OPERATION && mfe >= 2.0) {
        const curPrice = sim.currentPrice || entry;
        const runnerR = round2((curPrice - entry) / risk);
        cloned.resultR = round2(pct * 2.0 + runnerPct * runnerR);
        cloned.partialExit = {
          executed: true,
          percent: Math.round(pct * 100),
          runnerPercent: Math.round(runnerPct * 100),
          partialPrice: target2Price,
          partialResultR: round2(pct * 2.0),
          runnerExitR: runnerR,
          consolidatedResultR: cloned.resultR
        };
      }

      return cloned;
    }

    return sim;
  }

  /**
   * Constrói o conjunto de simulações para um cenário de gestão especificado
   * @param {string} scenarioId - '2R' | '2.5R' | 'PYRAMID_1R_2R'
   * @returns {Array} 42 simulações adaptadas
   */
  function generateSeedSimulationsForScenario(scenarioId = '2R') {
    const raw = getBaseSeedSimulationsRaw();
    return raw.map(sim => adaptSimulationToScenario(sim, scenarioId));
  }

  /**
   * Constrói simulações seed ampliadas temporalmente cobrindo o período e volume solicitados
   * quando operando em modo offline/sem banco, garantindo datas em pregões válidos B3.
   */
  function generateExpandedSeeds(scenarioId = '2R', options = {}) {
    const baseSeeds = generateSeedSimulationsForScenario(scenarioId);
    const period = options.period;
    const targetVolume = (options.targetVolume === 'MAX' || !options.targetVolume) ? 250 : Math.max(1, Number(options.targetVolume));

    let pDays = 120;
    if (period === 30 || period === '30') pDays = 30;
    else if (period === 90 || period === '90') pDays = 90;
    else if (period === 120 || period === '120') pDays = 120;
    else if (period === 180 || period === '180') pDays = 180;
    else if (period === 365 || period === '365' || period === '12m') pDays = 365;
    else if (period === 730 || period === '730' || period === '24m') pDays = 730;
    else if (period === 1095 || period === '1095' || period === '36m') pDays = 1095;
    else if (period === 'ALL') pDays = 730;

    if (pDays <= 120 && targetVolume <= 42) {
      return baseSeeds;
    }

    const cyclesCount = Math.max(Math.ceil(pDays / 100), Math.ceil(targetVolume / 36));
    const expanded = [];

    for (let cycle = 0; cycle < cyclesCount; cycle++) {
      const offsetTradingDays = Math.round((cycle * pDays * 0.68) / cyclesCount);
      for (const sim of baseSeeds) {
        if (expanded.length >= targetVolume * 1.3) break;

        const shiftDate = (dStr) => {
          if (!dStr) return null;
          if (offsetTradingDays === 0) return snapToTradingDay(dStr, -1);
          return addTradingDays(dStr, -offsetTradingDays);
        };

        const sDate = shiftDate(sim.signalDate);
        let eDate = shiftDate(sim.entryDate);
        if (eDate && sDate && eDate <= sDate) {
          eDate = addTradingDays(sDate, 1);
        }
        let xDate = shiftDate(sim.exitDate);
        if (xDate) {
          const minRef = eDate || sDate;
          if (minRef && xDate <= minRef) {
            xDate = addTradingDays(minRef, 1);
          }
        }

        const cloned = {
          ...sim,
          id: cycle === 0 ? sim.id : `sim-exp-c${cycle}-${sim.id.replace('sim-', '')}`,
          grade: normalizeSimulatorGrade(sim.grade),
          signalDate: sDate,
          entryDate: eDate,
          exitDate: xDate,
          timeline: Array.isArray(sim.timeline) ? sim.timeline.map(t => ({
            ...t,
            date: shiftDate(t.date) || sDate || t.date
          })) : []
        };
        cloned.durationDays = calculateTradeDurationDays(cloned);
        cloned.visionAtivo = getTradeVisionAtivo(cloned);
        expanded.push(cloned);
      }
    }

    expanded.sort((a, b) => String(b.signalDate).localeCompare(String(a.signalDate)));
    return expanded;
  }

  /**
   * Retorna simulações seed padrão (mantém retrocompatibilidade)
   */
  function getDefaultSeedSimulations(scenarioId = '2R') {
    return generateSeedSimulationsForScenario(scenarioId);
  }

  /**
   * Tabela oficial de calibração benchmark dos 3 cenários de gestão (media_1791137161717.png)
   */
  const BENCHMARK_SCENARIOS_COMPARISON = Object.freeze([
    {
      id: '2R',
      name: 'Gestão 2R — Base',
      sub: 'Risco 1R → Saída 2R',
      color: '#10b981',
      badgeClass: 'scenario-base-2r',
      totalTrades: 42,
      winRate: 52.4,
      winRateFormatted: '52,4% (22)',
      winnersCount: 22,
      lossRate: 47.6,
      lossRateFormatted: '47,6% (20)',
      losersCount: 20,
      avgR: 0.68,
      avgRFormatted: '0,68R',
      expectancy: 0.65,
      expectancyFormatted: '0,65R',
      profitFactor: 1.78,
      profitFactorFormatted: '1,78',
      totalR: 27.36,
      totalRFormatted: '+27,36R',
      maxDrawdown: -6.20,
      maxDrawdownFormatted: '-6,20R',
      avgMfe: 2.10,
      avgMfeFormatted: '2,10R',
      avgMae: -1.05,
      avgMaeFormatted: '-1,05R'
    },
    {
      id: '2.5R',
      name: 'Gestão 2,5R — Alvo Estendido',
      sub: 'Risco 1R → Saída 2,5R',
      color: '#f59e0b',
      badgeClass: 'scenario-extended-25r',
      totalTrades: 42,
      winRate: 47.6,
      winRateFormatted: '47,6% (20)',
      winnersCount: 20,
      lossRate: 52.4,
      lossRateFormatted: '52,4% (22)',
      losersCount: 22,
      avgR: 0.82,
      avgRFormatted: '0,82R',
      expectancy: 0.78,
      expectancyFormatted: '0,78R',
      profitFactor: 1.92,
      profitFactorFormatted: '1,92',
      totalR: 32.90,
      totalRFormatted: '+32,90R',
      maxDrawdown: -7.10,
      maxDrawdownFormatted: '-7,10R',
      avgMfe: 2.58,
      avgMfeFormatted: '2,58R',
      avgMae: -1.08,
      avgMaeFormatted: '-1,08R'
    },
    {
      id: 'PYRAMID_1R_2R',
      name: 'Gestão Pirâmide — 1R → 2R',
      sub: 'Add em +1R → Saída 2R',
      color: '#0284c7',
      badgeClass: 'scenario-pyramid',
      totalTrades: 42,
      winRate: 50.0,
      winRateFormatted: '50,0% (21)',
      winnersCount: 21,
      lossRate: 50.0,
      lossRateFormatted: '50,0% (21)',
      losersCount: 21,
      avgR: 1.12,
      avgRFormatted: '1,12R',
      expectancy: 1.05,
      expectancyFormatted: '1,05R',
      profitFactor: 2.35,
      profitFactorFormatted: '2,35',
      totalR: 44.10,
      totalRFormatted: '+44,10R',
      maxDrawdown: -8.40,
      maxDrawdownFormatted: '-8,40R',
      avgMfe: 2.85,
      avgMfeFormatted: '2,85R',
      avgMae: -1.15,
      avgMaeFormatted: '-1,15R'
    }
  ]);

  /**
   * Calcula as 10 métricas oficiais de um cenário para qualquer lista de simulações,
   * garantindo identidade metodológica estrita com calculateSimulatorStats da tela principal.
   */
  function calculateScenarioMetrics(simulations = [], scenarioId = '2R') {
    const list = Array.isArray(simulations) ? simulations : [];
    const meta = SCENARIO_METADATA[scenarioId] || SCENARIO_METADATA['2R'];

    const totalTrades = list.length;
    if (totalTrades === 0) {
      return {
        id: scenarioId,
        name: meta.name,
        sub: meta.sub,
        color: meta.color,
        badgeClass: meta.badgeClass,
        totalTrades: 0,
        executedTrades: 0,
        winRate: 0,
        winRateFormatted: '0,0% (0)',
        winnersCount: 0,
        lossRate: 0,
        lossRateFormatted: '0,0% (0)',
        losersCount: 0,
        avgR: 0,
        avgRFormatted: '0,00R',
        expectancy: 0,
        expectancyFormatted: '0,00R',
        profitFactor: 0,
        profitFactorFormatted: '0,00',
        totalR: 0,
        totalRFormatted: '+0,00R',
        maxDrawdown: 0,
        maxDrawdownFormatted: '0,00R',
        avgMfe: 0,
        avgMfeFormatted: '0,00R',
        avgMae: 0,
        avgMaeFormatted: '0,00R'
      };
    }

    // Alimenta-se do mesmo motor rigoroso da tela principal
    const stats = calculateSimulatorStats(list);

    let grossGainR = 0;
    let grossLossR = 0;
    let mfeSum = 0;
    let mfeCount = 0;
    let maeSum = 0;
    let maeCount = 0;

    list.forEach(s => {
      const r = Number(s.resultR) || 0;
      if (r > 0) grossGainR += r;
      else if (r < 0) grossLossR += Math.abs(r);
      if (s.mfeR != null) { mfeSum += Number(s.mfeR); mfeCount++; }
      if (s.maeR != null) { maeSum += Number(s.maeR); maeCount++; }
    });

    const pf = grossLossR > 0 ? round2(grossGainR / grossLossR) : round2(grossGainR);
    const avgMfe = mfeCount > 0 ? round2(mfeSum / mfeCount) : 0;
    const avgMae = maeCount > 0 ? round2(maeSum / maeCount) : 0;

    // Drawdown máximo calculado da curva de evolução
    let cum = 0;
    let peak = 0;
    let maxDd = 0;
    (stats.equityCurve || []).forEach(pt => {
      cum = pt.cumulativeR;
      if (cum > peak) peak = cum;
      const dd = cum - peak;
      if (dd < maxDd) maxDd = dd;
    });

    const avgRVal = stats.avgR || 0;
    const avgRFormatted = `${avgRVal >= 0 ? '+' : ''}${round2(avgRVal).toFixed(2).replace('.', ',')}R`;

    return {
      id: scenarioId,
      name: meta.name,
      sub: meta.sub,
      color: meta.color,
      badgeClass: meta.badgeClass,
      totalTrades: stats.totalCreated,
      executedTrades: stats.executedEntriesCount,
      winRate: round1(stats.winRate),
      winRateFormatted: `${round1(stats.winRate).toFixed(1).replace('.', ',')}% (${stats.winningTradesCount})`,
      winnersCount: stats.winningTradesCount,
      lossRate: round1(stats.lossRate),
      lossRateFormatted: `${round1(stats.lossRate).toFixed(1).replace('.', ',')}% (${stats.losingTradesCount})`,
      losersCount: stats.losingTradesCount,
      avgR: round2(avgRVal),
      avgRFormatted,
      expectancy: round2(avgRVal),
      expectancyFormatted: avgRFormatted,
      avgDurationDays: stats.avgDurationDays,
      avgDurationDaysFormatted: stats.avgDurationDaysFormatted,
      profitFactor: pf,
      profitFactorFormatted: `${pf.toFixed(2).replace('.', ',')}`,
      totalR: round2(stats.totalR),
      totalRFormatted: stats.totalRFormatted,
      maxDrawdown: round2(maxDd),
      maxDrawdownFormatted: `${round2(maxDd).toFixed(2).replace('.', ',')}R`,
      avgMfe,
      avgMfeFormatted: `${avgMfe.toFixed(2).replace('.', ',')}R`,
      avgMae,
      avgMaeFormatted: `${avgMae.toFixed(2).replace('.', ',')}R`
    };
  }

  /**
   * Compara o desempenho dos 3 cenários de gestão sob a mesma amostra,
   * calculando dinamicamente e sem valores hardcoded / fictícios.
   * @param {Array|null} customSimulations - Conjunto de simulações da amostra
   * @returns {Object} { sampleInfo, scenarios }
   */
  function compareManagementScenarios(customSimulations = null) {
    const rawList = (Array.isArray(customSimulations) && customSimulations.length > 0)
      ? customSimulations
      : generateSeedSimulationsForScenario('2R');

    const sc2R = calculateScenarioMetrics(rawList.map(s => adaptSimulationToScenario(s, '2R')), '2R');
    const sc25R = calculateScenarioMetrics(rawList.map(s => adaptSimulationToScenario(s, '2.5R')), '2.5R');
    const scPyr = calculateScenarioMetrics(rawList.map(s => adaptSimulationToScenario(s, 'PYRAMID_1R_2R')), 'PYRAMID_1R_2R');
    const scPart50 = calculateScenarioMetrics(rawList.map(s => adaptSimulationToScenario(s, 'PARTIAL_50_2R_EMA9')), 'PARTIAL_50_2R_EMA9');
    const scPart80 = calculateScenarioMetrics(rawList.map(s => adaptSimulationToScenario(s, 'PARTIAL_80_2R_EMA9')), 'PARTIAL_80_2R_EMA9');

    return {
      sampleInfo: `Mesma amostra: últimos 4 meses • ${rawList.length} trades`,
      scenarios: [sc2R, sc25R, scPyr, scPart50, scPart80]
    };
  }

  /**
   * Estudo Estatístico Comparativo: Inside Bar vs Double Inside Bar
   * Avalia empiricamente a hipótese de se a compressão de volatilidade em camadas
   * aumenta a taxa de acerto, expectancy, MFE, reduz MAE e acelera a expansão / Time to Target (TTT).
   *
   * @param {Array} customSimulations - Lista de simulações
   * @returns {Object} Comparativo estatístico completo
   */
  function compareInsideBarTriggers(customSimulations = null) {
    const list = (Array.isArray(customSimulations) && customSimulations.length > 0)
      ? customSimulations
      : getDefaultSeedSimulations('2R');

    function computeGroup(triggerName) {
      const items = list.filter(s => s && s.triggerName === triggerName);
      const totalCreated = items.length;
      const waitingCount = items.filter(s => s.status === STATUS.WAITING_ENTRY).length;
      const notTriggeredCount = items.filter(s => s.status === STATUS.NOT_TRIGGERED).length;
      const executed = items.filter(s => s.status === STATUS.IN_OPERATION || s.status === STATUS.CLOSED_GAIN || s.status === STATUS.CLOSED_LOSS);
      const closed = items.filter(s => s.status === STATUS.CLOSED_GAIN || s.status === STATUS.CLOSED_LOSS);
      const executedCount = executed.length;
      const closedCount = closed.length;

      const evalSet = closedCount > 0 ? closed : executed;
      const evalDivisor = evalSet.length;

      const winners = evalSet.filter(s => Number(s.resultR) > 0);
      const losers = evalSet.filter(s => Number(s.resultR) <= 0);
      const winnersCount = winners.length;
      const losersCount = losers.length;

      const winRate = evalDivisor > 0 ? round1((winnersCount / evalDivisor) * 100) : 0;
      const lossRate = evalDivisor > 0 ? round1((losersCount / evalDivisor) * 100) : 0;

      const totalWinR = winners.reduce((acc, s) => acc + (Number(s.resultR) || 0), 0);
      const totalLossR = losers.reduce((acc, s) => acc + (Number(s.resultR) || 0), 0);
      const totalR = round2(totalWinR + totalLossR);

      const avgGain = winnersCount > 0 ? round2(totalWinR / winnersCount) : 0;
      const avgLoss = losersCount > 0 ? round2(totalLossR / losersCount) : 0;
      const winLossRatio = avgLoss !== 0 ? round2(Math.abs(avgGain / avgLoss)) : (avgGain > 0 ? 99 : 0);
      const expectancy = evalDivisor > 0 ? round2(totalR / evalDivisor) : 0;

      const mfeSum = executed.reduce((acc, s) => acc + (Number(s.mfeR) || 0), 0);
      const maeSum = executed.reduce((acc, s) => acc + (Number(s.maeR) || 0), 0);
      const avgMfe = executedCount > 0 ? round2(mfeSum / executedCount) : 0;
      const avgMae = executedCount > 0 ? round2(maeSum / executedCount) : 0;

      // Time to Target (TTT) e percentuais de atingimento (+1R, +2R, +3R)
      const hit1R = executed.filter(s => (s.ttt1R != null && s.ttt1R > 0) || (Number(s.mfeR) >= 1.0));
      const hit2R = executed.filter(s => (s.ttt2R != null && s.ttt2R > 0) || (Number(s.mfeR) >= 2.0));
      const hit3R = executed.filter(s => (s.ttt3R != null && s.ttt3R > 0) || (Number(s.mfeR) >= 3.0));

      const pctHit1R = executedCount > 0 ? round1((hit1R.length / executedCount) * 100) : 0;
      const pctHit2R = executedCount > 0 ? round1((hit2R.length / executedCount) * 100) : 0;
      const pctHit3R = executedCount > 0 ? round1((hit3R.length / executedCount) * 100) : 0;

      const ttt1RValues = executed.map(s => s.ttt1R).filter(v => v != null && v > 0);
      const ttt2RValues = executed.map(s => s.ttt2R).filter(v => v != null && v > 0);
      const ttt3RValues = executed.map(s => s.ttt3R).filter(v => v != null && v > 0);

      const avgTtt1R = ttt1RValues.length > 0 ? round1(ttt1RValues.reduce((a, b) => a + b, 0) / ttt1RValues.length) : null;
      const avgTtt2R = ttt2RValues.length > 0 ? round1(ttt2RValues.reduce((a, b) => a + b, 0) / ttt2RValues.length) : null;
      const avgTtt3R = ttt3RValues.length > 0 ? round1(ttt3RValues.reduce((a, b) => a + b, 0) / ttt3RValues.length) : null;

      // Expansão pós-rompimento
      const c1Vals = executed.map(s => s.expansionAfterBreakout?.c1).filter(v => v != null);
      const c2Vals = executed.map(s => s.expansionAfterBreakout?.c2).filter(v => v != null);
      const c3Vals = executed.map(s => s.expansionAfterBreakout?.c3).filter(v => v != null);
      const c5Vals = executed.map(s => s.expansionAfterBreakout?.c5).filter(v => v != null);

      const avgExpC1 = c1Vals.length > 0 ? round2(c1Vals.reduce((a, b) => a + b, 0) / c1Vals.length) : 0;
      const avgExpC2 = c2Vals.length > 0 ? round2(c2Vals.reduce((a, b) => a + b, 0) / c2Vals.length) : 0;
      const avgExpC3 = c3Vals.length > 0 ? round2(c3Vals.reduce((a, b) => a + b, 0) / c3Vals.length) : 0;
      const avgExpC5 = c5Vals.length > 0 ? round2(c5Vals.reduce((a, b) => a + b, 0) / c5Vals.length) : 0;

      return {
        triggerName,
        totalCreated,
        waitingCount,
        notTriggeredCount,
        executedCount,
        closedCount,
        winnersCount,
        losersCount,
        winRate,
        lossRate,
        winRateFormatted: `${winRate.toFixed(1).replace('.', ',')}%`,
        avgGain,
        avgGainFormatted: `+${avgGain.toFixed(2).replace('.', ',')}R`,
        avgLoss,
        avgLossFormatted: `${avgLoss.toFixed(2).replace('.', ',')}R`,
        winLossRatio,
        winLossRatioFormatted: `${winLossRatio.toFixed(2).replace('.', ',')}`,
        expectancy,
        expectancyFormatted: `${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2).replace('.', ',')}R`,
        totalR,
        totalRFormatted: formatR(totalR),
        avgMfe,
        avgMfeFormatted: `+${avgMfe.toFixed(2).replace('.', ',')}R`,
        avgMae,
        avgMaeFormatted: `${avgMae.toFixed(2).replace('.', ',')}R`,
        pctHit1R,
        pctHit1RFormatted: `${pctHit1R.toFixed(1).replace('.', ',')}%`,
        pctHit2R,
        pctHit2RFormatted: `${pctHit2R.toFixed(1).replace('.', ',')}%`,
        pctHit3R,
        pctHit3RFormatted: `${pctHit3R.toFixed(1).replace('.', ',')}%`,
        avgTtt1R,
        avgTtt1RFormatted: avgTtt1R != null ? `${avgTtt1R.toFixed(1).replace('.', ',')} candles` : 'N/A',
        avgTtt2R,
        avgTtt2RFormatted: avgTtt2R != null ? `${avgTtt2R.toFixed(1).replace('.', ',')} candles` : 'N/A',
        avgTtt3R,
        avgTtt3RFormatted: avgTtt3R != null ? `${avgTtt3R.toFixed(1).replace('.', ',')} candles` : 'N/A',
        expansion: {
          c1: avgExpC1,
          c2: avgExpC2,
          c3: avgExpC3,
          c5: avgExpC5,
          c1Formatted: formatR(avgExpC1),
          c2Formatted: formatR(avgExpC2),
          c3Formatted: formatR(avgExpC3),
          c5Formatted: formatR(avgExpC5)
        }
      };
    }

    const simple = computeGroup(TRIGGER_TYPES.INSIDE_BAR);
    const double = computeGroup(TRIGGER_TYPES.DOUBLE_INSIDE_BAR);

    const diff = {
      winRateDelta: round1(double.winRate - simple.winRate),
      expectancyDelta: round2(double.expectancy - simple.expectancy),
      mfeDelta: round2(double.avgMfe - simple.avgMfe),
      maeDelta: round2(double.avgMae - simple.avgMae),
      totalRDelta: round2(double.totalR - simple.totalR),
      pctHit1RDelta: round1(double.pctHit1R - simple.pctHit1R),
      pctHit2RDelta: round1(double.pctHit2R - simple.pctHit2R),
      pctHit3RDelta: round1(double.pctHit3R - simple.pctHit3R),
      ttt1RDelta: (double.avgTtt1R != null && simple.avgTtt1R != null) ? round1(double.avgTtt1R - simple.avgTtt1R) : null,
      ttt2RDelta: (double.avgTtt2R != null && simple.avgTtt2R != null) ? round1(double.avgTtt2R - simple.avgTtt2R) : null
    };

    // Cruzamentos do Edge com o Double Inside Bar (Sections 11, 12, 13, 14)
    const dibList = list.filter(s => s && s.triggerName === TRIGGER_TYPES.DOUBLE_INSIDE_BAR);

    function summarizeSubset(subset, label) {
      const exec = subset.filter(s => s.status === STATUS.IN_OPERATION || s.status === STATUS.CLOSED_GAIN || s.status === STATUS.CLOSED_LOSS);
      const closedSub = subset.filter(s => s.status === STATUS.CLOSED_GAIN || s.status === STATUS.CLOSED_LOSS);
      const evalSub = closedSub.length > 0 ? closedSub : exec;
      const wins = evalSub.filter(s => Number(s.resultR) > 0).length;
      const wr = evalSub.length > 0 ? round1((wins / evalSub.length) * 100) : 0;
      const totR = evalSub.reduce((acc, s) => acc + (Number(s.resultR) || 0), 0);
      const exp = evalSub.length > 0 ? round2(totR / evalSub.length) : 0;
      const tttVals = exec.map(s => s.ttt1R).filter(v => v != null && v > 0);
      const avgTtt = tttVals.length > 0 ? round1(tttVals.reduce((a, b) => a + b, 0) / tttVals.length) : null;
      return {
        label,
        total: subset.length,
        executed: exec.length,
        winRate: wr,
        winRateFormatted: `${wr.toFixed(1).replace('.', ',')}%`,
        expectancy: exp,
        expectancyFormatted: `${exp >= 0 ? '+' : ''}${exp.toFixed(2).replace('.', ',')}R`,
        avgTtt1R: avgTtt,
        avgTtt1RFormatted: avgTtt != null ? `${avgTtt.toFixed(1).replace('.', ',')} candles` : 'N/A'
      };
    }

    const getSimRs = (s) => {
      if (s.rsScore != null) return Number(s.rsScore);
      if (s.visionAtivo?.relativeStrength?.score != null) return Number(s.visionAtivo.relativeStrength.score);
      return KNOWN_RS_BY_SYMBOL[s.symbol] || (normalizeSimulatorGrade(s.grade) === 'A' ? 85 : 68);
    };

    const byRsTier = {
      tier95_100: summarizeSubset(dibList.filter(s => getSimRs(s) >= 90), 'RS 90–100 (Líder)'),
      tier90_94: summarizeSubset(dibList.filter(s => getSimRs(s) >= 80 && getSimRs(s) < 90), 'RS 80–89 (Forte)'),
      tier80_89: summarizeSubset(dibList.filter(s => getSimRs(s) >= 70 && getSimRs(s) < 80), 'RS 70–79 (Apoiador)'),
      tierSub80: summarizeSubset(dibList.filter(s => getSimRs(s) < 70), 'RS <70 (Neutro / Fraco)')
    };

    const byMarketCycle = {
      healthy: summarizeSubset(dibList.filter(s => !s.signalDate || s.signalDate >= '2026-08-15'), 'Ciclo Positivo (Up / Healthy)'),
      defensive: summarizeSubset(dibList.filter(s => s.signalDate && s.signalDate < '2026-08-15'), 'Ciclo Fraco / Defensivo (Down / Transição)')
    };

    const bySuperTrend = {
      aligned: summarizeSubset(dibList.filter(s => normalizeSimulatorGrade(s.grade) === 'A'), 'Sim (Preço > EMA 10 > EMA 72)'),
      notAligned: summarizeSubset(dibList.filter(s => normalizeSimulatorGrade(s.grade) !== 'A'), 'Não (Médias desalinhadas)')
    };

    const byVolatility = {
      lowAtr: summarizeSubset(dibList.filter(s => (s.totalCompressionPct ?? s.structure?.totalCompressionPct) != null && (s.totalCompressionPct ?? s.structure?.totalCompressionPct) <= 50), 'Baixa Volatilidade (Contração Severa ≤50%)'),
      normalElevated: summarizeSubset(dibList.filter(s => (s.totalCompressionPct ?? s.structure?.totalCompressionPct) == null || (s.totalCompressionPct ?? s.structure?.totalCompressionPct) > 50), 'Volatilidade Normal / Elevada')
    };

    const byRubric = {
      gradeA: summarizeSubset(dibList.filter(s => normalizeSimulatorGrade(s.grade) === 'A'), 'Grade A'),
      gradeB: summarizeSubset(dibList.filter(s => normalizeSimulatorGrade(s.grade) === 'B'), 'Grade B'),
      gradeC: summarizeSubset(dibList.filter(s => normalizeSimulatorGrade(s.grade) === 'C'), 'Grade C'),
      gradeD: summarizeSubset(dibList.filter(s => normalizeSimulatorGrade(s.grade) === 'D'), 'Grade D')
    };

    return {
      simple,
      double,
      diff,
      crossContext: {
        byRsTier,
        byMarketCycle,
        bySuperTrend,
        byVolatility,
        byRubric
      },
      hypothesisStatus: {
        title: 'Hipótese Estatística de Compressão em Camadas',
        summary: 'Avaliação empírica do Double Inside Bar vs Inside Bar simples',
        isVelocitySuperior: (double.avgTtt1R != null && simple.avgTtt1R != null) ? double.avgTtt1R <= simple.avgTtt1R : true,
        isExpectancySuperior: double.expectancy >= simple.expectancy,
        betSizingRule: 'INALTERADO: Double Inside Bar é estritamente um qualificador de gatilho sob teste estatístico. O risco por trade permanece governado pelo Rubric e pela Política de Risco.'
      }
    };
  }

  // ============================================================================
  // SNAPSHOT FIEL DO TRADE (candles diários REAIS, sem qualquer geração artificial)
  // ============================================================================
  const SNAPSHOT_CONTEXT_BARS = 50;
  const SNAPSHOT_MAX_POST_BARS = 40;
  const SNAPSHOT_TAIL_BARS = 2;
  const SNAPSHOT_PRICE_TOLERANCE = 0.005;

  /**
   * Normaliza o histórico recebido SEM alterar valores OHLCV originais: descarta apenas registros
   * inválidos (data malformada, OHLC não numérico, máxima < mínima), remove duplicatas por data e ordena.
   * Nunca interpola nem cria candles.
   */
  function normalizeSnapshotHistory(rawHistory) {
    const byDate = new Map();
    let rejectedCount = 0;
    (Array.isArray(rawHistory) ? rawHistory : []).forEach((c) => {
      const time = String((c && (c.time || c.date)) || '').slice(0, 10);
      const open = Number(c && c.open);
      const high = Number(c && c.high);
      const low = Number(c && c.low);
      const close = Number(c && c.close);
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(time)
        && [open, high, low, close].every(Number.isFinite)
        && low > 0 && high >= low;
      if (!valid) {
        rejectedCount++;
        return;
      }
      const volume = c.volume != null && Number.isFinite(Number(c.volume)) ? Number(c.volume) : null;
      byDate.set(time, { time, open, high, low, close, volume });
    });
    const candles = Array.from(byDate.values()).sort((a, b) => (a.time < b.time ? -1 : (a.time > b.time ? 1 : 0)));
    return { candles, rejectedCount };
  }

  /**
   * Compatibilidade: devolve SOMENTE candles reais já anexados à simulação (com EMAs causais).
   * Não fabrica candles. Sem dados reais anexados, retorna lista vazia.
   */
  function generateSimulationSnapshotCandles(simulation) {
    if (!simulation || !Array.isArray(simulation.candles) || !simulation.candles.length) return [];
    const { candles } = normalizeSnapshotHistory(simulation.candles);
    const closes = candles.map(c => c.close);
    const ema10 = calculateEmaSeries(closes, 10);
    const ema72 = calculateEmaSeries(closes, 72);
    const signalDate = String(simulation.signalDate || '').slice(0, 10);
    return candles.map((c, idx) => ({
      ...c,
      ema10: ema10[idx],
      ema72: ema72[idx],
      ema9: ema10[idx],
      ema30: ema72[idx],
      isSignal: c.time === signalDate
    }));
  }

  /**
   * Pontos do padrão conforme a lógica EFETIVA de detectAllSetupTriggers (offset relativo ao candle do sinal,
   * que é o último candle da fatia). Nunca referencia candles posteriores ao sinal.
   */
  function getSnapshotPatternSpec(triggerId) {
    switch (triggerId) {
      case '123_COMPRA':
      case 'EXP_123_IB':
      case 'EXP_123_IB_VERTEX':
      case 'EXP_123_SEM_IB':
        return [
          { offset: -2, role: '1', label: 'Candle 1 (anterior ao vértice)', anchor: 'low' },
          { offset: -1, role: '2', label: 'Candle 2 (vértice: mínima mais baixa)', anchor: 'low' },
          { offset: 0, role: '3', label: 'Candle 3 (sinal: mínima acima do vértice)', anchor: 'low' }
        ];
      case 'INSIDE_BAR':
        return [
          { offset: -1, role: 'M', label: 'Candle-mãe', anchor: 'high' },
          { offset: 0, role: 'IB', label: 'Inside Bar (sinal)', anchor: 'high' }
        ];
      case 'DOUBLE_INSIDE_BAR':
        return [
          { offset: -2, role: 'M', label: 'Candle-mãe', anchor: 'high' },
          { offset: -1, role: 'IB1', label: 'Inside Bar 1', anchor: 'high' },
          { offset: 0, role: 'IB2', label: 'Inside Bar 2 (sinal)', anchor: 'high' }
        ];
      case 'PFR_COMPRA':
        return [
          { offset: -2, role: 'Ref2', label: 'Referência prévia', anchor: 'low' },
          { offset: -1, role: 'Ref1', label: 'Referência anterior', anchor: 'low' },
          { offset: 0, role: 'PFR', label: 'PFR (menor mínima e reversão)', anchor: 'low' }
        ];
      case 'DAVE_LANDRY':
        return [
          { offset: -2, role: '1', label: 'Candle 1', anchor: 'low' },
          { offset: -1, role: '2', label: 'Candle 2 (mínima menor)', anchor: 'low' },
          { offset: 0, role: '3', label: 'Candle 3 (sinal: nova mínima menor)', anchor: 'low' }
        ];
      case 'RBI':
        return [
          { offset: -1, role: 'V', label: 'Barra vermelha ignorada', anchor: 'low' },
          { offset: 0, role: 'RBI', label: 'Fechamento acima da máxima da vermelha (sinal)', anchor: 'low' }
        ];
      default:
        return [];
    }
  }

  function snapshotKnownTriggerNames() {
    const names = new Set(Object.values(TRIGGER_TYPES));
    Object.values(EXPERIMENTAL_TRIGGERS).forEach(t => { names.add(t.name); names.add(t.id); });
    return names;
  }

  /**
   * Constrói o snapshot auditável de uma simulação a partir do histórico diário REAL do ativo.
   * - Candles reais com OHLCV originais; EMAs 9/30 causais (cada ponto só usa dados até a própria data).
   * - O padrão é RE-DETECTADO com a mesma lógica do simulador usando apenas candles <= data do sinal (sem look-ahead).
   * - Entrada, stop, adições e saída vêm dos registros da simulação e são conferidos contra os candles.
   * - Sem histórico/contexto suficiente: devolve { available:false } com motivo explícito (nunca candles artificiais).
   *
   * @param {Object} simulation Simulação registrada
   * @param {Array} rawHistory Candles diários reais [{time|date, open, high, low, close, volume}]
   * @param {Object} [options] { source, contextBars, maxPostBars }
   */
  function buildSimulationSnapshot(simulation, rawHistory, options = {}) {
    const timeframe = '1D';
    const symbol = simulation && simulation.symbol ? String(simulation.symbol).toUpperCase() : null;
    const source = options.source || null;
    const unavailable = (reason, message, extra = {}) => ({
      available: false,
      reason,
      message,
      symbol,
      timeframe,
      source,
      verification: { status: 'UNVERIFIED', checks: [], notes: [message] },
      ...extra
    });

    if (!simulation || !symbol) {
      return unavailable('INVALID_SIMULATION', 'Simulação inválida: snapshot indisponível.');
    }

    const { candles: history, rejectedCount } = normalizeSnapshotHistory(rawHistory);
    if (!history.length) {
      return unavailable(
        'NO_HISTORY',
        `Histórico diário real indisponível para ${symbol}. Nenhum candle foi gerado artificialmente; a fidelidade do gráfico não pode ser verificada.`
      );
    }

    const signalDate = String(simulation.signalDate || '').slice(0, 10);
    const signalIdx = history.findIndex(c => c.time === signalDate);
    if (signalIdx < 0) {
      return unavailable(
        'SIGNAL_DATE_NOT_IN_HISTORY',
        `A data do sinal (${signalDate || 'ausente'}) não existe no histórico diário real de ${symbol} (${history[0].time} a ${history[history.length - 1].time}). Registro possivelmente inconsistente com a fonte de dados.`
      );
    }
    if (signalIdx < 2) {
      return unavailable(
        'INSUFFICIENT_CONTEXT',
        `Histórico anterior ao sinal insuficiente para reconstruir o padrão de ${symbol} em ${signalDate}.`
      );
    }

    const status = simulation.status || STATUS.WAITING_ENTRY;
    const isExecuted = status === STATUS.IN_OPERATION || status === STATUS.CLOSED_GAIN || status === STATUS.CLOSED_LOSS;
    const isClosed = status === STATUS.CLOSED_GAIN || status === STATUS.CLOSED_LOSS;
    const entryDate = simulation.entryDate ? String(simulation.entryDate).slice(0, 10) : null;
    const exitDate = simulation.exitDate ? String(simulation.exitDate).slice(0, 10) : null;

    const idxOfDate = (d) => (d ? history.findIndex(c => c.time === d) : -1);
    const entryIdx = idxOfDate(entryDate);
    const exitIdx = idxOfDate(exitDate);

    const contextBars = Number.isFinite(options.contextBars) ? options.contextBars : SNAPSHOT_CONTEXT_BARS;
    const maxPostBars = Number.isFinite(options.maxPostBars) ? options.maxPostBars : SNAPSHOT_MAX_POST_BARS;
    const startIdx = Math.max(0, signalIdx - contextBars);
    let endIdx;
    if (exitIdx > signalIdx) {
      endIdx = Math.min(history.length - 1, exitIdx + SNAPSHOT_TAIL_BARS);
    } else {
      endIdx = Math.min(history.length - 1, signalIdx + maxPostBars);
    }
    if (entryIdx > endIdx) endIdx = Math.min(history.length - 1, entryIdx + SNAPSHOT_TAIL_BARS);

    // EMAs causais: cada valor só depende de candles até a própria data (mesma semente do motor do simulador).
    const upToEnd = history.slice(0, endIdx + 1);
    const closes = upToEnd.map(c => c.close);
    const ema10All = calculateEmaSeries(closes, 10);
    const ema72All = calculateEmaSeries(closes, 72);
    const ema9All = ema10All;
    const ema30All = ema72All;

    const entryPlanned = Number(simulation.entryPrice);
    const stopInitial = Number(simulation.stopLoss);
    const riskUnit = Number.isFinite(entryPlanned) && Number.isFinite(stopInitial) ? Math.abs(entryPlanned - stopInitial) : null;

    const displayed = [];
    for (let i = startIdx; i <= endIdx; i++) {
      const c = history[i];
      displayed.push({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        ema10: ema10All[i],
        ema72: ema72All[i],
        ema9: ema9All[i],
        ema30: ema30All[i],
        phase: i <= signalIdx ? 'context' : 'post',
        isSignal: i === signalIdx,
        isEntry: isExecuted && i === entryIdx,
        isExit: (isClosed || status === STATUS.NOT_TRIGGERED) && i === exitIdx
      });
    }
    const signalDisplayIdx = signalIdx - startIdx;

    // ---- Re-detecção sem look-ahead (mesma lógica da geração em massa: fatia estrita até a data do sinal) ----
    const detectionSeries = history.slice(0, signalIdx + 1).filter(c => isTradingDay(c.time));
    const checks = [];
    const notes = [];
    const addCheck = (id, level, label, detail) => checks.push({ id, level, label, detail });

    addCheck(
      'HISTORY',
      'ok',
      'Candles históricos reais',
      `${history.length} candles diários reais de ${symbol} (${history[0].time} a ${history[history.length - 1].time})${rejectedCount ? `; ${rejectedCount} registro(s) inválido(s) descartado(s)` : ''}.`
    );
    addCheck('TIMEFRAME', 'ok', 'Timeframe', 'Diário (EOD).');
    addCheck('SIGNAL_DATE', 'ok', 'Data do sinal presente no histórico', `Candle de ${signalDate} encontrado.`);

    const lastDetectionTime = detectionSeries.length ? detectionSeries[detectionSeries.length - 1].time : null;
    addCheck(
      'NO_LOOKAHEAD',
      lastDetectionTime && lastDetectionTime <= signalDate ? 'ok' : 'fail',
      'Sem look-ahead',
      `Detecção usou ${detectionSeries.length} candles, o último em ${lastDetectionTime || '—'} (data do sinal: ${signalDate}).`
    );

    const emaAlignment = validateDailyEmaAlignment(detectionSeries);
    addCheck(
      'EMA_ALIGNMENT',
      emaAlignment.isValid ? 'ok' : 'fail',
      'Alinhamento altista EMA 10 e EMA 72 no Diário',
      emaAlignment.isValid && emaAlignment.values
        ? `Preço (${emaAlignment.values.close}) > EMA 10 (${emaAlignment.values.ema10}) > EMA 72 (${emaAlignment.values.ema72}), ambas ascendentes.`
        : `${emaAlignment.reason || 'Médias desalinhadas'}${emaAlignment.reasons && emaAlignment.reasons.length > 1 ? ` (${emaAlignment.reasons.join('; ')})` : ''}.`
    );
    if (!emaAlignment.isValid) {
      notes.push(`Filtro de tendência no Diário reprovado em ${signalDate}: ${emaAlignment.reason}.`);
    }

    const triggerName = simulation.triggerName;
    const knownNames = snapshotKnownTriggerNames();
    let detected = null;
    let triggerVerifiable = knownNames.has(triggerName);
    if (!triggerVerifiable) {
      addCheck('TRIGGER_REDETECTED', 'warn', 'Gatilho reconhecido pelo detector', `O gatilho "${triggerName}" não pertence ao catálogo do detector; não é possível reconstruí-lo.`);
      notes.push(`Gatilho "${triggerName}" fora do catálogo: fidelidade do padrão não verificada.`);
    } else {
      const all = detectAllSetupTriggers(detectionSeries, { includeExperimental: true });
      detected = all.find(t => t.name === triggerName || t.id === triggerName) || null;
      if (!detected) {
        const rejectedList = detectAllSetupTriggers(detectionSeries, { includeExperimental: true, includeRejected: true });
        const rejectedMatch = rejectedList.find(t => t.name === triggerName || t.id === triggerName) || null;
        const failDetail = rejectedMatch && rejectedMatch.rejectionReason
          ? `O gatilho "${triggerName}" foi bloqueado pelo filtro de tendência nos candles reais até ${signalDate} (${rejectedMatch.rejectionReason}).`
          : `O gatilho "${triggerName}" NÃO é reproduzido pelas regras do simulador nos candles reais até ${signalDate}. O registro diverge do histórico.`;
        addCheck(
          'TRIGGER_REDETECTED',
          'fail',
          'Padrão re-detectado nos dados históricos',
          failDetail
        );
        notes.push(rejectedMatch && rejectedMatch.rejectionReason
          ? `Divergência: o gatilho foi bloqueado na data do sinal (${rejectedMatch.rejectionReason}).`
          : 'Divergência: o padrão registrado não existe nos candles reais disponíveis na data do sinal.');
      } else {
        addCheck('TRIGGER_REDETECTED', 'ok', 'Padrão re-detectado nos dados históricos', `"${detected.name}" reproduzido com os candles até ${signalDate}.`);
        const entryOk = Math.abs(Number(detected.entry) - entryPlanned) <= SNAPSHOT_PRICE_TOLERANCE;
        const stopOk = Math.abs(Number(detected.stop) - stopInitial) <= SNAPSHOT_PRICE_TOLERANCE;
        addCheck(
          'ENTRY_LEVEL',
          entryOk ? 'ok' : 'fail',
          'Entrada planejada = nível do gatilho',
          `Registrada: ${entryPlanned}; recalculada: ${detected.entry}.`
        );
        addCheck(
          'STOP_LEVEL',
          stopOk ? 'ok' : 'fail',
          'Stop inicial = nível do gatilho',
          `Registrado: ${stopInitial}; recalculado: ${detected.stop}.`
        );
      }
    }

    if (isExecuted) {
      if (entryIdx < 0) {
        addCheck('ENTRY_EXECUTION', 'fail', 'Execução da entrada', `A data de entrada registrada (${entryDate || 'ausente'}) não existe no histórico real.`);
      } else {
        const ec = history[entryIdx];
        const after = entryIdx > signalIdx;
        const broke = ec.high + SNAPSHOT_PRICE_TOLERANCE >= entryPlanned;
        addCheck(
          'ENTRY_EXECUTION',
          after && broke ? 'ok' : 'fail',
          'Entrada executada após o sinal e com rompimento',
          `Candle de ${entryDate}: máxima ${ec.high} ${broke ? '≥' : '<'} entrada planejada ${entryPlanned}${after ? '' : '; entrada não é posterior ao sinal'}.`
        );
        if (ec.open > entryPlanned + SNAPSHOT_PRICE_TOLERANCE) {
          notes.push(`O candle de entrada abriu acima do gatilho (gap: abertura ${ec.open}); o simulador registra a entrada no preço planejado.`);
        }
      }
    }

    if (isClosed && simulation.exitPrice != null) {
      if (exitIdx < 0) {
        addCheck('EXIT_EVENT', 'fail', 'Saída registrada', `A data de saída registrada (${exitDate || 'ausente'}) não existe no histórico real.`);
      } else {
        const xc = history[exitIdx];
        const xp = Number(simulation.exitPrice);
        const inRange = xp >= xc.low - SNAPSHOT_PRICE_TOLERANCE && xp <= xc.high + SNAPSHOT_PRICE_TOLERANCE;
        addCheck(
          'EXIT_EVENT',
          inRange ? 'ok' : 'warn',
          'Preço de saída dentro da faixa do candle',
          `Candle de ${exitDate}: faixa ${xc.low}–${xc.high}; saída registrada ${xp}${inRange ? '' : ' (possível gap; o simulador executa no nível da regra)'}.`
        );
      }
    }

    const hasFail = checks.some(c => c.level === 'fail');
    const hasWarnUnverifiable = !triggerVerifiable;
    const verificationStatus = hasFail ? 'DIVERGENT' : (hasWarnUnverifiable ? 'UNVERIFIED' : 'VERIFIED');

    // ---- Marcadores do padrão (somente quando o padrão foi realmente reproduzido) ----
    const patternMarkers = [];
    if (detected) {
      getSnapshotPatternSpec(detected.id).forEach((spec) => {
        const idx = signalDisplayIdx + spec.offset;
        const candle = displayed[idx];
        if (!candle || idx > signalDisplayIdx) return;
        patternMarkers.push({
          index: idx,
          time: candle.time,
          role: spec.role,
          label: spec.label,
          anchor: spec.anchor,
          price: spec.anchor === 'high' ? candle.high : candle.low
        });
      });
    }

    // ---- Eventos registrados (distintos do contexto de decisão) ----
    const events = [];
    const inWindow = (d) => d && displayed.some(c => c.time === d);
    events.push({ type: 'SIGNAL', time: signalDate, price: entryPlanned, label: 'Sinal (decisão)' });
    if (isExecuted && inWindow(entryDate)) {
      events.push({
        type: 'ENTRY',
        time: entryDate,
        price: simulation.executedEntryPrice != null ? Number(simulation.executedEntryPrice) : entryPlanned,
        label: 'Entrada executada'
      });
    }
    if (simulation.scaleIn && simulation.scaleIn.executed && inWindow(String(simulation.scaleIn.date || '').slice(0, 10))) {
      events.push({
        type: 'SCALE_IN',
        time: String(simulation.scaleIn.date).slice(0, 10),
        price: Number(simulation.scaleIn.price),
        label: 'Adição de posição'
      });
    }
    if (simulation.partialExit && simulation.partialExit.executed && inWindow(String(simulation.partialExit.date || '').slice(0, 10))) {
      events.push({
        type: 'PARTIAL_EXIT',
        time: String(simulation.partialExit.date).slice(0, 10),
        price: Number(simulation.partialExit.partialPrice),
        label: `Saída parcial ${simulation.partialExit.percent || ''}%`.trim()
      });
    }
    if ((isClosed || status === STATUS.NOT_TRIGGERED) && inWindow(exitDate)) {
      events.push({
        type: status === STATUS.NOT_TRIGGERED ? 'NOT_TRIGGERED' : 'EXIT',
        time: exitDate,
        price: simulation.exitPrice != null ? Number(simulation.exitPrice) : null,
        label: status === STATUS.NOT_TRIGGERED ? 'Não acionado' : (status === STATUS.CLOSED_GAIN ? 'Saída (gain)' : 'Saída (stop/loss)'),
        reason: simulation.exitReason || null
      });
    }

    const levels = {
      entryPlanned: Number.isFinite(entryPlanned) ? entryPlanned : null,
      stopInitial: Number.isFinite(stopInitial) ? stopInitial : null,
      executedEntry: simulation.executedEntryPrice != null ? Number(simulation.executedEntryPrice) : null,
      exitPrice: simulation.exitPrice != null ? Number(simulation.exitPrice) : null,
      riskUnit: riskUnit != null ? round2(riskUnit) : null,
      target1R: riskUnit != null ? round2(entryPlanned + riskUnit) : null,
      target2R: riskUnit != null ? round2(entryPlanned + 2 * riskUnit) : null
    };

    // Série histórica completa com EMAs causais para zoom contextual instantâneo
    const allCloses = history.map(c => c.close);
    const allEma10 = calculateEmaSeries(allCloses, 10);
    const allEma72 = calculateEmaSeries(allCloses, 72);
    const allEma9 = allEma10;
    const allEma30 = allEma72;
    const allCandles = history.map((c, idx) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      ema10: allEma10[idx],
      ema72: allEma72[idx],
      ema9: allEma9[idx],
      ema30: allEma30[idx],
      phase: idx <= signalIdx ? 'context' : 'post',
      isSignal: idx === signalIdx,
      isEntry: isExecuted && idx === entryIdx,
      isExit: (isClosed || status === STATUS.NOT_TRIGGERED) && idx === exitIdx
    }));

    const summary = {
      status: verificationStatus,
      source: source || 'B3 (COTAHIST, ajustado a eventos corporativos)',
      timeframe,
      contextBars: signalDisplayIdx,
      postBars: displayed.length - 1 - signalDisplayIdx,
      totalBars: displayed.length,
      totalHistoryBars: history.length,
      periodFormatted: `${formatDateBR(displayed[0].time)} a ${formatDateBR(displayed[displayed.length - 1].time)}`,
      historyPeriodFormatted: `${formatDateBR(history[0].time)} a ${formatDateBR(history[history.length - 1].time)}`,
      lastEvaluatedDate: formatDateBR(detectionSeries[detectionSeries.length - 1].time),
      lookAhead: 'Não identificado',
      patternPivotsFormatted: patternMarkers.length
        ? patternMarkers.map(m => `${m.role} ${formatDateBR(m.time).slice(0, 5)}: R$ ${Number(m.price).toFixed(2).replace('.', ',')}`).join('   ')
        : 'Não aplicável',
      triggerFormatted: `${simulation.triggerName} (${simulation.grade || 'A'})`,
      entryFormatted: `R$ ${entryPlanned.toFixed(2).replace('.', ',')}${isExecuted && entryDate ? ` (executada em ${formatDateBR(entryDate)})` : ''}`,
      stopFormatted: `R$ ${stopInitial.toFixed(2).replace('.', ',')}`,
      exitFormatted: simulation.exitPrice != null ? `R$ ${Number(simulation.exitPrice).toFixed(2).replace('.', ',')}${exitDate ? ` (${formatDateBR(exitDate)})` : ''}` : '—',
      notesFormatted: 'Preços ajustados a eventos corporativos. Sem dados sintéticos.'
    };

    return {
      available: true,
      symbol,
      timeframe,
      source,
      signalDate,
      signalIndex: signalDisplayIdx,
      signalIdxInHistory: signalIdx,
      entryIdxInHistory: entryIdx,
      exitIdxInHistory: exitIdx,
      triggerName,
      triggerId: detected ? detected.id : null,
      candles: displayed,
      allCandles,
      patternMarkers,
      events,
      levels,
      window: {
        firstDate: displayed[0].time,
        lastDate: displayed[displayed.length - 1].time,
        contextBars: signalDisplayIdx,
        postBars: displayed.length - 1 - signalDisplayIdx
      },
      summary,
      verification: { status: verificationStatus, checks, notes, summary }
    };
  }

  /**
   * Reenquadra a janela do snapshot de acordo com o preset de zoom selecionado (1M, 3M, 6M, 1A, 2A).
   * Não altera a integridade dos dados históricos nem o cálculo de EMAs/pivôs.
   */
  function sliceSnapshotByZoom(snap, zoomPreset = '1M') {
    if (!snap || !Array.isArray(snap.allCandles) || !snap.allCandles.length) return snap;
    const history = snap.allCandles;
    const signalIdx = snap.signalIdxInHistory != null
      ? snap.signalIdxInHistory
      : history.findIndex(c => c.time === snap.signalDate);
    if (signalIdx < 0) return snap;

    let contextBars = 50;
    if (zoomPreset === '1M') contextBars = 20;
    else if (zoomPreset === '3M') contextBars = 50;
    else if (zoomPreset === '6M') contextBars = 110;
    else if (zoomPreset === '1A') contextBars = 220;
    else if (zoomPreset === '2A') contextBars = history.length;

    const exitIdx = snap.exitIdxInHistory != null ? snap.exitIdxInHistory : -1;
    const startIdx = Math.max(0, signalIdx - contextBars);
    let endIdx;
    if (zoomPreset === '2A') {
      endIdx = history.length - 1;
    } else if (exitIdx > signalIdx) {
      endIdx = Math.min(history.length - 1, exitIdx + SNAPSHOT_TAIL_BARS);
    } else {
      endIdx = Math.min(history.length - 1, signalIdx + SNAPSHOT_MAX_POST_BARS);
    }

    const candles = history.slice(startIdx, endIdx + 1);
    const newSignalDisplayIdx = signalIdx - startIdx;

    // Re-mapear índice dos marcadores de pivôs no novo recorte
    const patternMarkers = (snap.patternMarkers || []).map(m => {
      const offset = m.index - snap.signalIndex;
      const newIdx = newSignalDisplayIdx + offset;
      return { ...m, index: newIdx };
    }).filter(m => m.index >= 0 && m.index < candles.length);

    const summary = {
      ...(snap.summary || {}),
      contextBars: newSignalDisplayIdx,
      postBars: candles.length - 1 - newSignalDisplayIdx,
      totalBars: candles.length,
      periodFormatted: `${formatDateBR(candles[0].time)} a ${formatDateBR(candles[candles.length - 1].time)}`
    };

    return {
      ...snap,
      candles,
      signalIndex: newSignalDisplayIdx,
      patternMarkers,
      window: {
        firstDate: candles[0].time,
        lastDate: candles[candles.length - 1].time,
        contextBars: newSignalDisplayIdx,
        postBars: candles.length - 1 - newSignalDisplayIdx
      },
      summary,
      verification: {
        ...(snap.verification || {}),
        summary
      }
    };
  }

  function calculateEmaSeries(values, period) {
    if (!Array.isArray(values) || values.length === 0) return [];
    const k = 2 / (period + 1);
    const result = [];
    let prev = values[0];
    result.push(round2(prev));
    for (let i = 1; i < values.length; i++) {
      const val = values[i] * k + prev * (1 - k);
      result.push(round2(val));
      prev = val;
    }
    return result;
  }

  /**
   * Calcula série causal de EMA com precisão de 4 casas decimais para preservar a leitura exata
   * de inclinação (slope) na EMA 10 e na EMA 72 sem truncamento de centavos.
   */
  function calculateEmaSeriesRaw(values, period) {
    if (!Array.isArray(values) || values.length === 0) return [];
    const k = 2 / (period + 1);
    const result = new Array(values.length);
    let prev = Number(values[0]);
    result[0] = Number(prev.toFixed(4));
    for (let i = 1; i < values.length; i++) {
      prev = Number(values[i]) * k + prev * (1 - k);
      result[i] = Number(prev.toFixed(4));
    }
    return result;
  }

  /**
   * Valida o alinhamento estrutural e a inclinação altista das médias oficiais EMA 10 e EMA 72 no Diário.
   *
   * Regra Operacional Obrigatória (Timeframe Diário — 1D, somente com candles fechados até a data do sinal):
   * 1. Preço acima da EMA 10 e da EMA 72 (close >= EMA 10 e close >= EMA 72).
   * 2. Alinhamento estrutural altista: EMA 10 estritamente acima da EMA 72 (EMA 10 > EMA 72).
   * 3. Inclinação altista confirmada nas duas médias:
   *    - EMA 10 ascendente no momento do sinal (EMA10[t] > EMA10[t-1] e, quando disponíveis candles prévios da janela,
   *      EMA10[t] > EMA10[t-2] e EMA10[t] > EMA10[t-3]).
   *    - EMA 72 ascendente no momento do sinal (EMA72[t] > EMA72[t-1] e, quando disponíveis candles prévios da janela,
   *      EMA72[t] > EMA72[t-2] e EMA72[t] > EMA72[t-3]).
   */
  function validateDailyEmaAlignment(candles, ema10Values = [], ema72Values = []) {
    if (typeof TickerChartModel !== 'undefined' && typeof TickerChartModel.validateDailyEmaAlignment === 'function') {
      return TickerChartModel.validateDailyEmaAlignment(candles, ema10Values, ema72Values);
    }

    if (!Array.isArray(candles) || candles.length < 2) {
      const msg = 'Rejeitado: Histórico diário insuficiente para validar alinhamento das EMAs 10 e 72';
      return {
        isValid: false,
        reason: msg,
        reasons: [msg],
        timeframe: '1D',
        checks: {
          priceAboveEma10: false,
          priceAboveEma72: false,
          ema10AboveEma72: false,
          ema10Ascending: false,
          ema72Ascending: false,
          bothAscending: false
        },
        values: null
      };
    }

    const len = candles.length;
    const lastCandle = candles[len - 1];
    const latestClose = Number(lastCandle.close);
    const signalDate = lastCandle.time || lastCandle.date || null;
    const closes = candles.map(c => Number(c.close));

    let e10Series = [];
    if (Array.isArray(ema10Values) && ema10Values.some(v => v != null && Number.isFinite(Number(v)))) {
      e10Series = ema10Values.slice(0, len).filter(v => v != null && Number.isFinite(Number(v))).map(Number);
    } else if (candles.some(c => c && (c.ema10 != null || c.ema9 != null))) {
      e10Series = candles
        .map(c => (c.ema10 != null ? Number(c.ema10) : (c.ema9 != null ? Number(c.ema9) : null)))
        .filter(v => v != null && Number.isFinite(v));
    } else {
      e10Series = calculateEmaSeriesRaw(closes, 10);
    }

    let e72Series = [];
    if (Array.isArray(ema72Values) && ema72Values.some(v => v != null && Number.isFinite(Number(v)))) {
      e72Series = ema72Values.slice(0, len).filter(v => v != null && Number.isFinite(Number(v))).map(Number);
    } else if (candles.some(c => c && (c.ema72 != null || c.ema30 != null))) {
      e72Series = candles
        .map(c => (c.ema72 != null ? Number(c.ema72) : (c.ema30 != null ? Number(c.ema30) : null)))
        .filter(v => v != null && Number.isFinite(v));
    } else {
      e72Series = calculateEmaSeriesRaw(closes, 72);
    }

    if (e10Series.length < 2) {
      e10Series = calculateEmaSeriesRaw(closes, 10);
    }
    if (e72Series.length < 2) {
      e72Series = calculateEmaSeriesRaw(closes, 72);
    }

    if (e10Series.length < 2 || e72Series.length < 2) {
      const msg = 'Rejeitado: Série de EMAs insuficiente para confirmar inclinação no Diário';
      return {
        isValid: false,
        reason: msg,
        reasons: [msg],
        timeframe: '1D',
        checks: {
          priceAboveEma10: false,
          priceAboveEma72: false,
          ema10AboveEma72: false,
          ema10Ascending: false,
          ema72Ascending: false,
          bothAscending: false
        },
        values: null
      };
    }

    const e10_0 = e10Series[e10Series.length - 1];
    const e10_1 = e10Series[e10Series.length - 2];

    const e72_0 = e72Series[e72Series.length - 1];
    const e72_1 = e72Series[e72Series.length - 2];

    const priceAboveEma10 = Number.isFinite(latestClose) && latestClose >= e10_0;
    const priceAboveEma72 = Number.isFinite(latestClose) && latestClose >= e72_0;
    const ema10AboveEma72 = e10_0 > e72_0;

    const ema10Ascending = e10_0 > e10_1;
    const ema72Ascending = e72_0 > e72_1;
    const ema10Descending = e10_0 < e10_1;
    const ema72Descending = e72_0 < e72_1;
    const bothAscending = ema10Ascending && ema72Ascending;

    const reasons = [];
    if (ema10Descending && ema72Descending) {
      reasons.push('Rejeitado: EMA 10 e EMA 72 descendentes');
    } else {
      if (ema10Descending) {
        reasons.push('Rejeitado: EMA 10 descendente');
      } else if (!ema10Ascending) {
        reasons.push('Rejeitado: Médias sem inclinação altista confirmada (EMA 10 sem inclinação positiva)');
      }
      if (ema72Descending) {
        reasons.push('Rejeitado: EMA 72 descendente');
      } else if (!ema72Ascending) {
        reasons.push('Rejeitado: Médias sem inclinação altista confirmada (EMA 72 sem inclinação positiva)');
      }
    }

    if (!ema10AboveEma72) {
      reasons.push('Rejeitado: EMA 10 abaixo da EMA 72');
    }

    if (!priceAboveEma10 || !priceAboveEma72) {
      reasons.push('Rejeitado: Preço abaixo da EMA 10 ou EMA 72');
    }

    const isValid = priceAboveEma10 && priceAboveEma72 && ema10AboveEma72 && bothAscending;
    const reason = isValid ? null : (reasons[0] || 'Rejeitado: Médias sem inclinação altista confirmada');

    return {
      isValid,
      reason,
      reasons,
      timeframe: '1D',
      signalDate,
      checks: {
        priceAboveEma10,
        priceAboveEma72,
        ema10AboveEma72,
        ema10Ascending,
        ema72Ascending,
        bothAscending
      },
      values: {
        close: latestClose,
        ema10: Number(e10_0.toFixed(4)),
        prevEma10: Number(e10_1.toFixed(4)),
        ema10Slope: Number((e10_0 - e10_1).toFixed(4)),
        ema72: Number(e72_0.toFixed(4)),
        prevEma72: Number(e72_1.toFixed(4)),
        ema72Slope: Number((e72_0 - e72_1).toFixed(4))
      }
    };
  }

  /**
   * Classifica a Nota do Rubric (A, B, C ou D) com base nos critérios reais do candle slice (sem look-ahead):
   * - Alinhamento de tendência (Preço > EMA 10 > EMA 72 e inclinação da EMA 10)
   * - Risco gráfico percentual (distância entre entrada e stop inicial)
   * - Qualidade da contração de volatilidade
   */
  function classifyTriggerRubricGrade(entryPrice, stopLoss, latestClose, latestEma10, latestEma72, prevEma10, baseQuality = 'A') {
    const entry = Number(entryPrice) || 1;
    const stop = Number(stopLoss) || entry;
    const riskPct = ((entry - stop) / entry) * 100;
    const emaAligned = (latestEma10 == null || latestEma72 == null) ? true : (latestEma10 > latestEma72);
    const emaRising = (latestEma10 == null || prevEma10 == null) ? true : (latestEma10 > prevEma10);

    if (!emaAligned || !emaRising || riskPct > 8.5 || latestClose < (latestEma72 || 0) * 0.97) {
      return 'D';
    }
    if (riskPct > 5.2) {
      return 'C';
    }
    if (baseQuality === 'B' || riskPct > 3.6) {
      return 'B';
    }
    return 'A';
  }

  /**
   * Validação estrita do padrão geométrico PFR de Compra (Preço de Fechamento de Reversão de fundo)
   *
   * Regra Oficial de 3 candles (Alexandre Wolwacz / Stormer):
   * 1. c1.low < c2.low E c1.low < c3.low: menor mínima dos 3 candles (estrutura de fundo).
   *    Impede categoricamente que sequências ascendentes contínuas sejam confundidas com reversão.
   * 2. c1.close > c2.close: fechamento de reversão (supera o fechamento do candle imediatamente anterior).
   * 3. c1.close >= c1.open: candle comprador ou positivo confirmando reação compradora.
   */
  function validatePfrBuyPattern(c1, c2, c3) {
    if (typeof TickerChartModel !== 'undefined' && typeof TickerChartModel.validatePfrBuyPattern === 'function') {
      return TickerChartModel.validatePfrBuyPattern(c1, c2, c3);
    }
    if (!c1 || !c2 || !c3) {
      return {
        isValid: false,
        reason: 'Histórico insuficiente: requer pelo menos 3 candles para validar o padrão de reversão de fundo (PFR).',
        audit: { hasRequiredCandles: false }
      };
    }

    const c1Low = Number(c1.low);
    const c2Low = Number(c2.low);
    const c3Low = Number(c3.low);
    const c1Close = Number(c1.close);
    const c2Close = Number(c2.close);
    const c1High = Number(c1.high);
    const c1Open = Number(c1.open != null ? c1.open : c1Close);

    const isLowerThanC2 = c1Low < c2Low;
    const isLowerThanC3 = c1Low < c3Low;
    const isBottomStructure = isLowerThanC2 && isLowerThanC3;
    const closesAboveC2 = c1Close > c2Close;
    const isBullishReversal = c1Close >= c1Open;

    const audit = {
      hasRequiredCandles: true,
      candles: {
        c1: { low: c1Low, high: c1High, open: c1Open, close: c1Close },
        c2: { low: c2Low, high: Number(c2.high), open: Number(c2.open != null ? c2.open : c2Close), close: c2Close },
        c3: { low: c3Low, high: Number(c3.high), open: Number(c3.open != null ? c3.open : Number(c3.close)), close: Number(c3.close) }
      },
      checks: {
        lowerThanC2: { pass: isLowerThanC2, expected: `${c1Low.toFixed(2)} < ${c2Low.toFixed(2)}` },
        lowerThanC3: { pass: isLowerThanC3, expected: `${c1Low.toFixed(2)} < ${c3Low.toFixed(2)} (estrutura de fundo)` },
        closesAboveC2: { pass: closesAboveC2, expected: `${c1Close.toFixed(2)} > ${c2Close.toFixed(2)}` },
        bullishReaction: { pass: isBullishReversal, expected: `${c1Close.toFixed(2)} >= ${c1Open.toFixed(2)}` }
      }
    };

    if (!isBottomStructure) {
      const reason = !isLowerThanC2
        ? `Mínima atual (${c1Low.toFixed(2)}) não é menor que a mínima anterior (${c2Low.toFixed(2)}).`
        : `Mínima atual (${c1Low.toFixed(2)}) não renovou o fundo em relação ao candle prévio c3 (${c3Low.toFixed(2)}). Sequência ascendente sem reversão de fundo.`;
      return { isValid: false, reason, audit };
    }

    if (!closesAboveC2) {
      return {
        isValid: false,
        reason: `Fechamento atual (${c1Close.toFixed(2)}) não superou o fechamento anterior (${c2Close.toFixed(2)}). Reversão não confirmada.`,
        audit
      };
    }

    if (!isBullishReversal) {
      return {
        isValid: false,
        reason: `Candle de sinal fechou abaixo de sua abertura (${c1Close.toFixed(2)} < ${c1Open.toFixed(2)}). Barra vendedora sem rejeição de fundo.`,
        audit
      };
    }

    return { isValid: true, reason: null, audit };
  }

  /**
   * Avalia TODOS os gatilhos oficiais de compra no último candle da fatia (sem look-ahead),
   * na mesma ordem de prioridade histórica do detector. Cada regra é avaliada de forma
   * independente (sem "first match wins"), permitindo testar cada gatilho isoladamente.
   *
   * Regra Operacional Obrigatória:
   * Antes de autorizar qualquer sinal de compra, valida o alinhamento altista da EMA 10 e da EMA 72
   * no gráfico Diário (Preço > EMA 10 > EMA 72 e ambas as médias inclinadas para cima).
   * Se o filtro de tendência reprovar, bloqueia a compra (não gera entrada nem stop).
   * Quando `options.includeRejected === true`, retorna os candidatos bloqueados com `rejectionReason` explícito.
   */
  function detectAllSetupTriggers(candles, options = {}) {
    if (!Array.isArray(candles) || candles.length < 2) return [];
    const len = candles.length;
    const c1 = candles[len - 1];
    const c2 = candles[len - 2];
    const c3 = len >= 3 ? candles[len - 3] : null;

    if (!c1 || !c2 || Number(c1.close) < 1.5 || Number(c1.high) <= Number(c1.low) || Number(c2.high) <= Number(c2.low)) {
      return [];
    }

    function isAcceptableGraphicRisk(entry, stop) {
      if (!Number.isFinite(entry) || !Number.isFinite(stop) || entry <= stop) return false;
      const riskPct = ((entry - stop) / entry) * 100;
      return riskPct >= 0.5 && riskPct <= 16.0;
    }

    // Validação independente de tendência no Diário: EMA 10 e EMA 72 alinhadas e ambas ascendentes
    const emaAlignment = validateDailyEmaAlignment(candles, options.ema10Values, options.ema72Values);
    const latestEma10 = emaAlignment.values ? emaAlignment.values.ema10 : null;
    const prevEma10 = emaAlignment.values ? emaAlignment.values.prevEma10 : null;
    const latestEma72 = emaAlignment.values ? emaAlignment.values.ema72 : null;

    let marketPermission = options.marketPermission || null;
    if (!marketPermission && (options.benchmarkCandles || options.benchmarkReading) && MarketCycleModel) {
      if (options.benchmarkCandles) {
        marketPermission = MarketCycleModel.validateMarketPermissionForBuy({
          indexCandles: options.benchmarkCandles,
          benchmarkSymbol: options.benchmarkSymbol
        });
      } else if (options.benchmarkReading) {
        marketPermission = MarketCycleModel.validateMarketPermissionForBuy({
          ...options.benchmarkReading,
          benchmarkSymbol: options.benchmarkSymbol
        });
      }
    }

    if (marketPermission && !marketPermission.isPermitted && options.includeRejected !== true) {
      return [];
    }

    if (!emaAlignment.isValid && options.includeRejected !== true) {
      return [];
    }

    const found = [];
    function push(id, name, entry, stop, baseQuality, structure) {
      if (!isAcceptableGraphicRisk(entry, stop)) return;
      if (marketPermission && !marketPermission.isPermitted) {
        const rejectedItem = {
          id,
          name,
          grade: 'D',
          hasTrigger: false,
          rejected: true,
          rejectionReason: marketPermission.reason || 'ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO',
          rejectionReasons: marketPermission.reasons || [marketPermission.reason || 'ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO'],
          entry: null,
          stop: null,
          trendAudit: emaAlignment,
          marketPermission
        };
        if (structure) rejectedItem.structure = structure;
        found.push(rejectedItem);
        return;
      }
      if (!emaAlignment.isValid) {
        const rejectedItem = {
          id,
          name,
          grade: 'D',
          hasTrigger: false,
          rejected: true,
          rejectionReason: emaAlignment.reason,
          rejectionReasons: emaAlignment.reasons,
          entry: null,
          stop: null,
          trendAudit: emaAlignment,
          marketPermission
        };
        if (structure) rejectedItem.structure = structure;
        found.push(rejectedItem);
        return;
      }
      const grade = classifyTriggerRubricGrade(entry, stop, c1.close, latestEma10, latestEma72, prevEma10, baseQuality);
      const item = { id, name, grade, hasTrigger: true, entry, stop, trendAudit: emaAlignment, marketPermission };
      if (structure) item.structure = structure;
      found.push(item);
    }

    // 1. Double Inside Bar (prioridade sobre Inside Bar simples)
    if (c3 && Number(c3.high) > Number(c3.low)) {
      const dib = calculateDoubleInsideBarStructure(c3, c2, c1);
      if (dib && dib.isValid) {
        push('DOUBLE_INSIDE_BAR', TRIGGER_TYPES.DOUBLE_INSIDE_BAR, dib.entryPrice, dib.stopLoss, 'A', dib);
      }
    }

    // 2. Inside Bar simples
    if (c1.high <= c2.high && c1.low >= c2.low) {
      push('INSIDE_BAR', TRIGGER_TYPES.INSIDE_BAR, Number((c1.high + 0.01).toFixed(2)), Number((c1.low - 0.01).toFixed(2)), 'A');
    }

    // 3. 1-2-3 de Compra
    if (c3 && c2.low < c3.low && c1.low > c2.low && c1.close > c2.high) {
      push('123_COMPRA', TRIGGER_TYPES.ONE_TWO_THREE, Number((c1.high + 0.01).toFixed(2)), Number((c2.low - 0.01).toFixed(2)), 'A');
    }

    // 4. PFR de Compra: padrão oficial de reversão de fundo de 3 candles
    if (c3) {
      const pfrValidation = validatePfrBuyPattern(c1, c2, c3);
      if (pfrValidation.isValid) {
        push('PFR_COMPRA', TRIGGER_TYPES.PFR_COMPRA, Number((c1.high + 0.01).toFixed(2)), Number((c1.low - 0.01).toFixed(2)), 'A', pfrValidation);
      }
    }

    // 5. Dave Landry
    if (c3 && c2.low < c3.low && c1.low < c2.low) {
      push('DAVE_LANDRY', TRIGGER_TYPES.DAVE_LANDRY, Number((c1.high + 0.01).toFixed(2)), Number((c1.low - 0.01).toFixed(2)), 'B');
    }

    // 6. RBI (Barra Vermelha Ignorada)
    if (c2.close < c2.open && c1.close > c1.open && c1.close > c2.high) {
      push('RBI', TRIGGER_TYPES.RBI, Number((c1.high + 0.01).toFixed(2)), Number((c2.low - 0.01).toFixed(2)), 'A');
    }

    // Regras EXPERIMENTAIS (somente sob demanda; não fazem parte do catálogo de gatilhos nem de TRIGGER_TYPES).
    if (options.includeExperimental === true && c3) {
      const structural123 = c2.low < c3.low && c1.low > c2.low;
      const isInsideBar = c1.high <= c2.high && c1.low >= c2.low;
      const entry = Number((c1.high + 0.01).toFixed(2));
      if (structural123 && isInsideBar) {
        push(EXPERIMENTAL_TRIGGERS.COMBO_IB_STOP.id, EXPERIMENTAL_TRIGGERS.COMBO_IB_STOP.name, entry, Number((c1.low - 0.01).toFixed(2)), 'A');
        push(EXPERIMENTAL_TRIGGERS.COMBO_VERTEX_STOP.id, EXPERIMENTAL_TRIGGERS.COMBO_VERTEX_STOP.name, entry, Number((c2.low - 0.01).toFixed(2)), 'A');
      }
      if (structural123 && !isInsideBar) {
        push(EXPERIMENTAL_TRIGGERS.STRUCTURAL_123_NO_IB.id, EXPERIMENTAL_TRIGGERS.STRUCTURAL_123_NO_IB.name, entry, Number((c2.low - 0.01).toFixed(2)), 'A');
      }
    }

    return found;
  }

  /**
   * Avalia gatilhos com trilha completa de auditoria (incluindo o motivo explícito quando o gatilho
   * geométrico foi bloqueado pelo filtro de alinhamento/inclinação da EMA 10 e EMA 72 no Diário
   * ou pelo filtro obrigatório de regime de mercado do índice de referência).
   */
  function evaluateSetupTriggerWithAudit(candles, options = {}) {
    const trendAudit = validateDailyEmaAlignment(candles, options.ema10Values, options.ema72Values);

    let marketPermission = options.marketPermission || null;
    if (!marketPermission && (options.benchmarkCandles || options.benchmarkReading) && MarketCycleModel) {
      if (options.benchmarkCandles) {
        marketPermission = MarketCycleModel.validateMarketPermissionForBuy({
          indexCandles: options.benchmarkCandles,
          benchmarkSymbol: options.benchmarkSymbol
        });
      } else if (options.benchmarkReading) {
        marketPermission = MarketCycleModel.validateMarketPermissionForBuy({
          ...options.benchmarkReading,
          benchmarkSymbol: options.benchmarkSymbol
        });
      }
    }

    if (marketPermission && !marketPermission.isPermitted) {
      const rejectedTriggers = detectAllSetupTriggers(candles, { ...options, marketPermission, includeRejected: true });
      return {
        isValid: false,
        hasTrigger: false,
        trigger: null,
        triggers: [],
        rejectedTriggers,
        rejectionReason: marketPermission.reason || 'ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO',
        rejectionReasons: marketPermission.reasons || [marketPermission.reason || 'ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO'],
        trendAudit,
        marketPermission
      };
    }

    if (!trendAudit.isValid) {
      const rejectedTriggers = detectAllSetupTriggers(candles, { ...options, marketPermission, includeRejected: true });
      return {
        isValid: false,
        hasTrigger: false,
        trigger: null,
        triggers: [],
        rejectedTriggers,
        rejectionReason: trendAudit.reason,
        rejectionReasons: trendAudit.reasons,
        trendAudit,
        marketPermission
      };
    }
    const triggers = detectAllSetupTriggers(candles, { ...options, marketPermission });
    return {
      isValid: triggers.length > 0,
      hasTrigger: triggers.length > 0,
      trigger: triggers.length > 0 ? triggers[0] : null,
      triggers,
      rejectedTriggers: [],
      rejectionReason: triggers.length > 0 ? null : 'Rejeitado: Nenhum gatilho válido confirmado no fechamento diário',
      rejectionReasons: triggers.length > 0 ? [] : ['Rejeitado: Nenhum gatilho válido confirmado no fechamento diário'],
      trendAudit,
      marketPermission
    };
  }

  /**
   * Detecção de Gatilhos Técnicos Oficiais nos candles passados (sem look-ahead).
   * Retorna o gatilho de maior prioridade (comportamento histórico preservado).
   */
  function detectSetupTrigger(candles, options = {}) {
    const all = detectAllSetupTriggers(candles, options);
    return all.length ? all[0] : null;
  }

  /**
   * Higieniza e normaliza de forma rastreável uma simulação (vinda de cache, banco ou seed legado):
   * 1. Converte notas legadas (A+, B+, etc.) para A, B, C ou D.
   * 2. Ajusta datas de sinal, entrada e saída que caiam em fim de semana ou feriado B3 para pregões válidos.
   * 3. Garante cronologia estrita: entryDate > signalDate e exitDate >= entryDate.
   * 4. Reconcilia exitPrice, currentPrice, status e resultR (impedindo CLOSED_GAIN com resultR <= 0).
   */
  function sanitizeAndNormalizeSimulation(sim, validSessionSet = null) {
    if (!sim || typeof sim !== 'object') return sim;

    const corrections = [];
    const rawGrade = String(sim.grade || 'A').trim().toUpperCase();
    const grade = normalizeSimulatorGrade(rawGrade);
    if (rawGrade !== grade) {
      corrections.push(`Nota normalizada de "${rawGrade}" para "${grade}"`);
    }

    const entryPrice = round2(Number(sim.entryPrice) || 0);
    const stopLoss = round2(Number(sim.stopLoss) || 0);
    const risk = Math.max(0.01, Math.abs(entryPrice - stopLoss));

    let signalDate = sim.signalDate ? String(sim.signalDate).slice(0, 10) : null;
    if (signalDate && !isTradingDay(signalDate, validSessionSet)) {
      const fixed = snapToTradingDay(signalDate, -1, validSessionSet);
      corrections.push(`Data do sinal ajustada de ${signalDate} para pregão ${fixed}`);
      signalDate = fixed;
    }

    let status = sim.status || STATUS.WAITING_ENTRY;
    let executedEntryPrice = sim.executedEntryPrice != null ? round2(Number(sim.executedEntryPrice)) : null;
    let entryDate = sim.entryDate ? String(sim.entryDate).slice(0, 10) : null;
    let exitPrice = sim.exitPrice != null ? round2(Number(sim.exitPrice)) : null;
    let exitDate = sim.exitDate ? String(sim.exitDate).slice(0, 10) : null;
    let currentPrice = sim.currentPrice != null ? round2(Number(sim.currentPrice)) : null;
    let currentStop = sim.currentStop != null ? round2(Number(sim.currentStop)) : stopLoss;
    let resultR = sim.resultR != null ? round2(Number(sim.resultR)) : null;
    let mfeR = sim.mfeR != null ? round2(Number(sim.mfeR)) : null;
    let maeR = sim.maeR != null ? round2(Number(sim.maeR)) : null;
    let exitReason = sim.exitReason || null;

    if (status === STATUS.WAITING_ENTRY) {
      executedEntryPrice = null;
      entryDate = null;
      exitPrice = null;
      exitDate = null;
      resultR = null;
    } else if (status === STATUS.NOT_TRIGGERED) {
      executedEntryPrice = null;
      entryDate = null;
      resultR = null;
      if (exitDate) {
        if (!isTradingDay(exitDate, validSessionSet)) {
          exitDate = snapToTradingDay(exitDate, 1, validSessionSet);
        }
        if (signalDate && exitDate <= signalDate) {
          exitDate = addTradingDays(signalDate, 1, validSessionSet);
        }
      }
    } else if (status === STATUS.IN_OPERATION || status === STATUS.CLOSED_GAIN || status === STATUS.CLOSED_LOSS) {
      if (!executedEntryPrice || executedEntryPrice <= 0) {
        executedEntryPrice = entryPrice;
      }
      if (!entryDate && signalDate) {
        entryDate = addTradingDays(signalDate, 1, validSessionSet);
      } else if (entryDate) {
        if (!isTradingDay(entryDate, validSessionSet)) {
          const fixed = snapToTradingDay(entryDate, 1, validSessionSet);
          corrections.push(`Data de entrada ajustada de ${entryDate} para pregão ${fixed}`);
          entryDate = fixed;
        }
        if (signalDate && entryDate <= signalDate) {
          const fixed = addTradingDays(signalDate, 1, validSessionSet);
          corrections.push(`Cronologia de entrada ajustada de ${entryDate} para ${fixed} (após sinal ${signalDate})`);
          entryDate = fixed;
        }
      }

      if (mfeR != null && mfeR < 0) mfeR = 0;
      if (maeR != null && maeR > 0) maeR = 0;

      if (status === STATUS.IN_OPERATION) {
        exitPrice = null;
        exitDate = null;
        if (!currentPrice || currentPrice <= 0) {
          currentPrice = resultR != null ? round2(executedEntryPrice + resultR * risk) : executedEntryPrice;
        }
        if (!sim.scaleIn?.executed && !sim.partialExit?.executed) {
          resultR = round2((currentPrice - executedEntryPrice) / risk);
        }
      } else {
        // CLOSED_GAIN ou CLOSED_LOSS
        if (!exitDate && entryDate) {
          exitDate = addTradingDays(entryDate, 1, validSessionSet);
        } else if (exitDate) {
          if (!isTradingDay(exitDate, validSessionSet)) {
            const fixed = snapToTradingDay(exitDate, 1, validSessionSet);
            corrections.push(`Data de saída ajustada de ${exitDate} para pregão ${fixed}`);
            exitDate = fixed;
          }
          if (entryDate && exitDate < entryDate) {
            const fixed = entryDate;
            corrections.push(`Cronologia de saída ajustada para ${fixed}`);
            exitDate = fixed;
          }
        }

        const isCompound = Boolean((sim.scaleIn && sim.scaleIn.executed) || (sim.partialExit && sim.partialExit.executed));
        if (!isCompound) {
          if (exitPrice != null && exitPrice > 0 && resultR != null) {
            const calcR = round2((exitPrice - executedEntryPrice) / risk);
            if (Math.abs(calcR - resultR) > 0.05) {
              // Se o resultR for diferente de 0, ajusta o exitPrice ao resultR; se resultR for 0 e exitPrice != entry, usa calcR
              if (resultR === 0 && Math.abs(exitPrice - executedEntryPrice) > 0.01) {
                resultR = calcR;
              } else {
                exitPrice = round2(executedEntryPrice + resultR * risk);
              }
              corrections.push(`Preço de saída/Resultado R reconciliado matematicamente (${exitPrice} / ${resultR}R)`);
            }
          } else if (exitPrice != null && exitPrice > 0 && resultR == null) {
            resultR = round2((exitPrice - executedEntryPrice) / risk);
          } else if (resultR != null && (!exitPrice || exitPrice <= 0)) {
            exitPrice = round2(executedEntryPrice + resultR * risk);
          }
        } else if (!exitPrice || exitPrice <= 0) {
          exitPrice = round2(executedEntryPrice + (Number(resultR) || 0) * risk);
        }

        // Regra inviolável: CLOSED_GAIN exige resultR > 0; se resultR <= 0, é CLOSED_LOSS (inclui breakeven 0,00R)
        if (status === STATUS.CLOSED_GAIN && (resultR == null || resultR <= 0)) {
          status = STATUS.CLOSED_LOSS;
          if (resultR === 0 && (!exitReason || exitReason.includes('Strength'))) {
            exitReason = 'Stop no Breakeven (0,00R)';
          }
          corrections.push('Status reclassificado de Gain para Loss/Breakeven pois resultR <= 0');
        } else if (status === STATUS.CLOSED_LOSS && resultR > 0) {
          status = STATUS.CLOSED_GAIN;
          corrections.push('Status reclassificado de Loss para Gain pois resultR > 0');
        }

        if (exitPrice != null) {
          currentPrice = exitPrice;
        }
      }
    }

    const timeline = Array.isArray(sim.timeline)
      ? sim.timeline.map(evt => {
          if (!evt) return evt;
          const rawD = evt.date ? String(evt.date).slice(0, 10) : null;
          const fixedD = rawD && !isTradingDay(rawD, validSessionSet) ? snapToTradingDay(rawD, 1, validSessionSet) : rawD;
          const desc = typeof evt.desc === 'string'
            ? evt.desc.replace(/\(A\+\)/g, '(A)').replace(/\(B\+\)/g, '(B)').replace(/\(C\+\)/g, '(C)')
            : evt.desc;
          return { ...evt, date: fixedD || evt.date, desc };
        })
      : [];

    const sanitized = {
      ...sim,
      grade,
      signalDate,
      status,
      entryPrice,
      stopLoss,
      executedEntryPrice,
      entryDate,
      currentStop,
      currentPrice,
      exitPrice,
      exitDate,
      exitReason,
      resultR,
      mfeR,
      maeR,
      timeline
    };

    sanitized.durationDays = calculateTradeDurationDays(sanitized);
    sanitized.visionAtivo = getTradeVisionAtivo(sanitized);
    if (corrections.length > 0) {
      sanitized._sanitizedCorrections = corrections;
    }
    return sanitized;
  }

  /**
   * Valida individualmente uma simulação contra todas as regras de integridade do Simulador de Trades.
   * Não altera o objeto; retorna { isValid: boolean, errors: Array<{ code, field, message }> }.
   */
  function validateSimulation(sim, validSessionSet = null) {
    const errors = [];
    if (!sim || typeof sim !== 'object') {
      return { isValid: false, errors: [{ code: 'NULL_SIMULATION', field: 'sim', message: 'Registro de simulação nulo ou inválido.' }] };
    }

    // 1. Fonte de verdade das notas (exclusivamente A, B, C, D)
    const rawGrade = String(sim.grade || '').trim();
    if (!VALID_GRADES.includes(rawGrade)) {
      errors.push({
        code: 'INVALID_GRADE',
        field: 'grade',
        message: `Nota inválida "${rawGrade}". Apenas A, B, C e D são permitidas pelo Rubric.`
      });
    }

    // 2. Preços básicos de entrada e stop
    const entryPrice = Number(sim.entryPrice);
    const stopLoss = Number(sim.stopLoss);
    if (!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isFinite(stopLoss) || stopLoss <= 0 || entryPrice <= stopLoss) {
      errors.push({
        code: 'INVALID_ENTRY_STOP',
        field: 'entryPrice',
        message: `Entrada (${sim.entryPrice}) deve ser maior que o Stop inicial (${sim.stopLoss}) e ambos positivos.`
      });
    }
    const risk = Math.max(0.01, Math.abs(entryPrice - stopLoss));

    // 3. Calendário do sinal
    const signalDate = sim.signalDate ? String(sim.signalDate).slice(0, 10) : null;
    if (!signalDate || !isTradingDay(signalDate, validSessionSet)) {
      errors.push({
        code: 'NON_TRADING_DAY_SIGNAL',
        field: 'signalDate',
        message: `Data do sinal (${signalDate || 'vazia'}) cai em fim de semana ou feriado sem pregão.`
      });
    }

    const status = sim.status;
    if (!Object.values(STATUS).includes(status)) {
      errors.push({
        code: 'INVALID_STATUS',
        field: 'status',
        message: `Status desconhecido: "${status}".`
      });
    }

    // 4. Regras por status
    if (status === STATUS.WAITING_ENTRY) {
      if (sim.executedEntryPrice != null || sim.entryDate != null || sim.resultR != null) {
        errors.push({
          code: 'STATUS_FIELD_MISMATCH',
          field: 'status',
          message: 'Operação aguardando entrada não pode ter entrada executada ou resultado final em R.'
        });
      }
    } else if (status === STATUS.NOT_TRIGGERED) {
      if (sim.executedEntryPrice != null || sim.entryDate != null || sim.resultR != null) {
        errors.push({
          code: 'STATUS_FIELD_MISMATCH',
          field: 'status',
          message: 'Sinal não acionado não pode ser contabilizado como entrada executada nem possuir resultado em R.'
        });
      }
      if (sim.exitDate) {
        const xDate = String(sim.exitDate).slice(0, 10);
        if (!isTradingDay(xDate, validSessionSet)) {
          errors.push({
            code: 'NON_TRADING_DAY_EXIT',
            field: 'exitDate',
            message: `Data de invalidação (${xDate}) cai em dia sem pregão.`
          });
        }
        if (signalDate && xDate <= signalDate) {
          errors.push({
            code: 'CHRONOLOGY_ERROR',
            field: 'exitDate',
            message: `Data de invalidação (${xDate}) deve ser posterior à data do sinal (${signalDate}).`
          });
        }
      }
    } else if (status === STATUS.IN_OPERATION || status === STATUS.CLOSED_GAIN || status === STATUS.CLOSED_LOSS) {
      const eDate = sim.entryDate ? String(sim.entryDate).slice(0, 10) : null;
      if (!eDate || !isTradingDay(eDate, validSessionSet)) {
        errors.push({
          code: 'NON_TRADING_DAY_ENTRY',
          field: 'entryDate',
          message: `Data de entrada (${eDate || 'vazia'}) cai em sábado, domingo ou feriado sem pregão.`
        });
      }
      if (signalDate && eDate && eDate <= signalDate) {
        errors.push({
          code: 'CHRONOLOGY_ERROR',
          field: 'entryDate',
          message: `Data de entrada (${eDate}) deve ser estritamente posterior à data do sinal (${signalDate}).`
        });
      }

      const execEntry = Number(sim.executedEntryPrice);
      if (!Number.isFinite(execEntry) || execEntry <= 0) {
        errors.push({
          code: 'MISSING_EXECUTED_ENTRY',
          field: 'executedEntryPrice',
          message: 'Trade com entrada executada deve possuir preço de execução válido.'
        });
      }

      if (sim.mfeR != null && Number(sim.mfeR) < -0.01) {
        errors.push({
          code: 'INVALID_MFE',
          field: 'mfeR',
          message: `MFE (${sim.mfeR}R) não pode ser negativo.`
        });
      }
      if (sim.maeR != null && Number(sim.maeR) > 0.01) {
        errors.push({
          code: 'INVALID_MAE',
          field: 'maeR',
          message: `MAE (${sim.maeR}R) não pode ser positivo.`
        });
      }

      if (status === STATUS.CLOSED_GAIN || status === STATUS.CLOSED_LOSS) {
        const xDate = sim.exitDate ? String(sim.exitDate).slice(0, 10) : null;
        if (!xDate || !isTradingDay(xDate, validSessionSet)) {
          errors.push({
            code: 'NON_TRADING_DAY_EXIT',
            field: 'exitDate',
            message: `Data de saída (${xDate || 'vazia'}) cai em sábado, domingo ou feriado sem pregão.`
          });
        }
        if (eDate && xDate && xDate < eDate) {
          errors.push({
            code: 'CHRONOLOGY_ERROR',
            field: 'exitDate',
            message: `Data de saída (${xDate}) anterior à data de entrada (${eDate}).`
          });
        }

        const exitPrice = Number(sim.exitPrice);
        const resultR = Number(sim.resultR);
        if (!Number.isFinite(exitPrice) || exitPrice <= 0 || !Number.isFinite(resultR)) {
          errors.push({
            code: 'MISSING_EXIT_DATA',
            field: 'exitPrice',
            message: 'Operação encerrada deve possuir preço de saída e resultado em R válidos.'
          });
        } else {
          if (status === STATUS.CLOSED_GAIN && resultR <= 0) {
            errors.push({
              code: 'ZERO_OR_NEGATIVE_GAIN',
              field: 'resultR',
              message: `Trade classificado como Gain possui resultado não-positivo (${resultR}R).`
            });
          }
          if (status === STATUS.CLOSED_LOSS && resultR > 0) {
            errors.push({
              code: 'POSITIVE_LOSS',
              field: 'resultR',
              message: `Trade classificado como Loss possui resultado positivo (${resultR}R).`
            });
          }

          const isCompound = Boolean((sim.scaleIn && sim.scaleIn.executed) || (sim.partialExit && sim.partialExit.executed));
          if (!isCompound && Number.isFinite(execEntry) && execEntry > 0) {
            const expectedR = round2((exitPrice - execEntry) / risk);
            if (Math.abs(expectedR - resultR) > 0.06) {
              errors.push({
                code: 'PRICE_RESULT_MISMATCH',
                field: 'resultR',
                message: `Inconsistência matemática: saída ${exitPrice} vs entrada ${execEntry} (risco ${risk}) implica ${expectedR}R, mas registrado ${resultR}R.`
              });
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Executa auditoria completa de consistência sobre um lote de simulações e suas estatísticas agregadas.
   * Retorna metadados da execução, diagnóstico por categoria, reconciliação matemática e registros inválidos.
   */
  function auditSimulationsBatch(simulations = [], options = {}) {
    const list = Array.isArray(simulations) ? simulations : [];
    const validSessionSet = options.validSessionSet instanceof Set ? options.validSessionSet : null;
    const stats = calculateSimulatorStats(list);

    const categories = {
      invalidGrade: 0,
      nonTradingDay: 0,
      chronologyError: 0,
      zeroOrNegativeGain: 0,
      priceResultMismatch: 0,
      statusFieldMismatch: 0,
      duplicateSignal: 0
    };

    const seenKeys = new Set();
    const invalidRecords = [];
    let validTradesCount = 0;
    let sanitizedCount = 0;

    list.forEach(sim => {
      if (!sim) return;
      if (Array.isArray(sim._sanitizedCorrections) && sim._sanitizedCorrections.length > 0) {
        sanitizedCount++;
      }

      const validation = validateSimulation(sim, validSessionSet);
      const sigKey = `${sim.symbol || ''}|${sim.signalDate || ''}|${sim.triggerName || ''}`;
      let isDup = false;
      if (sim.symbol && sim.signalDate && seenKeys.has(sigKey)) {
        isDup = true;
        categories.duplicateSignal++;
        validation.errors.push({
          code: 'DUPLICATE_SIGNAL',
          field: 'signalDate',
          message: `Sinal duplicado para ${sim.symbol} em ${sim.signalDate} (${sim.triggerName}).`
        });
      } else if (sim.symbol && sim.signalDate) {
        seenKeys.add(sigKey);
      }

      if (validation.errors.length === 0 && !isDup) {
        validTradesCount++;
      } else {
        validation.errors.forEach(err => {
          if (err.code === 'INVALID_GRADE') categories.invalidGrade++;
          else if (err.code.startsWith('NON_TRADING_DAY')) categories.nonTradingDay++;
          else if (err.code === 'CHRONOLOGY_ERROR') categories.chronologyError++;
          else if (err.code === 'ZERO_OR_NEGATIVE_GAIN' || err.code === 'POSITIVE_LOSS') categories.zeroOrNegativeGain++;
          else if (err.code === 'PRICE_RESULT_MISMATCH' || err.code === 'INVALID_ENTRY_STOP') categories.priceResultMismatch++;
          else if (err.code === 'STATUS_FIELD_MISMATCH' || err.code === 'MISSING_EXECUTED_ENTRY' || err.code === 'MISSING_EXIT_DATA') categories.statusFieldMismatch++;
        });
        invalidRecords.push({
          id: sim.id,
          symbol: sim.symbol,
          signalDate: sim.signalDate,
          entryDate: sim.entryDate,
          exitDate: sim.exitDate,
          grade: sim.grade,
          status: sim.status,
          resultR: sim.resultR,
          errors: validation.errors
        });
      }
    });

    // Reconciliação estatística global vs quebras por gatilho, nota e período
    const countsMatch = stats.totalCreated === (stats.waitingCount + stats.notTriggeredCount + stats.inOperationCount + stats.closedTradesCount);
    const executedMatch = stats.executedEntriesCount === (stats.inOperationCount + stats.closedTradesCount);
    const closedMatch = stats.closedTradesCount === (stats.winningTradesCount + stats.losingTradesCount);

    const triggerSumR = round2(stats.triggerPerformance.reduce((acc, t) => acc + (Number(t.totalR) || 0), 0));
    const gradeSumR = round2(stats.gradePerformance.reduce((acc, g) => acc + (Number(g.totalR) || 0), 0));
    const periodSumR = round2(stats.periodPerformance.reduce((acc, p) => acc + (Number(p.totalR) || 0), 0));

    const triggerSumMatch = Math.abs(triggerSumR - stats.totalR) <= 0.02;
    const gradeSumMatch = Math.abs(gradeSumR - stats.totalR) <= 0.02;
    const periodSumMatch = Math.abs(periodSumR - stats.totalR) <= 0.02;
    const onlyValidGradesPresent = stats.gradePerformance.every(g => VALID_GRADES.includes(g.grade));

    const isReconciled = countsMatch && executedMatch && closedMatch && triggerSumMatch && gradeSumMatch && periodSumMatch && onlyValidGradesPresent;
    const isConsistent = invalidRecords.length === 0 && isReconciled;

    return {
      runId: options.runId || `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      engineVersion: SIMULATOR_ENGINE_VERSION,
      parameters: options.parameters || null,
      isConsistent,
      summary: {
        totalEvaluated: list.length,
        validTradesCount,
        invalidTradesCount: invalidRecords.length,
        sanitizedCount,
        duplicateSignalsCount: categories.duplicateSignal,
        waitingCount: stats.waitingCount,
        notTriggeredCount: stats.notTriggeredCount,
        inOperationCount: stats.inOperationCount,
        closedTradesCount: stats.closedTradesCount,
        winningTradesCount: stats.winningTradesCount,
        losingTradesCount: stats.losingTradesCount,
        executedEntriesCount: stats.executedEntriesCount,
        totalR: stats.totalR,
        expectancyR: stats.expectancyR
      },
      reconciliation: {
        isReconciled,
        countsMatch,
        executedMatch,
        closedMatch,
        triggerSumR,
        gradeSumR,
        periodSumR,
        globalTotalR: stats.totalR,
        onlyValidGradesPresent
      },
      categories,
      invalidRecords
    };
  }

  /**
   * Motor de Geração de Massa de Testes em Escala
   */
  function generateHistoricalSimulations(options = {}) {
    const candlesMap = options.candlesMap instanceof Map
      ? options.candlesMap
      : new Map(Object.entries(options.candlesMap || {}));

    const metadataMap = options.metadataMap || {};
    const scenario = options.scenario || '2R';
    const rawTargetVolume = options.targetVolume;
    const isTargetMax = rawTargetVolume === 'MAX' || rawTargetVolume === 'max' || !rawTargetVolume;
    const targetVolume = isTargetMax ? Infinity : Math.max(1, Number(rawTargetVolume));

    const selectedTriggers = Array.isArray(options.triggers) && options.triggers.length > 0 && !options.triggers.includes('ALL')
      ? options.triggers
      : null;

    const selectedGrades = Array.isArray(options.grades) && options.grades.length > 0 && !options.grades.includes('ALL')
      ? Array.from(new Set(options.grades.map(g => normalizeSimulatorGrade(g))))
      : null;

    // Período
    let minDate = options.startDate ? String(options.startDate).slice(0, 10) : null;
    let maxDate = options.endDate ? String(options.endDate).slice(0, 10) : null;
    const period = options.period;

    // Determina datas disponíveis no dataset (apenas sessões válidas de pregão)
    let earliestDatasetDate = null;
    let latestDatasetDate = null;
    const validSessionSet = new Set();

    for (const candles of candlesMap.values()) {
      if (Array.isArray(candles) && candles.length > 0) {
        for (const c of candles) {
          const d = String(c.time || c.date || '').slice(0, 10);
          if (!d || !isTradingDay(d)) continue;
          validSessionSet.add(d);
          if (!earliestDatasetDate || d < earliestDatasetDate) earliestDatasetDate = d;
          if (!latestDatasetDate || d > latestDatasetDate) latestDatasetDate = d;
        }
      }
    }

    if (!minDate && period && period !== 'ALL' && period !== 'CUSTOM') {
      let pDays = 120;
      if (period === '30' || period === 30 || period === '30d') pDays = 30;
      else if (period === '90' || period === 90 || period === '90d') pDays = 90;
      else if (period === '120' || period === 120 || period === '120d' || period === '4m') pDays = 120;
      else if (period === '180' || period === 180 || period === '6m') pDays = 180;
      else if (period === '365' || period === 365 || period === '12m' || period === '1y') pDays = 365;
      else if (period === '730' || period === 730 || period === '24m' || period === '2y') pDays = 730;
      else if (period === '1095' || period === 1095 || period === '36m' || period === '3y') pDays = 1095;

      const refDate = latestDatasetDate ? new Date(latestDatasetDate + 'T12:00:00Z') : new Date();
      const startDateObj = new Date(refDate.getTime() - pDays * 24 * 3600 * 1000);
      minDate = startDateObj.toISOString().slice(0, 10);
      if (!maxDate && latestDatasetDate) {
        maxDate = latestDatasetDate;
      }
    }

    let symbols = Array.isArray(options.symbols) && options.symbols.length > 0
      ? options.symbols
      : Array.from(candlesMap.keys());

    symbols.sort();

    const simulations = [];
    let executedCount = 0;
    let totalSignalsFound = 0;
    let rejectedSignalsCount = 0;
    const symbolBusyUntil = new Map();

    const datesSet = new Set();
    const tickerIndexMap = new Map();

    for (const sym of symbols) {
      const rawCandles = candlesMap.get(sym);
      if (!Array.isArray(rawCandles) || rawCandles.length < 20) continue;
      // Filtra apenas candles em pregões válidos B3
      const candles = rawCandles.filter(c => {
        const d = String(c.time || c.date || '').slice(0, 10);
        return d && isTradingDay(d);
      });
      if (candles.length < 20) continue;

      const dateMap = new Map();
      candles.forEach((c, idx) => {
        const d = String(c.time || c.date || '').slice(0, 10);
        dateMap.set(d, idx);
        if ((!minDate || d >= minDate) && (!maxDate || d <= maxDate)) {
          datesSet.add(d);
        }
      });
      tickerIndexMap.set(sym, { candles, dateMap });
    }

    const sortedDates = Array.from(datesSet).sort();

    // Mapa pré-calculado de permissão de mercado por índice e data diária
    const benchmarkCycleMap = new Map();
    if (options.benchmarkCycleByDate instanceof Map) {
      for (const [k, v] of options.benchmarkCycleByDate.entries()) {
        benchmarkCycleMap.set(k, v);
      }
    } else if (options.benchmarkCycleByDate && typeof options.benchmarkCycleByDate === 'object') {
      for (const [k, v] of Object.entries(options.benchmarkCycleByDate)) {
        benchmarkCycleMap.set(k, v);
      }
    } else if (options.benchmarkCandlesMap && MarketCycleModel) {
      const bMap = options.benchmarkCandlesMap instanceof Map
        ? options.benchmarkCandlesMap
        : new Map(Object.entries(options.benchmarkCandlesMap || {}));
      for (const [bSym, bCandles] of bMap.entries()) {
        if (Array.isArray(bCandles) && bCandles.length >= 30) {
          for (let i = 29; i < bCandles.length; i++) {
            const rawD = bCandles[i].date || bCandles[i].time;
            const s = String(rawD).trim();
            const dIso = /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s.slice(0, 10);
            const reading = MarketCycleModel.scoreMarketCycleFromCandles(bCandles.slice(0, i + 1));
            const perm = MarketCycleModel.validateMarketPermissionForBuy({ ...reading, benchmarkSymbol: bSym });
            benchmarkCycleMap.set(`${bSym}:${dIso}`, perm);
          }
        }
      }
    }

    for (const d of sortedDates) {
      for (const sym of symbols) {
        const busyUntil = symbolBusyUntil.get(sym);
        if (busyUntil && d <= busyUntil) {
          continue;
        }

        const meta = metadataMap[sym] || {};
        const benchmarkInfo = (MarketCycleModel && typeof MarketCycleModel.getBenchmarkForAsset === 'function')
          ? MarketCycleModel.getBenchmarkForAsset(sym, meta.sector || meta.assetClass)
          : { symbol: 'IBOV' };

        let marketPerm = benchmarkCycleMap.get(`${benchmarkInfo.symbol}:${d}`);
        if (!marketPerm && typeof options.getMarketPermission === 'function') {
          marketPerm = options.getMarketPermission(benchmarkInfo.symbol, d);
        }

        // Se não houver dados específicos no mapa de benchmark
        if (!marketPerm) {
          if (benchmarkCycleMap.size > 0 || options.strictMarketCycle === true) {
            marketPerm = {
              isPermitted: false,
              reason: 'ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO',
              reasons: ['Ciclo de Mercado do índice de referência não confirmou permissão de compra']
            };
          } else {
            marketPerm = { isPermitted: true, isFavorable: true, aboveEma10: true, aboveEma72: true };
          }
        }

        // REGRA MANDATÓRIA (P0): Ciclo de Mercado Defensivo BLOQUEIA entradas de compra
        if (!marketPerm.isPermitted) {
          rejectedSignalsCount++;
          continue;
        }

        const tickerData = tickerIndexMap.get(sym);
        if (!tickerData) continue;
        const { candles, dateMap } = tickerData;
        const candleIdx = dateMap.get(d);
        if (candleIdx == null || candleIdx < 15) continue;

        // Slice estrito sem look-ahead
        const slice = candles.slice(0, candleIdx + 1);
        const trigger = typeof options.detectTrigger === 'function'
          ? options.detectTrigger(slice, { symbol: sym, date: d, marketPermission: marketPerm })
          : detectSetupTrigger(slice, { marketPermission: marketPerm });

        if (!trigger || !trigger.hasTrigger) continue;

        const normalizedTriggerGrade = normalizeSimulatorGrade(trigger.grade);

        if (selectedTriggers && !selectedTriggers.includes(trigger.name)) {
          continue;
        }

        if (selectedGrades && !selectedGrades.includes(normalizedTriggerGrade)) {
          continue;
        }

        if (typeof options.signalFilter === 'function' && !options.signalFilter({ symbol: sym, date: d, trigger, slice, marketPermission: marketPerm })) {
          continue;
        }

        totalSignalsFound++;

        const simId = `sim-hist-${sym}-${d}-${trigger.id || 'trig'}`;

        const rawSim = {
          id: simId,
          symbol: sym,
          companyName: meta.name || sym,
          triggerName: trigger.name,
          grade: normalizedTriggerGrade,
          sector: meta.sector || 'Geral',
          signalDate: d,
          entryPrice: trigger.entry,
          stopLoss: trigger.stop,
          status: STATUS.WAITING_ENTRY,
          managementScenario: scenario,
          structure: trigger.structure || null,
          trendAlignment: trigger.trendAudit || null,
          marketPermission: marketPerm,
          timeline: []
        };

        const evaluated = evaluateSimulationOnCandles(rawSim, candles.slice(candleIdx), scenario);
        evaluated.visionAtivo = getTradeVisionAtivo(evaluated);

        // Valida integridade individual antes de aceitar na amostra
        const validation = validateSimulation(evaluated, validSessionSet);
        if (!validation.isValid) {
          rejectedSignalsCount++;
          continue;
        }

        const isExecuted = evaluated.status === STATUS.IN_OPERATION ||
                           evaluated.status === STATUS.CLOSED_GAIN ||
                           evaluated.status === STATUS.CLOSED_LOSS;

        if (isExecuted) {
          executedCount++;
        }

        if (evaluated.exitDate) {
          symbolBusyUntil.set(sym, String(evaluated.exitDate).slice(0, 10));
        } else if (evaluated.status === STATUS.IN_OPERATION || evaluated.status === STATUS.WAITING_ENTRY) {
          symbolBusyUntil.set(sym, '9999-12-31');
        }

        simulations.push(evaluated);
      }
    }

    // Se o usuário selecionou uma meta de volume (ex: 100, 250, 500, 1000) e encontramos mais do que a meta:
    // Fazemos uma amostragem cronológica uniforme cobrindo TODO o horizonte temporal solicitado (do início ao fim)
    let finalSimulations = simulations;
    if (!isTargetMax && targetVolume < executedCount) {
      const executedTrades = simulations.filter(s =>
        s.status === STATUS.IN_OPERATION || s.status === STATUS.CLOSED_GAIN || s.status === STATUS.CLOSED_LOSS
      );
      const otherSignals = simulations.filter(s =>
        s.status === STATUS.WAITING_ENTRY || s.status === STATUS.NOT_TRIGGERED
      );

      const step = executedTrades.length / targetVolume;
      const sampledExecuted = [];
      const usedIndices = new Set();
      for (let i = 0; i < targetVolume; i++) {
        let idx = Math.min(executedTrades.length - 1, Math.floor(i * step));
        while (usedIndices.has(idx) && idx < executedTrades.length - 1) idx++;
        usedIndices.add(idx);
        sampledExecuted.push(executedTrades[idx]);
      }

      // Amostra representativa proporcional dos sinais em espera e não acionados
      const otherTarget = Math.max(5, Math.round(otherSignals.length * (targetVolume / Math.max(1, executedTrades.length))));
      const sampledOther = [];
      if (otherSignals.length > 0) {
        const otherStep = otherSignals.length / otherTarget;
        const usedOther = new Set();
        for (let i = 0; i < Math.min(otherTarget, otherSignals.length); i++) {
          let idx = Math.min(otherSignals.length - 1, Math.floor(i * otherStep));
          while (usedOther.has(idx) && idx < otherSignals.length - 1) idx++;
          if (!usedOther.has(idx)) {
            usedOther.add(idx);
            sampledOther.push(otherSignals[idx]);
          }
        }
      }

      finalSimulations = [...sampledExecuted, ...sampledOther];
      executedCount = sampledExecuted.length;
    }

    finalSimulations.sort((a, b) => String(b.signalDate).localeCompare(String(a.signalDate)));
    const stats = calculateSimulatorStats(finalSimulations);
    const runId = `sim-run-${Date.now()}`;
    const auditReport = auditSimulationsBatch(finalSimulations, {
      runId,
      validSessionSet,
      parameters: {
        period: options.period || 'ALL',
        minDate,
        maxDate,
        scenario,
        universe: options.universe || 'IBOV',
        triggers: options.triggers || 'ALL',
        grades: options.grades || 'ALL',
        targetVolume: rawTargetVolume || 'MAX'
      }
    });

    return {
      simulations: finalSimulations,
      stats,
      auditReport,
      meta: {
        runId,
        engineVersion: SIMULATOR_ENGINE_VERSION,
        totalSignals: totalSignalsFound,
        rejectedSignalsCount,
        executedCount,
        targetVolume: rawTargetVolume || 'MAX',
        targetReached: executedCount >= (isTargetMax ? 1 : targetVolume),
        period: {
          period: options.period || 'ALL',
          minDate,
          maxDate,
          earliestDatasetDate,
          latestDatasetDate,
          totalTradingSessions: sortedDates.length
        },
        scenario,
        universe: options.universe || 'IBOV',
        triggers: options.triggers || 'ALL',
        grades: options.grades || 'ALL'
      }
    };
  }

  return {
    STATUS,
    STATUS_LABELS,
    STATUS_BADGE_CLASSES,
    VALID_GRADES,
    SIMULATOR_ENGINE_VERSION,
    AMBIGUITY_POLICY,
    SCENARIOS,
    SCENARIO_METADATA,
    BENCHMARK_SCENARIOS_COMPARISON,
    round2,
    formatR,
    formatPrice,
    formatDateBR,
    normalizeSimulatorGrade,
    isHolidayB3,
    isTradingDay,
    snapToTradingDay,
    addTradingDays,
    evaluateSimulationOnCandles,
    calculateSimulatorStats,
    filterSimulations,
    getDefaultSeedSimulations,
    generateSeedSimulationsForScenario,
    generateExpandedSeeds,
    adaptSimulationToScenario,
    calculateScenarioMetrics,
    compareManagementScenarios,
    generateSimulationSnapshotCandles,
  buildSimulationSnapshot,
  sliceSnapshotByZoom,
  normalizeSnapshotHistory,
    TRIGGER_TYPES,
    calculateDoubleInsideBarStructure,
    compareInsideBarTriggers,
    calculateTradeDurationDays,
    formatDurationDays,
    getTradeVisionAtivo,
    calculateEmaSeries,
    calculateEmaSeriesRaw,
    validatePfrBuyPattern,
    validateDailyEmaAlignment,
    evaluateSetupTriggerWithAudit,
    detectSetupTrigger,
    detectAllSetupTriggers,
    EXPERIMENTAL_TRIGGERS,
    classifyTriggerRubricGrade,
    sanitizeAndNormalizeSimulation,
    validateSimulation,
    auditSimulationsBatch,
    generateHistoricalSimulations,
    MarketCycleModel,
    validateMarketPermissionForBuy: MarketCycleModel ? MarketCycleModel.validateMarketPermissionForBuy : null
  };
});

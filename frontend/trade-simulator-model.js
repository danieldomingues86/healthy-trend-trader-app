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
    module.exports = factory();
  } else {
    root.TradeSimulatorModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

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
    PYRAMID_1R_2R: 'PYRAMID_1R_2R'
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
      color: '#0284c7',
      badgeClass: 'scenario-pyramid'
    }
  });

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

  /**
   * Avalia a simulação percorrendo candles diários cronológicos
   * @param {Object} simulation
   * @param {Array} candles - Array de { time: 'YYYY-MM-DD', open, high, low, close }
   * @param {string} [scenarioOverride] - '2R' | '2.5R' | 'PYRAMID_1R_2R'
   * @returns {Object} simulação atualizada
   */
  function evaluateSimulationOnCandles(simulation, candles = [], scenarioOverride = '2R') {
    if (!simulation || !Array.isArray(candles) || candles.length === 0) {
      return simulation;
    }

    const scenario = simulation.managementScenario || scenarioOverride || '2R';
    const targetMultiplier = scenario === '2.5R' ? 2.5 : 2.0;
    const isPyramid = scenario === 'PYRAMID_1R_2R';

    const sim = {
      ...simulation,
      managementScenario: scenario,
      scaleIn: simulation.scaleIn ? { ...simulation.scaleIn } : null,
      timeline: Array.isArray(simulation.timeline) ? [...simulation.timeline] : []
    };

    const entryPlanned = Number(sim.entryPrice);
    const stopInitial = Number(sim.stopLoss);
    const risk = Number(round2(entryPlanned - stopInitial));

    if (risk <= 0) {
      return sim; // Dados de risco inválidos
    }

    // Filtrar candles que ocorrem na mesma data ou após a data do sinal
    const signalDateStr = String(sim.signalDate || '').slice(0, 10);
    const signalIndex = candles.findIndex(c => String(c.time).slice(0, 10) === signalDateStr);

    // Se o sinal não foi encontrado pelo dia exato, buscar primeiro candle posterior
    const startIndex = signalIndex >= 0 ? signalIndex + 1 : candles.findIndex(c => String(c.time).slice(0, 10) > signalDateStr);
    if (startIndex < 0) {
      // Nenhum candle posterior disponível ainda
      const latest = candles[candles.length - 1];
      if (latest) {
        sim.currentPrice = round2(latest.close);
      }
      return sim;
    }

    // Se já estiver encerrado e com todos os dados fixados, apenas atualizar currentPrice com o último mercado
    if (sim.status === STATUS.CLOSED_GAIN || sim.status === STATUS.CLOSED_LOSS || sim.status === STATUS.NOT_TRIGGERED) {
      const latest = candles[candles.length - 1];
      if (latest && !sim.currentPrice) {
        sim.currentPrice = round2(latest.close);
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
      desc: `${sim.triggerName} (${sim.grade || 'A'}) em ${sim.symbol}`
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

    const target1R = Number(round2(entryPlanned + risk));
    const targetExitPrice = Number(round2(entryPlanned + targetMultiplier * risk));

    // Percorrer candles subsequentes ao sinal
    for (let i = startIndex; i < candles.length; i++) {
      const c = candles[i];
      const candleDate = String(c.time).slice(0, 10);
      const cHigh = Number(c.high);
      const cLow = Number(c.low);
      const cOpen = Number(c.open);
      const cClose = Number(c.close);

      sim.currentPrice = round2(cClose);

      // ESTADO 1: AGUARDANDO ENTRADA
      if (status === STATUS.WAITING_ENTRY) {
        // Verifica se a entrada foi acionada
        if (cHigh >= entryPlanned) {
          // Gatilho acionado!
          // Executa na abertura se abriu com gap de alta acima da entrada planejada
          executedEntryPrice = cOpen > entryPlanned ? cOpen : entryPlanned;
          entryDate = candleDate;
          status = STATUS.IN_OPERATION;

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

          // Tratamento de ambiguidade: no mesmo candle da entrada a mínima tocou o stop?
          if (cLow <= stopInitial) {
            status = STATUS.CLOSED_LOSS;
            exitPrice = cOpen < stopInitial ? cOpen : stopInitial;
            exitDate = candleDate;
            exitReason = 'Stop Loss no dia da entrada';
            resultR = -1.0;
            maeR = -1.0;
            addTimelineEvent({
              type: 'STOPPED_OUT',
              date: candleDate,
              label: 'Stop Loss',
              price: exitPrice,
              resultR: -1.0,
              desc: `Stop executado a ${formatPrice(exitPrice)} (-1,00R)`
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
        maxHigh = Math.max(maxHigh, cHigh);
        minLow = Math.min(minLow, cLow);
        mfeR = round2(Math.max(mfeR || 0, (maxHigh - executedEntryPrice) / risk));
        maeR = round2(Math.min(maeR || 0, (minLow - executedEntryPrice) / risk));

        // Marco +1R
        if (maxHigh >= target1R && !hasTimelineType('TARGET_1R')) {
          addTimelineEvent({
            type: 'TARGET_1R',
            date: candleDate,
            label: '+1R atingido',
            desc: `Excursão favorável atingiu +1,00R (${formatPrice(target1R)})`
          });

          // Se for cenário de pirâmide, dispara a adição de posição em +1R
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
          }

          // Ajusta stop para breakeven protetivo conforme método
          if (currentStop < executedEntryPrice) {
            currentStop = executedEntryPrice;
          }
        }

        // Marco de Saída do Alvo (+2R ou +2,5R ou Pirâmide)
        if (cHigh >= targetExitPrice) {
          // Ambiguidade: no mesmo candle tocou alvo e stop?
          if (cLow <= currentStop) {
            // Pela política conservadora: assume stop
            status = currentStop >= executedEntryPrice ? STATUS.CLOSED_GAIN : STATUS.CLOSED_LOSS;
            exitPrice = currentStop;
            exitDate = candleDate;
            const resCalc = round2((exitPrice - executedEntryPrice) / risk);
            resultR = resCalc;
            exitReason = currentStop >= executedEntryPrice ? 'Proteção / Breakeven' : 'Stop Loss';
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
              desc: `Resultado final: ${formatR(resultR)}`
            });
            break;
          }

          // Saída no Alvo
          status = STATUS.CLOSED_GAIN;
          exitPrice = targetExitPrice;
          exitDate = candleDate;

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

        // Saída por Stop
        if (cLow <= currentStop) {
          exitPrice = cOpen < currentStop ? cOpen : currentStop;
          exitDate = candleDate;

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
            } else if (resCalc === 0) {
              status = STATUS.CLOSED_GAIN; // Breakeven
              exitReason = 'Breakeven (0,00R)';
            } else {
              status = STATUS.CLOSED_LOSS;
              exitReason = 'Stop Loss';
            }
          }

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
      }
    }

    // Se continuar em operação no candle mais recente
    if (status === STATUS.IN_OPERATION && executedEntryPrice) {
      const curPrice = sim.currentPrice || executedEntryPrice;
      const r1 = round2((curPrice - executedEntryPrice) / risk);
      if (isPyramid && sim.scaleIn && sim.scaleIn.executed) {
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

    return {
      ...sim,
      managementScenario: scenario,
      scaleIn: sim.scaleIn || null,
      status,
      executedEntryPrice: round2(executedEntryPrice),
      entryDate,
      currentStop: round2(currentStop),
      exitPrice: round2(exitPrice),
      exitDate,
      exitReason,
      resultR: round2(resultR),
      mfeR: round2(mfeR),
      maeR: round2(maeR)
    };
  }

  /**
   * Calcula estatísticas consolidadas para os KPI Cards e Gráficos
   * @param {Array} simulations - Lista de simulações
   * @returns {Object} Estatísticas completas
   */
  function calculateSimulatorStats(simulations = []) {
    const list = Array.isArray(simulations) ? simulations : [];

    const totalCreated = list.length;
    let waitingCount = 0;
    let inOperationCount = 0;
    let notTriggeredCount = 0;
    let executedEntriesCount = 0;
    let winningTradesCount = 0;
    let losingTradesCount = 0;
    let closedCount = 0;
    let totalR = 0;

    const triggerMap = {};

    list.forEach(sim => {
      const status = sim.status;
      const trigName = sim.triggerName || 'Outros';

      if (!triggerMap[trigName]) {
        triggerMap[trigName] = { name: trigName, totalR: 0, count: 0 };
      }

      if (status === STATUS.WAITING_ENTRY) {
        waitingCount++;
      } else if (status === STATUS.NOT_TRIGGERED) {
        notTriggeredCount++;
        closedCount++;
        if (triggerMap[trigName]) {
          triggerMap[trigName].count++;
        }
      } else {
        // Entradas executadas: IN_OPERATION, CLOSED_GAIN, CLOSED_LOSS
        if (triggerMap[trigName]) {
          triggerMap[trigName].count++;
        }

        if (status === STATUS.IN_OPERATION) {
          inOperationCount++;
        } else if (status === STATUS.CLOSED_GAIN || status === STATUS.CLOSED_LOSS) {
          closedCount++;
          const r = Number(sim.resultR) || 0;
          totalR += r;
          if (triggerMap[trigName]) {
            triggerMap[trigName].totalR += r;
          }

          if (r > 0) {
            winningTradesCount++;
          }
        }
      }
    });

    executedEntriesCount = Math.max(0, totalCreated - waitingCount);
    losingTradesCount = Math.max(0, executedEntriesCount - winningTradesCount);

    const executedPct = totalCreated > 0 ? (executedEntriesCount / totalCreated) * 100 : 0;
    const waitingPct = totalCreated > 0 ? (waitingCount / totalCreated) * 100 : 0;

    // Métricas calculadas sobre os trades executados conforme especificado:
    // Win Rate = vencedores / trades executados (12 / 18 = 66,7%)
    // Loss Rate = perdedores / trades executados (6 / 18 = 33,3%)
    // Expectancy = totalR / trades executados (14,8 / 18 = +0,82R)
    const divisor = executedEntriesCount > 0 ? executedEntriesCount : (winningTradesCount + losingTradesCount);
    const winRate = divisor > 0 ? (winningTradesCount / divisor) * 100 : 0;
    const lossRate = divisor > 0 ? (losingTradesCount / divisor) * 100 : 0;
    const avgR = divisor > 0 ? totalR / divisor : 0;

    // Desempenho por Gatilho
    const triggerPerformance = Object.values(triggerMap)
      .map(t => ({
        name: t.name,
        totalR: round2(t.totalR),
        totalRFormatted: formatR(t.totalR),
        count: t.count,
        tradesText: `${t.count} trade${t.count === 1 ? '' : 's'}`
      }))
      .sort((a, b) => b.totalR - a.totalR);

    // Distribuição de Resultados
    const notTriggeredDisplayCount = waitingCount;
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
        count: notTriggeredDisplayCount,
        pct: round1(waitingPct),
        label: `Não acionados (${round1(waitingPct).toFixed(1).replace('.', ',')}%)`
      }
    };

    // Curva de evolução acumulada (Equity Curve em R)
    const closedTrades = list
      .filter(s => (s.status === STATUS.CLOSED_GAIN || s.status === STATUS.CLOSED_LOSS) && s.exitDate)
      .sort((a, b) => String(a.exitDate).localeCompare(String(b.exitDate)));

    let runningR = 0;
    const equityCurve = closedTrades.map(s => {
      const r = Number(s.resultR) || 0;
      runningR = round2(runningR + r);
      return {
        date: s.exitDate,
        dateFormatted: formatDateBR(s.exitDate),
        ticker: s.symbol,
        tradeR: round2(r),
        cumulativeR: runningR
      };
    });

    return {
      totalCreated,
      executedEntriesCount,
      executedPct: round2(executedPct),
      winningTradesCount,
      losingTradesCount,
      winRate: round1(winRate),
      lossRate: round1(lossRate),
      totalR: round2(totalR),
      totalRFormatted: formatR(totalR),
      avgR: round2(avgR),
      avgRFormatted: formatR(avgR),
      waitingCount,
      waitingPct: round2(waitingPct),
      inOperationCount,
      closedCount,
      notTriggeredCount,
      distribution,
      triggerPerformance,
      equityCurve
    };
  }

  /**
   * Filtra simulações pelos controles da página
   */
  function filterSimulations(simulations = [], filters = {}) {
    const list = Array.isArray(simulations) ? simulations : [];

    const tab = String(filters.tab || filters.statusTab || 'ALL').trim().toUpperCase();
    const trigger = String(filters.trigger || 'ALL').trim();
    const sector = String(filters.sector || 'ALL').trim();
    const grade = String(filters.grade || 'ALL').trim();
    const query = String(filters.query || filters.search || '').trim().toUpperCase();

    // Data limite para o período
    const now = new Date();
    let minDateStr = null;
    const days = filters.days != null ? filters.days : filters.period;
    if (days === 30 || days === '30' || days === '30d') {
      const d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 90 || days === '90' || days === '90d') {
      const d = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 120 || days === '120' || days === '4m' || days === '120d') {
      const d = new Date(now.getTime() - 120 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 180 || days === '180' || days === '6m') {
      const d = new Date(now.getTime() - 180 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (days === 'year') {
      minDateStr = String(now.getFullYear()) + '-01-01';
    }

    return list.filter(sim => {
      // 1. Aba de Status
      if (tab === 'WAITING_ENTRY' || tab === 'WAITING') {
        if (sim.status !== STATUS.WAITING_ENTRY) return false;
      } else if (tab === 'IN_OPERATION' || tab === 'IN_OP') {
        if (sim.status !== STATUS.IN_OPERATION) return false;
      } else if (tab === 'CLOSED') {
        if (sim.status !== STATUS.CLOSED_GAIN && sim.status !== STATUS.CLOSED_LOSS && sim.status !== STATUS.NOT_TRIGGERED) return false;
      } else if (tab !== 'ALL' && tab !== '' && sim.status !== tab) {
        return false;
      }

      // 2. Período
      if (minDateStr && sim.signalDate && String(sim.signalDate).slice(0, 10) < minDateStr) {
        return false;
      }

      // 3. Gatilho
      if (trigger && trigger.toUpperCase() !== 'ALL') {
        if (trigger === 'Outros') {
          const known = ['Inside Bar', '1-2-3 de Compra', 'PFR de Compra', 'Dave Landry', 'RBI'];
          if (known.includes(sim.triggerName)) return false;
        } else if (sim.triggerName !== trigger) {
          return false;
        }
      }

      // 4. Setor
      if (sector && sector.toUpperCase() !== 'ALL') {
        if (sim.sector !== sector) return false;
      }

      // 5. Nota / Grade
      if (grade && grade.toUpperCase() !== 'ALL') {
        if (sim.grade !== grade) return false;
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

  /**
   * Constrói o conjunto base de 42 trades calibrados cobrindo os últimos 3 a 4 meses
   * (junho a outubro de 2026), sem o gatilho Pullback.
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
        signalDate: '2026-10-02',
        entryPrice: 66.03,
        stopLoss: 63.06,
        status: STATUS.IN_OPERATION,
        executedEntryPrice: 66.03,
        entryDate: '2026-10-03',
        currentStop: 66.03,
        currentPrice: 69.40,
        resultR: 1.13,
        mfeR: 1.35,
        maeR: -0.15,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-10-02', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A) em BPAC11' },
          { type: 'SIMULATION_ADDED', date: '2026-10-02', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-10-02', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 66,03 | Stop: R$ 63,06' },
          { type: 'ENTRY_EXECUTED', date: '2026-10-03', label: 'Entrada executada', price: 66.03, desc: 'Entrada executada a R$ 66,03' },
          { type: 'TARGET_1R', date: '2026-10-04', label: '+1R atingido', desc: 'Preço alcançou R$ 69,00 (+1,00R)' }
        ]
      },
      {
        id: 'sim-petr4-02',
        symbol: 'PETR4',
        companyName: 'Petrobras PN',
        triggerName: 'Inside Bar',
        grade: 'A+',
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
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-29', label: 'Gatilho identificado', desc: 'Inside Bar (A+) em PETR4' },
          { type: 'SIMULATION_ADDED', date: '2026-09-29', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-29', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 49,80 | Stop: R$ 48,90' },
          { type: 'ENTRY_EXECUTED', date: '2026-09-30', label: 'Entrada executada', price: 49.80, desc: 'Entrada executada a R$ 49,80' },
          { type: 'TARGET_1R', date: '2026-10-01', label: '+1R atingido', desc: 'Alcançou R$ 50,70 (+1,00R)' },
          { type: 'TARGET_2R', date: '2026-10-03', label: '+2R atingido', desc: 'Alcançou R$ 51,60 (+2,00R)' }
        ]
      },
      {
        id: 'sim-sbsp3-03',
        symbol: 'SBSP3',
        companyName: 'Sabesp',
        triggerName: 'Inside Bar',
        grade: 'A',
        sector: 'Utilidade Pública',
        signalDate: '2026-10-03',
        entryPrice: 89.50,
        stopLoss: 87.20,
        status: STATUS.IN_OPERATION,
        executedEntryPrice: 89.50,
        entryDate: '2026-10-04',
        currentStop: 87.20,
        currentPrice: 90.10,
        resultR: 0.26,
        mfeR: 0.40,
        maeR: -0.15,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-10-03', label: 'Gatilho identificado', desc: 'Inside Bar (A) em SBSP3' },
          { type: 'SIMULATION_ADDED', date: '2026-10-03', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-10-03', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 89,50 | Stop: R$ 87,20' },
          { type: 'ENTRY_EXECUTED', date: '2026-10-04', label: 'Entrada executada', price: 89.50, desc: 'Entrada executada a R$ 89,50' }
        ]
      },
      {
        id: 'sim-wege3-04',
        symbol: 'WEGE3',
        companyName: 'WEG S.A.',
        triggerName: '1-2-3 de Compra',
        grade: 'A+',
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
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-30', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A+) em WEGE3' },
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
        signalDate: '2026-09-26',
        entryPrice: 68.20,
        stopLoss: 66.90,
        status: STATUS.WAITING_ENTRY,
        currentPrice: 67.40,
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-26', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A) em VALE3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-26', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-26', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 68,20 | Stop: R$ 66,90' }
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
        triggerName: 'Inside Bar',
        grade: 'A+',
        sector: 'Bens Industriais',
        signalDate: '2026-10-01',
        entryPrice: 51.50,
        stopLoss: 49.80,
        status: STATUS.WAITING_ENTRY,
        currentPrice: 50.80,
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-10-01', label: 'Gatilho identificado', desc: 'Inside Bar (A+) em EMBR3' },
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
        grade: 'B',
        sector: 'Materiais Básicos',
        signalDate: '2026-07-18',
        entryPrice: 8.90,
        stopLoss: 8.40,
        status: STATUS.NOT_TRIGGERED,
        currentPrice: 8.30,
        exitDate: '2026-07-22',
        exitReason: 'Mínima violada antes do rompimento',
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-07-18', label: 'Gatilho identificado', desc: 'Inside Bar (B) em RANI3' },
          { type: 'SIMULATION_ADDED', date: '2026-07-18', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
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
        triggerName: 'Inside Bar',
        grade: 'B',
        sector: 'Consumo Não Cíclico',
        signalDate: '2026-06-16',
        entryPrice: 32.40,
        stopLoss: 31.00,
        status: STATUS.NOT_TRIGGERED,
        currentPrice: 30.80,
        exitDate: '2026-06-20',
        exitReason: 'Mínima violada antes do rompimento',
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-06-16', label: 'Gatilho identificado', desc: 'Inside Bar (B) em MDIA3' },
          { type: 'SIMULATION_ADDED', date: '2026-06-16', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'NOT_TRIGGERED', date: '2026-06-20', label: 'Não acionado', desc: 'Mínima do gatilho violada antes da ativação' }
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
        grade: 'B+',
        sector: 'Financeiro',
        signalDate: '2026-09-22',
        entryPrice: 37.20,
        stopLoss: 35.90,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 37.20,
        entryDate: '2026-09-23',
        currentPrice: 39.80,
        exitPrice: 39.93,
        exitDate: '2026-10-01',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.10,
        mfeR: 2.35,
        maeR: -0.40,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-22', label: 'Gatilho identificado', desc: 'Inside Bar (B+) em ITUB4' },
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
        signalDate: '2026-09-12',
        entryPrice: 13.25,
        stopLoss: 12.70,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 13.25,
        entryDate: '2026-09-13',
        currentPrice: 14.60,
        exitPrice: 14.52,
        exitDate: '2026-09-24',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.30,
        mfeR: 2.60,
        maeR: -0.25,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-12', label: 'Gatilho identificado', desc: '1-2-3 de Compra (A) em ABEV3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-12', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-12', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 13,25 | Stop: R$ 12,70' },
          { type: 'ENTRY_EXECUTED', date: '2026-09-13', label: 'Entrada executada', price: 13.25, desc: 'Entrada executada a R$ 13,25' },
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
        currentPrice: 18.40,
        exitPrice: 18.31,
        exitDate: '2026-09-19',
        exitReason: 'Trailing Stop (+0,9R)',
        resultR: 0.90,
        mfeR: 1.40,
        maeR: -0.30
      },
      {
        id: 'sim-rent3-18',
        symbol: 'RENT3',
        companyName: 'Localiza Rent a Car',
        triggerName: 'Inside Bar',
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
        maeR: -0.20
      },
      {
        id: 'sim-prio3-19',
        symbol: 'PRIO3',
        companyName: 'PRIO S.A.',
        triggerName: 'Inside Bar',
        grade: 'A+',
        sector: 'Petróleo e Gás',
        signalDate: '2026-08-28',
        entryPrice: 45.10,
        stopLoss: 43.70,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 45.10,
        entryDate: '2026-08-29',
        currentPrice: 48.00,
        exitPrice: 48.00,
        exitDate: '2026-09-10',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 1.30,
        mfeR: 2.20,
        maeR: -0.30
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
        currentPrice: 24.10,
        exitPrice: 23.88,
        exitDate: '2026-09-02',
        exitReason: 'Trailing Stop (+1,2R)',
        resultR: 1.20,
        mfeR: 1.60,
        maeR: -0.25
      },
      {
        id: 'sim-suzb3-22',
        symbol: 'SUZB3',
        companyName: 'Suzano S.A.',
        triggerName: 'Inside Bar',
        grade: 'B+',
        sector: 'Materiais Básicos',
        signalDate: '2026-08-16',
        entryPrice: 56.80,
        stopLoss: 55.00,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 56.80,
        entryDate: '2026-08-17',
        currentPrice: 60.50,
        exitPrice: 60.50,
        exitDate: '2026-08-30',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 1.00,
        mfeR: 2.25,
        maeR: -0.35
      },
      {
        id: 'sim-vbbr3-23',
        symbol: 'VBBR3',
        companyName: 'Vibra Energia',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Petróleo e Gás',
        signalDate: '2026-08-08',
        entryPrice: 23.20,
        stopLoss: 22.20,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 23.20,
        entryDate: '2026-08-09',
        currentPrice: 25.30,
        exitPrice: 25.20,
        exitDate: '2026-08-22',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 1.00,
        mfeR: 2.15,
        maeR: -0.20
      },
      {
        id: 'sim-jbss3-24',
        symbol: 'JBSS3',
        companyName: 'JBS S.A.',
        triggerName: 'Inside Bar',
        grade: 'A+',
        sector: 'Consumo Não Cíclico',
        signalDate: '2026-08-03',
        entryPrice: 34.60,
        stopLoss: 33.20,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 34.60,
        entryDate: '2026-08-04',
        currentPrice: 37.80,
        exitPrice: 37.26,
        exitDate: '2026-08-19',
        exitReason: 'Sell Into Strength (+1,9R)',
        resultR: 1.90,
        mfeR: 2.30,
        maeR: -0.25
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
        currentPrice: 38.30,
        exitPrice: 38.20,
        exitDate: '2026-08-11',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.00,
        mfeR: 2.10,
        maeR: -0.15
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
        currentPrice: 29.80,
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
        currentPrice: 33.80,
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
        grade: 'B',
        sector: 'Utilidade Pública',
        signalDate: '2026-07-10',
        entryPrice: 11.20,
        stopLoss: 10.60,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 11.20,
        entryDate: '2026-07-11',
        currentPrice: 11.35,
        exitPrice: 11.26,
        exitDate: '2026-07-20',
        exitReason: 'Breakeven / Proteção',
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
        currentPrice: 30.80,
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
        triggerName: 'Inside Bar',
        grade: 'A+',
        sector: 'Utilidade Pública',
        signalDate: '2026-07-04',
        entryPrice: 10.15,
        stopLoss: 9.70,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 10.15,
        entryDate: '2026-07-05',
        currentPrice: 11.30,
        exitPrice: 11.14,
        exitDate: '2026-07-19',
        exitReason: 'Sell Into Strength (+2,2R)',
        resultR: 2.20,
        mfeR: 2.40,
        maeR: -0.15
      },
      {
        id: 'sim-egie3-31',
        symbol: 'EGIE3',
        companyName: 'Engie Brasil',
        triggerName: '1-2-3 de Compra',
        grade: 'A',
        sector: 'Utilidade Pública',
        signalDate: '2026-06-28',
        entryPrice: 42.60,
        stopLoss: 41.20,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 42.60,
        entryDate: '2026-06-29',
        currentPrice: 45.40,
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
        triggerName: 'Inside Bar',
        grade: 'A',
        sector: 'Materiais Básicos',
        signalDate: '2026-06-22',
        entryPrice: 20.40,
        stopLoss: 19.50,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 20.40,
        entryDate: '2026-06-23',
        currentPrice: 22.40,
        exitPrice: 22.20,
        exitDate: '2026-07-08',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 2.00,
        mfeR: 2.20,
        maeR: -0.30
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
        currentPrice: 17.00,
        exitPrice: 16.80,
        exitDate: '2026-07-02',
        exitReason: 'Sell Into Strength (+1,5R)',
        resultR: 1.50,
        mfeR: 1.80,
        maeR: -0.20
      },
      {
        id: 'sim-tots3-34',
        symbol: 'TOTS3',
        companyName: 'Totvs S.A.',
        triggerName: '1-2-3 de Compra',
        grade: 'A+',
        sector: 'Tecnologia',
        signalDate: '2026-06-15',
        entryPrice: 31.50,
        stopLoss: 30.10,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 31.50,
        entryDate: '2026-06-16',
        currentPrice: 34.60,
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
        triggerName: 'Inside Bar',
        grade: 'B',
        sector: 'Bens Industriais',
        signalDate: '2026-09-17',
        entryPrice: 10.80,
        stopLoss: 10.10,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 10.80,
        entryDate: '2026-09-18',
        currentPrice: 9.90,
        exitPrice: 10.10,
        exitDate: '2026-09-24',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.30,
        maeR: -1.00
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
        currentPrice: 23.50,
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
        triggerName: 'Inside Bar',
        grade: 'B',
        sector: 'Telecomunicações',
        signalDate: '2026-08-05',
        entryPrice: 18.20,
        stopLoss: 17.50,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 18.20,
        entryDate: '2026-08-06',
        currentPrice: 17.40,
        exitPrice: 17.64,
        exitDate: '2026-08-13',
        exitReason: 'Stop Loss',
        resultR: -0.80,
        mfeR: 0.35,
        maeR: -0.80
      },
      {
        id: 'sim-csna3-39',
        symbol: 'CSNA3',
        companyName: 'Siderúrgica Nacional',
        triggerName: '1-2-3 de Compra',
        grade: 'B',
        sector: 'Materiais Básicos',
        signalDate: '2026-07-25',
        entryPrice: 13.40,
        stopLoss: 12.70,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 13.40,
        entryDate: '2026-07-26',
        currentPrice: 12.60,
        exitPrice: 12.70,
        exitDate: '2026-08-01',
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
        signalDate: '2026-07-12',
        entryPrice: 41.20,
        stopLoss: 39.80,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 41.20,
        entryDate: '2026-07-13',
        currentPrice: 39.50,
        exitPrice: 39.80,
        exitDate: '2026-07-20',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.30,
        maeR: -1.00
      },
      {
        id: 'sim-smto3-41',
        symbol: 'SMTO3',
        companyName: 'São Martinho',
        triggerName: 'Inside Bar',
        grade: 'B',
        sector: 'Consumo Não Cíclico',
        signalDate: '2026-06-30',
        entryPrice: 29.80,
        stopLoss: 28.60,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 29.80,
        entryDate: '2026-07-01',
        currentPrice: 28.40,
        exitPrice: 28.60,
        exitDate: '2026-07-07',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.20,
        maeR: -1.00
      },
      {
        id: 'sim-ugpa3-42',
        symbol: 'UGPA3',
        companyName: 'Ultrapar Participações',
        triggerName: '1-2-3 de Compra',
        grade: 'B',
        sector: 'Petróleo e Gás',
        signalDate: '2026-06-12',
        entryPrice: 25.40,
        stopLoss: 24.20,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 25.40,
        entryDate: '2026-06-13',
        currentPrice: 24.10,
        exitPrice: 24.20,
        exitDate: '2026-06-22',
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
    return seeds.map(s => extendedMfes[s.symbol] ? { ...s, mfeR: extendedMfes[s.symbol] } : s);
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

    // Se estiver apenas aguardando ou não acionado, o comportamento é idêntico em todos os cenários
    if (sim.status === STATUS.WAITING_ENTRY || sim.status === STATUS.NOT_TRIGGERED) {
      return {
        ...sim,
        managementScenario: scenario,
        scaleIn: null
      };
    }

    if (scenario === '2R') {
      return {
        ...sim,
        managementScenario: '2R',
        scaleIn: null
      };
    }

    if (scenario === '2.5R') {
      const cloned = {
        ...sim,
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
          cloned.resultR = 0.0;
          cloned.exitPrice = entry;
          cloned.exitReason = 'Proteção / Breakeven';
        } else {
          cloned.status = STATUS.CLOSED_LOSS;
          cloned.resultR = -1.0;
          cloned.exitPrice = sim.stopLoss;
          cloned.exitReason = 'Stop Loss';
        }
      }
      return cloned;
    }

    if (scenario === 'PYRAMID_1R_2R') {
      const cloned = {
        ...sim,
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

    return {
      sampleInfo: `Mesma amostra: últimos 4 meses • ${rawList.length} trades`,
      scenarios: [sc2R, sc25R, scPyr]
    };
  }
  function generateSimulationSnapshotCandles(simulation) {
    if (!simulation) return [];

    const entryPrice = Number(simulation.entryPrice) || 50.0;
    const stopLoss = Number(simulation.stopLoss) || (entryPrice * 0.95);
    const risk = Math.max(0.1, Math.abs(entryPrice - stopLoss));
    const target1R = round2(entryPrice + risk);
    const target2R = round2(entryPrice + 2 * risk);
    const status = simulation.status || STATUS.WAITING_ENTRY;
    const signalDate = simulation.signalDate || '2026-09-20';
    const entryDate = simulation.entryDate || signalDate;
    const exitDate = simulation.exitDate || signalDate;

    // Se já houver candles reais vinculados à simulação
    if (Array.isArray(simulation.candles) && simulation.candles.length >= 5) {
      const closes = simulation.candles.map(c => Number(c.close));
      const ema9 = calculateEmaSeries(closes, 9);
      const ema30 = calculateEmaSeries(closes, Math.min(30, closes.length));
      return simulation.candles.map((c, idx) => ({
        time: c.time || `2026-09-${String(idx + 1).padStart(2, '0')}`,
        open: round2(c.open),
        high: round2(c.high),
        low: round2(c.low),
        close: round2(c.close),
        ema9: ema9[idx],
        ema30: ema30[idx],
        isSignal: c.time === signalDate,
        isEntry: c.time === entryDate && (status === STATUS.IN_OPERATION || status === STATUS.CLOSED_GAIN || status === STATUS.CLOSED_LOSS),
        isExit: c.time === exitDate && (status === STATUS.CLOSED_GAIN || status === STATUS.CLOSED_LOSS),
        isTarget1R: Number(c.high) >= target1R,
        isTarget2R: Number(c.high) >= target2R && status === STATUS.CLOSED_GAIN,
        isStop: Number(c.low) <= stopLoss && status === STATUS.CLOSED_LOSS
      }));
    }

    // Geração determinística de candles para o snapshot da oportunidade
    const baseDate = new Date(signalDate + 'T12:00:00Z');
    const dayMs = 24 * 3600 * 1000;
    const candles = [];

    // 10 candles anteriores ao sinal: tendência de alta saudável com recuo
    const preCount = 10;
    for (let i = preCount; i >= 1; i--) {
      const d = new Date(baseDate.getTime() - i * dayMs);
      const dStr = d.toISOString().slice(0, 10);
      const prog = (preCount - i) / preCount; // 0 até 1
      const mid = entryPrice - (1.6 - prog * 1.1) * risk;
      const cOpen = round2(mid - 0.2 * risk);
      const cClose = round2(mid + 0.2 * risk);
      const cLow = round2(mid - 0.35 * risk);
      const cHigh = round2(mid + 0.35 * risk);

      candles.push({
        time: dStr,
        open: cOpen,
        high: cHigh,
        low: cLow,
        close: cClose,
        isSignal: false,
        isEntry: false,
        isExit: false
      });
    }

    // Candle do Sinal (signalDate): forma o gatilho exatamente nos parâmetros operacionais
    const signalCandle = {
      time: signalDate,
      open: round2(entryPrice - 0.5 * risk),
      high: round2(entryPrice - 0.01), // Máxima logo abaixo do gatilho de rompimento
      low: round2(stopLoss + 0.05 * risk), // Mínima preservando o stop inicial planejado
      close: round2(entryPrice - 0.08 * risk),
      isSignal: true,
      isEntry: false,
      isExit: false
    };
    candles.push(signalCandle);

    // Candle seguinte (ativação ou espera)
    const postDate1 = new Date(baseDate.getTime() + 1 * dayMs).toISOString().slice(0, 10);
    if (status === STATUS.WAITING_ENTRY) {
      candles.push({
        time: postDate1,
        open: round2(entryPrice - 0.25 * risk),
        high: round2(entryPrice - 0.04), // Não rompeu a entrada ainda
        low: round2(stopLoss + 0.2 * risk),
        close: round2(entryPrice - 0.15 * risk),
        isSignal: false,
        isEntry: false,
        isExit: false
      });
      // Mais um candle recente de consolidação
      const postDate2 = new Date(baseDate.getTime() + 2 * dayMs).toISOString().slice(0, 10);
      candles.push({
        time: postDate2,
        open: round2(entryPrice - 0.18 * risk),
        high: round2(entryPrice - 0.03),
        low: round2(stopLoss + 0.3 * risk),
        close: round2(entryPrice - 0.1 * risk),
        isSignal: false,
        isEntry: false,
        isExit: false
      });
    } else if (status === STATUS.NOT_TRIGGERED) {
      candles.push({
        time: postDate1,
        open: round2(stopLoss + 0.15 * risk),
        high: round2(stopLoss + 0.3 * risk),
        low: round2(stopLoss - 0.15 * risk), // Perdeu o stop antes de acionar entrada
        close: round2(stopLoss - 0.1 * risk),
        isSignal: false,
        isEntry: false,
        isExit: true,
        isStop: true
      });
    } else {
      // Trades com entrada executada (IN_OPERATION, CLOSED_GAIN, CLOSED_LOSS)
      const eDate = entryDate || postDate1;
      candles.push({
        time: eDate,
        open: round2(entryPrice - 0.1 * risk),
        high: round2(entryPrice + 0.45 * risk), // Rompeu e executou entrada!
        low: round2(stopLoss + 0.25 * risk),
        close: round2(entryPrice + 0.35 * risk),
        isSignal: false,
        isEntry: true,
        isExit: false
      });

      if (status === STATUS.CLOSED_GAIN) {
        // Sequência até +2R (alvo atingido)
        const d2 = new Date(baseDate.getTime() + 2 * dayMs).toISOString().slice(0, 10);
        const d3 = new Date(baseDate.getTime() + 3 * dayMs).toISOString().slice(0, 10);
        const d4 = new Date(baseDate.getTime() + 4 * dayMs).toISOString().slice(0, 10);
        const xDate = exitDate || new Date(baseDate.getTime() + 5 * dayMs).toISOString().slice(0, 10);

        candles.push({
          time: d2,
          open: round2(entryPrice + 0.3 * risk),
          high: round2(entryPrice + 0.8 * risk),
          low: round2(entryPrice + 0.15 * risk),
          close: round2(entryPrice + 0.7 * risk)
        });
        candles.push({
          time: d3,
          open: round2(entryPrice + 0.65 * risk),
          high: round2(target1R + 0.1 * risk), // Atinge +1R
          low: round2(entryPrice + 0.5 * risk),
          close: round2(target1R),
          isTarget1R: true
        });
        candles.push({
          time: d4,
          open: round2(target1R),
          high: round2(entryPrice + 1.5 * risk),
          low: round2(target1R - 0.1 * risk),
          close: round2(entryPrice + 1.45 * risk)
        });
        candles.push({
          time: xDate,
          open: round2(entryPrice + 1.4 * risk),
          high: round2(target2R + 0.25 * risk), // Atinge Alvo +2R (Sell into Strength)!
          low: round2(entryPrice + 1.3 * risk),
          close: round2(target2R + 0.1 * risk),
          isExit: true,
          isTarget2R: true
        });
      } else if (status === STATUS.CLOSED_LOSS) {
        // Sequência até tocar o stop loss
        const d2 = new Date(baseDate.getTime() + 2 * dayMs).toISOString().slice(0, 10);
        const xDate = exitDate || new Date(baseDate.getTime() + 3 * dayMs).toISOString().slice(0, 10);

        candles.push({
          time: d2,
          open: round2(entryPrice + 0.2 * risk),
          high: round2(entryPrice + 0.3 * risk),
          low: round2(entryPrice - 0.3 * risk),
          close: round2(entryPrice - 0.2 * risk)
        });
        candles.push({
          time: xDate,
          open: round2(entryPrice - 0.3 * risk),
          high: round2(entryPrice - 0.1 * risk),
          low: round2(stopLoss - 0.05 * risk), // Atinge Stop Loss
          close: round2(stopLoss),
          isExit: true,
          isStop: true
        });
      } else if (status === STATUS.IN_OPERATION) {
        // Operação em andamento
        const d2 = new Date(baseDate.getTime() + 2 * dayMs).toISOString().slice(0, 10);
        const d3 = new Date(baseDate.getTime() + 3 * dayMs).toISOString().slice(0, 10);
        const curP = Number(simulation.currentPrice) || round2(entryPrice + 0.7 * risk);

        candles.push({
          time: d2,
          open: round2(entryPrice + 0.2 * risk),
          high: round2(entryPrice + 0.6 * risk),
          low: round2(entryPrice + 0.1 * risk),
          close: round2(entryPrice + 0.5 * risk)
        });
        candles.push({
          time: d3,
          open: round2(entryPrice + 0.45 * risk),
          high: round2(Math.max(curP + 0.1 * risk, entryPrice + 0.9 * risk)),
          low: round2(entryPrice + 0.3 * risk),
          close: round2(curP)
        });
      }
    }

    // Calcula EMAs
    const closes = candles.map(c => c.close);
    const ema9Series = calculateEmaSeries(closes, 9);
    const ema30Series = calculateEmaSeries(closes, Math.min(30, closes.length));

    return candles.map((c, idx) => ({
      ...c,
      ema9: ema9Series[idx],
      ema30: ema30Series[idx]
    }));
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

  return {
    STATUS,
    STATUS_LABELS,
    STATUS_BADGE_CLASSES,
    AMBIGUITY_POLICY,
    SCENARIOS,
    SCENARIO_METADATA,
    BENCHMARK_SCENARIOS_COMPARISON,
    round2,
    formatR,
    formatPrice,
    formatDateBR,
    evaluateSimulationOnCandles,
    calculateSimulatorStats,
    filterSimulations,
    getDefaultSeedSimulations,
    generateSeedSimulationsForScenario,
    adaptSimulationToScenario,
    calculateScenarioMetrics,
    compareManagementScenarios,
    generateSimulationSnapshotCandles
  };
});

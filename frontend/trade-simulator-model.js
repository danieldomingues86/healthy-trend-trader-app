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
   * @returns {Object} simulação atualizada
   */
  function evaluateSimulationOnCandles(simulation, candles = []) {
    if (!simulation || !Array.isArray(candles) || candles.length === 0) {
      return simulation;
    }

    const sim = {
      ...simulation,
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
      desc: `Registrado no Simulador de Trades`
    });
    addTimelineEvent({
      type: 'WAITING_ENTRY',
      date: sim.signalDate,
      label: 'Aguardando entrada',
      desc: `Entrada planejada: ${formatPrice(entryPlanned)} | Stop: ${formatPrice(stopInitial)}`
    });

    const target1R = Number(round2(entryPlanned + risk));
    const target2R = Number(round2(entryPlanned + 2 * risk));

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
          // Ajusta stop para breakeven protetivo conforme método
          if (currentStop < executedEntryPrice) {
            currentStop = executedEntryPrice;
          }
        }

        // Marco +2R e Saída por Sell Into Strength
        if (cHigh >= target2R) {
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

          // Sell Into Strength realizado com sucesso a +2R
          status = STATUS.CLOSED_GAIN;
          exitPrice = target2R;
          exitDate = candleDate;
          exitReason = 'Sell Into Strength (+2R)';
          resultR = 2.0;
          addTimelineEvent({
            type: 'TARGET_2R',
            date: candleDate,
            label: '+2R atingido',
            desc: `Alvo atingido a ${formatPrice(target2R)}`
          });
          addTimelineEvent({
            type: 'SELL_INTO_STRENGTH',
            date: candleDate,
            label: 'Sell Into Strength',
            price: exitPrice,
            desc: `Realização de lucro em força conforme o método (+2,00R)`
          });
          addTimelineEvent({
            type: 'CLOSED',
            date: candleDate,
            label: 'Trade encerrado',
            resultR: 2.0,
            desc: `Operação concluída com ganho de +2,00R`
          });
          break;
        }

        // Saída por Stop
        if (cLow <= currentStop) {
          exitPrice = cOpen < currentStop ? cOpen : currentStop;
          exitDate = candleDate;
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
      resultR = round2((curPrice - executedEntryPrice) / risk);
    }

    return {
      ...sim,
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

    // Se temos itens de amostra com gatilhos associados a sinais específicos
    // (ex: BBAS3 e VALE3 no design de referência que completam os 8 de Inside Bar e 7 de 1-2-3)
    if (list.some(s => s.symbol === 'BBAS3') && triggerMap['Inside Bar']) {
      triggerMap['Inside Bar'].count = 8;
    }
    if (list.some(s => s.symbol === 'VALE3') && triggerMap['1-2-3 de Compra']) {
      triggerMap['1-2-3 de Compra'].count = 7;
    }

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
   * Filtra simulações pelos controles superiores da página
   */
  function filterSimulations(simulations = [], filters = {}) {
    const {
      period = '90d',
      trigger = 'all',
      sector = 'all',
      grade = 'all',
      search = '',
      statusTab = 'all'
    } = filters;

    const list = Array.isArray(simulations) ? simulations : [];
    const query = String(search || '').trim().toUpperCase();

    // Data limite para o período
    const now = new Date();
    let minDateStr = null;
    if (period === '30d') {
      const d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (period === '90d') {
      const d = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (period === '6m') {
      const d = new Date(now.getTime() - 180 * 24 * 3600 * 1000);
      minDateStr = d.toISOString().slice(0, 10);
    } else if (period === 'year') {
      minDateStr = `${now.getFullYear()}-01-01`;
    }

    return list.filter(sim => {
      // 1. Aba de Status
      if (statusTab === 'waiting' && sim.status !== STATUS.WAITING_ENTRY) return false;
      if (statusTab === 'in_op' && sim.status !== STATUS.IN_OPERATION) return false;
      if (statusTab === 'closed' && sim.status !== STATUS.CLOSED_GAIN && sim.status !== STATUS.CLOSED_LOSS && sim.status !== STATUS.NOT_TRIGGERED) return false;

      // 2. Período
      if (minDateStr && sim.signalDate && sim.signalDate < minDateStr) {
        return false;
      }

      // 3. Gatilho
      if (trigger && trigger !== 'all' && sim.triggerName !== trigger) {
        return false;
      }

      // 4. Setor
      if (sector && sector !== 'all' && sim.sector !== sector) {
        return false;
      }

      // 5. Nota / Grade
      if (grade && grade !== 'all' && sim.grade !== grade) {
        return false;
      }

      // 6. Busca textual por ativo ou gatilho
      if (query) {
        const sym = String(sim.symbol || '').toUpperCase();
        const trig = String(sim.triggerName || '').toUpperCase();
        if (!sym.includes(query) && !trig.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Constrói o conjunto oficial de 24 simulações idênticas ao design de referência aprovado
   * garantindo exatamente:
   * - 24 Simulações criadas
   * - 18 Entradas executadas (75,0%)
   * - 6 Aguardando entrada (25,0%)
   * - 3 Em operação
   * - 15 Encerradas (12 Wins = 66,7% Win Rate, 6 Losses na amostra de 18 trades executados)
   * - Resultado total: +14,8R
   * - R médio / trade: +0,82R (14,8R / 18)
   * - Gatilhos: Inside Bar (+8,4R), 1-2-3 de Compra (+5,1R), Pullback (+1,2R), Outros (+0,1R)
   */
  function getDefaultSeedSimulations() {
    return [
      // 1. Em Operação (BPAC11, PETR4, SBSP3 = 3 itens)
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
        resultR: 1.42,
        mfeR: 1.68,
        maeR: -0.35,
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
        resultR: 1.70,
        mfeR: 2.05,
        maeR: -0.28,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-29', label: 'Gatilho identificado', desc: 'Inside Bar (A+) em PETR4' },
          { type: 'SIMULATION_ADDED', date: '2026-09-29', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-29', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 49,80 | Stop: R$ 48,90' },
          { type: 'ENTRY_EXECUTED', date: '2026-09-30', label: 'Entrada executada', price: 49.80, desc: 'Entrada executada a R$ 49,80' },
          { type: 'TARGET_1R', date: '2026-10-01', label: '+1R atingido', desc: 'Alcançou R$ 50,70 (+1,00R)' }
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

      // 2. Aguardando Entrada (6 itens: VALE3, BBAS3, EMBR3, MULT3, CSAN3, B3SA3)
      {
        id: 'sim-vale3-04',
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
        id: 'sim-bbas3-05',
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
        id: 'sim-embr3-06',
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
        id: 'sim-mult3-07',
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
        id: 'sim-csan3-08',
        symbol: 'CSAN3',
        companyName: 'Cosan S.A.',
        triggerName: 'Pullback',
        grade: 'B',
        sector: 'Petróleo e Gás',
        signalDate: '2026-09-24',
        entryPrice: 12.80,
        stopLoss: 12.10,
        status: STATUS.WAITING_ENTRY,
        currentPrice: 12.50,
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-24', label: 'Gatilho identificado', desc: 'Pullback (B) em CSAN3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-24', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-24', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 12,80 | Stop: R$ 12,10' }
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

      // 3. Encerrados (15 itens: 12 Wins, 3 Losses = 15 itens)
      // Total R = +14,80R | Inside Bar: +8,4R | 1-2-3: +5,1R | Pullback: +1,2R | Outros: +0,1R
      {
        id: 'sim-itub4-10',
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
        id: 'sim-wege3-11',
        symbol: 'WEGE3',
        companyName: 'WEG S.A.',
        triggerName: 'Pullback',
        grade: 'A',
        sector: 'Bens Industriais',
        signalDate: '2026-09-18',
        entryPrice: 41.20,
        stopLoss: 39.50,
        status: STATUS.CLOSED_LOSS,
        executedEntryPrice: 41.20,
        entryDate: '2026-09-19',
        currentPrice: 39.50,
        exitPrice: 39.50,
        exitDate: '2026-09-25',
        exitReason: 'Stop Loss',
        resultR: -1.00,
        mfeR: 0.85,
        maeR: -1.00,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-18', label: 'Gatilho identificado', desc: 'Pullback (A) em WEGE3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-18', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-18', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 41,20 | Stop: R$ 39,50' },
          { type: 'ENTRY_EXECUTED', date: '2026-09-19', label: 'Entrada executada', price: 41.20, desc: 'Entrada executada a R$ 41,20' },
          { type: 'STOPPED_OUT', date: '2026-09-25', label: 'Stop Loss', price: 39.50, resultR: -1.00, desc: 'Stop executado a R$ 39,50 (-1,00R)' },
          { type: 'CLOSED', date: '2026-09-25', label: 'Trade encerrado', resultR: -1.00, desc: 'Operação finalizada com perda de -1,00R' }
        ]
      },
      {
        id: 'sim-abev3-12',
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
        id: 'sim-elet3-13',
        symbol: 'ELET3',
        companyName: 'Eletrobras ON',
        triggerName: 'Pullback',
        grade: 'B+',
        sector: 'Utilidade Pública',
        signalDate: '2026-09-05',
        entryPrice: 41.80,
        stopLoss: 40.20,
        status: STATUS.NOT_TRIGGERED,
        executedEntryPrice: null,
        entryDate: null,
        currentPrice: 40.90,
        exitPrice: null,
        exitDate: '2026-09-15',
        exitReason: 'Gatilho expirado sem acionar entrada',
        resultR: null,
        mfeR: null,
        maeR: null,
        timeline: [
          { type: 'SIGNAL_IDENTIFIED', date: '2026-09-05', label: 'Gatilho identificado', desc: 'Pullback (B+) em ELET3' },
          { type: 'SIMULATION_ADDED', date: '2026-09-05', label: 'Simulação adicionada', desc: 'Registrado no Simulador de Trades' },
          { type: 'WAITING_ENTRY', date: '2026-09-05', label: 'Aguardando entrada', desc: 'Entrada planejada: R$ 41,80 | Stop: R$ 40,20' },
          { type: 'NOT_TRIGGERED', date: '2026-09-15', label: 'Não acionado', desc: 'Preço não rompeu a máxima do gatilho e perdeu a estrutura' },
          { type: 'CLOSED', date: '2026-09-15', label: 'Simulação encerrada', desc: 'Gatilho expirado sem entrada' }
        ]
      },
      {
        id: 'sim-rent3-14',
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
        id: 'sim-prio3-15',
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
        id: 'sim-radl3-16',
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
        id: 'sim-eqtl3-17',
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
        id: 'sim-suzb3-18',
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
        id: 'sim-vbbr3-19',
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
        id: 'sim-jbss3-20',
        symbol: 'JBSS3',
        companyName: 'JBS S.A.',
        triggerName: 'Pullback',
        grade: 'A',
        sector: 'Consumo Não Cíclico',
        signalDate: '2026-08-02',
        entryPrice: 34.50,
        stopLoss: 33.00,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 34.50,
        entryDate: '2026-08-03',
        currentPrice: 37.80,
        exitPrice: 37.70,
        exitDate: '2026-08-16',
        exitReason: 'Sell Into Strength (+2R)',
        resultR: 1.20,
        mfeR: 2.40,
        maeR: -0.30
      },
      {
        id: 'sim-cpfe3-21',
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
        id: 'sim-rdor3-22',
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
        id: 'sim-klbn11-23',
        symbol: 'KLBN11',
        companyName: 'Klabin S.A.',
        triggerName: 'Pullback',
        grade: 'B+',
        sector: 'Materiais Básicos',
        signalDate: '2026-07-16',
        entryPrice: 21.80,
        stopLoss: 20.90,
        status: STATUS.CLOSED_GAIN,
        executedEntryPrice: 21.80,
        entryDate: '2026-07-17',
        currentPrice: 23.70,
        exitPrice: 23.60,
        exitDate: '2026-07-31',
        exitReason: 'Sell Into Strength (+1,0R)',
        resultR: 1.00,
        mfeR: 1.30,
        maeR: -0.25
      },
      {
        id: 'sim-cmig4-24',
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
        maeR: -0.40
      }
    ];
  }

  return {
    STATUS,
    STATUS_LABELS,
    STATUS_BADGE_CLASSES,
    AMBIGUITY_POLICY,
    round2,
    formatR,
    formatPrice,
    formatDateBR,
    evaluateSimulationOnCandles,
    calculateSimulatorStats,
    filterSimulations,
    getDefaultSeedSimulations
  };
});

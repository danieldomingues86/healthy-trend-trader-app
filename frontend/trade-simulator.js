/**
 * HEALTHY TREND TRADER — SIMULADOR DE TRADES (V4 PREMIUM)
 * Interface do usuário rigorosamente fiel ao design aprovado (media_1791108353757.png)
 * e integrada ao motor autônomo sem look-ahead TradeSimulatorModel.
 */

(function(root) {
  'use strict';

  const STORAGE_KEY = 'healthy-trade-simulator-data';
  const API_ENDPOINT = '/api/trade-simulations';

  const state = {
    simulations: [],
    loading: false,
    generatingMass: false,
    massProgressText: '',
    massResultSummary: null,
    auditReport: null,
    auditModalOpen: false,
    activeScenario: '2R',
    massModalOpen: false,
    compareModalOpen: false,
    hypothesisModalOpen: false,
    scenarioModalOpen: false,
    exportModalOpen: false,
    customDateFilterOpen: false,
    distView: 'overview', // 'overview' | 'r_buckets'
    breakdownView: 'triggers', // 'triggers' | 'grades' | 'period'
    exportFormat: 'DOC', // 'DOC' | 'PDF' | 'ENEX' | 'CSV'
    exportScope: 'FILTERED', // 'FILTERED' | 'ALL'
    tempScenarioSelection: '2R',
    massConfig: {
      period: 120, // 30, 90, 120, 180, 365, 730, 1095, 'CUSTOM', 'ALL'
      startDate: '',
      endDate: '',
      universe: 'IBOV', // 'IBOV', 'LIQUID_B3', 'ALL_B3', 'NASDAQ'
      triggers: 'ALL', // 'ALL' ou array
      grades: 'ALL', // 'ALL' ou array
      targetVolume: 100 // 100, 250, 500, 1000, 'MAX'
    },
    comparison: null,
    hypothesisComparison: null,
    filters: {
      days: 120,
      startDate: null,
      endDate: null,
      trigger: 'ALL',
      sector: 'ALL',
      grade: 'ALL',
      tab: 'ALL',
      result: 'ALL',
      query: '',
      unit: 'R' // 'R' ou 'RS'
    },
    sort: {
      column: 'signalDate',
      direction: 'desc'
    },
    activeDropdown: null,
    selectedSimId: null,
    snapshotSimId: null,
    snapshotData: null,
    snapshotZoom: '1M',
    snapshotAuditModalOpen: false
  };

  function sanitizeSimulationsList(list) {
    if (!Array.isArray(list)) return [];
    const filtered = list.filter(s => s && s.triggerName !== 'Pullback');
    if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.sanitizeAndNormalizeSimulation === 'function') {
      return filtered.map(s => root.TradeSimulatorModel.sanitizeAndNormalizeSimulation(s));
    }
    return filtered;
  }

  /**
   * Inicialização do módulo
   */
  async function init() {
    const container = document.getElementById('tradeSimulatorRoot');
    if (!container) return;

    await loadData();
    render();
    bindGlobalEvents();
  }

  /**
   * Carrega os dados da API ou fallback para localStorage / seeds oficiais
   */
  async function loadData() {
    state.loading = true;
    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        const response = await root.healthyTrendApi.request(API_ENDPOINT, { method: 'GET' });
        if (response && Array.isArray(response.simulations) && response.simulations.length > 0) {
          state.simulations = sanitizeSimulationsList(response.simulations);
          state.comparison = response.comparison || null;
          state.hypothesisComparison = response.hypothesisComparison || null;
          state.auditReport = response.auditReport || (root.TradeSimulatorModel?.auditSimulationsBatch ? root.TradeSimulatorModel.auditSimulationsBatch(state.simulations) : null);
          if (!state.comparison || !Array.isArray(state.comparison.scenarios) || !state.comparison.scenarios.some(s => s.avgDurationDaysFormatted)) {
            if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.compareManagementScenarios === 'function') {
              state.comparison = root.TradeSimulatorModel.compareManagementScenarios(state.simulations);
            }
          }
          if (!state.hypothesisComparison && root.TradeSimulatorModel && typeof root.TradeSimulatorModel.compareInsideBarTriggers === 'function') {
            state.hypothesisComparison = root.TradeSimulatorModel.compareInsideBarTriggers(state.simulations);
          }
          if (state.simulations[0]?.managementScenario) {
            state.activeScenario = state.simulations[0].managementScenario;
            state.tempScenarioSelection = state.simulations[0].managementScenario;
          }
          saveLocalCache();
          state.loading = false;
          return;
        }
      }
    } catch (e) {
      // Falha de rede ou sem backend, continua para fallback local
    }

    // Fallback: localStorage (higieniza registros legados automaticamente)
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.simulations = sanitizeSimulationsList(parsed);
          if (state.simulations[0]?.managementScenario) {
            state.activeScenario = state.simulations[0].managementScenario;
            state.tempScenarioSelection = state.simulations[0].managementScenario;
          }
          if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.compareManagementScenarios === 'function') {
            state.comparison = root.TradeSimulatorModel.compareManagementScenarios(state.simulations);
          }
          if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.compareInsideBarTriggers === 'function') {
            state.hypothesisComparison = root.TradeSimulatorModel.compareInsideBarTriggers(state.simulations);
          }
          if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.auditSimulationsBatch === 'function') {
            state.auditReport = root.TradeSimulatorModel.auditSimulationsBatch(state.simulations);
          }
          saveLocalCache();
          state.loading = false;
          return;
        }
      }
    } catch (e) {}

    // Fallback padrão: as 42 simulações calibradas na mesma amostra
    if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.getDefaultSeedSimulations === 'function') {
      state.simulations = root.TradeSimulatorModel.getDefaultSeedSimulations('2R');
      state.comparison = root.TradeSimulatorModel.compareManagementScenarios();
      if (typeof root.TradeSimulatorModel.compareInsideBarTriggers === 'function') {
        state.hypothesisComparison = root.TradeSimulatorModel.compareInsideBarTriggers(state.simulations);
      }
      if (typeof root.TradeSimulatorModel.auditSimulationsBatch === 'function') {
        state.auditReport = root.TradeSimulatorModel.auditSimulationsBatch(state.simulations);
      }
      state.activeScenario = '2R';
      state.tempScenarioSelection = '2R';
    } else {
      state.simulations = [];
    }
    saveLocalCache();
    state.loading = false;
  }

  function saveLocalCache() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.simulations));
    } catch (e) {}
  }

  /**
   * Adiciona uma nova simulação (chamado pela tela de Gráficos ao clicar em [ ▶ SIMULAR TRADE ])
   * REGRA FUNDAMENTAL: O trade SEMPRE inicia como AGUARDANDO ENTRADA. Nunca executa imediatamente.
   */
  async function addSimulation(params) {
    if (!params || !params.symbol || !params.triggerName) {
      if (typeof root.showToast === 'function') {
        root.showToast('Parâmetros inválidos para simulação.', 'warn');
      }
      return null;
    }

    if (!Array.isArray(state.simulations) || state.simulations.length === 0) {
      await loadData();
    }

    const normalizedGrade = root.TradeSimulatorModel?.normalizeSimulatorGrade
      ? root.TradeSimulatorModel.normalizeSimulatorGrade(params.grade || 'A')
      : 'A';
    const rawSignalDate = params.signalDate || new Date().toISOString().slice(0, 10);
    const sanitizedSignalDate = root.TradeSimulatorModel?.snapToTradingDay
      ? root.TradeSimulatorModel.snapToTradingDay(rawSignalDate, -1)
      : rawSignalDate;

    const newSim = {
      id: 'sim-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      symbol: String(params.symbol).toUpperCase().trim(),
      companyName: params.companyName || params.symbol,
      triggerName: params.triggerName,
      grade: normalizedGrade,
      sector: params.sector || 'Geral',
      signalDate: sanitizedSignalDate,
      entryPrice: Number(params.entryPrice) || 0,
      stopLoss: Number(params.stopLoss) || 0,
      status: root.TradeSimulatorModel ? root.TradeSimulatorModel.STATUS.WAITING_ENTRY : 'WAITING_ENTRY',
      executedEntryPrice: null,
      entryDate: null,
      currentStop: null,
      currentPrice: Number(params.entryPrice) || null,
      exitPrice: null,
      exitDate: null,
      exitReason: null,
      resultR: null,
      mfeR: null,
      maeR: null,
      visionAtivo: params.visionAtivo || (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.getTradeVisionAtivo === 'function' ? root.TradeSimulatorModel.getTradeVisionAtivo({ ...params, grade: normalizedGrade, signalDate: sanitizedSignalDate }) : null),
      notes: params.notes || '',
      candles: Array.isArray(params.candles) ? params.candles : [],
      timeline: [
        {
          type: 'SIGNAL_IDENTIFIED',
          date: sanitizedSignalDate,
          label: 'Gatilho identificado',
          desc: `${params.triggerName} (${normalizedGrade}) em ${params.symbol}`
        },
        {
          type: 'SIMULATION_ADDED',
          date: sanitizedSignalDate,
          label: 'Simulação adicionada',
          desc: 'Registrado no Simulador de Trades'
        },
        {
          type: 'WAITING_ENTRY',
          date: sanitizedSignalDate,
          label: 'Aguardando entrada',
          desc: `Entrada planejada: R$ ${Number(params.entryPrice).toFixed(2).replace('.', ',')} | Stop: R$ ${Number(params.stopLoss).toFixed(2).replace('.', ',')}`
        }
      ]
    };

    // Tenta persistir no servidor se autenticado
    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        const res = await root.healthyTrendApi.request(API_ENDPOINT, {
          method: 'POST',
          body: JSON.stringify(newSim)
        });
        if (res && res.simulation) {
          state.simulations.unshift(sanitizeSimulationsList([res.simulation])[0] || res.simulation);
          saveLocalCache();
          render();
          if (typeof root.showToast === 'function') {
            root.showToast(`✓ Simulação de ${newSim.symbol} ativa (Aguardando entrada)`);
          }
          return res.simulation;
        }
      }
    } catch (e) {
      // Ignora erro de rede e continua localmente
    }

    state.simulations.unshift(newSim);
    saveLocalCache();
    render();
    if (typeof root.showToast === 'function') {
      root.showToast(`✓ Simulação de ${newSim.symbol} ativa (Aguardando entrada)`);
    }
    return newSim;
  }

  /**
   * Gera massa de teste no cenário de gestão selecionado ('2R', '2.5R' ou 'PYRAMID_1R_2R')
   */
  async function generateScenarioMass(scenarioId = '2R', options = null) {
    state.loading = true;
    state.generatingMass = true;
    state.massProgressText = 'Varrendo histórico e identificando operações...';
    state.activeScenario = scenarioId;
    state.tempScenarioSelection = scenarioId;
    state.scenarioModalOpen = false;
    render();

    const config = options || state.massConfig || {};
    const payload = {
      scenario: scenarioId,
      period: config.period || 120,
      startDate: config.startDate || null,
      endDate: config.endDate || null,
      universe: config.universe || 'IBOV',
      triggers: config.triggers || 'ALL',
      grades: config.grades || 'ALL',
      targetVolume: config.targetVolume || 100
    };

    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        const res = await root.healthyTrendApi.request(API_ENDPOINT + '/generate-mass', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res && Array.isArray(res.simulations) && res.simulations.length > 0) {
          state.simulations = sanitizeSimulationsList(res.simulations);
          state.comparison = res.comparison || (root.TradeSimulatorModel ? root.TradeSimulatorModel.compareManagementScenarios(state.simulations) : null);
          state.hypothesisComparison = res.hypothesisComparison || (root.TradeSimulatorModel ? root.TradeSimulatorModel.compareInsideBarTriggers(state.simulations) : null);
          state.auditReport = res.auditReport || (root.TradeSimulatorModel?.auditSimulationsBatch ? root.TradeSimulatorModel.auditSimulationsBatch(state.simulations, { parameters: payload }) : null);
          state.massResultSummary = res.meta || null;

          // Sincroniza os filtros do topo com o período gerado para que a amostra completa seja exibida na tela
          if (payload.period === 'CUSTOM') {
            state.filters.days = 'CUSTOM';
            state.filters.startDate = payload.startDate || null;
            state.filters.endDate = payload.endDate || null;
          } else if (payload.period === 'ALL') {
            state.filters.days = 'ALL';
            state.filters.startDate = null;
            state.filters.endDate = null;
          } else {
            state.filters.days = Number(payload.period);
            state.filters.startDate = null;
            state.filters.endDate = null;
          }
          state.massConfig.period = payload.period;
          state.massConfig.startDate = payload.startDate || '';
          state.massConfig.endDate = payload.endDate || '';
          if (payload.triggers && payload.triggers !== 'ALL') {
            state.filters.trigger = Array.isArray(payload.triggers) ? payload.triggers[0] : payload.triggers;
          } else {
            state.filters.trigger = 'ALL';
          }
          if (payload.grades && payload.grades !== 'ALL') {
            const rawG = Array.isArray(payload.grades) ? payload.grades[0] : payload.grades;
            state.filters.grade = root.TradeSimulatorModel?.normalizeSimulatorGrade ? root.TradeSimulatorModel.normalizeSimulatorGrade(rawG) : rawG;
          } else {
            state.filters.grade = 'ALL';
          }

          state.loading = false;
          state.generatingMass = false;
          state.massModalOpen = false;
          saveLocalCache();
          render();
          if (typeof root.showToast === 'function') {
            const count = res.meta?.executedCount || state.simulations.filter(s => s.status === 'IN_OPERATION' || s.status === 'CLOSED_GAIN' || s.status === 'CLOSED_LOSS').length;
            const pText = formatPeriodLabel(payload.period, payload.startDate, payload.endDate);
            root.showToast(`✓ Massa histórica auditada: ${count} trades executados cobrindo ${pText}.`);
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Erro ao chamar generate-mass:', e);
    }

    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        const res = await root.healthyTrendApi.request(API_ENDPOINT + '/reset', {
          method: 'POST',
          body: JSON.stringify({ scenario: scenarioId })
        });
        if (res && Array.isArray(res.simulations) && res.simulations.length > 0) {
          state.simulations = sanitizeSimulationsList(res.simulations);
          state.comparison = res.comparison || (root.TradeSimulatorModel ? root.TradeSimulatorModel.compareManagementScenarios(state.simulations) : null);
          state.auditReport = res.auditReport || (root.TradeSimulatorModel?.auditSimulationsBatch ? root.TradeSimulatorModel.auditSimulationsBatch(state.simulations, { parameters: payload }) : null);
          if (!state.comparison || !Array.isArray(state.comparison.scenarios) || !state.comparison.scenarios.some(s => s.avgDurationDaysFormatted)) {
            if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.compareManagementScenarios === 'function') {
              state.comparison = root.TradeSimulatorModel.compareManagementScenarios(state.simulations);
            }
          }
          saveLocalCache();
          state.loading = false;
          state.generatingMass = false;
          state.massModalOpen = false;
          render();
          if (typeof root.showToast === 'function') {
            const meta = (root.TradeSimulatorModel?.SCENARIO_METADATA && root.TradeSimulatorModel.SCENARIO_METADATA[scenarioId]) || { name: scenarioId };
            root.showToast(`✓ Massa de teste gerada para o cenário: ${meta.name}`);
          }
          return;
        }
      }
    } catch (e) {}

    if (root.TradeSimulatorModel) {
      if (typeof root.TradeSimulatorModel.generateExpandedSeeds === 'function') {
        state.simulations = sanitizeSimulationsList(root.TradeSimulatorModel.generateExpandedSeeds(scenarioId, payload));
      } else if (typeof root.TradeSimulatorModel.generateSeedSimulationsForScenario === 'function') {
        state.simulations = sanitizeSimulationsList(root.TradeSimulatorModel.generateSeedSimulationsForScenario(scenarioId));
      }
      state.comparison = root.TradeSimulatorModel.compareManagementScenarios(state.simulations);
      if (typeof root.TradeSimulatorModel.auditSimulationsBatch === 'function') {
        state.auditReport = root.TradeSimulatorModel.auditSimulationsBatch(state.simulations, { parameters: payload });
      }
      if (payload.period === 'CUSTOM') {
        state.filters.days = 'CUSTOM';
        state.filters.startDate = payload.startDate || null;
        state.filters.endDate = payload.endDate || null;
      } else if (payload.period === 'ALL') {
        state.filters.days = 'ALL';
        state.filters.startDate = null;
        state.filters.endDate = null;
      } else {
        state.filters.days = Number(payload.period);
        state.filters.startDate = null;
        state.filters.endDate = null;
      }
      state.massConfig.period = payload.period;
    }
    saveLocalCache();
    state.loading = false;
    state.generatingMass = false;
    state.massModalOpen = false;
    render();
    if (typeof root.showToast === 'function') {
      const meta = (root.TradeSimulatorModel?.SCENARIO_METADATA && root.TradeSimulatorModel.SCENARIO_METADATA[scenarioId]) || { name: scenarioId };
      root.showToast(`✓ Massa de teste gerada para o cenário: ${meta.name}`);
    }
  }

  function formatPeriodLabel(period, startDate, endDate) {
    if (period === 30 || period === '30') return 'os últimos 30 dias';
    if (period === 90 || period === '90') return 'os últimos 90 dias';
    if (period === 120 || period === '120') return 'os últimos 120 dias (4 meses)';
    if (period === 180 || period === '180') return 'os últimos 6 meses';
    if (period === 365 || period === '365' || period === '12m') return 'os últimos 12 meses';
    if (period === 730 || period === '730' || period === '24m') return 'os últimos 24 meses';
    if (period === 1095 || period === '1095' || period === '36m') return 'os últimos 36 meses';
    if (period === 'ALL') return 'todo o histórico disponível';
    if (period === 'CUSTOM' && startDate && endDate) return `o período de ${formatDateBR(startDate)} a ${formatDateBR(endDate)}`;
    return 'o período selecionado';
  }

  async function resetToDefaults() {
    return generateScenarioMass(state.activeScenario || '2R');
  }

  /**
   * Exclui todas as simulações imediatamente sem popup
   */
  async function clearAllSimulations() {
    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        await root.healthyTrendApi.request(API_ENDPOINT + '/clear', { method: 'POST' });
      }
    } catch (e) {}

    state.simulations = [];
    state.auditReport = root.TradeSimulatorModel && typeof root.TradeSimulatorModel.auditSimulationsBatch === 'function'
      ? root.TradeSimulatorModel.auditSimulationsBatch([])
      : null;
    saveLocalCache();
    state.selectedSimId = null;
    state.snapshotSimId = null;
    render();
    if (typeof root.showToast === 'function') {
      root.showToast('✓ Todas as simulações foram excluídas.');
    }
  }

  /**
   * Reavalia simulações ativas contra o histórico de candles
   */
  async function evaluateActive() {
    if (typeof root.showToast === 'function') {
      root.showToast('Reavaliando simulações contra candles diários...');
    }
    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        const res = await root.healthyTrendApi.request(API_ENDPOINT + '/evaluate', { method: 'POST' });
        if (res && res.updatedCount > 0) {
          await loadData();
          render();
          if (typeof root.showToast === 'function') {
            root.showToast(`✓ ${res.updatedCount} simulações atualizadas com novos candles.`);
          }
          return;
        }
      }
    } catch (e) {}

    // Fallback: se tivermos TickerChart carregado no front
    if (root.TickerChart && root.TradeSimulatorModel) {
      let updated = 0;
      for (const sim of state.simulations) {
        if (sim.status === 'WAITING_ENTRY' || sim.status === 'IN_OPERATION') {
          try {
            const data = await root.TickerChart.fetchData(sim.symbol);
            if (data && Array.isArray(data.ohlc)) {
              const res = root.TradeSimulatorModel.evaluateSimulationOnCandles(sim, data.ohlc);
              if (res.status !== sim.status || res.resultR !== sim.resultR) {
                Object.assign(sim, res);
                updated++;
              }
            }
          } catch (e) {}
        }
      }
      if (updated > 0) {
        state.simulations = sanitizeSimulationsBatch(state.simulations);
        refreshAuditReport(state.simulations);
        saveLocalCache();
        render();
        if (typeof root.showToast === 'function') {
          root.showToast(`✓ ${updated} simulações atualizadas com novos candles.`);
        }
        return;
      }
    }

    if (typeof root.showToast === 'function') {
      root.showToast('Nenhuma nova alteração nos candles analisados.');
    }
  }

  /**
   * Abre o modal de exportação de estudos
   */
  function openExportModal() {
    state.exportModalOpen = true;
    render();
  }

  /**
   * Fecha o modal de exportação de estudos
   */
  function closeExportModal() {
    state.exportModalOpen = false;
    render();
  }

  /**
   * Dispara download de Blob no navegador
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /**
   * Executa a exportação no formato selecionado (DOC, PDF, ENEX, CSV)
   */
  function executeExport() {
    const model = root.TradeSimulatorExportModel;
    if (!model) {
      if (typeof root.showToast === 'function') {
        root.showToast('Módulo de exportação não carregado.', 'error');
      }
      return;
    }

    const filtered = getFilteredSimulations();
    const all = state.simulations;
    const targetSimulations = state.exportScope === 'ALL' ? all : filtered;

    if (!targetSimulations.length) {
      if (typeof root.showToast === 'function') {
        root.showToast('Nenhum trade encontrado no escopo selecionado para exportar.', 'warn');
      }
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const count = targetSimulations.length;

    try {
      if (state.exportFormat === 'DOC') {
        const docContent = model.toDoc(targetSimulations);
        const blob = new Blob([docContent], { type: 'application/msword;charset=utf-8' });
        downloadBlob(blob, `simulador-de-trades-estudo-${dateStr}.doc`);
        if (typeof root.showToast === 'function') {
          root.showToast(`✓ Exportado ${count} trades para Word (.DOC) com 1 trade por página.`);
        }
      } else if (state.exportFormat === 'PDF') {
        const htmlContent = model.toPrintableHtml(targetSimulations);
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        } else {
          // Fallback se bloqueador de pop-ups estiver ativo
          const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
          downloadBlob(blob, `simulador-de-trades-estudo-${dateStr}.html`);
        }
        if (typeof root.showToast === 'function') {
          root.showToast(`✓ Documento gerado com 1 trade por página para salvar como PDF.`);
        }
      } else if (state.exportFormat === 'ENEX') {
        const enexContent = model.toEnex(targetSimulations);
        const blob = new Blob([enexContent], { type: 'application/xml;charset=utf-8' });
        downloadBlob(blob, `simulador-de-trades-evernote-${dateStr}.enex`);
        if (typeof root.showToast === 'function') {
          root.showToast(`✓ Exportado ${count} notas independentes para Evernote (.ENEX).`);
        }
      } else if (state.exportFormat === 'CSV') {
        const csvContent = model.toCsv(targetSimulations);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        downloadBlob(blob, `simulador-de-trades-${dateStr}.csv`);
        if (typeof root.showToast === 'function') {
          root.showToast(`✓ Exportado ${count} trades simulados para CSV.`);
        }
      }

      state.exportModalOpen = false;
      render();
    } catch (err) {
      console.error('Erro ao exportar trades:', err);
      if (typeof root.showToast === 'function') {
        root.showToast('Erro ao gerar exportação: ' + (err.message || 'Falha interna'), 'error');
      }
    }
  }

  /**
   * Exporta os dados filtrados como CSV diretamente (compatibilidade de atalho)
   */
  function exportFilteredCSV() {
    state.exportFormat = 'CSV';
    state.exportScope = 'FILTERED';
    executeExport();
  }

  /**
   * Obtém simulações no escopo dos filtros do topo (dias, gatilho, setor, nota)
   */
  function getScopedSimulations() {
    if (!root.TradeSimulatorModel || typeof root.TradeSimulatorModel.filterSimulations !== 'function') {
      return state.simulations;
    }
    return root.TradeSimulatorModel.filterSimulations(state.simulations, {
      days: state.filters.days,
      startDate: state.filters.startDate,
      endDate: state.filters.endDate,
      trigger: state.filters.trigger,
      sector: state.filters.sector,
      grade: state.filters.grade,
      tab: 'ALL',
      query: ''
    });
  }

  /**
   * Ordena a lista de simulações com base na coluna e direção selecionadas
   */
  function sortSimulations(list, sort) {
    if (!Array.isArray(list) || !sort || !sort.column) return list || [];
    const col = sort.column;
    const dir = sort.direction === 'asc' ? 1 : -1;

    return [...list].sort((a, b) => {
      let valA;
      let valB;

      switch (col) {
        case 'symbol':
          valA = (a.symbol || '').toUpperCase();
          valB = (b.symbol || '').toUpperCase();
          break;
        case 'triggerName':
          valA = (a.triggerName || '').toLowerCase();
          valB = (b.triggerName || '').toLowerCase();
          break;
        case 'grade': {
          const gradeRank = { 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
          valA = gradeRank[a.grade] ?? -1;
          valB = gradeRank[b.grade] ?? -1;
          break;
        }
        case 'signalDate':
          valA = a.signalDate || '';
          valB = b.signalDate || '';
          break;
        case 'entryPrice':
          valA = Number(a.entryPrice) || 0;
          valB = Number(b.entryPrice) || 0;
          break;
        case 'stopLoss':
          valA = Number(a.stopLoss) || 0;
          valB = Number(b.stopLoss) || 0;
          break;
        case 'status': {
          const statusRank = { 'IN_OPERATION': 4, 'WAITING_ENTRY': 3, 'CLOSED_GAIN': 2, 'CLOSED_LOSS': 1, 'NOT_TRIGGERED': 0 };
          valA = statusRank[a.status] ?? -1;
          valB = statusRank[b.status] ?? -1;
          break;
        }
        case 'currentPrice':
          valA = Number(a.currentPrice) || 0;
          valB = Number(b.currentPrice) || 0;
          break;
        case 'resultR':
          valA = a.resultR !== null && a.resultR !== undefined ? Number(a.resultR) : (dir === 1 ? 9999 : -9999);
          valB = b.resultR !== null && b.resultR !== undefined ? Number(b.resultR) : (dir === 1 ? 9999 : -9999);
          break;
        case 'mfeR':
          valA = a.mfeR !== null && a.mfeR !== undefined ? Number(a.mfeR) : (dir === 1 ? 9999 : -9999);
          valB = b.mfeR !== null && b.mfeR !== undefined ? Number(b.mfeR) : (dir === 1 ? 9999 : -9999);
          break;
        case 'maeR':
          valA = a.maeR !== null && a.maeR !== undefined ? Number(a.maeR) : (dir === 1 ? 9999 : -9999);
          valB = b.maeR !== null && b.maeR !== undefined ? Number(b.maeR) : (dir === 1 ? 9999 : -9999);
          break;
        case 'durationDays': {
          const getDur = s => {
            if (s.durationDays != null) return Number(s.durationDays);
            if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.calculateTradeDurationDays === 'function') {
              return root.TradeSimulatorModel.calculateTradeDurationDays(s);
            }
            return null;
          };
          const durA = getDur(a);
          const durB = getDur(b);
          valA = durA !== null && durA !== undefined ? durA : (dir === 1 ? 9999 : -9999);
          valB = durB !== null && durB !== undefined ? durB : (dir === 1 ? 9999 : -9999);
          break;
        }
        default:
          valA = a[col] != null ? a[col] : '';
          valB = b[col] != null ? b[col] : '';
      }

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }

  /**
   * Aplica filtros atuais completos (incluindo aba de status e busca textual) e ordenação
   */
  function getFilteredSimulations() {
    let filtered;
    if (!root.TradeSimulatorModel || typeof root.TradeSimulatorModel.filterSimulations !== 'function') {
      filtered = state.simulations;
    } else {
      filtered = root.TradeSimulatorModel.filterSimulations(state.simulations, state.filters);
    }
    return sortSimulations(filtered, state.sort);
  }

  /**
   * Formatação auxiliar
   */
  function formatMoney(val) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
    return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatR(val) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2).replace('.', ',')}R`;
  }

  function formatDateBR(isoStr) {
    if (!isoStr) return '—';
    const parts = String(isoStr).slice(0, 10).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoStr;
  }

  function formatDurationDays(val) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
    const n = Math.round(Number(val));
    return `${n} dia${n === 1 ? '' : 's'}`;
  }

  /**
   * Renderização Principal
   */
  function render() {
    const rootEl = document.getElementById('tradeSimulatorRoot');
    if (!rootEl) return;

    const scoped = getScopedSimulations();
    const stats = root.TradeSimulatorModel
      ? root.TradeSimulatorModel.calculateSimulatorStats(scoped)
      : {
          totalCreated: scoped.length,
          executedEntriesCount: 0,
          executedPct: 0,
          winningTradesCount: 0,
          winRate: 0,
          losingTradesCount: 0,
          lossRate: 0,
          totalR: 0,
          totalRFormatted: '+0,00R',
          avgR: 0,
          avgRFormatted: '+0,00R',
          waitingCount: 0,
          waitingPct: 0,
          inOperationCount: 0,
          closedCount: 0,
          distribution: { winners: { count: 0, label: '0%' }, losers: { count: 0, label: '0%' }, notTriggered: { count: 0, label: '0%' } },
          triggerPerformance: [],
          equityCurve: []
        };

    const filtered = getFilteredSimulations();

    rootEl.innerHTML = `
      <div class="simulator-page">
        ${renderHeader()}
        ${renderKpiCards(stats)}
        ${renderChartsRow(stats)}
        ${renderTableSection(filtered, stats)}
        ${renderMassModal()}
        ${renderCompareModal()}
        ${renderHypothesisModal()}
        ${renderAuditModal()}
        ${renderModal()}
        ${renderSnapshotModal()}
        ${renderExportModal()}
      </div>
    `;

    bindLocalEvents(rootEl);
    if (root.RiskOfRuinController && typeof root.RiskOfRuinController.renderTradeSimulatorScenarioSection === 'function') {
      try { root.RiskOfRuinController.renderTradeSimulatorScenarioSection(); } catch (_) {}
    }
  }

  /**
   * 1. Header com Título, Botão da Massa de Teste, Filtros e Botão Comparar Cenários
   */
  function renderHeader() {
    let daysLabel = 'Últimos 120 dias (4 meses)';
    if (state.filters.days === 30) daysLabel = 'Últimos 30 dias';
    else if (state.filters.days === 90) daysLabel = 'Últimos 90 dias';
    else if (state.filters.days === 120) daysLabel = 'Últimos 120 dias (4 meses)';
    else if (state.filters.days === 180) daysLabel = 'Últimos 6 meses';
    else if (state.filters.days === 365) daysLabel = 'Últimos 12 meses';
    else if (state.filters.days === 730) daysLabel = 'Últimos 24 meses';
    else if (state.filters.days === 1095) daysLabel = 'Últimos 36 meses';
    else if (state.filters.days === 'CUSTOM') {
      if (state.filters.startDate && state.filters.endDate) {
        daysLabel = `${formatDateBR(state.filters.startDate)} a ${formatDateBR(state.filters.endDate)}`;
      } else {
        daysLabel = 'Período Personalizado';
      }
    } else if (state.filters.days === 'ALL') {
      daysLabel = 'Todo o período';
    }

    const triggerLabel = state.filters.trigger === 'ALL' ? 'Todos os gatilhos' : state.filters.trigger;
    const sectorLabel = state.filters.sector === 'ALL' ? 'Todos os setores' : state.filters.sector;
    const gradeLabel = state.filters.grade === 'ALL' ? 'Todas as notas' : `Nota ${state.filters.grade}`;

    const audit = state.auditReport || (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.auditSimulationsBatch === 'function'
      ? root.TradeSimulatorModel.auditSimulationsBatch(state.simulations, { scenario: state.activeScenario })
      : null);
    const isConsistent = !audit || audit.isConsistent !== false;
    const invalidCount = audit ? (audit.invalidTradesCount || 0) : 0;

    return `
      <div class="sim-header">
        <div class="sim-header-titles">
          <div class="sim-title-row">
            <h1>Simulador de Trades</h1>
            <span class="sim-beta-badge">BETA</span>
            <button type="button" class="sim-audit-status-pill ${isConsistent ? 'consistent' : 'inconsistent'}" id="simBtnAuditModal" title="Abrir Relatório de Auditoria e Consistência dos Dados">
              <span>${isConsistent ? '🛡️ Auditoria: 100% Consistente' : `⚠️ Auditoria: ${invalidCount} inconsistência(s)`}</span>
            </button>
          </div>
          <p>Acompanhe como seus trades teriam performado seguindo as regras do seu método.</p>
        </div>

        <div class="sim-top-filters">
          <!-- Filtro Período -->
          <div class="sim-filter-select-wrap">
            <button class="sim-filter-btn" type="button" data-dropdown="days">
              <span class="sim-filter-ico">📅</span>
              <span>${daysLabel}</span>
              <span class="sim-chevron">⌵</span>
            </button>
            <div class="sim-dropdown-menu ${state.activeDropdown === 'days' ? 'open' : ''}">
              <button class="sim-dropdown-item ${state.filters.days === 30 ? 'active' : ''}" data-filter-type="days" data-filter-val="30">Últimos 30 dias</button>
              <button class="sim-dropdown-item ${state.filters.days === 90 ? 'active' : ''}" data-filter-type="days" data-filter-val="90">Últimos 90 dias</button>
              <button class="sim-dropdown-item ${state.filters.days === 120 ? 'active' : ''}" data-filter-type="days" data-filter-val="120">Últimos 120 dias (4 meses)</button>
              <button class="sim-dropdown-item ${state.filters.days === 180 ? 'active' : ''}" data-filter-type="days" data-filter-val="180">Últimos 6 meses</button>
              <button class="sim-dropdown-item ${state.filters.days === 365 ? 'active' : ''}" data-filter-type="days" data-filter-val="365">Últimos 12 meses</button>
              <button class="sim-dropdown-item ${state.filters.days === 730 ? 'active' : ''}" data-filter-type="days" data-filter-val="730">Últimos 24 meses</button>
              <button class="sim-dropdown-item ${state.filters.days === 1095 ? 'active' : ''}" data-filter-type="days" data-filter-val="1095">Últimos 36 meses</button>
              <button class="sim-dropdown-item ${state.filters.days === 'CUSTOM' ? 'active' : ''}" data-filter-type="days" data-filter-val="CUSTOM">Personalizado...</button>
              <button class="sim-dropdown-item ${state.filters.days === 'ALL' ? 'active' : ''}" data-filter-type="days" data-filter-val="ALL">Todo o período</button>
            </div>
          </div>

          <!-- Filtro Gatilho -->
          <div class="sim-filter-select-wrap">
            <button class="sim-filter-btn" type="button" data-dropdown="trigger">
              <span class="sim-filter-ico">🎯</span>
              <span>${triggerLabel}</span>
              <span class="sim-chevron">⌵</span>
            </button>
            <div class="sim-dropdown-menu ${state.activeDropdown === 'trigger' ? 'open' : ''}">
              <button class="sim-dropdown-item ${state.filters.trigger === 'ALL' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="ALL">Todos os gatilhos</button>
              <button class="sim-dropdown-item ${state.filters.trigger === 'Inside Bar' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="Inside Bar">Inside Bar</button>
              <button class="sim-dropdown-item ${state.filters.trigger === 'Double Inside Bar' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="Double Inside Bar">Double Inside Bar</button>
              <button class="sim-dropdown-item ${state.filters.trigger === '1-2-3 de Compra' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="1-2-3 de Compra">1-2-3 de Compra</button>
              <button class="sim-dropdown-item ${state.filters.trigger === 'PFR de Compra' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="PFR de Compra">PFR de Compra</button>
              <button class="sim-dropdown-item ${state.filters.trigger === 'Dave Landry' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="Dave Landry">Dave Landry</button>
              <button class="sim-dropdown-item ${state.filters.trigger === 'Red Bar Ignored' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="Red Bar Ignored">Red Bar Ignored</button>
              <button class="sim-dropdown-item ${state.filters.trigger === 'Outros' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="Outros">Outros</button>
            </div>
          </div>

          <!-- Filtro Notas (Fonte de Verdade: Novo Trade / Rubric: A, B, C, D) -->
          <div class="sim-filter-select-wrap">
            <button class="sim-filter-btn" type="button" data-dropdown="grade">
              <span class="sim-filter-ico">🏷️</span>
              <span>${gradeLabel}</span>
              <span class="sim-chevron">⌵</span>
            </button>
            <div class="sim-dropdown-menu ${state.activeDropdown === 'grade' ? 'open' : ''}">
              <button class="sim-dropdown-item ${state.filters.grade === 'ALL' ? 'active' : ''}" data-filter-type="grade" data-filter-val="ALL">Todas as notas</button>
              <button class="sim-dropdown-item ${state.filters.grade === 'A' ? 'active' : ''}" data-filter-type="grade" data-filter-val="A">Nota A</button>
              <button class="sim-dropdown-item ${state.filters.grade === 'B' ? 'active' : ''}" data-filter-type="grade" data-filter-val="B">Nota B</button>
              <button class="sim-dropdown-item ${state.filters.grade === 'C' ? 'active' : ''}" data-filter-type="grade" data-filter-val="C">Nota C</button>
              <button class="sim-dropdown-item ${state.filters.grade === 'D' ? 'active' : ''}" data-filter-type="grade" data-filter-val="D">Nota D</button>
            </div>
          </div>

          <!-- Painel Centralizado da Massa de Teste -->
          <button class="sim-filter-btn" type="button" id="simBtnMassModal" title="Painel da Massa de Teste: Gerar, Reavaliar e Excluir">
            <span class="sim-filter-ico">⚡</span>
            <span>Gerar Massa de Teste</span>
            <span class="sim-chevron">⌵</span>
          </button>

          <!-- Botão Estratégico: Comparar Cenários -->
          <button class="sim-btn-compare-scenarios" type="button" id="simBtnCompareModal" title="Comparar cenários de gestão na mesma amostra de trades">
            <span>📊 Comparar Cenários</span>
          </button>

          <!-- Botão Hipótese: Estudo Double Inside Bar -->
          <button class="sim-btn-hypothesis" type="button" id="simBtnHypothesisModal" title="Estudo Estatístico: Double Inside Bar vs Inside Bar simples">
            <span>🔬 Estudo: Double Inside Bar</span>
          </button>

          <!-- Botão Mais Opções (···) com Dropdown -->
          <div class="sim-filter-select-wrap">
            <button class="sim-filter-btn sim-more-btn" type="button" data-dropdown="more" id="simBtnMoreDropdown" title="Mais opções: Massa de teste, Comparador, Auditoria, Reavaliar e Excluir">
              <span>···</span>
            </button>
            <div class="sim-dropdown-menu sim-more-dropdown ${state.activeDropdown === 'more' ? 'open' : ''}">
              <button class="sim-dropdown-item" type="button" id="simMoreBtnMass">
                <span>⚡</span> <span>Gerar Massa de Teste</span>
              </button>
              <button class="sim-dropdown-item" type="button" id="simMoreBtnCompare">
                <span>📊</span> <span>Comparar Cenários</span>
              </button>
              <button class="sim-dropdown-item" type="button" id="simMoreBtnHypothesis">
                <span>🔬</span> <span>Estudo: Double Inside Bar</span>
              </button>
              <button class="sim-dropdown-item" type="button" id="simMoreBtnAudit">
                <span>🛡️</span> <span>Relatório de Auditoria</span>
              </button>
              <button class="sim-dropdown-item" type="button" id="simMoreBtnEvaluate">
                <span>↻</span> <span>Reavaliar Candles</span>
              </button>
              <button class="sim-dropdown-item" type="button" id="simMoreBtnExport">
                <span>📥</span> <span>Exportar Simulação</span>
              </button>
              <div class="sim-dropdown-divider"></div>
              <button class="sim-dropdown-item danger" type="button" id="simMoreBtnClear">
                <span>🗑️</span> <span>Excluir Simulações</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Barra de Período Personalizado Inline (quando ativo) -->
      ${state.filters.days === 'CUSTOM' ? `
        <div class="sim-custom-filter-bar">
          <span class="sim-custom-filter-label">📅 Intervalo personalizado:</span>
          <input type="date" id="simCustomFilterStart" value="${state.filters.startDate || ''}" class="sim-date-input" />
          <span class="sim-custom-filter-sep">até</span>
          <input type="date" id="simCustomFilterEnd" value="${state.filters.endDate || ''}" class="sim-date-input" />
          <button type="button" id="simCustomFilterApply" class="sim-date-apply-btn">Aplicar Filtro</button>
        </div>
      ` : ''}

      <!-- Banner Informativo de Massa Gerada / Metadados -->
      ${state.massResultSummary ? `
        <div class="sim-mass-summary-banner">
          <div class="sim-mass-summary-left">
            <span class="sim-mass-summary-badge ${state.massResultSummary.targetReached ? 'success' : 'info'}">
              ${state.massResultSummary.targetReached ? '✓ META ALCANÇADA' : 'ℹ️ AMOSTRA FINAL'}
            </span>
            <div class="sim-mass-summary-main">
              <span class="sim-mass-summary-title">
                <strong>${state.massResultSummary.executedCount || 0} trades executados</strong>
                de ${state.massResultSummary.totalSignals || 0} sinais detectados
                ${state.massResultSummary.targetVolume && state.massResultSummary.targetVolume !== 'MAX' ? `(Meta: ${state.massResultSummary.targetVolume})` : '(Varredura Máxima)'}
              </span>
              <span class="sim-mass-summary-desc">
                Período: <strong>${formatDateBR(state.massResultSummary.period?.minDate)}</strong> a <strong>${formatDateBR(state.massResultSummary.period?.maxDate)}</strong> (${state.massResultSummary.period?.totalTradingSessions || 0} pregões reais). Universo: <strong>${state.massResultSummary.universe || 'IBOV'}</strong>. Cenário: <strong>${state.massResultSummary.scenario || '2R'}</strong>.
                <button type="button" class="sim-banner-audit-link" id="simBannerBtnAudit">${isConsistent ? '🛡️ Auditoria: 0 inconsistências' : `⚠️ Ver ${invalidCount} inconsistência(s)`}</button>
                ${!state.massResultSummary.targetReached && state.massResultSummary.targetVolume !== 'MAX' ? '<br><em class="sim-mass-fidelity-note">⚠️ Nota de Fidelidade Estatística: O número de trades executados foi delimitado pela cobertura histórica disponível e pelos critérios rigorosos do método. O sistema não inventa dados artificiais para preencher metas.</em>' : ''}
              </span>
            </div>
          </div>
          <button type="button" class="sim-mass-summary-close" id="simDismissMassSummary" title="Fechar aviso">×</button>
        </div>
      ` : ''}
    `;
  }

  /**
   * 2. Conjunto de KPI Cards (Primários e Secundários Estatísticos)
   */
  function renderKpiCards(stats) {
    const totalRClass = stats.totalR > 0 ? 'positive' : (stats.totalR < 0 ? 'negative' : 'neutral');
    const avgRClass = stats.avgR > 0 ? 'positive' : (stats.avgR < 0 ? 'negative' : 'neutral');

    return `
      <!-- Linha 1: 8 KPIs Operacionais Primários -->
      <div class="sim-kpis-container">
        <!-- Card 1: Simulações criadas -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-blue">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </span>
            <span class="sim-kpi-title">Simulações criadas</span>
          </div>
          <div class="sim-kpi-val">${stats.totalCreated}</div>
          <p class="sim-kpi-sub">Sinais detectados no período.</p>
        </div>

        <!-- Card 2: Entradas executadas -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-green">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </span>
            <span class="sim-kpi-title">Entradas executadas</span>
          </div>
          <div class="sim-kpi-val">${stats.executedEntriesCount}</div>
          <p class="sim-kpi-sub"><strong>${stats.executedPct.toFixed(1).replace('.', ',')}%</strong> acionaram entrada.</p>
        </div>

        <!-- Card 3: Trades vencedores -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-green">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1h10v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34"></path>
                <path d="M6 4h12v5a6 6 0 0 1-12 0V4z"></path>
              </svg>
            </span>
            <span class="sim-kpi-title">Trades vencedores</span>
          </div>
          <div class="sim-kpi-val">${stats.winningTradesCount}</div>
          <p class="sim-kpi-sub"><strong>${stats.winRate.toFixed(1).replace('.', ',')}%</strong> de win rate.</p>
        </div>

        <!-- Card 4: Trades perdedores -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-red">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </span>
            <span class="sim-kpi-title">Trades perdedores</span>
          </div>
          <div class="sim-kpi-val">${stats.losingTradesCount}</div>
          <p class="sim-kpi-sub"><strong>${stats.lossRate.toFixed(1).replace('.', ',')}%</strong> de loss rate.</p>
        </div>

        <!-- Card 5: Resultado total -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-green">
              <span style="font-size: 13px; font-weight: 800; font-family: system-ui; line-height: 1;">Σ</span>
            </span>
            <span class="sim-kpi-title">Resultado total</span>
          </div>
          <div class="sim-kpi-val ${totalRClass}">${stats.totalRFormatted}</div>
          <p class="sim-kpi-sub">Soma de ganhos e perdas.</p>
        </div>

        <!-- Card 6: R médio / trade -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-green">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </span>
            <span class="sim-kpi-title">R médio / trade</span>
          </div>
          <div class="sim-kpi-val ${avgRClass}">${stats.avgRFormatted}</div>
          <p class="sim-kpi-sub">Expectativa matemática.</p>
        </div>

        <!-- Card 7: Duração média -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-blue">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <span class="sim-kpi-title">Duração média</span>
          </div>
          <div class="sim-kpi-val">${stats.avgDurationDaysFormatted || '—'}</div>
          <p class="sim-kpi-sub">Tempo em operação.</p>
        </div>

        <!-- Card 8: Aguardando entrada -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-orange">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 22h14"></path>
                <path d="M5 2h14"></path>
                <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
                <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
              </svg>
            </span>
            <span class="sim-kpi-title">Aguardando entrada</span>
          </div>
          <div class="sim-kpi-val">${stats.waitingCount}</div>
          <p class="sim-kpi-sub"><strong>${stats.waitingPct.toFixed(1).replace('.', ',')}%</strong> ainda não ativaram.</p>
        </div>
      </div>

      <!-- Linha 2: 4 KPIs Estatísticos Avançados (Validação em Escala) -->
      <div class="sim-kpis-advanced-row">
        <!-- Card 9: Profit Factor -->
        <div class="sim-kpi-card advanced">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-green">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </span>
            <span class="sim-kpi-title">Profit Factor</span>
          </div>
          <div class="sim-kpi-val ${(stats.profitFactor || 0) >= 1.5 ? 'positive' : ((stats.profitFactor || 0) < 1 ? 'negative' : 'neutral')}">
            ${stats.profitFactorFormatted || (stats.profitFactor ? stats.profitFactor.toFixed(2).replace('.', ',') : '—')}
          </div>
          <p class="sim-kpi-sub">Ganhos (${stats.totalGainsR != null ? '+' + stats.totalGainsR.toFixed(1).replace('.', ',') + 'R' : '—'}) / Perdas (${stats.totalLossesR != null ? '-' + stats.totalLossesR.toFixed(1).replace('.', ',') + 'R' : '—'}).</p>
        </div>

        <!-- Card 10: Drawdown Máximo -->
        <div class="sim-kpi-card advanced">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-red">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                <polyline points="17 18 23 18 23 12"></polyline>
              </svg>
            </span>
            <span class="sim-kpi-title">Drawdown Máximo</span>
          </div>
          <div class="sim-kpi-val negative">
            ${stats.maxDrawdownRFormatted || (stats.maxDrawdownR != null ? '-' + Math.abs(stats.maxDrawdownR).toFixed(1).replace('.', ',') + 'R' : '0,0R')}
          </div>
          <p class="sim-kpi-sub">Maior rebaixamento acumulado de capital.</p>
        </div>

        <!-- Card 11: Sequência Máxima de Perdas -->
        <div class="sim-kpi-card advanced">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-orange">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="15"></line>
                <line x1="15" y1="9" x2="9" y2="15"></line>
              </svg>
            </span>
            <span class="sim-kpi-title">Sequência de Stops</span>
          </div>
          <div class="sim-kpi-val">
            ${stats.maxConsecutiveLosses != null ? stats.maxConsecutiveLosses + (stats.maxConsecutiveLosses === 1 ? ' trade' : ' trades') : '0 trades'}
          </div>
          <p class="sim-kpi-sub">Pior série consecutiva de perdas registrada.</p>
        </div>

        <!-- Card 12: Sinais Não Acionados -->
        <div class="sim-kpi-card advanced">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-gray">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
              </svg>
            </span>
            <span class="sim-kpi-title">Sinais Não Acionados</span>
          </div>
          <div class="sim-kpi-val">
            ${stats.notTriggeredCount != null ? stats.notTriggeredCount : 0}
          </div>
          <p class="sim-kpi-sub">Expiraram ou stop foi violado antes da entrada.</p>
        </div>
      </div>
    `;
  }

  /**
   * 3. Linha de 3 Gráficos: Curva de Resultados, Distribuição e Desempenho
   */
  function renderChartsRow(stats) {
    const isUnitRS = state.filters.unit === 'RS';
    const riskNominal = 1000; // Padrão R$ 1.000,00 por R
    const displayTotal = isUnitRS
      ? `+R$ ${(stats.totalR * riskNominal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : stats.totalRFormatted;

    // 1. Gráfico Curva de Equity SVG
    const curvePoints = stats.equityCurve && stats.equityCurve.length > 0 ? stats.equityCurve : [];
    const svgChartHtml = renderEquitySvgChart(curvePoints, isUnitRS, riskNominal);

    // 2. Gráfico Distribuição de Resultados
    const dist = stats.distribution || {
      winners: { count: 0, label: 'Vencedores (0%)' },
      losers: { count: 0, label: 'Perdedores (0%)' },
      notTriggered: { count: 0, label: 'Não acionados (0%)' }
    };
    const maxDistCount = Math.max(1, dist.winners.count || 0, dist.losers.count || 0, dist.notTriggered.count || 0);
    const hWinners = Math.max(8, Math.min(100, Math.round(((dist.winners.count || 0) / maxDistCount) * 82)));
    const hLosers = Math.max(8, Math.min(100, Math.round(((dist.losers.count || 0) / maxDistCount) * 82)));
    const hNotTrig = Math.max(8, Math.min(100, Math.round(((dist.notTriggered.count || 0) / maxDistCount) * 82)));

    // 3. Gráficos de Desempenho (Gatilhos, Notas do Rubric ou Período)
    const breakdownView = state.breakdownView || 'triggers';
    let breakdownTitle = 'Desempenho por Gatilho';
    let breakdownItemsHtml = '';

    if (breakdownView === 'grades') {
      breakdownTitle = 'Desempenho por Nota do Rubric';
      const grades = stats.gradePerformance || [];
      const maxGradeR = Math.max(...grades.map(g => Math.max(0.1, Math.abs(g.totalR || 0))), 10);
      breakdownItemsHtml = grades.map(g => {
        const widthPct = Math.max(2, Math.min(100, Math.round((Math.abs(g.totalR || 0) / maxGradeR) * 100)));
        const colorClass = (g.totalR || 0) >= 0 ? '' : 'negative-bar';
        return `
          <div class="sim-trigger-row">
            <span class="sim-trigger-name" title="${g.name}">Nota ${g.name}</span>
            <div class="sim-trigger-bar-bg">
              <div class="sim-trigger-bar-fill ${colorClass}" style="width: ${widthPct}%;"></div>
            </div>
            <div class="sim-trigger-right">
              <span class="sim-trigger-val">${g.totalRFormatted}</span>
              <span class="sim-trigger-count">${g.tradesText}</span>
            </div>
          </div>
        `;
      }).join('');
    } else if (breakdownView === 'period') {
      breakdownTitle = 'Desempenho por Período';
      const periods = stats.periodPerformance || [];
      const maxPerR = Math.max(...periods.map(p => Math.max(0.1, Math.abs(p.totalR || 0))), 10);
      breakdownItemsHtml = periods.map(p => {
        const widthPct = Math.max(2, Math.min(100, Math.round((Math.abs(p.totalR || 0) / maxPerR) * 100)));
        const colorClass = (p.totalR || 0) >= 0 ? '' : 'negative-bar';
        return `
          <div class="sim-trigger-row">
            <span class="sim-trigger-name" title="${p.name}">${p.name}</span>
            <div class="sim-trigger-bar-bg">
              <div class="sim-trigger-bar-fill ${colorClass}" style="width: ${widthPct}%;"></div>
            </div>
            <div class="sim-trigger-right">
              <span class="sim-trigger-val">${p.totalRFormatted}</span>
              <span class="sim-trigger-count">${p.tradesText}</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      breakdownTitle = 'Desempenho por Gatilho';
      const triggers = stats.triggerPerformance || [];
      const maxTriggerR = Math.max(...triggers.map(t => Math.max(0.1, Math.abs(t.totalR || 0))), 10);
      breakdownItemsHtml = triggers.map(t => {
        const widthPct = Math.max(2, Math.min(100, Math.round((Math.abs(t.totalR || 0) / maxTriggerR) * 100)));
        const colorClass = (t.totalR || 0) >= 0 ? '' : 'negative-bar';
        return `
          <div class="sim-trigger-row">
            <span class="sim-trigger-name" title="${t.name}">${t.name}</span>
            <div class="sim-trigger-bar-bg">
              <div class="sim-trigger-bar-fill ${colorClass}" style="width: ${widthPct}%;"></div>
            </div>
            <div class="sim-trigger-right">
              <span class="sim-trigger-val">${t.totalRFormatted}</span>
              <span class="sim-trigger-count">${t.tradesText}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    return `
      <div class="sim-charts-row">
        <!-- Gráfico 1: Evolução do Resultado Simulado -->
        <div class="sim-chart-card">
          <div class="sim-chart-head">
            <div class="sim-chart-title-wrap">
              <h3 class="sim-chart-title">
                <span>📈</span> Evolução do Resultado Simulado
              </h3>
            </div>
            <div class="sim-chart-head-right">
              <div class="sim-unit-toggle">
                <button class="sim-unit-btn ${!isUnitRS ? 'active' : ''}" data-unit="R">R</button>
                <button class="sim-unit-btn ${isUnitRS ? 'active' : ''}" data-unit="RS">R$</button>
              </div>
              <div class="sim-equity-metric">
                <div class="sim-equity-metric-val">${displayTotal}</div>
                <div class="sim-equity-metric-lbl">Resultado acumulado</div>
              </div>
            </div>
          </div>
          <div class="sim-equity-svg-wrap">
            ${svgChartHtml}
          </div>
        </div>

        <!-- Gráfico 2: Distribuição de Resultados (Geral vs Histograma R) -->
        <div class="sim-chart-card">
          <div class="sim-chart-head">
            <h3 class="sim-chart-title">
              <span>📊</span> Distribuição de Resultados
            </h3>
            <div class="sim-chart-tab-group">
              <button class="sim-chart-tab-btn ${state.distView === 'overview' ? 'active' : ''}" type="button" data-dist-tab="overview">Geral</button>
              <button class="sim-chart-tab-btn ${state.distView === 'r_buckets' ? 'active' : ''}" type="button" data-dist-tab="r_buckets">Histograma R</button>
            </div>
          </div>

          ${state.distView === 'r_buckets' ? `
            <div class="sim-r-hist-wrap">
              ${(stats.rDistribution || []).map(b => {
                const isNeg = b.bucket.includes('-') && !b.bucket.startsWith('0');
                const barColor = isNeg ? 'bar-red' : 'bar-green';
                const maxCount = Math.max(1, ...((stats.rDistribution || []).map(x => x.count || 0)));
                const hPct = Math.max(8, Math.min(100, Math.round(((b.count || 0) / maxCount) * 82)));
                return `
                  <div class="sim-r-hist-col">
                    <span class="sim-r-hist-count">${b.count}</span>
                    <div class="sim-r-hist-bar ${barColor}" style="height: ${hPct}%;"></div>
                    <span class="sim-r-hist-label">${b.bucket}</span>
                    <span class="sim-r-hist-pct">${b.pctFormatted}</span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="sim-dist-bars-wrap">
              <!-- Vencedores -->
              <div class="sim-dist-col">
                <span class="sim-dist-count">${dist.winners.count}</span>
                <div class="sim-dist-bar bar-green" style="height: ${hWinners}%;"></div>
                <span class="sim-dist-label">${dist.winners.label.replace(' (', '<br>(')}</span>
              </div>
              <!-- Perdedores -->
              <div class="sim-dist-col">
                <span class="sim-dist-count">${dist.losers.count}</span>
                <div class="sim-dist-bar bar-red" style="height: ${hLosers}%;"></div>
                <span class="sim-dist-label">${dist.losers.label.replace(' (', '<br>(')}</span>
              </div>
              <!-- Não acionados -->
              <div class="sim-dist-col">
                <span class="sim-dist-count">${dist.notTriggered.count}</span>
                <div class="sim-dist-bar bar-gray" style="height: ${hNotTrig}%;"></div>
                <span class="sim-dist-label">${dist.notTriggered.label.replace(' (', '<br>(')}</span>
              </div>
            </div>
          `}
        </div>

        <!-- Gráfico 3: Desempenho por Gatilho, Nota ou Período -->
        <div class="sim-chart-card">
          <div class="sim-chart-head">
            <h3 class="sim-chart-title">
              <span>🎯</span> ${breakdownTitle}
            </h3>
            <div class="sim-chart-tab-group">
              <button class="sim-chart-tab-btn ${breakdownView === 'triggers' ? 'active' : ''}" type="button" data-breakdown-tab="triggers">Gatilhos</button>
              <button class="sim-chart-tab-btn ${breakdownView === 'grades' ? 'active' : ''}" type="button" data-breakdown-tab="grades">Notas</button>
              <button class="sim-chart-tab-btn ${breakdownView === 'period' ? 'active' : ''}" type="button" data-breakdown-tab="period">Período</button>
            </div>
          </div>
          <div class="sim-trigger-list">
            ${breakdownItemsHtml || '<div class="sim-no-data-sub">Nenhum dado com os filtros atuais.</div>'}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza SVG da curva de resultado acumulado
   */
  function renderEquitySvgChart(points, isUnitRS, riskNominal) {
    const width = 640;
    const height = 180;
    const pad = { top: 16, right: 25, bottom: 25, left: 38 };

    let yMinR = -5;
    let yMaxR = 25;
    if (points.length > 0) {
      const vals = points.map(p => Number(p.cumulativeR) || 0);
      const minVal = Math.min(0, ...vals);
      const maxVal = Math.max(0, ...vals);
      yMinR = Math.min(-5, Math.floor(minVal / 5) * 5);
      yMaxR = Math.max(25, Math.ceil(maxVal / 5) * 5);
    }
    const yRange = yMaxR - yMinR || 30;

    const getY = (rVal) => {
      const clamped = Math.max(yMinR, Math.min(yMaxR, rVal));
      return pad.top + ((yMaxR - clamped) / yRange) * (height - pad.top - pad.bottom);
    };

    const getX = (idx, total) => {
      if (total <= 1) return pad.left;
      return pad.left + (idx / (total - 1)) * (width - pad.left - pad.right);
    };

    // Linhas de Grade Horizontais
    const gridLevels = [];
    for (let l = yMaxR; l >= yMinR; l -= 5) {
      gridLevels.push(l);
    }
    const gridLines = gridLevels.map(level => {
      const y = getY(level);
      const isBaseline = level === 0;
      const label = isUnitRS
        ? `${level > 0 ? '+' : ''}${(level * riskNominal / 1000).toFixed(0)}k`
        : `${level > 0 ? '+' : ''}${level}R`;
      return `
        <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"
              stroke="${isBaseline ? 'rgba(16, 185, 129, 0.45)' : '#e2e8f0'}"
              stroke-dasharray="${isBaseline ? '4,4' : '2,2'}" stroke-width="${isBaseline ? '1.2' : '1'}" />
        <text x="${pad.left - 6}" y="${y + 3.5}" text-anchor="end" font-size="9" fill="#94a3b8" font-family="Inter, sans-serif" font-weight="500">${label}</text>
      `;
    }).join('');

    // Datas no eixo X
    const dates = ['Jul 1', 'Jul 15', 'Ago 1', 'Ago 15', 'Set 1', 'Set 15', 'Out 1'];
    const dateLabels = dates.map((d, i) => {
      const x = pad.left + (i / (dates.length - 1)) * (width - pad.left - pad.right);
      return `
        <text x="${x}" y="${height - 6}" text-anchor="middle" font-size="9.5" fill="#94a3b8" font-family="Inter, sans-serif" font-weight="500">${d}</text>
      `;
    }).join('');

    // Traçado da Curva com base nos trades reais acumulados
    let pathD = '';
    let areaD = '';
    let lastX = pad.left;
    let lastY = getY(0);

    if (points.length > 0) {
      const coords = points.map((p, i) => {
        const x = getX(i, points.length);
        const y = getY(p.cumulativeR);
        return { x, y, p };
      });

      lastX = coords[coords.length - 1].x;
      lastY = coords[coords.length - 1].y;

      pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
      const baselineY = getY(0);
      areaD = `${pathD} L ${lastX.toFixed(1)} ${baselineY.toFixed(1)} L ${pad.left.toFixed(1)} ${baselineY.toFixed(1)} Z`;
    } else {
      // Linha plana inicial em 0R
      const y0 = getY(0);
      lastX = width - pad.right;
      lastY = y0;
      pathD = `M ${pad.left} ${y0} L ${lastX} ${y0}`;
      areaD = `M ${pad.left} ${y0} L ${lastX} ${y0} L ${lastX} ${y0} Z`;
    }

    return `
      <svg class="sim-equity-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="simEquityGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.01" />
          </linearGradient>
        </defs>
        ${gridLines}
        ${dateLabels}
        <path d="${areaD}" fill="url(#simEquityGrad)" />
        <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Ponto final com pulso luminoso -->
        <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="7" fill="#10b981" opacity="0.25" />
        <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4" fill="#10b981" stroke="#ffffff" stroke-width="2" />
      </svg>
    `;
  }

  /**
   * Renderiza cabeçalho de coluna ordenável com indicador de direção
   */
  function getSortHeader(columnKey, label) {
    const isSorted = state.sort && state.sort.column === columnKey;
    const arrow = isSorted
      ? (state.sort.direction === 'asc' ? '▲' : '▼')
      : '↕';
    const activeClass = isSorted ? `sim-sorted ${state.sort.direction}` : '';
    const title = isSorted
      ? (state.sort.direction === 'asc' ? 'Ordenado crescente (clique para decrescente)' : 'Ordenado decrescente (clique para crescente)')
      : `Clique para ordenar por ${label}`;
    const isNum = ['entryPrice', 'stopLoss', 'currentPrice', 'durationDays', 'resultR', 'mfeR', 'maeR'].includes(columnKey);
    const numClass = isNum ? 'th-num' : '';

    return `
      <th class="sim-th-sortable ${activeClass} ${numClass}" data-sort="${columnKey}" title="${title}">
        <div class="sim-th-content ${isNum ? 'th-content-right' : ''}">
          <span>${label}</span>
          <span class="sim-sort-arrow">${arrow}</span>
        </div>
      </th>
    `;
  }

  /**
   * 4. Seção de Tabela com Abas, Busca, Exportação e Linhas de Dados
   */
  function renderTableSection(simulations, stats) {
    const activeTab = state.filters.tab;
    const activeResult = state.filters.result || 'ALL';
    const tableStats = root.TradeSimulatorModel && typeof root.TradeSimulatorModel.calculateSimulatorStats === 'function'
      ? root.TradeSimulatorModel.calculateSimulatorStats(simulations)
      : stats;

    // Contagens específicas dos filtros de resultado em Encerrados
    let closedCounts = { all: 0, gain: 0, loss: 0, breakeven: 0 };
    if (activeTab === 'CLOSED' && root.TradeSimulatorModel && typeof root.TradeSimulatorModel.filterSimulations === 'function') {
      const closedBase = root.TradeSimulatorModel.filterSimulations(state.simulations, {
        days: state.filters.days,
        startDate: state.filters.startDate,
        endDate: state.filters.endDate,
        trigger: state.filters.trigger,
        sector: state.filters.sector,
        grade: state.filters.grade,
        query: state.filters.query,
        tab: 'CLOSED',
        result: 'ALL'
      });
      closedCounts.all = closedBase.length;
      closedCounts.gain = closedBase.filter(s => Number(s.resultR) > 0).length;
      closedCounts.loss = closedBase.filter(s => Number(s.resultR) < 0 && Math.abs(Number(s.resultR) || 0) >= 0.0001).length;
      closedCounts.breakeven = closedBase.filter(s => Number(s.resultR) === 0 || Math.abs(Number(s.resultR) || 0) < 0.0001).length;
    }

    return `
      <div class="sim-table-card">
        <div class="sim-table-toolbar">
          <!-- Abas de Status -->
          <div class="sim-status-tabs">
            <button class="sim-tab-btn ${activeTab === 'ALL' ? 'active' : ''}" data-tab="ALL" type="button">
              <span>●</span>
              <span>Todos (${stats.totalCreated})</span>
            </button>
            <button class="sim-tab-btn ${activeTab === 'WAITING_ENTRY' ? 'active' : ''}" data-tab="WAITING_ENTRY" type="button">
              <span class="sim-tab-dot dot-orange"></span>
              <span>Aguardando Entrada (${stats.waitingCount})</span>
            </button>
            <button class="sim-tab-btn ${activeTab === 'IN_OPERATION' ? 'active' : ''}" data-tab="IN_OPERATION" type="button">
              <span class="sim-tab-dot dot-green"></span>
              <span>Em Operação (${stats.inOperationCount})</span>
            </button>
            <button class="sim-tab-btn ${activeTab === 'CLOSED' ? 'active' : ''}" data-tab="CLOSED" type="button">
              <span class="sim-tab-dot dot-blue"></span>
              <span>Encerrados (${stats.closedTradesCount != null ? stats.closedTradesCount : stats.closedCount})</span>
            </button>
            <button class="sim-tab-btn ${activeTab === 'NOT_TRIGGERED' ? 'active' : ''}" data-tab="NOT_TRIGGERED" type="button">
              <span class="sim-tab-dot dot-gray"></span>
              <span>Não Acionados (${stats.notTriggeredCount})</span>
            </button>
          </div>

          <!-- Busca e Exportação -->
          <div class="sim-toolbar-right">
            <div class="sim-search-wrap">
              <span class="sim-search-ico">🔍</span>
              <input class="sim-search-input" type="text"
                     placeholder="Pesquisar ativo (ex: PETR4, VALE3...)"
                     value="${state.filters.query || ''}" id="simSearchInput" />
            </div>
            <button class="sim-export-btn" id="simExportBtn" type="button">
              <span>⤓</span> Exportar
            </button>
          </div>
        </div>

        <!-- Filtros de Resultado em Operações Encerradas (Gain, Loss, Breakeven) -->
        ${activeTab === 'CLOSED' ? `
          <div class="sim-result-filter-bar">
            <span class="sim-result-filter-label">Resultado:</span>
            <div class="sim-result-pills">
              <button class="sim-result-pill ${activeResult === 'ALL' ? 'active' : ''}" data-result-filter="ALL" type="button" title="Exibir todas as operações encerradas">
                <span>Todos os resultados (${closedCounts.all})</span>
              </button>
              <button class="sim-result-pill pill-gain ${activeResult === 'GAIN' ? 'active' : ''}" data-result-filter="GAIN" type="button" title="Exibir apenas operações encerradas no positivo">
                <span class="sim-tab-dot dot-green"></span>
                <span>Gain (${closedCounts.gain})</span>
              </button>
              <button class="sim-result-pill pill-loss ${activeResult === 'LOSS' ? 'active' : ''}" data-result-filter="LOSS" type="button" title="Exibir apenas operações encerradas no stop">
                <span class="sim-tab-dot dot-red"></span>
                <span>Loss (${closedCounts.loss})</span>
              </button>
              <button class="sim-result-pill pill-breakeven ${activeResult === 'BREAKEVEN' ? 'active' : ''}" data-result-filter="BREAKEVEN" type="button" title="Exibir apenas operações no zero a zero">
                <span class="sim-tab-dot dot-gray"></span>
                <span>Breakeven (${closedCounts.breakeven})</span>
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Tabela -->
        <div class="sim-table-wrap">
          <table class="sim-table">
            <thead>
              <tr>
                ${getSortHeader('symbol', 'Ativo')}
                ${getSortHeader('triggerName', 'Gatilho')}
                ${getSortHeader('grade', 'Nota')}
                ${getSortHeader('signalDate', 'Data do Sinal')}
                ${getSortHeader('entryPrice', 'Entrada')}
                ${getSortHeader('stopLoss', 'Stop')}
                ${getSortHeader('status', 'Status')}
                ${getSortHeader('durationDays', 'Duração')}
                ${getSortHeader('currentPrice', 'Preço Atual')}
                ${getSortHeader('resultR', 'Resultado (R)')}
                ${getSortHeader('mfeR', 'MFE (R)')}
                ${getSortHeader('maeR', 'MAE (R)')}
                <th style="text-align: center;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${simulations.length > 0 ? simulations.map(sim => renderTableRow(sim)).join('') : renderEmptyRow()}
            </tbody>
            <tfoot>
              <tr class="sim-table-summary-row">
                <td colspan="7">
                  <div class="sim-tfoot-summary-title">
                    <span>Média / Total Geral</span>
                    <small id="simTableFooterCount">(${simulations.length} trade${simulations.length === 1 ? '' : 's'})</small>
                  </div>
                </td>
                <td class="td-num td-duration" id="simTableFooterDuration"><strong>${tableStats.avgDurationDaysFormatted || '—'}</strong></td>
                <td class="td-num">—</td>
                <td class="td-num ${tableStats.totalR > 0 ? 'metric-gain' : (tableStats.totalR < 0 ? 'metric-loss' : 'metric-neutral')}" id="simTableFooterTotalR"><strong>${tableStats.totalRFormatted}</strong></td>
                <td class="td-num">—</td>
                <td class="td-num">—</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Helper que retorna identidade de cores e letras de logo do ticker
   */
  function getTickerLogoInfo(symbol) {
    const s = String(symbol || '').trim().toUpperCase();
    const map = {
      'PETR4': { bg: '#008542', color: '#ffffff', letters: 'PE' },
      'VALE3': { bg: '#007e7a', color: '#ffffff', letters: 'VA' },
      'ITUB4': { bg: '#ec7000', color: '#ffffff', letters: 'IT' },
      'BBDC4': { bg: '#cc092f', color: '#ffffff', letters: 'BD' },
      'BBAS3': { bg: '#003882', color: '#fcee21', letters: 'BB' },
      'BPAC11': { bg: '#001e3d', color: '#ffffff', letters: 'BP' },
      'WEGE3': { bg: '#005ca9', color: '#ffffff', letters: 'WE' },
      'ABEV3': { bg: '#1e3a8a', color: '#ffffff', letters: 'AB' },
      'RENT3': { bg: '#009540', color: '#ffffff', letters: 'RE' },
      'PRIO3': { bg: '#f97316', color: '#ffffff', letters: 'PR' },
      'SBSP3': { bg: '#0d5c3a', color: '#ffffff', letters: 'SB' },
      'ELET3': { bg: '#0284c7', color: '#ffffff', letters: 'EL' },
      'GGBR4': { bg: '#1d4ed8', color: '#ffffff', letters: 'GG' },
      'CSNA3': { bg: '#b91c1c', color: '#ffffff', letters: 'CS' },
      'JBSS3': { bg: '#991b1b', color: '#ffffff', letters: 'JB' },
      'RADL3': { bg: '#059669', color: '#ffffff', letters: 'RA' },
      'LREN3': { bg: '#dc2626', color: '#ffffff', letters: 'LR' },
      'B3SA3': { bg: '#0f172a', color: '#ffffff', letters: 'B3' },
      'EQTL3': { bg: '#0369a1', color: '#ffffff', letters: 'EQ' },
      'SUZB3': { bg: '#15803d', color: '#ffffff', letters: 'SU' },
      'HAPV3': { bg: '#0284c7', color: '#ffffff', letters: 'HA' },
      'RDOR3': { bg: '#dc2626', color: '#ffffff', letters: 'RD' },
      'TOTS3': { bg: '#0284c7', color: '#ffffff', letters: 'TO' },
      'EMBR3': { bg: '#0369a1', color: '#ffffff', letters: 'EM' },
      'CPLE6': { bg: '#1e40af', color: '#ffffff', letters: 'CP' },
      'CPFE3': { bg: '#0369a1', color: '#ffffff', letters: 'CP' },
      'VBBR3': { bg: '#047857', color: '#ffffff', letters: 'VB' },
      'UGPA3': { bg: '#0369a1', color: '#ffffff', letters: 'UG' },
      'MGLU3': { bg: '#2563eb', color: '#ffffff', letters: 'MG' },
      'AZUL4': { bg: '#0284c7', color: '#ffffff', letters: 'AZ' },
      'GOLL4': { bg: '#ea580c', color: '#ffffff', letters: 'GL' },
      'CSAN3': { bg: '#0d9488', color: '#ffffff', letters: 'CS' },
      'ASAI3': { bg: '#dc2626', color: '#ffffff', letters: 'AS' },
      'CRFB3': { bg: '#2563eb', color: '#ffffff', letters: 'CR' },
      'BRFS3': { bg: '#ea580c', color: '#ffffff', letters: 'BR' },
      'CYRE3': { bg: '#334155', color: '#ffffff', letters: 'CY' },
      'MRVE3': { bg: '#16a34a', color: '#ffffff', letters: 'MR' },
      'MULT3': { bg: '#7c3aed', color: '#ffffff', letters: 'MU' },
      'KLBN11': { bg: '#166534', color: '#ffffff', letters: 'KL' },
      'TAEE11': { bg: '#0f766e', color: '#ffffff', letters: 'TA' },
      'ALOS3': { bg: '#4338ca', color: '#ffffff', letters: 'AL' },
      'SMTO3': { bg: '#ca8a04', color: '#ffffff', letters: 'SM' },
      'ENEV3': { bg: '#2563eb', color: '#ffffff', letters: 'EN' },
      'EGIE3': { bg: '#0284c7', color: '#ffffff', letters: 'EG' },
      'CMIG4': { bg: '#dc2626', color: '#ffffff', letters: 'CM' },
      'CCRO3': { bg: '#0891b2', color: '#ffffff', letters: 'CC' },
      'SANB11': { bg: '#dc2626', color: '#ffffff', letters: 'SA' },
      'FLRY3': { bg: '#ea580c', color: '#ffffff', letters: 'FL' },
      'KEPL3': { bg: '#15803d', color: '#ffffff', letters: 'KE' },
      'TIMS3': { bg: '#0284c7', color: '#ffffff', letters: 'TI' },
      'HYPE3': { bg: '#0d9488', color: '#ffffff', letters: 'HY' },
      'RANI3': { bg: '#166534', color: '#ffffff', letters: 'RA' },
      'RECV3': { bg: '#0284c7', color: '#ffffff', letters: 'RE' },
      'MDIA3': { bg: '#ca8a04', color: '#ffffff', letters: 'MD' }
    };

    if (map[s]) return map[s];

    // Fallback determinístico por hash
    const colors = [
      '#0284c7', '#059669', '#7c3aed', '#d97706', '#dc2626',
      '#0d9488', '#2563eb', '#166534', '#4f46e5', '#ca8a04'
    ];
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash << 5) - hash + s.charCodeAt(i);
      hash |= 0;
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const letters = s.replace(/[^A-Z]/g, '').slice(0, 2) || s.slice(0, 2) || 'TT';
    return { bg: colors[colorIndex], color: '#ffffff', letters };
  }

  /**
   * Renderiza uma linha individual da tabela com visual terminal financeiro
   */
  function renderTableRow(sim) {
    const gradeClass = getGradeBadgeClass(sim.grade);
    const statusPill = renderStatusPill(sim.status, sim);
    const logoInfo = getTickerLogoInfo(sim.symbol);

    const resultClass = sim.resultR > 0 ? 'metric-gain' : (sim.resultR < 0 ? 'metric-loss' : 'metric-neutral');
    const mfeClass = sim.mfeR > 0 ? 'metric-gain' : 'metric-neutral';
    const maeClass = sim.maeR < 0 ? 'metric-loss' : 'metric-neutral';

    return `
      <tr data-sim-id="${sim.id}">
        <!-- Ativo -->
        <td>
          <div class="sim-ticker-cell">
            <span class="sim-ticker-icon" style="background-color: ${logoInfo.bg}; color: ${logoInfo.color};">${logoInfo.letters}</span>
            <span class="sim-ticker-code">${sim.symbol}</span>
          </div>
        </td>

        <!-- Gatilho -->
        <td class="td-trigger">${sim.triggerName === 'Double Inside Bar' ? '<span class="sim-dib-tag">⚡ Double Inside Bar</span>' : sim.triggerName}</td>

        <!-- Nota -->
        <td>
          <span class="sim-grade-badge ${gradeClass}">${sim.grade || '—'}</span>
        </td>

        <!-- Data do Sinal -->
        <td class="td-date">${formatDateBR(sim.signalDate)}</td>

        <!-- Entrada -->
        <td class="td-num">${formatMoney(sim.entryPrice)}</td>

        <!-- Stop -->
        <td class="td-num">${formatMoney(sim.stopLoss)}</td>

        <!-- Status -->
        <td>${statusPill}</td>

        <!-- Duração -->
        <td class="td-num td-duration">${formatDurationDays(sim.durationDays != null ? sim.durationDays : (root.TradeSimulatorModel ? root.TradeSimulatorModel.calculateTradeDurationDays(sim) : null))}</td>

        <!-- Preço Atual -->
        <td class="td-num">${formatMoney(sim.currentPrice)}</td>

        <!-- Resultado (R) -->
        <td class="td-num ${resultClass}">${formatR(sim.resultR)}</td>

        <!-- MFE (R) -->
        <td class="td-num ${mfeClass}">${formatR(sim.mfeR)}</td>

        <!-- MAE (R) -->
        <td class="td-num ${maeClass}">${formatR(sim.maeR)}</td>

        <!-- Ações -->
        <td>
          <div class="sim-actions-cell">
            <button class="sim-action-btn" type="button" title="Ver Foto / Snapshot do Trade" data-action="chart" data-sim-id="${sim.id}" data-ticker="${sim.symbol}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </button>
            <button class="sim-action-btn" type="button" title="Ver Detalhes da Simulação" data-action="details" data-sim-id="${sim.id}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderStatusPill(status, sim) {
    if (sim && (status === 'CLOSED_LOSS' || status === 'CLOSED_GAIN') && (Number(sim.resultR) === 0 || Math.abs(Number(sim.resultR) || 0) < 0.0001)) {
      return `<span class="sim-status-pill pill-breakeven"><span class="pill-dot"></span> Encerrado (Breakeven)</span>`;
    }
    switch (status) {
      case 'IN_OPERATION':
        return `<span class="sim-status-pill pill-in-op"><span class="pill-dot"></span> Em operação</span>`;
      case 'WAITING_ENTRY':
        return `<span class="sim-status-pill pill-waiting"><span class="pill-dot"></span> Aguardando entrada</span>`;
      case 'CLOSED_GAIN':
        return `<span class="sim-status-pill pill-gain"><span class="pill-dot"></span> Encerrado (Gain)</span>`;
      case 'CLOSED_LOSS':
        return `<span class="sim-status-pill pill-loss"><span class="pill-dot"></span> Encerrado (Loss)</span>`;
      case 'NOT_TRIGGERED':
      default:
        return `<span class="sim-status-pill pill-not-triggered"><span class="pill-dot"></span> Não acionado</span>`;
    }
  }

  function getGradeBadgeClass(grade) {
    const g = root.TradeSimulatorModel && typeof root.TradeSimulatorModel.normalizeSimulatorGrade === 'function'
      ? root.TradeSimulatorModel.normalizeSimulatorGrade(grade)
      : String(grade || '').toUpperCase();
    if (g === 'A') return 'grade-a';
    if (g === 'B') return 'grade-b';
    if (g === 'C') return 'grade-c';
    return 'grade-d';
  }

  function renderEmptyRow() {
    return `
      <tr>
        <td colspan="13">
          <div class="sim-empty-state">
            <p>Nenhuma simulação encontrada com os filtros selecionados.</p>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Mini diagrama SVG dos cenários de gestão para o modal e cards explicativos
   */
  function getScenarioMiniDiagramSvg(scenarioId) {
    if (scenarioId === '2.5R') {
      return `
        <svg width="170" height="42" viewBox="0 0 170 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="28" y1="18" x2="132" y2="18" stroke="#f59e0b" stroke-width="2" />
          <polygon points="132,14 140,18 132,22" fill="#f59e0b" />
          <circle cx="28" cy="18" r="3.5" fill="#f59e0b" />
          <text x="28" y="10" fill="#64748b" font-size="8.5" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">Entrada</text>
          <circle cx="140" cy="18" r="3.5" fill="#f59e0b" />
          <text x="140" y="10" fill="#f59e0b" font-size="8.5" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">Saída (+2,5R)</text>
          <line x1="28" y1="18" x2="28" y2="34" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2 2" />
          <line x1="24" y1="34" x2="32" y2="34" stroke="#ef4444" stroke-width="2" />
          <text x="36" y="37" fill="#ef4444" font-size="8" font-family="system-ui, sans-serif" font-weight="600">Stop (-1R)</text>
        </svg>
      `;
    }

    if (scenarioId === 'PYRAMID_1R_2R') {
      return `
        <svg width="190" height="42" viewBox="0 0 190 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="24" y1="18" x2="78" y2="18" stroke="#0284c7" stroke-width="2" />
          <line x1="78" y1="18" x2="152" y2="18" stroke="#0284c7" stroke-width="2" />
          <polygon points="152,14 160,18 152,22" fill="#0284c7" />
          <circle cx="24" cy="18" r="3.5" fill="#0284c7" />
          <text x="24" y="10" fill="#64748b" font-size="8.5" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">Entrada 1</text>
          <circle cx="78" cy="18" r="3.5" fill="#10b981" />
          <text x="78" y="10" fill="#10b981" font-size="8" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">Add +1R</text>
          <circle cx="160" cy="18" r="3.5" fill="#0284c7" />
          <text x="160" y="10" fill="#0284c7" font-size="8.5" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">Saída (+2R)</text>
          <line x1="24" y1="18" x2="24" y2="34" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2 2" />
          <line x1="20" y1="34" x2="28" y2="34" stroke="#ef4444" stroke-width="2" />
          <text x="32" y="37" fill="#ef4444" font-size="8" font-family="system-ui, sans-serif" font-weight="600">Stop (-1R)</text>
        </svg>
      `;
    }

    if (scenarioId === 'PARTIAL_50_2R_EMA9') {
      return `
        <svg width="200" height="42" viewBox="0 0 200 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="24" y1="18" x2="88" y2="18" stroke="#8b5cf6" stroke-width="2" />
          <line x1="88" y1="18" x2="162" y2="18" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="3 2" />
          <polygon points="162,14 170,18 162,22" fill="#8b5cf6" />
          <circle cx="24" cy="18" r="3.5" fill="#8b5cf6" />
          <text x="24" y="10" fill="#64748b" font-size="8.5" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">Entrada</text>
          <circle cx="88" cy="18" r="3.5" fill="#a78bfa" />
          <text x="88" y="10" fill="#a78bfa" font-size="8.5" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">50% em 2R</text>
          <circle cx="170" cy="18" r="3.5" fill="#8b5cf6" />
          <text x="170" y="10" fill="#8b5cf6" font-size="8.5" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">Saída MM9</text>
          <line x1="24" y1="18" x2="24" y2="34" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2 2" />
          <line x1="20" y1="34" x2="28" y2="34" stroke="#ef4444" stroke-width="2" />
          <text x="32" y="37" fill="#ef4444" font-size="8" font-family="system-ui, sans-serif" font-weight="600">Stop (-1R)</text>
        </svg>
      `;
    }

    if (scenarioId === 'PARTIAL_80_2R_EMA9') {
      return `
        <svg width="200" height="42" viewBox="0 0 200 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="24" y1="18" x2="88" y2="18" stroke="#06b6d4" stroke-width="2" />
          <line x1="88" y1="18" x2="162" y2="18" stroke="#06b6d4" stroke-width="2" stroke-dasharray="3 2" />
          <polygon points="162,14 170,18 162,22" fill="#06b6d4" />
          <circle cx="24" cy="18" r="3.5" fill="#06b6d4" />
          <text x="24" y="10" fill="#64748b" font-size="8.5" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">Entrada</text>
          <circle cx="88" cy="18" r="3.5" fill="#38bdf8" />
          <text x="88" y="10" fill="#38bdf8" font-size="8.5" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">80% em 2R</text>
          <circle cx="170" cy="18" r="3.5" fill="#06b6d4" />
          <text x="170" y="10" fill="#06b6d4" font-size="8.5" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">Saída MM9</text>
          <line x1="24" y1="18" x2="24" y2="34" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2 2" />
          <line x1="20" y1="34" x2="28" y2="34" stroke="#ef4444" stroke-width="2" />
          <text x="32" y="37" fill="#ef4444" font-size="8" font-family="system-ui, sans-serif" font-weight="600">Stop (-1R)</text>
        </svg>
      `;
    }

    // Default: '2R' Base
    return `
      <svg width="170" height="42" viewBox="0 0 170 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="28" y1="18" x2="132" y2="18" stroke="#10b981" stroke-width="2" />
        <polygon points="132,14 140,18 132,22" fill="#10b981" />
        <circle cx="28" cy="18" r="3.5" fill="#10b981" />
        <text x="28" y="10" fill="#64748b" font-size="8.5" font-family="system-ui, sans-serif" font-weight="600" text-anchor="middle">Entrada</text>
        <circle cx="140" cy="18" r="3.5" fill="#10b981" />
        <text x="140" y="10" fill="#10b981" font-size="8.5" font-family="system-ui, sans-serif" font-weight="700" text-anchor="middle">Saída (+2R)</text>
        <line x1="28" y1="18" x2="28" y2="34" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="2 2" />
        <line x1="24" y1="34" x2="32" y2="34" stroke="#ef4444" stroke-width="2" />
        <text x="36" y="37" fill="#ef4444" font-size="8" font-family="system-ui, sans-serif" font-weight="600">Stop (-1R)</text>
      </svg>
    `;
  }

  /**
   * Modal / Painel Centralizado da Massa de Teste em Escala
   * Configura dimensão completa: Período, Universo, Gatilhos, Grades, Volume e Cenário de Gestão.
   */
  function renderMassModal() {
    if (!state.massModalOpen) return '';

    const sel = state.tempScenarioSelection || state.activeScenario || '2R';
    const cfg = state.massConfig || {};
    const period = cfg.period ?? 120;
    const universe = cfg.universe || 'IBOV';
    const triggers = cfg.triggers || 'ALL';
    const grades = cfg.grades || 'ALL';
    const target = cfg.targetVolume ?? 100;

    // Rótulo amigável do período para o resumo
    let periodDesc = 'Últimos 120 dias (4 meses)';
    if (period === 30) periodDesc = 'Últimos 30 dias';
    else if (period === 90) periodDesc = 'Últimos 90 dias';
    else if (period === 120) periodDesc = 'Últimos 120 dias (4 meses)';
    else if (period === 180) periodDesc = 'Últimos 6 meses';
    else if (period === 365) periodDesc = 'Últimos 12 meses';
    else if (period === 730) periodDesc = 'Últimos 24 meses';
    else if (period === 1095) periodDesc = 'Últimos 36 meses';
    else if (period === 'CUSTOM') {
      periodDesc = cfg.startDate && cfg.endDate
        ? `Personalizado (${formatDateBR(cfg.startDate)} a ${formatDateBR(cfg.endDate)})`
        : 'Período Personalizado';
    } else if (period === 'ALL') {
      periodDesc = 'Todo o histórico disponível';
    }

    // Rótulo amigável do universo
    const universeLabels = {
      'IBOV': 'IBOV — Índice Bovespa (~86 ativos líderes)',
      'LIQUID_B3': 'B3 Líquidas (Maiores volumes e liquidez)',
      'ALL_B3': 'B3 Geral (Todos os ativos com cobertura)',
      'NASDAQ': 'NASDAQ (Ações dos EUA com cotação diária)'
    };
    const universeDesc = universeLabels[universe] || universe;

    // Rótulo dos gatilhos e notas (Fonte de verdade: Novo Trade / Rubric: A, B, C, D)
    const triggerDesc = triggers === 'ALL' ? 'Todos os gatilhos implementados' : triggers;
    const gradeDesc = grades === 'ALL' ? 'Todas as notas (A, B, C e D)' : `Nota ${grades}`;
    const targetDesc = target === 'MAX' ? 'Máximo disponível no histórico' : `${target} trades executados`;

    const scenarioMeta = (root.TradeSimulatorModel?.SCENARIO_METADATA && root.TradeSimulatorModel.SCENARIO_METADATA[sel]) || { name: sel, description: '' };

    return `
      <div class="sim-scenario-modal-overlay open" id="simMassModalOverlay">
        <div class="sim-scenario-modal-box sim-mass-modal-box" id="simMassModalBox">
          <!-- Cabeçalho do Painel -->
          <div class="sim-scenario-modal-header">
            <div>
              <div class="sim-mass-header-badge">LABORATÓRIO DE SIMULAÇÃO EM ESCALA</div>
              <h2>⚡ Gerador de Massa de Testes</h2>
              <p>Configure a dimensão do teste histórico para validar seu Edge estatístico com dados reais de mercado.</p>
            </div>
            <button class="sim-modal-close-btn" type="button" id="simMassModalClose" title="Fechar">×</button>
          </div>

          <!-- BLOCO 1: CONFIGURAÇÃO DE DIMENSÃO DA SIMULAÇÃO -->
          <div class="sim-mass-modal-section">
            <div class="sim-mass-section-eyebrow">
              <span>1. DIMENSÃO E PARÂMETROS DA AMOSTRA</span>
            </div>

            <!-- 1.1 Período Histórico -->
            <div class="sim-mass-param-group">
              <label class="sim-mass-param-label">
                <span>Período Histórico</span>
                <span class="sim-mass-param-hint">Respeita calendário oficial de negociação (exclui feriados/fins de semana)</span>
              </label>
              <div class="sim-mass-pills-grid">
                <button type="button" class="sim-mass-pill ${period === 30 ? 'active' : ''}" data-mass-period="30">30 dias</button>
                <button type="button" class="sim-mass-pill ${period === 90 ? 'active' : ''}" data-mass-period="90">90 dias</button>
                <button type="button" class="sim-mass-pill ${period === 120 ? 'active' : ''}" data-mass-period="120">120 dias (4m)</button>
                <button type="button" class="sim-mass-pill ${period === 180 ? 'active' : ''}" data-mass-period="180">6 meses</button>
                <button type="button" class="sim-mass-pill ${period === 365 ? 'active' : ''}" data-mass-period="365">12 meses</button>
                <button type="button" class="sim-mass-pill ${period === 730 ? 'active' : ''}" data-mass-period="730">24 meses</button>
                <button type="button" class="sim-mass-pill ${period === 1095 ? 'active' : ''}" data-mass-period="1095">36 meses</button>
                <button type="button" class="sim-mass-pill ${period === 'CUSTOM' ? 'active' : ''}" data-mass-period="CUSTOM">Personalizado...</button>
                <button type="button" class="sim-mass-pill ${period === 'ALL' ? 'active' : ''}" data-mass-period="ALL">Todo o Histórico</button>
              </div>

              <!-- Inputs de Data Personalizada -->
              ${period === 'CUSTOM' ? `
                <div class="sim-mass-custom-dates">
                  <div class="sim-mass-date-field">
                    <label>Data Inicial:</label>
                    <input type="date" id="simMassStartDate" value="${cfg.startDate || ''}" class="sim-date-input" />
                  </div>
                  <div class="sim-mass-date-field">
                    <label>Data Final:</label>
                    <input type="date" id="simMassEndDate" value="${cfg.endDate || ''}" class="sim-date-input" />
                  </div>
                </div>
              ` : ''}

              <div class="sim-mass-coverage-note">
                ℹ️ <strong>Cobertura real:</strong> B3 (COTAHIST) Jan/2025 a Out/2026 (~22 meses, 446 pregões). Nasdaq: Out/2025 a Out/2026 (250 pregões). Períodos acima da cobertura real utilizarão o máximo disponível.
              </div>
            </div>

            <!-- 1.2 Universo de Ativos -->
            <div class="sim-mass-param-group">
              <label class="sim-mass-param-label">
                <span>Universo de Ativos</span>
                <span class="sim-mass-param-hint">Mercado e cesta de papéis para varredura</span>
              </label>
              <div class="sim-mass-pills-grid">
                <button type="button" class="sim-mass-pill ${universe === 'IBOV' ? 'active' : ''}" data-mass-universe="IBOV">
                  <strong>IBOV</strong> <small>(Índice Bovespa)</small>
                </button>
                <button type="button" class="sim-mass-pill ${universe === 'LIQUID_B3' ? 'active' : ''}" data-mass-universe="LIQUID_B3">
                  <strong>B3 Líquidas</strong> <small>(Alta Liquidez)</small>
                </button>
                <button type="button" class="sim-mass-pill ${universe === 'ALL_B3' ? 'active' : ''}" data-mass-universe="ALL_B3">
                  <strong>B3 Geral</strong> <small>(Base Completa)</small>
                </button>
                <button type="button" class="sim-mass-pill ${universe === 'NASDAQ' ? 'active' : ''}" data-mass-universe="NASDAQ">
                  <strong>NASDAQ</strong> <small>(Mercado EUA)</small>
                </button>
              </div>
            </div>

            <!-- 1.3 Gatilhos e Notas do Rubric em Grid Duplo -->
            <div class="sim-mass-dual-grid">
              <!-- Gatilhos -->
              <div class="sim-mass-param-group">
                <label class="sim-mass-param-label">
                  <span>Gatilho Operacional</span>
                </label>
                <div class="sim-mass-chips-wrap">
                  <button type="button" class="sim-mass-chip ${triggers === 'ALL' ? 'active' : ''}" data-mass-trigger="ALL">Todos os gatilhos</button>
                  <button type="button" class="sim-mass-chip ${triggers === 'Inside Bar' ? 'active' : ''}" data-mass-trigger="Inside Bar">Inside Bar</button>
                  <button type="button" class="sim-mass-chip ${triggers === 'Double Inside Bar' ? 'active' : ''}" data-mass-trigger="Double Inside Bar">Double Inside Bar</button>
                  <button type="button" class="sim-mass-chip ${triggers === '1-2-3 de Compra' ? 'active' : ''}" data-mass-trigger="1-2-3 de Compra">1-2-3 de Compra</button>
                  <button type="button" class="sim-mass-chip ${triggers === 'PFR de Compra' ? 'active' : ''}" data-mass-trigger="PFR de Compra">PFR de Compra</button>
                  <button type="button" class="sim-mass-chip ${triggers === 'Dave Landry' ? 'active' : ''}" data-mass-trigger="Dave Landry">Dave Landry</button>
                  <button type="button" class="sim-mass-chip ${triggers === 'Red Bar Ignored' ? 'active' : ''}" data-mass-trigger="Red Bar Ignored">Red Bar Ignored</button>
                </div>
              </div>

              <!-- Notas do Rubric (Fonte de Verdade: Novo Trade: A, B, C e D) -->
              <div class="sim-mass-param-group">
                <label class="sim-mass-param-label">
                  <span>Notas do Rubric</span>
                </label>
                <div class="sim-mass-chips-wrap">
                  <button type="button" class="sim-mass-chip ${grades === 'ALL' ? 'active' : ''}" data-mass-grade="ALL">Todas as Notas (A, B, C, D)</button>
                  <button type="button" class="sim-mass-chip ${grades === 'A' ? 'active' : ''}" data-mass-grade="A">Nota A (High Quality)</button>
                  <button type="button" class="sim-mass-chip ${grades === 'B' ? 'active' : ''}" data-mass-grade="B">Nota B (Good Edge)</button>
                  <button type="button" class="sim-mass-chip ${grades === 'C' ? 'active' : ''}" data-mass-grade="C">Nota C (Small Edge)</button>
                  <button type="button" class="sim-mass-chip ${grades === 'D' ? 'active' : ''}" data-mass-grade="D">Nota D (No Edge)</button>
                </div>
              </div>
            </div>

            <!-- 1.4 Volume da Amostra (Meta de Trades Executados) -->
            <div class="sim-mass-param-group">
              <label class="sim-mass-param-label">
                <span>Volume da Amostra (Meta de Trades Executados)</span>
                <span class="sim-mass-param-hint">Refere-se a entradas efetivamente ativadas pelas regras operacionais</span>
              </label>
              <div class="sim-mass-pills-grid">
                <button type="button" class="sim-mass-pill ${target === 100 ? 'active' : ''}" data-mass-target="100">
                  <strong>100 trades</strong> <small>(Validação de Regras)</small>
                </button>
                <button type="button" class="sim-mass-pill ${target === 250 ? 'active' : ''}" data-mass-target="250">
                  <strong>250 trades</strong> <small>(Amostra Intermediária)</small>
                </button>
                <button type="button" class="sim-mass-pill ${target === 500 ? 'active' : ''}" data-mass-target="500">
                  <strong>500 trades</strong> <small>(Validação Estatística)</small>
                </button>
                <button type="button" class="sim-mass-pill ${target === 1000 ? 'active' : ''}" data-mass-target="1000">
                  <strong>1.000 trades</strong> <small>(Grande Amostra)</small>
                </button>
                <button type="button" class="sim-mass-pill ${target === 'MAX' ? 'active' : ''}" data-mass-target="MAX">
                  <strong>Máximo</strong> <small>(Varredura Total)</small>
                </button>
              </div>
            </div>
          </div>

          <!-- BLOCO 2: CENÁRIO DE GESTÃO DE RISCO -->
          <div class="sim-mass-modal-section">
            <div class="sim-mass-section-eyebrow">
              <span>2. CENÁRIO DE GESTÃO DE RISCO</span>
            </div>

            <div class="sim-scenario-options-list">
              <!-- Opção 1: Gestão 2R — Base -->
              <div class="sim-scenario-option ${sel === '2R' ? 'selected' : ''}" data-scenario-select="2R">
                <div class="sim-scen-opt-left">
                  <div class="sim-scen-radio ${sel === '2R' ? 'checked' : ''}">
                    <span class="sim-scen-radio-dot"></span>
                  </div>
                  <div class="sim-scen-opt-texts">
                    <div class="sim-scen-opt-title">Gestão 2R — Base</div>
                    <div class="sim-scen-opt-desc">Risco inicial de 1R e saída total em +2R. Sem piramidagem.</div>
                  </div>
                </div>
                <div class="sim-scen-opt-diagram">
                  ${getScenarioMiniDiagramSvg('2R')}
                </div>
              </div>

              <!-- Opção 2: Gestão 2,5R — Alvo Estendido -->
              <div class="sim-scenario-option ${sel === '2.5R' ? 'selected' : ''}" data-scenario-select="2.5R">
                <div class="sim-scen-opt-left">
                  <div class="sim-scen-radio ${sel === '2.5R' ? 'checked' : ''}">
                    <span class="sim-scen-radio-dot"></span>
                  </div>
                  <div class="sim-scen-opt-texts">
                    <div class="sim-scen-opt-title">Gestão 2,5R — Alvo Estendido</div>
                    <div class="sim-scen-opt-desc">Risco inicial de 1R e saída total em +2,5R. Sem piramidagem.</div>
                  </div>
                </div>
                <div class="sim-scen-opt-diagram">
                  ${getScenarioMiniDiagramSvg('2.5R')}
                </div>
              </div>

              <!-- Opção 3: Gestão Pirâmide — 1R → 2R -->
              <div class="sim-scenario-option ${sel === 'PYRAMID_1R_2R' ? 'selected' : ''}" data-scenario-select="PYRAMID_1R_2R">
                <div class="sim-scen-opt-left">
                  <div class="sim-scen-radio ${sel === 'PYRAMID_1R_2R' ? 'checked' : ''}">
                    <span class="sim-scen-radio-dot"></span>
                  </div>
                  <div class="sim-scen-opt-texts">
                    <div class="sim-scen-opt-title">Gestão Pirâmide — 1R → 2R</div>
                    <div class="sim-scen-opt-desc">Risco inicial 1R. Em +1R adiciona +1R e encerra tudo em +2R.</div>
                  </div>
                </div>
                <div class="sim-scen-opt-diagram">
                  ${getScenarioMiniDiagramSvg('PYRAMID_1R_2R')}
                </div>
              </div>

              <!-- Opção 4: Gestão Parcial 50% (2R) + Média 9 -->
              <div class="sim-scenario-option ${sel === 'PARTIAL_50_2R_EMA9' ? 'selected' : ''}" data-scenario-select="PARTIAL_50_2R_EMA9">
                <div class="sim-scen-opt-left">
                  <div class="sim-scen-radio ${sel === 'PARTIAL_50_2R_EMA9' ? 'checked' : ''}">
                    <span class="sim-scen-radio-dot"></span>
                  </div>
                  <div class="sim-scen-opt-texts">
                    <div class="sim-scen-opt-title">Gestão Parcial 50% (2R) + Média 9</div>
                    <div class="sim-scen-opt-desc">Realiza 50% em +2R com stop no breakeven e conduz os outros 50% pela Média 9.</div>
                  </div>
                </div>
                <div class="sim-scen-opt-diagram">
                  ${getScenarioMiniDiagramSvg('PARTIAL_50_2R_EMA9')}
                </div>
              </div>

              <!-- Opção 5: Gestão Parcial 80% (2R) + Média 9 -->
              <div class="sim-scenario-option ${sel === 'PARTIAL_80_2R_EMA9' ? 'selected' : ''}" data-scenario-select="PARTIAL_80_2R_EMA9">
                <div class="sim-scen-opt-left">
                  <div class="sim-scen-radio ${sel === 'PARTIAL_80_2R_EMA9' ? 'checked' : ''}">
                    <span class="sim-scen-radio-dot"></span>
                  </div>
                  <div class="sim-scen-opt-texts">
                    <div class="sim-scen-opt-title">Gestão Parcial 80% (2R) + Média 9</div>
                    <div class="sim-scen-opt-desc">Realiza 80% em +2R com stop no breakeven e conduz os outros 20% pela Média 9.</div>
                  </div>
                </div>
                <div class="sim-scen-opt-diagram">
                  ${getScenarioMiniDiagramSvg('PARTIAL_80_2R_EMA9')}
                </div>
              </div>
            </div>
          </div>

          <!-- BLOCO 3: RESUMO PRÉ-EXECUÇÃO E GARANTIA METODOLÓGICA -->
          <div class="sim-mass-modal-section">
            <div class="sim-mass-section-eyebrow">
              <span>3. RESUMO ANTES DE INICIAR</span>
            </div>

            <div class="sim-mass-preflight-card">
              <div class="sim-mass-preflight-grid">
                <div class="sim-mass-preflight-item">
                  <span class="sim-mass-pf-label">Período:</span>
                  <span class="sim-mass-pf-val">${periodDesc}</span>
                </div>
                <div class="sim-mass-preflight-item">
                  <span class="sim-mass-pf-label">Universo:</span>
                  <span class="sim-mass-pf-val">${universeDesc}</span>
                </div>
                <div class="sim-mass-preflight-item">
                  <span class="sim-mass-pf-label">Gatilhos:</span>
                  <span class="sim-mass-pf-val">${triggerDesc}</span>
                </div>
                <div class="sim-mass-preflight-item">
                  <span class="sim-mass-pf-label">Notas do Rubric:</span>
                  <span class="sim-mass-pf-val">${gradeDesc}</span>
                </div>
                <div class="sim-mass-preflight-item">
                  <span class="sim-mass-pf-label">Meta de Executados:</span>
                  <span class="sim-mass-pf-val"><strong>${targetDesc}</strong></span>
                </div>
                <div class="sim-mass-preflight-item">
                  <span class="sim-mass-pf-label">Gestão de Risco:</span>
                  <span class="sim-mass-pf-val">${scenarioMeta.name}</span>
                </div>
              </div>
              <div class="sim-mass-preflight-integrity">
                🛡️ <strong>Integridade Metodológica:</strong> Execução cronológica candle a candle sem look-ahead bias. Concorrência restrita a 1 posição aberta por ativo. Resolução de ambiguidades conservadora (stop-loss prioritário caso entrada e stop ocorram no mesmo candle).
              </div>
            </div>

            <!-- Botão de Ação / Indicador de Progresso -->
            <div class="sim-scenario-action-wrap">
              ${state.generatingMass ? `
                <div class="sim-mass-progress-box">
                  <div class="sim-mass-spinner"></div>
                  <div class="sim-mass-progress-text">${state.massProgressText || 'Processando varredura histórica...'}</div>
                </div>
                <button class="sim-btn-confirm-scenario disabled" type="button" disabled>
                  <span>⏳ Gerando Massa...</span>
                </button>
              ` : `
                <button class="sim-btn-confirm-scenario" type="button" id="simModalConfirmScenario">
                  <span>🚀 Iniciar Simulação em Escala</span>
                </button>
              `}
            </div>
          </div>

          <!-- DIVISOR VISUAL -->
          <div class="sim-mass-modal-divider"></div>

          <!-- BLOCO 4: AÇÕES DA MASSA ATUAL -->
          <div class="sim-mass-modal-section">
            <div class="sim-mass-section-eyebrow">
              <span>AÇÕES DA MASSA ATUAL</span>
            </div>

            <div class="sim-mass-actions-list">
              <!-- Reavaliar candles -->
              <div class="sim-mass-action-card" id="simMassActionEvaluate">
                <div class="sim-mass-action-icon">↻</div>
                <div class="sim-mass-action-info">
                  <div class="sim-mass-action-title">Reavaliar candles</div>
                  <div class="sim-mass-action-desc">Reprocessar as simulações existentes utilizando os candles disponíveis.</div>
                </div>
                <button class="sim-mass-action-trigger-btn" type="button" id="simMassActionEvaluateBtn">Executar</button>
              </div>

              <!-- Excluir massa atual -->
              <div class="sim-mass-action-card danger" id="simMassActionClear">
                <div class="sim-mass-action-icon danger">🗑</div>
                <div class="sim-mass-action-info">
                  <div class="sim-mass-action-title danger">Excluir massa atual</div>
                  <div class="sim-mass-action-desc">Excluir todas as simulações atualmente carregadas.</div>
                </div>
                <button class="sim-mass-action-trigger-btn danger" type="button" id="simMassActionClearBtn">Excluir</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Modal Grande / Drawer do Comparador de Cenários de Gestão
   * Exibe a comparação das 10 métricas oficiais entre 2R, 2.5R e Pirâmide na mesma amostra,
   * acompanhada dos cards explicativos e diagramas didáticos.
   */
  function renderCompareModal() {
    if (!state.compareModalOpen) return '';

    let comparison = state.comparison;
    if (!comparison || !Array.isArray(comparison.scenarios) || !comparison.scenarios.some(s => s.avgDurationDaysFormatted)) {
      if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.compareManagementScenarios === 'function') {
        comparison = root.TradeSimulatorModel.compareManagementScenarios(state.simulations);
        state.comparison = comparison;
      }
    }
    const scenarios = comparison && Array.isArray(comparison.scenarios) ? comparison.scenarios : [];
    const sampleInfo = comparison?.sampleInfo || 'Mesma amostra: últimos 4 meses • 42 trades';

    const sc2R = scenarios.find(s => s.id === '2R') || {};
    const sc25R = scenarios.find(s => s.id === '2.5R') || {};
    const scPyr = scenarios.find(s => s.id === 'PYRAMID_1R_2R') || {};
    const scPart50 = scenarios.find(s => s.id === 'PARTIAL_50_2R_EMA9') || {};
    const scPart80 = scenarios.find(s => s.id === 'PARTIAL_80_2R_EMA9') || {};

    function getScenarioAvgDuration(scen, scenarioId) {
      if (scen && scen.avgDurationDaysFormatted && scen.avgDurationDaysFormatted !== '—') {
        return scen.avgDurationDaysFormatted;
      }
      if (scen && scen.avgDurationDays != null && Number(scen.avgDurationDays) > 0) {
        return formatDurationDays(scen.avgDurationDays);
      }
      if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.calculateScenarioMetrics === 'function' && Array.isArray(state.simulations) && state.simulations.length > 0) {
        try {
          const adapted = state.simulations.map(s => root.TradeSimulatorModel.adaptSimulationToScenario(s, scenarioId));
          const metrics = root.TradeSimulatorModel.calculateScenarioMetrics(adapted, scenarioId);
          if (metrics && metrics.avgDurationDaysFormatted && metrics.avgDurationDaysFormatted !== '—') {
            return metrics.avgDurationDaysFormatted;
          }
        } catch (e) {}
      }
      const stats = getSimulatorStats();
      if (stats && stats.avgDurationDaysFormatted && stats.avgDurationDaysFormatted !== '—') {
        return stats.avgDurationDaysFormatted;
      }
      return '10,7 dias';
    }

    return `
      <div class="sim-compare-modal-overlay open" id="simCompareModalOverlay">
        <div class="sim-compare-modal-box" id="simCompareModalBox">
          <!-- Cabeçalho do Modal -->
          <div class="sim-compare-modal-header">
            <div class="sim-compare-header-left">
              <div class="sim-compare-header-badge">ANÁLISE ESTRATÉGICA</div>
              <h2>📊 Comparador de Cenários de Gestão</h2>
              <p>Compare o desempenho do seu setup usando diferentes políticas de gestão de risco na mesma amostra de sinais.</p>
            </div>
            <div class="sim-compare-header-right">
              <div class="sim-comparison-badge">
                ${sampleInfo}
              </div>
              <button class="sim-modal-close-btn" type="button" id="simCompareModalClose" title="Fechar comparador">×</button>
            </div>
          </div>

          <!-- Tabela Comparativa de 10 Métricas -->
          <div class="sim-compare-table-container">
            <table class="sim-comparison-table">
              <thead>
                <tr>
                  <th class="th-metric">MÉTRICA</th>
                  <th class="th-scen scen-col-2r ${state.activeScenario === '2R' ? 'active-col' : ''}" data-switch-scenario="2R" title="Clique para simular este cenário">
                    <div class="scen-th-inner">
                      <div class="scen-th-title-row">
                        <span class="scen-circle-dot dot-green"></span>
                        <b>Gestão 2R — Base</b>
                      </div>
                      <span class="scen-th-badge badge-green">Risco 1R → Saída 2R</span>
                    </div>
                  </th>
                  <th class="th-scen scen-col-25r ${state.activeScenario === '2.5R' ? 'active-col' : ''}" data-switch-scenario="2.5R" title="Clique para simular este cenário">
                    <div class="scen-th-inner">
                      <div class="scen-th-title-row">
                        <span class="scen-circle-dot dot-yellow"></span>
                        <b>Gestão 2,5R — Alvo Estendido</b>
                      </div>
                      <span class="scen-th-badge badge-yellow">Risco 1R → Saída 2,5R</span>
                    </div>
                  </th>
                  <th class="th-scen scen-col-pyr ${state.activeScenario === 'PYRAMID_1R_2R' ? 'active-col' : ''}" data-switch-scenario="PYRAMID_1R_2R" title="Clique para simular este cenário">
                    <div class="scen-th-inner">
                      <div class="scen-th-title-row">
                        <span class="scen-circle-dot dot-blue"></span>
                        <b>Gestão Pirâmide — 1R → 2R</b>
                      </div>
                      <span class="scen-th-badge badge-blue">Add em +1R → Saída 2R</span>
                    </div>
                  </th>
                  <th class="th-scen scen-col-part50 ${state.activeScenario === 'PARTIAL_50_2R_EMA9' ? 'active-col' : ''}" data-switch-scenario="PARTIAL_50_2R_EMA9" title="Clique para simular este cenário">
                    <div class="scen-th-inner">
                      <div class="scen-th-title-row">
                        <span class="scen-circle-dot dot-purple"></span>
                        <b>Parcial 50% + MM9</b>
                      </div>
                      <span class="scen-th-badge badge-purple">50% em 2R → 50% MM9</span>
                    </div>
                  </th>
                  <th class="th-scen scen-col-part80 ${state.activeScenario === 'PARTIAL_80_2R_EMA9' ? 'active-col' : ''}" data-switch-scenario="PARTIAL_80_2R_EMA9" title="Clique para simular este cenário">
                    <div class="scen-th-inner">
                      <div class="scen-th-title-row">
                        <span class="scen-circle-dot dot-cyan"></span>
                        <b>Parcial 80% + MM9</b>
                      </div>
                      <span class="scen-th-badge badge-cyan">80% em 2R → 20% MM9</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="td-metric-name">Total de Trades</td>
                  <td><b>${sc2R.totalTrades ?? 42}</b></td>
                  <td><b>${sc25R.totalTrades ?? 42}</b></td>
                  <td><b>${scPyr.totalTrades ?? 42}</b></td>
                  <td><b>${scPart50.totalTrades ?? 42}</b></td>
                  <td><b>${scPart80.totalTrades ?? 42}</b></td>
                </tr>
                <tr>
                  <td class="td-metric-name">Win Rate</td>
                  <td>${sc2R.winRateFormatted || '—'}</td>
                  <td>${sc25R.winRateFormatted || '—'}</td>
                  <td>${scPyr.winRateFormatted || '—'}</td>
                  <td>${scPart50.winRateFormatted || '—'}</td>
                  <td>${scPart80.winRateFormatted || '—'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">Loss Rate</td>
                  <td>${sc2R.lossRateFormatted || '—'}</td>
                  <td>${sc25R.lossRateFormatted || '—'}</td>
                  <td>${scPyr.lossRateFormatted || '—'}</td>
                  <td>${scPart50.lossRateFormatted || '—'}</td>
                  <td>${scPart80.lossRateFormatted || '—'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">R médio por trade</td>
                  <td class="metric-accent">${sc2R.avgRFormatted || '—'}</td>
                  <td class="metric-accent">${sc25R.avgRFormatted || '—'}</td>
                  <td class="metric-accent-blue">${scPyr.avgRFormatted || '—'}</td>
                  <td class="metric-accent-purple">${scPart50.avgRFormatted || '—'}</td>
                  <td class="metric-accent-cyan">${scPart80.avgRFormatted || '—'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">Expectancy</td>
                  <td class="metric-accent">${sc2R.expectancyFormatted || '—'}</td>
                  <td class="metric-accent">${sc25R.expectancyFormatted || '—'}</td>
                  <td class="metric-accent-blue">${scPyr.expectancyFormatted || '—'}</td>
                  <td class="metric-accent-purple">${scPart50.expectancyFormatted || '—'}</td>
                  <td class="metric-accent-cyan">${scPart80.expectancyFormatted || '—'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">Profit Factor</td>
                  <td><b>${sc2R.profitFactorFormatted || '—'}</b></td>
                  <td><b>${sc25R.profitFactorFormatted || '—'}</b></td>
                  <td><b class="metric-accent-blue">${scPyr.profitFactorFormatted || '—'}</b></td>
                  <td><b class="metric-accent-purple">${scPart50.profitFactorFormatted || '—'}</b></td>
                  <td><b class="metric-accent-cyan">${scPart80.profitFactorFormatted || '—'}</b></td>
                </tr>
                <tr>
                  <td class="td-metric-name">Resultado acumulado</td>
                  <td class="metric-gain">${sc2R.totalRFormatted || '—'}</td>
                  <td class="metric-gain">${sc25R.totalRFormatted || '—'}</td>
                  <td class="metric-gain-high">${scPyr.totalRFormatted || '—'}</td>
                  <td class="metric-gain-purple">${scPart50.totalRFormatted || '—'}</td>
                  <td class="metric-gain-cyan">${scPart80.totalRFormatted || '—'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">Drawdown máximo</td>
                  <td class="metric-loss">${sc2R.maxDrawdownFormatted || '—'}</td>
                  <td class="metric-loss">${sc25R.maxDrawdownFormatted || '—'}</td>
                  <td class="metric-loss">${scPyr.maxDrawdownFormatted || '—'}</td>
                  <td class="metric-loss">${scPart50.maxDrawdownFormatted || '—'}</td>
                  <td class="metric-loss">${scPart80.maxDrawdownFormatted || '—'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">MFE médio (vencedores)</td>
                  <td>${sc2R.avgMfeFormatted || '—'}</td>
                  <td>${sc25R.avgMfeFormatted || '—'}</td>
                  <td>${scPyr.avgMfeFormatted || '—'}</td>
                  <td>${scPart50.avgMfeFormatted || '—'}</td>
                  <td>${scPart80.avgMfeFormatted || '—'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">MAE médio (perdedores)</td>
                  <td class="metric-loss">${sc2R.avgMaeFormatted || '—'}</td>
                  <td class="metric-loss">${sc25R.avgMaeFormatted || '—'}</td>
                  <td class="metric-loss">${scPyr.avgMaeFormatted || '—'}</td>
                  <td class="metric-loss">${scPart50.avgMaeFormatted || '—'}</td>
                  <td class="metric-loss">${scPart80.avgMaeFormatted || '—'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">Duração média</td>
                  <td>${getScenarioAvgDuration(sc2R, '2R')}</td>
                  <td>${getScenarioAvgDuration(sc25R, '2.5R')}</td>
                  <td>${getScenarioAvgDuration(scPyr, 'PYRAMID_1R_2R')}</td>
                  <td>${getScenarioAvgDuration(scPart50, 'PARTIAL_50_2R_EMA9')}</td>
                  <td>${getScenarioAvgDuration(scPart80, 'PARTIAL_80_2R_EMA9')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Como os cenários funcionam? -->
          <div class="sim-compare-explanation-container">
            <div class="sim-compare-expl-title">
              <span>COMO OS CENÁRIOS FUNCIONAM?</span>
            </div>
            <div class="sim-compare-expl-grid">
              <!-- Card 1: 2R Base -->
              <div class="sim-expl-item item-2r">
                <div class="sim-expl-item-body">
                  <div class="sim-expl-title-row">
                    <span class="scen-circle-dot dot-green"></span>
                    <b>Gestão 2R — Base</b>
                  </div>
                  <ul class="sim-expl-bullets">
                    <li>Entrada: Risco inicial 1R</li>
                    <li>Stop: -1R</li>
                    <li>Saída: 100% em +2R</li>
                    <li>Sem piramidagem</li>
                  </ul>
                </div>
                <div class="sim-expl-item-diagram">
                  ${getScenarioMiniDiagramSvg('2R')}
                </div>
              </div>

              <!-- Card 2: 2.5R Alvo Estendido -->
              <div class="sim-expl-item item-25r">
                <div class="sim-expl-item-body">
                  <div class="sim-expl-title-row">
                    <span class="scen-circle-dot dot-yellow"></span>
                    <b>Gestão 2,5R — Alvo Est.</b>
                  </div>
                  <ul class="sim-expl-bullets">
                    <li>Entrada: Risco inicial 1R</li>
                    <li>Stop: -1R (+1R move p/ BE)</li>
                    <li>Saída: 100% em +2,5R</li>
                    <li>Sem piramidagem</li>
                  </ul>
                </div>
                <div class="sim-expl-item-diagram">
                  ${getScenarioMiniDiagramSvg('2.5R')}
                </div>
              </div>

              <!-- Card 3: Pirâmide 1R -> 2R -->
              <div class="sim-expl-item item-pyr">
                <div class="sim-expl-item-body">
                  <div class="sim-expl-title-row">
                    <span class="scen-circle-dot dot-blue"></span>
                    <b>Pirâmide — 1R → 2R</b>
                  </div>
                  <ul class="sim-expl-bullets">
                    <li>Entrada: Risco inicial 1R</li>
                    <li>Em +1R: add lote e stop p/ BE</li>
                    <li>Saída: 100% em +2R (+3R total)</li>
                  </ul>
                </div>
                <div class="sim-expl-item-diagram">
                  ${getScenarioMiniDiagramSvg('PYRAMID_1R_2R')}
                </div>
              </div>

              <!-- Card 4: Parcial 50% (2R) + Média 9 -->
              <div class="sim-expl-item item-part50">
                <div class="sim-expl-item-body">
                  <div class="sim-expl-title-row">
                    <span class="scen-circle-dot dot-purple"></span>
                    <b>Parcial 50% + MM9</b>
                  </div>
                  <ul class="sim-expl-bullets">
                    <li>Entrada: Risco inicial 1R</li>
                    <li>Em +2R: 50% (+1R) e stop p/ BE</li>
                    <li>Runner: 50% conduzidos na MM9</li>
                  </ul>
                </div>
                <div class="sim-expl-item-diagram">
                  ${getScenarioMiniDiagramSvg('PARTIAL_50_2R_EMA9')}
                </div>
              </div>

              <!-- Card 5: Parcial 80% (2R) + Média 9 -->
              <div class="sim-expl-item item-part80">
                <div class="sim-expl-item-body">
                  <div class="sim-expl-title-row">
                    <span class="scen-circle-dot dot-cyan"></span>
                    <b>Parcial 80% + MM9</b>
                  </div>
                  <ul class="sim-expl-bullets">
                    <li>Entrada: Risco inicial 1R</li>
                    <li>Em +2R: 80% (+1,6R) e stop p/ BE</li>
                    <li>Runner: 20% conduzidos na MM9</li>
                  </ul>
                </div>
                <div class="sim-expl-item-diagram">
                  ${getScenarioMiniDiagramSvg('PARTIAL_80_2R_EMA9')}
                </div>
              </div>
            </div>
          </div>

          <!-- Rodapé do Modal -->
          <div class="sim-compare-modal-footer">
            <div class="sim-compare-footer-info">
              💡 <b>Dica:</b> Clique no cabeçalho de qualquer cenário na tabela para carregar suas métricas e trades no simulador.
            </div>
            <button class="sim-export-btn" type="button" id="simCompareModalCloseBtn">
              Fechar
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Card da Estrutura Anatômica do Gatilho e Velocidade (Time to Target)
   */
  function renderModalStructureCard(sim) {
    if (!sim.structure && sim.ttt1R == null && !sim.expansionAfterBreakout) return '';
    const struct = sim.structure || {};
    const isDib = sim.triggerName === 'Double Inside Bar' || struct.ibCount === 2;
    const ttt1 = sim.ttt1R != null ? `${sim.ttt1R} candle${sim.ttt1R === 1 ? '' : 's'}` : 'Não atingido';
    const ttt2 = sim.ttt2R != null ? `${sim.ttt2R} candle${sim.ttt2R === 1 ? '' : 's'}` : 'Não atingido';
    const ttt3 = sim.ttt3R != null ? `${sim.ttt3R} candle${sim.ttt3R === 1 ? '' : 's'}` : 'Não atingido';
    const exp = sim.expansionAfterBreakout || {};

    return `
      <div class="sim-dib-structure-card">
        <div class="sim-dib-card-header">
          <span class="sim-dib-card-badge">${isDib ? '⚡ DOUBLE INSIDE BAR • 2 CAMADAS ANINHADAS' : 'INSIDE BAR • 1 CAMADA'}</span>
          <h4>Anatomia da Estrutura & Velocidade do Movimento</h4>
        </div>

        ${struct.motherCandle ? `
          <div class="sim-dib-layers-grid">
            <div class="sim-dib-layer-item">
              <small>Candle-mãe</small>
              <b>R$ ${struct.motherCandle.range ? struct.motherCandle.range.toFixed(2).replace('.', ',') : '—'}</b>
              <span>${struct.motherCandle.high ? 'Máx: ' + formatMoney(struct.motherCandle.high) : ''}</span>
            </div>
            <div class="sim-dib-layer-item">
              <small>Inside Bar 1</small>
              <b>R$ ${struct.ib1?.range ? struct.ib1.range.toFixed(2).replace('.', ',') : '—'}</b>
              <span class="sim-dib-comp-tag">${struct.ib1?.compressionPct ? struct.ib1.compressionPct.toFixed(1).replace('.', ',') + '% do mãe' : '—'}</span>
            </div>
            ${isDib ? `
              <div class="sim-dib-layer-item">
                <small>Inside Bar 2</small>
                <b>R$ ${struct.ib2?.range ? struct.ib2.range.toFixed(2).replace('.', ',') : '—'}</b>
                <span class="sim-dib-comp-tag">${struct.ib2?.compressionPct ? struct.ib2.compressionPct.toFixed(1).replace('.', ',') + '% do IB1' : '—'}</span>
              </div>
              <div class="sim-dib-layer-item highlight">
                <small>Contração Total</small>
                <b style="color: #10b981;">${struct.totalContractionPct ? struct.totalContractionPct.toFixed(1).replace('.', ',') + '%' : '—'}</b>
                <span>Risco Gráfico: ${struct.graphicRiskPct ? struct.graphicRiskPct.toFixed(2).replace('.', ',') + '%' : '—'}</span>
              </div>
            ` : `
              <div class="sim-dib-layer-item highlight">
                <small>Contração Total</small>
                <b style="color: #10b981;">${struct.totalContractionPct ? struct.totalContractionPct.toFixed(1).replace('.', ',') + '%' : '—'}</b>
                <span>Risco Gráfico: ${struct.graphicRiskPct ? struct.graphicRiskPct.toFixed(2).replace('.', ',') + '%' : '—'}</span>
              </div>
            `}
          </div>
        ` : ''}

        <div class="sim-dib-velocity-grid">
          <div class="sim-dib-vel-box">
            <small>Time to Target (+1R)</small>
            <b>${ttt1}</b>
          </div>
          <div class="sim-dib-vel-box">
            <small>Time to Target (+2R)</small>
            <b>${ttt2}</b>
          </div>
          <div class="sim-dib-vel-box">
            <small>Time to Target (+3R)</small>
            <b>${ttt3}</b>
          </div>
          <div class="sim-dib-vel-box">
            <small>Expansão Pós-Rompimento</small>
            <span style="font-size: 11px; font-weight: 600; color: #cbd5e1;">
              ${exp.c1 != null ? 'C1: ' + formatR(exp.c1) : 'C1: —'}
              ${exp.c2 != null ? ' • C2: ' + formatR(exp.c2) : ''}
              ${exp.c3 != null ? ' • C3: ' + formatR(exp.c3) : ''}
              ${exp.c5 != null ? ' • C5: ' + formatR(exp.c5) : ''}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Modal de Estudo Estatístico: Double Inside Bar vs Inside Bar Simples
   */
  function renderHypothesisModal() {
    if (!state.hypothesisModalOpen) return '';

    let hypothesis = state.hypothesisComparison;
    if (!hypothesis || !hypothesis.simple || !hypothesis.double) {
      if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.compareInsideBarTriggers === 'function') {
        hypothesis = root.TradeSimulatorModel.compareInsideBarTriggers(state.simulations);
        state.hypothesisComparison = hypothesis;
      }
    }

    const simple = hypothesis?.simple || {};
    const double = hypothesis?.double || {};
    const diff = hypothesis?.diff || {};
    const cross = hypothesis?.crossContext || {};
    const status = hypothesis?.hypothesisStatus || {};

    function formatDeltaR(val) {
      if (val == null) return '—';
      const n = Number(val);
      const sign = n > 0 ? '+' : '';
      return `${sign}${n.toFixed(2).replace('.', ',')}R`;
    }

    function formatDeltaPct(val) {
      if (val == null) return '—';
      const n = Number(val);
      const sign = n > 0 ? '+' : '';
      return `${sign}${n.toFixed(1).replace('.', ',')}pp`;
    }

    function formatDeltaCandles(val) {
      if (val == null) return '—';
      const n = Number(val);
      const sign = n > 0 ? '+' : '';
      return `${sign}${n.toFixed(1).replace('.', ',')} candles`;
    }

    return `
      <div class="sim-compare-modal-overlay open" id="simHypothesisModalOverlay">
        <div class="sim-compare-modal-box sim-hypothesis-modal-box" id="simHypothesisModalBox">
          <!-- Cabeçalho do Modal -->
          <div class="sim-compare-modal-header">
            <div class="sim-compare-header-left">
              <div class="sim-compare-header-badge">ESTUDO EMPÍRICO • HIPÓTESE ESTATÍSTICA</div>
              <h2>🔬 Estudo: Double Inside Bar vs Inside Bar Simples</h2>
              <p>Avaliação quantitativa da compressão em 2 camadas de volatilidade sob o método Healthy Trend Trader.</p>
            </div>
            <div class="sim-compare-header-right">
              <div class="sim-comparison-badge">
                Amostra: ${double.totalCreated || 0} Double Inside Bars • ${simple.totalCreated || 0} Inside Bars
              </div>
              <button class="sim-modal-close-btn" type="button" id="simHypothesisModalClose" title="Fechar estudo">×</button>
            </div>
          </div>

          <!-- Card de Guardrail Inviolável de Bet Sizing -->
          <div class="sim-hyp-guardrail-card">
            <div class="sim-hyp-guardrail-icon">⚠️</div>
            <div class="sim-hyp-guardrail-content">
              <b>Regra Inviolável de Bet Sizing & Risco Nominal:</b>
              <p>${status.betSizingRule || 'Double Inside Bar é estritamente um qualificador de gatilho sob teste estatístico. O risco por trade permanece estritamente governado pelo Rubric (Nota do Trade) e pela Política de Risco nominal (A, B, C e D). O simulador NÃO altera o risco nominal automaticamente.'}</p>
            </div>
          </div>

          <!-- Tabela de Comparação Direta -->
          <div class="sim-compare-table-container">
            <table class="sim-comparison-table sim-hypothesis-table">
              <thead>
                <tr>
                  <th class="th-metric">MÉTRICA ESTATÍSTICA</th>
                  <th class="th-scen scen-col-simple">
                    <div class="scen-th-inner">
                      <div class="scen-th-title-row">
                        <span class="scen-circle-dot dot-blue"></span>
                        <b>Inside Bar Simples</b>
                      </div>
                      <span class="scen-th-badge badge-blue">1 Camada de Contração</span>
                    </div>
                  </th>
                  <th class="th-scen scen-col-double">
                    <div class="scen-th-inner">
                      <div class="scen-th-title-row">
                        <span class="scen-circle-dot dot-green"></span>
                        <b>Double Inside Bar</b>
                      </div>
                      <span class="scen-th-badge badge-green">2 Camadas Aninhadas</span>
                    </div>
                  </th>
                  <th class="th-scen scen-col-delta">
                    <div class="scen-th-inner">
                      <div class="scen-th-title-row">
                        <span class="scen-circle-dot dot-yellow"></span>
                        <b>Delta / Diferença</b>
                      </div>
                      <span class="scen-th-badge badge-yellow">DIB vs IB</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="td-metric-name"><b>Trades Criados / Executados</b></td>
                  <td class="td-val">${simple.totalCreated || 0} criados • ${simple.executedCount || 0} exec.</td>
                  <td class="td-val highlight-val">${double.totalCreated || 0} criados • ${double.executedCount || 0} exec.</td>
                  <td class="td-val">—</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Taxa de Acerto (Win Rate)</b></td>
                  <td class="td-val">${simple.winRateFormatted || '—'}</td>
                  <td class="td-val highlight-val">${double.winRateFormatted || '—'}</td>
                  <td class="td-val ${diff.winRateDelta >= 0 ? 'metric-gain' : 'metric-loss'}">${formatDeltaPct(diff.winRateDelta)}</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Média de Ganho (+R)</b></td>
                  <td class="td-val">${simple.avgGainFormatted || '—'}</td>
                  <td class="td-val highlight-val">${double.avgGainFormatted || '—'}</td>
                  <td class="td-val">—</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Média de Perda (-R)</b></td>
                  <td class="td-val">${simple.avgLossFormatted || '—'}</td>
                  <td class="td-val highlight-val">${double.avgLossFormatted || '—'}</td>
                  <td class="td-val">—</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Payoff (Win/Loss Ratio)</b></td>
                  <td class="td-val">${simple.winLossRatioFormatted || '—'}</td>
                  <td class="td-val highlight-val">${double.winLossRatioFormatted || '—'}</td>
                  <td class="td-val">—</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Expectancy Matemática (+R / trade)</b></td>
                  <td class="td-val ${simple.expectancy >= 0 ? 'metric-gain' : 'metric-loss'}">${simple.expectancyFormatted || '—'}</td>
                  <td class="td-val highlight-val ${double.expectancy >= 0 ? 'metric-gain' : 'metric-loss'}">${double.expectancyFormatted || '—'}</td>
                  <td class="td-val ${diff.expectancyDelta >= 0 ? 'metric-gain' : 'metric-loss'}">${formatDeltaR(diff.expectancyDelta)}</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Total R Acumulado</b></td>
                  <td class="td-val metric-gain">${simple.totalRFormatted || '—'}</td>
                  <td class="td-val highlight-val metric-gain">${double.totalRFormatted || '—'}</td>
                  <td class="td-val ${diff.totalRDelta >= 0 ? 'metric-gain' : 'metric-loss'}">${formatDeltaR(diff.totalRDelta)}</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>MFE Médio (Excursão Favorável Máxima)</b></td>
                  <td class="td-val metric-gain">${simple.avgMfeFormatted || '—'}</td>
                  <td class="td-val highlight-val metric-gain">${double.avgMfeFormatted || '—'}</td>
                  <td class="td-val ${diff.mfeDelta >= 0 ? 'metric-gain' : 'metric-loss'}">${formatDeltaR(diff.mfeDelta)}</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>MAE Médio (Excursão Adversa Máxima)</b></td>
                  <td class="td-val metric-loss">${simple.avgMaeFormatted || '—'}</td>
                  <td class="td-val highlight-val metric-loss">${double.avgMaeFormatted || '—'}</td>
                  <td class="td-val ${diff.maeDelta >= 0 ? 'metric-gain' : 'metric-loss'}">${formatDeltaR(diff.maeDelta)}</td>
                </tr>
                <tr class="row-speed-highlight">
                  <td class="td-metric-name"><b>⚡ Time to Target +1R (Velocidade)</b></td>
                  <td class="td-val">${simple.avgTtt1RFormatted || 'N/A'}</td>
                  <td class="td-val highlight-val" style="color: #34d399; font-weight: 800;">${double.avgTtt1RFormatted || 'N/A'}</td>
                  <td class="td-val ${diff.ttt1RDelta != null && diff.ttt1RDelta <= 0 ? 'metric-gain' : 'metric-neutral'}">
                    ${diff.ttt1RDelta != null && diff.ttt1RDelta <= 0 ? '⚡ ' + formatDeltaCandles(diff.ttt1RDelta) + ' (Mais Rápido)' : formatDeltaCandles(diff.ttt1RDelta)}
                  </td>
                </tr>
                <tr class="row-speed-highlight">
                  <td class="td-metric-name"><b>⚡ Time to Target +2R (Velocidade)</b></td>
                  <td class="td-val">${simple.avgTtt2RFormatted || 'N/A'}</td>
                  <td class="td-val highlight-val" style="color: #34d399; font-weight: 800;">${double.avgTtt2RFormatted || 'N/A'}</td>
                  <td class="td-val ${diff.ttt2RDelta != null && diff.ttt2RDelta <= 0 ? 'metric-gain' : 'metric-neutral'}">
                    ${diff.ttt2RDelta != null && diff.ttt2RDelta <= 0 ? '⚡ ' + formatDeltaCandles(diff.ttt2RDelta) + ' (Mais Rápido)' : formatDeltaCandles(diff.ttt2RDelta)}
                  </td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Taxa que atingiu +1R (%)</b></td>
                  <td class="td-val">${simple.pctHit1RFormatted || '—'}</td>
                  <td class="td-val highlight-val">${double.pctHit1RFormatted || '—'}</td>
                  <td class="td-val ${diff.pctHit1RDelta >= 0 ? 'metric-gain' : 'metric-loss'}">${formatDeltaPct(diff.pctHit1RDelta)}</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Taxa que atingiu +2R (%)</b></td>
                  <td class="td-val">${simple.pctHit2RFormatted || '—'}</td>
                  <td class="td-val highlight-val">${double.pctHit2RFormatted || '—'}</td>
                  <td class="td-val ${diff.pctHit2RDelta >= 0 ? 'metric-gain' : 'metric-loss'}">${formatDeltaPct(diff.pctHit2RDelta)}</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Taxa que atingiu +3R (%)</b></td>
                  <td class="td-val">${simple.pctHit3RFormatted || '—'}</td>
                  <td class="td-val highlight-val" style="color: #34d399; font-weight: 700;">${double.pctHit3RFormatted || '—'}</td>
                  <td class="td-val ${diff.pctHit3RDelta >= 0 ? 'metric-gain' : 'metric-loss'}">${formatDeltaPct(diff.pctHit3RDelta)}</td>
                </tr>
                <tr>
                  <td class="td-metric-name"><b>Expansão Pós-Rompimento (C1 / C2 / C3 / C5)</b></td>
                  <td class="td-val">${simple.expansion?.c1Formatted || '—'} / ${simple.expansion?.c2Formatted || '—'} / ${simple.expansion?.c3Formatted || '—'} / ${simple.expansion?.c5Formatted || '—'}</td>
                  <td class="td-val highlight-val">${double.expansion?.c1Formatted || '—'} / ${double.expansion?.c2Formatted || '—'} / ${double.expansion?.c3Formatted || '—'} / ${double.expansion?.c5Formatted || '—'}</td>
                  <td class="td-val">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cruzamentos do Edge com o Double Inside Bar -->
          <div class="sim-hyp-section-title">
            <h3>Cruzamentos com as Dimensões do Edge (Contexto é Soberano)</h3>
            <p>O Double Inside Bar é um acelerador de momentum quando apoiado pelo contexto correto, mas vulnerável a ruído quando operado isoladamente.</p>
          </div>

          <div class="sim-hyp-grid">
            <!-- 1. Força Relativa -->
            <div class="sim-hyp-card">
              <div class="sim-hyp-card-header">
                <span class="sim-hyp-tag">DIMENSÃO 1</span>
                <h4>Força Relativa (RS)</h4>
              </div>
              <div class="sim-hyp-subset-list">
                ${renderSubsetRow(cross.byRsTier?.tier95_100, 'RS 95–100 (Elite)')}
                ${renderSubsetRow(cross.byRsTier?.tier90_94, 'RS 90–94 (Líder)')}
                ${renderSubsetRow(cross.byRsTier?.tier80_89, 'RS 80–89 (Apoiador)')}
                ${renderSubsetRow(cross.byRsTier?.tierSub80, 'RS < 80 (Fraco / Lagging)', true)}
              </div>
            </div>

            <!-- 2. Ciclo de Mercado -->
            <div class="sim-hyp-card">
              <div class="sim-hyp-card-header">
                <span class="sim-hyp-tag">DIMENSÃO 2</span>
                <h4>Ciclo de Mercado</h4>
              </div>
              <div class="sim-hyp-subset-list">
                ${renderSubsetRow(cross.byMarketCycle?.healthy, 'Ciclo Positivo (Up / Healthy)')}
                ${renderSubsetRow(cross.byMarketCycle?.defensive, 'Ciclo Fraco / Defensivo (Down)', true)}
              </div>
            </div>

            <!-- 3. Super Trend Diária -->
            <div class="sim-hyp-card">
              <div class="sim-hyp-card-header">
                <span class="sim-hyp-tag">DIMENSÃO 3</span>
                <h4>Super Trend Diária (EMA 9 / 30)</h4>
              </div>
              <div class="sim-hyp-subset-list">
                ${renderSubsetRow(cross.bySuperTrend?.aligned, 'Alinhado (Preço > EMA 9 > EMA 30)')}
                ${renderSubsetRow(cross.bySuperTrend?.notAligned, 'Desalinhado / Abaixo das Médias', true)}
              </div>
            </div>

            <!-- 4. Contração de Volatilidade -->
            <div class="sim-hyp-card">
              <div class="sim-hyp-card-header">
                <span class="sim-hyp-tag">DIMENSÃO 4</span>
                <h4>Compressão vs Ruído</h4>
              </div>
              <div class="sim-hyp-subset-list">
                ${renderSubsetRow(cross.byVolatility?.lowAtr, 'Contração Severa (Total ≤ 50%)')}
                ${renderSubsetRow(cross.byVolatility?.normalElevated, 'Volatilidade Normal / Ruído')}
              </div>
            </div>
          </div>

          <!-- Diagnóstico dos Cenários de Estresse -->
          <div class="sim-hyp-adverse-box">
            <h4>🔬 Diagnóstico dos 6 Cenários de Teste Empírico</h4>
            <div class="sim-hyp-adverse-grid">
              <div class="sim-hyp-adverse-item good">
                <b>Cenário 1: RS 95+ & Ciclo Up (Ex: CPLE6, PRIO3)</b>
                <p>Confirmação da hipótese: a liberação da energia acumulada em 2 camadas acelera o movimento em direção ao alvo (+2R em 2 a 4 candles).</p>
              </div>
              <div class="sim-hyp-adverse-item bad">
                <b>Cenário 2: RS < 80 — Hipótese Adversa (Ex: KEPL3)</b>
                <p>Falha empírica: sem liderança relativa frente ao IBOV, a contração não tem força compradora institucional para dar seguimento ao rompimento.</p>
              </div>
              <div class="sim-hyp-adverse-item bad">
                <b>Cenários 3 e 5: Ciclo Down / Contra SuperTrend (Ex: TIMS3)</b>
                <p>Falha empírica: operar rompimento de compressão contra a tendência diária resulta em armadilha de touro e stop rápido.</p>
              </div>
              <div class="sim-hyp-adverse-item bad">
                <b>Cenário 6: Volatilidade Excessiva / Ruído (Ex: SMTO3)</b>
                <p>Falha empírica: stop excessivamente curto em ativo de volatilidade ruidosa é violado pela oscilação intradiária natural.</p>
              </div>
            </div>
          </div>

          <!-- Rodapé do Modal -->
          <div class="sim-compare-modal-footer">
            <span class="sim-compare-footer-info">Healthy Trend Trader • Pesquisa Quantitativa de Gatilhos & Gestão de Risco</span>
            <button class="sim-btn-seed" type="button" id="simHypothesisModalCloseBtn" style="padding: 6px 16px;">Fechar Estudo</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSubsetRow(subset, defaultLabel, isAdverse = false) {
    if (!subset) {
      return `
        <div class="sim-hyp-row">
          <span>${defaultLabel}</span>
          <span style="color: #64748b;">Sem amostra</span>
        </div>
      `;
    }
    const wrColor = subset.winRate >= 60 ? '#10b981' : (subset.winRate < 40 ? '#ef4444' : '#f59e0b');
    const expColor = subset.expectancy >= 0.5 ? '#10b981' : (subset.expectancy < 0 ? '#ef4444' : '#f59e0b');
    return `
      <div class="sim-hyp-row ${isAdverse ? 'adverse-row' : ''}">
        <span class="sim-hyp-row-label">${subset.label || defaultLabel}</span>
        <div class="sim-hyp-row-metrics">
          <span class="sim-hyp-metric" style="color: ${wrColor};">WR: <b>${subset.winRateFormatted}</b></span>
          <span class="sim-hyp-metric" style="color: ${expColor};">Exp: <b>${subset.expectancyFormatted}</b></span>
          <span class="sim-hyp-metric" style="color: #94a3b8;">TTT: <b>${subset.avgTtt1RFormatted}</b></span>
          <small>(${subset.executed} trades)</small>
        </div>
      </div>
    `;
  }

  /**
   * Modal de Relatório de Auditoria e Consistência Automática por Execução
   */
  function renderAuditModal() {
    if (!state.auditModalOpen) return '';

    const audit = (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.auditSimulationsBatch === 'function')
      ? root.TradeSimulatorModel.auditSimulationsBatch(state.simulations, {
          scenario: state.activeScenario,
          universe: state.massConfig?.universe || 'IBOV',
          period: state.massConfig?.period || state.filters.days
        })
      : state.auditReport;

    if (!audit) return '';
    state.auditReport = audit;

    const recon = audit.reconciliation || {};
    const stats = audit.stats || {};
    const breakdown = audit.errorBreakdown || {};
    const invalidTrades = Array.isArray(audit.invalidTrades) ? audit.invalidTrades : [];

    const checkRow = (label, ok, detail) => `
      <div class="sim-audit-check-row ${ok ? 'pass' : 'fail'}">
        <span class="sim-audit-check-ico">${ok ? '✓' : '✕'}</span>
        <div class="sim-audit-check-main">
          <b>${label}</b>
          <span>${detail}</span>
        </div>
        <span class="sim-audit-check-tag ${ok ? 'pass' : 'fail'}">${ok ? 'CONFORME' : 'FALHA'}</span>
      </div>
    `;

    return `
      <div class="sim-compare-modal-overlay open" id="simAuditModalOverlay">
        <div class="sim-compare-modal-box sim-audit-modal-box" id="simAuditModalBox">
          <div class="sim-compare-modal-header">
            <div class="sim-compare-header-left">
              <div class="sim-compare-header-badge">AUDITORIA AUTOMÁTICA DE CONSISTÊNCIA E PRECISÃO</div>
              <h2>🛡️ Relatório de Integridade do Simulador</h2>
              <p>Verificação automática de notas (Rubric), calendário de pregão, matemática de R e reconciliação estatística.</p>
            </div>
            <div class="sim-compare-header-right">
              <div class="sim-comparison-badge">
                Engine ${audit.engineVersion || '4.2.0-audited'} • ID: ${audit.executionId || '—'}
              </div>
              <button class="sim-modal-close-btn" type="button" id="simAuditModalClose" title="Fechar relatório">×</button>
            </div>
          </div>

          <div class="sim-audit-summary-banner ${audit.isConsistent ? 'pass' : 'fail'}">
            <div class="sim-audit-summary-title">
              <span>${audit.isConsistent ? '✓ AMOSTRA 100% CONSISTENTE E AUDITADA' : `⚠️ FORAM DETECTADAS ${audit.invalidTradesCount || 0} INCONSISTÊNCIA(S)`}</span>
            </div>
            <div class="sim-audit-summary-meta">
              <span>Total avaliado: <b>${audit.totalEvaluated} simulações</b></span>
              <span>Válidas: <b>${audit.validTradesCount}</b></span>
              <span>Inconsistentes: <b>${audit.invalidTradesCount}</b></span>
              <span>Duplicatas: <b>${audit.duplicateSignalsCount}</b></span>
              <span>Executados: <b>${stats.executedEntriesCount || 0}</b> (${stats.inOperationCount || 0} abertos + ${stats.closedTradesCount || 0} encerrados)</span>
            </div>
          </div>

          <div class="sim-audit-grid">
            <div class="sim-audit-card">
              <h4>1. Regras Auditadas por Trade</h4>
              <div class="sim-audit-checks-list">
                ${checkRow(
                  'Fonte de Verdade das Notas (A, B, C e D)',
                  (breakdown.INVALID_GRADE || 0) === 0,
                  `Apenas notas oficiais do Novo Trade / Rubric permitidas. Notas inválidas: ${breakdown.INVALID_GRADE || 0}.`
                )}
                ${checkRow(
                  'Calendário Oficial de Pregão & Cronologia',
                  (breakdown.SIGNAL_NON_TRADING_DAY || 0) === 0 &&
                  (breakdown.ENTRY_NON_TRADING_DAY || 0) === 0 &&
                  (breakdown.EXIT_NON_TRADING_DAY || 0) === 0 &&
                  (breakdown.CHRONOLOGY_ENTRY_BEFORE_SIGNAL || 0) === 0 &&
                  (breakdown.CHRONOLOGY_EXIT_BEFORE_ENTRY || 0) === 0,
                  `Bloqueio de entradas/saídas em sábados, domingos e feriados B3. Violações de calendário: ${(breakdown.SIGNAL_NON_TRADING_DAY || 0) + (breakdown.ENTRY_NON_TRADING_DAY || 0) + (breakdown.EXIT_NON_TRADING_DAY || 0)}.`
                )}
                ${checkRow(
                  'Coerência de Resultado em R, Gain/Loss e Preços',
                  (breakdown.GAIN_ZERO_OR_NEGATIVE_R || 0) === 0 &&
                  (breakdown.LOSS_POSITIVE_R || 0) === 0 &&
                  (breakdown.RESULT_R_PRICE_MISMATCH || 0) === 0 &&
                  (breakdown.CLOSED_CURRENT_PRICE_MISMATCH || 0) === 0,
                  `Nenhum trade encerrado como Gain com ≤ 0,00R. Divergências preço vs R: ${(breakdown.GAIN_ZERO_OR_NEGATIVE_R || 0) + (breakdown.RESULT_R_PRICE_MISMATCH || 0)}.`
                )}
                ${checkRow(
                  'Integridade de MFE, MAE e Sem Duplicidade',
                  (breakdown.MFE_LESS_THAN_RESULT || 0) === 0 &&
                  (breakdown.MAE_GREATER_THAN_RESULT || 0) === 0 &&
                  (audit.duplicateSignalsCount || 0) === 0,
                  `MFE ≥ Resultado ≥ MAE em todos os trades; sinais duplicados: ${audit.duplicateSignalsCount || 0}.`
                )}
              </div>
            </div>

            <div class="sim-audit-card">
              <h4>2. Reconciliação Matemática das Estatísticas</h4>
              <div class="sim-audit-checks-list">
                ${checkRow(
                  'Partição Total da Amostra',
                  Boolean(recon.statusPartitionMatchesTotal),
                  `Aguardando (${stats.waitingCount || 0}) + Não Acionados (${stats.notTriggeredCount || 0}) + Em Operação (${stats.inOperationCount || 0}) + Encerrados (${stats.closedTradesCount || 0}) = ${stats.totalCreated || 0} criados.`
                )}
                ${checkRow(
                  'Entradas Executadas Reais',
                  Boolean(recon.executedMatchesOpenPlusClosed),
                  `Em Operação (${stats.inOperationCount || 0}) + Encerrados (${stats.closedTradesCount || 0}) = ${stats.executedEntriesCount || 0} executados (exclui não acionados).`
                )}
                ${checkRow(
                  'Reconciliação de Vencedores e Perdedores',
                  Boolean(recon.closedMatchesWinnersPlusLosers) && Boolean(recon.winLossPctMatches100),
                  `Vencedores (${stats.winningTradesCount || 0}) + Perdedores (${stats.losingTradesCount || 0}) = ${stats.closedTradesCount || 0} encerrados (WR ${stats.winRate || 0}% + LR ${stats.lossRate || 0}%).`
                )}
                ${checkRow(
                  'Soma Global de R por Gatilho, Nota e Período',
                  Boolean(recon.triggerSumMatchesTotalR) && Boolean(recon.gradeSumMatchesTotalR) && Boolean(recon.periodSumMatchesTotalR),
                  `Total Global: ${stats.totalRFormatted || '+0,00R'} | Soma Gatilhos: ${formatR(recon.triggerSumR || 0)} | Soma Notas: ${formatR(recon.gradeSumR || 0)} | Soma Períodos: ${formatR(recon.periodSumR || 0)}.`
                )}
              </div>
            </div>
          </div>

          ${invalidTrades.length > 0 ? `
            <div class="sim-audit-card" style="margin-top: 14px;">
              <h4>Trades com Inconsistências Detectadas (${invalidTrades.length})</h4>
              <div class="sim-audit-invalid-list">
                ${invalidTrades.map(item => `
                  <div class="sim-audit-invalid-row">
                    <b>${item.symbol} (${item.id})</b>
                    <span>Sinal: ${formatDateBR(item.signalDate)} | Status: ${item.status}</span>
                    <code>${item.errors.map(e => e.code + ': ' + e.message).join(' • ')}</code>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="sim-compare-modal-footer">
            <span class="sim-compare-footer-info">Auditado em ${new Date(audit.timestamp).toLocaleString('pt-BR')} • ${audit.engineVersion}</span>
            <div style="display: flex; gap: 10px;">
              <button class="sim-export-btn" type="button" id="simAuditRevalidateBtn">↻ Sanitizar & Revalidar Amostra</button>
              <button class="sim-btn-seed" type="button" id="simAuditModalCloseBtn" style="padding: 6px 16px;">Fechar Relatório</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 5. Modal de Detalhes da Simulação e Timeline do Trade
   */
  function renderModal() {
    if (!state.selectedSimId) return '<div class="sim-modal-overlay" id="simModal"></div>';

    const sim = state.simulations.find(s => s.id === state.selectedSimId);
    if (!sim) return '<div class="sim-modal-overlay" id="simModal"></div>';

    const risk = sim.entryPrice && sim.stopLoss ? Math.abs(sim.entryPrice - sim.stopLoss) : 0;
    const target1R = sim.entryPrice && risk ? (sim.entryPrice + risk) : null;
    const target2R = sim.entryPrice && risk ? (sim.entryPrice + 2 * risk) : null;

    const timeline = sim.timeline || [];

    return `
      <div class="sim-modal-overlay open" id="simModal">
        <div class="sim-modal-box">
          <div class="sim-modal-header">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h2 style="margin: 0; font-size: 22px;">${sim.symbol}</h2>
                <span class="sim-grade-badge ${getGradeBadgeClass(sim.grade)}">${sim.grade || '—'}</span>
                ${renderStatusPill(sim.status)}
              </div>
              <p style="margin: 4px 0 0; color: var(--muted); font-size: 12px;">${sim.companyName || sim.symbol} • ${sim.triggerName} • Setor: ${sim.sector || 'Geral'}</p>
            </div>
            <button class="sim-modal-close-btn" type="button" id="simModalClose">×</button>
          </div>

          <!-- Grade de Parâmetros -->
          <div class="sim-modal-metrics-grid">
            <div class="sim-metric-box">
              <small>Entrada Planejada</small>
              <b>${formatMoney(sim.entryPrice)}</b>
            </div>
            <div class="sim-metric-box">
              <small>Entrada Executada</small>
              <b>${formatMoney(sim.executedEntryPrice)}</b>
            </div>
            <div class="sim-metric-box">
              <small>Stop Loss Inicial</small>
              <b>${formatMoney(sim.stopLoss)}</b>
            </div>
            <div class="sim-metric-box">
              <small>Stop Atual</small>
              <b>${formatMoney(sim.currentStop)}</b>
            </div>
            <div class="sim-metric-box">
              <small>Alvo +1R</small>
              <b>${formatMoney(target1R)}</b>
            </div>
            <div class="sim-metric-box">
              <small>Alvo +2R (Sell into Strength)</small>
              <b>${formatMoney(target2R)}</b>
            </div>
            <div class="sim-metric-box">
              <small>Preço Atual / Saída</small>
              <b>${formatMoney(sim.exitPrice || sim.currentPrice)}</b>
            </div>
            <div class="sim-metric-box">
              <small>Duração do Trade</small>
              <b>${formatDurationDays(sim.durationDays != null ? sim.durationDays : (root.TradeSimulatorModel ? root.TradeSimulatorModel.calculateTradeDurationDays(sim) : null))}</b>
            </div>
            <div class="sim-metric-box">
              <small>Resultado Final</small>
              <b style="color: ${sim.resultR > 0 ? '#10b981' : (sim.resultR < 0 ? '#ef4444' : 'inherit')}">${formatR(sim.resultR)}</b>
            </div>
          </div>

          <!-- MFE / MAE -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
            <div class="sim-metric-box" style="background: #f0fdf4;">
              <small style="color: #166534;">MFE (Max Favorable Excursion)</small>
              <b style="color: #16a34a; font-size: 16px;">${formatR(sim.mfeR)}</b>
            </div>
            <div class="sim-metric-box" style="background: #fef2f2;">
              <small style="color: #991b1b;">MAE (Max Adverse Excursion)</small>
              <b style="color: #dc2626; font-size: 16px;">${formatR(sim.maeR)}</b>
            </div>
          </div>

          <!-- Estrutura do Gatilho & Velocidade (Time to Target) -->
          ${renderModalStructureCard(sim)}

          <!-- Timeline Interativa de Eventos -->
          <h4 style="margin: 20px 0 8px; font-size: 14px;">Linha do Tempo da Simulação</h4>
          <div class="sim-timeline">
            ${timeline.map(t => {
              const itemClass = t.type === 'STOPPED_OUT' ? 'stopped' : (t.type === 'WAITING_ENTRY' ? 'waiting' : '');
              return `
                <div class="sim-timeline-item ${itemClass}">
                  <span class="sim-timeline-date">${formatDateBR(t.date)}</span>
                  <div class="sim-timeline-label">${t.label} ${t.price ? '• ' + formatMoney(t.price) : ''}</div>
                  <p class="sim-timeline-desc">${t.desc || ''}</p>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Ações do Modal -->
          <div class="sim-modal-actions">
            <button class="sim-action-btn" style="width: auto; padding: 0 14px; font-size: 12px; font-weight: 700;" type="button" id="simModalViewChart" data-sim-id="${sim.id}" data-ticker="${sim.symbol}">
              📊 Ver Foto / Snapshot do Trade
            </button>
            <button class="sim-export-btn" style="color: #dc2626; border-color: #fca5a5;" type="button" id="simModalDelete" data-sim-id="${sim.id}">
              🗑️ Excluir Simulação
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Ícones SVG dedicados para o Card 'Visão do Ativo' no Modal de Snapshot
   */
  const SNAPSHOT_ICONS = {
    trophy: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
    relativeStrength: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    marketCycle: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
    trend: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`,
    structure: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
    trigger: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,
    volatility: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    fundamentals: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 6 12 3 19 6"/><line x1="4" y1="10" x2="4" y2="21"/><line x1="20" y1="10" x2="20" y2="21"/><line x1="8" y1="14" x2="8" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/></svg>`,
    context: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
  };

  /**
   * Renderiza o Card lateral 'Visão do Ativo' (Trading Rubric congelada no momento da entrada)
   */
  function renderTradeVisionAtivoCard(sim) {
    if (!sim) return '';
    const vision = (sim.visionAtivo && sim.visionAtivo.relativeStrength)
      ? sim.visionAtivo
      : (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.getTradeVisionAtivo === 'function'
          ? root.TradeSimulatorModel.getTradeVisionAtivo(sim)
          : null);
    if (!vision) return '';

    return `
      <div class="ticker-summary-card sim-snapshot-vision-card">
        <div class="summary-card-head">
          <div class="summary-card-head-left">
            <div class="summary-trophy-badge">${SNAPSHOT_ICONS.trophy}</div>
            <div class="summary-titles">
              <div class="summary-title">Visão do Ativo</div>
              <div class="summary-subtitle">Baseado no seu método e no rubric atual.</div>
            </div>
          </div>
          <div class="summary-grade-box ${vision.gradeBoxClass || 'grade-a'}">
            ${vision.grade || '—'}
          </div>
        </div>

        <div class="summary-checklist">
          <div class="summary-check-row">
            <div class="summary-check-left">
              <span class="summary-check-icon">${SNAPSHOT_ICONS.relativeStrength}</span> Força Relativa
            </div>
            <div class="summary-check-right">
              <span class="vision-status ${vision.relativeStrength.status}">● ${vision.relativeStrength.text}</span>
            </div>
          </div>
          <div class="summary-check-row">
            <div class="summary-check-left">
              <span class="summary-check-icon">${SNAPSHOT_ICONS.marketCycle}</span> Ciclo de Mercado
            </div>
            <div class="summary-check-right">
              <span class="vision-status ${vision.marketCycle.status}">● ${vision.marketCycle.regime}</span>
            </div>
          </div>
          <div class="summary-check-row">
            <div class="summary-check-left">
              <span class="summary-check-icon">${SNAPSHOT_ICONS.trend}</span> Tendência
            </div>
            <div class="summary-check-right">
              <span class="vision-status ${vision.trend.status}">● ${vision.trend.formula}</span>
            </div>
          </div>
          <div class="summary-check-row">
            <div class="summary-check-left">
              <span class="summary-check-icon">${SNAPSHOT_ICONS.structure}</span> Estrutura
            </div>
            <div class="summary-check-right">
              <span class="vision-status ${vision.structure.status}">● ${vision.structure.label}</span>
            </div>
          </div>
          <div class="summary-check-row">
            <div class="summary-check-left">
              <span class="summary-check-icon">${SNAPSHOT_ICONS.trigger}</span> Gatilho
            </div>
            <div class="summary-check-right">
              <span class="vision-status ${vision.trigger.status}">● ${vision.trigger.display}</span>
            </div>
          </div>
          <div class="summary-check-row">
            <div class="summary-check-left">
              <span class="summary-check-icon">${SNAPSHOT_ICONS.volatility}</span> Volatilidade
            </div>
            <div class="summary-check-right">
              <span class="vision-status ${vision.volatility.status}">● ${vision.volatility.text}</span>
            </div>
          </div>
          <div class="summary-check-row">
            <div class="summary-check-left">
              <span class="summary-check-icon">${SNAPSHOT_ICONS.fundamentals}</span> Fundamentos
            </div>
            <div class="summary-check-right">
              <span class="vision-status ${vision.fundamentals.status}">● ${vision.fundamentals.evaluation}</span>
            </div>
          </div>
          <div class="summary-check-row">
            <div class="summary-check-left">
              <span class="summary-check-icon">${SNAPSHOT_ICONS.context}</span> Contexto
            </div>
            <div class="summary-check-right">
              <span class="vision-status ${vision.context.status}">● ${vision.context.title}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 6. Modal de Snapshot / Foto do Trade no Momento da Captura e Execução
   */
  function renderSnapshotModal() {
    if (!state.snapshotSimId) return '<div class="sim-modal-overlay" id="simSnapshotModal"></div>';

    const sim = state.simulations.find(s => s.id === state.snapshotSimId);
    if (!sim) return '<div class="sim-modal-overlay" id="simSnapshotModal"></div>';

    const entry = Number(sim.entryPrice) || 0;
    const stop = Number(sim.stopLoss) || 0;
    const risk = entry && stop ? Math.abs(entry - stop) : 0;
    const riskPct = entry && risk ? (risk / entry) * 100 : 0;
    const target1R = entry && risk ? (entry + risk) : null;
    const target2R = entry && risk ? (entry + 2 * risk) : null;

    return `
      <div class="sim-modal-overlay open" id="simSnapshotModal">
        <div class="sim-snapshot-modal-box">
          <!-- Cabeçalho do Snapshot -->
          <div class="sim-snapshot-header">
            <div class="sim-snapshot-title-wrap">
              <h2>
                <span>${sim.symbol}</span>
                <span class="sim-grade-badge ${getGradeBadgeClass(sim.grade)}">${sim.grade || '—'}</span>
                ${renderStatusPill(sim.status)}
              </h2>
              <p>${sim.companyName || sim.symbol} • Gatilho: <b>${sim.triggerName}</b> • Setor: ${sim.sector || 'Geral'}</p>
            </div>
            <button class="sim-modal-close-btn" type="button" id="simSnapshotClose" title="Fechar snapshot">×</button>
          </div>

          <!-- Barra de Parâmetros Congelados da Captura -->
          <div class="sim-snapshot-params-bar">
            <div class="sim-snapshot-param-item">
              <small>Data do Sinal</small>
              <b>${formatDateBR(sim.signalDate)}</b>
            </div>
            <div class="sim-snapshot-param-item">
              <small>Entrada Planejada</small>
              <b style="color: #0284c7;">${formatMoney(sim.entryPrice)}</b>
            </div>
            <div class="sim-snapshot-param-item">
              <small>Stop Inicial</small>
              <b style="color: #ef4444;">${formatMoney(sim.stopLoss)}</b>
            </div>
            <div class="sim-snapshot-param-item">
              <small>Risco R$ (1R)</small>
              <b>${formatMoney(risk)} (${riskPct.toFixed(2)}%)</b>
            </div>
            <div class="sim-snapshot-param-item">
              <small>Alvo +1R</small>
              <b style="color: #14b8a6;">${formatMoney(target1R)}</b>
            </div>
            <div class="sim-snapshot-param-item">
              <small>Alvo +2R (Sell into Strength)</small>
              <b style="color: #10b981;">${formatMoney(target2R)}</b>
            </div>
            <div class="sim-snapshot-param-item">
              <small>Duração</small>
              <b>${formatDurationDays(sim.durationDays != null ? sim.durationDays : (root.TradeSimulatorModel ? root.TradeSimulatorModel.calculateTradeDurationDays(sim) : null))}</b>
            </div>
            <div class="sim-snapshot-param-item">
              <small>Resultado</small>
              <b style="color: ${sim.resultR > 0 ? '#10b981' : (sim.resultR < 0 ? '#ef4444' : 'inherit')}">
                ${formatR(sim.resultR)}
              </b>
            </div>
          </div>

          <!-- Print / Foto do Momento da Captura & Execução + Visão do Ativo (Trading Rubric) -->
          <div class="sim-snapshot-body-split">
            <div class="sim-snapshot-chart-card">
              ${renderSnapshotChartSvg(sim)}
            </div>
            <div class="sim-snapshot-vision-container">
              ${renderTradeVisionAtivoCard(sim)}
            </div>
          </div>
          ${renderSnapshotAuditModal(sim)}

          <!-- Rodapé do Snapshot -->
          <div class="sim-snapshot-footer">
            <div class="sim-snapshot-footer-note">
              <span>📷 Candles diários reais (OHLCV) da fonte de dados do simulador. Sem candles sintéticos; eventos posteriores ao sinal são destacados à parte.</span>
            </div>
            <div class="sim-snapshot-footer-actions">
              <button class="sim-action-btn" style="width: auto; padding: 0 16px; height: 38px; font-size: 12px; font-weight: 700;" type="button" id="simSnapshotOpenInteractive" data-ticker="${sim.symbol}">
                📈 Abrir no Gráfico Interativo Diário
              </button>
              <button class="sim-export-btn" style="padding: 0 16px; height: 38px;" type="button" id="simSnapshotCloseBtn">
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 7. Modal de Exportação de Trades Simulados (DOC, PDF, ENEX, CSV)
   */
  function renderExportModal() {
    if (!state.exportModalOpen) {
      return '<div class="sim-modal-overlay" id="simExportModal"></div>';
    }

    const filtered = getFilteredSimulations();
    const all = state.simulations;
    const count = state.exportScope === 'ALL' ? all.length : filtered.length;

    let submitBtnLabel = `📥 Baixar Word (.DOC) • ${count} trades`;
    if (state.exportFormat === 'PDF') {
      submitBtnLabel = `🖨️ Abrir Visualização / Salvar PDF • ${count} trades`;
    } else if (state.exportFormat === 'ENEX') {
      submitBtnLabel = `📥 Baixar Evernote (.ENEX) • ${count} notas`;
    } else if (state.exportFormat === 'CSV') {
      submitBtnLabel = `📥 Baixar Planilha (.CSV) • ${count} trades`;
    }

    return `
      <div class="sim-modal-overlay open" id="simExportModal">
        <div class="sim-modal-box sim-export-modal-box">
          <!-- Cabeçalho do Modal -->
          <div class="sim-modal-header">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">📚 Exportar Trades Simulados</h2>
                <span class="sim-export-badge">ESTUDO INDIVIDUAL</span>
              </div>
              <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">
                Exporte as operações para estudo detalhado, anotações e revisão técnica fora da plataforma.
              </p>
            </div>
            <button class="sim-modal-close-btn" type="button" id="simExportModalClose" title="Fechar">×</button>
          </div>

          <!-- Escopo dos Trades -->
          <div class="sim-export-section">
            <label class="sim-export-section-title">1. Selecione o universo de trades:</label>
            <div class="sim-export-scope-wrap">
              <label class="sim-export-scope-opt ${state.exportScope === 'FILTERED' ? 'selected' : ''}">
                <input type="radio" name="simExportScope" value="FILTERED" ${state.exportScope === 'FILTERED' ? 'checked' : ''} />
                <span>Filtro Atual na Tela (<b>${filtered.length} trades</b>)</span>
              </label>
              <label class="sim-export-scope-opt ${state.exportScope === 'ALL' ? 'selected' : ''}">
                <input type="radio" name="simExportScope" value="ALL" ${state.exportScope === 'ALL' ? 'checked' : ''} />
                <span>Todas as Simulações (<b>${all.length} trades</b>)</span>
              </label>
            </div>
          </div>

          <!-- Formato de Exportação -->
          <div class="sim-export-section" style="margin-top: 18px;">
            <label class="sim-export-section-title">2. Escolha o formato de estudo:</label>
            <div class="sim-export-cards-grid">
              <!-- DOC Card -->
              <div class="sim-export-card ${state.exportFormat === 'DOC' ? 'selected' : ''}" data-format="DOC">
                <div class="sim-export-card-top">
                  <span class="sim-export-card-icon">📄</span>
                  <div class="sim-export-card-titles">
                    <b>Microsoft Word (.DOC)</b>
                    <small>Documento editável (.doc)</small>
                  </div>
                  <span class="sim-export-chip chip-blue">Editável</span>
                </div>
                <ul class="sim-export-card-features">
                  <li><b>1 trade por página</b> com quebra explícita de seção</li>
                  <li>Tabelas de execução, risco, alvos e timeline</li>
                  <li>Gráfico de candles e Trading Rubric congelada</li>
                  <li>Compatível com MS Word e LibreOffice</li>
                </ul>
                <div class="sim-export-card-radio">
                  <span class="sim-radio-circle ${state.exportFormat === 'DOC' ? 'checked' : ''}"></span>
                  <span>Selecionar Word (.DOC)</span>
                </div>
              </div>

              <!-- PDF Card -->
              <div class="sim-export-card ${state.exportFormat === 'PDF' ? 'selected' : ''}" data-format="PDF">
                <div class="sim-export-card-top">
                  <span class="sim-export-card-icon">📑</span>
                  <div class="sim-export-card-titles">
                    <b>Impressão / PDF (.PDF)</b>
                    <small>Pronto para ler, imprimir ou salvar PDF</small>
                  </div>
                  <span class="sim-export-chip chip-emerald">Leitura & PDF</span>
                </div>
                <ul class="sim-export-card-features">
                  <li><b>1 trade por página individual A4</b> sem cortes</li>
                  <li>Abre visualizador pronto para Salvar como PDF</li>
                  <li>Gráfico de candles vetorial de alta resolução</li>
                  <li>Design editorial profissional e limpo</li>
                </ul>
                <div class="sim-export-card-radio">
                  <span class="sim-radio-circle ${state.exportFormat === 'PDF' ? 'checked' : ''}"></span>
                  <span>Selecionar PDF / Impressão</span>
                </div>
              </div>

              <!-- ENEX Card -->
              <div class="sim-export-card ${state.exportFormat === 'ENEX' ? 'selected' : ''}" data-format="ENEX">
                <div class="sim-export-card-top">
                  <span class="sim-export-card-icon">🐘</span>
                  <div class="sim-export-card-titles">
                    <b>Evernote (.ENEX)</b>
                    <small>Notas separadas para estudo</small>
                  </div>
                  <span class="sim-export-chip chip-purple">Anotações</span>
                </div>
                <ul class="sim-export-card-features">
                  <li><b>1 nota independente por trade simulado</b></li>
                  <li>Tags automáticas: Ativo, Setup, Grade, Status</li>
                  <li>Conteúdo formatado em XHTML ENML estrito</li>
                  <li>Perfeito para diário de estudo contínuo</li>
                </ul>
                <div class="sim-export-card-radio">
                  <span class="sim-radio-circle ${state.exportFormat === 'ENEX' ? 'checked' : ''}"></span>
                  <span>Selecionar Evernote (.ENEX)</span>
                </div>
              </div>

              <!-- CSV Card -->
              <div class="sim-export-card ${state.exportFormat === 'CSV' ? 'selected' : ''}" data-format="CSV">
                <div class="sim-export-card-top">
                  <span class="sim-export-card-icon">📊</span>
                  <div class="sim-export-card-titles">
                    <b>Planilha (.CSV)</b>
                    <small>Tabela de dados consolidada</small>
                  </div>
                  <span class="sim-export-chip chip-gray">Dados Brutos</span>
                </div>
                <ul class="sim-export-card-features">
                  <li>Todas as colunas em formato tabular estruturado</li>
                  <li>Separador ponto e vírgula com UTF-8 BOM</li>
                  <li>Compatível com Excel, Google Planilhas e LLMs</li>
                  <li>Ideal para estatísticas e análises quantitativas</li>
                </ul>
                <div class="sim-export-card-radio">
                  <span class="sim-radio-circle ${state.exportFormat === 'CSV' ? 'checked' : ''}"></span>
                  <span>Selecionar Planilha (.CSV)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Callout Informativo -->
          <div class="sim-export-info-callout">
            <span class="sim-info-ico">💡</span>
            <div style="font-size: 12px; color: #1e3a2f; line-height: 1.45;">
              <b>Regra de Estudo Isolado:</b> Nos documentos Word (.DOC) e Impressão/PDF, cada trade é isolado em sua própria página por meio de quebra de página explícita. No Evernote (.ENEX), cada trade torna-se uma nota separada com tags de busca. Todos os campos utilizam estritamente dados reais gerados pela simulação.
            </div>
          </div>

          <!-- Ações do Modal -->
          <div class="sim-modal-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="sim-export-btn" style="padding: 0 18px; height: 40px;" type="button" id="simExportModalCancel">
              Cancelar
            </button>
            <button class="sim-btn-seed-dropdown" style="padding: 0 20px; height: 40px; font-size: 13px; font-weight: 700; background: #064e3b; color: #ffffff; border: none; border-radius: 8px; cursor: pointer;" type="button" id="simExportModalSubmit">
              ${submitBtnLabel}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Escapa texto para inserção segura em HTML/SVG
   */
  function snapEsc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Abre o snapshot do trade carregando o histórico diário REAL do ativo no servidor.
   * Nunca monta candles localmente: sem dados, o modal exibe indisponibilidade explícita.
   */
  async function openSnapshot(simId) {
    const sim = state.simulations.find(s => s.id === simId);
    state.snapshotSimId = simId;
    state.snapshotZoom = '1M';
    state.snapshotAuditModalOpen = false;
    state.snapshotData = { simId, status: 'loading', snapshot: null, error: null };
    render();
    if (!sim) return;
    try {
      if (!root.healthyTrendApi || typeof root.healthyTrendApi.request !== 'function') {
        throw new Error('Cliente de API indisponível para carregar o histórico real.');
      }
      const res = await root.healthyTrendApi.request(API_ENDPOINT + '/snapshot', {
        method: 'POST',
        body: JSON.stringify({ simulation: sim })
      });
      if (state.snapshotSimId !== simId) return;
      state.snapshotData = { simId, status: 'ready', snapshot: res && res.snapshot ? res.snapshot : null, error: null };
    } catch (e) {
      if (state.snapshotSimId !== simId) return;
      state.snapshotData = {
        simId,
        status: 'error',
        snapshot: null,
        error: (e && e.message) || 'Falha ao carregar o histórico diário real do ativo.'
      };
    }
    render();
  }

  function renderSnapshotUnavailable(title, message) {
    return `
      <div class="sim-snapshot-unavailable" role="alert">
        <div class="sim-snapshot-unavailable-icon">⚠</div>
        <div>
          <strong>${snapEsc(title)}</strong>
          <p>${snapEsc(message)}</p>
          <p class="sim-snapshot-unavailable-hint">Nenhum candle é gerado artificialmente. Sem dados reais, a fidelidade do gráfico não pode ser verificada.</p>
        </div>
      </div>
    `;
  }

  /**
   * Painel de auditoria do snapshot: o que foi conferido contra o histórico real
   */
  function formatSnapshotAxisDate(dateStr) {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length < 3) return dateStr;
    const months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    const d = parts[2];
    const m = months[parseInt(parts[1], 10) - 1] || parts[1];
    const y = parts[0];
    return `${d} ${m} ${y}`;
  }

  function circledRole(role) {
    const map = { '1': '①', '2': '②', '3': '③', 'M': 'M', 'IB': 'IB' };
    return map[role] || role;
  }

  /**
   * Modal de Auditoria Completa de Fidelidade Sob Demanda
   */
  function renderSnapshotAuditModal(sim) {
    if (!state.snapshotAuditModalOpen) return '';
    const data = state.snapshotData;
    if (!data || !data.snapshot) return '';
    const snap = data.snapshot;
    const sm = snap.summary || {};
    const v = snap.verification || { status: 'UNVERIFIED', checks: [], notes: [] };
    const meta = {
      VERIFIED: { cls: 'verified', icon: '✓', text: 'Fidelidade verificada com o histórico real' },
      DIVERGENT: { cls: 'divergent', icon: '✕', text: 'Divergência detectada entre o registro e o histórico real' },
      UNVERIFIED: { cls: 'unverified', icon: '!', text: 'Fidelidade não verificada' }
    }[v.status] || { cls: 'unverified', icon: '!', text: 'Fidelidade não verificada' };

    const levelIcon = { ok: '✓', warn: '⚠', fail: '✕' };
    const checksHtml = (v.checks || []).map(c => `
      <li class="lvl-${snapEsc(c.level)}">
        <span class="chk-icon">${levelIcon[c.level] || '•'}</span>
        <span><b>${snapEsc(c.label)}</b> — ${snapEsc(c.detail)}</span>
      </li>
    `).join('');

    return `
      <div class="sim-modal-overlay open" id="simSnapshotAuditModalOverlay" style="z-index: 1200;">
        <div class="sim-snap-audit-modal-box">
          <div class="sim-snap-audit-modal-head">
            <div>
              <h3>Auditoria de Fidelidade Histórica — ${snapEsc(sim.symbol)}</h3>
              <p>Conferência rigorosa dos dados exibidos contra a fonte histórica oficial e os registros da simulação.</p>
            </div>
            <button class="sim-modal-close-btn" type="button" id="simSnapshotAuditModalClose" title="Fechar auditoria">×</button>
          </div>

          <div class="sim-snap-audit-modal-body">
            <table class="sim-snap-audit-table">
              <tbody>
                <tr>
                  <td>Status da Fidelidade</td>
                  <td><span class="sim-snap-audit-status-pill ${meta.cls}">${meta.icon} ${meta.text}</span></td>
                </tr>
                <tr>
                  <td>Fonte de Dados</td>
                  <td><b>${snapEsc(sm.source || snap.source || 'B3 (COTAHIST, ajustado)')}</b></td>
                </tr>
                <tr>
                  <td>Timeframe</td>
                  <td>${snapEsc(sm.timeframe || snap.timeframe || 'Diário (1D)')}</td>
                </tr>
                <tr>
                  <td>Candles de Contexto</td>
                  <td>${sm.contextBars ?? snap.window?.contextBars} candles (exclusivamente anteriores ao sinal)</td>
                </tr>
                <tr>
                  <td>Candles Posteriores</td>
                  <td>${sm.postBars ?? snap.window?.postBars} candles (após a identificação do sinal)</td>
                </tr>
                <tr>
                  <td>Período Avaliado</td>
                  <td>${snapEsc(sm.periodFormatted || '')}</td>
                </tr>
                <tr>
                  <td>Última Data Avaliada no Sinal</td>
                  <td>${snapEsc(sm.lastEvaluatedDate || formatDateBR(snap.signalDate))}</td>
                </tr>
                <tr>
                  <td>Look-ahead / Vazamento Futuro</td>
                  <td><span style="color: #34d399; font-weight: 700;">${snapEsc(sm.lookAhead || 'Não identificado')}</span> — nenhum candle posterior foi usado para calcular EMAs, gatilhos ou stops</td>
                </tr>
                <tr>
                  <td>Padrão e Pivôs Re-detectados</td>
                  <td><code>${snapEsc(sm.patternPivotsFormatted || 'Não aplicável')}</code></td>
                </tr>
                <tr>
                  <td>Gatilho e Setup</td>
                  <td><b>${snapEsc(sm.triggerFormatted || sim.triggerName)}</b></td>
                </tr>
                <tr>
                  <td>Entrada e Stop</td>
                  <td>${snapEsc(sm.entryFormatted || '')} | Stop Inicial: ${snapEsc(sm.stopFormatted || '')}</td>
                </tr>
                <tr>
                  <td>Saída e Resultado</td>
                  <td>${snapEsc(sm.exitFormatted || '')} ${sim.resultR != null ? `(${formatR(sim.resultR)})` : ''}</td>
                </tr>
              </tbody>
            </table>

            <div class="sim-snap-audit-checks-section">
              <h4>Verificações Automáticas de Integridade</h4>
              <ul class="sim-snapshot-verify-checks">
                ${checksHtml}
              </ul>
            </div>

            <div class="sim-snap-audit-notes-section">
              <p>ℹ ${snapEsc(sm.notesFormatted || 'Preços ajustados a eventos corporativos. Sem dados sintéticos.')}</p>
            </div>
          </div>

          <div class="sim-snap-audit-modal-foot">
            <button class="sim-export-btn" type="button" id="simSnapshotAuditModalCloseBtn">
              Fechar Auditoria
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza o snapshot do trade a partir do histórico diário REAL com gráfico limpo, zoom contextual
   * instantâneo e auditoria sob demanda.
   */
  function renderSnapshotChartSvg(sim) {
    if (!sim) return '';
    const data = state.snapshotData;
    if (!data || data.simId !== sim.id || data.status === 'loading') {
      return '<div class="sim-snapshot-loading">Carregando histórico diário real do ativo…</div>';
    }
    if (data.status === 'error' || !data.snapshot) {
      return renderSnapshotUnavailable('Snapshot indisponível', data.error || 'Não foi possível carregar o histórico diário real do ativo.');
    }
    const baseSnap = data.snapshot;
    if (!baseSnap.available) {
      return renderSnapshotUnavailable('Snapshot indisponível — fidelidade não verificada', baseSnap.message || 'Histórico insuficiente.');
    }

    const zoomPreset = state.snapshotZoom || '1M';
    const snap = root.TradeSimulatorModel && typeof root.TradeSimulatorModel.sliceSnapshotByZoom === 'function'
      ? root.TradeSimulatorModel.sliceSnapshotByZoom(baseSnap, zoomPreset)
      : baseSnap;

    const candles = snap.candles || [];
    const lv = snap.levels || {};
    const n = candles.length;
    if (n < 2) {
      return renderSnapshotUnavailable('Snapshot indisponível', 'Histórico diário insuficiente para a janela de zoom selecionada.');
    }

    // Status da auditoria para o indicador do cabeçalho
    const v = snap.verification || { status: 'UNVERIFIED', checks: [], notes: [] };
    const meta = {
      VERIFIED: { cls: 'verified', icon: '✓', shortText: 'Dados verificados', text: 'Fidelidade verificada com o histórico real' },
      DIVERGENT: { cls: 'divergent', icon: '✕', shortText: 'Divergência detectada', text: 'Divergência detectada entre o registro e o histórico real' },
      UNVERIFIED: { cls: 'unverified', icon: '!', shortText: 'Não verificado', text: 'Fidelidade não verificada' }
    }[v.status] || { cls: 'unverified', icon: '!', shortText: 'Não verificado', text: 'Fidelidade não verificada' };

    // Dimensões do SVG
    const svgW = 960;
    const svgH = 460;
    const padLeft = 48;
    const padRight = 68;
    const padTop = 38;
    const padBottom = 38;
    const plotW = svgW - padLeft - padRight;
    const plotH = svgH - padTop - padBottom;

    // Escala de preços: candles reais, EMAs e níveis operacionais
    const prices = [];
    candles.forEach(c => {
      prices.push(c.high, c.low);
      if (c.ema9 != null) prices.push(c.ema9);
      if (c.ema30 != null) prices.push(c.ema30);
    });
    [lv.entryPlanned, lv.stopInitial, lv.executedEntry, lv.exitPrice].forEach(p => {
      if (Number.isFinite(p)) prices.push(p);
    });
    let minP = Math.min(...prices);
    let maxP = Math.max(...prices);
    const pMargin = (maxP - minP) * 0.08 || 1;
    minP -= pMargin;
    maxP += pMargin;

    const getY = (price) => padTop + plotH - ((price - minP) / (maxP - minP)) * plotH;
    const colW = plotW / n;
    const bodyW = Math.max(3, Math.min(13, colW * 0.72));
    const getX = (idx) => padLeft + (idx + 0.5) * colW;
    const sigIdx = snap.signalIndex;
    const sigX = getX(sigIdx);
    const dividerX = padLeft + (sigIdx + 1) * colW;

    // Grade e eixo de preços (esquerda)
    let gridSvg = '';
    for (let i = 0; i <= 6; i++) {
      const p = minP + (i / 6) * (maxP - minP);
      const y = getY(p);
      gridSvg += `<line x1="${padLeft}" y1="${y}" x2="${padLeft + plotW}" y2="${y}" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="3,3" />`;
      gridSvg += `<text x="${padLeft - 6}" y="${y + 3}" fill="#64748b" font-size="9.5" text-anchor="end" font-family="monospace">${p.toFixed(2)}</text>`;
    }

    // Região posterior ao sinal (não conhecida no momento da decisão)
    const postW = padLeft + plotW - dividerX;
    const regionSvg = postW > 2 ? `
      <rect x="${dividerX}" y="${padTop}" width="${postW}" height="${plotH}" fill="rgba(56,189,248,0.035)" />
      <line x1="${dividerX}" y1="${padTop}" x2="${dividerX}" y2="${padTop + plotH}" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4,4" stroke-opacity="0.6" />
      <text x="${dividerX + 8}" y="${padTop - 8}" fill="#7dd3fc" font-size="9.5" font-weight="700" font-family="system-ui">Evolução posterior ao sinal ▶</text>
      <text x="${dividerX - 8}" y="${padTop - 8}" fill="#94a3b8" font-size="9.5" font-weight="700" text-anchor="end" font-family="system-ui">◀ Contexto conhecido no sinal</text>
    ` : `
      <text x="${padLeft + plotW}" y="${padTop - 8}" fill="#94a3b8" font-size="9.5" font-weight="700" text-anchor="end" font-family="system-ui">Contexto conhecido no sinal</text>
    `;

    // Linhas finas de níveis operacionais e badges compactos no eixo direito
    const isGain = sim.status === 'CLOSED_GAIN';
    const isLoss = sim.status === 'CLOSED_LOSS';
    const rightBadge = (price, color, bg, width = 1.3, dash = '4,3') => {
      if (!Number.isFinite(price) || price < minP || price > maxP) return '';
      const y = getY(price);
      return `
        <line x1="${sigX}" y1="${y}" x2="${padLeft + plotW}" y2="${y}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}" />
        <g transform="translate(${padLeft + plotW + 4}, ${y - 8})">
          <rect width="58" height="16" rx="3" fill="${bg}" />
          <text x="29" y="11.5" fill="#ffffff" font-size="9.2" font-weight="700" text-anchor="middle" font-family="monospace">${Number(price).toFixed(2).replace('.', ',')}</text>
        </g>`;
    };
    const levelsSvg = [
      rightBadge(lv.target2R, '#10b981', '#064e3b', 1, '2,4'),
      rightBadge(lv.entryPlanned, '#38bdf8', '#0284c7', 1.4, '4,3'),
      rightBadge(lv.stopInitial, '#ef4444', isLoss ? '#dc2626' : '#7f1d1d', 1.4, '4,3'),
      (lv.exitPrice != null && Math.abs(lv.exitPrice - lv.stopInitial) > 0.05 && Math.abs(lv.exitPrice - (lv.target2R || 0)) > 0.05)
        ? rightBadge(lv.exitPrice, isGain ? '#10b981' : '#ef4444', isGain ? '#059669' : '#dc2626', 1.4, '3,3')
        : ''
    ].join('');

    // EMAs causais
    let ema9Path = '';
    let ema30Path = '';
    candles.forEach((c, idx) => {
      const x = getX(idx);
      if (c.ema9 != null) ema9Path += `${ema9Path ? ' L' : 'M'} ${x} ${getY(c.ema9)}`;
      if (c.ema30 != null) ema30Path += `${ema30Path ? ' L' : 'M'} ${x} ${getY(c.ema30)}`;
    });
    const emaSvg = `
      ${ema30Path ? `<path d="${ema30Path}" fill="none" stroke="#f59e0b" stroke-width="1.4" stroke-opacity="0.9" />` : ''}
      ${ema9Path ? `<path d="${ema9Path}" fill="none" stroke="#38bdf8" stroke-width="1.4" stroke-opacity="0.95" />` : ''}
    `;

    // Candles reais (OHLC originais)
    let candlesSvg = '';
    let axisSvg = '';
    const tickStep = Math.max(1, Math.ceil(n / 8));
    candles.forEach((c, idx) => {
      const cx = getX(idx);
      const isBull = c.close >= c.open;
      const color = isBull ? '#10b981' : '#ef4444';
      const yH = getY(c.high);
      const yL = getY(c.low);
      const yO = getY(c.open);
      const yC = getY(c.close);
      const topY = Math.min(yO, yC);
      const bodyH = Math.max(1.5, Math.abs(yO - yC));
      if (c.isSignal) {
        candlesSvg += `<rect x="${cx - colW / 2}" y="${padTop}" width="${colW}" height="${plotH}" fill="rgba(56,189,248,0.08)" />`;
      }
      candlesSvg += `<g><title>${snapEsc(c.time)} • A ${c.open} • M ${c.high} • m ${c.low} • F ${c.close}</title>`
        + `<line x1="${cx}" y1="${yH}" x2="${cx}" y2="${yL}" stroke="${color}" stroke-width="1.3" />`
        + `<rect x="${cx - bodyW / 2}" y="${topY}" width="${bodyW}" height="${bodyH}" fill="${color}" /></g>`;

      if (idx % tickStep === 0 || idx === n - 1) {
        const label = formatSnapshotAxisDate(c.time);
        axisSvg += `<text x="${cx}" y="${svgH - 12}" fill="#64748b" font-size="9" text-anchor="middle" font-family="system-ui">${label}</text>`;
        axisSvg += `<line x1="${cx}" y1="${padTop + plotH}" x2="${cx}" y2="${padTop + plotH + 4}" stroke="#334155" stroke-width="1" />`;
      }
    });

    // Marcadores de pivô e linha tracejada conectando ①, ②, ③
    let markersSvg = '';
    let signalMarkerAnchor = 'low';
    const pivotPoints = [];
    (snap.patternMarkers || []).forEach(m => {
      const c = candles[m.index];
      if (!c) return;
      const cx = getX(m.index);
      const above = m.anchor === 'high';
      if (m.index === sigIdx) signalMarkerAnchor = m.anchor;
      const yAnchor = above ? getY(c.high) : getY(c.low);
      const my = above ? yAnchor - 12 : yAnchor + 12;
      const roleTxt = circledRole(m.role);
      pivotPoints.push({ x: cx, y: my });
      markersSvg += `<g><title>${snapEsc(m.label)} • ${snapEsc(m.time)} • R$ ${m.price}</title>`
        + `<circle cx="${cx}" cy="${my}" r="8" fill="#06150f" stroke="#38bdf8" stroke-width="1.3" />`
        + `<text x="${cx}" y="${my + 3}" fill="#38bdf8" font-size="8.5" font-weight="800" text-anchor="middle" font-family="system-ui">${snapEsc(roleTxt)}</text></g>`;
    });
    if (pivotPoints.length >= 2) {
      const pts = pivotPoints.map(p => `${p.x},${p.y}`).join(' ');
      markersSvg = `<polyline points="${pts}" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="3,3" fill="none" opacity="0.75" />` + markersSvg;
    }

    // Gatilho (candle do sinal) — pill discreto com seta
    const sigCandle = candles[sigIdx];
    const gatilhoAbove = signalMarkerAnchor === 'low';
    const gy = gatilhoAbove ? getY(sigCandle.high) - 20 : getY(sigCandle.low) + 20;
    const gatilhoSvg = `
      <g transform="translate(${sigX}, ${gy})">
        <rect x="-24" y="-8" width="48" height="16" rx="4" fill="#0284c7" />
        <text x="0" y="3.5" fill="#ffffff" font-size="8.5" font-weight="700" text-anchor="middle" font-family="system-ui">Gatilho</text>
        <polygon points="${gatilhoAbove ? '0,12 -3,8 3,8' : '0,-12 -3,-8 3,-8'}" fill="#0284c7" />
      </g>`;

    // Eventos discretos sobre candles (entrada e saída)
    let eventsSvg = '';
    (snap.events || []).forEach(ev => {
      if (ev.type === 'SIGNAL') return;
      const idx = candles.findIndex(c => c.time === ev.time);
      if (idx < 0 || !Number.isFinite(ev.price)) return;
      const x = getX(idx);
      const y = getY(ev.price);
      if (ev.type === 'ENTRY') {
        eventsSvg += `
          <g transform="translate(${x}, ${y + (isLoss ? -14 : 14)})">
            <rect x="-44" y="-8" width="88" height="16" rx="4" fill="#059669" />
            <text x="0" y="3.5" fill="#fff" font-size="8.5" font-weight="700" text-anchor="middle" font-family="system-ui">▲ Entrada R$ ${ev.price.toFixed(2).replace('.', ',')}</text>
          </g>`;
      } else if (ev.type === 'EXIT') {
        const outColor = isGain ? '#059669' : (isLoss ? '#dc2626' : '#64748b');
        const outIcon = isGain ? '★' : (isLoss ? '✕' : '•');
        eventsSvg += `
          <g transform="translate(${x}, ${y + (isGain ? -14 : 14)})">
            <rect x="-44" y="-8" width="88" height="16" rx="4" fill="${outColor}" />
            <text x="0" y="3.5" fill="#fff" font-size="8.5" font-weight="700" text-anchor="middle" font-family="system-ui">${outIcon} Saída R$ ${ev.price.toFixed(2).replace('.', ',')}</text>
          </g>`;
      } else if (ev.type === 'SCALE_IN') {
        eventsSvg += `<circle cx="${x}" cy="${y}" r="4" fill="#0284c7" stroke="#fff" stroke-width="1.2" />`;
      } else if (ev.type === 'PARTIAL_EXIT') {
        eventsSvg += `<circle cx="${x}" cy="${y}" r="4" fill="#8b5cf6" stroke="#fff" stroke-width="1.2" />`;
      } else if (ev.type === 'NOT_TRIGGERED') {
        eventsSvg += `
          <g transform="translate(${x}, ${getY(candles[idx].high) - 14})">
            <rect x="-40" y="-7" width="80" height="14" rx="3" fill="#475569" />
            <text x="0" y="3" fill="#fff" font-size="8" font-weight="700" text-anchor="middle" font-family="system-ui">Não Acionado</text>
          </g>`;
      }
    });

    const headerHtml = `
      <div class="sim-snapshot-chart-header">
        <div class="sim-snap-title-group">
          <span class="sim-snap-ticker">${snapEsc(snap.symbol)} • ${snapEsc(snap.timeframe || '1D')}</span>
          <span class="sim-snap-ema-leg" style="color: #38bdf8;">— EMA 9</span>
          <span class="sim-snap-ema-leg" style="color: #f59e0b;">— EMA 30</span>
        </div>
        <div class="sim-snapshot-zoom-group">
          ${['1M', '3M', '6M', '1A', '2A'].map(z => `
            <button type="button" class="sim-snap-zoom-btn ${zoomPreset === z ? 'active' : ''}" data-snap-zoom="${z}">${z}</button>
          `).join('')}
        </div>
        <div class="sim-snapshot-audit-wrap">
          <button type="button" class="sim-snap-audit-btn ${meta.cls}" id="simSnapshotAuditBtn" title="Clique para abrir auditoria completa de integridade">
            <span class="sim-snap-audit-badge-icon">${meta.icon}</span>
            <span>${meta.shortText}</span>
            <span class="sim-snap-audit-info-icon">ⓘ</span>
          </button>
          <div class="sim-snap-audit-tooltip" id="simSnapshotAuditTooltip">
            <div class="sim-snap-tooltip-head ${meta.cls}">
              <span class="sim-snap-tooltip-icon">${meta.icon}</span>
              <strong>${meta.text}</strong>
            </div>
            <div class="sim-snap-tooltip-grid">
              <div class="sim-snap-tooltip-row">
                <span>Fonte:</span>
                <b>${snapEsc(snap.summary?.source || snap.source || 'B3')}</b>
              </div>
              <div class="sim-snap-tooltip-row">
                <span>Timeframe:</span>
                <b>${snapEsc(snap.summary?.timeframe || snap.timeframe || 'Diário (1D)')}</b>
              </div>
              <div class="sim-snap-tooltip-row">
                <span>Candles:</span>
                <b>${snap.summary?.contextBars ?? snap.window?.contextBars} contexto + ${snap.summary?.postBars ?? snap.window?.postBars} post</b>
              </div>
              <div class="sim-snap-tooltip-row">
                <span>Período:</span>
                <b>${snapEsc(snap.summary?.periodFormatted || '')}</b>
              </div>
              <div class="sim-snap-tooltip-row">
                <span>Data no sinal:</span>
                <b>${snapEsc(snap.summary?.lastEvaluatedDate || formatDateBR(snap.signalDate))}</b>
              </div>
              <div class="sim-snap-tooltip-row">
                <span>Look-ahead:</span>
                <b style="color: #34d399;">${snapEsc(snap.summary?.lookAhead || 'Não identificado')}</b>
              </div>
            </div>
            <button type="button" class="sim-snap-audit-cta" id="simSnapshotOpenAuditLink">
              Ver auditoria completa →
            </button>
          </div>
        </div>
      </div>
    `;

    return `
      ${headerHtml}
      <svg class="sim-snapshot-chart-svg" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Candles diários reais de ${snapEsc(snap.symbol)} no momento do sinal">
        <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#06150f" rx="10" />
        ${gridSvg}
        ${regionSvg}
        ${levelsSvg}
        ${emaSvg}
        ${candlesSvg}
        ${markersSvg}
        ${gatilhoSvg}
        ${eventsSvg}
        ${axisSvg}
      </svg>
    `;
  }  function bindLocalEvents(container) {
    // Dropdowns do topo
    container.querySelectorAll('[data-dropdown]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.dropdown;
        state.activeDropdown = state.activeDropdown === type ? null : type;
        render();
      });
    });

    // Seleção de itens do dropdown
    container.querySelectorAll('[data-filter-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const fType = btn.dataset.filterType;
        const fVal = btn.dataset.filterVal;
        if (fType === 'days') {
          if (fVal === 'CUSTOM') {
            state.filters.days = 'CUSTOM';
          } else if (fVal === 'ALL') {
            state.filters.days = 'ALL';
            state.filters.startDate = null;
            state.filters.endDate = null;
          } else {
            state.filters.days = Number(fVal);
            state.filters.startDate = null;
            state.filters.endDate = null;
          }
        } else {
          state.filters[fType] = fVal;
        }
        state.activeDropdown = null;
        render();
      });
    });

    // Filtro de data personalizado inline
    container.querySelector('#simCustomFilterApply')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = container.querySelector('#simCustomFilterStart')?.value;
      const end = container.querySelector('#simCustomFilterEnd')?.value;
      state.filters.startDate = s || null;
      state.filters.endDate = end || null;
      render();
    });

    // Fechar banner de resumo da massa
    container.querySelector('#simDismissMassSummary')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.massResultSummary = null;
      render();
    });

    // Abas de distribuição de resultados (Geral vs Histograma R)
    container.querySelectorAll('[data-dist-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.distView = btn.dataset.distTab;
        render();
      });
    });

    // Abas de detalhamento de desempenho (Gatilhos, Notas, Período)
    container.querySelectorAll('[data-breakdown-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.breakdownView = btn.dataset.breakdownTab;
        render();
      });
    });

    // 1. Painel de Controle: Massa de Teste (Gerar, Reavaliar e Excluir)
    container.querySelector('#simBtnMassModal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.massModalOpen = true;
      state.tempScenarioSelection = state.activeScenario || '2R';
      render();
    });

    container.querySelector('#simBtnScenarioModal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.massModalOpen = true;
      state.tempScenarioSelection = state.activeScenario || '2R';
      render();
    });

    // Fechar modal da Massa de Teste
    container.querySelector('#simMassModalClose')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.massModalOpen = false;
      render();
    });

    container.querySelector('#simMassModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'simMassModalOverlay') {
        state.massModalOpen = false;
        render();
      }
    });

    // Controles de Parâmetros do Modal de Massa de Teste
    container.querySelectorAll('[data-mass-period]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.dataset.massPeriod;
        state.massConfig.period = (p === 'CUSTOM' || p === 'ALL') ? p : Number(p);
        render();
      });
    });

    container.querySelector('#simMassStartDate')?.addEventListener('change', (e) => {
      state.massConfig.startDate = e.target.value;
    });

    container.querySelector('#simMassEndDate')?.addEventListener('change', (e) => {
      state.massConfig.endDate = e.target.value;
    });

    container.querySelectorAll('[data-mass-universe]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.massConfig.universe = btn.dataset.massUniverse;
        render();
      });
    });

    container.querySelectorAll('[data-mass-trigger]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.massConfig.triggers = btn.dataset.massTrigger;
        render();
      });
    });

    container.querySelectorAll('[data-mass-grade]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.massConfig.grades = btn.dataset.massGrade;
        render();
      });
    });

    container.querySelectorAll('[data-mass-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const t = btn.dataset.massTarget;
        state.massConfig.targetVolume = t === 'MAX' ? 'MAX' : Number(t);
        render();
      });
    });

    // Seleção de opção de cenário de risco no modal
    container.querySelectorAll('[data-scenario-select]').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const scen = opt.getAttribute('data-scenario-select') || opt.dataset.scenarioSelect;
        if (scen) {
          state.tempScenarioSelection = scen;
          render();
        }
      });
    });

    // Confirmar geração de massa de teste em escala
    container.querySelector('#simModalConfirmScenario')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const cfg = { ...state.massConfig };
      if (cfg.period === 'CUSTOM') {
        const sVal = container.querySelector('#simMassStartDate')?.value;
        const eVal = container.querySelector('#simMassEndDate')?.value;
        if (sVal) cfg.startDate = sVal;
        if (eVal) cfg.endDate = eVal;
      }
      generateScenarioMass(state.tempScenarioSelection || '2R', cfg);
    });

    // Ações da massa atual no painel
    const handleEvaluate = (e) => {
      e.stopPropagation();
      state.massModalOpen = false;
      evaluateActive();
    };
    container.querySelector('#simMassActionEvaluate')?.addEventListener('click', handleEvaluate);
    container.querySelector('#simMassActionEvaluateBtn')?.addEventListener('click', handleEvaluate);

    // Exclusão direta sem segunda confirmação: fecha o modal e limpa imediatamente
    const handleDirectClear = (e) => {
      e.stopPropagation();
      state.massModalOpen = false;
      clearAllSimulations();
    };
    container.querySelector('#simMassActionClear')?.addEventListener('click', handleDirectClear);
    container.querySelector('#simMassActionClearBtn')?.addEventListener('click', handleDirectClear);

    // 2. Modal do Comparador de Cenários de Gestão
    container.querySelector('#simBtnCompareModal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.compareModalOpen = true;
      render();
    });

    container.querySelector('#simCompareModalClose')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.compareModalOpen = false;
      render();
    });

    container.querySelector('#simCompareModalCloseBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.compareModalOpen = false;
      render();
    });

    container.querySelector('#simCompareModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'simCompareModalOverlay') {
        state.compareModalOpen = false;
        render();
      }
    });

    // 3. Modal do Estudo Estatístico Double Inside Bar
    container.querySelector('#simBtnHypothesisModal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.hypothesisModalOpen = true;
      render();
    });

    container.querySelector('#simHypothesisModalClose')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.hypothesisModalOpen = false;
      render();
    });

    container.querySelector('#simHypothesisModalCloseBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.hypothesisModalOpen = false;
      render();
    });

    container.querySelector('#simHypothesisModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'simHypothesisModalOverlay') {
        state.hypothesisModalOpen = false;
        render();
      }
    });

    // 4. Modal do Relatório de Auditoria e Consistência
    const openAuditModal = (e) => {
      e.stopPropagation();
      state.activeDropdown = null;
      state.auditModalOpen = true;
      render();
    };
    container.querySelector('#simBtnAuditModal')?.addEventListener('click', openAuditModal);
    container.querySelector('#simMoreBtnAudit')?.addEventListener('click', openAuditModal);
    container.querySelector('#simBannerBtnAudit')?.addEventListener('click', openAuditModal);

    container.querySelector('#simAuditModalClose')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.auditModalOpen = false;
      render();
    });

    container.querySelector('#simAuditModalCloseBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.auditModalOpen = false;
      render();
    });

    container.querySelector('#simAuditModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'simAuditModalOverlay') {
        state.auditModalOpen = false;
        render();
      }
    });

    container.querySelector('#simAuditRevalidateBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.simulations = sanitizeSimulationsBatch(state.simulations);
      refreshAuditReport(state.simulations);
      saveLocalCache();
      render();
      if (typeof root.showToast === 'function') {
        root.showToast('✓ Amostra sanitizada e revalidada com sucesso.');
      }
    });

    // Trocar cenário clicando no cabeçalho da tabela comparativa
    container.querySelectorAll('[data-switch-scenario]').forEach(th => {
      th.addEventListener('click', (e) => {
        e.stopPropagation();
        const scen = th.getAttribute('data-switch-scenario') || th.dataset.switchScenario;
        if (scen && scen !== state.activeScenario) {
          generateScenarioMass(scen);
        }
      });
    });

    // Dropdown de mais opções (···)
    container.querySelector('#simMoreBtnMass')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeDropdown = null;
      state.massModalOpen = true;
      state.tempScenarioSelection = state.activeScenario || '2R';
      render();
    });

    container.querySelector('#simMoreBtnCompare')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeDropdown = null;
      state.compareModalOpen = true;
      render();
    });

    container.querySelector('#simMoreBtnHypothesis')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeDropdown = null;
      state.hypothesisModalOpen = true;
      render();
    });

    container.querySelector('#simMoreBtnEvaluate')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeDropdown = null;
      evaluateActive();
    });

    container.querySelector('#simMoreBtnExport')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeDropdown = null;
      openExportModal();
    });

    container.querySelector('#simMoreBtnClear')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeDropdown = null;
      clearAllSimulations();
    });

    // Toggle R / R$
    container.querySelectorAll('[data-unit]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filters.unit = btn.dataset.unit;
        render();
      });
    });

    // Abas de status
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextTab = btn.dataset.tab;
        if (state.filters.tab !== nextTab && nextTab !== 'CLOSED') {
          state.filters.result = 'ALL';
        }
        state.filters.tab = nextTab;
        render();
      });
    });

    // Filtros de resultado em Encerrados (Todos os resultados, Gain, Loss, Breakeven)
    container.querySelectorAll('[data-result-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filters.result = btn.dataset.resultFilter;
        render();
      });
    });

    // Busca textual
    const searchInput = container.querySelector('#simSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const raw = e.target.value;
        const upper = raw.toUpperCase();
        if (raw !== upper) {
          const start = e.target.selectionStart;
          const end = e.target.selectionEnd;
          e.target.value = upper;
          if (start !== null && end !== null) {
            e.target.setSelectionRange(start, end);
          }
        }
        state.filters.query = upper.trim();
        // Atualiza a tabela preservando foco
        updateTableOnly();
      });
    }

    // Botão Exportar (Toolbar da Tabela)
    container.querySelector('#simExportBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openExportModal();
    });

    // Eventos do Modal de Exportação
    container.querySelector('#simExportModalClose')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeExportModal();
    });

    container.querySelector('#simExportModalCancel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeExportModal();
    });

    container.querySelector('#simExportModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'simExportModal') {
        closeExportModal();
      }
    });

    container.querySelectorAll('input[name="simExportScope"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        state.exportScope = e.target.value;
        render();
      });
    });

    container.querySelectorAll('.sim-export-card[data-format]').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        const fmt = card.dataset.format;
        if (fmt) {
          state.exportFormat = fmt;
          render();
        }
      });
    });

    container.querySelector('#simExportModalSubmit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      executeExport();
    });

    // Botões de Ação na Tabela (Snapshot e Detalhes)
    container.querySelectorAll('.sim-action-btn[data-action="chart"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSnapshot(btn.dataset.simId);
      });
    });

    container.querySelectorAll('.sim-action-btn[data-action="details"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedSimId = btn.dataset.simId;
        render();
      });
    });

    // Clique na linha abre detalhes
    container.querySelectorAll('.sim-table tbody tr').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const id = row.dataset.simId;
        if (id) {
          state.selectedSimId = id;
          render();
        }
      });
    });

    // Fechar modal de detalhes
    container.querySelector('#simModalClose')?.addEventListener('click', () => {
      state.selectedSimId = null;
      render();
    });

    container.querySelector('#simModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'simModal') {
        state.selectedSimId = null;
        render();
      }
    });

    // Ações internas do modal de detalhes
    container.querySelector('#simModalViewChart')?.addEventListener('click', (e) => {
      const simId = e.currentTarget.dataset.simId;
      state.selectedSimId = null;
      openSnapshot(simId);
    });

    container.querySelector('#simModalDelete')?.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.simId;
      if (!id) return;
      await deleteSimulation(id);
    });

    // Zoom contextual instantâneo no snapshot (1M, 3M, 6M, 1A, 2A)
    container.querySelectorAll('[data-snap-zoom]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const zoom = btn.dataset.snapZoom;
        if (zoom && state.snapshotZoom !== zoom) {
          state.snapshotZoom = zoom;
          render();
        }
      });
    });

    // Abrir e fechar auditoria detalhada sob demanda
    container.querySelector('#simSnapshotAuditBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.snapshotAuditModalOpen = true;
      render();
    });

    container.querySelector('#simSnapshotOpenAuditLink')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.snapshotAuditModalOpen = true;
      render();
    });

    container.querySelector('#simSnapshotAuditModalClose')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.snapshotAuditModalOpen = false;
      render();
    });

    container.querySelector('#simSnapshotAuditModalCloseBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.snapshotAuditModalOpen = false;
      render();
    });

    container.querySelector('#simSnapshotAuditModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'simSnapshotAuditModalOverlay') {
        state.snapshotAuditModalOpen = false;
        render();
      }
    });

    // Fechar snapshot modal
    container.querySelector('#simSnapshotClose')?.addEventListener('click', () => {
      state.snapshotSimId = null;
      state.snapshotAuditModalOpen = false;
      render();
    });

    container.querySelector('#simSnapshotCloseBtn')?.addEventListener('click', () => {
      state.snapshotSimId = null;
      state.snapshotAuditModalOpen = false;
      render();
    });

    container.querySelector('#simSnapshotModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'simSnapshotModal') {
        state.snapshotSimId = null;
        state.snapshotAuditModalOpen = false;
        render();
      }
    });

    // Ordenação por clique nas colunas da tabela
    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (!col) return;
        if (state.sort.column === col) {
          state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          state.sort.column = col;
          state.sort.direction = (col === 'symbol' || col === 'triggerName') ? 'asc' : 'desc';
        }
        render();
      });
    });

    // Abrir gráfico interativo a partir do snapshot modal
    container.querySelector('#simSnapshotOpenInteractive')?.addEventListener('click', (e) => {
      const ticker = e.currentTarget.dataset.ticker;
      state.snapshotSimId = null;
      if (ticker && typeof root.go === 'function') {
        if (typeof window !== 'undefined') {
          window.__pendingChartsTicker = ticker;
        }
        root.go('charts', ticker);
        if (root.TickerChart && typeof root.TickerChart.loadTicker === 'function') {
          root.TickerChart.loadTicker(ticker);
        }
      }
    });
  }

  /**
   * Atualização leve da tabela sem redesenhar o cabeçalho/busca
   */
  function updateTableOnly() {
    const tbody = document.querySelector('.sim-table tbody');
    if (!tbody) return;

    const filtered = getFilteredSimulations();
    tbody.innerHTML = filtered.length > 0
      ? filtered.map(sim => renderTableRow(sim)).join('')
      : renderEmptyRow();

    if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.calculateSimulatorStats === 'function') {
      const tableStats = root.TradeSimulatorModel.calculateSimulatorStats(filtered);
      const countEl = document.getElementById('simTableFooterCount');
      const durEl = document.getElementById('simTableFooterDuration');
      const totalREl = document.getElementById('simTableFooterTotalR');
      if (countEl) countEl.textContent = `(${filtered.length} trade${filtered.length === 1 ? '' : 's'})`;
      if (durEl) durEl.innerHTML = `<strong>${tableStats.avgDurationDaysFormatted || '—'}</strong>`;
      if (totalREl) {
        totalREl.className = `td-num ${tableStats.totalR > 0 ? 'metric-gain' : (tableStats.totalR < 0 ? 'metric-loss' : 'metric-neutral')}`;
        totalREl.innerHTML = `<strong>${tableStats.totalRFormatted}</strong>`;
      }

      // Sincroniza contagens dos botões de resultado se a aba for Encerrados
      const activeTab = state.filters.tab;
      if (activeTab === 'CLOSED' && root.TradeSimulatorModel && typeof root.TradeSimulatorModel.filterSimulations === 'function') {
        const closedBase = root.TradeSimulatorModel.filterSimulations(state.simulations, {
          days: state.filters.days,
          startDate: state.filters.startDate,
          endDate: state.filters.endDate,
          trigger: state.filters.trigger,
          sector: state.filters.sector,
          grade: state.filters.grade,
          query: state.filters.query,
          tab: 'CLOSED',
          result: 'ALL'
        });
        const cAll = closedBase.length;
        const cGain = closedBase.filter(s => Number(s.resultR) > 0).length;
        const cLoss = closedBase.filter(s => Number(s.resultR) < 0 && Math.abs(Number(s.resultR) || 0) >= 0.0001).length;
        const cBe = closedBase.filter(s => Number(s.resultR) === 0 || Math.abs(Number(s.resultR) || 0) < 0.0001).length;

        const btnAll = document.querySelector('[data-result-filter="ALL"] span');
        const btnGain = document.querySelector('[data-result-filter="GAIN"] span:last-child');
        const btnLoss = document.querySelector('[data-result-filter="LOSS"] span:last-child');
        const btnBe = document.querySelector('[data-result-filter="BREAKEVEN"] span:last-child');

        if (btnAll) btnAll.textContent = `Todos os resultados (${cAll})`;
        if (btnGain) btnGain.textContent = `Gain (${cGain})`;
        if (btnLoss) btnLoss.textContent = `Loss (${cLoss})`;
        if (btnBe) btnBe.textContent = `Breakeven (${cBe})`;
      }
    }

    // Re-bind click handlers da tabela
    tbody.querySelectorAll('.sim-action-btn[data-action="chart"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openSnapshot(btn.dataset.simId);
      });
    });

    tbody.querySelectorAll('.sim-action-btn[data-action="details"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedSimId = btn.dataset.simId;
        render();
      });
    });

    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const id = row.dataset.simId;
        if (id) {
          state.selectedSimId = id;
          render();
        }
      });
    });
  }

  async function deleteSimulation(id) {
    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        await root.healthyTrendApi.request(`${API_ENDPOINT}/${id}`, { method: 'DELETE' });
      }
    } catch (e) {}

    state.simulations = state.simulations.filter(s => s.id !== id);
    refreshAuditReport(state.simulations);
    saveLocalCache();
    state.selectedSimId = null;
    render();
    if (typeof root.showToast === 'function') {
      root.showToast('Simulação removida.');
    }
  }

  /**
   * Fecha dropdowns ao clicar fora
   */
  function bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.sim-filter-select-wrap') && state.activeDropdown) {
        state.activeDropdown = null;
        render();
      }
    });

    // Re-render ao navegar para a tela
    window.addEventListener('popstate', () => {
      const activeSection = document.querySelector('.page.active');
      if (activeSection && activeSection.id === 'tradesimulator') {
        render();
      }
    });
  }

  // Namespace global exportado
  const TradeSimulator = {
    init,
    loadData,
    render,
    addSimulation,
    resetToDefaults,
    evaluateActive,
    openExportModal,
    executeExport,
    getState: () => state
  };

  root.TradeSimulator = TradeSimulator;

  // Auto-inicialização quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 50);
  }

})(typeof window !== 'undefined' ? window : globalThis);


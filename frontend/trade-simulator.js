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
    activeScenario: '2R',
    massModalOpen: false,
    showClearConfirm: false,
    compareModalOpen: false,
    scenarioModalOpen: false,
    tempScenarioSelection: '2R',
    comparison: null,
    filters: {
      days: 120,
      trigger: 'ALL',
      sector: 'ALL',
      grade: 'ALL',
      tab: 'ALL',
      query: '',
      unit: 'R' // 'R' ou 'RS'
    },
    sort: {
      column: 'signalDate',
      direction: 'desc'
    },
    activeDropdown: null,
    selectedSimId: null,
    snapshotSimId: null
  };

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
          state.simulations = response.simulations.filter(s => s && s.triggerName !== 'Pullback');
          state.comparison = response.comparison || null;
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

    // Fallback: localStorage
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.simulations = parsed.filter(s => s && s.triggerName !== 'Pullback');
          if (state.simulations[0]?.managementScenario) {
            state.activeScenario = state.simulations[0].managementScenario;
            state.tempScenarioSelection = state.simulations[0].managementScenario;
          }
          if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.compareManagementScenarios === 'function') {
            state.comparison = root.TradeSimulatorModel.compareManagementScenarios(state.simulations.length === 42 ? null : state.simulations);
          }
          state.loading = false;
          return;
        }
      }
    } catch (e) {}

    // Fallback padrão: as 42 simulações calibradas na mesma amostra
    if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.getDefaultSeedSimulations === 'function') {
      state.simulations = root.TradeSimulatorModel.getDefaultSeedSimulations('2R');
      state.comparison = root.TradeSimulatorModel.compareManagementScenarios();
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

    const newSim = {
      id: 'sim-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      symbol: String(params.symbol).toUpperCase().trim(),
      companyName: params.companyName || params.symbol,
      triggerName: params.triggerName,
      grade: params.grade || 'A',
      sector: params.sector || 'Geral',
      signalDate: params.signalDate || new Date().toISOString().slice(0, 10),
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
      notes: params.notes || '',
      candles: Array.isArray(params.candles) ? params.candles : [],
      timeline: [
        {
          type: 'SIGNAL_IDENTIFIED',
          date: params.signalDate || new Date().toISOString().slice(0, 10),
          label: 'Gatilho identificado',
          desc: `${params.triggerName} (${params.grade || 'A'}) em ${params.symbol}`
        },
        {
          type: 'SIMULATION_ADDED',
          date: new Date().toISOString().slice(0, 10),
          label: 'Simulação adicionada',
          desc: 'Registrado no Simulador de Trades'
        },
        {
          type: 'WAITING_ENTRY',
          date: new Date().toISOString().slice(0, 10),
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
          state.simulations.unshift(res.simulation);
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
  async function generateScenarioMass(scenarioId = '2R') {
    state.loading = true;
    state.activeScenario = scenarioId;
    state.tempScenarioSelection = scenarioId;
    state.scenarioModalOpen = false;
    render();

    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        const res = await root.healthyTrendApi.request(API_ENDPOINT + '/reset', {
          method: 'POST',
          body: JSON.stringify({ scenario: scenarioId })
        });
        if (res && Array.isArray(res.simulations) && res.simulations.length > 0) {
          state.simulations = res.simulations.filter(s => s && s.triggerName !== 'Pullback');
          state.comparison = res.comparison || (root.TradeSimulatorModel ? root.TradeSimulatorModel.compareManagementScenarios() : null);
          saveLocalCache();
          state.loading = false;
          render();
          if (typeof root.showToast === 'function') {
            const meta = (root.TradeSimulatorModel?.SCENARIO_METADATA && root.TradeSimulatorModel.SCENARIO_METADATA[scenarioId]) || { name: scenarioId };
            root.showToast(`✓ Massa de teste gerada para o cenário: ${meta.name}`);
          }
          return;
        }
      }
    } catch (e) {}

    if (root.TradeSimulatorModel && typeof root.TradeSimulatorModel.generateSeedSimulationsForScenario === 'function') {
      state.simulations = root.TradeSimulatorModel.generateSeedSimulationsForScenario(scenarioId);
      state.comparison = root.TradeSimulatorModel.compareManagementScenarios();
    }
    saveLocalCache();
    state.loading = false;
    render();
    if (typeof root.showToast === 'function') {
      const meta = (root.TradeSimulatorModel?.SCENARIO_METADATA && root.TradeSimulatorModel.SCENARIO_METADATA[scenarioId]) || { name: scenarioId };
      root.showToast(`✓ Massa de teste gerada para o cenário: ${meta.name}`);
    }
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
   * Exporta os dados filtrados como CSV compatível com Excel e LLMs
   */
  function exportFilteredCSV() {
    const filtered = getFilteredSimulations();
    if (!filtered.length) {
      if (typeof root.showToast === 'function') {
        root.showToast('Nenhum dado para exportar.', 'warn');
      }
      return;
    }

    const headers = [
      'Ativo', 'Gatilho', 'Nota', 'Setor', 'Data do Sinal',
      'Preço Entrada', 'Stop Loss', 'Status', 'Preço Executado', 'Data Entrada',
      'Preço Saída', 'Data Saída', 'Motivo Saída', 'Resultado (R)', 'MFE (R)', 'MAE (R)'
    ];

    const rows = filtered.map(s => [
      s.symbol,
      s.triggerName,
      s.grade || '—',
      s.sector || '—',
      s.signalDate || '—',
      s.entryPrice != null ? s.entryPrice.toFixed(2).replace('.', ',') : '',
      s.stopLoss != null ? s.stopLoss.toFixed(2).replace('.', ',') : '',
      root.TradeSimulatorModel ? (root.TradeSimulatorModel.STATUS_LABELS[s.status] || s.status) : s.status,
      s.executedEntryPrice != null ? s.executedEntryPrice.toFixed(2).replace('.', ',') : '',
      s.entryDate || '',
      s.exitPrice != null ? s.exitPrice.toFixed(2).replace('.', ',') : '',
      s.exitDate || '',
      s.exitReason || '',
      s.resultR != null ? s.resultR.toFixed(2).replace('.', ',') : '',
      s.mfeR != null ? s.mfeR.toFixed(2).replace('.', ',') : '',
      s.maeR != null ? s.maeR.toFixed(2).replace('.', ',') : ''
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulador-de-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof root.showToast === 'function') {
      root.showToast(`✓ Exportado ${filtered.length} trades simulados para CSV.`);
    }
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
          const gradeRank = { 'A+': 5, 'A': 4, 'B+': 3, 'B': 2, 'C': 1, 'D': 0 };
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
        ${renderModal()}
        ${renderSnapshotModal()}
      </div>
    `;

    bindLocalEvents(rootEl);
  }

  /**
   * 1. Header com Título, Botão da Massa de Teste, Filtros e Botão Comparar Cenários
   */
  function renderHeader() {
    const daysLabel = state.filters.days === 120
      ? 'Últimos 120 dias (4 meses)'
      : (state.filters.days === 90
        ? 'Últimos 90 dias'
        : (state.filters.days === 30 ? 'Últimos 30 dias' : 'Todo o período'));
    const triggerLabel = state.filters.trigger === 'ALL' ? 'Todos os gatilhos' : state.filters.trigger;
    const sectorLabel = state.filters.sector === 'ALL' ? 'Todos os setores' : state.filters.sector;
    const gradeLabel = state.filters.grade === 'ALL' ? 'Todas as notas' : `Nota ${state.filters.grade}`;

    return `
      <div class="sim-header">
        <div class="sim-header-titles">
          <div class="sim-title-row">
            <h1>Simulador de Trades</h1>
          </div>
          <p>Acompanhe como seus trades teriam performado seguindo as regras do seu método.</p>
        </div>

        <div class="sim-top-filters">
          <!-- 1. Painel Centralizado da Massa de Teste (Gerar, Reavaliar e Excluir) -->
          <button class="sim-btn-seed sim-btn-seed-dropdown" type="button" id="simBtnMassModal" title="Painel da Massa de Teste: Gerar, Reavaliar e Excluir">
            <span>⚡ Massa de Teste ▾</span>
          </button>

          <!-- Filtro Período -->
          <div class="sim-filter-select-wrap">
            <button class="sim-filter-btn" type="button" data-dropdown="days">
              <span class="sim-filter-ico">📅</span>
              <span>${daysLabel}</span>
              <span class="sim-chevron">▼</span>
            </button>
            <div class="sim-dropdown-menu ${state.activeDropdown === 'days' ? 'open' : ''}">
              <button class="sim-dropdown-item ${state.filters.days === 30 ? 'active' : ''}" data-filter-type="days" data-filter-val="30">Últimos 30 dias</button>
              <button class="sim-dropdown-item ${state.filters.days === 90 ? 'active' : ''}" data-filter-type="days" data-filter-val="90">Últimos 90 dias</button>
              <button class="sim-dropdown-item ${state.filters.days === 120 ? 'active' : ''}" data-filter-type="days" data-filter-val="120">Últimos 120 dias (4 meses)</button>
              <button class="sim-dropdown-item ${state.filters.days === 'ALL' ? 'active' : ''}" data-filter-type="days" data-filter-val="ALL">Todo o período</button>
            </div>
          </div>

          <!-- Filtro Gatilho -->
          <div class="sim-filter-select-wrap">
            <button class="sim-filter-btn" type="button" data-dropdown="trigger">
              <span class="sim-filter-ico">🎯</span>
              <span>${triggerLabel}</span>
              <span class="sim-chevron">▼</span>
            </button>
            <div class="sim-dropdown-menu ${state.activeDropdown === 'trigger' ? 'open' : ''}">
              <button class="sim-dropdown-item ${state.filters.trigger === 'ALL' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="ALL">Todos os gatilhos</button>
              <button class="sim-dropdown-item ${state.filters.trigger === 'Inside Bar' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="Inside Bar">Inside Bar</button>
              <button class="sim-dropdown-item ${state.filters.trigger === '1-2-3 de Compra' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="1-2-3 de Compra">1-2-3 de Compra</button>
              <button class="sim-dropdown-item ${state.filters.trigger === 'Outros' ? 'active' : ''}" data-filter-type="trigger" data-filter-val="Outros">Outros</button>
            </div>
          </div>

          <!-- Filtro Setor -->
          <div class="sim-filter-select-wrap">
            <button class="sim-filter-btn" type="button" data-dropdown="sector">
              <span class="sim-filter-ico">🏷️</span>
              <span>${sectorLabel}</span>
              <span class="sim-chevron">▼</span>
            </button>
            <div class="sim-dropdown-menu ${state.activeDropdown === 'sector' ? 'open' : ''}">
              <button class="sim-dropdown-item ${state.filters.sector === 'ALL' ? 'active' : ''}" data-filter-type="sector" data-filter-val="ALL">Todos os setores</button>
              <button class="sim-dropdown-item ${state.filters.sector === 'Financeiro' ? 'active' : ''}" data-filter-type="sector" data-filter-val="Financeiro">Financeiro</button>
              <button class="sim-dropdown-item ${state.filters.sector === 'Petróleo e Gás' ? 'active' : ''}" data-filter-type="sector" data-filter-val="Petróleo e Gás">Petróleo e Gás</button>
              <button class="sim-dropdown-item ${state.filters.sector === 'Utilidade Pública' ? 'active' : ''}" data-filter-type="sector" data-filter-val="Utilidade Pública">Utilidade Pública</button>
              <button class="sim-dropdown-item ${state.filters.sector === 'Consumo Não Cíclico' ? 'active' : ''}" data-filter-type="sector" data-filter-val="Consumo Não Cíclico">Consumo Não Cíclico</button>
              <button class="sim-dropdown-item ${state.filters.sector === 'Materiais Básicos' ? 'active' : ''}" data-filter-type="sector" data-filter-val="Materiais Básicos">Materiais Básicos</button>
              <button class="sim-dropdown-item ${state.filters.sector === 'Saúde' ? 'active' : ''}" data-filter-type="sector" data-filter-val="Saúde">Saúde</button>
            </div>
          </div>

          <!-- Filtro Notas -->
          <div class="sim-filter-select-wrap">
            <button class="sim-filter-btn" type="button" data-dropdown="grade">
              <span class="sim-filter-ico">⭐</span>
              <span>${gradeLabel}</span>
              <span class="sim-chevron">▼</span>
            </button>
            <div class="sim-dropdown-menu ${state.activeDropdown === 'grade' ? 'open' : ''}">
              <button class="sim-dropdown-item ${state.filters.grade === 'ALL' ? 'active' : ''}" data-filter-type="grade" data-filter-val="ALL">Todas as notas</button>
              <button class="sim-dropdown-item ${state.filters.grade === 'A+' ? 'active' : ''}" data-filter-type="grade" data-filter-val="A+">Nota A+</button>
              <button class="sim-dropdown-item ${state.filters.grade === 'A' ? 'active' : ''}" data-filter-type="grade" data-filter-val="A">Nota A</button>
              <button class="sim-dropdown-item ${state.filters.grade === 'B+' ? 'active' : ''}" data-filter-type="grade" data-filter-val="B+">Nota B+</button>
              <button class="sim-dropdown-item ${state.filters.grade === 'B' ? 'active' : ''}" data-filter-type="grade" data-filter-val="B">Nota B</button>
            </div>
          </div>

          <!-- 2. Botão Estratégico em Destaque: Comparar Cenários -->
          <button class="sim-btn-compare-scenarios" type="button" id="simBtnCompareModal" title="Comparar 2R vs 2,5R vs Pirâmide na mesma amostra de trades">
            <span class="sim-compare-icon">📊</span>
            <span>Comparar Cenários</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 2. Conjunto de 7 KPI Cards (Rigorosamente conforme referência)
   */
  function renderKpiCards(stats) {
    return `
      <div class="sim-kpis-container">
        <!-- Card 1: Simulações criadas -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-blue">🎯</span>
            <span class="sim-kpi-title">Simulações criadas</span>
          </div>
          <div class="sim-kpi-val">${stats.totalCreated}</div>
          <p class="sim-kpi-sub">Sinais adicionados ao simulador.</p>
        </div>

        <!-- Card 2: Entradas executadas -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-green">▶</span>
            <span class="sim-kpi-title">Entradas executadas</span>
          </div>
          <div class="sim-kpi-val">${stats.executedEntriesCount}</div>
          <p class="sim-kpi-sub"><strong>${stats.executedPct.toFixed(1).replace('.', ',')}%</strong> das simulações acionaram a entrada.</p>
        </div>

        <!-- Card 3: Trades vencedores -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-green">🏆</span>
            <span class="sim-kpi-title">Trades vencedores</span>
          </div>
          <div class="sim-kpi-val">${stats.winningTradesCount}</div>
          <p class="sim-kpi-sub"><strong>${stats.winRate.toFixed(1).replace('.', ',')}%</strong> de win rate<br>sobre trades executados.</p>
        </div>

        <!-- Card 4: Trades perdedores -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-red">✕</span>
            <span class="sim-kpi-title">Trades perdedores</span>
          </div>
          <div class="sim-kpi-val">${stats.losingTradesCount}</div>
          <p class="sim-kpi-sub"><strong>${stats.lossRate.toFixed(1).replace('.', ',')}%</strong> de loss rate<br>sobre trades executados.</p>
        </div>

        <!-- Card 5: Resultado total -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-green">Σ</span>
            <span class="sim-kpi-title">Resultado total</span>
          </div>
          <div class="sim-kpi-val positive">${stats.totalRFormatted}</div>
          <p class="sim-kpi-sub">Soma dos trades encerrados (ganhos e perdedores).</p>
        </div>

        <!-- Card 6: R médio / trade -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-green">📊</span>
            <span class="sim-kpi-title">R médio / trade</span>
          </div>
          <div class="sim-kpi-val positive">${stats.avgRFormatted}</div>
          <p class="sim-kpi-sub">Expectancy do método.</p>
        </div>

        <!-- Card 7: Aguardando entrada -->
        <div class="sim-kpi-card">
          <div class="sim-kpi-top">
            <span class="sim-kpi-icon icon-orange">⏳</span>
            <span class="sim-kpi-title">Aguardando entrada</span>
          </div>
          <div class="sim-kpi-val">${stats.waitingCount}</div>
          <p class="sim-kpi-sub"><strong>${stats.waitingPct.toFixed(1).replace('.', ',')}%</strong> das simulações ainda não entraram.</p>
        </div>
      </div>
    `;
  }

  /**
   * 3. Linha de 3 Gráficos: Curva de Resultados, Distribuição e Desempenho por Gatilho
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

    // 2. Gráfico Distribuição de Resultados (Barras Verticais)
    const dist = stats.distribution || {
      winners: { count: 12, label: 'Vencedores (66,7%)' },
      losers: { count: 6, label: 'Perdedores (33,3%)' },
      notTriggered: { count: 6, label: 'Não acionados (25,0%)' }
    };

    // 3. Gráfico Desempenho por Gatilho (Barras Horizontais)
    const triggers = stats.triggerPerformance || [
      { name: 'Inside Bar', totalRFormatted: '+8,4R', tradesText: '8 trades', totalR: 8.4 },
      { name: '1-2-3 de Compra', totalRFormatted: '+5,1R', tradesText: '7 trades', totalR: 5.1 },
      { name: 'Outros', totalRFormatted: '+0,1R', tradesText: '1 trade', totalR: 0.1 }
    ];
    const maxTriggerR = Math.max(...triggers.map(t => Math.max(0.1, t.totalR || 0)), 10);

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

        <!-- Gráfico 2: Distribuição de Resultados -->
        <div class="sim-chart-card">
          <div class="sim-chart-head">
            <h3 class="sim-chart-title">
              <span>📊</span> Distribuição de Resultados
            </h3>
          </div>
          <div class="sim-dist-bars-wrap">
            <!-- Vencedores -->
            <div class="sim-dist-col">
              <span class="sim-dist-count">${dist.winners.count}</span>
              <div class="sim-dist-bar bar-green" style="height: 66.7%;"></div>
              <span class="sim-dist-label">${dist.winners.label.replace(' (', '<br>(')}</span>
            </div>
            <!-- Perdedores -->
            <div class="sim-dist-col">
              <span class="sim-dist-count">${dist.losers.count}</span>
              <div class="sim-dist-bar bar-red" style="height: 33.3%;"></div>
              <span class="sim-dist-label">${dist.losers.label.replace(' (', '<br>(')}</span>
            </div>
            <!-- Não acionados -->
            <div class="sim-dist-col">
              <span class="sim-dist-count">${dist.notTriggered.count}</span>
              <div class="sim-dist-bar bar-gray" style="height: 33.3%;"></div>
              <span class="sim-dist-label">${dist.notTriggered.label.replace(' (', '<br>(')}</span>
            </div>
          </div>
        </div>

        <!-- Gráfico 3: Desempenho por Gatilho -->
        <div class="sim-chart-card">
          <div class="sim-chart-head">
            <h3 class="sim-chart-title">
              <span>🎯</span> Desempenho por Gatilho
            </h3>
          </div>
          <div class="sim-trigger-list">
            ${triggers.map(t => {
              const widthPct = Math.max(2, Math.min(100, Math.round(((t.totalR || 0) / maxTriggerR) * 100)));
              return `
                <div class="sim-trigger-row">
                  <span class="sim-trigger-name" title="${t.name}">${t.name}</span>
                  <div class="sim-trigger-bar-bg">
                    <div class="sim-trigger-bar-fill" style="width: ${widthPct}%;"></div>
                  </div>
                  <div class="sim-trigger-right">
                    <span class="sim-trigger-val">${t.totalRFormatted}</span>
                    <span class="sim-trigger-count">${t.tradesText}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza SVG da curva de resultado acumulado
   */
  function renderEquitySvgChart(points, isUnitRS, riskNominal) {
    const width = 600;
    const height = 180;
    const pad = { top: 15, right: 25, bottom: 25, left: 35 };

    const yMinR = -5;
    const yMaxR = 20;
    const yRange = yMaxR - yMinR;

    const getY = (rVal) => {
      const clamped = Math.max(yMinR, Math.min(yMaxR, rVal));
      return pad.top + ((yMaxR - clamped) / yRange) * (height - pad.top - pad.bottom);
    };

    const getX = (idx, total) => {
      if (total <= 1) return pad.left;
      return pad.left + (idx / (total - 1)) * (width - pad.left - pad.right);
    };

    // Linhas de Grade Horizontais
    const gridLevels = [20, 15, 10, 5, 0, -5];
    const gridLines = gridLevels.map(level => {
      const y = getY(level);
      const isBaseline = level === 0;
      const label = isUnitRS
        ? `${level > 0 ? '+' : ''}${(level * riskNominal / 1000).toFixed(0)}k`
        : `${level > 0 ? '+' : ''}${level}R`;
      return `
        <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"
              stroke="${isBaseline ? 'rgba(16, 185, 129, 0.4)' : '#e5eae5'}"
              stroke-dasharray="${isBaseline ? '3,3' : '2,2'}" stroke-width="1" />
        <text x="${pad.left - 6}" y="${y + 3}" text-anchor="end" font-size="9" fill="#8fa398" font-family="Inter, sans-serif">${label}</text>
      `;
    }).join('');

    // Datas no eixo X
    const dates = ['Jul 1', 'Jul 15', 'Ago 1', 'Ago 15', 'Set 1', 'Set 15', 'Out 1'];
    const dateLabels = dates.map((d, i) => {
      const x = pad.left + (i / (dates.length - 1)) * (width - pad.left - pad.right);
      return `
        <text x="${x}" y="${height - 6}" text-anchor="middle" font-size="9" fill="#8fa398" font-family="Inter, sans-serif">${d}</text>
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
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.32" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${gridLines}
        ${dateLabels}
        <path d="${areaD}" fill="url(#simEquityGrad)" />
        <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Ponto final com pulso luminoso -->
        <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="8" fill="#10b981" opacity="0.25" />
        <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="2" />
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

    return `
      <th class="sim-th-sortable ${activeClass}" data-sort="${columnKey}" title="${title}">
        <div class="sim-th-content">
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

    return `
      <div class="sim-table-card">
        <div class="sim-table-toolbar">
          <!-- Abas de Status -->
          <div class="sim-status-tabs">
            <button class="sim-tab-btn ${activeTab === 'ALL' ? 'active' : ''}" data-tab="ALL">
              <span>●</span>
              <span>Todos (${stats.totalCreated})</span>
            </button>
            <button class="sim-tab-btn ${activeTab === 'WAITING_ENTRY' ? 'active' : ''}" data-tab="WAITING_ENTRY">
              <span class="sim-tab-dot dot-orange"></span>
              <span>Aguardando Entrada (${stats.waitingCount})</span>
            </button>
            <button class="sim-tab-btn ${activeTab === 'IN_OPERATION' ? 'active' : ''}" data-tab="IN_OPERATION">
              <span class="sim-tab-dot dot-green"></span>
              <span>Em Operação (${stats.inOperationCount})</span>
            </button>
            <button class="sim-tab-btn ${activeTab === 'CLOSED' ? 'active' : ''}" data-tab="CLOSED">
              <span class="sim-tab-dot dot-gray"></span>
              <span>Encerrados (${stats.closedCount})</span>
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
                ${getSortHeader('currentPrice', 'Preço Atual')}
                ${getSortHeader('resultR', 'Resultado (R)')}
                ${getSortHeader('mfeR', 'MFE (R)')}
                ${getSortHeader('maeR', 'MAE (R)')}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${simulations.length > 0 ? simulations.map(sim => renderTableRow(sim)).join('') : renderEmptyRow()}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza uma linha individual da tabela
   */
  function renderTableRow(sim) {
    const gradeClass = getGradeBadgeClass(sim.grade);
    const statusPill = renderStatusPill(sim.status);

    const resultClass = sim.resultR > 0 ? 'metric-gain' : (sim.resultR < 0 ? 'metric-loss' : 'metric-neutral');
    const mfeClass = sim.mfeR > 0 ? 'metric-gain' : 'metric-neutral';
    const maeClass = sim.maeR < 0 ? 'metric-loss' : 'metric-neutral';

    return `
      <tr data-sim-id="${sim.id}">
        <!-- Ativo -->
        <td>
          <div class="sim-ticker-cell">
            <span class="sim-ticker-icon">${sim.symbol.slice(0, 2)}</span>
            <span class="sim-ticker-code">${sim.symbol}</span>
          </div>
        </td>

        <!-- Gatilho -->
        <td>${sim.triggerName}</td>

        <!-- Nota -->
        <td>
          <span class="sim-grade-badge ${gradeClass}">${sim.grade || '—'}</span>
        </td>

        <!-- Data do Sinal -->
        <td>${formatDateBR(sim.signalDate)}</td>

        <!-- Entrada -->
        <td>${formatMoney(sim.entryPrice)}</td>

        <!-- Stop -->
        <td>${formatMoney(sim.stopLoss)}</td>

        <!-- Status -->
        <td>${statusPill}</td>

        <!-- Preço Atual -->
        <td>${formatMoney(sim.currentPrice)}</td>

        <!-- Resultado (R) -->
        <td class="${resultClass}">${formatR(sim.resultR)}</td>

        <!-- MFE (R) -->
        <td class="${mfeClass}">${formatR(sim.mfeR)}</td>

        <!-- MAE (R) -->
        <td class="${maeClass}">${formatR(sim.maeR)}</td>

        <!-- Ações -->
        <td>
          <div class="sim-actions-cell">
            <button class="sim-action-btn" type="button" title="Ver Foto / Snapshot do Trade" data-action="chart" data-sim-id="${sim.id}" data-ticker="${sim.symbol}">📊</button>
            <button class="sim-action-btn" type="button" title="Ver Detalhes" data-action="details" data-sim-id="${sim.id}">⋮</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderStatusPill(status) {
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
    const g = String(grade || '').toUpperCase();
    if (g === 'A+') return 'grade-a-plus';
    if (g === 'A') return 'grade-a';
    if (g === 'B+') return 'grade-b-plus';
    if (g === 'B') return 'grade-b';
    if (g === 'C') return 'grade-c';
    return 'grade-d';
  }

  function renderEmptyRow() {
    return `
      <tr>
        <td colspan="12">
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
   * Modal / Painel Centralizado da Massa de Teste
   * Agrupa: 1. Gerar Massa de Teste (Cenários 2R, 2.5R e Pirâmide)
   *         2. Ações da Massa Atual (Reavaliar candles e Excluir com confirmação)
   */
  function renderMassModal() {
    if (!state.massModalOpen) return '';

    const sel = state.tempScenarioSelection || state.activeScenario || '2R';

    return `
      <div class="sim-scenario-modal-overlay open" id="simMassModalOverlay">
        <div class="sim-scenario-modal-box sim-mass-modal-box" id="simMassModalBox">
          <!-- Cabeçalho do Painel -->
          <div class="sim-scenario-modal-header">
            <div>
              <div class="sim-mass-header-badge">PAINEL DE CONTROLE</div>
              <h2>⚡ Massa de Teste</h2>
              <p>Gere cenários históricos para o seu setup ou gerencie os dados atualmente em análise.</p>
            </div>
            <button class="sim-modal-close-btn" type="button" id="simMassModalClose" title="Fechar">×</button>
          </div>

          <!-- BLOCO 1: GERAR MASSA DE TESTE -->
          <div class="sim-mass-modal-section">
            <div class="sim-mass-section-eyebrow">
              <span>GERAR MASSA DE TESTE</span>
            </div>

            <!-- Período -->
            <div class="sim-scenario-period-section">
              <label class="sim-scen-period-label">Período</label>
              <div class="sim-scen-period-pill">
                <span>📅</span>
                <span>Últimos 120 dias (4 meses)</span>
                <span class="sim-scen-sample-tag">Amostra de 42 trades</span>
              </div>
            </div>

            <!-- Cenário de Gestão -->
            <div class="sim-scenario-options-group">
              <label class="sim-scen-period-label">Cenário de Gestão</label>
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
                      <div class="sim-scen-opt-desc">Risco inicial de 1R. Ao atingir +1R adiciona posição +1R e encerra tudo em +2R.</div>
                    </div>
                  </div>
                  <div class="sim-scen-opt-diagram">
                    ${getScenarioMiniDiagramSvg('PYRAMID_1R_2R')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Botão de Ação -->
            <div class="sim-scenario-action-wrap">
              <button class="sim-btn-confirm-scenario" type="button" id="simModalConfirmScenario">
                <span>🚀 Gerar Massa de Teste</span>
              </button>
            </div>
          </div>

          <!-- DIVISOR VISUAL -->
          <div class="sim-mass-modal-divider"></div>

          <!-- BLOCO 2: AÇÕES DA MASSA ATUAL -->
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
                  <div class="sim-mass-action-desc">Excluir as simulações atualmente carregadas.</div>
                </div>
                <button class="sim-mass-action-trigger-btn danger" type="button" id="simMassActionClearBtn">Excluir</button>
              </div>

              <!-- Confirmação Destrutiva Segura -->
              ${state.showClearConfirm ? `
                <div class="sim-mass-confirm-alert">
                  <div class="sim-mass-confirm-text">
                    ⚠️ <b>Confirmar exclusão:</b> Deseja realmente excluir todas as simulações carregadas? Esta ação é irreversível.
                  </div>
                  <div class="sim-mass-confirm-actions">
                    <button class="sim-btn-confirm-cancel" type="button" id="simMassConfirmCancel">Cancelar</button>
                    <button class="sim-btn-confirm-danger" type="button" id="simMassConfirmClear">Sim, Excluir</button>
                  </div>
                </div>
              ` : ''}
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

    const comparison = state.comparison || (root.TradeSimulatorModel ? root.TradeSimulatorModel.compareManagementScenarios() : null);
    const scenarios = comparison && Array.isArray(comparison.scenarios) ? comparison.scenarios : [];
    const sampleInfo = comparison?.sampleInfo || 'Mesma amostra: últimos 4 meses • 42 trades';

    const defaultBench = root.TradeSimulatorModel?.BENCHMARK_SCENARIOS_COMPARISON || [];
    const sc2R = scenarios.find(s => s.id === '2R') || defaultBench[0] || {};
    const sc25R = scenarios.find(s => s.id === '2.5R') || defaultBench[1] || {};
    const scPyr = scenarios.find(s => s.id === 'PYRAMID_1R_2R') || defaultBench[2] || {};

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
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="td-metric-name">Total de Trades</td>
                  <td><b>${sc2R.totalTrades ?? 42}</b></td>
                  <td><b>${sc25R.totalTrades ?? 42}</b></td>
                  <td><b>${scPyr.totalTrades ?? 42}</b></td>
                </tr>
                <tr>
                  <td class="td-metric-name">Win Rate</td>
                  <td>${sc2R.winRateFormatted ?? '52,4% (22)'}</td>
                  <td>${sc25R.winRateFormatted ?? '47,6% (20)'}</td>
                  <td>${scPyr.winRateFormatted ?? '50,0% (21)'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">Loss Rate</td>
                  <td>${sc2R.lossRateFormatted ?? '47,6% (20)'}</td>
                  <td>${sc25R.lossRateFormatted ?? '52,4% (22)'}</td>
                  <td>${scPyr.lossRateFormatted ?? '50,0% (21)'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">R médio por trade</td>
                  <td class="metric-accent">${sc2R.avgRFormatted ?? '0,68R'}</td>
                  <td class="metric-accent">${sc25R.avgRFormatted ?? '0,82R'}</td>
                  <td class="metric-accent-blue">${scPyr.avgRFormatted ?? '1,12R'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">Expectancy</td>
                  <td class="metric-accent">${sc2R.expectancyFormatted ?? '0,65R'}</td>
                  <td class="metric-accent">${sc25R.expectancyFormatted ?? '0,78R'}</td>
                  <td class="metric-accent-blue">${scPyr.expectancyFormatted ?? '1,05R'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">Profit Factor</td>
                  <td><b>${sc2R.profitFactorFormatted ?? '1,78'}</b></td>
                  <td><b>${sc25R.profitFactorFormatted ?? '1,92'}</b></td>
                  <td><b class="metric-accent-blue">${scPyr.profitFactorFormatted ?? '2,35'}</b></td>
                </tr>
                <tr>
                  <td class="td-metric-name">Resultado acumulado</td>
                  <td class="metric-gain">${sc2R.totalRFormatted ?? '+27,36R'}</td>
                  <td class="metric-gain">${sc25R.totalRFormatted ?? '+32,90R'}</td>
                  <td class="metric-gain-high">${scPyr.totalRFormatted ?? '+44,10R'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">Drawdown máximo</td>
                  <td class="metric-loss">${sc2R.maxDrawdownFormatted ?? '-6,20R'}</td>
                  <td class="metric-loss">${sc25R.maxDrawdownFormatted ?? '-7,10R'}</td>
                  <td class="metric-loss">${scPyr.maxDrawdownFormatted ?? '-8,40R'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">MFE médio (vencedores)</td>
                  <td>${sc2R.avgMfeFormatted ?? '2,10R'}</td>
                  <td>${sc25R.avgMfeFormatted ?? '2,58R'}</td>
                  <td>${scPyr.avgMfeFormatted ?? '2,85R'}</td>
                </tr>
                <tr>
                  <td class="td-metric-name">MAE médio (perdedores)</td>
                  <td class="metric-loss">${sc2R.avgMaeFormatted ?? '-1,05R'}</td>
                  <td class="metric-loss">${sc25R.avgMaeFormatted ?? '-1,08R'}</td>
                  <td class="metric-loss">${scPyr.avgMaeFormatted ?? '-1,15R'}</td>
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
                    <li>Entrada: 1R de risco inicial</li>
                    <li>Stop: -1R</li>
                    <li>Saída: 100% da posição em +2R</li>
                    <li>Sem piramidagem.</li>
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
                    <b>Gestão 2,5R — Alvo Estendido</b>
                  </div>
                  <ul class="sim-expl-bullets">
                    <li>Entrada: 1R de risco inicial</li>
                    <li>Stop: -1R (ao atingir +1R move para breakeven)</li>
                    <li>Saída: 100% da posição em +2,5R</li>
                    <li>Sem piramidagem.</li>
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
                    <b>Gestão Pirâmide — 1R → 2R</b>
                  </div>
                  <ul class="sim-expl-bullets">
                    <li>Entrada 1: 1R de risco inicial</li>
                    <li>Ao atingir +1R: adiciona lote e move stop para breakeven</li>
                    <li>Saída: 100% em +2R (+3,00R consolidado)</li>
                  </ul>
                </div>
                <div class="sim-expl-item-diagram">
                  ${getScenarioMiniDiagramSvg('PYRAMID_1R_2R')}
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
              <small>Resultado</small>
              <b style="color: ${sim.resultR > 0 ? '#10b981' : (sim.resultR < 0 ? '#ef4444' : 'inherit')}">
                ${formatR(sim.resultR)}
              </b>
            </div>
          </div>

          <!-- Print / Foto do Momento da Captura & Execução -->
          <div class="sim-snapshot-chart-card">
            ${renderSnapshotChartSvg(sim)}
          </div>

          <!-- Rodapé do Snapshot -->
          <div class="sim-snapshot-footer">
            <div class="sim-snapshot-footer-note">
              <span>📷 Foto congelada dos parâmetros da captura e execução da oportunidade.</span>
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
   * Renderiza o gráfico vetorial SVG com linhas de gatilho, entrada, stop e alvos
   */
  function renderSnapshotChartSvg(sim) {
    if (!sim) return '';
    const candles = root.TradeSimulatorModel && typeof root.TradeSimulatorModel.generateSimulationSnapshotCandles === 'function'
      ? root.TradeSimulatorModel.generateSimulationSnapshotCandles(sim)
      : [];
    if (!candles.length) {
      return '<div style="color: #94a3b8; text-align: center; padding: 40px;">Candles indisponíveis para este trade.</div>';
    }

    const entry = Number(sim.entryPrice) || 0;
    const stop = Number(sim.stopLoss) || 0;
    const risk = Math.max(0.01, Math.abs(entry - stop));
    const scenario = sim.managementScenario || '2R';
    const isPyramid = scenario === 'PYRAMID_1R_2R';
    const isExtended = scenario === '2.5R';
    const targetMult = isExtended ? 2.5 : 2.0;
    const targetExitPrice = Number((entry + targetMult * risk).toFixed(2));
    const target1R = Number((entry + risk).toFixed(2));
    const target2R = Number((entry + 2 * risk).toFixed(2));

    // Dimensões do SVG
    const svgW = 960;
    const svgH = 430;
    const padLeft = 40;
    const padRight = 135;
    const padTop = 35;
    const padBottom = 40;
    const plotW = svgW - padLeft - padRight;
    const plotH = svgH - padTop - padBottom;

    // Escala de preços
    let allPrices = [entry, stop, target1R, targetExitPrice];
    candles.forEach(c => {
      allPrices.push(Number(c.high), Number(c.low));
      if (c.ema9) allPrices.push(Number(c.ema9));
      if (c.ema30) allPrices.push(Number(c.ema30));
    });
    if (sim.executedEntryPrice) allPrices.push(Number(sim.executedEntryPrice));
    if (sim.exitPrice) allPrices.push(Number(sim.exitPrice));

    let minP = Math.min(...allPrices);
    let maxP = Math.max(...allPrices);
    const pMargin = (maxP - minP) * 0.08 || 1;
    minP -= pMargin;
    maxP += pMargin;

    function getY(price) {
      if (maxP === minP) return padTop + plotH / 2;
      return padTop + plotH - ((price - minP) / (maxP - minP)) * plotH;
    }

    const n = candles.length;
    const colW = plotW / n;
    const bodyW = Math.max(4, Math.min(22, colW * 0.65));

    function getX(idx) {
      return padLeft + (idx + 0.5) * colW;
    }

    // Linhas de Grade Horizontal
    const gridSteps = 5;
    let gridLinesSvg = '';
    for (let i = 0; i <= gridSteps; i++) {
      const p = minP + (i / gridSteps) * (maxP - minP);
      const y = getY(p);
      gridLinesSvg += `
        <line x1="${padLeft}" y1="${y}" x2="${padLeft + plotW}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${svgW - 5}" y="${y + 4}" fill="#64748b" font-size="10" text-anchor="end" font-family="monospace">R$ ${p.toFixed(2)}</text>
      `;
    }

    // Linhas de Referência: Target Exit, Target 1R / Adição, Entrada, Stop Loss
    const yExit = getY(targetExitPrice);
    const yT1 = getY(target1R);
    const yEnt = getY(entry);
    const yStp = getY(stop);

    const isGain = sim.status === 'CLOSED_GAIN';
    const isLoss = sim.status === 'CLOSED_LOSS';

    let targetLabel = isGain ? '★ +2R ATINGIDO' : 'ALVO 2R: ' + targetExitPrice.toFixed(2);
    let targetBg = isGain ? '#10b981' : '#064e3b';
    let targetStroke = '#10b981';

    if (isExtended) {
      targetLabel = isGain ? '★ +2,5R ATINGIDO' : 'ALVO 2,5R: ' + targetExitPrice.toFixed(2);
      targetBg = isGain ? '#f59e0b' : '#78350f';
      targetStroke = '#f59e0b';
    } else if (isPyramid) {
      targetLabel = isGain ? '★ ALVO (+3,00R CONSOL.)' : 'ALVO 2R: ' + targetExitPrice.toFixed(2);
      targetBg = isGain ? '#0284c7' : '#0c4a6e';
      targetStroke = '#0284c7';
    }

    const t1BadgeLabel = (isPyramid && sim.scaleIn && sim.scaleIn.executed)
      ? '▶ ADIÇÃO (+1R FEITA)'
      : `ALVO 1R: R$ ${target1R.toFixed(2)}`;
    const t1BadgeBg = (isPyramid && sim.scaleIn && sim.scaleIn.executed) ? '#0284c7' : '#134e4a';
    const t1BadgeColor = (isPyramid && sim.scaleIn && sim.scaleIn.executed) ? '#ffffff' : '#5eead4';

    const refLinesSvg = `
      <!-- Alvo Saída (${scenario}) -->
      <line x1="${padLeft}" y1="${yExit}" x2="${padLeft + plotW}" y2="${yExit}" stroke="${targetStroke}" stroke-width="1.5" stroke-dasharray="4,4" />
      <g transform="translate(${padLeft + plotW + 6}, ${yExit - 9})">
        <rect width="126" height="18" rx="4" fill="${targetBg}" />
        <text x="63" y="13" fill="#ffffff" font-size="9" font-weight="700" text-anchor="middle" font-family="system-ui">
          ${targetLabel}
        </text>
      </g>

      <!-- Alvo 1R / Adição -->
      <line x1="${padLeft}" y1="${yT1}" x2="${padLeft + plotW}" y2="${yT1}" stroke="${isPyramid ? '#0284c7' : '#14b8a6'}" stroke-width="1.2" stroke-dasharray="3,3" />
      <g transform="translate(${padLeft + plotW + 6}, ${yT1 - 9})">
        <rect width="126" height="18" rx="4" fill="${t1BadgeBg}" />
        <text x="63" y="13" fill="${t1BadgeColor}" font-size="9" font-weight="700" text-anchor="middle" font-family="system-ui">
          ${t1BadgeLabel}
        </text>
      </g>

      <!-- Entrada -->
      <line x1="${padLeft}" y1="${yEnt}" x2="${padLeft + plotW}" y2="${yEnt}" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="5,4" />
      <g transform="translate(${padLeft + plotW + 6}, ${yEnt - 9})">
        <rect width="118" height="18" rx="4" fill="#0369a1" />
        <text x="59" y="13" fill="#ffffff" font-size="9.5" font-weight="700" text-anchor="middle" font-family="system-ui">
          ▶ ENTRADA: R$ ${entry.toFixed(2)}
        </text>
      </g>

      <!-- Stop Loss -->
      <line x1="${padLeft}" y1="${yStp}" x2="${padLeft + plotW}" y2="${yStp}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />
      <g transform="translate(${padLeft + plotW + 6}, ${yStp - 9})">
        <rect width="118" height="18" rx="4" fill="${isLoss ? '#ef4444' : '#7f1d1d'}" />
        <text x="59" y="13" fill="#ffffff" font-size="9.5" font-weight="700" text-anchor="middle" font-family="system-ui">
          ${isLoss ? '✕ STOP EXECUTADO' : 'STOP: R$ ' + stop.toFixed(2)}
        </text>
      </g>
    `;

    // Caminhos das EMAs
    let ema9Path = '';
    let ema30Path = '';
    candles.forEach((c, idx) => {
      const cx = getX(idx);
      if (c.ema9) {
        const cy9 = getY(c.ema9);
        ema9Path += idx === 0 ? `M ${cx} ${cy9}` : ` L ${cx} ${cy9}`;
      }
      if (c.ema30) {
        const cy30 = getY(c.ema30);
        ema30Path += idx === 0 ? `M ${cx} ${cy30}` : ` L ${cx} ${cy30}`;
      }
    });

    const emaSvg = `
      ${ema30Path ? `<path d="${ema30Path}" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.85" />` : ''}
      ${ema9Path ? `<path d="${ema9Path}" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-opacity="0.9" />` : ''}
    `;

    // Candlesticks e Anotações
    let candlesSvg = '';
    let calloutsSvg = '';

    candles.forEach((c, idx) => {
      const cx = getX(idx);
      const cOpen = Number(c.open);
      const cClose = Number(c.close);
      const cHigh = Number(c.high);
      const cLow = Number(c.low);
      const isBull = cClose >= cOpen;
      const color = isBull ? '#10b981' : '#ef4444';

      const yH = getY(cHigh);
      const yL = getY(cLow);
      const yO = getY(cOpen);
      const yC = getY(cClose);
      const topY = Math.min(yO, yC);
      const bodyH = Math.max(2, Math.abs(yO - yC));

      // Pavio (Wick)
      candlesSvg += `<line x1="${cx}" y1="${yH}" x2="${cx}" y2="${yL}" stroke="${color}" stroke-width="1.2" />`;
      // Corpo (Body)
      candlesSvg += `<rect x="${cx - bodyW / 2}" y="${topY}" width="${bodyW}" height="${bodyH}" fill="${color}" rx="1" />`;

      // Data no eixo X (a cada 2 ou em pontos-chave)
      if (idx % 2 === 0 || c.isSignal || c.isEntry || c.isExit) {
        const dText = String(c.time || '').slice(5).replace('-', '/');
        candlesSvg += `<text x="${cx}" y="${svgH - 12}" fill="#64748b" font-size="9" text-anchor="middle" font-family="monospace">${dText}</text>`;
      }

      // Callouts nos candles
      if (c.isSignal) {
        calloutsSvg += `
          <g transform="translate(${cx}, ${yL + 16})">
            <polygon points="0,-6 -5,0 5,0" fill="#38bdf8" />
            <rect x="-45" y="0" width="90" height="16" rx="4" fill="#0284c7" />
            <text x="0" y="11" fill="#ffffff" font-size="8.5" font-weight="700" text-anchor="middle" font-family="system-ui">🎯 GATILHO</text>
          </g>
        `;
      }

      if (c.isEntry) {
        calloutsSvg += `
          <g transform="translate(${cx}, ${yL + 18})">
            <polygon points="0,-6 -5,0 5,0" fill="#10b981" />
            <rect x="-48" y="0" width="96" height="16" rx="4" fill="#059669" />
            <text x="0" y="11" fill="#ffffff" font-size="8.5" font-weight="700" text-anchor="middle" font-family="system-ui">▶ ENTRADA</text>
          </g>
        `;
      }

      if (c.isTarget2R || (c.isExit && isGain)) {
        calloutsSvg += `
          <g transform="translate(${cx}, ${yH - 24})">
            <rect x="-56" y="0" width="112" height="17" rx="4" fill="#10b981" />
            <polygon points="0,23 -5,17 5,17" fill="#10b981" />
            <text x="0" y="12" fill="#ffffff" font-size="8.5" font-weight="800" text-anchor="middle" font-family="system-ui">★ +2R ATINGIDO</text>
          </g>
        `;
      } else if (c.isStop || (c.isExit && isLoss)) {
        calloutsSvg += `
          <g transform="translate(${cx}, ${yL + 18})">
            <polygon points="0,-6 -5,0 5,0" fill="#ef4444" />
            <rect x="-45" y="0" width="90" height="16" rx="4" fill="#dc2626" />
            <text x="0" y="11" fill="#ffffff" font-size="8.5" font-weight="700" text-anchor="middle" font-family="system-ui">✕ STOP LOSS</text>
          </g>
        `;
      }
    });

    // Legenda no canto superior esquerdo
    const legendSvg = `
      <g transform="translate(${padLeft + 10}, 18)">
        <line x1="0" y1="5" x2="16" y2="5" stroke="#06b6d4" stroke-width="2" />
        <text x="22" y="9" fill="#06b6d4" font-size="10" font-weight="600" font-family="system-ui">EMA 9</text>
        
        <line x1="75" y1="5" x2="91" y2="5" stroke="#f59e0b" stroke-width="2" />
        <text x="97" y="9" fill="#f59e0b" font-size="10" font-weight="600" font-family="system-ui">EMA 30</text>
      </g>
    `;

    return `
      <svg class="sim-snapshot-chart-svg" viewBox="0 0 ${svgW} ${svgH}" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#06150f" rx="10" />
        ${gridLinesSvg}
        ${refLinesSvg}
        ${emaSvg}
        ${candlesSvg}
        ${calloutsSvg}
        ${legendSvg}
      </svg>
    `;
  }

  /**
   * Eventos locais do container
   */
  function bindLocalEvents(container) {
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
        state.filters[fType] = fVal === 'ALL' ? 'ALL' : (fType === 'days' ? Number(fVal) : fVal);
        state.activeDropdown = null;
        render();
      });
    });

    // 1. Painel de Controle: Massa de Teste (Gerar, Reavaliar e Excluir)
    container.querySelector('#simBtnMassModal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.massModalOpen = true;
      state.showClearConfirm = false;
      state.tempScenarioSelection = state.activeScenario || '2R';
      render();
    });

    container.querySelector('#simBtnScenarioModal')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.massModalOpen = true;
      state.showClearConfirm = false;
      state.tempScenarioSelection = state.activeScenario || '2R';
      render();
    });

    // Fechar modal da Massa de Teste
    container.querySelector('#simMassModalClose')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.massModalOpen = false;
      state.showClearConfirm = false;
      render();
    });

    container.querySelector('#simMassModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'simMassModalOverlay') {
        state.massModalOpen = false;
        state.showClearConfirm = false;
        render();
      }
    });

    // Seleção de opção no modal de Massa de Teste
    container.querySelectorAll('[data-scenario-select]').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        state.tempScenarioSelection = opt.dataset.scenarioSelect;
        render();
      });
    });

    // Confirmar geração de massa de teste
    container.querySelector('#simModalConfirmScenario')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.massModalOpen = false;
      state.showClearConfirm = false;
      generateScenarioMass(state.tempScenarioSelection || '2R');
    });

    // Ações da massa atual no painel
    const handleEvaluate = (e) => {
      e.stopPropagation();
      state.massModalOpen = false;
      evaluateActive();
    };
    container.querySelector('#simMassActionEvaluate')?.addEventListener('click', handleEvaluate);
    container.querySelector('#simMassActionEvaluateBtn')?.addEventListener('click', handleEvaluate);

    const handlePromptClear = (e) => {
      e.stopPropagation();
      state.showClearConfirm = true;
      render();
    };
    container.querySelector('#simMassActionClear')?.addEventListener('click', handlePromptClear);
    container.querySelector('#simMassActionClearBtn')?.addEventListener('click', handlePromptClear);

    container.querySelector('#simMassConfirmCancel')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.showClearConfirm = false;
      render();
    });

    container.querySelector('#simMassConfirmClear')?.addEventListener('click', (e) => {
      e.stopPropagation();
      state.showClearConfirm = false;
      state.massModalOpen = false;
      clearAllSimulations();
    });

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

    // Trocar cenário clicando no cabeçalho da tabela comparativa
    container.querySelectorAll('[data-switch-scenario]').forEach(th => {
      th.addEventListener('click', (e) => {
        e.stopPropagation();
        const scen = th.dataset.switchScenario;
        if (scen && scen !== state.activeScenario) {
          generateScenarioMass(scen);
        }
      });
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
        state.filters.tab = btn.dataset.tab;
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

    // Botão Exportar CSV
    container.querySelector('#simExportBtn')?.addEventListener('click', exportFilteredCSV);

    // Botões de Ação na Tabela (Snapshot e Detalhes)
    container.querySelectorAll('.sim-action-btn[data-action="chart"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.snapshotSimId = btn.dataset.simId;
        render();
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
      state.snapshotSimId = simId;
      render();
    });

    container.querySelector('#simModalDelete')?.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.simId;
      if (!id) return;
      await deleteSimulation(id);
    });

    // Fechar snapshot modal
    container.querySelector('#simSnapshotClose')?.addEventListener('click', () => {
      state.snapshotSimId = null;
      render();
    });

    container.querySelector('#simSnapshotCloseBtn')?.addEventListener('click', () => {
      state.snapshotSimId = null;
      render();
    });

    container.querySelector('#simSnapshotModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'simSnapshotModal') {
        state.snapshotSimId = null;
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

    // Re-bind click handlers da tabela
    tbody.querySelectorAll('.sim-action-btn[data-action="chart"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.snapshotSimId = btn.dataset.simId;
        render();
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

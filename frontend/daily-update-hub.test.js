const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const { NavigationSystemModel } = require('./navigation-system-model.js');
const DailyUpdateModel = require('./daily-update-model.js');
const { DailyUpdateHubController } = require('./daily-update.js');

test('DailyUpdateHub: módulo devidamente registrado no NavigationSystemModel e Acesso Rápido', () => {
  const model = new NavigationSystemModel();
  const tree = model.getNavigationTree();

  // Verifica que dailyupdate está em quickAccess
  const quickAccessIds = tree.quickAccess.map(i => i.id);
  assert.ok(quickAccessIds.includes('dailyupdate'), 'dailyupdate deve estar no Acesso Rápido');
  assert.equal(quickAccessIds[0], 'dailyupdate', 'dailyupdate deve ser o primeiro item do Acesso Rápido');

  // Integridade total de 100% dos módulos mantida
  const integrity = model.validateIntegrity(tree);
  assert.equal(integrity.isValid, true);
  assert.equal(integrity.totalModules, integrity.representedCount);
});

test('DailyUpdateHub: index.html contém a seção da página, títulos e links de navegação', () => {
  // 1. Seção da página
  assert.ok(
    indexHtml.includes('id="dailyupdate"'),
    'index.html deve conter a section id="dailyupdate"'
  );
  assert.ok(
    indexHtml.includes('id="dailyUpdateRoot"'),
    'index.html deve conter o container id="dailyUpdateRoot"'
  );

  // 2. Título registrado no catálogo
  assert.ok(
    indexHtml.includes("titles.dailyupdate='Atualização Diária'") || indexHtml.includes("titles.dailyupdate = 'Atualização Diária'"),
    'titles deve conter a entrada para dailyupdate'
  );

  // 3. Botão Fechamento Diário no Topbar
  assert.ok(
    indexHtml.includes("go('dailyupdate')"),
    'Topbar deve conter chamada para go("dailyupdate")'
  );
  assert.ok(
    indexHtml.includes('Fechamento Diário'),
    'Topbar deve conter o botão Fechamento Diário'
  );

  // 4. Inclusão dos assets
  assert.ok(
    indexHtml.includes('frontend/daily-update.css'),
    'index.html deve incluir o arquivo daily-update.css'
  );
  assert.ok(
    indexHtml.includes('frontend/daily-update-model.js'),
    'index.html deve incluir o arquivo daily-update-model.js'
  );
  assert.ok(
    indexHtml.includes('frontend/daily-update.js'),
    'index.html deve incluir o arquivo daily-update.js'
  );
});

test('DailyUpdateHub: atalho contextual disponibilizado dentro de Patrimônio (wealth-dashboard-v2)', () => {
  const wealthJs = fs.readFileSync(path.join(__dirname, 'wealth-dashboard-v2.js'), 'utf8');

  assert.ok(
    wealthJs.includes("go('dailyupdate')"),
    'wealth-dashboard-v2.js deve conter atalho contextual chamando go("dailyupdate")'
  );
  assert.ok(
    wealthJs.includes('btn-daily-update-shortcut'),
    'wealth-dashboard-v2.js deve estilizar o atalho com a classe btn-daily-update-shortcut'
  );
});

test('DailyUpdateHub: modelo e controller operam sem duplicar fontes de dados', () => {
  const model = new DailyUpdateModel();

  assert.equal(typeof model.getConsolidatedRealWealth, 'function');
  assert.equal(typeof model.getDayNominalVariation, 'function');
  assert.equal(typeof model.getDayPercentVariation, 'function');
  assert.equal(typeof model.getTotalExposure, 'function');
  assert.equal(typeof model.getProgress, 'function');
  assert.equal(typeof model.saveDraft, 'function');
  assert.equal(typeof model.loadDraft, 'function');

  // Garante que não há duplicação e os cálculos coincidem com os cards de resumo
  const wealth = model.getConsolidatedRealWealth();
  assert.ok(wealth >= 995000, 'Patrimônio Real deve ser consistente com o fechamento V11');
});

test('DailyUpdateHub Card [02]: DailyUpdateHubController métodos de ação e integração financeira', async () => {
  // Simula ambiente de browser mínimo para o controller
  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  let operationalEquitySet = null;
  let adjustmentPayload = null;
  let dispatchedEvents = [];

  const mockRoot = {
    DailyUpdateModel: DailyUpdateModel,
    healthyTrendApi: {
      isAuthenticated: () => true,
      request: async (url, opts) => {
        if (url === '/api/wealth/adjustments') {
          adjustmentPayload = opts.body;
          return { success: true };
        }
        return {};
      }
    },
    healthyTrendWorkspace: {
      raw: () => null,
      save: (k, v) => mockStorage.setItem(k, JSON.stringify(v))
    },
    setOperationalEquity: (val) => {
      operationalEquitySet = val;
    },
    dispatchEvent: (evt) => {
      dispatchedEvents.push(evt.type);
    },
    showToast: () => {}
  };

  mockRoot.self = mockRoot;

  // Carrega e instancia o controller em contexto controlado
  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  
  const mockDoc = {
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  class MockCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  runFn.call(mockRoot, mockRoot, mockDoc, mockStorage, MockCustomEvent, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  assert.ok(controller, 'DailyUpdateHub controller deve estar instanciado');

  // 1. Testa keepAccount
  controller.model.updateAccountBalance('clear_daniel', 9999);
  assert.equal(controller.model.accounts.find(a => a.id === 'clear_daniel').newBalance, 9999);
  controller.keepAccount('clear_daniel');
  assert.equal(controller.model.accounts.find(a => a.id === 'clear_daniel').status, 'keep');
  assert.equal(controller.model.accounts.find(a => a.id === 'clear_daniel').newBalance, 3068.91);

  // 2. Testa toggleNomadCurrency
  const nomad = controller.model.accounts.find(a => a.id === 'nomad_daniel');
  assert.equal(nomad.inputCurrency, 'BRL');
  controller.toggleNomadCurrency('nomad_daniel');
  assert.equal(nomad.inputCurrency, 'USD');
  controller.toggleNomadCurrency('nomad_daniel');
  assert.equal(nomad.inputCurrency, 'BRL');

  // 3. Testa bloqueio de fechamento se conta estiver pendente
  controller.setPending('genial_daniel');
  assert.equal(controller.model.getProgress().readyToClose, false);
  const saveFailed = await controller.saveDailyClosing();
  assert.equal(saveFailed, false, 'Não deve salvar se houver contas pendentes');

  // 4. Testa keepAllAccounts e fechamento bem-sucedido
  controller.keepAllAccounts();
  assert.equal(controller.model.getProgress().readyToClose, true);

  const saveSuccess = await controller.saveDailyClosing();
  assert.equal(saveSuccess, true, 'Deve salvar com sucesso quando não há pendências');

  // Valida que chamou /api/wealth/adjustments com os dados consolidados
  assert.ok(adjustmentPayload !== null, 'Deve ter chamado /api/wealth/adjustments');
  assert.equal(Math.round(adjustmentPayload.newAmount * 100) / 100, 1014295.73);
  assert.ok(adjustmentPayload.reason.includes('Fechamento Diário'));

  // Valida sincronização global do equity operacional (estritamente investimentos)
  assert.equal(Math.round(operationalEquitySet * 100) / 100, 1000295.73);

  // Valida disparo dos eventos oficiais
  assert.ok(dispatchedEvents.includes('healthyTrend:equityUpdated'));
  assert.ok(dispatchedEvents.includes('healthyTrend:tradesUpdated'));
});

test('DailyUpdateHub Card [03]: DailyUpdateHubController conferência de posições, divergências e eventos', async () => {
  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  let tradeEventPayload = null;
  let dispatchedEvents = [];

  const mockRoot = {
    DailyUpdateModel: DailyUpdateModel,
    operationalState: {
      positions: [
        { id: 'pos_aapl34', asset: 'AAPL34', currentPrice: 103.21 }
      ]
    },
    healthyTrendApi: {
      isAuthenticated: () => true,
      request: async (url, opts) => {
        if (url.includes('/events')) {
          tradeEventPayload = opts.body;
          return { success: true };
        }
        return {};
      }
    },
    healthyTrendWorkspace: {
      raw: () => null,
      save: (k, v) => mockStorage.setItem(k, JSON.stringify(v))
    },
    setOperationalEquity: () => {},
    dispatchEvent: (evt) => {
      dispatchedEvents.push(evt.type);
    },
    showToast: () => {}
  };

  mockRoot.self = mockRoot;

  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);

  const mockDoc = {
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  class MockCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  runFn.call(mockRoot, mockRoot, mockDoc, mockStorage, MockCustomEvent, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  assert.ok(controller);

  // 1. Atualização de preço via controller
  const targetPos = controller.model.positions[0];
  const pendingPos = controller.model.positions[1];
  assert.ok(targetPos && pendingPos, 'Deve haver posições abertas no modelo');

  await controller.updatePositionPrice(targetPos.id, '109,50');
  const pos1 = controller.model.positions.find(p => p.id === targetPos.id);
  assert.equal(pos1.currentPrice, 109.50);
  assert.equal(pos1.status, 'conferida');
  assert.equal(pos1.checked, true);
  assert.equal(mockRoot.operationalState.positions[0].currentPrice, 109.50);
  assert.ok(dispatchedEvents.includes('healthyTrend:tradesUpdated'));

  // 2. Marcação de posição como pendente bloqueia fechamento diário
  controller.setPositionPending(pendingPos.id);
  assert.equal(controller.model.getProgress().readyToClose, false);
  let saveRes = await controller.saveDailyClosing();
  assert.equal(saveRes, false, 'Não deve salvar fechamento com posição pendente');

  // 3. Confirmação individual de posição
  controller.confirmPosition(pendingPos.id);
  assert.equal(controller.model.positions.find(p => p.id === pendingPos.id).checked, true);

  // 4. Sinalização de divergência bloqueia fechamento diário
  controller.model.reportPositionDivergence(targetPos.id, {
    field: 'quantity',
    reported: 150,
    note: 'Custódia diverge'
  });
  assert.equal(controller.model.getProgress().divergences, 1);
  assert.equal(controller.model.getProgress().readyToClose, false);
  saveRes = await controller.saveDailyClosing();
  assert.equal(saveRes, false, 'Não deve salvar fechamento com divergência de custódia ativa');

  // 5. Resolução da divergência restaura aptidão para fechamento
  controller.resolveDivergence(targetPos.id);
  assert.equal(controller.model.getProgress().divergences, 0);
  assert.equal(controller.model.getProgress().readyToClose, true);

  // 6. Confirmação em lote de todas as posições
  controller.confirmAllPositions();
  assert.equal(controller.model.getProgress().positionsComplete, true);

  // 7. Atualização em lote de cotações
  await controller.handleBatchPrices();
  controller.model.positions.forEach(p => {
    assert.equal(p.checked, true);
    assert.equal(p.status, 'conferida');
  });
});

test('DailyUpdateHub Card [04]: fechamento, snapshots históricos, ressalvas e auditoria de reconciliação', async () => {
  const dispatchedEvents = [];
  const apiRequests = [];
  const workspaceSaves = [];
  const storageMap = new Map();

  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  const mockRoot = {
    DailyUpdateModel: DailyUpdateModel,
    showToast: () => {},
    dispatchEvent: (ev) => dispatchedEvents.push(ev.type),
    healthyTrendApi: {
      isAuthenticated: () => true,
      request: async (url, opts) => {
        apiRequests.push({ url, body: opts?.body });
        return { ok: true };
      }
    },
    healthyTrendWorkspace: {
      save: (key, val) => workspaceSaves.push({ key, val })
    },
    setOperationalEquity: (eq) => { mockRoot.operationalEquity = eq; }
  };

  const createdElements = [];
  const mockDoc = {
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: {
      appendChild: (el) => createdElements.push(el),
      removeChild: (el) => {
        const idx = createdElements.indexOf(el);
        if (idx >= 0) createdElements.splice(idx, 1);
      }
    },
    createElement: (tag) => {
      const el = {
        tagName: tag,
        style: {},
        innerHTML: '',
        parentNode: null
      };
      return el;
    }
  };

  class MockCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  runFn.call(mockRoot, mockRoot, mockDoc, mockStorage, MockCustomEvent, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  assert.ok(controller);

  // 1. Fechamento normal bem-sucedido quando 100% pronto
  assert.equal(controller.model.getProgress().readyToClose, true);
  const saveSuccess = await controller.saveDailyClosing();
  assert.equal(saveSuccess, true);
  assert.equal(controller.model.closingStatus, 'CLOSED');

  // Verifica persistência de snapshot no histórico
  const history = controller.model.getHistory(mockStorage);
  assert.ok(history.length >= 1);
  const todaySnap = controller.model.getSnapshotByDate(controller.model.closingDate, mockStorage);
  assert.ok(todaySnap !== null);
  assert.equal(todaySnap.version, 1);
  assert.equal(todaySnap.status, 'closed');
  assert.equal(todaySnap.realWealth, 1014295.73);
  assert.equal(todaySnap.investmentWealth, 1000295.73);
  assert.equal(todaySnap.checkingWealth, 14000.00);

  // Verifica sincronização com API de adjustments e workspace
  assert.ok(apiRequests.some(r => r.url === '/api/wealth/adjustments'));
  assert.ok(workspaceSaves.some(s => s.key === 'healthy-daily-update-history'));

  // 2. Modais e utilitários de reconciliação
  controller.openHistoryModal();
  assert.ok(createdElements.length > 0);

  controller.openReconciliationModal();
  assert.ok(createdElements.length > 0);

  const reconData = controller.model.getSpreadsheetReconciliationData();
  assert.equal(reconData.isFullyReconciled, true);
  assert.equal(reconData.items.length, 6);

  // 3. Fechamento com ressalvas / exceção
  controller.model.setAccountPending('xp_daniel');
  assert.equal(controller.model.getProgress().readyToClose, false);

  const exSnapshot = controller.model.closeWithException('XP com instabilidade momentânea', mockStorage);
  assert.equal(exSnapshot.hasException, true);
  assert.equal(exSnapshot.status, 'closed_with_exception');
  assert.equal(controller.model.closingStatus, 'CLOSED_WITH_EXCEPTION');

  // 4. Correção versionada (v1 -> v2)
  const corrResult = controller.model.correctSnapshot(
    controller.model.closingDate,
    { accounts: controller.model.accounts },
    'Correção manual após conciliação bancária',
    mockStorage
  );
  assert.equal(corrResult.success, true);
  assert.equal(corrResult.snapshot.version, 2);
  assert.equal(corrResult.snapshot.status, 'corrected');
  assert.equal(corrResult.snapshot.corrections.length, 1);
  assert.equal(controller.model.closingStatus, 'CORRECTED');
});

test('DailyUpdateHub Card [05]: renderização da coluna % do Total, badges de participação e recálculo live', () => {
  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');

  // Simula DOM para renderização e teste de recálculo live
  const elementsById = new Map();
  const elementsByAttr = new Map();

  const mockDoc = {
    getElementById: (id) => elementsById.get(id) || null,
    querySelector: (sel) => {
      // Suporta seletor [data-wealth-share-for="<id>"]
      const match = sel.match(/\[data-wealth-share-for=["']?([^"']+)["']?\]/);
      if (match) {
        return elementsByAttr.get(match[1]) || null;
      }
      return null;
    },
    querySelectorAll: () => [],
    addEventListener: () => {},
    body: {
      appendChild: () => {},
      removeChild: () => {}
    },
    createElement: (tag) => ({
      tagName: tag,
      style: {},
      innerHTML: '',
      parentNode: null
    })
  };

  const mockRoot = {
    DailyUpdateModel: DailyUpdateModel,
    showToast: () => {},
    dispatchEvent: () => {},
    healthyTrendApi: {
      isAuthenticated: () => false
    },
    healthyTrendWorkspace: {
      save: () => {}
    }
  };

  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  runFn.call(mockRoot, mockRoot, mockDoc, null, function(){}, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  assert.ok(controller);

  // Registra elementos DOM mockados para simular updateTotalsLive
  const kpiRealWealth = { textContent: '' };
  const tableConsolidatedWealth = { textContent: '' };
  const provisionalHint = { style: {} };
  elementsById.set('kpiRealWealth', kpiRealWealth);
  elementsById.set('tableConsolidatedWealth', tableConsolidatedWealth);
  elementsById.set('wealthDistributionProvisionalHint', provisionalHint);

  const sharePillElements = new Map();
  controller.model.accounts.forEach(acc => {
    const el = {
      textContent: '',
      classList: {
        add: () => {},
        remove: () => {}
      },
      title: ''
    };
    sharePillElements.set(acc.id, el);
    elementsByAttr.set(acc.id, el);
  });

  // Executa updateTotalsLive()
  controller.updateTotalsLive();

  // Verifica que cada elemento recebeu o percentual correto
  const total = controller.model.getConsolidatedRealWealth();
  controller.model.accounts.forEach(acc => {
    const el = sharePillElements.get(acc.id);
    const expectedShare = controller.model.getAccountWealthSharePct(acc, total);
    const expectedFormatted = `${expectedShare.toFixed(2).replace('.', ',')}%`;
    assert.equal(el.textContent, expectedFormatted);
  });
});

test('DailyUpdateHub: aba Evolução da Equity, gráficos SVG independentes e modal Wide', () => {
  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');

  const elementsById = new Map();
  const mockDoc = {
    getElementById: (id) => elementsById.get(id) || null,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    createElement: (tag) => ({
      tagName: tag,
      style: {},
      innerHTML: '',
      parentNode: null
    })
  };

  const mockRoot = {
    DailyUpdateModel: DailyUpdateModel,
    showToast: () => {},
    dispatchEvent: () => {},
    healthyTrendApi: {
      isAuthenticated: () => false
    },
    healthyTrendWorkspace: {
      save: () => {}
    }
  };

  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  runFn.call(mockRoot, mockRoot, mockDoc, null, function(){}, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  assert.ok(controller);

  // 1. Injeta modal de histórico mockado
  let injectedModalHtml = '';
  controller.injectModal = (html, modalId) => {
    injectedModalHtml = html;
  };
  controller.openHistoryModal();

  assert.ok(injectedModalHtml.includes('id="tabBtnEquity"'), 'Modal deve conter o botão da aba Evolução da Equity');
  assert.ok(injectedModalHtml.includes('📈 Evolução da Equity'), 'Botão da aba deve ter o texto com ícone');
  assert.ok(injectedModalHtml.includes('id="historyTabEquity"'), 'Modal deve conter o container da aba');
  assert.ok(injectedModalHtml.includes('id="equityChartTooltip"'), 'Modal deve conter tooltip de hover');

  // 2. Renderização da aba Evolução da Equity
  const equityHtml = controller.renderEquityTabHtml();
  assert.ok(equityHtml.includes('equity-control-bar'), 'Deve conter barra de controles e filtros');
  assert.ok(equityHtml.includes('Variação Patrimonial:'), 'Deve conter a nota metodológica de disclaimer');
  assert.ok(equityHtml.includes('equity-kpis-grid'), 'Deve conter os cards de resumo KPI');
  assert.ok(equityHtml.includes('Evolução da Equity — Daniel'), 'Deve conter card de gráfico do Daniel');
  assert.ok(equityHtml.includes('Evolução da Equity — Natália'), 'Deve conter card de gráfico da Natália');
  assert.ok(equityHtml.includes('Escala Dedicada (Daniel)'), 'Gráfico do Daniel deve ter badge de escala dedicada');
  assert.ok(equityHtml.includes('Escala Dedicada (Natália)'), 'Gráfico da Natália deve ter badge de escala dedicada');
  assert.ok(equityHtml.includes('equity-table-section'), 'Deve conter tabela histórica de fechamentos');
  assert.ok(equityHtml.includes('Examinar ➔'), 'Tabela deve ter ação de examinar snapshot');

  // 3. Teste de filtros de período e titular
  const tabEquityContainer = { innerHTML: '', style: {} };
  elementsById.set('historyTabEquity', tabEquityContainer);

  controller.setEquityPeriod('30D');
  assert.equal(controller.equityPeriod, '30D');
  assert.ok(tabEquityContainer.innerHTML.length > 0);

  controller.setEquityOwner('daniel');
  assert.equal(controller.equityOwner, 'daniel');
  const danielOnlyHtml = controller.renderEquityTabHtml();
  assert.ok(danielOnlyHtml.includes('Titular Selecionado'));
  assert.ok(!danielOnlyHtml.includes('two-cols'), 'Visão de titular individual deve ser coluna única expandida');

  controller.setEquityOwner('both');
  assert.equal(controller.equityOwner, 'both');
  const bothHtml = controller.renderEquityTabHtml();
  assert.ok(bothHtml.includes('two-cols'), 'Visão de ambos deve renderizar dois gráficos lado a lado');

  // 4. Teste de troca de aba
  const tabDetails = { style: {} };
  const tabCompare = { style: {} };
  const btnDetails = { classList: { add: () => {}, remove: () => {}, toggle: () => {} } };
  const btnCompare = { classList: { add: () => {}, remove: () => {}, toggle: () => {} } };
  const btnEquity = { classList: { add: () => {}, remove: () => {}, toggle: () => {} } };

  elementsById.set('historyTabDetails', tabDetails);
  elementsById.set('historyTabCompare', tabCompare);
  elementsById.set('tabBtnDetails', btnDetails);
  elementsById.set('tabBtnCompare', btnCompare);
  elementsById.set('tabBtnEquity', btnEquity);

  controller.switchHistoryTab('equity');
  assert.equal(controller.activeHistoryTab, 'equity');
  assert.equal(tabEquityContainer.style.display, 'block');
  assert.equal(tabDetails.style.display, 'none');
  assert.equal(tabCompare.style.display, 'none');

  // 5. Teste de ação examineSnapshotFromEquity
  let selectedSnapshotDate = null;
  controller.selectHistorySnapshot = (d) => {
    selectedSnapshotDate = d;
  };
  controller.examineSnapshotFromEquity('2026-11-19');
  assert.equal(controller.activeHistoryTab, 'details');
  assert.equal(selectedSnapshotDate, '2026-11-19');
});

test('DailyUpdateHub: renderização dos cards agrupados por titular, subtotais e banner consolidado', () => {
  const elementsById = new Map();
  const elementsByAttr = new Map();

  const mockDoc = {
    getElementById: (id) => elementsById.get(id) || null,
    querySelector: (sel) => {
      if (sel.startsWith('#')) return elementsById.get(sel.slice(1)) || null;
      return elementsByAttr.get(sel) || null;
    },
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const mockRoot = {
    DailyUpdateModel: DailyUpdateModel,
    showToast: () => {},
    dispatchEvent: () => {},
    healthyTrendApi: { isAuthenticated: () => true },
    healthyTrendWorkspace: { raw: () => null, save: () => {} }
  };
  mockRoot.self = mockRoot;

  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  class MockCustomEvent { constructor(t, i) { this.type = t; this.detail = i?.detail; } }
  runFn.call(mockRoot, mockRoot, mockDoc, {}, MockCustomEvent, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  assert.ok(controller, 'DailyUpdateHub controller deve estar instanciado');
  assert.ok(controller.collapsedTitulares instanceof Set);

  // Testa modelo agrupado
  const model = controller.model;
  const realWealth = model.getConsolidatedRealWealth();
  assert.equal(realWealth, 1014295.73);

  const grouped = model.getGroupedAccounts(realWealth);
  assert.equal(grouped.length, 2);

  const danielGroup = grouped.find(g => g.person === 'Daniel');
  assert.ok(danielGroup);
  assert.equal(danielGroup.theme, 'blue');
  assert.equal(danielGroup.count, 6);
  assert.equal(danielGroup.subtotal, 592675.60);
  assert.equal(danielGroup.investmentSubtotal, 578675.60);
  assert.equal(danielGroup.checkingSubtotal, 14000.00);
  assert.equal(danielGroup.sharePct, 58.43);

  const nataliaGroup = grouped.find(g => g.person === 'Natália');
  assert.ok(nataliaGroup);
  assert.equal(nataliaGroup.theme, 'purple');
  assert.equal(nataliaGroup.count, 2);
  assert.equal(nataliaGroup.subtotal, 421620.13);
  assert.equal(nataliaGroup.sharePct, 41.57);

  // Testa toggleTitularGroup
  assert.equal(controller.collapsedTitulares.has('Daniel'), false);
  controller.toggleTitularGroup('Daniel');
  assert.equal(controller.collapsedTitulares.has('Daniel'), true);
  controller.toggleTitularGroup('Daniel');
  assert.equal(controller.collapsedTitulares.has('Daniel'), false);

  // Testa recálculo live com updateTotalsLive()
  const mockSubtotalD = { textContent: '' };
  const mockShareD = { textContent: '' };
  const mockHeaderD = { innerHTML: '' };
  const mockBannerWealth = { textContent: '' };
  const mockBannerDayVar = { innerHTML: '', className: '', style: {} };

  elementsByAttr.set('[data-titular-subtotal="Daniel"]', mockSubtotalD);
  elementsByAttr.set('[data-titular-share="Daniel"]', mockShareD);
  elementsByAttr.set('[data-titular-header-total="Daniel"]', mockHeaderD);
  elementsById.set('tableConsolidatedWealth', mockBannerWealth);
  elementsById.set('tableDayVar', mockBannerDayVar);

  controller.updateTotalsLive();

  assert.equal(mockSubtotalD.textContent, DailyUpdateModel.formatBRL(592675.60));
  assert.equal(mockShareD.textContent, '58,43% do patrimônio');
  assert.ok(mockHeaderD.innerHTML.includes(DailyUpdateModel.formatBRL(592675.60)));
  assert.ok(mockHeaderD.innerHTML.includes('58,43%'));
  assert.equal(mockBannerWealth.textContent, DailyUpdateModel.formatBRL(1014295.73));
});

test('DailyUpdateHub: Integridade e Paridade entre Seção 1 e Evolução da Equity no Controller', () => {
  const elementsById = new Map();
  const elementsByClass = new Map();
  const elementsByAttr = new Map();
  const createdElements = [];
  const eventListeners = [];

  const fakeElement = {
    addEventListener: (ev, fn) => eventListeners.push({ ev, fn }),
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    innerHTML: '',
    textContent: '',
    style: {}
  };

  const mockStorageMap = new Map();
  // Simula histórico corrompido pré-existente no browser com o mock antigo
  mockStorageMap.set('healthy-daily-update-history', JSON.stringify([
    {
      id: 'snap_old_mock',
      date: '2026-11-20',
      realWealth: 1101435.43,
      accounts: [
        { id: 'xp_daniel', person: 'Daniel', newBalance: 207521.00 },
        { id: 'nomad_daniel', person: 'Daniel', newBalance: 105374.00 },
        { id: 'genial_daniel', person: 'Daniel', newBalance: 257418.00 },
        { id: 'clear_daniel', person: 'Daniel', newBalance: 3069.00 },
        { id: 'xp_natalia', person: 'Natália', newBalance: 220328.00 },
        { id: 'genial_natalia', person: 'Natália', newBalance: 307725.43 }
      ]
    }
  ]));

  const mockStorage = {
    getItem: (k) => mockStorageMap.get(k) || null,
    setItem: (k, v) => mockStorageMap.set(k, String(v)),
    removeItem: (k) => mockStorageMap.delete(k)
  };

  const mockDoc = {
    getElementById: (id) => elementsById.get(id) || fakeElement,
    querySelector: (sel) => elementsByAttr.get(sel) || null,
    querySelectorAll: (sel) => elementsByClass.get(sel) || [],
    addEventListener: () => {},
    createElement: (tag) => {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        innerHTML: '',
        style: {},
        setAttribute: () => {},
        appendChild: () => {}
      };
      createdElements.push(el);
      return el;
    },
    body: { appendChild: () => {}, removeChild: () => {} }
  };

  class MockCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  const mockRoot = {
    DailyUpdateModel,
    healthyTrendWorkspace: {
      raw: (k) => mockStorageMap.get(k) || null,
      save: (k, v) => mockStorageMap.set(k, typeof v === 'string' ? v : JSON.stringify(v))
    }
  };

  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  runFn.call(mockRoot, mockRoot, mockDoc, mockStorage, MockCustomEvent, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  assert.ok(controller, 'Controller deve ser instanciado');
  controller.loadSavedState();

  // Verifica que o storage foi higienizado
  const cleaned = JSON.parse(mockStorageMap.get('healthy-daily-update-history'));
  assert.equal(cleaned[0].date, '2026-11-19');
  assert.equal(cleaned[0].realWealth, 1000295.73);

  // Verifica paridade no HTML da aba Evolução da Equity
  const equityHtml = controller.renderEquityTabHtml();
  assert.ok(equityHtml.includes(DailyUpdateModel.formatBRL(578675.60)), 'HTML de Equity deve conter Daniel R$ 578.675,60');
  assert.ok(equityHtml.includes(DailyUpdateModel.formatBRL(421620.13)), 'HTML de Equity deve conter Natália R$ 421.620,13');
  assert.ok(equityHtml.includes(DailyUpdateModel.formatBRL(1000295.73)), 'HTML de Equity deve conter Consolidado R$ 1.000.295,73');
  assert.ok(!equityHtml.includes('1.101.435,43'), 'HTML de Equity NÃO deve conter o valor mock antigo de 1.101.435,43');
  assert.ok(!equityHtml.includes('528.053,43'), 'HTML de Equity NÃO deve conter o valor mock antigo de Natália 528.053,43');
});

test('DailyUpdateHub: Remoção do botão Recarregar da Corretora e Vinculação de Posições a Contas', () => {
  const elementsById = new Map();
  const fakeElement = {
    addEventListener: () => {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    innerHTML: '',
    textContent: '',
    style: {}
  };

  const mockStorageMap = new Map();
  const mockStorage = {
    getItem: (k) => mockStorageMap.get(k) || null,
    setItem: (k, v) => mockStorageMap.set(k, String(v)),
    removeItem: (k) => mockStorageMap.delete(k)
  };

  let renderedHtml = '';
  const mockRoot = {
    DailyUpdateModel,
    healthyTrendWorkspace: {
      raw: (k) => mockStorageMap.get(k) || null,
      save: (k, v) => mockStorageMap.set(k, typeof v === 'string' ? v : JSON.stringify(v))
    }
  };

  const mockDoc = {
    getElementById: (id) => {
      if (id === 'dailyUpdateRoot') {
        return {
          set innerHTML(val) { renderedHtml = val; },
          get innerHTML() { return renderedHtml; },
          querySelectorAll: () => [],
          querySelector: () => null,
          addEventListener: () => {}
        };
      }
      return fakeElement;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
  };

  class MockCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  runFn.call(mockRoot, mockRoot, mockDoc, mockStorage, MockCustomEvent, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  controller.render();

  // 1. Botão "Recarregar da Corretora (em breve)" foi removido
  assert.ok(!renderedHtml.includes('Recarregar da Corretora (em breve)'), 'Botão Recarregar da Corretora NÃO deve estar presente no HTML');
  assert.ok(renderedHtml.includes('Atualizar Preços em Lote'), 'Botão Atualizar Preços em Lote deve permanecer');

  // 2. Coluna "Conta / Corretora" está presente no cabeçalho
  assert.ok(renderedHtml.includes('Conta / Corretora'), 'Coluna Conta / Corretora deve estar presente no thead');

  // 3. Select de vinculação da conta está presente na linha de cada posição
  assert.ok(renderedHtml.includes('pos-account-select'), 'Select de conta da posição deve ser renderizado');
  assert.ok(renderedHtml.includes('handlePositionAccountChange'), 'Chamada handlePositionAccountChange deve existir no onchange');

  // 4. Teste de vinculação no controller via handlePositionAccountChange
  controller.handlePositionAccountChange('pos_aapl34', 'xp_daniel');
  const aapl = controller.model.positions.find(p => p.id === 'pos_aapl34');
  assert.equal(aapl.accountId, 'xp_daniel');
  assert.equal(aapl.broker, 'XP — Daniel');

  // 5. Section 1 exibe a contagem compacta de posições vinculadas à conta (sem poluir com lista de tickers no texto visível)
  controller.render();
  assert.ok(renderedHtml.includes('account-positions-pill'), 'Pill de posições vinculadas deve estar presente na Seção 1');
  assert.ok(renderedHtml.includes('posições'), 'Texto de posições vinculadas deve aparecer de forma compacta');
  assert.ok(renderedHtml.includes('title="Posições vinculadas:'), 'Ticker deve permanecer no tooltip title');
});

test('DailyUpdateHub: Volume Financeiro, Totalizador Sincronizado e Heat Oficial no Controller/DOM', () => {
  let renderedHtml = '';
  const fakeElement = {
    set innerHTML(val) { renderedHtml = val; },
    get innerHTML() { return renderedHtml; },
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    style: {},
    appendChild: () => {},
    querySelector: (sel) => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  let topHeatRendered = false;
  let portfolioHeatRendered = false;
  let tradesUpdatedDispatched = false;

  const mockRoot = {
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    DailyUpdateModel,
    portfolioHeatSnapshot: () => ({ heat: 2.12, status: 'ok' }),
    portfolioHeatLimitPct: () => 5.00,
    renderTopHeat: () => { topHeatRendered = true; },
    renderPortfolioHeat: () => { portfolioHeatRendered = true; },
    dispatchEvent: (ev) => {
      if (ev.type === 'healthyTrend:tradesUpdated') tradesUpdatedDispatched = true;
    },
    operationalState: {
      positions: [
        { id: 'pos_aapl34', asset: 'AAPL34', quantity: 600, currentPrice: 103.21, currentStop: 96.49 }
      ]
    }
  };

  const mockDoc = {
    getElementById: (id) => {
      if (id === 'dailyUpdateRoot') return fakeElement;
      return null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
  };

  class MockCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  runFn.call(mockRoot, mockRoot, mockDoc, mockStorage, MockCustomEvent, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  controller.render();

  // 1. Cabeçalho de Posições em Aberto contém apenas os dois indicadores consolidados (Exposição Total e Resultado)
  assert.ok(renderedHtml.includes('id="headerTotalExposure"'), 'Pílula de Exposição Total deve estar no cabeçalho');
  assert.ok(renderedHtml.includes('id="headerTotalExposurePct"'), 'Percentual da Exposição Total deve estar no cabeçalho');
  assert.ok(renderedHtml.includes('314.302,00'), 'Valor consolidado de 314.302,00 deve estar no cabeçalho');
  assert.ok(renderedHtml.includes('(31,42%)'), 'Percentual de 31,42% deve estar no cabeçalho');
  assert.ok(renderedHtml.includes('id="headerTotalUnrealizedVal"'), 'Pílula de Resultado consolidado deve estar no cabeçalho');
  assert.ok(renderedHtml.includes('id="headerTotalUnrealizedPct"'), 'Percentual do Resultado consolidado deve estar no cabeçalho');

  // 2. Simplificação das tabelas: sem colunas Volume Financeiro, Stop / Trailing ou Status, e sem rodapés/subtotais repetidos
  assert.ok(!renderedHtml.includes('th-pos-volume'), 'Coluna th-pos-volume NÃO deve estar na tabela simplificada');
  assert.ok(!renderedHtml.includes('td-pos-volume'), 'Células td-pos-volume NÃO devem estar na tabela simplificada');
  assert.ok(!renderedHtml.includes('Stop / Trailing'), 'Coluna Stop / Trailing NÃO deve estar na tabela simplificada');
  assert.ok(!renderedHtml.includes('positions-tfoot-row'), 'Linha duplicada de tfoot NÃO deve estar presente');
  assert.ok(!renderedHtml.includes('position-group-subtotal'), 'Subtotais individuais por categoria NÃO devem estar presentes');

  // 3. Menu inferior colado à tabela sem barra duplicada de totalizador
  assert.ok(!renderedHtml.includes('positions-table-totalizer'), 'Barra duplicada positions-table-totalizer NÃO deve ser renderizada');
  assert.ok(renderedHtml.includes('positions-footer'), 'Menu inferior positions-footer deve estar presente');
  assert.ok(renderedHtml.includes('Atualizar Preços em Lote'), 'Botão Atualizar Preços em Lote deve estar no footer');
  assert.ok(renderedHtml.includes('Ir para Posições Abertas'), 'Link Ir para Posições Abertas deve estar no footer');
  assert.ok(!renderedHtml.includes('Conferência c/ Planilha'), 'Botão Conferência c/ Planilha NÃO deve estar presente na tela');

  // 5. Sincronização exata com o KPI 3 (Exposição Atual)
  assert.ok(renderedHtml.includes('id="kpiTotalExposure"'), 'ID kpiTotalExposure deve estar presente no KPI 3');
  assert.ok(renderedHtml.includes('31,42% do patrimônio'), 'Percentual de exposição de 31,42% deve estar presente');

  // 6. Heat do Portfólio oficial (2,12% e limite 5,00% idênticos ao cabeçalho)
  assert.ok(renderedHtml.includes('id="kpiPortfolioHeat"'), 'ID kpiPortfolioHeat deve estar presente no KPI 4');
  assert.ok(renderedHtml.includes('id="kpiHeatLimit"'), 'ID kpiHeatLimit deve estar presente no KPI 4');
  assert.ok(renderedHtml.includes('2,12%'), 'Heat oficial de 2,12% deve ser exibido no KPI 4');
  assert.ok(renderedHtml.includes('Limite: 5,00%'), 'Limite oficial de 5,00% deve ser exibido no KPI 4 (sem 12,50% hardcoded)');

  // 7. Teste de ações do controller e recálculo sincronizado
  // Fechamento de posição (closePosition)
  controller.closePosition('pos_aapl34');
  assert.ok(topHeatRendered, 'renderTopHeat deve ter sido invocado');
  assert.ok(portfolioHeatRendered, 'renderPortfolioHeat deve ter sido invocado');
  assert.ok(tradesUpdatedDispatched, 'Evento healthyTrend:tradesUpdated deve ter sido disparado');
  assert.equal(controller.model.getTotalExposure(), 252376.00);

  // Alteração de quantidade (updatePositionQuantity)
  controller.updatePositionQuantity('pos_amzn34', 250); // de 500 para 250 (-19.257,50)
  assert.equal(controller.model.getTotalExposure(), 252376.00 - 19257.50);

  // Alteração de stop (updatePositionStop)
  const stopRes = controller.updatePositionStop('pos_brav3', 12.50);
  assert.equal(stopRes.success, true);
  assert.equal(controller.model.positions.find(p => p.id === 'pos_brav3').trailingStop, 12.50);
});

test('DailyUpdateHub: Interface Financeira de Contas (Sem coluna Ações, foco em dados e distribuição horizontal)', () => {
  let renderedHtml = '';
  const fakeElement = {
    set innerHTML(val) { renderedHtml = val; },
    get innerHTML() { return renderedHtml; },
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    style: {},
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  const mockRoot = {
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    DailyUpdateModel,
    dispatchEvent: () => {},
    operationalState: { positions: [] }
  };

  const mockDoc = {
    getElementById: (id) => {
      if (id === 'dailyUpdateRoot') return fakeElement;
      return null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
  };

  class MockCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  runFn.call(mockRoot, mockRoot, mockDoc, mockStorage, MockCustomEvent, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  controller.render();

  // 1. Coluna "Ações" completamente removida
  assert.ok(!renderedHtml.includes('th-acc-actions'), 'Coluna th-acc-actions NÃO deve existir no thead');
  assert.ok(!renderedHtml.includes('td-acc-actions'), 'Célula td-acc-actions NÃO deve existir nas linhas');
  assert.ok(!renderedHtml.includes('Ações</th>'), 'Texto Ações NÃO deve estar no cabeçalho das contas');

  // 2. Botões "Manter" e "Pendente" excluídos da interface
  assert.ok(!renderedHtml.includes('btn-action-chip'), 'Chips de ação Manter e Pendente NÃO devem estar presentes');
  assert.ok(!renderedHtml.includes('btn-keep-all'), 'Botão Manter Todos os Saldos NÃO deve estar presente');

  // 3. As 6 colunas canônicas estão perfeitamente distribuídas
  assert.ok(renderedHtml.includes('th-acc-name'), 'Coluna Conta presente');
  assert.ok(renderedHtml.includes('th-acc-type'), 'Coluna Tipo presente');
  assert.ok(renderedHtml.includes('th-acc-prev'), 'Coluna Saldo Anterior presente');
  assert.ok(renderedHtml.includes('th-acc-new'), 'Coluna Novo Saldo presente');
  assert.ok(renderedHtml.includes('th-acc-var'), 'Coluna Variação presente');
  assert.ok(renderedHtml.includes('th-acc-share'), 'Coluna % do Total presente');

  // 4. Identificação visual de titulares e subtotais intactos
  assert.ok(renderedHtml.includes('DANIEL'), 'Titular DANIEL em destaque');
  assert.ok(renderedHtml.includes('NATÁLIA'), 'Titular NATÁLIA em destaque');
  assert.ok(renderedHtml.includes('TOTAL DANIEL'), 'Subtotal de Daniel presente');
  assert.ok(renderedHtml.includes('TOTAL NATÁLIA'), 'Subtotal de Natália presente');
  assert.ok(renderedHtml.includes('PATRIMÔNIO TOTAL CONSOLIDADO'), 'Faixa consolidada presente');

  // 5. Campos de saldo permanecem editáveis diretamente
  assert.ok(renderedHtml.includes('data-account-input="xp_daniel"'), 'Input de XP Daniel editável');
  assert.ok(renderedHtml.includes('data-account-input="bradesco_daniel"'), 'Input de Bradesco Daniel editável');
  assert.ok(renderedHtml.includes('data-account-input="xp_natalia"'), 'Input de XP Natália editável');

  // 6. Atualização direta via modelo funciona sem exigir confirmação individual
  const updated = controller.model.updateAccountBalance('xp_daniel', 215000.00);
  assert.equal(updated.success, true);
  assert.equal(controller.model.accounts.find(a => a.id === 'xp_daniel').newBalance, 215000.00);
  assert.equal(controller.model.getProgress().accountsComplete, true);
});

test('DailyUpdateHub: Coluna Resultado Atual (substituindo Status) e Agrupamento Expansível por Mercado na Tabela de Posições', () => {
  let renderedHtml = '';
  const fakeElement = {
    set innerHTML(val) { renderedHtml = val; },
    get innerHTML() { return renderedHtml; },
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    style: {},
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  const mockRoot = {
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    DailyUpdateModel,
    dispatchEvent: () => {},
    operationalState: { positions: [] }
  };

  const mockDoc = {
    getElementById: (id) => {
      if (id === 'dailyUpdateRoot') return fakeElement;
      return null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
    body: { appendChild: () => {}, removeChild: () => {} }
  };

  class MockCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
  const runFn = new Function('root', 'document', 'localStorage', 'CustomEvent', 'self', code);
  runFn.call(mockRoot, mockRoot, mockDoc, mockStorage, MockCustomEvent, mockRoot);

  const controller = mockRoot.DailyUpdateHub;
  controller.render();

  // 1. Coluna redundante Status foi removida da tabela de posições e substituída por Resultado Atual, e coluna C/V adicionada logo à direita de Ativo
  assert.ok(!renderedHtml.includes('th-pos-status'), 'Coluna th-pos-status NÃO deve estar presente na tabela de posições');
  assert.ok(!renderedHtml.includes('btn-status-dropdown'), 'Botão de dropdown de status Aberta NÃO deve estar presente na tabela');
  assert.ok(renderedHtml.includes('th-pos-cv'), 'Cabeçalho th-pos-cv deve estar presente');
  assert.ok(renderedHtml.includes('>C/V</th>'), 'Título da coluna C/V deve estar presente');
  assert.ok(renderedHtml.includes('th-pos-result'), 'Cabeçalho th-pos-result deve estar presente');
  assert.ok(renderedHtml.includes('Resultado Atual'), 'Título da coluna Resultado Atual deve estar presente');

  // Ordem exata das 8 colunas: Ativo -> C/V -> Conta / Corretora -> Quantidade -> Preço de Entrada -> Preço Atual -> Variação % -> Resultado Atual
  const idxColTicker = renderedHtml.indexOf('th-pos-ticker');
  const idxColCv = renderedHtml.indexOf('th-pos-cv');
  const idxColAcc = renderedHtml.indexOf('th-pos-account');
  const idxColQty = renderedHtml.indexOf('th-pos-qty');
  const idxColEntry = renderedHtml.indexOf('th-pos-entry');
  const idxColPrice = renderedHtml.indexOf('th-pos-price');
  const idxColVar = renderedHtml.indexOf('th-pos-var');
  const idxColRes = renderedHtml.indexOf('th-pos-result');
  assert.ok(
    idxColTicker < idxColCv &&
    idxColCv < idxColAcc &&
    idxColAcc < idxColQty &&
    idxColQty < idxColEntry &&
    idxColEntry < idxColPrice &&
    idxColPrice < idxColVar &&
    idxColVar < idxColRes,
    'As 8 colunas devem seguir a ordem canônica: Ativo -> C/V -> Conta / Corretora -> Quantidade -> Preço de Entrada -> Preço Atual -> Variação % -> Resultado Atual'
  );

  // Badges C (azul) e V (vermelho) exibidos para todas as posições abertas de acordo com a direção real da operação
  assert.ok(renderedHtml.includes('class="pos-cv-badge sell" data-pos-cv="pos_winz26"'), 'WINZ26 deve exibir badge V (sell)');
  assert.ok(renderedHtml.includes('class="pos-cv-badge buy" data-pos-cv="pos_bgix26"'), 'BGIX26 deve exibir badge C (buy) mesmo em prejuízo');
  assert.ok(renderedHtml.includes('class="pos-cv-badge buy" data-pos-cv="pos_bbas3"'), 'BBAS3 deve exibir badge C (buy)');
  assert.ok(renderedHtml.includes('class="pos-cv-badge buy" data-pos-cv="pos_brav3"'), 'BRAV3 deve exibir badge C (buy)');
  assert.ok(renderedHtml.includes('class="pos-cv-badge buy" data-pos-cv="pos_amzn34"'), 'AMZN34 deve exibir badge C (buy)');
  assert.ok(renderedHtml.includes('class="pos-cv-badge buy" data-pos-cv="pos_m2st34"'), 'M2ST34 deve exibir badge C (buy)');
  assert.ok(renderedHtml.includes('class="pos-cv-badge buy" data-pos-cv="pos_aapl34"'), 'AAPL34 deve exibir badge C (buy)');

  // 2. Agrupamento substituído exclusivamente por ESTRATÉGIA: Tendência -> Volatilidade (sem agrupamento por Futuros/Ações/BDRs)
  const idxTrend = renderedHtml.indexOf('data-position-group="TREND_FOLLOWING"');
  const idxVol = renderedHtml.indexOf('data-position-group="VOLATILITY_TRADING"');
  assert.ok(idxTrend > -1, 'Grupo TREND_FOLLOWING (Tendência) deve ser renderizado');
  assert.ok(idxVol > -1, 'Grupo VOLATILITY_TRADING (Volatilidade) deve ser renderizado');
  assert.ok(idxTrend < idxVol, 'Ordem dos grupos deve ser Tendência -> Volatilidade');
  assert.equal(renderedHtml.includes('data-position-group="FUTURES"'), false, 'Agrupamento por Futuros deve ter sido removido');
  assert.equal(renderedHtml.includes('data-position-group="STOCK"'), false, 'Agrupamento por Ações deve ter sido removido');
  assert.equal(renderedHtml.includes('data-position-group="BDR"'), false, 'Agrupamento por BDRs deve ter sido removido');

  // Ordem canônica completa das 12 colunas: Ativo -> Data Entrada -> Estratégia -> C/V -> Conta / Corretora -> Quantidade -> Preço de Entrada -> Preço Atual -> Variação % -> Resultado Atual -> Duração -> Ação
  const idxColDate = renderedHtml.indexOf('th-pos-date');
  const idxColStrategy = renderedHtml.indexOf('th-pos-strategy');
  const idxColDuration = renderedHtml.indexOf('th-pos-duration');
  const idxColAction = renderedHtml.indexOf('th-pos-action');
  assert.ok(
    idxColTicker < idxColDate &&
    idxColDate < idxColStrategy &&
    idxColStrategy < idxColCv &&
    idxColRes < idxColDuration &&
    idxColDuration < idxColAction,
    'As 12 colunas devem seguir exatamente: Ativo -> Data Entrada -> Estratégia -> C/V -> Conta / Corretora -> Quantidade -> Preço de Entrada -> Preço Atual -> Variação % -> Resultado Atual -> Duração -> Ação'
  );

  // Badges de Estratégia e coluna Duração renderizados
  assert.ok(renderedHtml.includes('class="pos-strategy-badge trend" data-pos-strategy="pos_aapl34"'), 'AAPL34 deve exibir badge Tendência');
  assert.ok(renderedHtml.includes('class="pos-strategy-badge trend" data-pos-strategy="pos_winz26"'), 'WINZ26 (Futuro) deve aparecer no grupo Tendência com badge Tendência');
  assert.ok(renderedHtml.includes('class="pos-strategy-badge volatility" data-pos-strategy="pos_brav3"'), 'BRAV3 deve exibir badge Volatilidade');
  assert.ok(renderedHtml.includes('class="pos-strategy-badge volatility" data-pos-strategy="pos_bgix26"'), 'BGIX26 (Futuro) deve aparecer no grupo Volatilidade com badge Volatilidade');
  assert.ok(renderedHtml.includes('data-pos-duration="pos_aapl34"'), 'Coluna Duração deve estar renderizada para AAPL34');

  // 3. Resultados individuais e contagem entre parênteses nos grupos por estratégia sem subtotais repetidos
  assert.ok(renderedHtml.includes('+R$ 1.410,00') || renderedHtml.includes('+R$ 1.410,00'), 'Lucro de AAPL34 (+R$ 1.410,00) deve ser exibido');
  assert.ok(renderedHtml.includes('+R$ 36,00') || renderedHtml.includes('+R$ 36,00'), 'Lucro na venda de WINZ26 (+R$ 36,00) deve ser exibido');
  assert.ok(renderedHtml.includes('-R$ 1.072,50') || renderedHtml.includes('-R$ 1.072,50'), 'Prejuízo de BGIX26 (-R$ 1.072,50) deve ser exibido');
  assert.ok(renderedHtml.includes('data-pos-group-count="TREND_FOLLOWING">(3)</span>'), 'Quantidade (3) ao lado de Tendência deve ser exibida');
  assert.ok(renderedHtml.includes('data-pos-group-count="VOLATILITY_TRADING">(4)</span>'), 'Quantidade (4) ao lado de Volatilidade deve ser exibida');
  assert.ok(!renderedHtml.includes('pos-group-header-metrics'), 'Resultado financeiro no cabeçalho de cada grupo NÃO deve ser exibido');

  // 4. Grupos de estratégia são permanentemente expandidos (sem accordion ou chevrons)
  assert.ok(!renderedHtml.includes('pos-group-toggle-btn'), 'Botão de toggle/accordion não deve ser renderizado');
  assert.ok(!renderedHtml.includes('pos-group-chevron'), 'Chevron de accordion não deve ser renderizado');
  assert.ok(renderedHtml.includes('position-group--trend_following'), 'Grupo de tendência deve estar presente');
  assert.ok(renderedHtml.includes('position-group--volatility_trading'), 'Grupo de volatilidade deve estar presente');

  // 5. Layout horizontal 42% (Atualizar Contas) / 58% (Posições em Aberto) no CSS
  const cssContent = fs.readFileSync(path.join(__dirname, 'daily-update.css'), 'utf8');
  assert.ok(cssContent.includes('minmax(0, 42fr) minmax(0, 58fr)'), 'Grid principal deve redistribuir 42% Atualizar Contas e 58% Posições em Aberto');

  // 6. Status operacional interno continua preservado para regras e fechamento
  assert.equal(controller.model.positions.every(p => p.status === 'conferida'), true);
  assert.equal(controller.model.getProgress().positionsComplete, true);
});

test('DailyUpdateHub — Digitação instantânea em NOVO SALDO: sem travamento, sem reformatar na tecla, sem perder foco e recálculo em tempo real', () => {
  const { parseNumber, formatEditableNumber, formatBRL, formatUSD } = DailyUpdateModel;

  // 1. Parser robusto para digitação intermediária brasileira e internacional
  assert.equal(parseNumber('206335', 'BRL'), 206335);
  assert.equal(parseNumber('206335,', 'BRL'), 206335);
  assert.equal(parseNumber('206335,5', 'BRL'), 206335.5);
  assert.equal(parseNumber('206335,25', 'BRL'), 206335.25);
  assert.equal(parseNumber('206.335', 'BRL'), 206335, 'Milhar brasileiro sem centavos (206.335) não pode virar 206,335');
  assert.equal(parseNumber('R$\u00A0206.335,00', 'BRL'), 206335, 'Non-breaking space em R$ deve ser aceito');
  assert.equal(parseNumber('R$ 14.000', 'BRL'), 14000);
  assert.equal(parseNumber('17759.25', 'USD'), 17759.25);
  assert.equal(parseNumber('17,759', 'USD'), 17759);
  assert.equal(parseNumber('US$ 17,759.25', 'USD'), 17759.25);
  assert.equal(parseNumber('12abc', 'BRL'), null);

  assert.equal(formatEditableNumber(206335, false), '206335,00');
  assert.equal(formatEditableNumber(17759.25, true), '17759.25');

  // 2. Simulação completa de foco -> digitação tecla a tecla -> blur sem re-renderizar a tabela
  const makeMockEl = (extra = {}) => {
    const listeners = new Map();
    const classes = new Set();
    return Object.assign({
      textContent: '',
      innerHTML: '',
      value: '',
      style: {},
      dataset: {},
      isConnected: true,
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        toggle: (c, force) => (force === undefined ? (classes.has(c) ? classes.delete(c) : classes.add(c)) : (force ? classes.add(c) : classes.delete(c))),
        contains: (c) => classes.has(c)
      },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      emit(type, evt = {}) {
        const list = listeners.get(type) || [];
        list.forEach(fn => fn(Object.assign({ target: this, preventDefault() {} }, evt)));
      },
      closest() { return this._row || null; }
    }, extra);
  };

  const xpRow = makeMockEl();
  const xpInput = makeMockEl({ dataset: { accountInput: 'xp_daniel' }, value: formatBRL(207521), _row: xpRow });
  const xpVarTag = makeMockEl();
  const xpShareEl = makeMockEl();
  const xpErrorEl = makeMockEl();

  const nomadRow = makeMockEl();
  const nomadInput = makeMockEl({ dataset: { accountInput: 'nomad_daniel' }, value: formatUSD(17759.25), _row: nomadRow });
  const nomadFxBadge = makeMockEl();
  const nomadUsdVar = makeMockEl();

  const danielSubtotal = makeMockEl({ dataset: { titularSubtotal: 'Daniel' } });
  const danielShare = makeMockEl();
  const danielHeader = makeMockEl();
  const nataliaSubtotal = makeMockEl({ dataset: { titularSubtotal: 'Natália' } });
  const nataliaShare = makeMockEl();
  const nataliaHeader = makeMockEl();
  const kpiRealWealth = makeMockEl();
  const tableConsolidatedWealth = makeMockEl();
  const kpiDayVar = makeMockEl();
  const tableDayVar = makeMockEl();

  const selectorMap = {
    '[data-account-input="xp_daniel"]': xpInput,
    '[data-account-var-for="xp_daniel"]': xpVarTag,
    '[data-wealth-share-for="xp_daniel"]': xpShareEl,
    '[data-account-error-for="xp_daniel"]': xpErrorEl,
    '[data-account-input="nomad_daniel"]': nomadInput,
    '[data-nomad-fx-badge="nomad_daniel"]': nomadFxBadge,
    '[data-account-usd-var-for="nomad_daniel"]': nomadUsdVar,
    '[data-titular-subtotal="Daniel"]': danielSubtotal,
    '[data-titular-share="Daniel"]': danielShare,
    '[data-titular-header-total="Daniel"]': danielHeader,
    '[data-titular-subtotal="Natália"]': nataliaSubtotal,
    '[data-titular-share="Natália"]': nataliaShare,
    '[data-titular-header-total="Natália"]': nataliaHeader,
    '#kpiRealWealth': kpiRealWealth,
    '#tableConsolidatedWealth': tableConsolidatedWealth,
    '#kpiDayVar': kpiDayVar,
    '#tableDayVar': tableDayVar
  };

  const mockContainer = {
    querySelector(sel) { return selectorMap[sel] || null; },
    querySelectorAll(sel) {
      if (sel === '[data-account-input]') return [xpInput, nomadInput];
      if (sel === '[data-titular-subtotal]') return [danielSubtotal, nataliaSubtotal];
      return [];
    }
  };

  const savedWorkspaceCalls = [];
  const mockRoot = {
    DailyUpdateModel,
    dispatchEvent() {},
    healthyTrendWorkspace: {
      save(key, val) { savedWorkspaceCalls.push({ key, val }); }
    }
  };

  const savedDoc = global.document;
  const savedWindow = global.window;
  global.document = {
    activeElement: xpInput,
    getElementById(id) { return selectorMap[`#${id}`] || null; },
    querySelector(sel) { return selectorMap[sel] || null; },
    addEventListener() {}
  };
  global.window = mockRoot;

  try {
    const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
    const fn = new Function('self', 'window', 'document', 'CustomEvent', code);
    fn(mockRoot, mockRoot, global.document, class { constructor(t, o) { this.type = t; this.detail = o?.detail; } });

    const controller = mockRoot.DailyUpdateHub;
    let renderCalls = 0;
    controller.render = () => { renderCalls += 1; };

    controller.cacheLiveDomRefs(mockContainer);
    controller.bindInputs(mockContainer);

    // 2a. Foco desmascara uma única vez para formato editável limpo
    xpInput.emit('focus');
    assert.equal(xpInput.value, '207521,00');

    // 2b. Digitação tecla a tecla (substituição completa -> inteiro -> vírgula -> decimal)
    //     Input.value JAMAIS é reescrito durante input, e totais atualizam imediatamente!
    const keystrokes = [
      { typed: '2', expectedBalance: 2 },
      { typed: '210000', expectedBalance: 210000 },
      { typed: '210000,', expectedBalance: 210000 },
      { typed: '210000,5', expectedBalance: 210000.5 },
      { typed: '210000,50', expectedBalance: 210000.5 }
    ];

    for (const step of keystrokes) {
      xpInput.value = step.typed;
      xpInput.emit('input');
      assert.equal(xpInput.value, step.typed, `Input não deve ser reformatado agressivamente durante digitação (${step.typed})`);
      assert.equal(controller.model.accounts.find(a => a.id === 'xp_daniel').newBalance, step.expectedBalance);

      const expectedTotal = controller.model.getConsolidatedRealWealth();
      const expectedDaniel = controller.model.getTitularSubtotal('Daniel');
      assert.equal(tableConsolidatedWealth.textContent, formatBRL(expectedTotal), 'Patrimônio Total Consolidado deve atualizar em tempo real');
      assert.equal(kpiRealWealth.textContent, formatBRL(expectedTotal), 'KPI Patrimônio Real deve atualizar em tempo real');
      assert.equal(danielSubtotal.textContent, formatBRL(expectedDaniel), 'Total Daniel deve atualizar em tempo real');
    }

    assert.equal(renderCalls, 0, 'Nenhuma re-renderização completa da tabela deve ocorrer durante a digitação');

    // 2c. Blur formata SOMENTE o campo editado no padrão brasileiro e persiste sem chamar render()
    global.document.activeElement = null;
    xpInput.emit('blur');
    assert.equal(xpInput.value, formatBRL(210000.50), 'No blur, valor deve ser formatado no padrão brasileiro R$ 210.000,50');
    assert.equal(renderCalls, 0, 'Blur NÃO deve destruir/re-renderizar a tabela inteira');
    assert.ok(savedWorkspaceCalls.length >= 1, 'Persistência em workspace-state deve ser mantida sem regressão');

    // 2d. Nomad em modo USD atualiza badge cambial e variação USD em tempo real durante input
    const nomadAcc = controller.model.accounts.find(a => a.id === 'nomad_daniel');
    nomadAcc.inputCurrency = 'USD';
    global.document.activeElement = nomadInput;
    nomadInput.emit('focus');
    assert.equal(nomadInput.value, '17759.25');
    nomadInput.value = '18000';
    nomadInput.emit('input');
    assert.equal(nomadAcc.newBalanceUSD, 18000);
    assert.ok(nomadFxBadge.textContent.includes('18,000.00'), 'Badge cambial da Nomad deve atualizar em tempo real durante digitação');
    assert.ok(nomadUsdVar.textContent.includes('% USD'), 'Variação USD da Nomad deve atualizar em tempo real durante digitação');
    assert.equal(renderCalls, 0, 'Digitação na Nomad também não dispara render()');

    // 3. Verifica que telas ocultas (Patrimônio e Capital Intelligence) não re-renderizam durante digitação
    const wealthCode = fs.readFileSync(path.join(__dirname, 'wealth-dashboard-v2.js'), 'utf8');
    const ciCode = fs.readFileSync(path.join(__dirname, 'capital-intelligence.js'), 'utf8');
    assert.ok(wealthCode.includes("dashPage.classList.contains('active')"), 'Patrimônio só deve renderizar em equityUpdated quando estiver ativo');
    assert.ok(ciCode.includes("ciPage && !ciPage.classList.contains('active')"), 'Capital Intelligence só deve redesenhar em equityUpdated quando estiver ativo');
  } finally {
    global.document = savedDoc;
    global.window = savedWindow;
  }
});

test('DailyUpdateHub — Evolução Posições em Aberto: coluna DATA ENTRADA (DD/MM/AAAA), modal de encerramento, Compra/Venda, parcial e transferência para Trades Encerrados', async () => {
  const { formatDateBR, resolvePositionEntryDate } = DailyUpdateModel;

  // 1. Formatação DD/MM/AAAA fiel sem substituir data ausente pela data atual
  assert.equal(formatDateBR('2026-11-13'), '13/11/2026');
  assert.equal(formatDateBR('2026-11-19T17:00:00.000Z'), '19/11/2026');
  assert.equal(formatDateBR(null), '—');
  assert.equal(resolvePositionEntryDate({}), null, 'Não deve inventar a data atual para posição sem data registrada');

  // 2. Cálculos de preview: Compra, Venda (Short), multiplicador de futuros e custos operacionais
  const model = new DailyUpdateModel();

  // Compra (BRAV3: 500 un. @ 14,06 -> saída 16,06 com R$ 10 de custos = +990,00)
  const buyPrev = model.calculatePositionClosePreview('pos_brav3', {
    exitPrice: '16,06',
    exitQuantity: 500,
    exitDate: '2026-11-23',
    costs: '10,00'
  });
  assert.equal(buyPrev.valid, true);
  assert.equal(buyPrev.sideLabel, 'Compra');
  assert.equal(buyPrev.entryDateBR, '11/11/2026');
  assert.equal(buyPrev.grossResult, 1000);
  assert.equal(buyPrev.netResult, 990);
  assert.equal(buyPrev.isFullClose, true);
  assert.equal(buyPrev.isPartial, false);

  // Venda / Short (WINZ26: 2 contratos @ 167.685, mult 0.2 -> queda para 166.685 = lucro +400,00; alta para 168.685 = prejuízo -400,00)
  const shortWinPrev = model.calculatePositionClosePreview('pos_winz26', {
    exitPrice: '166685',
    exitQuantity: 2,
    exitDate: '2026-11-23',
    costs: 0
  });
  assert.equal(shortWinPrev.valid, true);
  assert.equal(shortWinPrev.sideLabel, 'Venda');
  assert.equal(shortWinPrev.entryDateBR, '19/11/2026');
  assert.equal(shortWinPrev.netResult, 400);

  const shortLossPrev = model.calculatePositionClosePreview('pos_winz26', {
    exitPrice: '168685',
    exitQuantity: 2,
    exitDate: '2026-11-23',
    costs: 0
  });
  assert.equal(shortLossPrev.netResult, -400);

  // 3. Encerramento PARCIAL (BRAV3: 500 -> encerra 200 @ 15,06 -> restam 300 em aberto, sem dupla contagem!)
  const partialRes = model.executePositionClose('pos_brav3', {
    exitPrice: 15.06,
    exitQuantity: 200,
    exitDate: '2026-11-23',
    costs: 0
  });
  assert.equal(partialRes.success, true);
  assert.equal(partialRes.isPartial, true);
  assert.equal(partialRes.isFullClose, false);
  const bravAfterPartial = model.positions.find(p => p.id === 'pos_brav3');
  assert.equal(bravAfterPartial.quantity, 300, 'Devem permanecer exatamente 300 ações em aberto');
  assert.equal(bravAfterPartial.entryPrice, 14.06, 'Preço médio de entrada deve ser preservado');
  assert.equal(bravAfterPartial.entryDate, '2026-11-11', 'Data original de entrada deve ser preservada');
  assert.equal(bravAfterPartial.isPartial, true);
  assert.equal(bravAfterPartial.closed, false);
  assert.equal(bravAfterPartial.realizedResult, 200, 'Resultado realizado de 200 ações (+R$ 200,00)');
  // Atualiza preço de mercado restante para 16,06 -> não realizado só sobre as 300 restantes (+R$ 600,00, sem somar os 200 já realizados!)
  bravAfterPartial.currentPrice = 16.06;
  assert.equal(model.getPositionUnrealizedResult(bravAfterPartial), 600, 'Não realizado calcula apenas sobre as 300 ações restantes');
  assert.equal(model.closedPositions.length, 0, 'Saída parcial não modela um trade independente encerrado');
  assert.equal(bravAfterPartial.events.filter(e => e.type === 'peeloff').length, 1);

  // 4. Encerramento INTEGRAL do saldo restante (300 @ 16,06) -> status ENCERRADA, sai das abertas, preserva histórico e vai para closedPositions
  const fullRes = model.executePositionClose('pos_brav3', {
    exitPrice: 16.06,
    exitQuantity: 300,
    exitDate: '2026-11-23',
    costs: 0
  });
  assert.equal(fullRes.success, true);
  assert.equal(fullRes.isFullClose, true);
  assert.equal(bravAfterPartial.status, 'encerrada', 'Status deve virar ENCERRADA sem excluir o registro');
  assert.equal(bravAfterPartial.closed, true);
  assert.equal(bravAfterPartial.quantity, 0);
  assert.equal(bravAfterPartial.entryDate, '2026-11-11', 'Histórico original preservado após encerramento');
  assert.equal(bravAfterPartial.exitDate, '2026-11-23');
  assert.equal(bravAfterPartial.exitPrice, 16.06);
  assert.equal(bravAfterPartial.finalRealizedResult, 800, 'Realizado total acumulado (200 parcial + 600 final = R$ 800,00)');
  assert.equal(model.getGroupedPositions().flatMap(g => g.positions).some(p => p.id === 'pos_brav3'), false, 'Operação encerrada deve sair de Posições em Aberto');
  assert.equal(model.closedPositions.length, 1);
  assert.equal(model.closedPositions[0].ticker, 'BRAV3');
  assert.equal(model.closedPositions[0].status, 'closed');
  assert.equal(model.closedPositions[0].events.length, 3, 'Histórico completo preservado (entry + peeloff + close)');

  // 5. Renderização HTML no Controller + fluxo completo de modal + backend UUID POST /api/trades/:id/events
  let renderedHtml = '';
  let injectedModalHtml = '';
  const apiCalls = [];
  const dispatched = [];
  let syncDbCalled = false;
  let closedViewRendered = false;

  const mockRootEl = {
    set innerHTML(val) { renderedHtml = val; },
    get innerHTML() { return renderedHtml; },
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const modalFieldValues = {
    closePosPrice: '105,00',
    closePosQty: '600',
    closePosDate: '2026-11-23',
    closePosCosts: '0,00'
  };

  const mockRoot = {
    DailyUpdateModel,
    operationalState: {
      positions: [{ id: '11111111-2222-3333-4444-555555555555', asset: 'AAPL34', direction: 'long', entry: 100.86, initialQty: 600, currentPrice: 103.21, events: [] }],
      closedPositions: []
    },
    healthyTrendApi: {
      isAuthenticated: () => true,
      request: async (url, opts) => {
        apiCalls.push({ url, opts });
        return { ok: true, status: 'closed' };
      }
    },
    syncOperationalFromDatabase: async () => { syncDbCalled = true; },
    renderClosedPositionsView: () => { closedViewRendered = true; },
    renderTopHeat: () => {},
    renderPortfolioHeat: () => {},
    showToast: () => {},
    dispatchEvent: (e) => dispatched.push(e.type)
  };

  const savedDoc = global.document;
  const savedWindow = global.window;
  global.document = {
    body: { appendChild: (el) => { injectedModalHtml = el.innerHTML; } },
    createElement: () => ({ id: '', innerHTML: '' }),
    getElementById: (id) => {
      if (id === 'dailyUpdateRoot') return mockRootEl;
      if (id in modalFieldValues) return { value: modalFieldValues[id], addEventListener() {}, focus() {}, select() {} };
      if (id === 'closePosPreviewBox') return { innerHTML: '' };
      if (id === 'closePosErrorBanner') return { textContent: '', style: {} };
      if (id === 'btnConfirmClosePos') return { disabled: false, textContent: '' };
      return null;
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  };
  global.window = mockRoot;

  try {
    const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
    const fn = new Function('self', 'window', 'document', 'CustomEvent', code);
    fn(mockRoot, mockRoot, global.document, class { constructor(t, o) { this.type = t; this.detail = o?.detail; } });

    const controller = mockRoot.DailyUpdateHub;
    // Substitui ID de AAPL34 por UUID real para validar integração backend transacional
    const aapl = controller.model.positions.find(p => p.ticker === 'AAPL34');
    aapl.id = '11111111-2222-3333-4444-555555555555';

    controller.render();

    // Valida coluna DATA ENTRADA próxima a ATIVO + datas originais DD/MM/AAAA + botão Fechar operação
    assert.ok(renderedHtml.includes('th-pos-date'), 'Coluna DATA ENTRADA deve estar presente');
    assert.ok(renderedHtml.includes('>Data Entrada</th>'), 'Cabeçalho Data Entrada deve ser exibido');
    assert.ok(renderedHtml.indexOf('th-pos-ticker') < renderedHtml.indexOf('th-pos-date') && renderedHtml.indexOf('th-pos-date') < renderedHtml.indexOf('th-pos-cv'), 'Data Entrada deve ficar logo após Ativo');
    assert.ok(renderedHtml.includes('13/11/2026'), 'Data original 13/11/2026 deve ser exibida em DD/MM/AAAA');
    assert.ok(renderedHtml.includes('19/11/2026'), 'Data original 19/11/2026 deve ser exibida em DD/MM/AAAA');
    assert.ok(renderedHtml.includes('11/11/2026'), 'Data original 11/11/2026 deve ser exibida em DD/MM/AAAA');
    assert.ok(renderedHtml.includes('title="Fechar operação"'), 'Botão discreto Fechar operação deve existir em cada linha');
    assert.ok(renderedHtml.includes('data-close-position-btn="11111111-2222-3333-4444-555555555555"'));
    assert.ok(renderedHtml.includes('class="pos-entry-clean-input font-numeric'), 'Coluna Preço de Entrada deve renderizar input editável');
    assert.ok(renderedHtml.includes('data-position-entry-id="11111111-2222-3333-4444-555555555555"'));

    // Edita Preço de Entrada enquanto trade ainda está aberto -> PATCH /api/trades/:id e sincroniza operationalState
    const entryEditRes = await controller.updatePositionEntryPrice('11111111-2222-3333-4444-555555555555', '99,50');
    assert.equal(entryEditRes.success, true);
    assert.equal(aapl.entryPrice, 99.5);
    assert.equal(mockRoot.operationalState.positions[0].entry, 99.5);
    assert.equal(apiCalls.length, 1);
    assert.equal(apiCalls[0].url, '/api/trades/11111111-2222-3333-4444-555555555555');
    assert.equal(apiCalls[0].opts.method, 'PATCH');
    assert.equal(JSON.parse(apiCalls[0].opts.body).entryPrice, 99.5);
    apiCalls.length = 0; // limpa para a verificação seguinte do encerramento

    // Abre modal de encerramento e verifica campos obrigatórios
    controller.openClosePositionModal('11111111-2222-3333-4444-555555555555');
    assert.ok(injectedModalHtml.includes('Encerrar Operação — AAPL34'));
    assert.ok(injectedModalHtml.includes('13/11/2026'), 'Modal deve exibir Data de Entrada original');
    assert.ok(injectedModalHtml.includes('id="closePosDate"'));
    assert.ok(injectedModalHtml.includes('id="closePosPrice"'));
    assert.ok(injectedModalHtml.includes('id="closePosQty"'));
    assert.ok(injectedModalHtml.includes('Confirmar Encerramento'));

    // Confirma encerramento -> chama POST /api/trades/:id/events (SEM DELETE), sincroniza banco e dashboards
    const confirmRes = await controller.confirmClosePositionModal('11111111-2222-3333-4444-555555555555');
    assert.equal(confirmRes.success, true);
    assert.equal(apiCalls.length, 1);
    assert.equal(apiCalls[0].url, '/api/trades/11111111-2222-3333-4444-555555555555/events');
    assert.equal(apiCalls[0].opts.method, 'POST');
    const postedBody = JSON.parse(apiCalls[0].opts.body);
    assert.equal(postedBody.type, 'close');
    assert.equal(postedBody.qty, 600);
    assert.equal(postedBody.price, 105);
    assert.ok(postedBody.occurredAt.startsWith('2026-11-23'));
    assert.equal(syncDbCalled, true, 'syncOperationalFromDatabase deve sincronizar Trades Encerrados, Diário e Painel da Verdade');
    assert.equal(closedViewRendered, true, 'renderClosedPositionsView deve ser acionado');
    assert.equal(mockRoot.operationalState.positions.length, 0);
    assert.equal(mockRoot.operationalState.closedPositions.length, 1);
    assert.equal(mockRoot.operationalState.closedPositions[0].status, 'closed');
    assert.ok(dispatched.includes('healthyTrend:tradesUpdated'));
    assert.ok(dispatched.includes('healthyTrend:equityUpdated'));
  } finally {
    global.document = savedDoc;
    global.window = savedWindow;
  }
});

test('DailyUpdateHub — Persistência Ponta a Ponta (Salvar → Limpar Draft → Recarregar → Reabrir), Falhas de Cotação, Concorrência e Altura Uniforme da Nomad', async () => {
  // 1. Storage persistente + workspace-state + backend mock simulando PostgreSQL real
  const localStore = new Map();
  const workspaceStore = new Map();
  const dbTrades = [
    { id: 'aaaa1111-1111-4111-8111-111111111111', ticker: 'BBAS3', status: 'open', direction: 'long', strategy_type: 'VOLATILITY_TRADING', total_quantity: 300, average_entry_price: 15.48, stop_price: 0, executed_at: '2026-11-13T14:00:00Z', metadata: {}, events: [] },
    { id: 'bbbb2222-2222-4222-8222-222222222222', ticker: 'AAPL34', status: 'open', direction: 'long', strategy_type: 'TREND_FOLLOWING', total_quantity: 600, average_entry_price: 100.86, stop_price: 96.49, executed_at: '2026-11-13T14:00:00Z', metadata: {}, events: [] },
    { id: 'cccc3333-3333-4333-8333-333333333333', ticker: 'WINZ26', status: 'open', direction: 'short', strategy_type: 'TREND_FOLLOWING', total_quantity: 2, average_entry_price: 167685, stop_price: 174435, executed_at: '2026-11-19T14:00:00Z', metadata: { contractMult: 0.2 }, events: [] }
  ];

  const mockLocalStorage = {
    getItem: (k) => localStore.has(k) ? localStore.get(k) : null,
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  };

  function createSessionEnv() {
    let renderedHtml = '';
    const listeners = new Map();
    const mockRootEl = {
      set innerHTML(val) { renderedHtml = val; },
      get innerHTML() { return renderedHtml; },
      querySelector: () => null,
      querySelectorAll: () => []
    };
    const mockWorkspace = {
      raw: (k) => workspaceStore.has(k) ? workspaceStore.get(k) : null,
      save: (k, v) => workspaceStore.set(k, typeof v === 'string' ? v : JSON.stringify(v))
    };
    const mockApi = {
      isAuthenticated: () => true,
      request: async (url, opts = {}) => {
        if (url === '/api/trades?status=open') {
          return {
            trades: dbTrades.map(t => ({
              ...t,
              account_id: t.metadata.accountId ?? null,
              accountId: t.metadata.accountId ?? null,
              broker: t.metadata.broker ?? null,
              current_price: t.metadata.currentPrice ?? null,
              currentPrice: t.metadata.currentPrice ?? null,
              price_updated_at: t.metadata.priceUpdatedAt ?? null,
              price_source: t.metadata.priceSource ?? null
            }))
          };
        }
        const patchMatch = url.match(/^\/api\/trades\/([0-9a-f-]+)$/i);
        if (patchMatch && opts.method === 'PATCH') {
          const trade = dbTrades.find(t => t.id === patchMatch[1]);
          const bodyObj = typeof opts.body === 'string' ? JSON.parse(opts.body) : (opts.body || {});
          if (trade) {
            if (bodyObj.accountId !== undefined) trade.metadata.accountId = bodyObj.accountId;
            if (bodyObj.broker !== undefined) trade.metadata.broker = bodyObj.broker;
            if (Number(bodyObj.currentPrice) > 0) {
              trade.metadata.currentPrice = Number(bodyObj.currentPrice);
              trade.metadata.priceUpdatedAt = bodyObj.priceUpdatedAt || new Date().toISOString();
              trade.metadata.priceSource = bodyObj.priceSource || 'manual';
            }
            if (Number(bodyObj.entryPrice) > 0) {
              trade.average_entry_price = Number(bodyObj.entryPrice);
            }
          }
          return { ok: true, trade };
        }
        if (url.startsWith('/api/market-data/ticker-chart')) {
          throw new Error('Provider temporarily unavailable');
        }
        return { ok: true };
      }
    };
    const mockRoot = {
      DailyUpdateModel,
      localStorage: mockLocalStorage,
      healthyTrendWorkspace: mockWorkspace,
      healthyTrendApi: mockApi,
      operationalState: { positions: [], closedPositions: [] },
      showToast: () => {},
      renderTopHeat: () => {},
      renderPortfolioHeat: () => {},
      addEventListener: (type, cb) => {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(cb);
      },
      dispatchEvent: (ev) => {
        const list = listeners.get(ev.type) || [];
        list.forEach(fn => fn(ev));
      }
    };
    const mockDoc = {
      getElementById: (id) => {
        if (id === 'dailyUpdateRoot') return mockRootEl;
        if (id === 'dailyupdate') return { classList: { contains: (c) => c === 'active' } };
        return null;
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {}
    };
    const code = fs.readFileSync(path.join(__dirname, 'daily-update.js'), 'utf8');
    const savedLS = global.localStorage;
    const savedDoc = global.document;
    const savedWin = global.window;
    global.localStorage = mockLocalStorage;
    global.document = mockDoc;
    global.window = mockRoot;
    try {
      const fn = new Function('self', 'window', 'document', 'localStorage', 'CustomEvent', code);
      fn(mockRoot, mockRoot, mockDoc, mockLocalStorage, class { constructor(t, o) { this.type = t; this.detail = o?.detail; } });
    } finally {
      global.localStorage = savedLS;
      global.document = savedDoc;
      global.window = savedWin;
    }
    return { mockRoot, controller: mockRoot.DailyUpdateHub, getHtml: () => renderedHtml, mockDoc };
  }

  // === SESSÃO 1: Usuário abre a tela, altera corretoras, preços, entrada, conta Nomad e SALVA ===
  const savedLS = global.localStorage;
  const savedDoc = global.document;
  const savedWin = global.window;
  try {
    const s1 = createSessionEnv();
    global.localStorage = mockLocalStorage;
    global.document = s1.mockDoc;
    global.window = s1.mockRoot;

    await s1.controller.init();
    assert.equal(s1.controller.model.positions.length, 3);

    // Vincula corretoras em TODAS as posições
    await s1.controller.handlePositionAccountChange('aaaa1111-1111-4111-8111-111111111111', 'xp_daniel');
    await s1.controller.handlePositionAccountChange('bbbb2222-2222-4222-8222-222222222222', 'xp_daniel');
    await s1.controller.handlePositionAccountChange('cccc3333-3333-4333-8333-333333333333', 'genial_daniel');

    // Atualiza preços atuais (inclusive trade de Volatilidade BBAS3 com stop = 0!)
    await s1.controller.updatePositionPrice('aaaa1111-1111-4111-8111-111111111111', '16,25');
    await s1.controller.updatePositionPrice('bbbb2222-2222-4222-8222-222222222222', '104,50');
    await s1.controller.updatePositionPrice('cccc3333-3333-4333-8333-333333333333', '166900');

    // Ajusta preço de entrada de BBAS3 e modo USD + saldo da Nomad
    await s1.controller.updatePositionEntryPrice('aaaa1111-1111-4111-8111-111111111111', '15,20');
    s1.controller.toggleNomadCurrency('nomad_daniel');
    s1.controller.model.updateAccountBalance('nomad_daniel', '18000', true);
    s1.controller.persistDraftNonBlocking();

    // Executa Fechamento Diário (que chama clearDraft()!)
    const closedOk = await s1.controller.saveDailyClosing();
    assert.equal(closedOk, true);

    // Verifica proteção contra falha de rede em handleBatchPrices -> NENHUM preço válido pode desaparecer!
    await s1.controller.handleBatchPrices();
    assert.equal(s1.controller.model.positions.find(p => p.ticker === 'BBAS3').currentPrice, 16.25, 'Falha de rede nunca apaga último preço válido');
    assert.equal(s1.controller.model.positions.find(p => p.ticker === 'BBAS3').priceStale, true, 'Preço mantido em fallback deve ser sinalizado como stale');
    assert.equal(s1.controller.model.positions.find(p => p.ticker === 'AAPL34').currentPrice, 104.5);

    // Verifica que respostas vazias/null/0/atrasadas nunca sobrescrevem cotações válidas
    s1.controller.model.batchUpdatePrices({
      BBAS3: null,
      AAPL34: '',
      WINZ26: { price: 160000, updatedAt: '2020-01-01T00:00:00Z' }
    });
    assert.equal(s1.controller.model.positions.find(p => p.ticker === 'BBAS3').currentPrice, 16.25);
    assert.equal(s1.controller.model.positions.find(p => p.ticker === 'AAPL34').currentPrice, 104.5);
    assert.equal(s1.controller.model.positions.find(p => p.ticker === 'WINZ26').currentPrice, 166900, 'Resposta atrasada não pode sobrescrever cotação mais recente');

    // === SESSÃO 2: Simula RECARREGAMENTO TOTAL DO NAVEGADOR (nova instância, workspaceLoaded, authenticated) ===
    const s2 = createSessionEnv();
    global.document = s2.mockDoc;
    global.window = s2.mockRoot;

    await s2.controller.init();
    s2.mockRoot.dispatchEvent({ type: 'healthyTrend:workspaceLoaded' });
    s2.controller.render();

    const bbasReloaded = s2.controller.model.positions.find(p => p.ticker === 'BBAS3');
    const aaplReloaded = s2.controller.model.positions.find(p => p.ticker === 'AAPL34');
    const winReloaded = s2.controller.model.positions.find(p => p.ticker === 'WINZ26');
    const nomadReloaded = s2.controller.model.accounts.find(a => a.id === 'nomad_daniel');

    assert.equal(bbasReloaded.accountId, 'xp_daniel', 'Corretora de BBAS3 deve permanecer vinculada à XP após salvar e recarregar');
    assert.equal(aaplReloaded.accountId, 'xp_daniel', 'Corretora de AAPL34 deve permanecer vinculada à XP após salvar e recarregar');
    assert.equal(winReloaded.accountId, 'genial_daniel', 'Corretora de WINZ26 deve permanecer vinculada à Genial após salvar e recarregar');
    assert.equal(bbasReloaded.currentPrice, 16.25, 'Preço atual de BBAS3 (Volatilidade stop=0) deve persistir após recarregar');
    assert.equal(aaplReloaded.currentPrice, 104.5, 'Preço atual de AAPL34 deve persistir após recarregar');
    assert.equal(winReloaded.currentPrice, 166900, 'Preço atual de WINZ26 deve persistir após recarregar');
    assert.equal(bbasReloaded.entryPrice, 15.2, 'Preço de entrada corrigido de BBAS3 deve persistir após recarregar');
    assert.equal(nomadReloaded.inputCurrency, 'USD', 'Modo USD da Nomad deve persistir após recarregar');
    assert.equal(nomadReloaded.newBalanceUSD, 18000, 'Saldo USD da Nomad deve persistir após recarregar');
    assert.equal(nomadReloaded.newBalance, Math.round(18000 * 5.95 * 100) / 100, 'Conversão USD -> BRL da Nomad preservada');

    // === TESTE DE CONCORRÊNCIA: resposta lenta antiga de syncWithBackend nunca sobrescreve resposta mais recente ===
    let resolveSlow;
    let markSlowEnteredTrades;
    const slowEnteredTrades = new Promise(res => { markSlowEnteredTrades = res; });
    const origReq = s2.mockRoot.healthyTrendApi.request;
    let callCount = 0;
    s2.mockRoot.healthyTrendApi.request = (url, opts) => {
      if (url === '/api/trades?status=open') {
        callCount += 1;
        if (callCount === 1) {
          markSlowEnteredTrades();
          return new Promise(res => { resolveSlow = res; });
        }
        return Promise.resolve({
          trades: [{ ...dbTrades[0], accountId: 'xp_daniel', currentPrice: 17.80, priceUpdatedAt: new Date(Date.now() + 5000).toISOString() }]
        });
      }
      return origReq(url, opts);
    };
    const slowSync = s2.controller.syncWithBackend();
    await slowEnteredTrades;
    const fastSync = s2.controller.syncWithBackend();
    await fastSync;
    // Resolve a requisição antiga com dados velhos (sem conta e preço antigo)
    resolveSlow({ trades: [{ ...dbTrades[0], accountId: null, currentPrice: 11.00, priceUpdatedAt: '2026-11-20T10:00:00Z' }] });
    await slowSync;
    assert.equal(s2.controller.model.positions[0].currentPrice, 17.8, 'Requisição concorrente atrasada nunca deve sobrescrever dados mais recentes');
    assert.equal(s2.controller.model.positions[0].accountId, 'xp_daniel');

    // === PARTE 2: LAYOUT PADRONIZADO DA CONTA NOMAD (MESMA ALTURA DAS DEMAIS LINHAS) ===
    const html2 = s2.getHtml();
    assert.equal(html2.includes('class="nomad-fx-strip"'), false, 'Faixa extra nomad-fx-strip que aumentava altura da linha deve ser removida');
    assert.equal(html2.includes('class="prev-usd-hint'), false, 'Segunda linha prev-usd-hint em Saldo Anterior deve ser removida');
    assert.equal(html2.includes('class="usd-var-hint'), false, 'Segunda linha usd-var-hint em Variação deve ser removida');
    assert.ok(html2.includes('data-nomad-header-fx="true"'), 'Cotação USD/BRL de referência deve aparecer compacta no cabeçalho');
    assert.ok(html2.includes('data-fx-rate-input="true"'), 'Campo editável de cotação USD/BRL deve estar presente no cabeçalho');
    assert.ok(html2.includes('data-nomad-fx-badge="nomad_daniel"'), 'Informações compactas de USD e câmbio continuam visíveis na linha da Nomad');
    assert.ok(html2.includes('btn-currency-toggle-inline'), 'Alternador BRL/USD deve aparecer inline sem aumentar a altura da linha');
    const fxRes = s2.controller.updateUsdFxRate('5,80');
    assert.equal(fxRes.success, true, 'Deve permitir atualizar manualmente o câmbio USD/BRL');
    assert.equal(fxRes.fxRate, 5.80);
    const nomadAfterFx = s2.controller.model.accounts.find(a => a.id === 'nomad_daniel');
    assert.equal(nomadAfterFx.fxRate, 5.80);
    assert.equal(nomadAfterFx.newBalance, Math.round(nomadAfterFx.newBalanceUSD * 5.80 * 100) / 100, 'Saldo em BRL da Nomad é recalculado imediatamente ao alterar o dólar');
    const cssText = fs.readFileSync(path.join(__dirname, 'daily-update.css'), 'utf8');
    assert.ok(cssText.includes('.accounts-table tbody tr.account-row'), 'CSS deve padronizar altura uniforme de todas as linhas de contas');
  } finally {
    global.localStorage = savedLS;
    global.document = savedDoc;
    global.window = savedWin;
  }
});

test('DailyUpdateHub — Ajustes Câmbio USD/BRL (3 casas decimais, layout à direita) e Posições Permanentemente Expandidas (sem accordion e com empty state)', () => {
  const model = new DailyUpdateModel({
    accounts: [
      { id: 'xp_1', label: 'XP Investimentos', person: 'Daniel', type: 'INVESTMENT', previousBalance: 100000, newBalance: 100000, currency: 'BRL' },
      { id: 'nomad_1', label: 'Nomad Global', person: 'Daniel', type: 'INVESTMENT', previousBalanceUSD: 10000, newBalanceUSD: 10000, fxRate: 5.83, currency: 'USD', previousBalance: 58300, newBalance: 58300 }
    ],
    positions: [
      { id: 'pos-trend-1', ticker: 'WALM34', strategy: 'TREND_FOLLOWING', entryPrice: 50, currentPrice: 52, quantity: 100, closed: false, status: 'conferida' }
    ]
  });

  const savedDoc = global.document;
  const mockContainer = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };
  global.document = {
    getElementById: () => mockContainer,
    querySelector: () => null,
    querySelectorAll: () => []
  };

  try {
    const controller = new DailyUpdateHubController({ model });
    controller.render();
    const html = mockContainer.innerHTML;

    // 1. Câmbio USD/BRL com 3 casas decimais e layout à direita
    assert.ok(html.includes('class="account-types-legend-group"'), 'Legendas de tipos de conta devem estar agrupadas');
    assert.ok(html.includes('class="account-fx-header-highlight"'), 'Campo de câmbio deve estar destacado à direita');
    assert.ok(html.includes('value="5,830"'), 'Câmbio deve ser exibido com 3 casas decimais (5,830)');
    assert.ok(html.includes('Câmbio: R$ 5,830'), 'Na linha da Nomad, o câmbio também deve exibir 3 casas decimais');

    // Atualização manual para nova taxa com 3 casas decimais
    const fxRes = controller.updateUsdFxRate('5,835');
    assert.equal(fxRes.success, true);
    assert.equal(fxRes.fxRate, 5.835);
    const updatedNomad = model.accounts.find(a => a.currency === 'USD');
    assert.equal(updatedNomad.newBalance, 58350);

    // 2. Posições em aberto permanentemente expandidas (sem chevron, sem toggle)
    assert.ok(!html.includes('pos-group-toggle-btn'), 'Não deve renderizar botão de expandir/recolher');
    assert.ok(!html.includes('pos-group-chevron'), 'Não deve renderizar chevron');
    assert.ok(!html.includes('togglePositionGroup'), 'Header não deve ter evento de accordion');

    // 3. Ambas as seções Tendência e Volatilidade sempre presentes
    assert.ok(html.includes('data-position-group="TREND_FOLLOWING"'), 'Seção Tendência deve estar presente');
    assert.ok(html.includes('data-position-group="VOLATILITY_TRADING"'), 'Seção Volatilidade deve estar presente');

    // Tendência tem 1 posição -> renderiza tabela
    assert.ok(html.includes('WALM34'), 'WALM34 deve ser renderizado na tabela de Tendência');

    // Volatilidade tem 0 posições -> renderiza empty state simples sem esconder a seção
    assert.ok(html.includes('Nenhuma posição aberta em Volatilidade.'), 'Deve apresentar empty state para Volatilidade');
  } finally {
    global.document = savedDoc;
  }
});

test('DailyUpdateHub — Máscara monetária do Preço Atual/Entrada e recálculo dinâmico das posições', async () => {
  const model = new DailyUpdateModel({
    accounts: [
      { id: 'xp_daniel', label: 'XP - Daniel', person: 'Daniel', type: 'INVESTMENT', previousBalance: 200000, newBalance: 200000, currency: 'BRL' }
    ],
    positions: [
      {
        id: 'pos-test-1',
        ticker: 'JNJB34',
        strategy: 'TREND_FOLLOWING',
        entryPrice: 110.50,
        currentPrice: 106.00,
        quantity: 500,
        accountId: 'xp_daniel',
        currency: 'BRL',
        closed: false,
        status: 'conferida'
      },
      {
        id: 'pos-test-usd',
        ticker: 'AAPL',
        strategy: 'TREND_FOLLOWING',
        entryPrice: 200.00,
        currentPrice: 210.00,
        quantity: 10,
        currency: 'USD',
        fxRate: 5.83,
        closed: false,
        status: 'conferida'
      }
    ]
  });

  const savedDoc = global.document;
  const mockContainer = {
    innerHTML: '',
    querySelectorAll: () => [],
    querySelector: () => null
  };
  global.document = {
    getElementById: () => mockContainer,
    querySelector: () => null,
    querySelectorAll: () => []
  };

  try {
    const controller = new DailyUpdateHubController({ model });
    controller.render();
    const html = mockContainer.innerHTML;

    // 1. Formatação monetária inicial conforme moeda do ativo
    assert.ok(html.includes(DailyUpdateModel.formatBRL(106.00)), 'Preço Atual em BRL deve ter máscara monetária');
    assert.ok(html.includes(DailyUpdateModel.formatBRL(110.50)), 'Preço Entrada em BRL deve ter máscara monetária');

    // Para USD: US$ 210.00
    assert.ok(html.includes('value="US$ 210.00"'), 'Preço Atual em USD deve ter máscara monetária US$');

    // 2. Os seletores e atributos de dados necessários para binding estão presentes
    assert.ok(html.includes('data-position-id="pos-test-1"'), 'Input deve conter data-position-id');
    assert.ok(html.includes('data-position-price-input="pos-test-1"'), 'Input deve conter data-position-price-input');
    assert.ok(html.includes('class="pos-price-input pos-price-clean-input'), 'Input deve conter classes de binding');

    // 3. Simula atualização de preço via updatePositionPrice
    const res = await controller.updatePositionPrice('pos-test-1', '108,00');
    assert.equal(res.success, true);
    assert.equal(model.positions[0].currentPrice, 108.00);

    // 4. Recálculo imediato do Resultado Atual e Exposição
    const pnl = model.getPositionUnrealizedResult(model.positions[0]);
    // (108.00 - 110.50) * 500 = -1250
    assert.equal(pnl, -1250);

    const totalExp = model.getTotalExposure();
    // 108 * 500 + 210 * 10 * 5.83 = 54000 + 12243 = 66243
    assert.ok(totalExp > 60000, 'Exposição total deve refletir novo preço');
  } finally {
    global.document = savedDoc;
  }
});

test('DailyUpdateHub — Separação Estrita entre Atualização de Contas (Etapa 1) e Posições em Aberto (Etapa 2)', async () => {
  const model = new DailyUpdateModel({
    accounts: [
      { id: 'xp_test', label: 'XP Teste', person: 'Daniel', type: 'INVESTMENT', currency: 'BRL', previousBalance: 200000.00, newBalance: 200000.00, status: 'keep' },
      { id: 'nomad_test', label: 'Nomad Teste', person: 'Daniel', type: 'INVESTMENT', currency: 'USD', previousBalanceUSD: 10000.00, newBalanceUSD: 10000.00, fxRate: 5.83, previousBalance: 58300.00, newBalance: 58300.00, status: 'keep' },
      { id: 'bradesco_test', label: 'Bradesco Teste', person: 'Daniel', type: 'CHECKING', currency: 'BRL', previousBalance: 10000.00, newBalance: 10000.00, status: 'keep' }
    ],
    positions: [
      {
        id: 'pos_petr4_test',
        ticker: 'PETR4',
        accountId: 'xp_test',
        broker: 'XP Teste',
        strategy: 'TREND_FOLLOWING',
        entryDate: '2026-11-20',
        entryPrice: 30.00,
        currentPrice: 32.00,
        stopPrice: 28.00,
        quantity: 1000,
        currency: 'BRL',
        mult: 1,
        contractMult: 1,
        closed: false,
        status: 'conferida',
        checked: true
      },
      {
        id: 'pos_aapl_test',
        ticker: 'AAPL',
        accountId: 'nomad_test',
        broker: 'Nomad Teste',
        strategy: 'VOLATILITY_TRADING',
        entryDate: '2026-11-22',
        entryPrice: 200.00,
        currentPrice: 210.00,
        stopPrice: 190.00,
        quantity: 20,
        currency: 'USD',
        fxRate: 5.83,
        mult: 1,
        contractMult: 1,
        closed: false,
        status: 'conferida',
        checked: true
      }
    ]
  });

  const domElements = new Map();
  function makeMockEl(id) {
    const el = {
      id,
      textContent: '',
      innerHTML: '',
      className: '',
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      }
    };
    domElements.set(id, el);
    return el;
  }

  makeMockEl('kpiRealWealth');
  makeMockEl('kpiDayVar');
  makeMockEl('kpiExposureVal');
  makeMockEl('kpiTotalExposure');
  makeMockEl('kpiExposurePct');
  makeMockEl('headerTotalExposure');
  makeMockEl('headerTotalExposurePct');
  makeMockEl('headerTotalUnrealizedPill');
  makeMockEl('headerTotalUnrealizedVal');
  makeMockEl('headerTotalUnrealizedPct');
  makeMockEl('tableConsolidatedWealth');
  makeMockEl('tableDayVar');
  makeMockEl('badgePositionsChecked');
  makeMockEl('heroStatusPill');

  const savedDoc = global.document;
  global.document = {
    getElementById: (id) => domElements.get(id) || null,
    querySelector: (sel) => null,
    querySelectorAll: () => []
  };

  try {
    const controller = new DailyUpdateHubController({ model });

    // Estado inicial:
    // Patrimônio Real inicial: 200.000 + 58.300 + 10.000 = 268.300,00
    const initialRealWealth = model.getConsolidatedRealWealth();
    assert.equal(initialRealWealth, 268300.00);

    // Exposição inicial:
    // PETR4: 1000 * 32 = 32.000
    // AAPL: 20 * 210 * 5.83 = 24.486
    // Total: 56.486,00
    const initialExposure = model.getTotalExposure();
    assert.equal(initialExposure, 56486.00);

    // =========================================================================
    // CRITÉRIO 1: Edição e salvamento de saldo de conta atualiza Patrimônio Real no topo
    // =========================================================================
    const accRes = model.updateAccountBalance('xp_test', 215000.00);
    assert.equal(accRes.success, true);
    assert.equal(model.accounts.find(a => a.id === 'xp_test').newBalance, 215000.00);

    controller.updateTotalsLive({ scope: 'accounts', accountId: 'xp_test', broadcastNow: true });
    const wealthAfterAcc = model.getConsolidatedRealWealth();
    assert.equal(wealthAfterAcc, 283300.00, 'Patrimônio Real deve aumentar para 283.300,00 (+15.000)');
    assert.ok(domElements.get('kpiRealWealth').textContent.includes('283.300'), 'Topo (KPI Real Wealth) deve refletir novo saldo');

    // =========================================================================
    // CRITÉRIO 5: Atualização de saldo de conta NÃO altera preços ou resultados das posições
    // =========================================================================
    const petr4AfterAcc = model.positions.find(p => p.id === 'pos_petr4_test');
    assert.equal(petr4AfterAcc.currentPrice, 32.00, 'Preço de PETR4 deve permanecer 32.00');
    assert.equal(petr4AfterAcc.entryPrice, 30.00, 'Preço de entrada deve permanecer 30.00');
    assert.equal(petr4AfterAcc.quantity, 1000, 'Quantidade deve permanecer 1000');
    assert.equal(model.getPositionUnrealizedResult(petr4AfterAcc), 2000.00, 'Resultado de PETR4 deve permanecer +2.000,00');

    // =========================================================================
    // CRITÉRIO 2: Atualização do preço atual recalcula resultado, variação % e exposição
    // =========================================================================
    // PETR4 sobe de 32.00 para 35.00 (+3.00/ação => P&L de (35 - 30) * 1000 = +5.000,00)
    const priceRes = await controller.updatePositionPrice('pos_petr4_test', '35,00');
    assert.equal(priceRes.success, true);
    assert.equal(petr4AfterAcc.currentPrice, 35.00);

    const newPnl = model.getPositionUnrealizedResult(petr4AfterAcc);
    assert.equal(newPnl, 5000.00, 'Resultado Atual de PETR4 deve recalcular para +5.000,00');

    const newVarPct = model.getPositionUnrealizedPct(petr4AfterAcc);
    // (35 - 30) / 30 = 16.67%
    assert.ok(Math.abs(newVarPct - 16.67) < 0.05, 'Variação % de PETR4 deve ser ~16.67%');

    const newExposure = model.getTotalExposure();
    // PETR4: 1000 * 35 = 35.000
    // AAPL: 24.486
    // Total Exposição: 59.486,00
    assert.equal(newExposure, 59486.00, 'Exposição total deve aumentar em 3.000,00');
    assert.ok(domElements.get('kpiExposureVal').textContent.includes('59.486') || domElements.get('headerTotalExposure').textContent.includes('59.486'));

    // =========================================================================
    // CRITÉRIO 3: Atualização do preço da posição NÃO altera o saldo de nenhuma conta!
    // =========================================================================
    const xpAccAfterPrice = model.accounts.find(a => a.id === 'xp_test');
    assert.equal(xpAccAfterPrice.newBalance, 215000.00, 'Saldo da conta XP deve permanecer 215.000,00 (independente da cotação)');
    const nomadAccAfterPrice = model.accounts.find(a => a.id === 'nomad_test');
    assert.equal(nomadAccAfterPrice.newBalanceUSD, 10000.00, 'Saldo da Nomad deve permanecer US$ 10.000,00');

    // =========================================================================
    // CRITÉRIO 4: Atualização do preço da posição NÃO altera o Patrimônio Real (Total)!
    // =========================================================================
    const wealthAfterPrice = model.getConsolidatedRealWealth();
    assert.equal(wealthAfterPrice, 283300.00, 'Patrimônio Real deve continuar rigorosamente 283.300,00');

    // =========================================================================
    // CRITÉRIO 8: Sem dupla contagem de valor bruto de posições no patrimônio total
    // =========================================================================
    // Patrimônio Real = soma dos saldos das contas (215.000 + 58.300 + 10.000 = 283.300)
    // NÃO deve somar a exposição bruta das posições (59.486) sobre os saldos das contas
    assert.equal(model.getConsolidatedRealWealth(), 283300.00);
    assert.notEqual(model.getConsolidatedRealWealth(), 283300.00 + newExposure, 'Proibida dupla contagem de posições no patrimônio');

    // =========================================================================
    // CRITÉRIO 6: Atualizações sequenciais independentes (contas -> posições e posições -> contas)
    // =========================================================================
    // 6a. Atualiza posição AAPL: 210 -> 220 USD
    await controller.updatePositionPrice('pos_aapl_test', '220.00');
    assert.equal(model.positions.find(p => p.id === 'pos_aapl_test').currentPrice, 220.00);
    assert.equal(model.accounts.find(a => a.id === 'nomad_test').newBalanceUSD, 10000.00, 'Saldo da conta não move ao alterar cotação');
    assert.equal(model.getConsolidatedRealWealth(), 283300.00, 'Patrimônio Real intocado');

    // 6b. Em seguida, atualiza conta Nomad: 10.000 -> 12.000 USD
    model.updateAccountBalance('nomad_test', 12000.00, true);
    controller.updateTotalsLive({ scope: 'accounts', accountId: 'nomad_test', broadcastNow: true });
    assert.equal(model.accounts.find(a => a.id === 'nomad_test').newBalanceUSD, 12000.00);
    assert.equal(model.accounts.find(a => a.id === 'nomad_test').newBalance, Math.round(12000 * 5.83 * 100) / 100); // 69.960,00
    // Posições continuam intactas
    assert.equal(model.positions.find(p => p.id === 'pos_aapl_test').currentPrice, 220.00);
    assert.equal(model.positions.find(p => p.id === 'pos_petr4_test').currentPrice, 35.00);
    // Patrimônio Real agora reflete o novo saldo da Nomad
    assert.equal(model.getConsolidatedRealWealth(), 215000.00 + 69960.00 + 10000.00);

    // =========================================================================
    // CRITÉRIO 7: Recarregar a página mantém ambos os conjuntos consistentes e independentes
    // =========================================================================
    const mockStorage = {
      _data: new Map(),
      getItem(k) { return this._data.get(k) || null; },
      setItem(k, v) { this._data.set(k, String(v)); },
      removeItem(k) { this._data.delete(k); }
    };

    // Salva contas e metadados de posições
    model.saveAccounts(mockStorage);
    model.savePositionMeta(mockStorage);
    model.saveDraft(mockStorage);

    // Novo modelo limpo simulando F5 / page reload
    const reloadedModel = new DailyUpdateModel({
      accounts: JSON.parse(mockStorage.getItem('healthy-daily-update-accounts')),
      positions: [
        { id: 'pos_petr4_test', ticker: 'PETR4', entryPrice: 30.00, currentPrice: 30.00, quantity: 1000 },
        { id: 'pos_aapl_test', ticker: 'AAPL', entryPrice: 200.00, currentPrice: 200.00, quantity: 20 }
      ]
    });
    reloadedModel.loadDraft(mockStorage);

    // Contas recarregadas preservadas
    assert.equal(reloadedModel.accounts.find(a => a.id === 'xp_test').newBalance, 215000.00);
    assert.equal(reloadedModel.accounts.find(a => a.id === 'nomad_test').newBalanceUSD, 12000.00);
    // Posições com preços preservados
    const reloadedPetr = reloadedModel.positions.find(p => p.id === 'pos_petr4_test');
    assert.equal(reloadedPetr.currentPrice, 35.00);
    // Patrimônio independente
    assert.equal(reloadedModel.getConsolidatedRealWealth(), 215000.00 + 69960.00 + 10000.00);

    // =========================================================================
    // CRITÉRIO 10: Canonical financials e serviços compartilhados permanecem consistentes
    // =========================================================================
    const fin = DailyUpdateModel.getConsolidatedFinancials(mockStorage);
    assert.ok(fin, 'Serviço financeiro unificado deve responder');
    assert.equal(typeof fin.realWealth, 'number');
    assert.equal(typeof fin.investmentWealth, 'number');
    assert.equal(typeof fin.allocatedCapital, 'number');
    assert.equal(typeof fin.availableCash, 'number');
  } finally {
    global.document = savedDoc;
  }
});

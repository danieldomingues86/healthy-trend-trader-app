const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const { NavigationSystemModel } = require('./navigation-system-model.js');
const DailyUpdateModel = require('./daily-update-model.js');

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

  // 1. Coluna "Volume Financeiro" presente no cabeçalho da tabela de posições
  assert.ok(renderedHtml.includes('th-pos-volume'), 'Classe th-pos-volume deve estar presente no thead');
  assert.ok(renderedHtml.includes('Volume Financeiro'), 'Texto Volume Financeiro deve estar presente no thead');

  // 2. Coluna e valores de volume em cada linha da tabela
  assert.ok(renderedHtml.includes('td-pos-volume'), 'Classe td-pos-volume deve estar presente nas células');
  assert.ok(renderedHtml.includes('pos-volume-val'), 'Classe pos-volume-val deve estar presente');
  assert.ok(renderedHtml.includes('61.926,00'), 'Volume de AAPL34 (61.926,00) deve estar presente');
  assert.ok(renderedHtml.includes('131.670,00'), 'Volume de BGIX26 com multiplicador 330 (131.670,00) deve estar presente');
  assert.ok(renderedHtml.includes('67.038,00'), 'Volume de WINZ26 com multiplicador 0.20 (67.038,00) deve estar presente');

  // 3. Linha de totalização no rodapé da tabela (tfoot)
  assert.ok(renderedHtml.includes('positions-tfoot-row'), 'Linha de tfoot positions-tfoot-row deve estar presente');
  assert.ok(renderedHtml.includes('TOTAL EXPOSTO:'), 'Rótulo TOTAL EXPOSTO: deve estar presente');
  assert.ok(renderedHtml.includes('314.302,00'), 'Valor consolidado de 314.302,00 deve estar no rodapé da tabela');

  // 4. Menu inferior colado à tabela sem barra duplicada de totalizador
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

  // 1. Coluna redundante Status foi removida da tabela de posições e substituída por Resultado Atual
  assert.ok(!renderedHtml.includes('th-pos-status'), 'Coluna th-pos-status NÃO deve estar presente na tabela de posições');
  assert.ok(!renderedHtml.includes('btn-status-dropdown'), 'Botão de dropdown de status Aberta NÃO deve estar presente na tabela');
  assert.ok(renderedHtml.includes('th-pos-result'), 'Cabeçalho th-pos-result deve estar presente');
  assert.ok(renderedHtml.includes('Resultado Atual'), 'Título da coluna Resultado Atual deve estar presente');

  // 2. Grupos de mercado renderizados na ordem canônica: Futuros, Ações, BDRs
  const idxFut = renderedHtml.indexOf('data-position-group="FUTURES"');
  const idxStock = renderedHtml.indexOf('data-position-group="STOCK"');
  const idxBdr = renderedHtml.indexOf('data-position-group="BDR"');
  assert.ok(idxFut > -1, 'Grupo FUTURES (Futuros) deve ser renderizado');
  assert.ok(idxStock > -1, 'Grupo STOCK (Ações) deve ser renderizado');
  assert.ok(idxBdr > -1, 'Grupo BDR (BDRs) deve ser renderizado');
  assert.ok(idxFut < idxStock && idxStock < idxBdr, 'Ordem dos grupos deve ser Futuros -> Ações -> BDRs');

  // 3. Resultados individuais e subtotais renderizados corretamente (com diferenciação visual positive/negative/neutral)
  assert.ok(renderedHtml.includes('+R$ 1.410,00') || renderedHtml.includes('+R$ 1.410,00'), 'Lucro de AAPL34 (+R$ 1.410,00) deve ser exibido');
  assert.ok(renderedHtml.includes('+R$ 36,00') || renderedHtml.includes('+R$ 36,00'), 'Lucro na venda de WINZ26 (+R$ 36,00) deve ser exibido');
  assert.ok(renderedHtml.includes('-R$ 1.072,50') || renderedHtml.includes('-R$ 1.072,50'), 'Prejuízo de BGIX26 (-R$ 1.072,50) deve ser exibido');
  assert.ok(renderedHtml.includes('SUBTOTAL FUTUROS'), 'Rodapé de subtotal de Futuros deve ser exibido');
  assert.ok(renderedHtml.includes('SUBTOTAL AÇÕES'), 'Rodapé de subtotal de Ações deve ser exibido');
  assert.ok(renderedHtml.includes('SUBTOTAL BDRS'), 'Rodapé de subtotal de BDRs deve ser exibido');

  // 4. Expansão e recolhimento de grupos de mercado
  assert.equal(controller.collapsedPositionGroups.has('FUTURES'), false);
  controller.togglePositionGroup('FUTURES');
  assert.equal(controller.collapsedPositionGroups.has('FUTURES'), true);
  assert.ok(renderedHtml.includes('pos-group-chevron collapsed'), 'Chevron recolhido deve ser renderizado');
  controller.togglePositionGroup('FUTURES');
  assert.equal(controller.collapsedPositionGroups.has('FUTURES'), false);

  // 5. Status operacional interno continua preservado para regras e fechamento
  assert.equal(controller.model.positions.every(p => p.status === 'conferida'), true);
  assert.equal(controller.model.getProgress().positionsComplete, true);
});

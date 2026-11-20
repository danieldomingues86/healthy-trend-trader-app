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
  assert.equal(Math.round(adjustmentPayload.newAmount * 100) / 100, 1000295.73);
  assert.ok(adjustmentPayload.reason.includes('Fechamento Diário'));

  // Valida sincronização global do equity operacional
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
  assert.equal(todaySnap.realWealth, 1000295.73);

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
  assert.equal(reconData.items.length, 5);

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
  assert.equal(realWealth, 1000295.73);

  const grouped = model.getGroupedAccounts(realWealth);
  assert.equal(grouped.length, 2);

  const danielGroup = grouped.find(g => g.person === 'Daniel');
  assert.ok(danielGroup);
  assert.equal(danielGroup.theme, 'blue');
  assert.equal(danielGroup.count, 5);
  assert.equal(danielGroup.subtotal, 578675.60);
  assert.equal(danielGroup.sharePct, 57.85);

  const nataliaGroup = grouped.find(g => g.person === 'Natália');
  assert.ok(nataliaGroup);
  assert.equal(nataliaGroup.theme, 'purple');
  assert.equal(nataliaGroup.count, 2);
  assert.equal(nataliaGroup.subtotal, 421620.13);
  assert.equal(nataliaGroup.sharePct, 42.15);

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

  assert.equal(mockSubtotalD.textContent, DailyUpdateModel.formatBRL(578675.60));
  assert.equal(mockShareD.textContent, '57,85% do patrimônio');
  assert.ok(mockHeaderD.innerHTML.includes(DailyUpdateModel.formatBRL(578675.60)));
  assert.ok(mockHeaderD.innerHTML.includes('57,85%'));
  assert.equal(mockBannerWealth.textContent, DailyUpdateModel.formatBRL(1000295.73));
});

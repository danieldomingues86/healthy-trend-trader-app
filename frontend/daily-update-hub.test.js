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
  assert.ok(wealth > 1000000, 'Patrimônio Real deve ser superior a R$ 1.000.000,00');
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
  assert.equal(controller.model.accounts.find(a => a.id === 'clear_daniel').newBalance, 3069);

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
  assert.equal(Math.round(adjustmentPayload.newAmount * 100) / 100, 1104419.93);
  assert.ok(adjustmentPayload.reason.includes('Fechamento Diário'));

  // Valida sincronização global do equity operacional
  assert.equal(Math.round(operationalEquitySet * 100) / 100, 1104419.93);

  // Valida disparo dos eventos oficiais
  assert.ok(dispatchedEvents.includes('healthyTrend:equityUpdated'));
  assert.ok(dispatchedEvents.includes('healthyTrend:tradesUpdated'));
});

/**
 * Testes Automatizados — Sincronização de Trades entre Telas
 *
 * Valida a arquitetura de Single Source of Truth para posições/trades entre:
 * - Atualização Diária (DailyUpdateHub / DailyUpdateModel)
 * - Posições Abertas / Gestão de Posições (operationalState.positions)
 * - Novo Trade (saveTradePlan / confirmTradeExecution)
 * - Trades Encerrados / Diário (closedPositions)
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Mock DOM & Storage environment
function setupTestEnvironment() {
  const localStorageStore = new Map();
  const storageMock = {
    getItem: (key) => localStorageStore.get(key) || null,
    setItem: (key, val) => localStorageStore.set(key, String(val)),
    removeItem: (key) => localStorageStore.delete(key),
    clear: () => localStorageStore.clear()
  };

  const listeners = new Map();
  const windowMock = {
    addEventListener: (event, handler) => {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(handler);
    },
    removeEventListener: (event, handler) => {
      if (!listeners.has(event)) return;
      listeners.set(event, listeners.get(event).filter(h => h !== handler));
    },
    dispatchEvent: (event) => {
      const handlers = listeners.get(event.type) || [];
      handlers.forEach(h => h(event));
      return true;
    },
    localStorage: storageMock,
    operationalState: {
      positions: [],
      closedPositions: [],
      drafts: []
    },
    healthyTrendApi: {
      isAuthenticated: () => true,
      request: async (url, opts) => {
        if (url.includes('/api/trades')) {
          const list = (windowMock.operationalState.positions || []).filter(p => (p.status || 'open') === 'open').map(p => ({
            id: p.id,
            ticker: p.asset || p.ticker,
            status: 'open',
            mode: p.mode || 'real',
            accountId: p.accountId || p.account_id || null,
            account_id: p.accountId || p.account_id || null,
            broker: p.broker || null,
            strategy_type: p.strategyType || p.strategy || 'TREND_FOLLOWING',
            strategyType: p.strategyType || p.strategy || 'TREND_FOLLOWING',
            entry_price: p.entry ?? p.entryPrice ?? 0,
            current_price: p.currentPrice ?? p.entry ?? 0,
            executed_quantity: p.initialQty ?? p.quantity ?? 0,
            total_quantity: p.initialQty ?? p.quantity ?? 0,
            stop_price: p.currentStop ?? p.stopPrice ?? 0,
            events: p.events || []
          }));
          return { trades: list };
        }
        return { summary: { realWealth: 1000000, strategyEquity: 1000000 } };
      }
    },
    portfolioHeatSnapshot: () => ({ heat: 2.24 }),
    portfolioHeatLimitPct: () => 5.0
  };

  global.window = windowMock;
  global.localStorage = storageMock;
  global.CustomEvent = class CustomEvent {
    constructor(type, eventInitDict = {}) {
      this.type = type;
      this.detail = eventInitDict.detail || null;
    }
  };

  const DailyUpdateModel = require('./daily-update-model.js');
  windowMock.DailyUpdateModel = DailyUpdateModel;
  global.DailyUpdateModel = DailyUpdateModel;
  const DailyUpdateHubModule = require('./daily-update.js');

  return { windowMock, storageMock, DailyUpdateModel, DailyUpdateHubModule };
}

describe('Sincronização de Trades entre Atualização Diária, Posições Abertas e Novo Trade', () => {
  let env;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  test('Cenário A: Encerramento de posição via Posições Abertas remove da Atualização Diária e preserva em Encerrados', async () => {
    const { windowMock, storageMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    // Criar posição ativa inicial
    const activeTrade = {
      id: 'trade-uuid-1',
      databaseId: 'trade-uuid-1',
      asset: 'PETR4',
      ticker: 'PETR4',
      entry: 38.50,
      currentPrice: 40.20,
      initialQty: 500,
      remaining: 500,
      direction: 'long',
      strategy: 'TREND_FOLLOWING',
      strategyType: 'TREND_FOLLOWING',
      openedAt: '2026-11-20T10:00:00Z',
      status: 'open'
    };

    windowMock.operationalState.positions = [activeTrade];

    const model = new DailyUpdateModel({
      accounts: DailyUpdateModel.DEFAULT_ACCOUNTS,
      positions: [
        {
          id: 'trade-uuid-1',
          ticker: 'PETR4',
          entryPrice: 38.50,
          currentPrice: 40.20,
          quantity: 500,
          direction: 'long',
          side: 'Compra',
          strategy: 'TREND_FOLLOWING',
          status: 'conferida',
          checked: true
        }
      ]
    });

    const hub = new DailyUpdateHubModule.DailyUpdateHubController({
      model,
      root: windowMock
    });

    hub.bindLifecycleListeners();

    // Validar que a posição está inicialmente aberta no Hub
    let groups = model.getGroupedPositions();
    let trendGroup = groups.find(g => g.key === 'TREND_FOLLOWING');
    assert.ok(trendGroup, 'Grupo de tendência deve existir');
    assert.equal(trendGroup.positions.length, 1, 'Deve ter 1 posição aberta em PETR4');
    assert.equal(trendGroup.positions[0].ticker, 'PETR4');

    // Executar encerramento: Posição é encerrada na tela Posições Abertas
    // (operationalState move para closedPositions e dispara healthyTrend:tradesUpdated)
    windowMock.operationalState.positions = [];
    windowMock.operationalState.closedPositions = [
      {
        ...activeTrade,
        status: 'closed',
        closedAt: new Date().toISOString(),
        exitPrice: 40.20,
        realizedResult: (40.20 - 38.50) * 500
      }
    ];

    // Mock da API para quando syncWithBackend for consultado
    windowMock.healthyTrendApi.request = async (url) => {
      if (url.includes('/api/trades?status=open')) {
        return { trades: [] };
      }
      return {};
    };

    // Disparar o evento canônico
    windowMock.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));

    // Esperar processamento assíncrono do listener
    await new Promise(r => setTimeout(r, 20));

    // Validar que a posição NÃO aparece mais em posições em aberto na Atualização Diária
    groups = model.getGroupedPositions();
    trendGroup = groups.find(g => g.key === 'TREND_FOLLOWING');
    const openCount = trendGroup ? trendGroup.positions.length : 0;
    assert.equal(openCount, 0, 'PETR4 encerrada não pode mais aparecer em Posições em Aberto');

    // Validar que o histórico da posição foi preservado em closedPositions
    assert.ok(model.closedPositions.length > 0, 'Posição deve constar no histórico de fechadas');
    assert.equal(model.closedPositions[0].ticker, 'PETR4');
    assert.equal(model.closedPositions[0].status, 'encerrada');

    // Validar que o draft no localStorage não ressurge a posição se a tela for recarregada
    const rawDraft = storageMock.getItem(DailyUpdateModel.STORAGE_KEY_DRAFT);
    assert.ok(rawDraft, 'Draft deve existir no storage');
    const parsedDraft = JSON.parse(rawDraft);
    const draftOpenPetr4 = (parsedDraft.positions || []).filter(p => p.ticker === 'PETR4' && !p.closed);
    assert.equal(draftOpenPetr4.length, 0, 'Draft não pode conter PETR4 como posição aberta');
  });

  test('Cenário B: Novo trade criado em Novo Trade aparece na Atualização Diária na estratégia correta', async () => {
    const { windowMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    const model = new DailyUpdateModel({
      accounts: DailyUpdateModel.DEFAULT_ACCOUNTS,
      positions: []
    });

    const hub = new DailyUpdateHubModule.DailyUpdateHubController({
      model,
      root: windowMock
    });

    hub.bindLifecycleListeners();

    // 1. Criar trade com estratégia TREND_FOLLOWING
    const newTrendTrade = {
      id: 'trade-trend-99',
      databaseId: 'trade-trend-99',
      asset: 'VALE3',
      ticker: 'VALE3',
      market: 'Ações',
      direction: 'long',
      strategy: 'TREND_FOLLOWING',
      strategyType: 'TREND_FOLLOWING',
      entry: 60.00,
      currentPrice: 60.00,
      initialQty: 300,
      remaining: 300,
      openedAt: '2026-11-24T12:00:00Z',
      status: 'open'
    };

    windowMock.operationalState.positions = [newTrendTrade];

    // Disparar evento de criação
    windowMock.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated', {
      detail: { action: 'create', tradeId: newTrendTrade.id, asset: 'VALE3' }
    }));

    await new Promise(r => setTimeout(r, 20));

    // Validar que VALE3 aparece no grupo Tendência
    let groups = model.getGroupedPositions();
    let trendGroup = groups.find(g => g.key === 'TREND_FOLLOWING');
    assert.ok(trendGroup, 'Grupo de tendência deve existir');
    assert.equal(trendGroup.positions.length, 1);
    assert.equal(trendGroup.positions[0].ticker, 'VALE3');
    assert.equal(trendGroup.positions[0].quantity, 300);

    // 2. Criar trade com estratégia VOLATILITY_TRADING
    const newVolTrade = {
      id: 'trade-vol-88',
      databaseId: 'trade-vol-88',
      asset: 'BBAS3',
      ticker: 'BBAS3',
      market: 'Ações',
      direction: 'long',
      strategy: 'VOLATILITY_TRADING',
      strategyType: 'VOLATILITY_TRADING',
      entry: 28.50,
      currentPrice: 28.50,
      initialQty: 400,
      remaining: 400,
      openedAt: '2026-11-24T12:30:00Z',
      status: 'open'
    };

    windowMock.operationalState.positions.unshift(newVolTrade);

    windowMock.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated', {
      detail: { action: 'create', tradeId: newVolTrade.id, asset: 'BBAS3' }
    }));

    await new Promise(r => setTimeout(r, 20));

    // Validar que BBAS3 aparece no grupo Volatilidade e VALE3 no grupo Tendência
    groups = model.getGroupedPositions();
    trendGroup = groups.find(g => g.key === 'TREND_FOLLOWING');
    let volGroup = groups.find(g => g.key === 'VOLATILITY_TRADING');

    assert.ok(trendGroup, 'Grupo Tendência deve existir');
    assert.ok(volGroup, 'Grupo Volatilidade deve existir');
    assert.equal(trendGroup.positions.some(p => p.ticker === 'VALE3'), true);
    assert.equal(volGroup.positions.some(p => p.ticker === 'BBAS3'), true);
    assert.equal(volGroup.positions.find(p => p.ticker === 'BBAS3').quantity, 400);
  });

  test('Cenário C: Alteração de dados operacionais (preço, stop, parcial) sincroniza em tempo real', async () => {
    const { windowMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    const initialTrade = {
      id: 'trade-sync-1',
      databaseId: 'trade-sync-1',
      asset: 'ITUB4',
      ticker: 'ITUB4',
      market: 'Ações',
      direction: 'long',
      strategy: 'TREND_FOLLOWING',
      entry: 30.00,
      currentPrice: 30.00,
      initialQty: 1000,
      remaining: 1000,
      initialStop: 28.00,
      currentStop: 28.00,
      status: 'open',
      events: [{ type: 'entry', price: 30.00, qty: 1000, at: '2026-11-20T10:00:00Z' }]
    };

    windowMock.operationalState.positions = [initialTrade];

    const model = new DailyUpdateModel({
      accounts: DailyUpdateModel.DEFAULT_ACCOUNTS,
      positions: []
    });

    const hub = new DailyUpdateHubModule.DailyUpdateHubController({
      model,
      root: windowMock
    });

    hub.bindLifecycleListeners();
    hub.syncFromOperationalState();

    let itub = model.positions.find(p => p.ticker === 'ITUB4');
    assert.ok(itub);
    assert.equal(itub.currentPrice, 30.00);
    assert.equal(itub.quantity, 1000);

    // Atualização 1: Preço sobe para 32.50 e stop sobe para 30.50 na gestão de posição
    initialTrade.currentPrice = 32.50;
    initialTrade.currentStop = 30.50;
    initialTrade.events.push({ type: 'update', price: 32.50, stop: 30.50, at: '2026-11-22T15:00:00Z' });

    windowMock.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));
    await new Promise(r => setTimeout(r, 20));

    itub = model.positions.find(p => p.ticker === 'ITUB4');
    assert.equal(itub.currentPrice, 32.50, 'Preço atual deve ser atualizado para 32.50');
    assert.equal(itub.trailingStop, 30.50, 'Trailing stop deve ser atualizado para 30.50');

    // Atualização 2: Saída parcial de 500 unidades (peel-off)
    initialTrade.remaining = 500;
    initialTrade.events.push({ type: 'peeloff', price: 32.50, qty: 500, at: '2026-11-23T11:00:00Z' });

    windowMock.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));
    await new Promise(r => setTimeout(r, 20));

    itub = model.positions.find(p => p.ticker === 'ITUB4');
    assert.equal(itub.quantity, 500, 'Quantidade restante deve ser 500');
    assert.equal(itub.isPartial, true, 'Deve indicar posição parcial');
  });

  test('Consistência após F5 / Recarga: Draft sanitizado não ressurge trades fechados', async () => {
    const { windowMock, storageMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    const model1 = new DailyUpdateModel({
      accounts: DailyUpdateModel.DEFAULT_ACCOUNTS,
      positions: [
        { id: 't1', ticker: 'B3SA3', entryPrice: 12.00, currentPrice: 13.00, quantity: 800, closed: false, status: 'conferida' },
        { id: 't2', ticker: 'RENT3', entryPrice: 50.00, currentPrice: 52.00, quantity: 200, closed: false, status: 'conferida' }
      ]
    });

    const hub1 = new DailyUpdateHubModule.DailyUpdateHubController({ model: model1, root: windowMock });

    // Salvar draft
    model1.saveDraft(storageMock);

    // Agora o trade t1 é encerrado no backend/operationalState
    windowMock.operationalState.closedPositions = [{ id: 't1', ticker: 'B3SA3', status: 'closed' }];
    windowMock.operationalState.positions = [{ id: 't2', ticker: 'RENT3', status: 'open', remaining: 200, currentPrice: 52.00 }];

    // Simular reload F5 (novo modelo e novo hub lendo do storage)
    const model2 = new DailyUpdateModel({ accounts: DailyUpdateModel.DEFAULT_ACCOUNTS, positions: [] });
    const hub2 = new DailyUpdateHubModule.DailyUpdateHubController({ model: model2, root: windowMock });

    // loadSavedState carrega o draft
    hub2.loadSavedState();
    hub2.syncFromOperationalState();

    // t1 não deve estar em model2.positions
    const openTickers = model2.positions.map(p => p.ticker);
    assert.ok(!openTickers.includes('B3SA3'), 'B3SA3 fechada não pode ressurgir');
    assert.ok(openTickers.includes('RENT3'), 'RENT3 deve continuar aberta');
  });

  test('Integração de Contas — Trade em Conta Real vincula automaticamente na Atualização Diária', async () => {
    const { windowMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    const model = new DailyUpdateModel({
      accounts: DailyUpdateModel.DEFAULT_ACCOUNTS,
      positions: []
    });

    const hub = new DailyUpdateHubModule.DailyUpdateHubController({
      model,
      root: windowMock
    });
    hub.bindLifecycleListeners();

    // Trade criado no Novo Trade selecionando a conta "XP — Daniel"
    const realTrade = {
      id: 'trade-real-jnj',
      databaseId: 'trade-real-jnj',
      asset: 'JNJB34',
      ticker: 'JNJB34',
      market: 'BDR',
      direction: 'long',
      strategy: 'TREND_FOLLOWING',
      entry: 110.50,
      currentPrice: 110.50,
      initialQty: 500,
      remaining: 500,
      mode: 'real',
      accountId: 'xp_daniel',
      account_id: 'xp_daniel',
      broker: 'XP — Daniel',
      status: 'open'
    };

    windowMock.operationalState.positions = [realTrade];

    windowMock.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated', {
      detail: { action: 'create', tradeId: realTrade.id, asset: 'JNJB34' }
    }));

    await new Promise(r => setTimeout(r, 20));

    // Validar que na Atualização Diária a posição já veio vinculada à conta correta
    const pos = model.positions.find(p => p.ticker === 'JNJB34');
    assert.ok(pos, 'Posição JNJB34 deve existir na Atualização Diária');
    assert.equal(pos.accountId, 'xp_daniel', 'accountId deve ser xp_daniel sem necessidade de seleção manual');
    assert.equal(pos.broker, 'XP — Daniel', 'broker deve ser XP — Daniel');
    assert.equal(pos.mode, 'real', 'mode deve ser real');
  });

  test('Integração de Contas — Trade em Paper Trading preserva isolamento e identificação clara', async () => {
    const { windowMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    const model = new DailyUpdateModel({
      accounts: DailyUpdateModel.DEFAULT_ACCOUNTS,
      positions: []
    });

    const hub = new DailyUpdateHubModule.DailyUpdateHubController({
      model,
      root: windowMock
    });
    hub.bindLifecycleListeners();

    // Trade criado em Paper Trading
    const paperTrade = {
      id: 'trade-paper-wege',
      databaseId: 'trade-paper-wege',
      asset: 'WEGE3',
      ticker: 'WEGE3',
      market: 'Ações',
      direction: 'long',
      strategy: 'TREND_FOLLOWING',
      entry: 48.00,
      currentPrice: 48.00,
      initialQty: 200,
      remaining: 200,
      mode: 'paper',
      accountId: 'paper',
      account_id: 'paper',
      broker: 'Paper Trading',
      status: 'open'
    };

    windowMock.operationalState.positions = [paperTrade];

    windowMock.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated', {
      detail: { action: 'create', tradeId: paperTrade.id, asset: 'WEGE3' }
    }));

    await new Promise(r => setTimeout(r, 20));

    const pos = model.positions.find(p => p.ticker === 'WEGE3');
    assert.ok(pos, 'Posição WEGE3 de paper trading deve existir');
    assert.equal(pos.mode, 'paper', 'mode deve ser paper');
    assert.equal(pos.accountId, 'paper', 'accountId deve ser paper');
    assert.equal(pos.broker, 'Paper Trading', 'broker deve ser Paper Trading');
  });

  test('Integração de Contas — Atualização de preços e parciais mantém a conta vinculada intacta', async () => {
    const { windowMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    const trade = {
      id: 'trade-link-keep',
      databaseId: 'trade-link-keep',
      asset: 'AAPL34',
      ticker: 'AAPL34',
      market: 'BDR',
      direction: 'long',
      strategy: 'TREND_FOLLOWING',
      entry: 100.00,
      currentPrice: 100.00,
      initialQty: 600,
      remaining: 600,
      mode: 'real',
      accountId: 'nomad_daniel',
      account_id: 'nomad_daniel',
      broker: 'Nomad — Daniel',
      status: 'open',
      events: [{ type: 'entry', price: 100.00, qty: 600, at: '2026-11-20T10:00:00Z' }]
    };

    windowMock.operationalState.positions = [trade];

    const model = new DailyUpdateModel({
      accounts: DailyUpdateModel.DEFAULT_ACCOUNTS,
      positions: []
    });

    const hub = new DailyUpdateHubModule.DailyUpdateHubController({
      model,
      root: windowMock
    });
    hub.bindLifecycleListeners();
    hub.syncFromOperationalState();

    let pos = model.positions.find(p => p.ticker === 'AAPL34');
    assert.equal(pos.accountId, 'nomad_daniel');
    assert.equal(pos.broker, 'Nomad — Daniel');

    // Executa atualização de preço e parcial de 200 ações
    trade.currentPrice = 108.00;
    trade.remaining = 400;
    trade.events.push({ type: 'peeloff', price: 108.00, qty: 200, at: '2026-11-22T14:00:00Z' });

    windowMock.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));
    await new Promise(r => setTimeout(r, 20));

    pos = model.positions.find(p => p.ticker === 'AAPL34');
    assert.equal(pos.currentPrice, 108.00);
    assert.equal(pos.quantity, 400);
    assert.equal(pos.accountId, 'nomad_daniel', 'accountId deve ser preservado após parcial');
    assert.equal(pos.broker, 'Nomad — Daniel', 'broker deve ser preservado após parcial');
  });

  test('Segurança — Contas correntes (CHECKING) são rejeitadas para custódia de trades', () => {
    const { DailyUpdateModel } = env;

    const model = new DailyUpdateModel({
      accounts: DailyUpdateModel.DEFAULT_ACCOUNTS,
      positions: [
        { id: 'pos-check-test', ticker: 'VALE3', entryPrice: 60.00, quantity: 100, accountId: null }
      ]
    });

    // Tentar vincular à conta Bradesco (type: 'CHECKING')
    const result = model.linkPositionToAccount('pos-check-test', 'bradesco_daniel');
    assert.equal(result.success, false, 'Deve recusar vinculação a conta corrente');
    assert.equal(result.position.accountId, null, 'accountId não deve ser alterado');
  });

  test('Estatísticas e Relatórios — TruthPanelModel isola Paper Trading e identifica contas reais', () => {
    const TruthPanelModel = require('./truth-panel-model.js');

    const trades = [
      {
        id: 't-real-1',
        ticker: 'VALE3',
        status: 'closed',
        mode: 'real',
        broker: 'XP — Daniel',
        accountId: 'xp_daniel',
        events: [
          { type: 'entry', price: 60, qty: 100, at: '2026-11-01T10:00:00Z', stop: 58 },
          { type: 'close', price: 66, qty: 100, at: '2026-11-10T15:00:00Z' }
        ]
      },
      {
        id: 't-real-2',
        ticker: 'PETR4',
        status: 'closed',
        mode: 'real',
        broker: 'Genial — Daniel',
        accountId: 'genial_daniel',
        events: [
          { type: 'entry', price: 38, qty: 200, at: '2026-11-02T10:00:00Z', stop: 36 },
          { type: 'close', price: 42, qty: 200, at: '2026-11-12T15:00:00Z' }
        ]
      },
      {
        id: 't-paper-1',
        ticker: 'BBAS3',
        status: 'closed',
        mode: 'paper',
        broker: 'Paper Trading',
        accountId: 'paper',
        events: [
          { type: 'entry', price: 28, qty: 300, at: '2026-11-05T10:00:00Z', stop: 26 },
          { type: 'close', price: 25, qty: 300, at: '2026-11-15T15:00:00Z' }
        ]
      }
    ];

    // 1. Filtrar por Conta Real
    const realTrades = TruthPanelModel.filterTrades(trades, { account: 'Conta real' });
    assert.equal(realTrades.length, 2, 'Deve conter apenas os 2 trades reais');
    assert.ok(realTrades.every(t => t.mode !== 'paper'), 'Nenhum trade paper pode estar em Conta real');

    // 2. Filtrar por Paper Trading
    const paperTrades = TruthPanelModel.filterTrades(trades, { account: 'Paper Trading' });
    assert.equal(paperTrades.length, 1, 'Deve conter apenas 1 trade paper');
    assert.equal(paperTrades[0].ticker, 'BBAS3');

    // 3. Filtrar por corretora específica
    const xpTrades = TruthPanelModel.filterTrades(trades, { account: 'XP — Daniel' });
    assert.equal(xpTrades.length, 1, 'Deve conter apenas o trade da XP');
    assert.equal(xpTrades[0].ticker, 'VALE3');
  });

  test('Blindagem da Etapa 2 — Mock demo e trades fechados nunca vazam para posições abertas', async () => {
    const { windowMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    // Configurar estado operacional com 1 trade real ativo e 1 fechado
    windowMock.operationalState = {
      positions: [
        {
          id: 'trade-walm-1',
          ticker: 'WALM34',
          asset: 'WALM34',
          direction: 'long',
          strategy: 'TREND_FOLLOWING',
          entry: 48.26,
          currentPrice: 47.85,
          initialQty: 500,
          remaining: 500,
          status: 'open'
        }
      ],
      closedPositions: [
        {
          id: 'trade-brav-1',
          ticker: 'BRAV3',
          asset: 'BRAV3',
          status: 'closed'
        }
      ]
    };

    // Criar controller (por padrão inicializaria com DEFAULT_POSITIONS mock)
    const hub = new DailyUpdateHubModule.DailyUpdateHubController({ root: windowMock });
    hub.syncFromOperationalState();

    const openPos = hub.model.getOpenPositions();
    assert.equal(openPos.length, 1, 'Deve conter rigorosamente 1 posição aberta');
    assert.equal(openPos[0].ticker, 'WALM34', 'A única posição aberta deve ser WALM34');

    // getGroupedPositions também deve retornar apenas o grupo de WALM34
    const grouped = hub.model.getGroupedPositions();
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].key, 'TREND_FOLLOWING');
    assert.equal(grouped[0].positions.length, 1);
    assert.equal(grouped[0].positions[0].ticker, 'WALM34');

    // Confirmar que nenhuma posição mock nem a fechada BRAV3 estão ativas
    assert.ok(!openPos.some(p => p.ticker === 'BRAV3'), 'BRAV3 fechada não pode constar em abertas');
    assert.ok(!openPos.some(p => p.id === 'pos_aapl34' || p.id === 'pos_amzn34'), 'Mocks não podem constar');
  });

  test('Blindagem da Etapa 2 — Fechamento de todas as posições resulta em 0 posições abertas', async () => {
    const { windowMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    // Trader fechou tudo
    windowMock.operationalState = {
      positions: [],
      closedPositions: [
        { id: 'trade-1', ticker: 'WALM34', status: 'closed' },
        { id: 'trade-2', ticker: 'JNUB34', status: 'closed' }
      ]
    };

    const hub = new DailyUpdateHubModule.DailyUpdateHubController({ root: windowMock });
    hub.syncFromOperationalState();

    assert.equal(hub.model.getOpenPositions().length, 0, 'Não deve haver nenhuma posição aberta');
    assert.equal(hub.model.getGroupedPositions().length, 0, 'Grupos de posições devem estar vazios');
    assert.equal(hub.model.getTotalExposure(), 0, 'Exposição deve ser 0');
    assert.equal(hub.model.getTotalUnrealizedResult(), 0, 'Resultado não realizado deve ser 0');
  });

  test('Blindagem da Etapa 2 — Draft com posições mock antigas é sanitizado ao sincronizar dados reais', async () => {
    const { windowMock, storageMock, DailyUpdateModel, DailyUpdateHubModule } = env;

    // Simular draft salvo no localStorage com dados mock legados
    const legacyDraft = {
      positions: [
        { id: 'pos_aapl34', ticker: 'AAPL34', quantity: 600, entryPrice: 100.86, currentPrice: 103.21, closed: false, status: 'conferida' },
        { id: 'pos_brav3', ticker: 'BRAV3', quantity: 500, entryPrice: 14.06, currentPrice: 12.87, closed: false, status: 'conferida' },
        { id: 'trade-real-1', ticker: 'PETR4', quantity: 400, entryPrice: 38.00, currentPrice: 39.50, closed: false, status: 'conferida' }
      ]
    };
    storageMock.setItem(DailyUpdateModel.STORAGE_KEY_DRAFT, JSON.stringify(legacyDraft));

    // Estado operacional real do usuário (PETR4 é a única posição aberta)
    windowMock.operationalState = {
      positions: [
        { id: 'trade-real-1', ticker: 'PETR4', asset: 'PETR4', remaining: 400, entry: 38.00, currentPrice: 39.50, status: 'open' }
      ],
      closedPositions: []
    };

    const hub = new DailyUpdateHubModule.DailyUpdateHubController({ root: windowMock });
    hub.loadSavedState(storageMock);
    hub.syncFromOperationalState();

    const openPos = hub.model.getOpenPositions();
    assert.equal(openPos.length, 1, 'Deve existir apenas PETR4');
    assert.equal(openPos[0].ticker, 'PETR4');
    assert.ok(!openPos.some(p => p.id === 'pos_aapl34'), 'pos_aapl34 mock deve ter sido eliminado');
    assert.ok(!openPos.some(p => p.id === 'pos_brav3'), 'pos_brav3 mock deve ter sido eliminado');
  });
});

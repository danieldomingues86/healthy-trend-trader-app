'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const portfolioEngine = require('../src/capital-intelligence-portfolio');
const {
  ASSET_CLASSES,
  resolvePositionAssetClass,
  resolvePositionSector,
  buildPortfolioDimension
} = portfolioEngine;

const CapitalIntelligenceModel = require('../../frontend/capital-intelligence-model');

test('Portfolio Engine — 1. Segregação estrita entre Contas Correntes e Equity de Investimentos', () => {
  const accounts = [
    { id: 'xp_daniel', name: 'XP Investimentos', accountType: 'investment', balance: 200000, currency: 'BRL' },
    { id: 'genial_daniel', name: 'Genial Investimentos', accountType: 'investment', balance: 100000, currency: 'BRL' },
    { id: 'bradesco_daniel', name: 'Bradesco Corrente', accountType: 'checking', balance: 25000, currency: 'BRL' }
  ];

  const dim = buildPortfolioDimension({
    workspaceStateData: { daily_update_accounts: accounts },
    tradesData: []
  });

  assert.strictEqual(dim.realWealth, 325000, 'Patrimônio Real deve somar todas as contas (325k)');
  assert.strictEqual(dim.operationalEquity, 300000, 'Equity da Estratégia deve incluir apenas contas de investimento (300k)');
  assert.strictEqual(dim.checkingWealth, 25000, 'Contas Correntes devem totalizar 25k');
  assert.strictEqual(dim.accountsList.length, 3, 'Deve listar as 3 contas');

  const checkingAcc = dim.accountsList.find(a => a.id === 'bradesco_daniel');
  assert.strictEqual(checkingAcc.isChecking, true, 'Conta Bradesco deve ser marcada como checking');
  assert.strictEqual(checkingAcc.accountType, 'checking');
});

test('Portfolio Engine — 2. Prevenção absoluta de dupla contagem (Posições vs. Saldos)', () => {
  const accounts = [
    { id: 'xp', name: 'XP', accountType: 'investment', balance: 500000, currency: 'BRL' }
  ];

  const openTrades = [
    { id: 't1', ticker: 'PETR4', quantity: 1000, entryPrice: 35.0, currentPrice: 38.0, status: 'open' }, // 38.000
    { id: 't2', ticker: 'VALE3', quantity: 800, entryPrice: 60.0, currentPrice: 65.0, status: 'open' }    // 52.000
  ]; // Total posições = 90.000

  const dim = buildPortfolioDimension({
    workspaceStateData: { daily_update_accounts: accounts },
    tradesData: openTrades
  });

  assert.strictEqual(dim.operationalEquity, 500000, 'Equity permanece 500k (não deve somar posições ao saldo)');
  assert.strictEqual(dim.totalExposure, 90000, 'Exposição total deve ser 90k');
  assert.strictEqual(dim.cashValue, 410000, 'Caixa livre deve ser Equity - Exposição (410k)');
  assert.strictEqual(dim.realWealth, 500000, 'Patrimônio Real NÃO deve inflar com a soma das posições');
});

test('Portfolio Engine — 3. Classificação de classes de ativos e alocação percentual', () => {
  const accounts = [
    { id: 'xp', name: 'XP', accountType: 'investment', balance: 1000000, currency: 'BRL' }
  ];

  const openTrades = [
    { id: 't1', ticker: 'PETR4', quantity: 1000, currentPrice: 40.0, status: 'open' },    // 40.000 (Ações Brasil)
    { id: 't2', ticker: 'AAPL34', quantity: 500, currentPrice: 100.0, status: 'open' },   // 50.000 (BDRs)
    { id: 't3', ticker: 'KNRI11', assetClass: 'FII', quantity: 200, currentPrice: 150.0, status: 'open' } // 30.000 (FII)
  ];

  const dim = buildPortfolioDimension({
    workspaceStateData: { daily_update_accounts: accounts },
    tradesData: openTrades
  });

  const alloc = dim.allocationByClass;
  assert.ok(Array.isArray(alloc), 'Alocação deve ser lista');

  const cashAlloc = alloc.find(c => c.code === ASSET_CLASSES.FIXED_INCOME_CASH.code);
  const brAlloc = alloc.find(c => c.code === ASSET_CLASSES.BRAZIL_EQUITIES.code);
  const bdrAlloc = alloc.find(c => c.code === ASSET_CLASSES.BDRS_INTERNATIONAL.code);
  const fiiAlloc = alloc.find(c => c.code === ASSET_CLASSES.FIIS.code);

  assert.ok(cashAlloc, 'Deve haver fatia de caixa livre');
  assert.strictEqual(cashAlloc.amount, 880000, 'Caixa livre: 1M - 120k = 880k');
  assert.strictEqual(cashAlloc.percentage, 88.0);

  assert.ok(brAlloc, 'Deve haver ações Brasil');
  assert.strictEqual(brAlloc.amount, 40000);
  assert.strictEqual(brAlloc.percentage, 4.0);

  assert.ok(bdrAlloc, 'Deve haver BDRs');
  assert.strictEqual(bdrAlloc.amount, 50000);
  assert.strictEqual(bdrAlloc.percentage, 5.0);

  assert.ok(fiiAlloc, 'Deve haver FIIs');
  assert.strictEqual(fiiAlloc.amount, 30000);
  assert.strictEqual(fiiAlloc.percentage, 3.0);
});

test('Portfolio Engine — 4. Exposição por Região e Moeda (Hedge Cambial)', () => {
  const accounts = [
    { id: 'xp', name: 'XP', accountType: 'investment', balance: 500000, currency: 'BRL' },
    { id: 'nomad', name: 'Nomad', accountType: 'investment', balance: 100000, currency: 'USD', fxRate: 5.80, balanceUSD: 17241.38 }
  ];

  const openTrades = [
    { id: 't1', ticker: 'VALE3', quantity: 1000, currentPrice: 60.0, status: 'open' }, // 60.000 Brasil
    { id: 't2', ticker: 'AMZO34', quantity: 500, currentPrice: 80.0, status: 'open' }   // 40.000 BDR / Global
  ];

  const dim = buildPortfolioDimension({
    workspaceStateData: { daily_update_accounts: accounts },
    tradesData: openTrades
  });

  // Região
  assert.ok(dim.exposureByRegion.brazil.amount >= 60000);
  assert.ok(dim.exposureByRegion.global.amount >= 40000);

  // Moeda e Hedge Cambial
  assert.ok(dim.exposureByCurrency.usd.amount >= 40000, 'Deve contabilizar ativos dolarizados');
  assert.strictEqual(dim.exposureByCurrency.usd.isForeignCurrencyHedge, true, 'Deve marcar hedge cambial ativo');
});

test('Portfolio Engine — 5. Classificação setorial confiável e fallback estrito (sem invenções)', () => {
  const knownTrade = { ticker: 'PETR4' };
  const unknownTrade = { ticker: 'XYZW99' };

  assert.strictEqual(resolvePositionSector(knownTrade), 'Petróleo, Gás e Biocombustíveis');
  assert.strictEqual(resolvePositionSector(unknownTrade), 'Outros / A Classificar', 'Ticker desconhecido deve cair estritamente em Outros');

  const dim = buildPortfolioDimension({
    wealthData: { summary: { operationalEquity: 100000 } },
    tradesData: [
      { id: 't1', ticker: 'PETR4', quantity: 100, currentPrice: 30, status: 'open' },
      { id: 't2', ticker: 'XYZW99', quantity: 100, currentPrice: 20, status: 'open' }
    ]
  });

  const sectors = dim.exposureBySector;
  assert.ok(sectors.some(s => s.sector === 'Petróleo, Gás e Biocombustíveis'));
  assert.ok(sectors.some(s => s.sector === 'Outros / A Classificar'));
});

test('Portfolio Engine — 6. Concentração, Liquidez e Metadados de Fotografia Rastreável', () => {
  const accounts = [
    { id: 'xp', name: 'XP', accountType: 'investment', balance: 100000 }
  ];

  const openTrades = [
    { id: 't1', ticker: 'PETR4', quantity: 500, currentPrice: 50, status: 'open', riskPercent: 1.2 } // 25.000 (25% da Equity)
  ];

  const dim = buildPortfolioDimension({
    workspaceStateData: { daily_update_accounts: accounts },
    tradesData: openTrades,
    now: new Date('2026-11-24T18:00:00Z')
  });

  // Concentração
  assert.strictEqual(dim.concentration.level, 'Alta', 'Posição de 25% deve ser classificada como Alta concentração');
  assert.strictEqual(dim.concentration.top1.ticker, 'PETR4');
  assert.strictEqual(dim.concentration.top1.percentage, 25.0);

  // Liquidez
  assert.strictEqual(dim.liquidity.cashAmount, 75000);
  assert.strictEqual(dim.liquidity.cashPercentage, 75.0);
  assert.strictEqual(dim.liquidity.status, 'Elevada Liquidez');

  // Metadados
  assert.strictEqual(dim.asOfDate, '2026-11-24');
  assert.strictEqual(dim.snapshotTimestamp, '2026-11-24T18:00:00.000Z');
  assert.ok(dim.principles.length >= 4, 'Deve conter princípios invioláveis');
});

test('Portfolio Engine — 7. Hidratação no CapitalIntelligenceModel (Frontend)', () => {
  const dim = buildPortfolioDimension({
    wealthData: { summary: { operationalEquity: 500000, realWealth: 520000 } },
    tradesData: [{ id: 't1', ticker: 'VALE3', quantity: 1000, currentPrice: 60, status: 'open', riskPercent: 1.5 }]
  });

  const mockSnapshot = {
    overallStatus: 'atualizado',
    spheres: {
      my_portfolio: dim
    }
  };

  const model = new CapitalIntelligenceModel();
  model.hydrateFromPipelineSnapshot(mockSnapshot);

  const pNode = model.getNodeById('my_portfolio');
  assert.ok(pNode, 'Nó my_portfolio deve existir no model');
  assert.strictEqual(pNode.equityValue, 500000);
  assert.ok(pNode.portfolioDetail, 'Nó deve conter objeto detalhado portfolioDetail');
  assert.strictEqual(pNode.portfolioDetail.realWealth, 500000);
  assert.strictEqual(pNode.portfolioDetail.totalExposure, 60000);
  assert.strictEqual(pNode.portfolioDetail.cashValue, 440000);
  assert.strictEqual(pNode.portfolioDetail.openPositionsCount, 1);
});

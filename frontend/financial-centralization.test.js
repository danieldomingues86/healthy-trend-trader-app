const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DailyUpdateModel = require('./daily-update-model.js');

test('Financial Centralization: 1 & 2. Alteração de saldo na Atualização Diária sincroniza Meu Desktop e Patrimônio', () => {
  const model = new DailyUpdateModel();
  const initialRealWealth = model.getConsolidatedRealWealth();
  assert.equal(initialRealWealth, 1014295.73);

  // Simula atualização de saldo da XP Daniel (+R$ 10.000,00)
  model.updateAccountBalance('xp_daniel', 217521.00);
  const newRealWealth = model.getConsolidatedRealWealth();
  assert.equal(newRealWealth, 1024295.73);

  // Mock global broadcast via healthyTrendFinancials
  const mockStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); }
  };
  mockStorage.setItem('healthy-daily-update-accounts', JSON.stringify(model.accounts));

  const financials = DailyUpdateModel.getConsolidatedFinancials(mockStorage);
  assert.equal(financials.realWealth, 1024295.73, 'Patrimônio consolidado refletido na camada central');
});

test('Financial Centralization: 3. Patrimônio Total apresenta rigorosamente o mesmo valor nas três telas', () => {
  const model = new DailyUpdateModel();
  const expectedTotal = 1014295.73;

  // 1. Atualização Diária
  const dailyWealth = model.getConsolidatedRealWealth();
  assert.equal(dailyWealth, expectedTotal, 'Atualização Diária = R$ 1.014.295,73');

  // 2. Camada Central consumida por Meu Desktop
  const financials = DailyUpdateModel.getConsolidatedFinancials();
  assert.equal(financials.realWealth, expectedTotal, 'Meu Desktop = R$ 1.014.295,73');

  // 3. Tela Patrimônio (Wealth Dashboard V2)
  const wealthDashboardCode = fs.readFileSync(path.join(__dirname, 'wealth-dashboard-v2.js'), 'utf8');
  assert.ok(wealthDashboardCode.includes('realWealth: 1014295.73'), 'DEFAULT_WEALTH contém R$ 1.014.295,73');
  assert.ok(wealthDashboardCode.includes('fin?.getConsolidatedRealWealth'), 'Patrimônio consome camada central');
});

test('Financial Centralization: 4 & 5. Equity da Estratégia não inclui contas correntes (Bradesco)', () => {
  const model = new DailyUpdateModel();
  
  const realWealth = model.getConsolidatedRealWealth();
  const investmentWealth = model.getInvestmentWealth();
  const checkingWealth = model.getCheckingWealth();
  const strategyEquity = model.strategyEquity;

  assert.equal(realWealth, 1014295.73, 'Patrimônio Total inclui contas correntes');
  assert.equal(investmentWealth, 1000295.73, 'Equity de Investimentos exclui contas correntes');
  assert.equal(checkingWealth, 14000.00, 'Conta Corrente Bradesco = R$ 14.000,00');
  assert.equal(strategyEquity, 1112175.49, 'Equity da Estratégia = R$ 1.112.175,49');

  // Adicionar R$ 20.000 na conta corrente não altera a Equity de Investimentos nem a Estratégia
  model.updateAccountBalance('bradesco_daniel', 34000.00);
  assert.equal(model.getConsolidatedRealWealth(), 1034295.73);
  assert.equal(model.getInvestmentWealth(), 1000295.73, 'Equity de Investimentos inalterada');
  assert.equal(model.strategyEquity, 1112175.49, 'Equity da Estratégia inalterada');
});

test('Financial Centralization: 6. Posições abertas são contabilizadas no Capital Alocado sem duplicidade', () => {
  const model = new DailyUpdateModel();
  assert.equal(model.positions.length, 7, 'Exatamente 7 posições abertas');

  const allocatedCapital = model.getAllocatedCapital();
  const totalExposure = model.getTotalExposure();
  assert.equal(allocatedCapital, 314302.00, 'Capital alocado = R$ 314.302,00');
  assert.equal(allocatedCapital, totalExposure, 'getAllocatedCapital é idêntico a getTotalExposure');

  // Cada ativo com seu volume específico
  const aapl = model.positions.find(p => p.ticker === 'AAPL34');
  const win = model.positions.find(p => p.ticker === 'WINZ26');
  const bgi = model.positions.find(p => p.ticker === 'BGIX26');
  
  assert.equal(model.getPositionFinancialVolume(aapl), 61926.00); // 600 * 103.21
  assert.equal(model.getPositionFinancialVolume(win), 67038.00);  // 2 * 167595 * 0.20
  assert.equal(model.getPositionFinancialVolume(bgi), 131670.00); // 1 * 399.00 * 330
});

test('Financial Centralization: 7. Caixa Disponível e Capacidade de Risco Restante são métricas independentes', () => {
  const model = new DailyUpdateModel();
  
  // A. Caixa Disponível (em R$ e % da Equity de Investimentos)
  const availableCash = model.getAvailableCash();
  const availableCashPct = model.getAvailableCashPct();
  assert.equal(availableCash, 685993.73, 'Caixa Disponível = 1.000.295,73 - 314.302,00 = R$ 685.993,73');
  assert.equal(availableCashPct, 68.58, 'Caixa Disponível % = 68,58%');

  // B. Capital Alocado
  const allocated = model.getAllocatedCapital();
  const allocatedPct = model.getAllocatedCapitalPct();
  assert.equal(allocated, 314302.00, 'Capital Alocado = R$ 314.302,00');
  assert.equal(allocatedPct, 31.42, 'Capital Alocado % = 31,42%');
  assert.equal(Math.round((availableCashPct + allocatedPct) * 100) / 100, 100.00, 'Soma das partes = 100% da conta de investimentos');

  // C. Capacidade de Risco Restante (em pp e R$ de risco)
  const remainingRiskPct = model.getRemainingRiskCapacityPct();
  const remainingRiskAmount = model.getRemainingRiskCapacityAmount();
  const heatLimit = model.getHeatLimit();
  const heat = model.getPortfolioHeat();

  assert.equal(heatLimit, 5.00, 'Limite de Heat = 5,00%');
  assert.ok(heat > 0 && heat <= 5.00, 'Heat Atual dentro do intervalo esperado');
  assert.equal(remainingRiskPct, Math.round((heatLimit - heat) * 100) / 100);
  assert.ok(remainingRiskAmount > 0, 'Risco financeiro disponível positivo');

  // Caixa Disponível (R$ 685k / 68,58%) é independente de Capacidade de Risco!
  assert.notEqual(availableCashPct, remainingRiskPct, 'Caixa e Risco são independentes');
});

test('Financial Centralization: 8. Portfolio Heat respeita o limite configurado e reflete no Meu Desktop e Patrimônio', () => {
  const model = new DailyUpdateModel();
  assert.ok(model.getPortfolioHeat() <= model.getHeatLimit());
  assert.equal(model.getHeatLimit(), 5.00);

  const todayCockpitCode = fs.readFileSync(path.join(__dirname, 'today-cockpit.js'), 'utf8');
  assert.ok(todayCockpitCode.includes('heatLimit'), 'Meu Desktop consome heatLimit');
  assert.ok(todayCockpitCode.includes('Espaço disponível'), 'Meu Desktop exibe folga de risco');

  const wealthCode = fs.readFileSync(path.join(__dirname, 'wealth-dashboard-v2.js'), 'utf8');
  assert.ok(wealthCode.includes('remainingRiskCapacityPct'), 'Patrimônio consome capacidade de risco restante');
});

test('Financial Centralization: 9. Gráficos históricos preservam registros anteriores sem sobrescrever', () => {
  const wealthCode = fs.readFileSync(path.join(__dirname, 'wealth-dashboard-v2.js'), 'utf8');
  
  // buildHistory preserva todos os meses anteriores (Jan a Out)
  assert.ok(wealthCode.includes('rows[10].real = fin.getConsolidatedRealWealth'), 'Apenas o fechamento corrente sincroniza o mês ativo');
  assert.ok(wealthCode.includes('DEFAULT_WEALTH'), 'DEFAULT_WEALTH possui snapshots mensais preservados');
});

test('Financial Centralization: 10. Não existem divergências entre os indicadores equivalentes das telas', () => {
  const fin = DailyUpdateModel.getConsolidatedFinancials();
  
  // Consolidado idêntico
  assert.equal(fin.realWealth, 1014295.73);
  assert.equal(fin.investmentWealth, 1000295.73);
  assert.equal(fin.checkingWealth, 14000.00);
  assert.equal(fin.strategyEquity, 1112175.49);
  assert.equal(fin.allocatedCapital, 314302.00);
  assert.equal(fin.allocatedCapitalPct, 31.42);
  assert.equal(fin.availableCash, 685993.73);
  assert.equal(fin.availableCashPct, 68.58);
  assert.equal(fin.heatLimit, 5.00);
  assert.equal(fin.openPositionsCount, 7);
});

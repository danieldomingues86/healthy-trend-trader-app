const test = require('node:test');
const assert = require('node:assert/strict');
const DailyUpdateModel = require('./daily-update-model.js');

test('DailyUpdateModel: inicializa com contas e posições padrão homologadas', () => {
  const model = new DailyUpdateModel();

  assert.equal(model.accounts.length, 8);
  assert.equal(model.positions.length, 7);
  assert.equal(model.strategyEquity, 1112175.49);

  // Verifica as contas obrigatórias
  const accountLabels = model.accounts.map(a => a.label);
  assert.ok(accountLabels.includes('XP — Daniel'));
  assert.ok(accountLabels.includes('Nomad — Daniel'));
  assert.ok(accountLabels.includes('Genial — Daniel'));
  assert.ok(accountLabels.includes('Clear — Daniel'));
  assert.ok(accountLabels.includes('EqSeed — Daniel (Startup)'));
  assert.ok(accountLabels.includes('Bradesco — Daniel'));
  assert.ok(accountLabels.includes('XP — Natália'));
  assert.ok(accountLabels.includes('Genial — Natália'));

  // Classificação de contas
  assert.equal(model.accounts.find(a => a.id === 'bradesco_daniel').type, 'CHECKING');
  assert.equal(model.accounts.find(a => a.id === 'xp_daniel').type, 'INVESTMENT');
  assert.equal(model.accounts.find(a => a.id === 'xp_natalia').type, 'INVESTMENT');
});

test('DailyUpdateModel: cálculo correto do Patrimônio Real Consolidado e Variação', () => {
  const model = new DailyUpdateModel();

  const realWealth = model.getConsolidatedRealWealth();
  const prevWealth = model.getPreviousConsolidatedRealWealth();
  const investmentWealth = model.getInvestmentWealth();
  const checkingWealth = model.getCheckingWealth();
  const nominalVar = model.getDayNominalVariation();
  const pctVar = model.getDayPercentVariation();

  // Com Bradesco (14.000,00), Patrimônio Real = 1014295.73
  assert.equal(Math.round(realWealth * 100) / 100, 1014295.73);
  assert.equal(Math.round(prevWealth * 100) / 100, 1000295.73);
  assert.equal(Math.round(investmentWealth * 100) / 100, 1000295.73);
  assert.equal(Math.round(checkingWealth * 100) / 100, 14000.00);
  assert.equal(Math.round(nominalVar * 100) / 100, 14000.00);
  assert.equal(Math.round(pctVar * 100) / 100, 1.40);
});

test('DailyUpdateModel: atualização de saldo de conta com suporte a moeda estrangeira (USD/BRL)', () => {
  const model = new DailyUpdateModel();

  // Atualiza Nomad com valor em USD e taxa de câmbio
  const updated = model.updateAccountBalance('nomad_daniel', 19000, true, 5.80);
  assert.equal(updated.newBalanceUSD, 19000);
  assert.equal(updated.fxRate, 5.80);
  assert.equal(updated.newBalance, 110200.00);
  assert.equal(updated.status, 'updated');

  // Atualiza XP Daniel para o mesmo valor anterior -> status 'keep'
  const xp = model.updateAccountBalance('xp_daniel', 207521.00);
  assert.equal(xp.status, 'keep');
});

test('DailyUpdateModel: cálculo de Exposição Atual e Heat do Portfólio', () => {
  const model = new DailyUpdateModel();

  const exposure = model.getTotalExposure();
  assert.ok(exposure > 0);

  const exposurePct = model.getExposurePct();
  assert.ok(exposurePct > 0 && exposurePct < 100);
  assert.equal(Math.round(exposurePct * 100) / 100, 31.42);

  const progress = model.getProgress();
  assert.equal(progress.totalAccounts, 8);
  assert.equal(progress.totalPositions, 7);
  assert.equal(progress.divergences, 0);
  assert.equal(progress.readyToClose, true);
});

test('DailyUpdateModel: persistência e restauração de rascunho (draft)', () => {
  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  const model1 = new DailyUpdateModel();
  model1.updateAccountBalance('clear_daniel', 5000);
  assert.equal(model1.saveDraft(mockStorage), true);

  const model2 = new DailyUpdateModel();
  assert.equal(model2.loadDraft(mockStorage), true);
  const clearAcc = model2.accounts.find(a => a.id === 'clear_daniel');
  assert.equal(clearAcc.newBalance, 5000);
  assert.equal(clearAcc.status, 'updated');

  model2.clearDraft(mockStorage);
  assert.equal(model2.loadDraft(mockStorage), false);
});

test('DailyUpdateModel Card [02]: validação robusta de entradas numéricas (parseNumber e validateBalanceInput)', () => {
  const { parseNumber, validateBalanceInput } = DailyUpdateModel;

  // Formato brasileiro com separador de milhar e vírgula decimal
  assert.equal(parseNumber('105.500,00'), 105500.00);
  assert.equal(parseNumber('R$ 207.521,50'), 207521.50);
  assert.equal(parseNumber(' 3.069,00 '), 3069.00);

  // Formato internacional com ponto decimal
  assert.equal(parseNumber('105500.00'), 105500.00);
  assert.equal(parseNumber('US$ 18389.70'), 18389.70);
  assert.equal(parseNumber('18,389.70'), 18389.70);

  // Validação aceita números válidos
  const val1 = validateBalanceInput('257.418,00');
  assert.equal(val1.valid, true);
  assert.equal(val1.amount, 257418.00);
  assert.equal(val1.error, null);

  // Validação rejeita campos vazios
  const valEmpty = validateBalanceInput('');
  assert.equal(valEmpty.valid, false);
  assert.equal(typeof valEmpty.error, 'string');

  // Validação rejeita valores negativos
  const valNeg = validateBalanceInput('-500,00');
  assert.equal(valNeg.valid, false);
  assert.equal(valNeg.error, 'O saldo não pode ser negativo.');

  // Validação rejeita strings não numéricas
  const valInvalid = validateBalanceInput('abc');
  assert.equal(valInvalid.valid, false);
  assert.equal(valInvalid.error, 'Formato numérico inválido.');
});

test('DailyUpdateModel Card [02]: ações rápidas Manter Saldo, Manter Todos e Pendente', () => {
  const model = new DailyUpdateModel();

  // Altera Clear para status updated
  model.updateAccountBalance('clear_daniel', 4000);
  assert.equal(model.accounts.find(a => a.id === 'clear_daniel').status, 'updated');

  // Ação "Manter Saldo Anterior" na Clear
  const kept = model.keepAccountBalance('clear_daniel');
  assert.equal(kept.status, 'keep');
  assert.equal(kept.newBalance, 3068.91);

  // Ação "Pendente" na Genial Daniel
  const pendingAcc = model.setAccountPending('genial_daniel');
  assert.equal(pendingAcc.status, 'pending');

  // Progresso deve detectar a conta pendente e bloquear fechamento
  let progress = model.getProgress();
  assert.equal(progress.pendingAccounts, 1);
  assert.equal(progress.accountsComplete, false);
  assert.equal(progress.readyToClose, false);

  // Ação global "Manter Todos os Saldos" resolve todas as contas
  model.keepAllAccounts();
  model.accounts.forEach(acc => {
    assert.equal(acc.status, 'keep');
    assert.equal(acc.newBalance, acc.previousBalance);
    assert.equal(acc.error, null);
  });

  progress = model.getProgress();
  assert.equal(progress.pendingAccounts, 0);
  assert.equal(progress.accountsComplete, true);
  assert.equal(progress.readyToClose, true);
});

test('DailyUpdateModel Card [02]: rastreamento detalhado de Nomad (USD) e independência cambial', () => {
  const model = new DailyUpdateModel();

  // Nomad padrão com USD 17.759,25 e cotação 5,95
  const fxDetails = model.getForeignCurrencyDetails('nomad_daniel');
  assert.ok(fxDetails !== null);
  assert.equal(fxDetails.currency, 'USD');
  assert.equal(fxDetails.balanceUSD, 17759.25);
  assert.equal(fxDetails.previousBalanceUSD, 17759.25);
  assert.equal(fxDetails.fxRate, 5.95);
  assert.equal(fxDetails.convertedBRL, 105667.54);

  // Variação em USD é estritamente calculada sobre a moeda original
  const usdVar = model.getAccountUsdVariationPct(model.accounts.find(a => a.id === 'nomad_daniel'));
  assert.equal(Math.round(usdVar * 100) / 100, 0.00);

  // Atualização em USD converte para BRL usando a taxa
  model.updateAccountBalance('nomad_daniel', 20000, true, 6.00);
  const updatedNomad = model.accounts.find(a => a.id === 'nomad_daniel');
  assert.equal(updatedNomad.newBalanceUSD, 20000);
  assert.equal(updatedNomad.fxRate, 6.00);
  assert.equal(updatedNomad.newBalance, 120000.00);
});

test('DailyUpdateModel Card [02]: Regra Fundamental — Saldo Total da Corretora nunca soma posições novamente', () => {
  const model = new DailyUpdateModel();

  const realWealthBefore = model.getConsolidatedRealWealth();
  const exposure = model.getTotalExposure();

  // Patrimônio Real é exatamente a soma dos saldos das contas
  const expectedSum = model.accounts.reduce((s, a) => s + a.newBalance, 0);
  assert.equal(realWealthBefore, expectedSum);

  // Adicionar ou alterar o preço de uma posição aberta altera a exposição, mas NÃO altera o Patrimônio Real
  model.positions[0].currentPrice = 200.00;
  const newExposure = model.getTotalExposure();
  assert.ok(newExposure > exposure);

  const realWealthAfter = model.getConsolidatedRealWealth();
  assert.equal(realWealthAfter, realWealthBefore, 'Patrimônio Real não deve sofrer alteração direta por variação de posição aberta');
});

test('DailyUpdateModel Card [02]: geração de audit reason estruturado para /api/wealth/adjustments', () => {
  const model = new DailyUpdateModel();
  const reason = model.buildClosingAuditReason();

  assert.ok(reason.startsWith('Fechamento Diário'));
  assert.ok(reason.includes('XP — Daniel'));
  assert.ok(reason.includes('Nomad — Daniel'));
  assert.ok(reason.includes('US$'));
  assert.ok(reason.includes('Genial — Daniel'));
  assert.ok(reason.includes('Clear — Daniel'));
  assert.ok(reason.includes('XP — Natália'));
  assert.ok(reason.includes('Genial — Natália'));
});

test('DailyUpdateModel Card [03]: atualização de preço de posição sem sobrescrever stops ou entradas', () => {
  const model = new DailyUpdateModel();
  const pos = model.positions.find(p => p.id === 'pos_aapl34'); // AAPL34

  const initialEntry = pos.entryPrice;
  const initialStop = pos.stopPrice;
  const initialTrailing = pos.trailingStop;
  const initialQty = pos.quantity;

  // Atualiza preço atual de AAPL34 para R$ 108,00
  const res = model.updatePositionPrice('pos_aapl34', '108,00');
  assert.equal(res.success, true);
  assert.equal(pos.currentPrice, 108.00);
  assert.equal(pos.checked, true);
  assert.equal(pos.status, 'conferida');

  // INVARIANTE CARD [03]: Nunca sobrescrever preço de entrada, stop inicial, trailing stop ou quantidade
  assert.equal(pos.entryPrice, initialEntry, 'Preço de entrada deve permanecer inalterado');
  assert.equal(pos.stopPrice, initialStop, 'Stop inicial deve permanecer inalterado');
  assert.equal(pos.trailingStop, initialTrailing, 'Trailing stop deve permanecer inalterado');
  assert.equal(pos.quantity, initialQty, 'Quantidade não deve ser alterada automaticamente');

  // Rejeição de preço inválido ou negativo
  const invalidRes = model.updatePositionPrice('pos_aapl34', '-10,00');
  assert.equal(invalidRes.success, false);
  assert.ok(pos.error !== null);
  assert.equal(model.getProgress().invalidPositions, 1);
  assert.equal(model.getProgress().readyToClose, false);
});

test('DailyUpdateModel Card [03]: ações rápidas de conferência e posições pendentes', () => {
  const model = new DailyUpdateModel();

  // Marca uma posição como pendente
  const pos2 = model.setPositionPending('pos_amzn34');
  assert.equal(pos2.status, 'pendente');
  assert.equal(pos2.checked, false);

  let progress = model.getProgress();
  assert.equal(progress.pendingPositions, 1);
  assert.equal(progress.positionsComplete, false);
  assert.equal(progress.readyToClose, false);

  // Confere individualmente
  model.confirmPosition('pos_amzn34');
  assert.equal(pos2.status, 'conferida');
  assert.equal(pos2.checked, true);

  // Confere todas as posições em 1 clique
  model.confirmAllPositions();
  progress = model.getProgress();
  assert.equal(progress.pendingPositions, 0);
  assert.equal(progress.positionsChecked, progress.totalPositions);
  assert.equal(progress.positionsComplete, true);
  assert.equal(progress.readyToClose, true);
});

test('DailyUpdateModel Card [03]: sinalização de divergência de custódia na corretora sem mutar dados originais', () => {
  const model = new DailyUpdateModel();
  const pos = model.positions.find(p => p.id === 'pos_bgix26'); // BGIX26, 1 un.

  // Usuário relata que na corretora aparecem 2 contratos
  model.reportPositionDivergence('pos_bgix26', {
    field: 'quantity',
    reported: 2,
    note: 'Extrato da corretora exibe 2 contratos em custódia.'
  });

  assert.equal(pos.hasDivergence, true);
  assert.equal(pos.status, 'divergente');
  assert.equal(pos.divergence.reported, 2);

  // INVARIANTE: A quantidade registrada no sistema NÃO pode ser alterada automaticamente
  assert.equal(pos.quantity, 1, 'Quantidade registrada no sistema deve ser rigorosamente preservada');

  // Divergência bloqueia o fechamento diário
  let progress = model.getProgress();
  assert.equal(progress.divergences, 1);
  assert.equal(progress.readyToClose, false);

  // Resolução da divergência após revisão
  model.resolvePositionDivergence('pos_bgix26');
  assert.equal(pos.hasDivergence, false);
  assert.equal(pos.divergence, null);
  assert.equal(pos.status, 'conferida');

  progress = model.getProgress();
  assert.equal(progress.divergences, 0);
  assert.equal(progress.readyToClose, true);
});

test('DailyUpdateModel Card [03]: operações com realização parcial (Peel Off)', () => {
  const model = new DailyUpdateModel();

  // Simula posição com realização parcial (ex: 400 restantes de 600 originais, 1 parcial)
  const pos = model.positions.find(p => p.id === 'pos_aapl34');
  pos.initialQuantity = 600;
  pos.quantity = 400;
  pos.isPartial = true;
  pos.partialCount = 1;

  // Atualiza preço
  model.updatePositionPrice('pos_aapl34', 110.00);

  // Quantidade e contagem de parciais são mantidas
  assert.equal(pos.quantity, 400);
  assert.equal(pos.initialQuantity, 600);
  assert.equal(pos.isPartial, true);
  assert.equal(pos.partialCount, 1);

  // O resultado em aberto é calculado estritamente sobre a quantidade restante (400 un.)
  const unrealized = model.getPositionUnrealizedResult(pos);
  // (110 - 100.86) * 400 = 9.14 * 400 = 3656.00
  assert.equal(Math.round(unrealized * 100) / 100, 3656.00);
});

test('DailyUpdateModel Card [04]: criação e persistência de Snapshot completo do fechamento', () => {
  const model = new DailyUpdateModel();
  const snapshot = model.createSnapshot({ date: '2026-11-20' });

  assert.equal(snapshot.date, '2026-11-20');
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.status, 'closed');
  assert.equal(snapshot.hasException, false);
  assert.equal(snapshot.realWealth, 1014295.73);
  assert.equal(snapshot.investmentWealth, 1000295.73);
  assert.equal(snapshot.checkingWealth, 14000.00);
  assert.equal(snapshot.strategyEquity, 1112175.49);
  assert.equal(snapshot.accounts.length, 8);
  assert.equal(snapshot.positions.length, 7);
  assert.ok(snapshot.auditReason.includes('Fechamento Diário'));

  // Teste de salvamento no storage
  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  model.saveSnapshot(snapshot, mockStorage);
  assert.equal(model.closingStatus, 'CLOSED');
  assert.equal(model.isDateClosed('2026-11-20', mockStorage), true);

  const retrieved = model.getSnapshotByDate('2026-11-20', mockStorage);
  assert.equal(retrieved.id, snapshot.id);
  assert.equal(retrieved.realWealth, 1014295.73);
});

test('DailyUpdateModel Card [04]: conclusão com ressalvas / exceções permitidas', () => {
  const model = new DailyUpdateModel();

  // Marca uma conta como pendente e uma posição com divergência
  model.setAccountPending('xp_daniel');
  model.reportPositionDivergence('pos_aapl34', {
    field: 'quantity',
    reported: 500,
    note: 'Corretora exibe 500 un. vs 600 un. registradas'
  });

  const progress = model.getProgress();
  assert.equal(progress.readyToClose, false);

  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  const closedWithEx = model.closeWithException('XP com instabilidade temporária na visualização de extrato', mockStorage);
  assert.equal(closedWithEx.status, 'closed_with_exception');
  assert.equal(closedWithEx.hasException, true);
  assert.equal(closedWithEx.exceptions.length, 2);
  assert.ok(closedWithEx.exceptions.some(e => e.type === 'pending_account' && e.id === 'xp_daniel'));
  assert.ok(closedWithEx.exceptions.some(e => e.type === 'divergence' && e.id === 'pos_aapl34'));
  assert.equal(model.closingStatus, 'CLOSED_WITH_EXCEPTION');
});

test('DailyUpdateModel Card [04]: correção versionada de fechamento (v1 -> v2) com trilha de auditoria', () => {
  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k)
  };

  const model = new DailyUpdateModel();
  const snapV1 = model.createSnapshot({ date: '2026-11-20' });
  model.saveSnapshot(snapV1, mockStorage);

  assert.equal(model.isDateClosed('2026-11-20', mockStorage), true);

  // Realiza correção: atualiza saldo da XP Daniel para 210.000 (diferença de +2.479)
  const updatedAccounts = JSON.parse(JSON.stringify(model.accounts));
  const xpAcc = updatedAccounts.find(a => a.id === 'xp_daniel');
  xpAcc.newBalance = 210000.00;

  const result = model.correctSnapshot('2026-11-20', { accounts: updatedAccounts }, 'Ajuste de saldo após liquidação de dividendo na XP', mockStorage);
  assert.equal(result.success, true);

  const snapV2 = result.snapshot;
  assert.equal(snapV2.version, 2);
  assert.equal(snapV2.status, 'corrected');
  assert.equal(snapV2.correctionReason, 'Ajuste de saldo após liquidação de dividendo na XP');
  assert.ok(snapV2.corrections.length === 1);
  assert.equal(snapV2.corrections[0].version, 1);
  assert.equal(snapV2.corrections[0].realWealth, 1014295.73);
  assert.equal(Math.round(snapV2.realWealth * 100) / 100, 1016774.73);
  assert.ok(snapV2.auditReason.includes('[CORREÇÃO v2]'));
});

test('DailyUpdateModel Card [04]: comparação entre dois snapshots históricos', () => {
  const model = new DailyUpdateModel();
  const history = model.getHistory();

  // Compara os dois fechamentos de amostra (19/11 e 18/11)
  const diff = model.compareSnapshots('2026-11-19', '2026-11-18');
  assert.ok(diff !== null);
  assert.equal(diff.date1, '2026-11-19');
  assert.equal(diff.date2, '2026-11-18');

  // Real wealth: 1000295.73 - 999746.13 = 549.60
  assert.equal(Math.round(diff.diffAmount * 100) / 100, 549.60);
  assert.equal(diff.accountsDiff.length, 7);
});

test('DailyUpdateModel Card [04]: Checklist de Reconciliação com a Planilha Trading Log Premium', () => {
  const model = new DailyUpdateModel();
  const recon = model.getSpreadsheetReconciliationData();

  assert.equal(recon.isFullyReconciled, true);
  assert.equal(recon.items.length, 6);

  const keys = recon.items.map(i => i.key);
  assert.ok(keys.includes('accounts_balance'));
  assert.ok(keys.includes('checking_accounts_isolation'));
  assert.ok(keys.includes('open_positions_custody'));
  assert.ok(keys.includes('cash_flows'));
  assert.ok(keys.includes('strategy_vs_real'));
  assert.ok(keys.includes('foreign_currency_nomad'));

  // Confirma a regra fundamental: posições abertas NÃO são somadas ao patrimônio real
  const posCustodyItem = recon.items.find(i => i.key === 'open_positions_custody');
  assert.ok(posCustodyItem.rule.includes('NUNCA somar posições ao Patrimônio Real'));
});

test('DailyUpdateModel Card [05]: cálculo da participação percentual das contas no Patrimônio Real (% do Total)', () => {
  const model = new DailyUpdateModel();
  const totalWealth = model.getConsolidatedRealWealth();
  assert.ok(totalWealth > 0);

  // Calcula para cada conta e verifica se a soma totaliza ~100%
  let sumShares = 0;
  model.accounts.forEach(acc => {
    const share = model.getAccountWealthSharePct(acc);
    assert.ok(typeof share === 'number');
    assert.ok(share >= 0 && share <= 100);
    // Fórmula: (saldo BRL / patrimônio total) * 100
    const expected = Math.round(((acc.newBalance / totalWealth) * 100) * 100) / 100;
    assert.equal(share, expected);
    sumShares += share;
  });

  // Soma deve estar em 100% (com tolerância máxima de 0.05% para arredondamento a 2 casas)
  assert.ok(Math.abs(sumShares - 100) < 0.05, `Soma das participações (${sumShares}%) deve ser ~100%`);

  // Conta em USD (Nomad): calculada a partir do valor convertido em BRL (acc.newBalance)
  const nomad = model.accounts.find(a => a.id === 'nomad_daniel');
  assert.equal(nomad.currency, 'USD');
  const nomadShare = model.getAccountWealthSharePct(nomad);
  const expectedNomadShare = Math.round(((nomad.newBalance / totalWealth) * 100) * 100) / 100;
  assert.equal(nomadShare, expectedNomadShare);
});

test('DailyUpdateModel Card [05]: recálculo dinâmico e tratamento seguro de divisão por zero ou dados nulos', () => {
  const model = new DailyUpdateModel();

  // 1. Recálculo ao alterar o saldo de uma conta
  const initialTotal = model.getConsolidatedRealWealth();
  const xp = model.accounts.find(a => a.id === 'xp_daniel');
  const initialXpShare = model.getAccountWealthSharePct(xp);

  // Aumenta o saldo da XP em R$ 100.000
  model.updateAccountBalance('xp_daniel', xp.newBalance + 100000);
  const newTotal = model.getConsolidatedRealWealth();
  assert.equal(newTotal, initialTotal + 100000);

  const updatedXpShare = model.getAccountWealthSharePct(xp);
  assert.ok(updatedXpShare > initialXpShare, 'A participação da XP deve aumentar');

  // A soma de todas as contas recalcula mantendo ~100%
  const newSumShares = model.accounts.reduce((sum, a) => sum + model.getAccountWealthSharePct(a), 0);
  assert.ok(Math.abs(newSumShares - 100) < 0.05);

  // 2. Tratamento de divisão por zero / patrimônio zero ou negativo
  assert.equal(model.getAccountWealthSharePct(xp, 0), 0);
  assert.equal(model.getAccountWealthSharePct(xp, -5000), 0);
  assert.equal(model.getAccountWealthSharePct(xp, null), 0);
  assert.equal(model.getAccountWealthSharePct(null, newTotal), 0);

  // 3. Status provisório de distribuição
  assert.equal(model.isWealthDistributionProvisional(), false);
  model.setAccountPending('genial_daniel');
  assert.equal(model.isWealthDistributionProvisional(), true);
  model.keepAccountBalance('genial_daniel');
  assert.equal(model.isWealthDistributionProvisional(), false);
});

test('DailyUpdateModel Card [05]: persistência da participação percentual no snapshot e consulta histórica', () => {
  const model = new DailyUpdateModel();
  const snapshot = model.createSnapshot();

  assert.ok(Array.isArray(snapshot.accounts));
  assert.equal(snapshot.accounts.length, 8);

  // Cada conta deve conter wealthSharePct gravado
  let snapshotSharesSum = 0;
  snapshot.accounts.forEach(acc => {
    assert.ok(acc.wealthSharePct !== undefined);
    assert.ok(typeof acc.wealthSharePct === 'number');
    assert.ok(acc.wealthSharePct > 0);
    snapshotSharesSum += acc.wealthSharePct;
  });
  assert.ok(Math.abs(snapshotSharesSum - 100) < 0.05);

  // Comparação histórica inclui share1, share2 e shareDiff
  const diff = model.compareSnapshots('2026-11-19', '2026-11-18');
  assert.ok(diff);
  assert.ok(Array.isArray(diff.accountsDiff));
  diff.accountsDiff.forEach(a => {
    assert.ok(a.share1 !== undefined);
    assert.ok(a.share2 !== undefined);
    assert.ok(a.shareDiff !== undefined);
  });
});

test('DailyUpdateModel: getEquityHistorySeries() e separação rigorosa por titular (Daniel vs Natália)', () => {
  const model = new DailyUpdateModel();
  const res = model.getEquityHistorySeries({ period: 'all', owner: 'both' });

  assert.ok(res);
  assert.ok(Array.isArray(res.series));
  assert.ok(res.series.length >= 10, 'Deve conter histórico de snapshots consolidado');
  assert.equal(res.meta.isReliableSplit, true, 'Separação de titulares deve ser 100% confiável');

  // Verifica que em todos os snapshots da série: Daniel + Natália === Total Consolidado
  res.series.forEach(point => {
    assert.ok(point.danielWealth > 0, 'Daniel deve ter patrimônio positivo');
    assert.ok(point.nataliaWealth > 0, 'Natália deve ter patrimônio positivo');
    assert.ok(point.totalWealth > 0, 'Total deve ter patrimônio positivo');

    const sum = Math.round((point.danielWealth + point.nataliaWealth) * 100) / 100;
    assert.equal(sum, point.totalWealth, `Soma dos titulares (${sum}) deve bater com totalWealth (${point.totalWealth})`);
    assert.ok(point.dateFormatted);
    assert.ok(point.fullDate);
  });

  // Verifica filtro de período
  const res30d = model.getEquityHistorySeries({ period: '30D' });
  assert.ok(res30d.series.length > 0);
  assert.ok(res30d.series.length <= res.series.length);

  // Formatação compacta BRL
  assert.equal(DailyUpdateModel.formatCompactBRL(1104419.93), 'R$ 1,10M');
  assert.equal(DailyUpdateModel.formatCompactBRL(573408), 'R$ 573k');
  assert.equal(DailyUpdateModel.formatCompactBRL(500), 'R$ 500');
  assert.equal(DailyUpdateModel.formatCompactBRL(-25000), '-R$ 25k');
});

test('DailyUpdateModel: cálculo preciso de variações diárias consecutivas e acumuladas do período', () => {
  const model = new DailyUpdateModel();
  const res = model.getEquityHistorySeries({ period: 'all' });

  const summary = res.summary;
  assert.ok(summary.daniel);
  assert.ok(summary.natalia);
  assert.ok(summary.total);

  // Daniel summary
  assert.ok(summary.daniel.current > 0);
  assert.ok(summary.daniel.min > 0);
  assert.ok(summary.daniel.max >= summary.daniel.min);
  assert.ok(typeof summary.daniel.periodVarPct === 'number');

  // Natália summary
  assert.ok(summary.natalia.current > 0);
  assert.ok(summary.natalia.min > 0);
  assert.ok(summary.natalia.max >= summary.natalia.min);
  assert.ok(typeof summary.natalia.periodVarPct === 'number');

  // Total summary
  assert.ok(summary.total.current > 0);
  assert.ok(summary.total.min > 0);
  assert.ok(summary.total.max >= summary.total.min);
  assert.ok(typeof summary.total.periodVarPct === 'number');

  // Verifica fórmula de variação consecutiva entre dois pontos
  if (res.series.length >= 2) {
    const p1 = res.series[0];
    const p2 = res.series[1];
    const expectedVarNominal = Math.round((p2.totalWealth - p1.totalWealth) * 100) / 100;
    const expectedVarPct = Math.round(((p2.totalWealth / p1.totalWealth) - 1) * 10000) / 100;

    assert.equal(p2.totalVarAmount, expectedVarNominal);
    assert.equal(p2.totalVarPct, expectedVarPct);
  }
});

test('DailyUpdateModel: Agrupamento de Contas por Titular (getTitulares, getGroupedAccounts, subtotais e participações)', () => {
  const model = new DailyUpdateModel();
  
  // 1. getTitulares()
  const titulares = model.getTitulares();
  assert.deepEqual(titulares, ['Daniel', 'Natália']);

  // 2. getTitularTheme()
  assert.equal(model.getTitularTheme('Daniel'), 'blue');
  assert.equal(model.getTitularTheme('Natália'), 'purple');
  assert.equal(model.getTitularTheme('Natalia'), 'purple');
  assert.equal(model.getTitularTheme('Outro Titular', 2), 'emerald');

  // 3. Subtotais individuais por titular
  const subtotalDaniel = model.getTitularSubtotal('Daniel');
  const subtotalNatalia = model.getTitularSubtotal('Natália');
  const realWealth = model.getConsolidatedRealWealth();

  assert.equal(subtotalDaniel, 592675.60);
  assert.equal(subtotalNatalia, 421620.13);
  assert.equal(Math.round((subtotalDaniel + subtotalNatalia) * 100) / 100, 1014295.73);
  assert.equal(Math.round((subtotalDaniel + subtotalNatalia) * 100) / 100, Math.round(realWealth * 100) / 100);

  // 4. Participações percentuais dos titulares
  const shareDaniel = model.getTitularSharePct('Daniel');
  const shareNatalia = model.getTitularSharePct('Natália');
  assert.equal(shareDaniel, 58.43);
  assert.equal(shareNatalia, 41.57);
  assert.equal(Math.round((shareDaniel + shareNatalia) * 100) / 100, 100.00);

  // 5. getGroupedAccounts()
  const grouped = model.getGroupedAccounts();
  assert.equal(grouped.length, 2);

  const groupD = grouped[0];
  assert.equal(groupD.person, 'Daniel');
  assert.equal(groupD.theme, 'blue');
  assert.equal(groupD.count, 6);
  assert.equal(groupD.subtotal, 592675.60);
  assert.equal(groupD.investmentSubtotal, 578675.60);
  assert.equal(groupD.checkingSubtotal, 14000.00);
  assert.equal(groupD.sharePct, 58.43);
  assert.equal(groupD.accounts.length, 6);

  const groupN = grouped[1];
  assert.equal(groupN.person, 'Natália');
  assert.equal(groupN.theme, 'purple');
  assert.equal(groupN.count, 2);
  assert.equal(groupN.subtotal, 421620.13);
  assert.equal(groupN.investmentSubtotal, 421620.13);
  assert.equal(groupN.checkingSubtotal, 0.00);
  assert.equal(groupN.sharePct, 41.57);
  assert.equal(groupN.accounts.length, 2);
});

test('DailyUpdateModel: Reconciliação e paridade matemática absoluta entre Atualização Diária e Evolução da Equity', () => {
  const model = new DailyUpdateModel();

  // 1. Valores da tela Atualização Diária (Agrupamento de Contas)
  const grouped = model.getGroupedAccounts();
  const danielGroup = grouped.find(g => g.person === 'Daniel');
  const nataliaGroup = grouped.find(g => g.person === 'Natália');
  const consolidatedRealWealth = model.getConsolidatedRealWealth();
  const investmentWealth = model.getInvestmentWealth();
  const checkingWealth = model.getCheckingWealth();

  assert.equal(danielGroup.subtotal, 592675.60, 'Total Daniel na Atualização Diária deve ser R$ 592.675,60');
  assert.equal(danielGroup.investmentSubtotal, 578675.60, 'Investimentos Daniel deve ser R$ 578.675,60');
  assert.equal(danielGroup.checkingSubtotal, 14000.00, 'Conta Corrente Daniel deve ser R$ 14.000,00');
  assert.equal(nataliaGroup.subtotal, 421620.13, 'Natália na Atualização Diária deve ser R$ 421.620,13');
  assert.equal(consolidatedRealWealth, 1014295.73, 'Consolidado na Atualização Diária deve ser R$ 1.014.295,73');
  assert.equal(investmentWealth, 1000295.73, 'Equity de Investimentos deve ser R$ 1.000.295,73');
  assert.equal(checkingWealth, 14000.00, 'Total de Contas Correntes deve ser R$ 14.000,00');
  assert.equal(Math.round((danielGroup.subtotal + nataliaGroup.subtotal) * 100) / 100, consolidatedRealWealth);

  // 2. Valores da aba Evolução da Equity (Modal)
  const equityData = model.getEquityHistorySeries({ period: 'all', owner: 'both' });
  const summary = equityData.summary;

  assert.equal(summary.daniel.current, 578675.60, 'Daniel na Evolução da Equity deve ser R$ 578.675,60 (estritamente investimentos)');
  assert.equal(summary.natalia.current, 421620.13, 'Natália na Evolução da Equity deve ser R$ 421.620,13');
  assert.equal(summary.total.current, 1000295.73, 'Consolidado na Evolução da Equity deve ser R$ 1.000.295,73');

  // Paridade exata nos investimentos (diferença zero)
  assert.equal(danielGroup.investmentSubtotal - summary.daniel.current, 0, 'Divergência de investimentos de Daniel deve ser ZERO');
  assert.equal(nataliaGroup.investmentSubtotal - summary.natalia.current, 0, 'Divergência de investimentos de Natália deve ser ZERO');
  assert.equal(investmentWealth - summary.total.current, 0, 'Divergência de investimentos consolidada deve ser ZERO');

  // Diferença total auditada corresponde exatamente à conta corrente Bradesco
  assert.equal(danielGroup.subtotal - summary.daniel.current, 14000.00, 'Diferença de Daniel é exatamente os R$ 14.000,00 do Bradesco');
  assert.equal(nataliaGroup.subtotal - summary.natalia.current, 0.00, 'Natália não possui contas correntes');
  assert.equal(consolidatedRealWealth - summary.total.current, 14000.00, 'Diferença Consolidada é exatamente os R$ 14.000,00 do Bradesco');

  // 3. Regra de ouro: Em todos os pontos da série histórica, Daniel + Natália === Total Consolidado
  equityData.series.forEach(point => {
    const sum = Math.round((point.danielWealth + point.nataliaWealth) * 100) / 100;
    assert.equal(sum, point.totalWealth, `Ponto ${point.date}: Daniel (${point.danielWealth}) + Natália (${point.nataliaWealth}) !== Total (${point.totalWealth})`);
  });

  // 4. Auto-sanitização de dados legados corrompidos/mockados no storage
  const mockStorageMap = new Map();
  const staleMockData = [
    {
      id: 'snap_corrupt',
      date: '2026-11-20',
      realWealth: 1101435.43,
      accounts: [
        { id: 'xp_daniel', person: 'Daniel', newBalance: 207521.00 },
        { id: 'nomad_daniel', person: 'Daniel', newBalance: 105374.00 },
        { id: 'genial_daniel', person: 'Daniel', newBalance: 257418.00 },
        { id: 'clear_daniel', person: 'Daniel', newBalance: 3069.00 },
        { id: 'xp_natalia', person: 'Natália', newBalance: 220328.00 },
        { id: 'genial_natalia', person: 'Natália', newBalance: 307725.43 } // Mock antigo com > 300k
      ]
    }
  ];
  mockStorageMap.set('healthy-daily-update-history', JSON.stringify(staleMockData));

  const mockStorage = {
    getItem: (k) => mockStorageMap.get(k) || null,
    setItem: (k, v) => mockStorageMap.set(k, String(v))
  };

  const sanitizedHistory = model.getHistory(mockStorage);
  assert.ok(sanitizedHistory.length >= 10);
  assert.equal(sanitizedHistory[0].date, '2026-11-19');
  assert.equal(sanitizedHistory[0].realWealth, 1000295.73);

  // O storage mockado foi atualizado com a versão higienizada
  const storedAfter = JSON.parse(mockStorageMap.get('healthy-daily-update-history'));
  assert.equal(storedAfter[0].date, '2026-11-20' ? '2026-11-19' : '2026-11-19');
  assert.equal(storedAfter[0].realWealth, 1000295.73);
});

test('DailyUpdateModel: Vinculação de posições a contas e reflexo automático nos Saldos Totais', () => {
  const model = new DailyUpdateModel();

  // 1. Vinculação de posição à conta (linkPositionToAccount)
  const linkRes = model.linkPositionToAccount('pos_aapl34', 'xp_daniel');
  assert.ok(linkRes);
  assert.equal(linkRes.position.accountId, 'xp_daniel');
  assert.equal(linkRes.account.label, 'XP — Daniel');

  // getPositionsByAccount retorna as posições vinculadas
  const xpPositions = model.getPositionsByAccount('xp_daniel');
  assert.ok(xpPositions.some(p => p.id === 'pos_aapl34'));

  // 2. Reflexo de atualização de cotação no Saldo Total da Conta
  const xpAcc = model.accounts.find(a => a.id === 'xp_daniel');
  const initialBalance = Number(xpAcc.newBalance); // 207521.00
  const pos = model.positions.find(p => p.id === 'pos_aapl34');
  const initialPosPrice = Number(pos.currentPrice); // 103.21
  const qty = Number(pos.quantity); // 600

  // Usuário confere e altera cotação de 103.21 para 105.21 (+R$ 2,00 por ação = +R$ 1.200,00)
  const updateRes = model.updatePositionPrice('pos_aapl34', '105,21');
  assert.equal(updateRes.success, true);
  assert.equal(pos.currentPrice, 105.21);
  assert.equal(updateRes.deltaTotal, 1200.00);
  assert.equal(updateRes.affectedAccount.id, 'xp_daniel');

  // Saldo da conta XP reflete exatamente a variação de +R$ 1.200,00
  assert.equal(xpAcc.newBalance, initialBalance + 1200.00);
  assert.equal(xpAcc.status, 'updated');

  // 3. Posição desvinculada (accountId: null) não afeta contas
  model.linkPositionToAccount('pos_amzn34', null);
  const amznPos = model.positions.find(p => p.id === 'pos_amzn34');
  assert.equal(amznPos.accountId, null);
  const xpBalanceBeforeAmzn = xpAcc.newBalance;
  model.updatePositionPrice('pos_amzn34', '85,00');
  assert.equal(xpAcc.newBalance, xpBalanceBeforeAmzn, 'Posição desvinculada não deve alterar saldos de contas');

  // 4. Inclusão de accountId e accountLabel no snapshot de fechamento
  const snapshot = model.createSnapshot();
  const snapAapl = snapshot.positions.find(p => p.id === 'pos_aapl34');
  assert.equal(snapAapl.accountId, 'xp_daniel');
  assert.equal(snapAapl.accountLabel, 'XP — Daniel');
});

test('DailyUpdateModel: 10 Cenários de Aceitação — Separação entre Patrimônio Total e Equity de Investimentos', () => {
  // Cenário 1: Adicionar Bradesco com R$ 14.000,00 aumenta o Patrimônio Total em exatamente R$ 14.000,00
  const modelWithoutBradesco = new DailyUpdateModel({
    accounts: DailyUpdateModel.DEFAULT_ACCOUNTS.filter(a => a.id !== 'bradesco_daniel')
  });
  const modelWithBradesco = new DailyUpdateModel();
  const diffPatrimonio = modelWithBradesco.getConsolidatedRealWealth() - modelWithoutBradesco.getConsolidatedRealWealth();
  assert.equal(Math.round(diffPatrimonio * 100) / 100, 14000.00);

  // Cenário 2: O total individual do Daniel aumenta em R$ 14.000,00
  const danielWithout = modelWithoutBradesco.getTitularSubtotal('Daniel');
  const danielWith = modelWithBradesco.getTitularSubtotal('Daniel');
  assert.equal(Math.round((danielWith - danielWithout) * 100) / 100, 14000.00);

  // Cenário 3: A Equity permanece exatamente igual ao valor anterior
  const equityWithout = modelWithoutBradesco.getInvestmentWealth();
  const equityWith = modelWithBradesco.getInvestmentWealth();
  assert.equal(equityWith, equityWithout);
  assert.equal(equityWith, 1000295.73);

  // Cenário 4: O histórico de Equity permanece inalterado
  const seriesWithout = modelWithoutBradesco.getEquityHistorySeries({ period: 'all' });
  const seriesWith = modelWithBradesco.getEquityHistorySeries({ period: 'all' });
  assert.equal(seriesWith.summary.total.current, seriesWithout.summary.total.current);
  assert.equal(seriesWith.summary.daniel.current, seriesWithout.summary.daniel.current);
  assert.equal(seriesWith.summary.natalia.current, seriesWithout.summary.natalia.current);

  // Cenário 5: Uma alteração no saldo do Bradesco modifica o Patrimônio Total, mas não modifica a Equity
  const modelTest = new DailyUpdateModel();
  const initialEquity = modelTest.getInvestmentWealth();
  const initialRealWealth = modelTest.getConsolidatedRealWealth();
  modelTest.updateAccountBalance('bradesco_daniel', 20000.00); // +6.000
  assert.equal(modelTest.getConsolidatedRealWealth(), initialRealWealth + 6000.00);
  assert.equal(modelTest.getInvestmentWealth(), initialEquity); // Equity permanece estritamente idêntica!

  // Cenário 6: Uma alteração no saldo de uma conta de investimentos continua refletindo na Equity conforme as regras atuais
  const equityBeforeXp = modelTest.getInvestmentWealth();
  modelTest.updateAccountBalance('xp_daniel', 217521.00); // +10.000
  assert.equal(modelTest.getInvestmentWealth(), equityBeforeXp + 10000.00);

  // Cenário 7: O aviso explicativo apresenta os valores corretos e atualizados
  const modelNotice = new DailyUpdateModel();
  assert.equal(modelNotice.hasCheckingDifference(), true);
  assert.equal(modelNotice.getInvestmentWealth(), 1000295.73);
  assert.equal(modelNotice.getCheckingWealth(), 14000.00);
  assert.equal(modelNotice.getConsolidatedRealWealth(), 1014295.73);

  // Cenário 8: O aviso desaparece quando não existe diferença entre patrimônio e equity
  const modelOnlyInvestments = new DailyUpdateModel({
    accounts: DailyUpdateModel.DEFAULT_ACCOUNTS.filter(a => a.type !== 'CHECKING')
  });
  assert.equal(modelOnlyInvestments.hasCheckingDifference(), false);
  assert.equal(modelOnlyInvestments.getCheckingWealth(), 0);
  assert.equal(modelOnlyInvestments.getConsolidatedRealWealth(), modelOnlyInvestments.getInvestmentWealth());

  // Cenário 9: Todas as contas existentes permanecem classificadas como investimentos
  const originalAccountIds = ['xp_daniel', 'nomad_daniel', 'genial_daniel', 'clear_daniel', 'eqseed_daniel', 'xp_natalia', 'genial_natalia'];
  originalAccountIds.forEach(id => {
    const acc = modelNotice.accounts.find(a => a.id === id);
    assert.ok(acc, `Conta ${id} deve existir`);
    assert.equal(acc.type, 'INVESTMENT', `Conta ${id} deve ser classificada como INVESTMENT`);
  });

  // Cenário 10: A inclusão de futuras contas correntes respeita automaticamente as mesmas regras
  const modelWithFutureChecking = new DailyUpdateModel();
  modelWithFutureChecking.accounts.push({
    id: 'itau_natalia',
    label: 'Itaú — Natália',
    broker: 'itau',
    person: 'Natália',
    type: 'CHECKING',
    newBalance: 8500.00,
    previousBalance: 8500.00,
    status: 'keep'
  });
  // Patrimônio total aumenta em 8.500
  assert.equal(modelWithFutureChecking.getConsolidatedRealWealth(), 1014295.73 + 8500.00);
  // Total da Natália aumenta em 8.500
  assert.equal(modelWithFutureChecking.getTitularSubtotal('Natália'), 421620.13 + 8500.00);
  // Equity da estratégia permanece rigorosamente a mesma
  assert.equal(modelWithFutureChecking.getInvestmentWealth(), 1000295.73);
  // Equity de Natália permanece rigorosamente a mesma
  assert.equal(modelWithFutureChecking.getTitularSubtotal('Natália', 'newBalance', 'INVESTMENT'), 421620.13);
  // Conta corrente não pode receber custódia de posições
  const rejectPos = modelWithFutureChecking.linkPositionToAccount('pos_aapl34', 'itau_natalia');
  assert.equal(rejectPos.success, false);
});

test('DailyUpdateModel: 11 Cenários de Aceitação — Volume Financeiro, Exposição Sincronizada e Heat Oficial', () => {
  // Cenário 1: O volume financeiro de cada posição é calculado corretamente
  const model = new DailyUpdateModel();

  const vAapl = model.getPositionFinancialVolume(model.positions.find(p => p.id === 'pos_aapl34'));
  const vAmzn = model.getPositionFinancialVolume(model.positions.find(p => p.id === 'pos_amzn34'));
  const vWin = model.getPositionFinancialVolume(model.positions.find(p => p.id === 'pos_winz26'));
  const vBrav = model.getPositionFinancialVolume(model.positions.find(p => p.id === 'pos_brav3'));
  const vBbas = model.getPositionFinancialVolume(model.positions.find(p => p.id === 'pos_bbas3'));
  const vBgi = model.getPositionFinancialVolume(model.positions.find(p => p.id === 'pos_bgix26'));
  const vM2st = model.getPositionFinancialVolume(model.positions.find(p => p.id === 'pos_m2st34'));

  assert.equal(vAapl, 61926.00); // 600 * 103.21 * 1
  assert.equal(vAmzn, 38515.00); // 500 * 77.03 * 1
  assert.equal(vWin, 67038.00);  // 2 * 167595 * 0.20
  assert.equal(vBrav, 6435.00);  // 500 * 12.87 * 1
  assert.equal(vBbas, 4290.00);  // 300 * 14.30 * 1
  assert.equal(vBgi, 131670.00); // 1 * 399.00 * 330
  assert.equal(vM2st, 4428.00);  // 600 * 7.38 * 1

  // Cenário 2: O totalizador corresponde à soma das posições abertas
  const expectedTotal = 61926.00 + 38515.00 + 67038.00 + 6435.00 + 4290.00 + 131670.00 + 4428.00;
  assert.equal(expectedTotal, 314302.00);
  assert.equal(model.getTotalExposure(), 314302.00);

  // Cenário 3: O KPI Exposição Atual corresponde exatamente ao totalizador
  const kpiExposure = model.getTotalExposure();
  const tableTotalizer = model.positions
    .filter(p => !p.closed && p.status !== 'encerrada')
    .reduce((sum, p) => sum + model.getPositionFinancialVolume(p), 0);
  assert.equal(kpiExposure, tableTotalizer);
  assert.equal(Math.round(model.getExposurePct() * 100) / 100, 31.42);

  // Cenário 4: O encerramento de uma posição atualiza os dois indicadores
  const closeRes = model.closePosition('pos_aapl34');
  assert.equal(closeRes.success, true);
  assert.equal(model.getTotalExposure(), 314302.00 - 61926.00);
  assert.equal(model.getTotalExposure(), 252376.00);
  const updatedTableTotalizer = model.positions
    .filter(p => !p.closed && p.status !== 'encerrada')
    .reduce((sum, p) => sum + model.getPositionFinancialVolume(p), 0);
  assert.equal(model.getTotalExposure(), updatedTableTotalizer);

  // Cenário 5: A alteração de quantidade atualiza os dois indicadores
  const modelQty = new DailyUpdateModel();
  const qtyRes = modelQty.updatePositionQuantity('pos_aapl34', 300); // reduziu pela metade (300 ações a menos: -30.963,00)
  assert.equal(qtyRes.success, true);
  assert.equal(modelQty.getPositionFinancialVolume(modelQty.positions.find(p => p.id === 'pos_aapl34')), 30963.00);
  assert.equal(modelQty.getTotalExposure(), 314302.00 - 30963.00);
  assert.equal(modelQty.getTotalExposure(), 283339.00);

  // Cenário 6: A atualização de preços recalcula corretamente a exposição
  const modelPrice = new DailyUpdateModel();
  const priceRes = modelPrice.updatePositionPrice('pos_aapl34', 110.00, { syncAccount: false });
  assert.equal(priceRes.success, true);
  assert.equal(modelPrice.getPositionFinancialVolume(modelPrice.positions.find(p => p.id === 'pos_aapl34')), 66000.00); // 600 * 110.00
  assert.equal(modelPrice.getTotalExposure(), 314302.00 + (66000.00 - 61926.00));
  assert.equal(modelPrice.getTotalExposure(), 318376.00);

  // Cenário 7: Instrumentos com multiplicadores e moedas diferentes respeitam as regras de valuation
  const modelInstruments = new DailyUpdateModel();
  // WINZ26 com multiplicador de mini-índice (0.2)
  const posWin = modelInstruments.positions.find(p => p.id === 'pos_winz26');
  assert.equal(modelInstruments.getPositionFinancialVolume(posWin), 2 * 167595 * 0.2); // 67.038,00
  // BGIX26 com multiplicador de boi gordo (330)
  const posBgi = modelInstruments.positions.find(p => p.id === 'pos_bgix26');
  assert.equal(modelInstruments.getPositionFinancialVolume(posBgi), 1 * 399.00 * 330); // 131.670,00
  // Instrumento internacional em USD com conversão cambial
  modelInstruments.positions.push({
    id: 'pos_spy',
    ticker: 'SPY',
    quantity: 10,
    currentPrice: 580.00,
    currency: 'USD',
    fxRate: 5.80,
    contractMult: 1,
    status: 'conferida'
  });
  const posSpy = modelInstruments.positions.find(p => p.id === 'pos_spy');
  assert.equal(modelInstruments.getPositionFinancialVolume(posSpy), 10 * 580.00 * 1 * 5.80); // 33.640,00
  assert.equal(modelInstruments.getTotalExposure(), 314302.00 + 33640.00);

  // Cenário 8: O Heat da Atualização Diária é idêntico ao Heat do cabeçalho
  const modelHeat = new DailyUpdateModel();
  // Simula o provedor oficial do cabeçalho (window.portfolioHeatSnapshot)
  global.window = global.window || {};
  global.window.portfolioHeatSnapshot = () => ({ heat: 2.12, status: 'ok', totalRiskBrl: 21206.27 });
  assert.equal(modelHeat.getPortfolioHeat(), 2.12);

  // Cenário 9: O limite de Heat é obtido da configuração oficial, sem valores fixos (5,00%, nunca 12,50% fixo)
  global.window.portfolioHeatLimitPct = () => 5.00;
  assert.equal(modelHeat.getHeatLimit(), 5.00);
  assert.notEqual(modelHeat.getHeatLimit(), 12.50);

  // Testa recuperação dinâmica de perfil de política de risco (ex: 6.00%)
  global.window.portfolioHeatLimitPct = () => 6.00;
  assert.equal(modelHeat.getHeatLimit(), 6.00);

  // Limpa os mocks de window
  delete global.window.portfolioHeatSnapshot;
  delete global.window.portfolioHeatLimitPct;

  // Cenário 10: Alterações nas posições e nos stops atualizam o Heat conforme a metodologia oficial
  const modelRisk = new DailyUpdateModel();
  const initialCalculatedHeat = modelRisk.calculatePositionsRiskHeat();
  assert.ok(initialCalculatedHeat > 0, 'Heat calculado deve ser maior que 0');

  // Ao subir o trailing stop de AAPL34 (de 96.49 para 100.00), o risco diminui e o Heat cai
  const stopRes = modelRisk.updatePositionStop('pos_aapl34', 100.00);
  assert.equal(stopRes.success, true);
  const updatedHeat = modelRisk.calculatePositionsRiskHeat();
  assert.ok(updatedHeat < initialCalculatedHeat, `Heat atualizado (${updatedHeat}%) deve ser menor que o inicial (${initialCalculatedHeat}%)`);

  // Ao encerrar uma posição com risco, o Heat cai ainda mais
  modelRisk.closePosition('pos_winz26');
  const heatAfterClose = modelRisk.calculatePositionsRiskHeat();
  assert.ok(heatAfterClose < updatedHeat, `Heat após encerramento (${heatAfterClose}%) deve ser menor que o anterior (${updatedHeat}%)`);

  // Cenário 11: Nenhum indicador apresenta divergência entre telas
  const snapshotModel = new DailyUpdateModel();
  snapshotModel.setPortfolioHeat(2.12);
  snapshotModel.setHeatLimit(5.00);
  const snapshot = snapshotModel.createSnapshot();

  // Garante que o snapshot auditável gravado possui total paridade
  assert.equal(snapshot.totalExposure, snapshotModel.getTotalExposure());
  assert.equal(snapshot.portfolioHeat, 2.12);
  assert.equal(snapshot.heatLimit, 5.00);
  assert.equal(snapshot.totalExposure, 314302.00);
  assert.equal(snapshot.positions.length, 7);
  snapshot.positions.forEach(p => {
    assert.ok(p.financialVolume > 0, `Posição ${p.ticker} deve registrar financialVolume`);
  });
});

test('DailyUpdateModel: Resultado Atual (Compras, Vendas, Multiplicadores de Futuros, Câmbio USD) e Agrupamento por Mercado', () => {
  const model = new DailyUpdateModel();

  // 1. Verifica cálculo financeiro individual das 7 posições padrão
  const aapl = model.positions.find(p => p.id === 'pos_aapl34'); // Long 600, entry 100.86, curr 103.21, mult 1
  const amzn = model.positions.find(p => p.id === 'pos_amzn34'); // Long 500, entry 78.69, curr 77.03, mult 1
  const win = model.positions.find(p => p.id === 'pos_winz26');  // Short 2, entry 167685, curr 167595, mult 0.2
  const brav = model.positions.find(p => p.id === 'pos_brav3');  // Long 500, entry 14.06, curr 12.87, mult 1
  const bbas = model.positions.find(p => p.id === 'pos_bbas3');  // Long 300, entry 15.48, curr 14.30, mult 1
  const bgi = model.positions.find(p => p.id === 'pos_bgix26');  // Long 1, entry 402.25, curr 399.00, mult 330
  const m2st = model.positions.find(p => p.id === 'pos_m2st34'); // Long 600, entry 8.99, curr 7.38, mult 1

  // AAPL34: (103.21 - 100.86) * +1 * 600 * 1 = +1410.00 (+2.33%)
  assert.equal(model.getPositionUnrealizedResult(aapl), 1410.00);
  assert.equal(model.getPositionUnrealizedPct(aapl), 2.33);

  // AMZN34: (77.03 - 78.69) * +1 * 500 * 1 = -830.00 (-2.11%)
  assert.equal(model.getPositionUnrealizedResult(amzn), -830.00);
  assert.equal(model.getPositionUnrealizedPct(amzn), -2.11);

  // WINZ26 (Short/Venda com mult 0.2): (167595 - 167685) * -1 * 2 * 0.2 = +36.00 (+0.05%)
  // Apesar da variação de preço do ativo ser negativa (-0.05%), a posição é Vendida e está no LUCRO (+R$ 36,00)
  assert.ok(model.getPositionVariationPct(win) < 0);
  assert.equal(model.getPositionUnrealizedResult(win), 36.00);
  assert.equal(model.getPositionUnrealizedPct(win), 0.05);

  // BGIX26 (Long com mult 330): (399.00 - 402.25) * +1 * 1 * 330 = -1072.50 (-0.81%)
  assert.equal(model.getPositionUnrealizedResult(bgi), -1072.50);
  assert.equal(model.getPositionUnrealizedPct(bgi), -0.81);

  // BRAV3: (12.87 - 14.06) * 500 = -595.00 (-8.46%)
  assert.equal(model.getPositionUnrealizedResult(brav), -595.00);
  assert.equal(model.getPositionUnrealizedPct(brav), -8.46);

  // BBAS3: (14.30 - 15.48) * 300 = -354.00 (-7.62%)
  assert.equal(model.getPositionUnrealizedResult(bbas), -354.00);
  assert.equal(model.getPositionUnrealizedPct(bbas), -7.62);

  // M2ST34: (7.38 - 8.99) * 600 = -966.00 (-17.91%)
  assert.equal(model.getPositionUnrealizedResult(m2st), -966.00);
  assert.equal(model.getPositionUnrealizedPct(m2st), -17.91);

  // 2. Resultado zerado (entry === current)
  const breakevenPos = { ticker: 'WEGE3', quantity: 200, entryPrice: 50.00, currentPrice: 50.00, contractMult: 1 };
  assert.equal(model.getPositionUnrealizedResult(breakevenPos), 0);
  assert.equal(model.getPositionUnrealizedPct(breakevenPos), 0);

  // 3. Posição em moeda estrangeira (USD) com conversão cambial e custos
  const usdShortPos = {
    ticker: 'NVDA',
    direction: 'short',
    quantity: 10,
    entryPrice: 140.00,
    currentPrice: 135.00,
    currency: 'USD',
    fxRate: 5.95,
    contractMult: 1,
    costs: 15.00
  };
  // (135 - 140) * -1 * 10 * 1 * 5.95 - 15.00 = 297.50 - 15.00 = +282.50
  assert.equal(model.getPositionUnrealizedResult(usdShortPos), 282.50);

  // 4. Classificação de mercado preservada como utilitário, mas agrupamento oficial é 100% por ESTRATÉGIA
  assert.equal(model.classifyPositionMarket(win), 'FUTURES');
  assert.equal(model.classifyPositionMarket(bgi), 'FUTURES');
  assert.equal(model.classifyPositionMarket(bbas), 'STOCK');
  assert.equal(model.classifyPositionMarket(brav), 'STOCK');
  assert.equal(model.classifyPositionMarket(aapl), 'BDR');
  assert.equal(model.classifyPositionMarket(amzn), 'BDR');
  assert.equal(model.classifyPositionMarket(m2st), 'BDR');

  // Testa agrupamento das 7 posições padrão exclusivamente por ESTRATÉGIA (Tendência e Volatilidade)
  const groups = model.getGroupedPositions();
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(g => g.key), ['TREND_FOLLOWING', 'VOLATILITY_TRADING']);

  const gTrend = groups.find(g => g.key === 'TREND_FOLLOWING');
  assert.equal(gTrend.label, 'Tendência');
  assert.equal(gTrend.count, 3); // AAPL34 (BDR), AMZN34 (BDR), WINZ26 (Futuro) juntos!
  assert.equal(gTrend.totalVolume, 61926.00 + 38515.00 + 67038.00); // 167479.00
  assert.equal(gTrend.totalUnrealizedResult, 1410.00 - 830.00 + 36.00); // +616.00

  const gVol = groups.find(g => g.key === 'VOLATILITY_TRADING');
  assert.equal(gVol.label, 'Volatilidade');
  assert.equal(gVol.count, 4); // BRAV3 (Ação), BBAS3 (Ação), BGIX26 (Futuro), M2ST34 (BDR) juntos!
  assert.equal(gVol.totalVolume, 6435.00 + 4290.00 + 131670.00 + 4428.00); // 146823.00
  assert.equal(gVol.totalUnrealizedResult, -595.00 - 354.00 - 1072.50 - 966.00); // -2987.50

  // 5. Garantir que subtotais são informativos e não causam dupla contagem no Total Exposto nem no Resultado Total
  const sumGroupVolumes = groups.reduce((acc, g) => acc + g.totalVolume, 0);
  assert.equal(sumGroupVolumes, model.getTotalExposure());
  assert.equal(model.getTotalExposure(), 314302.00);

  const sumGroupResults = Math.round(groups.reduce((acc, g) => acc + g.totalUnrealizedResult, 0) * 100) / 100;
  assert.equal(sumGroupResults, model.getTotalUnrealizedResult());
  assert.equal(model.getTotalUnrealizedResult(), -2371.50);

  // 6. Operações legadas sem estratégia explícita nunca são inferidas por ticker/ativo e vão para "Não classificada"
  model.positions.push(
    { id: 'pos_hglg11', ticker: 'HGLG11', assetClass: 'FII', strategy: 'TREND_FOLLOWING', quantity: 100, entryPrice: 160.00, currentPrice: 162.50, contractMult: 1, status: 'conferida', checked: true },
    { id: 'pos_bova11', ticker: 'BOVA11', assetClass: 'ETF', strategy: 'VOLATILITY_TRADING', quantity: 200, entryPrice: 125.00, currentPrice: 124.00, contractMult: 1, status: 'conferida', checked: true },
    { id: 'pos_legacy_unclass', ticker: 'PETR4', assetClass: 'STOCK', quantity: 100, entryPrice: 38.00, currentPrice: 38.00, contractMult: 1, status: 'conferida', checked: true }
  );

  const allGroups = model.getGroupedPositions();
  assert.deepEqual(allGroups.map(g => g.key), ['TREND_FOLLOWING', 'VOLATILITY_TRADING', 'UNCLASSIFIED']);
  assert.equal(allGroups.find(g => g.key === 'UNCLASSIFIED').label, 'Não classificada');
  assert.equal(allGroups.find(g => g.key === 'UNCLASSIFIED').positions[0].ticker, 'PETR4');
  assert.equal(DailyUpdateModel.resolvePositionStrategy({ ticker: 'WINZ26', assetClass: 'FUTURES' }), 'UNCLASSIFIED', 'Nunca inferir estratégia pelo ticker ou classe de ativo');

  // 7. Identificação C/V (Compra = 'C', Venda = 'V') pela direção original da operação (independente de lucro ou prejuízo)
  assert.equal(model.getPositionSideCode(win), 'V'); // WINZ26 vendido em lucro (+R$ 36,00) -> V
  assert.equal(model.getPositionSideCode(bgi), 'C'); // BGIX26 comprado em prejuízo (-R$ 1.072,50) -> C
  assert.equal(model.getPositionSideCode(bbas), 'C'); // BBAS3 comprado em prejuízo -> C
  assert.equal(model.getPositionSideCode(brav), 'C'); // BRAV3 comprado em prejuízo -> C
  assert.equal(model.getPositionSideCode(aapl), 'C'); // AAPL34 comprado em lucro -> C
  assert.equal(model.getPositionSideCode(amzn), 'C'); // AMZN34 comprado em prejuízo -> C
  assert.equal(model.getPositionSideCode(m2st), 'C'); // M2ST34 comprado em prejuízo -> C
});

test('DailyUpdateModel: Calendário oficial de dias úteis B3 e cálculo de Duração das operações', () => {
  const { isB3TradingDay, calculateB3TradingDuration, formatTradingDurationLabel } = DailyUpdateModel;

  // Finais de semana nunca são pregão
  assert.equal(isB3TradingDay('2026-11-14'), false, 'Sábado não é dia útil');
  assert.equal(isB3TradingDay('2026-11-15'), false, 'Domingo / Proclamação da República não é dia útil');

  // Feriados nacionais fixos e específicos da B3
  assert.equal(isB3TradingDay('2026-01-01'), false, 'Confraternização Universal');
  assert.equal(isB3TradingDay('2026-04-21'), false, 'Tiradentes');
  assert.equal(isB3TradingDay('2026-05-01'), false, 'Dia do Trabalho');
  assert.equal(isB3TradingDay('2026-09-07'), false, 'Independência');
  assert.equal(isB3TradingDay('2026-10-12'), false, 'Nossa Senhora Aparecida');
  assert.equal(isB3TradingDay('2026-11-02'), false, 'Finados');
  assert.equal(isB3TradingDay('2026-11-20'), false, 'Dia da Consciência Negra (Feriado Nacional B3)');
  assert.equal(isB3TradingDay('2026-12-24'), false, 'Véspera de Natal (sem pregão na B3)');
  assert.equal(isB3TradingDay('2026-12-25'), false, 'Natal');
  assert.equal(isB3TradingDay('2026-12-31'), false, 'Último dia útil do ano (sem pregão na B3)');
  assert.equal(isB3TradingDay('2022-12-30'), false, 'Sexta-feira 30/12/2022 (último dia útil bancário sem pregão B3)');

  // Feriados móveis 2026 (Carnaval, Sexta-feira Santa, Corpus Christi) e Quarta de Cinzas (tem pregão a partir das 13h)
  assert.equal(isB3TradingDay('2026-02-16'), false, 'Segunda de Carnaval 2026');
  assert.equal(isB3TradingDay('2026-02-17'), false, 'Terça de Carnaval 2026');
  assert.equal(isB3TradingDay('2026-02-18'), true, 'Quarta-feira de Cinzas tem pregão na B3');
  assert.equal(isB3TradingDay('2026-04-03'), false, 'Sexta-feira Santa 2026');
  assert.equal(isB3TradingDay('2026-06-04'), false, 'Corpus Christi 2026');
  assert.equal(isB3TradingDay('2026-07-09'), true, '9 de julho opera normalmente na B3 desde 2022');

  // Exemplos oficiais de contagem: dia da entrada = 0; somente pregões efetivos incrementam
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-13'), 0, 'Dia da entrada é marco zero');
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-14'), 0, 'Sábado não incrementa');
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-15'), 0, 'Domingo não incrementa');
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-16'), 1, '13/11 -> 16/11 = 1 dia útil');
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-17'), 2, '13/11 -> 17/11 = 2 dias úteis');
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-19'), 4, '13/11 -> 19/11 = 4 dias úteis');
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-20'), 4, 'Feriado 20/11 (Consciência Negra) não incrementa');
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-21'), 4, 'Sábado 21/11 não incrementa');
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-22'), 4, 'Domingo 22/11 não incrementa');
  assert.equal(calculateB3TradingDuration('2026-11-13', '2026-11-23'), 5, '13/11 -> 23/11 = 5 dias úteis (excluindo 20/11 e fins de semana)');
  assert.equal(calculateB3TradingDuration('2026-02-13', '2026-02-18'), 1, 'Pula fim de semana + Segunda e Terça de Carnaval -> Quarta de Cinzas = 1 dia útil');
  assert.equal(calculateB3TradingDuration(null, '2026-11-23'), null);

  assert.equal(formatTradingDurationLabel(0), '0 dias úteis');
  assert.equal(formatTradingDurationLabel(1), '1 dia útil');
  assert.equal(formatTradingDurationLabel(5), '5 dias úteis');
  assert.equal(formatTradingDurationLabel(null), '—');
});

test('DailyUpdateModel: Preço de Entrada editável enquanto aberto, sem alterar saldo da corretora e bloqueado quando encerrado', () => {
  const model = new DailyUpdateModel();
  const aapl = model.positions.find(p => p.id === 'pos_aapl34');
  const xpBefore = model.accounts.find(a => a.id === 'xp_daniel').newBalance;

  // Antes: entrada 100,86, atual 103,21, qty 600 -> +1.410,00
  assert.equal(model.getPositionUnrealizedResult(aapl), 1410.00);

  // Ajusta preço de entrada para 100,00 (formato BR) -> novo resultado = (103,21 - 100,00) * 600 = +1.926,00
  const res = model.updatePositionEntryPrice('pos_aapl34', '100,00');
  assert.equal(res.success, true);
  assert.equal(aapl.entryPrice, 100.00);
  assert.equal(model.getPositionUnrealizedResult(aapl), 1926.00);
  assert.equal(model.accounts.find(a => a.id === 'xp_daniel').newBalance, xpBefore, 'Corrigir preço de entrada não deve alterar saldo da corretora');

  // Rejeita preço inválido ou <= 0
  const bad = model.updatePositionEntryPrice('pos_aapl34', '0');
  assert.equal(bad.success, false);
  assert.equal(aapl.entryPrice, 100.00, 'Preço anterior válido deve ser preservado');

  // Encerra a operação -> edição de preço de entrada deve ser bloqueada
  model.executePositionClose('pos_aapl34', { exitPrice: 103.21, exitQuantity: 600, exitDate: '2026-11-23' });
  const closedEdit = model.updatePositionEntryPrice('pos_aapl34', '98,00');
  assert.equal(closedEdit.success, false, 'Trade já encerrado não pode ter preço de entrada editado');
});

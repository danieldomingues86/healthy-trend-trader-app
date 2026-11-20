const test = require('node:test');
const assert = require('node:assert/strict');
const DailyUpdateModel = require('./daily-update-model.js');

test('DailyUpdateModel: inicializa com contas e posições padrão homologadas', () => {
  const model = new DailyUpdateModel();

  assert.equal(model.accounts.length, 6);
  assert.equal(model.positions.length, 12);
  assert.equal(model.strategyEquity, 1112309.50);

  // Verifica as contas obrigatórias
  const accountLabels = model.accounts.map(a => a.label);
  assert.ok(accountLabels.includes('XP — Daniel'));
  assert.ok(accountLabels.includes('Nomad — Daniel'));
  assert.ok(accountLabels.includes('Genial — Daniel'));
  assert.ok(accountLabels.includes('Clear — Daniel'));
  assert.ok(accountLabels.includes('XP — Natália'));
  assert.ok(accountLabels.includes('Genial — Natália'));
});

test('DailyUpdateModel: cálculo correto do Patrimônio Real Consolidado e Variação', () => {
  const model = new DailyUpdateModel();

  const realWealth = model.getConsolidatedRealWealth();
  const prevWealth = model.getPreviousConsolidatedRealWealth();
  const nominalVar = model.getDayNominalVariation();
  const pctVar = model.getDayPercentVariation();

  // 207521 + 105500 + 257418 + 3069 + 220328 + 310583.93 = 1104419.93
  assert.equal(Math.round(realWealth * 100) / 100, 1104419.93);
  // 207521 + 105374 + 257418 + 3069 + 220328 + 310709.93 = 1101435.43
  assert.equal(Math.round(prevWealth * 100) / 100, 1101435.43);
  // Variação nominal = +R$ 2.984,50
  assert.equal(Math.round(nominalVar * 100) / 100, 2984.50);
  // Variação % = +0,27%
  assert.equal(Math.round(pctVar * 100) / 100, 0.27);
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

  const progress = model.getProgress();
  assert.equal(progress.totalAccounts, 6);
  assert.equal(progress.totalPositions, 12);
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
  assert.equal(kept.newBalance, 3069.00);

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

  // Nomad padrão com USD 18.411,87 e cotação 5,73
  const fxDetails = model.getForeignCurrencyDetails('nomad_daniel');
  assert.ok(fxDetails !== null);
  assert.equal(fxDetails.currency, 'USD');
  assert.equal(fxDetails.balanceUSD, 18411.87);
  assert.equal(fxDetails.previousBalanceUSD, 18389.70);
  assert.equal(fxDetails.fxRate, 5.73);
  assert.equal(fxDetails.convertedBRL, 105500.00);

  // Variação em USD é estritamente calculada sobre a moeda original
  const usdVar = model.getAccountUsdVariationPct(model.accounts.find(a => a.id === 'nomad_daniel'));
  // (18411.87 - 18389.70) / 18389.70 = +0.12%
  assert.equal(Math.round(usdVar * 100) / 100, 0.12);

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
  const pos = model.positions.find(p => p.id === 'pos_1'); // JNJB34

  const initialEntry = pos.entryPrice;
  const initialStop = pos.stopPrice;
  const initialTrailing = pos.trailingStop;
  const initialQty = pos.quantity;

  // Atualiza preço atual de JNJB34 para R$ 108,00
  const res = model.updatePositionPrice('pos_1', '108,00');
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
  const invalidRes = model.updatePositionPrice('pos_1', '-10,00');
  assert.equal(invalidRes.success, false);
  assert.ok(pos.error !== null);
  assert.equal(model.getProgress().invalidPositions, 1);
  assert.equal(model.getProgress().readyToClose, false);
});

test('DailyUpdateModel Card [03]: ações rápidas de conferência e posições pendentes', () => {
  const model = new DailyUpdateModel();

  // Marca uma posição como pendente
  const pos2 = model.setPositionPending('pos_2');
  assert.equal(pos2.status, 'pendente');
  assert.equal(pos2.checked, false);

  let progress = model.getProgress();
  assert.equal(progress.pendingPositions, 1);
  assert.equal(progress.positionsComplete, false);
  assert.equal(progress.readyToClose, false);

  // Confere individualmente
  model.confirmPosition('pos_2');
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
  const pos = model.positions.find(p => p.id === 'pos_6'); // PETR4, 400 un.

  // Usuário relata que na corretora aparecem 300 unidades
  model.reportPositionDivergence('pos_6', {
    field: 'quantity',
    reported: 300,
    note: 'Extrato da XP exibe 300 un. em custódia.'
  });

  assert.equal(pos.hasDivergence, true);
  assert.equal(pos.status, 'divergente');
  assert.equal(pos.divergence.reported, 300);

  // INVARIANTE: A quantidade registrada no sistema NÃO pode ser alterada automaticamente
  assert.equal(pos.quantity, 400, 'Quantidade registrada no sistema deve ser rigorosamente preservada');

  // Divergência bloqueia o fechamento diário
  let progress = model.getProgress();
  assert.equal(progress.divergences, 1);
  assert.equal(progress.readyToClose, false);

  // Resolução da divergência após revisão
  model.resolvePositionDivergence('pos_6');
  assert.equal(pos.hasDivergence, false);
  assert.equal(pos.divergence, null);
  assert.equal(pos.status, 'conferida');

  progress = model.getProgress();
  assert.equal(progress.divergences, 0);
  assert.equal(progress.readyToClose, true);
});

test('DailyUpdateModel Card [03]: operações com realização parcial (Peel Off)', () => {
  const model = new DailyUpdateModel();

  // Simula posição com realização parcial (ex: 200 restantes de 300 originais, 1 parcial)
  const pos = model.positions.find(p => p.id === 'pos_1');
  pos.initialQuantity = 300;
  pos.quantity = 200;
  pos.isPartial = true;
  pos.partialCount = 1;

  // Atualiza preço
  model.updatePositionPrice('pos_1', 110.00);

  // Quantidade e contagem de parciais são mantidas
  assert.equal(pos.quantity, 200);
  assert.equal(pos.initialQuantity, 300);
  assert.equal(pos.isPartial, true);
  assert.equal(pos.partialCount, 1);

  // O resultado em aberto é calculado estritamente sobre a quantidade restante (200 un.)
  const unrealized = model.getPositionUnrealizedResult(pos);
  // (110 - 98.40) * 200 = 11.60 * 200 = 2320.00
  assert.equal(Math.round(unrealized * 100) / 100, 2320.00);
});

test('DailyUpdateModel Card [04]: criação e persistência de Snapshot completo do fechamento', () => {
  const model = new DailyUpdateModel();
  const snapshot = model.createSnapshot({ date: '2026-11-20' });

  assert.equal(snapshot.date, '2026-11-20');
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.status, 'closed');
  assert.equal(snapshot.hasException, false);
  assert.equal(snapshot.realWealth, 1104419.93);
  assert.equal(snapshot.dayVariationAmount, 2984.50);
  assert.equal(snapshot.dayVariationPct, 0.27);
  assert.equal(snapshot.strategyEquity, 1112309.50);
  assert.equal(snapshot.accounts.length, 6);
  assert.equal(snapshot.positions.length, 12);
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
  assert.equal(retrieved.realWealth, 1104419.93);
});

test('DailyUpdateModel Card [04]: conclusão com ressalvas / exceções permitidas', () => {
  const model = new DailyUpdateModel();

  // Marca uma conta como pendente e uma posição com divergência
  model.setAccountPending('xp_daniel');
  model.reportPositionDivergence('pos_1', {
    field: 'quantity',
    reported: 250,
    note: 'Corretora exibe 250 un. vs 300 un. registradas'
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
  assert.ok(closedWithEx.exceptions.some(e => e.type === 'divergence' && e.id === 'pos_1'));
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
  assert.equal(snapV2.corrections[0].realWealth, 1104419.93);
  assert.equal(snapV2.realWealth, 1106898.93);
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

  // Real wealth: 1101435.43 - 1098650.00 = +2785.43
  assert.equal(Math.round(diff.diffAmount * 100) / 100, 2785.43);
  assert.ok(diff.diffPct > 0);
  assert.equal(diff.accountsDiff.length, 6);
});

test('DailyUpdateModel Card [04]: Checklist de Reconciliação com a Planilha Trading Log Premium', () => {
  const model = new DailyUpdateModel();
  const recon = model.getSpreadsheetReconciliationData();

  assert.equal(recon.isFullyReconciled, true);
  assert.equal(recon.items.length, 5);

  const keys = recon.items.map(i => i.key);
  assert.ok(keys.includes('accounts_balance'));
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
  assert.equal(snapshot.accounts.length, 6);

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

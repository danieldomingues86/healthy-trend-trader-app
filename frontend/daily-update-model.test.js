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

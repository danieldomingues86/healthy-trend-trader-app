const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const MissionModel = require('../../frontend/mission-model.js');
const RebuildModeModel = require('../../frontend/rebuild-mode-model.js');

test('MissionModel: createMission normaliza campos, meta e risco com status NOT_STARTED inicial', () => {
  const mission = MissionModel.createMission({
    title: 'Operar pequeno e constante',
    reason: 'Superar o medo de arriscar muito',
    targetTrades: 20,
    riskPct: 0.10, // 0.10% em formato percentual
    reward: 'Jantar com a família'
  });

  assert.equal(mission.title, 'Operar pequeno e constante');
  assert.equal(mission.reason, 'Superar o medo de arriscar muito');
  assert.equal(mission.targetTrades, 20);
  assert.equal(mission.riskPct, 0.001); // Convertido para decimal 0,10%
  assert.equal(mission.reward, 'Jantar com a família');
  assert.equal(mission.status, 'NOT_STARTED');
  assert.equal(mission.startDate, null);
  assert.deepEqual(mission.trades, []);
});

test('MissionModel: startMission inicializa em zero e protege missão ativa contra reinicialização', () => {
  const draft = MissionModel.createMission({ targetTrades: 20 });
  assert.equal(draft.status, 'NOT_STARTED');

  // Inicia pela primeira vez: deve inicializar em zero e gravar data de início
  const started = MissionModel.startMission(draft, { targetTrades: 20, riskPct: 0.001, reward: 'Jantar' });
  assert.equal(started.isNew, true);
  assert.equal(started.mission.status, 'ACTIVE');
  assert.ok(started.mission.startDate !== null);
  assert.equal(started.mission.trades.length, 0);

  // Registra 3 trades na missão ativa
  let active = started.mission;
  active = MissionModel.addMissionTrade(active, { ticker: 'PETR4' }).mission;
  active = MissionModel.addMissionTrade(active, { ticker: 'VALE3' }).mission;
  active = MissionModel.addMissionTrade(active, { ticker: 'ITUB4' }).mission;
  assert.equal(active.trades.length, 3);
  const activeStartDate = active.startDate;

  // Clica novamente em Iniciar Missão (salvar configuração): NÃO deve zerar progresso
  const saved = MissionModel.startMission(active, { targetTrades: 25, reward: 'Novo Jantar' });
  assert.equal(saved.isNew, false);
  assert.equal(saved.mission.status, 'ACTIVE');
  assert.equal(saved.mission.startDate, activeStartDate);
  assert.equal(saved.mission.trades.length, 3, 'Progresso de 3 trades deve ser estritamente preservado');
  assert.equal(saved.mission.targetTrades, 25);
  assert.equal(saved.mission.reward, 'Novo Jantar');
});

test('MissionModel: resetMission zera trades e reinicia jornada do zero preservando configs', () => {
  let mission = MissionModel.startMission(null, {
    title: 'Missão de Teste',
    reason: 'Motivo Válido',
    targetTrades: 20,
    riskPct: 0.001,
    reward: 'Recompensa 1'
  }).mission;

  // Adiciona 5 trades
  for (let i = 1; i <= 5; i++) {
    mission = MissionModel.addMissionTrade(mission, { ticker: `ATIVO${i}` }).mission;
  }
  assert.equal(mission.trades.length, 5);
  const oldStartDate = mission.startDate;

  // Reinicia do zero
  const reset = MissionModel.resetMission(mission, {
    reward: 'Nova Recompensa'
  });

  assert.equal(reset.status, 'ACTIVE');
  assert.equal(reset.trades.length, 0, 'Trades devem ser estritamente zerados');
  assert.equal(reset.title, 'Missão de Teste');
  assert.equal(reset.reason, 'Motivo Válido');
  assert.equal(reset.targetTrades, 20);
  assert.equal(reset.riskPct, 0.001);
  assert.equal(reset.reward, 'Nova Recompensa');
  assert.ok(reset.startDate, 'Nova data de início deve existir');
  assert.equal(reset.completedDate, null);

  // Progresso do reset deve ser exatamente 0%
  const prog = MissionModel.calculateMissionProgress(reset);
  assert.equal(prog.completedTrades, 0);
  assert.equal(prog.progressPct, 0);
  assert.equal(prog.completedStations, 0);
  assert.equal(prog.currentStationNumber, 1);
  assert.equal(prog.waypoints[0].status, 'ACTIVE');
  assert.equal(prog.waypoints.slice(1).every(w => w.status === 'LOCKED'), true);
});

test('MissionModel: calculateMissionProgress calcula percentual, trades restantes e risco financeiro', () => {
  const mission = MissionModel.createMission({
    targetTrades: 20,
    riskPct: 0.001,
    trades: [
      { id: 't1', tradeNumber: 1, ticker: 'PETR4', status: 'CLOSED' },
      { id: 't2', tradeNumber: 2, ticker: 'VALE3', status: 'CLOSED' },
      { id: 't3', tradeNumber: 3, ticker: 'ITUB4', status: 'CLOSED' },
      { id: 't4', tradeNumber: 4, ticker: 'BBDC4', status: 'CLOSED' },
      { id: 't5', tradeNumber: 5, ticker: 'ABEV3', status: 'CLOSED' },
      { id: 't6', tradeNumber: 6, ticker: 'RENT3', status: 'CLOSED' },
      { id: 't7', tradeNumber: 7, ticker: 'PRIO3', status: 'CLOSED' }
    ]
  });

  const progress = MissionModel.calculateMissionProgress(mission, { equity: 200000 });

  assert.equal(progress.completedTrades, 7);
  assert.equal(progress.targetTrades, 20);
  assert.equal(progress.progressPct, 35); // 7/20 = 35%
  assert.equal(progress.remainingTrades, 13);
  assert.equal(progress.isCompleted, false);
  assert.equal(progress.riskPctFormatted, '0,10%');
  assert.equal(progress.estimatedRiskValue, 200); // 200.000 * 0,10% = R$ 200,00
  assert.ok(progress.estimatedRiskValueFormatted.includes('200'));
  assert.equal(progress.hasOpenTrade, false);
});

test('MissionModel: regra de 1 trade por vez impede abrir novo trade se houver um em andamento', () => {
  let mission = MissionModel.createMission({ targetTrades: 10 });

  // Adiciona primeiro trade em aberto
  const res1 = MissionModel.addMissionTrade(mission, { ticker: 'PETR4', status: 'OPEN' });
  mission = res1.mission;
  assert.equal(mission.trades.length, 1);
  assert.equal(mission.trades[0].status, 'OPEN');

  // Tentativa de adicionar outro trade enquanto o anterior está OPEN deve falhar
  assert.throws(() => {
    MissionModel.addMissionTrade(mission, { ticker: 'VALE3', status: 'OPEN' });
  }, /Já existe um trade em andamento/);

  // Encerra o trade aberto
  mission = MissionModel.closeOpenMissionTrade(mission, mission.trades[0].id, { result: 'COMPLIANT' });
  assert.equal(mission.trades[0].status, 'CLOSED');

  // Agora pode adicionar o próximo trade normalmente
  const res2 = MissionModel.addMissionTrade(mission, { ticker: 'VALE3', status: 'CLOSED' });
  assert.equal(res2.mission.trades.length, 2);
});

test('MissionModel: conclusão da meta marca status COMPLETED e não aumenta risco automaticamente', () => {
  let mission = MissionModel.createMission({ targetTrades: 3, riskPct: 0.001 });

  mission = MissionModel.addMissionTrade(mission, { ticker: 'PETR4' }).mission;
  mission = MissionModel.addMissionTrade(mission, { ticker: 'VALE3' }).mission;
  const resFinal = MissionModel.addMissionTrade(mission, { ticker: 'ITUB4' });

  assert.equal(resFinal.justCompleted, true);
  assert.equal(resFinal.mission.status, 'COMPLETED');
  assert.ok(resFinal.mission.completedDate !== null);
  // O risco permanece estritamente 0,10% (sem aumento automático)
  assert.equal(resFinal.mission.riskPct, 0.001);
});

test('MissionModel: remoção de trade re-indexa posições e reverte status se abaixo da meta', () => {
  let mission = MissionModel.createMission({ targetTrades: 2 });
  mission = MissionModel.addMissionTrade(mission, { ticker: 'PETR4', id: 'p1' }).mission;
  mission = MissionModel.addMissionTrade(mission, { ticker: 'VALE3', id: 'p2' }).mission;
  assert.equal(mission.status, 'COMPLETED');

  // Remove um trade
  mission = MissionModel.removeMissionTrade(mission, 'p2');
  assert.equal(mission.trades.length, 1);
  assert.equal(mission.status, 'ACTIVE');
  assert.equal(mission.completedDate, null);
});

test('MissionModel: integração com Rebuild Mode limita teto de risco', () => {
  const mission = MissionModel.createMission({ riskPct: 0.0025 }); // Tentativa de 0,25%
  const rebuildState = { isActive: true, maxRiskPct: 0.0010 }; // Rebuild Mode força 0,10%

  const updated = MissionModel.updateMissionConfig(mission, { riskPct: 0.0025 }, rebuildState);
  assert.equal(updated.riskPct, 0.0010, 'Risco deve ser limitado pelo Rebuild Mode ativo');
});

test('MissionModel: generateWaypoints retorna 7 estações no percurso com caminhante no nó ativo', () => {
  // Cenário: 7 trades feitos de 20
  const waypoints = MissionModel.generateWaypoints(20, 7);
  assert.equal(waypoints.length, 7);

  // Deve haver estações COMPLETED, 1 ACTIVE e LOCKED
  const completed = waypoints.filter(w => w.status === 'COMPLETED');
  const active = waypoints.filter(w => w.status === 'ACTIVE');
  const locked = waypoints.filter(w => w.status === 'LOCKED');

  assert.ok(completed.length >= 1, 'Deve ter estações concluídas');
  assert.equal(active.length, 1, 'Deve ter exatamente 1 estação ativa (onde o soldado está)');
  assert.ok(locked.length >= 1, 'Deve ter estações bloqueadas à frente');
  assert.equal(waypoints[6].isSummit, true, 'Estação 7 deve ser o cume');
});

test('RebuildModeModel: ativação, teto de risco seguro e desativação', () => {
  const defaultState = RebuildModeModel.DEFAULT_STATE;
  assert.equal(defaultState.isActive, false);
  assert.equal(defaultState.maxPositions, 1);

  const activated = RebuildModeModel.activateRebuild({ maxRiskPct: 0.0015 });
  assert.equal(activated.isActive, true);
  assert.equal(activated.maxRiskPct, 0.0015);
  assert.equal(activated.maxPositions, 1);

  const clamped = RebuildModeModel.clampRiskToRebuild(0.0050);
  assert.equal(clamped, 0.0015);

  const deactivated = RebuildModeModel.deactivateRebuild();
  assert.equal(deactivated.isActive, false);
});

test('MissionModel: updateMissionConfig atualiza título e motivo preservando trades existentes e status', () => {
  let mission = MissionModel.createMission({
    title: 'Missão Original',
    reason: 'Motivo Antigo',
    targetTrades: 20,
    riskPct: 0.001
  });

  // Registra 5 trades
  for (let i = 1; i <= 5; i++) {
    mission = MissionModel.addMissionTrade(mission, { ticker: `ATIVO${i}` }).mission;
  }
  assert.equal(mission.trades.length, 5);
  const originalStartDate = mission.startDate;

  // Atualiza título e motivo via updateMissionConfig
  const updated = MissionModel.updateMissionConfig(mission, {
    title: 'Novo Título Focado',
    reason: 'Novo Motivo Claro e Inspirador'
  });

  assert.equal(updated.title, 'Novo Título Focado');
  assert.equal(updated.reason, 'Novo Motivo Claro e Inspirador');
  assert.equal(updated.trades.length, 5, 'Trades existentes devem ser preservados');
  assert.equal(updated.startDate, originalStartDate, 'Data de início deve ser preservada');
  assert.equal(updated.status, 'ACTIVE');
});

test('MissionModel: updateMissionConfig em missão ativa preserva progresso e data de início ao ajustar meta ou recompensa', () => {
  let mission = MissionModel.createMission({
    targetTrades: 20,
    riskPct: 0.001,
    reward: 'Jantar'
  });

  for (let i = 1; i <= 8; i++) {
    mission = MissionModel.addMissionTrade(mission, { ticker: `ATIVO${i}` }).mission;
  }
  const originalStartDate = mission.startDate;

  // Atualiza configurações: meta de 25 trades e nova recompensa
  const updated = MissionModel.updateMissionConfig(mission, {
    targetTrades: 25,
    riskPct: 0.0015,
    reward: 'Viagem de final de semana'
  });

  assert.equal(updated.targetTrades, 25);
  assert.equal(updated.riskPct, 0.0015);
  assert.equal(updated.reward, 'Viagem de final de semana');
  assert.equal(updated.trades.length, 8, 'Progresso de 8 trades deve ser mantido');
  assert.equal(updated.startDate, originalStartDate);
  assert.equal(updated.status, 'ACTIVE');

  const progress = MissionModel.calculateMissionProgress(updated);
  assert.equal(progress.completedTrades, 8);
  assert.equal(progress.targetTrades, 25);
  assert.equal(progress.progressPct, 32); // 8/25 = 32%
});

test('MissionModel: waypoints progridem monotonicamente e fornecem fonte única de verdade', () => {
  // Teste 1: 0 trades concluídos de 20
  const wpStart = MissionModel.generateWaypoints(20, 0);
  assert.equal(wpStart.length, 7);
  assert.equal(wpStart[0].status, 'ACTIVE');
  assert.equal(wpStart[0].stationTrades, 2);
  assert.equal(wpStart[0].rangeLabel, '1 – 2 trades');
  assert.ok(wpStart[0].statusDescription.toLowerCase().includes('0 de 2 trades'));
  assert.ok(wpStart[0].statusDescription.toLowerCase().includes('faltam 2 trades'));
  assert.equal(wpStart.slice(1).every(w => w.status === 'LOCKED'), true);

  // Teste 2: 6 trades concluídos de 20 (cenário exato da referência visual media_1791835995914.jpg)
  // Marco 1: 1 a 2 trades (meta 2) -> concluída
  // Marco 2: 3 a 5 trades (meta 5) -> concluída
  // Marco 3: 6 a 8 trades (meta 8) -> ativa (6 concluídos, faltam 2)
  // Marcos 4 a 7 -> bloqueados
  const wpMid = MissionModel.generateWaypoints(20, 6);
  assert.equal(wpMid[0].status, 'COMPLETED');
  assert.equal(wpMid[0].rangeLabel, '1 – 2 trades');
  assert.equal(wpMid[1].status, 'COMPLETED');
  assert.equal(wpMid[1].rangeLabel, '3 – 5 trades');
  assert.equal(wpMid[2].status, 'ACTIVE');
  assert.equal(wpMid[2].stationTrades, 8);
  assert.equal(wpMid[2].rangeLabel, '6 – 8 trades');
  assert.ok(wpMid[2].statusDescription.toLowerCase().includes('faltam 2 trades'));
  assert.equal(wpMid[3].status, 'LOCKED');
  assert.equal(wpMid[6].status, 'LOCKED');

  // Metas devem ser estritamente monotônicas não decrescentes
  for (let i = 1; i < wpMid.length; i++) {
    assert.ok(wpMid[i].stationTrades >= wpMid[i - 1].stationTrades, `Estação ${i+1} deve ter meta >= estação ${i}`);
  }
  assert.equal(wpMid[6].stationTrades, 20, 'Última estação deve ter como meta o total de trades (20)');

  // Teste 3: Missão completa (20 de 20)
  const wpEnd = MissionModel.generateWaypoints(20, 20);
  assert.equal(wpEnd.every(w => w.status === 'COMPLETED'), true);

  // Teste 4: Meta recalculada dinamicamente (14 trades -> exatamente 2 trades por marco)
  const wp14 = MissionModel.generateWaypoints(14, 4);
  assert.equal(wp14.length, 7);
  assert.equal(wp14[0].rangeLabel, '1 – 2 trades');
  assert.equal(wp14[1].rangeLabel, '3 – 4 trades');
  assert.equal(wp14[6].stationTrades, 14);
  assert.equal(wp14[6].rangeLabel, '13 – 14 trades');
  assert.equal(wp14[1].status, 'COMPLETED'); // 4 trades conclui o Marco 2 (1-4)
  assert.equal(wp14[2].status, 'ACTIVE'); // Marco 3 (5-6) ativo

  // Teste 5: Meta de 10 trades
  const wp10 = MissionModel.generateWaypoints(10, 4);
  assert.equal(wp10.length, 7);
  assert.equal(wp10[6].stationTrades, 10);
  const activeWp10 = wp10.find(w => w.status === 'ACTIVE');
  assert.ok(activeWp10, 'Deve ter uma estação ativa');
});

test('MissionModel: calculateMissionProgress sincroniza perfeitamente com os waypoints', () => {
  const mission = MissionModel.createMission({
    targetTrades: 20,
    trades: Array.from({ length: 6 }, (_, i) => ({
      id: `t_${i}`,
      tradeNumber: i + 1,
      ticker: `ATIVO${i}`,
      status: 'CLOSED'
    }))
  });

  const progress = MissionModel.calculateMissionProgress(mission);

  assert.equal(progress.totalStations, 7);
  assert.equal(progress.completedStations, 2); // Marcos 1 (meta 2) e 2 (meta 5) concluídos
  assert.equal(progress.currentStationNumber, 3); // Marco 3 (meta 8) é o estágio atual
  assert.equal(progress.currentStationTrades, 8);
  assert.equal(progress.progressPct, 30); // 6 / 20 = 30% (conforme Card 2 da referência)
  assert.equal(progress.waypoints.length, 7);
  assert.equal(progress.waypoints[2].status, 'ACTIVE');
});

test('Navegação e Estrutura: submenu Treinamento & Recuperação e sections registradas', () => {
  const navCode = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  // Submenu unificado em sidebar-navigation.js
  assert.ok(navCode.includes("id: 'training-recovery'"), 'Deve existir grupo training-recovery');
  assert.ok(navCode.includes("label: 'Treinamento & Recuperação'"), 'Label do grupo deve ser Treinamento & Recuperação');
  assert.ok(navCode.includes("page: 'tradertraining'"), 'Deve conter tradertraining');
  assert.ok(navCode.includes("page: 'mission'"), 'Deve conter mission');
  assert.ok(navCode.includes("page: 'rebuild'"), 'Deve conter rebuild');

  // Sections em index.html
  assert.ok(html.includes('id="mission"'), 'index.html deve conter section #mission');
  assert.ok(html.includes('id="rebuild"'), 'index.html deve conter section #rebuild');
  assert.ok(html.includes('titles.mission='), 'titles.mission deve estar registrado');
  assert.ok(html.includes('titles.rebuild='), 'titles.rebuild deve estar registrado');

  // Scripts e styles em index.html
  assert.ok(html.includes('frontend/mission.css'), 'index.html deve incluir mission.css');
  assert.ok(html.includes('frontend/mission-model.js'), 'index.html deve incluir mission-model.js');
  assert.ok(html.includes('frontend/mission.js'), 'index.html deve incluir mission.js');
  assert.ok(html.includes('frontend/rebuild-mode-model.js'), 'index.html deve incluir rebuild-mode-model.js');
  assert.ok(html.includes('frontend/rebuild-mode.js'), 'index.html deve incluir rebuild-mode.js');
});

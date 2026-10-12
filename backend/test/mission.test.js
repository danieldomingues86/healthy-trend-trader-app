const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const MissionModel = require('../../frontend/mission-model.js');
const RebuildModeModel = require('../../frontend/rebuild-mode-model.js');

test('MissionModel: createMission normaliza campos, meta e risco', () => {
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
  assert.equal(mission.status, 'ACTIVE');
  assert.deepEqual(mission.trades, []);
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

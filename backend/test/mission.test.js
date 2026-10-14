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
  assert.ok(navCode.includes("label: 'Treinamento'"), 'Label do grupo deve ser Treinamento');
  assert.ok(navCode.includes("page: 'mission'"), 'Deve conter mission');
  assert.ok(!navCode.includes("page: 'rebuild'"), 'Submenu Rebuild Mode deve estar removido pois foi integrado na Missão');

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

test('MissionModel: stopMission interrompe missão ativa, registra data e preserva trades e configs', () => {
  let mission = MissionModel.startMission(null, {
    title: 'Missão de Disciplina',
    reason: 'Eliminar ansiedade',
    targetTrades: 20,
    riskPct: 0.001
  }).mission;

  mission = MissionModel.addMissionTrade(mission, { ticker: 'PETR4' }).mission;
  mission = MissionModel.addMissionTrade(mission, { ticker: 'VALE3' }).mission;
  assert.equal(mission.status, 'ACTIVE');
  assert.equal(mission.trades.length, 2);

  const stopped = MissionModel.stopMission(mission, 'Pausa estratégica solicitada pelo usuário');
  assert.equal(stopped.status, 'STOPPED');
  assert.ok(stopped.stoppedDate);
  assert.equal(stopped.stopReason, 'Pausa estratégica solicitada pelo usuário');
  assert.equal(stopped.trades.length, 2, 'Trades devem ser preservados');
  assert.equal(stopped.title, 'Missão de Disciplina');
  assert.equal(stopped.riskPct, 0.001);

  const prog = MissionModel.calculateMissionProgress(stopped);
  assert.equal(prog.canAddTrade, false, 'Missão parada não pode receber novos trades diretamente');
  assert.equal(prog.status, 'STOPPED');

  assert.equal(MissionModel.isMissionActive(stopped), false, 'isMissionActive deve retornar false para STOPPED');
  assert.equal(MissionModel.getActiveMission(stopped), null, 'getActiveMission deve retornar null para STOPPED');
});

test('MissionModel: validateTradeAgainstMission valida risco com tolerância estrita de ±0.02pp', () => {
  const activeMission = MissionModel.createMission({
    status: 'ACTIVE',
    riskPct: 0.001 // 0,10%
  });

  // Trade com risco de 0,10% (exato) -> Permitido
  const resExact = MissionModel.validateTradeAgainstMission(activeMission, { actualRiskPct: 0.10 });
  assert.equal(resExact.allowed, true);

  // Trade com risco de 0,11% (dentro da tolerância de ±0.02pp) -> Permitido
  const resWithinTolerance = MissionModel.validateTradeAgainstMission(activeMission, { actualRiskPct: 0.115 });
  assert.equal(resWithinTolerance.allowed, true);

  // Trade com risco de 0,1201% (no limite exato) -> Permitido
  const resAtBoundary = MissionModel.validateTradeAgainstMission(activeMission, { actualRiskPct: 0.120 });
  assert.equal(resAtBoundary.allowed, true);

  // Trade com risco de 0,13% (acima da tolerância de +0.02pp) -> Bloqueado
  const resOver = MissionModel.validateTradeAgainstMission(activeMission, { actualRiskPct: 0.13 });
  assert.equal(resOver.allowed, false);
  assert.ok(resOver.message.includes('Operação bloqueada'));
  assert.ok(resOver.message.includes('0,10%'));

  // Trade com risco de 0,25% -> Bloqueado
  const resHigh = MissionModel.validateTradeAgainstMission(activeMission, { actualRiskPct: 0.25 });
  assert.equal(resHigh.allowed, false);

  // Missão inativa não deve bloquear
  const inactiveMission = MissionModel.createMission({ status: 'STOPPED', riskPct: 0.001 });
  const resInactive = MissionModel.validateTradeAgainstMission(inactiveMission, { actualRiskPct: 0.50 });
  assert.equal(resInactive.allowed, true);
});

test('Desafio Grade A descontinuado: removido da sidebar e redirecionado para Missão', () => {
  const navCode = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  // couragechallenge NÃO deve mais estar na sidebar de dados e performance
  assert.equal(navCode.includes("id: 'couragechallenge'"), false, 'couragechallenge deve ser removido de sidebar-navigation.js');

  // go() redireciona couragechallenge para mission
  assert.ok(html.includes("if(id==='couragechallenge')id='mission';"), 'Navegação legada para couragechallenge deve redirecionar para mission');

  // Botão estático no index.html não deve mais existir
  assert.equal(html.includes('<button data-page="couragechallenge">'), false, 'Botão data-page couragechallenge não deve existir no index.html');
});

test('Novo Trade: Resumo da Operação unificado substitui cards redundantes por painel compacto', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'frontend', 'trade-workbench-v2.css'), 'utf8');

  // 1. Função unificada implementada
  assert.ok(html.includes('function syncMissionWorkbenchExperience('), 'Deve conter syncMissionWorkbenchExperience');
  assert.ok(html.includes('window.syncMissionWorkbenchExperience = syncMissionWorkbenchExperience'), 'syncMissionWorkbenchExperience deve ser exportada');
  assert.ok(html.includes('Resumo da Operação'), 'Deve conter título Resumo da Operação');

  // 2. Elementos essenciais do painel único Resumo da Operação
  // A. Indicador de modo operacional discreto no cabeçalho
  assert.ok(html.includes('id="opModeBadge"'), 'Deve conter badge de modo id="opModeBadge"');
  assert.ok(html.includes('🦅 Rebuild Ativo'), 'Deve suportar badge Rebuild Ativo');
  assert.ok(html.includes('Operação Normal'), 'Deve suportar badge Operação Normal');

  // B. Position Size Final — informação principal em destaque
  assert.ok(html.includes('class="op-hero-card"'), 'Deve conter card hero com o Position Size Final');
  assert.ok(html.includes('POSITION SIZE FINAL'), 'Deve exibir label POSITION SIZE FINAL');
  assert.ok(html.includes('Quantidade máxima calculada para'), 'Deve indicar o ativo na tag de quantidade');
  assert.ok(html.includes('id="opHeroLimiter"'), 'Deve conter elemento explicativo do limitador ativo');

  // C. Controle de quantidade e resumo financeiro compacto
  assert.ok(html.includes('Quantidade de ações'), 'Deve exibir label Quantidade de ações');
  assert.ok(html.includes('id="missionStepUpBtn"'), 'Deve conter botão de incremento missionStepUpBtn');
  assert.ok(html.includes('id="missionStepDownBtn"'), 'Deve conter botão de decremento missionStepDownBtn');
  assert.ok(html.includes('id="missionMaxAllowedCard"'), 'Deve conter link de restauração missionMaxAllowedCard');
  assert.ok(html.includes('Restaurar máximo'), 'Deve exibir texto Restaurar máximo');
  assert.ok(html.includes('RISCO FINANCEIRO'), 'Deve exibir indicador RISCO FINANCEIRO');
  assert.ok(html.includes('CAPITAL UTILIZADO'), 'Deve exibir indicador CAPITAL UTILIZADO');
  assert.ok(html.includes('id="missionRiskMoneyValue"'), 'Deve conter valor de risco financeiro em reais');
  assert.ok(html.includes('id="missionCapitalUsedValue"'), 'Deve conter valor de capital utilizado em reais');

  // D. Ação principal e aviso único de bloqueio objetivo
  assert.ok(html.includes('id="missionRegisterTradeBtn"'), 'Deve conter botão missionRegisterTradeBtn');
  assert.ok(html.includes('id="missionRiskViolationBox"'), 'Deve conter caixa de aviso de bloqueio missionRiskViolationBox');
  assert.ok(html.includes('Durante o Rebuild Mode, finalize a operação atual antes de iniciar outra'), 'Deve conter mensagem objetiva de bloqueio de posição');

  // E. Detalhes técnicos recolhidos em accordion fechado por padrão
  assert.ok(html.includes('Ver detalhes do cálculo'), 'Deve conter accordion Ver detalhes do cálculo');
  assert.ok(html.includes('class="op-calc-details"'), 'Deve conter elemento de detalhes técnicos op-calc-details');
  assert.ok(html.includes('Limitador que definiu o tamanho'), 'Deve conter linha de limitador nos detalhes técnicos');

  // 3. Remoção de redundâncias e cards concorrentes
  assert.ok(!html.includes('class="mission-workbench-card mission-active-card"'), 'Cards concorrentes legados devem ser removidos');
  assert.ok(!html.includes('class="mission-workbench-card mission-ceiling-card"'), 'Card legado de teto teórico deve ser removido');
  assert.ok(!html.includes('<input type="checkbox" id="courageConsciousCheckbox" checked>'), 'Checkbox redundante de confirmação deve ser removido');
  assert.ok(!html.includes('class="courage-discomfort-scale"'), 'Escala de desconforto redundante deve ser removida da área principal');

  // 4. CSS dedicado ao Resumo da Operação implementado
  assert.ok(css.includes('.op-summary-panel'), 'CSS deve conter .op-summary-panel');
  assert.ok(css.includes('.op-mode-badge'), 'CSS deve conter .op-mode-badge');
  assert.ok(css.includes('.op-hero-card'), 'CSS deve conter .op-hero-card');
  assert.ok(css.includes('.op-financial-grid'), 'CSS deve conter .op-financial-grid');
  assert.ok(css.includes('.op-block-notice'), 'CSS deve conter .op-block-notice');
  assert.ok(css.includes('.op-calc-details'), 'CSS deve conter .op-calc-details');
  assert.ok(css.includes('.mission-register-btn'), 'CSS deve conter .mission-register-btn');
  assert.ok(css.includes('.is-risk-blocked'), 'CSS deve conter .is-risk-blocked');
});

test('Novo Trade: comportamento dinâmico e integração com ciclo de vida da missão', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  // Reatividade a eventos
  assert.ok(html.includes("window.addEventListener('healthyTrend:missionStateChanged'"), 'Deve ouvir healthyTrend:missionStateChanged');
  assert.ok(html.includes("window.addEventListener('healthyTrend:missionUpdated'"), 'Deve ouvir healthyTrend:missionUpdated');

  // Navegação para newtrade atualiza workbench
  assert.ok(html.includes("if(id==='newtrade'&&typeof updateTradingRubric==='function'){updateTradingRubric();}"), 'go(newtrade) deve acionar updateTradingRubric()');

  // Gating de risco inclui botão da missão
  assert.ok(html.includes("sizer.querySelectorAll('.summary-box button, #missionRegisterTradeBtn')"), 'Gating de risco deve avaliar #missionRegisterTradeBtn');
});

test('UX/UI Missão Rebuild: Botão Editar abre modal, persiste alterações e Hero possui área de leitura independente', () => {
  const missionJs = fs.readFileSync(path.join(root, 'frontend', 'mission.js'), 'utf8');
  const missionCss = fs.readFileSync(path.join(root, 'frontend', 'mission.css'), 'utf8');

  // 1. Botão Editar conectado e impedindo propagação de eventos
  assert.ok(missionJs.includes('window.openEditMissionModal(event)'), 'Botão Editar deve chamar openEditMissionModal(event)');
  assert.ok(missionJs.includes('window.openEditMissionModal = function (event)'), 'openEditMissionModal deve aceitar event');
  assert.ok(missionJs.includes('event.stopPropagation()'), 'openEditMissionModal deve interromper propagação');
  assert.ok(missionJs.includes('window.handleSaveEditMissionModal(event)'), 'Salvar alterações deve chamar handleSaveEditMissionModal(event)');

  // 2. Campos editáveis presentes no modal de edição
  assert.ok(missionJs.includes('id="editMissionTitle"'), 'Modal de edição deve conter editMissionTitle');
  assert.ok(missionJs.includes('id="editMissionReason"'), 'Modal de edição deve conter editMissionReason');
  assert.ok(missionJs.includes('id="editMissionPlannedDate"'), 'Modal de edição deve conter editMissionPlannedDate para Rebuild');
  assert.ok(missionJs.includes('Salvar alterações'), 'Modal deve ter botão Salvar alterações');
  assert.ok(missionJs.includes('Cancelar'), 'Modal deve ter botão Cancelar');

  // 3. Atualização e persistência no salvamento
  assert.ok(missionJs.includes('M.updateMissionConfig(currentMission'), 'Salvamento deve atualizar configuração da missão');
  assert.ok(missionJs.includes('saveMissionData()'), 'Salvamento deve persistir dados');
  assert.ok(missionJs.includes('openEditMissionModal: window.openEditMissionModal'), 'MissionController deve expor openEditMissionModal');

  // 4. Hero com área de leitura independente e sem concorrência visual
  assert.ok(missionJs.includes('class="mission-hero-readability-overlay"'), 'HTML do Hero deve incluir overlay de legibilidade');
  assert.ok(missionJs.includes('class="mission-hero-briefing"'), 'HTML do Hero deve incluir coluna independente mission-hero-briefing');
  assert.ok(missionJs.includes('class="mission-recovery-principles"'), 'HTML do Hero deve incluir princípios de recuperação organizados');
  assert.ok(missionJs.includes('class="mission-principle-tag"'), 'HTML deve conter tags refinadas para os princípios');

  // 5. CSS do Hero e Card de Recuperação
  assert.ok(missionCss.includes('.mission-hero-readability-overlay'), 'CSS deve estilizar overlay escuro com gradiente');
  assert.ok(missionCss.includes('.mission-hero-briefing'), 'CSS deve definir coluna independente de leitura');
  assert.ok(missionCss.includes('.mission-recovery-principles'), 'CSS deve estilizar área dos princípios');
  assert.ok(missionCss.includes('.mission-center-card'), 'CSS deve definir card de configuração');
  assert.ok(missionCss.includes('.mission-form-help'), 'CSS deve conter estilos para dicas de formulário');

  // 6. Resolução de bloqueio de cliques e enquadramento harmonioso do Hero
  assert.ok(missionCss.includes('.mission-interactive-trail') && missionCss.includes('pointer-events: none;'), 'Trilha deve ter pointer-events: none para não bloquear cliques no botão Editar');
  assert.ok(missionCss.includes('.mission-edit-btn') && missionCss.includes('cursor: pointer !important;'), 'Botão Editar deve ter cursor pointer e pointer-events auto');
  assert.ok(missionCss.includes('center 20% / cover no-repeat'), 'Hero deve subir a imagem de fundo para enquadramento harmonioso');
  assert.ok(missionCss.includes('height: clamp(380px, 24vw, 420px);'), 'Hero deve ter altura compacta');

  // 7. Campo Risco por Trade estritamente com valores, sem textos redundantes cortados
  assert.ok(!missionJs.includes('0,05% (Proteção Máxima'), 'Opções de risco não devem ter texto explicativo longo');
  assert.ok(!missionJs.includes('0,10% (Proteção Moderada)'), 'Opções de risco não devem conter textos explicativos que cortem no layout');
  assert.ok(missionJs.includes('<option value="0.0005" selected>0,05%</option>'), 'Opção de 0,05% deve conter apenas o valor percentual');
  assert.ok(missionJs.includes('<option value="0.0010">0,10%</option>'), 'Opção de 0,10% deve conter apenas o valor percentual');

  // 8. Redesign Oficial — Tema Claro, 3 Cards e remoção de Histórico do Hero
  assert.ok(!missionJs.includes('mission-hero-history-btn'), 'Botão Histórico (4) deve ser estritamente removido do Hero');
  assert.ok(missionJs.includes('mission-card-quote-box'), 'Frase motivacional deve ser integrada no Card 2');
  assert.ok(!missionJs.includes('mission-card mission-quote-card'), 'Card 4 legado deve ser completamente eliminado da grid');
  assert.ok(missionCss.includes('31fr 32fr 37fr'), 'Grid inferior deve ter exatamente 3 colunas proporcionais (31% / 32% / 37%)');
  assert.ok(missionCss.includes('#F7F9FC'), 'CSS deve definir fundo geral claro #F7F9FC');
  assert.ok(missionCss.includes('#00A878'), 'CSS deve utilizar verde principal #00A878');
  assert.ok(missionCss.includes('#F08A00'), 'CSS deve utilizar laranja de ação #F08A00 para o botão Marcar Trade');
});


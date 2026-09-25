const test=require('node:test');
const assert=require('node:assert/strict');
const {DEFAULT_POLICY,calculateRubric,calculateGrade,calculatePositionSizing,calculatePolicyPositionSizing,calculateOngoingRisk,calculatePeelOff,validatePortfolio,normalizePolicy,normalizeHistoricalGrade,marketCycleKey}=require('./trading-rubrics');
test('leituras legadas nunca mostram A+ nem promovem A sem prova do Quality Gate',()=>{assert.equal(normalizeHistoricalGrade('A+'), 'B');assert.equal(normalizeHistoricalGrade('A'), 'B');assert.equal(normalizeHistoricalGrade('A',{gradingVersion:2}), 'A');assert.equal(normalizeHistoricalGrade('B'), 'B');assert.equal(normalizeHistoricalGrade('C'), 'C');assert.equal(normalizeHistoricalGrade('D'), 'D');assert.equal(normalizeHistoricalGrade(null), null)});
test('Rubric de Position Trend Following totaliza 100 pontos nos seis pilares',()=>{const policy=normalizePolicy();assert.deepEqual(policy.criteria.map(({key,weight})=>[key,weight]),[['trendQuality',25],['marketCycle',20],['relativeStrength',20],['volatility',15],['setupQuality',15],['fundamentalScore',5]]);assert.equal(policy.criteria.reduce((sum,item)=>sum+item.weight,0),100)});
test('Rubric segue a nomenclatura e ordem oficial dos seis critérios',()=>{const policy=normalizePolicy();assert.deepEqual(policy.criteria.map(({key,label,weight})=>[key,label,weight]),[['trendQuality','Contexto do Ativo (Diário)',25],['marketCycle','Contexto do Mercado',20],['relativeStrength','Força Relativa (RS)',20],['volatility','Volatilidade (ATR)',15],['setupQuality','Gatilho de Entrada',15],['fundamentalScore','Fundamentos',5]])});
test('migra política antiga para quatro grades preservando o risco configurado de A',()=>{const policy=normalizePolicy({criteria:[{key:'trendQuality',weight:19}],grades:[{grade:'A+',minScore:91,riskPct:.006},{grade:'A',minScore:80,riskPct:.0045}]});assert.equal(policy.criteria.find(item=>item.key==='trendQuality').weight,19);assert.deepEqual(policy.grades.map(item=>[item.grade,item.minScore]),[['A',95],['B',80],['C',65],['D',-Infinity]]);assert.equal(policy.grades[0].riskPct,.0045)});
test('bloqueia o risco quando os pesos da Rubric não somam 100 pontos',()=>{const policy=normalizePolicy({criteria:[{key:'trendQuality',weight:20}]}),ratings=Object.fromEntries(DEFAULT_POLICY.criteria.filter(item=>item.key!=='marketCycle').map(item=>[item.key,'good'])),result=calculateRubric({ratings,marketCycleRegime:'healthy'},policy);assert.equal(result.weightsTotal,95);assert.equal(result.weightsValid,false);assert.equal(result.riskPct,0);assert.equal(result.qualityAllowed,false);assert.match(result.gates.find(gate=>gate.key==='weights').message,/100 pontos/)});
test('Portfolio Heat máximo é configurável e registros antigos recebem o padrão seguro',()=>{assert.equal(normalizePolicy().portfolioHeatLimitPct,3);assert.equal(normalizePolicy({portfolioHeatLimitPct:4.25}).portfolioHeatLimitPct,4.25);assert.equal(normalizePolicy({portfolioHeatLimitPct:0}).portfolioHeatLimitPct,.01)});
test('migra o Heat global legado para cada perfil quando o perfil ainda não tinha limite próprio',()=>{const policy=normalizePolicy({portfolioHeatLimitPct:4.25,profiles:{standard:{maximumPositions:6}}});assert.equal(policy.profiles.standard.maximumPortfolioRiskPct,.0425);assert.equal(policy.profiles.rampUp.maximumPortfolioRiskPct,.0425);assert.equal(policy.portfolioHeatLimitPct,4.25)});
test('descarta o antigo limite de risco inicial salvo nos perfis',()=>{const policy=normalizePolicy({positionSizingVersion:2,profiles:{standard:{initialRiskPct:.005}}});assert.equal(policy.positionSizingVersion,3);assert.equal(Object.hasOwn(policy.profiles.standard,'initialRiskPct'),false)});
test('Grade A exige score e excelência em todos os seis edges',()=>{const ratings=Object.fromEntries(DEFAULT_POLICY.criteria.filter(item=>item.key!=='marketCycle').map(item=>[item.key,'good']));const result=calculateRubric({ratings,marketCycleRegime:'healthy'});assert.equal(result.score,100);assert.equal(result.grade,'A');assert.equal(result.qualityAllowed,true)});
test('score acima de 95 com edge crítico abaixo da excelência cai para B',()=>{const result=calculateRubric({ratings:{trendQuality:'good',relativeStrength:'good',volatility:'good',setupQuality:'good',fundamentalScore:'medium'},marketCycleRegime:'healthy'});assert.ok(result.score>=95);assert.equal(result.rawGrade,'A');assert.equal(result.grade,'B');assert.equal(result.gates[0].key,'fundamentalScore')});
test('97 com todos os gates excelentes é A; 94 mesmo excelente permanece B',()=>{const ratings={trendQuality:'numeric',relativeStrength:'numeric',volatility:'numeric',setupQuality:'numeric',fundamentalScore:'numeric'};const values={trendQuality:.9625,relativeStrength:.9625,volatility:.9625,setupQuality:.9625,fundamentalScore:.9625};const result=calculateRubric({ratings,...values,marketCycleRegime:'healthy'});assert.equal(result.score,97);assert.equal(result.grade,'A');const lower=calculateRubric({ratings,...Object.fromEntries(Object.keys(values).map(key=>[key,.925])),marketCycleRegime:'healthy'});assert.equal(lower.score,94);assert.equal(lower.grade,'B')});
test('mercado defensivo limita a classificação a B e normaliza risk-off legado para defensivo',()=>{const ratings=Object.fromEntries(DEFAULT_POLICY.criteria.filter(item=>item.key!=='marketCycle').map(item=>[item.key,'good']));assert.equal(calculateRubric({ratings,marketCycleRegime:'defensive'}).grade,'B');assert.equal(calculateRubric({ratings,marketCycleRegime:'risk-off'}).grade,'B');assert.equal(calculateRubric({ratings,marketCycleRegime:'risk-off'}).marketCycle,'defensive')});
test('Risk Budget acompanha a grade sem contaminar a pontuação da Rubric',()=>{const ratings={trendQuality:'good',relativeStrength:'good',volatility:'medium',setupQuality:'medium',fundamentalScore:'medium'};const result=calculateRubric({ratings,marketCycleRegime:'healthy'});assert.equal(result.grade,'B');assert.equal(result.gradeRiskPct,.002)});
test('Position Sizing usa o Risk Budget do Grade e os limites de ATR e capital',()=>{const result=calculatePositionSizing({equity:1029500,entry:48.3,stop:45.8,atr:1.72,riskPct:.001,volatilityPct:.002,capitalPct:.1,lot:100});assert.equal(result.quantity,400);assert.equal(result.limitingLayer,'budget');assert.equal(result.theoreticalQuantity,400);assert.equal(result.layers.some(layer=>layer.key==='risk'),false)});
test('Risk Budget é teto e o risco executável reflete o menor limitador da política',()=>{
  const policy=normalizePolicy({
    positionSizingVersion:2,
    selectedProfile:'standard',
    profiles:{standard:{initialVolatilityPct:.00145,capitalPct:.1,maximumPortfolioRiskPct:.05,maximumPositions:6}}
  });
  const result=calculatePolicyPositionSizing({policy,riskBudgetPct:.01,currentHeatPct:0,equity:1000000,entry:100,stop:94.9,atr:1,lot:10});
  assert.equal(result.riskBudgetPct,.01);
  assert.equal(result.budgetLayer.quantity,1960);
  assert.equal(result.theoreticalQuantity,1960);
  assert.equal(result.layers.find(layer=>layer.key==='volatility').quantity,1450);
  assert.equal(result.layers.find(layer=>layer.key==='capital').quantity,1000);
  assert.equal(result.limitingLayer,'capital');
  assert.equal(result.quantity,1000);
  assert.equal(result.executableRiskPct,.0051);
  assert.equal(result.executableRiskPercent,.51);
});
test('quando nenhum limitador reduz a operação, o risco executável alcança o Risk Budget',()=>{
  const policy=normalizePolicy({
    positionSizingVersion:2,
    profiles:{standard:{initialVolatilityPct:.02,capitalPct:1,maximumPortfolioRiskPct:.05,maximumPositions:6}}
  });
  const result=calculatePolicyPositionSizing({policy,riskBudgetPct:.01,currentHeatPct:0,equity:1000000,entry:100,stop:95,atr:1,lot:100});
  assert.equal(result.limitingLayer,'budget');
  assert.equal(result.quantity,2000);
  assert.equal(result.executableRiskPct,.01);
  assert.equal(result.executableRiskPercent,1);
});
test('capacidade restante do Portfolio Heat participa do MIN sem criar overlap de risco',()=>{
  const policy=normalizePolicy({positionSizingVersion:2,profiles:{standard:{initialVolatilityPct:.01,capitalPct:1,maximumPortfolioRiskPct:.05}}});
  const result=calculatePolicyPositionSizing({policy,riskBudgetPct:.01,currentHeatPct:4.8,equity:1000000,entry:100,stop:94.9,atr:1,lot:10});
  assert.equal(result.maximumHeatPct,5);
  assert.equal(result.limitingLayer,'portfolio');
  assert.equal(result.executableRiskPercent,.1989);
  assert.ok(result.currentHeatPct+result.executableRiskPercent<=result.maximumHeatPct);
});
test('limite máximo de posições zera o risco executável dentro do mesmo cálculo central',()=>{
  const policy=normalizePolicy({positionSizingVersion:2,profiles:{standard:{initialVolatilityPct:.01,capitalPct:1,maximumPortfolioRiskPct:.05,maximumPositions:3}}});
  const result=calculatePolicyPositionSizing({policy,riskBudgetPct:.01,currentHeatPct:1,openPositions:3,equity:1000000,entry:100,stop:95,atr:1,lot:100});
  assert.equal(result.positionCapacityAvailable,false);
  assert.equal(result.limitingLayer,'positions');
  assert.equal(result.quantity,0);
  assert.equal(result.executableRiskPercent,0);
});
test('peel-off reduz somente a quantidade necessária para respeitar o alarme',()=>{const result=calculatePeelOff({currentPrice:60,currentStop:50,atr:2,quantity:1000,equity:1000000,policy:DEFAULT_POLICY,profileKey:'rampUp',lot:100});assert.equal(result.required,true);assert.equal(result.allowedQuantity,200);assert.equal(result.peelQuantity,800)});
test('Ongoing Risk calcula long e short',()=>{assert.equal(calculateOngoingRisk({currentPrice:45,currentStop:50,quantity:100,direction:'short',equity:10000}).cash,500)});
test('Portfolio Heat e limite de posições permanecem freios finais',()=>{assert.equal(validatePortfolio({currentHeatPct:4.8,additionalRiskPct:.3,openPositions:3,maximumHeatPct:5,maximumPositions:6}).allowed,false)});

test('calculateGrade respeita os thresholds da escala oficial de 100 pontos',()=>{
  assert.equal(calculateGrade(100), 'A');
  assert.equal(calculateGrade(95), 'A');
  assert.equal(calculateGrade(94), 'B');
  assert.equal(calculateGrade(80), 'B');
  assert.equal(calculateGrade(79), 'C');
  assert.equal(calculateGrade(65), 'C');
  assert.equal(calculateGrade(64.9), 'D');
  assert.equal(calculateGrade(11), 'D');
  assert.equal(calculateGrade(0), 'D');
});

test('BUG CRÍTICO: score 11/100 resulta em Grade D, risco 0% e bloqueio de posição',()=>{
  const ratings = {
    trendQuality: 'bad',
    relativeStrength: 'bad',
    volatility: 'bad',
    setupQuality: 'bad',
    fundamentalScore: 'bad'
  };
  // Market cycle transition gives 11 points out of 20
  const result = calculateRubric({ ratings, marketCycleRegime: 'transition' });
  assert.equal(result.score, 11);
  assert.equal(result.rawGrade, 'D');
  assert.equal(result.grade, 'D');
  assert.equal(result.riskPct, 0);
  assert.equal(result.gradeRiskPct, 0);
  assert.equal(result.qualityAllowed, false);

  const sizing = calculatePositionSizing({
    equity: 100000,
    entry: 25.00,
    stop: 23.50,
    atr: 1.20,
    riskPct: result.riskPct,
    volatilityPct: 0.002,
    capitalPct: 0.10,
    lot: 100
  });
  assert.equal(sizing.quantity, 0);
  assert.equal(sizing.initialRisk, 0);
});

test('Proteção contra escala legada de 10 pontos não corrompe thresholds nem o Grade A',()=>{
  const legacyPolicy = {
    grades: [
      { grade: 'A+', minScore: 8.5, riskPct: 0.003 },
      { grade: 'B', minScore: 7, riskPct: 0.002 },
      { grade: 'C', minScore: 5.5, riskPct: 0.001 },
      { grade: 'No Trade', minScore: -Infinity, riskPct: 0 }
    ]
  };
  const normalized = normalizePolicy(legacyPolicy);
  const gradeA = normalized.grades.find(g => g.grade === 'A');
  const gradeB = normalized.grades.find(g => g.grade === 'B');
  const gradeC = normalized.grades.find(g => g.grade === 'C');
  const gradeD = normalized.grades.find(g => g.grade === 'D');

  // Must have sanitized minScore to 100-point scale
  assert.equal(gradeA.minScore, 95);
  assert.equal(gradeB.minScore, 80);
  assert.equal(gradeC.minScore, 65);
  assert.equal(gradeD.minScore, -Infinity);

  // Score 11 with this policy cannot be Grade A
  const result = calculateRubric({
    ratings: {
      trendQuality: 'bad',
      relativeStrength: 'bad',
      volatility: 'bad',
      setupQuality: 'bad',
      fundamentalScore: 'bad'
    },
    marketCycleRegime: 'transition'
  }, normalized);
  assert.equal(result.score, 11);
  assert.equal(result.grade, 'D');
  assert.equal(result.riskPct, 0);
  assert.equal(result.qualityAllowed, false);
});

test('Risk Budget dinâmico por Grade aplicado ao Position Sizing (B = 0,20% -> 800 ações, A = 0,40% -> 1600 ações)', () => {
  const policy = normalizePolicy();
  const equity = 1000000;
  const entry = 48.30;
  const stop = 45.80; // stop distance = 2.50
  const atr = 1.72;

  // Grade B
  const gradeBConfig = policy.grades.find(g => g.grade === 'B');
  assert.equal(gradeBConfig.riskPct, 0.002);
  const sizingB = calculatePositionSizing({
    equity,
    entry,
    stop,
    atr,
    riskPct: gradeBConfig.riskPct,
    volatilityPct: 0.004,
    capitalPct: 0.10,
    lot: 100
  });
  // R$ 2.000 ÷ 2.50 = 800 ações
  assert.equal(sizingB.budgetLayer.quantity, 800);
  assert.equal(sizingB.theoreticalQuantity, 800);
  assert.equal(sizingB.quantity, 800);
  assert.equal(sizingB.initialRisk, 2000);

  // Grade A
  const gradeAConfig = policy.grades.find(g => g.grade === 'A');
  assert.equal(gradeAConfig.riskPct, 0.004);
  const sizingA = calculatePositionSizing({
    equity,
    entry,
    stop,
    atr,
    riskPct: gradeAConfig.riskPct,
    volatilityPct: 0.004,
    capitalPct: 0.10,
    lot: 100
  });
  // R$ 4.000 ÷ 2.50 = 1.600 ações
  assert.equal(sizingA.budgetLayer.quantity, 1600);
  assert.equal(sizingA.theoreticalQuantity, 1600);
  assert.equal(sizingA.quantity, 1600);
  assert.equal(sizingA.initialRisk, 4000);

  assert.deepEqual(policy.grades.map(item => item.grade), ['A', 'B', 'C', 'D']);
});

test('Migração preserva o risco configurado de A mesmo quando igual ao de B', () => {
  const legacyPolicy = {
    grades: [
      { grade: 'A+', riskPct: 0.004, minScore: 90 },
      { grade: 'A', riskPct: 0.002, minScore: 80 },
      { grade: 'B', riskPct: 0.002, minScore: 70 },
      { grade: 'C', riskPct: 0.001, minScore: 60 },
      { grade: 'D', riskPct: 0, minScore: null }
    ]
  };
  const migrated = normalizePolicy(legacyPolicy);
  assert.equal(migrated.grades.find(g => g.grade === 'B').riskPct, 0.002);
  assert.equal(migrated.grades.find(g => g.grade === 'A').riskPct, 0.002);
  assert.equal(migrated.grades.length, 4);
});

test('marketCycleKey normaliza os 3 estados operacionais oficiais e preserva compatibilidade com legados', () => {
  // 3 Estados Oficiais
  assert.equal(marketCycleKey('healthy'), 'healthy');
  assert.equal(marketCycleKey('Saudável'), 'healthy');
  assert.equal(marketCycleKey('saudavel'), 'healthy');
  assert.equal(marketCycleKey('transition'), 'transition');
  assert.equal(marketCycleKey('Transição'), 'transition');
  assert.equal(marketCycleKey('transicao'), 'transition');
  assert.equal(marketCycleKey('defensive'), 'defensive');
  assert.equal(marketCycleKey('Defensivo'), 'defensive');

  // Mapeamentos de Legado
  assert.equal(marketCycleKey('improving'), 'transition');
  assert.equal(marketCycleKey('Melhorando'), 'transition');
  assert.equal(marketCycleKey('Em recuperação'), 'transition');
  assert.equal(marketCycleKey('Transição saudável'), 'transition');
  assert.equal(marketCycleKey('riskOff'), 'defensive');
  assert.equal(marketCycleKey('Risk-Off'), 'defensive');
  assert.equal(marketCycleKey('doente'), 'defensive');
  assert.equal(marketCycleKey('down'), 'defensive');

  // Indisponível e vazios
  assert.equal(marketCycleKey('unavailable'), 'unavailable');
  assert.equal(marketCycleKey('Não disponível'), 'unavailable');
  assert.equal(marketCycleKey('indisponível'), 'unavailable');
  assert.equal(marketCycleKey(null), null);
  assert.equal(marketCycleKey(''), null);
});

test('Rubric calcula pontos corretos para os 3 estados (20, 11 e 4 pontos) e 0 para indisponível', () => {
  const ratings = { trendQuality: 'good', relativeStrength: 'good', volatility: 'good', setupQuality: 'good', fundamentalScore: 'good' };
  
  // Healthy: 20 pts -> total 100 pts -> Grade A
  const resHealthy = calculateRubric({ ratings, marketCycleRegime: 'healthy' });
  const itemHealthy = resHealthy.contributions.find(c => c.key === 'marketCycle');
  assert.equal(itemHealthy.points, 20);
  assert.equal(resHealthy.score, 100);
  assert.equal(resHealthy.grade, 'A');

  // Transition: 11 pts -> total 91 pts -> Grade B
  const resTransition = calculateRubric({ ratings, marketCycleRegime: 'transition' });
  const itemTransition = resTransition.contributions.find(c => c.key === 'marketCycle');
  assert.equal(itemTransition.points, 11);
  assert.equal(resTransition.score, 91);
  assert.equal(resTransition.grade, 'B');

  // Defensive: 4 pts -> total 84 pts -> Grade B
  const resDefensive = calculateRubric({ ratings, marketCycleRegime: 'defensive' });
  const itemDefensive = resDefensive.contributions.find(c => c.key === 'marketCycle');
  assert.equal(itemDefensive.points, 4);
  assert.equal(resDefensive.score, 84);
  assert.equal(resDefensive.grade, 'B');

  // Unavailable: 0 pts -> total 80 pts -> Grade B, sem inflar artificialmente para Grade A
  const resUnavailable = calculateRubric({ ratings, marketCycleRegime: 'unavailable' });
  const itemUnavailable = resUnavailable.contributions.find(c => c.key === 'marketCycle');
  assert.equal(itemUnavailable.points, 0);
  assert.equal(resUnavailable.score, 80);
  assert.equal(resUnavailable.grade, 'B');
  assert.ok(resUnavailable.gates.some(g => g.key === 'market' && g.message.includes('Não foi possível obter o ciclo de mercado atual')));
});

test('Override manual do Contexto de Mercado recalcula Score e Grade dinamicamente', () => {
  const ratings = { trendQuality: 'good', relativeStrength: 'good', volatility: 'good', setupQuality: 'good', fundamentalScore: 'good' };

  // Contexto automático inicial: Saudável (100 pts -> Grade A)
  const autoResult = calculateRubric({ ratings, marketCycleRegime: 'healthy' });
  assert.equal(autoResult.score, 100);
  assert.equal(autoResult.grade, 'A');

  // Override manual para Transição (91 pts -> Grade B)
  const overrideTransition = calculateRubric({ ratings, marketCycleRegime: 'transition' });
  assert.equal(overrideTransition.score, 91);
  assert.equal(overrideTransition.grade, 'B');

  // Override manual para Defensivo (84 pts -> Grade B)
  const overrideDefensive = calculateRubric({ ratings, marketCycleRegime: 'defensive' });
  assert.equal(overrideDefensive.score, 84);
  assert.equal(overrideDefensive.grade, 'B');

  // Reversão para automático (restaura 100 pts -> Grade A)
  const restoredResult = calculateRubric({ ratings, marketCycleRegime: 'healthy' });
  assert.equal(restoredResult.score, 100);
  assert.equal(restoredResult.grade, 'A');
});



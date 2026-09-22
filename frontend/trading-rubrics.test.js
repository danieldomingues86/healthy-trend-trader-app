const test=require('node:test');
const assert=require('node:assert/strict');
const {DEFAULT_POLICY,calculateRubric,calculateGrade,calculatePositionSizing,calculateOngoingRisk,calculatePeelOff,validatePortfolio,normalizePolicy}=require('./trading-rubrics');
test('Rubric de Position Trend Following totaliza 100 pontos nos seis pilares',()=>{const policy=normalizePolicy();assert.deepEqual(policy.criteria.map(({key,weight})=>[key,weight]),[['trendQuality',25],['marketCycle',20],['relativeStrength',20],['volatility',15],['setupQuality',15],['fundamentalScore',5]]);assert.equal(policy.criteria.reduce((sum,item)=>sum+item.weight,0),100)});
test('Rubric segue a nomenclatura e ordem oficial dos seis critérios',()=>{const policy=normalizePolicy();assert.deepEqual(policy.criteria.map(({key,label,weight})=>[key,label,weight]),[['trendQuality','Contexto do Ativo (Diário)',25],['marketCycle','Contexto do Mercado',20],['relativeStrength','Força Relativa (RS)',20],['volatility','Volatilidade (ATR)',15],['setupQuality','Gatilho de Entrada',15],['fundamentalScore','Fundamentos',5]])});
test('migra política antiga para quatro grades preservando o risco configurado de A',()=>{const policy=normalizePolicy({criteria:[{key:'trendQuality',weight:19}],grades:[{grade:'A+',minScore:91,riskPct:.006},{grade:'A',minScore:80,riskPct:.0045}]});assert.equal(policy.criteria.find(item=>item.key==='trendQuality').weight,19);assert.deepEqual(policy.grades.map(item=>[item.grade,item.minScore]),[['A',95],['B',80],['C',65],['D',-Infinity]]);assert.equal(policy.grades[0].riskPct,.0045)});
test('bloqueia o risco quando os pesos da Rubric não somam 100 pontos',()=>{const policy=normalizePolicy({criteria:[{key:'trendQuality',weight:20}]}),ratings=Object.fromEntries(DEFAULT_POLICY.criteria.filter(item=>item.key!=='marketCycle').map(item=>[item.key,'good'])),result=calculateRubric({ratings,marketCycleRegime:'healthy'},policy);assert.equal(result.weightsTotal,95);assert.equal(result.weightsValid,false);assert.equal(result.riskPct,0);assert.equal(result.qualityAllowed,false);assert.match(result.gates.find(gate=>gate.key==='weights').message,/100 pontos/)});
test('Portfolio Heat máximo é configurável e registros antigos recebem o padrão seguro',()=>{assert.equal(normalizePolicy().portfolioHeatLimitPct,3);assert.equal(normalizePolicy({portfolioHeatLimitPct:4.25}).portfolioHeatLimitPct,4.25);assert.equal(normalizePolicy({portfolioHeatLimitPct:0}).portfolioHeatLimitPct,.01)});
test('Grade A exige score e excelência em todos os seis edges',()=>{const ratings=Object.fromEntries(DEFAULT_POLICY.criteria.filter(item=>item.key!=='marketCycle').map(item=>[item.key,'good']));const result=calculateRubric({ratings,marketCycleRegime:'healthy'});assert.equal(result.score,100);assert.equal(result.grade,'A');assert.equal(result.qualityAllowed,true)});
test('score acima de 95 com edge crítico abaixo da excelência cai para B',()=>{const result=calculateRubric({ratings:{trendQuality:'good',relativeStrength:'good',volatility:'good',setupQuality:'good',fundamentalScore:'medium'},marketCycleRegime:'healthy'});assert.ok(result.score>=95);assert.equal(result.rawGrade,'A');assert.equal(result.grade,'B');assert.equal(result.gates[0].key,'fundamentalScore')});
test('97 com todos os gates excelentes é A; 94 mesmo excelente permanece B',()=>{const ratings={trendQuality:'numeric',relativeStrength:'numeric',volatility:'numeric',setupQuality:'numeric',fundamentalScore:'numeric'};const values={trendQuality:.9625,relativeStrength:.9625,volatility:.9625,setupQuality:.9625,fundamentalScore:.9625};const result=calculateRubric({ratings,...values,marketCycleRegime:'healthy'});assert.equal(result.score,97);assert.equal(result.grade,'A');const lower=calculateRubric({ratings,...Object.fromEntries(Object.keys(values).map(key=>[key,.925])),marketCycleRegime:'healthy'});assert.equal(lower.score,94);assert.equal(lower.grade,'B')});
test('mercado defensivo limita a classificação e risk-off bloqueia a oportunidade',()=>{const ratings=Object.fromEntries(DEFAULT_POLICY.criteria.filter(item=>item.key!=='marketCycle').map(item=>[item.key,'good']));assert.equal(calculateRubric({ratings,marketCycleRegime:'defensive'}).grade,'B');assert.equal(calculateRubric({ratings,marketCycleRegime:'risk-off'}).grade,'D')});
test('risco-base acompanha a grade sem contaminar a pontuação da Rubric',()=>{const ratings={trendQuality:'good',relativeStrength:'good',volatility:'medium',setupQuality:'medium',fundamentalScore:'medium'};const result=calculateRubric({ratings,marketCycleRegime:'healthy'});assert.equal(result.grade,'B');assert.equal(result.gradeRiskPct,.002)});
test('Position Sizing continua usando somente limites de risco, ATR e capital',()=>{const result=calculatePositionSizing({equity:1029500,entry:48.3,stop:45.8,atr:1.72,riskPct:.001,volatilityPct:.002,capitalPct:.1,lot:100});assert.equal(result.quantity,400);assert.equal(result.limitingLayer,'risk')});
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

test('Risco-base dinâmico por Grade aplicado ao Position Sizing (B = 0,20% -> 800 ações, A = 0,40% -> 1600 ações)', () => {
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
  assert.equal(sizingB.layers.find(l => l.key === 'risk').quantity, 800);
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
  assert.equal(sizingA.layers.find(l => l.key === 'risk').quantity, 1600);
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



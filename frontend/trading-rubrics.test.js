const test=require('node:test');
const assert=require('node:assert/strict');
const {DEFAULT_POLICY,calculateRubric,calculatePositionSizing,calculateOngoingRisk,calculatePeelOff,validatePortfolio,normalizePolicy}=require('./trading-rubrics');

test('Rubric padrão totaliza 10 pontos com o ciclo pesando 40%',()=>{
  const policy=normalizePolicy();
  assert.equal(policy.criteria.reduce((sum,item)=>sum+item.weight,0),10);
  assert.equal(policy.criteria.find(item=>item.key==='marketCycle').weight,4);
});

test('A+ usa o menor risco entre grade e teto do perfil',()=>{
  const ratings=Object.fromEntries(DEFAULT_POLICY.criteria.map(item=>[item.key,item.key==='marketCycle'?'healthy':'good']));
  const result=calculateRubric({ratings,marketCycleRegime:'healthy'});
  assert.equal(result.score,10);
  assert.equal(result.grade,'A+');
  assert.equal(result.gradeRiskPct,.004);
  assert.equal(result.profileCapPct,.003);
  assert.equal(result.riskPct,.003);
});

test('o perfil Ramp-Up representa o mercado em recuperação e limita o risco final',()=>{
  const ratings=Object.fromEntries(DEFAULT_POLICY.criteria.filter(item=>item.key!=='marketCycle').map(item=>[item.key,'good']));
  const result=calculateRubric({ratings,profileKey:'rampUp'});
  assert.equal(result.grade,'A+');
  assert.equal(result.marketCycle,'improving');
  assert.equal(result.riskPct,.001);
});

test('o perfil padrão representa mercado saudável sem um segundo multiplicador',()=>{
  const ratings=Object.fromEntries(DEFAULT_POLICY.criteria.filter(item=>item.key!=='marketCycle').map(item=>[item.key,'good']));
  const result=calculateRubric({ratings,profileKey:'standard'});
  assert.equal(result.marketCycle,'healthy');
  assert.equal(result.marketFactor,1);
  assert.equal(result.riskPct,.003);
});

test('perfil Ramp-Up limita A+ a 0,10%',()=>{
  const ratings=Object.fromEntries(DEFAULT_POLICY.criteria.filter(item=>item.key!=='marketCycle').map(item=>[item.key,'good']));
  const result=calculateRubric({ratings,profileKey:'rampUp'});
  assert.equal(result.profileCapPct,.001);
  assert.equal(result.riskPct,.001);
});

test('Position Sizing preserva o menor limite',()=>{
  const result=calculatePositionSizing({equity:1029500,entry:48.3,stop:45.8,atr:1.72,riskPct:.001,volatilityPct:.002,capitalPct:.1,lot:100});
  assert.equal(result.quantity,400);
  assert.equal(result.limitingLayer,'risk');
});

test('peel-off reduz somente a quantidade necessária para respeitar o alarme',()=>{
  const result=calculatePeelOff({currentPrice:60,currentStop:50,atr:2,quantity:1000,equity:1000000,policy:DEFAULT_POLICY,profileKey:'rampUp',lot:100});
  assert.equal(result.required,true);
  assert.equal(result.allowedQuantity,200);
  assert.equal(result.peelQuantity,800);
});

test('Ongoing Risk calcula long e short',()=>{
  assert.equal(calculateOngoingRisk({currentPrice:45,currentStop:50,quantity:100,direction:'short',equity:10000}).cash,500);
});

test('Portfolio Heat e limite de posições permanecem como freios finais',()=>{
  const result=validatePortfolio({currentHeatPct:4.8,additionalRiskPct:.3,openPositions:3,maximumHeatPct:5,maximumPositions:6});
  assert.equal(result.allowed,false);
  assert.equal(result.heatAllowed,false);
});

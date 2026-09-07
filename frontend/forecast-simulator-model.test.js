const test=require('node:test');
const assert=require('node:assert/strict');
const Forecast=require('./forecast-simulator-model');

test('simulação fixa aplica compounding e produz percentis ordenados',()=>{
  const result=Forecast.simulateFixed({equity:100000,riskPct:.01,rValues:[1],trades:10,runs:200,seed:4});
  assert.ok(Math.abs(result.median-100000*Math.pow(1.01,10))<.01);
  assert.ok(result.adverse<=result.median&&result.median<=result.favorable);
});

test('simulação de objetivo retorna faixa probabilística de trades',()=>{
  const result=Forecast.simulateTarget({equity:100000,target:105000,riskPct:.01,rValues:[-1,2,2],runs:1000,maxTrades:100,seed:8});
  assert.ok(result.hitProbability>0&&result.hitProbability<=1);
  assert.ok(result.tradeRange[0]<=result.estimatedTrades&&result.estimatedTrades<=result.tradeRange[1]);
});

test('resumo usa a distribuição de R-Multiples informada',()=>{
  assert.deepEqual(Forecast.summary([-1,-.5,1,2]),{count:4,winRate:.5,averageWin:1.5,averageLoss:-.75,expectancy:.375});
});

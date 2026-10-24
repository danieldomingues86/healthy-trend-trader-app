'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getOpportunityRadarData } = require('../src/opportunity-radar');

test('getOpportunityRadarData retorna estrutura segura quando cache está vazio', async () => {
  const res = await getOpportunityRadarData(null);
  assert.equal(res.totalReady, 0);
  assert.deepEqual(res.items, []);
});

test('getOpportunityRadarData consolida apenas ativos prontos para entrada usando motores reais (IBOV, IFIX, BDRs)', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const cacheFile = path.join(__dirname, '..', 'data', 'market-cache.json');
  if (!fs.existsSync(cacheFile)) return;

  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const result = await getOpportunityRadarData(cache);

  assert.equal(typeof result.totalReady, 'number');
  assert.ok(Array.isArray(result.items));
  assert.equal(result.totalReady, result.items.length);

  for (const item of result.items) {
    assert.ok(['IBOV', 'IFIX', 'BDRs'].includes(item.market), `Mercado inválido: ${item.market}`);
    assert.ok(item.rsScore > 80, `RS deve ser estritamente > 80, recebido: ${item.rsScore}`);
    assert.ok(['A', 'B', 'C', 'D'].includes(item.grade), `Grade deve ser válido, recebido: ${item.grade}`);
    assert.equal(item.trend, 'Alinhada');
    assert.equal(item.status, 'Pronto para entrada');
    assert.ok(item.entry > item.stop, 'Entrada planejada deve ser maior que stop inicial');
    assert.ok(item.rr >= 1.5, 'R:R deve ser consistente');
    assert.ok(item.triggerName && item.triggerId !== 'NONE', 'Deve possuir gatilho confirmado');
  }
});

test('getOpportunityRadarData expõe marketCycles canônico por mercado e reflete IFIX em Expansão independentemente de IBOV', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const cacheFile = path.join(__dirname, '..', 'data', 'market-cache.json');
  if (!fs.existsSync(cacheFile)) return;

  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const result = await getOpportunityRadarData(cache);

  assert.ok(result.marketCycles, 'marketCycles deve existir no payload');
  assert.ok(result.marketCycles.ALL, 'Deve possuir ciclo ALL');
  assert.ok(result.marketCycles.IBOV, 'Deve possuir ciclo IBOV');
  assert.ok(result.marketCycles.IFIX, 'Deve possuir ciclo IFIX');
  assert.ok(result.marketCycles.BDRs, 'Deve possuir ciclo BDRs');

  // IFIX deve refletir status healthy (Expansão) com score >= 70
  assert.equal(result.marketCycles.IFIX.state, 'healthy');
  assert.equal(result.marketCycles.IFIX.marketId, 'fii');
  assert.ok(result.marketCycles.IFIX.score >= 70, `Score IFIX deve ser >= 70, recebido: ${result.marketCycles.IFIX.score}`);

  // ALL não pode ser defensivo se houver mercado saudável com oportunidades
  assert.equal(result.marketCycles.ALL.state, 'healthy');
});

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

const test = require('node:test');
const assert = require('node:assert/strict');
const { b3IndexCode, encodePayload, parseB3Number, parseYearMatrix, fetchIndexHistory } = require('../src/b3-index-history');

test('histórico de índices B3 converte o quadro anual oficial em fechamentos diários', () => {
  assert.equal(b3IndexCode('^BVSP'), 'IBOV');
  assert.equal(b3IndexCode('IFIX'), 'IFIX');
  assert.equal(b3IndexCode('PETR4'), null);
  assert.deepEqual(JSON.parse(Buffer.from(encodePayload('SMLL', 2026), 'base64').toString()), { language: 'pt-br', index: 'SMLL', year: '2026' });
  assert.equal(parseB3Number('187.952,91'), 187952.91);
  assert.equal(parseB3Number(null), null);
  assert.deepEqual(parseYearMatrix(2026, { results: [
    { day: 2, rateValue1: '100.000,00', rateValue2: null },
    { day: 31, rateValue2: '99.000,00' }
  ] }), [{ date: '20260102', close: 100000 }]);
});

test('histórico de índices B3 consulta a matriz anual oficial com o código correto', async () => {
  let url;
  const history = await fetchIndexHistory('SMLL', {
    years: [2026],
    fetchImpl: async (request) => ({ ok: true, json: async () => { url = request; return { results: [{ day: 3, rateValue9: '2.500,25' }] }; } })
  });
  assert.match(url, /indexStatisticsProxy\/IndexCall\/GetPortfolioDay/);
  assert.deepEqual(history, [{ date: '20260903', close: 2500.25 }]);
  assert.equal(history.source, 'b3-indexes');
});

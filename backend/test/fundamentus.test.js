const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFundamentusPage, number } = require('../src/fundamentus');

test('parser Fundamentus normaliza indicadores e percentuais para o cache local', () => {
  const html = `<table><tr><td>Empresa</td><td>FLEURY ON NM</td><td>Min 52 sem</td></tr><tr><td>Setor</td><td>Saúde</td><td>Subsetor</td><td>Diagnósticos</td><td>Vol $ méd</td></tr><tr><td>Cotação</td><td>19,21</td><td>Valor de mercado</td><td>10.511.500.000</td></tr><tr><td>P/L</td><td>14,92</td><td>P/VP</td><td>1,94</td><td>ROIC</td><td>12,7%</td><td>ROE</td><td>13,0%</td></tr><tr><td>Marg. Líquida</td><td>7,9%</td><td>EV / EBITDA</td><td>6,13</td><td>Dív Líq / Patrim</td><td>0,65</td><td>Div. Yield</td><td>6,1%</td><td>Cres. Rec (5a)</td><td>20,6%</td></tr></table>`;
  const result = parseFundamentusPage(html, 'flry3');
  assert.equal(result.ticker, 'FLRY3');
  assert.equal(result.company.name, 'FLEURY ON NM');
  assert.equal(result.market.price, 19.21);
  assert.equal(result.market.marketCap, 10511500000);
  assert.equal(result.metrics.priceToBook, 1.94);
  assert.equal(result.metrics.roic, 0.127);
  assert.equal(result.metrics.dividendYield, 0.061);
  assert.ok(Math.abs(result.metrics.earningsCagr - 0.206) < 0.000001);
});

test('parser numérico aceita a notação brasileira usada pelo Fundamentus', () => {
  assert.equal(number('10.511.500.000'), 10511500000);
  assert.equal(number('14,92'), 14.92);
  assert.equal(number('N/D'), null);
});

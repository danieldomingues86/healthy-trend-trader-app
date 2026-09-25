const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { ticker, fetchFundamentals, clearFundamentalsCache, DATA_FILE } = require('../src/fundamentals');

test('normaliza ticker da B3 removendo espaços e preservando uppercase', () => {
  assert.equal(ticker(' petr4 '), 'PETR4');
  assert.equal(ticker('wege3'), 'WEGE3');
  assert.equal(ticker(null), '');
});

test('provider combina CVM e cache Fundamentus no contrato normalizado', async () => {
  const cache = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  const symbol = Object.keys(cache.companies)[0];
  assert.ok(symbol);
  clearFundamentalsCache();
  const result = await fetchFundamentals(` ${symbol.toLowerCase()} `);
  assert.equal(result.ticker, symbol);
  assert.match(result.provider, /CVM Dados Abertos/);
  assert.ok(result.fetchedAt);
  assert.ok(result.company);
});

test('provider rejeita ticker com formato inválido antes de consultar cache', async () => {
  await assert.rejects(fetchFundamentals('INVALIDO'), /Ticker B3 inválido/);
  await assert.rejects(fetchFundamentals('PETR@'), /Ticker B3 inválido/);
});

test('provider informa ticker ausente de forma amigável', async () => {
  clearFundamentalsCache();
  await assert.rejects(fetchFundamentals('ZZZZ9'), /não encontrado na base CVM sincronizada/);
});

test('retorna fundamentos de BDRs por ticker local ou ticker internacional original', async () => {
  clearFundamentalsCache();
  // Consulta por ticker de BDR na B3
  const appleBdr = await fetchFundamentals('AAPL34');
  assert.equal(appleBdr.ticker, 'AAPL34');
  assert.equal(appleBdr.originalSymbol, 'AAPL');
  assert.equal(appleBdr.exchange, 'NASDAQ');
  assert.equal(appleBdr.company.name, 'Apple Inc.');
  assert.ok(appleBdr.metrics.roe > 0.5);
  assert.equal(appleBdr.incomeHistory.length, 4);
  assert.match(appleBdr.provider, /Mercado Internacional/);

  // Consulta por ticker com dígito no meio (M1TA34)
  const metaBdr = await fetchFundamentals('m1ta34');
  assert.equal(metaBdr.ticker, 'M1TA34');
  assert.equal(metaBdr.originalSymbol, 'META');
  assert.equal(metaBdr.company.name, 'Meta Platforms Inc.');

  // Consulta por ticker original internacional norte-americano (NVDA)
  const nvidiaOriginal = await fetchFundamentals('NVDA');
  assert.equal(nvidiaOriginal.ticker, 'NVDA');
  assert.equal(nvidiaOriginal.bdrTicker, 'NVDC34');
  assert.equal(nvidiaOriginal.company.name, 'NVIDIA Corporation');
  assert.ok(nvidiaOriginal.metrics.earningsCagr > 0.5);

  // Consulta por Nubank / ROXO34
  const nubank = await fetchFundamentals('ROXO34');
  assert.equal(nubank.originalSymbol, 'NU');
  assert.equal(nubank.company.sector, 'Serviços Financeiros');
  assert.ok(Number.isFinite(nubank.market.price));
});

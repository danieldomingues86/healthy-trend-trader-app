const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {ticker,fetchFundamentals,clearFundamentalsCache,DATA_FILE}=require('../src/fundamentals');

test('normaliza ticker da B3 removendo espaços e preservando uppercase',()=>{assert.equal(ticker(' petr4 '),'PETR4');assert.equal(ticker('wege3'),'WEGE3');assert.equal(ticker(null),'')});
test('provider retorna empresa da base CVM e reutiliza o contrato normalizado',async()=>{const cache=JSON.parse(await fs.readFile(DATA_FILE,'utf8'));const symbol=Object.keys(cache.companies)[0];assert.ok(symbol);clearFundamentalsCache();const result=await fetchFundamentals(` ${symbol.toLowerCase()} `);assert.equal(result.ticker,symbol);assert.equal(result.provider,'CVM Dados Abertos');assert.equal(result.fetchedAt,cache.updatedAt);assert.ok(result.company)});
test('provider rejeita ticker com formato inválido antes de consultar cache',async()=>{await assert.rejects(fetchFundamentals('INVALIDO'),/Ticker B3 inválido/);await assert.rejects(fetchFundamentals('PETR@'),/Ticker B3 inválido/)});
test('provider informa ticker ausente de forma amigável',async()=>{clearFundamentalsCache();await assert.rejects(fetchFundamentals('ZZZZ9'),/não encontrado na base CVM sincronizada/)});

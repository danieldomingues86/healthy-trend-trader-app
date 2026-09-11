const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
process.env.BRAPI_CACHE_DIRECTORY = path.join(os.tmpdir(), `healthy-trend-stock-universe-${process.pid}`);
const { REQUIRED_STOCK_SYMBOLS, stockUniverse, splitStockUniverse } = require('../src/stock-universe');
test('all requested tickers remain eligible without quote or metadata', () => {
  const symbols = stockUniverse(new Map());
  assert.equal(symbols.length, 83);
  for (const symbol of REQUIRED_STOCK_SYMBOLS) assert.ok(symbols.includes(symbol));
  for (const symbol of ['SLCE3','AXIA6','AXIA7','CYRE4','RENT4','KLBN11']) assert.ok(symbols.includes(symbol));
});
test('separates Ibovespa, Small Caps and residual stocks without overlap', () => {
  assert.deepEqual(splitStockUniverse(['PETR4','SLCE3','ABCD3'], ['PETR4'], ['SLCE3','PETR4']), { ibov:['PETR4'], small:['SLCE3'], other:['ABCD3'] });
});
test('extends index membership with stocks and units, excluding funds and BDRs', () => {
  const metadata = new Map([['ABCD3',{type:'stock'}],['ABCD11',{type:'stock',subType:'unit'}],['TEST11',{type:'fund',subType:'fii'}],['ETFF11',{type:'stock',subType:'etf'}],['AAPL34',{type:'bdr'}]]);
  const symbols = stockUniverse(metadata,['PETR4','ABCD3']);
  assert.ok(symbols.includes('ABCD3') && symbols.includes('ABCD11'));
  assert.equal(symbols.filter(s=>s==='PETR4').length,1);
  for(const symbol of ['TEST11','ETFF11','AAPL34']) assert.ok(!symbols.includes(symbol));
});

test('range restriction retries three months without masking other provider failures', async () => {
  const {fetchHistory}=require('../src/market-data');
  const original=global.fetch; const urls=[];
  global.fetch=async url=>{urls.push(String(url));return urls.length===1?{ok:false,status:400,json:async()=>({code:'INVALID_RANGE',message:'range denied'})}:{ok:true,json:async()=>({results:[{historicalDataPrice:[{close:10}]}]})}};
  try {assert.deepEqual(await fetchHistory('SLCE3'),[{close:10}]);assert.match(urls[1],/range=3mo/);
    global.fetch=async()=>({ok:false,status:404,json:async()=>({code:'NOT_FOUND',message:'denied'})});
    await assert.rejects(fetchHistory('VALE3'),/denied/);
  } finally {global.fetch=original;}
});

test('historical requests are grouped instead of consuming one call per asset', async () => {
  const { fetchHistories } = require('../src/market-data');
  const original = global.fetch; const urls = [];
  global.fetch = async url => {
    urls.push(String(url));
    const symbols = new URL(String(url)).searchParams.get('symbols').split(',');
    return { ok: true, json: async () => ({ results: symbols.map(symbol => ({ symbol, historicalDataPrice: [{ close: 10 }] })) }) };
  };
  try {
    const symbols = Array.from({ length: 23 }, (_, index) => `TEST${index + 100}`);
    const histories = await fetchHistories(symbols, 10);
    assert.equal(histories.size, 23);
    assert.equal(urls.length, 3);
    assert.ok(urls.every(url => new URL(url).searchParams.get('symbols').split(',').length <= 10));
  } finally { global.fetch = original; }
});

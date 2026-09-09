const test = require('node:test');
const assert = require('node:assert/strict');
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
    global.fetch=async()=>({ok:false,status:401,json:async()=>({code:'UNAUTHORIZED',message:'denied'})});
    await assert.rejects(fetchHistory('SLCE3'),/denied/);
  } finally {global.fetch=original;}
});

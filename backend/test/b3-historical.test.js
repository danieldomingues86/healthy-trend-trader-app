const test=require('node:test'),assert=require('node:assert/strict');
const {parseLine,parseQuotes}=require('../src/b3-historical');
function line({date='20260914',symbol='WEGE3',close='0000000004820'}={}){return `01${date}02${symbol.padEnd(12)}010${''.padEnd(81)}${close}${''.padEnd(124)}`}
test('B3 COTAHIST parser reads the official fixed-width date, ticker and close',()=>{
 const item=parseLine(line());assert.deepEqual(item,{symbol:'WEGE3',date:'20260914',close:48.2});
 const rows=parseQuotes(['00HEADER',line(),line({symbol:'PETR4',close:'0000000003000'}),'99TRAILER'].join('\n'),['WEGE3']);assert.equal(rows.get('WEGE3')[0].close,48.2);assert.equal(rows.has('PETR4'),false);
});

const test=require('node:test'),assert=require('node:assert/strict');
const {deflateRawSync}=require('node:zlib');
const {parseLine,parseQuotes,extractZip}=require('../src/b3-historical');
function line({date='20260914',symbol='WEGE3',close='0000000004820'}={}){return `01${date}02${symbol.padEnd(12)}010${''.padEnd(81)}${close}${''.padEnd(124)}`}
test('B3 COTAHIST parser reads the official fixed-width date, ticker and close',()=>{
 const item=parseLine(line());assert.deepEqual(item,{symbol:'WEGE3',date:'20260914',close:48.2});
 const rows=parseQuotes(['00HEADER',line(),line({symbol:'PETR4',close:'0000000003000'}),'99TRAILER'].join('\n'),['WEGE3']);assert.equal(rows.get('WEGE3')[0].close,48.2);assert.equal(rows.has('PETR4'),false);
 assert.equal(parseQuotes(Buffer.from([line(),line({symbol:'PETR4'})].join('\n')),['PETR4']).get('PETR4')[0].symbol,'PETR4');
});
test('B3 COTAHIST extractor reads a standard deflated ZIP entry',()=>{
 const source=Buffer.from('01COTAHIST');const compressed=deflateRawSync(source),name=Buffer.from('COTAHIST_A2026.TXT');
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(source.length,22);local.writeUInt16LE(name.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(source.length,24);central.writeUInt16LE(name.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+compressed.length,16);
 assert.equal(extractZip(Buffer.concat([local,name,compressed,central,name,end])).toString(),source.toString());
});

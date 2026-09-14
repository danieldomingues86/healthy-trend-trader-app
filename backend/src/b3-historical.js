const fs=require('node:fs/promises');
const path=require('node:path');
const {inflateRawSync}=require('node:zlib');

const ARCHIVE='https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_A';
const number=value=>Number(String(value||'').trim())/100;
function extractZip(buffer){
  // COTAHIST é um ZIP comum, não um fluxo gzip/zlib. Lemos a primeira entrada
  // do diretório central para suportar tanto arquivos armazenados quanto deflados.
  const endSignature=0x06054b50;let end=-1;
  for(let offset=buffer.length-22;offset>=Math.max(0,buffer.length-0xffff-22);offset-=1){if(buffer.readUInt32LE(offset)===endSignature){end=offset;break}}
  if(end<0)throw new Error('Arquivo COTAHIST inválido: diretório ZIP ausente.');
  const centralOffset=buffer.readUInt32LE(end+16);
  if(buffer.readUInt32LE(centralOffset)!==0x02014b50)throw new Error('Arquivo COTAHIST inválido: entrada ZIP ausente.');
  const method=buffer.readUInt16LE(centralOffset+10),compressedSize=buffer.readUInt32LE(centralOffset+20),nameLength=buffer.readUInt16LE(centralOffset+28),extraLength=buffer.readUInt16LE(centralOffset+30),localOffset=buffer.readUInt32LE(centralOffset+42);
  if(buffer.readUInt32LE(localOffset)!==0x04034b50)throw new Error('Arquivo COTAHIST inválido: cabeçalho ZIP ausente.');
  const localNameLength=buffer.readUInt16LE(localOffset+26),localExtraLength=buffer.readUInt16LE(localOffset+28),start=localOffset+30+localNameLength+localExtraLength;
  const compressed=buffer.subarray(start,start+compressedSize);
  if(method===0)return compressed;
  if(method===8)return inflateRawSync(compressed);
  throw new Error(`Compressão ZIP COTAHIST não suportada: ${method}.`);
}
function parseLine(line){
  if(line.slice(0,2)!=='01')return null;
  const symbol=line.slice(12,24).trim().toUpperCase();
  const date=line.slice(2,10).trim();
  const close=number(line.slice(108,121));
  return symbol&&/^\d{8}$/.test(date)&&Number.isFinite(close)&&close>0?{symbol,date,close}:null;
}
function parseQuotes(text,symbols){
  const wanted=new Set(symbols.map(value=>String(value).trim().toUpperCase()));
  const values=new Map();
  if(Buffer.isBuffer(text)){
    let start=0;
    while(start<text.length){
      let end=text.indexOf(10,start);if(end<0)end=text.length;
      if(end-start>=121&&text.toString('ascii',start,start+2)==='01'){
        const symbol=text.toString('ascii',start+12,start+24).trim().toUpperCase();
        if(wanted.has(symbol)){
          const date=text.toString('ascii',start+2,start+10).trim();
          const close=number(text.toString('ascii',start+108,start+121));
          if(/^\d{8}$/.test(date)&&Number.isFinite(close)&&close>0){const history=values.get(symbol)||[];history.push({symbol,date,close});values.set(symbol,history)}
        }
      }
      start=end+1;
    }
    return values;
  }
  for(const line of text.split(/\r?\n/)){
    const item=parseLine(line);if(!item||!wanted.has(item.symbol))continue;
    const history=values.get(item.symbol)||[];history.push({date:item.date,close:item.close});values.set(item.symbol,history);
  }
  return values;
}
async function archive(year,{fetchImpl=fetch,cacheDirectory}){
  const file=cacheDirectory&&path.join(cacheDirectory,`cotahist-${year}.zip`);
  try{return extractZip(await fs.readFile(file))}catch{}
  const response=await fetchImpl(`${ARCHIVE}${year}.ZIP`);
  if(!response.ok)throw Object.assign(new Error(`B3 HTTP ${response.status}`),{status:response.status});
  const zip=Buffer.from(await response.arrayBuffer());
  if(file){await fs.mkdir(cacheDirectory,{recursive:true});await fs.writeFile(file,zip)}
  return extractZip(zip);
}
async function fetchHistories(symbols,{years,fetchImpl,cacheDirectory}={}){
  const merged=new Map();
  for(const year of years){for(const [symbol,items] of (await parseQuotes(await archive(year,{fetchImpl,cacheDirectory}),symbols)).entries())merged.set(symbol,[...(merged.get(symbol)||[]),...items])}
  return new Map([...merged].map(([symbol,items])=>[symbol,items.sort((a,b)=>a.date.localeCompare(b.date)).map(item=>({date:item.date,close:item.close}))]));
}
module.exports={parseLine,parseQuotes,fetchHistories,extractZip};

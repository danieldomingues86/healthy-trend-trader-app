const fs=require('node:fs/promises');
const path=require('node:path');
const {unzipSync}=require('node:zlib');

const ARCHIVE='https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_A';
const number=value=>Number(String(value||'').trim())/100;
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
  for(const line of text.split(/\r?\n/)){
    const item=parseLine(line);if(!item||!wanted.has(item.symbol))continue;
    const history=values.get(item.symbol)||[];history.push({date:item.date,close:item.close});values.set(item.symbol,history);
  }
  return values;
}
async function archive(year,{fetchImpl=fetch,cacheDirectory}){
  const file=cacheDirectory&&path.join(cacheDirectory,`cotahist-${year}.txt`);
  try{return await fs.readFile(file,'latin1')}catch{}
  const response=await fetchImpl(`${ARCHIVE}${year}.ZIP`);
  if(!response.ok)throw Object.assign(new Error(`B3 HTTP ${response.status}`),{status:response.status});
  const text=unzipSync(Buffer.from(await response.arrayBuffer())).toString('latin1');
  if(file){await fs.mkdir(cacheDirectory,{recursive:true});await fs.writeFile(file,text,'latin1')}
  return text;
}
async function fetchHistories(symbols,{years,fetchImpl,cacheDirectory}={}){
  const merged=new Map();
  for(const year of years){for(const [symbol,items] of (await parseQuotes(await archive(year,{fetchImpl,cacheDirectory}),symbols)).entries())merged.set(symbol,[...(merged.get(symbol)||[]),...items])}
  return new Map([...merged].map(([symbol,items])=>[symbol,items.sort((a,b)=>a.date.localeCompare(b.date)).map(item=>({date:item.date,close:item.close}))]));
}
module.exports={parseLine,parseQuotes,fetchHistories};

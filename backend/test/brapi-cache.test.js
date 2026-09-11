const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createBrapiClient, resetTime } = require('../src/brapi-client');
const { createRefreshControl } = require('../src/market-refresh-control');
const response = (payload, status = 200, headers = {}) => ({ ok: status === 200, status, json: async () => payload, headers: { get: key => headers[key] } });
async function directory(t) { const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'htt-brapi-test-'));t.after(() => fs.rm(dir,{recursive:true,force:true}));return dir; }
test('40 concurrent reads of one URL use one request; restart reuses disk response', async t => {
 const dir = await directory(t);let calls=0,time=1000000;
 const fetchImpl=async()=>{calls++;return response({price:42});};
 const client=createBrapiClient({directory:dir,fetchImpl,now:()=>time});
 const values=await Promise.all(Array.from({length:40},()=>client.request('https://brapi.dev/api/history')));
 assert.equal(calls,1);assert(values.every(v=>v.price===42));
 const restarted=createBrapiClient({directory:dir,fetchImpl,now:()=>time});
 await restarted.request('https://brapi.dev/api/history');assert.equal(calls,1);
 time+=21*3600000;await restarted.request('https://brapi.dev/api/history');assert.equal(calls,2);
});
test('Monthly quota blocks different URLs and survives restart until supplied reset', async t => {
 const dir=await directory(t);let calls=0,time=Date.parse('2026-09-10T23:00:00Z');
 const fetchImpl=async()=>{calls++;return response({code:'MONTHLY_LIMIT_EXCEEDED',message:'A cota volta em 28/09/2026'},429);};
 const client=createBrapiClient({directory:dir,fetchImpl,now:()=>time});
 const attempts=await Promise.allSettled(Array.from({length:12},(_,i)=>client.request(`https://brapi.dev/${i}`)));
 assert(attempts.every(r=>r.status==='rejected'));assert.equal(calls,1);
 assert.equal((await client.status()).blockedUntil,Date.parse('2026-09-28T03:00:00Z'));
 const restarted=createBrapiClient({directory:dir,fetchImpl,now:()=>time});
 await assert.rejects(restarted.request('https://brapi.dev/new'));assert.equal(calls,1);
 time=Date.parse('2026-09-28T03:00:01Z');await assert.rejects(restarted.request('https://brapi.dev/new'));assert.equal(calls,2);
});
test('A changed API credential clears only the old credential quota state', async t => {
 const dir=await directory(t);let calls=0,time=Date.parse('2026-09-10T12:00:00Z');
 const first=createBrapiClient({directory:dir,credential:'old-token',fetchImpl:async()=>{calls++;return response({code:'MONTHLY_LIMIT_EXCEEDED',message:'A cota volta em 28/09/2026'},429);},now:()=>time});
 await assert.rejects(first.request('https://brapi.dev/old'));assert.equal(calls,1);assert((await first.status()).blockedUntil>time);
 const changed=createBrapiClient({directory:dir,credential:'new-token',fetchImpl:async()=>{calls++;return response({ok:true});},now:()=>time});
 assert.equal((await changed.status()).blockedUntil,0);assert.equal((await changed.status()).trackedRequests,undefined);
 assert.deepEqual(await changed.request('https://brapi.dev/new'),{ok:true});assert.equal(calls,2);
 const disk=JSON.parse(await fs.readFile(path.join(dir,'provider-state.json')));assert(!JSON.stringify(disk).includes('new-token'));assert(!JSON.stringify(disk).includes('old-token'));
});
test('Local daily and rolling budgets count actual calls, not cache hits', async t => {
 const dir=await directory(t);let calls=0,time=Date.parse('2026-09-10T12:00:00Z');
 const client=createBrapiClient({directory:dir,fetchImpl:async()=>{calls++;return response({ok:true});},now:()=>time,dailyLimit:2,rollingLimit:3});
 await client.request('https://brapi.dev/1');await client.request('https://brapi.dev/1');await client.request('https://brapi.dev/2');
 await assert.rejects(client.request('https://brapi.dev/3'),{providerCode:'LOCAL_DAILY_BUDGET'});assert.equal(calls,2);
 time+=86400000;await client.request('https://brapi.dev/3');
 await assert.rejects(client.request('https://brapi.dev/4'),{providerCode:'LOCAL_ROLLING_BUDGET'});assert.equal(calls,3);
});
test('Unsupported ranges are negatively cached; network errors pause all URLs', async t => {
 const dir=await directory(t);let calls=0;
 const client=createBrapiClient({directory:dir,fetchImpl:async()=>{calls++;return response({code:'INVALID_RANGE',message:'Unsupported'},400);}});
 for(let n=0;n<2;n++)await assert.rejects(client.request('https://brapi.dev/range'),{providerCode:'INVALID_RANGE'});
 assert.equal(calls,1);
 const failed=createBrapiClient({directory:dir,fetchImpl:async()=>{calls++;throw Error('offline');}});
 await assert.rejects(failed.request('https://brapi.dev/other'));
 await assert.rejects(failed.request('https://brapi.dev/third'));assert.equal(calls,2);
});
test('Two clients sharing a directory reuse a response and budget under concurrency', async t => {
 const dir=await directory(t);let calls=0;
 const options={directory:dir,fetchImpl:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,30));return response({ok:true});}};
 await Promise.all([createBrapiClient(options).request('https://brapi.dev/same'),createBrapiClient(options).request('https://brapi.dev/same')]);
 assert.equal(calls,1);
});
test('Refresh coalesces callers, preserves old dates on failure, and persists cooldown', async t => {
 const dir=await directory(t);const cache={updatedAt:'2026-09-09T20:00:00Z',relativeStrength:[{score:95}]};let calls=0,time=1000000;
 const options={directory:dir,readCache:async()=>cache,provider:{status:async()=>({})},now:()=>time};
 const control=createRefreshControl(options);const fail=async()=>{calls++;throw Error('upstream down');};
 const values=await Promise.all(Array.from({length:20},()=>control.run('daily',fail)));
 assert.equal(calls,1);assert(values.every(v=>v===cache));
 await createRefreshControl(options).run('daily',fail);assert.equal(calls,1);
 time+=3600001;await control.run('daily',fail);assert.equal(calls,2);
});
test('Different refresh types serialize and a provider block skips all work', async t => {
 const dir=await directory(t);let active=0,max=0;
 const provider={status:async()=>({})},control=createRefreshControl({directory:dir,readCache:async()=>({updatedAt:'old'}),provider});
 const work=async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,20));active--;return {};};
 await Promise.all(['daily','live','classes'].map(key=>control.run(key,work)));assert.equal(max,1);
 provider.status=async()=>({blockedUntil:Date.now()+86400000});
 assert.deepEqual(await control.run('other',()=>{throw Error('must not run');}),{updatedAt:'old'});
});
test('No cache during failure reports failure, never an empty successful dataset', async t => {
 const dir=await directory(t),control=createRefreshControl({directory:dir,readCache:async()=>null,provider:{status:async()=>({})}});
 await assert.rejects(control.run('daily',async()=>{throw Error('unavailable');}),/unavailable/);
 await assert.rejects(control.run('daily',async()=>null),/pausada/);
});
test('429 honors Retry-After; unknown monthly reset is conservative',()=>{
 assert.equal(resetTime({}, {get:()=> '60'},1000),61000);
 assert.equal(resetTime({code:'MONTHLY_LIMIT_EXCEEDED'},null,1000),1000+31*86400000);
});

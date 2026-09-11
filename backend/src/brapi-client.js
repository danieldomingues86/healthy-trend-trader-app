const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}
async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data));
  await fs.rename(temp, file);
}
// Shared by the server and manual refresh process. Never delete a fresh lock.
async function withFileLock(file, work) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const start = Date.now();
  while (true) {
    try { await fs.mkdir(file); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const age = await fs.stat(file).then(s => Date.now() - s.mtimeMs).catch(() => 0);
      if (age > 120000) { await fs.rmdir(file).catch(() => {}); continue; }
      if (Date.now() - start > 30000) throw new Error('Atualização já em andamento em outro processo.');
      await delay(40);
    }
  }
  const heartbeat = setInterval(() => fs.utimes(file, new Date(), new Date()).catch(() => {}), 20000);
  heartbeat.unref();
  try { return await work(); }
  finally { clearInterval(heartbeat); await fs.rmdir(file).catch(() => {}); }
}
function providerError(message, code, retryAt, status = 429) {
  return Object.assign(new Error(message), { providerCode: code, retryAt, status });
}
function resetTime(detail, headers, now) {
  const date = String(detail.message || '').match(/(?:volta|renova|reset)[^\d]*(\d{2})\/(\d{2})\/(\d{4})/i);
  if (date) { const time = Date.parse(`${date[3]}-${date[2]}-${date[1]}T03:00:00Z`); if (time > now) return time; }
  const retry = headers?.get?.('retry-after');
  if (retry) { const time = /^\d+$/.test(retry) ? now + Number(retry) * 1000 : Date.parse(retry); if (time > now) return time; }
  return now + (detail.code === 'MONTHLY_LIMIT_EXCEEDED' ? 31 * 86400000 : 15 * 60000);
}
function createBrapiClient({ directory, fetchImpl = (...args) => fetch(...args), now = Date.now, dailyLimit = 700, rollingLimit = 14000, credential = '' } = {}) {
  const stateFile = path.join(directory, 'provider-state.json'), lock = path.join(directory, 'provider.lock');
  const pending = new Map();
  // Persist only a non-reversible identifier. The API token never leaves env/memory.
  const credentialHash = crypto.createHash('sha256').update(`healthy-trend-brapi:${credential || 'anonymous'}`).digest('hex');
  const initial = () => ({ credentialHash, usage: {}, blockedUntil: 0, code: null });
  const forCredential = state => state?.credentialHash === credentialHash ? state : initial();
  async function status() { return forCredential(await readJson(stateFile, initial())); }
  async function pauseUntil(until, code = 'MONTHLY_LIMIT_EXCEEDED') {
    return withFileLock(lock, async () => { const state = await status(); state.blockedUntil = Math.max(state.blockedUntil || 0, Number(until)); state.code = code; await writeJson(stateFile, state); return state; });
  }
  function request(url, headers = {}, { ttlMs = 20 * 3600000 } = {}) {
    const key = crypto.createHash('sha256').update(String(url)).digest('hex');
    if (pending.has(key)) return pending.get(key);
    const job = withFileLock(lock, async () => {
      const cacheFile = path.join(directory, 'responses', `${key}.json`), cached = await readJson(cacheFile), time = now();
      if (cached && time - cached.savedAt < cached.ttlMs) {
        if (cached.error) throw providerError(cached.error.message, cached.error.code, cached.savedAt + cached.ttlMs, cached.error.status);
        return cached.payload;
      }
      const state = await status();
      if (state.blockedUntil > time) throw providerError('Consultas à brapi pausadas; usando o último cache disponível.', state.code, state.blockedUntil);
      const day = new Date(time).toISOString().slice(0, 10);
      const cutoff = new Date(time - 30 * 86400000).toISOString().slice(0, 10);
      state.usage = Object.fromEntries(Object.entries(state.usage || {}).filter(([date]) => date >= cutoff));
      const total = Object.values(state.usage).reduce((sum, value) => sum + value, 0);
      if ((state.usage[day] || 0) >= dailyLimit || total >= rollingLimit) {
        const daily = (state.usage[day] || 0) >= dailyLimit;
        state.code = daily ? 'LOCAL_DAILY_BUDGET' : 'LOCAL_ROLLING_BUDGET';
        state.blockedUntil = daily ? Date.parse(`${day}T00:00:00Z`) + 86400000 : Date.parse(`${Object.keys(state.usage).sort()[0]}T00:00:00Z`) + 31 * 86400000;
        await writeJson(stateFile, state);
        throw providerError('Limite preventivo local de consultas atingido; cache preservado.', state.code, state.blockedUntil);
      }
      // Reserve before network I/O: crashes and failures also consume the budget.
      state.usage[day] = (state.usage[day] || 0) + 1;
      state.blockedUntil = 0; state.code = null; await writeJson(stateFile, state);
      let response;
      try { response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(15000) }); }
      catch (error) { state.blockedUntil = time + 5 * 60000; state.code = 'NETWORK_BACKOFF'; await writeJson(stateFile, state); throw error; }
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        const message = `HTTP ${response.status}: ${detail.message || 'Falha no provedor de mercado'}`;
        if (response.status === 429 || detail.code === 'MONTHLY_LIMIT_EXCEEDED' || response.status >= 500 || response.status === 401 || response.status === 403) {
          state.blockedUntil = response.status === 429 || detail.code === 'MONTHLY_LIMIT_EXCEEDED' ? resetTime(detail, response.headers, time) : time + 15 * 60000;
          state.code = detail.code || `HTTP_${response.status}`; await writeJson(stateFile, state);
        } else {
          // Cache unsupported range/ticker failures too, avoiding a failed request per refresh.
          await writeJson(cacheFile, { savedAt: time, ttlMs: 24 * 3600000, error: { message, code: detail.code, status: response.status } });
        }
        throw providerError(message, detail.code, state.blockedUntil, response.status);
      }
      const payload = await response.json();
      await writeJson(cacheFile, { savedAt: time, ttlMs, payload });
      return payload;
    }).finally(() => pending.delete(key));
    pending.set(key, job); return job;
  }
  return { request, status, pauseUntil };
}
module.exports = { createBrapiClient, readJson, writeJson, withFileLock, resetTime };

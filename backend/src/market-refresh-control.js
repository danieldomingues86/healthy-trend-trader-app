const path = require('node:path');
const { readJson, writeJson, withFileLock } = require('./brapi-client');
function createRefreshControl({ directory, readCache, provider, now = Date.now }) {
  const stateFile = path.join(directory, 'refresh-state.json');
  const jobs = new Map(); let queue = Promise.resolve();
  function run(key, work, { minInterval = 3600000, fallback = true } = {}) {
    if (jobs.has(key)) return jobs.get(key);
    const job = queue.then(() => withFileLock(path.join(directory, 'refresh.lock'), async () => {
      const state = await readJson(stateFile, {}), time = now(), blocked = await provider.status();
      if (blocked.blockedUntil > time || state[key]?.nextAttemptAt > time) {
        const cached = await readCache();
        if (cached && fallback) return cached;
        throw Object.assign(new Error('Atualização pausada para preservar a cota de dados.'), { status: 503 });
      }
      // Persist the attempt before starting. A restart cannot immediately retry a failed collection.
      state[key] = { attemptedAt: time, nextAttemptAt: time + minInterval };
      await writeJson(stateFile, state);
      try { return await work(); }
      catch (error) {
        const cached = await readCache();
        state[key].error = error.providerCode || 'UPDATE_FAILED';
        state[key].nextAttemptAt = Math.max(state[key].nextAttemptAt, Number(error.retryAt) || 0);
        await writeJson(stateFile, state);
        if (cached && fallback) return cached;
        throw error;
      }
    })).catch(async error => {
      // A lock held by another process (or a state-file error) must not take
      // already-cached market screens offline.
      const cached = await readCache();
      if (cached && fallback) return cached;
      throw error;
    }).finally(() => jobs.delete(key));
    jobs.set(key, job);queue = job.catch(() => {});return job;
  }
  return { run, status: () => readJson(stateFile, {}) };
}
module.exports = { createRefreshControl };

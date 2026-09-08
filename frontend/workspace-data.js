(() => {
  const values = new Map();
  const dirty = new Set();
  let hydrated = false;
  let pending = Promise.resolve();

  function serialize(value) { return typeof value === 'string' ? value : JSON.stringify(value ?? null); }
  function save(key, value) {
    const serialized = serialize(value);
    values.set(key, serialized);
    if (!window.healthyTrendApi?.isAuthenticated()) return Promise.resolve();
    if (!hydrated) { dirty.add(key); return Promise.resolve(); }
    pending = pending.catch(() => {}).then(() => window.healthyTrendApi.request(`/api/workspace-state/${encodeURIComponent(key)}`, {
      method: 'PUT', body: JSON.stringify({ value: serialized })
    }));
    return pending;
  }
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { void save(key, value); },
    removeItem(key) {
      values.delete(key);
      if (window.healthyTrendApi?.isAuthenticated()) void window.healthyTrendApi.request(`/api/workspace-state/${encodeURIComponent(key)}`, { method: 'DELETE' });
    }
  };
  async function hydrate() {
    if (!window.healthyTrendApi?.isAuthenticated()) return {};
    const pendingChanges = new Map([...dirty].map((key) => [key, values.get(key)]));
    const response = await window.healthyTrendApi.request('/api/workspace-state');
    values.clear();
    Object.entries(response.state || {}).forEach(([key, value]) => values.set(key, serialize(value)));
    pendingChanges.forEach((value, key) => values.set(key, value));
    hydrated = true;
    dirty.clear();
    pendingChanges.forEach((value, key) => save(key, value));
    window.dispatchEvent(new CustomEvent('healthyTrend:workspaceLoaded', { detail: { state: response.state || {} } }));
    return response.state || {};
  }
  window.healthyTrendWorkspace = { storage, save, hydrate, ready: () => hydrated, raw: (key) => storage.getItem(key) };
  window.addEventListener('healthyTrend:authenticated', () => { hydrate().catch((error) => console.warn('Não foi possível carregar os dados do workspace.', error)); });
})();

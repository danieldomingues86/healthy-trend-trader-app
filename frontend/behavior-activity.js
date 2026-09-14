(function () {
  'use strict';
  const KEY = 'healthy-trend-behavior-activity-v1';
  let lastPage = '', lastAt = 0;
  const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
  const hourFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23' });
  window.readBehaviorActivity = () => {
    const raw = window.healthyTrendWorkspace?.storage.getItem(KEY);
    if (!raw) return [];
    try {
      const data = JSON.parse(raw);
      return Object.entries(data?.days || {}).map(([date, day]) => ({ date, ...day }));
    } catch (_) { return []; } // Optional telemetry must not hide the journal's valid history.
  };
  function track(page) {
    if (!window.healthyTrendApi?.isAuthenticated?.() || !window.healthyTrendWorkspace?.ready?.()) return;
    const now = new Date();
    if (lastPage === page && now.getTime() - lastAt < 60000) return;
    lastPage = page; lastAt = now.getTime();
    const storage = window.healthyTrendWorkspace.storage;
    let data;
    try { data = JSON.parse(storage.getItem(KEY) || '{"version":1,"days":{}}'); }
    catch (_) { return; } // Never replace corrupt history with an empty record.
    const date = dateFormatter.format(now), hour = Number(hourFormatter.format(now));
    const day = data.days[date] ||= { views: 0, areas: {}, hours: Array(24).fill(0) };
    day.views++; day.areas[page] = (day.areas[page] || 0) + 1; day.hours[hour]++;
    window.healthyTrendWorkspace.save(KEY, data).catch(() => { /* Optional area telemetry does not block the user's navigation. */ });
  }
  const originalGo = window.go;
  window.go = function (id) { originalGo(id); const active = document.querySelector('.page.active'); if (active && active.id === id && !['plan', 'upgrade', 'profile', 'avatar', 'settings'].includes(id)) track(id); };
  window.addEventListener('healthyTrend:workspaceLoaded', () => { lastPage = ''; lastAt = 0; });
}());

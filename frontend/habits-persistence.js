(() => {
  const api = () => window.healthyTrendApi;
  const dateFor = day => habitDayKey(day);
  function apply(remote) {
    habitState = {
      habits: (remote.habits || []).map(item => ({ id: item.id, name: item.name, category: item.category })),
      records: Object.fromEntries((remote.checkins || []).map(item => [`${String(item.checkin_date).slice(0, 10)}:${item.habit_id}`, item.status])),
      ignoredDays: Object.fromEntries((remote.ignoredDays || []).map(item => [String(item.ignored_date).slice(0, 10), true]))
    };
    renderHabitTracker();
  }
  async function hydrate() {
    if (!api()?.isAuthenticated?.()) return;
    saveHabitState = () => {};
    try {
      let remote = await api().request('/api/habits');
      if (!(remote.habits || []).length) remote = await api().request('/api/habits/migrate', { method: 'POST', body: JSON.stringify({ state: habitState }) });
      apply(remote);
    } catch (error) { if (typeof showToast === 'function') showToast(`Não foi possível carregar os hábitos: ${error.message}`); }
  }
  saveHabitState = () => {};
  cycleHabitDay = async (id, day) => {
    if (habitDayIgnored(day)) return;
    const key = habitKey(id, day), previous = habitState.records[key] || '', next = previous === '' ? 'done' : previous === 'done' ? 'skipped' : '';
    if (next) habitState.records[key] = next; else delete habitState.records[key]; renderHabitTracker();
    try {
      const habit = habitState.habits.find(item => item.id === id);
      await api().request(`/api/habits/${encodeURIComponent(id)}/checkins`, { method: 'PUT', body: JSON.stringify({ date: dateFor(day), status: next, name: habit?.name, category: habit?.category }) });
    }
    catch (error) { if (previous) habitState.records[key] = previous; else delete habitState.records[key]; renderHabitTracker(); showToast?.(error.message); }
  };
  addHabit = async event => {
    event.preventDefault(); const input = document.getElementById('habitNewName'), category = document.getElementById('habitNewCategory'), name = input.value.trim(); if (!name) return;
    const draft = { id: `habit-${Date.now()}`, name, category: category.value };
    try { const result = await api().request('/api/habits', { method: 'POST', body: JSON.stringify(draft) }); habitState.habits.push(result.habit); renderHabitTracker(); showToast?.(habitCopy('Hábito adicionado à sua rotina.', 'Habit added to your routine.')); }
    catch (error) { showToast?.(error.message); }
  };
  removeHabit = async id => {
    const habit = habitState.habits.find(item => item.id === id); if (!habit || !window.confirm(habitCopy(`Remover o hábito “${habit.name}”? Os registros dele também serão removidos.`, `Remove the habit “${habit.name}”? Its records will also be removed.`))) return;
    try { await api().request(`/api/habits/${encodeURIComponent(id)}`, { method: 'DELETE' }); habitState.habits = habitState.habits.filter(item => item.id !== id); Object.keys(habitState.records).filter(key => key.endsWith(`:${id}`)).forEach(key => delete habitState.records[key]); renderHabitTracker(); }
    catch (error) { showToast?.(error.message); }
  };
  toggleHabitDayIgnored = async day => {
    const key = habitDayKey(day), ignored = !habitState.ignoredDays[key]; if (ignored) habitState.ignoredDays[key] = true; else delete habitState.ignoredDays[key]; renderHabitTracker();
    try { await api().request('/api/habits/ignored-days', { method: 'PUT', body: JSON.stringify({ date: key, ignored }) }); }
    catch (error) { if (ignored) delete habitState.ignoredDays[key]; else habitState.ignoredDays[key] = true; renderHabitTracker(); showToast?.(error.message); }
  };
  editHabitName = async id => {
    const habit = habitState.habits.find(item => item.id === id); if (!habit) return;
    const name = window.prompt(habitCopy('Edite o nome do hábito:', 'Edit the habit name:'), habit.name)?.trim(); if (!name || name === habit.name) return;
    try { const result = await api().request(`/api/habits/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ name, category: habit.category }) }); Object.assign(habit, result.habit); renderHabitTracker(); }
    catch (error) { showToast?.(error.message); }
  };
  window.addEventListener('healthyTrend:workspaceLoaded', hydrate);
})();

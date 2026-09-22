(function (root) {
  const key = 'healthy-personal-desktop-v1';
  const defaults = { priorities: [], note: '', reminders: [], focus: { title: 'DISCIPLINA', text: 'Qualidade é tudo. Opere somente A.' } };
  let state;
  function load() { if (state) return state; try { state = { ...defaults, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch (_) { state = { ...defaults }; } return state; }
  function save(next) { state = next; try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) {} return state; }
  root.PersonalDesktopState = { get: () => load(), update: (patch) => save({ ...load(), ...patch }), addPriority: (text) => { const s = load(); if (!text || s.priorities.length >= 3) return s; return save({ ...s, priorities: [...s.priorities, { id: crypto.randomUUID(), text, done: false }] }); }, togglePriority: (id) => { const s = load(); return save({ ...s, priorities: s.priorities.map(x => x.id === id ? { ...x, done: !x.done } : x) }); }, removePriority: (id) => { const s = load(); return save({ ...s, priorities: s.priorities.filter(x => x.id !== id) }); }, addReminder: (text) => { const s = load(); if (!text) return s; return save({ ...s, reminders: [...s.reminders, { id: crypto.randomUUID(), text }] }); }, removeReminder: (id) => { const s = load(); return save({ ...s, reminders: s.reminders.filter(x => x.id !== id) }); } };
}(window));

/**
 * Daily Routine Data Model — Healthy Trend Trader V5
 * Gerencia a configuração da rotina, a lista de tarefas diárias com reset por data,
 * e a persistência no localStorage.
 */

(function (window) {
  'use strict';

  const STORAGE_KEYS = {
    ITEMS: 'htt_daily_routine_items',
    LAST_DATE: 'htt_daily_routine_last_date',
    LOG_PREFIX: 'htt_daily_routine_log_',
    HISTORY: 'htt_daily_routine_history'
  };

  const DEFAULT_ITEMS = [
    { id: 'dr_1', icon: '📊', name: 'Ações / Watchlist', active: true },
    { id: 'dr_2', icon: '🐂', name: 'Boi — BGI', active: true },
    { id: 'dr_3', icon: '🌽', name: 'Milho — CCM', active: true },
    { id: 'dr_4', icon: '💼', name: 'Posições abertas', active: true },
    { id: 'dr_5', icon: '🔔', name: 'Alertas de preço', active: true },
    { id: 'dr_6', icon: '📈', name: 'Relative Strength', active: true }
  ];

  function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // --- CONFIGURAÇÃO DA ROTINA ---

  function getRoutineItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar itens da rotina diária:', e);
    }
    // Salva os itens padrão caso não existam
    saveRoutineItems(DEFAULT_ITEMS);
    return DEFAULT_ITEMS;
  }

  function saveRoutineItems(items) {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Erro ao salvar itens da rotina diária:', e);
    }
  }

  function addRoutineItem(name, icon = '📌') {
    const items = getRoutineItems();
    const newItem = {
      id: 'dr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      icon: icon || '📌',
      name: name.trim() || 'Novo Item',
      active: true
    };
    items.push(newItem);
    saveRoutineItems(items);
    return newItem;
  }

  function updateRoutineItem(id, updates) {
    const items = getRoutineItems();
    const index = items.findIndex(item => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      saveRoutineItems(items);
      return items[index];
    }
    return null;
  }

  function deleteRoutineItem(id) {
    let items = getRoutineItems();
    items = items.filter(item => item.id !== id);
    saveRoutineItems(items);
  }

  function moveRoutineItem(id, direction) {
    const items = getRoutineItems();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return items;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < items.length) {
      const temp = items[index];
      items[index] = items[targetIndex];
      items[targetIndex] = temp;
      saveRoutineItems(items);
    }
    return items;
  }

  // --- LOG DIÁRIO & RESET AUTOMÁTICO ---

  function getDailyLog(dateStr = getTodayString()) {
    try {
      const key = STORAGE_KEYS.LOG_PREFIX + dateStr;
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Erro ao obter log diário da rotina:', e);
    }
    return { date: dateStr, completions: {}, updatedAt: null };
  }

  function saveDailyLog(log) {
    try {
      const key = STORAGE_KEYS.LOG_PREFIX + log.date;
      localStorage.setItem(key, JSON.stringify(log));
      
      // Atualiza o registro de última data
      localStorage.setItem(STORAGE_KEYS.LAST_DATE, log.date);

      // Atualiza resumo no histórico
      updateHistorySnapshot(log);
    } catch (e) {
      console.error('Erro ao salvar log diário da rotina:', e);
    }
  }

  function updateHistorySnapshot(log) {
    try {
      const activeItems = getRoutineItems().filter(i => i.active);
      const total = activeItems.length;
      let completedCount = 0;

      activeItems.forEach(item => {
        if (log.completions && log.completions[item.id] && log.completions[item.id].completed) {
          completedCount++;
        }
      });

      const historyRaw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      let history = historyRaw ? JSON.parse(historyRaw) : [];

      const index = history.findIndex(h => h.date === log.date);
      const snapshot = {
        date: log.date,
        totalItems: total,
        completedItems: completedCount,
        percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0,
        isFullyCompleted: total > 0 && completedCount === total,
        updatedAt: log.updatedAt || new Date().toISOString()
      };

      if (index !== -1) {
        history[index] = snapshot;
      } else {
        history.push(snapshot);
      }

      // Manter apenas últimos 90 dias no histórico
      if (history.length > 90) {
        history = history.slice(-90);
      }

      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('Erro ao atualizar histórico da rotina:', e);
    }
  }

  /**
   * Verifica transição de dia e realiza o reset automático se necessário.
   */
  function checkAndPerformDailyReset() {
    const today = getTodayString();
    const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE);

    if (lastDate && lastDate !== today) {
      // É um novo dia! Garantir que o log de hoje existe em branco
      const todayLog = getDailyLog(today);
      if (!todayLog.updatedAt) {
        saveDailyLog({ date: today, completions: {}, updatedAt: new Date().toISOString() });
      }
    }
    localStorage.setItem(STORAGE_KEYS.LAST_DATE, today);
  }

  /**
   * Alterna a conclusão de um item da rotina para a data de hoje ("VI -> MARQUEI")
   */
  function toggleItemCompletion(itemId) {
    checkAndPerformDailyReset();
    const today = getTodayString();
    const log = getDailyLog(today);

    if (!log.completions) {
      log.completions = {};
    }

    const current = log.completions[itemId] || { completed: false, completedAt: null };
    const newStatus = !current.completed;

    log.completions[itemId] = {
      completed: newStatus,
      completedAt: newStatus ? getTimeString() : null
    };

    log.updatedAt = new Date().toISOString();
    saveDailyLog(log);
    return log.completions[itemId];
  }

  /**
   * Obtém o estado completo consolidado da rotina de hoje
   */
  function getTodayRoutineState() {
    checkAndPerformDailyReset();
    const today = getTodayString();
    const allItems = getRoutineItems();
    const activeItems = allItems.filter(item => item.active);
    const log = getDailyLog(today);

    let completedCount = 0;
    const itemsWithStatus = activeItems.map(item => {
      const status = (log.completions && log.completions[item.id]) || { completed: false, completedAt: null };
      if (status.completed) completedCount++;
      return {
        ...item,
        completed: status.completed,
        completedAt: status.completedAt
      };
    });

    const totalCount = activeItems.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      date: today,
      items: itemsWithStatus,
      allItems: allItems,
      totalCount: totalCount,
      completedCount: completedCount,
      percentage: percentage,
      isFullyCompleted: totalCount > 0 && completedCount === totalCount
    };
  }

  function getHistoryStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
      const history = raw ? JSON.parse(raw) : [];
      const totalDays = history.length;
      const completedDays = history.filter(h => h.isFullyCompleted).length;

      let streak = 0;
      const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
      for (const day of sorted) {
        if (day.isFullyCompleted) {
          streak++;
        } else {
          break;
        }
      }

      return {
        totalDays,
        completedDays,
        consistencyRate: totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0,
        streak
      };
    } catch (e) {
      return { totalDays: 0, completedDays: 0, consistencyRate: 0, streak: 0 };
    }
  }

  // Exportação global
  window.DailyRoutineModel = {
    getTodayString,
    getRoutineItems,
    saveRoutineItems,
    addRoutineItem,
    updateRoutineItem,
    deleteRoutineItem,
    moveRoutineItem,
    getDailyLog,
    toggleItemCompletion,
    getTodayRoutineState,
    getHistoryStats,
    checkAndPerformDailyReset,
    DEFAULT_ITEMS
  };

})(window);

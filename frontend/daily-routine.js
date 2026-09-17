/**
 * Daily Routine Component & Controller — Healthy Trend Trader V5
 * Controla a renderização da Rotina Diária no Dashboard e a área de configurações.
 */

(function (window) {
  'use strict';

  function renderDailyRoutineCard() {
    let container = document.getElementById('dailyRoutineCardContainer');
    if (!container) {
      const todayPage = document.getElementById('today');
      if (!todayPage) return;
      container = document.createElement('div');
      container.id = 'dailyRoutineCardContainer';
      const mainCockpit = todayPage.querySelector('.today-cockpit') || todayPage.firstElementChild;
      if (mainCockpit) {
        todayPage.insertBefore(container, mainCockpit);
      } else {
        todayPage.prepend(container);
      }
    }

    const state = window.DailyRoutineModel.getTodayRoutineState();
    const remainingCount = state.totalCount - state.completedCount;

    let badgeMarkup = '';
    if (state.isFullyCompleted) {
      badgeMarkup = `
        <div class="dr-badge-success">
          ✓ ROTINA CONCLUÍDA — ${state.completedCount} de ${state.totalCount} revisados hoje
        </div>
      `;
    } else {
      badgeMarkup = `
        <div class="dr-badge-pending">
          ⚠ Rotina pendente — ${remainingCount} ${remainingCount === 1 ? 'item ainda precisa' : 'itens ainda precisam'} ser ${remainingCount === 1 ? 'revisado' : 'revisados'}
        </div>
      `;
    }

    const itemsMarkup = state.items.map(item => `
      <div class="dr-item ${item.completed ? 'checked' : ''}" onclick="window.DailyRoutineController.handleToggleItem('${item.id}')" role="button" tabindex="0">
        <div class="dr-item-left">
          <div class="dr-checkbox">${item.completed ? '✓' : ''}</div>
          <div class="dr-item-icon">${item.icon || '📌'}</div>
          <div class="dr-item-name">${item.name}</div>
        </div>
        <div class="dr-item-right">
          <div class="dr-item-time">${item.completedAt ? item.completedAt : '—'}</div>
          <div class="dr-item-arrow">›</div>
        </div>
      </div>
    `).join('');

    const html = `
      <div class="dr-card ${state.isFullyCompleted ? 'compact' : ''}">
        ${badgeMarkup}
        
        <div class="dr-header">
          <div class="dr-header-title">
            <div class="dr-header-icon">📋</div>
            <div class="dr-header-text">
              <h3>Rotina Diária</h3>
              <p>Seu processo antes da oportunidade.</p>
            </div>
          </div>
          <button class="dr-btn-config" onclick="window.DailyRoutineController.goToSettings()">
            ⚙ Configurar rotina
          </button>
        </div>

        <div class="dr-hero-banner">
          <div class="dr-hero-content">
            <h2 class="dr-hero-title">
              Oportunidades não avisam quando vão aparecer.
              <span class="dr-hero-highlight">Sua rotina garante que você esteja olhando.</span>
            </h2>
            <p class="dr-hero-subtitle">
              Uma boa rotina evita que grandes oportunidades passem despercebidas.
            </p>
          </div>
        </div>

        <div class="dr-progress-bar-container">
          <div class="dr-progress-info">
            <div>${state.completedCount} de ${state.totalCount} concluídos</div>
            <span>${state.percentage}%</span>
          </div>
          <div class="dr-progress-track">
            <div class="dr-progress-fill" style="width: ${state.percentage}%;"></div>
          </div>
        </div>

        <div class="dr-checklist">
          ${itemsMarkup.length > 0 ? itemsMarkup : '<p style="color:#799986;font-size:12px;">Nenhum item ativo na rotina. Configure seus itens em Configurações.</p>'}
        </div>

        <div class="dr-footer">
          <div class="dr-footer-tip">
            <span class="dr-footer-tip-icon">🎯</span>
            <span>Olhe todo o seu universo. O mercado recompensa quem está atento.</span>
          </div>
          <button class="dr-btn-status ${state.isFullyCompleted ? 'completed' : 'pending'}">
            ${state.isFullyCompleted ? '✓ Rotina Concluída' : '🔒 Conclua todos os itens'}
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function renderDailyRoutineSettings() {
    const container = document.getElementById('drSettingsSection');
    if (!container) return;

    const items = window.DailyRoutineModel.getRoutineItems();

    const itemsListMarkup = items.map((item, index) => `
      <div class="dr-settings-item">
        <div style="font-size:16px;">${item.icon || '📌'}</div>
        <input type="text" value="${item.name.replace(/"/g, '&quot;')}" onchange="window.DailyRoutineController.handleUpdateItemName('${item.id}', this.value)" />
        <div class="dr-settings-actions">
          <button class="dr-btn-icon" onclick="window.DailyRoutineController.handleMoveItem('${item.id}', 'up')" ${index === 0 ? 'disabled style="opacity:0.3;"' : ''} title="Mover para cima">▲</button>
          <button class="dr-btn-icon" onclick="window.DailyRoutineController.handleMoveItem('${item.id}', 'down')" ${index === items.length - 1 ? 'disabled style="opacity:0.3;"' : ''} title="Mover para baixo">▼</button>
          <button class="dr-btn-icon danger" onclick="window.DailyRoutineController.handleDeleteItem('${item.id}')" title="Excluir item">🗑</button>
        </div>
      </div>
    `).join('');

    const html = `
      <div class="card dr-settings-panel">
        <div class="card-head" style="margin-bottom:14px;">
          <div>
            <h3 style="margin:0 0 4px;font-size:16px;color:var(--ink,#fff);font-weight:700;">Minha Rotina Diária</h3>
            <span style="font-size:12px;color:var(--muted,#9cbca8);line-height:1.4;">
              Configure os mercados, ativos e verificações que você precisa olhar todos os dias antes de operar.
            </span>
          </div>
        </div>

        <div class="dr-settings-list">
          ${itemsListMarkup}
        </div>

        <div class="dr-add-form">
          <input type="text" id="drNewItemName" placeholder="Ex: Dólar — WDO, Bitcoin, Calendário..." />
          <button type="button" onclick="window.DailyRoutineController.handleAddItem()">+ Adicionar Item</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // --- CONTROLLER ACTIONS ---

  function handleToggleItem(itemId) {
    window.DailyRoutineModel.toggleItemCompletion(itemId);
    renderDailyRoutineCard();
  }

  function goToSettings() {
    if (typeof window.go === 'function') {
      window.go('settings');
      setTimeout(() => {
        const el = document.getElementById('drSettingsSection');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }

  function handleAddItem() {
    const input = document.getElementById('drNewItemName');
    if (!input || !input.value.trim()) return;
    window.DailyRoutineModel.addRoutineItem(input.value.trim());
    input.value = '';
    renderDailyRoutineSettings();
    renderDailyRoutineCard();
  }

  function handleUpdateItemName(id, newName) {
    if (!newName.trim()) return;
    window.DailyRoutineModel.updateRoutineItem(id, { name: newName.trim() });
    renderDailyRoutineSettings();
    renderDailyRoutineCard();
  }

  function handleDeleteItem(id) {
    if (confirm('Deseja realmente remover este item da sua rotina?')) {
      window.DailyRoutineModel.deleteRoutineItem(id);
      renderDailyRoutineSettings();
      renderDailyRoutineCard();
    }
  }

  function handleMoveItem(id, direction) {
    window.DailyRoutineModel.moveRoutineItem(id, direction);
    renderDailyRoutineSettings();
    renderDailyRoutineCard();
  }

  // Intercepta e expande a navegação global
  function init() {
    renderDailyRoutineCard();
    renderDailyRoutineSettings();

    // Hook na navegação para atualizar quando o usuário acessar 'today' ou 'settings'
    const originalGo = window.go;
    if (typeof originalGo === 'function') {
      window.go = function (id) {
        originalGo(id);
        if (id === 'today' || id === 'dashboard' || id === 'dailyroutine') {
          renderDailyRoutineCard();
        }
        if (id === 'settings') {
          renderDailyRoutineSettings();
        }
      };
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  window.DailyRoutineController = {
    renderDailyRoutineCard,
    renderDailyRoutineSettings,
    handleToggleItem,
    goToSettings,
    handleAddItem,
    handleUpdateItemName,
    handleDeleteItem,
    handleMoveItem,
    init
  };

})(window);

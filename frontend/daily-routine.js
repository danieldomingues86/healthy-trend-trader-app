/**
 * Daily Routine Controller & Component V2 — Healthy Trend Trader
 * Clean SaaS Dashboard + Premium Trading Platform
 * 100% dinâmico, biblioteca de ícones SVG com tons pastel, seletor de data,
 * cards em 2 colunas e modal inteligente de criação/edição.
 */

(function (window) {
  'use strict';

  let currentDate = window.DailyRoutineModel.getTodayString();
  let editingItemId = null;
  let isModalOpen = false;
  let modalSelectedCategory = 'trading';
  let modalSelectedIcon = 'chart-line';
  let modalUserModifiedIcon = false;
  let isIconPickerExpanded = false;

  const esc = (text) => {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
  };

  function motivationalFeedback(pct) {
    if (pct === 0) return 'Inicie seu ritual. O dia começa com disciplina.';
    if (pct < 40) return 'Bom começo! Siga seu processo passo a passo.';
    if (pct < 80) return 'Excelente! Mantenha o foco e a consistência.';
    if (pct < 100) return 'Quase lá! Finalize seus rituais para estar 100% pronto.';
    return 'Rotina concluída! Trader blindado e preparado para o mercado.';
  }

  function formatDisplayDate(dateStr) {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day, 12, 0, 0);

        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        const weekday = weekdays[d.getDay()];
        const monthName = months[d.getMonth()];
        const todayStr = window.DailyRoutineModel.getTodayString();

        const base = `${weekday}, ${day} de ${monthName} de ${year}`;
        if (dateStr === todayStr) {
          return `${base}`;
        }
        return base;
      }
    } catch (e) {
      console.warn('Erro ao formatar data:', e);
    }
    return dateStr;
  }

  function shiftDate(dateStr, offsetDays) {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
      d.setDate(d.getDate() + offsetDays);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return dateStr;
    }
  }

  // --- RENDERIZAÇÃO DA TELA PRINCIPAL ---

  function renderDailyRoutineCard() {
    let container = document.getElementById('dailyRoutineCardContainer');
    if (!container) {
      const routinePage = document.getElementById('dailyroutine');
      if (!routinePage) return;
      container = document.createElement('div');
      container.id = 'dailyRoutineCardContainer';
      routinePage.appendChild(container);
    }

    const state = window.DailyRoutineModel.getRoutineStateForDate(currentDate);
    const todayStr = window.DailyRoutineModel.getTodayString();
    const isToday = currentDate === todayStr;

    // Header HTML
    const headerMarkup = `
      <header class="dr-v2-header">
        <div class="dr-v2-header-left">
          <div class="dr-v2-header-badge" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div class="dr-v2-header-title">
            <h1>Rotina Diária</h1>
            <p>Disciplina hoje, resultados amanhã. Siga sua rotina.</p>
          </div>
        </div>

        <div class="dr-v2-header-right">
          <!-- Seletor de Data -->
          <div class="dr-v2-date-selector">
            <button type="button" class="dr-v2-date-arrow" data-dr-prev-day title="Dia anterior" aria-label="Dia anterior">‹</button>
            <div class="dr-v2-date-display" data-dr-pick-date title="Clique para escolher data">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>${esc(formatDisplayDate(currentDate))}</span>
              <input type="date" id="drHiddenDateInput" value="${currentDate}" />
            </div>
            <button type="button" class="dr-v2-date-arrow" data-dr-next-day title="Próximo dia" aria-label="Próximo dia">›</button>
            ${!isToday ? `<button type="button" class="dr-v2-btn-today" data-dr-today>Hoje</button>` : ''}
          </div>

          <!-- Card de Progresso -->
          <div class="dr-v2-progress-box">
            <div class="dr-v2-progress-icon" aria-hidden="true">
              ${state.percentage === 100 ? '🏆' : '☀️'}
            </div>
            <div class="dr-v2-progress-meta">
              <span class="dr-v2-progress-counts"><b>${state.completedCount} de ${state.totalCount} concluídas</b></span>
              <small class="dr-v2-progress-hint">${motivationalFeedback(state.percentage)}</small>
            </div>
            <div class="dr-v2-progress-value">${state.percentage}%</div>
          </div>
        </div>
      </header>

      <!-- Barra de Progresso Verde -->
      <div class="dr-v2-progress-track">
        <div class="dr-v2-progress-fill" style="width: ${state.percentage}%;"></div>
      </div>
    `;

    // Barra de Ferramentas / Ações
    const toolbarMarkup = `
      <div class="dr-v2-toolbar">
        <div class="dr-v2-toolbar-left">
          <span class="dr-v2-tag">Rituais ativos: <b>${state.totalCount}</b></span>
          <span class="dr-v2-tag success">Concluídos: <b>${state.completedCount}</b></span>
        </div>
        <div class="dr-v2-toolbar-right">
          <button type="button" class="dr-v2-btn-secondary" data-dr-reset-btn title="Restaurar os 8 rituais recomendados">
            ↺ Restaurar 8 passos
          </button>
          <button type="button" class="dr-v2-btn-primary" data-dr-add-btn>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Adicionar rotina
          </button>
        </div>
      </div>
    `;

    // Grid de Cards da Rotina (2 colunas)
    let cardsMarkup = '';
    if (state.items.length === 0) {
      cardsMarkup = `
        <div class="dr-v2-empty-state">
          <div class="dr-v2-empty-icon">📋</div>
          <h3>Nenhuma rotina configurada</h3>
          <p>Crie rotinas personalizadas ou restaure os 8 passos recomendados para guiar seu dia com disciplina.</p>
          <button type="button" class="dr-v2-btn-primary" data-dr-reset-btn>Restaurar 8 passos recomendados</button>
        </div>
      `;
    } else {
      const itemsList = state.items.map((item, index) => {
        const iconBadge = window.DailyRoutineIcons?.renderBadge
          ? window.DailyRoutineIcons.renderBadge(item.icon, item.category, 42)
          : '<span class="dr-icon-badge">📌</span>';

        return `
          <article class="dr-v2-card ${item.completed ? 'is-completed' : ''}" data-item-id="${item.id}">
            <!-- Checkbox Customizado -->
            <button type="button" class="dr-v2-checkbox ${item.completed ? 'is-checked' : ''}" data-dr-toggle="${item.id}" aria-label="Marcar ${esc(item.name)} como concluído">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>

            <!-- Ícone SVG com fundo pastel -->
            <div class="dr-v2-card-icon" data-dr-edit="${item.id}">
              ${iconBadge}
            </div>

            <!-- Textos do Card -->
            <div class="dr-v2-card-content" data-dr-edit="${item.id}">
              <h3 class="dr-v2-card-title">${index + 1}. ${esc(item.name)}</h3>
              <p class="dr-v2-card-desc">${esc(item.description)}</p>
            </div>

            <!-- Metadados à direita -->
            <div class="dr-v2-card-meta">
              <span class="dr-v2-card-time" title="Tempo estimado">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                ${esc(item.time || '10 min')}
              </span>
              <button type="button" class="dr-v2-card-arrow" data-dr-edit="${item.id}" title="Editar rotina" aria-label="Editar rotina">
                ›
              </button>
            </div>
          </article>
        `;
      }).join('');

      cardsMarkup = `<div class="dr-v2-grid">${itemsList}</div>`;
    }

    // Rodapé com citação e status
    const footerMarkup = `
      <footer class="dr-v2-footer">
        <div class="dr-v2-quote-card">
          <span class="dr-v2-trophy">🏆</span>
          <div class="dr-v2-quote-text">
            <b>"Disciplina é a ponte entre seus objetivos e seus resultados."</b>
            <span>The Healthy Trend Trader</span>
          </div>
        </div>

        <div class="dr-v2-status-pill">
          <span class="dr-v2-status-dot">▲</span>
          <span>Rotina realizada = Trader mais forte</span>
        </div>
      </footer>
    `;

    // Modal de Criação / Edição
    const modalMarkup = renderModalMarkup();

    container.innerHTML = `
      <div class="dr-v2-container">
        ${headerMarkup}
        ${toolbarMarkup}
        ${cardsMarkup}
        ${footerMarkup}
      </div>
      ${modalMarkup}
    `;

    bindEvents(container);
  }

  // --- RENDERIZAÇÃO DO MODAL ---

  function renderModalMarkup() {
    if (!isModalOpen) return '';

    const isEdit = Boolean(editingItemId);
    const title = isEdit ? 'Editar Rotina Diária' : 'Nova Rotina Diária';
    const subtitle = isEdit
      ? 'Atualize o título, descrição, categoria ou tempo desta rotina.'
      : 'Crie uma nova rotina com ícone contextual e tempo estimado.';

    const categories = window.DailyRoutineIcons?.CATEGORIES || {};
    const categoryTabs = Object.values(categories).map(cat => {
      const active = cat.id === modalSelectedCategory;
      return `
        <button type="button" class="dr-modal-cat-tab ${active ? 'active' : ''}" data-dr-cat="${cat.id}">
          <span style="background:${cat.color};"></span>
          ${esc(cat.label)}
        </button>
      `;
    }).join('');

    // Ícone atual
    const currentBadge = window.DailyRoutineIcons?.renderBadge
      ? window.DailyRoutineIcons.renderBadge(modalSelectedIcon, modalSelectedCategory, 52)
      : '📌';

    // Lista de ícones da categoria selecionada
    const allIcons = window.DailyRoutineIcons?.ICONS || {};
    const categoryIcons = Object.entries(allIcons).filter(([key, val]) => val.category === modalSelectedCategory);

    const iconsGrid = categoryIcons.map(([key, val]) => {
      const isSelected = key === modalSelectedIcon;
      const cat = categories[modalSelectedCategory] || categories.trading;
      return `
        <button type="button" class="dr-modal-icon-choice ${isSelected ? 'selected' : ''}" data-dr-icon-pick="${key}" title="${esc(val.label)}" style="background:${isSelected ? cat.bg : '#fff'}; border-color:${isSelected ? cat.color : '#e2e8f0'};">
          ${window.DailyRoutineIcons.renderSvg(key, 22, isSelected ? cat.color : '#475569')}
        </button>
      `;
    }).join('');

    return `
      <div class="dr-modal-backdrop" data-dr-modal-close-backdrop>
        <div class="dr-modal-box" role="dialog" aria-modal="true" aria-labelledby="drModalHeading">
          <header class="dr-modal-header">
            <div>
              <h2 id="drModalHeading">${title}</h2>
              <p>${subtitle}</p>
            </div>
            <button type="button" class="dr-modal-close-btn" data-dr-modal-close aria-label="Fechar">×</button>
          </header>

          <form class="dr-modal-form" id="drRoutineForm" onsubmit="event.preventDefault();">
            <!-- Nome da Rotina -->
            <div class="dr-form-group">
              <label for="drInputName">Nome da rotina *</label>
              <input type="text" id="drInputName" placeholder="Ex: Caminhar 30 minutos, Revisar watchlist..." maxlength="80" required autocomplete="off" />
              <small class="dr-form-hint">O sistema sugere a categoria e o ícone automaticamente conforme você digita.</small>
            </div>

            <!-- Descrição Curta -->
            <div class="dr-form-group">
              <label for="drInputDesc">Descrição curta</label>
              <input type="text" id="drInputDesc" placeholder="Ex: Atividade física leve ao ar livre antes do pregão" maxlength="140" autocomplete="off" />
            </div>

            <!-- Categoria e Ícone -->
            <div class="dr-form-group">
              <label>Categoria & Identidade Visual</label>
              <div class="dr-modal-cat-row">
                ${categoryTabs}
              </div>
            </div>

            <div class="dr-form-group">
              <div class="dr-icon-selection-card">
                <div class="dr-icon-preview-side">
                  <div class="dr-icon-preview-wrap">
                    ${currentBadge}
                  </div>
                  <div>
                    <b>Ícone selecionado</b>
                    <small>Mude de categoria acima para ver outros ícones</small>
                  </div>
                </div>

                <div class="dr-icon-picker-grid">
                  ${iconsGrid}
                </div>
              </div>
            </div>

            <!-- Tempo Estimado -->
            <div class="dr-form-group">
              <label for="drInputTime">Tempo estimado</label>
              <div class="dr-time-pills">
                ${['5 min', '10 min', '15 min', '20 min', '30 min', '45 min', 'Durante o dia'].map(t => `
                  <button type="button" class="dr-time-pill" data-dr-time="${t}">${t}</button>
                `).join('')}
              </div>
              <input type="text" id="drInputTime" placeholder="Ou digite: Ex: 1 hora" style="margin-top:8px;" maxlength="30" />
            </div>

            <footer class="dr-modal-footer">
              ${isEdit ? `<button type="button" class="dr-btn-danger" data-dr-delete-btn>Excluir rotina</button>` : '<div></div>'}
              <div class="dr-modal-actions-right">
                <button type="button" class="dr-v2-btn-secondary" data-dr-modal-close>Cancelar</button>
                <button type="submit" class="dr-v2-btn-primary" data-dr-save-btn>Salvar rotina</button>
              </div>
            </footer>
          </form>
        </div>
      </div>
    `;
  }

  // --- EVENT BINDING ---

  function bindEvents(root) {
    // 1. Checkbox toggle
    root.querySelectorAll('[data-dr-toggle]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemId = btn.dataset.drToggle;
        handleToggleItem(itemId);
      });
    });

    // 2. Data Navigation
    root.querySelector('[data-dr-prev-day]')?.addEventListener('click', () => {
      currentDate = shiftDate(currentDate, -1);
      renderDailyRoutineCard();
    });

    root.querySelector('[data-dr-next-day]')?.addEventListener('click', () => {
      currentDate = shiftDate(currentDate, 1);
      renderDailyRoutineCard();
    });

    root.querySelector('[data-dr-today]')?.addEventListener('click', () => {
      currentDate = window.DailyRoutineModel.getTodayString();
      renderDailyRoutineCard();
    });

    const hiddenDateInput = root.querySelector('#drHiddenDateInput');
    root.querySelector('[data-dr-pick-date]')?.addEventListener('click', () => {
      if (hiddenDateInput && typeof hiddenDateInput.showPicker === 'function') {
        hiddenDateInput.showPicker();
      } else if (hiddenDateInput) {
        hiddenDateInput.style.display = 'inline-block';
        hiddenDateInput.focus();
      }
    });

    hiddenDateInput?.addEventListener('change', (e) => {
      if (e.target.value) {
        currentDate = e.target.value;
        renderDailyRoutineCard();
      }
    });

    // 3. Botão + Adicionar rotina
    root.querySelector('[data-dr-add-btn]')?.addEventListener('click', () => {
      openModal(null);
    });

    // 4. Botão Restaurar 8 passos
    root.querySelectorAll('[data-dr-reset-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Deseja restaurar os 8 rituais oficiais recomendados do Healthy Trend Trader? Seus registros diários não serão apagados.')) {
          window.DailyRoutineModel.resetToDefaultItems();
          renderDailyRoutineCard();
          if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
            window.dispatchEvent(new CustomEvent('healthyTrend:routineUpdated'));
          }
        }
      });
    });

    // 5. Clique para editar rotina
    root.querySelectorAll('[data-dr-edit]').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = el.dataset.drEdit;
        openModal(itemId);
      });
    });

    // 6. Modal Events
    bindModalEvents(root);
  }

  function bindModalEvents(root) {
    if (!isModalOpen) return;

    // Fechar modal
    root.querySelector('[data-dr-modal-close]')?.addEventListener('click', closeModal);
    root.querySelector('[data-dr-modal-close-backdrop]')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    // Inputs
    const nameInput = root.querySelector('#drInputName');
    const descInput = root.querySelector('#drInputDesc');
    const timeInput = root.querySelector('#drInputTime');

    // Auto-sugestão enquanto digita
    nameInput?.addEventListener('input', (e) => {
      if (!editingItemId && !modalUserModifiedIcon) {
        const val = e.target.value;
        const suggestion = window.DailyRoutineIcons?.suggestCategoryAndIcon
          ? window.DailyRoutineIcons.suggestCategoryAndIcon(val)
          : null;

        if (suggestion && (suggestion.category !== modalSelectedCategory || suggestion.icon !== modalSelectedIcon)) {
          modalSelectedCategory = suggestion.category;
          modalSelectedIcon = suggestion.icon;
          refreshModalVisuals(root);
        }
      }
    });

    // Abas de Categoria
    root.querySelectorAll('[data-dr-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        modalSelectedCategory = btn.dataset.drCat;
        modalUserModifiedIcon = true;
        // Seleciona o primeiro ícone da categoria
        const allIcons = window.DailyRoutineIcons?.ICONS || {};
        const first = Object.keys(allIcons).find(k => allIcons[k].category === modalSelectedCategory);
        if (first) modalSelectedIcon = first;
        refreshModalVisuals(root);
      });
    });

    // Seleção de Ícone
    root.querySelectorAll('[data-dr-icon-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        modalSelectedIcon = btn.dataset.drIconPick;
        modalUserModifiedIcon = true;
        refreshModalVisuals(root);
      });
    });

    // Pílulas de Tempo
    root.querySelectorAll('[data-dr-time]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (timeInput) timeInput.value = btn.dataset.drTime;
        root.querySelectorAll('[data-dr-time]').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    // Salvar
    root.querySelector('#drRoutineForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) return;

      const desc = descInput ? descInput.value.trim() : '';
      const time = timeInput && timeInput.value.trim() ? timeInput.value.trim() : '10 min';

      if (editingItemId) {
        window.DailyRoutineModel.updateRoutineItem(editingItemId, {
          name,
          description: desc || 'Siga o processo e execute com foco.',
          category: modalSelectedCategory,
          icon: modalSelectedIcon,
          time
        });
      } else {
        window.DailyRoutineModel.addRoutineItem({
          name,
          description: desc || 'Siga o processo e execute com foco.',
          category: modalSelectedCategory,
          icon: modalSelectedIcon,
          time
        });
      }

      closeModal();
      renderDailyRoutineCard();
      if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('healthyTrend:routineUpdated'));
      }
    });

    // Excluir
    root.querySelector('[data-dr-delete-btn]')?.addEventListener('click', () => {
      if (editingItemId && confirm('Tem certeza que deseja excluir esta rotina?')) {
        window.DailyRoutineModel.deleteRoutineItem(editingItemId);
        closeModal();
        renderDailyRoutineCard();
        if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
          window.dispatchEvent(new CustomEvent('healthyTrend:routineUpdated'));
        }
      }
    });

    // Preenche campos se estiver editando
    if (editingItemId) {
      const items = window.DailyRoutineModel.getRoutineItems();
      const current = items.find(i => i.id === editingItemId);
      if (current) {
        if (nameInput) nameInput.value = current.name || '';
        if (descInput) descInput.value = current.description || '';
        if (timeInput) timeInput.value = current.time || '10 min';
        // Destaca pílula de tempo correspondente
        root.querySelectorAll('[data-dr-time]').forEach(b => {
          b.classList.toggle('active', b.dataset.drTime === current.time);
        });
      }
    } else {
      if (nameInput) setTimeout(() => nameInput.focus(), 80);
    }
  }

  function refreshModalVisuals(root) {
    const modalBackdrop = root.querySelector('.dr-modal-backdrop');
    if (!modalBackdrop) return;

    // Atualiza Abas de categoria
    modalBackdrop.querySelectorAll('[data-dr-cat]').forEach(b => {
      b.classList.toggle('active', b.dataset.drCat === modalSelectedCategory);
    });

    // Atualiza Preview do Ícone
    const previewWrap = modalBackdrop.querySelector('.dr-icon-preview-wrap');
    if (previewWrap) {
      previewWrap.innerHTML = window.DailyRoutineIcons?.renderBadge
        ? window.DailyRoutineIcons.renderBadge(modalSelectedIcon, modalSelectedCategory, 52)
        : '📌';
    }

    // Atualiza Grid de Ícones da categoria selecionada
    const pickerGrid = modalBackdrop.querySelector('.dr-icon-picker-grid');
    if (pickerGrid) {
      const allIcons = window.DailyRoutineIcons?.ICONS || {};
      const categories = window.DailyRoutineIcons?.CATEGORIES || {};
      const cat = categories[modalSelectedCategory] || categories.trading;
      const categoryIcons = Object.entries(allIcons).filter(([key, val]) => val.category === modalSelectedCategory);

      pickerGrid.innerHTML = categoryIcons.map(([key, val]) => {
        const isSelected = key === modalSelectedIcon;
        return `
          <button type="button" class="dr-modal-icon-choice ${isSelected ? 'selected' : ''}" data-dr-icon-pick="${key}" title="${esc(val.label)}" style="background:${isSelected ? cat.bg : '#fff'}; border-color:${isSelected ? cat.color : '#e2e8f0'};">
            ${window.DailyRoutineIcons.renderSvg(key, 22, isSelected ? cat.color : '#475569')}
          </button>
        `;
      }).join('');

      pickerGrid.querySelectorAll('[data-dr-icon-pick]').forEach(btn => {
        btn.addEventListener('click', () => {
          modalSelectedIcon = btn.dataset.drIconPick;
          modalUserModifiedIcon = true;
          refreshModalVisuals(root);
        });
      });
    }
  }

  function openModal(itemId) {
    editingItemId = itemId;
    isModalOpen = true;
    modalUserModifiedIcon = false;

    if (itemId) {
      const items = window.DailyRoutineModel.getRoutineItems();
      const current = items.find(i => i.id === itemId);
      if (current) {
        modalSelectedCategory = current.category || 'trading';
        modalSelectedIcon = current.icon || 'chart-line';
      }
    } else {
      modalSelectedCategory = 'trading';
      modalSelectedIcon = 'chart-line';
    }

    renderDailyRoutineCard();
  }

  function closeModal() {
    isModalOpen = false;
    editingItemId = null;
    renderDailyRoutineCard();
  }

  // --- AÇÕES DO CONTROLLER ---

  function handleToggleItem(itemId) {
    window.DailyRoutineModel.toggleItemCompletion(itemId, currentDate);
    renderDailyRoutineCard();
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('healthyTrend:routineUpdated'));
    }
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

  function renderDailyRoutineSettings() {
    // Compatibilidade com tela de configurações gerais
    const container = document.getElementById('drSettingsSection');
    if (!container) return;

    const items = window.DailyRoutineModel.getRoutineItems();

    const itemsListMarkup = items.map((item, index) => {
      const iconSvg = window.DailyRoutineIcons?.renderSvg
        ? window.DailyRoutineIcons.renderSvg(item.icon, 18)
        : '📌';

      return `
        <div class="dr-settings-item">
          <div style="display:flex;align-items:center;justify-content:center;width:28px;">${iconSvg}</div>
          <input type="text" value="${item.name.replace(/"/g, '&quot;')}" onchange="window.DailyRoutineController.handleUpdateItemName('${item.id}', this.value)" />
          <div class="dr-settings-actions">
            <button class="dr-btn-icon" onclick="window.DailyRoutineController.handleMoveItem('${item.id}', 'up')" ${index === 0 ? 'disabled style="opacity:0.3;"' : ''} title="Mover para cima">▲</button>
            <button class="dr-btn-icon" onclick="window.DailyRoutineController.handleMoveItem('${item.id}', 'down')" ${index === items.length - 1 ? 'disabled style="opacity:0.3;"' : ''} title="Mover para baixo">▼</button>
            <button class="dr-btn-icon danger" onclick="window.DailyRoutineController.handleDeleteItem('${item.id}')" title="Excluir item">🗑</button>
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <div class="card dr-settings-panel" style="background:#fff;border:1px solid #e2e8f0;color:#1e293b;border-radius:14px;padding:20px;">
        <div class="card-head" style="margin-bottom:14px;">
          <div>
            <h3 style="margin:0 0 4px;font-size:16px;color:#0f2a20;font-weight:700;">Minha Rotina Diária</h3>
            <span style="font-size:12px;color:#64748b;line-height:1.4;">
              Organize a ordem dos seus rituais operacionais.
            </span>
          </div>
        </div>

        <div class="dr-settings-list" style="display:grid;gap:8px;margin-bottom:14px;">
          ${itemsListMarkup}
        </div>

        <div style="display:flex;gap:10px;">
          <button type="button" class="btn primary" onclick="window.DailyRoutineController.openModal(null)">+ Adicionar nova rotina</button>
          <button type="button" class="btn secondary" onclick="window.DailyRoutineModel.resetToDefaultItems(); window.DailyRoutineController.renderDailyRoutineSettings(); window.DailyRoutineController.renderDailyRoutineCard();">↺ Restaurar 8 passos</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  function handleUpdateItemName(id, newName) {
    if (!newName.trim()) return;
    window.DailyRoutineModel.updateRoutineItem(id, { name: newName.trim() });
    renderDailyRoutineSettings();
    renderDailyRoutineCard();
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('healthyTrend:routineUpdated'));
    }
  }

  function handleDeleteItem(id) {
    if (confirm('Deseja realmente remover este item da sua rotina?')) {
      window.DailyRoutineModel.deleteRoutineItem(id);
      renderDailyRoutineSettings();
      renderDailyRoutineCard();
      if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('healthyTrend:routineUpdated'));
      }
    }
  }

  function handleMoveItem(id, direction) {
    window.DailyRoutineModel.moveRoutineItem(id, direction);
    renderDailyRoutineSettings();
    renderDailyRoutineCard();
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('healthyTrend:routineUpdated'));
    }
  }

  function init() {
    renderDailyRoutineSettings();
    if (document.getElementById('dailyroutine')?.classList.contains('active')) {
      renderDailyRoutineCard();
    }

    const originalGo = window.go;
    if (typeof originalGo === 'function') {
      window.go = function (id) {
        originalGo(id);
        if (id === 'dailyroutine') {
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
    openModal,
    closeModal,
    goToSettings,
    handleUpdateItemName,
    handleDeleteItem,
    handleMoveItem,
    init
  };

})(window);

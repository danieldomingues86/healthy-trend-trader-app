/**
 * EVENT PLAYBOOK — FRONTEND INTERFACE
 * Healthy Trend Trader
 *
 * Biblioteca histórica de eventos de mercado e memória operacional do trader.
 * Cadastro único integrado à Central de Mercado.
 */

(function (root) {
  'use strict';

  const Model = root.EventPlaybookModel;

  const state = {
    events: [],
    selectedEventId: null,
    selectedCategory: 'Todos',
    filters: {
      search: '',
      period: '',
      category: 'Todos',
      impact: '',
      asset: ''
    },
    activeEvidencePhase: 'all',
    loading: false
  };

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const parts = String(dateStr).slice(0, 10).split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch (_) {}
    return String(dateStr);
  }

  function getImpactClass(impact) {
    const num = Number(impact) || 3;
    if (num >= 5) return 'impact-5';
    if (num === 4) return 'impact-4';
    if (num === 3) return 'impact-3';
    return 'impact-2';
  }

  function getImpactLabel(impact) {
    const num = Number(impact) || 3;
    if (num >= 5) return 'Impacto 5 (Extremo)';
    if (num === 4) return 'Impacto 4 (Alto)';
    if (num === 3) return 'Impacto 3 (Médio)';
    if (num === 2) return 'Impacto 2 (Baixo)';
    return 'Impacto 1 (Muito Baixo)';
  }

  async function loadData() {
    state.loading = true;
    try {
      if (Model && typeof Model.fetchEvents === 'function') {
        state.events = await Model.fetchEvents(state.filters);
      } else if (Model && typeof Model.getAllEvents === 'function') {
        state.events = Model.filterEvents(Model.getAllEvents(), state.filters);
      }
    } catch (err) {
      if (Model && typeof Model.getAllEvents === 'function') {
        state.events = Model.filterEvents(Model.getAllEvents(), state.filters);
      }
    } finally {
      state.loading = false;
    }

    if (state.events.length > 0) {
      if (!state.selectedEventId || !state.events.some(e => e.id === state.selectedEventId)) {
        state.selectedEventId = state.events[0].id;
      }
    } else {
      state.selectedEventId = null;
    }
  }

  function selectEvent(id) {
    state.selectedEventId = id;
    render();
    const activeEl = document.querySelector(`.ep-event-card[data-id="${id}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function setCategory(category) {
    state.selectedCategory = category;
    state.filters.category = category;
    loadData().then(render);
  }

  function applyFilters() {
    const searchInput = document.getElementById('epSearchInput');
    const periodSelect = document.getElementById('epPeriodSelect');
    const catSelect = document.getElementById('epCategorySelect');
    const impactSelect = document.getElementById('epImpactSelect');
    const assetInput = document.getElementById('epAssetInput');

    state.filters.search = searchInput ? searchInput.value.trim() : '';
    state.filters.period = periodSelect ? periodSelect.value : '';
    state.filters.category = catSelect ? catSelect.value : state.selectedCategory;
    state.filters.impact = impactSelect ? impactSelect.value : '';
    state.filters.asset = assetInput ? assetInput.value.trim() : '';
    state.selectedCategory = state.filters.category || 'Todos';

    loadData().then(render);
  }

  function clearFilters() {
    state.filters = {
      search: '',
      period: '',
      category: 'Todos',
      impact: '',
      asset: ''
    };
    state.selectedCategory = 'Todos';
    loadData().then(render);
  }

  function renderCategoryPills(counts) {
    const categories = Model?.CATEGORIES || [
      'Todos', 'Política', 'Macro', 'Geopolítica', 'Earnings',
      'Tarifas', 'Banco Central', 'Commodities', 'Black Swan', 'Outros'
    ];

    return `
      <div class="ep-categories-bar" role="tablist">
        ${categories.map(cat => {
          const isActive = state.selectedCategory === cat;
          const count = counts[cat] || 0;
          return `
            <button type="button" class="ep-category-pill ${isActive ? 'active' : ''}" onclick="window.EventPlaybook.setCategory('${esc(cat)}')">
              <span>${esc(cat)}</span>
              <span class="ep-pill-count">${count}</span>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderFiltersBar() {
    return `
      <div class="ep-filter-card">
        <div class="ep-search-wrap">
          <span class="ep-search-icon">🔍</span>
          <input type="text" id="epSearchInput" class="ep-search-input"
            placeholder="Pesquisar eventos por palavra-chave, ativo ou descrição..."
            value="${esc(state.filters.search)}"
            onkeydown="if(event.key === 'Enter') window.EventPlaybook.applyFilters()" />
        </div>

        <select id="epPeriodSelect" class="ep-filter-select" onchange="window.EventPlaybook.applyFilters()">
          <option value="" ${state.filters.period === '' ? 'selected' : ''}>Todos os períodos</option>
          <option value="today" ${state.filters.period === 'today' ? 'selected' : ''}>Hoje</option>
          <option value="30d" ${state.filters.period === '30d' ? 'selected' : ''}>Últimos 30 dias</option>
          <option value="1y" ${state.filters.period === '1y' ? 'selected' : ''}>Último ano</option>
        </select>

        <select id="epCategorySelect" class="ep-filter-select" onchange="window.EventPlaybook.setCategory(this.value)">
          ${(Model?.CATEGORIES || ['Todos']).map(cat => `
            <option value="${esc(cat)}" ${state.selectedCategory === cat ? 'selected' : ''}>${esc(cat)}</option>
          `).join('')}
        </select>

        <select id="epImpactSelect" class="ep-filter-select" onchange="window.EventPlaybook.applyFilters()">
          <option value="" ${state.filters.impact === '' ? 'selected' : ''}>Todos os impactos</option>
          <option value="5" ${state.filters.impact === '5' ? 'selected' : ''}>Impacto 5 (Extremo)</option>
          <option value="4" ${state.filters.impact === '4' ? 'selected' : ''}>Impacto 4 (Alto)</option>
          <option value="3" ${state.filters.impact === '3' ? 'selected' : ''}>Impacto 3 (Médio)</option>
          <option value="2" ${state.filters.impact === '2' ? 'selected' : ''}>Impacto 2 (Baixo)</option>
        </select>

        <input type="text" id="epAssetInput" class="ep-search-input" style="max-width: 140px;"
          placeholder="Ativo (ex: SPX)"
          value="${esc(state.filters.asset)}"
          onkeydown="if(event.key === 'Enter') window.EventPlaybook.applyFilters()" />

        <button type="button" class="ep-filter-clear-btn" onclick="window.EventPlaybook.clearFilters()">
          Limpar filtros
        </button>
      </div>
    `;
  }

  function renderEventCard(ev) {
    const isSelected = ev.id === state.selectedEventId;
    const impactClass = getImpactClass(ev.impact);
    const dateFormatted = formatDisplayDate(ev.date || ev.eventDate);
    const excerpt = ev.whatHappened || ev.description || '';

    let assetsList = [];
    if (ev.affectedAssets) {
      assetsList = ev.affectedAssets.split(/[,/]/).map(s => s.trim()).filter(Boolean).slice(0, 3);
    } else if (ev.relatedAssets) {
      assetsList = ev.relatedAssets.split(/[,/]/).map(s => s.trim()).filter(Boolean).slice(0, 3);
    }

    return `
      <div class="ep-event-card ${isSelected ? 'active' : ''}" data-id="${esc(ev.id)}" onclick="window.EventPlaybook.selectEvent('${esc(ev.id)}')">
        <div class="ep-event-card-top">
          <span class="ep-event-card-date">${esc(dateFormatted)}</span>
          <span class="ep-badge-impact ${impactClass}">Nível ${ev.impact || 3}</span>
        </div>

        <h4 class="ep-event-card-title">${esc(ev.name)}</h4>

        ${excerpt ? `<p class="ep-event-card-snippet">${esc(excerpt)}</p>` : ''}

        <div class="ep-event-card-footer">
          <span class="ep-badge-cat">${esc(ev.category || 'Macro')}</span>
          <div class="ep-chips-row">
            ${assetsList.map(a => `<span class="ep-chip">${esc(a)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderDetailPane(ev) {
    if (!ev) {
      return `
        <div class="ep-section-card" style="text-align:center;padding:48px;">
          <h3>Nenhum evento selecionado</h3>
          <p style="color:#64748b;margin-top:8px;">Selecione um evento da lista ao lado ou cadastre um novo evento.</p>
          <button type="button" class="ep-btn-primary" style="margin-top:16px;" onclick="window.EventPlaybook.openCreateModal()">
            + Novo Evento
          </button>
        </div>
      `;
    }

    const impactClass = getImpactClass(ev.impact);
    const impactLabel = getImpactLabel(ev.impact);
    const dateFormatted = formatDisplayDate(ev.date || ev.eventDate);

    // Filtro de screenshots por fase
    const allScreenshots = Array.isArray(ev.screenshots) ? ev.screenshots : [];
    const filteredScreenshots = state.activeEvidencePhase === 'all'
      ? allScreenshots
      : allScreenshots.filter(s => s.type === state.activeEvidencePhase);

    const phaseLabels = {
      before: 'Antes do evento',
      during: 'Durante o evento',
      after: 'Depois do evento',
      news: 'Notícia / Comunicado',
      other: 'Outra evidência'
    };

    return `
      <div class="ep-detail-column">
        <!-- HEADER CARD -->
        <article class="ep-detail-header-card">
          <div class="ep-detail-header-top">
            <div>
              <h2 class="ep-detail-title">${esc(ev.name)}</h2>
            </div>
            <div class="ep-detail-header-actions">
              <button type="button" class="ep-btn-secondary" onclick="window.EventPlaybook.openEditModal('${esc(ev.id)}')">
                ✏️ Editar
              </button>
              <button type="button" class="ep-btn-secondary" style="color:#ef4444;" onclick="window.EventPlaybook.confirmDelete('${esc(ev.id)}')">
                🗑️ Excluir
              </button>
            </div>
          </div>

          <div class="ep-detail-meta-row">
            <span class="ep-detail-meta-item">
              📅 <strong>${esc(dateFormatted)}</strong> às <strong>${esc(ev.time || ev.eventTime || '10:00')}</strong>
            </span>
            <span>•</span>
            <span class="ep-badge-cat" style="font-size:12px;">${esc(ev.category || 'Macro')}</span>
            <span>•</span>
            <span class="ep-badge-impact ${impactClass}" style="font-size:12px;">${esc(impactLabel)}</span>
            ${ev.country ? `<span>•</span><span>🌍 ${esc(ev.country)}</span>` : ''}
          </div>
        </article>

        <!-- CARD 1: O QUE ACONTECEU -->
        <article class="ep-section-card">
          <div class="ep-section-head">
            <h3><span class="ep-section-icon">📋</span> O que aconteceu</h3>
          </div>
          <div class="ep-section-body">
            <p>${esc(ev.whatHappened || ev.description || 'Nenhum detalhe registrado ainda.')}</p>
            ${ev.description && ev.description !== ev.whatHappened ? `
              <p style="font-size:13px;color:#64748b;margin-top:8px;">${esc(ev.description)}</p>
            ` : ''}
          </div>
        </article>

        <!-- CARD 2: COMO ISSO AFETA MEU TRADING -->
        <article class="ep-section-card">
          <div class="ep-section-head">
            <h3><span class="ep-section-icon">🎯</span> Como isso afeta meu trading?</h3>
          </div>
          <div class="ep-section-body">
            <p>${esc(ev.tradingImplications || 'Defina aqui as diretrizes práticas para lidar com acontecimentos semelhantes no futuro.')}</p>
          </div>
        </article>

        <!-- CARD 3: ATIVOS AFETADOS & MÉTRICAS DA REAÇÃO -->
        <article class="ep-section-card">
          <div class="ep-section-head">
            <h3><span class="ep-section-icon">📊</span> Ativos afetados & Métricas da Reação</h3>
          </div>
          <div class="ep-section-body">
            <div>
              <strong style="font-size:12px;color:#64748b;text-transform:uppercase;">Ativos mais impactados:</strong>
              <div class="ep-chips-row" style="margin-top:6px;">
                ${(ev.affectedAssets || ev.relatedAssets || 'Geral').split(/[,/]/).map(a => `<span class="ep-chip" style="font-size:12px;padding:4px 10px;">${esc(a.trim())}</span>`).join('')}
              </div>
            </div>

            <div class="ep-metrics-grid">
              <div class="ep-metric-box">
                <span class="ep-metric-lbl">Direção Inicial</span>
                <span class="ep-metric-val ${ev.initialDirection === 'Alta' ? 'dir-alta' : ev.initialDirection === 'Baixa' ? 'dir-baixa' : ''}">
                  ${esc(ev.initialDirection || 'Neutra')}
                </span>
              </div>
              <div class="ep-metric-box">
                <span class="ep-metric-lbl">Gap Inicial</span>
                <span class="ep-metric-val">${esc(ev.gap || '—')}</span>
              </div>
              <div class="ep-metric-box">
                <span class="ep-metric-lbl">Volume</span>
                <span class="ep-metric-val">${esc(ev.volume || '—')}</span>
              </div>
              <div class="ep-metric-box">
                <span class="ep-metric-lbl">ATR</span>
                <span class="ep-metric-val">${esc(ev.atr || '—')}</span>
              </div>
              <div class="ep-metric-box">
                <span class="ep-metric-lbl">Duração do Impacto</span>
                <span class="ep-metric-val" style="font-size:13px;">${esc(ev.impactDuration || '—')}</span>
              </div>
            </div>

            ${ev.volatilityBehavior ? `
              <div style="margin-top:14px;padding:10px 14px;background:#f8fafc;border-radius:10px;font-size:13px;color:#334155;">
                <strong>Comportamento da Volatilidade:</strong> ${esc(ev.volatilityBehavior)}
              </div>
            ` : ''}
          </div>
        </article>

        <!-- CARD 4: GRÁFICOS E SCREENSHOTS (4 FASES) -->
        <article class="ep-section-card">
          <div class="ep-section-head">
            <h3><span class="ep-section-icon">📸</span> Gráficos e Screenshots</h3>
            <button type="button" class="ep-btn-secondary" style="font-size:12px;padding:6px 12px;" onclick="window.EventPlaybook.openEvidenceModal('${esc(ev.id)}')">
              + Anexar Imagem
            </button>
          </div>

          <!-- ABAS DE FASES -->
          <div class="ep-evidence-phases-tabs">
            <button type="button" class="ep-phase-tab-btn ${state.activeEvidencePhase === 'all' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('all')">
              Todas (${allScreenshots.length})
            </button>
            <button type="button" class="ep-phase-tab-btn ${state.activeEvidencePhase === 'before' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('before')">
              Antes (${allScreenshots.filter(s => s.type === 'before').length})
            </button>
            <button type="button" class="ep-phase-tab-btn ${state.activeEvidencePhase === 'during' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('during')">
              Durante (${allScreenshots.filter(s => s.type === 'during').length})
            </button>
            <button type="button" class="ep-phase-tab-btn ${state.activeEvidencePhase === 'after' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('after')">
              Depois (${allScreenshots.filter(s => s.type === 'after').length})
            </button>
            <button type="button" class="ep-phase-tab-btn ${state.activeEvidencePhase === 'news' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('news')">
              Notícias (${allScreenshots.filter(s => s.type === 'news').length})
            </button>
          </div>

          <div class="ep-gallery-grid">
            ${filteredScreenshots.length > 0 ? filteredScreenshots.map(img => `
              <div class="ep-gallery-item">
                <div class="ep-gallery-thumb-wrap" onclick="window.EventPlaybook.openLightbox('${esc(img.url)}', '${esc(img.caption || img.description || '')}')">
                  <img src="${esc(img.url)}" alt="${esc(img.caption || 'Evidência')}" class="ep-gallery-thumb" loading="lazy" />
                  <span class="ep-gallery-phase-badge">${esc(phaseLabels[img.type] || 'Evidência')}</span>
                </div>
                <div class="ep-gallery-info">
                  <h5 class="ep-gallery-caption" title="${esc(img.caption || '')}">${esc(img.caption || 'Sem legenda')}</h5>
                  ${img.description ? `<p class="ep-gallery-desc">${esc(img.description)}</p>` : ''}
                  <div class="ep-gallery-actions">
                    <button type="button" class="ep-btn-icon-xs" title="Excluir imagem" onclick="window.EventPlaybook.removeScreenshot('${esc(ev.id)}', '${esc(img.id)}')">✕</button>
                  </div>
                </div>
              </div>
            `).join('') : `
              <div class="ep-gallery-empty">
                <p>Nenhuma evidência anexada para este momento.</p>
                <button type="button" class="ep-btn-secondary" style="font-size:12px;" onclick="window.EventPlaybook.openEvidenceModal('${esc(ev.id)}')">
                  + Adicionar Screenshot
                </button>
              </div>
            `}
          </div>
        </article>

        <!-- CARD 5: LIÇÃO PARA O FUTURO (CARD DESTACADO) -->
        <article class="ep-lesson-card">
          <div class="ep-lesson-eyebrow">
            <span>💡</span> LIÇÃO PARA O FUTURO
          </div>
          <div class="ep-lesson-question">
            "O que eu aprendi com esse evento que quero lembrar quando algo parecido acontecer novamente?"
          </div>
          <p class="ep-lesson-text">
            ${esc(ev.lessonsLearned || 'Nenhuma lição anotada ainda. Clique em Editar para registrar os aprendizados operacionais.')}
          </p>
        </article>

        <!-- CARD 6: TAGS E FONTES DE REFERÊNCIA -->
        ${(ev.tags?.length || ev.sources?.length) ? `
          <article class="ep-section-card">
            <div class="ep-section-head">
              <h3><span class="ep-section-icon">🔗</span> Tags e Fontes de Referência</h3>
            </div>
            <div class="ep-section-body">
              ${ev.tags?.length ? `
                <div style="margin-bottom:12px;">
                  <strong style="font-size:12px;color:#64748b;">Tags:</strong>
                  <div class="ep-chips-row" style="margin-top:6px;">
                    ${ev.tags.map(t => `<span class="ep-chip">${esc(t)}</span>`).join('')}
                  </div>
                </div>
              ` : ''}

              ${ev.sources?.length ? `
                <div>
                  <strong style="font-size:12px;color:#64748b;">Fontes e links:</strong>
                  <ul style="margin:6px 0 0 18px;padding:0;font-size:13px;color:#334155;">
                    ${ev.sources.map(s => `<li>${esc(s)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </article>
        ` : ''}
      </div>
    `;
  }

  function render() {
    const rootEl = document.getElementById('eventPlaybookRoot');
    if (!rootEl) return;

    const allStoredEvents = Model?.getAllEvents ? Model.getAllEvents() : state.events;
    const counts = Model?.countByCategory ? Model.countByCategory(allStoredEvents) : {};
    const selectedEvent = state.events.find(e => e.id === state.selectedEventId) || (state.events[0] || null);

    rootEl.innerHTML = `
      <div class="event-playbook-page">
        <!-- HEADER -->
        <header class="ep-header">
          <div class="ep-title-col">
            <h1>Registro de Eventos</h1>
            <p>Biblioteca histórica de eventos e comportamento do mercado.</p>
          </div>
          <div class="ep-header-actions">
            <button type="button" class="ep-btn-primary" onclick="window.EventPlaybook.openCreateModal()">
              + Novo Evento
            </button>
          </div>
        </header>

        <!-- CATEGORIES -->
        ${renderCategoryPills(counts)}

        <!-- FILTERS -->
        ${renderFiltersBar()}

        <!-- WORKSPACE GRID -->
        <div class="ep-workspace-grid">
          <!-- LEFT COLUMN: EVENT LIST -->
          <div class="ep-list-column">
            <div class="ep-list-head">
              <h3>Eventos Históricos</h3>
              <span class="ep-list-count">${state.events.length} evento(s)</span>
            </div>

            <div class="ep-events-scroll-container">
              ${state.events.length > 0 ? state.events.map(renderEventCard).join('') : `
                <div class="ep-section-card" style="text-align:center;padding:32px 16px;color:#64748b;">
                  Nenhum evento encontrado para os filtros selecionados.
                </div>
              `}
            </div>
          </div>

          <!-- RIGHT COLUMN: EVENT DETAIL -->
          <div class="ep-detail-column-wrap">
            ${renderDetailPane(selectedEvent)}
          </div>
        </div>
      </div>
    `;
  }

  /* MODALS IMPLEMENTATION */

  function openCreateModal(eventToEdit = null) {
    const isEditing = Boolean(eventToEdit && eventToEdit.id);
    const ev = eventToEdit || {};

    const existing = document.getElementById('epEventModal');
    if (existing) existing.remove();

    const categories = (Model?.CATEGORIES || ['Macro', 'Política']).filter(c => c !== 'Todos');

    const modal = document.createElement('div');
    modal.id = 'epEventModal';
    modal.className = 'ep-modal-backdrop';
    modal.innerHTML = `
      <div class="ep-modal-card">
        <div class="ep-modal-head">
          <h3>${isEditing ? 'Editar Evento' : 'Novo Evento no Playbook'}</h3>
          <button type="button" class="ep-modal-close-btn" onclick="document.getElementById('epEventModal').remove()">✕</button>
        </div>

        <form id="epEventForm">
          <div class="ep-modal-body">
            <!-- GRUPO 1: IDENTIFICAÇÃO -->
            <div class="ep-form-group">
              <label>Nome do Evento *</label>
              <input type="text" id="mfName" value="${esc(ev.name || '')}" placeholder="Ex: Decisão de Juros — FED" required />
            </div>

            <div class="ep-form-grid-3">
              <div class="ep-form-group">
                <label>Data *</label>
                <input type="date" id="mfDate" value="${esc(ev.date || ev.eventDate || new Date().toISOString().slice(0, 10))}" required />
              </div>
              <div class="ep-form-group">
                <label>Horário</label>
                <input type="time" id="mfTime" value="${esc(ev.time || ev.eventTime || '10:00')}" />
              </div>
              <div class="ep-form-group">
                <label>País / Região</label>
                <input type="text" id="mfCountry" value="${esc(ev.country || 'Brasil')}" placeholder="Brasil / EUA" />
              </div>
            </div>

            <div class="ep-form-grid-2">
              <div class="ep-form-group">
                <label>Categoria</label>
                <select id="mfCategory">
                  ${categories.map(c => `
                    <option value="${esc(c)}" ${(ev.category === c) ? 'selected' : ''}>${esc(c)}</option>
                  `).join('')}
                </select>
              </div>

              <div class="ep-form-group">
                <label>Nível de Impacto</label>
                <select id="mfImpact">
                  <option value="5" ${Number(ev.impact) === 5 ? 'selected' : ''}>Impacto 5 — Extremo (Black Swan / Cataclismo)</option>
                  <option value="4" ${Number(ev.impact) === 4 ? 'selected' : ''}>Impacto 4 — Alto (Catalisador maior)</option>
                  <option value="3" ${(!ev.impact || Number(ev.impact) === 3) ? 'selected' : ''}>Impacto 3 — Médio (Volatilidade pontual)</option>
                  <option value="2" ${Number(ev.impact) === 2 ? 'selected' : ''}>Impacto 2 — Baixo (Reação suave)</option>
                  <option value="1" ${Number(ev.impact) === 1 ? 'selected' : ''}>Impacto 1 — Muito Baixo</option>
                </select>
              </div>
            </div>

            <div class="ep-form-group">
              <label>Ativos Relacionados / Afetados</label>
              <input type="text" id="mfAssets" value="${esc(ev.affectedAssets || ev.relatedAssets || '')}" placeholder="Ex: PETR4, DI1F29, SPX, Dólar Futuro" />
            </div>

            <!-- GRUPO 2: CONTEXTO E REAÇÃO -->
            <div class="ep-form-group">
              <label>O que aconteceu?</label>
              <textarea id="mfWhatHappened" rows="2" placeholder="Resumo factual do acontecimento...">${esc(ev.whatHappened || '')}</textarea>
            </div>

            <div class="ep-form-grid-3">
              <div class="ep-form-group">
                <label>Direção Inicial</label>
                <select id="mfDirection">
                  <option value="Alta" ${ev.initialDirection === 'Alta' ? 'selected' : ''}>Alta ↗</option>
                  <option value="Baixa" ${ev.initialDirection === 'Baixa' ? 'selected' : ''}>Baixa ↘</option>
                  <option value="Neutra" ${(!ev.initialDirection || ev.initialDirection === 'Neutra') ? 'selected' : ''}>Neutra ⬌</option>
                </select>
              </div>
              <div class="ep-form-group">
                <label>Gap Inicial</label>
                <input type="text" id="mfGap" value="${esc(ev.gap || '')}" placeholder="Ex: +1.2%" />
              </div>
              <div class="ep-form-group">
                <label>Volume Relativo</label>
                <input type="text" id="mfVolume" value="${esc(ev.volume || '')}" placeholder="Ex: 2.5x média" />
              </div>
            </div>

            <div class="ep-form-grid-2">
              <div class="ep-form-group">
                <label>Comportamento da Volatilidade</label>
                <select id="mfVolatility">
                  <option value="Expansão rápida seguida de absorção" ${ev.volatilityBehavior?.includes('absorção') ? 'selected' : ''}>Expansão rápida seguida de absorção</option>
                  <option value="Volatilidade unidirecional sem retorno" ${ev.volatilityBehavior?.includes('unidirecional') ? 'selected' : ''}>Volatilidade unidirecional sem retorno</option>
                  <option value="Falso rompimento com reversão rápida" ${ev.volatilityBehavior?.includes('reversão') ? 'selected' : ''}>Falso rompimento com reversão rápida</option>
                  <option value="Reação fraca / neutra" ${ev.volatilityBehavior?.includes('neutra') ? 'selected' : ''}>Reação fraca / neutra</option>
                </select>
              </div>
              <div class="ep-form-group">
                <label>Duração do Impacto</label>
                <input type="text" id="mfDuration" value="${esc(ev.impactDuration || '')}" placeholder="Ex: 2 horas / 3 dias" />
              </div>
            </div>

            <!-- GRUPO 3: ANÁLISE OPERACIONAL -->
            <div class="ep-form-group">
              <label>Como isso afeta meu trading?</label>
              <textarea id="mfTrading" rows="2" placeholder="Regras de proteção, setups permitidos, posturas a adotar...">${esc(ev.tradingImplications || '')}</textarea>
            </div>

            <div class="ep-form-group" style="background:#f0fdf4;padding:12px;border-radius:10px;border:1px solid #a7f3d0;">
              <label style="color:#047857;">Lição para o futuro (Memória Operacional)</label>
              <textarea id="mfLessons" rows="2" style="border-color:#6ee7b7;" placeholder="O que aprendi com este evento para nunca esquecer na próxima vez...">${esc(ev.lessonsLearned || '')}</textarea>
            </div>

            <div class="ep-form-group">
              <label>Tags (separadas por vírgula)</label>
              <input type="text" id="mfTags" value="${esc(Array.isArray(ev.tags) ? ev.tags.join(', ') : '')}" placeholder="Fed, Inflação, Juros, Big Tech" />
            </div>
          </div>

          <div class="ep-modal-foot">
            <button type="button" class="ep-btn-secondary" onclick="document.getElementById('epEventModal').remove()">Cancelar</button>
            <button type="submit" class="ep-btn-primary">${isEditing ? 'Atualizar Evento' : 'Salvar no Playbook'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#epEventForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = modal.querySelector('#mfName').value.trim();
      const date = modal.querySelector('#mfDate').value;
      const time = modal.querySelector('#mfTime').value;
      const country = modal.querySelector('#mfCountry').value;
      const category = modal.querySelector('#mfCategory').value;
      const impact = Number(modal.querySelector('#mfImpact').value) || 3;
      const affectedAssets = modal.querySelector('#mfAssets').value;
      const whatHappened = modal.querySelector('#mfWhatHappened').value;
      const initialDirection = modal.querySelector('#mfDirection').value;
      const gap = modal.querySelector('#mfGap').value;
      const volume = modal.querySelector('#mfVolume').value;
      const volatilityBehavior = modal.querySelector('#mfVolatility').value;
      const impactDuration = modal.querySelector('#mfDuration').value;
      const tradingImplications = modal.querySelector('#mfTrading').value;
      const lessonsLearned = modal.querySelector('#mfLessons').value;
      const tagsRaw = modal.querySelector('#mfTags').value;
      const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

      const payload = {
        name,
        date,
        eventDate: date,
        time,
        eventTime: time,
        country,
        category,
        impact,
        relatedAssets: affectedAssets,
        affectedAssets,
        description: whatHappened,
        whatHappened,
        initialDirection,
        gap,
        volume,
        volatilityBehavior,
        impactDuration,
        tradingImplications,
        lessonsLearned,
        tags
      };

      try {
        if (isEditing) {
          Model.updateEvent(ev.id, payload);
          state.selectedEventId = ev.id;
        } else {
          const created = Model.addEvent(payload);
          state.selectedEventId = created.id;
        }

        modal.remove();
        loadData().then(render);

        // Se a Central de Mercado estiver visível, atualiza
        if (window.MarketCentral && typeof window.MarketCentral.refresh === 'function') {
          window.MarketCentral.refresh();
        }
      } catch (err) {
        alert(err.message);
      }
    });
  }

  function openEditModal(eventId) {
    const ev = Model.getEventById(eventId);
    if (!ev) return;
    openCreateModal(ev);
  }

  function confirmDelete(eventId) {
    const ev = Model.getEventById(eventId);
    if (!ev) return;
    if (confirm(`Tem certeza que deseja excluir o evento "${ev.name}"? Esta ação removerá o registro e suas evidências.`)) {
      Model.deleteEvent(eventId);
      loadData().then(render);
      if (window.MarketCentral && typeof window.MarketCentral.refresh === 'function') {
        window.MarketCentral.refresh();
      }
    }
  }

  function openEvidenceModal(eventId) {
    const ev = Model.getEventById(eventId);
    if (!ev) return;

    const existing = document.getElementById('epEvidenceModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'epEvidenceModal';
    modal.className = 'ep-modal-backdrop';
    modal.innerHTML = `
      <div class="ep-modal-card" style="max-width:520px;">
        <div class="ep-modal-head">
          <h3>Anexar Evidência / Print</h3>
          <button type="button" class="ep-modal-close-btn" onclick="document.getElementById('epEvidenceModal').remove()">✕</button>
        </div>

        <form id="epEvidenceForm">
          <div class="ep-modal-body">
            <div class="ep-form-group">
              <label>Momento da Evidência</label>
              <select id="evPhase">
                <option value="during">Durante o evento (Reação imediata / Gap)</option>
                <option value="before">Antes do evento (Estrutura prévia / Contexto)</option>
                <option value="after">Depois do evento (Continuação / Absorção)</option>
                <option value="news">Notícia / Comunicado oficial</option>
                <option value="other">Outra evidência</option>
              </select>
            </div>

            <div class="ep-form-group">
              <label>Arquivo de Imagem (PNG, JPG, WebP)</label>
              <input type="file" id="evFileInput" accept="image/*" required />
            </div>

            <div class="ep-form-group">
              <label>Legenda</label>
              <input type="text" id="evCaption" placeholder="Ex: Reação imediata no gráfico de 15 minutos" required />
            </div>

            <div class="ep-form-group">
              <label>Observação / Descrição Técnica</label>
              <textarea id="evDescription" rows="2" placeholder="Ex: Absorção compradora no teste da EMA 20 com volume 3x maior..."></textarea>
            </div>

            <div id="evPreviewWrap" style="display:none;margin-top:10px;text-align:center;">
              <img id="evPreviewImg" src="" style="max-height:160px;max-width:100%;border-radius:8px;border:1px solid #e2e8f0;" />
            </div>
          </div>

          <div class="ep-modal-foot">
            <button type="button" class="ep-btn-secondary" onclick="document.getElementById('epEvidenceModal').remove()">Cancelar</button>
            <button type="submit" class="ep-btn-primary" id="evSubmitBtn">Salvar Evidência</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    const fileInput = modal.querySelector('#evFileInput');
    const previewWrap = modal.querySelector('#evPreviewWrap');
    const previewImg = modal.querySelector('#evPreviewImg');

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImg.src = e.target.result;
          previewWrap.style.display = 'block';
        };
        reader.readAsDataURL(file);
      }
    });

    modal.querySelector('#epEvidenceForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = fileInput.files[0];
      if (!file) return;

      const phase = modal.querySelector('#evPhase').value;
      const caption = modal.querySelector('#evCaption').value.trim();
      const description = modal.querySelector('#evDescription').value.trim();
      const submitBtn = modal.querySelector('#evSubmitBtn');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';

      try {
        let imageUrl = '';
        if (root.healthyTrendApi?.uploadFile) {
          try {
            const uploaded = await root.healthyTrendApi.uploadFile('/api/event-playbook/attachments', file);
            if (uploaded?.attachment?.url) {
              imageUrl = uploaded.attachment.url;
            }
          } catch (_) {}
        }

        if (!imageUrl) {
          imageUrl = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = ev => resolve(ev.target.result);
            r.readAsDataURL(file);
          });
        }

        Model.addScreenshotToEvent(eventId, {
          type: phase,
          url: imageUrl,
          caption,
          description
        });

        modal.remove();
        loadData().then(render);
      } catch (err) {
        alert('Erro ao salvar evidência: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Evidência';
      }
    });
  }

  function removeScreenshot(eventId, screenshotId) {
    if (confirm('Deseja remover esta evidência?')) {
      Model.removeScreenshotFromEvent(eventId, screenshotId);
      loadData().then(render);
    }
  }

  function openLightbox(url, caption) {
    const existing = document.getElementById('epLightbox');
    if (existing) existing.remove();

    const lb = document.createElement('div');
    lb.id = 'epLightbox';
    lb.className = 'ep-modal-backdrop';
    lb.style.cursor = 'zoom-out';
    lb.onclick = (e) => {
      if (e.target !== lb && e.target.tagName === 'IMG') return;
      lb.remove();
    };

    lb.innerHTML = `
      <div style="position:relative;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;">
        <button type="button" style="position:absolute;top:-36px;right:0;background:transparent;border:none;color:#fff;font-size:24px;cursor:pointer;" onclick="document.getElementById('epLightbox').remove()">✕</button>
        <img src="${esc(url)}" class="ep-lightbox-img" alt="${esc(caption)}" />
        ${caption ? `<div class="ep-lightbox-caption">${esc(caption)}</div>` : ''}
      </div>
    `;

    document.body.appendChild(lb);
  }

  function setEvidencePhase(phase) {
    state.activeEvidencePhase = phase;
    render();
  }

  async function init() {
    await loadData();
    render();
  }

  root.EventPlaybook = {
    init,
    render,
    refresh: () => loadData().then(render),
    selectEvent,
    setCategory,
    applyFilters,
    clearFilters,
    setEvidencePhase,
    openCreateModal,
    openEditModal,
    openEvidenceModal,
    removeScreenshot,
    openLightbox,
    confirmDelete
  };

  // Inicializa quando a página for carregada ou quando a tela for acessada
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('eventPlaybookRoot')) {
        init();
      }
    });
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('healthyTrend:workspace-loaded', () => {
      if (typeof document !== 'undefined' && document.getElementById('eventPlaybookRoot')) {
        init();
      }
    });
  }
})(typeof window !== 'undefined' ? window : this);

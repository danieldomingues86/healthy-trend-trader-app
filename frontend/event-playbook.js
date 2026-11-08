/**
 * EVENT PLAYBOOK — FRONTEND INTERFACE
 * Healthy Trend Trader
 *
 * Terminal de Inteligência de Mercado & Biblioteca Viva de Eventos
 * Design System: Trading-workspace premium, visual de alta classe,
 * hero panorâmico alpino, eventos em formato timeline, protagonista destacado,
 * métricas nítidas e cadastro simplificado em etapas.
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

  async function loadData() {
    state.loading = true;
    try {
      if (Model && typeof Model.fetchEvents === 'function') {
        state.events = await Model.fetchEvents(state.filters);
      } else if (Model && typeof Model.getAllEvents === 'function') {
        state.events = Model.filterEvents(Model.getAllEvents(), state.filters);
      }
    } catch (_) {
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
    const activeEl = document.querySelector(`.ep-timeline-card[data-id="${id}"]`);
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
    const impactSelect = document.getElementById('epImpactSelect');

    state.filters.search = searchInput ? searchInput.value.trim() : '';
    state.filters.period = periodSelect ? periodSelect.value : '';
    state.filters.impact = impactSelect ? impactSelect.value : '';

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

  function setEvidencePhase(phase) {
    state.activeEvidencePhase = phase;
    render();
  }

  /* RENDER HERO BANNER */
  function renderHeroBanner() {
    return `
      <section class="ep-hero-header">
        <div class="ep-hero-overlay"></div>
        <div class="ep-hero-content">
          <div class="ep-hero-icon-badge" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
              <path d="M8 14h.01"/>
              <path d="M12 14h.01"/>
              <path d="M16 14h.01"/>
              <path d="M8 18h.01"/>
              <path d="M12 18h.01"/>
            </svg>
          </div>
          <div class="ep-hero-text">
            <h1 class="ep-hero-title">Registro de Eventos</h1>
            <p class="ep-hero-subtitle">Fatos, decisões e eventos que impactaram o mercado e o seu trading.</p>
            <div class="ep-hero-accent-bar"></div>
          </div>
        </div>
      </section>
    `;
  }

  /* RENDER CATEGORY PILLS BAR */
  function renderCategoryPills(counts) {
    const categories = [
      'Todos', 'Política', 'Macro', 'Geopolítica', 'Earnings',
      'Tarifas', 'Banco Central', 'Commodities', 'Outros'
    ];

    return `
      <div class="ep-categories-bar">
        <div class="ep-categories-pills-wrap" role="tablist">
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

        <button type="button" class="ep-btn-new-event" onclick="window.EventPlaybook.openCreateModal()">
          <span>+</span> Novo Evento
        </button>
      </div>
    `;
  }

  /* RENDER SEARCH & FILTERS BAR */
  function renderFiltersBar() {
    return `
      <div class="ep-filter-row">
        <div class="ep-search-wrap">
          <span class="ep-search-icon">🔍</span>
          <input type="text" id="epSearchInput" class="ep-search-input"
            placeholder="Buscar evento por palavra-chave..."
            value="${esc(state.filters.search)}"
            onkeydown="if(event.key === 'Enter') window.EventPlaybook.applyFilters()"
            onblur="window.EventPlaybook.applyFilters()" />
        </div>

        <select id="epPeriodSelect" class="ep-filter-select" onchange="window.EventPlaybook.applyFilters()">
          <option value="" ${state.filters.period === '' ? 'selected' : ''}>Todos os períodos</option>
          <option value="today" ${state.filters.period === 'today' ? 'selected' : ''}>Hoje</option>
          <option value="30d" ${state.filters.period === '30d' ? 'selected' : ''}>Últimos 30 dias</option>
          <option value="90d" ${state.filters.period === '90d' ? 'selected' : ''}>Últimos 3 meses</option>
          <option value="1y" ${state.filters.period === '1y' ? 'selected' : ''}>Último ano</option>
        </select>

        <select id="epImpactSelect" class="ep-filter-select" onchange="window.EventPlaybook.applyFilters()">
          <option value="" ${state.filters.impact === '' ? 'selected' : ''}>Impacto</option>
          <option value="5" ${state.filters.impact === '5' ? 'selected' : ''}>Nível 5 (Extremo)</option>
          <option value="4" ${state.filters.impact === '4' ? 'selected' : ''}>Nível 4 (Alto)</option>
          <option value="3" ${state.filters.impact === '3' ? 'selected' : ''}>Nível 3 (Médio)</option>
          <option value="2" ${state.filters.impact === '2' ? 'selected' : ''}>Nível 2 (Baixo)</option>
        </select>

        <button type="button" class="ep-filter-clear-btn" onclick="window.EventPlaybook.clearFilters()">
          <span>↺</span> Limpar filtros
        </button>
      </div>
    `;
  }

  /* RENDER TIMELINE CARD (LEFT LIST) */
  function renderTimelineCard(ev) {
    const isSelected = ev.id === state.selectedEventId;
    const impactClass = getImpactClass(ev.impact);
    const dateBadge = Model?.formatDateBadge ? Model.formatDateBadge(ev.date || ev.eventDate) : { day: '—', month: '—' };
    const snippet = ev.whatHappened || ev.description || '';
    const catIcon = Model?.getCategoryIcon ? Model.getCategoryIcon(ev.category) : '📌';

    return `
      <div class="ep-timeline-card ${isSelected ? 'active' : ''}" data-id="${esc(ev.id)}" onclick="window.EventPlaybook.selectEvent('${esc(ev.id)}')">
        <div class="ep-date-badge">
          <span class="ep-date-day">${esc(dateBadge.day)}</span>
          <span class="ep-date-month">${esc(dateBadge.month)}</span>
        </div>

        <div class="ep-timeline-info">
          <span class="ep-timeline-cat-row">
            <span>${catIcon}</span>
            <span>${esc(ev.category || 'Macro')}</span>
          </span>
          <h4 class="ep-timeline-event-name" title="${esc(ev.name)}">${esc(ev.name)}</h4>
          <p class="ep-timeline-snippet" title="${esc(snippet)}">${esc(snippet)}</p>
        </div>

        <span class="ep-badge-impact-pill ${impactClass}">Nível ${ev.impact || 3}</span>
      </div>
    `;
  }

  /* RENDER PROTAGONIST DETAIL (RIGHT COLUMN) */
  function renderDetailPane(ev) {
    if (!ev) {
      return `
        <div class="ep-detail-card" style="text-align:center;padding:54px 32px;">
          <h3 style="font-size:20px;color:#0f2a20;">Nenhum evento selecionado</h3>
          <p style="color:#64748b;margin:8px 0 20px;">Selecione um evento na lista ao lado ou cadastre um novo evento.</p>
          <button type="button" class="ep-btn-new-event" onclick="window.EventPlaybook.openCreateModal()">
            + Novo Evento
          </button>
        </div>
      `;
    }

    const impactLabel = getImpactLabel(ev.impact);
    const dateFormatted = formatDisplayDate(ev.date || ev.eventDate);
    const timeFormatted = ev.time || ev.eventTime || '10:00';
    const countryFlag = Model?.getCountryWithFlag ? Model.getCountryWithFlag(ev.country) : (ev.country || 'Global');
    const coverUrl = Model?.getEventCoverImage ? Model.getEventCoverImage(ev) : 'assets/event-playbook/cover-us-election.jpg';
    const catIcon = Model?.getCategoryIcon ? Model.getCategoryIcon(ev.category) : '🏛️';

    // Ativos afetados em lista
    let assetsList = [];
    if (ev.affectedAssets) {
      assetsList = ev.affectedAssets.split(/[,/]/).map(s => s.trim()).filter(Boolean);
    } else if (ev.relatedAssets) {
      assetsList = ev.relatedAssets.split(/[,/]/).map(s => s.trim()).filter(Boolean);
    }
    if (assetsList.length === 0) assetsList = ['Mercado Geral'];

    // Direção inicial e classe
    const dir = String(ev.initialDirection || 'Alta').trim();
    let dirClass = 'dir-alta';
    let dirIcon = '↗';
    if (dir.toLowerCase().includes('baixa')) {
      dirClass = 'dir-baixa';
      dirIcon = '↘';
    } else if (dir.toLowerCase().includes('neutr') || dir.toLowerCase().includes('lateral')) {
      dirClass = 'dir-neutra';
      dirIcon = '→';
    }

    // Screenshots
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
      <article class="ep-detail-card">
        <!-- HEADER COM CAPA EDITORIAL -->
        <header class="ep-protagonist-header">
          <div class="ep-protagonist-info">
            <div class="ep-protagonist-tag-actions-row">
              <span class="ep-protagonist-category-badge">
                <span>${catIcon}</span>
                <span>${esc(ev.category || 'Macro')}</span>
              </span>

              <div class="ep-protagonist-actions">
                <button type="button" class="ep-btn-subtle" onclick="window.EventPlaybook.openEditModal('${esc(ev.id)}')">
                  <span>✏️</span> Editar
                </button>
                <button type="button" class="ep-btn-subtle danger" onclick="window.EventPlaybook.confirmDelete('${esc(ev.id)}')">
                  <span>🗑️</span> Excluir
                </button>
              </div>
            </div>

            <h2 class="ep-protagonist-title">${esc(ev.name)}</h2>

            <div class="ep-protagonist-meta-row">
              <span class="ep-meta-item">
                <span>📅</span>
                <span>${esc(dateFormatted)} às ${esc(timeFormatted)}</span>
              </span>
              <span class="ep-meta-sep">|</span>
              <span class="ep-meta-item">
                <span>${countryFlag}</span>
              </span>
              <span class="ep-meta-sep">|</span>
              <span class="ep-meta-impact-badge">${esc(impactLabel)}</span>
            </div>
          </div>

          <img src="${esc(coverUrl)}" alt="${esc(ev.name)}" class="ep-protagonist-cover-img" loading="lazy" />
        </header>

        <!-- NARRATIVA E IMPACTO NO MERCADO -->
        <div class="ep-narrative-grid">
          <div class="ep-narrative-card">
            <div class="ep-narrative-block">
              <h3 class="ep-narrative-block-title">
                <span>📋</span> O que aconteceu
              </h3>
              <p class="ep-narrative-block-body">
                ${esc(ev.whatHappened || ev.description || 'Nenhum detalhe histórico registrado ainda.')}
              </p>
            </div>

            <div class="ep-narrative-block">
              <h3 class="ep-narrative-block-title">
                <span>🎯</span> Como isso afeta meu trading?
              </h3>
              <p class="ep-narrative-block-body">
                ${esc(ev.tradingImplications || 'Defina diretrizes práticas para conduzir operações durante eventos similares.')}
              </p>
            </div>
          </div>

          <div class="ep-market-impact-callout">
            <span class="ep-market-impact-eyebrow">
              <span>📈</span> Impacto no Mercado
            </span>
            <h4 class="ep-market-impact-headline">${esc(ev.marketImpactHeadline || (ev.impact >= 5 ? 'Volatilidade elevada' : 'Reação pontual'))}</h4>
            <p class="ep-market-impact-desc">
              ${esc(ev.marketImpactSummary || ev.marketReaction || 'Acompanhamento do fluxo e da reação dos ativos líderes.')}
            </p>
          </div>
        </div>

        <!-- ATIVOS AFETADOS & MÉTRICAS DA REAÇÃO -->
        <section class="ep-metrics-section">
          <h3 class="ep-section-heading">
            <span>📊</span> Ativos Afetados &amp; Métricas da Reação
          </h3>

          <div class="ep-affected-assets-bar">
            ${assetsList.map(a => `<span class="ep-asset-pill">${esc(a)}</span>`).join('')}
          </div>

          <div class="ep-metrics-cards-row">
            <div class="ep-metric-card">
              <span class="ep-metric-card-lbl"><span>📈</span> Direção Inicial</span>
              <span class="ep-metric-card-val ${dirClass}">${esc(dir)} ${dirIcon}</span>
            </div>
            <div class="ep-metric-card">
              <span class="ep-metric-card-lbl"><span>⚡</span> Gap Inicial</span>
              <span class="ep-metric-card-val">${esc(ev.gap || '0.0%')}</span>
            </div>
            <div class="ep-metric-card">
              <span class="ep-metric-card-lbl"><span>📊</span> Volume</span>
              <span class="ep-metric-card-val">${esc(ev.volume || '1.0x média')}</span>
            </div>
            <div class="ep-metric-card">
              <span class="ep-metric-card-lbl"><span>🎯</span> ATR</span>
              <span class="ep-metric-card-val">${esc(ev.atr || '1.0x (Diário)')}</span>
            </div>
            <div class="ep-metric-card">
              <span class="ep-metric-card-lbl"><span>⏱️</span> Duração do Impacto</span>
              <span class="ep-metric-card-val" style="font-size:14.5px;">${esc(ev.impactDuration || 'Sessão atual')}</span>
            </div>
          </div>
        </section>

        <!-- LIÇÃO PARA O FUTURO (WISDOM CARD) -->
        <section class="ep-lesson-box">
          <span class="ep-lesson-bulb-icon" aria-hidden="true">💡</span>
          <div class="ep-lesson-content">
            <h4 class="ep-lesson-title">Lição para o Futuro</h4>
            <p class="ep-lesson-quote">
              "${esc(ev.lessonsLearned || 'Eventos extremos geram expansão aguda de volatilidade. Proteger o patrimônio e esperar a absorção antes de aumentar risco.')}"
            </p>
          </div>
        </section>

        <!-- EVIDÊNCIAS & SCREENSHOTS -->
        <section class="ep-evidence-section">
          <div class="ep-evidence-head">
            <div class="ep-evidence-tabs-bar">
              <button type="button" class="ep-evidence-tab-btn ${state.activeEvidencePhase === 'all' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('all')">
                Todas (${allScreenshots.length})
              </button>
              <button type="button" class="ep-evidence-tab-btn ${state.activeEvidencePhase === 'before' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('before')">
                Antes (${allScreenshots.filter(s => s.type === 'before').length})
              </button>
              <button type="button" class="ep-evidence-tab-btn ${state.activeEvidencePhase === 'during' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('during')">
                Durante (${allScreenshots.filter(s => s.type === 'during').length})
              </button>
              <button type="button" class="ep-evidence-tab-btn ${state.activeEvidencePhase === 'after' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('after')">
                Depois (${allScreenshots.filter(s => s.type === 'after').length})
              </button>
              <button type="button" class="ep-evidence-tab-btn ${state.activeEvidencePhase === 'news' ? 'active' : ''}" onclick="window.EventPlaybook.setEvidencePhase('news')">
                Notícias (${allScreenshots.filter(s => s.type === 'news').length})
              </button>
            </div>

            <button type="button" class="ep-btn-add-img" onclick="window.EventPlaybook.openEvidenceModal('${esc(ev.id)}')">
              <span>+</span> Adicionar Screenshot
            </button>
          </div>

          <div class="ep-evidence-gallery-grid">
            ${filteredScreenshots.length > 0 ? filteredScreenshots.map(img => `
              <div class="ep-evidence-item" onclick="window.EventPlaybook.openLightbox('${esc(img.url)}', '${esc(img.caption || '')}')">
                <img src="${esc(img.url)}" alt="${esc(img.caption || 'Screenshot')}" class="ep-evidence-thumb" loading="lazy" />
                <span class="ep-evidence-phase-badge">${esc(phaseLabels[img.type] || 'Evidência')}</span>
                <p class="ep-evidence-caption">${esc(img.caption || 'Sem legenda')}</p>
              </div>
            `).join('') : `
              <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: #64748b; font-size: 13px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                Nenhuma evidência fotográfica anexada para este filtro de fase.
              </div>
            `}
          </div>
        </section>
      </article>
    `;
  }

  /* MAIN RENDER FUNCTION */
  function render() {
    const rootEl = document.getElementById('eventPlaybookRoot');
    if (!rootEl) return;

    const allStoredEvents = Model?.getAllEvents ? Model.getAllEvents() : state.events;
    const counts = Model?.countByCategory ? Model.countByCategory(allStoredEvents) : {};
    const selectedEvent = state.events.find(e => e.id === state.selectedEventId) || (state.events[0] || null);

    rootEl.innerHTML = `
      <div class="event-playbook-page">
        <!-- 1. HERO BANNER -->
        ${renderHeroBanner()}

        <!-- 2. CATEGORIES & NEW EVENT -->
        ${renderCategoryPills(counts)}

        <!-- 3. SEARCH & FILTERS -->
        ${renderFiltersBar()}

        <!-- 4. WORKSPACE GRID -->
        <div class="ep-workspace-grid">
          <!-- LEFT: TIMELINE LIST -->
          <aside class="ep-timeline-col">
            <div class="ep-timeline-head">
              <h3 class="ep-timeline-title">Eventos Históricos</h3>
              <span class="ep-timeline-count">${state.events.length} evento(s)</span>
            </div>

            <div class="ep-timeline-list">
              ${state.events.length > 0 ? state.events.map(renderTimelineCard).join('') : `
                <div style="text-align:center;padding:36px 16px;color:#64748b;font-size:13px;">
                  Nenhum evento encontrado com os filtros selecionados.
                </div>
              `}
            </div>

            <a class="ep-timeline-footer-link" onclick="window.EventPlaybook.clearFilters()">
              Ver todos os eventos →
            </a>
          </aside>

          <!-- RIGHT: PROTAGONIST DETAIL -->
          <main class="ep-detail-col-wrap">
            ${renderDetailPane(selectedEvent)}
          </main>
        </div>
      </div>
    `;
  }

  /* ==========================================================================
     SIMPLIFIED CREATION & EDIT MODAL (3-STEP WIZARD)
     ========================================================================== */

  let modalWizardState = {
    currentStep: 1,
    eventToEdit: null,
    formData: {}
  };

  function openCreateModal(eventToEdit = null) {
    const isEditing = Boolean(eventToEdit && eventToEdit.id);
    modalWizardState.currentStep = 1;
    modalWizardState.eventToEdit = eventToEdit;

    const ev = eventToEdit || {};
    modalWizardState.formData = {
      id: ev.id || null,
      name: ev.name || '',
      category: ev.category || 'Política',
      date: ev.date || ev.eventDate || new Date().toISOString().slice(0, 10),
      time: ev.time || ev.eventTime || '10:00',
      country: ev.country || 'Brasil',
      impact: Number(ev.impact) || 5,
      affectedAssets: ev.affectedAssets || ev.relatedAssets || 'IBOV, Dólar',
      whatHappened: ev.whatHappened || ev.description || '',
      tradingImplications: ev.tradingImplications || '',
      marketImpactHeadline: ev.marketImpactHeadline || 'Volatilidade elevada',
      marketImpactSummary: ev.marketImpactSummary || ev.marketReaction || '',
      initialDirection: ev.initialDirection || 'Alta',
      gap: ev.gap || '+2.4%',
      volume: ev.volume || '2.8x média',
      atr: ev.atr || '2.6x (Diário)',
      impactDuration: ev.impactDuration || 'Semanas',
      lessonsLearned: ev.lessonsLearned || '',
      coverImage: ev.coverImage || ''
    };

    renderModalWizard(isEditing);
  }

  function renderModalWizard(isEditing = false) {
    let modalEl = document.getElementById('epSteppedModalContainer');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'epSteppedModalContainer';
      modalEl.className = 'ep-modal-backdrop';
      document.body.appendChild(modalEl);
    }

    const categories = ['Política', 'Macro', 'Geopolítica', 'Banco Central', 'Earnings', 'Tarifas', 'Commodities', 'Black Swan', 'Outros'];
    const curStep = modalWizardState.currentStep;
    const d = modalWizardState.formData;

    modalEl.innerHTML = `
      <div class="ep-stepped-modal">
        <!-- MODAL HEADER -->
        <div class="ep-stepped-modal-header">
          <div class="ep-modal-title-col">
            <h3>${isEditing ? 'Editar Evento de Mercado' : 'Novo Evento no Playbook'}</h3>
            <p>Terminal de inteligência e memória operacional do trader.</p>
          </div>
          <button type="button" class="ep-modal-close-btn" onclick="document.getElementById('epSteppedModalContainer').remove()">✕</button>
        </div>

        <!-- STEPPER BAR -->
        <div class="ep-stepper-bar">
          <button type="button" class="ep-step-tab ${curStep === 1 ? 'active' : ''}" onclick="window.EventPlaybook.goToStep(1)">
            <span class="ep-step-num">1</span>
            <span>Identificação</span>
          </button>
          <button type="button" class="ep-step-tab ${curStep === 2 ? 'active' : ''}" onclick="window.EventPlaybook.goToStep(2)">
            <span class="ep-step-num">2</span>
            <span>Contexto &amp; Operação</span>
          </button>
          <button type="button" class="ep-step-tab ${curStep === 3 ? 'active' : ''}" onclick="window.EventPlaybook.goToStep(3)">
            <span class="ep-step-num">3</span>
            <span>Métricas &amp; Lição</span>
          </button>
        </div>

        <!-- STEP BODY -->
        <div class="ep-step-body">
          ${curStep === 1 ? `
            <!-- STEP 1: IDENTIFICAÇÃO -->
            <div class="ep-form-group">
              <label class="ep-form-label">Título do Evento *</label>
              <input type="text" id="wizName" class="ep-form-input" placeholder="Ex: Eleição Presidencial EUA" value="${esc(d.name)}" />
            </div>

            <div class="ep-form-group">
              <label class="ep-form-label">Categoria do Evento</label>
              <div class="ep-modal-cat-pills">
                ${categories.map(c => `
                  <button type="button" class="ep-modal-cat-pill ${d.category === c ? 'selected' : ''}" onclick="window.EventPlaybook.setModalCategory('${esc(c)}')">
                    ${esc(c)}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="ep-grid-3">
              <div class="ep-form-group">
                <label class="ep-form-label">Data *</label>
                <input type="date" id="wizDate" class="ep-form-input" value="${esc(d.date)}" />
              </div>
              <div class="ep-form-group">
                <label class="ep-form-label">Horário</label>
                <input type="time" id="wizTime" class="ep-form-input" value="${esc(d.time)}" />
              </div>
              <div class="ep-form-group">
                <label class="ep-form-label">País / Região</label>
                <input type="text" id="wizCountry" class="ep-form-input" placeholder="Ex: EUA ou Brasil" value="${esc(d.country)}" />
              </div>
            </div>

            <div class="ep-form-group">
              <label class="ep-form-label">Nível de Impacto no Mercado</label>
              <div class="ep-modal-impact-row">
                ${[1, 2, 3, 4, 5].map(lvl => `
                  <button type="button" class="ep-modal-impact-btn ${d.impact === lvl ? `selected-${lvl}` : ''}" onclick="window.EventPlaybook.setModalImpact(${lvl})">
                    Nível ${lvl} ${lvl === 5 ? '🔥' : ''}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="ep-form-group">
              <label class="ep-form-label">Ativos Mais Impactados (separados por vírgula)</label>
              <input type="text" id="wizAssets" class="ep-form-input" placeholder="Ex: SPX, NDX, BTC, DXY, IBOV" value="${esc(d.affectedAssets)}" />
            </div>
          ` : ''}

          ${curStep === 2 ? `
            <!-- STEP 2: NARRATIVA & OPERAÇÃO -->
            <div class="ep-form-group">
              <label class="ep-form-label">O que aconteceu? (Narrativa do Fato)</label>
              <textarea id="wizWhatHappened" class="ep-form-textarea" placeholder="Descreva os fatos essenciais do acontecimento e a reação geral...">${esc(d.whatHappened)}</textarea>
            </div>

            <div class="ep-form-group">
              <label class="ep-form-label">Como isso afeta meu trading? (Diretriz Operacional Prática)</label>
              <textarea id="wizTradingImplications" class="ep-form-textarea" placeholder="Ex: Reduzir posições na véspera. Aguardar confirmação da apuração antes de aumentar risco...">${esc(d.tradingImplications)}</textarea>
            </div>

            <div class="ep-grid-2">
              <div class="ep-form-group">
                <label class="ep-form-label">Resumo do Impacto (Manchete)</label>
                <input type="text" id="wizImpactHeadline" class="ep-form-input" placeholder="Ex: Volatilidade elevada" value="${esc(d.marketImpactHeadline)}" />
              </div>
              <div class="ep-form-group">
                <label class="ep-form-label">Detalhe do Fluxo</label>
                <input type="text" id="wizImpactSummary" class="ep-form-input" placeholder="Ex: Aumento de fluxo para ativos de risco" value="${esc(d.marketImpactSummary)}" />
              </div>
            </div>
          ` : ''}

          ${curStep === 3 ? `
            <!-- STEP 3: MÉTRICAS & LIÇÃO -->
            <div class="ep-grid-3">
              <div class="ep-form-group">
                <label class="ep-form-label">Direção Inicial</label>
                <select id="wizDirection" class="ep-form-select">
                  <option value="Alta" ${d.initialDirection === 'Alta' ? 'selected' : ''}>Alta ↗</option>
                  <option value="Baixa" ${d.initialDirection === 'Baixa' ? 'selected' : ''}>Baixa ↘</option>
                  <option value="Neutra" ${d.initialDirection === 'Neutra' ? 'selected' : ''}>Neutra / Lateral →</option>
                </select>
              </div>
              <div class="ep-form-group">
                <label class="ep-form-label">Gap Inicial (%)</label>
                <input type="text" id="wizGap" class="ep-form-input" placeholder="Ex: +2,4%" value="${esc(d.gap)}" />
              </div>
              <div class="ep-form-group">
                <label class="ep-form-label">Volume</label>
                <input type="text" id="wizVolume" class="ep-form-input" placeholder="Ex: 2,8x média" value="${esc(d.volume)}" />
              </div>
            </div>

            <div class="ep-grid-2">
              <div class="ep-form-group">
                <label class="ep-form-label">ATR</label>
                <input type="text" id="wizAtr" class="ep-form-input" placeholder="Ex: 2,6x (Diário)" value="${esc(d.atr)}" />
              </div>
              <div class="ep-form-group">
                <label class="ep-form-label">Duração do Impacto</label>
                <input type="text" id="wizDuration" class="ep-form-input" placeholder="Ex: Semanas" value="${esc(d.impactDuration)}" />
              </div>
            </div>

            <div class="ep-form-group">
              <label class="ep-form-label">💡 Lição para o Futuro (Insight Memorável)</label>
              <textarea id="wizLessons" class="ep-form-textarea" style="min-height:90px;" placeholder="Ex: Eventos eleitorais podem gerar expansão extrema de volatilidade. Esperar a reação inicial e procurar oportunidades somente depois que o mercado começar a estabilizar.">${esc(d.lessonsLearned)}</textarea>
            </div>
          ` : ''}
        </div>

        <!-- MODAL FOOTER -->
        <div class="ep-stepped-modal-footer">
          <div>
            ${curStep > 1 ? `
              <button type="button" class="ep-btn-footer-prev" onclick="window.EventPlaybook.prevStep()">
                ← Voltar
              </button>
            ` : `
              <button type="button" class="ep-btn-footer-prev" onclick="document.getElementById('epSteppedModalContainer').remove()">
                Cancelar
              </button>
            `}
          </div>

          <div style="display:flex;gap:10px;">
            ${curStep < 3 ? `
              <button type="button" class="ep-btn-subtle" onclick="window.EventPlaybook.saveFromModal()">
                Salvar Rápido
              </button>
              <button type="button" class="ep-btn-footer-next" onclick="window.EventPlaybook.nextStep()">
                Avançar →
              </button>
            ` : `
              <button type="button" class="ep-btn-footer-save" onclick="window.EventPlaybook.saveFromModal()">
                Salvar Evento ✓
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }

  function saveStepInputs() {
    const cur = modalWizardState.currentStep;
    const d = modalWizardState.formData;

    if (cur === 1) {
      const nameInput = document.getElementById('wizName');
      const dateInput = document.getElementById('wizDate');
      const timeInput = document.getElementById('wizTime');
      const countryInput = document.getElementById('wizCountry');
      const assetsInput = document.getElementById('wizAssets');

      if (nameInput) d.name = nameInput.value.trim();
      if (dateInput) d.date = dateInput.value;
      if (timeInput) d.time = timeInput.value;
      if (countryInput) d.country = countryInput.value.trim();
      if (assetsInput) d.affectedAssets = assetsInput.value.trim();
    } else if (cur === 2) {
      const what = document.getElementById('wizWhatHappened');
      const imp = document.getElementById('wizTradingImplications');
      const hl = document.getElementById('wizImpactHeadline');
      const sm = document.getElementById('wizImpactSummary');

      if (what) d.whatHappened = what.value.trim();
      if (imp) d.tradingImplications = imp.value.trim();
      if (hl) d.marketImpactHeadline = hl.value.trim();
      if (sm) d.marketImpactSummary = sm.value.trim();
    } else if (cur === 3) {
      const dir = document.getElementById('wizDirection');
      const gap = document.getElementById('wizGap');
      const vol = document.getElementById('wizVolume');
      const atr = document.getElementById('wizAtr');
      const dur = document.getElementById('wizDuration');
      const les = document.getElementById('wizLessons');

      if (dir) d.initialDirection = dir.value;
      if (gap) d.gap = gap.value.trim();
      if (vol) d.volume = vol.value.trim();
      if (atr) d.atr = atr.value.trim();
      if (dur) d.impactDuration = dur.value.trim();
      if (les) d.lessonsLearned = les.value.trim();
    }
  }

  function goToStep(stepNum) {
    saveStepInputs();
    modalWizardState.currentStep = stepNum;
    renderModalWizard(Boolean(modalWizardState.eventToEdit));
  }

  function nextStep() {
    saveStepInputs();
    if (!modalWizardState.formData.name) {
      alert('Por favor, informe o título do evento antes de avançar.');
      return;
    }
    modalWizardState.currentStep = Math.min(3, modalWizardState.currentStep + 1);
    renderModalWizard(Boolean(modalWizardState.eventToEdit));
  }

  function prevStep() {
    saveStepInputs();
    modalWizardState.currentStep = Math.max(1, modalWizardState.currentStep - 1);
    renderModalWizard(Boolean(modalWizardState.eventToEdit));
  }

  function setModalCategory(cat) {
    modalWizardState.formData.category = cat;
    renderModalWizard(Boolean(modalWizardState.eventToEdit));
  }

  function setModalImpact(impactNum) {
    modalWizardState.formData.impact = impactNum;
    renderModalWizard(Boolean(modalWizardState.eventToEdit));
  }

  function saveFromModal() {
    saveStepInputs();
    const d = modalWizardState.formData;
    if (!d.name) {
      alert('Por favor, preencha o título do evento.');
      return;
    }

    try {
      let saved;
      if (modalWizardState.eventToEdit && modalWizardState.eventToEdit.id) {
        saved = Model.updateEvent(modalWizardState.eventToEdit.id, d);
      } else {
        saved = Model.addEvent(d);
      }

      // Fecha modal
      const modalEl = document.getElementById('epSteppedModalContainer');
      if (modalEl) modalEl.remove();

      state.selectedEventId = saved.id;
      loadData().then(render);

      // Dispara alarme ou e-mail se impacto for extremo (Nível 5 ou Black Swan)
      if (Number(saved.impact) >= 5 || saved.category === 'Black Swan') {
        if (typeof window !== 'undefined') {
          if (window.StormAlert && typeof window.StormAlert.refresh === 'function') {
            window.StormAlert.refresh();
          }
          if (window.TodayCockpit && typeof window.TodayCockpit.render === 'function') {
            window.TodayCockpit.render();
          }
        }
      }
    } catch (err) {
      alert(`Erro ao salvar evento: ${err.message}`);
    }
  }

  function openEditModal(id) {
    const ev = Model.getEventById(id);
    if (!ev) return;
    openCreateModal(ev);
  }

  function confirmDelete(id) {
    const ev = Model.getEventById(id);
    if (!ev) return;
    if (!confirm(`Tem certeza que deseja excluir o evento "${ev.name}"?`)) return;

    Model.deleteEvent(id);
    if (state.selectedEventId === id) state.selectedEventId = null;

    if (typeof window !== 'undefined' && window.StormAlert && typeof window.StormAlert.refresh === 'function') {
      window.StormAlert.refresh();
    }
    loadData().then(render);
  }

  /* EVIDENCE MODAL & LIGHTBOX */
  function openEvidenceModal(eventId) {
    const ev = Model.getEventById(eventId);
    if (!ev) return;

    let modalEl = document.getElementById('epEvidenceModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'epEvidenceModal';
      modalEl.className = 'ep-modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="ep-stepped-modal" style="max-width:540px;">
        <div class="ep-stepped-modal-header">
          <div class="ep-modal-title-col">
            <h3>Adicionar Screenshot ou Evidência</h3>
            <p>${esc(ev.name)}</p>
          </div>
          <button type="button" class="ep-modal-close-btn" onclick="document.getElementById('epEvidenceModal').remove()">✕</button>
        </div>

        <div class="ep-step-body">
          <div class="ep-form-group">
            <label class="ep-form-label">Momento / Fase da Evidência</label>
            <select id="eviPhase" class="ep-form-select">
              <option value="during">Durante o evento (Reação imediata / Gap)</option>
              <option value="before">Antes do evento (Estrutura anterior)</option>
              <option value="after">Depois do evento (Consolidação subsequente)</option>
              <option value="news">Notícias e Comunicados Oficiais</option>
              <option value="other">Outra evidência</option>
            </select>
          </div>

          <div class="ep-form-group">
            <label class="ep-form-label">Legenda da Imagem</label>
            <input type="text" id="eviCaption" class="ep-form-input" placeholder="Ex: Reação de abertura no gráfico de 15 minutos" />
          </div>

          <div class="ep-form-group">
            <label class="ep-form-label">Arquivo de Imagem (PNG, JPG, WebP)</label>
            <input type="file" id="eviFile" accept="image/*" class="ep-form-input" />
          </div>

          <div class="ep-form-group">
            <label class="ep-form-label">Ou URL direta da Imagem</label>
            <input type="url" id="eviUrl" class="ep-form-input" placeholder="https://..." />
          </div>
        </div>

        <div class="ep-stepped-modal-footer">
          <button type="button" class="ep-btn-footer-prev" onclick="document.getElementById('epEvidenceModal').remove()">
            Cancelar
          </button>
          <button type="button" class="ep-btn-footer-save" onclick="window.EventPlaybook.saveEvidence('${esc(eventId)}')">
            Salvar Evidência ✓
          </button>
        </div>
      </div>
    `;
  }

  async function saveEvidence(eventId) {
    const phaseSelect = document.getElementById('eviPhase');
    const captionInput = document.getElementById('eviCaption');
    const fileInput = document.getElementById('eviFile');
    const urlInput = document.getElementById('eviUrl');

    const type = phaseSelect ? phaseSelect.value : 'during';
    const caption = captionInput ? captionInput.value.trim() : 'Evidência gráfica';

    let imageUrl = urlInput ? urlInput.value.trim() : '';

    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      try {
        imageUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (_) {
        alert('Falha ao processar o arquivo de imagem.');
        return;
      }
    }

    if (!imageUrl) {
      alert('Por favor, selecione um arquivo de imagem ou informe uma URL.');
      return;
    }

    try {
      Model.addScreenshotToEvent(eventId, {
        type,
        caption,
        url: imageUrl
      });

      const modalEl = document.getElementById('epEvidenceModal');
      if (modalEl) modalEl.remove();

      loadData().then(render);
    } catch (err) {
      alert(`Erro ao adicionar evidência: ${err.message}`);
    }
  }

  function openLightbox(url, caption = '') {
    let lb = document.getElementById('epLightbox');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'epLightbox';
      lb.className = 'ep-modal-backdrop';
      lb.onclick = (e) => {
        if (e.target === lb || e.target.classList.contains('ep-lightbox-close')) {
          lb.remove();
        }
      };
      document.body.appendChild(lb);
    }

    lb.innerHTML = `
      <div style="position:relative;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;">
        <button type="button" class="ep-lightbox-close" style="position:absolute;top:-40px;right:0;background:none;border:none;color:#fff;font-size:28px;cursor:pointer;">✕</button>
        <img src="${esc(url)}" alt="${esc(caption)}" style="max-width:100%;max-height:80vh;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);" />
        ${caption ? `<p style="color:#f1f5f9;margin-top:12px;font-size:14px;font-weight:600;text-align:center;">${esc(caption)}</p>` : ''}
      </div>
    `;
  }

  // Public Interface
  const api = {
    render: () => loadData().then(render),
    selectEvent,
    setCategory,
    applyFilters,
    clearFilters,
    setEvidencePhase,
    openCreateModal,
    openEditModal,
    confirmDelete,
    openEvidenceModal,
    saveEvidence,
    openLightbox,
    goToStep,
    nextStep,
    prevStep,
    setModalCategory,
    setModalImpact,
    saveFromModal
  };

  root.EventPlaybook = api;

  // Carrega automaticamente quando o DOM estiver pronto se o elemento estiver ativo
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const rootEl = document.getElementById('eventPlaybookRoot');
      if (rootEl && rootEl.closest('.page.active')) {
        api.render();
      }
    });
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);

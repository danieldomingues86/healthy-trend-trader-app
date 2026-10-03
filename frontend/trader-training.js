(function (root) {
  'use strict';

  const M = root.TraderTrainingModel;
  if (!M) {
    console.error('TraderTrainingModel não carregado.');
    return;
  }

  const STORAGE_KEY = 'healthy-trend-trader-training-v1';

  // Estado em memória
  const state = {
    active: null,
    history: [],
    records: [],
    catalog: M.CATALOG,
    categories: M.CATEGORIES,
    selectedCategory: 'execution',
    selectedCatalogId: null,
    customGoal: {
      title: '',
      category: 'execution',
      durationDays: 21,
      targetPct: 90
    },
    modalOpen: false,
    modalGoalCandidate: null,
    isLoading: false,
    dismissedBanners: new Set()
  };

  // Sanitização e formatação
  const esc = (val) => String(val ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);

  function loadLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          state.active = parsed.active || null;
          state.history = Array.isArray(parsed.history) ? parsed.history : [];
          state.records = Array.isArray(parsed.records) ? parsed.records : [];
        }
      }
    } catch (_) {}
  }

  function saveLocalState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        active: state.active,
        history: state.history,
        records: state.records
      }));
    } catch (_) {}
  }

  async function fetchState() {
    state.isLoading = true;
    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        const res = await root.healthyTrendApi.request('/api/trader-training');
        if (res) {
          state.active = res.active || null;
          state.history = Array.isArray(res.history) ? res.history : [];
          state.records = Array.isArray(res.records) ? res.records : [];
          saveLocalState();
        }
      } else {
        loadLocalState();
      }
    } catch (err) {
      console.warn('Usando cache local de Treinamento de Trader:', err.message);
      loadLocalState();
    } finally {
      state.isLoading = false;
    }
  }

  async function startTraining(payload) {
    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        await root.healthyTrendApi.request('/api/trader-training/goals', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        // Fallback local
        const norm = M.normalizeGoal(payload);
        const newGoal = {
          id: `local-goal-${Date.now()}`,
          userId: 'local',
          catalogId: norm.catalogId,
          title: norm.title,
          category: norm.category,
          startDate: norm.startDate,
          endDate: norm.endDate,
          durationDays: norm.durationDays,
          targetPct: norm.targetPct,
          status: 'active',
          extensions: 0,
          createdAt: new Date().toISOString()
        };
        if (state.active) {
          const prevStatus = M.finalStatus(state.active, state.records);
          const adh = M.computeAdherence(state.records);
          state.history.unshift({
            ...state.active,
            status: prevStatus,
            finalAdherence: adh.pct
          });
        }
        state.active = newGoal;
        state.records = [];
        saveLocalState();
      }
      await fetchState();
      render();
      syncWorkbenchFocusBanner();
      if (typeof root.showToast === 'function') {
        root.showToast('Treinamento iniciado! Mantenha o foco até virar hábito.');
      }
    } catch (err) {
      alert(err.message || 'Erro ao iniciar treinamento.');
    }
  }

  async function extendTraining(days = 7) {
    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        await root.healthyTrendApi.request('/api/trader-training/goals/active/extend', {
          method: 'POST',
          body: JSON.stringify({ days })
        });
      } else if (state.active) {
        state.active.durationDays += days;
        state.active.endDate = M.addDays(state.active.endDate, days);
        state.active.extensions = (state.active.extensions || 0) + 1;
        saveLocalState();
      }
      await fetchState();
      render();
      if (typeof root.showToast === 'function') {
        root.showToast(`Treinamento estendido por mais ${days} dias.`);
      }
    } catch (err) {
      alert(err.message || 'Erro ao estender treinamento.');
    }
  }

  async function switchOrConcludeGoal(targetStatus) {
    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        await root.healthyTrendApi.request('/api/trader-training/goals/active/switch', {
          method: 'POST',
          body: JSON.stringify({ status: targetStatus })
        });
      } else if (state.active) {
        const adh = M.computeAdherence(state.records);
        const status = targetStatus || M.finalStatus(state.active, state.records);
        state.history.unshift({
          ...state.active,
          status,
          finalAdherence: adh.pct
        });
        state.active = null;
        state.records = [];
        saveLocalState();
      }
      await fetchState();
      render();
      syncWorkbenchFocusBanner();
    } catch (err) {
      alert(err.message || 'Erro ao concluir objetivo.');
    }
  }

  async function saveRecord(payload) {
    try {
      const norm = M.normalizeRecord(payload);
      if (root.healthyTrendApi?.isAuthenticated()) {
        await root.healthyTrendApi.request('/api/trader-training/records', {
          method: 'POST',
          body: JSON.stringify(norm)
        });
      } else if (state.active) {
        const record = {
          id: `local-rec-${Date.now()}`,
          userId: 'local',
          goalId: state.active.id,
          ...norm,
          createdAt: new Date().toISOString()
        };
        const idx = state.records.findIndex(r => r.sourceRef === record.sourceRef);
        if (idx >= 0) state.records[idx] = record;
        else state.records.unshift(record);
        saveLocalState();
      }
      await fetchState();
      render();
    } catch (err) {
      console.warn('Erro ao salvar registro de comportamento:', err);
    }
  }

  // ---------- RENDERIZAÇÃO DA PÁGINA ----------

  function renderHero() {
    return `
      <section class="tt-hero">
        <div class="tt-hero-content">
          <span class="tt-hero-eyebrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            Metodologia Healthy Trend
          </span>
          <h1 class="tt-hero-title">Treinamento de Trader</h1>
          <p class="tt-hero-subtitle">Lapide suas habilidades. Repita até virar hábito.</p>
          <div class="tt-hero-quote">
            “Você não precisa melhorar tudo ao mesmo tempo. Escolha um comportamento, treine, meça e transforme em hábito. Depois avance para o próximo.”
          </div>
        </div>
      </section>
    `;
  }

  function renderCurrentGoalCard(active) {
    if (!active) {
      return `
        <article class="tt-card tt-current-goal-card">
          <header class="tt-card-header">
            <div class="tt-card-title-group">
              <span class="tt-card-icon">🎯</span>
              <h2>Meu objetivo atual</h2>
            </div>
          </header>
          <div class="tt-goal-body" style="text-align:center; padding: 24px 0;">
            <div class="tt-goal-target-icon" style="margin: 0 auto 12px;">🎯</div>
            <h3 style="margin: 0 0 8px; font-size: 19px;">Nenhum treinamento ativo no momento</h3>
            <p style="margin: 0 0 16px; color: #557864; font-size: 13.5px;">Escolha um comportamento abaixo para iniciar seu período de foco e repetição deliberada.</p>
            <button type="button" class="tt-btn-primary" style="margin: 0 auto;" onclick="window.TraderTraining.scrollToSelection()">
              Selecionar um objetivo de evolução ↓
            </button>
          </div>
        </article>
      `;
    }

    const catLabel = M.categoryLabel(active.category);
    const startStr = M.formatDate(active.startDate);
    const endStr = M.formatDate(active.endDate);
    const durationLabel = `${active.durationDays} dias`;

    return `
      <article class="tt-card tt-current-goal-card">
        <header class="tt-card-header">
          <div class="tt-card-title-group">
            <span class="tt-card-icon">🎯</span>
            <h2>Meu objetivo atual</h2>
            <span class="tt-badge-status active">Em treinamento</span>
          </div>
          <button type="button" class="tt-btn-switch" onclick="window.TraderTraining.promptSwitchGoal()">
            ⇄ Trocar objetivo
          </button>
        </header>

        <div class="tt-goal-body">
          <div class="tt-goal-main">
            <div class="tt-goal-target-icon" aria-hidden="true">🎯</div>
            <div class="tt-goal-headline">
              <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1b744d; letter-spacing: 0.08em; display: block; margin-bottom: 4px;">Objetivo em foco</span>
              <h3 class="tt-goal-title">“${esc(active.title)}”</h3>
            </div>
          </div>

          <div class="tt-goal-meta-grid">
            <div class="tt-meta-item">
              <span class="tt-meta-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Categoria
              </span>
              <span class="tt-meta-value">${esc(catLabel)}</span>
            </div>

            <div class="tt-meta-item">
              <span class="tt-meta-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Período
              </span>
              <span class="tt-meta-value">${startStr} → ${endStr}</span>
              <span class="tt-meta-sub">(${durationLabel})</span>
            </div>

            <div class="tt-meta-item">
              <span class="tt-meta-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                Meta de consistência
              </span>
              <span class="tt-meta-value">${active.targetPct}%</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderAdherenceCard(active, records) {
    const adh = M.computeAdherence(records);
    const scoreStr = adh.pct != null ? `${Math.round(adh.pct)}%` : '—';
    const fillPct = adh.pct != null ? Math.min(100, Math.max(0, adh.pct)) : 0;
    const ratioStr = `${adh.correct} de ${adh.applicable} operações corretas`;

    return `
      <article class="tt-card tt-adherence-card">
        <header class="tt-card-header">
          <div class="tt-card-title-group">
            <span class="tt-card-icon">📊</span>
            <h2>Aderência atual</h2>
          </div>
        </header>

        <div class="tt-adherence-hero-row">
          <div class="tt-adherence-big-score">${scoreStr}</div>
          <div class="tt-adherence-ratio">
            <strong>${ratioStr}</strong>
            <small>calculado sobre casos aplicáveis</small>
          </div>
        </div>

        <div class="tt-progress-track" role="progressbar" aria-valuenow="${fillPct}" aria-valuemin="0" aria-valuemax="100">
          <div class="tt-progress-fill" style="width: ${fillPct}%;"></div>
        </div>

        <div class="tt-pills-row">
          <div class="tt-metric-pill correct">
            <span class="tt-pill-icon">🟢</span>
            <div>
              <strong>${adh.correct}</strong>
              <span>Corretas</span>
            </div>
          </div>

          <div class="tt-metric-pill incorrect">
            <span class="tt-pill-icon">🔴</span>
            <div>
              <strong>${adh.incorrect}</strong>
              <span>Incorretas</span>
            </div>
          </div>

          <div class="tt-metric-pill na">
            <span class="tt-pill-icon">⚪</span>
            <div>
              <strong>${adh.notApplicable}</strong>
              <span>Não se aplicavam</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderWeeklyCard(active, records) {
    if (!active) {
      return `
        <article class="tt-card tt-weekly-card">
          <header class="tt-card-header">
            <div class="tt-card-title-group">
              <span class="tt-card-icon">📈</span>
              <h2>Evolução por semana</h2>
            </div>
          </header>
          <p style="color: #6a8c79; font-size: 13px; margin: 20px 0;">Inicie um treinamento para visualizar a evolução semanal da sua consistência.</p>
        </article>
      `;
    }

    const weeks = M.weeklyEvolution(active, records);

    return `
      <article class="tt-card tt-weekly-card">
        <header class="tt-card-header">
          <div class="tt-card-title-group">
            <span class="tt-card-icon">📈</span>
            <h2>Evolução por semana</h2>
          </div>
        </header>

        <div class="tt-weekly-chart">
          ${weeks.map((week) => {
            const hasData = week.pct != null;
            const barHeight = hasData ? Math.min(100, Math.max(8, week.pct)) : 4;
            const valLabel = hasData ? `${Math.round(week.pct)}%` : '—';
            return `
              <div class="tt-weekly-bar-col ${!hasData ? 'future' : ''}">
                <span class="tt-weekly-bar-val">${valLabel}</span>
                <div class="tt-weekly-bar-track">
                  <div class="tt-weekly-bar-fill" style="height: ${barHeight}%;"></div>
                </div>
                <span class="tt-weekly-bar-label">${week.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      </article>
    `;
  }

  function renderEvolutionCard(active, records) {
    const weeks = active ? M.weeklyEvolution(active, records) : [];
    const insight = M.evolutionInsight(weeks);

    return `
      <article class="tt-card tt-evolution-card">
        <header class="tt-card-header">
          <div class="tt-card-title-group">
            <span class="tt-card-icon">🌱</span>
            <h2>Minha evolução</h2>
          </div>
        </header>

        <div class="tt-evolution-body">
          <div style="display:flex; align-items:center; gap: 12px;">
            <div class="tt-evolution-icon-wrap" aria-hidden="true">
              ${insight.tone === 'up' ? '↗' : insight.tone === 'down' ? '↘' : '➔'}
            </div>
            <div>
              <h4>${esc(insight.title)}</h4>
              <p>${esc(insight.message)}</p>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderPeriodCard(active) {
    if (!active) {
      return `
        <article class="tt-card tt-period-card">
          <header class="tt-card-header">
            <div class="tt-card-title-group">
              <span class="tt-card-icon">📅</span>
              <h2>Período do treinamento</h2>
            </div>
          </header>
          <p style="color: #6a8c79; font-size: 13px; margin: 20px 0;">Defina um objetivo para acompanhar a linha do tempo do seu treinamento.</p>
        </article>
      `;
    }

    const progress = M.periodProgress(active);
    const startStr = M.formatDate(active.startDate, false);
    const endStr = M.formatDate(active.endDate, false);
    const adh = M.computeAdherence(state.records);
    const mot = M.motivation(adh, active.targetPct);

    // Conclusão automática quando o período termina
    const conclusion = M.conclusion(active, state.records);

    return `
      <article class="tt-card tt-period-card">
        <header class="tt-card-header">
          <div class="tt-card-title-group">
            <span class="tt-card-icon">📅</span>
            <h2>Período do treinamento</h2>
          </div>
        </header>

        <div class="tt-timeline-wrap">
          <div class="tt-timeline-axis">
            <span>${startStr} · Início</span>
            <span>${progress.remaining} dias restantes</span>
            <span>${endStr} · Fim</span>
          </div>

          <div class="tt-timeline-track">
            <div class="tt-timeline-fill" style="width: ${progress.pct}%;"></div>
            <div class="tt-timeline-dot" style="left: ${progress.pct}%;"></div>
          </div>

          <div class="tt-timeline-info">
            <small>${progress.elapsed} de ${progress.totalDays} dias transcorridos (${Math.round(progress.pct)}%)</small>
            ${active.extensions > 0 ? `<small>+${active.extensions} extensão(ões)</small>` : ''}
          </div>
        </div>

        ${conclusion ? `
          <div class="tt-motivation-box" style="background: rgba(39, 174, 96, 0.12); border-color: rgba(39, 174, 96, 0.3); color: #105930;">
            <div style="font-size: 20px;">${conclusion.reached ? '🏆' : '🔄'}</div>
            <div style="flex:1;">
              <b>${conclusion.reached ? 'Objetivo concluído!' : 'Continue treinando'}</b>
              <span>${conclusion.reached
                ? `Você manteve ${Math.round(conclusion.adherence.pct)}% de aderência durante o treinamento. Meta de consistência atingida!`
                : `Sua aderência foi de ${Math.round(conclusion.adherence.pct || 0)}%. O comportamento ainda está se consolidando.`}
              </span>
              <div style="display:flex; gap: 8px; margin-top: 10px;">
                ${conclusion.reached ? `
                  <button type="button" class="tt-btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="window.TraderTraining.concludeAndSelectNext()">Escolher próximo objetivo</button>
                ` : `
                  <button type="button" class="tt-btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="window.TraderTraining.extendActiveGoal(7)">Continuar treinamento (+7 dias)</button>
                  <button type="button" class="tt-btn-secondary" style="padding: 6px 12px; font-size: 12px;" onclick="window.TraderTraining.concludeAndSelectNext()">Escolher outro objetivo</button>
                `}
              </div>
            </div>
          </div>
        ` : `
          <div class="tt-motivation-box">
            <div style="font-size: 20px;">${mot.icon}</div>
            <div>
              <b>${esc(mot.title)}</b>
              <span>${esc(mot.message)}</span>
            </div>
          </div>
        `}
      </article>
    `;
  }

  function renderHistoryTable(records) {
    const list = records || [];

    return `
      <article class="tt-card tt-history-card">
        <header class="tt-card-header">
          <div class="tt-card-title-group">
            <span class="tt-card-icon">📋</span>
            <h2>Histórico de comportamento</h2>
          </div>
          <span style="font-size: 12px; color: #557864; font-weight: 600;">
            ${list.length} registro${list.length === 1 ? '' : 's'} no período
          </span>
        </header>

        <div class="tt-notice-disclaimer">
          <span style="font-size: 15px;">⚖️</span>
          <span><b>Atenção:</b> Resultado financeiro e qualidade da execução são coisas distintas. Uma operação pode perder dinheiro e ter execução correta; ou ganhar dinheiro e ter execução incorreta. O treinamento mede seu <b>comportamento</b> e respeito ao processo.</span>
        </div>

        <div class="tt-table-container">
          <table class="tt-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Ativo</th>
                <th>Resultado</th>
                <th>R Múltiplo</th>
                <th>Comportamento</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              ${!list.length ? `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 32px; color: #6a8c79;">
                    Nenhum comportamento registrado neste período ainda.<br>
                    <small>Ao preencher ou revisar suas operações no Diário de Trades, marque sua autoavaliação para alimentar esta tabela.</small>
                  </td>
                </tr>
              ` : list.map((item) => {
                const dateStr = M.formatDate(item.recordDate);
                const outLabel = M.outcomeLabel(item.outcome);
                const rStr = M.formatR(item.rMultiple);
                const assessClass = item.assessment;
                const assessLabel = M.assessmentLabel(item.assessment);
                const assessIcon = item.assessment === 'correct' ? '🟢' : item.assessment === 'incorrect' ? '🔴' : '⚪';

                return `
                  <tr>
                    <td><b>${dateStr}</b></td>
                    <td><b>${esc(item.ticker || '—')}</b></td>
                    <td class="outcome-${esc(item.outcome)}">${outLabel}</td>
                    <td class="r-val">${rStr}</td>
                    <td>
                      <span class="tt-pill-cell ${assessClass}">
                        ${assessIcon} ${assessLabel}
                      </span>
                    </td>
                    <td style="max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${esc(item.note || '')}">
                      ${esc(item.note || '—')}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  function renderSelectionCard() {
    const cats = [
      { id: 'execution', label: 'Execução' },
      { id: 'psychology', label: 'Psicologia' },
      { id: 'process', label: 'Processo' },
      { id: 'risk', label: 'Gestão de Risco' },
      { id: 'custom', label: 'Personalizado' }
    ];

    const currentCat = state.selectedCategory;
    const isCustom = currentCat === 'custom';
    const items = isCustom ? [] : M.catalogByCategory(currentCat);

    return `
      <article class="tt-card tt-selection-card" id="ttSelectionCard">
        <header class="tt-card-header">
          <div class="tt-card-title-group">
            <span class="tt-card-icon">🎯</span>
            <h2>Selecionar novo objetivo</h2>
          </div>
          <button type="button" class="tt-btn-primary" style="padding: 6px 12px; font-size: 11.5px;" onclick="window.TraderTraining.openCustomGoalModal()">
            ＋ Novo objetivo
          </button>
        </header>

        <nav class="tt-tabs-rail" role="tablist">
          ${cats.map(c => `
            <button type="button" class="tt-tab-btn ${currentCat === c.id ? 'active' : ''}" role="tab" onclick="window.TraderTraining.selectCategory('${c.id}')">
              ${c.label}
            </button>
          `).join('')}
        </nav>

        ${isCustom ? `
          <div style="padding: 16px; background: #f8fbf9; border-radius: 12px; border: 1px solid #dce8e0;">
            <h4 style="margin: 0 0 6px; font-size: 14px;">Criar objetivo personalizado</h4>
            <p style="margin: 0 0 14px; font-size: 12.5px; color: #557864;">Defina qualquer regra ou comportamento específico que você deseja transformar em hábito através da repetição deliberada.</p>
            <button type="button" class="tt-btn-primary" onclick="window.TraderTraining.openCustomGoalModal()">
              ＋ Escrever objetivo personalizado
            </button>
          </div>
        ` : `
          <div class="tt-catalog-list">
            ${items.map(item => {
              const isSelected = state.selectedCatalogId === item.id;
              return `
                <div class="tt-catalog-item ${isSelected ? 'selected' : ''}" onclick="window.TraderTraining.pickCatalogItem('${item.id}')">
                  <div class="tt-catalog-item-left">
                    <input type="radio" name="tt_catalog_radio" ${isSelected ? 'checked' : ''} aria-label="${esc(item.title)}">
                    <span>${esc(item.title)}</span>
                  </div>
                  <span class="tt-catalog-item-info" title="${esc(item.focus || item.title)}">ℹ</span>
                </div>
              `;
            }).join('')}
          </div>
          <button type="button" class="tt-btn-custom-goal" onclick="window.TraderTraining.openCustomGoalModal()">
            ＋ Criar objetivo personalizado
          </button>
        `}
      </article>
    `;
  }

  function renderDevelopmentSection(history) {
    const past = (history || []).filter(g => g.status !== 'active');
    if (!past.length) return '';

    return `
      <section class="tt-development-section">
        <header class="tt-card-header" style="margin-bottom: 0;">
          <div class="tt-card-title-group">
            <span class="tt-card-icon">🏆</span>
            <h2>Meu desenvolvimento</h2>
          </div>
          <span style="font-size: 12px; color: #557864; font-weight: 600;">
            Linha do tempo comportamental
          </span>
        </header>

        <div class="tt-development-timeline">
          ${past.map((goal) => {
            const isConsolidated = goal.status === 'consolidated';
            const statusLabel = isConsolidated ? 'Consolidado' : goal.status === 'developing' ? 'Em desenvolvimento' : 'Interrompido';
            const icon = isConsolidated ? '🟢' : goal.status === 'developing' ? '🔄' : '⚪';
            const adhLabel = goal.adherence != null ? `${Math.round(goal.adherence)}%` : '—';
            const catLabel = M.categoryLabel(goal.category);

            return `
              <div class="tt-development-card">
                <div class="tt-development-card-head">
                  <span class="tt-badge-status ${goal.status}">${icon} ${statusLabel}</span>
                  <strong style="font-size: 14px; color: #113421;">${adhLabel}</strong>
                </div>
                <div class="tt-development-card-title">“${esc(goal.title)}”</div>
                <div class="tt-development-card-meta">
                  <span>${catLabel}</span>
                  <span>·</span>
                  <span>${goal.durationDays} dias</span>
                  <span>·</span>
                  <span>Meta: ${goal.targetPct}%</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  function renderConfigModal() {
    if (!state.modalOpen || !state.modalGoalCandidate) return '';
    const cand = state.modalGoalCandidate;

    return `
      <div class="tt-modal-backdrop" onclick="if (event.target === this) window.TraderTraining.closeModal()">
        <div class="tt-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="ttModalTitle">
          <header class="tt-modal-header">
            <h3 id="ttModalTitle">Configurar Treinamento</h3>
            <button type="button" class="tt-modal-close" onclick="window.TraderTraining.closeModal()" aria-label="Fechar">×</button>
          </header>

          <div class="tt-modal-summary-box">
            <small>Você está prestes a iniciar seu treinamento:</small>
            <h4>“${esc(cand.title)}”</h4>
          </div>

          <div class="tt-form-group">
            <label>Período de treinamento</label>
            <div class="tt-pills-selector">
              ${M.DURATION_OPTIONS.map((d) => `
                <button type="button" class="tt-selector-btn ${cand.durationDays === d ? 'selected' : ''}" onclick="window.TraderTraining.setCandidateDuration(${d})">
                  ${d} dias ${d === M.RECOMMENDED_DURATION ? '<span class="recommended-tag">Recomendado</span>' : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="tt-form-group">
            <label>Meta de consistência</label>
            <div class="tt-pills-selector">
              ${M.TARGET_OPTIONS.map((t) => `
                <button type="button" class="tt-selector-btn ${cand.targetPct === t ? 'selected' : ''}" onclick="window.TraderTraining.setCandidateTarget(${t})">
                  ${t}% ${t === M.RECOMMENDED_TARGET ? '<span class="recommended-tag">Recomendado</span>' : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="padding: 10px 14px; background: #fafcfb; border-radius: 8px; font-size: 12px; color: #4b6e5b; border: 1px solid #dce8e0;">
            <b>Regra de ouro:</b> Apenas 1 objetivo ativo por vez. Treine até virar hábito e meça sua adesão a cada operação no Diário.
          </div>

          <footer class="tt-modal-actions">
            <button type="button" class="tt-btn-secondary" onclick="window.TraderTraining.closeModal()">Cancelar</button>
            <button type="button" class="tt-btn-primary" onclick="window.TraderTraining.confirmStartTraining()">
              Iniciar treinamento (${cand.durationDays} dias | Meta ${cand.targetPct}%)
            </button>
          </footer>
        </div>
      </div>
    `;
  }

  function renderCustomModal() {
    if (!state.customModalOpen) return '';

    return `
      <div class="tt-modal-backdrop" onclick="if (event.target === this) window.TraderTraining.closeCustomModal()">
        <div class="tt-modal-dialog" role="dialog" aria-modal="true">
          <header class="tt-modal-header">
            <h3>Criar objetivo personalizado</h3>
            <button type="button" class="tt-modal-close" onclick="window.TraderTraining.closeCustomModal()" aria-label="Fechar">×</button>
          </header>

          <div class="tt-form-group">
            <label>Comportamento a treinar</label>
            <textarea id="ttCustomTitleInput" rows="3" style="width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #cce0d4; border-radius: 8px; font: inherit;" placeholder="Ex: Não realizar lucro antes do meu plano de Sell Into Strength.">${esc(state.customGoal.title)}</textarea>
          </div>

          <div class="tt-form-group">
            <label>Categoria</label>
            <select id="ttCustomCatSelect" style="padding: 8px; border-radius: 8px; border: 1px solid #cce0d4; font: inherit;">
              <option value="execution" ${state.customGoal.category === 'execution' ? 'selected' : ''}>Execução</option>
              <option value="psychology" ${state.customGoal.category === 'psychology' ? 'selected' : ''}>Psicologia</option>
              <option value="process" ${state.customGoal.category === 'process' ? 'selected' : ''}>Processo</option>
              <option value="risk" ${state.customGoal.category === 'risk' ? 'selected' : ''}>Gestão de Risco</option>
            </select>
          </div>

          <footer class="tt-modal-actions">
            <button type="button" class="tt-btn-secondary" onclick="window.TraderTraining.closeCustomModal()">Cancelar</button>
            <button type="button" class="tt-btn-primary" onclick="window.TraderTraining.submitCustomGoal()">
              Avançar para período e meta →
            </button>
          </footer>
        </div>
      </div>
    `;
  }

  function render() {
    const rootEl = document.getElementById('traderTrainingRoot') || document.getElementById('tradertraining');
    if (!rootEl) return;

    rootEl.innerHTML = `
      <main class="tt-page">
        ${renderHero()}

        <section class="tt-top-grid">
          ${renderCurrentGoalCard(state.active)}
          ${renderAdherenceCard(state.active, state.records)}
        </section>

        <section class="tt-mid-grid">
          ${renderWeeklyCard(state.active, state.records)}
          ${renderEvolutionCard(state.active, state.records)}
          ${renderPeriodCard(state.active)}
        </section>

        <section class="tt-bottom-grid">
          ${renderHistoryTable(state.records)}
          ${renderSelectionCard()}
        </section>

        ${renderDevelopmentSection(state.history)}

        ${renderConfigModal()}
        ${renderCustomModal()}
      </main>
    `;
  }

  // ---------- INTEGRAÇÃO CONTEXTUAL COM NOVO TRADE ----------

  function syncWorkbenchFocusBanner() {
    const newTradePage = document.getElementById('newtrade');
    if (!newTradePage) return;

    let banner = document.getElementById('ttContextualFocusBanner');
    const active = state.active;

    if (!active || !M.shouldShowOn(active, 'newtrade')) {
      if (banner) banner.remove();
      return;
    }

    if (state.dismissedBanners.has(active.id)) {
      if (banner) banner.remove();
      return;
    }

    const focusMsg = M.focusMessageFor(active);

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'ttContextualFocusBanner';
      banner.className = 'tt-contextual-focus-banner';

      // Insere logo antes do tradeFlow ou do card de formulário
      const flow = document.getElementById('tradeFlow') || newTradePage.querySelector('.grid');
      if (flow && flow.parentNode) {
        flow.parentNode.insertBefore(banner, flow);
      } else {
        newTradePage.prepend(banner);
      }
    }

    banner.innerHTML = `
      <div class="tt-focus-banner-left">
        <div class="tt-focus-banner-icon" aria-hidden="true">🎯</div>
        <div class="tt-focus-banner-text">
          <span class="tt-focus-banner-eyebrow">Seu foco atual · Treinamento de Trader</span>
          <strong class="tt-focus-banner-msg">“${esc(focusMsg)}”</strong>
          <span class="tt-focus-banner-sub">Antes de entrar, lembre-se do comportamento que você está treinando deliberadamente.</span>
        </div>
      </div>
      <button type="button" class="tt-btn-dismiss-focus" onclick="window.TraderTraining.dismissFocusBanner('${esc(active.id)}')">
        Entendi ✓
      </button>
    `;
  }

  // ---------- API PÚBLICA ----------

  root.TraderTraining = {
    getState: () => state,
    fetchState,
    render,
    syncWorkbenchFocusBanner,

    selectCategory: (catId) => {
      state.selectedCategory = catId;
      render();
    },

    pickCatalogItem: (itemId) => {
      state.selectedCatalogId = itemId;
      const item = M.catalogById(itemId);
      if (item) {
        state.modalGoalCandidate = {
          catalogId: item.id,
          title: item.title,
          category: item.category,
          durationDays: M.RECOMMENDED_DURATION,
          targetPct: M.RECOMMENDED_TARGET
        };
        state.modalOpen = true;
        render();
      }
    },

    setCandidateDuration: (days) => {
      if (state.modalGoalCandidate) {
        state.modalGoalCandidate.durationDays = days;
        render();
      }
    },

    setCandidateTarget: (target) => {
      if (state.modalGoalCandidate) {
        state.modalGoalCandidate.targetPct = target;
        render();
      }
    },

    confirmStartTraining: () => {
      if (state.modalGoalCandidate) {
        startTraining(state.modalGoalCandidate);
        state.modalOpen = false;
        state.modalGoalCandidate = null;
      }
    },

    closeModal: () => {
      state.modalOpen = false;
      state.modalGoalCandidate = null;
      render();
    },

    openCustomGoalModal: () => {
      state.customModalOpen = true;
      render();
    },

    closeCustomModal: () => {
      state.customModalOpen = false;
      render();
    },

    submitCustomGoal: () => {
      const input = document.getElementById('ttCustomTitleInput');
      const catSelect = document.getElementById('ttCustomCatSelect');
      const title = (input?.value || '').trim();
      const category = catSelect?.value || 'execution';
      if (!title || title.length < 3) {
        alert('Por favor, informe o comportamento que deseja treinar.');
        return;
      }
      state.customModalOpen = false;
      state.modalGoalCandidate = {
        title,
        category,
        durationDays: M.RECOMMENDED_DURATION,
        targetPct: M.RECOMMENDED_TARGET
      };
      state.modalOpen = true;
      render();
    },

    promptSwitchGoal: () => {
      if (confirm('Deseja realmente trocar seu objetivo de treinamento atual? O progresso do objetivo anterior será arquivado no seu desenvolvimento.')) {
        switchOrConcludeGoal('switched');
        root.TraderTraining.scrollToSelection();
      }
    },

    concludeAndSelectNext: () => {
      switchOrConcludeGoal();
      root.TraderTraining.scrollToSelection();
    },

    extendActiveGoal: (days) => {
      extendTraining(days);
    },

    scrollToSelection: () => {
      const el = document.getElementById('ttSelectionCard');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    dismissFocusBanner: (goalId) => {
      state.dismissedBanners.add(goalId);
      syncWorkbenchFocusBanner();
    },

    // Integração direta com Diário de Trades
    recordJournalAssessment: async ({ sourceRef, recordDate, ticker, outcome, rMultiple, assessment, note }) => {
      await saveRecord({ sourceRef, recordDate, ticker, outcome, rMultiple, assessment, note });
    }
  };

  // Inicialização e ouvintes
  window.addEventListener('DOMContentLoaded', () => {
    fetchState().then(() => {
      render();
      syncWorkbenchFocusBanner();
    });
  });

  window.addEventListener('healthyTrend:authenticated', () => {
    fetchState().then(() => {
      render();
      syncWorkbenchFocusBanner();
    });
  });

  window.addEventListener('healthyTrend:tradesUpdated', () => {
    syncWorkbenchFocusBanner();
  });

  // Exporta função global para window.go('tradertraining')
  window.renderTraderTraining = () => {
    fetchState().then(render);
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);

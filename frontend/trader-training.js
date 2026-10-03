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
    customModalOpen: false,
    skillModalItem: null,
    isLoading: false,
    dismissedBanners: new Set()
  };

  // Sanitização
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
        state.history.unshift({
          ...state.active,
          status: targetStatus,
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
      alert(err.message || 'Erro ao arquivar objetivo.');
    }
  }

  async function recordBehavior({ sourceRef, recordDate, assessment, note = '', ticker = '', outcome = 'open', rMultiple = null }) {
    if (!state.active) return;
    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        await root.healthyTrendApi.request('/api/trader-training/records', {
          method: 'POST',
          body: JSON.stringify({
            goalId: state.active.id,
            sourceRef,
            recordDate: M.toDateOnly(recordDate),
            assessment,
            note,
            ticker,
            outcome,
            rMultiple
          })
        });
      } else {
        const record = {
          id: `local-rec-${Date.now()}`,
          goalId: state.active.id,
          sourceRef,
          recordDate: M.toDateOnly(recordDate),
          assessment,
          note,
          ticker,
          outcome,
          rMultiple,
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
            Treinamento Deliberado
          </span>
          <h1 class="tt-hero-title">Treinamento de Trader</h1>
          <p class="tt-hero-subtitle">Lapide suas habilidades. Repita até virar hábito.</p>
          <div class="tt-hero-divider"></div>
          <div class="tt-hero-quote">
            “Você não precisa melhorar tudo ao mesmo tempo. Escolha um comportamento, treine, meça e transforme em hábito. Depois avance para o próximo.”
          </div>
        </div>
      </section>
    `;
  }

  function renderFocusStrip() {
    return `
      <div class="tt-focus-strip">
        <div class="tt-focus-strip-left">
          <span class="tt-focus-badge">🎯 FOCO ATUAL</span>
          <span class="tt-focus-rule-divider">·</span>
          <span class="tt-focus-rule-title">Regra Fundamental</span>
        </div>
        <div class="tt-focus-strip-text">
          “Uma habilidade por vez. Repetição suficiente. Medição objetiva. Até virar comportamento automático.”
        </div>
      </div>
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
          <div class="tt-goal-body" style="text-align:center; padding: 28px 0;">
            <div class="tt-goal-target-icon" style="margin: 0 auto 14px;">🎯</div>
            <h3 style="margin: 0 0 8px; font-size: 20px; color: #0f2c1d;">Nenhum treinamento ativo no momento</h3>
            <p style="margin: 0 0 20px; color: #557864; font-size: 14px;">Escolha um comportamento na biblioteca abaixo para iniciar seu período de foco e repetição deliberada.</p>
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
              <span class="tt-goal-kicker">Comportamento em Foco</span>
              <h3 class="tt-goal-title">“${esc(active.title)}”</h3>
            </div>
          </div>

          <div class="tt-goal-meta-grid">
            <div class="tt-meta-item">
              <span class="tt-meta-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Categoria
              </span>
              <span class="tt-meta-value">${esc(catLabel)}</span>
            </div>

            <div class="tt-meta-item">
              <span class="tt-meta-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Período
              </span>
              <span class="tt-meta-value">${startStr} → ${endStr}</span>
              <span class="tt-meta-sub">(${durationLabel})</span>
            </div>

            <div class="tt-meta-item">
              <span class="tt-meta-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
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
    const hasData = adh.applicable > 0;
    const scoreStr = hasData ? `${Math.round(adh.pct)}%` : '—';
    const fillPct = hasData ? Math.min(100, Math.max(0, adh.pct)) : 0;
    const ratioStr = hasData ? `${adh.correct} de ${adh.applicable} operações corretas` : 'Nenhuma operação registrada ainda';

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
            <small>${hasData ? 'calculado sobre casos aplicáveis' : 'aguardando primeira operação'}</small>
          </div>
        </div>

        ${!hasData ? `
          <div class="tt-adherence-empty-msg">
            “Seu treinamento começou. Registre seu comportamento nas próximas operações do Diário.”
          </div>
        ` : ''}

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
          <p style="color: #6a8c79; font-size: 13.5px; margin: 24px 0;">Inicie um treinamento para visualizar a evolução semanal da sua consistência.</p>
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

        <div class="tt-weekly-chart-wrap">
          <div class="tt-weekly-y-axis">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div class="tt-weekly-chart">
            ${weeks.map((week) => {
              const hasData = week.pct != null;
              const barHeight = hasData ? Math.min(100, Math.max(6, week.pct)) : 4;
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
            <span class="tt-card-icon">↗</span>
            <h2>Minha evolução</h2>
          </div>
        </header>

        <div class="tt-evolution-body">
          <div class="tt-evolution-icon-wrap" aria-hidden="true">
            ${insight.tone === 'up' ? '↗' : insight.tone === 'down' ? '↘' : insight.tone === 'empty' ? '🌱' : '➔'}
          </div>
          <div class="tt-evolution-copy">
            <h4>${esc(insight.title)}</h4>
            ${insight.tone === 'up' && insight.highlight ? `
              <p>Sua aderência aumentou <strong class="tt-stat-delta">+${esc(insight.highlight)}</strong> desde o início do treinamento.</p>
            ` : insight.tone === 'down' && insight.highlight ? `
              <p>Sua aderência caiu <strong class="tt-stat-delta bad">-${esc(insight.highlight)}</strong> desde o início. Revise os desvios no Diário.</p>
            ` : `
              <p>${esc(insight.message)}</p>
            `}
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
          <p style="color: #6a8c79; font-size: 13.5px; margin: 24px 0;">Defina um objetivo para acompanhar a linha do tempo do seu treinamento.</p>
        </article>
      `;
    }

    const progress = M.periodProgress(active);
    const startStr = M.formatDate(active.startDate, false);
    const endStr = M.formatDate(active.endDate, false);
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
        </div>

        ${conclusion ? `
          <div class="tt-motivation-box" style="background: rgba(39, 174, 96, 0.12); border-color: rgba(39, 174, 96, 0.3); color: #105930;">
            <div style="font-size: 24px;">${conclusion.reached ? '🏆' : '🔄'}</div>
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
            <div style="font-size: 24px;">🏆</div>
            <div>
              <b>Mantenha o foco!</b>
              <span>Você está no caminho para alcançar sua meta de consistência.</span>
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
            <span class="tt-card-icon">🕒</span>
            <h2>Histórico de comportamento</h2>
          </div>
          <span style="font-size: 12.5px; color: #557864; font-weight: 700;">
            ${list.length} registro${list.length === 1 ? '' : 's'} no período
          </span>
        </header>

        <div class="tt-notice-disclaimer">
          <span style="font-size: 16px;">⚖️</span>
          <span><b>Atenção pedagógica:</b> Resultado financeiro e qualidade da execução são coisas distintas. Uma operação pode perder dinheiro e ter execução correta; ou ganhar dinheiro e ter execução incorreta. O treinamento mede seu <b>comportamento e disciplina</b>.</span>
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
                  <td colspan="6" style="text-align: center; padding: 36px; color: #6a8c79;">
                    Nenhum comportamento registrado neste período ainda.<br>
                    <small style="display:block; margin-top: 6px; color: #87a896;">Ao registrar ou revisar suas operações no Diário de Trades, marque sua autoavaliação para alimentar esta tabela.</small>
                  </td>
                </tr>
              ` : list.map((item) => {
                const dateStr = M.formatDate(item.recordDate);
                const outLabel = M.outcomeLabel(item.outcome);
                const rStr = M.formatR(item.rMultiple);
                const assessClass = item.assessment;
                const assessLabel = M.assessmentLabel(item.assessment);
                const assessIcon = item.assessment === 'correct' ? '✓' : item.assessment === 'incorrect' ? '✕' : '—';

                return `
                  <tr>
                    <td><b>${dateStr}</b></td>
                    <td><b>${esc(item.ticker || '—')}</b></td>
                    <td class="outcome-${esc(item.outcome)}">${outLabel}</td>
                    <td class="r-val ${item.rMultiple > 0 ? 'outcome-gain' : item.rMultiple < 0 ? 'outcome-loss' : ''}">${rStr}</td>
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
            <span class="tt-card-icon">📋</span>
            <h2>Selecionar novo objetivo</h2>
          </div>
          <button type="button" class="tt-btn-primary" style="padding: 6px 14px; font-size: 12px;" onclick="window.TraderTraining.openCustomGoalModal()">
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
          <div style="padding: 18px; background: #f8fbf9; border-radius: 14px; border: 1px solid #dce8e0;">
            <h4 style="margin: 0 0 6px; font-size: 14.5px; color: #0d2c1e;">Criar objetivo personalizado</h4>
            <p style="margin: 0 0 16px; font-size: 13px; color: #557864; line-height: 1.5;">Defina qualquer regra ou comportamento específico que você deseja transformar em hábito através da repetição deliberada.</p>
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
                  <span class="tt-catalog-item-info" title="Ver detalhes do comportamento" onclick="event.stopPropagation(); window.TraderTraining.showSkillDetails('${item.id}')">ℹ</span>
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
          <span style="font-size: 12.5px; color: #557864; font-weight: 700;">
            Histórico de Habilidades Treinadas
          </span>
        </header>

        <div class="tt-development-timeline">
          ${past.map((goal) => {
            const isConsolidated = goal.status === 'consolidated';
            const statusLabel = isConsolidated ? 'Consolidado' : goal.status === 'developing' ? 'Em desenvolvimento' : 'Interrompido';
            const icon = isConsolidated ? '🟢' : goal.status === 'developing' ? '🔄' : '⚪';
            const adhLabel = goal.finalAdherence != null ? `${Math.round(goal.finalAdherence)}%` : goal.adherence != null ? `${Math.round(goal.adherence)}%` : '—';
            const catLabel = M.categoryLabel(goal.category);

            return `
              <div class="tt-development-card">
                <div class="tt-development-card-head">
                  <span class="tt-badge-status ${goal.status}">${icon} ${statusLabel}</span>
                  <strong style="font-size: 14.5px; color: #113421;">${adhLabel}</strong>
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

  function renderSkillDetailModal() {
    if (!state.skillModalItem) return '';
    const item = state.skillModalItem;
    const catLabel = M.categoryLabel(item.category);

    return `
      <div class="tt-modal-backdrop" onclick="if (event.target === this) window.TraderTraining.closeSkillModal()">
        <div class="tt-modal-dialog" role="dialog" aria-modal="true">
          <header class="tt-modal-header">
            <h3>Detalhes da Habilidade</h3>
            <button type="button" class="tt-modal-close" onclick="window.TraderTraining.closeSkillModal()" aria-label="Fechar">×</button>
          </header>

          <div class="tt-modal-summary-box">
            <small>${esc(catLabel)} · Treinamento Comportamental</small>
            <h4>“${esc(item.title)}”</h4>
          </div>

          <div class="tt-skill-detail-block">
            <small>Por que este comportamento importa?</small>
            <p>${esc(item.description || item.focus)}</p>
          </div>

          <div class="tt-skill-detail-block">
            <small>Critério de avaliação no Diário</small>
            <p>${esc(item.criteria || 'Marque "Executei corretamente" apenas quando respeitou integralmente a regra durante toda a operação.')}</p>
          </div>

          <footer class="tt-modal-actions">
            <button type="button" class="tt-btn-secondary" onclick="window.TraderTraining.closeSkillModal()">Fechar</button>
            <button type="button" class="tt-btn-primary" onclick="window.TraderTraining.chooseSkillFromDetails('${item.id}')">
              Treinar este objetivo →
            </button>
          </footer>
        </div>
      </div>
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

          <div style="padding: 12px 16px; background: #fafcfb; border-radius: 10px; font-size: 12.5px; color: #4b6e5b; border: 1px solid #dce8e0; line-height: 1.5;">
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
            <textarea id="ttCustomTitleInput" rows="3" style="width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cce0d4; border-radius: 10px; font: inherit; font-size: 13.5px;" placeholder="Ex: Não realizar lucro antes do meu plano de Sell Into Strength.">${esc(state.customGoal.title)}</textarea>
          </div>

          <div class="tt-form-group">
            <label>Categoria</label>
            <select id="ttCustomCatSelect" style="padding: 10px; border-radius: 10px; border: 1px solid #cce0d4; font: inherit; font-size: 13.5px;">
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

    document.body.classList.add('tt-active-screen');

    rootEl.innerHTML = `
      <main class="tt-page">
        ${renderHero()}
        ${renderFocusStrip()}

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
        ${renderSkillDetailModal()}
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
      const formCard = newTradePage.querySelector('.form-card') || newTradePage.querySelector('.hero') || newTradePage.firstChild;
      if (formCard && formCard.parentNode) {
        formCard.parentNode.insertBefore(banner, formCard.nextSibling);
      } else {
        newTradePage.prepend(banner);
      }
    }

    banner.innerHTML = `
      <div class="tt-contextual-focus-left">
        <span class="tt-contextual-focus-icon">🎯</span>
        <div>
          <span class="tt-contextual-focus-kicker">Seu foco atual em treinamento</span>
          <div class="tt-contextual-focus-title">“${esc(active.title)}”</div>
          <div class="tt-contextual-focus-sub">${esc(focusMsg)}</div>
        </div>
      </div>
      <button type="button" class="tt-btn-dismiss-focus" onclick="window.TraderTraining.dismissWorkbenchBanner('${active.id}')">
        Entendi
      </button>
    `;
  }

  // API Pública
  root.TraderTraining = {
    async init() {
      await fetchState();
      render();
      syncWorkbenchFocusBanner();
    },
    async refresh() {
      await fetchState();
      render();
      syncWorkbenchFocusBanner();
    },
    getState() {
      return {
        active: state.active,
        records: state.records,
        history: state.history
      };
    },
    getActiveGoal() {
      return state.active;
    },
    getRecords() {
      return state.records;
    },
    recordBehavior,
    recordJournalAssessment(payload) {
      return recordBehavior(payload);
    },
    syncWorkbenchFocusBanner,
    selectCategory(catId) {
      state.selectedCategory = catId;
      state.selectedCatalogId = null;
      render();
    },
    pickCatalogItem(catalogId) {
      state.selectedCatalogId = catalogId;
      const item = state.catalog.find(c => c.id === catalogId);
      if (!item) return;
      state.modalGoalCandidate = {
        catalogId: item.id,
        title: item.title,
        category: item.category,
        durationDays: 21,
        targetPct: 90
      };
      state.modalOpen = true;
      render();
    },
    showSkillDetails(catalogId) {
      const item = state.catalog.find(c => c.id === catalogId);
      if (!item) return;
      state.skillModalItem = item;
      render();
    },
    closeSkillModal() {
      state.skillModalItem = null;
      render();
    },
    chooseSkillFromDetails(catalogId) {
      state.skillModalItem = null;
      this.pickCatalogItem(catalogId);
    },
    openCustomGoalModal() {
      state.customGoal = {
        title: '',
        category: state.selectedCategory === 'custom' ? 'execution' : state.selectedCategory,
        durationDays: 21,
        targetPct: 90
      };
      state.customModalOpen = true;
      render();
    },
    closeCustomModal() {
      state.customModalOpen = false;
      render();
    },
    submitCustomGoal() {
      const titleInput = document.getElementById('ttCustomTitleInput');
      const catSelect = document.getElementById('ttCustomCatSelect');
      const title = (titleInput ? titleInput.value : state.customGoal.title).trim();
      const category = catSelect ? catSelect.value : state.customGoal.category;

      if (!title) {
        alert('Por favor, descreva o comportamento específico que você deseja treinar.');
        return;
      }

      state.customGoal.title = title;
      state.customGoal.category = category;
      state.customModalOpen = false;

      state.modalGoalCandidate = {
        title,
        category,
        durationDays: state.customGoal.durationDays || 21,
        targetPct: state.customGoal.targetPct || 90
      };
      state.modalOpen = true;
      render();
    },
    closeModal() {
      state.modalOpen = false;
      state.modalGoalCandidate = null;
      render();
    },
    setCandidateDuration(days) {
      if (state.modalGoalCandidate) {
        state.modalGoalCandidate.durationDays = days;
        render();
      }
    },
    setCandidateTarget(pct) {
      if (state.modalGoalCandidate) {
        state.modalGoalCandidate.targetPct = pct;
        render();
      }
    },
    async confirmStartTraining() {
      if (!state.modalGoalCandidate) return;
      const candidate = state.modalGoalCandidate;
      state.modalOpen = false;
      state.modalGoalCandidate = null;
      await startTraining(candidate);
    },
    async extendActiveGoal(days = 7) {
      await extendTraining(days);
    },
    async promptSwitchGoal() {
      if (!confirm('Você tem certeza que deseja trocar seu objetivo atual? O treinamento em andamento será arquivado para manter o foco em uma única habilidade por vez.')) {
        return;
      }
      await switchOrConcludeGoal('switched');
      this.scrollToSelection();
    },
    async concludeAndSelectNext() {
      if (state.active) {
        const finalSt = M.finalStatus(state.active, state.records);
        await switchOrConcludeGoal(finalSt);
      }
      this.scrollToSelection();
    },
    scrollToSelection() {
      const el = document.getElementById('ttSelectionCard');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    dismissWorkbenchBanner(goalId) {
      state.dismissedBanners.add(goalId);
      const b = document.getElementById('ttContextualFocusBanner');
      if (b) b.remove();
    }
  };

  root.renderTraderTraining = function () {
    root.TraderTraining.init();
  };

  // Observador de mutação e eventos de login
  document.addEventListener('DOMContentLoaded', () => {
    loadLocalState();
    if (document.getElementById('tradertraining')?.classList.contains('active')) {
      root.TraderTraining.init();
    }
  });

  window.addEventListener('healthyTrend:auth', () => {
    fetchState().then(render);
  });

})(typeof window !== 'undefined' ? window : globalThis);

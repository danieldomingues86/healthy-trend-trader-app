/**
 * HEALTHY TREND TRADER - DIÁRIO DO MERECIMENTO CONTROLLER
 * 
 * Controlador da interface da tela Diário do Merecimento (Treinamento do Trader).
 */

(function (root) {
  'use strict';

  const state = {
    loading: false,
    loaded: false,
    entries: [],
    evolution: null,
    period: '30d',
    selectedEmotions: new Set(['tranquil_satisfied']),
    intensity: 8,
    attachedImage: null, // { url, name, size }
    quoteIndex: 0,
    editingId: null,
    recentTrades: []
  };

  function getModel() {
    return root.DeservingDiaryModel;
  }

  function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Ponto de entrada global chamado por go('deservingdiary')
   */
  async function renderDeservingDiaryPage() {
    const container = document.getElementById('deservingdiary');
    if (!container) return;

    if (!container.querySelector('.deserving-diary-wrapper')) {
      container.innerHTML = `
        <div class="deserving-diary-wrapper" id="deservingDiaryRoot">
          <!-- O conteúdo dinâmico é injetado aqui -->
          <div class="dd-loading-placeholder" style="padding: 40px; text-align: center; color: #64748b;">
            Carregando Diário do Merecimento...
          </div>
        </div>
      `;
    }

    await loadInitialData();
    renderMainUi();
  }

  /**
   * Carrega os dados da API
   */
  async function loadInitialData() {
    state.loading = true;
    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        const data = await root.healthyTrendApi.request(`/api/deserving-diary?period=${state.period}`);
        state.entries = data.entries || [];
        state.evolution = data.evolution || null;

        // Tenta carregar trades recentes para o auto-complete opcional
        try {
          const tradesData = await root.healthyTrendApi.request('/api/trades');
          const allTrades = tradesData.trades || tradesData || [];
          state.recentTrades = allTrades
            .filter(t => t.status === 'closed' || t.status === 'archived' || t.exit_price || t.exitPrice)
            .slice(0, 10);
        } catch (_) {}
      } else {
        // Fallback local caso a API não esteja conectada
        const model = getModel();
        state.evolution = model ? model.calculateEvolution(state.entries, state.period) : null;
      }
      state.loaded = true;
    } catch (err) {
      console.error('[DeservingDiary] Erro ao carregar dados:', err);
    } finally {
      state.loading = false;
    }
  }

  /**
   * Renderiza toda a tela Diário do Merecimento
   */
  function renderMainUi() {
    const rootEl = document.getElementById('deservingDiaryRoot');
    if (!rootEl) return;

    const model = getModel();
    if (!model) return;

    const quote = model.getInspirationQuote(state.quoteIndex);

    rootEl.innerHTML = `
      <!-- 1. Hero Banner Superior -->
      <header class="dd-hero-banner" role="banner">
        <div class="dd-hero-left">
          <h1 class="dd-hero-title">Diário do <span>Merecimento</span></h1>
          <p class="dd-hero-quote">“Eu não registro apenas o dinheiro que ganhei. Registro a pessoa que estou me tornando ao aprender a recebê-lo.”</p>
        </div>
        <div class="dd-hero-right">
          <div class="dd-hero-calligraphy">
            Aprenda a receber.
            <span>Permita-se prosperar.</span>
          </div>
        </div>
      </header>

      <!-- 2. Grid de Conteúdo (Duas Colunas) -->
      <main class="dd-layout-grid">
        <!-- Coluna Esquerda: Formulário de Registro -->
        <section class="dd-card dd-form-card" aria-label="Registrar uma nova experiência">
          <header class="dd-card-header">
            <div class="dd-card-title-row">
              <span class="dd-card-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
                  <line x1="16" y1="8" x2="2" y2="22"/>
                  <line x1="17.5" y1="15" x2="9" y2="15"/>
                </svg>
              </span>
              <h2 class="dd-card-title">${state.editingId ? 'Editar experiência' : 'Registrar uma nova experiência'}</h2>
            </div>
            <p class="dd-card-subtitle">Transforme cada lucro em um momento de aprendizado e gratidão.</p>
          </header>

          <form class="dd-form" id="ddEntryForm" onsubmit="window.DeservingDiary.handleFormSubmit(event)">
            <!-- Linha 1: Data e Ativo -->
            <div class="dd-form-row-2col">
              <div class="dd-field-group">
                <label class="dd-field-label" for="ddEntryDate">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Data da Realização
                </label>
                <input
                  type="date"
                  id="ddEntryDate"
                  class="dd-input-date"
                  value="${new Date().toISOString().slice(0, 10)}"
                  required
                />
              </div>

              <div class="dd-field-group">
                <label class="dd-field-label" for="ddTicker">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  Qual(is) ativo(s)?
                </label>
                <div class="dd-input-wrap">
                  <input
                    type="text"
                    id="ddTicker"
                    class="dd-input-text dd-ticker-input"
                    placeholder="Ex.: MGLU3"
                    oninput="this.value = this.value.toUpperCase()"
                  />
                </div>
                ${state.recentTrades.length > 0 ? `
                  <button type="button" class="dd-trade-picker-btn" onclick="window.DeservingDiary.pickRecentTrade()">
                    ⚡ Preencher com trade recente
                  </button>
                ` : ''}
              </div>
            </div>

            <!-- Linha 2: Emoções ao embolsar o lucro -->
            <div class="dd-field-group">
              <label class="dd-field-label">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
                Como você se sentiu ao embolsar o lucro?
              </label>
              <div class="dd-emotions-grid" role="group" aria-label="Seleção de emoções">
                ${model.EMOTIONS.map(em => `
                  <button
                    type="button"
                    class="dd-emotion-chip ${state.selectedEmotions.has(em.id) ? 'active' : ''}"
                    data-id="${em.id}"
                    onclick="window.DeservingDiary.toggleEmotion('${em.id}')"
                    title="${esc(em.description)}"
                  >
                    ${renderEmotionIconSvg(em.icon)}
                    <span>${esc(em.label)}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Linha 3: Slider de Intensidade -->
            <div class="dd-slider-wrap">
              <div class="dd-slider-header">
                <span>Intensidade da emoção:</span>
                <span class="dd-intensity-badge" id="ddIntensityVal">${state.intensity}/10</span>
              </div>
              <input
                type="range"
                id="ddIntensitySlider"
                class="dd-range-input"
                min="0"
                max="10"
                step="1"
                value="${state.intensity}"
                oninput="window.DeservingDiary.handleIntensityChange(this.value)"
                aria-label="Intensidade da emoção de 0 a 10"
              />
              <div class="dd-slider-labels">
                <span>Baixa</span>
                <span>Moderada</span>
                <span>Muito alta</span>
              </div>
            </div>

            <!-- Linha 4: O que passou pela cabeça -->
            <div class="dd-field-group">
              <label class="dd-field-label" for="ddThought">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7M9 21h6"/>
                </svg>
                O que passou pela sua cabeça naquele momento?
              </label>
              <textarea
                id="ddThought"
                class="dd-textarea"
                placeholder="Ex.: O alvo chegou em dois dias. Será que foi fácil demais?"
              ></textarea>
            </div>

            <!-- Linha 5: Como agiu profissionalmente -->
            <div class="dd-field-group">
              <label class="dd-field-label" for="ddProfAction">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                  <path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                </svg>
                Como você agiu profissionalmente?
              </label>
              <textarea
                id="ddProfAction"
                class="dd-textarea"
                placeholder="Ex.: Respeitei meu plano, evitei a ganância e realizei o lucro."
              ></textarea>
            </div>

            <!-- Linha 6: O que quero ensinar a mim mesmo -->
            <div class="dd-field-group">
              <label class="dd-field-label" for="ddLearning">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
                </svg>
                O que quero ensinar a mim mesmo com essa experiência?
              </label>
              <textarea
                id="ddLearning"
                class="dd-textarea"
                placeholder="Ex.: Posso ganhar dinheiro em poucos dias e ficar tranquilo."
              ></textarea>
            </div>

            <!-- Linha 7: Anexar imagem opcional -->
            <div class="dd-attachment-box">
              <div class="dd-attachment-left">
                <span class="dd-attachment-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </span>
                <div class="dd-attachment-info">
                  <strong>Anexar imagem (opcional)</strong>
                  <small id="ddAttachStatus">Adicione um print do gráfico ou uma imagem especial.</small>
                </div>
              </div>

              ${state.attachedImage ? `
                <div class="dd-preview-box">
                  <img src="${esc(state.attachedImage.url)}" class="dd-preview-thumb" alt="Anexo do trade" />
                  <button type="button" class="dd-preview-remove-btn" onclick="window.DeservingDiary.removeAttachment()">
                    ✕ Remover
                  </button>
                </div>
              ` : `
                <div>
                  <input
                    type="file"
                    id="ddFileInput"
                    accept="image/*"
                    style="display:none"
                    onchange="window.DeservingDiary.handleFileSelected(event)"
                  />
                  <button type="button" class="dd-attach-btn" onclick="document.getElementById('ddFileInput').click()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Selecionar Imagem
                  </button>
                </div>
              `}
            </div>

            <!-- Linha 8: Botões de Ação -->
            <div class="dd-form-actions">
              <button type="button" class="dd-btn-clean" onclick="window.DeservingDiary.resetForm()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Limpar
              </button>
              <button type="submit" class="dd-btn-save">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                ${state.editingId ? 'Atualizar registro' : 'Salvar meu registro'}
              </button>
            </div>
          </form>
        </section>

        <!-- Coluna Direita: Minha Evolução, Inspiração e Histórico -->
        <div class="dd-right-col">
          <!-- Card 1: Minha Evolução -->
          <section class="dd-card dd-evolution-card" aria-label="Minha Evolução">
            <header class="dd-evolution-header">
              <div class="dd-card-title-row">
                <span class="dd-card-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                </span>
                <h3 class="dd-card-title" style="font-size: 17px;">Minha Evolução</h3>
              </div>
              <select
                class="dd-period-select"
                aria-label="Filtrar período de evolução"
                onchange="window.DeservingDiary.changePeriod(this.value)"
              >
                <option value="30d" ${state.period === '30d' ? 'selected' : ''}>Últimos 30 dias</option>
                <option value="90d" ${state.period === '90d' ? 'selected' : ''}>Últimos 90 dias</option>
                <option value="all" ${state.period === 'all' ? 'selected' : ''}>Todo o histórico</option>
              </select>
            </header>

            <!-- 4 KPIs de Resumo Emocional -->
            <div class="dd-kpis-grid">
              <div class="dd-kpi-item">
                <span class="dd-kpi-icon">🏆</span>
                <strong class="dd-kpi-val">${state.evolution?.totalCount || 0}</strong>
                <span class="dd-kpi-label">Registros</span>
              </div>
              <div class="dd-kpi-item">
                <span class="dd-kpi-icon">💛</span>
                <strong class="dd-kpi-val">${state.evolution?.anxietyAvg ? state.evolution.anxietyAvg + '/10' : '—'}</strong>
                <span class="dd-kpi-label">Ansiedade média</span>
              </div>
              <div class="dd-kpi-item">
                <span class="dd-kpi-icon">😀</span>
                <strong class="dd-kpi-val">${state.evolution?.tranquilityAvg ? state.evolution.tranquilityAvg + '/10' : '—'}</strong>
                <span class="dd-kpi-label">Tranquilidade média</span>
              </div>
              <div class="dd-kpi-item">
                <span class="dd-kpi-icon">⭐</span>
                <strong class="dd-kpi-val">${state.evolution?.planExecutionPct != null ? state.evolution.planExecutionPct + '%' : '100%'}</strong>
                <span class="dd-kpi-label">Execução do plano</span>
              </div>
            </div>

            <!-- Gráfico de Linha de Evolução Emocional -->
            <div class="dd-chart-box">
              <div class="dd-chart-legend">
                <div class="dd-legend-item">
                  <span class="dd-legend-dot anxiety"></span>
                  <span>Ansiedade</span>
                </div>
                <div class="dd-legend-item">
                  <span class="dd-legend-dot tranquility"></span>
                  <span>Tranquilidade</span>
                </div>
              </div>

              ${renderEvolutionChartSvg(state.evolution)}
            </div>
          </section>

          <!-- Card 2: Frase de Inspiração -->
          <article class="dd-inspiration-card" aria-label="Frase de Inspiração">
            <button
              type="button"
              class="dd-quote-rotate-btn"
              onclick="window.DeservingDiary.nextQuote()"
              title="Ver outra reflexão"
              aria-label="Ver outra reflexão"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
            </button>
            <span class="dd-quote-marks" aria-hidden="true">“</span>
            <h4 class="dd-inspiration-title">${esc(quote.title)}</h4>
            <p class="dd-inspiration-body">${esc(quote.body)}</p>
            <div class="dd-lotus-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 3c-2 4-5 6-5 9a5 5 0 0 0 10 0c0-3-3-5-5-9z"/>
                <path d="M12 21c-4-1-8-5-8-9 3-1 6 1 8 5"/>
                <path d="M12 21c4-1 8-5 8-9-3-1-6 1-8 5"/>
              </svg>
            </div>
          </article>

          <!-- Card 3: Histórico de Experiências -->
          <section class="dd-card dd-history-card" aria-label="Histórico de Experiências">
            <header class="dd-history-header">
              <div class="dd-card-title-row">
                <span class="dd-card-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                <h3 class="dd-card-title" style="font-size: 16px;">Histórico de Experiências</h3>
              </div>
              <a href="javascript:void(0)" class="dd-see-all-link" onclick="window.DeservingDiary.openHistoryModal()">
                Ver todos →
              </a>
            </header>

            <div class="dd-history-list">
              ${renderRecentHistoryItems(state.entries)}
            </div>
          </section>
        </div>
      </main>

      <!-- Modais Compartilhados -->
      <div id="ddModalContainer"></div>
    `;
  }

  /**
   * Renderiza os itens recentes do histórico
   */
  function renderRecentHistoryItems(entries) {
    if (!entries || entries.length === 0) {
      return `
        <div style="padding: 20px; text-align: center; color: #64748b; font-size: 12.5px;">
          Nenhuma experiência registrada ainda.<br>
          <small style="color: #94a3b8;">Registre suas reflexões ao lado para cultivar a tranquilidade no lucro.</small>
        </div>
      `;
    }

    const model = getModel();
    const recent = entries.slice(0, 4);

    return recent.map(entry => {
      const emMeta = entry.emotions && entry.emotions.length > 0
        ? model.getEmotionMeta(entry.emotions[0])
        : null;

      const snippet = entry.thought || entry.learning || (emMeta ? emMeta.label : 'Reflexão registrada.');

      return `
        <article class="dd-history-item" onclick="window.DeservingDiary.openDetailModal('${esc(entry.id)}')">
          <div class="dd-history-thumb">
            ${entry.attachmentUrl
              ? `<img src="${esc(entry.attachmentUrl)}" alt="Print do trade" />`
              : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>`
            }
          </div>
          <div class="dd-history-content">
            <div class="dd-history-top-row">
              <div class="dd-history-meta">
                <span class="dd-history-date">${esc(entry.entryDateBr || entry.entryDate)}</span>
                <strong class="dd-history-ticker">${esc(entry.ticker || 'GERAL')}</strong>
              </div>
              <span class="dd-result-badge">Lucro realizado</span>
            </div>
            <p class="dd-history-snippet">${esc(snippet)}</p>
          </div>
          <span class="dd-history-arrow">›</span>
        </article>
      `;
    }).join('');
  }

  /**
   * Renderiza gráfico SVG elegante de Ansiedade vs Tranquilidade
   */
  function renderEvolutionChartSvg(evolution) {
    if (!evolution || !evolution.hasEnoughData || !evolution.chartPoints || evolution.chartPoints.length < 2) {
      return `
        <div class="dd-chart-empty-state">
          <strong>Ainda não há dados suficientes</strong><br>
          Registre suas próximas experiências para acompanhar a evolução dos seus padrões emocionais ao longo do tempo.
        </div>
      `;
    }

    const pts = evolution.chartPoints;
    const width = 420;
    const height = 130;
    const padL = 26;
    const padR = 16;
    const padT = 14;
    const padB = 24;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    function getX(index) {
      return padL + (index / (pts.length - 1)) * plotW;
    }

    function getY(val) {
      const clamped = Math.max(0, Math.min(10, Number(val) || 0));
      return padT + plotH - (clamped / 10) * plotH;
    }

    // Cria caminhos lineares suaves
    const anxietyCoords = pts.map((p, i) => `${getX(i).toFixed(1)},${getY(p.anxiety).toFixed(1)}`);
    const tranquilCoords = pts.map((p, i) => `${getX(i).toFixed(1)},${getY(p.tranquility).toFixed(1)}`);

    const anxietyPath = `M ${anxietyCoords.join(' L ')}`;
    const tranquilPath = `M ${tranquilCoords.join(' L ')}`;

    // Áreas de preenchimento
    const anxietyArea = `${anxietyPath} L ${getX(pts.length - 1)},${padT + plotH} L ${padL},${padT + plotH} Z`;
    const tranquilArea = `${tranquilPath} L ${getX(pts.length - 1)},${padT + plotH} L ${padL},${padT + plotH} Z`;

    return `
      <svg class="dd-evolution-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="anxietyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ea580c" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="tranquilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <!-- Linhas de Grade Horizontais -->
        <line x1="${padL}" y1="${getY(0)}" x2="${width - padR}" y2="${getY(0)}" stroke="#e2e8f0" stroke-width="1"/>
        <line x1="${padL}" y1="${getY(5)}" x2="${width - padR}" y2="${getY(5)}" stroke="#f1f5f9" stroke-dasharray="3,3" stroke-width="1"/>
        <line x1="${padL}" y1="${getY(10)}" x2="${width - padR}" y2="${getY(10)}" stroke="#f1f5f9" stroke-width="1"/>

        <!-- Labels Eixo Y -->
        <text x="${padL - 6}" y="${getY(10) + 4}" font-size="9" fill="#94a3b8" text-anchor="end">10</text>
        <text x="${padL - 6}" y="${getY(5) + 3}" font-size="9" fill="#94a3b8" text-anchor="end">5</text>
        <text x="${padL - 6}" y="${getY(0) + 2}" font-size="9" fill="#94a3b8" text-anchor="end">0</text>

        <!-- Áreas preenchidas -->
        <path d="${anxietyArea}" fill="url(#anxietyGrad)"/>
        <path d="${tranquilArea}" fill="url(#tranquilGrad)"/>

        <!-- Linhas principais -->
        <path d="${anxietyPath}" fill="none" stroke="#ea580c" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${tranquilPath}" fill="none" stroke="#10b981" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Pontos do gráfico e labels do Eixo X -->
        ${pts.map((p, i) => `
          <circle cx="${getX(i)}" cy="${getY(p.anxiety)}" r="3.5" fill="#ffffff" stroke="#ea580c" stroke-width="2">
            <title>Ansiedade: ${p.anxiety}/10 (${p.date} - ${p.ticker})</title>
          </circle>
          <circle cx="${getX(i)}" cy="${getY(p.tranquility)}" r="3.5" fill="#ffffff" stroke="#10b981" stroke-width="2">
            <title>Tranquilidade: ${p.tranquility}/10 (${p.date} - ${p.ticker})</title>
          </circle>
          <text x="${getX(i)}" y="${height - 6}" font-size="9.5" fill="#64748b" text-anchor="middle">
            ${p.label}
          </text>
        `).join('')}
      </svg>
    `;
  }

  /**
   * Renderiza ícone SVG para cada emoção
   */
  function renderEmotionIconSvg(iconName) {
    switch (iconName) {
      case 'smile':
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
      case 'zap':
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
      case 'frown':
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
      case 'trending-up':
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`;
      case 'shield-alert':
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      case 'award':
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`;
      case 'alert-circle':
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      default:
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
  }

  // =========================================================================
  // HANDLERS E EVENTOS
  // =========================================================================

  function toggleEmotion(emotionId) {
    if (state.selectedEmotions.has(emotionId)) {
      state.selectedEmotions.delete(emotionId);
    } else {
      state.selectedEmotions.add(emotionId);
    }
    // Atualiza classes dos botões diretamente para resposta instantânea
    document.querySelectorAll('.dd-emotion-chip').forEach(btn => {
      const id = btn.getAttribute('data-id');
      btn.classList.toggle('active', state.selectedEmotions.has(id));
    });
  }

  function handleIntensityChange(val) {
    state.intensity = Number(val);
    const badge = document.getElementById('ddIntensityVal');
    if (badge) badge.textContent = `${state.intensity}/10`;
  }

  function nextQuote() {
    const model = getModel();
    if (!model) return;
    state.quoteIndex = (state.quoteIndex + 1) % model.INSPIRATION_QUOTES.length;
    renderMainUi();
  }

  function changePeriod(newPeriod) {
    state.period = newPeriod;
    loadInitialData().then(() => renderMainUi());
  }

  function resetForm() {
    state.editingId = null;
    state.selectedEmotions = new Set(['tranquil_satisfied']);
    state.intensity = 8;
    state.attachedImage = null;

    const form = document.getElementById('ddEntryForm');
    if (form) form.reset();

    const dateInput = document.getElementById('ddEntryDate');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

    const intensitySlider = document.getElementById('ddIntensitySlider');
    if (intensitySlider) intensitySlider.value = '8';

    const intensityVal = document.getElementById('ddIntensityVal');
    if (intensityVal) intensityVal.textContent = '8/10';

    document.querySelectorAll('.dd-emotion-chip').forEach(btn => {
      const id = btn.getAttribute('data-id');
      btn.classList.toggle('active', state.selectedEmotions.has(id));
    });

    renderMainUi();
  }

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 15 MB.');
      return;
    }

    const statusEl = document.getElementById('ddAttachStatus');
    if (statusEl) statusEl.textContent = 'Enviando imagem...';

    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.uploadFile === 'function') {
        const res = await root.healthyTrendApi.uploadFile('/api/deserving-diary/attachments', file);
        state.attachedImage = res.attachment;
      } else {
        // Fallback leitor local dataURL
        const reader = new FileReader();
        reader.onload = (e) => {
          state.attachedImage = {
            url: e.target.result,
            name: file.name,
            size: file.size
          };
          renderMainUi();
        };
        reader.readAsDataURL(file);
        return;
      }
      renderMainUi();
    } catch (err) {
      console.error('[DeservingDiary] Falha ao enviar anexo:', err);
      alert('Não foi possível anexar a imagem agora.');
      if (statusEl) statusEl.textContent = 'Adicione um print do gráfico ou uma imagem especial.';
    }
  }

  function removeAttachment() {
    state.attachedImage = null;
    renderMainUi();
  }

  function pickRecentTrade() {
    if (!state.recentTrades || state.recentTrades.length === 0) return;
    const first = state.recentTrades[0];
    const tickerInput = document.getElementById('ddTicker');
    if (tickerInput && first.ticker) {
      tickerInput.value = first.ticker.toUpperCase();
    }
    const thoughtInput = document.getElementById('ddThought');
    if (thoughtInput && !thoughtInput.value) {
      thoughtInput.value = `Alvo atingido no trade de ${first.ticker}.`;
    }
  }

  async function handleFormSubmit(event) {
    event.preventDefault();

    const dateVal = document.getElementById('ddEntryDate')?.value;
    const tickerVal = document.getElementById('ddTicker')?.value;
    const thoughtVal = document.getElementById('ddThought')?.value;
    const profActionVal = document.getElementById('ddProfAction')?.value;
    const learningVal = document.getElementById('ddLearning')?.value;

    const payload = {
      entryDate: dateVal,
      ticker: tickerVal,
      resultType: 'target_reached',
      emotions: Array.from(state.selectedEmotions),
      emotionIntensity: state.intensity,
      thought: thoughtVal,
      professionalAction: profActionVal,
      learning: learningVal,
      attachmentUrl: state.attachedImage?.url || null,
      attachmentName: state.attachedImage?.name || null,
      attachmentSize: state.attachedImage?.size || null
    };

    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        if (state.editingId) {
          await root.healthyTrendApi.request(`/api/deserving-diary/${state.editingId}`, {
            method: 'PUT',
            body: payload
          });
        } else {
          await root.healthyTrendApi.request('/api/deserving-diary', {
            method: 'POST',
            body: payload
          });
        }
      } else {
        // Fallback local
        const id = state.editingId || String(Date.now());
        const record = { ...payload, id };
        if (state.editingId) {
          const idx = state.entries.findIndex(e => e.id === state.editingId);
          if (idx !== -1) state.entries[idx] = record;
        } else {
          state.entries.unshift(record);
        }
      }

      resetForm();
      await loadInitialData();
      renderMainUi();

      if (typeof root.toast === 'function') {
        root.toast('Experiência registrada com sucesso no Diário do Merecimento!');
      }
    } catch (err) {
      console.error('[DeservingDiary] Falha ao salvar registro:', err);
      alert('Não foi possível salvar a reflexão: ' + err.message);
    }
  }

  // =========================================================================
  // MODAIS (HISTÓRICO COMPLETO E DETALHE)
  // =========================================================================

  function openDetailModal(entryId) {
    const entry = state.entries.find(e => e.id === entryId);
    if (!entry) return;

    state.activeEntryDetail = entry;
    const container = document.getElementById('ddModalContainer');
    if (!container) return;

    const model = getModel();
    const emotionsList = Array.isArray(entry.emotions)
      ? entry.emotions.map(id => model.getEmotionMeta(id).label).join(', ')
      : 'Não especificado';

    container.innerHTML = `
      <div class="dd-modal-overlay open" id="ddDetailOverlay" onclick="if(event.target===this) window.DeservingDiary.closeModal()">
        <div class="dd-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="ddDetailTitle">
          <header class="dd-modal-header">
            <h3 id="ddDetailTitle">Experiência em ${esc(entry.ticker || 'Trade')} (${esc(entry.entryDateBr || entry.entryDate)})</h3>
            <button type="button" class="dd-modal-close-btn" onclick="window.DeservingDiary.closeModal()">✕</button>
          </header>

          <div class="dd-modal-body">
            <div class="dd-detail-section">
              <span class="dd-detail-label">Emoções relatadas:</span>
              <div class="dd-detail-value">
                <strong>${esc(emotionsList)}</strong>
                ${entry.emotionIntensity != null ? ` — Intensidade: <b>${entry.emotionIntensity}/10</b>` : ''}
              </div>
            </div>

            ${entry.thought ? `
              <div class="dd-detail-section">
                <span class="dd-detail-label">O que passou pela cabeça:</span>
                <div class="dd-detail-value">${esc(entry.thought)}</div>
              </div>
            ` : ''}

            ${entry.professionalAction ? `
              <div class="dd-detail-section">
                <span class="dd-detail-label">Ação profissional / cumprimento do plano:</span>
                <div class="dd-detail-value">${esc(entry.professionalAction)}</div>
              </div>
            ` : ''}

            ${entry.learning ? `
              <div class="dd-detail-section">
                <span class="dd-detail-label">Aprendizado pessoal:</span>
                <div class="dd-detail-value">${esc(entry.learning)}</div>
              </div>
            ` : ''}

            ${entry.attachmentUrl ? `
              <div class="dd-detail-section">
                <span class="dd-detail-label">Print do gráfico / anexo:</span>
                <img src="${esc(entry.attachmentUrl)}" style="max-width:100%; border-radius:10px; border:1px solid #cbd5e1; margin-top:6px;" alt="Anexo do trade" />
              </div>
            ` : ''}
          </div>

          <footer class="dd-modal-footer">
            <button type="button" class="dd-modal-del-btn" onclick="window.DeservingDiary.deleteEntry('${esc(entry.id)}')">
              🗑 Excluir registro
            </button>
            <button type="button" class="dd-btn-clean" onclick="window.DeservingDiary.editEntry('${esc(entry.id)}')">
              ✏️ Editar no formulário
            </button>
          </footer>
        </div>
      </div>
    `;
  }

  function openHistoryModal() {
    const container = document.getElementById('ddModalContainer');
    if (!container) return;

    container.innerHTML = `
      <div class="dd-modal-overlay open" id="ddHistoryOverlay" onclick="if(event.target===this) window.DeservingDiary.closeModal()">
        <div class="dd-modal-dialog" style="max-width: 780px;" role="dialog" aria-modal="true">
          <header class="dd-modal-header">
            <h3>Histórico de Reflexões do Merecimento (${state.entries.length})</h3>
            <button type="button" class="dd-modal-close-btn" onclick="window.DeservingDiary.closeModal()">✕</button>
          </header>

          <div class="dd-modal-body">
            <div class="dd-history-list">
              ${state.entries.length === 0 ? `
                <p style="text-align:center; color:#64748b;">Nenhum registro encontrado.</p>
              ` : state.entries.map(entry => `
                <article class="dd-history-item" onclick="window.DeservingDiary.openDetailModal('${esc(entry.id)}')">
                  <div class="dd-history-thumb">
                    ${entry.attachmentUrl
                      ? `<img src="${esc(entry.attachmentUrl)}" alt="Print" />`
                      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>`
                    }
                  </div>
                  <div class="dd-history-content">
                    <div class="dd-history-top-row">
                      <div class="dd-history-meta">
                        <span class="dd-history-date">${esc(entry.entryDateBr || entry.entryDate)}</span>
                        <strong class="dd-history-ticker">${esc(entry.ticker || 'GERAL')}</strong>
                      </div>
                      <span class="dd-result-badge">Lucro realizado</span>
                    </div>
                    <p class="dd-history-snippet">${esc(entry.thought || entry.learning || 'Reflexão registrada.')}</p>
                  </div>
                  <span class="dd-history-arrow">›</span>
                </article>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function closeModal() {
    const overlay = document.querySelector('.dd-modal-overlay');
    if (overlay) overlay.remove();
  }

  function editEntry(entryId) {
    const entry = state.entries.find(e => e.id === entryId);
    if (!entry) return;

    closeModal();
    state.editingId = entry.id;
    state.selectedEmotions = new Set(Array.isArray(entry.emotions) ? entry.emotions : []);
    state.intensity = typeof entry.emotionIntensity === 'number' ? entry.emotionIntensity : 8;
    if (entry.attachmentUrl) {
      state.attachedImage = {
        url: entry.attachmentUrl,
        name: entry.attachmentName || 'anexo.png',
        size: entry.attachmentSize || 0
      };
    }

    renderMainUi();

    // Preenche campos do formulário
    setTimeout(() => {
      const dateInput = document.getElementById('ddEntryDate');
      if (dateInput) dateInput.value = entry.entryDate;

      const tickerInput = document.getElementById('ddTicker');
      if (tickerInput) tickerInput.value = entry.ticker;

      const thoughtInput = document.getElementById('ddThought');
      if (thoughtInput) thoughtInput.value = entry.thought;

      const profActionInput = document.getElementById('ddProfAction');
      if (profActionInput) profActionInput.value = entry.professionalAction;

      const learningInput = document.getElementById('ddLearning');
      if (learningInput) learningInput.value = entry.learning;

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  }

  async function deleteEntry(entryId) {
    if (!confirm('Deseja realmente excluir este registro do diário? Essa ação não pode ser desfeita.')) {
      return;
    }

    closeModal();
    try {
      if (root.healthyTrendApi && typeof root.healthyTrendApi.request === 'function') {
        await root.healthyTrendApi.request(`/api/deserving-diary/${entryId}`, { method: 'DELETE' });
      } else {
        const idx = state.entries.findIndex(e => e.id === entryId);
        if (idx !== -1) state.entries.splice(idx, 1);
      }
      await loadInitialData();
      renderMainUi();
      if (typeof root.toast === 'function') {
        root.toast('Registro excluído com sucesso.');
      }
    } catch (err) {
      console.error('[DeservingDiary] Falha ao excluir:', err);
      alert('Erro ao excluir registro: ' + err.message);
    }
  }

  // Exportações públicas
  root.renderDeservingDiaryPage = renderDeservingDiaryPage;
  root.DeservingDiary = {
    render: renderDeservingDiaryPage,
    toggleEmotion,
    handleIntensityChange,
    nextQuote,
    changePeriod,
    resetForm,
    handleFileSelected,
    removeAttachment,
    pickRecentTrade,
    handleFormSubmit,
    openDetailModal,
    openHistoryModal,
    closeModal,
    editEntry,
    deleteEntry
  };

})(typeof window !== 'undefined' ? window : global);

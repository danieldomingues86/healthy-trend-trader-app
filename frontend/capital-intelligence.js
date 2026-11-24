/**
 * HEALTHY TREND TRADER — CAPITAL INTELLIGENCE
 * O Mapa Vivo do Seu Dinheiro — Experiência Visual Premium & Motor 3D Canvas
 */

(function (root) {
  'use strict';

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== 'string') return `rgba(16, 185, 129, ${alpha})`;
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return `rgba(16, 185, 129, ${alpha})`;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getRoot() {
    let el = document.getElementById('capitalIntelligenceRoot');
    if (!el) {
      const page = document.getElementById('capitalintelligence');
      if (page) {
        page.innerHTML = '<div id="capitalIntelligenceRoot"></div>';
        el = document.getElementById('capitalIntelligenceRoot');
      }
    }
    return el;
  }

  class CapitalIntelligenceController {
    constructor() {
      const ModelCtor = root.CapitalIntelligenceModel;
      this.model = ModelCtor ? new ModelCtor() : null;
      this.isInitialized = false;
      this.activeUniverse = 'all';
      this.selectedNodeId = null;
      this.selectedConnectionId = null;
      this.isAllocationModalOpen = false;

      // Canvas / Viewport state
      this.canvas = null;
      this.ctx = null;
      this.width = 960;
      this.height = 600;
      this.dpr = 1;
      this.scale = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.isPanning = false;
      this.draggedNode = null;
      this.hoveredNodeId = null;
      this.hoveredConnectionId = null;
      this.pointerDownPos = { x: 0, y: 0 };
      this.lastPointerPos = { x: 0, y: 0 };
      this.didMovePointer = false;

      // Node custom offsets (when user drags a sphere)
      this.nodeOffsets = {};

      // Subtle living animations
      this.animationFrameId = null;
      this.time = 0;
      this.particles = [];
      this.ambientMotes = [];
      this.resizeObserver = null;
      this.hasRequestedLiveApi = false;
    }

    init() {
      const container = getRoot();
      if (!container || !this.model) return;

      if (!this.isInitialized) {
        this.isInitialized = true;
        this.hydrateFromSystem();
        this.seedAmbientMotes();
        this.seedConnectionParticles();
        this.renderShell(container);
        this.bindCanvasEvents();
        this.setupResizeHandling();
        this.startAnimationLoop();
        this.fetchLiveMarketContext();
      } else {
        this.hydrateFromSystem();
        this.resizeCanvas();
        this.renderExecutiveRail();
        this.renderDailyFooterStrip();
        this.renderHeaderStatus();
        this.draw();
      }
    }

    render() {
      this.init();
      // Re-measure canvas once section becomes visible
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          this.resizeCanvas();
          this.draw();
        });
      }
    }

    hydrateFromSystem(extraState = {}) {
      if (!this.model) return;
      this.model.hydrateFromSystemState(extraState);
    }

    async fetchLiveMarketContext() {
      if (this.hasRequestedLiveApi) return;
      const api = root.healthyTrendApi;
      if (!api || typeof api.request !== 'function') return;
      this.hasRequestedLiveApi = true;

      try {
        // Consome exclusivamente a API interna apoiada em cache/banco (zero chamadas externas por acesso)
        const snapshot = await api.request('/api/capital-intelligence/snapshot');
        if (snapshot && snapshot.spheres) {
          this.model.hydrateFromPipelineSnapshot(snapshot);
          // Reaplica camada local de contas da Atualização Diária caso Equity ainda não esteja no snapshot
          this.model.hydrateFromSystemState();
          this.renderHeaderStatus();
          this.renderExecutiveRail();
          this.renderDailyFooterStrip();
          if (this.selectedNodeId) {
            this.renderNodeDrawer(this.selectedNodeId);
          }
          this.draw();
        }
      } catch (_err) {
        // Silencioso: mantém o estado indisponível/estrutural sem inventar dados
      }
    }

    seedAmbientMotes() {
      this.ambientMotes = [];
      for (let i = 0; i < 22; i++) {
        this.ambientMotes.push({
          nx: (i * 0.173 + 0.07) % 1,
          ny: (i * 0.291 + 0.11) % 1,
          r: 0.7 + (i % 3) * 0.45,
          speed: 0.004 + (i % 5) * 0.002,
          phase: i * 0.9,
          color: i % 4 === 0 ? '#f3d58d' : i % 3 === 0 ? '#6ee7b7' : '#93c5fd'
        });
      }
    }

    seedConnectionParticles() {
      this.particles = [];
      if (!this.model) return;
      this.model.connections.forEach((conn, idx) => {
        const count = conn.strength >= 5 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          this.particles.push({
            connId: conn.id,
            t: ((idx * 0.23) + (i * 0.5)) % 1,
            speed: 0.0016 + (conn.strength * 0.00025),
            reverse: conn.direction === 'target_to_source' || (conn.direction === 'bidirectional' && i % 2 === 1)
          });
        }
      });
    }

    renderShell(container) {
      container.innerHTML = `
        <div class="capital-intelligence-page" id="capitalIntelligencePage" data-theme-scope="capital-intelligence">
          <div class="ci-eagle-backdrop" aria-hidden="true"></div>
          <div class="ci-atmosphere-vignette" aria-hidden="true"></div>

          <!-- 1. TOP HEADER CINEMATOGRÁFICO & LENTES -->
          <header class="ci-header">
            <div class="ci-header-top">
              <div class="ci-title-group">
                <div class="ci-emblem" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 17l5-5 4 4 9-9"/>
                    <path d="M16 7h5v5"/>
                  </svg>
                </div>
                <div class="ci-title-text">
                  <h1>Capital Intelligence</h1>
                  <p>O Mapa Vivo do Seu Dinheiro</p>
                </div>
              </div>

              <div class="ci-header-controls">
                <div class="ci-status-pill" id="ciDataStatusPill">
                  <span class="ci-status-dot" aria-hidden="true"></span>
                  <span id="ciDataStatusText">Mapa Estrutural · 21 Pregões</span>
                </div>
                <select class="ci-scenario-select" id="ciScenarioSelect" aria-label="Selecionar cenário de foco">
                  <option value="all">Cenário: Global</option>
                  <option value="brasil">Cenário: Brasil</option>
                  <option value="us">Cenário: Estados Unidos</option>
                  <option value="portfolio">Cenário: Meu Patrimônio</option>
                </select>
              </div>
            </div>

            <nav class="ci-lens-bar" aria-label="Filtros estruturais do Capital Intelligence">
              <button type="button" class="ci-lens-btn active" data-universe="all">Visão Global</button>
              <span class="ci-lens-sep" aria-hidden="true">•</span>
              <button type="button" class="ci-lens-btn" data-universe="cycles">Ciclos</button>
              <span class="ci-lens-sep" aria-hidden="true">•</span>
              <button type="button" class="ci-lens-btn" data-universe="breadth">Market Breadth</button>
              <span class="ci-lens-sep" aria-hidden="true">•</span>
              <button type="button" class="ci-lens-btn" data-universe="macro">Macroeconomia</button>
              <span class="ci-lens-sep" aria-hidden="true">•</span>
              <button type="button" class="ci-lens-btn" data-universe="rotation">Rotação Setorial</button>
              <span class="ci-lens-sep" aria-hidden="true">•</span>
              <button type="button" class="ci-lens-btn" data-universe="portfolio">Patrimônio</button>
            </nav>
          </header>

          <!-- 2. PALCO CENTRAL (MAPA 3D + RAIL EXECUTIVO) -->
          <div class="ci-stage-layout">
            <div class="ci-map-stage" id="ciMapStage">
              <div class="ci-canvas-wrapper" id="ciCanvasWrapper">
                <canvas id="ciLiveMapCanvas" aria-label="Mapa Vivo de Esferas Tridimensionais do Capital Intelligence"></canvas>
              </div>

              <!-- Controles Discretos de Zoom & Legenda -->
              <div class="ci-hud-controls">
                <div class="ci-zoom-group" role="group" aria-label="Controles de visualização do mapa">
                  <button type="button" class="ci-icon-btn" id="ciZoomInBtn" title="Aproximar">+</button>
                  <button type="button" class="ci-icon-btn" id="ciZoomOutBtn" title="Afastar">−</button>
                  <button type="button" class="ci-icon-btn" id="ciResetViewBtn" title="Centralizar mapa">◎</button>
                </div>

                <div class="ci-hud-legend" aria-label="Legenda de conexões estruturais">
                  <span class="ci-legend-item"><i class="ci-legend-line economic"></i>Econômico</span>
                  <span class="ci-legend-item"><i class="ci-legend-line correlation"></i>Correlação</span>
                  <span class="ci-legend-item"><i class="ci-legend-line allocation"></i>Alocação</span>
                </div>
              </div>

              <div class="ci-map-hint" id="ciMapHint">Clique em uma esfera ou conexão para inspecionar</div>

              <!-- Gaveta Contextual da Esfera Selecionada -->
              <aside class="ci-node-drawer" id="ciNodeDrawer" aria-label="Detalhes da dimensão selecionada" aria-hidden="true"></aside>
            </div>

            <!-- Rail Executivo Compacto (Direita) -->
            <aside class="ci-exec-rail" id="ciExecRail" aria-label="Resumo executivo e inteligência"></aside>
          </div>

          <!-- 3. FAIXA SECUNDÁRIA COMPACTA NO RODAPÉ (VARIAÇÕES DIÁRIAS — 1 PREGÃO) -->
          <footer class="ci-daily-footer-strip" id="ciDailyFooterStrip" aria-label="Variações secundárias do pregão diário"></footer>

          <!-- 4. MODAL DE ANÁLISE DETALHADA DE ALOCAÇÃO -->
          <div class="ci-modal-backdrop" id="ciAllocationModal" role="dialog" aria-modal="true" aria-label="Análise Detalhada de Alocação"></div>

          <!-- 5. MODAL DE RACIONAL DE CONEXÃO -->
          <div class="ci-modal-backdrop" id="ciConnectionModal" role="dialog" aria-modal="true" aria-label="Detalhes da Conexão Estrutural"></div>
        </div>
      `;

      this.canvas = document.getElementById('ciLiveMapCanvas');
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

      this.bindUiControls();
      this.renderHeaderStatus();
      this.renderExecutiveRail();
      this.renderDailyFooterStrip();
      this.resizeCanvas();
      this.draw();
    }

    bindUiControls() {
      const page = document.getElementById('capitalIntelligencePage');
      if (!page) return;

      // Lens buttons
      page.querySelectorAll('.ci-lens-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.setUniverseFilter(btn.dataset.universe || 'all');
        });
      });

      // Scenario select
      const scenarioSelect = document.getElementById('ciScenarioSelect');
      if (scenarioSelect) {
        scenarioSelect.addEventListener('change', (e) => {
          this.setUniverseFilter(e.target.value || 'all');
        });
      }

      // Zoom / Reset
      document.getElementById('ciZoomInBtn')?.addEventListener('click', () => this.adjustZoom(0.14));
      document.getElementById('ciZoomOutBtn')?.addEventListener('click', () => this.adjustZoom(-0.14));
      document.getElementById('ciResetViewBtn')?.addEventListener('click', () => this.resetView());

      // Backdrop click closes modals
      document.getElementById('ciAllocationModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'ciAllocationModal') this.closeAllocationModal();
      });
      document.getElementById('ciConnectionModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'ciConnectionModal') this.closeConnectionModal();
      });

      // Escape key closes modals / drawer
      if (!this._escBound) {
        this._escBound = true;
        document.addEventListener('keydown', (e) => {
          if (e.key !== 'Escape') return;
          if (this.isAllocationModalOpen) {
            this.closeAllocationModal();
          } else if (this.selectedConnectionId) {
            this.closeConnectionModal();
          } else if (this.selectedNodeId) {
            this.closeNodeDrawer();
          }
        });
      }
    }

    renderHeaderStatus() {
      const pill = document.getElementById('ciDataStatusPill');
      const text = document.getElementById('ciDataStatusText');
      if (!pill || !text || !this.model) return;

      const statusMap = {
        atualizado: { label: 'Atualizado', live: true },
        parcial: { label: 'Parcial', live: true },
        atrasado: { label: 'Atrasado', live: false },
        indisponivel: { label: 'Indisponível', live: false }
      };

      const info = statusMap[this.model.pipelineStatus] || (this.model.dataConfidence === 'live'
        ? statusMap.atualizado
        : { label: 'Mapa Estrutural', live: false });

      pill.classList.toggle('is-live', Boolean(info.live));
      pill.dataset.freshness = this.model.pipelineStatus || 'indisponivel';

      let timeSuffix = '21 Pregões';
      if (this.model.lastUpdated) {
        try {
          const dt = new Date(this.model.lastUpdated);
          const hm = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dm = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          timeSuffix = `Últ. coleta ${dm} ${hm}`;
        } catch (_) {}
      }

      text.textContent = `${info.label} · ${timeSuffix}`;
    }

    renderExecutiveRail() {
      const rail = document.getElementById('ciExecRail');
      if (!rail || !this.model) return;

      const macroRows = this.model.getMacroScenarioSummary();
      const alloc = this.model.getIndicativeRebalanceScenario();
      const insights = this.model.generateInsights().slice(0, 4);
      const events = this.model.getUpcomingEvents();

      rail.innerHTML = `
        <!-- 1. Cenário Macro — 21 Pregões -->
        <section class="ci-rail-panel" aria-label="Cenário Macro — 21 Pregões">
          <div class="ci-rail-panel-head">
            <h2 class="ci-rail-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="3" x2="12" y2="5"/></svg>
              Cenário Macro
            </h2>
            <span class="ci-rail-tag">21 Pregões</span>
          </div>
          <div class="ci-macro-list">
            ${macroRows.map(row => `
              <button type="button" class="ci-macro-row" data-focus-node="${esc(row.id)}">
                <div class="ci-macro-row-top">
                  <span class="ci-macro-name"><span>${esc(row.flag)}</span>${esc(row.title)}</span>
                  <span class="ci-macro-badge tone-${esc(row.tone)}">${esc(row.status)}</span>
                </div>
                <span class="ci-macro-note">${esc(row.note)}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <!-- 2. Sugestão de Alocação — Painel Resumido Clicável (abre Modal Detalhado) -->
        <button type="button" class="ci-rail-panel ci-allocation-trigger" id="ciAllocationSummaryBtn" aria-label="Abrir análise detalhada de sugestão de alocação">
          <div class="ci-rail-panel-head">
            <span class="ci-rail-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Sugestão de Alocação
            </span>
            <span class="ci-rail-tag">21 Pregões</span>
          </div>
          <div class="ci-alloc-posture">${esc(alloc.postureLabel)}</div>
          <div class="ci-alloc-mini-rows">
            ${alloc.rows.slice(0, 3).map(r => `
              <div class="ci-alloc-mini-row">
                <span>${esc(r.label)}</span>
                <span class="ci-alloc-mini-val">${esc(r.currentDisplay)}</span>
              </div>
            `).join('')}
          </div>
          <div class="ci-alloc-cta">
            <span>Ver análise detalhada</span>
            <span aria-hidden="true">→</span>
          </div>
        </button>

        <!-- 3. Insights da Inteligência -->
        <section class="ci-rail-panel" aria-label="Insights da Inteligência">
          <div class="ci-rail-panel-head">
            <h2 class="ci-rail-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>
              Insights da Inteligência
            </h2>
          </div>
          <div class="ci-insights-compact">
            ${insights.map(ins => `
              <button type="button" class="ci-insight-item-btn" data-focus-node="${esc(ins.nodeId)}">
                <svg class="ci-insight-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>
                <span>${esc(ins.title)}</span>
              </button>
            `).join('')}
          </div>
        </section>

        <!-- 4. Próximos Eventos Relevantes -->
        <section class="ci-rail-panel" aria-label="Próximos Eventos Macroeconômicos">
          <div class="ci-rail-panel-head">
            <h2 class="ci-rail-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Próximos Eventos
            </h2>
          </div>
          <div class="ci-events-list">
            ${events.map(ev => `
              <button type="button" class="ci-event-row" data-focus-node="${esc(ev.targetNodeId || 'macro_events')}">
                <span>${esc(ev.flag)} ${esc(ev.title)}</span>
                <span class="ci-event-date">${esc(ev.dateLabel)}</span>
              </button>
            `).join('')}
          </div>
        </section>
      `;

      // Bind rail interactions
      rail.querySelectorAll('[data-focus-node]').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-focus-node');
          if (targetId) this.selectNode(targetId);
        });
      });

      const allocBtn = document.getElementById('ciAllocationSummaryBtn');
      if (allocBtn) {
        allocBtn.addEventListener('click', () => this.openAllocationModal());
      }
    }

    renderDailyFooterStrip() {
      const strip = document.getElementById('ciDailyFooterStrip');
      if (!strip || !this.model) return;

      const items = this.model.getDailyTapeItems();
      strip.innerHTML = `
        <span class="ci-daily-label">Pregão diário (1D · secundário)</span>
        <div class="ci-daily-items">
          ${items.map(item => {
            const hasDelta = item.changePct !== null && Number.isFinite(item.changePct);
            const deltaClass = hasDelta ? (item.changePct > 0 ? 'is-pos' : item.changePct < 0 ? 'is-neg' : '') : '';
            const deltaText = hasDelta
              ? `${item.changePct > 0 ? '+' : ''}${item.changePct.toFixed(2).replace('.', ',')}%`
              : '—';
            return `
              <span class="ci-daily-item" title="Variação secundária de 1 pregão — ${esc(item.label)}">
                <span class="ci-daily-sym">${esc(item.label)}</span>
                <span>${esc(item.displayValue)}</span>
                <span class="ci-daily-delta ${deltaClass}">${esc(deltaText)}</span>
              </span>
            `;
          }).join('')}
        </div>
      `;
    }

    setUniverseFilter(lens) {
      this.activeUniverse = lens || 'all';
      if (this.model) this.model.selectedUniverse = this.activeUniverse;

      const page = document.getElementById('capitalIntelligencePage');
      if (page) {
        page.querySelectorAll('.ci-lens-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.universe === this.activeUniverse);
        });
      }

      const sel = document.getElementById('ciScenarioSelect');
      if (sel && ['all', 'brasil', 'us', 'portfolio'].includes(this.activeUniverse)) {
        sel.value = this.activeUniverse;
      }

      this.draw();
    }

    adjustZoom(delta) {
      this.scale = Math.max(0.68, Math.min(1.85, this.scale + delta));
      this.draw();
    }

    resetView() {
      this.scale = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.nodeOffsets = {};
      this.selectedNodeId = null;
      this.closeNodeDrawer();
      this.draw();
    }

    setupResizeHandling() {
      const stage = document.getElementById('ciMapStage');
      if (!stage) return;

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.resizeCanvas();
          this.draw();
        });
        this.resizeObserver.observe(stage);
      }
      window.addEventListener('resize', () => {
        this.resizeCanvas();
        this.draw();
      });
    }

    resizeCanvas() {
      const stage = document.getElementById('ciMapStage');
      if (!stage || !this.canvas) return;
      const rect = stage.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;

      this.width = rect.width;
      this.height = rect.height;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      if (this.ctx) {
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      }
    }

    // Projeta posição normalizada (nx, ny) para coordenadas reais do palco com margens respiráveis
    getNodeScreenPos(node) {
      const padX = Math.max(66, this.width * 0.08);
      const padY = Math.max(64, this.height * 0.11);
      const usableW = Math.max(200, this.width - padX * 2);
      const usableH = Math.max(200, this.height - padY * 2);

      const offset = this.nodeOffsets[node.id] || { dx: 0, dy: 0 };
      const baseX = padX + node.nx * usableW + offset.dx;
      const baseY = padY + node.ny * usableH + offset.dy;

      const cx = this.width * 0.5;
      const cy = this.height * 0.5;
      return {
        x: cx + (baseX - cx) * this.scale + this.panX,
        y: cy + (baseY - cy) * this.scale + this.panY
      };
    }

    getScaledRadius(node) {
      const responsiveFactor = Math.max(0.76, Math.min(1.08, Math.min(this.width / 920, this.height / 580)));
      return node.radius * responsiveFactor * this.scale;
    }

    getCurveControlPoint(p1, p2, idxSeed = 0) {
      const mx = (p1.x + p2.x) * 0.5;
      const my = (p1.y + p2.y) * 0.5;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const curveSign = (idxSeed % 2 === 0) ? 1 : -1;
      const offset = Math.min(36, dist * 0.12) * curveSign;
      return {
        cx: mx - (dy / dist) * offset,
        cy: my + (dx / dist) * offset
      };
    }

    evalQuadBezier(p1, cp, p2, t) {
      const u = 1 - t;
      return {
        x: u * u * p1.x + 2 * u * t * cp.cx + t * t * p2.x,
        y: u * u * p1.y + 2 * u * t * cp.cy + t * t * p2.y
      };
    }

    findNodeAt(x, y) {
      if (!this.model) return null;
      // Verifica de cima para baixo (esferas principais primeiro)
      for (let i = this.model.nodes.length - 1; i >= 0; i--) {
        const node = this.model.nodes[i];
        const pos = this.getNodeScreenPos(node);
        const r = this.getScaledRadius(node) + 6;
        if (Math.hypot(x - pos.x, y - pos.y) <= r) {
          return node;
        }
      }
      return null;
    }

    findConnectionAt(x, y) {
      if (!this.model) return null;
      const threshold = 9;
      for (let i = 0; i < this.model.connections.length; i++) {
        const conn = this.model.connections[i];
        const src = this.model.getNodeById(conn.source);
        const tgt = this.model.getNodeById(conn.target);
        if (!src || !tgt) continue;
        const p1 = this.getNodeScreenPos(src);
        const p2 = this.getNodeScreenPos(tgt);
        const cp = this.getCurveControlPoint(p1, p2, i);
        for (let step = 1; step <= 14; step++) {
          const pt = this.evalQuadBezier(p1, cp, p2, step / 15);
          if (Math.hypot(x - pt.x, y - pt.y) <= threshold) {
            return conn;
          }
        }
      }
      return null;
    }

    bindCanvasEvents() {
      if (!this.canvas) return;

      const getLocalXY = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      this.canvas.addEventListener('pointerdown', (e) => {
        const pt = getLocalXY(e);
        this.pointerDownPos = pt;
        this.lastPointerPos = pt;
        this.didMovePointer = false;

        const hitNode = this.findNodeAt(pt.x, pt.y);
        if (hitNode) {
          this.draggedNode = hitNode;
          this.canvas.style.cursor = 'grabbing';
        } else {
          this.isPanning = true;
          this.canvas.style.cursor = 'grabbing';
        }
      });

      this.canvas.addEventListener('pointermove', (e) => {
        const pt = getLocalXY(e);
        const dx = pt.x - this.lastPointerPos.x;
        const dy = pt.y - this.lastPointerPos.y;
        this.lastPointerPos = pt;

        if (Math.hypot(pt.x - this.pointerDownPos.x, pt.y - this.pointerDownPos.y) > 4) {
          this.didMovePointer = true;
        }

        if (this.draggedNode) {
          const prev = this.nodeOffsets[this.draggedNode.id] || { dx: 0, dy: 0 };
          this.nodeOffsets[this.draggedNode.id] = {
            dx: prev.dx + dx / this.scale,
            dy: prev.dy + dy / this.scale
          };
          this.draw();
          return;
        }

        if (this.isPanning) {
          this.panX += dx;
          this.panY += dy;
          this.draw();
          return;
        }

        const hitNode = this.findNodeAt(pt.x, pt.y);
        if (hitNode) {
          this.hoveredNodeId = hitNode.id;
          this.hoveredConnectionId = null;
          this.canvas.style.cursor = 'pointer';
        } else {
          this.hoveredNodeId = null;
          const hitConn = this.findConnectionAt(pt.x, pt.y);
          this.hoveredConnectionId = hitConn ? hitConn.id : null;
          this.canvas.style.cursor = hitConn ? 'pointer' : 'grab';
        }
      });

      const endPointer = (e) => {
        const wasClick = !this.didMovePointer;
        const pt = getLocalXY(e);
        this.draggedNode = null;
        this.isPanning = false;
        this.canvas.style.cursor = 'grab';

        if (wasClick) {
          const hitNode = this.findNodeAt(pt.x, pt.y);
          if (hitNode) {
            this.selectNode(hitNode.id);
            return;
          }
          const hitConn = this.findConnectionAt(pt.x, pt.y);
          if (hitConn) {
            this.openConnectionModal(hitConn.id);
            return;
          }
          if (this.selectedNodeId) {
            this.closeNodeDrawer();
          }
        }
      };

      this.canvas.addEventListener('pointerup', endPointer);
      this.canvas.addEventListener('pointerleave', () => {
        this.draggedNode = null;
        this.isPanning = false;
        this.hoveredNodeId = null;
        this.hoveredConnectionId = null;
      });

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        this.adjustZoom(delta);
      }, { passive: false });
    }

    startAnimationLoop() {
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

      const tick = () => {
        const page = document.getElementById('capitalintelligence');
        const isActive = !page || page.classList.contains('active');
        if (isActive) {
          this.time += 0.016;
          this.particles.forEach(p => {
            p.t = (p.t + p.speed) % 1;
          });
          this.draw();
        }
        this.animationFrameId = requestAnimationFrame(tick);
      };

      this.animationFrameId = requestAnimationFrame(tick);
    }

    draw() {
      if (!this.ctx || !this.model) return;
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Astrolábio orbital arquitetônico ultra-sutil (profundidade espacial)
      this.drawOrbitalGuides(ctx, w, h);

      // 2. Micropartículas atmosféricas lentas
      this.drawAmbientMotes(ctx, w, h);

      const graph = this.model.getFilteredGraph(this.activeUniverse);
      const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
      const focusNodeId = this.selectedNodeId || this.hoveredNodeId;
      const focusNeighbors = focusNodeId ? this.model.getNeighborNodeIds(focusNodeId) : null;

      // 3. Conexões luminosas discretas + partículas de fluxo
      graph.connections.forEach((conn, idx) => {
        const src = nodeMap.get(conn.source);
        const tgt = nodeMap.get(conn.target);
        if (!src || !tgt) return;

        const isHoveredConn = this.hoveredConnectionId === conn.id;
        const touchesFocus = focusNodeId && (conn.source === focusNodeId || conn.target === focusNodeId);
        const lensMuted = (src.isDimmed && tgt.isDimmed) || (focusNodeId && !touchesFocus);

        this.drawConnection(ctx, conn, src, tgt, idx, {
          highlighted: Boolean(touchesFocus || isHoveredConn),
          muted: Boolean(lensMuted && !isHoveredConn)
        });
      });

      // 4. Satélites de tendência histórica (21 pregões) atrás das esferas principais
      graph.nodes
        .filter(n => n.tier === 'trend_satellite')
        .forEach(node => {
          const isSelected = this.selectedNodeId === node.id;
          const isHovered = this.hoveredNodeId === node.id;
          const isNeighbor = Boolean(focusNeighbors && focusNeighbors.has(node.id));
          const isMuted = Boolean(node.isDimmed || (focusNodeId && focusNodeId !== node.id && !isNeighbor));
          this.drawSphereNode(ctx, node, { isSelected, isHovered, isNeighbor, isMuted });
        });

      // 5. 7 Esferas Principais (Dimensões Estruturais e Cíclicas) em 3D Glassmórfico
      graph.nodes
        .filter(n => n.tier === 'primary')
        .forEach(node => {
          const isSelected = this.selectedNodeId === node.id;
          const isHovered = this.hoveredNodeId === node.id;
          const isNeighbor = Boolean(focusNeighbors && focusNeighbors.has(node.id));
          const isMuted = Boolean(node.isDimmed || (focusNodeId && focusNodeId !== node.id && !isNeighbor));
          this.drawSphereNode(ctx, node, { isSelected, isHovered, isNeighbor, isMuted });
        });
    }

    drawOrbitalGuides(ctx, w, h) {
      const cx = w * 0.49 + this.panX * 0.25;
      const cy = h * 0.50 + this.panY * 0.25;

      ctx.save();
      [0.24, 0.42, 0.62].forEach((ratio, i) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * ratio * this.scale, h * ratio * 0.84 * this.scale, 0, 0, Math.PI * 2);
        ctx.strokeStyle = i === 1 ? 'rgba(212, 175, 55, 0.055)' : 'rgba(167, 243, 208, 0.04)';
        ctx.lineWidth = 1;
        ctx.setLineDash(i === 2 ? [4, 8] : []);
        ctx.stroke();
      });
      ctx.restore();
    }

    drawAmbientMotes(ctx, w, h) {
      ctx.save();
      this.ambientMotes.forEach(m => {
        const yFloat = ((m.ny - this.time * m.speed) % 1 + 1) % 1;
        const xFloat = m.nx + Math.sin(this.time * 0.4 + m.phase) * 0.008;
        const alpha = 0.08 + 0.10 * (0.5 + 0.5 * Math.sin(this.time * 1.1 + m.phase));
        ctx.beginPath();
        ctx.arc(xFloat * w, yFloat * h, m.r, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(m.color, alpha);
        ctx.fill();
      });
      ctx.restore();
    }

    drawConnection(ctx, conn, src, tgt, idx, opts) {
      const p1 = this.getNodeScreenPos(src);
      const p2 = this.getNodeScreenPos(tgt);
      const cp = this.getCurveControlPoint(p1, p2, idx);

      const baseColor = conn.type === 'allocation'
        ? '#f3d58d'
        : conn.type === 'correlation'
          ? '#a855f7'
          : '#10b981';

      const alpha = opts.highlighted ? 0.72 : opts.muted ? 0.07 : 0.24;
      const lineWidth = opts.highlighted ? 2.1 : conn.type === 'allocation' ? 1.35 : 1.05;

      ctx.save();
      const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      grad.addColorStop(0, hexToRgba(src.color || baseColor, alpha));
      grad.addColorStop(0.5, hexToRgba(baseColor, Math.min(0.85, alpha * 1.25)));
      grad.addColorStop(1, hexToRgba(tgt.color || baseColor, alpha));

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(cp.cx, cp.cy, p2.x, p2.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineWidth;
      if (conn.type === 'correlation' && !opts.highlighted) {
        ctx.setLineDash([4, 5]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Partículas luminosas discretas trafegando na linha
      if (!opts.muted) {
        this.particles.forEach(p => {
          if (p.connId !== conn.id) return;
          const tVal = p.reverse ? (1 - p.t) : p.t;
          const pos = this.evalQuadBezier(p1, cp, p2, tVal);
          const pr = opts.highlighted ? 2.7 : 1.9;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, pr, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(baseColor, opts.highlighted ? 0.95 : 0.65);
          ctx.shadowColor = baseColor;
          ctx.shadowBlur = opts.highlighted ? 9 : 4;
          ctx.fill();
        });
      }

      // Etiqueta da conexão quando em destaque
      if (opts.highlighted && this.hoveredConnectionId === conn.id) {
        const mid = this.evalQuadBezier(p1, cp, p2, 0.5);
        ctx.shadowBlur = 0;
        ctx.font = '700 10.5px Inter, system-ui, sans-serif';
        const text = conn.label;
        const tw = ctx.measureText(text).width + 16;
        ctx.fillStyle = 'rgba(4, 15, 11, 0.92)';
        ctx.strokeStyle = hexToRgba(baseColor, 0.55);
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, mid.x - tw / 2, mid.y - 12, tw, 22, 9);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f0f7f3';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, mid.x, mid.y - 1);
      }

      ctx.restore();
    }

    drawSphereNode(ctx, node, opts) {
      const pos = this.getNodeScreenPos(node);
      // Respiração quase imperceptível e elegante
      const floatY = Math.sin(this.time * 0.9 + node.nx * 7 + node.ny * 5) * (node.tier === 'primary' ? 2.2 : 1.4);
      const x = pos.x;
      const y = pos.y + floatY;
      const r = this.getScaledRadius(node);
      const alphaScale = opts.isMuted ? 0.24 : 1.0;

      ctx.save();
      ctx.globalAlpha = alphaScale;

      // 1. Halo volumétrico controlado (jamais neon estridente)
      const haloR = r * (opts.isSelected || opts.isHovered ? 2.05 : 1.72);
      const haloGrad = ctx.createRadialGradient(x, y, r * 0.25, x, y, haloR);
      haloGrad.addColorStop(0, hexToRgba(node.color, opts.isSelected ? 0.34 : opts.isHovered ? 0.26 : 0.16));
      haloGrad.addColorStop(0.55, hexToRgba(node.color, opts.isSelected ? 0.12 : 0.05));
      haloGrad.addColorStop(1, hexToRgba(node.color, 0));
      ctx.beginPath();
      ctx.arc(x, y, haloR, 0, Math.PI * 2);
      ctx.fillStyle = haloGrad;
      ctx.fill();

      // 2. Anel orbital fino para esferas principais (ecoando a arte conceitual)
      if (node.tier === 'primary') {
        ctx.save();
        ctx.translate(x, y);
        const tilt = node.id === 'my_portfolio' ? -0.22 : (node.nx - 0.5) * 0.5;
        ctx.rotate(tilt + (opts.isSelected ? Math.sin(this.time * 0.7) * 0.08 : 0));
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.24, r * 0.44, 0, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(node.id === 'my_portfolio' ? '#f3d58d' : node.accentColor || node.color, opts.isSelected ? 0.55 : 0.22);
        ctx.lineWidth = opts.isSelected ? 1.4 : 0.9;
        ctx.stroke();
        ctx.restore();
      }

      // 3. Corpo Esférico 3D Translúcido (Vidro Escuro + Especular + Rim Light)
      const sphereGrad = ctx.createRadialGradient(
        x - r * 0.34,
        y - r * 0.36,
        r * 0.06,
        x + r * 0.12,
        y + r * 0.18,
        r * 1.08
      );
      sphereGrad.addColorStop(0, hexToRgba(node.accentColor || node.color, 0.58));
      sphereGrad.addColorStop(0.32, hexToRgba(node.color, 0.32));
      sphereGrad.addColorStop(0.72, 'rgba(6, 20, 15, 0.90)');
      sphereGrad.addColorStop(1, 'rgba(2, 9, 7, 0.96)');

      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // Rim Fresnel de vidro (usa cor oficial do regime nas esferas de Ciclo Brasil e Ciclo EUA quando disponível)
      const isCycleSphere = node.id === 'cycle_br' || node.id === 'cycle_us';
      const rimColor = (isCycleSphere && node.regimeColor) ? node.regimeColor : (node.accentColor || node.color);
      ctx.lineWidth = opts.isSelected ? 2.4 : opts.isHovered ? 1.85 : (isCycleSphere && node.regimeColor ? 1.65 : 1.15);
      ctx.strokeStyle = hexToRgba(rimColor, opts.isSelected ? 0.95 : opts.isHovered ? 0.82 : 0.58);
      ctx.stroke();

      // Brilho especular superior esquerdo (efeito esfera 3D de cristal)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x - r * 0.30, y - r * 0.36, r * 0.34, r * 0.18, -0.58, 0, Math.PI * 2);
      const specGrad = ctx.createLinearGradient(x - r * 0.5, y - r * 0.55, x - r * 0.1, y - r * 0.15);
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = specGrad;
      ctx.fill();
      ctx.restore();

      // 4. Widgets Estruturais Específicos dentro/no contorno da esfera
      if (node.id === 'cycle_br' && node.brazilCycleDetail?.recentTimeline21d?.length) {
        this.drawCycleRegimeArc(ctx, x, y, r, node.brazilCycleDetail.recentTimeline21d);
      } else if (node.id === 'cycle_us' && node.usCycleDetail?.recentTimeline21d?.length) {
        this.drawCycleRegimeArc(ctx, x, y, r, node.usCycleDetail.recentTimeline21d);
      } else if (node.visualWidget === 'breadth_ring') {
        this.drawBreadthPrecisionRing(ctx, x, y, r, node);
      } else if (node.visualWidget === 'sector_bars') {
        this.drawSectorRotationArc(ctx, x, y, r, node);
      } else if (node.visualWidget === 'portfolio_ring') {
        this.drawPortfolioConcentricRing(ctx, x, y, r);
      } else if (node.tier === 'trend_satellite') {
        this.drawSatelliteSparkline(ctx, x, y, r, node);
      }

      // 5. Tipografia nítida de alta legibilidade
      this.drawNodeLabels(ctx, x, y, r, node, opts);

      ctx.restore();
    }

    drawCycleRegimeArc(ctx, x, y, r, timeline21d) {
      if (!Array.isArray(timeline21d) || !timeline21d.length) return;
      const ringR = r + 5;
      const totalSpan = Math.PI * 0.72; // Arco inferior de 21 pregões (elegante e sem ruído)
      const startBase = Math.PI * 0.5 - totalSpan * 0.5;
      const segSpan = totalSpan / timeline21d.length;
      const gap = Math.min(0.014, segSpan * 0.18);

      ctx.save();
      ctx.lineWidth = 3.0;
      ctx.lineCap = 'butt';
      timeline21d.forEach((pt, idx) => {
        const a0 = startBase + idx * segSpan + gap * 0.5;
        const a1 = startBase + (idx + 1) * segSpan - gap * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, ringR, a0, a1);
        ctx.strokeStyle = hexToRgba(pt.color || '#10b981', idx === timeline21d.length - 1 ? 0.98 : 0.76);
        ctx.stroke();
      });
      ctx.restore();
    }

    drawBreadthPrecisionRing(ctx, x, y, r, node) {
      const ringR = r - 5;
      const innerR = r - 10.5;
      const startAngle = -Math.PI * 0.75;
      const sweepMax = Math.PI * 1.5;

      ctx.save();
      // Trilho externo (% > SMA50)
      ctx.beginPath();
      ctx.arc(x, y, ringR, startAngle, startAngle + sweepMax);
      ctx.strokeStyle = 'rgba(216, 180, 254, 0.18)';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Arco externo (% > SMA50)
      const pct50 = Number.isFinite(node.breadthPct) ? Math.max(0, Math.min(100, node.breadthPct)) / 100 : 0.35;
      ctx.beginPath();
      ctx.arc(x, y, ringR, startAngle, startAngle + sweepMax * pct50);
      ctx.strokeStyle = Number.isFinite(node.breadthPct) ? '#c084fc' : 'rgba(192, 132, 252, 0.42)';
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Arco interno (% > SMA200) quando real disponível
      if (Number.isFinite(node.breadth200Pct)) {
        const pct200 = Math.max(0, Math.min(100, node.breadth200Pct)) / 100;
        ctx.beginPath();
        ctx.arc(x, y, innerR, startAngle, startAngle + sweepMax * pct200);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
        ctx.lineWidth = 2.0;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Alerta discreto de divergência entre índice e participação interna
      if (node.hasDivergence) {
        const divColor = node.divergenceState === 'bearish_divergence' ? '#ef4444' : '#f59e0b';
        const pulseAlpha = 0.45 + 0.32 * (0.5 + 0.5 * Math.sin(this.time * 2.4));
        ctx.beginPath();
        ctx.arc(x, y, r + 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(divColor, pulseAlpha);
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    drawSectorRotationArc(ctx, x, y, r, node) {
      const sectors = Array.isArray(node.sectors) ? node.sectors : [];
      const ringR = r + 5;
      const totalSpan = Math.PI * 0.78;
      const startBase = Math.PI * 0.5 - totalSpan * 0.5;

      ctx.save();
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'butt';

      if (!sectors.length) {
        // Arco guia estrutural discreto enquanto aguarda coleta de ETFs setoriais
        ctx.beginPath();
        ctx.arc(x, y, ringR, startBase, startBase + totalSpan);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
        ctx.stroke();
        ctx.restore();
        return;
      }

      const segSpan = totalSpan / sectors.length;
      const gap = Math.min(0.022, segSpan * 0.20);
      sectors.forEach((sec, idx) => {
        const a0 = startBase + idx * segSpan + gap * 0.5;
        const a1 = startBase + (idx + 1) * segSpan - gap * 0.5;
        const col = sec.rotationColor || (sec.rotationState === 'strengthening' ? '#10b981' : sec.rotationState === 'weakening' ? '#ef4444' : '#94a3b8');
        ctx.beginPath();
        ctx.arc(x, y, ringR, a0, a1);
        ctx.strokeStyle = hexToRgba(col, 0.90);
        ctx.stroke();
      });
      ctx.restore();
    }

    drawPortfolioConcentricRing(ctx, x, y, r) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(229, 193, 88, 0.34)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    drawSatelliteSparkline(ctx, x, y, r, node) {
      const pts = Array.isArray(node.sparkline) && node.sparkline.length >= 3
        ? node.sparkline
        : [0.42, 0.46, 0.44, 0.50, 0.49, 0.54, 0.56]; // Linha base estrutural sutil quando aguardando feed

      const min = Math.min(...pts);
      const max = Math.max(...pts);
      const span = (max - min) || 1;
      const sw = r * 1.18;
      const sh = r * 0.42;
      const startX = x - sw / 2;
      const baseY = y + r * 0.36;

      ctx.save();
      ctx.beginPath();
      pts.forEach((v, idx) => {
        const px = startX + (idx / (pts.length - 1)) * sw;
        const py = baseY - ((v - min) / span) * sh;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = node.dataStatus === 'live'
        ? hexToRgba(node.accentColor || node.color, 0.92)
        : hexToRgba(node.accentColor || node.color, 0.42);
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    drawNodeLabels(ctx, x, y, r, node, opts) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (node.tier === 'primary') {
        // Eyebrow badge dentro do topo da esfera
        ctx.font = `800 ${Math.max(8, Math.round(9 * this.scale))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = hexToRgba(node.accentColor || '#f3d58d', 0.95);
        ctx.fillText(node.badge, x, y - r * 0.40);

        // Título estrutural central
        ctx.font = `800 ${Math.max(10.5, Math.round(12 * this.scale))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(node.label, x, y - r * 0.05);

        // Valor / Estado estrutural
        ctx.font = `700 ${Math.max(9.5, Math.round(10.5 * this.scale))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = node.dataStatus === 'live' ? '#f3d58d' : '#a7c4b5';
        const valText = node.displayValue.length > 18 ? node.displayValue.slice(0, 17) + '…' : node.displayValue;
        ctx.fillText(valText, x, y + r * 0.28);

        // Legenda de janela fora da esfera (abaixo)
        ctx.shadowBlur = 5;
        ctx.font = `600 ${Math.max(9, Math.round(10 * this.scale))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = opts.isSelected || opts.isHovered ? '#ffffff' : 'rgba(182, 210, 196, 0.85)';
        ctx.fillText(node.metricCaption, x, y + r + 15);
      } else {
        // Satélite de tendência histórica (21 pregões)
        ctx.font = `800 ${Math.max(8.5, Math.round(9.5 * this.scale))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 4;
        ctx.fillText(node.label, x, y - r * 0.26);

        ctx.font = `700 ${Math.max(8, Math.round(8.5 * this.scale))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = hexToRgba(node.accentColor || '#cbd5e1', 0.9);
        ctx.fillText(node.displayValue, x, y + r * 0.02);

        ctx.font = `600 ${Math.max(8, Math.round(8.5 * this.scale))}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = opts.isSelected || opts.isHovered ? '#ffffff' : 'rgba(155, 184, 170, 0.88)';
        const satCap = node.metricCaption && node.metricCaption.length > 22
          ? `${node.metricCaption.slice(0, 21)}…`
          : (node.metricCaption || '21p');
        ctx.fillText(satCap, x, y + r + 12);
      }

      ctx.restore();
    }

    drawRoundedRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    // =========================================================================
    // INTERAÇÕES: GAVETA DE DETALHES DA ESFERA & MODAIS
    // =========================================================================
    selectNode(nodeId) {
      if (!this.model) return;
      const node = this.model.getNodeById(nodeId);
      if (!node) return;
      this.selectedNodeId = nodeId;
      if (nodeId === 'cycle_us' && node.usCycleDetail) {
        this.openUsCycleModal(node);
        this.draw();
        return;
      }
      if (nodeId === 'breadth_us' && node.usBreadthDetail) {
        this.openUsBreadthModal(node);
        this.draw();
        return;
      }
      if (nodeId === 'sector_rotation_us' && node.usSectorRotationDetail) {
        this.openUsSectorRotationModal(node);
        this.draw();
        return;
      }
      if (['trend_dolar', 'trend_di', 'trend_us10y', 'trend_vix'].includes(nodeId) && this.model.macroTrendsDetail) {
        this.openMacroTrendsModal(nodeId);
        this.draw();
        return;
      }
      this.renderNodeDrawer(nodeId);
      this.draw();
    }

    renderNodeDrawer(nodeId) {
      const drawer = document.getElementById('ciNodeDrawer');
      if (!drawer || !this.model) return;

      const node = this.model.getNodeById(nodeId);
      if (!node) return;

      const connections = this.model.getConnectionsForNode(nodeId);
      const isLive = node.dataStatus === 'live';

      const detailEntries = node.details ? Object.entries(node.details) : [];
      const keyLabels = {
        window: 'Janela de Observação',
        permission: 'Permissão / Regime',
        benchmarks: 'Benchmarks',
        metrics: 'Métricas Estruturais',
        assets: 'Ativos de Referência',
        buckets: 'Grupos Setoriais',
        catalysts: 'Principais Catalisadores',
        accountingRule: 'Regra Patrimonial',
        riskControl: 'Gestão de Risco',
        impact: 'Transmissão Estrutural',
        focus: 'Aplicação Prática'
      };

      const freshState = node.freshnessStatus || (isLive ? 'atualizado' : 'indisponivel');
      const freshLabel = freshState === 'atualizado'
        ? `● Atualizado${node.asOfDate ? ` (${node.asOfDate})` : ''}`
        : freshState === 'atrasado'
          ? `◐ Atrasado${node.lagBusinessDays ? ` (${node.lagBusinessDays}p)` : ''}${node.asOfDate ? ` · ${node.asOfDate}` : ''}`
          : freshState === 'parcial'
            ? `◐ Parcial${node.asOfDate ? ` (${node.asOfDate})` : ''}`
            : '○ Indisponível · aguardando feed';

      const isBrazilCycle = nodeId === 'cycle_br' && node.brazilCycleDetail;

      drawer.innerHTML = `
        <header class="ci-drawer-header">
          <div>
            <div class="ci-drawer-eyebrow">${esc(node.badge)} · ${esc(node.windowLabel)}</div>
            <h3 class="ci-drawer-title">${esc(node.shortLabel || node.label)}</h3>
            <p class="ci-drawer-sub">${esc(node.subtitle)}</p>
          </div>
          <button type="button" class="ci-close-btn" id="ciCloseDrawerBtn" aria-label="Fechar detalhes">✕</button>
        </header>

        <div class="ci-drawer-body">
          ${isBrazilCycle ? this.buildBrazilCycleDiagnosticsHtml(node, freshLabel, freshState) : `
            <div class="ci-metric-hero">
              <div class="ci-metric-hero-val">${esc(node.displayValue)}</div>
              <div class="ci-metric-hero-meta">
                <span>${esc(node.metricCaption)}</span>
                <span class="ci-provenance-badge ${freshState === 'atualizado' ? 'is-live' : ''}">
                  ${esc(freshLabel)}
                </span>
              </div>
            </div>

            <p class="ci-drawer-desc">${esc(node.description)}</p>

            ${detailEntries.length ? `
              <div class="ci-detail-list">
                ${detailEntries.map(([k, v]) => `
                  <div class="ci-detail-row">
                    <div class="ci-detail-k">${esc(keyLabels[k] || k)}</div>
                    <div class="ci-detail-v">${esc(v)}</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          `}

          <div>
            <div class="ci-conn-section-title">Conexões Estruturais (${connections.length})</div>
            ${connections.map(conn => {
              const otherId = conn.source === nodeId ? conn.target : conn.source;
              const other = this.model.getNodeById(otherId);
              const typeLabel = conn.type === 'economic' ? 'Econômico' : conn.type === 'correlation' ? 'Correlação' : 'Alocação';
              return `
                <button type="button" class="ci-conn-pill-btn" data-open-conn="${esc(conn.id)}">
                  <div class="ci-conn-pill-top">
                    <span>${esc(other ? other.shortLabel : otherId)}</span>
                    <span class="ci-conn-type-tag ${esc(conn.type)}">${esc(typeLabel)}</span>
                  </div>
                  <span class="ci-conn-pill-sub">${esc(conn.label)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <footer class="ci-drawer-footer">
          <span style="font-size:10.5px;color:#688578;">Fonte: ${esc(node.source)}</span>
          <div style="display:flex;gap:6px;align-items:center;">
            ${isBrazilCycle ? `<button type="button" class="ci-link-btn" id="ciExpandBrazilCycleBtn">Expandir</button>` : ''}
            ${node.sourceRoute ? `<button type="button" class="ci-link-btn" id="ciDrawerGoRouteBtn">Abrir módulo →</button>` : ''}
          </div>
        </footer>
      `;

      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');

      document.getElementById('ciCloseDrawerBtn')?.addEventListener('click', () => this.closeNodeDrawer());
      document.getElementById('ciExpandBrazilCycleBtn')?.addEventListener('click', () => this.openBrazilCycleModal(node));
      drawer.querySelectorAll('[data-open-conn]').forEach(btn => {
        btn.addEventListener('click', () => this.openConnectionModal(btn.getAttribute('data-open-conn')));
      });

      const goBtn = document.getElementById('ciDrawerGoRouteBtn');
      if (goBtn && node.sourceRoute) {
        goBtn.addEventListener('click', () => {
          if (typeof root.go === 'function') root.go(node.sourceRoute);
        });
      }
    }

    buildBrazilCycleDiagnosticsHtml(node, freshLabel, freshState) {
      const d = node.brazilCycleDetail || {};
      const sup = d.supportingIndicators || {};
      const rf = d.relatedFactors || {};
      const timeline = Array.isArray(d.recentTimeline21d) ? d.recentTimeline21d : [];
      const transitions = Array.isArray(d.recentTransitions) ? d.recentTransitions : [];
      const benchmarks = Array.isArray(d.benchmarkSummary) ? d.benchmarkSummary : [];

      const fmtNum = (v, dec = 2) => (v !== null && v !== undefined && Number.isFinite(Number(v)))
        ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
        : '—';
      const fmtPct = (v) => (v !== null && v !== undefined && Number.isFinite(Number(v)))
        ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2).replace('.', ',')}%`
        : '—';
      const fmtShortDate = (iso) => (iso && iso.length >= 10) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—';

      const collectedStr = d.provenance?.collectedAt
        ? new Date(d.provenance.collectedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '—';

      return `
        <div class="ci-metric-hero">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span class="ci-cycle-regime-pill" style="${d.regimeColor ? `border-color:${esc(d.regimeColor)};` : ''}">
              <span class="ci-cycle-regime-dot" style="background:${esc(d.regimeColor || '#6b7280')};"></span>
              ${esc(d.hasOfficialRegime ? d.regimeLabel : 'Classificação Indisponível')}
            </span>
            <span class="ci-provenance-badge ${freshState === 'atualizado' ? 'is-live' : ''}">${esc(freshLabel)}</span>
          </div>
          <div class="ci-cycle-tags-row">
            ${d.direction ? `<span class="ci-cycle-chip">Direção: ${esc(d.direction)}</span>` : ''}
            ${d.volatility ? `<span class="ci-cycle-chip">Volatilidade: ${esc(d.volatility)}</span>` : ''}
            ${d.currentPeriod ? `<span class="ci-cycle-chip">${esc(d.currentPeriod.durationTradingDays)} pregões desde ${esc(fmtShortDate(d.currentPeriod.startDate))}</span>` : ''}
          </div>
          <p class="ci-drawer-desc" style="margin-top:6px;">${esc(d.diagnosis?.summary || node.description)}</p>
          ${d.diagnosis?.permissionGuidance ? `<div class="ci-detail-row" style="margin-top:4px;"><div class="ci-detail-k">Diretriz Operacional do Ciclo</div><div class="ci-detail-v">${esc(d.diagnosis.permissionGuidance)}</div></div>` : ''}
        </div>

        ${timeline.length ? `
          <div class="ci-cycle-timeline-wrap">
            <div class="ci-cycle-timeline-head">
              <span>Evolução do Regime (${timeline.length} pregões)</span>
              <span>IBOV · Fechamento</span>
            </div>
            <div class="ci-cycle-timeline-bars" role="img" aria-label="Evolução diária do regime nos últimos ${timeline.length} pregões">
              ${timeline.map(pt => `
                <div class="ci-cycle-bar" style="background:${esc(pt.color || '#6b7280')};" title="${esc(fmtShortDate(pt.date))} — ${esc(pt.regimeLabel)} (Fech.: ${esc(fmtNum(pt.close, 0))})"></div>
              `).join('')}
            </div>
            <div class="ci-cycle-timeline-dates">
              <span>${esc(fmtShortDate(timeline[0].date))}</span>
              <span>Janela de 21 pregões</span>
              <span>${esc(fmtShortDate(timeline[timeline.length - 1].date))}</span>
            </div>
          </div>
        ` : ''}

        <div>
          <div class="ci-conn-section-title">Indicadores que Sustentam o Regime</div>
          <div class="ci-cycle-kpi-grid">
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">IBOV × EMAs</span>
              <span class="ci-cycle-kpi-val">${esc(fmtNum(sup.close, 0))}</span>
              <span class="ci-cycle-kpi-sub">EMA10: ${esc(fmtNum(sup.ema10, 0))} (${esc(fmtPct(sup.distEma10Pct))}) · EMA72: ${esc(fmtNum(sup.ema72, 0))}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Volatilidade ATR%</span>
              <span class="ci-cycle-kpi-val">${esc(fmtNum(sup.atrPct, 2))}%</span>
              <span class="ci-cycle-kpi-sub">MM252: ${esc(fmtNum(sup.atrPctSma252, 2))}% · Desvio: ${esc(fmtPct(sup.volatilityDeviationPct))}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Tendência 21 Pregões</span>
              <span class="ci-cycle-kpi-val">${esc(fmtPct(sup.return21dPct))}</span>
              <span class="ci-cycle-kpi-sub">63 pregões: ${esc(fmtPct(sup.return63dPct))}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Alinhamento EMA</span>
              <span class="ci-cycle-kpi-val" style="font-size:12px;">${esc(sup.emaStructure || '—')}</span>
              <span class="ci-cycle-kpi-sub">ATR(21): ${esc(fmtNum(sup.atr21, 0))} pts</span>
            </div>
          </div>
          <div class="ci-cycle-note-muted" style="margin-top:6px;">
            Variação de um único pregão não determina isoladamente o regime (somente fechamentos completos).
          </div>
        </div>

        ${benchmarks.length ? `
          <div>
            <div class="ci-conn-section-title">Benchmarks Brasileiros</div>
            <div class="ci-cycle-transitions">
              ${benchmarks.map(bm => `
                <div class="ci-cycle-transition-row">
                  <span style="font-weight:700;color:#ffffff;">${esc(bm.symbol)}</span>
                  <span style="color:${esc(bm.regimeColor || '#9bb8aa')};font-weight:700;">${esc(bm.regimeLabel || 'Indisponível')}</span>
                  <span style="color:#9bb8aa;">21p: ${esc(fmtPct(bm.return21dPct))}</span>
                  <span style="font-size:10px;color:#688578;">${esc(fmtShortDate(bm.asOfDate))}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div>
          <div class="ci-conn-section-title">Relação com Juros, Dólar, Amplitude e Volatilidade</div>
          <div class="ci-cycle-kpi-grid">
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Amplitude B3 (Ações)</span>
              <span class="ci-cycle-kpi-val">${rf.breadthB3?.status !== 'indisponivel' ? `${esc(rf.breadthB3.aboveEma50Pct)}% > MM50` : 'Indisponível'}</span>
              <span class="ci-cycle-kpi-sub">${rf.breadthB3?.status !== 'indisponivel' ? `EMA20: ${esc(rf.breadthB3.aboveEma20Pct)}% · EMA200: ${esc(rf.breadthB3.aboveEma200Pct)}% (${esc(rf.breadthB3.totalEligible)} ações)` : 'Aguardando cache B3'}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Dólar PTAX (21p)</span>
              <span class="ci-cycle-kpi-val">${rf.dolar?.status !== 'indisponivel' ? `R$ ${esc(fmtNum(rf.dolar.latestValue, 2))}` : 'Indisponível'}</span>
              <span class="ci-cycle-kpi-sub">21p: ${esc(fmtPct(rf.dolar?.change21dPct))} · Ref: ${esc(fmtShortDate(rf.dolar?.asOfDate))}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Juros (Selic / DI)</span>
              <span class="ci-cycle-kpi-val">${rf.juros?.selicStatus !== 'indisponivel' ? `Selic ${esc(fmtNum(rf.juros.selicValue, 2))}%` : 'Indisponível'}</span>
              <span class="ci-cycle-kpi-sub">Curva DI Futuro: ${rf.juros?.diCurveStatus === 'indisponivel' ? 'aguardando parser ETTJ/DI1' : esc(rf.juros?.diCurveStatus)}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Regime Volatilidade</span>
              <span class="ci-cycle-kpi-val">${esc(rf.volatility?.regimeVolatility || 'Indisponível')}</span>
              <span class="ci-cycle-kpi-sub">Desvio vs MM252: ${esc(fmtPct(rf.volatility?.volatilityDeviationPct))}</span>
            </div>
          </div>
        </div>

        ${transitions.length ? `
          <div>
            <div class="ci-conn-section-title">Histórico Recente de Períodos</div>
            <div class="ci-cycle-transitions">
              ${transitions.map(tr => `
                <div class="ci-cycle-transition-row">
                  <span style="display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#ffffff;">
                    <i style="width:8px;height:8px;border-radius:50%;background:${esc(tr.color)};display:inline-block;"></i>
                    ${esc(tr.regimeLabel)}
                  </span>
                  <span style="color:#9bb8aa;">${esc(fmtShortDate(tr.startDate))} → ${esc(fmtShortDate(tr.endDate))}</span>
                  <span style="color:#f3d58d;font-weight:700;">${esc(tr.durationTradingDays)}p</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="ci-detail-row">
          <div class="ci-detail-k">Rastreabilidade & Fontes</div>
          <div class="ci-detail-v" style="font-size:11px;color:#9bb8aa;">
            Motor: ${esc(d.provenance?.engine || 'backend/src/market-regime.js')}<br/>
            Referência: ${esc(d.provenance?.asOfDate || '—')} · Última coleta: ${esc(collectedStr)}
          </div>
        </div>
      `;
    }

    openBrazilCycleModal(node) {
      const modal = document.getElementById('ciConnectionModal');
      if (!modal || !node?.brazilCycleDetail) return;
      this.selectedConnectionId = 'brazil_cycle_modal';

      const freshState = node.freshnessStatus || 'indisponivel';
      const freshLabel = freshState === 'atualizado'
        ? `● Atualizado (${node.asOfDate || '—'})`
        : freshState === 'atrasado'
          ? `◐ Atrasado (${node.lagBusinessDays || 1}p · ${node.asOfDate || '—'})`
          : '○ Indisponível';

      modal.innerHTML = `
        <div class="ci-modal-card ci-modal-wide">
          <header class="ci-modal-head">
            <div>
              <div class="ci-drawer-eyebrow">BRASIL · CICLO DE MERCADO OFICIAL</div>
              <h2>Diagnóstico Estrutural — Ciclo de Mercado Brasil</h2>
            </div>
            <button type="button" class="ci-close-btn" id="ciCloseBrCycleModalBtn" aria-label="Fechar diagnóstico">✕</button>
          </header>
          <div class="ci-modal-body">
            ${this.buildBrazilCycleDiagnosticsHtml(node, freshLabel, freshState)}
          </div>
          <footer class="ci-modal-foot">
            <button type="button" class="ci-link-btn" id="ciGoMarketCycleModalBtn">Abrir Ciclo de Mercado →</button>
            <button type="button" class="ci-link-btn" id="ciCloseBrCycleFooterBtn">Fechar</button>
          </footer>
        </div>
      `;

      modal.classList.add('open');
      document.getElementById('ciCloseBrCycleModalBtn')?.addEventListener('click', () => this.closeConnectionModal());
      document.getElementById('ciCloseBrCycleFooterBtn')?.addEventListener('click', () => this.closeConnectionModal());
      document.getElementById('ciGoMarketCycleModalBtn')?.addEventListener('click', () => {
        this.closeConnectionModal();
        if (typeof root.go === 'function') root.go('marketcycle');
      });
    }

    buildUsCycleDiagnosticsHtml(node, freshLabel, freshState) {
      const d = node.usCycleDetail || {};
      const sup = d.supportingIndicators || {};
      const rc = d.relatedContext || {};
      const ew = d.equalWeightContext || {};
      const meth = d.methodology || {};
      const timeline = Array.isArray(d.recentTimeline21d) ? d.recentTimeline21d : [];
      const transitions = Array.isArray(d.recentTransitions) ? d.recentTransitions : [];
      const benchmarks = Array.isArray(d.benchmarkSummary) ? d.benchmarkSummary : [];

      const fmtNum = (v, dec = 2) => (v !== null && v !== undefined && Number.isFinite(Number(v)))
        ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
        : '—';
      const fmtPct = (v) => (v !== null && v !== undefined && Number.isFinite(Number(v)))
        ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2).replace('.', ',')}%`
        : '—';
      const fmtShortDate = (iso) => (iso && iso.length >= 10) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—';
      const collectedStr = d.provenance?.collectedAt
        ? new Date(d.provenance.collectedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '—';

      return `
        <div class="ci-metric-hero">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span class="ci-cycle-regime-pill" style="${d.regimeColor ? `border-color:${esc(d.regimeColor)};` : ''}">
              <span class="ci-cycle-regime-dot" style="background:${esc(d.regimeColor || '#3b82f6')};"></span>
              ${esc(d.hasOfficialRegime ? d.regimeLabel : 'Classificação EUA Indisponível')}
            </span>
            <span class="ci-provenance-badge ${freshState === 'atualizado' ? 'is-live' : ''}">${esc(freshLabel)}</span>
          </div>
          <div class="ci-cycle-tags-row">
            ${d.direction ? `<span class="ci-cycle-chip">Direção EUA: ${esc(d.direction)}</span>` : ''}
            ${d.volatility ? `<span class="ci-cycle-chip">Volatilidade EUA: ${esc(d.volatility)}</span>` : ''}
            ${d.currentPeriod ? `<span class="ci-cycle-chip">${esc(d.currentPeriod.durationTradingDays)} pregões desde ${esc(fmtShortDate(d.currentPeriod.startDate))}</span>` : ''}
            ${d.spyVsQqqAlignment?.label ? `<span class="ci-cycle-chip">${esc(d.spyVsQqqAlignment.label)}</span>` : ''}
          </div>
          <p class="ci-drawer-desc" style="margin-top:6px;">${esc(d.diagnosis?.summary || node.description)}</p>
          ${d.diagnosis?.confluencyNote ? `<div class="ci-detail-row" style="margin-top:4px;"><div class="ci-detail-k">Confluência S&P 500 × Nasdaq-100</div><div class="ci-detail-v">${esc(d.diagnosis.confluencyNote)}</div></div>` : ''}
        </div>

        ${timeline.length ? `
          <div class="ci-cycle-timeline-wrap">
            <div class="ci-cycle-timeline-head">
              <span>Evolução do Regime EUA (${timeline.length} pregões)</span>
              <span>SPY · Fechamento NY</span>
            </div>
            <div class="ci-cycle-timeline-bars" role="img" aria-label="Evolução diária do regime americano nos últimos ${timeline.length} pregões">
              ${timeline.map(pt => `
                <div class="ci-cycle-bar" style="background:${esc(pt.color || '#3b82f6')};" title="${esc(fmtShortDate(pt.date))} — ${esc(pt.regimeLabel)} (SPY: US$ ${esc(fmtNum(pt.close, 2))})"></div>
              `).join('')}
            </div>
            <div class="ci-cycle-timeline-dates">
              <span>${esc(fmtShortDate(timeline[0].date))}</span>
              <span>Janela de 21 pregões (EUA)</span>
              <span>${esc(fmtShortDate(timeline[timeline.length - 1].date))}</span>
            </div>
          </div>
        ` : ''}

        <div>
          <div class="ci-conn-section-title">Benchmarks Americanos (S&P 500 · Nasdaq-100 · Equal-Weight)</div>
          <div class="ci-cycle-transitions">
            ${benchmarks.map(bm => `
              <div class="ci-cycle-transition-row">
                <span style="font-weight:700;color:#ffffff;">${esc(bm.symbol)} <span style="font-weight:500;color:#688578;font-size:10px;">${esc(bm.role || '')}</span></span>
                <span style="color:${esc(bm.regimeColor || '#9bb8aa')};font-weight:700;">${esc(bm.regimeLabel || (bm.status === 'indisponivel' ? 'Indisponível' : 'Complementar'))}</span>
                <span style="color:#9bb8aa;">21p: ${esc(fmtPct(bm.return21dPct))}</span>
                <span style="font-size:10px;color:#688578;">${esc(fmtShortDate(bm.asOfDate))}</span>
              </div>
            `).join('')}
          </div>
          ${ew.interpretation ? `<div class="ci-cycle-note-muted" style="margin-top:5px;">Equal-Weight (RSP): ${esc(ew.interpretation)}</div>` : ''}
        </div>

        <div>
          <div class="ci-conn-section-title">Indicadores que Sustentam o Regime EUA (SPY)</div>
          <div class="ci-cycle-kpi-grid">
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">SPY × EMAs</span>
              <span class="ci-cycle-kpi-val">US$ ${esc(fmtNum(sup.close, 2))}</span>
              <span class="ci-cycle-kpi-sub">EMA10: ${esc(fmtNum(sup.ema10, 2))} (${esc(fmtPct(sup.distEma10Pct))}) · EMA72: ${esc(fmtNum(sup.ema72, 2))}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Volatilidade ATR%</span>
              <span class="ci-cycle-kpi-val">${esc(fmtNum(sup.atrPct, 2))}%</span>
              <span class="ci-cycle-kpi-sub">MM252: ${esc(fmtNum(sup.atrPctSma252, 2))}% · Desvio: ${esc(fmtPct(sup.volatilityDeviationPct))}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Tendência 21 Pregões</span>
              <span class="ci-cycle-kpi-val">${esc(fmtPct(sup.return21dPct))}</span>
              <span class="ci-cycle-kpi-sub">63 pregões: ${esc(fmtPct(sup.return63dPct))}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Alinhamento EMA</span>
              <span class="ci-cycle-kpi-val" style="font-size:12px;">${esc(sup.emaStructure || '—')}</span>
              <span class="ci-cycle-kpi-sub">ATR(21): US$ ${esc(fmtNum(sup.atr21, 2))}</span>
            </div>
          </div>
        </div>

        <div>
          <div class="ci-conn-section-title">Relação com Dimensões Independentes (Sem Misturar ao Ciclo)</div>
          <div class="ci-cycle-kpi-grid">
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Market Breadth EUA</span>
              <span class="ci-cycle-kpi-val" style="font-size:12px;">Esfera Independente</span>
              <span class="ci-cycle-kpi-sub">${esc(rc.breadthUs?.note || 'Amplitude interna separada do índice.')}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Rotação Setorial EUA</span>
              <span class="ci-cycle-kpi-val" style="font-size:12px;">${rc.sectorRotationUs?.leader ? `${esc(rc.sectorRotationUs.leader.sector)} (${esc(fmtPct(rc.sectorRotationUs.leader.return21dPct))})` : 'Aguardando feed'}</span>
              <span class="ci-cycle-kpi-sub">${esc(rc.sectorRotationUs?.note || '')}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">VIX & Treasury 10Y (21p)</span>
              <span class="ci-cycle-kpi-val" style="font-size:12px;">VIX: ${rc.vix?.status !== 'indisponivel' ? esc(fmtNum(rc.vix?.latestValue, 2)) : 'Indisp.'} · 10Y: ${rc.us10y?.status !== 'indisponivel' ? `${esc(fmtNum(rc.us10y?.latestValue, 2))}%` : 'Indisp.'}</span>
              <span class="ci-cycle-kpi-sub">VIX 21p: ${esc(fmtPct(rc.vix?.change21dPct))}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Independência vs. Brasil</span>
              <span class="ci-cycle-kpi-val" style="font-size:12px;">Brasil: ${esc(rc.brazilComparison?.brazilRegimeLabel || 'Indisp.')}</span>
              <span class="ci-cycle-kpi-sub">${esc(rc.brazilComparison?.note || '')}</span>
            </div>
          </div>
        </div>

        ${transitions.length ? `
          <div>
            <div class="ci-conn-section-title">Histórico Recente de Períodos EUA</div>
            <div class="ci-cycle-transitions">
              ${transitions.map(tr => `
                <div class="ci-cycle-transition-row">
                  <span style="display:inline-flex;align-items:center;gap:6px;font-weight:700;color:#ffffff;">
                    <i style="width:8px;height:8px;border-radius:50%;background:${esc(tr.color)};display:inline-block;"></i>
                    ${esc(tr.regimeLabel)}
                  </span>
                  <span style="color:#9bb8aa;">${esc(fmtShortDate(tr.startDate))} → ${esc(fmtShortDate(tr.endDate))}</span>
                  <span style="color:#f3d58d;font-weight:700;">${esc(tr.durationTradingDays)}p</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="ci-detail-row">
          <div class="ci-detail-k">Metodologia Documentada, Fonte & Timestamp</div>
          <div class="ci-detail-v" style="font-size:11px;color:#9bb8aa;line-height:1.45;">
            <strong>Motor:</strong> ${esc(meth.engine || 'backend/src/market-regime.js')}<br/>
            <strong>Regras:</strong> ${esc(meth.directionRule || '')} · ${esc(meth.volatilityRule || '')}<br/>
            <strong>Separação:</strong> ${esc(meth.separationGuarantee || '')}<br/>
            <strong>Fonte:</strong> ${esc(d.provenance?.provider || node.source)} (${esc(d.provenance?.primaryInstrument || 'SPY')}) · <strong>Ref.:</strong> ${esc(d.provenance?.asOfDate || '—')} · <strong>Coleta:</strong> ${esc(collectedStr)}
          </div>
        </div>
      `;
    }

    openUsCycleModal(node) {
      const modal = document.getElementById('ciConnectionModal');
      if (!modal || !node?.usCycleDetail) return;
      this.selectedConnectionId = 'us_cycle_modal';

      const freshState = node.freshnessStatus || 'indisponivel';
      const freshLabel = freshState === 'atualizado'
        ? `● Atualizado (${node.asOfDate || '—'})`
        : freshState === 'atrasado'
          ? `◐ Atrasado (${node.lagBusinessDays || 1}p · ${node.asOfDate || '—'})`
          : freshState === 'parcial'
            ? `◐ Parcial (${node.asOfDate || '—'})`
            : '○ Indisponível';

      modal.innerHTML = `
        <div class="ci-modal-card ci-modal-wide">
          <header class="ci-modal-head">
            <div>
              <div class="ci-drawer-eyebrow">ESTADOS UNIDOS · CICLO DE MERCADO INDEPENDENTE</div>
              <h2>Diagnóstico Estrutural — Ciclo de Mercado Estados Unidos</h2>
            </div>
            <button type="button" class="ci-close-btn" id="ciCloseUsCycleModalBtn" aria-label="Fechar diagnóstico EUA">✕</button>
          </header>
          <div class="ci-modal-body">
            ${this.buildUsCycleDiagnosticsHtml(node, freshLabel, freshState)}
          </div>
          <footer class="ci-modal-foot">
            <button type="button" class="ci-link-btn" id="ciGoUsMarketCycleModalBtn">Abrir Ciclo de Mercado (S&P 500) →</button>
            <button type="button" class="ci-link-btn" id="ciCloseUsCycleFooterBtn">Fechar</button>
          </footer>
        </div>
      `;

      modal.classList.add('open');
      document.getElementById('ciCloseUsCycleModalBtn')?.addEventListener('click', () => this.closeConnectionModal());
      document.getElementById('ciCloseUsCycleFooterBtn')?.addEventListener('click', () => this.closeConnectionModal());
      document.getElementById('ciGoUsMarketCycleModalBtn')?.addEventListener('click', () => {
        this.closeConnectionModal();
        if (typeof root.go === 'function') root.go('marketcycle', 'sp500');
      });
    }

    buildBreadthSvgChart(history, mode = 'sma') {
      if (!Array.isArray(history) || history.length < 2) {
        return '<div class="ci-cycle-note-muted">Série histórica insuficiente para gráfico de evolução.</div>';
      }
      const W = 320;
      const H = 96;
      const padL = 28;
      const padR = 8;
      const padT = 8;
      const padB = 18;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      const xFor = (idx) => padL + (idx / (history.length - 1)) * plotW;
      const fmtD = (iso) => iso && iso.length >= 10 ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';

      if (mode === 'sma') {
        const yForPct = (p) => padT + (1 - Math.max(0, Math.min(100, p)) / 100) * plotH;
        const pts50 = history.map((d, i) => Number.isFinite(d.aboveSma50Pct) ? `${xFor(i).toFixed(1)},${yForPct(d.aboveSma50Pct).toFixed(1)}` : null).filter(Boolean);
        const pts200 = history.map((d, i) => Number.isFinite(d.aboveSma200Pct) ? `${xFor(i).toFixed(1)},${yForPct(d.aboveSma200Pct).toFixed(1)}` : null).filter(Boolean);

        return `
          <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" role="img" aria-label="Evolução % acima das médias de 50 e 200 dias">
            <line x1="${padL}" y1="${yForPct(60).toFixed(1)}" x2="${W - padR}" y2="${yForPct(60).toFixed(1)}" stroke="rgba(16,185,129,0.28)" stroke-dasharray="3 3" />
            <line x1="${padL}" y1="${yForPct(40).toFixed(1)}" x2="${W - padR}" y2="${yForPct(40).toFixed(1)}" stroke="rgba(239,68,68,0.28)" stroke-dasharray="3 3" />
            <text x="2" y="${(yForPct(60) + 3).toFixed(1)}" fill="#688578" font-size="8.5">60%</text>
            <text x="2" y="${(yForPct(40) + 3).toFixed(1)}" fill="#688578" font-size="8.5">40%</text>
            ${pts200.length >= 2 ? `<polyline fill="none" stroke="#38bdf8" stroke-width="1.8" points="${pts200.join(' ')}" />` : ''}
            ${pts50.length >= 2 ? `<polyline fill="none" stroke="#c084fc" stroke-width="2.1" points="${pts50.join(' ')}" />` : ''}
            <text x="${padL}" y="${H - 4}" fill="#688578" font-size="8.5">${esc(fmtD(history[0].date))}</text>
            <text x="${W - padR}" y="${H - 4}" text-anchor="end" fill="#688578" font-size="8.5">${esc(fmtD(history[history.length - 1].date))}</text>
          </svg>
        `;
      }

      // Advance/Decline Line acumulada
      const vals = history.map(d => Number(d.adLine || 0));
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const span = (maxV - minV) || 1;
      const yForVal = (v) => padT + (1 - (v - minV) / span) * plotH;
      const ptsAd = vals.map((v, i) => `${xFor(i).toFixed(1)},${yForVal(v).toFixed(1)}`);
      const strokeColor = vals[vals.length - 1] >= vals[0] ? '#10b981' : '#f87171';

      return `
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" role="img" aria-label="Evolução da Advance/Decline Line acumulada">
          <line x1="${padL}" y1="${yForVal(vals[0]).toFixed(1)}" x2="${W - padR}" y2="${yForVal(vals[0]).toFixed(1)}" stroke="rgba(155,184,170,0.22)" stroke-dasharray="3 3" />
          <polyline fill="none" stroke="${strokeColor}" stroke-width="2.1" points="${ptsAd.join(' ')}" />
          <text x="2" y="${(padT + 7).toFixed(1)}" fill="#688578" font-size="8.5">${esc(Math.round(maxV))}</text>
          <text x="2" y="${(H - padB).toFixed(1)}" fill="#688578" font-size="8.5">${esc(Math.round(minV))}</text>
          <text x="${padL}" y="${H - 4}" fill="#688578" font-size="8.5">${esc(fmtD(history[0].date))}</text>
          <text x="${W - padR}" y="${H - 4}" text-anchor="end" fill="#688578" font-size="8.5">${esc(fmtD(history[history.length - 1].date))}</text>
        </svg>
      `;
    }

    buildUsBreadthDiagnosticsHtml(node, freshLabel, freshState) {
      const d = node.usBreadthDetail || {};
      const cond = d.condition || {};
      const div = d.divergence || {};
      const latest = d.latest || {};
      const ev21 = d.evolution21d || {};
      const sp500 = d.universes?.sp500 || {};
      const ndx = d.universes?.nasdaq100 || {};
      const hist21 = Array.isArray(d.history21d) ? d.history21d : [];
      const meth = d.methodology || {};
      const lims = Array.isArray(d.limitations) ? d.limitations : [];

      const fmtPct = (v) => (v !== null && v !== undefined && Number.isFinite(Number(v))) ? `${Number(v).toFixed(1).replace('.', ',')}%` : 'Indisponível';
      const fmtDeltaPp = (v) => (v !== null && v !== undefined && Number.isFinite(Number(v))) ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1).replace('.', ',')} p.p.` : '—';
      const condColor = cond.code === 'strong' ? '#10b981' : cond.code === 'weak' ? '#ef4444' : cond.code === 'neutral' ? '#f59e0b' : '#94a3b8';
      const divColor = div.state === 'bearish_divergence' ? '#ef4444' : div.state === 'bullish_divergence' ? '#10b981' : '#d4af37';

      const collectedStr = d.provenance?.collectedAt
        ? new Date(d.provenance.collectedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '—';

      return `
        <div class="ci-metric-hero">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span class="ci-cycle-regime-pill" style="border-color:${esc(condColor)};">
              <span class="ci-cycle-regime-dot" style="background:${esc(condColor)};"></span>
              Condição Ampla: ${esc(cond.label || 'Indisponível')}
            </span>
            <span class="ci-provenance-badge ${freshState === 'atualizado' ? 'is-live' : ''}">${esc(freshLabel)}</span>
          </div>
          ${Array.isArray(cond.pillars) && cond.pillars.length ? `
            <div class="ci-cycle-tags-row" style="margin-top:6px;">
              ${cond.pillars.map(p => `<span class="ci-cycle-chip">${esc(p.label)}: <strong>${esc(p.valueDisplay)}</strong> (${esc(p.state)})</span>`).join('')}
            </div>
          ` : ''}
          <div class="ci-detail-row" style="margin-top:8px;border-color:${esc(divColor)}55;">
            <div class="ci-detail-k" style="color:${esc(divColor)};">${esc(div.label || 'Divergência Índice × Participação')}</div>
            <div class="ci-detail-v">${esc(div.explanation || 'Amplitude avaliada de forma independente do ciclo do índice.')}</div>
            ${div.dateMismatchWarning ? `<div class="ci-cycle-note-muted" style="margin-top:4px;color:#fde68a;">${esc(div.dateMismatchWarning)}</div>` : ''}
          </div>
        </div>

        <div>
          <div class="ci-conn-section-title">Métricas Prioritárias — Participação Interna EUA</div>
          <div class="ci-cycle-kpi-grid">
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">S&P 500 (% > MM50 / MM200)</span>
              <span class="ci-cycle-kpi-val">${sp500.available ? `${esc(fmtPct(sp500.latest?.aboveSma50Pct))} / ${esc(fmtPct(sp500.latest?.aboveSma200Pct))}` : 'Indisponível'}</span>
              <span class="ci-cycle-kpi-sub">Cobertura: ${esc(sp500.composition?.coveredConstituents || 0)}/500 ações${sp500.available ? ` · Ref: ${esc(sp500.asOfDate)}` : ' · aguardando feed em lote'}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Nasdaq-100 (% > MM50 / MM200)</span>
              <span class="ci-cycle-kpi-val">${ndx.available ? `${esc(fmtPct(ndx.latest?.aboveSma50Pct))} / ${esc(fmtPct(ndx.latest?.aboveSma200Pct))}` : 'Indisponível'}</span>
              <span class="ci-cycle-kpi-sub">Cobertura: ${esc(ndx.composition?.coveredConstituents || 0)}/100 ações${ndx.available ? ` · Δ21p MM50: ${esc(fmtDeltaPp(ndx.evolution21d?.deltaAboveSma50Pp))}` : ''}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Advance / Decline & A/D Line</span>
              <span class="ci-cycle-kpi-val">${Number.isFinite(latest.advances) ? `${esc(latest.advances)} ↑ / ${esc(latest.declines)} ↓` : 'Indisponível'}</span>
              <span class="ci-cycle-kpi-sub">Razão A/D: ${latest.adRatio != null ? esc(String(latest.adRatio).replace('.', ',')) : '—'} · Δ A/D Line 21p: ${Number.isFinite(ev21.adLineDelta) ? `${ev21.adLineDelta > 0 ? '+' : ''}${esc(ev21.adLineDelta)}` : '—'}</span>
            </div>
            <div class="ci-cycle-kpi-card">
              <span class="ci-cycle-kpi-label">Novas Máximas vs. Mínimas (52s)</span>
              <span class="ci-cycle-kpi-val">${latest.newHighs52w != null ? `${esc(latest.newHighs52w)} Máx / ${esc(latest.newLows52w)} Mín` : 'Indisponível'}</span>
              <span class="ci-cycle-kpi-sub">Saldo 52s: ${latest.netNewHighs52w != null ? `${latest.netNewHighs52w > 0 ? '+' : ''}${esc(latest.netNewHighs52w)}` : '—'} · Soma 21p: ${ev21.netHighLowSum != null ? `${ev21.netHighLowSum > 0 ? '+' : ''}${esc(ev21.netHighLowSum)}` : '—'}</span>
            </div>
          </div>
        </div>

        ${hist21.length >= 2 ? `
          <div class="ci-cycle-kpi-grid">
            <div class="ci-cycle-timeline-wrap">
              <div class="ci-cycle-timeline-head">
                <span>% > MM50 (roxo) & MM200 (azul)</span>
                <span>${esc(hist21.length)} pregões</span>
              </div>
              ${this.buildBreadthSvgChart(hist21, 'sma')}
            </div>
            <div class="ci-cycle-timeline-wrap">
              <div class="ci-cycle-timeline-head">
                <span>Advance / Decline Line</span>
                <span>${esc(hist21.length)} pregões</span>
              </div>
              ${this.buildBreadthSvgChart(hist21, 'adline')}
            </div>
          </div>
        ` : ''}

        ${lims.length ? `
          <div class="ci-detail-row">
            <div class="ci-detail-k">Composição, Cobertura & Limitações do Universo</div>
            <div class="ci-detail-v" style="font-size:11px;color:#cfe0d6;line-height:1.45;">
              ${lims.map(l => `• ${esc(l)}`).join('<br/>')}
            </div>
          </div>
        ` : ''}

        <div class="ci-detail-row">
          <div class="ci-detail-k">Metodologia Multi-Fator, Fontes & Defasagem</div>
          <div class="ci-detail-v" style="font-size:11px;color:#9bb8aa;line-height:1.45;">
            <strong>Regra:</strong> ${esc(meth.classificationRule || '')}<br/>
            <strong>Separação:</strong> ${esc(meth.separationRule || '')}<br/>
            <strong>Fonte Primária:</strong> ${esc(d.provenance?.source || node.source)} (${esc(d.primaryUniverseName || '—')}) · <strong>Ref.:</strong> ${esc(d.provenance?.asOfDate || '—')} · <strong>Defasagem:</strong> ${d.provenance?.lagBusinessDays != null ? `${esc(d.provenance.lagBusinessDays)} pregões` : '—'} · <strong>Coleta:</strong> ${esc(collectedStr)}
          </div>
        </div>
      `;
    }

    openUsBreadthModal(node) {
      const modal = document.getElementById('ciConnectionModal');
      if (!modal || !node?.usBreadthDetail) return;
      this.selectedConnectionId = 'us_breadth_modal';

      const freshState = node.freshnessStatus || 'indisponivel';
      const freshLabel = freshState === 'atualizado'
        ? `● Atualizado (${node.asOfDate || '—'})`
        : freshState === 'atrasado'
          ? `◐ Atrasado (${node.lagBusinessDays || 1}p · ${node.asOfDate || '—'})`
          : freshState === 'parcial'
            ? `◐ Parcial (${node.asOfDate || '—'})`
            : '○ Indisponível';

      modal.innerHTML = `
        <div class="ci-modal-card ci-modal-wide">
          <header class="ci-modal-head">
            <div>
              <div class="ci-drawer-eyebrow">MARKET BREADTH (EUA) · ESFERA INDEPENDENTE</div>
              <h2>Amplitude e Saúde Interna — Mercado Americano</h2>
            </div>
            <button type="button" class="ci-close-btn" id="ciCloseUsBreadthModalBtn" aria-label="Fechar Market Breadth EUA">✕</button>
          </header>
          <div class="ci-modal-body">
            ${this.buildUsBreadthDiagnosticsHtml(node, freshLabel, freshState)}
          </div>
          <footer class="ci-modal-foot">
            <button type="button" class="ci-link-btn" id="ciCloseUsBreadthFooterBtn">Fechar</button>
          </footer>
        </div>
      `;

      modal.classList.add('open');
      document.getElementById('ciCloseUsBreadthModalBtn')?.addEventListener('click', () => this.closeConnectionModal());
      document.getElementById('ciCloseUsBreadthFooterBtn')?.addEventListener('click', () => this.closeConnectionModal());
    }

    buildSectorRsSparklineSvg(rsSeries21d, strokeColor) {
      if (!Array.isArray(rsSeries21d) || rsSeries21d.length < 2) {
        return '<span style="font-size:10px;color:#688578;">—</span>';
      }
      const W = 74;
      const H = 22;
      const pad = 2;
      const vals = rsSeries21d.map(p => Number(p.rsIndex));
      const minV = Math.min(100, ...vals);
      const maxV = Math.max(100, ...vals);
      const span = (maxV - minV) || 1;
      const yFor = (v) => pad + (1 - (v - minV) / span) * (H - pad * 2);
      const xFor = (i) => pad + (i / (vals.length - 1)) * (W - pad * 2);
      const baseLineY = yFor(100).toFixed(1);
      const pts = vals.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
      return `
        <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;flex-shrink:0;" role="img" aria-label="Curva de força relativa 21 pregões vs SPY">
          <line x1="${pad}" y1="${baseLineY}" x2="${W - pad}" y2="${baseLineY}" stroke="rgba(155,184,170,0.28)" stroke-dasharray="2 2" stroke-width="0.9" />
          <polyline fill="none" stroke="${esc(strokeColor || '#94a3b8')}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
        </svg>
      `;
    }

    buildUsSectorRotationDiagnosticsHtml(node, freshLabel, freshState) {
      const d = node.usSectorRotationDetail || {};
      const bm = d.benchmark || {};
      const counts = d.summaryCounts || { totalCataloged: 12, covered: 0, classified21d: 0, strengthening: 0, neutral: 0, weakening: 0 };
      const profile = d.rotationProfile || {};
      const sectors = Array.isArray(d.sectors) ? d.sectors : [];
      const clusters = Array.isArray(d.clusterComparison) ? d.clusterComparison : [];
      const legend = Array.isArray(d.colorLegend) && d.colorLegend.length
        ? d.colorLegend
        : [
            { code: 'strengthening', label: 'Fortalecendo (ganhando força relativa vs. SPY)', color: '#10b981' },
            { code: 'neutral', label: 'Neutro (em linha com o SPY)', color: '#94a3b8' },
            { code: 'weakening', label: 'Enfraquecendo (perdendo força relativa vs. SPY)', color: '#ef4444' }
          ];
      const meth = d.methodology || {};
      const lims = Array.isArray(d.limitations) ? d.limitations : [];

      const fmtPct = (v, suffix = '%') => (v !== null && v !== undefined && Number.isFinite(Number(v)))
        ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2).replace('.', ',')}${suffix}`
        : '—';
      const collectedStr = d.provenance?.collectedAt
        ? new Date(d.provenance.collectedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '—';

      // Escala simétrica das barras divergentes (baseada no maior desvio absoluto em 21p, mínimo 4 p.p.)
      const maxAbsExcess = Math.max(
        4,
        ...sectors.map(s => (Number.isFinite(s.excessReturnVsSpy21dPct) ? Math.abs(s.excessReturnVsSpy21dPct) : 0))
      );

      const profileColor = counts.strengthening > counts.weakening
        ? '#10b981'
        : counts.weakening > counts.strengthening
          ? '#ef4444'
          : '#38bdf8';

      return `
        <div class="ci-metric-hero">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span class="ci-cycle-regime-pill" style="border-color:${esc(profileColor)};">
              <span class="ci-cycle-regime-dot" style="background:${esc(profileColor)};"></span>
              ${esc(profile.label || 'Rotação Setorial EUA')}
            </span>
            <span class="ci-provenance-badge ${freshState === 'atualizado' ? 'is-live' : ''}">${esc(freshLabel)}</span>
          </div>
          <div class="ci-cycle-tags-row" style="margin-top:6px;">
            <span class="ci-cycle-chip" style="border-color:rgba(16,185,129,0.45);color:#6ee7b7;">↑ Fortalecendo: <strong>${esc(counts.strengthening)}</strong></span>
            <span class="ci-cycle-chip">• Neutros: <strong>${esc(counts.neutral)}</strong></span>
            <span class="ci-cycle-chip" style="border-color:rgba(239,68,68,0.45);color:#fca5a5;">↓ Enfraquecendo: <strong>${esc(counts.weakening)}</strong></span>
            <span class="ci-cycle-chip">Benchmark: <strong>${esc(bm.symbol || 'SPY')}</strong> (21p: ${esc(fmtPct(bm.return21dPct))} · 63p: ${esc(fmtPct(bm.return63dPct))})</span>
          </div>
          ${profile.summary ? `<p class="ci-drawer-desc" style="margin-top:6px;">${esc(profile.summary)}</p>` : ''}
        </div>

        <div class="ci-epistemic-box">
          <strong>Distinção Epistemológica (Desempenho Relativo ≠ Fluxo de Fundos):</strong>
          ${esc(d.disclaimerNote || meth.epistemologicalRule || 'Esta dimensão mede desempenho relativo de preço de ETFs setoriais contra o S&P 500 (SPY) e não comprova entrada ou saída líquida de recursos em fundos.')}
        </div>

        <div class="ci-sector-legend" aria-label="Legenda de força relativa setorial">
          ${legend.map(item => `
            <span class="ci-sector-legend-item">
              <i class="ci-sector-legend-dot" style="background:${esc(item.color)};"></i>
              <span>${esc(item.label)}</span>
            </span>
          `).join('')}
        </div>

        ${sectors.length ? `
          <div>
            <div class="ci-conn-section-title">Força Relativa Setorial vs. S&P 500 (SPY) — Ordenado por 21 Pregões (Nunca por 1 Dia)</div>
            <div class="ci-sector-table" role="table" aria-label="Comparativo de rotação setorial americana">
              <div class="ci-sector-table-head" role="row">
                <span>Setor / ETF</span>
                <span>Δ vs SPY (21p) · Barra Relativa</span>
                <span>21p Abs.</span>
                <span>Δ vs SPY (63p)</span>
                <span>Curva RS 21p</span>
                <span>Estado</span>
              </div>
              ${sectors.map(sec => {
                const ex21 = Number.isFinite(sec.excessReturnVsSpy21dPct) ? sec.excessReturnVsSpy21dPct : null;
                const widthPct = ex21 !== null ? Math.min(50, (Math.abs(ex21) / maxAbsExcess) * 50) : 0;
                const leftPct = ex21 !== null && ex21 < 0 ? (50 - widthPct) : 50;
                const barColor = sec.rotationColor || '#94a3b8';
                return `
                  <div class="ci-sector-row" role="row" title="${esc(sec.name)} · ${esc(sec.rsMomentumNote || '')} · 63p Abs.: ${esc(fmtPct(sec.return63dPct))}">
                    <div class="ci-sector-cell-name">
                      <span class="ci-sector-name">${esc(sec.sector)}</span>
                      <span class="ci-sector-sym">${esc(sec.symbol)} · ${esc(sec.rsMomentumNote || '')}</span>
                    </div>
                    <div class="ci-sector-bar-col">
                      <div class="ci-sector-bar-track" aria-hidden="true">
                        <span class="ci-sector-bar-center"></span>
                        ${ex21 !== null ? `<span class="ci-sector-bar-fill" style="left:${leftPct.toFixed(1)}%;width:${widthPct.toFixed(1)}%;background:${esc(barColor)};"></span>` : ''}
                      </div>
                      <span class="ci-sector-excess-val" style="color:${esc(barColor)};">${esc(fmtPct(ex21, ' p.p.'))}</span>
                    </div>
                    <div class="ci-sector-num">${esc(fmtPct(sec.return21dPct))}</div>
                    <div class="ci-sector-num">${esc(fmtPct(sec.excessReturnVsSpy63dPct, ' p.p.'))}</div>
                    <div class="ci-sector-spark">${this.buildSectorRsSparklineSvg(sec.rsSeries21d, barColor)}</div>
                    <div>
                      <span class="ci-sector-state-badge" style="color:${esc(barColor)};border-color:${esc(barColor)}55;background:${esc(barColor)}18;">
                        ${esc(sec.rotationLabel || 'Neutro')}
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : `
          <div class="ci-detail-row">
            <div class="ci-detail-k">Série de ETFs Setoriais Indisponível</div>
            <div class="ci-detail-v">Aguardando coleta histórica (mínimo 22 pregões fechados) dos 12 ETFs setoriais americanos (XLK, SMH, XLE, XLV, XLF, XLY, XLP, XLI, XLU, XLB, XLRE, XLC) e do benchmark SPY. Nenhum valor é estimado ou simulado.</div>
          </div>
        `}

        ${clusters.some(c => c.sectorsCount > 0) ? `
          <div>
            <div class="ci-conn-section-title">Comparativo por Blocos Temáticos (Média Δ vs. SPY em 21p)</div>
            <div class="ci-sector-cluster-grid">
              ${clusters.map(cl => `
                <div class="ci-cycle-kpi-card" style="border-color:${esc(cl.color)}40;">
                  <span class="ci-cycle-kpi-label">${esc(cl.cluster)}</span>
                  <span class="ci-cycle-kpi-val" style="color:${esc(cl.color)};">${esc(fmtPct(cl.avgExcessVsSpy21dPct, ' p.p.'))}</span>
                  <span class="ci-cycle-kpi-sub">${esc(cl.stateLabel)} · ETFs: ${esc(cl.symbols.join(', ') || 'Indisponível')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${lims.length ? `
          <div class="ci-detail-row">
            <div class="ci-detail-k">Cobertura & Limitações Transparentes (${esc(counts.covered)}/${esc(counts.totalCataloged)} ETFs)</div>
            <div class="ci-detail-v" style="font-size:11px;color:#cfe0d6;line-height:1.45;">
              ${lims.map(l => `• ${esc(l)}`).join('<br/>')}
            </div>
          </div>
        ` : ''}

        <div class="ci-detail-row">
          <div class="ci-detail-k">Metodologia Documentada, Benchmark & Rastreabilidade</div>
          <div class="ci-detail-v" style="font-size:11px;color:#9bb8aa;line-height:1.45;">
            <strong>Benchmark:</strong> ${esc(meth.benchmark || 'SPY — S&P 500')}<br/>
            <strong>Fórmula:</strong> ${esc(meth.relativeStrengthFormula || '')}<br/>
            <strong>Classificação:</strong> ${esc(meth.classificationRule || '')}<br/>
            <strong>Fonte:</strong> ${esc(d.provenance?.provider || node.source)} · <strong>Cobertura:</strong> ${esc(d.provenance?.coverageLabel || `${counts.covered}/${counts.totalCataloged}`)} · <strong>Ref.:</strong> ${esc(d.provenance?.asOfDate || '—')} · <strong>Defasagem:</strong> ${d.provenance?.lagBusinessDays != null ? `${esc(d.provenance.lagBusinessDays)} pregões` : '—'} · <strong>Coleta:</strong> ${esc(collectedStr)}
          </div>
        </div>
      `;
    }

    openUsSectorRotationModal(node) {
      const modal = document.getElementById('ciConnectionModal');
      if (!modal || !node?.usSectorRotationDetail) return;
      this.selectedConnectionId = 'us_sector_rotation_modal';

      const freshState = node.freshnessStatus || 'indisponivel';
      const freshLabel = freshState === 'atualizado'
        ? `● Atualizado (${node.asOfDate || '—'})`
        : freshState === 'atrasado'
          ? `◐ Atrasado (${node.lagBusinessDays || 1}p · ${node.asOfDate || '—'})`
          : freshState === 'parcial'
            ? `◐ Parcial (${node.asOfDate || '—'})`
            : '○ Indisponível';

      modal.innerHTML = `
        <div class="ci-modal-card ci-modal-wide">
          <header class="ci-modal-head">
            <div>
              <div class="ci-drawer-eyebrow">ESTADOS UNIDOS · ROTAÇÃO SETORIAL E FORÇA RELATIVA</div>
              <h2>Rotação Setorial & Força Relativa EUA (vs. S&P 500)</h2>
            </div>
            <button type="button" class="ci-close-btn" id="ciCloseUsSectorModalBtn" aria-label="Fechar rotação setorial EUA">✕</button>
          </header>
          <div class="ci-modal-body">
            ${this.buildUsSectorRotationDiagnosticsHtml(node, freshLabel, freshState)}
          </div>
          <footer class="ci-modal-foot">
            <button type="button" class="ci-link-btn" id="ciCloseUsSectorFooterBtn">Fechar</button>
          </footer>
        </div>
      `;

      modal.classList.add('open');
      document.getElementById('ciCloseUsSectorModalBtn')?.addEventListener('click', () => this.closeConnectionModal());
      document.getElementById('ciCloseUsSectorFooterBtn')?.addEventListener('click', () => this.closeConnectionModal());
    }

    buildMacroTrendSvgChart(series21d, unitSpec, strokeColor) {
      if (!Array.isArray(series21d) || series21d.length < 2) {
        return '<div class="ci-cycle-note-muted" style="padding:14px 0;text-align:center;">Série histórica insuficiente para gráfico de tendência.</div>';
      }
      const W = 310;
      const H = 82;
      const padL = 38;
      const padR = 8;
      const padT = 8;
      const padB = 16;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      const vals = series21d.map(p => Number(p.value));
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      const span = (maxV - minV) || Math.max(0.01, Math.abs(maxV) * 0.02);
      const xFor = (i) => padL + (i / (vals.length - 1)) * plotW;
      const yFor = (v) => padT + (1 - (v - minV) / span) * plotH;
      const pts = vals.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
      const startY = yFor(vals[0]).toFixed(1);
      const fmtD = (iso) => (iso && iso.length >= 10) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
      const fmtAxis = (v) => {
        if (unitSpec?.unitFamily === 'interest_rate_pct_aa') return `${v.toFixed(2).replace('.', ',')}%`;
        if (unitSpec?.unitFamily === 'currency_brl_usd') return v.toFixed(2).replace('.', ',');
        return v.toFixed(1).replace('.', ',');
      };

      return `
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;" role="img" aria-label="Gráfico de tendência histórica de 21 pregões em unidade nativa">
          <line x1="${padL}" y1="${startY}" x2="${W - padR}" y2="${startY}" stroke="rgba(155,184,170,0.28)" stroke-dasharray="3 3" stroke-width="1" />
          <polyline fill="none" stroke="${esc(strokeColor || '#38bdf8')}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
          <circle cx="${xFor(vals.length - 1).toFixed(1)}" cy="${yFor(vals[vals.length - 1]).toFixed(1)}" r="2.8" fill="${esc(strokeColor || '#38bdf8')}" />
          <text x="2" y="${(padT + 6).toFixed(1)}" fill="#688578" font-size="8.5">${esc(fmtAxis(maxV))}</text>
          <text x="2" y="${(H - padB).toFixed(1)}" fill="#688578" font-size="8.5">${esc(fmtAxis(minV))}</text>
          <text x="${padL}" y="${H - 3}" fill="#688578" font-size="8.5">${esc(fmtD(series21d[0].date))}</text>
          <text x="${W - padR}" y="${H - 3}" text-anchor="end" fill="#688578" font-size="8.5">${esc(fmtD(series21d[series21d.length - 1].date))}</text>
        </svg>
      `;
    }

    buildMacroTrendsDiagnosticsHtml(focusedSatelliteId = null) {
      const mt = this.model?.macroTrendsDetail || {};
      const inds = mt.indicators || {};
      const list = [inds.fx_usd_brl, inds.rate_di_curve, inds.rate_us10y, inds.vol_vix].filter(Boolean);
      const selic = mt.policyContext?.selic || null;
      const brDist = mt.policyContext?.brRatesDistinction || {};
      const normComp = Array.isArray(mt.normalizedComparison21d) ? mt.normalizedComparison21d : [];
      const meth = mt.methodology || {};

      const fmtFresh = (item) => {
        if (!item) return { label: '○ Indisponível', isLive: false };
        if (item.status === 'atualizado') return { label: `● Atualizado (${item.asOfDate || '—'})`, isLive: true };
        if (item.status === 'atrasado') return { label: `◐ Atrasado (${item.lagBusinessDays || 1}p · ${item.asOfDate || '—'})`, isLive: false };
        return { label: '○ Indisponível', isLive: false };
      };

      const fmtShortDate = (iso) => (iso && iso.length >= 10) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—';
      const fmtTs = (ts) => {
        if (!ts) return '—';
        try {
          return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch (_) {
          return '—';
        }
      };

      const overallStatus = mt.status || 'indisponivel';
      const overallLabel = overallStatus === 'atualizado'
        ? '● Todas as séries atualizadas'
        : overallStatus === 'parcial'
          ? `◐ Cobertura Parcial (${mt.counts?.atualizado || 0} atualizadas · ${mt.counts?.atrasado || 0} atrasadas · ${mt.counts?.indisponivel || 0} indisponíveis)`
          : overallStatus === 'atrasado'
            ? '◐ Séries defasadas frente ao fechamento esperado'
            : '○ Séries macro indisponíveis';

      return `
        <div class="ci-metric-hero">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span class="ci-cycle-regime-pill" style="border-color:#d4af37;">
              <span class="ci-cycle-regime-dot" style="background:#d4af37;"></span>
              Tendências Históricas — 21 Pregões (Unidades Nativas)
            </span>
            <span class="ci-provenance-badge ${overallStatus === 'atualizado' ? 'is-live' : ''}">${esc(overallLabel)}</span>
          </div>
          <p class="ci-drawer-desc" style="margin-top:6px;">
            Foco na trajetória histórica de 21 pregões (com contexto de 63 pregões), apresentando o valor mais recente como informação complementar — sem classificar o cenário por 1 único pregão nem afirmar causalidade automática.
          </p>
        </div>

        <div class="ci-macro-cards-grid">
          ${list.map(ind => {
            const fresh = fmtFresh(ind);
            const isFocused = focusedSatelliteId && ind.satelliteId === focusedSatelliteId;
            const trendColor = ind.trend?.color || '#94a3b8';
            const periodTxt = ind.period21d
              ? `${fmtShortDate(ind.period21d.startDate)} → ${fmtShortDate(ind.period21d.endDate)} (${ind.period21d.sessions}p)`
              : 'Sem janela histórica';
            return `
              <article class="ci-macro-trend-card ${isFocused ? 'is-focused' : ''}">
                <div class="ci-macro-trend-head">
                  <div>
                    <div class="ci-macro-trend-title">${esc(ind.title)}</div>
                    <div class="ci-macro-trend-unit">Unidade: ${esc(ind.unitSpec?.levelUnit || '')} · Tendência em ${esc(ind.unitSpec?.primaryDeltaUnit || '')}${ind.unitSpec?.secondaryDeltaUnit ? ` (${esc(ind.unitSpec.secondaryDeltaUnit)})` : ''}</div>
                  </div>
                  <span class="ci-provenance-badge ${fresh.isLive ? 'is-live' : ''}">${esc(fresh.label)}</span>
                </div>

                <div class="ci-macro-trend-metrics">
                  <div>
                    <div class="ci-cycle-kpi-label">Tendência 21 Pregões</div>
                    <div class="ci-macro-trend-primary" style="color:${esc(trendColor)};">${esc(ind.primaryDelta21dFormatted)}</div>
                    <div class="ci-cycle-kpi-sub">
                      ${ind.secondaryDelta21dFormatted && ind.secondaryDelta21dFormatted !== '—' ? `${esc(ind.secondaryDelta21dFormatted)} · ` : ''}63p: ${esc(ind.primaryDelta63dFormatted || '—')}
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div class="ci-cycle-kpi-label">Nível Atual (Complementar)</div>
                    <div class="ci-macro-trend-level">${esc(ind.currentValueFormatted)}</div>
                    <span class="ci-sector-state-badge" style="margin-top:3px;width:auto;padding:2px 8px;color:${esc(trendColor)};border-color:${esc(trendColor)}55;background:${esc(trendColor)}18;">
                      ${esc(ind.trend?.shortLabel || 'Indisponível')}
                    </span>
                  </div>
                </div>

                ${ind.levelRegime ? `
                  <div class="ci-cycle-tags-row" style="margin-top:2px;">
                    <span class="ci-cycle-chip" style="border-color:${esc(ind.levelRegime.color)}55;color:${esc(ind.levelRegime.color)};">
                      Regime de Nível VIX: ${esc(ind.levelRegime.label)}
                    </span>
                  </div>
                ` : ''}

                <div class="ci-macro-chart-box">
                  ${this.buildMacroTrendSvgChart(ind.series21d, ind.unitSpec, trendColor)}
                </div>

                <p class="ci-macro-obs-text">${esc(ind.explanation)}</p>

                <div class="ci-macro-meta-foot">
                  <span><strong>Fonte:</strong> ${esc(ind.sourceLabel)}</span>
                  <span><strong>Período:</strong> ${esc(periodTxt)} · <strong>Coleta:</strong> ${esc(fmtTs(ind.collectedAt))}</span>
                </div>
              </article>
            `;
          }).join('')}
        </div>

        ${selic ? `
          <div class="ci-policy-context-card">
            <div class="ci-macro-trend-head">
              <div>
                <div class="ci-drawer-eyebrow" style="margin-bottom:2px;">CONTEXTO DE POLÍTICA MONETÁRIA (SEPARADO DA CURVA DI)</div>
                <div class="ci-macro-trend-title">Taxa Selic Meta Vigente — COPOM (BCB)</div>
              </div>
              <span class="ci-provenance-badge ${selic.status === 'atualizado' ? 'is-live' : ''}">${esc(fmtFresh(selic).label)}</span>
            </div>
            <div class="ci-cycle-kpi-grid" style="margin-top:8px;">
              <div class="ci-cycle-kpi-card">
                <span class="ci-cycle-kpi-label">Taxa Básica Vigente (Política Monetária)</span>
                <span class="ci-cycle-kpi-val">${esc(selic.currentValueFormatted)}</span>
                <span class="ci-cycle-kpi-sub">21p: ${esc(selic.primaryDelta21dFormatted)} (${esc(selic.secondaryDelta21dFormatted)}) · ${esc(selic.trend?.label || '—')}</span>
              </div>
              <div class="ci-cycle-kpi-card">
                <span class="ci-cycle-kpi-label">Distinção: Curva DI Futuro × Selic Meta</span>
                <span class="ci-cycle-kpi-val" style="font-size:12px;">
                  ${brDist.diAvailable && brDist.spreadDiVsSelicBps !== null
                    ? `Spread DI vs. Selic: ${brDist.spreadDiVsSelicBps > 0 ? '+' : ''}${esc(brDist.spreadDiVsSelicBps)} bps`
                    : 'Curva DI Futuro indisponível (não substituída pela Selic)'}
                </span>
                <span class="ci-cycle-kpi-sub">${esc(brDist.distinctionNote || 'Selic Meta (COPOM) e Curva DI negociada em mercado são métricas distintas.')}</span>
              </div>
            </div>
            <div class="ci-macro-meta-foot" style="margin-top:6px;">
              <span><strong>Fonte:</strong> ${esc(selic.sourceLabel)}</span>
              <span><strong>Ref.:</strong> ${esc(fmtShortDate(selic.asOfDate))} · <strong>Coleta:</strong> ${esc(fmtTs(selic.collectedAt))}</span>
            </div>
          </div>
        ` : ''}

        ${normComp.some(c => Number.isFinite(c.normalizedRangePositionPct)) ? `
          <div class="ci-detail-row">
            <div class="ci-detail-k">Visão Transversal Normalizada — Posição na Faixa de 21p (0% a 100%, sem misturar unidades brutas)</div>
            <div class="ci-macro-norm-list">
              ${normComp.map(item => `
                <div class="ci-macro-norm-row">
                  <span class="ci-macro-norm-name">${esc(item.shortTitle)} <em style="color:#688578;font-style:normal;">(${esc(item.nativeUnit)})</em></span>
                  <div class="ci-macro-norm-track" aria-hidden="true">
                    ${Number.isFinite(item.normalizedRangePositionPct)
                      ? `<span class="ci-macro-norm-marker" style="left:${Math.max(4, Math.min(96, item.normalizedRangePositionPct)).toFixed(0)}%;background:${esc(item.trendColor)};"></span>`
                      : ''}
                  </div>
                  <span class="ci-macro-norm-val" style="color:${esc(item.trendColor)};">${esc(item.primaryDelta21dFormatted)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="ci-epistemic-box">
          <strong>Regras de Rigor Metodológico (Unidades, DI × Selic & Não-Causalidade):</strong><br/>
          • <strong>Janela Histórica:</strong> ${esc(meth.trendRule || '')}<br/>
          • <strong>Normalização de Unidades:</strong> ${esc(meth.unitNormalizationRule || '')}<br/>
          • <strong>Separação DI × Selic:</strong> ${esc(meth.diVsSelicRule || '')}<br/>
          • <strong>Leitura Não-Causal:</strong> ${esc(meth.nonCausalityRule || '')}
        </div>
      `;
    }

    openMacroTrendsModal(focusedSatelliteId = null) {
      const modal = document.getElementById('ciConnectionModal');
      if (!modal || !this.model?.macroTrendsDetail) return;
      this.selectedConnectionId = 'macro_trends_modal';

      modal.innerHTML = `
        <div class="ci-modal-card ci-modal-wide">
          <header class="ci-modal-head">
            <div>
              <div class="ci-drawer-eyebrow">MACROECONOMIA · TENDÊNCIAS HISTÓRICAS (21 PREGÕES)</div>
              <h2>Tendências Macro — Dólar, Curva DI, US Treasury 10Y & VIX</h2>
            </div>
            <button type="button" class="ci-close-btn" id="ciCloseMacroTrendsModalBtn" aria-label="Fechar tendências macro">✕</button>
          </header>
          <div class="ci-modal-body">
            ${this.buildMacroTrendsDiagnosticsHtml(focusedSatelliteId)}
          </div>
          <footer class="ci-modal-foot">
            <button type="button" class="ci-link-btn" id="ciCloseMacroTrendsFooterBtn">Fechar</button>
          </footer>
        </div>
      `;

      modal.classList.add('open');
      document.getElementById('ciCloseMacroTrendsModalBtn')?.addEventListener('click', () => this.closeConnectionModal());
      document.getElementById('ciCloseMacroTrendsFooterBtn')?.addEventListener('click', () => this.closeConnectionModal());
    }

    closeNodeDrawer() {
      const drawer = document.getElementById('ciNodeDrawer');
      if (drawer) {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
      }
      this.selectedNodeId = null;
      this.draw();
    }

    openAllocationModal() {
      const modal = document.getElementById('ciAllocationModal');
      if (!modal || !this.model) return;
      this.isAllocationModalOpen = true;

      const scenario = this.model.getIndicativeRebalanceScenario();
      modal.innerHTML = `
        <div class="ci-modal-card">
          <header class="ci-modal-head">
            <div>
              <div class="ci-drawer-eyebrow">${esc(scenario.horizonLabel)}</div>
              <h2>Análise Detalhada — Sugestão de Alocação</h2>
            </div>
            <button type="button" class="ci-close-btn" id="ciCloseAllocModalBtn" aria-label="Fechar análise de alocação">✕</button>
          </header>

          <div class="ci-modal-body">
            <div class="ci-metric-hero">
              <div class="ci-metric-hero-val">${esc(scenario.postureLabel)}</div>
              <div class="ci-metric-hero-meta">
                <span>Equity de Investimentos: <strong>${esc(scenario.current.equityDisplay)}</strong></span>
                <span class="ci-provenance-badge ${scenario.isLivePortfolio ? 'is-live' : ''}">
                  ${scenario.isLivePortfolio ? '● Patrimônio sincronizado' : '○ Sincronize na Atualização Diária'}
                </span>
              </div>
            </div>

            <table class="ci-alloc-table" aria-label="Comparativo estrutural de alocação por classe">
              <thead>
                <tr>
                  <th>Classe de Capital</th>
                  <th>Posição Atual</th>
                  <th>Diretriz Estrutural (21 Pregões)</th>
                </tr>
              </thead>
              <tbody>
                ${scenario.rows.map(r => `
                  <tr>
                    <td><strong>${esc(r.label)}</strong></td>
                    <td>${esc(r.currentDisplay)}</td>
                    <td>${esc(r.postureGuidance)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="ci-detail-list">
              ${scenario.recommendations.map(rec => `
                <div class="ci-detail-row">
                  <div class="ci-detail-v">✦ ${esc(rec)}</div>
                </div>
              `).join('')}
            </div>

            <div class="ci-disclaimer-box">${esc(scenario.disclaimer)}</div>
          </div>

          <footer class="ci-modal-foot">
            <button type="button" class="ci-link-btn" id="ciCloseAllocFooterBtn">Fechar análise</button>
          </footer>
        </div>
      `;

      modal.classList.add('open');
      document.getElementById('ciCloseAllocModalBtn')?.addEventListener('click', () => this.closeAllocationModal());
      document.getElementById('ciCloseAllocFooterBtn')?.addEventListener('click', () => this.closeAllocationModal());
    }

    closeAllocationModal() {
      const modal = document.getElementById('ciAllocationModal');
      if (modal) modal.classList.remove('open');
      this.isAllocationModalOpen = false;
    }

    openConnectionModal(connId) {
      const modal = document.getElementById('ciConnectionModal');
      if (!modal || !this.model) return;
      const conn = this.model.getConnectionById(connId);
      if (!conn) return;

      this.selectedConnectionId = connId;
      const src = this.model.getNodeById(conn.source);
      const tgt = this.model.getNodeById(conn.target);
      const typeLabel = conn.type === 'economic' ? 'Fluxo Econômico' : conn.type === 'correlation' ? 'Correlação Estrutural' : 'Alocação Patrimonial';

      modal.innerHTML = `
        <div class="ci-modal-card">
          <header class="ci-modal-head">
            <div>
              <div class="ci-drawer-eyebrow">${esc(typeLabel)} · ${esc(conn.timeframe)}</div>
              <h2>${esc(conn.label)}</h2>
            </div>
            <button type="button" class="ci-close-btn" id="ciCloseConnModalBtn" aria-label="Fechar conexão">✕</button>
          </header>

          <div class="ci-modal-body">
            <div class="ci-metric-hero">
              <div class="ci-metric-hero-meta" style="font-size:13px;color:#ffffff;font-weight:700;">
                <span>${esc(src ? src.shortLabel : conn.source)}</span>
                <span style="color:#f3d58d;">⟷</span>
                <span>${esc(tgt ? tgt.shortLabel : conn.target)}</span>
              </div>
            </div>

            <div class="ci-detail-list">
              <div class="ci-detail-row">
                <div class="ci-detail-k">Fundamentação Estrutural</div>
                <div class="ci-detail-v">${esc(conn.explanation)}</div>
              </div>
              <div class="ci-detail-row">
                <div class="ci-detail-k">Evidência / Métrica Observada</div>
                <div class="ci-detail-v">${esc(conn.supportingData)}</div>
              </div>
              <div class="ci-detail-row">
                <div class="ci-detail-k">Horizonte de Observação</div>
                <div class="ci-detail-v">${esc(conn.timeframe)}</div>
              </div>
            </div>
          </div>

          <footer class="ci-modal-foot">
            <button type="button" class="ci-link-btn" id="ciCloseConnFooterBtn">Entendido</button>
          </footer>
        </div>
      `;

      modal.classList.add('open');
      document.getElementById('ciCloseConnModalBtn')?.addEventListener('click', () => this.closeConnectionModal());
      document.getElementById('ciCloseConnFooterBtn')?.addEventListener('click', () => this.closeConnectionModal());
    }

    closeConnectionModal() {
      const modal = document.getElementById('ciConnectionModal');
      if (modal) modal.classList.remove('open');
      this.selectedConnectionId = null;
      this.draw();
    }
  }

  root.CapitalIntelligenceHub = new CapitalIntelligenceController();

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('capitalintelligence') || document.getElementById('capitalIntelligenceRoot')) {
      root.CapitalIntelligenceHub.init();
    }
  });

  window.addEventListener('healthyTrend:pageChanged', (e) => {
    if (e.detail?.page === 'capitalintelligence') {
      root.CapitalIntelligenceHub.render();
    }
  });

  window.addEventListener('healthyTrend:equityUpdated', () => {
    const ciPage = typeof document !== 'undefined' ? document.getElementById('capitalintelligence') : null;
    if (ciPage && !ciPage.classList.contains('active')) return;
    root.CapitalIntelligenceHub.hydrateFromSystem();
    root.CapitalIntelligenceHub.renderHeaderStatus();
    root.CapitalIntelligenceHub.renderExecutiveRail();
    root.CapitalIntelligenceHub.draw();
  });

})(typeof window !== 'undefined' ? window : this);

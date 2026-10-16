/**
 * HEALTHY TREND TRADER - PROFIT CELEBRATION CONTROLLER
 * 
 * Implementação do Ritual de Vitória ao embolsar lucro e Painel "Minhas Conquistas".
 * Princípio: Valorizar o processo e a disciplina operacional, não apenas o tamanho do lucro.
 * 
 * Expõe window.ProfitCelebration
 */

(function (root) {
  'use strict';

  const M = root.ProfitCelebrationModel;
  if (!M) {
    console.error('ProfitCelebrationModel não encontrado.');
    return;
  }

  const STORAGE_KEY_CONQUESTS = 'healthy-trend-pc-conquests-v1';
  const STORAGE_KEY_REWARDS = 'healthy-trend-pc-rewards-v1';
  const STORAGE_KEY_SPECIAL = 'healthy-trend-pc-special-v1';
  const STORAGE_KEY_ANIM = 'healthy-trend-pc-animations-enabled';

  // Estado local e cache
  const state = {
    conquests: [],
    rewards: [...M.DEFAULT_REWARDS],
    specialReward: {
      title: 'Fim de semana especial',
      targetConquests: 20,
      description: 'Quando eu completar 20 conquistas, vou me presentear com um fim de semana diferente.',
      imageUrl: 'assets/rewards/weekend.jpg'
    },
    stats: null,
    animationsEnabled: true,
    activeCelebration: null, // dados da sessão ativa no modal
    activeCategoryFilter: 'todas',
    selectedReward: null,
    rewardReason: '',
    planAdheredChoice: 'yes',
    feelingChoice: 'pride',
    isLoading: false,
    filterYear: new Date().getFullYear()
  };

  // Sanitização XSS
  function esc(val) {
    return String(val ?? '')
      .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
  }

  function initAnimationsPreference() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ANIM);
      if (stored !== null) {
        state.animationsEnabled = stored === 'true';
      } else {
        // Respeita preferência do sistema operacional para reduced motion
        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        state.animationsEnabled = !prefersReduced;
      }
    } catch (_) {
      state.animationsEnabled = true;
    }
  }

  function toggleAnimations() {
    state.animationsEnabled = !state.animationsEnabled;
    try {
      localStorage.setItem(STORAGE_KEY_ANIM, String(state.animationsEnabled));
    } catch (_) {}
    const btn = document.querySelector('.pc-animation-toggle-btn');
    if (btn) {
      btn.textContent = state.animationsEnabled ? '✨ Efeitos: Ativados' : '⚡ Efeitos: Desativados';
    }
    if (!state.animationsEnabled) {
      stopConfetti();
    }
  }

  // Persistência local em caso de uso offline ou antes da autenticação
  function loadLocalCache() {
    try {
      const storedConquests = localStorage.getItem(STORAGE_KEY_CONQUESTS);
      if (storedConquests) {
        const parsed = JSON.parse(storedConquests);
        if (Array.isArray(parsed)) state.conquests = parsed;
      }

      const storedRewards = localStorage.getItem(STORAGE_KEY_REWARDS);
      if (storedRewards) {
        const parsed = JSON.parse(storedRewards);
        if (Array.isArray(parsed)) state.rewards = parsed;
      }

      const storedSpecial = localStorage.getItem(STORAGE_KEY_SPECIAL);
      if (storedSpecial) {
        const parsed = JSON.parse(storedSpecial);
        if (parsed && typeof parsed === 'object') state.specialReward = parsed;
      }
    } catch (_) {}
    state.stats = M.calculateConquestsStats(state.conquests);
  }

  function saveLocalCache() {
    try {
      localStorage.setItem(STORAGE_KEY_CONQUESTS, JSON.stringify(state.conquests));
      localStorage.setItem(STORAGE_KEY_REWARDS, JSON.stringify(state.rewards));
      localStorage.setItem(STORAGE_KEY_SPECIAL, JSON.stringify(state.specialReward));
    } catch (_) {}
  }

  // Sincronização com o Backend
  async function fetchAllData() {
    if (!root.healthyTrendApi?.isAuthenticated()) {
      loadLocalCache();
      return;
    }

    state.isLoading = true;
    try {
      const [conquestsRes, rewardsRes] = await Promise.all([
        root.healthyTrendApi.request('/api/profit-celebration/conquests'),
        root.healthyTrendApi.request('/api/profit-celebration/rewards')
      ]);

      if (conquestsRes && Array.isArray(conquestsRes.conquests)) {
        state.conquests = conquestsRes.conquests;
        if (conquestsRes.specialReward) {
          state.specialReward = conquestsRes.specialReward;
        }
      }

      if (Array.isArray(rewardsRes) && rewardsRes.length > 0) {
        state.rewards = rewardsRes;
      }

      state.stats = M.calculateConquestsStats(state.conquests);
      saveLocalCache();
    } catch (err) {
      console.warn('Usando dados locais de conquistas:', err.message);
      loadLocalCache();
    } finally {
      state.isLoading = false;
    }
  }

  /* ==========================================================================
     CONFETTI ANIMATION ENGINE
     ========================================================================== */
  let confettiAnimId = null;
  let confettiParticles = [];

  function startConfetti(canvas) {
    if (!canvas || !state.animationsEnabled) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement.offsetWidth || window.innerWidth;
    canvas.height = canvas.parentElement.offsetHeight || window.innerHeight;

    const colors = ['#d4af37', '#f59e0b', '#10b981', '#34d399', '#ffffff', '#fbbf24', '#059669'];
    confettiParticles = [];
    const count = 90;

    for (let i = 0; i < count; i++) {
      confettiParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.4 - 50,
        r: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltAngleInc: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0,
        vx: Math.random() * 4 - 2,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() * 4 - 2)
      });
    }

    let frame = 0;
    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      confettiParticles.forEach((p) => {
        p.tiltAngle += p.tiltAngleInc;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.tiltAngle) * 0.5;
        p.tilt = Math.sin(p.tiltAngle) * 12;
        p.rotation += p.rotSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.rect(-p.r / 2, -p.r / 2, p.r, p.r * 1.4);
        ctx.fill();
        ctx.restore();
      });

      frame++;
      if (frame < 240) {
        confettiAnimId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    render();
  }

  function stopConfetti() {
    if (confettiAnimId) {
      cancelAnimationFrame(confettiAnimId);
      confettiAnimId = null;
    }
    const canvas = document.getElementById('pcConfettiCanvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ==========================================================================
     MODAL DE CELEBRAÇÃO (3 ETAPAS)
     ========================================================================== */

  function getModalOverlay() {
    let overlay = document.getElementById('pcCelebrationModalOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'pcCelebrationModalOverlay';
      overlay.className = 'pc-modal-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'pcCelebrationModalTitle');
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeCelebrationModal();
        }
      });
    }
    return overlay;
  }

  function openCelebrationModal(data = {}) {
    initAnimationsPreference();

    const stats = state.stats || M.calculateConquestsStats(state.conquests);
    const realized = Number(data.realizedAmount ?? data.realized_amount ?? 0);
    const rMult = data.rMultiple != null ? Number(data.rMultiple) : (data.r_multiple != null ? Number(data.r_multiple) : null);

    state.activeCelebration = {
      step: 1,
      tradeId: data.tradeId || data.trade_id || null,
      eventId: data.eventId || data.event_id || null,
      ticker: String(data.ticker || data.asset || 'ATIVO').toUpperCase().trim(),
      direction: data.direction === 'short' ? 'short' : 'long',
      entryPrice: data.entryPrice != null ? Number(data.entryPrice) : null,
      exitPrice: data.exitPrice != null ? Number(data.exitPrice) : null,
      initialStop: data.initialStop != null ? Number(data.initialStop) : null,
      quantity: data.quantity != null ? Number(data.quantity) : null,
      riskAmount: data.riskAmount != null ? Number(data.riskAmount) : null,
      realizedAmount: realized,
      rMultiple: rMult,
      targetReached: Boolean(data.targetReached ?? (rMult != null && rMult >= 2.0)),
      totalConquestsBefore: stats.totalConquests,
      timestamp: data.timestamp || new Date().toISOString()
    };

    // Predefinições
    state.selectedReward = state.rewards[0] || M.DEFAULT_REWARDS[0];
    state.rewardReason = 'Porque cumpri meu plano e vou aproveitar este momento.';
    state.planAdheredChoice = 'yes';
    state.feelingChoice = 'pride';
    state.activeCategoryFilter = 'todas';

    renderModalContent();

    const overlay = getModalOverlay();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // Dispara confetti se ativado
    setTimeout(() => {
      const canvas = document.getElementById('pcConfettiCanvas');
      if (canvas) startConfetti(canvas);
    }, 100);
  }

  function closeCelebrationModal() {
    stopConfetti();
    const overlay = document.getElementById('pcCelebrationModalOverlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
    document.body.style.overflow = '';
    state.activeCelebration = null;
  }

  function setModalStep(step) {
    if (!state.activeCelebration) return;
    state.activeCelebration.step = step;
    renderModalContent();
    if (step === 1 && state.animationsEnabled) {
      const canvas = document.getElementById('pcConfettiCanvas');
      if (canvas) startConfetti(canvas);
    } else {
      stopConfetti();
    }
  }

  function renderModalContent() {
    const overlay = getModalOverlay();
    const c = state.activeCelebration;
    if (!c) return;

    const step = c.step || 1;
    const isWide = step === 2;

    overlay.innerHTML = `
      <canvas id="pcConfettiCanvas" class="pc-confetti-canvas"></canvas>
      <div class="pc-modal-box ${isWide ? 'wide' : ''}" onclick="event.stopPropagation()">
        <header class="pc-modal-header">
          ${step === 1 ? `
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:18px">🏆</span>
              <span style="font-size:11px;font-weight:800;letter-spacing:0.08em;color:#d4af37;text-transform:uppercase">Profit Celebration</span>
            </div>
          ` : `
            <div class="pc-modal-header-stepper">
              <div class="pc-step-item ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}">
                <div class="pc-step-circle">${step > 1 ? '✓' : '1'}</div>
                <span>Vitória Registrada</span>
              </div>
              <div class="pc-step-line"></div>
              <div class="pc-step-item ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}">
                <div class="pc-step-circle">${step > 2 ? '✓' : '2'}</div>
                <span>Escolher Recompensa</span>
              </div>
              <div class="pc-step-line"></div>
              <div class="pc-step-item ${step === 3 ? 'active' : ''}">
                <div class="pc-step-circle">3</div>
                <span>Finalizar Ritual</span>
              </div>
            </div>
          `}
          <div style="display:flex;align-items:center">
            <button type="button" class="pc-animation-toggle-btn" onclick="window.ProfitCelebration.toggleAnimations()">
              ${state.animationsEnabled ? '✨ Efeitos: Ativados' : '⚡ Efeitos: Desativados'}
            </button>
            <button type="button" class="pc-modal-close-btn" aria-label="Fechar" onclick="window.ProfitCelebration.closeCelebrationModal()">×</button>
          </div>
        </header>

        <div class="pc-modal-body">
          ${step === 1 ? renderModalStep1(c) : (step === 2 ? renderModalStep2(c) : renderModalStep3(c))}
        </div>
      </div>
    `;

    // Atualiza textarea char counter se no step 2
    if (step === 2) {
      const textarea = document.getElementById('pcRewardReasonInput');
      const counter = document.getElementById('pcReasonCharCount');
      if (textarea && counter) {
        textarea.addEventListener('input', () => {
          state.rewardReason = textarea.value;
          counter.textContent = `${textarea.value.length}/200`;
        });
      }
    }
  }

  /* --- ETAPA 1 DO MODAL: CELEBRAÇÃO PRINCIPAL --- */
  function renderModalStep1(c) {
    const formattedAmount = M.formatMoneyBR(c.realizedAmount);
    const formattedR = M.formatMultipleR(c.rMultiple);
    const conquestNumber = c.totalConquestsBefore + 1;

    return `
      <div class="pc-trophy-banner">
        <div class="pc-trophy-glow">
          <svg class="pc-trophy-svg" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
          </svg>
        </div>
        <h2 id="pcCelebrationModalTitle" class="pc-celebration-title">VOCÊ FEZ A SUA PARTE!</h2>
        <p class="pc-celebration-subtitle">Você seguiu seu plano, embolsou seu lucro e não deixou a ganância decidir por você.</p>
      </div>

      <div class="pc-realized-card">
        <small class="pc-realized-eyebrow">LUCRO REALIZADO</small>
        <div class="pc-realized-amount">+ ${esc(formattedAmount)}</div>
        <div class="pc-realized-multiple">(${esc(formattedR)})</div>
        <div class="pc-realized-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${c.targetReached ? 'Alvo atingido' : 'Lucro embolsado'} • Plano respeitado</span>
        </div>
      </div>

      <div class="pc-stats-row">
        <div class="pc-stat-item">
          <div class="pc-stat-icon">🎯</div>
          <div class="pc-stat-val">${esc(formattedR)}</div>
          <div class="pc-stat-lbl">Alvo atingido</div>
        </div>
        <div class="pc-stat-item">
          <div class="pc-stat-icon">🛡️</div>
          <div class="pc-stat-val">100%</div>
          <div class="pc-stat-lbl">Disciplina</div>
        </div>
        <div class="pc-stat-item">
          <div class="pc-stat-icon">📊</div>
          <div class="pc-stat-val">${conquestNumber}</div>
          <div class="pc-stat-lbl">Conquista</div>
        </div>
      </div>

      <div class="pc-quote-banner">
        "Hoje você não precisa ganhar mais. Você já cumpriu sua missão."
      </div>

      <div class="pc-quick-rewards-head">
        <span style="font-size:20px">🎁</span>
        <div>
          <h4>Como você quer comemorar esta conquista?</h4>
          <p>Escolha uma recompensa para marcar este momento.</p>
        </div>
      </div>

      <div class="pc-quick-pills-row" style="margin-bottom:24px">
        ${state.rewards.slice(0, 5).map((r) => {
          const isSelected = state.selectedReward && state.selectedReward.id === r.id;
          return `
            <button type="button" class="pc-quick-pill ${isSelected ? 'selected' : ''}" onclick="window.ProfitCelebration.selectQuickReward('${esc(r.id)}')">
              <span>${esc(r.icon)}</span>
              <span>${esc(r.title)}</span>
            </button>
          `;
        }).join('')}
        <button type="button" class="pc-quick-pill" onclick="window.ProfitCelebration.goToStep2Custom()">
          <span>➕</span>
          <span>Minha recompensa</span>
        </button>
      </div>

      <button type="button" class="pc-cta-btn-primary" onclick="window.ProfitCelebration.setModalStep(2)">
        <span>Registrar minha conquista</span>
        <span>→</span>
      </button>
    `;
  }

  /* --- ETAPA 2 DO MODAL: ESCOLHA DA RECOMPENSA (3 COLUNAS) --- */
  function renderModalStep2(c) {
    const formattedAmount = M.formatMoneyBR(c.realizedAmount);
    const formattedR = M.formatMultipleR(c.rMultiple);
    const formattedEntry = c.entryPrice ? M.formatMoneyBR(c.entryPrice) : '—';
    const formattedExit = c.exitPrice ? M.formatMoneyBR(c.exitPrice) : '—';
    const formattedRisk = c.riskAmount ? M.formatMoneyBR(c.riskAmount) : '—';

    const filteredRewards = state.activeCategoryFilter === 'todas'
      ? state.rewards
      : state.rewards.filter(r => r.category === state.activeCategoryFilter);

    const sel = state.selectedReward || state.rewards[0] || M.DEFAULT_REWARDS[0];

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <small style="font-size:11px;font-weight:800;color:#d4af37;letter-spacing:0.06em;text-transform:uppercase">PROFIT CELEBRATION</small>
          <h2 style="font-size:22px;font-weight:900;margin:2px 0 0;color:#ffffff">Qual é a sua recompensa?</h2>
          <p style="font-size:12px;color:#94a3b8;margin:2px 0 0">Escolha como você vai comemorar esta conquista. Você merece!</p>
        </div>
      </div>

      <div class="pc-step2-layout">
        <!-- Coluna Esquerda: Recap do Trade -->
        <div class="pc-trade-recap-panel">
          <div>
            <div class="pc-recap-header">
              <span class="pc-recap-ticker">${esc(c.ticker)}</span>
              <span class="${c.direction === 'short' ? 'pc-recap-badge-short' : 'pc-recap-badge-long'}">${c.direction === 'short' ? 'SHORT' : 'LONG'}</span>
            </div>
            <div class="pc-recap-date">${M.formatDateBR(c.timestamp)}</div>

            <div class="pc-recap-profit-box">
              <small>LUCRO REALIZADO</small>
              <div class="val">+ ${esc(formattedAmount)}</div>
              <div style="font-size:12px;color:#a7f3d0;font-weight:700;margin-top:2px">(${esc(formattedR)})</div>
            </div>

            <div class="pc-recap-rows">
              <div class="pc-recap-row">
                <span>Entrada</span>
                <strong>${esc(formattedEntry)}</strong>
              </div>
              <div class="pc-recap-row">
                <span>Saída</span>
                <strong>${esc(formattedExit)}</strong>
              </div>
              <div class="pc-recap-row">
                <span>Risco (R)</span>
                <strong>${esc(formattedRisk)}</strong>
              </div>
              <div class="pc-recap-row">
                <span>Múltiplo</span>
                <strong style="color:#34d399">${esc(formattedR)}</strong>
              </div>
            </div>

            <div class="pc-stats-row" style="margin-bottom:12px">
              <div class="pc-stat-item">
                <div class="pc-stat-icon">🎯</div>
                <div class="pc-stat-val" style="font-size:13px">${esc(formattedR)}</div>
                <div class="pc-stat-lbl">Alvo</div>
              </div>
              <div class="pc-stat-item">
                <div class="pc-stat-icon">🛡️</div>
                <div class="pc-stat-val" style="font-size:13px">100%</div>
                <div class="pc-stat-lbl">Plano</div>
              </div>
              <div class="pc-stat-item">
                <div class="pc-stat-icon">📊</div>
                <div class="pc-stat-val" style="font-size:13px">1</div>
                <div class="pc-stat-lbl">Conquista</div>
              </div>
            </div>
          </div>

          <div class="pc-recap-quote">
            "Disciplina hoje constrói liberdade amanhã."
          </div>
        </div>

        <!-- Coluna Central: Categorias e Grid de Recompensas -->
        <div class="pc-rewards-center-panel">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <h4 style="font-size:14px;font-weight:800;color:#f8fafc;margin:0">Recompensas sugeridas</h4>
          </div>

          <div class="pc-categories-pills-bar">
            ${M.REWARD_CATEGORIES.map((cat) => `
              <button type="button" class="pc-cat-pill ${state.activeCategoryFilter === cat.id ? 'active' : ''}" onclick="window.ProfitCelebration.setCategoryFilter('${esc(cat.id)}')">
                ${esc(cat.label)}
              </button>
            `).join('')}
          </div>

          <div class="pc-rewards-grid">
            ${filteredRewards.map((r) => {
              const isSelected = sel && sel.id === r.id;
              return `
                <div class="pc-reward-card ${isSelected ? 'selected' : ''}" onclick="window.ProfitCelebration.selectRewardCard('${esc(r.id)}')">
                  <div class="pc-reward-card-visual">
                    <span>${esc(r.icon)}</span>
                  </div>
                  <div class="pc-reward-card-title">${esc(r.title)}</div>
                  <div class="pc-reward-card-desc">${esc(r.description)}</div>
                </div>
              `;
            }).join('')}

            <div class="pc-reward-card pc-reward-card-custom-add" onclick="window.ProfitCelebration.openCustomRewardModal()">
              <div style="font-size:28px;margin-bottom:4px;color:#d4af37">⊕</div>
              <div class="pc-reward-card-title" style="color:#d4af37">Minha recompensa</div>
              <div class="pc-reward-card-desc">Crie sua própria recompensa personalizada.</div>
            </div>
          </div>
        </div>

        <!-- Coluna Direita: Detalhe e Justificativa da Recompensa -->
        <div class="pc-selected-reward-panel">
          <div class="pc-selected-visual">
            <span>${esc(sel.icon || '🎁')}</span>
          </div>
          <div class="pc-selected-title">${esc(sel.title)}</div>
          <div class="pc-selected-desc">${esc(sel.description)}</div>
          <span class="pc-selected-category-badge">Categoria: ${esc(sel.category || 'Geral')}</span>

          <label for="pcRewardReasonInput" class="pc-reason-label">
            <span>Por que escolhi esta recompensa?</span>
            <span id="pcReasonCharCount" style="color:#94a3b8;font-weight:400">${state.rewardReason.length}/200</span>
          </label>
          <textarea id="pcRewardReasonInput" class="pc-reason-textarea" maxlength="200" placeholder="Ex: Cumpri o plano de trading e vou desfrutar com a mente tranquila...">${esc(state.rewardReason)}</textarea>
        </div>
      </div>

      <div class="pc-step-footer">
        <button type="button" class="pc-cta-btn-secondary" onclick="window.ProfitCelebration.setModalStep(1)">
          ← Voltar
        </button>
        <button type="button" class="pc-cta-btn-primary" style="width:auto;min-width:200px" onclick="window.ProfitCelebration.setModalStep(3)">
          <span>Continuar</span>
          <span>→</span>
        </button>
      </div>
    `;
  }

  /* --- ETAPA 3 DO MODAL: RITUAL DE VITÓRIA (AVALIAÇÃO DE DISCIPLINA) --- */
  function renderModalStep3(c) {
    const sel = state.selectedReward || state.rewards[0] || M.DEFAULT_REWARDS[0];
    const isGreedUrge = state.feelingChoice === 'greed_urge';

    return `
      <div style="text-align:center;margin-bottom:20px">
        <small style="font-size:11px;font-weight:800;color:#d4af37;letter-spacing:0.06em;text-transform:uppercase">PROFIT CELEBRATION · ETAPA FINAL</small>
        <h2 style="font-size:24px;font-weight:900;margin:4px 0 0;color:#ffffff">Conclusão do Ritual de Vitória</h2>
        <p style="font-size:13px;color:#94a3b8;margin:4px 0 0">Reflita sobre sua disciplina para consolidar o hábito correto.</p>
      </div>

      <div class="pc-ritual-questions-grid">
        <!-- Pergunta 1: Plano -->
        <div class="pc-question-box">
          <div class="pc-question-title">
            <span>🎯</span>
            <span>Você cumpriu 100% o seu plano?</span>
          </div>
          <div class="pc-options-group">
            ${M.PLAN_ADHERENCE_OPTIONS.map((opt) => {
              const isSelected = state.planAdheredChoice === opt.id;
              return `
                <div class="pc-option-btn ${isSelected ? `selected ${opt.badgeClass}` : ''}" onclick="window.ProfitCelebration.setPlanAdherenceChoice('${opt.id}')">
                  <div class="pc-option-btn-title">
                    <span>${isSelected ? '●' : '○'}</span>
                    <span>${esc(opt.label)}</span>
                  </div>
                  <div class="pc-option-btn-desc">${esc(opt.desc)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Pergunta 2: Sentimento -->
        <div class="pc-question-box">
          <div class="pc-question-title">
            <span>🧠</span>
            <span>Como você está se sentindo agora?</span>
          </div>
          <div class="pc-options-group">
            ${M.FEELING_OPTIONS.map((opt) => {
              const isSelected = state.feelingChoice === opt.id;
              return `
                <div class="pc-option-btn ${isSelected ? (opt.id === 'greed_urge' ? 'selected warn' : 'selected') : ''}" onclick="window.ProfitCelebration.setFeelingChoice('${opt.id}')">
                  <div class="pc-option-btn-title">
                    <span>${opt.icon}</span>
                    <span>${esc(opt.label)}</span>
                  </div>
                  <div class="pc-option-btn-desc">${esc(opt.hint)}</div>
                </div>
              `;
            }).join('')}
          </div>

          ${isGreedUrge ? `
            <div class="pc-greed-alert">
              <span style="font-size:18px">⚠️</span>
              <div>
                <strong>Atenção ao Overtrading e à Ganância:</strong>
                <div>Você já cumpriu seu objetivo nesta operação. Tentar buscar mais no mesmo dia geralmente devolve o lucro ao mercado. Feche a plataforma e comemore.</div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Resumo do Compromisso -->
      <div style="background:rgba(212,175,55,0.08);border:1px solid rgba(212,175,55,0.3);border-radius:14px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:32px">${esc(sel.icon || '🎁')}</div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#d4af37;text-transform:uppercase">Recompensa Selecionada</div>
            <div style="font-size:15px;font-weight:800;color:#ffffff">${esc(sel.title)}</div>
          </div>
        </div>
        <div style="font-size:12px;font-style:italic;color:#fef08a;max-width:280px;text-align:right">
          "Hoje você não precisa ganhar mais. Você já cumpriu sua missão."
        </div>
      </div>

      <div class="pc-step-footer">
        <button type="button" class="pc-cta-btn-secondary" onclick="window.ProfitCelebration.setModalStep(2)">
          ← Voltar
        </button>
        <button type="button" class="pc-cta-btn-primary" style="width:auto;min-width:260px" id="pcBtnSubmitConquest" onclick="window.ProfitCelebration.submitConquest()">
          <span>Concluir Ritual e Salvar Conquista</span>
          <span>🏆</span>
        </button>
      </div>
    `;
  }

  /* --- MÉTODOS DE CONTROLE DO MODAL --- */
  function selectQuickReward(rewardId) {
    const found = state.rewards.find(r => r.id === rewardId);
    if (found) {
      state.selectedReward = found;
      setModalStep(2);
    }
  }

  function goToStep2Custom() {
    setModalStep(2);
    openCustomRewardModal();
  }

  function setCategoryFilter(catId) {
    state.activeCategoryFilter = catId;
    renderModalContent();
  }

  function selectRewardCard(rewardId) {
    const found = state.rewards.find(r => r.id === rewardId);
    if (found) {
      state.selectedReward = found;
      renderModalContent();
    }
  }

  function setPlanAdherenceChoice(choice) {
    state.planAdheredChoice = choice;
    renderModalContent();
  }

  function setFeelingChoice(choice) {
    state.feelingChoice = choice;
    renderModalContent();
  }

  /* --- SALVAR CONQUISTA --- */
  async function submitConquest() {
    const btn = document.getElementById('pcBtnSubmitConquest');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Salvando conquista...';
    }

    const c = state.activeCelebration;
    const sel = state.selectedReward || state.rewards[0] || M.DEFAULT_REWARDS[0];

    const payload = {
      tradeId: c?.tradeId || null,
      eventId: c?.eventId || null,
      ticker: c?.ticker || 'ATIVO',
      direction: c?.direction || 'long',
      realizedAmount: c?.realizedAmount || 0,
      rMultiple: c?.rMultiple != null ? c.rMultiple : null,
      targetReached: Boolean(c?.targetReached),
      planAdhered: state.planAdheredChoice,
      feeling: state.feelingChoice,
      rewardId: sel.id,
      rewardTitle: sel.title,
      rewardCategory: sel.category,
      rewardIcon: sel.icon,
      rewardReason: (state.rewardReason || '').trim(),
      entryPrice: c?.entryPrice,
      exitPrice: c?.exitPrice,
      initialStop: c?.initialStop,
      riskAmount: c?.riskAmount,
      conquestDate: new Date().toISOString().slice(0, 10)
    };

    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        const res = await root.healthyTrendApi.request('/api/profit-celebration/conquests', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res && res.conquest) {
          // Atualiza lista local prevenindo duplicação
          const existingIdx = state.conquests.findIndex(item => item.id === res.conquest.id);
          if (existingIdx >= 0) {
            state.conquests[existingIdx] = res.conquest;
          } else {
            state.conquests.unshift(res.conquest);
          }
        }
      } else {
        // Fallback local
        const localConquest = {
          id: 'local-' + Date.now(),
          ...payload,
          rewardStatus: 'pending',
          createdAt: new Date().toISOString()
        };
        state.conquests.unshift(localConquest);
      }

      state.stats = M.calculateConquestsStats(state.conquests);
      saveLocalCache();

      closeCelebrationModal();

      if (typeof root.showToast === 'function') {
        root.showToast('🏆 Conquista registrada com sucesso! Parabéns pela disciplina.');
      }

      // Eventos para outros componentes atualizarem
      window.dispatchEvent(new CustomEvent('healthyTrend:conquestCreated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));

      // Se a página de conquistas estiver aberta, atualiza a view
      if (document.getElementById('conquestsRoot')?.offsetParent !== null) {
        renderPage();
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Concluir Ritual e Salvar Conquista 🏆';
      }
      if (typeof root.showToast === 'function') {
        root.showToast(err.message || 'Erro ao registrar conquista.');
      }
    }
  }

  /* ==========================================================================
     AÇÃO "EMBOLSAR LUCRO" NA TELA DE DETALHE DO TRADE
     ========================================================================== */

  function openPocketProfitDialog(positionId) {
    const pos = (root.operationalState?.positions || []).find(p => String(p.id) === String(positionId));
    if (!pos) {
      if (typeof root.showToast === 'function') root.showToast('Operação não encontrada.');
      return;
    }

    const metrics = typeof root.operationMetrics === 'function' ? root.operationMetrics(pos) : { remaining: pos.initialQty || 100, open: 0, realized: 0 };
    const remainingQty = metrics.remaining || pos.initialQty || 100;
    const currentPrice = pos.currentPrice || pos.entry || 10;
    const entryPrice = pos.entry || 10;
    const initialStop = pos.initialStop || pos.currentStop || (pos.direction === 'short' ? entryPrice * 1.02 : entryPrice * 0.98);
    const unitRisk = Math.abs(entryPrice - initialStop);

    // Remove modal anterior se houver
    const old = document.getElementById('pcPocketConfirmModalOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pcPocketConfirmModalOverlay';
    overlay.className = 'pc-modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="pc-modal-box pc-pocket-confirm-modal" onclick="event.stopPropagation()">
        <header class="pc-modal-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">💰</span>
            <h3 style="margin:0;font-size:16px;font-weight:800;color:#ffffff">Embolsar Lucro · ${esc(pos.asset)}</h3>
          </div>
          <button type="button" class="pc-modal-close-btn" onclick="document.getElementById('pcPocketConfirmModalOverlay').remove()">×</button>
        </header>

        <div class="pc-modal-body" style="padding:10px 24px 20px">
          <p style="font-size:12px;color:#94a3b8;margin:0 0 16px;line-height:1.5">
            Ao embolsar o lucro, você encerra a posição total ou parcialmente, realiza o ganho financeiro e inicia o Ritual de Vitória.
          </p>

          <div class="pc-pocket-confirm-box">
            <div class="pc-pocket-field-row">
              <label>Tipo de saída</label>
              <select id="pcPocketExitType" style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px 12px;color:#ffffff;font-size:13px;font-weight:700">
                <option value="close">Encerramento Total (100% da posição)</option>
                <option value="peeloff">Saída Parcial (Peel-off)</option>
              </select>
            </div>

            <div class="pc-pocket-field-row" id="pcPocketQtyContainer" style="display:none">
              <label>Quantidade a embolsar</label>
              <input type="number" id="pcPocketQty" value="${remainingQty}" max="${remainingQty}" min="1" step="10" />
            </div>

            <div class="pc-pocket-field-row">
              <label>Preço de execução da saída (R$)</label>
              <input type="number" id="pcPocketPrice" value="${currentPrice}" step="0.01" />
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px">
              <span style="color:#94a3b8">Quantidade restante</span>
              <strong style="color:#f8fafc">${esc(remainingQty)} un.</strong>
            </div>
          </div>

          <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:16px">
            <button type="button" class="pc-cta-btn-secondary" onclick="document.getElementById('pcPocketConfirmModalOverlay').remove()">
              Cancelar
            </button>
            <button type="button" class="pc-cta-btn-primary" style="width:auto" id="pcBtnConfirmPocketProfit" onclick="window.ProfitCelebration.executePocketProfit('${esc(pos.id)}')">
              <span>Confirmar e Embolsar</span>
              <span>💰</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const typeSelect = document.getElementById('pcPocketExitType');
    const qtyContainer = document.getElementById('pcPocketQtyContainer');
    if (typeSelect && qtyContainer) {
      typeSelect.addEventListener('change', () => {
        qtyContainer.style.display = typeSelect.value === 'peeloff' ? 'flex' : 'none';
      });
    }
  }

  async function executePocketProfit(positionId) {
    const btn = document.getElementById('pcBtnConfirmPocketProfit');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Processando...';
    }

    const typeSelect = document.getElementById('pcPocketExitType');
    const type = typeSelect?.value || 'close';
    const priceInput = document.getElementById('pcPocketPrice');
    const exitPrice = Number(priceInput?.value || 0);
    const qtyInput = document.getElementById('pcPocketQty');
    const exitQty = type === 'peeloff' ? Number(qtyInput?.value || 1) : null;

    const overlay = document.getElementById('pcPocketConfirmModalOverlay');

    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        const res = await root.healthyTrendApi.request(`/api/trades/${encodeURIComponent(positionId)}/pocket-profit`, {
          method: 'POST',
          body: JSON.stringify({
            type,
            price: exitPrice,
            qty: exitQty
          })
        });

        if (overlay) overlay.remove();

        if (typeof root.syncOperationalFromDatabase === 'function') {
          await root.syncOperationalFromDatabase();
        }

        if (res && res.celebrationData) {
          openCelebrationModal(res.celebrationData);
        }
      } else {
        // Fallback local para paper trading / offline
        const pos = (root.operationalState?.positions || []).find(p => String(p.id) === String(positionId));
        if (!pos) throw new Error('Posição não encontrada.');

        const metrics = typeof root.operationMetrics === 'function' ? root.operationMetrics(pos) : { remaining: pos.initialQty || 100 };
        const qty = type === 'peeloff' ? (exitQty || Math.floor(metrics.remaining / 2)) : metrics.remaining;
        const entryPrice = pos.entry || exitPrice;
        const realizedAmount = M.round2((exitPrice - entryPrice) * qty);
        const unitRisk = Math.abs(entryPrice - (pos.initialStop || pos.currentStop || entryPrice * 0.98));
        const rMultiple = unitRisk > 0 ? M.round2((exitPrice - entryPrice) / unitRisk) : 2.0;

        // Registra evento no operationalState local
        if (typeof root.showOperationForm === 'function') {
          // Utiliza fluxo nativo se disponível
          pos.events.push({
            type: type === 'close' ? 'close' : 'peeloff',
            at: new Date().toISOString(),
            price: exitPrice,
            qty,
            note: 'Embolsar lucro'
          });
          if (typeof root.saveOperationalState === 'function') root.saveOperationalState();
          if (typeof root.renderOperationalApp === 'function') root.renderOperationalApp();
        }

        if (overlay) overlay.remove();

        openCelebrationModal({
          tradeId: pos.id,
          eventId: 'evt-' + Date.now(),
          ticker: pos.asset,
          direction: pos.direction,
          entryPrice,
          exitPrice,
          initialStop: pos.initialStop || pos.currentStop,
          quantity: qty,
          riskAmount: M.round2(unitRisk * qty),
          realizedAmount,
          rMultiple,
          targetReached: rMultiple >= 2.0
        });
      }
    } catch (err) {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Confirmar e Embolsar 💰';
      }
      if (typeof root.showToast === 'function') {
        root.showToast(err.message || 'Erro ao embolsar lucro.');
      }
    }
  }

  /* ==========================================================================
     PAINEL "MINHAS CONQUISTAS" (PÁGINA PRINCIPAL)
     ========================================================================== */

  function renderPage(containerOrId) {
    const container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : (containerOrId || document.getElementById('conquestsRoot'));

    if (!container) return;

    // Se estiver vazio e autenticado, busca os dados
    if (state.conquests.length === 0 && root.healthyTrendApi?.isAuthenticated()) {
      fetchAllData().then(() => renderPage(container));
    }

    const stats = state.stats || M.calculateConquestsStats(state.conquests);
    const milestones = stats.milestones;
    const special = state.specialReward || { targetConquests: 20, title: 'Fim de semana especial', description: '' };

    // Progresso para a recompensa especial
    const specialTarget = special.targetConquests || 20;
    const specialProgressPct = Math.min(100, Math.round((stats.totalPlansComplied / specialTarget) * 100));

    container.innerHTML = `
      <!-- Breadcrumb & Top Bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#94a3b8">
          <span>Treinamento do Trader</span>
          <span>&gt;</span>
          <strong style="color:#f8fafc">Minhas Conquistas</strong>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <select id="pcYearFilterSelect" style="background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:6px 12px;color:#f8fafc;font-size:12px;font-weight:700" onchange="window.ProfitCelebration.changeFilterYear(this.value)">
            <option value="2026" ${state.filterYear === 2026 ? 'selected' : ''}>📅 2026</option>
            <option value="2025" ${state.filterYear === 2025 ? 'selected' : ''}>📅 2025</option>
            <option value="all">📅 Todos os anos</option>
          </select>
        </div>
      </div>

      <!-- Header Banner Hero -->
      <section class="pc-page-header">
        <div class="pc-page-header-left">
          <svg class="pc-page-trophy-icon" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
          </svg>
          <div class="pc-page-header-title-box">
            <h1>Minhas Conquistas</h1>
            <h2>Embolsei. Cumpri. Comemorei.</h2>
            <p>Realizar o lucro também é uma vitória. E toda vitória merece ser reconhecida.</p>
          </div>
        </div>

        <div class="pc-page-header-right">
          <div class="pc-header-quote-card">
            "Mesmo processo, mais conquistas, mais liberdade."
          </div>
        </div>
      </section>

      <!-- 5 KPIs Row -->
      <section class="pc-kpis-grid">
        <!-- KPI 1: Planos cumpridos -->
        <div class="pc-kpi-card">
          <div class="pc-kpi-card-head">
            <span class="pc-kpi-card-icon">📊</span>
          </div>
          <div>
            <div class="pc-kpi-card-val green">${esc(stats.totalPlansComplied)}</div>
            <div class="pc-kpi-card-lbl">Planos cumpridos</div>
          </div>
          <div class="pc-kpi-card-sub">
            <span>+${esc(stats.plansCompliedThisMonth)} este mês</span>
          </div>
        </div>

        <!-- KPI 2: Lucro realizado -->
        <div class="pc-kpi-card">
          <div class="pc-kpi-card-head">
            <span class="pc-kpi-card-icon">🪙</span>
          </div>
          <div>
            <div class="pc-kpi-card-val">${esc(stats.totalRealizedProfitFormatted)}</div>
            <div class="pc-kpi-card-lbl">Lucro realizado</div>
          </div>
          <div class="pc-kpi-card-sub ${stats.profitGrowthPct >= 0 ? '' : 'neutral'}">
            <span>${stats.profitGrowthPct >= 0 ? '+' : ''}${esc(stats.profitGrowthPct)}% vs mês anterior</span>
          </div>
        </div>

        <!-- KPI 3: Sequência de disciplina -->
        <div class="pc-kpi-card">
          <div class="pc-kpi-card-head">
            <span class="pc-kpi-card-icon">🔥</span>
          </div>
          <div>
            <div class="pc-kpi-card-val gold">${esc(stats.currentStreakDays)} dias</div>
            <div class="pc-kpi-card-lbl">Sequência de disciplina</div>
          </div>
          <div class="pc-kpi-card-sub">
            <span>Recorde: ${esc(stats.recordStreakDays)} dias</span>
          </div>
        </div>

        <!-- KPI 4: Média de R -->
        <div class="pc-kpi-card">
          <div class="pc-kpi-card-head">
            <span class="pc-kpi-card-icon">🎯</span>
          </div>
          <div>
            <div class="pc-kpi-card-val green">${esc(stats.avgRFormatted)}</div>
            <div class="pc-kpi-card-lbl">Média de R por conquista</div>
          </div>
          <div class="pc-kpi-card-sub">
            <span>${stats.avgR >= 1.5 ? 'Dentro do esperado' : 'Em desenvolvimento'}</span>
          </div>
        </div>

        <!-- KPI 5: Próximo marco -->
        <div class="pc-kpi-card">
          <div class="pc-kpi-card-head">
            <span class="pc-kpi-card-icon">🏅</span>
          </div>
          <div>
            <div class="pc-kpi-card-val gold">${esc(milestones.summaryText)}</div>
            <div class="pc-kpi-card-lbl">Próximo marco</div>
          </div>
          <div style="margin-top:4px">
            <div class="pc-special-reward-progress-bar">
              <div class="pc-special-reward-progress-fill" style="width:${milestones.progressPct}%"></div>
            </div>
            <div class="pc-kpi-card-sub neutral" style="margin-top:2px">
              <span>${esc(milestones.remainingText)}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Dashboard Row 1: Gráfico de Evolução + Marcos e Recompensa Especial -->
      <div class="pc-dashboard-row">
        <!-- Card Gráfico Evolução -->
        <div class="pc-card-box">
          <div class="pc-card-head">
            <h3>Evolução das Conquistas</h3>
            <div class="pc-chart-legend">
              <div class="pc-legend-item">
                <div class="pc-legend-bar-sample"></div>
                <span>Lucro realizado (R$)</span>
              </div>
              <div class="pc-legend-item">
                <div class="pc-legend-line-sample"></div>
                <span>Conquistas</span>
              </div>
            </div>
          </div>

          <div class="pc-svg-chart-container">
            ${renderEvolutionChart(stats.monthlyEvolution)}
          </div>
        </div>

        <!-- Card Marcos de Disciplina + Próxima Recompensa Especial -->
        <div class="pc-card-box">
          <div class="pc-card-head">
            <h3>Marcos de Disciplina</h3>
            <button type="button" class="pc-special-reward-edit-btn" onclick="window.ProfitCelebration.openAllMilestonesModal()">Ver todos</button>
          </div>

          <!-- Stepper de Marcos (1, 5, 10, 20, 50, 100) -->
          <div class="pc-milestones-stepper">
            ${milestones.milestones.map((m) => {
              const isComp = m.isReached;
              const isCurr = m.isCurrent;
              return `
                <div class="pc-milestone-node ${isComp ? 'completed' : (isCurr ? 'current' : '')}" title="${esc(m.description)}">
                  <div class="pc-milestone-circle">
                    ${isComp ? '✓' : (isCurr ? m.target : '🔒')}
                  </div>
                  <div class="pc-milestone-lbl">${esc(m.title)}</div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Card Próxima Recompensa Especial -->
          <div style="margin-top:auto">
            <div style="font-size:12px;font-weight:800;color:#f8fafc;margin-bottom:8px">Minha próxima recompensa especial</div>
            <div class="pc-special-reward-card">
              <div class="pc-special-reward-img">
                <span>🏖️</span>
              </div>
              <div class="pc-special-reward-info">
                <div class="pc-special-reward-title">${esc(special.title)}</div>
                <div class="pc-special-reward-desc">${esc(special.description || `Quando eu completar ${specialTarget} conquistas, vou me presentear.`)}</div>
                <div class="pc-special-reward-progress-bar">
                  <div class="pc-special-reward-progress-fill" style="width:${specialProgressPct}%"></div>
                </div>
                <div class="pc-special-reward-meta">
                  <span>${stats.totalPlansComplied}/${specialTarget}</span>
                  <button type="button" class="pc-special-reward-edit-btn" onclick="window.ProfitCelebration.openSpecialRewardEditModal()">Editar recompensa</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dashboard Row 2: Tabela de Conquistas + Recompensas Mais Escolhidas -->
      <div class="pc-dashboard-row">
        <!-- Tabela Últimas Conquistas -->
        <div class="pc-card-box">
          <div class="pc-card-head">
            <h3>Últimas Conquistas</h3>
            ${state.conquests.length > 5 ? `<button type="button" class="pc-special-reward-edit-btn" onclick="window.ProfitCelebration.openAllConquestsModal()">Ver todas (${state.conquests.length})</button>` : ''}
          </div>

          ${state.conquests.length === 0 ? `
            <div style="text-align:center;padding:40px 20px;color:#94a3b8">
              <div style="font-size:40px;margin-bottom:12px">🏆</div>
              <h4 style="font-size:15px;color:#ffffff;margin:0 0 6px">Nenhuma conquista registrada ainda</h4>
              <p style="font-size:12px;margin:0 0 16px;max-width:360px;margin-inline:auto">
                Quando você realizar um lucro conforme seu plano, clique em <strong>"Embolsar Lucro"</strong> na tela da operação para iniciar seu Ritual de Vitória.
              </p>
            </div>
          ` : `
            <div style="overflow-x:auto">
              <table class="pc-conquests-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Ativo</th>
                    <th>Resultado</th>
                    <th>R múltiplo</th>
                    <th>Plano cumprido</th>
                    <th>Recompensa</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.conquests.slice(0, 7).map((c) => {
                    const isCompleted = c.rewardStatus === 'completed';
                    const adheredLabel = c.planAdhered === 'yes' ? '✓ Sim' : (c.planAdhered === 'partial' ? '⚠ Parcial' : '✕ Não');
                    const adheredColor = c.planAdhered === 'yes' ? '#34d399' : (c.planAdhered === 'partial' ? '#fbbf24' : '#f87171');
                    return `
                      <tr style="cursor:pointer" onclick="window.ProfitCelebration.openConquestDetailModal('${esc(c.id)}')">
                        <td>${esc(M.formatDateBR(c.conquestDate))}</td>
                        <td><strong style="color:#ffffff">${esc(c.ticker)}</strong></td>
                        <td style="color:#34d399;font-weight:700">+ ${esc(M.formatMoneyBR(c.realizedAmount))}</td>
                        <td style="color:#34d399;font-weight:700">${esc(M.formatMultipleR(c.rMultiple))}</td>
                        <td style="color:${adheredColor};font-weight:700">${esc(adheredLabel)}</td>
                        <td>
                          <div style="display:flex;align-items:center;gap:8px">
                            <span>${esc(c.rewardIcon || '🎁')}</span>
                            <span>${esc(c.rewardTitle || 'Recompensa pessoal')}</span>
                          </div>
                        </td>
                        <td onclick="event.stopPropagation()">
                          <button type="button" class="pc-status-pill-toggle ${isCompleted ? 'completed' : ''}" onclick="window.ProfitCelebration.toggleRewardStatus('${esc(c.id)}')">
                            <span>${isCompleted ? 'Realizada' : 'Pendente'}</span>
                            <span>›</span>
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Coluna Direita: Ranking de Recompensas & Catálogo -->
        <div style="display:flex;flex-direction:column;gap:20px">
          <!-- Recompensas Mais Escolhidas -->
          <div class="pc-card-box">
            <div class="pc-card-head">
              <h3>Recompensas mais escolhidas</h3>
            </div>

            <div class="pc-top-rewards-list">
              ${stats.topRewards.length === 0 ? `
                <div style="font-size:12px;color:#94a3b8;text-align:center;padding:20px 0">
                  Nenhuma recompensa registrada ainda.
                </div>
              ` : stats.topRewards.map((item) => {
                const maxCount = stats.topRewards[0].count || 1;
                const fillPct = Math.round((item.count / maxCount) * 100);
                return `
                  <div class="pc-top-reward-item">
                    <div class="pc-top-reward-info">
                      <div style="display:flex;align-items:center;gap:8px">
                        <span>${esc(item.icon)}</span>
                        <span>${esc(item.title)}</span>
                      </div>
                      <strong style="color:#d4af37">${item.count}</strong>
                    </div>
                    <div class="pc-top-reward-bar-track">
                      <div class="pc-top-reward-bar-fill" style="width:${fillPct}%"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Meu Catálogo de Recompensas -->
          <div class="pc-card-box">
            <div class="pc-card-head">
              <h3>Meu catálogo de recompensas</h3>
            </div>

            <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:12px;margin-bottom:16px">
              ${state.rewards.slice(0, 4).map((r) => `
                <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:10px;min-width:110px;text-align:center">
                  <div style="font-size:26px;margin-bottom:4px">${esc(r.icon)}</div>
                  <div style="font-size:11px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.title)}</div>
                </div>
              `).join('')}
            </div>

            <button type="button" class="pc-cta-btn-primary" style="width:100%;font-size:13px;padding:12px" onclick="window.ProfitCelebration.openRewardsManagerModal()">
              <span>+ Gerenciar recompensas</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* --- RENDERIZADOR DO GRÁFICO SVG RESPONSIVO (DUAL AXIS) --- */
  function renderEvolutionChart(monthlyData = []) {
    if (!Array.isArray(monthlyData) || monthlyData.length === 0) {
      return `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:12px">
          Sem dados históricos suficientes para o período.
        </div>
      `;
    }

    const maxProfit = Math.max(1000, ...monthlyData.map(d => d.profit));
    const maxCount = Math.max(5, ...monthlyData.map(d => d.conquestsCount));

    // Dimensões do viewBox do SVG
    const width = 640;
    const height = 220;
    const padding = { top: 20, right: 40, bottom: 30, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const n = monthlyData.length;
    const barWidth = Math.max(12, Math.floor(chartW / (n * 2.2)));

    // Pontos para a linha de contagem
    const linePoints = [];

    const barsMarkup = monthlyData.map((d, i) => {
      const xCenter = padding.left + (i + 0.5) * (chartW / n);
      const barH = maxProfit > 0 ? (d.profit / maxProfit) * chartH : 0;
      const barY = padding.top + (chartH - barH);
      const barX = xCenter - (barWidth / 2);

      const countY = padding.top + (chartH - ((d.conquestsCount / maxCount) * chartH));
      linePoints.push({ x: xCenter, y: countY, count: d.conquestsCount, profit: d.profit, label: d.label });

      return `
        <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="3" fill="#10b981" opacity="0.85">
          <title>${esc(d.label)}: ${M.formatMoneyBR(d.profit)} (${d.conquestsCount} conquistas)</title>
        </rect>
        <text x="${xCenter}" y="${height - 8}" text-anchor="middle" fill="#94a3b8" font-size="11" font-weight="600">${esc(d.label)}</text>
      `;
    }).join('');

    const linePathD = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const dotsMarkup = linePoints.map(p => `
      <circle cx="${p.x}" cy="${p.y}" r="4" fill="#d4af37" stroke="#041610" stroke-width="2">
        <title>${p.count} conquista(s)</title>
      </circle>
    `).join('');

    // Eixos Y
    const yAxisLabels = [
      { y: padding.top, leftVal: M.formatMoneyBR(maxProfit), rightVal: maxCount },
      { y: padding.top + chartH / 2, leftVal: M.formatMoneyBR(maxProfit / 2), rightVal: Math.round(maxCount / 2) },
      { y: padding.top + chartH, leftVal: 'R$ 0', rightVal: '0' }
    ];

    const yAxisMarkup = yAxisLabels.map(l => `
      <line x1="${padding.left}" y1="${l.y}" x2="${width - padding.right}" y2="${l.y}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
      <text x="${padding.left - 8}" y="${l.y + 4}" text-anchor="end" fill="#64748b" font-size="10">${esc(l.leftVal)}</text>
      <text x="${width - padding.right + 8}" y="${l.y + 4}" text-anchor="start" fill="#d4af37" font-size="10">${l.rightVal}</text>
    `).join('');

    return `
      <svg class="pc-svg-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        ${yAxisMarkup}
        ${barsMarkup}
        <path d="${linePathD}" fill="none" stroke="#d4af37" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        ${dotsMarkup}
      </svg>
    `;
  }

  /* ==========================================================================
     GERENCIADOR DE RECOMPENSAS (MODAL DE ADMINISTRAÇÃO)
     ========================================================================== */

  function openRewardsManagerModal() {
    const old = document.getElementById('pcRewardsManagerOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pcRewardsManagerOverlay';
    overlay.className = 'pc-modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="pc-modal-box wide" onclick="event.stopPropagation()">
        <header class="pc-modal-header">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">🎁</span>
            <h3 style="margin:0;font-size:18px;font-weight:900;color:#ffffff">Gerenciar Catálogo de Recompensas</h3>
          </div>
          <button type="button" class="pc-modal-close-btn" onclick="document.getElementById('pcRewardsManagerOverlay').remove()">×</button>
        </header>

        <div class="pc-modal-body">
          <div style="display:grid;grid-template-columns:1fr 340px;gap:24px">
            <!-- Lista de Recompensas Atuais -->
            <div>
              <h4 style="font-size:14px;font-weight:800;color:#f8fafc;margin:0 0 12px">Recompensas disponíveis (${state.rewards.length})</h4>
              <div style="display:flex;flex-direction:column;gap:10px;max-height:420px;overflow-y:auto;padding-right:6px">
                ${state.rewards.map(r => `
                  <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:12px;display:flex;align-items:center;justify-content:space-between">
                    <div style="display:flex;align-items:center;gap:12px">
                      <div style="font-size:28px">${esc(r.icon)}</div>
                      <div>
                        <div style="font-size:13px;font-weight:800;color:#ffffff">${esc(r.title)}</div>
                        <div style="font-size:11px;color:#94a3b8">${esc(r.description)}</div>
                        <span style="font-size:10px;font-weight:700;color:#d4af37;text-transform:uppercase">${esc(r.category)}</span>
                      </div>
                    </div>
                    <div>
                      ${!r.isDefault ? `
                        <button type="button" class="pc-special-reward-edit-btn" style="color:#ef4444;border-color:rgba(239,68,68,0.4)" onclick="window.ProfitCelebration.deleteCustomReward('${esc(r.id)}')">Excluir</button>
                      ` : `
                        <span style="font-size:10px;color:#64748b">Padrão</span>
                      `}
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Formulário Nova Recompensa -->
            <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px">
              <h4 style="font-size:14px;font-weight:800;color:#d4af37;margin:0 0 12px">+ Adicionar Nova Recompensa</h4>
              
              <div class="pc-pocket-field-row" style="margin-bottom:12px">
                <label>Título da recompensa</label>
                <input type="text" id="pcNewRewardTitle" placeholder="Ex: Jantar em um restaurante novo" maxlength="120" />
              </div>

              <div class="pc-pocket-field-row" style="margin-bottom:12px">
                <label>Categoria</label>
                <select id="pcNewRewardCategory" style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px 12px;color:#ffffff;font-size:13px">
                  <option value="lazer">Lazer</option>
                  <option value="gastronomia">Gastronomia</option>
                  <option value="bem-estar">Bem-estar</option>
                  <option value="outras">Outras</option>
                </select>
              </div>

              <div class="pc-pocket-field-row" style="margin-bottom:12px">
                <label>Emoji / Ícone</label>
                <input type="text" id="pcNewRewardIcon" value="🎁" maxlength="4" style="width:80px;text-align:center" />
              </div>

              <div class="pc-pocket-field-row" style="margin-bottom:16px">
                <label>Descrição curta</label>
                <textarea id="pcNewRewardDesc" class="pc-reason-textarea" placeholder="Ex: Celebrar a disciplina do trade com uma refeição especial..." style="height:60px"></textarea>
              </div>

              <button type="button" class="pc-cta-btn-primary" style="width:100%" onclick="window.ProfitCelebration.saveNewCustomReward()">
                Salvar Recompensa
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  async function saveNewCustomReward() {
    const title = document.getElementById('pcNewRewardTitle')?.value.trim();
    const category = document.getElementById('pcNewRewardCategory')?.value || 'outras';
    const icon = document.getElementById('pcNewRewardIcon')?.value.trim() || '🎁';
    const description = document.getElementById('pcNewRewardDesc')?.value.trim() || '';

    const payload = { title, category, icon, description };
    const val = M.validateRewardPayload(payload);
    if (!val.isValid) {
      if (typeof root.showToast === 'function') root.showToast(val.errors.join(' '));
      return;
    }

    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        const res = await root.healthyTrendApi.request('/api/profit-celebration/rewards', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res && res.reward) {
          state.rewards.push(res.reward);
        }
      } else {
        const localReward = {
          id: 'custom-' + Date.now(),
          ...payload,
          isDefault: false
        };
        state.rewards.push(localReward);
      }

      saveLocalCache();
      if (typeof root.showToast === 'function') root.showToast('Recompensa adicionada ao catálogo!');

      openRewardsManagerModal();
      if (document.getElementById('conquestsRoot')?.offsetParent !== null) {
        renderPage();
      }
    } catch (err) {
      if (typeof root.showToast === 'function') root.showToast(err.message || 'Erro ao criar recompensa.');
    }
  }

  async function deleteCustomReward(rewardId) {
    if (!confirm('Deseja excluir esta recompensa personalizada?')) return;

    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        await root.healthyTrendApi.request(`/api/profit-celebration/rewards/${encodeURIComponent(rewardId)}`, {
          method: 'DELETE'
        });
      }
      state.rewards = state.rewards.filter(r => r.id !== rewardId);
      saveLocalCache();
      if (typeof root.showToast === 'function') root.showToast('Recompensa removida.');
      openRewardsManagerModal();
      if (document.getElementById('conquestsRoot')?.offsetParent !== null) {
        renderPage();
      }
    } catch (err) {
      if (typeof root.showToast === 'function') root.showToast(err.message || 'Erro ao remover recompensa.');
    }
  }

  function openCustomRewardModal() {
    openRewardsManagerModal();
  }

  /* ==========================================================================
     STATUS TOGGLE & MODAIS AUXILIARES
     ========================================================================== */

  async function toggleRewardStatus(conquestId) {
    const conquest = state.conquests.find(c => c.id === conquestId);
    if (!conquest) return;

    const nextStatus = conquest.rewardStatus === 'completed' ? 'pending' : 'completed';

    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        await root.healthyTrendApi.request(`/api/profit-celebration/conquests/${encodeURIComponent(conquestId)}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: nextStatus })
        });
      }

      conquest.rewardStatus = nextStatus;
      conquest.rewardCompletedAt = nextStatus === 'completed' ? new Date().toISOString() : null;
      saveLocalCache();

      if (typeof root.showToast === 'function') {
        root.showToast(nextStatus === 'completed' ? '🎉 Recompensa marcada como realizada!' : 'Recompensa marcada como pendente.');
      }

      renderPage();
    } catch (err) {
      if (typeof root.showToast === 'function') root.showToast(err.message || 'Erro ao atualizar status.');
    }
  }

  function openSpecialRewardEditModal() {
    const old = document.getElementById('pcSpecialRewardEditOverlay');
    if (old) old.remove();

    const special = state.specialReward || { title: 'Fim de semana especial', targetConquests: 20, description: '' };

    const overlay = document.createElement('div');
    overlay.id = 'pcSpecialRewardEditOverlay';
    overlay.className = 'pc-modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="pc-modal-box pc-pocket-confirm-modal" onclick="event.stopPropagation()">
        <header class="pc-modal-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">🎯</span>
            <h3 style="margin:0;font-size:16px;font-weight:800;color:#ffffff">Próxima Recompensa Especial</h3>
          </div>
          <button type="button" class="pc-modal-close-btn" onclick="document.getElementById('pcSpecialRewardEditOverlay').remove()">×</button>
        </header>

        <div class="pc-modal-body" style="padding:10px 24px 20px">
          <p style="font-size:12px;color:#94a3b8;margin:0 0 16px">
            Defina uma meta especial de disciplina (ex: 20 conquistas) e o prêmio que você irá se conceder quando alcançá-la.
          </p>

          <div class="pc-pocket-confirm-box">
            <div class="pc-pocket-field-row">
              <label>Título da recompensa especial</label>
              <input type="text" id="pcEditSpecialTitle" value="${esc(special.title)}" maxlength="120" />
            </div>

            <div class="pc-pocket-field-row">
              <label>Meta de conquistas</label>
              <select id="pcEditSpecialTarget" style="background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px 12px;color:#ffffff;font-size:13px">
                <option value="5" ${special.targetConquests === 5 ? 'selected' : ''}>5 conquistas</option>
                <option value="10" ${special.targetConquests === 10 ? 'selected' : ''}>10 conquistas</option>
                <option value="20" ${special.targetConquests === 20 ? 'selected' : ''}>20 conquistas</option>
                <option value="50" ${special.targetConquests === 50 ? 'selected' : ''}>50 conquistas</option>
                <option value="100" ${special.targetConquests === 100 ? 'selected' : ''}>100 conquistas</option>
              </select>
            </div>

            <div class="pc-pocket-field-row">
              <label>Descrição motivacional</label>
              <textarea id="pcEditSpecialDesc" class="pc-reason-textarea" style="height:60px">${esc(special.description)}</textarea>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
            <button type="button" class="pc-cta-btn-secondary" onclick="document.getElementById('pcSpecialRewardEditOverlay').remove()">Cancelar</button>
            <button type="button" class="pc-cta-btn-primary" style="width:auto" onclick="window.ProfitCelebration.saveSpecialReward()">Salvar Meta</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  async function saveSpecialReward() {
    const title = document.getElementById('pcEditSpecialTitle')?.value.trim();
    const targetConquests = Number(document.getElementById('pcEditSpecialTarget')?.value || 20);
    const description = document.getElementById('pcEditSpecialDesc')?.value.trim() || '';

    if (!title) {
      if (typeof root.showToast === 'function') root.showToast('Informe o título da recompensa especial.');
      return;
    }

    const payload = { title, targetConquests, description };

    try {
      if (root.healthyTrendApi?.isAuthenticated()) {
        await root.healthyTrendApi.request('/api/profit-celebration/special-reward', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      }

      state.specialReward = payload;
      saveLocalCache();

      const overlay = document.getElementById('pcSpecialRewardEditOverlay');
      if (overlay) overlay.remove();

      if (typeof root.showToast === 'function') root.showToast('Meta especial salva com sucesso!');
      renderPage();
    } catch (err) {
      if (typeof root.showToast === 'function') root.showToast(err.message || 'Erro ao salvar meta especial.');
    }
  }

  function openConquestDetailModal(conquestId) {
    const c = state.conquests.find(item => item.id === conquestId);
    if (!c) return;

    const old = document.getElementById('pcConquestDetailOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pcConquestDetailOverlay';
    overlay.className = 'pc-modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="pc-modal-box pc-pocket-confirm-modal" onclick="event.stopPropagation()">
        <header class="pc-modal-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">🏆</span>
            <h3 style="margin:0;font-size:16px;font-weight:800;color:#ffffff">Conquista · ${esc(c.ticker)}</h3>
          </div>
          <button type="button" class="pc-modal-close-btn" onclick="document.getElementById('pcConquestDetailOverlay').remove()">×</button>
        </header>

        <div class="pc-modal-body" style="padding:10px 24px 20px">
          <div class="pc-recap-profit-box" style="margin-bottom:16px">
            <small>LUCRO REALIZADO</small>
            <div class="val">+ ${esc(M.formatMoneyBR(c.realizedAmount))}</div>
            <div style="font-size:12px;color:#a7f3d0;font-weight:700">(${esc(M.formatMultipleR(c.rMultiple))})</div>
          </div>

          <div class="pc-recap-rows" style="font-size:12px">
            <div class="pc-recap-row">
              <span>Data da Conquista</span>
              <strong>${esc(M.formatDateBR(c.conquestDate))}</strong>
            </div>
            <div class="pc-recap-row">
              <span>Cumprimento do Plano</span>
              <strong style="color:${c.planAdhered === 'yes' ? '#34d399' : '#fbbf24'}">${c.planAdhered === 'yes' ? 'Sim, 100%' : (c.planAdhered === 'partial' ? 'Parcial' : 'Não')}</strong>
            </div>
            <div class="pc-recap-row">
              <span>Recompensa Escolhida</span>
              <strong>${esc(c.rewardIcon || '🎁')} ${esc(c.rewardTitle)}</strong>
            </div>
            <div class="pc-recap-row">
              <span>Status da Recompensa</span>
              <strong style="color:${c.rewardStatus === 'completed' ? '#34d399' : '#fbbf24'}">${c.rewardStatus === 'completed' ? 'Realizada' : 'Pendente'}</strong>
            </div>
          </div>

          ${c.rewardReason ? `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin:16px 0;font-size:12px;color:#cbd5e1">
              <strong style="color:#d4af37;display:block;margin-bottom:4px">Motivação registrada:</strong>
              ${esc(c.rewardReason)}
            </div>
          ` : ''}

          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
            <button type="button" class="pc-status-pill-toggle ${c.rewardStatus === 'completed' ? 'completed' : ''}" onclick="window.ProfitCelebration.toggleRewardStatus('${esc(c.id)}');document.getElementById('pcConquestDetailOverlay').remove()">
              ${c.rewardStatus === 'completed' ? 'Marcar como Pendente' : 'Marcar como Realizada ✓'}
            </button>
            <button type="button" class="pc-cta-btn-secondary" onclick="document.getElementById('pcConquestDetailOverlay').remove()">Fechar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function changeFilterYear(year) {
    state.filterYear = year === 'all' ? 'all' : Number(year);
    renderPage();
  }

  function openAllMilestonesModal() {
    if (typeof root.showToast === 'function') {
      root.showToast('Você pode acompanhar os 6 marcos oficiais na régua de disciplina.');
    }
  }

  function openAllConquestsModal() {
    renderPage();
  }

  // Ouvintes de ciclo de vida
  window.addEventListener('healthyTrend:authenticated', () => {
    fetchAllData().then(() => {
      if (document.getElementById('conquestsRoot')?.offsetParent !== null) {
        renderPage();
      }
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCelebrationModal();
      const pModal = document.getElementById('pcPocketConfirmModalOverlay');
      if (pModal) pModal.remove();
      const rModal = document.getElementById('pcRewardsManagerOverlay');
      if (rModal) rModal.remove();
      const sModal = document.getElementById('pcSpecialRewardEditOverlay');
      if (sModal) sModal.remove();
      const dModal = document.getElementById('pcConquestDetailOverlay');
      if (dModal) dModal.remove();
    }
  });

  // Inicialização antecipada do cache
  initAnimationsPreference();
  loadLocalCache();

  // Interface pública
  root.ProfitCelebration = {
    openCelebrationModal,
    closeCelebrationModal,
    setModalStep,
    selectQuickReward,
    goToStep2Custom,
    setCategoryFilter,
    selectRewardCard,
    setPlanAdherenceChoice,
    setFeelingChoice,
    submitConquest,
    openPocketProfitDialog,
    executePocketProfit,
    renderPage,
    toggleRewardStatus,
    openRewardsManagerModal,
    saveNewCustomReward,
    deleteCustomReward,
    openCustomRewardModal,
    openSpecialRewardEditModal,
    saveSpecialReward,
    openConquestDetailModal,
    openAllMilestonesModal,
    openAllConquestsModal,
    changeFilterYear,
    toggleAnimations,
    getState: () => ({ ...state })
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);

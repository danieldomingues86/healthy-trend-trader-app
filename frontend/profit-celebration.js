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

  // Mapeamento de imagens premium de recompensa
  function getRewardImageUrl(rewardOrIdOrTitle) {
    if (!rewardOrIdOrTitle) return 'assets/rewards/minha-recompensa.png';
    let target = rewardOrIdOrTitle;
    if (typeof target === 'object') {
      if (target.imageUrl) return target.imageUrl;
      target = target.rewardTitle || target.title || target.rewardId || target.id || '';
    }
    const str = String(target).toLowerCase();
    if (str.includes('cafe') || str.includes('café')) return 'assets/rewards/cafe.png';
    if (str.includes('film') || str.includes('cinema') || str.includes('série') || str.includes('serie')) return 'assets/rewards/filme.png';
    if (str.includes('refei') || str.includes('jantar') || str.includes('almoço') || str.includes('almoco') || str.includes('pizza') || str.includes('hambur')) return 'assets/rewards/refeicao.png';
    if (str.includes('passei') || str.includes('parque') || str.includes('caminh')) return 'assets/rewards/passeio.png';
    if (str.includes('descan') || str.includes('dormir') || str.includes('soneca') || str.includes('spa')) return 'assets/rewards/descanso.png';
    if (str.includes('trein') || str.includes('acad') || str.includes('corr') || str.includes('esport')) return 'assets/rewards/treino.png';
    if (str.includes('livr') || str.includes('leitur')) return 'assets/rewards/livro.png';
    if (str.includes('game') || str.includes('jogo') || str.includes('jogar') || str.includes('videogame')) return 'assets/rewards/game.png';
    if (str.includes('week') || str.includes('viag') || str.includes('fim de semana') || str.includes('praia')) return 'assets/rewards/weekend.png';

    const match = (state.rewards || []).find(r => r.id === target || r.title === target)
      || (M.DEFAULT_REWARDS || []).find(r => r.id === target || r.title === target);
    if (match?.imageUrl) return match.imageUrl;
    return 'assets/rewards/minha-recompensa.png';
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
    overlay.style.display = 'flex';
    void overlay.offsetHeight;
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
      overlay.style.display = 'none';
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
    const isWide = step === 2 || step === 3;
    const stepClass = `step${step}`;

    overlay.innerHTML = `
      <canvas id="pcConfettiCanvas" class="pc-confetti-canvas"></canvas>
      <div class="pc-modal-box ${isWide ? 'wide' : ''} ${stepClass}" onclick="event.stopPropagation()">
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
              <div class="pc-step-line ${step > 1 ? 'completed' : ''}"></div>
              <div class="pc-step-item ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}">
                <div class="pc-step-circle">${step > 2 ? '✓' : '2'}</div>
                <span>Escolher Recompensa</span>
              </div>
              <div class="pc-step-line ${step > 2 ? 'completed' : ''}"></div>
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

  function getQuickRewardIcon(reward, index) {
    const id = reward?.id || '';
    if (id.includes('cafe') || index === 0) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
    }
    if (id.includes('filme') || index === 1) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16"/><path d="M17 4v16"/><path d="M2 12h20"/><path d="M2 8h5"/><path d="M2 16h5"/><path d="M17 8h5"/><path d="M17 16h5"/></svg>`;
    }
    if (id.includes('refeicao') || index === 2) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/><path d="M4 2v7a3 3 0 0 0 6 0V2"/><path d="M7 2v20"/></svg>`;
    }
    if (id.includes('passeio') || index === 3) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L6 9h3l-4 7h4l-3 4h14l-3-4h4l-4-7h3L12 2z"/><line x1="12" y1="20" x2="12" y2="22"/></svg>`;
    }
    if (id.includes('descanso') || index === 4) {
      return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><circle cx="6" cy="12" r="2"/></svg>`;
    }
    return reward?.icon || '🎁';
  }

  function getRewardImageUrl(r) {
    if (!r) return 'assets/rewards/minha-recompensa.png';
    if (r.imageUrl) return r.imageUrl;
    const id = String(r.id || '').toLowerCase();
    if (id.includes('cafe')) return 'assets/rewards/cafe.png';
    if (id.includes('filme')) return 'assets/rewards/filme.png';
    if (id.includes('refeicao')) return 'assets/rewards/refeicao.png';
    if (id.includes('passeio')) return 'assets/rewards/passeio.png';
    if (id.includes('descanso')) return 'assets/rewards/descanso.png';
    if (id.includes('treino')) return 'assets/rewards/treino.png';
    if (id.includes('livro')) return 'assets/rewards/livro.png';
    if (id.includes('game')) return 'assets/rewards/game.png';
    return 'assets/rewards/minha-recompensa.png';
  }

  /* --- ETAPA 1 DO MODAL: CELEBRAÇÃO PRINCIPAL --- */
  function renderModalStep1(c) {
    const formattedAmount = M.formatMoneyBR(c.realizedAmount);
    const formattedR = M.formatMultipleR(c.rMultiple);
    const conquestNumber = c.totalConquestsBefore + 1;
    const rDisplay = c.rMultiple != null ? `${c.rMultiple >= 0 ? '+' : ''}${formattedR.replace('+', '')}` : '+2R';

    return `
      <div class="pc-trophy-banner">
        <div class="pc-trophy-glow">
          <svg class="pc-trophy-svg" viewBox="0 0 280 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="pcBgGlow" cx="50%" cy="55%" r="50%">
                <stop offset="0%" stop-color="#FFD54F" stop-opacity="0.45"/>
                <stop offset="35%" stop-color="#D4AF37" stop-opacity="0.22"/>
                <stop offset="70%" stop-color="#064E3B" stop-opacity="0.05"/>
                <stop offset="100%" stop-color="#064E3B" stop-opacity="0"/>
              </radialGradient>
              <linearGradient id="pcTrophyGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FFF9C4"/>
                <stop offset="20%" stop-color="#FFE082"/>
                <stop offset="50%" stop-color="#F59E0B"/>
                <stop offset="85%" stop-color="#B45309"/>
                <stop offset="100%" stop-color="#78350F"/>
              </linearGradient>
              <linearGradient id="pcTrophyGoldAlt" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFFDE7"/>
                <stop offset="30%" stop-color="#FFD54F"/>
                <stop offset="70%" stop-color="#D97706"/>
                <stop offset="100%" stop-color="#92400E"/>
              </linearGradient>
              <radialGradient id="pcShelfFlare" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#FFFDE7" stop-opacity="1"/>
                <stop offset="25%" stop-color="#FDE047" stop-opacity="0.85"/>
                <stop offset="60%" stop-color="#D4AF37" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/>
              </radialGradient>
            </defs>

            <circle cx="140" cy="72" r="68" fill="url(#pcBgGlow)"/>

            <!-- Confetes e Fitas Douradas -->
            <path d="M48,22 C56,42 38,66 52,86 C57,93 67,89 62,81 C54,66 72,46 60,27 Z" fill="url(#pcTrophyGold)" opacity="0.85"/>
            <path d="M78,36 C88,51 73,71 85,91" stroke="#FFD54F" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.75"/>
            <polygon points="32,46 38,44 40,50 34,52" fill="#FFE082" opacity="0.9"/>
            <polygon points="68,16 75,14 77,21 70,23" fill="#F59E0B" opacity="0.8"/>
            <circle cx="42" cy="72" r="2.5" fill="#FFF9C4" opacity="0.85"/>
            <circle cx="88" cy="26" r="2" fill="#FFE082" opacity="0.8"/>

            <path d="M232,22 C224,42 242,66 228,86 C223,93 213,89 218,81 C226,66 208,46 220,27 Z" fill="url(#pcTrophyGoldAlt)" opacity="0.85"/>
            <path d="M202,36 C192,51 207,71 195,91" stroke="#FFD54F" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.75"/>
            <polygon points="248,46 242,44 240,50 246,52" fill="#FFE082" opacity="0.9"/>
            <polygon points="212,16 205,14 203,21 210,23" fill="#F59E0B" opacity="0.8"/>
            <circle cx="238" cy="72" r="2.5" fill="#FFF9C4" opacity="0.85"/>
            <circle cx="192" cy="26" r="2" fill="#FFE082" opacity="0.8"/>

            <!-- Linha de Brilho / Shelf Flare na base do Troféu -->
            <ellipse cx="140" cy="130" rx="95" ry="3.5" fill="url(#pcShelfFlare)"/>
            <ellipse cx="140" cy="130" rx="42" ry="1.5" fill="#FFFFFF" opacity="0.95"/>

            <!-- Base do Troféu -->
            <rect x="112" y="123" width="56" height="7" rx="2" fill="url(#pcTrophyGold)"/>
            <rect x="114" y="123" width="52" height="2" fill="#FFFDE7" opacity="0.7"/>
            <path d="M118 123 L162 123 L156 111 L124 111 Z" fill="url(#pcTrophyGoldAlt)"/>
            <rect x="133" y="101" width="14" height="11" rx="1.5" fill="url(#pcTrophyGold)"/>
            <ellipse cx="140" cy="101" rx="10" ry="3.5" fill="#F59E0B"/>
            <ellipse cx="140" cy="111" rx="12" ry="3.5" fill="#B45309"/>

            <!-- Alças -->
            <path d="M106 38 C75 38 74 80 114 85 C111 78 108 48 116 44 Z" fill="url(#pcTrophyGold)"/>
            <path d="M106 42 C82 42 82 76 112 80 C110 74 108 50 114 46 Z" fill="#78350F" opacity="0.7"/>
            <path d="M174 38 C205 38 206 80 166 85 C169 78 172 48 164 44 Z" fill="url(#pcTrophyGoldAlt)"/>
            <path d="M174 42 C198 42 198 76 168 80 C170 74 172 50 166 46 Z" fill="#78350F" opacity="0.7"/>

            <!-- Cálice -->
            <path d="M104 32 C104 78 120 102 140 102 C160 102 176 78 176 32 Z" fill="url(#pcTrophyGold)"/>
            <ellipse cx="140" cy="32" rx="36" ry="9" fill="url(#pcTrophyGoldAlt)"/>
            <ellipse cx="140" cy="32" rx="32" ry="6.5" fill="#78350F"/>
            <ellipse cx="140" cy="32.5" rx="30" ry="5.5" fill="#F59E0B"/>

            <!-- Reflexos -->
            <path d="M112 38 C111 58 118 78 126 88 C122 78 117 60 118 38 Z" fill="#FFFFFF" opacity="0.45"/>
            <path d="M168 38 C169 58 162 78 154 88 C158 78 163 60 162 38 Z" fill="#FFE082" opacity="0.3"/>

            <!-- Estrela Dourada no centro -->
            <polygon points="140,50 144,61 155,61 146,68 149,79 140,73 131,79 134,68 125,61 136,61" fill="#78350F" opacity="0.5" transform="translate(0, 1.5)"/>
            <polygon points="140,50 144,61 155,61 146,68 149,79 140,73 131,79 134,68 125,61 136,61" fill="#FFF9C4" stroke="#F59E0B" stroke-width="1.2" stroke-linejoin="round"/>
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
          <span class="pc-realized-badge-icon">✓</span>
          <span>${c.targetReached ? 'Alvo atingido' : 'Lucro embolsado'} • Plano respeitado</span>
        </div>
      </div>

      <div class="pc-stats-row">
        <div class="pc-stat-item">
          <div class="pc-stat-top">
            <span class="pc-stat-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f5cd65" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </span>
            <span class="pc-stat-val">${esc(rDisplay)}</span>
          </div>
          <div class="pc-stat-lbl">Alvo atingido</div>
        </div>
        <div class="pc-stat-item">
          <div class="pc-stat-top">
            <span class="pc-stat-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f5cd65" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
              </svg>
            </span>
            <span class="pc-stat-val">100%</span>
          </div>
          <div class="pc-stat-lbl">Disciplina</div>
        </div>
        <div class="pc-stat-item">
          <div class="pc-stat-top">
            <span class="pc-stat-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f5cd65" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </span>
            <span class="pc-stat-val">${conquestNumber}</span>
          </div>
          <div class="pc-stat-lbl">Conquista</div>
        </div>
      </div>

      <div class="pc-quote-banner">
        Hoje você não precisa ganhar mais.<br>Você já cumpriu sua missão.
      </div>

      <button type="button" class="pc-cta-btn-primary" onclick="window.ProfitCelebration.setModalStep(2)">
        <span>Registrar minha conquista</span>
        <span class="pc-cta-arrow">→</span>
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
    const selImgUrl = getRewardImageUrl(sel);

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
              const imgUrl = getRewardImageUrl(r);
              return `
                <div class="pc-reward-card ${isSelected ? 'selected' : ''}" 
                     role="button"
                     tabindex="0"
                     onclick="window.ProfitCelebration.selectRewardCard('${esc(r.id)}')"
                     onkeydown="if(event.key==='Enter'||event.key===' ')window.ProfitCelebration.selectRewardCard('${esc(r.id)}')">
                  <div class="pc-reward-card-visual">
                    <img src="${esc(imgUrl)}" 
                         class="pc-reward-card-img" 
                         alt="${esc(r.title)}" 
                         loading="lazy"
                         onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex'">
                    <span class="pc-reward-card-fallback-icon" style="display:none">${esc(r.icon || '🎁')}</span>
                  </div>
                  <div class="pc-reward-card-title">${esc(r.title)}</div>
                  <div class="pc-reward-card-desc">${esc(r.description)}</div>
                </div>
              `;
            }).join('')}

            <div class="pc-reward-card pc-reward-card-custom-add" 
                 role="button"
                 tabindex="0"
                 onclick="window.ProfitCelebration.openCustomRewardModal()"
                 onkeydown="if(event.key==='Enter'||event.key===' ')window.ProfitCelebration.openCustomRewardModal()">
              <div class="pc-reward-card-visual">
                <img src="assets/rewards/minha-recompensa.png" 
                     class="pc-reward-card-img" 
                     alt="Minha recompensa personalizada" 
                     loading="lazy"
                     onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex'">
                <span class="pc-reward-card-fallback-icon" style="display:none">🎁</span>
              </div>
              <div class="pc-reward-card-title" style="color:#f5cd65">Minha recompensa</div>
              <div class="pc-reward-card-desc">Crie sua própria recompensa personalizada.</div>
            </div>
          </div>
        </div>

        <!-- Coluna Direita: Detalhe e Justificativa da Recompensa -->
        <div class="pc-selected-reward-panel">
          <div class="pc-selected-visual">
            <img src="${esc(selImgUrl)}" 
                 class="pc-selected-visual-img" 
                 alt="${esc(sel.title)}"
                 onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex'">
            <span class="pc-selected-fallback-icon" style="display:none">${esc(sel.icon || '🎁')}</span>
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
    const selImgUrl = getRewardImageUrl(sel);
    const isGreedUrge = state.feelingChoice === 'greed_urge';

    return `
      <div class="pc-step3-header-banner">
        <small class="pc-step3-eyebrow">PROFIT CELEBRATION · ETAPA FINAL</small>
        <h2 class="pc-step3-title">Conclusão do Ritual de Vitória</h2>
        <p class="pc-step3-subtitle">Reflita sobre sua disciplina para consolidar o hábito correto e ancorar sua vitória.</p>
      </div>

      <div class="pc-ritual-questions-grid">
        <!-- Bloco 1: Avaliação do Plano -->
        <div class="pc-question-box">
          <div class="pc-question-header">
            <div class="pc-question-title">
              <span class="pc-question-icon">🎯</span>
              <span>Você cumpriu 100% o seu plano?</span>
            </div>
            <span class="pc-question-hint-badge">Fidelidade Operacional</span>
          </div>
          
          <div class="pc-options-group" role="radiogroup" aria-label="Você cumpriu 100% o seu plano?">
            ${M.PLAN_ADHERENCE_OPTIONS.map((opt) => {
              const isSelected = state.planAdheredChoice === opt.id;
              let badgeText = '100% Plano';
              let optIcon = '✓';
              if (opt.id === 'partial') {
                badgeText = 'Ajuste Previsto';
                optIcon = '⚖️';
              } else if (opt.id === 'no') {
                badgeText = 'Desvio do Plano';
                optIcon = '✕';
              }

              return `
                <div class="pc-option-btn ${isSelected ? `selected ${opt.badgeClass}` : ''}" 
                     role="radio"
                     aria-checked="${isSelected ? 'true' : 'false'}"
                     tabindex="0"
                     onclick="window.ProfitCelebration.setPlanAdherenceChoice('${opt.id}')"
                     onkeydown="if(event.key==='Enter'||event.key===' ')window.ProfitCelebration.setPlanAdherenceChoice('${opt.id}')">
                  <div class="pc-option-top-row">
                    <div class="pc-option-radio-indicator">
                      ${isSelected ? `<span class="pc-radio-dot"></span>` : ''}
                    </div>
                    <span class="pc-option-tag ${opt.badgeClass}">${badgeText}</span>
                  </div>
                  <div class="pc-option-btn-title">
                    <span class="pc-option-symbol">${optIcon}</span>
                    <span>${esc(opt.label)}</span>
                  </div>
                  <div class="pc-option-btn-desc">${esc(opt.desc)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Bloco 2: Estado Emocional -->
        <div class="pc-question-box">
          <div class="pc-question-header">
            <div class="pc-question-title">
              <span class="pc-question-icon">🧠</span>
              <span>Como você está se sentindo agora?</span>
            </div>
            <span class="pc-question-hint-badge">Auto-observação Emocional</span>
          </div>

          <div class="pc-options-group" role="radiogroup" aria-label="Como você está se sentindo agora?">
            ${M.FEELING_OPTIONS.map((opt) => {
              const isSelected = state.feelingChoice === opt.id;
              let badgeText = 'Equilíbrio';
              let badgeClass = 'good';
              if (opt.id === 'relief') {
                badgeText = 'Paz Mental';
                badgeClass = 'good';
              } else if (opt.id === 'greed_urge') {
                badgeText = 'Atenção';
                badgeClass = 'warn';
              }

              return `
                <div class="pc-option-btn ${isSelected ? (opt.id === 'greed_urge' ? 'selected warn' : 'selected') : ''}" 
                     role="radio"
                     aria-checked="${isSelected ? 'true' : 'false'}"
                     tabindex="0"
                     onclick="window.ProfitCelebration.setFeelingChoice('${opt.id}')"
                     onkeydown="if(event.key==='Enter'||event.key===' ')window.ProfitCelebration.setFeelingChoice('${opt.id}')">
                  <div class="pc-option-top-row">
                    <div class="pc-option-radio-indicator">
                      ${isSelected ? `<span class="pc-radio-dot"></span>` : ''}
                    </div>
                    <span class="pc-option-tag ${badgeClass}">${badgeText}</span>
                  </div>
                  <div class="pc-option-btn-title">
                    <span class="pc-option-symbol">${opt.icon}</span>
                    <span>${esc(opt.label)}</span>
                  </div>
                  <div class="pc-option-btn-desc">${esc(opt.hint)}</div>
                </div>
              `;
            }).join('')}
          </div>

          ${isGreedUrge ? `
            <div class="pc-greed-alert">
              <div class="pc-greed-alert-icon">⚠️</div>
              <div class="pc-greed-alert-content">
                <strong>Atenção ao Overtrading e à Ganância:</strong>
                <p>Você já cumpriu seu objetivo nesta operação. Tentar buscar mais no mesmo dia geralmente devolve o lucro ao mercado. Feche a plataforma e comemore sua vitória.</p>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Bloco 3: Recompensa Selecionada (Card Premium) -->
      <div class="pc-step3-reward-card">
        <div class="pc-step3-reward-main">
          <div class="pc-step3-reward-thumb">
            <img src="${esc(selImgUrl)}" 
                 class="pc-step3-reward-img" 
                 alt="${esc(sel.title)}" 
                 onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex'">
            <div class="pc-step3-reward-fallback" style="display:none">${esc(sel.icon || '🎁')}</div>
          </div>
          <div class="pc-step3-reward-info">
            <div class="pc-step3-reward-eyebrow">
              <span class="pc-sparkle">✨</span>
              <span>RECOMPENSA ESCOLHIDA</span>
              <span class="pc-step3-reward-cat-tag">${esc(sel.category ? sel.category.toUpperCase() : 'GERAL')}</span>
            </div>
            <div class="pc-step3-reward-title">${esc(sel.title)}</div>
            ${state.rewardReason ? `
              <div class="pc-step3-reward-reason">
                <span class="pc-reason-quote-icon">“</span>
                <span>${esc(state.rewardReason)}</span>
                <span class="pc-reason-quote-icon">”</span>
              </div>
            ` : `
              <div class="pc-step3-reward-desc">${esc(sel.description || '')}</div>
            `}
          </div>
        </div>
        <div class="pc-step3-quote-callout">
          <div class="pc-quote-symbol">“</div>
          <div class="pc-quote-text">Hoje você não precisa ganhar mais. Você já cumpriu sua missão.</div>
        </div>
      </div>

      <div class="pc-step-footer">
        <button type="button" class="pc-cta-btn-secondary" onclick="window.ProfitCelebration.setModalStep(2)">
          ← Voltar
        </button>
        <button type="button" class="pc-cta-btn-primary" style="width:auto;min-width:280px" id="pcBtnSubmitConquest" onclick="window.ProfitCelebration.submitConquest()">
          <span>Concluir Ritual e Salvar Conquista</span>
          <span style="font-size:18px">🍾</span>
        </button>
      </div>
    `;
  }

  /* --- MÉTODOS DE CONTROLE DO MODAL --- */
  function selectQuickReward(rewardId) {
    const found = state.rewards.find(r => r.id === rewardId);
    if (found) {
      state.selectedReward = found;
      renderModalContent();
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
      btn.innerHTML = '<span>Salvando conquista...</span>';
    }

    const c = state.activeCelebration;
    const targetTradeId = c?.tradeId || null;
    const sel = state.selectedReward || state.rewards[0] || M.DEFAULT_REWARDS[0];

    const payload = {
      tradeId: targetTradeId,
      eventId: c?.eventId || null,
      ticker: c?.ticker || 'ATIVO',
      direction: c?.direction || 'long',
      realizedAmount: c?.realizedAmount || 0,
      rMultiple: c?.rMultiple != null ? c.rMultiple : null,
      targetReached: Boolean(c?.targetReached),
      planAdhered: state.planAdheredChoice || 'yes',
      feeling: state.feelingChoice || 'pride',
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
        try {
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
        } catch (apiErr) {
          console.warn('[ProfitCelebration] Falha na persistência via API, utilizando fallback local:', apiErr);
          const localConquest = {
            id: 'local-' + Date.now(),
            ...payload,
            rewardStatus: 'pending',
            createdAt: new Date().toISOString()
          };
          state.conquests.unshift(localConquest);
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

      // Fecha o modal completamente
      closeCelebrationModal();

      if (typeof root.showToast === 'function') {
        root.showToast('🏆 Conquista registrada com sucesso! Parabéns pela disciplina.');
      }

      // Eventos para outros componentes atualizarem
      window.dispatchEvent(new CustomEvent('healthyTrend:conquestCreated', { detail: payload }));
      window.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));

      // Se a página de conquistas estiver no DOM, atualiza a view
      const conquestsRoot = document.getElementById('conquestsRoot');
      if (conquestsRoot && typeof renderPage === 'function') {
        renderPage(conquestsRoot);
      }

      // Retorno ao trade em aberto da onde começou o fluxo:
      if (targetTradeId) {
        if (typeof window.syncOperationalFromDatabase === 'function') {
          try {
            await window.syncOperationalFromDatabase();
          } catch (syncErr) {
            console.warn('[ProfitCelebration] Erro ao sincronizar operações:', syncErr);
          }
        }
        if (typeof window.openPosition === 'function') {
          window.openPosition(targetTradeId);
        } else if (typeof window.go === 'function') {
          window.go('positiondetail');
        }
      } else if (typeof window.go === 'function') {
        const currentActive = document.querySelector('.page.active');
        if (!currentActive) {
          window.go('positions');
        }
      }
    } catch (err) {
      console.error('[ProfitCelebration] Erro ao salvar conquista:', err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>Concluir Ritual e Salvar Conquista</span> <span style="font-size:18px">🍾</span>';
      }
      if (typeof root.showToast === 'function') {
        root.showToast(err.message || 'Erro ao registrar conquista.');
      }
    }
  }

  /* ==========================================================================
     PAINEL "MINHAS CONQUISTAS" (PÁGINA PRINCIPAL)
     ========================================================================== */

  /* ==========================================================================
     PAINEL "MINHAS CONQUISTAS" (PÁGINA PRINCIPAL)
     ========================================================================== */

  function renderPage(containerOrId) {
    const container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : (containerOrId || document.getElementById('conquestsRoot'));

    if (!container) return;

    // Ativa classe no body para adaptações completas do layout widescreen
    document.body.classList.add('page-conquests-active');

    // Se estiver vazio e autenticado, busca os dados
    if (state.conquests.length === 0 && root.healthyTrendApi?.isAuthenticated()) {
      fetchAllData().then(() => renderPage(container));
    }

    // Calcula estatísticas considerando o filtro de ano selecionado
    const stats = M.calculateConquestsStats(state.conquests, { filterYear: state.filterYear });
    state.stats = stats;
    const milestones = stats.milestones;
    const special = state.specialReward || { targetConquests: 20, title: 'Fim de semana especial', description: '' };

    // Anos disponíveis para o seletor (garante ano atual, 2025 e anos presentes nas conquistas)
    const currentYr = new Date().getFullYear();
    const recordedYears = state.conquests.map((c) => {
      const dStr = String(c.conquestDate || c.conquest_date || c.createdAt || c.created_at || '').slice(0, 4);
      return Number(dStr);
    }).filter((y) => Number.isFinite(y) && y > 2000);
    const availableYears = Array.from(new Set([currentYr, 2025, ...recordedYears])).sort((a, b) => b - a);

    // Conquistas filtradas para a tabela
    const displayedConquests = state.filterYear === 'all'
      ? state.conquests
      : state.conquests.filter((c) => {
          const dStr = String(c.conquestDate || c.conquest_date || c.createdAt || c.created_at || '').slice(0, 4);
          return Number(dStr) === state.filterYear;
        });

    // Progresso para a recompensa especial
    const specialTarget = special.targetConquests || 20;
    const specialProgressPct = Math.min(100, Math.round((stats.totalPlansComplied / specialTarget) * 100));

    // Cálculo da linha de progresso nos marcos de disciplina
    const completedIndices = milestones.milestones
      .map((m, idx) => m.isReached ? idx : -1)
      .filter(idx => idx >= 0);
    const maxReachedIdx = completedIndices.length > 0 ? Math.max(...completedIndices) : -1;
    const totalNodes = milestones.milestones.length;
    const trackFillPct = maxReachedIdx >= 0
      ? Math.min(100, Math.round((maxReachedIdx / (totalNodes - 1)) * 100))
      : 0;

    container.innerHTML = `
      <!-- Breadcrumb & Top Bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#94a3b8">
          <span>Treinamento do Trader</span>
          <span style="color:#64748b">&gt;</span>
          <strong style="color:#f8fafc">Minhas Conquistas</strong>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <select id="pcYearFilterSelect" style="background:#0A2224;border:1px solid #13373b;border-radius:10px;padding:7px 14px;color:#f8fafc;font-size:12px;font-weight:700;cursor:pointer;outline:none;box-shadow:0 4px 12px rgba(0,0,0,0.25)" onchange="window.ProfitCelebration.changeFilterYear(this.value)">
            ${availableYears.map((yr) => `
              <option value="${yr}" ${state.filterYear === yr ? 'selected' : ''}>📅 ${yr}</option>
            `).join('')}
            <option value="all" ${state.filterYear === 'all' ? 'selected' : ''}>📅 Todos os anos</option>
          </select>
        </div>
      </div>

      <!-- Header Banner Hero -->
      <section class="pc-page-header">
        <div class="pc-page-header-left">
          <img src="assets/rewards/trophy.png" class="pc-page-trophy-img" alt="Troféu Minhas Conquistas" />
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
          <div class="pc-kpi-badge-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
          </div>
          <div class="pc-kpi-card-content">
            <div class="pc-kpi-card-val">${esc(stats.totalPlansComplied)}</div>
            <div class="pc-kpi-card-lbl">Planos cumpridos</div>
            <div class="pc-kpi-card-sub">
              <span>+${esc(stats.plansCompliedThisMonth)} este mês</span>
            </div>
          </div>
        </div>

        <!-- KPI 2: Lucro realizado -->
        <div class="pc-kpi-card">
          <div class="pc-kpi-badge-icon gold">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="8"/>
              <path d="M12 8v8"/>
              <path d="M9.5 10a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-2.5 2s-2.5.5-2.5 2a2.5 2.5 0 0 0 5 0"/>
            </svg>
          </div>
          <div class="pc-kpi-card-content">
            <div class="pc-kpi-card-val">${esc(stats.totalRealizedProfitFormatted)}</div>
            <div class="pc-kpi-card-lbl">Lucro realizado</div>
            <div class="pc-kpi-card-sub ${stats.profitGrowthPct >= 0 ? '' : 'neutral'}">
              <span>${stats.profitGrowthPct >= 0 ? '+' : ''}${esc(stats.profitGrowthPct)}% vs mês anterior</span>
            </div>
          </div>
        </div>

        <!-- KPI 3: Sequência de disciplina -->
        <div class="pc-kpi-card">
          <div class="pc-kpi-badge-icon gold">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
          <div class="pc-kpi-card-content">
            <div class="pc-kpi-card-val">${esc(stats.currentStreakDays)} dias</div>
            <div class="pc-kpi-card-lbl">Sequência de disciplina</div>
            <div class="pc-kpi-card-sub">
              <span>Recorde: ${esc(stats.recordStreakDays)} dias</span>
            </div>
          </div>
        </div>

        <!-- KPI 4: Média de R -->
        <div class="pc-kpi-card">
          <div class="pc-kpi-badge-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <div class="pc-kpi-card-content">
            <div class="pc-kpi-card-val">${esc(stats.avgRFormatted)}</div>
            <div class="pc-kpi-card-lbl">Média de R por conquista</div>
            <div class="pc-kpi-card-sub">
              <span>${stats.avgR >= 1.5 ? 'Dentro do esperado' : 'Em desenvolvimento'}</span>
            </div>
          </div>
        </div>

        <!-- KPI 5: Próximo marco -->
        <div class="pc-kpi-card">
          <div class="pc-kpi-badge-icon gold">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="8" r="6"/>
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
            </svg>
          </div>
          <div class="pc-kpi-card-content">
            <div class="pc-kpi-card-val">${esc(milestones.summaryText)}</div>
            <div class="pc-kpi-card-lbl">Próximo marco</div>
            <div class="pc-kpi-progress-bar">
              <div class="pc-kpi-progress-fill" style="width:${milestones.progressPct}%"></div>
            </div>
            <div class="pc-kpi-card-sub gold" style="margin-top:4px">
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
            ${renderEvolutionChart(stats.monthlyEvolution, stats.hasAnyMonthlyData)}
          </div>
        </div>

        <!-- Card Marcos de Disciplina + Próxima Recompensa Especial -->
        <div class="pc-card-box">
          <div class="pc-card-head">
            <h3>Marcos de Disciplina</h3>
            <button type="button" class="pc-link-btn" onclick="window.ProfitCelebration.openAllMilestonesModal()">Ver todos</button>
          </div>

          <!-- Stepper de Marcos (1, 5, 10, 20, 50, 100) -->
          <div class="pc-milestones-stepper">
            <div class="pc-milestones-track-bg"></div>
            <div class="pc-milestones-track-fill" style="width:${trackFillPct}%"></div>
            ${milestones.milestones.map((m) => {
              const isComp = m.isReached;
              const isCurr = m.isCurrent;
              return `
                <div class="pc-milestone-node ${isComp ? 'completed' : (isCurr ? 'current' : 'locked')}" title="${esc(m.description)}">
                  <div class="pc-milestone-circle">
                    ${isComp ? `
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ` : (isCurr ? m.target : '🔒')}
                  </div>
                  <div class="pc-milestone-node-info">
                    <span class="pc-milestone-target-num">${m.target}</span>
                    <span class="pc-milestone-lbl">${esc(m.title)}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Card Próxima Recompensa Especial -->
          <div style="margin-top:auto">
            <div style="font-size:12px;font-weight:800;color:#f8fafc;margin-bottom:8px">Minha próxima recompensa especial</div>
            <div class="pc-special-reward-card">
              <img src="${esc(special.imageUrl || 'assets/rewards/weekend.png')}" class="pc-special-reward-thumb" alt="${esc(special.title)}" onerror="this.src='assets/rewards/weekend.png'" />
              <div class="pc-special-reward-info">
                <div class="pc-special-reward-title">${esc(special.title)}</div>
                <div class="pc-special-reward-desc">${esc(special.description || `Quando eu completar ${specialTarget} conquistas, vou me presentear com um momento especial.`)}</div>
              </div>
              <div class="pc-special-reward-right">
                <div class="pc-special-reward-progress-bar">
                  <div class="pc-special-reward-progress-fill" style="width:${specialProgressPct}%"></div>
                </div>
                <div style="display:flex;align-items:center;gap:12px">
                  <span style="font-size:12px;font-weight:700;color:#F5CD65">${stats.totalPlansComplied}/${specialTarget}</span>
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
            ${displayedConquests.length > 5 ? `<button type="button" class="pc-link-btn" onclick="window.ProfitCelebration.openAllConquestsModal()">Ver todas (${displayedConquests.length})</button>` : ''}
          </div>

          ${displayedConquests.length === 0 ? `
            <div style="text-align:center;padding:48px 20px;color:#94a3b8">
              <div style="font-size:42px;margin-bottom:12px">🏆</div>
              <h4 style="font-size:16px;color:#ffffff;margin:0 0 6px;font-weight:800">Nenhuma conquista registrada ${state.filterYear === 'all' ? 'ainda' : `em ${state.filterYear}`}</h4>
              <p style="font-size:12px;margin:0 0 16px;max-width:380px;margin-inline:auto;line-height:1.5">
                Quando você realizar um lucro conforme seu plano, clique em <strong style="color:#F5CD65">"Embolsar Lucro"</strong> na tela da operação para iniciar seu Ritual de Vitória.
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${displayedConquests.slice(0, 7).map((c) => {
                    const isCompleted = c.rewardStatus === 'completed';
                    const rewardImg = getRewardImageUrl(c);
                    return `
                      <tr style="cursor:pointer" onclick="window.ProfitCelebration.openConquestDetailModal('${esc(c.id)}')">
                        <td>${esc(M.formatDateBR(c.conquestDate))}</td>
                        <td><strong style="color:#ffffff">${esc(c.ticker)}</strong></td>
                        <td style="color:#34D6AB;font-weight:700">+ ${esc(M.formatMoneyBR(c.realizedAmount))}</td>
                        <td style="color:#34D6AB;font-weight:700">${esc(M.formatMultipleR(c.rMultiple))}</td>
                        <td>
                          ${c.planAdhered === 'yes' ? `
                            <span class="pc-plan-adhered-badge" style="color:#34D6AB">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              <span>Sim</span>
                            </span>
                          ` : (c.planAdhered === 'partial' ? `
                            <span class="pc-plan-adhered-badge" style="color:#F5CD65">
                              <span>⚠ Parcial</span>
                            </span>
                          ` : `
                            <span class="pc-plan-adhered-badge" style="color:#EF4444">
                              <span>✕ Não</span>
                            </span>
                          `)}
                        </td>
                        <td>
                          <div style="display:flex;align-items:center;gap:10px">
                            <img src="${esc(rewardImg)}" class="pc-table-reward-thumb" alt="${esc(c.rewardTitle || 'Recompensa')}" onerror="this.src='assets/rewards/minha-recompensa.png'" />
                            <span style="color:#e2e8f0;font-weight:600">${esc(c.rewardTitle || 'Recompensa pessoal')}</span>
                          </div>
                        </td>
                        <td onclick="event.stopPropagation()">
                          <button type="button" class="pc-status-pill-toggle ${isCompleted ? 'completed' : ''}" onclick="window.ProfitCelebration.toggleRewardStatus('${esc(c.id)}')">
                            <span>${isCompleted ? 'Realizada' : 'Pendente'}</span>
                            <span>›</span>
                          </button>
                        </td>
                        <td>
                          <span class="pc-table-row-arrow">›</span>
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
              <button type="button" class="pc-link-btn" onclick="window.ProfitCelebration.openRewardsManagerModal()">Ver todas</button>
            </div>

            <div class="pc-top-rewards-list">
              ${stats.topRewards.length === 0 ? `
                <div style="font-size:12px;color:#94a3b8;text-align:center;padding:24px 0">
                  Nenhuma recompensa registrada ainda.
                </div>
              ` : stats.topRewards.map((item) => {
                const maxCount = stats.topRewards[0].count || 1;
                const fillPct = Math.round((item.count / maxCount) * 100);
                const itemImg = getRewardImageUrl(item);
                return `
                  <div class="pc-top-reward-item">
                    <div class="pc-top-reward-left">
                      <img src="${esc(itemImg)}" style="width:28px;height:28px;border-radius:6px;object-fit:cover;border:1px solid rgba(255,255,255,0.12);flex-shrink:0" alt="${esc(item.title)}" onerror="this.src='assets/rewards/minha-recompensa.png'" />
                      <span title="${esc(item.title)}">${esc(item.title)}</span>
                    </div>
                    <div class="pc-top-reward-bar-track">
                      <div class="pc-top-reward-bar-fill" style="width:${fillPct}%"></div>
                    </div>
                    <div class="pc-top-reward-count">${item.count}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Meu Catálogo de Recompensas -->
          <div class="pc-card-box">
            <div class="pc-card-head">
              <h3>Meu catálogo de recompensas</h3>
              <button type="button" class="pc-link-btn" onclick="window.ProfitCelebration.openRewardsManagerModal()">Ver todas</button>
            </div>

            <div class="pc-catalog-preview-row">
              ${state.rewards.slice(0, 4).map((r) => `
                <div class="pc-catalog-preview-card" onclick="window.ProfitCelebration.openRewardsManagerModal()" title="${esc(r.title)}">
                  <img src="${esc(getRewardImageUrl(r))}" alt="${esc(r.title)}" onerror="this.src='assets/rewards/minha-recompensa.png'" />
                </div>
              `).join('')}
              <div class="pc-catalog-preview-arrow" onclick="window.ProfitCelebration.openRewardsManagerModal()" title="Ver catálogo completo">›</div>
            </div>

            <button type="button" class="pc-catalog-manage-btn" onclick="window.ProfitCelebration.openRewardsManagerModal()">
              <span>+ Gerenciar recompensas</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /* --- RENDERIZADOR DO GRÁFICO SVG RESPONSIVO (DUAL AXIS) --- */
  function renderEvolutionChart(monthlyData = [], hasAnyData = true) {
    const width = 800;
    const height = 320;
    const padding = { top: 35, right: 65, bottom: 45, left: 75 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Se não houver dados no período, renderiza Estado Vazio Elegante (com eixos sutis ao fundo)
    if (!hasAnyData || !Array.isArray(monthlyData) || monthlyData.length === 0) {
      const yearLabel = state.filterYear === 'all' ? 'no histórico geral' : `em ${state.filterYear}`;
      return `
        <div class="pc-chart-empty-state">
          <svg class="pc-chart-empty-backdrop" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
            <line x1="${padding.left}" y1="${padding.top + chartH * 0.25}" x2="${width - padding.right}" y2="${padding.top + chartH * 0.25}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
            <line x1="${padding.left}" y1="${padding.top + chartH * 0.5}" x2="${width - padding.right}" y2="${padding.top + chartH * 0.5}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
            <line x1="${padding.left}" y1="${padding.top + chartH * 0.75}" x2="${width - padding.right}" y2="${padding.top + chartH * 0.75}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3" />
            <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="rgba(255,255,255,0.12)" />
            <text x="${padding.left - 12}" y="${padding.top + 4}" text-anchor="end" fill="#475569" font-size="10">R$ 5.000</text>
            <text x="${padding.left - 12}" y="${padding.top + chartH * 0.5 + 4}" text-anchor="end" fill="#475569" font-size="10">R$ 2.500</text>
            <text x="${padding.left - 12}" y="${padding.top + chartH + 4}" text-anchor="end" fill="#475569" font-size="10">R$ 0</text>
            <text x="${width - padding.right + 12}" y="${padding.top + 4}" text-anchor="start" fill="#475569" font-size="10">20</text>
            <text x="${width - padding.right + 12}" y="${padding.top + chartH * 0.5 + 4}" text-anchor="start" fill="#475569" font-size="10">10</text>
            <text x="${width - padding.right + 12}" y="${padding.top + chartH + 4}" text-anchor="start" fill="#475569" font-size="10">0</text>
          </svg>
          <div class="pc-chart-empty-card">
            <div class="pc-chart-empty-icon">📈</div>
            <div class="pc-chart-empty-title">Sem realizações de lucro registradas ${yearLabel}</div>
            <p class="pc-chart-empty-desc">
              Ao realizar o lucro de uma operação e cumprir o Ritual de Vitória, a evolução mensal de ganhos e quantidade de conquistas será exibida aqui.
            </p>
          </div>
        </div>
      `;
    }

    const rawMaxProfit = Math.max(1000, ...monthlyData.map((d) => d.profit));
    // Arredonda para um patamar visualmente harmônico (ex: 2000, 4000, 8000...)
    const maxProfit = Math.ceil(rawMaxProfit / 1000) * 1000;

    const rawMaxCount = Math.max(5, ...monthlyData.map((d) => d.conquestsCount));
    const maxCount = Math.ceil(rawMaxCount / 5) * 5;

    const n = monthlyData.length;
    const barWidth = Math.max(16, Math.min(26, Math.floor(chartW / (n * 2.3))));

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
        <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barH}" rx="4" fill="#34D6AB" opacity="0.9" style="filter:drop-shadow(0 2px 6px rgba(52,214,171,0.25))">
          <title>${esc(d.label)}: ${M.formatMoneyBR(d.profit)} (${d.conquestsCount} conquistas)</title>
        </rect>
        <text x="${xCenter}" y="${height - 12}" text-anchor="middle" fill="#94A3B8" font-size="11" font-weight="600">${esc(d.label)}</text>
      `;
    }).join('');

    const linePathD = linePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const dotsMarkup = linePoints.map((p) => `
      <circle cx="${p.x}" cy="${p.y}" r="5" fill="#F5CD65" stroke="#0A2224" stroke-width="2.5" style="filter:drop-shadow(0 0 6px rgba(245,205,101,0.6))">
        <title>${p.count} conquista(s)</title>
      </circle>
    `).join('');

    // Eixos Y
    const yAxisLabels = [
      { y: padding.top, leftVal: M.formatMoneyBR(maxProfit), rightVal: maxCount },
      { y: padding.top + chartH * 0.25, leftVal: M.formatMoneyBR(maxProfit * 0.75), rightVal: Math.round(maxCount * 0.75) },
      { y: padding.top + chartH * 0.5, leftVal: M.formatMoneyBR(maxProfit * 0.5), rightVal: Math.round(maxCount * 0.5) },
      { y: padding.top + chartH * 0.75, leftVal: M.formatMoneyBR(maxProfit * 0.25), rightVal: Math.round(maxCount * 0.25) },
      { y: padding.top + chartH, leftVal: 'R$ 0', rightVal: '0' }
    ];

    const yAxisMarkup = yAxisLabels.map((l) => `
      <line x1="${padding.left}" y1="${l.y}" x2="${width - padding.right}" y2="${l.y}" stroke="rgba(255,255,255,0.08)" stroke-dasharray="3 3" />
      <text x="${padding.left - 12}" y="${l.y + 4}" text-anchor="end" fill="#64748B" font-size="10.5" font-weight="600">${esc(l.leftVal)}</text>
      <text x="${width - padding.right + 12}" y="${l.y + 4}" text-anchor="start" fill="#F5CD65" font-size="10.5" font-weight="700">${l.rightVal}</text>
    `).join('');

    const leftAxisTitleY = -(padding.top + chartH / 2);
    const rightAxisTitleY = (padding.top + chartH / 2);
    const rightAxisTitleX = -(width - 18);

    return `
      <svg class="pc-svg-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        ${yAxisMarkup}
        <text transform="rotate(-90)" x="${leftAxisTitleY}" y="22" text-anchor="middle" fill="#64748B" font-size="11" font-weight="700" letter-spacing="0.5">Lucro (R$)</text>
        <text transform="rotate(90)" x="${rightAxisTitleY}" y="${rightAxisTitleX}" text-anchor="middle" fill="#F5CD65" font-size="11" font-weight="700" letter-spacing="0.5">Conquistas</text>
        ${barsMarkup}
        <path d="${linePathD}" fill="none" stroke="#F5CD65" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 2px 8px rgba(245,205,101,0.35))" />
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
                      <img src="${esc(getRewardImageUrl(r))}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,0.12);flex-shrink:0" alt="${esc(r.title)}" onerror="this.src='assets/rewards/minha-recompensa.png'" />
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
              <div style="display:flex;align-items:center;gap:8px">
                <img src="${esc(getRewardImageUrl(c))}" style="width:24px;height:24px;border-radius:6px;object-fit:cover;border:1px solid rgba(255,255,255,0.12)" alt="" onerror="this.src='assets/rewards/minha-recompensa.png'" />
                <strong>${esc(c.rewardTitle || 'Recompensa')}</strong>
              </div>
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
    const old = document.getElementById('pcAllMilestonesOverlay');
    if (old) old.remove();

    const stats = state.stats || M.calculateConquestsStats(state.conquests);
    const milestones = stats.milestones;

    const overlay = document.createElement('div');
    overlay.id = 'pcAllMilestonesOverlay';
    overlay.className = 'pc-modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="pc-modal-box" style="max-width:540px" onclick="event.stopPropagation()">
        <header class="pc-modal-header">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">🎖️</span>
            <h3 style="margin:0;font-size:17px;font-weight:900;color:#ffffff">Marcos Oficiais de Disciplina</h3>
          </div>
          <button type="button" class="pc-modal-close-btn" onclick="document.getElementById('pcAllMilestonesOverlay').remove()">×</button>
        </header>

        <div class="pc-modal-body" style="padding:16px 24px 24px">
          <p style="font-size:12px;color:#94a3b8;margin:0 0 16px;line-height:1.5">
            Cada marco celebra a maestria na execução sistemática. O que constrói um trader vencedor é o cumprimento repetido do processo.
          </p>

          <div style="display:flex;flex-direction:column;gap:12px;max-height:460px;overflow-y:auto;padding-right:4px">
            ${milestones.milestones.map((m) => {
              const isComp = m.isReached;
              const isCurr = m.isCurrent;
              return `
                <div style="background:${isComp ? 'rgba(52,214,171,0.08)' : (isCurr ? 'rgba(245,205,101,0.08)' : 'rgba(255,255,255,0.02)')};border:1px solid ${isComp ? 'rgba(52,214,171,0.3)' : (isCurr ? 'rgba(245,205,101,0.35)' : 'rgba(255,255,255,0.06)')};border-radius:14px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px">
                  <div style="display:flex;align-items:center;gap:14px">
                    <div style="width:40px;height:40px;border-radius:50%;background:${isComp ? '#34D6AB' : (isCurr ? '#F5CD65' : '#0A2224')};color:${isComp || isCurr ? '#06171A' : '#64748b'};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;flex-shrink:0;border:1.5px solid ${isComp ? '#34D6AB' : (isCurr ? '#F5CD65' : 'rgba(255,255,255,0.15)')}">
                      ${isComp ? '✓' : (isCurr ? m.target : '🔒')}
                    </div>
                    <div>
                      <div style="font-size:13.5px;font-weight:800;color:${isComp ? '#34D6AB' : (isCurr ? '#F5CD65' : '#ffffff')}">${esc(m.title)} (${m.target} planos)</div>
                      <div style="font-size:11.5px;color:#94a3b8;margin-top:2px">${esc(m.description)}</div>
                    </div>
                  </div>
                  <div>
                    <span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:10px;background:${isComp ? 'rgba(52,214,171,0.15)' : (isCurr ? 'rgba(245,205,101,0.15)' : 'rgba(255,255,255,0.05)')};color:${isComp ? '#34D6AB' : (isCurr ? '#F5CD65' : '#64748b')}">
                      ${isComp ? 'Concluído' : (isCurr ? 'Em andamento' : 'Bloqueado')}
                    </span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function openAllConquestsModal() {
    const old = document.getElementById('pcAllConquestsOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'pcAllConquestsOverlay';
    overlay.className = 'pc-modal-overlay open';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="pc-modal-box wide" style="max-width:980px" onclick="event.stopPropagation()">
        <header class="pc-modal-header">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:22px">📜</span>
            <h3 style="margin:0;font-size:17px;font-weight:900;color:#ffffff">Histórico Completo de Conquistas (${state.conquests.length})</h3>
          </div>
          <button type="button" class="pc-modal-close-btn" onclick="document.getElementById('pcAllConquestsOverlay').remove()">×</button>
        </header>

        <div class="pc-modal-body" style="padding:16px 24px 24px">
          <div style="max-height:540px;overflow-y:auto;overflow-x:auto">
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
                ${state.conquests.map((c) => {
                  const isCompleted = c.rewardStatus === 'completed';
                  const rewardImg = getRewardImageUrl(c);
                  return `
                    <tr style="cursor:pointer" onclick="window.ProfitCelebration.openConquestDetailModal('${esc(c.id)}')">
                      <td>${esc(M.formatDateBR(c.conquestDate))}</td>
                      <td><strong style="color:#ffffff">${esc(c.ticker)}</strong></td>
                      <td style="color:#34D6AB;font-weight:700">+ ${esc(M.formatMoneyBR(c.realizedAmount))}</td>
                      <td style="color:#34D6AB;font-weight:700">${esc(M.formatMultipleR(c.rMultiple))}</td>
                      <td>
                        ${c.planAdhered === 'yes' ? `
                          <span class="pc-plan-adhered-badge" style="color:#34D6AB">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            <span>Sim</span>
                          </span>
                        ` : (c.planAdhered === 'partial' ? `
                          <span class="pc-plan-adhered-badge" style="color:#F5CD65">
                            <span>⚠ Parcial</span>
                          </span>
                        ` : `
                          <span class="pc-plan-adhered-badge" style="color:#EF4444">
                            <span>✕ Não</span>
                          </span>
                        `)}
                      </td>
                      <td>
                        <div style="display:flex;align-items:center;gap:10px">
                          <img src="${esc(rewardImg)}" class="pc-table-reward-thumb" alt="${esc(c.rewardTitle || 'Recompensa')}" onerror="this.src='assets/rewards/minha-recompensa.png'" />
                          <span style="color:#e2e8f0;font-weight:600">${esc(c.rewardTitle || 'Recompensa pessoal')}</span>
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
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
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
      const mModal = document.getElementById('pcAllMilestonesOverlay');
      if (mModal) mModal.remove();
      const cModal = document.getElementById('pcAllConquestsOverlay');
      if (cModal) cModal.remove();
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

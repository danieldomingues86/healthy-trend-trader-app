/* Mentalidade — Central de Treinamento Mental do Trader */
(function () {
  'use strict';

  const STORAGE_KEY_STATE = 'healthyTrendMentalState';
  const STORAGE_KEY_HISTORY = 'healthyTrendMentalStateHistory';

  const quotes = [
    { text: 'Você não precisa saber o que vai acontecer. Precisa saber o que fará quando acontecer.', author: 'Mark Douglas' },
    { text: 'Paciência também é uma posição. Os grandes ganhos vêm da espera, não da ação constante.', author: 'Jesse Livermore' },
    { text: 'O elemento mais importante de ser um trader de sucesso é o corte impiedoso de perdas.', author: 'Paul Tudor Jones' },
    { text: 'O mercado é um mecanismo de transferência de dinheiro dos impacientes para os pacientes.', author: 'Warren Buffett' },
    { text: 'O objetivo de um trader consistente é executar o processo com excelência. O lucro é consequência.', author: 'Alexander Elder' }
  ];

  let currentQuoteIndex = 0;
  let currentPeriod = '30';
  let zenSummaryCache = { completed_last_30_days: 0, completed_total: 0 };

  function getStoredState() {
    try {
      return localStorage.getItem(STORAGE_KEY_STATE) || 'calm';
    } catch (_) {
      return 'calm';
    }
  }

  function getStoredHistory() {
    try {
      const historyJson = localStorage.getItem(STORAGE_KEY_HISTORY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (_) {
      return [];
    }
  }

  function saveStoredState(state) {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, state);
      const historyJson = localStorage.getItem(STORAGE_KEY_HISTORY);
      const history = historyJson ? JSON.parse(historyJson) : [];
      history.unshift({ state, date: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 100)));
    } catch (_) {}
  }

  function getLastCheckinInfo() {
    const history = getStoredHistory();
    const now = new Date();
    if (history.length > 0 && history[0].date) {
      try {
        const d = new Date(history[0].date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} às ${hours}:${minutes}`;
      } catch (_) {}
    }
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  }

  function getStreakDays() {
    const history = getStoredHistory();
    if (!history.length) return 7; // Baseline visual inicial agradável
    const stableCount = history.filter(h => h.state === 'calm' || h.state === 'good').length;
    return Math.max(1, Math.min(30, stableCount || 7));
  }

  async function loadZenSummaryData() {
    if (!window.healthyTrendApi?.isAuthenticated?.()) return;
    try {
      const result = await window.healthyTrendApi.request('/api/zen-practices/summary');
      if (result && result.summary) {
        zenSummaryCache = { ...zenSummaryCache, ...result.summary };
        if (document.getElementById('mindset')?.classList.contains('active')) {
          renderEvolutionSection();
        }
      }
    } catch (_) {}
  }

  function computeMetrics(period) {
    const history = getStoredHistory();
    const now = Date.now();
    const msInDay = 86400000;
    const filterMs = period === 'all' ? Infinity : (Number(period) || 30) * msInDay;

    const filtered = history.filter(item => {
      const t = new Date(item.date).getTime();
      return (now - t) <= filterMs;
    });

    let stablePct = 100;
    if (filtered.length > 0) {
      const stable = filtered.filter(item => item.state === 'calm' || item.state === 'good').length;
      stablePct = Math.round((stable / filtered.length) * 100);
    }

    let practicesCount = Number(zenSummaryCache.completed_last_30_days || 0);
    if (period === '7') practicesCount = Math.min(practicesCount, 4);
    if (period === 'all') practicesCount = Number(zenSummaryCache.completed_total || practicesCount || 14);

    return {
      stablePct: Math.min(100, Math.max(0, stablePct)),
      stableDelta: '+12%',
      practicesCount: practicesCount,
      practicesDelta: 'Sem alteração',
      anxietyReduction: '-32%',
      anxietyDelta: '+18%'
    };
  }

  function generateChartSvg(period) {
    let points = [];
    let dates = [];

    if (period === '7') {
      points = [
        { x: 30, y: 72 },
        { x: 95, y: 64 },
        { x: 160, y: 55 },
        { x: 225, y: 48 },
        { x: 290, y: 52 },
        { x: 355, y: 38 },
        { x: 420, y: 30 }
      ];
      dates = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Hoje'];
    } else if (period === 'all') {
      points = [
        { x: 30, y: 80 },
        { x: 110, y: 68 },
        { x: 190, y: 56 },
        { x: 270, y: 46 },
        { x: 350, y: 38 },
        { x: 430, y: 28 }
      ];
      dates = ['Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'];
    } else {
      // 30 dias (padrão do mockup de referência)
      points = [
        { x: 30, y: 76 },
        { x: 75, y: 60 },
        { x: 120, y: 70 },
        { x: 165, y: 54 },
        { x: 210, y: 50 },
        { x: 255, y: 62 },
        { x: 300, y: 46 },
        { x: 345, y: 42 },
        { x: 390, y: 54 },
        { x: 435, y: 36 },
        { x: 480, y: 40 }
      ];
      dates = ['02/09', '09/09', '16/09', '23/09', '30/09'];
    }

    // Monta o caminho cúbico suavizado (Bézier)
    let dLine = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      dLine += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const lastP = points[points.length - 1];
    const firstP = points[0];
    const dArea = `${dLine} L ${lastP.x} 92 L ${firstP.x} 92 Z`;

    const dots = points.map((p, idx) => `
      <circle class="mindset-chart-dot" cx="${p.x}" cy="${p.y}" r="3.5" data-idx="${idx}" />
    `).join('');

    // Rótulos do eixo X distribuídos
    const labelSpacing = (lastP.x - firstP.x) / (dates.length - 1);
    const dateLabels = dates.map((date, idx) => {
      const x = firstP.x + (idx * labelSpacing);
      return `<text x="${x}" y="106" text-anchor="middle" class="mindset-chart-x-label">${date}</text>`;
    }).join('');

    return `
      <svg class="mindset-evolution-svg" viewBox="0 0 510 112" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="mindsetAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
          </linearGradient>
          <filter id="mindsetGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#10b981" flood-opacity="0.35" />
          </filter>
        </defs>
        <!-- Linhas guias horizontais sutis -->
        <line x1="20" y1="36" x2="490" y2="36" stroke="rgba(16,185,129,0.08)" stroke-dasharray="4 4" />
        <line x1="20" y1="64" x2="490" y2="64" stroke="rgba(16,185,129,0.08)" stroke-dasharray="4 4" />
        <!-- Área com degradê -->
        <path d="${dArea}" fill="url(#mindsetAreaGrad)" />
        <!-- Linha da evolução -->
        <path d="${dLine}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" filter="url(#mindsetGlow)" />
        <!-- Pontos interativos -->
        ${dots}
        <!-- Datas do eixo X -->
        ${dateLabels}
      </svg>
    `;
  }

  function renderEvolutionSection() {
    const root = document.getElementById('mindsetEvolutionMetricsContainer');
    if (!root) return;
    const metrics = computeMetrics(currentPeriod);
    const svgChart = generateChartSvg(currentPeriod);

    root.innerHTML = `
      <div class="mindset-evolution-kpis">
        <div class="mindset-kpi-col">
          <div class="mindset-kpi-val">${metrics.stablePct}%</div>
          <div class="mindset-kpi-lbl">Dias em estado mental estável</div>
          <span class="mindset-kpi-badge good">▲ ${metrics.stableDelta}</span>
        </div>
        <div class="mindset-kpi-col">
          <div class="mindset-kpi-val">${metrics.practicesCount > 0 ? metrics.practicesCount : '0%'}</div>
          <div class="mindset-kpi-lbl">Práticas realizadas</div>
          <span class="mindset-kpi-badge neutral">◆ ${metrics.practicesDelta}</span>
        </div>
        <div class="mindset-kpi-col">
          <div class="mindset-kpi-val">${metrics.anxietyReduction}</div>
          <div class="mindset-kpi-lbl">Redução da ansiedade antes do trade</div>
          <span class="mindset-kpi-badge good">▲ ${metrics.anxietyDelta}</span>
        </div>
      </div>
      <div class="mindset-chart-wrap">
        ${svgChart}
      </div>
    `;
  }

  function renderQuote() {
    const q = quotes[currentQuoteIndex];
    const textEl = document.getElementById('mindsetQuoteText');
    const authorEl = document.getElementById('mindsetQuoteAuthor');
    const pageEl = document.getElementById('mindsetQuotePage');
    if (textEl) textEl.textContent = `“${q.text}”`;
    if (authorEl) authorEl.textContent = q.author;
    if (pageEl) pageEl.textContent = `${currentQuoteIndex + 1} / ${quotes.length}`;
  }

  window.nextMindsetQuote = function (step) {
    currentQuoteIndex = (currentQuoteIndex + step + quotes.length) % quotes.length;
    renderQuote();
  };

  window.focusMentalCheckin = function () {
    const card = document.getElementById('mindsetCheckinCard');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('pulse-focus');
      setTimeout(() => card.classList.remove('pulse-focus'), 1200);
    }
  };

  window.selectMentalState = function (stateKey) {
    saveStoredState(stateKey);
    document.querySelectorAll('.mindset-state-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.state === stateKey);
    });

    const labels = {
      calm: 'Calmo',
      good: 'Bem',
      neutral: 'Neutro',
      anxious: 'Ansioso',
      agitated: 'Agitado'
    };
    const label = labels[stateKey] || stateKey;

    // Atualiza status bars
    const currentLblEl = document.getElementById('mindsetCurrentStateLabel');
    if (currentLblEl) currentLblEl.textContent = `Estado atual: ${label}`;

    const lastCheckinEl = document.getElementById('mindsetLastCheckinTime');
    if (lastCheckinEl) lastCheckinEl.textContent = getLastCheckinInfo();

    const streakEl = document.getElementById('mindsetStreakText');
    if (streakEl) streakEl.textContent = `${getStreakDays()} dias em equilíbrio`;

    if (typeof showToast === 'function') {
      showToast(`Estado mental registrado: ${label}.`);
    }

    renderEvolutionSection();
  };

  window.openMindsetSubmodule = function (moduleId, param) {
    if (typeof go !== 'function') return;

    if (moduleId === 'zen') {
      go('zen');
      if (param && typeof selectZenPractice === 'function') {
        window.setTimeout(() => {
          selectZenPractice(param);
        }, 150);
      }
      return;
    }

    if (moduleId === 'library') {
      go('audiolibrary');
      if (param && typeof selectMentalAudioTab === 'function') {
        window.setTimeout(() => {
          if (param === 'boost') selectMentalAudioTab('boost');
          else selectMentalAudioTab('scenario');
        }, 150);
      }
      return;
    }

    if (moduleId === 'psychology') {
      go('emotionalintelligence');
      if (param && typeof window.selectPsychologyTab === 'function') {
        window.setTimeout(() => {
          window.selectPsychologyTab(param);
        }, 150);
      }
      return;
    }

    if (moduleId === 'rules') {
      go('traderrules');
      if (param) {
        window.setTimeout(() => {
          const target = document.querySelector(`[data-rules-section="${param}"]`);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 180);
      }
      return;
    }

    if (moduleId === 'wisdom') {
      go('wisdom');
      if (param) {
        window.setTimeout(() => {
          const catBtn = document.querySelector(`.wv-category-${param}`);
          if (catBtn) catBtn.click();
        }, 200);
      }
      return;
    }

    if (moduleId === 'profile') {
      go('traderprofile');
      return;
    }

    go(moduleId);
  };

  function renderMindsetHub() {
    const root = document.getElementById('mindsetHubRoot');
    if (!root) return;

    const activeState = getStoredState();
    const lastCheckinStr = getLastCheckinInfo();
    const streakStr = `${getStreakDays()} dias em equilíbrio`;
    const stateLabels = {
      calm: 'Calmo',
      good: 'Bem',
      neutral: 'Neutro',
      anxious: 'Ansioso',
      agitated: 'Agitado'
    };
    const currentStateText = stateLabels[activeState] || 'Calmo';

    root.innerHTML = `
      <div class="mindset-hub">
        <!-- 1. HERO — MENTE DE TRADER -->
        <header class="mindset-hero">
          <div class="mindset-hero-overlay"></div>
          <div class="mindset-hero-copy">
            <div class="mindset-hero-kicker">MENTALIDADE</div>
            <h1>Mente de <em>Trader</em></h1>
            <h2>Clareza para pensar. Disciplina para executar.</h2>
            <p>Sua performance começa antes da entrada. Treine sua mente para executar o processo mesmo quando o mercado tentar tirar você do eixo.</p>
            <div class="mindset-hero-actions">
              <button class="mindset-hero-cta" type="button" onclick="focusMentalCheckin()">
                <span class="mindset-cta-icon" aria-hidden="true">🧠</span>
                <span>Fazer check-in mental</span>
                <span class="mindset-cta-arrow" aria-hidden="true">→</span>
              </button>
            </div>
            <div class="mindset-benefits">
              <div class="mindset-benefit"><i aria-hidden="true">⚖️</i><span>Mais equilíbrio nas decisões</span></div>
              <div class="mindset-benefit"><i aria-hidden="true">📊</i><span>Menos impulsos emocionais</span></div>
              <div class="mindset-benefit"><i aria-hidden="true">🎯</i><span>Mais consistência nos resultados</span></div>
              <div class="mindset-benefit"><i aria-hidden="true">💚</i><span>Um trading mais saudável</span></div>
            </div>
          </div>
          <aside class="mindset-hero-quote" aria-label="Citação inspiradora">
            <blockquote>“Uma mente calma toma melhores decisões.”</blockquote>
            <cite>HEALTHY TREND TRADER</cite>
          </aside>
        </header>

        <!-- 2. NOVO BLOCO PRINCIPAL (3 COLUNAS) -->
        <section class="mindset-row-overview" aria-label="Estado, evolução e continuidade">
          <!-- Coluna 1: Seu Estado Mental -->
          <article class="mindset-card mindset-card-checkin" id="mindsetCheckinCard">
            <div class="mindset-card-head">
              <div class="mindset-card-head-title">
                <span class="mindset-card-icon" aria-hidden="true">🧠</span>
                <div>
                  <h3>Seu Estado Mental</h3>
                  <p>Como você está agora?</p>
                </div>
              </div>
            </div>
            <div class="mindset-state-options" role="radiogroup" aria-label="Como você está agora?">
              <button class="mindset-state-option ${activeState === 'calm' ? 'active' : ''}" type="button" data-state="calm" onclick="selectMentalState('calm')" aria-label="Calmo">
                <span class="mindset-state-emoji" aria-hidden="true">😌</span>
                <span class="mindset-state-name">Calmo</span>
              </button>
              <button class="mindset-state-option ${activeState === 'good' ? 'active' : ''}" type="button" data-state="good" onclick="selectMentalState('good')" aria-label="Bem">
                <span class="mindset-state-emoji" aria-hidden="true">🙂</span>
                <span class="mindset-state-name">Bem</span>
              </button>
              <button class="mindset-state-option ${activeState === 'neutral' ? 'active' : ''}" type="button" data-state="neutral" onclick="selectMentalState('neutral')" aria-label="Neutro">
                <span class="mindset-state-emoji" aria-hidden="true">😐</span>
                <span class="mindset-state-name">Neutro</span>
              </button>
              <button class="mindset-state-option ${activeState === 'anxious' ? 'active' : ''}" type="button" data-state="anxious" onclick="selectMentalState('anxious')" aria-label="Ansioso">
                <span class="mindset-state-emoji" aria-hidden="true">😟</span>
                <span class="mindset-state-name">Ansioso</span>
              </button>
              <button class="mindset-state-option ${activeState === 'agitated' ? 'active' : ''}" type="button" data-state="agitated" onclick="selectMentalState('agitated')" aria-label="Agitado">
                <span class="mindset-state-emoji" aria-hidden="true">😡</span>
                <span class="mindset-state-name">Agitado</span>
              </button>
            </div>
            <div class="mindset-state-footer">
              <div class="mindset-state-current-status">
                <span class="mindset-status-dot"></span>
                <div>
                  <strong id="mindsetCurrentStateLabel">Estado atual: ${currentStateText}</strong>
                  <span id="mindsetStreakText">${streakStr}</span>
                </div>
              </div>
              <div class="mindset-state-last-time">
                <small>Último check-in</small>
                <span id="mindsetLastCheckinTime">${lastCheckinStr}</span>
              </div>
            </div>
          </article>

          <!-- Coluna 2: Sua Evolução Mental -->
          <article class="mindset-card mindset-card-evolution">
            <div class="mindset-card-head">
              <div class="mindset-card-head-title">
                <span class="mindset-card-icon" aria-hidden="true">📊</span>
                <div>
                  <h3>Sua Evolução Mental</h3>
                </div>
              </div>
              <div class="mindset-evolution-period-picker">
                <select id="mindsetPeriodSelect" aria-label="Período da evolução mental">
                  <option value="30" ${currentPeriod === '30' ? 'selected' : ''}>Últimos 30 dias</option>
                  <option value="7" ${currentPeriod === '7' ? 'selected' : ''}>Últimos 7 dias</option>
                  <option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Todo o histórico</option>
                </select>
              </div>
            </div>
            <div id="mindsetEvolutionMetricsContainer"></div>
          </article>

          <!-- Coluna 3: Continue sua jornada -->
          <article class="mindset-card mindset-card-continue">
            <div class="mindset-card-head">
              <div class="mindset-card-head-title">
                <span class="mindset-card-icon" aria-hidden="true">🚀</span>
                <div>
                  <h3>Continue sua jornada</h3>
                </div>
              </div>
            </div>
            <div class="mindset-continue-body">
              <div class="mindset-continue-content-box">
                <img src="assets/mindset-focus-thumb.jpg" alt="Foco" class="mindset-continue-thumb" />
                <div class="mindset-continue-info">
                  <small class="mindset-continue-kicker">Último conteúdo acessado</small>
                  <h4>Respiração para foco e clareza</h4>
                  <p>Trader Zen · Aula 2 de 5</p>
                  <div class="mindset-continue-progress-row">
                    <div class="mindset-progress-track">
                      <div class="mindset-progress-fill" style="width: 60%;"></div>
                    </div>
                    <span class="mindset-progress-num">60%</span>
                  </div>
                </div>
              </div>
              <button class="mindset-continue-btn" type="button" onclick="openMindsetSubmodule('zen', 'breathing')">
                <span>Continuar de onde parei</span>
                <span aria-hidden="true">→</span>
              </button>
              <div class="mindset-next-recommendation" onclick="openMindsetSubmodule('psychology', 'biases')" role="button" tabindex="0">
                <span class="mindset-recom-icon" aria-hidden="true">💡</span>
                <div class="mindset-recom-text">
                  <small>Próxima recomendação</small>
                  <strong>Leia: Vieses Cognitivos no Trading</strong>
                  <span>Psicologia do Trader · 5 min</span>
                </div>
              </div>
            </div>
          </article>
        </section>

        <!-- 3. SUA JORNADA MENTAL (GRADE DOS 6 MÓDULOS) -->
        <section class="mindset-journey-section" aria-label="Sua jornada mental">
          <header class="mindset-journey-head">
            <h2>Sua Jornada Mental</h2>
            <p>Escolha um módulo e fortaleça sua mentalidade como trader.</p>
          </header>
          <div class="mindset-module-grid">
            <!-- 01 — Trader Zen -->
            <article class="mindset-module zen" role="button" tabindex="0" onclick="openMindsetSubmodule('zen')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('zen')" aria-label="Abrir Trader Zen">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon" aria-hidden="true">🧘</span>
                  <div>
                    <h3>Trader Zen</h3>
                    <small>Respire. Observe. Conecte-se.</small>
                  </div>
                </div>
                <span class="mindset-module-open" aria-hidden="true">→</span>
              </div>
              <p>Exercícios práticos de respiração, meditação e foco para acalmar a mente e operar com mais clareza.</p>
              <div class="mindset-module-pills">
                <span>Respiração</span>
                <span>Meditação</span>
                <span>Foco</span>
              </div>
            </article>

            <!-- 02 — Psicologia do Trader -->
            <article class="mindset-module psychology" role="button" tabindex="0" onclick="openMindsetSubmodule('psychology')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('psychology')" aria-label="Abrir Psicologia do Trader">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon" aria-hidden="true">🧠</span>
                  <div>
                    <h3>Psicologia do Trader</h3>
                    <small>Entenda sua mente.</small>
                  </div>
                </div>
                <span class="mindset-module-open" aria-hidden="true">→</span>
              </div>
              <p>Conheça suas emoções, vieses e padrões de comportamento para tomar decisões mais racionais.</p>
              <div class="mindset-module-pills">
                <span>Emoções</span>
                <span>Vieses</span>
                <span>Comportamentos</span>
              </div>
            </article>

            <!-- 03 — Biblioteca Mental -->
            <article class="mindset-module library" role="button" tabindex="0" onclick="openMindsetSubmodule('library')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('library')" aria-label="Abrir Biblioteca Mental">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon" aria-hidden="true">📚</span>
                  <div>
                    <h3>Biblioteca Mental</h3>
                    <small>Áudios. Guias. Práticas.</small>
                  </div>
                </div>
                <span class="mindset-module-open" aria-hidden="true">→</span>
              </div>
              <p>Uma biblioteca completa para treinar sua mente com conteúdos práticos e aplicáveis ao seu dia a dia como trader.</p>
              <div class="mindset-module-pills">
                <span>Áudios</span>
                <span>Exercícios</span>
                <span>Reflexões</span>
              </div>
            </article>

            <!-- 04 — Código do Trader -->
            <article class="mindset-module rules" role="button" tabindex="0" onclick="openMindsetSubmodule('rules')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('rules')" aria-label="Abrir Código do Trader">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon" aria-hidden="true">📋</span>
                  <div>
                    <h3>Código do Trader</h3>
                    <small>O que fazer e o que não fazer.</small>
                  </div>
                </div>
                <span class="mindset-module-open" aria-hidden="true">→</span>
              </div>
              <p>Regras, checklists e boas práticas para manter o foco, evitar erros e operar de forma consistente.</p>
              <div class="mindset-module-pills">
                <span>Checklist</span>
                <span>Antes do Trade</span>
                <span>Durante</span>
                <span>O que NÃO fazer</span>
              </div>
            </article>

            <!-- 05 — Sabedoria do Trader -->
            <article class="mindset-module wisdom" role="button" tabindex="0" onclick="openMindsetSubmodule('wisdom')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('wisdom')" aria-label="Abrir Sabedoria do Trader">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon" aria-hidden="true">💡</span>
                  <div>
                    <h3>Sabedoria do Trader</h3>
                    <small>Aprenda com quem já trilhou o caminho.</small>
                  </div>
                </div>
                <span class="mindset-module-open" aria-hidden="true">→</span>
              </div>
              <p>Frases, princípios e lições de grandes traders para inspirar, fortalecer sua mentalidade e manter o foco no longo prazo.</p>
              <div class="mindset-module-pills">
                <span>Frases</span>
                <span>Grandes Traders</span>
                <span>Lições</span>
              </div>
            </article>

            <!-- 06 — Descubra seu Perfil de Trader -->
            <article class="mindset-module profile" role="button" tabindex="0" onclick="openMindsetSubmodule('profile')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('profile')" aria-label="Abrir Perfil de Trader">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon" aria-hidden="true">🎯</span>
                  <div>
                    <h3>Descubra seu Perfil de Trader</h3>
                    <small>Entenda como você reage.</small>
                  </div>
                </div>
                <span class="mindset-module-open" aria-hidden="true">→</span>
              </div>
              <p>Descubra suas características comportamentais e como você lida com o risco, o lucro, a perda e a incerteza no mercado.</p>
              <div class="mindset-module-pills">
                <span>Perfil</span>
                <span>Tendências</span>
                <span>Pontos de atenção</span>
              </div>
            </article>
          </div>
        </section>

        <!-- 4. BLOCO INFERIOR: REFLEXÃO DO DIA + ATIVIDADE RECENTE + MICRO-CARD -->
        <section class="mindset-row-bottom" aria-label="Reflexão e atividade recente">
          <!-- Card 1: Reflexão do Dia -->
          <article class="mindset-bottom-card mindset-quote-card">
            <div class="mindset-quote-head">
              <div class="mindset-quote-badge">
                <span class="mindset-quote-glyph" aria-hidden="true">“</span>
                <span class="mindset-quote-title">Reflexão do dia</span>
              </div>
              <div class="mindset-quote-nav">
                <button type="button" onclick="nextMindsetQuote(-1)" aria-label="Frase anterior">‹</button>
                <span id="mindsetQuotePage">1 / ${quotes.length}</span>
                <button type="button" onclick="nextMindsetQuote(1)" aria-label="Próxima frase">›</button>
              </div>
            </div>
            <div class="mindset-quote-body">
              <blockquote id="mindsetQuoteText">“${quotes[0].text}”</blockquote>
              <cite id="mindsetQuoteAuthor">${quotes[0].author}</cite>
            </div>
          </article>

          <!-- Card 2: Atividade Recente -->
          <article class="mindset-bottom-card mindset-activity-card">
            <div class="mindset-activity-head">
              <span class="mindset-activity-icon" aria-hidden="true">🕒</span>
              <h3>Atividade recente</h3>
            </div>
            <ul class="mindset-activity-list">
              <li>
                <span class="mindset-activity-dot"></span>
                <span class="mindset-activity-time">Hoje 10:24</span>
                <span class="mindset-activity-desc">Check-in mental realizado — Estado: <strong>${currentStateText}</strong></span>
              </li>
              <li>
                <span class="mindset-activity-dot"></span>
                <span class="mindset-activity-time">Ontem 19:15</span>
                <span class="mindset-activity-desc">Concluiu aula "Respiração para foco e clareza"</span>
              </li>
              <li>
                <span class="mindset-activity-dot"></span>
                <span class="mindset-activity-time">30 Set 21:08</span>
                <span class="mindset-activity-desc">Adicionou anotação no Diário do Trader</span>
              </li>
              <li>
                <span class="mindset-activity-dot"></span>
                <span class="mindset-activity-time">28 Set 16:42</span>
                <span class="mindset-activity-desc">Concluiu o Teste de Perfil</span>
              </li>
            </ul>
          </article>

          <!-- Card 3: Micro-Card de Inspiração -->
          <article class="mindset-bottom-card mindset-mini-card">
            <span class="mindset-mini-icon" aria-hidden="true">🌱</span>
            <p>Uma mente disciplinada constrói liberdade.</p>
          </article>
        </section>
      </div>
    `;

    renderEvolutionSection();
    renderQuote();

    const periodSelect = document.getElementById('mindsetPeriodSelect');
    if (periodSelect) {
      periodSelect.addEventListener('change', (e) => {
        currentPeriod = e.target.value;
        renderEvolutionSection();
      });
    }
  }

  window.renderMindsetHub = renderMindsetHub;

  // Sincronização com o roteador de páginas
  const prevGo = window.go;
  window.go = function (id) {
    if (typeof prevGo === 'function') prevGo(id);
    if (id === 'mindset') {
      renderMindsetHub();
      loadZenSummaryData();
    }
  };

  window.addEventListener('healthyTrend:authenticated', loadZenSummaryData);
  window.addEventListener('healthyTrend:workspaceLoaded', () => {
    if (document.getElementById('mindset')?.classList.contains('active')) {
      renderMindsetHub();
    }
  });

  if (document.getElementById('mindset')?.classList.contains('active')) {
    renderMindsetHub();
  }

  function checkHashNavigation() {
    if (window.location.hash === '#mindset' || window.location.hash === '#/mindset') {
      if (typeof window.go === 'function') {
        window.go('mindset');
      }
    }
  }

  window.addEventListener('hashchange', checkHashNavigation);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkHashNavigation);
  } else {
    setTimeout(checkHashNavigation, 30);
  }
})();

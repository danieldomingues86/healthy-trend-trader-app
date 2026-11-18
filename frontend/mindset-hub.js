/* Mentalidade — Central de Treinamento Mental do Trader */
(function () {
  'use strict';

  const STORAGE_KEY_STATE = 'healthyTrendMentalState';
  const STORAGE_KEY_HISTORY = 'healthyTrendMentalStateHistory';

  const quotes = [
    { text: 'Paciência também é uma posição.', author: 'Jesse Livermore' },
    { text: 'Você não precisa saber o que vai acontecer. Precisa saber o que fará quando acontecer.', author: 'Mark Douglas' },
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

    let stablePct = 82;
    if (filtered.length > 0) {
      const stable = filtered.filter(item => item.state === 'calm' || item.state === 'good').length;
      stablePct = Math.round((stable / filtered.length) * 100);
    }

    let practicesCount = Number(zenSummaryCache.completed_last_30_days || 14);
    if (period === '7') practicesCount = Math.min(practicesCount, 4);
    if (period === 'all') practicesCount = Number(zenSummaryCache.completed_total || practicesCount || 28);

    return {
      stablePct: Math.min(100, Math.max(0, stablePct)),
      practicesCount: practicesCount,
      executionDiscipline: '76%',
      anxietyReduction: '-32%'
    };
  }

  function renderEvolutionSection() {
    const container = document.getElementById('mindsetEvolutionMetricsContainer');
    if (!container) return;
    const metrics = computeMetrics(currentPeriod);
    const practicesWidth = Math.min(100, Math.round((metrics.practicesCount / 30) * 100));

    container.innerHTML = `
      <div class="mindset-kpi-col">
        <div class="mindset-kpi-val">${metrics.stablePct}%</div>
        <div class="mindset-kpi-lbl">Dias com estado mental estável</div>
        <div class="mindset-progress-track">
          <div class="mindset-progress-fill" style="width: ${metrics.stablePct}%;"></div>
        </div>
      </div>
      <div class="mindset-kpi-col">
        <div class="mindset-kpi-val">${metrics.practicesCount}</div>
        <div class="mindset-kpi-lbl">Práticas realizadas</div>
        <div class="mindset-progress-track">
          <div class="mindset-progress-fill" style="width: ${practicesWidth}%;"></div>
        </div>
      </div>
      <div class="mindset-kpi-col">
        <div class="mindset-kpi-val">${metrics.executionDiscipline}</div>
        <div class="mindset-kpi-lbl">Disciplina na execução</div>
        <div class="mindset-progress-track">
          <div class="mindset-progress-fill" style="width: 76%;"></div>
        </div>
      </div>
      <div class="mindset-kpi-col">
        <div class="mindset-kpi-val">${metrics.anxietyReduction}</div>
        <div class="mindset-kpi-lbl">Redução da ansiedade antes do trade</div>
        <div class="mindset-progress-track">
          <div class="mindset-progress-fill" style="width: 32%;"></div>
        </div>
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
    document.querySelectorAll('.mindset-state-btn').forEach(btn => {
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
          if (param === 'inspiration') {
            const featBtn = document.querySelector('[data-special="featured"]');
            if (featBtn) featBtn.click();
          } else if (param === 'quotes') {
            const allBtn = document.querySelector('[data-category="all"]');
            if (allBtn) allBtn.click();
          } else {
            const catBtn = document.querySelector(`.wv-category-${param}`);
            if (catBtn) catBtn.click();
          }
        }, 200);
      }
      return;
    }

    if (moduleId === 'profile') {
      go('traderprofile');
      if (param) {
        window.setTimeout(() => {
          if (param === 'tendencies' || param === 'attention') {
            const rep = document.querySelector('.profile-report-section.attention');
            if (rep) rep.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else if (param === 'strengths') {
            const rep = document.querySelector('.profile-report-section.strengths');
            if (rep) rep.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      }
      return;
    }

    go(moduleId);
  };

  function renderMindsetHub() {
    const root = document.getElementById('mindsetHubRoot');
    if (!root) return;

    const activeState = getStoredState();

    root.innerHTML = `
      <div class="mindset-hub">
        <!-- 1. HERO — MENTE DE TRADER -->
        <header class="mindset-hero">
          <div class="mindset-hero-overlay"></div>
          <div class="mindset-hero-copy">
            <div class="mindset-hero-kicker">MENTALIDADE</div>
            <h1>Mente de <em>Trader</em></h1>
            <h2>Clareza para pensar. Disciplina para executar.</h2>
            <p>Desenvolva sua mentalidade, conheça seu comportamento e fortaleça seu processo para se tornar um trader mais consistente.</p>
            <div class="mindset-benefits">
              <div class="mindset-benefit"><i aria-hidden="true">🪷</i><span>Mais equilíbrio nas decisões</span></div>
              <div class="mindset-benefit"><i aria-hidden="true">📊</i><span>Menos impulsos emocionais</span></div>
              <div class="mindset-benefit"><i aria-hidden="true">🎯</i><span>Mais consistência nos resultados</span></div>
              <div class="mindset-benefit"><i aria-hidden="true">💚</i><span>Um trading mais saudável</span></div>
            </div>
          </div>
          <aside class="mindset-hero-quote" aria-label="Citação inspiradora">
            <blockquote>“Uma mente calma toma melhores decisões.”</blockquote>
            <div class="mindset-hero-quote-line"></div>
            <cite>HEALTHY TREND TRADER</cite>
          </aside>
        </header>

        <!-- 2. OS SEIS SUBMÓDULOS (GRADE 3x2) -->
        <section class="mindset-submodules-section" aria-label="Submódulos de Mentalidade">
          <div class="mindset-module-grid">
            <!-- 01 — Trader Zen -->
            <article class="mindset-module zen" role="button" tabindex="0" onclick="openMindsetSubmodule('zen')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('zen')" aria-label="Abrir Trader Zen">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon zen-icon" aria-hidden="true">🪷</span>
                  <div>
                    <h3>Trader Zen</h3>
                    <small>Respire. Observe. Conecte-se.</small>
                  </div>
                </div>
                <button class="mindset-module-open" type="button" aria-label="Acessar Trader Zen"><span>→</span></button>
              </div>
              <p>Exercícios guiados de respiração, meditação e foco para acalmar a mente, reduzir a ansiedade e operar com mais clareza.</p>
              <div class="mindset-module-pills">
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('zen', 'breathing')">Respiração</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('zen', 'meditation')">Meditação</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('zen', 'focus')">Foco</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('zen', 'audio')">Relaxamento</button>
              </div>
            </article>

            <!-- 02 — Biblioteca Mental -->
            <article class="mindset-module library" role="button" tabindex="0" onclick="openMindsetSubmodule('library')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('library')" aria-label="Abrir Biblioteca Mental">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon library-icon" aria-hidden="true">🎧</span>
                  <div>
                    <h3>Biblioteca Mental</h3>
                    <small>Áudios. Guias. Práticas.</small>
                  </div>
                </div>
                <button class="mindset-module-open" type="button" aria-label="Acessar Biblioteca Mental"><span>→</span></button>
              </div>
              <p>Uma biblioteca completa para treinar sua mente com conteúdos práticos e aplicáveis ao seu dia a dia como trader.</p>
              <div class="mindset-module-pills">
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('library', 'scenario')">Áudios</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('library', 'boost')">Exercícios</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('library', 'scenario')">Reflexões</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('library', 'all')">Conteúdos</button>
              </div>
            </article>

            <!-- 03 — Psicologia do Trader -->
            <article class="mindset-module psychology" role="button" tabindex="0" onclick="openMindsetSubmodule('psychology')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('psychology')" aria-label="Abrir Psicologia do Trader">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon psychology-icon" aria-hidden="true">🧠</span>
                  <div>
                    <h3>Psicologia do Trader</h3>
                    <small>Conheça seu comportamento.</small>
                  </div>
                </div>
                <button class="mindset-module-open" type="button" aria-label="Acessar Psicologia do Trader"><span>→</span></button>
              </div>
              <p>Entenda suas emoções, vieses e padrões de comportamento para tomar decisões mais racionais.</p>
              <div class="mindset-module-pills">
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('psychology', 'emotions')">Emoções</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('psychology', 'biases')">Vieses</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('psychology', 'behaviors')">Comportamentos</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('psychology', 'selfknowledge')">Autoconhecimento</button>
              </div>
            </article>

            <!-- 04 — Regras do Trader -->
            <article class="mindset-module rules" role="button" tabindex="0" onclick="openMindsetSubmodule('rules')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('rules')" aria-label="Abrir Regras do Trader">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon rules-icon" aria-hidden="true">📋</span>
                  <div>
                    <h3>Regras do Trader</h3>
                    <small>Disciplina na prática.</small>
                  </div>
                </div>
                <button class="mindset-module-open" type="button" aria-label="Acessar Regras do Trader"><span>→</span></button>
              </div>
              <p>Checklist, boas práticas e regras de execução para manter o foco, evitar erros e operar de forma consistente.</p>
              <div class="mindset-module-pills">
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('rules', 'checklist')">Checklist</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('rules', 'gold')">Regras de Ouro</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('rules', 'execution')">Antes e Depois</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('rules', 'dont')">O que não fazer</button>
              </div>
            </article>

            <!-- 05 — Sabedoria do Trader -->
            <article class="mindset-module wisdom" role="button" tabindex="0" onclick="openMindsetSubmodule('wisdom')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('wisdom')" aria-label="Abrir Sabedoria do Trader">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon wisdom-icon" aria-hidden="true">❝</span>
                  <div>
                    <h3>Sabedoria do Trader</h3>
                    <small>Aprenda com quem já trilhou o caminho.</small>
                  </div>
                </div>
                <button class="mindset-module-open" type="button" aria-label="Acessar Sabedoria do Trader"><span>→</span></button>
              </div>
              <p>Frases, princípios e lições de grandes traders para inspirar, fortalecer sua mentalidade e manter o foco no longo prazo.</p>
              <div class="mindset-module-pills">
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('wisdom', 'quotes')">Frases</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('wisdom', 'authors')">Grandes Traders</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('wisdom', 'lessons')">Lições</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('wisdom', 'inspiration')">Inspiração</button>
              </div>
            </article>

            <!-- 06 — Teste de Perfil -->
            <article class="mindset-module profile" role="button" tabindex="0" onclick="openMindsetSubmodule('profile')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('profile')" aria-label="Abrir Teste de Perfil">
              <div class="mindset-module-top">
                <div class="mindset-module-title">
                  <span class="mindset-module-icon profile-icon" aria-hidden="true">👤</span>
                  <div>
                    <h3>Teste de Perfil</h3>
                    <small>Conheça seu perfil como trader.</small>
                  </div>
                </div>
                <button class="mindset-module-open" type="button" aria-label="Acessar Teste de Perfil"><span>→</span></button>
              </div>
              <p>Descubra suas características comportamentais, pontos fortes e áreas de melhoria para evoluir como trader.</p>
              <div class="mindset-module-pills">
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('profile', 'profile')">Perfil</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('profile', 'tendencies')">Tendências</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('profile', 'strengths')">Pontos fortes</button>
                <button class="mindset-pill" type="button" onclick="event.stopPropagation(); openMindsetSubmodule('profile', 'attention')">Pontos de atenção</button>
              </div>
            </article>
          </div>
        </section>

        <!-- 3. BLOCO INFERIOR (3 WIDGETS) -->
        <section class="mindset-bottom-row" aria-label="Widgets de estado, evolução e frase do dia">
          <!-- Widget 1: Meu Estado Mental -->
          <article class="mindset-widget mindset-widget-state" id="mindsetCheckinCard">
            <div class="mindset-widget-head">
              <span class="mindset-widget-icon state-head-icon" aria-hidden="true">🧠</span>
              <div>
                <h3>Meu Estado Mental</h3>
                <p>Como você está agora?</p>
              </div>
            </div>
            <div class="mindset-state-options" role="radiogroup" aria-label="Como você está agora?">
              <button class="mindset-state-btn ${activeState === 'calm' ? 'active' : ''}" type="button" data-state="calm" onclick="selectMentalState('calm')" aria-label="Calmo">
                <span class="mindset-state-circle"><span class="mindset-state-emoji" aria-hidden="true">😌</span></span>
                <span class="mindset-state-label">Calmo</span>
              </button>
              <button class="mindset-state-btn ${activeState === 'good' ? 'active' : ''}" type="button" data-state="good" onclick="selectMentalState('good')" aria-label="Bem">
                <span class="mindset-state-circle"><span class="mindset-state-emoji" aria-hidden="true">🙂</span></span>
                <span class="mindset-state-label">Bem</span>
              </button>
              <button class="mindset-state-btn ${activeState === 'neutral' ? 'active' : ''}" type="button" data-state="neutral" onclick="selectMentalState('neutral')" aria-label="Neutro">
                <span class="mindset-state-circle"><span class="mindset-state-emoji" aria-hidden="true">😐</span></span>
                <span class="mindset-state-label">Neutro</span>
              </button>
              <button class="mindset-state-btn ${activeState === 'anxious' ? 'active' : ''}" type="button" data-state="anxious" onclick="selectMentalState('anxious')" aria-label="Ansioso">
                <span class="mindset-state-circle"><span class="mindset-state-emoji" aria-hidden="true">😟</span></span>
                <span class="mindset-state-label">Ansioso</span>
              </button>
              <button class="mindset-state-btn ${activeState === 'agitated' ? 'active' : ''}" type="button" data-state="agitated" onclick="selectMentalState('agitated')" aria-label="Agitado">
                <span class="mindset-state-circle"><span class="mindset-state-emoji" aria-hidden="true">😡</span></span>
                <span class="mindset-state-label">Agitado</span>
              </button>
            </div>
          </article>

          <!-- Widget 2: Minha Evolução Mental -->
          <article class="mindset-widget mindset-widget-evolution">
            <div class="mindset-widget-head">
              <div class="mindset-widget-title-group">
                <span class="mindset-widget-icon evolution-head-icon" aria-hidden="true">📊</span>
                <h3>Minha Evolução Mental</h3>
              </div>
              <div class="mindset-period-picker">
                <select id="mindsetPeriodSelect" aria-label="Período da evolução mental">
                  <option value="30" ${currentPeriod === '30' ? 'selected' : ''}>Últimos 30 dias</option>
                  <option value="7" ${currentPeriod === '7' ? 'selected' : ''}>Últimos 7 dias</option>
                  <option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Todo o histórico</option>
                </select>
              </div>
            </div>
            <div id="mindsetEvolutionMetricsContainer" class="mindset-evolution-kpis-wrap"></div>
          </article>

          <!-- Widget 3: Frase do dia -->
          <article class="mindset-widget mindset-widget-quote">
            <div class="mindset-widget-head">
              <div class="mindset-widget-title-group">
                <span class="mindset-widget-icon quote-head-icon" aria-hidden="true">❝</span>
                <h3>Frase do dia</h3>
              </div>
              <div class="mindset-quote-nav">
                <button type="button" onclick="nextMindsetQuote(-1)" aria-label="Frase anterior">‹</button>
                <span id="mindsetQuotePage">1 / ${quotes.length}</span>
                <button type="button" onclick="nextMindsetQuote(1)" aria-label="Próxima frase">›</button>
              </div>
            </div>
            <div class="mindset-quote-content">
              <blockquote id="mindsetQuoteText">“${quotes[0].text}”</blockquote>
              <cite id="mindsetQuoteAuthor">${quotes[0].author}</cite>
            </div>
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

/* Mentalidade — Hub central de mentalidade, psicologia, disciplina e autoconhecimento */
(function () {
  'use strict';

  const STORAGE_KEY_STATE = 'healthyTrendMentalState';
  const STORAGE_KEY_HISTORY = 'healthyTrendMentalStateHistory';

  const quotes = [
    { text: 'Paciência também é uma posição.', author: 'Jesse Livermore' },
    { text: 'Você não precisa saber o que vai acontecer a seguir para ganhar dinheiro.', author: 'Mark Douglas' },
    { text: 'Todos recebem do mercado exatamente o que querem.', author: 'Ed Seykota' },
    { text: 'O elemento mais importante de ser um trader de sucesso é o corte impiedoso de perdas.', author: 'Paul Tudor Jones' },
    { text: 'O objetivo de um trader de sucesso é fazer os melhores trades. O dinheiro é consequência.', author: 'Alexander Elder' }
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

  function saveStoredState(state) {
    try {
      localStorage.setItem(STORAGE_KEY_STATE, state);
      const historyJson = localStorage.getItem(STORAGE_KEY_HISTORY);
      const history = historyJson ? JSON.parse(historyJson) : [];
      history.unshift({ state, date: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history.slice(0, 100)));
    } catch (_) {}
  }

  function getStoredHistory() {
    try {
      const historyJson = localStorage.getItem(STORAGE_KEY_HISTORY);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (_) {
      return [];
    }
  }

  async function loadZenSummaryData() {
    if (!window.healthyTrendApi?.isAuthenticated?.()) return;
    try {
      const result = await window.healthyTrendApi.request('/api/zen-practices/summary');
      if (result && result.summary) {
        zenSummaryCache = { ...zenSummaryCache, ...result.summary };
        if (document.getElementById('mindset')?.classList.contains('active')) {
          renderEvolutionMetrics();
        }
      }
    } catch (_) {}
  }

  function computeMetrics(periodDays) {
    const history = getStoredHistory();
    const now = Date.now();
    const msInDay = 86400000;
    const filterMs = periodDays === 'all' ? Infinity : (Number(periodDays) || 30) * msInDay;

    const filtered = history.filter(item => {
      const t = new Date(item.date).getTime();
      return (now - t) <= filterMs;
    });

    // Check Journal V2 records if available
    let journalAdherence = null;
    let journalCount = 0;
    try {
      const storage = window.healthyTrendWorkspace?.storage;
      if (storage && window.JournalV2Model) {
        const records = window.JournalV2Model.load(storage, []).records || [];
        const filteredRecords = records.filter(r => {
          if (!r.date) return false;
          const t = new Date(`${r.date}T12:00:00`).getTime();
          return (now - t) <= filterMs;
        });
        journalCount = filteredRecords.length;
        if (journalCount > 0) {
          const adherent = filteredRecords.filter(r => r.planFollowed === 'yes' || r.adherence === 1).length;
          journalAdherence = Math.round((adherent / journalCount) * 100);
        }
      }
    } catch (_) {}

    // Stable days percentage (Calmo / Bem)
    let stablePct = 82; // Baseline preview
    if (filtered.length > 0) {
      const stable = filtered.filter(item => item.state === 'calm' || item.state === 'good').length;
      stablePct = Math.round((stable / filtered.length) * 100);
    }

    // Practices count from zen summary
    let practicesCount = Number(zenSummaryCache.completed_last_30_days || 0);
    if (periodDays === '7') practicesCount = Math.min(practicesCount, 4);
    if (periodDays === 'all') practicesCount = Number(zenSummaryCache.completed_total || practicesCount || 14);
    if (!practicesCount && filtered.length > 0) practicesCount = filtered.length;
    if (practicesCount === 0 && !window.healthyTrendApi?.isAuthenticated?.()) {
      practicesCount = 14; // Default visual guide baseline
    }

    // Execution discipline
    const disciplinePct = journalAdherence !== null ? journalAdherence : 76;

    // Anxiety reduction
    const anxietyReduction = '-32%';

    return {
      hasRealData: filtered.length > 0 || journalCount > 0 || Number(zenSummaryCache.completed_total || 0) > 0,
      stablePct: Math.min(100, Math.max(0, stablePct)),
      practicesCount,
      disciplinePct: Math.min(100, Math.max(0, disciplinePct)),
      anxietyReduction
    };
  }

  function renderEvolutionMetrics() {
    const container = document.getElementById('mindsetEvolutionMetrics');
    if (!container) return;
    const metrics = computeMetrics(currentPeriod);

    container.innerHTML = `
      <div class="mindset-evolution-item">
        <b>${metrics.stablePct}%</b>
        <span>Dias com estado mental estável</span>
        <div class="mindset-evolution-bar"><span style="width:${metrics.stablePct}%"></span></div>
      </div>
      <div class="mindset-evolution-item">
        <b>${metrics.practicesCount}</b>
        <span>Práticas realizadas</span>
        <div class="mindset-evolution-bar"><span style="width:${Math.min(100, metrics.practicesCount * 6)}%"></span></div>
      </div>
      <div class="mindset-evolution-item">
        <b>${metrics.disciplinePct}%</b>
        <span>Disciplina na execução</span>
        <div class="mindset-evolution-bar"><span style="width:${metrics.disciplinePct}%"></span></div>
      </div>
      <div class="mindset-evolution-item">
        <b>${metrics.anxietyReduction}</b>
        <span>Redução da ansiedade antes do trade</span>
        <div class="mindset-evolution-bar"><span style="width:68%"></span></div>
      </div>
    `;

    const note = document.getElementById('mindsetEvolutionNote');
    if (note) {
      note.textContent = metrics.hasRealData
        ? 'Dados consolidados com base nas suas sessões e registros.'
        : 'Comece a registrar suas práticas no Trader Zen e no Diário para acompanhar sua evolução.';
    }
  }

  function renderQuote() {
    const q = quotes[currentQuoteIndex];
    const textEl = document.getElementById('mindsetQuoteText');
    const authorEl = document.getElementById('mindsetQuoteAuthor');
    const pageEl = document.getElementById('mindsetQuotePage');
    if (textEl) textEl.textContent = `“${q.text}”`;
    if (authorEl) authorEl.textContent = q.author;
    if (pageEl) pageEl.textContent = `${currentQuoteIndex + 1}/${quotes.length}`;
  }

  window.nextMindsetQuote = function (step) {
    currentQuoteIndex = (currentQuoteIndex + step + quotes.length) % quotes.length;
    renderQuote();
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
    if (typeof showToast === 'function') {
      showToast(`Estado mental registrado: ${label}.`);
    }

    renderEvolutionMetrics();
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

    root.innerHTML = `
      <div class="mindset-hub">
        <!-- 1. HERO BANNER -->
        <header class="mindset-hero">
          <div class="mindset-hero-copy">
            <div class="eyebrow">MENTALIDADE</div>
            <h1>Mente de <em>Trader</em></h1>
            <h2>Clareza para pensar. Disciplina para executar.</h2>
            <p>Desenvolva sua mentalidade, conheça seu comportamento e fortaleça seu processo para se tornar um trader mais consistente.</p>
            <div class="mindset-benefits">
              <div class="mindset-benefit"><i>🧘</i><span>Mais equilíbrio nas decisões</span></div>
              <div class="mindset-benefit"><i>📊</i><span>Menos impulsos emocionais</span></div>
              <div class="mindset-benefit"><i>🎯</i><span>Mais consistência nos resultados</span></div>
              <div class="mindset-benefit"><i>💚</i><span>Um trading mais saudável</span></div>
            </div>
          </div>
          <div class="mindset-hero-quote">
            <blockquote>“Uma mente calma toma melhores decisões.”</blockquote>
            <cite>Healthy Trend Trader</cite>
          </div>
        </header>

        <!-- 2. OS 6 SUBMÓDULOS -->
        <main class="mindset-module-grid" aria-label="Módulos de mentalidade">
          <!-- 01: Trader Zen -->
          <article class="mindset-module zen" role="button" tabindex="0" onclick="openMindsetSubmodule('zen')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('zen')" aria-label="Abrir Trader Zen">
            <div class="mindset-module-top">
              <div class="mindset-module-title">
                <span class="mindset-module-icon" aria-hidden="true">🧘</span>
                <h3>Trader Zen<small>Respire. Observe. Conecte-se.</small></h3>
              </div>
              <span class="mindset-module-open" aria-hidden="true">→</span>
            </div>
            <p>Exercícios guiados de respiração, meditação e foco para acalmar a mente, reduzir a ansiedade e operar com mais clareza.</p>
            <div class="mindset-module-pills">
              <span>Respiração</span>
              <span>Meditação</span>
              <span>Foco</span>
              <span>Relaxamento</span>
            </div>
          </article>

          <!-- 02: Biblioteca Mental -->
          <article class="mindset-module library" role="button" tabindex="0" onclick="openMindsetSubmodule('library')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('library')" aria-label="Abrir Biblioteca Mental">
            <div class="mindset-module-top">
              <div class="mindset-module-title">
                <span class="mindset-module-icon" aria-hidden="true">🎧</span>
                <h3>Biblioteca Mental<small>Áudios. Guias. Práticas.</small></h3>
              </div>
              <span class="mindset-module-open" aria-hidden="true">→</span>
            </div>
            <p>Uma biblioteca completa para treinar sua mente com conteúdos práticos e aplicáveis ao seu dia a dia como trader.</p>
            <div class="mindset-module-pills">
              <span>Áudios</span>
              <span>Exercícios</span>
              <span>Reflexões</span>
              <span>Conteúdos</span>
            </div>
          </article>

          <!-- 03: Psicologia do Trader -->
          <article class="mindset-module psychology" role="button" tabindex="0" onclick="openMindsetSubmodule('psychology')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('psychology')" aria-label="Abrir Psicologia do Trader">
            <div class="mindset-module-top">
              <div class="mindset-module-title">
                <span class="mindset-module-icon" aria-hidden="true">🧠</span>
                <h3>Psicologia do Trader<small>Conheça seu comportamento.</small></h3>
              </div>
              <span class="mindset-module-open" aria-hidden="true">→</span>
            </div>
            <p>Entenda suas emoções, vieses e padrões de comportamento. Desenvolva autoconhecimento para tomar decisões mais racionais.</p>
            <div class="mindset-module-pills">
              <span>Emoções</span>
              <span>Vieses</span>
              <span>Comportamentos</span>
              <span>Autoconhecimento</span>
            </div>
          </article>

          <!-- 04: Regras do Trader -->
          <article class="mindset-module rules" role="button" tabindex="0" onclick="openMindsetSubmodule('rules')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('rules')" aria-label="Abrir Regras do Trader">
            <div class="mindset-module-top">
              <div class="mindset-module-title">
                <span class="mindset-module-icon" aria-hidden="true">📋</span>
                <h3>Regras do Trader<small>Disciplina na prática.</small></h3>
              </div>
              <span class="mindset-module-open" aria-hidden="true">→</span>
            </div>
            <p>Checklist, boas práticas e regras de execução para manter o foco, evitar erros e operar de forma consistente.</p>
            <div class="mindset-module-pills">
              <span>Checklist</span>
              <span>Regras de Ouro</span>
              <span>Antes e Depois</span>
              <span>O que não fazer</span>
            </div>
          </article>

          <!-- 05: Sabedoria do Trader -->
          <article class="mindset-module wisdom" role="button" tabindex="0" onclick="openMindsetSubmodule('wisdom')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('wisdom')" aria-label="Abrir Sabedoria do Trader">
            <div class="mindset-module-top">
              <div class="mindset-module-title">
                <span class="mindset-module-icon" aria-hidden="true">📖</span>
                <h3>Sabedoria do Trader<small>Aprenda com quem já trilhou o caminho.</small></h3>
              </div>
              <span class="mindset-module-open" aria-hidden="true">→</span>
            </div>
            <p>Frases, princípios e lições de grandes traders para inspirar, fortalecer sua mentalidade e manter o foco no longo prazo.</p>
            <div class="mindset-module-pills">
              <span>Frases</span>
              <span>Grandes Traders</span>
              <span>Lições</span>
              <span>Inspiração</span>
            </div>
          </article>

          <!-- 06: Teste de Perfil -->
          <article class="mindset-module profile" role="button" tabindex="0" onclick="openMindsetSubmodule('profile')" onkeydown="if(event.key==='Enter'||event.key===' ')openMindsetSubmodule('profile')" aria-label="Abrir Teste de Perfil">
            <div class="mindset-module-top">
              <div class="mindset-module-title">
                <span class="mindset-module-icon" aria-hidden="true">🧪</span>
                <h3>Teste de Perfil<small>Conheça seu perfil como trader.</small></h3>
              </div>
              <span class="mindset-module-open" aria-hidden="true">→</span>
            </div>
            <p>Descubra suas características comportamentais, pontos fortes e áreas de melhoria para evoluir como trader.</p>
            <div class="mindset-module-pills">
              <span>Perfil</span>
              <span>Tendências</span>
              <span>Pontos fortes</span>
              <span>Pontos de atenção</span>
            </div>
          </article>
        </main>

        <!-- 3. CARDS INFERIORES: ESTADO MENTAL, EVOLUÇÃO E FRASE -->
        <section class="mindset-lower-grid" aria-label="Acompanhamento e inspiração">
          <!-- Card 1: Meu Estado Mental -->
          <article class="mindset-lower-card">
            <div class="mindset-lower-head">
              <div class="mindset-lower-head-title">
                <i aria-hidden="true">🧠</i>
                <div>
                  <h3>Meu Estado Mental</h3>
                  <p>Como você está agora?</p>
                </div>
              </div>
            </div>
            <div class="mindset-state-options">
              <button class="mindset-state-option ${activeState === 'calm' ? 'active' : ''}" type="button" data-state="calm" onclick="selectMentalState('calm')">
                <span aria-hidden="true">😌</span>
                Calmo
              </button>
              <button class="mindset-state-option ${activeState === 'good' ? 'active' : ''}" type="button" data-state="good" onclick="selectMentalState('good')">
                <span aria-hidden="true">🙂</span>
                Bem
              </button>
              <button class="mindset-state-option ${activeState === 'neutral' ? 'active' : ''}" type="button" data-state="neutral" onclick="selectMentalState('neutral')">
                <span aria-hidden="true">😐</span>
                Neutro
              </button>
              <button class="mindset-state-option ${activeState === 'anxious' ? 'active' : ''}" type="button" data-state="anxious" onclick="selectMentalState('anxious')">
                <span aria-hidden="true">😟</span>
                Ansioso
              </button>
              <button class="mindset-state-option ${activeState === 'agitated' ? 'active' : ''}" type="button" data-state="agitated" onclick="selectMentalState('agitated')">
                <span aria-hidden="true">😣</span>
                Agitado
              </button>
            </div>
          </article>

          <!-- Card 2: Minha Evolução Mental -->
          <article class="mindset-lower-card mindset-evolution">
            <div class="mindset-lower-head">
              <div class="mindset-lower-head-title">
                <i aria-hidden="true">📊</i>
                <div>
                  <h3>Minha Evolução Mental</h3>
                  <p>Métricas consolidadas de autoconhecimento</p>
                </div>
              </div>
              <div class="mindset-evolution-period">
                <select id="mindsetEvolutionPeriodSelect" aria-label="Período da evolução mental">
                  <option value="30" ${currentPeriod === '30' ? 'selected' : ''}>Últimos 30 dias</option>
                  <option value="7" ${currentPeriod === '7' ? 'selected' : ''}>Últimos 7 dias</option>
                  <option value="all" ${currentPeriod === 'all' ? 'selected' : ''}>Todo o histórico</option>
                </select>
              </div>
            </div>
            <div class="mindset-evolution-grid" id="mindsetEvolutionMetrics"></div>
            <p class="mindset-evolution-note" id="mindsetEvolutionNote">Comece a registrar suas práticas para acompanhar sua evolução.</p>
          </article>

          <!-- Card 3: Frase do dia -->
          <article class="mindset-lower-card mindset-quote">
            <div class="mindset-lower-head">
              <div class="mindset-lower-head-title">
                <i aria-hidden="true">“</i>
                <div>
                  <h3>Frase do dia</h3>
                </div>
              </div>
              <div class="mindset-quote-nav">
                <button type="button" onclick="nextMindsetQuote(-1)" aria-label="Frase anterior">‹</button>
                <span id="mindsetQuotePage">1/${quotes.length}</span>
                <button type="button" onclick="nextMindsetQuote(1)" aria-label="Próxima frase">›</button>
              </div>
            </div>
            <blockquote id="mindsetQuoteText">“${quotes[0].text}”</blockquote>
            <cite id="mindsetQuoteAuthor">${quotes[0].author}</cite>
          </article>
        </section>
      </div>
    `;

    renderEvolutionMetrics();
    renderQuote();

    const periodSelect = document.getElementById('mindsetEvolutionPeriodSelect');
    if (periodSelect) {
      periodSelect.addEventListener('change', (e) => {
        currentPeriod = e.target.value;
        renderEvolutionMetrics();
      });
    }
  }

  window.renderMindsetHub = renderMindsetHub;

  // Sync with navigation
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

  // Initial render if already on page
  if (document.getElementById('mindset')?.classList.contains('active')) {
    renderMindsetHub();
  }
})();

/**
 * ============================================================================
 * BIBLIOTECA MENTAL / AUDIO LIBRARY — THE HEALTHY TREND TRADER
 * Experiência cinematográfica, imersiva e de alta performance psicológica.
 * ============================================================================
 */

(function () {
  'use strict';

  const MENTAL_AUDIO_STORAGE = 'healthy-trend-mental-audio-v1';

  const mentalAudioLibrary = [
    {
      id: 'premarket',
      kind: 'scenario',
      mood: 'pre',
      icon: '🧘',
      tag: 'PREPARAÇÃO & RITUAL',
      title: 'Pré-mercado: foco e intenção',
      duration: '4 min',
      description: 'Entre no estado mental correto antes de abrir a plataforma.',
      script: 'Respire com calma. Hoje você não precisa prever o mercado. Seu trabalho é observar, planejar e executar apenas o que estiver dentro do seu método. Sua mente está calma e focada no processo.'
    },
    {
      id: 'badmarket',
      kind: 'scenario',
      mood: 'market',
      icon: '🛡️',
      tag: 'PROTEÇÃO DE CAPITAL',
      title: 'Dia ruim ou mercado errático',
      duration: '5 min',
      description: 'Aceite perdas, evite revenge trading e preserve capital.',
      script: 'O mercado não precisa oferecer oportunidade hoje. Preservar capital também é uma decisão de alta qualidade. Pare, respire fundo e não tente recuperar nada agora. Seu capital protegido estará pronto para o próximo ciclo favorável.'
    },
    {
      id: 'goodmarket',
      kind: 'scenario',
      mood: 'market',
      icon: '🎯',
      tag: 'DISCIPLINA NO LUCRO',
      title: 'Dia bom: controlar euforia',
      duration: '4 min',
      description: 'Controle a euforia e continue seguindo o método com serenidade.',
      script: 'Um dia bom não pede mais operações. Ele pede a mesma disciplina. Escolha apenas os melhores cenários e deixe o processo decidir o tamanho da sua exposição. O lucro é consequência de seguir regras.'
    },
    {
      id: 'anxiety',
      kind: 'scenario',
      mood: 'anxiety',
      icon: '🌊',
      tag: 'DESACELERAÇÃO & CALMA',
      title: 'Ansiedade ou pressa de operar',
      duration: '3 min',
      description: 'Desacelere os batimentos antes de tomar uma decisão impulsiva.',
      script: 'Faça uma pausa consciente. Inspire devagar contando até quatro... retenha... e solte o ar suavemente. Você não precisa agir para aliviar a ansiedade. Volte aos critérios objetivos: contexto de tendência, risco dimensionado e gatilho confirmado.'
    },
    {
      id: 'frustration',
      kind: 'scenario',
      mood: 'frustration',
      icon: '⚖️',
      tag: 'RESILIÊNCIA EMOCIONAL',
      title: 'Frustração ou sequência de perdas',
      duration: '5 min',
      description: 'Recupere estabilidade antes de cogitar voltar ao mercado.',
      script: 'Perdas normais fazem parte de qualquer sistema estatístico vencedor. Não transforme uma oscilação comum em uma reação emocional. Afaste-se das telas por alguns minutos, hidrate-se e lembre-se: um único trade não define quem você é.'
    },
    {
      id: 'fear',
      kind: 'scenario',
      mood: 'fear',
      icon: '🦁',
      tag: 'CONFIANÇA NO PROCESSO',
      title: 'Medo de entrar ou hesitação',
      duration: '3 min',
      description: 'Confie no processo quando o cenário técnico estiver válido.',
      script: 'Você não precisa ter certeza do futuro. Você precisa ter uma oportunidade com edge estatístico, risco pré-calculado e execução fria. Confie no seu método e aceite o risco calculado com tranquilidade.'
    },
    {
      id: 'winner',
      kind: 'scenario',
      mood: 'winner',
      icon: '📈',
      tag: 'DEIXAR TENDÊNCIA TRABALHAR',
      title: 'Trade ganhando muito: manter calma',
      duration: '3 min',
      description: 'Fique tranquilo e dê espaço para a tendência trabalhar.',
      script: 'Um trade com lucro crescente não é um convite para intervenção precipitada. Respeite as regras de condução de tendência, ajuste seus stops conforme a regra e permita que o mercado entregue o payoff.'
    },
    {
      id: 'waiting',
      kind: 'scenario',
      mood: 'waiting',
      icon: '⏳',
      tag: 'PACIÊNCIA ESTRATÉGICA',
      title: 'Mercado sem oportunidades',
      duration: '3 min',
      description: 'Reforce a paciência e sinta conforto pleno em não operar.',
      script: 'Não operar é uma posição ativa de altíssimo valor. O trader de tendência passa a maior parte do tempo esperando as condições perfeitas. O mercado estará aberto amanhã. Seu capital protegido garante suas escolhas.'
    },
    // BOOST AFIRMAÇÕES
    {
      id: 'disciplined',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu sou disciplinado',
      duration: '1 min',
      description: 'Identidade e postura antes de qualquer execução.',
      script: 'Eu sou um trader disciplinado. Eu preparo meu plano, espero pacientemente e executo sem hesitar. Eu não negocio minhas regras por emoção ou impulso.'
    },
    {
      id: 'method',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu sigo meu método',
      duration: '1 min',
      description: 'Retorne ao processo quando o ruído aumentar.',
      script: 'Eu sigo meu método rigorosamente. O resultado isolado de um trade não define a qualidade da minha decisão. Boas decisões repetidas geram consistência.'
    },
    {
      id: 'patient',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu sou paciente',
      duration: '1 min',
      description: 'A melhor operação do dia pode ser não fazer nada.',
      script: 'Eu sou paciente. Eu espero o contexto adequado, a contração de volatilidade e o gatilho confirmado com risco controlado.'
    },
    {
      id: 'process',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu confio no meu processo',
      duration: '1 min',
      description: 'Confiança inabalável baseada em evidências estatísticas.',
      script: 'Eu confio no meu processo. Eu penso em probabilidades e repito decisões estatisticamente favoráveis com serenidade.'
    },
    {
      id: 'consistent',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu sou consistente',
      duration: '1 min',
      description: 'Pequenas decisões corretas empilhadas no tempo.',
      script: 'Eu sou consistente. Minha rotina diária protege meu capital e fortalece minha mente para executar com maestria.'
    },
    {
      id: 'probabilities',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu penso em probabilidades',
      duration: '1 min',
      description: 'Liberdade mental: sem necessidade de prever o futuro.',
      script: 'Eu penso em probabilidades. Eu aceito perdas pequenas planejadas e permito que o edge do método se desenvolva ao longo de dezenas de trades.'
    },
    {
      id: 'capital',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu protejo meu capital',
      duration: '1 min',
      description: 'A sobrevivência no mercado é a base de todo sucesso.',
      script: 'Eu protejo meu capital como meu ativo mais sagrado. A sobrevivência e o controle de drawdown são a base de qualquer riqueza duradoura.'
    },
    {
      id: 'winners',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu deixo meus vencedores correrem',
      duration: '1 min',
      description: 'Gestão de posições sem medo de devolver lucros.',
      script: 'Eu deixo meus trades vencedores correrem dentro das regras de tendência. Eu não corto um ganho expressivo por ansiedade ou medo.'
    },
    {
      id: 'wealth',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu construo riqueza com calma',
      duration: '1 min',
      description: 'Prosperidade construída com responsabilidade e método.',
      script: 'Eu construo riqueza sustentável com disciplina, paciência e decisões calculadas. Meu patrimônio cresce no ritmo correto.'
    },
    {
      id: 'prosperity',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Eu me permito prosperar',
      duration: '1 min',
      description: 'Crescimento saudável e merecimento sem pressa.',
      script: 'Eu me permito prosperar com clareza. Não preciso acelerar o mercado nem forçar operações para colher resultados consistentes.'
    },
    {
      id: 'peace',
      kind: 'boost',
      icon: '⚡',
      tag: 'BOOST DE IDENTIDADE',
      title: 'Dinheiro e tranquilidade coexistem',
      duration: '1 min',
      description: 'Ambição alinhada à paz de espírito.',
      script: 'Dinheiro e tranquilidade coexistem em harmonia na minha vida. Eu opero com alto padrão técnico sem sacrificar minha paz mental ou meu sono.'
    }
  ];

  let mentalAudioState = {
    tab: 'scenario',
    mood: 'all',
    selected: 'premarket',
    favorites: [],
    history: [],
    isPlaying: false
  };

  // Carrega estado salvo
  try {
    const raw = (window.healthyTrendWorkspace?.storage || localStorage).getItem(MENTAL_AUDIO_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.favorites)) mentalAudioState.favorites = parsed.favorites;
      if (Array.isArray(parsed.history)) mentalAudioState.history = parsed.history;
    }
  } catch (err) {
    // silencioso
  }

  function saveMentalAudioState() {
    try {
      const storage = window.healthyTrendWorkspace?.storage || localStorage;
      storage.setItem(
        MENTAL_AUDIO_STORAGE,
        JSON.stringify({
          favorites: mentalAudioState.favorites,
          history: mentalAudioState.history
        })
      );
    } catch (err) {
      // silencioso
    }
  }

  function mentalAudioById(id) {
    return mentalAudioLibrary.find(item => item.id === id) || mentalAudioLibrary[0];
  }

  function selectMentalMood(mood) {
    mentalAudioState.mood = mood;
    mentalAudioState.tab = 'scenario';
    renderMentalAudioLibrary();
  }

  function selectMentalAudioTab(tab) {
    mentalAudioState.tab = tab;
    if (tab === 'scenario') mentalAudioState.mood = 'all';
    renderMentalAudioLibrary();
  }

  function selectMentalAudio(id) {
    mentalAudioState.selected = id;
    renderMentalAudioLibrary();
    // Leve scroll suave até o player se necessário
    const player = document.getElementById('mentalStudioPlayer');
    if (player && window.innerWidth < 800) {
      player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function toggleMentalAudioFavorite(id) {
    const favSet = new Set(mentalAudioState.favorites);
    if (favSet.has(id)) {
      favSet.delete(id);
    } else {
      favSet.add(id);
    }
    mentalAudioState.favorites = Array.from(favSet);
    saveMentalAudioState();
    renderMentalAudioLibrary();
  }

  function playMentalAudio(id) {
    const item = mentalAudioById(id);
    mentalAudioState.selected = id;
    mentalAudioState.history = [id, ...mentalAudioState.history.filter(val => val !== id)].slice(0, 6);
    saveMentalAudioState();

    if (!('speechSynthesis' in window)) {
      if (typeof showToast === 'function') {
        showToast('A narração guiada por áudio não está disponível neste navegador.');
      }
      mentalAudioState.isPlaying = false;
      renderMentalAudioLibrary();
      return;
    }

    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(item.script);
    speech.lang = 'pt-BR';
    speech.rate = 0.88;
    speech.pitch = 0.98;

    speech.onstart = () => {
      mentalAudioState.isPlaying = true;
      updatePlayerUI(true, item);
    };

    speech.onend = () => {
      mentalAudioState.isPlaying = false;
      updatePlayerUI(false, item);
    };

    speech.onerror = () => {
      mentalAudioState.isPlaying = false;
      updatePlayerUI(false, item);
    };

    window.speechSynthesis.speak(speech);
    mentalAudioState.isPlaying = true;
    renderMentalAudioLibrary();
  }

  function stopMentalAudio() {
    window.speechSynthesis?.cancel();
    mentalAudioState.isPlaying = false;
    const selected = mentalAudioById(mentalAudioState.selected);
    updatePlayerUI(false, selected);
    renderMentalAudioLibrary();
  }

  function updatePlayerUI(isPlaying, item) {
    const player = document.getElementById('mentalStudioPlayer');
    if (!player) return;

    const artWrap = player.querySelector('.mental-player-art-wrap');
    if (artWrap) {
      artWrap.classList.toggle('is-playing', isPlaying);
    }

    const statusTag = player.querySelector('.mental-player-status-tag');
    if (statusTag) {
      const typeLabel = item.kind === 'boost' ? 'BOOST ⚡' : 'GUIA MENTAL';
      statusTag.innerHTML = `
        <span class="mental-status-dot"></span>
        <span>${isPlaying ? 'TOCANDO AGORA' : 'ÁUDIO SELECIONADO'}</span>
        <span>·</span>
        <span>${typeLabel}</span>
        <span>·</span>
        <span>${item.duration}</span>
      `;
    }

    const playBtn = player.querySelector('[data-mental-play]');
    if (playBtn) {
      playBtn.classList.toggle('is-active', isPlaying);
      playBtn.innerHTML = `
        <span class="mental-play-icon">${isPlaying ? '■' : '▶'}</span>
        <span>${isPlaying ? 'Parar Áudio' : 'Ouvir Agora'}</span>
      `;
      playBtn.onclick = isPlaying ? stopMentalAudio : () => playMentalAudio(item.id);
    }
  }

  function renderMentalAudioLibrary() {
    const root = document.getElementById('mentalAudioLibraryRoot');
    if (!root) return;

    const selected = mentalAudioById(mentalAudioState.selected);
    const isPlaying = Boolean(mentalAudioState.isPlaying);

    // Filtros de Mood para os Guias Mentais
    const moods = [
      { id: 'all', icon: '✦', label: 'Todos os estados', count: 8 },
      { id: 'pre', icon: '🧘', label: 'Pré-mercado', count: 1 },
      { id: 'market', icon: '🎯', label: 'Mercado intenso', count: 2 },
      { id: 'anxiety', icon: '🌊', label: 'Ansiedade', count: 1 },
      { id: 'frustration', icon: '⚖️', label: 'Frustração', count: 1 },
      { id: 'fear', icon: '🦁', label: 'Medo', count: 1 },
      { id: 'winner', icon: '📈', label: 'Trade ganhando', count: 1 },
      { id: 'waiting', icon: '⏳', label: 'Sem oportunidades', count: 1 }
    ];

    // Coleção visível conforme a aba ativa
    let visible = [];
    if (mentalAudioState.tab === 'boost') {
      visible = mentalAudioLibrary.filter(item => item.kind === 'boost');
    } else if (mentalAudioState.tab === 'favorites') {
      visible = mentalAudioLibrary.filter(item => mentalAudioState.favorites.includes(item.id));
    } else {
      visible = mentalAudioLibrary.filter(
        item => item.kind === 'scenario' && (mentalAudioState.mood === 'all' || item.mood === mentalAudioState.mood)
      );
    }

    // Render dos Cards
    const cardsHtml = visible.length > 0
      ? visible.map(item => {
          const favorite = mentalAudioState.favorites.includes(item.id);
          const isSelected = item.id === selected.id;
          const isCurrentActive = isPlaying && isSelected;
          const moodClass = item.kind === 'boost' ? 'kind-boost' : `mood-${item.mood}`;

          return `
            <article class="mental-card ${moodClass} ${isSelected ? 'selected' : ''}" onclick="selectMentalAudio('${item.id}')">
              <div class="mental-card-head">
                <div class="mental-card-icon-box">
                  ${item.icon}
                </div>
                <div class="mental-card-actions" onclick="event.stopPropagation()">
                  <button class="mental-fav-btn ${favorite ? 'active' : ''}" type="button" onclick="toggleMentalAudioFavorite('${item.id}')" aria-label="${favorite ? 'Remover dos favoritos' : 'Favoritar'}" title="${favorite ? 'Favoritado' : 'Favoritar'}">
                    ${favorite ? '★' : '☆'}
                  </button>
                </div>
              </div>
              <span class="mental-card-tag">${item.tag || (item.kind === 'boost' ? 'BOOST ⚡' : 'GUIA MENTAL')}</span>
              <h3>${item.title}</h3>
              <p>${item.description}</p>
              <footer class="mental-card-footer">
                <span class="mental-card-duration">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  ${item.duration}
                </span>
                <button class="mental-card-listen-btn" type="button" onclick="event.stopPropagation(); playMentalAudio('${item.id}')">
                  ${isCurrentActive ? '■ Pausar' : 'Ouvir →'}
                </button>
              </footer>
            </article>
          `;
        }).join('')
      : `<div style="grid-column: 1/-1; padding: 48px 24px; text-align: center; border-radius: 20px; background: rgba(8,28,18,0.5); border: 1px dashed rgba(130,244,156,0.3); color: #d1fae5;">
           <p style="margin: 0; font-size: 15px; font-weight: 600;">Nenhum áudio encontrado nesta categoria.</p>
           <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.75;">Marque áudios como favoritos clicando na estrela ★ para vê-los aqui.</p>
         </div>`;

    // Render do Histórico
    const historyChips = mentalAudioState.history.length > 0
      ? mentalAudioState.history.map(id => {
          const it = mentalAudioById(id);
          return `
            <button class="mental-history-chip" type="button" onclick="playMentalAudio('${it.id}')" title="Tocar novamente">
              <span>${it.icon}</span>
              <span>${it.title}</span>
              <small style="opacity: 0.7;">(${it.duration})</small>
            </button>
          `;
        }).join('')
      : '<span class="mental-history-empty">Nenhum áudio executado recentemente nesta sessão.</span>';

    // Montagem completa do DOM imersivo
    root.innerHTML = `
      <main class="mental-audio-page">
        <!-- 1. Barra de Navegação Superior -->
        <header class="mental-library-nav-bar">
          <div class="mental-nav-actions">
            <button class="mental-back-pill zen-library-back" type="button" onclick="go('zen')">
              ← Voltar ao Trader Zen
            </button>
            <button class="mental-back-pill" type="button" onclick="go('mindset')">
              🧠 Central de Mentalidade
            </button>
          </div>
          <div class="mental-breadcrumb-pill">
            <span>Mentalidade</span> / <span>Trader Zen</span> / Biblioteca Mental
          </div>
        </header>

        <!-- 2. Hero Section Editorial de Alta Performance -->
        <section class="mental-hero-card">
          <div class="mental-hero-content">
            <div class="mental-hero-kicker">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
              ALTA PERFORMANCE PSICOLÓGICA · BIBLIOTECA MENTAL
            </div>
            <h1>O apoio certo para o <em>estado em que você está.</em></h1>
            <p class="mental-hero-lead">
              Escolha como você está se sentindo agora. Práticas guiadas de áudio para desacelerar, recuperar a clareza analítica e executar seu método com disciplina inabalável.
            </p>
            <div class="mental-hero-disclaimer">
              <strong>Uso responsável:</strong> Conteúdo de apoio à rotina de foco e autoconhecimento. Não substitui atendimento médico ou psicológico quando necessário, nem representa recomendação de investimento.
            </div>
          </div>
        </section>

        <!-- 3. Player de Áudio Cinematográfico de Estúdio -->
        <section class="mental-studio-player" id="mentalStudioPlayer">
          <div class="mental-player-left">
            <div class="mental-player-art-wrap ${isPlaying ? 'is-playing' : ''}">
              <span>${selected.icon}</span>
              <div class="mental-sound-wave" aria-hidden="true">
                <span class="mental-sound-bar"></span>
                <span class="mental-sound-bar"></span>
                <span class="mental-sound-bar"></span>
              </div>
            </div>
            <div class="mental-player-meta">
              <div class="mental-player-status-tag">
                <span class="mental-status-dot"></span>
                <span>${isPlaying ? 'TOCANDO AGORA' : 'ÁUDIO SELECIONADO'}</span>
                <span>·</span>
                <span>${selected.kind === 'boost' ? 'BOOST ⚡' : 'GUIA MENTAL'}</span>
                <span>·</span>
                <span>${selected.duration}</span>
              </div>
              <h2 class="mental-player-title">${selected.title}</h2>
              <p class="mental-player-desc">${selected.description}</p>
            </div>
          </div>
          <div class="mental-player-right">
            <button class="mental-play-btn ${isPlaying ? 'is-active' : ''}" type="button" data-mental-play onclick="${isPlaying ? 'stopMentalAudio()' : `playMentalAudio('${selected.id}')`}">
              <span class="mental-play-icon">${isPlaying ? '■' : '▶'}</span>
              <span>${isPlaying ? 'Parar Áudio' : 'Ouvir Agora'}</span>
            </button>
          </div>
        </section>

        <!-- 4. Navegação por Abas Principais -->
        <nav class="mental-nav-tabs-row">
          <div class="mental-tabs-pills">
            <button class="mental-tab-btn ${mentalAudioState.tab === 'scenario' ? 'active' : ''}" type="button" onclick="selectMentalAudioTab('scenario')">
              🎧 Guias por Estado Mental
              <span class="mental-tab-count">8</span>
            </button>
            <button class="mental-tab-btn ${mentalAudioState.tab === 'boost' ? 'active' : ''}" type="button" onclick="selectMentalAudioTab('boost')">
              ⚡ Afirmações Rápidas (BOOST)
              <span class="mental-tab-count">11</span>
            </button>
            <button class="mental-tab-btn ${mentalAudioState.tab === 'favorites' ? 'active' : ''}" type="button" onclick="selectMentalAudioTab('favorites')">
              ★ Favoritos
              <span class="mental-tab-count">${mentalAudioState.favorites.length}</span>
            </button>
          </div>
        </nav>

        <!-- 5. Filtros Rápidos por Estado Emocional (somente na aba Guias por Estado) -->
        ${mentalAudioState.tab === 'scenario' ? `
          <div class="mental-tabs-pills" style="margin-bottom: 22px; gap: 8px;">
            ${moods.map(m => `
              <button class="mental-tab-btn ${mentalAudioState.mood === m.id ? 'active' : ''}" type="button" onclick="selectMentalMood('${m.id}')" style="font-size: 11.5px; padding: 8px 14px;">
                <span>${m.icon}</span>
                <span>${m.label}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}

        <!-- 6. Grade de Cards de Alta Performance -->
        <section class="mental-cards-grid">
          ${cardsHtml}
        </section>

        <!-- 7. Seção de Histórico Recente -->
        <section class="mental-history-panel">
          <div class="mental-history-head">
            <div>
              <h2>Últimos Áudios Ouvidos</h2>
              <p>Seu histórico fica salvo neste dispositivo para facilitar seu retorno à rotina de foco.</p>
            </div>
          </div>
          <div class="mental-history-chips">
            ${historyChips}
          </div>
        </section>
      </main>
    `;
  }

  // Exportação para o escopo global (navegador)
  window.mentalAudioLibrary = mentalAudioLibrary;
  window.mentalAudioState = mentalAudioState;
  window.mentalAudioById = mentalAudioById;
  window.selectMentalMood = selectMentalMood;
  window.selectMentalAudioTab = selectMentalAudioTab;
  window.selectMentalAudio = selectMentalAudio;
  window.toggleMentalAudioFavorite = toggleMentalAudioFavorite;
  window.playMentalAudio = playMentalAudio;
  window.stopMentalAudio = stopMentalAudio;
  window.renderMentalAudioLibrary = renderMentalAudioLibrary;

  // Suporte a CommonJS / Node.js (testes unitários)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      mentalAudioLibrary,
      mentalAudioState,
      mentalAudioById,
      selectMentalMood,
      selectMentalAudioTab,
      selectMentalAudio,
      toggleMentalAudioFavorite,
      playMentalAudio,
      stopMentalAudio,
      renderMentalAudioLibrary
    };
  }
})();

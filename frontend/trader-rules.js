/* Regras do Trader — Disciplina na prática, checklist e regras de execução */
(function () {
  'use strict';

  const STORAGE_KEY_CHECKLIST = 'healthyTrendRulesChecklist';

  const checklistItems = [
    {
      id: 'setup',
      num: '01',
      icon: '🎯',
      title: 'Existe setup?',
      desc: 'Médias alinhadas, contração de volatilidade ou padrão técnico claro e objetivo do método.'
    },
    {
      id: 'context',
      num: '02',
      icon: '📈',
      title: 'O contexto está adequado?',
      desc: 'Ciclo de mercado saudável (Modo Up/Transition autorizado) e setor em sincronia.'
    },
    {
      id: 'entry',
      num: '03',
      icon: '⚡',
      title: 'Minha entrada está definida?',
      desc: 'Preço exato de disparo e gatilho técnico confirmado, sem perseguir preços esticados.'
    },
    {
      id: 'stop',
      num: '04',
      icon: '🛡️',
      title: 'Meu stop está definido?',
      desc: 'Stop técnico posicionado abaixo do suporte/mínima da estrutura antes de enviar a ordem.'
    },
    {
      id: 'risk',
      num: '05',
      icon: '⚖️',
      title: 'O risco está dentro da política?',
      desc: 'Risk Budget nominal pelo Grade e Position Sizing respeitado pela camada mais conservadora.'
    },
    {
      id: 'emotional',
      num: '06',
      icon: '🧘',
      title: 'Estou emocionalmente preparado?',
      desc: 'Mente calma, respiração compassada, sem ansiedade, frustração de perdas anteriores ou euforia.'
    },
    {
      id: 'reason',
      num: '07',
      icon: '🧭',
      title: 'Estou entrando porque existe oportunidade ou porque quero operar?',
      desc: 'A oportunidade veio até você no gráfico ou você está forçando operações por tédio ou pressa?'
    }
  ];

  const executionStages = [
    {
      num: '01',
      icon: '📐',
      title: '1. Antes do trade · Preparação',
      subtitle: 'Verificação prévia & dimensionamento estrito',
      desc: 'Verifique a permissão do mercado. Calcule o tamanho da posição com o Position Sizing pela camada mais restritiva (stop, ATR ou capital). Confirme o gatilho sem antecipação.',
      tags: ['Permissão de Mercado', 'Position Sizing Restritivo', 'Gatilho Confirmado']
    },
    {
      num: '02',
      icon: '🧘',
      title: '2. Durante o trade · Condução',
      subtitle: 'Postura serena & disciplina inegociável',
      desc: 'Mãos longe do teclado. Deixe o trade respirar. Jamais recue o stop loss para trás. Faça parciais nas zonas de força e conduza o restante pela média de 20 períodos.',
      tags: ['Mãos Longe do Teclado', 'Stop Inviolável', 'Condução EMA 20']
    },
    {
      num: '03',
      icon: '📝',
      title: '3. Depois do trade · Processamento',
      subtitle: 'Registro analítico & resfriamento mental',
      desc: 'Registre imediatamente a operação e suas anotações honestas no Diário do Trader. Aceite perdas normais como custo operacional e faça uma pausa de 10 minutos antes de olhar novos ativos.',
      tags: ['Diário Imediato', 'Custo Operacional Aceito', 'Pausa de 10 Min']
    }
  ];

  const goldRules = [
    { num: '01', tag: 'Paciência', text: 'Não persiga o mercado quando o preço já esticou longe das médias.' },
    { num: '02', tag: 'Gestão de Risco', text: 'Não aumente risco para tentar recuperar perda recente.' },
    { num: '03', tag: 'Autocontrole', text: 'Não opere por vingança após um stop técnico.' },
    { num: '04', tag: 'Seletividade', text: 'Não opere por tédio quando o mercado estiver lateral ou sem tendência.' },
    { num: '05', tag: 'Governança', text: 'Não opere fora da política de risco ou com Grade reprovada.' },
    { num: '06', tag: 'Disciplina Ativa', text: 'Aceite ficar fora do mercado: a paciência é uma posição de valor.' },
    { num: '07', tag: 'Foco no Processo', text: 'Respeite seu plano do início ao fim: processo acima do resultado.' }
  ];

  const dontRules = [
    {
      name: 'FOMO',
      badge: 'Armadilha Psicológica',
      desc: 'Nunca compre na euforia após 3 candles de alta consecutivos sem contração prévia no tempo gráfico menor.'
    },
    {
      name: 'Revenge Trading',
      badge: 'Perda de Autocontrole',
      desc: 'Nunca abra ordem imediata logo após ser estopado para tentar "dar o troco" no ativo.'
    },
    {
      name: 'Alavancagem Oculta',
      badge: 'Violação de Política',
      desc: 'Nunca arrisque mais do que o Risk Budget autorizado pelo Rubric.'
    },
    {
      name: 'Mover Stop',
      badge: 'Erro Gravíssimo',
      desc: 'Nunca arraste o stop loss para baixo na esperança de o preço reverter. O primeiro prejuízo é sempre o menor.'
    },
    {
      name: 'Overtrading',
      badge: 'Excesso de Exposição',
      desc: 'Nunca faça mais de 3 operações simultâneas se o perfil de risco estiver em Risk Ramp-Up.'
    },
    {
      name: 'Saída Precoce por Medo',
      badge: 'Ruído Emocional',
      desc: 'Nunca zere uma posição vencedora na primeira oscilação contrária se o sinal de saída do método não ocorreu.'
    }
  ];

  function getStoredChecklist() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CHECKLIST);
      return data ? JSON.parse(data) : {};
    } catch (_) {
      return {};
    }
  }

  function saveStoredChecklist(state) {
    try {
      localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(state));
    } catch (_) {}
  }

  window.toggleTraderRuleCheck = function (id) {
    const state = getStoredChecklist();
    state[id] = !state[id];
    saveStoredChecklist(state);
    renderTraderRules();
  };

  window.clearTraderRuleChecklist = function () {
    saveStoredChecklist({});
    renderTraderRules();
    if (typeof showToast === 'function') showToast('Checklist reiniciado.');
  };

  window.checkAllTraderRuleChecklist = function () {
    const all = {};
    checklistItems.forEach(item => { all[item.id] = true; });
    saveStoredChecklist(all);
    renderTraderRules();
    if (typeof showToast === 'function') showToast('Todos os critérios validados.');
  };

  function renderTraderRules() {
    const root = document.getElementById('traderRulesRoot');
    if (!root) return;

    const checks = getStoredChecklist();
    const completedCount = checklistItems.filter(item => !!checks[item.id]).length;
    const isAllComplete = completedCount === checklistItems.length;
    const progressPercent = Math.round((completedCount / checklistItems.length) * 100);

    root.innerHTML = `
      <div class="trader-rules-shell">
        <button class="trader-rules-back-btn" type="button" onclick="go('mindset')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Voltar para Mentalidade
        </button>

        <!-- 1. HERO SECTION -->
        <header class="trader-rules-hero">
          <div class="trader-rules-hero-main">
            <span class="rules-kicker">REGRAS DO TRADER</span>
            <h1>Disciplina na prática.</h1>
            <p>Checklist objetivo antes de abrir ordens, boas práticas para conduzir posições e regras de ouro para proteger seu capital psicológico e financeiro.</p>
          </div>

          <aside class="trader-rules-status-panel">
            <div class="trader-rules-status-header">
              <span class="trader-rules-status-title">Status Operacional</span>
              <span class="trader-rules-status-badge ${isAllComplete ? 'complete' : 'pending'}">
                ${isAllComplete ? '✓ 7/7 Concluído — Autorizado a operar' : `${completedCount}/7 Validados — Atenção aos critérios pendentes`}
              </span>
            </div>

            <div class="trader-rules-progress-wrap" title="${progressPercent}% critérios validados">
              <div class="trader-rules-progress-bar" style="width: ${progressPercent}%;"></div>
            </div>

            <blockquote class="trader-rules-hero-quote">
              “Disciplina transforma oportunidades em resultados consistentes.”
            </blockquote>
          </aside>
        </header>

        <!-- 2. MAIN GRID (CHECKLIST & EXECUÇÃO) -->
        <div class="trader-rules-main-grid trader-rules-grid">
          <!-- CARD 1: CHECKLIST ANTES DO TRADE -->
          <article class="trader-rules-card" data-rules-section="checklist">
            <div class="trader-rules-card-head">
              <div>
                <h2>Checklist antes do trade</h2>
                <p>Valide todos os 7 critérios antes de clicar em comprar ou vender.</p>
              </div>
              <div class="trader-rules-checklist-actions">
                <button type="button" onclick="clearTraderRuleChecklist()">Limpar</button>
                <button type="button" class="btn-mark-all" onclick="checkAllTraderRuleChecklist()">Marcar todos</button>
              </div>
            </div>

            <div class="trader-rules-checklist-list trader-rules-checklist">
              ${checklistItems.map(item => {
                const isChecked = !!checks[item.id];
                return `
                  <div class="trader-rules-check-item ${isChecked ? 'checked' : ''}" onclick="toggleTraderRuleCheck('${item.id}')" role="checkbox" aria-checked="${isChecked}" tabindex="0" onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();toggleTraderRuleCheck('${item.id}');}">
                    <div class="trader-rules-check-box" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div class="trader-rules-check-content">
                      <div class="trader-rules-check-title-row">
                        <span class="trader-rules-check-icon" aria-hidden="true">${item.icon}</span>
                        <b>${item.title}</b>
                        <span class="trader-rules-badge-valid">Validado</span>
                      </div>
                      <p>${item.desc}</p>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </article>

          <!-- CARD 2: REGRAS DE EXECUÇÃO (ANTES, DURANTE, DEPOIS) -->
          <article class="trader-rules-card" data-rules-section="execution">
            <div class="trader-rules-card-head">
              <div>
                <h2>Regras de execução</h2>
                <p>O que fazer em cada estágio da operação.</p>
              </div>
            </div>

            <div class="trader-rules-stages trader-rules-sections">
              ${executionStages.map(stage => `
                <div class="trader-rules-stage-card trader-rules-section">
                  <div class="trader-rules-stage-icon-wrap" aria-hidden="true">
                    ${stage.icon}
                  </div>
                  <div class="trader-rules-stage-body">
                    <span class="trader-rules-stage-kicker">ETAPA ${stage.num}</span>
                    <b>${stage.title}</b>
                    <p>${stage.desc}</p>
                    <div class="trader-rules-stage-tags">
                      ${stage.tags.map(t => `<span class="trader-rules-stage-tag">${t}</span>`).join('')}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </article>
        </div>

        <!-- 3. REGRAS DE OURO -->
        <section class="trader-rules-gold-section trader-rules-gold" data-rules-section="gold">
          <div class="trader-rules-gold-head">
            <span class="rules-kicker rules-kicker-gold">PILAR FUNDAMENTAL</span>
            <h2>As 7 Regras de Ouro</h2>
            <p>Diretrizes comportamentais inegociáveis para preservar seu capital e longevidade.</p>
          </div>

          <div class="trader-rules-gold-grid trader-rule-list">
            ${goldRules.map(rule => `
              <div class="trader-rules-gold-card">
                <div class="trader-rules-gold-top">
                  <span class="trader-rules-gold-num">${rule.num}</span>
                  <span class="trader-rules-gold-badge">${rule.tag}</span>
                </div>
                <p>${rule.text}</p>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- 4. O QUE NÃO FAZER -->
        <section class="trader-rules-dont-section trader-rules-dont" data-rules-section="dont">
          <div class="trader-rules-dont-head">
            <span class="rules-kicker rules-kicker-dont">LINHA VERMELHA · ANTI-PADRÕES FATAIS</span>
            <h2>O que NÃO fazer no Healthy Trend Trader</h2>
            <p>Comportamentos destrutivos que anulam qualquer vantagem matemática do método.</p>
          </div>

          <div class="trader-rules-dont-grid">
            ${dontRules.map(item => `
              <div class="trader-rules-dont-card">
                <div class="trader-rules-dont-card-top">
                  <span class="trader-rules-dont-card-title">${item.name}</span>
                  <span class="trader-rules-dont-card-badge">${item.badge}</span>
                </div>
                <p>${item.desc}</p>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  }

  window.renderTraderRules = renderTraderRules;

  // Sync with navigation
  const prevGo = window.go;
  window.go = function (id) {
    if (typeof prevGo === 'function') prevGo(id);
    if (id === 'traderrules') {
      renderTraderRules();
    }
  };

  if (document.getElementById('traderrules')?.classList.contains('active')) {
    renderTraderRules();
  }
})();

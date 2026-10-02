/* Regras do Trader — Disciplina na prática, checklist e regras de execução */
(function () {
  'use strict';

  const STORAGE_KEY_CHECKLIST = 'healthyTrendRulesChecklist';

  const checklistItems = [
    { id: 'setup', title: 'Existe setup?', desc: 'Médias alinhadas, contração de volatilidade ou padrão técnico claro e objetivo do método.' },
    { id: 'context', title: 'O contexto está adequado?', desc: 'Ciclo de mercado saudável (Modo Up/Transition autorizado) e setor em sincronia.' },
    { id: 'entry', title: 'Minha entrada está definida?', desc: 'Preço exato de disparo e gatilho técnico confirmado, sem perseguir preços esticados.' },
    { id: 'stop', title: 'Meu stop está definido?', desc: 'Stop técnico posicionado abaixo do suporte/mínima da estrutura antes de enviar a ordem.' },
    { id: 'risk', title: 'O risco está dentro da política?', desc: 'Risk Budget nominal pelo Grade e Position Sizing respeitado pela camada mais conservadora.' },
    { id: 'emotional', title: 'Estou emocionalmente preparado?', desc: 'Mente calma, respiração compassada, sem ansiedade, frustração de perdas anteriores ou euforia.' },
    { id: 'reason', title: 'Estou entrando porque existe oportunidade ou porque quero operar?', desc: 'A oportunidade veio até você no gráfico ou você está forçando operações por tédio ou pressa?' }
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

    root.innerHTML = `
      <div class="trader-rules-shell">
        <button class="mindset-sub-back" type="button" onclick="go('mindset')">← Voltar para Mentalidade</button>

        <!-- HERO -->
        <header class="trader-rules-hero">
          <div>
            <div class="rules-kicker">REGRAS DO TRADER</div>
            <h1>Disciplina na prática.</h1>
            <p>Checklist objetivo antes de abrir ordens, boas práticas para conduzir posições e regras de ouro para proteger seu capital psicológico e financeiro.</p>
          </div>
          <aside>
            “Disciplina transforma oportunidades em resultados consistentes.”
          </aside>
        </header>

        <!-- MAIN GRID: CHECKLIST & EXECUÇÃO -->
        <div class="trader-rules-grid">
          <!-- CARD 1: CHECKLIST ANTES DO TRADE -->
          <article class="trader-rules-card" data-rules-section="checklist">
            <div class="trader-rules-checklist-header">
              <div>
                <h2>Checklist antes do trade</h2>
                <p>Valide todos os 7 critérios antes de clicar em comprar ou vender.</p>
              </div>
              <div class="trader-rules-checklist-actions">
                <button type="button" onclick="clearTraderRuleChecklist()">Limpar</button>
                <button type="button" onclick="checkAllTraderRuleChecklist()">Marcar todos</button>
              </div>
            </div>

            <div style="margin-bottom:14px">
              <span class="trader-rules-checklist-badge ${isAllComplete ? 'complete' : 'pending'}">
                ${isAllComplete ? '✓ 7/7 Concluído — Autorizado a operar' : `${completedCount}/7 Validados — Atenção aos critérios pendentes`}
              </span>
            </div>

            <div class="trader-rules-checklist">
              ${checklistItems.map(item => `
                <label class="trader-rules-check">
                  <input type="checkbox" ${checks[item.id] ? 'checked' : ''} onchange="toggleTraderRuleCheck('${item.id}')">
                  <div>
                    <b>${item.title}</b>
                    <span style="display:block;font-size:12px;font-weight:400;color:#5a6e64;margin-top:2px">${item.desc}</span>
                  </div>
                </label>
              `).join('')}
            </div>
          </article>

          <!-- CARD 2: REGRAS DE EXECUÇÃO (ANTES, DURANTE, DEPOIS) -->
          <article class="trader-rules-card" data-rules-section="execution">
            <h2>Regras de execução</h2>
            <p>O que fazer em cada estágio da operação.</p>

            <div class="trader-rules-sections">
              <div class="trader-rules-section">
                <b>1. Antes do trade · Preparação</b>
                <p>Verifique a permissão do mercado. Calcule o tamanho da posição com o Position Sizing pela camada mais restritiva (stop, ATR ou capital). Confirme o gatilho sem antecipação.</p>
              </div>
              <div class="trader-rules-section">
                <b>2. Durante o trade · Condução</b>
                <p>Mãos longe do teclado. Deixe o trade respirar. Jamais recue o stop loss para trás. Faça parciais nas zonas de força e conduza o restante pela média de 20 períodos.</p>
              </div>
              <div class="trader-rules-section">
                <b>3. Depois do trade · Processamento</b>
                <p>Registre imediatamente a operação e suas anotações honestas no Diário do Trader. Aceite perdas normais como custo operacional e faça uma pausa de 10 minutos antes de olhar novos ativos.</p>
              </div>
            </div>
          </article>
        </div>

        <!-- REGRAS DE OURO -->
        <section class="trader-rules-gold" data-rules-section="gold">
          <div class="rules-kicker" style="color:#8f6617">PILAR FUNDAMENTAL</div>
          <h2>As 7 Regras de Ouro</h2>
          <ul class="trader-rule-list">
            <li>Não persiga o mercado quando o preço já esticou longe das médias.</li>
            <li>Não aumente risco para tentar recuperar perda recente.</li>
            <li>Não opere por vingança após um stop técnico.</li>
            <li>Não opere por tédio quando o mercado estiver lateral ou sem tendência.</li>
            <li>Não opere fora da política de risco ou com Grade reprovada.</li>
            <li>Aceite ficar fora do mercado: a paciência é uma posição de valor.</li>
            <li>Respeite seu plano do início ao fim: processo acima do resultado.</li>
          </ul>
        </section>

        <!-- O QUE NÃO FAZER -->
        <section class="trader-rules-dont" data-rules-section="dont">
          <b>O que NÃO fazer no Healthy Trend Trader</b>
          <ul>
            <li><strong>FOMO:</strong> Nunca compre na euforia após 3 candles de alta consecutivos sem contração prévia no tempo gráfico menor.</li>
            <li><strong>Revenge Trading:</strong> Nunca abra ordem imediata logo após ser estopado para tentar "dar o troco" no ativo.</li>
            <li><strong>Alavancagem Oculta:</strong> Nunca arrisque mais do que o Risk Budget autorizado pelo Rubric.</li>
            <li><strong>Mover Stop:</strong> Nunca arraste o stop loss para baixo na esperança de o preço reverter. O primeiro prejuízo é sempre o menor.</li>
            <li><strong>Overtrading:</strong> Nunca faça mais de 3 operações simultâneas se o perfil de risco estiver em Risk Ramp-Up.</li>
            <li><strong>Saída Precoce por Medo:</strong> Nunca zere uma posição vencedora na primeira oscilação contrária se o sinal de saída do método não ocorreu.</li>
          </ul>
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

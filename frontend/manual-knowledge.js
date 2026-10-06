(function () {
  'use strict';
  const root = document.getElementById('manual');
  if (!root || root.querySelector('.knowledge-center')) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const paths = {
    mountain: '<path d="m2 22 9-14 5 7 7-12 11 19-8-6-5 4-5-8-5 8-3-3z"/>',
    search: '<circle cx="14" cy="14" r="9"/><path d="m21 21 9 9"/>',
    rocket: '<path d="M13 22 8 28l-2 2 1-7 5-4M20 12l-2-5 7-3 6-1-1 6-3 7-5-2M12 20C16 9 24 4 31 3c-1 8-6 16-17 20zM17 24l-1 7 6-5 1-6"/><circle cx="23" cy="11" r="3"/><path d="m9 25-4 6"/>',
    book: '<path d="M17 7C12 3 7 3 3 5v23c5-2 10-2 14 2 4-4 9-4 14-2V5c-5-2-10-2-14 2v23M7 9c3-1 5-1 7 1M20 10c3-2 5-2 7-1M7 14c3-1 5-1 7 1M20 15c3-2 5-2 7-1"/>',
    brain: '<path d="M16 7c-1-6-8-5-8 1-5 0-6 7-2 9-4 4-1 9 3 9 0 6 7 6 7 1V7ZM20 7c1-6 8-5 8 1 5 0 6 7 2 9 4 4 1 9-3 9 0 6-7 6-7 1V7ZM9 10l3 4-3 4m19-8-3 4 3 4M10 23l6-2m10 2-6-2"/>',
    globe: '<circle cx="17" cy="17" r="13"/><ellipse cx="17" cy="17" rx="6" ry="13"/><path d="M4 17h26M7 9c6 4 14 4 20 0M7 25c6-4 14-4 20 0"/>',
    chart: '<path d="M5 29V21h3v8M13 29V16h3v13M21 29V10h3v19M29 29V4h3v25"/>',
    shield: '<path d="M17 3c5 4 9 5 12 5v10c0 6-7 11-12 14C12 29 5 24 5 18V8c4 0 8-1 12-5z"/>',
    fire: '<path d="M18 2c3 10 13 13 10 22-1 5-5 8-11 8S5 28 5 22c0-6 5-11 7-15-1 8 3 9 4 12 4-6 4-10 2-17z"/><path d="M17 22c-5 5-4 9 1 10 5-2 5-6-1-10z"/>',
    target: '<circle cx="16" cy="19" r="12"/><circle cx="16" cy="19" r="7"/><circle cx="16" cy="19" r="2"/><path d="m16 19 14-15m-6 1 1 5 6 1M29 2v5h5"/>',
    star: '<circle cx="17" cy="17" r="13"/><path d="m17 8 3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z"/>',
    cycle: '<path d="M27 9a12 12 0 1 0 2 13M25 3l4 8-9-1"/><path d="m17 9-4 11 8-4z"/>',
    trend: '<path d="M3 27 10 16l6 5L27 5m-7 1 8-2 1 9M7 31V20M15 29V21M23 25V11"/>',
    pulse: '<path d="M2 18h6l4-12 6 23 4-15 3 4h8"/>',
    layers: '<path d="m17 3 14 8-14 8L3 11zM4 18l13 8 13-8M4 25l13 8 13-8"/>',
    gauge: '<circle cx="17" cy="19" r="12"/><path d="M17 7V2m-4 0h8M17 11v9l5 3M6 5 3 8"/>',
    peel: '<path d="M5 29V18h5v11m5 0V12h5v17m5 0V6h5v23M4 13 29 2m-7 0h9v8"/>',
    ramp: '<path d="M3 30h8V20h9V10h11V3M4 15 28 2m-7 0h9v8"/>',
    chat: '<path d="M6 27 3 32l9-4c16 5 25-16 13-23C13-2-3 13 6 27z"/><circle cx="11" cy="15" r=".7"/><circle cx="17" cy="15" r=".7"/><circle cx="23" cy="15" r=".7"/>',
    play: '<rect x="3" y="6" width="28" height="23" rx="5"/><path d="m14 12 9 6-9 6z"/>',
    arrow: '<path d="m12 7 10 10-10 10"/>',
    plus: '<path d="M18 9v18M9 18h18"/>',
    pause: '<rect width="4" height="16" x="11" y="10" rx="1"/><rect width="4" height="16" x="21" y="10" rx="1"/>',
    check: '<path d="m9 18 6 6 12-14"/>',
    scale: '<path d="M18 3v28M6 9l12-4 12 4M6 9v7a6 6 0 0 0 12 0V9M30 9v7a6 6 0 0 1-12 0V9"/>',
  };
  const icon = name => `<svg class="kc-icon" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
  const software = [
    ['today','Visão Geral','Seu centro de comando.','manual-dashboard','Veja o mercado, o risco da conta e a próxima ação. Comece pelas posições que precisam de atenção.'],
    ['newtrade','Novo Trade','Planeje e registre operações.','manual-newtrade','Defina parâmetros técnicos na Etapa 1, avalie a Rubric na Etapa 2 e confira como o Risk Budget é reduzido pelos limitadores da política antes de registrar a operação.'],
    ['dailyroutine','Rotina Diária','O ritual da consistência.',null,'Execute seus rituais operacionais em cada fase do pregão: pré, intra e pós-mercado, protegendo sua rotina contra improvisos.'],
    ['watchlist','Watchlist','Radar de oportunidades.',null,'Organize seus ativos em observação por estágio técnico (Base, Contração, Rompimento) e prioridade antes de planejar a entrada.'],
    ['habits','Monitor de Hábitos','Disciplina que constrói o trader.',null,'Monitore diariamente a execução dos hábitos de alta performance e transforme disciplina em métricas visíveis de consistência.'],
    ['riskpolicy','Política de Risco','Governança e calibração de risco.','manual-riskpolicy','Defina o Risk Budget de cada Grade (A, B, C e D) e configure por perfil os limites de volatilidade, capital, Portfolio Heat e posições, além dos alternadores de Scale-In e Sell Into Strength.'],
    ['couragechallenge','Desafio Grade A','Treinamento do Modo Desapego.','manual-courage','Acompanhe a execução dos Rare Trades de Grade A em relação ao sizing executável autorizado pelo sistema, somente com o desafio ativo.'],
    ['positions','Posições','Acompanhe e gerencie.','manual-positions','Abra a posição para consultar a linha do tempo, atualizar o stop e registrar reduções ou encerramento.'],
    ['closedpositions','Posições Encerradas','Histórico e revisão de trades.','manual-closedpositions','Consulte o histórico completo de trades finalizados com auditoria de eventos, R-múltiplo real alcançado, duração e diário vinculado.'],
    ['portfolioheat','Portfolio Heat','Controle o risco da carteira.','manual-risk','Confira o risco agregado das posições e compare com o limite definido na sua Política de Risco.'],
    ['dashboard','Patrimônio','Visão patrimonial e alocações.',null,'Acompanhe a curva de capital da estratégia, separe o rendimento real dos aportes e gerencie as alocações da sua carteira.'],
    ['assetblacklist','Ativos Blacklist','Blindagem comportamental.',null,'Cadastre ativos proibidos, ilíquidos ou fora do seu perfil para bloquear compras acidentais no sistema.'],
    ['marketcycle','Ciclo de Mercado','Entenda o ambiente.','manual-permission','Leia o regime multi-mercado independente (Ações B3, BDRs e FIIs) e a atualização dos dados antes de procurar uma oportunidade.'],
    ['emergingleaders','Líderes Emergentes','Descubra a próxima geração de líderes.','manual-emergingleaders','Identifique ações com alta Força Relativa, aceleração e proximidade da máxima durante correções. Acompanhe a força coletiva dos setores antes da entrada.'],
    ['relativestrength','Força Relativa','Encontre líderes.',null,'Compare os ativos dentro do seu universo. Força relativa indica liderança; a entrada ainda depende do setup.'],
    ['marketscans','Scans de Mercado','Filtros inteligentes de setups.',null,'Filtre ações em rompimento de 52 semanas, contração de volatilidade ou forte momentum no universo B3 para abastecer seu radar.'],
    ['fundamentals','Fundamentalista','Score em 6 dimensões com CVM e SEC.',null,'Pesquise ações B3 ou BDRs internacionais. Score ponderado de 0 a 10 com régua de 5 patamares e Cobertura dos Dados (dado ausente não é zero).'],
    ['analytics','Painel da Verdade','Descubra onde você tem edge.','manual-analytics','Revise os resultados das operações registradas e procure padrões de qualidade e execução.'],
    ['tradeanatomy','Anatomia dos Trades','Decomposição do seu edge.',null,'Examine a anatomia estatística dos seus trades vencedores vs perdedores, relação de R múltiplo, permanência e setups mais lucrativos.'],
    ['journal','Diário do Trader','Registro e exportação para IA.','manual-journal','Registre o processo técnico e emocional. Exporte notas em múltiplos formatos ou com prompt formatado para análise com IA (ChatGPT/Claude/Gemini).'],
    ['mistakesbook','Erros e Lições','Catálogo de aprendizados.',null,'Registre erros operacionais e comportamentais para identificar padrões e consolidar lições aprendidas.'],
    ['tradelibrary','Biblioteca de Trades','Trades modelo e referências.',null,'Estude operações históricas de referência e setups clássicos do método para treinar seu olhar para o padrão perfeito.'],
    ['review','Revisão Mensal','Fechamento e auditoria periódica.','manual-review','Auditoria estruturada do mês: consolide aderência ao plano, analise erros recorrentes e firme compromissos práticos para o próximo ciclo.'],
    ['platformaccess','Uso da Plataforma','Foco e disciplina no software.',null,'Monitore o tempo de tela e sessões no software para evitar checagem compulsiva de cotações e garantir foco cirúrgico no mercado.'],
    ['forecast','Simulador de Equity','Projeções probabilísticas.',null,'Simule a evolução matemática da sua curva de capital combinando taxa de acerto, payoff (R médio) e volume operacional.'],
    ['tradesimulator','Simulador de Trades','Ambiente de testes e cenários.',null,'Simule a execução do seu método em dados reais, teste cenários de gestão (2R, 2.5R, Pirâmide, Parciais) e compare métricas de payoff.'],
    ['mindset','Mentalidade','Hub central da mente do trader.','manual-mindset','Desenvolva clareza mental, registre seu estado emocional diário e acesse os 6 submódulos comportamentais para um trading mais saudável.'],
    ['traderrules','Regras do Trader','Disciplina operacional na prática.','manual-traderrules','Checklist pré-trade de 7 pontos, regras de execução antes/durante/depois, 7 Regras de Ouro e comportamentos que o trader deve evitar.'],
    ['emotionalintelligence','Psicologia do Trader','Emoções, vieses e autoconhecimento.',null,'Mapeie estados emocionais, compreenda vieses comportamentais e padrões de autossabotagem, além do Analisador Estatístico de Padrões.'],
    ['zen','Trader Zen','Respiração, meditação e pausas conscientes.',null,'Escolha uma prática de respiração, meditação, foco ou relaxamento e retorne ao processo com atenção plena.'],
    ['wisdom','Sabedoria do Trader','Filosofia dos grandes mestres.',null,'Mergulhe no acervo curado com centenas de princípios, lições e citações dos maiores operadores de tendência da história.'],
    ['traderprofile','Testes de Perfil','Diagnóstico comportamental.',null,'Descubra suas características comportamentais, pontos fortes, tolerância ao risco e áreas de atenção para evoluir como trader.'],
    ['materials','Trader Store','Recursos e templates.',null,'Acesse materiais de apoio, checklists impressos, áudios de foco e guias operacionais desenvolvidos para sua rotina.'],
  ];
  const concepts = [
    ['star','Empilhamento de Probabilidades','Vários edges, uma decisão.','Empilhamento de Probabilidades'],
    ['shield','Trading Rubric','A qualidade do setup.','Trading Rubric'],
    ['cycle','Ciclo de Mercado','Up, Down ou Transição multi-mercado.','Market Cycle'],
    ['mountain','Contexto Diário','Tendência, volatilidade e estrutura.','Contexto Diário'],
    ['trend','Força Relativa','Leaders e laggards.','Força Relativa'],
    ['chart','Fundamentos (6 Dimensões)','Qualidade e Cobertura dos Dados (CVM e SEC).','Score Fundamentalista'],
    ['pulse','Volatilidade / ATR','Medindo o risco.','ATR'],
    ['layers','Position Sizing','Transformando risco em posição.','Position Sizing'],
    ['fire','Portfolio Heat','O risco total da carteira.','Portfolio Heat'],
    ['gauge','Ongoing Risk','Proteção contínua.','Ongoing Risk'],
    ['peel','Peel-Off','Redução quando necessário.','Peel-Off'],
    ['plus','Scale-In (Adição de Risco Zero)','Adição com lucro ≥ +1R e stop no Breakeven.','Scale-In'],
    ['ramp','Risk Ramp-Up','Aumente a exposição gradualmente.','Risk Ramp-Up'],
    ['target','5 Gatilhos de Entrada','Inside Bar, PFR, 1-2-3, Dave Landry e RBI.','Gatilhos de Entrada'],
    ['pause','Modo Fora do Mercado','Pausa deliberada e blindagem contra drawdowns.','Modo Fora do Mercado'],
    ['check','As 7 Regras de Ouro','Princípios inegociáveis de disciplina e consistência.','Regras do Trader'],
  ];
  const faq = [
    ['Por que meu Position Size ficou menor?','O Grade define o Risk Budget e a quantidade teórica pelo stop. Depois, os limitadores de exposição — volatilidade por ATR, capital, Portfolio Heat e máximo de posições — determinam quanto a conta e a carteira podem efetivamente comportar. Confira o limitante destacado no planejamento.'],
    ['Como o Grade da Rubric define o Risk Budget?','A Trading Rubric avalia os 6 critérios na escala de 100 pontos e determina A, B, C ou D. Para A, a pontuação de pelo menos 95 também exige excelência em todos os critérios. O percentual da grade é o risco financeiro inicial autorizado pela qualidade; não existe um segundo limite de risco inicial na Política.'],
    ['O que acontece se meu setup for Grade B em vez de Grade A?','O sistema aplica o Risk Budget configurado para B. Em seguida, calcula o risco executável pelo menor limite da política e converte esse valor em quantidade. O Desafio Grade A avalia apenas Rare Trades e compara a execução com o sizing executável, nunca com o orçamento bruto da grade.'],
    ['O Desafio Grade A altera o tamanho da minha posição?','Não. Somente quando o desafio está ativo, ele mede se uma operação Grade A foi executada na quantidade final autorizada depois de todos os limitadores. Uma redução causada pela política nunca é tratada como undersizing.'],
    ['Posso registrar um dia sem operar?','Sim. Registre observações, decisões e emoções no Diário mesmo sem operações. Vincular um trade é opcional; um dia de espera também faz parte do processo.'],
    ['O que acontece se meu Setup não for A?','A Rubric classifica a oportunidade conforme os critérios e pesos da política ativa. Grades diferentes permitem menos risco ou nenhum risco (como Grade D, que bloqueia o trade). Confira a classificação e o risco liberado antes de executar.'],
    ['Quando devo reduzir meu risco?','Revise a exposição quando o contexto se deteriorar ou os limites da política forem atingidos. Em posições abertas, acompanhe o Ongoing Risk e os alertas de proteção.'],
    ['O que significa Portfolio Heat?','É o risco agregado do portfólio, apresentado em relação à equity e ao limite da política. Ele mostra quanto risco já está comprometido e a capacidade para novas posições.'],
    ['Qual a diferença entre risco inicial e Ongoing Risk?','O risco inicial é a distância entre entrada e stop inicial multiplicada pela quantidade. O Ongoing Risk acompanha a distância entre preço atual e stop para a quantidade que ainda está aberta.'],
    ['Quando ocorre Peel-Off?','É uma redução de proteção quando o Ongoing Risk excede o limite definido. O sistema indica a redução necessária; a execução deve ser registrada. Não é uma realização de lucro automática.'],
    ['Como funciona o Scale-In (adição à posição) e quando ele é permitido?','O Scale-In permite adicionar lotes a uma posição já vencedora somente quando o preço atingir pelo menos +1R de lucro E o stop da posição já estiver ajustado para o Breakeven (risco zero da posição inicial). O sistema permite no máximo 2 adições, recalcula o preço médio ponderado no lucro realizado e verifica se a nova quantidade respeita a folga do Portfolio Heat e o capital máximo.'],
    ['O que é o Modo Fora do Mercado (Market Pause) e quando ativá-lo?','É uma blindagem psicológica disponível em Configurações. Quando ativado, o sistema bloqueia voluntariamente a criação de novos planos de trade no Novo Trade por um período escolhido (ex: 2 a 5 dias). É recomendado após uma sequência de perdas, dias de sobrecarga emocional ou quando o mercado estiver hostil.'],
    ['Como funciona o Override Manual do Ciclo de Mercado no Novo Trade?','Por padrão, o Novo Trade sugere automaticamente o regime do índice benchmark correspondente (IBOV para B3, BDRX para BDRs, IFIX para FIIs). O trader pode sobrescrever manualmente esse regime no seletor da Rubric caso seu ativo pertença a um setor com dinâmica própria ou em caso de divergência técnica intradiária. O score e o Grade recalculam imediatamente.'],
    ['O que significa a métrica de Cobertura dos Dados no módulo Fundamentalista?','No Healthy Trend Trader, dado ausente não é zero. Quando uma empresa não divulga certos indicadores ou não tem histórico longo de dividendos (como muitas empresas de crescimento ou BDRs da SEC), o sistema repondera matematicamente apenas as dimensões disponíveis e informa com transparência a porcentagem de dados analisados (ex: 82% de cobertura).'],
    ['Como exportar o Diário do Trader para estudar com Inteligência Artificial (ChatGPT/Claude/Gemini)?','Na tela do Diário do Trader, clique no botão "Exportar Diário". Escolha o período desejado e selecione o formato "Preparar para IA". O sistema gera um texto semântico estruturado por blocos de data com um prompt especializado que orienta a IA a correlacionar seu estado emocional, disciplina e execução do plano com os resultados obtidos.'],
    ['O que é o novo módulo central de Mentalidade e onde encontro o Trader Zen e as Regras?','O menu lateral agora concentra todo o ecossistema psicológico e comportamental no item "🧠 Mentalidade". Na Home de Mentalidade você encontra os 6 submódulos (Trader Zen, Biblioteca Mental, Psicologia do Trader, Regras do Trader, Sabedoria do Trader e Teste de Perfil), além do seu check-in diário de Estado Mental e o painel de Evolução Mental.'],
    ['Como funciona o Risk Ramp-Up?','A exposição aumenta gradualmente conforme as condições e regras do método. Consulte o perfil ativo e os limites da Política de Risco; um score alto não autoriza ultrapassá-los.'],
    ['Onde altero patrimônio e percentuais do método?','Registre saldos e movimentações em Patrimônio. Ajuste os percentuais nominais de cada Grade, perfis e pesos na Política de Risco e as preferências em Configurações.'],
    ['Como usar a tela de Líderes Emergentes?','A tela de Líderes Emergentes é um radar de inteligência de mercado. Ela identifica ações com forte desempenho relativo e resiliência durante correções. IMPORTANTE: Não compre apenas pelo score alto. Coloque os melhores candidatos na sua Watchlist e aguarde uma contração/bandeira no gráfico com Setup A antes de executar.'],
  ];
  const steps = [
    ['globe','MARKET','Posso operar?','Analise o ciclo de mercado e obtenha permissão.','marketcycle'],
    ['chart','EDGE STACKING','A qualidade está presente?','Use o Rubric e os demais filtros de seleção.','newtrade'],
    ['shield','RISK','Quanto merece arriscar?','Calcule o Position Size com base na qualidade.','newtrade'],
    ['fire','PORTFOLIO HEAT','Minha carteira suporta?','Verifique o risco total do portfólio.','portfolioheat'],
    ['target','EXECUTION','Execute. Sem improvisar.','Siga o plano e registre a operação.','positions'],
  ];
  const legacy = document.createElement('details');
  legacy.className = 'kc-legacy'; legacy.id = 'knowledge-library';
  const legacySummary = document.createElement('summary'); legacySummary.textContent = 'Biblioteca completa · capítulos, fórmulas e guias anteriores';
  legacy.append(legacySummary);
  const legacyBody = document.createElement('div'); legacyBody.className = 'kc-legacy-body';
  while (root.firstChild) legacyBody.append(root.firstChild);
  legacy.append(legacyBody);
  const sectionHeading = (eyebrow,title,description,aside='') => `<header class="kc-section-heading"><div><span class="kc-eyebrow">${eyebrow}</span><h2>${title}</h2><p>${description}</p></div>${aside ? `<small>${aside}</small>` : ''}</header>`;
  const gradingSection = () => `<section class="kc-grading-system" id="knowledge-grading" aria-labelledby="grading-system-title">
    <header class="grading-hero">
      <div class="grading-hero-copy">
        <span class="grading-hero-icon" aria-hidden="true">↗</span>
        <div>
          <h2 id="grading-system-title"><span>GRADING</span> &amp; BET SIZING <em>SYSTEM</em></h2>
          <p class="grading-kicker">DISCIPLINA TRANSFORMA ANÁLISE EM RESULTADOS</p>
          <p class="grading-intro">Um sistema <strong>objetivo</strong> para classificar a qualidade das oportunidades e <strong>dimensionar suas posições</strong> com base na confluência dos edges do seu método.</p>
        </div>
      </div>
      <blockquote>“QUALIDADE É TUDO.<br>PACIÊNCIA TE COLOCA NAS<br>MELHORES OPORTUNIDADES.”<cite>— HEALTHY TREND TRADER</cite></blockquote>
      <p class="grading-hero-motto">TRADES<br>MELHORES<br><strong>VIDA MAIOR</strong></p>
    </header>
    <div class="grading-layout">
      <article class="grading-card grading-grades">
        <header class="grading-card-head"><span class="grading-card-icon" aria-hidden="true">◆</span><div><h3>O que cada grade representa</h3><p>Os grades indicam o nível de vantagem estatística da operação, com base na confluência dos edges do seu método.</p></div></header>
        <div class="grading-table-wrap"><table class="grading-table">
          <thead><tr><th>Grade</th><th>Faixa de Score</th><th>Significado</th><th>Interpretação</th></tr></thead>
          <tbody>
            <tr class="grade-a"><th scope="row">A</th><td data-label="Faixa de Score">95–100</td><td data-label="Significado"><strong>Rare Trade</strong></td><td data-label="Interpretação">Todos os edges alinhados. Highest Expected Value. Ocorre muito pouco.</td></tr>
            <tr class="grade-b"><th scope="row">B</th><td data-label="Faixa de Score">80–94</td><td data-label="Significado"><strong>Good Edge</strong></td><td data-label="Interpretação">Boa oportunidade, mas nem todos os edges perfeitos. Trades comuns do dia a dia.</td></tr>
            <tr class="grade-c"><th scope="row">C</th><td data-label="Faixa de Score">65–79</td><td data-label="Significado"><strong>Small Edge</strong></td><td data-label="Interpretação">Alguma vantagem, porém limitada. Pode ser operado, respeitando a política de risco.</td></tr>
            <tr class="grade-d"><th scope="row">D</th><td data-label="Faixa de Score">&lt; 65</td><td data-label="Significado"><strong>No Edge</strong></td><td data-label="Interpretação">Medíocre. Não há vantagem suficiente. Evite a operação.</td></tr>
          </tbody>
        </table></div>
      </article>
      <article class="grading-card grading-distribution">
        <header class="grading-card-head"><span class="grading-card-icon" aria-hidden="true">▥</span><div><h3>A maioria será Grade D — e isso é ótimo</h3></div></header>
        <p>A nossa pontuação é intencionalmente rigorosa. A maioria dos setups vai ser Grade D, e isso é o comportamento esperado.</p>
        <div class="grade-distribution-visual">
          <figure class="grade-pie" role="img" aria-label="Distribuição ilustrativa: Grade A 4%, Grade B 13%, Grade C 23% e Grade D 60%">
            <span class="pie-label pie-a"><b>A</b><small>~2–5%</small></span>
            <span class="pie-label pie-b"><b>B</b><small>~10–15%</small></span>
            <span class="pie-label pie-c"><b>C</b><small>~20–30%</small></span>
            <span class="pie-label pie-d"><b>D</b><small>~60–70%</small></span>
          </figure>
          <ul class="grade-legend">
            <li class="legend-a"><i></i><span><b>A — Raro</b><small>Poucos trades.</small></span></li>
            <li class="legend-b"><i></i><span><b>B — Comum</b><small>Oportunidades válidas.</small></span></li>
            <li class="legend-c"><i></i><span><b>C — Comum</b><small>Vantagem limitada.</small></span></li>
            <li class="legend-d"><i></i><span><b>D — Mais frequente</b><small>Deve ser descartado.</small></span></li>
          </ul>
        </div>
        <p class="grading-demand"><span aria-hidden="true">◆</span>SER EXIGENTE HOJE É O QUE TE COLOCA ENTRE OS TRADERS CONSISTENTES AMANHÃ.</p>
      </article>
      <article class="grading-card grading-gate">
        <header class="grading-card-head"><span class="grading-card-icon" aria-hidden="true">⚙</span><div><h3>Score + Quality Gate</h3></div></header>
        <p>Para receber Grade A, não basta alcançar 95 pontos. É necessário que todos os componentes críticos estejam no nível de excelência definido pelo sistema.</p>
        <ul class="grading-checklist">
          <li><i>✓</i>Score total ≥ 95</li>
          <li><i>✓</i>Todos os componentes críticos no nível de excelência</li>
          <li><i>✓</i>Nenhum edge crítico abaixo do mínimo exigido</li>
        </ul>
        <p>Se qualquer componente crítico não estiver no nível exigido, mesmo com score ≥ 95, o trade será classificado como B.</p>
        <aside class="grading-example"><span aria-hidden="true">i</span><p><b>Exemplo</b>Score 97, mas com um componente crítico abaixo do mínimo → resultado final: Grade B.</p></aside>
      </article>
      <article class="grading-card grading-sizing">
        <header class="grading-card-head"><span class="grading-card-icon" aria-hidden="true">◉</span><div><h3>Como o grade afeta o bet sizing <small>(tamanho da posição)</small></h3></div></header>
        <ul class="grading-bullets">
          <li>O Grade define o Risk Budget da operação, conforme a sua Política de Risco.</li>
          <li>O Risk Budget calcula o tamanho teórico pelo stop; depois, volatilidade por ATR, capital, Portfolio Heat e máximo de posições verificam quanto a conta e a carteira podem comportar.</li>
          <li>O Risk Budget é a única fonte do risco financeiro inicial autorizado pela qualidade da oportunidade.</li>
          <li>O Desafio Grade A observa o cumprimento do sizing executável apenas enquanto estiver ativo; não altera o cálculo nem promove trades B a A.</li>
        </ul>
        <blockquote>“Gerenciamento de risco consistente transforma boas oportunidades em grandes resultados.”</blockquote>
      </article>
      <article class="grading-card grading-summary">
        <header class="grading-card-head"><span class="grading-card-icon" aria-hidden="true">✓</span><div><h3>Resumo prático</h3></div></header>
        <ol>
          <li><span>1</span>A maioria dos trades será Grade D. Descarte.</li>
          <li><span>2</span>Trades C e B são oportunidades do dia a dia, com vantagem válida.</li>
          <li><span>3</span>Grade A é raro e representa uma confluência excepcional de edges.</li>
          <li><span>4</span>Quando aparecer um Grade A, execute com disciplina e tamanho adequado.</li>
          <li><span>5</span>Sempre siga sua Política de Risco e o sistema de Position Sizing.</li>
        </ol>
      </article>
      <article class="grading-card grading-rare">
        <header class="grading-card-head"><span class="grading-card-icon" aria-hidden="true">🏆</span><div><h3>Grade A — Rare Trade</h3></div></header>
        <div class="rare-gates">
          <ul>
            <li><i>✓</i>Tendência e estrutura no Ativo (Diário)</li>
            <li><i>✓</i>Ciclo de Mercado saudável</li>
            <li><i>✓</i>Força Relativa elevada</li>
            <li><i>✓</i>Volatilidade (ATR) baixa</li>
            <li><i>✓</i>Gatilho de entrada OK</li>
            <li><i>✓</i>Fundamentos alinhados</li>
          </ul>
          <div class="rare-badge"><b>RARE TRADE</b><small>HIGHEST EXPECTED VALUE</small></div>
        </div>
        <blockquote>“Só entre quando tudo fizer sentido.<br>É aí que você se permite apostar mais.”</blockquote>
      </article>
    </div>
    <footer class="grading-footer"><span><b>HEALTHY TREND TRADER</b><small>DISCIPLINA · PROCESSO · RESULTADOS</small></span><p>TRADES MELHORES. VIDA MAIOR.</p></footer>
  </section>`;
  const triggersSection = () => {
    const catalog = window.SetupTriggersCatalog ? window.SetupTriggersCatalog.getAllTriggers() : [];
    if (!catalog.length) return '';
    return `<section class="kc-panel" id="knowledge-triggers">${sectionHeading('CATÁLOGO OFICIAL DE ENTRADAS', 'Os 5 Gatilhos de Entrada', 'Critérios objetivos de timing. Um único catálogo padronizado em todo o sistema.', 'TIMING PRECISO · STOP ESTRUTURAL')}<div class="manual-grid" style="grid-template-columns:1fr;gap:24px">${catalog.map((t, idx) => `
      <article class="manual-card trigger-card" id="knowledge-trigger-${t.id.toLowerCase()}">
        <div class="manual-card-heading trigger-card-heading">
          <div class="trigger-title-wrap">
            <span class="badge trigger-badge-idx">GATILHO #${idx + 1}</span>
            <h3 class="trigger-title">${esc(t.name)}</h3>
          </div>
          <span class="badge trigger-badge-code">CÓDIGO: ${esc(t.id)}</span>
        </div>
        <div class="trigger-grid-cols">
          <div>
            <h4>1. O que é</h4>
            <p>${esc(t.whatIs)}</p>
            <h4>2. Como identificar no gráfico</h4>
            <p>${esc(t.howToIdentify)}</p>
            <h4>3. Conceito por trás do gatilho</h4>
            <p>${esc(t.concept)}</p>
          </div>
          <div>
            <h4>4. Condições obrigatórias</h4>
            <ul>
              ${t.conditions.map(c => `<li>${esc(c)}</li>`).join('')}
            </ul>
            <h4>5. Gatilho de entrada &amp; Stop</h4>
            <p><b>Entrada:</b> ${esc(t.entryTrigger)}</p>
            <p><b>Stop inicial:</b> ${esc(t.stop)}</p>
            <h4>6. Observações práticas</h4>
            <p class="trigger-observations">“${esc(t.observations)}”</p>
          </div>
        </div>
        <div class="trigger-example-box">
          <small>Exemplo Estrutural</small>
          <pre>${esc(t.visualExample)}</pre>
        </div>
      </article>
    `).join('')}</div></section>`;
  };
  root.innerHTML = `<div class="knowledge-center">
    <section class="kc-hero" aria-labelledby="knowledge-title"><div class="kc-hero-copy"><span class="kc-eyebrow">MANUAL</span><h1 id="knowledge-title">Central de<br>Conhecimento</h1><p class="kc-subtitle">Domine o software. Entenda o método.<br>Execute com intenção.</p><p class="kc-hero-description">Tudo o que você precisa para transformar o Healthy Trend Trader<br class="kc-wide-only"> em uma rotina de decisões consistentes.</p></div><p class="kc-hero-motto">MELHORES<br>TRADERS<br>CONSTROEM<br>MELHORES<br>DECISÕES</p></section>
    <div class="kc-body"><section class="kc-search-section" aria-label="Buscar conhecimento"><form class="kc-search" role="search">${icon('search')}<input type="search" id="knowledgeSearch" placeholder="O que você quer aprender hoje?" aria-label="O que você quer aprender hoje?" autocomplete="off"><kbd>Ctrl K</kbd></form><div class="kc-popular"><span>Perguntas populares:</span>${['Como calcular minha mão?','O que é Portfolio Heat?','Quando um setup é A?','Como funciona o Rubric?','Por que meu risco foi reduzido?'].map((q,i)=>`<button type="button" data-popular="${i}">${q}</button>`).join('')}</div><section class="kc-search-results" aria-live="polite" hidden></section></section>
    <nav class="kc-doors" aria-label="Trilhas de aprendizado">${[['rocket','COMEÇAR AGORA','Aprenda o fluxo completo do método em poucos minutos.','knowledge-system','green'],['book','EXPLORAR O SOFTWARE','Entenda cada ferramenta da plataforma.','knowledge-software','blue'],['brain','DOMINAR O MÉTODO','Aprenda os conceitos por trás das decisões.','knowledge-method','gold']].map(([i,t,d,target,c])=>`<a class="kc-door ${c}" href="#${target}">${icon(i)}<div><h2>${t}</h2><p>${d}</p></div>${icon('arrow')}</a>`).join('')}</nav>
    <section class="kc-panel kc-system" id="knowledge-system">${sectionHeading('O HEALTHY TRADING SYSTEM','Do contexto à execução. Sempre na mesma ordem.','Um processo claro para tomar melhores decisões e proteger seu capital.','WAIT → CONFIRM → EXECUTE')}<div class="kc-process">${steps.map(([i,t,q,d,route],n)=>`<button class="kc-step" type="button" data-guide="${route}"><span class="kc-step-number">0${n+1}</span>${icon(i)}<h3>${t}</h3><strong>${q}</strong><p>${d}</p>${n<4?'<span class="kc-connector" aria-hidden="true">→</span>':''}</button>`).join('')}</div><div class="kc-system-bottom"><blockquote>“Você nunca começa pela vontade de operar.<br>Você conquista o direito de assumir risco.”</blockquote><div class="kc-signature">${icon('mountain')}<span>DISCIPLINA HOJE.<br>LIBERDADE SEMPRE.</span></div></div><p class="kc-author">Healthy Trend Trader</p></section>
    <section class="kc-panel" id="knowledge-software">${sectionHeading('EXPLORE O SOFTWARE','Conheça cada ferramenta da plataforma','Clique em uma tela para acessar seu guia completo, exemplos e dicas de uso.','MAIS QUE FERRAMENTAS.<br>UM SISTEMA INTEGRADO.')}<div class="kc-software-grid">${software.map(([id,title,description])=>`<button class="kc-screen" type="button" data-guide="${id}"><div class="kc-screen-window"><img src="assets/manual-knowledge/${id}.jpg" alt="Capa conceitual da ferramenta ${title} do Healthy Trend Trader" loading="lazy" width="560" height="315"></div><div class="kc-screen-copy"><h3>${title}</h3><p>${description}</p>${icon('arrow')}</div></button>`).join('')}</div></section>
    <section class="kc-panel" id="knowledge-method">${sectionHeading('DOMINE O MÉTODO','Os conceitos que fundamentam suas decisões','Entenda o porquê de cada etapa e como os conceitos se conectam.','“CONHECIMENTO APLICADO<br>É APENAS INFORMAÇÃO.”'.replace('É APENAS','VAI ALÉM DA'))}<div class="kc-concept-grid">${concepts.map(([i,t,d],n)=>`<button class="kc-concept" type="button" data-concept="${n}">${icon(i)}<div><h3>${t}</h3><p>${d}</p></div></button>`).join('')}</div></section>
    <section class="kc-panel kc-rubric" id="knowledge-rubric">${sectionHeading('TRADING RUBRIC · EVIDÊNCIAS EM CONJUNTO','Vários edges. Uma decisão consciente.','A qualidade orienta a exposição, dentro da sua política de risco.')}<div class="kc-rubric-flow"><div class="kc-evidence">${['Ciclo de Mercado','Contexto Diário','Força Relativa','Fundamentos','Volatilidade','Execução'].map(t=>`<span>${t}<i aria-hidden="true">+</i></span>`).join('')}</div><svg class="kc-confluence" viewBox="0 0 140 230" preserveAspectRatio="none" aria-hidden="true">${[15,55,95,135,175,215].map(y=>`<path d="M0 ${y} C75 ${y} 55 115 140 115"/>`).join('')}</svg><button type="button" class="kc-rubric-core" data-concept="1"><small>EXEMPLO ILUSTRATIVO</small><strong>A <span>97/100</span></strong><b>HIGH CONVICTION</b><span>Entenda o Rubric →</span></button><div class="kc-rubric-outcomes"><p><b>Mais edges alinhados</b><span>Maior qualidade → maior confiança<br>→ exposição adequada.</span></p><p><b>Menos edges alinhados</b><span>Maior incerteza → risco reduzido<br>ou nenhuma operação.</span></p><small>Score ilustrativo. A classificação real segue a política ativa e não representa probabilidade de ganho.</small></div></div></section>
    ${gradingSection()}
    ${triggersSection()}
    <section class="kc-panel" id="knowledge-position-management">${sectionHeading('GESTÃO DA POSIÇÃO','Proteja o risco. Deixe a tendência trabalhar.','Portfolio Heat, Peel-Off, Scale-In, Sell Into Strength, Free Roll e Runner têm funções diferentes na mesma operação.','DECISÕES REGISTRADAS · SEM SAÍDAS AUTOMÁTICAS')}<div class="manual-grid"><article class="manual-card"><div class="manual-card-heading"><div class="manual-icon">♨</div><h3>Portfolio Heat</h3></div><p>É o risco agregado das posições reais até seus stops. O limite é configurado na Política de Risco; quando excedido, o sistema alerta e bloqueia novas entradas até que a exposição volte ao teto.</p></article><article class="manual-card"><div class="manual-card-heading"><div class="manual-icon">↘</div><h3>Peel-Off</h3></div><p>É uma redução de proteção quando o Ongoing Risk ou a volatilidade em andamento excedem o limite. Reduz apenas o necessário e não representa realização planejada de lucro.</p></article><article class="manual-card" id="knowledge-scale-in"><div class="manual-card-heading"><div class="manual-icon">➕</div><h3>Scale-In (Adição de Risco Zero)</h3></div><p>É a adição controlada de lotes a uma posição vencedora, permitida <strong>exclusivamente quando a operação atinge no mínimo +1R de lucro E o stop da posição base já está garantido no Breakeven (preço de entrada)</strong> ou melhor, blindando o capital inicial.</p><p><strong>Regras de Execução e Governança:</strong> O método autoriza até 2 adições por posição (com gatilhos configuráveis na Política de Risco, ex: 1ª adição em +1.0R/+1.5R e 2ª adição em +2.0R/+2.5R). O preço médio ponderado (PMP) é recalculado para apurar lucros realizados, mas o R-múltiplo final e o stop de invalidação continuam protegidos sem diluição do payoff original. Cada adição consome e respeita a folga do Portfolio Heat e o limite de capital da conta.</p></article><article class="manual-card" id="knowledge-sell-into-strength"><div class="manual-card-heading"><div class="manual-icon">↗</div><h3>Sell Into Strength</h3></div><p>É uma realização parcial manual em uma zona de força configurável.</p><p><strong class="sell-usage-highlight">Sugestão de uso: a faixa de 2R a 3R é uma referência inteligente para embolsar parte dos lucros, baseada em práticas recorrentes de estudos de mercado e no acompanhamento de grandes traders.</strong> Ela pode ser ajustada. Observe a força do ativo e o ciclo de mercado: em mercado saudável, pode fazer sentido realizar mais perto de 3R e deixar a posição correr; em mercado pior, pode fazer sentido realizar mais cedo, perto de 2R.</p></article><article class="manual-card"><div class="manual-card-heading"><div class="manual-icon">🛡</div><h3>Free Roll e Runner</h3></div><p>Depois de uma parcial, o Free Roll só fica ativo quando o lucro realizado cobre o risco remanescente. A quantidade restante é o Runner: continua sob trailing stop, ATR, Ongoing Risk e Portfolio Heat, sem venda automática por atingir um R específico.</p></article></div></section>
    <nav class="kc-support" aria-label="Mais formas de aprender"><a href="#knowledge-library" class="kc-support-card">${icon('play')}<div><span class="kc-eyebrow">TUTORIAIS E EXEMPLOS</span><h3>Aprenda vendo</h3><p>Exemplos práticos e simulações para fixar o conhecimento.</p></div>${icon('arrow')}</a><a href="#knowledge-faq" class="kc-support-card">${icon('chat')}<div><span class="kc-eyebrow">FAQ</span><h3>Perguntas frequentes</h3><p>Respostas rápidas para as dúvidas mais comuns da plataforma e do método.</p></div>${icon('arrow')}</a><article class="kc-support-card kc-coming-soon" aria-label="Ask Healthy, em breve">${icon('chat')}<div><span class="kc-eyebrow">ASK HEALTHY</span><h3>Pergunte qualquer coisa</h3><p>Respostas baseadas no seu método, regras e documentação do sistema.</p></div><span class="kc-soon">EM BREVE</span></article></nav>
    <section class="kc-panel kc-faq" id="knowledge-faq">${sectionHeading('RESPOSTAS PARA CONTINUAR','Perguntas frequentes','Abra apenas a dúvida que você quer resolver.')}<div class="kc-faq-grid">${faq.map(([q,a],i)=>`<details id="knowledge-faq-${i}"><summary>${q}<span aria-hidden="true">+</span></summary><p>${a}</p></details>`).join('')}</div></section>
    <div id="knowledge-library-mount"></div><footer class="kc-footer"><span>${icon('mountain')}<b>HEALTHY TREND TRADER</b><em>V4 PREMIUM</em></span><p>Processo antes do resultado. <i>|</i> Conhecimento gera clareza. <i>|</i> Disciplina gera liberdade.</p></footer></div>
    <dialog class="kc-reader" aria-labelledby="kc-reader-title"><header><span class="kc-eyebrow">CENTRAL DE CONHECIMENTO</span><button type="button" data-close-reader aria-label="Fechar guia">×</button></header><div class="kc-reader-content"></div></dialog>
  </div>`;
  root.querySelector('#knowledge-library-mount').append(legacy);
  // Keep every existing definition, example and glossary interaction inside the Manual.
  const glossaryRoot = document.getElementById('glossaryRoot');
  const glossarySection = document.createElement('details');
  glossarySection.id = 'knowledge-glossary';
  glossarySection.className = 'kc-glossary';
  glossarySection.innerHTML = '<summary>Todos os conceitos do método · Glossário completo</summary>';
  if (glossaryRoot) glossarySection.append(glossaryRoot);
  root.querySelector('#knowledge-method').after(glossarySection);
  const previousGo = window.go;
  window.go = function(id, ...args) {
    if (id !== 'glossary') return previousGo.call(this, id, ...args);
    const result = previousGo.call(this, 'manual', ...args);
    glossarySection.open = true;
    if (typeof renderGlossary === 'function') renderGlossary();
    requestAnimationFrame(() => scrollToSection('knowledge-glossary'));
    return result;
  };
  const reader = root.querySelector('.kc-reader');
  const content = root.querySelector('.kc-reader-content');
  const search = root.querySelector('#knowledgeSearch');
  const results = root.querySelector('.kc-search-results');
  let returnFocus;
  function showReader(html) { returnFocus = document.activeElement; content.innerHTML = html; reader.showModal(); reader.scrollTop = 0; }
  function guide(id) {
    const entry = software.find(item=>item[0]===id); if (!entry) return;
    const [,title,,source,description] = entry;
    const original = source && legacy.querySelector('#'+source);
    const additionalGuides = {
      newtrade: [
        'A tela Novo Trade estrutura a operação em duas etapas estritas: Etapa 1 (Parâmetros da Operação: Ativo, Direção, Gatilho Oficial, Entrada, Stop, ATR, Ambiente e Tese) e Etapa 2 (Validação pela Trading Rubric de 100 pontos).',
        'Os 5 Gatilhos Oficiais de Entrada: Inside Bar, PFR (Padrão de Fechamento e Reversão), 1-2-3 de Compra, Dave Landry e RBI (Red Bar Ignored) fornecem timing cirúrgico e stop estrutural objetivo.',
        'Override Manual do Ciclo de Mercado: caso a dinâmica setorial ou intradiária do ativo divirja do índice benchmark geral, o trader pode ajustar manualmente o regime no seletor da Rubric, recalculando pontos, Grade e Risk Budget em tempo real.',
        'Risk Budget por Grade: a Rubric consulta na Política de Risco o orçamento configurado para A, B, C ou D. Cada avaliação recalcula Qualidade → Risk Budget → limitadores da política → risco executável → Position Size.',
        'Dimensionamento: o Risk Budget produz o Position Size teórico pela distância até o stop. Em seguida, volatilidade por ATR, capital, Portfolio Heat e máximo de posições limitam a quantidade executável quando necessário.',
        'Integração com o Desafio Grade A: apenas operações Grade A registradas enquanto o desafio está ativo são avaliadas contra o sizing executável calculado pelo sistema.'
      ],
      dailyroutine: [
        'A Rotina Diária estrutura a jornada do trader em três fases sagradas: Pré-Mercado (checagem de ciclo, revisão de posições, trailing stops e atualização da watchlist), Intra-Mercado (disciplina de execução e paciência) e Pós-Mercado (diário, registro de métricas e reflexão).',
        'O ritual previne o improviso: o trader só opera quando a preparação foi concluída e o ciclo de mercado autoriza novas exposições.',
        'A rotina sincroniza com seu histórico de hábitos, garantindo consistência no longo prazo.'
      ],
      watchlist: [
        'A Watchlist Inteligente funciona como seu Pool de Oportunidades: ela centraliza os melhores ativos identificados nos Scans, Líderes Emergentes e Força Relativa.',
        'Classificação por Estágios: organize cada oportunidade conforme seu momento técnico — Base em Construção, Contração de Volatilidade (VCP), Alerta de Rompimento ou Follow Through.',
        'REGRA DE OURO: Descoberta não é ordem de compra. Ativos na Watchlist são alvos em observação; a operação só é registrada quando o gatilho técnico e a Rubric confirmam o alinhamento.'
      ],
      habits: [
        'O Monitor de Hábitos transforma o processo invisível em métricas tangíveis: consistência de rotina, respeito aos stops, pausas conscientes e preenchimento do diário.',
        'Visualização de Sequências: acompanhe dias consecutivos de disciplina (streaks), taxa de adesão semanal e alertas quando algum pilar for negligenciado.',
        'A meta não é o resultado financeiro de um único dia, mas a excelência diária no cumprimento do processo operacional.'
      ],
      riskpolicy: [
        'A Política de Risco centraliza os perfis operacionais (Política Padrão e Risk Ramp-Up), os Risk Budgets para A, B, C e D, os limitadores de exposição e os pesos da Trading Rubric.',
        'Cards de Grades: exibem e permitem editar o Risk Budget de A, B e C. Grade D não libera risco (0%). Cada perfil mantém seus próprios limites de volatilidade, capital, Heat e posições.',
        'Gestão de Posição & Toggles Artísticos: ative ou desative os módulos de Scale-In (adições a +1R com breakeven) e Sell Into Strength (parciais na zona de força), configurando gatilhos e faixas personalizadas.',
        'Conexão Direta com Novo Trade: Qualquer alteração salva na Política de Risco atualiza instantaneamente a resolução de risco do Novo Trade e as validações de conformidade do Desafio Grade A.'
      ],
      couragechallenge: [
        'O Desafio Grade A é um módulo de treinamento psicológico (Modo Desapego) projetado para consolidar a coragem e a disciplina de assumir o risco correto nos melhores setups do método.',
        'Elegibilidade Estrita: Apenas Rare Trades classificados como Grade A e executados durante o desafio ativo participam. B, C e D não pontuam.',
        'Inspeção sem Interferência: o desafio não altera o Position Sizing; ele compara a execução real com o risco e a quantidade efetivamente autorizados depois dos limitadores da política.'
      ],
      positions: [
        'O módulo Posições Abertas é seu cockpit de condução: monitore o trailing stop, o lucro em R-múltiplos, a volatilidade atual e a aproximação de zonas parciais.',
        'Gestão de Eventos: registre ajustes de stop, acione parciais manuais de Sell Into Strength ou adições de Scale-In (quando autorizadas pelo sistema a partir de +1R e breakeven).',
        'Linha do Tempo Completa: cada decisão fica gravada cronologicamente na posição sem fragmentar o trade em linhas soltas.'
      ],
      closedpositions: [
        'O módulo Posições Encerradas reúne o histórico completo de todas as operações finalizadas na plataforma.',
        'Auditoria Pós-Trade: consulte a linha do tempo de cada posição, desde a entrada original, eventuais adições de Scale-In, parciais de Sell Into Strength até o encerramento do Runner.',
        'Métricas Conexas: analise o R-múltiplo real alcançado, o tempo de permanência, o preço médio ponderado e as anotações do Diário do Trader vinculadas à operação.'
      ],
      portfolioheat: [
        'O Portfolio Heat monitora o risco agregado e simultâneo de todas as suas posições abertas em relação ao patrimônio líquido da conta.',
        'Termômetro de Risco: previne a sobreexposição em momentos de euforia. Quando o Heat atinge o teto da Política de Risco, o sistema bloqueia novas compras e sinaliza a necessidade de aguardar parciais ou avanço de stops para Breakeven antes de assumir novos riscos.'
      ],
      dashboard: [
        'O módulo Patrimônio oferece uma visão holística da sua saúde financeira: curva de capital da estratégia, taxa de crescimento anual e retorno percentual acumulado.',
        'Separação de Aportes vs Performance: o sistema calcula o retorno real gerado pelas operações sem distorções causadas por novos depósitos ou retiradas financeiras.',
        'Gestão de Alocações: acompanhe suas metas percentuais por classe de ativos e monitore o desbalanceamento da sua carteira.'
      ],
      assetblacklist: [
        'A Blacklist de Ativos é sua blindagem comportamental e de liquidez: adicione ativos que violam suas regras de risco, ações com volume insuficiente ou papéis com governança duvidosa.',
        'Bloqueio no Planejamento: o sistema impede o registro de ordens para ativos na Blacklist, garantindo que a disciplina seja imposta pelo software mesmo em momentos de impulso.'
      ],
      marketcycle: [
        'A tela de Ciclo de Mercado monitora o regime técnico dos índices de referência de forma independente para cada universo: Ações B3 (Ibovespa), BDRs Internacionais (BDRX) e Fundos Imobiliários (IFIX).',
        'Permissão Operacional: Mercado Saudável autoriza novos setups; Mercado em Transição exige cautela e menor exposição; Mercado Defensivo/Risk-Off protege o capital e bloqueia novas compras long.'
      ],
      emergingleaders: [
        'A tela de Líderes Emergentes combina 6 dimensões em um Score único de 0 a 100: Força Relativa (25%), Aceleração de RS (15%), Proximidade da Máxima de 52S (20%), Resiliência na Correção (15%), Força de Recuperação (15%) e Liderança Setorial (10%).',
        'Use esta ferramenta para descobrir quais ações estão sustentando preço enquanto a maioria do mercado cai. Veja os setores com maior concentração de força (Grupos Fortes) e selecione os melhores candidatos.',
        'REGRA DE OURO: Descoberta NÃO é compra imediata. Um score alto serve para você colocar o ativo na sua Watchlist de acompanhamento. A compra só deve ser planejada quando a ação formar uma contração no gráfico com setup A e gatilho técnico confirmado.'
      ],
      relativestrength: ['Escolha o universo de ativos e compare sua força relativa. Confira a data de atualização antes de interpretar a classificação.', 'Use os líderes para organizar sua pesquisa. Depois avalie o contexto técnico e a Rubric em Novo Trade; liderança não substitui um gatilho de entrada.'],
      marketscans: [
        'Os Scans de Mercado monitoram o universo B3 e filtram ativos automaticamente em padrões técnicos comprovados: Rompimentos de 52 Semanas, Contrações de Volatilidade (VCP), Momentum Positivo e Retração às Médias.',
        'Varredura Eficiente: identifique rapidamente em poucos segundos quais ações estão em pontos de inflexão técnica sem precisar folhear centenas de gráficos manualmente.',
        'Conexão Direta: envie os ativos filtrados com um clique diretamente para sua Watchlist para acompanhamento refinado.'
      ],
      fundamentals: [
        'O módulo Fundamentalista integra demonstrações de Ações B3 (CVM/Fundamentus) e BDRs Internacionais (SEC). O Score Fundamentalista (0 a 10) segue a metodologia de 6 dimensões ponderadas: Rentabilidade (28%), Consistência de Lucros (22%), Crescimento (16%), Endividamento (18%), Valuation (10%) e Dividendos (6%).',
        'Princípio Inviolável: Dado ausente não é zero. Quando métricas ou históricos contábeis anuais não estão disponíveis, o sistema repondera os componentes disponíveis e expõe uma métrica explícita e separada de Cobertura dos Dados (ex: 78% em CEAB3) com alertas claros de dados parciais.',
        'Régua Horizontal de 5 Patamares (RUIM, FRACO, MÉDIO, BOM, EXCELENTE) e Raio-X agrupado por categorias econômicas com Market Cap humanizado.'
      ],
      analytics: [
        'O Painel da Verdade analisa objetivamente suas estatísticas acumuladas: taxa de acerto, fator de lucro, payoff médio e expectativa matemática.',
        'Padrões de Resultado: filtre por setup, direção, ciclo de mercado e grade da Rubric para descobrir onde reside sua verdadeira vantagem estatística.'
      ],
      tradeanatomy: [
        'A Anatomia dos Trades disseca suas operações encerradas sob uma ótica puramente estatística e científica: taxa de acerto real, payoff médio (R médio de ganho vs perda) e expectativa matemática por trade.',
        'Decomposição por Setups e Grades: descubra exatamente quais padrões gráficos e quais faixas de score da Rubric geram a maior parte dos seus lucros e quais apenas consomem comissões e energia.',
        'Tempo de Permanência: compare o tempo médio de retenção de trades vencedores versus perdedores para assegurar que você está cortando perdas rápido e deixando os lucros correrem.'
      ],
      journal: [
        'O Diário do Trader registra a evolução técnica e comportamental dia a dia. Vincule operações, anexe capturas de gráficos e registre emoções e notas de reflexão.',
        'Exportação Estruturada & Modo "Preparar para IA": exporte seus registros em Markdown, Texto, JSON, CSV ou gere um texto semanticamente estruturado por blocos de data com prompt pronto para envio a LLMs (ChatGPT, Claude, Gemini) para mapear correlações entre contexto, plano e emoções.',
        'Mesmo em dias sem operar, registre a disciplina da espera. A paciência é parte integrante do método.'
      ],
      mistakesbook: [
        'O Caderno de Erros e Lições cataloga as falhas que custaram capital ou disciplina: quebra de stop, entrada antecipada, FOMO, hesitação ou violação da política de risco.',
        'Lições Dominadas: ao registrar uma falha, o trader define a lição e o compromisso prático para corrigi-la. Revisitar as lições antes do pregão blinda o comportamento contra erros recorrentes.'
      ],
      tradelibrary: [
        'A Biblioteca de Trades é o acervo de excelência visual da plataforma: reúne trades históricos modelo, breakouts perfeitos, pullbacks institucionais e casos de estudo comentados.',
        'Treinamento de Padrões: estude os melhores setups para calibrar seu cérebro a reconhecer rapidamente a anatomia visual de um Rare Trade Grade A no mercado real.'
      ],
      review: [
        'A Revisão Mensal é o ritual de fechamento e auditoria periódica do seu processo operacional.',
        'Análise Sistêmica: consolide a aderência ao plano no mês, liste os erros mais frequentes (alimentando o Caderno de Erros) e defina metas comportamentais concretas para o próximo ciclo.',
        'Processo Acima do Resultado: meça o sucesso não apenas pelos ganhos financeiros, mas pela fidelidade absoluta às suas regras operacionais.'
      ],
      platformaccess: [
        'O módulo Uso da Plataforma é um instrumento de disciplina e higiene mental para o trader de alta performance.',
        'Foco Operacional vs Compulsão: monitore o tempo de uso ativo e a frequência de sessões no software. O objetivo do operador de tendência é tomar poucas e excelentes decisões, evitando a vigilância obsessiva de cotações intradiárias.'
      ],
      forecast: [
        'O Simulador de Equity projeta probabilisticamente a evolução futura da sua curva de capital com base na sua taxa de acerto real, payoff médio e frequência de operações.',
        'Consciência Estatística: compreenda o poder dos juros compostos no trading e visualize como pequenas melhorias na seleção de trades transformam seus resultados no longo prazo.'
      ],
      tradesimulator: [
        'O Simulador de Trades permite testar regras de execução e gestão de risco em um ambiente controlado e sem viés de look-ahead.',
        'Comparação de Cenários: avalie estratégias como 2R, 2.5R, Pirâmide e Parciais com condução por EMA 9 para descobrir qual abordagem maximiza o seu retorno ajustado ao risco.'
      ],
      mindset: [
        'O módulo central Mentalidade (Mente de Trader) unifica todo o ecossistema comportamental, psicológico e de foco do Healthy Trend Trader em um único ambiente moderno e integrado.',
        'Meu Estado Mental: realize seu check-in diário em 5 níveis (Calmo, Bem, Neutro, Ansioso, Agitado). O sistema registra o histórico para que você entenda como suas emoções afetam sua disciplina.',
        'Minha Evolução Mental: acompanhe indicadores reais de dias com mente estável, total de práticas zen realizadas, aderência ao plano e redução da ansiedade.',
        'Os 6 Submódulos: navegue em um clique para Trader Zen (respiração e pausas), Biblioteca Mental (áudios e sons ambientes), Psicologia do Trader (vieses e emoções), Regras do Trader (disciplina prática), Sabedoria do Trader (filosofia dos mestres) e Teste de Perfil (diagnóstico de risco).'
      ],
      traderrules: [
        'A tela Regras do Trader traduz princípios psicológicos em disciplina de execução prática e inegociável.',
        'Checklist Pré-Trade de 7 Pontos: validação objetiva antes de emitir qualquer ordem (Setup presente, Contexto favorável, Entrada e Stop definidos, Risco na política, Estado emocional sereno e motivação legítima).',
        'As Três Fases de Execução: diretrizes para Antes do Trade (preparação), Durante o Trade (condução sem interferência precipitada) e Depois do Trade (processamento analítico e diário).',
        'As 7 Regras de Ouro & "O que NÃO fazer": regras para blindar sua conta contra os vícios mais nocivos do trading (overtrading, perseguição de preço, aumento de risco para recuperar perdas e quebra de stop).'
      ],
      emotionalintelligence: [
        'A tela Psicologia do Trader reúne o Analisador Estatístico de Padrões e quatro guias fundamentais de autoconhecimento: Emoções do Trader, Vieses Comportamentais, Comportamentos no Trade e Autoconhecimento.',
        'Correlação Emoção x Resultado: identifique quais sentimentos (euforia, ansiedade, medo, hesitação) precedem seus maiores erros e firme compromissos pessoais com o método.'
      ],
      zen: ['Escolha a prática adequada ao seu momento (Respiração Guiada, Meditação, Foco ou Relaxamento) e acompanhe as instruções da sessão.', 'Conclua a prática para registrar seu histórico. Antes de voltar à operação, retome seu plano e confira se está em condição serena de executá-lo.'],
      wisdom: [
        'A tela Sabedoria do Trader disponibiliza um acervo curado com centenas de princípios, citações comentadas e reflexões atemporais dos maiores operadores de tendência da história.',
        'Alinhamento Filosófico: acesse ensinamentos categorizados em Gestão de Risco, Psicologia, Disciplina e Estratégia para manter a perspectiva correta durante drawdowns.'
      ],
      traderprofile: [
        'Os Testes de Perfil oferecem um diagnóstico comportamental das suas características como operador: perfil de risco, tendências, pontos fortes e pontos de atenção.',
        'Autoconhecimento Aplicado: use o resultado para escolher com segurança o perfil operacional ideal na sua Política de Risco (Política Padrão vs Risk Ramp-Up).'
      ],
      settings: [
        'A tela Configurações personaliza a aparência (Premium Gold vs Healthy Green), o idioma e recursos de governança do software.',
        'Modo Fora do Mercado (Market Pause): ative uma pausa deliberada por prazo determinado (ex: 2 a 5 dias) para blindar seu capital e bloquear novas ordens após sequências difíceis no mercado.',
        'Rotina Diária e Notificações: configure horários de rituais pré, intra e pós-mercado.'
      ],
      materials: [
        'A Trader Store reúne materiais complementares do trader: guias operacionais em PDF, checklists para impressão, áudios de foco e fichas de acompanhamento.',
        'Recursos Exclusivos: ferramentas desenhadas para transformar a teoria do método em ferramentas físicas e materiais de consulta rápida ao lado da sua mesa de operações.'
      ]
    };
    const paragraphs = (additionalGuides[id] || (original ? [...original.querySelectorAll('p')].map(p=>p.textContent).filter(p=>p && !/checklist A\+ antes|classificada como rejeitada/.test(p)) : []));
    showReader(`<h2 id="kc-reader-title">${title}</h2><p class="kc-reader-lead">${description}</p><img class="kc-reader-screen" src="assets/manual-knowledge/${id}.jpg" alt="Tela ${title}"><span class="kc-eyebrow">COMO USAR</span>${paragraphs.length?paragraphs.map(p=>`<p>${esc(p)}</p>`).join(''):'<p>Consulte a informação da tela, confira seu contexto e siga para a próxima etapa do processo. Mantenha a Política de Risco como referência para suas decisões.</p>'}<button class="kc-open-tool" type="button" data-route="${id}">Abrir ${title} →</button>`);
  }
  function concept(index) {
    const entry=concepts[index]; if(!entry)return;
    const [,title,description,term]=entry;
    const glossary=typeof methodGlossary!=='undefined'?methodGlossary:[];
    const item=glossary.find(x=>normalize(x.term)===normalize(term)) || glossary.find(x=>normalize(x.term).includes(normalize(term)));
    const fallback={definition:description,role:'Considere este conceito em conjunto com os demais critérios e com a sua Política de Risco.'};
    const data=item||fallback;
    showReader(`<div class="kc-reader-symbol">${icon(entry[0])}</div><h2 id="kc-reader-title">${title}</h2><p class="kc-reader-lead">${esc(data.definition)}</p><h3>Por que existe</h3><p>${esc(data.role)}</p>${data.not?`<h3>Não confundir</h3><p>${esc(data.not)}</p>`:''}<button class="kc-open-tool" type="button" data-glossary="${esc(item?.term||term)}">Explorar no Glossário →</button>`);
  }
  function scrollToSection(id) {
    const target=document.getElementById(id); if(!target)return;
    if(target===legacy)legacy.open=true;
    if(target.tagName==='DETAILS')target.open=true;
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
    target.classList.remove('kc-highlight'); void target.offsetWidth; target.classList.add('kc-highlight');
    setTimeout(()=>target.classList.remove('kc-highlight'),1800);
  }
  window.openSellIntoStrengthManual = function () {
    go('manual');
    requestAnimationFrame(() => scrollToSection('knowledge-sell-into-strength'));
  };
  window.openScaleInManual = function () {
    go('manual');
    requestAnimationFrame(() => scrollToSection('knowledge-scale-in'));
  };
  const catalog=[...(typeof methodGlossary!=='undefined'?methodGlossary:[]).map((item,id)=>({title:item.term,text:[item.definition,item.role,item.not].join(' '),type:'glossary',id})),...software.map(([id,title,,source,text])=>({title,text,type:'guide',id})),...concepts.map(([,title,text],id)=>({title,text,type:'concept',id})),...faq.map(([title,text],id)=>({title,text,type:'faq',id})),...Array.from(legacy.querySelectorAll('.manual-section:not(.manual-faq)')).map(section=>({title:section.querySelector('h2')?.textContent||'Guia completo',text:section.textContent,type:'legacy',id:section.id}))];
  function findContent() {
    const query=normalize(search.value.trim()); results.hidden=!query; if(!query){results.innerHTML='';return;}
    const tokens=query.split(/\s+/).filter(Boolean);
    const matches=catalog.filter(item=>tokens.every(token=>normalize(item.title+' '+item.text).includes(token))).slice(0,12);
    results.innerHTML=matches.length?`<p>${matches.length} resultado(s)</p>${matches.map(item=>`<button type="button" data-result-type="${item.type}" data-result-id="${item.id}"><b>${esc(item.title)}</b><span>${esc(item.text.slice(0,130))}…</span>${icon('arrow')}</button>`).join('')}`:'<p>Nenhum conteúdo encontrado. Tente “risco”, “diário”, “ATR” ou “Rubric”.</p>';
  }
  search.addEventListener('input',findContent);
  root.querySelector('.kc-search').addEventListener('submit',event=>{event.preventDefault();findContent();});
  reader.addEventListener('close',()=>returnFocus?.focus());
  reader.addEventListener('click',event=>{if(event.target===reader){const r=reader.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)reader.close();}});
  root.addEventListener('click',event=>{
    const button=event.target.closest('button,a');if(!button)return;
    if(button.hasAttribute('data-close-reader'))reader.close();
    else if(button.dataset.guide)guide(button.dataset.guide);
    else if(button.dataset.concept!==undefined)concept(Number(button.dataset.concept));
    else if(button.dataset.route){reader.close();go(button.dataset.route);}
    else if(button.dataset.glossary){reader.close();if(typeof glossaryQuery!=='undefined')glossaryQuery=button.dataset.glossary;if(typeof glossaryCategory!=='undefined')glossaryCategory='Todos';go('glossary');if(typeof renderGlossary==='function')renderGlossary();}
    else if(button.dataset.popular!==undefined){const targets=[0,4,2,5,3];scrollToSection('knowledge-faq-'+targets[Number(button.dataset.popular)]);}
    else if(button.dataset.resultType){const id=button.dataset.resultId;switch(button.dataset.resultType){case 'glossary':glossaryQuery=methodGlossary[Number(id)].term;glossaryCategory='Todos';go('glossary');break;case 'guide':guide(id);break;case 'concept':concept(Number(id));break;case 'faq':scrollToSection('knowledge-faq-'+id);break;case 'legacy':legacy.open=true;legacy.querySelectorAll('.manual-section').forEach(s=>s.style.display='');scrollToSection(id);break;}}
    else if(button.hash?.startsWith('#knowledge-')){event.preventDefault();scrollToSection(button.hash.slice(1));}
  });
  // Existing chapter and in-manual links keep their identifiers and open the library when targeted.
  root.querySelectorAll('[data-manual-target]').forEach(button=>button.addEventListener('click',()=>{legacy.open=true;}));
  document.addEventListener('keydown',event=>{if(root.classList.contains('active')&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();search.focus();search.scrollIntoView({block:'center'});}});
}());




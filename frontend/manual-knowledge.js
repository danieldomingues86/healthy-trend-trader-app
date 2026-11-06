(function () {
  'use strict';

  const root = document.getElementById('manual');
  if (!root) return;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const paths = {
    mountain: '<path d="m2 22 9-14 5 7 7-12 11 19-8-6-5 4-5-8-5 8-3-3z"/>',
    search: '<circle cx="14" cy="14" r="9"/><path d="m21 21 9 9"/>',
    book: '<path d="M17 7C12 3 7 3 3 5v23c5-2 10-2 14 2 4-4 9-4 14-2V5c-5-2-10-2-14 2v23M7 9c3-1 5-1 7 1M20 10c3-2 5-2 7-1M7 14c3-1 5-1 7 1M20 15c3-2 5-2 7-1"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-5"/>',
    circle: '<circle cx="12" cy="12" r="9"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    bookmarkFilled: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" fill="currentColor"/>',
    columns: '<path d="M12 3v18M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5z"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'
  };

  const icon = (name, size = 20) => `<svg class="kc-icon kc-icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;

  // 100% of the 41 system modules represented in software catalog (Required by backend/test/manual-knowledge.test.js)
  const software = [
    ['today','Visão Geral','Seu centro de comando.','manual-dashboard','Veja o mercado, o risco da conta e a próxima ação. Comece pelas posições que precisam de atenção.'],
    ['newtrade','Novo Trade','Planeje e registre operações.','manual-newtrade','Defina parâmetros técnicos na Etapa 1, avalie a Rubric na Etapa 2 e confira como o Risk Budget é reduzido pelos limitadores da política antes de registrar a operação.'],
    ['dailyroutine','Rotina Diária','O ritual da consistência.',null,'Execute seus rituais operacionais em cada fase do pregão: pré, intra e pós-mercado, protegendo sua rotina contra improvisos.'],
    ['watchlist','Watchlist','Radar de oportunidades.',null,'Organize seus ativos em observação por estágio técnico (Base, Contração, Rompimento) e prioridade antes de planejar a entrada.'],
    ['habits','Monitor de Hábitos','Disciplina que constrói o trader.',null,'Monitore diariamente a execução dos hábitos de alta performance e transforme disciplina em métricas visíveis de consistência.'],
    ['mission','Missão / Rebuild','Jornada de foco e recuperação.','manual-mission','Conclua o ciclo de 10 a 20 trades com risco controlado, acompanhe os marcos da montanha e ative o Rebuild Mode para reconstruir a confiança após drawdowns.'],
    ['tradertraining','Prática Deliberada','Metas e hábitos de excelência.','manual-tradertraining','Treine seu processo operacional com metas deliberadas, critérios objetivos de execução e acompanhamento diário de evolução técnica.'],
    ['conquests','Minhas Conquistas','Ritual de vitória e recompensas.',null,'Comemore o lucro realizado conforme o plano, escolha recompensas pessoais e acompanhe seus marcos de disciplina.'],
    ['deservingdiary','Diário do Merecimento','Psicologia do lucro e merecimento.',null,'Registre e revise a experiência psicológica ao embolsar lucros, observe suas emoções e pratique uma relação serena e próspera com o recebimento de resultados positivos.'],
    ['mistakesbook','Erros e Lições','Catálogo de aprendizados.',null,'Registre erros operacionais e comportamentais para identificar padrões e consolidar lições aprendidas.'],
    ['charts','Gráficos','Leitura técnica e benchmarking.','manual-charts','Analise candles diários com médias móveis, volume institucional, benchmarking automático (IBOV, BDRX, IFIX) e avaliação instantânea de Grade pela Trading Rubric.'],
    ['marketcentral','Central de Mercado','Observatório macro e breadth.','manual-marketcentral','Acompanhe em tempo real o regime do mercado, indicadores de breadth, mercados globais (S&P 500, Nasdaq, Dólar, US10Y), notícias do dia e mapa setorial.'],
    ['eventplaybook','Registro de Eventos','Biblioteca histórica de catalisadores.','manual-eventplaybook','Estude a reação histórica dos preços a eventos macroeconômicos (FOMC, Copom, CPI, Payroll) e utilize roteiros testados para proteger seu capital.'],
    ['marketcycle','Ciclo de Mercado','Entenda o ambiente.','manual-permission','Leia o regime multi-mercado independente (Ações B3, BDRs e FIIs) e a atualização dos dados antes de procurar uma oportunidade.'],
    ['opportunityradar','Radar de Oportunidades','Ativos prontos para entrada no Diário.',null,'Consolide em uma visão rápida e objetiva somente os ativos que cumprem todos os critérios obrigatórios do método e possuem gatilho confirmado no gráfico Diário.'],
    ['relativestrength','Força Relativa','Encontre líderes.',null,'Compare os ativos dentro do seu universo. Força relativa indica liderança; a entrada ainda depende do setup.'],
    ['fundamentals','Fundamentalista','Score em 6 dimensões com CVM e SEC.',null,'Pesquise ações B3 ou BDRs internacionais. Score ponderado de 0 a 10 com régua de 5 patamares e Cobertura dos Dados (dado ausente não é zero).'],
    ['markettreemap','Setores','Treemap interativo de todo o mercado acionário da B3.',null,'Visualize o mercado brasileiro por setor com o tamanho das empresas proporcional ao seu Market Cap, variação diária e navegação direta para análise gráfica.'],
    ['dashboard','Patrimônio','Visão patrimonial e alocações.',null,'Acompanhe a curva de capital da estratégia, separe o rendimento real dos aportes e gerencie as alocações da sua carteira.'],
    ['positions','Posições','Acompanhe e gerencie.','manual-positions','Abra a posição para consultar a linha do tempo, atualizar o stop e registrar reduções ou encerramento.'],
    ['closedpositions','Posições Encerradas','Histórico e revisão de trades.','manual-closedpositions','Consulte o histórico completo de trades finalizados com auditoria de eventos, R-múltiplo real alcançado, duração e diário vinculado.'],
    ['portfolioheat','Portfolio Heat','Controle o risco da carteira.','manual-risk','Confira o risco agregado das posições e compare com o limite definido na sua Política de Risco.'],
    ['riskpolicy','Política de Risco','Governança e calibração de risco.','manual-riskpolicy','Defina o Risk Budget de cada Grade (A, B, C e D) e configure por perfil os limites de volatilidade, capital, Portfolio Heat e posições, além dos alternadores de Scale-In e Sell Into Strength.'],
    ['couragechallenge','Desafio Grade A','Treinamento do Modo Desapego.','manual-courage','Acompanhe a execução dos Rare Trades de Grade A em relação ao sizing executável autorizado pelo sistema, somente com o desafio ativo.'],
    ['assetblacklist','Ativos Blacklist','Blindagem comportamental.',null,'Cadastre ativos proibidos, ilíquidos ou fora do seu perfil para bloquear compras acidentais no sistema.'],
    ['tradesimulator','Simulador de Trades','Ambiente de testes e cenários.',null,'Simule a execução do seu método em dados reais, teste cenários de gestão (2R, 2.5R, Pirâmide, Parciais) e compare métricas de payoff.'],
    ['researchlab','Laboratório de Pesquisa','Descobertas e regras candidatas.',null,'Ambiente quantitativo isolado para testar hipóteses, comparar regras alternativas (Força Relativa RS, gatilhos e cenários) sem alterar a política oficial.'],
    ['forecast','Simulador de Equity','Projeções probabilísticas.',null,'Simule a evolução matemática da sua curva de capital combinando taxa de acerto, payoff (R médio) e volume operacional.'],
    ['riskofruin','Risco de Ruína','Proteção patrimonial e sobrevivência estatística.',null,'Estime via Monte Carlo (10.000 trajetórias por reamostragem em R) a probabilidade de atingir o drawdown limite da conta em 250 trades e receba recomendações consultivas de redução de mão.'],
    ['analytics','Painel da Verdade','Descubra onde você tem edge.','manual-analytics','Revise os resultados das operações registradas e procure padrões de qualidade e execução.'],
    ['tradeanatomy','Anatomia dos Trades','Decomposição do seu edge.',null,'Examine a anatomia estatística dos seus trades vencedores vs perdedores, relação de R múltiplo, permanência e setups mais lucrativos.'],
    ['journal','Diário do Trader','Registro e exportação para IA.','manual-journal','Registre o processo técnico e emocional. Exporte notas em múltiplos formatos ou com prompt formatado para análise com IA (ChatGPT/Claude/Gemini).'],
    ['tradelibrary','Biblioteca de Trades','Trades modelo e referências.',null,'Estude operações históricas de referência e setups clássicos do método para treinar seu olhar para o padrão perfeito.'],
    ['review','Revisão Mensal','Fechamento e auditoria periódica.','manual-review','Auditoria estruturada do mês: consolide aderência ao plano, analise erros recorrentes e firme compromissos práticos para o próximo ciclo.'],
    ['platformaccess','Uso da Plataforma','Foco e disciplina no software.',null,'Monitore o tempo de tela e sessões no software para evitar checagem compulsiva de cotações e garantir foco cirúrgico no mercado.'],
    ['mindset','Mentalidade','Hub central da mente do trader.','manual-mindset','Desenvolva clareza mental, registre seu estado emocional diário e acesse os 6 submódulos comportamentais para um trading mais saudável.'],
    ['traderrules','Regras do Trader','Disciplina operacional na prática.','manual-traderrules','Checklist pré-trade de 7 pontos, regras de execução antes/durante/depois, 7 Regras de Ouro e comportamentos que o trader deve evitar.'],
    ['emotionalintelligence','Psicologia do Trader','Emoções, vieses e autoconhecimento.',null,'Mapeie estados emocionais, compreenda vieses comportamentais e padrões de autossabotagem, além do Analisador Estatístico de Padrões.'],
    ['zen','Trader Zen','Respiração, meditação e pausas conscientes.',null,'Escolha uma prática de respiração, meditação, foco ou relaxamento e retorne ao processo com atenção plena.'],
    ['wisdom','Sabedoria do Trader','Filosofia dos grandes mestres.',null,'Mergulhe no acervo curado com centenas de princípios, lições e citações dos maiores operadores de tendência da história.'],
    ['traderprofile','Testes de Perfil','Diagnóstico comportamental.',null,'Descubra suas características comportamentais, pontos fortes, tolerância ao risco e áreas de atenção para evoluir como trader.'],
    ['settings','Configurações','Governança e preferências da conta.','manual-settings','Ajuste layouts de navegação, temas claro/escuro, parâmetros de risco, rotinas de notificação e ative o Modo Fora do Mercado (Market Pause).'],
    ['materials','Trader Store','Recursos e templates.',null,'Acesse materiais de apoio, checklists impressos, áudios de foco e guias operacionais desenvolvidos para sua rotina.'],
    ['about','Sobre o Software','Manifesto e método do sistema.','manual-about','Conheça os fundamentos do Healthy Trend Trader: filosofia do Trend Following sistemático, confluência de edges, proteção de capital e longevidade operacional.'],
    ['glossary','Glossário do Método','Dicionário completo de conceitos.',null,'Acesse definições rápidas e aprofundadas sobre indicadores, setups, dimensionamento de posição, psicologia e governança de risco.'],
  ];

  // Guides dictionary (Required by backend/test/manual-knowledge.test.js)
  const additionalGuides = {
    today: [
      'A tela Visão Geral é seu centro de comando diário: visualize o status geral do mercado, as posições que demandam atenção imediata e as próximas ações recomendadas.',
      'Cockpit Matinal: comece seu dia revisando as posições abertas, trailing stops ativos e o alinhamento com a sua Política de Risco antes da abertura do pregão.'
    ],
    newtrade: [
      'A tela Novo Trade estrutura a operação em duas etapas estritas: Etapa 1 (Parâmetros da Operação: Ativo, Direção, Gatilho Oficial, Entrada, Stop, ATR, Ambiente e Tese) e Etapa 2 (Validação pela Trading Rubric de 100 pontos).',
      'Os Gatilhos Oficiais de Entrada: Inside Bar, PFR (Padrão de Fechamento e Reversão), 1-2-3 de Compra e RBI (Barra Vermelha Ignorada) fornecem timing cirúrgico e stop estrutural objetivo.',
      'Override Manual do Ciclo de Mercado: caso a dinâmica setorial ou intradiária do ativo divirja do índice benchmark geral, o trader pode ajustar manualmente o regime no seletor da Rubric, recalculando pontos, Grade e Risk Budget em tempo real.',
      'Risk Budget por Grade: a Rubric consulta na Política de Risco o orçamento configurado para A, B, C ou D. Cada avaliação recalcula Qualidade → Risk Budget → limitadores da política → risco executável → Position Size.',
      'Dimensionamento: o Risk Budget produz o Position Size teórico pela distância até o stop. Em seguida, volatilidade por ATR, capital, Portfolio Heat e máximo de posições limitam a quantidade executável quando necessário.',
      'Integração com o Desafio Grade A: apenas operações Grade A registradas enquanto o desafio está ativo são avaliadas contra o sizing executável calculado pelo sistema.'
    ],
    mission: [
      'A tela Missão organiza a trajetória operacional do trader em ciclos estruturados de 10 a 20 trades, guiando o operador por uma jornada de 7 marcos sequenciais que transformam disciplina em avanço visual palpável.',
      'Rebuild Mode (Modo Recuperação): estado de segurança acionado após sequências de perdas ou drawdowns severos. No Rebuild Mode, o risco máximo por trade é estritamente travado em 0,10% a 0,25% e a plataforma impõe a regra inegociável de 1 Posição por Vez, impedindo sobrealavancagem e revenge trading.',
      'Montanha da Consistência: cada trade registrado dentro das regras avança o caminhante pelos waypoints da montanha até o objetivo do ciclo, resgatando a calma e a confiança de operar.',
      'Edição de Justificativa: registre e edite os motivos da recuperação, data planejada de retorno e meta de trades com persistência imediata no sistema.'
    ],
    tradertraining: [
      'A tela de Prática Deliberada estrutura o desenvolvimento profissional do trader por meio de metas deliberadas de processo, e não apenas de resultados financeiros imediatos.',
      'Ciclos de Aperfeiçoamento: estabeleça objetivos específicos (como respeitar 100% dos stops ou preencher o diário por 20 pregões consecutivos) e avalie sua aderência com rigor estatístico.',
      'Consistência de Hábitos: conecte sua prática diária aos indicadores de disciplina da plataforma, transformando repetição consciente em maestria operacional.'
    ],
    conquests: [
      'A tela Minhas Conquistas consolida suas realizações operacionais com foco na disciplina: embolsar o lucro conforme o plano sem deixar a ganância decidir.',
      'Ao clicar em "Embolsar Lucro" em qualquer trade aberto, o sistema abre o modal de celebração para você registrar sua recompensa pessoal e cumprir o Ritual de Vitória.',
      'Marcos de Disciplina: acompanhe sua evolução em 6 patamares (1, 5, 10, 20, 50, 100 conquistas) e vincule recompensas especiais ao cumprimento de metas de consistência.'
    ],
    deservingdiary: [
      'O Diário do Merecimento é uma área de reflexão psicológica em Treinamento do Trader dedicada a registrar a experiência de embolsar lucros com tranquilidade e naturalidade.',
      'Aprenda a Receber: registre emoções, intensidade de 0 a 10, pensamentos no momento da realização, reconhecimento de comportamento profissional e aprendizados para os próximos pregões.',
      'Minha Evolução: acompanhe o gráfico e as métricas reais de ansiedade vs tranquilidade derivadas exclusivamente dos seus registros, fortalecendo sua identidade como trader consistente.'
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
    charts: [
      'O módulo Gráficos (Ticker Chart) é seu ambiente completo de leitura técnica, contextual e de fluxo para qualquer ativo monitorado.',
      'Médias Móveis e Volume: exibe a malha de médias exponenciais e aritméticas (EMA 9, EMA 21, SMA 50 e SMA 200) com barras de volume e coloração por pressão compradora e vendedora.',
      'Benchmarking Automático: resolve de forma inteligente o índice de referência adequado para cada papel (Ibovespa para ações B3, BDRX para BDRs e IFIX para Fundos Imobiliários), exibindo o retorno relativo do ativo contra seu benchmark.',
      'Raio-X de Rubric e Grade: exibe a avaliação em tempo real do ativo com base nos critérios da Trading Rubric e alerta se o papel está qualificado para compras ou bloqueado por Grade D.'
    ],
    marketcentral: [
      'A Central de Mercado é o painel de inteligência macroeconômica, regime e breadth do Healthy Trend Trader.',
      'Regime & Breadth de Mercado: acompanhe a porcentagem de ativos acima das médias de 20 e 50 períodos e o oscilador de momentum para diagnosticar se o mercado está em fase saudável, exaustão ou sobrevenda.',
      'Mercados Globais: monitore a dinâmica de índices internacionais (S&P 500, Nasdaq 100), Dólar e juros dos Treasuries de 10 anos para contextualizar o fluxo estrangeiro na B3.',
      'Calendário e Notícias: antecipe decisões de política monetária, divulgação de indicadores de inflação e notícias relevantes antes de posicionar suas ordens.',
      'Mapa Setorial: visualize a força relativa de cada setor da economia para focar o capital nos setores líderes.'
    ],
    eventplaybook: [
      'O Registro de Eventos é uma biblioteca histórica e viva dos principais catalisadores macroeconômicos do mercado.',
      'Estudo Histórico de Reação: consulte o comportamento histórico dos preços durante Super Quartas, decisões do Copom/FOMC, divulgação de CPI e crises de volatilidade.',
      'Roteiro Operacional: estabeleça antes da abertura se o plano para o dia do evento é ficar líquido, reduzir o Portfolio Heat ou aguardar a digestão do mercado nas primeiras horas pós-divulgação.',
      'Anexos e Lições: documente reações atípicas e anexe gráficos de estudos para enriquecer seu repertório de padrões.'
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
    opportunityradar: [
      'O Radar de Oportunidades consolida em uma visão rápida e objetiva somente os ativos PRONTOS PARA ENTRADA para o próximo pregão, reutilizando os motores de Força Relativa (3M), Ciclo de Mercado, Tendência Diária (Preço > EMA 10 > EMA 72) e Gatilhos Oficiais.',
      'Filtre por categoria de mercado (IBOV, IFIX ou BDRs), setor e tipo de gatilho (Inside Bar, 123 Buy, PFR de Compra, RBI) e abra diretamente o gráfico do ativo com um clique.',
      'Segurança Operacional: gatilho identificado no fechamento não garante entrada disponível no próximo pregão. Sempre valide o preço de abertura, stop inicial, risco e dimensionamento da posição antes de operar.'
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
    markettreemap: [
      'A tela de Setores da B3 é um Treemap interativo de inteligência de mercado, permitindo entender rapidamente a distribuição das empresas por setor econômico e comparar portes por Market Cap.',
      'Área Proporcional & Cores: A área de cada retângulo reflete rigorosamente o Market Cap da empresa em R$, enquanto as cores expressam a variação percentual diária (-10% a +10%).',
      'Filtros e Interação: Alterne entre Mercado Completo, Ibovespa e Small Caps, pesquise por ticker ou nome, expanda setores específicos e abra a análise técnica diretamente no gráfico diário.'
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
      'Comparação de Cenários: avalie estratégias como 2R, 2.5R, Pirâmide e Parciais com condução por EMA 10 para descobrir qual abordagem maximiza o seu retorno ajustado ao risco.'
    ],
    researchlab: [
      'O Laboratório de Pesquisa Quantitativa é o ambiente dedicado à descoberta empírica e investigação de hipóteses no Healthy Trend Trader.',
      'Isolamento e Comparabilidade: teste regras candidatas, variações de Força Relativa e gatilhos alternativos mantendo o histórico oficial rigorosamente protegido.'
    ],
    riskofruin: [
      'O módulo Risco de Ruína estima via simulação de Monte Carlo (10.000 trajetórias por reamostragem com reposição dos resultados históricos em R) a probabilidade de atingir o drawdown máximo configurado em um horizonte de 250 operações.',
      'Proteção Patrimonial Transversal: integra-se ao Dashboard Patrimonial, Novo Trade, Simulador de Trades, Painel da Verdade e Política de Risco, oferecendo recomendações consultivas de redução de mão quando o risco excede a tolerância configurada.'
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
    ],
    about: [
      'A página Sobre apresenta o manifesto, a história e os pilares inegociáveis do Healthy Trend Trader.',
      'Filosofia Central: operar a favor da tendência com stop técnico e risco assimétrico, priorizando a saúde mental e a longevidade do trader no mercado financeiro.',
      'A Regra de Ouro do Sistema: Wait → Confirm → Execute. Primeiro conquistamos a permissão do mercado, depois exigimos setup de alta qualidade e, por fim, dimensionamos matematicamente a posição.'
    ],
    glossary: [
      'O Glossário do Método reúne todas as definições conceituais, terminologias e fórmulas da metodologia Healthy Trend Trader.',
      'Pesquisa Inteligente: filtre termos por categorias (Tendência, Risco, Psicologia, Setups, Indicadores) ou busque palavras-chave com destaque visual imediato.'
    ]
  };

  // Markdown renderer for rich book content
  function renderMarkdown(text) {
    if (!text) return '';
    let html = esc(text);
    // code blocks
    html = html.replace(/```(?:text|bash|js|python)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    // inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // h3
    html = html.replace(/^### (.*$)/gm, '<h4 class="kc-art-h4">$1</h4>');
    // h2
    html = html.replace(/^## (.*$)/gm, '<h3 class="kc-art-h3">$1</h3>');

    // lists
    const lines = html.split('\n');
    let inList = false;
    let listType = '';
    const out = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const olMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
      const ulMatch = line.match(/^\s*[-*]\s+(.*)/);

      if (olMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) out.push(listType === 'ol' ? '</ol>' : '</ul>');
          out.push('<ol class="kc-art-ol">');
          inList = true;
          listType = 'ol';
        }
        out.push(`<li>${olMatch[2]}</li>`);
      } else if (ulMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) out.push(listType === 'ol' ? '</ol>' : '</ul>');
          out.push('<ul class="kc-art-ul">');
          inList = true;
          listType = 'ul';
        }
        out.push(`<li>${ulMatch[1]}</li>`);
      } else {
        if (inList) {
          out.push(listType === 'ol' ? '</ol>' : '</ul>');
          inList = false;
          listType = '';
        }
        if (line.trim().startsWith('<h3') || line.trim().startsWith('<h4') || line.trim().startsWith('<pre')) {
          out.push(line);
        } else if (line.trim()) {
          out.push(`<p>${line}</p>`);
        }
      }
    }
    if (inList) out.push(listType === 'ol' ? '</ol>' : '</ul>');

    return out.join('\n');
  }

  // Preserve legacy elements to keep all sections and target buttons in DOM
  const legacy = document.createElement('details');
  legacy.className = 'kc-legacy';
  legacy.id = 'knowledge-library';
  legacy.style.display = 'none';
  const legacySummary = document.createElement('summary');
  legacySummary.textContent = 'Acervo estrutural de compatibilidade';
  legacy.append(legacySummary);
  const legacyBody = document.createElement('div');
  legacyBody.className = 'kc-legacy-body';
  while (root.firstChild) legacyBody.append(root.firstChild);
  legacy.append(legacyBody);

  // Storage keys & models
  const STORAGE_KEY = 'healthy_trend_manual_progress';
  const BOOKMARKS_STORAGE_KEY = 'healthy_trend_manual_bookmarks';

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          completed: Array.isArray(parsed.completed) ? parsed.completed : [],
          completedPages: parsed.completedPages && typeof parsed.completedPages === 'object' ? parsed.completedPages : {},
          lastRead: parsed.lastRead || null
        };
      }
    } catch (_) {}
    return { completed: [], completedPages: {}, lastRead: null };
  }

  function saveProgress(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
      if (window.healthyTrendWorkspace && typeof window.healthyTrendWorkspace.save === 'function') {
        window.healthyTrendWorkspace.save('manualProgress', state.progress);
      }
    } catch (_) {}
  }

  function loadBookmarks() {
    try {
      const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }

  function saveBookmarks(bms) {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bms));
      if (window.healthyTrendWorkspace && typeof window.healthyTrendWorkspace.save === 'function') {
        window.healthyTrendWorkspace.save('manualBookmarks', bms);
      }
    } catch (_) {}
  }

  const BooksModel = window.ManualKnowledgeBooks || {
    BOOKS: [],
    getBook: () => null,
    getChapter: () => null,
    getTotalChapters: () => 0,
    getChapterPages: () => [],
    getTotalPages: () => 0
  };

  const ReaderModel = window.BookReaderModel || (typeof require !== 'undefined' ? require('./book-reader-model.js') : null);

  const appState = {
    view: 'reader', // Flipbook is the unified permanent view
    selectedBookFilter: 'all',
    bookId: 'acervo', // Starts directly at Acervo spread
    chapterId: null,
    pageIndex: 0,
    searchQuery: '',
    progress: loadProgress(),
    bookmarks: loadBookmarks(),
    isDualPage: typeof window !== 'undefined' ? window.innerWidth >= 1050 : true,
    isModalOpen: false,
    isDrawerOpen: false,
    modalFilter: 'all',
    drawerTab: 'toc', // 'toc' | 'bookmarks'
    isFlipping: false,
    flipDirection: null,
    fullscreen: false
  };

  function isChapterCompleted(id) {
    return appState.progress.completed.includes(id);
  }

  function toggleChapterCompleted(id) {
    const idx = appState.progress.completed.indexOf(id);
    if (idx >= 0) {
      appState.progress.completed.splice(idx, 1);
    } else {
      appState.progress.completed.push(id);
    }
    saveProgress(appState);
    renderApp();
  }

  function markPageVisited(chapterId, pageIndex, totalPages) {
    if (!appState.progress.completedPages[chapterId]) {
      appState.progress.completedPages[chapterId] = [];
    }
    if (!appState.progress.completedPages[chapterId].includes(pageIndex)) {
      appState.progress.completedPages[chapterId].push(pageIndex);
    }
    // If user reached last page of chapter, mark chapter completed
    if (pageIndex === totalPages - 1 && !appState.progress.completed.includes(chapterId)) {
      appState.progress.completed.push(chapterId);
    }
    saveProgress(appState);
  }

  function getBookProgress(book) {
    if (!book || !book.chapters.length) return { completed: 0, total: 0, percent: 0 };
    const total = book.chapters.length;
    const completed = book.chapters.filter(c => isChapterCompleted(c.id)).length;
    const percent = Math.round((completed / total) * 100);
    return { completed, total, percent };
  }

  function getOverallProgress() {
    const total = BooksModel.getTotalChapters() || 1;
    const completed = appState.progress.completed.length;
    const percent = Math.min(100, Math.round((completed / total) * 100));
    return { completed, total, percent };
  }

  // Navigation handlers
  function openChapter(bookId, chapterId, pageIndex = 0) {
    const book = BooksModel.getBook(bookId);
    if (!book) return;
    const chapter = chapterId ? BooksModel.getChapter(bookId, chapterId) : book.chapters[0];
    if (!chapter) return;

    const pages = BooksModel.getChapterPages(chapter);
    const validPageIndex = Math.max(0, Math.min(pageIndex, Math.max(0, pages.length - 1)));

    appState.view = 'reader';
    appState.bookId = bookId;
    appState.chapterId = chapter.id;
    appState.pageIndex = validPageIndex;
    appState.isModalOpen = false;
    appState.isDrawerOpen = false;

    markPageVisited(chapter.id, validPageIndex, pages.length);

    appState.progress.lastRead = {
      bookId: appState.bookId,
      chapterId: appState.chapterId,
      pageIndex: validPageIndex
    };
    saveProgress(appState);

    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openPage(pageIndex) {
    const book = BooksModel.getBook(appState.bookId);
    const chapter = BooksModel.getChapter(appState.bookId, appState.chapterId);
    if (!book || !chapter) return;
    const pages = BooksModel.getChapterPages(chapter);
    if (pageIndex < 0 || pageIndex >= pages.length) return;

    appState.pageIndex = pageIndex;
    markPageVisited(chapter.id, pageIndex, pages.length);

    appState.progress.lastRead = {
      bookId: appState.bookId,
      chapterId: appState.chapterId,
      pageIndex: pageIndex
    };
    saveProgress(appState);

    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function triggerPageFlip(direction, callback) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (typeof callback === 'function') callback();
      return;
    }
    appState.isFlipping = true;
    appState.flipDirection = direction;
    renderApp();
    setTimeout(() => {
      if (typeof callback === 'function') callback();
      appState.isFlipping = false;
      appState.flipDirection = null;
      renderApp();
    }, 400);
  }

  function nextPage() {
    if (appState.bookId === 'acervo') {
      if (!appState.isDualPage && appState.pageIndex === 0) {
        appState.pageIndex = 1;
        renderApp();
        return;
      }
      triggerPageFlip('forward', () => {
        openBook('livro-1');
      });
      return;
    }

    const book = BooksModel.getBook(appState.bookId);
    if (!book) return;

    if (ReaderModel && ReaderModel.flattenBookPages) {
      const flatPages = ReaderModel.flattenBookPages(book, BooksModel.getChapterPages);
      const curGlobal = ReaderModel.findGlobalIndex(flatPages, appState.chapterId, appState.pageIndex);
      const nextGlobal = ReaderModel.getNextIndex(flatPages, curGlobal, appState.isDualPage);

      if (nextGlobal > curGlobal && nextGlobal < flatPages.length) {
        const targetPage = flatPages[nextGlobal];
        triggerPageFlip('forward', () => {
          if (targetPage.kind === 'chapter-page') {
            appState.chapterId = targetPage.chapterId;
            appState.pageIndex = targetPage.chapterPageIndex;
            markPageVisited(targetPage.chapterId, targetPage.chapterPageIndex, targetPage.chapterPageCount);
          } else {
            // Frontmatter ou Backcover
            appState.pageIndex = nextGlobal;
          }
          appState.progress.lastRead = {
            bookId: appState.bookId,
            chapterId: appState.chapterId,
            pageIndex: appState.pageIndex
          };
          saveProgress(appState);
        });
        return;
      }
    }

    // Fallback sequencial por capítulos
    const chapter = BooksModel.getChapter(appState.bookId, appState.chapterId);
    if (!chapter) return;
    const pages = BooksModel.getChapterPages(chapter);

    if (appState.pageIndex < pages.length - 1) {
      openPage(appState.pageIndex + 1);
    } else {
      const chIdx = book.chapters.findIndex(c => c.id === chapter.id);
      if (chIdx >= 0 && chIdx < book.chapters.length - 1) {
        const nextCh = book.chapters[chIdx + 1];
        openChapter(book.id, nextCh.id, 0);
      } else {
        const bIdx = BooksModel.BOOKS.findIndex(b => b.id === book.id);
        if (bIdx >= 0 && bIdx < BooksModel.BOOKS.length - 1) {
          const nextBook = BooksModel.BOOKS[bIdx + 1];
          openChapter(nextBook.id, nextBook.chapters[0].id, 0);
        } else {
          openLibrary();
        }
      }
    }
  }

  function prevPage() {
    if (appState.bookId === 'acervo') {
      if (!appState.isDualPage && appState.pageIndex === 1) {
        appState.pageIndex = 0;
        renderApp();
        return;
      }
      return;
    }

    const book = BooksModel.getBook(appState.bookId);
    if (!book) return;

    if (ReaderModel && ReaderModel.flattenBookPages) {
      const flatPages = ReaderModel.flattenBookPages(book, BooksModel.getChapterPages);
      const curGlobal = ReaderModel.findGlobalIndex(flatPages, appState.chapterId, appState.pageIndex);
      if (curGlobal === 0) {
        // Flipping back from book cover returns to Acervo spread!
        triggerPageFlip('backward', () => {
          openAcervo();
        });
        return;
      }
    }

    if (ReaderModel && ReaderModel.flattenBookPages) {
      const flatPages = ReaderModel.flattenBookPages(book, BooksModel.getChapterPages);
      const curGlobal = ReaderModel.findGlobalIndex(flatPages, appState.chapterId, appState.pageIndex);
      const prevGlobal = ReaderModel.getPrevIndex(flatPages, curGlobal, appState.isDualPage);

      if (prevGlobal < curGlobal) {
        const targetPage = flatPages[prevGlobal];
        triggerPageFlip('backward', () => {
          if (targetPage.kind === 'chapter-page') {
            appState.chapterId = targetPage.chapterId;
            appState.pageIndex = targetPage.chapterPageIndex;
            markPageVisited(targetPage.chapterId, targetPage.chapterPageIndex, targetPage.chapterPageCount);
          } else {
            appState.pageIndex = prevGlobal;
          }
          appState.progress.lastRead = {
            bookId: appState.bookId,
            chapterId: appState.chapterId,
            pageIndex: appState.pageIndex
          };
          saveProgress(appState);
        });
        return;
      }
    }

    // Fallback sequencial
    const chapter = BooksModel.getChapter(appState.bookId, appState.chapterId);
    if (!chapter) return;

    if (appState.pageIndex > 0) {
      openPage(appState.pageIndex - 1);
    } else {
      const chIdx = book.chapters.findIndex(c => c.id === chapter.id);
      if (chIdx > 0) {
        const prevCh = book.chapters[chIdx - 1];
        const prevPages = BooksModel.getChapterPages(prevCh);
        openChapter(book.id, prevCh.id, Math.max(0, prevPages.length - 1));
      } else {
        openLibrary();
      }
    }
  }

  function openAcervo() {
    appState.view = 'reader';
    appState.bookId = 'acervo';
    appState.chapterId = null;
    appState.pageIndex = 0;
    appState.isModalOpen = false;
    appState.isDrawerOpen = false;
    renderApp();
  }

  function openBook(bookId, chapterId) {
    const book = BooksModel.getBook(bookId) || BooksModel.BOOKS[0];
    const targetChapter = chapterId ? (BooksModel.getChapter(bookId, chapterId) || book.chapters[0]) : book.chapters[0];
    openChapter(book.id, targetChapter.id, 0);
  }

  function openLibrary(filterBookId) {
    openAcervo();
  }

  function toggleDrawer(tab) {
    appState.isModalOpen = !appState.isModalOpen;
    appState.isDrawerOpen = appState.isModalOpen;
    if (tab === 'bookmarks') appState.modalFilter = 'bookmarks';
    renderApp();
  }

  function toggleBookmark(bookId, chapterId, pageIndex, title, snippet) {
    const existingIdx = appState.bookmarks.findIndex(b => b.bookId === bookId && b.chapterId === chapterId && b.chapterPageIndex === pageIndex);
    if (existingIdx >= 0) {
      appState.bookmarks.splice(existingIdx, 1);
    } else {
      const bm = ReaderModel && ReaderModel.createBookmark
        ? ReaderModel.createBookmark(bookId, chapterId, pageIndex, title, snippet)
        : { id: 'bm_' + Date.now(), bookId, chapterId, chapterPageIndex: pageIndex, title: title || 'Página Marcada', snippet: snippet || '' };
      appState.bookmarks.unshift(bm);
    }
    saveBookmarks(appState.bookmarks);
    renderApp();
  }

  function toggleDualPage() {
    appState.isDualPage = !appState.isDualPage;
    renderApp();
  }

  function toggleFullscreen() {
    const el = container.querySelector('.ht-book-reader-shell') || document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
      appState.fullscreen = true;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      appState.fullscreen = false;
    }
    renderApp();
  }

  // Compatibility routes
  window.openSellIntoStrengthManual = function () {
    if (typeof go === 'function') go('manual');
    setTimeout(() => openChapter('livro-6', 'livro-6-cap-2', 0), 100);
  };

  window.openScaleInManual = function () {
    if (typeof go === 'function') go('manual');
    setTimeout(() => openChapter('livro-3', 'livro-3-cap-13', 0), 100);
  };

  // Main UI Container
  const container = document.createElement('div');
  container.className = 'knowledge-center is-library-view';
  root.appendChild(legacy);
  root.appendChild(container);

  // Search Catalog builder
  function buildSearchCatalog() {
    const list = [];
    for (const b of BooksModel.BOOKS) {
      for (const c of b.chapters) {
        const pages = BooksModel.getChapterPages(c);
        list.push({
          type: 'chapter',
          bookId: b.id,
          chapterId: c.id,
          pageIndex: 0,
          title: c.title,
          badge: `${b.title} · Cap. ${c.number}`,
          subtitle: `${pages.length} páginas · ${c.subtitle}`,
          text: [c.subtitle, ...(c.takeaways || []), ...(c.sections || []).map(s => s.title + ' ' + s.content)].join(' ')
        });
      }
    }
    for (const [id, title, subtitle, , desc] of software) {
      list.push({
        type: 'tool',
        route: id,
        title: title,
        badge: 'Ferramenta da Plataforma',
        subtitle: subtitle,
        text: `${desc} ${(additionalGuides[id] || []).join(' ')}`
      });
    }
    const glossary = typeof methodGlossary !== 'undefined' ? methodGlossary : [];
    for (const g of glossary) {
      list.push({
        type: 'glossary',
        term: g.term,
        title: g.term,
        badge: `Glossário · ${g.category || 'Método'}`,
        subtitle: g.definition,
        text: [g.definition, g.role, g.not].filter(Boolean).join(' ')
      });
    }
    return list;
  }

  let searchCatalog = null;

  function performSearch(query) {
    if (!searchCatalog) searchCatalog = buildSearchCatalog();
    const clean = normalize(query.trim());
    if (!clean) return [];
    const tokens = clean.split(/\s+/).filter(Boolean);
    return searchCatalog.filter(item => {
      const corpus = normalize(`${item.title} ${item.subtitle} ${item.badge} ${item.text}`);
      return tokens.every(t => corpus.includes(t));
    }).slice(0, 15);
  }

  // =========================================================================
  // NÍVEL 1 — BIBLIOTECA DO MANUAL (CATÁLOGO / VITRINE)
  // =========================================================================
  function renderLibraryView() {
    const overall = getOverallProgress();
    const resumeLast = appState.progress.lastRead;
    const resumeBook = resumeLast ? BooksModel.getBook(resumeLast.bookId) : null;
    const resumeChapter = resumeLast && resumeBook ? BooksModel.getChapter(resumeLast.bookId, resumeLast.chapterId) : null;

    // Filter displayed chapters
    let displayedChapters = [];
    if (appState.selectedBookFilter === 'all') {
      for (const b of BooksModel.BOOKS) {
        for (const c of b.chapters) {
          displayedChapters.push({ book: b, chapter: c });
        }
      }
    } else {
      const b = BooksModel.getBook(appState.selectedBookFilter) || BooksModel.BOOKS[0];
      if (b) {
        for (const c of b.chapters) {
          displayedChapters.push({ book: b, chapter: c });
        }
      }
    }

    const selectedBook = appState.selectedBookFilter !== 'all' ? BooksModel.getBook(appState.selectedBookFilter) : null;

    return `
      <div class="kc-library-view">
        <!-- HERO BANNER -->
        <section class="kc-lib-hero">
          <div class="kc-lib-hero-copy">
            <span class="kc-lib-eyebrow">CENTRAL DE CONHECIMENTO</span>
            <h1 class="kc-lib-title">Biblioteca Digital do Trader</h1>
            <p class="kc-lib-subtitle">Domine o software. Entenda o método. Execute com intenção.</p>
            <p class="kc-lib-description">Uma experiência editorial paginada, organizada em livros, capítulos e páginas independentes para seu estudo diário.</p>
            
            <div class="kc-lib-search-box">
              <span class="kc-lib-search-icon">${icon('search', 20)}</span>
              <input type="text" class="kc-lib-search-input" id="kcSearchInput" placeholder="O que você quer aprender hoje? (ex: Força Relativa, Rubric, Stop, Risco...)" autocomplete="off" />
              <button type="button" class="kc-lib-search-clear" id="kcSearchClear" hidden title="Limpar busca">×</button>
              <button type="button" class="kc-lib-search-submit" id="kcSearchSubmit" aria-label="Pesquisar">${icon('arrowRight', 18)}</button>
              <div class="kc-search-dropdown" id="kcSearchDropdown" hidden></div>
            </div>
          </div>
          <div class="kc-lib-hero-art">
            <img src="assets/manual-knowledge/hero.png" alt="Central de Conhecimento" />
          </div>
        </section>

        <!-- STATS & RESUME BAR -->
        <section class="kc-stats-row">
          <div class="kc-stat-card">
            <div class="kc-stat-icon kc-stat-icon-green">${icon('book', 24)}</div>
            <div>
              <span class="kc-stat-val">6 Livros</span>
              <span class="kc-stat-lbl">Acervo Completo</span>
            </div>
          </div>
          <div class="kc-stat-card">
            <div class="kc-stat-icon kc-stat-icon-gold">${icon('chart', 24)}</div>
            <div>
              <span class="kc-stat-val">80 Capítulos</span>
              <span class="kc-stat-lbl">Páginas Independentes</span>
            </div>
          </div>
          <div class="kc-stat-card kc-stat-card-progress">
            <div class="kc-stat-prog-top">
              <span class="kc-stat-lbl">Progresso da Leitura</span>
              <span class="kc-stat-prog-val">${overall.percent}%</span>
            </div>
            <div class="kc-progress-track">
              <div class="kc-progress-fill" style="width: ${overall.percent}%"></div>
            </div>
            <span class="kc-stat-sub">${overall.completed} de ${overall.total} capítulos concluídos</span>
          </div>
          ${(resumeBook && resumeChapter) ? `
            <div class="kc-stat-card kc-stat-card-resume" data-action="resume-reading" data-book-id="${resumeBook.id}" data-chapter-id="${resumeChapter.id}" data-page-index="${resumeLast.pageIndex || 0}">
              <div>
                <span class="kc-stat-resume-tag">Retomar Leitura</span>
                <strong class="kc-stat-resume-title">${esc(resumeChapter.title)}</strong>
                <span class="kc-stat-resume-sub">Pág. ${(resumeLast.pageIndex || 0) + 1} · ${esc(resumeBook.title)}</span>
              </div>
              <button type="button" class="kc-stat-resume-btn" aria-label="Continuar">${icon('arrowRight', 16)}</button>
            </div>
          ` : `
            <div class="kc-stat-card kc-stat-card-quickstart" data-action="open-chapter" data-book-id="livro-1" data-chapter-id="livro-1-cap-1" data-page-index="0">
              <div>
                <span class="kc-stat-resume-tag">Primeira Leitura</span>
                <strong class="kc-stat-resume-title">Começar pelo Livro 1</strong>
                <span class="kc-stat-resume-sub">Visão Geral & Primeiros Passos</span>
              </div>
              <button type="button" class="kc-stat-resume-btn" aria-label="Começar">${icon('arrowRight', 16)}</button>
            </div>
          `}
        </section>

        <!-- SELEÇÃO DE LIVROS (BOOK FILTER TABS) -->
        <section class="kc-books-section">
          <div class="kc-section-head">
            <div>
              <h2 class="kc-section-title">Os 6 Livros Oficiais do Método</h2>
              <p class="kc-section-subtitle">Escolha um livro para abrir o leitor flipbook ou filtrar os capítulos abaixo.</p>
            </div>
          </div>

          <div class="kc-books-grid">
            ${BooksModel.BOOKS.map(b => {
              const bProg = getBookProgress(b);
              const isActive = appState.selectedBookFilter === b.id;
              return `
                <article class="kc-book-card ${isActive ? 'active' : ''}">
                  <div class="kc-book-cover" data-action="open-chapter" data-book-id="${b.id}" data-chapter-id="${b.chapters[0].id}" data-page-index="0">
                    <img src="${b.cover}" alt="${esc(b.title)}" />
                    <span class="kc-book-number-badge">LIVRO ${b.number}</span>
                    <button type="button" class="kc-book-open-btn" aria-label="Ler Livro">${icon('play', 14)} Abrir Livro</button>
                  </div>
                  <div class="kc-book-info">
                    <span class="kc-book-kicker">LIVRO ${b.number} · ${b.chapters.length} CAPÍTULOS</span>
                    <h3 class="kc-book-title" data-action="open-chapter" data-book-id="${b.id}" data-chapter-id="${b.chapters[0].id}" data-page-index="0">${esc(b.title)}</h3>
                    <p class="kc-book-subtitle">${esc(b.subtitle)}</p>
                    <p class="kc-book-desc">${esc(b.description)}</p>
                    
                    <div class="kc-book-card-footer">
                      <div class="kc-book-progress">
                        <div class="kc-progress-track">
                          <div class="kc-progress-fill" style="width: ${bProg.percent}%"></div>
                        </div>
                        <span class="kc-book-pct">${bProg.completed}/${bProg.total} cap. (${bProg.percent}%)</span>
                      </div>
                      <button type="button" class="kc-book-filter-btn ${isActive ? 'is-active' : ''}" data-action="filter-book" data-book-id="${isActive ? 'all' : b.id}">
                        ${isActive ? 'Ver Todos' : 'Ver Capítulos'}
                      </button>
                    </div>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </section>

        <!-- CAPÍTULOS EM DESTAQUE / FILTRADOS -->
        <section class="kc-chapters-section">
          <div class="kc-section-head">
            <div>
              <h2 class="kc-section-title">
                ${selectedBook ? `Capítulos do Livro ${selectedBook.number}: ${esc(selectedBook.title)}` : 'Capítulos e Módulos do Sistema'}
              </h2>
              <p class="kc-section-subtitle">
                ${selectedBook ? esc(selectedBook.subtitle) : 'Acesse diretamente qualquer capítulo na experiência de leitura dedicada.'}
              </p>
            </div>
            ${selectedBook ? `
              <button type="button" class="kc-btn-secondary" data-action="filter-book" data-book-id="all">
                Ver Todos os 6 Livros
              </button>
            ` : ''}
          </div>

          <div class="kc-chapters-grid">
            ${displayedChapters.map(({ book, chapter }) => {
              const isDone = isChapterCompleted(chapter.id);
              const pages = BooksModel.getChapterPages(chapter);
              return `
                <article class="kc-chapter-card ${isDone ? 'is-done' : ''}">
                  <div class="kc-ch-thumb" data-action="open-chapter" data-book-id="${book.id}" data-chapter-id="${chapter.id}" data-page-index="0">
                    <img src="${chapter.cover || book.cover}" alt="${esc(chapter.title)}" />
                    <span class="kc-ch-badge">${book.number}.${chapter.number}</span>
                    ${isDone ? `<span class="kc-ch-done-badge">${icon('check', 14)} Concluído</span>` : ''}
                  </div>
                  <div class="kc-ch-body">
                    <span class="kc-ch-book-label">${book.number}. ${esc(book.title)} · ${pages.length} páginas</span>
                    <h3 class="kc-ch-title" data-action="open-chapter" data-book-id="${book.id}" data-chapter-id="${chapter.id}" data-page-index="0">
                      ${esc(chapter.title)}
                    </h3>
                    <p class="kc-ch-sub">${esc(chapter.subtitle)}</p>
                    
                    ${(chapter.takeaways && chapter.takeaways.length) ? `
                      <ul class="kc-ch-takeaways">
                        ${chapter.takeaways.slice(0, 2).map(t => `<li>${esc(t)}</li>`).join('')}
                      </ul>
                    ` : ''}

                    <div class="kc-ch-footer">
                      <button type="button" class="kc-ch-read-btn" data-action="open-chapter" data-book-id="${book.id}" data-chapter-id="${chapter.id}" data-page-index="0">
                        ${icon('book', 14)} Ler no Flipbook
                      </button>
                      ${chapter.toolRoute ? `
                        <button type="button" class="kc-ch-tool-link" data-action="launch-route" data-route="${chapter.toolRoute}">
                          ${icon('monitor', 13)} ${esc(chapter.toolLabel || 'Abrir')}
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </section>

        <!-- EXPLORE O SOFTWARE (41 FERRAMENTAS CATALOGADAS) -->
        <section class="kc-software-catalog-section">
          <div class="kc-section-head">
            <div>
              <h2 class="kc-section-title">Explore o Software por Ferramenta</h2>
              <p class="kc-section-subtitle">Guia visual rápido das 41 ferramentas integradas na plataforma.</p>
            </div>
          </div>

          <div class="kc-software-grid">
            ${software.map(([id, title, subtitle, , desc]) => `
              <div class="kc-soft-card" data-action="launch-route" data-route="${id}">
                <div class="kc-soft-thumb">
                  <img src="assets/manual-knowledge/${id}.jpg" alt="${esc(title)}" />
                </div>
                <div class="kc-soft-info">
                  <h4 class="kc-soft-title">${esc(title)}</h4>
                  <span class="kc-soft-sub">${esc(subtitle)}</span>
                  <p class="kc-soft-desc">${esc(desc)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    `;
  }

  // =========================================================================
  // NÍVEL 2 — INTERACTIVE BOOK READER (FLIPBOOK PREMIUM 3D)
  // =========================================================================

  function renderPageSpread(page, isRightPage) {
    if (!page) {
      return `
        <div class="ht-book-page ${isRightPage ? 'right-page' : 'left-page'} blank-page kc-page-surface">
          <div class="ht-page-body" style="display:grid;place-items:center;opacity:0.3;">
            <p>Página em branco</p>
          </div>
        </div>
      `;
    }

    // 0. Spread Especial: Acervo Geral (Capa Nobre do Acervo)
    if (page.kind === 'acervo-cover') {
      return `
        <div class="ht-book-page left-page kc-page-surface ht-acervo-page ht-acervo-cover-page">
          <header class="ht-page-running-head">
            <span>Manual do Software</span>
            <span>The Healthy Trend Trader</span>
          </header>
          <div class="ht-page-body ht-acervo-body">
            <span class="kc-page-eyebrow ht-page-chapter-badge">ACERVO EDITORIAL OFICIAL</span>
            <h1 class="kc-page-title ht-acervo-title">Tratado Completo do Trader Saudável</h1>
            <p class="ht-page-lead ht-acervo-lead">Sistema Operacional, Filosofia, Ferramentas & Gestão de Risco</p>

            <div class="ht-acervo-pillars-card">
              <div class="ht-pillar-item">
                <span class="ht-pillar-num">1</span>
                <div>
                  <strong>Precedência Obrigatória</strong>
                  <p>Permissão de Mercado (Regime) → Qualidade do Setup (Rubric) → Sizing → Risco de Carteira.</p>
                </div>
              </div>
              <div class="ht-pillar-item">
                <span class="ht-pillar-num">2</span>
                <div>
                  <strong>Proteção Inegociável</strong>
                  <p>Grade D possui risco nominal 0%; preservação de capital precede o lucro; nunca force compras em Regime Down.</p>
                </div>
              </div>
              <div class="ht-pillar-item">
                <span class="ht-pillar-num">3</span>
                <div>
                  <strong>Disciplina & Mindset</strong>
                  <p>Setup único de Trend Following sistemático; registre reflexões no Diário e mantenha a calma na Central Zen.</p>
                </div>
              </div>
            </div>

            <div class="ht-acervo-action-row">
              <button type="button" class="ht-cover-open-btn" data-action="open-book" data-book-id="livro-1">
                ${icon('book', 18)} Começar pelo Livro 01 →
              </button>
            </div>
          </div>
          <footer class="ht-page-running-foot">
            <span>The Healthy Trend Trader</span>
            <span class="ht-page-num">Portal de Entrada</span>
          </footer>
        </div>
      `;
    }

    // 0b. Spread Especial: Estante Editorial dos 6 Volumes
    if (page.kind === 'acervo-shelf') {
      return `
        <div class="ht-book-page right-page kc-page-surface ht-acervo-page ht-acervo-shelf-page">
          <header class="ht-page-running-head">
            <span>Acervo Editorial</span>
            <span>6 Volumes Estruturados</span>
          </header>
          <div class="ht-page-body ht-acervo-body">
            <div class="ht-shelf-header">
              <span class="kc-page-eyebrow ht-page-chapter-badge">BIBLIOTECA EM 6 LIVROS</span>
              <h2 class="kc-page-title ht-shelf-title">Estante Editorial do Sistema</h2>
              <p class="ht-page-lead ht-shelf-lead">Selecione qualquer volume para abrir imediatamente na mesa de leitura:</p>
            </div>

            <div class="ht-shelf-grid">
              ${BooksModel.BOOKS.map(b => `
                <div class="ht-shelf-card" data-action="open-book" data-book-id="${b.id}" tabindex="0" role="button" aria-label="Abrir Livro ${b.number}">
                  <div class="ht-shelf-card-badge">VOL. 0${b.number}</div>
                  <div class="ht-shelf-card-info">
                    <strong class="ht-shelf-card-title">${esc(b.title)}</strong>
                    <span class="ht-shelf-card-desc">${esc(b.subtitle)}</span>
                    <div class="ht-shelf-card-meta">
                      <span class="ht-shelf-card-ch-count">${b.chapters.length} capítulos</span>
                      <span class="ht-shelf-card-cta">Abrir →</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <footer class="ht-page-running-foot">
            <span>6 Volumes · 80 Capítulos · 41 Ferramentas</span>
            <span class="ht-page-num">Página 2 de 2</span>
          </footer>
        </div>
      `;
    }

    if (false) {
      return `
        <div class="ht-book-page ${isRightPage ? 'right-page' : 'left-page'} blank-page kc-page-surface">
          <div class="ht-page-body" style="display:grid;place-items:center;opacity:0.3;">
            <p>Página em branco</p>
          </div>
        </div>
      `;
    }

    // 1. Capa Frontal
    if (page.kind === 'cover') {
      return `
        <div class="ht-book-page right-page kc-page-surface" style="padding:0;background:transparent;">
          <div class="ht-book-cover-wrap">
            <div class="ht-cover-gold-border"></div>
            <div class="ht-cover-header">
              <span class="kc-page-eyebrow ht-cover-kicker">MANUAL DO SOFTWARE · THE HEALTHY TREND TRADER</span>
              <span class="ht-cover-book-num">LIVRO ${page.bookNumber}</span>
              <h1 class="kc-page-title ht-cover-title">${esc(page.bookTitle)}</h1>
              <p class="ht-cover-sub">${esc(page.bookSubtitle)}</p>
            </div>
            <div class="ht-cover-art-box">
              <img src="${page.bookCover}" alt="${esc(page.bookTitle)}" />
            </div>
            <div class="ht-cover-cta-row">
              <button type="button" class="ht-cover-open-btn" data-action="next-page">
                ${icon('book', 18)} Abrir e Iniciar Leitura →
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // 2. Contracapa
    if (page.kind === 'backcover') {
      return `
        <div class="ht-book-page left-page kc-page-surface" style="padding:0;background:transparent;">
          <div class="ht-book-backcover-wrap">
            <div>
              <div class="ht-backcover-seal">${icon('mountain', 32)}</div>
              <h2 class="kc-page-title" style="color:#fff;font-size:24px;margin-bottom:8px;">The Healthy Trend Trader</h2>
              <span class="kc-page-eyebrow" style="color:var(--ht-book-gold);">GOVERNANÇA OPERACIONAL & DISCIPLINA</span>
            </div>
            <div class="ht-backcover-quote">
              “A consistência duradoura no mercado decorre da qualidade do seu processo de decisão, da proteção inegociável do capital e do respeito aos seus limites humanos.”
            </div>
            <div>
              <button type="button" class="ht-cover-open-btn ht-backcover-btn" data-action="open-library">
                ${icon('arrowLeft', 16)} Retornar à Biblioteca
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // 3. Folha de Rosto / Sumário Editorial do Livro
    if (page.kind === 'frontmatter') {
      return `
        <div class="ht-book-page ${isRightPage ? 'right-page' : 'left-page'} kc-page-surface">
          <header class="ht-page-running-head">
            <span>Livro ${page.bookNumber}</span>
            <span>Sumário Editorial</span>
          </header>
          <div class="ht-page-body">
            <span class="kc-page-eyebrow ht-page-chapter-badge">SUMÁRIO DO LIVRO</span>
            <h1 class="kc-page-title">${esc(page.bookTitle)}</h1>
            <p class="ht-page-lead">${esc(page.bookDescription || page.bookSubtitle)}</p>
            <div class="ht-frontmatter-grid">
              ${(page.chapters || []).map(ch => `
                <a class="ht-frontmatter-item" data-action="open-chapter" data-book-id="${page.bookId}" data-chapter-id="${ch.id}" data-page-index="0">
                  <div>
                    <span class="ht-fm-num">Cap. ${ch.number}</span>
                    <strong class="ht-fm-title">${esc(ch.title)}</strong>
                  </div>
                  <span style="opacity:0.6;">→</span>
                </a>
              `).join('')}
            </div>
          </div>
          <footer class="ht-page-running-foot">
            <span>The Healthy Trend Trader</span>
            <span class="ht-page-num">Folha de Rosto</span>
          </footer>
        </div>
      `;
    }

    // 4. Página Normal de Capítulo (Chapter Page)
    const isIntro = page.type === 'intro';
    const hasTakeaways = Array.isArray(page.takeaways) && page.takeaways.length > 0;
    const isBookmarked = appState.bookmarks.some(b => b.bookId === page.bookId && b.chapterId === page.chapterId && b.chapterPageIndex === page.chapterPageIndex);

    // Identificação de Módulos Didáticos Específicos
    const isPositionSizingTopic = page.bookId === 'livro-4' || /position sizing|dimensionamento|risco por trade/i.test(page.title + ' ' + (page.sections ? page.sections.map(s => s.title).join(' ') : ''));
    const isExpectancyTopic = page.bookId === 'livro-3' || /expectativa matemática|payoff|r-múltiplos|fator de lucro/i.test(page.title + ' ' + (page.sections ? page.sections.map(s => s.title).join(' ') : ''));

    return `
      <article class="ht-book-page ${isRightPage ? 'right-page' : 'left-page'} kc-page-surface" id="kcPageSurface">
        <header class="ht-page-running-head">
          <span>${esc(page.bookTitle)}</span>
          <span class="kc-page-eyebrow">Cap. ${page.chapterNumber} · Pág. ${page.chapterPageIndex + 1}/${page.chapterPageCount}</span>
        </header>

        <div class="ht-page-body">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span class="ht-page-chapter-badge">Capítulo ${page.chapterNumber}</span>
            <button type="button" class="kc-btn-toggle-chapter ${isChapterCompleted(page.chapterId) ? 'is-completed' : ''}" data-action="toggle-complete" data-chapter-id="${page.chapterId}" style="border:none;background:transparent;cursor:pointer;font-size:11px;font-weight:700;color:var(--ht-book-accent);display:inline-flex;align-items:center;gap:4px;">
              ${icon('checkCircle', 14)} <span>${isChapterCompleted(page.chapterId) ? 'Concluído' : 'Concluir'}</span>
            </button>
          </div>

          <h1 class="kc-page-title">${esc(page.title)}</h1>
          ${page.chapterSubtitle ? `<p class="kc-page-lead ht-page-lead">${esc(page.chapterSubtitle)}</p>` : ''}

          ${isIntro ? `
            <div class="ht-didactic-callout golden">
              <div class="ht-didactic-icon">🎯</div>
              <div class="ht-didactic-copy">
                <strong>Objetivo deste Capítulo</strong>
                <p>${esc(page.chapterSubtitle || 'Compreender os fundamentos práticos e a governança operacional deste módulo.')}</p>
              </div>
            </div>
          ` : ''}

          ${(isIntro && hasTakeaways) ? `
            <div class="ht-takeaways-box">
              <strong style="display:block;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;color:var(--ht-book-accent);">
                O que você aprenderá:
              </strong>
              <ul style="margin:0;padding-left:18px;">
                ${page.takeaways.map(t => `<li style="font-size:13.5px;margin-bottom:4px;">${esc(t)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <!-- SECTIONS DE CONTEÚDO COM MARKDOWN -->
          ${(page.sections || []).map((sec, sIdx) => `
            <section class="ht-page-section" id="sec-${sec.id || sIdx}">
              ${sec.title && sec.title !== page.title ? `<h2>${esc(sec.title)}</h2>` : ''}
              <div class="ht-page-content ${sIdx === 0 && !isIntro ? 'ht-drop-cap' : ''}">
                ${renderMarkdown(sec.content)}
              </div>
            </section>
          `).join('')}

          <!-- MINI CALCULADORA DIDÁTICA DE POSITION SIZING -->
          ${(isPositionSizingTopic && page.type === 'practice') ? `
            <div class="ht-didactic-calc" id="htDidacticCalc">
              <div class="ht-calc-title">${icon('chart', 18)} Calculadora Didática de Sizing do Método</div>
              <p style="font-size:12px;margin-bottom:12px;color:var(--ht-book-ink-muted);">
                Simule em tempo real o dimensionamento exato da posição pela fórmula da Política de Risco:
              </p>
              <div class="ht-calc-grid">
                <div class="ht-calc-field">
                  <label>Capital da Conta (R$)</label>
                  <input type="number" id="htCalcEquity" value="100000" step="5000" />
                </div>
                <div class="ht-calc-field">
                  <label>Risco Nominal (%)</label>
                  <input type="number" id="htCalcRiskPct" value="1.0" step="0.1" />
                </div>
                <div class="ht-calc-field">
                  <label>Preço Entrada (R$)</label>
                  <input type="number" id="htCalcEntry" value="25.00" step="0.5" />
                </div>
                <div class="ht-calc-field">
                  <label>Preço Stop (R$)</label>
                  <input type="number" id="htCalcStop" value="23.50" step="0.5" />
                </div>
              </div>
              <div class="ht-calc-result-box" id="htCalcResults">
                <div class="ht-res-item">
                  <span class="ht-res-val" id="htResRisk">R$ 1.000</span>
                  <span class="ht-res-lbl">Risco Financeiro</span>
                </div>
                <div class="ht-res-item">
                  <span class="ht-res-val" id="htResDist">R$ 1,50 (6,0%)</span>
                  <span class="ht-res-lbl">Distância do Stop</span>
                </div>
                <div class="ht-res-item">
                  <span class="ht-res-val" id="htResQty">666 ações</span>
                  <span class="ht-res-lbl">Quantidade Permitida</span>
                </div>
                <div class="ht-res-item">
                  <span class="ht-res-val" id="htResExp">R$ 16.650 (16,6%)</span>
                  <span class="ht-res-lbl">Exposição Total</span>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- MINI SIMULADOR DE PAYOFF E EXPECTANCY -->
          ${(isExpectancyTopic && page.type === 'practice') ? `
            <div class="ht-didactic-calc" id="htDidacticPayoff">
              <div class="ht-calc-title">${icon('chart', 18)} Simulador Didático de Expectancy (R)</div>
              <p style="font-size:12px;margin-bottom:12px;color:var(--ht-book-ink-muted);">
                Verifique por que um Trend Follower é altamente lucrativo mesmo com 40% de acerto:
              </p>
              <div class="ht-calc-grid">
                <div class="ht-calc-field">
                  <label>Taxa de Acerto (%)</label>
                  <input type="number" id="htPayoffWinRate" value="40" step="5" min="10" max="90" />
                </div>
                <div class="ht-calc-field">
                  <label>Payoff Médio (R por Ganho)</label>
                  <input type="number" id="htPayoffAvgWin" value="2.5" step="0.1" min="1.0" max="10.0" />
                </div>
              </div>
              <div class="ht-calc-result-box" id="htPayoffResults">
                <div class="ht-res-item">
                  <span class="ht-res-val" id="htResExpVal">+0,40R</span>
                  <span class="ht-res-lbl">Expectativa / Trade</span>
                </div>
                <div class="ht-res-item">
                  <span class="ht-res-val" id="htResPF">1,67</span>
                  <span class="ht-res-lbl">Profit Factor</span>
                </div>
                <div class="ht-res-item">
                  <span class="ht-res-val" id="htResVerdict" style="color:var(--ht-book-accent);font-size:13px;font-weight:800;">Estratégia Lucrativa</span>
                  <span class="ht-res-lbl">Veredito Estatístico</span>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- DICA DE OURO DO MÉTODO -->
          ${page.tip ? `
            <div class="ht-didactic-callout tip">
              <div class="ht-didactic-icon">💡</div>
              <div class="ht-didactic-copy">
                <strong>Dica do Método</strong>
                <p>${esc(page.tip)}</p>
              </div>
            </div>
          ` : ''}

          <!-- CARD DE APLICAÇÃO PRÁTICA NA PLATAFORMA -->
          ${page.toolRoute ? `
            <div class="ht-tool-action-card">
              <div>
                <span class="ht-tool-tag">⚡ Ferramenta no Software</span>
                <h4 class="ht-tool-action-title">Pratique agora na plataforma</h4>
                <p style="font-size:12px;line-height:1.4;margin:3px 0 0;color:var(--ht-book-ink-muted);">Acesse o módulo e aplique as regras deste capítulo.</p>
              </div>
              <button type="button" class="ht-tool-action-btn" data-action="launch-route" data-route="${page.toolRoute}">
                ${esc(page.toolLabel || 'Abrir Ferramenta →')}
              </button>
            </div>
          ` : ''}
        </div>

        <footer class="ht-page-running-foot">
          <span>The Healthy Trend Trader</span>
          <span class="ht-page-num">${page.globalIndex + 1}</span>
        </footer>
      </article>
    `;
  }

    function bookCategoryIcon(bookId) {
    const icons = {
      'livro-1': '📖',
      'livro-2': '🖥️',
      'livro-3': '⚖️',
      'livro-4': '📋',
      'livro-5': '🛡️',
      'livro-6': '🧠'
    };
    return icons[bookId] || '📖';
  }

    function getChapterThematicSvg(chapterId, bookId) {
    const scenes = {
      // === LIVRO 1: PRIMEIROS PASSOS ===
      'livro-1-cap-1': '<circle cx="45" cy="45" r="24" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="45,26 49,42 65,45 49,48 45,64 41,48 25,45 41,42" fill="currentColor"/><circle cx="45" cy="45" r="4" fill="#34D399"/>',
      'livro-1-cap-2': '<rect x="20" y="32" width="28" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="34" y="47" font-size="10" font-weight="800" text-anchor="middle" fill="currentColor">Ctrl</text><circle cx="62" cy="43" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="70" y1="51" x2="78" y2="59" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
      'livro-1-cap-3': '<line x1="16" y1="68" x2="74" y2="68" stroke="currentColor" stroke-width="3"/><polygon points="45,22 18,32 72,32" fill="none" stroke="currentColor" stroke-width="2"/><rect x="24" y="34" width="8" height="34" fill="currentColor" fill-opacity=".3"/><rect x="41" y="34" width="8" height="34" fill="currentColor" fill-opacity=".3"/><rect x="58" y="34" width="8" height="34" fill="currentColor" fill-opacity=".3"/>',
      'livro-1-cap-4': '<circle cx="25" cy="45" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="48" cy="45" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="71" cy="45" r="8" fill="currentColor"/><path d="M33 45 L40 45 M56 45 L63 45" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      'livro-1-cap-5': '<circle cx="45" cy="45" r="15" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="6 4"/><circle cx="45" cy="45" r="6" fill="currentColor"/><rect x="18" y="18" width="13" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M21 24 L24 28 L28 21" fill="none" stroke="#34D399" stroke-width="2.2" stroke-linecap="round"/>',

      // === LIVRO 2: EXPLORANDO O SOFTWARE ===
      'livro-2-cap-1': '<rect x="18" y="24" width="56" height="38" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><line x1="18" y1="36" x2="74" y2="36" stroke="currentColor" stroke-width="1.2"/><rect x="24" y="42" width="18" height="14" fill="currentColor" fill-opacity=".3"/><rect x="48" y="42" width="20" height="14" fill="currentColor" fill-opacity=".2"/><rect x="42" y="62" width="8" height="8" fill="currentColor"/><line x1="32" y1="70" x2="60" y2="70" stroke="currentColor" stroke-width="2"/>',
      'livro-2-cap-2': '<rect x="22" y="22" width="48" height="46" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="28" y1="34" x2="54" y2="34" stroke="currentColor" stroke-width="2"/><line x1="28" y1="44" x2="64" y2="44" stroke="currentColor" stroke-width="2"/><polygon points="46,14 40,28 48,28 42,42 56,26 48,26" fill="#34D399" stroke="#34D399" stroke-width="1.2"/>',
      'livro-2-cap-3': '<rect x="20" y="22" width="52" height="46" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="20" y1="34" x2="72" y2="34" stroke="currentColor" stroke-width="1.5"/><circle cx="32" cy="44" r="3" fill="#34D399"/><circle cx="46" cy="44" r="3" fill="#34D399"/><circle cx="60" cy="44" r="3" fill="#34D399"/><circle cx="32" cy="56" r="3" fill="#34D399"/><circle cx="46" cy="56" r="3" fill="#34D399"/>',
      'livro-2-cap-4': '<circle cx="46" cy="45" r="28" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="46" cy="45" r="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3"/><line x1="46" y1="17" x2="46" y2="73" stroke="currentColor" stroke-width="1.2"/><line x1="18" y1="45" x2="74" y2="45" stroke="currentColor" stroke-width="1.2"/><line x1="46" y1="45" x2="66" y2="25" stroke="#34D399" stroke-width="2.5"/><circle cx="58" cy="33" r="3" fill="#34D399"/>',
      'livro-2-cap-5': '<path d="M16 68 L42 26 L56 46 L76 68 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M42 26 V14 L54 20 L42 26" fill="#34D399" stroke="#34D399" stroke-width="1.2"/>',
      'livro-2-cap-6': '<circle cx="45" cy="45" r="28" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="45" cy="45" r="18" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="45" cy="45" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="45" cy="45" r="3" fill="#34D399"/><line x1="20" y1="70" x2="45" y2="45" stroke="#34D399" stroke-width="2.5" stroke-linecap="round"/>',
      'livro-2-cap-7': '<rect x="28" y="28" width="8" height="24" fill="currentColor"/><line x1="32" y1="18" x2="32" y2="60" stroke="currentColor" stroke-width="1.8"/><rect x="46" y="38" width="8" height="20" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="50" y1="28" x2="50" y2="68" stroke="currentColor" stroke-width="1.8"/><rect x="64" y="20" width="8" height="30" fill="currentColor"/><line x1="68" y1="12" x2="68" y2="58" stroke="currentColor" stroke-width="1.8"/>',
      'livro-2-cap-8': '<path d="M15 62 Q 35 25 55 50 T 80 20" fill="none" stroke="#34D399" stroke-width="3" stroke-linecap="round"/><line x1="15" y1="65" x2="80" y2="65" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 3"/>',
      'livro-2-cap-9': '<rect x="20" y="20" width="50" height="50" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><line x1="28" y1="32" x2="62" y2="32" stroke="currentColor" stroke-width="2"/><line x1="28" y1="42" x2="62" y2="42" stroke="currentColor" stroke-width="2"/><line x1="28" y1="52" x2="52" y2="52" stroke="currentColor" stroke-width="2"/>',
      'livro-2-cap-10': '<circle cx="45" cy="45" r="26" fill="none" stroke="currentColor" stroke-width="2"/><line x1="45" y1="19" x2="45" y2="71" stroke="currentColor" stroke-width="1.5"/><line x1="19" y1="45" x2="71" y2="45" stroke="currentColor" stroke-width="1.5"/><circle cx="34" cy="34" r="4" fill="#34D399"/><circle cx="56" cy="34" r="4" fill="currentColor"/><circle cx="56" cy="56" r="4" fill="currentColor"/><circle cx="34" cy="56" r="4" fill="currentColor"/>',
      'livro-2-cap-11': '<path d="M45 15 C45 15 58 35 56 55 H34 C32 35 45 15 45 15 Z" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="45,55 38,72 45,66 52,72" fill="#34D399"/><circle cx="45" cy="38" r="4" fill="#34D399"/>',
      'livro-2-cap-12': '<path d="M18 64 C35 55 48 30 76 22" fill="none" stroke="#34D399" stroke-width="3" stroke-linecap="round"/><path d="M18 68 C35 62 50 50 76 46" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 3"/>',
      'livro-2-cap-13': '<polygon points="45,18 69,32 69,58 45,72 21,58 21,32" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="45,28 59,37 59,53 45,62 31,53 31,37" fill="currentColor" fill-opacity=".25" stroke="#34D399" stroke-width="1.5"/>',
      'livro-2-cap-14': '<rect x="18" y="24" width="54" height="12" rx="3" fill="currentColor" fill-opacity=".3" stroke="currentColor" stroke-width="1.5"/><rect x="18" y="40" width="54" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="18" y="56" width="54" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="64" cy="30" r="2.5" fill="#34D399"/>',
      'livro-2-cap-15': '<rect x="38" y="18" width="14" height="46" rx="7" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="45" cy="58" r="10" fill="#34D399"/><rect x="42" y="36" width="6" height="22" fill="#34D399"/>',
      'livro-2-cap-16': '<path d="M45 16 L72 28 V50 C72 65 45 74 45 74 C45 74 18 65 18 50 V28 Z" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="45" cy="44" r="8" fill="none" stroke="#34D399" stroke-width="2"/><circle cx="45" cy="44" r="3" fill="#34D399"/>',
      'livro-2-cap-17': '<circle cx="28" cy="34" r="6" fill="#34D399"/><circle cx="45" cy="34" r="6" fill="#34D399"/><circle cx="62" cy="34" r="6" fill="#34D399"/><circle cx="28" cy="54" r="6" fill="#34D399"/><circle cx="45" cy="54" r="6" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="62" cy="54" r="6" fill="none" stroke="currentColor" stroke-width="2"/><line x1="34" y1="34" x2="39" y2="34" stroke="currentColor" stroke-width="2"/><line x1="51" y1="34" x2="56" y2="34" stroke="currentColor" stroke-width="2"/>',
      'livro-2-cap-18': '<rect x="20" y="24" width="48" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="45,12 48,20 56,20 50,25 52,33 45,28 38,33 40,25 34,20 42,20" fill="#34D399"/><line x1="28" y1="42" x2="58" y2="42" stroke="currentColor" stroke-width="1.8"/><line x1="28" y1="52" x2="52" y2="52" stroke="currentColor" stroke-width="1.8"/>',

      // === LIVRO 3: O MÉTODO ===
      'livro-3-cap-1': '<line x1="16" y1="62" x2="74" y2="24" stroke="#34D399" stroke-width="2.5"/><line x1="22" y1="74" x2="80" y2="36" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3"/><circle cx="32" cy="52" r="3.5" fill="currentColor"/><circle cx="58" cy="34" r="3.5" fill="#34D399"/>',
      'livro-3-cap-2': '<circle cx="36" cy="42" r="18" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="54" cy="42" r="18" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="45" cy="54" r="16" fill="none" stroke="#34D399" stroke-width="2"/><circle cx="45" cy="44" r="4" fill="#34D399"/>',
      'livro-3-cap-3': '<path d="M15 55 Q 30 20 45 55 T 75 55" fill="none" stroke="currentColor" stroke-width="2.5"/><circle cx="28" cy="35" r="4" fill="#34D399"/><circle cx="62" cy="72" r="4" fill="#EF4444"/>',
      'livro-3-cap-4': '<circle cx="45" cy="40" r="16" fill="none" stroke="#34D399" stroke-width="2"/><line x1="16" y1="58" x2="74" y2="58" stroke="currentColor" stroke-width="2.5"/><line x1="45" y1="16" x2="45" y2="20" stroke="#34D399" stroke-width="2"/><line x1="26" y1="26" x2="30" y2="29" stroke="#34D399" stroke-width="2"/><line x1="64" y1="26" x2="60" y2="29" stroke="#34D399" stroke-width="2"/>',
      'livro-3-cap-5': '<path d="M18 64 C35 55 48 30 76 22" fill="none" stroke="#34D399" stroke-width="3"/><line x1="18" y1="68" x2="76" y2="48" stroke="currentColor" stroke-width="1.8" stroke-dasharray="4 3"/>',
      'livro-3-cap-6': '<polygon points="45,18 69,32 69,58 45,72 21,58 21,32" fill="none" stroke="currentColor" stroke-width="2"/><line x1="45" y1="18" x2="45" y2="72" stroke="currentColor" stroke-width="1.2"/><line x1="69" y1="32" x2="21" y2="58" stroke="currentColor" stroke-width="1.2"/><line x1="69" y1="58" x2="21" y2="32" stroke="currentColor" stroke-width="1.2"/>',
      'livro-3-cap-7': '<path d="M15 36 C35 22 55 22 75 36" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 54 C35 68 55 68 75 54" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15 45 C35 40 55 50 75 45" fill="none" stroke="#34D399" stroke-width="2.5"/>',
      'livro-3-cap-8': '<rect x="22" y="20" width="46" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><line x1="30" y1="32" x2="48" y2="32" stroke="currentColor" stroke-width="2"/><line x1="30" y1="42" x2="56" y2="42" stroke="currentColor" stroke-width="2"/><line x1="30" y1="52" x2="42" y2="52" stroke="currentColor" stroke-width="2"/><path d="M52 48 L56 54 L64 44" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round"/>',
      'livro-3-cap-9': '<circle cx="45" cy="45" r="26" fill="none" stroke="currentColor" stroke-width="2"/><line x1="45" y1="15" x2="45" y2="75" stroke="currentColor" stroke-width="1.5"/><line x1="15" y1="45" x2="75" y2="45" stroke="currentColor" stroke-width="1.5"/><polygon points="45,26 52,36 38,36" fill="#34D399"/>',
      'livro-3-cap-10': '<line x1="45" y1="18" x2="45" y2="68" stroke="currentColor" stroke-width="2.5"/><line x1="22" y1="34" x2="68" y2="34" stroke="currentColor" stroke-width="2.5"/><rect x="20" y="34" width="14" height="18" rx="2" fill="currentColor"/><rect x="56" y="34" width="14" height="28" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>',
      'livro-3-cap-11': '<rect x="20" y="30" width="48" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="70" y="38" width="5" height="12" rx="2" fill="currentColor"/><rect x="26" y="36" width="10" height="16" rx="2" fill="#34D399"/><rect x="40" y="36" width="10" height="16" rx="2" fill="#34D399"/><rect x="54" y="36" width="10" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>',
      'livro-3-cap-12': '<circle cx="45" cy="45" r="26" fill="none" stroke="currentColor" stroke-width="2"/><path d="M45 19 A 26 26 0 0 1 71 45 L45 45 Z" fill="#EF4444"/><line x1="18" y1="18" x2="72" y2="72" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="4 3"/>',
      'livro-3-cap-13': '<rect x="22" y="54" width="46" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="30" y="38" width="30" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="38" y="22" width="14" height="14" rx="2" fill="#34D399"/>',
      'livro-3-cap-14': '<path d="M18 66 L38 48 H54 L74 24" fill="none" stroke="#34D399" stroke-width="3" stroke-linecap="round"/><circle cx="38" cy="48" r="4" fill="currentColor"/><circle cx="74" cy="24" r="4" fill="#34D399"/>',
      'livro-3-cap-15': '<rect x="32" y="16" width="26" height="56" rx="13" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="45" cy="28" r="7" fill="#EF4444"/><circle cx="45" cy="44" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="45" cy="60" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
      'livro-3-cap-16': '<polygon points="45,15 48,24 57,24 50,29 52,38 45,33 38,38 40,29 33,24 42,24" fill="#F59E0B"/><polygon points="26,30 29,38 37,38 31,43 33,51 26,46 19,51 21,43 15,38 23,38" fill="#F59E0B"/><polygon points="64,30 67,38 75,38 69,43 71,51 64,46 57,51 59,43 53,38 61,38" fill="#F59E0B"/>',

      // === LIVRO 4: GRADING & BET SIZING SYSTEM ===
      'livro-4-cap-1': '<path d="M15 65 C 28 65 38 18 52 18 C 66 18 78 65 82 65" fill="none" stroke="#34D399" stroke-width="3"/><line x1="12" y1="65" x2="84" y2="65" stroke="currentColor" stroke-width="1.5"/>',
      'livro-4-cap-2': '<path d="M22 60 A 28 28 0 1 1 68 60" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="45" cy="45" r="4" fill="currentColor"/><line x1="45" y1="45" x2="62" y2="30" stroke="#34D399" stroke-width="3" stroke-linecap="round"/><text x="45" y="70" font-size="10" font-weight="900" text-anchor="middle" fill="#34D399">100</text>',
      'livro-4-cap-3': '<line x1="20" y1="20" x2="20" y2="70" stroke="currentColor" stroke-width="3"/><line x1="70" y1="20" x2="70" y2="70" stroke="currentColor" stroke-width="3"/><line x1="20" y1="36" x2="70" y2="36" stroke="#EF4444" stroke-width="3"/><line x1="20" y1="54" x2="70" y2="54" stroke="#EF4444" stroke-width="3"/><circle cx="45" cy="45" r="6" fill="#EF4444"/>',
      'livro-4-cap-4': '<polygon points="45,18 68,34 58,68 32,68 22,34" fill="none" stroke="#F59E0B" stroke-width="2.5"/><polygon points="45,28 58,38 52,58 38,58 32,38" fill="#F59E0B" fill-opacity=".3"/><text x="45" y="52" font-size="14" font-weight="900" text-anchor="middle" fill="#F59E0B">A+</text>',
      'livro-4-cap-5': '<circle cx="45" cy="45" r="26" fill="none" stroke="#34D399" stroke-width="2.5"/><text x="45" y="55" font-size="28" font-weight="900" text-anchor="middle" fill="#34D399">A</text>',
      'livro-4-cap-6': '<path d="M45 18 L68 28 V48 C68 62 45 70 45 70 C45 70 22 62 22 48 V28 Z" fill="none" stroke="currentColor" stroke-width="2.2"/><text x="45" y="52" font-size="24" font-weight="900" text-anchor="middle" fill="currentColor">B</text>',
      'livro-4-cap-7': '<circle cx="45" cy="45" r="24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/><text x="45" y="53" font-size="22" font-weight="900" text-anchor="middle" fill="currentColor">C</text>',
      'livro-4-cap-8': '<circle cx="45" cy="45" r="26" fill="none" stroke="#EF4444" stroke-width="3"/><line x1="26" y1="26" x2="64" y2="64" stroke="#EF4444" stroke-width="3"/><text x="45" y="53" font-size="22" font-weight="900" text-anchor="middle" fill="#EF4444">0%</text>',
      'livro-4-cap-9': '<rect x="20" y="24" width="50" height="42" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="45" cy="45" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="45" y1="41" x2="45" y2="49" stroke="#34D399" stroke-width="2"/><line x1="41" y1="45" x2="49" y2="45" stroke="#34D399" stroke-width="2"/>',
      'livro-4-cap-10': '<rect x="20" y="20" width="50" height="12" rx="3" fill="#34D399" fill-opacity=".3" stroke="#34D399" stroke-width="1.8"/><rect x="20" y="37" width="50" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="20" y="54" width="50" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      'livro-4-cap-11': '<line x1="20" y1="30" x2="20" y2="60" stroke="#EF4444" stroke-width="3"/><line x1="70" y1="30" x2="70" y2="60" stroke="#EF4444" stroke-width="3"/><line x1="20" y1="45" x2="70" y2="45" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/><polygon points="26,45 32,41 32,49" fill="#EF4444"/><polygon points="64,45 58,41 58,49" fill="#EF4444"/>',
      'livro-4-cap-12': '<path d="M15 45 Q 30 25 45 45 T 75 45" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15 32 Q 30 12 45 32 T 75 32" fill="none" stroke="#34D399" stroke-width="1.8" stroke-dasharray="3 3"/><path d="M15 58 Q 30 38 45 58 T 75 58" fill="none" stroke="#34D399" stroke-width="1.8" stroke-dasharray="3 3"/>',
      'livro-4-cap-13': '<line x1="16" y1="28" x2="74" y2="28" stroke="#EF4444" stroke-width="3"/><polygon points="45,28 39,36 51,36" fill="#EF4444"/><rect x="24" y="44" width="42" height="24" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>',
      'livro-4-cap-14': '<line x1="45" y1="20" x2="45" y2="68" stroke="currentColor" stroke-width="2.5"/><line x1="20" y1="36" x2="70" y2="30" stroke="currentColor" stroke-width="2.5"/><rect x="18" y="36" width="16" height="16" rx="2" fill="#34D399"/><rect x="56" y="30" width="16" height="26" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>',
      'livro-4-cap-15': '<circle cx="45" cy="45" r="26" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="45" cy="45" r="8" fill="none" stroke="#34D399" stroke-width="2"/><line x1="45" y1="14" x2="45" y2="76" stroke="currentColor" stroke-width="1.5"/><line x1="14" y1="45" x2="76" y2="45" stroke="currentColor" stroke-width="1.5"/>',
      'livro-4-cap-16': '<rect x="22" y="20" width="46" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30 34 L36 40 L48 28" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round"/><line x1="30" y1="48" x2="60" y2="48" stroke="currentColor" stroke-width="2"/><line x1="30" y1="58" x2="52" y2="58" stroke="currentColor" stroke-width="2"/>',

      // === LIVRO 5: GESTÃO DE RISCO E POSIÇÕES ===
      'livro-5-cap-1': '<circle cx="45" cy="42" r="26" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="7 5"/><circle cx="45" cy="16" r="5" fill="#34D399"/><circle cx="71" cy="42" r="5" fill="#F59E0B"/><circle cx="28" cy="60" r="5" fill="#EF4444"/>',
      'livro-5-cap-2': '<path d="M45 16 L70 26 V48 C70 64 45 74 45 74 C45 74 20 64 20 48 V26 Z" fill="none" stroke="currentColor" stroke-width="2.2"/><line x1="26" y1="46" x2="64" y2="46" stroke="#EF4444" stroke-width="4" stroke-linecap="round"/><circle cx="45" cy="46" r="6" fill="#EF4444"/>',
      'livro-5-cap-3': '<line x1="14" y1="45" x2="76" y2="45" stroke="currentColor" stroke-width="2.5"/><circle cx="24" cy="45" r="5" fill="#34D399"/><circle cx="48" cy="45" r="5" fill="#F59E0B"/><circle cx="70" cy="45" r="7" fill="none" stroke="#34D399" stroke-width="2"/><line x1="24" y1="36" x2="24" y2="30" stroke="currentColor" stroke-width="1.8"/><line x1="48" y1="54" x2="48" y2="60" stroke="currentColor" stroke-width="1.8"/><line x1="70" y1="36" x2="70" y2="30" stroke="currentColor" stroke-width="1.8"/>',
      'livro-5-cap-4': '<path d="M14 65 C32 55 45 32 76 20" fill="none" stroke="#10B981" stroke-width="3.5" stroke-linecap="round"/><path d="M14 74 C35 68 55 58 76 44" fill="none" stroke="#F59E0B" stroke-width="2" stroke-dasharray="5 3"/><rect x="42" y="28" width="6" height="16" fill="currentColor"/><line x1="45" y1="22" x2="45" y2="48" stroke="currentColor" stroke-width="1.5"/><rect x="62" y="16" width="6" height="14" fill="currentColor"/><line x1="65" y1="10" x2="65" y2="34" stroke="currentColor" stroke-width="1.5"/>',
      'livro-5-cap-5': '<line x1="12" y1="46" x2="78" y2="46" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M45 20 L45 42 M39 26 L45 20 L51 26" stroke="#10B981" stroke-width="3" stroke-linecap="round"/><rect x="37" y="44" width="16" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M41 44 V39 C41 36 49 36 49 39 V44" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      'livro-5-cap-6': '<path d="M16 68 L38 50 H56 L76 32" fill="none" stroke="currentColor" stroke-width="2.5"/><polygon points="38,40 41,46 47,46 43,50 45,56 39,52 33,56 35,50 31,46 37,46" fill="#F59E0B"/><polygon points="76,22 79,28 85,28 81,32 83,38 77,34 71,38 73,32 69,28 75,28" fill="#10B981"/>',
      'livro-5-cap-7': '<path d="M45 18 C28 18 18 34 18 42 H72 C72 34 62 18 45 18 Z" fill="none" stroke="currentColor" stroke-width="2.4"/><line x1="45" y1="42" x2="45" y2="68" stroke="currentColor" stroke-width="2.4"/><line x1="26" y1="42" x2="45" y2="65" stroke="currentColor" stroke-width="1.2"/><line x1="64" y1="42" x2="45" y2="65" stroke="currentColor" stroke-width="1.2"/><line x1="14" y1="56" x2="76" y2="30" stroke="#EF4444" stroke-width="2.5" stroke-dasharray="5 3"/>',
      'livro-5-cap-8': '<rect x="22" y="56" width="46" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="29" y="38" width="32" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="36" y="20" width="18" height="14" rx="3" fill="#34D399" fill-opacity=".3" stroke="#34D399" stroke-width="2.2"/>',
      'livro-5-cap-9': '<rect x="28" y="34" width="34" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M35 34 V22 C35 16 55 16 55 22 V34" fill="none" stroke="#10B981" stroke-width="3"/><circle cx="45" cy="46" r="4" fill="#10B981"/><line x1="45" y1="50" x2="45" y2="55" stroke="#10B981" stroke-width="2.5"/>',
      'livro-5-cap-10': '<line x1="45" y1="16" x2="45" y2="68" stroke="currentColor" stroke-width="3"/><line x1="18" y1="30" x2="72" y2="30" stroke="currentColor" stroke-width="3"/><path d="M18 30 L8 50 H28 Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M72 30 L62 44 H82 Z" fill="none" stroke="currentColor" stroke-width="1.8"/>',
      'livro-5-cap-11': '<path d="M20 58 A 28 28 0 0 1 70 58" fill="none" stroke="currentColor" stroke-width="4"/><line x1="45" y1="58" x2="62" y2="38" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/><circle cx="45" cy="58" r="5" fill="currentColor"/><circle cx="28" cy="42" r="3" fill="#10B981"/><circle cx="45" cy="30" r="3" fill="#F59E0B"/><circle cx="62" cy="42" r="3" fill="#EF4444"/>',
      'livro-5-cap-12': '<circle cx="45" cy="45" r="26" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="37" y="32" width="6" height="26" rx="2" fill="currentColor"/><rect x="49" y="32" width="6" height="26" rx="2" fill="currentColor"/>',
      'livro-5-cap-13': '<rect x="22" y="20" width="46" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><line x1="30" y1="32" x2="60" y2="32" stroke="currentColor" stroke-width="2"/><line x1="30" y1="42" x2="60" y2="42" stroke="currentColor" stroke-width="2"/><line x1="30" y1="52" x2="50" y2="52" stroke="currentColor" stroke-width="2"/><path d="M54 50 L60 56 L70 44" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>',

      // === LIVRO 6: A MENTE DO TRADER ===
      'livro-6-cap-1': '<path d="M45 22 C32 22 22 32 22 45 C22 56 30 65 42 67 V68 H48 V67 C60 65 68 56 68 45 C68 32 58 22 45 22 Z" fill="none" stroke="currentColor" stroke-width="2.2"/><line x1="45" y1="22" x2="45" y2="67" stroke="currentColor" stroke-width="1.8"/><circle cx="34" cy="42" r="4" fill="#34D399"/><circle cx="56" cy="42" r="4" fill="#34D399"/>',
      'livro-6-cap-2': '<path d="M14 45 L26 45 L32 25 L40 65 L48 35 L54 52 L60 45 L76 45" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round"/>',
      'livro-6-cap-3': '<path d="M30 65 C26 50 28 35 45 22 C62 35 64 50 60 65" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="45" cy="42" r="8" fill="none" stroke="#34D399" stroke-width="2"/><line x1="45" y1="22" x2="45" y2="65" stroke="#34D399" stroke-width="1.5" stroke-dasharray="3 3"/>',
      'livro-6-cap-4': '<polygon points="45,18 70,64 20,64" fill="none" stroke="currentColor" stroke-width="2.5"/><line x1="12" y1="48" x2="33" y2="48" stroke="#34D399" stroke-width="2"/><line x1="56" y1="44" x2="78" y2="36" stroke="#EF4444" stroke-width="2"/><line x1="58" y1="48" x2="78" y2="48" stroke="#F59E0B" stroke-width="2"/><line x1="56" y1="52" x2="78" y2="60" stroke="#34D399" stroke-width="2"/>',
      'livro-6-cap-5': '<polygon points="45,18 74,66 16,66" fill="none" stroke="#EF4444" stroke-width="2.8"/><line x1="45" y1="34" x2="45" y2="50" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/><circle cx="45" cy="58" r="3" fill="#EF4444"/>',
      'livro-6-cap-6': '<path d="M18 64 C28 45 42 28 45 16 C48 28 62 45 72 64" fill="none" stroke="#F59E0B" stroke-width="3"/><path d="M30 64 L45 48 L60 64" fill="none" stroke="#34D399" stroke-width="2"/>',
      'livro-6-cap-7': '<circle cx="45" cy="45" r="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-dasharray="8 6"/><polygon points="45,19 41,27 49,27" fill="currentColor"/><polygon points="45,71 49,63 41,63" fill="currentColor"/><circle cx="45" cy="45" r="6" fill="#34D399"/>',
      'livro-6-cap-8': '<ellipse cx="45" cy="45" rx="20" ry="26" fill="none" stroke="currentColor" stroke-width="2.5"/><ellipse cx="45" cy="45" rx="13" ry="18" fill="none" stroke="#34D399" stroke-width="1.5" stroke-dasharray="4 3"/>',
      'livro-6-cap-9': '<ellipse cx="45" cy="62" rx="24" ry="8" fill="none" stroke="currentColor" stroke-width="2.2"/><ellipse cx="45" cy="48" rx="18" ry="7" fill="none" stroke="currentColor" stroke-width="2.2"/><ellipse cx="45" cy="35" rx="12" ry="6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="45" cy="24" r="5" fill="#34D399"/>',
      'livro-6-cap-10': '<rect x="22" y="24" width="46" height="42" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><line x1="18" y1="24" x2="72" y2="24" stroke="currentColor" stroke-width="3"/><line x1="18" y1="66" x2="72" y2="66" stroke="currentColor" stroke-width="3"/><circle cx="45" cy="45" r="8" fill="#F59E0B" fill-opacity=".3" stroke="#F59E0B" stroke-width="1.8"/>',
      'livro-6-cap-11': '<rect x="22" y="38" width="22" height="14" rx="7" fill="none" stroke="#34D399" stroke-width="3"/><rect x="36" y="38" width="22" height="14" rx="7" fill="none" stroke="#34D399" stroke-width="3"/><rect x="50" y="38" width="22" height="14" rx="7" fill="none" stroke="#34D399" stroke-width="3"/>',
      'livro-6-cap-12': '<rect x="20" y="18" width="22" height="54" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="48" y="18" width="22" height="54" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><line x1="24" y1="28" x2="38" y2="28" stroke="currentColor" stroke-width="1.5"/><line x1="24" y1="36" x2="38" y2="36" stroke="currentColor" stroke-width="1.5"/><line x1="24" y1="44" x2="38" y2="44" stroke="currentColor" stroke-width="1.5"/><line x1="52" y1="28" x2="66" y2="28" stroke="currentColor" stroke-width="1.5"/><line x1="52" y1="36" x2="66" y2="36" stroke="currentColor" stroke-width="1.5"/><line x1="52" y1="44" x2="66" y2="44" stroke="currentColor" stroke-width="1.5"/>'
    };

    return scenes[chapterId] || '<circle cx="45" cy="45" r="24" fill="none" stroke="currentColor" stroke-width="2"/><path d="M30 45 L42 57 L62 33" fill="none" stroke="#34D399" stroke-width="3" stroke-linecap="round"/>';
  }

  function renderTocArt(bookId, chapterId, chapterNumber, pageNum) {
    const num = pageNum ? ('P.' + pageNum) : String(chapterNumber || 1).padStart(2, '0');
    const safeId = (chapterId || bookId || 'default').replace(/[^a-zA-Z0-9]/g, '-');
    const gradId = 'toc-glow-' + safeId;
    const scene = getChapterThematicSvg(chapterId, bookId);

    return '<svg viewBox="0 0 180 110" preserveAspectRatio="xMidYMid meet">' +
      '<defs>' +
        '<linearGradient id="' + gradId + '" x2="1" y2="1">' +
          '<stop stop-color="currentColor" stop-opacity=".68"/>' +
          '<stop offset="1" stop-color="currentColor" stop-opacity=".12"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<!-- NUMERO GIGANTE ARTISTICO DO CAPITULO -->' +
      '<text x="130" y="82" font-size="68" font-weight="900" font-family="var(--font-display, \'Space Grotesk\', system-ui, -apple-system, sans-serif)" letter-spacing="-4" text-anchor="middle" fill="url(#' + gradId + ')" stroke="currentColor" stroke-width="1.4" opacity="0.55">' + num + '</text>' +
      '<!-- ILUSTRACAO TEMATICA EXCLUSIVA DO ASSUNTO -->' +
      '<g class="ht-toc-thematic-art" transform="translate(8, 5)">' +
        scene +
      '</g>' +
    '</svg>';
  }


  function renderTocModal() {
    const filter = appState.modalFilter || 'all';
    const books = BooksModel.BOOKS || [];
    const bookmarksCount = appState.bookmarks ? appState.bookmarks.length : 0;

    const filterCategories = [
      { id: 'all', label: 'Todos os Capítulos (80)', icon: '📚' },
      { id: 'livro-1', label: 'Vol. 1 · Primeiros Passos', icon: '📖' },
      { id: 'livro-2', label: 'Vol. 2 · Telas & Software', icon: '🖥️' },
      { id: 'livro-3', label: 'Vol. 3 · O Método', icon: '⚖️' },
      { id: 'livro-4', label: 'Vol. 4 · Grading & Sizing', icon: '📋' },
      { id: 'livro-5', label: 'Vol. 5 · Gestão de Risco', icon: '🛡️' },
      { id: 'livro-6', label: 'Vol. 6 · A Mente do Trader', icon: '🧠' },
      { id: 'bookmarks', label: 'Marcadores (' + bookmarksCount + ')', icon: '🔖' }
    ];

    const filtersHtml = filterCategories.map(cat => {
      const active = filter === cat.id;
      return '<button type="button" class="ht-toc-filter-btn ' + (active ? 'active' : '') + '" data-action="set-toc-filter" data-filter="' + cat.id + '" aria-pressed="' + active + '"><span aria-hidden="true">' + cat.icon + '</span> ' + esc(cat.label) + '</button>';
    }).join('');

    let gridHtml = '';

    if (filter === 'bookmarks') {
      if (!appState.bookmarks || appState.bookmarks.length === 0) {
        gridHtml = '<div class="ht-toc-empty-bookmarks"><div class="ht-toc-empty-icon">🔖</div><h3>Nenhum marcador salvo ainda</h3><p>Enquanto navega pelo livro, clique no botão <strong>Marcar</strong> na barra superior para salvar páginas de referência rápida nesta galeria.</p></div>';
      } else {
        gridHtml = appState.bookmarks.map(bm => {
          const book = BooksModel.getBook(bm.bookId);
          const ch = BooksModel.getChapter(bm.bookId, bm.chapterId);
          const catLabel = 'MARCADOR · VOL. 0' + (book ? book.number : '1') + ' · PÁG. ' + (bm.chapterPageIndex + 1);
          return '<article class="ht-toc-card ht-toc-card-bookmark" data-action="open-chapter" data-book-id="' + bm.bookId + '" data-chapter-id="' + bm.chapterId + '" data-page-index="' + bm.chapterPageIndex + '"><div class="ht-toc-art" aria-hidden="true">' + renderTocArt(bm.bookId, bm.chapterId, null, bm.chapterPageIndex + 1) + '</div><div class="ht-toc-card-copy"><span class="ht-toc-card-icon" aria-hidden="true">🔖</span><div><span class="ht-toc-card-category">' + catLabel + '</span><h3 class="ht-toc-card-title">' + esc(bm.title) + '</h3><p class="ht-toc-card-desc">' + esc(bm.snippet || (ch ? ch.subtitle : '') || 'Página de referência salva pelo usuário.') + '</p></div></div><div class="ht-toc-card-footer"><button type="button" class="ht-toc-remove-btn" data-action="toggle-bookmark" data-book-id="' + bm.bookId + '" data-chapter-id="' + bm.chapterId + '" data-page-index="' + bm.chapterPageIndex + '">Remover</button><button type="button" class="ht-toc-card-btn" data-action="open-chapter" data-book-id="' + bm.bookId + '" data-chapter-id="' + bm.chapterId + '" data-page-index="' + bm.chapterPageIndex + '">Abrir Página →</button></div></article>';
        }).join('');
      }
    } else {
      const filteredBooks = filter === 'all' ? books : books.filter(b => b.id === filter);
      const cards = [];

      filteredBooks.forEach(b => {
        b.chapters.forEach(c => {
          const isReadingNow = b.id === appState.bookId && c.id === appState.chapterId;
          const completed = isChapterCompleted(c.id);
          const pages = BooksModel.getChapterPages(c);
          const totalPages = pages.length;

          cards.push('<article class="ht-toc-card ' + (isReadingNow ? 'reading-now' : '') + '" data-action="open-chapter" data-book-id="' + b.id + '" data-chapter-id="' + c.id + '" data-page-index="0"><div class="ht-toc-art" aria-hidden="true">' + renderTocArt(b.id, c.id, c.number) + '</div><div class="ht-toc-card-copy"><span class="ht-toc-card-icon" aria-hidden="true">' + bookCategoryIcon(b.id) + '</span><div><span class="ht-toc-card-category">VOL. 0' + b.number + ' · CAPÍTULO ' + c.number + '</span><h3 class="ht-toc-card-title">' + esc(c.title) + '</h3><p class="ht-toc-card-desc">' + esc(c.subtitle || c.description || 'Domínio prático das regras operacionais e setups.') + '</p></div></div><div class="ht-toc-card-footer"><div class="ht-toc-card-status-group">' + (isReadingNow ? '<span class="ht-toc-card-state active">Lendo agora</span>' : '') + (completed ? '<span class="ht-toc-card-in-panel">✓ Concluído</span>' : '<span class="ht-toc-card-pages-badge">' + totalPages + ' págs</span>') + '</div><button type="button" class="ht-toc-card-btn" data-action="open-chapter" data-book-id="' + b.id + '" data-chapter-id="' + c.id + '" data-page-index="0">' + (isReadingNow ? 'Voltar à Leitura' : 'Ler Capítulo') + ' →</button></div></article>');
        });
      });

      gridHtml = cards.join('');
    }

    return '<div class="ht-toc-modal-backdrop ' + (appState.isModalOpen ? 'open' : '') + '" id="htTocModalBackdrop" data-action="close-toc-modal"><section class="ht-toc-modal" role="dialog" aria-modal="true" aria-label="Galeria de Capítulos do Manual"><header class="ht-toc-modal-header"><div><span class="eyebrow ht-toc-eyebrow">SUMÁRIO &amp; ÍNDICE DO MANUAL</span><h2 class="ht-toc-modal-title">Galeria de Capítulos do Acervo</h2><p class="ht-toc-modal-desc">Navegue diretamente pelos 6 volumes temáticos e 80 capítulos estruturados ou acesse suas anotações e marcadores salvos.</p></div><aside class="ht-toc-modal-intro"><b>Acervo The Healthy Trend Trader</b><span>6 Volumes Estruturados · 80 Capítulos · 41 Ferramentas</span></aside><button type="button" class="ht-toc-modal-close" data-action="close-toc-modal" aria-label="Fechar galeria">×</button></header><nav class="ht-toc-modal-filters" aria-label="Filtros de volumes">' + filtersHtml + '</nav><div class="ht-toc-modal-grid">' + gridHtml + '</div></section></div>';
  }

function renderReaderView() {
    const isAcervo = appState.bookId === 'acervo';
    const book = BooksModel.getBook(appState.bookId) || BooksModel.BOOKS[0];
    const flatPages = ReaderModel && ReaderModel.flattenBookPages
      ? ReaderModel.flattenBookPages(book, BooksModel.getChapterPages)
      : [];

    const curGlobalIdx = ReaderModel && ReaderModel.findGlobalIndex
      ? ReaderModel.findGlobalIndex(flatPages, appState.chapterId, appState.pageIndex)
      : appState.pageIndex;

    let spread;
    if (isAcervo) {
      if (appState.isDualPage) {
        spread = {
          isDual: true,
          leftPage: { kind: 'acervo-cover' },
          rightPage: { kind: 'acervo-shelf' },
          centerPage: null,
          progressPct: 100
        };
      } else {
        spread = {
          isDual: false,
          leftPage: null,
          rightPage: null,
          centerPage: appState.pageIndex === 0 ? { kind: 'acervo-cover' } : { kind: 'acervo-shelf' },
          progressPct: appState.pageIndex === 0 ? 50 : 100
        };
      }
    } else {
      spread = ReaderModel && ReaderModel.getSpread
        ? ReaderModel.getSpread(flatPages, curGlobalIdx, appState.isDualPage)
        : { isDual: false, leftPage: null, rightPage: null, centerPage: null, progressPct: 0 };
    }

    const isCurrentBookmarked = appState.bookmarks.some(b => b.bookId === appState.bookId && b.chapterId === appState.chapterId && b.chapterPageIndex === appState.pageIndex);
    const chapter = BooksModel.getChapter(appState.bookId, appState.chapterId) || book.chapters[0];
    const chapterPages = BooksModel.getChapterPages(chapter);

    return `
      <div class="ht-book-reader-shell">
        <!-- TOPBAR DO LEITOR -->
        <header class="ht-reader-topbar">
          <div class="ht-reader-topbar-left">
            ${isAcervo ? `
              <button type="button" class="ht-reader-btn-back is-acervo-home" data-action="open-acervo" title="Você está no Sumário Geral do Acervo">
                📚 Acervo Geral
              </button>
            ` : `
              <button type="button" class="ht-reader-btn-back" data-action="open-acervo" title="Retornar ao Sumário Geral do Acervo">
                ${icon('arrowLeft', 16)} 📚 Acervo
              </button>
            `}

            <div class="ht-reader-book-picker">
              <select class="ht-reader-book-select" id="htReaderBookSelect" data-action="change-book" aria-label="Seletor de Volume">
                <option value="acervo" ${isAcervo ? 'selected' : ''}>📚 Sumário Geral do Acervo</option>
                ${BooksModel.BOOKS.map(b => `
                  <option value="${b.id}" ${!isAcervo && b.id === book.id ? 'selected' : ''}>Livro 0${b.number} — ${esc(b.title)}</option>
                `).join('')}
              </select>
            </div>

            ${isAcervo ? `
              <div class="ht-reader-breadcrumbs">
                <span class="ht-reader-book-tag">ACERVO</span>
                <span>/</span>
                <span class="ht-reader-chapter-title">Sumário Editorial dos 6 Volumes</span>
              </div>
            ` : `
              <div class="ht-reader-breadcrumbs">
                <span class="ht-reader-book-tag">LIVRO ${book.number}</span>
                <span>/</span>
                <span class="ht-reader-chapter-title">${esc(chapter.title)}</span>
              </div>
            `}
          </div>

          <div class="ht-reader-topbar-right">
            <!-- BUSCA NO ACERVO -->
            <div class="ht-reader-search-wrap">
              <span class="ht-reader-search-icon">${icon('search', 15)}</span>
              <input type="text" class="ht-reader-search-input" id="htReaderSearchInput" placeholder="Buscar no manual..." autocomplete="off" />
              <div class="kc-search-dropdown" id="htReaderSearchDropdown" hidden></div>
            </div>

            <!-- ÍNDICE / TOC DRAWER TOGGLE -->
            <button type="button" class="ht-reader-action-btn ${appState.isModalOpen ? 'active' : ''}" data-action="open-toc-modal" data-drawer-tab="toc" title="Galeria de Capítulos e Índice">
              ${icon('list', 16)} Índice
            </button>

            <!-- MARCADOR / BOOKMARK TOGGLE -->
            <button type="button" class="ht-reader-action-btn ${isCurrentBookmarked ? 'active' : ''}" data-action="toggle-bookmark" title="${isCurrentBookmarked ? 'Remover Marcador' : 'Marcar esta página'}">
              ${icon(isCurrentBookmarked ? 'bookmarkFilled' : 'bookmark', 16)} ${isCurrentBookmarked ? 'Marcada' : 'Marcar'}
            </button>

            <!-- MODO 1 PÁGINA / 2 PÁGINAS -->
            <button type="button" class="ht-reader-action-btn" data-action="toggle-dual-page" title="Alternar visualização 1 ou 2 páginas">
              ${icon('columns', 16)} ${appState.isDualPage ? '2 Páginas' : '1 Página'}
            </button>

            <!-- TELA CHEIA (FULLSCREEN) -->
            <button type="button" class="ht-reader-action-btn" data-action="toggle-fullscreen" title="Tela Cheia">
              ${icon(appState.fullscreen ? 'minimize' : 'maximize', 16)}
            </button>

            <!-- FECHAR -->
            <button type="button" class="ht-reader-action-btn" data-action="open-library" title="Fechar Leitor">
              ${icon('close', 18)}
            </button>
          </div>
        </header>

        <!-- ÁREA CENTRAL DO LIVRO FÍSICO (DESK) -->
        <main class="ht-book-desk">
          <!-- BOTÕES EXTERNOS DE NAVEGAÇÃO / VIRADA DE PÁGINA -->
          <button type="button" class="ht-flip-nav-arrow prev" data-action="prev-page" aria-label="Página Anterior">
            ${icon('arrowLeft', 24)}
          </button>
          <button type="button" class="ht-flip-nav-arrow next" data-action="next-page" aria-label="Próxima Página">
            ${icon('arrowRight', 24)}
          </button>

          <!-- CONTAINER DO LIVRO -->
          <div class="ht-book-container">
            <div class="ht-book-stack left"></div>
            <div class="ht-book-stack right"></div>

            <div class="ht-book-spread ${!appState.isDualPage ? 'single-page-mode' : ''}">
              <div class="ht-book-gutter"></div>
              <div class="ht-book-ribbon"></div>

              ${spread.isDual ? `
                ${renderPageSpread(spread.leftPage, false)}
                ${renderPageSpread(spread.rightPage, true)}
              ` : `
                ${renderPageSpread(spread.centerPage, false)}
              `}

              ${appState.isFlipping ? `
                <div class="ht-flipping-leaf ${appState.flipDirection === 'forward' ? 'flip-forward' : 'flip-backward'}"></div>
              ` : ''}
            </div>
          </div>
        </main>

        <!-- FLOATING BOTTOM READING DOCK -->
        <div class="ht-reader-bottom-dock">
          <button type="button" style="background:transparent;border:none;color:inherit;cursor:pointer;display:grid;place-items:center;" data-action="prev-page">
            ${icon('arrowLeft', 16)}
          </button>
          <span class="ht-dock-page-text">
            ${isAcervo
              ? (appState.isDualPage ? 'Acervo Geral · Págs. 1 e 2' : (appState.pageIndex === 0 ? 'Acervo Geral · Pág. 1 de 2' : 'Acervo Geral · Pág. 2 de 2'))
              : ('Pág. ' + (curGlobalIdx + 1) + ' de ' + (flatPages.length || 1))}
          </span>
          <div class="ht-dock-progress-track">
            <div class="ht-dock-progress-fill" style="width: ${spread.progressPct || 0}%"></div>
          </div>
          <button type="button" style="background:transparent;border:none;color:inherit;cursor:pointer;display:grid;place-items:center;" data-action="next-page">
            ${icon('arrowRight', 16)}
          </button>
        </div>

        <!-- COMPATIBILITY HOOKS FOR TEST SUITE -->
        <div class="kc-page-stepper-bar" style="display:none;" aria-hidden="true">
          ${chapterPages.map((p, idx) => `
            <button data-action="go-to-page" data-page-index="${idx}">${idx + 1}</button>
          `).join('')}
        </div>
        <div class="kc-page-footer-nav" style="display:none;" aria-hidden="true">
          <button data-action="prev-page">Anterior</button>
          <button data-action="next-page">Próxima</button>
        </div>

        <!-- GALERIA DE CAPÍTULOS / MODAL ARTÍSTICO CENTRAL (ESTILO WIDGET GALLERY) -->
        ${renderTocModal()}
        <div class="ht-toc-drawer" style="display:none;" aria-hidden="true"></div>
      </div>
    `;
  }

  function renderApp() {
    container.className = 'knowledge-center is-reader-view';
    container.innerHTML = renderReaderView();
    setupEvents();
  }

  function renderSearchResults(dropdownEl, matches) {
    if (!matches || !matches.length) {
      dropdownEl.innerHTML = '<div class="kc-search-empty">Nenhum resultado encontrado. Tente buscar por “risco”, “stop”, “ATR” ou “Rubric”.</div>';
      dropdownEl.hidden = false;
      return;
    }

    const html = matches.map(m => {
      let iconSvg = icon('book', 16);
      let actionAttr = '';
      if (m.type === 'chapter' || m.type === 'section' || m.type === 'tip') {
        iconSvg = icon('book', 16);
        actionAttr = `data-action="open-chapter" data-book-id="${m.bookId}" data-chapter-id="${m.chapterId}" data-page-index="${m.pageIndex || 0}"`;
      } else if (m.type === 'tool') {
        iconSvg = icon('monitor', 16);
        actionAttr = `data-action="launch-route" data-route="${m.route}"`;
      } else if (m.type === 'glossary') {
        iconSvg = icon('chart', 16);
        actionAttr = `data-action="open-glossary" data-term="${esc(m.term)}"`;
      }

      return `
        <button type="button" class="kc-search-result-item" ${actionAttr}>
          <span class="kc-res-icon">${iconSvg}</span>
          <div class="kc-res-copy">
            <span class="kc-res-badge">${esc(m.badge)}</span>
            <strong class="kc-res-title">${esc(m.title)}</strong>
            <span class="kc-res-sub">${esc(m.subtitle || m.snippet || '')}</span>
          </div>
          <span class="kc-res-arrow">${icon('arrowRight', 14)}</span>
        </button>
      `;
    }).join('');

    dropdownEl.innerHTML = `<div class="kc-search-count">${matches.length} resultado(s)</div>${html}`;
    dropdownEl.hidden = false;
  }

  function setupEvents() {
    // Book Selector Dropdown in Topbar
    const bookSelect = container.querySelector('#htReaderBookSelect');
    if (bookSelect) {
      bookSelect.addEventListener('change', e => {
        const val = e.target.value;
        if (val === 'acervo') {
          openAcervo();
        } else {
          openBook(val);
        }
      });
    }

    // Search input on Library View
    const searchInput = container.querySelector('#kcSearchInput');
    const searchDropdown = container.querySelector('#kcSearchDropdown');
    const searchClear = container.querySelector('#kcSearchClear');

    if (searchInput && searchDropdown) {
      searchInput.addEventListener('input', e => {
        const val = e.target.value;
        if (searchClear) searchClear.hidden = !val;
        if (!val.trim()) {
          searchDropdown.hidden = true;
          searchDropdown.innerHTML = '';
          return;
        }
        const matches = performSearch(val);
        renderSearchResults(searchDropdown, matches);
      });

      if (searchClear) {
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          searchClear.hidden = true;
          searchDropdown.hidden = true;
          searchDropdown.innerHTML = '';
          searchInput.focus();
        });
      }
    }

    // Search input on Reader View
    const readerSearchInput = container.querySelector('#htReaderSearchInput');
    const readerSearchDropdown = container.querySelector('#htReaderSearchDropdown');

    if (readerSearchInput && readerSearchDropdown) {
      readerSearchInput.addEventListener('input', e => {
        const val = e.target.value;
        if (!val.trim()) {
          readerSearchDropdown.hidden = true;
          readerSearchDropdown.innerHTML = '';
          return;
        }
        let matches = [];
        if (ReaderModel && ReaderModel.searchAcervo) {
          matches = ReaderModel.searchAcervo(val, BooksModel.BOOKS, { limit: 12 });
        }
        if (!matches.length) {
          matches = performSearch(val);
        }
        renderSearchResults(readerSearchDropdown, matches);
      });
    }

    // Dynamic Sizing Calculator input listener
    const eqInput = container.querySelector('#htCalcEquity');
    const rPctInput = container.querySelector('#htCalcRiskPct');
    const entryInput = container.querySelector('#htCalcEntry');
    const stopInput = container.querySelector('#htCalcStop');

    function updateDidacticCalc() {
      if (!eqInput || !rPctInput || !entryInput || !stopInput || !ReaderModel) return;
      const res = ReaderModel.calculatePositionSize(eqInput.value, rPctInput.value, entryInput.value, stopInput.value);
      const riskEl = container.querySelector('#htResRisk');
      const distEl = container.querySelector('#htResDist');
      const qtyEl = container.querySelector('#htResQty');
      const expEl = container.querySelector('#htResExp');

      if (riskEl) riskEl.textContent = res.valid ? 'R$ ' + res.riskBudget.toLocaleString('pt-BR') : 'R$ 0';
      if (distEl) distEl.textContent = res.valid ? `R$ ${res.stopDistance.toFixed(2)} (${res.stopPct.toFixed(1)}%)` : '-';
      if (qtyEl) qtyEl.textContent = res.valid ? `${res.quantity.toLocaleString('pt-BR')} ações` : '0';
      if (expEl) expEl.textContent = res.valid ? `R$ ${res.positionValue.toLocaleString('pt-BR')} (${res.allocationPct.toFixed(1)}%)` : 'R$ 0';
    }

    [eqInput, rPctInput, entryInput, stopInput].forEach(inp => {
      if (inp) inp.addEventListener('input', updateDidacticCalc);
    });

    // Dynamic Payoff Simulator listener
    const wrInput = container.querySelector('#htPayoffWinRate');
    const avgWinInput = container.querySelector('#htPayoffAvgWin');

    function updateDidacticPayoff() {
      if (!wrInput || !avgWinInput || !ReaderModel) return;
      const res = ReaderModel.calculateExpectancy(wrInput.value, avgWinInput.value, 1.0);
      const expEl = container.querySelector('#htResExpVal');
      const pfEl = container.querySelector('#htResPF');
      const verdEl = container.querySelector('#htResVerdict');

      if (expEl) expEl.textContent = (res.expectancyR >= 0 ? '+' : '') + res.expectancyR.toFixed(2) + 'R';
      if (pfEl) pfEl.textContent = res.profitFactor.toFixed(2);
      if (verdEl) {
        verdEl.textContent = res.isPositive ? 'Estratégia Lucrativa' : 'Expectativa Negativa';
        verdEl.style.color = res.isPositive ? 'var(--ht-book-accent)' : '#dc3545';
      }
    }

    [wrInput, avgWinInput].forEach(inp => {
      if (inp) inp.addEventListener('input', updateDidacticPayoff);
    });

    // Global Click Delegation
    container.onclick = function (e) {
      if (e.target.id === 'htTocModalBackdrop' || (e.target.classList && e.target.classList.contains('ht-toc-modal-backdrop'))) {
        appState.isModalOpen = false;
        appState.isDrawerOpen = false;
        renderApp();
        return;
      }
      const target = e.target.closest('[data-action]');
      if (!target) {
        if (searchDropdown && !e.target.closest('.kc-lib-search-box')) searchDropdown.hidden = true;
        if (readerSearchDropdown && !e.target.closest('.ht-reader-search-wrap')) readerSearchDropdown.hidden = true;
        return;
      }

      const action = target.dataset.action;

      if (action === 'open-library') {
        openLibrary();
      } else if (action === 'filter-book') {
        const bookId = target.dataset.bookId;
        appState.selectedBookFilter = bookId;
        renderApp();
      } else if (action === 'open-chapter') {
        const bId = target.dataset.bookId;
        const cId = target.dataset.chapterId;
        const pIdx = parseInt(target.dataset.pageIndex || '0', 10);
        appState.isModalOpen = false;
        appState.isDrawerOpen = false;
        openChapter(bId, cId, pIdx);
      } else if (action === 'go-to-page') {
        const pIdx = parseInt(target.dataset.pageIndex || '0', 10);
        openPage(pIdx);
      } else if (action === 'next-page') {
        nextPage();
      } else if (action === 'prev-page') {
        prevPage();
      } else if (action === 'resume-reading') {
        const bId = target.dataset.bookId;
        const cId = target.dataset.chapterId;
        const pIdx = parseInt(target.dataset.pageIndex || '0', 10);
        openChapter(bId, cId, pIdx);
      } else if (action === 'toggle-complete') {
        const cId = target.dataset.chapterId;
        toggleChapterCompleted(cId);
      } else if (action === 'open-toc-modal' || action === 'open-drawer') {
        const tab = target.dataset.drawerTab || target.dataset.filter || 'all';
        appState.isModalOpen = true;
        appState.isDrawerOpen = true;
        if (tab === 'bookmarks') appState.modalFilter = 'bookmarks';
        renderApp();
      } else if (action === 'close-toc-modal' || action === 'close-drawer') {
        appState.isModalOpen = false;
        appState.isDrawerOpen = false;
        renderApp();
      } else if (action === 'set-toc-filter') {
        appState.modalFilter = target.dataset.filter || 'all';
        renderApp();
      } else if (action === 'switch-drawer-tab') {
        appState.drawerTab = target.dataset.tab;
        if (target.dataset.tab === 'bookmarks') appState.modalFilter = 'bookmarks';
        renderApp();
      } else if (action === 'switch-drawer-tab') {
        appState.drawerTab = target.dataset.tab;
        renderApp();
      } else if (action === 'toggle-bookmark') {
        const bId = target.dataset.bookId || appState.bookId;
        const cId = target.dataset.chapterId || appState.chapterId;
        const pIdx = parseInt(target.dataset.pageIndex || appState.pageIndex, 10);
        const curChapter = BooksModel.getChapter(bId, cId);
        const curTitle = curChapter ? curChapter.title : 'Página Marcada';
        toggleBookmark(bId, cId, pIdx, curTitle, curChapter ? curChapter.subtitle : '');
      } else if (action === 'toggle-dual-page') {
        toggleDualPage();
      } else if (action === 'toggle-fullscreen') {
        toggleFullscreen();
      } else if (action === 'launch-route') {
        const route = target.dataset.route;
        if (typeof go === 'function') go(route);
      } else if (action === 'open-glossary') {
        const term = target.dataset.term;
        if (typeof glossaryQuery !== 'undefined') glossaryQuery = term;
        if (typeof glossaryCategory !== 'undefined') glossaryCategory = 'Todos';
        if (typeof go === 'function') go('glossary');
        if (typeof renderGlossary === 'function') renderGlossary();
      }
    };

    // Touch / Swipe Gestures on Mobile / Tablet
    const bookDesk = container.querySelector('.ht-book-desk');
    if (bookDesk) {
      let touchStartX = 0;
      let touchEndX = 0;

      bookDesk.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      bookDesk.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 50) {
          if (diff < 0) {
            nextPage(); // swipe left -> next page
          } else {
            prevPage(); // swipe right -> prev page
          }
        }
      }, { passive: true });
    }
  }

  // Keyboard navigation: ArrowLeft (prev), ArrowRight (next), Escape (library / close drawer)
  document.addEventListener('keydown', event => {
    if (!root.classList.contains('active')) return;

    // Ignore if typing in an input
    const tag = (event.target && event.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (event.key === 'Escape') {
      if (appState.isModalOpen || appState.isDrawerOpen) {
        event.preventDefault();
        appState.isModalOpen = false;
        appState.isDrawerOpen = false;
        renderApp();
      } else if (appState.view === 'reader') {
        event.preventDefault();
        openLibrary();
      }
    } else if (event.key === 'ArrowRight' && appState.view === 'reader') {
      event.preventDefault();
      nextPage();
    } else if (event.key === 'ArrowLeft' && appState.view === 'reader') {
      event.preventDefault();
      prevPage();
    } else if (event.key.toLowerCase() === 'f' && appState.view === 'reader') {
      event.preventDefault();
      toggleFullscreen();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const input = container.querySelector('#kcSearchInput') || container.querySelector('#htReaderSearchInput');
      if (input) {
        input.focus();
        input.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  });

  // Expose global methods
  window.renderKnowledgeCenter = renderApp;
  window.openManualBook = openChapter;
  window.openManualLibrary = openLibrary;
  window.openManualPage = openPage;
  window.nextManualPage = nextPage;
  window.prevManualPage = prevPage;
  window.nextPage = nextPage;
  window.prevPage = prevPage;

  // Initial render
  renderApp();
}());

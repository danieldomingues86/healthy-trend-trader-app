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
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
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
    ['mistakesbook','Erros e Lições','Catálogo de aprendizados.',null,'Registre erros operacionais e comportamentais para identificar padrões e consolidar lições aprendidas.'],
    ['charts','Gráficos','Leitura técnica e benchmarking.','manual-charts','Analise candles diários com médias móveis, volume institucional, benchmarking automático (IBOV, BDRX, IFIX) e avaliação instantânea de Grade pela Trading Rubric.'],
    ['marketcentral','Central de Mercado','Observatório macro e breadth.','manual-marketcentral','Acompanhe em tempo real o regime do mercado, indicadores de breadth, mercados globais (S&P 500, Nasdaq, Dólar, US10Y), notícias do dia e mapa setorial.'],
    ['eventplaybook','Playbook de Eventos','Biblioteca histórica de catalisadores.','manual-eventplaybook','Estude a reação histórica dos preços a eventos macroeconômicos (FOMC, Copom, CPI, Payroll) e utilize roteiros testados para proteger seu capital.'],
    ['marketcycle','Ciclo de Mercado','Entenda o ambiente.','manual-permission','Leia o regime multi-mercado independente (Ações B3, BDRs e FIIs) e a atualização dos dados antes de procurar uma oportunidade.'],
    ['emergingleaders','Líderes Emergentes','Descubra a próxima geração de líderes.','manual-emergingleaders','Identifique ações com alta Força Relativa, aceleração e proximidade da máxima durante correções. Acompanhe a força coletiva dos setores antes da entrada.'],
    ['relativestrength','Força Relativa','Encontre líderes.',null,'Compare os ativos dentro do seu universo. Força relativa indica liderança; a entrada ainda depende do setup.'],
    ['marketscans','Scans de Mercado','Filtros inteligentes de setups.',null,'Filtre ações em rompimento de 52 semanas, contração de volatilidade ou forte momentum no universo B3 para abastecer seu radar.'],
    ['fundamentals','Fundamentalista','Score em 6 dimensões com CVM e SEC.',null,'Pesquise ações B3 ou BDRs internacionais. Score ponderado de 0 a 10 com régua de 5 patamares e Cobertura dos Dados (dado ausente não é zero).'],
    ['dashboard','Patrimônio','Visão patrimonial e alocações.',null,'Acompanhe a curva de capital da estratégia, separe o rendimento real dos aportes e gerencie as alocações da sua carteira.'],
    ['positions','Posições','Acompanhe e gerencie.','manual-positions','Abra a posição para consultar a linha do tempo, atualizar o stop e registrar reduções ou encerramento.'],
    ['closedpositions','Posições Encerradas','Histórico e revisão de trades.','manual-closedpositions','Consulte o histórico completo de trades finalizados com auditoria de eventos, R-múltiplo real alcançado, duração e diário vinculado.'],
    ['portfolioheat','Portfolio Heat','Controle o risco da carteira.','manual-risk','Confira o risco agregado das posições e compare com o limite definido na sua Política de Risco.'],
    ['riskpolicy','Política de Risco','Governança e calibração de risco.','manual-riskpolicy','Defina o Risk Budget de cada Grade (A, B, C e D) e configure por perfil os limites de volatilidade, capital, Portfolio Heat e posições, além dos alternadores de Scale-In e Sell Into Strength.'],
    ['couragechallenge','Desafio Grade A','Treinamento do Modo Desapego.','manual-courage','Acompanhe a execução dos Rare Trades de Grade A em relação ao sizing executável autorizado pelo sistema, somente com o desafio ativo.'],
    ['assetblacklist','Ativos Blacklist','Blindagem comportamental.',null,'Cadastre ativos proibidos, ilíquidos ou fora do seu perfil para bloquear compras acidentais no sistema.'],
    ['tradesimulator','Simulador de Trades','Ambiente de testes e cenários.',null,'Simule a execução do seu método em dados reais, teste cenários de gestão (2R, 2.5R, Pirâmide, Parciais) e compare métricas de payoff.'],
    ['forecast','Simulador de Equity','Projeções probabilísticas.',null,'Simule a evolução matemática da sua curva de capital combinando taxa de acerto, payoff (R médio) e volume operacional.'],
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
        'Os 5 Gatilhos Oficiais de Entrada: Inside Bar, PFR (Padrão de Fechamento e Reversão), 1-2-3 de Compra, Dave Landry e RBI (Red Bar Ignored) fornecem timing cirúrgico e stop estrutural objetivo.',
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
        'O Playbook de Eventos é uma biblioteca histórica e viva dos principais catalisadores macroeconômicos do mercado.',
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

  // State management
  const STORAGE_KEY = 'healthy_trend_manual_progress';
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

  const appState = {
    view: 'library', // 'library' | 'reader'
    selectedBookFilter: 'all',
    bookId: 'livro-1',
    chapterId: 'livro-1-cap-1',
    pageIndex: 0,
    searchQuery: '',
    progress: loadProgress()
  };

  const BooksModel = window.ManualKnowledgeBooks || {
    BOOKS: [],
    getBook: () => null,
    getChapter: () => null,
    getTotalChapters: () => 0,
    getChapterPages: () => [],
    getTotalPages: () => 0
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

  function nextPage() {
    const book = BooksModel.getBook(appState.bookId);
    const chapter = BooksModel.getChapter(appState.bookId, appState.chapterId);
    if (!book || !chapter) return;
    const pages = BooksModel.getChapterPages(chapter);

    if (appState.pageIndex < pages.length - 1) {
      openPage(appState.pageIndex + 1);
    } else {
      // Advance to next chapter
      const chIdx = book.chapters.findIndex(c => c.id === chapter.id);
      if (chIdx >= 0 && chIdx < book.chapters.length - 1) {
        const nextCh = book.chapters[chIdx + 1];
        openChapter(book.id, nextCh.id, 0);
      } else {
        // Next book if available
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
    const book = BooksModel.getBook(appState.bookId);
    const chapter = BooksModel.getChapter(appState.bookId, appState.chapterId);
    if (!book || !chapter) return;

    if (appState.pageIndex > 0) {
      openPage(appState.pageIndex - 1);
    } else {
      // Go to previous chapter (last page)
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

  function openBook(bookId, chapterId) {
    openChapter(bookId, chapterId, 0);
  }

  function openLibrary(filterBookId) {
    appState.view = 'library';
    if (filterBookId) {
      appState.selectedBookFilter = filterBookId;
    }
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  container.className = 'knowledge-center';
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
  // NÍVEL 1 — BIBLIOTECA DO MANUAL
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
              <h2 class="kc-section-title">Biblioteca de Livros & Capítulos</h2>
              <p class="kc-section-subtitle">Filtre por livro ou explore o acervo completo de capítulos e páginas editoriais.</p>
            </div>
          </div>

          <div class="kc-book-filter-tabs">
            <button type="button" class="kc-filter-tab ${appState.selectedBookFilter === 'all' ? 'active' : ''}" data-action="filter-book" data-book-id="all">
              Todos os Livros (80)
            </button>
            ${BooksModel.BOOKS.map(b => {
              const bProg = getBookProgress(b);
              return `
                <button type="button" class="kc-filter-tab ${appState.selectedBookFilter === b.id ? 'active' : ''}" data-action="filter-book" data-book-id="${b.id}">
                  <span class="kc-tab-num">${b.number}.</span> ${esc(b.title)}
                  <span class="kc-tab-count">${b.chapters.length} cap.</span>
                  ${bProg.completed > 0 ? `<span class="kc-tab-pct">${bProg.percent}%</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- GRADE DE CAPÍTULOS (EDITORIAL CARDS) -->
          <div class="kc-chapters-grid-wrap">
            <div class="kc-chapters-grid-head">
              <h3 class="kc-ch-grid-title">${selectedBook ? `${selectedBook.number}. ${selectedBook.title} — Capítulos` : 'Todos os Capítulos Disponíveis'}</h3>
              <span class="kc-ch-grid-count">${displayedChapters.length} capítulos</span>
            </div>

            <div class="kc-chapters-grid">
              ${displayedChapters.map(({ book: b, chapter: c }) => {
                const pages = BooksModel.getChapterPages(c);
                const isDone = isChapterCompleted(c.id);
                const visitedPages = appState.progress.completedPages[c.id] || [];
                const isStarted = visitedPages.length > 0 && !isDone;

                return `
                  <article class="kc-ch-card" data-action="open-chapter" data-book-id="${b.id}" data-chapter-id="${c.id}" data-page-index="0">
                    <div class="kc-ch-card-cover-frame">
                      <img src="${c.cover || b.cover}" alt="Capa ${esc(c.title)}" loading="lazy" />
                      <span class="kc-ch-card-badge">${b.number}. ${esc(b.title)}</span>
                      <span class="kc-ch-pages-tag">📄 ${pages.length} páginas</span>
                    </div>
                    <div class="kc-ch-card-body">
                      <div class="kc-ch-card-meta">
                        <span class="kc-ch-card-num">Capítulo ${c.number}</span>
                        ${isDone ? `
                          <span class="kc-ch-status-pill kc-status-done">${icon('check', 12)} Concluído</span>
                        ` : (isStarted ? `
                          <span class="kc-ch-status-pill kc-status-started">Pág. ${visitedPages.length} de ${pages.length}</span>
                        ` : `
                          <span class="kc-ch-status-pill kc-status-unread">Não iniciado</span>
                        `)}
                      </div>
                      <h4 class="kc-ch-card-title">${esc(c.title)}</h4>
                      <p class="kc-ch-card-desc">${esc(c.subtitle)}</p>

                      ${c.takeaways && c.takeaways.length ? `
                        <ul class="kc-ch-card-takeaways">
                          ${c.takeaways.slice(0, 2).map(t => `
                            <li><span class="kc-ch-card-dot">•</span> ${esc(t)}</li>
                          `).join('')}
                        </ul>
                      ` : ''}

                      <div class="kc-ch-card-footer">
                        <button type="button" class="kc-ch-card-btn ${isStarted ? 'kc-btn-resume' : ''}">
                          ${isDone ? 'Revisar Capítulo →' : (isStarted ? 'Continuar Leitura →' : 'Ler Capítulo →')}
                        </button>
                      </div>
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
          </div>
        </section>
      </div>
    `;
  }

  // =========================================================================
  // NÍVEL 2 & NÍVEL 3 — LEITOR DO CAPÍTULO E PÁGINAS INDEPENDENTES
  // =========================================================================
  function renderReaderView() {
    const book = BooksModel.getBook(appState.bookId) || BooksModel.BOOKS[0];
    const chapter = BooksModel.getChapter(appState.bookId, appState.chapterId) || book.chapters[0];
    if (!book || !chapter) return '<p>Capítulo não encontrado.</p>';

    const pages = BooksModel.getChapterPages(chapter);
    const validPageIndex = Math.max(0, Math.min(appState.pageIndex, Math.max(0, pages.length - 1)));
    const currentPage = pages[validPageIndex] || pages[0];

    const bProg = getBookProgress(book);
    const chapterIdx = book.chapters.findIndex(c => c.id === chapter.id);
    const prevChapter = chapterIdx > 0 ? book.chapters[chapterIdx - 1] : null;
    const nextChapter = chapterIdx < book.chapters.length - 1 ? book.chapters[chapterIdx + 1] : null;
    const isDone = isChapterCompleted(chapter.id);

    return `
      <div class="kc-reader-view">
        <!-- TOP BREADCRUMB BAR -->
        <header class="kc-reader-topbar">
          <nav class="kc-breadcrumbs" aria-label="Navegação editorial">
            <button type="button" class="kc-crumb-back" data-action="open-library">
              ${icon('arrowLeft', 16)} Biblioteca do Manual
            </button>
            <span class="kc-crumb-sep">/</span>
            <span class="kc-crumb-book">${book.number}. ${esc(book.title)}</span>
            <span class="kc-crumb-sep">/</span>
            <span class="kc-crumb-current">Cap. ${chapter.number}: ${esc(chapter.title)}</span>
          </nav>

          <div class="kc-reader-topbar-controls">
            <span class="kc-reader-page-indicator-pill">
              Página <strong>${validPageIndex + 1}</strong> de <strong>${pages.length}</strong>
            </span>
            <div class="kc-reader-top-search">
              <span class="kc-top-search-icon">${icon('search', 16)}</span>
              <input type="text" class="kc-top-search-input" id="kcReaderSearchInput" placeholder="Buscar neste livro..." autocomplete="off" />
              <div class="kc-search-dropdown" id="kcReaderSearchDropdown" hidden></div>
            </div>
            <button type="button" class="kc-reader-close-btn" data-action="open-library" title="Voltar à Biblioteca">
              ${icon('close', 18)}
            </button>
          </div>
        </header>

        <div class="kc-reader-layout">
          <!-- LEFT SIDEBAR: BOOK CHAPTERS & PAGES INDEX -->
          <aside class="kc-reader-sidebar">
            <div class="kc-sidebar-book-card">
              <div class="kc-sidebar-book-header">
                <span class="kc-sidebar-book-icon">${icon('book', 20)}</span>
                <div>
                  <h3 class="kc-sidebar-book-title">${book.number}. ${esc(book.title)}</h3>
                  <span class="kc-sidebar-book-count">${book.chapters.length} capítulos</span>
                </div>
              </div>
              <div class="kc-sidebar-progress-row">
                <div class="kc-progress-track">
                  <div class="kc-progress-fill" style="width: ${bProg.percent}%"></div>
                </div>
                <span class="kc-sidebar-pct">${bProg.completed} de ${bProg.total} capítulos (${bProg.percent}%)</span>
              </div>
            </div>

            <nav class="kc-chapter-nav" aria-label="Índice de Capítulos">
              <ul class="kc-chapter-list">
                ${book.chapters.map(c => {
                  const isChActive = c.id === chapter.id;
                  const isChDone = isChapterCompleted(c.id);
                  const chPages = BooksModel.getChapterPages(c);

                  return `
                    <li class="kc-chapter-item ${isChActive ? 'active' : ''} ${isChDone ? 'completed' : ''}">
                      <button type="button" class="kc-chapter-btn" data-action="open-chapter" data-book-id="${book.id}" data-chapter-id="${c.id}" data-page-index="0">
                        <span class="kc-ch-status">${isChDone ? icon('checkCircle', 16) : icon('circle', 16)}</span>
                        <span class="kc-ch-num">${c.number}.</span>
                        <span class="kc-ch-title">${esc(c.title)}</span>
                      </button>

                      ${isChActive ? `
                        <!-- SUB-PAGES OF ACTIVE CHAPTER -->
                        <div class="kc-active-pages-panel">
                          <span class="kc-active-pages-label">Páginas deste capítulo:</span>
                          <ul class="kc-active-pages-list">
                            ${chPages.map((p, pIdx) => `
                              <li class="kc-page-nav-item ${pIdx === validPageIndex ? 'active' : ''}">
                                <button type="button" class="kc-page-nav-btn" data-action="go-to-page" data-page-index="${pIdx}">
                                  <span class="kc-p-step">${pIdx + 1}</span>
                                  <span class="kc-p-label">${esc(p.title.replace(/^\d+(\.\d+)?\s*/, ''))}</span>
                                </button>
                              </li>
                            `).join('')}
                          </ul>
                        </div>
                      ` : ''}
                    </li>
                  `;
                }).join('')}
              </ul>
            </nav>
          </aside>

          <!-- CENTER DESK: THE EDITORIAL PAGINATED READING DESK -->
          <main class="kc-reader-main">
            <!-- PAGE STEPPER / TABS -->
            <nav class="kc-page-stepper-bar" aria-label="Páginas do capítulo">
              ${pages.map((p, pIdx) => `
                <button type="button" class="kc-stepper-btn ${pIdx === validPageIndex ? 'active' : ''} ${pIdx < validPageIndex ? 'completed' : ''}" data-action="go-to-page" data-page-index="${pIdx}">
                  <span class="kc-step-dot">${pIdx + 1}</span>
                  <span class="kc-step-text">${esc(p.title.replace(/^\d+(\.\d+)?\s*/, ''))}</span>
                </button>
              `).join('')}
            </nav>

            <!-- THE INDEPENDENT PAGE SURFACE (ONLY THIS PAGE IS RENDERED) -->
            <article class="kc-page-surface kc-page-turn-enter" id="kcPageSurface">
              <!-- PAGE HEADER -->
              <header class="kc-page-header">
                <div class="kc-page-header-top">
                  <span class="kc-page-eyebrow">
                    LIVRO ${book.number} · CAPÍTULO ${chapter.number} · PÁGINA ${validPageIndex + 1} DE ${pages.length}
                  </span>
                  <button type="button" class="kc-btn-toggle-chapter ${isDone ? 'is-completed' : ''}" data-action="toggle-complete" data-chapter-id="${chapter.id}">
                    <span class="kc-toggle-icon">${isDone ? icon('check', 14) : ''}</span>
                    <span class="kc-toggle-label">${isDone ? 'Capítulo concluído' : 'Marcar capítulo como concluído'}</span>
                  </button>
                </div>
                <h1 class="kc-page-title">${esc(currentPage.title)}</h1>
                ${currentPage.contentLead ? `<p class="kc-page-lead">${esc(currentPage.contentLead)}</p>` : ''}
              </header>

              <!-- PAGE CONTENT CONTAINER -->
              <div class="kc-page-content-wrap">
                ${currentPage.type === 'intro' ? `
                  <div class="kc-page-hero-row">
                    <div class="kc-page-cover-box">
                      <img src="${chapter.cover || book.cover}" alt="${esc(chapter.title)}" />
                    </div>
                    ${(currentPage.takeaways && currentPage.takeaways.length) ? `
                      <div class="kc-page-takeaways-card">
                        <h3>🎯 O que você vai aprender neste capítulo:</h3>
                        <ul class="kc-page-takeaways-list">
                          ${currentPage.takeaways.map(t => `
                            <li>
                              <span class="kc-takeaway-check">${icon('check', 14)}</span>
                              <span>${esc(t)}</span>
                            </li>
                          `).join('')}
                        </ul>
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

                <!-- SECTIONS CONTENT OF THIS PAGE ONLY -->
                ${(currentPage.sections || []).map(sec => `
                  <section class="kc-page-section" id="sec-${sec.id}">
                    ${sec.title && sec.title !== currentPage.title ? `<h2 class="kc-page-sec-title">${esc(sec.title)}</h2>` : ''}
                    <div class="kc-page-sec-body">${renderMarkdown(sec.content)}</div>
                  </section>
                `).join('')}

                <!-- PRACTICE / FINAL PAGE CALLOUTS -->
                ${currentPage.tip ? `
                  <aside class="kc-tip-callout">
                    <div class="kc-tip-icon">${icon('lightbulb', 22)}</div>
                    <div class="kc-tip-copy">
                      <strong>💡 Dica importante do método</strong>
                      <p>${esc(currentPage.tip)}</p>
                    </div>
                  </aside>
                ` : ''}

                ${(currentPage.toolRoute || (currentPage.relatedLinks && currentPage.relatedLinks.length)) ? `
                  <div class="kc-related-section">
                    <div class="kc-related-box">
                      ${currentPage.toolRoute ? `
                        <div class="kc-tool-launch-card">
                          <div>
                            <span class="kc-tool-tag">⚡ Ferramenta Integrada no Software</span>
                            <h4>Coloque este conhecimento em prática agora</h4>
                            <p>Acesse o módulo no Healthy Trend Trader e aplique as regras deste capítulo.</p>
                          </div>
                          <button type="button" class="kc-launch-tool-btn" data-action="launch-route" data-route="${currentPage.toolRoute}">
                            ${esc(currentPage.toolLabel || 'Abrir Ferramenta →')}
                          </button>
                        </div>
                      ` : ''}

                      ${currentPage.relatedLinks && currentPage.relatedLinks.length ? `
                        <div class="kc-related-links-list">
                          <h5>Links e capítulos relacionados:</h5>
                          <ul>
                            ${currentPage.relatedLinks.map(link => {
                              if (link.bookId && link.chapterId) {
                                return `
                                  <li>
                                    <button type="button" class="kc-rel-link-btn" data-action="open-chapter" data-book-id="${link.bookId}" data-chapter-id="${link.chapterId}" data-page-index="0">
                                      ${icon('book', 14)} ${esc(link.label)}
                                    </button>
                                  </li>
                                `;
                              }
                              if (link.route) {
                                return `
                                  <li>
                                    <button type="button" class="kc-rel-link-btn" data-action="launch-route" data-route="${link.route}">
                                      ${icon('external', 14)} ${esc(link.label)}
                                    </button>
                                  </li>
                                `;
                              }
                              return '';
                            }).join('')}
                          </ul>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- BOTTOM PAGE NAVIGATION BAR -->
              <footer class="kc-page-footer-nav">
                <div class="kc-pf-left">
                  ${validPageIndex > 0 ? `
                    <button type="button" class="kc-pnav-btn kc-pnav-prev" data-action="prev-page">
                      ${icon('arrowLeft', 16)} Página Anterior (${validPageIndex} de ${pages.length})
                    </button>
                  ` : (prevChapter ? `
                    <button type="button" class="kc-pnav-btn kc-pnav-prev-ch" data-action="open-chapter" data-book-id="${book.id}" data-chapter-id="${prevChapter.id}" data-page-index="0">
                      ${icon('arrowLeft', 16)} Cap. Anterior: ${prevChapter.number}. ${esc(prevChapter.title)}
                    </button>
                  ` : `
                    <button type="button" class="kc-pnav-btn kc-pnav-to-lib" data-action="open-library">
                      ${icon('arrowLeft', 16)} Voltar à Biblioteca
                    </button>
                  `)}
                </div>

                <div class="kc-pf-center">
                  <span class="kc-pf-page-text">Página ${validPageIndex + 1} de ${pages.length}</span>
                  <div class="kc-pf-track">
                    <div class="kc-pf-fill" style="width: ${Math.round(((validPageIndex + 1) / pages.length) * 100)}%"></div>
                  </div>
                  <small class="kc-pf-hint">Use ← e → no teclado para virar a página</small>
                </div>

                <div class="kc-pf-right">
                  ${validPageIndex < pages.length - 1 ? `
                    <button type="button" class="kc-pnav-btn kc-pnav-next" data-action="next-page">
                      Próxima Página (${validPageIndex + 2} de ${pages.length}) ${icon('arrowRight', 16)}
                    </button>
                  ` : (nextChapter ? `
                    <button type="button" class="kc-pnav-btn kc-pnav-next-ch" data-action="open-chapter" data-book-id="${book.id}" data-chapter-id="${nextChapter.id}" data-page-index="0">
                      Concluir & Próximo Cap. ${nextChapter.number} ${icon('arrowRight', 16)}
                    </button>
                  ` : `
                    <button type="button" class="kc-pnav-btn kc-pnav-finish" data-action="open-library">
                      ✓ Concluir Livro & Biblioteca ${icon('arrowRight', 16)}
                    </button>
                  `)}
                </div>
              </footer>
            </article>
          </main>

          <!-- RIGHT CONTEXTUAL SIDEBAR: APOIO E RESUMO -->
          <aside class="kc-reader-context-sidebar">
            <!-- SUMMARY CARD -->
            <div class="kc-ctx-card">
              <h4 class="kc-ctx-title">${icon('checkCircle', 16)} Síntese do Capítulo</h4>
              <p class="kc-ctx-desc">Pontos fundamentais que você deve fixar:</p>
              <ul class="kc-ctx-takeaways">
                ${(chapter.takeaways || []).map(t => `
                  <li><span>✓</span> ${esc(t)}</li>
                `).join('')}
              </ul>
            </div>

            <!-- TOOL INTEGRATION CARD -->
            ${chapter.toolRoute ? `
              <div class="kc-ctx-card kc-ctx-tool-card">
                <span class="kc-ctx-tag">Prática Deliberada</span>
                <h4 class="kc-ctx-title">${icon('monitor', 16)} Ferramenta no Software</h4>
                <p class="kc-ctx-desc">Abra o módulo correspondente e execute na prática:</p>
                <button type="button" class="kc-ctx-tool-btn" data-action="launch-route" data-route="${chapter.toolRoute}">
                  ${esc(chapter.toolLabel || 'Abrir Ferramenta →')}
                </button>
              </div>
            ` : ''}

            <!-- TIP CARD -->
            ${chapter.tip ? `
              <div class="kc-ctx-card kc-ctx-tip-card">
                <h4 class="kc-ctx-title">${icon('lightbulb', 16)} Dica do Método</h4>
                <p class="kc-ctx-tip-text">${esc(chapter.tip)}</p>
              </div>
            ` : ''}

            <!-- KEYBOARD SHORTCUTS CARD -->
            <div class="kc-ctx-card kc-ctx-shortcuts-card">
              <h4 class="kc-ctx-title">⌨️ Atalhos de Leitura</h4>
              <ul class="kc-ctx-shortcuts">
                <li><kbd>→</kbd> <span>Próxima página</span></li>
                <li><kbd>←</kbd> <span>Página anterior</span></li>
                <li><kbd>Esc</kbd> <span>Voltar à biblioteca</span></li>
                <li><kbd>Ctrl+K</kbd> <span>Buscar no manual</span></li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    `;
  }

  function renderApp() {
    if (appState.view === 'reader') {
      container.innerHTML = renderReaderView();
    } else {
      container.innerHTML = renderLibraryView();
    }
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
      if (m.type === 'chapter') {
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
            <span class="kc-res-sub">${esc(m.subtitle || '')}</span>
          </div>
          <span class="kc-res-arrow">${icon('arrowRight', 14)}</span>
        </button>
      `;
    }).join('');

    dropdownEl.innerHTML = `<div class="kc-search-count">${matches.length} resultado(s)</div>${html}`;
    dropdownEl.hidden = false;
  }

  function setupEvents() {
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
    const readerSearchInput = container.querySelector('#kcReaderSearchInput');
    const readerSearchDropdown = container.querySelector('#kcReaderSearchDropdown');

    if (readerSearchInput && readerSearchDropdown) {
      readerSearchInput.addEventListener('input', e => {
        const val = e.target.value;
        if (!val.trim()) {
          readerSearchDropdown.hidden = true;
          readerSearchDropdown.innerHTML = '';
          return;
        }
        const matches = performSearch(val);
        renderSearchResults(readerSearchDropdown, matches);
      });
    }

    // Global Click Delegation
    container.onclick = function (e) {
      const target = e.target.closest('[data-action]');
      if (!target) {
        if (searchDropdown && !e.target.closest('.kc-lib-search-box')) searchDropdown.hidden = true;
        if (readerSearchDropdown && !e.target.closest('.kc-reader-top-search')) readerSearchDropdown.hidden = true;
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
  }

  // Keyboard navigation: ArrowLeft (prev), ArrowRight (next), Escape (library)
  document.addEventListener('keydown', event => {
    if (!root.classList.contains('active')) return;

    // Ignore if typing in an input
    const tag = (event.target && event.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (event.key === 'Escape' && appState.view === 'reader') {
      event.preventDefault();
      openLibrary();
    } else if (event.key === 'ArrowRight' && appState.view === 'reader') {
      event.preventDefault();
      nextPage();
    } else if (event.key === 'ArrowLeft' && appState.view === 'reader') {
      event.preventDefault();
      prevPage();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const input = container.querySelector('#kcSearchInput') || container.querySelector('#kcReaderSearchInput');
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

  // Initial render
  renderApp();
}());

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
  ];

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
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { completed: [], lastRead: null };
  }

  function saveProgress(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (window.healthyTrendWorkspace && typeof window.healthyTrendWorkspace.save === 'function') {
        window.healthyTrendWorkspace.save('manualProgress', state);
      }
    } catch (_) {}
  }

  const appState = {
    view: 'library', // 'library' | 'reader'
    bookId: 'livro-1',
    chapterId: 'livro-1-cap-1',
    searchQuery: '',
    progress: loadProgress()
  };

  const BooksModel = window.ManualKnowledgeBooks || {
    BOOKS: [],
    getBook: () => null,
    getChapter: () => null,
    getTotalChapters: () => 0
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
  function openBook(bookId, chapterId) {
    const book = BooksModel.getBook(bookId);
    if (!book) return;
    appState.view = 'reader';
    appState.bookId = bookId;
    appState.chapterId = chapterId || (book.chapters[0] ? book.chapters[0].id : null);
    appState.progress.lastRead = { bookId: appState.bookId, chapterId: appState.chapterId };
    saveProgress(appState);
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openLibrary() {
    appState.view = 'library';
    renderApp();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Compatibility routes
  window.openSellIntoStrengthManual = function () {
    if (typeof go === 'function') go('manual');
    setTimeout(() => openBook('livro-6', 'livro-6-cap-2'), 100);
  };

  window.openScaleInManual = function () {
    if (typeof go === 'function') go('manual');
    setTimeout(() => openBook('livro-3', 'livro-3-cap-13'), 100);
  };

  // Main UI Container
  const container = document.createElement('div');
  container.className = 'knowledge-center';
  root.appendChild(legacy);
  root.appendChild(container);

  // Search Catalog builder
  function buildSearchCatalog() {
    const list = [];
    // Books & Chapters
    for (const b of BooksModel.BOOKS) {
      for (const c of b.chapters) {
        list.push({
          type: 'chapter',
          bookId: b.id,
          chapterId: c.id,
          title: c.title,
          badge: `${b.title} · Cap. ${c.number}`,
          subtitle: c.subtitle,
          text: [c.subtitle, ...(c.takeaways || []), ...(c.sections || []).map(s => s.title + ' ' + s.content)].join(' ')
        });
      }
    }
    // Software tools
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
    // Glossary terms
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

  // Renderers
  function renderLibraryView() {
    const overall = getOverallProgress();

    return `
      <div class="kc-library-view">
        <!-- HERO BANNER -->
        <section class="kc-lib-hero">
          <div class="kc-lib-hero-copy">
            <span class="kc-lib-eyebrow">CENTRAL DE CONHECIMENTO</span>
            <h1 class="kc-lib-title">Central de Conhecimento</h1>
            <p class="kc-lib-subtitle">Domine o software. Entenda o método. Execute com intenção.</p>
            <p class="kc-lib-description">Uma biblioteca completa para você aprender, consultar e evoluir como trader, com conteúdo organizado, prático e direto ao ponto.</p>
            
            <div class="kc-lib-search-box">
              <span class="kc-lib-search-icon">${icon('search', 20)}</span>
              <input type="text" class="kc-lib-search-input" id="kcSearchInput" placeholder="O que você quer aprender hoje?" autocomplete="off" />
              <button type="button" class="kc-lib-search-clear" id="kcSearchClear" hidden title="Limpar busca">×</button>
              <button type="button" class="kc-lib-search-submit" id="kcSearchSubmit" aria-label="Pesquisar">${icon('arrowRight', 18)}</button>
              <div class="kc-search-dropdown" id="kcSearchDropdown" hidden></div>
            </div>
          </div>
          <div class="kc-lib-hero-art">
            <img src="assets/manual-knowledge/hero.png" alt="Central de Conhecimento" />
          </div>
        </section>

        <!-- 3 QUICK PATH CARDS -->
        <section class="kc-quick-paths">
          <div class="kc-path-card" data-action="open-book" data-book-id="livro-1">
            <div class="kc-path-icon kc-path-icon-gold">${icon('play', 24)}</div>
            <div class="kc-path-copy">
              <h3>Começar Agora</h3>
              <p>Uma trilha guiada para conhecer a plataforma e começar do jeito certo.</p>
            </div>
            <button type="button" class="kc-path-btn" aria-label="Começar Agora">${icon('arrowRight', 18)}</button>
          </div>

          <div class="kc-path-card" data-action="open-book" data-book-id="livro-2">
            <div class="kc-path-icon kc-path-icon-teal">${icon('monitor', 24)}</div>
            <div class="kc-path-copy">
              <h3>Explorar o Software</h3>
              <p>Conheça todas as ferramentas da plataforma, organizadas por categoria.</p>
            </div>
            <button type="button" class="kc-path-btn" aria-label="Explorar o Software">${icon('arrowRight', 18)}</button>
          </div>

          <div class="kc-path-card" data-action="open-book" data-book-id="livro-3">
            <div class="kc-path-icon kc-path-icon-amber">${icon('chart', 24)}</div>
            <div class="kc-path-copy">
              <h3>Dominar o Método</h3>
              <p>Estude os conceitos, regras e estratégias que fundamentam suas decisões.</p>
            </div>
            <button type="button" class="kc-path-btn" aria-label="Dominar o Método">${icon('arrowRight', 18)}</button>
          </div>
        </section>

        <!-- BOOKS GRID SECTION -->
        <section class="kc-books-section">
          <div class="kc-books-header">
            <div>
              <h2 class="kc-books-title">Biblioteca de Livros</h2>
              <p class="kc-books-subtitle">Conhecimento organizado em uma sequência lógica para você aprender, consultar e evoluir.</p>
            </div>
            <div class="kc-overall-progress-card">
              <div class="kc-overall-top">
                <span class="kc-overall-label">Seu progresso geral</span>
                <span class="kc-overall-pct">${overall.percent}%</span>
              </div>
              <div class="kc-progress-track">
                <div class="kc-progress-fill" style="width: ${overall.percent}%"></div>
              </div>
              <span class="kc-overall-detail">${overall.completed} de ${overall.total} capítulos concluídos</span>
            </div>
          </div>

          <div class="kc-books-grid">
            ${BooksModel.BOOKS.map(book => {
              const bProg = getBookProgress(book);
              const isStarted = bProg.completed > 0;
              const isComplete = bProg.completed === bProg.total && bProg.total > 0;
              const btnLabel = isStarted && !isComplete ? 'Continuar' : 'Acessar';

              return `
                <article class="kc-book-card" data-action="open-book" data-book-id="${book.id}">
                  <div class="kc-book-cover-frame">
                    <img src="${book.cover}" alt="Capa ${esc(book.title)}" loading="lazy" />
                  </div>
                  <div class="kc-book-body">
                    <div class="kc-book-meta-top">
                      <span class="kc-book-number">${book.number}</span>
                      <span class="kc-book-chapters-badge">${book.chapters.length} capítulos</span>
                    </div>
                    <h3 class="kc-book-name">${esc(book.title)}</h3>
                    <p class="kc-book-sub">${esc(book.subtitle)}</p>
                    
                    <div class="kc-book-progress-row">
                      <div class="kc-progress-track">
                        <div class="kc-progress-fill" style="width: ${bProg.percent}%"></div>
                      </div>
                      <span class="kc-book-pct">${bProg.percent}%</span>
                    </div>

                    <button type="button" class="kc-book-btn ${isStarted ? 'kc-btn-continue' : 'kc-btn-access'}">
                      ${btnLabel}
                    </button>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        </section>
      </div>
    `;
  }

  function renderReaderView() {
    const book = BooksModel.getBook(appState.bookId) || BooksModel.BOOKS[0];
    const chapter = BooksModel.getChapter(appState.bookId, appState.chapterId) || book.chapters[0];
    if (!book || !chapter) return '<p>Capítulo não encontrado.</p>';

    const bProg = getBookProgress(book);
    const chapterIdx = book.chapters.findIndex(c => c.id === chapter.id);
    const prevChapter = chapterIdx > 0 ? book.chapters[chapterIdx - 1] : null;
    const nextChapter = chapterIdx < book.chapters.length - 1 ? book.chapters[chapterIdx + 1] : null;
    const isCompleted = isChapterCompleted(chapter.id);

    return `
      <div class="kc-reader-view">
        <!-- TOP BREADCRUMB BAR -->
        <header class="kc-reader-topbar">
          <nav class="kc-breadcrumbs" aria-label="Navegação de migalhas">
            <button type="button" class="kc-crumb-back" data-action="open-library">
              ${icon('arrowLeft', 16)} Central de Conhecimento
            </button>
            <span class="kc-crumb-sep">/</span>
            <span class="kc-crumb-book">${esc(book.title)}</span>
            <span class="kc-crumb-sep">/</span>
            <span class="kc-crumb-current">${chapter.number}. ${esc(chapter.title)}</span>
          </nav>

          <div class="kc-reader-top-search">
            <span class="kc-top-search-icon">${icon('search', 16)}</span>
            <input type="text" class="kc-top-search-input" id="kcReaderSearchInput" placeholder="Buscar neste livro..." autocomplete="off" />
            <div class="kc-search-dropdown" id="kcReaderSearchDropdown" hidden></div>
          </div>
        </header>

        <div class="kc-reader-layout">
          <!-- LEFT SIDEBAR: CHAPTER INDEX -->
          <aside class="kc-reader-sidebar">
            <div class="kc-sidebar-book-card">
              <div class="kc-sidebar-book-header">
                <span class="kc-sidebar-book-icon">${icon('book', 20)}</span>
                <div>
                  <h3 class="kc-sidebar-book-title">${esc(book.title)}</h3>
                  <span class="kc-sidebar-book-count">${book.chapters.length} capítulos</span>
                </div>
              </div>
              <div class="kc-sidebar-progress-row">
                <div class="kc-progress-track">
                  <div class="kc-progress-fill" style="width: ${bProg.percent}%"></div>
                </div>
                <span class="kc-sidebar-pct">${bProg.completed} de ${bProg.total} (${bProg.percent}%)</span>
              </div>
            </div>

            <nav class="kc-chapter-nav" aria-label="Índice de Capítulos">
              <ul class="kc-chapter-list">
                ${book.chapters.map(c => {
                  const isActive = c.id === chapter.id;
                  const done = isChapterCompleted(c.id);
                  return `
                    <li class="kc-chapter-item ${isActive ? 'active' : ''} ${done ? 'completed' : ''}">
                      <button type="button" class="kc-chapter-btn" data-action="select-chapter" data-chapter-id="${c.id}">
                        <span class="kc-ch-status">${done ? icon('checkCircle', 16) : icon('circle', 16)}</span>
                        <span class="kc-ch-num">${c.number}.</span>
                        <span class="kc-ch-title">${esc(c.title)}</span>
                      </button>
                      ${isActive && c.sections && c.sections.length ? `
                        <ul class="kc-subsections-list">
                          ${c.sections.map(sec => `
                            <li>
                              <a href="#sec-${sec.id}" class="kc-subsec-link">
                                ${esc(sec.title)}
                              </a>
                            </li>
                          `).join('')}
                        </ul>
                      ` : ''}
                    </li>
                  `;
                }).join('')}
              </ul>
            </nav>
          </aside>

          <!-- MAIN READING ARTICLE -->
          <main class="kc-reader-main">
            <article class="kc-chapter-article">
              <!-- CHAPTER HEADER -->
              <div class="kc-art-header">
                <div>
                  <span class="kc-art-eyebrow">Capítulo ${chapter.number}</span>
                  <h1 class="kc-art-title">${esc(chapter.title)}</h1>
                  <p class="kc-art-subtitle">${esc(chapter.subtitle)}</p>
                </div>
                <div class="kc-art-complete-wrap">
                  <button type="button" class="kc-btn-toggle-complete ${isCompleted ? 'is-completed' : ''}" data-action="toggle-complete" data-chapter-id="${chapter.id}">
                    <span class="kc-toggle-icon">${isCompleted ? icon('check', 16) : ''}</span>
                    <span class="kc-toggle-label">${isCompleted ? 'Capítulo concluído' : 'Marcar como concluído'}</span>
                  </button>
                </div>
              </div>

              <!-- HERO ROW: COVER ART + TAKEAWAYS -->
              <div class="kc-art-featured-row">
                <div class="kc-art-cover-box">
                  <img src="${chapter.cover || book.cover}" alt="${esc(chapter.title)}" />
                </div>
                ${chapter.takeaways && chapter.takeaways.length ? `
                  <div class="kc-art-takeaways-card">
                    <h3>Neste capítulo você vai aprender:</h3>
                    <ul class="kc-takeaways-list">
                      ${chapter.takeaways.map(t => `
                        <li>
                          <span class="kc-takeaway-check">${icon('check', 14)}</span>
                          <span>${esc(t)}</span>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>

              <!-- SECTIONS CONTENT -->
              <div class="kc-art-body">
                ${(chapter.sections || []).map(sec => `
                  <section class="kc-art-section" id="sec-${sec.id}">
                    <h2 class="kc-sec-heading">${esc(sec.title)}</h2>
                    <div class="kc-sec-content">${renderMarkdown(sec.content)}</div>
                  </section>
                `).join('')}
              </div>

              <!-- CALLOUT: DICA IMPORTANTE -->
              ${chapter.tip ? `
                <aside class="kc-tip-callout">
                  <div class="kc-tip-icon">${icon('lightbulb', 22)}</div>
                  <div class="kc-tip-copy">
                    <strong>Dica importante</strong>
                    <p>${esc(chapter.tip)}</p>
                  </div>
                </aside>
              ` : ''}

              <!-- RELATED LINKS / TOOL ACCESS -->
              ${(chapter.toolRoute || (chapter.relatedLinks && chapter.relatedLinks.length)) ? `
                <div class="kc-related-section">
                  <div class="kc-related-box">
                    ${chapter.toolRoute ? `
                      <div class="kc-tool-launch-card">
                        <div>
                          <span class="kc-tool-tag">Ferramenta Integrada</span>
                          <h4>Coloque este conhecimento em prática agora</h4>
                        </div>
                        <button type="button" class="kc-launch-tool-btn" data-action="launch-route" data-route="${chapter.toolRoute}">
                          ${esc(chapter.toolLabel || 'Abrir Ferramenta →')}
                        </button>
                      </div>
                    ` : ''}

                    ${chapter.relatedLinks && chapter.relatedLinks.length ? `
                      <div class="kc-related-links-list">
                        <h5>Links e tópicos relacionados:</h5>
                        <ul>
                          ${chapter.relatedLinks.map(link => {
                            if (link.bookId && link.chapterId) {
                              return `
                                <li>
                                  <button type="button" class="kc-rel-link-btn" data-action="open-chapter" data-book-id="${link.bookId}" data-chapter-id="${link.chapterId}">
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

              <!-- READER FOOTER BAR: PREV / NEXT -->
              <footer class="kc-reader-footer-nav">
                <div class="kc-nav-prev">
                  ${prevChapter ? `
                    <button type="button" class="kc-btn-nav-prev" data-action="select-chapter" data-chapter-id="${prevChapter.id}">
                      ${icon('arrowLeft', 16)}
                      <div>
                        <small>Capítulo anterior</small>
                        <span>${prevChapter.number}. ${esc(prevChapter.title)}</span>
                      </div>
                    </button>
                  ` : ''}
                </div>

                <div class="kc-nav-center">
                  <button type="button" class="kc-btn-nav-index" data-action="open-library">
                    ${icon('menu', 16)} Índice de Livros
                  </button>
                </div>

                <div class="kc-nav-next">
                  ${nextChapter ? `
                    <button type="button" class="kc-btn-nav-next" data-action="select-chapter" data-chapter-id="${nextChapter.id}">
                      <div>
                        <small>Próximo capítulo</small>
                        <span>${nextChapter.number}. ${esc(nextChapter.title)}</span>
                      </div>
                      ${icon('arrowRight', 16)}
                    </button>
                  ` : ''}
                </div>
              </footer>
            </article>
          </main>
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
        actionAttr = `data-action="open-chapter" data-book-id="${m.bookId}" data-chapter-id="${m.chapterId}"`;
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
        // If clicking outside search dropdowns, close them
        if (searchDropdown && !e.target.closest('.kc-lib-search-box')) searchDropdown.hidden = true;
        if (readerSearchDropdown && !e.target.closest('.kc-reader-top-search')) readerSearchDropdown.hidden = true;
        return;
      }

      const action = target.dataset.action;

      if (action === 'open-library') {
        openLibrary();
      } else if (action === 'open-book') {
        const bookId = target.dataset.bookId;
        openBook(bookId);
      } else if (action === 'select-chapter') {
        const chapterId = target.dataset.chapterId;
        openBook(appState.bookId, chapterId);
      } else if (action === 'open-chapter') {
        const bId = target.dataset.bookId;
        const cId = target.dataset.chapterId;
        openBook(bId, cId);
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

  // Keyboard shortcut Ctrl + K
  document.addEventListener('keydown', event => {
    if (root.classList.contains('active') && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
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
  window.openManualBook = openBook;
  window.openManualLibrary = openLibrary;

  // Initial render
  renderApp();
}());

/**
 * Central de Conhecimento — Acervo dos Livros Digitais do Healthy Trend Trader
 * Estrutura editorial dos 6 Livros Oficiais, seus capítulos, seções e conteúdo educacional.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ManualKnowledgeBooks = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BOOKS = [
  {
    "id": "livro-1",
    "number": "01",
    "title": "Primeiros Passos",
    "subtitle": "Visão geral, navegação e o fluxo operacional do método",
    "cover": "assets/manual-knowledge/today.jpg",
    "description": "Uma introdução acolhedora e prática para dominar a navegação do sistema, entender os três pilares do método e executar seus primeiros passos sem ansiedade.",
    "chapters": [
      {
        "id": "livro-1-cap-1",
        "number": 1,
        "title": "Visão Geral da Plataforma",
        "subtitle": "Seu centro de comando e a filosofia do Trend Following saudável",
        "cover": "assets/manual-knowledge/dashboard.jpg",
        "takeaways": [
          "O que é o Healthy Trend Trader e sua missão central",
          "Como o software protege seu capital antes de buscar rentabilidade",
          "Os 6 pilares de navegação e organização da sua rotina",
          "A diferença entre operar por impulso e operar por processo sistemático"
        ],
        "sections": [
          {
            "id": "o-que-e",
            "title": "1.1 O que é o Healthy Trend Trader",
            "content": "O **Healthy Trend Trader** não é apenas uma plataforma de análise técnica ou de registro de ordens; ele é um **ambiente de governança operacional e emocional** desenhado especificamente para operadores de tendência (Trend Followers).\n\nA premissa fundamental do sistema é que **a consistência a longo prazo no mercado financeiro decorre da saúde do seu processo decisório, e não de tentar prever o futuro em cada pregão.**\n\nEnquanto a maioria dos traders se perde no estresse das oscilações de curto prazo, operando em excesso e assumindo riscos desproporcionais, o Healthy Trend Trader estrutura toda a sua jornada em torno de três princípios inegociáveis:\n1. **Proteção Rigorosa do Capital:** Nenhuma operação é permitida sem um stop técnico definido e um risco financeiro pré-estabelecido.\n2. **Confluência de Probabilidades:** Apenas oportunidades de alta qualidade técnica (Grades A e B) recebem autorização de risco da política.\n3. **Longevidade e Paz Mental:** O software monitora sua carga psicológica, seu tempo de tela e seus hábitos diários para evitar o esgotamento (burnout) e a espiral de perdas."
          },
          {
            "id": "pilares",
            "title": "1.2 Os Seis Pilares do Sistema",
            "content": "A navegação do sistema reflete diretamente o ciclo de vida do operador profissional:\n- **Operação Diária:** Onde o dia acontece (Visão Geral, Planejamento de Novo Trade, Rotina Pré/Pós e Monitor de Hábitos).\n- **Análise de Mercado:** Inteligência antes do trade (Gráficos, Central Macro, Ciclo de Mercado, Líderes Emergentes e Força Relativa).\n- **Carteira & Risco:** Governança patrimonial (Posições abertas, Portfolio Heat, Política de Risco e Blindagem Comportamental).\n- **Desempenho & Simulações:** Auditoria e evolução (Painel da Verdade, Anatomia de Trades, Simuladores e Diário com IA).\n- **Mentalidade & Zen:** O cérebro do operador (Check-in emocional, Trader Zen, Regras inegociáveis e Sabedoria dos mestres).\n- **Recursos & Governança:** Ferramentas de apoio, Trader Store e configurações da plataforma."
          }
        ],
        "tip": "No Healthy Trend Trader, menos é mais. O melhor trader não é aquele que faz mais operações, mas aquele que espera pacientemente pelas oportunidades com confluência máxima de probabilidades.",
        "toolRoute": "today",
        "toolLabel": "Abrir Visão Geral (Cockpit) →",
        "relatedLinks": [
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          },
          {
            "label": "Visão Geral (Ferramenta)",
            "route": "today"
          },
          {
            "label": "Rotina Diária (Ferramenta)",
            "route": "dailyroutine"
          }
        ]
      },
      {
        "id": "livro-1-cap-2",
        "number": 2,
        "title": "Navegação e Produtividade",
        "subtitle": "Como extrair o máximo do software em qualquer tamanho de tela",
        "cover": "assets/manual-knowledge/settings.jpg",
        "takeaways": [
          "Como usar a barra lateral recolhível e os atalhos rápidos",
          "Busca global instantânea pelo teclado (Ctrl + K)",
          "Adaptação a monitores widescreen, notebooks e tablets",
          "Personalização de temas e preferências"
        ],
        "sections": [
          {
            "id": "atalhos",
            "title": "2.1 Atalhos e Busca Rápida",
            "content": "Para garantir fluidez no seu dia a dia, você pode pressionar a qualquer momento **Ctrl + K** (ou **Cmd + K** no Mac) para acionar a busca global de qualquer tela ou conceito.\nA barra lateral esquerda organiza todos os módulos em grupos colapsáveis e preserva o estado de abertura conforme você navega."
          },
          {
            "id": "widescreen",
            "title": "2.2 Layout Widescreen e Ergonomia Visual",
            "content": "O sistema foi arquitetado segundo padrões desktop-first com suporte nativo a monitores widescreen de alta resolução. As informações se expandem confortavelmente pela tela, evitando confinamentos desnecessários e proporcionando uma leitura limpa dos gráficos e métricas de risco."
          }
        ],
        "tip": "Utilize o atalho Ctrl+K para alternar rapidamente entre o Diário, a Watchlist e a Central de Mercado durante o pregão.",
        "toolRoute": "settings",
        "toolLabel": "Abrir Configurações →",
        "relatedLinks": [
          {
            "label": "Explorando o Software (Livro 2)",
            "bookId": "livro-2",
            "chapterId": "livro-2-cap-1"
          },
          {
            "label": "Configurações (Ferramenta)",
            "route": "settings"
          }
        ]
      },
      {
        "id": "livro-1-cap-3",
        "number": 3,
        "title": "O Healthy Trading System",
        "subtitle": "A regra de ouro: Wait → Confirm → Execute",
        "cover": "assets/manual-knowledge/about.jpg",
        "takeaways": [
          "A hierarquia obrigatória do processo decisório",
          "Por que a permissão de mercado antecede o setup gráfico",
          "Como a qualidade da oportunidade define o risco monetário",
          "O conceito de expectativa matemática positiva no longo prazo"
        ],
        "sections": [
          {
            "id": "hierarquia",
            "title": "3.1 A Precedência de Decisão",
            "content": "A ordem de validação do Healthy Trend Trader é estrita e inegociável:\n1. **Permissão de Mercado:** O regime do mercado (Up, Down ou Transição) autoriza novas compras?\n2. **Qualidade do Setup:** A oportunidade possui pontuação suficiente na Trading Rubric (Grade A ou B)?\n3. **Dimensionamento de Posição:** Qual é a quantidade exata calculada pelo menor limite entre Stop, ATR e Capital?\n4. **Portfolio Heat:** A carteira comporta o novo risco sem violar o teto total de exposição?\n5. **Execução:** Ordem programada com stop técnico no gatilho confirmado.\n6. **Diário & Auditoria:** Registro do processo técnico e psicológico."
          }
        ],
        "tip": "Nunca inverta a ordem do processo. Um gráfico bonito em um mercado em queda (Regime Down) possui probabilidade estatisticamente desfavorável.",
        "toolRoute": "about",
        "toolLabel": "Conhecer o Manifesto do Sistema →",
        "relatedLinks": [
          {
            "label": "Dominando o Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          },
          {
            "label": "Ciclo de Mercado (Ferramenta)",
            "route": "marketcycle"
          }
        ]
      },
      {
        "id": "livro-1-cap-4",
        "number": 4,
        "title": "O Fluxo Operacional Diário",
        "subtitle": "Da preparação matinal ao fechamento do diário",
        "cover": "assets/manual-knowledge/dailyroutine.jpg",
        "takeaways": [
          "Ritual Pré-Mercado: leitura do macro e seleção de candidatos",
          "Ritual Intra-Mercado: monitoramento com foco e sem overtrading",
          "Ritual Pós-Mercado: auditoria, registro de emoções e descanso",
          "Como transformar a consistência em um hábito diário mensurável"
        ],
        "sections": [
          {
            "id": "fases",
            "title": "4.1 As Três Fases do Pregão",
            "content": "O sucesso no trading é 80% preparação e 20% execução:\n- **Fase 1 — Pré-Mercado (15 a 30 min):** Checar o regime do Ciclo de Mercado, verificar eventos do calendário econômico no Playbook de Eventos e revisar os ativos da Watchlist prontos para gatilho.\n- **Fase 2 — Intra-Mercado (Execução Cirúrgica):** Entrar apenas nos rompimentos autorizados, ajustar stops conforme a regra e evitar olhar as cotações a cada minuto.\n- **Fase 3 — Pós-Mercado (15 min):** Atualizar o Diário do Trader, registrar o estado mental e revisar o Portfolio Heat."
          }
        ],
        "tip": "Limite seu tempo de tela durante o pregão. Se suas ordens de entrada e stop já estão programadas, ficar olhando o tick-a-tick só gera ansiedade e decisões impulsivas.",
        "toolRoute": "dailyroutine",
        "toolLabel": "Abrir Rotina Diária →",
        "relatedLinks": [
          {
            "label": "Rotina Diária (Ferramenta)",
            "route": "dailyroutine"
          },
          {
            "label": "Monitor de Hábitos (Ferramenta)",
            "route": "habits"
          }
        ]
      },
      {
        "id": "livro-1-cap-5",
        "number": 5,
        "title": "Checklist e Primeira Configuração",
        "subtitle": "Configurando patrimônio, política e limites iniciais",
        "cover": "assets/manual-knowledge/riskpolicy.jpg",
        "takeaways": [
          "Como cadastrar o saldo inicial da sua conta em Patrimônio",
          "Configuração do Risk Budget por Grade na Política de Risco",
          "Escolha entre Perfil Padrão e Risk Ramp-Up",
          "Ativação do Desafio Grade A (Modo Desapego)"
        ],
        "sections": [
          {
            "id": "primeiros-ajustes",
            "title": "5.1 Primeiros Passos de Configuração",
            "content": "Antes de planejar o seu primeiro trade, execute este checklist:\n1. Acesse **Patrimônio** e informe o capital operacional total dedicado à estratégia.\n2. Acesse **Política de Risco** e confira os percentuais nominais autorizados (ex: 1,00% para Grade A e 0,50% para Grade B).\n3. Verifique o limite máximo de risco por operação e o teto total de Portfolio Heat da carteira (ex: 6%).\n4. Defina seus hábitos essenciais no **Monitor de Hábitos**."
          }
        ],
        "tip": "Se você está começando agora ou vindo de uma sequência ruim, ative o perfil Risk Ramp-Up, que limita a 3 posições simultâneas para proteger seu foco.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Configurar Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Patrimônio (Ferramenta)",
            "route": "dashboard"
          }
        ]
      }
    ]
  },
  {
    "id": "livro-2",
    "number": "02",
    "title": "Explorando o Software",
    "subtitle": "Conheça todas as ferramentas da plataforma organizadas por categoria",
    "cover": "assets/manual-knowledge/charts.jpg",
    "description": "Um guia completo e visual para dominar cada tela do Healthy Trend Trader, entender a finalidade de cada métrica e saber exatamente onde clicar em cada momento do pregão.",
    "chapters": [
      {
        "id": "livro-2-cap-1",
        "number": 1,
        "title": "Visão Geral (Desktop do Trader)",
        "subtitle": "Seu centro de comando operacional e visão do calor da conta.",
        "cover": "assets/manual-knowledge/today.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Visão Geral (Desktop do Trader) no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-today",
            "title": "1.1 Como Utilizar a Ferramenta",
            "content": "A tela **Visão Geral (Desktop do Trader)** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Visão Geral (Desktop do Trader) de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "today",
        "toolLabel": "Abrir Visão Geral →",
        "relatedLinks": [
          {
            "label": "Visão Geral (Ferramenta)",
            "route": "today"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-2",
        "number": 2,
        "title": "Novo Trade",
        "subtitle": "Planejamento em etapas, cálculo da Rubric e limitadores de tamanho.",
        "cover": "assets/manual-knowledge/newtrade.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Novo Trade no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-newtrade",
            "title": "2.1 Como Utilizar a Ferramenta",
            "content": "A tela **Novo Trade** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Novo Trade de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "newtrade",
        "toolLabel": "Abrir Novo Trade →",
        "relatedLinks": [
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-3",
        "number": 3,
        "title": "Rotina Diária & Hábitos",
        "subtitle": "Rituais de pré, intra e pós-mercado para consistência mecânica.",
        "cover": "assets/manual-knowledge/dailyroutine.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Rotina Diária & Hábitos no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-dailyroutine",
            "title": "3.1 Como Utilizar a Ferramenta",
            "content": "A tela **Rotina Diária & Hábitos** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Rotina Diária & Hábitos de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "dailyroutine",
        "toolLabel": "Abrir Rotina Diária →",
        "relatedLinks": [
          {
            "label": "Rotina Diária (Ferramenta)",
            "route": "dailyroutine"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-4",
        "number": 4,
        "title": "Watchlist & Radar",
        "subtitle": "Organização inteligente de oportunidades por estágios técnicos.",
        "cover": "assets/manual-knowledge/watchlist.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Watchlist & Radar no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-watchlist",
            "title": "4.1 Como Utilizar a Ferramenta",
            "content": "A tela **Watchlist & Radar** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Watchlist & Radar de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "watchlist",
        "toolLabel": "Abrir Watchlist →",
        "relatedLinks": [
          {
            "label": "Watchlist (Ferramenta)",
            "route": "watchlist"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-5",
        "number": 5,
        "title": "Missão & Rebuild Mode",
        "subtitle": "Jornada estruturada de foco e recuperação de confiança após drawdowns.",
        "cover": "assets/manual-knowledge/mission.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Missão & Rebuild Mode no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-mission",
            "title": "5.1 Como Utilizar a Ferramenta",
            "content": "A tela **Missão & Rebuild Mode** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Missão & Rebuild Mode de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "mission",
        "toolLabel": "Abrir Missão →",
        "relatedLinks": [
          {
            "label": "Missão (Ferramenta)",
            "route": "mission"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-6",
        "number": 6,
        "title": "Prática Deliberada",
        "subtitle": "Metas comportamentais e aperfeiçoamento contínuo do processo.",
        "cover": "assets/manual-knowledge/tradertraining.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Prática Deliberada no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-tradertraining",
            "title": "6.1 Como Utilizar a Ferramenta",
            "content": "A tela **Prática Deliberada** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Prática Deliberada de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "tradertraining",
        "toolLabel": "Abrir Prática Deliberada →",
        "relatedLinks": [
          {
            "label": "Prática Deliberada (Ferramenta)",
            "route": "tradertraining"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-7",
        "number": 7,
        "title": "Gráficos Interativos",
        "subtitle": "Leitura técnica de candles diários, médias móveis e benchmarking automático.",
        "cover": "assets/manual-knowledge/charts.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Gráficos Interativos no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-charts",
            "title": "7.1 Como Utilizar a Ferramenta",
            "content": "A tela **Gráficos Interativos** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Gráficos Interativos de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "charts",
        "toolLabel": "Abrir Gráficos →",
        "relatedLinks": [
          {
            "label": "Gráficos (Ferramenta)",
            "route": "charts"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-8",
        "number": 8,
        "title": "Central de Mercado & Breadth",
        "subtitle": "Observatório macroeconômico, regimes globais e notícias em tempo real.",
        "cover": "assets/manual-knowledge/marketcentral.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Central de Mercado & Breadth no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-marketcentral",
            "title": "8.1 Como Utilizar a Ferramenta",
            "content": "A tela **Central de Mercado & Breadth** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Central de Mercado & Breadth de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "marketcentral",
        "toolLabel": "Abrir Central de Mercado →",
        "relatedLinks": [
          {
            "label": "Central de Mercado (Ferramenta)",
            "route": "marketcentral"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-9",
        "number": 9,
        "title": "Registro de Eventos",
        "subtitle": "Biblioteca histórica de catalisadores (Copom, FOMC, CPI e Payroll).",
        "cover": "assets/manual-knowledge/eventplaybook.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Registro de Eventos no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-eventplaybook",
            "title": "9.1 Como Utilizar a Ferramenta",
            "content": "A tela **Registro de Eventos** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Registro de Eventos de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "eventplaybook",
        "toolLabel": "Abrir Registro de Eventos →",
        "relatedLinks": [
          {
            "label": "Registro de Eventos (Ferramenta)",
            "route": "eventplaybook"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-10",
        "number": 10,
        "title": "Ciclo de Mercado Multi-Ativo",
        "subtitle": "Leitura independente de permissão para Ações B3, BDRs e FIIs.",
        "cover": "assets/manual-knowledge/marketcycle.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Ciclo de Mercado Multi-Ativo no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-marketcycle",
            "title": "10.1 Como Utilizar a Ferramenta",
            "content": "A tela **Ciclo de Mercado Multi-Ativo** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Ciclo de Mercado Multi-Ativo de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "marketcycle",
        "toolLabel": "Abrir Ciclo de Mercado →",
        "relatedLinks": [
          {
            "label": "Ciclo de Mercado (Ferramenta)",
            "route": "marketcycle"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-11",
        "number": 11,
        "title": "Líderes Emergentes",
        "subtitle": "Identificação dos ativos mais fortes e resilientes durante correções.",
        "cover": "assets/manual-knowledge/emergingleaders.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Líderes Emergentes no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-emergingleaders",
            "title": "11.1 Como Utilizar a Ferramenta",
            "content": "A tela **Líderes Emergentes** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Líderes Emergentes de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "emergingleaders",
        "toolLabel": "Abrir Líderes Emergentes →",
        "relatedLinks": [
          {
            "label": "Líderes Emergentes (Ferramenta)",
            "route": "emergingleaders"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-12",
        "number": 12,
        "title": "Força Relativa",
        "subtitle": "Ranking de liderança técnica em relação aos benchmarks do mercado.",
        "cover": "assets/manual-knowledge/relativestrength.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Força Relativa no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-relativestrength",
            "title": "12.1 Como Utilizar a Ferramenta",
            "content": "A tela **Força Relativa** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Força Relativa de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "relativestrength",
        "toolLabel": "Abrir Força Relativa →",
        "relatedLinks": [
          {
            "label": "Força Relativa (Ferramenta)",
            "route": "relativestrength"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-13",
        "number": 13,
        "title": "Análise Fundamentalista",
        "subtitle": "Score ponderado em 6 dimensões com CVM e SEC, onde dado ausente não é zero.",
        "cover": "assets/manual-knowledge/fundamentals.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Análise Fundamentalista no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-fundamentals",
            "title": "13.1 Como Utilizar a Ferramenta",
            "content": "A tela **Análise Fundamentalista** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Análise Fundamentalista de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "fundamentals",
        "toolLabel": "Abrir Fundamentalista →",
        "relatedLinks": [
          {
            "label": "Fundamentalista (Ferramenta)",
            "route": "fundamentals"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-14",
        "number": 14,
        "title": "Posições Abertas",
        "subtitle": "Gestão ativa da linha do tempo, trailing stops, parciais e scale-in.",
        "cover": "assets/manual-knowledge/positions.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Posições Abertas no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-positions",
            "title": "14.1 Como Utilizar a Ferramenta",
            "content": "A tela **Posições Abertas** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Posições Abertas de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "positions",
        "toolLabel": "Abrir Posições →",
        "relatedLinks": [
          {
            "label": "Posições (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-15",
        "number": 15,
        "title": "Portfolio Heat",
        "subtitle": "Termômetro de risco agregado da carteira contra o teto da política.",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Portfolio Heat no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-portfolioheat",
            "title": "15.1 Como Utilizar a Ferramenta",
            "content": "A tela **Portfolio Heat** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Portfolio Heat de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "portfolioheat",
        "toolLabel": "Abrir Portfolio Heat →",
        "relatedLinks": [
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-16",
        "number": 16,
        "title": "Política de Risco",
        "subtitle": "Quadro de calibração do Risk Budget (Grades A, B, C e D) e travas da conta.",
        "cover": "assets/manual-knowledge/riskpolicy.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Política de Risco no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-riskpolicy",
            "title": "16.1 Como Utilizar a Ferramenta",
            "content": "A tela **Política de Risco** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Política de Risco de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Abrir Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-17",
        "number": 17,
        "title": "Desafio Grade A (Modo Desapego)",
        "subtitle": "Treinamento de execução de 20 trades de alta confluência no sizing autorizado.",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Desafio Grade A (Modo Desapego) no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-couragechallenge",
            "title": "17.1 Como Utilizar a Ferramenta",
            "content": "A tela **Desafio Grade A (Modo Desapego)** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Desafio Grade A (Modo Desapego) de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "couragechallenge",
        "toolLabel": "Abrir Desafio Grade A →",
        "relatedLinks": [
          {
            "label": "Desafio Grade A (Ferramenta)",
            "route": "couragechallenge"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      },
      {
        "id": "livro-2-cap-18",
        "number": 18,
        "title": "Diário do Trader & IA",
        "subtitle": "Registro de notas técnicas/emocionais e exportação formatada para LLMs.",
        "cover": "assets/manual-knowledge/journal.jpg",
        "takeaways": [
          "Finalidade e papel da ferramenta Diário do Trader & IA no ecossistema operacional",
          "Como interpretar as métricas e indicadores exibidos na tela",
          "Boas práticas de uso diário e integração com as demais etapas do método",
          "Erros operacionais comuns a serem evitados durante a utilização"
        ],
        "sections": [
          {
            "id": "funcionalidade-journal",
            "title": "18.1 Como Utilizar a Ferramenta",
            "content": "A tela **Diário do Trader & IA** foi desenvolvida para apoiar o trader na etapa de governança e execução:\n- **Objetivo Central:** Fornecer dados claros e acionáveis para que você tome decisões embasadas em fatos, e não em impulsos.\n- **Integração:** Conecta-se automaticamente com a Política de Risco, o Ciclo de Mercado e a timeline de posições da carteira.\n- **Uso Recomendado:** Acesse regularmente como parte do seu checklist operacional antes de enviar qualquer ordem ao mercado."
          }
        ],
        "tip": "Mantenha a disciplina de utilizar a ferramenta Diário do Trader & IA de acordo com as regras estabelecidas na sua rotina diária.",
        "toolRoute": "journal",
        "toolLabel": "Abrir Diário do Trader →",
        "relatedLinks": [
          {
            "label": "Diário do Trader (Ferramenta)",
            "route": "journal"
          },
          {
            "label": "O Método (Livro 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-1"
          }
        ]
      }
    ]
  },
  {
    "id": "livro-3",
    "number": "03",
    "title": "O Método",
    "subtitle": "Estude os conceitos, regras e estratégias que fundamentam suas decisões",
    "cover": "assets/manual-knowledge/marketcycle.jpg",
    "description": "O núcleo conceitual do Trend Following sistemático: permissão de mercado, confluência de probabilidades, força relativa e gatilhos cirúrgicos.",
    "chapters": [
      {
        "id": "livro-3-cap-1",
        "number": 1,
        "title": "Visão Geral do Método",
        "subtitle": "Por que o Trend Following sistemático funciona há mais de um século",
        "cover": "assets/manual-knowledge/marketcycle.jpg",
        "takeaways": [
          "A distribuição assimétrica de retornos nos mercados financeiros",
          "Cortar perdas rapidamente e deixar os lucros correrem",
          "Por que uma taxa de acerto de 40% a 50% pode ser altamente lucrativa",
          "O papel da disciplina na captura das grandes tendências"
        ],
        "sections": [
          {
            "id": "fundamento-trend-following",
            "title": "1.1 A Assimetria do Trend Following",
            "content": "O Trend Following sistemático se baseia em uma lei imutável da dinâmica de preços: **o mercado se move em grandes tendências direcionais causadas por fluxo institucional e psicologia de manada.**\n\nEnquanto a maioria dos operadores busca estar certa na maioria das vezes (alta taxa de acerto com ganhos pequenos e perdas desastrosas), o Trend Follower aceita perdas pequenas e frequentes (1R) para capturar movimentos expressivos de 3R, 5R, 10R ou mais."
          }
        ],
        "tip": "Não tente adivinhar topos e fundos. Espere a tendência se instalar e surfe o movimento enquanto as médias móveis confirmarem a força compradora.",
        "toolRoute": "marketcycle",
        "toolLabel": "Consultar Ciclo de Mercado →",
        "relatedLinks": [
          {
            "label": "Ciclo de Mercado (Livro 3 Cap 3)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-3"
          },
          {
            "label": "Ciclo de Mercado (Ferramenta)",
            "route": "marketcycle"
          }
        ]
      },
      {
        "id": "livro-3-cap-2",
        "number": 2,
        "title": "Empilhamento de Probabilidades",
        "subtitle": "Vários edges independentes convergindo para uma única decisão",
        "cover": "assets/manual-knowledge/analytics.jpg",
        "takeaways": [
          "O conceito de confluência estatística",
          "Por que nenhum indicador técnico funciona isoladamente",
          "Como somar Força Relativa, Volume, Tendência e Base Contratada",
          "A matriz de pontuação da Trading Rubric"
        ],
        "sections": [
          {
            "id": "edge-stacking-conceito",
            "title": "2.1 O Princípio do Edge Stacking",
            "content": "Um único indicador (ex: rompimento de máxima) pode ter uma taxa de acerto de apenas 45%. Porém, quando você empilha:\n1. Mercado geral em Regime de Alta (Up)\n2. Ativo com Força Relativa acima de 85\n3. Contração prévia de volatilidade (volatility contraction)\n4. Volume institucional acima da média no rompimento\n5. Empresa com fundamentos sólidos e rentabilidade consistente\n\nA probabilidade conjunta de sucesso aumenta substancialmente, e o risco de um falso rompimento despenca. Esse é o cerne do **Empilhamento de Probabilidades**."
          }
        ],
        "tip": "Nunca opere um setup sem a presença de ao menos três edges convergentes no mesmo sentido.",
        "toolRoute": "newtrade",
        "toolLabel": "Avaliar Edge Stacking no Novo Trade →",
        "relatedLinks": [
          {
            "label": "Trading Rubric (Livro 3 Cap 8)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-8"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-3-cap-3",
        "number": 3,
        "title": "Ciclo de Mercado",
        "subtitle": "Regimes Up, Down e Transição em múltiplos mercados",
        "cover": "assets/manual-knowledge/marketcycle.jpg",
        "takeaways": [
          "Os três regimes de mercado do Healthy Trend Trader",
          "Regime Down: capital protegido e bloqueio de novas compras",
          "Regime de Transição: cautela, lotes menores e foco em líderes",
          "Regime Up: autorização plena com risco calibrado",
          "Independência multi-mercado: Ações B3, BDRs internacionais e FIIs"
        ],
        "sections": [
          {
            "id": "regimes-mercado",
            "title": "3.1 A Dinâmica dos Três Regimes",
            "content": "A tela Ciclo de Mercado avalia o comportamento dos principais índices (IBOV, BDRX, IFIX) em relação às suas médias móveis e momentum:\n- **Regime UP (Verde):** Tendência de alta confirmada. Permissão total para operar setups de alta qualidade.\n- **Regime TRANSIÇÃO (Amarelo):** Mercado incerto ou corrigindo. Favorece preparação e posições mais conservadoras.\n- **Regime DOWN (Vermelho):** Tendência de baixa ou deterioração severa. **Bloqueio total de novas compras longas.** Protege você de tentar pescar fundos."
          }
        ],
        "tip": "Em Regime Down, o melhor trade é não fazer nenhum trade. O dinheiro economizado durante quedas é o que alimenta os grandes lucros na retomada do mercado.",
        "toolRoute": "marketcycle",
        "toolLabel": "Abrir Ciclo de Mercado →",
        "relatedLinks": [
          {
            "label": "Central de Mercado (Ferramenta)",
            "route": "marketcentral"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-3-cap-4",
        "number": 4,
        "title": "Contexto Diário",
        "subtitle": "Tendência, volatilidade e localização estrutural dos preços",
        "cover": "assets/manual-knowledge/today.jpg",
        "takeaways": [
          "O alinhamento das médias móveis exponenciais (EMA 9 e EMA 21)",
          "Identificação de suportes, resistências e topos históricos",
          "A importância de comprar próximo às médias, e não esticado",
          "A relação de distância do stop em relação à volatilidade atual"
        ],
        "sections": [
          {
            "id": "leitura-contexto",
            "title": "4.1 Leitura Técnica Estrutural",
            "content": "Mesmo em um mercado em alta, comprar um ativo longe das suas médias móveis é um erro grave de contexto. O preço tende a regredir à média antes de prosseguir.\nO Contexto Diário ideal exige:\n1. Média móvel rápida (EMA 9) apontando para cima e acima da média intermediária (EMA 21).\n2. O preço consolidando lateralmente ou corrigindo de forma ordenada (baixo volume).\n3. O gatilho de entrada ocorrendo com stop curto próximo a um suporte relevante."
          }
        ],
        "tip": "Não compre papéis esticados. Se o ativo subiu 15% nos últimos 3 dias sem respirar, espere uma contração ou procure outro líder.",
        "toolRoute": "charts",
        "toolLabel": "Analisar Gráficos Diários →",
        "relatedLinks": [
          {
            "label": "Gráficos (Ferramenta)",
            "route": "charts"
          },
          {
            "label": "Volatilidade / ATR (Livro 3 Cap 7)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-7"
          }
        ]
      },
      {
        "id": "livro-3-cap-5",
        "number": 5,
        "title": "Força Relativa",
        "subtitle": "Identificando os ativos mais fortes do mercado",
        "cover": "assets/manual-knowledge/relativestrength.jpg",
        "takeaways": [
          "O que é Força Relativa",
          "Por que ela é importante",
          "Como utilizar na prática",
          "Como interpretar os resultados",
          "Exemplos reais",
          "Erros comuns e cuidados"
        ],
        "sections": [
          {
            "id": "o-que-e",
            "title": "5.1 O que é",
            "content": "A **Força Relativa (RS)** mede o desempenho de um ativo em relação ao seu índice de referência (como o Ibovespa ou S&P 500), permitindo identificar os ativos líderes e priorizar as melhores oportunidades.\n\nNão confunda Força Relativa (RS - Mansfield/O'Neil) com o indicador oscilador IFR (RSI). Enquanto o RSI mede a velocidade das variações de preço do próprio ativo em uma escala de 0 a 100, a Força Relativa avalia **quem está performando melhor do que o mercado geral** em uma janela de 3 a 6 meses."
          },
          {
            "id": "como-utilizar",
            "title": "5.2 Como utilizar",
            "content": "A Força Relativa no Healthy Trend Trader é apresentada com base no desempenho dos últimos 3 meses (3M), permitindo identificar rapidamente os ativos que estão liderando o mercado.\n\n### Passo a passo operacional:\n1. **Acesse a ferramenta:** Abra a tela Força Relativa no menu Análise de Mercado.\n2. **Analise o ranking:** Utilize os filtros disponíveis para encontrar os ativos com maior RS (percentil 80+).\n3. **Confirme com o gráfico Diário:** Verifique se o ativo também apresenta tendência de alta no gráfico Diário (preço > EMA 10 > EMA 72).\n4. **Procure o gatilho de entrada:** Aguarde um dos cinco gatilhos de entrada para executar a operação."
          },
          {
            "id": "leitura-interpretacao",
            "title": "5.3 Leitura e interpretação",
            "content": "No ranking de RS da plataforma:\n- **RS 90 a 100 (Líder Absoluto):** O ativo supera 90% de todo o universo monitorado. São os primeiros a subir quando o mercado vira para alta e os que menos caem nas correções.\n- **RS 70 a 89 (Forte):** Ativos com tendência saudável e boa tração compradora.\n- **RS 50 a 69 (Neutro):** Andando em linha com o índice benchmark; sem edge de liderança.\n- **RS Abaixo de 50 (Fraco):** Performer inferior; evite compras, pois tenderão a desabar se o mercado corrigir."
          },
          {
            "id": "exemplos-praticos",
            "title": "5.4 Exemplos práticos",
            "content": "Durante uma correção do Ibovespa de -5%, se a ação WEGE3 cair apenas -0,8% ou fechar em alta de +1,2%, sua linha de RS disparará para cima. Isso sinaliza acumulação institucional ativa. Quando o índice geral estancar a queda e armar repique, esse papel romperá máximas com velocidade explosiva."
          },
          {
            "id": "erros-comuns",
            "title": "5.5 Erros comuns",
            "content": "1. **Comprar apenas pelo RS alto:** RS alto é um filtro de seleção, não um gatilho de compra. Nunca compre um ativo esticado longe das médias móveis só porque seu RS é 98.\n2. **Ignorar o Ciclo de Mercado:** Mesmo líderes caem em mercados de urso generalizado (Regime Down). A permissão do mercado sempre vem primeiro.\n3. **Comprar ativos com RS em queda livre:** Se um ativo outrora líder perde a média de RS e passa a cair mais que o índice, corte a posição."
          }
        ],
        "tip": "Priorize ativos com RS acima de 80 e dê maior peso para aqueles com RS entre 90 e 100.",
        "toolRoute": "relativestrength",
        "toolLabel": "Ver critérios de Grade →",
        "relatedLinks": [
          {
            "label": "Força Relativa (Ferramenta)",
            "route": "relativestrength"
          },
          {
            "label": "Ciclo de Mercado",
            "route": "marketcycle"
          },
          {
            "label": "Trading Rubric",
            "bookId": "livro-4",
            "chapterId": "livro-4-cap-2"
          },
          {
            "label": "Cinco Gatilhos de Entrada",
            "bookId": "livro-4",
            "chapterId": "livro-4-cap-15"
          }
        ]
      },
      {
        "id": "livro-3-cap-6",
        "number": 6,
        "title": "Fundamentos em 6 Dimensões",
        "subtitle": "CVM, SEC e a regra: dado ausente não é zero",
        "cover": "assets/manual-knowledge/fundamentals.jpg",
        "takeaways": [
          "As 6 dimensões ponderadas: Rentabilidade, Consistência, Crescimento, Endividamento, Valuation e Dividendos",
          "A integração oficial com dados abertos da CVM e da SEC para BDRs",
          "A métrica de Cobertura dos Dados e o princípio de reponderação justa",
          "Como os fundamentos funcionam como um filtro de qualidade no setup"
        ],
        "sections": [
          {
            "id": "score-fundamentalista",
            "title": "6.1 O Score Fundamentalista",
            "content": "O Score Fundamentalista do Healthy Trend Trader (0 a 10) segue uma metodologia estrita em 6 dimensões:\n- **Rentabilidade (28%):** ROE, ROIC e Margem Líquida.\n- **Consistência de Lucros (22%):** Histórico de lucro operacional sem prejuízos recorrentes.\n- **Crescimento (16%):** Expansão de receitas e lucros nos últimos 5 anos.\n- **Endividamento (18%):** Dívida Líquida / EBITDA e Liquidez Corrente.\n- **Valuation (10%):** P/L e EV/EBITDA em relação ao histórico.\n- **Dividendos (6%):** Dividend Yield e regularidade de proventos.\n\n**Princípio inegociável: dado ausente não é zero.** Quando um dado não está disponível para empresas recentes ou BDRs, o sistema repondera matematicamente as dimensões existentes e exibe a Cobertura dos Dados (ex: 85%)."
          }
        ],
        "tip": "Empresas lucrativas e pouco endividadas têm menor probabilidade de gap de baixa violento contra a sua posição. Use os fundamentos como proteção.",
        "toolRoute": "fundamentals",
        "toolLabel": "Pesquisar Ativo em Fundamentos →",
        "relatedLinks": [
          {
            "label": "Análise Fundamentalista (Ferramenta)",
            "route": "fundamentals"
          }
        ]
      },
      {
        "id": "livro-3-cap-7",
        "number": 7,
        "title": "Volatilidade e ATR",
        "subtitle": "Medindo o risco real do ativo através do Average True Range",
        "cover": "assets/manual-knowledge/riskpolicy.jpg",
        "takeaways": [
          "O que é o Average True Range (ATR de 14 ou 20 períodos)",
          "Por que o percentual de queda não é uma medida confiável de risco",
          "Como o ATR impede posições desproporcionais em ativos voláteis",
          "A distância do stop técnico em múltiplos de ATR"
        ],
        "sections": [
          {
            "id": "atr-explicado",
            "title": "7.1 Compreendendo o ATR",
            "content": "O **Average True Range (ATR)** mede a amplitude média diária de negociação de um ativo, considerando inclusive os gaps de abertura.\nUm ativo que oscila R$ 5,00 por dia exige um distanciamento e um dimensionamento completamente diferente de um ativo estável que oscila R$ 0,50 por dia.\n\nNo Healthy Trend Trader, o ATR atua como um dos **três limitadores obrigatórios de posição:** se a volatilidade do papel for excessiva para o tamanho da sua conta, o sistema reduz automaticamente a quantidade autorizada de ações."
          }
        ],
        "tip": "Nunca coloque o stop técnico em uma distância menor do que 0,8x ATR do ativo. Isso garante que o ruído normal do pregão não violinhe você precocemente.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Consultar Limites de ATR na Política →",
        "relatedLinks": [
          {
            "label": "Position Sizing (Livro 3 Cap 10)",
            "bookId": "livro-3",
            "chapterId": "livro-3-cap-10"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-3-cap-8",
        "number": 8,
        "title": "Trading Rubric",
        "subtitle": "A matriz científica de 100 pontos para classificação da oportunidade",
        "cover": "assets/manual-knowledge/analytics.jpg",
        "takeaways": [
          "Como funciona a escala de 100 pontos da Rubric",
          "Critérios críticos e Quality Gates que eliminam trades fracos",
          "Grades A+, A, B, C e D e o respectivo risco liberado",
          "Por que Grade D bloqueia o trade com risco financeiro zero (0%)"
        ],
        "sections": [
          {
            "id": "rubric-funcionamento",
            "title": "8.1 O Funcionamento da Rubric",
            "content": "A Trading Rubric substitui o \"achismo\" por um scorecard objetivo:\n- **Grade A+ (95 a 100 pontos):** Rare Trade com confluência máxima e excelência em todos os critérios.\n- **Grade A (85 a 94 pontos):** High Quality. Setup de primeira linha, autoriza o Risk Budget pleno.\n- **Grade B (70 a 84 pontos):** Good Edge. Setup sólido com pequenas imperfeições contextuais; autoriza risco reduzido.\n- **Grade C (50 a 69 pontos):** Small Edge. Risco mínimo apenas para aprendizado.\n- **Grade D (< 50 pontos ou falha em Gate Crítico):** No Edge. **Bloqueio automático.** O trade não pode ser realizado."
          }
        ],
        "tip": "A Rubric protege você de si mesmo. Quando a vontade de operar for grande mas a pontuação resultar em Grade D, aceite o aviso do software e fique de fora.",
        "toolRoute": "newtrade",
        "toolLabel": "Calcular Rubric no Novo Trade →",
        "relatedLinks": [
          {
            "label": "Livro 4: Grading & Bet Sizing",
            "bookId": "livro-4",
            "chapterId": "livro-4-cap-1"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-3-cap-9",
        "number": 9,
        "title": "Quatro Gatilhos de Entrada",
        "subtitle": "Inside Bar, PFR, 1-2-3 e Barra Vermelha Ignorada (RBI)",
        "cover": "assets/manual-knowledge/newtrade.jpg",
        "takeaways": [
          "Por que um setup precisa de um gatilho de execução claro e objetivo",
          "Os 4 gatilhos oficiais rastreados pelo Healthy Trend Trader",
          "Onde posicionar a ordem start de compra e o stop técnico de perda",
          "A regra da barra de confirmação e a tolerância de rompimento"
        ],
        "sections": [
          {
            "id": "visao-geral-gatilhos",
            "title": "9.1 O Papel dos Gatilhos Técnicos",
            "content": "Um gatilho de entrada é a faísca que aciona a operação. Ele transforma a ideia de trade em um plano milimétrico de execução:\n1. **Inside Bar:** Contração de volatilidade com barra contida. Ativação no rompimento da máxima (+0,01). **Regra Obrigatória do Método:** NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe).\n2. **PFR (Preço de Fechamento de Reversão):** Barra que faz a menor mínima do movimento corretivo mas fecha acima do fechamento anterior.\n3. **1-2-3 de Compra:** Pivô clássico de reversão de correção em direção à tendência principal.\n4. **RBI (Barra Vermelha Ignorada):** Forte candle de convicção compradora superando a máxima da barra vermelha corretiva."
          }
        ],
        "tip": "Nunca compre antes da máxima do gatilho ser superada. Comprar adiantado para economizar centavos é uma das maiores causas de stop em falso pivô.",
        "toolRoute": "newtrade",
        "toolLabel": "Ver Gatilhos no Novo Trade →",
        "relatedLinks": [
          {
            "label": "Livro 5: Gatilhos de Entrada",
            "bookId": "livro-5",
            "chapterId": "livro-5-cap-1"
          },
          {
            "label": "Gráficos (Ferramenta)",
            "route": "charts"
          }
        ]
      },
      {
        "id": "livro-3-cap-10",
        "number": 10,
        "title": "Position Sizing (Dimensionamento)",
        "subtitle": "Os três limitadores matemáticos: Stop Risk, ATR e Capital",
        "cover": "assets/manual-knowledge/riskpolicy.jpg",
        "takeaways": [
          "Como converter o percentual de risco da Rubric em lotes de ações",
          "A fórmula matemática do risco por stop",
          "Por que a menor quantidade entre os três limitadores sempre prevalece",
          "O impacto do dimensionamento correto na sobrevivência a longo prazo"
        ],
        "sections": [
          {
            "id": "tres-limitadores",
            "title": "10.1 A Lei do Menor Limitador",
            "content": "O sistema calcula três quantidades concorrentes para o seu trade:\n1. **Quantidade por Risco de Stop (N1):**\n   `N1 = Risco Financeiro Autorizado / (Preço de Entrada - Preço de Stop)`\n2. **Quantidade por Volatilidade ATR (N2):**\n   Limita a exposição para que uma oscilação comum de ATR não ultrapasse o risco da conta.\n3. **Quantidade por Limite de Capital (N3):**\n   Garante que uma única posição não ocupe uma fatia excessiva do patrimônio total da carteira (ex: máx 20%).\n\n**Regra inegociável:** A quantidade autorizada final é sempre a **menor (mais conservadora)** entre N1, N2 e N3."
          }
        ],
        "tip": "Se a quantidade pelo stop foi de 1.000 ações mas o limite de capital reduziu para 600 ações, respeite as 600. Isso impede que sua carteira fique sobreconcentrada.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ajustar Política de Sizing →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-3-cap-11",
        "number": 11,
        "title": "Portfolio Heat & Ongoing Risk",
        "subtitle": "O controle do calor agregado e do risco em aberto da carteira",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "A diferença fundamental entre Risco Inicial e Ongoing Risk",
          "Como o avanço do stop reduz o risco em aberto para zero (Breakeven)",
          "O conceito de Portfolio Heat (risco total somado de todas as posições)",
          "O teto de calor da carteira como barreira contra catástrofes"
        ],
        "sections": [
          {
            "id": "heat-conceito",
            "title": "11.1 Gerenciando o Risco em Aberto",
            "content": "O **Ongoing Risk** é a distância entre a cotação atual e o stop atual, multiplicada pela quantidade que ainda permanece aberta.\nQuando você entra em um trade arriscando R$ 1.000,00, seu Ongoing Risk é R$ 1.000,00. Quando o ativo sobe e você move o stop para o ponto de entrada (Breakeven), o seu Ongoing Risk daquele trade cai para **R$ 0,00**.\n\nO **Portfolio Heat** é a soma do Ongoing Risk de todas as posições abertas na carteira dividida pelo patrimônio. Se o seu limite de Heat for 6%, você só pode abrir novos trades se houver folga nesse teto."
          }
        ],
        "tip": "Mover stops para o Breakeven conforme o trade anda não serve apenas para proteger o lucro: serve para liberar folga no Portfolio Heat e permitir a abertura do próximo líder.",
        "toolRoute": "portfolioheat",
        "toolLabel": "Consultar Portfolio Heat →",
        "relatedLinks": [
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          },
          {
            "label": "Posições (Ferramenta)",
            "route": "positions"
          }
        ]
      },
      {
        "id": "livro-3-cap-12",
        "number": 12,
        "title": "Peel-Off (Redução de Risco)",
        "subtitle": "A desalavancagem inteligente quando a exposição excede os limites",
        "cover": "assets/manual-knowledge/positions.jpg",
        "takeaways": [
          "O que é Peel-Off e por que ele não é uma realização de lucro comum",
          "Quando o mercado se deteriora mas o stop técnico ainda não foi acionado",
          "Como calcular a redução proporcional da posição",
          "O alívio imediato no risco consolidado da conta"
        ],
        "sections": [
          {
            "id": "peel-off-regra",
            "title": "12.1 A Mecânica do Peel-Off",
            "content": "O **Peel-Off** é uma redução cirúrgica de lote acionada quando o Ongoing Risk da posição ou o Portfolio Heat da carteira ultrapassam os limites toleráveis da sua política.\nEm vez de liquidar toda a posição e desistir de uma boa tendência, o trader vende uma fração das ações para recolocar o risco monetário dentro dos padrões de segurança do método."
          }
        ],
        "tip": "Peel-Off é disciplina pura. Não espere o mercado violar o stop com prejuízo máximo se a estrutura técnica começou a falhar.",
        "toolRoute": "positions",
        "toolLabel": "Gerenciar Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Livro 6: Gestão da Posição",
            "bookId": "livro-6",
            "chapterId": "livro-6-cap-3"
          }
        ]
      },
      {
        "id": "livro-3-cap-13",
        "number": 13,
        "title": "Scale-In (Adição de Risco Zero)",
        "subtitle": "Adicionando a posições vencedoras apenas com stop no Breakeven",
        "cover": "assets/manual-knowledge/newtrade.jpg",
        "takeaways": [
          "A regra inegociável da pirâmide: só adicionar a trades lucrativos",
          "A exigência de lucro de no mínimo +1R na posição original",
          "A obrigatoriedade do stop inicial já estar elevado para o Breakeven",
          "Como recalcular o preço médio sem aumentar o risco financeiro total"
        ],
        "sections": [
          {
            "id": "scale-in-regra",
            "title": "13.1 Como Funciona o Scale-In Saudável",
            "content": "A maioria dos operadores perdedores adiciona lotes a posições perdedoras na tentativa vã de abaixar o preço médio (preço médio contra a tendência). No Healthy Trend Trader, isso é terminantemente proibido.\n\nO **Scale-In** é o oposto: **é a arte de adicionar a posições altamente lucrativas.**\nRequisitos obrigatórios do sistema:\n1. O trade inicial deve estar apresentando lucro de pelo menos **+1R**.\n2. O stop da posição inicial deve estar no **Breakeven** ou acima (risco financeiro inicial zerado).\n3. O novo lote adicionado deve ter seu próprio stop técnico definido.\n4. O risco somado de toda a posição após a adição não pode violar a política."
          }
        ],
        "tip": "Nunca adicione a uma posição perdedora. Se o trade está perdendo, o mercado está provando que você está errado; preserve seu capital.",
        "toolRoute": "positions",
        "toolLabel": "Gerenciar Posições →",
        "relatedLinks": [
          {
            "label": "Posições (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Livro 6: Gestão da Posição",
            "bookId": "livro-6",
            "chapterId": "livro-6-cap-4"
          }
        ]
      },
      {
        "id": "livro-3-cap-14",
        "number": 14,
        "title": "Risk Ramp-Up",
        "subtitle": "A evolução gradual da exposição para proteger o capital em crescimento",
        "cover": "assets/manual-knowledge/riskpolicy.jpg",
        "takeaways": [
          "O que é o perfil operacional Risk Ramp-Up",
          "A limitação a no máximo 3 posições simultâneas",
          "A proteção contra o excesso de confiança e euforia",
          "Como fazer a transição gradual para o Perfil Padrão"
        ],
        "sections": [
          {
            "id": "ramp-up-conceito",
            "title": "14.1 O Perfil Risk Ramp-Up",
            "content": "O **Risk Ramp-Up** é uma modalidade conservadora de operação desenhada para traders iniciantes, contas recém-criadas ou operadores saindo de um período de drawdown no Rebuild Mode.\nEm vez de permitir 6 posições simultâneas, ele limita a carteira a **3 posições no máximo**, forçando uma seleção cirúrgica de ativos e eliminando a sobrecarga de atenção."
          }
        ],
        "tip": "Se você estiver com dificuldade de acompanhar muitas posições, alterne para o Risk Ramp-Up na Política de Risco e opere com tranquilidade.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Consultar Perfis de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Missão / Rebuild (Ferramenta)",
            "route": "mission"
          }
        ]
      },
      {
        "id": "livro-3-cap-15",
        "number": 15,
        "title": "Modo Fora do Mercado (Market Pause)",
        "subtitle": "A blindagem voluntária contra drawdowns e espirais emocionais",
        "cover": "assets/manual-knowledge/settings.jpg",
        "takeaways": [
          "O que é a Market Pause e como ativá-la em Configurações",
          "O bloqueio deliberado da criação de novas ordens por 2 a 5 dias",
          "A preservação do capital após sequências de stops",
          "A recuperação da clareza mental e o retorno sereno à rotina"
        ],
        "sections": [
          {
            "id": "market-pause-conceito",
            "title": "15.1 A Sabedoria da Pausa Deliberada",
            "content": "No mercado financeiro, a urgência de \"recuperar\" o dinheiro perdido é a causa número um de ruína. Quando um trader toma stops consecutivos, seu estado fisiológico entra em alerta (resposta de luta ou fuga), comprometendo a tomada de decisão racional.\n\nO **Modo Fora do Mercado (Market Pause)** é uma funcionalidade que bloqueia temporariamente a tela de Novo Trade pelo prazo estipulado pelo próprio usuário (ex: 3 dias). Durante a pausa, você pode estudar, acompanhar o mercado no diário e praticar no Trader Zen, mas fica blindado de operar no calor da emoção."
          }
        ],
        "tip": "Traders lendários como Jesse Livermore afirmavam que o grande dinheiro é feito na espera, e não na ação constante. Aprenda a não fazer nada.",
        "toolRoute": "settings",
        "toolLabel": "Ativar Modo Fora do Mercado →",
        "relatedLinks": [
          {
            "label": "Configurações (Ferramenta)",
            "route": "settings"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          }
        ]
      },
      {
        "id": "livro-3-cap-16",
        "number": 16,
        "title": "As Sete Regras de Ouro",
        "subtitle": "Princípios inegociáveis de sobrevivência, consistência e disciplina",
        "cover": "assets/manual-knowledge/traderrules.jpg",
        "takeaways": [
          "Regra 1: O mercado sempre tem razão",
          "Regra 2: Nunca opere sem stop pré-definido no sistema",
          "Regra 3: Nunca arrisque mais do que a sua política autoriza",
          "Regra 4: Jamais adicione a uma posição perdedora",
          "Regra 5: Proteja o capital em primeiro lugar, busque retorno em segundo",
          "Regra 6: Aceite o resultado de cada trade como uma amostra probabilística",
          "Regra 7: A consistência mora na disciplina mecânica de execução"
        ],
        "sections": [
          {
            "id": "as-7-regras",
            "title": "16.1 O Código de Honra do Trader",
            "content": "As **7 Regras de Ouro** são a constituição do Healthy Trend Trader. Cada regra foi forjada após décadas de observação empírica dos erros que destroem carteiras:\n1. **O mercado é soberano:** Não discuta com as cotações nem tente provar que o mercado está errado.\n2. **Stop inegociável:** Ordem de stop é definida antes da compra e nunca é afastada para baixo.\n3. **Respeito ao Risk Budget:** O Grade define o risco; a política estabelece o teto.\n4. **Sem preço médio perdedor:** Lotes só aumentam quando o trade já provou que está certo (+1R).\n5. **Defesa precede ataque:** Quem protege o capital sobrevive para colher o próximo ciclo de alta.\n6. **Mente probabilística:** Um stop não faz de você um mau operador, assim como um ganho não faz de você um gênio.\n7. **Processo acima do resultado financeiro:** Avalie seu dia pela fidelidade às regras, e os lucros serão uma consequência natural."
          }
        ],
        "tip": "Imprima as 7 Regras de Ouro e cole ao lado do seu monitor de operações. Releia antes de cada abertura de mercado.",
        "toolRoute": "traderrules",
        "toolLabel": "Abrir Regras do Trader →",
        "relatedLinks": [
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          },
          {
            "label": "Sabedoria do Trader (Ferramenta)",
            "route": "wisdom"
          }
        ]
      }
    ]
  },
  {
    "id": "livro-4",
    "number": "04",
    "title": "Grading & Bet Sizing System",
    "subtitle": "Trading Rubric de 100 pontos e o método de três camadas",
    "cover": "assets/manual-knowledge/couragechallenge.jpg",
    "description": "Como calcular matematicamente o risco exato de cada operação com base na qualidade do contexto e na preservação de capital.",
    "chapters": [
      {
        "id": "livro-4-cap-1",
        "number": 1,
        "title": "A Filosofia da Assimetria Positiva",
        "subtitle": "Por que dimensionar posições por qualidade supera qualquer palpite",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de A Filosofia da Assimetria Positiva",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-1",
            "title": "1.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-2",
        "number": 2,
        "title": "A Trading Rubric de 100 Pontos",
        "subtitle": "A régua quantitativa que avalia a confluência de edges em cada trade",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de A Trading Rubric de 100 Pontos",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-2",
            "title": "2.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-3",
        "number": 3,
        "title": "Critérios Críticos & Quality Gates",
        "subtitle": "As condições eliminatórias que invalidam a operação instantaneamente",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Critérios Críticos & Quality Gates",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-3",
            "title": "3.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-4",
        "number": 4,
        "title": "Grade A+ (Rare Trade com Confluência Máxima)",
        "subtitle": "Oportunidades raras (score 95+) com todas as dimensões perfeitas",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Grade A+ (Rare Trade com Confluência Máxima)",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-4",
            "title": "4.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-5",
        "number": 5,
        "title": "Grade A (Alta Qualidade Técnica)",
        "subtitle": "O padrão profissional de excelência operacional (score 85-94)",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Grade A (Alta Qualidade Técnica)",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-5",
            "title": "5.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-6",
        "number": 6,
        "title": "Grade B (Good Edge / Risco Nominal)",
        "subtitle": "Operações saudáveis com risco nominal balanceado (score 70-84)",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Grade B (Good Edge / Risco Nominal)",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-6",
            "title": "6.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-7",
        "number": 7,
        "title": "Grade C (Small Edge / Risco Reduzido)",
        "subtitle": "Setups marginais que exigem capital reduzido (score 50-69)",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Grade C (Small Edge / Risco Reduzido)",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-7",
            "title": "7.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-8",
        "number": 8,
        "title": "Grade D (No Edge / Bloqueio Nominal Zero)",
        "subtitle": "Operações medíocres com bloqueio automático pelo sistema",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Grade D (No Edge / Bloqueio Nominal Zero)",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-8",
            "title": "8.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-9",
        "number": 9,
        "title": "O Conceito de Risk Budget",
        "subtitle": "Como a Política de Risco determina o teto percentual para cada Grade",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de O Conceito de Risk Budget",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-9",
            "title": "9.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-10",
        "number": 10,
        "title": "O Método de Três Camadas",
        "subtitle": "As três barreiras matemáticas que calculam a quantidade executável",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de O Método de Três Camadas",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-10",
            "title": "10.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-11",
        "number": 11,
        "title": "Camada 1: Risco pelo Stop Técnico",
        "subtitle": "A distância monetária até o ponto de invalidação gráfica",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Camada 1: Risco pelo Stop Técnico",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-11",
            "title": "11.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-12",
        "number": 12,
        "title": "Camada 2: Volatilidade por ATR",
        "subtitle": "Ajustando a mão à volatilidade histórica de 21 pregões do ativo",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Camada 2: Volatilidade por ATR",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-12",
            "title": "12.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-13",
        "number": 13,
        "title": "Camada 3: Limite de Capital por Posição",
        "subtitle": "Teto financeiro para impedir concentração excessiva na carteira",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Camada 3: Limite de Capital por Posição",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-13",
            "title": "13.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-14",
        "number": 14,
        "title": "A Menor Quantidade Sempre Vence",
        "subtitle": "Por que o conservadorismo matemático garante longevidade ao operador",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de A Menor Quantidade Sempre Vence",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-14",
            "title": "14.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-15",
        "number": 15,
        "title": "Os 4 Gatilhos Oficiais de Entrada",
        "subtitle": "Inside Bar, PFR, 1-2-3 e RBI com stops estruturais",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Os 4 Gatilhos Oficiais de Entrada",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-15",
            "title": "15.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      },
      {
        "id": "livro-4-cap-16",
        "number": 16,
        "title": "Validação Pré-Execução e Risco Executável",
        "subtitle": "O checklist final antes de enviar a ordem à corretora",
        "cover": "assets/manual-knowledge/couragechallenge.jpg",
        "takeaways": [
          "Fundamento matemático e conceitual de Validação Pré-Execução e Risco Executável",
          "Aplicação prática no motor de dimensionamento do Healthy Trend Trader",
          "Como a política de risco protege o patrimônio contra drawdowns severos",
          "Exemplos de cálculo e regras inegociáveis de governança"
        ],
        "sections": [
          {
            "id": "sec-16",
            "title": "16.1 Princípio e Aplicação",
            "content": "O dimensionamento de posições no Healthy Trend Trader não é aleatório nem baseado em convicção subjetiva:\n- **Base Técnica:** O cálculo une o valor do stop gráfico ao ATR da volatilidade e ao teto de capital da carteira.\n- **Risco Nominal por Grade:** Cada oportunidade é avaliada pela Trading Rubric de 100 pontos, determinando se a mão será cheia (Grade A), reduzida (Grade B/C) ou nula (Grade D).\n- **Execução:** O sistema seleciona a **menor quantidade** entre as três camadas, eliminando qualquer risco de ruína financeira."
          }
        ],
        "tip": "Nunca altere o lote para tentar recuperar uma perda anterior. O tamanho da mão deve refletir exclusivamente a qualidade da oportunidade atual e as regras da sua política.",
        "toolRoute": "riskpolicy",
        "toolLabel": "Ver Política de Risco →",
        "relatedLinks": [
          {
            "label": "Política de Risco (Ferramenta)",
            "route": "riskpolicy"
          },
          {
            "label": "Novo Trade (Ferramenta)",
            "route": "newtrade"
          }
        ]
      }
    ]
  },
  {
    "id": "livro-5",
    "number": "05",
    "title": "Gestão de Risco e Posições",
    "subtitle": "Stop inegociável, condução, parciais e proteção da carteira",
    "cover": "assets/manual-knowledge/portfolioheat.jpg",
    "description": "Regras rigorosas para conduzir posições lucrativas, mover o stop para breakeven, realizar em força e proteger o portfólio contra drawdowns.",
    "chapters": [
      {
        "id": "livro-5-cap-1",
        "number": 1,
        "title": "O Ciclo de Vida de uma Posição",
        "subtitle": "Da entrada programada à saída final sem apego emocional",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de O Ciclo de Vida de uma Posição na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-1",
            "title": "1.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-2",
        "number": 2,
        "title": "O Stop Inicial Inegociável",
        "subtitle": "O ponto exato onde a tese técnica foi invalidada pelo mercado",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de O Stop Inicial Inegociável na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-2",
            "title": "2.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-3",
        "number": 3,
        "title": "Linha do Tempo e Registro de Eventos",
        "subtitle": "Auditoria completa de entradas, ajustes, parciais e encerramento",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Linha do Tempo e Registro de Eventos na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-3",
            "title": "3.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-4",
        "number": 4,
        "title": "Condução com Médias Móveis (EMA 10 e EMA 72)",
        "subtitle": "O método clássico de condução de tendência sem ansiedade",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Condução com Médias Móveis (EMA 10 e EMA 72) na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-4",
            "title": "4.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-5",
        "number": 5,
        "title": "Movendo o Stop para Breakeven (+1R)",
        "subtitle": "Como zerar o risco financeiro do trade na primeira expansão",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Movendo o Stop para Breakeven (+1R) na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-5",
            "title": "5.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-6",
        "number": 6,
        "title": "Sell Into Strength: Parciais a 2R e 3R",
        "subtitle": "A realização parcial calculada para garantir lucro e tranquilidade",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Sell Into Strength: Parciais a 2R e 3R na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-6",
            "title": "6.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-7",
        "number": 7,
        "title": "Peel-Off: Redução Extraordinária de Risco",
        "subtitle": "A proteção ativada quando o Ongoing Risk excede a tolerância",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Peel-Off: Redução Extraordinária de Risco na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-7",
            "title": "7.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-8",
        "number": 8,
        "title": "Scale-In: O Conceito de Adição de Risco Zero",
        "subtitle": "Adicionando lotes apenas em posições vencedoras sem aumentar o risco",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Scale-In: O Conceito de Adição de Risco Zero na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-8",
            "title": "8.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-9",
        "number": 9,
        "title": "Condições e Travas do Scale-In (+1R e Stop no Lucro)",
        "subtitle": "Os requisitos técnicos inegociáveis para autorizar novas adições",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Condições e Travas do Scale-In (+1R e Stop no Lucro) na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-9",
            "title": "9.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-10",
        "number": 10,
        "title": "Preço Médio Ponderado e Cálculo de R-Múltiplo",
        "subtitle": "Auditoria matemática do retorno real sem diluição de payoff",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Preço Médio Ponderado e Cálculo de R-Múltiplo na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-10",
            "title": "10.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-11",
        "number": 11,
        "title": "Portfolio Heat Dinâmico da Carteira",
        "subtitle": "O sensor de risco acumulado em aberto contra o capital total",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Portfolio Heat Dinâmico da Carteira na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-11",
            "title": "11.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-12",
        "number": 12,
        "title": "Modo Fora do Mercado (Market Pause)",
        "subtitle": "A proteção automática para momentos de turbulência ou viagens",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Modo Fora do Mercado (Market Pause) na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-12",
            "title": "12.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      },
      {
        "id": "livro-5-cap-13",
        "number": 13,
        "title": "Encerramento Total e Registro de Lições",
        "subtitle": "Como fechar a posição com calma e registrar o aprendizado no diário",
        "cover": "assets/manual-knowledge/portfolioheat.jpg",
        "takeaways": [
          "Papel fundamental de Encerramento Total e Registro de Lições na condução profissional do trade",
          "Como os algoritmos da plataforma monitoram e alertam sobre ajustes necessários",
          "Preservação do payoff positivo da estratégia ao longo de múltiplos ciclos",
          "Checklist prático de tomada de decisão sem estresse intradiário"
        ],
        "sections": [
          {
            "id": "sec-13",
            "title": "13.1 Diretrizes de Gestão",
            "content": "A condução de posições no Healthy Trend Trader baseia-se em regras estritas:\n- **Respeito ao Stop:** O stop inicial nunca é movido para trás. Ele apenas avança a favor da tendência conforme novas estruturas se formam.\n- **Stop Técnico por Gatilho (Regra Inegociável para Inside Bar):** Para o gatilho Inside Bar, NUNCA posicionar o stop no mesmo candle que dispara o trade. O stop inicial sempre deve ficar 0,01 centavo abaixo da mínima do CANDLE ANTERIOR ao gatilho (barra-mãe). Isso protege a operação contra falsos rompimentos e ruídos intradiários normais dentro da contração.\n- **Proteção do Lucro:** Ao atingir +2R, o stop é obrigatoriamente elevado para o Breakeven, eliminando o risco da conta.\n- **Risco Contínuo:** O Ongoing Risk acompanha a distância até o stop atual para a quantidade em aberto, alertando sobre qualquer exposição anômala."
          }
        ],
        "tip": "Deixe o mercado tirar você da posição. Nunca encerre um trade vencedor por ansiedade antes que o stop técnico ou a média de condução seja rompida.",
        "toolRoute": "positions",
        "toolLabel": "Ver Posições Abertas →",
        "relatedLinks": [
          {
            "label": "Posições Abertas (Ferramenta)",
            "route": "positions"
          },
          {
            "label": "Portfolio Heat (Ferramenta)",
            "route": "portfolioheat"
          }
        ]
      }
    ]
  },
  {
    "id": "livro-6",
    "number": "06",
    "title": "A Mente do Trader",
    "subtitle": "Psicologia, rituais, resiliência e as regras inegociáveis",
    "cover": "assets/manual-knowledge/zen.jpg",
    "description": "Blindagem emocional para operar com calma, evitar revenge trading, praticar deliberadamente e manter consistência ao longo dos anos.",
    "chapters": [
      {
        "id": "livro-6-cap-1",
        "number": 1,
        "title": "O Cérebro do Operador e a Incerteza",
        "subtitle": "Por que fomos biologicamente programados para falhar no mercado",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em O Cérebro do Operador e a Incerteza",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-1",
            "title": "1.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-2",
        "number": 2,
        "title": "O Custo Emocional da Oscilação",
        "subtitle": "Como a ansiedade intradiária destrói a clareza e a disciplina",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em O Custo Emocional da Oscilação",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-2",
            "title": "2.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-3",
        "number": 3,
        "title": "O Modo Desapego: Executar sem Medo",
        "subtitle": "Foco 100% na excelência da execução, aceitando o resultado com serenidade",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em O Modo Desapego: Executar sem Medo",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-3",
            "title": "3.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-4",
        "number": 4,
        "title": "Vieses Cognitivos: Confirmação e FOMO",
        "subtitle": "Como identificar e desarmar as armadilhas da mente antes do clique",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em Vieses Cognitivos: Confirmação e FOMO",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-4",
            "title": "4.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-5",
        "number": 5,
        "title": "Revenge Trading e a Espiral Destrutiva",
        "subtitle": "A psicologia por trás da tentativa desesperada de recuperar perdas",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em Revenge Trading e a Espiral Destrutiva",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-5",
            "title": "5.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-6",
        "number": 6,
        "title": "Rebuild Mode: Recuperação Estruturada",
        "subtitle": "O protocolo passo a passo para reconstruir a confiança após drawdowns",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em Rebuild Mode: Recuperação Estruturada",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-6",
            "title": "6.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-7",
        "number": 7,
        "title": "Prática Deliberada: Repetição Consciente",
        "subtitle": "Treinando o músculo da disciplina através de metas de processo",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em Prática Deliberada: Repetição Consciente",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-7",
            "title": "7.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-8",
        "number": 8,
        "title": "O Diário do Trader como Espelho Psicológico",
        "subtitle": "Como documentar emoções e identificar padrões ocultos de comportamento",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em O Diário do Trader como Espelho Psicológico",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-8",
            "title": "8.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-9",
        "number": 9,
        "title": "Trader Zen: Práticas de Atenção Plena",
        "subtitle": "Técnicas de respiração e pausas conscientes para restaurar a calma",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em Trader Zen: Práticas de Atenção Plena",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-9",
            "title": "9.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-10",
        "number": 10,
        "title": "Sabedoria dos Grandes Mestres do Trend Following",
        "subtitle": "Princípios atemporais de Ed Seykota, Richard Dennis e Jesse Livermore",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em Sabedoria dos Grandes Mestres do Trend Following",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-10",
            "title": "10.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-11",
        "number": 11,
        "title": "Monitor de Hábitos: Disciplina Diária",
        "subtitle": "Transformando rituais de sono, exercício e estudo em resultados financeiros",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em Monitor de Hábitos: Disciplina Diária",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-11",
            "title": "11.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      },
      {
        "id": "livro-6-cap-12",
        "number": 12,
        "title": "As Sete Regras Inegociáveis do Operador",
        "subtitle": "O manifesto moral que guia todas as ações do Healthy Trend Trader",
        "cover": "assets/manual-knowledge/zen.jpg",
        "takeaways": [
          "Compreensão dos gatilhos emocionais em As Sete Regras Inegociáveis do Operador",
          "Estratégias comportamentais para manter a compostura sob pressão",
          "Como os módulos de Mentalidade & Zen do software apoiam sua saúde mental",
          "Exercícios práticos de autorreflexão e disciplina diária"
        ],
        "sections": [
          {
            "id": "sec-12",
            "title": "12.1 Princípio Psicológico",
            "content": "O maior adversário do trader não é o mercado nem os grandes fundos institucionais, mas sim suas próprias reações emocionais:\n- **Aceitação da Perda:** No Trend Following, perdas pequenas são custos normais da atividade, comparáveis ao custo de mercadoria em um negócio.\n- **Clareza Mental:** O software monitora seu estado de espírito e tempo de tela para impedir que decisões impulsivas degradem sua consistência.\n- **Paz de Espírito:** Operar com tamanho de posição pequeno e stop técnico definido elimina a angústia de acompanhar o pregão."
          }
        ],
        "tip": "Quando sentir raiva ou euforia excessiva após um trade, feche a plataforma e faça uma pausa consciente no módulo Trader Zen.",
        "toolRoute": "mindset",
        "toolLabel": "Abrir Mentalidade & Zen →",
        "relatedLinks": [
          {
            "label": "Mentalidade (Ferramenta)",
            "route": "mindset"
          },
          {
            "label": "Trader Zen (Ferramenta)",
            "route": "zen"
          },
          {
            "label": "Regras do Trader (Ferramenta)",
            "route": "traderrules"
          }
        ]
      }
    ]
  }
];

  return {
    BOOKS: BOOKS,
    getBook: function (bookId) {
      return BOOKS.find(function (b) { return b.id === bookId; });
    },
    getChapter: function (bookId, chapterId) {
      var book = BOOKS.find(function (b) { return b.id === bookId; });
      if (!book) return null;
      return book.chapters.find(function (c) { return c.id === chapterId; });
    },
    getChapterPages: function (chapter) {
      if (!chapter) return [];
      if (Array.isArray(chapter.pages) && chapter.pages.length > 0) {
        return chapter.pages;
      }
      var secs = Array.isArray(chapter.sections) ? chapter.sections : [];
      var pages = [];

      if (secs.length <= 1) {
        pages.push({
          pageIndex: 0,
          number: 1,
          id: 'p-1',
          title: secs[0] ? secs[0].title : (chapter.title + ' — Introdução'),
          type: 'intro',
          takeaways: chapter.takeaways || [],
          sections: secs[0] ? [secs[0]] : [],
          contentLead: chapter.subtitle
        });
        pages.push({
          pageIndex: 1,
          number: 2,
          id: 'p-2',
          title: 'Aplicação Prática & Síntese',
          type: 'practice',
          tip: chapter.tip,
          toolRoute: chapter.toolRoute,
          toolLabel: chapter.toolLabel,
          relatedLinks: chapter.relatedLinks || []
        });
      } else if (secs.length === 2) {
        pages.push({
          pageIndex: 0,
          number: 1,
          id: 'p-1',
          title: secs[0].title,
          type: 'intro',
          takeaways: chapter.takeaways || [],
          sections: [secs[0]],
          contentLead: chapter.subtitle
        });
        pages.push({
          pageIndex: 1,
          number: 2,
          id: 'p-2',
          title: secs[1].title,
          type: 'practice',
          sections: [secs[1]],
          tip: chapter.tip,
          toolRoute: chapter.toolRoute,
          toolLabel: chapter.toolLabel,
          relatedLinks: chapter.relatedLinks || []
        });
      } else if (secs.length === 3) {
        pages.push({
          pageIndex: 0,
          number: 1,
          id: 'p-1',
          title: secs[0].title,
          type: 'intro',
          takeaways: chapter.takeaways || [],
          sections: [secs[0]],
          contentLead: chapter.subtitle
        });
        pages.push({
          pageIndex: 1,
          number: 2,
          id: 'p-2',
          title: secs[1].title,
          type: 'explanation',
          sections: [secs[1]]
        });
        pages.push({
          pageIndex: 2,
          number: 3,
          id: 'p-3',
          title: secs[2].title,
          type: 'practice',
          sections: [secs[2]],
          tip: chapter.tip,
          toolRoute: chapter.toolRoute,
          toolLabel: chapter.toolLabel,
          relatedLinks: chapter.relatedLinks || []
        });
      } else {
        for (var i = 0; i < secs.length; i++) {
          var isFirst = i === 0;
          var isLast = i === secs.length - 1;
          pages.push({
            pageIndex: i,
            number: i + 1,
            id: 'p-' + (i + 1),
            title: secs[i].title,
            type: isFirst ? 'intro' : (isLast ? 'practice' : 'explanation'),
            takeaways: isFirst ? (chapter.takeaways || []) : [],
            sections: [secs[i]],
            tip: isLast ? chapter.tip : null,
            toolRoute: isLast ? chapter.toolRoute : null,
            toolLabel: isLast ? chapter.toolLabel : null,
            relatedLinks: isLast ? (chapter.relatedLinks || []) : []
          });
        }
      }
      return pages;
    },
    getTotalChapters: function () {
      return BOOKS.reduce(function (sum, b) { return sum + b.chapters.length; }, 0);
    },
    getTotalPages: function () {
      var self = this;
      return BOOKS.reduce(function (sum, b) {
        return sum + b.chapters.reduce(function (cSum, c) {
          return cSum + self.getChapterPages(c).length;
        }, 0);
      }, 0);
    }
  };
}));

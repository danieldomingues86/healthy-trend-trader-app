/**
 * HEALTHY TREND TRADER - MARKET NEWS MODEL
 * Contexto e Inteligência de Mercado para o Trader Sistemático.
 * 
 * Filosofia: "A notícia explica o contexto. O gráfico decide a operação."
 * As notícias fornecem entendimento de cenário macro e setorial, mas
 * NUNCA substituem os gatilhos técnicos nem o controle de risco do método.
 */

(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.MarketNewsModel = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MARKETS = [
    { id: 'todos', label: 'Todos' },
    { id: 'us', label: '🇺🇸 EUA' },
    { id: 'br', label: '🇧🇷 Brasil' },
    { id: 'global', label: '🌎 Global' }
  ];

  const CATEGORIES = [
    { id: 'todas', label: 'Todas' },
    { id: 'mercado', label: 'Mercado' },
    { id: 'macro', label: 'Macro' },
    { id: 'empresas', label: 'Empresas' },
    { id: 'setores', label: 'Setores' },
    { id: 'commodities', label: 'Commodities' },
    { id: 'tecnologia', label: 'Tecnologia' }
  ];

  const MARKET_INDICATORS = [
    {
      symbol: 'SPX',
      name: 'S&P 500',
      value: '5.709,21',
      changePct: 0.68,
      changeFormatted: '+0,68%',
      trend: 'up',
      sparkline: [5670, 5678, 5685, 5680, 5695, 5702, 5709]
    },
    {
      symbol: 'NDX',
      name: 'Nasdaq',
      value: '17.910,43',
      changePct: 0.92,
      changeFormatted: '+0,92%',
      trend: 'up',
      sparkline: [17750, 17780, 17820, 17800, 17870, 17890, 17910]
    },
    {
      symbol: 'DJI',
      name: 'Dow Jones',
      value: '42.114,32',
      changePct: 0.54,
      changeFormatted: '+0,54%',
      trend: 'up',
      sparkline: [41900, 41950, 42000, 41980, 42050, 42090, 42114]
    },
    {
      symbol: 'IBOV',
      name: 'Ibovespa',
      value: '132.540',
      changePct: 1.12,
      changeFormatted: '+1,12%',
      trend: 'up',
      sparkline: [131100, 131400, 131800, 131600, 132100, 132350, 132540]
    },
    {
      symbol: 'USDBRL',
      name: 'Dólar (USD/BRL)',
      value: '5,21',
      changePct: -0.38,
      changeFormatted: '-0,38%',
      trend: 'down',
      sparkline: [5.24, 5.235, 5.23, 5.225, 5.22, 5.215, 5.21]
    },
    {
      symbol: 'WTI',
      name: 'Petróleo (WTI)',
      value: '76,32',
      changePct: 1.85,
      changeFormatted: '+1,85%',
      trend: 'up',
      sparkline: [74.9, 75.1, 75.4, 75.2, 75.8, 76.1, 76.32]
    },
    {
      symbol: 'GOLD',
      name: 'Ouro',
      value: '2.659,40',
      changePct: 0.42,
      changeFormatted: '+0,42%',
      trend: 'up',
      accentColor: '#f59e0b',
      sparkline: [2648, 2650, 2653, 2652, 2655, 2657, 2659.4]
    }
  ];

  const SECTORS_OVERVIEW = [
    {
      id: 'tecnologia',
      name: 'Tecnologia',
      icon: '💻',
      count: 24,
      trend: 'up',
      sparkline: [18, 19, 21, 20, 22, 23, 24]
    },
    {
      id: 'financeiro',
      name: 'Financeiro',
      icon: '🏦',
      count: 18,
      trend: 'up',
      sparkline: [14, 15, 15, 16, 17, 17, 18]
    },
    {
      id: 'energia',
      name: 'Energia',
      icon: '⚡',
      count: 12,
      trend: 'up',
      sparkline: [8, 9, 10, 9, 11, 11, 12]
    },
    {
      id: 'consumo',
      name: 'Consumo',
      icon: '🛍️',
      count: 9,
      trend: 'up',
      sparkline: [7, 7, 8, 8, 8, 9, 9]
    },
    {
      id: 'saude',
      name: 'Saúde',
      icon: '❤️',
      count: 7,
      trend: 'down',
      sparkline: [11, 10, 9, 9, 8, 7, 7]
    },
    {
      id: 'industrial',
      name: 'Industrial',
      icon: '🏗️',
      count: 11,
      trend: 'up',
      sparkline: [8, 8, 9, 10, 10, 10, 11]
    },
    {
      id: 'commodities',
      name: 'Commodities',
      icon: '📦',
      count: 10,
      trend: 'up',
      sparkline: [6, 7, 8, 8, 9, 9, 10]
    }
  ];

  // Notícia Hero Principal
  const FEATURED_STORY = {
    id: 'story-hero-fed',
    category: 'Macro',
    categoryBadge: 'MACROECONOMIA',
    market: 'us',
    title: 'Fed mantém juros e sinaliza cautela com próximos passos',
    summary: 'Banco Central dos EUA mantém taxa de juros no intervalo de 5,25% – 5,50% e reforça que decisões futuras dependerão dos dados de inflação e emprego.',
    source: 'Bloomberg',
    time: '14:12',
    date: '02 de Out, 14:12',
    image: 'assets/news-hero-fed.jpg',
    tickers: ['SPX', 'NDX', 'USDBRL'],
    content: `O Federal Reserve (Fed) anunciou a manutenção das taxas básicas de juros dos Estados Unidos no patamar atual, reiterando postura dependente da evolução dos indicadores de inflação e mercado de trabalho.

O presidente da instituição destacou que a atividade econômica continua em ritmo sólido, mas que a convergência da inflação em direção à meta de 2% ainda exige disciplina monetária sustentada.

**Contexto Técnico para o Trader:**
- A postura cautelosa sem aperto adicional é historicamente benigna para ativos de risco e empresas de crescimento com boa saúde financeira.
- Traders sistemáticos devem observar se os principais índices de referência (S&P 500 e Nasdaq) continuam trabalhando acima de suas médias móveis de 21 e 50 períodos sem perder a estrutura de topos e fundos ascendentes.
- A decisão não altera o plano operacional: oportunidades só devem ser acionadas se houver contração de volatilidade limpa e gatilho técnico confirmado no gráfico diário.`,
    traderNote: 'A notícia explica o contexto macro. O gráfico decide a operação: confira se o mercado geral está em Permissão de Compra antes de planejar novas entradas.'
  };

  // Top 5 Destaques Ranqueados
  const TOP_STORIES = [
    {
      id: 'story-top-1',
      rank: '01',
      title: 'Fed mantém juros e sinaliza cautela com próximos passos',
      source: 'Bloomberg',
      time: '14:12',
      market: 'us',
      category: 'Macro',
      thumbnail: 'assets/news-thumb-powell.jpg',
      tickers: ['SPX', 'NDX'],
      summary: 'Banco Central dos EUA mantém juros e reforça dependência de dados econômicos.',
      content: `O comitê de política monetária do Fed reforçou seu compromisso em trazer a inflação para a meta de 2%, mantendo as taxas inalteradas.`
    },
    {
      id: 'story-top-2',
      rank: '02',
      title: 'Petróleo sobe após nova tensão geopolítica no Oriente Médio',
      source: 'Reuters',
      time: '13:48',
      market: 'global',
      category: 'Commodities',
      thumbnail: 'assets/news-thumb-oil.jpg',
      tickers: ['WTI', 'PETR4', 'PRIO3'],
      summary: 'Barril do WTI avança mais de 1,8% diante de preocupações com a oferta de petróleo bruto.',
      content: `Os contratos futuros de petróleo operam com forte valorização nesta tarde, refletindo o aumento do prêmio de risco geopolítico nos principais centros de escoamento.

**Contexto Técnico:**
Para empresas produtoras e exportadoras de commodities energéticas (como PETR4 e PRIO3), a sustentação do barril em patamares elevados tende a suportar as margens operacionais. No entanto, o trader deve buscar bases de consolidação estritas e evitar compras esticadas longe das médias.`
    },
    {
      id: 'story-top-3',
      rank: '03',
      title: 'Nasdaq registra nova máxima com força das big techs',
      source: 'CNBC',
      time: '12:31',
      market: 'us',
      category: 'Tecnologia',
      thumbnail: 'assets/news-thumb-chip.jpg',
      tickers: ['NDX', 'AAPL', 'MSFT', 'NVDA'],
      summary: 'Índice de tecnologia avança impulsionado pela resiliência nos balanços e forte fluxo comprador.',
      content: `O índice acionário Nasdaq Composite atingiu novos recordes intradiários impulsionado pela aceleração de receitas das líderes em infraestrutura de nuvem e inteligência artificial.

**Contexto Técnico:**
A força relativa (RS) das big techs continua em patamar elevado, confirmando a liderança de mercado. Observe papéis que estejam formando pullback ordenado para a EMA de 9 ou 21 períodos.`
    },
    {
      id: 'story-top-4',
      rank: '04',
      title: 'Nvidia anuncia nova linha de chips de IA com alta demanda',
      source: 'MarketWatch',
      time: '11:55',
      market: 'us',
      category: 'Empresas',
      thumbnail: 'assets/news-thumb-chip.jpg',
      tickers: ['NVDA', 'NVDC34'],
      summary: 'Nova arquitetura promete aumento expressivo em eficiência energética para data centers corporativos.',
      content: `A gigante de semicondutores Nvidia apresentou sua mais recente plataforma de aceleradores neurais voltada para inteligência artificial generativa, reportando encomendas recordes de provedores de computação em hiperescala.`
    },
    {
      id: 'story-top-5',
      rank: '05',
      title: 'Apple deve lançar novos produtos ainda este ano, diz analista',
      source: 'CNBC',
      time: '10:27',
      market: 'us',
      category: 'Empresas',
      thumbnail: 'assets/news-thumb-chip.jpg',
      tickers: ['AAPL', 'AAPL34'],
      summary: 'Cronograma inclui atualizações nas linhas de computação e novos recursos voltados para ecossistema integrado.',
      content: `Relatório de analistas de Wall Street aponta que a Apple prepara novas edições de seus dispositivos com processadores de arquitetura proprietária, visando capturar a demanda corporativa no último trimestre.`
    }
  ];

  // Notícias relacionadas a ativos da Watchlist
  const WATCHLIST_STORIES = [
    {
      id: 'wl-story-1',
      ticker: 'NVDA',
      companyName: 'Nvidia Corp.',
      logoBg: '#1e3a29',
      logoColor: '#76b900',
      headline: 'Nvidia anuncia nova linha de chips de IA com alta demanda do setor de data centers',
      impact: 'Positivo',
      time: '14:05',
      date: 'Hoje, 14:05',
      category: 'Tecnologia',
      market: 'us',
      source: 'Bloomberg',
      details: 'Novos chips Blackwell de próxima geração registram compromissos firmes dos 4 maiores provedores de nuvem do mundo.'
    },
    {
      id: 'wl-story-2',
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      logoBg: '#262626',
      logoColor: '#ffffff',
      headline: 'Apple deve lançar novos produtos ainda este ano, diz analista',
      impact: 'Neutro',
      time: '11:42',
      date: 'Hoje, 11:42',
      category: 'Empresas',
      market: 'us',
      source: 'CNBC',
      details: 'Atualização incremental de hardware já vinha sendo precificada pelo consenso dos analistas.'
    },
    {
      id: 'wl-story-3',
      ticker: 'MSFT',
      companyName: 'Microsoft Corp.',
      logoBg: '#1a2736',
      logoColor: '#00a4ef',
      headline: 'Microsoft expande investimentos em IA para 2026',
      impact: 'Positivo',
      time: '10:18',
      date: 'Hoje, 10:18',
      category: 'Empresas',
      market: 'us',
      source: 'Reuters',
      details: 'Plano de capex robusto reflete conversão sólida de projetos corporativos em receita de software e nuvem.'
    },
    {
      id: 'wl-story-4',
      ticker: 'AMZN',
      companyName: 'Amazon.com',
      logoBg: '#2d2319',
      logoColor: '#ff9900',
      headline: 'Amazon anuncia nova região de nuvem na América Latina',
      impact: 'Positivo',
      time: '09:54',
      date: 'Hoje, 09:54',
      category: 'Tecnologia',
      market: 'global',
      source: 'Valor Econômico',
      details: 'Expansão de data centers fortalece posição da AWS na região em ritmo superior ao de concorrentes diretos.'
    },
    {
      id: 'wl-story-5',
      ticker: 'GOOG',
      companyName: 'Alphabet Inc.',
      logoBg: '#242a38',
      logoColor: '#4285f4',
      headline: 'Alphabet é alvo de investigação regulatória na Europa',
      impact: 'Negativo',
      time: '08:31',
      date: 'Hoje, 08:31',
      category: 'Empresas',
      market: 'global',
      source: 'Financial Times',
      details: 'Órgãos antitruste europeus abrem inquérito sobre acordos de distribuição de inteligência artificial em navegadores.'
    },
    {
      id: 'wl-story-6',
      ticker: 'PETR4',
      companyName: 'Petrobras',
      logoBg: '#1e382b',
      logoColor: '#22c55e',
      headline: 'Petrobras atinge recorde de produção no pré-sal com novos poços',
      impact: 'Positivo',
      time: '09:12',
      date: 'Hoje, 09:12',
      category: 'Energia',
      market: 'br',
      source: 'InfoMoney',
      details: 'Eficiência de extração reduz custo de extração para níveis historicamente baixos no trimestre.'
    },
    {
      id: 'wl-story-7',
      ticker: 'VALE3',
      companyName: 'Vale S.A.',
      logoBg: '#2b2c21',
      logoColor: '#eab308',
      headline: 'Minério de ferro tem sessão mista em Dalian com estoques elevados',
      impact: 'Neutro',
      time: '08:45',
      date: 'Hoje, 08:45',
      category: 'Commodities',
      market: 'br',
      source: 'Broadcast',
      details: 'Siderúrgicas chinesas mantêm compras estáveis, sem surpresas de demanda para o curto prazo.'
    },
    {
      id: 'wl-story-8',
      ticker: 'WEGE3',
      companyName: 'WEG S.A.',
      logoBg: '#173042',
      logoColor: '#38bdf8',
      headline: 'WEG expande capacidade produtiva de transformadores nos EUA e Europa',
      impact: 'Positivo',
      time: '07:50',
      date: 'Hoje, 07:50',
      category: 'Industrial',
      market: 'br',
      source: 'Brazil Journal',
      details: 'Demanda contínua para modernização da rede elétrica global gera carteira de pedidos com entrega estendida.'
    },
    {
      id: 'wl-story-9',
      ticker: 'TOTS3',
      companyName: 'Totvs S.A.',
      logoBg: '#1d2a3d',
      logoColor: '#60a5fa',
      headline: 'Totvs anuncia integração nativa de agentes de IA na linha de gestão empresarial',
      impact: 'Positivo',
      time: '07:30',
      date: 'Hoje, 07:30',
      category: 'Tecnologia',
      market: 'br',
      source: 'NeoFeed',
      details: 'Módulos automatizados devem elevar receita recorrente e retenção de clientes de médio e grande porte.'
    }
  ];

  // Últimas Notícias (fluxo cronológico)
  const LATEST_STORIES = [
    {
      id: 'latest-1',
      time: '14:18',
      headline: 'Petróleo sobe após nova tensão geopolítica no Oriente Médio',
      category: 'Commodities',
      categoryBadge: 'Commodities',
      market: 'global',
      tickers: ['WTI', 'PETR4'],
      source: 'Reuters'
    },
    {
      id: 'latest-2',
      time: '14:12',
      headline: 'Fed mantém juros e sinaliza cautela com próximos passos',
      category: 'Macro',
      categoryBadge: 'Macro',
      market: 'us',
      tickers: ['SPX', 'NDX'],
      source: 'Bloomberg'
    },
    {
      id: 'latest-3',
      time: '13:57',
      headline: 'Setor de semicondutores ganha força com demanda por IA',
      category: 'Setores',
      categoryBadge: 'Setores',
      market: 'us',
      tickers: ['NVDA', 'AMD', 'TSM'],
      source: 'CNBC'
    },
    {
      id: 'latest-4',
      time: '13:31',
      headline: 'Dólar recua frente ao real com cenário externo mais positivo',
      category: 'Mercado',
      categoryBadge: 'Mercado',
      market: 'br',
      tickers: ['USDBRL', 'IBOV'],
      source: 'Valor Econômico'
    },
    {
      id: 'latest-5',
      time: '12:46',
      headline: 'Tesla apresenta novos avanços em condução autônoma',
      category: 'Empresas',
      categoryBadge: 'Empresas',
      market: 'us',
      tickers: ['TSLA'],
      source: 'Reuters'
    },
    {
      id: 'latest-6',
      time: '11:55',
      headline: 'Nvidia anuncia nova linha de chips de IA com alta demanda',
      category: 'Empresas',
      categoryBadge: 'Empresas',
      market: 'us',
      tickers: ['NVDA'],
      source: 'MarketWatch'
    },
    {
      id: 'latest-7',
      time: '10:27',
      headline: 'Apple deve lançar novos produtos ainda este ano, diz analista',
      category: 'Empresas',
      categoryBadge: 'Empresas',
      market: 'us',
      tickers: ['AAPL'],
      source: 'CNBC'
    },
    {
      id: 'latest-8',
      time: '09:48',
      headline: 'Ibovespa sobe com alta das commodities e fluxo estrangeiro',
      category: 'Mercado',
      categoryBadge: 'Mercado',
      market: 'br',
      tickers: ['IBOV', 'PETR4', 'VALE3'],
      source: 'Broadcast'
    },
    {
      id: 'latest-9',
      time: '09:15',
      headline: 'Varejo brasileiro mostra recuperação gradual nas vendas no terceiro trimestre',
      category: 'Setores',
      categoryBadge: 'Setores',
      market: 'br',
      tickers: ['MGLU3', 'LREN3'],
      source: 'IBGE'
    },
    {
      id: 'latest-10',
      time: '08:50',
      headline: 'Banco Central Europeu sinaliza que juros caminham para trajetória neutra',
      category: 'Macro',
      categoryBadge: 'Macro',
      market: 'global',
      tickers: ['EURUSD'],
      source: 'Financial Times'
    }
  ];

  let liveStories = null;
  function liveStory(story, index) {
    const ticker = Array.isArray(story.tickers) ? story.tickers[0] : null;
    return {
      id: story.id,
      rank: story.rank || String(index + 1).padStart(2, '0'),
      title: story.title,
      headline: story.title,
      summary: story.summary || 'Leia a matéria completa no veículo de origem.',
      details: story.summary || 'Leia a matéria completa no veículo de origem.',
      source: story.source,
      sourceUrl: story.url,
      time: story.time || '—',
      date: story.publishedAt ? new Date(story.publishedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : (story.time || '—'),
      market: story.market || 'global',
      category: story.category || 'Mercado',
      categoryBadge: story.category || 'Mercado',
      tickers: Array.isArray(story.tickers) ? story.tickers : [],
      ticker,
      companyName: ticker || 'Mercado',
      impact: 'Contexto',
      image: story.image || null,
      thumbnail: story.image || null,
      content: 'Esta notícia é apresentada com título, fonte e horário pelo Healthy Trend Trader. Abra a matéria original para a leitura completa.'
    };
  }
  function setLiveStories(stories) { liveStories = Array.isArray(stories) ? stories.map(liveStory) : null; }

  /**
   * Filtra histórias com base nos critérios selecionados pelo usuário.
   */
  function filterStories(options = {}) {
    const {
      market = 'todos',
      category = 'todas',
      search = '',
      watchlistOnly = false,
      userWatchlistTickers = []
    } = options;

    const term = (search || '').trim().toLowerCase();

    const sourceStories = liveStories || WATCHLIST_STORIES;
    const topSource = liveStories || TOP_STORIES;
    const latestSource = liveStories || LATEST_STORIES;
    // Filtra Watchlist Stories
    const filteredWatchlist = sourceStories.filter(item => {
      // Filtro de mercado
      if (market !== 'todos' && item.market !== market) return false;

      // Filtro de categoria
      if (category !== 'todas') {
        const catNorm = (item.category || '').toLowerCase();
        if (!catNorm.includes(category.toLowerCase())) return false;
      }

      // Se ativado apenas da watchlist do usuário
      if (watchlistOnly && Array.isArray(userWatchlistTickers) && userWatchlistTickers.length > 0) {
        const matchesUser = userWatchlistTickers.some(
          t => String(t).toUpperCase() === String(item.ticker).toUpperCase()
        );
        if (!matchesUser) return false;
      }

      // Filtro de busca textual
      if (term) {
        const matches = (
          item.ticker.toLowerCase().includes(term) ||
          item.companyName.toLowerCase().includes(term) ||
          item.headline.toLowerCase().includes(term) ||
          (item.details && item.details.toLowerCase().includes(term))
        );
        if (!matches) return false;
      }

      return true;
    });

    // Filtra Últimas Notícias
    const filteredLatest = latestSource.filter(item => {
      if (market !== 'todos' && item.market !== market) return false;
      if (category !== 'todas') {
        const catNorm = (item.category || '').toLowerCase();
        if (!catNorm.includes(category.toLowerCase())) return false;
      }
      if (watchlistOnly && Array.isArray(userWatchlistTickers) && userWatchlistTickers.length > 0) {
        const hasWlTicker = (item.tickers || []).some(t =>
          userWatchlistTickers.some(ut => String(ut).toUpperCase() === String(t).toUpperCase())
        );
        if (!hasWlTicker) return false;
      }
      if (term) {
        const matches = (
          item.headline.toLowerCase().includes(term) ||
          item.category.toLowerCase().includes(term) ||
          (item.tickers && item.tickers.some(t => t.toLowerCase().includes(term)))
        );
        if (!matches) return false;
      }
      return true;
    });

    // Filtra Top Stories
    const filteredTop = topSource.filter(item => {
      if (market !== 'todos' && item.market !== market) return false;
      if (category !== 'todas') {
        const catNorm = (item.category || '').toLowerCase();
        if (!catNorm.includes(category.toLowerCase())) return false;
      }
      if (watchlistOnly && Array.isArray(userWatchlistTickers) && userWatchlistTickers.length > 0) {
        const hasWlTicker = (item.tickers || []).some(t =>
          userWatchlistTickers.some(ut => String(ut).toUpperCase() === String(t).toUpperCase())
        );
        if (!hasWlTicker) return false;
      }
      if (term) {
        const matches = (
          item.title.toLowerCase().includes(term) ||
          item.summary.toLowerCase().includes(term) ||
          (item.tickers && item.tickers.some(t => t.toLowerCase().includes(term)))
        );
        if (!matches) return false;
      }
      return true;
    });

    return {
      featured: liveStories?.[0] || FEATURED_STORY,
      topStories: filteredTop,
      watchlistStories: filteredWatchlist,
      latestStories: filteredLatest,
      indicators: MARKET_INDICATORS,
      sectors: SECTORS_OVERVIEW
    };
  }

  /**
   * Retorna os dados completos de uma história pelo ID
   */
  function getStoryById(storyId) {
    if (!storyId) return null;
    const live = liveStories?.find(item => item.id === storyId);
    if (live) return live;
    if (FEATURED_STORY.id === storyId) return FEATURED_STORY;

    const inTop = TOP_STORIES.find(s => s.id === storyId);
    if (inTop) return inTop;

    const inWl = WATCHLIST_STORIES.find(s => s.id === storyId);
    if (inWl) {
      return {
        id: inWl.id,
        title: inWl.headline,
        summary: inWl.details,
        category: inWl.category,
        market: inWl.market,
        source: inWl.source || 'Healthy Trend Market Intelligence',
        time: inWl.time,
        date: inWl.date,
        tickers: [inWl.ticker],
        impact: inWl.impact,
        content: `**Contexto do Ativo (${inWl.ticker}):**\n\n${inWl.details}\n\n**Atenção Operacional:**\nNotícias e fatos relevantes geram volatilidade intradiária. Espere o fechamento do candle diário para avaliar se o padrão técnico permanece íntegro antes de tomar qualquer decisão.`
      };
    }

    const inLatest = LATEST_STORIES.find(s => s.id === storyId);
    if (inLatest) {
      return {
        id: inLatest.id,
        title: inLatest.headline,
        summary: inLatest.headline,
        category: inLatest.category,
        market: inLatest.market,
        source: inLatest.source || 'Agências de Notícias',
        time: inLatest.time,
        tickers: inLatest.tickers || [],
        content: `**Notícia de Mercado:**\n\n${inLatest.headline}\n\n**Lembrete Disciplinar:**\nA notícia explica o contexto geral. O gráfico diário e as regras do seu setup decidem a operação.`
      };
    }

    return null;
  }

  /**
   * Informação do status do mercado (B3 e NYSE/Nasdaq)
   */
  function getMarketSessionInfo() {
    const now = new Date();
    const day = now.getDay();
    const isWeekend = (day === 0 || day === 6);
    const hour = now.getHours();

    // Considera mercado aberto entre 10h e 17h em dias úteis
    const isOpen = !isWeekend && (hour >= 10 && hour < 18);

    return {
      isOpen,
      statusLabel: isOpen ? 'Mercado Aberto' : 'Mercado Fechado',
      statusClass: isOpen ? 'status-open' : 'status-closed',
      sessionText: isOpen ? 'B3 & NYSE em negociação regular' : 'Sessão encerrada (After-hours)'
    };
  }

  return {
    MARKETS,
    CATEGORIES,
    MARKET_INDICATORS,
    SECTORS_OVERVIEW,
    FEATURED_STORY,
    TOP_STORIES,
    WATCHLIST_STORIES,
    LATEST_STORIES,
    setLiveStories,
    filterStories,
    getStoryById,
    getMarketSessionInfo
  };
});

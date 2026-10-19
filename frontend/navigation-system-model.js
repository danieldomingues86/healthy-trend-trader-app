/**
 * HEALTHY TREND TRADER - NAVIGATION SYSTEM MODEL
 * 
 * Single Source of Truth for platform navigation across all three presentations:
 * - Menu Lateral (Sidebar)
 * - Menu Superior (Top Navigation Bar with Dropdowns)
 * - Menu em Blocos (Categorized Tiles Hub)
 * 
 * CORE INVARIANT:
 * "Mesmas funcionalidades. Nova organização."
 * Presets and personalizations determine hierarchy, grouping, quick access, and display,
 * but NEVER hide or remove any software capability. 100% of modules remain accessible.
 */

(function(root) {
  'use strict';

  // 1. OFFICIAL MASTER CATEGORIES
  const CATEGORIES = [
    {
      id: 'daily',
      label: 'Operação Diária',
      labelEn: 'Daily Operation',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
      desc: 'Rotina, planejamento e execução do pregão.'
    },
    {
      id: 'training-recovery',
      label: 'Treinamento',
      labelEn: 'Training',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
      desc: 'Metas, jornada de consistência e proteção operacional.'
    },
    {
      id: 'market-analysis',
      label: 'Análise de Mercado',
      labelEn: 'Market Analysis',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      desc: 'Força relativa, ciclo de mercado, gráficos e inteligência.'
    },
    {
      id: 'portfolio-risk',
      label: 'Carteira & Risco',
      labelEn: 'Portfolio & Risk',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
      desc: 'Patrimônio, posições abertas, dimensionamento e heat.'
    },
    {
      id: 'simulators',
      label: 'Simuladores',
      labelEn: 'Simulators',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="6 10 9 7 13 11 18 6"/></svg>`,
      desc: 'Ambiente de testes, cenários e projeção de equity.'
    },
    {
      id: 'data-performance',
      label: 'Dados & Performance',
      labelEn: 'Data & Performance',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      desc: 'Painel da verdade, anatomia, erros e revisão periódica.'
    },
    {
      id: 'mindset',
      label: 'Mentalidade & Zen',
      labelEn: 'Mindset & Zen',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 4.5A4.5 4.5 0 0 0 5 9v1a4 4 0 0 0 1 7.87V19a2 2 0 0 0 2 2h1.5M14.5 4.5A4.5 4.5 0 0 1 19 9v1a4 4 0 0 1-1 7.87V19a2 2 0 0 1-2 2h-1.5M9.5 4.5A3.5 3.5 0 0 1 12 6a3.5 3.5 0 0 1 2.5-1.5M12 6v15M8 10h1.5M14.5 10H16M8 14h1.5M14.5 14H16"/></svg>`,
      desc: 'Clareza mental, inteligência emocional e rotina zen.'
    },
    {
      id: 'resources',
      label: 'Recursos & Sistema',
      labelEn: 'Resources & System',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>`,
      desc: 'Loja, manual, glossário, preferências e sobre.'
    }
  ];

  // 2. COMPLETE CATALOG OF ALL SOFTWARE MODULES (100% INVENTORY)
  const MODULES = [
    // Operação Diária
    {
      id: 'today',
      page: 'today',
      label: 'Meu Desktop',
      labelEn: 'My Desktop',
      category: 'daily',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
      desc: 'Seu ponto de partida e foco do dia.',
      descEn: 'Your starting point and daily focus.',
      proOnly: false
    },
    {
      id: 'newtrade',
      page: 'newtrade',
      label: 'Novo Trade',
      labelEn: 'New Trade',
      category: 'daily',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
      desc: 'Planeje uma nova operação com sizing.',
      descEn: 'Plan a new operation with position sizing.',
      proOnly: false
    },
    {
      id: 'journal',
      page: 'journal',
      label: 'Diário de Trader',
      labelEn: 'Trading Journal',
      category: 'daily',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      desc: 'Registre e audite seu processo decisório.',
      descEn: 'Record and audit your decision process.',
      proOnly: false
    },
    {
      id: 'dailyroutine',
      page: 'dailyroutine',
      label: 'Rotina Diária',
      labelEn: 'Daily Routine',
      category: 'daily',
      icon: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 2.5H12a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V4a1.5 1.5 0 0 1 1.5-1.5h1.5"/><rect x="5.5" y="1" width="5" height="3" rx="1"/><path d="M5.5 7.5h5M5.5 11h3.5"/></svg>`,
      desc: 'Seu ritual antes da oportunidade.',
      descEn: 'Your ritual before the opportunity.',
      proOnly: false
    },
    {
      id: 'watchlist',
      page: 'watchlist',
      label: 'Watchlist',
      labelEn: 'Watchlist',
      category: 'daily',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
      desc: 'Pool inteligente de oportunidades monitoradas.',
      descEn: 'Smart pool of tracked opportunities.',
      proOnly: false
    },
    {
      id: 'habits',
      page: 'habits',
      label: 'Monitor de Hábitos',
      labelEn: 'Habits Tracker',
      category: 'daily',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
      desc: 'Construa a rotina de um trader profissional.',
      descEn: 'Build a professional trader routine.',
      proOnly: false
    },

    // Treinamento
    {
      id: 'mission',
      page: 'mission',
      label: 'Missão',
      labelEn: 'Mission',
      category: 'training-recovery',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      desc: 'Jornada de foco, disciplina e execução.',
      descEn: 'Journey of focus, discipline and execution.',
      proOnly: false
    },
    {
      id: 'tradertraining',
      page: 'tradertraining',
      label: 'Prática Deliberada',
      labelEn: 'Deliberate Practice',
      category: 'training-recovery',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
      desc: 'Metas e consistência de hábitos operacionais.',
      descEn: 'Goals and consistency of trading habits.',
      proOnly: false
    },
    {
      id: 'conquests',
      page: 'conquests',
      label: 'Minhas Conquistas',
      labelEn: 'My Conquests',
      category: 'training-recovery',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
      desc: 'Ritual de vitória, recompensas e marcos de disciplina.',
      descEn: 'Victory ritual, rewards and discipline milestones.',
      proOnly: false
    },
    {
      id: 'mistakesbook',
      page: 'mistakesbook',
      label: 'Erros & Lições',
      labelEn: 'Mistakes Book',
      category: 'training-recovery',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M10 10l4 4M14 10l-4 4"/></svg>`,
      desc: 'Transforme falhas operacionais em aprendizado.',
      descEn: 'Turn operational mistakes into wisdom.',
      proOnly: true
    },

    // Análise de Mercado
    {
      id: 'opportunityradar',
      page: 'opportunityradar',
      label: 'Radar de Oportunidades',
      labelEn: 'Opportunity Radar',
      category: 'market-analysis',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
      desc: 'Encontrar ativos prontos para entrada no gráfico Diário.',
      descEn: 'Find assets ready for entry on the Daily chart.',
      proOnly: false
    },
    {
      id: 'relativestrength',
      page: 'relativestrength',
      label: 'Força Relativa',
      labelEn: 'Relative Strength',
      category: 'market-analysis',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
      desc: 'Identificar os ativos líderes do mercado.',
      descEn: 'Identify leading market assets.',
      proOnly: true
    },
    {
      id: 'marketcycle',
      page: 'marketcycle',
      label: 'Ciclo de Mercado',
      labelEn: 'Market Cycle',
      category: 'market-analysis',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
      desc: 'Verificar o regime de mercado e o sinal de permissão para operar.',
      descEn: 'Check market regime and permission gate to trade.',
      proOnly: true
    },
    {
      id: 'marketcentral',
      page: 'marketcentral',
      label: 'Central de Mercado',
      labelEn: 'Market Central',
      category: 'market-analysis',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/><circle cx="12" cy="12" r="3"/></svg>`,
      desc: 'Consultar a visão geral do ambiente de mercado.',
      descEn: 'Overview of market environment and conditions.',
      proOnly: false
    },
    {
      id: 'eventplaybook',
      page: 'eventplaybook',
      label: 'Registro de Eventos',
      labelEn: 'Event Log',
      category: 'market-analysis',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>`,
      desc: 'Acompanhar eventos relevantes que podem afetar as operações.',
      descEn: 'Track relevant events that may affect operations.',
      proOnly: false
    },
    {
      id: 'fundamentals',
      page: 'fundamentals',
      label: 'Análise Fundamentalista',
      labelEn: 'Fundamentals',
      category: 'market-analysis',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2 2 7h20L12 2Z"/></svg>`,
      desc: 'Consultar os fundamentos e a qualidade dos ativos.',
      descEn: 'Financial fundamentals and asset quality.',
      proOnly: true
    },
    {
      id: 'charts',
      page: 'charts',
      label: 'Gráficos',
      labelEn: 'Charts',
      category: 'market-analysis',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line><path d="M4 14l5-5 4 4 7-7"/></svg>`,
      desc: 'Central de análise do ticker com guardrails.',
      descEn: 'Ticker analysis workstation with guardrails.',
      proOnly: false
    },
    {
      id: 'markettreemap',
      page: 'markettreemap',
      label: 'Mapa de Setores',
      labelEn: 'Sector Treemap',
      category: 'market-analysis',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
      desc: 'Treemap interativo de todo o mercado acionário da B3.',
      descEn: 'Interactive treemap of the entire B3 stock market.',
      proOnly: false
    },

    // Carteira & Risco
    {
      id: 'dashboard',
      page: 'dashboard',
      label: 'Patrimônio',
      labelEn: 'Wealth & Equity',
      category: 'portfolio-risk',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      desc: 'Visão patrimonial, alocações e aportes.',
      descEn: 'Wealth overview, allocations and contributions.',
      proOnly: false
    },
    {
      id: 'positions',
      page: 'positions',
      label: 'Posições Abertas',
      labelEn: 'Open Positions',
      category: 'portfolio-risk',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
      desc: 'Gestão de stops, parciais e trailing.',
      descEn: 'Management of stops, partial exits and trailing.',
      proOnly: false
    },
    {
      id: 'closedpositions',
      page: 'closedpositions',
      label: 'Posições Encerradas',
      labelEn: 'Closed Positions',
      category: 'portfolio-risk',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="m9 14 2 2 4-4"/></svg>`,
      desc: 'Histórico consolidado e revisão de trades.',
      descEn: 'Consolidated history and trade reviews.',
      proOnly: false
    },
    {
      id: 'portfolioheat',
      page: 'portfolioheat',
      label: 'Portfolio Heat',
      labelEn: 'Portfolio Heat',
      category: 'portfolio-risk',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M17.66 12.34l1.41-1.41M12 14a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>`,
      desc: 'Termômetro do risco agregado da carteira.',
      descEn: 'Thermometer of total aggregate portfolio risk.',
      proOnly: true
    },
    {
      id: 'riskpolicy',
      page: 'riskpolicy',
      label: 'Política de Risco',
      labelEn: 'Risk Policy',
      category: 'portfolio-risk',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      desc: 'Regras, limites e Risk Budget por Grade.',
      descEn: 'Rules, limits and Risk Budget per Grade.',
      proOnly: false
    },
    {
      id: 'assetblacklist',
      page: 'assetblacklist',
      label: 'Ativos Blacklist',
      labelEn: 'Asset Blacklist',
      category: 'portfolio-risk',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="10" r="6"/><path d="M6 16v3m6-3v3M6 19h6M6 9h.01M12 9h.01M9 12v1M16 16l5 5m0-5-5 5"/></svg>`,
      desc: 'Guardrail para ativos incompatíveis com seu perfil.',
      descEn: 'Guardrail against assets toxic to your profile.',
      proOnly: true
    },

    // Simuladores
    {
      id: 'tradesimulator',
      page: 'tradesimulator',
      label: 'Simulador de Trades',
      labelEn: 'Trade Simulator',
      category: 'simulators',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="6 10 9 7 13 11 18 6"/></svg>`,
      desc: 'Ambiente de testes e cenários de gestão.',
      descEn: 'Testing environment and management scenarios.',
      proOnly: false
    },
    {
      id: 'forecast',
      page: 'forecast',
      label: 'Simulador de Equity',
      labelEn: 'Equity Simulator',
      category: 'simulators',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 7-8.5 8.5-5-5L2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
      desc: 'Projeções e curvas de capital probabilísticas.',
      descEn: 'Probabilistic capital curves and projections.',
      proOnly: true
    },
    {
      id: 'riskofruin',
      page: 'riskofruin',
      label: 'Risco de Ruína',
      labelEn: 'Risk of Ruin',
      category: 'simulators',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
      desc: 'Simulação Monte Carlo de drawdown e sobrevivência estatística.',
      descEn: 'Monte Carlo drawdown simulation and statistical survival.',
      proOnly: false
    },

    // Dados & Performance
    {
      id: 'analytics',
      page: 'analytics',
      label: 'Painel da Verdade',
      labelEn: 'Truth Dashboard',
      category: 'data-performance',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      desc: 'Métricas objetivas de performance e processo.',
      descEn: 'Objective process and performance metrics.',
      proOnly: true
    },
    {
      id: 'tradeanatomy',
      page: 'tradeanatomy',
      label: 'Anatomia dos Trades',
      labelEn: 'Trade Anatomy',
      category: 'data-performance',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/><path d="m3 8 6-5 6 7 6-5"/></svg>`,
      desc: 'Estatísticas de payoff, gatilhos e duração.',
      descEn: 'Payoff, trigger and holding time statistics.',
      proOnly: true
    },
    {
      id: 'tradelibrary',
      page: 'tradelibrary',
      label: 'Biblioteca de Trades',
      labelEn: 'Trade Library',
      category: 'data-performance',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
      desc: 'Revise prints e estudos por ativo e período.',
      descEn: 'Review charts and setups by asset and period.',
      proOnly: true
    },
    {
      id: 'platformaccess',
      page: 'platformaccess',
      label: 'Uso da Plataforma',
      labelEn: 'Platform Access',
      category: 'data-performance',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      desc: 'Métricas de foco e consistência de uso.',
      descEn: 'Focus metrics and platform usage consistency.',
      proOnly: true
    },
    {
      id: 'review',
      page: 'review',
      label: 'Revisão Mensal',
      labelEn: 'Monthly Review',
      category: 'data-performance',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>`,
      desc: 'Fechamento do mês e plano de melhoria contínua.',
      descEn: 'Monthly close and continuous improvement plan.',
      proOnly: true
    },

    // Mentalidade & Zen
    {
      id: 'mindset',
      page: 'mindset',
      label: 'Mentalidade',
      labelEn: 'Mindset Hub',
      category: 'mindset',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 4.5A4.5 4.5 0 0 0 5 9v1a4 4 0 0 0 1 7.87V19a2 2 0 0 0 2 2h1.5M14.5 4.5A4.5 4.5 0 0 1 19 9v1a4 4 0 0 1-1 7.87V19a2 2 0 0 1-2 2h-1.5M9.5 4.5A3.5 3.5 0 0 1 12 6a3.5 3.5 0 0 1 2.5-1.5M12 6v15M8 10h1.5M14.5 10H16M8 14h1.5M14.5 14H16"/></svg>`,
      desc: 'Hub central de clareza mental e disciplina.',
      descEn: 'Central hub for mental clarity and discipline.',
      proOnly: true
    },
    {
      id: 'zen',
      page: 'zen',
      label: 'Trader Zen',
      labelEn: 'Trader Zen',
      category: 'mindset',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`,
      desc: 'Respiração e descompressão pré/pós pregão.',
      descEn: 'Breathing and decompression pre/post session.',
      proOnly: true
    },
    {
      id: 'emotionalintelligence',
      page: 'emotionalintelligence',
      label: 'Analisador Emocional',
      labelEn: 'Emotional Analyzer',
      category: 'mindset',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
      desc: 'Correlação de humor, estresse e execução.',
      descEn: 'Correlation of mood, stress and execution.',
      proOnly: true
    },
    {
      id: 'traderrules',
      page: 'traderrules',
      label: 'Regras do Trader',
      labelEn: 'Trader Rules',
      category: 'mindset',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
      desc: 'Princípios inegociáveis do seu plano de voo.',
      descEn: 'Non-negotiable principles of your flight plan.',
      proOnly: true
    },
    {
      id: 'wisdom',
      page: 'wisdom',
      label: 'Sabedoria do Trader',
      labelEn: 'Trader Wisdom',
      category: 'mindset',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
      desc: 'Aforismos e princípios de mestres dos mercados.',
      descEn: 'Aphorisms and principles from market masters.',
      proOnly: true
    },
    {
      id: 'traderprofile',
      page: 'traderprofile',
      label: 'Testes de Perfil',
      labelEn: 'Trader Profile',
      category: 'mindset',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      desc: 'Autoavaliação de tolerância a risco e perfil.',
      descEn: 'Self-assessment of risk tolerance and profile.',
      proOnly: true
    },

    // Recursos & Sistema
    {
      id: 'materials',
      page: 'materials',
      label: 'Loja do Trader',
      labelEn: 'Trader Store',
      category: 'resources',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
      desc: 'Materiais, cursos e ferramentas do método.',
      descEn: 'Materials, courses and tools of the method.',
      proOnly: false
    },
    {
      id: 'settings',
      page: 'settings',
      label: 'Configurações',
      labelEn: 'Settings',
      category: 'resources',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      desc: 'Tema, idioma, formato de navegação e preferências.',
      descEn: 'Theme, language, navigation layout and preferences.',
      proOnly: false
    },
    {
      id: 'manual',
      page: 'manual',
      label: 'Manual do Software',
      labelEn: 'Software Manual',
      category: 'resources',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>`,
      desc: 'Guia completo de conceitos e funcionalidades.',
      descEn: 'Comprehensive guide of concepts and tools.',
      proOnly: false
    },
    {
      id: 'glossary',
      page: 'glossary',
      label: 'Glossário do Método',
      labelEn: 'Method Glossary',
      category: 'resources',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
      desc: 'Consulte os termos técnicos do Healthy Trend.',
      descEn: 'Check technical terms of the Healthy Trend method.',
      proOnly: false
    },
    {
      id: 'about',
      page: 'about',
      label: 'Sobre',
      labelEn: 'About',
      category: 'resources',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      desc: 'Missão, arquitetura e manifesto da plataforma.',
      descEn: 'Mission, architecture and platform manifesto.',
      proOnly: false
    }
  ];

  // 3. OFFICIAL PRESETS (Determines Organization & Quick Access without hiding anything)
  const PRESETS = {
    fast: {
      id: 'fast',
      label: 'Fast',
      labelEn: 'Fast',
      desc: 'Acesso ultrarrápido às ferramentas mais frequentes (Desktop, Novo Trade, Diário, Watchlist, Gráficos), com categorias organizadas para fluxo ágil.',
      descEn: 'Lightning-fast access to most frequent tools with streamlined categories.',
      quickAccess: ['today', 'newtrade', 'journal', 'watchlist', 'charts'],
      categoryOrder: ['daily', 'portfolio-risk', 'market-analysis', 'training-recovery', 'simulators', 'data-performance', 'mindset', 'resources'],
      collapsedCategories: ['simulators', 'data-performance', 'mindset', 'resources']
    },
    trader_focus: {
      id: 'trader_focus',
      label: 'Trader Focus',
      labelEn: 'Trader Focus',
      desc: 'Organização estritamente orientada à execução do pregão, enfatizando Operação, Risco, Mercado e Treinamento.',
      descEn: 'Strict execution-focused hierarchy emphasizing Daily Trading, Risk, Market and Training.',
      quickAccess: ['today', 'newtrade', 'watchlist', 'charts', 'positions', 'journal'],
      categoryOrder: ['daily', 'portfolio-risk', 'market-analysis', 'training-recovery', 'data-performance', 'simulators', 'mindset', 'resources'],
      collapsedCategories: ['data-performance', 'simulators', 'mindset', 'resources']
    },
    full: {
      id: 'full',
      label: 'Professional / Completo',
      labelEn: 'Professional / Full',
      desc: 'Visão integral de todas as dimensões da plataforma: Operação, Treinamento, Mercado, Simuladores, Risco, Performance e Mindset.',
      descEn: 'Complete structured view of all platform pillars.',
      quickAccess: ['today', 'newtrade', 'journal', 'watchlist', 'charts', 'dashboard'],
      categoryOrder: ['daily', 'training-recovery', 'market-analysis', 'simulators', 'portfolio-risk', 'data-performance', 'mindset', 'resources'],
      collapsedCategories: []
    }
  };

  const STORAGE_KEY_STATE = 'healthy-navigation-state-v2';
  const STORAGE_KEY_LAYOUT = 'healthy-trend-navigation-layout-v1';

  /**
   * Navigation System Model State Manager
   */
  class NavigationSystemModel {
    constructor() {
      this.categories = CATEGORIES;
      this.modules = MODULES;
      this.presets = PRESETS;
      this.state = this.getDefaultState('fast');
    }

    getDefaultState(presetKey = 'fast') {
      const preset = this.presets[presetKey] || this.presets.fast;
      const key = this.presets[presetKey] ? presetKey : 'fast';

      return {
        style: 'sidebar', // 'sidebar' | 'top' | 'tiles'
        preset: key,
        quickAccess: [...preset.quickAccess],
        categoryOrder: [...preset.categoryOrder],
        collapsedCategories: [...(preset.collapsedCategories || [])]
      };
    }

    /**
     * Resolves the navigation tree based on current state.
     * GUARANTEE: Every registered module is present in its official category, and quick access reflects the active preset.
     */
    getNavigationTree(overrideState = null) {
      const state = overrideState || this.state;
      const lang = typeof root.appLanguage !== 'undefined' ? root.appLanguage : 'pt-BR';
      const isEn = lang === 'en-US';

      // Map modules by ID
      const moduleMap = new Map();
      this.modules.forEach(m => {
        moduleMap.set(m.id, {
          ...m,
          currentLabel: isEn ? (m.labelEn || m.label) : m.label,
          currentDesc: isEn ? (m.descEn || m.desc) : m.desc,
          isQuickAccess: state.quickAccess.includes(m.id)
        });
      });

      // Quick Access list (preserving quickAccess array order)
      const quickAccessItems = state.quickAccess
        .map(id => moduleMap.get(id))
        .filter(Boolean);

      // Build categories list (preserving categoryOrder)
      const categoriesById = new Map();
      this.categories.forEach(cat => {
        categoriesById.set(cat.id, {
          ...cat,
          currentLabel: isEn ? (cat.labelEn || cat.label) : cat.label,
          isCollapsed: state.collapsedCategories.includes(cat.id),
          items: []
        });
      });

      // Group modules by their official assigned category (excluding items already in quickAccess to eliminate duplicates)
      const quickAccessSet = new Set(state.quickAccess);
      this.modules.forEach(m => {
        if (quickAccessSet.has(m.id)) return; // Se está no Acesso Rápido, não repete na categoria abaixo
        const cat = categoriesById.get(m.category);
        if (cat) {
          cat.items.push(moduleMap.get(m.id));
        }
      });

      // Assemble final categories array in categoryOrder
      const orderedCategories = [];
      const visited = new Set();
      (state.categoryOrder || []).forEach(catId => {
        if (categoriesById.has(catId)) {
          orderedCategories.push(categoriesById.get(catId));
          visited.add(catId);
        }
      });

      // Ensure no category was dropped
      this.categories.forEach(cat => {
        if (!visited.has(cat.id) && categoriesById.has(cat.id)) {
          orderedCategories.push(categoriesById.get(cat.id));
        }
      });

      return {
        style: state.style,
        preset: state.preset,
        quickAccess: quickAccessItems,
        categories: orderedCategories
      };
    }

    /**
     * Toggles collapsed state of a category
     */
    toggleCategoryCollapsed(categoryId) {
      const idx = this.state.collapsedCategories.indexOf(categoryId);
      if (idx === -1) {
        this.state.collapsedCategories.push(categoryId);
      } else {
        this.state.collapsedCategories.splice(idx, 1);
      }
      this.save();
    }

    /**
     * Checks if a category is collapsed
     */
    isCategoryCollapsed(categoryId) {
      if (!Array.isArray(this.state.collapsedCategories)) return false;
      return this.state.collapsedCategories.includes(categoryId);
    }

    /**
     * Applies an official preset (FAST, TRADER_FOCUS, FULL)
     */
    applyPreset(presetKey) {
      const preset = this.presets[presetKey];
      if (!preset) return;
      this.state.preset = presetKey;
      this.state.quickAccess = [...preset.quickAccess];
      this.state.categoryOrder = [...preset.categoryOrder];
      this.state.collapsedCategories = [...(preset.collapsedCategories || [])];
      this.save();
    }

    /**
     * Changes presentation style (sidebar, top, tiles)
     */
    setStyle(style) {
      if (['sidebar', 'top', 'tiles'].includes(style)) {
        this.state.style = style;
        this.save();
      }
    }

    /**
     * Validates that 100% of modules are accounted for without omissions or duplicates
     */
    validateIntegrity(tree = null) {
      const resolved = tree || this.getNavigationTree();
      const representedModules = new Set();
      
      resolved.quickAccess.forEach(it => representedModules.add(it.id));
      resolved.categories.forEach(cat => {
        cat.items.forEach(it => representedModules.add(it.id));
      });

      const missing = this.modules.filter(m => !representedModules.has(m.id));
      return {
        isValid: missing.length === 0,
        totalModules: this.modules.length,
        representedCount: representedModules.size,
        missingModules: missing.map(m => m.id)
      };
    }

    /**
     * Persistence to Storage
     */
    load(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      if (!storage) return;
      try {
        // Load layout style from legacy or new storage
        const storedLayout = storage.getItem(STORAGE_KEY_LAYOUT);
        const storedState = storage.getItem(STORAGE_KEY_STATE);

        if (storedState) {
          const parsed = JSON.parse(storedState);
          const validPresetKey = (parsed && this.presets[parsed.preset]) ? parsed.preset : 'fast';
          const defaultPresetState = this.getDefaultState(validPresetKey);
          this.state = {
            ...defaultPresetState,
            style: (parsed && ['sidebar', 'top', 'tiles'].includes(parsed.style)) ? parsed.style : defaultPresetState.style,
            preset: validPresetKey,
            quickAccess: [...defaultPresetState.quickAccess],
            categoryOrder: [...defaultPresetState.categoryOrder],
            collapsedCategories: (parsed && Array.isArray(parsed.collapsedCategories)) ? parsed.collapsedCategories : defaultPresetState.collapsedCategories
          };
        }

        if (storedLayout && ['sidebar', 'top', 'tiles'].includes(storedLayout)) {
          this.state.style = storedLayout;
        }
      } catch (e) {
        console.warn('[NavigationSystemModel] Failed to load state from storage:', e);
      }
    }

    save(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
      if (!storage) return;
      try {
        storage.setItem(STORAGE_KEY_STATE, JSON.stringify(this.state));
        storage.setItem(STORAGE_KEY_LAYOUT, this.state.style);
        
        // Synchronize with workspace-state if available
        if (typeof root.healthyTrendWorkspace?.setKey === 'function') {
          root.healthyTrendWorkspace.setKey('navigationState', this.state);
        }
      } catch (e) {
        console.warn('[NavigationSystemModel] Failed to save state to storage:', e);
      }
    }
  }

  // Export for Node/Tests and Browser
  const instance = new NavigationSystemModel();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      NavigationSystemModel,
      CATEGORIES,
      MODULES,
      PRESETS,
      instance
    };
  }

  root.NavigationSystemModel = NavigationSystemModel;
  root.navigationSystem = instance;

})(typeof window !== 'undefined' ? window : globalThis);

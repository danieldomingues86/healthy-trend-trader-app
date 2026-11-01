/**
 * HEALTHY TREND TRADER - UNIFIED NAVIGATION SYSTEM
 * 
 * Features:
 * - Single Source of Truth architecture (consumes NavigationSystemModel)
 * - Three synchronized presentations:
 *   1. Menu Lateral (Sidebar with Quick Access & expandable/collapsible categories)
 *   2. Menu Superior (Top Navigation Bar with Quick Access pills & Category Dropdowns)
 *   3. Menu em Blocos (Categorized Tiles Hub with Preset toolbar & category card blocks)
 * - Organization Presets (FAST, TRADER_FOCUS, FULL) — NEVER hides any module
 * - Trader Personalization (Quick Access toggle ⭐, moving modules between categories)
 * - Collapsible sidebar (expanded 248px vs collapsed 72px) with flyouts & tooltips
 * - Active state sync with window.go()
 * - Full theme support (Healthy Green & Premium Gold)
 * - Responsive from mobile to widescreen/ultrawide
 */

(function(root) {
  'use strict';

  const STORAGE_KEY_COLLAPSED = 'healthy-sidebar-collapsed';

  // Master baseline structures preserved for static test suites & fallback
  const NAV_STRUCTURE = [
    {
      id: 'market-analysis',
      isGroup: true,
      label: 'Análise de Mercado',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      header: 'ANÁLISE DE MERCADO',
      items: [
        {
          id: 'opportunityradar',
          title: 'Radar de Oportunidades',
          desc: 'Ativos prontos para entrada no gráfico Diário.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
          page: 'opportunityradar'
        },
        {
          id: 'relativestrength',
          title: 'Força Relativa',
          desc: 'Identificar os ativos líderes do mercado.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
          page: 'relativestrength'
        },
        {
          id: 'marketcycle',
          title: 'Ciclo de Mercado',
          desc: 'Verificar o regime de mercado e o sinal de permissão para operar.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
          page: 'marketcycle'
        },
        {
          id: 'marketcentral',
          title: 'Central de Mercado',
          desc: 'Consultar a visão geral do ambiente de mercado.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/><circle cx="12" cy="12" r="3"/></svg>`,
          page: 'marketcentral'
        },
        {
          id: 'fundamentals',
          title: 'Análise Fundamentalista',
          desc: 'Consultar os fundamentos e a qualidade dos ativos.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2 2 7h20L12 2Z"/></svg>`,
          page: 'fundamentals'
        },
        {
          id: 'markettreemap',
          title: 'Setores',
          desc: 'Treemap interativo de todo o mercado acionário da B3.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
          page: 'markettreemap'
        }
      ]
    },
    {
      id: 'daily',
      groupLabel: 'Operação Diária',
      items: [
        {
          id: 'today',
          label: 'Meu Desktop',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
          page: 'today'
        },
        {
          id: 'newtrade',
          label: 'Novo Trade',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
          page: 'newtrade'
        },
        {
          id: 'journal',
          label: 'Diário de Trader',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
          page: 'journal'
        },
        {
          id: 'dailyroutine',
          label: 'Rotina Diária',
          icon: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 2.5H12a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V4a1.5 1.5 0 0 1 1.5-1.5h1.5"/><rect x="5.5" y="1" width="5" height="3" rx="1"/><path d="M5.5 7.5h5M5.5 11h3.5"/></svg>`,
          page: 'dailyroutine'
        },
        {
          id: 'watchlist',
          label: 'Watchlist',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
          page: 'watchlist'
        },
        {
          id: 'habits',
          label: 'Hábitos',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
          page: 'habits'
        }
      ]
    },
    {
      id: 'training-recovery',
      isGroup: true,
      label: 'Treinamento',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
      header: 'TREINAMENTO',
      items: [
        {
          id: 'mission',
          title: 'Missão',
          desc: 'Jornada de foco e recuperação.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
          page: 'mission'
        },
        {
          id: 'tradertraining',
          title: 'Prática Deliberada',
          desc: 'Metas e consistência de hábitos.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
          page: 'tradertraining'
        },
        {
          id: 'conquests',
          title: 'Minhas Conquistas',
          desc: 'Embolsei. Cumpri. Comemorei.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
          page: 'conquests'
        },
        {
          id: 'deservingdiary',
          title: 'Diário do Merecimento',
          desc: 'Psicologia do lucro e aprendizado.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
          page: 'deservingdiary'
        },
        {
          id: 'mistakesbook',
          title: 'Erros & Lições',
          desc: 'Falhas e aprendizados.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M10 10l4 4M14 10l-4 4"/></svg>`,
          page: 'mistakesbook'
        }
      ]
    },

    {
      id: 'simulators',
      isGroup: true,
      label: 'Simuladores',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="6 10 9 7 13 11 18 6"/></svg>`,
      header: 'SIMULADORES',
      items: [
        {
          id: 'tradesimulator',
          title: 'Simulador de Trades',
          desc: 'Modo Oficial — Regras vigentes do método.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><polyline points="6 10 9 7 13 11 18 6"/></svg>`,
          page: 'tradesimulator'
        },
        {
          id: 'researchlab',
          title: 'Laboratório de Pesquisa',
          desc: 'Modo Aberto — Descobertas e regras candidatas.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"/></svg>`,
          page: 'researchlab'
        },
        {
          id: 'forecast',
          title: 'Simulador de Equity',
          desc: 'Projeções e curvas de capital.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 7-8.5 8.5-5-5L2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
          page: 'forecast'
        },
        {
          id: 'riskofruin',
          title: 'Risco de Ruína',
          desc: 'Monte Carlo e proteção patrimonial.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
          page: 'riskofruin'
        }
      ]
    },
    {
      id: 'portfolio-risk',
      isGroup: true,
      label: 'Carteira & Risco',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
      header: 'CARTEIRA & RISCO',
      items: [
        {
          id: 'dashboard',
          title: 'Patrimônio',
          desc: 'Visão patrimonial e alocações.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
          page: 'dashboard'
        },
        {
          id: 'positions',
          title: 'Posições Abertas',
          desc: 'Gestão de stops e trailing.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
          page: 'positions'
        },
        {
          id: 'closedpositions',
          title: 'Posições Encerradas',
          desc: 'Histórico e revisão de trades.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="m9 14 2 2 4-4"/></svg>`,
          page: 'closedpositions'
        },
        {
          id: 'portfolioheat',
          title: 'Portfolio Heat',
          desc: 'Termômetro do risco da carteira.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M17.66 12.34l1.41-1.41M12 14a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>`,
          page: 'portfolioheat'
        },
        {
          id: 'riskpolicy',
          title: 'Política de Risco',
          desc: 'Regras e limites operacionais.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
          page: 'riskpolicy'
        },
        {
          id: 'assetblacklist',
          title: 'Ativos Blacklist',
          desc: 'Ativos incompatíveis com seu perfil.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="10" r="6"/><path d="M6 16v3m6-3v3M6 19h6M6 9h.01M12 9h.01M9 12v1M16 16l5 5m0-5-5 5"/></svg>`,
          page: 'assetblacklist'
        }
      ]
    },
    {
      id: 'data-performance',
      isGroup: true,
      label: 'Dados & Performance',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      header: 'DADOS & PERFORMANCE',
      items: [
        {
          id: 'analytics',
          title: 'Painel da Verdade',
          desc: 'Métricas objetivas de performance e processo.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
          page: 'analytics'
        },
        {
          id: 'tradeanatomy',
          title: 'Anatomia dos Trades',
          desc: 'Estatísticas de payoff, gatilhos e duração.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/><path d="m3 8 6-5 6 7 6-5"/></svg>`,
          page: 'tradeanatomy'
        },
        {
          id: 'tradelibrary',
          title: 'Biblioteca de Trades',
          desc: 'Revise prints e estudos por ativo e período.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
          page: 'tradelibrary'
        },
        {
          id: 'platformaccess',
          title: 'Uso da Plataforma',
          desc: 'Métricas de foco e consistência de uso.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
          page: 'platformaccess'
        },
        {
          id: 'review',
          title: 'Revisão Mensal',
          desc: 'Fechamento do mês e plano de melhoria contínua.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>`,
          page: 'review'
        },
        {
          id: 'eventplaybook',
          title: 'Registro de Eventos',
          desc: 'Acompanhar eventos relevantes que podem afetar suas operações.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>`,
          page: 'eventplaybook'
        }
      ]
    },
    {
      id: 'mindset',
      label: 'Mentalidade',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 4.5A4.5 4.5 0 0 0 5 9v1a4 4 0 0 0 1 7.87V19a2 2 0 0 0 2 2h1.5M14.5 4.5A4.5 4.5 0 0 1 19 9v1a4 4 0 0 1-1 7.87V19a2 2 0 0 1-2 2h-1.5M9.5 4.5A3.5 3.5 0 0 1 12 6a3.5 3.5 0 0 1 2.5-1.5M12 6v15M8 10h1.5M14.5 10H16M8 14h1.5M14.5 14H16"/></svg>`,
      page: 'mindset'
    }
  ];

  const FOOTER_STRUCTURE = [
    {
      id: 'materials',
      label: 'Loja do Trader',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
      page: 'materials'
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      page: 'settings'
    },
    {
      id: 'manual',
      label: 'Manual do Software',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>`,
      page: 'manual'
    },
    {
      id: 'glossary',
      label: 'Glossário do Método',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
      page: 'glossary'
    },
    {
      id: 'about',
      label: 'Sobre',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      page: 'about'
    }
  ];

  class SidebarNavigation {
    constructor() {
      this.isCollapsed = false;
      this.activeFlyoutGroup = null;
      this.activeTriggerBtn = null;
      this.isFlyoutPinned = false;
      this.flyoutEl = null;
      this.tooltipEl = null;
      this.closeTimeout = null;
      this.activePageId = 'today';
      this.navStructure = NAV_STRUCTURE;
      this.footerStructure = FOOTER_STRUCTURE;
      
      // Connect to unified NavigationSystemModel
      this.model = root.navigationSystem || (root.NavigationSystemModel ? new root.NavigationSystemModel() : null);
    }

    init() {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;

      // Load model state
      if (this.model && typeof this.model.load === 'function') {
        this.model.load();
      }

      // Sync persisted navigation layout style from model to body
      if (this.model && this.model.state && ['sidebar', 'top', 'tiles'].includes(this.model.state.style)) {
        if (!document.body.dataset.navigationLayout || document.body.dataset.navigationLayout !== this.model.state.style) {
          document.body.dataset.navigationLayout = this.model.state.style;
        }
      }

      // Load collapsed state
      try {
        this.isCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true';
      } catch (e) {
        this.isCollapsed = false;
      }
      this.applyCollapsedState();

      // Create flyout & tooltip containers if not present
      this.ensureFlyoutElement();
      this.ensureTooltipElement();

      // Render new sidebar structure
      this.renderSidebar(sidebar);

      // Bind global events (click outside, ESC, resize)
      this.bindGlobalEvents();

      // Hook navigation and top navigation
      this.hookNavigation();
      this.hookTopNavigation();
      this.observeLayoutChanges();

      // Hook navigation hub and settings integration
      this.hookUnifiedComponents();
      this.setupNavigationLayoutSettings();

      // Ensure top navigation items if layout is already 'top'
      if (document.body.dataset.navigationLayout === 'top') {
        this.ensureTopNavigationItems(true);
      }

      // Sync market focus guard placement
      if (typeof root.placeMarketFocusGuard === 'function') {
        root.placeMarketFocusGuard();
      }

      // Sync active state from current visible page
      const activeSection = document.querySelector('.page.active');
      if (activeSection && activeSection.id) {
        this.setActivePage(activeSection.id);
      }
    }

    getTree() {
      if (this.model && typeof this.model.getNavigationTree === 'function') {
        return this.model.getNavigationTree();
      }
      return null;
    }

    applyCollapsedState() {
      if (this.isCollapsed) {
        document.body.classList.add('sidebar-collapsed');
      } else {
        document.body.classList.remove('sidebar-collapsed');
      }
      const btn = document.querySelector('.sidebar-collapse-btn');
      if (btn) {
        btn.textContent = this.isCollapsed ? '»' : '«';
        btn.setAttribute('title', this.isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral');
        btn.setAttribute('aria-expanded', String(!this.isCollapsed));
      }
    }

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
      try {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, String(this.isCollapsed));
      } catch (e) {}
      this.applyCollapsedState();
      this.closeFlyout(true);
      this.hideTooltip();
    }

    localizedLabel(page, fallback) {
      if (typeof root.getNavigationLabel === 'function') {
        const custom = root.getNavigationLabel(page);
        if (custom) return custom;
      }
      if (typeof root.uiText === 'function') {
        return root.uiText(fallback);
      }
      return fallback;
    }

    refresh() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        this.closeFlyout(true);
        this.renderSidebar(sidebar);
        this.applyCollapsedState();
      }
      const activeSection = document.querySelector('.page.active');
      this.setActivePage(activeSection?.id || this.activePageId || 'today');
      
      if (document.body.dataset.navigationLayout === 'top') {
        this.ensureTopNavigationItems(true);
      }
      if (document.body.dataset.navigationLayout === 'tiles' && document.getElementById('navigationHub')?.classList.contains('open')) {
        this.renderNavigationHub();
      }
      this.setupNavigationLayoutSettings();
    }

    ensureFlyoutElement() {
      if (this.flyoutEl) return;
      this.flyoutEl = document.createElement('div');
      this.flyoutEl.className = 'sidebar-flyout';
      this.flyoutEl.setAttribute('role', 'menu');
      this.flyoutEl.setAttribute('aria-label', 'Submenu');

      // Prevent closing when mouse is inside flyout
      this.flyoutEl.addEventListener('mouseenter', () => this.cancelClose());
      this.flyoutEl.addEventListener('mouseleave', () => {
        if (!this.isFlyoutPinned) {
          this.scheduleClose();
        }
      });

      document.body.appendChild(this.flyoutEl);
    }

    ensureTooltipElement() {
      if (this.tooltipEl) return;
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.className = 'sidebar-tooltip';
      this.tooltipEl.setAttribute('role', 'tooltip');
      document.body.appendChild(this.tooltipEl);
    }

    renderSidebar(sidebar) {
      const existingControls = sidebar.querySelector('#topNavigationControls');
      const existingActions = sidebar.querySelector('.top-actions');

      sidebar.innerHTML = `
        <header class="sidebar-header">
          <a class="sidebar-brand-link" onclick="go('today')" title="Início">
            <div class="sidebar-brand-mark"></div>
            <div class="sidebar-brand-titles">
              <strong><em>Healthy</em> Trend Trader</strong>
              <small>V4 PREMIUM</small>
            </div>
          </a>
          <button class="sidebar-collapse-btn" type="button" aria-label="Alternar menu lateral" title="${this.isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}">
            ${this.isCollapsed ? '»' : '«'}
          </button>
        </header>

        <div class="sidebar-nav-container nav">
          ${this.renderNavGroups()}
        </div>

        <footer class="sidebar-footer">
          <div class="nav" style="display:flex; flex-direction:column; gap:3px;">
            ${this.renderFooterItems()}
          </div>
          <div class="sidebar-quote-card">
            <p class="sidebar-quote-text">${root.appLanguage === 'en-US' ? '“Discipline turns opportunities into results.”' : '“Disciplina transforma oportunidades em resultados.”'}</p>
          </div>
        </footer>
      `;

      const isTopLayout = document.body.dataset.navigationLayout === 'top';
      if (isTopLayout) {
        if (existingControls) {
          sidebar.appendChild(existingControls);
        }
        if (existingActions) {
          sidebar.appendChild(existingActions);
        }
      } else {
        existingControls?.remove();
        if (existingActions) {
          const topbar = document.querySelector('.topbar');
          if (topbar && !topbar.contains(existingActions)) {
            topbar.appendChild(existingActions);
          }
        }
      }

      this.bindSidebarEvents(sidebar);

      // Re-apply subscription access if defined
      if (typeof root.applySubscriptionAccess === 'function') {
        root.applySubscriptionAccess();
      }
    }

    renderNavGroups() {
      const tree = this.getTree();

      // If unified tree is available, render with Quick Access + Categories
      if (tree) {
        let html = '';

        // 1. ACESSO RÁPIDO (Always prominent at top of sidebar)
        if (tree.quickAccess && tree.quickAccess.length > 0) {
          const quickLabel = root.appLanguage === 'en-US' ? 'Quick Access' : 'Acesso Rápido';
          html += `
            <div class="sidebar-group sidebar-quick-access">
              <span class="sidebar-group-label"><span class="quick-star">★</span> ${quickLabel}</span>
              ${tree.quickAccess.map((item) => this.renderDirectButton(item)).join('')}
            </div>
          `;
        }

        // 2. CATEGORIES
        tree.categories.forEach((cat) => {
          if (cat.id === 'resources') return; // Rendered in footer
          if (!cat.items || cat.items.length === 0) return; // All items in Quick Access or empty

          // Category accordion (expanded: header with label + items; collapsed: header hidden via CSS, icons only)
          const catLabel = cat.currentLabel || cat.label;
          const isCatCollapsed = Boolean(cat.isCollapsed);
          html += `
            <div class="sidebar-group sidebar-category-group ${isCatCollapsed ? 'is-collapsed' : 'is-expanded'}" data-group-id="${cat.id}">
              <button class="sidebar-category-header" type="button" data-cat-toggle="${cat.id}" aria-expanded="${!isCatCollapsed}">
                <span class="sidebar-cat-label">${catLabel}</span>
                <span class="sidebar-cat-arrow">${isCatCollapsed ? '›' : '▾'}</span>
              </button>
              <div class="sidebar-category-items ${isCatCollapsed ? 'collapsed' : ''}">
                ${cat.items.map((item) => this.renderDirectButton(item)).join('')}
              </div>
            </div>
          `;
        });

        return html;
      }

      // Fallback baseline for static tests
      return NAV_STRUCTURE.map((block) => {
        if (block.groupLabel) {
          return `
            <div class="sidebar-group">
              <span class="sidebar-group-label">${this.localizedLabel(block.id, block.groupLabel)}</span>
              ${block.items.map((item) => this.renderDirectButton(item)).join('')}
            </div>
          `;
        }

        if (block.isGroup) {
          return this.renderGroupButton(block);
        }

        if (block.page) {
          return this.renderDirectButton(block);
        }

        return '';
      }).join('');
    }

    renderFooterItems() {
      return FOOTER_STRUCTURE.map((item) => {
        if (item.isGroup) {
          return this.renderGroupButton(item);
        }
        return this.renderDirectButton(item);
      }).join('');
    }

    renderDirectButton(item) {
      const label = this.localizedLabel(item.page, item.label || item.currentLabel);
      const isProUser = typeof root.isProfessional === 'function' ? root.isProfessional() : false;
      const proPages = root.professionalPages || new Set();
      const isLocked = proPages.has(item.page) && !isProUser;
      const proBadge = isLocked ? `<span class="sidebar-badge-pro">PRO</span>` : '';
      const arrowHtml = item.hasArrow ? `<span class="sidebar-btn-arrow">›</span>` : '';
      return `<button class="sidebar-btn nav-btn ${isLocked ? 'plan-locked' : ''}" type="button" data-page="${item.page}" data-nav-id="${item.id}" data-label="${label}"><span class="sidebar-btn-ico">${item.icon}</span><span class="sidebar-btn-label">${label}</span>${proBadge}${arrowHtml}</button>`;
    }

    renderGroupButton(group) {
      const label = this.localizedLabel(group.id, group.label || group.currentLabel);
      return `<button class="sidebar-btn sidebar-group-trigger" type="button" data-group-id="${group.id}" data-label="${label}" aria-haspopup="true" aria-expanded="false"><span class="sidebar-btn-ico">${group.icon}</span><span class="sidebar-btn-label">${label}</span><span class="sidebar-btn-arrow">›</span></button>`;
    }

    bindSidebarEvents(sidebar) {
      // Collapse button
      sidebar.querySelector('.sidebar-collapse-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCollapse();
      });

      // Direct page buttons
      sidebar.querySelectorAll('.sidebar-btn:not(.sidebar-group-trigger)').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.closeFlyout(true);
          const page = btn.dataset.page;
          if (page && typeof root.go === 'function') {
            root.go(page);
          }
        });

        // Hover tooltip for collapsed mode
        btn.addEventListener('mouseenter', () => {
          if (this.isCollapsed) {
            this.showTooltip(btn, btn.dataset.label);
          }
        });
        btn.addEventListener('mouseleave', () => this.hideTooltip());
      });

      // Category accordion headers (expanded mode)
      sidebar.querySelectorAll('[data-cat-toggle]').forEach((headerBtn) => {
        const catId = headerBtn.dataset.catToggle;
        const groupDef = this.findGroupDef(catId);

        // Hover sobre menu recolhido: exibe os subitens em modo flutuante (flyout)
        headerBtn.addEventListener('mouseenter', () => {
          const isCollapsed = this.model ? this.model.isCategoryCollapsed(catId) : false;
          if (isCollapsed && groupDef) {
            this.cancelClose();
            this.openFlyout(groupDef, headerBtn, false);
          }
        });

        headerBtn.addEventListener('mouseleave', () => {
          const isCollapsed = this.model ? this.model.isCategoryCollapsed(catId) : false;
          if (isCollapsed && !this.isFlyoutPinned) {
            this.scheduleClose();
          }
        });

        // Clique: expande/recolhe inline no sidebar e para o modo hover flutuante
        headerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeFlyout(true);
          if (this.model && typeof this.model.toggleCategoryCollapsed === 'function') {
            this.model.toggleCategoryCollapsed(catId);
            this.refresh();
          }
        });
      });

      // Group trigger buttons (Flyouts in collapsed mode)
      sidebar.querySelectorAll('.sidebar-group-trigger').forEach((btn) => {
        const groupId = btn.dataset.groupId;
        const groupDef = this.findGroupDef(groupId);
        if (!groupDef) return;

        btn.addEventListener('mouseenter', () => {
          this.cancelClose();
          if (this.isCollapsed) {
            this.hideTooltip();
          }
          this.openFlyout(groupDef, btn, false);
        });

        btn.addEventListener('mouseleave', () => {
          if (!this.isFlyoutPinned) {
            this.scheduleClose();
          }
        });

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.activeFlyoutGroup === groupDef.id && this.isFlyoutPinned) {
            this.closeFlyout(true);
          } else {
            this.openFlyout(groupDef, btn, true);
          }
        });
      });
    }

    findGroupDef(groupId) {
      const tree = this.getTree();
      if (tree) {
        const cat = tree.categories.find(c => c.id === groupId);
        if (cat) {
          return {
            id: cat.id,
            label: cat.currentLabel || cat.label,
            header: (cat.currentLabel || cat.label).toUpperCase(),
            icon: cat.icon,
            items: cat.items.map(it => ({
              id: it.id,
              page: it.page,
              title: it.currentLabel || it.label,
              desc: it.currentDesc || it.desc,
              icon: it.icon
            }))
          };
        }
      }

      const all = [...NAV_STRUCTURE, ...FOOTER_STRUCTURE];
      for (const item of all) {
        if (item.id === groupId) return item;
      }
      return null;
    }

    openFlyout(groupDef, triggerBtn, isPinned = false) {
      if (document.body.dataset.navigationLayout === 'top' || document.body.dataset.navigationLayout === 'tiles') {
        return;
      }

      this.cancelClose();
      this.activeFlyoutGroup = groupDef.id;
      this.activeTriggerBtn = triggerBtn;
      this.isFlyoutPinned = isPinned;

      // Update trigger visual
      document.querySelectorAll('.sidebar-group-trigger, .sidebar-category-header').forEach((b) => {
        b.classList.toggle('flyout-open', b === triggerBtn);
        if (b.classList.contains('sidebar-group-trigger')) {
          b.setAttribute('aria-expanded', String(b === triggerBtn));
        }
      });

      const isProUser = typeof root.isProfessional === 'function' ? root.isProfessional() : false;
      const proPages = root.professionalPages || new Set();
      const isEn = root.appLanguage === 'en-US';
      const items = groupDef.items || [];
      const itemCount = items.length;
      // No maximo 3 cards por linha em telas grandes
      const maxCols = Math.min(itemCount, 3);
      // 3 colunas: ~660px, 2 colunas: ~460px, 1 coluna: ~280px
      const idealWidth = maxCols === 1 ? 280 : (maxCols === 2 ? 460 : 660);

      // Render flyout content (Responsive Cards Grid — Max 3 colunas)
      this.flyoutEl.innerHTML = `
        <div class="flyout-header">
          <span class="flyout-header-title">${this.localizedLabel(groupDef.id, groupDef.header || groupDef.label)}</span>
          ${isPinned ? `<span class="flyout-pin-badge" style="font-size:9px; color:#638271; font-weight:600; cursor:pointer;" title="${isEn ? 'Click to unpin (ESC)' : 'Clique para desfixar (ESC)'}">${isEn ? 'PINNED (ESC)' : 'FIXADO (ESC)'}</span>` : ''}
        </div>
        <div class="flyout-cards-grid flyout-items-list nav" data-grid-cols="${maxCols}" role="menu">
          ${items.map((sub) => {
            const isActive = this.activePageId === sub.page;
            const isLocked = proPages.has(sub.page) && !isProUser;
            return `
              <button class="flyout-card-btn flyout-item-link nav-btn ${isActive ? 'active' : ''} ${isLocked ? 'plan-locked' : ''}" type="button" data-page="${sub.page}" role="menuitem" tabindex="0">
                <div class="flyout-card-top">
                  <span class="flyout-card-icon flyout-item-icon">${sub.icon}</span>
                  <span class="flyout-card-arrow" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </span>
                </div>
                <div class="flyout-card-content flyout-item-body">
                  <div class="flyout-card-title-row flyout-item-title">
                    <strong class="flyout-card-title"><span>${this.localizedLabel(sub.page, sub.title || sub.label)}</span></strong>
                    ${isLocked ? '<span class="flyout-badge-pro">PRO</span>' : ''}
                  </div>
                  <span class="flyout-card-desc flyout-item-desc">${sub.desc || ''}</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      `;

      // Bind item clicks
      this.flyoutEl.querySelectorAll('.flyout-item-link, .flyout-card-btn').forEach((link) => {
        link.addEventListener('click', () => {
          const page = link.dataset.page;
          this.closeFlyout(true);
          if (page && typeof root.go === 'function') {
            root.go(page);
          }
        });
      });

      // Calculate position & dynamic width
      this.positionFlyout(triggerBtn, idealWidth);

      this.flyoutEl.classList.add('active');
    }

    positionFlyout(triggerBtn, idealWidth = 660) {
      const rect = triggerBtn.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      const sidebar = document.querySelector('.sidebar');
      const sidebarRight = sidebar ? sidebar.getBoundingClientRect().right : rect.right;
      // Colado diretamente na borda direita do menu principal (zero gap)
      const left = Math.round(sidebarRight) - 1;
      
      const maxAvailableWidth = Math.max(280, windowWidth - left - 24);
      const targetWidth = Math.min(idealWidth, maxAvailableWidth);
      this.flyoutEl.style.width = `${targetWidth}px`;
      this.flyoutEl.style.maxWidth = `${Math.min(680, maxAvailableWidth)}px`;

      // Ajusta data-grid-cols conforme largura real disponivel do flyout
      const gridEl = this.flyoutEl.querySelector('.flyout-cards-grid');
      if (gridEl) {
        let cols = 3;
        if (targetWidth < 360) {
          cols = 1;
        } else if (targetWidth < 540) {
          cols = 2;
        }
        gridEl.dataset.gridCols = String(cols);
      }

      const flyoutHeight = this.flyoutEl.offsetHeight || 300;
      let top = Math.max(12, rect.top - 6);
      if (top + flyoutHeight > windowHeight - 16) {
        top = Math.max(12, windowHeight - flyoutHeight - 16);
      }

      this.flyoutEl.style.left = `${left}px`;
      this.flyoutEl.style.top = `${top}px`;
    }

    scheduleClose(delay = 220) {
      this.cancelClose();
      this.closeTimeout = setTimeout(() => {
        this.closeFlyout(false);
      }, delay);
    }

    cancelClose() {
      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }
    }

    closeFlyout(force = false) {
      if (this.isFlyoutPinned && !force) return;

      this.cancelClose();
      this.activeFlyoutGroup = null;
      this.activeTriggerBtn = null;
      this.isFlyoutPinned = false;

      if (this.flyoutEl) {
        this.flyoutEl.classList.remove('active');
      }

      document.querySelectorAll('.sidebar-group-trigger, .sidebar-category-header').forEach((b) => {
        b.classList.remove('flyout-open');
        if (b.classList.contains('sidebar-group-trigger')) {
          b.setAttribute('aria-expanded', 'false');
        }
      });
    }

    showTooltip(element, text) {
      if (document.body.dataset.navigationLayout === 'top' || document.body.dataset.navigationLayout === 'tiles') return;
      if (!this.tooltipEl || !text) return;
      const rect = element.getBoundingClientRect();
      this.tooltipEl.textContent = text;
      this.tooltipEl.style.left = `${rect.right + 12}px`;
      this.tooltipEl.style.top = `${rect.top + (rect.height / 2) - 13}px`;
      this.tooltipEl.classList.add('active');
    }

    hideTooltip() {
      if (this.tooltipEl) {
        this.tooltipEl.classList.remove('active');
      }
    }

    bindGlobalEvents() {
      document.addEventListener('click', (e) => {
        if (!this.activeFlyoutGroup) return;
        const target = e.target;
        if (!this.flyoutEl.contains(target) && !target.closest('.sidebar-group-trigger')) {
          this.closeFlyout(true);
        }

        // Close top dropdowns when clicking outside
        if (!target.closest('.top-nav-cat-dropdown')) {
          document.querySelectorAll('.top-nav-cat-dropdown.open').forEach(dd => dd.classList.remove('open'));
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeFlyout(true);
          this.hideTooltip();
          document.querySelectorAll('.top-nav-cat-dropdown.open').forEach(dd => dd.classList.remove('open'));
        }
      });

      window.addEventListener('resize', () => {
        if (this.activeTriggerBtn && this.flyoutEl?.classList.contains('active')) {
          const group = this.findGroupDef(this.activeFlyoutGroup);
          const itemCount = group ? (group.items || []).length : 6;
          const maxCols = Math.min(itemCount, 3);
          const idealWidth = maxCols === 1 ? 280 : (maxCols === 2 ? 460 : 660);
          this.positionFlyout(this.activeTriggerBtn, idealWidth);
        }
      });
    }

    hookNavigation() {
      const originalGo = root.go;
      if (typeof originalGo === 'function') {
        root.go = (id) => {
          originalGo(id);
          this.setActivePage(id);
          if (id === 'settings') {
            this.setupNavigationLayoutSettings();
          }
        };
      }
    }

    setActivePage(pageId) {
      this.activePageId = pageId;

      // Update sidebar buttons
      document.querySelectorAll('.sidebar-btn').forEach((btn) => {
        const isDirect = btn.dataset.page === pageId;
        btn.classList.toggle('active', isDirect);
      });

      const mindsetPages = new Set(['mindset', 'zen', 'audiolibrary', 'emotionalintelligence', 'traderrules', 'wisdom', 'traderprofile']);
      if (mindsetPages.has(pageId)) {
        document.querySelectorAll('.sidebar-btn[data-page="mindset"]').forEach((btn) => {
          btn.classList.add('active');
        });
      }

      // Check which parent category owns this pageId
      const tree = this.getTree();
      if (tree) {
        tree.categories.forEach((cat) => {
          const isChildActive = cat.items.some(it => it.page === pageId);
          document.querySelectorAll(`.sidebar-category-group[data-group-id="${cat.id}"]`).forEach(el => {
            el.classList.toggle('parent-active', isChildActive);
          });
          document.querySelectorAll(`.top-nav-cat-dropdown[data-cat-id="${cat.id}"] .top-nav-cat-trigger`).forEach(el => {
            el.classList.toggle('parent-active', isChildActive);
          });
        });
      }

      // Update Top Navigation active state
      document.querySelectorAll('#topNavigationMenu button[data-page]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.page === pageId);
      });

      // Breadcrumb customization
      const crumb = document.querySelector('.crumb') || document.getElementById('crumb');
      if (crumb) {
        let found = false;
        if (tree) {
          for (const cat of tree.categories) {
            const matchedItem = cat.items.find(it => it.page === pageId);
            if (matchedItem) {
              const catLabel = cat.currentLabel || cat.label;
              const itemTitle = matchedItem.currentLabel || matchedItem.label;
              crumb.innerHTML = `${catLabel} / <b>${itemTitle}</b>`;
              found = true;
              break;
            }
          }
        }

        if (!found) {
          const mindsetSubPages = new Set(['zen', 'audiolibrary', 'emotionalintelligence', 'traderrules', 'wisdom', 'traderprofile']);
          if (pageId === 'tradertraining') {
            crumb.innerHTML = `The Healthy Trend Trader / <a href="javascript:void(0)" onclick="go('journal')" style="color:inherit;text-decoration:none">Diário de Trader</a> / <b>Treinamento Trader</b>`;
          } else if (pageId === 'journal') {
            crumb.innerHTML = `The Healthy Trend Trader / <b>Diário de Trader</b>`;
          } else if (mindsetSubPages.has(pageId)) {
            const pageTitle = (typeof titles !== 'undefined' && titles[pageId]) || pageId;
            crumb.innerHTML = `The Healthy Trend Trader / <a href="javascript:void(0)" onclick="go('mindset')" style="color:inherit;text-decoration:none">Mentalidade</a> / <b>${pageTitle}</b>`;
          } else {
            const titleMap = {
              mindset: 'Mentalidade',
              today: 'Meu Desktop',
              newtrade: 'Novo Trade',
              positions: 'Posições Abertas',
              closedpositions: 'Posições Encerradas',
              journal: 'Diário de Trader',
              tradertraining: 'Treinamento do Trader',
              mission: 'Missão',
              rebuild: 'Rebuild Mode',
              dailyroutine: 'Rotina Diária',
              watchlist: 'Watchlist',
              habits: 'Monitor de Hábitos',
              plans: 'Loja do Trader',
              materials: 'Loja do Trader',
              settings: 'Configurações Gerais',
              manual: 'Manual do Software',
              about: 'Sobre',
              tradesimulator: 'Simulador de Trades',
              researchlab: 'Laboratório de Pesquisa',
              forecast: 'Simulador de Equity'
            };
            const t = titleMap[pageId] || (typeof titles !== 'undefined' && titles[pageId]) || 'Meu Desktop';
            crumb.innerHTML = `The Healthy Trend Trader / <b>${t}</b>`;
          }
        }
      }
    }

    hookTopNavigation() {
      const originalSetup = root.setupTopNavigation;
      const self = this;

      root.setupTopNavigation = function() {
        if (typeof originalSetup === 'function') {
          originalSetup();
        }
        self.ensureTopNavigationItems(true);
      };
    }

    /**
     * MENU SUPERIOR (TOP NAVIGATION)
     * Renders Quick Access pills + Category Dropdowns consuming unified tree
     */
    ensureTopNavigationItems(forceRender = false) {
      const layout = document.body.dataset.navigationLayout;
      const existingControls = document.getElementById('topNavigationControls');
      const existingMenu = document.getElementById('topNavigationMenu');

      if (layout !== 'top') {
        existingControls?.remove();
        existingMenu?.remove();
        return;
      }

      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;

      let controls = document.getElementById('topNavigationControls');
      let menu = document.getElementById('topNavigationMenu');

      if (!menu) {
        menu = document.createElement('nav');
        menu.id = 'topNavigationMenu';
        menu.className = 'top-navigation-menu';
      }

      if (!controls) {
        controls = document.createElement('div');
        controls.id = 'topNavigationControls';
        controls.className = 'top-navigation-controls';
        controls.innerHTML = `
          <button class="top-navigation-scroll" id="topNavigationPrevious" type="button" aria-label="Ver atalhos anteriores" title="Ver atalhos anteriores" onclick="scrollTopNavigation(-1)">‹</button>
          <button class="top-navigation-scroll" id="topNavigationNext" type="button" aria-label="Ver próximos atalhos" title="Ver próximos atalhos" onclick="scrollTopNavigation(1)">›</button>
        `;
      }

      if (!controls.contains(menu)) {
        controls.insertBefore(menu, controls.querySelector('#topNavigationNext'));
      }

      const actions = sidebar.querySelector('.top-actions') || document.querySelector('.top-actions');
      if (actions && !sidebar.contains(actions)) {
        sidebar.appendChild(actions);
      }

      if (actions) {
        sidebar.insertBefore(controls, actions);
      } else {
        sidebar.appendChild(controls);
      }

      const tree = this.getTree();
      const activePage = this.activePageId || 'today';
      const isPro = typeof root.isProfessional === 'function' ? root.isProfessional() : false;
      const proPages = root.professionalPages || new Set();

      if (tree) {
        let menuHtml = '';

        // 1. QUICK ACCESS DIRECT PILLS
        if (tree.quickAccess && tree.quickAccess.length > 0) {
          menuHtml += `<div class="top-nav-quick-group">`;
          tree.quickAccess.forEach((item) => {
            const isLocked = proPages.has(item.page) && !isPro;
            const activeClass = item.page === activePage ? ' active' : '';
            const lockClass = isLocked ? ' plan-locked' : '';
            menuHtml += `
              <button type="button" class="top-nav-quick-pill${activeClass}${lockClass}" data-page="${item.page}" aria-label="${item.currentLabel}" onclick="go('${item.page}')">
                <span class="top-pill-ico">${item.icon}</span>
                <span class="top-pill-text">${item.currentLabel}</span>
              </button>
            `;
          });
          menuHtml += `</div>`;
          menuHtml += `<div class="top-nav-divider" aria-hidden="true"></div>`;
        }

        // 2. CATEGORY DROPDOWNS
        tree.categories.forEach((cat) => {
          if (!cat.items || cat.items.length === 0) return;
          const isChildActive = cat.items.some(it => it.page === activePage);
          menuHtml += `
            <div class="top-nav-cat-dropdown" data-cat-id="${cat.id}">
              <button type="button" class="top-nav-cat-trigger ${isChildActive ? 'parent-active' : ''}" aria-haspopup="true" aria-expanded="false">
                <span class="cat-ico">${cat.icon}</span>
                <span>${cat.currentLabel || cat.label}</span>
                <span class="cat-arrow">▾</span>
              </button>
              <div class="top-nav-dropdown-menu" role="menu">
                <div class="top-nav-dropdown-header">
                  <strong>${cat.currentLabel || cat.label}</strong>
                  <small>${cat.desc}</small>
                </div>
                <div class="top-nav-dropdown-list">
                  ${cat.items.map((item) => {
                    const isActive = item.page === activePage;
                    const isLocked = proPages.has(item.page) && !isPro;
                    return `
                      <button type="button" class="top-nav-dropdown-item ${isActive ? 'active' : ''} ${isLocked ? 'plan-locked' : ''}" data-page="${item.page}" onclick="go('${item.page}')">
                        <span class="dropdown-item-ico">${item.icon}</span>
                        <div class="dropdown-item-text">
                          <div class="dropdown-item-title-row">
                            <b>${item.currentLabel}</b>
                            ${isLocked ? '<span class="flyout-badge-pro">PRO</span>' : ''}
                          </div>
                          <small>${item.currentDesc}</small>
                        </div>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          `;
        });

        menu.innerHTML = menuHtml;

        // Bind dropdown clicks for touch/click toggling
        menu.querySelectorAll('.top-nav-cat-trigger').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = btn.closest('.top-nav-cat-dropdown');
            const wasOpen = parent.classList.contains('open');
            menu.querySelectorAll('.top-nav-cat-dropdown.open').forEach(dd => dd.classList.remove('open'));
            if (!wasOpen) {
              parent.classList.add('open');
            }
          });
        });

      } else {
        // Fallback for static render
        const pages = this.getTopNavPages();
        menu.innerHTML = pages.map((item) => {
          const isLocked = proPages.has(item.page) && !isPro;
          const activeClass = item.page === activePage ? ' active' : '';
          const lockClass = isLocked ? ' plan-locked' : '';
          return `<button type="button" class="${activeClass}${lockClass}" data-page="${item.page}" data-menu-label="${item.label}" aria-label="${item.label}" onclick="go('${item.page}')">${item.icon}<span>${item.label}</span></button>`;
        }).join('');
      }

      menu.onscroll = root.updateTopNavigationScrollState;
      if (typeof root.updateTopNavigationScrollState === 'function') {
        root.updateTopNavigationScrollState();
      }
      if (typeof root.applySubscriptionAccess === 'function') {
        root.applySubscriptionAccess();
      }
    }

    getTopNavPages() {
      const tree = this.getTree();
      if (tree) {
        const list = [];
        if (tree.quickAccess) {
          tree.quickAccess.forEach(it => {
            list.push({ page: it.page, label: it.currentLabel, icon: it.icon });
          });
        }
        tree.categories.forEach(cat => {
          cat.items.forEach(it => {
            list.push({ page: it.page, label: it.currentLabel, icon: it.icon });
          });
        });
        return list;
      }
      return [];
    }

    observeLayoutChanges() {
      const self = this;
      const observer = new MutationObserver(() => {
        const layout = document.body.dataset.navigationLayout || 'sidebar';
        self.closeFlyout(true);
        self.hideTooltip();
        if (self.model && typeof self.model.setStyle === 'function') {
          self.model.setStyle(layout);
        }
        if (typeof root.placeMarketFocusGuard === 'function') {
          root.placeMarketFocusGuard();
        }
        if (layout === 'top') {
          self.ensureTopNavigationItems(true);
        } else {
          document.getElementById('topNavigationControls')?.remove();
          document.getElementById('topNavigationMenu')?.remove();
          if (layout === 'tiles') {
            self.renderNavigationHub();
          }
        }
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['data-navigation-layout'] });
    }

    /**
     * MENU EM BLOCOS (TILES HUB)
     * Renders Categorized Block Menu with Preset bar, Quick Access block & Category blocks
     */
    renderNavigationHub() {
      if (document.body.dataset.navigationLayout !== 'tiles') return;
      let hub = document.getElementById('navigationHub');
      if (!hub) {
        hub = document.createElement('section');
        hub.id = 'navigationHub';
        hub.className = 'navigation-hub';
        document.body.appendChild(hub);
      }

      const tree = this.getTree();
      const isEn = root.appLanguage === 'en-US';
      const isPro = typeof root.isProfessional === 'function' ? root.isProfessional() : false;
      const proPages = root.professionalPages || new Set();

      let quickBlockHtml = '';
      if (tree && tree.quickAccess && tree.quickAccess.length > 0) {
        quickBlockHtml = `
          <div class="navigation-hub-quick-section">
            <div class="navigation-hub-section-title">
              <span class="quick-star">★</span>
              <span>${isEn ? 'QUICK ACCESS' : 'ACESSO RÁPIDO'}</span>
            </div>
            <div class="navigation-hub-quick-grid">
              ${tree.quickAccess.map((item) => {
                const isLocked = proPages.has(item.page) && !isPro;
                return `
                  <button class="nav-hub-card quick-card ${isLocked ? 'plan-locked' : ''}" type="button" onclick="go('${item.page}')">
                    <span class="nav-card-ico">${item.icon}</span>
                    <div class="nav-card-info">
                      <b>${item.currentLabel}</b>
                      <small>${item.currentDesc}</small>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }

      let categoriesBlocksHtml = '';
      if (tree) {
        categoriesBlocksHtml = tree.categories.filter(cat => cat.items && cat.items.length > 0).map((cat) => {
          return `
            <div class="nav-category-block" data-category="${cat.id}">
              <header class="nav-category-header">
                <span class="nav-cat-ico">${cat.icon}</span>
                <div class="nav-cat-titles">
                  <h3>${cat.currentLabel || cat.label}</h3>
                  <p>${cat.desc}</p>
                </div>
              </header>
              <div class="nav-category-cards-grid">
                ${cat.items.map((item) => {
                  const isLocked = proPages.has(item.page) && !isPro;
                  return `
                    <button class="nav-hub-card ${isLocked ? 'plan-locked' : ''}" type="button" onclick="go('${item.page}')">
                      <span class="nav-card-ico">${item.icon}</span>
                      <div class="nav-card-info">
                        <div class="nav-card-title-row">
                          <b>${item.currentLabel}</b>
                          ${isLocked ? '<span class="flyout-badge-pro">PRO</span>' : ''}
                        </div>
                        <small>${item.currentDesc}</small>
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('');
      }

      hub.innerHTML = `
        <div class="navigation-hub-inner">
          <header class="navigation-hub-header">
            <div class="navigation-hub-brand">
              <span class="tile-brand-mark">◢</span>
              <div><strong>THE HEALTHY TREND</strong><small>TRADER WORKSPACE</small></div>
            </div>
            <div class="navigation-hub-title">
              <div class="eyebrow">${isEn ? 'NAVIGATION' : 'NAVEGAÇÃO'}</div>
              <h1>${isEn ? 'Where do you want to go <em>today?</em>' : 'Para onde você quer ir <em>hoje?</em>'}</h1>
              <p>${isEn ? 'Discipline today. Freedom tomorrow.' : 'Disciplina hoje. Liberdade amanhã.'}</p>
            </div>
            <aside class="navigation-hub-quote">
              “${isEn ? 'Consistency is the true advantage.' : 'Consistência é a verdadeira vantagem.'}”
              <small>— TOM BASSO</small>
            </aside>
          </header>

          <!-- ACESSO RÁPIDO BLOCK -->
          ${quickBlockHtml}

          <!-- CATEGORY BLOCKS -->
          <div class="navigation-hub-categories-container">
            ${categoriesBlocksHtml}
          </div>

          <footer class="navigation-hub-philosophy">
            <span>FOCUS · PROCESS · DISCIPLINE · RESULTS</span>
            <button type="button" class="nav-hub-settings-link" onclick="go('settings')">⚙ ${isEn ? 'Customize Navigation' : 'Personalizar Navegação'}</button>
          </footer>
        </div>
      `;

      hub.classList.add('open');
    }

    /**
     * CONFIGURAÇÕES DE NAVEGAÇÃO EM #settings
     */
    setupNavigationLayoutSettings() {
      const grid = document.querySelector('#settings .settings-grid');
      if (!grid) return;
      document.getElementById('navigationLayoutSettings')?.remove();

      const card = document.createElement('section');
      card.id = 'navigationLayoutSettings';
      card.className = 'card nav-settings-card';

      const tree = this.getTree();
      const currentStyle = (this.model ? this.model.state.style : document.body.dataset.navigationLayout) || 'sidebar';
      const currentPreset = this.model ? this.model.state.preset : 'fast';
      const isEn = root.appLanguage === 'en-US';

      // Style options
      const styles = [
        { id: 'sidebar', icon: '▤', title: isEn ? 'Side menu' : 'Menu lateral', desc: isEn ? 'Traditional navigation always visible on the left.' : 'A navegação tradicional sempre visível à esquerda.' },
        { id: 'top', icon: '▬', title: isEn ? 'Top menu' : 'Menu superior', desc: isEn ? 'Horizontal bar with quick access and category dropdowns.' : 'Atalhos horizontais com acesso rápido e menus suspensos por categoria.' },
        { id: 'tiles', icon: '▦', title: isEn ? 'Tile menu' : 'Menu em blocos', desc: isEn ? 'Categorized single-screen panel organized by modules.' : 'Painel visual em tela única organizado por categorias e blocos.' }
      ];

      const styleButtons = styles.map((s) => `
        <button type="button" class="navigation-layout-option ${currentStyle === s.id ? 'active' : ''}" onclick="window.SidebarNavigation.setStyle('${s.id}')">
          <i>${s.icon}</i>
          <b>${s.title}</b>
          <span>${s.desc}</span>
        </button>
      `).join('');

      // Presets options
      const presets = [
        { id: 'fast', label: '⚡ Fast', desc: isEn ? 'Instant access to most frequent tools; streamlined categories.' : 'Acesso ultrarrápido às ferramentas mais frequentes (Desktop, Novo Trade, Diário, Watchlist, Gráficos).' },
        { id: 'trader_focus', label: '🎯 Trader Focus', desc: isEn ? 'Execution-first organization focusing on Trading, Risk, and Market.' : 'Organização estritamente orientada à execução do pregão, enfatizando Operação, Risco e Mercado.' },
        { id: 'full', label: '🏛️ Professional / Full', desc: isEn ? 'Comprehensive view of all software dimensions and pillars.' : 'Visão integral de todas as dimensões da plataforma: Operação, Treinamento, Mercado, Simuladores e Risco.' }
      ];

      const presetButtons = presets.map((p) => `
        <button type="button" class="nav-preset-btn ${currentPreset === p.id ? 'active' : ''}" onclick="window.SidebarNavigation.applyPreset('${p.id}')">
          <b>${p.label}</b>
          <small>${p.desc}</small>
        </button>
      `).join('');

      card.innerHTML = `
        <div class="card-head">
          <div>
            <h3>${isEn ? 'Navigation Architecture' : 'Arquitetura de Navegação'}</h3>
            <span>${isEn ? 'Choose presentation format and navigation organization preset.' : 'Escolha como navegar pela plataforma e selecione a predefinição ideal para o seu dia a dia.'}</span>
          </div>
        </div>

        <div class="nav-settings-block">
          <label class="nav-settings-label">${isEn ? '1. Menu - Presentation Style' : '1. Menu - Formato de Exibição'}</label>
          <div class="navigation-layout-options">${styleButtons}</div>
        </div>

        <div class="nav-settings-block">
          <label class="nav-settings-label">${isEn ? '2. Menu - Organization Preset' : '2. Menu - Predefinição de Organização'}</label>
          <p class="nav-settings-hint">${isEn ? 'Presets determine grouping and Quick Access without hiding any software capability. 100% of modules remain accessible.' : 'As predefinições organizam o agrupamento das categorias e do Acesso Rápido de forma automática. 100% dos módulos continuam disponíveis.'}</p>
          <div class="nav-presets-row">${presetButtons}</div>
        </div>
      `;

      grid.prepend(card);
      if (typeof root.decorateSettingsExperience === 'function') {
        root.decorateSettingsExperience();
      }
    }

    setStyle(style) {
      if (typeof root.applyNavigationLayout === 'function') {
        root.applyNavigationLayout(style);
      } else {
        document.body.dataset.navigationLayout = style;
        if (this.model) this.model.setStyle(style);
        this.refresh();
      }
    }

    applyPreset(presetKey) {
      if (this.model && typeof this.model.applyPreset === 'function') {
        this.model.applyPreset(presetKey);
        this.refresh();
        const p = this.model.presets[presetKey];
        const name = p ? p.label : presetKey;
        if (typeof root.showToast === 'function') {
          root.showToast(`Predefinição ${name} aplicada. Todos os módulos preservados.`);
        }
      }
    }

    hookUnifiedComponents() {
      const self = this;
      
      // Override openNavigationHub
      root.openNavigationHub = function() {
        self.renderNavigationHub();
      };

      // Override setupNavigationLayoutSettings
      root.setupNavigationLayoutSettings = function() {
        self.setupNavigationLayoutSettings();
      };
    }
  }

  // Export & auto-init
  root.SidebarNavigation = new SidebarNavigation();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => root.SidebarNavigation.init());
  } else {
    root.SidebarNavigation.init();
  }

})(typeof window !== 'undefined' ? window : globalThis);

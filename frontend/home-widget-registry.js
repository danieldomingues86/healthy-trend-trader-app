(function (root) {
  const widgets = [
    { id: 'portfolio', name: 'Portfolio Heat', description: 'Risco agregado e capacidade de exposição da carteira.', category: 'Trading', icon: '◌', defaultSize: 'large', minSize: 'compact', route: 'portfolioheat', defaultActive: true, render: (context) => context.renderPortfolio() },
    { id: 'opportunities', name: 'Oportunidades', description: 'Resumo dos filtros e ativos que merecem atenção.', category: 'Trading', icon: '⌁', defaultSize: 'medium', minSize: 'compact', route: 'marketscans', defaultActive: true, render: (context) => context.renderOpportunities() },
    { id: 'next-action', name: 'Próxima ação', description: 'Prioridade operacional calculada pelo seu sistema.', category: 'Trading', icon: '→', defaultSize: 'medium', minSize: 'compact', route: null, defaultActive: true, render: (context) => context.renderNextAction() }
    ,{ id: 'relative-strength', name: 'Relative Strength', description: 'Líderes do ranking de força relativa.', category: 'Mercado', icon: '↗', defaultSize: 'medium', minSize: 'compact', route: 'relativestrength', defaultActive: false, render: (context) => context.renderRelativeStrength() }
    ,{ id: 'market-cycle', name: 'Ciclo de Mercado', description: 'Leitura atual do ambiente para tomada de risco.', category: 'Mercado', icon: '◒', defaultSize: 'small', minSize: 'compact', route: 'marketcycle', defaultActive: false, render: (context) => context.renderMarketCycle() }
    ,{ id: 'watchlist', name: 'Watchlist', description: 'Ativos acompanhados e seus estados mais relevantes.', category: 'Mercado', icon: '◉', defaultSize: 'medium', minSize: 'compact', route: 'watchlist', defaultActive: false, render: (context) => context.renderWatchlist() }
    ,{ id: 'wealth', name: 'Patrimônio / Equity', description: 'Visão compacta do patrimônio e equity da estratégia.', category: 'Performance', icon: '▥', defaultSize: 'medium', minSize: 'compact', route: 'dashboard', defaultActive: false, render: (context) => context.renderWealth() }
    ,{ id: 'courage-challenge', name: 'Desafio Grade A', description: 'Progresso do sizing compliance no desafio atual.', category: 'Disciplina & Rotina', icon: '✓', defaultSize: 'medium', minSize: 'compact', route: 'couragechallenge', defaultActive: false, render: (context) => context.renderChallenge() }
    ,{ id: 'daily-checklist', name: 'Daily Checklist', description: 'Itens da sua Rotina Diária.', category: 'Organização Pessoal', icon: '☑', defaultSize: 'medium', minSize: 'compact', route: 'dailyroutine', defaultActive: false, render: (context) => context.renderChecklist() }
    ,{ id: 'daily-priorities', name: 'Prioridades do Dia', description: 'Até três coisas que merecem atenção hoje.', category: 'Organização Pessoal', icon: '◎', defaultSize: 'small', minSize: 'compact', route: null, defaultActive: false, render: (context) => context.renderPriorities() }
    ,{ id: 'quick-notes', name: 'Notas Rápidas', description: 'Capture um pensamento sem sair do Desktop.', category: 'Organização Pessoal', icon: '✎', defaultSize: 'small', minSize: 'compact', route: null, defaultActive: false, render: (context) => context.renderNotes() }
    ,{ id: 'reminders', name: 'Lembretes', description: 'Lembretes simples para sua rotina.', category: 'Organização Pessoal', icon: '◷', defaultSize: 'small', minSize: 'compact', route: null, defaultActive: false, render: (context) => context.renderReminders() }
    ,{ id: 'habits', name: 'Hábitos', description: 'Progresso dos hábitos de hoje.', category: 'Organização Pessoal', icon: '✓', defaultSize: 'medium', minSize: 'compact', route: 'habits', defaultActive: false, render: (context) => context.renderHabits() }
    ,{ id: 'daily-focus', name: 'Foco do Dia', description: 'Uma intenção curta para orientar a execução.', category: 'Organização Pessoal', icon: '◈', defaultSize: 'small', minSize: 'compact', route: null, defaultActive: false, render: (context) => context.renderFocus() }
  ];
  const byId = new Map(widgets.map((widget) => [widget.id, widget]));
  root.HomeWidgetRegistry = Object.freeze({
    all: () => widgets.slice(),
    get: (id) => byId.get(id),
    defaults: () => widgets.filter((widget) => widget.defaultActive).map((widget, order) => ({ id: widget.id, order, size: widget.defaultSize, active: true }))
  });
}(window));

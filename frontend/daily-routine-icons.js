/**
 * Daily Routine SVG Icons Library & Categories — Healthy Trend Trader V2
 * Biblioteca curada de ícones SVG consistentes com visual outline (24x24)
 * e sistema de cores pastel por categoria.
 */

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DailyRoutineIcons = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CATEGORIES = {
    trading: {
      id: 'trading',
      label: 'Trading / Mercado',
      bg: '#eaf8ef',
      color: '#10b981',
      borderColor: 'rgba(16, 185, 129, 0.28)'
    },
    saude: {
      id: 'saude',
      label: 'Saúde',
      bg: '#fef2f2',
      color: '#ef4444',
      borderColor: 'rgba(239, 68, 68, 0.28)'
    },
    mentalidade: {
      id: 'mentalidade',
      label: 'Mentalidade',
      bg: '#f0fdfa',
      color: '#0d9488',
      borderColor: 'rgba(13, 148, 136, 0.28)'
    },
    estudos: {
      id: 'estudos',
      label: 'Estudos',
      bg: '#f5f3ff',
      color: '#8b5cf6',
      borderColor: 'rgba(139, 92, 246, 0.28)'
    },
    produtividade: {
      id: 'produtividade',
      label: 'Produtividade',
      bg: '#eff6ff',
      color: '#3b82f6',
      borderColor: 'rgba(59, 130, 246, 0.28)'
    },
    financas: {
      id: 'financas',
      label: 'Finanças',
      bg: '#fefce8',
      color: '#d97706',
      borderColor: 'rgba(217, 119, 6, 0.28)'
    },
    pessoal: {
      id: 'pessoal',
      label: 'Vida Pessoal',
      bg: '#fff7ed',
      color: '#f97316',
      borderColor: 'rgba(249, 115, 22, 0.28)'
    }
  };

  const ICONS = {
    // Trading / Mercado
    'chart-line': {
      category: 'trading',
      label: 'Gráfico de Linha',
      svg: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'
    },
    'chart-bar': {
      category: 'trading',
      label: 'Estatísticas',
      svg: '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>'
    },
    'chart-up': {
      category: 'trading',
      label: 'Execução / Alta',
      svg: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'
    },
    'market': {
      category: 'trading',
      label: 'Mercado / Macro',
      svg: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'
    },
    'search': {
      category: 'trading',
      label: 'Análise / Watchlist',
      svg: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'
    },
    'target': {
      category: 'trading',
      label: 'Setup / Gatilho',
      svg: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'
    },
    'shield': {
      category: 'trading',
      label: 'Gestão de Risco',
      svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
    },
    'candlestick': {
      category: 'trading',
      label: 'Price Action / Candles',
      svg: '<line x1="9" y1="3" x2="9" y2="7"/><rect x="6" y="7" width="6" height="10" rx="1"/><line x1="9" y1="17" x2="9" y2="21"/><line x1="17" y1="5" x2="17" y2="9"/><rect x="14" y="9" width="6" height="7" rx="1"/><line x1="17" y1="16" x2="17" y2="19"/>'
    },

    // Saúde
    'heart': {
      category: 'saude',
      label: 'Saúde / Bem-estar',
      svg: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'
    },
    'activity': {
      category: 'saude',
      label: 'Exercício / Treino',
      svg: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>'
    },
    'apple': {
      category: 'saude',
      label: 'Alimentação',
      svg: '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>'
    },
    'droplet': {
      category: 'saude',
      label: 'Hidratação',
      svg: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>'
    },
    'moon': {
      category: 'saude',
      label: 'Sono / Descanso',
      svg: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>'
    },
    'sun': {
      category: 'saude',
      label: 'Energia / Ritual Matinal',
      svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'
    },

    // Mentalidade
    'brain': {
      category: 'mentalidade',
      label: 'Mentalidade / Cognição',
      svg: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"/>'
    },
    'lotus': {
      category: 'mentalidade',
      label: 'Meditação / Zen',
      svg: '<path d="M12 3c-1.5 3-4 6-4 9a4 4 0 0 0 8 0c0-3-2.5-6-4-9Z"/><path d="M8 12c-2.5-1.5-5-1-6 1 0 3 3.5 6 7 6"/><path d="M16 12c2.5-1.5 5-1 6 1 0 3-3.5 6-7 6"/><path d="M12 18v3"/>'
    },
    'smile': {
      category: 'mentalidade',
      label: 'Inteligência Emocional',
      svg: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>'
    },
    'compass': {
      category: 'mentalidade',
      label: 'Foco & Disciplina',
      svg: '<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>'
    },
    'shield-check': {
      category: 'mentalidade',
      label: 'Autocontrole',
      svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>'
    },

    // Estudos
    'book-open': {
      category: 'estudos',
      label: 'Leitura / Método',
      svg: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>'
    },
    'graduation-cap': {
      category: 'estudos',
      label: 'Aprendizado',
      svg: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>'
    },
    'lightbulb': {
      category: 'estudos',
      label: 'Ideias & Insights',
      svg: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>'
    },
    'file-text': {
      category: 'estudos',
      label: 'Plano / Anotações',
      svg: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>'
    },

    // Produtividade
    'check-circle': {
      category: 'produtividade',
      label: 'Tarefa Concluída',
      svg: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
    },
    'clipboard-list': {
      category: 'produtividade',
      label: 'Checklist Diário',
      svg: '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>'
    },
    'clock': {
      category: 'produtividade',
      label: 'Gestão de Tempo',
      svg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
    },
    'zap': {
      category: 'produtividade',
      label: 'Foco Rápido',
      svg: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
    },
    'rocket': {
      category: 'produtividade',
      label: 'Produtividade Ágil',
      svg: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>'
    },
    'notebook': {
      category: 'produtividade',
      label: 'Diário de Bordo',
      svg: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/><path d="M6 14h6"/>'
    },

    // Finanças
    'wallet': {
      category: 'financas',
      label: 'Carteira / Patrimônio',
      svg: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>'
    },
    'bank': {
      category: 'financas',
      label: 'Investimentos',
      svg: '<line x1="3" y1="21" x2="21" y2="21"/><line x1="6" y1="18" x2="6" y2="10"/><line x1="10" y1="18" x2="10" y2="10"/><line x1="14" y1="18" x2="14" y2="10"/><line x1="18" y1="18" x2="18" y2="10"/><polygon points="12 2 20 7 4 7"/>'
    },
    'credit-card': {
      category: 'financas',
      label: 'Controle Financeiro',
      svg: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>'
    },
    'coins': {
      category: 'financas',
      label: 'Capital / Aportes',
      svg: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>'
    },

    // Vida Pessoal
    'home': {
      category: 'pessoal',
      label: 'Casa & Família',
      svg: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
    },
    'users': {
      category: 'pessoal',
      label: 'Relacionamentos',
      svg: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
    },
    'coffee': {
      category: 'pessoal',
      label: 'Lazer & Pausa',
      svg: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>'
    },
    'music': {
      category: 'pessoal',
      label: 'Música & Relaxamento',
      svg: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'
    }
  };

  /**
   * Renderiza um ícone SVG outline com viewBox 0 0 24 24
   */
  function renderSvg(iconKey, size = 20, customColor = null) {
    const iconObj = ICONS[iconKey] || ICONS['check-circle'];
    const cat = CATEGORIES[iconObj.category] || CATEGORIES.trading;
    const color = customColor || cat.color;

    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconObj.svg}</svg>`;
  }

  /**
   * Renderiza o badge completo com fundo pastel e ícone centralizado
   */
  function renderBadge(iconKey, categoryKey = null, size = 42) {
    const iconObj = ICONS[iconKey] || ICONS['check-circle'];
    const cat = CATEGORIES[categoryKey] || CATEGORIES[iconObj.category] || CATEGORIES.trading;
    const iconSize = Math.round(size * 0.52);

    return `<span class="dr-icon-badge" style="background:${cat.bg}; border-color:${cat.borderColor}; color:${cat.color}; width:${size}px; height:${size}px;" aria-hidden="true">${renderSvg(iconKey, iconSize, cat.color)}</span>`;
  }

  /**
   * Mapeamento inteligente de nome para sugestão de categoria e ícone
   */
  function suggestCategoryAndIcon(name) {
    const lower = (name || '').toLowerCase().trim();

    // Saúde
    if (/academia|trein|exerc|caminh|corr|muscul|along|físic|esport|corrida|pedalar|ciclismo/.test(lower)) {
      return { category: 'saude', icon: 'activity' };
    }
    if (/água|agua|hidrat|beber/.test(lower)) {
      return { category: 'saude', icon: 'droplet' };
    }
    if (/dormir|sono|descans|acordar|soneca|relax/.test(lower)) {
      return { category: 'saude', icon: 'moon' };
    }
    if (/com|aliment|diet|almoç|café|cafe|refeiç|nutri|lanche/.test(lower)) {
      return { category: 'saude', icon: 'apple' };
    }
    if (/saúde|saude|médic|exame|vitamina|remedio/.test(lower)) {
      return { category: 'saude', icon: 'heart' };
    }

    // Mentalidade
    if (/medit|zen|respir|mindful|calma|presen/.test(lower)) {
      return { category: 'mentalidade', icon: 'lotus' };
    }
    if (/psicol|ment|emoç|emoc|disciplina|mindset|ansied|humor/.test(lower)) {
      return { category: 'mentalidade', icon: 'brain' };
    }
    if (/foco|concentr|blind|meta|objetivo/.test(lower)) {
      return { category: 'mentalidade', icon: 'compass' };
    }
    if (/autocontrole|paciência|paciencia|espera/.test(lower)) {
      return { category: 'mentalidade', icon: 'shield-check' };
    }

    // Estudos
    if (/estud|ler|livro|aula|vídeo|video|curso|aprend|método|metodo|biblioteca|conteúdo/.test(lower)) {
      return { category: 'estudos', icon: 'book-open' };
    }
    if (/formação|certific|faculdade|mentor/.test(lower)) {
      return { category: 'estudos', icon: 'graduation-cap' };
    }
    if (/ideia|insight|resumo|anot/.test(lower)) {
      return { category: 'estudos', icon: 'lightbulb' };
    }

    // Produtividade
    if (/diário|diario|print|regist|relat|anotação/.test(lower)) {
      return { category: 'produtividade', icon: 'notebook' };
    }
    if (/tempo|timer|pomodoro|horário|horario|minutos|alarme/.test(lower)) {
      return { category: 'produtividade', icon: 'clock' };
    }
    if (/tarefa|checklist|to do|fazer|organizar|rotina/.test(lower)) {
      return { category: 'produtividade', icon: 'clipboard-list' };
    }
    if (/rápido|rapido|produtiv|executar|energia|agil/.test(lower)) {
      return { category: 'produtividade', icon: 'rocket' };
    }

    // Finanças
    if (/dinheir|carteir|aport|patrim|saldo|banc|invest|finan|retirada|lucro|caixa/.test(lower)) {
      return { category: 'financas', icon: 'wallet' };
    }
    if (/cartão|cartao|conta|despesa|gasto/.test(lower)) {
      return { category: 'financas', icon: 'credit-card' };
    }

    // Pessoal
    if (/famíl|famil|casa|filh|espos|marid|amig|lazer|viag|folga|passeio/.test(lower)) {
      return { category: 'pessoal', icon: 'home' };
    }
    if (/música|musica|podcast|ouvindo/.test(lower)) {
      return { category: 'pessoal', icon: 'music' };
    }
    if (/café|cafezinho|pausa|descompress/.test(lower)) {
      return { category: 'pessoal', icon: 'coffee' };
    }

    // Trading (Default)
    if (/mercado|context|ibov|b3|macro|setor|notícia/.test(lower)) {
      return { category: 'trading', icon: 'market' };
    }
    if (/anális|analis|watchlist|ativo|rastre|scan|pap[ée]l|gráfico|grafico/.test(lower)) {
      return { category: 'trading', icon: 'search' };
    }
    if (/setup|plano|alvo|gatilho|estrat[ée]g|cenário|cenario/.test(lower)) {
      return { category: 'trading', icon: 'target' };
    }
    if (/execu|oper|compr|vend|trade|posiç|posic|ordem/.test(lower)) {
      return { category: 'trading', icon: 'chart-up' };
    }
    if (/risco|stop|sizing|proteg|perda|heat/.test(lower)) {
      return { category: 'trading', icon: 'shield' };
    }
    if (/desempenho|result|m[ée]tric|perform|revis|drawdown/.test(lower)) {
      return { category: 'trading', icon: 'chart-bar' };
    }
    if (/candle|preço|preco|suporte|resist/.test(lower)) {
      return { category: 'trading', icon: 'candlestick' };
    }

    return { category: 'trading', icon: 'chart-line' };
  }

  return {
    CATEGORIES,
    ICONS,
    renderSvg,
    renderBadge,
    suggestCategoryAndIcon
  };
});


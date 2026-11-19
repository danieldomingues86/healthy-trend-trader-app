(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HealthyTrendAvatarModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY_V2 = 'healthy-trend-avatar-v2';
  const STORAGE_KEY_V1 = 'healthy-trend-avatar-v1';

  const CATEGORIES = [
    {
      id: 'animals',
      name: 'Animais do Mercado',
      nameEn: 'Market Animals',
      subtitle: 'Força e comportamento de mercado',
      subtitleEn: 'Strength and market behavior',
      icon: 'bull',
      description: 'Animais que representam os principais comportamentos do mercado financeiro.',
      descriptionEn: 'Animals that represent key financial market behaviors.'
    },
    {
      id: 'symbols',
      name: 'Símbolos do Mercado',
      nameEn: 'Market Symbols',
      subtitle: 'Ícones e conceitos da análise técnica',
      subtitleEn: 'Icons and concepts of technical analysis',
      icon: 'symbols',
      description: 'Representações visuais dos principais conceitos da análise técnica e do mercado.',
      descriptionEn: 'Visual representations of key technical analysis and market concepts.'
    },
    {
      id: 'identity',
      name: 'Identidade do Trader',
      nameEn: 'Trader Identity',
      subtitle: 'Perfis e estilos de trader',
      subtitleEn: 'Trader profiles and styles',
      icon: 'identity',
      description: 'Perfis de traders que refletem diferentes estilos, rotinas e personalidades do mercado.',
      descriptionEn: 'Trader profiles reflecting different styles, routines and market personalities.'
    }
  ];

  const MARKET_ANIMALS = [
    {
      id: 'bull',
      name: 'Touro',
      nameEn: 'Bull',
      subtitle: 'Força, tendência e alta.',
      subtitleEn: 'Strength, trend and rally.',
      avatarUrl: 'assets/avatars/bull.png',
      previewUrl: 'assets/avatars/preview-bull.png',
      category: 'animals'
    },
    {
      id: 'bear',
      name: 'Urso',
      nameEn: 'Bear',
      subtitle: 'Defesa, proteção e baixa.',
      subtitleEn: 'Defense, protection and downtrend.',
      avatarUrl: 'assets/avatars/bear.png',
      previewUrl: 'assets/avatars/bear.png',
      category: 'animals'
    },
    {
      id: 'eagle',
      name: 'Águia',
      nameEn: 'Eagle',
      subtitle: 'Visão estratégica e antecipação.',
      subtitleEn: 'Strategic vision and anticipation.',
      avatarUrl: 'assets/avatars/eagle.png',
      previewUrl: 'assets/avatars/eagle.png',
      category: 'animals'
    },
    {
      id: 'panther',
      name: 'Pantera',
      nameEn: 'Panther',
      subtitle: 'Precisão, paciência e execução.',
      subtitleEn: 'Precision, patience and execution.',
      avatarUrl: 'assets/avatars/panther.png',
      previewUrl: 'assets/avatars/panther.png',
      category: 'animals'
    },
    {
      id: 'wolf',
      name: 'Lobo',
      nameEn: 'Wolf',
      subtitle: 'Disciplina e inteligência.',
      subtitleEn: 'Discipline and intelligence.',
      avatarUrl: 'assets/avatars/wolf.png',
      previewUrl: 'assets/avatars/wolf.png',
      category: 'animals'
    },
    {
      id: 'lion',
      name: 'Leão',
      nameEn: 'Lion',
      subtitle: 'Liderança e domínio.',
      subtitleEn: 'Leadership and dominance.',
      avatarUrl: 'assets/avatars/lion.png',
      previewUrl: 'assets/avatars/lion.png',
      category: 'animals'
    },
    {
      id: 'falcon',
      name: 'Falcão',
      nameEn: 'Falcon',
      subtitle: 'Velocidade e timing.',
      subtitleEn: 'Speed and timing.',
      avatarUrl: 'assets/avatars/falcon.png',
      previewUrl: 'assets/avatars/falcon.png',
      category: 'animals'
    },
    {
      id: 'deer',
      name: 'Cervo',
      nameEn: 'Deer',
      subtitle: 'Foco, calma e consistência.',
      subtitleEn: 'Focus, calm and consistency.',
      avatarUrl: 'assets/avatars/deer.png',
      previewUrl: 'assets/avatars/deer.png',
      category: 'animals'
    }
  ];

  const MARKET_SYMBOLS = [
    {
      id: 'candlestick',
      name: 'Candlestick',
      nameEn: 'Candlestick',
      subtitle: 'A essência do preço e do movimento.',
      subtitleEn: 'The essence of price and movement.',
      avatarUrl: 'assets/avatars/symbol-candlestick.png',
      previewUrl: 'assets/avatars/preview-candlestick.png',
      category: 'symbols'
    },
    {
      id: 'uptrend',
      name: 'Tendência de Alta',
      nameEn: 'Uptrend',
      subtitle: 'Direção, força e continuidade.',
      subtitleEn: 'Direction, strength and continuity.',
      avatarUrl: 'assets/avatars/symbol-uptrend.png',
      previewUrl: 'assets/avatars/symbol-uptrend.png',
      category: 'symbols'
    },
    {
      id: 'breakout',
      name: 'Rompimento',
      nameEn: 'Breakout',
      subtitle: 'Quebra de barreira e nova oportunidade.',
      subtitleEn: 'Barrier breakout and new opportunity.',
      avatarUrl: 'assets/avatars/symbol-breakout.png',
      previewUrl: 'assets/avatars/symbol-breakout.png',
      category: 'symbols'
    },
    {
      id: 'fibonacci',
      name: 'Fibonacci',
      nameEn: 'Fibonacci',
      subtitle: 'Retração, confluência e pontos estratégicos.',
      subtitleEn: 'Retracement, confluence and strategic points.',
      avatarUrl: 'assets/avatars/symbol-fibonacci.png',
      previewUrl: 'assets/avatars/symbol-fibonacci.png',
      category: 'symbols'
    },
    {
      id: 'volume',
      name: 'Volume',
      nameEn: 'Volume',
      subtitle: 'Força real por trás do movimento.',
      subtitleEn: 'Real force behind the movement.',
      avatarUrl: 'assets/avatars/symbol-volume.png',
      previewUrl: 'assets/avatars/symbol-volume.png',
      category: 'symbols'
    },
    {
      id: 'support-resistance',
      name: 'Suporte e Resistência',
      nameEn: 'Support & Resistance',
      subtitle: 'Zonas-chave de decisão do mercado.',
      subtitleEn: 'Key market decision zones.',
      avatarUrl: 'assets/avatars/symbol-support-resistance.png',
      previewUrl: 'assets/avatars/symbol-support-resistance.png',
      category: 'symbols'
    },
    {
      id: 'volatility',
      name: 'Volatilidade',
      nameEn: 'Volatility',
      subtitle: 'Variação, expansão e intensidade do preço.',
      subtitleEn: 'Variation, expansion and price intensity.',
      avatarUrl: 'assets/avatars/symbol-volatility.png',
      previewUrl: 'assets/avatars/symbol-volatility.png',
      category: 'symbols'
    },
    {
      id: 'market-flow',
      name: 'Fluxo de Mercado',
      nameEn: 'Market Flow',
      subtitle: 'Equilíbrio entre compradores e vendedores.',
      subtitleEn: 'Balance between buyers and sellers.',
      avatarUrl: 'assets/avatars/symbol-market-flow.png',
      previewUrl: 'assets/avatars/symbol-market-flow.png',
      category: 'symbols'
    }
  ];

  const TRADER_IDENTITY = [
    {
      id: 'trader-strategist',
      name: 'O Trader Estrategista',
      nameEn: 'The Strategic Trader',
      subtitle: 'Planejamento, análise e execução com método.',
      subtitleEn: 'Planning, analysis and methodical execution.',
      avatarUrl: 'assets/avatars/trader-strategist.png',
      previewUrl: 'assets/avatars/preview-trader-strategist.png',
      category: 'identity'
    },
    {
      id: 'trader-analyst',
      name: 'A Trader Analista',
      nameEn: 'The Analyst Trader',
      subtitle: 'Leitura de contexto, indicadores e tomada de decisão técnica.',
      subtitleEn: 'Context reading, indicators and technical decision making.',
      avatarUrl: 'assets/avatars/trader-analyst.png',
      previewUrl: 'assets/avatars/trader-analyst.png',
      category: 'identity'
    },
    {
      id: 'trader-institutional',
      name: 'O Trader Institucional',
      nameEn: 'The Institutional Trader',
      subtitle: 'Visão macro, gestão de risco e estratégias de longo prazo.',
      subtitleEn: 'Macro vision, risk management and long-term strategies.',
      avatarUrl: 'assets/avatars/trader-institutional.png',
      previewUrl: 'assets/avatars/trader-institutional.png',
      category: 'identity'
    },
    {
      id: 'trader-executor',
      name: 'A Trader Executora',
      nameEn: 'The Executing Trader',
      subtitle: 'Disciplina, agilidade e foco na operação.',
      subtitleEn: 'Discipline, agility and focus on operation.',
      avatarUrl: 'assets/avatars/trader-executor.png',
      previewUrl: 'assets/avatars/trader-executor.png',
      category: 'identity'
    },
    {
      id: 'trader-technical-analyst',
      name: 'O Analista Técnico',
      nameEn: 'The Technical Analyst',
      subtitle: 'Estudo de padrões, tendências e zonas de preço.',
      subtitleEn: 'Study of patterns, trends and price zones.',
      avatarUrl: 'assets/avatars/trader-technical-analyst.png',
      previewUrl: 'assets/avatars/trader-technical-analyst.png',
      category: 'identity'
    },
    {
      id: 'trader-performance',
      name: 'A Trader de Performance',
      nameEn: 'The Performance Trader',
      subtitle: 'Alta consistência, métricas e evolução constante.',
      subtitleEn: 'High consistency, metrics and constant evolution.',
      avatarUrl: 'assets/avatars/trader-performance.png',
      previewUrl: 'assets/avatars/trader-performance.png',
      category: 'identity'
    },
    {
      id: 'trader-experienced',
      name: 'O Trader Experiente',
      nameEn: 'The Experienced Trader',
      subtitle: 'Vivência de mercado, controle emocional e gestão de capital.',
      subtitleEn: 'Market seasoning, emotional control and capital management.',
      avatarUrl: 'assets/avatars/trader-experienced.png',
      previewUrl: 'assets/avatars/trader-experienced.png',
      category: 'identity'
    },
    {
      id: 'trader-digital',
      name: 'O Trader Digital',
      nameEn: 'The Digital Trader',
      subtitle: 'Tecnologia, dados e automação aplicados ao trading.',
      subtitleEn: 'Technology, data and automation applied to trading.',
      avatarUrl: 'assets/avatars/trader-digital.png',
      previewUrl: 'assets/avatars/trader-digital.png',
      category: 'identity'
    }
  ];

  const CATALOG = {
    animals: MARKET_ANIMALS,
    symbols: MARKET_SYMBOLS,
    identity: TRADER_IDENTITY,
    traders: TRADER_IDENTITY // alias for backwards compatibility
  };

  const HIGHLIGHT_COLORS = [
    { id: 'green', name: 'Verde', nameEn: 'Green', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', border: '#059669' },
    { id: 'gold', name: 'Dourado', nameEn: 'Gold', hex: '#eab308', glow: 'rgba(234, 179, 8, 0.45)', border: '#ca8a04' },
    { id: 'blue', name: 'Azul', nameEn: 'Blue', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.45)', border: '#2563eb' },
    { id: 'purple', name: 'Roxo', nameEn: 'Purple', hex: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.45)', border: '#7c3aed' },
    { id: 'red', name: 'Vermelho', nameEn: 'Red', hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.45)', border: '#dc2626' },
    { id: 'silver', name: 'Prata', nameEn: 'Silver', hex: '#94a3b8', glow: 'rgba(148, 163, 184, 0.45)', border: '#64748b' }
  ];

  const FRAMES = [
    {
      id: 'gold_classic',
      name: 'Dourada clássica',
      nameEn: 'Classic Gold',
      iconUrl: 'assets/avatars/frame-gold-classic.svg',
      borderStyle: 'gold-classic'
    },
    {
      id: 'silver_minimal',
      name: 'Prata minimalista',
      nameEn: 'Minimalist Silver',
      iconUrl: 'assets/avatars/frame-silver-minimal.svg',
      borderStyle: 'silver-minimal'
    },
    {
      id: 'gold_ornamental',
      name: 'Dourada ornamental',
      nameEn: 'Ornamental Gold',
      iconUrl: 'assets/avatars/frame-gold-ornamental.svg',
      borderStyle: 'gold-ornamental'
    },
    {
      id: 'green_premium',
      name: 'Verde premium',
      nameEn: 'Premium Green',
      iconUrl: 'assets/avatars/frame-green-premium.svg',
      borderStyle: 'green-premium'
    }
  ];

  function getDefaultAvatarState() {
    return {
      category: 'animals',
      characterId: 'bull',
      name: 'Touro',
      nameEn: 'Bull',
      subtitle: 'Força, tendência e alta.',
      subtitleEn: 'Strength, trend and rally.',
      avatarUrl: 'assets/avatars/bull.png',
      previewUrl: 'assets/avatars/preview-bull.png',
      highlightColor: 'green',
      frame: 'gold_classic',
      colour: '#10b981',
      initials: 'TR'
    };
  }

  function getAllCharacters() {
    return [...MARKET_ANIMALS, ...MARKET_SYMBOLS, ...TRADER_IDENTITY];
  }

  function getCharacterById(characterId, categoryId) {
    if (categoryId && CATALOG[categoryId]) {
      const match = CATALOG[categoryId].find(c => c.id === characterId);
      if (match) return match;
    }
    for (const cat of Object.keys(CATALOG)) {
      const match = CATALOG[cat].find(c => c.id === characterId);
      if (match) return match;
    }
    return MARKET_ANIMALS[0];
  }

  function getHighlightColorById(colorId) {
    return HIGHLIGHT_COLORS.find(c => c.id === colorId) || HIGHLIGHT_COLORS[0];
  }

  function getFrameById(frameId) {
    return FRAMES.find(f => f.id === frameId) || FRAMES[0];
  }

  function getCategoryById(categoryId) {
    const alias = categoryId === 'traders' ? 'identity' : categoryId;
    return CATEGORIES.find(c => c.id === alias) || CATEGORIES[0];
  }

  function selectCategory(state, categoryId) {
    const category = getCategoryById(categoryId);
    const categoryItems = CATALOG[category.id] || MARKET_ANIMALS;
    const sameCategory = state.category === category.id;
    const currentCharacter = sameCategory
      ? getCharacterById(state.characterId, category.id)
      : categoryItems[0];

    return {
      ...state,
      category: category.id,
      characterId: currentCharacter.id,
      name: currentCharacter.name,
      nameEn: currentCharacter.nameEn,
      subtitle: currentCharacter.subtitle,
      subtitleEn: currentCharacter.subtitleEn,
      avatarUrl: currentCharacter.avatarUrl,
      previewUrl: currentCharacter.previewUrl || currentCharacter.avatarUrl
    };
  }

  function selectCharacter(state, characterId) {
    const character = getCharacterById(characterId, state.category);
    return {
      ...state,
      characterId: character.id,
      name: character.name,
      nameEn: character.nameEn,
      subtitle: character.subtitle,
      subtitleEn: character.subtitleEn,
      avatarUrl: character.avatarUrl,
      previewUrl: character.previewUrl || character.avatarUrl
    };
  }

  function selectColor(state, colorId) {
    const color = getHighlightColorById(colorId);
    return {
      ...state,
      highlightColor: color.id,
      colour: color.hex
    };
  }

  function selectFrame(state, frameId) {
    const frame = getFrameById(frameId);
    return {
      ...state,
      frame: frame.id
    };
  }

  function paginate(items, page, pageSize) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const s = Math.max(1, parseInt(pageSize, 10) || 8);
    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / s));
    const safePage = Math.min(p, totalPages);
    const startIndex = (safePage - 1) * s;
    const endIndex = Math.min(startIndex + s, totalItems);
    const pageItems = items.slice(startIndex, endIndex);

    return {
      page: safePage,
      pageSize: s,
      totalItems,
      totalPages,
      items: pageItems,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages
    };
  }

  function normalizeAvatarState(raw) {
    if (!raw || typeof raw !== 'object') {
      return getDefaultAvatarState();
    }
    const category = getCategoryById(raw.category).id;
    const character = getCharacterById(raw.characterId || 'bull', category);
    const color = getHighlightColorById(raw.highlightColor || 'green');
    const frame = getFrameById(raw.frame || 'gold_classic');

    return {
      category,
      characterId: character.id,
      name: raw.name || character.name,
      nameEn: raw.nameEn || character.nameEn,
      subtitle: raw.subtitle || character.subtitle,
      subtitleEn: raw.subtitleEn || character.subtitleEn,
      avatarUrl: raw.avatarUrl || character.avatarUrl,
      previewUrl: raw.previewUrl || character.previewUrl || character.avatarUrl,
      highlightColor: color.id,
      frame: frame.id,
      colour: raw.colour || color.hex,
      initials: (raw.initials || 'TR').toUpperCase().slice(0, 3)
    };
  }

  function toLegacyStorageFormat(state) {
    const normalized = normalizeAvatarState(state);
    return {
      initials: normalized.initials,
      colour: normalized.colour,
      avatarUrl: normalized.avatarUrl,
      characterId: normalized.characterId,
      frame: normalized.frame
    };
  }

  function fromLegacyStorageFormat(legacy) {
    if (!legacy || typeof legacy !== 'object') {
      return getDefaultAvatarState();
    }
    const def = getDefaultAvatarState();
    return {
      ...def,
      initials: legacy.initials || def.initials,
      colour: legacy.colour || def.colour,
      characterId: legacy.characterId || def.characterId,
      avatarUrl: legacy.avatarUrl || def.avatarUrl,
      frame: legacy.frame || def.frame
    };
  }

  return {
    STORAGE_KEY_V2,
    STORAGE_KEY_V1,
    CATEGORIES,
    CATALOG,
    MARKET_ANIMALS,
    MARKET_SYMBOLS,
    TRADER_IDENTITY,
    TRADING_LEGENDS: [],
    HIGHLIGHT_COLORS,
    FRAMES,
    getAllCharacters,
    getDefaultAvatarState,
    getCharacterById,
    getHighlightColorById,
    getFrameById,
    getCategoryById,
    selectCategory,
    selectCharacter,
    selectColor,
    selectFrame,
    paginate,
    normalizeAvatarState,
    toLegacyStorageFormat,
    fromLegacyStorageFormat
  };
});

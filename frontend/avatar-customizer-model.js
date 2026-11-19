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
      id: 'legends',
      name: 'Lendas do Trading',
      nameEn: 'Trading Legends',
      subtitle: 'Estratégia e liderança',
      subtitleEn: 'Strategy and leadership',
      icon: 'crown',
      description: 'Grandes referências e lendas do trading que marcaram a história dos mercados.',
      descriptionEn: 'Great trading references and legends that marked market history.'
    },
    {
      id: 'symbols',
      name: 'Símbolos do Mercado',
      nameEn: 'Market Symbols',
      subtitle: 'Ícones do mercado',
      subtitleEn: 'Market icons',
      icon: 'bars',
      description: 'Símbolos essenciais da ação do preço, da geometria e da estrutura técnica.',
      descriptionEn: 'Classic financial market symbols and technical chart representations.'
    },
    {
      id: 'traders',
      name: 'Identidade do Trader',
      nameEn: 'Trader Identity',
      subtitle: 'Personagens do trader',
      subtitleEn: 'Trader characters',
      icon: 'trader',
      description: 'Perfis e personas que representam a mentalidade operacional.',
      descriptionEn: 'Profiles and personas representing trading psychology and mindset.'
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

  const TRADING_LEGENDS = [
    {
      id: 'livermore',
      name: 'Jesse Livermore',
      subtitle: 'O mestre do timing e do preço.',
      avatarUrl: 'assets/avatars/bull.png',
      previewUrl: 'assets/avatars/preview-bull.png',
      category: 'legends'
    },
    {
      id: 'darvas',
      name: 'Nicolas Darvas',
      subtitle: 'A arte das caixas e novos topos.',
      avatarUrl: 'assets/avatars/eagle.png',
      previewUrl: 'assets/avatars/eagle.png',
      category: 'legends'
    },
    {
      id: 'wyckoff',
      name: 'Richard Wyckoff',
      subtitle: 'Acumulação e leitura de fluxo.',
      avatarUrl: 'assets/avatars/wolf.png',
      previewUrl: 'assets/avatars/wolf.png',
      category: 'legends'
    },
    {
      id: 'oneil',
      name: 'William O\'Neil',
      subtitle: 'CAN SLIM e liderança setorial.',
      avatarUrl: 'assets/avatars/lion.png',
      previewUrl: 'assets/avatars/lion.png',
      category: 'legends'
    },
    {
      id: 'seykota',
      name: 'Ed Seykota',
      subtitle: 'Seguidor sistemático de tendência.',
      avatarUrl: 'assets/avatars/panther.png',
      previewUrl: 'assets/avatars/panther.png',
      category: 'legends'
    },
    {
      id: 'ptj',
      name: 'Paul Tudor Jones',
      subtitle: 'Defesa implacável de capital.',
      avatarUrl: 'assets/avatars/bear.png',
      previewUrl: 'assets/avatars/bear.png',
      category: 'legends'
    },
    {
      id: 'druckenmiller',
      name: 'Stanley Druckenmiller',
      subtitle: 'Convicção máxima e assimetria.',
      avatarUrl: 'assets/avatars/falcon.png',
      previewUrl: 'assets/avatars/falcon.png',
      category: 'legends'
    },
    {
      id: 'minervini',
      name: 'Mark Minervini',
      subtitle: 'VCP e volatilidade controlada.',
      avatarUrl: 'assets/avatars/deer.png',
      previewUrl: 'assets/avatars/deer.png',
      category: 'legends'
    }
  ];

  const MARKET_SYMBOLS = [
    {
      id: 'candlestick',
      name: 'Candle de Força',
      subtitle: 'Expansão direcional e volume.',
      avatarUrl: 'assets/avatars/bull.png',
      previewUrl: 'assets/avatars/preview-bull.png',
      category: 'symbols'
    },
    {
      id: 'breakout',
      name: 'Rompimento',
      subtitle: 'Gatilho de nova tendência.',
      avatarUrl: 'assets/avatars/eagle.png',
      previewUrl: 'assets/avatars/eagle.png',
      category: 'symbols'
    },
    {
      id: 'moving_averages',
      name: 'Alinhamento Médias',
      subtitle: 'EMAs 10, 20 e 72 sincronizadas.',
      avatarUrl: 'assets/avatars/panther.png',
      previewUrl: 'assets/avatars/panther.png',
      category: 'symbols'
    },
    {
      id: 'risk_shield',
      name: 'Escudo de Risco',
      subtitle: 'Stop técnico inegociável.',
      avatarUrl: 'assets/avatars/bear.png',
      previewUrl: 'assets/avatars/bear.png',
      category: 'symbols'
    },
    {
      id: 'golden_cross',
      name: 'Cruzamento Dourado',
      subtitle: 'Início do ciclo de alta.',
      avatarUrl: 'assets/avatars/lion.png',
      previewUrl: 'assets/avatars/lion.png',
      category: 'symbols'
    },
    {
      id: 'fibonacci',
      name: 'Espiral Áurea',
      subtitle: 'Proporção harmônica natural.',
      avatarUrl: 'assets/avatars/deer.png',
      previewUrl: 'assets/avatars/deer.png',
      category: 'symbols'
    },
    {
      id: 'relative_strength',
      name: 'Força Relativa 90+',
      subtitle: 'Superando o índice de referência.',
      avatarUrl: 'assets/avatars/falcon.png',
      previewUrl: 'assets/avatars/falcon.png',
      category: 'symbols'
    },
    {
      id: 'alpha_star',
      name: 'Estrela Alfa',
      subtitle: 'Assimetria positiva e payoff.',
      avatarUrl: 'assets/avatars/wolf.png',
      previewUrl: 'assets/avatars/wolf.png',
      category: 'symbols'
    }
  ];

  const TRADER_IDENTITY = [
    {
      id: 'strategist',
      name: 'O Estrategista',
      subtitle: 'Mapeamento macro e paciência.',
      avatarUrl: 'assets/avatars/eagle.png',
      previewUrl: 'assets/avatars/eagle.png',
      category: 'traders'
    },
    {
      id: 'zen_executor',
      name: 'O Executor Zen',
      subtitle: 'Execução sem hesitação ou apego.',
      avatarUrl: 'assets/avatars/panther.png',
      previewUrl: 'assets/avatars/panther.png',
      category: 'traders'
    },
    {
      id: 'sentinel',
      name: 'A Sentinela',
      subtitle: 'Vigília e seleção de oportunidades.',
      avatarUrl: 'assets/avatars/wolf.png',
      previewUrl: 'assets/avatars/wolf.png',
      category: 'traders'
    },
    {
      id: 'trend_rider',
      name: 'O Seguidor de Tendência',
      subtitle: 'Comprar caro para vender mais caro.',
      avatarUrl: 'assets/avatars/bull.png',
      previewUrl: 'assets/avatars/preview-bull.png',
      category: 'traders'
    },
    {
      id: 'risk_officer',
      name: 'O Gestor de Risco',
      subtitle: 'Sobrevivência e preservação.',
      avatarUrl: 'assets/avatars/bear.png',
      previewUrl: 'assets/avatars/bear.png',
      category: 'traders'
    },
    {
      id: 'journal_master',
      name: 'O Mestre do Diário',
      subtitle: 'Reflexão e melhoria contínua.',
      avatarUrl: 'assets/avatars/deer.png',
      previewUrl: 'assets/avatars/deer.png',
      category: 'traders'
    },
    {
      id: 'sniper',
      name: 'O Sniper de Volatilidade',
      subtitle: 'Aguardar a contração perfeita.',
      avatarUrl: 'assets/avatars/falcon.png',
      previewUrl: 'assets/avatars/falcon.png',
      category: 'traders'
    },
    {
      id: 'disciplined_lion',
      name: 'O Trader Disciplinado',
      subtitle: 'Respeito irrestrito ao plano.',
      avatarUrl: 'assets/avatars/lion.png',
      previewUrl: 'assets/avatars/lion.png',
      category: 'traders'
    }
  ];

  const CATALOG = {
    animals: MARKET_ANIMALS,
    legends: TRADING_LEGENDS,
    symbols: MARKET_SYMBOLS,
    traders: TRADER_IDENTITY
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
      subtitle: 'Força, tendência e alta.',
      avatarUrl: 'assets/avatars/bull.png',
      previewUrl: 'assets/avatars/preview-bull.png',
      highlightColor: 'green',
      frame: 'gold_classic',
      colour: '#10b981',
      initials: 'TR'
    };
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
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
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
      subtitle: currentCharacter.subtitle,
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
      subtitle: character.subtitle,
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
      subtitle: raw.subtitle || character.subtitle,
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
    TRADING_LEGENDS,
    MARKET_SYMBOLS,
    TRADER_IDENTITY,
    HIGHLIGHT_COLORS,
    FRAMES,
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

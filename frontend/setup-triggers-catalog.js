(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SetupTriggersCatalog = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TRIGGERS = [
    {
      id: 'INSIDE_BAR',
      name: 'Inside Bar',
      shortLabel: 'Inside Bar',
      whatIs: 'Candle cuja máxima é menor que a máxima do candle anterior e cuja mínima é maior que a mínima do candle anterior. Ou seja, o candle fica totalmente contido dentro dos limites do candle anterior.',
      howToIdentify: 'Identifique um candle que esteja completamente contido dentro da amplitude (máxima e mínima) do candle imediatamente anterior (candle-mãe). Visualmente, é uma barra estreita contida dentro da barra precedente.',
      concept: 'Representa uma pausa, contração de volatilidade ou indecisão momentânea após um movimento prévio. Comprime a volatilidade antes de uma retomada expansiva a favor da tendência.',
      conditions: [
        'Ocorre preferencialmente em tendência de alta alinhada (médias móveis inclinadas para cima).',
        'Surge em região de repouso ou suporte dinâmico (próximo à EMA 20/21 ou topo anterior rompido).',
        'O candle anterior (mãe) estabelece o intervalo máximo de referência para o rompimento.'
      ],
      entryTrigger: 'Compra 1 tick/ponto acima da máxima da Inside Bar.',
      stop: '1 tick/ponto abaixo da mínima da Inside Bar (ou abaixo da mínima do candle-mãe para um stop técnico mais folgado).',
      visualExample: [
        '    [Candle Mãe]       [Inside Bar]',
        '        | Máxima',
        '      ┌───┐                  | Máxima (menor) <-- Superação = COMPRA',
        '      │   │                ┌───┐',
        '      │   │                └───┘',
        '      │   │                  | Mínima (maior) <-- Stop 1 tick abaixo',
        '      └───┘',
        '        | Mínima'
      ].join('\n'),
      observations: 'Evite Inside Bars excessivamente amplas ou em mercados laterais sem direção definida. O setup ganha alta probabilidade quando acompanhado de volume decrescente durante a contração e expansão de volume no rompimento.'
    },
    {
      id: 'PFR_COMPRA',
      name: 'PFR de Compra',
      shortLabel: 'PFR de Compra',
      whatIs: 'Padrão de Fechamento de Reversão de fundo formado por 2 ou 3 candles. No modelo mais clássico de 2 candles: o candle atual faz uma mínima mais baixa que a mínima do candle anterior, porém fecha com um fechamento maior que o fechamento anterior.',
      howToIdentify: 'Observe uma perna de recuo corretivo. O candle de sinal renova a mínima do candle anterior (fazendo uma nova mínima local), mas os compradores reagem com força e fecham o candle acima do fechamento do candle prévio.',
      concept: 'Mostra que os vendedores tentaram empurrar o preço para baixo, mas os compradores absorveram a pressão e fecharam o candle acima do patamar anterior, rejeitando as cotações mais baixas e confirmando suporte.',
      conditions: [
        'Ocorre após um recuo corretivo em direção a uma média ascendente (ex: EMA 20 ou EMA 21).',
        'Mínima do candle de sinal é menor que a mínima do candle anterior.',
        'Fechamento do candle de sinal é estritamente maior que o fechamento do candle anterior.'
      ],
      entryTrigger: 'Compra na superação da máxima do candle que confirmou o PFR.',
      stop: 'Abaixo da mínima desse candle de sinal.',
      visualExample: [
        '     [Candle 1]           [Candle 2 - PFR]',
        '         |                     | Máxima  <-- Superação = COMPRA',
        '       ┌───┐                 ┌───┐ (Fechamento > Fechamento 1)',
        '       │   │                 │   │',
        '       └───┘                 │   │',
        '         | Mínima            └───┘',
        '                               | Mínima mais baixa (fundo) <-- STOP'
      ].join('\n'),
      observations: 'O PFR é especialmente potente quando ocorre com cauda inferior evidente (rejeição de preço) em suporte de médias móveis ou retração de Fibonacci.'
    },
    {
      id: '123_COMPRA',
      name: '1-2-3 de Compra',
      shortLabel: '1-2-3 de Compra',
      whatIs: 'Formação clássica de fundo composta por 3 candles consecutivos: Candle 1 é a primeira referência; Candle 2 faz uma mínima mais baixa que o Candle 1, formando o fundo; Candle 3 faz uma mínima mais alta que a do Candle 2.',
      howToIdentify: 'Em um movimento corretivo: localize o candle que fez a mínima mais baixa do recuo (Candle 2). O candle imediatamente anterior é o 1 (com mínima mais alta). O candle posterior é o 3 (que não perde a mínima do 2 e fecha acima).',
      concept: 'Confirma a formação de um fundo duplo local ou suporte temporário dentro do recuo até a média móvel, estruturando um pivô de alta de menor escala.',
      conditions: [
        'Tendência primária de alta intacta com médias apontando para cima.',
        'Mínima do Candle 2 é estritamente menor que a mínima do Candle 1 e do Candle 3 (o Candle 2 é o vértice do fundo).',
        'O Candle 3 fecha confirmando a sustentação do suporte do Candle 2.'
      ],
      entryTrigger: 'Compra na violação da máxima do Candle 3.',
      stop: 'Abaixo da mínima do Candle 2 (o fundo da formação).',
      visualExample: [
        '   [1]           [3]  <-- Superação da máxima do 3 = COMPRA',
        '    |             |',
        '  ┌───┐         ┌───┐',
        '  │   │   [2]   └───┘',
        '  └───┘    |      | Mínima mais alta que a do 2',
        '    |    ┌───┐',
        '         └───┘',
        '           | Mínima mais baixa (Fundo 2) <-- STOP'
      ].join('\n'),
      observations: 'Se o Candle 3 for violado para baixo antes de acionar a compra na máxima, o setup fica cancelado ou recalculado se uma nova mínima for estabelecida.'
    },
    {
      id: 'DAVE_LANDRY',
      name: 'Dave Landry',
      shortLabel: 'Dave Landry',
      whatIs: 'Setup clássico de correção para média móvel em tendência. Identifica um respiro saudável da tendência primária até a região de suporte das médias.',
      howToIdentify: 'Com a média móvel (EMA 20 ou EMA 21) inclinada para cima, observe o ativo realizando um recuo ordenado com pelo menos duas mínimas consecutivas mais baixas (mínimas descendentes).',
      concept: 'Identifica um respiro saudável da tendência primária até a região de suporte das médias, permitindo entrar na tendência pagando um preço menor e com stop curto.',
      conditions: [
        'A média móvel (geralmente EMA 20 ou EMA 21) deve estar nitidamente inclinada para cima.',
        'O mercado realiza um recuo com duas ou mais mínimas consecutivas mais baixas.',
        'O preço se aproxima ou toca a região de suporte dinâmico da média.'
      ],
      entryTrigger: 'Compra no rompimento da máxima do primeiro candle que tiver sua máxima superada após a sequência de mínimas descendentes.',
      stop: 'Abaixo da mínima do candle que gerou o gatilho (ou mínima do recuo).',
      visualExample: [
        '    [Tendência Alta / EMA 20 ↗]',
        '         |',
        '       ┌───┐',
        '       └───┘  [Mínima 1 menor]',
        '         |       |',
        '               ┌───┐  [Mínima 2 menor]',
        '               └───┘     |',
        '                 |     ┌───┐  <-- Superação da máxima = COMPRA',
        '                       └───┘',
        '              ~~~~~~~~~~~|~~~~~~~~~~ (EMA 20 / EMA 21)',
        '                         Stop abaixo da mínima do recuo'
      ].join('\n'),
      observations: 'Dave Landry enfatiza: nunca opere o setup se a média de 20 períodos estiver horizontal ou descendente. A inclinação da média é o filtro essencial de alinhamento com a força compradora dominante.'
    },
    {
      id: 'RBI',
      name: 'Barra Vermelha Ignorada (RBI)',
      shortLabel: 'Barra Vermelha Ignorada (RBI)',
      whatIs: 'Em uma forte tendência de alta, com predominância de candles verdes, surge uma única barra corretiva vermelha, geralmente com volume moderado ou corpo reduzido.',
      howToIdentify: 'Procure uma perna de alta vigorosa e impulsiva (múltiplas barras verdes). No meio da impulsão, surge uma barra vermelha solitária de tamanho pequeno/médio. O candle seguinte retoma a força e rompe a máxima dessa barra vermelha.',
      concept: 'Representa uma tentativa fraca dos vendedores contra uma tendência dominante. A força compradora ignora essa pressão e retoma de imediato o fluxo de alta.',
      conditions: [
        'Forte tendência de alta prévia com momentum e médias alinhadas.',
        'Uma única barra vermelha de amplitude pequena/média (não pode ser barra de reversão com volume extremo).',
        'Ocorre em região de continuidade, sem exaustão climática.'
      ],
      entryTrigger: 'Compra 1 tick/ponto acima da máxima da barra vermelha quando o candle seguinte superar esse nível.',
      stop: '1 tick/ponto abaixo da mínima da barra vermelha.',
      visualExample: [
        '   [Verde]  [Verde]  [BARRA VERMELHA]  [Candle Seguinte]',
        '      |        |            |                |',
        '    ┌───┐    ┌───┐        ┌───┐  <-- Superação da máxima = COMPRA (IGNORA!)',
        '    │   │    │   │        │▓▓▓│            ┌───┐',
        '    │   │    │   │        └───┘            │   │',
        '    └───┘    └───┘          | Mínima       └───┘',
        '                            Stop 1 tick abaixo'
      ].join('\n'),
      observations: 'A barra vermelha deve ter volume inferior ou similar às barras verdes anteriores. Se apresentar volume anormalmente explosivo com fechamento na mínima extrema, pode indicar início de distribuição e não uma RBI confiável.'
    }
  ];

  const TRIGGER_MAP = new Map(TRIGGERS.map(t => [t.id, t]));

  function getAllTriggers() {
    return TRIGGERS.map(t => ({ ...t }));
  }

  function getTriggerById(id) {
    if (!id || typeof id !== 'string') return null;
    const cleanId = id.trim().toUpperCase();
    return TRIGGER_MAP.get(cleanId) ? { ...TRIGGER_MAP.get(cleanId) } : null;
  }

  function isValidTrigger(id) {
    if (!id || typeof id !== 'string') return false;
    return TRIGGER_MAP.has(id.trim().toUpperCase());
  }

  function normalizeKey(value) {
    if (!value || typeof value !== 'string') return null;
    const clean = value.trim();
    const upper = clean.toUpperCase();
    if (TRIGGER_MAP.has(upper)) return upper;

    // Normalização semântica para compatibilidade com dados legados ou rótulos
    const normalized = clean
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (normalized.includes('rbi') || normalized.includes('vermelha') || normalized.includes('ignorada')) {
      return 'RBI';
    }
    if (normalized.includes('inside')) {
      return 'INSIDE_BAR';
    }
    if (normalized.includes('pfr')) {
      return 'PFR_COMPRA';
    }
    if (normalized.includes('1-2-3') || normalized.includes('123') || normalized.includes('contracao 1-2-3')) {
      return '123_COMPRA';
    }
    if (normalized.includes('dave') || normalized.includes('landry')) {
      return 'DAVE_LANDRY';
    }

    return null;
  }

  function getTriggerLabel(idOrValue, fallback = 'Não informado') {
    if (!idOrValue) return fallback;
    const key = normalizeKey(String(idOrValue));
    if (key && TRIGGER_MAP.has(key)) {
      return TRIGGER_MAP.get(key).name;
    }
    // Se for um texto legado que não mapeou para nenhum dos 5, exibe o fallback conforme regra de trades antigos
    return fallback;
  }

  function getTriggerOptions() {
    return TRIGGERS.map(t => ({
      value: t.id,
      label: t.name,
      shortLabel: t.shortLabel
    }));
  }

  function formatTriggerBadge(idOrValue, options = {}) {
    const key = normalizeKey(String(idOrValue || ''));
    const isAssigned = Boolean(key && TRIGGER_MAP.has(key));
    const label = isAssigned ? TRIGGER_MAP.get(key).name : (options.fallback || 'Não informado');
    const shortLabel = isAssigned ? TRIGGER_MAP.get(key).shortLabel : label;
    return {
      key: key || null,
      label,
      shortLabel,
      isAssigned,
      badgeText: `GATILHO: ${label}`
    };
  }

  return {
    TRIGGERS,
    getAllTriggers,
    getTriggerById,
    isValidTrigger,
    normalizeKey,
    getTriggerLabel,
    getTriggerOptions,
    formatTriggerBadge
  };
});

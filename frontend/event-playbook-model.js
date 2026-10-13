/**
 * EVENT PLAYBOOK — DOMAIN & LOGIC MODEL
 * Healthy Trend Trader
 *
 * Biblioteca histórica de eventos de mercado e memória operacional do trader.
 * Cadastro único compartilhado com a Central de Mercado (mesma entidade de negócio).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EventPlaybookModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEY_PLAYBOOK = 'healthy-trend-event-playbook-v1';
  const LEGACY_KEY_CUSTOM_EVENTS = 'healthy-trend-central-events-v1';
  const LEGACY_KEY_REACTIONS = 'healthy-trend-central-reactions-v1';

  const CATEGORIES = [
    'Todos',
    'Política',
    'Macro',
    'Geopolítica',
    'Earnings',
    'Tarifas',
    'Banco Central',
    'Commodities',
    'Black Swan',
    'Outros'
  ];

  const EVIDENCE_TYPES = [
    { id: 'before', label: 'Antes do evento', desc: 'Contexto anterior ao acontecimento, estrutura gráfica e tendência' },
    { id: 'during', label: 'Durante o evento', desc: 'Reação inicial do mercado, gaps e expansão de volatilidade' },
    { id: 'after', label: 'Depois do evento', desc: 'Comportamento nos dias seguintes, consolidação ou continuação' },
    { id: 'news', label: 'Notícias e comunicados', desc: 'Prints de notícias oficiais, manchetes e relatórios' },
    { id: 'other', label: 'Outras evidências', desc: 'Anotações complementares e evidências extras' }
  ];

  const DEFAULT_SEEDS = [
    {
      id: 'evt-payroll',
      name: 'Payroll (EUA)',
      date: '2026-10-07',
      eventDate: '2026-10-07',
      time: '09:30',
      eventTime: '09:30',
      timezone: 'America/Sao_Paulo',
      category: 'Macro',
      impact: 5,
      impactLevel: 'ALTO',
      country: 'EUA',
      relatedAssets: 'EUA / Dólar / Índices',
      affectedAssets: 'SPX, NDX, DXY, DI1F29',
      description: 'Relatório mensal de criação de empregos e taxa de desemprego nos Estados Unidos.',
      whatHappened: 'Criação de vagas acima do esperado provocou repique inicial dos yields dos Treasuries e correção pontual nos índices futuros.',
      marketReaction: 'Abertura volátil com absorção compradora após 30 minutos de negociação.',
      volatilityBehavior: 'Expansão rápida seguida de absorção',
      initialDirection: 'Baixa',
      gap: '-0.4%',
      volume: '2.1x média',
      atr: '1.8x ATR diário',
      impactDuration: '2 a 4 horas',
      tradingImplications: 'Aguardar 30 minutos após a divulgação antes de abrir novas posições. Não antecipar o número.',
      lessonsLearned: 'Evitar antecipar número de emprego. A primeira vela de 15m quase sempre tem falso rompimento com violinada.',
      tags: ['Emprego', 'Fed', 'Macro EUA', 'Dólar'],
      sources: ['Bureau of Labor Statistics (BLS)', 'Investing.com'],
      screenshots: [],
      source: 'Oficial'
    },
    {
      id: 'evt-fed-rate',
      name: 'Decisão de Juros (EUA - Fed)',
      date: '2026-10-08',
      eventDate: '2026-10-08',
      time: '15:00',
      eventTime: '15:00',
      timezone: 'America/Sao_Paulo',
      category: 'Banco Central',
      impact: 5,
      impactLevel: 'ALTO',
      country: 'EUA',
      relatedAssets: 'Índices / Dólar / Juros',
      affectedAssets: 'SPX, NDX, DXY, IBOV',
      description: 'Decisão do comitê FOMC sobre a taxa de juros básica americana e coletiva de imprensa.',
      whatHappened: 'Corte de 25 bps confirmado com coletiva indicando cautela na velocidade dos próximos cortes.',
      marketReaction: 'Movimento unidirecional de alta nos índices de tecnologia.',
      volatilityBehavior: 'Volatilidade unidirecional sem retorno',
      initialDirection: 'Alta',
      gap: '+0.8%',
      volume: '2.5x média',
      atr: '2.2x ATR diário',
      impactDuration: 'Sessão inteira e dias seguintes',
      tradingImplications: 'Não operar durante a entrevista coletiva do presidente do Fed.',
      lessonsLearned: 'O comunicado gera o primeiro spike, mas a direção definitiva só se consolida durante as respostas aos jornalistas na coletiva.',
      tags: ['FOMC', 'Taxa de Juros', 'Jerome Powell', 'Wall Street'],
      sources: ['Federal Reserve', 'Bloomberg'],
      screenshots: [],
      source: 'Oficial'
    },
    {
      id: 'evt-ipca',
      name: 'IPCA (Brasil)',
      date: '2026-10-10',
      eventDate: '2026-10-10',
      time: '09:00',
      eventTime: '09:00',
      timezone: 'America/Sao_Paulo',
      category: 'Macro',
      impact: 3,
      impactLevel: 'MÉDIO',
      country: 'Brasil',
      relatedAssets: 'IBOV / Juros / Bancos',
      affectedAssets: 'IBOV, DI1F29, Bancos',
      description: 'Índice Nacional de Preços ao Consumidor Amplo medido pelo IBGE.',
      whatHappened: 'IPCA veio dentro das projeções de mercado (0,32%), sem estresse na curva futura de DI.',
      marketReaction: 'Mercado abriu estável e respeitou suportes técnicos nos principais papéis.',
      volatilityBehavior: 'Reação fraca / neutra',
      initialDirection: 'Neutra',
      gap: '0.0%',
      volume: '1.0x média',
      atr: '1.0x ATR diário',
      impactDuration: 'Menos de 1 hora',
      tradingImplications: 'Mercado livre para seguir tendências técnicas dos ativos individuais.',
      lessonsLearned: 'Quando a inflação vem em linha com o consenso, o foco volta 100% para os setups gráficos de continuidade e Trend Following.',
      tags: ['Inflação', 'IBGE', 'IBOV', 'Curva de DI'],
      sources: ['IBGE', 'Valor Econômico'],
      screenshots: [],
      source: 'Oficial'
    },
    {
      id: 'evt-china-pmi',
      name: 'Produção Industrial (China)',
      date: '2026-10-12',
      eventDate: '2026-10-12',
      time: '11:00',
      eventTime: '11:00',
      timezone: 'America/Sao_Paulo',
      category: 'Commodities',
      impact: 3,
      impactLevel: 'MÉDIO',
      country: 'China',
      relatedAssets: 'Commodities / Mineração',
      affectedAssets: 'VALE3, CSNA3, GGBR4',
      description: 'Indicadores de atividade e demanda de manufatura da maior compradora mundial de commodities.',
      whatHappened: 'PMI industrial da China indicou ligeira expansão, impulsionando minério de ferro e siderurgia na B3.',
      marketReaction: 'Gap de alta nas ações de mineração com absorção suave ao longo do pregão.',
      volatilityBehavior: 'Expansão rápida seguida de absorção',
      initialDirection: 'Alta',
      gap: '+1.1%',
      volume: '1.4x média',
      atr: '1.3x ATR diário',
      impactDuration: 'Pregão diário',
      tradingImplications: 'Buscar entradas em setups de rompimento e continuação nos ativos ligados a commodities metálicas.',
      lessonsLearned: 'Dados de atividade da China têm impacto direto na abertura de mineradoras e siderúrgicas brasileiras.',
      tags: ['China', 'PMI', 'Minério de Ferro', 'VALE3'],
      sources: ['National Bureau of Statistics China', 'Reuters'],
      screenshots: [],
      source: 'Oficial'
    },
    {
      id: 'evt-copom',
      name: 'Decisão de Juros (Brasil - Copom)',
      date: '2026-10-13',
      eventDate: '2026-10-13',
      time: '10:00',
      eventTime: '10:00',
      timezone: 'America/Sao_Paulo',
      category: 'Banco Central',
      impact: 5,
      impactLevel: 'ALTO',
      country: 'Brasil',
      relatedAssets: 'IBOV / Juros / Bancos',
      affectedAssets: 'IBOV, DI1F29, Imobiliário, Consumo',
      description: 'Divulgação da taxa Selic pelo Banco Central do Brasil com comunicado oficial de diretrizes.',
      whatHappened: 'Manutenção da taxa Selic com tom hawkish no comunicado, elevando inclinação da curva de juros.',
      marketReaction: 'Queda acentuada em Small Caps de consumo e construção civil; estabilidade em bancos e exportadoras.',
      volatilityBehavior: 'Volatilidade unidirecional sem retorno',
      initialDirection: 'Baixa',
      gap: '-0.9%',
      volume: '1.8x média',
      atr: '1.7x ATR diário',
      impactDuration: 'Múltiplos pregões',
      tradingImplications: 'Reduzir exposição em setores sensíveis a juros altos (construção civil e varejo alavancado).',
      lessonsLearned: 'Comunicados com viés de juros restritivos punem Small Caps domésticas e favorecem empresas descorrelacionadas ou exportadoras.',
      tags: ['Copom', 'Selic', 'Banco Central', 'DI Futuro'],
      sources: ['Banco Central do Brasil', 'InfoMoney'],
      screenshots: [],
      source: 'Oficial'
    },
    {
      id: 'evt-eleicao-eua',
      name: 'Eleição Presidencial EUA',
      date: '2024-11-05',
      eventDate: '2024-11-05',
      time: '20:00',
      eventTime: '20:00',
      timezone: 'America/Sao_Paulo',
      category: 'Política',
      impact: 5,
      impactLevel: 'ALTO',
      country: 'EUA',
      relatedAssets: 'S&P 500, Russell 2000, Dólar, Bitcoin',
      affectedAssets: 'SPX, NDX, BTC, DXY, IBOV',
      description: 'Eleição presidencial americana com desfecho eleitoral e definição das bancadas legislativas.',
      whatHappened: 'Vitória republicana confirmada com reação imediata pró-desregulamentação e forte rali em ações de pequena capitalização e criptoativos.',
      marketReaction: 'Abertura em gap de alta em todos os índices de risco com rali sustentado durante vários dias.',
      volatilityBehavior: 'Volatilidade unidirecional sem retorno',
      initialDirection: 'Alta',
      gap: '+2.4%',
      volume: '2.8x média',
      atr: '2.6x ATR diário',
      impactDuration: 'Semanas',
      tradingImplications: 'Reduzir posições na véspera da eleição. Aguardar confirmação da apuração antes de aumentar risco.',
      lessonsLearned: 'Eventos eleitorais podem gerar expansão extrema de volatilidade. Esperar a reação inicial e procurar oportunidades somente depois que o mercado começar a estabilizar.',
      tags: ['Eleições EUA', 'Trump Trade', 'Russell 2000', 'Bitcoin', 'Dólar'],
      sources: ['Associated Press', 'Bloomberg', 'Wall Street Journal'],
      screenshots: [],
      source: 'Histórico'
    },
    {
      id: 'evt-msft-earnings',
      name: 'Earnings Microsoft (MSFT)',
      date: '2024-10-30',
      eventDate: '2024-10-30',
      time: '17:00',
      eventTime: '17:00',
      timezone: 'America/Sao_Paulo',
      category: 'Earnings',
      impact: 4,
      impactLevel: 'ALTO',
      country: 'EUA',
      relatedAssets: 'MSFT, NDX, Big Tech, Nuvem',
      affectedAssets: 'MSFT, AAPL, QQQ, NDX',
      description: 'Divulgação dos resultados trimestrais com foco nas receitas da divisão Azure e despesas de capital com inteligência artificial.',
      whatHappened: 'Receita veio acima do consenso, porém o guidance de Capex acelerado provocou realização defensiva de curto prazo.',
      marketReaction: 'Queda de 4% no after-market, contaminando o setor de tecnologia na abertura seguinte.',
      volatilityBehavior: 'Expansão rápida seguida de absorção',
      initialDirection: 'Baixa',
      gap: '-3.8%',
      volume: '2.2x média',
      atr: '1.9x ATR diário',
      impactDuration: '2 a 3 pregões',
      tradingImplications: 'Nunca carregar posição cheia comprada através de balanço de Big Tech sem proteção de lucros.',
      lessonsLearned: 'Mesmo com lucro recorde, a reação de curto prazo em empresas líderes é ditada pelas projeções de despesas de capital futuras.',
      tags: ['Big Tech', 'Balanços', 'Azure', 'Inteligência Artificial'],
      sources: ['Microsoft Investor Relations', 'CNBC'],
      screenshots: [],
      source: 'Histórico'
    },
    {
      id: 'evt-conflito-oriente',
      name: 'Conflito Israel x Irã',
      date: '2024-10-01',
      eventDate: '2024-10-01',
      time: '14:30',
      eventTime: '14:30',
      timezone: 'America/Sao_Paulo',
      category: 'Geopolítica',
      impact: 5,
      impactLevel: 'ALTO',
      country: 'Global',
      relatedAssets: 'Petróleo WTI, Ouro, VIX, Ações Aéreas',
      affectedAssets: 'WTI, BRENT, GOLD, VIX, PETR4',
      description: 'Escalada militar com disparos de mísseis no Oriente Médio e temores sobre interrupção no Estreito de Ormuz.',
      whatHappened: 'Spike imediato de 5% nas cotações de barril de petróleo e forte procura por proteção em títulos e metais preciosos.',
      marketReaction: 'Índices de ações despencaram na primeira hora, mas absorveram as perdas nos dias seguintes com descompressão do risco.',
      volatilityBehavior: 'Expansão rápida seguida de absorção',
      initialDirection: 'Alta',
      gap: '+4.2%',
      volume: '3.1x média',
      atr: '2.5x ATR diário',
      impactDuration: '48 a 72 horas',
      tradingImplications: 'Não comprar rompimento de topo em petróleo gerado exclusivamente por choque geopolítico de curto prazo.',
      lessonsLearned: 'Picos de volatilidade causados por choques geopolíticos tendem a arrefecer em 48 a 72 horas se a infraestrutura física de produção não for interrompida.',
      tags: ['Geopolítica', 'Petróleo', 'Ouro', 'VIX', 'Conflito'],
      sources: ['Reuters', 'Al Jazeera', 'Financial Times'],
      screenshots: [],
      source: 'Histórico'
    },
    {
      id: 'evt-svb-crisis',
      name: 'Crise Bancária — Silicon Valley Bank (SVB)',
      date: '2023-03-10',
      eventDate: '2023-03-10',
      time: '11:00',
      eventTime: '11:00',
      timezone: 'America/Sao_Paulo',
      category: 'Black Swan',
      impact: 5,
      impactLevel: 'EXTREMO',
      country: 'EUA',
      relatedAssets: 'Bancos Regionais (KRE), Juros dos Treasuries, Ouro',
      affectedAssets: 'KRE, XLF, Treasuries 2Y, GOLD, IBOV',
      description: 'Corrida bancária relâmpago provocada por perdas não realizadas em carteiras de títulos públicos e intervenção da FDIC.',
      whatHappened: 'Falência relâmpago do 16º maior banco dos EUA em menos de 48 horas, gerando pânico sistêmico nos bancos médios.',
      marketReaction: 'Colapso de até 60% em bancos regionais, queda recorde nos yields de 2 anos dos EUA e voo imediato para liquidez.',
      volatilityBehavior: 'Volatilidade unidirecional sem retorno',
      initialDirection: 'Baixa',
      gap: '-5.1%',
      volume: '4.2x média',
      atr: '3.4x ATR diário',
      impactDuration: 'Semanas',
      tradingImplications: 'Encerrar imediatamente posições em bancos médios e ativar modo defensivo sem discutir com o mercado.',
      lessonsLearned: 'Crises de solvência bancária na era digital se propagam com velocidade extrema. Respeitar o stop loss sem qualquer hesitação.',
      tags: ['Black Swan', 'Bancos Regionais', 'FDIC', 'Pânico Sistêmico'],
      sources: ['FDIC', 'Wall Street Journal', 'Bloomberg'],
      screenshots: [],
      source: 'Histórico'
    },
    {
      id: 'evt-tarifas-china',
      name: 'Tarifas Comerciais sobre Produtos Chineses',
      date: '2024-05-14',
      eventDate: '2024-05-14',
      time: '10:00',
      eventTime: '10:00',
      timezone: 'America/Sao_Paulo',
      category: 'Tarifas',
      impact: 4,
      impactLevel: 'ALTO',
      country: 'EUA',
      relatedAssets: 'Semicondutores, Veículos Elétricos, Cobre',
      affectedAssets: 'TSLA, NVDA, BDRs de tecnologia',
      description: 'Anúncio de elevação de tarifas alfandegárias de 100% para veículos elétricos e 50% para semicondutores importados da China.',
      whatHappened: 'Impacto inflacionário setorial e proteção para fabricantes domésticos americanos.',
      marketReaction: 'Reação mista com rotação entre setores beneficiados e cadeias de suprimentos dependentes de insumos externos.',
      volatilityBehavior: 'Expansão rápida seguida de absorção',
      initialDirection: 'Neutra',
      gap: '-0.3%',
      volume: '1.2x média',
      atr: '1.2x ATR diário',
      impactDuration: 'Múltiplos pregões',
      tradingImplications: 'Evitar comprar rompimentos em cadeias de suprimentos dependentes até o alinhamento das margens operacionais.',
      lessonsLearned: 'Tarifas provocam reprecificação lenta de custos ao longo de semanas. Focar em empresas com poder comprovado de repasse de preços.',
      tags: ['Tarifas', 'Guerra Comercial', 'Veículos Elétricos', 'China'],
      sources: ['White House Press Office', 'Reuters'],
      screenshots: [],
      source: 'Histórico'
    }
  ];

  const memoryStore = new Map();

  function safeStorageGet(key) {
    try {
      if (typeof window !== 'undefined' && window.healthyTrendWorkspace?.raw) {
        const raw = window.healthyTrendWorkspace.raw(key);
        if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const local = localStorage.getItem(key);
        if (local) return JSON.parse(local);
      }
    } catch (_) {}
    return memoryStore.get(key) || null;
  }

  function safeStorageSet(key, value) {
    memoryStore.set(key, value);
    try {
      if (typeof window !== 'undefined' && window.healthyTrendWorkspace?.save) {
        window.healthyTrendWorkspace.save(key, value);
      }
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (_) {}
  }

  function normalizeImpact(value) {
    if (typeof value === 'number') {
      return Math.max(1, Math.min(5, Math.round(value)));
    }
    const str = String(value || '').toUpperCase().trim();
    if (str === 'EXTREMO' || str === '5') return 5;
    if (str === 'ALTO' || str === '4') return 4;
    if (str === 'MÉDIO' || str === 'MEDIO' || str === '3') return 3;
    if (str === 'BAIXO' || str === '2') return 2;
    if (str === 'MUITO BAIXO' || str === '1') return 1;
    return 3;
  }

  function impactToLevel(impactNum) {
    switch (impactNum) {
      case 5: return 'EXTREMO';
      case 4: return 'ALTO';
      case 3: return 'MÉDIO';
      case 2: return 'BAIXO';
      case 1:
      default:
        return 'BAIXO';
    }
  }

  /**
   * Normaliza um item garantindo todas as propriedades padronizadas
   */
  function normalizeEvent(item) {
    if (!item) return null;
    const impactNum = normalizeImpact(item.impact);
    const dateVal = String(item.date || item.eventDate || new Date().toISOString().slice(0, 10));
    const timeVal = String(item.time || item.eventTime || '10:00');

    return {
      id: String(item.id || ('evt-' + Date.now())),
      name: String(item.name || '').trim(),
      date: dateVal,
      eventDate: dateVal,
      time: timeVal,
      eventTime: timeVal,
      timezone: item.timezone || 'America/Sao_Paulo',
      category: item.category || 'Macro',
      impact: impactNum,
      impactLevel: item.impactLevel || impactToLevel(impactNum),
      country: item.country || 'Brasil',
      relatedAssets: item.relatedAssets || 'Geral',
      affectedAssets: item.affectedAssets || '',
      description: item.description || '',
      whatHappened: item.whatHappened || '',
      marketReaction: item.marketReaction || '',
      volatilityBehavior: item.volatilityBehavior || 'Expansão rápida seguida de absorção',
      initialDirection: item.initialDirection || 'Neutra',
      gap: item.gap || '',
      volume: item.volume || '',
      atr: item.atr || '',
      impactDuration: item.impactDuration || '',
      tradingImplications: item.tradingImplications || '',
      lessonsLearned: item.lessonsLearned || '',
      coverImage: item.coverImage || '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      sources: Array.isArray(item.sources) ? item.sources : [],
      screenshots: Array.isArray(item.screenshots) ? item.screenshots : [],
      source: item.source || 'Manual (Usuário)',
      notes: item.notes || '',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString()
    };
  }

  /**
   * Migra registros antigos de custom events e reactions caso existam
   */
  function migrateLegacyData(currentList) {
    let hasChanges = false;
    const list = [...currentList];

    try {
      const legacyEvents = safeStorageGet(LEGACY_KEY_CUSTOM_EVENTS);
      if (Array.isArray(legacyEvents) && legacyEvents.length > 0) {
        for (const leg of legacyEvents) {
          if (!list.some(e => e.id === leg.id)) {
            list.push(normalizeEvent(leg));
            hasChanges = true;
          }
        }
      }

      const legacyReactions = safeStorageGet(LEGACY_KEY_REACTIONS);
      if (Array.isArray(legacyReactions) && legacyReactions.length > 0) {
        for (const rx of legacyReactions) {
          const target = list.find(e => e.id === rx.eventId);
          if (target) {
            if (!target.whatHappened && rx.whatHappened) target.whatHappened = rx.whatHappened;
            if (!target.lessonsLearned && rx.lessonsLearned) target.lessonsLearned = rx.lessonsLearned;
            if (!target.affectedAssets && rx.affectedAssets) target.affectedAssets = rx.affectedAssets;
            if (rx.volatilityBehavior) target.volatilityBehavior = rx.volatilityBehavior;
            hasChanges = true;
          }
        }
      }
    } catch (_) {}

    return { list, hasChanges };
  }

  /**
   * Obtém todos os eventos da memória local e storage
   */
  function getAllEvents() {
    let stored = safeStorageGet(STORAGE_KEY_PLAYBOOK);
    if (!Array.isArray(stored) || stored.length === 0) {
      stored = DEFAULT_SEEDS.map(normalizeEvent);
      safeStorageSet(STORAGE_KEY_PLAYBOOK, stored);
    } else {
      // Garante migração de seeds ou legados se faltarem
      const { list, hasChanges } = migrateLegacyData(stored);
      stored = list.map(normalizeEvent);
      if (hasChanges) {
        safeStorageSet(STORAGE_KEY_PLAYBOOK, stored);
      }
    }
    return stored;
  }

  /**
   * Salva a lista completa no storage local
   */
  function saveAllEvents(eventsList) {
    const normalized = eventsList.map(normalizeEvent);
    safeStorageSet(STORAGE_KEY_PLAYBOOK, normalized);
    return normalized;
  }

  /**
   * Busca um evento por ID
   */
  function getEventById(id) {
    const events = getAllEvents();
    return events.find(e => e.id === id) || null;
  }

  /**
   * Sincroniza e busca eventos via API ou armazenamento local
   */
  async function fetchEvents(filters = {}) {
    if (typeof window !== 'undefined' && window.healthyTrendApi?.request) {
      try {
        const query = new URLSearchParams();
        if (filters.category && filters.category !== 'Todos') query.set('category', filters.category);
        if (filters.impact) query.set('impact', filters.impact);
        if (filters.period) query.set('period', filters.period);
        if (filters.asset) query.set('asset', filters.asset);
        if (filters.search) query.set('search', filters.search);

        const res = await window.healthyTrendApi.request(`/api/event-playbook?${query.toString()}`);
        if (res && Array.isArray(res.items)) {
          const remoteNormalized = res.items.map(normalizeEvent);
          saveAllEvents(remoteNormalized);
          return filterEvents(remoteNormalized, filters);
        }
      } catch (err) {
        // Fallback para cache local se API falhar ou offline
      }
    }
    return filterEvents(getAllEvents(), filters);
  }

  /**
   * Adiciona um novo evento compartilhado
   */
  function addEvent(eventData) {
    if (!eventData || !String(eventData.name || '').trim()) {
      throw new Error('O nome do evento é obrigatório.');
    }

    const current = getAllEvents();
    const newEvent = normalizeEvent({
      ...eventData,
      id: eventData.id || ('evt-' + Date.now()),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    current.unshift(newEvent);
    saveAllEvents(current);

    // Envia ao backend se disponível
    if (typeof window !== 'undefined' && window.healthyTrendApi?.request) {
      window.healthyTrendApi.request('/api/event-playbook', {
        method: 'POST',
        body: newEvent
      }).catch(() => {});
    }

    return newEvent;
  }

  /**
   * Atualiza um evento existente por ID
   */
  function updateEvent(id, partialData) {
    if (!id) throw new Error('ID do evento é obrigatório para atualização.');
    const current = getAllEvents();
    const idx = current.findIndex(e => e.id === id);

    if (idx === -1) {
      // Se era seed ou evento dinâmico que não estava explicitamente salvo, cria
      const seed = DEFAULT_SEEDS.find(s => s.id === id);
      const newEvt = normalizeEvent({
        ...(seed || {}),
        name: partialData.eventName || seed?.name || ('Evento ' + id),
        date: partialData.eventDate || seed?.date || new Date().toISOString().slice(0, 10),
        ...partialData,
        id,
        updatedAt: new Date().toISOString()
      });
      current.unshift(newEvt);
      saveAllEvents(current);
      if (typeof window !== 'undefined' && window.healthyTrendApi?.request) {
        window.healthyTrendApi.request('/api/event-playbook', { method: 'POST', body: newEvt }).catch(() => {});
      }
      return newEvt;
    }

    const updated = normalizeEvent({
      ...current[idx],
      ...partialData,
      id,
      updatedAt: new Date().toISOString()
    });

    current[idx] = updated;
    saveAllEvents(current);

    // Envia ao backend se disponível
    if (typeof window !== 'undefined' && window.healthyTrendApi?.request) {
      window.healthyTrendApi.request(`/api/event-playbook/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: updated
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Salva uma reação rápida (Central de Mercado -> Event Playbook)
   */
  function saveReaction(reactionData) {
    if (!reactionData || !reactionData.eventId) {
      throw new Error('O ID do evento é obrigatório para registrar a reação.');
    }

    const payload = {
      whatHappened: String(reactionData.whatHappened || '').trim(),
      volatilityBehavior: String(reactionData.volatilityBehavior || 'Expansão rápida seguida de absorção').trim(),
      affectedAssets: String(reactionData.affectedAssets || '').trim(),
      lessonsLearned: String(reactionData.lessonsLearned || '').trim()
    };

    const target = getEventById(reactionData.eventId);
    if (target) {
      // Preserva screenshots caso venham no modal
      const screenshots = Array.isArray(target.screenshots) ? [...target.screenshots] : [];
      if (reactionData.preEventScreenshot) {
        screenshots.push({
          id: 'ss-' + Date.now() + '-pre',
          type: 'before',
          url: reactionData.preEventScreenshot,
          caption: 'Antes do evento',
          createdAt: new Date().toISOString()
        });
      }
      if (reactionData.postEventScreenshot) {
        screenshots.push({
          id: 'ss-' + Date.now() + '-post',
          type: 'after',
          url: reactionData.postEventScreenshot,
          caption: 'Depois do evento',
          createdAt: new Date().toISOString()
        });
      }
      payload.screenshots = screenshots;
    }

    const updated = updateEvent(reactionData.eventId, payload);

    // Endpoint dedicado de reação
    if (typeof window !== 'undefined' && window.healthyTrendApi?.request) {
      window.healthyTrendApi.request('/api/event-playbook/reaction', {
        method: 'POST',
        body: reactionData
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Remove um evento por ID
   */
  function deleteEvent(id) {
    if (!id) throw new Error('ID do evento é obrigatório.');
    const current = getAllEvents();
    const filtered = current.filter(e => e.id !== id);
    saveAllEvents(filtered);

    if (typeof window !== 'undefined' && window.healthyTrendApi?.request) {
      window.healthyTrendApi.request(`/api/event-playbook/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(() => {});
    }

    return filtered;
  }

  /**
   * Filtra uma lista de eventos com base em critérios de busca
   */
  function filterEvents(events, filters = {}) {
    let list = Array.isArray(events) ? [...events] : [];

    if (filters.category && filters.category !== 'Todos') {
      const cat = String(filters.category).toLowerCase().trim();
      list = list.filter(e => String(e.category || '').toLowerCase().trim() === cat);
    }

    if (filters.impact) {
      const imp = normalizeImpact(filters.impact);
      list = list.filter(e => e.impact === imp);
    }

    if (filters.asset) {
      const sym = String(filters.asset).toUpperCase().trim();
      list = list.filter(e =>
        String(e.affectedAssets || '').toUpperCase().includes(sym) ||
        String(e.relatedAssets || '').toUpperCase().includes(sym) ||
        (Array.isArray(e.tags) && e.tags.some(t => String(t).toUpperCase().includes(sym)))
      );
    }

    if (filters.period) {
      const now = new Date();
      if (filters.period === 'today') {
        const todayStr = now.toISOString().slice(0, 10);
        list = list.filter(e => e.date === todayStr || e.eventDate === todayStr);
      } else if (filters.period === '30d') {
        const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        list = list.filter(e => (e.date || e.eventDate) >= past);
      } else if (filters.period === '1y') {
        const past = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        list = list.filter(e => (e.date || e.eventDate) >= past);
      }
    }

    if (filters.search) {
      const q = String(filters.search).toLowerCase().trim();
      list = list.filter(e =>
        String(e.name || '').toLowerCase().includes(q) ||
        String(e.description || '').toLowerCase().includes(q) ||
        String(e.whatHappened || '').toLowerCase().includes(q) ||
        String(e.lessonsLearned || '').toLowerCase().includes(q) ||
        String(e.tradingImplications || '').toLowerCase().includes(q) ||
        String(e.affectedAssets || '').toLowerCase().includes(q) ||
        String(e.relatedAssets || '').toLowerCase().includes(q) ||
        (Array.isArray(e.tags) && e.tags.some(t => String(t).toLowerCase().includes(q)))
      );
    }

    return list;
  }

  /**
   * Calcula contadores de eventos agrupados por categoria
   */
  function countByCategory(events) {
    const counts = { Todos: 0 };
    for (const cat of CATEGORIES) {
      if (cat !== 'Todos') counts[cat] = 0;
    }

    if (Array.isArray(events)) {
      counts.Todos = events.length;
      for (const e of events) {
        const cat = e.category || 'Outros';
        if (counts[cat] !== undefined) {
          counts[cat]++;
        } else {
          counts['Outros'] = (counts['Outros'] || 0) + 1;
        }
      }
    }

    return counts;
  }

  /**
   * Adiciona um screenshot a um evento
   */
  function addScreenshotToEvent(eventId, screenshot) {
    const event = getEventById(eventId);
    if (!event) throw new Error('Evento não encontrado para adicionar screenshot.');

    const screenshots = Array.isArray(event.screenshots) ? [...event.screenshots] : [];
    const newScreenshot = {
      id: screenshot.id || ('ss-' + Date.now()),
      type: screenshot.type || 'during', // 'before', 'during', 'after', 'news', 'other'
      url: screenshot.url,
      caption: screenshot.caption || '',
      description: screenshot.description || '',
      createdAt: new Date().toISOString()
    };

    screenshots.push(newScreenshot);
    return updateEvent(eventId, { screenshots });
  }

  /**
   * Remove um screenshot de um evento
   */
  function removeScreenshotFromEvent(eventId, screenshotId) {
    const event = getEventById(eventId);
    if (!event) throw new Error('Evento não encontrado.');

    const screenshots = (event.screenshots || []).filter(s => s.id !== screenshotId);
    return updateEvent(eventId, { screenshots });
  }

  return {
    CATEGORIES,
    EVIDENCE_TYPES,
    DEFAULT_SEEDS,
    STORAGE_KEY_PLAYBOOK,
    normalizeImpact,
    impactToLevel,
    normalizeEvent,
    getAllEvents,
    saveAllEvents,
    getEventById,
    fetchEvents,
    addEvent,
    updateEvent,
    saveReaction,
    deleteEvent,
    filterEvents,
    countByCategory,
    addScreenshotToEvent,
    removeScreenshotFromEvent
  };
});

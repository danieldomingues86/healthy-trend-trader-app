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

  const MONTH_NAMES_BR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

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
    { id: 'other', label: 'Outras evidências', desc: 'Anotações gerais, relatórios em PDF ou prints adicionais' }
  ];

  const DEFAULT_SEEDS = [
    {
      id: 'evt-eleicao-eua',
      name: 'Eleição Presidencial EUA',
      date: '2026-11-05',
      eventDate: '2026-11-05',
      time: '20:00',
      eventTime: '20:00',
      timezone: 'America/Sao_Paulo',
      category: 'Política',
      impact: 5,
      impactLevel: 'EXTREMO',
      country: 'EUA',
      relatedAssets: 'S&P 500, Russell 2000, Dólar, Bitcoin',
      affectedAssets: 'SPX, NDX, BTC, DXY, IBOV',
      description: 'Eleição presidencial americana com desfecho eleitoral e definição das bancadas legislativas.',
      whatHappened: 'Vitória republicana confirmada com reação imediata pró-desregulamentação e forte rali em ações de pequena capitalização e criptoativos.',
      marketReaction: 'Abertura em gap de alta em todos os índices de risco com rali sustentado durante vários dias.',
      marketImpactHeadline: 'Volatilidade elevada',
      marketImpactSummary: 'Aumento de fluxo para ativos de risco (SPX, NDX, BTC).',
      volatilityBehavior: 'Volatilidade unidirecional sem retorno',
      initialDirection: 'Alta',
      gap: '+2.4%',
      volume: '2.8x média',
      atr: '2.6x (Diário)',
      impactDuration: 'Semanas',
      tradingImplications: 'Reduzir posições na véspera da eleição. Aguardar confirmação da apuração antes de aumentar risco.',
      lessonsLearned: 'Eventos eleitorais podem gerar expansão extrema de volatilidade. Esperar a reação inicial e procurar oportunidades somente depois que o mercado começar a estabilizar.',
      tags: ['Eleições EUA', 'Trump Trade', 'Russell 2000', 'Bitcoin', 'Dólar'],
      sources: ['Associated Press', 'Bloomberg', 'Wall Street Journal'],
      coverImage: 'assets/event-playbook/cover-us-election.jpg',
      screenshots: [],
      source: 'Histórico'
    },
    {
      id: 'evt-copom',
      name: 'Decisão de Juros (Brasil - Copom)',
      date: '2026-10-13',
      eventDate: '2026-10-13',
      time: '18:30',
      eventTime: '18:30',
      timezone: 'America/Sao_Paulo',
      category: 'Banco Central',
      impact: 5,
      impactLevel: 'EXTREMO',
      country: 'Brasil',
      relatedAssets: 'Taxa Selic, Curva de DI, IBOV, Imobiliário',
      affectedAssets: 'IBOV, DI1F29, Imobiliário, Consumo',
      description: 'Divulgação da taxa Selic pelo Banco Central do Brasil com comunicado oficial de diretrizes.',
      whatHappened: 'Manutenção da taxa Selic com tom hawkish no comunicado, elevando inclinação da curva de juros.',
      marketReaction: 'Abertura em queda nos setores cíclicos domésticos e valorização do real frente ao dólar.',
      marketImpactHeadline: 'Inclinação da Curva de Juros',
      marketImpactSummary: 'Reprecificação em contratos futuros de juros (DI) com pressão em construção civil e varejo.',
      volatilityBehavior: 'Volatilidade unidirecional sem retorno',
      initialDirection: 'Baixa',
      gap: '-1.2%',
      volume: '1.9x média',
      atr: '1.6x (Diário)',
      impactDuration: 'Múltiplos pregões',
      tradingImplications: 'Reduzir exposição em setores sensíveis a juros altos (construção civil e varejo alavancado).',
      lessonsLearned: 'Comunicados hawkish com Selic mantida têm impacto mais forte na curva de DI do que o próprio número anunciado.',
      tags: ['Copom', 'Selic', 'Banco Central', 'DI Futuro', 'Juros Brasil'],
      sources: ['Banco Central do Brasil', 'Valor Econômico'],
      coverImage: 'assets/event-playbook/cover-copom-bcb.jpg',
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
      impactLevel: 'EXTREMO',
      country: 'EUA',
      relatedAssets: 'Índices / Dólar / Juros',
      affectedAssets: 'SPX, NDX, DXY, IBOV',
      description: 'Decisão do comitê FOMC sobre a taxa de juros básica americana e coletiva de imprensa.',
      whatHappened: 'Corte de 25 bps confirmado com coletiva indicando cautela na velocidade dos próximos cortes.',
      marketReaction: 'Movimento unidirecional de alta nos índices de tecnologia.',
      marketImpactHeadline: 'Compressão de Yields',
      marketImpactSummary: 'Fluxo comprador vigoroso nos índices de tecnologia (NDX) e alívio nos ativos de risco globais.',
      volatilityBehavior: 'Volatilidade unidirecional sem retorno',
      initialDirection: 'Alta',
      gap: '+0.8%',
      volume: '2.5x média',
      atr: '2.2x (Diário)',
      impactDuration: 'Sessão inteira e dias seguintes',
      tradingImplications: 'Não operar durante a entrevista coletiva do presidente do Fed.',
      lessonsLearned: 'O comunicado gera o primeiro spike, mas a direção definitiva só se consolida durante as respostas aos jornalistas na coletiva.',
      tags: ['FOMC', 'Taxa de Juros', 'Jerome Powell', 'Wall Street'],
      sources: ['Federal Reserve', 'Bloomberg'],
      coverImage: 'assets/event-playbook/cover-fed-wallstreet.jpg',
      screenshots: [],
      source: 'Oficial'
    },
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
      marketImpactHeadline: 'Spike com Absorção Rápida',
      marketImpactSummary: 'Violinada de 30 minutos com repique inicial dos yields e estabilização subsequente.',
      volatilityBehavior: 'Expansão rápida seguida de absorção',
      initialDirection: 'Baixa',
      gap: '-0.4%',
      volume: '2.1x média',
      atr: '1.8x (Diário)',
      impactDuration: '2 a 4 horas',
      tradingImplications: 'Aguardar 30 minutos após a divulgação antes de abrir novas posições. Não antecipar o número.',
      lessonsLearned: 'Evitar antecipar número de emprego. A primeira vela de 15m quase sempre tem falso rompimento com violinada.',
      tags: ['Emprego', 'Fed', 'Macro EUA', 'Dólar'],
      sources: ['Bureau of Labor Statistics (BLS)', 'Investing.com'],
      coverImage: 'assets/event-playbook/cover-fed-wallstreet.jpg',
      screenshots: [],
      source: 'Oficial'
    },
    {
      id: 'evt-conflito-oriente',
      name: 'Conflito Israel x Irã',
      date: '2026-09-20',
      eventDate: '2026-09-20',
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
      marketImpactHeadline: 'Choque Energético',
      marketImpactSummary: 'Disparada no petróleo e ouro com forte expansão no VIX e reprecificação de commodities.',
      volatilityBehavior: 'Expansão rápida seguida de absorção',
      initialDirection: 'Alta',
      gap: '+4.2%',
      volume: '3.1x média',
      atr: '2.5x (Diário)',
      impactDuration: '48 a 72 horas',
      tradingImplications: 'Não comprar rompimento de topo em petróleo gerado exclusivamente por choque geopolítico de curto prazo.',
      lessonsLearned: 'Picos de volatilidade causados por choques geopolíticos tendem a arrefecer em 48 a 72 horas se a infraestrutura física de produção não for interrompida.',
      tags: ['Geopolítica', 'Petróleo', 'Ouro', 'VIX', 'Conflito'],
      sources: ['Reuters', 'Al Jazeera', 'Financial Times'],
      coverImage: 'assets/event-playbook/cover-copom-bcb.jpg',
      screenshots: [],
      source: 'Histórico'
    },
    {
      id: 'evt-taiwan-strait',
      name: 'Tensão no Estreito de Taiwan',
      date: '2026-09-02',
      eventDate: '2026-09-02',
      time: '08:00',
      eventTime: '08:00',
      timezone: 'America/Sao_Paulo',
      category: 'Geopolítica',
      impact: 4,
      impactLevel: 'ALTO',
      country: 'Global',
      relatedAssets: 'Semicondutores, TSMC, NVDA, Cobre',
      affectedAssets: 'NVDA, TSM, AMD, SMLL',
      description: 'Exercícios militares navais em larga escala no Mar do Sul da China com bloqueio temporário de rotas marítimas.',
      whatHappened: 'Alerta sobre cadeias globais de semicondutores e hardware crítico.',
      marketReaction: 'Queda de 3% no SOXX e rotação em direção a títulos soberanos de curto prazo.',
      marketImpactHeadline: 'Aversão ao Risco Tecnológico',
      marketImpactSummary: 'Correção aguda em ações de tecnologia dependentes da fundição asiática.',
      volatilityBehavior: 'Expansão rápida seguida de absorção',
      initialDirection: 'Baixa',
      gap: '-2.1%',
      volume: '1.8x média',
      atr: '1.7x (Diário)',
      impactDuration: '3 a 5 pregões',
      tradingImplications: 'Evitar alavancagem em fabricantes de chips até normalização das rotas de frete marítimo.',
      lessonsLearned: 'Risco geopolítico de semicondutores tem assimetria negativa: protege-se o capital primeiro, avalia-se depois.',
      tags: ['Taiwan', 'Semicondutores', 'Geopolítica', 'Chips'],
      sources: ['Reuters', 'Bloomberg'],
      coverImage: 'assets/event-playbook/cover-us-election.jpg',
      screenshots: [],
      source: 'Histórico'
    },
    {
      id: 'evt-ipca',
      name: 'IPCA (Brasil)',
      date: '2026-08-10',
      eventDate: '2026-08-10',
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
      marketImpactHeadline: 'Reação Neutra / Estável',
      marketImpactSummary: 'Taxa dentro do consenso manteve previsibilidade técnica sem gatilhos de estresse.',
      volatilityBehavior: 'Reação fraca / neutra',
      initialDirection: 'Neutra',
      gap: '0.0%',
      volume: '1.0x média',
      atr: '1.0x (Diário)',
      impactDuration: 'Menos de 1 hora',
      tradingImplications: 'Mercado livre para seguir tendências técnicas dos ativos individuais.',
      lessonsLearned: 'Quando a inflação vem em linha com o consenso, o foco volta 100% para os setups gráficos de continuidade e Trend Following.',
      tags: ['Inflação', 'IBGE', 'IBOV', 'Curva de DI'],
      sources: ['IBGE', 'Valor Econômico'],
      coverImage: 'assets/event-playbook/cover-copom-bcb.jpg',
      screenshots: [],
      source: 'Oficial'
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

  function generateId(prefix = 'evt') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function normalizeImpact(impact) {
    if (typeof impact === 'number') return Math.max(1, Math.min(5, Math.round(impact)));
    const str = String(impact || '').toUpperCase().trim();
    if (str.includes('EXTREMO') || str.includes('5') || str.includes('BLACK SWAN')) return 5;
    if (str.includes('ALTO') || str.includes('4')) return 4;
    if (str.includes('MÉDIO') || str.includes('MEDIO') || str.includes('3')) return 3;
    if (str.includes('BAIXO') || str.includes('2')) return 2;
    if (str.includes('MUITO BAIXO') || str.includes('1')) return 1;
    return 3;
  }

  function impactToLevel(impactNum) {
    const n = Number(impactNum) || 3;
    if (n >= 5) return 'EXTREMO';
    if (n === 4) return 'ALTO';
    if (n === 3) return 'MÉDIO';
    if (n === 2) return 'BAIXO';
    return 'MUITO BAIXO';
  }

  function formatDateBadge(dateStr) {
    if (!dateStr) return { day: '—', month: '—', year: '—', formatted: '—' };
    const str = String(dateStr).trim().slice(0, 10);
    const parts = str.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2].padStart(2, '0');
      const month = MONTH_NAMES_BR[monthIdx] || '—';
      return { day, month, year, formatted: `${day}/${parts[1]}/${year}` };
    }
    return { day: '—', month: '—', year: '—', formatted: str };
  }

  function getCountryWithFlag(country) {
    if (!country) return '🌐 Global';
    const c = String(country).trim();
    const lower = c.toLowerCase();
    if (lower === 'global') return '🌐 Global';
    if (lower === 'eua' || lower === 'estados unidos' || lower === 'us' || lower === 'usa') return '🇺🇸 EUA';
    if (lower === 'brasil' || lower === 'br' || lower === 'brazil') return '🇧🇷 Brasil';
    if (lower === 'china' || lower === 'cn') return '🇨🇳 China';
    if (lower === 'europa' || lower === 'ue' || lower === 'zona do euro') return '🇪🇺 Europa';
    if (lower === 'japão' || lower === 'jp' || lower === 'japan') return '🇯🇵 Japão';
    if (lower === 'reino unido' || lower === 'uk' || lower === 'inglaterra') return '🇬🇧 Reino Unido';
    if (lower.includes('oriente')) return '🌍 Oriente Médio';
    return `🌍 ${c}`;
  }

  function getCategoryIcon(cat) {
    const c = String(cat || '').toLowerCase();
    if (c.includes('geo')) return '⚔️';
    if (c.includes('política') || c.includes('politica')) return '🏛️';
    if (c.includes('macro')) return '🌐';
    if (c.includes('banco') || c.includes('central') || c.includes('juros')) return '🏦';
    if (c.includes('earning') || c.includes('balanço') || c.includes('resultado')) return '📊';
    if (c.includes('tarifa')) return '🏷️';
    if (c.includes('commodit') || c.includes('petróleo') || c.includes('minério')) return '🛢️';
    if (c.includes('black') || c.includes('swan') || c.includes('cisne')) return '⚠️';
    return '📌';
  }

  function getEventCoverImage(ev) {
    if (ev && ev.coverImage) return ev.coverImage;
    const id = ev?.id || '';
    const name = (ev?.name || '').toLowerCase();
    const category = (ev?.category || '').toLowerCase();
    const country = (ev?.country || '').toLowerCase();

    if (id === 'evt-eleicao-eua' || name.includes('eleiç') || (category.includes('política') && country.includes('eua'))) {
      return 'assets/event-playbook/cover-us-election.jpg';
    }
    if (id === 'evt-copom' || name.includes('copom') || (category.includes('banco central') && country.includes('brasil'))) {
      return 'assets/event-playbook/cover-copom-bcb.jpg';
    }
    if (id === 'evt-fed-rate' || name.includes('fed') || name.includes('fomc')) {
      return 'assets/event-playbook/cover-fed-wallstreet.jpg';
    }
    if (Array.isArray(ev?.screenshots) && ev.screenshots.length > 0 && ev.screenshots[0].url) {
      return ev.screenshots[0].url;
    }
    return 'assets/event-playbook/cover-copom-bcb.jpg';
  }

  function normalizeEvent(raw) {
    const id = raw.id || generateId();
    const impactNum = normalizeImpact(raw.impact || raw.impactLevel);
    const date = raw.date || raw.eventDate || new Date().toISOString().slice(0, 10);
    const time = raw.time || raw.eventTime || '10:00';
    const category = raw.category || 'Macro';
    const country = raw.country || (raw.relatedAssets && raw.relatedAssets.includes('EUA') ? 'EUA' : 'Brasil');

    return {
      id,
      name: raw.name || raw.title || 'Evento Sem Título',
      date,
      eventDate: date,
      time,
      eventTime: time,
      timezone: raw.timezone || 'America/Sao_Paulo',
      category,
      impact: impactNum,
      impactLevel: impactToLevel(impactNum),
      country,
      relatedAssets: raw.relatedAssets || raw.assets || '',
      affectedAssets: raw.affectedAssets || raw.relatedAssets || raw.assets || '',
      description: raw.description || '',
      whatHappened: raw.whatHappened || raw.description || '',
      marketReaction: raw.marketReaction || '',
      marketImpactHeadline: raw.marketImpactHeadline || (impactNum >= 5 ? 'Volatilidade elevada' : 'Reação pontual'),
      marketImpactSummary: raw.marketImpactSummary || raw.marketReaction || (raw.affectedAssets ? `Impacto nos ativos: ${raw.affectedAssets}.` : 'Acompanhamento de fluxo.'),
      volatilityBehavior: raw.volatilityBehavior || 'Expansão rápida seguida de absorção',
      initialDirection: raw.initialDirection || 'Neutra',
      gap: raw.gap || '0.0%',
      volume: raw.volume || '1.0x média',
      atr: raw.atr || '1.0x (Diário)',
      impactDuration: raw.impactDuration || 'Sessão atual',
      tradingImplications: raw.tradingImplications || '',
      lessonsLearned: raw.lessonsLearned || '',
      tags: Array.isArray(raw.tags) ? raw.tags : (typeof raw.tags === 'string' ? raw.tags.split(',').map(s => s.trim()).filter(Boolean) : []),
      sources: Array.isArray(raw.sources) ? raw.sources : (typeof raw.sources === 'string' ? raw.sources.split(',').map(s => s.trim()).filter(Boolean) : []),
      coverImage: raw.coverImage || getEventCoverImage({ id, name: raw.name, category, country, screenshots: raw.screenshots }),
      screenshots: Array.isArray(raw.screenshots) ? raw.screenshots : [],
      source: raw.source || 'Manual',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  function migrateLegacyData(currentList) {
    let hasChanges = false;
    const existingIds = new Set(currentList.map(e => e.id));

    // Migra de custom events da Central de Mercado
    const legacyEvents = safeStorageGet(LEGACY_KEY_CUSTOM_EVENTS) || [];
    const legacyReactions = safeStorageGet(LEGACY_KEY_REACTIONS) || [];

    legacyEvents.forEach(le => {
      if (!existingIds.has(le.id)) {
        const matchingReaction = legacyReactions.find(r => r.eventId === le.id) || {};
        currentList.push(normalizeEvent({
          ...le,
          ...matchingReaction
        }));
        existingIds.add(le.id);
        hasChanges = true;
      }
    });

    return { list: currentList, hasChanges };
  }

  function getAllEvents() {
    let stored = safeStorageGet(STORAGE_KEY_PLAYBOOK);
    if (!Array.isArray(stored) || stored.length === 0) {
      stored = DEFAULT_SEEDS.map(normalizeEvent);
      safeStorageSet(STORAGE_KEY_PLAYBOOK, stored);
    } else {
      const { list, hasChanges } = migrateLegacyData(stored);
      stored = list.map(normalizeEvent);
      if (hasChanges) {
        safeStorageSet(STORAGE_KEY_PLAYBOOK, stored);
      }
    }
    return stored;
  }

  function saveAllEvents(events) {
    if (!Array.isArray(events)) return;
    const normalized = events.map(normalizeEvent);
    safeStorageSet(STORAGE_KEY_PLAYBOOK, normalized);

    // Sincroniza em segundo plano com a Central de Mercado (entidade única)
    try {
      const centralFormat = normalized.map(e => ({
        id: e.id,
        name: e.name,
        date: e.date,
        time: e.time,
        category: e.category,
        impact: e.impactLevel || impactToLevel(e.impact),
        relatedAssets: e.relatedAssets || e.affectedAssets,
        whatHappened: e.whatHappened,
        tradingImplications: e.tradingImplications,
        lessonsLearned: e.lessonsLearned,
        screenshotsCount: (e.screenshots || []).length
      }));
      safeStorageSet(LEGACY_KEY_CUSTOM_EVENTS, centralFormat);
    } catch (_) {}

    // Dispara evento DOM para sincronização viva
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('healthyTrend:eventPlaybookUpdated', {
          detail: { events: normalized }
        }));
      } catch (_) {}
    }
  }

  function getEventById(id) {
    if (!id) return null;
    const events = getAllEvents();
    return events.find(e => e.id === id) || null;
  }

  async function fetchEvents(filters = {}) {
    if (typeof window !== 'undefined' && window.healthyTrendApi && typeof window.healthyTrendApi.request === 'function') {
      try {
        const query = new URLSearchParams();
        if (filters.category && filters.category !== 'Todos') query.set('category', filters.category);
        if (filters.search) query.set('search', filters.search);
        if (filters.impact) query.set('impact', filters.impact);

        const qs = query.toString() ? `?${query.toString()}` : '';
        const res = await window.healthyTrendApi.request(`/api/event-playbook${qs}`);
        if (res && Array.isArray(res.items)) {
          const remoteNormalized = res.items.map(normalizeEvent);
          saveAllEvents(remoteNormalized);
          return filterEvents(remoteNormalized, filters);
        }
      } catch (_) {}
    }

    const localEvents = getAllEvents();
    return filterEvents(localEvents, filters);
  }

  function addEvent(payload) {
    if (!payload || !payload.name) {
      throw new Error('O nome do evento é obrigatório.');
    }

    const events = getAllEvents();
    const newEvent = normalizeEvent(payload);
    events.unshift(newEvent);
    saveAllEvents(events);

    // Sincroniza com o backend se autenticado
    if (typeof window !== 'undefined' && window.healthyTrendApi && typeof window.healthyTrendApi.request === 'function') {
      window.healthyTrendApi.request('/api/event-playbook', {
        method: 'POST',
        body: newEvent
      }).catch(() => {});
    }

    return newEvent;
  }

  function updateEvent(id, patch) {
    if (!id) throw new Error('ID do evento não informado.');
    const events = getAllEvents();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Evento não encontrado no Playbook.');

    const updated = normalizeEvent({
      ...events[index],
      ...patch,
      id,
      updatedAt: new Date().toISOString()
    });

    events[index] = updated;
    saveAllEvents(events);

    if (typeof window !== 'undefined' && window.healthyTrendApi && typeof window.healthyTrendApi.request === 'function') {
      window.healthyTrendApi.request(`/api/event-playbook/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: updated
      }).catch(() => {});
    }

    return updated;
  }

  function saveReaction(payload) {
    const eventId = payload.eventId || payload.id;
    if (!eventId) throw new Error('ID do evento é obrigatório para registrar a reação.');

    let event = getEventById(eventId);
    if (!event) {
      event = addEvent({
        id: eventId,
        name: payload.eventName || 'Evento de Mercado',
        date: payload.eventDate || new Date().toISOString().slice(0, 10),
        time: payload.eventTime || '10:00',
        impact: payload.impact || 4
      });
    }

    const patch = {
      whatHappened: payload.whatHappened !== undefined ? payload.whatHappened : event.whatHappened,
      marketReaction: payload.marketReaction !== undefined ? payload.marketReaction : event.marketReaction,
      volatilityBehavior: payload.volatilityBehavior !== undefined ? payload.volatilityBehavior : event.volatilityBehavior,
      initialDirection: payload.initialDirection !== undefined ? payload.initialDirection : event.initialDirection,
      gap: payload.gap !== undefined ? payload.gap : event.gap,
      volume: payload.volume !== undefined ? payload.volume : event.volume,
      atr: payload.atr !== undefined ? payload.atr : event.atr,
      impactDuration: payload.impactDuration !== undefined ? payload.impactDuration : event.impactDuration,
      affectedAssets: payload.affectedAssets !== undefined ? payload.affectedAssets : event.affectedAssets,
      lessonsLearned: payload.lessonsLearned !== undefined ? payload.lessonsLearned : event.lessonsLearned
    };

    return updateEvent(eventId, patch);
  }

  function deleteEvent(id) {
    if (!id) return false;
    let events = getAllEvents();
    const beforeCount = events.length;
    events = events.filter(e => e.id !== id);
    if (events.length === beforeCount) return false;

    saveAllEvents(events);

    if (typeof window !== 'undefined' && window.healthyTrendApi && typeof window.healthyTrendApi.request === 'function') {
      window.healthyTrendApi.request(`/api/event-playbook/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(() => {});
    }

    return true;
  }

  function filterEvents(events, filters = {}) {
    if (!Array.isArray(events)) return [];

    return events.filter(ev => {
      // Categoria
      if (filters.category && filters.category !== 'Todos') {
        if ((ev.category || 'Outros').toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }

      // Impacto
      if (filters.impact) {
        const requiredImpact = Number(filters.impact);
        if (Number(ev.impact) !== requiredImpact) return false;
      }

      // Busca por texto
      if (filters.search) {
        const term = String(filters.search).toLowerCase().trim();
        const haystack = [
          ev.name,
          ev.category,
          ev.description,
          ev.whatHappened,
          ev.marketReaction,
          ev.tradingImplications,
          ev.lessonsLearned,
          ev.affectedAssets,
          ev.relatedAssets,
          ...(ev.tags || [])
        ].filter(Boolean).join(' ').toLowerCase();

        if (!haystack.includes(term)) return false;
      }

      // Ativo específico
      if (filters.asset) {
        const assetTerm = String(filters.asset).toLowerCase().trim();
        const assetHaystack = `${ev.affectedAssets || ''} ${ev.relatedAssets || ''}`.toLowerCase();
        if (!assetHaystack.includes(assetTerm)) return false;
      }

      // Período
      if (filters.period) {
        const dateStr = ev.date || ev.eventDate;
        if (dateStr) {
          const eventDate = new Date(dateStr);
          const now = new Date();
          const diffDays = (now - eventDate) / (1000 * 60 * 60 * 24);

          if (filters.period === 'today' && diffDays > 1.5) return false;
          if (filters.period === '30d' && diffDays > 30) return false;
          if (filters.period === '90d' && diffDays > 90) return false;
          if (filters.period === '1y' && diffDays > 365) return false;
        }
      }

      return true;
    });
  }

  function countByCategory(events) {
    const counts = { Todos: Array.isArray(events) ? events.length : 0 };
    CATEGORIES.forEach(c => {
      if (c !== 'Todos') counts[c] = 0;
    });

    if (Array.isArray(events)) {
      events.forEach(e => {
        const cat = e.category || 'Outros';
        if (counts[cat] !== undefined) {
          counts[cat]++;
        } else {
          counts['Outros'] = (counts['Outros'] || 0) + 1;
        }
      });
    }

    return counts;
  }

  function addScreenshotToEvent(eventId, screenshot) {
    const event = getEventById(eventId);
    if (!event) throw new Error('Evento não encontrado.');

    const screenshots = Array.isArray(event.screenshots) ? [...event.screenshots] : [];
    const newScreenshot = {
      id: screenshot.id || generateId('ss'),
      type: screenshot.type || 'during',
      url: screenshot.url,
      caption: screenshot.caption || '',
      description: screenshot.description || '',
      createdAt: new Date().toISOString()
    };

    screenshots.push(newScreenshot);
    return updateEvent(eventId, { screenshots });
  }

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
    formatDateBadge,
    getCountryWithFlag,
    getCategoryIcon,
    getEventCoverImage,
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

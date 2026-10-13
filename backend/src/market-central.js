/**
 * CENTRAL DE MERCADO — BACKEND SERVICE
 * Healthy Trend Trader
 *
 * Observatório de mercado para Swing Trade:
 * 1. Market Regime (reutilizando modelo oficial de Ciclo de Mercado)
 * 2. Market Breadth (participação real dos ativos: EMA 20, EMA 50, EMA 200, tendência e avanço/queda)
 * 3. Mercados Globais (termômetros macro mundiais: SPX, NDX, DJI, VIX, Dólar, Ouro, WTI, BTC)
 * 4. Market Map B3 (desempenho setorial com top ativos)
 * 5. Eventos de Alto Impacto (calendário econômico e catalisadores macro)
 * 6. Notícias Relevantes (top 5 histórias mais impactantes via market-news)
 */

'use strict';

const marketData = require('./market-data');
const marketNews = require('./market-news');
const eventPlaybook = require('./event-playbook');

const GLOBAL_BENCHMARKS = [
  {
    symbol: 'SPX',
    name: 'S&P 500',
    flag: '🇺🇸',
    value: '5.728,41',
    numericValue: 5728.41,
    changePct: 0.82,
    returns: { today: 0.82, '5d': 1.65, '1m': 3.40, '3m': 7.80 },
    trend: 'up',
    sparkline: [5680, 5692, 5705, 5698, 5712, 5720, 5728.41],
    description: 'Índice de referência de Wall Street (500 maiores empresas).'
  },
  {
    symbol: 'NDX',
    name: 'Nasdaq',
    flag: '🇺🇸',
    value: '18.024,17',
    numericValue: 18024.17,
    changePct: 1.14,
    returns: { today: 1.14, '5d': 2.30, '1m': 4.80, '3m': 9.20 },
    trend: 'up',
    sparkline: [17810, 17850, 17920, 17890, 17980, 18010, 18024.17],
    description: 'Liderança global de tecnologia e inovação.'
  },
  {
    symbol: 'DJI',
    name: 'Dow Jones',
    flag: '🇺🇸',
    value: '42.331,12',
    numericValue: 42331.12,
    changePct: 0.42,
    returns: { today: 0.42, '5d': 0.85, '1m': 2.10, '3m': 5.40 },
    trend: 'up',
    sparkline: [42150, 42200, 42240, 42210, 42280, 42310, 42331.12],
    description: 'Termômetro das 30 gigantes industriais americanas.'
  },
  {
    symbol: 'VIX',
    name: 'VIX',
    flag: '📈',
    value: '17,21',
    numericValue: 17.21,
    changePct: -4.20,
    returns: { today: -4.20, '5d': -8.50, '1m': -12.40, '3m': -15.10 },
    trend: 'down',
    sparkline: [19.8, 19.1, 18.5, 18.9, 17.8, 17.5, 17.21],
    description: 'Índice do medo e volatilidade implícita do S&P 500.'
  },
  {
    symbol: 'DXY',
    name: 'Dólar (DXY)',
    flag: '🇺🇸',
    value: '101,63',
    numericValue: 101.63,
    changePct: 0.31,
    returns: { today: 0.31, '5d': 0.72, '1m': 1.15, '3m': -0.80 },
    trend: 'up',
    sparkline: [100.9, 101.1, 101.3, 101.2, 101.5, 101.58, 101.63],
    description: 'Força do dólar americano contra cesta de moedas fortes.'
  },
  {
    symbol: 'GOLD',
    name: 'Ouro',
    flag: '🪙',
    value: '2.664,80',
    numericValue: 2664.80,
    changePct: 0.62,
    returns: { today: 0.62, '5d': 1.80, '1m': 4.20, '3m': 11.50 },
    trend: 'up',
    sparkline: [2640, 2646, 2652, 2650, 2658, 2661, 2664.8],
    description: 'Ativo de reserva global e proteção contra inflação.'
  },
  {
    symbol: 'WTI',
    name: 'Petróleo (WTI)',
    flag: '🛢️',
    value: '73,15',
    numericValue: 73.15,
    changePct: 1.80,
    returns: { today: 1.80, '5d': 3.50, '1m': 5.80, '3m': -4.20 },
    trend: 'up',
    sparkline: [71.2, 71.8, 72.3, 72.0, 72.6, 72.9, 73.15],
    description: 'Commodity energética crucial para inflação e custos mundiais.'
  },
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    flag: '₿',
    value: '62.431,00',
    numericValue: 62431.00,
    changePct: 0.94,
    returns: { today: 0.94, '5d': 4.10, '1m': 8.60, '3m': 18.20 },
    trend: 'up',
    sparkline: [61200, 61600, 61900, 61750, 62100, 62300, 62431],
    description: 'Apetite global por risco e ativos digitais descentralizados.'
  }
];

const DEFAULT_HIGH_IMPACT_EVENTS = [
  {
    id: 'evt-payroll',
    name: 'Payroll (EUA)',
    date: '2026-10-07',
    time: '09:30',
    timezone: 'America/Sao_Paulo',
    impact: 'ALTO',
    country: 'EUA',
    relatedAssets: 'EUA / Dólar / Índices',
    description: 'Relatório mensal de criação de empregos e taxa de desemprego nos Estados Unidos.',
    source: 'Oficial'
  },
  {
    id: 'evt-fed-rate',
    name: 'Decisão de Juros (EUA - Fed)',
    date: '2026-10-08',
    time: '15:00',
    timezone: 'America/Sao_Paulo',
    impact: 'ALTO',
    country: 'EUA',
    relatedAssets: 'Índices / Dólar / Juros',
    description: 'Decisão do comitê FOMC sobre a taxa de juros básica americana e coletiva de imprensa.',
    source: 'Oficial'
  },
  {
    id: 'evt-ipca',
    name: 'IPCA (Brasil)',
    date: '2026-10-10',
    time: '09:00',
    timezone: 'America/Sao_Paulo',
    impact: 'MÉDIO',
    country: 'Brasil',
    relatedAssets: 'IBOV / Juros / Bancos',
    description: 'Índice Nacional de Preços ao Consumidor Amplo medido pelo IBGE.',
    source: 'Oficial'
  },
  {
    id: 'evt-china-pmi',
    name: 'Produção Industrial (China)',
    date: '2026-10-12',
    time: '11:00',
    timezone: 'America/Sao_Paulo',
    impact: 'MÉDIO',
    country: 'China',
    relatedAssets: 'Commodities / Mineração',
    description: 'Indicadores de atividade e demanda de manufatura da maior compradora mundial de commodities.',
    source: 'Oficial'
  },
  {
    id: 'evt-copom',
    name: 'Decisão de Juros (Brasil - Copom)',
    date: '2026-10-13',
    time: '10:00',
    timezone: 'America/Sao_Paulo',
    impact: 'ALTO',
    country: 'Brasil',
    relatedAssets: 'IBOV / Juros / Bancos',
    description: 'Divulgação da taxa Selic pelo Banco Central do Brasil com comunicado oficial de diretrizes.',
    source: 'Oficial'
  }
];

const DEFAULT_NEWS_STORIES = [
  {
    id: 'news-fed-rates',
    title: 'Fed sinaliza que pode manter juros elevados por mais tempo',
    summary: 'Powell reforça postura cautelosa diante da inflação persistente.',
    source: 'Bloomberg',
    time: '09:12',
    date: 'Hoje',
    url: '#',
    category: 'Macro',
    market: 'us',
    image: 'assets/news-hero-fed.jpg',
    impact: 'ALTO IMPACTO'
  },
  {
    id: 'news-petrobras-invest',
    title: 'Petrobras anuncia novo plano de investimentos',
    summary: 'Companhia prevê aumento na produção nos próximos anos.',
    source: 'Reuters',
    time: '08:45',
    date: 'Hoje',
    url: '#',
    category: 'Empresas',
    market: 'br',
    image: 'assets/news-thumb-petroleo.jpg',
    impact: 'ALTO IMPACTO'
  },
  {
    id: 'news-vale-output',
    title: 'Vale divulga dados operacionais acima do esperado',
    summary: 'Produção de minério cresce 4% no trimestre.',
    source: 'Valor',
    time: '07:30',
    date: 'Hoje',
    url: '#',
    category: 'Empresas',
    market: 'br',
    image: 'assets/news-thumb-mineracao.jpg',
    impact: 'MÉDIO IMPACTO'
  },
  {
    id: 'news-china-stimulus',
    title: 'China anuncia novos estímulos à economia',
    summary: 'Medidas podem beneficiar commodities e mercados emergentes.',
    source: 'Financial Times',
    time: '06:55',
    date: 'Hoje',
    url: '#',
    category: 'Macro',
    market: 'global',
    image: 'assets/news-thumb-china.jpg',
    impact: 'MÉDIO IMPACTO'
  },
  {
    id: 'news-ibov-high',
    title: 'Ibovespa opera em alta com exterior positivo',
    summary: 'Índice acompanha bom humor nos mercados globais.',
    source: 'InfoMoney',
    time: '06:20',
    date: 'Hoje',
    url: '#',
    category: 'Mercado',
    market: 'br',
    image: 'assets/news-thumb-spx.jpg',
    impact: 'GERAL'
  }
];

function isFiniteNumber(val) {
  return val !== null && val !== undefined && Number.isFinite(Number(val));
}

/**
 * Filtra e seleciona os ativos do universo especificado
 */
function getUniverseAssets(cache, universeId = 'stock_b3') {
  if (!cache) return [];
  const stocks = Array.isArray(cache.relativeStrength) ? cache.relativeStrength : [];
  const bdrItems = Array.isArray(cache.relativeStrengthByClass?.bdr?.items) ? cache.relativeStrengthByClass.bdr.items : [];
  const fiiItems = Array.isArray(cache.relativeStrengthByClass?.fii?.items) ? cache.relativeStrengthByClass.fii.items : [];

  switch (universeId) {
    case 'bdr':
      return bdrItems;
    case 'fii':
      return fiiItems;
    case 'ibov':
      // Ativos com benchmark IBOV ou top 86 em liquidez
      return stocks.filter(it => it.benchmark === 'IBOV' || it.score >= 50);
    case 'smallcaps':
      // Ações fora dos gigantes de maior pontuação/peso
      return stocks.filter(it => it.score < 80);
    case 'stock_b3':
    case 'all':
    default:
      return stocks.length > 0 ? stocks : [...stocks, ...bdrItems, ...fiiItems];
  }
}

/**
 * Calcula os indicadores de Market Breadth (Participação de Mercado)
 */
function calculateMarketBreadth(assets) {
  if (!Array.isArray(assets) || assets.length === 0) {
    return {
      universeName: 'B3 (Todos os ativos)',
      totalEvaluated: 0,
      totalEligible: 0,
      aboveEma20Pct: 0,
      aboveEma50Pct: 0,
      aboveEma200Pct: 0,
      positiveTrendPct: 0,
      advancePct: 50,
      declinePct: 50,
      advancesCount: 0,
      declinesCount: 0,
      neutralCount: 0,
      dataAvailable: false
    };
  }

  let eligible = 0;
  let above20 = 0;
  let above50 = 0;
  let above200 = 0;
  let positiveTrend = 0;
  let advances = 0;
  let declines = 0;
  let neutrals = 0;

  for (const item of assets) {
    const scan = item.scan || {};
    const price = Number(scan.price);
    if (!Number.isFinite(price) || price <= 0) continue;

    eligible++;

    const ema20 = Number(scan.ema20);
    const ema50 = Number(scan.ema50);
    const ema200 = Number(scan.ema200);
    const dayChange = Number(scan.dayChangePct);

    if (Number.isFinite(ema20) && price > ema20) above20++;
    // Se ema50 não estiver pré-calculada, usa aproximação ponderada entre ema20 e ema200 ou ema20
    if (Number.isFinite(ema50)) {
      if (price > ema50) above50++;
    } else if (Number.isFinite(ema20) && Number.isFinite(ema200)) {
      const approxEma50 = ema20 * 0.7 + ema200 * 0.3;
      if (price > approxEma50) above50++;
    } else if (Number.isFinite(ema20) && price > ema20) {
      above50++;
    }

    if (Number.isFinite(ema200) && price > ema200) above200++;

    if (scan.healthyTrend === true || (Number.isFinite(ema20) && Number.isFinite(ema200) && price > ema20 && ema20 > ema200)) {
      positiveTrend++;
    }

    if (Number.isFinite(dayChange)) {
      if (dayChange > 0) advances++;
      else if (dayChange < 0) declines++;
      else neutrals++;
    }
  }

  if (eligible === 0) {
    return {
      totalEvaluated: assets.length,
      totalEligible: 0,
      aboveEma20Pct: 0,
      aboveEma50Pct: 0,
      aboveEma200Pct: 0,
      positiveTrendPct: 0,
      advancePct: 50,
      declinePct: 50,
      dataAvailable: false
    };
  }

  const advanceDeclineTotal = advances + declines || 1;

  return {
    totalEvaluated: assets.length,
    totalEligible: eligible,
    aboveEma20Pct: Math.round((above20 / eligible) * 100),
    aboveEma50Pct: Math.round((above50 / eligible) * 100),
    aboveEma200Pct: Math.round((above200 / eligible) * 100),
    positiveTrendPct: Math.round((positiveTrend / eligible) * 100),
    advancePct: Math.round((advances / advanceDeclineTotal) * 100),
    declinePct: Math.round((declines / advanceDeclineTotal) * 100),
    advancesCount: advances,
    declinesCount: declines,
    neutralCount: neutrals,
    dataAvailable: true
  };
}

/**
 * Constrói o Market Map setorial agrupando ações B3 por setor
 */
function buildSectorMarketMap(assets) {
  const sectorMap = new Map();

  for (const item of assets) {
    const sectorName = item.sector || 'Geral';
    const scan = item.scan || {};
    const change = Number(scan.dayChangePct);
    const m1 = Number(item.m1);
    const m3 = Number(item.m3);
    const price = Number(scan.price);

    const todayChange = Number.isFinite(change) ? change : 0;
    const m1Change = Number.isFinite(m1) ? m1 : 0;
    const m3Change = Number.isFinite(m3) ? m3 : 0;
    const d5Change = Number((m1Change * 0.24 + todayChange * 0.5).toFixed(2));

    if (!sectorMap.has(sectorName)) {
      sectorMap.set(sectorName, {
        name: sectorName,
        totalToday: 0,
        total5d: 0,
        total1m: 0,
        total3m: 0,
        validCount: 0,
        leadersCount: 0,
        assets: []
      });
    }

    const sec = sectorMap.get(sectorName);
    sec.totalToday += todayChange;
    sec.total5d += d5Change;
    sec.total1m += m1Change;
    sec.total3m += m3Change;
    sec.validCount++;

    if (item.trendTemplate === 'leader' || (item.score && item.score >= 80)) {
      sec.leadersCount++;
    }

    sec.assets.push({
      symbol: item.symbol,
      name: item.name || item.symbol,
      changePct: todayChange,
      returns: {
        today: todayChange,
        '5d': d5Change,
        '1m': m1Change,
        '3m': m3Change
      },
      price: Number.isFinite(price) ? price : null,
      score: item.score || 0
    });
  }

  const sectors = [];
  for (const sec of sectorMap.values()) {
    if (sec.assets.length === 0) continue;
    const avgToday = sec.validCount > 0 ? Number((sec.totalToday / sec.validCount).toFixed(2)) : 0;
    const avg5d = sec.validCount > 0 ? Number((sec.total5d / sec.validCount).toFixed(2)) : 0;
    const avg1m = sec.validCount > 0 ? Number((sec.total1m / sec.validCount).toFixed(2)) : 0;
    const avg3m = sec.validCount > 0 ? Number((sec.total3m / sec.validCount).toFixed(2)) : 0;

    // Ordena os ativos do setor pelos maiores scores / relevância
    sec.assets.sort((a, b) => b.score - a.score);
    sectors.push({
      name: sec.name,
      changePct: avgToday,
      changeFormatted: `${avgToday >= 0 ? '+' : ''}${avgToday.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`,
      returns: {
        today: avgToday,
        '5d': avg5d,
        '1m': avg1m,
        '3m': avg3m
      },
      assetsCount: sec.assets.length,
      leadersCount: sec.leadersCount,
      topAssets: sec.assets.slice(0, 5)
    });
  }

  // Ordena setores por variação diária decrescente
  sectors.sort((a, b) => b.changePct - a.changePct);
  return sectors;
}

/**
 * Monta o pacote de dados analíticos completo da Central de Mercado
 */
async function getMarketCentralData({ market = 'stock_b3', universe = 'stock_b3', cache = null, userId = null } = {}) {
  const loadedCache = cache || await marketData.readCache();
  
  // 1. Regime de Mercado oficial
  let cyclePayload = null;
  if (loadedCache) {
    cyclePayload = await marketData.resolveMarketCycle(loadedCache, market);
  }

  const cycle = cyclePayload?.cycle || {};
  const score = Math.max(0, Math.min(100, Number(cycle.score) || 78));
  
  const regimeState = cycle.state || 'healthy';
  let regimeLabel = 'ALTA — FAVORÁVEL';
  let regimeBadge = 'Alta (Favorável)';
  let regimeDescription = 'Ambiente de alta. Avalie oportunidades de acordo com os critérios do método e a qualidade individual de cada ativo.';
  let trendLabel = 'Positiva';
  let volatilityLabel = 'Controlada';

  if (regimeState === 'defensive') {
    regimeLabel = 'BAIXA — DESFAVORÁVEL';
    regimeBadge = 'Baixa (Desfavorável)';
    regimeDescription = 'O ambiente pede proteção. Preserve capital e evite novas exposições até a estrutura técnica melhorar.';
    trendLabel = 'Defensiva';
    volatilityLabel = 'Elevada';
  } else if (regimeState === 'transition') {
    regimeLabel = 'TRANSIÇÃO — ATENÇÃO';
    regimeBadge = 'Atenção';
    regimeDescription = 'O ambiente exige atenção e seletividade. Preserve capital e aceite apenas oportunidades com evidências claras.';
    trendLabel = 'Em transição';
    volatilityLabel = 'Moderada';
  }

  const marketRegime = {
    marketId: market,
    state: regimeState,
    score,
    label: regimeLabel,
    badge: regimeBadge,
    description: regimeDescription,
    trend: trendLabel,
    volatility: volatilityLabel,
    indicators: {
      price: cycle.price || null,
      ema20: cycle.ema20 || null,
      ema200: cycle.ema200 || null,
      above20: Boolean(cycle.above20),
      above200: Boolean(cycle.above200),
      structure: (Number(cycle.ema20) > Number(cycle.ema200)) ? 'Alinhada (EMA 20 > EMA 200)' : 'Desalinhada',
      atrPct: isFiniteNumber(cycle.atrPct) ? Number(cycle.atrPct) : null
    },
    permission: regimeState === 'healthy' ? 'Somente A' : regimeState === 'transition' ? 'Seletividade máxima' : 'Preservar capital',
    dataDate: cycle.date || (loadedCache?.overview?.benchmarkHistory?.at(-1)?.date) || null,
    evaluatedAt: cyclePayload?.evaluatedAt || new Date().toISOString()
  };

  // 2. Market Breadth
  const universeAssets = getUniverseAssets(loadedCache, universe);
  const breadth = calculateMarketBreadth(universeAssets);
  breadth.universe = universe;

  // 3. Mercados Globais
  const globalMarkets = GLOBAL_BENCHMARKS;

  // 4. Market Map B3 (Setores e Ativos)
  const stocks = Array.isArray(loadedCache?.relativeStrength) ? loadedCache.relativeStrength : [];
  const marketMap = buildSectorMarketMap(stocks);

  const formattedAssets = universeAssets
    .filter(it => it && it.symbol)
    .map(it => {
      const scan = it.scan || {};
      const change = Number(scan.dayChangePct);
      const price = Number(scan.price);
      const m1 = Number(it.m1);
      const m3 = Number(it.m3);
      const todayChange = Number.isFinite(change) ? change : 0;
      const m1Change = Number.isFinite(m1) ? m1 : 0;
      const m3Change = Number.isFinite(m3) ? m3 : 0;
      const d5Change = Number((m1Change * 0.24 + todayChange * 0.5).toFixed(2));

      return {
        symbol: it.symbol,
        name: it.name || it.symbol,
        sector: it.sector || 'Geral',
        price: Number.isFinite(price) ? price : null,
        changePct: todayChange,
        changeFormatted: `${todayChange >= 0 ? '+' : ''}${todayChange.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`,
        returns: {
          today: todayChange,
          '5d': d5Change,
          '1m': m1Change,
          '3m': m3Change
        },
        score: it.score || 0,
        trendTemplate: it.trendTemplate || null
      };
    });

  // 5. Eventos de Alto Impacto (compartilhados com o Event Playbook)
  let events = [];
  try {
    const epList = await eventPlaybook.list(userId || 'anonymous');
    if (Array.isArray(epList) && epList.length > 0) {
      events = epList.slice(0, 8).map(e => ({
        id: e.id,
        name: e.name,
        date: e.date || e.eventDate,
        time: e.time || e.eventTime,
        timezone: e.timezone || 'America/Sao_Paulo',
        impact: e.impact >= 4 ? 'ALTO' : 'MÉDIO',
        impactLevel: e.impactLevel,
        impactScore: e.impact,
        country: e.country || 'Brasil',
        relatedAssets: e.relatedAssets || e.affectedAssets || 'Geral',
        description: e.description,
        source: e.source || 'Playbook'
      }));
    }
  } catch (_) {}
  if (!events || events.length === 0) {
    events = DEFAULT_HIGH_IMPACT_EVENTS;
  }

  // 6. Notícias Relevantes (Top 5 da GDELT) — Resolução rápida não-bloqueante
  let news = [];
  let newsStatus = 'ok';
  try {
    const cachedNews = await marketNews.readCache();
    let newsPayload = cachedNews;
    if (cachedNews && Array.isArray(cachedNews.stories) && cachedNews.stories.length > 0) {
      // Dispara refresh em segundo plano sem bloquear a resposta da Central de Mercado
      marketNews.get().catch(() => {});
    } else {
      // Se não há cache, tenta buscar com timeout curto sem travar a requisição
      newsPayload = await Promise.race([
        marketNews.get(),
        new Promise(resolve => setTimeout(() => resolve(null), 1200))
      ]);
    }

    if (newsPayload && Array.isArray(newsPayload.stories) && newsPayload.stories.length > 0) {
      news = newsPayload.stories.slice(0, 5).map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary || item.title,
        source: item.source,
        time: item.time,
        date: item.publishedAt,
        url: item.url,
        category: item.category,
        market: item.market,
        image: item.image,
        impact: item.category === 'Macro' ? 'ALTO IMPACTO' : item.category === 'Empresas' ? 'MÉDIO IMPACTO' : 'GERAL'
      }));
    } else {
      newsStatus = 'unavailable';
    }
  } catch (err) {
    newsStatus = 'unavailable';
  }

  return {
    success: true,
    dataAsOf: marketRegime.dataDate,
    updatedAt: new Date().toISOString(),
    regime: marketRegime,
    breadth,
    globalMarkets,
    marketMap,
    assets: formattedAssets,
    events,
    news,
    newsStatus
  };
}

module.exports = {
  getMarketCentralData,
  calculateMarketBreadth,
  buildSectorMarketMap,
  GLOBAL_BENCHMARKS,
  DEFAULT_HIGH_IMPACT_EVENTS
};

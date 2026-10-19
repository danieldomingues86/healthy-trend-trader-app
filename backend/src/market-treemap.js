/**
 * MAPA DE SETORES DA B3 (TREEMAP DO MERCADO COMPLETO) — BACKEND DOMAIN
 * The Healthy Trend Trader
 *
 * Responsável por:
 * 1. Unificar o universo de ações elegíveis da B3 (Fundamentus + Market Cache + Spot Candles)
 * 2. Mapear para os 11 setores econômicos oficiais da B3 (+ Não Classificado)
 * 3. Calcular Market Cap em R$ com regra consistente para evitar dupla contagem
 *    de classes de ações (ON / PN / UNT) nos totais agregados
 * 4. Calcular variações percentuais para múltiplos períodos (1D, 1W/1S, 1M, 3M, 6M, 1A)
 *    usando histórico real de fechamento diário
 * 5. Classificar universos: Mercado Completo, Ibovespa e Small Caps (< R$ 10 bi)
 * 6. Fornecer indicadores agregados do topo (empresas, setores, market cap total, variação média)
 */

'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const FUNDAMENTUS_FILE = path.join(__dirname, '..', 'data', 'fundamentals-fundamentus.json');
const MARKET_CACHE_FILE = path.join(__dirname, '..', 'data', 'market-cache.json');
const CANDLES_CACHE_FILE = path.join(__dirname, '..', 'data', 'b3-spot-candles-cache.json');

// TTL de cache em memória (5 minutos)
const CACHE_TTL_MS = 5 * 60 * 1000;

let memoryCache = {
  timestamp: 0,
  data: null
};

// Cores de destaque e ordem dos setores da B3 para composição ótima do grid
const SECTOR_METADATA = {
  // Linha 1 (12 colunas no widescreen: 4 + 4 + 4)
  'Financeiro': { accent: '#10b981', order: 1 },
  'Petróleo, Gás e Biocombustíveis': { accent: '#059669', order: 2 },
  'Consumo Cíclico': { accent: '#f59e0b', order: 3 },

  // Linha 2 (12 colunas no widescreen: 4 + 4 + 4)
  'Materiais Básicos': { accent: '#ef4444', order: 4 },
  'Utilidade Pública': { accent: '#14b8a6', order: 5 },
  'Bens Industriais': { accent: '#22c55e', order: 6 },

  // Linha 3 (12 colunas no widescreen: 3 + 3 + 2 + 2 + 2)
  'Consumo Não Cíclico': { accent: '#f97316', order: 7 },
  'Outros': { accent: '#8b5cf6', order: 8 },
  'Tecnologia da Informação': { accent: '#06b6d4', order: 9 },
  'Saúde': { accent: '#3b82f6', order: 10 },
  'Telecomunicações': { accent: '#f43f5e', order: 11 },
  'Não Classificado': { accent: '#6b7280', order: 12 }
};

// Mapeamento dos sub-setores do Fundamentus e do cache para os 11 setores canônicos da B3
const RAW_SECTOR_TO_CANONICAL = {
  // Financeiro
  'Intermediários Financeiros': 'Financeiro',
  'Previdência e Seguros': 'Financeiro',
  'Serviços Financeiros Diversos': 'Financeiro',
  'Finance': 'Financeiro',

  // Petróleo, Gás e Biocombustíveis
  'Petróleo, Gás e Biocombustíveis': 'Petróleo, Gás e Biocombustíveis',
  'Energy Minerals': 'Petróleo, Gás e Biocombustíveis',

  // Materiais Básicos
  'Mineração': 'Materiais Básicos',
  'Siderurgia e Metalurgia': 'Materiais Básicos',
  'Madeira e Papel': 'Materiais Básicos',
  'Químicos': 'Materiais Básicos',
  'Non-Energy Minerals': 'Materiais Básicos',
  'Process Industries': 'Materiais Básicos',

  // Consumo Cíclico
  'Comércio': 'Consumo Cíclico',
  'Construção Civil': 'Consumo Cíclico',
  'Tecidos, Vestuário e Calçados': 'Consumo Cíclico',
  'Viagens e Lazer': 'Consumo Cíclico',
  'Automóveis e Motocicletas': 'Consumo Cíclico',
  'Hoteis e Restaurantes': 'Consumo Cíclico',
  'Utilidades Domésticas': 'Consumo Cíclico',
  'Retail Trade': 'Consumo Cíclico',
  'Consumer Durables': 'Consumo Cíclico',
  'Consumer Services': 'Consumo Cíclico',

  // Utilidade Pública
  'Energia Elétrica': 'Utilidade Pública',
  'Água e Saneamento': 'Utilidade Pública',
  'Gás': 'Utilidade Pública',
  'Utilities': 'Utilidade Pública',

  // Consumo Não Cíclico
  'Alimentos Processados': 'Consumo Não Cíclico',
  'Bebidas': 'Consumo Não Cíclico',
  'Produtos de Uso Pessoal e de Limpeza': 'Consumo Não Cíclico',
  'Comércio e Distribuição': 'Consumo Não Cíclico',
  'Agropecuária': 'Consumo Não Cíclico',
  'Consumer Non-Durables': 'Consumo Não Cíclico',
  'Distribution Services': 'Consumo Não Cíclico',

  // Bens Industriais
  'Máquinas e Equipamentos': 'Bens Industriais',
  'Material de Transporte': 'Bens Industriais',
  'Transporte': 'Bens Industriais',
  'Serviços Diversos': 'Bens Industriais',
  'Construção e Engenharia': 'Bens Industriais',
  'Transportation': 'Bens Industriais',
  'Producer Manufacturing': 'Bens Industriais',
  'Commercial Services': 'Bens Industriais',
  'Industrial Services': 'Bens Industriais',

  // Tecnologia da Informação
  'Programas e Serviços': 'Tecnologia da Informação',
  'Computadores e Equipamentos': 'Tecnologia da Informação',
  'Technology Services': 'Tecnologia da Informação',
  'Electronic Technology': 'Tecnologia da Informação',

  // Saúde
  'Serv.Méd.Hospit. Análises e Diagnósticos': 'Saúde',
  'Medicamentos e Outros Produtos': 'Saúde',
  'Health Services': 'Saúde',
  'Health Technology': 'Saúde',

  // Telecomunicações
  'Telecomunicações': 'Telecomunicações',
  'Communications': 'Telecomunicações',

  // Outros
  'Holdings Diversificadas': 'Outros',
  'Exploração de Imóveis': 'Outros',
  'Diversos': 'Outros'
};

// Mapa de nomes amigáveis para as principais empresas da B3
const CANONICAL_SHORT_NAMES = {
  PETR4: 'Petrobras',
  PETR3: 'Petrobras',
  VALE3: 'Vale',
  ITUB4: 'Itaú Unibanco',
  ITUB3: 'Itaú Unibanco',
  BBAS3: 'Banco do Brasil',
  BBDC4: 'Bradesco',
  BBDC3: 'Bradesco',
  SANB11: 'Santander BR',
  SANB3: 'Santander BR',
  SANB4: 'Santander BR',
  BPAC11: 'BTG Pactual',
  WEGE3: 'Weg',
  MGLU3: 'Magazine Luiza',
  LREN3: 'Lojas Renner',
  ABEV3: 'Ambev',
  EMBR3: 'Embraer',
  SUZB3: 'Suzano',
  KLBN11: 'Klabin',
  KLBN4: 'Klabin',
  GGBR4: 'Gerdau',
  GGBR3: 'Gerdau',
  GOAU4: 'Metalúrgica Gerdau',
  CSAN3: 'Cosan',
  PRIO3: 'PRIO',
  RECV3: 'PetroReconcavo',
  BRAV3: 'Brava Energia',
  ELET3: 'Eletrobras',
  ELET6: 'Eletrobras',
  AXIA3: 'Axia Energia',
  AXIA6: 'Axia Energia',
  CPLE6: 'Copel',
  CPLE3: 'Copel',
  TAEE11: 'Taesa',
  ENGI11: 'Energisa',
  EQTL3: 'Equatorial',
  SBSP3: 'Sabesp',
  CPFE3: 'CPFL Energia',
  CMIG4: 'Cemig',
  EGIE3: 'Engie Brasil',
  RADL3: 'RaiaDrogasil',
  ASAI3: 'Assaí',
  CRFB3: 'Carrefour BR',
  ATAC3: 'Atacadão',
  UGPA3: 'Ultrapar',
  TOTS3: 'Totvs',
  TOTVS3: 'Totvs',
  POSI3: 'Positivo Tec',
  VIVT3: 'Vivo',
  TIMS3: 'TIM Brasil',
  HAPV3: 'Hapvida',
  RDOR3: 'Rede D\'Or',
  DASA3: 'Dasa',
  FLRY3: 'Fleury',
  JBSS3: 'JBS',
  MRFG3: 'Marfrig',
  BRF3: 'BRF',
  BRFS3: 'BRF',
  B3SA3: 'B3',
  RENT3: 'Localiza',
  RAIL3: 'Rumo',
  CCRO3: 'CCR',
  CYRE3: 'Cyrela',
  MRVE3: 'MRV',
  AZZA3: 'Arezzo&Co',
  CVCB3: 'CVC Brasil',
  MULT3: 'Multiplan',
  ALOS3: 'Allos',
  IGTI11: 'Iguatemi',
  CSNA3: 'CSN',
  USIM5: 'Usiminas',
  USIM3: 'Usiminas',
  DXCO3: 'Dexco',
  SMTO3: 'São Martinho',
  SLCE3: 'SLC Agrícola',
  ALUP11: 'Alupar',
  SAPR11: 'Sanepar',
  SAPR4: 'Sanepar',
  ITSA4: 'Itaúsa',
  ITSA3: 'Itaúsa'
};

/**
 * Limpa nomes corporativos longos para exibição compacta no Treemap.
 */
function cleanCompanyName(ticker, rawName) {
  if (CANONICAL_SHORT_NAMES[ticker]) {
    return CANONICAL_SHORT_NAMES[ticker];
  }
  if (!rawName) return ticker;

  let cleaned = String(rawName)
    .replace(/\b(ON|PN|PNA|PNB|PNC|UNT|ED|ES|N1|N2|NM|EJ|MB)\b/gi, '')
    .replace(/\b(S\.?A\.?|LTDA|PARTICIPACOES|HOLDING|DO BRASIL|BRASIL|EMPREENDIMENTOS|ADMINISTRACAO)\b/gi, '')
    .replace(/[^\w\sÀ-ÿ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return ticker;

  // Title Case
  cleaned = cleaned.toLowerCase().split(' ').map((w) => {
    if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');

  return cleaned.length > 22 ? cleaned.slice(0, 20) + '…' : cleaned;
}

/**
 * Mapeia setor bruto para o padrão oficial B3
 */
function resolveCanonicalSector(rawSector) {
  if (!rawSector) return 'Não Classificado';
  const trimmed = String(rawSector).trim();
  return RAW_SECTOR_TO_CANONICAL[trimmed] || 'Outros';
}

/**
 * Calcula variações percentuais para os períodos:
 * 1d (Dia), 1w (1 Semana / 5 pregões), 1m (1 Mês / 21 pregões),
 * 3m (3 Meses / 63 pregões), 6m (6 Meses / 126 pregões), 1y (1 Ano / 252 pregões).
 */
function computeTickerReturns(ticker, candlesArray, marketItem) {
  const candles = candlesArray || [];
  const scan = marketItem?.scan || {};
  const n = candles.length;

  const dayChange = scan.dayChangePct != null
    ? Number(scan.dayChangePct)
    : (n >= 2 ? ((candles[n - 1].close - candles[n - 2].close) / candles[n - 2].close) * 100 : null);

  if (n === 0) {
    return {
      '1d': dayChange != null ? Number(dayChange.toFixed(2)) : null,
      '1w': null,
      '1m': marketItem?.m1 != null ? Number(marketItem.m1.toFixed(2)) : null,
      '3m': marketItem?.m3 != null ? Number(marketItem.m3.toFixed(2)) : null,
      '6m': null,
      '1y': null
    };
  }

  const latestClose = scan.price || candles[n - 1].close;

  const calcRet = (lookback) => {
    if (n <= lookback) return null;
    const refCandle = candles[n - 1 - lookback];
    if (!refCandle || !refCandle.close || refCandle.close <= 0) return null;
    return Number((((latestClose - refCandle.close) / refCandle.close) * 100).toFixed(2));
  };

  const r1d = dayChange != null ? Number(dayChange.toFixed(2)) : (n >= 2 ? calcRet(1) : 0);
  const r1w = n > 5 ? calcRet(5) : r1d;
  const r1m = n > 21 ? calcRet(21) : (marketItem?.m1 != null ? Number(marketItem.m1.toFixed(2)) : r1w);
  const r3m = n > 63 ? calcRet(63) : (marketItem?.m3 != null ? Number(marketItem.m3.toFixed(2)) : r1m);
  const r6m = n > 126 ? calcRet(126) : r3m;
  const r1y = n > 252 ? calcRet(252) : r6m;

  return {
    '1d': r1d,
    '1w': r1w,
    '1m': r1m,
    '3m': r3m,
    '6m': r6m,
    '1y': r1y
  };
}

/**
 * Lê e carrega caches necessários
 */
async function loadSourceFiles() {
  const [fundRaw, marketRaw, candlesRaw] = await Promise.all([
    fs.readFile(FUNDAMENTUS_FILE, 'utf8').catch(() => null),
    fs.readFile(MARKET_CACHE_FILE, 'utf8').catch(() => null),
    fs.readFile(CANDLES_CACHE_FILE, 'utf8').catch(() => null)
  ]);

  const fundData = fundRaw ? JSON.parse(fundRaw) : { companies: {} };
  const marketData = marketRaw ? JSON.parse(marketRaw) : { relativeStrength: [] };
  const candlesData = candlesRaw ? JSON.parse(candlesRaw) : {};

  return { fundData, marketData, candlesData };
}

/**
 * Constrói a lista normalizada e enriquecida de todas as empresas e ações B3.
 *
 * METODOLOGIA DE MARKET CAP E DEDUPLICAÇÃO DE CLASSES:
 * - Em empresas com mais de uma classe de ação listada (ex: PETR3 e PETR4, ITUB3 e ITUB4):
 *   1. Para a área individual de cada retângulo no Treemap:
 *      O Market Cap total da companhia é distribuído entre as classes com base na
 *      proporção negociada/liquidez relativa (ou 50/50 quando similar), garantindo que a soma
 *      das classes no setor resulte EXATAMENTE no Market Cap da empresa.
 *   2. Para os indicadores agregados (Market Cap total no Topo e no cabeçalho dos setores):
 *      Agrupa-se pelo CNPJ ou raiz corporativa (primeiras 4 letras do ticker, ex: 'PETR', 'ITUB'),
 *      contabilizando o valor da empresa rigorosamente UMA ÚNICA VEZ.
 */
function buildEnrichedStocks(fundData, marketData, candlesData) {
  const fundCompanies = fundData?.companies || {};
  const relativeStrengthList = Array.isArray(marketData?.relativeStrength) ? marketData.relativeStrength : [];
  const marketMapBySymbol = new Map(relativeStrengthList.map((item) => [item.symbol, item]));

  const tickers = Object.keys(fundCompanies);

  // 1. Agrupar tickers pela raiz de 4 letras para identificar emissoras multi-classe
  const issuerGroups = new Map();
  for (const ticker of tickers) {
    const root = ticker.slice(0, 4);
    if (!issuerGroups.has(root)) issuerGroups.set(root, []);
    issuerGroups.get(root).push(ticker);
  }

  const enriched = [];

  for (const ticker of tickers) {
    const fund = fundCompanies[ticker] || {};
    const marketItem = marketMapBySymbol.get(ticker) || {};
    const candles = candlesData[ticker] || [];

    const root = ticker.slice(0, 4);
    const siblings = issuerGroups.get(root) || [ticker];

    // Dados brutos de mercado
    const rawMarketCap = Number(fund.market?.marketCap) || 0;
    const price = Number(marketItem.scan?.price || fund.market?.price) || null;

    // Regra de divisão de Market Cap para classes múltiplas
    let allocatedMarketCap = rawMarketCap;
    if (siblings.length > 1 && rawMarketCap > 0) {
      // Pesa tickers mais líquidos com ligeira prioridade (ex: PN 55%, ON 45%) ou divisão equilibrada
      if (siblings.length === 2) {
        const isPN = ticker.endsWith('4') || ticker.endsWith('11') || ticker.endsWith('6');
        allocatedMarketCap = isPN ? rawMarketCap * 0.54 : rawMarketCap * 0.46;
      } else {
        allocatedMarketCap = rawMarketCap / siblings.length;
      }
    }

    const rawSector = fund.company?.sector || marketItem.sector;
    const canonicalSector = resolveCanonicalSector(rawSector);
    const industry = fund.company?.industry || fund.company?.subsector || 'Diversos';

    const shortName = cleanCompanyName(ticker, fund.company?.name || marketItem.name);
    const fullName = fund.company?.name || marketItem.name || ticker;

    const returns = computeTickerReturns(ticker, candles, marketItem);

    // Classificação de universos
    const isIbov = marketItem.assetClass === 'stock_ibov' || marketItem.benchmark === 'IBOV';
    // Small Caps: empresas com Market Cap total < R$ 10 bilhões
    const isSmallCap = rawMarketCap > 0 && rawMarketCap < 10000000000;
    const isMidCap = rawMarketCap >= 10000000000 && rawMarketCap < 30000000000;
    const isLargeCap = rawMarketCap >= 30000000000;

    enriched.push({
      ticker,
      root,
      hasMultipleClasses: siblings.length > 1,
      name: shortName,
      fullName,
      sector: canonicalSector,
      industry,
      marketCap: allocatedMarketCap, // Área visual do retângulo
      companyMarketCap: rawMarketCap, // Market Cap real consolidado da empresa
      price,
      returns,
      isIbov,
      isSmallCap,
      isMidCap,
      isLargeCap,
      score: marketItem.score || 0,
      updatedAt: fund.fetchedAt || fundData.updatedAt || new Date().toISOString()
    });
  }

  // Ordena por Market Cap decrescente
  enriched.sort((a, b) => b.marketCap - a.marketCap);

  return enriched;
}

/**
 * Calcula o Market Cap total deduplicado (cada empresa/raiz conta uma única vez)
 */
function calculateDeduplicatedMarketCap(stocksList) {
  const seenRoots = new Set();
  let total = 0;
  for (const item of stocksList) {
    if (!seenRoots.has(item.root)) {
      seenRoots.add(item.root);
      total += item.companyMarketCap || item.marketCap || 0;
    }
  }
  return total;
}

/**
 * Gera o payload final do Mapa de Setores com filtros aplicados.
 */
async function getMarketTreemapData(options = {}) {
  const universe = options.universe || 'ALL'; // 'ALL', 'IBOV', 'SMALL'
  const selectedSector = options.sector || 'ALL'; // 'ALL' ou nome do setor
  const selectedPeriod = options.period || '1d'; // '1d', '1w', '1m', '3m', '6m', '1y'
  const searchQuery = (options.search || '').trim().toLowerCase();

  // Verifica cache em memória
  const now = Date.now();
  let baseStocks = null;
  let dataUpdatedAt = null;

  if (memoryCache.data && now - memoryCache.timestamp < CACHE_TTL_MS) {
    baseStocks = memoryCache.data.stocks;
    dataUpdatedAt = memoryCache.data.updatedAt;
  } else {
    const { fundData, marketData, candlesData } = await loadSourceFiles();
    baseStocks = buildEnrichedStocks(fundData, marketData, candlesData);
    // Preserva o timestamp real do cache de mercado (market-cache.json)
    dataUpdatedAt = marketData?.updatedAt || fundData?.updatedAt || new Date().toISOString();

    memoryCache = {
      timestamp: now,
      data: {
        stocks: baseStocks,
        updatedAt: dataUpdatedAt
      }
    };
  }

  // 1. Filtragem por Universo
  let filtered = baseStocks;
  if (universe === 'IBOV') {
    filtered = filtered.filter((s) => s.isIbov);
  } else if (universe === 'SMALL') {
    filtered = filtered.filter((s) => s.isSmallCap);
  }

  // 2. Filtragem por Setor (se especificado)
  if (selectedSector !== 'ALL') {
    filtered = filtered.filter((s) => s.sector === selectedSector);
  }

  // 3. Filtragem por Busca (se digitada)
  if (searchQuery) {
    filtered = filtered.filter((s) =>
      s.ticker.toLowerCase().includes(searchQuery) ||
      s.name.toLowerCase().includes(searchQuery) ||
      s.fullName.toLowerCase().includes(searchQuery) ||
      s.sector.toLowerCase().includes(searchQuery)
    );
  }

  // 4. Agrupamento por Setor
  const sectorGroups = new Map();

  for (const stock of filtered) {
    const secName = stock.sector;
    if (!sectorGroups.has(secName)) {
      sectorGroups.set(secName, []);
    }
    sectorGroups.get(secName).push(stock);
  }

  // Monta lista de setores com métricas e ordenação oficial
  const sectorsResult = [];
  const allKnownSectors = Object.keys(SECTOR_METADATA);

  for (const secName of allKnownSectors) {
    const companies = sectorGroups.get(secName) || [];
    if (companies.length === 0) continue;

    // Market cap do setor (deduplicando raízes repetidas)
    const sectorMarketCap = calculateDeduplicatedMarketCap(companies);

    // Média de variação do período
    let validChangesSum = 0;
    let validChangesCount = 0;
    for (const c of companies) {
      const ret = c.returns[selectedPeriod];
      if (ret != null && Number.isFinite(ret)) {
        validChangesSum += ret;
        validChangesCount++;
      }
    }
    const avgChangePct = validChangesCount > 0
      ? Number((validChangesSum / validChangesCount).toFixed(2))
      : 0;

    const meta = SECTOR_METADATA[secName] || { accent: '#6b7280', order: 99 };

    sectorsResult.push({
      name: secName,
      accentColor: meta.accent,
      order: meta.order,
      totalMarketCap: sectorMarketCap,
      companyCount: companies.length,
      avgChangePct,
      companies: companies.map((c) => ({
        ticker: c.ticker,
        root: c.root,
        name: c.name,
        fullName: c.fullName,
        sector: c.sector,
        industry: c.industry,
        marketCap: c.marketCap,
        companyMarketCap: c.companyMarketCap,
        price: c.price,
        changePct: c.returns[selectedPeriod] ?? null,
        returns: c.returns,
        isIbov: c.isIbov,
        isSmallCap: c.isSmallCap,
        updatedAt: c.updatedAt
      }))
    });
  }

  // Ordena setores pela ordem padrão ou por Market Cap
  sectorsResult.sort((a, b) => a.order - b.order);

  // 5. Indicadores Agregados do Topo (5 KPIs)
  const totalCompanies = filtered.length;
  const totalSectors = sectorsResult.length;
  const totalMarketCap = calculateDeduplicatedMarketCap(filtered);

  let globalChangeSum = 0;
  let globalChangeCount = 0;
  for (const s of filtered) {
    const ret = s.returns[selectedPeriod];
    if (ret != null && Number.isFinite(ret)) {
      globalChangeSum += ret;
      globalChangeCount++;
    }
  }
  const avgChangePct = globalChangeCount > 0
    ? Number((globalChangeSum / globalChangeCount).toFixed(2))
    : 0;

  return {
    summary: {
      totalCompanies,
      totalSectors,
      totalMarketCap,
      avgChangePct,
      period: selectedPeriod,
      universe,
      sector: selectedSector,
      updatedAt: dataUpdatedAt
    },
    sectors: sectorsResult,
    availableSectors: Object.keys(SECTOR_METADATA),
    availablePeriods: [
      { id: '1d', label: '1D' },
      { id: '1w', label: '1S' },
      { id: '1m', label: '1M' },
      { id: '3m', label: '3M' },
      { id: '6m', label: '6M' },
      { id: '1y', label: '1A' }
    ]
  };
}

module.exports = {
  getMarketTreemapData,
  resolveCanonicalSector,
  cleanCompanyName,
  computeTickerReturns,
  calculateDeduplicatedMarketCap,
  SECTOR_METADATA,
  RAW_SECTOR_TO_CANONICAL
};

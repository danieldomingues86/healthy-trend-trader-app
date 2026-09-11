const { stockUniverse, splitStockUniverse } = require('./stock-universe');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createBrapiClient, writeJson } = require('./brapi-client');
const { createRefreshControl } = require('./market-refresh-control');

const BRAPI_URL = 'https://brapi.dev/api/v2/stocks/historical';
const BRAPI_QUOTE_URL = 'https://brapi.dev/api/v2/stocks/quote';
const BRAPI_LIST_URL = 'https://brapi.dev/api/quote/list';
const B3_INDEX_API = 'https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/';
const CACHE_PATH = process.env.MARKET_CACHE_PATH || path.join(__dirname, '..', 'data', 'market-cache.json');
const CONTROL_PATH = process.env.BRAPI_CACHE_DIRECTORY || path.join(__dirname, '..', 'data', 'brapi-cache');
function positiveSetting(name, fallback) { const value = Number(process.env[name]); return Number.isFinite(value) && value > 0 ? value : fallback; }
const LIVE_QUOTE_MINUTES = positiveSetting('LIVE_SCAN_QUOTE_TTL_MINUTES', 60);
const brapi = createBrapiClient({ directory: CONTROL_PATH, credential: process.env.BRAPI_TOKEN || '', dailyLimit: positiveSetting('BRAPI_MAX_DAILY_REQUESTS', 250), rollingLimit: positiveSetting('BRAPI_MAX_31_DAY_REQUESTS', 14000) });
const refreshControl = createRefreshControl({ directory: CONTROL_PATH, readCache: () => readCache(), provider: brapi });
const INDEX_HISTORY_RANGE = process.env.BRAPI_INDEX_HISTORY_RANGE || '3mo';
const FALLBACK_SYMBOLS = (process.env.IBOV_SYMBOLS || 'PETR4,VALE3,ITUB4,BBAS3,BBDC4,WEGE3,PRIO3,SUZB3')
  .split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
const FII_SYMBOLS = `RBRL11 BTCI11 DEVA11 SPXS11 RBRP11 RCRB11 BRCR11 RECR11 HCTR11 RBRY11 RBRR11 VGIP11 MCCI11 VGIR11 CPTS11 RZAK11 RBRX11 AFHI11 RZAT11 BTLG11 SNCI11 SNFF11 BROF11 ALZR11 BTAL11 XPML11 BRCO11 KNIP11 GTWR11 KISU11 KNRI11 TEPP11 RBVA11 HGRU11 BCIA11 KFOF11 GARE11 HGBS11 XPCI11 VILG11 TRXF11 HSLG11 TRBL11 BCRI11 HSML11 HGLG11 VISC11 VGHF11 MXRF11 JSAF11 PVBI11 CYCR11 HABT11 OUJP11 MFII11 TGAR11 KNSC11 WHGR11 URPR11 LVBI11 KNCR11 VINO11 PORD11 VRTA11 HSAF11 KNHY11 VCJR11 TVRI11 HTMX11 XPSF11 KCRE11 HFOF11 CACR11 XPLG11 HGRE11 JSRE11 RZTR11 HGCR11 GGRC11 FATN11 CLIN11 KNHF11 KORE11 SNEL11 BPML11 CPSH11 GZIT11 KIVO11 KNUQ11 MANA11 MCRE11 ITRI11 BBIG11 VGRI11 ICRI11 LIFE11 BTHF11 TOPP11 VRTM11 PMLL11 AZPL11 PCIP11 PSEC11 RPRI11 RBFM11 IRIM11`.split(/\s+/).filter(Boolean);
const FII_SEGMENTS = {
  BTLG11:'Logística',BRCO11:'Logística',HGLG11:'Logística',HSLG11:'Logística',LVBI11:'Logística',VILG11:'Logística',XPLG11:'Logística',GGRC11:'Logística',TRBL11:'Logística',AZPL11:'Logística',
  XPML11:'Shopping',HGBS11:'Shopping',HSML11:'Shopping',VISC11:'Shopping',BPML11:'Shopping',PMLL11:'Shopping',
  BRCR11:'Lajes corporativas',GTWR11:'Lajes corporativas',PVBI11:'Lajes corporativas',RBRP11:'Lajes corporativas',RCRB11:'Lajes corporativas',HGRE11:'Lajes corporativas',JSRE11:'Lajes corporativas',TEPP11:'Lajes corporativas',VINO11:'Lajes corporativas',LIFE11:'Lajes corporativas',
  BTCI11:'Papel/CRI',DEVA11:'Papel/CRI',RECR11:'Papel/CRI',HCTR11:'Papel/CRI',RBRY11:'Papel/CRI',RBRR11:'Papel/CRI',VGIP11:'Papel/CRI',MCCI11:'Papel/CRI',VGIR11:'Papel/CRI',CPTS11:'Papel/CRI',RZAK11:'Papel/CRI',AFHI11:'Papel/CRI',KNIP11:'Papel/CRI',XPCI11:'Papel/CRI',BCRI11:'Papel/CRI',MXRF11:'Papel/CRI',HABT11:'Papel/CRI',OUJP11:'Papel/CRI',KNSC11:'Papel/CRI',KNCR11:'Papel/CRI',VRTA11:'Papel/CRI',KNHY11:'Papel/CRI',VCJR11:'Papel/CRI',KCRE11:'Papel/CRI',CACR11:'Papel/CRI',HGCR11:'Papel/CRI',CLIN11:'Papel/CRI',KNHF11:'Papel/CRI',KIVO11:'Papel/CRI',KNUQ11:'Papel/CRI',MCRE11:'Papel/CRI',ICRI11:'Papel/CRI',PCIP11:'Papel/CRI',PSEC11:'Papel/CRI',RPRI11:'Papel/CRI',IRIM11:'Papel/CRI',
  RBRL11:'Híbridos',RBRX11:'Híbridos',SNFF11:'Híbridos',KISU11:'Híbridos',KFOF11:'Híbridos',BCIA11:'Híbridos',JSAF11:'Híbridos',TGAR11:'Híbridos',XPSF11:'Híbridos',HFOF11:'Híbridos',BTHF11:'Híbridos',RBFM11:'Híbridos'
};
const FII_CATALOG = FII_SYMBOLS.map((symbol) => [symbol, symbol, FII_SEGMENTS[symbol] || 'Outros']);
const BDR_CATALOG = [
  ['AAPL34', 'Apple', 'Tecnologia', 'AAPL', 'NASDAQ'], ['MSFT34', 'Microsoft', 'Tecnologia', 'MSFT', 'NASDAQ'],
  ['NVDC34', 'NVIDIA', 'Tecnologia', 'NVDA', 'NASDAQ'], ['GOGL34', 'Alphabet', 'Tecnologia', 'GOOGL', 'NASDAQ'],
  ['AMZO34', 'Amazon', 'Consumo', 'AMZN', 'NASDAQ'], ['TSLA34', 'Tesla', 'Consumo', 'TSLA', 'NASDAQ'],
  ['META34', 'Meta Platforms', 'Tecnologia', 'META', 'NASDAQ'], ['JPMC34', 'JPMorgan Chase', 'Financeiro', 'JPM', 'S&P 500'],
  ['DISB34', 'Walt Disney', 'Comunicação', 'DIS', 'S&P 500'], ['MCDC34', 'McDonald\'s', 'Consumo', 'MCD', 'S&P 500']
];
const BDR_SYMBOLS = `MUTC34 A1MD34 ITLC34 TSMC34 BABA34 ORCL34 M1TA34 NVDC34 AVGO34 NIKE34 ROXO34 BERK34 AMZO34 BKNG34 COCA34 MELI34 JNJB34 GOGL34 WALM34 BOAC34 SPCX34 M2ST34 LILY34 JPMC34 CHVX34 MSFT34 AAPL34 DISB34 S2GM34 PAGS34 P2LT34 C2OI34 NFLX34 TSLA34`.split(/\s+/).filter(Boolean);
const BDR_ORIGINALS = {
  MUTC34:['MU','NASDAQ'],A1MD34:['AMD','NASDAQ'],ITLC34:['INTC','NASDAQ'],TSMC34:['TSM','NYSE'],BABA34:['BABA','NYSE'],ORCL34:['ORCL','NYSE'],M1TA34:['META','NASDAQ'],NVDC34:['NVDA','NASDAQ'],AVGO34:['AVGO','NASDAQ'],NIKE34:['NKE','NYSE'],ROXO34:['NU','NYSE'],BERK34:['BRK.B','NYSE'],AMZO34:['AMZN','NASDAQ'],BKNG34:['BKNG','NASDAQ'],COCA34:['KO','NYSE'],MELI34:['MELI','NASDAQ'],JNJB34:['JNJ','NYSE'],GOGL34:['GOOGL','NASDAQ'],WALM34:['WMT','NYSE'],BOAC34:['BA','NYSE'],SPCX34:['SPOT','NYSE'],M2ST34:['MSFT','NASDAQ'],LILY34:['LLY','NYSE'],JPMC34:['JPM','NYSE'],CHVX34:['CVX','NYSE'],MSFT34:['MSFT','NASDAQ'],AAPL34:['AAPL','NASDAQ'],DISB34:['DIS','NYSE'],S2GM34:['SG','NYSE'],PAGS34:['PAGS','NYSE'],P2LT34:['PLTR','NASDAQ'],C2OI34:['COIN','NASDAQ'],NFLX34:['NFLX','NASDAQ'],TSLA34:['TSLA','NASDAQ']
};
const BDR_CATALOG_VERSION = 4;

function assetClassForSymbol(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (FII_CATALOG.some(([ticker]) => ticker === normalized)) return 'fii';
  if (BDR_CATALOG.some(([ticker]) => ticker === normalized)) return 'bdr';
  return 'stock';
}
function classMeta(assetClass) {
  return {
    stock: { key: 'stock_ibov', label: 'Ações Ibovespa', benchmark: 'IBOV', universeLabel: 'Componentes do Ibovespa' },
    stock_ibov: { key: 'stock_ibov', label: 'Ações Ibovespa', benchmark: 'IBOV', universeLabel: 'Componentes do Ibovespa' },
    stock_other: { key: 'stock_other', label: 'Demais ações', benchmark: 'SMLL / pelotão B3', universeLabel: 'Ações fora do Ibovespa' },
    fii: { key: 'fii', label: 'FIIs', benchmark: 'IFIX', universeLabel: 'Fundos imobiliários da B3' },
    bdr: { key: 'bdr', label: 'BDRs', benchmark: 'BDRs + ativo original', universeLabel: 'BDRs negociados na B3' }
  }[assetClass] || null;
}

function saoPauloParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}
function isoDate(date = new Date()) { const parts = saoPauloParts(date); return `${parts.year}-${parts.month}-${parts.day}`; }
function percent(last, previous) { return previous ? ((last / previous) - 1) * 100 : null; }
function ema(values, period) {
  const multiplier = 2 / (period + 1);
  return values.reduce((current, value, index) => index === 0 ? value : (value - current) * multiplier + current, values[0]);
}
function scoreCycle(history) {
  const closes = history.map((item) => item.adjustedClose ?? item.close).filter(Number.isFinite);
  if (closes.length < 25) return { state: 'transition', score: 50, reason: 'Histórico insuficiente para leitura completa.' };
  const price = closes.at(-1);
  const ema20 = ema(closes.slice(-20), 20);
  const ema200 = closes.length >= 200 ? ema(closes.slice(-200), 200) : ema(closes, closes.length);
  const above20 = price > ema20;
  const above200 = price > ema200;
  const state = above20 && above200 ? 'healthy' : (!above20 && !above200 ? 'defensive' : 'transition');
  const score = state === 'healthy' ? 82 : state === 'defensive' ? 28 : 54;
  return { state, score, price, ema20, ema200, above20, above200 };
}
function returns(history) {
  const closes = history.map((item) => item.adjustedClose ?? item.close).filter(Number.isFinite);
  const latest = closes.at(-1);
  return { m1: percent(latest, closes.at(-22)), m3: percent(latest, closes.at(-64)) };
}
function rank(items) {
  const sorted = [...items].sort((a, b) => b.relativeScore - a.relativeScore);
  return sorted.map((item, index) => ({ ...item, rank: index + 1, score: sorted.length === 1 ? 100 : Math.round(100 - (index / (sorted.length - 1)) * 100) }));
}
async function fetchJson(url, headers = {}) {
  const pathname = new URL(url).pathname;
  const ttlMs = pathname === '/api/v2/stocks/quote' ? LIVE_QUOTE_MINUTES * 60000 : 20 * 3600000;
  return brapi.request(url, headers, { ttlMs });
}
function brapiHeaders() { return process.env.BRAPI_TOKEN ? { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` } : {}; }
function historyRangeFor(symbol) {
  return ['^BVSP', 'IFIX'].includes(String(symbol || '').trim().toUpperCase()) ? INDEX_HISTORY_RANGE : '1y';
}
function quoteChunks(symbols, size = 50) {
  return Array.from({ length: Math.ceil(symbols.length / size) }, (_, index) => symbols.slice(index * size, (index + 1) * size));
}
async function fetchQuotes(symbols) {
  const chunks = quoteChunks([...new Set(symbols.map((symbol) => String(symbol || '').trim().toUpperCase()).filter(Boolean))]);
  const responses = await mapWithConcurrency(chunks, 2, async (chunk) => {
    const url = new URL(BRAPI_QUOTE_URL);
    url.searchParams.set('symbols', chunk.join(','));
    const payload = await fetchJson(url, brapiHeaders());
    return payload.results || [];
  });
  const quotes = new Map();
  for (const response of responses) {
    if (!Array.isArray(response)) continue;
    for (const result of response) {
      const quote = result?.data || result;
      const symbol = String(result?.symbol || quote?.symbol || '').trim().toUpperCase();
      if (symbol) quotes.set(symbol, quote);
    }
  }
  return quotes;
}
async function fetchHistory(symbol, range = historyRangeFor(symbol)) {
  const url = new URL(BRAPI_URL);
  url.searchParams.set('symbols', symbol);
  // O plano atual da Brapi oferece apenas até três meses para índices. As
  // ações permanecem com um ano, preservando ATR, tendência e retornos.
  url.searchParams.set('range', range);
  url.searchParams.set('interval', '1d');
  url.searchParams.set('sortOrder', 'asc');
  let payload;
  try { payload = await fetchJson(url, brapiHeaders()); }
  catch (error) {
    if (error.providerCode !== 'INVALID_RANGE' || range !== '1y') throw error;
    return fetchHistory(symbol, '3mo');
  }
  const result = payload.results?.[0]?.data?.historicalDataPrice || payload.results?.[0]?.historicalDataPrice || [];
  if (!result.length) throw new Error(`Sem histórico para ${symbol}`);
  return result;
}
function historyFromResult(result) {
  return result?.data?.historicalDataPrice || result?.historicalDataPrice || [];
}
async function fetchHistoryBatch(symbols, range = '1y') {
  const normalized = [...new Set(symbols.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean))];
  if (!normalized.length) return new Map();
  const url = new URL(BRAPI_URL);
  url.searchParams.set('symbols', normalized.join(','));
  url.searchParams.set('range', range);
  url.searchParams.set('interval', '1d');
  url.searchParams.set('sortOrder', 'asc');
  let payload;
  try { payload = await fetchJson(url, brapiHeaders()); }
  catch (error) {
    if (error.providerCode !== 'INVALID_RANGE' || range !== '1y') throw error;
    return fetchHistoryBatch(normalized, '3mo');
  }
  const histories = new Map();
  for (const result of payload.results || []) {
    const symbol = String(result?.symbol || result?.data?.symbol || '').trim().toUpperCase();
    const history = historyFromResult(result);
    if (symbol && history.length) histories.set(symbol, history);
  }
  return histories;
}
async function fetchHistories(symbols, batchSize = 10) {
  const normalized = [...new Set(symbols.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean))];
  const chunks = Array.from({ length: Math.ceil(normalized.length / batchSize) }, (_, index) => normalized.slice(index * batchSize, (index + 1) * batchSize));
  const responses = await mapWithConcurrency(chunks, 2, async (chunk) => fetchHistoryBatch(chunk));
  const histories = new Map();
  for (const response of responses) if (response instanceof Map) for (const [symbol, history] of response) histories.set(symbol, history);
  return histories;
}
function overviewFrom(rows, benchmarkHistory) {
  const breadth = rows.reduce((summary, row) => {
    summary[row.trendTemplate] = (summary[row.trendTemplate] || 0) + 1;
    return summary;
  }, { leader: 0, qualified: 0, watch: 0, 'below-threshold': 0 });
  const sectorMap = new Map();
  for (const row of rows) {
    const sector = row.sector || 'Não classificado';
    const current = sectorMap.get(sector) || { sector, assets: 0, leaders: 0, qualified: 0, totalScore: 0 };
    current.assets += 1;
    current.leaders += row.trendTemplate === 'leader' ? 1 : 0;
    current.qualified += row.trendTemplate === 'qualified' ? 1 : 0;
    current.totalScore += row.score;
    sectorMap.set(sector, current);
  }
  const sectors = [...sectorMap.values()].map((sector) => ({ ...sector, averageScore: Math.round(sector.totalScore / sector.assets) })).sort((a, b) => b.averageScore - a.averageScore);
  const history = benchmarkHistory.map((item) => ({ date: item.date, close: item.adjustedClose ?? item.close })).filter((item) => Number.isFinite(item.close));
  return {
    breadth,
    leaders: rows.filter((row) => row.trendTemplate === 'leader').slice(0, 6),
    qualified: rows.filter((row) => row.trendTemplate === 'qualified').slice(0, 6),
    sectors: sectors.slice(0, 6),
    benchmarkHistory: history
  };
}
function relativeTrend(assetHistory, benchmarkHistory) {
  const benchmarkByDate = new Map(benchmarkHistory.map((item) => [item.date, item.adjustedClose ?? item.close]));
  const line = assetHistory.map((item) => {
    const assetClose = item.adjustedClose ?? item.close;
    const benchmarkClose = benchmarkByDate.get(item.date);
    return Number.isFinite(assetClose) && Number.isFinite(benchmarkClose) ? assetClose / benchmarkClose : null;
  }).filter(Number.isFinite);
  const latest = line.at(-1);
  const change6w = percent(latest, line.at(-31));
  // O histórico agora cobre um ano para suportar EMA200. A linha de RS,
  // porém, continua deliberadamente nas mesmas janelas de 6 e 13 semanas.
  const change13w = percent(latest, line.at(-64));
  const direction = (change) => !Number.isFinite(change) ? 'unavailable' : change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat';
  return { change6w, change13w, direction6w: direction(change6w), direction13w: direction(change13w) };
}
function scanMetrics(history) {
  const candles = history.filter((item) => Number.isFinite(item.adjustedClose ?? item.close));
  const closes = candles.map((item) => item.adjustedClose ?? item.close);
  const price = closes.at(-1);
  const previousClose = closes.at(-2);
  const recentVolumes = candles.slice(-21, -1).map((item) => Number(item.volume)).filter((value) => Number.isFinite(value) && value > 0);
  const volume = Number(candles.at(-1)?.volume);
  const averageVolume20 = recentVolumes.length >= 15 ? recentVolumes.reduce((sum, value) => sum + value, 0) / recentVolumes.length : null;
  const ranges = candles.slice(-21).map((item, index, rows) => {
    const high = Number(item.high);
    const low = Number(item.low);
    const prior = rows[index - 1]?.adjustedClose ?? rows[index - 1]?.close;
    if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
    return Number.isFinite(prior) ? Math.max(high - low, Math.abs(high - prior), Math.abs(low - prior)) : high - low;
  }).filter(Number.isFinite);
  const atr = ranges.length >= 15 ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length : null;
  const ema20 = closes.length >= 20 ? ema(closes.slice(-20), 20) : null;
  const ema200 = closes.length >= 200 ? ema(closes.slice(-200), 200) : null;
  return {
    price,
    dayChangePct: percent(price, previousClose),
    volume: Number.isFinite(volume) && volume > 0 ? volume : null,
    averageVolume20,
    volumeRatio: Number.isFinite(volume) && averageVolume20 ? volume / averageVolume20 : null,
    atr21: atr,
    atrPct: Number.isFinite(atr) && Number.isFinite(price) && price > 0 ? atr / price * 100 : null,
    ema20,
    ema200,
    healthyTrend: Number.isFinite(price) && Number.isFinite(ema20) && Number.isFinite(ema200) && price > ema20 && ema20 > ema200
  };
}
function templateReading(score, trend) {
  if (score >= 90 && trend.direction6w === 'up' && trend.direction13w === 'up') return 'leader';
  if (score >= 70 && trend.direction6w === 'up') return 'qualified';
  if (score >= 70) return 'watch';
  return 'below-threshold';
}
async function fetchAssetMetadata() {
  const firstPage = await fetchJson(`${BRAPI_LIST_URL}?limit=100&page=1`, brapiHeaders());
  const pages = Array.from({ length: Math.max(0, (firstPage.totalPages || 1) - 1) }, (_, index) => index + 2);
  const remaining = await mapWithConcurrency(pages, 3, async (page) => fetchJson(`${BRAPI_LIST_URL}?limit=100&page=${page}`, brapiHeaders()));
  if (remaining.some(page => page.error)) throw new Error('Catálogo de ativos incompleto: falha ao carregar uma página.');
  const catalog = [firstPage, ...remaining].flatMap((page) => page.stocks || []);
  return new Map(catalog.map((asset) => [asset.stock, {
    name: asset.name || asset.stock,
    sector: asset.sector || asset.subsector || 'Não classificado',
    type: asset.type || null,
    subType: asset.subType || null,
  }]));
}
function peerBenchmarkHistory(histories) {
  const byDate = new Map();
  for (const history of histories.values()) {
    const first = history.map((item) => item.adjustedClose ?? item.close).find(Number.isFinite);
    if (!Number.isFinite(first) || first === 0) continue;
    for (const item of history) {
      const close = item.adjustedClose ?? item.close;
      if (!item.date || !Number.isFinite(close)) continue;
      const current = byDate.get(item.date) || { total: 0, count: 0 };
      current.total += (close / first) * 100;
      current.count += 1;
      byDate.set(item.date, current);
    }
  }
  return [...byDate.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([date, value]) => ({ date, close: value.total / value.count }));
}
async function fetchIndexSymbols(index, fallback = [], minimum = 20) {
  try {
    const payload = { language: 'pt-br', pageNumber: 1, pageSize: 250, index };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    const response = await fetch(`${B3_INDEX_API}${encoded}`, { headers: { 'User-Agent': 'HealthyTrendTrader/1.0' } });
    if (!response.ok) throw new Error(`B3 HTTP ${response.status}`);
    const body = await response.json();
    const symbols = [...new Set((body.results || []).map((item) => item.cod).filter(Boolean))];
    if (symbols.length >= minimum) return symbols;
    throw new Error(`Composição ${index} não trouxe símbolos suficientes`);
  } catch (error) {
    console.warn(`[market-data] Usando lista de contingência: ${error.message}`);
    return fallback;
  }
}
async function mapWithConcurrency(items, limit, mapper) {
  const results = []; let cursor = 0, fatal;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length && !fatal) {
      const index = cursor++; const item = items[index];
      try { results[index] = await mapper(item); } catch (error) {
        if (error.status === 429 || error.status === 401 || error.status === 403 || /MONTHLY_LIMIT|LOCAL_.*BUDGET|BACKOFF/.test(error.providerCode || '')) fatal = error;
        else results[index] = { symbol: item, error: error.message };
      }
    }
  }));
  if (fatal) throw fatal;
  return results;
}
function catalogItems(catalog, assetClass) {
  return catalog.map(([symbol, name, sector, originalSymbol, internationalBenchmark]) => ({
    symbol, name, sector, assetClass, originalSymbol, internationalBenchmark
  }));
}
function bdrCatalogFromMetadata(metadata) {
  return [...metadata.entries()]
    .filter(([symbol, item]) => BDR_SYMBOLS.includes(symbol) && item.type === 'bdr' && item.subType === 'bdr')
    .map(([symbol, item]) => ({
      symbol, name: item.name || symbol, sector: item.sector || 'Não classificado', assetClass: 'bdr',
      originalSymbol: BDR_ORIGINALS[symbol]?.[0] || null,
      internationalBenchmark: BDR_ORIGINALS[symbol]?.[1] || null
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
}
async function collectClassRelativeStrength({ assetClass, benchmarkSymbol, catalog }) {
  const benchmarkHistory = await fetchHistory(benchmarkSymbol);
  const benchmarkReturns = returns(benchmarkHistory);
  const histories = await fetchHistories(catalog.map((item) => item.symbol));
  const collected = catalog.map((item) => {
    const history = histories.get(item.symbol);
    if (!history) return { ...item, error: `Histórico indisponível para ${item.symbol}` };
    const assetReturns = returns(history);
    if (!Number.isFinite(assetReturns.m1) || !Number.isFinite(assetReturns.m3)) return { ...item, error: `Histórico incompleto para ${item.symbol}` };
    return {
      ...item,
      ...assetReturns,
      scan: scanMetrics(history),
      relativeTrend: relativeTrend(history, benchmarkHistory),
      relativeScore: (assetReturns.m1 - benchmarkReturns.m1) * .35 + (assetReturns.m3 - benchmarkReturns.m3) * .65
    };
  });
  const rows = rank(collected.filter((item) => !item.error)).map((item) => ({ ...item, trendTemplate: templateReading(item.score, item.relativeTrend) }));
  return { ...classMeta(assetClass), benchmark: benchmarkSymbol, returns: benchmarkReturns, requested: catalog.length, available: rows.length, items: rows };
}
async function collectPeerRelativeStrength({ assetClass, catalog }) {
  const histories = await fetchHistories(catalog.map((item) => item.symbol));
  const benchmarkHistory = peerBenchmarkHistory(histories);
  const benchmarkReturns = returns(benchmarkHistory);
  const collected = catalog.map((item) => {
    const history = histories.get(item.symbol);
    if (!history) return { ...item, error: `Histórico indisponível para ${item.symbol}` };
    const assetReturns = returns(history);
    if (!Number.isFinite(assetReturns.m1) || !Number.isFinite(assetReturns.m3)) return { ...item, error: `Histórico incompleto para ${item.symbol}` };
    return { ...item, ...assetReturns, scan: scanMetrics(history), relativeTrend: relativeTrend(history, benchmarkHistory), relativeScore: (assetReturns.m1 - benchmarkReturns.m1) * .35 + (assetReturns.m3 - benchmarkReturns.m3) * .65 };
  });
  const rows = rank(collected.filter((item) => !item.error)).map((item) => ({ ...item, trendTemplate: templateReading(item.score, item.relativeTrend) }));
  return { ...classMeta(assetClass), benchmark: 'Universo de BDRs', returns: benchmarkReturns, requested: catalog.length, available: rows.length, items: rows, catalogVersion: BDR_CATALOG_VERSION };
}
function classStrengthFromCache(cache) {
  const legacyStock = { ...classMeta('stock'), requested: cache.universe?.requested || 0, available: cache.relativeStrength?.length || 0, unavailable: cache.universe?.unavailable || [], items: (cache.relativeStrength || []).map((item) => ({ ...item, assetClass: item.assetClass || 'stock' })) };
  const fallbackStock = { ...legacyStock, ...classMeta('stock_ibov'), items: legacyStock.items.map(item => ({ ...item, assetClass: 'stock_ibov' })) };
  const stockIbov = cache.relativeStrengthByClass?.stock_ibov || fallbackStock;
  const stockOther = cache.relativeStrengthByClass?.stock_other || { ...classMeta('stock_other'), requested: 0, available: 0, items: [], pending: true };
  const pending = (assetClass) => ({ ...classMeta(assetClass), requested: 0, available: 0, items: [], pending: true });
  return { stock: legacyStock, stock_ibov: stockIbov, stock_other: stockOther, fii: cache.relativeStrengthByClass?.fii || pending('fii'), bdr: cache.relativeStrengthByClass?.bdr || pending('bdr') };
}
function classifyAsset(symbol, cache) {
  const normalized = String(symbol || '').trim().toUpperCase();
  const baseClass = assetClassForSymbol(normalized);
  const classes = classStrengthFromCache(cache || {});
  const assetClass = baseClass === 'stock' ? (classes.stock_ibov.items.some(item => item.symbol === normalized) ? 'stock_ibov' : 'stock_other') : baseClass;
  const universe = classes[assetClass];
  const item = universe?.items?.find((candidate) => candidate.symbol === normalized) || null;
  return { ticker: normalized, assetClass, ...classMeta(assetClass), item, available: Boolean(item) };
}

function scoreStockGroup(entries, benchmarkHistory, benchmark) {
  const benchmarkReturns = returns(benchmarkHistory);
  return rank(entries.map(({ history, ...item }) => ({ ...item, benchmark, relativeTrend: relativeTrend(history, benchmarkHistory), relativeScore: (item.m1 - benchmarkReturns.m1) * .35 + (item.m3 - benchmarkReturns.m3) * .65 })))
    .map((item) => ({ ...item, trendTemplate: templateReading(item.score, item.relativeTrend), assetClass: benchmark === 'IBOV' ? 'stock_ibov' : 'stock_other' }));
}
async function readCache() { try { return JSON.parse(await fs.readFile(CACHE_PATH, 'utf8')); } catch { return null; } }
async function writeCache(data) { await writeJson(CACHE_PATH, data); }
function isBusinessDay(date = new Date()) { const day = saoPauloParts(date).weekday; return day !== 'Sun' && day !== 'Sat'; }
async function collectMarketData() {
  const previous = await readCache();
  const [indexSymbols, smallCapSymbols] = await Promise.all([fetchIndexSymbols('IBOV', FALLBACK_SYMBOLS, 40), fetchIndexSymbols('SMLL', [], 20)]);
  const ibovHistory = await fetchHistory('^BVSP');
  const smllHistory = await fetchHistory('SMLL');
  const benchmarkReturns = returns(ibovHistory);
  const metadata = await fetchAssetMetadata();
  const symbols = stockUniverse(metadata, indexSymbols);
  const histories = await fetchHistories(symbols);
  const collected = symbols.map((symbol) => {
    const history = histories.get(symbol);
    if (!history) return { symbol, error: `Histórico indisponível para ${symbol}` };
    const assetReturns = returns(history);
    if (!Number.isFinite(assetReturns.m1) || !Number.isFinite(assetReturns.m3)) return { symbol, error: `Histórico incompleto para ${symbol}` };
    const details = metadata.get(symbol) || { name: symbol, sector: 'Não classificado' };
    return { symbol, ...details, ...assetReturns, scan: scanMetrics(history), history };
  });
  const availableEntries = collected.filter((item) => !item.error);
  const groups = splitStockUniverse(symbols, indexSymbols, smallCapSymbols);
  const select = (members) => { const set = new Set(members); return availableEntries.filter(item => set.has(item.symbol)); };
  const ibovRows = scoreStockGroup(select(groups.ibov), ibovHistory, 'IBOV');
  const smallRows = scoreStockGroup(select(groups.small), smllHistory, 'SMLL');
  const otherEntries = select(groups.other);
  const otherBenchmarkHistory = peerBenchmarkHistory(new Map(otherEntries.map(item => [item.symbol, item.history])));
  const residualRows = otherEntries.length && Number.isFinite(returns(otherBenchmarkHistory).m3) ? scoreStockGroup(otherEntries, otherBenchmarkHistory, 'B3 fora de IBOV/SMLL') : [];
  const clean = item => { const { history, ...value } = item; return value; };
  const rows = [...ibovRows, ...smallRows, ...residualRows].map(clean);
  if (!rows.length || (previous?.relativeStrength?.length && rows.length < previous.relativeStrength.length * .8)) throw new Error('Atualização incompleta: cache anterior preservado.');
  const catalogFii = catalogItems(FII_CATALOG, 'fii');
  const catalogBdr = bdrCatalogFromMetadata(metadata);
  const [fiiResult, bdrResult] = await Promise.allSettled([
    collectClassRelativeStrength({ assetClass: 'fii', benchmarkSymbol: 'IFIX', catalog: catalogFii }),
    // O ranking brasileiro do BDR é comparado apenas com BDRs. A leitura do ativo original
    // é apresentada separadamente pela interface, para não misturar USD/BRL ao score local.
    collectPeerRelativeStrength({ assetClass: 'bdr', catalog: catalogBdr })
  ]);
  for (const result of [fiiResult, bdrResult]) {
    if (result.status === 'rejected' && (result.reason?.status === 429 || result.reason?.retryAt)) throw result.reason;
  }
  const relativeStrengthByClass = {
    stock_ibov: { ...classMeta('stock_ibov'), returns: benchmarkReturns, requested: groups.ibov.length, available: ibovRows.length, items: ibovRows.map(clean) },
    stock_other: { ...classMeta('stock_other'), requested: groups.small.length + groups.other.length, available: smallRows.length + residualRows.length, items: [...smallRows, ...residualRows].map(clean) },
    fii: fiiResult.status === 'fulfilled' && fiiResult.value.available > 0 ? fiiResult.value : { ...(previous?.relativeStrengthByClass?.fii || { ...classMeta('fii'), requested: catalogFii.length, available: 0, items: [] }), error: fiiResult.reason?.message || 'Sem dados novos', dataUpdatedAt: previous?.historyUpdatedAt || previous?.updatedAt },
    bdr: bdrResult.status === 'fulfilled' && bdrResult.value.available > 0 ? bdrResult.value : { ...(previous?.relativeStrengthByClass?.bdr || { ...classMeta('bdr'), requested: catalogBdr.length, available: 0, items: [] }), error: bdrResult.reason?.message || 'Sem dados novos', dataUpdatedAt: previous?.historyUpdatedAt || previous?.updatedAt }
  };
  const cache = { updatedAt: new Date().toISOString(), source: 'brapi', universe: { scope: 'b3-stocks-and-units', requested: symbols.length, available: rows.length, unavailable: collected.filter(item => item.error).map(item => ({ symbol: item.symbol, reason: item.error })) }, cycle: scoreCycle(ibovHistory), benchmark: { symbol: 'IBOV', returns: benchmarkReturns }, relativeStrength: rows, relativeStrengthByClass, overview: overviewFrom(rows, ibovHistory) };
  cache.historyUpdatedAt = cache.updatedAt;
  await writeCache(cache);
  return cache;
}
async function collectClassStrength(cache) {
  if (!cache) return cache;
  if (cache?.relativeStrengthByClass?.fii?.requested === FII_CATALOG.length && cache?.relativeStrengthByClass?.fii?.available > 0 && cache?.relativeStrengthByClass?.bdr?.catalogVersion === BDR_CATALOG_VERSION && cache?.relativeStrengthByClass?.bdr?.available > 0) return cache;
  const catalogFii = catalogItems(FII_CATALOG, 'fii');
  const catalogBdr = bdrCatalogFromMetadata(await fetchAssetMetadata());
  const [fiiResult, bdrResult] = await Promise.allSettled([
    collectClassRelativeStrength({ assetClass: 'fii', benchmarkSymbol: 'IFIX', catalog: catalogFii }),
    collectPeerRelativeStrength({ assetClass: 'bdr', catalog: catalogBdr })
  ]);
  const next = {
    ...cache,
    relativeStrengthByClass: {
      ...cache.relativeStrengthByClass,
      fii: fiiResult.status === 'fulfilled' && fiiResult.value.available > 0 ? fiiResult.value : cache.relativeStrengthByClass?.fii,
      bdr: bdrResult.status === 'fulfilled' && bdrResult.value.available > 0 ? bdrResult.value : cache.relativeStrengthByClass?.bdr
    }
  };
  await writeCache(next);
  return next;
}
function isMarketOpen(date = new Date()) {
  if (!isBusinessDay(date)) return false;
  const hour = Number(saoPauloParts(date).hour);
  return hour >= 10 && hour < 18;
}
function isFresh(timestamp, now, minutes) {
  const value = new Date(timestamp || 0).getTime();
  return Number.isFinite(value) && now.getTime() - value < minutes * 60 * 1000;
}
function mergeLiveQuote(item, quote) {
  if (!quote) return item;
  const price = Number(quote.regularMarketPrice);
  const change = Number(quote.regularMarketChangePercent);
  const volume = Number(quote.regularMarketVolume);
  const scan = { ...(item.scan || {}) };
  if (Number.isFinite(price) && price > 0) scan.price = price;
  if (Number.isFinite(change)) scan.dayChangePct = change;
  if (Number.isFinite(volume) && volume > 0) {
    scan.volume = volume;
    if (Number.isFinite(Number(scan.averageVolume20)) && Number(scan.averageVolume20) > 0) scan.volumeRatio = volume / Number(scan.averageVolume20);
  }
  scan.healthyTrend = Number.isFinite(Number(scan.price)) && Number.isFinite(Number(scan.ema20)) && Number.isFinite(Number(scan.ema200))
    && Number(scan.price) > Number(scan.ema20) && Number(scan.ema20) > Number(scan.ema200);
  return { ...item, scan };
}
async function collectLiveScanQuotes(cache, now = new Date()) {
  if (!cache || !isMarketOpen(now) || isFresh(cache.liveUpdatedAt, now, LIVE_QUOTE_MINUTES)) return cache;
  const stock = cache.relativeStrength || [];
  const fii = cache.relativeStrengthByClass?.fii?.items || [];
  const bdr = cache.relativeStrengthByClass?.bdr?.items || [];
  const quotes = await fetchQuotes([...stock, ...fii, ...bdr].map((item) => item.symbol));
  if (!quotes.size) return cache;
  const next = {
    ...cache,
    liveUpdatedAt: now.toISOString(),
    relativeStrength: stock.map((item) => mergeLiveQuote(item, quotes.get(item.symbol))),
    relativeStrengthByClass: {
      ...cache.relativeStrengthByClass,
      fii: { ...cache.relativeStrengthByClass?.fii, items: fii.map((item) => mergeLiveQuote(item, quotes.get(item.symbol))) },
      bdr: { ...cache.relativeStrengthByClass?.bdr, items: bdr.map((item) => mergeLiveQuote(item, quotes.get(item.symbol))) }
    }
  };
  await writeCache(next);
  return next;
}
async function refreshIfDue(now = new Date()) {
  const cached = await readCache();
  const afterClose = Number(saoPauloParts(now).hour) >= 19;
  const historicalDate = cached?.historyUpdatedAt || (!cached?.liveUpdatedAt ? cached?.updatedAt : null);
  if (historicalDate && isoDate(new Date(historicalDate)) === isoDate(now)) return cached;
  if (!isBusinessDay(now) || !afterClose) return cached;
  return refreshMarketData();
}

function refreshMarketData() { return refreshControl.run('daily', collectMarketData); }
function refreshClassStrength(cache) {
  if (!cache || (cache.relativeStrengthByClass?.fii?.requested === FII_CATALOG.length && cache.relativeStrengthByClass?.fii?.available > 0 && cache.relativeStrengthByClass?.bdr?.catalogVersion === BDR_CATALOG_VERSION && cache.relativeStrengthByClass?.bdr?.available > 0)) return Promise.resolve(cache);
  return refreshControl.run('classes', async () => collectClassStrength(await readCache() || cache), { minInterval: 24 * 3600000 });
}
function refreshLiveScanQuotes(cache, now = new Date()) {
  if (!cache || !isMarketOpen(now) || isFresh(cache.liveUpdatedAt, now, LIVE_QUOTE_MINUTES)) return Promise.resolve(cache);
  return refreshControl.run('live', async () => collectLiveScanQuotes(await readCache() || cache, now), { minInterval: LIVE_QUOTE_MINUTES * 60000 });
}
async function marketDataStatus() {
  const state = await brapi.status();
  return { blockedUntil: state.blockedUntil > Date.now() ? new Date(state.blockedUntil).toISOString() : null, reason: state.code, requestsToday: state.usage?.[new Date().toISOString().slice(0, 10)] || 0, trackedRequests: Object.values(state.usage || {}).reduce((a,b)=>a+b,0), liveQuoteIntervalMinutes: LIVE_QUOTE_MINUTES };
}

module.exports = { fetchHistory, fetchHistories, readCache, refreshMarketData, refreshIfDue, refreshClassStrength, refreshLiveScanQuotes, marketDataStatus, scoreCycle, returns, relativeTrend, templateReading, scanMetrics, rank, overviewFrom, assetClassForSymbol, classMeta, classStrengthFromCache, classifyAsset, historyRangeFor, mergeLiveQuote };

const fs = require('node:fs/promises');
const path = require('node:path');

const BRAPI_URL = 'https://brapi.dev/api/v2/stocks/historical';
const BRAPI_LIST_URL = 'https://brapi.dev/api/quote/list';
const B3_INDEX_API = 'https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/';
const CACHE_PATH = path.join(__dirname, '..', 'data', 'market-cache.json');
const FALLBACK_SYMBOLS = (process.env.IBOV_SYMBOLS || 'PETR4,VALE3,ITUB4,BBAS3,BBDC4,WEGE3,PRIO3,SUZB3')
  .split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);

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
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}
function brapiHeaders() { return process.env.BRAPI_TOKEN ? { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` } : {}; }
async function fetchHistory(symbol) {
  const url = new URL(BRAPI_URL);
  url.searchParams.set('symbols', symbol);
  url.searchParams.set('range', '3mo');
  url.searchParams.set('interval', '1d');
  url.searchParams.set('sortOrder', 'asc');
  const payload = await fetchJson(url, brapiHeaders());
  const result = payload.results?.[0]?.data?.historicalDataPrice || payload.results?.[0]?.historicalDataPrice || [];
  if (!result.length) throw new Error(`Sem histórico para ${symbol}`);
  return result;
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
  return { breadth, leaders: rows.filter((row) => row.trendTemplate === 'leader' || row.trendTemplate === 'qualified').slice(0, 6), sectors: sectors.slice(0, 6), benchmarkHistory: history };
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
  const change13w = percent(latest, line[0]);
  const direction = (change) => !Number.isFinite(change) ? 'unavailable' : change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat';
  return { change6w, change13w, direction6w: direction(change6w), direction13w: direction(change13w) };
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
  const catalog = [firstPage, ...remaining].flatMap((page) => page.stocks || []);
  return new Map(catalog.map((asset) => [asset.stock, {
    name: asset.name || asset.stock,
    sector: asset.sector || asset.subsector || 'Não classificado',
  }]));
}
async function fetchIbovSymbols() {
  try {
    const payload = { language: 'pt-br', pageNumber: 1, pageSize: 120, index: 'IBOV' };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    const response = await fetch(`${B3_INDEX_API}${encoded}`, { headers: { 'User-Agent': 'HealthyTrendTrader/1.0' } });
    if (!response.ok) throw new Error(`B3 HTTP ${response.status}`);
    const body = await response.json();
    const symbols = [...new Set((body.results || []).map((item) => item.cod).filter(Boolean))];
    if (symbols.length >= 40) return symbols;
    throw new Error('Composição da B3 não trouxe símbolos suficientes');
  } catch (error) {
    console.warn(`[market-data] Usando lista de contingência: ${error.message}`);
    return FALLBACK_SYMBOLS;
  }
}
async function mapWithConcurrency(items, limit, mapper) {
  const results = []; let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++; const item = items[index];
      try { results[index] = await mapper(item); } catch (error) { results[index] = { symbol: item, error: error.message }; }
    }
  }));
  return results;
}
async function readCache() { try { return JSON.parse(await fs.readFile(CACHE_PATH, 'utf8')); } catch { return null; } }
async function writeCache(data) { await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true }); await fs.writeFile(CACHE_PATH, JSON.stringify(data, null, 2)); }
function isBusinessDay(date = new Date()) { const day = saoPauloParts(date).weekday; return day !== 'Sun' && day !== 'Sat'; }
async function refreshMarketData() {
  const symbols = await fetchIbovSymbols();
  const ibovHistory = await fetchHistory('^BVSP');
  const benchmarkReturns = returns(ibovHistory);
  const metadata = await fetchAssetMetadata();
  const collected = await mapWithConcurrency(symbols, 3, async (symbol) => {
    const history = await fetchHistory(symbol);
    const assetReturns = returns(history);
    if (!Number.isFinite(assetReturns.m1) || !Number.isFinite(assetReturns.m3)) throw new Error(`Histórico incompleto para ${symbol}`);
    const details = metadata.get(symbol) || { name: symbol, sector: 'Não classificado' };
    return { symbol, ...details, ...assetReturns, relativeTrend: relativeTrend(history, ibovHistory), relativeScore: (assetReturns.m1 - benchmarkReturns.m1) * .35 + (assetReturns.m3 - benchmarkReturns.m3) * .65 };
  });
  const rows = rank(collected.filter((item) => !item.error)).map((item) => ({ ...item, trendTemplate: templateReading(item.score, item.relativeTrend) }));
  const cache = { updatedAt: new Date().toISOString(), source: 'brapi', universe: { requested: symbols.length, available: rows.length }, cycle: scoreCycle(ibovHistory), benchmark: { symbol: 'IBOV', returns: benchmarkReturns }, relativeStrength: rows, overview: overviewFrom(rows, ibovHistory) };
  await writeCache(cache);
  return cache;
}
async function refreshIfDue(now = new Date()) {
  const cached = await readCache();
  const afterClose = Number(saoPauloParts(now).hour) >= 19;
  if (cached && cached.updatedAt?.slice(0, 10) === isoDate(now)) return cached;
  if (!isBusinessDay(now) || !afterClose) return cached;
  return refreshMarketData();
}

module.exports = { readCache, refreshMarketData, refreshIfDue, scoreCycle, returns, relativeTrend, templateReading, rank, overviewFrom };

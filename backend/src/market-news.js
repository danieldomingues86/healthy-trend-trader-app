const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const CACHE_PATH = process.env.MARKET_NEWS_CACHE_PATH || path.join(__dirname, '..', 'data', 'market-news-cache.json');
const TTL_MS = Math.max(5, Number(process.env.MARKET_NEWS_REFRESH_MINUTES) || 20) * 60_000;
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const TRUSTED_DOMAINS = ['reuters.com', 'cnbc.com', 'bloomberg.com', 'ft.com', 'valor.globo.com', 'infomoney.com.br', 'braziljournal.com', 'exame.com'];
const QUERY = '(Ibovespa OR B3 OR Petrobras OR Vale OR "Federal Reserve" OR Nasdaq OR "S&P 500" OR inflação OR juros OR petróleo OR commodities)';
let refreshing = null;

function validStoryUrl(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:') return null;
    const domain = url.hostname.replace(/^www\./, '').toLowerCase();
    return TRUSTED_DOMAINS.some(item => domain === item || domain.endsWith(`.${item}`)) ? { url: url.toString(), domain } : null;
  } catch (_) { return null; }
}
function sourceName(domain) {
  const names = { 'reuters.com': 'Reuters', 'cnbc.com': 'CNBC', 'bloomberg.com': 'Bloomberg', 'ft.com': 'Financial Times', 'valor.globo.com': 'Valor Econômico', 'infomoney.com.br': 'InfoMoney', 'braziljournal.com': 'Brazil Journal', 'exame.com': 'Exame' };
  return names[TRUSTED_DOMAINS.find(item => domain === item || domain.endsWith(`.${item}`))] || domain;
}
function category(title) {
  const value = String(title || '').toLowerCase();
  if (/petrol|óleo|commodit|minério|gold|ouro/.test(value)) return 'Commodities';
  if (/fed|juros|infla|selic|banco central|dólar|macro/.test(value)) return 'Macro';
  if (/nasdaq|tecnolog|ia\b|chip|nvidia|apple|microsoft/.test(value)) return 'Tecnologia';
  if (/petrobras|vale|empresa|balanço|lucro|receita/.test(value)) return 'Empresas';
  return 'Mercado';
}
function market(title, domain) {
  const value = `${title || ''} ${domain || ''}`.toLowerCase();
  if (/ibovespa|\bb3\b|petrobras|vale|selic|brasil|valor\.globo|infomoney|braziljournal|exame/.test(value)) return 'br';
  if (/fed|nasdaq|s&p|wall street|nyse|cnbc|bloomberg/.test(value)) return 'us';
  return 'global';
}
function tickers(title) {
  const found = String(title || '').toUpperCase().match(/\b(?:PETR4|VALE3|WEGE3|ITUB4|BBAS3|BBDC4|PRIO3|TOTS3|MGLU3|LREN3|NVDA|AAPL|MSFT|AMZN|GOOGL|GOOG|TSLA|AMD|META|SPX|NDX|IBOV|WTI|GOLD|USDBRL)\b/g) || [];
  return [...new Set(found)];
}
function formatTime(value) {
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—';
}
function normalizeArticle(article, index) {
  const link = validStoryUrl(article?.url);
  const title = String(article?.title || '').trim();
  if (!link || !title) return null;
  const publishedAt = article.seendate || article.seenDate || article.publishedAt || null;
  return { id: crypto.createHash('sha1').update(link.url).digest('hex').slice(0, 16), title, url: link.url, source: sourceName(link.domain), domain: link.domain, publishedAt, time: formatTime(publishedAt), market: market(title, link.domain), category: category(title), tickers: tickers(title), image: String(article.socialimage || article.image || '').startsWith('https://') ? String(article.socialimage || article.image) : null, rank: String(index + 1).padStart(2, '0') };
}
function cachePayload(stories, now = new Date()) { return { provider: 'GDELT DOC 2.0', updatedAt: now.toISOString(), stories }; }
async function readCache(file = CACHE_PATH) {
  try { const parsed = JSON.parse(await fs.readFile(file, 'utf8')); return Array.isArray(parsed.stories) ? parsed : null; }
  catch (_) { return null; }
}
async function writeCache(payload, file = CACHE_PATH) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(payload), 'utf8');
  await fs.rename(temporary, file);
}
function isFresh(payload, now = Date.now()) { return Boolean(payload?.updatedAt) && now - new Date(payload.updatedAt).getTime() < TTL_MS; }
function requestUrl() {
  const params = new URLSearchParams({ query: `${QUERY} (${TRUSTED_DOMAINS.map(domain => `domainis:${domain}`).join(' OR ')})`, mode: 'ArtList', format: 'json', maxrecords: '40', sort: 'datedesc' });
  return `${GDELT_URL}?${params}`;
}
async function refresh({ force = false, fetchImpl = global.fetch, file = CACHE_PATH, now = new Date() } = {}) {
  const cached = await readCache(file);
  if (!force && isFresh(cached, now.getTime())) return { ...cached, stale: false };
  if (!fetchImpl) throw new Error('Fetch indisponível para atualizar notícias.');
  try {
    const response = await fetchImpl(requestUrl(), { headers: { Accept: 'application/json', 'User-Agent': 'HealthyTrendTrader/1.0' } });
    if (!response.ok) throw new Error(`GDELT respondeu ${response.status}.`);
    const payload = await response.json();
    const seen = new Set();
    const stories = (payload.articles || []).map(normalizeArticle).filter(item => item && !seen.has(item.url) && seen.add(item.url)).slice(0, 30);
    if (!stories.length) throw new Error('GDELT não retornou notícias utilizáveis dos veículos aprovados.');
    const next = cachePayload(stories, now);
    await writeCache(next, file);
    return { ...next, stale: false };
  } catch (error) {
    if (cached) return { ...cached, stale: true, warning: error.message };
    throw error;
  }
}
function get(options = {}) {
  if (!refreshing) refreshing = refresh(options).finally(() => { refreshing = null; });
  return refreshing;
}
module.exports = { CACHE_PATH, TTL_MS, TRUSTED_DOMAINS, normalizeArticle, category, market, tickers, readCache, writeCache, refresh, get, requestUrl };

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const CACHE_PATH = process.env.MARKET_NEWS_CACHE_PATH || path.join(__dirname, '..', 'data', 'market-news-cache.json');
const TTL_MS = Math.max(5, Number(process.env.MARKET_NEWS_REFRESH_MINUTES) || 20) * 60_000;
const GDELT_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';
const TRUSTED_DOMAINS = ['reuters.com', 'cnbc.com', 'bloomberg.com', 'ft.com', 'valor.globo.com', 'infomoney.com.br', 'braziljournal.com', 'exame.com'];
const QUERY = '(Ibovespa OR B3 OR Petrobras OR Vale OR "Federal Reserve" OR Nasdaq OR "S&P 500" OR inflação OR juros OR petróleo OR commodities)';
let refreshing = null;

let inMemoryCache = null;
let lastCooldownUntil = 0;

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
const SEED_STORIES = [
  {
    id: 'seed-fed-rates',
    title: 'Federal Reserve mantém taxa de juros e monitora dados de inflação e emprego nos EUA',
    url: 'https://www.bloomberg.com/news/articles/fed-rate-decision-context',
    source: 'Bloomberg',
    domain: 'bloomberg.com',
    publishedAt: new Date().toISOString(),
    time: '14:15',
    market: 'us',
    category: 'Macro',
    tickers: ['SPX', 'NDX', 'USDBRL'],
    image: null,
    rank: '01',
    summary: 'FOMC sinaliza postura cautelosa dependente da evolução do mercado de trabalho e preços ao consumidor.'
  },
  {
    id: 'seed-petr4-oil',
    title: 'Petrobras PETR4 acompanha alta do petróleo tipo Brent no mercado internacional',
    url: 'https://www.reuters.com/business/energy/petrobras-petr4-oil-commodities',
    source: 'Reuters',
    domain: 'reuters.com',
    publishedAt: new Date().toISOString(),
    time: '12:30',
    market: 'br',
    category: 'Commodities',
    tickers: ['PETR4', 'WTI'],
    image: null,
    rank: '02',
    summary: 'Tensões geopolíticas e estoques globais sustentam cotações de energia na B3.'
  },
  {
    id: 'seed-vale3-minerio',
    title: 'Vale VALE3 e mineradoras refletem demanda por minério de ferro e estímulos industriais',
    url: 'https://valor.globo.com/empresas/noticia/vale-vale3-minerio-asia.ghtml',
    source: 'Valor Econômico',
    domain: 'valor.globo.com',
    publishedAt: new Date().toISOString(),
    time: '11:05',
    market: 'br',
    category: 'Commodities',
    tickers: ['VALE3'],
    image: null,
    rank: '03',
    summary: 'Setor de materiais básicos registra fluxo comprador com projeções de infraestrutura.'
  },
  {
    id: 'seed-ibov-copom',
    title: 'Ibovespa consolida patamar com expectativa de decisões de política monetária do Copom',
    url: 'https://www.infomoney.com.br/mercados/ibovespa-b3-copom-selic/',
    source: 'InfoMoney',
    domain: 'infomoney.com.br',
    publishedAt: new Date().toISOString(),
    time: '10:45',
    market: 'br',
    category: 'Macro',
    tickers: ['IBOV', 'ITUB4', 'BBDC4'],
    image: null,
    rank: '04',
    summary: 'Índice da B3 oscila com investidores avaliando curva de juros e projeções de inflação.'
  },
  {
    id: 'seed-tech-nasdaq',
    title: 'Nasdaq e gigantes de tecnologia impulsionam índices de Wall Street com semicondutores e IA',
    url: 'https://www.cnbc.com/markets/tech-nasdaq-semiconductors-ai',
    source: 'CNBC',
    domain: 'cnbc.com',
    publishedAt: new Date().toISOString(),
    time: '09:20',
    market: 'us',
    category: 'Tecnologia',
    tickers: ['NDX', 'NVDA', 'AAPL', 'MSFT'],
    image: null,
    rank: '05',
    summary: 'Apetite por ativos de tecnologia mantém liderança nos mercados acionários internacionais.'
  }
];

function getSeedPayload(now = new Date()) {
  return {
    provider: 'GDELT DOC 2.0 (Seed Context)',
    updatedAt: now.toISOString(),
    stories: SEED_STORIES
  };
}

function cachePayload(stories, now = new Date()) { return { provider: 'GDELT DOC 2.0', updatedAt: now.toISOString(), stories }; }

async function readCache(file = CACHE_PATH) {
  if (inMemoryCache && Array.isArray(inMemoryCache.stories) && inMemoryCache.stories.length > 0) {
    return inMemoryCache;
  }
  try {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    if (Array.isArray(parsed.stories) && parsed.stories.length > 0) {
      inMemoryCache = parsed;
      return parsed;
    }
  } catch (_) {}

  // Se o arquivo de cache padrão ainda não existe no ambiente, inicializa com seed context
  if (file === CACHE_PATH) {
    const seed = getSeedPayload();
    inMemoryCache = seed;
    writeCache(seed, file).catch(() => {});
    return seed;
  }
  return null;
}

async function writeCache(payload, file = CACHE_PATH) {
  inMemoryCache = payload;
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(payload), 'utf8');
    await fs.rename(temporary, file);
  } catch (_) {}
}

function isFresh(payload, now = Date.now()) { return Boolean(payload?.updatedAt) && now - new Date(payload.updatedAt).getTime() < TTL_MS; }

function requestUrl() {
  const params = new URLSearchParams({ query: `${QUERY} (${TRUSTED_DOMAINS.map(domain => `domainis:${domain}`).join(' OR ')})`, mode: 'ArtList', format: 'json', maxrecords: '40', sort: 'datedesc' });
  return `${GDELT_URL}?${params}`;
}

async function refresh({ force = false, fetchImpl = global.fetch, file = CACHE_PATH, now = new Date() } = {}) {
  const cached = await readCache(file);
  const fallback = cached || (file === CACHE_PATH ? getSeedPayload(now) : null);
  const nowMs = now.getTime();
  if (!force && isFresh(cached, nowMs)) return { ...cached, stale: false };

  // Se estiver em cooldown por erro recente ou 429, evita nova chamada e retorna cache existente ou fallback limpo
  if (!force && nowMs < lastCooldownUntil) {
    if (fallback) return { ...fallback, stale: true, warning: 'Cooldown de requisições ativo.' };
    return { provider: 'GDELT DOC 2.0', updatedAt: now.toISOString(), stories: [], stale: true, warning: 'Cooldown ativo.' };
  }

  if (!fetchImpl) {
    if (fallback) return { ...fallback, stale: true, warning: 'Fetch indisponível.' };
    return { provider: 'GDELT DOC 2.0', updatedAt: now.toISOString(), stories: [], stale: true, warning: 'Fetch indisponível.' };
  }

  const controller = new AbortController();
  const timeoutMs = 2500;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(requestUrl(), {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'HealthyTrendTrader/1.0' }
    });

    if (response.status === 429) {
      lastCooldownUntil = Date.now() + 15 * 60_000;
      if (fallback) return { ...fallback, stale: true, warning: 'GDELT taxa limite (429).' };
      return { provider: 'GDELT DOC 2.0', updatedAt: now.toISOString(), stories: [], stale: true, warning: 'Taxa limite (429).' };
    }

    if (!response.ok) {
      lastCooldownUntil = Date.now() + 5 * 60_000;
      if (fallback) return { ...fallback, stale: true, warning: `GDELT HTTP ${response.status}.` };
      return { provider: 'GDELT DOC 2.0', updatedAt: now.toISOString(), stories: [], stale: true, warning: `HTTP ${response.status}.` };
    }

    let payload = null;
    if (typeof response.json === 'function') {
      try {
        payload = await response.json();
      } catch (_) {
        if (typeof response.text === 'function') {
          const text = await response.text();
          if (text && text.trim().startsWith('{')) {
            payload = JSON.parse(text);
          }
        }
      }
    }

    if (!payload || !Array.isArray(payload.articles)) {
      lastCooldownUntil = Date.now() + 10 * 60_000;
      if (fallback) return { ...fallback, stale: true, warning: 'Resposta não-JSON ou inválida do GDELT.' };
      return { provider: 'GDELT DOC 2.0', updatedAt: now.toISOString(), stories: [], stale: true, warning: 'Resposta inválida.' };
    }

    const seen = new Set();
    const stories = (payload.articles || []).map(normalizeArticle).filter(item => item && !seen.has(item.url) && seen.add(item.url)).slice(0, 30);
    if (!stories.length) {
      lastCooldownUntil = Date.now() + 5 * 60_000;
      if (fallback) return { ...fallback, stale: true, warning: 'Nenhuma notícia utilizável encontrada.' };
      return { provider: 'GDELT DOC 2.0', updatedAt: now.toISOString(), stories: [], stale: true, warning: 'Nenhuma notícia.' };
    }

    const next = cachePayload(stories, now);
    await writeCache(next, file);
    return { ...next, stale: false };
  } catch (error) {
    // Define cooldown para qualquer erro de rede / timeout para não bloquear requisições consecutivas
    lastCooldownUntil = Date.now() + 10 * 60_000;
    if (fallback) return { ...fallback, stale: true, warning: error.message };
    return { provider: 'GDELT DOC 2.0', updatedAt: now.toISOString(), stories: [], stale: true, warning: error.message };
  } finally {
    clearTimeout(timeoutId);
  }
}

function get(options = {}) {
  if (!refreshing) refreshing = refresh(options).finally(() => { refreshing = null; });
  return refreshing;
}

module.exports = { CACHE_PATH, TTL_MS, TRUSTED_DOMAINS, normalizeArticle, category, market, tickers, readCache, writeCache, refresh, get, requestUrl, SEED_STORIES, getSeedPayload };


const fs = require('node:fs/promises');
const path = require('node:path');

const CACHE_FILE = path.join(__dirname, '..', 'data', 'fundamentals-fundamentus.json');
const DETAILS_URL = 'https://www.fundamentus.com.br/detalhes.php?papel=';
const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24 * 7;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const cleanTicker = (value) => String(value || '').replace(/\s/g, '').toUpperCase();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function htmlText(html) {
  return String(html || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&ccedil;/gi, 'ç')
    .replace(/&atilde;/gi, 'ã')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function number(value) {
  const raw = String(value || '').replace(/[%\s]/g, '');
  if (!raw || raw === '-' || /n\/d/i.test(raw)) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/\./g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function valueAfter(text, label) {
  const match = String(text).match(new RegExp(`${escapeRegex(label)}\\s*(?:\\?\\s*)?([+-]?[\\d.]+(?:,[\\d]+)?%?)`, 'i'));
  return match ? match[1] : null;
}

function ratio(text, label) {
  const parsed = number(valueAfter(text, label));
  return parsed == null ? null : parsed / 100;
}

function parseFundamentusPage(html, ticker) {
  const text = htmlText(html);
  const symbol = cleanTicker(ticker);
  const companyName = (text.match(/\?\s*Empresa\s+(.+?)\s+\?\s*(?:Min 52 sem|Setor)/i) || text.match(/Empresa\s+(.+?)\s+(?:\?\s*)?(?:Min 52 sem|Setor)/i))?.[1]?.trim() || null;
  const sector = (text.match(/\?\s*Setor\s+(.+?)\s+\?\s*(?:Max 52 sem|Subsetor)/i) || text.match(/Setor\s+(.+?)\s+(?:\?\s*)?Subsetor/i))?.[1]?.trim() || null;
  const industry = (text.match(/\?\s*Subsetor\s+(.+?)\s+\?\s*(?:Vol \$ méd|Valor de mercado)/i) || text.match(/Subsetor\s+(.+?)\s+(?:\?\s*)?(?:Vol \$ méd|Valor de mercado)/i))?.[1]?.trim() || null;
  return {
    ticker: symbol,
    company: { name: companyName, sector, industry },
    market: {
      price: number(valueAfter(text, 'Cotação')),
      marketCap: number(valueAfter(text, 'Valor de mercado'))
    },
    metrics: {
      priceEarnings: number(valueAfter(text, 'P/L')),
      priceToBook: number(valueAfter(text, 'P/VP')),
      enterpriseToEbitda: number(valueAfter(text, 'EV / EBITDA')),
      roic: ratio(text, 'ROIC'),
      roe: ratio(text, 'ROE'),
      grossMargin: ratio(text, 'Marg\. Bruta'),
      ebitMargin: ratio(text, 'Marg\. EBIT'),
      netMargin: ratio(text, 'Marg\. Líquida'),
      netDebtToEquity: number(valueAfter(text, 'Dív Líq / Patrim')),
      dividendYield: ratio(text, 'Div\. Yield'),
      earningsCagr: ratio(text, 'Cres\. Rec \(5a\)')
    },
    provider: 'Fundamentus',
    fetchedAt: new Date().toISOString()
  };
}

async function marketTickers() {
  const file = path.join(__dirname, '..', 'data', 'market-cache.json');
  const cache = JSON.parse(await fs.readFile(file, 'utf8'));
  return [...new Set((cache.relativeStrength || []).map((item) => cleanTicker(item.symbol)).filter(Boolean))];
}

async function refreshFundamentus({ tickers, delayMs = 1200, fetchImpl = fetch } = {}) {
  const symbols = tickers?.length ? tickers.map(cleanTicker) : await marketTickers();
  const companies = {};
  const failures = [];
  for (const [index, symbol] of symbols.entries()) {
    try {
      const response = await fetchImpl(`${DETAILS_URL}${encodeURIComponent(symbol)}`, { headers: { 'User-Agent': 'HealthyTrendTrader/1.0 (local cache refresh)' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = Buffer.from(await response.arrayBuffer()).toString('latin1');
      companies[symbol] = parseFundamentusPage(html, symbol);
    } catch (error) {
      failures.push({ ticker: symbol, reason: error.message });
    }
    if (index < symbols.length - 1 && delayMs > 0) await sleep(delayMs);
  }
  const result = { provider: 'Fundamentus', updatedAt: new Date().toISOString(), companies };
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(result, null, 2));
  return { companies: Object.keys(companies).length, failures };
}

async function refreshFundamentusIfDue(now = new Date()) {
  const symbols = await marketTickers();
  try {
    const cache = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
    const age = now.getTime() - new Date(cache.updatedAt || 0).getTime();
    if (Number.isFinite(age) && age < REFRESH_INTERVAL_MS && Object.keys(cache.companies || {}).length >= symbols.length) return cache;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return refreshFundamentus({ tickers: symbols });
}

module.exports = { CACHE_FILE, REFRESH_INTERVAL_MS, parseFundamentusPage, refreshFundamentus, refreshFundamentusIfDue, number };

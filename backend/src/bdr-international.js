'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * HEALTHY TREND TRADER — BDR INTERNATIONAL MAPPING & EARNINGS WATCH
 *
 * Mapeia BDRs negociadas na B3 para seus respectivos ativos subjacentes (underlying tickers)
 * nos mercados internacionais (NYSE / NASDAQ), gera links diretos para o StockCharts e
 * monitora divulgações de resultados (earnings) próximos de acontecer (janela de 0 a 10 dias corridos).
 */

const CACHE_FILE = path.join(__dirname, '..', 'data', 'bdr-earnings-cache.json');
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

// Mapeamento canônico das BDRs negociadas na B3 para seus tickers originais e exchanges internacionais
const BDR_MAP = {
  // Catálogo principal Healthy Trend Trader
  ROXO34: { symbol: 'NU', exchange: 'NYSE', name: 'Nu Holdings (Nubank)' },
  MELI34: { symbol: 'MELI', exchange: 'NASDAQ', name: 'MercadoLibre' },
  M1TA34: { symbol: 'META', exchange: 'NASDAQ', name: 'Meta Platforms' },
  NVDC34: { symbol: 'NVDA', exchange: 'NASDAQ', name: 'NVIDIA Corporation' },
  TSLA34: { symbol: 'TSLA', exchange: 'NASDAQ', name: 'Tesla' },
  ITLC34: { symbol: 'INTC', exchange: 'NASDAQ', name: 'Intel Corporation' },
  AMZO34: { symbol: 'AMZN', exchange: 'NASDAQ', name: 'Amazon.com' },
  AMZO35: { symbol: 'AMZN', exchange: 'NASDAQ', name: 'Amazon.com' },
  GOGL34: { symbol: 'GOOGL', exchange: 'NASDAQ', name: 'Alphabet Class A' },
  GOGL35: { symbol: 'GOOGL', exchange: 'NASDAQ', name: 'Alphabet Class A' },
  MSFT34: { symbol: 'MSFT', exchange: 'NASDAQ', name: 'Microsoft Corporation' },
  MSFT35: { symbol: 'MSFT', exchange: 'NASDAQ', name: 'Microsoft Corporation' },
  M2ST34: { symbol: 'MSTR', exchange: 'NASDAQ', name: 'MicroStrategy' },
  SPCX34: { symbol: 'DXYZ', exchange: 'NYSE', name: 'Destiny Tech100' },
  TSMC34: { symbol: 'TSM', exchange: 'NYSE', name: 'Taiwan Semiconductor' },
  P2LT34: { symbol: 'PLTR', exchange: 'NASDAQ', name: 'Palantir Technologies' },
  ORCL34: { symbol: 'ORCL', exchange: 'NYSE', name: 'Oracle Corporation' },
  MUTC34: { symbol: 'MU', exchange: 'NASDAQ', name: 'Micron Technology' },
  AAPL34: { symbol: 'AAPL', exchange: 'NASDAQ', name: 'Apple Inc.' },
  AAPL35: { symbol: 'AAPL', exchange: 'NASDAQ', name: 'Apple Inc.' },
  NFLX34: { symbol: 'NFLX', exchange: 'NASDAQ', name: 'Netflix' },
  BABA34: { symbol: 'BABA', exchange: 'NYSE', name: 'Alibaba Group' },
  LILY34: { symbol: 'LLY', exchange: 'NYSE', name: 'Eli Lilly and Company' },
  A1MD34: { symbol: 'AMD', exchange: 'NASDAQ', name: 'Advanced Micro Devices' },
  JPMC34: { symbol: 'JPM', exchange: 'NYSE', name: 'JPMorgan Chase' },
  AVGO34: { symbol: 'AVGO', exchange: 'NASDAQ', name: 'Broadcom Inc.' },
  BOAC34: { symbol: 'BAC', exchange: 'NYSE', name: 'Bank of America' },
  C2OI34: { symbol: 'COIN', exchange: 'NASDAQ', name: 'Coinbase Global' },
  COCA34: { symbol: 'KO', exchange: 'NYSE', name: 'The Coca-Cola Company' },
  BERK34: { symbol: 'BRK.B', exchange: 'NYSE', name: 'Berkshire Hathaway' },
  BKNG34: { symbol: 'BKNG', exchange: 'NASDAQ', name: 'Booking Holdings' },
  S2GM34: { symbol: 'SGML', exchange: 'NASDAQ', name: 'Sigma Lithium' },
  NIKE34: { symbol: 'NKE', exchange: 'NYSE', name: 'NIKE, Inc.' },
  WALM34: { symbol: 'WMT', exchange: 'NYSE', name: 'Walmart Inc.' },
  JNJB34: { symbol: 'JNJ', exchange: 'NYSE', name: 'Johnson & Johnson' },
  DISB34: { symbol: 'DIS', exchange: 'NYSE', name: 'The Walt Disney Company' },
  PAGS34: { symbol: 'PAGS', exchange: 'NYSE', name: 'PagSeguro Digital' },
  CHVX34: { symbol: 'CVX', exchange: 'NYSE', name: 'Chevron Corporation' },

  // Mapeamentos adicionais frequentes de BDRs da B3
  VISA34: { symbol: 'V', exchange: 'NYSE', name: 'Visa Inc.' },
  EXXO34: { symbol: 'XOM', exchange: 'NYSE', name: 'Exxon Mobil' },
  MSBR34: { symbol: 'MS', exchange: 'NYSE', name: 'Morgan Stanley' },
  CSCO34: { symbol: 'CSCO', exchange: 'NASDAQ', name: 'Cisco Systems' },
  PEPB34: { symbol: 'PEP', exchange: 'NASDAQ', name: 'PepsiCo' },
  QCOM34: { symbol: 'QCOM', exchange: 'NASDAQ', name: 'QUALCOMM' },
  S2PO34: { symbol: 'SPOT', exchange: 'NYSE', name: 'Spotify Technology' },
  U1BE34: { symbol: 'UBER', exchange: 'NYSE', name: 'Uber Technologies' },
  ABTT34: { symbol: 'ABT', exchange: 'NYSE', name: 'Abbott Laboratories' },
  PYPL34: { symbol: 'PYPL', exchange: 'NASDAQ', name: 'PayPal Holdings' },
  ADBE34: { symbol: 'ADBE', exchange: 'NASDAQ', name: 'Adobe Inc.' },
  CRFB34: { symbol: 'CRM', exchange: 'NYSE', name: 'Salesforce Inc.' },
  COCA35: { symbol: 'KO', exchange: 'NYSE', name: 'The Coca-Cola Company' },
  ASML34: { symbol: 'ASML', exchange: 'NASDAQ', name: 'ASML Holding' },
  CRWD34: { symbol: 'CRWD', exchange: 'NASDAQ', name: 'CrowdStrike Holdings' },
  DELL34: { symbol: 'DELL', exchange: 'NYSE', name: 'Dell Technologies' },
  S2HO34: { symbol: 'SHOP', exchange: 'NYSE', name: 'Shopify Inc.' },
  B1DU34: { symbol: 'BIDU', exchange: 'NASDAQ', name: 'Baidu, Inc.' },
  SBUX34: { symbol: 'SBUX', exchange: 'NASDAQ', name: 'Starbucks Corporation' },
  MCDC34: { symbol: 'MCD', exchange: 'NYSE', name: "McDonald's Corporation" },
  FDXB34: { symbol: 'FDX', exchange: 'NYSE', name: 'FedEx Corporation' },
  CATP34: { symbol: 'CAT', exchange: 'NYSE', name: 'Caterpillar Inc.' },
  IBMB34: { symbol: 'IBM', exchange: 'NYSE', name: 'IBM' },
  GSGI34: { symbol: 'GS', exchange: 'NYSE', name: 'Goldman Sachs' },
  WFCB34: { symbol: 'WFC', exchange: 'NYSE', name: 'Wells Fargo' },
  CTGP34: { symbol: 'C', exchange: 'NYSE', name: 'Citigroup Inc.' },
  AXPB34: { symbol: 'AXP', exchange: 'NYSE', name: 'American Express' },
  PFIZ34: { symbol: 'PFE', exchange: 'NYSE', name: 'Pfizer Inc.' },
  MRCK34: { symbol: 'MRK', exchange: 'NYSE', name: 'Merck & Co.' },
  ABBV34: { symbol: 'ABBV', exchange: 'NYSE', name: 'AbbVie Inc.' },
  AMGN34: { symbol: 'AMGN', exchange: 'NASDAQ', name: 'Amgen Inc.' },
  GILD34: { symbol: 'GILD', exchange: 'NASDAQ', name: 'Gilead Sciences' },
  PGCO34: { symbol: 'PG', exchange: 'NYSE', name: 'Procter & Gamble' },
  HONB34: { symbol: 'HON', exchange: 'NASDAQ', name: 'Honeywell International' },
  BAOO34: { symbol: 'BA', exchange: 'NYSE', name: 'The Boeing Company' },
  UNP134: { symbol: 'UNP', exchange: 'NYSE', name: 'Union Pacific' },
  UPSW34: { symbol: 'UPS', exchange: 'NYSE', name: 'United Parcel Service' }
};

let memoryEarningsCache = new Map();

/**
 * Carrega o cache persistente de earnings se existir
 */
function loadDiskCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      const json = JSON.parse(raw);
      if (json && typeof json === 'object') {
        const now = Date.now();
        for (const [key, item] of Object.entries(json)) {
          if (item && item.timestamp && (now - item.timestamp < CACHE_TTL_MS)) {
            memoryEarningsCache.set(key, item);
          }
        }
      }
    }
  } catch (err) {
    // Falha silenciosa em cache de disco
  }
}

/**
 * Salva o cache de earnings em disco
 */
function saveDiskCache() {
  try {
    const obj = {};
    for (const [key, val] of memoryEarningsCache.entries()) {
      obj[key] = val;
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    // Falha silenciosa
  }
}

// Inicializa o cache
loadDiskCache();

/**
 * Identifica se um símbolo representa uma BDR negociada na B3.
 * Considera mapeamento canônico ou padrão de ticker (sufixo 31, 32, 33, 34, 35, 39).
 */
function isBdr(symbol) {
  if (!symbol) return false;
  const sym = String(symbol).trim().toUpperCase();
  if (BDR_MAP[sym]) return true;
  return /(31|32|33|34|35|39)$/.test(sym);
}

/**
 * Obtém os detalhes do ativo subjacente (underlying ticker) internacional correspondente à BDR.
 * Retorna null se não houver mapeamento confiável (fallback discreto conforme regra de aceite).
 */
function getUnderlyingDetails(symbol) {
  if (!symbol) return null;
  const sym = String(symbol).trim().toUpperCase();
  const entry = BDR_MAP[sym];
  if (!entry || !entry.symbol) return null;

  return {
    bdrSymbol: sym,
    underlyingSymbol: entry.symbol,
    exchange: entry.exchange || 'EUA',
    name: entry.name || sym
  };
}

/**
 * Gera a URL oficial e direta do StockCharts para o ativo subjacente.
 * Retorna null se não houver ticker subjacente válido.
 */
function getStockChartsUrl(underlyingSymbol) {
  if (!underlyingSymbol) return null;
  const clean = String(underlyingSymbol).trim().toUpperCase();
  if (!clean) return null;
  // URL direta para a plataforma moderna StockCharts ACP (Advanced Charting Platform)
  return `https://stockcharts.com/acp/?s=${encodeURIComponent(clean)}`;
}

/**
 * Realiza o parse da resposta da Nasdaq para identificar eventos de earnings.
 */
function parseNasdaqEarningsPayload(payload, referenceDateStr) {
  if (!payload) return null;
  const text = payload.reportText || '';
  if (!text || text.includes("hasn't provided us with the upcoming earnings report date")) {
    return null;
  }

  // 1. Extração da data de earnings
  let earningsDate = null;

  // Regex para formato MM/DD/YYYY no texto descritivo (ex: on 11/17/2026)
  const dateMatch = text.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (dateMatch) {
    const mm = dateMatch[1].padStart(2, '0');
    const dd = dateMatch[2].padStart(2, '0');
    const yyyy = dateMatch[3];
    earningsDate = `${yyyy}-${mm}-${dd}`;
  } else {
    // Fallback: tenta capturar do campo announcement (ex: Nov 17, 2026)
    const ann = payload.announcement || '';
    const annMatch = ann.match(/:\s*([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})/i);
    if (annMatch) {
      const monthMap = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const mStr = annMatch[1].toLowerCase();
      const mm = monthMap[mStr];
      const dd = annMatch[2].padStart(2, '0');
      const yyyy = annMatch[3];
      if (mm) earningsDate = `${yyyy}-${mm}-${dd}`;
    }
  }

  if (!earningsDate) return null;

  // 2. Classificação: data estimada vs confirmada
  const isEstimated = text.includes('expected*') ||
                      text.includes('expected') ||
                      Boolean(payload.announcement && payload.announcement.includes('*'));

  // 3. Momento da divulgação
  let timeOfDay = 'Horário a definir';
  if (/after market close/i.test(text)) {
    timeOfDay = 'Após o fechamento (After-Market)';
  } else if (/before market open/i.test(text)) {
    timeOfDay = 'Antes da abertura (Pre-Market)';
  } else if (/during market/i.test(text)) {
    timeOfDay = 'Durante o pregão';
  }

  // 4. Cálculo dos dias corridos em relação à data de referência
  const refDate = referenceDateStr ? String(referenceDateStr).slice(0, 10) : new Date().toISOString().slice(0, 10);
  const [refY, refM, refD] = refDate.split('-').map(Number);
  const [eY, eM, eD] = earningsDate.split('-').map(Number);

  const refUtc = Date.UTC(refY, refM - 1, refD);
  const earnUtc = Date.UTC(eY, eM - 1, eD);
  const diffDays = Math.round((earnUtc - refUtc) / (1000 * 60 * 60 * 24));

  // A regra de negócio: evento entre hoje (0 dias) e os próximos 10 dias corridos (inclusive)
  const isWithinWindow = diffDays >= 0 && diffDays <= 10;

  const [y, m, d] = earningsDate.split('-');
  const dateFormatted = `${d}/${m}/${y}`;

  return {
    hasUpcoming: true,
    isWithinWindow,
    daysRemaining: diffDays,
    date: earningsDate,
    dateFormatted,
    isEstimated,
    status: isEstimated ? 'ESTIMADA' : 'CONFIRMADA',
    statusLabel: isEstimated ? 'Data Estimada*' : 'Data Confirmada',
    timeOfDay,
    alertText: 'Earnings próximo de acontecer — cuidado ao operar este ativo.',
    reportText: text
  };
}

/**
 * Consulta a data de earnings para um ativo internacional na API da Nasdaq com cache seguro.
 */
async function fetchUpcomingEarnings(underlyingSymbol, referenceDateStr) {
  if (!underlyingSymbol) return null;
  const sym = String(underlyingSymbol).trim().toUpperCase();

  const now = Date.now();
  const cached = memoryEarningsCache.get(sym);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    // Recalcula a janela dinamicamente para o fuso/data atual
    return parseNasdaqEarningsPayload(cached.rawPayload, referenceDateStr);
  }

  try {
    const url = `https://api.nasdaq.com/api/analyst/${sym}/earnings-date`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const payload = data?.data;

    if (payload) {
      memoryEarningsCache.set(sym, {
        rawPayload: payload,
        timestamp: now
      });
      saveDiskCache();
    }

    return parseNasdaqEarningsPayload(payload, referenceDateStr);
  } catch (err) {
    // Resiliente: se a rede falhar ou der timeout, retorna null sem gerar falso alerta
    return null;
  }
}

/**
 * Retorna os dados completos de integração BDR para a tela de Gráficos:
 * - isBdr: boolean
 * - underlyingSymbol: string | null
 * - exchange: string | null
 * - stockChartsUrl: string | null
 * - earnings: objeto com alerta se houver evento nos próximos 10 dias corridos | null
 */
async function getBdrIntegrationData(symbol, options = {}) {
  const sym = String(symbol || '').trim().toUpperCase();
  if (!sym) return null;

  const isBdrAsset = isBdr(sym);
  if (!isBdrAsset) {
    return null;
  }

  const details = getUnderlyingDetails(sym);
  if (!details || !details.underlyingSymbol) {
    // BDR identificada porém sem mapeamento confiável: fallback discreto sem poluir a interface
    return {
      isBdr: true,
      underlyingSymbol: null,
      exchange: null,
      stockChartsUrl: null,
      earnings: null
    };
  }

  const stockChartsUrl = getStockChartsUrl(details.underlyingSymbol);
  const referenceDate = options.referenceDate || new Date().toISOString().slice(0, 10);
  const earningsData = await fetchUpcomingEarnings(details.underlyingSymbol, referenceDate);

  return {
    isBdr: true,
    bdrSymbol: sym,
    underlyingSymbol: details.underlyingSymbol,
    exchange: details.exchange,
    name: details.name,
    stockChartsUrl,
    earnings: earningsData
  };
}

module.exports = {
  isBdr,
  getUnderlyingDetails,
  getStockChartsUrl,
  parseNasdaqEarningsPayload,
  fetchUpcomingEarnings,
  getBdrIntegrationData,
  BDR_MAP
};

const { stockUniverse, splitStockUniverse } = require('./stock-universe');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createBrapiClient, writeJson } = require('./brapi-client');
const { createRefreshControl } = require('./market-refresh-control');
const b3Historical = require('./b3-historical');
const b3IndexHistory = require('./b3-index-history');
const LiquidityGateModel = require('../../frontend/liquidity-gate-model');

const BRAPI_URL = 'https://brapi.dev/api/v2/stocks/historical';
const BRAPI_QUOTE_URL = 'https://brapi.dev/api/v2/stocks/quote';
const BRAPI_LIST_URL = 'https://brapi.dev/api/quote/list';
const B3_INDEX_API = 'https://sistemaswebb3-listados.b3.com.br/indexProxy/indexCall/GetPortfolioDay/';
const CACHE_PATH = process.env.MARKET_CACHE_PATH || path.join(__dirname, '..', 'data', 'market-cache.json');
const CONTROL_PATH = process.env.BRAPI_CACHE_DIRECTORY || path.join(__dirname, '..', 'data', 'brapi-cache');
const B3_HISTORY_CACHE = process.env.B3_HISTORY_CACHE_DIRECTORY || path.join(__dirname, '..', 'data', 'b3-history-cache');
const B3_INDEX_HISTORY_CACHE = process.env.B3_INDEX_HISTORY_CACHE_DIRECTORY || path.join(__dirname, '..', 'data', 'b3-index-history-cache');
function positiveSetting(name, fallback) { const value = Number(process.env[name]); return Number.isFinite(value) && value > 0 ? value : fallback; }
const LIVE_QUOTE_MINUTES = positiveSetting('LIVE_SCAN_QUOTE_TTL_MINUTES', 60);
const CATALOG_CACHE_DAYS = positiveSetting('BRAPI_CATALOG_CACHE_DAYS', 7);
const brapi = createBrapiClient({ directory: CONTROL_PATH, credential: process.env.BRAPI_TOKEN || '', dailyLimit: positiveSetting('BRAPI_MAX_DAILY_REQUESTS', 250), rollingLimit: positiveSetting('BRAPI_MAX_31_DAY_REQUESTS', 14000) });
// A atualização de fechamento é primariamente B3. Ela não pode ser bloqueada
// por uma cota de contingência da BRAPI antes sequer de consultar a B3.
const refreshControl = createRefreshControl({ directory: CONTROL_PATH, readCache: () => readCache(), provider: { status: async () => ({ blockedUntil: 0 }) } });
const INDEX_HISTORY_RANGE = process.env.BRAPI_INDEX_HISTORY_RANGE || '3mo';
const FALLBACK_SYMBOLS = (process.env.IBOV_SYMBOLS || 'PETR4,VALE3,ITUB4,BBAS3,BBDC4,WEGE3,PRIO3,SUZB3')
  .split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
const FII_SYMBOLS = `RBRL11 BTCI11 DEVA11 SPXS11 RBRP11 RCRB11 BRCR11 RECR11 HCTR11 RBRY11 RBRR11 VGIP11 MCCI11 VGIR11 CPTS11 RZAK11 RBRX11 AFHI11 RZAT11 BTLG11 SNCI11 BROF11 ALZR11 BTAL11 XPML11 BRCO11 KNIP11 GTWR11 KNRI11 TEPP11 RBVA11 HGRU11 BCIA11 KFOF11 GARE11 HGBS11 XPCI11 VILG11 TRXF11 HSLG11 TRBL11 BCRI11 HSML11 HGLG11 VISC11 VGHF11 MXRF11 JSAF11 PVBI11 CYCR11 HABT11 OUJP11 MFII11 TGAR11 KNSC11 WHGR11 URPR11 LVBI11 KNCR11 VINO11 PORD11 VRTA11 HSAF11 KNHY11 VCJR11 TVRI11 HTMX11 XPSF11 KCRE11 HFOF11 CACR11 XPLG11 HGRE11 JSRE11 RZTR11 HGCR11 GGRC11 FATN11 CLIN11 KNHF11 KORE11 SNEL11 BPML11 CPSH11 GZIT11 KIVO11 KNUQ11 MANA11 MCRE11 ITRI11 BBIG11 VGRI11 ICRI11 LIFE11 BTHF11 TOPP11 VRTM11 PMLL11 AZPL11 PCIP11 PSEC11 RPRI11 RBFM11 IRIM11`.split(/\s+/).filter(Boolean);
const FII_SEGMENTS = {
  BTLG11:'Logística',BRCO11:'Logística',HGLG11:'Logística',HSLG11:'Logística',LVBI11:'Logística',VILG11:'Logística',XPLG11:'Logística',GGRC11:'Logística',TRBL11:'Logística',AZPL11:'Logística',
  XPML11:'Shopping',HGBS11:'Shopping',HSML11:'Shopping',VISC11:'Shopping',BPML11:'Shopping',PMLL11:'Shopping',
  BRCR11:'Lajes corporativas',GTWR11:'Lajes corporativas',PVBI11:'Lajes corporativas',RBRP11:'Lajes corporativas',RCRB11:'Lajes corporativas',HGRE11:'Lajes corporativas',JSRE11:'Lajes corporativas',TEPP11:'Lajes corporativas',VINO11:'Lajes corporativas',LIFE11:'Lajes corporativas',
  BTCI11:'Papel/CRI',DEVA11:'Papel/CRI',RECR11:'Papel/CRI',HCTR11:'Papel/CRI',RBRY11:'Papel/CRI',RBRR11:'Papel/CRI',VGIP11:'Papel/CRI',MCCI11:'Papel/CRI',VGIR11:'Papel/CRI',CPTS11:'Papel/CRI',RZAK11:'Papel/CRI',AFHI11:'Papel/CRI',KNIP11:'Papel/CRI',XPCI11:'Papel/CRI',BCRI11:'Papel/CRI',MXRF11:'Papel/CRI',HABT11:'Papel/CRI',OUJP11:'Papel/CRI',KNSC11:'Papel/CRI',KNCR11:'Papel/CRI',VRTA11:'Papel/CRI',KNHY11:'Papel/CRI',VCJR11:'Papel/CRI',KCRE11:'Papel/CRI',CACR11:'Papel/CRI',HGCR11:'Papel/CRI',CLIN11:'Papel/CRI',KNHF11:'Papel/CRI',KIVO11:'Papel/CRI',KNUQ11:'Papel/CRI',MCRE11:'Papel/CRI',ICRI11:'Papel/CRI',PCIP11:'Papel/CRI',PSEC11:'Papel/CRI',RPRI11:'Papel/CRI',IRIM11:'Papel/CRI',
  RBRL11:'Híbridos',RBRX11:'Híbridos',KFOF11:'Híbridos',BCIA11:'Híbridos',JSAF11:'Híbridos',TGAR11:'Híbridos',XPSF11:'Híbridos',HFOF11:'Híbridos',BTHF11:'Híbridos',RBFM11:'Híbridos'
};
const FII_NAME_MAP = {
  HGLG11: 'CSHG Logística', KNIP11: 'Kinea Índices de Preços', KNCR11: 'Kinea Rendimentos Imobiliários',
  KNRI11: 'Kinea Renda Imobiliária', KNHY11: 'Kinea High Yield CRI', KNSC11: 'Kinea Securities',
  KFOF11: 'Kinea Fundo de Fundos', KCRE11: 'Kinea Crédito Agro', KNHF11: 'Kinea Hedge Fund',
  KORE11: 'Kinea Oportunidades Real Estate', KNUQ11: 'Kinea Unique', XPML11: 'XP Malls',
  XPLG11: 'XP Logística', XPCI11: 'XP Crédito Imobiliário', XPSF11: 'XP Seleção FOF',
  MXRF11: 'Maxi Renda', BTLG11: 'BTG Pactual Logística', BTAL11: 'BTG Pactual Agro Logística',
  BTCI11: 'BTG Pactual Crédito Imobiliário', BPML11: 'BTG Pactual Shoppings', BTHF11: 'BTG Pactual Hedge Fund',
  BRCR11: 'BTG Pactual Corporate Office', VISC11: 'Vinci Shopping Centers', VILG11: 'Vinci Logística',
  VINO11: 'Vinci Offices', VGHF11: 'Valora Hedge Fund', VGIR11: 'Valora RE III',
  VGIP11: 'Valora CRI Índice de Preço', VGRI11: 'Valora Gestão de Renda Imobiliária', HGRU11: 'CSHG Renda Urbana',
  HGBS11: 'Hedge Brasil Shopping', HGRE11: 'CSHG Real Estate', HGCR11: 'CSHG Recebíveis Imobiliários',
  HFOF11: 'Hedge Top FOFII', HCTR11: 'Hectare CE', HSML11: 'HSI Malls',
  HSLG11: 'HSI Logística', HSAF11: 'HSI Ativos Financeiros', CPTS11: 'Capitânia Securities II',
  CPSH11: 'Capitânia Shopping', RZAK11: 'Riza Akin', RZTR11: 'Riza Terrax',
  RZAT11: 'Riza Agro', TGAR11: 'TG Ativo Real', TRXF11: 'TRX Real Estate',
  ALZR11: 'Alianza Trust Renda Imobiliária', BRCO11: 'Bresco Logística', BROF11: 'BR Properties Corporate Offices',
  PVBI11: 'VBI Prime Properties', LVBI11: 'VBI Logística', BCIA11: 'Bradesco Carteira Imobiliária Ativa',
  BCRI11: 'Banestes Recebíveis Imobiliários', GARE11: 'Guardian Real Estate', GGRC11: 'GGR Covepi Renda Imobiliária',
  GZIT11: 'Gazit Malls', JSRE11: 'JS Real Estate Multigestão', JSAF11: 'JS Ativos Financeiros',
  MCCI11: 'Mauá Capital Recebíveis', MCRE11: 'Mauá Capital Real Estate', MANA11: 'MANA FII',
  RBRP11: 'RBR Properties', RBRR11: 'RBR Rendimento High Grade', RBRY11: 'RBR Crédito Imobiliário',
  RBRL11: 'RBR Logística', RBRX11: 'RBR Plus Multiestratégia', RBVA11: 'Rio Bravo Renda Varejo',
  RBFM11: 'Rio Bravo Renda Comercial', RCRB11: 'Rio Bravo Renda Corporativa', RECR11: 'REC Recebíveis Imobiliários',
  SNCI11: 'Suno Recebíveis Imobiliários', SNEL11: 'Suno Energias Limpas',
  KIVO11: 'Kilima Vesta', TEPP11: 'Tellus Properties',
  VRTA11: 'Fator Verità', VRTM11: 'Fator Verità Multiestratégia', FATN11: 'BR Capital Distribuição',
  CLIN11: 'Clave Índices de Preços', DEVA11: 'Devant Recebíveis Imobiliários', URPR11: 'Urca Prime Renda',
  HABT11: 'Habitat II', OUJP11: 'Ourinvest JPP', AFHI11: 'AF Invest Cri',
  MFII11: 'Mérito Desenvolvimento Imobiliário', WHGR11: 'WHG Real Estate', PORD11: 'Polo FII Recebíveis Imobiliários',
  VCJR11: 'Vectis Juros Real', TVRI11: 'Tivio Renda Imobiliária', HTMX11: 'Hotel Maxinvest',
  CACR11: 'Cartesia Recebíveis Imobiliários', ITRI11: 'Inter Títulos Imobiliários', BBIG11: 'BB Renda Imobiliária',
  ICRI11: 'Integral Brei CRI', LIFE11: 'Life Capital Partners', TOPP11: 'Torre Almirante',
  PMLL11: 'Pátria Malls', AZPL11: 'AZ Quest Panorama Logística', PCIP11: 'Polocred Índices de Preços',
  PSEC11: 'Pátria Securitizadora', RPRI11: 'RBCap Renda Imobiliária', IRIM11: 'Iridium Recebíveis Imobiliários',
  CYCR11: 'Cyrela Crédito Imobiliário', SPXS11: 'Apex SPX Crédito Imobiliário', GTWR11: 'Green Towers Brasília'
};
const FII_CATALOG = FII_SYMBOLS.map((symbol) => [symbol, FII_NAME_MAP[symbol] || symbol, FII_SEGMENTS[symbol] || 'Outros']);
const BDR_CATALOG = [
  ['ROXO34', 'Nu Holdings', 'Financeiro', 'NU', 'NYSE'],
  ['MELI34', 'MercadoLibre', 'Consumo', 'MELI', 'NASDAQ'],
  ['M1TA34', 'Meta Platforms', 'Tecnologia', 'META', 'NASDAQ'],
  ['NVDC34', 'NVIDIA', 'Tecnologia', 'NVDA', 'NASDAQ'],
  ['TSLA34', 'Tesla', 'Consumo', 'TSLA', 'NASDAQ'],
  ['ITLC34', 'Intel', 'Tecnologia', 'INTC', 'NASDAQ'],
  ['AMZO34', 'Amazon', 'Consumo', 'AMZN', 'NASDAQ'],
  ['GOGL34', 'Alphabet', 'Tecnologia', 'GOOGL', 'NASDAQ'],
  ['MSFT34', 'Microsoft', 'Tecnologia', 'MSFT', 'NASDAQ'],
  ['M2ST34', 'MicroStrategy', 'Tecnologia', 'MSTR', 'NASDAQ'],
  ['SPCX34', 'SpaceX / Destiny', 'Tecnologia', 'DXYZ', 'NYSE'],
  ['TSMC34', 'TSMC', 'Tecnologia', 'TSM', 'NYSE'],
  ['P2LT34', 'Palantir', 'Tecnologia', 'PLTR', 'NASDAQ'],
  ['ORCL34', 'Oracle', 'Tecnologia', 'ORCL', 'NYSE'],
  ['MUTC34', 'Micron Technology', 'Tecnologia', 'MU', 'NASDAQ'],
  ['AAPL34', 'Apple', 'Tecnologia', 'AAPL', 'NASDAQ'],
  ['NFLX34', 'Netflix', 'Comunicação', 'NFLX', 'NASDAQ'],
  ['BABA34', 'Alibaba', 'Consumo', 'BABA', 'NYSE'],
  ['LILY34', 'Eli Lilly', 'Saúde', 'LLY', 'NYSE'],
  ['A1MD34', 'AMD', 'Tecnologia', 'AMD', 'NASDAQ'],
  ['JPMC34', 'JPMorgan Chase', 'Financeiro', 'JPM', 'NYSE'],
  ['AVGO34', 'Broadcom', 'Tecnologia', 'AVGO', 'NASDAQ'],
  ['BOAC34', 'Bank of America', 'Financeiro', 'BAC', 'NYSE'],
  ['C2OI34', 'Coinbase', 'Financeiro', 'COIN', 'NASDAQ'],
  ['COCA34', 'Coca-Cola', 'Consumo', 'KO', 'NYSE'],
  ['BERK34', 'Berkshire Hathaway', 'Financeiro', 'BRK.B', 'NYSE'],
  ['BKNG34', 'Booking Holdings', 'Consumo', 'BKNG', 'NASDAQ'],
  ['S2GM34', 'Sigma Lithium', 'Materiais Básicos', 'SGML', 'NASDAQ'],
  ['NIKE34', 'Nike', 'Consumo', 'NKE', 'NYSE'],
  ['WALM34', 'Walmart', 'Consumo', 'WMT', 'NYSE'],
  ['JNJB34', 'Johnson & Johnson', 'Saúde', 'JNJ', 'NYSE'],
  ['DISB34', 'Walt Disney', 'Comunicação', 'DIS', 'NYSE'],
  ['PAGS34', 'PagSeguro', 'Financeiro', 'PAGS', 'NYSE'],
  ['CHVX34', 'Chevron', 'Petróleo e Gás', 'CVX', 'NYSE']
];
const BDR_SYMBOLS = BDR_CATALOG.map(([symbol]) => symbol);
const BDR_ORIGINALS = {
  ROXO34:['NU','NYSE'],MELI34:['MELI','NASDAQ'],M1TA34:['META','NASDAQ'],NVDC34:['NVDA','NASDAQ'],
  TSLA34:['TSLA','NASDAQ'],ITLC34:['INTC','NASDAQ'],AMZO34:['AMZN','NASDAQ'],GOGL34:['GOOGL','NASDAQ'],
  MSFT34:['MSFT','NASDAQ'],M2ST34:['MSTR','NASDAQ'],SPCX34:['DXYZ','NYSE'],TSMC34:['TSM','NYSE'],
  P2LT34:['PLTR','NASDAQ'],ORCL34:['ORCL','NYSE'],MUTC34:['MU','NASDAQ'],AAPL34:['AAPL','NASDAQ'],
  NFLX34:['NFLX','NASDAQ'],BABA34:['BABA','NYSE'],LILY34:['LLY','NYSE'],A1MD34:['AMD','NASDAQ'],
  JPMC34:['JPM','NYSE'],AVGO34:['AVGO','NASDAQ'],BOAC34:['BAC','NYSE'],C2OI34:['COIN','NASDAQ'],
  COCA34:['KO','NYSE'],BERK34:['BRK.B','NYSE'],BKNG34:['BKNG','NASDAQ'],S2GM34:['SGML','NASDAQ'],
  NIKE34:['NKE','NYSE'],WALM34:['WMT','NYSE'],JNJB34:['JNJ','NYSE'],DISB34:['DIS','NYSE'],
  PAGS34:['PAGS','NYSE'],CHVX34:['CVX','NYSE']
};
const BDR_CATALOG_VERSION = 5;

const STOCK_UNITS_ENDING_IN_11 = new Set([
  'ALUP11', 'BIDI11', 'BPAC11', 'CPLE11', 'ENGI11', 'IGTI11', 'KLBN11', 'MODL11',
  'RANI11', 'SANB11', 'SAPR11', 'SULA11', 'TAEE11', 'TIET11', 'BRBI11', 'ALLD11'
]);

function assetClassForSymbol(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  if (FII_CATALOG.some(([ticker]) => ticker === normalized)) return 'fii';
  if (normalized.endsWith('11') && !STOCK_UNITS_ENDING_IN_11.has(normalized) && !normalized.startsWith('IBOV') && !normalized.startsWith('IFIX') && !normalized.startsWith('SMLL')) {
    return 'fii';
  }
  if (BDR_CATALOG.some(([ticker]) => ticker === normalized) || BDR_SYMBOLS.includes(normalized) || /(31|32|33|34|35|39)$/.test(normalized)) return 'bdr';
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
function calculateEmaSeries(values, period) {
  if (!Array.isArray(values) || values.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += Number(values[i]);
  let currentEma = sum / period;
  result[period - 1] = Number(currentEma.toFixed(4));
  for (let i = period; i < values.length; i++) {
    currentEma = Number(values[i]) * k + currentEma * (1 - k);
    result[i] = Number(currentEma.toFixed(4));
  }
  return result;
}
const MARKET_CYCLE_EMA_FAST = 10;
const MARKET_CYCLE_EMA_SLOW = 30;
const ASSET_STRUCTURE_EMA_FAST = 10;
const ASSET_STRUCTURE_EMA_SLOW = 72;
const OFFICIAL_EMA_FAST = MARKET_CYCLE_EMA_FAST;
const OFFICIAL_EMA_SLOW = MARKET_CYCLE_EMA_SLOW;

function scoreCycle(history) {
  const candles = history.filter((item) => Number.isFinite(item.adjustedClose ?? item.close));
  const closes = candles.map((item) => item.adjustedClose ?? item.close);
  if (closes.length < 30) return { state: 'defensive', score: 25, reason: 'Histórico insuficiente para leitura completa (mínimo 30 pregões).' };
  const price = closes.at(-1);

  const ema10Arr = calculateEmaSeries(closes, MARKET_CYCLE_EMA_FAST);
  const ema30Period = Math.min(MARKET_CYCLE_EMA_SLOW, closes.length);
  const ema30Arr = calculateEmaSeries(closes, ema30Period);
  const ema10 = ema10Arr[ema10Arr.length - 1];
  const ema30 = ema30Arr[ema30Arr.length - 1];
  const prevEma10 = ema10Arr.length > 1 ? ema10Arr[ema10Arr.length - 2] : ema10;
  const prevEma30 = ema30Arr.length > 1 ? ema30Arr[ema30Arr.length - 2] : ema30;
  const ema10Slope = Number.isFinite(prevEma10) ? Number((ema10 - prevEma10).toFixed(4)) : 0;
  const ema30Slope = Number.isFinite(prevEma30) ? Number((ema30 - prevEma30).toFixed(4)) : 0;

  const ranges = candles.slice(-21).map((item, index, rows) => {
    const high = Number(item.high), low = Number(item.low);
    const prior = rows[index - 1]?.adjustedClose ?? rows[index - 1]?.close;
    if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
    return Number.isFinite(prior) ? Math.max(high - low, Math.abs(high - prior), Math.abs(low - prior)) : high - low;
  }).filter(Number.isFinite);
  const atr21 = ranges.length >= 15 ? ranges.reduce((sum, value) => sum + value, 0) / ranges.length : null;

  // Regra oficial do Ciclo de Mercado (exclusivamente EMA 10 e EMA 30 no gráfico Diário):
  // Leitura mais ágil para identificar mudanças de regime e retomadas com maior antecedência.
  // EXPANSÃO (mercado saudável): Preço > EMA 10, Preço > EMA 30 E EMA 10 > EMA 30 (estrutura alinhada)
  // DEFESA / TRANSIÇÃO: Preço <= EMA 10 ou Preço <= EMA 30 ou EMA 10 <= EMA 30 (médias invertidas)
  const above10 = price > ema10;
  const above30 = price > ema30;
  const structure = ema10 > ema30;
  const isExpansion = above10 && above30 && structure;
  const isEarlyRecovery = (above10 || above30) && !structure;
  const state = isExpansion ? 'healthy' : 'defensive';

  const roc10 = closes.length >= 11 ? ((price / closes.at(-11)) - 1) * 100 : 0;

  // Score contínuo e responsivo (0 a 100)
  let score = 50;
  if (state === 'healthy') {
    // Mercado em expansão: base 76, modulação de 70 a 95
    score = 76;
    if (structure) score += 4; else score -= 2;
    if (ema10Slope > 0) score += 3; else score -= 2;
    if (ema30Slope > 0) score += 3; else score -= 2;
    const rocAdj = Math.max(-4, Math.min(6, Math.round(roc10 * 1.2)));
    score += rocAdj;
    score = Math.max(70, Math.min(95, score));
  } else {
    // Mercado em modo defesa / transição: base 26, modulação de 10 a 48 (abaixo de 50)
    score = 26;
    if (above10) score += 6;
    if (above30) score += 4;
    if (ema10Slope > 0) score += 3;
    if (structure) score += 3;
    const rocAdj = Math.max(-5, Math.min(5, Math.round(roc10 * 1.0)));
    score += rocAdj;
    score = Math.max(10, Math.min(48, score));
  }

  const ema200Val = closes.length >= 200 ? ema(closes.slice(-200), 200) : ema30;

  return {
    state,
    score,
    price,
    ema10,
    ema30,
    above10,
    above30,
    structure,
    ema10Slope,
    ema30Slope,
    isEarlyRecovery,
    emaFastPeriod: MARKET_CYCLE_EMA_FAST,
    emaSlowPeriod: MARKET_CYCLE_EMA_SLOW,
    atr21,
    atrPct: Number.isFinite(atr21) && price > 0 ? atr21 / price * 100 : null,
    roc10,
    date: candles.at(-1)?.date || null,
    // Compatibilidade retroativa para consumidores que acessam campos legados do ciclo:
    ema72: ema30,
    above72: above30,
    ema72Slope: ema30Slope,
    ema9: ema10,
    above9: above10,
    ema9Slope: ema10Slope,
    ema20: ema30,
    ema200: ema200Val,
    above20: above30,
    above200: price > ema200Val,
    ema10Above20: structure,
    ema20Slope: ema30Slope,
    ema200Slope: 0
  };
}
function marketCycleSeries(history) {
  const closes = history.map((item) => Number(item.adjustedClose ?? item.close)).filter(Number.isFinite);
  const ema10All = calculateEmaSeries(closes, 10);
  const ema20All = calculateEmaSeries(closes, 20);
  const ema30All = calculateEmaSeries(closes, 30);
  const ema50All = calculateEmaSeries(closes, 50);
  const ema72All = calculateEmaSeries(closes, 72);
  const ema200All = closes.length >= 200 ? calculateEmaSeries(closes, 200) : [];

  return history.map((candle, index) => {
    if (index < 29) return null;
    const reading = scoreCycle(history.slice(0, index + 1));
    const close = reading.price;
    const prevCandle = index > 0 ? history[index - 1] : null;
    const hasRealOhlc = candle.open !== undefined && candle.high !== undefined && candle.low !== undefined &&
      Number.isFinite(Number(candle.open)) && Number.isFinite(Number(candle.high)) && Number.isFinite(Number(candle.low)) &&
      (Number(candle.high) > Number(candle.low) || Number(candle.open) !== Number(candle.close));

    const open = hasRealOhlc
      ? Number(candle.open)
      : (prevCandle && Number.isFinite(Number(prevCandle.close)) ? Number(prevCandle.close) : close);
    const high = hasRealOhlc
      ? Number(candle.high)
      : Math.max(open, close) + Math.abs(close - open) * 0.25 + (close * 0.001);
    const low = hasRealOhlc
      ? Number(candle.low)
      : Math.min(open, close) - Math.abs(close - open) * 0.25 - (close * 0.001);

    return {
      date: candle.date,
      open,
      high,
      low,
      close,
      ema10: reading.ema10 ?? ema10All[index] ?? null,
      ema20: ema20All[index] ?? null,
      ema30: reading.ema30 ?? ema30All[index] ?? null,
      ema50: ema50All[index] ?? null,
      ema72: ema72All[index] ?? reading.ema30 ?? null,
      ema200: ema200All[index] ?? reading.ema200 ?? null,
      atr21: reading.atr21,
      atrPct: reading.atrPct,
      score: reading.score,
      state: reading.state,
      // Compatibilidade legada
      ema9: reading.ema10
    };
  }).filter(Boolean);
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
  const ttlMs = pathname === '/api/v2/stocks/quote'
    ? LIVE_QUOTE_MINUTES * 60000
    : pathname === '/api/quote/list' ? CATALOG_CACHE_DAYS * 24 * 3600000 : 20 * 3600000;
  return brapi.request(url, headers, { ttlMs });
}
function brapiHeaders() { return process.env.BRAPI_TOKEN ? { Authorization: `Bearer ${process.env.BRAPI_TOKEN}` } : {}; }
function historyRangeFor(symbol) {
  return ['^BVSP', 'IFIX', 'BDRX'].includes(String(symbol || '').trim().toUpperCase()) ? INDEX_HISTORY_RANGE : '1y';
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
function indexHistoryYears(now = new Date()) {
  const year = Number(saoPauloParts(now).year);
  return [year - 2, year - 1, year];
}
async function fetchBenchmarkHistory(symbol) {
  try {
    const history = await b3IndexHistory.fetchIndexHistory(symbol, { years: indexHistoryYears(), cacheDirectory: B3_INDEX_HISTORY_CACHE });
    if (history.length >= 64) return history;
    throw new Error(`Histórico B3 insuficiente para ${symbol}.`);
  } catch (error) {
    // A BRAPI fica fora do caminho normal e só é consultada se a B3 estiver
    // temporariamente indisponível ou ainda não tiver publicado dados suficientes.
    const fallback = await fetchHistory(symbol);
    Object.defineProperty(fallback, 'source', { value: 'brapi-fallback', enumerable: false });
    return fallback;
  }
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
    // Planos da BRAPI com limite de um ativo rejeitam lotes. Mantemos os lotes
    // para planos compatíveis, mas degradamos para chamadas individuais sem
    // deixar uma falha de compatibilidade esvaziar o ranking inteiro.
    if (error.providerCode === 'QUOTES_PER_REQUEST_EXCEEDED' && normalized.length > 1) {
      const individual = await mapWithConcurrency(normalized, 2, async (ticker) => fetchHistoryBatch([ticker], range));
      return new Map(individual.flatMap((history) => [...history]));
    }
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
  // Fechamentos oficiais da B3 são a fonte principal para a Força Relativa.
  // Índices continuam no fallback porque não constam no arquivo COTAHIST do mercado à vista.
  const b3Symbols = normalized.filter((symbol) => !['^BVSP', 'SMLL', 'IFIX'].includes(symbol));
  let b3 = new Map();
  try {
    const current = new Date().getFullYear();
    b3 = await b3Historical.fetchHistories(b3Symbols, { years: [current - 1, current], cacheDirectory: B3_HISTORY_CACHE });
    if (b3.size === b3Symbols.length) { b3.source = 'b3-cotahist'; return b3; }
  } catch (error) { /* contingência BRAPI abaixo */ }
  const missing = normalized.filter((symbol) => !b3.has(symbol));
  if (missing.length === 0 && b3.size > 0) {
    b3.source = 'b3-cotahist';
    return b3;
  }
  const chunks = Array.from({ length: Math.ceil(missing.length / batchSize) }, (_, index) => missing.slice(index * batchSize, (index + 1) * batchSize));
  const responses = await mapWithConcurrency(chunks, 2, async (chunk) => fetchHistoryBatch(chunk));
  const histories = new Map(b3);
  for (const response of responses) if (response instanceof Map) for (const [symbol, history] of response) histories.set(symbol, history);
  histories.source = b3.size >= b3Symbols.length * 0.8 ? 'b3-cotahist' : 'brapi-fallback';
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
  const ema50 = closes.length >= 50 ? ema(closes.slice(-50), 50) : null;
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
    ema50,
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
const STOCK_CATALOG_FALLBACK = {
  EMBJ3: { name: 'EMBRAER S.A.', sector: 'Tecnologia eletrônica' },
  AXIA3: { name: 'AXIA ENERGIA S.A.', sector: 'Serviços públicos' },
  AXIA7: { name: 'AXIA ENERGIA S.A.', sector: 'Serviços públicos' },
  MBRF3: { name: 'MBRF GLOBAL FOODS COMPANY S.A.', sector: 'Bens de consumo não duráveis' },
  RIAA3: { name: 'RIACHUELO S.A.', sector: 'Comércio varejista' },
  WDCN3: { name: 'WDC NETWORKS (LIVETECH DA BAHIA S.A.)', sector: 'Serviços de tecnologia' },
  SAUD3: { name: 'BRADSAÚDE S.A.', sector: 'Tecnologia em saúde' },
  SEQL3: { name: 'SEQUOIA LOGÍSTICA S.A.', sector: 'Transporte e logística' }
};
function metadataFromCache(cache) {
  const items = [
    ...(cache?.relativeStrength || []),
    ...(cache?.relativeStrengthByClass?.stock_ibov?.excludedByLiquidity || []),
    ...(cache?.relativeStrengthByClass?.stock_other?.excludedByLiquidity || [])
  ];
  const map = new Map(items.filter((item) => item?.symbol).map((item) => [item.symbol, {
    type: 'stock', subType: 'stock', name: item.name || item.symbol, sector: item.sector || 'Não classificado'
  }]));
  for (const [sym, info] of Object.entries(STOCK_CATALOG_FALLBACK)) {
    const existing = map.get(sym);
    if (!existing || !existing.name || existing.name === sym) {
      map.set(sym, {
        type: 'stock',
        subType: 'stock',
        name: info.name,
        sector: existing?.sector && existing.sector !== 'Não classificado' ? existing.sector : info.sector
      });
    }
  }
  return map;
}
function bdrCatalogFromCache(cache) {
  const items = cache?.relativeStrengthByClass?.bdr?.items || [];
  const cachedMap = new Map(items.filter((item) => item?.symbol).map((item) => [item.symbol, item]));
  return BDR_CATALOG.map(([symbol, defaultName, defaultSector, originalSymbol, internationalBenchmark]) => {
    const cached = cachedMap.get(symbol);
    return {
      symbol,
      name: cached?.name || defaultName || symbol,
      sector: cached?.sector || defaultSector || 'Não classificado',
      assetClass: 'bdr',
      originalSymbol: cached?.originalSymbol || originalSymbol || BDR_ORIGINALS[symbol]?.[0] || null,
      internationalBenchmark: cached?.internationalBenchmark || internationalBenchmark || BDR_ORIGINALS[symbol]?.[1] || null
    };
  });
}
function historyLastDate(history) {
  if (!Array.isArray(history) || !history.length) return null;
  const last = history[history.length - 1];
  return last?.date || last?.time || null;
}
async function collectClassRelativeStrength({ assetClass, benchmarkSymbol, catalog }) {
  const benchmarkHistory = await fetchBenchmarkHistory(benchmarkSymbol);
  const benchmarkReturns = returns(benchmarkHistory);
  const benchmarkLastDate = historyLastDate(benchmarkHistory);
  const histories = await fetchHistories(catalog.map((item) => item.symbol));
  const collected = catalog.map((item) => {
    const history = histories.get(item.symbol);
    if (!history) return { ...item, error: `Histórico indisponível para ${item.symbol}` };
    const assetReturns = returns(history);
    if (!Number.isFinite(assetReturns.m1) || !Number.isFinite(assetReturns.m3)) return { ...item, error: `Histórico incompleto para ${item.symbol}` };
    const assetLastDate = historyLastDate(history);
    if (benchmarkLastDate && assetLastDate && assetLastDate < benchmarkLastDate) {
      return { ...item, error: `Ativo expirado ou sem negociação no fechamento (${assetLastDate} < ${benchmarkLastDate})` };
    }
    const liquidity = LiquidityGateModel.evaluateLiquidity({
      candles: history,
      symbol: item.symbol,
      market: 'B3'
    });
    return {
      ...item,
      ...assetReturns,
      scan: scanMetrics(history),
      relativeTrend: relativeTrend(history, benchmarkHistory),
      relativeScore: (assetReturns.m1 - benchmarkReturns.m1) * .35 + (assetReturns.m3 - benchmarkReturns.m3) * .65,
      liquidity,
      history
    };
  });
  const clean = item => { const { history, ...value } = item; return value; };
  const available = collected.filter((item) => !item.error);
  const eligible = available.filter((item) => item.liquidity?.isEligible);
  const excluded = available.filter((item) => !item.liquidity?.isEligible).map(item => clean({
    ...item,
    rank: null,
    score: null,
    trendTemplate: 'below_filter',
    assetClass
  }));
  const rows = rank(eligible.map(clean)).map((item) => ({ ...item, trendTemplate: templateReading(item.score, item.relativeTrend) }));
  return { ...classMeta(assetClass), benchmark: benchmarkSymbol, returns: benchmarkReturns, requested: catalog.length, available: rows.length, items: rows, excludedByLiquidity: excluded };
}
async function collectPeerRelativeStrength({ assetClass, catalog }) {
  const histories = await fetchHistories(catalog.map((item) => item.symbol));
  const benchmarkHistory = peerBenchmarkHistory(histories);
  const benchmarkReturns = returns(benchmarkHistory);
  const benchmarkLastDate = historyLastDate(benchmarkHistory);
  const collected = catalog.map((item) => {
    const history = histories.get(item.symbol);
    if (!history) return { ...item, error: `Histórico indisponível para ${item.symbol}` };
    const assetReturns = returns(history);
    if (!Number.isFinite(assetReturns.m1) || !Number.isFinite(assetReturns.m3)) return { ...item, error: `Histórico incompleto para ${item.symbol}` };
    const assetLastDate = historyLastDate(history);
    if (benchmarkLastDate && assetLastDate && assetLastDate < benchmarkLastDate) {
      return { ...item, error: `Ativo expirado ou sem negociação no fechamento (${assetLastDate} < ${benchmarkLastDate})` };
    }
    const liquidity = LiquidityGateModel.evaluateLiquidity({
      candles: history,
      symbol: item.symbol,
      market: 'B3'
    });
    return {
      ...item,
      ...assetReturns,
      scan: scanMetrics(history),
      relativeTrend: relativeTrend(history, benchmarkHistory),
      relativeScore: (assetReturns.m1 - benchmarkReturns.m1) * .35 + (assetReturns.m3 - benchmarkReturns.m3) * .65,
      liquidity,
      history
    };
  });
  const cleanPeer = item => { const { history, ...value } = item; return value; };
  const availablePeer = collected.filter((item) => !item.error);
  const eligiblePeer = availablePeer.filter((item) => item.liquidity?.isEligible);
  const excludedPeer = availablePeer.filter((item) => !item.liquidity?.isEligible).map(item => cleanPeer({
    ...item,
    rank: null,
    score: null,
    trendTemplate: 'below_filter',
    assetClass
  }));
  const rows = rank(eligiblePeer.map(cleanPeer)).map((item) => ({ ...item, trendTemplate: templateReading(item.score, item.relativeTrend) }));
  return { ...classMeta(assetClass), benchmark: 'Universo de BDRs', returns: benchmarkReturns, requested: catalog.length, available: rows.length, items: rows, excludedByLiquidity: excludedPeer, catalogVersion: BDR_CATALOG_VERSION };
}
let resilience12mCacheData = null;
function getResilience12mCache() {
  if (!resilience12mCacheData) {
    try {
      resilience12mCacheData = require('../data/resilience-12m-cache.json');
    } catch {
      resilience12mCacheData = {};
    }
  }
  return resilience12mCacheData;
}

function enrichItemWithResilience(item) {
  if (!item || item.resilience12m) return item;
  const resCache = getResilience12mCache();
  const res = resCache[item.symbol];
  if (res) return { ...item, resilience12m: res };
  return item;
}

function classStrengthFromCache(cache) {
  const legacyStock = { ...classMeta('stock'), requested: cache.universe?.requested || 0, available: cache.relativeStrength?.length || 0, unavailable: cache.universe?.unavailable || [], items: (cache.relativeStrength || []).map((item) => enrichItemWithResilience({ ...item, assetClass: item.assetClass || 'stock' })) };
  const fallbackStock = { ...legacyStock, ...classMeta('stock_ibov'), items: legacyStock.items.map(item => ({ ...item, assetClass: 'stock_ibov' })) };
  const rawStockIbov = cache.relativeStrengthByClass?.stock_ibov || fallbackStock;
  const stockIbov = {
    ...rawStockIbov,
    items: (rawStockIbov.items || []).map(enrichItemWithResilience),
    excludedByLiquidity: (rawStockIbov.excludedByLiquidity || []).map(enrichItemWithResilience)
  };
  const rawStockOther = cache.relativeStrengthByClass?.stock_other || { ...classMeta('stock_other'), requested: 0, available: 0, items: [], excludedByLiquidity: [], pending: true };
  const stockOther = {
    ...rawStockOther,
    items: (rawStockOther.items || []).map(enrichItemWithResilience),
    excludedByLiquidity: (rawStockOther.excludedByLiquidity || []).map(enrichItemWithResilience)
  };
  const pending = (assetClass) => ({ ...classMeta(assetClass), requested: 0, available: 0, items: [], excludedByLiquidity: [], pending: true });
  const fiiRaw = cache.relativeStrengthByClass?.fii || pending('fii');
  const fii = {
    ...fiiRaw,
    items: (fiiRaw.items || []).map((item) => enrichItemWithResilience({
      ...item,
      name: (item.name && item.name !== item.symbol) ? item.name : (FII_NAME_MAP[item.symbol] || item.name || item.symbol)
    })),
    excludedByLiquidity: (fiiRaw.excludedByLiquidity || []).map((item) => enrichItemWithResilience({
      ...item,
      name: (item.name && item.name !== item.symbol) ? item.name : (FII_NAME_MAP[item.symbol] || item.name || item.symbol)
    }))
  };
  const bdrRaw = cache.relativeStrengthByClass?.bdr || pending('bdr');
  const bdr = {
    ...bdrRaw,
    items: (bdrRaw.items || []).map((item) => {
      const bdrEntry = BDR_CATALOG.find(([s]) => s === item.symbol);
      return enrichItemWithResilience({
        ...item,
        name: (item.name && item.name !== item.symbol) ? item.name : (bdrEntry?.[1] || item.name || item.symbol)
      });
    }),
    excludedByLiquidity: (bdrRaw.excludedByLiquidity || []).map((item) => {
      const bdrEntry = BDR_CATALOG.find(([s]) => s === item.symbol);
      return enrichItemWithResilience({
        ...item,
        name: (item.name && item.name !== item.symbol) ? item.name : (bdrEntry?.[1] || item.name || item.symbol)
      });
    })
  };
  return { stock: legacyStock, stock_ibov: stockIbov, stock_other: stockOther, fii, bdr };
}

function classStrengthWeeklyFromCache(cache) {
  const weekly = cache?.relativeStrengthByClassWeekly;
  if (!weekly) return classStrengthFromCache(cache);
  const rawStockIbov = weekly.stock_ibov || { ...classMeta('stock_ibov'), requested: 0, available: 0, items: [], excludedByLiquidity: [] };
  const stockIbov = {
    ...rawStockIbov,
    items: (rawStockIbov.items || []).map(enrichItemWithResilience),
    excludedByLiquidity: (rawStockIbov.excludedByLiquidity || []).map(enrichItemWithResilience)
  };
  const rawStockOther = weekly.stock_other || { ...classMeta('stock_other'), requested: 0, available: 0, items: [], excludedByLiquidity: [] };
  const stockOther = {
    ...rawStockOther,
    items: (rawStockOther.items || []).map(enrichItemWithResilience),
    excludedByLiquidity: (rawStockOther.excludedByLiquidity || []).map(enrichItemWithResilience)
  };
  const fiiRaw = weekly.fii || { ...classMeta('fii'), requested: 0, available: 0, items: [], excludedByLiquidity: [] };
  const fii = {
    ...fiiRaw,
    items: (fiiRaw.items || []).map((item) => enrichItemWithResilience({
      ...item,
      name: (item.name && item.name !== item.symbol) ? item.name : (FII_NAME_MAP[item.symbol] || item.name || item.symbol)
    })),
    excludedByLiquidity: (fiiRaw.excludedByLiquidity || []).map((item) => enrichItemWithResilience({
      ...item,
      name: (item.name && item.name !== item.symbol) ? item.name : (FII_NAME_MAP[item.symbol] || item.name || item.symbol)
    }))
  };
  const bdrRaw = weekly.bdr || { ...classMeta('bdr'), requested: 0, available: 0, items: [], excludedByLiquidity: [] };
  const bdr = {
    ...bdrRaw,
    items: (bdrRaw.items || []).map((item) => {
      const bdrEntry = BDR_CATALOG.find(([s]) => s === item.symbol);
      return enrichItemWithResilience({
        ...item,
        name: (item.name && item.name !== item.symbol) ? item.name : (bdrEntry?.[1] || item.name || item.symbol)
      });
    }),
    excludedByLiquidity: (bdrRaw.excludedByLiquidity || []).map((item) => {
      const bdrEntry = BDR_CATALOG.find(([s]) => s === item.symbol);
      return enrichItemWithResilience({
        ...item,
        name: (item.name && item.name !== item.symbol) ? item.name : (bdrEntry?.[1] || item.name || item.symbol)
      });
    })
  };
  return { stock: stockIbov, stock_ibov: stockIbov, stock_other: stockOther, fii, bdr };
}
function classifyAsset(symbol, cache) {
  const normalized = String(symbol || '').trim().toUpperCase();
  const baseClass = assetClassForSymbol(normalized);
  const classes = classStrengthFromCache(cache || {});
  const assetClass = baseClass === 'stock'
    ? (classes.stock_ibov.items.some(item => item.symbol === normalized) || (classes.stock_ibov.excludedByLiquidity || []).some(item => item.symbol === normalized) ? 'stock_ibov' : 'stock_other')
    : baseClass;
  const universe = classes[assetClass];
  const item = universe?.items?.find((candidate) => candidate.symbol === normalized) || null;
  const excludedItem = universe?.excludedByLiquidity?.find((candidate) => candidate.symbol === normalized) || null;
  return {
    ticker: normalized,
    assetClass,
    ...classMeta(assetClass),
    item,
    excludedItem,
    available: Boolean(item),
    excludedByLiquidity: Boolean(excludedItem)
  };
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
  const [ibovHistory, smllHistory, bdrxHistoryResult, ifixHistoryResult] = await Promise.all([
    fetchBenchmarkHistory('^BVSP'),
    fetchBenchmarkHistory('SMLL'),
    fetchBenchmarkHistory('BDRX').then(data => ({ ok: true, data })).catch(err => ({ ok: false, error: err.message })),
    fetchBenchmarkHistory('IFIX').then(data => ({ ok: true, data })).catch(err => ({ ok: false, error: err.message }))
  ]);
  const benchmarkReturns = returns(ibovHistory);
  // A composição dos índices e os preços vêm da B3. Dados de catálogo são
  // enriquecimento visual; reutilizamos o cache em vez de tornar a coleta
  // dependente de um provedor externo.
  const metadata = metadataFromCache(previous);
  const symbols = stockUniverse(metadata, [...indexSymbols, ...smallCapSymbols]);
  const histories = await fetchHistories(symbols);
  let stocksLatestDate = null;
  for (const list of histories.values()) {
    if (Array.isArray(list) && list.length) {
      const d = historyLastDate(list);
      if (d && (!stocksLatestDate || d > stocksLatestDate)) {
        stocksLatestDate = d;
      }
    }
  }
  const dataAsOf = stocksLatestDate || historyLastDate(ibovHistory) || null;
  const collected = symbols.map((symbol) => {
    const history = histories.get(symbol);
    if (!history) return { symbol, error: `Histórico indisponível para ${symbol}` };
    const assetReturns = returns(history);
    if (!Number.isFinite(assetReturns.m1) || !Number.isFinite(assetReturns.m3)) return { symbol, error: `Histórico incompleto para ${symbol}` };
    const assetLastDate = historyLastDate(history);
    if (dataAsOf && assetLastDate && assetLastDate < dataAsOf) {
      return { symbol, error: `Ativo expirado ou sem negociação no fechamento (${assetLastDate} < ${dataAsOf})` };
    }
    const details = metadata.get(symbol) || { name: symbol, sector: 'Não classificado' };
    const liquidity = LiquidityGateModel.evaluateLiquidity({
      candles: history,
      symbol,
      market: 'B3'
    });
    return { symbol, ...details, ...assetReturns, scan: scanMetrics(history), liquidity, history };
  });
  const availableEntries = collected.filter((item) => !item.error);
  const groups = splitStockUniverse(symbols, indexSymbols, smallCapSymbols);
  const select = (members) => { const set = new Set(members); return availableEntries.filter(item => set.has(item.symbol)); };

  // Separação estrita do Liquidity Gate antes do cálculo de ranking e percentis
  const ibovEntries = select(groups.ibov);
  const ibovEligible = ibovEntries.filter(item => item.liquidity?.isEligible);
  const ibovExcluded = ibovEntries.filter(item => !item.liquidity?.isEligible);
  const ibovRows = scoreStockGroup(ibovEligible, ibovHistory, 'IBOV');

  const smallEntries = select(groups.small);
  const smallEligible = smallEntries.filter(item => item.liquidity?.isEligible);
  const smallExcluded = smallEntries.filter(item => !item.liquidity?.isEligible);
  const smallRows = scoreStockGroup(smallEligible, smllHistory, 'SMLL');

  const otherEntries = select(groups.other);
  const otherEligible = otherEntries.filter(item => item.liquidity?.isEligible);
  const otherExcluded = otherEntries.filter(item => !item.liquidity?.isEligible);
  const otherBenchmarkHistory = peerBenchmarkHistory(new Map(otherEligible.map(item => [item.symbol, item.history])));
  const residualRows = otherEligible.length && Number.isFinite(returns(otherBenchmarkHistory).m3) ? scoreStockGroup(otherEligible, otherBenchmarkHistory, 'B3 fora de IBOV/SMLL') : [];
  const clean = item => { const { history, ...value } = item; return value; };

  // Unifica e ranqueia globalmente o universo stock_other (Demais ações) apenas com ativos elegíveis
  const unifiedStockOther = rank([...smallRows, ...residualRows].map(clean)).map(item => ({
    ...item,
    trendTemplate: templateReading(item.score, item.relativeTrend),
    assetClass: 'stock_other'
  }));

  const allExcludedStockOther = [...smallExcluded, ...otherExcluded].map(item => {
    const smllRet = returns(smllHistory);
    const relScore = (item.m1 - smllRet.m1) * .35 + (item.m3 - smllRet.m3) * .65;
    return clean({
      ...item,
      benchmark: 'SMLL',
      relativeTrend: relativeTrend(item.history, smllHistory),
      relativeScore: Number.isFinite(relScore) ? relScore : null,
      rank: null,
      score: null,
      trendTemplate: 'below_filter',
      assetClass: 'stock_other'
    });
  });

  const allExcludedStockIbov = ibovExcluded.map(item => {
    const ibovRet = returns(ibovHistory);
    const relScore = (item.m1 - ibovRet.m1) * .35 + (item.m3 - ibovRet.m3) * .65;
    return clean({
      ...item,
      benchmark: 'IBOV',
      relativeTrend: relativeTrend(item.history, ibovHistory),
      relativeScore: Number.isFinite(relScore) ? relScore : null,
      rank: null,
      score: null,
      trendTemplate: 'below_filter',
      assetClass: 'stock_ibov'
    });
  });

  const rows = [...ibovRows.map(clean), ...unifiedStockOther];
  if (!rows.length || (previous?.relativeStrength?.length && rows.length < previous.relativeStrength.length * .8)) throw new Error('Atualização incompleta: cache anterior preservado.');
  const catalogFii = catalogItems(FII_CATALOG, 'fii');
  const catalogBdr = bdrCatalogFromCache(previous).length ? bdrCatalogFromCache(previous) : catalogItems(BDR_CATALOG, 'bdr');
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
    dataAsOf,
    stock_ibov: {
      ...classMeta('stock_ibov'),
      dataAsOf,
      returns: benchmarkReturns,
      requested: groups.ibov.length,
      available: ibovRows.length,
      items: ibovRows.map(clean),
      excludedByLiquidity: allExcludedStockIbov
    },
    stock_other: {
      ...classMeta('stock_other'),
      dataAsOf,
      requested: groups.small.length + groups.other.length,
      available: unifiedStockOther.length,
      items: unifiedStockOther,
      excludedByLiquidity: allExcludedStockOther
    },
    fii: fiiResult.status === 'fulfilled' && fiiResult.value.available > 0 ? fiiResult.value : { ...(previous?.relativeStrengthByClass?.fii || { ...classMeta('fii'), requested: catalogFii.length, available: 0, items: [], excludedByLiquidity: [] }), error: fiiResult.reason?.message || 'Sem dados novos', dataUpdatedAt: previous?.historyUpdatedAt || previous?.updatedAt },
    bdr: bdrResult.status === 'fulfilled' && bdrResult.value.available > 0 ? bdrResult.value : { ...(previous?.relativeStrengthByClass?.bdr || { ...classMeta('bdr'), requested: catalogBdr.length, available: 0, items: [], excludedByLiquidity: [] }), error: bdrResult.reason?.message || 'Sem dados novos', dataUpdatedAt: previous?.historyUpdatedAt || previous?.updatedAt }
  };
  const bdrxHistory = bdrxHistoryResult.ok ? bdrxHistoryResult.data : null;
  const bdrxReturns = bdrxHistory ? returns(bdrxHistory) : null;
  const bdrxCycle = bdrxHistory ? scoreCycle(bdrxHistory) : (previous?.cycles?.bdr?.cycle || null);
  const bdrxBenchmark = bdrxHistory
    ? { symbol: 'BDRX', name: 'Índice de BDRs Não Patrocinados (BDRX)', returns: bdrxReturns, history: marketCycleSeries(bdrxHistory) }
    : (previous?.cycles?.bdr?.benchmark || null);

  const ifixHistory = ifixHistoryResult.ok ? ifixHistoryResult.data : null;
  const ifixReturns = ifixHistory ? returns(ifixHistory) : null;
  const ifixCycle = ifixHistory ? scoreCycle(ifixHistory) : (previous?.cycles?.fii?.cycle || null);
  const ifixBenchmark = ifixHistory
    ? { symbol: 'IFIX', name: 'Índice de Fundos de Investimentos Imobiliários (IFIX)', returns: ifixReturns, history: marketCycleSeries(ifixHistory) }
    : (previous?.cycles?.fii?.benchmark || null);

  const overview = overviewFrom(rows, ibovHistory);
  const cycles = {
    stock_b3: {
      market: 'stock_b3',
      benchmark: { symbol: 'IBOV', name: 'Índice Bovespa (IBOV)', returns: benchmarkReturns, history: marketCycleSeries(ibovHistory) },
      cycle: scoreCycle(ibovHistory),
      breadth: overview?.breadth || null
    },
    bdr: {
      market: 'bdr',
      benchmark: bdrxBenchmark,
      cycle: bdrxCycle,
      breadth: null
    },
    fii: {
      market: 'fii',
      benchmark: ifixBenchmark,
      cycle: ifixCycle,
      breadth: null
    }
  };

  const cache = { updatedAt: new Date().toISOString(), dataAsOf, b3CotahistDate: stocksLatestDate, b3IndexDate: ibovHistory.at(-1)?.date || null, source: histories.source === 'b3-cotahist' && ibovHistory.source === 'b3-indexes' && smllHistory.source === 'b3-indexes' ? 'b3-cotahist + b3-indexes' : 'brapi-fallback', universe: { scope: 'b3-stocks-and-units', requested: symbols.length, available: rows.length, unavailable: collected.filter(item => item.error).map(item => ({ symbol: item.symbol, reason: item.error })) }, cycle: scoreCycle(ibovHistory), benchmark: { symbol: 'IBOV', returns: benchmarkReturns, history: marketCycleSeries(ibovHistory) }, cycles, relativeStrength: rows, relativeStrengthByClass, relativeStrengthByClassWeekly: previous?.relativeStrengthByClassWeekly || null, overview };
  cache.historyUpdatedAt = cache.updatedAt;
  await writeCache(cache);
  try {
    const tickerChart = require('./ticker-chart');
    if (typeof tickerChart.invalidateB3HistoryCache === 'function') {
      tickerChart.invalidateB3HistoryCache();
    }
  } catch {}
  return cache;
}
async function collectClassStrength(cache) {
  if (!cache) return cache;
  if (cache?.relativeStrengthByClass?.fii?.requested === FII_CATALOG.length && cache?.relativeStrengthByClass?.fii?.available > 0 && cache?.relativeStrengthByClass?.bdr?.catalogVersion === BDR_CATALOG_VERSION && cache?.relativeStrengthByClass?.bdr?.available === BDR_CATALOG.length) return cache;
  const catalogFii = catalogItems(FII_CATALOG, 'fii');
  const catalogBdr = bdrCatalogFromCache(cache);
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
function historyDate(value) {
  const raw = String(value || '').trim();
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? isoDate(parsed) : null;
}
function getStocksDataAsOf(cache) {
  if (cache?.dataAsOf) return cache.dataAsOf;
  if (cache?.b3CotahistDate) return cache.b3CotahistDate;
  if (cache?.relativeStrengthByClass?.dataAsOf) return cache.relativeStrengthByClass.dataAsOf;
  try {
    const tickerChart = require('./ticker-chart');
    const b3Hist = tickerChart.loadB3History();
    const petr = b3Hist?.get('PETR4');
    if (petr && petr.length) {
      const d = petr[petr.length - 1]?.time;
      if (d) return d.replace(/-/g, '');
    }
  } catch {}
  return cache?.overview?.benchmarkHistory?.at(-1)?.date || null;
}

function hasCurrentHistoricalClose(cache, now = new Date()) {
  const targetDate = isoDate(now);
  const benchmarkDate = historyDate(cache?.overview?.benchmarkHistory?.at(-1)?.date);
  if (benchmarkDate && benchmarkDate !== targetDate) return false;

  const stocksDate = historyDate(cache?.dataAsOf || cache?.b3CotahistDate || cache?.relativeStrengthByClass?.dataAsOf);
  if (stocksDate) {
    return stocksDate === targetDate;
  }
  return benchmarkDate === targetDate;
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
function previousBusinessDay(date = new Date()) {
  const d = new Date(date);
  do {
    d.setDate(d.getDate() - 1);
  } while (!isBusinessDay(d));
  return isoDate(d);
}

function expectedClosingDate(now = new Date()) {
  const parts = saoPauloParts(now);
  const hour = Number(parts.hour);
  const isBday = isBusinessDay(now);
  if (isBday && hour >= 19) return isoDate(now);
  return previousBusinessDay(now);
}

async function refreshIfDue(now = new Date()) {
  const cached = await readCache();
  if (!cached) return refreshMarketData();
  const afterClose = Number(saoPauloParts(now).hour) >= 19;
  const isBday = isBusinessDay(now);
  const historicalDate = cached?.historyUpdatedAt || (!cached?.liveUpdatedAt ? cached?.updatedAt : null);
  const isHistoricalToday = historicalDate && isoDate(new Date(historicalDate)) === isoDate(now);

  if (isBday && afterClose && isHistoricalToday && hasCurrentHistoricalClose(cached, now)) {
    return cached;
  }

  const latestClose = historyDate(cached?.dataAsOf || cached?.overview?.benchmarkHistory?.at(-1)?.date);
  const expectedDate = expectedClosingDate(now);
  if (latestClose && latestClose >= expectedDate) {
    if (!isBday || !afterClose || hasCurrentHistoricalClose(cached, now)) {
      return cached;
    }
  }

  return refreshMarketData();
}

function refreshMarketData({ force = false, fallback = true, minInterval = 15 * 60 * 1000 } = {}) { return refreshControl.run('daily', collectMarketData, { force, fallback, minInterval }); }
function refreshClassStrength(cache) {
  if (!cache || (cache.relativeStrengthByClass?.fii?.requested === FII_CATALOG.length && cache.relativeStrengthByClass?.fii?.available > 0 && cache.relativeStrengthByClass?.bdr?.catalogVersion === BDR_CATALOG_VERSION && cache.relativeStrengthByClass?.bdr?.available === BDR_CATALOG.length)) return Promise.resolve(cache);
  return refreshControl.run('classes', async () => collectClassStrength(await readCache() || cache), { minInterval: 24 * 3600000 });
}
function refreshLiveScanQuotes(cache, now = new Date()) {
  // B3/COTAHIST closing data is the default source. BRAPI live quotes stay an
  // explicit contingency, never an implicit overlay on the Market Scans.
  if (process.env.ENABLE_BRAPI_LIVE_SCANS !== 'true') return Promise.resolve(cache);
  if (!cache || !isMarketOpen(now) || isFresh(cache.liveUpdatedAt, now, LIVE_QUOTE_MINUTES)) return Promise.resolve(cache);
  return refreshControl.run('live', async () => collectLiveScanQuotes(await readCache() || cache, now), { minInterval: LIVE_QUOTE_MINUTES * 60000 });
}
async function marketDataStatus() {
  const state = await brapi.status();
  return { blockedUntil: state.blockedUntil > Date.now() ? new Date(state.blockedUntil).toISOString() : null, reason: state.code, requestsToday: state.usage?.[new Date().toISOString().slice(0, 10)] || 0, trackedRequests: Object.values(state.usage || {}).reduce((a,b)=>a+b,0), liveQuoteIntervalMinutes: LIVE_QUOTE_MINUTES };
}

const US_BENCHMARKS_CACHE_PATH = path.join(__dirname, '..', 'data', 'us-benchmarks-cache.json');

async function loadUsBenchmarkCandlesForMarketData(marketId, options = {}) {
  try {
    const marketRegime = require('./market-regime');
    if (typeof marketRegime.loadUsBenchmarkCandles === 'function') {
      return await marketRegime.loadUsBenchmarkCandles(marketId, options);
    }
  } catch (err) {
    console.warn(`[market-data] Falha ao delegar loadUsBenchmarkCandles (${marketId}):`, err.message);
  }
  return [];
}

function marketCycleFor(cache, market = 'stock_b3') {
  const normalized = String(market || 'stock_b3').trim().toLowerCase();
  const supportedMarkets = ['stock_b3', 'bdr', 'fii', 'sp500', 'nasdaq'];

  if (['sp500', 'spx', 'spy'].includes(normalized)) {
    const entry = cache?.cycles?.sp500;
    if (entry?.cycle && entry?.benchmark) {
      return {
        updatedAt: entry.updatedAt || cache?.updatedAt || new Date().toISOString(),
        source: entry.source || 'twelve_data',
        cycle: entry.cycle,
        benchmark: entry.benchmark,
        breadth: entry.breadth || null,
        freshness: entry.freshness || null,
        market: 'sp500',
        supportedMarkets
      };
    }
    return {
      updatedAt: cache?.updatedAt || new Date().toISOString(),
      source: 'twelve_data',
      cycle: { state: 'defensive', score: 25, reason: 'Histórico do S&P 500 indisponível no momento.' },
      benchmark: { symbol: 'SPY', name: 'S&P 500 (SPY)', returns: { m1: 0, m3: 0 }, history: [] },
      breadth: null,
      market: 'sp500',
      supportedMarkets
    };
  }

  if (['nasdaq', 'ndx', 'qqq'].includes(normalized)) {
    const entry = cache?.cycles?.nasdaq;
    if (entry?.cycle && entry?.benchmark) {
      return {
        updatedAt: entry.updatedAt || cache?.updatedAt || new Date().toISOString(),
        source: entry.source || 'twelve_data',
        cycle: entry.cycle,
        benchmark: entry.benchmark,
        breadth: entry.breadth || null,
        freshness: entry.freshness || null,
        market: 'nasdaq',
        supportedMarkets
      };
    }
    return {
      updatedAt: cache?.updatedAt || new Date().toISOString(),
      source: 'twelve_data',
      cycle: { state: 'defensive', score: 25, reason: 'Histórico do Nasdaq-100 indisponível no momento.' },
      benchmark: { symbol: 'QQQ', name: 'Nasdaq-100 (QQQ)', returns: { m1: 0, m3: 0 }, history: [] },
      breadth: null,
      market: 'nasdaq',
      supportedMarkets
    };
  }

  if (['bdr', 'bdrx'].includes(normalized)) {
    const entry = cache?.cycles?.bdr;
    if (entry?.cycle && entry?.benchmark) {
      return {
        updatedAt: entry.updatedAt || cache?.updatedAt || new Date().toISOString(),
        source: entry.source || cache?.source || 'b3-indexes',
        cycle: entry.cycle,
        benchmark: entry.benchmark,
        breadth: entry.breadth || null,
        freshness: entry.freshness || null,
        market: 'bdr',
        supportedMarkets
      };
    }
    return {
      updatedAt: cache?.updatedAt || new Date().toISOString(),
      source: cache?.source || 'b3-indexes',
      cycle: { state: 'defensive', score: 25, reason: 'Histórico do BDRX indisponível no momento.' },
      benchmark: { symbol: 'BDRX', name: 'Índice de BDRs Não Patrocinados (BDRX)', returns: { m1: 0, m3: 0 }, history: [] },
      breadth: null,
      market: 'bdr',
      supportedMarkets
    };
  }
  if (['fii', 'fiis', 'ifix'].includes(normalized)) {
    const entry = cache?.cycles?.fii;
    if (entry?.cycle && entry?.benchmark) {
      return {
        updatedAt: entry.updatedAt || cache?.updatedAt || new Date().toISOString(),
        source: entry.source || cache?.source || 'b3-indexes',
        cycle: entry.cycle,
        benchmark: entry.benchmark,
        breadth: entry.breadth || null,
        freshness: entry.freshness || null,
        market: 'fii',
        supportedMarkets
      };
    }
    return {
      updatedAt: cache?.updatedAt || new Date().toISOString(),
      source: cache?.source || 'b3-indexes',
      cycle: { state: 'defensive', score: 25, reason: 'Histórico do IFIX indisponível no momento.' },
      benchmark: { symbol: 'IFIX', name: 'Índice de Fundos de Investimentos Imobiliários (IFIX)', returns: { m1: 0, m3: 0 }, history: [] },
      breadth: null,
      market: 'fii',
      supportedMarkets
    };
  }
  const entry = cache?.cycles?.stock_b3;
  return {
    updatedAt: entry?.updatedAt || cache?.updatedAt || null,
    source: entry?.source || cache?.source || null,
    cycle: entry?.cycle || cache?.cycle || null,
    benchmark: entry?.benchmark || cache?.benchmark || null,
    breadth: entry?.breadth || cache?.overview?.breadth || null,
    freshness: entry?.freshness || null,
    market: 'stock_b3',
    supportedMarkets
  };
}

function isCycleEntryNeedsRefresh(entry, marketType = 'BR', options = {}) {
  if (options.force) return true;
  if (!entry || (!entry.cycle?.ema10 && !entry.cycle?.ema9) || !entry.benchmark?.history?.length) return true;
  if (entry.cycle?.emaSlowPeriod !== 30) return true;
  try {
    const marketRegime = require('./market-regime');
    const now = options.now ? new Date(options.now) : new Date();
    const expectedClosed = marketRegime.getExpectedClosedDate(marketType, now);
    const entryDate = marketRegime.formatDateIso(entry.cycle?.date || entry.benchmark?.history?.at(-1)?.date);
    if (!entryDate || entryDate < expectedClosed || entryDate > expectedClosed) {
      return true;
    }
  } catch (_) {}
  return false;
}

async function resolveMarketCycle(cache, market = 'stock_b3', options = {}) {
  const normalized = String(market || 'stock_b3').trim().toLowerCase();
  const marketRegime = require('./market-regime');
  const now = options.now ? new Date(options.now) : new Date();

  if (['sp500', 'spx', 'spy'].includes(normalized)) {
    if (isCycleEntryNeedsRefresh(cache?.cycles?.sp500, 'US', options)) {
      try {
        const spyHistory = await loadUsBenchmarkCandlesForMarketData('SP500', options);
        if (spyHistory?.length >= 25) {
          const spyReturns = returns(spyHistory);
          const spyCycle = scoreCycle(spyHistory);
          const spyBenchmark = {
            symbol: 'SPY',
            name: 'S&P 500 (SPY)',
            returns: spyReturns,
            history: marketCycleSeries(spyHistory)
          };
          if (cache) {
            cache.cycles = cache.cycles || {};
            cache.cycles.sp500 = {
              updatedAt: now.toISOString(),
              source: 'twelve_data',
              market: 'sp500',
              benchmark: spyBenchmark,
              cycle: spyCycle,
              breadth: null
            };
          }
        }
      } catch (err) {
        console.warn('[market-data] Falha ao atualizar ciclo SP500:', err.message);
      }
    }
    return marketCycleFor(cache, 'sp500');
  }

  if (['nasdaq', 'ndx', 'qqq'].includes(normalized)) {
    if (isCycleEntryNeedsRefresh(cache?.cycles?.nasdaq, 'US', options)) {
      try {
        const qqqHistory = await loadUsBenchmarkCandlesForMarketData('NASDAQ', options);
        if (qqqHistory?.length >= 25) {
          const qqqReturns = returns(qqqHistory);
          const qqqCycle = scoreCycle(qqqHistory);
          const qqqBenchmark = {
            symbol: 'QQQ',
            name: 'Nasdaq-100 (QQQ)',
            returns: qqqReturns,
            history: marketCycleSeries(qqqHistory)
          };
          if (cache) {
            cache.cycles = cache.cycles || {};
            cache.cycles.nasdaq = {
              updatedAt: now.toISOString(),
              source: 'twelve_data',
              market: 'nasdaq',
              benchmark: qqqBenchmark,
              cycle: qqqCycle,
              breadth: null
            };
          }
        }
      } catch (err) {
        console.warn('[market-data] Falha ao atualizar ciclo NASDAQ:', err.message);
      }
    }
    return marketCycleFor(cache, 'nasdaq');
  }

  if (['bdr', 'bdrx'].includes(normalized)) {
    if (isCycleEntryNeedsRefresh(cache?.cycles?.bdr, 'BR', options)) {
      try {
        const rawBdrx = await fetchBenchmarkHistory('BDRX');
        const bdrxHistory = marketRegime.filterClosedDailyCandles(rawBdrx, 'BR', now);
        if (bdrxHistory?.length >= 25) {
          const bdrxReturns = returns(bdrxHistory);
          const bdrxCycle = scoreCycle(bdrxHistory);
          const bdrxBenchmark = {
            symbol: 'BDRX',
            name: 'Índice de BDRs Não Patrocinados (BDRX)',
            returns: bdrxReturns,
            history: marketCycleSeries(bdrxHistory)
          };
          if (cache) {
            cache.cycles = cache.cycles || {};
            cache.cycles.bdr = {
              updatedAt: now.toISOString(),
              source: 'b3-indexes',
              market: 'bdr',
              benchmark: bdrxBenchmark,
              cycle: bdrxCycle,
              breadth: null
            };
          }
        }
      } catch (err) {
        console.warn('[market-data] Falha ao atualizar ciclo BDRX:', err.message);
      }
    }
    return marketCycleFor(cache, 'bdr');
  }

  if (['fii', 'fiis', 'ifix'].includes(normalized)) {
    if (isCycleEntryNeedsRefresh(cache?.cycles?.fii, 'BR', options)) {
      try {
        const rawIfix = await fetchBenchmarkHistory('IFIX');
        const ifixHistory = marketRegime.filterClosedDailyCandles(rawIfix, 'BR', now);
        if (ifixHistory?.length >= 25) {
          const ifixReturns = returns(ifixHistory);
          const ifixCycle = scoreCycle(ifixHistory);
          const ifixBenchmark = {
            symbol: 'IFIX',
            name: 'Índice de Fundos de Investimentos Imobiliários (IFIX)',
            returns: ifixReturns,
            history: marketCycleSeries(ifixHistory)
          };
          if (cache) {
            cache.cycles = cache.cycles || {};
            cache.cycles.fii = {
              updatedAt: now.toISOString(),
              source: 'b3-indexes',
              market: 'fii',
              benchmark: ifixBenchmark,
              cycle: ifixCycle,
              breadth: null
            };
          }
        }
      } catch (err) {
        console.warn('[market-data] Falha ao atualizar ciclo IFIX:', err.message);
      }
    }
    return marketCycleFor(cache, 'fii');
  }

  if (isCycleEntryNeedsRefresh(cache?.cycles?.stock_b3, 'BR', options) || (!cache?.cycle?.ema10 && !cache?.cycle?.ema9)) {
    try {
      const rawIbov = await fetchBenchmarkHistory('^BVSP');
      const ibovHistory = marketRegime.filterClosedDailyCandles(rawIbov, 'BR', now);
      if (ibovHistory?.length >= 25) {
        const ibovReturns = returns(ibovHistory);
        const ibovCycle = scoreCycle(ibovHistory);
        const ibovBenchmark = {
          symbol: 'IBOV',
          name: 'Índice Bovespa (IBOV)',
          returns: ibovReturns,
          history: marketCycleSeries(ibovHistory)
        };
        if (cache) {
          cache.cycle = ibovCycle;
          cache.benchmark = ibovBenchmark;
          cache.cycles = cache.cycles || {};
          cache.cycles.stock_b3 = {
            updatedAt: now.toISOString(),
            source: 'b3-indexes',
            market: 'stock_b3',
            benchmark: ibovBenchmark,
            cycle: ibovCycle,
            breadth: cache.overview?.breadth || null
          };
        }
      }
    } catch (err) {
      console.warn('[market-data] Falha ao atualizar ciclo IBOV:', err.message);
    }
  }

  return marketCycleFor(cache, 'stock_b3');
}

module.exports = { fetchHistory, fetchBenchmarkHistory, fetchHistories, readCache, refreshMarketData, refreshIfDue, refreshClassStrength, refreshLiveScanQuotes, marketDataStatus, scoreCycle, marketCycleSeries, calculateEmaSeries, returns, relativeTrend, templateReading, scanMetrics, rank, overviewFrom, assetClassForSymbol, classMeta, classStrengthFromCache, classStrengthWeeklyFromCache, classifyAsset, historyRangeFor, mergeLiveQuote, historyDate, hasCurrentHistoricalClose, previousBusinessDay, expectedClosingDate, marketCycleFor, resolveMarketCycle, getStocksDataAsOf };

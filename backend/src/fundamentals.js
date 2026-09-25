const fs = require('node:fs/promises');
const path = require('node:path');
const { CACHE_FILE: FUNDAMENTUS_FILE } = require('./fundamentus');
const FUNDAMENTALS_TTL = 1000 * 60 * 60 * 12;
const DATA_FILE = path.join(__dirname, '..', 'data', 'fundamentals-cvm.json');
const BDR_DATA_FILE = path.join(__dirname, '..', 'data', 'fundamentals-bdr.json');

let memory = { loadedAt: 0, data: null };
let fundamentusMemory = { loadedAt: 0, modifiedAt: 0, data: null };
let bdrMemory = { loadedAt: 0, data: null };

const ticker = (value) => String(value || '').replace(/\s/g, '').toUpperCase();

async function loadCvmCache() {
  if (memory.data && Date.now() - memory.loadedAt < FUNDAMENTALS_TTL) return memory.data;
  try {
    memory.data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    memory.loadedAt = Date.now();
    return memory.data;
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('Dados fundamentalistas da CVM ainda não foram sincronizados. Execute npm run refresh:fundamentals no backend.');
    throw error;
  }
}

async function loadFundamentusCache() {
  try {
    const metadata = await fs.stat(FUNDAMENTUS_FILE);
    if (fundamentusMemory.data && fundamentusMemory.modifiedAt === metadata.mtimeMs) return fundamentusMemory.data;
    fundamentusMemory.data = JSON.parse(await fs.readFile(FUNDAMENTUS_FILE, 'utf8'));
    fundamentusMemory.loadedAt = Date.now();
    fundamentusMemory.modifiedAt = metadata.mtimeMs;
    return fundamentusMemory.data;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function loadBdrCache() {
  if (bdrMemory.data && Date.now() - bdrMemory.loadedAt < FUNDAMENTALS_TTL) return bdrMemory.data;
  try {
    bdrMemory.data = JSON.parse(await fs.readFile(BDR_DATA_FILE, 'utf8'));
    bdrMemory.loadedAt = Date.now();
    return bdrMemory.data;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function enrichBdrMarket(entry) {
  try {
    const marketCacheFile = path.join(__dirname, '..', 'data', 'market-cache.json');
    const raw = await fs.readFile(marketCacheFile, 'utf8');
    const cache = JSON.parse(raw);
    const bdrs = cache?.relativeStrengthByClass?.bdr?.items || [];
    const bdrMatch = bdrs.find((item) => item.symbol === entry.bdrTicker || item.symbol === entry.ticker);
    if (bdrMatch?.scan?.price) {
      return {
        ...entry,
        market: {
          ...entry.market,
          price: bdrMatch.scan.price,
          changePct: bdrMatch.scan.dayChangePct ?? entry.market?.changePct
        }
      };
    }
  } catch {
    // Retorna os dados com o mercado padrão em caso de indisponibilidade do cache de mercado
  }
  return entry;
}

function mergeFundamentals(cvm, fundamentus, clean) {
  if (!cvm && !fundamentus) throw new Error(`Ticker ${clean} não encontrado na base CVM sincronizada ou no cache Fundamentus.`);
  return {
    ...cvm,
    ...fundamentus,
    ticker: clean,
    company: { ...(cvm?.company || {}), ...(fundamentus?.company || {}) },
    market: { ...(cvm?.market || {}), ...(fundamentus?.market || {}) },
    metrics: { ...(cvm?.metrics || {}), ...(fundamentus?.metrics || {}) },
    incomeHistory: cvm?.incomeHistory || [],
    dividendYears: cvm?.dividendYears || 0,
    provider: [cvm && 'CVM Dados Abertos', fundamentus && 'Fundamentus'].filter(Boolean).join(' + '),
    fetchedAt: fundamentus?.fetchedAt || cvm?.fetchedAt
  };
}

async function fetchFundamentals(symbol) {
  const clean = ticker(symbol);
  if (!clean) throw new Error('Ticker inválido');

  // 1. Tenta localizar na base de BDRs / mercado internacional (aceita código BDR ou ticker original dos EUA)
  const bdrDatabase = await loadBdrCache().catch(() => null);
  if (bdrDatabase?.companies) {
    if (bdrDatabase.companies[clean]) {
      return enrichBdrMarket(bdrDatabase.companies[clean]);
    }
    const cleanNoDot = clean.replace(/\./g, '');
    if (bdrDatabase.companies[cleanNoDot]) {
      return enrichBdrMarket(bdrDatabase.companies[cleanNoDot]);
    }
  }

  // 2. Validação estrita para tickers domésticos da B3
  if (!/^[A-Z]{4}\d{1,2}$/.test(clean)) {
    throw new Error('Ticker B3 inválido');
  }

  // 3. Consulta as bases CVM e Fundamentus
  const [cvmDatabase, fundamentus] = await Promise.all([loadCvmCache().catch(() => null), loadFundamentusCache()]);
  const cvm = cvmDatabase?.companies?.[clean] ? { ...cvmDatabase.companies[clean], fetchedAt: cvmDatabase.updatedAt } : null;
  return mergeFundamentals(cvm, fundamentus?.companies?.[clean], clean);
}

function clearFundamentalsCache() {
  memory = { loadedAt: 0, data: null };
  fundamentusMemory = { loadedAt: 0, modifiedAt: 0, data: null };
  bdrMemory = { loadedAt: 0, data: null };
}

module.exports = {
  fetchFundamentals,
  ticker,
  FUNDAMENTALS_TTL,
  clearFundamentalsCache,
  DATA_FILE,
  BDR_DATA_FILE
};

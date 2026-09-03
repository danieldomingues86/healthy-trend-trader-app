const fs = require('node:fs/promises');
const path = require('node:path');
const { CACHE_FILE: FUNDAMENTUS_FILE } = require('./fundamentus');
const FUNDAMENTALS_TTL = 1000 * 60 * 60 * 12;
const DATA_FILE = path.join(__dirname, '..', 'data', 'fundamentals-cvm.json');
let memory = { loadedAt: 0, data: null };
let fundamentusMemory = { loadedAt: 0, modifiedAt: 0, data: null };
const ticker = (value) => String(value || '').replace(/\s/g, '').toUpperCase();
async function loadCvmCache() { if (memory.data && Date.now() - memory.loadedAt < FUNDAMENTALS_TTL) return memory.data; try { memory.data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); memory.loadedAt = Date.now(); return memory.data; } catch (error) { if (error.code === 'ENOENT') throw new Error('Dados fundamentalistas da CVM ainda não foram sincronizados. Execute npm run refresh:fundamentals no backend.'); throw error; } }
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
function mergeFundamentals(cvm, fundamentus, clean) { if (!cvm && !fundamentus) throw new Error(`Ticker ${clean} não encontrado na base CVM sincronizada ou no cache Fundamentus.`); return { ...cvm, ...fundamentus, ticker: clean, company: { ...(cvm?.company || {}), ...(fundamentus?.company || {}) }, market: { ...(cvm?.market || {}), ...(fundamentus?.market || {}) }, metrics: { ...(cvm?.metrics || {}), ...(fundamentus?.metrics || {}) }, incomeHistory: cvm?.incomeHistory || [], dividendYears: cvm?.dividendYears || 0, provider: [cvm && 'CVM Dados Abertos', fundamentus && 'Fundamentus'].filter(Boolean).join(' + '), fetchedAt: fundamentus?.fetchedAt || cvm?.fetchedAt }; }
async function fetchFundamentals(symbol) { const clean = ticker(symbol); if (!/^[A-Z]{4}\d{1,2}$/.test(clean)) throw new Error('Ticker B3 inválido'); const [cvmDatabase, fundamentus] = await Promise.all([loadCvmCache().catch(() => null), loadFundamentusCache()]); const cvm = cvmDatabase?.companies?.[clean] ? { ...cvmDatabase.companies[clean], fetchedAt: cvmDatabase.updatedAt } : null; return mergeFundamentals(cvm, fundamentus?.companies?.[clean], clean); }
function clearFundamentalsCache() { memory = { loadedAt: 0, data: null }; fundamentusMemory = { loadedAt: 0, modifiedAt: 0, data: null }; }
module.exports = { fetchFundamentals, ticker, FUNDAMENTALS_TTL, clearFundamentalsCache, DATA_FILE };

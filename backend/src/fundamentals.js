const fs = require('node:fs/promises');
const path = require('node:path');
const FUNDAMENTALS_TTL = 1000 * 60 * 60 * 12;
const DATA_FILE = path.join(__dirname, '..', 'data', 'fundamentals-cvm.json');
let memory = { loadedAt: 0, data: null };
const ticker = (value) => String(value || '').replace(/\s/g, '').toUpperCase();
async function loadCvmCache() { if (memory.data && Date.now() - memory.loadedAt < FUNDAMENTALS_TTL) return memory.data; try { memory.data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); memory.loadedAt = Date.now(); return memory.data; } catch (error) { if (error.code === 'ENOENT') throw new Error('Dados fundamentalistas da CVM ainda não foram sincronizados. Execute npm run refresh:fundamentals no backend.'); throw error; } }
async function fetchFundamentals(symbol) { const clean = ticker(symbol); if (!/^[A-Z]{4}\d{1,2}$/.test(clean)) throw new Error('Ticker B3 inválido'); const database = await loadCvmCache(); const value = database.companies?.[clean]; if (!value) throw new Error(`Ticker ${clean} não encontrado na base CVM sincronizada.`); return { ...value, ticker: clean, provider: 'CVM Dados Abertos', fetchedAt: database.updatedAt }; }
function clearFundamentalsCache() { memory = { loadedAt: 0, data: null }; }
module.exports = { fetchFundamentals, ticker, FUNDAMENTALS_TTL, clearFundamentalsCache, DATA_FILE };

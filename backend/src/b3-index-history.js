const fs = require('node:fs/promises');
const path = require('node:path');

const B3_INDEX_HISTORY_API = 'https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay/';
const INDEX_CODES = { '^BVSP': 'IBOV', IBOV: 'IBOV', SMLL: 'SMLL', IFIX: 'IFIX' };

function b3IndexCode(symbol) {
  return INDEX_CODES[String(symbol || '').trim().toUpperCase()] || null;
}

function encodePayload(index, year) {
  return Buffer.from(JSON.stringify({ language: 'pt-br', index, year: String(year) })).toString('base64');
}

function parseB3Number(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value || '').trim().replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseYearMatrix(year, payload) {
  const rows = [];
  for (const entry of payload?.results || []) {
    const day = Number(entry?.day);
    if (!Number.isInteger(day) || day < 1 || day > 31) continue;
    for (let month = 1; month <= 12; month += 1) {
      const close = parseB3Number(entry[`rateValue${month}`]);
      if (!Number.isFinite(close) || close <= 0) continue;
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) continue;
      rows.push({ date: `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`, close });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

async function readYear(cacheDirectory, index, year) {
  if (!cacheDirectory) return null;
  try { return JSON.parse(await fs.readFile(path.join(cacheDirectory, `b3-index-${index}-${year}.json`), 'utf8')); } catch { return null; }
}

async function writeYear(cacheDirectory, index, year, payload) {
  if (!cacheDirectory) return;
  await fs.mkdir(cacheDirectory, { recursive: true });
  await fs.writeFile(path.join(cacheDirectory, `b3-index-${index}-${year}.json`), JSON.stringify(payload));
}

async function fetchIndexHistory(symbol, { years, fetchImpl = fetch, cacheDirectory } = {}) {
  const index = b3IndexCode(symbol);
  if (!index) throw new Error(`Índice B3 não suportado: ${symbol}`);
  const selectedYears = [...new Set((years || []).map(Number).filter(Number.isInteger))];
  if (!selectedYears.length) throw new Error('Informe ao menos um ano para o histórico do índice B3.');
  const observations = new Map();
  for (const year of selectedYears) {
    let payload = await readYear(cacheDirectory, index, year);
    if (!payload) {
      const url = `${B3_INDEX_HISTORY_API}${encodePayload(index, year)}`;
      const response = await fetchImpl(url, { headers: { 'User-Agent': 'Healthy Trend Trader/1.0' } });
      if (!response.ok) throw Object.assign(new Error(`B3 índices HTTP ${response.status}`), { status: response.status });
      payload = await response.json();
      await writeYear(cacheDirectory, index, year, payload);
    }
    for (const item of parseYearMatrix(year, payload)) observations.set(item.date, item);
  }
  const history = [...observations.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (!history.length) throw new Error(`Sem histórico B3 para ${index}.`);
  Object.defineProperty(history, 'source', { value: 'b3-indexes', enumerable: false });
  return history;
}

module.exports = { b3IndexCode, encodePayload, parseB3Number, parseYearMatrix, fetchIndexHistory };

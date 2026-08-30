const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

let pool;
let migrated = false;

function configured() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!configured()) throw new Error('Banco de dados não configurado. Defina DATABASE_URL no .env do backend.');
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

async function query(text, values) {
  return getPool().query(text, values);
}

async function migrate() {
  if (!configured() || migrated) return;
  const directory = path.join(__dirname, '..', 'db', 'migrations');
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) await query(await fs.readFile(path.join(directory, file), 'utf8'));
  migrated = true;
}

module.exports = { configured, query, migrate };

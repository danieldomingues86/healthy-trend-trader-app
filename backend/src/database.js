const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

let pool;
let migrated = false;

function configured() {
  return Boolean(process.env.DATABASE_URL);
}

function formatDbError(error) {
  if (!error) return error;
  if (error.code === 'ENOTFOUND' && error.hostname && error.hostname.includes('supabase.co')) {
    const message = `Falha de resolução DNS (${error.hostname}). Conexões diretas do Supabase exigem conectividade IPv6. Em redes IPv4, configure a URL do Connection Pooler (ex: aws-0-sa-east-1.pooler.supabase.com:5432) no DATABASE_URL.`;
    const wrapped = new Error(message);
    wrapped.code = error.code;
    wrapped.syscall = error.syscall;
    wrapped.hostname = error.hostname;
    return wrapped;
  }
  return error;
}

function getPool() {
  if (!configured()) throw new Error('Banco de dados não configurado. Defina DATABASE_URL no .env do backend.');
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    pool.on('error', (err) => {
      console.error('[database pool error]', formatDbError(err).message);
    });
  }
  return pool;
}

async function query(text, values) {
  try {
    return await getPool().query(text, values);
  } catch (error) {
    throw formatDbError(error);
  }
}

async function transaction(work) {
  let client;
  try {
    client = await getPool().connect();
  } catch (error) {
    throw formatDbError(error);
  }
  try {
    await client.query('BEGIN');
    const result = await work({ query: (text, values) => client.query(text, values) });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw formatDbError(error);
  } finally {
    client.release();
  }
}

async function migrate() {
  if (!configured() || migrated) return;
  const directory = path.join(__dirname, '..', 'db', 'migrations');
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = (await fs.readFile(path.join(directory, file), 'utf8')).replace(/^\uFEFF/, '');
    await query(sql);
  }
  migrated = true;
}

module.exports = { configured, query, transaction, migrate };

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const database = require('./database');

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [salt, expected] = String(stored || '').split(':');
  if (!salt || !expected) return false;
  const derived = await scrypt(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return expectedBuffer.length === derived.length && crypto.timingSafeEqual(expectedBuffer, derived);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function ensureAdmin() {
  if (!database.configured()) return false;
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return false;
  const existing = await database.query('SELECT id FROM app.app_users WHERE email = $1', [email]);
  if (existing.rowCount) return false;
  if (password.length < 12) throw new Error('ADMIN_PASSWORD precisa ter ao menos 12 caracteres.');
  await database.query(
    'INSERT INTO app.app_users (id, email, password_hash, display_name, role) VALUES ($1, $2, $3, $4, $5)',
    [crypto.randomUUID(), email, await hashPassword(password), process.env.ADMIN_NAME || 'Administrador', 'admin']
  );
  console.log(`[auth] Administrador inicial criado para ${email}`);
  return true;
}

async function login(email, password) {
  const normalized = normalizeEmail(email);
  const result = await database.query('SELECT id, email, display_name, role, password_hash FROM app.app_users WHERE email = $1 AND active = true', [normalized]);
  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) return null;
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await database.query('INSERT INTO app.app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [hashToken(token), user.id, expiresAt]);
  return { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) };
}

function publicUser(user) {
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role };
}

async function session(token) {
  if (!token) return null;
  const result = await database.query(
    `SELECT u.id, u.email, u.display_name, u.role
       FROM app.app_sessions s JOIN app.app_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active = true`,
    [hashToken(token)]
  );
  return result.rows[0] ? publicUser(result.rows[0]) : null;
}

async function logout(token) {
  if (token) await database.query('DELETE FROM app.app_sessions WHERE token_hash = $1', [hashToken(token)]);
}

module.exports = { ensureAdmin, hashPassword, login, logout, session, verifyPassword };

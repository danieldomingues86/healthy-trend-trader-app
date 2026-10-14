const crypto = require('node:crypto');
const { promisify } = require('node:util');
const database = require('./database');
const emailService = require('./email-service');

const scrypt = promisify(crypto.scrypt);
const SESSION_DAYS = 30;
const TRIAL_DAYS = 7;
const PLAN_TYPES = new Set(['TRIAL', 'BASIC', 'PROFESSIONAL']);

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
    'INSERT INTO app.app_users (id, email, password_hash, display_name, role, plan_type, account_status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [crypto.randomUUID(), email, await hashPassword(password), process.env.ADMIN_NAME || 'Administrador', 'admin', 'PROFESSIONAL', 'active']
  );
  console.log(`[auth] Administrador inicial criado para ${email}`);
  return true;
}

function normalizePlanType(value) {
  const plan = String(value || '').trim().toUpperCase();
  return PLAN_TYPES.has(plan) ? plan : null;
}

function validateRegistration({ name, email, password, planType, acceptedTerms } = {}) {
  const displayName = String(name || '').trim().replace(/\s+/g, ' ');
  const normalizedEmail = normalizeEmail(email);
  const selectedPlan = normalizePlanType(planType);
  if (displayName.length < 2 || displayName.length > 120) return { error: 'Informe seu nome completo.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) return { error: 'Informe um e-mail válido.' };
  if (String(password || '').length < 10) return { error: 'A senha precisa ter ao menos 10 caracteres.' };
  if (!selectedPlan) return { error: 'Escolha Trial, Básico ou Profissional.' };
  if (acceptedTerms !== true) return { error: 'É necessário aceitar os Termos de Uso e a Política de Privacidade.' };
  return { displayName, email: normalizedEmail, password: String(password), planType: selectedPlan };
}

async function createSession(user, client = database) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await client.query('INSERT INTO app.app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)', [hashToken(token), user.id, expiresAt]);
  return { token, expiresAt: expiresAt.toISOString(), user: publicUser(user) };
}

async function register(payload) {
  const input = validateRegistration(payload);
  if (input.error) { const error = new Error(input.error); error.status = 400; throw error; }
  const now = new Date();
  const trialEnd = input.planType === 'TRIAL' ? new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000) : null;
  try {
    const session = await database.transaction(async (client) => {
      const user = {
        id: crypto.randomUUID(), email: input.email, display_name: input.displayName, role: 'member',
        plan_type: input.planType, account_status: input.planType === 'TRIAL' ? 'trial' : 'active',
        trial_start_date: input.planType === 'TRIAL' ? now : null, trial_end_date: trialEnd
      };
      await client.query(
        `INSERT INTO app.app_users
          (id, email, password_hash, display_name, role, plan_type, account_status, trial_start_date, trial_end_date, subscription_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [user.id, user.email, await hashPassword(input.password), user.display_name, user.role, user.plan_type, user.account_status, user.trial_start_date, user.trial_end_date, JSON.stringify({ termsAcceptedAt: now.toISOString(), selectedPlanAt: now.toISOString() })]
      );
      return createSession(user, client);
    });

    try {
      emailService.sendWelcomeEmail({
        email: input.email,
        displayName: input.displayName,
        planType: input.planType
      }).catch(err => {
        console.warn('[auth.register] Erro no envio assíncrono do e-mail de boas-vindas:', err.message);
      });
    } catch (err) {
      console.warn('[auth.register] Falha ao acionar envio de e-mail:', err.message);
    }

    return session;
  } catch (error) {
    if (error.code === '23505') { const duplicate = new Error('Já existe uma conta com este e-mail.'); duplicate.status = 409; throw duplicate; }
    throw error;
  }
}

async function login(email, password) {
  const normalized = normalizeEmail(email);
  const result = await database.query('SELECT id, email, display_name, role, password_hash, plan_type, account_status, trial_start_date, trial_end_date FROM app.app_users WHERE email = $1 AND active = true', [normalized]);
  const user = result.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) return null;
  return createSession(await refreshTrialStatus(user));
}

function publicUser(user) {
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role, planType: user.plan_type || 'BASIC', accountStatus: user.account_status || 'active', trialStartDate: user.trial_start_date ? new Date(user.trial_start_date).toISOString() : null, trialEndDate: user.trial_end_date ? new Date(user.trial_end_date).toISOString() : null };
}

async function refreshTrialStatus(user) {
  if (user.plan_type !== 'TRIAL' || user.account_status !== 'trial' || !user.trial_end_date || new Date(user.trial_end_date).getTime() > Date.now()) return user;
  await database.query("UPDATE app.app_users SET account_status = 'trial_expired' WHERE id = $1 AND account_status = 'trial'", [user.id]);
  return { ...user, account_status: 'trial_expired' };
}

async function session(token) {
  if (!token) return null;
  const result = await database.query(
    `SELECT u.id, u.email, u.display_name, u.role, u.plan_type, u.account_status, u.trial_start_date, u.trial_end_date
       FROM app.app_sessions s JOIN app.app_users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active = true`,
    [hashToken(token)]
  );
  return result.rows[0] ? publicUser(await refreshTrialStatus(result.rows[0])) : null;
}

async function logout(token) {
  if (token) await database.query('DELETE FROM app.app_sessions WHERE token_hash = $1', [hashToken(token)]);
}

const RESET_TOKEN_MINUTES = 30;
const RESET_RATE_LIMIT_MS = 60 * 1000;
const resetRequestsThrottle = new Map();

function cleanOldThrottleEntries() {
  const cutoff = Date.now() - RESET_RATE_LIMIT_MS;
  for (const [key, timestamp] of resetRequestsThrottle.entries()) {
    if (timestamp < cutoff) resetRequestsThrottle.delete(key);
  }
}

async function requestPasswordReset(rawEmail, appUrl) {
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    const error = new Error('Informe um e-mail válido.');
    error.status = 400;
    throw error;
  }

  const genericResponse = {
    ok: true,
    message: 'Se este e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha em instantes.'
  };

  cleanOldThrottleEntries();
  const lastRequest = resetRequestsThrottle.get(email);
  if (lastRequest && Date.now() - lastRequest < RESET_RATE_LIMIT_MS) {
    return genericResponse;
  }

  if (!database.configured()) {
    return genericResponse;
  }

  try {
    const result = await database.query(
      'SELECT id, email, display_name FROM app.app_users WHERE email = $1 AND active = true',
      [email]
    );

    const user = result.rows[0];
    if (user) {
      resetRequestsThrottle.set(email, Date.now());

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

      await database.transaction(async (client) => {
        await client.query(
          'UPDATE app.password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
          [user.id]
        );
        await client.query(
          'INSERT INTO app.password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
          [tokenHash, user.id, expiresAt]
        );
      });

      let baseUrl = appUrl || process.env.APP_BASE_URL || 'http://localhost:8787';
      try {
        const parsed = new URL(baseUrl);
        if (!['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.protocol === 'http:') {
          parsed.protocol = 'https:';
        }
        parsed.search = '';
        parsed.hash = '';
        baseUrl = parsed.toString().replace(/\/+$/, '');
      } catch (_) {
        baseUrl = String(baseUrl).split('?')[0].split('#')[0].replace(/\/+$/, '');
      }

      const resetUrl = `${baseUrl}?reset_token=${encodeURIComponent(rawToken)}`;

      emailService.sendPasswordResetEmail({
        email: user.email,
        displayName: user.display_name,
        resetUrl,
        expiresInMinutes: RESET_TOKEN_MINUTES
      }).catch(err => {
        console.warn('[auth.requestPasswordReset] Erro ao enviar e-mail de recuperação:', err.message);
      });
    }
  } catch (err) {
    console.error('[auth.requestPasswordReset] Erro interno:', err.message);
  }

  return genericResponse;
}

async function verifyPasswordResetToken(token) {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return { valid: false, error: 'Token de recuperação não fornecido.' };
  }

  if (!database.configured()) {
    return { valid: false, error: 'Serviço de banco de dados indisponível.' };
  }

  const tokenHash = hashToken(token.trim());
  const result = await database.query(
    `SELECT prt.token_hash, prt.user_id, prt.expires_at, prt.used_at, u.email, u.display_name
       FROM app.password_reset_tokens prt
       JOIN app.app_users u ON u.id = prt.user_id
      WHERE prt.token_hash = $1 AND u.active = true`,
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row) {
    return { valid: false, error: 'Link de recuperação inválido.' };
  }
  if (row.used_at) {
    return { valid: false, error: 'Este link de recuperação já foi utilizado.' };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { valid: false, error: 'Este link de recuperação expirou.' };
  }

  return { valid: true, email: row.email };
}

async function resetPassword(token, newPassword) {
  if (!token || typeof token !== 'string' || !token.trim()) {
    const error = new Error('Token de recuperação não fornecido.');
    error.status = 400;
    throw error;
  }

  if (!newPassword || String(newPassword).length < 10) {
    const error = new Error('A nova senha precisa ter ao menos 10 caracteres.');
    error.status = 400;
    throw error;
  }

  if (!database.configured()) {
    const error = new Error('Banco de dados não configurado.');
    error.status = 503;
    throw error;
  }

  const tokenHash = hashToken(token.trim());
  const result = await database.query(
    `SELECT prt.token_hash, prt.user_id, prt.expires_at, prt.used_at, u.email
       FROM app.password_reset_tokens prt
       JOIN app.app_users u ON u.id = prt.user_id
      WHERE prt.token_hash = $1 AND u.active = true`,
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    const error = new Error('Link de recuperação inválido, expirado ou já utilizado. Por favor, solicite um novo link.');
    error.status = 400;
    throw error;
  }

  const newHash = await hashPassword(String(newPassword));
  await database.transaction(async (client) => {
    await client.query(
      'UPDATE app.app_users SET password_hash = $1 WHERE id = $2',
      [newHash, row.user_id]
    );
    await client.query(
      'UPDATE app.password_reset_tokens SET used_at = now() WHERE token_hash = $1',
      [tokenHash]
    );
    await client.query(
      'UPDATE app.password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
      [row.user_id]
    );
    await client.query(
      'DELETE FROM app.app_sessions WHERE user_id = $1',
      [row.user_id]
    );
  });

  return {
    ok: true,
    message: 'Senha redefinida com sucesso. Você já pode acessar seu workspace com a nova senha.'
  };
}

module.exports = {
  ensureAdmin,
  hashPassword,
  login,
  logout,
  session,
  register,
  verifyPassword,
  validateRegistration,
  normalizePlanType,
  requestPasswordReset,
  verifyPasswordResetToken,
  resetPassword,
  TRIAL_DAYS,
  RESET_TOKEN_MINUTES
};

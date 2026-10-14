const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const { renderPasswordResetEmail, escapeHtml } = require('../src/templates/password-reset-email');
const emailService = require('../src/email-service');
const auth = require('../src/auth');
const database = require('../src/database');

test('password-reset-email template renders safely with all security notices and CTA', () => {
  const rendered = renderPasswordResetEmail({
    displayName: 'Trader <script>alert(1)</script>',
    email: 'trader@example.com',
    resetUrl: 'https://app.healthytrendtrader.com/?reset_token=abcd1234efgh5678',
    expiresInMinutes: 30
  });

  assert.match(rendered.subject, /Redefinição de Senha/);
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.match(rendered.html, /Trader &lt;script&gt;/);
  assert.match(rendered.html, /trader@example\.com/);
  assert.match(rendered.html, /Redefinir Minha Senha/);
  assert.match(rendered.html, /30 minutos/);
  assert.match(rendered.html, /https:\/\/app\.healthytrendtrader\.com\/\?reset_token=abcd1234efgh5678/);

  // Plain text version
  assert.match(rendered.text, /Trader <script>/);
  assert.match(rendered.text, /https:\/\/app\.healthytrendtrader\.com\/\?reset_token=abcd1234efgh5678/);
  assert.match(rendered.text, /30 minutos/);
});

test('emailService.sendPasswordResetEmail saves preview file in data/emails in test mode', async () => {
  const result = await emailService.sendPasswordResetEmail({
    email: 'recovery-test@healthytrend.test',
    displayName: 'Recovery Tester',
    resetUrl: 'https://app.healthytrendtrader.com/?reset_token=test-token-xyz',
    expiresInMinutes: 30
  });

  assert.equal(result.sent, true);
  assert.equal(result.mode, 'preview');
  assert.ok(result.filename.startsWith('password-reset-'));

  const fileExists = await fs.stat(result.filePath).then(() => true).catch(() => false);
  assert.equal(fileExists, true);

  const content = await fs.readFile(result.filePath, 'utf8');
  assert.match(content, /recovery-test@healthytrend\.test/);
  assert.match(content, /test-token-xyz/);
});

test('requestPasswordReset validates email and does not reveal whether email exists', async () => {
  // Invalid email format throws 400
  await assert.rejects(
    () => auth.requestPasswordReset('invalid-email'),
    err => err.status === 400 && /e-mail válido/.test(err.message)
  );

  // Non-existent email returns generic success response
  const genericResponse = await auth.requestPasswordReset('non-existent-user-99999@example.com');
  assert.equal(genericResponse.ok, true);
  assert.match(genericResponse.message, /Se este e-mail estiver cadastrado/);
});

test('full password reset lifecycle: request, verify token, reset password, single-use check, and login verification', async () => {
  if (!database.configured()) {
    // Skip database-dependent part when DB is unconfigured
    return;
  }

  // Ensure migrations and clean test user
  await database.migrate();

  const testEmail = `pw-reset-${Date.now()}@test.healthytrendtrader.com`;
  const initialPassword = 'initial-password-1234';
  const newPassword = 'brand-new-secure-password-5678';

  // 1. Register test user
  await auth.register({
    name: 'Reset Test User',
    email: testEmail,
    password: initialPassword,
    planType: 'TRIAL',
    acceptedTerms: true
  });

  // Verify initial login works
  const initialSession = await auth.login(testEmail, initialPassword);
  assert.ok(initialSession && initialSession.token);

  // 2. Request password reset
  const reqResult = await auth.requestPasswordReset(testEmail, 'https://app.healthytrendtrader.com');
  assert.equal(reqResult.ok, true);
  assert.match(reqResult.message, /Se este e-mail estiver cadastrado/);

  // Fetch the created token from database
  const userRes = await database.query('SELECT id FROM app.app_users WHERE email = $1', [testEmail]);
  const userId = userRes.rows[0].id;

  const tokenRes = await database.query(
    'SELECT token_hash, expires_at, used_at FROM app.password_reset_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  assert.equal(tokenRes.rowCount, 1);
  const tokenRecord = tokenRes.rows[0];
  assert.equal(tokenRecord.used_at, null);
  assert.ok(new Date(tokenRecord.expires_at).getTime() > Date.now());

  // 3. Test verifyPasswordResetToken
  // Find raw token by matching preview email file
  const emailsDir = path.resolve(__dirname, '..', 'data', 'emails');
  const files = await fs.readdir(emailsDir);
  const userPreviewFile = files
    .filter(f => f.startsWith('password-reset-') && f.includes(testEmail.replace(/[^a-z0-9]/gi, '_')))
    .sort()
    .pop();

  assert.ok(userPreviewFile, 'Preview file for reset email must exist');
  const previewContent = await fs.readFile(path.join(emailsDir, userPreviewFile), 'utf8');
  const matchToken = previewContent.match(/reset_token=([a-f0-9]+)/i);
  assert.ok(matchToken, 'Raw token must be present in reset link');
  const rawToken = matchToken[1];

  // Verify token is valid
  const verifyResult = await auth.verifyPasswordResetToken(rawToken);
  assert.equal(verifyResult.valid, true);
  assert.equal(verifyResult.email, testEmail);

  // Verify fake token is rejected
  const fakeVerify = await auth.verifyPasswordResetToken('fake-invalid-token');
  assert.equal(fakeVerify.valid, false);

  // 4. Test resetPassword validation
  // Short password rejected
  await assert.rejects(
    () => auth.resetPassword(rawToken, 'short'),
    err => err.status === 400 && /10 caracteres/.test(err.message)
  );

  // 5. Successfully reset password
  const resetResult = await auth.resetPassword(rawToken, newPassword);
  assert.equal(resetResult.ok, true);
  assert.match(resetResult.message, /sucesso/);

  // 6. Token is single-use: subsequent attempt with same token must fail
  await assert.rejects(
    () => auth.resetPassword(rawToken, newPassword),
    err => err.status === 400 && /já utilizado|inválido/.test(err.message)
  );

  // 7. Verify token state in database is used_at != null
  const postResetTokenRes = await database.query(
    'SELECT used_at FROM app.password_reset_tokens WHERE user_id = $1',
    [userId]
  );
  assert.ok(postResetTokenRes.rows[0].used_at !== null);

  // 8. Verify login with old password fails
  const oldLogin = await auth.login(testEmail, initialPassword);
  assert.equal(oldLogin, null, 'Login with old password must fail');

  // 9. Verify login with new password succeeds
  const newLogin = await auth.login(testEmail, newPassword);
  assert.ok(newLogin && newLogin.token, 'Login with new password must succeed');
  assert.equal(newLogin.user.email, testEmail);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { renderWelcomeEmail, planLabel, escapeHtml } = require('../src/templates/welcome-email');
const emailService = require('../src/email-service');

test('planLabel maps subscription plans correctly to Portuguese descriptions', () => {
  assert.equal(planLabel('TRIAL'), 'Trial 7 Dias (Acesso Completo)');
  assert.equal(planLabel('trial'), 'Trial 7 Dias (Acesso Completo)');
  assert.equal(planLabel('PROFESSIONAL'), 'Plano Profissional');
  assert.equal(planLabel('BASIC'), 'Plano Básico');
  assert.equal(planLabel('UNKNOWN'), 'Plano Padrão');
});

test('escapeHtml prevents XSS injection in template variables', () => {
  assert.equal(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml("Daniel's Portfolio"), 'Daniel&#039;s Portfolio');
});

test('renderWelcomeEmail produces well-structured HTML and text with all four pillars and CTA', () => {
  const rendered = renderWelcomeEmail({
    displayName: 'Daniel Gonçalves',
    email: 'daniel@example.com',
    planType: 'TRIAL',
    appUrl: 'https://app.healthytrendtrader.com'
  });

  assert.match(rendered.subject, /Bem-vindo ao The Healthy Trend Trader/);

  // HTML content assertions
  assert.match(rendered.html, /Daniel Gonçalves/);
  assert.match(rendered.html, /daniel@example\.com/);
  assert.match(rendered.html, /Trial 7 Dias/);
  assert.match(rendered.html, /Permissão de Mercado &amp; Ciclo/);
  assert.match(rendered.html, /Position Sizing &amp; Rubric/);
  assert.match(rendered.html, /Gestão de Posição &amp; Condução do Runner/);
  assert.match(rendered.html, /Diário do Trader &amp; Inteligência Emocional/);
  assert.match(rendered.html, /https:\/\/app\.healthytrendtrader\.com/);
  assert.match(rendered.html, /Acessar Meu Workspace/);

  // Plain text content assertions
  assert.match(rendered.text, /Daniel Gonçalves/);
  assert.match(rendered.text, /daniel@example\.com/);
  assert.match(rendered.text, /Trial 7 Dias \(Acesso Completo\)/);
  assert.match(rendered.text, /https:\/\/app\.healthytrendtrader\.com/);
  assert.match(rendered.text, /Bons trades e disciplina sempre/);
});

test('emailService saves preview file in data/emails when SMTP is not configured in test mode', async () => {
  const result = await emailService.sendWelcomeEmail({
    email: 'unit-test@healthytrend.test',
    displayName: 'Unit Tester',
    planType: 'PROFESSIONAL'
  });

  assert.equal(result.sent, true);
  assert.equal(result.mode, 'preview');
  assert.ok(result.filePath);

  const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);
  assert.equal(fileExists, true);

  const content = await fs.readFile(result.filePath, 'utf8');
  assert.match(content, /Unit Tester/);
  assert.match(content, /unit-test@healthytrend\.test/);
  assert.match(content, /Plano Profissional/);

  // Cleanup test file
  await fs.unlink(result.filePath).catch(() => {});
});

test('emailService handles missing email safely without throwing', async () => {
  const result = await emailService.sendWelcomeEmail({
    displayName: 'No Email User'
  });

  assert.equal(result.sent, false);
  assert.match(result.error, /não informado/);
});

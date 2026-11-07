const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { renderStormAlertEmail } = require('../src/templates/storm-alert-email');
const emailService = require('../src/email-service');

test('renderStormAlertEmail produces high-contrast HTML and plain text with extreme warning', () => {
  const rendered = renderStormAlertEmail({
    displayName: 'Daniel Gonçalves',
    email: 'daniel@trader.com',
    event: {
      name: 'Eleições presidenciais',
      fullName: 'Eleições Presidenciais 2026 (1º Turno)',
      eventDateFormatted: 'Domingo — 04/10',
      cutoffFormatted: 'Sexta-feira — fechamento',
      categoryLabel: 'Eleições e Política'
    },
    openPositionsCount: 8,
    appUrl: 'https://app.healthytrendtrader.com'
  });

  assert.match(rendered.subject, /🚨 STORM ALERT: Eleições presidenciais/);
  assert.match(rendered.html, /STORM ALERT/);
  assert.match(rendered.html, /TEMPESTADE À VISTA/);
  assert.match(rendered.html, /ZERE SUAS POSIÇÕES/);
  assert.match(rendered.html, /PROTEJA SEU CAPITAL/);
  assert.match(rendered.html, /Eleições Presidenciais 2026/);
  assert.match(rendered.html, /Domingo — 04\/10/);
  assert.match(rendered.html, /Sexta-feira — fechamento/);
  assert.match(rendered.html, /PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO/);
  assert.match(rendered.html, /08/); // 8 open positions with zero-padding
  assert.match(rendered.html, /VER POSIÇÕES EM ABERTO NO SOFTWARE/);

  // Plain text
  assert.match(rendered.text, /STORM ALERT/);
  assert.match(rendered.text, /TEMPESTADE À VISTA/);
  assert.match(rendered.text, /ZERE SUAS POSIÇÕES\. PROTEJA SEU CAPITAL\./);
  assert.match(rendered.text, /Eleições presidenciais/);
  assert.match(rendered.text, /Posições em Aberto: 08/);
});

test('sendStormAlertEmail safely records preview when SMTP is unconfigured', async () => {
  const result = await emailService.sendStormAlertEmail({
    email: 'daniel-test@trader.com',
    displayName: 'Daniel Trader',
    event: {
      name: 'Reunião Extraordinária do COPOM',
      eventDateFormatted: 'Quinta-feira — 20/11',
      cutoffFormatted: 'Quarta-feira — fechamento'
    },
    openPositionsCount: 5
  });

  assert.equal(result.sent, true);
  assert.ok(result.subject.includes('COPOM'));
  assert.ok(result.filePath);

  const fileExists = await fs.stat(result.filePath).then(() => true).catch(() => false);
  assert.equal(fileExists, true);

  const savedContent = await fs.readFile(result.filePath, 'utf8');
  assert.match(savedContent, /Reunião Extraordinária do COPOM/);
  assert.match(savedContent, /daniel-test@trader\.com/);
});

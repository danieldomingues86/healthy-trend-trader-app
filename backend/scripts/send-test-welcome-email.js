/* Usage: node scripts/send-test-welcome-email.js --email <email> [--name <name>] [--plan <TRIAL|BASIC|PROFESSIONAL>] [--open] */
const path = require('node:path');
const fs = require('node:fs');
const { exec } = require('node:child_process');

function argument(name) {
  const at = process.argv.indexOf(name);
  return at === -1 ? null : process.argv[at + 1];
}

function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      }
    }
  } catch {}
}

async function main() {
  loadEnv();
  const email = argument('--email') || 'teste@healthytrendtrader.com';
  const displayName = argument('--name') || 'Trader de Alta Performance';
  const planType = argument('--plan') || 'TRIAL';
  const shouldOpen = process.argv.includes('--open');

  console.log(`[test-email] Preparando disparo de boas-vindas para: ${displayName} <${email}> (${planType})`);

  const emailService = require('../src/email-service');
  console.log(`[test-email] Provedor SMTP configurado? ${emailService.isConfigured() ? 'SIM' : 'NÃO (salvando arquivo de preview HTML em backend/data/emails/)'}`);

  const result = await emailService.sendWelcomeEmail({
    email,
    displayName,
    planType
  });

  console.log('[test-email] Resultado:', JSON.stringify(result, null, 2));

  if (result.filePath) {
    console.log(`\n✨ Para visualizar o template no seu navegador, abra o arquivo:\n${result.filePath}\n`);
    if (shouldOpen) {
      const openCmd = process.platform === 'win32' ? `start "" "${result.filePath}"` : `open "${result.filePath}"`;
      exec(openCmd);
    }
  }
}

main().catch(err => {
  console.error('[test-email] Erro:', err.message);
  process.exit(1);
});

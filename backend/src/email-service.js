const fs = require('node:fs/promises');
const path = require('node:path');
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {}

const { renderWelcomeEmail, getBackgroundBase64, DEFAULT_BG_URL } = require('./templates/welcome-email');

function isConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    (process.env.SMTP_USER || process.env.SMTP_PASS)
  );
}

function getFromAddress() {
  return process.env.SMTP_FROM || 'The Healthy Trend Trader <no-reply@healthytrendtrader.com>';
}

function createTransporter() {
  if (!nodemailer) {
    throw new Error('Módulo nodemailer não disponível no ambiente.');
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
    }
  });
}

async function saveEmailPreview(to, subject, html, text) {
  try {
    const dir = path.resolve(__dirname, '..', 'data', 'emails');
    await fs.mkdir(dir, { recursive: true });
    const cleanTo = String(to || 'unknown').replace(/[^a-z0-9]/gi, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `welcome-${cleanTo}-${timestamp}.html`;
    const filePath = path.join(dir, filename);

    await fs.writeFile(filePath, html, 'utf8');
    console.log(`[email-service] ✉️ E-mail salvo para pré-visualização: ${filePath}`);
    return { sent: true, mode: 'preview', filePath, filename };
  } catch (err) {
    console.warn('[email-service] Não foi possível salvar preview do e-mail:', err.message);
    return { sent: false, mode: 'preview', error: err.message };
  }
}

async function sendWelcomeEmail({ email, displayName, planType, appUrl, backgroundUrl }) {
  if (!email) {
    return { sent: false, error: 'E-mail do destinatário não informado.' };
  }

  try {
    if (isConfigured() && process.env.NODE_ENV !== 'test') {
      const finalBgUrl = backgroundUrl || process.env.WELCOME_EMAIL_BG_URL || DEFAULT_BG_URL;
      const { subject, html, text } = renderWelcomeEmail({
        displayName,
        email,
        planType,
        appUrl,
        backgroundUrl: finalBgUrl
      });

      const transporter = createTransporter();
      const info = await transporter.sendMail({
        from: getFromAddress(),
        to: email,
        subject,
        html,
        text
      });
      console.log(`[email-service] 🚀 E-mail de boas-vindas enviado para ${email} (ID: ${info.messageId})`);
      return { sent: true, mode: 'smtp', messageId: info.messageId };
    }

    // Modo preview / teste quando SMTP não está configurado
    const bgBase64 = getBackgroundBase64();
    const finalBgUrl = backgroundUrl || bgBase64 || process.env.WELCOME_EMAIL_BG_URL || DEFAULT_BG_URL;
    const { subject, html, text } = renderWelcomeEmail({
      displayName,
      email,
      planType,
      appUrl,
      backgroundUrl: finalBgUrl
    });
    return await saveEmailPreview(email, subject, html, text);
  } catch (err) {
    console.error(`[email-service] ⚠️ Erro ao disparar e-mail de boas-vindas para ${email}:`, err.message);
    const bgBase64 = getBackgroundBase64();
    const finalBgUrl = backgroundUrl || bgBase64 || process.env.WELCOME_EMAIL_BG_URL || DEFAULT_BG_URL;
    const { subject, html, text } = renderWelcomeEmail({
      displayName,
      email,
      planType,
      appUrl,
      backgroundUrl: finalBgUrl
    });
    await saveEmailPreview(email, subject, html, text);
    return { sent: false, mode: 'smtp_error', error: err.message };
  }
}

module.exports = {
  sendWelcomeEmail,
  isConfigured,
  renderWelcomeEmail,
  saveEmailPreview
};

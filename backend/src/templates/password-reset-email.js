function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const DEFAULT_BG_URL = 'https://files.catbox.moe/kv00dt.jpg';

function renderPasswordResetEmail({ displayName, email, resetUrl, expiresInMinutes = 30, backgroundUrl }) {
  const safeName = escapeHtml(displayName || 'Trader');
  const safeEmail = escapeHtml(email || '');
  const safeUrl = escapeHtml(resetUrl || '#');
  const finalBgUrl = backgroundUrl || process.env.WELCOME_EMAIL_BG_URL || DEFAULT_BG_URL;

  const subject = 'Redefinição de Senha — The Healthy Trend Trader';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#010a07;background-image:url('${finalBgUrl}');background-repeat:no-repeat;background-position:center top;background-size:cover;color:#e9f5ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" background="${finalBgUrl}" style="background-color:#010a07;background-image:url('${finalBgUrl}');background-repeat:no-repeat;background-position:center top;background-size:cover;padding:48px 15px;">
    <tr>
      <td align="center" background="${finalBgUrl}" style="background-image:url('${finalBgUrl}');background-repeat:no-repeat;background-position:center top;background-size:cover;">
        <!-- Card Principal -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#04150e;background:linear-gradient(160deg,#061f15 0%,#03120c 100%);border:1px solid rgba(52,211,153,0.3);border-radius:18px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,0.85);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#dfbd5f,#34d399);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header / Identidade Visual -->
          <tr>
            <td style="padding:36px 36px 20px 36px;border-bottom:1px solid rgba(52,211,153,0.12);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="display:inline-block;padding:4px 10px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.25);border-radius:6px;font-size:10px;font-weight:800;letter-spacing:0.18em;color:#34d399;text-transform:uppercase;">
                      THE HEALTHY TREND TRADER
                    </div>
                    <h1 style="margin:16px 0 6px 0;color:#f5f0df;font-family:Georgia,serif;font-size:26px;font-weight:700;line-height:1.25;letter-spacing:-0.02em;">
                      Recuperação de Senha
                    </h1>
                    <p style="margin:0;color:#8fa99a;font-size:13px;">Instruções seguras para redefinição de acesso ao seu workspace.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Conteúdo Principal -->
          <tr>
            <td style="padding:32px 36px;">
              <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#f5f0df;">
                Olá, ${safeName}.
              </h2>
              <p style="margin:0 0 20px 0;color:#c8ded1;font-size:14px;line-height:1.65;">
                Recebemos uma solicitação para redefinir a senha vinculada à conta <strong>${safeEmail}</strong>.
              </p>
              <p style="margin:0 0 26px 0;color:#c8ded1;font-size:14px;line-height:1.65;">
                Para criar uma nova senha e restabelecer o seu acesso, clique no botão seguro abaixo:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:15px 36px;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#02150d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:800;letter-spacing:0.04em;text-decoration:none;border-radius:10px;box-shadow:0 8px 24px rgba(16,185,129,0.35);border:1px solid #6ee7b7;">
                      Redefinir Minha Senha &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Aviso de Validade e Uso Único -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 20px 0;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.2);border-radius:10px;padding:16px;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0;color:#a7f3d0;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">
                      Informações de Segurança
                    </p>
                    <p style="margin:0;color:#94a3b8;font-size:12.5px;line-height:1.55;">
                      • Este link é de <strong>uso único</strong> e expira em <strong>${expiresInMinutes} minutos</strong>.<br>
                      • Se o botão acima não funcionar, copie e cole o link a seguir no seu navegador:<br>
                      <a href="${safeUrl}" style="color:#34d399;word-break:break-all;font-size:11.5px;text-decoration:underline;">${safeUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 0 0;color:#8fa99a;font-size:13px;line-height:1.55;">
                Se você não solicitou a redefinição de senha, nenhuma ação é necessária. Sua senha atual permanecerá inalterada e sua conta continua protegida.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 36px;background:rgba(0,0,0,0.35);border-top:1px solid rgba(52,211,153,0.1);text-align:center;">
              <p style="margin:0 0 6px 0;color:#6b8778;font-size:11.5px;">
                The Healthy Trend Trader — Gestão, Processo e Disciplina.
              </p>
              <p style="margin:0;color:#495e53;font-size:10.5px;">
                Este é um e-mail transacional de segurança gerado automaticamente. Por favor, não responda a esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `The Healthy Trend Trader — Recuperação de Senha

Olá, ${displayName || 'Trader'}.

Recebemos uma solicitação para redefinir a senha da sua conta (${email}).

Para cadastrar sua nova senha com segurança, acesse o link abaixo:
${resetUrl}

Este link é de uso único e expira em ${expiresInMinutes} minutos.

Se você não solicitou a redefinição, nenhuma ação é necessária. Sua senha atual continuará válida e segura.

The Healthy Trend Trader
Clareza para decidir. Disciplina para permanecer.`;

  return { subject, html, text };
}

module.exports = {
  renderPasswordResetEmail,
  escapeHtml
};

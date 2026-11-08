const fs = require('node:fs');
const path = require('node:path');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderStormAlertEmail({
  displayName,
  email,
  event = {},
  openPositionsCount = 0,
  appUrl
}) {
  const safeName = escapeHtml(displayName || 'Trader');
  const safeEmail = escapeHtml(email || '');
  const safeUrl = escapeHtml(appUrl || process.env.APP_BASE_URL || 'http://localhost:3000');

  const evtName = escapeHtml(event.fullName || event.name || 'Eleições Presidenciais');
  const evtCategory = escapeHtml(event.categoryLabel || 'Risco Extremo');
  const evtDate = escapeHtml(event.eventDateFormatted || event.eventDate || 'A definir');
  const cutoff = escapeHtml(event.cutoffFormatted || event.cutoffDate || 'Fechamento do pregão anterior');
  const posCount = Number(openPositionsCount) || 0;
  const posStr = String(posCount).padStart(2, '0');

  const subject = `🚨 STORM ALERT: ${event.name || event.fullName || 'Evento Extremo'} — Encerramento Obrigatório de Posições`;

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
<body style="margin:0;padding:0;background-color:#0b0304;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0b0304;background:linear-gradient(180deg, #180709 0%, #0b0304 100%);">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#150608;border:1px solid rgba(239,68,68,0.4);border-radius:20px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,0.8);">
          
          <!-- TOP HEADER -->
          <tr>
            <td style="padding:28px 32px 20px 32px;border-bottom:1px solid rgba(239,68,68,0.2);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#f87171;display:block;">⚡ STORM ALERT</span>
                    <span style="font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;">EXTREME EVENT WARNING · THE HEALTHY TREND TRADER</span>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:6px 14px;background:#dc2626;color:#ffffff;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;">
                      RISCO EXTREMO
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO BANNER -->
          <tr>
            <td style="padding:32px 32px 16px 32px;">
              <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;line-height:1.2;">
                TEMPESTADE À VISTA.
              </h1>
              <h2 style="margin:0 0 16px 0;font-size:18px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;color:#ef4444;line-height:1.3;">
                ZERE SUAS POSIÇÕES. PROTEJA SEU CAPITAL.
              </h2>
              <p style="margin:0;font-size:14px;color:#cbd5e1;line-height:1.6;">
                Olá, <strong>${safeName}</strong>. Um evento extremo relevante está se aproximando do mercado.
                Permanecer posicionado pode expor seu patrimônio a <strong>gaps severos de abertura, volatilidade extraordinária e descontinuidades de preço</strong> que os stops talvez não consigam conter.
              </p>
            </td>
          </tr>

          <!-- METADATA BOX -->
          <tr>
            <td style="padding:8px 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.25);border-radius:14px;padding:18px;">
                <tr>
                  <td width="50%" style="padding:8px 12px;vertical-align:top;">
                    <span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">EVENTO IDENTIFICADO</span>
                    <strong style="display:block;font-size:14px;color:#ffffff;">${evtName}</strong>
                    <span style="font-size:11px;color:#fca5a5;">${evtCategory}</span>
                  </td>
                  <td width="50%" style="padding:8px 12px;vertical-align:top;">
                    <span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">DATA DO EVENTO</span>
                    <strong style="display:block;font-size:14px;color:#ffffff;">${evtDate}</strong>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding:8px 12px;vertical-align:top;border-top:1px solid rgba(239,68,68,0.15);">
                    <span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">PRAZO OBRIGATÓRIO DE ZERAGEM</span>
                    <strong style="display:block;font-size:14px;color:#ffffff;">${cutoff}</strong>
                  </td>
                  <td width="50%" style="padding:8px 12px;vertical-align:top;border-top:1px solid rgba(239,68,68,0.15);">
                    <span style="display:block;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;margin-bottom:4px;">POSIÇÕES EM ABERTO</span>
                    <strong style="display:block;font-size:24px;font-weight:800;color:#ef4444;line-height:1;">${posStr}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PHILOSOPHY BANNER -->
          <tr>
            <td style="padding:0 32px 24px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(127,29,29,0.4);border:1px solid rgba(239,68,68,0.35);border-radius:12px;text-align:center;">
                <tr>
                  <td style="padding:14px 20px;font-size:13px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase;color:#fef2f2;">
                    "PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO."
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          <tr>
            <td align="center" style="padding:0 32px 32px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background:#ef4444;border-radius:10px;">
                    <a href="${safeUrl}#positions" target="_blank" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.4px;">
                      VER POSIÇÕES EM ABERTO NO SOFTWARE →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px;background:#0d0405;border-top:1px solid rgba(239,68,68,0.2);text-align:center;">
              <p style="margin:0 0 6px 0;font-size:11px;color:#94a3b8;">
                The Healthy Trend Trader · Extreme Event Protection System
              </p>
              ${safeEmail ? `<p style="margin:0 0 6px 0;font-size:11px;color:#64748b;">Notificação enviada para: ${safeEmail}</p>` : ''}
              <p style="margin:0;font-size:11px;color:#64748b;">
                O mercado estará lá amanhã. Seu capital precisa estar também.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `🚨 STORM ALERT — THE HEALTHY TREND TRADER
EXTREME EVENT WARNING · RISCO EXTREMO

TEMPESTADE À VISTA. ZERE SUAS POSIÇÕES. PROTEJA SEU CAPITAL.

Olá, ${displayName || 'Trader'}.
Um evento extremo relevante está se aproximando do mercado. Permanecer posicionado expõe seu patrimônio a gaps severos de abertura, volatilidade extraordinária e perda da efetividade dos stops.

DETALHES DO EVENTO:
- Evento: ${event.name || 'Eleições Presidenciais'} (${event.categoryLabel || 'Risco Extremo'})
- Data do Evento: ${event.eventDateFormatted || event.eventDate || 'A definir'}
- Prazo Obrigatório de Zeragem: ${event.cutoffFormatted || 'Fechamento do pregão anterior'}
- Posições em Aberto: ${posStr}

"PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO."

Acesse seu terminal para zerar as posições:
${safeUrl}#positions

The Healthy Trend Trader · Extreme Event Protection System
O mercado estará lá amanhã. Seu capital precisa estar também.
`;

  return { subject, html, text };
}

module.exports = {
  renderStormAlertEmail
};

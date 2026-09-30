const fs = require('node:fs');
const path = require('node:path');

function getBackgroundBase64() {
  try {
    const bgPath = path.resolve(__dirname, '..', '..', '..', 'assets', 'email', 'welcome-trend-bg.jpg');
    if (fs.existsSync(bgPath)) {
      const data = fs.readFileSync(bgPath).toString('base64');
      return `data:image/jpeg;base64,${data}`;
    }
  } catch (_) {}
  return null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function planLabel(planType) {
  switch (String(planType || '').toUpperCase()) {
    case 'TRIAL':
      return 'Trial 7 Dias (Acesso Completo)';
    case 'PROFESSIONAL':
      return 'Plano Profissional';
    case 'BASIC':
      return 'Plano Básico';
    default:
      return 'Plano Padrão';
  }
}

const DEFAULT_BG_URL = 'https://files.catbox.moe/r0yq77.jpg';

function renderWelcomeEmail({ displayName, email, planType, appUrl, backgroundUrl, bannerUrl }) {
  const safeName = escapeHtml(displayName || 'Trader');
  const safeEmail = escapeHtml(email || '');
  const safePlan = escapeHtml(planLabel(planType));
  const safeUrl = escapeHtml(appUrl || process.env.APP_BASE_URL || 'http://localhost:3000');
  const finalBgUrl = backgroundUrl || bannerUrl || process.env.WELCOME_EMAIL_BG_URL || DEFAULT_BG_URL;

  const subject = `Bem-vindo ao The Healthy Trend Trader — Seu novo centro operacional`;

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
        <!-- Card Principal (100% Sólido e Opaco para máxima legibilidade do texto) -->
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
                      Clareza para decidir.<br>
                      <span style="color:#34d399;">Disciplina para permanecer.</span>
                    </h1>
                    <p style="margin:0;color:#8fa99a;font-size:13px;">Seu workspace operacional de alta precisão em Trend Following.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Conteúdo Principal -->
          <tr>
            <td style="padding:32px 36px;">
              <h2 style="margin:0 0 16px 0;font-size:19px;font-weight:700;color:#f5f0df;">
                Olá, ${safeName}! Seja muito bem-vindo.
              </h2>
              <p style="margin:0 0 20px 0;color:#c8ded1;font-size:14px;line-height:1.65;">
                Parabéns por dar este passo importante para a sua consistência. O <strong>The Healthy Trend Trader</strong> foi meticulosamente desenhado para traders que tratam o mercado como uma profissão de longo prazo, substituindo o ruído e a ansiedade por processo, controle de risco assimétrico e clareza mental.
              </p>

              <!-- Bloco Destaque / Filosofia -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;background:#091911;border-left:3px solid #dfbd5f;border-radius:0 10px 10px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#e8ddb5;font-size:13px;font-style:italic;line-height:1.5;">
                      &ldquo;O sucesso no Trend Following não depende de tentar prever o futuro a cada pregão, mas de operar somente com permissão de mercado, limitar perdas sem hesitação e deixar os lucros correrem.&rdquo;
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Detalhes da Conta -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 26px 0;background:#03130c;border:1px solid #1a4230;border-radius:12px;padding:14px 18px;">
                <tr>
                  <td>
                    <div style="font-size:10px;font-weight:800;color:#789081;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">DADOS DA SUA CONTA</div>
                    <div style="font-size:13px;color:#f1f6f2;margin-bottom:4px;"><strong>E-mail:</strong> ${safeEmail}</div>
                    <div style="font-size:13px;color:#f1f6f2;"><strong>Plano Selecionado:</strong> <span style="color:#dfbd5f;font-weight:700;">${safePlan}</span></div>
                  </td>
                </tr>
              </table>

              <!-- Os 4 Pilares -->
              <h3 style="margin:0 0 14px 0;font-size:13px;font-weight:800;letter-spacing:0.12em;color:#67d996;text-transform:uppercase;">
                SEU SISTEMA COMPLETO DE INTELIGÊNCIA:
              </h3>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding-bottom:10px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#051a12;border:1px solid rgba(41,126,77,0.45);border-radius:10px;padding:12px 16px;">
                      <tr>
                        <td width="32" valign="top" style="font-size:18px;line-height:1;">🚦</td>
                        <td style="padding-left:10px;">
                          <strong style="color:#f0f6f2;font-size:13px;">Permissão de Mercado &amp; Ciclo</strong>
                          <p style="margin:3px 0 0 0;color:#9cb2a4;font-size:12px;line-height:1.45;">
                            Semáforo diário baseado em médias e amplitudes históricas. Diz com precisão se é hora de acelerar, ser conservador ou proteger 100% em caixa.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:10px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#051a12;border:1px solid rgba(41,126,77,0.45);border-radius:10px;padding:12px 16px;">
                      <tr>
                        <td width="32" valign="top" style="font-size:18px;line-height:1;">⚖️</td>
                        <td style="padding-left:10px;">
                          <strong style="color:#f0f6f2;font-size:13px;">Position Sizing &amp; Rubric de Qualidade</strong>
                          <p style="margin:3px 0 0 0;color:#9cb2a4;font-size:12px;line-height:1.45;">
                            Avaliação de oportunidades (Notas A+, A, B, C e D) combinando tripla restrição de risco (stop técnico, volatilidade ATR e limite de capital).
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:10px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#051a12;border:1px solid rgba(41,126,77,0.45);border-radius:10px;padding:12px 16px;">
                      <tr>
                        <td width="32" valign="top" style="font-size:18px;line-height:1;">🎯</td>
                        <td style="padding-left:10px;">
                          <strong style="color:#f0f6f2;font-size:13px;">Gestão de Posição &amp; Condução do Runner</strong>
                          <p style="margin:3px 0 0 0;color:#9cb2a4;font-size:12px;line-height:1.45;">
                            Acompanhe eventos de entrada, parciais (Sell Into Strength) e Free Roll para capturar grandes tendências sem stress.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#051a12;border:1px solid rgba(41,126,77,0.45);border-radius:10px;padding:12px 16px;">
                      <tr>
                        <td width="32" valign="top" style="font-size:18px;line-height:1;">📖</td>
                        <td style="padding-left:10px;">
                          <strong style="color:#f0f6f2;font-size:13px;">Diário do Trader &amp; Inteligência Emocional</strong>
                          <p style="margin:3px 0 0 0;color:#9cb2a4;font-size:12px;line-height:1.45;">
                            O espelho da sua mente. Registre emoções, fotos de gráficos, aprendizados e exporte relatórios preparados para estudo com IA.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Botão CTA Central -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:30px 0 24px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeUrl}" target="_blank" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#34d399 0%,#10b981 100%);color:#02150e;font-size:14px;font-weight:800;letter-spacing:0.04em;text-decoration:none;border-radius:10px;box-shadow:0 6px 20px rgba(52,211,153,0.35);text-transform:uppercase;">
                      Acessar Meu Workspace &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Primeiros Passos -->
              <div style="border-top:1px solid rgba(52,211,153,0.15);padding-top:22px;margin-top:20px;">
                <div style="font-size:11px;font-weight:800;color:#dfbd5f;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">
                  COMO COMEÇAR HOJE:
                </div>
                <ol style="margin:0;padding-left:20px;color:#a4baad;font-size:13px;line-height:1.6;">
                  <li style="margin-bottom:6px;"><strong>Defina sua Política de Risco:</strong> informe o capital total disponível para calcular o lote ideal.</li>
                  <li style="margin-bottom:6px;"><strong>Cheque a Permissão de Mercado:</strong> verifique se o ciclo autoriza novas entradas longas.</li>
                  <li style="margin-bottom:0;"><strong>Registre seu primeiro plano:</strong> preencha a Rubric para validar a qualidade da oportunidade.</li>
                </ol>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px;background:#020d09;border-top:1px solid #143526;color:#6d8477;font-size:11px;line-height:1.5;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <p style="margin:0 0 8px 0;">
                      Este é um e-mail automático de boas-vindas enviado pelo <strong>The Healthy Trend Trader</strong>.
                    </p>
                    <p style="margin:0 0 10px 0;">
                      Precisa de ajuda ou ficou com alguma dúvida sobre o método? Consulte o <em>Manual do Software</em> no menu lateral da plataforma.
                    </p>
                    <p style="margin:0;color:#495c51;font-size:10px;">
                      &copy; 2026 The Healthy Trend Trader &middot; Todos os direitos reservados.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `THE HEALTHY TREND TRADER
Clareza para decidir. Disciplina para permanecer.
==================================================

Olá, ${displayName || 'Trader'}!

Seja muito bem-vindo ao The Healthy Trend Trader!

Parabéns por dar este passo importante para a sua consistência. O The Healthy Trend Trader foi desenhado para traders que tratam o mercado como uma profissão de longo prazo, substituindo o ruído e a ansiedade por processo, controle de risco assimétrico e clareza mental.

DADOS DA SUA CONTA:
- E-mail: ${email || ''}
- Plano Selecionado: ${planLabel(planType)}

O SEU SISTEMA COMPLETO DE INTELIGÊNCIA:
1. Permissão de Mercado & Ciclo: Semáforo diário para saber se deve atacar, ser conservador ou proteger capital em caixa.
2. Position Sizing & Rubric: Cálculo exato do lote baseado em stop técnico, ATR e orçamento de risco.
3. Gestão de Posição & Runner: Condução com parciais e Free Roll para capturar as maiores tendências.
4. Diário & Inteligência Emocional: Rastreie o seu estado mental e aprimore sua execução contínua.

ACESSE SEU WORKSPACE:
${appUrl || process.env.APP_BASE_URL || 'http://localhost:3000'}

PRIMEIROS PASSOS RECOMENDADOS:
1. Defina sua Política de Risco com seu capital inicial.
2. Cheque a Permissão de Mercado do dia.
3. Registre seu primeiro plano de trade com a Rubric.

Bons trades e disciplina sempre!
Equipe The Healthy Trend Trader
`;

  return { subject, html, text };
}

module.exports = {
  renderWelcomeEmail,
  planLabel,
  escapeHtml,
  getBackgroundBase64,
  DEFAULT_BG_URL
};

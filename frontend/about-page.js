/**
 * HEALTHY TREND TRADER — ABOUT PAGE
 *
 * Renders the institutional "Sobre" page with cinematic dark premium aesthetic.
 * Exact visual fidelity to the reference design.
 */
(function (root) {
  'use strict';

  /* ── Premium SVG Icon Library (Gold Accent) ────────────────────────── */

  const ICONS = {
    // Brand mark: 3 ascending gold bars with golden swoosh arrow
    brandMark: `<svg viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="goldBarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ecd998"/>
          <stop offset="50%" stop-color="#c8a84e"/>
          <stop offset="100%" stop-color="#9a7c30"/>
        </linearGradient>
      </defs>
      <path d="M12 56 V40 Q12 37 15 37 H19 Q22 37 22 40 V56 Z" fill="url(#goldBarGrad)"/>
      <path d="M27 56 V28 Q27 25 30 25 H34 Q37 25 37 28 V56 Z" fill="url(#goldBarGrad)"/>
      <path d="M42 56 V16 Q42 13 45 13 H49 Q52 13 52 16 V56 Z" fill="url(#goldBarGrad)"/>
      <path d="M6 46 Q28 32 58 10" stroke="url(#goldBarGrad)" stroke-width="4.5" stroke-linecap="round"/>
      <polygon points="56,6 66,9 61,19" fill="#ecd998"/>
    </svg>`,

    // Filosofia Icons (Gold) - Scaled up to 28x28
    diamond: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 3h12l4 7-10 11L2 10z"/>
      <path d="M2 10h20"/>
      <path d="M10 3l-3 7 5 11 5-11-3-7"/>
    </svg>`,

    target: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
      <circle cx="12" cy="12" r="1.5" fill="#c8a84e"/>
    </svg>`,

    shield: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="M12 6v12"/>
    </svg>`,

    bars: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="14" width="4" height="7" rx="1" fill="rgba(200,168,78,0.2)"/>
      <rect x="10" y="9" width="4" height="12" rx="1" fill="rgba(200,168,78,0.35)"/>
      <rect x="17" y="4" width="4" height="17" rx="1" fill="#c8a84e"/>
    </svg>`,

    infinity: `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/>
    </svg>`,

    // Método Icons (Gold) - Scaled up to 24x24
    trendUp: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="m22 7-9 9-4.5-4.5L2 18"/>
      <polyline points="15 7 22 7 22 14"/>
    </svg>`,

    forceRel: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="12" y1="20" x2="12" y2="8"/>
      <line x1="18" y1="20" x2="18" y2="4"/>
    </svg>`,

    cycle: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l6.73-1.19"/>
    </svg>`,

    pulse: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12h5l2.5-6 4 12 3-8 2 4h3.5"/>
    </svg>`,

    clock: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15.5 13.5"/>
    </svg>`,

    document: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>`,

    gear: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`,

    brain: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#c8a84e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z"/>
    </svg>`,

    // Globe
    globe: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#c8a84e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>`
  };

  /* ── Main Render ──────────────────────────────────────────────────────── */

  function renderAboutPage () {
    const container = document.getElementById('about');
    if (!container) return;

    container.innerHTML = `
      <div class="about-wrapper">
        <!-- HERO SECTION -->
        <section class="about-hero" aria-label="Apresentação">
          <div class="about-hero-content">
            <div class="about-brand-header">
              <div class="about-brand-icon">${ICONS.brandMark}</div>
              <div class="about-brand-text">
                <span class="about-title-healthy">HEALTHY</span>
                <div class="about-title-bottom">
                  <span class="about-title-trend">TREND</span>
                  <span class="about-title-trader">TRADER</span>
                </div>
              </div>
            </div>

            <div class="about-tagline">TRADE THE TREND. PROTECT THE CAPITAL. REPEAT.</div>

            <p class="about-desc">
              Uma plataforma criada para ajudar o trader a encontrar
              tendências saudáveis, dimensionar risco corretamente
              e executar um processo consistente.
            </p>

            <blockquote class="about-quote">
              “Não buscamos prever o mercado.<br>
              Buscamos reconhecer força, controlar o risco<br>
              e permanecer com a tendência.”
            </blockquote>
          </div>
        </section>

        <!-- A FILOSOFIA -->
        <div class="about-section-header">
          <span class="about-section-title">A FILOSOFIA</span>
          <span class="about-section-line"></span>
        </div>

        <div class="about-philosophy-grid">
          ${renderItem(ICONS.diamond, 'Qualidade<br>&gt; Quantidade')}
          ${renderItem(ICONS.target, 'Wait → Confirm<br>→ Execute')}
          ${renderItem(ICONS.shield, 'Proteja<br>o capital')}
          ${renderItem(ICONS.bars, 'Deixe os vencedores<br>trabalharem')}
          ${renderItem(ICONS.infinity, 'Consistência é<br>a verdadeira vantagem')}
        </div>

        <!-- O MÉTODO -->
        <div class="about-section-header">
          <span class="about-section-title">O MÉTODO</span>
          <span class="about-section-line"></span>
        </div>

        <div class="about-method-grid">
          ${renderItem(ICONS.trendUp, 'Tendência')}
          ${renderItem(ICONS.forceRel, 'Força Relativa')}
          ${renderItem(ICONS.cycle, 'Ciclo de Mercado')}
          ${renderItem(ICONS.pulse, 'Contração /<br>Volatilidade')}
          ${renderItem(ICONS.clock, 'Timing')}
          ${renderItem(ICONS.document, 'Fundamentos')}
          ${renderItem(ICONS.gear, 'Gestão de Risco')}
          ${renderItem(ICONS.brain, 'Disciplina')}
        </div>

        <!-- BOTTOM: A HISTÓRIA + CRIADO POR -->
        <div class="about-bottom-grid">
          <div class="about-bottom-col">
            <div class="about-section-header">
              <span class="about-section-title">A HISTÓRIA</span>
              <span class="about-section-line"></span>
            </div>
            <div class="about-history-content">
              <p>O Healthy Trend Trader nasceu da necessidade de transformar um método de trading em um processo visual, repetível e mensurável.</p>
              <p>É o resultado de anos de estudo, prática e da busca por uma forma mais racional, disciplinada e saudável de operar o mercado.</p>
            </div>
          </div>

          <div class="about-bottom-col">
            <div class="about-section-header">
              <span class="about-section-title">CRIADO POR</span>
              <span class="about-section-line"></span>
            </div>
            <div class="about-creator-content">
              <div class="about-monogram-circle">
                <span class="about-monogram-text">DG</span>
              </div>
              <div class="about-creator-details">
                <div class="about-creator-name">Daniel Gonçalves</div>
                <div class="about-creator-tag">TRADING COM PROPÓSITO</div>
              </div>
              <div class="about-creator-pillars">
                <div>PESSOAS MELHORES</div>
                <div>TRADERS MAIS CONSISTENTES</div>
                <div>UM MERCADO MAIS SAUDÁVEL</div>
              </div>
            </div>
          </div>
        </div>

        <!-- FOOTER -->
        <footer class="about-footer">
          <div class="about-footer-left">
            <span>Healthy Trend Trader v1.0.0</span>
            <span class="about-footer-sep">|</span>
            <span>© 2026 Daniel Gonçalves. Todos os direitos reservados.</span>
          </div>
          <div class="about-footer-right">
            <a href="javascript:void(0)">Termos de Uso</a>
            <span class="about-footer-sep">|</span>
            <a href="javascript:void(0)">Política de Privacidade</a>
            <span class="about-footer-sep">|</span>
            <a href="javascript:void(0)">Contato</a>
            <span class="about-footer-sep">|</span>
            <a href="javascript:void(0)">Site</a>
            <span class="about-footer-globe">${ICONS.globe}</span>
          </div>
        </footer>
      </div>
    `;
  }

  /* ── Item Renderer (No cards, pure background immersion) ─────────────── */

  function renderItem (iconSvg, label) {
    return `
      <div class="about-icon-item">
        <div class="about-icon-box">
          ${iconSvg}
        </div>
        <div class="about-icon-label">${label}</div>
      </div>`;
  }

  /* ── Exports ──────────────────────────────────────────────────────────── */
  root.renderAboutPage = renderAboutPage;

})(typeof window !== 'undefined' ? window : globalThis);

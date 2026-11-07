/**
 * STORM ALERT WIDGET — Healthy Trend Trader
 * Componente visual de alerta patrimonial de altíssima prioridade no Dashboard.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root, require('./storm-alert-model.js'));
  } else {
    root.StormAlert = factory(root, root.StormAlertModel);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, StormAlertModel) {
  'use strict';

  // Ícone de Tempestade / Raio Dramático em SVG
  const STORM_LIGHTNING_SVG = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
      <polyline points="13 11 9 17 15 17 11 23" />
    </svg>
  `;

  // Ícone de Escudo de Proteção Concluída em SVG
  const SHIELD_CHECK_SVG = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  `;

  let _isCollapsed = false;

  function buildStormAlertHtml(options = {}) {
    const model = StormAlertModel || root.StormAlertModel;
    if (!model || typeof model.evaluateStormAlertStatus !== 'function') {
      return '';
    }

    const alertStatus = model.evaluateStormAlertStatus(options);
    if (!alertStatus || !alertStatus.hasActiveAlert || alertStatus.state === 'INACTIVE') {
      return '';
    }

    const stateClass = alertStatus.state === 'PROTECTED'
      ? 'storm-state-protected'
      : (alertStatus.state === 'WARNING' ? 'storm-state-warning' : 'storm-state-action');

    const iconSvg = alertStatus.state === 'PROTECTED' ? SHIELD_CHECK_SVG : STORM_LIGHTNING_SVG;

    const evt = alertStatus.event || {};
    const evtName = evt.name || 'Evento Extremo de Mercado';
    const evtDate = evt.eventDateFormatted || 'Data a confirmar';
    const cutoffDate = evt.cutoffFormatted || 'Fechamento do pregão anterior';
    const openPosStr = String(alertStatus.openPositionsCount || 0).padStart(2, '0');

    const heroImageSrc = options.imageSrc || 'assets/storm-alert/storm-lightning-cinematic.jpg';

    return `
      <section class="storm-alert-container" aria-label="Alerta de Proteção contra Eventos Extremos">
        <div class="storm-alert-widget ${stateClass} ${_isCollapsed ? 'storm-collapsed' : ''}" id="stormAlertWidget">
          <!-- 1. HEADER DO WIDGET -->
          <div class="storm-alert-head">
            <div class="storm-alert-brand">
              <div class="storm-alert-icon-wrap" aria-hidden="true">
                ${iconSvg}
              </div>
              <div class="storm-alert-titles">
                <span class="storm-alert-kicker">STORM ALERT</span>
                <span class="storm-alert-subkicker">EXTREME EVENT WARNING</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="storm-alert-badge">
                ${alertStatus.riskLevel}
              </span>
              <button type="button" class="storm-alert-toggle-btn" id="btnToggleStormAlert" title="${_isCollapsed ? 'Expandir alerta' : 'Minimizar alerta'}" aria-label="Alternar exibição do alerta">
                ${_isCollapsed ? '▼' : '▲'}
              </button>
            </div>
          </div>

          <!-- 2. ÁREA ARTÍSTICA CINEMATOGRÁFICA -->
          <div class="storm-alert-hero-art">
            <img src="${heroImageSrc}" alt="Tempestade extrema com raios dramáticos no horizonte" class="storm-alert-hero-img" loading="eager" onerror="this.style.display='none'" />
            <div class="storm-alert-art-overlay"></div>
          </div>

          <!-- 3. MENSAGENS PRINCIPAIS -->
          <div class="storm-alert-body">
            <h2 class="storm-alert-headline">${alertStatus.headline}</h2>
            <div class="storm-alert-primary-msg">${alertStatus.primaryMessage}</div>
            <p class="storm-alert-complementary">${alertStatus.complementaryMessage}</p>
          </div>

          <!-- 4. GRID DE METADADOS DINÂMICOS -->
          <div class="storm-alert-grid">
            <div class="storm-meta-item">
              <span class="storm-meta-lbl">EVENTO</span>
              <span class="storm-meta-val" title="${evt.fullName || evtName}">${evtName}</span>
            </div>
            <div class="storm-meta-item">
              <span class="storm-meta-lbl">DATA DO EVENTO</span>
              <span class="storm-meta-val">${evtDate}</span>
            </div>
            <div class="storm-meta-item">
              <span class="storm-meta-lbl">PRAZO PARA ZERAGEM</span>
              <span class="storm-meta-val">${cutoffDate}</span>
            </div>
            <div class="storm-meta-item meta-positions">
              <span class="storm-meta-lbl">POSIÇÕES EM ABERTO</span>
              <span class="storm-meta-val">${openPosStr}</span>
            </div>
          </div>

          <!-- 5. BANNER DE IMPACTO (FILOSOFIA DO SISTEMA) -->
          <div class="storm-alert-philosophy-banner">
            ${alertStatus.impactQuote}
          </div>

          <!-- 6. RODAPÉ E AÇÕES -->
          <div class="storm-alert-footer">
            <div class="storm-alert-footer-left">
              <span class="storm-alert-subwarn">${alertStatus.subWarning}</span>
              ${alertStatus.openPositionsCount > 0 ? `
                <button type="button" class="storm-btn-action" data-storm-nav="positions">
                  VER POSIÇÕES EM ABERTO →
                </button>
              ` : ''}
              <button type="button" class="storm-btn-calendar" data-storm-nav="calendar">
                Consultar Calendário Extremo
              </button>
            </div>

            <div class="storm-alert-status-badge">
              <span class="storm-status-dot"></span>
              <span>${alertStatus.stateLabel}</span>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  function attachEvents(container = document) {
    const scope = container || document;

    const toggleBtn = scope.querySelector('#btnToggleStormAlert');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        _isCollapsed = !_isCollapsed;
        const widget = scope.querySelector('#stormAlertWidget');
        if (widget) {
          widget.classList.toggle('storm-collapsed', _isCollapsed);
          toggleBtn.textContent = _isCollapsed ? '▼' : '▲';
          toggleBtn.title = _isCollapsed ? 'Expandir alerta' : 'Minimizar alerta';
        }
      });
    }

    scope.querySelectorAll('[data-storm-nav="positions"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof root.go === 'function') {
          root.go('positions');
        } else if (typeof window !== 'undefined' && typeof window.go === 'function') {
          window.go('positions');
        }
      });
    });

    scope.querySelectorAll('[data-storm-nav="calendar"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Direciona para o simulador na aba de parâmetros ou abre o modal
        if (typeof root.go === 'function') {
          root.go('simulator');
        } else if (typeof window !== 'undefined' && typeof window.go === 'function') {
          window.go('simulator');
        }
      });
    });
  }

  return {
    buildStormAlertHtml,
    attachEvents,
    isCollapsed: () => _isCollapsed,
    setCollapsed: (v) => { _isCollapsed = Boolean(v); }
  };
});

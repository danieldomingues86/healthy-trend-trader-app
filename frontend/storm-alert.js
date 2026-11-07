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
      <section class="storm-alert-container" id="stormAlertContainer" aria-label="Alerta de Proteção contra Eventos Extremos">
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
              <button type="button" class="storm-btn-calendar" data-storm-nav="calendar" title="Gerenciar calendário, testar estados ao vivo e disparar alertas">
                ⚙️ Gerenciar Eventos &amp; Testar Alerta
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
        openExtremeEventsManagerModal('test');
      });
    });
  }

  function refresh() {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('stormAlertContainer');
    const model = StormAlertModel || root.StormAlertModel;
    const count = model ? model.resolveOpenPositionsCount() : 8;
    const newHtml = buildStormAlertHtml({ openPositionsCount: count });

    if (existing && existing.parentElement) {
      if (!newHtml) {
        existing.style.display = 'none';
        existing.innerHTML = '';
        return;
      }
      const temp = document.createElement('div');
      temp.innerHTML = newHtml;
      const newEl = temp.firstElementChild;
      if (newEl) {
        existing.parentElement.replaceChild(newEl, existing);
        attachEvents(newEl);
      }
    } else if (typeof window !== 'undefined' && window.WealthDashboardV2 && typeof window.WealthDashboardV2.render === 'function') {
      const rootEl = document.getElementById('wealthDashboardRoot') || document.querySelector('.wealth-dashboard-root');
      if (rootEl) {
        window.WealthDashboardV2.render(rootEl);
      }
    }
  }

  function notifyToast(message, type = 'info') {
    if (typeof root.showToast === 'function') {
      root.showToast(message, type);
    } else if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[StormAlert] ${message}`);
    }
  }

  function getCurrentUserEmail() {
    if (typeof window !== 'undefined') {
      if (window.currentUser && window.currentUser.email) return window.currentUser.email;
      if (window.healthyTrendUser && window.healthyTrendUser.email) return window.healthyTrendUser.email;
      try {
        const stored = localStorage.getItem('healthyTrend_userEmail');
        if (stored) return stored;
      } catch (_) {}
    }
    return 'trader@healthytrendtrader.com';
  }

  /**
   * MODAL: CENTRAL DE EVENTOS EXTREMOS & STORM ALERT
   */
  function openExtremeEventsManagerModal(initialTab = 'test') {
    if (typeof document === 'undefined') return;

    let modalBackdrop = document.getElementById('stormAlertManagerModal');
    if (!modalBackdrop) {
      modalBackdrop = document.createElement('div');
      modalBackdrop.id = 'stormAlertManagerModal';
      modalBackdrop.className = 'storm-modal-backdrop';
      document.body.appendChild(modalBackdrop);
    }

    renderModalContent(modalBackdrop, initialTab);
  }

  function closeExtremeEventsManagerModal() {
    const modalBackdrop = document.getElementById('stormAlertManagerModal');
    if (modalBackdrop) {
      modalBackdrop.remove();
    }
  }

  function renderModalContent(container, activeTab = 'test') {
    const model = StormAlertModel || root.StormAlertModel;
    const currentMode = model && typeof model.getTestMode === 'function' ? model.getTestMode() : 'AUTO';
    const userEmail = getCurrentUserEmail();
    const calendar = model && typeof model.getActiveCalendar === 'function' ? model.getActiveCalendar() : [];

    container.innerHTML = `
      <div class="storm-modal" role="dialog" aria-modal="true" aria-labelledby="stormModalTitle">
        <!-- HEADER -->
        <div class="storm-modal-header">
          <div class="storm-modal-header-titles">
            <span class="storm-modal-kicker">⚡ CENTRAL DE PROTEÇÃO PATRIMONIAL</span>
            <h2 class="storm-modal-title" id="stormModalTitle">Eventos Extremos &amp; Storm Alert</h2>
            <p class="storm-modal-desc">Cadastre eventos de risco sistêmico, teste todos os estados visuais em tempo real no Dashboard e configure notificações por e-mail.</p>
          </div>
          <button type="button" class="storm-modal-close" id="btnStormModalClose" aria-label="Fechar modal">×</button>
        </div>

        <!-- TABS -->
        <div class="storm-modal-tabs">
          <button type="button" class="storm-modal-tab-btn ${activeTab === 'test' ? 'active' : ''}" data-storm-tab="test">
            ⚡ Testar Estados (Ao Vivo)
          </button>
          <button type="button" class="storm-modal-tab-btn ${activeTab === 'new' ? 'active' : ''}" data-storm-tab="new">
            ➕ Cadastrar Novo Evento
          </button>
          <button type="button" class="storm-modal-tab-btn ${activeTab === 'calendar' ? 'active' : ''}" data-storm-tab="calendar">
            📅 Calendário Ativo (${calendar.length})
          </button>
        </div>

        <!-- BODY -->
        <div class="storm-modal-body">
          
          <!-- TAB 1: TESTE DE ESTADOS -->
          <div class="storm-modal-panel ${activeTab === 'test' ? 'active' : ''}" id="stormPanelTest">
            <div class="storm-test-intro">
              💡 <strong>Como testar o funcionamento:</strong> Clique em qualquer um dos botões abaixo para simular instantaneamente o visual do Storm Alert no Dashboard. As alterações são refletidas na hora!
            </div>

            <div class="storm-test-state-grid">
              <button type="button" class="storm-test-btn ${currentMode === 'ACTION_REQUIRED' ? 'active' : ''}" data-storm-mode="ACTION_REQUIRED">
                <div class="storm-test-btn-title" style="color:#ef4444;">
                  🚨 1. AÇÃO NECESSÁRIA
                </div>
                <div class="storm-test-btn-desc">
                  Risco extremo iminente e posições em aberto. Urgência máxima de zeragem.
                </div>
              </button>

              <button type="button" class="storm-test-btn ${currentMode === 'WARNING' ? 'active' : ''}" data-storm-mode="WARNING">
                <div class="storm-test-btn-title" style="color:#fbbf24;">
                  ⚠️ 2. ATENÇÃO (RADAR)
                </div>
                <div class="storm-test-btn-desc">
                  Evento detectado no horizonte. Alerta preventivo para planejamento de saída.
                </div>
              </button>

              <button type="button" class="storm-test-btn ${currentMode === 'PROTECTED' ? 'active' : ''}" data-storm-mode="PROTECTED">
                <div class="storm-test-btn-title" style="color:#34d399;">
                  🛡️ 3. PROTEÇÃO CONCLUÍDA
                </div>
                <div class="storm-test-btn-desc">
                  Posições 100% zeradas antes do evento. Patrimônio em caixa protegido.
                </div>
              </button>

              <button type="button" class="storm-test-btn ${currentMode === 'INACTIVE' ? 'active' : ''}" data-storm-mode="INACTIVE">
                <div class="storm-test-btn-title" style="color:#94a3b8;">
                  ⚪ 4. INATIVO (OCULTO)
                </div>
                <div class="storm-test-btn-desc">
                  Sem eventos extremos no horizonte. O widget fica oculto/discreto.
                </div>
              </button>

              <button type="button" class="storm-test-btn ${currentMode === 'AUTO' ? 'active' : ''}" data-storm-mode="AUTO" style="grid-column: 1 / -1; border-color: rgba(59, 130, 246, 0.4);">
                <div class="storm-test-btn-title" style="color:#60a5fa;">
                  🔄 RESTAURAR MODO AUTOMÁTICO
                </div>
                <div class="storm-test-btn-desc">
                  Volta a avaliar automaticamente com base na data do calendário e posições reais.
                </div>
              </button>
            </div>

            <!-- DISPARO DE E-MAIL DE TESTE -->
            <div class="storm-test-email-card">
              <h3 class="storm-test-email-card-title">
                ✉️ Disparar Notificação por E-mail (Teste de Envio)
              </h3>
              <p class="storm-test-email-card-desc">
                Envie um e-mail com a direção de arte oficial do Storm Alert para verificar o recebimento imediato e a formatação no seu leitor de e-mails.
              </p>
              <div class="storm-email-input-row">
                <input type="email" id="stormTestEmailInput" class="storm-email-input" value="${userEmail}" placeholder="seu-email@dominio.com" />
                <button type="button" id="btnStormFireEmail" class="storm-btn-fire-email">
                  Disparar E-mail de Teste Agora
                </button>
              </div>
              <div id="stormEmailStatusMsg" style="margin-top: 10px; font-size: 12px; display: none;"></div>
            </div>
          </div>

          <!-- TAB 2: CADASTRAR EVENTO -->
          <div class="storm-modal-panel ${activeTab === 'new' ? 'active' : ''}" id="stormPanelNew">
            <form id="stormNewEventForm" class="storm-form-grid">
              <div class="storm-form-group full-width">
                <label class="storm-form-label" for="stormEvtName">Nome do Evento Extremo *</label>
                <input type="text" id="stormEvtName" class="storm-form-control" required placeholder="Ex.: Eleições Presidenciais 2026, Reunião Extraordinária do COPOM..." />
              </div>

              <div class="storm-form-group">
                <label class="storm-form-label" for="stormEvtCategory">Categoria do Risco *</label>
                <select id="stormEvtCategory" class="storm-form-control">
                  <option value="ELECTION">Eleições e Política</option>
                  <option value="MONETARY_POLICY">Política Monetária Extraordinária</option>
                  <option value="GEOPOLITICAL">Geopolítica &amp; Conflitos Militares</option>
                  <option value="INSTITUTIONAL">Instabilidade Institucional / Jurídica</option>
                  <option value="OTHER_EXTREME_RISK">Outro Risco Extremo</option>
                </select>
              </div>

              <div class="storm-form-group">
                <label class="storm-form-label" for="stormEvtDate">Data do Acontecimento *</label>
                <input type="date" id="stormEvtDate" class="storm-form-control" required />
              </div>

              <div class="storm-form-group">
                <label class="storm-form-label" for="stormEvtAdvance">Antecedência Obrigatória (Pregões) *</label>
                <input type="number" id="stormEvtAdvance" class="storm-form-control" value="1" min="1" max="10" />
              </div>

              <div class="storm-form-group">
                <label class="storm-form-label" for="stormEvtEmail">E-mail para Receber o Alerta</label>
                <input type="email" id="stormEvtEmail" class="storm-form-control" value="${userEmail}" />
              </div>

              <div class="storm-form-group full-width" style="margin-top: 6px;">
                <label class="storm-form-checkbox-label">
                  <input type="checkbox" id="stormEvtNotifyImmediate" checked />
                  <span><strong>Disparar notificação por e-mail imediatamente</strong> ao salvar este evento</span>
                </label>
              </div>

              <div class="storm-form-actions">
                <button type="submit" class="storm-btn-save">
                  Salvar Evento no Calendário
                </button>
              </div>
            </form>
          </div>

          <!-- TAB 3: CALENDÁRIO ATIVO -->
          <div class="storm-modal-panel ${activeTab === 'calendar' ? 'active' : ''}" id="stormPanelCalendar">
            <div class="storm-calendar-table-wrap">
              <table class="storm-calendar-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th>Categoria</th>
                    <th>Prazo de Zeragem</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${calendar.map(evt => {
                    const cutoff = model ? model.resolveCutoffSession(evt, evt.defaultAdvanceSessions || 1) : null;
                    const cutoffFormatted = cutoff ? model.formatCutoffSessionBR(cutoff.cutoffDate) : '—';
                    const isCustom = evt.id && evt.id.startsWith('evt-custom');
                    return `
                      <tr>
                        <td><strong>${evt.eventDate}</strong></td>
                        <td>
                          <strong>${evt.name}</strong>
                          ${evt.fullName && evt.fullName !== evt.name ? `<div style="font-size:11px;color:#94a3b8;">${evt.fullName}</div>` : ''}
                        </td>
                        <td>
                          <span class="storm-calendar-tag">${evt.categoryLabel || evt.category || 'Risco'}</span>
                        </td>
                        <td>
                          <span style="color:#fca5a5;font-weight:700;">${cutoffFormatted}</span>
                        </td>
                        <td>
                          ${isCustom ? `
                            <button type="button" class="storm-btn-delete-event" data-storm-delete="${evt.id}">
                              Remover
                            </button>
                          ` : `
                            <span style="font-size:11px;color:#64748b;">Sistema</span>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    `;

    attachModalEvents(container);
  }

  function attachModalEvents(modalBackdrop) {
    // Fechar ao clicar no X
    const closeBtn = modalBackdrop.querySelector('#btnStormModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeExtremeEventsManagerModal);
    }

    // Fechar ao clicar fora
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        closeExtremeEventsManagerModal();
      }
    });

    // Alternar abas
    modalBackdrop.querySelectorAll('[data-storm-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-storm-tab');
        renderModalContent(modalBackdrop, tab);
      });
    });

    // Alternar modos de teste ao vivo
    modalBackdrop.querySelectorAll('[data-storm-mode]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.getAttribute('data-storm-mode');
        const model = StormAlertModel || root.StormAlertModel;
        if (model && typeof model.setTestMode === 'function') {
          model.setTestMode(mode);
          refresh();

          // Atualiza visual dos botões
          modalBackdrop.querySelectorAll('[data-storm-mode]').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');

          const modeLabels = {
            ACTION_REQUIRED: 'Ação Necessária',
            WARNING: 'Atenção (No Radar)',
            PROTECTED: 'Proteção Concluída',
            INACTIVE: 'Inativo (Oculto)',
            AUTO: 'Automático (Calendário Real)'
          };
          notifyToast(`⚡ Modo [${modeLabels[mode] || mode}] ativado no Dashboard!`);
        }
      });
    });

    // Disparar e-mail de teste
    const fireEmailBtn = modalBackdrop.querySelector('#btnStormFireEmail');
    const emailInput = modalBackdrop.querySelector('#stormTestEmailInput');
    const statusMsg = modalBackdrop.querySelector('#stormEmailStatusMsg');

    if (fireEmailBtn && emailInput) {
      fireEmailBtn.addEventListener('click', async () => {
        const targetEmail = emailInput.value.trim();
        if (!targetEmail) {
          notifyToast('Por favor, informe um endereço de e-mail válido.', 'warn');
          return;
        }

        fireEmailBtn.disabled = true;
        fireEmailBtn.textContent = 'Enviando...';
        if (statusMsg) statusMsg.style.display = 'none';

        try {
          const model = StormAlertModel || root.StormAlertModel;
          const status = model ? model.evaluateStormAlertStatus() : {};

          const res = await fetch('/api/storm-alert/notify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: targetEmail,
              displayName: 'Trader',
              openPositionsCount: status.openPositionsCount || 8,
              event: status.event || {
                name: 'Eleições presidenciais',
                fullName: 'Eleições Presidenciais 2026',
                eventDateFormatted: 'Domingo — 04/10',
                cutoffFormatted: 'Sexta-feira — fechamento',
                categoryLabel: 'Eleições e Política'
              }
            })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            notifyToast(`🚨 E-mail de Storm Alert enviado com sucesso para ${targetEmail}!`);
            if (statusMsg) {
              statusMsg.style.display = 'block';
              statusMsg.style.color = '#34d399';
              statusMsg.textContent = `✓ E-mail enviado com sucesso para ${targetEmail}. (Modo: ${data.mode || 'salvo'})`;
            }
          } else {
            notifyToast(`Erro ao enviar: ${data.error || 'Falha no servidor'}`, 'error');
            if (statusMsg) {
              statusMsg.style.display = 'block';
              statusMsg.style.color = '#ef4444';
              statusMsg.textContent = `Erro: ${data.error || 'Falha no envio'}`;
            }
          }
        } catch (err) {
          notifyToast(`Falha de conexão: ${err.message}`, 'error');
          if (statusMsg) {
            statusMsg.style.display = 'block';
            statusMsg.style.color = '#ef4444';
            statusMsg.textContent = `Falha: ${err.message}`;
          }
        } finally {
          fireEmailBtn.disabled = false;
          fireEmailBtn.textContent = 'Disparar E-mail de Teste Agora';
        }
      });
    }

    // Cadastro de novo evento
    const newForm = modalBackdrop.querySelector('#stormNewEventForm');
    if (newForm) {
      newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const model = StormAlertModel || root.StormAlertModel;
        if (!model) return;

        const name = modalBackdrop.querySelector('#stormEvtName').value.trim();
        const categorySelect = modalBackdrop.querySelector('#stormEvtCategory');
        const category = categorySelect.value;
        const categoryLabel = categorySelect.options[categorySelect.selectedIndex].text;
        const eventDate = modalBackdrop.querySelector('#stormEvtDate').value;
        const advanceSessions = Number(modalBackdrop.querySelector('#stormEvtAdvance').value) || 1;
        const notifyImmediate = modalBackdrop.querySelector('#stormEvtNotifyImmediate').checked;
        const targetEmail = modalBackdrop.querySelector('#stormEvtEmail').value.trim();

        if (!name || !eventDate) {
          notifyToast('Preencha os campos obrigatórios.', 'warn');
          return;
        }

        const registered = model.registerCustomEvent({
          name,
          fullName: name,
          category,
          categoryLabel,
          eventDate,
          defaultAdvanceSessions: advanceSessions
        });

        notifyToast(`✓ Evento "${name}" cadastrado no calendário!`);

        // Dispara e-mail se solicitado
        if (notifyImmediate && targetEmail) {
          try {
            const cutoff = model.resolveCutoffSession(registered, advanceSessions);
            await fetch('/api/storm-alert/notify-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: targetEmail,
                displayName: 'Trader',
                openPositionsCount: model.resolveOpenPositionsCount(),
                event: {
                  ...registered,
                  cutoffFormatted: cutoff ? model.formatCutoffSessionBR(cutoff.cutoffDate) : '—',
                  eventDateFormatted: model.formatDateWithWeekdayBR(registered.eventDate)
                }
              })
            });
            notifyToast(`✉️ Notificação enviada para ${targetEmail}`);
          } catch (_) {}
        }

        refresh();
        renderModalContent(modalBackdrop, 'calendar');
      });
    }

    // Botão de deletar evento customizado
    modalBackdrop.querySelectorAll('[data-storm-delete]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const eventId = e.currentTarget.getAttribute('data-storm-delete');
        const model = StormAlertModel || root.StormAlertModel;
        if (model && typeof model.removeCustomEvent === 'function') {
          model.removeCustomEvent(eventId);
          notifyToast('Evento removido com sucesso.');
          refresh();
          renderModalContent(modalBackdrop, 'calendar');
        }
      });
    });
  }

  return {
    buildStormAlertHtml,
    attachEvents,
    refresh,
    openExtremeEventsManagerModal,
    closeExtremeEventsManagerModal,
    isCollapsed: () => _isCollapsed,
    setCollapsed: (v) => { _isCollapsed = Boolean(v); }
  };
});

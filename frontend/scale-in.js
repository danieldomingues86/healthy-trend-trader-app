(function () {
  'use strict';

  const model = window.ScaleInModel;
  if (!model) return;

  const locate = id => operationalState.positions.find(position => position.id === id);
  const money = value => typeof moneyBR === 'function' ? moneyBR(value) : `R$ ${Number(value || 0).toFixed(2)}`;
  const units = value => typeof numBR === 'function' ? numBR(value) : String(value || 0);
  const multiple = value => value == null ? '—' : `${value >= 0 ? '+' : ''}${typeof numBR === 'function' ? numBR(value, 2) : Number(value).toFixed(2)}R`;
  const pct = value => `${typeof numBR === 'function' ? numBR(value, 2) : Number(value || 0).toFixed(2)}%`;
  const safe = str => String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function getScaleInConfig() {
    return model.settings(window.riskPolicyState?.scaleIn);
  }

  // Hook openPosition
  const previousOpenPosition = window.openPosition;
  window.openPosition = function (id) {
    if (typeof previousOpenPosition === 'function') {
      previousOpenPosition(id);
    }

    const p = locate(id);
    const host = document.getElementById('positionDetail');
    if (!p || !host) return;

    // Remove legacy permanent scaleInCard if it exists
    const legacyCard = host.querySelector('#scaleInSection');
    if (legacyCard) legacyCard.remove();

    const scaleConfig = getScaleInConfig();

    // 1. Se Scale-In = Desativado na Política de Risco, o recurso não aparece na operação.
    const existingBtn = host.querySelector('[data-scale-in-btn]');
    if (!scaleConfig.enabled) {
      if (existingBtn) existingBtn.remove();
      return;
    }

    // 2. Se a posição estiver encerrada, não exibe ação de Scale-In
    const m = typeof operationMetrics === 'function' ? operationMetrics(p) : { remaining: p.remainingQty || 1 };
    if (p.status === 'closed' || m.remaining <= 0) {
      if (existingBtn) existingBtn.remove();
      return;
    }

    // 3. Gestão do Trade: ação discreta "+ Fazer Scale-In" dentro de .operations-actions
    const actionsWrap = host.querySelector('.operations-actions');
    if (actionsWrap && !actionsWrap.querySelector('[data-scale-in-btn]')) {
      const validation = model.canExecuteScaleIn({
        trade: p,
        scaleIn: { price: p.currentPrice, stop: p.currentStop },
        equity: typeof OPERATIONAL_EQUITY !== 'undefined' ? OPERATIONAL_EQUITY : 1029500,
        policy: window.riskPolicyState,
        openTrades: operationalState.positions
      });
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `secondary pm-scale-in-btn ${validation.allowed ? 'is-qualified' : ''}`;
      btn.dataset.scaleInBtn = p.id;
      btn.title = validation.allowed
        ? 'Gatilho de aumento atingido pela Política de Risco. Clique para avaliar.'
        : (validation.reason || 'Avaliar aumento de posição');
      btn.textContent = '+ Fazer Scale-In';
      actionsWrap.appendChild(btn);
    }

    // Garante que o dialog exista no documento
    if (!document.getElementById('scale-in-dialog')) {
      const dialog = document.createElement('dialog');
      dialog.className = 'scale-in-dialog';
      dialog.id = 'scale-in-dialog';
      document.body.appendChild(dialog);
    }

    // Enhance timeline for executed scale-in events
    const timeline = host.querySelector('.timeline');
    if (timeline) {
      const events = p.events || [];
      events.forEach(event => {
        if (event.type === 'scale_in') {
          const num = event.context?.additionNumber || 1;
          const pm = event.context?.averageEntryAfter ? ` · Novo PM: ${money(event.context.averageEntryAfter)}` : '';
          const note = event.note ? `<br>${safe(event.note)}` : '';
          const timeStr = typeof fmtDate === 'function' ? fmtDate(event.at) : new Date(event.at).toLocaleString();
          timeline.insertAdjacentHTML('beforeend', `
            <div class="event scale-in-event">
              <span class="line-dot" style="background:#10b981;border-color:#10b981"></span>
              <small>${safe(timeStr)}</small>
              <div>
                <strong style="color:#10b981">🚀 Scale-In #${num} executado</strong>
                <p>+${units(event.qty)} un. @ ${money(event.price)}${pm}${note}</p>
              </div>
            </div>
          `);
        }
      });
    }
  };

  // Live preview inside Modal
  function updateModalPreview(dialog, position) {
    const form = dialog.querySelector('form');
    if (!form) return;

    const price = Number(form.elements.price?.value) || position.currentPrice;
    const quantity = Math.floor(Number(form.elements.quantity?.value) || 0);
    const stop = Number(form.elements.stop?.value) || position.currentStop;

    const validation = model.canExecuteScaleIn({
      trade: position,
      scaleIn: { price, quantity, stop },
      equity: typeof OPERATIONAL_EQUITY !== 'undefined' ? OPERATIONAL_EQUITY : 1029500,
      policy: window.riskPolicyState,
      openTrades: operationalState.positions
    });

    const m = validation.metrics;
    const scaleConfig = getScaleInConfig();

    const previewContainer = dialog.querySelector('.scale-in-calc-preview');
    if (previewContainer) {
      const triggerMet = m.currentR !== null && m.currentR >= (m.targetTriggerR - 0.0001);
      previewContainer.innerHTML = `
        <div class="scale-in-kpi-summary">
          <div class="scale-in-summary-card">
            <small>Próximo Gatilho</small>
            <strong>+${m.targetTriggerR.toFixed(1)}R</strong>
            <span class="${triggerMet ? 'tag-good' : 'tag-warn'}">
              ${triggerMet ? 'Atingido (' + multiple(m.currentR) + ')' : 'Pendente (' + multiple(m.currentR) + ')'}
            </span>
          </div>
          <div class="scale-in-summary-card">
            <small>Adição</small>
            <strong>${m.additionNumber} de ${scaleConfig.maxAdditions}</strong>
            <span>${m.additionNumber > scaleConfig.maxAdditions ? 'Limite esgotado' : 'Dentro do limite'}</span>
          </div>
          <div class="scale-in-summary-card">
            <small>Preço Atual</small>
            <strong>${money(price)}</strong>
            <span>Stop: ${money(stop)}</span>
          </div>
          <div class="scale-in-summary-card">
            <small>Capital Adicional</small>
            <strong>${money(m.additionalCapital)}</strong>
            <span>Limite: ${money(m.maxCapitalAllowed)}</span>
          </div>
          <div class="scale-in-summary-card">
            <small>Risco Atual</small>
            <strong>${pct(m.currentRiskPct)}</strong>
            <span>${money(m.currentRiskCash)}</span>
          </div>
          <div class="scale-in-summary-card result">
            <small>Novo Risco Estimado</small>
            <strong class="${m.totalRiskPctAfter <= scaleConfig.maxRiskPct ? 'good' : 'bad'}">${pct(m.totalRiskPctAfter)}</strong>
            <span>Teto: ${pct(scaleConfig.maxRiskPct)} (${money(m.totalRiskCashAfter)})</span>
          </div>
        </div>

        <div class="scale-in-validation-banner ${validation.allowed ? 'pass' : 'fail'}">
          ${validation.allowed
            ? `✓ <b>Trade Qualificado:</b> Todos os parâmetros atendem às regras da Política de Risco para a adição #${m.additionNumber}.`
            : `⚠️ <b>Bloqueio pela Política de Risco:</b> ${safe(validation.reason || 'Condições não atendidas.')}`
          }
        </div>
      `;
    }

    const checklistContainer = dialog.querySelector('.scale-in-checklist');
    if (checklistContainer) {
      checklistContainer.innerHTML = validation.checks.map(c => `
        <li class="scale-in-check-item">
          <span class="scale-in-check-icon ${c.passed ? 'pass' : 'fail'}">${c.passed ? '✓' : '✗'}</span>
          <span>${safe(c.label)}</span>
          <span class="scale-in-check-detail">${safe(c.detail)}</span>
        </li>
      `).join('');
    }

    const submitBtn = form.querySelector('[type=submit]');
    if (submitBtn) {
      submitBtn.disabled = !validation.allowed || quantity <= 0;
      if (!validation.allowed) {
        submitBtn.title = validation.reason || 'Ajuste os valores para atender a Política de Risco';
      } else {
        submitBtn.title = 'Confirmar adição de lote conforme a Política de Risco';
      }
    }
  }

  // Click on "+ Fazer Scale-In"
  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-scale-in-btn]');
    if (!btn) return;

    const position = locate(btn.dataset.scaleInBtn);
    let dialog = document.getElementById('scale-in-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'scale-in-dialog';
      dialog.id = 'scale-in-dialog';
      document.body.appendChild(dialog);
    }
    if (!position) return;

    const scaleConfig = getScaleInConfig();
    const info = model.initialTradeInfo(position);
    const consolidated = model.calculateConsolidatedPosition({ trade: position, events: position.events });

    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const initialQty = Number(position.initialQty || 100);
    const suggestedQty = Math.max(1, Math.floor(initialQty * 0.5));

    // Build consolidated table rows for optional review
    const scaleEvents = (position.events || []).filter(e => e.type === 'scale_in');
    let rowsHtml = `
      <tr>
        <td><strong>Entrada Inicial</strong></td>
        <td>${money(info.entry)}</td>
        <td>${units(info.initialQty)}</td>
        <td>${money(info.initialQty * info.entry)}</td>
        <td>${money(info.initialStop)}</td>
        <td>${money(info.initialRiskCash)}</td>
      </tr>
    `;

    scaleEvents.forEach((sc, idx) => {
      const scPrice = Number(sc.price || 0);
      const scQty = Number(sc.qty || 0);
      const scStop = Number(sc.stop || position.currentStop);
      const scRisk = Math.abs(scPrice - scStop) * scQty;
      rowsHtml += `
        <tr>
          <td><strong>Scale-In #${idx + 1}</strong></td>
          <td>${money(scPrice)}</td>
          <td>+${units(scQty)}</td>
          <td>${money(scQty * scPrice)}</td>
          <td>${money(scStop)}</td>
          <td>${money(scRisk)}</td>
        </tr>
      `;
    });

    rowsHtml += `
      <tr class="total-row">
        <td><strong>Total Consolidado</strong></td>
        <td><strong>${money(consolidated.averageEntryPrice)} (PM)</strong></td>
        <td><strong>${units(consolidated.totalEnteredQty)} un. (${units(consolidated.remainingQty)} ativas)</strong></td>
        <td><strong>${money(consolidated.totalAllocatedCapital)}</strong></td>
        <td><strong>Stop: ${money(position.currentStop)}</strong></td>
        <td><strong>${multiple(consolidated.totalR)}</strong></td>
      </tr>
    `;

    dialog.innerHTML = `
      <header class="scale-in-dialog-header">
        <div>
          <div class="eyebrow">Gestão do Trade · Aumento de Posição</div>
          <h3>Fazer Scale-In · ${safe(position.asset)}</h3>
          <p class="scale-in-dialog-subtitle">Cálculo e dimensionamento orientados exclusivamente pela Política de Risco configurada.</p>
        </div>
        <button type="button" class="close scale-in-close-btn" data-scale-in-cancel aria-label="Fechar">✕</button>
      </header>
      <form data-scale-in-trade="${safe(position.id)}">
        <div class="scale-in-form-grid">
          <label>
            Preço da Adição
            <input name="price" type="number" step="0.01" min="0.01" value="${position.currentPrice}" required>
          </label>
          <label>
            Quantidade Sugerida
            <input name="quantity" type="number" step="1" min="1" value="${suggestedQty}" required>
          </label>
          <label>
            Stop Considerado
            <input name="stop" type="number" step="0.01" min="0.01" value="${position.currentStop}" required>
          </label>
          <label>
            Data e Hora
            <input name="occurredAt" type="datetime-local" value="${localDateTime}" required>
          </label>
          <label style="grid-column: span 2">
            Motivo / Justificativa
            <input name="note" type="text" placeholder="Ex: Rompimento do primeiro pullback com risco zerado">
          </label>
        </div>

        <div class="scale-in-calc-preview"></div>

        <div class="scale-in-validation-box">
          <h4>Auditoria de Regras da Política de Risco</h4>
          <ul class="scale-in-checklist"></ul>
        </div>

        <details class="scale-in-consolidated-details">
          <summary>Ver Composição Consolidada da Posição</summary>
          <div class="consolidated-table-wrap" style="margin-top:10px">
            <table class="consolidated-table">
              <thead>
                <tr>
                  <th>Etapa</th>
                  <th>Preço</th>
                  <th>Quantidade</th>
                  <th>Capital</th>
                  <th>Stop</th>
                  <th>Risco / R</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </details>

        <div class="pm-form-actions" style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end">
          <button type="button" class="secondary" data-scale-in-cancel>Cancelar</button>
          <button type="submit" class="primary">CONFIRMAR SCALE-IN</button>
        </div>
      </form>
    `;

    dialog.showModal();
    updateModalPreview(dialog, position);
  });

  // Modal Cancel
  document.addEventListener('click', event => {
    if (event.target.closest('[data-scale-in-cancel]')) {
      const dialog = document.getElementById('scale-in-dialog');
      if (dialog) dialog.close();
    }
  });

  // Modal Input Change
  document.addEventListener('input', event => {
    const form = event.target.closest('form[data-scale-in-trade]');
    if (!form) return;
    const dialog = form.closest('dialog');
    const position = locate(form.dataset.scaleInTrade);
    if (dialog && position) {
      updateModalPreview(dialog, position);
    }
  });

  // Modal Submit
  document.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-scale-in-trade]');
    if (!form) return;
    event.preventDefault();

    const position = locate(form.dataset.scaleInTrade);
    if (!position) return;

    if (!window.healthyTrendApi?.isAuthenticated()) {
      showToast('Entre no workspace para salvar o Scale-In.');
      return;
    }

    const price = Number(form.elements.price.value);
    const quantity = Math.floor(Number(form.elements.quantity.value));
    const stop = Number(form.elements.stop.value);
    const note = form.elements.note.value.trim();
    const occurredAt = new Date(form.elements.occurredAt.value).toISOString();

    const submitBtn = form.querySelector('[type=submit]');
    submitBtn.disabled = true;

    try {
      await window.healthyTrendApi.request(`/api/trades/${position.id}/scale-ins`, {
        method: 'POST',
        body: JSON.stringify({ price, quantity, stop, note, occurredAt })
      });
      form.closest('dialog')?.close();
      await syncOperationalFromDatabase();
      openPosition(position.id);
      showToast('Scale-In registrado com sucesso!');
    } catch (error) {
      showToast(error.message || 'Erro ao registrar Scale-In.');
      submitBtn.disabled = false;
    }
  });

  // Hook renderEffectiveRiskPolicy — Seção "SCALE-IN — AUMENTO DE POSIÇÃO"
  const previousRiskRender = window.renderEffectiveRiskPolicy;
  window.renderEffectiveRiskPolicy = function () {
    if (typeof previousRiskRender === 'function') {
      previousRiskRender();
    }

    const shell = document.getElementById('effectiveRiskPolicy');
    if (!shell || shell.querySelector('.risk-policy-scale-in')) return;

    const saved = getScaleInConfig();
    const stepNumber = shell.querySelectorAll('.risk-policy-block').length + 1;

    const scaleBlock = document.createElement('section');
    scaleBlock.className = 'risk-policy-block risk-policy-scale-in' + (!saved.enabled ? ' is-policy-disabled' : '');
    scaleBlock.innerHTML = `
      <div class="risk-block-title">
        <span>${stepNumber}</span>
        <div class="risk-title-content">
          <div class="risk-title-row">
            <h4>Scale-In — Aumento de Posição</h4>
            <button type="button" 
                    class="risk-artistic-toggle ${saved.enabled ? 'is-on' : 'is-off'}" 
                    role="switch" 
                    aria-checked="${saved.enabled ? 'true' : 'false'}"
                    data-risk-toggle="scaleIn"
                    title="${saved.enabled ? 'Scale-In ativado — Clique para desativar' : 'Scale-In desativado — Clique para ativar'}">
              <span class="risk-toggle-label on">ON</span>
              <span class="risk-toggle-thumb"></span>
              <span class="risk-toggle-label off">OFF</span>
            </button>
          </div>
          <p>Configure os parâmetros para permitir o aumento de posições vencedoras. Se desativado, o recurso não aparece na Gestão do Trade.</p>
        </div>
      </div>
      <input type="hidden" data-scale-in-setting="enabled" value="${saved.enabled ? 'on' : 'off'}">
      <div class="scale-in-policy-grid">
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Nº máximo de adições</label>
            <select data-scale-in-setting="maxAdditions">
              <option value="1" ${saved.maxAdditions === 1 ? 'selected' : ''}>1 adição</option>
              <option value="2" ${saved.maxAdditions === 2 ? 'selected' : ''}>2 adições (Padrão)</option>
              <option value="3" ${saved.maxAdditions === 3 ? 'selected' : ''}>3 adições</option>
            </select>
          </div>
        </div>
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Gatilho da 1ª adição</label>
            <select data-scale-in-setting="triggerR1">
              <option value="0.5" ${Math.abs(saved.triggerR1 - 0.5) < 0.01 ? 'selected' : ''}>+0,5R</option>
              <option value="1.0" ${Math.abs(saved.triggerR1 - 1.0) < 0.01 ? 'selected' : ''}>+1,0R (Padrão)</option>
              <option value="1.5" ${Math.abs(saved.triggerR1 - 1.5) < 0.01 ? 'selected' : ''}>+1,5R</option>
              <option value="2.0" ${Math.abs(saved.triggerR1 - 2.0) < 0.01 ? 'selected' : ''}>+2,0R</option>
            </select>
          </div>
        </div>
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Gatilho da 2ª adição</label>
            <select data-scale-in-setting="triggerR2">
              <option value="1.5" ${Math.abs(saved.triggerR2 - 1.5) < 0.01 ? 'selected' : ''}>+1,5R</option>
              <option value="2.0" ${Math.abs(saved.triggerR2 - 2.0) < 0.01 ? 'selected' : ''}>+2,0R (Padrão)</option>
              <option value="2.5" ${Math.abs(saved.triggerR2 - 2.5) < 0.01 ? 'selected' : ''}>+2,5R</option>
              <option value="3.0" ${Math.abs(saved.triggerR2 - 3.0) < 0.01 ? 'selected' : ''}>+3,0R</option>
            </select>
          </div>
        </div>
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Risco máx. resultante (% conta)</label>
            <input type="number" step="0.05" min="0.1" max="2.0" data-scale-in-setting="maxRiskPct" value="${saved.maxRiskPct}">
          </div>
        </div>
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Exigir Breakeven (Ongoing Risk)</label>
            <select data-scale-in-setting="requireBreakeven">
              <option value="true" ${saved.requireBreakeven ? 'selected' : ''}>Sim (Stop protegido na entrada)</option>
              <option value="false" ${!saved.requireBreakeven ? 'selected' : ''}>Não (Permitir antes)</option>
            </select>
          </div>
        </div>
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Respeitar Limite de Capital</label>
            <select data-scale-in-setting="respectCapital">
              <option value="true" selected>Sim (Obrigatório — limite do perfil)</option>
            </select>
          </div>
        </div>
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Respeitar Heat Máximo do Portfólio</label>
            <select data-scale-in-setting="respectPortfolioHeat">
              <option value="true" ${saved.respectPortfolioHeat ? 'selected' : ''}>Sim (Obrigatório)</option>
              <option value="false" ${!saved.respectPortfolioHeat ? 'selected' : ''}>Não</option>
            </select>
          </div>
        </div>
      </div>
      <div class="scale-in-policy-footer">
        <div class="scale-in-policy-hint">
          <span>Princípio da Política:</span> O Scale-In é uma ferramenta opcional de gestão. Quando ativado, permite aportes graduais à medida que os gatilhos em R são conquistados e o stop protege o capital inicial. Quando desativado, o recurso não é exibido na Gestão do Trade.
        </div>
      </div>
    `;

    shell.append(scaleBlock);
  };

  // Change listener for Scale-In policy settings
  document.addEventListener('change', async event => {
    if (!event.target.matches('[data-scale-in-setting]')) return;
    const inputs = document.querySelectorAll('#effectiveRiskPolicy [data-scale-in-setting]');
    const values = Object.fromEntries([...inputs].map(input => [input.dataset.scaleInSetting, input.value]));

    const triggerR1 = Math.max(0, Number(values.triggerR1 || values.minR || 1.0));
    const triggerR2 = Math.max(0, Number(values.triggerR2 || 2.0));

    if (!window.riskPolicyState) window.riskPolicyState = {};
    window.riskPolicyState.scaleIn = {
      enabled: values.enabled === 'on',
      maxAdditions: Math.max(1, Math.min(5, Math.floor(Number(values.maxAdditions || 2)))),
      minR: triggerR1,
      triggerR1,
      triggerR2,
      requireBreakeven: values.requireBreakeven === 'true',
      maxRiskPct: Math.max(0, Number(values.maxRiskPct || 0.5)),
      respectPortfolioHeat: values.respectPortfolioHeat === 'true',
      allowLosingTrades: false
    };

    if (typeof persistRiskPolicy === 'function') {
      await persistRiskPolicy();
    }
    if (typeof renderEffectiveRiskPolicy === 'function') {
      renderEffectiveRiskPolicy();
    }
  });

  // Toggle button click listener for Scale-In
  document.addEventListener('click', async event => {
    const toggle = event.target.closest('[data-risk-toggle="scaleIn"]');
    if (!toggle) return;
    event.preventDefault();
    const current = getScaleInConfig();
    const newEnabled = !current.enabled;
    if (!window.riskPolicyState) window.riskPolicyState = {};
    window.riskPolicyState.scaleIn = {
      ...current,
      enabled: newEnabled
    };
    if (typeof persistRiskPolicy === 'function') await persistRiskPolicy();
    if (typeof renderEffectiveRiskPolicy === 'function') renderEffectiveRiskPolicy();
    if (typeof renderOperationalApp === 'function') renderOperationalApp();
    showToast(newEnabled ? 'Scale-In ativado.' : 'Scale-In desativado.');
  });

  // Analytics Hook for Scale-In performance
  const previousRenderAnalytics = window.renderAnalyticsFromDatabase;
  window.renderAnalyticsFromDatabase = function (trades = synchronizedTrades) {
    if (typeof previousRenderAnalytics === 'function') {
      previousRenderAnalytics(trades);
    }
    const root = document.getElementById('analytics');
    if (!root || !model.calculateScaleInAnalytics) return;

    const stats = model.calculateScaleInAnalytics(trades);
    if (!stats || stats.totalClosed === 0) return;

    const analyticsGrid = root.querySelector('.analytics-grid');
    if (!analyticsGrid) return;

    const scaleCard = document.createElement('section');
    scaleCard.className = 'card scale-in-analytics-card';
    scaleCard.style.marginTop = '18px';
    scaleCard.innerHTML = `
      <div class="card-head">
        <div>
          <h3>Performance com Scale-In</h3>
          <span>Comparativo de trades com aumento de lote vs sem aumento</span>
        </div>
      </div>
      <div class="grid kpis" style="margin-top:14px">
        <div class="card kpi">
          <small>Trades com Scale-In</small>
          <strong>${stats.withScaleIn.count} operações</strong>
          <div class="delta">Taxa de acerto: ${numBR(stats.withScaleIn.winRate, 0)}%</div>
        </div>
        <div class="card kpi">
          <small>R Médio com Scale-In</small>
          <strong class="${stats.withScaleIn.avgR >= 0 ? 'good' : 'bad'}">${stats.withScaleIn.avgR >= 0 ? '+' : ''}${numBR(stats.withScaleIn.avgR, 2)}R</strong>
          <div class="delta">Resultado: ${money(stats.withScaleIn.totalResult)}</div>
        </div>
        <div class="card kpi">
          <small>Trades sem Scale-In</small>
          <strong>${stats.withoutScaleIn.count} operações</strong>
          <div class="delta">Taxa de acerto: ${numBR(stats.withoutScaleIn.winRate, 0)}%</div>
        </div>
        <div class="card kpi">
          <small>R Médio sem Scale-In</small>
          <strong class="${stats.withoutScaleIn.avgR >= 0 ? 'good' : 'bad'}">${stats.withoutScaleIn.avgR >= 0 ? '+' : ''}${numBR(stats.withoutScaleIn.avgR, 2)}R</strong>
          <div class="delta">Resultado: ${money(stats.withoutScaleIn.totalResult)}</div>
        </div>
      </div>
    `;

    analyticsGrid.after(scaleCard);
  };
})();

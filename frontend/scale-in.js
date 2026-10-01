(function () {
  'use strict';

  const model = window.ScaleInModel;
  if (!model) return;

  const locate = id => operationalState.positions.find(position => position.id === id);
  const money = value => typeof moneyBR === 'function' ? moneyBR(value) : `R$ ${Number(value || 0).toFixed(2)}`;
  const units = value => typeof numBR === 'function' ? numBR(value) : String(value || 0);
  const multiple = value => value == null ? '—' : `${value >= 0 ? '+' : ''}${typeof numBR === 'function' ? numBR(value, 2) : Number(value).toFixed(2)}R`;
  const pct = value => `${typeof numBR === 'function' ? numBR(value, 2) : Number(value || 0).toFixed(2)}%`;

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

    const scaleConfig = getScaleInConfig();
    const info = model.initialTradeInfo(p);
    const validation = model.canExecuteScaleIn({
      trade: p,
      scaleIn: { price: p.currentPrice, stop: p.currentStop },
      equity: typeof OPERATIONAL_EQUITY !== 'undefined' ? OPERATIONAL_EQUITY : 1029500,
      policy: window.riskPolicyState,
      openTrades: operationalState.positions
    });
    const consolidated = model.calculateConsolidatedPosition({ trade: p, events: p.events });

    const scaleInCard = document.createElement('section');
    scaleInCard.className = 'card scale-in-card';
    scaleInCard.id = 'scaleInSection';

    const triggerMet = info.currentR !== null && info.currentR >= (scaleConfig.minR - 0.0001);

    const stats = [
      ['Adições realizadas', `${info.scaleInCount} / ${scaleConfig.maxAdditions}`, ''],
      ['Próximo gatilho', `+${scaleConfig.minR.toFixed(1)}R`, triggerMet ? 'highlight' : ''],
      ['R atual', multiple(info.currentR), triggerMet ? 'highlight' : ''],
      ['Risco atual', pct(validation.metrics.currentRiskPct), ''],
      ['Capital alocado', money(info.currentAllocatedCapital), ''],
      ['Capital máximo permitido', money(validation.metrics.maxCapitalAllowed), '']
    ];

    // Build consolidated table rows
    const scaleEvents = (p.events || []).filter(e => e.type === 'scale_in');
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
      const scStop = Number(sc.stop || p.currentStop);
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
        <td><strong>Stop: ${money(p.currentStop)}</strong></td>
        <td><strong>${multiple(consolidated.totalR)}</strong></td>
      </tr>
    `;

    const statusMsg = validation.allowed
      ? `<span class="scale-in-status-msg ready">✓ Trade qualificado para aumento de lote (+${scaleConfig.minR.toFixed(1)}R atingido e stop protegido).</span>`
      : `<span class="scale-in-status-msg blocked">⚠️ ${validation.reason || 'Condições da Política de Risco não atendidas.'}</span>`;

    scaleInCard.innerHTML = `
      <header>
        <div>
          <div class="eyebrow">Gestão do Trade</div>
          <h3>Scale-In · Aumento de Posição</h3>
        </div>
        <span class="badge ${scaleConfig.enabled ? 'good' : 'warn'}">${scaleConfig.enabled ? 'Scale-In Ativado' : 'Scale-In Desativado'}</span>
      </header>
      <div class="scale-in-grid">
        ${stats.map(([label, val, cls]) => `
          <div class="scale-in-stat ${cls}">
            <small>${safe(label)}</small>
            <strong>${safe(val)}</strong>
          </div>
        `).join('')}
      </div>

      <div class="consolidated-view">
        <h4>Composição Consolidada da Posição</h4>
        <div class="consolidated-table-wrap">
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
      </div>

      <div class="scale-in-action-bar">
        ${statusMsg}
        <button type="button" class="primary" data-scale-in-btn="${safe(p.id)}" ${validation.allowed ? '' : 'disabled'} title="${validation.allowed ? 'Adicionar Scale-In' : safe(validation.reason || 'Bloqueado por política')}">
          + Adicionar Scale-In
        </button>
      </div>
      <dialog class="scale-in-dialog" id="scale-in-dialog"></dialog>
    `;

    // Insert after .position-management card or after .grid.kpis
    const pmCard = host.querySelector('.card.position-management');
    if (pmCard) {
      pmCard.after(scaleInCard);
    } else {
      const kpis = host.querySelector('.grid.kpis');
      if (kpis) kpis.after(scaleInCard);
      else host.prepend(scaleInCard);
    }

    // Enhance timeline for scale-in events
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
    const previewContainer = dialog.querySelector('.scale-in-calc-preview');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="scale-in-calc-card">
          <h5>Trade Atual</h5>
          <div>Entrada inicial: <b>${money(m.currentAvgPrice)}</b></div>
          <div>Quantidade ativa: <b>${units(m.currentQuantity)} un.</b></div>
          <div>Preço atual: <b>${money(price)}</b></div>
          <div>R atual: <b>${multiple(m.currentR)}</b></div>
          <div>Risco atual: <b>${pct(m.currentRiskPct)} (${money(m.currentRiskCash)})</b></div>
        </div>
        <div class="scale-in-calc-card">
          <h5>Scale-In Proposto</h5>
          <div>Preço de entrada: <b>${money(price)}</b></div>
          <div>Quantidade: <b>+${units(quantity)} un.</b></div>
          <div>Stop considerado: <b>${money(stop)}</b></div>
          <div>Capital adicional: <b>${money(m.additionalCapital)}</b></div>
          <div>Risco adicional: <b>+${pct(m.additionalRiskPct)} (${money(m.additionalRiskCash)})</b></div>
        </div>
        <div class="scale-in-calc-card result-card">
          <h5>Após Scale-In</h5>
          <div>Quantidade total: <b>${units(m.newQuantity)} un.</b></div>
          <div>Novo preço médio: <b>${money(m.newAvgPrice)}</b></div>
          <div>Capital total: <b>${money(m.totalCapitalAfter)}</b></div>
          <div>Risco total resultante: <b>${pct(m.totalRiskPctAfter)} (${money(m.totalRiskCashAfter)})</b></div>
          <div>Portfolio Heat: <b>${pct(m.projectedHeatPct)}</b></div>
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
        submitBtn.title = 'Confirmar adição de lote';
      }
    }
  }

  // Click on "+ Adicionar Scale-In"
  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-scale-in-btn]');
    if (!btn) return;

    const position = locate(btn.dataset.scaleInBtn);
    const dialog = document.getElementById('scale-in-dialog');
    if (!position || !dialog) return;

    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const initialQty = Number(position.initialQty || 100);
    const suggestedQty = Math.max(1, Math.floor(initialQty * 0.5));

    dialog.innerHTML = `
      <h3>Adicionar Scale-In · ${safe(position.asset)}</h3>
      <p class="scale-in-dialog-subtitle">Aumento de posição vencedora com risco auditado pela Política de Risco.</p>
      <form data-scale-in-trade="${safe(position.id)}">
        <div class="scale-in-form-grid">
          <label>
            Preço de Entrada
            <input name="price" type="number" step="0.01" min="0.01" value="${position.currentPrice}" required>
          </label>
          <label>
            Quantidade
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
            Motivo / Observação
            <input name="note" type="text" placeholder="Ex: Rompimento do primeiro pullback com risco zerado">
          </label>
        </div>

        <div class="scale-in-calc-preview"></div>

        <div class="scale-in-validation-box">
          <h4>Validação de Risco</h4>
          <ul class="scale-in-checklist"></ul>
        </div>

        <div class="pm-form-actions" style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end">
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

  // Hook renderEffectiveRiskPolicy
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
    scaleBlock.className = 'risk-policy-block risk-policy-scale-in';
    scaleBlock.innerHTML = `
      <div class="risk-block-title">
        <span>${stepNumber}</span>
        <div>
          <h4>Scale-In (Aumento de Posição)</h4>
          <p>Permite aumentar uma posição vencedora de forma controlada; nunca permite adicionar risco em operações perdedoras.</p>
        </div>
      </div>
      <div class="scale-in-policy-grid">
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Scale-In Habilitado</label>
            <select data-scale-in-setting="enabled">
              <option value="on" ${saved.enabled ? 'selected' : ''}>Sim (ON)</option>
              <option value="off" ${!saved.enabled ? 'selected' : ''}>Não (OFF)</option>
            </select>
          </div>
        </div>
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Máximo de adições por trade</label>
            <select data-scale-in-setting="maxAdditions">
              <option value="1" ${saved.maxAdditions === 1 ? 'selected' : ''}>1 adição</option>
              <option value="2" ${saved.maxAdditions === 2 ? 'selected' : ''}>2 adições (Padrão)</option>
              <option value="3" ${saved.maxAdditions === 3 ? 'selected' : ''}>3 adições</option>
            </select>
          </div>
        </div>
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Gatilho mínimo para primeiro Scale-In</label>
            <select data-scale-in-setting="minR">
              <option value="0.5" ${Math.abs(saved.minR - 0.5) < 0.01 ? 'selected' : ''}>+0.5R</option>
              <option value="1.0" ${Math.abs(saved.minR - 1.0) < 0.01 ? 'selected' : ''}>+1.0R (Padrão)</option>
              <option value="1.5" ${Math.abs(saved.minR - 1.5) < 0.01 ? 'selected' : ''}>+1.5R</option>
              <option value="2.0" ${Math.abs(saved.minR - 2.0) < 0.01 ? 'selected' : ''}>+2.0R</option>
            </select>
          </div>
        </div>
        <div class="scale-in-policy-item">
          <div class="field">
            <label>Permitir antes do breakeven</label>
            <select data-scale-in-setting="requireBreakeven">
              <option value="true" ${saved.requireBreakeven ? 'selected' : ''}>Não (Exige Breakeven)</option>
              <option value="false" ${!saved.requireBreakeven ? 'selected' : ''}>Sim (Permitido)</option>
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
          <span>Proteção de Capital:</span> O Scale-In transforma o lucro aberto em colchão de segurança. A posição só é aumentada quando o trade já provou sua tese.
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

    if (!window.riskPolicyState) window.riskPolicyState = {};
    window.riskPolicyState.scaleIn = {
      enabled: values.enabled === 'on',
      maxAdditions: Math.max(1, Math.min(5, Math.floor(Number(values.maxAdditions || 2)))),
      minR: Math.max(0, Number(values.minR || 1.0)),
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

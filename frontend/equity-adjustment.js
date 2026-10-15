(function (root) {
  'use strict';

  const STORAGE_KEY = 'healthy-trend-operational-equity';
  let operationalEquity = 1029500;

  // Initialize from cache if available
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const num = Number(cached);
      if (Number.isFinite(num) && num > 0) operationalEquity = num;
    }
  } catch (_) {}

  function getOperationalEquity() {
    return operationalEquity;
  }

  function setOperationalEquity(val) {
    const num = Number(val);
    if (Number.isFinite(num) && num > 0) {
      operationalEquity = num;
      root.OPERATIONAL_EQUITY = num;
      if (typeof root.POSITION_SIZE_CONFIG !== 'undefined' && root.POSITION_SIZE_CONFIG) {
        root.POSITION_SIZE_CONFIG.equity = num;
      }
      try {
        localStorage.setItem(STORAGE_KEY, String(num));
      } catch (_) {}
    }
  }

  // Export accessors globally
  root.getOperationalEquity = getOperationalEquity;
  root.setOperationalEquity = setOperationalEquity;
  root.OPERATIONAL_EQUITY = operationalEquity;

  async function syncEquityFromBackend() {
    if (!root.healthyTrendApi?.isAuthenticated?.()) return;
    try {
      const res = await root.healthyTrendApi.request('/api/wealth');
      if (res && res.summary) {
        const val = Number(res.summary.operationalEquity ?? res.summary.realWealth);
        if (Number.isFinite(val) && val > 0) {
          setOperationalEquity(val);
          notifyEquityUpdated(val);
        }
      }
    } catch (_) {}
  }

  function notifyEquityUpdated(newEquity) {
    // 1. Recalculate operational open positions and Portfolio Heat
    if (typeof root.operationalState !== 'undefined' && root.operationalState) {
      root.saveOperationalState?.();
    }

    // 2. Refresh UI components
    root.renderOperationalApp?.();
    root.renderTodayCockpit?.();
    root.renderTopHeat?.();
    root.calcPositionSizing?.();
    root.recalc?.();
    root.renderEffectiveRiskPolicy?.();
    root.renderPortfolioHeat?.();
    root.renderWealth?.();

    // 3. Dispatch events
    root.dispatchEvent(new CustomEvent('healthyTrend:equityUpdated', { detail: { newEquity } }));
    root.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));
  }

  function closeEquityAdjustModal() {
    const modal = document.getElementById('equityAdjustModalOverlay');
    if (modal) modal.remove();
    document.removeEventListener('keydown', handleModalKeyDown);
  }

  function handleModalKeyDown(e) {
    if (e.key === 'Escape') closeEquityAdjustModal();
  }

  function openEquityAdjustModal() {
    closeEquityAdjustModal();

    const currentVal = getOperationalEquity();
    const formattedCurrent = (root.EquityAdjustmentModel?.formatCurrencyBR || ((v) => 'R$ ' + Number(v).toLocaleString('pt-BR')))(currentVal);
    const inputVal = Number(currentVal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const overlay = document.createElement('div');
    overlay.id = 'equityAdjustModalOverlay';
    overlay.className = 'equity-adjust-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'equityAdjustModalTitle');

    overlay.innerHTML = `
      <div class="equity-adjust-modal-card">
        <button type="button" class="equity-adjust-close-btn" id="equityAdjustCloseBtn" aria-label="Fechar" title="Fechar">×</button>
        <header class="equity-adjust-modal-header">
          <span class="equity-adjust-modal-eyebrow">Patrimônio Operacional</span>
          <h2 class="equity-adjust-modal-title" id="equityAdjustModalTitle">Atualizar Equity Total</h2>
          <p class="equity-adjust-modal-desc">
            Informe o patrimônio atualizado da sua conta. Esse valor será utilizado nos cálculos de risco e dimensionamento das próximas operações.
          </p>
        </header>

        <div class="equity-adjust-meta-box">
          <span>Valor atual cadastrado</span>
          <strong id="equityAdjustCurrentDisplay">${formattedCurrent}</strong>
        </div>

        <form class="equity-adjust-form" id="equityAdjustForm">
          <div class="equity-adjust-field">
            <label for="equityAdjustInput">Equity Total atual (R$)</label>
            <div class="equity-adjust-input-wrap">
              <span class="equity-adjust-currency-prefix">R$</span>
              <input
                id="equityAdjustInput"
                class="equity-adjust-input"
                type="text"
                inputmode="decimal"
                required
                value="${inputVal}"
                placeholder="0,00"
                autocomplete="off"
              />
            </div>
            <div class="equity-adjust-error" id="equityAdjustError"></div>
          </div>

          <div class="equity-adjust-field">
            <label for="equityAdjustReason">
              Motivo do ajuste <small>(opcional)</small>
            </label>
            <textarea
              id="equityAdjustReason"
              class="equity-adjust-textarea"
              rows="2"
              maxlength="500"
              placeholder="Ex.: Atualização de saldo, correção de valor ou conciliação patrimonial"
            ></textarea>
          </div>

          <div class="equity-adjust-modal-actions">
            <button type="button" class="equity-adjust-btn-cancel" id="equityAdjustCancelBtn">Cancelar</button>
            <button type="submit" class="equity-adjust-btn-save" id="equityAdjustSaveBtn">Salvar patrimônio</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event handlers
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeEquityAdjustModal();
    });

    const closeBtn = overlay.querySelector('#equityAdjustCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeEquityAdjustModal);

    const cancelBtn = overlay.querySelector('#equityAdjustCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeEquityAdjustModal);

    const form = overlay.querySelector('#equityAdjustForm');
    const input = overlay.querySelector('#equityAdjustInput');
    const reasonInput = overlay.querySelector('#equityAdjustReason');
    const errorEl = overlay.querySelector('#equityAdjustError');
    const saveBtn = overlay.querySelector('#equityAdjustSaveBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.classList.remove('show');
      errorEl.textContent = '';

      const validation = (root.EquityAdjustmentModel?.validateAdjustment || ((p) => ({ valid: true, amount: parseFloat(p.amount) })))({
        amount: input.value,
        reason: reasonInput.value
      }, currentVal);

      if (!validation.valid) {
        errorEl.textContent = validation.error || 'Valor inválido.';
        errorEl.classList.add('show');
        input.focus();
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando…';

      try {
        if (root.healthyTrendApi?.isAuthenticated?.()) {
          const res = await root.healthyTrendApi.request('/api/wealth/adjustments', {
            method: 'POST',
            body: {
              amount: validation.amount,
              reason: validation.reason
            }
          });
          if (res?.operationalEquity) {
            setOperationalEquity(res.operationalEquity);
          } else {
            setOperationalEquity(validation.amount);
          }
        } else {
          setOperationalEquity(validation.amount);
        }

        // Also update wealth cache if present
        try {
          const cachedWealth = localStorage.getItem('healthy-trend-wealth-cache');
          if (cachedWealth) {
            const parsed = JSON.parse(cachedWealth);
            if (parsed.summary) {
              parsed.summary.realWealth = validation.amount;
              parsed.summary.operationalEquity = validation.amount;
            }
            localStorage.setItem('healthy-trend-wealth-cache', JSON.stringify(parsed));
          }
        } catch (_) {}

        // Trigger wealth reload if on or visiting dashboard
        root.loadWealth?.();

        notifyEquityUpdated(validation.amount);
        closeEquityAdjustModal();

        if (typeof root.showToast === 'function') {
          root.showToast('Patrimônio atualizado com sucesso.');
        }
      } catch (err) {
        console.error('Erro ao salvar ajuste de equity:', err);
        errorEl.textContent = err?.message || 'Não foi possível salvar o ajuste. Tente novamente.';
        errorEl.classList.add('show');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar patrimônio';
      }
    });

    document.addEventListener('keydown', handleModalKeyDown);

    // Auto-focus input and select text
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }

  root.openEquityAdjustModal = openEquityAdjustModal;
  root.closeEquityAdjustModal = closeEquityAdjustModal;

  root.addEventListener('healthyTrend:authenticated', syncEquityFromBackend);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncEquityFromBackend);
  } else {
    syncEquityFromBackend();
  }
})(typeof window !== 'undefined' ? window : globalThis);

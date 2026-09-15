(function () {
  'use strict';

  function decoratePositionActions() {
    const model = window.PositionManagementModel;
    if (!model || typeof operationalState === 'undefined' || typeof riskPolicyState === 'undefined') return;
    document.querySelectorAll('#positions .position-card[data-position-id]').forEach(card => {
      const position = operationalState.positions.find(item => String(item.id) === card.dataset.positionId);
      if (!position) return;
      const actions = model.actions(position, operationMetrics(position), {
        sellIntoStrength: riskPolicyState.sellIntoStrength,
        policy: riskPolicyState,
        equity: OPERATIONAL_EQUITY,
        profileKey: position.riskProfile || riskPolicyState.selectedProfile,
        lot: 100
      });
      const body = card.querySelector('.position-body');
      if (!body || !actions.length) return;
      body.insertAdjacentHTML('beforeend', `<div class="position-action-queue" aria-label="Ações pendentes">${actions.map(action => `<div class="position-action-badge ${action.priority}" title="${safe(action.detail)}"><i aria-hidden="true">${action.type === 'peeloff' ? '↓' : '↗'}</i><span><b>${safe(action.label)}</b><small>${safe(action.detail)}</small></span></div>`).join('')}</div>`);
    });
  }

  const previousRenderOperationalApp = renderOperationalApp;
  renderOperationalApp = function () {
    previousRenderOperationalApp?.();
    decoratePositionActions();
  };
  decoratePositionActions();
}());

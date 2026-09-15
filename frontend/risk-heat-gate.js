(function () {
  'use strict';
  const originalRefresh = refreshWorkbenchRiskGate;
  const format = value => numBR(value, 2) + '%';

  function projectedHeat() {
    const profile = selectedRiskProfile();
    const entry = Number(document.getElementById('entry')?.value) || 0;
    const stop = Number(document.getElementById('stop')?.value) || 0;
    const atr = Number(document.getElementById('atr')?.value) || 0;
    const result = TradingRubrics.calculateRubric(currentRubricInput?.() || {}, riskPolicyState);
    const sizing = TradingRubrics.calculatePositionSizing({
      equity: OPERATIONAL_EQUITY, entry, stop, atr, riskPct: result.riskPct,
      volatilityPct: profile.initialVolatilityPct, capitalPct: profile.capitalPct, lot: 100
    });
    const current = (operationalState?.positions || []).filter(position => position.mode === 'real')
      .reduce((total, position) => total + (operationMetrics(position).riskPct || 0), 0);
    return { current, projected: current + sizing.initialRisk / OPERATIONAL_EQUITY * 100, limit: portfolioHeatLimitPct() };
  }

  refreshWorkbenchRiskGate = function () {
    originalRefresh();
    const sizer = document.querySelector('.workbench-sizer');
    if (!sizer) return;
    const data = projectedHeat();
    const rubric = TradingRubrics.calculateRubric(currentRubricInput?.() || {}, riskPolicyState);
    const invalidWeights = !rubric.weightsValid;
    const exceeded = data.current >= data.limit || data.projected > data.limit;
    const reason = data.current >= data.limit
      ? `Portfolio Heat já excedido: ${format(data.current)} de ${format(data.limit)}.`
      : `Este trade elevaria o Portfolio Heat para ${format(data.projected)}, acima do limite de ${format(data.limit)}.`;
    sizer.classList.toggle('is-heat-exceeded', exceeded || invalidWeights);
    let callout = sizer.querySelector('.workbench-heat-callout');
    if (!callout) {
      callout = document.createElement('div');
      callout.className = 'workbench-heat-callout';
      sizer.querySelector('.three-layers')?.before(callout);
    }
    callout.hidden = !(exceeded || invalidWeights);
    if (invalidWeights) callout.innerHTML = `<b>PESOS DA RUBRIC INVÁLIDOS</b><span>Total atual: ${numBR(rubric.weightsTotal, 2)} de 100,00 pontos. Ajuste a Política de Risco antes de abrir uma nova posição.</span>`;
    else if (exceeded) callout.innerHTML = `<b>HEAT EXCEDIDO</b><span>${reason} Tome providência antes de abrir uma nova posição.</span>`;

    const layer = document.getElementById('tradeLayerPortfolio');
    const final = sizer.querySelector('.final-size');
    const details = document.getElementById('tradeFinalDetails');
    layer?.classList.toggle('heat-exceeded', exceeded);
    final?.classList.toggle('heat-exceeded', exceeded);
    if (exceeded && layer) layer.innerHTML = `<i>3</i><h3>Controle do portfólio</h3><p><span>Heat projetado <b>${format(data.projected)}</b> / ${format(data.limit)}</span><span class="layer-status">HEAT EXCEDIDO</span></p>`;
    if (exceeded && details) details.textContent = `Registro bloqueado: ${reason}`;

    const locked = sizer.classList.contains('is-locked');
    const blocked = locked || exceeded || invalidWeights;
    const quantity = document.getElementById('tradeExecutedQty');
    if (quantity) {
      quantity.disabled = blocked;
      quantity.setAttribute('aria-disabled', String(blocked));
      quantity.title = invalidWeights ? 'Ajuste os pesos da Rubric para totalizar 100 pontos.' : exceeded ? reason : locked ? 'Complete as Etapas 1 e 2 para registrar o trade.' : 'Ajuste opcional antes de registrar o trade.';
    }
    sizer.querySelectorAll('.summary-box button').forEach(button => {
      button.disabled = blocked;
      button.setAttribute('aria-disabled', String(blocked));
      button.title = invalidWeights ? 'Ajuste os pesos da Rubric para totalizar 100 pontos.' : exceeded ? reason : locked ? 'Complete as Etapas 1 e 2 para registrar o trade.' : '';
    });
  };
  refreshWorkbenchRiskGate();
}());

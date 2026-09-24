(function () {
  'use strict';
  const originalRefresh = refreshWorkbenchRiskGate;
  const format = value => numBR(value, 2) + '%';

  function projectedHeat() {
    const entry = Number(document.getElementById('entry')?.value) || 0;
    const stop = Number(document.getElementById('stop')?.value) || 0;
    const atr = Number(document.getElementById('atr')?.value) || 0;
    const result = TradingRubrics.calculateRubric(currentRubricInput?.() || {}, riskPolicyState);
    const sizing = calculateExecutableSizing(result, { entry, stop, atr });
    const current = (operationalState?.positions || []).filter(position => position.mode === 'real')
      .reduce((total, position) => total + (operationMetrics(position).riskPct || 0), 0);

    const execInput = document.getElementById('tradeExecutedQty');
    let effectiveRisk = sizing.initialRisk;
    if (execInput && execInput.value !== '' && Number(execInput.value) >= 0 && entry > 0 && stop > 0) {
      effectiveRisk = Math.abs(entry - stop) * Number(execInput.value);
    }
    return {
      current,
      projected: current + effectiveRisk / OPERATIONAL_EQUITY * 100,
      limit: sizing.maximumHeatPct,
      openPositions: sizing.openPositions,
      maximumPositions: sizing.profile?.maximumPositions,
      sizing
    };
  }

  refreshWorkbenchRiskGate = function () {
    originalRefresh();
    const sizer = document.querySelector('.workbench-sizer');
    if (!sizer) return;
    const data = projectedHeat();
    const rubric = TradingRubrics.calculateRubric(currentRubricInput?.() || {}, riskPolicyState);
    const invalidWeights = !rubric.weightsValid;
    const isGradeD = rubric.grade === 'D' || rubric.riskPct === 0;
    const isOverrideOpen = Boolean(document.getElementById('courageOverrideBox')?.style.display === 'block');
    const heatExceeded = data.current >= data.limit || data.projected > data.limit;
    const positionsExceeded = data.sizing.positionCapacityAvailable === false;
    const exceeded = heatExceeded || positionsExceeded;
    const reason = positionsExceeded
      ? `O perfil ativo já atingiu ${data.openPositions} de ${data.maximumPositions} posições simultâneas.`
      : data.current >= data.limit
        ? `Portfolio Heat já excedido: ${format(data.current)} de ${format(data.limit)}.`
        : `Este trade elevaria o Portfolio Heat para ${format(data.projected)}, acima do limite de ${format(data.limit)}.`;
    sizer.classList.toggle('is-heat-exceeded', exceeded || invalidWeights);
    let callout = sizer.querySelector('.workbench-heat-callout');
    if (!callout) {
      callout = document.createElement('div');
      callout.className = 'workbench-heat-callout';
      const mountTarget = sizer.querySelector('.workbench-sizer-body') || sizer.querySelector('.three-layers');
      mountTarget?.before(callout);
    }
    callout.hidden = !(exceeded || invalidWeights);
    if (invalidWeights) callout.innerHTML = `<b>PESOS DA RUBRIC INVÁLIDOS</b><span>Total atual: ${numBR(rubric.weightsTotal, 2)} de 100,00 pontos. Ajuste a Política de Risco antes de abrir uma nova posição.</span>`;
    else if (exceeded) callout.innerHTML = `<b>${positionsExceeded ? 'LIMITE DE POSIÇÕES ATINGIDO' : 'HEAT EXCEDIDO'}</b><span>${reason} Tome providência antes de abrir uma nova posição.</span>`;

    const layer = document.getElementById('tradeLayerPortfolio');
    const final = sizer.querySelector('.final-size');
    const details = document.getElementById('tradeFinalDetails');
    layer?.classList.toggle('heat-exceeded', exceeded);
    final?.classList.toggle('heat-exceeded', exceeded);
    if (exceeded && layer) layer.innerHTML = positionsExceeded
      ? `<i>3</i><h3>Exposição da carteira</h3><div class="layer-content layer-portfolio-content"><span class="portfolio-reading"><small>POSIÇÕES</small><b>${data.openPositions + 1} / ${data.maximumPositions}</b></span><span class="layer-status status-caution">LIMITANTE · máximo de posições</span></div>`
      : `<i>3</i><h3>Exposição da carteira</h3><div class="layer-content layer-portfolio-content"><span class="portfolio-reading"><small>PORTFOLIO HEAT</small><b>${format(data.current)} → ${format(data.projected)}</b><em>/ ${format(data.limit)}</em></span><span class="layer-status status-caution">LIMITANTE · Portfolio Heat</span></div>`;
    if (exceeded && details) details.textContent = `Registro bloqueado: ${reason}`;

    const locked = sizer.classList.contains('is-locked');
    const blacklistBlocked = Boolean(window.AssetBlacklist?.isBlocked?.());
    const blocked = locked || exceeded || invalidWeights || isGradeD || blacklistBlocked;
    const quantity = document.getElementById('tradeExecutedQty');
    if (quantity) {
      // A quantidade deve permanecer editável para que o usuário possa informar quantidade personalizada ou reduzir o lote
      const shouldDisableQuantity = isGradeD || (locked && !isOverrideOpen);
      quantity.disabled = shouldDisableQuantity;
      quantity.setAttribute('aria-disabled', String(shouldDisableQuantity));
      quantity.title = shouldDisableQuantity
        ? (isGradeD ? 'Operação não recomendada pela política.' : 'Complete as Etapas 1 e 2 para registrar o trade.')
        : 'Ajuste opcional antes de registrar o trade.';

      if (!quantity.dataset.heatListenerBound) {
        quantity.addEventListener('input', () => {
          refreshWorkbenchRiskGate();
        });
        quantity.dataset.heatListenerBound = 'true';
      }
    }
    sizer.querySelectorAll('.summary-box button').forEach(button => {
      button.disabled = blocked;
      button.setAttribute('aria-disabled', String(blocked));
      button.classList.toggle('is-blacklist-blocked', blacklistBlocked);
      button.toggleAttribute('data-blacklist-blocked', blacklistBlocked);
      button.title = blacklistBlocked ? 'Trade bloqueado pela sua Blacklist. Escolha outro ativo para continuar.' : invalidWeights ? 'Ajuste os pesos da Rubric para totalizar 100 pontos.' : exceeded ? reason : isGradeD ? 'Operação não recomendada pela política.' : locked ? 'Complete as Etapas 1 e 2 para registrar o trade.' : '';
    });
  };
  refreshWorkbenchRiskGate();
}());

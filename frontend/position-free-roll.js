(function () {
  'use strict';
  const model = window.PositionManagementModel;
  const locate = id => operationalState.positions.find(position => position.id === id);
  const money = value => moneyBR(value);
  const units = value => numBR(value);
  const multiple = value => value == null ? '—' : `${value >= 0 ? '+' : ''}${numBR(value, 2)}R`;
  const coverage = value => value == null ? '—' : Number.isFinite(value) ? `${numBR(value, 2)}x` : '∞';
  const config = () => model.settings(riskPolicyState?.sellIntoStrength);

  const previousOpenPosition = openPosition;
  openPosition = function (id) {
    previousOpenPosition(id);
    const p = locate(id), host = document.getElementById('positionDetail');
    if (!p || !host) return;
    const metric = operationMetrics(p), state = model.state(p, metric, config());
    const stats = [
      ['Risco inicial', state.initialRisk == null ? '—' : money(state.initialRisk), ''],
      ['R atual', multiple(state.currentR), state.sellAvailable ? 'pm-r-highlight' : ''],
      ['Lucro / prejuízo atual', money(metric.total), ''],
      ['Stop atual', money(p.currentStop), ''],
      ['Ongoing Risk', money(state.ongoingRisk), ''],
      ['Quantidade atual / original', `${units(state.remaining)} / ${units(state.originalQuantity || p.initialQty)}`, ''],
      ['Lucro realizado', money(state.realizedProfit), ''],
      ['Lucro aberto', money(state.openProfit), ''],
      ['Cobertura Free Roll', coverage(state.coverage), '']
    ];
    const action = state.sellAvailable && state.currentR != null ? `<div class="pm-sell-action"><button type="button" class="primary" data-pm-partial="${safe(p.id)}">REALIZAR PARCIAL</button><span class="pm-profit-symbol" role="img" aria-label="Realização de lucro" title="Realização de lucro">💰</span></div>` : '';
    const sellTitle = state.sellCount ? 'REALIZADO' : state.sellAvailable ? 'DISPONÍVEL' : 'EM ESPERA';
    const sellMessage = !state.sell.enabled ? 'Desabilitado nas configurações.' : state.sellCount ? state.freeRoll ? 'Sell Into Strength / parcial já registrado. O lucro realizado cobre o risco remanescente: Free Roll ativo.' : 'Sell Into Strength / parcial já registrado. O Runner segue em gestão; o Free Roll será ativado quando o lucro realizado cobrir o risco remanescente.' : state.currentR == null ? 'Cadastre um stop inicial válido para calcular R.' : state.sellAvailable ? 'O trade atingiu a zona configurada. Este é o momento de avaliar a realização parcial; o restante segue a tendência.' : state.remaining <= 1 ? 'É preciso manter ao menos uma unidade no Runner.' : 'Aguarde a expansão do trade. Não existe venda automática.';
    const card = document.createElement('section');
    card.className = 'card position-management';
    card.innerHTML = `<header><div><div class="eyebrow">Risco em primeiro lugar</div><h3>Gestão da Posição</h3></div><span class="badge ${metric.risk > 0 ? 'warn' : 'good'}">Ongoing Risk ${money(state.ongoingRisk)}</span></header>
      <div class="pm-grid">${stats.map(([label, value, className]) => `<div class="pm-stat ${className}"><small>${safe(label)}</small><strong>${safe(value)}</strong></div>`).join('')}</div>
      <div class="pm-states"><div class="pm-state pm-sell-state ${state.sellAvailable ? 'active pm-sell-available' : state.sellCount ? 'pm-sell-completed' : ''}"><b>🟢 SELL INTO STRENGTH ${sellTitle}</b>
        <small>Zona ${multiple(state.sell.startR)} – ${multiple(state.sell.endR)} · sugestão ${units(state.sell.suggestedPercent)}%</small>
        <p>${sellMessage}</p>${action}</div>
      <div class="pm-state ${state.freeRoll ? 'active pm-free-roll-active' : ''}"><b>🛡️ FREE ROLL ${state.freeRoll ? 'ATIVO' : 'AINDA NÃO ATINGIDO'}</b><small>Cobertura ${coverage(state.coverage)}</small><p>Lucro realizado ${money(state.realizedProfit)} / risco remanescente ${money(state.ongoingRisk)}.<br><span class="pm-stop-recalculated">Recalculado após cada alteração do stop.</span></p></div>
      <div class="pm-state ${state.runner ? 'active' : ''}"><b>🏇 RUNNER ${state.runner ? 'LET IT RUN' : 'EM ESPERA'}</b><small>Original ${units(state.originalQuantity || p.initialQty)} · realizado ${units(state.realizedQuantity)} · runner ${units(state.remaining)}</small><p>O Runner permanece sob trailing stop, ATR, Ongoing Risk e Portfolio Heat. Sem alvo de saída automática.</p></div></div><dialog class="pm-dialog" id="pm-dialog"></dialog>`;
    const kpis = host.querySelector('.grid.kpis');
    if (kpis) kpis.after(card); else host.prepend(card);
    const timeline = host.querySelector('.timeline');
    host.querySelectorAll('.operations-actions button').forEach(button => { if (button.textContent.includes('Fiz uma parcial')) button.textContent = 'Registrar Peel-Off'; });
    if (timeline) {
      const timelineEvents = [...timeline.querySelectorAll('.event')].slice(0, p.events.length);
      p.events.forEach((event, index) => {
        const label = timelineEvents[index]?.querySelector('strong');
        if (!label || event.type !== 'peeloff') return;
        label.textContent = model.isSellIntoStrength(event) ? 'Sell Into Strength / parcial' : 'Peel-Off';
      });
      p.events.forEach(event => {
        const c = event.context || {};
        const messages = [
          ...(c.milestones || []).map(label => `${label} atingido`),
          ...(c.freeRollActivated ? [`Free Roll ativado · cobertura ${coverage(c.freeRollCoverage)}`] : []),
          ...(c.source === 'update' && c.freeRollActive ? [`Trailing stop atualizado · cobertura ${coverage(c.freeRollCoverage)}`] : []),
          ...(c.runnerProfit != null ? [`Runner encerrado · resultado ${money(c.runnerProfit)}`] : [])
        ];
        messages.forEach(message => timeline.insertAdjacentHTML('beforeend', `<div class="event"><span class="line-dot"></span><small>${safe(fmtDate(event.at))}</small><div><strong>${safe(message)}</strong></div></div>`));
      });
    }
  };

  const previousRiskRender = renderEffectiveRiskPolicy;
  renderEffectiveRiskPolicy = function () {
    previousRiskRender();
    const shell = document.getElementById('effectiveRiskPolicy');
    if (!shell || shell.querySelector('.pm-policy')) return;
    const saved = config();
    const sellBlock = document.createElement('section');
    sellBlock.className = 'risk-policy-block pm-policy pm-sell-policy';
    sellBlock.innerHTML = `<div class="risk-block-title"><span>5</span><div><h4>Sell Into Strength</h4><p>Identifica uma oportunidade de parcial; jamais executa venda automática ou define alvo para o Runner.</p></div></div>
      <div class="pm-form-grid"><label>Sell Into Strength<select data-pm-setting="enabled"><option value="on" ${saved.enabled ? 'selected' : ''}>ON</option><option value="off" ${!saved.enabled ? 'selected' : ''}>OFF</option></select></label>
      <label>Zona inicial (R)<input type="number" step=".1" min="0" data-pm-setting="startR" value="${saved.startR}"></label>
      <label>Zona final (R)<input type="number" step=".1" min="0" data-pm-setting="endR" value="${saved.endR}"></label>
      <label>Realização sugerida (%)<input type="number" step="1" min="1" max="100" data-pm-setting="suggestedPercent" value="${saved.suggestedPercent}"></label></div><button type="button" class="secondary pm-manual-link" data-pm-manual="sell-into-strength">Sugestões de uso do Sell Into Strength →</button>`;
    const policyLayout = document.createElement('div');
    policyLayout.className = 'pm-policy-layout';
    policyLayout.append(sellBlock);
    shell.append(policyLayout);
  };
  document.addEventListener('change', async event => {
    if (!event.target.matches('[data-pm-setting]')) return;
    const inputs = document.querySelectorAll('#effectiveRiskPolicy [data-pm-setting]');
    const value = Object.fromEntries([...inputs].map(input => [input.dataset.pmSetting, input.value]));
    if (+value.endR < +value.startR) { showToast('A zona final deve ser maior ou igual à inicial.'); return; }
    if (+value.suggestedPercent <= 0 || +value.suggestedPercent > 100) { showToast('Escolha um percentual entre 1% e 100%.'); return; }
    riskPolicyState.sellIntoStrength = model.settings({ enabled: value.enabled === 'on', startR: value.startR, endR: value.endR, suggestedPercent: value.suggestedPercent });
    await persistRiskPolicy();
    renderEffectiveRiskPolicy();
    window.renderPortfolioHeat?.();
    window.renderOperationalApp?.();
    window.updateTradingRubric?.();
    const active = operationalState.positions.find(position => document.getElementById('positionDetail')?.querySelector(`[data-pm-partial="${position.id}"]`));
    if (active) openPosition(active.id);
  });

  function renderPreview(dialog, position) {
    const form = dialog.querySelector('form'), metric = operationMetrics(position);
    const partial = model.preview(position, metric, form.elements.percent.value, form.elements.price.value, form.elements.quantity.value);
    const output = form.querySelector('.pm-preview');
    if (!partial) { output.textContent = 'Informe um preço válido e uma quantidade inteira entre 1 e o saldo menos uma unidade.'; form.querySelector('[type=submit]').disabled = true; return; }
    output.innerHTML = `Posição atual: <b>${units(metric.remaining)} unidades</b><br>Realização: <b>${units(partial.quantity)} unidades (${numBR(partial.percent, 1)}%)</b><br>Preço: <b>${money(partial.price)}</b><br>Resultado da parcial: <b>${multiple(partial.rAtExit)} · ${money(partial.realizedProfit)}</b><br>Posição remanescente: <b>${units(partial.remainingAfter)} unidades</b><br>Ongoing Risk estimado: <b>${money(partial.ongoingRiskAfter)}</b>`;
    form.querySelector('[type=submit]').disabled = false;
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-pm-partial]');
    if (!button) return;
    const position = locate(button.dataset.pmPartial), dialog = document.getElementById('pm-dialog');
    if (!position || !dialog) return;
    const metric = operationMetrics(position), suggested = config().suggestedPercent, qty = Math.min(metric.remaining - 1, Math.max(1, Math.floor(metric.remaining * suggested / 100)));
    const usablePercent = Math.min(suggested, qty / metric.remaining * 100);
    const now = new Date(), local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    dialog.innerHTML = `<h3>Sell Into Strength · realizar parcial</h3><form data-pm-trade="${safe(position.id)}">
      <div class="pm-form-grid"><label>Quantidade atual<input readonly value="${metric.remaining}"></label>
      <label>Percentual da parcial<input name="percent" type="number" min="1" max="100" step="any" value="${usablePercent}" required></label>
      <label>Quantidade a vender<input name="quantity" type="number" min="1" max="${metric.remaining - 1}" step="1" value="${qty}" required></label>
      <label>Preço da realização<input name="price" type="number" min=".000001" step="any" value="${position.currentPrice}" required></label>
      <label>Data/hora<input name="occurredAt" type="datetime-local" value="${local}" required></label></div>
      <div class="pm-preview" aria-live="polite"></div><div class="pm-form-actions"><button type="submit" class="primary">CONFIRMAR PARCIAL</button><button type="button" class="secondary" data-pm-cancel>CANCELAR</button></div></form>`;
    dialog.showModal(); renderPreview(dialog, position);
  });
  document.addEventListener('click', event => { if (event.target.closest('[data-pm-cancel]')) document.getElementById('pm-dialog')?.close(); });
  document.addEventListener('click', event => { if (event.target.closest('[data-pm-manual="sell-into-strength"]')) window.openSellIntoStrengthManual?.(); });
  document.addEventListener('input', event => {
    const form = event.target.closest('form[data-pm-trade]');
    if (!form) return;
    if (event.target.name === 'percent') form.elements.quantity.value = Math.floor(operationMetrics(locate(form.dataset.pmTrade)).remaining * Number(event.target.value) / 100);
    if (event.target.name === 'quantity') form.elements.percent.value = (100 * Number(event.target.value) / operationMetrics(locate(form.dataset.pmTrade)).remaining).toFixed(1);
    renderPreview(form.closest('dialog'), locate(form.dataset.pmTrade));
  });
  document.addEventListener('submit', async event => {
    const form = event.target.closest('form[data-pm-trade]');
    if (!form) return;
    event.preventDefault();
    const p = locate(form.dataset.pmTrade), metric = p && operationMetrics(p), preview = p && model.preview(p, metric, form.elements.percent.value, form.elements.price.value, form.elements.quantity.value);
    if (!preview || !config().enabled || model.currentR(p) < config().startR) { showToast('A parcial precisa respeitar a quantidade disponível e a zona configurada.'); return; }
    if (!window.healthyTrendApi?.isAuthenticated()) { showToast('Entre no workspace para salvar a parcial.'); return; }
    const submit = form.querySelector('[type=submit]'); submit.disabled = true;
    try {
      await window.healthyTrendApi.request(`/api/trades/${p.id}/events`, { method: 'POST', body: JSON.stringify({ type: 'peeloff', source: 'sell_into_strength', qty: preview.quantity, price: preview.price,
        occurredAt: new Date(form.elements.occurredAt.value).toISOString(), note: `Sell Into Strength · parcial de ${numBR(preview.percent, 1)}% registrada manualmente.` }) });
      form.closest('dialog').close(); await syncOperationalFromDatabase(); openPosition(p.id); showToast('Parcial registrada. O Runner permanece sob as regras normais de gestão.');
    } catch (error) { showToast(error.message || 'Não foi possível registrar a parcial.'); submit.disabled = false; }
  });
  renderEffectiveRiskPolicy();
}());

/* File previews have an opaque origin; the receiver still verifies the exact frame. */
const plansTargetOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
document.querySelectorAll('.hotspot').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    const action = link.dataset.action || (link.classList.contains('pro-btn') ? 'choose-professional'
      : link.classList.contains('basic-btn') ? 'choose-basic'
      : link.getAttribute('href').slice(1));
    window.parent.postMessage({ type: 'healthy-plans-reference', action }, plansTargetOrigin);
  });
});

window.addEventListener('message', event => {
  if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== 'healthy-plans-state') return;
  const { plan, trialActive } = event.data;
  document.querySelector('.basic-btn').setAttribute('aria-label', plan === 'basic' ? 'Basic — seu plano atual. Ver detalhes.' : 'Escolher Basic — R$ 29 por mês');
  document.querySelector('.pro-btn').setAttribute('aria-label', plan === 'professional' ? 'Professional — seu plano atual. Ver detalhes.' : trialActive ? 'Professional — teste grátis ativo. Selecionar plano de R$ 69 por mês.' : 'Desbloquear Professional — R$ 69 por mês');
});
window.parent.postMessage({ type: 'healthy-plans-reference', action: 'ready' }, plansTargetOrigin);

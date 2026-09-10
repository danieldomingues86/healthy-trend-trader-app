/* Presentation only: existing controls, handlers and persistence remain authoritative. */
(() => {
  const page = document.getElementById('settings');
  if (!page) return;
  const t = (pt, en) => window.appLanguage === 'en-US' ? en : pt;
  const paths = {
    menu: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h7M7 16h3"/>',
    theme: '<path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h3a5 5 0 0 0 0-10z"/><path d="M7 8h.01M6 13h.01M11 6h.01M16 6h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
    shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 11l3 3 5-6"/>',
    leaf: '<path d="M5 21C3 7 12 4 21 3c0 12-6 17-13 14M5 21 17 7"/>',
  };
  const icon = name => `<svg class="settings-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
  const wa = () => document.querySelector('#whatsAppSupport svg')?.outerHTML || icon('globe');
  function heading(card, name) {
    const head = card?.querySelector('.card-head');
    if (head && !head.querySelector('.settings-icon')) head.insertAdjacentHTML('afterbegin', icon(name));
  }
  function decorate() {
    const hero = page.querySelector('.hero');
    hero.className = 'hero settings-hero';
    hero.innerHTML = `<div><div class="eyebrow">${t('CONFIGURAÇÕES GERAIS','GENERAL SETTINGS')}</div><h1>${t('Seu ambiente.<br>Suas regras.','Your environment.<br>Your rules.')}</h1><p>${t('Configure a plataforma para que ela trabalhe a favor da sua rotina<br>e não contra ela.','Configure the platform to work with your routine,<br>not against it.')}</p></div><aside>${t('Pequenos ajustes,<br>grandes resultados.','Small adjustments,<br>great results.')}</aside>`;
    const menu = page.querySelector('#navigationLayoutSettings');
    heading(menu, 'menu');
    menu?.querySelectorAll('.navigation-layout-option').forEach((button, i) => {
      button.setAttribute('aria-pressed', String(button.classList.contains('active')));
      if (!button.querySelector('.settings-menu-preview')) {
        button.querySelector('i')?.remove();
        button.insertAdjacentHTML('afterbegin', `<div class="settings-menu-preview preview-${i}" aria-hidden="true"><div class="mini-nav">${'<em></em>'.repeat(6)}</div><div class="mini-content">${'<em></em>'.repeat(6)}</div></div>`);
      }
    });
    heading(page.querySelector('.theme-settings-card'), 'theme');
    page.querySelectorAll('[data-theme-choice]').forEach(button => {
      const green = button.dataset.themeChoice === 'healthy';
      button.innerHTML = `<img src="assets/manual-knowledge/${green ? 'forest-landscape.png' : 'hero.png'}" alt=""><span class="settings-theme-copy"><b>${green ? 'Healthy Green' : 'Premium Gold'}</b><small>${green ? t('Clareza, equilíbrio<br>e processo.','Clarity, balance<br>and process.') : t('Sofisticação, foco<br>e performance.','Sophistication, focus<br>and performance.')}</small><span class="settings-swatches"><i></i><i></i><i></i></span></span>`;
    });
    heading(page.querySelector('.language-settings-card'), 'globe');
    page.querySelectorAll('[data-language-choice]').forEach(button => {
      const pt = button.dataset.languageChoice === 'pt-BR';
      button.innerHTML = `<svg class="settings-flag" aria-hidden="true" viewBox="0 0 30 30"><defs><clipPath id="settings-flag-${pt?'br':'us'}"><circle cx="15" cy="15" r="14"/></clipPath></defs><g clip-path="url(#settings-flag-${pt?'br':'us'})">${pt ? '<path fill="#16864b" d="M0 0h30v30H0z"/><path fill="#f3d34d" d="m15 5 13 10-13 10L2 15z"/><circle cx="15" cy="15" r="6" fill="#17436e"/><path d="m9 13 12 4" stroke="white" stroke-width="2"/>' : '<path fill="#fff" d="M0 0h30v30H0z"/><path stroke="#bc3349" stroke-width="2.3" d="M0 2h30M0 7h30M0 12h30M0 17h30M0 22h30M0 27h30"/><path fill="#20456f" d="M0 0h15v16H0z"/><path stroke="white" stroke-dasharray="1 3" d="M2 4h12M2 8h12M2 12h12"/>'}</g></svg><b>${pt ? 'Português (BR)' : 'English (US)'}</b>`;
      const active = button.dataset.languageChoice === (window.appLanguage || 'pt-BR');
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const language = page.querySelector('.language-settings-card');
    language.querySelector('.settings-quote')?.remove();
    language.insertAdjacentHTML('beforeend', `<blockquote class="settings-quote">${t('O conhecimento certo,<br>no seu idioma, leva a melhores decisões.','The right knowledge,<br>in your language, leads to better decisions.')}</blockquote>`);
    const support = page.querySelector('#whatsAppSupportSettings');
    if (support) {
      heading(support, 'globe');
      const headIcon = support.querySelector('.card-head > svg');
      if (headIcon) { headIcon.outerHTML = wa().replace('<svg ', '<svg class="settings-icon" '); }
      const row = support.querySelector('.setting-row');
      if (!row.querySelector('.settings-wa-icon')) row.insertAdjacentHTML('afterbegin', `<span class="settings-wa-icon" aria-hidden="true">${wa()}</span>`);
      const badge = support.querySelector('.card-head .badge');
      if (badge) row.insertBefore(badge, row.querySelector('input'));
      support.querySelector('.settings-support-link')?.remove();
      const link = document.createElement('a');
      link.className = 'settings-support-link';
      link.href = document.getElementById('whatsAppSupport').href;
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.innerHTML = `${wa()}<span>${t('Dúvidas, sugestões ou problemas?','Questions, suggestions or problems?')}<small>${t('Fale conosco pelo WhatsApp. Resposta mais rápida e direta.','Contact us on WhatsApp. A faster, direct response.')}</small></span><b>›</b>`;
      support.append(link);
    }
    const focus = page.querySelector('#marketFocusSettings');
    heading(focus, 'shield');
    if (focus && !focus.querySelector('.settings-focus-note')) focus.querySelector('.form-grid').insertAdjacentHTML('beforeend', `<div class="settings-focus-note">${icon('leaf')}<div><b>${t('Foco no que importa.','Focus on what matters.')}</b><small>${t('O mercado sempre estará lá.','The market will still be there.')}</small></div></div>`);
    let footer = page.querySelector('.settings-footer');
    if (!footer) { footer = document.createElement('footer'); footer.className = 'settings-footer'; page.append(footer); }
    footer.textContent = t('Healthy Trend Trader · Um trader melhor, uma vida melhor.','Healthy Trend Trader · A better trader, a better life.');
  }
  // The existing renderers replace their cards after a setting changes.
  // Decorate the new nodes without replacing inputs or their event listeners.
  ['setupNavigationLayoutSettings','setupWhatsAppSupportSettings','setupMarketFocusSettings','applyLanguage'].forEach(name => {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function (...args) {
      const result = original.apply(this, args);
      if (name === 'applyLanguage') requestAnimationFrame(decorate);
      else decorate();
      return result;
    };
  });
  decorate();
})();

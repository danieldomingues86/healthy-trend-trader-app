(function () {
  const api = window.MARKET_DATA_API_URL || 'http://localhost:8787/api';
  let market = { cycle: null, ranking: null, scans: null, error: null };
  let loading = false;
  let loadedAt = 0;
  const dashboardStorageKey = 'healthy-home-widget-dashboard-v4';
  const dashboardLayoutVersion = 6;
  const widgetRegistry = window.HomeWidgetRegistry;
  const defaultWidgetLayout = window.DesktopLayout.normalize([], widgetRegistry.all());
  let layoutEngine = null;
  let pendingRender = false;
  let dashboardEditing = false;
  let galleryOpen = false;
  let galleryCategory = 'Todos';
  let widgetLayout = null;

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const pct = (value) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  const freshness = () => window.TodayCockpitModel.marketDataState({ source: market.cycle?.source || market.scans?.source, updatedAt: market.cycle?.updatedAt || market.scans?.updatedAt });
  const realPositions = () => (operationalState?.positions || []).filter((position) => position.mode === 'real' && !operationMetrics(position).closed);
  const heatLimit = () => typeof window.portfolioHeatLimitPct === 'function' ? window.portfolioHeatLimitPct() : 3;
  const heat = () => realPositions().reduce((total, position) => total + operationMetrics(position).riskPct, 0);
  const healthy = () => Boolean(market.cycle?.cycle && Number(market.cycle.cycle.price) > Number(market.cycle.cycle.ema20) && Number(market.cycle.cycle.price) > Number(market.cycle.cycle.ema200));
  const updateText = (value) => value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'sem atualização disponível';
  const firstName = () => String(profileState?.name || 'Trader').trim().split(/\s+/)[0] || 'Trader';

  function renderCurrentDate() {
    // The header deliberately no longer exposes a current-date pill.
    document.getElementById('currentDatePill')?.remove();
  }

  function preparedPositions() {
    return realPositions().map((position) => ({ id: position.id, asset: position.asset, mode: position.mode, riskPct: operationMetrics(position).riskPct }));
  }

  function actionMarkup(action) {
    return `<section class="today-next-action"><div><small>SUA PRÓXIMA AÇÃO</small><h2>${esc(action.title)}</h2><p>${esc(action.detail)}</p></div><button type="button" data-next-action>${esc(action.action)} →</button></section>`;
  }

  function runAction(action) {
    if (action.page === 'position' && action.positionId) return openPosition(action.positionId);
    go(action.page);
  }

  function getWidgetLayout() {
    if (widgetLayout) return widgetLayout.map((item) => ({ ...item })).sort((left, right) => left.order - right.order);
    let source = [];
    try {
      const stored = JSON.parse(localStorage.getItem(dashboardStorageKey));
      // Existing selections/order survive the height-enabled layout migration.
      if ([4, 5, 6].includes(stored?.layoutVersion) && Array.isArray(stored.items)) source = stored.items;
    } catch (_) { /* Malformed storage falls back to the registry defaults. */ }
    widgetLayout = window.DesktopLayout.normalize(source, widgetRegistry.all());
    saveWidgetLayout(widgetLayout);
    return widgetLayout.map((item) => ({ ...item }));
  }

  function saveWidgetLayout(layout) {
    widgetLayout = window.DesktopLayout.normalize(layout, widgetRegistry.all());
    try { localStorage.setItem(dashboardStorageKey, JSON.stringify({ layoutVersion: dashboardLayoutVersion, items: widgetLayout })); } catch (_) { /* Storage can be unavailable in private contexts. */ }
  }

  function updateWidgetLayout(change) {
    const layout = getWidgetLayout();
    const next = change(layout)
      .sort((left, right) => left.order - right.order)
      .map((item, index) => ({ ...item, order: index }));
    saveWidgetLayout(next);
    render();
  }

  function widgetShell(item, widget, content) {
    const details = widget.route ? `<button class="dashboard-widget-details" type="button" data-widget-page="${esc(widget.route)}">Ver detalhes <span>→</span></button>` : '';
    const editControls = dashboardEditing ? `<div class="dashboard-widget-edit-controls" aria-label="Editar ${esc(widget.name)}"><span class="dashboard-widget-drag-handle" title="Arraste pelo cabeçalho para reorganizar">⠿</span><button type="button" class="danger" data-widget-remove="${item.id}" aria-label="Remover ${esc(widget.name)}">×</button></div>` : '';
    const resizeHandles = dashboardEditing ? `<span class="dashboard-widget-resize-handle dashboard-widget-resize-handle--horizontal" aria-label="Ajustar largura de ${esc(widget.name)}"></span><span class="dashboard-widget-resize-handle dashboard-widget-resize-handle--vertical" aria-label="Ajustar altura de ${esc(widget.name)}"></span><span class="dashboard-widget-resize-handle dashboard-widget-resize-handle--corner" aria-label="Ajustar largura e altura de ${esc(widget.name)}"></span>` : '';
    const artwork = desktopArtwork(item.id);
    return `<article class="dashboard-widget" data-widget-id="${item.id}" data-columns="${item.columns}" data-custom-height="${item.customHeight === true}"${item.customHeight ? ` data-rows="${item.rows}"` : ''}><div class="desktop-widget-art" aria-hidden="true">${artwork}</div><div class="desktop-widget-body"><header class="dashboard-widget-header"><div><span class="dashboard-widget-kicker">${esc(widget.category)}</span><h2>${esc(widget.name)}</h2></div>${editControls}</header><div class="dashboard-widget-content">${content}</div>${details}</div>${resizeHandles}</article>`;

  }

  function desktopArtwork(id) {
    const scenes = {
      portfolio: `<svg class="desktop-scene" viewBox="0 0 440 190" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="desktop-portfolio-area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".42"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient><radialGradient id="desktop-portfolio-glow"><stop stop-color="#f0ce68" stop-opacity=".2"/><stop offset="1" stop-color="#f0ce68" stop-opacity="0"/></radialGradient></defs><path class="scene-grid" d="M14 34H426M14 74H426M14 114H426M14 154H426M70 16V176M140 16V176M210 16V176M280 16V176M350 16V176"/><path class="scene-area" fill="url(#desktop-portfolio-area)" d="M18 155L62 143 91 150 127 119 158 128 199 87 231 101 269 63 303 74 346 39 377 48 418 17V176H18Z"/><path class="scene-line" d="M18 155L62 143 91 150 127 119 158 128 199 87 231 101 269 63 303 74 346 39 377 48 418 17"/><path class="scene-line scene-highlight" d="M397 19h22v22"/><circle cx="354" cy="104" r="64" fill="url(#desktop-portfolio-glow)"/><path class="scene-warm shield" d="M354 54l34 13v27c0 28-13 45-34 57-21-12-34-29-34-57V67Z"/><path class="scene-warm shield-check" d="M338 101l11 11 22-26"/></svg>`,
      opportunities: `<svg class="desktop-scene" viewBox="0 0 440 190" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="desktop-opportunities-area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".34"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="scene-grid" d="M12 38H428M12 78H428M12 118H428M12 158H428M82 14V178M162 14V178M242 14V178M322 14V178"/><g class="scene-candles"><path d="M126 137V84m-10 17h20v25h-20zm42 26V62m-10 13h20v34h-20zm42 1V44m-10 17h20v31h-20zm42 11V28m-10 20h20v31h-20zm42-13V19m-10 17h20v25h-20zm42 28V11m-10 11h20v35h-20z"/></g><path class="scene-area" fill="url(#desktop-opportunities-area)" d="M18 159l54-12 39-31 47 11 48-49 41 15 58-58 58 9 49-29v161H18Z"/><path class="scene-line" d="M18 159l54-12 39-31 47 11 48-49 41 15 58-58 58 9 49-29"/><g class="scene-scan"><circle cx="86" cy="88" r="35"/><circle cx="86" cy="88" r="19"/><path d="M86 43v17m0 56v17M41 88h17m56 0h17"/></g></svg>`,
      'market-cycle': `<svg class="desktop-scene" viewBox="0 0 440 190" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="desktop-cycle-globe" cx="42%" cy="38%"><stop stop-color="#8af5c3" stop-opacity=".8"/><stop offset=".32" stop-color="currentColor" stop-opacity=".52"/><stop offset=".72" stop-color="#063f32" stop-opacity=".56"/><stop offset="1" stop-color="#021b16" stop-opacity="0"/></radialGradient><linearGradient id="desktop-cycle-haze"><stop stop-color="currentColor" stop-opacity="0"/><stop offset=".5" stop-color="currentColor" stop-opacity=".25"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="scene-grid" d="M8 45H432M8 95H432M8 145H432M75 10V180M150 10V180M225 10V180M300 10V180M375 10V180"/><ellipse cx="296" cy="103" rx="129" ry="82" fill="url(#desktop-cycle-haze)"/><circle class="globe-base" cx="304" cy="96" r="72" fill="url(#desktop-cycle-globe)"/><g class="globe-lines"><ellipse cx="304" cy="96" rx="72" ry="29"/><ellipse cx="304" cy="96" rx="33" ry="72"/><path d="M232 96h144M246 56c35 17 81 17 116 0m-116 80c35-17 81-17 116 0"/></g><path class="scene-solid" d="M258 60l24-15 21 8 7 18-16 8-8 25-20-5-12-21zm65 48 17-16 22 7-4 29-18 14-19-14z"/><path class="scene-line" d="M22 143l53-7 36-18 43 8 46-41 42 7"/><path class="scene-orbit" d="M213 126c-26-68 55-126 137-94 80 31 77 123 2 151"/></svg>`,
      'relative-strength': `<svg class="desktop-scene" viewBox="0 0 440 190" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="desktop-rs-area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".44"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="scene-grid" d="M12 38H428M12 78H428M12 118H428M12 158H428M68 14V178M138 14V178M208 14V178M278 14V178M348 14V178"/><path class="scene-area" fill="url(#desktop-rs-area)" d="M16 158l39-9 32-22 36 8 34-45 37 21 44-53 38 13 49-48 35 14 60-25v164H16Z"/><path class="scene-line" d="M16 158l39-9 32-22 36 8 34-45 37 21 44-53 38 13 49-48 35 14 60-25"/><path class="scene-highlight scene-arrow" d="M390 12h31v31"/><g class="scene-candles"><path d="M205 134V86m-9 13h18v24h-18zm38 5V66m-9 13h18v27h-18zm38-15V48m-9 12h18v31h-18zm38-7V30m-9 13h18v32h-18z"/></g></svg>`,
      'next-action': `<svg class="desktop-scene" viewBox="0 0 440 190" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="desktop-action-paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="currentColor" stop-opacity=".28"/><stop offset="1" stop-color="#031d15" stop-opacity=".16"/></linearGradient></defs><path class="scene-grid" d="M15 45H425M15 95H425M15 145H425M95 12V178M175 12V178M255 12V178M335 12V178"/><g class="clipboard"><path fill="url(#desktop-action-paper)" d="M248 25h132a14 14 0 0 1 14 14v135H234V39a14 14 0 0 1 14-14z"/><path class="scene-line" d="M248 25h132a14 14 0 0 1 14 14v135H234V39a14 14 0 0 1 14-14z"/><path class="scene-solid" d="M286 17h55a9 9 0 0 1 9 9v13h-73V26a9 9 0 0 1 9-9z"/><path class="scene-highlight" d="M259 70l10 10 17-22m-27 57 10 10 17-22m18-31h57m-57 45h57"/></g><path class="scene-line" d="M31 143l41-19 34 8 42-43 31 11 35-36"/></svg>`,
      wealth: `<svg class="desktop-scene" viewBox="0 0 440 190" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="desktop-wealth-bars" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#89e884" stop-opacity=".8"/><stop offset="1" stop-color="currentColor" stop-opacity=".08"/></linearGradient><linearGradient id="desktop-wealth-area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".38"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="scene-grid" d="M12 40H428M12 82H428M12 124H428M12 166H428M78 12V178M148 12V178M218 12V178M288 12V178M358 12V178"/><g fill="url(#desktop-wealth-bars)"><rect x="204" y="132" width="25" height="39" rx="3"/><rect x="240" y="111" width="25" height="60" rx="3"/><rect x="276" y="84" width="25" height="87" rx="3"/><rect x="312" y="54" width="25" height="117" rx="3"/><rect x="348" y="27" width="25" height="144" rx="3"/></g><path class="scene-area" fill="url(#desktop-wealth-area)" d="M16 156l43-8 31-31 36 9 37-43 35 9 42-48 39 8 51-36v160H16Z"/><path class="scene-line" d="M16 156l43-8 31-31 36 9 37-43 35 9 42-48 39 8 51-36"/><g class="coins"><ellipse cx="108" cy="145" rx="52" ry="16"/><path d="M56 119v26c0 21 104 21 104 0v-26"/><ellipse cx="108" cy="119" rx="52" ry="16"/><path d="M68 92v26c0 17 80 17 80 0V92"/><ellipse cx="108" cy="92" rx="40" ry="13"/></g></svg>`,
      'courage-challenge': `<svg class="desktop-scene" viewBox="0 0 440 190" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="desktop-challenge-near" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#3ebc72" stop-opacity=".82"/><stop offset="1" stop-color="#062719" stop-opacity=".9"/></linearGradient><linearGradient id="desktop-challenge-far" x1="0" y1="0" x2="0" y2="1"><stop stop-color="currentColor" stop-opacity=".32"/><stop offset="1" stop-color="currentColor" stop-opacity=".02"/></linearGradient><radialGradient id="desktop-challenge-sun"><stop stop-color="#f2d76d" stop-opacity=".5"/><stop offset="1" stop-color="#f2d76d" stop-opacity="0"/></radialGradient></defs><circle cx="356" cy="46" r="75" fill="url(#desktop-challenge-sun)"/><path fill="url(#desktop-challenge-far)" d="M8 171l94-93 47 47 58-81 54 67 42-50 129 110z"/><path fill="url(#desktop-challenge-near)" d="M112 176l112-121 43 48 40-57 125 130z"/><path class="mountain-snow" d="M224 55l27 30 16-12 12 18 28-45 20 25 13-9"/><path class="scene-warm trail" d="M180 174c-3-22 31-24 41-45 9-20 4-38 26-47 22-10 46-11 60-36"/><path class="scene-warm flag" d="M307 48V13m0 2 49 12-49 13"/><g class="scene-stars"><circle cx="371" cy="25" r="2"/><circle cx="393" cy="57" r="1.5"/><circle cx="343" cy="70" r="1.8"/></g></svg>`
    };
    return scenes[id] || galleryArtwork(id).replaceAll('gallery-', 'desktop-');
  }

  function galleryMarkup(layout) {
    if (!galleryOpen) return '';
    const active = new Set(layout.filter((item) => item.active).map((item) => item.id));
    const allWidgets = widgetRegistry.all();
    const categories = ['Todos', ...new Set(allWidgets.map((widget) => widget.category))];
    const visibleWidgets = galleryCategory === 'Todos' ? allWidgets : allWidgets.filter((widget) => widget.category === galleryCategory);
    const filterIcons = { Todos: '▦', Trading: '◉', Mercado: '◫', Performance: '◈', 'Disciplina & Rotina': '✧', 'Organização Pessoal': '◇' };
    const filters = categories.map((category) => `<button type="button" class="widget-gallery-filter ${galleryCategory === category ? 'active' : ''}" data-gallery-category="${esc(category)}" aria-pressed="${galleryCategory === category}"><span aria-hidden="true">${filterIcons[category] || '◇'}</span>${esc(category)}</button>`).join('');
    const cards = visibleWidgets.map((widget) => {
      const added = active.has(widget.id);
      return `<article class="widget-gallery-card" data-widget-id="${esc(widget.id)}"><div class="widget-gallery-art" aria-hidden="true">${galleryArtwork(widget.id)}</div><div class="widget-gallery-card-copy"><span class="widget-gallery-icon" aria-hidden="true">${esc(widget.icon)}</span><div><span class="widget-gallery-category">${esc(widget.category)}</span><h3>${esc(widget.name)}</h3><p>${esc(widget.description)}</p></div></div><div class="widget-gallery-card-footer">${added ? '<span class="widget-gallery-state active">✓ Adicionado</span><span class="widget-gallery-in-panel">Já está no painel</span>' : `<button type="button" class="widget-gallery-add" data-widget-add="${esc(widget.id)}">+ Adicionar widget</button>`}</div></article>`;
    }).join('');
    const comingSoon = galleryCategory === 'Todos' ? '<article class="widget-gallery-card widget-gallery-coming-soon"><svg class="widget-gallery-puzzle" viewBox="0 0 64 64" aria-hidden="true"><path d="M8 8h18c-2 7 1 10 6 10s8-3 6-10h18v18c-7-2-10 1-10 6s3 8 10 6v18H38c2-7-1-10-6-10s-8 3-6 10H8V38c7 2 10-1 10-6s-3-8-10-6z"/></svg><div><h3>Mais widgets em breve</h3><p>Novos widgets estão a caminho para tornar seu desktop ainda mais completo.</p></div></article>' : '';
    return `<div class="widget-gallery-backdrop" data-gallery-close><section class="widget-gallery" role="dialog" aria-modal="true" aria-label="Galeria de widgets" data-gallery-panel><header><div><span class="eyebrow">MONTE SEU TRADING DESKTOP</span><h2>Widget Gallery</h2><p>Escolha as informações que você quer ter à vista antes de entrar nas telas completas.</p></div><aside class="widget-gallery-intro"><b>Seu desktop, do seu jeito.</b><span>Adicione os widgets que fazem sentido para o seu momento.</span></aside><button type="button" class="widget-gallery-close" data-gallery-close aria-label="Fechar galeria">×</button></header><nav class="widget-gallery-filters" aria-label="Categorias de widgets">${filters}</nav><div class="widget-gallery-grid">${cards}${comingSoon}</div></section></div>`;
  }

  function galleryArtwork(id) {
    const art = {
      portfolio: '<svg viewBox="0 0 180 110"><defs><linearGradient id="gallery-portfolio" x2="0" y2="1"><stop stop-color="#37ef8a" stop-opacity=".74"/><stop offset="1" stop-color="#0b5a36" stop-opacity=".1"/></linearGradient></defs><path d="M5 98H177" stroke-opacity=".35"/><rect x="28" y="73" width="13" height="25" fill="url(#gallery-portfolio)"/><rect x="50" y="62" width="13" height="36" fill="url(#gallery-portfolio)"/><rect x="72" y="69" width="13" height="29" fill="url(#gallery-portfolio)"/><rect x="94" y="47" width="13" height="51" fill="url(#gallery-portfolio)"/><rect x="116" y="31" width="13" height="67" fill="url(#gallery-portfolio)"/><rect x="138" y="18" width="13" height="80" fill="url(#gallery-portfolio)"/><path d="M17 74c25-5 33-25 54-20 18 5 26-7 42-23 11-11 29-14 52-25" fill="none" stroke="#59f29b" stroke-width="2.7"/><path d="M151 7h15v15" fill="none" stroke="#59f29b" stroke-width="2.7"/></svg>',
      opportunities: '<svg viewBox="0 0 180 110"><defs><linearGradient id="gallery-opportunities" x2="0" y2="1"><stop stop-color="#2ed77d" stop-opacity=".48"/><stop offset="1" stop-color="#0a492c" stop-opacity=".02"/></linearGradient></defs><path d="M7 103V78h19v25m8 0V67h19v36m8 0V54h19v49m8 0V44h19v59m8 0V29h19v74" fill="url(#gallery-opportunities)" stroke-opacity=".3"/><path d="M12 86l31-17 28 2 27-29 29 7 35-39" fill="none" stroke="#42ed92" stroke-width="6" stroke-linejoin="round"/><path d="M142 9l22-5-4 22" fill="#43ee92" stroke="#43ee92"/></svg>',
      'next-action': '<svg viewBox="0 0 180 110"><defs><linearGradient id="gallery-next" x2="1" y2="1"><stop stop-color="#154c38"/><stop offset="1" stop-color="#071e19"/></linearGradient></defs><rect x="46" y="12" width="98" height="93" rx="10" fill="url(#gallery-next)" stroke="#48c77e"/><path d="M81 11h29a5 5 0 0 1 5 5v4H76v-4a5 5 0 0 1 5-5z" fill="#157d4c"/><path d="M72 42l6 6 10-13m-16 27 6 6 10-13m-16 27 6 6 10-13" fill="none" stroke="#59eda0" stroke-width="3"/><path d="M98 41h29M98 61h24M98 81h29" fill="none" stroke="#4de796" stroke-width="3" stroke-opacity=".72"/></svg>',
      'relative-strength': '<svg viewBox="0 0 180 110"><defs><linearGradient id="gallery-rs" x2="0" y2="1"><stop stop-color="#3ee991" stop-opacity=".65"/><stop offset="1" stop-color="#0c5635" stop-opacity=".04"/></linearGradient></defs><rect x="23" y="80" width="14" height="21" fill="url(#gallery-rs)"/><rect x="47" y="67" width="14" height="34" fill="url(#gallery-rs)"/><rect x="71" y="58" width="14" height="43" fill="url(#gallery-rs)"/><rect x="95" y="43" width="14" height="58" fill="url(#gallery-rs)"/><rect x="119" y="28" width="14" height="73" fill="url(#gallery-rs)"/><rect x="143" y="14" width="14" height="87" fill="url(#gallery-rs)"/><path d="M15 88l32-17 25 4 27-32 21 8 39-42" fill="none" stroke="#6af5ae" stroke-width="3.2"/><path d="M145 9h15v15" fill="none" stroke="#6af5ae" stroke-width="3.2"/></svg>',
      'market-cycle': '<svg viewBox="0 0 180 110"><defs><radialGradient id="gallery-globe"><stop stop-color="#52edaa" stop-opacity=".65"/><stop offset=".6" stop-color="#0b805d" stop-opacity=".38"/><stop offset="1" stop-color="#052b26" stop-opacity=".06"/></radialGradient></defs><circle cx="111" cy="56" r="44" fill="url(#gallery-globe)" stroke="#73dfb8" stroke-opacity=".7"/><path d="M68 56h86M111 12c15 16 19 68 0 88m0-88c-15 16-19 68 0 88M78 35c20 9 46 9 66 0m-66 42c20-9 46-9 66 0" fill="none" stroke="#8bf1c4" stroke-opacity=".48"/><path d="M81 45l16-10 11 4 5 12-10 6-4 16-14-3-7-13zM120 65l12-10 11 5-2 18-13 9-8-8z" fill="#56d996" stroke="none" fill-opacity=".68"/></svg>',
      watchlist: '<svg viewBox="0 0 180 110"><rect x="39" y="11" width="128" height="25" rx="6" fill="#0c4d35"/><rect x="39" y="41" width="128" height="25" rx="6" fill="#0a3d2b"/><rect x="39" y="71" width="128" height="25" rx="6" fill="#093323"/><path d="M53 23h47m-47 30h47m-47 30h47" stroke="#81d6a5" stroke-width="3"/><path d="M133 26l8-9 8 9m-16 30 8-9 8 9" fill="none" stroke="#5ef0a0" stroke-width="3"/><path d="M133 78l8 9 8-9" fill="none" stroke="#f29d79" stroke-width="3"/></svg>',
      wealth: '<svg viewBox="0 0 180 110"><defs><linearGradient id="gallery-wealth" x2="0" y2="1"><stop stop-color="#a6ec79" stop-opacity=".68"/><stop offset="1" stop-color="#226b37" stop-opacity=".13"/></linearGradient></defs><path d="M113 102h61" stroke-opacity=".35"/><rect x="118" y="57" width="13" height="45" fill="url(#gallery-wealth)"/><rect x="139" y="32" width="13" height="70" fill="url(#gallery-wealth)"/><rect x="160" y="12" width="13" height="90" fill="url(#gallery-wealth)"/><ellipse cx="70" cy="86" rx="28" ry="8" fill="#32965b"/><path d="M42 69v17c0 12 56 12 56 0V69" fill="url(#gallery-wealth)"/><ellipse cx="70" cy="69" rx="28" ry="8" fill="#81d57b"/><path d="M46 51v16c0 10 48 10 48 0V51" fill="url(#gallery-wealth)"/><ellipse cx="70" cy="51" rx="24" ry="7" fill="#8add86"/><path d="M52 34v16c0 8 36 8 36 0V34" fill="url(#gallery-wealth)"/><ellipse cx="70" cy="34" rx="18" ry="6" fill="#a4e990"/></svg>',
      'courage-challenge': '<svg viewBox="0 0 180 110"><defs><linearGradient id="gallery-mountain" x2="0" y2="1"><stop stop-color="#7fd98a" stop-opacity=".68"/><stop offset="1" stop-color="#073d2a" stop-opacity=".12"/></linearGradient></defs><path d="M10 104l54-63 23 27 28-45 54 81z" fill="url(#gallery-mountain)" stroke="none"/><path d="M64 41l9 15 10-7m32-26 10 24 9-12" fill="#b0efaa" stroke="none"/><path d="M111 95c-26-4-29-16-14-24 13-6 17-20 18-48" fill="none" stroke="#b8d56a" stroke-width="3.5" stroke-dasharray="7 6"/><path d="M115 24V7l29 7-29 7" fill="#a8e574" stroke="#b8ed94" stroke-width="2"/></svg>',
      'daily-checklist': '<svg viewBox="0 0 180 110"><rect x="55" y="10" width="95" height="94" rx="9"/><path d="M69 35l5 5 9-11m-14 34 5 5 9-11m-14 34 5 5 9-11m13-42h38m-38 28h38m-38 28h29"/></svg>',
      'daily-priorities': '<svg viewBox="0 0 180 110"><circle cx="105" cy="55" r="43"/><circle cx="105" cy="55" r="27"/><circle cx="105" cy="55" r="10"/><path d="M105 55l48-39m-14-3 14 3-1 14"/></svg>',
      'quick-notes': '<svg viewBox="0 0 180 110"><path d="M53 15h86v88H53zM69 40h53m-53 16h46m-46 16h34"/><path d="M108 89l37-37 9 9-37 37-16 6z"/></svg>',
      reminders: '<svg viewBox="0 0 180 110"><circle cx="108" cy="55" r="41"/><path d="M108 27v29l19 12M75 13l-16 15m82-15 16 15"/><circle cx="108" cy="55" r="4"/></svg>',
      habits: '<svg viewBox="0 0 180 110"><path d="M24 88h138M39 88V61m27 27V44m27 44V55m27 33V28m27 60V15"/><path d="M30 57l20 14 21-33 22 16 25-34 27-4"/><circle cx="145" cy="16" r="6"/></svg>',
      'daily-focus': '<svg viewBox="0 0 180 110"><circle cx="108" cy="55" r="39"/><circle cx="108" cy="55" r="23"/><path d="M108 4v20m0 62v20M57 55h20m62 0h20"/><circle cx="108" cy="55" r="5"/></svg>'
    };
    return art[id] || '<svg viewBox="0 0 180 110"><path d="M18 86h144M30 70l18-18 18 10 20-27 19 17 20-21 26 19"/><circle cx="48" cy="52" r="5"/><circle cx="105" cy="52" r="5"/><circle cx="145" cy="50" r="5"/></svg>';
  }

  function bindDashboard(root, action) {
    root.querySelector('[data-dashboard-edit]')?.addEventListener('click', () => { dashboardEditing = !dashboardEditing; render(); });
    root.querySelector('[data-dashboard-reset]')?.addEventListener('click', () => { saveWidgetLayout(defaultWidgetLayout); render(); });
    root.querySelector('[data-gallery-open]')?.addEventListener('click', () => { galleryCategory = 'Todos'; galleryOpen = true; render(); });
    root.querySelectorAll('[data-gallery-category]').forEach((button) => button.addEventListener('click', () => { galleryCategory = button.dataset.galleryCategory || 'Todos'; render(); }));
    root.querySelectorAll('[data-gallery-close]').forEach((button) => button.addEventListener('click', (event) => { if (event.target === button || button.matches('[data-gallery-close]')) { galleryOpen = false; render(); } }));
    root.querySelector('[data-gallery-panel]')?.addEventListener('click', (event) => event.stopPropagation());
    root.querySelectorAll('[data-widget-add]').forEach((button) => button.addEventListener('click', () => updateWidgetLayout((layout) => {
      const highestOrder = Math.max(-1, ...layout.filter((item) => item.active).map((item) => item.order));
      return layout.map((item) => item.id === button.dataset.widgetAdd ? { ...item, active: true, order: highestOrder + 1 } : item);
    })));
    root.querySelectorAll('[data-routine-toggle]').forEach((input) => input.addEventListener('change', () => { window.DailyRoutineController?.handleToggleItem(input.dataset.routineToggle); render(); }));
    root.querySelectorAll('[data-habit-toggle]').forEach((input) => input.addEventListener('change', () => { window.cycleHabitDay?.(input.dataset.habitToggle, new Date().getDate()); render(); }));
    root.querySelectorAll('[data-priority-toggle]').forEach((input) => input.addEventListener('change', () => { window.PersonalDesktopState.togglePriority(input.dataset.priorityToggle); render(); }));
    root.querySelectorAll('[data-priority-remove]').forEach((button) => button.addEventListener('click', () => { window.PersonalDesktopState.removePriority(button.dataset.priorityRemove); render(); }));
    root.querySelector('[data-priority-form]')?.addEventListener('submit', (event) => { event.preventDefault(); window.PersonalDesktopState.addPriority(event.currentTarget.querySelector('input').value.trim()); render(); });
    root.querySelector('[data-personal-notes]')?.addEventListener('input', (event) => window.PersonalDesktopState.update({ note: event.target.value }));
    root.querySelectorAll('[data-reminder-remove]').forEach((button) => button.addEventListener('click', () => { window.PersonalDesktopState.removeReminder(button.dataset.reminderRemove); render(); }));
    root.querySelector('[data-reminder-form]')?.addEventListener('submit', (event) => { event.preventDefault(); window.PersonalDesktopState.addReminder(event.currentTarget.querySelector('input').value.trim()); render(); });
    root.querySelector('[data-focus-title]')?.addEventListener('input', (event) => window.PersonalDesktopState.update({ focus: { ...window.PersonalDesktopState.get().focus, title: event.target.value } }));
    root.querySelector('[data-focus-text]')?.addEventListener('input', (event) => window.PersonalDesktopState.update({ focus: { ...window.PersonalDesktopState.get().focus, text: event.target.value } }));
    root.querySelectorAll('[data-widget-page]').forEach((button) => button.addEventListener('click', () => go(button.dataset.widgetPage)));
    root.querySelector('[data-dashboard-action]')?.addEventListener('click', () => runAction(action));
    root.querySelectorAll('[data-widget-remove]').forEach((button) => button.addEventListener('click', () => updateWidgetLayout((layout) => layout.map((item) => item.id === button.dataset.widgetRemove ? { ...item, active: false } : item))));
    layoutEngine = window.DesktopLayout.mount(root.querySelector('.dashboard-grid'), {
      editing: dashboardEditing,
      onCommit: visible => {
        const byId = new Map(visible.map(item => [item.id, item]));
        const inactive = getWidgetLayout().filter(item => !byId.has(item.id));
        saveWidgetLayout([
          ...visible.map(item => ({ ...item, active: true })),
          ...inactive.map((item, index) => ({ ...item, order: visible.length + index }))
        ]);
      },
      onIdle: () => { if (pendingRender) { pendingRender = false; render(); } }
    });
  }

  function renderTopHeat() {
    const actions = document.querySelector('.topbar .top-actions');
    if (!actions) return;
    let meter = document.getElementById('topHeatMeter');
    if (!meter) {
      meter = document.createElement('button');
      meter.type = 'button';
      meter.id = 'topHeatMeter';
      meter.className = 'top-heat-meter';
      meter.title = 'Abrir Portfolio Heat';
      meter.addEventListener('click', () => go('portfolioheat'));
      actions.prepend(meter);
    }
    const value = heat(), limit = heatLimit(), rawUsage = limit ? value / limit * 100 : 0, usage = Math.min(100, rawUsage);
    meter.classList.toggle('warn', rawUsage >= 80 && rawUsage < 100);
    meter.classList.toggle('critical', rawUsage >= 100);
    meter.innerHTML = `<span>HEAT</span><i><em style="width:${usage}%"></em></i><b>${pct(value)} / ${pct(limit)}</b>`;
  }

  function render() {
    if (layoutEngine?.busy) { pendingRender = true; return; }
    layoutEngine?.destroy();
    const root = document.getElementById('today');
    if (!root) return;
    root.classList.add('today-cockpit-page');
    const source = freshness();
    const scanSummary = window.TodayCockpitModel.summarizeScans(market.scans);
    const leaders = Array.isArray(market.ranking?.items) ? market.ranking.items.filter((item) => Number(item.score) >= 90).length : 0;
    const candidates = scanSummary.matches;
    const currentHeat = heat(), limit = heatLimit(), rawUsage = limit ? currentHeat / limit * 100 : 0, usage = Math.min(100, rawUsage);
    const heatExceeded = rawUsage >= 100;
    const heatWarning = !heatExceeded && rawUsage >= 80;
    const heatTitle = heatExceeded ? 'Portfolio Heat excedido' : heatWarning ? 'Portfolio Heat em alerta' : 'Risco sob controle';
    const heatDetail = heatExceeded ? 'O risco agregado ultrapassou o limite da política. Tome providência antes de assumir qualquer nova exposição.' : heatWarning ? 'O risco agregado está próximo do limite. Revise as posições antes de ampliar a exposição.' : 'Ongoing Risk das posições reais abertas, pelo mesmo cálculo da tela Portfolio Heat.';
    const heatStatus = heatExceeded ? '<span class="today-heat-status critical">HEAT EXCEDIDO · TOMAR PROVIDÊNCIA</span>' : heatWarning ? '<span class="today-heat-status warn">ALERTA · PRÓXIMO DO LIMITE</span>' : '';
    const positions = preparedPositions();
    const action = window.TodayCockpitModel.buildNextAction({ heat: currentHeat, heatLimit: limit, positions, drafts: operationalState?.drafts || [], healthyMarket: healthy(), opportunityCount: candidates });
    const portfolioContent = `<div class="dashboard-risk-state ${heatExceeded ? 'critical' : heatWarning ? 'warn' : ''}"><span>${heatExceeded ? 'HEAT EXCEDIDO' : heatWarning ? 'EM ALERTA' : 'RISCO SOB CONTROLE'}</span><strong>${pct(currentHeat)}</strong><small>de ${pct(limit)} permitido</small></div><p>${heatExceeded ? 'O risco agregado ultrapassou o limite da política.' : heatWarning ? 'O risco agregado está próximo do limite.' : 'Acompanhe o risco agregado das posições reais abertas.'}</p><div class="dashboard-progress"><i style="width:${usage}%"></i></div><div class="dashboard-facts"><span><b>${positions.length}</b> posições reais</span><span><b>${operationalState?.drafts?.length || 0}</b> planos salvos</span></div>`;
    const opportunitiesContent = loading && !market.ranking && !market.scans ? `<div class="dashboard-widget-state">Carregando leitura de mercado…</div>` : `<p>Leituras compactas dos filtros atuais; a decisão completa continua nas telas oficiais.</p><div class="dashboard-opportunity-metrics"><div><strong>${market.ranking ? leaders : '—'}</strong><span>Líderes RS</span></div><div><strong>${market.scans ? candidates : '—'}</strong><span>Ativos nos scans</span></div><div><strong>${market.scans ? scanSummary.available : '—'}</strong><span>Scans ativos</span></div></div>`;
    const actionContent = `<span class="dashboard-action-kind">${esc(action.kind)}</span><h3>${esc(action.title)}</h3><p>${esc(action.detail)}</p><button class="dashboard-primary-action" type="button" data-dashboard-action>${esc(action.action)} <span>→</span></button>`;
    const rankingItems = Array.isArray(market.ranking?.items) ? market.ranking.items.slice(0, 3) : [];
    const watchlistItems = typeof window.getWatchlistOpportunities === 'function'
      ? window.getWatchlistOpportunities().slice(0, 3)
      : (Array.isArray(operationalState?.watchlist) ? operationalState.watchlist.slice(0, 3) : []);
    const challenge = window.CourageChallengeModel?.getState?.();
    const attemptSummary = challenge ? window.CourageChallengeModel?.calculateChallengeMetrics?.(challenge) : null;
    const personal = window.PersonalDesktopState.get();
    const routine = window.DailyRoutineModel?.getTodayRoutineState?.();
    const routineItems = Array.isArray(routine?.items) ? routine.items : [];
    const habits = Array.isArray(window.habitState?.habits) ? window.habitState.habits : [];
    const empty = (message) => `<div class="dashboard-widget-state">${esc(message)}</div>`;
    const renderContext = {
      renderPortfolio: () => portfolioContent,
      renderOpportunities: () => opportunitiesContent,
      renderNextAction: () => actionContent,
      renderRelativeStrength: () => rankingItems.length ? `<div class="dashboard-rs-list">${rankingItems.map((item, index) => `<div><span>${index + 1}</span><b>${esc(item.symbol || item.ticker || '—')}</b><i class="desktop-strength-track" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, Number(item.score) || 0))}%"></i></i><strong>${Number(item.score || 0).toFixed(0)}</strong></div>`).join('')}</div>` : empty('O ranking de Relative Strength ainda não está disponível.'),
      renderMarketCycle: () => market.cycle?.cycle ? `<div class="dashboard-cycle ${healthy() ? 'healthy' : 'defensive'}"><strong>${healthy() ? 'SAUDÁVEL' : 'DEFENSIVO'}</strong><span>IBOV ${pct((Number(market.cycle.cycle.price || 0) / Number(market.cycle.cycle.ema20 || 1) - 1) * 100)} vs. média de 20 dias</span></div>` : empty('A leitura do Ciclo de Mercado ainda não está disponível.'),
      renderWatchlist: () => watchlistItems.length ? `<div class="dashboard-watchlist">${watchlistItems.map((item) => `<span><b>${esc(item.symbol || item.ticker || item.asset || '—')}</b>${esc(item.status || item.stage || 'Em acompanhamento')}</span>`).join('')}</div>` : empty('Nenhum ativo na Watchlist exige atenção agora.'),
      renderWealth: () => typeof window.portfolioHeatSnapshot === 'function' ? `<div class="dashboard-wealth"><span>Portfolio Heat</span><strong>${pct(window.portfolioHeatSnapshot()?.heat || 0)}</strong><small>Use a tela de Patrimônio para a evolução completa.</small></div>` : empty('Ainda não há uma leitura de patrimônio disponível.'),
      renderChallenge: () => window.CourageChallengeModel?.isChallengeActive?.(challenge) ? `<div class="dashboard-challenge"><span class="desktop-challenge-label">Sizing Compliance</span><div class="desktop-challenge-progress"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18"/><circle cx="22" cy="22" r="18" pathLength="100" style="stroke-dasharray:${Math.min(100, Math.max(0, (attemptSummary?.correctExecutions || 0) / Math.max(1, attemptSummary?.targetGoal || challenge?.targetGoal || 1) * 100))} 100"/></svg><strong>${attemptSummary?.correctExecutions || 0} / ${attemptSummary?.targetGoal || challenge?.targetGoal || 0}</strong></div><span>operações dentro do sizing correto</span><small>Under ${attemptSummary?.underSizingCount || 0} · Over ${attemptSummary?.overSizingCount || 0}</small></div>` : empty('Nenhum Desafio Grade A está ativo no momento.')
      ,renderChecklist: () => routineItems.length ? `<div class="personal-checklist">${routineItems.slice(0,6).map(item => `<label><input type="checkbox" data-routine-toggle="${item.id}" ${item.completed ? 'checked' : ''}><span>${esc(item.name)}</span></label>`).join('')}</div>` : empty('Configure a Rotina Diária para começar seu checklist.')
      ,renderPriorities: () => `<div class="personal-list">${personal.priorities.map(item => `<label><input type="checkbox" data-priority-toggle="${item.id}" ${item.done ? 'checked' : ''}><span>${esc(item.text)}</span><button type="button" data-priority-remove="${item.id}">×</button></label>`).join('') || '<p>Nenhuma prioridade definida. Escolha até três coisas importantes.</p>'}<form data-priority-form><input maxlength="90" placeholder="Adicionar prioridade" ${personal.priorities.length >= 3 ? 'disabled' : ''}><button ${personal.priorities.length >= 3 ? 'disabled' : ''}>+</button></form></div>`
      ,renderNotes: () => `<textarea class="personal-notes" data-personal-notes placeholder="Escreva uma nota rápida…">${esc(personal.note)}</textarea><small class="personal-muted">Salvo automaticamente.</small>`
      ,renderReminders: () => `<div class="personal-list">${personal.reminders.map(item => `<span>${esc(item.text)}<button type="button" data-reminder-remove="${item.id}">×</button></span>`).join('') || '<p>Nenhum lembrete para hoje.</p>'}<form data-reminder-form><input maxlength="80" placeholder="Novo lembrete"><button>+</button></form></div>`
      ,renderHabits: () => habits.length ? `<div class="personal-checklist">${habits.slice(0,5).map(item => { const done = window.habitState?.records?.[window.habitKey?.(item.id, new Date().getDate())] === 'done'; return `<label><input type="checkbox" data-habit-toggle="${item.id}" ${done ? 'checked' : ''}><span>${esc(item.name || item.title)}</span></label>`; }).join('')}</div>` : empty('Adicione hábitos para acompanhar sua consistência.')
      ,renderFocus: () => `<div class="personal-focus"><input data-focus-title value="${esc(personal.focus.title)}" aria-label="Intenção do foco"><textarea data-focus-text aria-label="Frase do foco">${esc(personal.focus.text)}</textarea></div>`
    };
    const layout = getWidgetLayout();
    const activeLayout = layout.filter((item) => item.active);
    const widgetsMarkup = activeLayout.map((item) => { const widget = widgetRegistry.get(item.id); return widget ? widgetShell(item, widget, widget.render(renderContext)) : ''; }).join('');
    root.innerHTML = `<main class="today-dashboard"><header class="today-dashboard-header"><div><span class="eyebrow">TRADING DESKTOP</span><h1>Bom dia, ${esc(firstName())}.</h1><p>O essencial do seu sistema antes de entrar nas telas completas.</p></div><div class="today-dashboard-actions"><button type="button" class="dashboard-edit-toggle ${dashboardEditing ? 'active' : ''}" data-dashboard-edit>${dashboardEditing ? 'Concluir personalização' : 'Personalizar painel'}</button>${dashboardEditing ? '<button type="button" class="dashboard-add-widget" data-gallery-open>+ Adicionar Widget</button><button type="button" class="dashboard-reset" data-dashboard-reset>Restaurar padrão</button>' : ''}</div></header><div class="today-dashboard-context"><span class="today-source ${source.kind}">${source.label}</span><span>${healthy() ? 'Mercado saudável para observar cenários A' : 'Mercado defensivo: priorize proteção e gestão'}</span><span>Atualizado: ${esc(updateText(market.cycle?.updatedAt || market.scans?.updatedAt))}</span></div>${dashboardEditing ? '<div class="dashboard-edit-hint">Organize seu Desktop: arraste pelo cabeçalho para reposicionar. Redimensione pela lateral, pela base ou pelo canto; suas preferências são salvas automaticamente.</div>' : ''}<section class="dashboard-grid" aria-label="Widgets do painel">${widgetsMarkup}</section>${!activeLayout.length ? '<section class="dashboard-empty"><h2>Seu painel está vazio</h2><p>Abra a galeria ou restaure o painel padrão para exibir os widgets.</p><button type="button" data-gallery-open>Adicionar widget</button></section>' : ''}</main>${galleryMarkup(layout)}`;
    root.querySelector('.today-dashboard-header p').textContent = 'Disciplina hoje. Consistência amanhã.';
    root.querySelector('.today-dashboard-context').outerHTML = `<section class="desktop-market-pulse" aria-label="Market Pulse"><div class="desktop-pulse-reading"><svg viewBox="0 0 48 40" aria-hidden="true"><path d="M1 22h9l5-13 6 25 7-30 5 23 5-9h9"/></svg><div><b>MARKET PULSE</b><p>${market.cycle?.cycle ? healthy() ? 'Mercado saudável para observar cenários A' : 'Mercado defensivo: priorize proteção e gestão' : 'Aguardando leitura do mercado'}</p></div></div><dl class="desktop-pulse-metrics"><div><dt>Heat</dt><dd>${pct(currentHeat)}</dd></div>${market.ranking ? `<div><dt>Líderes RS</dt><dd>${leaders}</dd></div>` : ''}${market.scans ? `<div><dt>Ativos nos scans</dt><dd>${candidates}</dd></div><div><dt>Scans ativos</dt><dd>${scanSummary.available}</dd></div>` : ''}</dl><div class="desktop-pulse-discipline"><span aria-hidden="true">◎</span><p>“Processo bem feito<br>leva a grandes resultados.”</p></div><div class="desktop-pulse-source"><span class="today-source ${source.kind}">${source.label}</span><small>Atualizado: ${esc(updateText(market.cycle?.updatedAt || market.scans?.updatedAt))}</small></div></section>`;
    bindDashboard(root, action);
    renderTopHeat();
  }

  async function load() {
    if (loading) return;
    if (loadedAt && Date.now() - loadedAt < 5 * 60 * 1000) { render(); return; }
    loading = true;
    render();
    try {
      const requests = await Promise.allSettled([
        fetch(`${api}/market-cycle`).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value; }),
        fetch(`${api}/relative-strength?limit=100`).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value; }),
        fetch(`${api}/market-scans`).then(async (response) => { const value = await response.json(); if (!response.ok) throw new Error(value.error); return value; })
      ]);
      market = {
        cycle: requests[0].status === 'fulfilled' ? requests[0].value : null,
        ranking: requests[1].status === 'fulfilled' ? requests[1].value : null,
        scans: requests[2].status === 'fulfilled' ? requests[2].value : null,
        error: requests.some((request) => request.status === 'rejected') ? 'partial' : null
      };
      loadedAt = Date.now();
    } catch (error) {
      market = { cycle: null, ranking: null, scans: null, error };
    } finally {
      loading = false;
      render();
    }
  }

  const previousGo = go;
  go = function (id) { previousGo(id); if (id === 'today') load(); else renderTopHeat(); };
  window.addEventListener('healthyTrend:authenticated', load);
  window.addEventListener('healthyTrend:workspace-synced', render);
  window.addEventListener('healthyTrend:watchlist-changed', () => {
    if (document.getElementById('today')?.classList.contains('active')) render();
  });
  renderCurrentDate();
  render();
  if (document.getElementById('today')?.classList.contains('active')) load();
}());

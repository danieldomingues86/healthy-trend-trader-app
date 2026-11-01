const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Healthy Green: sidebar active button uses emerald gradient', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.css'), 'utf8');
  assert.match(css, /body\[data-theme="healthy"\]\s+\.sidebar-btn\.active\s*\{[^}]*#164e35/);
  assert.match(css, /body\[data-theme="healthy"\]\s+\.sidebar-btn\.active\s*\{[^}]*#226f4a/);
});

test('Healthy Green: stat card 4 and trophy icon use emerald accents', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'today-cockpit.css'), 'utf8');
  assert.match(css, /body\[data-theme="healthy"\]\s+\.desktop-stat-value\.gold\s*\{[^}]*#34d399/);
  assert.match(css, /body\[data-theme="healthy"\]\s+\.stat-icon-trophy\s*\{[^}]*#34d399/);
});

test('Healthy Green: market cycle holographic sphere uses emerald stroke', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'today-cockpit.css'), 'utf8');
  assert.match(css, /body\[data-theme="healthy"\]\s+#today\s+\.dashboard-widget\[data-widget-id="market-cycle"\]\s+\.desktop-widget-art svg\s*\{[^}]*#10b981/);
});

test('Healthy Green: sidebar quote card has emerald border and gradient accent without legacy banner', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.css'), 'utf8');
  assert.match(css, /\.sidebar-quote-card:before\s*\{[^}]*#10b981/);
  assert.match(css, /\.sidebar-quote-card:before\s*\{[^}]*#34d399/);
  assert.ok(!css.includes('hero-banner.jpg'), 'Não deve conter hero-banner.jpg');
});

test('Healthy Green: emerging leaders cluster cards and NOVO badge use emerald', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'emerging-leaders.css'), 'utf8');
  assert.match(css, /\.el-cluster-card\.active\s*\{[^}]*#34d399/);
  assert.match(css, /\.el-badge-new\s*\{[^}]*#34d399/);
});

test('Healthy Green: portfolio heat quote does not leak gold color', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'portfolio-heat-page.css'), 'utf8');
  assert.ok(!css.includes(',.heat-quote b{color:#eccb77}'));
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)\s+\.heat-quote b\{color:#eccb77\}/);
});

test('Healthy Green: trade anatomy does not have hardcoded gold crumb', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'trade-anatomy.css'), 'utf8');
  assert.ok(!css.includes('body:has(#tradeanatomy.active) .topbar .crumb b{color:#d8bd67}'));
});

test('Premium Gold: sidebar active button uses warm gold gradient', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.css'), 'utf8');
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.sidebar-btn\.active\s*\{[^}]*#b78022/);
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.sidebar-btn\.active\s*\{[^}]*#e0b750/);
});

test('Premium Gold: stat card 4 and trophy icon switch to warm gold', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'today-cockpit.css'), 'utf8');
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.desktop-stat-value\.gold\s*\{[^}]*#fde047/);
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.stat-icon-trophy\s*\{[^}]*#facc15/);
});

test('Premium Gold: market cycle holographic sphere switches to gold wireframe', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'today-cockpit.css'), 'utf8');
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.desktop-widget-art svg\s*\{[^}]*#d4af37/);
});

test('Premium Gold: market cycle page has warm charcoal gold background in gold theme', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'market-cycle-v2.css'), 'utf8');
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*#marketcycle\s+\.mcv2-page\s*\{[^}]*#0d0a06/);
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*#marketcycle\s+\.mcv2-market-pill\.active\s*\{[^}]*#e0b750/);
});

test('Premium Gold: watchlist and emerging leaders topbars do not force emerald green', () => {
  const wlCss = fs.readFileSync(path.join(root, 'frontend', 'watchlist.css'), 'utf8');
  assert.ok(!wlCss.includes('body:has(#watchlist.active) .topbar { background: rgba(2, 19, 12'));
  const elCss = fs.readFileSync(path.join(root, 'frontend', 'emerging-leaders.css'), 'utf8');
  assert.ok(!elCss.includes('body:has(#emergingleaders.active) .topbar { background: rgba(2, 19, 12'));
});

test('Premium Gold: settings toggle switches to gold accent in gold mode', () => {
  const auditCss = fs.readFileSync(path.join(root, 'frontend', 'theme-audit.css'), 'utf8');
  assert.match(auditCss, /body:not\(\[data-theme="healthy"\]\)[^{]*#settings\s+\.toggle\.on\s*\{[^}]*#c99e3d/);
});

test('Breadcrumb: index.html default markup shows "The Healthy Trend Trader / Meu Desktop"', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('<div class="crumb">The Healthy Trend Trader / <b id="crumb">Meu Desktop</b></div>'));
});

test('Breadcrumb: sidebar-navigation.js updates title dynamically per page', () => {
  const js = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.js'), 'utf8');
  assert.ok(js.includes('The Healthy Trend Trader / <b>${t}</b>'));
});

test('Trader Workspace: right column uses compact 2x2 intentional grid layout without empty space', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'navigation-hub-support.css'), 'utf8');
  assert.ok(css.includes('align-items: start;'), 'Layout should have align-items: start to prevent vertical stretching');
  assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'), 'Support panel should arrange cards in 2x2 grid');
  assert.ok(css.includes('align-self: start;'), 'Support panel should align to start to fit content height');
  assert.ok(css.includes('clamp(270px, 20vw, 320px)'), 'Layout right column should have compact width');

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('RECURSOS DO TRADER'), 'Hub support title should be RECURSOS DO TRADER');
});

test('Trader Workspace: right column adapts responsively and supports Premium Gold theme', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'navigation-hub-support.css'), 'utf8');
  assert.ok(css.includes('@media (max-width: 1180px)'), 'Should contain responsive breakpoint for screens <= 1180px');
  assert.ok(css.includes('body[data-theme="gold"][data-navigation-layout="tiles"] .navigation-hub-support'), 'Should style support panel for gold theme');
});

test('Flyout Menu: selected active item subtitles have high contrast and crystal-clear legibility', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.css'), 'utf8');
  // Healthy Green: active item subtitle must be light mint/white (#ecfdf5), not dark green (#8caea0)
  assert.ok(css.includes('.flyout-item-link.active .flyout-item-desc'), 'Must have dedicated style for active flyout subtitle');
  assert.match(css, /body\[data-theme="healthy"\]\s+\.flyout-item-link\.active\s+\.flyout-item-desc[^{]*\{[^}]*#ecfdf5/);
  // Premium Gold: active item subtitle must be deep dark charcoal-gold (#241805) on the gold background
  assert.match(css, /body\[data-theme="gold"\]\s+\.flyout-item-link\.active\s+\.flyout-item-desc[^{]*\{[^}]*#241805/);
});


test('Pigeon Light: tokens and stylesheet are loaded and valid', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'frontend', 'theme-pigeon-light.css'), 'utf8');

  assert.ok(html.includes('frontend/theme-pigeon-light.css'), 'index.html deve carregar theme-pigeon-light.css');
  assert.ok(css.includes('body[data-theme="pigeon"]'), 'Deve conter tokens sob body[data-theme="pigeon"]');
  assert.ok(css.includes('--paper: #F5FAFD'), 'Deve definir fundo principal #F5FAFD');
  assert.ok(css.includes('--ink: #304B5B'), 'Deve definir tipografia principal #304B5B');
  assert.ok(css.includes('--primary: #79BBD6'), 'Deve definir azul principal #79BBD6');
  assert.ok(css.includes('--primary-hover: #58A6CA'), 'Deve definir azul de destaque #58A6CA');
});

test('Pigeon Light: seletor de tema em Configurações e Login suporta pigeon', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('data-theme-choice="pigeon"'), 'Deve conter botão data-theme-choice="pigeon"');
  assert.ok(html.includes("applyTheme('pigeon')"), 'Deve acionar applyTheme("pigeon")');
});

test('Pigeon Light: sidebar flyout, settings, about, forecast, mistakesbook e demais telas possuem cobertura visual completa', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'theme-pigeon-light.css'), 'utf8');
  assert.ok(css.includes('.sidebar-flyout'), 'Deve estilizar .sidebar-flyout no tema Pigeon Light');
  assert.ok(css.includes('#settings .navigation-layout-option.active'), 'Deve estilizar o card ativo de layout de navegação em #settings');
  assert.ok(css.includes('#about .about-hero'), 'Deve estilizar a tela #about em Pigeon Light');
  assert.ok(css.includes('#forecast .forecast-hero-banner'), 'Deve estilizar o banner e botões de #forecast em Pigeon Light');
  assert.ok(css.includes('#mistakesbook .mb-scene'), 'Deve estilizar o Mistakes Book (#mistakesbook) em Pigeon Light');
  assert.ok(css.includes('#marketcycle .mcv2-page'), 'Deve estilizar Ciclo de Mercado (#marketcycle) em Pigeon Light');
  assert.ok(css.includes('#assetblacklist .ab-hero'), 'Deve estilizar Ativos Blacklist (#assetblacklist) em Pigeon Light');
  assert.ok(css.includes('#materials .materials-v2'), 'Deve estilizar Loja Trader (#materials) em Pigeon Light');
  assert.ok(css.includes('#wisdom .wv-page'), 'Deve estilizar Sabedoria Trader (#wisdom) em Pigeon Light');
});

test('Multi-Theme Isolation: seletores :not([data-theme="healthy"]) incluem :not([data-theme="pigeon"])', () => {
  const filesToCheck = [
    path.join(root, 'index.html'),
    path.join(root, 'frontend', 'sidebar-navigation.css'),
    path.join(root, 'frontend', 'today-cockpit.css'),
    path.join(root, 'frontend', 'market-cycle-v2.css'),
    path.join(root, 'frontend', 'theme-audit.css'),
    path.join(root, 'frontend', 'login-cinematic.css')
  ];
  for (const file of filesToCheck) {
    const content = fs.readFileSync(file, 'utf8');
    const unisolated = content.match(/:not\(\[data-theme="healthy"\]\)(?!:not\(\[data-theme="pigeon"\]\))/g);
    assert.strictEqual(unisolated, null, `Arquivo ${path.basename(file)} não deve conter :not([data-theme="healthy"]) sem :not([data-theme="pigeon"])`);
  }
});

test('Pigeon Light (Auditoria Final): Novo Trade, Watchlist, Blacklist, Missão, Anatomia, Erros & Lições, Scrollbar e Loja do Trader não possuem resíduos escuros e preservam artes originais', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'theme-pigeon-light.css'), 'utf8');
  const watchlistJs = fs.readFileSync(path.join(root, 'frontend', 'watchlist-page.js'), 'utf8');
  const materialsCss = fs.readFileSync(path.join(root, 'frontend', 'materials-page-v2.css'), 'utf8');

  // 1. Novo Trade: todos os grades (.grade-d, .grade-c, etc.) e o banner de bloqueio da Etapa 3 têm fundo claro e alto contraste
  assert.ok(css.includes('#newtrade .rubric-experience-inline.grade-d'), 'Deve remover fundo escuro herdado de .rubric-experience-inline.grade-d');
  assert.ok(css.includes('#newtrade .workbench-step3-lock-banner'), 'Deve estilizar o banner de bloqueio da Etapa 3 com alta especificidade');
  assert.ok(css.includes('#newtrade .lock-banner-msg'), 'Deve garantir contraste escuro para .lock-banner-msg no tema Pigeon Light');

  // 2. Watchlist: sem fundo inline escuro rgba(2,16,10,...) na faixa de sparkline
  assert.ok(!watchlistJs.includes('rgba(2,16,10,'), 'watchlist-page.js não deve conter fundos escuros hardcoded rgba(2,16,10,...)');
  assert.ok(css.includes('#watchlist .wl-sparkline-strip'), 'Deve estilizar .wl-sparkline-strip no tema Pigeon Light');
  assert.ok(css.includes('#watchlist .wl-emerging-score-val'), 'Deve garantir legibilidade de .wl-emerging-score-val');

  // 3. Ativos Blacklist: restaura imagens originais e estiliza linhas populadas da tabela
  assert.ok(css.includes("url('../assets/asset-blacklist-hero-v1.png')"), 'Deve preservar imagem original asset-blacklist-hero-v1.png');
  assert.ok(css.includes("url('../assets/asset-blacklist-focus-v1.png')"), 'Deve preservar imagem original asset-blacklist-focus-v1.png');
  assert.ok(css.includes('#assetblacklist .ab-table td'), 'Deve estilizar células populadas de .ab-table no tema Pigeon Light');

  // 4. Missão: restaura panorama da montanha e estiliza cards de waypoints
  assert.ok(css.includes("url('../assets/mission-hero-clean.jpg')"), 'Deve restaurar imagem panorâmica da montanha mission-hero-clean.jpg');
  assert.ok(css.includes('#mission .mission-waypoint-label-card'), 'Deve estilizar cards de waypoints com alto contraste sobre a montanha');

  // 5. Anatomia do Trade: estiliza cards populados, evita cortes laterais nos rankings e estiliza Raio-X
  assert.ok(css.includes('#tradeanatomy .ta-trade-card.rank-1'), 'Deve estilizar cards de trades encerrados em #tradeanatomy');
  assert.ok(css.includes('padding: 24px 28px !important;'), 'Deve aplicar padding interno nas seções .ta-ranking de #tradeanatomy para evitar corte lateral');
  assert.ok(css.includes('#tradeanatomy .ta-title h1 em'), 'Deve estilizar o destaque em itálico de Anatomia dos Trades com cor Pigeon Light');

  // 6. Erros & Lições (Lições importantes): cards brancos, títulos #304B5B e botão primário #79BBD6
  assert.ok(css.includes('#mistakesbook .mb-market-lesson-list article'), 'Deve estilizar os cards de Lições importantes com fundo claro em #mistakesbook');
  assert.ok(css.includes('#mistakesbook button[data-new-market-lesson]'), 'Deve estilizar o botão + Registrar lição de mercado com a identidade Pigeon Light');

  // 7. Menu lateral (.sidebar): barra de rolagem azul-clara suave
  assert.ok(css.includes('.sidebar::-webkit-scrollbar-thumb'), 'Deve estilizar o polegar da barra de rolagem do menu lateral (.sidebar) no tema Pigeon Light');

  // 8. Loja do Trader (#materials): Hero com imagem original, Destaques, Catálogo Completo e Rodapé Editorial claros
  assert.ok(materialsCss.includes("url('../assets/forca-verde-ambient-backdrop.jpg')"), 'materials-page-v2.css deve usar caminho relativo correto ../assets/forca-verde-ambient-backdrop.jpg');
  assert.ok(css.includes('#materials .store-catalog-card .card-body'), 'Deve estilizar .card-body do catálogo de materiais com fundo branco e texto #304B5B');
  assert.ok(css.includes('#materials .featured-highlight-card'), 'Deve estilizar os cards de Destaques da Metodologia no tema Pigeon Light');
  assert.ok(css.includes('#materials .store-editorial-footer'), 'Deve estilizar o rodapé editorial da Loja do Trader no tema Pigeon Light');
});

test('Pigeon Light (Complemento): Widget Gallery, Novo Trade header, Menu em Blocos e Menu Superior seguem Pigeon Light e funcionam integralmente', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'frontend', 'theme-pigeon-light.css'), 'utf8');
  const navCss = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.css'), 'utf8');
  const navJs = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.js'), 'utf8');

  // 1. Widget Gallery sem identidade verde-escura, preservando ilustrações SVG originais
  assert.ok(css.includes('.widget-gallery-backdrop'), 'Deve estilizar .widget-gallery-backdrop no tema Pigeon Light');
  assert.ok(css.includes('.widget-gallery-card'), 'Deve estilizar .widget-gallery-card com superfície clara no tema Pigeon Light');
  assert.ok(css.includes('.widget-gallery-filter.active'), 'Deve estilizar filtro ativo da Widget Gallery com #79BBD6');
  assert.ok(css.includes('.widget-gallery-add'), 'Deve estilizar botão + Adicionar widget na paleta Pigeon Light');
  assert.ok(!css.includes('.widget-gallery-art svg'), 'Não deve alterar as ilustrações próprias (.widget-gallery-art svg) dos widgets');

  // 2. Novo Trade: indicador duplicado de Ciclo de Mercado removido do cabeçalho superior, mantendo Etapa 2 intacta
  assert.match(html, /\.newtrade-cycle-pill\s*\{[^}]*display:\s*none\s*!important/);
  assert.ok(css.includes('#newtrade #newTradeCyclePill'), 'Deve ocultar #newTradeCyclePill no cabeçalho de Novo Trade');
  assert.ok(html.includes('id="rubricCriteria"'), 'Deve preservar a avaliação de Ciclo de Mercado na Etapa 2 (Trading Rubric)');

  // 3. Menu em Blocos (tiles): fundo claro Pigeon Light, blocos brancos e títulos #304B5B legíveis
  assert.ok(css.includes('body[data-theme="pigeon"][data-navigation-layout="tiles"] .navigation-hub'), 'Deve estilizar o fundo de .navigation-hub no Menu em Blocos');
  assert.ok(css.includes('.nav-card-info b'), 'Deve garantir título escuro (#304B5B) em .nav-card-info b no Menu em Blocos');
  assert.ok(css.includes('.nav-category-block'), 'Deve estilizar .nav-category-block com superfície branca no Menu em Blocos');

  // 4. Menu Superior (top): controles visíveis, persistência sincronizada e dropdowns em Pigeon Light
  assert.ok(!navCss.includes('.sidebar:not([data-navigation-layout="top"]) #topNavigationControls'), 'sidebar-navigation.css não deve ocultar #topNavigationControls quando data-navigation-layout="top" está no body');
  assert.ok(navJs.includes('document.body.dataset.navigationLayout = this.model.state.style'), 'sidebar-navigation.js deve sincronizar data-navigation-layout no body na inicialização');
  assert.ok(css.includes('body[data-navigation-layout="top"] #topNavigationControls'), 'Deve exibir #topNavigationControls no Menu Superior');
  assert.ok(css.includes('.top-nav-cat-trigger'), 'Deve estilizar os gatilhos de categoria do Menu Superior em Pigeon Light');
  assert.ok(css.includes('.top-nav-dropdown-menu'), 'Deve estilizar o menu dropdown do Menu Superior em Pigeon Light');
});




test('Pigeon Light (Refinamento de Contraste): Menu Superior, Missao Ativa em Novo Trade, Citacao na Sidebar, EMA 21 nos Graficos e Legibilidade em Setores', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'theme-pigeon-light.css'), 'utf8');
  const chartJs = fs.readFileSync(path.join(root, 'frontend', 'ticker-chart.js'), 'utf8');
  const wlCss = fs.readFileSync(path.join(root, 'frontend', 'workspace-layout.css'), 'utf8');

  // 1. Menu Superior: textos e icones com contraste nitido, categoria ativa destacada em azul e scroll buttons sem vazamento de cores
  assert.ok(css.includes('.top-nav-cat-trigger.parent-active'), 'Deve definir estilo de categoria ativa no Menu Superior');
  assert.ok(css.includes('.top-nav-quick-pill.active'), 'Deve definir pilula de acesso rapido ativa no Menu Superior');
  assert.ok(wlCss.includes('body:not([data-theme="pigeon"])[data-navigation-layout="top"] .top-navigation-menu button'), 'workspace-layout.css nao deve vazar cor #dce9e1 para o tema Pigeon Light');

  // 2. Novo Trade: Missao Ativa com imagem original mission-climber-banner.jpg e citacao na sidebar legivel
  assert.ok(css.includes("url('../assets/mission-climber-banner.jpg')"), 'Deve usar imagem existente mission-climber-banner.jpg no banner de Missao Ativa');
  assert.ok(!css.includes('mission-active-climber-banner.png'), 'Nao deve referenciar arquivo inexistente mission-active-climber-banner.png');
  assert.ok(css.includes('body[data-theme="pigeon"] .sidebar-quote-text'), 'Deve estilizar o texto da citacao no menu lateral no tema Pigeon Light');

  // 3. Graficos: reset das series tecnicas ao recriar o grafico para preservar EMA 21 ao trocar de ativo
  assert.ok(chartJs.includes('ema21Series = null;'), 'ticker-chart.js deve resetar ema21Series ao recriar o grafico');
  assert.ok(chartJs.includes('ema50Series = null;'), 'ticker-chart.js deve resetar ema50Series ao recriar o grafico');
  assert.ok(chartJs.includes('ema200Series = null;'), 'ticker-chart.js deve resetar ema200Series ao recriar o grafico');

  // 4. Setores: metadados do cabecalho e titulos de empresas no hover com alto contraste
  assert.ok(css.includes('#markettreemap .treemap-sector-meta span'), 'Deve garantir contraste nos metadados do cabecalho dos setores');
  assert.ok(css.includes('.tgm-company-title'), 'Deve garantir legibilidade na coluna de empresas do modal de setor');
  assert.ok(css.includes('.tgm-price-cell'), 'Deve garantir contraste nos precos do modal de setor');
});

test('Pigeon Light (Ajustes Adicionais): Espaçamento em Configurações, Hero da tela Sobre e Legibilidade em Novo Trade', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'theme-pigeon-light.css'), 'utf8');
  const setCss = fs.readFileSync(path.join(root, 'frontend', 'settings-experience.css'), 'utf8');

  // 1. Configurações: respiro superior para o título não colar no menu superior
  assert.match(setCss, /#settings \.settings-hero\{[^}]*padding:32px 0 24px/, 'settings-experience.css deve ter padding-top aumentado');
  assert.ok(css.includes('padding-top: 36px !important;'), 'theme-pigeon-light.css deve garantir respiro no hero de configurações');

  // 2. Sobre: arte hero substitui o touro por about-pigeon-hero.png
  assert.ok(fs.existsSync(path.join(root, 'assets', 'about-pigeon-hero.png')), 'assets/about-pigeon-hero.png deve existir');
  assert.ok(css.includes("url('../assets/about-pigeon-hero.png')"), 'Deve usar about-pigeon-hero.png na tela Sobre');
  assert.ok(css.includes('#about .about-hero-bull-bg'), 'Deve ocultar imagem do touro no tema Pigeon Light');

  // 3. Novo Trade: Grade C com alto contraste e Missão Ativa com descrição e métricas legíveis
  assert.ok(css.includes('#newtrade #tradeGaugeMessage.grade-c'), 'Deve estilizar #tradeGaugeMessage.grade-c diretamente no Pigeon Light');
  assert.ok(css.includes('max-width: 62% !important;'), 'Descrição da Missão Ativa não deve invadir o escalador');
  assert.ok(css.includes('.mission-metric-pill.is-effective .mission-metric-label'), 'Deve garantir contraste no label do risco efetivo');
});

test('Pigeon Light (Refinamento Final): Grade C contraste em index.html, Remoção do eyebrow em Configurações e Tela Sobre Widescreen/Ultrawide', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const setJs = fs.readFileSync(path.join(root, 'frontend', 'settings-experience.js'), 'utf8');
  const setCss = fs.readFileSync(path.join(root, 'frontend', 'settings-experience.css'), 'utf8');
  const aboutCss = fs.readFileSync(path.join(root, 'frontend', 'about-page.css'), 'utf8');
  const pigeonCss = fs.readFileSync(path.join(root, 'frontend', 'theme-pigeon-light.css'), 'utf8');

  // 1. Novo Trade: Grade C em Pigeon Light tem contraste WCAG AAA (#92400E e fundo #FEF3C7)
  assert.ok(html.includes("statusEl.style.setProperty('color', '#92400E', 'important')"), 'index.html deve aplicar #92400E para Grade C no Pigeon Light');
  assert.ok(html.includes("statusEl.style.setProperty('background', '#FEF3C7', 'important')"), 'index.html deve aplicar #FEF3C7 para Grade C no Pigeon Light');
  assert.ok(pigeonCss.includes('#92400E !important;'), 'theme-pigeon-light.css deve garantir cor #92400E no Grade C');

  // 2. Configurações: remoção do eyebrow duplicado e espaçamento
  assert.ok(!setJs.includes("CONFIGURAÇÕES GERAIS"), 'settings-experience.js não deve ter eyebrow duplicado de CONFIGURAÇÕES GERAIS');
  assert.ok(setCss.includes('.eyebrow{display:none!important}'), 'settings-experience.css deve ocultar .eyebrow no hero');

  // 3. Sobre: expansão fluida em monitores widescreen e ultrawide (1600px, 2000px, 2600px)
  assert.ok(aboutCss.includes('--about-composition-width: min(1860px, 94vw);'), 'about-page.css deve suportar largura fluida a partir de 1600px');
  assert.ok(aboutCss.includes('--about-composition-width: min(2300px, 94vw);'), 'about-page.css deve suportar ultrawide a partir de 2000px');
  assert.ok(aboutCss.includes('--about-composition-width: min(2900px, 92vw);'), 'about-page.css deve suportar super ultrawide a partir de 2600px');
  assert.ok(pigeonCss.includes("background: url('../assets/about-pigeon-hero.png') right center / cover no-repeat !important;"), 'theme-pigeon-light.css deve posicionar imagem sem distorção');
});

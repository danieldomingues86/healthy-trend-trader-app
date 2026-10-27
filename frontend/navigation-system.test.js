const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { NavigationSystemModel, CATEGORIES, MODULES, PRESETS } = require('./navigation-system-model.js');

test('NavigationSystemModel: inventário completo e 100% dos módulos representados', () => {
  const model = new NavigationSystemModel();
  const integrity = model.validateIntegrity();

  assert.equal(integrity.isValid, true, `Módulos ausentes: ${integrity.missingModules.join(', ')}`);
  assert.ok(integrity.totalModules >= 36, `Deve conter ao menos 36 módulos cadastrados (atual: ${integrity.totalModules})`);
  assert.equal(integrity.totalModules, integrity.representedCount);
});

test('NavigationSystemModel: todas as categorias obrigatórias existem com ícones e descrições', () => {
  const expectedCategoryIds = [
    'daily',
    'training-recovery',
    'market-analysis',
    'portfolio-risk',
    'simulators',
    'data-performance',
    'mindset',
    'resources'
  ];

  const categoryIds = CATEGORIES.map(c => c.id);
  for (const exp of expectedCategoryIds) {
    assert.ok(categoryIds.includes(exp), `Categoria obrigatória ausente: ${exp}`);
    const cat = CATEGORIES.find(c => c.id === exp);
    assert.ok(cat.label && cat.label.length > 0, `Categoria ${exp} deve ter label`);
    assert.ok(cat.icon && cat.icon.includes('<svg'), `Categoria ${exp} deve ter ícone SVG`);
    assert.ok(cat.desc && cat.desc.length > 0, `Categoria ${exp} deve ter descrição`);
  }
});

test('NavigationSystemModel: PREDEFINIÇÃO FAST preserva 100% dos módulos', () => {
  const model = new NavigationSystemModel();
  model.applyPreset('fast');
  const tree = model.getNavigationTree();
  const integrity = model.validateIntegrity(tree);

  assert.equal(integrity.isValid, true);
  assert.equal(tree.preset, 'fast');
  assert.deepEqual(tree.quickAccess.map(i => i.id), ['today', 'newtrade', 'journal', 'watchlist', 'charts']);
  assert.equal(integrity.totalModules, integrity.representedCount);
});

test('NavigationSystemModel: PREDEFINIÇÃO TRADER_FOCUS preserva 100% dos módulos', () => {
  const model = new NavigationSystemModel();
  model.applyPreset('trader_focus');
  const tree = model.getNavigationTree();
  const integrity = model.validateIntegrity(tree);

  assert.equal(integrity.isValid, true);
  assert.equal(tree.preset, 'trader_focus');
  assert.deepEqual(tree.quickAccess.map(i => i.id), ['today', 'newtrade', 'watchlist', 'charts', 'positions', 'journal']);
  assert.equal(integrity.totalModules, integrity.representedCount);
});

test('NavigationSystemModel: PREDEFINIÇÃO FULL preserva 100% dos módulos', () => {
  const model = new NavigationSystemModel();
  model.applyPreset('full');
  const tree = model.getNavigationTree();
  const integrity = model.validateIntegrity(tree);

  assert.equal(integrity.isValid, true);
  assert.equal(tree.preset, 'full');
  assert.ok(tree.quickAccess.length >= 5);
  assert.equal(integrity.totalModules, integrity.representedCount);
});

test('NavigationSystemModel: Predefinições governam exclusivamente o Acesso Rápido e Categorias', () => {
  const model = new NavigationSystemModel();
  
  // 1. Inicia com preset 'fast'
  assert.equal(model.state.preset, 'fast');
  assert.deepEqual(model.state.quickAccess, ['today', 'newtrade', 'journal', 'watchlist', 'charts']);

  // 2. Módulos pertencem estritamente às suas categorias oficiais (ex: portfolioheat em 'portfolio-risk')
  const treeFast = model.getNavigationTree();
  const riskCat = treeFast.categories.find(c => c.id === 'portfolio-risk');
  assert.ok(riskCat.items.some(i => i.id === 'portfolioheat'));

  const dailyCat = treeFast.categories.find(c => c.id === 'daily');
  assert.ok(!dailyCat.items.some(i => i.id === 'portfolioheat'), 'Módulo não deve estar fora de sua categoria oficial');

  // REGRA DE NÃO DUPLICAÇÃO: Se está no Acesso Rápido, não pode estar na categoria abaixo
  const quickIds = new Set(treeFast.quickAccess.map(i => i.id));
  assert.ok(!dailyCat.items.some(i => quickIds.has(i.id)), 'Itens do Acesso Rápido não devem ser duplicados em Operação Diária');
  treeFast.categories.forEach(cat => {
    assert.ok(!cat.items.some(i => quickIds.has(i.id)), `Categoria ${cat.id} não deve conter itens duplicados do Acesso Rápido`);
  });

  // 3. Ao aplicar a predefinição 'trader_focus', Acesso Rápido e ordenação atualizam automaticamente
  model.applyPreset('trader_focus');
  assert.equal(model.state.preset, 'trader_focus');
  assert.deepEqual(model.state.quickAccess, ['today', 'newtrade', 'watchlist', 'charts', 'positions', 'journal']);

  // REGRA DE NÃO DUPLICAÇÃO em trader_focus
  const treeFocus = model.getNavigationTree();
  const focusQuickIds = new Set(treeFocus.quickAccess.map(i => i.id));
  treeFocus.categories.forEach(cat => {
    assert.ok(!cat.items.some(i => focusQuickIds.has(i.id)), `Categoria ${cat.id} não deve conter itens duplicados do Acesso Rápido no preset trader_focus`);
  });

  // 4. Integridade segue 100% em todas as predefinições (todos os módulos continuam presentes)
  const integrity = model.validateIntegrity(treeFocus);
  assert.equal(integrity.isValid, true);
  assert.equal(integrity.totalModules, integrity.representedCount);
});

test('NavigationSystemModel: persistência em mock storage e restauração de estado', () => {
  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v))
  };

  const model1 = new NavigationSystemModel();
  model1.setStyle('tiles');
  model1.applyPreset('full');
  model1.toggleCategoryCollapsed('mindset');
  model1.save(mockStorage);

  const model2 = new NavigationSystemModel();
  model2.load(mockStorage);

  assert.equal(model2.state.style, 'tiles');
  assert.equal(model2.state.preset, 'full');
  assert.deepEqual(model2.state.quickAccess, ['today', 'newtrade', 'journal', 'watchlist', 'charts', 'dashboard']);
  assert.ok(model2.isCategoryCollapsed('mindset'));
});

test('Validação de Paridade 100%: Nenhum item da navegação anterior foi perdido', () => {
  const model = new NavigationSystemModel();
  const allModulePages = new Set(MODULES.map(m => m.page));

  // Itens que estavam no NAV_STRUCTURE e FOOTER_STRUCTURE anterior
  const previousSidebarPages = [
    'today', 'newtrade', 'journal', 'dailyroutine', 'watchlist', 'habits',
    'tradertraining', 'mission',
    'relativestrength', 'marketcycle', 'charts', 'marketcentral', 'opportunityradar', 'fundamentals',
    'tradesimulator', 'researchlab', 'forecast',
    'dashboard', 'positions', 'closedpositions', 'portfolioheat', 'riskpolicy', 'assetblacklist',
    'analytics', 'tradeanatomy', 'mistakesbook', 'tradelibrary', 'platformaccess', 'review',
    'mindset',
    'materials', 'settings', 'manual', 'glossary', 'about'
  ];

  for (const page of previousSidebarPages) {
    assert.ok(allModulePages.has(page), `Página da sidebar anterior '${page}' deve estar no novo catálogo de módulos`);
  }

  // Itens complementares que estavam em tiles ou submenus
  const additionalKnownPages = [
    'zen', 'emotionalintelligence', 'traderrules', 'wisdom', 'traderprofile'
  ];

  for (const page of additionalKnownPages) {
    assert.ok(allModulePages.has(page), `Página complementar '${page}' deve estar no novo catálogo de módulos`);
  }
});

test('NavigationSystemModel: controle de recolhimento de categoria (isCategoryCollapsed e toggleCategoryCollapsed)', () => {
  const model = new NavigationSystemModel();
  model.state.collapsedCategories = [];
  assert.equal(model.isCategoryCollapsed('daily_operation'), false);

  // Recolher 'daily_operation'
  model.toggleCategoryCollapsed('daily_operation');
  assert.equal(model.isCategoryCollapsed('daily_operation'), true);

  // Expandir novamente via toggle
  model.toggleCategoryCollapsed('daily_operation');
  assert.equal(model.isCategoryCollapsed('daily_operation'), false);
});

test('NavigationSystem: Categoria Treinamento tem label exato e ícones do Menu Superior são transparentes', () => {
  const trainingCat = CATEGORIES.find(c => c.id === 'training-recovery');
  assert.ok(trainingCat, 'Categoria training-recovery deve existir');
  assert.equal(trainingCat.label, 'Treinamento', 'Label da categoria deve ser exatamente "Treinamento"');

  const css = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.css'), 'utf8');
  assert.match(css, /\.dropdown-item-ico\s*\{[^}]*background:\s*transparent/i, 'dropdown-item-ico deve ter background transparente');
});

test('NavigationSystemModel: Categoria Análise de Mercado segue ordem estrita de prioridade diária', () => {
  const model = new NavigationSystemModel();
  const tree = model.getNavigationTree();
  const marketCat = tree.categories.find(c => c.id === 'market-analysis');
  assert.ok(marketCat, 'Categoria market-analysis deve existir');
  
  const pageOrder = marketCat.items.map(i => i.page);
  assert.deepEqual(pageOrder, [
    'opportunityradar',
    'relativestrength',
    'marketcycle',
    'marketcentral',
    'fundamentals',
    'markettreemap'
  ], 'Itens de Análise de Mercado devem respeitar a ordem prioritária de uso diário');

  // Validação dos textos e descrições do menu
  const radar = marketCat.items.find(i => i.page === 'opportunityradar');
  assert.equal(radar.label, 'Radar de Oportunidades');
  assert.equal(radar.desc, 'Ativos prontos para entrada no gráfico Diário.');

  const rs = marketCat.items.find(i => i.page === 'relativestrength');
  assert.equal(rs.label, 'Força Relativa');
  assert.equal(rs.desc, 'Identificar os ativos líderes do mercado.');

  const cycle = marketCat.items.find(i => i.page === 'marketcycle');
  assert.equal(cycle.label, 'Ciclo de Mercado');
  assert.equal(cycle.desc, 'Verificar o regime de mercado e o sinal de permissão para operar.');

  const central = marketCat.items.find(i => i.page === 'marketcentral');
  assert.equal(central.label, 'Central de Mercado');
  assert.equal(central.desc, 'Consultar a visão geral do ambiente de mercado.');

  const fund = marketCat.items.find(i => i.page === 'fundamentals');
  assert.equal(fund.label, 'Análise Fundamentalista');
  assert.equal(fund.desc, 'Consultar os fundamentos e a qualidade dos ativos.');

  const treemap = marketCat.items.find(i => i.page === 'markettreemap');
  assert.equal(treemap.label, 'Setores');
  assert.equal(treemap.desc, 'Treemap interativo de todo o mercado acionário da B3.');
});

test('NavigationSystemModel: Categoria Dados & Performance inclui Registro de Eventos e mantém integridade', () => {
  const model = new NavigationSystemModel();
  const tree = model.getNavigationTree();
  const dataCat = tree.categories.find(c => c.id === 'data-performance');
  assert.ok(dataCat, 'Categoria data-performance deve existir');

  const pageOrder = dataCat.items.map(i => i.page);
  assert.deepEqual(pageOrder, [
    'analytics',
    'tradeanatomy',
    'tradelibrary',
    'platformaccess',
    'review',
    'eventplaybook'
  ], 'Dados & Performance deve conter Registro de Eventos');

  const events = dataCat.items.find(i => i.page === 'eventplaybook');
  assert.ok(events, 'Registro de Eventos deve existir em Dados & Performance');
  assert.equal(events.label, 'Registro de Eventos');
  assert.equal(events.desc, 'Acompanhar eventos relevantes que podem afetar suas operações.');
});


test('Flyout Submenu Grid: max 3 colunas em telas grandes, adaptando para 2 e 1 coluna', () => {
  const css = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.js'), 'utf8');

  // CSS Flyout limite maximo de 3 colunas e nunca linha unica horizontal
  assert.ok(css.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'), 'Grid deve usar no maximo 3 colunas');
  assert.ok(!css.includes('repeat(auto-fit, minmax(180px, 1fr))'), 'Nao deve mais usar auto-fit sem limite que gerava linha unica');
  assert.ok(css.includes('container-type: inline-size'), 'Flyout deve suportar Container Queries');
  assert.ok(css.includes('@container flyout (max-width: 540px)'), 'Deve ter container query para 2 colunas');
  assert.ok(css.includes('@container flyout (max-width: 350px)'), 'Deve ter container query para 1 coluna');

  // JS idealWidth e maxCols
  assert.ok(js.includes('Math.min(itemCount, 3)'), 'JS deve limitar maxCols a 3 no maximo');
  assert.ok(js.includes('idealWidth = 660'), 'idealWidth default deve ser 660px para acomodar 3 colunas perfeitamente');

  // Docking / Fixação colada no menu principal sem vão/gap
  assert.ok(js.includes('Math.round(sidebarRight) - 1'), 'Flyout deve estar colado diretamente na borda do sidebar sem gap');
  assert.ok(css.includes('border-radius: 0 16px 16px 0'), 'Borda esquerda do flyout deve ser reta para encaixe perfeito no sidebar');
});

test('NavigationSystemModel: Categoria Análise de Mercado fica posicionada acima de Operação Diária', () => {
  const cat0 = CATEGORIES[0];
  const cat1 = CATEGORIES[1];
  assert.equal(cat0.id, 'market-analysis', 'Primeira categoria deve ser Análise de Mercado');
  assert.equal(cat1.id, 'daily', 'Segunda categoria deve ser Operação Diária');

  const model = new NavigationSystemModel();
  const tree = model.getNavigationTree();
  assert.equal(tree.categories[0].id, 'market-analysis', 'Árvore de navegação deve ter Análise de Mercado em primeiro lugar');
  assert.equal(tree.categories[1].id, 'daily', 'Árvore de navegação deve ter Operação Diária após Análise de Mercado');
});

test('NavigationSystemModel: Categoria Simuladores inclui Simulador de Trades e Laboratório de Pesquisa', () => {
  const model = new NavigationSystemModel();
  const tree = model.getNavigationTree();
  const simCat = tree.categories.find(c => c.id === 'simulators');
  assert.ok(simCat, 'Categoria simulators deve existir');

  const pageOrder = simCat.items.map(i => i.page);
  assert.deepEqual(pageOrder, [
    'tradesimulator',
    'researchlab',
    'forecast',
    'riskofruin'
  ], 'Simuladores deve conter Modo Oficial e Laboratório de Pesquisa como itens distintos');

  const tradeSim = simCat.items.find(i => i.page === 'tradesimulator');
  assert.equal(tradeSim.label, 'Simulador de Trades');
  assert.equal(tradeSim.desc, 'Modo Oficial — Regras vigentes do método.');

  const lab = simCat.items.find(i => i.page === 'researchlab');
  assert.equal(lab.label, 'Laboratório de Pesquisa');
  assert.equal(lab.desc, 'Modo Aberto — Descobertas e regras candidatas.');
});

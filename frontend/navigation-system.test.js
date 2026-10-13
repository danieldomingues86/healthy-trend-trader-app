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

test('NavigationSystemModel: personalização de Acesso Rápido e movimentação de módulo', () => {
  const model = new NavigationSystemModel();
  
  // 1. Adicionar módulo ao Acesso Rápido
  assert.equal(model.state.quickAccess.includes('portfolioheat'), false);
  model.setQuickAccess('portfolioheat', true);
  assert.equal(model.state.quickAccess.includes('portfolioheat'), true);
  assert.equal(model.state.preset, 'custom');

  // 2. Mover módulo entre categorias (ex: portfolioheat para 'daily')
  model.moveModule('portfolioheat', 'daily');
  let tree = model.getNavigationTree();
  const dailyCat = tree.categories.find(c => c.id === 'daily');
  assert.ok(dailyCat.items.some(i => i.id === 'portfolioheat'));

  // 3. Integridade segue 100% mesmo após movimentação personalizada
  const integrity = model.validateIntegrity(tree);
  assert.equal(integrity.isValid, true);

  // 4. Remover do Acesso Rápido
  model.setQuickAccess('portfolioheat', false);
  assert.equal(model.state.quickAccess.includes('portfolioheat'), false);
});

test('NavigationSystemModel: persistência em mock storage e restauração de estado', () => {
  const storageMap = new Map();
  const mockStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v))
  };

  const model1 = new NavigationSystemModel();
  model1.setStyle('tiles');
  model1.setQuickAccess('tradesimulator', true);
  model1.save(mockStorage);

  const model2 = new NavigationSystemModel();
  model2.load(mockStorage);

  assert.equal(model2.state.style, 'tiles');
  assert.equal(model2.state.quickAccess.includes('tradesimulator'), true);
});

test('Validação de Paridade 100%: Nenhum item da navegação anterior foi perdido', () => {
  const model = new NavigationSystemModel();
  const allModulePages = new Set(MODULES.map(m => m.page));

  // Itens que estavam no NAV_STRUCTURE e FOOTER_STRUCTURE anterior
  const previousSidebarPages = [
    'today', 'newtrade', 'journal', 'dailyroutine', 'watchlist', 'habits',
    'tradertraining', 'mission', 'rebuild',
    'relativestrength', 'marketcycle', 'charts', 'marketnews', 'marketscans', 'emergingleaders', 'fundamentals',
    'tradesimulator', 'forecast',
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
    'risk', 'masteredlessons', 'zen', 'emotionalintelligence', 'traderrules', 'wisdom', 'traderprofile'
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

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('SidebarNavigation reúne Simulador de Trades e Simulador de Equity no menu Simuladores', () => {
  const code = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.js'), 'utf8');
  const context = {
    window: {},
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ setAttribute: () => {}, addEventListener: () => {} }),
      body: { dataset: {}, appendChild: () => {} },
      readyState: 'complete'
    },
    localStorage: { getItem: () => null, setItem: () => {} }
  };
  context.globalThis = context;
  context.window = context;

  const vmContext = vm.createContext(context);
  vm.runInContext(code, vmContext);

  const nav = context.SidebarNavigation;
  assert.ok(nav, 'SidebarNavigation deve estar definido');
  assert.ok(Array.isArray(nav.navStructure), 'navStructure deve ser uma lista de grupos');

  // 1. Menu Simuladores deve existir como grupo
  const simulatorsGroup = nav.navStructure.find(g => g.id === 'simulators');
  assert.ok(simulatorsGroup, 'Grupo "simulators" deve existir na navegação');
  assert.equal(simulatorsGroup.label, 'Simuladores');
  assert.equal(simulatorsGroup.isGroup, true);

  // 2. Simuladores deve conter exatamente as duas telas
  const itemIds = Array.from(simulatorsGroup.items.map(item => item.id));
  assert.deepEqual([...itemIds], ['tradesimulator', 'forecast']);

  const tradeSim = simulatorsGroup.items.find(item => item.id === 'tradesimulator');
  assert.equal(tradeSim.title, 'Simulador de Trades');
  assert.equal(tradeSim.page, 'tradesimulator');

  const equitySim = simulatorsGroup.items.find(item => item.id === 'forecast');
  assert.equal(equitySim.title, 'Simulador de Equity');
  assert.equal(equitySim.page, 'forecast');

  // 3. forecast não deve mais estar em data-performance
  const dataPerformanceGroup = nav.navStructure.find(g => g.id === 'data-performance');
  assert.ok(dataPerformanceGroup, 'Grupo data-performance deve existir');
  const forecastInDataPerf = dataPerformanceGroup.items.find(item => item.id === 'forecast');
  assert.equal(forecastInDataPerf, undefined, 'forecast não deve mais estar em data-performance');

  // 4. tradesimulator não deve mais ser item raiz avulso
  const rootTradeSim = nav.navStructure.find(g => g.id === 'tradesimulator');
  assert.equal(rootTradeSim, undefined, 'tradesimulator não deve ser item raiz isolado');
});

test('index.html e catálogo de títulos refletem o nome Simulador de Equity', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Não deve existir "Simulador de Resultados" nas labels oficiais de navegação e títulos
  assert.ok(html.includes("titles.forecast='Simulador de Equity'"), 'titles.forecast deve ser Simulador de Equity');
  assert.ok(html.includes("aria-label=\"Simulador de Equity\""), 'section forecast deve ter aria-label Simulador de Equity');
  assert.ok(html.includes("'Simulador de Equity','Equity Simulator'"), 'professionalLabels deve conter Simulador de Equity');
});

test('sidebar-navigation.css: modo recolhido oculta todos os textos e headers para exibir exclusivamente ícones', () => {
  const css = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.css'), 'utf8');

  // Headers de categoria e labels devem estar ocultos em body.sidebar-collapsed
  assert.ok(css.includes('body.sidebar-collapsed .sidebar-category-header'));
  assert.ok(css.includes('body.sidebar-collapsed .sidebar-cat-label'));
  assert.ok(css.includes('body.sidebar-collapsed .sidebar-group-label'));
  assert.ok(css.includes('body.sidebar-collapsed .sidebar-btn-label'));
});

test('SidebarNavigation e Model: itens de Acesso Rápido não se duplicam dentro das categorias', () => {
  const { NavigationSystemModel } = require('./navigation-system-model.js');
  const model = new NavigationSystemModel();
  
  ['fast', 'trader_focus', 'full'].forEach(preset => {
    model.applyPreset(preset);
    const tree = model.getNavigationTree();
    const quickIds = new Set(tree.quickAccess.map(i => i.id));
    
    // Nenhuma categoria pode conter item que já esteja em quickAccess
    for (const cat of tree.categories) {
      for (const item of cat.items) {
        assert.ok(!quickIds.has(item.id), `Preset ${preset}: item '${item.id}' está duplicado no Acesso Rápido e na categoria '${cat.id}'`);
      }
    }
  });
});

test('SidebarNavigation: botões de rolagem do menu superior são estritamente ocultados/removidos no menu lateral', () => {
  const css = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.css'), 'utf8');
  assert.ok(css.includes('body:not([data-navigation-layout="top"]) #topNavigationControls'));
  assert.ok(css.includes('display: none !important'));

  const js = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.js'), 'utf8');
  assert.ok(js.includes('existingControls?.remove()'));
});


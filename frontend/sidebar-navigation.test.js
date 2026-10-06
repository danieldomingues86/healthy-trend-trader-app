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

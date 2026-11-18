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

  // 2. Simuladores deve conter as telas de simulação (Simulador de Trades, Simulador de Equity e Risco de Ruína)
  const itemIds = Array.from(simulatorsGroup.items.map(item => item.id));
  assert.deepEqual([...itemIds], ['tradesimulator', 'researchlab', 'forecast', 'riskofruin']);

  const tradeSim = simulatorsGroup.items.find(item => item.id === 'tradesimulator');
  assert.equal(tradeSim.title, 'Simulador de Trades');
  assert.equal(tradeSim.page, 'tradesimulator');

  const researchLab = simulatorsGroup.items.find(item => item.id === 'researchlab');
  assert.ok(researchLab, 'Item "researchlab" deve existir em Simuladores');
  assert.equal(researchLab.title, 'Laboratório de Pesquisa');
  assert.equal(researchLab.page, 'researchlab');

  const equitySim = simulatorsGroup.items.find(item => item.id === 'forecast');
  assert.equal(equitySim.title, 'Simulador de Equity');
  assert.equal(equitySim.page, 'forecast');

  const rorSim = simulatorsGroup.items.find(item => item.id === 'riskofruin');
  assert.equal(rorSim.title, 'Risco de Ruína');
  assert.equal(rorSim.page, 'riskofruin');

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

test('Menu em Blocos (Tiles Hub): layout de viewport única (100vh), grid 3x6 com 18 atalhos e zero scroll', () => {
  const code = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.js'), 'utf8');
  let hubElement = null;
  const context = {
    window: {},
    document: {
      querySelector: (sel) => {
        if (sel === '.page.active') return { id: 'today' };
        return null;
      },
      querySelectorAll: () => [],
      getElementById: (id) => {
        if (id === 'navigationHub') return hubElement;
        return null;
      },
      createElement: (tag) => {
        const el = {
          tagName: tag.toUpperCase(),
          id: '',
          className: '',
          innerHTML: '',
          classList: {
            add: (c) => el.classList._classes.add(c),
            remove: (c) => el.classList._classes.delete(c),
            contains: (c) => el.classList._classes.has(c),
            _classes: new Set()
          },
          setAttribute: () => {},
          addEventListener: () => {}
        };
        return el;
      },
      body: {
        dataset: { navigationLayout: 'tiles' },
        appendChild: (el) => {
          if (el.id === 'navigationHub') hubElement = el;
        }
      },
      addEventListener: () => {},
      readyState: 'complete'
    },
    localStorage: { getItem: () => null, setItem: () => {} }
  };
  context.globalThis = context;
  context.window = context;

  const vmContext = vm.createContext(context);
  vm.runInContext(code, vmContext);

  const nav = context.SidebarNavigation;
  assert.ok(nav, 'SidebarNavigation deve existir');
  nav.renderNavigationHub();

  assert.ok(hubElement, 'Elemento #navigationHub deve ser criado');
  assert.ok(hubElement.classList.contains('open'), 'Elemento #navigationHub deve conter a classe .open');

  const html = hubElement.innerHTML;
  // 1. Deve possuir cabeçalho com marca, pomba e citação
  assert.ok(html.includes('THE HEALTHY TREND'), 'Cabeçalho deve ter a marca THE HEALTHY TREND');
  assert.ok(html.includes('TRADER WORKSPACE'), 'Cabeçalho deve ter o subtítulo TRADER WORKSPACE');
  assert.ok(html.includes('nav-hub-dove-watermark'), 'Cabeçalho deve ter o elemento de marca d água da pomba');
  assert.ok(html.includes('NAVEGAÇÃO'), 'Deve conter o eyebrow de navegação');
  assert.ok(html.includes('Para onde você quer ir'), 'Deve conter o título principal');
  assert.ok(html.includes('nav-hub-highlight'), 'Palavra hoje? deve estar destacada');
  assert.ok(html.includes('Consistência é a verdadeira vantagem'), 'Deve conter a citação aprovada');
  assert.ok(html.includes('HEALTHY TREND TRADER'), 'Deve assinar a citação como HEALTHY TREND TRADER');
  assert.ok(html.includes('closeNavigationHub()'), 'Deve possuir botão de fechar');

  // 2. Deve possuir a grade unificada 3x6 com exatamente 18 atalhos
  assert.ok(html.includes('nav-hub-unified-grid'), 'Deve possuir a classe .nav-hub-unified-grid');
  const cardMatches = [...html.matchAll(/class="nav-hub-tile-card([^"]*)"/g)];
  assert.equal(cardMatches.length, 18, `A grade deve conter exatamente 18 cards (encontrados: ${cardMatches.length})`);

  // 3. Os 18 cards devem conter os IDs e títulos oficiais na ordem aprovada
  const expectedCards = [
    { id: 'today', title: 'Meu Desktop' },
    { id: 'newtrade', title: 'Novo Trade' },
    { id: 'journal', title: 'Diário de Trader' },
    { id: 'watchlist', title: 'Watchlist' },
    { id: 'charts', title: 'Gráficos' },
    { id: 'dashboard', title: 'Patrimônio' },
    { id: 'marketcentral', title: 'Análise de Mercado' },
    { id: 'opportunityradar', title: 'Radar de Oportunidades' },
    { id: 'relativestrength', title: 'Força Relativa' },
    { id: 'marketcycle', title: 'Ciclo de Mercado' },
    { id: 'marketcentral', title: 'Central de Mercado' },
    { id: 'fundamentals', title: 'Análise Fundamentalista' },
    { id: 'markettreemap', title: 'Setores' },
    { id: 'positions', title: 'Operação Diária' },
    { id: 'dailyroutine', title: 'Rotina Diária' },
    { id: 'habits', title: 'Monitor de Hábitos' },
    { id: 'tradertraining', title: 'Treinamento' },
    { id: 'conquests', title: 'Conquistas' }
  ];

  expectedCards.forEach(({ id, title }) => {
    assert.ok(html.includes(`data-nav-id="${id}"`), `Card com data-nav-id="${id}" deve estar presente`);
    assert.ok(html.includes(title), `Título "${title}" deve estar presente no card`);
  });

  // 4. Card ativo deve estar destacado
  assert.ok(html.includes('nav-hub-tile-card active'), 'O card ativo deve possuir a classe .active');

  // 5. CSS deve garantir viewport única de 100vh com overflow: hidden (zero scroll vertical)
  const css = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.css'), 'utf8');
  assert.ok(css.includes('#navigationHub.navigation-hub'), 'CSS deve conter regra para #navigationHub.navigation-hub');
  assert.ok(css.includes('overflow: hidden !important'), 'CSS deve eliminar o scroll com overflow: hidden !important');
  assert.ok(css.includes('height: 100vh !important'), 'CSS deve limitar a altura a 100vh');
  assert.ok(css.includes('grid-template-columns: repeat(6, 1fr) !important'), 'CSS deve definir 6 colunas na grade');
  assert.ok(css.includes('grid-template-rows: repeat(3, 1fr) !important'), 'CSS deve definir 3 linhas na grade');

  // 6. Restrição de escopo: menu lateral e superior não foram modificados
  assert.ok(css.includes('body[data-navigation-layout="sidebar"] .app'), 'Estilos do menu lateral devem ser mantidos');
  assert.ok(css.includes('body[data-navigation-layout="top"] .sidebar'), 'Estilos do menu superior devem ser mantidos');
});


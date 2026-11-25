const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const ciJs = fs.readFileSync(path.join(__dirname, 'capital-intelligence.js'), 'utf8');
const ciCss = fs.readFileSync(path.join(__dirname, 'capital-intelligence.css'), 'utf8');
const { NavigationSystemModel } = require('./navigation-system-model.js');
const CapitalIntelligenceModel = require('./capital-intelligence-model.js');

test('E2E Frontend — 1. Registro e Shell da Aplicação no index.html e Sidebar', () => {
  // 1.1 Registro no Menu do Sistema
  const navModel = new NavigationSystemModel();
  const tree = navModel.getNavigationTree();
  const marketCategory = tree.categories.find(c => c.id === 'market-analysis');
  assert.ok(marketCategory, 'Categoria Análise de Mercado deve existir');
  const ciItem = marketCategory.items.find(i => i.id === 'capitalintelligence');
  assert.ok(ciItem, 'Item capitalintelligence deve estar em Análise de Mercado');

  // 1.2 Shell no index.html
  assert.ok(indexHtml.includes('id="capitalintelligence"'), 'Seção de página capitalintelligence no index.html');
  assert.ok(indexHtml.includes('id="capitalIntelligenceRoot"'), 'Root container capitalIntelligenceRoot');
  assert.ok(indexHtml.includes('data-page="capitalintelligence"'), 'Botão de navegação na sidebar');
  assert.ok(indexHtml.includes('frontend/capital-intelligence.css'), 'CSS link no head');
  assert.ok(indexHtml.includes('frontend/capital-intelligence-model.js'), 'Model script no index.html');
  assert.ok(indexHtml.includes('frontend/capital-intelligence.js'), 'Controller script no index.html');
});

test('E2E Frontend — 2. Direção Artística com Águia, Paleta Nobre e Ausência de Tigre', () => {
  // 2.1 Presença física da arte da águia em alta resolução
  const eaglePath = path.join(repoRoot, 'assets', 'capital-intelligence', 'eagle-horizon-backdrop.jpg');
  assert.ok(fs.existsSync(eaglePath), 'eagle-horizon-backdrop.jpg deve existir em assets/capital-intelligence');
  assert.ok(fs.statSync(eaglePath).size > 20000, 'Arte da águia deve ser de alta resolução');

  // 2.2 Integração na folha de estilos e markup
  assert.ok(ciCss.includes('eagle-horizon-backdrop.jpg'), 'CSS deve carregar a imagem da águia');
  assert.ok(ciJs.includes('ci-eagle-backdrop'), 'Markup deve conter a div ci-eagle-backdrop');

  // 2.3 Ausência formal de tigre em todo o módulo
  assert.equal(/\btigre\b|\btiger\b/i.test(ciJs), false, 'Código JS não pode conter referências a tigre');
  assert.equal(/\btigre\b|\btiger\b/i.test(ciCss.replace(/\/\*[\s\S]*?\*\//g, '')), false, 'CSS não pode conter regras de tigre');

  // 2.4 Paleta cromática nobre do Healthy Trend Trader
  assert.ok(ciCss.includes('--ci-emerald'), 'Token esmeralda presente');
  assert.ok(ciCss.includes('--ci-gold'), 'Token dourado presente');
  assert.ok(ciCss.includes('--ci-sapphire'), 'Token safira presente');
  assert.ok(ciCss.includes('--ci-amethyst'), 'Token ametista presente');
});

test('E2E Frontend — 3. Interação com Esferas, Gaveta Lateral, Modais e Rodapé', () => {
  // 3.1 Canvas central e gaveta contextual sem esconder o mapa
  assert.ok(ciJs.includes('ciLiveMapCanvas'), 'Canvas interativo para o mapa de esferas');
  assert.ok(ciJs.includes('ciNodeDrawer'), 'Gaveta lateral contextual para detalhes da esfera');
  assert.ok(ciJs.includes('renderNodeDrawer'), 'Método renderNodeDrawer implementado');
  assert.ok(ciJs.includes('closeNodeDrawer'), 'Método closeNodeDrawer implementado');

  // 3.2 Modal de Análise Estratégica de Alocação
  assert.ok(ciJs.includes('ciAllocationSummaryBtn'), 'Card resumo no Executive Rail');
  assert.ok(ciJs.includes('openAllocationModal'), 'Método para abrir modal de alocação');
  assert.ok(ciJs.includes('ciAllocationModal'), 'Elemento modal ciAllocationModal');
  assert.ok(ciJs.includes('ci-alloc-table'), 'Tabela comparativa estrutural de alocação');
  assert.ok(ciJs.includes('ci-evidence-grid'), 'Radar de evidências macroeconômicas de 21 pregões');

  // 3.3 Modal de Racional de Conexão Econômica
  assert.ok(ciJs.includes('ciConnectionModal'), 'Modal de conexão econômica');
  assert.ok(ciJs.includes('openConnectionModal'), 'Método para abrir racional da aresta');

  // 3.4 Faixa secundária de variações diárias no rodapé
  assert.ok(ciJs.includes('ciDailyFooterStrip'), 'Container do rodapé presente');
  assert.ok(ciJs.includes('ci-daily-guard-badge'), 'Badge explícito de não contaminação de ciclo');
  assert.ok(ciJs.includes('ci-daily-date-tag'), 'Tag de data do pregão por ativo');
  assert.ok(ciJs.includes('ci-daily-capture-meta'), 'Metadados de captura e fuso');
});

test('E2E Frontend — 4. Responsividade e Acessibilidade (Desktop, Notebook e Tablet)', () => {
  // 4.1 Breakpoints de CSS para diferentes formatos de tela
  assert.ok(ciCss.includes('@media (max-width: 1380px)'), 'Breakpoint para notebook grande');
  assert.ok(ciCss.includes('@media (max-width: 1080px)'), 'Breakpoint para tablet/notebook compacto');
  assert.ok(ciCss.includes('@media (max-width: 720px)'), 'Breakpoint para telas móveis');

  // 4.2 Acessibilidade e Semântica
  assert.ok(ciJs.includes('role="dialog"'), 'Modais com role="dialog"');
  assert.ok(ciJs.includes('aria-modal="true"'), 'Modais com aria-modal="true"');
  assert.ok(ciJs.includes('aria-label'), 'Uso de aria-label para leitores de tela');
  assert.ok(ciJs.includes('aria-hidden'), 'Controle de visibilidade acessível');

  // 4.3 Scrollbar discreta ou oculta na faixa do rodapé
  assert.ok(ciCss.includes('.ci-daily-footer-strip::-webkit-scrollbar'), 'Ocultação de scrollbar no rodapé');
  assert.ok(ciCss.includes('.ci-table-responsive'), 'Scroll horizontal seguro para a tabela de alocação');
});

test('E2E Frontend — 5. Ciclo Completo de Hidratação do Modelo e Ausência de Dados Fictícios', () => {
  const model = new CapitalIntelligenceModel();

  // 5.1 Estado padrão sem dados fictícios
  const defaultScenario = model.getIndicativeRebalanceScenario();
  assert.ok(defaultScenario.rows.length >= 5);
  assert.ok(defaultScenario.disclaimer.includes('NÃO VINCULANTE'));
  assert.ok(defaultScenario.disclaimer.includes('Não constitui recomendação'));

  // 5.2 Hidratação com dados reais de pipeline
  const mockSnapshot = {
    overallStatus: 'atualizado',
    generatedAt: '2026-11-24T18:00:00Z',
    spheres: {
      cycle_br: { id: 'cycle_br', status: 'atualizado', state: 'defense', change21dPct: -4.2 },
      cycle_us: { id: 'cycle_us', status: 'atualizado', state: 'expansion', change21dPct: 3.1 },
      breadth_us: { id: 'breadth_us', status: 'atualizado', pctAboveMa50: 62 },
      gold_commodities: { id: 'gold_commodities', status: 'atualizado', change21dPct: 4.8 },
      macro_events: { id: 'macro_events', status: 'atualizado', upcomingEvents: [] },
      my_portfolio: { id: 'my_portfolio', status: 'atualizado' }
    },
    allocationSuggestion: {
      confidenceLevel: 'ALTA',
      postureLabel: 'Postura Seletiva com Viés Global',
      shortRationale: 'Divergência entre fraqueza na B3 e expansão nos EUA.',
      targetAllocations: {
        fixedIncome: 40,
        localEquities: 10,
        globalEquities: 25,
        goldProtection: 15,
        cashLiquidity: 10
      },
      comparisonRows: [
        { key: 'fixedIncome', label: 'Renda Fixa / Pós-fixado', currentPct: 35.0, suggestedPct: 40, deltaPct: 5.0, action: 'increase', actionLabel: 'Aumentar (+5%)' },
        { key: 'localEquities', label: 'Ações Brasil (B3)', currentPct: 20.0, suggestedPct: 10, deltaPct: -10.0, action: 'decrease', actionLabel: 'Reduzir (-10%)' },
        { key: 'globalEquities', label: 'Ações Globais & BDRs', currentPct: 20.0, suggestedPct: 25, deltaPct: 5.0, action: 'increase', actionLabel: 'Aumentar (+5%)' },
        { key: 'goldProtection', label: 'Ouro & Proteção', currentPct: 5.0, suggestedPct: 15, deltaPct: 10.0, action: 'increase', actionLabel: 'Aumentar (+10%)' },
        { key: 'cashLiquidity', label: 'Caixa & Liquidez Livre', currentPct: 20.0, suggestedPct: 10, deltaPct: -10.0, action: 'decrease', actionLabel: 'Reduzir (-10%)' }
      ],
      evidences: [
        { name: 'Ciclo B3 (Brasil)', weight: 20, period: '21 pregões', directionScore: -1.0, summary: 'Defesa B3.' },
        { name: 'Ciclo S&P 500 / Nasdaq (EUA)', weight: 20, period: '21 pregões', directionScore: 1.0, summary: 'Expansão EUA.' },
        { name: 'Market Breadth & Rotação (EUA)', weight: 15, period: '21 pregões', directionScore: 1.0, summary: 'Breadth saudável.' },
        { name: 'Juros DI Futuro (Brasil)', weight: 15, period: '21 pregões', directionScore: -1.0, summary: 'DI pressionado.' },
        { name: 'Câmbio Dólar / BRL', weight: 10, period: '21 pregões', directionScore: -0.5, summary: 'Dólar volátil.' },
        { name: 'Risco Global (Treasury 10Y & VIX)', weight: 10, period: '21 pregões', directionScore: 0.0, summary: 'VIX neutro.' },
        { name: 'Ouro & Ativos de Proteção', weight: 10, period: '21 pregões', directionScore: 1.0, summary: 'Ouro em alta.' }
      ]
    },
    dailyTapeSecondary: [
      { symbol: 'IBOV', label: 'IBOV', market: 'BR', flag: '🇧🇷', calendar: 'B3 (São Paulo)', closeValue: 128450, change1dPct: -0.85, asOfDate: '2026-11-24' },
      { symbol: 'SPX', label: 'S&P 500', market: 'US', flag: '🇺🇸', calendar: 'NYSE (New York)', closeValue: 5850.2, change1dPct: 0.42, asOfDate: '2026-11-24' }
    ]
  };

  model.hydrateFromPipelineSnapshot(mockSnapshot);
  const scenario = model.getIndicativeRebalanceScenario();

  assert.equal(scenario.confidenceLevel, 'ALTA');
  assert.equal(scenario.postureLabel, 'Postura Seletiva com Viés Global');
  assert.equal(scenario.comparisonRows.length, 5);

  // Soma de 100% e múltiplos de 5%
  let sum = 0;
  scenario.comparisonRows.forEach(row => {
    assert.equal(row.suggestedPct % 5, 0);
    sum += row.suggestedPct;
  });
  assert.equal(sum, 100);

  // Tape diário hidratado
  const tape = model.getDailyTapeItems();
  assert.equal(tape.length, 2);
  assert.equal(tape[0].symbol, 'IBOV');
  assert.equal(tape[0].market, 'BR');
  assert.equal(tape[1].symbol, 'SPX');
  assert.equal(tape[1].market, 'US');
});

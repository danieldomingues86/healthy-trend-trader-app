const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const ciCss = fs.readFileSync(path.join(__dirname, 'capital-intelligence.css'), 'utf8');
const ciJs = fs.readFileSync(path.join(__dirname, 'capital-intelligence.js'), 'utf8');
const { NavigationSystemModel } = require('./navigation-system-model.js');
const CapitalIntelligenceModel = require('./capital-intelligence-model.js');

test('CapitalIntelligenceHub: módulo devidamente registrado no NavigationSystemModel sob Análise de Mercado', () => {
  const model = new NavigationSystemModel();
  const tree = model.getNavigationTree();

  const marketCat = tree.categories.find(c => c.id === 'market-analysis');
  assert.ok(marketCat, 'Categoria market-analysis deve existir');

  const ciItem = marketCat.items.find(i => i.id === 'capitalintelligence');
  assert.ok(ciItem, 'capitalintelligence deve estar presente em Análise de Mercado');
  assert.equal(ciItem.page, 'capitalintelligence');
  assert.equal(ciItem.label, 'Capital Intelligence');

  const integrity = model.validateIntegrity(tree);
  assert.equal(integrity.isValid, true);
});

test('CapitalIntelligenceHub: index.html contém seção, títulos, estilos e scripts integrados', () => {
  assert.ok(indexHtml.includes('id="capitalintelligence"'), 'Section capitalintelligence obrigatória');
  assert.ok(indexHtml.includes('id="capitalIntelligenceRoot"'), 'Container capitalIntelligenceRoot obrigatório');
  assert.ok(indexHtml.includes("titles.capitalintelligence='Capital Intelligence'"), 'Título registrado');
  assert.ok(indexHtml.includes('data-page="capitalintelligence"'), 'Botão na sidebar');
  assert.ok(indexHtml.includes('frontend/capital-intelligence.css'), 'Stylesheet link presente');
  assert.ok(indexHtml.includes('frontend/capital-intelligence-model.js'), 'Model script presente');
  assert.ok(indexHtml.includes('frontend/capital-intelligence.js'), 'Controller script presente');
  assert.ok(
    indexHtml.includes("id==='capitalintelligence'") && indexHtml.includes('CapitalIntelligenceHub'),
    'Função go() deve renderizar CapitalIntelligenceHub'
  );
});

test('CapitalIntelligence Art Direction: águia panorâmica integrada ao fundo e ausência total de tigre', () => {
  const eaglePath = path.join(repoRoot, 'assets', 'capital-intelligence', 'eagle-horizon-backdrop.jpg');
  assert.ok(fs.existsSync(eaglePath), 'Artwork da águia deve existir em assets/capital-intelligence/eagle-horizon-backdrop.jpg');
  assert.ok(fs.statSync(eaglePath).size > 20000, 'Artwork da águia deve ser imagem de alta qualidade');

  const manualCoverPath = path.join(repoRoot, 'assets', 'manual-knowledge', 'capitalintelligence.jpg');
  assert.ok(fs.existsSync(manualCoverPath), 'Capa conceitual do manual deve existir');

  assert.ok(ciCss.includes('eagle-horizon-backdrop.jpg'), 'CSS deve integrar a arte da águia ao fundo');
  assert.ok(ciJs.includes('ci-eagle-backdrop'), 'HTML da tela deve incluir camada de fundo da águia');

  // Regra expressa: não usar tigre
  assert.equal(/\btigre\b|\btiger\b/i.test(ciJs), false, 'Controller não deve conter referências a tigre');
  assert.equal(/\btigre\b|\btiger\b/i.test(ciCss.replace(/\/\*[\s\S]*?\*\//g, '')), false, 'Regras CSS não devem referenciar tigre');
});

test('CapitalIntelligence Art Direction: dados diários isolados em faixa secundária compacta no rodapé e alocação clicável abre modal', () => {
  // Faixa secundária de 1 pregão no rodapé
  assert.ok(ciJs.includes('ci-daily-footer-strip'), 'Deve renderizar faixa secundária de rodapé para pregão diário');
  assert.ok(ciJs.includes('Pregão diário (1D · secundário)'), 'Faixa de rodapé deve identificar caráter secundário');
  assert.ok(ciCss.includes('.ci-daily-footer-strip'), 'Estilo dedicado para a faixa secundária de rodapé');

  // Painel resumido clicável de sugestão de alocação -> modal detalhado
  assert.ok(ciJs.includes('ciAllocationSummaryBtn'), 'Painel resumido clicável de sugestão de alocação obrigatório');
  assert.ok(ciJs.includes('openAllocationModal'), 'Clique no painel resumido deve abrir modal de análise detalhada');
  assert.ok(ciJs.includes('ciAllocationModal'), 'Modal de análise detalhada de alocação obrigatório');

  // Paleta premium (esmeralda, dourado, azul, roxo) e responsividade
  assert.ok(ciCss.includes('--ci-emerald'), 'Token esmeralda presente');
  assert.ok(ciCss.includes('--ci-gold'), 'Token dourado presente');
  assert.ok(ciCss.includes('--ci-sapphire'), 'Token azul presente');
  assert.ok(ciCss.includes('--ci-amethyst'), 'Token roxo presente');
  assert.ok(ciCss.includes('@media (max-width: 1380px)'), 'Breakpoint notebook presente');
  assert.ok(ciCss.includes('@media (max-width: 1080px)'), 'Breakpoint tablet/médio presente');
});

test('CapitalIntelligenceHub: modelo entrega resumo macro, eventos, insights e faixa diária de forma consistente', () => {
  const model = new CapitalIntelligenceModel();

  const macro = model.getMacroScenarioSummary();
  assert.equal(macro.length, 3, 'Resumo macro deve conter Brasil, EUA e Ouro/Proteção');

  const insights = model.generateInsights();
  assert.ok(insights.length >= 4);
  insights.forEach(item => {
    assert.ok(item.title && item.diagnostic && item.portfolioImpact);
    assert.ok(model.getNodeById(item.nodeId), `Insight ${item.id} deve apontar para uma esfera válida`);
  });

  const events = model.getUpcomingEvents();
  assert.ok(events.length >= 3);

  const tape = model.getDailyTapeItems();
  assert.ok(tape.length >= 5);
});

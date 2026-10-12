'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  readCache,
  classStrengthFromCache,
  classStrengthWeeklyFromCache
} = require('../src/market-data');
const { nasdaqRelativeStrengthEngine } = require('../src/nasdaq-relative-strength');
const {
  aggregateWeeklyCandles,
  weeklyReturns,
  getWeeklyTrendState,
  resolveWeeklyClassification,
  rankWeeklyItems
} = require('../src/weekly-relative-strength');

test('Força Relativa: preserva 100% da integridade do Diário (Swing Trade)', async () => {
  const cache = await readCache();
  const daily = classStrengthFromCache(cache);

  assert.ok(daily.stock_ibov, 'Universo stock_ibov deve existir no Diário');
  assert.ok(daily.stock_other, 'Universo stock_other deve existir no Diário');
  assert.ok(daily.fii, 'Universo fii deve existir no Diário');
  assert.ok(daily.bdr, 'Universo bdr deve existir no Diário');

  assert.strictEqual(daily.stock_ibov.items.length, 76, 'Ibov diário deve conter 76 ativos');
  assert.strictEqual(daily.fii.items.length, 106, 'FIIs diário deve conter 106 ativos');
  assert.strictEqual(daily.bdr.items.length, 34, 'BDRs diário deve conter 34 ativos');

  // Verify daily returns are present and valid
  const firstItem = daily.stock_ibov.items[0];
  assert.ok(Number.isFinite(firstItem.m1), '1M diário deve ser numérico');
  assert.ok(Number.isFinite(firstItem.m3), '3M diário deve ser numérico');
  assert.ok(Number.isFinite(firstItem.score), 'RS score diário deve ser numérico');
  assert.strictEqual(firstItem.score, 100, 'Primeiro colocado diário tem RS 100');
});

test('Força Relativa: calcula e entrega dados do Semanal (Position Trade)', async () => {
  const cache = await readCache();
  const weekly = classStrengthWeeklyFromCache(cache);

  assert.ok(weekly.stock_ibov, 'Universo stock_ibov semanal deve existir');
  assert.ok(weekly.stock_other, 'Universo stock_other semanal deve existir');
  assert.ok(weekly.fii, 'Universo fii semanal deve existir');
  assert.ok(weekly.bdr, 'Universo bdr semanal deve existir');

  assert.strictEqual(weekly.stock_ibov.items.length, 76, 'Ibov semanal deve conter 76 ativos');
  assert.strictEqual(weekly.fii.items.length, 106, 'FIIs semanal deve conter 106 ativos');
  assert.strictEqual(weekly.bdr.items.length, 34, 'BDRs semanal deve conter 34 ativos');

  const topWeekly = weekly.stock_ibov.items[0];
  assert.strictEqual(topWeekly.timeframe, 'weekly', 'Ativo semanal deve ter timeframe=weekly');
  assert.ok(Number.isFinite(topWeekly.m1), '1M semanal deve ser numérico');
  assert.ok(Number.isFinite(topWeekly.m3), '3M semanal deve ser numérico');
  assert.ok(Number.isFinite(topWeekly.score), 'RS score semanal deve ser numérico');
  assert.ok(topWeekly.weeklyTrend, 'Ativo semanal deve ter weeklyTrend calculado');
  assert.ok(['BULLISH', 'BEARISH', 'NEUTRAL'].includes(topWeekly.weeklyTrend.state));
  assert.ok(Number.isFinite(topWeekly.weeklyTrend.ema9));
  assert.ok(Number.isFinite(topWeekly.weeklyTrend.ema21));
  assert.ok(Number.isFinite(topWeekly.weeklyTrend.sma40));
});

test('Força Relativa: regra de negócio semanal impede Líder com tendência de baixa/neutra', () => {
  const resBullish = resolveWeeklyClassification(95, 'BULLISH');
  assert.strictEqual(resBullish.classification, 'Líder', 'RS 95 com alta semanal é Líder');
  assert.strictEqual(resBullish.bandKey, 'leader');

  const resBearish = resolveWeeklyClassification(95, 'BEARISH');
  assert.strictEqual(resBearish.classification, 'Em observação', 'RS 95 com baixa semanal deve cair para Em observação');
  assert.strictEqual(resBearish.bandKey, 'observation');

  const resNeutral = resolveWeeklyClassification(92, 'NEUTRAL');
  assert.strictEqual(resNeutral.classification, 'Qualificado', 'RS 92 com tendência neutra fica como Qualificado');
  assert.strictEqual(resNeutral.bandKey, 'qualified');
});

test('Força Relativa: Nasdaq-100 entrega ranking Diário e Semanal', () => {
  const nasdaqDaily = nasdaqRelativeStrengthEngine.getNasdaqRelativeStrength('daily');
  assert.strictEqual(nasdaqDaily.status, 'OK');
  assert.strictEqual(nasdaqDaily.ranking.length, 100, 'Nasdaq diário deve conter 100 ativos');

  const nasdaqWeekly = nasdaqRelativeStrengthEngine.getNasdaqRelativeStrength('weekly');
  assert.strictEqual(nasdaqWeekly.status, 'OK');
  assert.strictEqual(nasdaqWeekly.ranking.length, 100, 'Nasdaq semanal deve conter 100 ativos');
  assert.strictEqual(nasdaqWeekly.timeframe, 'weekly');
  assert.ok(nasdaqWeekly.ranking[0].weeklyTrend, 'Top ativo da Nasdaq semanal tem weeklyTrend');
});

test('Força Relativa: Cache estático do frontend contém todos os universos Diários e Semanais', () => {
  const staticCache = require('../../frontend/relative-strength-data-cache.js');
  assert.ok(staticCache, 'Cache estático deve carregar');
  assert.ok(staticCache.dataAsOf, 'Cache estático deve conter dataAsOf');

  // Daily
  assert.strictEqual(staticCache.daily.stock_ibov.items.length, 76, '76 Ibov Diário');
  assert.strictEqual(staticCache.daily.stock_other.items.length, 201, '201 Demais ações Diário');
  assert.strictEqual(staticCache.daily.fii.items.length, 106, '106 FIIs Diário');
  assert.strictEqual(staticCache.daily.bdr.items.length, 34, '34 BDRs Diário');

  // Weekly
  assert.strictEqual(staticCache.weekly.stock_ibov.items.length, 76, '76 Ibov Semanal');
  assert.strictEqual(staticCache.weekly.stock_other.items.length, 201, '201 Demais ações Semanal');
  assert.strictEqual(staticCache.weekly.fii.items.length, 106, '106 FIIs Semanal');
  assert.strictEqual(staticCache.weekly.bdr.items.length, 34, '34 BDRs Semanal');

  // Nasdaq
  assert.strictEqual(staticCache.nasdaq.daily.ranking.length, 100, '100 Nasdaq Diário');
  assert.strictEqual(staticCache.nasdaq.weekly.ranking.length, 100, '100 Nasdaq Semanal');
});

test('Força Relativa: Validação rigorosa das 5 classificações oficiais e classes de linha (sem Líder Excepcional/Força Alta)', () => {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');

  const jsContent = fs.readFileSync(path.join(__dirname, '../../frontend/relative-strength-v3.js'), 'utf8');

  // Assert no invented classifications exist in the source code
  assert.doesNotMatch(jsContent, /Líder Excepcional/i, 'Líder Excepcional não deve existir no código');
  assert.doesNotMatch(jsContent, /Exceptional Leader/i, 'Exceptional Leader não deve existir no código');
  assert.doesNotMatch(jsContent, /Força Alta/i, 'Força Alta não deve existir no código');

  // Verify SVG flags are defined in JS
  assert.match(jsContent, /rs-flag-svg/, 'Deve conter classe rs-flag-svg para as bandeiras');
  assert.match(jsContent, /FLAG_BR_SVG/, 'Deve conter FLAG_BR_SVG');
  assert.match(jsContent, /FLAG_US_SVG/, 'Deve conter FLAG_US_SVG');

  // Verify table rows receive rs-row-${leitura.tierClass}
  assert.match(jsContent, /rs-row-\$\{leitura\.tierClass\}/, 'Linhas da tabela devem receber rs-row-${leitura.tierClass}');
});

test('Força Relativa: Paginação default 20 e combo seletor com opções 10, 20, 50, 100 ao lado da paginação', () => {
  const fs = require('fs');
  const path = require('path');

  const jsContent = fs.readFileSync(path.join(__dirname, '../../frontend/relative-strength-v3.js'), 'utf8');

  // Verify default page size is 20
  assert.match(jsContent, /window\.relativeStrengthPageSize\s*=\s*20;/, 'Tamanho default de página deve ser 20');

  // Verify options 10, 20, 50, 100
  assert.match(jsContent, /value="10"/, 'Deve ter opção 10');
  assert.match(jsContent, /value="20"/, 'Deve ter opção 20');
  assert.match(jsContent, /value="50"/, 'Deve ter opção 50');
  assert.match(jsContent, /value="100"/, 'Deve ter opção 100');

  // Verify bottom combo is rendered in pagination bar
  assert.match(jsContent, /rsBottomPerPageSelect/, 'Deve existir combo rsBottomPerPageSelect na barra de paginação');
  assert.match(jsContent, /rs-pagination-per-page/, 'Deve existir container rs-pagination-per-page ao lado da paginação');
});

test('Força Relativa: Breadcrumb duplicado removido e espaçamento elegante de topo', () => {
  const fs = require('fs');
  const path = require('path');

  const jsContent = fs.readFileSync(path.join(__dirname, '../../frontend/relative-strength-v3.js'), 'utf8');
  const cssContent = fs.readFileSync(path.join(__dirname, '../../frontend/relative-strength-v3.css'), 'utf8');

  // Assert in-page duplicate breadcrumb is NOT rendered in template
  assert.doesNotMatch(jsContent, /<nav class="rs-breadcrumb"/, 'Breadcrumb redundante em página deve ser removido');

  // Assert top breathing room in rs-container
  assert.match(cssContent, /\.rs-container\s*\{[^}]*padding:\s*28px/, 'rs-container deve ter padding de topo de 28px');

  // Assert legacy rs-header-container is suppressed
  assert.match(cssContent, /\.rs-header-container/, 'rs-header-container legado deve estar na regra de supressão');
});

test('Força Relativa: isolamento estrito de visibilidade entre Força Relativa e Watchlist (sem sobreposição)', () => {
  const fs = require('fs');
  const path = require('path');

  const cssContent = fs.readFileSync(path.join(__dirname, '../../frontend/relative-strength-v3.css'), 'utf8');

  // Assert rule requiring .active for workspace display
  assert.match(
    cssContent,
    /body\s+#relativestrength\.rs-workspace-active\.active\s*\{[^}]*display:\s*block\s*!important/s,
    'body #relativestrength.rs-workspace-active.active deve exigir .active para ter display: block !important'
  );

  // Assert :not(.active) guard
  assert.match(
    cssContent,
    /#relativestrength:not\(\.active\)\s*\{[^}]*display:\s*none\s*!important/s,
    '#relativestrength:not(.active) deve forçar display: none !important'
  );

  // Assert no unconditioned display: block !important on #relativestrength without .active
  assert.doesNotMatch(
    cssContent,
    /body\s+#relativestrength\.rs-workspace-active\s*\{[^}]*display:\s*block/s,
    'Não deve haver display: block sem a classe .active em #relativestrength'
  );
});

test('Força Relativa: botão "Ver análise" direciona para central de análise de ticker com dados carregados', () => {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');

  const jsContent = fs.readFileSync(path.join(__dirname, '../../frontend/relative-strength-v3.js'), 'utf8');

  // Assert openTickerAnalysis definition and table button wiring
  assert.match(jsContent, /function openTickerAnalysis\(ticker\)/, 'Deve definir a função openTickerAnalysis');
  assert.match(jsContent, /window\.openTickerAnalysis\s*=\s*openTickerAnalysis/, 'Deve expor openTickerAnalysis no window');
  assert.match(jsContent, /rs-btn-analysis["'][^>]*onclick=["']window\.openTickerAnalysis/, 'Botão rs-btn-analysis deve invocar window.openTickerAnalysis');

  // Test execution in isolated VM context
  let navigatedPage = null;
  let navigatedExtra = null;
  let loadedTicker = null;
  let dispatchedEvent = null;

  const mockWindow = {
    go: (page, extra) => {
      navigatedPage = page;
      navigatedExtra = extra;
    },
    loadTickerChart: (ticker) => {
      loadedTicker = ticker;
    },
    dispatchEvent: (event) => {
      dispatchedEvent = event;
    },
    appLanguage: 'pt-BR'
  };

  const context = vm.createContext({
    window: mockWindow,
    document: { readyState: 'complete', addEventListener: () => {} },
    CustomEvent: class {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    setTimeout: () => {}
  });

  vm.runInContext(jsContent, context);

  assert.strictEqual(typeof mockWindow.openTickerAnalysis, 'function', 'openTickerAnalysis deve ser uma função no window');

  // Invoke with MGLU3
  mockWindow.openTickerAnalysis('mglu3');

  assert.strictEqual(mockWindow.__pendingChartsTicker, 'MGLU3', '__pendingChartsTicker deve receber MGLU3 em maiúsculas');
  assert.strictEqual(navigatedPage, 'charts', 'Navegação deve ter como destino a tela charts');
  assert.strictEqual(navigatedExtra, 'MGLU3', 'Parâmetro de navegação deve ser MGLU3');
  assert.strictEqual(loadedTicker, 'MGLU3', 'loadTickerChart deve ser chamado com MGLU3');
  assert.ok(dispatchedEvent, 'Evento healthyTrend:navigate deve ser disparado');
  assert.strictEqual(dispatchedEvent.detail.page, 'charts');
  assert.strictEqual(dispatchedEvent.detail.ticker, 'MGLU3');
});



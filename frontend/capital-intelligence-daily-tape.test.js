const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const ciJs = fs.readFileSync(path.join(__dirname, 'capital-intelligence.js'), 'utf8');
const ciCss = fs.readFileSync(path.join(__dirname, 'capital-intelligence.css'), 'utf8');
const CapitalIntelligenceModel = require('./capital-intelligence-model.js');

test('Feature 13 — Frontend Model: getDailyTapeItems expõe metadados de mercado e calendários distintos', () => {
  const model = new CapitalIntelligenceModel();

  const mockSnapshot = {
    generatedAt: '2026-11-24T18:00:00Z',
    dailyTapeSecondary: [
      { symbol: 'IBOV', label: 'IBOV', market: 'BR', flag: '🇧🇷', calendar: 'B3 (São Paulo)', closeValue: 128450, change1dPct: 0.45, asOfDate: '2026-11-24', status: 'atualizado' },
      { symbol: 'SPX', label: 'S&P 500', market: 'US', flag: '🇺🇸', calendar: 'NYSE (New York)', closeValue: 5850.2, change1dPct: -0.32, asOfDate: '2026-11-24', status: 'atualizado' },
      { symbol: 'NDX', label: 'Nasdaq', market: 'US', flag: '🇺🇸', calendar: 'NASDAQ (New York)', closeValue: 18200.5, change1dPct: -0.55, asOfDate: '2026-11-24', status: 'atualizado' },
      { symbol: 'USD', label: 'Dólar PTAX', market: 'BR', flag: '🇧🇷', calendar: 'Banco Central (BRL)', closeValue: 5.75, change1dPct: 0.12, asOfDate: '2026-11-24', status: 'atualizado' },
      { symbol: 'GOLD', label: 'Ouro (GLD)', market: 'US', flag: '🇺🇸', calendar: 'NYSE Arca (USD)', closeValue: 2650.0, change1dPct: 0.85, asOfDate: '2026-11-24', status: 'atualizado' },
      { symbol: 'VIX', label: 'VIX', market: 'US', flag: '🇺🇸', calendar: 'CBOE (New York)', closeValue: 15.4, change1dPct: -1.2, asOfDate: '2026-11-24', status: 'atualizado' }
    ]
  };

  model.hydrateFromPipelineSnapshot(mockSnapshot);
  const items = model.getDailyTapeItems();

  assert.equal(items.length, 6);
  const ibov = items.find(i => i.symbol === 'IBOV');
  assert.equal(ibov.market, 'BR');
  assert.equal(ibov.flag, '🇧🇷');
  assert.equal(ibov.asOfDate, '2026-11-24');
  assert.equal(ibov.changePct, 0.45);

  const spx = items.find(i => i.symbol === 'SPX');
  assert.equal(spx.market, 'US');
  assert.equal(spx.flag, '🇺🇸');
  assert.equal(spx.changePct, -0.32);
});

test('Feature 13 — UI Controller & CSS: faixa compacta no rodapé sem competir com o mapa de 21 pregões', () => {
  // 1. Faixa no rodapé
  assert.ok(ciJs.includes('ciDailyFooterStrip'), 'Container do rodapé obrigatório');
  assert.ok(ciJs.includes('ci-daily-guard-badge'), 'Badge informativo de não alteração de ciclos');
  assert.ok(ciJs.includes('Informativo · Não altera ciclos'), 'Texto explícito de salvaguarda');
  assert.ok(ciJs.includes('ci-daily-date-tag'), 'Tag de data de pregão por benchmark');
  assert.ok(ciJs.includes('ci-daily-capture-meta'), 'Metadados de captura e horário');

  // 2. CSS da faixa secundária
  assert.ok(ciCss.includes('.ci-daily-footer-strip'), 'Estilo do container de rodapé');
  assert.ok(ciCss.includes('.ci-daily-guard-badge'), 'Estilo do badge de salvaguarda');
  assert.ok(ciCss.includes('.ci-daily-date-tag'), 'Estilo da tag de data de pregão');
  assert.ok(ciCss.includes('.ci-daily-capture-meta'), 'Estilo dos metadados de captura');
  assert.ok(ciCss.includes('.ci-daily-delta.is-pos'), 'Estilo de variação positiva');
  assert.ok(ciCss.includes('.ci-daily-delta.is-neg'), 'Estilo de variação negativa');
});

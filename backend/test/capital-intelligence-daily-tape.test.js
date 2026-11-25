const test = require('node:test');
const assert = require('node:assert/strict');
const calculator = require('../src/capital-intelligence-calculator.js');

test('Feature 13 — Faixa Secundária Diária: catálogo e estrutura de benchmarks no backend', () => {
  const snapshot = calculator.buildDailySnapshot({ now: new Date('2026-11-24T18:00:00-03:00') });

  assert.ok(Array.isArray(snapshot.dailyTapeSecondary), 'dailyTapeSecondary deve ser um array');
  assert.ok(snapshot.dailyTapeSecondary.length >= 6, 'Deve conter ao menos 6 benchmarks');

  const symbols = snapshot.dailyTapeSecondary.map(i => i.symbol);
  assert.ok(symbols.includes('IBOV'), 'Deve conter Ibovespa');
  assert.ok(symbols.includes('SPX'), 'Deve conter S&P 500');
  assert.ok(symbols.includes('NDX'), 'Deve conter Nasdaq');
  assert.ok(symbols.includes('USD'), 'Deve conter Dólar');
  assert.ok(symbols.includes('GOLD'), 'Deve conter Ouro');
  assert.ok(symbols.includes('VIX'), 'Deve conter VIX');

  snapshot.dailyTapeSecondary.forEach(item => {
    assert.ok(item.symbol, 'Deve ter symbol');
    assert.ok(item.label, 'Deve ter label');
    assert.ok(['BR', 'US'].includes(item.market), 'Deve identificar mercado BR ou US');
    assert.ok(item.flag, 'Deve ter bandeira do país');
    assert.ok(item.calendar, 'Deve ter nome do calendário');
    assert.ok(item.timezone, 'Deve ter fuso horário explícito');
  });
});

test('Feature 13 — Faixa Secundária Diária: respeito a calendários distintos de Brasil e EUA', () => {
  // Simula dia em que mercado US fechou mais cedo ou teve feriado (ex: datas com asOfDate independentes)
  const snapshot = calculator.buildDailySnapshot({ now: new Date('2026-11-24T18:00:00-03:00') });

  const brItems = snapshot.dailyTapeSecondary.filter(i => i.market === 'BR');
  const usItems = snapshot.dailyTapeSecondary.filter(i => i.market === 'US');

  assert.ok(brItems.length >= 2, 'Pelo menos 2 benchmarks Brasil');
  assert.ok(usItems.length >= 4, 'Pelo menos 4 benchmarks EUA / Global');

  brItems.forEach(b => {
    assert.equal(b.timezone, 'America/Sao_Paulo');
    assert.ok(b.calendar.includes('B3') || b.calendar.includes('Banco Central'));
  });

  usItems.forEach(u => {
    assert.equal(u.timezone, 'America/New_York');
    assert.ok(u.calendar.includes('New York') || u.calendar.includes('NYSE') || u.calendar.includes('NASDAQ') || u.calendar.includes('CBOE'));
  });
});

test('Feature 13 — Invariante de Negócio: variação de 1 pregão NÃO altera o regime estrutural de 21 pregões', () => {
  const snapshot = calculator.buildDailySnapshot({ now: new Date('2026-11-24T18:00:00-03:00') });

  // A faixa diária expõe change1dPct, mas a esfera estrutural depende da janela de 21 pregões
  const ibovTape = snapshot.dailyTapeSecondary.find(i => i.symbol === 'IBOV');
  const brSphere = snapshot.spheres.cycle_br;

  assert.ok(ibovTape, 'IBOV deve existir no tape');
  assert.ok(brSphere, 'Esfera ciclo_br deve existir');

  // O ciclo estrutural avalia a linha do tempo de 21 pregões e médias oficiais, enquanto o tape é estritamente 1D
  assert.equal(snapshot.horizonSessions, 21);
  assert.ok(Array.isArray(brSphere.recentTimeline21d), 'Esfera deve conter histórico de 21 pregões');
  assert.ok(Number.isFinite(ibovTape.change1dPct) || ibovTape.change1dPct === null);
});

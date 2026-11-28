'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tickerChartBackend = require('../backend/src/ticker-chart');

test('Visão do Ativo — 1. HTML e templates em ticker-chart.js preservam nomes dos campos e eliminam rótulo genérico Expansão', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'ticker-chart.js'), 'utf8');

  // Nomes dos campos mantidos
  assert.ok(jsContent.includes('Ciclo de Mercado'), 'Campo "Ciclo de Mercado" deve existir');
  assert.ok(jsContent.includes('Estrutura'), 'Campo "Estrutura" deve existir');

  // Não há "Expansão" codificado como rótulo padrão
  assert.ok(!jsContent.includes("regime = 'Expansão'"), 'Não deve atribuir "Expansão" estaticamente ao regime');
  assert.ok(!jsContent.includes("structure = 'Expansão'"), 'Não deve atribuir "Expansão" estaticamente à estrutura');
  assert.ok(!jsContent.includes("label: 'Expansão'"), 'Não deve atribuir "Expansão" estaticamente');

  // Card 5 Estrutura possui setas dinâmicas por status
  assert.ok(
    jsContent.includes("structureStatus === 'bad' ? '▼' : (structureStatus === 'neutral' ? '◆' : '▲')"),
    'Card de Estrutura deve exibir setas direcionais por regime'
  );
});

test('Visão do Ativo — 2. CSS em ticker-chart.css suporta temas e alerta para alta volatilidade', () => {
  const cssContent = fs.readFileSync(path.join(__dirname, 'ticker-chart.css'), 'utf8');

  assert.ok(cssContent.includes('.method-structure-label.alert'), 'CSS deve ter estilo para .method-structure-label.alert');
  assert.ok(cssContent.includes('.structure-arrow.alert'), 'CSS deve ter estilo para .structure-arrow.alert');
  assert.ok(cssContent.includes('.vision-status.good'), 'CSS deve conter .vision-status.good');
  assert.ok(cssContent.includes('.vision-status.alert'), 'CSS deve conter .vision-status.alert');
  assert.ok(cssContent.includes('.vision-status.bad'), 'CSS deve conter .vision-status.bad');
  assert.ok(cssContent.includes('.vision-status.neutral'), 'CSS deve conter .vision-status.neutral');
});

test('Visão do Ativo — 3. TIMS3: Ciclo mostra relação objetiva das médias (Média 10 > Média 30) e Estrutura mostra Up & Volatile', async () => {
  const data = await tickerChartBackend.getTickerChartData('TIMS3');

  // Ciclo de Mercado
  assert.notEqual(data.marketCycle.regime, 'Expansão');
  assert.ok(
    data.marketCycle.regime === 'Média 10 > Média 30' || data.marketCycle.regime === 'Média 10 ≤ Média 30',
    `Ciclo deve ser a relação entre as médias, recebido: ${data.marketCycle.regime}`
  );
  assert.ok(data.marketCycle.description.includes('Média 10'));

  // Estrutura do Ativo
  assert.notEqual(data.structure.label, 'Expansão');
  assert.equal(data.structure.label, 'Alta com alta volatilidade (Up & Volatile)');
  assert.equal(data.structure.regimeCode, 'UP_VOLATILE');
  assert.equal(data.structure.status, 'alert');
  assert.ok(data.structure.description.includes('gráfico Diário'));
});

test('Visão do Ativo — 4. DESK3: Estrutura mostra Alta com baixa volatilidade (Up & Quiet)', async () => {
  const data = await tickerChartBackend.getTickerChartData('DESK3');

  assert.notEqual(data.structure.label, 'Expansão');
  assert.equal(data.structure.label, 'Alta com baixa volatilidade (Up & Quiet)');
  assert.equal(data.structure.regimeCode, 'UP_QUIET');
  assert.equal(data.structure.status, 'good');
});

test('Visão do Ativo — 5. PETR4: Estrutura mostra Baixa com alta volatilidade (Down & Volatile)', async () => {
  const data = await tickerChartBackend.getTickerChartData('PETR4');

  assert.notEqual(data.structure.label, 'Expansão');
  assert.equal(data.structure.label, 'Baixa com alta volatilidade (Down & Volatile)');
  assert.equal(data.structure.regimeCode, 'DOWN_VOLATILE');
  assert.equal(data.structure.status, 'bad');
});

test('Visão do Ativo — 5b. SBSP3: Estrutura mostra Mercado lateral (Sideways)', async () => {
  const data = await tickerChartBackend.getTickerChartData('SBSP3');

  assert.notEqual(data.structure.label, 'Expansão');
  assert.equal(data.structure.label, 'Mercado lateral (Sideways)');
  assert.equal(data.structure.status, 'neutral');
});

test('Visão do Ativo — 6. VALE3: Estrutura mostra Baixa com alta volatilidade (Down & Volatile)', async () => {
  const data = await tickerChartBackend.getTickerChartData('VALE3');

  assert.notEqual(data.structure.label, 'Expansão');
  assert.equal(data.structure.label, 'Baixa com alta volatilidade (Down & Volatile)');
  assert.equal(data.structure.regimeCode, 'DOWN_VOLATILE');
  assert.equal(data.structure.status, 'bad');
});

test('Visão do Ativo — 7. Tabela de Critérios da Rubric nunca contém rótulo genérico Expansão', async () => {
  const assets = ['TIMS3', 'PETR4', 'VALE3', 'SBSP3'];
  for (const sym of assets) {
    const data = await tickerChartBackend.getTickerChartData(sym);
    const cycleCrit = data.rubric.criteria.find(c => c.name === 'Ciclo de Mercado');
    const structCrit = data.rubric.criteria.find(c => c.name === 'Estrutura');

    assert.ok(cycleCrit);
    assert.ok(structCrit);

    assert.notEqual(cycleCrit.obs, 'Expansão', `Ciclo em ${sym} não deve ser "Expansão"`);
    assert.notEqual(structCrit.obs, 'Expansão', `Estrutura em ${sym} não deve ser "Expansão"`);

    assert.ok(
      cycleCrit.obs === 'Média 10 > Média 30' || cycleCrit.obs === 'Média 10 ≤ Média 30' || cycleCrit.obs === 'Dados insuficientes',
      `Observação do ciclo deve ser a relação de médias, recebido: ${cycleCrit.obs}`
    );
  }
});

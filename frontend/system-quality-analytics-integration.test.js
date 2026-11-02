/**
 * Testes de Integração — System Quality Analytics (SQN)
 * Valida a renderização dos componentes, cards de governança, simulador e não-interferência de risco.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const sqnModel = require('./system-quality-analytics-model');
const sqnView = require('./system-quality-analytics');
const tradeSimulatorModel = require('./trade-simulator-model');

test('SystemQualityAnalytics: renderEvolutionSvg gera elementos SVG válidos para histórico', () => {
  const rList = [1.5, -1.0, 2.0, -0.8, 2.5, 1.2, -1.0, 3.0, 1.0, -1.0];
  const evolution = sqnModel.calculateSQNEvolution(rList);
  assert.ok(evolution.length >= 2);

  const svg = sqnView.renderEvolutionSvg(evolution);
  assert.ok(svg.includes('<svg class="sqn-evolution-svg"'));
  assert.ok(svg.includes('class="sqn-chart-path-line"'));
  assert.ok(svg.includes('class="sqn-chart-area-fill"'));
  assert.ok(svg.includes('1,6 (Mínimo)'));
  assert.ok(svg.includes('3,0 (Excelente)'));
});

test('SystemQualityAnalytics: renderScaleBarMarkup destaca o segmento correto da escala Van Tharp', () => {
  const markupPoor = sqnView.renderScaleBarMarkup(1.2);
  assert.ok(markupPoor.includes('seg-poor active'));

  const markupGood = sqnView.renderScaleBarMarkup(2.8);
  assert.ok(markupGood.includes('seg-good active'));

  const markupExcep = sqnView.renderScaleBarMarkup(6.36);
  assert.ok(markupExcep.includes('seg-excep active'));
});

test('SystemQualityAnalytics: generateSectionHtml produz todos os cards obrigatórios', () => {
  const rList = [2.0, -1.0, 2.0, -1.0, 1.5, 2.5, -1.0, 2.0, 1.8, -1.0];
  const html = sqnView.generateSectionHtml(rList);

  assert.ok(html.includes('System Quality Analytics (SQN)'));
  assert.ok(html.includes('Expectancy Matemática (R)'));
  assert.ok(html.includes('Desvio-Padrão Amostral (s)'));
  assert.ok(html.includes('Trades Analisados (N)'));
  assert.ok(html.includes('Evolução Acumulada da Qualidade Estatística (Rolling SQN)'));
  assert.ok(html.includes('O que o SQN revela sobre o seu trading?'));
});

test('SystemQualityAnalytics: generateRiskPolicyCardHtml reforça governança não-interferente', () => {
  const rList = [2.0, -1.0, 2.0];
  const html = sqnView.generateRiskPolicyCardHtml(rList);

  assert.ok(html.includes('id="riskPolicySqnCard"'));
  assert.ok(html.includes('Diretriz de Risco:'));
  assert.ok(html.includes('não altera automaticamente'));
  assert.ok(html.includes('Risk Budget por Grade'));
});

test('SystemQualityAnalytics: integração com TradeSimulatorModel.calculateSimulatorStats', () => {
  const seeds = tradeSimulatorModel.getDefaultSeedSimulations();
  const stats = tradeSimulatorModel.calculateSimulatorStats(seeds);

  assert.ok(stats.sqnAnalytics !== null);
  assert.ok(typeof stats.sqn === 'number');
  assert.ok(typeof stats.sqnFormatted === 'string');
  assert.ok(stats.sqnClassification !== null);
  assert.ok(stats.sqnClassification.label.length > 0);
  assert.ok(stats.standardDeviationR > 0);
  assert.ok(Array.isArray(stats.sqnEvolution));
  assert.ok(stats.sqnEvolution.length > 0);

  // Card do simulador
  const simCard = sqnView.generateSimulatorSqnCardHtml(stats);
  assert.ok(simCard.includes('System Quality Analytics (SQN)'));
  assert.ok(simCard.includes('Expectancy ÷ Desvio-Padrão'));
});

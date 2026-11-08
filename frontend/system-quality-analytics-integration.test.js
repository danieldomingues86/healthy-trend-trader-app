/**
 * Testes de Integração — System Quality Analytics (SQN)
 * Valida a renderização dos componentes, cards de governança, simulador e não-interferência de risco.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sqnModel = require('./system-quality-analytics-model');
const sqnView = require('./system-quality-analytics');
const tradeSimulatorModel = require('./trade-simulator-model');

test('SystemQualityAnalytics: renderEvolutionSvg gera elementos SVG válidos com largura expandida e sem corte de labels', () => {
  const rList = [1.5, -1.0, 2.0, -0.8, 2.5, 1.2, -1.0, 3.0, 1.0, -1.0];
  const evolution = sqnModel.calculateSQNEvolution(rList);
  assert.ok(evolution.length >= 2);

  const svg = sqnView.renderEvolutionSvg(evolution);
  assert.ok(svg.includes('<svg class="sqn-evolution-svg"'));
  assert.ok(svg.includes('viewBox="0 0 920 240"'), 'SVG deve ter viewBox ampla (920px) para acomodar rótulos sem corte');
  assert.ok(svg.includes('class="sqn-chart-path-line"'));
  assert.ok(svg.includes('class="sqn-chart-area-fill"'));
  assert.ok(svg.includes('5,0 (Excepcional)'), 'Deve conter rótulo Van Tharp 5.0');
  assert.ok(svg.includes('3,0 (Excelente)'), 'Deve conter rótulo Van Tharp 3.0');
  assert.ok(svg.includes('2,0 (Mediano)'), 'Deve conter rótulo Van Tharp 2.0');
  assert.ok(svg.includes('1,6 (Mínimo)'), 'Deve conter rótulo Van Tharp 1.6');
});

test('SystemQualityAnalytics: renderRDistributionChartSvg gera histograma de 7 faixas', () => {
  const rList = [-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5];
  const report = sqnModel.calculateSystemQualityAnalytics(rList);
  assert.ok(report.rDistribution);

  const svg = sqnView.renderRDistributionChartSvg(report.rDistribution);
  assert.ok(svg.includes('<svg class="sqn-distribution-svg"'));
  assert.ok(svg.includes('< -2R'));
  assert.ok(svg.includes('≥ +3R'));
  assert.ok(svg.includes('class="sqn-dist-bar-group"'));
});

test('SystemQualityAnalytics: renderScaleBarMarkup destaca o segmento correto da escala Van Tharp', () => {
  const markupPoor = sqnView.renderScaleBarMarkup(1.2);
  assert.ok(markupPoor.includes('seg-poor active'));

  const markupGood = sqnView.renderScaleBarMarkup(2.8);
  assert.ok(markupGood.includes('seg-good active'));

  const markupExcep = sqnView.renderScaleBarMarkup(6.36);
  assert.ok(markupExcep.includes('seg-excep active'));
});

test('SystemQualityAnalytics: generateSystemQualityPageHtml produz a tela completa com todos os módulos', () => {
  const rList = [2.0, -1.0, 2.0, -1.0, 1.5, 2.5, -1.0, 2.0, 1.8, -1.0, 3.5, -0.5];
  const report = sqnModel.calculateSystemQualityAnalytics(rList);
  const html = sqnView.generateSystemQualityPageHtml(report, 'all');

  // Hero e toolbar
  assert.ok(html.includes('Qualidade Estatística') && html.includes('do Sistema'));
  assert.ok(html.includes('data-sqn-period="all"'));
  assert.ok(html.includes('data-sqn-period="30"'));
  assert.ok(html.includes('data-sqn-period="90"'));
  assert.ok(html.includes('data-sqn-period="365"'));

  // 4 KPIs principais
  assert.ok(html.includes('System Quality Number (SQN)'));
  assert.ok(html.includes('Expectancy Matemática'));
  assert.ok(html.includes('Desvio-Padrão Amostral'));
  assert.ok(html.includes('Trades Analisados'));

  // Distribuição de R
  assert.ok(html.includes('Distribuição dos R-Múltiplos'));
  assert.ok(html.includes('R Médio Geral'));
  assert.ok(html.includes('R Médio Vencedores'));
  assert.ok(html.includes('R Médio Perdedores'));
  assert.ok(html.includes('sqn-distribution-svg'));

  // Rolling SQN e Guia Educativo
  assert.ok(html.includes('Evolução Acumulada da Qualidade Estatística (Rolling SQN)'));
  assert.ok(html.includes('Como o SQN avalia o sistema'));
  assert.ok(html.includes('Confiabilidade da Amostra (N)'));
});

test('SystemQualityAnalytics: generateTruthPanelAccessCardHtml produz card executivo de acesso', () => {
  const rList = [2.0, -1.0, 2.0, 1.5];
  const report = sqnModel.calculateSystemQualityAnalytics(rList);
  const card = sqnView.generateTruthPanelAccessCardHtml(report);

  assert.ok(card.includes('id="truthSystemQualityAccessCard"'));
  assert.ok(card.includes('truth-sqn-access-btn'));
  assert.ok(card.includes("go('systemquality')"));
  assert.ok(card.includes('Explorar Qualidade Estatística'));
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
  assert.ok(simCard.includes('SQN da Simulação'));
  assert.ok(simCard.includes('Expectancy ÷ Desvio-Padrão'));
  assert.ok(simCard.includes('sim-sqn-subcard-split'), 'Subcard 1 deve utilizar layout dividido com espaço amplo para a régua');
  assert.ok(simCard.includes('sim-sqn-scale-col'), 'Régua Van Tharp deve ocupar coluna dedicada à direita');
  assert.ok(simCard.includes('sqn-lbl-poor'), 'Labels da régua devem possuir classes dedicadas por faixa');
  assert.ok(simCard.includes('sqn-lbl-excep'), 'Faixa excepcional deve ter classe dedicada');
});

test('TradeAnatomy: código fonte de frontend/trade-anatomy.js não renderiza SQN', () => {
  const js = fs.readFileSync(path.join(__dirname, 'trade-anatomy.js'), 'utf8');
  assert.ok(!js.includes("summaryMetric('SQN'"), 'trade-anatomy.js não deve conter métrica SQN no resumo');
  assert.ok(!js.includes('SystemQualityAnalytics.generateSectionHtml'), 'trade-anatomy.js não deve injetar seção de SQN');
});

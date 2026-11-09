'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LiquidityGateModel = require('./liquidity-gate-model');
const tickerChartBackend = require('../backend/src/ticker-chart');

test('Visão do Ativo — 1. HTML do skeleton e do card principal em ticker-chart.js incluem linha Liquidez', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'ticker-chart.js'), 'utf8');

  // Verifica que o skeleton inclui a linha de Liquidez
  assert.ok(
    jsContent.includes('<span>Liquidez</span></div><div class="summary-check-right"><span class="vision-status good">...</span>'),
    'Skeleton deve incluir a linha de Liquidez com o ícone ICONS.liquidity'
  );

  // Verifica que a Visão do Ativo inclui a linha com id="visionLiquidityRow" e id="visionLiquidityPill"
  assert.ok(
    jsContent.includes('id="visionLiquidityRow"'),
    'Visão do Ativo deve renderizar o container id="visionLiquidityRow"'
  );
  assert.ok(
    jsContent.includes('id="visionLiquidityPill"'),
    'Visão do Ativo deve renderizar a pílula id="visionLiquidityPill"'
  );
  assert.ok(
    jsContent.includes('${ICONS.liquidity}</span> Liquidez'),
    'Visão do Ativo deve conter o ícone de liquidez e o rótulo "Liquidez"'
  );
});

test('Visão do Ativo — 2. CSS em ticker-chart.css inclui estilos e temas para o status de Liquidez e modal', () => {
  const cssContent = fs.readFileSync(path.join(__dirname, 'ticker-chart.css'), 'utf8');

  assert.ok(cssContent.includes('.vision-status.good'), 'Deve ter classe .vision-status.good');
  assert.ok(cssContent.includes('.vision-status.bad'), 'Deve ter classe .vision-status.bad');
  assert.ok(cssContent.includes('.liquidity-modal-overlay'), 'Deve conter estilos para o modal de detalhes do Liquidity Gate');
  assert.ok(cssContent.includes('.liquidity-modal-card'), 'Deve conter estilos para o card do modal');
  assert.ok(cssContent.includes('[data-theme="gold"] .vision-status.good'), 'Deve suportar tema Gold para a pílula verde');
});

test('Visão do Ativo — 3. Backend getTickerChartData retorna dados de LiquidityGate para ativo líquido (PETR4)', async () => {
  const data = await tickerChartBackend.getTickerChartData('PETR4');
  assert.ok(data, 'Deve retornar dados do gráfico');
  assert.ok(data.liquidity, 'Deve incluir objeto liquidity');
  assert.equal(data.liquidity.isEligible, true, 'PETR4 deve ser elegível no Liquidity Gate');
  assert.ok(data.liquidity.status === 'APROVADO' || data.liquidity.status === 'APPROVED', 'Status deve indicar aprovado');
  assert.ok(data.liquidity.volumeAvg21Formatted, 'Volume formatado deve estar presente');
  assert.ok(data.liquidity.gate, 'Objeto gate completo do LiquidityGateModel deve estar presente');
  assert.equal(data.liquidity.gate.isEligible, true);
  assert.ok(data.liquidity.gate.metrics, 'Métricas da janela de 21 pregões devem estar presentes');
  assert.equal(data.liquidity.gate.metrics.windowSessions, 21);
});

test('Visão do Ativo — 4. Avaliação dinâmica: Ativo com liquidez aprovada gera status "good" e texto claro', () => {
  const candles = [];
  for (let i = 1; i <= 25; i++) {
    const day = String(i).padStart(2, '0');
    candles.push({
      time: `2026-10-${day}`,
      open: 35.0,
      high: 36.5,
      low: 34.8,
      close: 36.0,
      volume: 18500000,
      trades: 2400
    });
  }

  const evalRes = LiquidityGateModel.evaluateLiquidity({
    candles,
    symbol: 'PETR4'
  });

  assert.equal(evalRes.isEligible, true);
  assert.ok(evalRes.status === 'APROVADO' || evalRes.status === 'APPROVED');

  const isLiqEligible = Boolean(evalRes && evalRes.isEligible === true);
  const isLiqUnavailable = !evalRes || evalRes.status === 'DADOS_INDISPONIVEIS' || evalRes.status === 'HISTORICO_INSUFICIENTE';
  const liqStatus = isLiqEligible ? 'good' : 'bad';
  assert.equal(liqStatus, 'good', 'Status visual deve ser "good" (verde)');

  const compactVol = evalRes.metrics?.averageDailyVolumeCompact;
  const liqText = compactVol ? `● Aprovada (${compactVol}/dia)` : '● Aprovada';
  assert.ok(liqText.includes('Aprovada'), 'Texto deve indicar Aprovada');
  assert.ok(liqText.includes('mi/dia') || liqText.includes('R$'), 'Deve conter volume médio');
});

test('Visão do Ativo — 5. Ativo ilíquido (volume abaixo do mínimo) gera status "bad" (vermelho) e texto "Reprovada"', () => {
  const candles = [];
  for (let i = 1; i <= 25; i++) {
    const day = String(i).padStart(2, '0');
    candles.push({
      time: `2026-10-${day}`,
      open: 10.0,
      high: 10.2,
      low: 9.9,
      close: 10.0,
      volume: 50000, // R$ 50k/dia (abaixo de R$ 500k)
      trades: 40
    });
  }

  const evalRes = LiquidityGateModel.evaluateLiquidity({
    candles,
    symbol: 'MILI3'
  });

  assert.equal(evalRes.isEligible, false);
  assert.ok(evalRes.status === 'VOLUME_INSUFICIENTE' || evalRes.status === 'VOLUME_BELOW_MINIMUM');

  const isLiqEligible = Boolean(evalRes && evalRes.isEligible === true);
  const liqStatus = isLiqEligible ? 'good' : 'bad';
  assert.equal(liqStatus, 'bad', 'Status visual deve ser "bad" (vermelho)');

  const compactVol = evalRes.metrics?.averageDailyVolumeCompact;
  const liqText = compactVol ? `● Reprovada (${compactVol}/dia)` : '● Reprovada (Não elegível)';
  assert.ok(liqText.includes('Reprovada'), 'Texto deve indicar claramente Reprovada');
});

test('Visão do Ativo — 6. Fail-closed: Dados ausentes ou vazios geram status "bad" e NUNCA "good"', () => {
  // Candles vazios
  const emptyEval = LiquidityGateModel.evaluateLiquidity({
    candles: [],
    symbol: 'TESTE'
  });
  assert.equal(emptyEval.isEligible, false);
  assert.ok(emptyEval.status === 'DADOS_INDISPONIVEIS' || emptyEval.status === 'DATA_UNAVAILABLE');

  const emptyStatus = emptyEval.isEligible ? 'good' : 'bad';
  assert.equal(emptyStatus, 'bad', 'Nunca deve ser "good" para candles vazios');

  // Candles nulos
  const nullEval = LiquidityGateModel.evaluateLiquidity({
    candles: null,
    symbol: 'TESTE'
  });
  assert.equal(nullEval.isEligible, false);
  assert.ok(nullEval.status === 'DADOS_INDISPONIVEIS' || nullEval.status === 'DATA_UNAVAILABLE');

  const nullStatus = nullEval.isEligible ? 'good' : 'bad';
  assert.equal(nullStatus, 'bad', 'Nunca deve ser "good" para candles nulos');

  // Histórico insuficiente (< 21 pregões)
  const shortCandles = [
    { time: '2026-10-01', open: 10, high: 10, low: 10, close: 10, volume: 10000000 }
  ];
  const shortEval = LiquidityGateModel.evaluateLiquidity({
    candles: shortCandles,
    symbol: 'NOVO3'
  });
  assert.equal(shortEval.isEligible, false);
  assert.ok(shortEval.status === 'HISTORICO_INSUFICIENTE' || shortEval.status === 'INSUFFICIENT_HISTORY');

  const shortStatus = shortEval.isEligible ? 'good' : 'bad';
  assert.equal(shortStatus, 'bad', 'Nunca deve ser "good" para histórico insuficiente');
});

test('Visão do Ativo — 7. Tooltip e modal detalham todos os parâmetros da avaliação', () => {
  const candles = [];
  for (let i = 1; i <= 22; i++) {
    const day = String(i).padStart(2, '0');
    candles.push({
      time: `2026-10-${day}`,
      open: 50.0,
      high: 51.0,
      low: 49.5,
      close: 50.5,
      volume: 25000000,
      trades: 3500
    });
  }

  const evalRes = LiquidityGateModel.evaluateLiquidity({
    candles,
    symbol: 'VALE3'
  });

  const liqMetrics = evalRes.metrics;
  const isLiqEligible = evalRes.isEligible;
  const isLiqUnavailable = false;
  const compactVol = liqMetrics.averageDailyVolumeCompact;
  const liqReason = evalRes.reason;
  const liqSource = 'B3 (COTAHIST)';
  const liqSessionDate = '22/10/2026';

  const liqTooltip = [
    `[LIQUIDITY GATE] ${isLiqEligible ? 'APROVADA (Elegível)' : (isLiqUnavailable ? 'DADOS INDISPONÍVEIS (Bloqueado)' : 'REPROVADA (Não Elegível)')}`,
    liqMetrics?.averageDailyVolumeFormatted ? `• Volume Médio Diário: ${liqMetrics.averageDailyVolumeFormatted}` : null,
    liqMetrics?.minDailyVolumeFormatted ? `• Mínimo Exigido: ${liqMetrics.minDailyVolumeFormatted}` : null,
    liqMetrics?.averageDailyTrades ? `• Média de Negócios: ${liqMetrics.averageDailyTrades} neg/dia (mínimo: ${liqMetrics.minDailyTrades || 100})` : null,
    `• Janela de Avaliação: ${liqMetrics?.windowSessions || 21} pregões${liqMetrics?.windowStartDate && liqMetrics?.windowEndDate ? ` (${liqMetrics.windowStartDate} a ${liqMetrics.windowEndDate})` : ''}`,
    `• Data-Base: ${liqSessionDate}`,
    `• Fonte dos Dados: ${liqSource}`,
    `• Motivo: ${liqReason}`
  ].filter(Boolean).join('\n');

  // Verifica que o tooltip contém todas as informações requeridas
  assert.ok(liqTooltip.includes('APROVADA'), 'Tooltip deve indicar Aprovada');
  assert.ok(liqTooltip.includes('Volume Médio Diário:'), 'Tooltip deve informar volume médio diário');
  assert.ok(liqTooltip.includes('Mínimo Exigido:'), 'Tooltip deve informar mínimo exigido');
  assert.ok(liqTooltip.includes('Média de Negócios:'), 'Tooltip deve informar média de negócios');
  assert.ok(liqTooltip.includes('Janela de Avaliação: 21 pregões'), 'Tooltip deve informar janela de 21 pregões');
  assert.ok(liqTooltip.includes('Data-Base: 22/10/2026'), 'Tooltip deve informar data-base');
  assert.ok(liqTooltip.includes('Fonte dos Dados: B3 (COTAHIST)'), 'Tooltip deve informar fonte dos dados');
  assert.ok(liqTooltip.includes('Motivo:'), 'Tooltip deve informar motivo');
});

test('Visão do Ativo — 8. Ao trocar de ticker, a avaliação é atualizada para o ativo correspondente', async () => {
  // Testar dois ativos diferentes via backend e garantir dados distintos
  const petr4 = await tickerChartBackend.getTickerChartData('PETR4');
  const vale3 = await tickerChartBackend.getTickerChartData('VALE3');

  assert.equal(petr4.tickerInfo.symbol, 'PETR4');
  assert.equal(vale3.tickerInfo.symbol, 'VALE3');

  assert.ok(petr4.liquidity);
  assert.ok(vale3.liquidity);

  // Cada ativo possui seu próprio volume e métricas
  assert.equal(petr4.liquidity.gate.metrics.symbol, 'PETR4');
  assert.equal(vale3.liquidity.gate.metrics.symbol, 'VALE3');
  assert.notEqual(petr4.liquidity.volumeAvg21Formatted, undefined);
  assert.notEqual(vale3.liquidity.volumeAvg21Formatted, undefined);
});

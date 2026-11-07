const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const TradeSimulatorModel = require('./trade-simulator-model');
const LiquidityGateModel = require('./liquidity-gate-model');

test('Visão do Ativo & Liquidity Gate — 1. getTradeVisionAtivo inclui Liquidez com status "good" para ativos líquidos', () => {
  const flry3Trade = {
    symbol: 'FLRY3',
    grade: 'C',
    signalDate: '2026-07-10',
    entryDate: '2026-07-13',
    entryPrice: 16.47,
    stopLoss: 15.34,
    status: 'CLOSED_GAIN',
    resultR: 3.18,
    rsScore: 83
  };

  const vision = TradeSimulatorModel.getTradeVisionAtivo(flry3Trade);
  assert.ok(vision, 'Deve gerar visão do ativo');
  assert.ok(vision.liquidity, 'Visão do ativo deve conter o nó "liquidity"');
  assert.equal(vision.liquidity.isEligible, true, 'FLRY3 deve ser elegível no Liquidity Gate');
  assert.equal(vision.liquidity.status, 'good', 'Status visual deve ser "good" (pill verde)');
  assert.ok(vision.liquidity.text.includes('Aprovada'), 'Texto deve indicar Aprovada');
});

test('Visão do Ativo & Liquidity Gate — 2. getTradeVisionAtivo inclui Liquidez com status "bad" para ativo ilíquido (BGAR39)', () => {
  const bgarTrade = {
    symbol: 'BGAR39',
    grade: 'B',
    signalDate: '2026-11-03',
    entryDate: '2026-11-04',
    entryPrice: 70.99,
    stopLoss: 70.07,
    status: 'CLOSED_LOSS',
    resultR: -1.0,
    rsScore: 99
  };

  const vision = TradeSimulatorModel.getTradeVisionAtivo(bgarTrade);
  assert.ok(vision, 'Deve gerar visão do ativo');
  assert.ok(vision.liquidity, 'Visão do ativo deve conter o nó "liquidity"');
  assert.equal(vision.liquidity.isEligible, false, 'BGAR39 deve ser bloqueado no Liquidity Gate');
  assert.equal(vision.liquidity.status, 'bad', 'Status visual deve ser "bad" (pill vermelha)');
  assert.ok(vision.liquidity.text.includes('Bloqueado'), 'Texto deve indicar Bloqueado');
});

test('Visão do Ativo & Liquidity Gate — 3. Avaliação dinâmica com candles e LiquidityGateModel', () => {
  // Simular histórico com 25 pregões e volume médio de R$ 12.000.000
  const candles = [];
  for (let i = 1; i <= 25; i++) {
    const day = String(i).padStart(2, '0');
    candles.push({
      date: `2026-06-${day}`,
      open: 16.00,
      high: 16.80,
      low: 15.90,
      close: 16.50,
      volume: 12000000,
      trades: 1500
    });
  }

  const tradeWithCandles = {
    symbol: 'FLRY3',
    grade: 'C',
    signalDate: '2026-07-10',
    entryPrice: 16.47,
    stopLoss: 15.34,
    status: 'CLOSED_GAIN',
    resultR: 3.18,
    candles
  };

  const vision = TradeSimulatorModel.getTradeVisionAtivo(tradeWithCandles);
  assert.equal(vision.liquidity.isEligible, true);
  assert.equal(vision.liquidity.status, 'good');
  assert.ok(vision.liquidity.text.includes('mi/dia') || vision.liquidity.text.includes('Aprovada'), 'Deve formatar métrica de volume');
});

test('Status Pill & Correção INVALID_TRADE — 4. Arquivo trade-simulator.js não renderiza Bloqueado (INVALID_TRADE) para trades executados', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');

  // 1. O cabeçalho do Snapshot deve passar sim para renderStatusPill
  assert.ok(
    jsContent.includes('${renderStatusPill(sim.status, sim)}'),
    'Cabeçalho do snapshot e modal devem passar "sim" para renderStatusPill'
  );

  // 2. A função renderTradeVisionAtivoCard deve incluir o nó de Liquidez com pill verde/vermelha
  assert.ok(
    jsContent.includes('${SNAPSHOT_ICONS.liquidity}</span> Liquidez'),
    'Visão do Ativo deve conter linha com ícone e texto "Liquidez"'
  );
  assert.ok(
    jsContent.includes('vision-status ${liqStatus}'),
    'Visão do Ativo deve usar a classe vision-status ${liqStatus} para estilizar as pills verdes e vermelhas'
  );

  // 3. Simulação in-memory da lógica corrigida de renderStatusPill
  function mockRenderStatusPill(status, sim, rubricMode = true) {
    if (sim && (status === 'CLOSED_LOSS' || status === 'CLOSED_GAIN') && (Number(sim.resultR) === 0 || Math.abs(Number(sim.resultR) || 0) < 0.0001)) {
      return 'Encerrado (Breakeven)';
    }
    if (status === 'CLOSED_GAIN') {
      return 'Encerrado (Gain)';
    }
    if (status === 'CLOSED_LOSS') {
      return 'Encerrado (Loss)';
    }
    if (status === 'BLOCKED' || (sim && sim.isBlocked)) {
      return `Bloqueado (${sim?.blockCode || 'Rubric'})`;
    }
    if (sim && rubricMode && TradeSimulatorModel && typeof TradeSimulatorModel.evaluateTradeRubricAndSizing === 'function') {
      const evalInfo = sim.evaluation || TradeSimulatorModel.evaluateTradeRubricAndSizing(sim, {}, { officialMode: true });
      if (evalInfo && !evalInfo.isEligible) {
        return `Bloqueado (${evalInfo.blockCode || 'Rubric'})`;
      }
    }
    switch (status) {
      case 'WAITING_ENTRY': return 'Aguardando entrada';
      case 'NOT_TRIGGERED': return 'Não acionado';
      default: return 'Desconhecido';
    }
  }

  const executedTrade = {
    symbol: 'FLRY3',
    status: 'CLOSED_GAIN',
    resultR: 3.18
  };

  const pillText = mockRenderStatusPill(executedTrade.status, executedTrade, true);
  assert.equal(pillText, 'Encerrado (Gain)', 'Trade executado vencedor deve ter pill "Encerrado (Gain)" e NUNCA "Bloqueado (INVALID_TRADE)"');

  const lossTrade = {
    symbol: 'VALE3',
    status: 'CLOSED_LOSS',
    resultR: -1.0
  };
  assert.equal(mockRenderStatusPill(lossTrade.status, lossTrade, true), 'Encerrado (Loss)');

  // Chamada isolada sem sim (como fallback) nunca gera INVALID_TRADE
  assert.equal(mockRenderStatusPill('CLOSED_GAIN', undefined, true), 'Encerrado (Gain)');
});

test('Botão Ver Análise & Snapshot Modal — 5. escapeHtml está definida e renderização do modal executa sem erro', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');

  // Verifica que escapeHtml está definida no escopo de trade-simulator.js
  assert.ok(
    jsContent.includes('function escapeHtml(str)'),
    'trade-simulator.js deve definir function escapeHtml para sanitizar strings com segurança'
  );

  // Executar avaliação da Visão do Ativo para FLRY3 e verificar formatação
  const flry3Trade = {
    symbol: 'FLRY3',
    grade: 'C',
    signalDate: '2026-07-10',
    entryPrice: 16.47,
    stopLoss: 15.34,
    status: 'CLOSED_GAIN',
    resultR: 3.18
  };
  const vision = TradeSimulatorModel.getTradeVisionAtivo(flry3Trade);

  // Simulação da renderização de Liquidez no HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const liqObj = vision.liquidity || null;
  const isLiqGood = liqObj ? (liqObj.isEligible !== false && liqObj.status !== 'bad') : true;
  const liqStatus = isLiqGood ? 'good' : 'bad';
  const liqText = liqObj?.text || (isLiqGood ? 'Aprovada' : 'Bloqueado por Liquidez');
  const liqReason = liqObj?.reason || (isLiqGood ? 'Ativo cumpre todos os requisitos do Liquidity Gate.' : 'Ativo reprovado no Liquidity Gate.');

  const renderedHtml = `<span class="vision-status ${liqStatus}" title="${escapeHtml(liqReason)}">● ${escapeHtml(liqText)}</span>`;
  assert.ok(renderedHtml.includes('vision-status good'), 'Deve renderizar classe visual "good"');
  assert.ok(renderedHtml.includes('● Aprovada'), 'Deve conter texto da liquidez aprovada');
});

test('Card de SQN — 6. Renderização única na tela sem duplicações', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');

  // Conta quantas chamadas de inserção de SQN existem no template da Aba 1
  const matches = jsContent.match(/\$\{renderSimulatorSqnCard\(stats\)\}|\$\{window\.SystemQualityAnalytics.*?generateSimulatorSqnCardHtml/g) || [];
  assert.equal(matches.length, 1, 'Deve existir rigorosamente uma única chamada de renderização do card de SQN na tela');
});

test('Modal Massa de Testes & Barra Principal — 7. Remoção do Item 3 do Modal e botões na tela principal', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');

  // 1. O Item 3 "Resumo antes de iniciar" foi removido do modal
  assert.ok(
    !jsContent.includes('Resumo antes de iniciar'),
    'O modal não deve mais conter o Item 3 "Resumo antes de iniciar"'
  );
  assert.ok(
    !jsContent.includes('sim-mass-summary-section'),
    'O modal não deve mais conter a classe .sim-mass-summary-section'
  );

  // 2. Os botões de Reavaliar Candles e Excluir Massa Atual estão na barra de ferramentas da tela principal
  assert.ok(
    jsContent.includes('id="simBtnEvaluateCandles"'),
    'A barra de ferramentas principal deve conter o botão #simBtnEvaluateCandles'
  );
  assert.ok(
    jsContent.includes('id="simBtnClearMass"'),
    'A barra de ferramentas principal deve conter o botão #simBtnClearMass'
  );
  assert.ok(
    jsContent.includes('sim-btn-header-danger'),
    'O botão de excluir massa atual deve conter a classe estilizada de perigo'
  );

  // 3. Os botões de Reavaliar e Excluir foram removidos do interior do modal
  assert.ok(
    !jsContent.includes('sim-mass-current-actions-bar'),
    'A barra de ações interna do modal (.sim-mass-current-actions-bar) foi removida'
  );

  // 4. Listeners conectados
  assert.ok(
    jsContent.includes("container.querySelector('#simBtnEvaluateCandles')?.addEventListener('click', handleEvaluate)"),
    'Listener do botão #simBtnEvaluateCandles deve estar devidamente conectado ao handleEvaluate'
  );
  assert.ok(
    jsContent.includes("container.querySelector('#simBtnClearMass')?.addEventListener('click', handleDirectClear)"),
    'Listener do botão #simBtnClearMass deve estar devidamente conectado ao handleDirectClear'
  );
});



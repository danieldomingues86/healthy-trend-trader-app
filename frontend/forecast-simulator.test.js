const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Carrega o modelo matemático de Monte Carlo
const ForecastModel = require('./forecast-simulator-model.js');

test('ForecastSimulator UI e Controller: estrutura, 2 fontes de dados e renderização', async () => {
  // Simula ambiente de navegador com JSDOM mínimo
  const html = `
    <div id="forecast" class="active">
      <div id="forecastRoot"></div>
    </div>
  `;

  // Cria um objeto global para simular o DOM do navegador
  const listeners = {};
  const rootEl = {
    innerHTML: '',
    querySelectorAll: (sel) => [],
    querySelector: (sel) => null
  };

  const documentMock = {
    readyState: 'complete',
    getElementById: (id) => {
      if (id === 'forecastRoot') return rootEl;
      if (id === 'forecast') return { classList: { contains: (c) => c === 'active' } };
      return null;
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: (evt, cb) => { listeners[evt] = cb; }
  };

  // Mock global
  const originalDoc = globalThis.document;
  const originalWindow = globalThis.window;
  const originalForecastSimulator = globalThis.ForecastSimulator;
  const originalSynchronizedTrades = globalThis.synchronizedTrades;
  const originalTradeSimulator = globalThis.TradeSimulator;

  try {
    globalThis.document = documentMock;
    globalThis.window = globalThis;
    globalThis.ForecastSimulator = ForecastModel;

    // 1. Configura dados simulados com operações encerradas (CLOSED_GAIN e CLOSED_LOSS)
    globalThis.TradeSimulator = {
      getState: () => ({
        simulations: [
          { id: 'sim-1', ticker: 'PETR4', status: 'CLOSED_GAIN', resultR: 2.5, triggerName: 'Pullback MM21', durationDays: 5, mfeR: 2.8, maeR: 0.2 },
          { id: 'sim-2', ticker: 'VALE3', status: 'CLOSED_LOSS', resultR: -1.0, triggerName: 'Rompimento de Pivô', durationDays: 2, mfeR: 0.4, maeR: 1.0 },
          { id: 'sim-3', ticker: 'WEGE3', status: 'WAITING_ENTRY', resultR: null, triggerName: 'Inside Bar' }, // Deve ser ignorado
          { id: 'sim-4', ticker: 'ITUB4', status: 'NOT_TRIGGERED', resultR: null, triggerName: 'Pullback MM21' } // Deve ser ignorado
        ]
      })
    };

    // 2. Configura trades reais sincronizados
    globalThis.synchronizedTrades = [
      { id: 'real-1', ticker: 'BBAS3', status: 'closed', r: 1.8, triggerName: 'Pullback MM21', duration: 4 },
      { id: 'real-2', ticker: 'RENT3', status: 'open', r: 0.5, triggerName: 'Inside Bar' } // Deve ser ignorado
    ];

    // Carrega o script do controlador
    require('./forecast-simulator.js');

    // Executa a renderização inicial
    assert.equal(typeof globalThis.renderForecastSimulator, 'function', 'renderForecastSimulator deve ser exportado');
    globalThis.renderForecastSimulator();

    // 3. Validações de UI e Conteúdo
    assert.ok(rootEl.innerHTML.includes('Simulador de Resultados'), 'Deve exibir o título oficial Simulador de Resultados');
    assert.ok(rootEl.innerHTML.includes('forecast-beta-badge'), 'Deve exibir a badge BETA');
    assert.ok(rootEl.innerHTML.includes('Fonte dos dados'), 'Deve exibir o seletor Fonte dos dados');

    // Valida estritamente as DUAS únicas opções de fonte (sem fontes híbridas)
    assert.ok(rootEl.innerHTML.includes('<option value="simulated"'), 'Deve conter opção Trades Simulados');
    assert.ok(rootEl.innerHTML.includes('<option value="real"'), 'Deve conter opção Trades Reais');
    assert.ok(!rootEl.innerHTML.includes('value="hybrid"'), 'NÃO deve conter fonte híbrida');
    assert.ok(!rootEl.innerHTML.includes('value="both"'), 'NÃO deve conter fonte mista');

    // Valida os 5 nós do processo probabilístico no Hero
    assert.ok(rootEl.innerHTML.includes('DADOS HISTÓRICOS'), 'Hero deve conter DADOS HISTÓRICOS');
    assert.ok(rootEl.innerHTML.includes('DISTRIBUIÇÃO DE R'), 'Hero deve conter DISTRIBUIÇÃO DE R');
    assert.ok(rootEl.innerHTML.includes('MONTE CARLO'), 'Hero deve conter MONTE CARLO');
    assert.ok(rootEl.innerHTML.includes('PROJEÇÃO'), 'Hero deve conter PROJEÇÃO');
    assert.ok(rootEl.innerHTML.includes('OBJETIVO'), 'Hero deve conter OBJETIVO');

    // Valida os 7 Cards de KPI
    assert.ok(rootEl.innerHTML.includes('Expectancy ⓘ'), 'Deve exibir card Expectancy');
    assert.ok(rootEl.innerHTML.includes('Trades na amostra'), 'Deve exibir card Trades na amostra');
    assert.ok(rootEl.innerHTML.includes('Trades estimados'), 'Deve exibir card Trades estimados');
    assert.ok(rootEl.innerHTML.includes('Tempo até a meta'), 'Deve exibir card Tempo até a meta');
    assert.ok(rootEl.innerHTML.includes('Probabilidade da meta'), 'Deve exibir card Probabilidade da meta');
    assert.ok(rootEl.innerHTML.includes('Drawdown provável'), 'Deve exibir card Drawdown provável');
    assert.ok(rootEl.innerHTML.includes('Equity projetada'), 'Deve exibir card Equity projetada');

    // Valida a contagem da amostra simulada: exatamente 2 trades fechados (sim-1 e sim-2)
    assert.ok(rootEl.innerHTML.includes('>2</strong>') && rootEl.innerHTML.includes('trades simulados fechados'), 'Deve contar apenas 2 trades simulados fechados');

    // 4. Testa a alternância para Trades Reais
    globalThis.ForecastSimulatorController.setSource('real');
    assert.ok(rootEl.innerHTML.includes('>1</strong>') && rootEl.innerHTML.includes('trades reais fechados'), 'Fonte real deve conter apenas 1 trade real fechado');

    // 5. Testa comportamento de fonte vazia (0 trades)
    globalThis.TradeSimulator = { getState: () => ({ simulations: [] }) };
    globalThis.ForecastSimulatorController.setSource('simulated');
    assert.ok(rootEl.innerHTML.includes('>0</strong>') && rootEl.innerHTML.includes('trades simulados fechados'), 'Fonte vazia deve reportar 0 trades fechados sem quebrar');
    assert.ok(rootEl.innerHTML.includes('Nenhum trade encerrado disponível para simulação'), 'Deve exibir mensagem explicativa de estado vazio');

  } finally {
    globalThis.document = originalDoc;
    globalThis.window = originalWindow;
    globalThis.ForecastSimulator = originalForecastSimulator;
    globalThis.synchronizedTrades = originalSynchronizedTrades;
    globalThis.TradeSimulator = originalTradeSimulator;
  }
});

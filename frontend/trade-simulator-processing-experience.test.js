'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TradeSimulatorModel = require('./trade-simulator-model.js');
const {
  SimulationProcessingExperience,
  SIMULATION_PROCESSING_STEPS,
  buildSimulationProcessingState,
  renderSimulationProcessingExperience
} = TradeSimulatorModel;

test('SimulationProcessingExperience — 1. Estrutura do componente reutilizável e 5 etapas canônicas', () => {
  assert.ok(SimulationProcessingExperience, 'SimulationProcessingExperience deve estar exportado');
  assert.equal(typeof SimulationProcessingExperience.buildState, 'function');
  assert.equal(typeof SimulationProcessingExperience.render, 'function');
  assert.equal(Array.isArray(SIMULATION_PROCESSING_STEPS), true);
  assert.equal(SIMULATION_PROCESSING_STEPS.length, 5);

  const expectedLabels = [
    'Carregando histórico dos ativos.',
    'Aplicando regras da estratégia.',
    'Simulando operações.',
    'Calculando métricas e resultados.',
    'Preparando o relatório final.'
  ];
  assert.deepEqual(
    SIMULATION_PROCESSING_STEPS.map(s => s.label),
    expectedLabels,
    'As 5 etapas do processamento devem corresponder exatamente à especificação'
  );
});

test('SimulationProcessingExperience — 2. Regra crítica de progresso: nunca inventa percentuais e usa indeterminado quando sem percentual real', () => {
  // Sem realProgressPct -> estado indeterminado (não pode inventar 67%, 80%, etc.)
  const indeterminateState = buildSimulationProcessingState({
    status: 'PROCESSING',
    phase: 'LOAD_HISTORY',
    config: { strategy: 'TREND_FOLLOWING', period: 120, universe: 'IBOV' }
  });

  assert.equal(indeterminateState.isIndeterminate, true, 'Deve ser indeterminado quando realProgressPct não é fornecido');
  assert.equal(indeterminateState.progressPct, null, 'progressPct deve ser null no modo indeterminado');

  const indeterminateHtml = renderSimulationProcessingExperience(indeterminateState);
  assert.ok(indeterminateHtml.includes('data-indeterminate="true"'), 'HTML deve sinalizar estado indeterminado');
  assert.ok(indeterminateHtml.includes('indeterminate-spin'), 'Anel SVG deve usar classe de animação indeterminada');
  assert.ok(!indeterminateHtml.includes('67%'), 'Jamais deve apresentar percentuais fictícios como 67%');
  assert.ok(!indeterminateHtml.includes('data-testid="sim-proc-pct"'), 'Não deve renderizar percentual numérico quando indeterminado');

  // Com realProgressPct confirmado (ex: 60% após confirmação das 3 primeiras etapas)
  const real60State = buildSimulationProcessingState({
    status: 'PROCESSING',
    phase: 'CALCULATE_METRICS',
    currentStepIndex: 4,
    realProgressPct: 60,
    config: { strategy: 'TREND_FOLLOWING', period: 365, universe: 'IBOV' }
  });

  assert.equal(real60State.isIndeterminate, false);
  assert.equal(real60State.progressPct, 60);

  const real60Html = renderSimulationProcessingExperience(real60State);
  assert.ok(real60Html.includes('>60%<'), 'Deve exibir o percentual real confirmado de 60%');
});

test('SimulationProcessingExperience — 3. Etapas refletem apenas estados efetivamente conhecidos (completed, in_progress, pending)', () => {
  // No início do processamento (Etapa 1 em andamento): nenhuma etapa pode ser dada como concluída sem confirmação
  const step1State = buildSimulationProcessingState({
    status: 'PROCESSING',
    phase: 'LOAD_HISTORY',
    currentStepIndex: 1
  });
  assert.equal(step1State.steps[0].status, 'in_progress', 'Etapa 1 deve estar em andamento');
  assert.equal(step1State.steps[1].status, 'pending', 'Etapa 2 deve estar pendente');
  assert.equal(step1State.steps[2].status, 'pending', 'Etapa 3 deve estar pendente');
  assert.equal(step1State.steps[3].status, 'pending', 'Etapa 4 deve estar pendente');
  assert.equal(step1State.steps[4].status, 'pending', 'Etapa 5 deve estar pendente');

  // Na Etapa 4 (após servidor confirmar carga, regras e simulação das operações): Etapas 1, 2 e 3 concluídas; Etapa 4 em andamento; Etapa 5 pendente
  const step4State = buildSimulationProcessingState({
    status: 'PROCESSING',
    phase: 'CALCULATE_METRICS',
    currentStepIndex: 4,
    realProgressPct: 60
  });
  assert.equal(step4State.steps[0].status, 'completed');
  assert.equal(step4State.steps[1].status, 'completed');
  assert.equal(step4State.steps[2].status, 'completed');
  assert.equal(step4State.steps[3].status, 'in_progress');
  assert.equal(step4State.steps[4].status, 'pending');

  const html = renderSimulationProcessingExperience(step4State);
  assert.ok(html.includes('data-step-id="LOAD_HISTORY" data-step-index="1" data-step-status="completed"'));
  assert.ok(html.includes('data-step-id="CALCULATE_METRICS" data-step-index="4" data-step-status="in_progress"'));
  assert.ok(html.includes('Calculando métricas e resultados...'));
  assert.ok(html.includes('data-step-id="PREPARE_REPORT" data-step-index="5" data-step-status="pending"'));
});

test('SimulationProcessingExperience — 4. Resumo inferior dinâmico suporta Trend Following, Volatility Trading, períodos e universos reais', () => {
  // Cenário A: Trend Following + 120 dias + IBOV
  const stateTrend = buildSimulationProcessingState({
    status: 'PROCESSING',
    config: {
      strategy: 'TREND_FOLLOWING',
      period: 120,
      universe: 'IBOV'
    }
  });
  assert.equal(stateTrend.summary.strategyLabel, 'Trend Following');
  assert.equal(stateTrend.summary.periodLabel, 'Últimos 120 dias (4 meses)');
  assert.equal(stateTrend.summary.assetsLabel, '76 ativos selecionados');

  // Cenário B: Volatility Trading + Período Personalizado + Contagem explícita de ativos
  const stateVolatility = buildSimulationProcessingState({
    status: 'PROCESSING',
    config: {
      strategy: 'VOLATILITY_TRADING',
      period: 'CUSTOM',
      startDate: '2025-01-15',
      endDate: '2026-10-30',
      assetsCount: 83
    }
  });
  assert.equal(stateVolatility.summary.strategyId, 'VOLATILITY_TRADING');
  assert.equal(stateVolatility.summary.strategyLabel, 'Volatility Trading');
  assert.equal(stateVolatility.summary.periodLabel, '15/01/2025 – 30/10/2026');
  assert.equal(stateVolatility.summary.assetsLabel, '83 ativos selecionados');

  // Cenário C: NASDAQ + Todo o histórico
  const stateNasdaq = buildSimulationProcessingState({
    status: 'PROCESSING',
    config: {
      strategy: 'Trend Following',
      period: 'ALL',
      universe: 'NASDAQ'
    }
  });
  assert.equal(stateNasdaq.summary.periodLabel, 'Out/2025 – Out/2026');
  assert.equal(stateNasdaq.summary.assetsLabel, '100 ativos selecionados');

  const htmlVol = renderSimulationProcessingExperience(stateVolatility);
  assert.ok(htmlVol.includes('Volatility Trading'), 'HTML deve exibir Volatility Trading dinamicamente');
  assert.ok(htmlVol.includes('15/01/2025 – 30/10/2026'), 'HTML deve exibir período personalizado dinamicamente');
  assert.ok(htmlVol.includes('83 ativos selecionados'), 'HTML deve exibir quantidade real de ativos selecionados');
});

test('SimulationProcessingExperience — 5. Estados de Sucesso e Erro com ações e bloqueio durante processamento', () => {
  // Estado PROCESSING bloqueia fechamento
  const procHtml = renderSimulationProcessingExperience({
    status: 'PROCESSING',
    phase: 'LOAD_HISTORY'
  });
  assert.ok(procHtml.includes('Gerando sua Massa de Trades'), 'Título principal de processamento');
  assert.ok(
    procHtml.includes('Estamos processando os dados históricos e simulando as operações conforme os parâmetros definidos.'),
    'Subtítulo oficial de processamento'
  );
  assert.ok(procHtml.includes('id="simMassModalClose"'), 'Botão de fechar presente');
  assert.ok(procHtml.includes('disabled aria-disabled="true"'), 'Botão de fechar deve estar desabilitado durante o processamento');

  // Estado SUCCESS (100% e todas as etapas concluídas)
  const successState = buildSimulationProcessingState({
    status: 'SUCCESS',
    executedCount: 142,
    config: { strategy: 'TREND_FOLLOWING', period: 365, universe: 'LIQUID_B3' }
  });
  assert.equal(successState.progressPct, 100);
  assert.equal(successState.isIndeterminate, false);
  assert.equal(successState.isLocked, false);
  assert.ok(successState.steps.every(s => s.status === 'completed'), 'Todas as 5 etapas devem estar concluídas no estado de sucesso');

  const successHtml = renderSimulationProcessingExperience(successState);
  assert.ok(successHtml.includes('>100%<'), 'Estado de sucesso deve exibir 100%');
  assert.ok(successHtml.includes('id="simProcBtnViewResults"'), 'Estado de sucesso deve conter botão de visualizar resultados');

  // Estado ERROR (permite tentar novamente ou voltar aos parâmetros)
  const errorState = buildSimulationProcessingState({
    status: 'ERROR',
    currentStepIndex: 3,
    errorMessage: 'Falha de conexão ao carregar histórico.',
    config: { strategy: 'TREND_FOLLOWING', period: 120, universe: 'IBOV' }
  });
  assert.equal(errorState.status, 'ERROR');
  assert.equal(errorState.isLocked, false);
  assert.equal(errorState.steps[0].status, 'completed');
  assert.equal(errorState.steps[1].status, 'completed');
  assert.equal(errorState.steps[2].status, 'error');
  assert.equal(errorState.steps[3].status, 'pending');

  const errorHtml = renderSimulationProcessingExperience(errorState);
  assert.ok(errorHtml.includes('Falha de conexão ao carregar histórico.'), 'Deve exibir mensagem clara de erro');
  assert.ok(errorHtml.includes('id="simProcBtnRetry"'), 'Deve permitir nova tentativa (#simProcBtnRetry)');
  assert.ok(errorHtml.includes('id="simProcBtnBackToForm"'), 'Deve permitir voltar aos parâmetros (#simProcBtnBackToForm)');
});

test('SimulationProcessingExperience — 6. Integração com modal, remoção do pequeno spinner legado, asset artístico e responsividade CSS', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');
  const cssContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.css'), 'utf8');
  const bullArtPath = path.join(__dirname, '..', 'assets', 'simulator-processing-bull-hero.jpg');

  // 1. Imagem artística existe em assets/
  assert.ok(fs.existsSync(bullArtPath), 'Arte do Touro Dourado (assets/simulator-processing-bull-hero.jpg) deve existir em disco');
  const artStats = fs.statSync(bullArtPath);
  assert.ok(artStats.size > 10000, 'Arquivo de arte deve ser uma imagem válida e não vazia');

  // 2. O pequeno loading antigo no rodapé do modal foi substituído pela experiência ampliada
  assert.ok(
    !jsContent.includes('<div class="sim-mass-progress-box">'),
    'O antigo loading pequeno (.sim-mass-progress-box) no rodapé do formulário deve ter sido removido'
  );
  assert.ok(
    jsContent.includes('sim-mass-modal-processing'),
    'O modal deve alternar para a classe ampliada .sim-mass-modal-processing durante o processamento'
  );
  assert.ok(
    jsContent.includes('SimulationProcessingExperience'),
    'trade-simulator.js deve integrar o componente SimulationProcessingExperience'
  );

  // 3. Bloqueio de cliques duplicados em generateScenarioMass
  assert.ok(
    jsContent.includes('if (state.generatingMass) {\n      return null;\n    }'),
    'generateScenarioMass deve bloquear execuções concorrentes ou cliques duplicados'
  );

  // 4. Estilos CSS, responsividade e prefers-reduced-motion
  assert.ok(cssContent.includes('.sim-processing-experience'), 'CSS deve estilizar .sim-processing-experience');
  assert.ok(cssContent.includes('.sim-proc-stage-grid'), 'CSS deve definir o grid da composição artística + etapas');
  assert.ok(cssContent.includes('.sim-proc-summary-bar'), 'CSS deve estilizar a barra de resumo inferior');
  assert.ok(cssContent.includes('@media (max-width: 960px)'), 'CSS deve ter breakpoint responsivo para telas menores');
  assert.ok(cssContent.includes('@media (prefers-reduced-motion: reduce)'), 'CSS deve respeitar prefers-reduced-motion');
});

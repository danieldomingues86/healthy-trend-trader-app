const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TradeSimulatorModel = require('./trade-simulator-model');

// Mock helper para gerar trades de teste com diferentes grades e gatilhos
function createSampleSimulations() {
  return [
    {
      id: 'sim-1',
      symbol: 'PETR4',
      companyName: 'Petrobras PN',
      sector: 'Petróleo e Gás',
      triggerName: 'Inside Bar',
      grade: 'A',
      signalDate: '2026-01-10',
      entryDate: '2026-01-11',
      entryPrice: 30.00,
      stopLoss: 28.50,
      exitDate: '2026-01-20',
      exitPrice: 33.00,
      status: 'CLOSED_GAIN',
      resultR: 2.0,
      shares: 333,
      rsScore: 96,
      marketCycle: 'healthy'
    },
    {
      id: 'sim-2',
      symbol: 'VALE3',
      companyName: 'Vale ON',
      sector: 'Materiais Básicos',
      triggerName: '1-2-3 de Compra',
      grade: 'A',
      signalDate: '2026-01-15',
      entryDate: '2026-01-16',
      entryPrice: 60.00,
      stopLoss: 57.00,
      exitDate: '2026-01-25',
      exitPrice: 66.00,
      status: 'CLOSED_GAIN',
      resultR: 2.0,
      shares: 133,
      rsScore: 92,
      marketCycle: 'healthy'
    },
    {
      id: 'sim-3',
      symbol: 'ITUB4',
      companyName: 'Itaú Unibanco PN',
      sector: 'Financeiro',
      triggerName: 'PFR de Compra',
      grade: 'B',
      signalDate: '2026-02-01',
      entryDate: '2026-02-02',
      entryPrice: 35.00,
      stopLoss: 33.50,
      exitDate: '2026-02-10',
      exitPrice: 33.50,
      status: 'CLOSED_LOSS',
      resultR: -1.0,
      shares: 133,
      rsScore: 85,
      marketCycle: 'healthy'
    },
    {
      id: 'sim-4',
      symbol: 'BBAS3',
      companyName: 'Banco do Brasil ON',
      sector: 'Financeiro',
      triggerName: 'Inside Bar',
      grade: 'C',
      signalDate: '2026-02-10',
      entryDate: '2026-02-11',
      entryPrice: 28.00,
      stopLoss: 27.00,
      exitDate: '2026-02-18',
      exitPrice: 30.00,
      status: 'CLOSED_GAIN',
      resultR: 2.0,
      shares: 100,
      rsScore: 82,
      marketCycle: 'healthy'
    },
    {
      id: 'sim-5',
      symbol: 'MGLU3',
      companyName: 'Magazine Luiza ON',
      sector: 'Consumo',
      triggerName: 'Dave Landry',
      grade: 'D',
      signalDate: '2026-02-15',
      entryDate: '2026-02-16',
      entryPrice: 12.00,
      stopLoss: 11.00,
      exitDate: '2026-02-25',
      exitPrice: 14.00,
      status: 'CLOSED_GAIN',
      resultR: 2.0,
      shares: 0,
      rsScore: 65,
      marketCycle: 'defensive'
    }
  ];
}

test('Rebuild Aba 1 — 1. Capital Inicial é personalizável e dimensiona o risco financeiro proporcionalmente', () => {
  const sims = createSampleSimulations();

  // Executar simulação com R$ 100.000
  const rep100k = TradeSimulatorModel.runRubricPortfolioSimulation(sims, {
    officialMode: true,
    rubricMode: true,
    initialCapital: 100000
  });

  assert.equal(rep100k.initialCapital, 100000);
  assert.ok(rep100k.finalEquity > 0);

  // Executar simulação com R$ 250.000
  const rep250k = TradeSimulatorModel.runRubricPortfolioSimulation(sims, {
    officialMode: true,
    rubricMode: true,
    initialCapital: 250000
  });

  assert.equal(rep250k.initialCapital, 250000);

  // O risco financeiro de cada trade deve crescer proporcionalmente aos lotes padrão da B3
  const tradeA100k = rep100k.executedTrades.find(t => t.grade === 'A');
  const tradeA250k = rep250k.executedTrades.find(t => t.grade === 'A');

  assert.ok(tradeA100k, 'Trade Grade A deve ter sido executado em 100k');
  assert.ok(tradeA250k, 'Trade Grade A deve ter sido executado em 250k');

  assert.ok(
    tradeA250k.authorizedRiskCash >= tradeA100k.authorizedRiskCash * 2,
    `Risco autorizado em 250k (R$ ${tradeA250k.authorizedRiskCash}) deve escalar substancialmente em relação a 100k (R$ ${tradeA100k.authorizedRiskCash})`
  );
  assert.ok(tradeA250k.shares > tradeA100k.shares, 'Quantidade de ações deve ser maior no capital superior');
});

test('Rebuild Aba 1 — 2. Atribuição Financeira por Grade (apenas A, B, C; sem A+ e sem Grade D no simulador)', () => {
  const sims = createSampleSimulations();

  const report = TradeSimulatorModel.runRubricPortfolioSimulation(sims, {
    officialMode: true,
    rubricMode: true,
    initialCapital: 100000
  });

  const gb = report.qualityAndSizing.gradeBreakdown;
  assert.ok(gb, 'gradeBreakdown deve existir no relatório');

  // Grades estritamente válidas e operadas no simulador: A, B, C (sem A+ e sem D)
  assert.equal(gb['A+'], undefined, 'Grade A+ não deve existir no gradeBreakdown');
  assert.ok(gb['A'], 'Grade A deve estar presente');
  assert.ok(gb['B'], 'Grade B deve estar presente');
  assert.ok(gb['C'], 'Grade C deve estar presente');
  assert.equal(gb['D'], undefined, 'Grade D não deve ser considerado ou exibido no simulador');

  // Verificação de integridade matemática: soma dos PnLs das grades operadas == PnL total líquido
  let sumGradePnL = 0;
  for (const gr of ['A', 'B', 'C']) {
    sumGradePnL += gb[gr].netPnL || 0;
  }

  assert.ok(
    Math.abs(sumGradePnL - report.netPnL) < 0.05,
    `A soma dos resultados por Grade (R$ ${sumGradePnL}) deve ser idêntica ao Net PnL total (R$ ${report.netPnL})`
  );

  // Verificação da Grade de maior contribuição (entre A, B e C)
  assert.ok(report.topPositiveGrade, 'topPositiveGrade deve estar preenchido');
  assert.ok(['A', 'B', 'C'].includes(report.topPositiveGrade));
});

test('Rebuild Aba 3 — 3. Análise por Ativo agrega métricas e contribuição monetária', () => {
  const sims = createSampleSimulations();

  const report = TradeSimulatorModel.runRubricPortfolioSimulation(sims, {
    officialMode: true,
    rubricMode: true,
    initialCapital: 100000
  });

  const assets = report.assetBreakdown;
  assert.ok(Array.isArray(assets), 'assetBreakdown deve ser um array');
  assert.ok(assets.length > 0, 'Deve conter ativos operados');

  // Verificar estrutura de cada ativo
  const petr = assets.find(a => a.symbol === 'PETR4');
  assert.ok(petr, 'PETR4 deve estar no breakdown de ativos');
  assert.equal(petr.count, 1);
  assert.equal(petr.winRate, 100);
  assert.ok(petr.netPnL > 0, 'PETR4 deve ter resultado financeiro positivo');
  assert.ok(petr.contribPct > 0, 'PETR4 deve ter contribuição positiva');
  assert.ok(petr.companyName, 'companyName deve ser preservado');
  assert.ok(petr.sector, 'sector deve ser preservado');

  // Ordenação decrescente por resultado
  for (let i = 0; i < assets.length - 1; i++) {
    assert.ok(assets[i].netPnL >= assets[i + 1].netPnL, 'Ativos devem ser ordenados decrescentes por netPnL');
  }
});

test('Rebuild Aba 4 — 4. Análise por Setup agrega métricas por gatilho', () => {
  const sims = createSampleSimulations();

  const report = TradeSimulatorModel.runRubricPortfolioSimulation(sims, {
    officialMode: true,
    rubricMode: true,
    initialCapital: 100000
  });

  const setups = report.setupBreakdown;
  assert.ok(Array.isArray(setups), 'setupBreakdown deve ser um array');
  assert.ok(setups.length > 0, 'Deve conter setups operados');

  // Inside Bar teve 2 sinais executados (PETR4 e BBAS3)
  const insideBar = setups.find(s => s.name === 'Inside Bar');
  assert.ok(insideBar, 'Inside Bar deve estar presente no breakdown');
  assert.equal(insideBar.count, 2);
  assert.equal(insideBar.winsCount, 2);
  assert.equal(insideBar.winRate, 100);
  assert.ok(insideBar.netPnL > 0);
  assert.ok(insideBar.expectancyR > 0);
  assert.ok(insideBar.avgRiskCash > 0);

  // Ordenação decrescente por resultado
  for (let i = 0; i < setups.length - 1; i++) {
    assert.ok(setups[i].netPnL >= setups[i + 1].netPnL, 'Setups devem ser ordenados decrescentes por netPnL');
  }
});

test('Rebuild Aba 5 — 5. Evolução no Tempo calcula Curva de Capital e Drawdown', () => {
  const sims = createSampleSimulations();

  const report = TradeSimulatorModel.runRubricPortfolioSimulation(sims, {
    officialMode: true,
    rubricMode: true,
    initialCapital: 100000
  });

  assert.ok(Array.isArray(report.equityCurve), 'equityCurve deve ser um array');
  assert.ok(report.equityCurve.length > 0);

  // O primeiro ponto da curva inicia no capital inicial
  assert.equal(report.equityCurve[0].equity, 100000);

  // O último ponto corresponde ao patrimônio final
  const lastPoint = report.equityCurve[report.equityCurve.length - 1];
  assert.equal(lastPoint.equity, report.finalEquity);

  // Retorno líquido em percentual
  const expectedReturnPct = ((report.finalEquity - 100000) / 100000) * 100;
  assert.ok(Math.abs(report.netReturnPct - expectedReturnPct) < 0.01);

  // Drawdown é métrica válida e finita
  assert.ok(typeof report.risk.maxDrawdownPct === 'number');
  assert.ok(!isNaN(report.risk.maxDrawdownPct));
  assert.ok(report.risk.maxDrawdownPct >= 0);
});

test('Rebuild UI & CSS — 6. Arquivo trade-simulator.js implementa as 5 abas e novos componentes', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');

  // Verifica as 5 abas
  assert.ok(jsContent.includes('renderScreenTabs'), 'Deve conter renderScreenTabs');
  assert.ok(jsContent.includes('renderSummaryTab'), 'Deve conter renderSummaryTab (Aba 1)');
  assert.ok(jsContent.includes('renderTradesListTab'), 'Deve conter renderTradesListTab (Aba 2)');
  assert.ok(jsContent.includes('renderAssetAnalysisTab'), 'Deve conter renderAssetAnalysisTab (Aba 3)');
  assert.ok(jsContent.includes('renderSetupAnalysisTab'), 'Deve conter renderSetupAnalysisTab (Aba 4)');
  assert.ok(jsContent.includes('renderTimelineTab'), 'Deve conter renderTimelineTab (Aba 5)');

  // Verifica controles do cabeçalho
  assert.ok(jsContent.includes('simBtnExecute'), 'Deve conter botão Executar Simulação');
  assert.ok(jsContent.includes('simCapitalInput'), 'Deve conter input de capital inicial');
  assert.ok(jsContent.includes('simBtnRubricModeToggle'), 'Deve conter alternador de Modo Rubric');

  // Validação estrita de Grades no Simulador: A, B, C apenas (sem A+ e sem D)
  assert.ok(jsContent.includes("const gradesList = ['A', 'B', 'C'];"), 'Tabela de resultados por grade deve listar estritamente A, B e C');
  assert.ok(!jsContent.includes("['A+', 'A', 'B', 'C', 'D']"), 'Não deve conter A+ ou D na lista de grades da tabela de resultados');

  // Verifica classes CSS do Rebuild no arquivo trade-simulator.css
  const cssContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.css'), 'utf8');
  assert.ok(cssContent.includes('.sim-rebuild-header'), 'CSS deve conter .sim-rebuild-header');
  assert.ok(cssContent.includes('.sim-screen-tabs-bar'), 'CSS deve conter .sim-screen-tabs-bar');
  assert.ok(cssContent.includes('.sim-rebuild-card'), 'CSS deve conter .sim-rebuild-card');
  assert.ok(cssContent.includes('.sim-summary-subcards-row'), 'CSS deve conter .sim-summary-subcards-row');
  assert.ok(cssContent.includes('.sim-rebuild-grade-table'), 'CSS deve conter .sim-rebuild-grade-table');
  assert.ok(cssContent.includes('.sim-rebuild-kpis-grid'), 'CSS deve conter .sim-rebuild-kpis-grid');
  assert.ok(cssContent.includes('.sim-rebuild-info-banner'), 'CSS deve conter .sim-rebuild-info-banner');
});


test('Refinamento Premium — 7. Separação visual das abas, botão Ver Análise corrigido e ações diretas no cabeçalho', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');
  const cssContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.css'), 'utf8');

  // 1. Área de navegação de abas com container dedicado
  assert.ok(jsContent.includes('sim-screen-tabs-container'), 'renderScreenTabs deve conter container dedicado .sim-screen-tabs-container');
  assert.ok(cssContent.includes('.sim-screen-tabs-container'), 'CSS deve conter estilo para .sim-screen-tabs-container');
  assert.ok(jsContent.includes('sim-tab-icon'), 'Abas devem conter ícones visuais para hierarquia');
  assert.ok(jsContent.includes('sim-tab-label'), 'Abas devem conter labels claros com indicador');

  // 2. Botão Ver Análise corrigido na Lista de Trades
  assert.ok(jsContent.includes('sim-btn-view-analysis'), 'Lista de trades deve usar classe específica .sim-btn-view-analysis');
  assert.ok(cssContent.includes('.sim-btn-view-analysis'), 'CSS deve conter regras específicas para .sim-btn-view-analysis');
  assert.ok(cssContent.includes('min-width: 104px'), 'CSS deve garantir largura mínima suficiente para o texto');
  assert.ok(cssContent.includes('white-space: nowrap'), 'CSS deve proibir quebra inadequada de texto no botão');
  assert.ok(jsContent.includes('width: 125px'), 'Cabeçalho da coluna Ações deve ter largura explícita');

  // 3. Ações Diretas no Cabeçalho
  assert.ok(jsContent.includes('sim-header-actions-group'), 'Cabeçalho deve agrupar ações com hierarquia visual clara');
  assert.ok(jsContent.includes('id="simBtnExecute"'), 'Executar Simulação deve ser o botão principal');
  assert.ok(jsContent.includes('id="simBtnCompareModal"'), 'Comparar Cenários deve estar diretamente visível no cabeçalho');
  assert.ok(jsContent.includes('id="simBtnMassModal"'), 'Gerar Massa de Teste deve estar diretamente visível no cabeçalho');
  assert.ok(cssContent.includes('.sim-btn-header-secondary'), 'CSS deve ter estilo secundário elegante para Comparar e Gerar Massa');

  // 4. Menu Mais Opções (···) preservado para ações menos frequentes
  assert.ok(jsContent.includes('id="simBtnMoreDropdown"'), 'Menu de três pontos deve continuar disponível');
  assert.ok(jsContent.includes('id="simMoreBtnAudit"'), 'Auditoria deve estar no menu de opções adicionais');
  assert.ok(jsContent.includes('id="simMoreBtnEvaluate"'), 'Reavaliar candles deve estar no menu de opções adicionais');
  assert.ok(jsContent.includes('id="simMoreBtnExport"'), 'Exportar deve estar no menu de opções adicionais');
  assert.ok(jsContent.includes('id="simMoreBtnClear"'), 'Excluir deve estar no menu de opções adicionais');
});

test('Refinamento do Simulador — 8. Badges ao lado do título, grid equilibrado de 2 linhas e sincronização do risco por Grade', () => {
  // 1. Validação de fonte única da Política de Risco
  assert.equal(typeof TradeSimulatorModel.getOfficialRiskPolicy, 'function', 'TradeSimulatorModel deve exportar getOfficialRiskPolicy');
  const policy = TradeSimulatorModel.getOfficialRiskPolicy();
  assert.ok(policy, 'Política deve ser retornada');
  assert.ok(Array.isArray(policy.grades), 'policy.grades deve ser um array');

  const gradeA = policy.grades.find(g => g.grade === 'A');
  const gradeB = policy.grades.find(g => g.grade === 'B');
  const gradeC = policy.grades.find(g => g.grade === 'C');
  assert.equal(gradeA.riskPct, 0.004, 'Grade A deve ter risco padrão de 0,40% (0.004)');
  assert.equal(gradeB.riskPct, 0.002, 'Grade B deve ter risco padrão de 0,20% (0.002)');
  assert.equal(gradeC.riskPct, 0.001, 'Grade C deve ter risco padrão de 0,10% (0.001)');

  // 2. Simulação com discriminação de risco configurado vs executado
  const sims = createSampleSimulations();
  const report = TradeSimulatorModel.runRubricPortfolioSimulation(sims, {
    officialMode: true,
    rubricMode: true,
    initialCapital: 100000,
    policy
  });

  const gb = report.qualityAndSizing.gradeBreakdown;
  assert.ok(gb.A, 'Grade A deve existir no breakdown');
  assert.equal(gb.A.configuredRiskPct, 0.40, 'Risco configurado de Grade A deve ser 0,40%');
  assert.equal(gb.B.configuredRiskPct, 0.20, 'Risco configurado de Grade B deve ser 0,20%');
  assert.equal(gb.C.configuredRiskPct, 0.10, 'Risco configurado de Grade C deve ser 0,10%');

  // Risco médio executado deve ser exposto separadamente e refletir a execução real
  assert.ok(typeof gb.A.avgRiskPct === 'number', 'avgRiskPct deve ser numérico');
  assert.ok(typeof gb.B.avgRiskPct === 'number', 'avgRiskPct deve ser numérico');
  assert.ok(typeof gb.C.avgRiskPct === 'number', 'avgRiskPct deve ser numérico');

  // 3. Validação de UI no trade-simulator.js
  const jsContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');

  // Badges na mesma linha do título
  assert.ok(jsContent.includes('class="sim-title-row"'), 'Deve conter .sim-title-row');
  assert.ok(jsContent.includes('simBtnRubricModeToggle'), 'Botão Modo Rubric deve estar no cabeçalho');
  assert.ok(jsContent.includes('simBtnAuditModal'), 'Pill de Auditoria deve estar no cabeçalho ao lado do título');

  // Grid em 2 linhas no lado direito
  assert.ok(jsContent.includes('sim-header-right-zone'), 'Deve conter .sim-header-right-zone');
  assert.ok(jsContent.includes('sim-header-filters-row'), 'Deve conter linha de parâmetros .sim-header-filters-row');
  assert.ok(jsContent.includes('sim-header-actions-row'), 'Deve conter linha de ações .sim-header-actions-row');

  // Tabela com colunas distintas de risco configurado e aplicado
  assert.ok(jsContent.includes('>Risco configurado</th>'), 'Tabela deve conter coluna "Risco configurado"');
  assert.ok(jsContent.includes('>Risco médio aplicado</th>'), 'Tabela deve conter coluna "Risco médio aplicado"');
  assert.ok(jsContent.includes('sim-grade-table-footer-note'), 'Deve conter nota explicativa .sim-grade-table-footer-note');

  // 4. Validação de CSS no trade-simulator.css
  const cssContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.css'), 'utf8');

  // Título e badges alinhados sem quebra forçada
  assert.ok(cssContent.includes('.sim-rebuild-header .sim-title-row'), 'CSS deve estilizar .sim-rebuild-header .sim-title-row');
  assert.ok(cssContent.includes('.sim-grade-table-footer-note'), 'CSS deve conter estilos para .sim-grade-table-footer-note');
  assert.ok(cssContent.includes('max-width: 620px'), 'sim-header-titles não deve estar limitado a 360px');
});

test('UI/UX Premium — 9. Padrão visual premium da referência aprovada (cores vivas, destaque de resultado, badges com contraste, barras de contribuição de 10px e cards de métricas refinados)', () => {
  const jsContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.js'), 'utf8');
  const cssContent = fs.readFileSync(path.join(__dirname, 'trade-simulator.css'), 'utf8');

  // 1. View Toggle com label "Visão:" e botão ativo esmeralda
  assert.ok(jsContent.includes('sim-rebuild-view-toggle-wrap'), 'Deve conter wrapper do toggle de visualização');
  assert.ok(jsContent.includes('class="sim-view-toggle-label">Visão:</span>'), 'Deve conter label "Visão:"');
  assert.ok(cssContent.includes('.sim-view-toggle-btn.active'), 'CSS deve ter seletor ativo para toggle');
  assert.ok(cssContent.includes('background: #059669;'), 'Botão ativo deve ter fundo verde esmeralda #059669');

  // 2. Subcard de Resultado Total com grande destaque visual
  assert.ok(cssContent.includes('.subcard-total'), 'CSS deve estilizar subcard-total');
  assert.ok(cssContent.includes('background: #f0fdf4;'), 'Subcard de resultado total deve ter fundo verde suave #f0fdf4');
  assert.ok(cssContent.includes('font-size: 30px;'), 'Valor principal deve ter tipografia destacada de 30px');
  assert.ok(jsContent.includes('equiv-val'), 'Equivalente em R deve ter classe de destaque equiv-val');

  // 3. Badges de Grades com personalidades cromáticas vivas
  assert.ok(cssContent.includes('.sim-rebuild-grade-badge.grade-a {'), 'CSS deve estilizar badge Grade A');
  assert.ok(cssContent.includes('.sim-rebuild-grade-badge.grade-b {'), 'CSS deve estilizar badge Grade B');
  assert.ok(cssContent.includes('.sim-rebuild-grade-badge.grade-c {'), 'CSS deve estilizar badge Grade C');
  assert.ok(cssContent.includes('font-size: 12.5px;'), 'Badges devem ter tipografia nítida de 12.5px');

  // 4. Barra de contribuição expressiva de 10px com preenchimento em cápsula
  assert.ok(cssContent.includes('height: 10px;'), 'Barra de progresso deve ter altura expressiva de 10px');
  assert.ok(cssContent.includes('.sim-rebuild-progress-bar.pos'), 'CSS deve ter seletor para barra positiva');
  assert.ok(cssContent.includes('background: #10b981;'), 'Barra positiva deve ter preenchimento verde vivo #10b981');
  assert.ok(cssContent.includes('.sim-rebuild-progress-bar.neg'), 'CSS deve ter seletor para barra negativa');
  assert.ok(cssContent.includes('background: #ef4444;'), 'Barra negativa deve ter preenchimento vermelho #ef4444');

  // 5. Cards de Métricas com ícones tonalizados e valores em 24px
  assert.ok(cssContent.includes('.sim-mini-kpi-icon.icon-mint'), 'Ícone mint deve ter classe específica');
  assert.ok(cssContent.includes('.sim-mini-kpi-icon.icon-blue'), 'Ícone blue deve ter classe específica');
  assert.ok(cssContent.includes('.sim-mini-kpi-icon.icon-red'), 'Ícone red deve ter classe específica');
  assert.ok(cssContent.includes('font-size: 24px;'), 'Valores de mini KPIs devem ter 24px');

  // 6. Banner de Informação com fundo azul tonalizado e ícone consistente
  assert.ok(cssContent.includes('.sim-rebuild-info-banner'), 'CSS deve estilizar sim-rebuild-info-banner');
  assert.ok(cssContent.includes('background: #eff6ff;'), 'Banner deve ter fundo azul suave #eff6ff');
  assert.ok(cssContent.includes('border: 1px solid #bfdbfe;'), 'Banner deve ter borda suave #bfdbfe');
});

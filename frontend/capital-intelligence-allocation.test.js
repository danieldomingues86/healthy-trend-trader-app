const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const ciJs = fs.readFileSync(path.join(__dirname, 'capital-intelligence.js'), 'utf8');
const ciCss = fs.readFileSync(path.join(__dirname, 'capital-intelligence.css'), 'utf8');
const CapitalIntelligenceModel = require('./capital-intelligence-model.js');

test('Feature 12 — Motor de Alocação: hidratação a partir de snapshot com sugestão enriquecida de 21 pregões', () => {
  const model = new CapitalIntelligenceModel();

  const mockSnapshot = {
    overallStatus: 'atualizado',
    allocationSuggestion: {
      status: 'available',
      confidenceLevel: 'ALTA',
      postureLabel: 'Postura Defensiva & Seletiva (Preservação de Capital)',
      shortRationale: 'Pressão na B3 em 21 pregões e consolidação nos EUA. Priorizar liquidez.',
      hasBinarySuperRisk: false,
      isHoldRecommended: false,
      eventsNote: 'Copom e Fed distantes mais de 5 dias úteis.',
      targetAllocations: {
        fixedIncome: 45,
        localEquities: 10,
        globalEquities: 15,
        goldProtection: 15,
        cashLiquidity: 15
      },
      comparisonRows: [
        {
          key: 'fixedIncome',
          label: 'Renda Fixa / Pós-fixado',
          currentPct: 35.0,
          currentDisplay: '35,0%',
          suggestedPct: 45,
          suggestedDisplay: '45%',
          deltaPct: 10.0,
          action: 'increase',
          actionLabel: 'Aumentar (+10%)',
          rationale: 'Carrego estrutural na curva DI de 21 pregões.'
        },
        {
          key: 'localEquities',
          label: 'Ações Brasil (B3)',
          currentPct: 20.0,
          currentDisplay: '20,0%',
          suggestedPct: 10,
          suggestedDisplay: '10%',
          deltaPct: -10.0,
          action: 'decrease',
          actionLabel: 'Reduzir (-10%)',
          rationale: 'Ciclo B3 defensivo em 21 pregões sob médias decrescentes.'
        },
        {
          key: 'globalEquities',
          label: 'Ações Globais & BDRs',
          currentPct: 20.0,
          currentDisplay: '20,0%',
          suggestedPct: 15,
          suggestedDisplay: '15%',
          deltaPct: -5.0,
          action: 'decrease',
          actionLabel: 'Reduzir (-5%)',
          rationale: 'Seletividade em líderes com monitoramento de Breadth.'
        },
        {
          key: 'goldProtection',
          label: 'Ouro & Proteção',
          currentPct: 5.0,
          currentDisplay: '5,0%',
          suggestedPct: 15,
          suggestedDisplay: '15%',
          deltaPct: 10.0,
          action: 'increase',
          actionLabel: 'Aumentar (+10%)',
          rationale: 'Hedge contra volatilidade e choques globais de cauda.'
        },
        {
          key: 'cashLiquidity',
          label: 'Caixa & Liquidez Livre',
          currentPct: 20.0,
          currentDisplay: '20,0%',
          suggestedPct: 15,
          suggestedDisplay: '15%',
          deltaPct: -5.0,
          action: 'decrease',
          actionLabel: 'Reduzir (-5%)',
          rationale: 'Reserva desimpedida de oportunidade.'
        }
      ],
      evidences: [
        { name: 'Ciclo B3 (Brasil)', weight: 20, period: '21 pregões', directionScore: -1.0, summary: 'Defesa B3.' },
        { name: 'Ciclo S&P 500 / Nasdaq (EUA)', weight: 20, period: '21 pregões', directionScore: 0.0, summary: 'Neutro EUA.' },
        { name: 'Market Breadth & Rotação (EUA)', weight: 15, period: '21 pregões', directionScore: -0.5, summary: 'Amplitude moderada.' },
        { name: 'Juros DI Futuro (Brasil)', weight: 15, period: '21 pregões', directionScore: -1.0, summary: 'DI em alta de 21p.' },
        { name: 'Câmbio Dólar / BRL', weight: 10, period: '21 pregões', directionScore: -0.5, summary: 'Dólar volátil.' },
        { name: 'Risco Global (Treasury 10Y & VIX)', weight: 10, period: '21 pregões', directionScore: 0.0, summary: 'VIX estável.' },
        { name: 'Ouro & Ativos de Proteção', weight: 10, period: '21 pregões', directionScore: 1.0, summary: 'Ouro em tendência 21p.' }
      ],
      regulatoryPrinciples: [
        'Natureza Estritamente Educacional & Analítica: Não constitui recomendação de investimento.',
        'Ausência de Automação Compulsória: O sistema nunca executa ordens nem altera posições.',
        'Janela Canônica de 21 Pregões: Rejeição formal de oscilações de curto prazo (1 pregão).',
        'Correlação não é Causalidade: Bússola probabilística de apoio à decisão.'
      ]
    }
  };

  model.hydrateFromPipelineSnapshot(mockSnapshot);
  const scenario = model.getIndicativeRebalanceScenario();

  assert.equal(scenario.confidenceLevel, 'ALTA');
  assert.equal(scenario.postureLabel, 'Postura Defensiva & Seletiva (Preservação de Capital)');
  assert.equal(scenario.hasBinarySuperRisk, false);
  assert.equal(scenario.evidences.length, 7, 'Deve conter as 7 dimensões do radar macro');

  // Verifica soma de 100% e múltiplos de 5%
  let sumSuggested = 0;
  scenario.comparisonRows.forEach(row => {
    assert.equal(row.suggestedPct % 5, 0, `Sugestão para ${row.key} deve ser múltiplo de 5%`);
    sumSuggested += row.suggestedPct;
    assert.ok(['increase', 'decrease', 'maintain'].includes(row.action));
  });
  assert.equal(sumSuggested, 100, 'A soma das sugestões deve totalizar exatamente 100%');
});

test('Feature 12 — Motor de Alocação: fallback autônomo mantém múltiplos de 5% e soma estrita de 100%', () => {
  const model = new CapitalIntelligenceModel();
  const scenario = model.getIndicativeRebalanceScenario();

  assert.ok(scenario.comparisonRows.length >= 5, 'Deve conter ao menos as 5 classes canônicas');
  let sumSuggested = 0;
  scenario.comparisonRows.forEach(row => {
    assert.equal(row.suggestedPct % 5, 0, `Sugestão para ${row.key} deve ser múltiplo de 5%`);
    sumSuggested += row.suggestedPct;
    assert.ok(row.actionLabel);
    assert.ok(row.rationale || row.postureGuidance);
  });
  assert.equal(sumSuggested, 100, 'Fallback deve somar rigorosamente 100%');
  assert.ok(scenario.evidences.length >= 5, 'Fallback deve fornecer radar de evidências de 21 pregões');
  assert.ok(scenario.disclaimer.includes('NÃO VINCULANTE'));
});

test('Feature 12 — UI Controller & CSS: Executive Rail e Modal Detalhado possuem todos os seletores e garantias', () => {
  // 1. Executive Rail
  assert.ok(ciJs.includes('ciAllocationSummaryBtn'), 'Botão do Executive Rail obrigatório');
  assert.ok(ciJs.includes('ci-alloc-confidence-badge'), 'Badge de confiança no Rail obrigatório');
  assert.ok(ciJs.includes('21 Pregões'), 'Tag de 21 pregões obrigatória no Rail');
  assert.ok(ciJs.includes('ci-alloc-cta'), 'Call to action para análise completa');

  // 2. Modal Detalhado de Alocação
  assert.ok(ciJs.includes('ci-allocation-modal-card'), 'Modal card dedicado de alocação');
  assert.ok(ciJs.includes('Comparativo Estrutural de Alocação'), 'Seção 1 do modal');
  assert.ok(ciJs.includes('Múltiplos de 5%'), 'Declaração explícita de múltiplos de 5%');
  assert.ok(ciJs.includes('Radar de Evidências Macroeconômicas (Janela: 21 Pregões)'), 'Seção 2 do modal');
  assert.ok(ciJs.includes('Eventos Macroeconômicos Considerados'), 'Seção 3 do modal');
  assert.ok(ciJs.includes('Matriz de Riscos, Premissas e Salvaguardas'), 'Seção 4 do modal');

  // 3. Salvaguarda Binária
  assert.ok(ciJs.includes('ci-alloc-super-risk-alert'), 'Alerta de salvaguarda binária no modal');
  assert.ok(ciJs.includes('Decisão de taxa de juros'), 'Texto explícito de decisão de taxa de juros');

  // 4. CSS
  assert.ok(ciCss.includes('.ci-allocation-modal-card'), 'Estilo do modal amplo');
  assert.ok(ciCss.includes('.ci-alloc-confidence-badge'), 'Estilo do badge de confiança');
  assert.ok(ciCss.includes('.confidence-high'), 'Variante ALTA de confiança');
  assert.ok(ciCss.includes('.confidence-mod'), 'Variante MODERADA de confiança');
  assert.ok(ciCss.includes('.confidence-wait'), 'Variante AGUARDAR de confiança');
  assert.ok(ciCss.includes('.ci-alloc-delta'), 'Estilo de delta');
  assert.ok(ciCss.includes('.action-increase'), 'Estilo de ação aumentar');
  assert.ok(ciCss.includes('.action-decrease'), 'Estilo de ação reduzir');
  assert.ok(ciCss.includes('.action-maintain'), 'Estilo de ação manter');
  assert.ok(ciCss.includes('.ci-evidence-grid'), 'Grid de radar de evidências');
  assert.ok(ciCss.includes('.ci-evidence-bar'), 'Barra de score do radar');
});

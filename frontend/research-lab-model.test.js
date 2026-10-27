const test = require('node:test');
const assert = require('node:assert/strict');
const ResearchLabModel = require('./research-lab-model');

test('ResearchLabModel — Constants and Hypotheses Initialization', () => {
  assert.ok(ResearchLabModel.RESEARCH_VERSION.includes('lab'));
  assert.equal(ResearchLabModel.HYPOTHESIS_STATUS.IN_STUDY, 'IN_STUDY');
  assert.equal(ResearchLabModel.STATUS_CONFIG.IN_STUDY.label, 'Em estudo');

  const candidates = ResearchLabModel.getDefaultCandidateRules();
  assert.ok(Array.isArray(candidates));
  assert.ok(candidates.length >= 5);
  assert.equal(candidates[0].id, 'H-001');

  const rejected = ResearchLabModel.getDefaultRejectedRules();
  assert.ok(Array.isArray(rejected));
  assert.ok(rejected.length >= 4);
});

test('ResearchLabModel — MFE Distribution computation', () => {
  const dist = ResearchLabModel.computeMfeDistribution();
  assert.ok(dist.rows.length >= 6);
  assert.equal(dist.rows[0].threshold, '≥ 2R');
  assert.equal(dist.rows[0].allPct, 72);
  assert.equal(dist.rows[0].gradeAPct, 82);
  assert.equal(dist.rows[0].gradeCPct, 58);
});

test('ResearchLabModel — Trade Velocity comparison', () => {
  const velocity = ResearchLabModel.computeTradeVelocity();
  assert.equal(velocity.fast.count, 412);
  assert.equal(velocity.fast.pct, 33);
  assert.equal(velocity.fast.mfeAvgR, 5.8);
  assert.equal(velocity.slow.count, 836);
  assert.equal(velocity.slow.pct, 67);
  assert.equal(velocity.slow.mfeAvgR, 3.4);
});

test('ResearchLabModel — Giveback metrics and extreme cases', () => {
  const giveback = ResearchLabModel.computeGivebackMetrics();
  assert.equal(giveback.givebackAvgR, 2.1);
  assert.equal(giveback.givebackMedianR, 1.4);
  assert.equal(giveback.givebackPctOfMfe, 48);
  assert.ok(giveback.extremeCases.length >= 5);
  assert.equal(giveback.extremeCases[0].id, '#1087');
  assert.equal(giveback.extremeCases[0].givebackR, 14.1);
});

test('ResearchLabModel — Warning signals before giveback', () => {
  const signals = ResearchLabModel.computeWarningSignals();
  assert.equal(signals.length, 7);
  assert.equal(signals[0].signal, 'Aceleração');
  assert.equal(signals[0].occurrences, 428);
  assert.equal(signals[0].givebackProbPct, 62);
});

test('ResearchLabModel — Exit policies comparison (Benchmark vs Mechanical vs Contextual)', () => {
  const policies = ResearchLabModel.getExitPoliciesComparison();
  assert.ok(policies.benchmarkTrailingPuro);
  assert.ok(policies.mechanicalSellIntoStrength);
  assert.ok(policies.contextualSellIntoStrength);

  assert.equal(policies.benchmarkTrailingPuro.expectancyR, 0.58);
  assert.equal(policies.mechanicalSellIntoStrength.expectancyR, 0.69);
  assert.equal(policies.mechanicalSellIntoStrength.expectancyDeltaPct, 19);
  assert.equal(policies.contextualSellIntoStrength.expectancyR, 0.81);
  assert.equal(policies.contextualSellIntoStrength.expectancyDeltaPct, 40);
});

test('ResearchLabModel — Signal Diagnosis and official vs research audit', () => {
  // Official-approved trade: RS 85, Grade A, Cycle Positivo
  const diagOfficial = ResearchLabModel.diagnoseSignal({
    symbol: 'PETR4',
    signalDate: '2026-05-10',
    triggerName: 'Inside Bar',
    grade: 'A',
    rsScore: 85,
    marketCycle: 'Positivo',
    trendAlignment: { isValid: true }
  });
  assert.equal(diagOfficial.officialAccepted, true);
  assert.equal(diagOfficial.researchAccepted, true);
  assert.equal(diagOfficial.relaxedFilters.length, 0);

  // Sub-80 RS trade: RS 72, Grade B, Cycle Positivo
  const diagSub80 = ResearchLabModel.diagnoseSignal({
    symbol: 'VALE3',
    signalDate: '2026-05-10',
    triggerName: 'Inside Bar',
    grade: 'B',
    rsScore: 72,
    marketCycle: 'Positivo',
    trendAlignment: { isValid: true }
  });
  assert.equal(diagSub80.officialAccepted, false);
  assert.equal(diagSub80.researchAccepted, true);
  assert.ok(diagSub80.relaxedFilters.includes('Força Relativa RS ≥ 80'));

  // Grade D trade:
  const diagGradeD = ResearchLabModel.diagnoseSignal({
    symbol: 'COGN3',
    signalDate: '2026-05-10',
    triggerName: 'Inside Bar',
    grade: 'D',
    rsScore: 88,
    marketCycle: 'Positivo',
    trendAlignment: { isValid: true }
  });
  assert.equal(diagGradeD.officialAccepted, false);
  assert.ok(diagGradeD.relaxedFilters.includes('Qualidade do Setup (Grade A+, A, B, C)'));
});

test('ResearchLabModel — Full Dashboard Assembly', () => {
  const dash = ResearchLabModel.buildResearchLabDashboard();
  assert.equal(dash.modeBadge, 'MODO PESQUISA — REGRAS ABERTAS');
  assert.equal(dash.evidenceOverview.totalTrades, 1248);
  assert.equal(dash.evidenceOverview.gradeA.count, 412);
  assert.equal(dash.statusSummary.discoveriesCount, 18);
  assert.equal(dash.statusSummary.hypothesesInStudyCount, 7);
  assert.equal(dash.currentSellIntoStrengthPolicy.version, 'v2.3');

  // Verify 3-Tab integrations
  assert.ok(dash.gradeByTrigger, 'gradeByTrigger should be assembled');
  assert.ok(dash.riskScenarios, 'riskScenarios should be assembled');
  assert.ok(dash.rubricComparison, 'rubricComparison should be assembled');
  assert.ok(dash.riskScenarios.NORMAL, 'Normal scenario must be present');
  assert.ok(dash.riskScenarios.STRESS_STREAK, 'Stress streak scenario must be present');
});

test('ResearchLabModel — Motor Compartilhado Delegations (Grade by Trigger, Risk Scenarios, Mode Comparison)', () => {
  const sampleSims = [
    {
      symbol: 'PETR4',
      triggerName: 'Inside Bar',
      entryPrice: 30.00,
      stopLoss: 29.00,
      distance: 1.00,
      atr: 1.00,
      grade: 'A',
      rubricScore: 88,
      rsScore: 92,
      resultR: 2.0,
      status: 'CLOSED_GAIN'
    },
    {
      symbol: 'VALE3',
      triggerName: 'Inside Bar',
      entryPrice: 60.00,
      stopLoss: 58.00,
      distance: 2.00,
      atr: 2.00,
      grade: 'B',
      rubricScore: 78,
      rsScore: 84,
      resultR: -1.0,
      status: 'CLOSED_LOSS'
    }
  ];

  const gradeMatrix = ResearchLabModel.analyzeGradeByTrigger(sampleSims);
  assert.ok(gradeMatrix['Inside Bar']);
  assert.ok(gradeMatrix['Inside Bar'].ALL);
  assert.equal(gradeMatrix['Inside Bar'].ALL.opportunitiesCount, 2);

  const riskScenarios = ResearchLabModel.runRubricRiskScenarios(sampleSims);
  assert.ok(riskScenarios.NORMAL);
  assert.ok(riskScenarios.LOW_RS);
  assert.ok(riskScenarios.WEAK_CYCLE);
  assert.ok(riskScenarios.WEAK_EDGE);
  assert.ok(riskScenarios.POOR_SELECTION);
  assert.ok(riskScenarios.STRESS_STREAK);

  const rubricComp = ResearchLabModel.compareRubricModes(sampleSims);
  assert.ok(rubricComp.withRubric);
  assert.ok(rubricComp.withoutRubric);
  assert.ok(rubricComp.selectionEffect);
  assert.ok(rubricComp.sizingEffect);
});

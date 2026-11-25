'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const allocationEngine = require('../src/capital-intelligence-allocation');

describe('Capital Intelligence — Motor de Sugestão de Alocação (21 Pregões)', () => {

  test('Princípio 1: normalizeToHundred sempre soma exatamente 100% e apenas usa múltiplos de 5%', () => {
    const rawCases = [
      { fixedIncome: 42, localEquities: 18, globalEquities: 16, goldProtection: 9, cashLiquidity: 15 },
      { fixedIncome: 58, localEquities: 7, globalEquities: 12, goldProtection: 6, cashLiquidity: 17 },
      { fixedIncome: 31, localEquities: 29, globalEquities: 24, goldProtection: 8, cashLiquidity: 8 }
    ];

    rawCases.forEach(input => {
      const res = allocationEngine.normalizeToHundred(input);
      const sum = Object.values(res).reduce((a, b) => a + b, 0);
      assert.equal(sum, 100, 'A soma das classes sugeridas deve totalizar exatamente 100%');
      Object.entries(res).forEach(([key, val]) => {
        assert.equal(val % 5, 0, `Valor da classe ${key} (${val}%) deve ser estritamente múltiplo de 5%`);
      });
    });
  });

  test('Princípio 2: Rejeição de Falsa Precisão e Janela Canônica de 21 Pregões', () => {
    const snapshotMock = {
      spheres: {
        cycle_br: { state: 'defense', change21dPct: -4.5, return21d: -4.5, status: 'atualizado' },
        cycle_us: { state: 'expansion', change21dPct: 3.2, return21d: 3.2, status: 'atualizado' },
        breadth_us: { pctAboveMa50: 65, status: 'atualizado' },
        rate_di: { delta21dPp: 0.45, status: 'atualizado' }, // Abertura forte da curva DI
        dollar_fx: { change21dPct: 2.8, status: 'atualizado' }, // Dólar em alta
        us_treasury_vix: { latestValue: 15.2, change21dPct: -5.0, status: 'atualizado' },
        gold_protection: { change21dPct: 3.8, return21d: 3.8, status: 'atualizado' },
        macro_events: { upcomingEvents: [] }
      }
    };

    const portfolioMock = {
      isLive: true,
      operationalEquity: 500000,
      allocationByClass: {
        BRAZIL_EQUITIES: { percentage: 40.0 },
        BDRS_INTERNATIONAL: { percentage: 10.0 },
        FIXED_INCOME_CASH: { percentage: 50.0 }
      },
      liquidity: { cashPercentage: 10.0 }
    };

    const suggestion = allocationEngine.buildAllocationSuggestion({
      snapshot: snapshotMock,
      portfolioDimension: portfolioMock,
      now: new Date('2026-11-24T18:00:00Z')
    });

    assert.equal(suggestion.horizon, '21 pregões (Trend Following Macro)');
    assert.ok(['ALTA', 'MODERADA'].includes(suggestion.confidenceLevel), 'Confiança deve ser válida e fundamentada');
    assert.ok(suggestion.comparisonRows.length === 5, 'Deve cobrir as 5 macro-classes estratégicas');

    // Com Brasil em defesa e DI abrindo, Ações BR deve ter sugestão de redução
    const brRow = suggestion.comparisonRows.find(r => r.key === 'localEquities');
    assert.ok(brRow.suggestedPct < brRow.currentPct, 'Deve sugerir redução da exposição excessiva em Ações BR (40%) sob ciclo de defesa');
    assert.equal(brRow.action, 'decrease');
    assert.ok(brRow.suggestedPct % 5 === 0, 'Percentual sugerido deve ser múltiplo de 5%');

    // Valida que nenhuma posição ou ordem foi executada
    assert.equal(portfolioMock.operationalEquity, 500000, 'Patrimônio do usuário não pode ser alterado');
  });

  test('Princípio 3: Salvaguarda de Dados Insuficientes — Bloqueia sugestão agressiva e recomenda Aguardar / Manter', () => {
    const incompleteSnapshot = {
      spheres: {
        cycle_br: { status: 'indisponivel' },
        cycle_us: { status: 'indisponivel' },
        breadth_us: { status: 'indisponivel' },
        rate_di: { delta21dPp: 0.1, status: 'atualizado' }
      }
    };

    const suggestion = allocationEngine.buildAllocationSuggestion({
      snapshot: incompleteSnapshot,
      now: new Date('2026-11-24T18:00:00Z')
    });

    assert.equal(suggestion.confidenceLevel, 'BAIXA / AGUARDAR');
    assert.equal(suggestion.isHoldRecommended, true);
    assert.ok(suggestion.postureLabel.includes('Aguardar'));
    assert.ok(suggestion.shortRationale.includes('preservar liquidez') || suggestion.shortRationale.includes('parciais'));
  });

  test('Princípio 4: Salvaguarda de Eventos Macroeconômicos Binários de Alto Risco Iminente', () => {
    const snapshotWithSuperCopom = {
      spheres: {
        cycle_br: { state: 'expansion', change21dPct: 2.0, status: 'atualizado' },
        cycle_us: { state: 'expansion', change21dPct: 2.5, status: 'atualizado' },
        macro_events: {
          upcomingEvents: [
            { id: 'ev_copom', title: 'Decisão de Taxa Selic (Copom)', daysUntil: 2, importance: 'HIGH' }
          ]
        }
      }
    };

    const suggestion = allocationEngine.buildAllocationSuggestion({
      snapshot: snapshotWithSuperCopom,
      now: new Date('2026-11-24T18:00:00Z')
    });

    assert.equal(suggestion.hasBinarySuperRisk, true);
    assert.equal(suggestion.confidenceLevel, 'MODERADA');
    assert.ok(suggestion.postureLabel.includes('Prudente'));
    assert.ok(suggestion.eventsNote.includes('Copom'));
  });

  test('Princípio 5: Evidências Contraditórias recomendam Manter Alocação & Aguardar Confluência', () => {
    const contradictorySnapshot = {
      spheres: {
        cycle_br: { state: 'expansion', change21dPct: 5.0, status: 'atualizado' }, // Bolsa subindo forte
        rate_di: { delta21dPp: 0.85, status: 'atualizado' }, // Mas curva de juros abrindo violentamente (+85 bps)
        breadth_us: { pctAboveMa50: 35, status: 'atualizado' } // Breadth fraco
      }
    };

    const suggestion = allocationEngine.buildAllocationSuggestion({
      snapshot: contradictorySnapshot,
      now: new Date('2026-11-24T18:00:00Z')
    });

    assert.equal(suggestion.isHoldRecommended, true);
    assert.ok(suggestion.postureLabel.includes('Manter Alocação') || suggestion.postureLabel.includes('Aguardar'));
  });
});

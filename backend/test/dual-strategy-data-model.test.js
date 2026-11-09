const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  normalizePlan,
  updateTrade,
  updateTradeStrategy,
  listPlans
} = require('../src/trades');
const { StrategyWorkspaceModel, STRATEGIES } = require('../../frontend/strategy-workspace-model');

test('PASSO 2 — Migração 043: integridade do script SQL de migração e rollback', () => {
  const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '043_dual_strategy_trades.sql');
  const rollbackPath = path.join(__dirname, '..', 'db', 'rollback', '043_rollback_dual_strategy_trades.sql');

  assert.ok(fs.existsSync(migrationPath), 'Arquivo de migração 043 deve existir');
  assert.ok(fs.existsSync(rollbackPath), 'Arquivo de rollback 043 deve existir');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

  // Validações da migração
  assert.ok(migrationSql.includes('strategy_type'), 'Deve adicionar coluna strategy_type');
  assert.ok(migrationSql.includes('strategy_config_id'), 'Deve adicionar coluna strategy_config_id');
  assert.ok(migrationSql.includes('strategy_config_version'), 'Deve adicionar coluna strategy_config_version');
  assert.ok(migrationSql.includes('entry_setup'), 'Deve adicionar coluna entry_setup');
  assert.ok(migrationSql.includes('exit_reason'), 'Deve adicionar coluna exit_reason');
  assert.ok(migrationSql.includes('rubric_version'), 'Deve adicionar coluna rubric_version');

  // CHECK constraint
  assert.ok(migrationSql.includes('trades_strategy_type_check'), 'Deve conter constraint trades_strategy_type_check');
  assert.ok(migrationSql.includes("'TREND_FOLLOWING'"), 'Deve suportar TREND_FOLLOWING');
  assert.ok(migrationSql.includes("'VOLATILITY_TRADING'"), 'Deve suportar VOLATILITY_TRADING');

  // Backfill idempotente
  assert.ok(migrationSql.includes("SET strategy_type = 'TREND_FOLLOWING'"), 'Backfill deve definir TREND_FOLLOWING');
  assert.ok(migrationSql.includes('ALTER COLUMN strategy_type SET NOT NULL'), 'strategy_type deve ser NOT NULL após backfill');

  // Extensão de app.trade_simulations
  assert.ok(migrationSql.includes('app.trade_simulations'), 'Deve estender simulações de trades');
  assert.ok(migrationSql.includes('idx_trades_user_strategy'), 'Deve criar índice por usuário e estratégia');

  // Validações do rollback
  assert.ok(rollbackSql.includes('DROP INDEX IF EXISTS app.idx_trades_user_strategy'), 'Rollback deve remover índice');
  assert.ok(rollbackSql.includes('DROP CONSTRAINT IF EXISTS trades_strategy_type_check'), 'Rollback deve remover constraint');
  assert.ok(rollbackSql.includes('DROP COLUMN IF EXISTS strategy_type'), 'Rollback deve remover strategy_type');
  assert.ok(rollbackSql.includes('DROP COLUMN IF EXISTS entry_setup'), 'Rollback deve remover entry_setup');
  assert.ok(rollbackSql.includes('DROP COLUMN IF EXISTS exit_reason'), 'Rollback deve remover exit_reason');
});

test('PASSO 2 — normalizePlan: padrão seguro TREND_FOLLOWING e preservação integral dos dados', () => {
  const plan = normalizePlan({
    asset: 'VALE3',
    entry: 60.5,
    stop: 58.0,
    atr: 1.5,
    suggestedQty: 200,
    executedQty: 200,
    riskPct: 0.005,
    rubricScore: 88,
    rubricMaxScore: 100,
    grade: 'A',
    setup: 'Breakout de Consolidação',
    setupTrigger: 'breakout_consolidation',
    rubricResponses: { trendStrength: 2 },
    rubricContributions: [{ key: 'trendStrength', value: 2, points: 2, weight: 1 }]
  });

  // Identificação mandatória de estratégia por padrão
  assert.equal(plan.strategyType, 'TREND_FOLLOWING');
  assert.equal(plan.strategy_type, 'TREND_FOLLOWING');
  assert.equal(plan.metadata.strategyType, 'TREND_FOLLOWING');
  assert.equal(plan.entrySetup, 'Breakout');
  assert.equal(plan.rubricVersion, '2');

  // Preservação de dados existentes sem reinterpretação
  assert.equal(plan.ticker, 'VALE3');
  assert.equal(plan.entry, 60.5);
  assert.equal(plan.stop, 58.0);
  assert.equal(plan.plannedQuantity, 200);
  assert.equal(plan.riskPct, 0.005);
  assert.equal(plan.rubricGrade, 'A');
  assert.equal(plan.setupTrigger, 'BREAKOUT');
});

test('PASSO 2 — normalizePlan: suporte a VOLATILITY_TRADING e metadados de configuração e versão', () => {
  const plan = normalizePlan({
    asset: 'PETR4',
    entry: 38.0,
    stop: 36.5,
    atr: 0.9,
    suggestedQty: 300,
    executedQty: 300,
    riskPct: 0.004,
    rubricScore: 75,
    rubricMaxScore: 100,
    grade: 'B',
    strategyType: 'VOLATILITY_TRADING',
    strategyConfigId: 'vol_mean_reversion_short_cycle',
    strategyConfigVersion: '1.2.0',
    entrySetup: 'Rompimento de Canal de Keltner',
    rubricVersion: 'vol_v1',
    exitReason: 'Alvo em Bandas de Bollinger atingido',
    rubricResponses: { volatilityEdge: 2 },
    rubricContributions: [{ key: 'volatilityEdge', value: 2, points: 2, weight: 1 }]
  });

  assert.equal(plan.strategyType, 'VOLATILITY_TRADING');
  assert.equal(plan.strategy_type, 'VOLATILITY_TRADING');
  assert.equal(plan.strategyConfigId, 'vol_mean_reversion_short_cycle');
  assert.equal(plan.strategyConfigVersion, '1.2.0');
  assert.equal(plan.entrySetup, 'Rompimento de Canal de Keltner');
  assert.equal(plan.rubricVersion, 'vol_v1');
  assert.equal(plan.exitReason, 'Alvo em Bandas de Bollinger atingido');

  // Metadados também contêm os campos para auditoria serializada
  assert.equal(plan.metadata.strategyType, 'VOLATILITY_TRADING');
  assert.equal(plan.metadata.strategyConfigId, 'vol_mean_reversion_short_cycle');
  assert.equal(plan.metadata.strategyConfigVersion, '1.2.0');
});

test('PASSO 2 — normalizePlan: rejeita estratégia inválida com erro descritivo', () => {
  assert.throws(() => {
    normalizePlan({
      asset: 'BBAS3',
      entry: 28.0,
      stop: 27.0,
      suggestedQty: 100,
      executedQty: 100,
      riskPct: 0.005,
      grade: 'B',
      strategyType: 'DAY_TRADE_SCALPING'
    });
  }, (err) => {
    return err.status === 400 && err.message.includes('Estratégia inválida: "DAY_TRADE_SCALPING"');
  });
});

test('PASSO 2 — Imutabilidade: edição comum bloqueia alteração de estratégia', async () => {
  const fakeUserId = 'user-123';
  const fakeTradeId = '00000000-0000-0000-0000-000000000001';

  // Tentativa de alterar strategyType via updateTrade regular deve ser rejeitada
  await assert.rejects(
    async () => {
      await updateTrade(fakeUserId, fakeTradeId, { strategyType: 'VOLATILITY_TRADING' });
    },
    (err) => {
      return err.status === 400 && err.message.includes('A estratégia de uma operação não pode ser alterada diretamente na edição comum');
    }
  );

  await assert.rejects(
    async () => {
      await updateTrade(fakeUserId, fakeTradeId, { strategy_type: 'VOLATILITY_TRADING' });
    },
    (err) => {
      return err.status === 400 && err.message.includes('A estratégia de uma operação não pode ser alterada diretamente na edição comum');
    }
  );
});

test('PASSO 2 — Reclassificação Administrativa: exige justificativa e gera trilha de auditoria', async () => {
  const fakeUserId = 'admin-user-456';
  const fakeTradeId = '00000000-0000-0000-0000-000000000002';

  // Justificativa ausente ou curta deve ser rejeitada
  await assert.rejects(
    async () => {
      await updateTradeStrategy(fakeUserId, fakeTradeId, {
        newStrategyType: 'VOLATILITY_TRADING',
        auditReason: 'erro' // menos de 5 chars
      });
    },
    (err) => {
      return err.status === 400 && err.message.includes('Justificativa de auditoria é obrigatória');
    }
  );

  // Nova estratégia inválida deve ser rejeitada
  await assert.rejects(
    async () => {
      await updateTradeStrategy(fakeUserId, fakeTradeId, {
        newStrategyType: 'UNKNOWN_STRATEGY',
        auditReason: 'Justificativa válida com mais de cinco caracteres'
      });
    },
    (err) => {
      return err.status === 400 && err.message.includes('Estratégia inválida');
    }
  );
});

test('PASSO 2 — Integração Frontend-Backend: getStrategyForTrade resolve case insensitivity e preserva imutabilidade', () => {
  const workspace = new StrategyWorkspaceModel();

  const tradeLegacy = { id: 't1', ticker: 'WEGE3' }; // sem estratégia
  const tradeUpperTrend = { id: 't2', ticker: 'PETR4', strategy_type: 'TREND_FOLLOWING' };
  const tradeUpperVol = { id: 't3', ticker: 'PRIO3', strategy_type: 'VOLATILITY_TRADING' };
  const tradeLowerTrend = { id: 't4', ticker: 'ITUB4', strategyType: 'trend_following' };
  const tradeLowerVol = { id: 't5', ticker: 'VALE3', strategyType: 'volatility_trading' };
  const tradeMeta = { id: 't6', ticker: 'BBAS3', metadata: { strategyType: 'VOLATILITY_TRADING' } };

  assert.equal(workspace.getStrategyForTrade(tradeLegacy), STRATEGIES.TREND_FOLLOWING);
  assert.equal(workspace.getStrategyForTrade(tradeUpperTrend), STRATEGIES.TREND_FOLLOWING);
  assert.equal(workspace.getStrategyForTrade(tradeUpperVol), STRATEGIES.VOLATILITY_TRADING);
  assert.equal(workspace.getStrategyForTrade(tradeLowerTrend), STRATEGIES.TREND_FOLLOWING);
  assert.equal(workspace.getStrategyForTrade(tradeLowerVol), STRATEGIES.VOLATILITY_TRADING);
  assert.equal(workspace.getStrategyForTrade(tradeMeta), STRATEGIES.VOLATILITY_TRADING);

  // A alternância do mundo ativo na UI JAMAIS altera os trades
  workspace.setActiveStrategy(STRATEGIES.VOLATILITY_TRADING);
  assert.equal(workspace.getStrategyForTrade(tradeUpperTrend), STRATEGIES.TREND_FOLLOWING);
  assert.equal(workspace.getStrategyForTrade(tradeLegacy), STRATEGIES.TREND_FOLLOWING);

  // Filtro por estratégia
  const list = [tradeLegacy, tradeUpperTrend, tradeUpperVol, tradeLowerTrend, tradeLowerVol, tradeMeta];
  const trendFiltered = workspace.filterTradesByStrategy(list, 'TREND_FOLLOWING');
  const volFiltered = workspace.filterTradesByStrategy(list, 'VOLATILITY_TRADING');
  const consolidated = workspace.filterTradesByStrategy(list, 'all');

  assert.equal(trendFiltered.length, 3, 'Deve conter os 3 trades de tendência');
  assert.equal(volFiltered.length, 3, 'Deve conter os 3 trades de volatilidade');
  assert.equal(consolidated.length, 6, 'Visão consolidada deve conter 100% dos trades');
});

test('PASSO 2 — listPlans: suporte a filtro SQL de estratégia e mapeamento resiliente para histórico legado', async () => {
  const database = require('../src/database');
  const originalQuery = database.query;

  let capturedSql = null;
  let capturedValues = null;

  try {
    database.query = async (sql, values) => {
      capturedSql = sql;
      capturedValues = values;
      return {
        rows: [
          {
            id: 'legacy-trade-1',
            ticker: 'WEGE3',
            strategy_type: null, // histórico antes da migração ou legado
            strategy_config_id: null,
            strategy_config_version: null,
            entry_setup: null,
            exit_reason: null,
            rubric_version: null,
            setup: '9.1 Compra',
            setup_trigger: 'EMA9_CROSSOVER',
            status: 'closed',
            metadata: { gradingVersion: 2 }
          },
          {
            id: 'vol-trade-2',
            ticker: 'PRIO3',
            strategy_type: 'VOLATILITY_TRADING',
            strategy_config_id: 'vol_mean_rev_v1',
            strategy_config_version: '1.0',
            entry_setup: 'Keltner Reversal',
            exit_reason: 'Stop móvel atingido',
            rubric_version: 'vol_2',
            setup: 'Keltner Reversal',
            status: 'closed',
            metadata: { gradingVersion: 2 }
          }
        ]
      };
    };

    // 1. Chamada sem filtro (visão consolidada ou padrão)
    const allTrades = await listPlans('user-test-1');
    assert.ok(capturedSql.includes('t.strategy_type'), 'Deve selecionar t.strategy_type');
    assert.ok(capturedSql.includes('t.strategy_config_id'), 'Deve selecionar t.strategy_config_id');
    assert.ok(!capturedSql.includes('UPPER(COALESCE(t.strategy_type'), 'Não deve filtrar por estratégia se não solicitado');
    assert.deepEqual(capturedValues, ['user-test-1']);

    // O trade legado deve receber o fallback seguro TREND_FOLLOWING
    assert.equal(allTrades[0].strategyType, 'TREND_FOLLOWING');
    assert.equal(allTrades[0].strategy_type, 'TREND_FOLLOWING');
    assert.equal(allTrades[0].entrySetup, 'EMA9_CROSSOVER');
    assert.equal(allTrades[0].rubricVersion, '2');

    // O trade de volatilidade preserva seus dados exatos
    assert.equal(allTrades[1].strategyType, 'VOLATILITY_TRADING');
    assert.equal(allTrades[1].strategyConfigId, 'vol_mean_rev_v1');
    assert.equal(allTrades[1].entrySetup, 'Keltner Reversal');
    assert.equal(allTrades[1].exitReason, 'Stop móvel atingido');

    // 2. Chamada com filtro de estratégia
    await listPlans('user-test-1', { strategy: 'VOLATILITY_TRADING' });
    assert.ok(capturedSql.includes('UPPER(COALESCE(t.strategy_type, \'TREND_FOLLOWING\')) = $2'), 'Deve aplicar cláusula de filtro');
    assert.deepEqual(capturedValues, ['user-test-1', 'VOLATILITY_TRADING']);
  } finally {
    database.query = originalQuery;
  }
});

test('PASSO 2 — updateTradeStrategy: reclassificação administrativa bem-sucedida com auditoria gravada', async () => {
  const database = require('../src/database');
  const originalTransaction = database.transaction;

  let updateCalled = false;
  let updateParams = null;

  try {
    database.transaction = async (callback) => {
      const mockClient = {
        query: async (sql, values) => {
          if (sql.includes('SELECT id, ticker, status, strategy_type, metadata FROM app.trades')) {
            return {
              rowCount: 1,
              rows: [{
                id: '00000000-0000-0000-0000-000000000010',
                ticker: 'VALE3',
                status: 'open',
                strategy_type: 'TREND_FOLLOWING',
                metadata: { gradingVersion: 2, strategyType: 'TREND_FOLLOWING' }
              }]
            };
          }
          if (sql.includes('UPDATE app.trades')) {
            updateCalled = true;
            updateParams = values;
            return { rowCount: 1 };
          }
          return { rowCount: 0, rows: [] };
        }
      };
      return callback(mockClient);
    };

    const result = await updateTradeStrategy(
      'admin-1',
      '00000000-0000-0000-0000-000000000010',
      {
        newStrategyType: 'VOLATILITY_TRADING',
        auditReason: 'Correção de trade de mean reversion cadastrado por engano na aba de tendência.'
      }
    );

    assert.equal(result.strategyType, 'VOLATILITY_TRADING');
    assert.equal(result.previousStrategy, 'TREND_FOLLOWING');
    assert.ok(updateCalled, 'Deve disparar a query de UPDATE');
    assert.equal(updateParams[2], 'VOLATILITY_TRADING');

    const updatedMetadata = JSON.parse(updateParams[3]);
    assert.equal(updatedMetadata.strategyType, 'VOLATILITY_TRADING');
    assert.ok(Array.isArray(updatedMetadata.strategyAuditTrail), 'Deve gravar array de auditoria');
    assert.equal(updatedMetadata.strategyAuditTrail.length, 1);
    assert.equal(updatedMetadata.strategyAuditTrail[0].from, 'TREND_FOLLOWING');
    assert.equal(updatedMetadata.strategyAuditTrail[0].to, 'VOLATILITY_TRADING');
    assert.ok(updatedMetadata.strategyAuditTrail[0].reason.includes('Correção de trade'));
  } finally {
    database.transaction = originalTransaction;
  }
});

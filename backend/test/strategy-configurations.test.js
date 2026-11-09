const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../../frontend/strategy-configuration-model');
const strategyConfigs = require('../src/strategy-configs');
const database = require('../src/database');

test('PASSO 3 — Migração 044: integridade do script SQL de migração e rollback', () => {
  const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '044_strategy_configurations.sql');
  const rollbackPath = path.join(__dirname, '..', 'db', 'rollback', '044_rollback_strategy_configurations.sql');

  assert.ok(fs.existsSync(migrationPath), 'Arquivo de migração 044 deve existir');
  assert.ok(fs.existsSync(rollbackPath), 'Arquivo de rollback 044 deve existir');

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

  // Colunas da tabela
  assert.ok(migrationSql.includes('app.strategy_configurations'), 'Deve criar app.strategy_configurations');
  assert.ok(migrationSql.includes('strategy_type text NOT NULL'), 'Deve conter strategy_type NOT NULL');
  assert.ok(migrationSql.includes('parameters jsonb NOT NULL'), 'Deve conter parameters jsonb');
  assert.ok(migrationSql.includes('parameters_hash text NOT NULL'), 'Deve conter parameters_hash');
  assert.ok(migrationSql.includes('version text NOT NULL DEFAULT \'1.0\''), 'Deve conter version');
  assert.ok(migrationSql.includes('is_active boolean NOT NULL DEFAULT false'), 'Deve conter is_active');
  assert.ok(migrationSql.includes('status text NOT NULL DEFAULT \'active\''), 'Deve conter status');

  // Extensões de snapshot imutável em simulações e trades
  assert.ok(migrationSql.includes('app.trade_simulations'), 'Deve estender trade_simulations');
  assert.ok(migrationSql.includes('strategy_parameters_snapshot jsonb'), 'Deve adicionar strategy_parameters_snapshot');
  assert.ok(migrationSql.includes('strategy_parameters_hash text'), 'Deve adicionar strategy_parameters_hash');

  // Rollback
  assert.ok(rollbackSql.includes('DROP TABLE IF EXISTS app.strategy_configurations'), 'Rollback deve remover tabela');
  assert.ok(rollbackSql.includes('DROP COLUMN IF EXISTS strategy_parameters_snapshot'), 'Rollback deve remover colunas');
});

test('PASSO 3 — StrategyConfigurationModel: parâmetros oficiais iniciais do Volatility Swing', () => {
  const defaults = model.VOLATILITY_SWING_DEFAULTS;

  assert.equal(defaults.timeframe, 'Diário', 'Timeframe único Diário');
  assert.equal(defaults.fastSmaPeriod, 7, 'Média rápida SMA 7');
  assert.equal(defaults.structuralSmaPeriod, 200, 'Média estrutural SMA 200');
  assert.equal(defaults.indicator, 'IFR', 'Indicador IFR');
  assert.equal(defaults.rsiPeriod, 2, 'Período do IFR 2');
  assert.equal(defaults.oversoldLevel, 10, 'Nível de sobrevenda 10');
  assert.equal(defaults.priceCondition, 'CLOSE_BELOW_FAST_SMA', 'Fechamento abaixo da SMA curta');
  assert.equal(defaults.structuralFilter, 'CLOSE_ABOVE_STRUCTURAL_SMA', 'Fechamento acima da SMA longa');
  assert.equal(defaults.recoveryExit, 'CLOSE_ABOVE_FAST_SMA', 'Saída por fechamento acima da SMA curta');
  assert.equal(defaults.maxHoldingDays, 7, 'Saída temporal de 7 pregões completos');
  assert.equal(defaults.positionSizingMethod, 'FIXED_CAPITAL', 'Position sizing por capital fixo');
  assert.equal(defaults.fixedCapitalPerTrade, 10000, 'Capital configurável');
  assert.equal(defaults.stopLossEnabled, false, 'Stop desabilitado inicialmente');
});

test('PASSO 3 — StrategyConfigurationModel: separação de parâmetros e validação rigorosa', () => {
  // 1. Validação bem-sucedida com parâmetros válidos
  const valid = model.validateParameters(model.STRATEGY_TYPES.VOLATILITY_TRADING, {
    timeframe: 'Diário',
    fastSmaPeriod: 7,
    structuralSmaPeriod: 200,
    indicator: 'IFR',
    rsiPeriod: 2,
    oversoldLevel: 5, // Experimento IFR 2 nível 5
    maxHoldingDays: 7,
    fixedCapitalPerTrade: 15000
  });

  assert.equal(valid.rsiPeriod, 2, 'Período do IFR independente');
  assert.equal(valid.oversoldLevel, 5, 'Nível de sobrevenda independente');
  assert.equal(valid.fixedCapitalPerTrade, 15000);

  // 2. Rejeição de média curta >= média estrutural
  assert.throws(() => {
    model.validateParameters(model.STRATEGY_TYPES.VOLATILITY_TRADING, {
      fastSmaPeriod: 50,
      structuralSmaPeriod: 50
    });
  }, /A média curta deve ser estritamente menor que a média estrutural/);

  // 3. Rejeição de nível de sobrevenda fora da faixa permitida
  assert.throws(() => {
    model.validateParameters(model.STRATEGY_TYPES.VOLATILITY_TRADING, {
      fastSmaPeriod: 7,
      structuralSmaPeriod: 200,
      oversoldLevel: 60 // fora do range 1 a 40
    });
  }, /Nível de sobrevenda do IFR/);

  // 4. Rejeição de timeframe diferente de Diário
  assert.throws(() => {
    model.validateParameters(model.STRATEGY_TYPES.VOLATILITY_TRADING, {
      timeframe: '60min',
      fastSmaPeriod: 7,
      structuralSmaPeriod: 200
    });
  }, /timeframe operacional homologado.*é o Diário/);
});

test('PASSO 3 — StrategyConfigurationModel: 4 experimentos pré-calibrados para Volatility Trading', () => {
  const experiments = model.getPresetExperiments(model.STRATEGY_TYPES.VOLATILITY_TRADING);
  assert.equal(experiments.length, 4, 'Devem existir exatamente 4 experimentos padrão');

  const levels = experiments.map(e => e.parameters.oversoldLevel);
  assert.deepEqual(levels, [10, 5, 15, 20], 'Experimentos de sobrevenda: 10 (padrão), 5 (extrema), 15 (moderada), 20 (ampla)');

  // O padrão inicial deve ser Nível 10 ativo
  assert.equal(experiments[0].isActive, true);
  assert.equal(experiments[1].isActive, false);
  assert.equal(experiments[2].isActive, false);
  assert.equal(experiments[3].isActive, false);
});

test('PASSO 3 — Trend Following preservado: parâmetros isolados sem contaminação', () => {
  const tfPresets = model.getPresetExperiments(model.STRATEGY_TYPES.TREND_FOLLOWING);
  assert.equal(tfPresets.length, 1);
  assert.equal(tfPresets[0].name, 'Trend Following — Oficial Healthy Trend');

  const params = tfPresets[0].parameters;
  assert.ok(params.rubricMinScore >= 85, 'Preserva Rubric de 100 pontos');
  assert.ok(params.trendFilter.includes('EMA21'), 'Preserva alinhamento de médias móveis');
  assert.equal(params.scaleInEnabled, true, 'Preserva regras de piramidagem');

  // Não deve conter parâmetros exclusivos do Volatility
  assert.equal(params.oversoldLevel, undefined);
  assert.equal(params.rsiPeriod, undefined);
});

test('PASSO 3 — Hash determinístico e Snapshots imutáveis', () => {
  const params1 = { fastSmaPeriod: 7, structuralSmaPeriod: 200, oversoldLevel: 10, rsiPeriod: 2 };
  // Mesmos parâmetros em ordem invertida de chaves
  const params2 = { rsiPeriod: 2, oversoldLevel: 10, structuralSmaPeriod: 200, fastSmaPeriod: 7 };
  // Parâmetro alterado
  const params3 = { fastSmaPeriod: 7, structuralSmaPeriod: 200, oversoldLevel: 5, rsiPeriod: 2 };

  const hash1 = model.computeParametersHash(params1);
  const hash2 = model.computeParametersHash(params2);
  const hash3 = model.computeParametersHash(params3);

  assert.equal(hash1, hash2, 'Hash deve ser determinístico independentemente da ordem das chaves JSON');
  assert.notEqual(hash1, hash3, 'Hash deve mudar quando qualquer parâmetro é alterado');

  const mockProfile = {
    id: 'cfg-100',
    name: 'IFR(2) / Nível 10',
    version: '1.0',
    strategy_type: 'VOLATILITY_TRADING',
    parameters: params1,
    parameters_hash: hash1
  };

  const snapshot = model.createSnapshot(mockProfile);
  assert.equal(snapshot.configId, 'cfg-100');
  assert.equal(snapshot.configVersion, '1.0');
  assert.equal(snapshot.parametersHash, hash1);
  assert.equal(snapshot.parameters.oversoldLevel, 10);
  assert.ok(snapshot.snapshotAt, 'Deve registrar timestamp do snapshot');
});

test('PASSO 3 — Comparador de Perfis: identifica e formata diferenças com clareza', () => {
  const profileA = {
    strategy_type: 'VOLATILITY_TRADING',
    parameters: { ...model.VOLATILITY_SWING_DEFAULTS, oversoldLevel: 10, fixedCapitalPerTrade: 10000 }
  };
  const profileB = {
    strategy_type: 'VOLATILITY_TRADING',
    parameters: { ...model.VOLATILITY_SWING_DEFAULTS, oversoldLevel: 5, fixedCapitalPerTrade: 25000 }
  };

  const diffs = model.compareProfiles(profileA, profileB);
  assert.ok(Array.isArray(diffs), 'Deve retornar array de comparações');

  const oversoldDiff = diffs.find(d => d.key === 'oversoldLevel');
  assert.ok(oversoldDiff);
  assert.equal(oversoldDiff.isDifferent, true);
  assert.equal(oversoldDiff.valueA, 10);
  assert.equal(oversoldDiff.valueB, 5);

  const capitalDiff = diffs.find(d => d.key === 'fixedCapitalPerTrade');
  assert.ok(capitalDiff);
  assert.equal(capitalDiff.isDifferent, true);

  const smaDiff = diffs.find(d => d.key === 'fastSmaPeriod');
  assert.ok(smaDiff);
  assert.equal(smaDiff.isDifferent, false, 'Médias iguais não devem ser marcadas como diferentes');
});

test('PASSO 3 — Duplicação de Perfil: cria fork experimental com versionamento 1.0 desativado', () => {
  const original = {
    id: 'orig-1',
    name: 'IFR(2) / Nível 10 — Padrão Oficial',
    strategy_type: 'VOLATILITY_TRADING',
    version: '1.4',
    is_active: true,
    parameters: { ...model.VOLATILITY_SWING_DEFAULTS, oversoldLevel: 10 }
  };

  const clone = model.duplicateProfile(original, {
    newName: 'Meu Experimento IFR 8',
    parameters: { ...model.VOLATILITY_SWING_DEFAULTS, oversoldLevel: 8 }
  });

  assert.equal(clone.name, 'Meu Experimento IFR 8');
  assert.equal(clone.version, '1.0', 'Clone deve iniciar na versão 1.0');
  assert.equal(clone.is_active, false, 'Clone não pode sobrescrever o perfil ativo em produção');
  assert.equal(clone.parameters.oversoldLevel, 8);
  assert.ok(clone.parameters_hash);
});

test('PASSO 3 — Service Backend: semeadura de defaults, alternância de ativos e versionamento', async () => {
  const originalQuery = database.query;
  const originalTransaction = database.transaction;

  let insertedRows = [];
  let updatedRows = [];

  try {
    database.query = async (sql, values) => {
      if (sql.includes('SELECT count(*) as count FROM app.strategy_configurations')) {
        return { rowCount: 1, rows: [{ count: 0 }] }; // sem perfis, deve semear
      }
      if (sql.includes('INSERT INTO app.strategy_configurations')) {
        insertedRows.push(values);
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes('SELECT id, user_id, strategy_type')) {
        return {
          rowCount: 2,
          rows: [
            {
              id: '00000000-0000-0000-0000-000000000001',
              user_id: values[0],
              strategy_type: 'VOLATILITY_TRADING',
              name: 'IFR(2) / Nível 10',
              description: 'Padrão',
              version: '1.0',
              is_active: true,
              status: 'active',
              parameters: model.VOLATILITY_SWING_DEFAULTS,
              parameters_hash: 'hash1',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            {
              id: '00000000-0000-0000-0000-000000000002',
              user_id: values[0],
              strategy_type: 'VOLATILITY_TRADING',
              name: 'IFR(2) / Nível 5',
              description: 'Experimento',
              version: '1.0',
              is_active: false,
              status: 'active',
              parameters: { ...model.VOLATILITY_SWING_DEFAULTS, oversoldLevel: 5 },
              parameters_hash: 'hash2',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ]
        };
      }
      return { rowCount: 0, rows: [] };
    };

    database.transaction = async (callback) => {
      const mockClient = {
        query: async (sql, values) => {
          if (sql.includes('SELECT id, strategy_type, name, is_active FROM app.strategy_configurations')) {
            return {
              rowCount: 1,
              rows: [{ id: values[0], strategy_type: 'VOLATILITY_TRADING', name: 'IFR(2) / Nível 5', is_active: false }]
            };
          }
          if (sql.includes('UPDATE app.strategy_configurations SET is_active = false')) {
            return { rowCount: 1 };
          }
          if (sql.includes('UPDATE app.strategy_configurations') && sql.includes('SET is_active = true')) {
            return {
              rowCount: 1,
              rows: [{
                id: values[0],
                user_id: values[1],
                strategy_type: 'VOLATILITY_TRADING',
                name: 'IFR(2) / Nível 5',
                version: '1.0',
                is_active: true,
                parameters: { ...model.VOLATILITY_SWING_DEFAULTS, oversoldLevel: 5 },
                parameters_hash: 'hash2'
              }]
            };
          }
          return { rowCount: 0, rows: [] };
        }
      };
      return callback(mockClient);
    };

    // 1. list semeia automaticamente se vazio
    const listResult = await strategyConfigs.list('00000000-0000-0000-0000-000000000099', 'VOLATILITY_TRADING');
    assert.ok(insertedRows.length >= 4, 'Deve semear pelo menos os 4 experimentos oficiais de volatilidade');
    assert.equal(listResult.length, 2);

    // 2. setActive define novo perfil ativo e desativa os concorrentes
    const activated = await strategyConfigs.setActive('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000002');
    assert.equal(activated.id, '00000000-0000-0000-0000-000000000002');
    assert.equal(activated.isActive, true);
    assert.equal(activated.snapshot.parameters.oversoldLevel, 5);

    // 3. bumpVersion incrementa corretamente versões semânticas
    assert.equal(strategyConfigs.bumpVersion('1.0'), '1.1');
    assert.equal(strategyConfigs.bumpVersion('1.9'), '1.10');
    assert.equal(strategyConfigs.bumpVersion('2.3'), '2.4');
  } finally {
    database.query = originalQuery;
    database.transaction = originalTransaction;
  }
});

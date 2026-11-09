const crypto = require('node:crypto');
const database = require('./database');
const model = require('../../frontend/strategy-configuration-model');

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function bumpVersion(versionStr) {
  const v = String(versionStr || '1.0').trim();
  const parts = v.split('.');
  const major = parseInt(parts[0], 10) || 1;
  const minor = parseInt(parts[1], 10) || 0;
  return `${major}.${minor + 1}`;
}

async function ensureDefaults(userId, client = database) {
  const existingRes = await client.query(
    'SELECT count(*) as count FROM app.strategy_configurations WHERE user_id = $1',
    [userId]
  ).catch(() => ({ rowCount: 0, rows: [{ count: 0 }] }));

  const count = parseInt(existingRes.rows[0]?.count || 0, 10);
  if (count > 0) return;

  // Semear perfis iniciais homologados
  const presets = [
    ...model.getPresetExperiments(model.STRATEGY_TYPES.VOLATILITY_TRADING).map(p => ({
      ...p,
      strategy_type: model.STRATEGY_TYPES.VOLATILITY_TRADING
    })),
    ...model.getPresetExperiments(model.STRATEGY_TYPES.TREND_FOLLOWING).map(p => ({
      ...p,
      strategy_type: model.STRATEGY_TYPES.TREND_FOLLOWING
    }))
  ];

  for (const preset of presets) {
    const id = crypto.randomUUID();
    const validatedParams = model.validateParameters(preset.strategy_type, preset.parameters);
    const hash = model.computeParametersHash(validatedParams);

    await client.query(
      `INSERT INTO app.strategy_configurations (
        id, user_id, strategy_type, name, description, version, is_active, status, parameters, parameters_hash
      ) VALUES ($1, $2, $3, $4, $5, '1.0', $6, 'active', $7::jsonb, $8)
      ON CONFLICT (id) DO NOTHING`,
      [id, userId, preset.strategy_type, preset.name, preset.description, preset.isActive, JSON.stringify(validatedParams), hash]
    );
  }
}

async function list(userId, strategyType = null, client = database) {
  await ensureDefaults(userId, client);

  const queryParams = [userId];
  let filterClause = '';
  if (strategyType) {
    const norm = String(strategyType).trim().toUpperCase();
    if ([model.STRATEGY_TYPES.TREND_FOLLOWING, model.STRATEGY_TYPES.VOLATILITY_TRADING].includes(norm)) {
      queryParams.push(norm);
      filterClause = ` AND strategy_type = $${queryParams.length}`;
    }
  }

  const result = await client.query(
    `SELECT id, user_id, strategy_type, name, description, version, is_active, status,
            parameters, parameters_hash, created_at, updated_at
       FROM app.strategy_configurations
      WHERE user_id = $1 AND status != 'archived'${filterClause}
      ORDER BY strategy_type ASC, is_active DESC, created_at ASC`,
    queryParams
  );

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    strategyType: row.strategy_type,
    strategy_type: row.strategy_type,
    name: row.name,
    description: row.description,
    version: row.version,
    isActive: row.is_active,
    is_active: row.is_active,
    status: row.status,
    parameters: row.parameters,
    parametersHash: row.parameters_hash,
    parameters_hash: row.parameters_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
}

async function get(userId, configId, client = database) {
  if (!/^[0-9a-f-]{36}$/i.test(String(configId || ''))) throw invalid('ID de configuração inválido.');

  const res = await client.query(
    `SELECT id, user_id, strategy_type, name, description, version, is_active, status,
            parameters, parameters_hash, created_at, updated_at
       FROM app.strategy_configurations
      WHERE id = $1 AND user_id = $2`,
    [configId, userId]
  );

  if (!res.rowCount) throw invalid('Configuração de estratégia não encontrada.');
  const row = res.rows[0];

  return {
    id: row.id,
    userId: row.user_id,
    strategyType: row.strategy_type,
    strategy_type: row.strategy_type,
    name: row.name,
    description: row.description,
    version: row.version,
    isActive: row.is_active,
    is_active: row.is_active,
    status: row.status,
    parameters: row.parameters,
    parametersHash: row.parameters_hash,
    parameters_hash: row.parameters_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function create(userId, payload = {}, clientOverride = null) {
  const rawStrat = payload.strategyType || payload.strategy_type;
  if (!rawStrat) throw invalid('Tipo de estratégia (strategyType) é obrigatório.');
  const strategyType = String(rawStrat).trim().toUpperCase();
  if (![model.STRATEGY_TYPES.TREND_FOLLOWING, model.STRATEGY_TYPES.VOLATILITY_TRADING].includes(strategyType)) {
    throw invalid(`Tipo de estratégia inválido: "${rawStrat}".`);
  }

  const name = String(payload.name || '').trim();
  if (name.length < 2 || name.length > 120) {
    throw invalid('Nome da configuração deve ter entre 2 e 120 caracteres.');
  }

  const description = String(payload.description || '').slice(0, 500);
  let validatedParams;
  try {
    validatedParams = model.validateParameters(strategyType, payload.parameters);
  } catch (err) {
    throw invalid(err.message);
  }

  const parametersHash = model.computeParametersHash(validatedParams);
  const isActive = Boolean(payload.isActive ?? payload.is_active);
  const id = crypto.randomUUID();

  const runner = clientOverride ? clientOverride.query.bind(clientOverride) : database.transaction.bind(database);

  return database.transaction(async (client) => {
    if (isActive) {
      await client.query(
        'UPDATE app.strategy_configurations SET is_active = false WHERE user_id = $1 AND strategy_type = $2',
        [userId, strategyType]
      );
    }

    const res = await client.query(
      `INSERT INTO app.strategy_configurations (
        id, user_id, strategy_type, name, description, version, is_active, status, parameters, parameters_hash
      ) VALUES ($1, $2, $3, $4, $5, '1.0', $6, 'active', $7::jsonb, $8)
      RETURNING *`,
      [id, userId, strategyType, name, description, isActive, JSON.stringify(validatedParams), parametersHash]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      strategyType: row.strategy_type,
      name: row.name,
      description: row.description,
      version: row.version,
      isActive: row.is_active,
      status: row.status,
      parameters: row.parameters,
      parametersHash: row.parameters_hash,
      snapshot: model.createSnapshot(row)
    };
  });
}

async function update(userId, configId, payload = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(String(configId || ''))) throw invalid('ID de configuração inválido.');

  return database.transaction(async (client) => {
    const existing = await client.query(
      'SELECT * FROM app.trades_ref_check WHERE false', // fast check
      []
    ).catch(() => null);

    const currentRes = await client.query(
      'SELECT * FROM app.strategy_configurations WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [configId, userId]
    );
    if (!currentRes.rowCount) throw invalid('Configuração não encontrada.');
    const current = currentRes.rows[0];

    const name = payload.name !== undefined ? String(payload.name).trim() : current.name;
    if (name.length < 2 || name.length > 120) {
      throw invalid('Nome da configuração deve ter entre 2 e 120 caracteres.');
    }
    const description = payload.description !== undefined ? String(payload.description).slice(0, 500) : current.description;

    let validatedParams = current.parameters;
    let newHash = current.parameters_hash;
    let newVersion = current.version;

    if (payload.parameters && typeof payload.parameters === 'object') {
      try {
        validatedParams = model.validateParameters(current.strategy_type, payload.parameters);
      } catch (err) {
        throw invalid(err.message);
      }
      newHash = model.computeParametersHash(validatedParams);

      // Se os parâmetros foram alterados, incrementa a versão (ex: 1.0 -> 1.1)
      if (newHash !== current.parameters_hash) {
        newVersion = bumpVersion(current.version);
      }
    }

    const res = await client.query(
      `UPDATE app.strategy_configurations
          SET name = $3,
              description = $4,
              parameters = $5::jsonb,
              parameters_hash = $6,
              version = $7,
              updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [configId, userId, name, description, JSON.stringify(validatedParams), newHash, newVersion]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      strategyType: row.strategy_type,
      name: row.name,
      description: row.description,
      version: row.version,
      isActive: row.is_active,
      status: row.status,
      parameters: row.parameters,
      parametersHash: row.parameters_hash,
      snapshot: model.createSnapshot(row)
    };
  });
}

async function duplicate(userId, configId, payload = {}) {
  const current = await get(userId, configId);
  const duplicated = model.duplicateProfile(current, {
    newName: payload.name,
    newDescription: payload.description,
    parameters: payload.parameters
  });

  return create(userId, {
    strategyType: duplicated.strategyType,
    name: duplicated.name,
    description: duplicated.description,
    parameters: duplicated.parameters,
    isActive: false
  });
}

async function setActive(userId, configId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(configId || ''))) throw invalid('ID de configuração inválido.');

  return database.transaction(async (client) => {
    const currentRes = await client.query(
      'SELECT id, strategy_type, name, is_active FROM app.strategy_configurations WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [configId, userId]
    );
    if (!currentRes.rowCount) throw invalid('Configuração não encontrada.');
    const current = currentRes.rows[0];

    // Desativa outras do mesmo strategy_type
    await client.query(
      'UPDATE app.strategy_configurations SET is_active = false WHERE user_id = $1 AND strategy_type = $2',
      [userId, current.strategy_type]
    );

    // Ativa a selecionada
    const res = await client.query(
      `UPDATE app.strategy_configurations
          SET is_active = true,
              status = 'active',
              updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [configId, userId]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      strategyType: row.strategy_type,
      name: row.name,
      isActive: true,
      version: row.version,
      snapshot: model.createSnapshot(row)
    };
  });
}

async function toggleStatus(userId, configId, newStatus) {
  if (!/^[0-9a-f-]{36}$/i.test(String(configId || ''))) throw invalid('ID de configuração inválido.');
  const status = String(newStatus).toLowerCase();
  if (!['active', 'inactive'].includes(status)) throw invalid('Status deve ser "active" ou "inactive".');

  return database.transaction(async (client) => {
    const currentRes = await client.query(
      'SELECT id, is_active FROM app.strategy_configurations WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [configId, userId]
    );
    if (!currentRes.rowCount) throw invalid('Configuração não encontrada.');
    const current = currentRes.rows[0];

    if (current.is_active && status === 'inactive') {
      throw invalid('Não é permitido desativar diretamente o perfil ativo em vigor. Defina outro perfil como ativo antes.');
    }

    const res = await client.query(
      `UPDATE app.strategy_configurations
          SET status = $3,
              updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *`,
      [configId, userId, status]
    );

    return res.rows[0];
  });
}

async function deleteProfile(userId, configId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(configId || ''))) throw invalid('ID de configuração inválido.');

  return database.transaction(async (client) => {
    const currentRes = await client.query(
      'SELECT id, is_active, name FROM app.strategy_configurations WHERE id = $1 AND user_id = $2 FOR UPDATE',
      [configId, userId]
    );
    if (!currentRes.rowCount) throw invalid('Configuração não encontrada.');
    const current = currentRes.rows[0];

    if (current.is_active) {
      throw invalid('O perfil ativo em uso não pode ser excluído. Ative outro perfil antes de excluir.');
    }

    // Verificar se o perfil já foi usado em simulações ou trades históricos
    const tradeCheck = await client.query(
      'SELECT count(*) as count FROM app.trades WHERE user_id = $1 AND strategy_config_id = $2',
      [userId, configId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const simCheck = await client.query(
      'SELECT count(*) as count FROM app.trade_simulations WHERE user_id = $1 AND strategy_config_id = $2',
      [userId, configId]
    ).catch(() => ({ rows: [{ count: 0 }] }));

    const usedCount = parseInt(tradeCheck.rows[0]?.count || 0, 10) + parseInt(simCheck.rows[0]?.count || 0, 10);

    if (usedCount > 0) {
      // Preservação histórica mandatória: arquiva sem remover
      await client.query(
        `UPDATE app.strategy_configurations SET status = 'archived', is_active = false, updated_at = now() WHERE id = $1 AND user_id = $2`,
        [configId, userId]
      );
      return { id: configId, archived: true, message: 'Perfil arquivado com sucesso para preservar a integridade das operações históricas associadas.' };
    }

    await client.query(
      'DELETE FROM app.strategy_configurations WHERE id = $1 AND user_id = $2',
      [configId, userId]
    );

    return { id: configId, deleted: true, message: 'Perfil excluído com sucesso.' };
  });
}

async function getActiveProfile(userId, strategyType, client = database) {
  await ensureDefaults(userId, client);
  const normStrat = String(strategyType || model.STRATEGY_TYPES.TREND_FOLLOWING).trim().toUpperCase();

  const res = await client.query(
    `SELECT * FROM app.strategy_configurations
      WHERE user_id = $1 AND strategy_type = $2 AND is_active = true AND status = 'active'
      ORDER BY updated_at DESC LIMIT 1`,
    [userId, normStrat]
  );

  if (res.rowCount) {
    const row = res.rows[0];
    return {
      ...row,
      snapshot: model.createSnapshot(row)
    };
  }

  // Fallback para primeiro ativo da estratégia
  const fallbackRes = await client.query(
    `SELECT * FROM app.strategy_configurations
      WHERE user_id = $1 AND strategy_type = $2 AND status = 'active'
      ORDER BY created_at ASC LIMIT 1`,
    [userId, normStrat]
  );

  if (fallbackRes.rowCount) {
    const row = fallbackRes.rows[0];
    return {
      ...row,
      snapshot: model.createSnapshot(row)
    };
  }

  return null;
}

module.exports = {
  ensureDefaults,
  list,
  get,
  create,
  update,
  duplicate,
  setActive,
  toggleStatus,
  deleteProfile,
  getActiveProfile,
  bumpVersion
};

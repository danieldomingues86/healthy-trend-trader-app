const crypto = require('node:crypto');
const database = require('./database');
const model = require('../../frontend/profit-celebration-model');

function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function mapConquest(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tradeId: row.trade_id,
    eventId: row.event_id,
    ticker: row.ticker,
    direction: row.direction || 'long',
    realizedAmount: Number(row.realized_amount),
    rMultiple: row.r_multiple != null ? Number(row.r_multiple) : null,
    targetReached: Boolean(row.target_reached),
    planAdhered: row.plan_adhered,
    feeling: row.feeling,
    rewardId: row.reward_id,
    rewardTitle: row.reward_title,
    rewardCategory: row.reward_category,
    rewardIcon: row.reward_icon,
    rewardReason: row.reward_reason || '',
    rewardStatus: row.reward_status || 'pending',
    rewardCompletedAt: row.reward_completed_at ? (row.reward_completed_at instanceof Date ? row.reward_completed_at.toISOString() : String(row.reward_completed_at)) : null,
    entryPrice: row.entry_price != null ? Number(row.entry_price) : null,
    exitPrice: row.exit_price != null ? Number(row.exit_price) : null,
    initialStop: row.initial_stop != null ? Number(row.initial_stop) : null,
    riskAmount: row.risk_amount != null ? Number(row.risk_amount) : null,
    conquestDate: row.conquest_date instanceof Date ? row.conquest_date.toISOString().slice(0, 10) : String(row.conquest_date).slice(0, 10),
    notes: row.notes || '',
    createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)) : null,
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null
  };
}

function mapReward(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    category: row.category,
    icon: row.icon || '🎁',
    description: row.description || '',
    imageUrl: row.image_url || null,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)) : null,
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null
  };
}

/**
 * Lista todas as conquistas do usuário e consolida estatísticas e marcos
 */
async function listConquests(userId, client = database) {
  const result = await client.query(
    `SELECT * FROM app.profit_conquests
     WHERE user_id = $1
     ORDER BY conquest_date DESC, created_at DESC`,
    [userId]
  );

  const conquests = result.rows.map(mapConquest);
  const stats = model.calculateConquestsStats(conquests);
  const specialReward = await getSpecialReward(userId, client);

  return {
    conquests,
    stats,
    specialReward
  };
}

/**
 * Cria uma nova conquista resultante do ritual de vitória.
 * Garante idempotência para evitar registros duplicados em cliques repetidos.
 */
async function createConquest(userId, payload = {}, client = database) {
  const validation = model.validateConquestPayload(payload);
  if (!validation.isValid) {
    throw invalid(validation.errors.join(' '));
  }

  const tradeId = payload.tradeId || payload.trade_id || null;
  const eventId = payload.eventId || payload.event_id || null;

  // Proteção de duplicidade: se tradeId e eventId forem informados e já existir conquista, retorna a existente
  if (tradeId && eventId) {
    const existing = await client.query(
      `SELECT * FROM app.profit_conquests
       WHERE user_id = $1 AND trade_id = $2 AND event_id = $3
       LIMIT 1`,
      [userId, tradeId, eventId]
    );
    if (existing.rowCount > 0) {
      return {
        conquest: mapConquest(existing.rows[0]),
        created: false,
        message: 'Conquista já vinculada a esta realização anteriormente.'
      };
    }
  }

  const id = crypto.randomUUID();
  const ticker = String(payload.ticker || payload.asset || '').toUpperCase().trim();
  const direction = ['long', 'short'].includes(payload.direction) ? payload.direction : 'long';
  const realizedAmount = model.round2(Number(payload.realizedAmount ?? payload.realized_amount));
  const rMultiple = payload.rMultiple != null || payload.r_multiple != null
    ? model.round2(Number(payload.rMultiple ?? payload.r_multiple))
    : null;
  const targetReached = Boolean(payload.targetReached ?? payload.target_reached);
  const planAdhered = String(payload.planAdhered ?? payload.plan_adhered ?? 'yes').toLowerCase();
  const feeling = String(payload.feeling ?? 'pride').toLowerCase();

  const rewardId = payload.rewardId || payload.reward_id || null;
  const rewardTitle = String(payload.rewardTitle ?? payload.reward_title ?? '').trim();
  const rewardCategory = String(payload.rewardCategory ?? payload.reward_category ?? 'outras').toLowerCase();
  const rewardIcon = String(payload.rewardIcon ?? payload.reward_icon ?? '🎁').trim();
  const rewardReason = String(payload.rewardReason ?? payload.reward_reason ?? '').slice(0, 400).trim();

  const entryPrice = payload.entryPrice != null ? Number(payload.entryPrice) : null;
  const exitPrice = payload.exitPrice != null ? Number(payload.exitPrice) : null;
  const initialStop = payload.initialStop != null ? Number(payload.initialStop) : null;
  const riskAmount = payload.riskAmount != null ? Number(payload.riskAmount) : null;
  const notes = String(payload.notes || '').slice(0, 1000).trim();

  const conquestDate = payload.conquestDate
    ? String(payload.conquestDate).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const insertRes = await client.query(
    `INSERT INTO app.profit_conquests (
       id, user_id, trade_id, event_id, ticker, direction, realized_amount,
       r_multiple, target_reached, plan_adhered, feeling, reward_id,
       reward_title, reward_category, reward_icon, reward_reason, reward_status,
       entry_price, exit_price, initial_stop, risk_amount, conquest_date, notes
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11, $12,
       $13, $14, $15, $16, 'pending',
       $17, $18, $19, $20, $21, $22
     ) RETURNING *`,
    [
      id, userId, tradeId, eventId, ticker, direction, realizedAmount,
      rMultiple, targetReached, planAdhered, feeling, rewardId,
      rewardTitle, rewardCategory, rewardIcon, rewardReason,
      entryPrice, exitPrice, initialStop, riskAmount, conquestDate, notes
    ]
  );

  return {
    conquest: mapConquest(insertRes.rows[0]),
    created: true
  };
}

/**
 * Atualiza o status da recompensa (pendente ou realizada)
 */
async function updateConquestStatus(userId, conquestId, status, client = database) {
  const normStatus = String(status || '').toLowerCase() === 'completed' ? 'completed' : 'pending';
  const completedAt = normStatus === 'completed' ? new Date().toISOString() : null;

  const res = await client.query(
    `UPDATE app.profit_conquests
     SET reward_status = $1, reward_completed_at = $2, updated_at = now()
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [normStatus, completedAt, conquestId, userId]
  );

  if (res.rowCount === 0) {
    throw invalid('Conquista não encontrada.', 404);
  }

  return {
    success: true,
    conquest: mapConquest(res.rows[0])
  };
}

/**
 * Lista recompensas disponíveis (padrão do sistema + customizadas do usuário)
 */
async function listRewards(userId, client = database) {
  const result = await client.query(
    `SELECT * FROM app.rewards_catalog
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId]
  );

  const customRewards = result.rows.map(mapReward);
  // Recompensas pré-configuradas sempre disponíveis no catálogo
  return [...model.DEFAULT_REWARDS, ...customRewards];
}

/**
 * Cria uma recompensa personalizada para o usuário
 */
async function createReward(userId, payload = {}, client = database) {
  const validation = model.validateRewardPayload(payload);
  if (!validation.isValid) {
    throw invalid(validation.errors.join(' '));
  }

  const id = crypto.randomUUID();
  const title = String(payload.title || '').trim();
  const category = String(payload.category || 'outras').toLowerCase();
  const icon = String(payload.icon || '🎁').trim();
  const description = String(payload.description || '').slice(0, 300).trim();
  const imageUrl = payload.imageUrl || payload.image_url || null;

  const res = await client.query(
    `INSERT INTO app.rewards_catalog (
       id, user_id, title, category, icon, description, image_url, is_default
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, false)
     RETURNING *`,
    [id, userId, title, category, icon, description, imageUrl]
  );

  return {
    reward: mapReward(res.rows[0])
  };
}

/**
 * Atualiza recompensa personalizada do usuário
 */
async function updateReward(userId, rewardId, payload = {}, client = database) {
  const validation = model.validateRewardPayload(payload);
  if (!validation.isValid) {
    throw invalid(validation.errors.join(' '));
  }

  const title = String(payload.title || '').trim();
  const category = String(payload.category || 'outras').toLowerCase();
  const icon = String(payload.icon || '🎁').trim();
  const description = String(payload.description || '').slice(0, 300).trim();
  const imageUrl = payload.imageUrl || payload.image_url || null;

  const res = await client.query(
    `UPDATE app.rewards_catalog
     SET title = $1, category = $2, icon = $3, description = $4, image_url = $5, updated_at = now()
     WHERE id = $6 AND user_id = $7 AND is_default = false
     RETURNING *`,
    [title, category, icon, description, imageUrl, rewardId, userId]
  );

  if (res.rowCount === 0) {
    throw invalid('Recompensa personalizada não encontrada ou não editável.', 404);
  }

  return {
    reward: mapReward(res.rows[0])
  };
}

/**
 * Remove recompensa personalizada do usuário
 */
async function deleteReward(userId, rewardId, client = database) {
  const res = await client.query(
    `DELETE FROM app.rewards_catalog
     WHERE id = $1 AND user_id = $2 AND is_default = false
     RETURNING id`,
    [rewardId, userId]
  );

  if (res.rowCount === 0) {
    throw invalid('Recompensa não encontrada ou não pode ser removida.', 404);
  }

  return {
    deleted: true,
    id: rewardId
  };
}

/**
 * Retorna configuração da próxima recompensa especial do usuário
 */
async function getSpecialReward(userId, client = database) {
  const res = await client.query(
    `SELECT * FROM app.profit_special_reward
     WHERE user_id = $1`,
    [userId]
  );

  if (res.rowCount > 0) {
    const row = res.rows[0];
    return {
      title: row.title,
      targetConquests: Number(row.target_conquests),
      description: row.description || '',
      imageUrl: row.image_url || null
    };
  }

  // Padrão do sistema conforme imagem 3
  return {
    title: 'Fim de semana especial',
    targetConquests: 20,
    description: 'Quando eu completar 20 conquistas, vou me presentear com um fim de semana diferente.',
    imageUrl: 'assets/rewards/weekend.jpg'
  };
}

/**
 * Atualiza a próxima recompensa especial do usuário
 */
async function saveSpecialReward(userId, payload = {}, client = database) {
  const title = String(payload.title || 'Fim de semana especial').trim();
  const targetConquests = Math.max(1, Number(payload.targetConquests || 20));
  const description = String(payload.description || '').slice(0, 300).trim();
  const imageUrl = payload.imageUrl || payload.image_url || null;

  await client.query(
    `INSERT INTO app.profit_special_reward (user_id, title, target_conquests, description, image_url, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       title = EXCLUDED.title,
       target_conquests = EXCLUDED.target_conquests,
       description = EXCLUDED.description,
       image_url = EXCLUDED.image_url,
       updated_at = now()`,
    [userId, title, targetConquests, description, imageUrl]
  );

  return {
    success: true,
    specialReward: {
      title,
      targetConquests,
      description,
      imageUrl
    }
  };
}

module.exports = {
  listConquests,
  createConquest,
  updateConquestStatus,
  listRewards,
  createReward,
  updateReward,
  deleteReward,
  getSpecialReward,
  saveSpecialReward
};

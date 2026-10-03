const crypto = require('node:crypto');
const database = require('./database');
const model = require('../../frontend/trader-training-model');

function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function mapGoal(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    catalogId: row.catalog_id || '',
    title: row.title,
    category: row.category,
    startDate: toIsoDate(row.start_date),
    endDate: toIsoDate(row.end_date),
    durationDays: Number(row.duration_days),
    targetPct: Number(row.target_pct),
    status: row.status,
    finalAdherence: row.final_adherence != null ? Number(row.final_adherence) : null,
    extensions: Number(row.extensions || 0),
    completedAt: row.completed_at ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : String(row.completed_at)) : null,
    createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)) : null,
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null
  };
}

function mapRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id,
    sourceRef: row.source_ref,
    recordDate: toIsoDate(row.record_date),
    ticker: row.ticker || '',
    outcome: row.outcome || 'open',
    rMultiple: row.r_multiple != null ? Number(row.r_multiple) : null,
    assessment: row.assessment,
    note: row.note || '',
    createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)) : null,
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null
  };
}

async function getActiveGoal(userId, client = database) {
  const result = await client.query(
    `SELECT * FROM app.trader_training_goals
     WHERE user_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return mapGoal(result.rows[0]);
}

async function getHistory(userId, client = database) {
  const result = await client.query(
    `SELECT * FROM app.trader_training_goals
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows.map(mapGoal);
}

async function getRecordsForGoal(userId, goalId, client = database) {
  if (!goalId) return [];
  const result = await client.query(
    `SELECT * FROM app.trader_training_records
     WHERE user_id = $1 AND goal_id = $2
     ORDER BY record_date DESC, created_at DESC`,
    [userId, goalId]
  );
  return result.rows.map(mapRecord);
}

async function getRecentRecords(userId, limit = 50, client = database) {
  const result = await client.query(
    `SELECT * FROM app.trader_training_records
     WHERE user_id = $1
     ORDER BY record_date DESC, created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows.map(mapRecord);
}

async function getState(userId, client = database) {
  const [active, history] = await Promise.all([
    getActiveGoal(userId, client),
    getHistory(userId, client)
  ]);

  let records = [];
  let adherence = null;
  let weeklyEvolution = [];
  let evolutionInsight = null;
  let periodProgress = null;
  let motivation = null;
  let conclusion = null;

  if (active) {
    records = await getRecordsForGoal(userId, active.id, client);
    adherence = model.computeAdherence(records);
    weeklyEvolution = model.weeklyEvolution(active, records);
    evolutionInsight = model.evolutionInsight(weeklyEvolution);
    periodProgress = model.periodProgress(active);
    motivation = model.motivation(adherence, active.targetPct);
    conclusion = model.conclusion(active, records);
  }

  // Prepara o histórico de desenvolvimento com aderência calculada
  const developmentHistory = await Promise.all(
    history.map(async (goal) => {
      if (goal.status === 'active') {
        return {
          ...goal,
          adherence: adherence?.pct ?? null,
          recordCount: records.length
        };
      }
      if (goal.finalAdherence != null) {
        return {
          ...goal,
          adherence: goal.finalAdherence
        };
      }
      const goalRecords = await getRecordsForGoal(userId, goal.id, client);
      const computed = model.computeAdherence(goalRecords);
      return {
        ...goal,
        adherence: computed.pct
      };
    })
  );

  return {
    active: active ? {
      ...active,
      adherence,
      weeklyEvolution,
      evolutionInsight,
      periodProgress,
      motivation,
      conclusion,
      records
    } : null,
    history: developmentHistory,
    records,
    catalog: model.CATALOG,
    categories: model.CATEGORIES,
    categoryOrder: model.CATEGORY_ORDER
  };
}

async function startGoal(userId, payload, client = database) {
  const normalized = model.normalizeGoal(payload);

  return database.transaction(async ({ query }) => {
    // 1. Se já houver um objetivo ativo, arquiva como concluído ou alterado
    const existingActive = await query(
      `SELECT * FROM app.trader_training_goals
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (existingActive.rows[0]) {
      const prev = mapGoal(existingActive.rows[0]);
      const prevRecordsRes = await query(
        `SELECT * FROM app.trader_training_records WHERE user_id = $1 AND goal_id = $2`,
        [userId, prev.id]
      );
      const prevRecords = prevRecordsRes.rows.map(mapRecord);
      const prevAdherence = model.computeAdherence(prevRecords);
      const prevStatus = model.finalStatus(prev, prevRecords);

      await query(
        `UPDATE app.trader_training_goals
         SET status = $3, final_adherence = $4, completed_at = now(), updated_at = now()
         WHERE id = $1 AND user_id = $2`,
        [prev.id, userId, prevStatus, prevAdherence.pct]
      );
    }

    // 2. Insere o novo objetivo ativo
    const id = crypto.randomUUID();
    const insertRes = await query(
      `INSERT INTO app.trader_training_goals (
         id, user_id, catalog_id, title, category,
         start_date, end_date, duration_days, target_pct,
         status
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9,
         'active'
       ) RETURNING *`,
      [
        id,
        userId,
        normalized.catalogId,
        normalized.title,
        normalized.category,
        normalized.startDate,
        normalized.endDate,
        normalized.durationDays,
        normalized.targetPct
      ]
    );

    return mapGoal(insertRes.rows[0]);
  });
}

async function extendActiveGoal(userId, payload = {}, client = database) {
  const active = await getActiveGoal(userId, client);
  if (!active) {
    throw invalid('Nenhum objetivo ativo no momento para estender.', 404);
  }

  const extraDays = Number(payload.extraDays || payload.days || 7);
  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 60) {
    throw invalid('Quantidade de dias de extensão inválida (1 a 60 dias).');
  }

  const newEndDate = model.addDays(active.endDate, extraDays);
  const newDuration = active.durationDays + extraDays;

  const result = await client.query(
    `UPDATE app.trader_training_goals
     SET end_date = $3, duration_days = $4, extensions = extensions + 1, updated_at = now()
     WHERE id = $1 AND user_id = $2 AND status = 'active'
     RETURNING *`,
    [active.id, userId, newEndDate, newDuration]
  );

  return mapGoal(result.rows[0]);
}

async function switchOrConcludeActiveGoal(userId, payload = {}, client = database) {
  const active = await getActiveGoal(userId, client);
  if (!active) {
    throw invalid('Nenhum objetivo ativo no momento.', 404);
  }

  const records = await getRecordsForGoal(userId, active.id, client);
  const adherence = model.computeAdherence(records);
  const defaultStatus = model.finalStatus(active, records);
  const requestedStatus = payload.status && ['consolidated', 'developing', 'switched'].includes(payload.status)
    ? payload.status
    : defaultStatus;

  const result = await client.query(
    `UPDATE app.trader_training_goals
     SET status = $3, final_adherence = $4, completed_at = now(), updated_at = now()
     WHERE id = $1 AND user_id = $2 AND status = 'active'
     RETURNING *`,
    [active.id, userId, requestedStatus, adherence.pct]
  );

  return mapGoal(result.rows[0]);
}

async function saveRecord(userId, payload, client = database) {
  const normalized = model.normalizeRecord(payload);

  // Busca o objetivo ativo caso não venha informado no payload
  let goalId = payload.goalId;
  if (!goalId) {
    const active = await getActiveGoal(userId, client);
    if (!active) {
      throw invalid('Nenhum objetivo ativo no momento. Inicie um treinamento antes de registrar o comportamento.', 400);
    }
    goalId = active.id;
  }

  const id = crypto.randomUUID();
  const result = await client.query(
    `INSERT INTO app.trader_training_records (
       id, user_id, goal_id, source_ref, record_date,
       ticker, outcome, r_multiple, assessment, note
     ) VALUES (
       $1, $2, $3, $4, $5,
       $6, $7, $8, $9, $10
     )
     ON CONFLICT (user_id, goal_id, source_ref)
     DO UPDATE SET
       record_date = EXCLUDED.record_date,
       ticker = EXCLUDED.ticker,
       outcome = EXCLUDED.outcome,
       r_multiple = EXCLUDED.r_multiple,
       assessment = EXCLUDED.assessment,
       note = EXCLUDED.note,
       updated_at = now()
     RETURNING *`,
    [
      id,
      userId,
      goalId,
      normalized.sourceRef,
      normalized.recordDate,
      normalized.ticker,
      normalized.outcome,
      normalized.rMultiple,
      normalized.assessment,
      normalized.note
    ]
  );

  const saved = mapRecord(result.rows[0]);
  const goalRecords = await getRecordsForGoal(userId, goalId, client);
  const adherence = model.computeAdherence(goalRecords);

  return {
    record: saved,
    adherence
  };
}

async function deleteRecord(userId, sourceRef, client = database) {
  const result = await client.query(
    `DELETE FROM app.trader_training_records
     WHERE user_id = $1 AND source_ref = $2
     RETURNING *`,
    [userId, sourceRef]
  );
  return { deleted: Boolean(result.rowCount) };
}

module.exports = {
  mapGoal,
  mapRecord,
  getActiveGoal,
  getHistory,
  getRecordsForGoal,
  getRecentRecords,
  getState,
  startGoal,
  extendActiveGoal,
  switchOrConcludeActiveGoal,
  saveRecord,
  deleteRecord
};

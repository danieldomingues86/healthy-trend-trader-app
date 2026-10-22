'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const database = require('./database');
const model = require('../../frontend/deserving-diary-model');

const inMemoryStore = new Map();

function invalid(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(val) {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

function normalizeRow(row) {
  if (!row) return null;

  let emotions = [];
  try {
    emotions = Array.isArray(row.emotions)
      ? row.emotions
      : (typeof row.emotions === 'string' ? JSON.parse(row.emotions) : []);
  } catch (_) {
    emotions = [];
  }

  const rawDate = row.entry_date instanceof Date
    ? row.entry_date.toISOString().slice(0, 10)
    : String(row.entry_date || '').slice(0, 10);

  return {
    id: row.id,
    userId: row.user_id,
    entryDate: rawDate,
    entryDateBr: model.formatDateBr(rawDate),
    entryTime: row.entry_time || null,
    tradeId: row.trade_id || null,
    ticker: row.ticker || '',
    resultType: row.result_type || 'target_reached',
    emotions,
    emotionIntensity: row.emotion_intensity != null ? Number(row.emotion_intensity) : null,
    thought: row.thought || '',
    professionalAction: row.professional_action || '',
    learning: row.learning || '',
    gratitude: row.gratitude || '',
    revisitQuote: row.revisit_quote || '',
    attachmentUrl: row.attachment_url || null,
    attachmentName: row.attachment_name || null,
    attachmentSize: row.attachment_size != null ? Number(row.attachment_size) : null,
    createdAt: row.created_at ? (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)) : null,
    updatedAt: row.updated_at ? (row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)) : null
  };
}

/**
 * Lista os registros do Diário do Merecimento do usuário autenticado.
 */
async function listEntries(userId, query = {}, persistence = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  let entries = [];

  if (persistence && persistence.configured && persistence.configured()) {
    const result = await persistence.query(
      `SELECT * FROM app.deserving_diary
       WHERE user_id = $1
       ORDER BY entry_date DESC, created_at DESC`,
      [userId]
    );
    entries = result.rows.map(normalizeRow);
  } else {
    const userEntries = inMemoryStore.get(userId) || [];
    entries = [...userEntries].sort((a, b) => {
      const da = new Date(a.entryDate || 0).getTime();
      const db = new Date(b.entryDate || 0).getTime();
      return db - da;
    });
  }

  // Filtro opcional por ativo/ticker
  if (query.ticker) {
    const qTick = String(query.ticker).trim().toUpperCase();
    entries = entries.filter(e => e.ticker.includes(qTick));
  }

  // Filtro opcional por emoção
  if (query.emotion && query.emotion !== 'all') {
    entries = entries.filter(e => Array.isArray(e.emotions) && e.emotions.includes(query.emotion));
  }

  const period = query.period || '30d';
  const evolution = model.calculateEvolution(entries, period);

  return {
    entries,
    evolution,
    total: entries.length,
    period
  };
}

/**
 * Obtém um registro específico por ID.
 */
async function getEntry(userId, entryId, persistence = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  if (!isUuid(entryId)) throw invalid('ID de registro inválido.', 400);

  let entry = null;

  if (persistence && persistence.configured && persistence.configured()) {
    const result = await persistence.query(
      `SELECT * FROM app.deserving_diary
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [entryId, userId]
    );
    if (result.rows.length === 0) {
      throw invalid('Registro do diário não encontrado.', 404);
    }
    entry = normalizeRow(result.rows[0]);
  } else {
    const userEntries = inMemoryStore.get(userId) || [];
    const found = userEntries.find(e => e.id === entryId);
    if (!found) throw invalid('Registro do diário não encontrado.', 404);
    entry = found;
  }

  return entry;
}

/**
 * Cria um novo registro no Diário do Merecimento.
 */
async function createEntry(userId, payload = {}, persistence = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  const validation = model.validateEntryPayload(payload);
  if (!validation.isValid) {
    throw invalid(validation.errors.join(' '));
  }

  const s = validation.sanitized;
  const id = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  let safeTradeId = null;
  if (isUuid(s.tradeId) && persistence && persistence.configured && persistence.configured()) {
    try {
      const checkTrade = await persistence.query(
        `SELECT id FROM app.trades WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [s.tradeId, userId]
      );
      if (checkTrade.rowCount > 0) {
        safeTradeId = s.tradeId;
      }
    } catch (_) {}
  } else if (isUuid(s.tradeId)) {
    safeTradeId = s.tradeId;
  }

  if (persistence && persistence.configured && persistence.configured()) {
    const result = await persistence.query(
      `INSERT INTO app.deserving_diary (
        id, user_id, entry_date, trade_id, ticker, result_type, emotions,
        emotion_intensity, thought, professional_action, learning, gratitude,
        revisit_quote, attachment_url, attachment_name, attachment_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        userId,
        s.entryDate,
        safeTradeId,
        s.ticker,
        s.resultType,
        JSON.stringify(s.emotions),
        s.emotionIntensity,
        s.thought,
        s.professionalAction,
        s.learning,
        s.gratitude,
        s.revisitQuote,
        s.attachmentUrl,
        s.attachmentName,
        s.attachmentSize
      ]
    );
    return normalizeRow(result.rows[0]);
  } else {
    const record = {
      id,
      userId,
      entryDate: s.entryDate,
      entryDateBr: model.formatDateBr(s.entryDate),
      tradeId: safeTradeId,
      ticker: s.ticker,
      resultType: s.resultType,
      emotions: s.emotions,
      emotionIntensity: s.emotionIntensity,
      thought: s.thought,
      professionalAction: s.professionalAction,
      learning: s.learning,
      gratitude: s.gratitude,
      revisitQuote: s.revisitQuote,
      attachmentUrl: s.attachmentUrl,
      attachmentName: s.attachmentName,
      attachmentSize: s.attachmentSize,
      createdAt: nowIso,
      updatedAt: nowIso
    };
    const list = inMemoryStore.get(userId) || [];
    list.unshift(record);
    inMemoryStore.set(userId, list);
    return record;
  }
}

/**
 * Atualiza um registro existente no Diário do Merecimento.
 */
async function updateEntry(userId, entryId, payload = {}, persistence = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  if (!isUuid(entryId)) throw invalid('ID de registro inválido.', 400);

  const validation = model.validateEntryPayload(payload);
  if (!validation.isValid) {
    throw invalid(validation.errors.join(' '));
  }

  const s = validation.sanitized;
  const nowIso = new Date().toISOString();

  if (persistence && persistence.configured && persistence.configured()) {
    const result = await persistence.query(
      `UPDATE app.deserving_diary
       SET entry_date = $1, ticker = $2, result_type = $3, emotions = $4,
           emotion_intensity = $5, thought = $6, professional_action = $7,
           learning = $8, gratitude = $9, revisit_quote = $10,
           attachment_url = COALESCE($11, attachment_url),
           attachment_name = COALESCE($12, attachment_name),
           attachment_size = COALESCE($13, attachment_size),
           updated_at = now()
       WHERE id = $14 AND user_id = $15
       RETURNING *`,
      [
        s.entryDate,
        s.ticker,
        s.resultType,
        JSON.stringify(s.emotions),
        s.emotionIntensity,
        s.thought,
        s.professionalAction,
        s.learning,
        s.gratitude,
        s.revisitQuote,
        s.attachmentUrl,
        s.attachmentName,
        s.attachmentSize,
        entryId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      throw invalid('Registro do diário não encontrado.', 404);
    }
    return normalizeRow(result.rows[0]);
  } else {
    const list = inMemoryStore.get(userId) || [];
    const idx = list.findIndex(e => e.id === entryId);
    if (idx === -1) throw invalid('Registro do diário não encontrado.', 404);

    const existing = list[idx];
    const updated = {
      ...existing,
      entryDate: s.entryDate,
      entryDateBr: model.formatDateBr(s.entryDate),
      ticker: s.ticker,
      resultType: s.resultType,
      emotions: s.emotions,
      emotionIntensity: s.emotionIntensity,
      thought: s.thought,
      professionalAction: s.professionalAction,
      learning: s.learning,
      gratitude: s.gratitude,
      revisitQuote: s.revisitQuote,
      attachmentUrl: s.attachmentUrl !== undefined ? s.attachmentUrl : existing.attachmentUrl,
      attachmentName: s.attachmentName !== undefined ? s.attachmentName : existing.attachmentName,
      attachmentSize: s.attachmentSize !== undefined ? s.attachmentSize : existing.attachmentSize,
      updatedAt: nowIso
    };
    list[idx] = updated;
    return updated;
  }
}

/**
 * Exclui um registro do Diário do Merecimento com validação de posse do usuário.
 */
async function deleteEntry(userId, entryId, persistence = database) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);
  if (!isUuid(entryId)) throw invalid('ID de registro inválido.', 400);

  if (persistence && persistence.configured && persistence.configured()) {
    const result = await persistence.query(
      `DELETE FROM app.deserving_diary
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [entryId, userId]
    );
    if (result.rowCount === 0) {
      throw invalid('Registro do diário não encontrado.', 404);
    }
  } else {
    const list = inMemoryStore.get(userId) || [];
    const idx = list.findIndex(e => e.id === entryId);
    if (idx === -1) throw invalid('Registro do diário não encontrado.', 404);
    list.splice(idx, 1);
  }

  return { id: entryId, deleted: true };
}

/**
 * Salva anexo em disco e retorna metadados
 */
async function saveAttachment(userId, input = {}) {
  if (!userId) throw invalid('Usuário não autenticado.', 401);

  const bytes = Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(input.bytes || '', 'base64');
  if (!bytes.length) throw invalid('Envie uma imagem válida para anexar.');
  if (bytes.length > 15 * 1024 * 1024) throw invalid('A imagem ultrapassa o limite de 15 MB.', 413);

  const id = crypto.randomUUID();
  const rawName = String(input.name || 'grafico-print.png').replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = path.extname(rawName).toLowerCase() || '.png';
  const fileName = `${id}${ext}`;

  const storageDir = path.resolve(__dirname, '..', 'data', 'deserving-diary-attachments', userId);
  await fs.mkdir(storageDir, { recursive: true });
  const targetPath = path.join(storageDir, fileName);

  await fs.writeFile(targetPath, bytes);

  return {
    id,
    url: `/api/deserving-diary/attachments/${userId}/${fileName}`,
    name: rawName,
    size: bytes.length,
    contentType: input.contentType || 'image/png'
  };
}

/**
 * Limpa o armazenamento em memória (útil para testes isolados)
 */
function resetInMemoryStore() {
  inMemoryStore.clear();
}

module.exports = {
  listEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  saveAttachment,
  resetInMemoryStore,
  normalizeRow
};

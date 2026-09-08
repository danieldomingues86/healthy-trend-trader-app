const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const database = require('./database');

const MAX_BYTES = 20 * 1024 * 1024;
const storageRoot = () => path.resolve(process.env.JOURNAL_ATTACHMENT_STORAGE_PATH || path.join(__dirname, '..', 'data', 'journal-attachments'));

function invalid(message) { const error = new Error(message); error.status = 400; return error; }
function attachmentId(value) {
  const normalized = String(value || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) throw invalid('Anexo inválido.');
  return normalized;
}
function recordId(value) {
  const normalized = String(value || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,119}$/i.test(normalized)) throw invalid('Registro do diário inválido.');
  return normalized;
}
function name(value) {
  const normalized = path.basename(String(value || '').replace(/[\0-\r\\/]+/g, ' ').replace(/^[.\s]+/, '').trim()).slice(0, 180);
  if (!normalized) throw invalid('Nome do arquivo inválido.');
  return normalized;
}
function contentType(value) {
  const normalized = String(value || 'application/octet-stream').toLowerCase().split(';')[0].trim();
  if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(normalized)) throw invalid('Tipo de arquivo inválido.');
  return normalized;
}
function metadata(row) {
  return { id: row.id, name: row.original_name, type: row.content_type, size: Number(row.byte_size), createdAt: row.created_at };
}
function filePath(storageKey) {
  const root = storageRoot();
  const candidate = path.resolve(root, storageKey);
  if (!candidate.startsWith(`${root}${path.sep}`)) throw invalid('Arquivo inválido.');
  return candidate;
}
async function create(userId, input) {
  const journalRecordId = recordId(input.recordId);
  const originalName = name(input.name);
  const type = contentType(input.contentType);
  const bytes = Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(input.bytes || '');
  if (!bytes.length) throw invalid('Envie um arquivo para anexar.');
  if (bytes.length > MAX_BYTES) { const error = new Error('O arquivo ultrapassa o limite de 20 MB.'); error.status = 413; throw error; }
  const id = crypto.randomUUID();
  const storageKey = `${userId}/${id}`;
  const target = filePath(storageKey);
  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${crypto.randomUUID()}.uploading`;
  await fs.writeFile(temporary, bytes, { flag: 'wx' });
  try {
    await fs.rename(temporary, target);
    const result = await database.query(
      `INSERT INTO app.journal_attachments (id, user_id, journal_record_id, original_name, content_type, byte_size, storage_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, original_name, content_type, byte_size, created_at`,
      [id, userId, journalRecordId, originalName, type, bytes.length, storageKey]
    );
    return metadata(result.rows[0]);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    await fs.rm(target, { force: true }).catch(() => {});
    throw error;
  }
}
async function content(userId, value) {
  const id = attachmentId(value);
  const result = await database.query(
    `SELECT id, original_name, content_type, byte_size, storage_key FROM app.journal_attachments WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  const row = result.rows[0];
  if (!row) { const error = new Error('Anexo não encontrado.'); error.status = 404; throw error; }
  try { return { ...row, bytes: await fs.readFile(filePath(row.storage_key)) }; }
  catch (cause) { if (cause.code === 'ENOENT') { const error = new Error('Arquivo não encontrado no armazenamento.'); error.status = 404; throw error; } throw cause; }
}
async function remove(userId, value) {
  const id = attachmentId(value);
  const result = await database.query(
    `DELETE FROM app.journal_attachments WHERE id = $1 AND user_id = $2 RETURNING storage_key`, [id, userId]
  );
  const row = result.rows[0];
  if (!row) { const error = new Error('Anexo não encontrado.'); error.status = 404; throw error; }
  await fs.rm(filePath(row.storage_key), { force: true });
  return { id };
}

module.exports = { MAX_BYTES, attachmentId, recordId, name, contentType, create, content, remove };

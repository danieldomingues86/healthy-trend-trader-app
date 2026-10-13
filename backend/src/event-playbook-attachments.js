'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const storageRoot = () => path.resolve(process.env.EVENT_PLAYBOOK_ATTACHMENT_STORAGE_PATH || path.join(__dirname, '..', 'data', 'event-playbook-attachments'));

function invalid(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function sanitizeId(value) {
  const normalized = String(value || '').trim();
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(normalized)) {
    throw invalid('Identificador de anexo inválido.');
  }
  return normalized;
}

function sanitizeFileName(value) {
  const normalized = path.basename(String(value || '').replace(/[\0-\r\\/]+/g, ' ').replace(/^[.\s]+/, '').trim()).slice(0, 180);
  return normalized || 'screenshot.png';
}

function sanitizeContentType(value) {
  const normalized = String(value || 'image/png').toLowerCase().split(';')[0].trim();
  if (!/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(normalized)) {
    return 'application/octet-stream';
  }
  return normalized;
}

function getFilePath(userId, id, ext) {
  const root = storageRoot();
  const safeUser = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeId = sanitizeId(id);
  const target = path.resolve(root, safeUser, `${safeId}${ext || '.bin'}`);
  if (!target.startsWith(root)) {
    throw invalid('Caminho de armazenamento inválido.');
  }
  return target;
}

async function create(userId, input) {
  const originalName = sanitizeFileName(input.name);
  const type = sanitizeContentType(input.contentType);
  const bytes = Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(input.bytes || '');

  if (!bytes.length) {
    throw invalid('Envie uma imagem ou arquivo para anexar.');
  }
  if (bytes.length > MAX_BYTES) {
    const error = new Error('O arquivo ultrapassa o limite de 20 MB.');
    error.status = 413;
    throw error;
  }

  const id = 'att-' + crypto.randomUUID();
  const ext = path.extname(originalName) || '.png';
  const target = getFilePath(userId, id, ext);

  await fs.mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${crypto.randomUUID()}.uploading`;
  await fs.writeFile(temporary, bytes);
  await fs.rename(temporary, target);

  // Armazena metadata para recuperação rápida de mime-type
  const metaTarget = `${target}.meta.json`;
  await fs.writeFile(metaTarget, JSON.stringify({
    id,
    userId,
    originalName,
    contentType: type,
    byteSize: bytes.length,
    createdAt: new Date().toISOString()
  }));

  return {
    id,
    name: originalName,
    contentType: type,
    byteSize: bytes.length,
    url: `/api/event-playbook/attachments/${id}/content`,
    createdAt: new Date().toISOString()
  };
}

async function content(userId, id) {
  const safeId = sanitizeId(id);
  const root = storageRoot();
  const safeUser = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
  const userDir = path.resolve(root, safeUser);

  try {
    const entries = await fs.readdir(userDir);
    const targetFile = entries.find(f => f.startsWith(safeId) && !f.endsWith('.meta.json'));
    if (!targetFile) {
      const error = new Error('Anexo não encontrado.');
      error.status = 404;
      throw error;
    }

    const filePath = path.join(userDir, targetFile);
    const bytes = await fs.readFile(filePath);

    let meta = { contentType: 'image/png', originalName: targetFile };
    try {
      const metaBytes = await fs.readFile(`${filePath}.meta.json`, 'utf8');
      meta = JSON.parse(metaBytes);
    } catch (_) {}

    return {
      id: safeId,
      original_name: meta.originalName || targetFile,
      content_type: meta.contentType || 'image/png',
      byte_size: bytes.length,
      bytes
    };
  } catch (err) {
    if (err.code === 'ENOENT') {
      const error = new Error('Anexo não encontrado no armazenamento.');
      error.status = 404;
      throw error;
    }
    throw err;
  }
}

async function remove(userId, id) {
  const safeId = sanitizeId(id);
  const root = storageRoot();
  const safeUser = String(userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');
  const userDir = path.resolve(root, safeUser);

  try {
    const entries = await fs.readdir(userDir);
    const matching = entries.filter(f => f.startsWith(safeId));
    for (const f of matching) {
      await fs.unlink(path.join(userDir, f)).catch(() => {});
    }
    return { id: safeId };
  } catch (err) {
    return { id: safeId };
  }
}

module.exports = {
  MAX_BYTES,
  create,
  content,
  remove
};

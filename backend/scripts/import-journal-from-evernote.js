/* Offline import. Dry run by default. --apply requires a pinned, exact account id.
   node scripts/import-journal-from-evernote.js --manifest <manifest.json> [...]
     --email <email> [--correct-title-year] [--expected-user-id <uuid> --apply]
   Personal files are stored only in ignored data/evernote-imports and backups. */
'use strict';
require('../src/env');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const database = require('../src/database');
const workspace = require('../src/workspace-state');
const attachmentStore = require('../src/journal-attachments');
const Import = require('../src/evernote-import');
const Journal = require('../../frontend/journal-v2-model');
const Intelligence = require('../../frontend/emotional-intelligence-model');
const attachmentsRoot = path.resolve(process.env.JOURNAL_ATTACHMENT_STORAGE_PATH || path.join(__dirname, '..', 'data', 'journal-attachments'));
function arg(name) { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; }
function args(name) { return process.argv.flatMap((value, i) => value === name ? [process.argv[i + 1]] : []); }
const apply = process.argv.includes('--apply'), correctTitleYear = process.argv.includes('--correct-title-year');
function currentJournal(state) { return Journal.load({ getItem: key => state[key] == null ? null : typeof state[key] === 'string' ? state[key] : JSON.stringify(state[key]) }, []); }
function identifyImage(resource, ocr) {
  const recognized = ocr?.[resource.sha256];
  const tickers = [...new Set((recognized?.lines || []).flatMap(line => line.words).filter(word => word.y < 55).map(word => String(word.text).toUpperCase().replace(/^['"(]+|['",;)]+$/g, '')).filter(word => /^[A-Z]{4}\d{1,2}$/.test(word)))];
  // A positions table or multiple tickers is not a screenshot of one confirmed asset.
  return { ticker: recognized?.width > 800 && tickers.length === 1 ? tickers[0] : null, tickers, text: recognized?.text || '', method: recognized?.method || null, error: recognized?.error || null };
}
function resourceName(resource, date, index, identity) {
  const ext = resource.type === 'image/png' ? '.png' : resource.type === 'image/jpeg' ? '.jpg' : resource.type === 'audio/mpeg' ? '.mp3' : path.extname(resource.name) || '.bin';
  const prefix = resource.type.startsWith('image/') ? identity.ticker || 'print' : path.basename(resource.name, path.extname(resource.name));
  return attachmentStore.name(`${prefix}_${date}_${String(index + 1).padStart(2, '0')}${ext}`);
}
async function readSources(manifests) {
  const plans = [], ids = new Set();
  for (const file of manifests) {
    const manifest = JSON.parse(await fs.readFile(path.resolve(file), 'utf8'));
    let ocr = {};
    try { ocr = JSON.parse(await fs.readFile(path.join(path.dirname(path.resolve(file)), 'ocr.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const note of manifest.notes) {
      const plan = Import.sourcePlan(note, manifest.source, { correctTitleYear });
      if (ids.has(plan.sourceId)) continue;
      ids.add(plan.sourceId);
      const hashes = new Set(); plan.files = [];
      for (const [index, resource] of note.resources.entries()) {
        if (hashes.has(resource.sha256)) continue;
        hashes.add(resource.sha256);
        const bytes = await fs.readFile(resource.path);
        if (Import.hash(bytes) !== resource.sha256 || bytes.length !== resource.size || crypto.createHash('md5').update(bytes).digest('hex') !== resource.hash) throw new Error(`Anexo corrompido: ${note.title} / ${resource.name}`);
        if (!bytes.length || bytes.length > attachmentStore.MAX_BYTES) throw new Error(`Anexo fora do limite: ${resource.name}`);
        const identity = resource.type.startsWith('image/') ? identifyImage(resource, ocr) : {};
        plan.files.push({ resource, name: resourceName(resource, plan.dates.date, index, identity), identity });
      }
      const availableHashes = new Set(note.resources.map(resource => resource.hash));
      plan.missingReferences = [...new Set((note.media || []).filter(media => !availableHashes.has(media.hash)).map(media => media.hash))];
      plans.push(plan);
    }
  }
  return plans;
}
function fileMetadata(plan, file, row) {
  return { ...row, importSourceId: plan.sourceId, resourceHash: file.resource.sha256, originalName: file.resource.name, ticker: file.identity.ticker || null, detectedTickers: file.identity.tickers || [], ocrText: file.identity.text || '', ocrMethod: file.identity.method || null };
}
function simulatedEvidence(plan) {
  return plan.files.map((file, i) => fileMetadata(plan, file, { id: `preview-${plan.sourceId}-${i}`, name: file.name, type: file.resource.type, size: file.resource.size, createdAt: Import.evernoteTime(plan.note.created) })).concat([{ id: `preview-original-${plan.sourceId}`, name: `Evernote_original_${plan.dates.date}_${plan.sourceId.slice(-8)}.enml.xml`, type: 'application/xml', size: Buffer.byteLength(plan.note.enml), createdAt: Import.evernoteTime(plan.note.created), importSourceId: plan.sourceId, originalNote: true }]);
}
function reportFor(plans, before, data, results, user, mode) {
  const sourceIds = new Set(plans.map(plan => plan.sourceId)), importedRecords = data.records.filter(record => record.imports?.some(item => sourceIds.has(item.sourceId)));
  return { mode, user: { id: user.id, email: user.email, displayName: user.display_name }, sourceNotes: plans.length, newNotes: results.filter(item => !item.duplicate).length, duplicateNotes: results.filter(item => item.duplicate).length, sourceDates: [...new Set(plans.map(plan => plan.dates.date))].sort(), previousJournalDays: before.records.length, totalJournalDays: data.records.length, importedJournalDays: importedRecords.length,
    images: plans.flatMap(plan => plan.files).filter(file => file.resource.type.startsWith('image/')).length,
    audioFiles: plans.flatMap(plan => plan.files).filter(file => file.resource.type.startsWith('audio/')).length,
    originalNoteFiles: plans.length, namedTickerImages: plans.flatMap(plan => plan.files).filter(file => file.identity.ticker).length,
    transcriptions: plans.reduce((sum, plan) => sum + plan.fields.transcripts.length, 0), transcriptCharacters: plans.reduce((sum, plan) => sum + plan.fields.transcripts.reduce((n, t) => n + t.text.length, 0), 0),
    dailyExecutionScores: importedRecords.filter(record => record.technical.executionScore !== null).length, daysWithExplicitEmotions: importedRecords.filter(record => record.emotional.states.length).length,
    journalBytes: Buffer.byteLength(JSON.stringify(data)),
    notes: plans.map((plan, i) => ({ title: plan.note.title, date: plan.dates.date, dateBasis: plan.dates.basis, coveredDates: plan.dates.coveredDates, warning: plan.dates.warning, missingReferences: plan.missingReferences, sourceExecutionScore: plan.fields.sourceScore, score: plan.fields.score, plan: plan.fields.plan, states: plan.fields.states, conflicts: results[i]?.conflicts || [], files: plan.files.map(file => ({ name: file.name, originalName: file.resource.name, size: file.resource.size, ticker: file.identity.ticker || null })) })) };
}
async function main() {
  const manifests = args('--manifest'), email = String(arg('--email') || '').trim().toLowerCase(), expectedId = arg('--expected-user-id');
  if (!manifests.length || !email || (apply && !expectedId)) throw new Error('Informe --manifest, --email e, para --apply, --expected-user-id.');
  const match = await database.query('SELECT id,email,display_name,active FROM app.app_users WHERE lower(email) = $1', [email]);
  if (match.rows.length !== 1 || !match.rows[0].active) throw new Error('Conta exata e ativa não encontrada.');
  const user = match.rows[0]; if (expectedId && expectedId !== user.id) throw new Error('A conta não corresponde ao identificador esperado.');
  const plans = await readSources(manifests), state = await workspace.get(user.id), before = currentJournal(state), preview = JSON.parse(JSON.stringify(before));
  const previewResults = plans.map(plan => Import.mergeRecord(preview, plan, simulatedEvidence(plan)));
  workspace.value(preview); // Preflight rejects over-limit/corrupt state before uploading anything.
  const privateDir = path.join(__dirname, '..', 'data', 'evernote-imports'); await fs.mkdir(privateDir, { recursive: true });
  const report = reportFor(plans, before, preview, previewResults, user, apply ? 'apply' : 'dry-run');
  if (apply) {
    const uploaded = [], timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups'); await fs.mkdir(backupDir, { recursive: true });
    report.backup = path.join(backupDir, `evernote-${user.id}-${timestamp}.json`);
    try {
      await database.transaction(async client => {
        // Serialize competing imports. Read and merge the latest state, not the preflight snapshot.
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`evernote-journal:${user.id}`]);
        const snapshot = await client.query('SELECT state FROM app.workspace_state WHERE user_id = $1 FOR UPDATE', [user.id]);
        const original = snapshot.rows[0]?.state || {}, current = currentJournal(original);
        const oldFiles = await client.query('SELECT * FROM app.journal_attachments WHERE user_id = $1', [user.id]);
        await fs.writeFile(report.backup, JSON.stringify({ user: { id: user.id, email }, createdAt: new Date().toISOString(), state: original, attachments: oldFiles.rows }, null, 2), { flag: 'wx' });
        const results = [];
        for (const plan of plans) {
          if (current.records.some(record => record.imports?.some(item => item.sourceId === plan.sourceId))) { results.push(Import.mergeRecord(current, plan, [])); continue; }
          const journalRecord = Journal.ensureDay(current, plan.dates.date), evidence = [];
          for (const file of plan.files) {
            const bytes = await fs.readFile(file.resource.path);
            const row = await attachmentStore.create(user.id, { recordId: journalRecord.id, name: file.name, contentType: file.resource.type, bytes }, client);
            uploaded.push(row); evidence.push(fileMetadata(plan, file, row));
          }
          const originalRow = await attachmentStore.create(user.id, { recordId: journalRecord.id, name: `Evernote_original_${plan.dates.date}_${plan.sourceId.slice(-8)}.enml.xml`, contentType: 'application/xml', bytes: Buffer.from(plan.note.enml, 'utf8') }, client);
          uploaded.push(originalRow); evidence.push({ ...originalRow, originalNote: true, importSourceId: plan.sourceId });
          results.push(Import.mergeRecord(current, plan, evidence));
        }
        const serialized = workspace.value(current);
        Journal.load({ getItem: key => key === Journal.KEY ? serialized : null });
        if (results.some(result => !result.duplicate || result.repaired)) await client.query(`INSERT INTO app.workspace_state (user_id,state) VALUES ($1,jsonb_build_object($2::text,$3::jsonb)) ON CONFLICT (user_id) DO UPDATE SET state = app.workspace_state.state || jsonb_build_object($2::text,$3::jsonb)`, [user.id, Journal.KEY, JSON.stringify(serialized)]);
        Object.assign(report, reportFor(plans, currentJournal(original), current, results, user, 'apply'));
      });
    } catch (error) {
      // Transaction rolled back. Delete only the exact files created by this attempt.
      for (const row of uploaded) {
        const target = path.resolve(attachmentsRoot, user.id, row.id);
        if (!target.startsWith(`${attachmentsRoot}${path.sep}`)) throw new Error('Cleanup escaped the attachment store.');
        await fs.rm(target, { force: true });
      }
      throw error;
    }
    const saved = currentJournal(await workspace.get(user.id));
    const attachmentIds = plans.flatMap(plan => saved.records.flatMap(record => record.evidence.filter(item => item.importSourceId === plan.sourceId))).map(item => item.id);
    for (const id of attachmentIds) { const content = await attachmentStore.content(user.id, id); if (!content.bytes.length) throw new Error(`Anexo vazio após importar: ${id}`); }
    report.verifiedAttachments = attachmentIds.length;
    const [trades, sessions] = await Promise.all([require('../src/trades').listPlans(user.id), require('../src/platform-access').list(user.id, 'all')]);
    const analysis = Intelligence.analyze({ records: saved.records, trades, sessions, period: '90', now: new Date() });
    report.analysis = { current: analysis.current, detectedPatterns: analysis.patterns.map(pattern => ({ title: pattern.title, count: pattern.count, controlCount: pattern.controlCount, confidence: pattern.confidence, value: pattern.value, baseline: pattern.baseline })), scatterDays: analysis.scatter.length };
  }
  const reportPath = path.join(privateDir, apply ? 'import-report.json' : 'preview-report.json');
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, notes: undefined, reportPath }, null, 2));
}
main().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });

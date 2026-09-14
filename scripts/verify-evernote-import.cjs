/* Read-only UI verification of an exact account. Private screenshots stay in ignored storage.
   The disposable browser cannot write to the real backend or change account data. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
require('../backend/src/env');
const db = require('../backend/src/database');
const Journal = require('../frontend/journal-v2-model');
const Import = require('../backend/src/evernote-import');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'backend', 'data', 'evernote-imports', 'visual-verification');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
async function main() {
  const report = JSON.parse(await fs.readFile(path.join(root, 'backend', 'data', 'evernote-imports', 'import-report.json'), 'utf8'));
  const userId = report.user.id;
  const identity = await db.query('SELECT id,email FROM app.app_users WHERE id=$1 AND email=$2', [userId, report.user.email]);
  assert.equal(identity.rows.length, 1);
  const state = await require('../backend/src/workspace-state').get(userId);
  const raw = state[Journal.KEY], data = JSON.parse(raw);
  const importedImages = data.records.flatMap(record => record.evidence).filter(item => item.importSourceId && item.type.startsWith('image/'));
  assert.equal(importedImages.length, 111); assert.equal(data.records.length, 33);
  const [trades, sessions, attachments] = await Promise.all([require('../backend/src/trades').listPlans(userId), require('../backend/src/platform-access').list(userId, 'all'), db.query('SELECT id,storage_key,content_type FROM app.journal_attachments WHERE user_id=$1', [userId])]);
  const fileMap = new Map(attachments.rows.map(row => [row.id, row]));
  const storageRoot = path.resolve(process.env.JOURNAL_ATTACHMENT_STORAGE_PATH || path.join(root, 'backend', 'data', 'journal-attachments'));
  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET') { res.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname.startsWith('/qa-private-attachment/')) {
        const row = fileMap.get(pathname.split('/').at(-1)); if (!row) { res.writeHead(404).end(); return; }
        const file = path.resolve(storageRoot, row.storage_key); assert.ok(file.startsWith(storageRoot + path.sep));
        res.writeHead(200, { 'Content-Type': row.content_type, 'Cache-Control': 'no-store' }).end(await fs.readFile(file)); return;
      }
      const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + path.sep) || file.startsWith(path.join(root, 'backend') + path.sep)) { res.writeHead(403).end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(await fs.readFile(file));
    } catch (_) { if (!res.headersSent) res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    await fs.mkdir(out, { recursive: true });
    browser = await chromium.launch({ headless: true, channel: process.env.EI_BROWSER_CHANNEL || 'msedge' });
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = []; page.on('pageerror', error => errors.push(error.stack));
    await page.route('http://localhost:8787/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Read-only verification"}' }));
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'networkidle' });
    await page.evaluate(({ raw, trades, sessions }) => {
      healthyTrendWorkspace.storage.setItem(JournalV2Model.KEY, raw);
      synchronizedTrades = trades; operationalState.positions = []; operationalState.closedPositions = [];
      window.healthyTrendApi = {
        isAuthenticated: () => true,
        request: async (path, options = {}) => { if (options.method && options.method !== 'GET') throw new Error('Real account writes are disabled in verification.'); if (path.startsWith('/api/platform-access')) return { sessions }; return { habits: [], practices: [], items: [], state: {} }; },
        requestBlob: async path => { const id = path.split('/')[3]; const response = await fetch(`/qa-private-attachment/${id}`); if (!response.ok) throw new Error('Private attachment unavailable'); return response.blob(); }
      };
      window.dispatchEvent(new Event('healthyTrend:workspaceLoaded'));
      subscriptionState = { ...subscriptionState, plan: 'professional', trialStatus: 'completed', trialUsed: true, trialStartedAt: null };
      document.getElementById('loginShell').classList.add('hidden'); document.body.style.overflow = '';
      applyTheme('healthy'); applySubscriptionAccess(); openJournalRecord('day-2026-07-01');
    }, { raw, trades, sessions });
    assert.equal(await page.locator('#journal.active').count(), 1);
    assert.equal(await page.locator('[data-emotion="Ansioso"][aria-pressed="true"]').count(), 1);
    assert.equal(await page.locator('[data-check="0"]').isChecked(), true);
    await page.locator('.jv-evernote-source summary').click();
    assert.match(await page.locator('.jv-evernote-source pre').innerText(), /Vamos lá, dia 1 do sete de 2026/);
    await page.screenshot({ path: path.join(out, 'journal-imported.png'), fullPage: true });
    await page.evaluate(() => go('tradelibrary'));
    assert.equal(await page.locator('.trade-library-card').count(), data.records.flatMap(record => record.evidence).filter(item => item.type.startsWith('image/')).length);
    const importedImage = importedImages.find(item => item.name.startsWith('WEGE3_')) || importedImages[0];
    const image = page.locator(`[data-trade-library-image="${importedImage.id}"]`);
    await image.waitFor(); await page.waitForFunction(id => document.querySelector(`[data-trade-library-image="${id}"]`)?.naturalWidth > 0, importedImage.id);
    await page.screenshot({ path: path.join(out, 'library-imported.png'), fullPage: true });
    await page.locator(`[data-evidence-id="${importedImage.id}"]`).click(); assert.equal(await page.locator('.trade-library-lightbox').count(), 1);
    await page.screenshot({ path: path.join(out, 'screenshot-preview.png') }); await page.locator('[data-action="close-preview"]').click();
    await page.evaluate(() => go('emotionalintelligence'));
    await page.waitForFunction(() => document.querySelector('.ei-pattern'));
    assert.match(await page.locator('.ei-state-panel').innerText(), /33 registros/);
    await page.screenshot({ path: path.join(out, 'emotional-intelligence-imported.png'), fullPage: true });
    await page.locator('[data-pattern="declared-anxiety-execution"]').click();
    assert.equal(await page.locator('.ei-evidence-dialog .ei-evidence-body > .ei-event').count(), 11);
    assert.equal(await page.locator('.ei-evidence-dialog .ei-evidence-body > details .ei-event').count(), 10);
    await page.screenshot({ path: path.join(out, 'pattern-evidence.png') });
    assert.deepEqual(errors.filter(error => /journal-v2|trade-library|emotional-intelligence|behavior-activity/.test(error)), []);
    const after = await require('../backend/src/workspace-state').get(userId);
    assert.equal(Import.hash(after[Journal.KEY]), Import.hash(raw), 'Read-only verification must not change the journal.');
    console.log(JSON.stringify({ diary: 'passed', originalText: 'passed', checklist: 'passed', importedLibraryImages: 111, imagePreview: 'passed', anxietyEvidenceDays: 11, privateScreenshots: out, accountUnchangedDuringVerification: true }, null, 2));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });

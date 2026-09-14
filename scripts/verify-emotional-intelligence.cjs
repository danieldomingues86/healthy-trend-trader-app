/* Isolated visual QA: fixtures stay in a disposable browser, never in a user account. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'output', 'emotional-intelligence-qa');
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => { if (error) { res.writeHead(404).end(); return; } res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' }); res.end(bytes); });
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.EI_BROWSER_CHANNEL ? { channel: process.env.EI_BROWSER_CHANNEL } : {}) }); fs.mkdirSync(out, { recursive: true });
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    // Block the real backend in this test, including the app's automatic requests.
    await page.route('http://localhost:8787/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Isolated visual test"}' }));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const records = [], sessions = [], trades = [];
      const today = JournalV2Model.today();
      for (let i = 0; i < 90; i++) {
        const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - i); const day = date.toISOString().slice(0, 10);
        const anxious = i % 3 === 0, r = JournalV2Model.blank(day);
        r.emotional.states = anxious ? ['Ansioso', 'Frustrado'] : ['Calmo', 'Paciente']; r.emotional.intensity = anxious ? 4 + i % 2 : 1 + i % 2;
        r.technical.executionScore = anxious ? 4.8 + (i % 5) * .3 : 8.2 + (i % 6) * .2; r.technical.planRespected = anxious ? 'partial' : 'yes'; r.technical.marketState = anxious ? 'transition' : 'up'; r.emotional.note = 'Observação de teste para conferir o vínculo com o registro original.';
        records.push(r);
        for (let j = 0; j < (anxious ? 12 : 4); j++) sessions.push({ sessionId: `${day}-${j}`, openedAt: `${day}T${String(10 + j % 8).padStart(2, '0')}:00:00-03:00`, durationSeconds: 240 });
        if (i % 2 === 0) trades.push({ id: `qa-${day}`, ticker: i % 4 ? 'WEGE3' : 'PETR4', status: 'closed', executed_at: `${day}T10:00:00-03:00`, closed_at: `${day}T13:00:00-03:00`, resultR: anxious ? -.8 : 1.4, setup: 'Diário + 4H', metadata: { mode: 'paper' } });
      }
      healthyTrendWorkspace.storage.setItem(JournalV2Model.KEY, JSON.stringify({ version: 2, records }));
      window.dispatchEvent(new Event('healthyTrend:workspaceLoaded'));
      subscriptionState = { ...subscriptionState, plan: 'professional', trialStatus: 'completed', trialUsed: true, trialStartedAt: null }; synchronizedTrades = trades;
      window.healthyTrendApi = { isAuthenticated: () => true, request: async path => path.startsWith('/api/platform-access') ? { sessions } : { state: {}, trades } };
      document.getElementById('loginShell').classList.add('hidden'); document.body.style.overflow = '';
      applyTheme('healthy'); applySubscriptionAccess(); go('emotionalintelligence');
    });
    await page.waitForFunction(() => document.querySelector('#emotionalintelligence .ei-pattern'));
    for (const [name, width, height] of [['wide', 2554, 1100], ['desktop', 1920, 1080], ['laptop', 1366, 768], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      const layout = await page.evaluate(() => { const p = document.getElementById('emotionalintelligence').getBoundingClientRect(), main = document.querySelector('.main').getBoundingClientRect(); return { pageWidth: p.width, mainWidth: main.width, overflow: document.documentElement.scrollWidth > innerWidth + 1 }; });
      assert.equal(layout.overflow, false, `${name}: horizontal overflow`); assert.ok(Math.abs(layout.pageWidth - layout.mainWidth) < 2, `${name}: full available width`);
      await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.locator('#ei-period').selectOption('7');
    const result = await page.locator('.ei-state-panel').innerText(); assert.match(result, /Últimos 7 dias/);
    await page.locator('[data-pattern]').first().click(); await page.locator('.ei-evidence-dialog').waitFor();
    assert.ok(await page.locator('.ei-event').count() >= 3); await page.screenshot({ path: path.join(out, 'evidence.png') });
    await page.keyboard.press('Escape'); assert.equal(await page.locator('.ei-evidence-dialog').count(), 0);
    await page.locator('#emotionalintelligence [data-day]').first().click(); assert.equal(await page.locator('.ei-evidence-dialog .ei-event').count(), 1);
    await page.locator('.ei-evidence-dialog [data-journal-record]').first().click(); assert.equal(await page.locator('#journal.active').count(), 1);
    await page.evaluate(() => go('emotionalintelligence'));
    await page.locator('#ei-period').selectOption('all');
    await page.evaluate(() => applyTheme('gold')); await page.screenshot({ path: path.join(out, 'gold.png'), fullPage: true });
    await page.evaluate(() => { window.appLanguage = 'en-US'; renderEmotionalIntelligence(); }); assert.match(await page.locator('.ei-hero h1').innerText(), /Emotional Intelligence/);
    await page.screenshot({ path: path.join(out, 'english.png'), fullPage: true });
    await page.evaluate(() => { healthyTrendWorkspace.storage.setItem(JournalV2Model.KEY, JSON.stringify({ version: 2, records: [] })); synchronizedTrades = []; operationalState.positions = []; operationalState.closedPositions = []; window.healthyTrendApi.request = async () => ({ sessions: [] }); window.dispatchEvent(new Event('healthyTrend:workspaceLoaded')); renderEmotionalIntelligence(); });
    await page.screenshot({ path: path.join(out, 'empty.png'), fullPage: true });
    assert.deepEqual(errors.filter(error => /emotional-intelligence|behavior-activity/.test(error)), []);
    console.log(JSON.stringify({ screenshots: out, existingAppErrors: errors, filtersAndEvidence: 'passed', originalJournalLink: 'passed', responsiveWidths: 'passed', translation: 'passed' }, null, 2));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

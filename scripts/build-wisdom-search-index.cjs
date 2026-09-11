// Extract searchable text from the original cards without modifying any image.
const fs = require('node:fs');
const path = require('node:path');
const { createWorker, createScheduler } = require('C:/Users/danie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/tesseract.js');
const root = path.resolve(__dirname, '..');
const paths = JSON.parse(fs.readFileSync(path.join(root, 'assets/wisdom-index.json'), 'utf8')).items;
const output = path.join(root, 'frontend/trader-wisdom-search-index.js');
const existing = fs.existsSync(output) ? JSON.parse(fs.readFileSync(output, 'utf8').match(/=\s*({[\s\S]*});?\s*$/)?.[1] || '{}') : {};
const clean = value => value.replace(/\s+/g, ' ').trim();
(async () => {
  const scheduler = createScheduler();
  const workers = await Promise.all(Array.from({ length: 4 }, async () => {
    const worker = await createWorker('eng');
    scheduler.addWorker(worker);
    return worker;
  }));
  const pending = paths.filter(item => !existing[item]);
  let done = 0;
  await Promise.all(pending.map(async item => {
    try { existing[item] = clean((await scheduler.addJob('recognize', path.join(root, item))).data.text); }
    catch { existing[item] = ''; }
    done += 1;
    if (done % 50 === 0) console.log(`${done}/${pending.length}`);
  }));
  await scheduler.terminate();
  fs.writeFileSync(output, `/* Generated searchable text; original assets are unchanged. */\nwindow.traderWisdomSearchText = ${JSON.stringify(existing)};\n`);
  console.log(`${Object.keys(existing).length} cards indexed`);
})().catch(error => { console.error(error); process.exit(1); });

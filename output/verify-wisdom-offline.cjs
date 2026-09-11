const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {chromium} = require('C:/Users/danie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try {
  const page=await browser.newPage();
  await page.route('**/wisdom-index.json',r=>r.abort());
  await page.goto(pathToFileURL(path.resolve('index.html')).href,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
   document.getElementById('loginShell').classList.add('hidden');
   document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
   document.getElementById('wisdom').classList.add('active');
   renderTraderWisdom();
  });
  await page.waitForSelector('.wv-card');
  assert.equal(await page.locator('.wv-card').count(),12);
  assert.equal(await page.locator('.wv-status').count(),0);
  assert.equal(await page.evaluate(()=>window.traderWisdomAssetPaths.length),1543);
  await page.locator('#wisdom [data-theme="risk"]').click();
  await page.locator('#wisdom [data-search]').fill('Minervini');
  assert.equal(await page.locator('.wv-card').count(),12);
  assert.equal(await page.locator('.wv-pagination').first().getByText(/de 17 referências/).count(),1);
  assert.equal(await page.locator('.wv-author').first().innerText(),'Mark Minervini');
  assert((await page.locator('.wv-card').first().boundingBox()).height >= 230);
  await page.locator('#wisdom [data-search]').fill('');
  await page.locator('.wv-pagination [data-page="2"]').first().click();
  assert.equal(await page.getByText(/Referência do acervo|Archive reference/).count(),0);
  assert.equal(await page.locator('.wv-excerpt').evaluateAll(nodes=>nodes.every(node=>node.textContent.trim().length>0)),true);
  await page.locator('.wv-pagination [data-page="1"]').first().click();
  await page.locator('.wv-pagination [data-page="129"]').click();
  assert.equal(await page.locator('.wv-card').count(),7);
  await page.locator('[data-open]').last().click();
  await page.waitForFunction(()=>{const img=document.querySelector('#wv-dialog img');return img?.complete && img.naturalWidth>0;});
  console.log('PASS: file:// without JSON fetch, 1543 entries, 129 pages, last original image opens');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

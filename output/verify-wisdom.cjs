const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/danie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'msedge'}),p=await b.newPage({viewport:{width:1536,height:1024}});
 await p.goto('http://127.0.0.1:8080/',{waitUntil:'domcontentloaded'});await p.waitForTimeout(1000);
 await p.evaluate(()=>{document.getElementById('loginShell').classList.add('hidden');document.body.style.overflow='';document.body.dataset.theme='healthy';document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById('wisdom').classList.add('active');document.querySelector('[data-page="wisdom"]')?.classList.add('active');document.getElementById('crumb').textContent='Sabedoria do Trader';renderTraderWisdom()});
 await p.waitForTimeout(400);assert.equal(await p.locator('.wv-card').count(),12);
 await p.screenshot({path:'output/wisdom-final-desktop.png'});
 const first=await p.locator('[data-open]').first().getAttribute('data-open');
 await p.locator('.wv-star').first().click();await p.locator('#wisdom [data-theme="favorites"]').click();assert.equal(await p.locator('.wv-card').count(),1);
 await p.locator('[data-open]').first().click();assert(await p.locator('#wv-dialog').isVisible());await p.locator('[data-close]').click();
 await p.locator('#wisdom [data-theme="all"]').click();await p.locator('[data-open]').first().click();await p.locator('[data-next]').click();assert.match(await p.locator('#wv-modal-title').innerText(),/Paul Tudor/);await p.locator('[data-prev]').click();assert.match(await p.locator('#wv-modal-title').innerText(),/Brett/);await p.keyboard.press('Escape');assert.equal(await p.locator('#wv-dialog').isVisible(),false);
 await p.locator('#wisdom [data-search]').fill('Denise');assert.equal(await p.locator('.wv-card').count(),1);await p.locator('#wisdom [data-search]').fill('not-a-real-reference');assert.equal(await p.locator('.wv-card').count(),0);await p.locator('#wisdom [data-search]').fill('');
 await p.locator('[data-size]').selectOption('48');assert.equal(await p.locator('.wv-card').count(),48);await p.locator('[data-size]').selectOption('12');await p.locator('.wv-pagination [data-page="2"]').first().click();assert.notEqual(await p.locator('[data-open]').first().getAttribute('data-open'),first);
 await p.locator('[data-view="list"]').click();assert.equal(await p.locator('.wv-grid').evaluate(x=>getComputedStyle(x).gridTemplateColumns.split(' ').length),1);
 await p.evaluate(()=>{window.appLanguage='en-US';renderTraderWisdom()});assert.match(await p.locator('.wv-pagination').innerText(),/Showing/);
 await p.locator('[data-view="grid"]').click();await p.setViewportSize({width:390,height:900});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'output/wisdom-final-mobile.png'});
 console.log('PASS: 1543 originals, bounded pagination, favorites, search, empty state, modal navigation/Escape, grid/list, English, mobile overflow');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

const fs = require('fs');
const path = require('path');

function replaceExact(filePath, searchStr, replaceStr) {
  const fullPath = path.resolve(filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  const hasCrlf = content.includes('\r\n');
  const normalizedContent = content.replace(/\r\n/g, '\n');
  const normalizedSearch = searchStr.replace(/\r\n/g, '\n');
  const normalizedReplace = replaceStr.replace(/\r\n/g, '\n');
  
  if (!normalizedContent.includes(normalizedSearch)) {
    console.error(`[ERROR] Pattern not found in ${filePath}:\n${normalizedSearch.substring(0, 100)}...`);
    return false;
  }
  
  let updated = normalizedContent.replace(normalizedSearch, normalizedReplace);
  if (hasCrlf) {
    updated = updated.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(fullPath, updated, 'utf8');
  console.log(`[SUCCESS] Patched ${filePath}`);
  return true;
}

console.log('=== SCOPING REMAINING CHROME OVERRIDES TO HEALTHY THEME ===\n');

// 1. today-cockpit.css
{
  const targetTodayChrome = `body:has(#today.active) .topbar{background:#071f17;border-bottom-color:rgba(111,202,143,.16);box-shadow:none;backdrop-filter:blur(18px)}
body:has(#today.active) .topbar .crumb{color:#92b7a0}
body:has(#today.active) .topbar .crumb b{color:#e2f3e6}
body:has(#today.active) .topbar .pill{border-color:rgba(130,211,159,.22);background:rgba(8,43,30,.88);color:#dff0e4}
body:has(#today.active) .topbar .avatar{border-color:rgba(143,220,164,.48);background:linear-gradient(135deg,#296548,#89dc9d);color:#062316}`;

  const replacementTodayChrome = `body[data-theme="healthy"]:has(#today.active) .topbar{background:#071f17;border-bottom-color:rgba(111,202,143,.16);box-shadow:none;backdrop-filter:blur(18px)}
body[data-theme="healthy"]:has(#today.active) .topbar .crumb{color:#92b7a0}
body[data-theme="healthy"]:has(#today.active) .topbar .crumb b{color:#e2f3e6}
body[data-theme="healthy"]:has(#today.active) .topbar .pill{border-color:rgba(130,211,159,.22);background:rgba(8,43,30,.88);color:#dff0e4}
body[data-theme="healthy"]:has(#today.active) .topbar .avatar{border-color:rgba(143,220,164,.48);background:linear-gradient(135deg,#296548,#89dc9d);color:#062316}`;

  replaceExact('frontend/today-cockpit.css', targetTodayChrome, replacementTodayChrome);
}

// 2. asset-blacklist.css
{
  const targetABChrome = `body:has(#assetblacklist.active) .topbar { background:rgba(4,18,14,.96); border-bottom-color:rgba(80,145,110,.2); }
body:has(#assetblacklist.active) .crumb { color:#a6bcb0; }
body:has(#assetblacklist.active) .crumb b { color:#eaf5ee; }`;

  const replacementABChrome = `body[data-theme="healthy"]:has(#assetblacklist.active) .topbar { background:rgba(4,18,14,.96); border-bottom-color:rgba(80,145,110,.2); }
body[data-theme="healthy"]:has(#assetblacklist.active) .crumb { color:#a6bcb0; }
body[data-theme="healthy"]:has(#assetblacklist.active) .crumb b { color:#eaf5ee; }`;

  replaceExact('frontend/asset-blacklist.css', targetABChrome, replacementABChrome);
}

// 3. courage-challenge.css
{
  const targetCCChrome = `body:has(#couragechallenge.active) .topbar {
  background: rgba(6, 18, 13, 0.92) !important;
  border-bottom: 1px solid rgba(37, 211, 102, 0.12) !important;
  backdrop-filter: blur(14px);
  color: #dcece2 !important;
}`;

  const replacementCCChrome = `body[data-theme="healthy"]:has(#couragechallenge.active) .topbar {
  background: rgba(6, 18, 13, 0.92) !important;
  border-bottom: 1px solid rgba(37, 211, 102, 0.12) !important;
  backdrop-filter: blur(14px);
  color: #dcece2 !important;
}`;

  replaceExact('frontend/courage-challenge.css', targetCCChrome, replacementCCChrome);
}

// 4. trader-wisdom-v3.css
{
  const targetTWChrome = `body:has(#wisdom.active) .topbar{background:#09241eee;color:#ecebdc;border-bottom:1px solid #dbe7cd1c;backdrop-filter:blur(14px)}
body:has(#wisdom.active) .crumb,body:has(#wisdom.active) .crumb b{color:#e5ebd9}`;

  const replacementTWChrome = `body[data-theme="healthy"]:has(#wisdom.active) .topbar{background:#09241eee;color:#ecebdc;border-bottom:1px solid #dbe7cd1c;backdrop-filter:blur(14px)}
body[data-theme="healthy"]:has(#wisdom.active) .crumb,body[data-theme="healthy"]:has(#wisdom.active) .crumb b{color:#e5ebd9}`;

  replaceExact('frontend/trader-wisdom-v3.css', targetTWChrome, replacementTWChrome);
}

console.log('\n=== CHROME SCOPING COMPLETE ===');

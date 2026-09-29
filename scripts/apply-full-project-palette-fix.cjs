/**
 * Comprehensive Theme Palette Fix Script
 * Eliminates all color leakage across all pages.
 * Ensures:
 * - Healthy Green mode: Strictly emerald green accents, deep obsidian green surfaces,
 *   zero gold/yellow chrome or cards (except semantic warning status).
 * - Premium Gold mode: Strictly champagne/warm gold accents, warm charcoal surfaces,
 *   green strictly reserved for positive P&L / winning trades.
 */

const fs = require('fs');
const path = require('path');

function replaceExact(filePath, searchStr, replaceStr) {
  const fullPath = path.resolve(filePath);
  let content = fs.readFileSync(fullPath, 'utf8');
  // Normalize CRLF to LF for matching
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

console.log('=== STARTING PROJECT-WIDE PALETTE AUDIT & REPAIR ===\n');

// --------------------------------------------------------------------------
// 1. WATCHLIST (frontend/watchlist.css)
// --------------------------------------------------------------------------
console.log('1. Fixing Watchlist theme isolation...');
{
  const target = `/* Dark immersive canvas across the whole page (Zero white background, zero isolated boxes) */
body:has(#watchlist.active) {
  background: #02130c !important;
  color: #dcece2;
}

body:has(#watchlist.active) .app {
  background: #02130c !important;
}

body:has(#watchlist.active) .main {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: radial-gradient(circle at 50% -10%, #06281a 0%, #02130c 60%, #010a06 100%) !important;
  background-color: #02130c !important;
}

body:has(#watchlist.active) .content {
  background: transparent !important;
  max-width: none !important;
  width: 100% !important;
  padding: 16px 28px 48px !important;
  margin: 0 !important;
}

/* Hide market focus guard banner unconditionally on Watchlist */
body:has(#watchlist.active) #marketFocusGuard {
  display: none !important;
}

/* Translucent dark emerald topbar */
body:has(#watchlist.active) .topbar {
  background: rgba(2, 19, 12, 0.92) !important;
  border-bottom: 1px solid rgba(143, 224, 170, 0.14) !important;
  backdrop-filter: blur(14px);
  color: #dcece2 !important;
}

body:has(#watchlist.active) .crumb {
  color: #799786 !important;
  font-size: 11px;
}

body:has(#watchlist.active) .crumb b {
  color: #8fe0aa !important;
  font-weight: 700;
}

body:has(#watchlist.active) .topbar .pill {
  background: rgba(6, 28, 19, 0.8) !important;
  border: 1px solid rgba(143, 224, 170, 0.22) !important;
  color: #c7ded1 !important;
}

body:has(#watchlist.active) .topbar .avatar {
  background: linear-gradient(135deg, #1b5239, #78d294) !important;
  color: #03140d !important;
  border: 1px solid #78d294 !important;
}

body:has(#watchlist.active) .top-heat-meter span {
  color: #c1dfd2 !important;
}

body:has(#watchlist.active) .top-heat-meter b {
  color: #8fe0aa !important;
}

/* Dark themed sidebar */
body:has(#watchlist.active) .sidebar {
  background: linear-gradient(180deg, #03160e 0%, #010f09 100%) !important;
  border-right: 1px solid rgba(143, 224, 170, 0.12) !important;
}

body:has(#watchlist.active) .sidebar .brand strong {
  color: #f6fff8 !important;
}

body:has(#watchlist.active) .sidebar .brand em {
  color: #78d294 !important;
}

body:has(#watchlist.active) .sidebar .nav-label {
  color: #638271 !important;
}

body:has(#watchlist.active) .sidebar .nav button {
  color: #a3baa9 !important;
}

body:has(#watchlist.active) .sidebar .nav button:hover {
  background: rgba(143, 224, 170, 0.08) !important;
  color: #f6fff8 !important;
}

body:has(#watchlist.active) .sidebar .nav button.active {
  background: linear-gradient(105deg, #164e35, #277953) !important;
  color: #f6fff8 !important;
  border: 1px solid rgba(143, 224, 170, 0.3) !important;
  box-shadow: 0 4px 14px rgba(22, 78, 53, 0.35) !important;
}`;

  const replacement = `/* Dark immersive canvas across the whole page (Scoped cleanly to theme) */
body:has(#watchlist.active) .content {
  background: transparent !important;
  max-width: none !important;
  width: 100% !important;
  padding: 16px 28px 48px !important;
  margin: 0 !important;
}

/* Hide market focus guard banner on Watchlist */
body:has(#watchlist.active) #marketFocusGuard {
  display: none !important;
}

/* HEALTHY GREEN: Watchlist canvas */
body[data-theme="healthy"]:has(#watchlist.active) {
  background: #02130c !important;
  color: #dcece2;
}

body[data-theme="healthy"]:has(#watchlist.active) .app {
  background: #02130c !important;
}

body[data-theme="healthy"]:has(#watchlist.active) .main {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: radial-gradient(circle at 50% -10%, #06281a 0%, #02130c 60%, #010a06 100%) !important;
  background-color: #02130c !important;
}

/* PREMIUM GOLD: Watchlist canvas & theme overrides */
body:not([data-theme="healthy"]):has(#watchlist.active) {
  background: #0c0906 !important;
  color: #f8eed8;
}

body:not([data-theme="healthy"]):has(#watchlist.active) .app {
  background: #0c0906 !important;
}

body:not([data-theme="healthy"]):has(#watchlist.active) .main {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: radial-gradient(circle at 50% -10%, #2a1c0d 0%, #120e08 60%, #090704 100%) !important;
  background-color: #0c0906 !important;
}

body:not([data-theme="healthy"]) #watchlist .wl-btn-add,
body:not([data-theme="healthy"]) #watchlist .wl-btn-trade {
  background: linear-gradient(135deg, #b88731, #e0b859) !important;
  color: #221606 !important;
  border-color: #e4c16c !important;
}

body:not([data-theme="healthy"]) #watchlist .wl-hero,
body:not([data-theme="healthy"]) #watchlist .wl-control-bar,
body:not([data-theme="healthy"]) #watchlist .wl-opp-card,
body:not([data-theme="healthy"]) #watchlist .wl-table-container,
body:not([data-theme="healthy"]) #watchlist .wl-drawer {
  background: linear-gradient(135deg, #251a0d, #120e08) !important;
  border-color: rgba(216, 174, 77, 0.3) !important;
}

body:not([data-theme="healthy"]) #watchlist .wl-kpi-card,
body:not([data-theme="healthy"]) #watchlist .wl-metric-cell {
  background: #21180e !important;
  border-color: #5a4624 !important;
}

body:not([data-theme="healthy"]) #watchlist .wl-kpi-val,
body:not([data-theme="healthy"]) #watchlist .wl-score-badge {
  color: #f5d77a !important;
}

body:not([data-theme="healthy"]) #watchlist .wl-metric-val.mint {
  color: #e5bf68 !important;
}`;

  replaceExact('frontend/watchlist.css', target, replacement);
}

// --------------------------------------------------------------------------
// 2. EMERGING LEADERS (frontend/emerging-leaders.css)
// --------------------------------------------------------------------------
console.log('2. Fixing Emerging Leaders theme isolation...');
{
  const targetChrome = `/* Dark immersive canvas across the whole page (Zero white background, zero isolated boxes) */
body:has(#emergingleaders.active) {
  background: #02130c !important;
  color: #dcece2;
}

body:has(#emergingleaders.active) .app {
  background: #02130c !important;
}

body:has(#emergingleaders.active) .main {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: radial-gradient(circle at 50% -10%, #06281a 0%, #02130c 60%, #010a06 100%) !important;
  background-color: #02130c !important;
}

body:has(#emergingleaders.active) .content {
  background: transparent !important;
  max-width: none !important;
  width: 100% !important;
  padding: 16px 28px 48px !important;
  margin: 0 !important;
}

/* Hide market focus guard banner on Emerging Leaders */
body:has(#emergingleaders.active) #marketFocusGuard {
  display: none !important;
}

/* Translucent dark emerald topbar */
body:has(#emergingleaders.active) .topbar {
  background: rgba(2, 19, 12, 0.92) !important;
  border-bottom: 1px solid rgba(143, 224, 170, 0.14) !important;
  backdrop-filter: blur(14px);
  color: #dcece2 !important;
}

body:has(#emergingleaders.active) .crumb {
  color: #799786 !important;
  font-size: 11px;
}

body:has(#emergingleaders.active) .crumb b {
  color: #8fe0aa !important;
  font-weight: 700;
}

body:has(#emergingleaders.active) .topbar .pill {
  background: rgba(6, 28, 19, 0.8) !important;
  border: 1px solid rgba(143, 224, 170, 0.22) !important;
  color: #c7ded1 !important;
}

body:has(#emergingleaders.active) .topbar .avatar {
  background: linear-gradient(135deg, #1b5239, #78d294) !important;
  color: #03140d !important;
  border: 1px solid #78d294 !important;
}

body:has(#emergingleaders.active) .top-heat-meter span {
  color: #c1dfd2 !important;
}

body:has(#emergingleaders.active) .top-heat-meter b {
  color: #8fe0aa !important;
}

/* Dark themed sidebar */
body:has(#emergingleaders.active) .sidebar {
  background: linear-gradient(180deg, #03160e 0%, #010f09 100%) !important;
  border-right: 1px solid rgba(143, 224, 170, 0.12) !important;
}

body:has(#emergingleaders.active) .sidebar .brand strong {
  color: #f6fff8 !important;
}

body:has(#emergingleaders.active) .sidebar .brand em {
  color: #78d294 !important;
}

body:has(#emergingleaders.active) .sidebar .nav-label {
  color: #638271 !important;
}

body:has(#emergingleaders.active) .sidebar .nav button {
  color: #a3baa9 !important;
}

body:has(#emergingleaders.active) .sidebar .nav button:hover {
  background: rgba(143, 224, 170, 0.08) !important;
  color: #f6fff8 !important;
}

body:has(#emergingleaders.active) .sidebar .nav button.active {
  background: linear-gradient(105deg, #164e35, #277953) !important;
  color: #f6fff8 !important;
  border: 1px solid rgba(143, 224, 170, 0.3) !important;
  box-shadow: 0 4px 14px rgba(22, 78, 53, 0.35) !important;
}`;

  const replacementChrome = `/* Full-width container scoped to active theme */
body:has(#emergingleaders.active) .content {
  background: transparent !important;
  max-width: none !important;
  width: 100% !important;
  padding: 16px 28px 48px !important;
  margin: 0 !important;
}

/* Hide market focus guard banner on Emerging Leaders */
body:has(#emergingleaders.active) #marketFocusGuard {
  display: none !important;
}

/* HEALTHY GREEN: Emerging Leaders canvas */
body[data-theme="healthy"]:has(#emergingleaders.active) {
  background: #02130c !important;
  color: #dcece2;
}

body[data-theme="healthy"]:has(#emergingleaders.active) .app {
  background: #02130c !important;
}

body[data-theme="healthy"]:has(#emergingleaders.active) .main {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: radial-gradient(circle at 50% -10%, #06281a 0%, #02130c 60%, #010a06 100%) !important;
  background-color: #02130c !important;
}

/* PREMIUM GOLD: Emerging Leaders canvas */
body:not([data-theme="healthy"]):has(#emergingleaders.active) {
  background: #0c0906 !important;
  color: #f8eed8;
}

body:not([data-theme="healthy"]):has(#emergingleaders.active) .app {
  background: #0c0906 !important;
}

body:not([data-theme="healthy"]):has(#emergingleaders.active) .main {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: radial-gradient(circle at 50% -10%, #2a1c0d 0%, #120e08 60%, #090704 100%) !important;
  background-color: #0c0906 !important;
}`;

  replaceExact('frontend/emerging-leaders.css', targetChrome, replacementChrome);

  // Fix cluster card active/hover colors in Healthy Green vs Gold
  const targetCluster = `.el-cluster-card:hover {
  border-color: #d4af37;
  box-shadow: 0 0 16px rgba(212, 175, 55, 0.25);
  transform: translateY(-2px);
}

.el-cluster-card:hover .el-cluster-card-bg {
  opacity: 0.55;
  transform: scale(1.05);
}

.el-cluster-card.active {
  border: 1.5px solid #d4af37 !important;
  background: #082418;
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.32), 0 8px 24px rgba(0, 0, 0, 0.45) !important;
  transform: translateY(-2px);
}

.el-cluster-card.active .el-cluster-card-bg {
  opacity: 0.52;
}

.el-cluster-card.active .el-cluster-title {
  color: #fff9e6;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.4);
}`;

  const replacementCluster = `/* Cluster card hover & active states - STRICTLY THEMED */
.el-cluster-card:hover {
  border-color: #34d399;
  box-shadow: 0 0 16px rgba(52, 211, 153, 0.25);
  transform: translateY(-2px);
}

.el-cluster-card:hover .el-cluster-card-bg {
  opacity: 0.55;
  transform: scale(1.05);
}

.el-cluster-card.active {
  border: 1.5px solid #34d399 !important;
  background: #082418;
  box-shadow: 0 0 20px rgba(52, 211, 153, 0.32), 0 8px 24px rgba(0, 0, 0, 0.45) !important;
  transform: translateY(-2px);
}

.el-cluster-card.active .el-cluster-card-bg {
  opacity: 0.52;
}

.el-cluster-card.active .el-cluster-title {
  color: #e6fffa;
  text-shadow: 0 0 10px rgba(52, 211, 153, 0.4);
}

/* Gold Theme Overrides for Clusters */
body:not([data-theme="healthy"]) .el-cluster-card:hover {
  border-color: #d4af37;
  box-shadow: 0 0 16px rgba(212, 175, 55, 0.25);
}

body:not([data-theme="healthy"]) .el-cluster-card.active {
  border: 1.5px solid #d4af37 !important;
  background: #261b0c !important;
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.32), 0 8px 24px rgba(0, 0, 0, 0.45) !important;
}

body:not([data-theme="healthy"]) .el-cluster-card.active .el-cluster-title {
  color: #fff9e6;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.4);
}`;

  replaceExact('frontend/emerging-leaders.css', targetCluster, replacementCluster);

  // Fix NOVO badge in Healthy Green
  const targetBadgeNew = `.el-badge-new {
  display: inline-block;
  background: linear-gradient(135deg, #e4bf69, #cba143);
  color: #0d261b;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: 0.05em;
  margin-left: 6px;
  line-height: 1.3;
  vertical-align: middle;
}`;

  const replacementBadgeNew = `.el-badge-new {
  display: inline-block;
  background: linear-gradient(135deg, #34d399, #10b981);
  color: #022013;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: 0.05em;
  margin-left: 6px;
  line-height: 1.3;
  vertical-align: middle;
}

body:not([data-theme="healthy"]) .el-badge-new {
  background: linear-gradient(135deg, #e4bf69, #cba143);
  color: #211604;
}`;

  replaceExact('frontend/emerging-leaders.css', targetBadgeNew, replacementBadgeNew);

  // Fix tagline in pipeline
  const targetTagline = `.el-pipeline-tagline {
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 12px;
  color: #d4af37;
}`;

  const replacementTagline = `.el-pipeline-tagline {
  font-family: Georgia, serif;
  font-style: italic;
  font-size: 12px;
  color: #8fe0aa;
}

body:not([data-theme="healthy"]) .el-pipeline-tagline {
  color: #d4af37;
}`;

  replaceExact('frontend/emerging-leaders.css', targetTagline, replacementTagline);
}

// --------------------------------------------------------------------------
// 3. NOVO TRADE (frontend/trade-workbench-v2.css)
// --------------------------------------------------------------------------
console.log('3. Removing broken mixed topbar from Trade Workbench...');
{
  const targetWorkbenchChrome = `body:has(#newtrade.active) .topbar {
  background: #07150e !important;
  border-bottom: 1px solid rgba(200, 168, 78, 0.16) !important;
  backdrop-filter: blur(14px);
  color: #d6ded8 !important;
}

body:has(#newtrade.active) .crumb {
  color: #798e82 !important;
}

body:has(#newtrade.active) .crumb b {
  color: #c8a84e !important;
  font-weight: 700;
}

body:has(#newtrade.active) .topbar .pill {
  background: rgba(13, 34, 23, 0.75) !important;
  border: 1px solid rgba(200, 168, 78, 0.22) !important;
  color: #d6ded8 !important;
}

body:has(#newtrade.active) .topbar .avatar {
  background: linear-gradient(135deg, #1c3628, #c8a84e) !important;
  color: #07150e !important;
  border: 1px solid #c8a84e !important;
  font-weight: 700;
}`;

  const replacementWorkbenchChrome = `/* Topbar & navigation are managed authoritatively by sidebar-navigation.css for both themes */`;

  replaceExact('frontend/trade-workbench-v2.css', targetWorkbenchChrome, replacementWorkbenchChrome);
}

// --------------------------------------------------------------------------
// 4. ABOUT PAGE (frontend/about-page.css)
// --------------------------------------------------------------------------
console.log('4. Removing broken mixed topbar from About Page...');
{
  const targetAboutChrome = `body:has(#about.active) .topbar {
  background: #07150e !important;
  border-bottom: 1px solid rgba(200, 168, 78, 0.16) !important;
  backdrop-filter: blur(14px);
  color: #d6ded8 !important;
}

body:has(#about.active) .crumb {
  color: #798e82 !important;
}

body:has(#about.active) .crumb b {
  color: #c8a84e !important;
  font-weight: 700;
}

body:has(#about.active) .topbar .pill {
  background: rgba(13, 34, 23, 0.75) !important;
  border: 1px solid rgba(200, 168, 78, 0.22) !important;
  color: #d6ded8 !important;
}

body:has(#about.active) .topbar .avatar {
  background: linear-gradient(135deg, #1c3628, #c8a84e) !important;
  color: #07150e !important;
  border: 1px solid #c8a84e !important;
  font-weight: 700;
}`;

  const replacementAboutChrome = `/* Topbar & navigation are managed authoritatively by sidebar-navigation.css for both themes */`;

  replaceExact('frontend/about-page.css', targetAboutChrome, replacementAboutChrome);
}

// --------------------------------------------------------------------------
// 5. RELATIVE STRENGTH (frontend/relative-strength-v3.css)
// --------------------------------------------------------------------------
console.log('5. Removing topbar chrome override from Relative Strength...');
{
  const targetRSChrome = `body:has(#relativestrength.active) .topbar {
  height:54px; padding:0 24px; background:rgba(2,34,31,.48);
  border-bottom:1px solid #b3deca25; backdrop-filter:blur(10px); color:#e3eee8;
}
body:has(#relativestrength.active) .crumb { color:#cfdfd8; font-size:11px; font-weight:400; }
body:has(#relativestrength.active) .crumb b { color:#45ecc0; font-weight:600; }
body:has(#relativestrength.active) .topbar .pill,
body:has(#relativestrength.active) .topbar button { color:#e7f1ed; border-color:#c0e0d23b; background:#052c279c; }
body:has(#relativestrength.active) .topbar .avatar { background:#9af2c1; color:#124437; }`;

  const replacementRSChrome = `/* Topbar & navigation are managed authoritatively by sidebar-navigation.css for both themes */`;

  replaceExact('frontend/relative-strength-v3.css', targetRSChrome, replacementRSChrome);
}

// --------------------------------------------------------------------------
// 6. TRADE ANATOMY (frontend/trade-anatomy.css)
// --------------------------------------------------------------------------
console.log('6. Fixing Trade Anatomy theme isolation...');
{
  const targetTAChrome = `body:has(#tradeanatomy.active) .content{max-width:none;margin:0;padding:0;background:#03130d}
body:has(#tradeanatomy.active) .topbar{border-bottom-color:rgba(68,143,94,.22);background:#04150f;color:#dcece1}
body:has(#tradeanatomy.active) .topbar .crumb{color:#8fa99a}
body:has(#tradeanatomy.active) .topbar .crumb b{color:#d8bd67}
body:has(#tradeanatomy.active) #marketFocusGuard{display:none!important}`;

  const replacementTAChrome = `body:has(#tradeanatomy.active) .content{max-width:none;margin:0;padding:0}
body[data-theme="healthy"]:has(#tradeanatomy.active) .content{background:#03130d}
body:not([data-theme="healthy"]):has(#tradeanatomy.active) .content{background:#0f0c08}
body:has(#tradeanatomy.active) #marketFocusGuard{display:none!important}`;

  replaceExact('frontend/trade-anatomy.css', targetTAChrome, replacementTAChrome);

  // Fix gold titles/buttons in Healthy Green mode in Trade Anatomy
  const targetTATitle = `.ta-title h1 em{color:#dfbd5f;font-style:normal}.ta-title h2{margin:8px 0 0;color:#e2bd54;font-size:16px}`;
  const replacementTATitle = `.ta-title h1 em{color:#34d399;font-style:normal}.ta-title h2{margin:8px 0 0;color:#34d399;font-size:16px}
body:not([data-theme="healthy"]) .ta-title h1 em{color:#dfbd5f}
body:not([data-theme="healthy"]) .ta-title h2{color:#e2bd54}`;
  replaceExact('frontend/trade-anatomy.css', targetTATitle, replacementTATitle);
}

// --------------------------------------------------------------------------
// 7. MISTAKES BOOK (frontend/mistakes-book.css)
// --------------------------------------------------------------------------
console.log('7. Removing brown leather chrome overrides from Mistakes Book...');
{
  const targetMBChrome = `body:has(#mistakesbook.active) .topbar,body:has(#masteredlessons.active) .topbar{background:#181411!important;border-color:#493528!important;color:#eadfce}
body:has(#mistakesbook.active) .topbar .crumb,body:has(#masteredlessons.active) .topbar .crumb{color:#d5c5b4!important;font-size:13px!important;font-weight:500!important}
body:has(#mistakesbook.active) .topbar .crumb b,body:has(#masteredlessons.active) .topbar .crumb b{color:#fff7eb!important;font-weight:700!important;text-shadow:0 1px 2px #0008}
body:has(#mistakesbook.active) .topbar .pill,body:has(#masteredlessons.active) .topbar .pill{border-color:#533e31!important;background:#241d18!important;color:#e8dacb!important}
body:has(#mistakesbook.active) .sidebar,body:has(#masteredlessons.active) .sidebar{background:linear-gradient(180deg,#191817,#10100f)!important;border-color:#3a3027!important}
body:has(#mistakesbook.active) .sidebar .brand,body:has(#masteredlessons.active) .sidebar .brand{border-color:#49382c}
body:has(#mistakesbook.active) .sidebar .brand strong,body:has(#masteredlessons.active) .sidebar .brand strong{color:#f3e9d9}
body:has(#mistakesbook.active) .sidebar .nav button[data-page="mistakesbook"].active{background:linear-gradient(105deg,#5fae7c,#a8e18f)!important;color:#10251a!important;box-shadow:none!important}
.sidebar .nav button[data-page="mistakesbook"] .mb-nav-book{position:relative;display:block;width:13px;height:12px;box-sizing:border-box;border:1.35px solid currentColor;border-radius:2px;color:currentColor!important}
.sidebar .nav button[data-page="mistakesbook"] .mb-nav-book:before{content:'';position:absolute;top:1px;bottom:1px;left:50%;border-left:1px solid currentColor}
.sidebar .nav button[data-page="mistakesbook"] .mb-nav-book:after{content:'';position:absolute;top:2px;left:2px;width:3px;height:3px;border-top:1px solid currentColor;border-bottom:1px solid currentColor;box-shadow:4px 0 0 -1px currentColor}
body:has(#mistakesbook.active) .sidebar:after{content:'“Erro não é fracasso.\\A É matéria-prima de um trader melhor.”';display:block;margin:auto 9px 4px;padding:80px 8px 0;color:#beae9e;font:italic 15px/1.4 Georgia,serif;white-space:pre-line;background:radial-gradient(ellipse at 0 100%,#24553166,transparent 58%);pointer-events:none}`;

  const replacementMBChrome = `/* Topbar & navigation are managed authoritatively by sidebar-navigation.css for both themes */`;

  replaceExact('frontend/mistakes-book.css', targetMBChrome, replacementMBChrome);
}

// --------------------------------------------------------------------------
// 8. SETTINGS EXPERIENCE (frontend/settings-experience.css)
// --------------------------------------------------------------------------
console.log('8. Cleaning up Settings navigation overrides...');
{
  const targetSettingsSidebar = `body:has(#settings.active) .sidebar{background:#082b1e}`;
  const replacementSettingsSidebar = `/* Sidebar maintained by sidebar-navigation.css */`;
  replaceExact('frontend/settings-experience.css', targetSettingsSidebar, replacementSettingsSidebar);

  const targetSettingsGoldSidebar = `body[data-theme="gold"]:has(#settings.active) .sidebar{background:#25271c}`;
  const replacementSettingsGoldSidebar = `/* Gold Sidebar maintained by sidebar-navigation.css */`;
  replaceExact('frontend/settings-experience.css', targetSettingsGoldSidebar, replacementSettingsGoldSidebar);

  const targetSettingsCrumb = `body:has(#settings.active) .crumb{position:relative;z-index:1;display:inline-flex;align-items:center;min-height:30px;padding:0 12px;border:1px solid rgba(24,84,55,.2);border-radius:8px;background:rgba(255,255,249,.82);color:#294b3e;font-weight:700;text-shadow:none;box-shadow:0 3px 13px rgba(21,59,39,.09)}
body:has(#settings.active) .crumb b{color:#0c482c;font-weight:850}`;
  const replacementSettingsCrumb = `/* Topbar & Crumb maintained by sidebar-navigation.css */`;
  replaceExact('frontend/settings-experience.css', targetSettingsCrumb, replacementSettingsCrumb);

  const targetSettingsAppCols = `body:has(#settings.active):not([data-navigation-layout="top"]):not([data-navigation-layout="tiles"]) .app{grid-template-columns:204px minmax(0,1fr)}body:has(#settings.active):not([data-navigation-layout="top"]):not([data-navigation-layout="tiles"]) .sidebar{width:204px;padding-left:14px;padding-right:14px}`;
  const replacementSettingsAppCols = `/* Sidebar width maintained globally at 248px */`;
  replaceExact('frontend/settings-experience.css', targetSettingsAppCols, replacementSettingsAppCols);
}

// --------------------------------------------------------------------------
// 9. PORTFOLIO HEAT (frontend/portfolio-heat-page.css)
// --------------------------------------------------------------------------
console.log('9. Fixing typo in Portfolio Heat quote color...');
{
  const targetHeatTypo = `body:not([data-theme="healthy"]) .heat-hero .eyebrow,.heat-quote b{color:#eccb77}`;
  const replacementHeatTypo = `body:not([data-theme="healthy"]) .heat-hero .eyebrow,body:not([data-theme="healthy"]) .heat-quote b{color:#eccb77}`;
  replaceExact('frontend/portfolio-heat-page.css', targetHeatTypo, replacementHeatTypo);
}

// --------------------------------------------------------------------------
// 10. FORECAST SIMULATOR (frontend/forecast-simulator.css)
// --------------------------------------------------------------------------
console.log('10. Fixing Healthy Green colors in Forecast Simulator...');
{
  const targetForecastLine = `background:linear-gradient(90deg,#78d69a,rgba(216,184,92,.65))}.forecast-process i{position:relative;z-index:1;display:grid;place-items:center;width:42px;height:42px;margin:0 auto 10px;border:1px solid #85dca2;border-radius:50%;background:#0c4931;color:#f0d378;font-style:normal;box-shadow:0 0 0 5px rgba(9,58,39,.8)}`;
  const replacementForecastLine = `background:linear-gradient(90deg,#78d69a,#34d399)}.forecast-process i{position:relative;z-index:1;display:grid;place-items:center;width:42px;height:42px;margin:0 auto 10px;border:1px solid #85dca2;border-radius:50%;background:#0c4931;color:#6ee7b7;font-style:normal;box-shadow:0 0 0 5px rgba(9,58,39,.8)}`;
  replaceExact('frontend/forecast-simulator.css', targetForecastLine, replacementForecastLine);
}

// --------------------------------------------------------------------------
// 11. MARKET CYCLE (frontend/market-cycle-v2.css)
// --------------------------------------------------------------------------
console.log('11. Adding Gold theme & Healthy defaults to Market Cycle...');
{
  const targetMcv2End = `#marketcycle .mcv2-hero-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;flex:none;color:var(--regime-primary);transition:color .35s ease}`;
  const replacementMcv2End = `#marketcycle .mcv2-hero-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;flex:none;color:var(--regime-primary);transition:color .35s ease}

/* ── THEME PALETTE ISOLATION FOR MARKET CYCLE ── */
body:not([data-theme="healthy"]) #marketcycle .mcv2-page {
  background: #0d0a06 radial-gradient(circle at 50% 0%, #26190b 0%, #130e07 60%, #080603 100%) !important;
  color: #f7eedb !important;
}

body:not([data-theme="healthy"]) #marketcycle .mcv2-market-pills {
  border-color: rgba(214, 170, 80, 0.3) !important;
  background: rgba(26, 19, 10, 0.85) !important;
}

body:not([data-theme="healthy"]) #marketcycle .mcv2-market-pill {
  color: #d7c59d !important;
}

body:not([data-theme="healthy"]) #marketcycle .mcv2-market-pill:hover {
  background: rgba(214, 170, 80, 0.15) !important;
  color: #fff4d6 !important;
}

body:not([data-theme="healthy"]) #marketcycle .mcv2-market-pill.active {
  background: linear-gradient(105deg, #b78022, #e0b750) !important;
  color: #171004 !important;
  border-color: rgba(240, 210, 120, 0.4) !important;
}

body:not([data-theme="healthy"]) #marketcycle .mcv2-market-pill.active .mcv2-market-ref {
  background: rgba(0, 0, 0, 0.25) !important;
  color: #171004 !important;
}

body:not([data-theme="healthy"]) #marketcycle .mcv2-market-tag {
  border-color: rgba(214, 170, 80, 0.3) !important;
  background: rgba(26, 19, 10, 0.8) !important;
  color: #deb465 !important;
}

body:not([data-theme="healthy"]) #marketcycle .mcv2-status {
  background: rgba(26, 19, 10, 0.85) !important;
  border-color: rgba(214, 170, 80, 0.35) !important;
}

body:not([data-theme="healthy"]) #marketcycle .mcv2-hero {
  background: linear-gradient(135deg, rgba(38, 26, 11, 0.96) 0%, rgba(20, 14, 7, 0.98) 100%) !important;
  color: #f7eedb !important;
}`;

  replaceExact('frontend/market-cycle-v2.css', targetMcv2End, replacementMcv2End);
}

// --------------------------------------------------------------------------
// 12. THEME AUDIT (frontend/theme-audit.css) - ENRICH REMAINING PAGES
// --------------------------------------------------------------------------
console.log('12. Enriching theme-audit.css with comprehensive Gold & Healthy rules...');
{
  const fullThemeAudit = fs.readFileSync('frontend/theme-audit.css', 'utf8');
  
  // Append missing page isolations to the end of theme-audit.css
  const additionalAuditRules = `
/* --------------------------------------------------------------------------
   THEME PALETTE ISOLATION — COMPLETE PROJECT COVERAGE
   -------------------------------------------------------------------------- */

/* PATRIMÔNIO (Dashboard) — Gold surfaces & typography */
body:not([data-theme="healthy"]) #dashboard .wealth-shell {
  color: #f5ead1;
}

body:not([data-theme="healthy"]) #dashboard .wealth-section-kicker {
  color: #d4af37;
}

body:not([data-theme="healthy"]) #dashboard .wealth-section-kicker i {
  background-color: #d4af37;
}

body:not([data-theme="healthy"]) #dashboard .wealth-heading-content h1 {
  color: #fff8e8;
}

body:not([data-theme="healthy"]) #dashboard .wealth-heading-content p {
  color: #cdbd98;
}

body:not([data-theme="healthy"]) #dashboard .wealth-card {
  background: linear-gradient(145deg, #1c170e, #120e08);
  border-color: #514222;
  color: #f8eed8;
}

body:not([data-theme="healthy"]) #dashboard .wealth-kpi-sub {
  color: #cdbd98;
}

body:not([data-theme="healthy"]) #dashboard .wealth-metric-val {
  color: #f5d77a;
}

/* ATIVOS BLACKLIST — Gold surfaces */
body:not([data-theme="healthy"]) #assetblacklist {
  background: radial-gradient(ellipse at 77% 4%, rgba(86, 68, 25, 0.18), transparent 42%),
              radial-gradient(ellipse at 83% 94%, rgba(99, 22, 32, 0.10), transparent 40%),
              linear-gradient(145deg, #17120a, #0d0a06 72%) !important;
  color: #f8efdb !important;
}

body:not([data-theme="healthy"]) #assetblacklist .ab-panel {
  border-color: #584423 !important;
  background: linear-gradient(155deg, #1c160e, #110e08 70%) !important;
}

body:not([data-theme="healthy"]) #assetblacklist .ab-table th {
  color: #e4ce98 !important;
  background: #241c10 !important;
}

body:not([data-theme="healthy"]) #assetblacklist .ab-table td {
  background: #17140e !important;
  border-color: #4b3a20 !important;
  color: #f1e5c8 !important;
}

body:not([data-theme="healthy"]) #assetblacklist .ab-search {
  border-color: #584423 !important;
  color: #deb465 !important;
  background: #130f08 !important;
}

/* TRADER STORE (Materials) — Gold & Healthy strict isolation */
body[data-theme="healthy"] #materials .materials-hero-spotlight {
  border-color: rgba(52, 211, 153, 0.35) !important;
  background: linear-gradient(135deg, #062217 0%, #03150e 55%, #08291c 100%) !important;
}

body[data-theme="healthy"] #materials .materials-hero-spotlight::before {
  background: radial-gradient(circle at 75% 45%, rgba(52, 211, 153, 0.15) 0%, transparent 62%) !important;
}

body:not([data-theme="healthy"]) #materials .materials-hero-spotlight {
  border-color: rgba(214, 170, 80, 0.42) !important;
  background: linear-gradient(135deg, #241a0b 0%, #120e06 55%, #291c0b 100%) !important;
}

body:not([data-theme="healthy"]) #materials .materials-hero-spotlight::before {
  background: radial-gradient(circle at 75% 45%, rgba(214, 170, 80, 0.18) 0%, transparent 62%) !important;
}

/* SETTINGS (Configurações) — Gold toggles & buttons */
body:not([data-theme="healthy"]) #settings .toggle.on {
  background: #c99e3d !important;
}

body:not([data-theme="healthy"]) #settings .settings-hero {
  color: #f7eedb;
}

body:not([data-theme="healthy"]) #settings .settings-hero h1 {
  color: #fff8e8;
}

body:not([data-theme="healthy"]) #settings .settings-hero p {
  color: #cdbd98;
}
`;

  if (!fullThemeAudit.includes('THEME PALETTE ISOLATION — COMPLETE PROJECT COVERAGE')) {
    fs.writeFileSync('frontend/theme-audit.css', fullThemeAudit + '\n' + additionalAuditRules, 'utf8');
    console.log('[SUCCESS] Extended frontend/theme-audit.css with complete page coverage');
  }
}

console.log('\n=== PROJECT-WIDE PALETTE AUDIT & REPAIR COMPLETE ===');

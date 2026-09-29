const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

// 1. PATCH frontend/sidebar-navigation.js
console.log('1. Patching frontend/sidebar-navigation.js...');
const sidebarJsPath = path.join(root, 'frontend', 'sidebar-navigation.js');
let sidebarJs = fs.readFileSync(sidebarJsPath, 'utf8');

// Fix crumb updating in setActivePage
const crumbRegex = /const crumb = document\.getElementById\('crumb'\);[\s\S]*?for \(const group of allGroups\)[\s\S]*?break;\s*\}\s*\}\s*\}/;

const newCrumbBlock = `const crumb = document.getElementById('crumb');
      if (crumb) {
        let found = false;
        for (const group of allGroups) {
          const matchedItem = group.items.find((sub) => sub.page === pageId);
          if (matchedItem) {
            crumb.innerHTML = \`\${group.label} / <b>\${matchedItem.title}</b>\`;
            found = true;
            break;
          }
        }
        if (!found) {
          const titleMap = {
            today: 'Meu Desktop',
            newtrade: 'Novo Trade',
            journal: 'Diário do Trader',
            dailyroutine: 'Rotina Diária',
            watchlist: 'Watchlist',
            habits: 'Monitor de Hábitos',
            plans: 'Loja do Trader',
            materials: 'Loja do Trader',
            settings: 'Configurações Gerais',
            manual: 'Manual do Software',
            about: 'Sobre'
          };
          const t = titleMap[pageId] || (typeof titles !== 'undefined' && titles[pageId]) || 'Meu Desktop';
          crumb.innerHTML = \`The Healthy Trend Trader / <b>\${t}</b>\`;
        }
      }`;

if (crumbRegex.test(sidebarJs)) {
  sidebarJs = sidebarJs.replace(crumbRegex, newCrumbBlock);
  console.log('  -> crumb updating logic patched');
} else {
  console.log('  -> crumb block pattern match fallback');
  sidebarJs = sidebarJs.replace(/crumb\.textContent\s*=\s*`\$\{group\.label\}\s*\/\s*\$\{matchedItem\.title\}`;/g,
    'crumb.innerHTML = `${group.label} / <b>${matchedItem.title}</b>`;');
}

fs.writeFileSync(sidebarJsPath, sidebarJs, 'utf8');

// 2. PATCH frontend/sidebar-navigation.css
console.log('2. Patching frontend/sidebar-navigation.css...');
const sidebarCssPath = path.join(root, 'frontend', 'sidebar-navigation.css');
let sidebarCss = fs.readFileSync(sidebarCssPath, 'utf8');

// Replace quote card block
sidebarCss = sidebarCss.replace(/\.sidebar-quote-card\s*\{[\s\S]*?background:[\s\S]*?url\('assets\/emerging-leaders\/hero-banner\.jpg'\)[\s\S]*?\}\s*\.sidebar-quote-card:before\s*\{[\s\S]*?\}\s*\.sidebar-quote-text\s*\{[\s\S]*?\}/,
`.sidebar-quote-card {
  position: relative;
  background: linear-gradient(180deg, rgba(6, 32, 21, 0.9) 0%, rgba(2, 17, 11, 0.98) 100%);
  border: 1px solid rgba(52, 211, 153, 0.22);
  border-radius: 12px;
  padding: 13px 14px;
  margin-top: 12px;
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.sidebar-quote-card:before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #10b981, #34d399);
}

.sidebar-quote-text {
  font-size: 11px;
  font-style: italic;
  color: #a7d9b9;
  line-height: 1.45;
  margin: 0;
  letter-spacing: 0.1px;
}

body:not([data-theme="healthy"]) .sidebar-quote-card,
body[data-theme="gold"] .sidebar-quote-card {
  background: linear-gradient(180deg, rgba(28, 24, 15, 0.94) 0%, rgba(14, 12, 7, 0.98) 100%) !important;
  border-color: rgba(214, 170, 80, 0.25) !important;
}

body:not([data-theme="healthy"]) .sidebar-quote-card:before,
body[data-theme="gold"] .sidebar-quote-card:before {
  background: linear-gradient(90deg, #b78022, #facc15) !important;
}

body:not([data-theme="healthy"]) .sidebar-quote-text,
body[data-theme="gold"] .sidebar-quote-text {
  color: #dfd3ba !important;
}`);

// Add complete dual-theme isolation rules for Sidebar & Topbar at end of file if not already present
if (!sidebarCss.includes('THEME PALETTE ISOLATION — SIDEBAR & TOPBAR')) {
  sidebarCss += `
/* ═══════════════════════════════════════════════════════════════════════
   THEME PALETTE ISOLATION — SIDEBAR & TOPBAR
   ═══════════════════════════════════════════════════════════════════════ */

/* ── PREMIUM GOLD: Sidebar, Flyout, Brand & Tooltips ───────────────── */
body:not([data-theme="healthy"]) .sidebar,
body[data-theme="gold"] .sidebar {
  background: #080909 !important;
  border-color: #26241e !important;
}

body:not([data-theme="healthy"]) .sidebar-brand-titles strong,
body[data-theme="gold"] .sidebar-brand-titles strong {
  color: #fffaf0 !important;
}

body:not([data-theme="healthy"]) .sidebar-brand-titles em,
body:not([data-theme="healthy"]) .sidebar-brand-titles small,
body[data-theme="gold"] .sidebar-brand-titles em,
body[data-theme="gold"] .sidebar-brand-titles small {
  color: #d4af37 !important;
}

body:not([data-theme="healthy"]) .sidebar-brand-mark,
body[data-theme="gold"] .sidebar-brand-mark {
  border-color: rgba(214, 170, 80, 0.7) !important;
  background: rgba(214, 170, 80, 0.08) !important;
}

body:not([data-theme="healthy"]) .sidebar-brand-mark:before,
body[data-theme="gold"] .sidebar-brand-mark:before {
  border-color: #f1d58d !important;
}

body:not([data-theme="healthy"]) .sidebar-group-label,
body[data-theme="gold"] .sidebar-group-label {
  color: #8c7e63 !important;
}

body:not([data-theme="healthy"]) .sidebar-btn,
body[data-theme="gold"] .sidebar-btn {
  color: #c4baa2 !important;
}

body:not([data-theme="healthy"]) .sidebar-btn:hover,
body[data-theme="gold"] .sidebar-btn:hover {
  background: rgba(214, 170, 80, 0.08) !important;
  color: #ffffff !important;
  border-color: rgba(214, 170, 80, 0.22) !important;
}

body:not([data-theme="healthy"]) .sidebar-btn.active,
body[data-theme="gold"] .sidebar-btn.active {
  background: linear-gradient(105deg, #b78022, #e0b750) !important;
  color: #0a0a09 !important;
  font-weight: 750 !important;
  border-color: #f2d181 !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 4px 14px rgba(175, 125, 34, 0.3) !important;
}

body:not([data-theme="healthy"]) .sidebar-btn.parent-active,
body[data-theme="gold"] .sidebar-btn.parent-active {
  background: rgba(214, 170, 80, 0.16) !important;
  color: #f0ce7a !important;
  border-color: rgba(214, 170, 80, 0.35) !important;
}

body:not([data-theme="healthy"]) .sidebar-btn.parent-active .sidebar-btn-arrow,
body[data-theme="gold"] .sidebar-btn.parent-active .sidebar-btn-arrow,
body:not([data-theme="healthy"]) .sidebar-btn.flyout-open .sidebar-btn-arrow,
body[data-theme="gold"] .sidebar-btn.flyout-open .sidebar-btn-arrow {
  color: #f0ce7a !important;
}

body:not([data-theme="healthy"]) .sidebar-btn.flyout-open,
body[data-theme="gold"] .sidebar-btn.flyout-open {
  background: rgba(214, 170, 80, 0.14) !important;
  border-color: rgba(214, 170, 80, 0.35) !important;
  color: #fffaf0 !important;
}

body:not([data-theme="healthy"]) .sidebar-flyout,
body[data-theme="gold"] .sidebar-flyout {
  background: rgba(16, 14, 10, 0.97) !important;
  border-color: rgba(214, 170, 80, 0.35) !important;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(214, 170, 80, 0.1) !important;
}

body:not([data-theme="healthy"]) .flyout-header,
body[data-theme="gold"] .flyout-header {
  color: #f0ce7a !important;
  border-color: rgba(214, 170, 80, 0.18) !important;
}

body:not([data-theme="healthy"]) .flyout-item-link,
body[data-theme="gold"] .flyout-item-link {
  color: #e5ded0 !important;
}

body:not([data-theme="healthy"]) .flyout-item-link:hover,
body[data-theme="gold"] .flyout-item-link:hover {
  background: rgba(214, 170, 80, 0.12) !important;
  border-color: rgba(214, 170, 80, 0.3) !important;
  color: #ffffff !important;
}

body:not([data-theme="healthy"]) .flyout-item-link.active,
body[data-theme="gold"] .flyout-item-link.active {
  background: linear-gradient(105deg, #b78022, #e0b750) !important;
  border-color: #f2d181 !important;
  color: #0a0a09 !important;
  font-weight: 750 !important;
}

body:not([data-theme="healthy"]) .flyout-item-icon,
body[data-theme="gold"] .flyout-item-icon {
  background: rgba(214, 170, 80, 0.14) !important;
  color: #f0ce7a !important;
}

body:not([data-theme="healthy"]) .flyout-item-desc,
body[data-theme="gold"] .flyout-item-desc {
  color: #b0a590 !important;
}

body:not([data-theme="healthy"]) .sidebar-tooltip,
body[data-theme="gold"] .sidebar-tooltip {
  background: #18150e !important;
  border-color: rgba(214, 170, 80, 0.35) !important;
  color: #fffaf0 !important;
}

body:not([data-theme="healthy"]) .topbar,
body[data-theme="gold"] .topbar {
  background: rgba(7, 8, 8, 0.88) !important;
  border-bottom: 1px solid #27251f !important;
}

body:not([data-theme="healthy"]) .topbar .crumb,
body[data-theme="gold"] .topbar .crumb {
  color: #8c826e !important;
}

body:not([data-theme="healthy"]) .topbar .crumb b,
body[data-theme="gold"] .topbar .crumb b {
  color: #f1d58d !important;
}

body:not([data-theme="healthy"]) .topbar .avatar,
body[data-theme="gold"] .topbar .avatar {
  background: linear-gradient(135deg, #4b3512, #d5aa50) !important;
  color: #090909 !important;
  border: 1px solid #e5c06e !important;
}

body:not([data-theme="healthy"]) .topbar .market-focus-guard,
body[data-theme="gold"] .topbar .market-focus-guard {
  background: rgba(22, 18, 11, 0.94) !important;
  border: 1px solid rgba(214, 170, 80, 0.35) !important;
  color: #f7eedb !important;
}

body:not([data-theme="healthy"]) .topbar .market-focus-orb,
body[data-theme="gold"] .topbar .market-focus-orb {
  background: #d4af37 !important;
  box-shadow: 0 0 0 4px rgba(214, 170, 80, 0.25) !important;
}

body:not([data-theme="healthy"]) .topbar .market-focus-status .market-focus-state,
body[data-theme="gold"] .topbar .market-focus-status .market-focus-state {
  background: rgba(214, 170, 80, 0.14) !important;
  border-color: rgba(214, 170, 80, 0.45) !important;
  color: #deb465 !important;
}

body:not([data-theme="healthy"]) .topbar .market-focus-guard.closed,
body[data-theme="gold"] .topbar .market-focus-guard.closed {
  border-color: rgba(255, 255, 255, 0.08) !important;
  background: rgba(14, 12, 8, 0.75) !important;
}

/* ── HEALTHY GREEN: Sidebar, Flyout, Brand & Tooltips ──────────────── */
body[data-theme="healthy"] .sidebar {
  background: #06150e !important;
  border-color: #163625 !important;
}

body[data-theme="healthy"] .sidebar-brand-titles strong {
  color: #f0fdf4 !important;
}

body[data-theme="healthy"] .sidebar-brand-titles em {
  color: #34d399 !important;
}

body[data-theme="healthy"] .sidebar-brand-titles small {
  color: #10b981 !important;
}

body[data-theme="healthy"] .sidebar-brand-mark {
  border-color: rgba(52, 211, 153, 0.45) !important;
  background: rgba(16, 185, 129, 0.08) !important;
}

body[data-theme="healthy"] .sidebar-brand-mark:before {
  border-color: #34d399 !important;
}

body[data-theme="healthy"] .sidebar-btn {
  color: #9cb8a9 !important;
}

body[data-theme="healthy"] .sidebar-btn:hover {
  background: rgba(16, 185, 129, 0.08) !important;
  color: #f6fff8 !important;
  border-color: rgba(52, 211, 153, 0.18) !important;
}

body[data-theme="healthy"] .sidebar-btn.active {
  background: linear-gradient(105deg, #10b981, #059669) !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  border-color: rgba(110, 231, 183, 0.45) !important;
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.35) !important;
}

body[data-theme="healthy"] .sidebar-btn.parent-active {
  background: rgba(16, 185, 129, 0.14) !important;
  color: #34d399 !important;
  border-color: rgba(52, 211, 153, 0.3) !important;
}

body[data-theme="healthy"] .sidebar-btn.parent-active .sidebar-btn-arrow,
body[data-theme="healthy"] .sidebar-btn.flyout-open .sidebar-btn-arrow {
  color: #34d399 !important;
}

body[data-theme="healthy"] .sidebar-flyout {
  background: rgba(4, 18, 12, 0.97) !important;
  border-color: rgba(16, 185, 129, 0.3) !important;
}

body[data-theme="healthy"] .flyout-header {
  color: #34d399 !important;
  border-color: rgba(52, 211, 153, 0.16) !important;
}

body[data-theme="healthy"] .flyout-item-link {
  color: #dcece2 !important;
}

body[data-theme="healthy"] .flyout-item-link:hover {
  background: rgba(16, 185, 129, 0.1) !important;
  border-color: rgba(52, 211, 153, 0.24) !important;
  color: #ffffff !important;
}

body[data-theme="healthy"] .flyout-item-link.active {
  background: linear-gradient(105deg, #10b981, #059669) !important;
  border-color: rgba(110, 231, 183, 0.4) !important;
  color: #ffffff !important;
}

body[data-theme="healthy"] .flyout-item-icon {
  background: rgba(16, 185, 129, 0.12) !important;
  color: #34d399 !important;
}

body[data-theme="healthy"] .topbar {
  background: rgba(6, 14, 10, 0.92) !important;
  border-bottom: 1px solid rgba(52, 211, 153, 0.15) !important;
}

body[data-theme="healthy"] .topbar .crumb {
  color: #728c7e !important;
}

body[data-theme="healthy"] .topbar .crumb b {
  color: #34d399 !important;
}

body[data-theme="healthy"] .topbar .avatar {
  background: linear-gradient(135deg, #059669, #34d399) !important;
  color: #042416 !important;
  border: 1px solid #6ee7b7 !important;
}

body[data-theme="healthy"] .topbar .market-focus-guard {
  background: rgba(8, 20, 14, 0.88) !important;
  border: 1px solid rgba(52, 211, 153, 0.22) !important;
  color: #eaf6ee !important;
}

body[data-theme="healthy"] .topbar .market-focus-orb {
  background: #10b981 !important;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25) !important;
}

body[data-theme="healthy"] .topbar .market-focus-status .market-focus-state {
  background: rgba(16, 185, 129, 0.15) !important;
  border-color: rgba(52, 211, 153, 0.35) !important;
  color: #34d399 !important;
}

body[data-theme="healthy"] .topbar .market-focus-guard.closed {
  border-color: rgba(255, 255, 255, 0.08) !important;
  background: rgba(6, 14, 10, 0.75) !important;
}
`;
}

fs.writeFileSync(sidebarCssPath, sidebarCss, 'utf8');
console.log('  -> sidebar-navigation.css patched successfully');

// 3. PATCH frontend/today-cockpit.js
console.log('3. Patching frontend/today-cockpit.js...');
const todayJsPath = path.join(root, 'frontend', 'today-cockpit.js');
let todayJs = fs.readFileSync(todayJsPath, 'utf8');

// Change hardcoded trophy stroke
todayJs = todayJs.replace(/stroke="#eab308"/g, 'stroke="currentColor"');

// Ensure stat svg elements can be themed
todayJs = todayJs.replace(/class="stat-sparkline"/g, 'class="stat-sparkline theme-stat-sparkline"');
todayJs = todayJs.replace(/class="stat-bars"/g, 'class="stat-bars theme-stat-bars"');

fs.writeFileSync(todayJsPath, todayJs, 'utf8');
console.log('  -> today-cockpit.js patched successfully');

// 4. PATCH frontend/today-cockpit.css
console.log('4. Patching frontend/today-cockpit.css...');
const todayCssPath = path.join(root, 'frontend', 'today-cockpit.css');
let todayCss = fs.readFileSync(todayCssPath, 'utf8');

// Add comprehensive dual-theme styles for Today/Desktop widgets
if (!todayCss.includes('TODAY COCKPIT — COMPREHENSIVE THEME PALETTE ISOLATION')) {
  todayCss += `
/* ═══════════════════════════════════════════════════════════════════════
   TODAY COCKPIT — COMPREHENSIVE THEME PALETTE ISOLATION
   ═══════════════════════════════════════════════════════════════════════ */

/* ── 1. HEALTHY GREEN THEME (Verde Esmeralda Puro) ─────────────────── */
body[data-theme="healthy"] #today .dashboard-widget {
  background: linear-gradient(165deg, #0a110d 0%, #060907 100%) !important;
  border-color: rgba(52, 211, 153, 0.12) !important;
}

body[data-theme="healthy"] #today .dashboard-widget:hover {
  border-color: rgba(52, 211, 153, 0.25) !important;
}

/* Summary cards */
body[data-theme="healthy"] .desktop-stat-item {
  background: linear-gradient(170deg, #0d1410 0%, #070a08 100%) !important;
  border-color: rgba(52, 211, 153, 0.1) !important;
}

body[data-theme="healthy"] .desktop-stat-label {
  color: #637f70 !important;
}

body[data-theme="healthy"] .desktop-stat-value {
  color: #ffffff !important;
}

/* Card 4 (Maior trade) — Verde no Healthy Green! */
body[data-theme="healthy"] .desktop-stat-value.gold {
  color: #34d399 !important;
  text-shadow: 0 0 14px rgba(52, 211, 153, 0.25) !important;
}

body[data-theme="healthy"] .stat-icon-trophy {
  color: #34d399 !important;
  stroke: #34d399 !important;
  filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.4)) !important;
}

body[data-theme="healthy"] .stat-icon-shield {
  color: #34d399 !important;
  stroke: #34d399 !important;
  filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.4)) !important;
}

body[data-theme="healthy"] .stat-sparkline path {
  stroke: #34d399 !important;
}

body[data-theme="healthy"] .stat-bars rect {
  fill: #10b981 !important;
}

body[data-theme="healthy"] .desktop-stat-pill.positive {
  background: rgba(16, 185, 129, 0.15) !important;
  color: #34d399 !important;
  border: 1px solid rgba(16, 185, 129, 0.25) !important;
}

/* Telemetria de mercado */
body[data-theme="healthy"] .desktop-telemetry-bar {
  background: rgba(6, 14, 10, 0.85) !important;
  border-color: rgba(52, 211, 153, 0.15) !important;
}

body[data-theme="healthy"] .today-source.cached {
  background: rgba(16, 185, 129, 0.15) !important;
  color: #34d399 !important;
  border: 1px solid rgba(16, 185, 129, 0.25) !important;
}

body[data-theme="healthy"] .desktop-editorial-motto {
  color: #4d6859 !important;
}

body[data-theme="healthy"] .today-dashboard-actions .dashboard-edit-toggle {
  background: #092116 !important;
  border-color: rgba(52, 211, 153, 0.3) !important;
  color: #eaf6ee !important;
}

body[data-theme="healthy"] .today-dashboard-actions .dashboard-edit-toggle:hover {
  background: #113825 !important;
  border-color: #34d399 !important;
}

/* Ciclo de Mercado — Atmosfera Esmeralda Limpa no Healthy Green */
body[data-theme="healthy"] #today .dashboard-widget[data-widget-id="market-cycle"] {
  background: linear-gradient(165deg, #0c1510 0%, #070a08 100%) !important;
  border-color: rgba(52, 211, 153, 0.16) !important;
}

body[data-theme="healthy"] #today .dashboard-widget[data-widget-id="market-cycle"] .desktop-widget-art {
  opacity: 0.22 !important;
  filter: drop-shadow(0 0 16px rgba(16, 185, 129, 0.25)) !important;
}

body[data-theme="healthy"] #today .dashboard-widget[data-widget-id="market-cycle"] .desktop-widget-art svg {
  stroke: #10b981 !important;
}

body[data-theme="healthy"] #today .dashboard-widget[data-widget-id="market-cycle"][data-cycle-state="transition"] {
  background: linear-gradient(165deg, #0e1712 0%, #070a08 100%) !important;
  border-color: rgba(52, 211, 153, 0.2) !important;
  box-shadow: 0 14px 30px -4px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(52, 211, 153, 0.08) !important;
}

body[data-theme="healthy"] #today .dashboard-widget[data-widget-id="market-cycle"][data-cycle-state="transition"] .desktop-widget-art {
  opacity: 0.25 !important;
  filter: drop-shadow(0 0 16px rgba(16, 185, 129, 0.25)) !important;
}

body[data-theme="healthy"] #today .dashboard-widget[data-widget-id="market-cycle"][data-cycle-state="transition"] .desktop-widget-art svg {
  stroke: #10b981 !important;
}

/* Portfolio Heat */
body[data-theme="healthy"] #today .dashboard-widget[data-widget-id="portfolio"] .dashboard-progress i {
  background: linear-gradient(90deg, #059669, #34d399) !important;
}

/* ── 2. PREMIUM GOLD THEME (Dourado Nobre / Carvão Quente) ────────── */
body:not([data-theme="healthy"]) #today .dashboard-widget,
body[data-theme="gold"] #today .dashboard-widget {
  background: linear-gradient(165deg, #14120e 0%, #090806 100%) !important;
  border-color: rgba(214, 170, 80, 0.14) !important;
  box-shadow: 0 14px 30px -4px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(214, 170, 80, 0.06) !important;
}

body:not([data-theme="healthy"]) #today .dashboard-widget:hover,
body[data-theme="gold"] #today .dashboard-widget:hover {
  border-color: rgba(214, 170, 80, 0.3) !important;
}

/* Summary cards */
body:not([data-theme="healthy"]) .desktop-stat-item,
body[data-theme="gold"] .desktop-stat-item {
  background: linear-gradient(170deg, #16140f 0%, #0a0907 100%) !important;
  border-color: rgba(214, 170, 80, 0.14) !important;
}

body:not([data-theme="healthy"]) .desktop-stat-label,
body[data-theme="gold"] .desktop-stat-label {
  color: #96886e !important;
}

body:not([data-theme="healthy"]) .desktop-stat-value,
body[data-theme="gold"] .desktop-stat-value {
  color: #fffaf0 !important;
}

body:not([data-theme="healthy"]) .desktop-stat-value.gold,
body[data-theme="gold"] .desktop-stat-value.gold {
  color: #fde047 !important;
  text-shadow: 0 0 14px rgba(253, 224, 71, 0.25) !important;
}

body:not([data-theme="healthy"]) .stat-icon-trophy,
body[data-theme="gold"] .stat-icon-trophy {
  color: #facc15 !important;
  stroke: #facc15 !important;
  filter: drop-shadow(0 0 6px rgba(234, 179, 8, 0.35)) !important;
}

body:not([data-theme="healthy"]) .stat-icon-shield,
body[data-theme="gold"] .stat-icon-shield {
  color: #d4af37 !important;
  stroke: #d4af37 !important;
  filter: drop-shadow(0 0 6px rgba(214, 170, 80, 0.4)) !important;
}

body:not([data-theme="healthy"]) .stat-sparkline path,
body[data-theme="gold"] .stat-sparkline path {
  stroke: #d4af37 !important;
}

body:not([data-theme="healthy"]) .stat-bars rect,
body[data-theme="gold"] .stat-bars rect {
  fill: #d4af37 !important;
}

body:not([data-theme="healthy"]) .desktop-stat-pill.positive,
body[data-theme="gold"] .desktop-stat-pill.positive {
  background: rgba(214, 170, 80, 0.15) !important;
  color: #f0ce7a !important;
  border: 1px solid rgba(214, 170, 80, 0.3) !important;
}

/* Telemetria de mercado */
body:not([data-theme="healthy"]) .desktop-telemetry-bar,
body[data-theme="gold"] .desktop-telemetry-bar {
  background: rgba(18, 15, 10, 0.88) !important;
  border-color: rgba(214, 170, 80, 0.2) !important;
}

body:not([data-theme="healthy"]) .today-source.cached,
body[data-theme="gold"] .today-source.cached {
  background: rgba(214, 170, 80, 0.15) !important;
  color: #f0ce7a !important;
  border: 1px solid rgba(214, 170, 80, 0.3) !important;
}

body:not([data-theme="healthy"]) .desktop-editorial-motto,
body[data-theme="gold"] .desktop-editorial-motto {
  color: #7f6c48 !important;
}

body:not([data-theme="healthy"]) .today-dashboard-actions .dashboard-edit-toggle,
body[data-theme="gold"] .today-dashboard-actions .dashboard-edit-toggle {
  background: #241d10 !important;
  border-color: rgba(214, 170, 80, 0.35) !important;
  color: #f0ce7a !important;
}

body:not([data-theme="healthy"]) .today-dashboard-actions .dashboard-edit-toggle:hover,
body[data-theme="gold"] .today-dashboard-actions .dashboard-edit-toggle:hover {
  background: #332815 !important;
  border-color: #f0ce7a !important;
}

/* Ciclo de Mercado — Atmosfera Dourada no Premium Gold */
body:not([data-theme="healthy"]) #today .dashboard-widget[data-widget-id="market-cycle"],
body[data-theme="gold"] #today .dashboard-widget[data-widget-id="market-cycle"] {
  background: linear-gradient(165deg, #18140c 0%, #090805 100%) !important;
  border-color: rgba(214, 170, 80, 0.22) !important;
}

body:not([data-theme="healthy"]) #today .dashboard-widget[data-widget-id="market-cycle"] .desktop-widget-art,
body[data-theme="gold"] #today .dashboard-widget[data-widget-id="market-cycle"] .desktop-widget-art {
  opacity: 0.28 !important;
  filter: drop-shadow(0 0 16px rgba(214, 170, 80, 0.28)) !important;
}

body:not([data-theme="healthy"]) #today .dashboard-widget[data-widget-id="market-cycle"] .desktop-widget-art svg,
body[data-theme="gold"] #today .dashboard-widget[data-widget-id="market-cycle"] .desktop-widget-art svg {
  stroke: #d4af37 !important;
}

/* Portfolio Heat */
body:not([data-theme="healthy"]) #today .dashboard-widget[data-widget-id="portfolio"] .dashboard-progress i,
body[data-theme="gold"] #today .dashboard-widget[data-widget-id="portfolio"] .dashboard-progress i {
  background: linear-gradient(90deg, #9b6c1c, #ebc668) !important;
}
`;
}

fs.writeFileSync(todayCssPath, todayCss, 'utf8');
console.log('  -> today-cockpit.css patched successfully');

// 5. PATCH index.html
console.log('5. Patching index.html...');
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Fix static breadcrumb in index.html line 497
html = html.replace(/<div class="crumb" id="crumb">The Healthy Trend Trader \/ <b>Loja do Trader<\/b><\/div>/g,
  '<div class="crumb" id="crumb">The Healthy Trend Trader / <b>Meu Desktop</b></div>');

// In go(pageId), make sure crumb.innerHTML is formatted nicely
html = html.replace(/const crumb=document\.getElementById\('crumb'\);if\(crumb\)crumb\.textContent=typeof uiText==='function'\?uiText\(titles\[id\]\):titles\[id\];/g,
  "const crumb=document.getElementById('crumb');if(crumb){const t=typeof uiText==='function'?uiText(titles[id]):titles[id];crumb.innerHTML='The Healthy Trend Trader / <b>'+(t||'Meu Desktop')+'</b>';}");

// Ensure .side-card border in Healthy Green
html = html.replace(/body\[data-theme="healthy"\] \.side-card\{background:#173426;border-color:#31513f\}/g,
  'body[data-theme="healthy"] .side-card{background:linear-gradient(180deg,rgba(6,32,21,0.92) 0%,rgba(2,17,11,0.98) 100%);border:1px solid rgba(52,211,153,0.22);color:#a7d9b9}');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('  -> index.html patched successfully');

console.log('All palette revision patches applied cleanly!');

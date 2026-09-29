const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Healthy Green: sidebar active button uses emerald gradient', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.css'), 'utf8');
  assert.match(css, /body\[data-theme="healthy"\]\s+\.sidebar-btn\.active\s*\{[^}]*#164e35/);
  assert.match(css, /body\[data-theme="healthy"\]\s+\.sidebar-btn\.active\s*\{[^}]*#226f4a/);
});

test('Healthy Green: stat card 4 and trophy icon use emerald accents', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'today-cockpit.css'), 'utf8');
  assert.match(css, /body\[data-theme="healthy"\]\s+\.desktop-stat-value\.gold\s*\{[^}]*#34d399/);
  assert.match(css, /body\[data-theme="healthy"\]\s+\.stat-icon-trophy\s*\{[^}]*#34d399/);
});

test('Healthy Green: market cycle holographic sphere uses emerald stroke', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'today-cockpit.css'), 'utf8');
  assert.match(css, /body\[data-theme="healthy"\]\s+#today\s+\.dashboard-widget\[data-widget-id="market-cycle"\]\s+\.desktop-widget-art svg\s*\{[^}]*#10b981/);
});

test('Healthy Green: sidebar quote card has emerald border and gradient accent without legacy banner', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.css'), 'utf8');
  assert.match(css, /\.sidebar-quote-card:before\s*\{[^}]*#10b981/);
  assert.match(css, /\.sidebar-quote-card:before\s*\{[^}]*#34d399/);
  assert.ok(!css.includes('hero-banner.jpg'), 'Não deve conter hero-banner.jpg');
});

test('Healthy Green: emerging leaders cluster cards and NOVO badge use emerald', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'emerging-leaders.css'), 'utf8');
  assert.match(css, /\.el-cluster-card\.active\s*\{[^}]*#34d399/);
  assert.match(css, /\.el-badge-new\s*\{[^}]*#34d399/);
});

test('Healthy Green: portfolio heat quote does not leak gold color', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'portfolio-heat-page.css'), 'utf8');
  assert.ok(!css.includes(',.heat-quote b{color:#eccb77}'));
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)\s+\.heat-quote b\{color:#eccb77\}/);
});

test('Healthy Green: trade anatomy does not have hardcoded gold crumb', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'trade-anatomy.css'), 'utf8');
  assert.ok(!css.includes('body:has(#tradeanatomy.active) .topbar .crumb b{color:#d8bd67}'));
});

test('Premium Gold: sidebar active button uses warm gold gradient', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.css'), 'utf8');
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.sidebar-btn\.active\s*\{[^}]*#b78022/);
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.sidebar-btn\.active\s*\{[^}]*#e0b750/);
});

test('Premium Gold: stat card 4 and trophy icon switch to warm gold', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'today-cockpit.css'), 'utf8');
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.desktop-stat-value\.gold\s*\{[^}]*#fde047/);
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.stat-icon-trophy\s*\{[^}]*#facc15/);
});

test('Premium Gold: market cycle holographic sphere switches to gold wireframe', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'today-cockpit.css'), 'utf8');
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)[^{]*\.desktop-widget-art svg\s*\{[^}]*#d4af37/);
});

test('Premium Gold: market cycle page has warm charcoal gold background in gold theme', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'market-cycle-v2.css'), 'utf8');
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)\s+#marketcycle\s+\.mcv2-page\s*\{[^}]*#0d0a06/);
  assert.match(css, /body:not\(\[data-theme="healthy"\]\)\s+#marketcycle\s+\.mcv2-market-pill\.active\s*\{[^}]*#e0b750/);
});

test('Premium Gold: watchlist and emerging leaders topbars do not force emerald green', () => {
  const wlCss = fs.readFileSync(path.join(root, 'frontend', 'watchlist.css'), 'utf8');
  assert.ok(!wlCss.includes('body:has(#watchlist.active) .topbar { background: rgba(2, 19, 12'));
  const elCss = fs.readFileSync(path.join(root, 'frontend', 'emerging-leaders.css'), 'utf8');
  assert.ok(!elCss.includes('body:has(#emergingleaders.active) .topbar { background: rgba(2, 19, 12'));
});

test('Premium Gold: settings toggle switches to gold accent in gold mode', () => {
  const auditCss = fs.readFileSync(path.join(root, 'frontend', 'theme-audit.css'), 'utf8');
  assert.match(auditCss, /body:not\(\[data-theme="healthy"\]\)\s+#settings\s+\.toggle\.on\s*\{[^}]*#c99e3d/);
});

test('Breadcrumb: index.html default markup shows "The Healthy Trend Trader / Meu Desktop"', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('<div class="crumb">The Healthy Trend Trader / <b id="crumb">Meu Desktop</b></div>'));
});

test('Breadcrumb: sidebar-navigation.js updates title dynamically per page', () => {
  const js = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.js'), 'utf8');
  assert.ok(js.includes('The Healthy Trend Trader / <b>${t}</b>'));
});

test('Trader Workspace: right column uses compact 2x2 intentional grid layout without empty space', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'navigation-hub-support.css'), 'utf8');
  assert.ok(css.includes('align-items: start;'), 'Layout should have align-items: start to prevent vertical stretching');
  assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'), 'Support panel should arrange cards in 2x2 grid');
  assert.ok(css.includes('align-self: start;'), 'Support panel should align to start to fit content height');
  assert.ok(css.includes('clamp(270px, 20vw, 320px)'), 'Layout right column should have compact width');

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('RECURSOS DO TRADER'), 'Hub support title should be RECURSOS DO TRADER');
});

test('Trader Workspace: right column adapts responsively and supports Premium Gold theme', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'navigation-hub-support.css'), 'utf8');
  assert.ok(css.includes('@media (max-width: 1180px)'), 'Should contain responsive breakpoint for screens <= 1180px');
  assert.ok(css.includes('body[data-theme="gold"][data-navigation-layout="tiles"] .navigation-hub-support'), 'Should style support panel for gold theme');
});

test('Flyout Menu: selected active item subtitles have high contrast and crystal-clear legibility', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.css'), 'utf8');
  // Healthy Green: active item subtitle must be light mint/white (#ecfdf5), not dark green (#8caea0)
  assert.ok(css.includes('.flyout-item-link.active .flyout-item-desc'), 'Must have dedicated style for active flyout subtitle');
  assert.match(css, /body\[data-theme="healthy"\]\s+\.flyout-item-link\.active\s+\.flyout-item-desc[^{]*\{[^}]*#ecfdf5/);
  // Premium Gold: active item subtitle must be deep dark charcoal-gold (#241805) on the gold background
  assert.match(css, /body\[data-theme="gold"\]\s+\.flyout-item-link\.active\s+\.flyout-item-desc[^{]*\{[^}]*#241805/);
});

/**
 * HEALTHY TREND TRADER — FAVICON THEME MODEL TEST SUITE
 * 
 * Verifies dynamic favicon management across Healthy Green, Premium Gold, and Pigeon Light:
 * - Theme normalization and asset path mapping
 * - SVG file existence and geometric identity preservation
 * - Dynamic DOM updates for link[rel="icon"] and link[rel="apple-touch-icon"]
 * - Anti-duplication and fallback guarantees
 * - Integration with index.html and applyTheme()
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const faviconModel = require('./favicon-theme-model.js');

describe('FaviconThemeModel — Mapping & Paths', () => {
  test('normalizeTheme handles all valid themes and safe fallbacks', () => {
    assert.equal(faviconModel.normalizeTheme('healthy'), 'healthy');
    assert.equal(faviconModel.normalizeTheme('gold'), 'gold');
    assert.equal(faviconModel.normalizeTheme('pigeon'), 'pigeon');

    // Case-insensitivity & whitespace trimming
    assert.equal(faviconModel.normalizeTheme('  GOLD  '), 'gold');
    assert.equal(faviconModel.normalizeTheme('Pigeon'), 'pigeon');
    assert.equal(faviconModel.normalizeTheme('HEALTHY'), 'healthy');

    // Safe fallbacks for unknown, null, or undefined values
    assert.equal(faviconModel.normalizeTheme(null), 'healthy');
    assert.equal(faviconModel.normalizeTheme(undefined), 'healthy');
    assert.equal(faviconModel.normalizeTheme('dark'), 'healthy');
    assert.equal(faviconModel.normalizeTheme('unknown'), 'healthy');
  });

  test('getFaviconPath maps each theme to its respective SVG asset', () => {
    const healthyPath = faviconModel.getFaviconPath('healthy', false);
    const goldPath = faviconModel.getFaviconPath('gold', false);
    const pigeonPath = faviconModel.getFaviconPath('pigeon', false);

    assert.equal(healthyPath, 'assets/favicon-healthy.svg');
    assert.equal(goldPath, 'assets/favicon-gold.svg');
    assert.equal(pigeonPath, 'assets/favicon-pigeon.svg');

    // Default with version query string to prevent stale browser cache
    const withVersion = faviconModel.getFaviconPath('gold', true);
    assert.match(withVersion, /^assets\/favicon-gold\.svg\?v=\d+/);
  });
});

describe('Favicon SVG Assets — Geometry & Identity Preservation', () => {
  const rootDir = path.resolve(__dirname, '..');
  const files = {
    canonical: 'assets/favicon.svg',
    healthy: 'assets/favicon-healthy.svg',
    gold: 'assets/favicon-gold.svg',
    pigeon: 'assets/favicon-pigeon.svg'
  };

  test('All favicon SVG files exist in assets/', () => {
    Object.entries(files).forEach(([name, relPath]) => {
      const fullPath = path.join(rootDir, relPath);
      assert.ok(fs.existsSync(fullPath), `Favicon file '${relPath}' for ${name} must exist on disk`);
    });
  });

  test('All favicon versions preserve exact geometry and proportions', () => {
    const canonicalContent = fs.readFileSync(path.join(rootDir, files.canonical), 'utf8');

    // Extract core geometry from canonical
    const viewBox = canonicalContent.match(/viewBox="([^"]+)"/)?.[1];
    const leafPath = canonicalContent.match(/<path\s+d="([^"]+)"\s+fill="url/)?.[1];
    const veinPath = canonicalContent.match(/<path\s+d="([^"]+)"\s+fill="none"/)?.[1];

    assert.equal(viewBox, '0 0 64 64', 'ViewBox must be 64x64');
    assert.ok(leafPath, 'Leaf path exists');
    assert.ok(veinPath, 'Vein stroke path exists');

    ['healthy', 'gold', 'pigeon'].forEach(theme => {
      const content = fs.readFileSync(path.join(rootDir, files[theme]), 'utf8');

      // 1. Same viewBox
      assert.match(content, /viewBox="0 0 64 64"/, `${theme} favicon must have 64x64 viewBox`);

      // 2. Same squircle dimensions and corner radius rx="18"
      assert.match(content, /<rect width="64" height="64" rx="18"/, `${theme} favicon must have 64x64 squircle with rx=18`);

      // 3. Exact leaf path
      assert.ok(content.includes(leafPath), `${theme} favicon must retain the identical leaf geometry`);

      // 4. Exact vein path
      assert.ok(content.includes(veinPath), `${theme} favicon must retain the identical vein geometry`);
    });
  });

  test('Colors match theme visual identity', () => {
    const healthySvg = fs.readFileSync(path.join(rootDir, files.healthy), 'utf8');
    const goldSvg = fs.readFileSync(path.join(rootDir, files.gold), 'utf8');
    const pigeonSvg = fs.readFileSync(path.join(rootDir, files.pigeon), 'utf8');

    // Healthy Green: emerald background, lime/mint gradient, dark emerald stroke
    assert.match(healthySvg, /fill="#0D3327"/i, 'Healthy has deep emerald background');
    assert.match(healthySvg, /stop-color="#BDEB85"/i, 'Healthy has lime gradient start');

    // Premium Gold: obsidian background, gold gradient, deep gold stroke
    assert.match(goldSvg, /fill="#14120D"/i, 'Gold has obsidian background');
    assert.match(goldSvg, /stop-color="#F5DE9C"/i, 'Gold has champagne gold gradient start');
    assert.match(goldSvg, /stop-color="#E0B750"/i, 'Gold has signature gold gradient stop');

    // Pigeon Light: deep serene navy background, sky blue gradient
    assert.match(pigeonSvg, /fill="#0D2538"/i, 'Pigeon has deep serene navy background');
    assert.match(pigeonSvg, /stop-color="#BAE6FD"/i, 'Pigeon has light sky cloud gradient start');
    assert.match(pigeonSvg, /stop-color="#58A6CA"/i, 'Pigeon has signature sky blue gradient stop');
  });
});

describe('FaviconThemeModel — Dynamic DOM Manipulation', () => {
  // Minimal DOM mock for isolated Node testing
  function createMockDocument(initialIcons = []) {
    const headChildren = [];

    const mockDoc = {
      head: {
        appendChild(el) {
          headChildren.push(el);
          el.parentNode = mockDoc.head;
          return el;
        }
      },
      body: {
        dataset: {}
      },
      documentElement: {
        dataset: {}
      },
      createElement(tag) {
        return {
          tagName: tag.toUpperCase(),
          rel: '',
          type: '',
          href: '',
          parentNode: null,
          remove() {
            const idx = headChildren.indexOf(this);
            if (idx !== -1) headChildren.splice(idx, 1);
            this.parentNode = null;
          }
        };
      },
      querySelector(selector) {
        if (selector === 'link[rel="icon"]') {
          return headChildren.find(el => el.rel === 'icon') || null;
        }
        if (selector === 'link[rel="apple-touch-icon"]') {
          return headChildren.find(el => el.rel === 'apple-touch-icon') || null;
        }
        return null;
      },
      querySelectorAll(selector) {
        if (selector.includes('rel="icon"')) {
          return headChildren.filter(el => el.rel === 'icon' || el.rel === 'shortcut icon');
        }
        if (selector.includes('rel="apple-touch-icon"')) {
          return headChildren.filter(el => el.rel === 'apple-touch-icon');
        }
        return [];
      },
      dispatchEvent(evt) {
        mockDoc._lastEvent = evt;
      }
    };

    initialIcons.forEach(cfg => {
      const el = mockDoc.createElement('link');
      el.rel = cfg.rel;
      el.type = cfg.type || '';
      el.href = cfg.href || '';
      mockDoc.head.appendChild(el);
    });

    return mockDoc;
  }

  test('updateFavicon updates existing link elements without creating duplicates', () => {
    const doc = createMockDocument([
      { rel: 'icon', type: 'image/svg+xml', href: 'assets/favicon.svg' },
      { rel: 'apple-touch-icon', href: 'assets/favicon.svg' }
    ]);

    const result = faviconModel.updateFavicon('gold', doc);

    assert.equal(result.theme, 'gold');
    assert.match(result.href, /assets\/favicon-gold\.svg/);

    const icons = doc.querySelectorAll('link[rel="icon"]');
    const apples = doc.querySelectorAll('link[rel="apple-touch-icon"]');

    assert.equal(icons.length, 1, 'Must maintain exactly 1 link[rel="icon"]');
    assert.equal(apples.length, 1, 'Must maintain exactly 1 link[rel="apple-touch-icon"]');
    assert.match(icons[0].href, /assets\/favicon-gold\.svg/);
    assert.match(apples[0].href, /assets\/favicon-gold\.svg/);
  });

  test('updateFavicon creates link elements if missing', () => {
    const doc = createMockDocument([]);

    const result = faviconModel.updateFavicon('pigeon', doc);

    assert.equal(result.theme, 'pigeon');
    assert.match(result.href, /assets\/favicon-pigeon\.svg/);

    const icon = doc.querySelector('link[rel="icon"]');
    const apple = doc.querySelector('link[rel="apple-touch-icon"]');

    assert.ok(icon, 'link[rel="icon"] must be created');
    assert.ok(apple, 'link[rel="apple-touch-icon"] must be created');
    assert.match(icon.href, /assets\/favicon-pigeon\.svg/);
    assert.match(apple.href, /assets\/favicon-pigeon\.svg/);
  });

  test('updateFavicon removes any extraneous duplicate links', () => {
    const doc = createMockDocument([
      { rel: 'icon', href: 'old-1.svg' },
      { rel: 'icon', href: 'old-2.svg' },
      { rel: 'apple-touch-icon', href: 'old-apple-1.svg' },
      { rel: 'apple-touch-icon', href: 'old-apple-2.svg' }
    ]);

    faviconModel.updateFavicon('healthy', doc);

    const icons = doc.querySelectorAll('link[rel="icon"]');
    const apples = doc.querySelectorAll('link[rel="apple-touch-icon"]');

    assert.equal(icons.length, 1, 'Must collapse duplicate icons to 1');
    assert.equal(apples.length, 1, 'Must collapse duplicate apple-touch-icons to 1');
    assert.match(icons[0].href, /assets\/favicon-healthy\.svg/);
  });

  test('resolveCurrentTheme derives theme from document.body or documentElement', () => {
    const doc = createMockDocument([]);
    doc.body.dataset.theme = 'gold';

    assert.equal(faviconModel.resolveCurrentTheme(doc), 'gold');

    doc.body.dataset.theme = '';
    doc.documentElement.dataset.theme = 'pigeon';
    assert.equal(faviconModel.resolveCurrentTheme(doc), 'pigeon');
  });
});

describe('FaviconThemeModel — Integration in index.html', () => {
  const rootDir = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  test('index.html loads favicon-theme-model.js in <head>', () => {
    assert.match(html, /<script\s+src="frontend\/favicon-theme-model\.js[^"]*">\s*<\/script>/);
  });

  test('index.html immediately updates favicon based on saved preference', () => {
    assert.match(html, /localStorage\.getItem\(['"]healthy-trend-theme['"]\)/);
    assert.match(html, /updateThemeFavicon/);
  });

  test('applyTheme() invokes updateThemeFavicon() on every theme switch', () => {
    assert.match(html, /function\s+applyTheme\s*\([^)]*\)\s*\{[\s\S]*?updateThemeFavicon\s*\(\s*selected\s*\)/);
  });
});

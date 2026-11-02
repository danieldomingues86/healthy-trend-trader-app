/**
 * HEALTHY TREND TRADER — GLOBAL VISUAL CONSISTENCY & MULTI-THEME TEST SUITE
 * 
 * Comprehensive automated verification for 100% of screens and components:
 * - Strict theme isolation across all 3 themes: Healthy Green, Premium Gold, Pigeon Light
 * - WCAG 2.1 contrast compliance (AA minimum 4.5:1 for body, 3.0:1 for headings/labels)
 * - 46 screen inventory coverage and layout integrity
 * - Zero undeclared variables and zero theme selector leakage
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const engine = require('./visual-consistency-engine.js');
const navModel = require('./navigation-system-model.js');

describe('Visual Consistency Engine & Design Tokens', () => {
  test('Engine exports all three official themes and tokens', () => {
    assert.ok(engine.THEMES.healthy, 'Healthy Green theme defined');
    assert.ok(engine.THEMES.gold, 'Premium Gold theme defined');
    assert.ok(engine.THEMES.pigeon, 'Pigeon Light theme defined');

    ['healthy', 'gold', 'pigeon'].forEach(k => {
      const theme = engine.THEMES[k];
      assert.ok(theme.name, `Theme ${k} has a descriptive name`);
      assert.ok(theme.tokens['--ink'], `Theme ${k} defines --ink`);
      assert.ok(theme.tokens['--paper'], `Theme ${k} defines --paper`);
      assert.ok(theme.tokens['--muted'], `Theme ${k} defines --muted`);
      assert.ok(theme.tokens['--line'], `Theme ${k} defines --line`);
    });
  });

  test('Mathematical WCAG 2.1 relative luminance and contrast formula correctness', () => {
    // Pure Black on Pure White is exactly 21:1
    const maxContrast = engine.calculateContrast('#000000', '#ffffff');
    assert.equal(maxContrast, 21.0);

    // Identical colors have contrast 1:1
    const minContrast = engine.calculateContrast('#ffffff', '#ffffff');
    assert.equal(minContrast, 1.0);

    // Short hex codes (#fff, #000) match full hex codes
    const shortContrast = engine.calculateContrast('#000', '#fff');
    assert.equal(shortContrast, 21.0);
  });

  test('Healthy Green theme satisfies WCAG AA contrast standards', () => {
    const audit = engine.auditThemeContrast('healthy');
    assert.equal(audit.failedChecks, 0, `Healthy Green had contrast failures: ${JSON.stringify(audit.results.filter(r => !r.passAa))}`);
    assert.ok(audit.valid, 'Healthy Green passes all WCAG AA contrast checks');
  });

  test('Premium Gold theme satisfies WCAG AA contrast standards', () => {
    const audit = engine.auditThemeContrast('gold');
    assert.equal(audit.failedChecks, 0, `Premium Gold had contrast failures: ${JSON.stringify(audit.results.filter(r => !r.passAa))}`);
    assert.ok(audit.valid, 'Premium Gold passes all WCAG AA contrast checks');
  });

  test('Pigeon Light theme satisfies WCAG AA contrast standards', () => {
    const audit = engine.auditThemeContrast('pigeon');
    assert.equal(audit.failedChecks, 0, `Pigeon Light had contrast failures: ${JSON.stringify(audit.results.filter(r => !r.passAa))}`);
    assert.ok(audit.valid, 'Pigeon Light passes all WCAG AA contrast checks');
  });
});

describe('Screen Inventory & Page Architecture', () => {
  test('All 46 software modules are registered in NavigationSystemModel', () => {
    assert.equal(navModel.MODULES.length, 46, 'Must contain exactly 46 modules in registry');
    assert.equal(engine.SCREEN_REGISTRY.length, 46, 'Engine must track all 46 modules');
  });

  test('Each of the 46 modules has a valid container, template or generator in application', () => {
    const indexPath = path.join(__dirname, '../index.html');
    const html = fs.readFileSync(indexPath, 'utf8');

    engine.SCREEN_REGISTRY.forEach(mod => {
      const pageId = mod.page || mod.id;
      // Statically in index.html or injected dynamically via page script
      const staticMatch = new RegExp(`id=["']${pageId}["']|id=["']${mod.id}["']`, 'i').test(html);
      
      let dynamicMatch = false;
      if (!staticMatch) {
        // Look for corresponding frontend file
        const candidates = [
          path.join(__dirname, `${pageId}-page.js`),
          path.join(__dirname, `${pageId}.js`),
          path.join(__dirname, `${mod.id}-page.js`),
          path.join(__dirname, `${mod.id}.js`)
        ];
        dynamicMatch = candidates.some(f => fs.existsSync(f));
      }

      assert.ok(
        staticMatch || dynamicMatch,
        `Module '${mod.name}' (id: ${mod.id}, page: ${pageId}) must have an HTML container or generator`
      );
    });
  });

  test('Shared components and design primitives exist in application shell', () => {
    const indexPath = path.join(__dirname, '../index.html');
    const html = fs.readFileSync(indexPath, 'utf8');
    const comp = engine.auditSharedComponents(html);

    assert.ok(comp.primaryButtons > 0, 'Must have primary buttons (.primary)');
    assert.ok(comp.secondaryButtons > 0, 'Must have secondary buttons (.secondary)');
    assert.ok(comp.cards > 0, 'Must have reusable cards (.card)');
    assert.ok(comp.darkCards > 0, 'Must have dark cards (.card.dark)');
    assert.ok(comp.pages >= 25, 'Must have main navigable page sections (.page)');
  });
});

describe('Global Theme Isolation & Anti-Regression Invariants', () => {
  const frontendDir = __dirname;
  const cssFiles = fs.readdirSync(frontendDir).filter(f => f.endsWith('.css'));

  test('All 70+ CSS files have zero dead selectors (no body.theme-gold or [data-theme="dark"])', () => {
    const violations = [];

    cssFiles.forEach(file => {
      const content = fs.readFileSync(path.join(frontendDir, file), 'utf8');
      const audit = engine.auditThemeIsolation(content, file);
      const dead = audit.issues.filter(i => i.type === 'DEAD_SELECTOR');
      if (dead.length > 0) {
        violations.push(...dead);
      }
    });

    assert.equal(
      violations.length,
      0,
      `Found dead selectors that never match: ${JSON.stringify(violations, null, 2)}`
    );
  });

  test('All 70+ CSS files strictly isolate Gold theme from Pigeon Light (no unchained :not([data-theme="healthy"]))', () => {
    const leakage = [];

    cssFiles.forEach(file => {
      const content = fs.readFileSync(path.join(frontendDir, file), 'utf8');
      const audit = engine.auditThemeIsolation(content, file);
      const leaks = audit.issues.filter(i => i.type === 'THEME_LEAKAGE');
      if (leaks.length > 0) {
        leakage.push(...leaks);
      }
    });

    assert.equal(
      leakage.length,
      0,
      `Found theme leakage (Gold selectors bleeding into Pigeon Light): ${JSON.stringify(leakage, null, 2)}`
    );
  });

  test('index.html inline styles strictly obey theme isolation rules', () => {
    const indexPath = path.join(__dirname, '../index.html');
    const content = fs.readFileSync(indexPath, 'utf8');
    const audit = engine.auditThemeIsolation(content, 'index.html');

    assert.equal(
      audit.issues.length,
      0,
      `index.html contains theme isolation violations: ${JSON.stringify(audit.issues, null, 2)}`
    );
  });

  test('All CSS files have zero undeclared variables without fallbacks', () => {
    const undeclared = [];

    cssFiles.forEach(file => {
      const content = fs.readFileSync(path.join(frontendDir, file), 'utf8');
      const audit = engine.auditUndeclaredTokens(content, file);
      if (!audit.valid) {
        undeclared.push(...audit.issues);
      }
    });

    assert.equal(
      undeclared.length,
      0,
      `Found undeclared variables used without fallbacks: ${JSON.stringify(undeclared, null, 2)}`
    );
  });
});

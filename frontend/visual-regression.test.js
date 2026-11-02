/**
 * HEALTHY TREND TRADER — VISUAL REGRESSION & STRUCTURAL SNAPSHOT TEST SUITE
 * 
 * Compares current structural layout, component counts, CSS rules, and responsive
 * breakpoints against approved baseline profiles.
 * 
 * To update baselines intentionally after approved UI redesigns:
 *   UPDATE_VISUAL_BASELINES=1 npm run test:visual:update
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const regressionEngine = require('./visual-regression-engine.js');
const consistencyEngine = require('./visual-consistency-engine.js');

const BASELINE_PATH = path.join(__dirname, 'test-baselines/visual-profiles.json');
const rootDir = path.join(__dirname, '..');

describe('Visual Regression & Structural Snapshots', () => {
  test('Baseline file exists or can be generated', () => {
    if (!fs.existsSync(BASELINE_PATH) || process.env.UPDATE_VISUAL_BASELINES === '1') {
      require('./generate-baselines.js');
    }
    assert.ok(fs.existsSync(BASELINE_PATH), 'Baseline visual profiles must exist');
  });

  test('Current UI profiles match approved baseline snapshot without regressions', () => {
    const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

    // Extract current screens
    const currentScreens = {};
    consistencyEngine.SCREEN_REGISTRY.forEach(mod => {
      const pageId = mod.page || mod.id;
      currentScreens[mod.id] = regressionEngine.extractScreenStructure(htmlContent, pageId);
    });

    // Extract current stylesheets
    const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    const currentStylesheets = {};
    
    Object.keys(baseline.stylesheets || {}).forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        currentStylesheets[file] = regressionEngine.extractCssFootprint(content, file);
      }
    });

    const currentProfile = {
      screens: currentScreens,
      stylesheets: currentStylesheets
    };

    if (process.env.UPDATE_VISUAL_BASELINES === '1') {
      const updated = {
        version: '1.0.0',
        updatedAt: new Date().toISOString(),
        totalScreens: Object.keys(currentScreens).length,
        totalStylesheets: Object.keys(currentStylesheets).length,
        screens: currentScreens,
        stylesheets: currentStylesheets
      };
      fs.writeFileSync(BASELINE_PATH, JSON.stringify(updated, null, 2), 'utf8');
      assert.ok(true, 'Baseline updated successfully');
      return;
    }

    const comparison = regressionEngine.compareSnapshots(baseline, currentProfile);

    assert.equal(
      comparison.diffs.length,
      0,
      `Visual regression detected!\n${comparison.diffs.join('\n')}\n` +
      `If this change was intentional, re-run with UPDATE_VISUAL_BASELINES=1 to approve.`
    );
  });
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Artistic ON/OFF Toggles for Sell Into Strength and Scale-In', async t => {
  const freeRollJs = fs.readFileSync(path.join(__dirname, 'position-free-roll.js'), 'utf8');
  const scaleInJs = fs.readFileSync(path.join(__dirname, 'scale-in.js'), 'utf8');
  const freeRollCss = fs.readFileSync(path.join(__dirname, 'position-free-roll.css'), 'utf8');
  const scaleInCss = fs.readFileSync(path.join(__dirname, 'scale-in.css'), 'utf8');

  await t.test('Sell Into Strength has artistic toggle in header and disabled class support', () => {
    assert.match(freeRollJs, /data-risk-toggle="sellIntoStrength"/, 'Must contain artistic toggle for sellIntoStrength');
    assert.match(freeRollJs, /class="risk-artistic-toggle \${saved\.enabled \? 'is-on' : 'is-off'}"/, 'Toggle must have is-on / is-off classes');
    assert.match(freeRollJs, /is-policy-disabled/, 'Must apply is-policy-disabled when disabled');
    assert.match(freeRollJs, /<input type="hidden" data-pm-setting="enabled" value="\${saved\.enabled \? 'on' : 'off'}">/, 'Must have hidden input for backward compatibility');
    // Ensure the old select dropdown was removed from the grid
    assert.doesNotMatch(freeRollJs, /<select data-pm-setting="enabled">/, 'Old select dropdown must not be in grid');
    // Ensure click event listener toggles sellIntoStrength
    assert.match(freeRollJs, /event\.target\.closest\('\[data-risk-toggle="sellIntoStrength"\]'\)/, 'Must have click listener for sellIntoStrength toggle');
  });

  await t.test('Scale-In has artistic toggle in header and disabled class support', () => {
    assert.match(scaleInJs, /data-risk-toggle="scaleIn"/, 'Must contain artistic toggle for scaleIn');
    assert.match(scaleInJs, /class="risk-artistic-toggle \${saved\.enabled \? 'is-on' : 'is-off'}"/, 'Toggle must have is-on / is-off classes');
    assert.match(scaleInJs, /is-policy-disabled/, 'Must apply is-policy-disabled when disabled');
    assert.match(scaleInJs, /<input type="hidden" data-scale-in-setting="enabled" value="\${saved\.enabled \? 'on' : 'off'}">/, 'Must have hidden input for backward compatibility');
    // Ensure the old select dropdown was removed from the grid
    assert.doesNotMatch(scaleInJs, /<select data-scale-in-setting="enabled">/, 'Old select dropdown must not be in grid');
    // Ensure click event listener toggles scaleIn
    assert.match(scaleInJs, /event\.target\.closest\('\[data-risk-toggle="scaleIn"\]'\)/, 'Must have click listener for scaleIn toggle');
  });

  await t.test('CSS styles include artistic toggle, grayscale filter, and theme support', () => {
    assert.match(freeRollCss, /\.risk-artistic-toggle/, 'Must define .risk-artistic-toggle');
    assert.match(freeRollCss, /\.risk-artistic-toggle\.is-on/, 'Must define .risk-artistic-toggle.is-on');
    assert.match(freeRollCss, /\.risk-artistic-toggle\.is-off/, 'Must define .risk-artistic-toggle.is-off');
    assert.match(freeRollCss, /\.risk-policy-block\.is-policy-disabled/, 'Must define .is-policy-disabled');
    assert.match(freeRollCss, /filter:\s*grayscale\(100%\)/, 'Disabled state must grayscale form');
    assert.match(freeRollCss, /pointer-events:\s*none/, 'Disabled state must disable interaction');
    assert.match(freeRollCss, /repeat\(3,\s*minmax\(0,\s*1fr\)\)/, 'pm-sell-grid should be 3 columns');
  });

  await t.test('Scale-In modal respects system color palette and theme contrast', () => {
    // Modal background is white in light mode, not dark
    assert.match(scaleInCss, /\.scale-in-dialog\s*\{[^}]*background:\s*#ffffff;/s, 'Modal dialog must have white background in light mode');
    // Inputs must use clean light background #fbfaf6, not murky dark rgba(0,0,0,0.25)
    assert.match(scaleInCss, /\.scale-in-dialog input[^}]*background:\s*#fbfaf6;/s, 'Modal inputs must have #fbfaf6 background');
    assert.doesNotMatch(scaleInCss, /background:\s*var\(--surface-secondary,\s*rgba\(0,\s*0,\s*0,\s*0\.25\)\);/, 'No dark transparent fallback in light mode inputs');
    // Validation banner must have readable dark amber text in fail state
    assert.match(scaleInCss, /\.scale-in-validation-banner\.fail\s*\{[^}]*color:\s*#85530a;/s, 'Fail banner text must be readable dark amber');
    // Validation box must have light background, not rgba(0,0,0,0.15)
    assert.match(scaleInCss, /\.scale-in-validation-box\s*\{[^}]*background:\s*#f8faf7;/s, 'Validation box must have light background');
    // Gold theme support for modal dialog
    assert.match(scaleInCss, /body:not\(\[data-theme="healthy"\]\)\s*\.scale-in-dialog\s*\{[^}]*background:\s*#1c180f;/s, 'Gold theme must style modal with #1c180f');
  });

  await t.test('Position Management card completely hides .pm-states when Sell Into Strength is disabled', () => {
    // Check that position-free-roll.js defines conditional rendering for .pm-states
    assert.match(freeRollJs, /const statesHtml = state\.sell\.enabled \? `\s*<div class="pm-states">/, 'Must only build .pm-states when state.sell.enabled is true');
    assert.match(freeRollJs, /\$\{statesHtml\}<dialog class="pm-dialog"/, 'Card must interpolate statesHtml');
    // Cobertura Free Roll is only included in stats when state.sell.enabled is true
    assert.match(freeRollJs, /\.\.\.\(state\.sell\.enabled \? \[\[['"]Cobertura Free Roll['"]/, 'Cobertura Free Roll must only be in stats when enabled');
  });

  await t.test('Sell Into Strength Available card has artistic cash register background and pill CTA', () => {
    // Background asset exists
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'position-management', 'sell-into-strength-art.jpg')), 'Cash register asset must exist');
    // CSS rules for artistic card
    assert.match(freeRollCss, /\.position-management \.pm-state\.pm-sell-available/, 'Must define .pm-sell-available');
    assert.match(freeRollCss, /sell-into-strength-art\.jpg/, 'Must reference sell-into-strength-art.jpg in background-image');
    assert.match(freeRollCss, /\.pm-status-glow-dot/, 'Must define glowing status dot');
    assert.match(freeRollCss, /\.pm-realizar-parcial-btn/, 'Must define pill button');
    assert.match(freeRollCss, /\.pm-btn-icon/, 'Must define money icon container');
    assert.match(freeRollCss, /\.pm-btn-arrow/, 'Must define CTA arrow');
    // JS template
    assert.match(freeRollJs, /pm-realizar-parcial-btn/, 'JS must render pill button');
    assert.match(freeRollJs, /pm-status-glow-dot/, 'JS must render glow dot when available');
    assert.match(freeRollJs, /REALIZAR PARCIAL/, 'JS must render REALIZAR PARCIAL button label');
  });
});


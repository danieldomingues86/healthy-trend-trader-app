/**
 * HEALTHY TREND TRADER — VISUAL REGRESSION ENGINE
 * 
 * Extracts structural UI layout profiles, component hierarchies, CSS footprints,
 * and responsive breakpoints for automated snapshot comparison and regression prevention.
 */

(function(root) {
  'use strict';

  const crypto = typeof require !== 'undefined' ? require('node:crypto') : null;

  function hashString(str) {
    if (crypto) {
      return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
    }
    // Fallback simple hash for browser
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  function extractScreenStructure(htmlContent, screenId) {
    // Locate the page section in htmlContent
    const sectionRegex = new RegExp(`<section[^>]*id=["']${screenId}["'][^>]*>([\\s\\S]*?)</section>`, 'i');
    const match = htmlContent.match(sectionRegex);

    if (!match) {
      // Dynamic screen or shell template
      return {
        screenId,
        presentInStaticHtml: false,
        structuralHash: 'dynamic'
      };
    }

    const body = match[1];

    const headingsCount = (body.match(/<h[1-6]\b/gi) || []).length;
    const cardsCount = (body.match(/class=["'][^"']*\bcard\b[^"']*["']/gi) || []).length;
    const buttonsCount = (body.match(/<button\b/gi) || []).length;
    const inputsCount = (body.match(/<input\b|<select\b|<textarea\b/gi) || []).length;
    const tablesCount = (body.match(/<table\b/gi) || []).length;
    const svgCount = (body.match(/<svg\b/gi) || []).length;
    const badgesCount = (body.match(/class=["'][^"']*\bbadge\b[^"']*["']/gi) || []).length;
    const gridsCount = (body.match(/class=["'][^"']*\bgrid\b[^"']*["']/gi) || []).length;

    const signature = `${screenId}|h:${headingsCount}|c:${cardsCount}|b:${buttonsCount}|i:${inputsCount}|t:${tablesCount}|s:${svgCount}|bd:${badgesCount}|g:${gridsCount}`;

    return {
      screenId,
      presentInStaticHtml: true,
      headingsCount,
      cardsCount,
      buttonsCount,
      inputsCount,
      tablesCount,
      svgCount,
      badgesCount,
      gridsCount,
      structuralHash: hashString(signature)
    };
  }

  function extractCssFootprint(cssContent, filename = '') {
    const rulesCount = (cssContent.match(/\{/g) || []).length;
    
    // Breakpoints
    const mediaBreakpoints = Array.from(new Set(
      (cssContent.match(/@media[^{]*\((?:max|min)-width:[^)]*\)/gi) || [])
        .map(m => m.replace(/\s+/g, ' ').trim().toLowerCase())
    )).sort();

    // Theme rules count
    const healthyRulesCount = (cssContent.match(/\[data-theme=["']?healthy["']?\]/g) || []).length;
    const goldRulesCount = (cssContent.match(/:not\(\[data-theme=["']?healthy["']?\]\):not\(\[data-theme=["']?pigeon["']?\]\)|\[data-theme=["']?gold["']?\]/g) || []).length;
    const pigeonRulesCount = (cssContent.match(/\[data-theme=["']?pigeon["']?\]/g) || []).length;

    const signature = `${filename}|r:${rulesCount}|bp:${mediaBreakpoints.length}|h:${healthyRulesCount}|g:${goldRulesCount}|p:${pigeonRulesCount}`;

    return {
      filename,
      rulesCount,
      mediaBreakpointsCount: mediaBreakpoints.length,
      mediaBreakpoints,
      healthyRulesCount,
      goldRulesCount,
      pigeonRulesCount,
      footprintHash: hashString(signature)
    };
  }

  function compareSnapshots(baseline, current) {
    const diffs = [];

    // Compare screens
    for (const [screenId, bScreen] of Object.entries(baseline.screens || {})) {
      const cScreen = current.screens?.[screenId];
      if (!cScreen) {
        diffs.push(`Screen '${screenId}' exists in baseline but missing from current profile`);
        continue;
      }
      if (bScreen.structuralHash !== cScreen.structuralHash) {
        diffs.push(
          `Screen '${screenId}' structural hash mismatch! ` +
          `Baseline: ${bScreen.structuralHash} vs Current: ${cScreen.structuralHash} ` +
          `(cards: ${bScreen.cardsCount}->${cScreen.cardsCount}, buttons: ${bScreen.buttonsCount}->${cScreen.buttonsCount}, inputs: ${bScreen.inputsCount}->${cScreen.inputsCount})`
        );
      }
    }

    // Compare stylesheets
    for (const [file, bCss] of Object.entries(baseline.stylesheets || {})) {
      const cCss = current.stylesheets?.[file];
      if (!cCss) {
        diffs.push(`Stylesheet '${file}' exists in baseline but missing from current profile`);
        continue;
      }
      if (bCss.footprintHash !== cCss.footprintHash) {
        diffs.push(
          `Stylesheet '${file}' footprint hash mismatch! ` +
          `Baseline: ${bCss.footprintHash} vs Current: ${cCss.footprintHash} ` +
          `(rules: ${bCss.rulesCount}->${cCss.rulesCount}, breakpoints: ${bCss.mediaBreakpointsCount}->${cCss.mediaBreakpointsCount})`
        );
      }
    }

    return {
      match: diffs.length === 0,
      diffs
    };
  }

  const engine = {
    hashString,
    extractScreenStructure,
    extractCssFootprint,
    compareSnapshots
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  }

  root.VisualRegressionEngine = engine;

})(typeof window !== 'undefined' ? window : globalThis);

/**
 * HEALTHY TREND TRADER — VISUAL CONSISTENCY ENGINE
 * 
 * Central automated engine for multi-theme visual consistency, WCAG 2.1 contrast audits,
 * design token validation, screen inventory verification, and theme isolation rules.
 * 
 * Supported Themes:
 * - Healthy Green (`body[data-theme="healthy"]` / default)
 * - Premium Gold (`body[data-theme="gold"]` / `body:not([data-theme="healthy"]):not([data-theme="pigeon"])`)
 * - Pigeon Light (`body[data-theme="pigeon"]` / `html[data-theme="pigeon"]`)
 */

(function(root) {
  'use strict';

  // 1. CANONICAL DESIGN TOKENS PER THEME
  const THEMES = {
    healthy: {
      key: 'healthy',
      name: 'Healthy Green',
      isDark: false,
      selector: 'body[data-theme="healthy"]',
      tokens: {
        '--ink': '#11251b',
        '--ink-2': '#385747',
        '--ink-3': '#5f816e',
        '--paper': '#f3f1e9',
        '--paper-2': '#e9eee6',
        '--muted': '#6f7f76',
        '--line': '#cfdbd2',
        '--mint': '#2e7d58',
        '--lime': '#89d99f',
        '--good': '#2e8b57',
        '--warn': '#b5893a',
        '--bad': '#c95f55',
        '--surface': '#fbfcf8',
        '--surface-2': '#edf3ed',
        '--card-bg': '#ffffff',
        '--card-dark-bg': '#10291d',
        '--card-dark-text': '#eef8f1'
      }
    },
    gold: {
      key: 'gold',
      name: 'Premium Gold',
      isDark: true,
      selector: 'body:not([data-theme="healthy"]):not([data-theme="pigeon"])',
      tokens: {
        '--ink': '#f5efe3',
        '--ink-2': '#d8c7a3',
        '--ink-3': '#b89350',
        '--paper': '#070808',
        '--paper-2': '#0d0e0e',
        '--muted': '#9d9a92',
        '--line': '#292720',
        '--mint': '#d6aa50',
        '--lime': '#f0ce7a',
        '--good': '#55cf7a',
        '--warn': '#d6aa50',
        '--bad': '#ef665b',
        '--gold': '#d6aa50',
        '--gold-light': '#f1d58d',
        '--surface': '#111212',
        '--surface-2': '#171817',
        '--card-bg': '#151616',
        '--card-dark-bg': '#0a0b0b',
        '--card-dark-text': '#ffffff'
      }
    },
    pigeon: {
      key: 'pigeon',
      name: 'Pigeon Light',
      isDark: false,
      selector: 'body[data-theme="pigeon"]',
      tokens: {
        '--ink': '#0f172a',
        '--ink-2': '#1e293b',
        '--ink-3': '#334155',
        '--paper': '#f8fafc',
        '--paper-2': '#f1f5f9',
        '--muted': '#64748b',
        '--line': '#e2e8f0',
        '--primary': '#0284c7',
        '--good': '#16a34a',
        '--warn': '#d97706',
        '--bad': '#dc2626',
        '--surface': '#ffffff',
        '--surface-2': '#f8fafc',
        '--card-bg': '#ffffff',
        '--card-dark-bg': '#0f172a',
        '--card-dark-text': '#f8fafc'
      }
    }
  };

  // 2. MATHEMATICAL WCAG 2.1 CONTRAST FORMULA
  function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null;
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6) return null;
    const num = parseInt(clean, 16);
    if (isNaN(num)) return null;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function relativeLuminance(r, g, b) {
    const transform = (c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const R = transform(r);
    const G = transform(g);
    const B = transform(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function calculateContrast(color1Hex, color2Hex) {
    const rgb1 = hexToRgb(color1Hex);
    const rgb2 = hexToRgb(color2Hex);
    if (!rgb1 || !rgb2) return null;

    const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);

    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    const ratio = (brighter + 0.05) / (darker + 0.05);
    return Number(ratio.toFixed(2));
  }

  function checkWcagCompliance(contrastRatio, isLargeText = false) {
    if (contrastRatio == null) return { aa: false, aaa: false };
    const minAa = isLargeText ? 3.0 : 4.5;
    const minAaa = isLargeText ? 4.5 : 7.0;
    return {
      ratio: contrastRatio,
      aa: contrastRatio >= minAa,
      aaa: contrastRatio >= minAaa
    };
  }

  // 3. COMPLETE SCREEN INVENTORY (46 MODULES)
  const SCREEN_REGISTRY = [
    // Operação Diária (6)
    { id: 'today', page: 'today', name: 'Meu Desktop', category: 'Operação Diária' },
    { id: 'newtrade', page: 'newtrade', name: 'Novo Trade', category: 'Operação Diária' },
    { id: 'journal', page: 'journal', name: 'Diário de Trader', category: 'Operação Diária' },
    { id: 'dailyroutine', page: 'dailyroutine', name: 'Rotina Diária', category: 'Operação Diária' },
    { id: 'watchlist', page: 'watchlist', name: 'Watchlist', category: 'Operação Diária' },
    { id: 'habits', page: 'habits', name: 'Monitor de Hábitos', category: 'Operação Diária' },
    
    // Treinamento (5)
    { id: 'mission', page: 'mission', name: 'Missão', category: 'Treinamento' },
    { id: 'tradertraining', page: 'tradertraining', name: 'Prática Deliberada', category: 'Treinamento' },
    { id: 'conquests', page: 'conquests', name: 'Minhas Conquistas', category: 'Treinamento' },
    { id: 'deservingdiary', page: 'deservingdiary', name: 'Diário do Merecimento', category: 'Treinamento' },
    { id: 'mistakesbook', page: 'mistakesbook', name: 'Erros & Lições', category: 'Treinamento' },

    // Análise de Mercado (7)
    { id: 'opportunityradar', page: 'opportunityradar', name: 'Radar de Oportunidades', category: 'Análise de Mercado' },
    { id: 'relativestrength', page: 'relativestrength', name: 'Força Relativa', category: 'Análise de Mercado' },
    { id: 'marketcycle', page: 'marketcycle', name: 'Ciclo de Mercado', category: 'Análise de Mercado' },
    { id: 'marketcentral', page: 'marketcentral', name: 'Central de Mercado', category: 'Análise de Mercado' },
    { id: 'fundamentals', page: 'fundamentals', name: 'Análise Fundamentalista', category: 'Análise de Mercado' },
    { id: 'charts', page: 'charts', name: 'Gráficos', category: 'Análise de Mercado' },
    { id: 'markettreemap', page: 'markettreemap', name: 'Setores', category: 'Análise de Mercado' },

    // Carteira & Risco (6)
    { id: 'dashboard', page: 'dashboard', name: 'Patrimônio', category: 'Carteira & Risco' },
    { id: 'positions', page: 'positions', name: 'Posições Abertas', category: 'Carteira & Risco' },
    { id: 'closedpositions', page: 'closedpositions', name: 'Posições Encerradas', category: 'Carteira & Risco' },
    { id: 'portfolioheat', page: 'portfolioheat', name: 'Portfolio Heat', category: 'Carteira & Risco' },
    { id: 'riskpolicy', page: 'riskpolicy', name: 'Política de Risco', category: 'Carteira & Risco' },
    { id: 'assetblacklist', page: 'assetblacklist', name: 'Restrição de Ativos', category: 'Carteira & Risco' },

    // Simuladores (4)
    { id: 'tradesimulator', page: 'tradesimulator', name: 'Simulador de Trades', category: 'Simuladores' },
    { id: 'researchlab', page: 'researchlab', name: 'Laboratório de Pesquisa', category: 'Simuladores' },
    { id: 'forecast', page: 'forecast', name: 'Simulador de Equity', category: 'Simuladores' },
    { id: 'riskofruin', page: 'riskofruin', name: 'Risco de Ruína', category: 'Simuladores' },

    // Dados & Performance (7)
    { id: 'analytics', page: 'analytics', name: 'Painel da Verdade', category: 'Dados & Performance' },
    { id: 'systemquality', page: 'systemquality', name: 'Qualidade Estatística do Sistema', category: 'Dados & Performance' },
    { id: 'tradeanatomy', page: 'tradeanatomy', name: 'Anatomia dos Trades', category: 'Dados & Performance' },
    { id: 'tradelibrary', page: 'tradelibrary', name: 'Biblioteca de Trades', category: 'Dados & Performance' },
    { id: 'platformaccess', page: 'platformaccess', name: 'Uso da Plataforma', category: 'Dados & Performance' },
    { id: 'review', page: 'review', name: 'Revisão Mensal', category: 'Dados & Performance' },
    { id: 'eventplaybook', page: 'eventplaybook', name: 'Registro de Eventos', category: 'Dados & Performance' },

    // Mentalidade & Zen (6)
    { id: 'mindset', page: 'mindset', name: 'Inteligência Emocional', category: 'Mentalidade & Zen' },
    { id: 'zen', page: 'zen', name: 'Trader Zen', category: 'Mentalidade & Zen' },
    { id: 'emotionalintelligence', page: 'emotionalintelligence', name: 'Termômetro Emocional', category: 'Mentalidade & Zen' },
    { id: 'traderrules', page: 'traderrules', name: 'Regras de Ouro', category: 'Mentalidade & Zen' },
    { id: 'wisdom', page: 'wisdom', name: 'Trader Wisdom', category: 'Mentalidade & Zen' },
    { id: 'traderprofile', page: 'traderprofile', name: 'Perfil Operacional', category: 'Mentalidade & Zen' },

    // Recursos & Sistema (5)
    { id: 'materials', page: 'materials', name: 'Loja do Trader', category: 'Recursos & Sistema' },
    { id: 'settings', page: 'settings', name: 'Configurações', category: 'Recursos & Sistema' },
    { id: 'manual', page: 'manual', name: 'Manual do Software', category: 'Recursos & Sistema' },
    { id: 'glossary', page: 'glossary', name: 'Glossário Visual', category: 'Recursos & Sistema' },
    { id: 'about', page: 'about', name: 'Sobre', category: 'Recursos & Sistema' }
  ];

  // 4. THEME ISOLATION AUDITOR
  // Detects unisolated :not([data-theme="healthy"]) or dead class names like body.theme-gold
  function auditThemeIsolation(cssContent, filename = 'stylesheet.css') {
    const issues = [];
    const lines = cssContent.split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Dead selectors that never match
      if (trimmed.includes('body.theme-gold') || trimmed.includes('.theme-gold')) {
        issues.push({
          file: filename,
          line: lineNum,
          type: 'DEAD_SELECTOR',
          message: `Found obsolete 'body.theme-gold' selector. Should use 'body:not([data-theme="healthy"]):not([data-theme="pigeon"])' or 'body[data-theme="gold"]'.`,
          code: trimmed
        });
      }

      if (trimmed.includes('body.theme-pigeon') || trimmed.includes('.theme-pigeon')) {
        issues.push({
          file: filename,
          line: lineNum,
          type: 'DEAD_SELECTOR',
          message: `Found obsolete 'body.theme-pigeon' selector. Should use 'body[data-theme="pigeon"]' or 'html[data-theme="pigeon"]'.`,
          code: trimmed
        });
      }

      if (trimmed.includes('[data-theme="dark"]') && !trimmed.includes('/*')) {
        issues.push({
          file: filename,
          line: lineNum,
          type: 'DEAD_SELECTOR',
          message: `Found obsolete '[data-theme="dark"]' selector. Data themes are 'healthy', 'gold', and 'pigeon'.`,
          code: trimmed
        });
      }

      // Unisolated :not([data-theme="healthy"]) leaking into Pigeon Light
      if (trimmed.includes(':not([data-theme="healthy"])') && !trimmed.includes(':not([data-theme="pigeon"])')) {
        // Exclude comments
        if (!trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
          issues.push({
            file: filename,
            line: lineNum,
            type: 'THEME_LEAKAGE',
            message: `Selector ':not([data-theme="healthy"])' is not paired with ':not([data-theme="pigeon"])'. This pollutes Pigeon Light with Gold/Dark styles.`,
            code: trimmed
          });
        }
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // 5. UNDECLARED VARIABLES AUDITOR
  // Checks for raw undeclared Tailwind-style variables that break themes when fallbacks are missing
  function auditUndeclaredTokens(cssContent, filename = 'stylesheet.css') {
    const issues = [];
    const lines = cssContent.split('\n');

    const problematicVars = ['--text-primary', '--text-secondary', '--text-muted', '--bg-card', '--bg-surface'];

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      problematicVars.forEach(v => {
        if (trimmed.includes(`var(${v})`)) {
          // Used without ANY fallback
          issues.push({
            file: filename,
            line: lineNum,
            type: 'UNDECLARED_VARIABLE_NO_FALLBACK',
            message: `Variable '${v}' is used without a fallback value. It is not declared in :root and will evaluate to transparent or inherit.`,
            code: trimmed
          });
        }
      });
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }

  // 6. PALETTE CONTRAST AUDITOR
  function auditThemeContrast(themeKey) {
    const theme = THEMES[themeKey];
    if (!theme) throw new Error(`Unknown theme key: ${themeKey}`);

    const checks = [
      { element: 'Normal body text on paper surface', fg: theme.tokens['--ink'], bg: theme.tokens['--paper'], minRatio: 4.5 },
      { element: 'Secondary muted text on paper surface (auxiliary/labels)', fg: theme.tokens['--muted'], bg: theme.tokens['--paper'], minRatio: 3.0 },
      { element: 'Normal text on card surface', fg: theme.tokens['--ink'], bg: theme.tokens['--card-bg'], minRatio: 4.5 },
      { element: 'Heading text on paper surface', fg: theme.tokens['--ink'], bg: theme.tokens['--paper'], minRatio: 3.0 },
      { element: 'Dark card text on dark card background', fg: theme.tokens['--card-dark-text'], bg: theme.tokens['--card-dark-bg'], minRatio: 4.5 }
    ];

    const results = checks.map(check => {
      const ratio = calculateContrast(check.fg, check.bg);
      const pass = ratio != null && ratio >= check.minRatio;
      return {
        element: check.element,
        fg: check.fg,
        bg: check.bg,
        minRatio: check.minRatio,
        ratio,
        passAa: pass
      };
    });

    const failed = results.filter(r => !r.passAa);

    return {
      theme: theme.name,
      valid: failed.length === 0,
      totalChecks: results.length,
      failedChecks: failed.length,
      results
    };
  }

  // 7. COMPONENT CONSISTENCY CHECKER
  function auditSharedComponents(htmlContent) {
    const results = {
      primaryButtons: (htmlContent.match(/class=["'][^"']*\bprimary\b[^"']*["']/g) || []).length,
      secondaryButtons: (htmlContent.match(/class=["'][^"']*\bsecondary\b[^"']*["']/g) || []).length,
      cards: (htmlContent.match(/class=["'][^"']*\bcard\b[^"']*["']/g) || []).length,
      darkCards: (htmlContent.match(/class=["'][^"']*\bcard\b[^"']*\bdark\b[^"']*["']/g) || []).length,
      badges: (htmlContent.match(/class=["'][^"']*\bbadge\b[^"']*["']/g) || []).length,
      pages: (htmlContent.match(/class=["'][^"']*\bpage\b[^"']*["']/g) || []).length
    };
    return results;
  }

  // EXPORT (Universal Module Definition)
  const engine = {
    THEMES,
    SCREEN_REGISTRY,
    hexToRgb,
    relativeLuminance,
    calculateContrast,
    checkWcagCompliance,
    auditThemeIsolation,
    auditUndeclaredTokens,
    auditThemeContrast,
    auditSharedComponents
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  }

  root.VisualConsistencyEngine = engine;

})(typeof window !== 'undefined' ? window : globalThis);

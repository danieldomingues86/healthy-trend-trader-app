const fs = require('fs');

const pages = [
  { id: 'today', files: ['frontend/today-cockpit.css'] },
  { id: 'newtrade', files: ['frontend/trade-workbench-v2.css', 'frontend/new-trade-gold.css'] },
  { id: 'journal', files: ['frontend/journal-v2.css'] },
  { id: 'dailyroutine', files: ['frontend/daily-routine.css'] },
  { id: 'watchlist', files: ['frontend/watchlist.css'] },
  { id: 'habits', files: ['frontend/habits-gold.css'] },
  { id: 'marketcycle', files: ['frontend/market-cycle-v2.css'] },
  { id: 'relativestrength', files: ['frontend/relative-strength-v3.css', 'frontend/relative-strength-stable-colors.css'] },
  { id: 'emergingleaders', files: ['frontend/emerging-leaders.css'] },
  { id: 'marketscans', files: ['frontend/market-scans-page.css'] },
  { id: 'fundamentals', files: ['frontend/fundamentals.css'] },
  { id: 'dashboard', files: ['frontend/wealth-dashboard-v2.css'] },
  { id: 'positions', files: ['frontend/positions-account-panels.css', 'frontend/position-free-roll.css'] },
  { id: 'portfolioheat', files: ['frontend/portfolio-heat-page.css', 'frontend/risk-heat-gate.css'] },
  { id: 'riskpolicy', files: ['frontend/risk-policy-rubric.css'] },
  { id: 'assetblacklist', files: ['frontend/asset-blacklist.css'] },
  { id: 'couragechallenge', files: ['frontend/courage-challenge.css'] },
  { id: 'analytics', files: ['frontend/truth-panel-gold.css'] },
  { id: 'tradeanatomy', files: ['frontend/trade-anatomy.css'] },
  { id: 'mistakesbook', files: ['frontend/mistakes-book.css'] },
  { id: 'tradelibrary', files: ['frontend/trade-library.css'] },
  { id: 'emotionalintelligence', files: ['frontend/emotional-intelligence.css'] },
  { id: 'forecast', files: ['frontend/forecast-simulator.css'] },
  { id: 'zen', files: ['frontend/trader-zen.css'] },
  { id: 'wisdom', files: ['frontend/trader-wisdom-v3.css'] },
  { id: 'materials', files: ['frontend/materials-page-v2.css'] },
  { id: 'settings', files: ['frontend/settings-experience.css'] },
  { id: 'manual', files: ['frontend/manual-knowledge.css'] },
  { id: 'about', files: ['frontend/about-page.css'] },
  { id: 'theme-audit', files: ['frontend/theme-audit.css'] },
  { id: 'sidebar', files: ['frontend/sidebar-navigation.css'] }
];

console.log('=== PALETTE AUDIT BY PAGE ===\n');

pages.forEach(p => {
  console.log(`Page: [${p.id}]`);
  p.files.forEach(f => {
    if (!fs.existsSync(f)) {
      console.log(`  File not found: ${f}`);
      return;
    }
    const content = fs.readFileSync(f, 'utf8');
    const hasHealthy = content.includes('data-theme="healthy"') || content.includes('[data-theme="healthy"]');
    const hasGold = content.includes('data-theme="gold"') || content.includes('[data-theme="gold"]') || content.includes(':not([data-theme="healthy"])');
    console.log(`  ${f}: HealthySelector=${hasHealthy}, GoldSelector=${hasGold}, Length=${content.length}`);
  });
});

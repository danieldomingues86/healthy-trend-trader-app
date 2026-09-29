const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const pages = [
  'today', 'newtrade', 'journal', 'dailyroutine', 'watchlist', 'habits',
  'marketcycle', 'relativestrength', 'emergingleaders', 'marketscans',
  'fundamentals', 'dashboard', 'positions', 'portfolioheat', 'riskpolicy',
  'assetblacklist', 'couragechallenge', 'analytics', 'tradeanatomy',
  'mistakesbook', 'tradelibrary', 'emotionalintelligence', 'platformaccess',
  'review', 'forecast', 'zen', 'wisdom', 'traderprofile', 'materials',
  'settings', 'manual', 'glossary', 'about'
];

console.log('=== PAGE AUDIT: THEME CONSISTENCY ===\n');

pages.forEach(pid => {
  // Check in index.html for page container
  const pageRegex = new RegExp(`<section[^>]*id=["']${pid}["'][^>]*>`, 'i');
  const match = html.match(pageRegex);
  
  // Find associated stylesheets or style rules
  const pageCssRulesInHtml = [];
  const rHealthy = new RegExp(`body\\[data-theme=["']healthy["']\\][^\\{]*#${pid}`, 'g');
  const rGold = new RegExp(`body(?::not\\(\\[data-theme=["']healthy["']\\]\\)|\\[data-theme=["']gold["']\\])[^\\{]*#${pid}`, 'g');
  const rHasHealthy = new RegExp(`body\\[data-theme=["']healthy["']\\]:has\\(#${pid}\\.active\\)`, 'g');
  const rHasGold = new RegExp(`body(?::not\\(\\[data-theme=["']healthy["']\\]\\)|\\[data-theme=["']gold["']\\]):has\\(#${pid}\\.active\\)`, 'g');
  const rUncondHas = new RegExp(`body:has\\(#${pid}\\.active\\)`, 'g');
  
  const htmlHealthyCount = (html.match(rHealthy) || []).length + (html.match(rHasHealthy) || []).length;
  const htmlGoldCount = (html.match(rGold) || []).length + (html.match(rHasGold) || []).length;
  const htmlUncondHasCount = (html.match(rUncondHas) || []).length;

  console.log(`Page: #${pid.padEnd(20)} | Found: ${!!match} | HealthyRules: ${htmlHealthyCount} | GoldRules: ${htmlGoldCount} | UncondHas: ${htmlUncondHasCount}`);
});

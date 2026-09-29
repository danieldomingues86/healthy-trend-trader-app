const fs = require('fs');
const path = require('path');

const cssFiles = fs.readdirSync('frontend')
  .filter(f => f.endsWith('.css'))
  .map(f => path.join('frontend', f));

console.log('=== CSS FILES AUDIT FOR COLOR LEAKAGE ===\n');

const GOLD_REGEX = /#(d4af37|e0b750|c99e3d|facc15|eab308|fde047|f59e0b|d97706|b45309|d8ad4d|e5bd67|e5b83b|f6cb56|e4bf69|cba143|d6aa50|dfb84f|c79e45|efce78)/gi;
const GREEN_ACCENT_REGEX = /#(10b981|34d399|059669|78d294|8fe0aa|c8f071|56b779|52a978|166d42|1c523c|277953|164e35|1b5239|22c55e|4ade80|15803d)/gi;

cssFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check if file has unconditional sidebar or topbar overrides
  const hasSidebarOverride = /body:has\([^)]+\)\s+\.sidebar/i.test(content) || /\.sidebar\s*\{/i.test(content);
  const hasTopbarOverride = /body:has\([^)]+\)\s+\.topbar/i.test(content);
  
  const goldCount = (content.match(GOLD_REGEX) || []).length;
  const greenCount = (content.match(GREEN_ACCENT_REGEX) || []).length;
  
  if (goldCount > 0 && greenCount > 0) {
    console.log(`[MIXED] ${file}: Gold=${goldCount}, Green=${greenCount}, SidebarOverride=${hasSidebarOverride}, TopbarOverride=${hasTopbarOverride}`);
  } else if (goldCount > 0) {
    console.log(`[GOLD ONLY] ${file}: Gold=${goldCount}`);
  } else if (greenCount > 0) {
    console.log(`[GREEN ONLY] ${file}: Green=${greenCount}`);
  }
});

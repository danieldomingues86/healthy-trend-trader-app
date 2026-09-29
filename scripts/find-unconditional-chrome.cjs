const fs = require('fs');

const cssFiles = fs.readdirSync('frontend')
  .filter(f => f.endsWith('.css'))
  .map(f => 'frontend/' + f);
cssFiles.push('index.html');

console.log('=== UNCONDITIONAL TOPBAR / SIDEBAR / CHROME OVERRIDES ===\n');

cssFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    // Check if line has body:has(...) targeting .sidebar or .topbar or .crumb or .avatar without theme
    if (/body:has\(#[a-zA-Z0-9_-]+\.active\)\s+\.(topbar|sidebar|crumb|avatar|pill)/i.test(l)) {
      if (!l.includes('data-theme')) {
        console.log(`${file}:${idx+1} -> ${l.trim().substring(0, 100)}`);
      }
    }
  });
});

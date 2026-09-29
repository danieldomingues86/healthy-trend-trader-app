const fs = require('fs');

const files = fs.readdirSync('frontend').filter(f => f.endsWith('.css')).map(f => 'frontend/' + f);
files.push('index.html');

console.log('=== GLOBAL OVERRIDES BY PAGE STYLES ===\n');

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (l.match(/body:has\([^)]+\)\s+\.(sidebar|topbar|avatar|crumb|app|main)\b/i) ||
        l.match(/body\.[\w-]+\s+\.(sidebar|topbar|avatar|crumb|app|main)\b/i)) {
      console.log(`${f}:${idx+1}: ${l.trim().substring(0, 120)}`);
    }
  });
});

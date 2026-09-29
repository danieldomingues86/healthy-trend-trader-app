const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Find all page IDs in index.html
const pageMatches = html.matchAll(/<(?:section|div)[^>]*\bid=["']([a-zA-Z0-9_-]+)["'][^>]*\bclass=["'][^"']*\bpage\b/gi);
const foundPages = new Set();
for (const m of pageMatches) {
  foundPages.add(m[1]);
}
// Also check reverse attribute order: class before id
const pageMatches2 = html.matchAll(/<(?:section|div)[^>]*\bclass=["'][^"']*\bpage\b[^"']*["'][^>]*\bid=["']([a-zA-Z0-9_-]+)["']/gi);
for (const m of pageMatches2) {
  foundPages.add(m[1]);
}

console.log('Total pages found:', foundPages.size);
console.log(Array.from(foundPages).sort());

// Check theme definitions in theme-audit.css
const themeAudit = fs.readFileSync('frontend/theme-audit.css', 'utf8');

console.log('\n=== Checking pages in theme-audit.css ===');
for (const p of foundPages) {
  const inThemeAudit = themeAudit.includes('#' + p) || themeAudit.includes('.' + p);
  console.log(`Page #${p}: covered in theme-audit.css = ${inThemeAudit}`);
}

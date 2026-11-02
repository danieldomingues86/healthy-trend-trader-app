const fs = require('fs');
const path = require('path');
const regressionEngine = require('./visual-regression-engine.js');
const consistencyEngine = require('./visual-consistency-engine.js');

const rootDir = path.join(__dirname, '..');
const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

const screens = {};
consistencyEngine.SCREEN_REGISTRY.forEach(mod => {
  const pageId = mod.page || mod.id;
  screens[mod.id] = regressionEngine.extractScreenStructure(htmlContent, pageId);
});

const keyStylesheets = [
  'system-quality-analytics.css',
  'trade-anatomy.css',
  'trade-simulator.css',
  'event-playbook.css',
  'portfolio-heat-page.css',
  'market-cycle-v2.css',
  'daily-routine.css',
  'deserving-diary.css',
  'scale-in.css',
  'sidebar-navigation.css',
  'theme-pigeon-light.css'
];

const stylesheets = {};
keyStylesheets.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    stylesheets[file] = regressionEngine.extractCssFootprint(content, file);
  }
});

const snapshot = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  totalScreens: Object.keys(screens).length,
  totalStylesheets: Object.keys(stylesheets).length,
  screens,
  stylesheets
};

const baselineDir = path.join(__dirname, 'test-baselines');
if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });
}

fs.writeFileSync(
  path.join(baselineDir, 'visual-profiles.json'),
  JSON.stringify(snapshot, null, 2),
  'utf8'
);

console.log('Successfully generated baseline for', Object.keys(screens).length, 'screens and', Object.keys(stylesheets).length, 'stylesheets.');

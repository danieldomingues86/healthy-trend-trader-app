const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..', '..');
const { MODULES } = require(path.join(repoRoot, 'frontend', 'navigation-system-model.js'));

test('Manual do Software: 100% dos módulos do sistema estão representados no catálogo do software', () => {
  const mkCode = fs.readFileSync(path.join(repoRoot, 'frontend', 'manual-knowledge.js'), 'utf8');
  const match = mkCode.match(/const software = \[([\s\S]*?)\];/);
  assert.ok(match, 'manual-knowledge.js deve conter a constante software');

  // Parse software entries
  const softwareEntries = eval('[' + match[1] + ']');
  const softwareIds = new Set(softwareEntries.map(e => e[0]));

  // Modules that should be represented (all modules except manual itself if host)
  const requiredModules = MODULES.filter(m => m.page !== 'manual');

  const missingFromManual = [];
  for (const mod of requiredModules) {
    if (!softwareIds.has(mod.page)) {
      missingFromManual.push(mod.page);
    }
  }

  assert.equal(
    missingFromManual.length,
    0,
    `Módulos ausentes na Central de Conhecimento / Explore o Software: ${missingFromManual.join(', ')}`
  );
  assert.ok(softwareEntries.length >= 40, `Deve conter ao menos 40 ferramentas catalogadas (atual: ${softwareEntries.length})`);
});

test('Manual do Software: cada ferramenta possui capa conceitual válida em assets/manual-knowledge/', () => {
  const mkCode = fs.readFileSync(path.join(repoRoot, 'frontend', 'manual-knowledge.js'), 'utf8');
  const match = mkCode.match(/const software = \[([\s\S]*?)\];/);
  const softwareEntries = eval('[' + match[1] + ']');

  for (const [id, title] of softwareEntries) {
    const coverPath = path.join(repoRoot, 'assets', 'manual-knowledge', `${id}.jpg`);
    assert.ok(
      fs.existsSync(coverPath),
      `Ferramenta "${title}" (${id}) deve possuir imagem de capa em assets/manual-knowledge/${id}.jpg`
    );
    const stat = fs.statSync(coverPath);
    assert.ok(stat.size > 1000, `Capa de "${title}" (${id}) não pode estar vazia (tamanho: ${stat.size} bytes)`);
  }
});

test('Manual do Software: cada ferramenta possui conteúdo de guia (additionalGuides ou manual section)', () => {
  const mkCode = fs.readFileSync(path.join(repoRoot, 'frontend', 'manual-knowledge.js'), 'utf8');
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  const matchSoftware = mkCode.match(/const software = \[([\s\S]*?)\];/);
  const softwareEntries = eval('[' + matchSoftware[1] + ']');

  const matchGuides = mkCode.match(/const additionalGuides = \{([\s\S]*?)\n\s*\};/);
  assert.ok(matchGuides, 'manual-knowledge.js deve conter additionalGuides');

  for (const [id, title, , sourceSection] of softwareEntries) {
    const hasAdditionalGuide = matchGuides[1].includes(`${id}:`);
    const hasSourceSection = sourceSection && html.includes(`id="${sourceSection}"`);

    assert.ok(
      hasAdditionalGuide || hasSourceSection,
      `Ferramenta "${title}" (${id}) deve ter conteúdo em additionalGuides ou seção "${sourceSection}" no HTML`
    );
  }
});

test('Manual do Software: seções e botões no index.html possuem integridade e links válidos', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');

  const requiredSections = [
    'manual-mission',
    'manual-tradertraining',
    'manual-charts',
    'manual-marketcentral',
    'manual-eventplaybook',
    'manual-settings',
    'manual-about'
  ];

  for (const sec of requiredSections) {
    assert.ok(html.includes(`id="${sec}"`), `index.html deve conter a seção #${sec}`);
    assert.ok(html.includes(`data-manual-target="${sec}"`), `index.html deve conter botão para #${sec}`);
  }
});

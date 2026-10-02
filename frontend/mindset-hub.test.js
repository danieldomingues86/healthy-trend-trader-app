const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const sidebarNavJs = fs.readFileSync(path.join(__dirname, 'sidebar-navigation.js'), 'utf8');
const mindsetHubJs = fs.readFileSync(path.join(__dirname, 'mindset-hub.js'), 'utf8');
const traderRulesJs = fs.readFileSync(path.join(__dirname, 'trader-rules.js'), 'utf8');
const traderZenJs = fs.readFileSync(path.join(__dirname, 'trader-zen.js'), 'utf8');
const traderWisdomJs = fs.readFileSync(path.join(__dirname, 'trader-wisdom-v3.js'), 'utf8');
const emotionalIntellJs = fs.readFileSync(path.join(__dirname, 'emotional-intelligence.js'), 'utf8');

test('index.html: assets e scripts do módulo Mentalidade integrados corretamente', () => {
  // Stylesheet
  assert.match(indexHtml, /<link rel="stylesheet" href="frontend\/mindset-hub\.css" \/>/);

  // Script tags
  assert.match(indexHtml, /<script src="frontend\/mindset-hub\.js"><\/script>/);
  assert.match(indexHtml, /<script src="frontend\/trader-rules\.js"><\/script>/);

  // Root sections
  assert.match(indexHtml, /<section class="page" id="mindset" aria-label="Mentalidade"><div id="mindsetHubRoot"><\/div><\/section>/);
  assert.match(indexHtml, /<section class="page" id="traderrules" aria-label="Regras do Trader"><div id="traderRulesRoot"><\/div><\/section>/);

  // Titles mapping
  assert.match(indexHtml, /mindset:\s*['"]Mentalidade['"]/);
  assert.match(indexHtml, /traderrules:\s*['"]Regras do Trader['"]/);

  // Professional pages access
  assert.match(indexHtml, /professionalPages\.add\(['"]mindset['"]\)/);
  assert.match(indexHtml, /professionalPages\.add\(['"]traderrules['"]\)/);
});

test('sidebar-navigation.js: único ponto de entrada para Mentalidade sem itens dispersos', () => {
  // Direct button for mindset
  assert.match(sidebarNavJs, /id:\s*'mindset'/);
  assert.match(sidebarNavJs, /label:\s*'Mentalidade'/);
  assert.match(sidebarNavJs, /page:\s*'mindset'/);

  // Old separated group removed
  assert.doesNotMatch(sidebarNavJs, /id:\s*'mindset-zen'/);

  // Active sync handles all mindset subpages
  assert.match(sidebarNavJs, /const mindsetPages = new Set\(\['mindset', 'zen', 'audiolibrary', 'emotionalintelligence', 'traderrules', 'wisdom', 'traderprofile'\]\)/);

  // Breadcrumb shows Mentalidade / Submódulo with link back
  assert.match(sidebarNavJs, /onclick="go\('mindset'\)"/);
});

test('mindset-hub.js: estrutura da Home com os 6 submódulos, overview e blocos integrados', () => {
  // Hero com CTA de check-in mental
  assert.match(mindsetHubJs, /Fazer check-in mental/);
  assert.match(mindsetHubJs, /onclick="focusMentalCheckin\(\)"/);

  // 6 submodules present
  assert.match(mindsetHubJs, /class="mindset-module zen"/);
  assert.match(mindsetHubJs, /class="mindset-module library"/);
  assert.match(mindsetHubJs, /class="mindset-module psychology"/);
  assert.match(mindsetHubJs, /class="mindset-module rules"/);
  assert.match(mindsetHubJs, /class="mindset-module wisdom"/);
  assert.match(mindsetHubJs, /class="mindset-module profile"/);

  // Whole card is clickable
  assert.match(mindsetHubJs, /<article class="mindset-module zen"[^>]*onclick="openMindsetSubmodule\('zen'\)"/);
  assert.match(mindsetHubJs, /<article class="mindset-module library"[^>]*onclick="openMindsetSubmodule\('library'\)"/);
  assert.match(mindsetHubJs, /<article class="mindset-module psychology"[^>]*onclick="openMindsetSubmodule\('psychology'\)"/);
  assert.match(mindsetHubJs, /<article class="mindset-module rules"[^>]*onclick="openMindsetSubmodule\('rules'\)"/);
  assert.match(mindsetHubJs, /<article class="mindset-module wisdom"[^>]*onclick="openMindsetSubmodule\('wisdom'\)"/);
  assert.match(mindsetHubJs, /<article class="mindset-module profile"[^>]*onclick="openMindsetSubmodule\('profile'\)"/);

  // Pills are informative spans, not clickable buttons
  assert.match(mindsetHubJs, /<div class="mindset-module-pills">\s*<span>Respiração<\/span>/);
  assert.doesNotMatch(mindsetHubJs, /<div class="mindset-module-pills">\s*<button/);

  // Overview row: Seu Estado Mental, Sua Evolução Mental, Continue sua jornada
  assert.match(mindsetHubJs, /Seu Estado Mental/);
  assert.match(mindsetHubJs, /Sua Evolução Mental/);
  assert.match(mindsetHubJs, /Continue sua jornada/);
  assert.match(mindsetHubJs, /Sua Jornada Mental/);

  // Bloco inferior: Reflexão do dia, Atividade recente
  assert.match(mindsetHubJs, /Reflexão do dia/);
  assert.match(mindsetHubJs, /Atividade recente/);

  // 5 mental states
  assert.match(mindsetHubJs, /data-state="calm"/);
  assert.match(mindsetHubJs, /data-state="good"/);
  assert.match(mindsetHubJs, /data-state="neutral"/);
  assert.match(mindsetHubJs, /data-state="anxious"/);
  assert.match(mindsetHubJs, /data-state="agitated"/);
});

test('trader-rules.js: checklist interativo de 7 pontos, regras de execução e regras de ouro', () => {
  // 7 checklist items
  assert.match(traderRulesJs, /Existe setup\?/);
  assert.match(traderRulesJs, /O contexto está adequado\?/);
  assert.match(traderRulesJs, /Minha entrada está definida\?/);
  assert.match(traderRulesJs, /Meu stop está definido\?/);
  assert.match(traderRulesJs, /O risco está dentro da política\?/);
  assert.match(traderRulesJs, /Estou emocionalmente preparado\?/);
  assert.match(traderRulesJs, /Estou entrando porque existe oportunidade ou porque quero operar\?/);

  // Execution rules (Antes, Durante, Depois)
  assert.match(traderRulesJs, /Antes do trade · Preparação/);
  assert.match(traderRulesJs, /Durante o trade · Condução/);
  assert.match(traderRulesJs, /Depois do trade · Processamento/);

  // 7 Regras de Ouro
  assert.match(traderRulesJs, /As 7 Regras de Ouro/);

  // O que NÃO fazer
  assert.match(traderRulesJs, /O que NÃO fazer no Healthy Trend Trader/);
});

test('submódulos: possuem botão para retornar à Home de Mentalidade', () => {
  // Trader Zen
  assert.match(traderZenJs, /onclick="go\('mindset'\)"/);

  // Trader Wisdom
  assert.match(traderWisdomJs, /onclick="go\('mindset'\)"/);

  // Emotional Intelligence (Psicologia)
  assert.match(emotionalIntellJs, /onclick="go\('mindset'\)"/);

  // Trader Profile
  assert.match(indexHtml, /onclick="go\(\\'?mindset\\'?\)"/);

  // Trader Rules
  assert.match(traderRulesJs, /onclick="go\('mindset'\)"/);
});

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('tela de login tem estrutura cinematográfica sem elementos legados', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  // 1. Estrutura cinematográfica ativa
  assert.ok(html.includes('id="loginShell"'), 'Deve conter #loginShell');
  assert.ok(html.includes('class="login-container"'), 'Deve conter .login-container');
  assert.ok(html.includes('class="login-manifesto-col"'), 'Deve conter .login-manifesto-col');
  assert.ok(html.includes('class="login-card-col"'), 'Deve conter .login-card-col');
  assert.ok(html.includes('class="login-art-col"'), 'Deve conter .login-art-col');
  assert.ok(html.includes('class="login-scene login-scene-green"'), 'Deve conter cena verde');
  assert.ok(html.includes('class="login-scene login-scene-gold"'), 'Deve conter cena dourada');
  assert.ok(html.includes('class="login-scene-overlay"'), 'Deve conter overlay de vinheta');

  // 2. Elementos legados que causavam sobreposição DEVEM estar ausentes
  assert.ok(!html.includes('login-mantra'), 'Não deve conter login-mantra legado');
  assert.ok(!html.includes('candles dourados'), 'Não deve conter SVG antigo de candles');
  assert.ok(!html.includes('class="login-visual"'), 'Não deve conter login-visual legado');
  assert.ok(!html.includes('class="login-panel"'), 'Não deve conter login-panel legado');

  // 3. CSS carregado no cabeçalho
  const headEnd = html.indexOf('</head>');
  const cssIndex = html.indexOf('frontend/login-cinematic.css');
  assert.ok(cssIndex > 0 && cssIndex < headEnd, 'login-cinematic.css deve ser carregado dentro de <head>');
});

test('login-cinematic.css define backgrounds limpos e isolamento de tema', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'login-cinematic.css'), 'utf8');

  // Supressão de pseudo-elementos legados
  assert.ok(css.includes('#loginShell::before'), 'Deve declarar supressão de ::before');
  assert.ok(css.includes('#loginShell::after'), 'Deve declarar supressão de ::after');

  // Uso dos assets limpos
  assert.ok(css.includes('healthy-green-bg.png'), 'Cena verde deve usar healthy-green-bg.png limpo');
  assert.ok(css.includes('premium-gold-bg.png'), 'Cena dourada deve usar premium-gold-bg.png limpo');

  // Não deve referenciar assets com card embutido nem imagens antigas
  assert.ok(!css.includes('healthy-green-reference.png'), 'Não deve usar reference PNG como background');
  assert.ok(!css.includes('premium-gold-reference.png'), 'Não deve usar reference PNG como background');
  assert.ok(!css.includes('bull-bear'), 'Não deve carregar imagem antiga bull-bear');
  assert.ok(!css.includes('trading-desk'), 'Não deve carregar imagem antiga trading-desk');

  // Arquivos de imagem existem
  const greenBgPath = path.join(root, 'assets', 'login', 'healthy-green-bg.png');
  const goldBgPath = path.join(root, 'assets', 'login', 'premium-gold-bg.png');
  assert.ok(fs.existsSync(greenBgPath) && fs.statSync(greenBgPath).size > 50000, 'healthy-green-bg.png deve existir e ser válido');
  assert.ok(fs.existsSync(goldBgPath) && fs.statSync(goldBgPath).size > 50000, 'premium-gold-bg.png deve existir e ser válido');
});

test('seletor de temas está presente e configurado na tela de login', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'frontend', 'login-cinematic.css'), 'utf8');

  // Markup do seletor no top-bar do login
  assert.ok(html.includes('class="theme-picker login-theme-picker"'), 'Deve conter .login-theme-picker no HTML');
  assert.ok(html.includes('data-theme-choice="healthy"'), 'Deve conter opção Healthy Green');
  assert.ok(html.includes('data-theme-choice="gold"'), 'Deve conter opção Premium Gold');
  assert.ok(html.includes('applyTheme(\'healthy\')'), 'Deve acionar applyTheme healthy no clique');
  assert.ok(html.includes('applyTheme(\'gold\')'), 'Deve acionar applyTheme gold no clique');

  // CSS suporta o seletor de tema no login
  assert.ok(css.includes('#loginShell .login-theme-picker'), 'CSS deve estilizar #loginShell .login-theme-picker');
  assert.ok(css.includes('#loginShell .login-theme-picker .theme-choice'), 'CSS deve estilizar os botões de tema do login');
  assert.ok(css.includes('#loginShell .login-theme-picker .theme-swatch'), 'CSS deve estilizar os swatches de tema');
});


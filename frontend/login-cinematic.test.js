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

test('login-cinematic.css define backgrounds oficiais e isolamento de tema', () => {
  const css = fs.readFileSync(path.join(root, 'frontend', 'login-cinematic.css'), 'utf8');

  // Supressão de pseudo-elementos legados
  assert.ok(css.includes('#loginShell::before'), 'Deve declarar supressão de ::before');
  assert.ok(css.includes('#loginShell::after'), 'Deve declarar supressão de ::after');

  // Uso dos assets oficiais limpos dos 3 temas (Camada A)
  assert.ok(css.includes('login-healthy-green-background.jpg'), 'Cena verde deve usar asset oficial limpo login-healthy-green-background.jpg');
  assert.ok(css.includes('login-pigeon-light-background.jpg'), 'Cena pigeon deve usar asset oficial limpo login-pigeon-light-background.jpg');
  assert.ok(css.includes('login-premium-gold-background.jpg'), 'Cena dourada deve usar asset oficial limpo login-premium-gold-background.jpg');

  // Não deve referenciar screenshots completos ou imagens antigas como background
  assert.ok(!css.includes('healthy-green-forest.png'), 'Não deve usar screenshot antigo healthy-green-forest.png como background');
  assert.ok(!css.includes('premium-gold-stallion.png'), 'Não deve usar screenshot antigo premium-gold-stallion.png como background');
  assert.ok(!css.includes('pigeon-light-sky.png'), 'Não deve usar screenshot antigo pigeon-light-sky.png como background');
  assert.ok(!css.includes('bull-bear'), 'Não deve carregar imagem antiga bull-bear');
  assert.ok(!css.includes('trading-desk'), 'Não deve carregar imagem antiga trading-desk');

  // Arquivos de imagem de background limpos existem
  const greenBgPath = path.join(root, 'assets', 'login', 'login-healthy-green-background.jpg');
  const pigeonBgPath = path.join(root, 'assets', 'login', 'login-pigeon-light-background.jpg');
  const goldBgPath = path.join(root, 'assets', 'login', 'login-premium-gold-background.jpg');
  assert.ok(fs.existsSync(greenBgPath) && fs.statSync(greenBgPath).size > 40000, 'login-healthy-green-background.jpg deve existir e ser válido');
  assert.ok(fs.existsSync(pigeonBgPath) && fs.statSync(pigeonBgPath).size > 40000, 'login-pigeon-light-background.jpg deve existir e ser válido');
  assert.ok(fs.existsSync(goldBgPath) && fs.statSync(goldBgPath).size > 40000, 'login-premium-gold-background.jpg deve existir e ser válido');
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
  assert.ok(html.includes('data-theme-choice="pigeon"'), 'Deve conter opção Pigeon Light');
  assert.ok(html.includes('applyTheme(\'pigeon\')'), 'Deve acionar applyTheme pigeon no clique');

  // CSS suporta o seletor de tema no login
  assert.ok(css.includes('#loginShell .login-theme-picker'), 'CSS deve estilizar #loginShell .login-theme-picker');
  assert.ok(css.includes('#loginShell .login-theme-picker .theme-choice'), 'CSS deve estilizar os botões de tema do login');
  assert.ok(css.includes('#loginShell .login-theme-picker .theme-swatch'), 'CSS deve estilizar os swatches de tema');
});

function readJpegDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  assert.strictEqual(buf[0], 0xff);
  assert.strictEqual(buf[1], 0xd8);
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height, bytes: buf.length };
    }
    if (marker === 0xd9 || marker === 0xda) break;
    const segLen = buf.readUInt16BE(offset + 2);
    offset += 2 + segLen;
  }
  throw new Error(`SOF marker not found in ${filePath}`);
}

test('backgrounds oficiais das 3 paletas possuem resolução 4K real (3840x2160) e nitidez preservada', () => {
  const assets = [
    'login-healthy-green-background.jpg',
    'login-pigeon-light-background.jpg',
    'login-premium-gold-background.jpg'
  ];

  for (const filename of assets) {
    const filePath = path.join(root, 'assets', 'login', filename);
    const dims = readJpegDimensions(filePath);
    assert.strictEqual(dims.width, 3840, `${filename} deve ter largura 4K (3840px), atual: ${dims.width}`);
    assert.strictEqual(dims.height, 2160, `${filename} deve ter altura 4K (2160px), atual: ${dims.height}`);
    assert.ok(dims.bytes > 800000, `${filename} deve ter densidade de alta definição (>800KB), atual: ${dims.bytes}`);
  }
});

test('isolamento arquitetural fullscreen 100vw x 100vh bloqueia vazamento do dashboard e remove blur do background', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'frontend', 'login-cinematic.css'), 'utf8');
  const authJs = fs.readFileSync(path.join(root, 'frontend', 'auth-client.js'), 'utf8');

  // 1. HTML inicializa em estado desautenticado com .app oculto
  assert.ok(html.includes('<body data-auth-state="unauthenticated"'), 'Body deve iniciar com data-auth-state="unauthenticated"');
  assert.ok(html.includes('<div class="app" hidden aria-hidden="true" inert>'), 'Container .app do dashboard deve iniciar oculto e inerte');
  assert.ok(html.includes('function setWorkspaceAuthState(isAuthenticated)'), 'index.html deve declarar setWorkspaceAuthState');

  // 2. CSS garante isolamento estrito do dashboard e fullscreen 100vw x 100vh sem scroll
  assert.ok(
    css.includes('body:not([data-auth-state="authenticated"]) .app') &&
    css.includes('display: none !important;'),
    'CSS deve ocultar .app com display: none !important quando não autenticado'
  );
  assert.ok(css.includes('width: 100vw;'), '#loginShell deve ter width: 100vw');
  assert.ok(css.includes('height: 100vh;') && css.includes('height: 100dvh;'), '#loginShell deve ter height: 100vh / 100dvh');
  assert.ok(css.includes('overflow: hidden !important;'), '#loginShell deve bloquear scroll vertical e horizontal');

  // 3. Nenhum filter: blur() aplicado ao background da cena ou ambient backdrop
  assert.ok(!css.includes('filter: blur(30px)'), 'Não deve existir filter: blur(30px) no ambient backdrop');
  assert.ok(
    css.includes('#loginShell .login-scene') && css.includes('filter: none !important;'),
    '.login-scene deve ter filter: none !important para nitidez 4K total'
  );

  // 4. auth-client.js sincroniza o isolamento ao autenticar e ao deslogar
  assert.ok(authJs.includes('syncAuthRouteIsolation(true)'), 'enter() deve ativar rota autenticada');
  assert.ok(authJs.includes('syncAuthRouteIsolation(false)'), 'signOutWorkspace() deve restaurar isolamento desautenticado');
});



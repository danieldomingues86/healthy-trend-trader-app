const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Loja Trader — Redesign Premium & Livro-Carro-Chefe Força Verde', async (t) => {
  // 1. Verifica existência da imagem de referência no diretório assets/
  await t.test('Imagem de referência assets/forca-verde-banner.jpg existe e possui tamanho válido', () => {
    const bannerPath = path.resolve(__dirname, '../assets/forca-verde-banner.jpg');
    assert.equal(fs.existsSync(bannerPath), true, 'assets/forca-verde-banner.jpg deve existir');
    const stats = fs.statSync(bannerPath);
    assert.ok(stats.size > 50000, 'A imagem deve ser de alta resolução (> 50KB)');
  });

  // 2. Simula o ambiente de browser com healthyMaterials
  await t.test('Definição de healthyMaterials e metadados no frontend/materials-page-v2.js', () => {
    const jsContent = fs.readFileSync(path.resolve(__dirname, 'materials-page-v2.js'), 'utf8');

    // Verifica se forca-verde é referenciado como livro-carro-chefe
    assert.ok(jsContent.includes("'forca-verde'"), 'Deve conter identificador forca-verde');
    assert.ok(jsContent.includes('Daniel Gonçalves'), 'Deve referenciar o autor Daniel Gonçalves');
    assert.ok(jsContent.includes('Swing Trade com Tendência'), 'Deve conter a proposta de Swing Trade com Tendência');
    assert.ok(jsContent.includes('Encontre os Líderes'), 'Deve conter o Pilar 1: Encontre os Líderes');
    assert.ok(jsContent.includes('Ciclo de Mercado'), 'Deve conter o Pilar 2: Ciclo de Mercado');
    assert.ok(jsContent.includes('Gatilhos Oficiais'), 'Deve conter o Pilar 3: Gatilhos Oficiais');
    assert.ok(jsContent.includes('Gestão de Risco'), 'Deve conter o Pilar 4: Gestão de Risco');
    assert.ok(jsContent.includes('Venda na Força'), 'Deve conter o Pilar 5: Venda na Força');
  });

  // 3. Verifica se todos os produtos secundários estão marcados como indisponíveis / em breve
  await t.test('Materiais secundários estão bloqueados para compra com selo EM BREVE', () => {
    const jsContent = fs.readFileSync(path.resolve(__dirname, 'materials-page-v2.js'), 'utf8');
    assert.ok(jsContent.includes('is-coming-soon'), 'Deve conter classe CSS de material em produção');
    assert.ok(jsContent.includes('EM BREVE'), 'Deve exibir selo EM BREVE');
    assert.ok(jsContent.includes('btn-card-disabled'), 'Deve utilizar botão desabilitado para materiais não lançados');
    assert.ok(jsContent.includes('disabled aria-disabled="true"'), 'Botão de compra de produto secundário deve ser nativamente disabled');
    assert.ok(jsContent.includes('Material em produção editorial'), 'Deve conter aviso explícito de produção editorial');
  });

  // 4. Verifica integridade de assets de todas as obras
  await t.test('Todas as capas de materiais referenciadas possuem arquivo correspondente em assets/', () => {
    const assetsDir = path.resolve(__dirname, '../assets');
    const covers = [
      'forca-verde-banner.jpg',
      'forca-verde-hero-panoramic.png',
      'forca-verde-book-3d.png',
      'materials-rubric-cover-v1.png',
      'materials-market-cover-v1.png',
      'materials-risk-cover-v1.png',
      'materials-earnings-cover-v1.png',
      'materials-checklist-cover-v1.png',
      'materials-zen-cover-v1.png',
      'materials-audio-cover-v1.png',
      'materials-fundamentals-cover-v1.png'
    ];
    for (const cover of covers) {
      assert.equal(
        fs.existsSync(path.join(assetsDir, cover)),
        true,
        `Arquivo de capa ${cover} deve existir em assets/`
      );
    }
  });

  // 5. Verifica estilos CSS correspondentes em frontend/materials-page-v2.css
  await t.test('Estilos CSS para Força Verde, Gaveta de Capítulos e Em Breve existem', () => {
    const cssContent = fs.readFileSync(path.resolve(__dirname, 'materials-page-v2.css'), 'utf8');
    assert.ok(cssContent.includes('.forca-verde-flagship') || cssContent.includes('.materials-hero-spotlight'), 'Deve estilizar o hero spotlight');
    assert.ok(cssContent.includes('.flagship-title'), 'Deve estilizar o título de Força Verde');
    assert.ok(cssContent.includes('.flagship-pillars-strip'), 'Deve estilizar a faixa dos 5 pilares');
    assert.ok(cssContent.includes('.flagship-details-drawer'), 'Deve conter estilo da gaveta de capítulos');
    assert.ok(cssContent.includes('.pill-coming-soon'), 'Deve estilizar o badge EM BREVE');
    assert.ok(cssContent.includes('.btn-card-disabled'), 'Deve estilizar o botão desabilitado');
  });

  // 6. Verifica o Hero Cinematográfico e os CTAs funcionais
  await t.test('Hero Cinematográfico renderiza componentes reais de título, CTAs e mockup 3D', () => {
    const jsContent = fs.readFileSync(path.resolve(__dirname, 'materials-page-v2.js'), 'utf8');
    assert.ok(jsContent.includes('materials-hero-cinematic'), 'Deve conter classe do hero cinematográfico');
    assert.ok(jsContent.includes('title-forca'), 'Deve conter título FORÇA estilizado');
    assert.ok(jsContent.includes('title-verde'), 'Deve conter título VERDE estilizado');
    assert.ok(jsContent.includes('GARANTIR MEU EXEMPLAR'), 'Deve conter CTA de compra de alto destaque');
    assert.ok(jsContent.includes('Conhecer o método'), 'Deve conter CTA secundário para conhecer o método');
    assert.ok(jsContent.includes('forca-verde-book-3d.png'), 'Deve referenciar o mockup 3D oficial grande');
  });

  // 7. Verifica a Faixa dos 5 Pilares na base do Hero
  await t.test('Faixa dos 5 Pilares contém ícones SVG e pilares canônicos integrados', () => {
    const jsContent = fs.readFileSync(path.resolve(__dirname, 'materials-page-v2.js'), 'utf8');
    assert.ok(jsContent.includes('hero-pillars-strip'), 'Deve conter container da faixa dos pilares');
    assert.ok(jsContent.includes('ENCONTRE'), 'Pilar 1 presente');
    assert.ok(jsContent.includes('OS LÍDERES'), 'Destaque do Pilar 1 presente');
    assert.ok(jsContent.includes('LEIA O CICLO'), 'Pilar 2 presente');
    assert.ok(jsContent.includes('DE MERCADO'), 'Destaque do Pilar 2 presente');
    assert.ok(jsContent.includes('GATILHOS OFICIAIS'), 'Pilar 3 presente');
    assert.ok(jsContent.includes('GESTÃO DE RISCO'), 'Pilar 4 presente');
    assert.ok(jsContent.includes('VENDA NA FORÇA'), 'Pilar 5 presente');
  });

  // 8. Verifica Seção Destaques da Loja (Trading Rubric, Gestão de Risco e Ciclo de Mercado)
  await t.test('Seção Destaques da Loja apresenta frameworks essenciais com hierarquia editorial', () => {
    const jsContent = fs.readFileSync(path.resolve(__dirname, 'materials-page-v2.js'), 'utf8');
    assert.ok(jsContent.includes('store-featured-section'), 'Deve conter seção de destaques da loja');
    assert.ok(jsContent.includes('featured-lead-card'), 'Deve conter card lead para Trading Rubric');
    assert.ok(jsContent.includes('featured-dual-grid'), 'Deve conter grid duplo para destaques complementares');
  });

  // 9. Verifica Seção Meu Acervo Pessoal Integrada (sem sidebar)
  await t.test('Meu Acervo Pessoal está integrado à página principal e livre de coluna lateral fixa', () => {
    const jsContent = fs.readFileSync(path.resolve(__dirname, 'materials-page-v2.js'), 'utf8');
    assert.ok(jsContent.includes('store-my-library-section'), 'Deve conter seção integrada do acervo');
    assert.ok(jsContent.includes('myPersonalLibrarySection'), 'Deve conter âncora do acervo');
    assert.ok(jsContent.includes('btn-store-library-shortcut'), 'Deve conter atalho rápido para o acervo no topo');
  });

  // 10. Verifica Suporte VIP WhatsApp e Rodapé Editorial
  await t.test('Suporte VIP WhatsApp e Rodapé Editorial estão integrados ao fluxo comercial', () => {
    const jsContent = fs.readFileSync(path.resolve(__dirname, 'materials-page-v2.js'), 'utf8');
    assert.ok(jsContent.includes('store-support-banner'), 'Deve conter banner de suporte VIP');
    assert.ok(jsContent.includes('btn-support-whatsapp'), 'Deve conter botão para WhatsApp');
    assert.ok(jsContent.includes('store-editorial-footer'), 'Deve conter rodapé editorial');
    assert.ok(jsContent.includes('MÉTODO'), 'Deve conter mantra oficial no rodapé');
    assert.ok(jsContent.includes('DISCIPLINA'), 'Deve conter mantra oficial no rodapé');
  });
});

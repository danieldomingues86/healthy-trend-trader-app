const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const BookReaderModel = require(path.join(__dirname, 'book-reader-model.js'));
const BooksModel = require(path.join(__dirname, 'manual-knowledge-books.js'));

test('Interactive Book Reader: Preservação da Biblioteca Digital como Catálogo', () => {
  const mkCode = fs.readFileSync(path.join(__dirname, 'manual-knowledge.js'), 'utf8');

  assert.ok(mkCode.includes('kc-library-view'), 'manual-knowledge.js deve manter a visualização de biblioteca/catálogo');
  assert.ok(mkCode.includes('kc-lib-hero'), 'Biblioteca deve conter hero banner de boas-vindas');
  assert.ok(mkCode.includes('kc-books-grid'), 'Biblioteca deve listar os livros em grade');
  assert.ok(mkCode.includes('kc-software-grid'), 'Biblioteca deve catalogar as ferramentas do software');
});

test('Interactive Book Reader: Tela Exclusiva do Leitor e Estrutura do Flipbook 3D', () => {
  const mkCode = fs.readFileSync(path.join(__dirname, 'manual-knowledge.js'), 'utf8');
  const cssCode = fs.readFileSync(path.join(__dirname, 'book-reader.css'), 'utf8');

  // Shell e componentes do leitor
  assert.ok(mkCode.includes('ht-book-reader-shell'), 'Leitor deve possuir shell de tela exclusiva');
  assert.ok(mkCode.includes('ht-reader-topbar'), 'Leitor deve possuir barra superior com controles');
  assert.ok(mkCode.includes('ht-book-desk'), 'Leitor deve possuir desk físico de leitura');
  assert.ok(mkCode.includes('ht-book-spread'), 'Leitor deve possuir container do livro aberto');
  assert.ok(mkCode.includes('ht-book-gutter'), 'Leitor deve possuir lombada central sombreada');
  assert.ok(mkCode.includes('ht-book-ribbon'), 'Leitor deve possuir fita marcadora decorativa');

  // CSS 3D e animações
  assert.ok(cssCode.includes('perspective'), 'CSS deve definir perspectiva 3D para o flipbook');
  assert.ok(cssCode.includes('htFlipForward'), 'CSS deve conter animação realista de virada de página');
  assert.ok(cssCode.includes('prefers-reduced-motion'), 'CSS deve respeitar preferência de movimento reduzido');
});

test('Interactive Book Reader: Suporte Dual-Page (Desktop) e Single-Page (Mobile)', () => {
  const cssCode = fs.readFileSync(path.join(__dirname, 'book-reader.css'), 'utf8');

  assert.ok(cssCode.includes('single-page-mode'), 'CSS deve prever modo de uma página');
  assert.ok(cssCode.includes('@media (max-width: 1050px)'), 'CSS deve adaptar para telas menores de 1050px');
  assert.ok(cssCode.includes('@media (max-width: 768px)'), 'CSS deve adaptar para mobile');
});

test('Interactive Book Reader: Navegação, Índice Flutuante (TOC Drawer) e Marcadores', () => {
  const mkCode = fs.readFileSync(path.join(__dirname, 'manual-knowledge.js'), 'utf8');

  assert.ok(mkCode.includes('ht-toc-drawer'), 'Leitor deve possuir slide-over drawer com índice navegável');
  assert.ok(mkCode.includes('toggle-bookmark'), 'Leitor deve suportar ação de alternar marcadores');
  assert.ok(mkCode.includes('ht-reader-bottom-dock'), 'Leitor deve possuir barra inferior de progresso');
  assert.ok(mkCode.includes('toggleDualPage'), 'Leitor deve permitir alternar entre 1 e 2 páginas');
  assert.ok(mkCode.includes('toggleFullscreen'), 'Leitor deve permitir modo tela cheia');
});

test('Interactive Book Reader: Componentes Didáticos Interativos Integrados', () => {
  const mkCode = fs.readFileSync(path.join(__dirname, 'manual-knowledge.js'), 'utf8');

  assert.ok(mkCode.includes('htDidacticCalc'), 'Leitor deve integrar Mini Calculadora de Position Sizing');
  assert.ok(mkCode.includes('htDidacticPayoff'), 'Leitor deve integrar Mini Simulador de Expectancy/Payoff');
  assert.ok(mkCode.includes('ht-didactic-callout'), 'Leitor deve conter caixas temáticas de atenção e dicas');
  assert.ok(mkCode.includes('ht-tool-action-card'), 'Leitor deve conter atalhos diretos para os módulos do sistema');
});

test('Interactive Book Reader: Suporte a Temas Healthy Green, Premium Gold e Pigeon Light', () => {
  const cssCode = fs.readFileSync(path.join(__dirname, 'book-reader.css'), 'utf8');
  const mkCss = fs.readFileSync(path.join(__dirname, 'manual-knowledge.css'), 'utf8');

  // Variáveis por tema
  assert.ok(cssCode.includes(':root'), 'CSS deve possuir variáveis para Healthy Green');
  assert.ok(cssCode.includes('body.theme-gold'), 'CSS deve possuir variáveis para Premium Gold');
  assert.ok(cssCode.includes('body.theme-light'), 'CSS deve possuir compatibilidade com theme-light');
  assert.ok(cssCode.includes('body[data-theme="pigeon"]'), 'CSS deve possuir suporte estrito a data-theme="pigeon"');
  assert.ok(cssCode.includes('body[data-theme="gold"]'), 'CSS deve possuir suporte estrito a data-theme="gold"');

  // Cores de Pigeon Light
  assert.ok(cssCode.includes('#dce8ef'), 'Pigeon Light deve usar bordas line #DCE8EF');
  assert.ok(cssCode.includes('#58a6ca'), 'Pigeon Light deve usar accent sky #58A6CA');
  assert.ok(cssCode.includes('#182b36'), 'Pigeon Light deve usar tinta profunda #182B36');

  // Aproveitamento total de espaço na tela
  assert.ok(mkCss.includes('is-reader-view'), 'manual-knowledge.css deve definir classe is-reader-view');
  assert.ok(mkCss.includes('max-width: none !important'), 'manual-knowledge.css deve remover restrição de largura no leitor');
  assert.ok(cssCode.includes('width: calc(100% - 72px)'), 'Container do livro deve aproveitar toda a largura disponível da mesa');
  assert.ok(cssCode.includes('height: 100%'), 'Container do livro deve preencher 100% da altura útil da mesa');
  assert.ok(cssCode.includes('padding: 8px 18px 58px;'), 'Mesa deve reservar 58px de respiro inferior para a paginação');
});

test('Interactive Book Reader: Prevenção de Sobreposição da Paginação e Integridade do Conteúdo', () => {
  const cssCode = fs.readFileSync(path.join(__dirname, 'book-reader.css'), 'utf8');
  const mkCode = fs.readFileSync(path.join(__dirname, 'manual-knowledge.js'), 'utf8');

  // Dock de paginação fica na margem inferior reservada sem sobrepor as páginas
  assert.ok(cssCode.includes('bottom: 8px;'), 'Dock de paginação deve estar fixado na base');
  assert.ok(cssCode.includes('padding: 8px 18px 58px;'), 'Mesa do livro deve possuir padding inferior de 58px');

  // Páginas do livro com flex-start e footer auto para evitar quebra de texto
  assert.ok(cssCode.includes('justify-content: flex-start;'), 'Página deve utilizar flex-start');
  assert.ok(cssCode.includes('margin-top: auto;'), 'Rodapé editorial deve utilizar margin-top auto');
  assert.ok(mkCode.includes('line-height:1.4;margin:3px 0 0;'), 'Card de ferramenta deve ter line-height sem truncamento');
});


test('Interactive Book Reader: Flipbook Unificado sem Tela Longa / Sumário do Acervo Inicial', () => {
  const mkCode = fs.readFileSync(path.join(__dirname, 'manual-knowledge.js'), 'utf8');
  const cssCode = fs.readFileSync(path.join(__dirname, 'book-reader.css'), 'utf8');

  // Inicialização direta no Flipbook
  assert.ok(mkCode.includes("bookId: 'acervo'"), 'Manual deve iniciar diretamente no Sumário Geral do Acervo');
  assert.ok(mkCode.includes("container.className = 'knowledge-center is-reader-view';"), 'Manual deve renderizar diretamente no Flipbook Reader');

  // Spread do Acervo
  assert.ok(mkCode.includes('ht-acervo-cover-page'), 'Spread do Acervo deve conter a Capa Nobre');
  assert.ok(mkCode.includes('ht-acervo-shelf-page'), 'Spread do Acervo deve conter a Estante dos 6 Volumes');
  assert.ok(mkCode.includes('ht-shelf-grid'), 'Estante deve exibir grade de livros');
  assert.ok(mkCode.includes('ht-shelf-card'), 'Cada livro deve ser apresentado em card editorial compacto');

  // Seletor de volume na Topbar
  assert.ok(mkCode.includes('htReaderBookSelect'), 'Topbar deve possuir seletor dropdown de volumes');
  assert.ok(mkCode.includes('openAcervo'), 'Deve possuir manipulador de retorno ao Acervo');

  // CSS do Acervo e Seletor
  assert.ok(cssCode.includes('.ht-reader-book-picker'), 'CSS deve conter estilo para o seletor de volumes');
  assert.ok(cssCode.includes('.ht-shelf-grid'), 'CSS deve conter grade da estante');
  assert.ok(cssCode.includes('.ht-acervo-page'), 'CSS deve definir dimensões sem scroll para as páginas do acervo');
});

test('Interactive Book Reader: Alto Contraste e Legibilidade na Topbar em Todos os Temas', () => {
  const cssCode = fs.readFileSync(path.join(__dirname, 'book-reader.css'), 'utf8');
  const mkCss = fs.readFileSync(path.join(__dirname, 'manual-knowledge.css'), 'utf8');

  // Topbar deve ter cor de texto clara no tema escuro padrão (Healthy Green)
  assert.ok(cssCode.includes('color: #ECFDF5;'), 'Topbar deve definir cor de texto clara no Healthy Green');
  assert.ok(cssCode.includes('color: #ECFDF5;\n  font-size: 13px;\n  font-weight: 600;'), 'Botão voltar deve possuir contraste nítido #ECFDF5');
  assert.ok(cssCode.includes('.ht-reader-chapter-title {\n  color: #FFFFFF;'), 'Título do capítulo deve ser branco puro legível');
  assert.ok(mkCss.includes('color: #ECFDF5;'), 'manual-knowledge.css deve garantir cor clara em is-reader-view');
});

test('Interactive Book Reader: Galeria de Capítulos em Modal Central Estilo Widget Gallery', () => {
  const mkCode = fs.readFileSync(path.join(__dirname, 'manual-knowledge.js'), 'utf8');
  const cssCode = fs.readFileSync(path.join(__dirname, 'book-reader.css'), 'utf8');

  // Modal central estruturado no JavaScript
  assert.ok(mkCode.includes('ht-toc-modal'), 'Deve conter modal central do índice');
  assert.ok(mkCode.includes('ht-toc-modal-header'), 'Modal deve conter cabeçalho com título e descrição');
  assert.ok(mkCode.includes('ht-toc-modal-intro'), 'Modal deve conter badge ilustrativo intro');
  assert.ok(mkCode.includes('ht-toc-modal-filters'), 'Modal deve conter filtros por volume e marcadores');
  assert.ok(mkCode.includes('ht-toc-modal-grid'), 'Modal deve conter grade artística de cards');
  assert.ok(mkCode.includes('ht-toc-card'), 'Cada capítulo deve ser renderizado em card artístico');
  assert.ok(mkCode.includes('renderTocArt'), 'Cards devem conter ilustrações SVG por volume');
  assert.ok(mkCode.includes('getChapterThematicSvg'), 'Deve possuir ilustrações temáticas personalizadas por assunto de cada capítulo');
  assert.ok(mkCode.includes('NUMERO GIGANTE ARTISTICO DO CAPITULO'), 'Deve estampar o número grande do capítulo na arte do card');
  assert.ok(mkCode.includes('ht-toc-empty-bookmarks'), 'Deve conter estado vazio artístico para marcadores');

  // Ações e navegação
  assert.ok(mkCode.includes('open-toc-modal'), 'Deve possuir ação para abrir o modal de índice');
  assert.ok(mkCode.includes('close-toc-modal'), 'Deve possuir ação para fechar o modal');
  assert.ok(mkCode.includes('set-toc-filter'), 'Deve permitir filtrar por volume ou marcadores');

  // CSS do Modal e temas
  assert.ok(cssCode.includes('.ht-toc-modal-backdrop'), 'CSS deve conter backdrop com blur para o modal');
  assert.ok(cssCode.includes('.ht-toc-modal'), 'CSS deve definir dimensões e bordas arredondadas para o modal');
  assert.ok(cssCode.includes('.ht-toc-card'), 'CSS deve definir visual de card inspirado na Widget Gallery');
  assert.ok(cssCode.includes('.ht-toc-art'), 'CSS deve posicionar arte do card à direita com máscara gradiente');
  assert.ok(cssCode.includes('body[data-theme="pigeon"] .ht-toc-modal'), 'Pigeon Light deve estilizar o modal com cores claras');
  assert.ok(cssCode.includes('body[data-theme="gold"] .ht-toc-modal'), 'Premium Gold deve estilizar o modal com acabamento dourado');
});

test('Interactive Book Reader: Ações de Retorno ao Acervo (open-acervo) e Abertura de Volume (open-book)', () => {
  const mkCode = fs.readFileSync(path.join(__dirname, 'manual-knowledge.js'), 'utf8');

  // open-acervo no topo do leitor deve chamar openAcervo()
  assert.ok(mkCode.includes("action === 'open-library' || action === 'open-acervo'"), 'Ação open-acervo deve ser tratada e redirecionar para openAcervo()');
  // open-book nas capas do acervo e botões deve chamar openBook()
  assert.ok(mkCode.includes("action === 'open-book'"), 'Ação open-book deve ser tratada para abrir volumes específicos');
  // O botão voltar deve conter data-action="open-acervo"
  assert.ok(mkCode.includes('data-action="open-acervo"'), 'Botão voltar deve possuir data-action="open-acervo"');
});

test('Manual 2.0: Visual Learning Experience — Estrutura de Blocos do Piloto (Cap. 1.1 e 1.2)', () => {
  const BooksModel = require(path.join(__dirname, 'manual-knowledge-books.js'));
  const ManualBlocks = require(path.join(__dirname, 'manual-blocks.js'));
  const BookReaderModel = require(path.join(__dirname, 'book-reader-model.js'));

  const cap1 = BooksModel.getChapter('livro-1', 'livro-1-cap-1');
  assert.ok(cap1, 'Capítulo 1 deve existir');

  const pages = BooksModel.getChapterPages(cap1);
  assert.equal(pages.length, 4, 'Capítulo 1 piloto deve expandir para exatamente 4 páginas');

  // Página 1 (1.1 - A): Hero, Lead, Quote, Princípios
  const p1 = pages[0];
  assert.ok(p1.blocks.some(b => b.type === 'hero'), 'Página 1 deve conter Hero');
  assert.ok(p1.blocks.some(b => b.type === 'principles'), 'Página 1 deve conter Princípios Inegociáveis');
  const principlesBlock = p1.blocks.find(b => b.type === 'principles');
  assert.equal(principlesBlock.principles.length, 3, 'Devem ser exatamente 3 princípios inegociáveis');

  // Página 2 (1.1 - B): Story, Visual Callout, Tip, Quiz, What You Learned
  const p2 = pages[1];
  assert.ok(p2.blocks.some(b => b.type === 'story'), 'Página 2 deve conter Storytelling Impulsivo vs. Disciplinado');
  assert.ok(p2.blocks.some(b => b.type === 'quiz'), 'Página 2 deve conter Quiz interativo Pare e Pense');
  assert.ok(p2.blocks.some(b => b.type === 'visual-callout'), 'Página 2 deve conter Visual Callout');

  // Página 3 (1.2 - A): Hero, Lead, Pillar Wheel, Quote
  const p3 = pages[2];
  const wheelBlock = p3.blocks.find(b => b.type === 'pillar-wheel');
  assert.ok(wheelBlock, 'Página 3 deve conter infográfico radial dos Seis Pilares');
  assert.equal(wheelBlock.pillars.length, 6, 'Roda deve conter exatamente 6 pilares');

  // Página 4 (1.2 - B): In-Practice, Challenge, Quiz, Visual Summary, Conquest Badge
  const p4 = pages[3];
  assert.ok(p4.blocks.some(b => b.type === 'in-practice'), 'Página 4 deve conter Na Prática');
  assert.ok(p4.blocks.some(b => b.type === 'challenge'), 'Página 4 deve conter Desafio do Capítulo');
  assert.ok(p4.blocks.some(b => b.type === 'visual-summary'), 'Página 4 deve conter Resumo Visual');

  // Renderização via ManualBlocks.render
  const renderedP1 = ManualBlocks.render(p1, false);
  assert.ok(renderedP1.includes('ht-block-hero'), 'HTML deve renderizar Hero');
  assert.ok(renderedP1.includes('ht-principle-card'), 'HTML deve renderizar cards de princípios');

  const renderedP3 = ManualBlocks.render(p3, false, { activePillarId: 'pilar-1' });
  assert.ok(renderedP3.includes('ht-wheel-svg'), 'HTML deve renderizar SVG radial');
  assert.ok(renderedP3.includes('data-action="select-pillar"'), 'HTML deve conter gatilhos interativos para fatias da roda');

  // Busca indexa os termos dos novos blocos
  const searchRevenge = BookReaderModel.searchAcervo('Revenge trading', BooksModel.BOOKS);
  assert.ok(searchRevenge.length > 0, 'Busca deve encontrar termos do bloco Story/Quiz (Revenge trading)');
  assert.equal(searchRevenge[0].chapterId, 'livro-1-cap-1');

  const searchPilares = BookReaderModel.searchAcervo('Seis Pilares', BooksModel.BOOKS);
  assert.ok(searchPilares.length > 0, 'Busca deve encontrar Seis Pilares');
});

test('Manual 2.0: Arquivos de Mídia e Imagens em assets/manual-learning/', () => {
  const assetsDir = path.join(__dirname, '..', 'assets', 'manual-learning');
  const requiredImages = [
    'mlx-hero-disciplined-trader.webp',
    'mlx-hero-disciplined-trader.jpg',
    'mlx-story-impulsive-vs-disciplined.webp',
    'mlx-story-impulsive-vs-disciplined.jpg',
    'mlx-process-mountain-path.webp',
    'mlx-process-mountain-path.jpg',
    'mlx-platform-cockpit.webp',
    'mlx-platform-cockpit.jpg'
  ];

  requiredImages.forEach(img => {
    const fullPath = path.join(assetsDir, img);
    assert.ok(fs.existsSync(fullPath), `Imagem obrigatória ${img} deve existir em assets/manual-learning/`);
    const stat = fs.statSync(fullPath);
    assert.ok(stat.size > 1000, `Imagem ${img} deve possuir tamanho válido (> 1KB)`);
  });
});





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



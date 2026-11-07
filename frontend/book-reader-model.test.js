const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const BookReaderModel = require(path.join(__dirname, 'book-reader-model.js'));
const BooksModel = require(path.join(__dirname, 'manual-knowledge-books.js'));

test('BookReaderModel: flattenBookPages lineariza livro com Capa, Frontmatter, Páginas de Capítulos e Contracapa', () => {
  const book1 = BooksModel.BOOKS[0]; // Livro 1
  assert.ok(book1, 'Livro 1 deve existir');

  const flatPages = BookReaderModel.flattenBookPages(book1, BooksModel.getChapterPages);
  assert.ok(Array.isArray(flatPages), 'Deve retornar array de páginas');
  assert.ok(flatPages.length >= 10, 'Livro 1 deve ter ao menos 10 páginas linearizadas');

  // Página 0: Capa
  assert.equal(flatPages[0].kind, 'cover');
  assert.equal(flatPages[0].globalIndex, 0);
  assert.equal(flatPages[0].bookId, book1.id);

  // Página 1: Frontmatter (Sumário)
  assert.equal(flatPages[1].kind, 'frontmatter');
  assert.equal(flatPages[1].globalIndex, 1);
  assert.equal(flatPages[1].chaptersCount, book1.chapters.length);

  // Páginas internas: chapter-page
  const chapterPages = flatPages.filter(p => p.kind === 'chapter-page');
  assert.ok(chapterPages.length > 0, 'Deve conter páginas de capítulos');
  assert.equal(chapterPages[0].chapterNumber, 1);

  // Última página: Contracapa
  const lastPage = flatPages[flatPages.length - 1];
  assert.equal(lastPage.kind, 'backcover');
  assert.equal(lastPage.globalIndex, flatPages.length - 1);
});

test('BookReaderModel: findGlobalIndex localiza página por capítulo e pageIndex', () => {
  const book = BooksModel.BOOKS[0];
  const flatPages = BookReaderModel.flattenBookPages(book, BooksModel.getChapterPages);

  const firstCh = book.chapters[0];
  const gIdx = BookReaderModel.findGlobalIndex(flatPages, firstCh.id, 0);
  assert.equal(gIdx, 2, 'Primeira página do cap 1 deve estar no globalIndex 2 (após capa e sumário)');

  const secondCh = book.chapters[1];
  const gIdx2 = BookReaderModel.findGlobalIndex(flatPages, secondCh.id, 0);
  assert.ok(gIdx2 > gIdx, 'Capítulo 2 deve ter globalIndex posterior ao capítulo 1');
});

test('BookReaderModel: getSpread em modo Dual-Page (Desktop) e Single-Page (Mobile)', () => {
  const book = BooksModel.BOOKS[0];
  const flatPages = BookReaderModel.flattenBookPages(book, BooksModel.getChapterPages);

  // 1. Capa em Dual-Page (Lado direito de livro fechado)
  const spreadCover = BookReaderModel.getSpread(flatPages, 0, true);
  assert.equal(spreadCover.isDual, true);
  assert.equal(spreadCover.isCover, true);
  assert.equal(spreadCover.leftPage, null);
  assert.notEqual(spreadCover.rightPage, null);
  assert.equal(spreadCover.rightPage.kind, 'cover');

  // 2. Páginas internas em Dual-Page (esquerda par, direita ímpar)
  const spreadInside = BookReaderModel.getSpread(flatPages, 2, true);
  assert.equal(spreadInside.isDual, true);
  assert.equal(spreadInside.isCover, false);
  assert.notEqual(spreadInside.leftPage, null);
  assert.notEqual(spreadInside.rightPage, null);
  assert.equal(spreadInside.leftPage.globalIndex, 2);
  assert.equal(spreadInside.rightPage.globalIndex, 3);

  // 3. Contracapa em Dual-Page (Lado esquerdo de livro fechado)
  const lastIdx = flatPages.length - 1;
  const spreadBack = BookReaderModel.getSpread(flatPages, lastIdx, true);
  assert.equal(spreadBack.isDual, true);
  assert.equal(spreadBack.isBackCover, true);
  assert.notEqual(spreadBack.leftPage, null);
  assert.equal(spreadBack.leftPage.kind, 'backcover');
  assert.equal(spreadBack.rightPage, null);

  // 4. Modo Single-Page (Mobile)
  const spreadMobile = BookReaderModel.getSpread(flatPages, 3, false);
  assert.equal(spreadMobile.isDual, false);
  assert.equal(spreadMobile.centerPage.globalIndex, 3);
});

test('BookReaderModel: getNextIndex e getPrevIndex avançam e recuam corretamente', () => {
  const book = BooksModel.BOOKS[0];
  const flatPages = BookReaderModel.flattenBookPages(book, BooksModel.getChapterPages);

  // Dual Page
  const nextFromCover = BookReaderModel.getNextIndex(flatPages, 0, true);
  assert.equal(nextFromCover, 1, 'Da capa vai para a folha de rosto/sumário');

  const nextFromInside = BookReaderModel.getNextIndex(flatPages, 2, true);
  assert.equal(nextFromInside, 4, 'Do par 2-3 avança para 4');

  const prevFromInside = BookReaderModel.getPrevIndex(flatPages, 4, true);
  assert.equal(prevFromInside, 2, 'Do par 4-5 recua para 2');

  // Single Page
  assert.equal(BookReaderModel.getNextIndex(flatPages, 5, false), 6);
  assert.equal(BookReaderModel.getPrevIndex(flatPages, 5, false), 4);
});

test('BookReaderModel: searchAcervo encontra termos no texto com highlights e navegação', () => {
  const results = BookReaderModel.searchAcervo('stop', BooksModel.BOOKS, { limit: 10 });
  assert.ok(Array.isArray(results), 'Deve retornar array de resultados');
  assert.ok(results.length > 0, 'Deve encontrar ocorrências do termo stop nos livros');

  const first = results[0];
  assert.ok(first.bookId, 'Deve conter bookId');
  assert.ok(first.chapterId, 'Deve conter chapterId');
  assert.ok(typeof first.pageIndex === 'number', 'Deve conter pageIndex');
  assert.ok(first.title, 'Deve conter título');
  assert.ok(first.snippet, 'Deve conter snippet com contexto');
});

test('BookReaderModel: calculatePositionSize calcula dimensionamento didático com precisão', () => {
  // R$ 100.000 equity, 1% de risco (R$ 1.000), entrada R$ 20,00, stop R$ 18,00 (distância R$ 2,00)
  // Quantidade = 1.000 / 2 = 500 ações. Valor da posição = R$ 10.000 (10% alocação).
  const res = BookReaderModel.calculatePositionSize(100000, 1.0, 20.0, 18.0);
  assert.equal(res.valid, true);
  assert.equal(res.riskBudget, 1000);
  assert.equal(res.stopDistance, 2);
  assert.equal(res.stopPct, 10);
  assert.equal(res.quantity, 500);
  assert.equal(res.positionValue, 10000);
  assert.equal(res.allocationPct, 10);

  // Parâmetros inválidos (ex: stop acima da entrada)
  const invalidRes = BookReaderModel.calculatePositionSize(100000, 1.0, 20.0, 22.0);
  assert.equal(invalidRes.valid, false);
  assert.equal(invalidRes.quantity, 0);
});

test('BookReaderModel: calculateExpectancy calcula expectativa matemática e profit factor', () => {
  // 40% win rate com 2.5R médio de ganho e 1R de perda
  // Expectancy = (0.40 * 2.5) - (0.60 * 1.0) = 1.0 - 0.6 = +0.40R por trade
  const res = BookReaderModel.calculateExpectancy(40, 2.5, 1.0);
  assert.equal(res.winRate, 40);
  assert.equal(res.expectancyR, 0.40);
  assert.equal(res.isPositive, true);
  assert.ok(res.profitFactor > 1.5);
});

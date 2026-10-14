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

test('Manual do Software: Biblioteca Digital Interativa possui os 6 livros e capítulos estruturados', () => {
  const BooksModel = require(path.join(repoRoot, 'frontend', 'manual-knowledge-books.js'));
  assert.ok(BooksModel, 'manual-knowledge-books.js deve ser importável');
  assert.equal(BooksModel.BOOKS.length, 6, 'Deve conter exatamente os 6 livros oficiais');

  const totalChapters = BooksModel.getTotalChapters();
  assert.ok(totalChapters >= 40, `Deve conter ao menos 40 capítulos (atual: ${totalChapters})`);

  for (const book of BooksModel.BOOKS) {
    assert.ok(book.id && book.title && book.cover, `Livro ${book.title} deve ter id, título e capa`);
    assert.ok(book.chapters.length > 0, `Livro ${book.title} deve conter capítulos`);
    for (const ch of book.chapters) {
      assert.ok(ch.id && ch.title && ch.number, `Capítulo ${ch.title} do livro ${book.title} deve ter id, título e número`);
      assert.ok(Array.isArray(ch.sections) && ch.sections.length > 0, `Capítulo ${ch.title} deve possuir seções de conteúdo`);
    }
  }
});

test('Manual do Software: Arquitetura paginada decompõe capítulos em páginas editoriais independentes', () => {
  const BooksModel = require(path.join(repoRoot, 'frontend', 'manual-knowledge-books.js'));
  assert.equal(typeof BooksModel.getChapterPages, 'function', 'getChapterPages deve ser uma função');
  assert.equal(typeof BooksModel.getTotalPages, 'function', 'getTotalPages deve ser uma função');

  const totalPages = BooksModel.getTotalPages();
  assert.ok(totalPages >= 160, `Deve conter ao menos 160 páginas no acervo global (atual: ${totalPages})`);

  for (const book of BooksModel.BOOKS) {
    for (const ch of book.chapters) {
      const pages = BooksModel.getChapterPages(ch);
      assert.ok(Array.isArray(pages), `Capítulo ${ch.title} deve retornar array de páginas`);
      assert.ok(pages.length >= 2, `Capítulo ${ch.title} deve possuir ao menos 2 páginas independentes (atual: ${pages.length})`);
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        assert.equal(page.pageIndex, i, `Página deve possuir pageIndex ${i}`);
        assert.equal(page.number, i + 1, `Página deve possuir number ${i + 1}`);
        assert.ok(page.title, `Página ${i + 1} do capítulo ${ch.title} deve possuir título`);
        assert.ok(['intro', 'explanation', 'practice', 'content'].includes(page.type), `Tipo inválido de página: ${page.type}`);
      }
    }
  }

  // Verifica que o manual-knowledge.js isola a página ativa sem despejar o manual inteiro
  const mkCode = fs.readFileSync(path.join(repoRoot, 'frontend', 'manual-knowledge.js'), 'utf8');
  assert.ok(mkCode.includes('kc-page-surface'), 'Deve conter surface editorial para a página ativa');
  assert.ok(mkCode.includes('kc-page-stepper-bar'), 'Deve conter barra de stepper/navegação de páginas');
  assert.ok(mkCode.includes('kc-page-footer-nav'), 'Deve conter barra de navegação anterior/próxima página');
  assert.ok(mkCode.includes('nextPage'), 'Deve conter manipulador de próxima página');
  assert.ok(mkCode.includes('prevPage'), 'Deve conter manipulador de página anterior');
});


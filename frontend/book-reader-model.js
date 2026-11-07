/**
 * BookReaderModel — Modelo de Domínio para o Interactive Book Reader (Flipbook Premium)
 * Gerencia linearização de páginas do livro, spreads de 2 páginas / 1 página,
 * motor de busca textual no acervo, marcadores (bookmarks), progresso e calculadoras didáticas.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BookReaderModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var BookReaderModel = {};

  /**
   * Normaliza texto para busca (remove acentos, pontuação excessiva, minúsculas).
   */
  BookReaderModel.normalizeText = function (str) {
    if (!str) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  /**
   * Lineariza todas as páginas de um Livro em uma sequência contínua (Global Page Index):
   * - Página 0: Capa do Livro (Cover)
   * - Página 1: Folha de Rosto / Sumário do Livro (Frontmatter)
   * - Páginas 2..N: Páginas de cada capítulo do livro
   * - Página Final: Contracapa / Epílogo (Backcover)
   *
   * @param {Object} book - Objeto livro de ManualKnowledgeBooks.BOOKS
   * @param {Function} [getChapterPagesFn] - Função para extrair páginas do capítulo
   * @returns {Array<Object>} Lista de páginas sequenciais do livro
   */
  BookReaderModel.flattenBookPages = function (book, getChapterPagesFn) {
    if (!book) return [];
    var getPages = getChapterPagesFn;
    if (!getPages && typeof window !== 'undefined' && window.ManualKnowledgeBooks) {
      getPages = window.ManualKnowledgeBooks.getChapterPages;
    }
    if (!getPages) {
      getPages = function (ch) {
        if (!ch) return [];
        if (Array.isArray(ch.pages) && ch.pages.length > 0) return ch.pages;
        var secs = Array.isArray(ch.sections) ? ch.sections : [];
        if (secs.length <= 1) {
          return [
            { pageIndex: 0, number: 1, title: ch.title, type: 'intro', takeaways: ch.takeaways || [], sections: secs },
            { pageIndex: 1, number: 2, title: 'Prática & Síntese', type: 'practice', tip: ch.tip, toolRoute: ch.toolRoute, toolLabel: ch.toolLabel }
          ];
        }
        return secs.map(function (s, idx) {
          return {
            pageIndex: idx,
            number: idx + 1,
            title: s.title || ('Seção ' + (idx + 1)),
            type: idx === 0 ? 'intro' : (idx === secs.length - 1 ? 'practice' : 'explanation'),
            sections: [s],
            takeaways: idx === 0 ? (ch.takeaways || []) : [],
            tip: idx === secs.length - 1 ? ch.tip : null,
            toolRoute: idx === secs.length - 1 ? ch.toolRoute : null,
            toolLabel: idx === secs.length - 1 ? ch.toolLabel : null
          };
        });
      };
    }

    var pages = [];

    // 1. Capa Frontal (Cover)
    pages.push({
      globalIndex: 0,
      kind: 'cover',
      bookId: book.id,
      bookNumber: book.number,
      bookTitle: book.title,
      bookSubtitle: book.subtitle,
      bookCover: book.cover,
      bookDescription: book.description,
      title: 'Capa — ' + book.title
    });

    // 2. Folha de Rosto / Sumário Editorial do Livro (Frontmatter)
    pages.push({
      globalIndex: 1,
      kind: 'frontmatter',
      bookId: book.id,
      bookNumber: book.number,
      bookTitle: book.title,
      bookSubtitle: book.subtitle,
      bookDescription: book.description,
      chaptersCount: (book.chapters || []).length,
      chapters: (book.chapters || []).map(function (c) {
        return { id: c.id, number: c.number, title: c.title, subtitle: c.subtitle };
      }),
      title: 'Sumário Editorial — Livro ' + book.number
    });

    // 3. Páginas de cada capítulo
    var curIdx = 2;
    var chapters = Array.isArray(book.chapters) ? book.chapters : [];
    for (var c = 0; c < chapters.length; c++) {
      var ch = chapters[c];
      var chPages = getPages(ch);
      for (var p = 0; p < chPages.length; p++) {
        var pageObj = chPages[p];
        pages.push({
          globalIndex: curIdx,
          kind: 'chapter-page',
          bookId: book.id,
          bookNumber: book.number,
          bookTitle: book.title,
          chapterId: ch.id,
          chapterNumber: ch.number,
          chapterTitle: ch.title,
          chapterSubtitle: ch.subtitle,
          chapterCover: ch.cover || book.cover,
          chapterPageIndex: p,
          chapterPageCount: chPages.length,
          pageData: pageObj,
          title: pageObj.title || ch.title,
          type: pageObj.type || 'content',
          takeaways: pageObj.takeaways || [],
          sections: pageObj.sections || [],
          blocks: pageObj.blocks || [],
          tip: pageObj.tip || null,
          toolRoute: pageObj.toolRoute || null,
          toolLabel: pageObj.toolLabel || null,
          relatedLinks: pageObj.relatedLinks || []
        });
        curIdx++;
      }
    }

    // 4. Contracapa / Epílogo (Backcover)
    pages.push({
      globalIndex: curIdx,
      kind: 'backcover',
      bookId: book.id,
      bookNumber: book.number,
      bookTitle: book.title,
      bookSubtitle: book.subtitle,
      title: 'Contracapa — Livro ' + book.number
    });

    return pages;
  };

  /**
   * Encontra o índice global correspondente a um capítulo e página específica.
   */
  BookReaderModel.findGlobalIndex = function (flatPages, chapterId, chapterPageIndex) {
    if (!Array.isArray(flatPages) || flatPages.length === 0) return 0;
    if (!chapterId) return 0; // Capa
    var targetPIdx = typeof chapterPageIndex === 'number' ? chapterPageIndex : 0;

    for (var i = 0; i < flatPages.length; i++) {
      var p = flatPages[i];
      if (p.kind === 'chapter-page' && p.chapterId === chapterId && p.chapterPageIndex === targetPIdx) {
        return i;
      }
    }
    // Fallback: primeiro do capítulo
    for (var j = 0; j < flatPages.length; j++) {
      if (flatPages[j].kind === 'chapter-page' && flatPages[j].chapterId === chapterId) {
        return j;
      }
    }
    return 0;
  };

  /**
   * Calcula o par de páginas (Spread) para exibição:
   * - Em modo dual-page (desktop):
   *   - Se currentIndex === 0: Capa do livro (spread único fechado)
   *   - Se currentIndex é a última página: Contracapa (spread único fechado)
   *   - Páginas internas: esquerda = par, direita = ímpar.
   * - Em modo single-page (mobile):
   *   - Retorna apenas a página atual em `centerPage`.
   */
  BookReaderModel.getSpread = function (flatPages, currentIndex, isDualPage) {
    var total = Array.isArray(flatPages) ? flatPages.length : 0;
    if (total === 0) {
      return {
        isDual: false,
        isCover: false,
        isBackCover: false,
        leftPage: null,
        rightPage: null,
        centerPage: null,
        currentIndex: 0,
        totalPages: 0,
        progressPct: 0
      };
    }

    var validIdx = Math.max(0, Math.min(currentIndex || 0, total - 1));
    var progressPct = total > 1 ? Math.round((validIdx / (total - 1)) * 100) : 100;

    if (!isDualPage) {
      return {
        isDual: false,
        isCover: validIdx === 0,
        isBackCover: validIdx === total - 1,
        leftPage: null,
        rightPage: null,
        centerPage: flatPages[validIdx],
        currentIndex: validIdx,
        totalPages: total,
        progressPct: progressPct
      };
    }

    // Modo 2 páginas (Desktop)
    if (validIdx === 0) {
      return {
        isDual: true,
        isCover: true,
        isBackCover: false,
        leftPage: null,
        rightPage: flatPages[0], // Capa exibida no lado direito do livro fechado
        centerPage: null,
        currentIndex: 0,
        totalPages: total,
        progressPct: progressPct
      };
    }

    if (validIdx === total - 1) {
      return {
        isDual: true,
        isCover: false,
        isBackCover: true,
        leftPage: flatPages[total - 1], // Contracapa exibida no lado esquerdo do livro fechado
        rightPage: null,
        centerPage: null,
        currentIndex: total - 1,
        totalPages: total,
        progressPct: progressPct
      };
    }

    // Páginas internas: alinhar em pares (esquerda par / direita ímpar)
    var leftIdx = validIdx;
    var rightIdx = validIdx + 1;

    // Se o índice for ímpar, ele é o lado direito; o lado esquerdo é validIdx - 1
    if (validIdx % 2 !== 0) {
      leftIdx = validIdx - 1;
      rightIdx = validIdx;
    }

    return {
      isDual: true,
      isCover: false,
      isBackCover: false,
      leftPage: leftIdx >= 0 && leftIdx < total ? flatPages[leftIdx] : null,
      rightPage: rightIdx >= 0 && rightIdx < total ? flatPages[rightIdx] : null,
      centerPage: null,
      currentIndex: validIdx,
      leftIndex: leftIdx,
      rightIndex: rightIdx,
      totalPages: total,
      progressPct: progressPct
    };
  };

  /**
   * Calcula próximo e anterior índice conforme o modo de exibição (passo de 2 ou 1).
   */
  BookReaderModel.getNextIndex = function (flatPages, currentIndex, isDualPage) {
    var total = Array.isArray(flatPages) ? flatPages.length : 0;
    if (total === 0) return 0;
    if (!isDualPage) return Math.min(currentIndex + 1, total - 1);

    // Em modo dual:
    if (currentIndex === 0) return 1; // da capa vai para a primeira página interna
    var spread = BookReaderModel.getSpread(flatPages, currentIndex, true);
    var next = (spread.rightIndex || currentIndex) + 1;
    return Math.min(next, total - 1);
  };

  BookReaderModel.getPrevIndex = function (flatPages, currentIndex, isDualPage) {
    if (currentIndex <= 0) return 0;
    if (!isDualPage) return Math.max(0, currentIndex - 1);

    var spread = BookReaderModel.getSpread(flatPages, currentIndex, true);
    if (spread.isBackCover) {
      return Math.max(0, (flatPages.length - 1) % 2 === 0 ? flatPages.length - 2 : flatPages.length - 3);
    }
    var prev = (spread.leftIndex || currentIndex) - 2;
    if (prev <= 0) return 0;
    return prev;
  };

  /**
   * Motor de Busca Global em todo o acervo ou em um livro específico.
   * Varre títulos, subtítulos, takeaways, seções e dicas.
   *
   * @param {string} query - Termo pesquisado
   * @param {Array<Object>} books - Lista de livros (ManualKnowledgeBooks.BOOKS)
   * @param {Object} [options] - { bookId, limit }
   * @returns {Array<Object>} Resultados com highlights e dados de navegação
   */
  BookReaderModel.searchAcervo = function (query, books, options) {
    var q = BookReaderModel.normalizeText(query);
    if (!q || q.length < 2) return [];
    var list = Array.isArray(books) ? books : [];
    var opt = options || {};
    var results = [];
    var maxResults = opt.limit || 30;

    for (var b = 0; b < list.length; b++) {
      var book = list[b];
      if (opt.bookId && book.id !== opt.bookId) continue;

      var chs = book.chapters || [];
      for (var c = 0; c < chs.length; c++) {
        var ch = chs[c];
        var chPages = BookReaderModel.flattenBookPages(book).filter(function (p) {
          return p.kind === 'chapter-page' && p.chapterId === ch.id;
        });

        // 1. Match no título do capítulo
        var normChTitle = BookReaderModel.normalizeText(ch.title + ' ' + (ch.subtitle || ''));
        if (normChTitle.includes(q)) {
          results.push({
            type: 'chapter',
            bookId: book.id,
            bookNumber: book.number,
            bookTitle: book.title,
            chapterId: ch.id,
            chapterNumber: ch.number,
            chapterTitle: ch.title,
            pageIndex: 0,
            globalIndex: chPages[0] ? chPages[0].globalIndex : 2,
            badge: 'Livro ' + book.number + ' · Cap. ' + ch.number,
            title: ch.title,
            subtitle: ch.subtitle || book.title,
            snippet: 'Capítulo sobre ' + ch.title
          });
        }

        // 2. Match nas seções de cada página do capítulo
        for (var p = 0; p < chPages.length; p++) {
          var page = chPages[p];
          var secs = page.sections || [];
          for (var s = 0; s < secs.length; s++) {
            var sec = secs[s];
            var normSec = BookReaderModel.normalizeText((sec.title || '') + ' ' + (sec.content || ''));
            var matchIdx = normSec.indexOf(q);
            if (matchIdx >= 0) {
              var rawContent = String(sec.content || '').replace(/[#*_`]/g, '');
              var startPos = Math.max(0, matchIdx - 40);
              var endPos = Math.min(rawContent.length, matchIdx + q.length + 80);
              var snippet = (startPos > 0 ? '...' : '') + rawContent.substring(startPos, endPos).trim() + (endPos < rawContent.length ? '...' : '');

              results.push({
                type: 'section',
                bookId: book.id,
                bookNumber: book.number,
                bookTitle: book.title,
                chapterId: ch.id,
                chapterNumber: ch.number,
                chapterTitle: ch.title,
                pageIndex: page.chapterPageIndex,
                globalIndex: page.globalIndex,
                badge: 'Livro ' + book.number + ' · Pág. ' + (page.chapterPageIndex + 1),
                title: sec.title || page.title,
                subtitle: ch.title,
                snippet: snippet
              });

              if (results.length >= maxResults) return results;
            }
          }

          // 2.1 Match em Blocos Visuais e Interativos (Manual 2.0)
          if (Array.isArray(page.blocks) && page.blocks.length > 0) {
            var blocksExtractor = typeof window !== 'undefined' && window.ManualBlocksModel ? window.ManualBlocksModel.extractBlocksText : (typeof require !== 'undefined' ? (function () { try { return require('./manual-blocks-model.js').extractBlocksText; } catch (_) { return null; } })() : null);
            var blocksText = blocksExtractor ? blocksExtractor(page.blocks) : '';
            var normBlocks = BookReaderModel.normalizeText(blocksText);
            var bMatchIdx = normBlocks.indexOf(q);
            if (bMatchIdx >= 0) {
              var startB = Math.max(0, bMatchIdx - 40);
              var endB = Math.min(blocksText.length, bMatchIdx + q.length + 80);
              var bSnippet = (startB > 0 ? '...' : '') + blocksText.substring(startB, endB).trim() + (endB < blocksText.length ? '...' : '');

              if (!results.some(function (r) { return r.globalIndex === page.globalIndex && r.title === page.title; })) {
                results.push({
                  type: 'visual-block',
                  bookId: book.id,
                  bookNumber: book.number,
                  bookTitle: book.title,
                  chapterId: ch.id,
                  chapterNumber: ch.number,
                  chapterTitle: ch.title,
                  pageIndex: page.chapterPageIndex,
                  globalIndex: page.globalIndex,
                  badge: 'Livro ' + book.number + ' · Pág. ' + (page.chapterPageIndex + 1),
                  title: page.title,
                  subtitle: ch.title,
                  snippet: bSnippet
                });
                if (results.length >= maxResults) return results;
              }
            }
          }

          // 3. Match em Dicas e Takeaways
          if (page.tip && BookReaderModel.normalizeText(page.tip).includes(q)) {
            results.push({
              type: 'tip',
              bookId: book.id,
              bookNumber: book.number,
              bookTitle: book.title,
              chapterId: ch.id,
              chapterNumber: ch.number,
              chapterTitle: ch.title,
              pageIndex: page.chapterPageIndex,
              globalIndex: page.globalIndex,
              badge: '💡 Dica do Método',
              title: 'Dica em: ' + ch.title,
              subtitle: book.title,
              snippet: page.tip
            });
            if (results.length >= maxResults) return results;
          }
        }
      }
    }

    return results;
  };

  /**
   * Gestão de Marcadores (Bookmarks) persistentes no navegador.
   */
  BookReaderModel.createBookmark = function (bookId, chapterId, chapterPageIndex, pageTitle, snippet) {
    return {
      id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      bookId: bookId,
      chapterId: chapterId,
      chapterPageIndex: chapterPageIndex || 0,
      title: pageTitle || 'Página Marcada',
      snippet: snippet || '',
      createdAt: new Date().toISOString()
    };
  };

  /**
   * Mini-Calculadora Didática Integrada de Position Sizing (para uso dentro do manual).
   */
  BookReaderModel.calculatePositionSize = function (equity, riskPct, entryPrice, stopPrice) {
    var eq = Math.max(0, Number(equity) || 0);
    var rPct = Math.max(0, Number(riskPct) || 0);
    var entry = Math.max(0, Number(entryPrice) || 0);
    var stop = Math.max(0, Number(stopPrice) || 0);

    if (eq <= 0 || rPct <= 0 || entry <= 0 || stop <= 0 || entry <= stop) {
      return {
        valid: false,
        riskBudget: 0,
        stopDistance: 0,
        stopPct: 0,
        quantity: 0,
        positionValue: 0,
        allocationPct: 0
      };
    }

    var riskBudget = eq * (rPct / 100);
    var stopDistance = entry - stop;
    var stopPct = (stopDistance / entry) * 100;
    var rawQuantity = Math.floor(riskBudget / stopDistance);
    var quantity = Math.max(1, rawQuantity);
    var positionValue = quantity * entry;
    var allocationPct = (positionValue / eq) * 100;

    return {
      valid: true,
      riskBudget: Math.round(riskBudget * 100) / 100,
      stopDistance: Math.round(stopDistance * 100) / 100,
      stopPct: Math.round(stopPct * 10) / 10,
      quantity: quantity,
      positionValue: Math.round(positionValue * 100) / 100,
      allocationPct: Math.round(allocationPct * 10) / 10
    };
  };

  /**
   * Mini-Calculadora Didática de Payoff R:R e Expectancy (para uso no Livro 3 - O Método).
   */
  BookReaderModel.calculateExpectancy = function (winRatePct, avgWinR, avgLossR) {
    var wr = Math.max(0, Math.min(100, Number(winRatePct) || 0)) / 100;
    var lossRate = 1 - wr;
    var winR = Math.max(0, Number(avgWinR) || 0);
    var lossR = Math.max(0, Number(avgLossR) || 1); // normalmente -1R

    var expectancyR = (wr * winR) - (lossRate * lossR);
    var profitFactor = lossRate > 0 && lossR > 0 ? (wr * winR) / (lossRate * lossR) : 99;

    return {
      winRate: Math.round(wr * 100),
      lossRate: Math.round(lossRate * 100),
      winR: winR,
      lossR: lossR,
      expectancyR: Math.round(expectancyR * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      isPositive: expectancyR > 0
    };
  };

  return BookReaderModel;
}));

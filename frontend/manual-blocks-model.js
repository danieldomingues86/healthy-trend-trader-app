/**
 * ManualBlocksModel — Lógica de domínio e avaliação de aprendizagem para o Manual 2.0
 * Suporta navegador (window.ManualBlocksModel) e Node.js (CommonJS).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ManualBlocksModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ACHIEVEMENTS = [
    {
      id: 'first_chapter_completed',
      title: 'Primeiro Passo',
      subtitle: 'Concluiu o primeiro capítulo do manual.',
      icon: '🎯',
      points: 50
    },
    {
      id: 'first_quiz_completed',
      title: 'Mente Curiosa',
      subtitle: 'Respondeu e acertou seu primeiro quiz interativo.',
      icon: '💡',
      points: 75
    },
    {
      id: 'perfect_quiz_score',
      title: 'Gabarito de Mestre',
      subtitle: 'Acertou todos os quizzes do capítulo na primeira tentativa.',
      icon: '🏆',
      points: 150
    },
    {
      id: 'piloto_completo',
      title: 'Fundamentos de Ouro',
      subtitle: 'Completou a introdução e os Seis Pilares do Sistema.',
      icon: '👑',
      points: 200
    },
    {
      id: 'manual_scholar',
      title: 'Estudioso da Consistência',
      subtitle: 'Concluiu 5 ou mais capítulos no manual.',
      icon: '📚',
      points: 300
    }
  ];

  var ALLOWED_BLOCK_TYPES = [
    'hero',
    'lead',
    'quote',
    'definition',
    'callout',
    'principles',
    'story',
    'visual-callout',
    'pillar-wheel',
    'central-idea',
    'method-tip',
    'did-you-know',
    'common-error',
    'warning',
    'fundamental-rule',
    'quiz',
    'true-false',
    'reveal-cards',
    'flowchart',
    'comparison',
    'mindmap',
    'annotated-image',
    'in-practice',
    'software-tool',
    'challenge',
    'visual-summary',
    'what-you-learned',
    'conquest-badge',
    'markdown',
    'custom'
  ];

  /**
   * Avalia a resposta fornecida para um quiz.
   * @param {Object} quiz - Definição do bloco de quiz
   * @param {number} selectedOptionIndex - Índice da opção marcada
   * @returns {Object} Resultado com validação, feedback detalhado e pontuação
   */
  function evaluateQuiz(quiz, selectedOptionIndex) {
    if (!quiz || !Array.isArray(quiz.options)) {
      return {
        isValid: false,
        isCorrect: false,
        feedback: 'Quiz inválido ou sem alternativas.',
        points: 0
      };
    }

    var selectedIdx = parseInt(selectedOptionIndex, 10);
    if (isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx >= quiz.options.length) {
      return {
        isValid: false,
        isCorrect: false,
        feedback: 'Selecione uma alternativa válida antes de confirmar.',
        points: 0
      };
    }

    var correctIdx = typeof quiz.correctIndex === 'number' ? quiz.correctIndex : 0;
    var selectedOption = quiz.options[selectedIdx];
    var isOptionMarkedCorrect = selectedOption && typeof selectedOption === 'object' && selectedOption.isCorrect === true;
    var isCorrect = (selectedIdx === correctIdx) || isOptionMarkedCorrect || Boolean(quiz.acceptAllWithExplanation);

    var feedbackText = '';
    if (isCorrect) {
      feedbackText = (typeof selectedOption === 'object' && selectedOption.explanation) || quiz.feedbackCorrect || 'Correto! Excelente compreensão dos conceitos do método.';
    } else {
      feedbackText = (typeof selectedOption === 'object' && selectedOption.explanation) || quiz.feedbackIncorrect || 'Não foi desta vez. Revise o conceito e tente novamente.';
    }

    return {
      isValid: true,
      selectedOptionIndex: selectedIdx,
      correctIndex: correctIdx,
      isCorrect: isCorrect,
      feedback: feedbackText,
      points: isCorrect ? (quiz.points || 50) : 0
    };
  }

  /**
   * Extrai recursivamente todo o texto de uma lista de blocos para indexação na busca global.
   * @param {Array<Object>} blocks
   * @returns {string} Texto puro consolidado
   */
  function extractBlocksText(blocks) {
    if (!Array.isArray(blocks)) return '';
    var parts = [];

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (!b) continue;

      if (b.kicker) parts.push(b.kicker);
      if (b.titlePrefix) parts.push(b.titlePrefix);
      if (b.titleHighlight) parts.push(b.titleHighlight);
      if (b.title) parts.push(b.title);
      if (b.subtitle) parts.push(b.subtitle);
      if (b.lead) parts.push(b.lead);
      if (b.philosophyHeading) parts.push(b.philosophyHeading);
      if (b.philosophyText) parts.push(b.philosophyText);
      if (b.text) parts.push(b.text);
      if (b.content) parts.push(b.content);
      if (b.quote) parts.push(b.quote);
      if (b.tip) parts.push(b.tip);
      if (b.heading) parts.push(b.heading);
      if (b.description) parts.push(b.description);
      if (b.term) parts.push(b.term);
      if (b.consequence) parts.push(b.consequence);
      if (b.correction) parts.push(b.correction);

      // Listas e Steps
      if (Array.isArray(b.items)) {
        for (var j = 0; j < b.items.length; j++) {
          var it = b.items[j];
          if (typeof it === 'string') parts.push(it);
          else if (it && typeof it === 'object') {
            if (it.title) parts.push(it.title);
            if (it.text) parts.push(it.text);
            if (it.desc) parts.push(it.desc);
            if (it.label) parts.push(it.label);
          }
        }
      }

      if (Array.isArray(b.steps)) {
        for (var s = 0; s < b.steps.length; s++) {
          var st = b.steps[s];
          if (typeof st === 'string') parts.push(st);
          else if (st && typeof st === 'object') {
            if (st.title) parts.push(st.title);
            if (st.description) parts.push(st.description);
            if (st.text) parts.push(st.text);
          }
        }
      }

      if (Array.isArray(b.cards)) {
        for (var c = 0; c < b.cards.length; c++) {
          var cd = b.cards[c];
          if (cd && typeof cd === 'object') {
            if (cd.front) parts.push(cd.front);
            if (cd.back) parts.push(cd.back);
            if (cd.title) parts.push(cd.title);
            if (cd.text) parts.push(cd.text);
          }
        }
      }

      // Princípios
      if (Array.isArray(b.principles)) {
        for (var p = 0; p < b.principles.length; p++) {
          var pr = b.principles[p];
          if (pr.name) parts.push(pr.name);
          if (pr.description) parts.push(pr.description);
        }
      }

      // Pilares
      if (Array.isArray(b.pillars)) {
        for (var pl = 0; pl < b.pillars.length; pl++) {
          var pil = b.pillars[pl];
          if (pil.name) parts.push(pil.name);
          if (pil.subtitle) parts.push(pil.subtitle);
          if (pil.description) parts.push(pil.description);
          if (Array.isArray(pil.modules)) parts.push(pil.modules.join(', '));
        }
      }

      // Quiz
      if (b.question) parts.push(b.question);
      if (Array.isArray(b.options)) {
        for (var o = 0; o < b.options.length; o++) {
          var opt = b.options[o];
          if (typeof opt === 'string') parts.push(opt);
          else if (opt && typeof opt === 'object') {
            if (opt.text) parts.push(opt.text);
            if (opt.explanation) parts.push(opt.explanation);
          }
        }
      }

      // Story / Comparison
      if (b.left && b.left.title) parts.push(b.left.title + ' ' + (b.left.text || '') + ' ' + (Array.isArray(b.left.points) ? b.left.points.join(' ') : ''));
      if (b.right && b.right.title) parts.push(b.right.title + ' ' + (b.right.text || '') + ' ' + (Array.isArray(b.right.points) ? b.right.points.join(' ') : ''));
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Computa conquistas educacionais do manual com base no estado de progresso.
   * @param {Object} progress - appState.progress ({ completed, completedPages, quizzes })
   * @returns {Array<Object>} Lista de conquistas com status (unlocked, unlockedAt)
   */
  function computeAchievements(progress) {
    var prog = progress || {};
    var completed = Array.isArray(prog.completed) ? prog.completed : [];
    var quizzes = prog.quizzes || {};

    var correctQuizzesCount = 0;
    var perfectQuizzesCount = 0;
    var totalQuizzesAttempted = 0;

    Object.keys(quizzes).forEach(function (qId) {
      var q = quizzes[qId];
      if (q && q.isCorrect) {
        correctQuizzesCount++;
        if (q.attempts === 1) perfectQuizzesCount++;
      }
      if (q && q.attempts > 0) totalQuizzesAttempted++;
    });

    return ACHIEVEMENTS.map(function (ach) {
      var isUnlocked = false;

      if (ach.id === 'first_chapter_completed') {
        isUnlocked = completed.length >= 1;
      } else if (ach.id === 'first_quiz_completed') {
        isUnlocked = correctQuizzesCount >= 1;
      } else if (ach.id === 'perfect_quiz_score') {
        isUnlocked = perfectQuizzesCount >= 2;
      } else if (ach.id === 'piloto_completo') {
        isUnlocked = completed.includes('livro-1-cap-1') && correctQuizzesCount >= 2;
      } else if (ach.id === 'manual_scholar') {
        isUnlocked = completed.length >= 5;
      }

      return {
        id: ach.id,
        title: ach.title,
        subtitle: ach.subtitle,
        icon: ach.icon,
        points: ach.points,
        unlocked: isUnlocked
      };
    });
  }

  /**
   * Valida se uma estrutura de bloco está em conformidade com o catálogo do Manual 2.0.
   */
  function validateBlock(block) {
    if (!block || typeof block !== 'object') {
      return { valid: false, error: 'Bloco nulo ou não é um objeto.' };
    }
    if (!block.type || typeof block.type !== 'string') {
      return { valid: false, error: 'Bloco sem tipo (type) definido.' };
    }
    if (ALLOWED_BLOCK_TYPES.indexOf(block.type) === -1) {
      return { valid: false, error: 'Tipo de bloco desconhecido: ' + block.type };
    }
    return { valid: true, error: null };
  }

  return {
    ACHIEVEMENTS: ACHIEVEMENTS,
    ALLOWED_BLOCK_TYPES: ALLOWED_BLOCK_TYPES,
    evaluateQuiz: evaluateQuiz,
    extractBlocksText: extractBlocksText,
    computeAchievements: computeAchievements,
    validateBlock: validateBlock
  };
}));

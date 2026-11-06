/**
 * ManualBlocks — Biblioteca de componentes visuais, didáticos e interativos para o Manual 2.0
 * Renderiza blocos modulares no Flipbook com suporte completo a temas, acessibilidade e responsividade.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ManualBlocks = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPicture(baseName, alt, extraClass) {
    var webpPath = 'assets/manual-learning/' + baseName + '.webp';
    var jpgPath = 'assets/manual-learning/' + baseName + '.jpg';
    var cls = extraClass ? ' ' + extraClass : '';
    return [
      '<picture class="ht-block-picture' + cls + '">',
      '  <source srcset="' + webpPath + '" type="image/webp">',
      '  <img src="' + jpgPath + '" alt="' + esc(alt) + '" loading="lazy" class="ht-block-img" onerror="this.onerror=null;this.classList.add(\'is-fallback\');">',
      '</picture>'
    ].join('\n');
  }

  // Helper para cálculo trigonométrico de fatias radiais do SVG
  function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  }

  function describeArc(x, y, innerRadius, outerRadius, startAngle, endAngle) {
    var startOuter = polarToCartesian(x, y, outerRadius, endAngle);
    var endOuter = polarToCartesian(x, y, outerRadius, startAngle);
    var startInner = polarToCartesian(x, y, innerRadius, endAngle);
    var endInner = polarToCartesian(x, y, innerRadius, startAngle);

    var largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', startInner.x, startInner.y,
      'L', startOuter.x, startOuter.y,
      'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
      'L', endInner.x, endInner.y,
      'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
      'Z'
    ].join(' ');
  }

  var blockRenderers = {
    // 1. HERO BLOCK: Abertura editorial com imagem 3D, kicker e chamada
    'hero': function (block) {
      return [
        '<div class="ht-block ht-block-hero">',
        '  <div class="ht-hero-header">',
        block.kicker ? '    <span class="ht-hero-kicker">' + esc(block.kicker) + '</span>' : '',
        '    <h1 class="ht-hero-title">' + esc(block.title) + '</h1>',
        block.subtitle ? '    <p class="ht-hero-subtitle">' + esc(block.subtitle) + '</p>' : '',
        '  </div>',
        block.image ? '  <div class="ht-hero-media">' + renderPicture(block.image, block.title, 'ht-hero-pic') + '</div>' : '',
        '</div>'
      ].join('\n');
    },

    // 2. LEAD BLOCK: Parágrafo de destaque conceitual
    'lead': function (block) {
      return [
        '<div class="ht-block ht-block-lead">',
        '  <p class="ht-lead-text">' + esc(block.text) + '</p>',
        '</div>'
      ].join('\n');
    },

    // 3. QUOTE BLOCK: Citação editorial com ênfase
    'quote': function (block) {
      return [
        '<div class="ht-block ht-block-quote">',
        '  <div class="ht-quote-mark" aria-hidden="true">“</div>',
        '  <blockquote class="ht-quote-content">',
        '    <p>' + esc(block.quote) + '</p>',
        block.author ? '    <cite>— ' + esc(block.author) + '</cite>' : '',
        '  </blockquote>',
        '</div>'
      ].join('\n');
    },

    // 4. PRINCIPLES BLOCK: Cards dos 3 Princípios Inegociáveis
    'principles': function (block) {
      var items = Array.isArray(block.principles) ? block.principles : [];
      var html = [
        '<div class="ht-block ht-block-principles">',
        block.heading ? '  <div class="ht-principles-header"><h3 class="ht-block-heading">' + esc(block.heading) + '</h3>' + (block.description ? '<p class="ht-block-sub">' + esc(block.description) + '</p>' : '') + '</div>' : '',
        '  <div class="ht-principles-grid">'
      ];

      items.forEach(function (p, idx) {
        html.push([
          '    <div class="ht-principle-card">',
          '      <div class="ht-principle-icon-wrap" style="color:' + (p.color || 'var(--ht-book-accent)') + ';">',
          '        <span class="ht-principle-badge">' + (idx + 1) + '</span>',
          '        <span class="ht-principle-ico">' + (p.icon || '🛡️') + '</span>',
          '      </div>',
          '      <div class="ht-principle-body">',
          '        <h4 class="ht-principle-name">' + esc(p.name) + '</h4>',
          '        <p class="ht-principle-desc">' + esc(p.description) + '</p>',
          '      </div>',
          '    </div>'
        ].join('\n'));
      });

      html.push('  </div>');
      html.push('</div>');
      return html.join('\n');
    },

    // 5. STORY BLOCK: Storytelling Impulsivo vs. Disciplinado
    'story': function (block) {
      var left = block.left || {};
      var right = block.right || {};

      return [
        '<div class="ht-block ht-block-story">',
        block.heading ? '  <div class="ht-story-header"><h3 class="ht-block-heading">' + esc(block.heading) + '</h3>' + (block.subtitle ? '<p class="ht-block-sub">' + esc(block.subtitle) + '</p>' : '') + '</div>' : '',
        block.image ? '  <div class="ht-story-media">' + renderPicture(block.image, block.heading || 'História', 'ht-story-pic') + '</div>' : '',
        '  <div class="ht-story-comparison-grid">',
        '    <div class="ht-story-side impulsive">',
        '      <div class="ht-story-badge">⚠️ ' + esc(left.title || 'O Trader Impulsivo') + '</div>',
        '      <ul class="ht-story-list">',
        (Array.isArray(left.points) ? left.points.map(function (pt) { return '<li><span class="ht-story-bullet">✕</span> ' + esc(pt) + '</li>'; }).join('\n') : ''),
        '      </ul>',
        left.outcome ? '      <div class="ht-story-outcome"><strong>Resultado:</strong> ' + esc(left.outcome) + '</div>' : '',
        '    </div>',
        '    <div class="ht-story-side disciplined">',
        '      <div class="ht-story-badge">🛡️ ' + esc(right.title || 'O Trader Disciplinado') + '</div>',
        '      <ul class="ht-story-list">',
        (Array.isArray(right.points) ? right.points.map(function (pt) { return '<li><span class="ht-story-bullet">✓</span> ' + esc(pt) + '</li>'; }).join('\n') : ''),
        '      </ul>',
        right.outcome ? '      <div class="ht-story-outcome"><strong>Resultado:</strong> ' + esc(right.outcome) + '</div>' : '',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 6. VISUAL CALLOUT BLOCK: Imagem de jornada / montanha com frase de impacto
    'visual-callout': function (block) {
      return [
        '<div class="ht-block ht-block-visual-callout">',
        block.image ? '  <div class="ht-vc-media">' + renderPicture(block.image, block.quote || 'Visual Callout', 'ht-vc-pic') + '</div>' : '',
        '  <div class="ht-vc-overlay">',
        block.quote ? '    <p class="ht-vc-quote">“' + esc(block.quote) + '”</p>' : '',
        block.author ? '    <span class="ht-vc-author">— ' + esc(block.author) + '</span>' : '',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 7. PILLAR WHEEL BLOCK: Infográfico Radial Interativo dos 6 Pilares
    'pillar-wheel': function (block, ctx) {
      var pillars = Array.isArray(block.pillars) ? block.pillars : [];
      var activePillarId = (ctx && ctx.activePillarId) || (pillars[0] ? pillars[0].id : 'pilar-1');
      var activePillar = pillars.find(function (p) { return p.id === activePillarId; }) || pillars[0] || {};

      var total = pillars.length || 6;
      var cx = 150;
      var cy = 150;
      var innerR = 64;
      var outerR = 138;
      var step = 360 / total;

      var slicesSvg = pillars.map(function (p, idx) {
        var startA = idx * step - 90;
        var endA = (idx + 1) * step - 90;
        var pathData = describeArc(cx, cy, innerR, outerR, startA, endA);
        var midA = startA + (step / 2);
        var iconPos = polarToCartesian(cx, cy, (innerR + outerR) / 2, midA);
        var isActive = p.id === activePillarId;

        return [
          '<g class="ht-wheel-slice-group ' + (isActive ? 'is-active' : '') + '" data-action="select-pillar" data-pillar-id="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.name) + '">',
          '  <path d="' + pathData + '" fill="' + (p.color || '#16a879') + '" class="ht-wheel-slice" />',
          '  <circle cx="' + iconPos.x + '" cy="' + iconPos.y + '" r="14" fill="rgba(0,0,0,0.25)" class="ht-wheel-icon-bg" />',
          '  <text x="' + iconPos.x + '" y="' + (iconPos.y + 4) + '" text-anchor="middle" font-size="12" fill="#FFFFFF" class="ht-wheel-slice-num">' + (idx + 1) + '</text>',
          '</g>'
        ].join('\n');
      }).join('\n');

      return [
        '<div class="ht-block ht-block-pillar-wheel" id="htPillarWheelBlock">',
        '  <div class="ht-wheel-container">',
        '    <div class="ht-wheel-graphic-wrap">',
        '      <svg viewBox="0 0 300 300" class="ht-wheel-svg" role="img" aria-label="Infográfico dos 6 Pilares do Sistema">',
        '        <defs>',
        '          <filter id="htWheelShadow" x="-20%" y="-20%" width="140%" height="140%">',
        '            <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25" />',
        '          </filter>',
        '        </defs>',
        '        <g filter="url(#htWheelShadow)">',
        slicesSvg,
        '        </g>',
        '        <!-- HUB CENTRAL -->',
        '        <circle cx="' + cx + '" cy="' + cy + '" r="' + (innerR - 6) + '" fill="var(--ht-book-paper, #ffffff)" stroke="var(--ht-book-paper-border, #e4dcbe)" stroke-width="2" class="ht-wheel-hub" />',
        '        <text x="' + cx + '" y="' + (cy - 12) + '" text-anchor="middle" font-size="18" class="ht-wheel-hub-icon">📈</text>',
        '        <text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-size="10" font-weight="800" fill="var(--ht-book-ink, #14251e)" class="ht-wheel-hub-label">HEALTHY</text>',
        '        <text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="8" font-weight="700" fill="var(--ht-book-accent, #16a879)" class="ht-wheel-hub-sub">6 PILARES</text>',
        '      </svg>',
        '    </div>',
        '    <!-- DETALHE INTERATIVO DO PILAR SELECIONADO -->',
        '    <div class="ht-wheel-details" id="htWheelDetails">',
        '      <div class="ht-wheel-detail-card" style="border-left-color:' + (activePillar.color || 'var(--ht-book-accent)') + ';">',
        '        <div class="ht-detail-head">',
        '          <span class="ht-detail-num" style="background:' + (activePillar.color || 'var(--ht-book-accent)') + ';">' + (activePillar.number || '1') + '</span>',
        '          <div>',
        '            <h4 class="ht-detail-title">' + esc(activePillar.name) + '</h4>',
        '            <span class="ht-detail-sub">' + esc(activePillar.subtitle || 'Pilar Fundamental') + '</span>',
        '          </div>',
        '        </div>',
        '        <p class="ht-detail-desc">' + esc(activePillar.description) + '</p>',
        Array.isArray(activePillar.modules) ? [
          '        <div class="ht-detail-modules">',
          '          <span class="ht-detail-modules-label">Módulos no Software:</span>',
          '          <div class="ht-detail-chips">',
          activePillar.modules.map(function (m) {
            return '<span class="ht-detail-chip">' + esc(m) + '</span>';
          }).join(''),
          '          </div>',
          '        </div>'
        ].join('\n') : '',
        activePillar.route ? [
          '        <button type="button" class="ht-detail-action-btn" data-action="launch-route" data-route="' + activePillar.route + '">',
          '          Explorar ' + esc(activePillar.name) + ' →',
          '        </button>'
        ].join('\n') : '',
        '      </div>',
        '    </div>',
        '  </div>',
        '  <!-- LISTA SELETORA DE PILARES PARA ACESSIBILIDADE E CLIQUE DIRETO -->',
        '  <div class="ht-wheel-nav-row" role="tablist">',
        pillars.map(function (p) {
          var isSel = p.id === activePillarId;
          return [
            '<button type="button" class="ht-wheel-nav-pill ' + (isSel ? 'is-active' : '') + '" data-action="select-pillar" data-pillar-id="' + p.id + '" role="tab" aria-selected="' + (isSel ? 'true' : 'false') + '">',
            '  <span class="ht-pill-bullet" style="background:' + (p.color || '#16a879') + ';">' + (p.number || '') + '</span>',
            '  <span class="ht-pill-text">' + esc(p.name) + '</span>',
            '</button>'
          ].join('');
        }).join('\n'),
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 8. METHOD TIP BLOCK: Dica de ouro do método
    'method-tip': function (block) {
      return [
        '<div class="ht-block ht-block-tip">',
        '  <div class="ht-tip-icon" aria-hidden="true">💡</div>',
        '  <div class="ht-tip-body">',
        '    <h4 class="ht-tip-title">' + esc(block.title || 'Dica do Método') + '</h4>',
        '    <p class="ht-tip-text">' + esc(block.tip || block.text) + '</p>',
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 9. QUIZ BLOCK: Teste de Fixação "Pare e Pense" com feedback imediato
    'quiz': function (block, ctx) {
      var quizId = block.id || 'quiz-default';
      var savedQuiz = (ctx && ctx.quizzes && ctx.quizzes[quizId]) || null;
      var hasAnswered = savedQuiz && savedQuiz.hasAnswered;
      var isCorrect = savedQuiz && savedQuiz.isCorrect;
      var selectedIdx = savedQuiz ? savedQuiz.selectedOptionIndex : null;

      var options = Array.isArray(block.options) ? block.options : [];

      return [
        '<div class="ht-block ht-block-quiz ' + (hasAnswered ? (isCorrect ? 'is-correct' : 'is-incorrect') : '') + '" id="' + quizId + '" data-quiz-id="' + quizId + '">',
        '  <div class="ht-quiz-header">',
        '    <div class="ht-quiz-badge">',
        '      <span class="ht-quiz-ico">❓</span>',
        '      <span class="ht-quiz-badge-text">' + esc(block.badge || 'Pare e Pense · Teste seus conhecimentos') + '</span>',
        '    </div>',
        '    <h3 class="ht-quiz-question">' + esc(block.question) + '</h3>',
        '  </div>',
        '  <div class="ht-quiz-options" role="radiogroup" aria-label="' + esc(block.question) + '">',
        options.map(function (opt, idx) {
          var optText = typeof opt === 'string' ? opt : opt.text;
          var isChecked = selectedIdx === idx;
          var optClass = isChecked ? 'is-selected' : '';
          return [
            '    <label class="ht-quiz-option ' + optClass + '" data-action="quiz-select" data-quiz-id="' + quizId + '" data-opt-idx="' + idx + '">',
            '      <input type="radio" name="' + quizId + '" value="' + idx + '" data-action="quiz-select" data-quiz-id="' + quizId + '" data-opt-idx="' + idx + '" ' + (isChecked ? 'checked' : '') + ' ' + (hasAnswered && isCorrect ? 'disabled' : '') + ' />',
            '      <span class="ht-quiz-radio-custom" aria-hidden="true"></span>',
            '      <span class="ht-quiz-option-text">' + esc(optText) + '</span>',
            '    </label>'
          ].join('\n');
        }).join('\n'),
        '  </div>',
        '  <div class="ht-quiz-actions">',
        !hasAnswered || !isCorrect ? [
          '    <button type="button" class="ht-quiz-submit-btn" data-action="quiz-submit" data-quiz-id="' + quizId + '">',
          '      ' + (hasAnswered && !isCorrect ? 'Tentar Novamente' : 'Verificar Resposta →'),
          '    </button>'
        ].join('\n') : '',
        '  </div>',
        hasAnswered ? [
          '  <div class="ht-quiz-feedback ' + (isCorrect ? 'correct' : 'incorrect') + '" role="alert">',
          '    <div class="ht-feedback-head">',
          '      <span class="ht-feedback-ico">' + (isCorrect ? '✅' : '❌') + '</span>',
          '      <strong class="ht-feedback-title">' + (isCorrect ? 'Excelente! Resposta correta.' : 'Ops! Resposta incorreta.') + '</strong>',
          '    </div>',
          '    <p class="ht-feedback-text">' + esc(savedQuiz.feedback) + '</p>',
          '  </div>'
        ].join('\n') : '',
        '</div>'
      ].join('\n');
    },

    // 10. IN-PRACTICE BLOCK: Conexão com o software real + Screenshot
    'in-practice': function (block) {
      return [
        '<div class="ht-block ht-block-in-practice">',
        '  <div class="ht-practice-header">',
        '    <span class="ht-practice-badge">💻 NA PRÁTICA</span>',
        '    <h3 class="ht-practice-title">' + esc(block.title || 'Veja no software real') + '</h3>',
        block.description ? '    <p class="ht-practice-desc">' + esc(block.description) + '</p>' : '',
        '  </div>',
        block.image ? '  <div class="ht-practice-media">' + renderPicture(block.image, block.title, 'ht-practice-pic') + '</div>' : '',
        block.route ? [
          '  <div class="ht-practice-action">',
          '    <button type="button" class="ht-practice-btn" data-action="launch-route" data-route="' + block.route + '">',
          '      ' + esc(block.buttonLabel || 'Abrir na Plataforma →'),
          '    </button>',
          '  </div>'
        ].join('\n') : '',
        '</div>'
      ].join('\n');
    },

    // 11. CHALLENGE BLOCK: Desafio prático do capítulo
    'challenge': function (block) {
      var steps = Array.isArray(block.steps) ? block.steps : [];
      return [
        '<div class="ht-block ht-block-challenge">',
        '  <div class="ht-challenge-head">',
        '    <span class="ht-challenge-icon">🎯</span>',
        '    <div>',
        '      <h4 class="ht-challenge-title">' + esc(block.title || 'Desafio do Capítulo') + '</h4>',
        '      <span class="ht-challenge-sub">' + esc(block.subtitle || 'Atividade Prática') + '</span>',
        '    </div>',
        '  </div>',
        block.text ? '  <p class="ht-challenge-intro">' + esc(block.text) + '</p>' : '',
        '  <ol class="ht-challenge-steps">',
        steps.map(function (st) {
          return '    <li>' + esc(st) + '</li>';
        }).join('\n'),
        '  </ol>',
        '</div>'
      ].join('\n');
    },

    // 12. VISUAL SUMMARY BLOCK: Síntese gráfica dos aprendizados
    'visual-summary': function (block) {
      var items = Array.isArray(block.items) ? block.items : [];
      return [
        '<div class="ht-block ht-block-visual-summary">',
        '  <div class="ht-summary-header">',
        '    <span class="ht-summary-ico">📊</span>',
        '    <h4 class="ht-summary-title">' + esc(block.title || 'Resumo Visual dos Fundamentos') + '</h4>',
        '  </div>',
        '  <div class="ht-summary-cards">',
        items.map(function (it) {
          return [
            '    <div class="ht-summary-card">',
            '      <span class="ht-summary-card-ico">' + (it.icon || '📌') + '</span>',
            '      <h5 class="ht-summary-card-title">' + esc(it.title) + '</h5>',
            '      <p class="ht-summary-card-text">' + esc(it.text) + '</p>',
            '    </div>'
          ].join('\n');
        }).join('\n'),
        '  </div>',
        '</div>'
      ].join('\n');
    },

    // 13. WHAT YOU LEARNED: Checklist de objetivos atingidos
    'what-you-learned': function (block) {
      var items = Array.isArray(block.items) ? block.items : [];
      return [
        '<div class="ht-block ht-block-what-you-learned">',
        '  <h4 class="ht-learned-title">✨ ' + esc(block.title || 'O que você aprendeu:') + '</h4>',
        '  <ul class="ht-learned-list">',
        items.map(function (it) {
          return '    <li><span class="ht-learned-check">✓</span> ' + esc(it) + '</li>';
        }).join('\n'),
        '  </ul>',
        '</div>'
      ].join('\n');
    },

    // 14. CONQUEST BADGE: Gamificação e reconhecimento
    'conquest-badge': function (block, ctx) {
      var isUnlocked = ctx && ctx.achievements && ctx.achievements.some(function (a) {
        return a.id === block.achievementId && a.unlocked;
      });
      return [
        '<div class="ht-block ht-block-conquest-badge ' + (isUnlocked ? 'is-unlocked' : 'is-locked') + '">',
        '  <div class="ht-conquest-icon-wrap">',
        '    <span class="ht-conquest-icon">' + (block.icon || '🏆') + '</span>',
        '  </div>',
        '  <div class="ht-conquest-content">',
        '    <span class="ht-conquest-label">' + (isUnlocked ? 'CONQUISTA DESBLOQUEADA' : 'MARCO DE APRENDIZAGEM') + '</span>',
        '    <h4 class="ht-conquest-title">' + esc(block.title) + '</h4>',
        '    <p class="ht-conquest-sub">' + esc(block.description) + '</p>',
        '  </div>',
        '</div>'
      ].join('\n');
    }
  };

  /**
   * Renderiza uma página completa de blocos do Manual 2.0.
   * @param {Object} page - Estrutura da página (com blocks: [...])
   * @param {boolean} isRightPage - Se é página ímpar/direita
   * @param {Object} context - { activePillarId, quizzes, achievements, ... }
   */
  function render(page, isRightPage, context) {
    if (!page) return '';
    var blocks = Array.isArray(page.blocks) ? page.blocks : [];
    var ctx = context || {};

    var renderedBlocks = blocks.map(function (b) {
      var renderer = blockRenderers[b.type];
      if (typeof renderer === 'function') {
        return renderer(b, ctx);
      }
      return '';
    }).filter(Boolean).join('\n');

    return [
      '<div class="ht-visual-learning-page ' + (page.layoutClass || '') + '">',
      renderedBlocks,
      '</div>'
    ].join('\n');
  }

  return {
    render: render,
    renderPicture: renderPicture,
    blockRenderers: blockRenderers
  };
}));

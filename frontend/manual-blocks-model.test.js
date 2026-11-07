const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ManualBlocksModel = require('./manual-blocks-model.js');

test('ManualBlocksModel: validateBlock valida catálogo de blocos permitidos', () => {
  assert.equal(ManualBlocksModel.validateBlock(null).valid, false);
  assert.equal(ManualBlocksModel.validateBlock({}).valid, false);
  assert.equal(ManualBlocksModel.validateBlock({ type: 'unknown_xyz' }).valid, false);

  const validTypes = ['hero', 'lead', 'quote', 'principles', 'story', 'visual-callout', 'pillar-wheel', 'method-tip', 'quiz', 'in-practice', 'challenge', 'visual-summary', 'what-you-learned', 'conquest-badge'];
  validTypes.forEach(t => {
    const res = ManualBlocksModel.validateBlock({ type: t });
    assert.equal(res.valid, true, `Tipo ${t} deve ser válido`);
  });
});

test('ManualBlocksModel: evaluateQuiz avalia respostas com feedback contextual e pontuação', () => {
  const sampleQuiz = {
    id: 'quiz-piloto-1',
    question: 'Qual o erro comportamental mais danoso ao capital?',
    correctIndex: 0,
    points: 60,
    options: [
      { text: 'Aumentar a mão após perda (Revenge trading)', explanation: 'Exato! Desrespeito ao risco nominal leva à ruína.' },
      { text: 'Esperar confluência do mercado em paciência', explanation: 'Incorreto. Ter paciência é virtude do método.' }
    ]
  };

  // Resposta correta
  const resCorreto = ManualBlocksModel.evaluateQuiz(sampleQuiz, 0);
  assert.equal(resCorreto.isValid, true);
  assert.equal(resCorreto.isCorrect, true);
  assert.equal(resCorreto.points, 60);
  assert.ok(resCorreto.feedback.includes('Exato'));

  // Resposta incorreta
  const resIncorreto = ManualBlocksModel.evaluateQuiz(sampleQuiz, 1);
  assert.equal(resIncorreto.isValid, true);
  assert.equal(resIncorreto.isCorrect, false);
  assert.equal(resIncorreto.points, 0);
  assert.ok(resIncorreto.feedback.includes('Incorreto'));

  // Entrada inválida
  const resInvalido = ManualBlocksModel.evaluateQuiz(sampleQuiz, 99);
  assert.equal(resInvalido.isValid, false);
  assert.equal(resInvalido.isCorrect, false);
});

test('ManualBlocksModel: extractBlocksText reúne conteúdo textual completo para busca', () => {
  const blocks = [
    { type: 'hero', title: 'O que é o Healthy Trend Trader', lead: 'Ambiente de governança e disciplina' },
    { type: 'principles', principles: [{ name: 'Proteção do Capital', description: 'Stop técnico inegociável' }] },
    { type: 'pillar-wheel', pillars: [{ name: 'Operação Diária', description: 'Visão Geral e Cockpit', modules: ['today', 'newtrade'] }] },
    { type: 'quiz', question: 'Qual a regra de ouro?', options: ['Wait Confirm Execute', 'Entrar em qualquer rompimento'] }
  ];

  const fullText = ManualBlocksModel.extractBlocksText(blocks);
  assert.ok(fullText.includes('O que é o Healthy Trend Trader'));
  assert.ok(fullText.includes('governança e disciplina'));
  assert.ok(fullText.includes('Proteção do Capital'));
  assert.ok(fullText.includes('Operação Diária'));
  assert.ok(fullText.includes('Wait Confirm Execute'));
});

test('ManualBlocksModel: computeAchievements desbloqueia marcos com progresso e quizzes', () => {
  // Estado inicial vazio
  const initialAchs = ManualBlocksModel.computeAchievements({ completed: [], quizzes: {} });
  assert.ok(initialAchs.every(a => a.unlocked === false), 'Inicialmente tudo bloqueado');

  // Concluiu primeiro capítulo e acertou primeiro quiz
  const prog1 = {
    completed: ['livro-1-cap-1'],
    quizzes: {
      'quiz-1': { isCorrect: true, attempts: 1 }
    }
  };
  const achs1 = ManualBlocksModel.computeAchievements(prog1);
  const firstCap = achs1.find(a => a.id === 'first_chapter_completed');
  const firstQuiz = achs1.find(a => a.id === 'first_quiz_completed');
  assert.equal(firstCap.unlocked, true, 'Primeiro capítulo concluído');
  assert.equal(firstQuiz.unlocked, true, 'Primeiro quiz acertado');

  // Concluiu ambos os quizzes de primeira tentativa
  const prog2 = {
    completed: ['livro-1-cap-1'],
    quizzes: {
      'quiz-1': { isCorrect: true, attempts: 1 },
      'quiz-2': { isCorrect: true, attempts: 1 }
    }
  };
  const achs2 = ManualBlocksModel.computeAchievements(prog2);
  const perfect = achs2.find(a => a.id === 'perfect_quiz_score');
  const piloto = achs2.find(a => a.id === 'piloto_completo');
  assert.equal(perfect.unlocked, true, 'Gabarito perfeito');
  assert.equal(piloto.unlocked, true, 'Piloto completo');
});

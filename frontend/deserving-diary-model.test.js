const test = require('node:test');
const assert = require('node:assert/strict');
const DeservingDiaryModel = require('./deserving-diary-model.js');

test('DeservingDiaryModel: exporta dicionários de emoções, tipos de resultado e frases inspiradoras', () => {
  assert.ok(Array.isArray(DeservingDiaryModel.EMOTIONS), 'EMOTIONS deve ser um array');
  assert.ok(DeservingDiaryModel.EMOTIONS.length >= 8, 'Deve conter ao menos 8 emoções mapeadas');
  
  const ids = DeservingDiaryModel.EMOTIONS.map(e => e.id);
  assert.ok(ids.includes('tranquil_satisfied'));
  assert.ok(ids.includes('surprised_speed'));
  assert.ok(ids.includes('anxious_tense'));
  assert.ok(ids.includes('greed_more'));
  assert.ok(ids.includes('fear_giveback'));
  assert.ok(ids.includes('pride_discipline'));
  assert.ok(ids.includes('guilt_uncomfortable'));
  assert.ok(ids.includes('other'));

  assert.ok(Array.isArray(DeservingDiaryModel.INSPIRATION_QUOTES));
  assert.ok(DeservingDiaryModel.INSPIRATION_QUOTES.length >= 5);
  DeservingDiaryModel.INSPIRATION_QUOTES.forEach(q => {
    assert.ok(q.title && q.title.length > 5);
    assert.ok(q.body && q.body.length > 10);
  });
});

test('DeservingDiaryModel.validateEntryPayload: aceita preenchimentos parciais e sanitiza dados', () => {
  const resultEmpty = DeservingDiaryModel.validateEntryPayload({});
  assert.equal(resultEmpty.isValid, true);
  assert.equal(typeof resultEmpty.sanitized.entryDate, 'string');
  assert.equal(resultEmpty.sanitized.ticker, '');
  assert.deepEqual(resultEmpty.sanitized.emotions, []);
  assert.equal(resultEmpty.sanitized.emotionIntensity, null);

  const fullPayload = {
    entryDate: '2026-10-20',
    ticker: 'mglu3',
    resultType: 'target_reached',
    emotions: ['tranquil_satisfied', 'surprised_speed', 'invalid_emotion'],
    emotionIntensity: '8',
    thought: 'O alvo chegou em dois dias.',
    professionalAction: 'Respeitei meu plano, evitei a ganância e realizei o lucro.',
    learning: 'Posso ganhar dinheiro em poucos dias e ficar tranquilo.',
    gratitude: 'Grato pela disciplina.',
    revisitQuote: 'O dinheiro pode chegar rápido, e está tudo bem.'
  };

  const validated = DeservingDiaryModel.validateEntryPayload(fullPayload);
  assert.equal(validated.isValid, true);
  assert.equal(validated.sanitized.entryDate, '2026-10-20');
  assert.equal(validated.sanitized.ticker, 'MGLU3');
  assert.deepEqual(validated.sanitized.emotions, ['tranquil_satisfied', 'surprised_speed']);
  assert.equal(validated.sanitized.emotionIntensity, 8);
  assert.equal(validated.sanitized.thought, 'O alvo chegou em dois dias.');
  assert.equal(validated.sanitized.professionalAction, 'Respeitei meu plano, evitei a ganância e realizei o lucro.');
});

test('DeservingDiaryModel.calculateEvolution: deriva métricas exclusivamente de registros reais', () => {
  // Lista vazia
  const evoEmpty = DeservingDiaryModel.calculateEvolution([], 'all');
  assert.equal(evoEmpty.totalCount, 0);
  assert.equal(evoEmpty.hasEnoughData, false);
  assert.equal(evoEmpty.anxietyAvg, 0);
  assert.equal(evoEmpty.tranquilityAvg, 0);

  // Lista com registros reais
  const mockEntries = [
    {
      entryDate: '2026-10-15',
      ticker: 'VALE3',
      resultType: 'target_reached',
      emotions: ['tranquil_satisfied', 'pride_discipline'],
      emotionIntensity: 9,
      professionalAction: 'Realizei no alvo conforme o plano.'
    },
    {
      entryDate: '2026-10-18',
      ticker: 'PETR4',
      resultType: 'plan_executed',
      emotions: ['surprised_speed', 'anxious_tense'],
      emotionIntensity: 7,
      professionalAction: 'Fechei a posição e evitei ansiedade.'
    },
    {
      entryDate: '2026-10-20',
      ticker: 'MGLU3',
      resultType: 'target_reached',
      emotions: ['tranquil_satisfied', 'surprised_speed'],
      emotionIntensity: 8,
      professionalAction: 'Respeitei o plano e embolsei com tranquilidade.'
    }
  ];

  const evo = DeservingDiaryModel.calculateEvolution(mockEntries, 'all');
  assert.equal(evo.totalCount, 3);
  assert.equal(evo.hasEnoughData, true);
  assert.equal(evo.tranquilityAvg, 8.5); // (9 + 8) / 2 = 8.5
  assert.equal(evo.anxietyAvg, 7); // 7 / 1 = 7.0
  assert.equal(evo.planExecutionPct, 100);
  assert.equal(evo.chartPoints.length, 3);
  assert.equal(evo.chartPoints[0].ticker, 'VALE3');
  assert.equal(evo.chartPoints[2].ticker, 'MGLU3');
});

test('DeservingDiaryModel.formatDateBr: formata datas para DD/MM/AAAA', () => {
  assert.equal(DeservingDiaryModel.formatDateBr('2026-10-20'), '20/10/2026');
  assert.equal(DeservingDiaryModel.formatDateBr('2026-05-09'), '09/05/2026');
  assert.equal(DeservingDiaryModel.formatDateBr(''), '');
});

test('DeservingDiaryModel.getInspirationQuote: retorna frases válidas com título e corpo', () => {
  const quote0 = DeservingDiaryModel.getInspirationQuote(0);
  assert.equal(quote0.title, 'O dinheiro pode chegar rápido, e está tudo bem.');
  
  const randomQuote = DeservingDiaryModel.getInspirationQuote();
  assert.ok(randomQuote.title && randomQuote.title.length > 0);
  assert.ok(randomQuote.body && randomQuote.body.length > 0);
});

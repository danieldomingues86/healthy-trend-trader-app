const test = require('node:test');
const assert = require('node:assert/strict');
const { CONFIG, analyze } = require('./fundamental-score');

test('Fundamental Score excelente combina dimensões configuradas', () => {
  const result = analyze({
    metrics: { roic: 22, earningsCagr: 15, netDebtToEbitda: 0.8, priceEarnings: 7 },
    incomeHistory: [{ netIncome: 1 }, { netIncome: 1 }, { netIncome: 1 }, { netIncome: 1 }, { netIncome: 1 }],
    dividendYears: 5
  });
  assert.equal(result.score, 10);
  assert.equal(result.classification, 'EXCELENTE');
  assert.equal(result.positiveYears, 5);
  assert.equal(result.dataCoveragePct, 100);
  assert.equal(result.isPartial, false);
  assert.ok(result.highlights.some((item) => item[1] === 'Alta eficiência na alocação de capital'));
});

test('Fundamental Score repondera dados ausentes em vez de tratá-los como zero', () => {
  const result = analyze({ metrics: { roe: 20 }, incomeHistory: [] });
  assert.equal(result.dimensions.profitability, 10);
  assert.equal(result.dimensions.debt, null);
  assert.equal(result.score, 10);
  assert.equal(result.classification, 'EXCELENTE');
  assert.equal(result.hasHistory, false);
  assert.equal(result.dataCoveragePct, 28);
  assert.equal(result.isPartial, true);
  assert.ok(result.coverageWarning.includes('Cobertura de dados'));
});

test('Fundamental Score interpreta percentuais do cache como decimais', () => {
  const result = analyze({
    metrics: { roic: 0.243, earningsCagr: 0.112, netDebtToEquity: -0.2, priceEarnings: 33.36, dividendYield: 0.04 },
    incomeHistory: [{ netIncome: 1 }, { netIncome: 1 }, { netIncome: 1 }, { netIncome: 1 }]
  });
  assert.equal(result.dimensions.profitability, 10);
  assert.equal(result.dimensions.growth, 7);
  assert.equal(result.classification, 'BOM');
  assert.equal(result.dataCoveragePct, 100);
});

test('Fundamental Score trata dataset completamente ausente sem NaN ou exceção', () => {
  const result = analyze({ metrics: {}, incomeHistory: [] });
  assert.equal(result.score, 0);
  assert.equal(result.classification, 'RUIM');
  assert.equal(result.dataCoveragePct, 0);
  assert.equal(result.isPartial, true);
  assert.equal(result.takeaway, 'Fundamentos frágeis: a qualidade fundamental reduz o Edge da oportunidade.');
});

test('Histórico de lucros usa somente anos positivos e dívida alta cria alerta determinístico', () => {
  const result = analyze({
    metrics: { roe: 12, netDebtToEbitda: 3.5 },
    incomeHistory: [{ netIncome: 10 }, { netIncome: 0 }, { netIncome: -1 }, { netIncome: 8 }]
  });
  assert.equal(result.positiveYears, 2);
  assert.equal(result.yearsCount, 4);
  assert.equal(result.hasHistory, true);
  assert.ok(result.highlights.some((item) => item[0] === 'warn' && item[1] === 'Endividamento elevado'));
});

test('Configuração expõe pesos e faixas calibráveis', () => {
  assert.deepEqual(Object.keys(CONFIG.weights), ['profitability', 'consistency', 'growth', 'debt', 'valuation', 'dividends']);
  assert.equal(CONFIG.classes[0][0], 'EXCELENTE');
  assert.equal(CONFIG.classes.at(-1)[0], 'RUIM');
});

test('Fundamental Score avalia empresas de BDR com balanços globais', () => {
  const appleBdr = {
    ticker: 'AAPL34',
    originalSymbol: 'AAPL',
    metrics: { roe: 1.45, roic: 0.55, netMargin: 0.245, priceEarnings: 33.5, netDebtToEquity: 0.95, dividendYield: 0.005, earningsCagr: 0.09 },
    incomeHistory: [
      { year: '2022', netIncome: 99803000000 },
      { year: '2023', netIncome: 96995000000 },
      { year: '2024', netIncome: 93736000000 },
      { year: '2025', netIncome: 102500000000 }
    ],
    dividendYears: 5
  };
  const result = analyze(appleBdr);
  assert.ok(result.score >= 7.0);
  assert.ok(['BOM', 'EXCELENTE'].includes(result.classification));
  assert.equal(result.positiveYears, 4);
  assert.equal(result.dimensions.profitability, 10);
  assert.equal(result.dimensions.consistency, 10);
});

test('CEAB3 caso real: cobertura de 78%, consistência nula e soma das contribuições igual ao score', () => {
  const ceab3 = {
    ticker: 'CEAB3',
    metrics: {
      priceEarnings: 5.16,
      priceToBook: 0.76,
      enterpriseToEbitda: 2.3,
      roic: 0.149,
      roe: 0.148,
      grossMargin: 0.562,
      ebitMargin: 0.121,
      netMargin: 0.07,
      netDebtToEquity: 0.04,
      dividendYield: 0.055,
      earningsCagr: 0.086
    },
    incomeHistory: [],
    dividendYears: 0
  };
  const result = analyze(ceab3);
  assert.equal(result.score, 8.1);
  assert.equal(result.classification, 'BOM');
  assert.equal(result.dataCoveragePct, 78);
  assert.equal(result.isPartial, true);
  assert.equal(result.hasHistory, false);
  assert.equal(result.positiveYears, 0);
  assert.equal(result.yearsCount, 0);

  // Verificação estrita da transparência matemática: soma das contribuições exibidas == score exibido
  const sumDisplayContrib = Number(result.dimensionsBreakdown
    .filter((d) => d.available)
    .reduce((sum, d) => sum + d.displayContribution, 0)
    .toFixed(1));
  assert.equal(sumDisplayContrib, result.score, 'Soma das contribuições das dimensões precisa ser identicamente igual ao score final');

  // Consistência deve estar marcada como indisponível
  const consistencyDim = result.dimensionsBreakdown.find((d) => d.id === 'consistency');
  assert.equal(consistencyDim.available, false);
  assert.equal(consistencyDim.dimensionScore, null);
  assert.equal(consistencyDim.status, 'unavailable');
});

test('Robustez a valores especiais: zero real, null, undefined, string vazia e NaN', () => {
  const specialData = {
    metrics: {
      roic: 0, // zero real
      netDebtToEquity: 0, // zero real (caixa líquido / sem dívida)
      dividendYield: 0, // zero real
      priceEarnings: NaN, // NaN deve ser tratado como ausente
      earningsCagr: null // null
    },
    incomeHistory: undefined // undefined
  };
  const result = analyze(specialData);
  assert.ok(!Number.isNaN(result.score), 'Score nunca pode ser NaN');
  assert.ok(result.score >= 0 && result.score <= 10);
  assert.equal(result.dimensions.valuation, null, 'NaN em P/L deve resultar em dimensão nula');
  assert.equal(result.dimensions.growth, null, 'null em CAGR deve resultar em dimensão nula');
  assert.equal(result.dimensions.consistency, null, 'undefined em histórico deve resultar em nulo');
  assert.equal(result.dimensions.debt, 10, 'Dívida zero deve receber nota máxima');
  assert.equal(result.hasHistory, false);
});

test('Valores negativos: prejuízo em P/L e caixa líquido em dívida', () => {
  const negativeData = {
    metrics: {
      priceEarnings: -12.5, // prejuízo
      netDebtToEbitda: -0.8, // caixa líquido
      roic: -0.05 // prejuízo operacional
    },
    incomeHistory: [{ netIncome: -100 }, { netIncome: -50 }]
  };
  const result = analyze(negativeData);
  assert.equal(result.dimensions.valuation, 3, 'Prejuízo recente pontua na faixa baixa de valuation');
  assert.equal(result.dimensions.debt, 10, 'Caixa líquido pontua na faixa excelente');
  assert.equal(result.dimensions.consistency, 0, '0 de 2 anos positivos pontua 0');
  assert.equal(result.dimensions.profitability, 3, 'Retorno negativo pontua na faixa baixa');
  assert.equal(result.classification, 'FRACO');
});

test('formatLargeNumber formata corretamente milhares, milhões, bilhões, trilhões e valores nulos', () => {
  const { formatLargeNumber } = require('./fundamental-score');
  
  assert.equal(formatLargeNumber(950000).formatted, 'R$ 950 mil');
  assert.equal(formatLargeNumber(15400000).formatted, 'R$ 15,4 mi');
  assert.equal(formatLargeNumber(2903670000).formatted, 'R$ 2,90 bi');
  assert.equal(formatLargeNumber(1420000000000).formatted, 'R$ 1,42 tri');
  
  // Teste de valor integral preservado no campo secondary
  assert.ok(formatLargeNumber(2903670000).full.includes('2.903.670.000'));

  // Testes de robustez
  assert.deepEqual(formatLargeNumber(null), { formatted: 'N/D', full: 'N/D' });
  assert.deepEqual(formatLargeNumber(undefined), { formatted: 'N/D', full: 'N/D' });
  assert.deepEqual(formatLargeNumber(NaN), { formatted: 'N/D', full: 'N/D' });
  assert.deepEqual(formatLargeNumber('invalid'), { formatted: 'N/D', full: 'N/D' });
});

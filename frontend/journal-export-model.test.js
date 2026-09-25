const test = require('node:test');
const assert = require('node:assert/strict');
const ExportModel = require('./journal-export-model');

function sampleRecords() {
  return [
    {
      id: 'day-2026-09-24',
      date: '2026-09-24',
      technical: {
        marketState: 'up',
        session: 'Mercado com boa liquidez. Entrei em rompimento de contração no 4H.',
        executionScore: 8.5,
        planRespected: 'yes',
        tradeIds: ['PETR4']
      },
      emotional: {
        states: ['Disciplinado', 'Calmo'],
        intensity: 2,
        note: 'Operei sem ansiedade, esperando o gatilho se formar.',
        impact: 'no',
        impactNote: ''
      },
      shared: {
        lesson: 'Paciência na entrada paga o risco.',
        patterns: 'Esperar fechamento do candle evita violinada.'
      }
    },
    {
      id: 'day-2026-09-23',
      date: '2026-09-23',
      technical: {
        marketState: 'down',
        session: 'Mercado fraco, sem trades liberados.',
        executionScore: 9,
        planRespected: 'yes',
        tradeIds: []
      },
      emotional: {
        states: ['Paciente'],
        intensity: 1,
        note: 'Fiquei de fora respeitando a permissão de mercado.',
        impact: 'no',
        impactNote: ''
      },
      shared: {
        lesson: 'Não operar também é operar.',
        patterns: ''
      }
    },
    {
      id: 'day-2026-08-15',
      date: '2026-08-15',
      technical: {
        marketState: 'transition',
        session: 'Entrada precipitada.',
        executionScore: 5,
        planRespected: 'partial',
        tradeIds: ['VALE3']
      },
      emotional: {
        states: ['Ansioso', 'Impulsivo'],
        intensity: 4,
        note: 'Sensação de FOMO após ver o papel subindo.',
        impact: 'yes',
        impactNote: 'Aumentei o lote além do permitido pela política de risco.'
      },
      shared: {
        lesson: 'Nunca compre expansão.',
        patterns: 'FOMO gera violação de position sizing.'
      }
    },
    {
      id: 'day-2026-01-10',
      date: '2026-01-10',
      technical: {
        marketState: 'up',
        session: 'Início de ano favorável.',
        executionScore: 10,
        planRespected: 'yes',
        tradeIds: []
      },
      emotional: {
        states: ['Confiante'],
        intensity: 2,
        note: 'Execução perfeita.',
        impact: 'no',
        impactNote: ''
      },
      shared: {
        lesson: '',
        patterns: ''
      }
    },
    {
      id: 'day-2026-09-20',
      date: '2026-09-20',
      technical: {},
      emotional: { states: [] },
      shared: {}
    }
  ];
}

test('filterRecords filtra corretamente por períodos pré-definidos', () => {
  const records = sampleRecords();
  const ref = '2026-09-24T12:00:00Z';

  // Dia atual
  const today = ExportModel.filterRecords(records, { period: 'today', referenceDate: ref });
  assert.equal(today.length, 1);
  assert.equal(today[0].date, '2026-09-24');

  // Mês atual (setembro 2026)
  const month = ExportModel.filterRecords(records, { period: 'current_month', activeMonth: '2026-09', referenceDate: ref });
  assert.equal(month.length, 3); // 24, 23 e 20

  // Com skipEmpty
  const monthNoEmpty = ExportModel.filterRecords(records, { period: 'current_month', activeMonth: '2026-09', referenceDate: ref, skipEmpty: true });
  assert.equal(monthNoEmpty.length, 2); // 24 e 23

  // Últimos 30 dias (24/09 até 25/08)
  const last30 = ExportModel.filterRecords(records, { period: 'last_30_days', referenceDate: ref });
  assert.equal(last30.length, 3); // 24/09, 23/09, 20/09

  // Últimos 3 meses (inclui 15/08)
  const last3m = ExportModel.filterRecords(records, { period: 'last_3_months', referenceDate: ref });
  assert.equal(last3m.length, 4); // 24/09, 23/09, 20/09, 15/08

  // Ano atual (2026)
  const year = ExportModel.filterRecords(records, { period: 'current_year', activeMonth: '2026-09', referenceDate: ref });
  assert.equal(year.length, 5);

  // Período customizado
  const custom = ExportModel.filterRecords(records, { period: 'custom', startDate: '2026-08-01', endDate: '2026-08-31' });
  assert.equal(custom.length, 1);
  assert.equal(custom[0].date, '2026-08-15');

  // Todo o histórico
  const all = ExportModel.filterRecords(records, { period: 'all' });
  assert.equal(all.length, 5);
  // Ordenado decrescente
  assert.equal(all[0].date, '2026-09-24');
  assert.equal(all[all.length - 1].date, '2026-01-10');
});

test('toMarkdown gera estrutura semântica correta com instruções para IA', () => {
  const records = sampleRecords().slice(0, 2);
  const md = ExportModel.toMarkdown(records, {
    periodLabel: 'Setembro de 2026',
    forAi: true,
    content: 'all'
  });

  assert.match(md, /HEALTHY TREND TRADER/);
  assert.match(md, /DIÁRIO DO TRADER/);
  assert.match(md, /Período: Setembro de 2026/);
  assert.match(md, /24\/09\/2026/);
  assert.match(md, /DIÁRIO TÉCNICO/);
  assert.match(md, /Contexto do mercado:\nSaudável/);
  assert.match(md, /Qualidade da execução:\n8.5\/10/);
  assert.match(md, /Plano:\nRespeitado/);
  assert.match(md, /Trades vinculados:\nPETR4/);
  assert.match(md, /DIÁRIO EMOCIONAL/);
  assert.match(md, /Estados emocionais:\nDisciplinado \/ Calmo/);
  assert.match(md, /Intensidade emocional:\n2\/5/);
  assert.match(md, /Minhas emoções interferiram na execução\?\nNão/);
  assert.match(md, /Lição do dia:\nPaciência na entrada paga o risco\./);
  assert.match(md, /INSTRUÇÕES PARA A IA/);
  assert.match(md, /Analise este Diário do Trader procurando padrões recorrentes/);
});

test('toMarkdown respeita filtro de conteúdo (técnico apenas ou emocional apenas)', () => {
  const records = sampleRecords().slice(0, 1);

  const techOnly = ExportModel.toMarkdown(records, { content: 'technical', forAi: false });
  assert.match(techOnly, /DIÁRIO TÉCNICO/);
  assert.doesNotMatch(techOnly, /DIÁRIO EMOCIONAL/);
  assert.doesNotMatch(techOnly, /INSTRUÇÕES PARA A IA/);

  const emotOnly = ExportModel.toMarkdown(records, { content: 'emotional', forAi: false });
  assert.doesNotMatch(emotOnly, /DIÁRIO TÉCNICO/);
  assert.match(emotOnly, /DIÁRIO EMOCIONAL/);
});

test('toJson exporta payload estruturado válido com metadados e registros', () => {
  const records = sampleRecords().slice(0, 2);
  const jsonStr = ExportModel.toJson(records, {
    periodLabel: 'Setembro de 2026',
    forAi: true
  });

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.app, 'Healthy Trend Trader');
  assert.equal(parsed.period, 'Setembro de 2026');
  assert.equal(parsed.recordsCount, 2);
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.records[0].date, '2026-09-24');
  assert.equal(parsed.records[0].technical.marketStateLabel, 'Saudável');
  assert.equal(parsed.records[0].emotional.states[0], 'Disciplinado');
  assert.ok(parsed.aiInstructions.includes('Analise este Diário do Trader'));
});

test('toCsv gera arquivo delimitado por ponto-e-vírgula com BOM UTF-8', () => {
  const records = sampleRecords().slice(0, 2);
  const csv = ExportModel.toCsv(records);

  // UTF-8 BOM
  assert.ok(csv.startsWith('\uFEFF'));
  // Cabeçalho com ponto-e-vírgula
  assert.match(csv, /"Data";"Dia da Semana";"Contexto do Mercado"/);
  // Linha de dados
  assert.match(csv, /"24\/09\/2026"/);
  assert.match(csv, /"Saudável"/);
  assert.match(csv, /"Disciplinado \/ Calmo"/);
});

test('getExportFilename gera nomes semânticos adequados por formato e período', () => {
  assert.equal(ExportModel.getExportFilename({ format: 'markdown', period: 'current_month', activeMonth: '2026-09' }), 'diario-trader-2026-09.md');
  assert.equal(ExportModel.getExportFilename({ format: 'json', period: 'today', referenceDate: '2026-09-24T12:00:00Z' }), 'diario-trader-2026-09-24.json');
  assert.equal(ExportModel.getExportFilename({ format: 'csv', period: 'last_30_days' }), 'diario-trader-ultimos-30-dias.csv');
  assert.equal(ExportModel.getExportFilename({ format: 'text', period: 'all' }), 'diario-trader-historico-completo.txt');
  assert.equal(ExportModel.getExportFilename({ format: 'markdown', period: 'custom', startDate: '2026-01-01', endDate: '2026-06-30' }), 'diario-trader-2026-01-01_2026-06-30.md');
});

test('barra lateral do diário posiciona Registro de hoje no topo e Exportar Diário na base', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const code = fs.readFileSync(path.join(__dirname, 'journal-v2.js'), 'utf8');

  const todayIndex = code.indexOf('data-action="today"');
  const navIndex = code.indexOf('<nav aria-label=');
  const exportIndex = code.indexOf('data-action="export-journal"');

  assert.ok(todayIndex !== -1, 'Botão "Registro de hoje" deve existir no diário');
  assert.ok(navIndex !== -1, 'Lista de histórico <nav> deve existir no diário');
  assert.ok(exportIndex !== -1, 'Botão "Exportar Diário" deve existir no diário');

  assert.ok(todayIndex < navIndex, 'Registro de hoje deve ficar no topo, antes da lista de histórico');
  assert.ok(navIndex < exportIndex, 'Exportar Diário deve ficar na base, depois da lista de histórico');
});

test('Diário suporta identificação de mercado (IBOV, BDRX, IFIX) no modelo e na UI', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const journalCode = fs.readFileSync(path.join(__dirname, 'journal-v2.js'), 'utf8');

  assert.ok(journalCode.includes('JOURNAL_MARKETS'), 'JOURNAL_MARKETS deve estar definido no Diário');
  assert.ok(journalCode.includes('Ações B3'), 'Opção Ações B3 (IBOV) deve existir');
  assert.ok(journalCode.includes('BDRs'), 'Opção BDRs (BDRX) deve existir');
  assert.ok(journalCode.includes('FIIs'), 'Opção FIIs (IFIX) deve existir');
  assert.ok(journalCode.includes('technical.market'), 'technical.market deve ser manipulado via data-set');
  assert.ok(!journalCode.includes('jv-market-cycle-badge'), 'Não deve exibir o badge do ciclo de mercado no Diário para não confundir o estado do dia');

  // Test export model market formatting
  const recordsWithMarket = [
    {
      id: 'day-1',
      date: '2026-09-24',
      technical: {
        market: 'bdr',
        marketState: 'up',
        session: 'BDRs fortes.'
      },
      emotional: { states: [] },
      shared: {}
    }
  ];

  const md = ExportModel.toMarkdown(recordsWithMarket);
  assert.match(md, /Contexto do mercado:\nBDRs \(BDRX\) · Saudável/);

  const jsonStr = ExportModel.toJson(recordsWithMarket);
  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.records[0].technical.market, 'bdr');
  assert.equal(parsed.records[0].technical.marketLabel, 'BDRs (BDRX)');
});

/**
 * Testes unitários para TradeSimulatorExportModel
 * Execução com: node --test frontend/trade-simulator-export-model.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const TradeSimulatorExportModel = require('./trade-simulator-export-model.js');
const TradeSimulatorModel = require('./trade-simulator-model.js');

describe('TradeSimulatorExportModel — Suíte de Testes', () => {

  const mockTradeGain = {
    id: 'sim-test-01',
    symbol: 'PETR4',
    companyName: 'Petrobras PN',
    triggerName: 'Inside Bar',
    grade: 'A+',
    sector: 'Petróleo e Gás',
    signalDate: '2026-09-29',
    entryPrice: 49.80,
    stopLoss: 48.90,
    status: 'CLOSED_GAIN',
    executedEntryPrice: 49.80,
    entryDate: '2026-09-30',
    currentStop: 49.80,
    currentPrice: 53.20,
    exitPrice: 53.20,
    exitDate: '2026-10-07',
    exitReason: 'Sell Into Strength (+2R)',
    resultR: 3.78,
    mfeR: 3.90,
    maeR: -0.22,
    ttt1R: 2,
    ttt2R: 4,
    ttt3R: 7,
    structure: {
      ibCount: 1,
      motherCandle: { high: 51.20, low: 48.00, range: 3.20 },
      ib1: { high: 49.79, low: 48.91, range: 0.88, compressionRatio: 0.28, compressionPct: 27.5 },
      totalCompressionPct: 27.5
    },
    timeline: [
      { type: 'SIGNAL_IDENTIFIED', date: '2026-09-29', label: 'Gatilho identificado', desc: 'Inside Bar (A+) em PETR4' },
      { type: 'ENTRY_EXECUTED', date: '2026-09-30', label: 'Entrada executada', price: 49.80, desc: 'Entrada a R$ 49,80' },
      { type: 'CLOSED', date: '2026-10-07', label: 'Trade encerrado', desc: 'Ganho consolidado' }
    ]
  };

  const mockTradeLoss = {
    id: 'sim-test-02',
    symbol: 'VALE3',
    companyName: 'Vale S.A.',
    triggerName: 'Double Inside Bar',
    grade: 'B',
    sector: 'Materiais Básicos',
    signalDate: '2026-09-15',
    entryPrice: 65.00,
    stopLoss: 63.50,
    status: 'CLOSED_LOSS',
    executedEntryPrice: 65.00,
    entryDate: '2026-09-16',
    exitPrice: 63.50,
    exitDate: '2026-09-20',
    exitReason: 'Stop Loss Atingido',
    resultR: -1.00,
    mfeR: 0.30,
    maeR: -1.00,
    structure: {
      ibCount: 2,
      motherCandle: { high: 67.00, low: 62.00, range: 5.00 },
      ib1: { high: 66.00, low: 63.00, range: 3.00, compressionRatio: 0.60, compressionPct: 60.0 },
      ib2: { high: 65.20, low: 63.40, range: 1.80, compressionRatio: 0.60, compressionPct: 60.0 },
      totalCompressionPct: 36.0
    }
  };

  const mockTradeWaiting = {
    id: 'sim-test-03',
    symbol: 'WEGE3',
    companyName: 'WEG S.A.',
    triggerName: '1-2-3 de Compra',
    grade: 'A',
    sector: 'Bens Industriais',
    signalDate: '2026-10-10',
    entryPrice: 54.00,
    stopLoss: 52.50,
    status: 'WAITING_ENTRY',
    currentPrice: 53.40,
    resultR: null,
    mfeR: null,
    maeR: null
  };

  test('Formatação básica e helpers matemáticos', () => {
    assert.equal(TradeSimulatorExportModel.formatMoney(49.8), 'R$ 49,80');
    assert.equal(TradeSimulatorExportModel.formatMoney(null), '—');
    assert.equal(TradeSimulatorExportModel.formatR(3.78), '+3,78R');
    assert.equal(TradeSimulatorExportModel.formatR(-1.0), '-1,00R');
    assert.equal(TradeSimulatorExportModel.formatR(null), '—');
    assert.equal(TradeSimulatorExportModel.formatPct(27.5), '27,50%');
    assert.equal(TradeSimulatorExportModel.formatDateBR('2026-09-29'), '29/09/2026');
    assert.equal(TradeSimulatorExportModel.formatDurationDays(7), '7 dias');
    assert.equal(TradeSimulatorExportModel.formatDurationDays(0), 'Mesmo dia (0 d)');
    assert.equal(TradeSimulatorExportModel.formatDurationDays(null), '—');
  });

  test('DOC (.doc) gera envelope Word com quebras explícitas de página por trade', () => {
    const doc = TradeSimulatorExportModel.toDoc([mockTradeGain, mockTradeLoss, mockTradeWaiting]);

    assert.ok(typeof doc === 'string');
    assert.ok(doc.includes("xmlns:w='urn:schemas-microsoft-com:office:word'"));
    assert.ok(doc.includes("xmlns:o='urn:schemas-microsoft-com:office:office'"));
    assert.ok(doc.includes('mso-break-type: section-break'));

    // Verifica presença dos ativos e dados
    assert.ok(doc.includes('PETR4'));
    assert.ok(doc.includes('VALE3'));
    assert.ok(doc.includes('WEGE3'));

    // Deve conter marcadores de quebra de página entre os trades
    const breaks = (doc.match(/page-break-before:\s*always/g) || []).length;
    assert.equal(breaks, 2, 'Deve ter exatamente 2 quebras entre os 3 trades');

    // Verifica que métricas e valores estão no documento
    assert.ok(doc.includes('R$ 49,80'));
    assert.ok(doc.includes('+3,78R'));
    assert.ok(doc.includes('-1,00R'));
    assert.ok(doc.includes('GRADE A+'));
    assert.ok(doc.includes('Double Inside Bar'));

    // Verifica inclusão do SVG gráfico
    assert.ok(doc.includes('<svg class="sim-snapshot-chart-svg"'));
  });

  test('PDF / HTML Imprimível (.html / .pdf) gera estrutura compatível com impressão e quebra de página A4', () => {
    const html = TradeSimulatorExportModel.toPrintableHtml([mockTradeGain, mockTradeLoss]);

    assert.ok(typeof html === 'string');
    assert.ok(html.includes('@media print'));
    assert.ok(html.includes('@page {'));
    assert.ok(html.includes('size: A4 portrait;'));
    assert.ok(html.includes('page-break-after: always'));
    assert.ok(html.includes('break-after: page'));

    // Ambos os trades presentes
    assert.ok(html.includes('PETR4'));
    assert.ok(html.includes('VALE3'));
    assert.ok(html.includes('Salvar como PDF / Imprimir'));
    assert.ok(html.includes('window.print()'));

    // Verifica gráficos e tags
    assert.ok(html.includes('<svg class="sim-snapshot-chart-svg"'));
  });

  test('ENEX (.enex) gera arquivo válido do Evernote com 1 nota independente por trade', () => {
    const enex = TradeSimulatorExportModel.toEnex([mockTradeGain, mockTradeLoss, mockTradeWaiting]);

    assert.ok(typeof enex === 'string');
    assert.ok(enex.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(enex.includes('<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/xml/item.dtd">'));
    assert.ok(enex.includes('<en-export'));
    assert.ok(enex.endsWith('</en-export>'));

    // Deve conter exatamente 3 notas independentes
    const noteMatches = enex.match(/<note>/g) || [];
    assert.equal(noteMatches.length, 3, 'Deve gerar exatamente 3 notas independentes para 3 trades');

    // Cada nota deve ter título descritivo, data de criação e conteúdo CDATA com en-note
    assert.ok(enex.includes('<title>PETR4 — Inside Bar [Grade A+] (+3,78R)</title>'));
    assert.ok(enex.includes('<title>VALE3 — Double Inside Bar [Grade B] (-1,00R)</title>'));
    assert.ok(enex.includes('<title>WEGE3 — 1-2-3 de Compra [Grade A] (Aguardando entrada)</title>'));

    // Formato de data do Evernote YYYYMMDDTHHMMSSZ
    const createdDates = enex.match(/<created>\d{8}T\d{6}Z<\/created>/g) || [];
    assert.equal(createdDates.length, 3, 'Todas as 3 notas devem ter datas válidas no formato Evernote');

    // DTD do Evernote: dentro de CDATA deve conter <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/en-note.dtd">
    assert.ok(enex.includes('<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/en-note.dtd">'));
    assert.ok(enex.includes('<en-note'));

    // Regra crítica do Evernote: NÃO pode conter <svg> dentro do en-note (Evernote rejeita notas com SVG)
    assert.ok(!enex.includes('<svg'), 'O arquivo ENEX não pode conter tags SVG para respeitar o DTD do Evernote');

    // Tags de organização do Evernote
    assert.ok(enex.includes('<tag>HealthyTrendTrader</tag>'));
    assert.ok(enex.includes('<tag>Simulador</tag>'));
    assert.ok(enex.includes('<tag>PETR4</tag>'));
    assert.ok(enex.includes('<tag>VALE3</tag>'));
  });

  test('CSV (.csv) gera formato tabular correto com UTF-8 BOM e ponto e vírgula', () => {
    const csv = TradeSimulatorExportModel.toCsv([mockTradeGain, mockTradeLoss]);

    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes('Ativo;Gatilho;Nota;Setor;Data do Sinal'));
    assert.ok(csv.includes('"PETR4";"Inside Bar";"A+"'));
    assert.ok(csv.includes('"VALE3";"Double Inside Bar";"B"'));
  });

  test('Lida graciosamente com listas vazias e dados parciais', () => {
    assert.ok(TradeSimulatorExportModel.toDoc([]).includes('Nenhum trade'));
    assert.ok(TradeSimulatorExportModel.toPrintableHtml([]).includes('Nenhum trade'));
    const emptyEnex = TradeSimulatorExportModel.toEnex([]);
    assert.ok(emptyEnex.includes('<en-export'));
    assert.ok(!emptyEnex.includes('<note>'));
    assert.equal(TradeSimulatorExportModel.toCsv([]), '');

    // Trade com dados mínimos sem crash
    const bareTrade = { symbol: 'TEST3', triggerName: 'Inside Bar' };
    assert.doesNotThrow(() => {
      TradeSimulatorExportModel.toDoc([bareTrade]);
      TradeSimulatorExportModel.toPrintableHtml([bareTrade]);
      TradeSimulatorExportModel.toEnex([bareTrade]);
      TradeSimulatorExportModel.toCsv([bareTrade]);
    });
  });

});

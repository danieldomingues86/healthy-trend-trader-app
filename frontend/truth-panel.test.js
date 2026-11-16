const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Mock DOM
function createMockElement(tag, id = '', className = '') {
  const listeners = {};
  const attributes = {};
  const dataset = {};
  let innerHTML = '';
  const children = [];

  const elem = {
    tagName: tag.toUpperCase(),
    id,
    className,
    dataset,
    style: {},
    classList: {
      add: (c) => { if (!elem.className.includes(c)) elem.className += ' ' + c; },
      remove: (c) => { elem.className = elem.className.replace(new RegExp('\\b' + c + '\\b', 'g'), '').trim(); },
      contains: (c) => elem.className.includes(c),
      toggle: (c, force) => {
        if (force === undefined) {
          elem.classList.contains(c) ? elem.classList.remove(c) : elem.classList.add(c);
        } else if (force) {
          elem.classList.add(c);
        } else {
          elem.classList.remove(c);
        }
      }
    },
    addEventListener: (event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    dispatchEvent: (event) => {
      const type = typeof event === 'string' ? event : event.type;
      (listeners[type] || []).forEach(fn => fn(event));
    },
    getAttribute: (attr) => attributes[attr] ?? null,
    setAttribute: (attr, val) => { attributes[attr] = String(val); },
    hasAttribute: (attr) => attr in attributes,
    removeAttribute: (attr) => { delete attributes[attr]; },
    appendChild: (child) => { children.push(child); return child; },
    removeChild: (child) => {
      const idx = children.indexOf(child);
      if (idx >= 0) children.splice(idx, 1);
      return child;
    },
    querySelector: (selector) => {
      return elem.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll: (selector) => {
      const res = [];
      function match(node) {
        if (selector.startsWith('#') && node.id === selector.slice(1)) res.push(node);
        else if (selector.startsWith('.') && node.className.includes(selector.slice(1))) res.push(node);
        else if (selector.startsWith('[') && selector.endsWith(']')) {
          const attr = selector.slice(1, -1).split('=')[0].trim();
          const val = selector.slice(1, -1).split('=')[1]?.replace(/['"]/g, '').trim();
          if (val !== undefined) {
            if (node.getAttribute(attr) === val) res.push(node);
          } else if (node.hasAttribute(attr)) {
            res.push(node);
          }
        }
        (node.children || []).forEach(match);
      }
      (elem.children || []).forEach(match);
      return res;
    }
  };

  Object.defineProperty(elem, 'innerHTML', {
    get: () => innerHTML,
    set: (html) => {
      innerHTML = html;
      elem.children = [];
      // Basic mock parser for child querySelector
      const tabMatches = [...html.matchAll(/data-truth-tab="([^"]+)"/g)];
      tabMatches.forEach(m => {
        const btn = createMockElement('button', '', 'truth-tab-btn' + (html.includes(`data-truth-tab="${m[1]}" active`) ? ' active' : ''));
        btn.setAttribute('data-truth-tab', m[1]);
        elem.children.push(btn);
      });

      const filterMatches = [...html.matchAll(/data-truth-filter="([^"]+)"/g)];
      filterMatches.forEach(m => {
        const sel = createMockElement('select', '', 'truth-filter-select');
        sel.setAttribute('data-truth-filter', m[1]);
        elem.children.push(sel);
      });

      const actionMatches = [...html.matchAll(/data-truth-action="([^"]+)"/g)];
      actionMatches.forEach(m => {
        const btn = createMockElement('button', '', 'truth-btn');
        btn.setAttribute('data-truth-action', m[1]);
        elem.children.push(btn);
      });
    }
  });

  return elem;
}

globalThis.document = {
  createElement: (tag) => createMockElement(tag),
  body: createMockElement('body')
};

// Carrega os módulos
const StrategyAnalyticsModel = require('./strategy-analytics-model.js');
globalThis.StrategyAnalyticsModel = StrategyAnalyticsModel;

const TruthPanelModel = require('./truth-panel-model.js');
globalThis.TruthPanelModel = TruthPanelModel;

require('./truth-panel.js');
const TruthPanel = globalThis.TruthPanel;

const mockTrades = [
  {
    id: 't1', ticker: 'PETR4', status: 'closed', direction: 'long', setup: 'Breakout', rubric_grade: 'A',
    strategy_type: 'TREND_FOLLOWING',
    events: [
      { type: 'entry', at: '2026-03-01T10:00:00Z', qty: 100, price: 30.00, stop: 28.00 },
      { type: 'close', at: '2026-03-05T16:00:00Z', qty: 100, price: 36.00 } // +600 (+3R)
    ]
  },
  {
    id: 't2', ticker: 'VALE3', status: 'closed', direction: 'long', setup: 'Contração 1-2-3', rubric_grade: 'B',
    strategy_type: 'TREND_FOLLOWING',
    events: [
      { type: 'entry', at: '2026-03-02T10:00:00Z', qty: 100, price: 50.00, stop: 47.00 },
      { type: 'close', at: '2026-03-04T16:00:00Z', qty: 100, price: 47.00 } // -300 (-1R)
    ]
  },
  {
    id: 't3', ticker: 'ITUB4', status: 'closed', direction: 'short', setup: 'Reversão', rubric_grade: 'C',
    strategy_type: 'VOLATILITY_TRADING',
    events: [
      { type: 'entry', at: '2026-03-10T10:00:00Z', qty: 200, price: 35.00, stop: 36.00 },
      { type: 'close', at: '2026-03-12T16:00:00Z', qty: 200, price: 34.00 } // +200 (+1R)
    ]
  }
];

test('TruthPanel: Inicialização e estrutura com 5 abas obrigatórias', () => {
  const container = createMockElement('section', 'analytics');
  TruthPanel.render(container, mockTrades);

  assert.ok(container.innerHTML.includes('truth-shell'), 'Container deve possuir a classe truth-shell');
  assert.ok(container.innerHTML.includes('PAINEL DA VERDADE · HEALTHY ANALYTICS'));

  // Valida presença das 5 abas
  const tabs = container.querySelectorAll('[data-truth-tab]');
  assert.strictEqual(tabs.length, 5, 'Devem existir exatamente 5 botões de abas');
  const tabNames = tabs.map(t => t.getAttribute('data-truth-tab'));
  assert.deepStrictEqual(tabNames, ['overview', 'efficiency', 'quality', 'behavior', 'risk']);
});

test('TruthPanel: Barra de filtros global com 7 campos e 3 ações', () => {
  const container = createMockElement('section', 'analytics');
  TruthPanel.render(container, mockTrades);

  const filterSelects = container.querySelectorAll('[data-truth-filter]');
  assert.strictEqual(filterSelects.length, 7, 'Devem existir 7 selects de filtro global');
  const filterKeys = filterSelects.map(s => s.getAttribute('data-truth-filter'));
  assert.deepStrictEqual(filterKeys, ['period', 'asset', 'setup', 'strategy', 'direction', 'grade', 'account']);

  const actionButtons = container.querySelectorAll('[data-truth-action]');
  assert.strictEqual(actionButtons.length, 3, 'Devem existir 3 botões de ação global');
  const actionKeys = actionButtons.map(b => b.getAttribute('data-truth-action'));
  assert.deepStrictEqual(actionKeys, ['reset', 'export-csv', 'print']);
});

test('TruthPanel: Aba 1 (Visão Geral) exibe KPIs executivos e Curva de Equity', () => {
  const container = createMockElement('section', 'analytics');
  TruthPanel.setActiveTab('overview');
  TruthPanel.render(container, mockTrades);

  const html = container.innerHTML;
  assert.ok(html.includes('Total de Trades'), 'Deve exibir Total de Trades');
  assert.ok(html.includes('Taxa de Acerto'), 'Deve exibir Taxa de Acerto');
  assert.ok(html.includes('Resultado Líquido'), 'Deve exibir Resultado Líquido');
  assert.ok(html.includes('Expectativa Financeira'), 'Deve exibir Expectativa Financeira');
  assert.ok(html.includes('Fator de Lucro'), 'Deve exibir Fator de Lucro');
  assert.ok(html.includes('Drawdown Atual'), 'Deve exibir Drawdown Atual');
  assert.ok(html.includes('Curva de Equity'), 'Deve exibir Curva de Equity');
});

test('TruthPanel: Aba 2 (Eficiência) exibe ROCE, Payoff, Turnover e Tempo de Exposição', () => {
  const container = createMockElement('section', 'analytics');
  TruthPanel.setActiveTab('efficiency');
  TruthPanel.render(container, mockTrades);

  const html = container.innerHTML;
  assert.ok(html.includes('MÉTRICA PRIORITÁRIA DE EFICIÊNCIA DO CAPITAL'), 'Deve exibir destaque de Eficiência');
  assert.ok(html.includes('Expectativa por Trade'), 'Deve exibir Expectativa por Trade');
  assert.ok(html.includes('Payoff Ratio'), 'Deve exibir Payoff Ratio');
  assert.ok(html.includes('Payoff Ajustado'), 'Deve exibir Payoff Ajustado');
  assert.ok(html.includes('Rotatividade (Turnover)'), 'Deve exibir Turnover');
  assert.ok(html.includes('Frequência Operacional'), 'Deve exibir Frequência');
  assert.ok(html.includes('Tempo Médio de Exposição'), 'Deve exibir Tempo de Exposição');
  assert.ok(html.includes('Expectativa Mensal Projetada'), 'Deve exibir Expectativa Mensal');
});

test('TruthPanel: Aba 3 (Qualidade) exibe Níveis de R, SQN, Bell Curve e Monthly Tracker', () => {
  const container = createMockElement('section', 'analytics');
  TruthPanel.setActiveTab('quality');
  TruthPanel.render(container, mockTrades);

  const html = container.innerHTML;
  assert.ok(html.includes('Resultado por Nível de R'), 'Deve exibir Resultado por Nível de R');
  assert.ok(html.includes('Motivo de Saída'), 'Deve exibir Motivo de Saída');
  assert.ok(html.includes('Distância da SMA na Entrada'), 'Deve exibir Distância SMA');
  assert.ok(html.includes('Permanência (Holding)'), 'Deve exibir Permanência');
  assert.ok(html.includes('Personal Bell Curve'), 'Deve exibir Personal Bell Curve');
  assert.ok(html.includes('Qualidade Estatística do Sistema (SQN)'), 'Deve exibir SQN');
  assert.ok(html.includes('Expected Value por Qualidade'), 'Deve exibir Grades');
  assert.ok(html.includes('Monthly Tracker'), 'Deve exibir Monthly Tracker');
});

test('TruthPanel: Aba 4 (Comportamento) exibe Sequências, Contexto e Disciplina', () => {
  const container = createMockElement('section', 'analytics');
  TruthPanel.setActiveTab('behavior');
  TruthPanel.render(container, mockTrades);

  const html = container.innerHTML;
  assert.ok(html.includes('Maior Sequência de Ganhos'), 'Deve exibir Maior Sequência de Ganhos');
  assert.ok(html.includes('Maior Sequência de Perdas'), 'Deve exibir Maior Sequência de Perdas');
  assert.ok(html.includes('Dias Ganhos vs Dias Perdidos'), 'Deve exibir Dias Ganhos vs Perdidos');
  assert.ok(html.includes('Resultado por Setup'), 'Deve exibir Resultado por Setup');
  assert.ok(html.includes('Resultado por Ciclo de Mercado'), 'Deve exibir Resultado por Ciclo');
  assert.ok(html.includes('Leitura do Processo'), 'Deve exibir Leitura do Processo');
});

test('TruthPanel: Aba 5 (Risco) exibe Drawdown, Monte Carlo e Concentração', () => {
  const container = createMockElement('section', 'analytics');
  TruthPanel.setActiveTab('risk');
  TruthPanel.render(container, mockTrades);

  const html = container.innerHTML;
  assert.ok(html.includes('Drawdown Máximo'), 'Deve exibir Drawdown Máximo');
  assert.ok(html.includes('Drawdown Atual'), 'Deve exibir Drawdown Atual');
  assert.ok(html.includes('Projeção de Risco de Ruína (Monte Carlo 200 Trades)'), 'Deve exibir Projeção Monte Carlo');
  assert.ok(html.includes('Concentração por Ativo'), 'Deve exibir Concentração por Ativo');
});

test('TruthPanel: Paleta Pigeon Light sem resíduos de gradientes ou blocos azul-escuros legados', () => {
  const css = fs.readFileSync(path.join(__dirname, 'truth-panel.css'), 'utf8');
  assert.ok(css.includes('--tp-bg: #F5F8F7'), 'Deve usar background #F5F8F7');
  assert.ok(css.includes('--tp-card-bg: #FFFFFF'), 'Deve usar background dos cards #FFFFFF');
  assert.ok(css.includes('--tp-navy: #173B4B'), 'Deve usar azul profundo #173B4B');
  assert.ok(css.includes('--tp-green: #72B9A0'), 'Deve usar verde de destaque #72B9A0');
  assert.ok(!css.includes('#06130f'), 'Não deve conter fundo escuro não-Pigeon');
});

test('TruthPanel: Presença e navegação clara para o Monthly Tracker em Aba 1 e Aba 3', () => {
  const container = createMockElement('section', 'analytics');

  // Na Aba 1 (Visão Geral), deve haver a chamada direta para o Monthly Tracker
  TruthPanel.setActiveTab('overview');
  TruthPanel.render(container, mockTrades);
  let html = container.innerHTML;
  assert.ok(html.includes('Monthly Tracker · Acompanhamento dos 12 Meses'), 'Aba 1 deve conter chamada explícita para o Monthly Tracker');
  assert.ok(html.includes('data-switch-to-tab="quality"'), 'Aba 1 deve conter botão para abrir Monthly Tracker na Aba 3');

  // Na Aba 3 (Qualidade & Monthly Tracker), a tabela completa de 12 meses deve existir
  TruthPanel.setActiveTab('quality');
  TruthPanel.render(container, mockTrades);
  html = container.innerHTML;
  assert.ok(html.includes('Monthly Tracker · Ano'), 'Aba 3 deve exibir a tabela Monthly Tracker');
  assert.ok(html.includes('truth-monthly-tracker-card'), 'Deve possuir a classe do card do Monthly Tracker');
  assert.ok(html.includes('JAN') && html.includes('DEZ'), 'Deve exibir os meses do ano');
});

test('TruthPanel: Prevenção de duplicidade ou injeção legada de analyticsStrategyContainer', () => {
  const container = createMockElement('section', 'analytics');
  TruthPanel.render(container, mockTrades);
  assert.ok(!container.innerHTML.includes('analyticsStrategyContainer'), 'Não deve conter container legado');
  assert.ok(container.innerHTML.includes('truth-shell'), 'Deve conter a casca do TruthPanel');
});

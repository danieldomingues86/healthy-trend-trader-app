const test = require('node:test');
const assert = require('node:assert/strict');

const icons = require('./daily-routine-icons.js');
const model = require('./daily-routine-model.js');

test('Rotina Diária - Biblioteca de Ícones SVG e Categorias', (t) => {
  const catKeys = Object.keys(icons.CATEGORIES);
  assert.ok(catKeys.length >= 7, 'Deve ter pelo menos 7 categorias');
  assert.ok(catKeys.includes('trading'), 'Inclui categoria trading');
  assert.ok(catKeys.includes('saude'), 'Inclui categoria saude');
  assert.ok(catKeys.includes('mentalidade'), 'Inclui categoria mentalidade');
  assert.ok(catKeys.includes('estudos'), 'Inclui categoria estudos');
  assert.ok(catKeys.includes('produtividade'), 'Inclui categoria produtividade');
  assert.ok(catKeys.includes('financas'), 'Inclui categoria financas');
  assert.ok(catKeys.includes('pessoal'), 'Inclui categoria pessoal');

  // Cada categoria possui meta com cores pastel e label
  catKeys.forEach(cat => {
    const meta = icons.CATEGORIES[cat];
    assert.ok(meta, `Meta para categoria ${cat} deve existir`);
    assert.ok(meta.label, `Label para ${cat} deve existir`);
    assert.ok(meta.bg.startsWith('#'), `bg deve ser cor hex para ${cat}`);
    assert.ok(meta.color.startsWith('#'), `color deve ser cor hex para ${cat}`);
  });

  // Render SVG
  const svgLine = icons.renderSvg('chart-line', 24);
  assert.ok(svgLine.includes('<svg'), 'Renderiza tag svg');
  assert.ok(svgLine.includes('viewBox="0 0 24 24"'), 'Viewbox 24x24 consistente');

  // Render Badge
  const badgeHtml = icons.renderBadge('chart-line', 'trading', 22);
  assert.ok(badgeHtml.includes('class="dr-icon-badge"'), 'Possui classe dr-icon-badge');
  assert.ok(badgeHtml.includes('background:'), 'Aplica background suave');

  // Sugestão automática inteligente por palavras-chave
  const sugSaude = icons.suggestCategoryAndIcon('Treinar na academia');
  assert.equal(sugSaude.category, 'saude');
  assert.equal(sugSaude.icon, 'activity');

  const sugTrade = icons.suggestCategoryAndIcon('Revisar minhas posições');
  assert.equal(sugTrade.category, 'trading');
  assert.equal(sugTrade.icon, 'chart-up');

  const sugMeditar = icons.suggestCategoryAndIcon('Meditar por 10 minutos');
  assert.equal(sugMeditar.category, 'mentalidade');
  assert.equal(sugMeditar.icon, 'lotus');

  const sugEstudo = icons.suggestCategoryAndIcon('Leitura e estudos de livros de trading');
  assert.equal(sugEstudo.category, 'estudos');
  assert.equal(sugEstudo.icon, 'book-open');
});

test('Rotina Diária - Modelo de Dados e Itens Padrão', (t) => {
  // Deve vir com os 8 rituais oficiais
  assert.equal(model.DEFAULT_ITEMS.length, 8, 'São 8 rituais oficiais padrão');

  const [m1, m2, m3, m4, m5, m6, m7, m8] = model.DEFAULT_ITEMS;
  assert.equal(m1.name, 'Mercado e Contexto');
  assert.equal(m2.name, 'Análise de Ativos');
  assert.equal(m3.name, 'Plano do Dia');
  assert.equal(m4.name, 'Execução');
  assert.equal(m5.name, 'Registro no Diário');
  assert.equal(m6.name, 'Revisão de Desempenho');
  assert.equal(m7.name, 'Estudo e Evolução');
  assert.equal(m8.name, 'Mentalidade');

  // Normalização de itens
  const normal = model.normalizeRoutineItem({ name: 'Minha Tarefa', time: '15 min' });
  assert.equal(normal.name, 'Minha Tarefa');
  assert.equal(normal.time, '15 min');
  assert.ok(normal.category);
  assert.ok(normal.icon);
});

test('Rotina Diária - Estado por Data e Gestão Dinâmica', (t) => {
  // Reset para padrão
  model.safeStorage.clear();
  model.resetToDefaultItems();
  const stateToday = model.getTodayRoutineState();
  assert.equal(stateToday.items.length, 8);
  assert.equal(stateToday.completedCount, 0);
  assert.equal(stateToday.percentage, 0);

  // Toggle primeiro item
  const res = model.toggleItemCompletion(stateToday.items[0].id);
  assert.equal(res.completed, true);
  const stateAfter1 = model.getTodayRoutineState();
  assert.equal(stateAfter1.completedCount, 1);
  assert.equal(stateAfter1.percentage, 13); // 1 / 8 = 12.5% -> 13%
  assert.equal(stateAfter1.items[0].completed, true);

  // Toggle para desmarcar
  const res2 = model.toggleItemCompletion(stateToday.items[0].id);
  assert.equal(res2.completed, false);
  const stateAfter2 = model.getTodayRoutineState();
  assert.equal(stateAfter2.completedCount, 0);
  assert.equal(stateAfter2.percentage, 0);
  assert.equal(stateAfter2.items[0].completed, false);

  // Adicionar novo item dinâmico
  const newItem = model.addRoutineItem({
    name: 'Alongamento Matinal',
    description: '10 minutos de mobilidade',
    category: 'saude',
    icon: 'activity',
    time: '10 min'
  });
  assert.ok(newItem.id);
  const stateAfterAdd = model.getTodayRoutineState();
  assert.equal(stateAfterAdd.items.length, 9);
  assert.equal(stateAfterAdd.items[8].name, 'Alongamento Matinal');

  // Atualizar item
  model.updateRoutineItem(newItem.id, { name: 'Alongamento e Respiração' });
  const stateAfterUpdate = model.getTodayRoutineState();
  assert.equal(stateAfterUpdate.items.find(i => i.id === newItem.id).name, 'Alongamento e Respiração');

  // Mover item para cima
  model.moveRoutineItem(newItem.id, 'up');
  const stateAfterMove = model.getTodayRoutineState();
  assert.equal(stateAfterMove.items[7].id, newItem.id);

  // Remover item
  model.deleteRoutineItem(newItem.id);
  const stateAfterDelete = model.getTodayRoutineState();
  assert.equal(stateAfterDelete.items.length, 8);
  assert.equal(stateAfterDelete.items.some(i => i.id === newItem.id), false);
});

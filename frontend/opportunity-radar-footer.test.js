'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Radar de Oportunidades: Card do rodapé exibe "Requisitos Obrigatórios de Entrada" com descrição explicativa', () => {
  const radarJsPath = path.join(__dirname, 'opportunity-radar.js');
  const radarJs = fs.readFileSync(radarJsPath, 'utf8');

  // 1. Título do card ajustado
  assert.ok(
    radarJs.includes('<h3>Requisitos Obrigatórios de Entrada</h3>'),
    'Deve conter o título "Requisitos Obrigatórios de Entrada"'
  );
  assert.ok(
    !radarJs.includes('<h3>Critérios utilizados</h3>'),
    'Não deve conter o título antigo "Critérios utilizados"'
  );

  // 2. Descrição explicativa presente
  assert.ok(
    radarJs.includes('O ativo deve atender a todos os critérios abaixo para ser considerado uma oportunidade.'),
    'Deve conter a descrição explicativa exatamente como especificado'
  );

  // 3. Critérios preservados
  assert.ok(radarJs.includes('Força Relativa (3M) &gt; 80'), 'Deve manter Força Relativa (3M) > 80');
  assert.ok(radarJs.includes('Ciclo de Mercado Positivo'), 'Deve manter Ciclo de Mercado Positivo');
  assert.ok(radarJs.includes('Preço &gt; EMA 10 &gt; EMA 72 (Diário)'), 'Deve manter Preço > EMA 10 > EMA 72 (Diário)');
  assert.ok(radarJs.includes('Gatilhos: Inside Bar, 123 Buy, PFR de Compra'), 'Deve manter os gatilhos oficiais');

  // 4. Preservação dos demais cards do rodapé
  assert.ok(radarJs.includes('<h3>Mercados disponíveis</h3>'), 'Deve preservar card "Mercados disponíveis"');
  assert.ok(radarJs.includes('<h3>Importante</h3>'), 'Deve preservar card de aviso operacional "Importante"');
  assert.ok(
    radarJs.includes('Gatilho identificado no fechamento não significa entrada automática no próximo pregão.'),
    'Deve preservar texto do aviso operacional'
  );
});

test('Radar de Oportunidades: CSS define hierarquia visual e suporte a temas para o novo cabeçalho do card', () => {
  const radarCssPath = path.join(__dirname, 'opportunity-radar.css');
  const radarCss = fs.readFileSync(radarCssPath, 'utf8');

  // Classe .radar-info-header e .radar-info-desc devem estar definidas
  assert.ok(radarCss.includes('.radar-info-header'), 'Deve definir classe .radar-info-header');
  assert.ok(radarCss.includes('.radar-info-desc'), 'Deve definir classe .radar-info-desc');

  // Suporte a tema Gold
  assert.ok(
    radarCss.includes('body[data-theme="gold"] .radar-info-desc'),
    'Deve conter regra temática para .radar-info-desc no tema Gold'
  );
});

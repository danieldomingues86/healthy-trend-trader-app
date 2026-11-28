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
  assert.ok(radarJs.includes('Liquidez Mínima: Vol. médio &ge; R$ 500 mil/dia (21 pregões)'), 'Deve conter o requisito obrigatório de Liquidez Mínima');
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

test('Radar de Oportunidades: Tabela de oportunidades exibe coluna LIQUIDEZ e pills com comprovação de volume', () => {
  const radarJsPath = path.join(__dirname, 'opportunity-radar.js');
  const radarJs = fs.readFileSync(radarJsPath, 'utf8');
  const radarCssPath = path.join(__dirname, 'opportunity-radar.css');
  const radarCss = fs.readFileSync(radarCssPath, 'utf8');

  // Cabeçalho da tabela deve conter coluna LIQUIDEZ
  assert.ok(radarJs.includes('<th class="col-center">LIQUIDEZ</th>'), 'Tabela do radar deve ter cabeçalho LIQUIDEZ');

  // Linhas da tabela devem renderizar radar-liquidity-pill
  assert.ok(radarJs.includes('class="radar-liquidity-pill"'), 'Linhas devem renderizar badge radar-liquidity-pill');

  // CSS deve definir a estilização padrão e tema Gold
  assert.ok(radarCss.includes('.radar-liquidity-pill'), 'CSS deve conter .radar-liquidity-pill');
  assert.ok(radarCss.includes('body[data-theme="gold"] .radar-liquidity-pill'), 'CSS deve suportar tema Gold para a pill de liquidez');

  // Cabeçalho e linhas também devem exibir a coluna NEGÓCIOS (DIA) (número de negócios realizados no dia)
  assert.ok(radarJs.includes('>NEGÓCIOS (DIA)</th>'), 'Tabela do radar deve ter cabeçalho NEGÓCIOS (DIA)');
  assert.ok(radarJs.includes('class="radar-trades-count-pill'), 'Linhas devem renderizar radar-trades-count-pill com número de negócios');
  assert.ok(radarCss.includes('.radar-trades-count-pill'), 'CSS deve conter .radar-trades-count-pill');
  assert.ok(radarCss.includes('body[data-theme="gold"] .radar-trades-count-pill'), 'CSS deve suportar tema Gold para a pill de negócios');
});

test('Radar de Oportunidades: Requisito de Ciclo de Mercado Positivo é especificado em texto nas linhas do card', () => {
  const radarModel = require('./opportunity-radar-model');
  const radarJsPath = path.join(__dirname, 'opportunity-radar.js');
  const radarJs = fs.readFileSync(radarJsPath, 'utf8');

  const EXPECTED_DEFINITION =
    'Ciclo de Mercado Positivo: mercado com tendência predominante de alta, caracterizada pelo alinhamento das EMAs 10 e 30 no gráfico Diário, ambas com inclinação favorável. O comportamento do preço e a persistência do alinhamento também são considerados. Após correções, o sistema observa sinais de retomada da tendência.';

  // 1. Definição canônica exportada pelo modelo e idêntica à especificação
  assert.strictEqual(
    radarModel.MARKET_CYCLE_DEFINITION,
    EXPECTED_DEFINITION,
    'O modelo deve exportar a definição canônica exata do Ciclo de Mercado Positivo'
  );

  // 2. No card de requisitos obrigatórios, a regra é exibida diretamente em texto igual às outras linhas (sem ícone interativo)
  assert.ok(
    radarJs.includes('Ciclo de Mercado Positivo: alinhamento das EMAs 10 e 30 com inclinação favorável (Diário)'),
    'Deve conter a especificação técnica em texto puro na linha do card, alinhado ao padrão das demais linhas'
  );
  assert.ok(
    !radarJs.includes('class="radar-info-tooltip-trigger"'),
    'Não deve conter ícone interativo no checklist, devendo ser texto direto'
  );

  // 3. Cabeçalho da tabela mantém a definição via atributo title sem poluição visual
  assert.ok(
    radarJs.includes('<th class="col-center" title="'),
    'Cabeçalho deve possuir atributo title com a definição completa'
  );
  assert.ok(
    radarJs.includes('>CICLO DE MERCADO</th>'),
    'Cabeçalho CICLO DE MERCADO deve permanecer limpo em texto'
  );
});

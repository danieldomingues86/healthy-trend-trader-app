'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const eventPlaybook = require('../src/event-playbook');
const marketCentral = require('../src/market-central');

test('integração Central de Mercado + Event Playbook: cadastro compartilhado e entidade única', async () => {
  const userId = 'user-integration-test';

  // 1. Cria evento pelo Event Playbook
  const epEvent = await eventPlaybook.create(userId, {
    name: 'Eleição Extraordinária na Europa',
    date: '2026-11-10',
    time: '19:00',
    category: 'Política',
    impact: 5,
    country: 'Europa',
    relatedAssets: 'DAX, EURUSD, IBOV',
    description: 'Eleição antecipada com risco de fragmentação no parlamento.'
  });

  assert.ok(epEvent.id);
  assert.equal(epEvent.name, 'Eleição Extraordinária na Europa');

  // 2. Consulta via Central de Mercado backend (getMarketCentralData)
  const mcData = await marketCentral.getMarketCentralData({ userId });
  assert.ok(mcData.events);
  const foundInCentral = mcData.events.find(e => e.id === epEvent.id);
  assert.ok(foundInCentral, 'Evento criado no Event Playbook deve aparecer na Central de Mercado');
  assert.equal(foundInCentral.name, 'Eleição Extraordinária na Europa');
  assert.equal(foundInCentral.impact, 'ALTO');

  // 3. Salva reação via fluxo de Reação da Central de Mercado
  const reactionPayload = {
    eventId: epEvent.id,
    whatHappened: 'Abertura em forte baixa com recuperação parcial no fechamento.',
    volatilityBehavior: 'Expansão rápida seguida de absorção',
    affectedAssets: 'DAX, EURUSD, PETR4',
    lessonsLearned: 'Esperar a definição da contagem dos votos antes de ajustar risco.'
  };

  const updatedByReaction = await eventPlaybook.saveReaction(userId, reactionPayload);
  assert.equal(updatedByReaction.id, epEvent.id, 'O ID da entidade deve ser o mesmo');
  assert.equal(updatedByReaction.whatHappened, reactionPayload.whatHappened);
  assert.equal(updatedByReaction.volatilityBehavior, reactionPayload.volatilityBehavior);
  assert.equal(updatedByReaction.lessonsLearned, reactionPayload.lessonsLearned);

  // 4. Consulta detalhada no Event Playbook: verifica se a lição e reação refletiram
  const reloadedInPlaybook = await eventPlaybook.get(userId, epEvent.id);
  assert.equal(reloadedInPlaybook.whatHappened, reactionPayload.whatHappened);
  assert.equal(reloadedInPlaybook.lessonsLearned, reactionPayload.lessonsLearned);
  assert.equal(reloadedInPlaybook.affectedAssets, reactionPayload.affectedAssets);

  // 5. Edita pelo Event Playbook e verifica se reflete na Central
  await eventPlaybook.update(userId, epEvent.id, {
    name: 'Eleição Extraordinária na Europa (Resultado Consolidado)',
    tradingImplications: 'Reduzir alavancagem em ativos com exposição ao Euro.'
  });

  const mcDataUpdated = await marketCentral.getMarketCentralData({ userId });
  const foundUpdatedInCentral = mcDataUpdated.events.find(e => e.id === epEvent.id);
  assert.ok(foundUpdatedInCentral);
  assert.equal(foundUpdatedInCentral.name, 'Eleição Extraordinária na Europa (Resultado Consolidado)');

  // 6. Limpeza
  await eventPlaybook.remove(userId, epEvent.id);
});

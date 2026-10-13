'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const EventPlaybookModel = require('./event-playbook-model');
const MarketCentralModel = require('./market-central-model');

test('Frontend Integração Central de Mercado + Event Playbook: sincronização bidirecional em tempo real', () => {
  // 1. Cadastra evento pela Central de Mercado
  const createdInCentral = MarketCentralModel.addCustomEvent({
    name: 'Anúncio de Estímulo Fiscal no Japão',
    date: '2026-11-25',
    time: '04:00',
    impact: 'ALTO',
    relatedAssets: 'Nikkei, Dólar, Ouro'
  });

  assert.ok(createdInCentral.id);
  assert.equal(createdInCentral.name, 'Anúncio de Estímulo Fiscal no Japão');

  // 2. Confirma que o Event Playbook já enxerga o mesmo evento com mesmo ID
  const foundInPlaybook = EventPlaybookModel.getEventById(createdInCentral.id);
  assert.ok(foundInPlaybook, 'Evento cadastrado na Central de Mercado deve existir no Event Playbook');
  assert.equal(foundInPlaybook.id, createdInCentral.id);
  assert.equal(foundInPlaybook.name, 'Anúncio de Estímulo Fiscal no Japão');
  assert.equal(foundInPlaybook.impact, 4);

  // 3. Salva reação rápida pelo modal da Central de Mercado
  MarketCentralModel.saveEventReaction({
    eventId: createdInCentral.id,
    eventName: createdInCentral.name,
    eventDate: createdInCentral.date,
    whatHappened: 'Nikkei disparou 2,8% na abertura com desvalorização do Iene.',
    volatilityBehavior: 'Volatilidade unidirecional sem retorno',
    affectedAssets: 'Nikkei, Dólar, USDBRL',
    lessonsLearned: 'Estímulos diretos provocam rali imediato sem pullback no primeiro pregão.'
  });

  // 4. Confirma que os dados da reação agora pertencem à entidade única no Event Playbook
  const updatedPlaybookEntity = EventPlaybookModel.getEventById(createdInCentral.id);
  assert.equal(updatedPlaybookEntity.whatHappened, 'Nikkei disparou 2,8% na abertura com desvalorização do Iene.');
  assert.equal(updatedPlaybookEntity.lessonsLearned, 'Estímulos diretos provocam rali imediato sem pullback no primeiro pregão.');
  assert.equal(updatedPlaybookEntity.volatilityBehavior, 'Volatilidade unidirecional sem retorno');

  // 5. Edita campos aprofundados no Event Playbook (ex: tradingImplications e screenshots)
  EventPlaybookModel.updateEvent(createdInCentral.id, {
    tradingImplications: 'Procurar entradas no rompimento da primeira consolidação.',
    name: 'Anúncio de Estímulo Fiscal no Japão (Confirmado)'
  });

  // 6. Confirma que a Central de Mercado já lê o nome atualizado
  const centralEvents = MarketCentralModel.getCustomEvents();
  const refreshedInCentral = centralEvents.find(e => e.id === createdInCentral.id);
  assert.ok(refreshedInCentral);
  assert.equal(refreshedInCentral.name, 'Anúncio de Estímulo Fiscal no Japão (Confirmado)');

  // 7. Exclusão sincronizada
  EventPlaybookModel.deleteEvent(createdInCentral.id);
  assert.equal(EventPlaybookModel.getEventById(createdInCentral.id), null);
  const remainingInCentral = MarketCentralModel.getCustomEvents();
  assert.ok(!remainingInCentral.some(e => e.id === createdInCentral.id));
});

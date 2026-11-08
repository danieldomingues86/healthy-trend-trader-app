'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Model = require('./event-playbook-model');

test('EventPlaybookModel: helpers de apresentação visual (datas, bandeiras, ícones e capas)', () => {
  // 1. Data Badge
  const badgeNov = Model.formatDateBadge('2026-11-05');
  assert.equal(badgeNov.day, '05');
  assert.equal(badgeNov.month, 'NOV');
  assert.equal(badgeNov.formatted, '05/11/2026');

  const badgeOut = Model.formatDateBadge('2026-10-13');
  assert.equal(badgeOut.day, '13');
  assert.equal(badgeOut.month, 'OUT');

  // 2. Bandeiras
  assert.equal(Model.getCountryWithFlag('EUA'), '🇺🇸 EUA');
  assert.equal(Model.getCountryWithFlag('Brasil'), '🇧🇷 Brasil');
  assert.equal(Model.getCountryWithFlag('China'), '🇨🇳 China');
  assert.equal(Model.getCountryWithFlag('Global'), '🌐 Global');

  // 3. Ícones de Categoria
  assert.equal(Model.getCategoryIcon('Política'), '🏛️');
  assert.equal(Model.getCategoryIcon('Banco Central'), '🏦');
  assert.equal(Model.getCategoryIcon('Macro'), '🌐');
  assert.equal(Model.getCategoryIcon('Geopolítica'), '⚔️');

  // 4. Capas Editoriais
  const coverElection = Model.getEventCoverImage({ id: 'evt-eleicao-eua', category: 'Política', country: 'EUA' });
  assert.ok(coverElection.includes('cover-us-election.jpg'));

  const coverCopom = Model.getEventCoverImage({ id: 'evt-copom', category: 'Banco Central', country: 'Brasil' });
  assert.ok(coverCopom.includes('cover-copom-bcb.jpg'));

  const coverFed = Model.getEventCoverImage({ id: 'evt-fed-rate', name: 'Decisão de Juros (EUA - Fed)' });
  assert.ok(coverFed.includes('cover-fed-wallstreet.jpg'));
});

test('EventPlaybook: arquivos de mídia e capas existem no diretório assets/event-playbook/', () => {
  const assetsDir = path.resolve(__dirname, '../assets/event-playbook');
  assert.ok(fs.existsSync(path.join(assetsDir, 'hero-alpine-eagle.jpg')), 'Hero alpino deve existir');
  assert.ok(fs.existsSync(path.join(assetsDir, 'cover-us-election.jpg')), 'Capa Eleições EUA deve existir');
  assert.ok(fs.existsSync(path.join(assetsDir, 'cover-copom-bcb.jpg')), 'Capa COPOM deve existir');
  assert.ok(fs.existsSync(path.join(assetsDir, 'cover-fed-wallstreet.jpg')), 'Capa FED deve existir');
});

test('EventPlaybook UI: integridade estrutural do HTML e CSS', () => {
  const jsContent = fs.readFileSync(path.resolve(__dirname, 'event-playbook.js'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve(__dirname, 'event-playbook.css'), 'utf8');

  // Hero Banner com imagem alpina e águia
  assert.ok(jsContent.includes('ep-hero-header'));
  assert.ok(jsContent.includes('ep-hero-title'));
  assert.ok(cssContent.includes('hero-alpine-eagle.jpg'));

  // Barra de Categorias e Novo Evento
  assert.ok(jsContent.includes('ep-categories-bar'));
  assert.ok(jsContent.includes('ep-btn-new-event'));

  // Timeline com Date Badge e Impact Pill
  assert.ok(jsContent.includes('ep-timeline-col'));
  assert.ok(jsContent.includes('ep-timeline-card'));
  assert.ok(jsContent.includes('ep-date-badge'));
  assert.ok(jsContent.includes('ep-date-day'));
  assert.ok(jsContent.includes('ep-date-month'));
  assert.ok(jsContent.includes('ep-badge-impact-pill'));

  // Protagonista com Capa, Narrativa, Métricas e Lição
  assert.ok(jsContent.includes('ep-protagonist-header'));
  assert.ok(jsContent.includes('ep-protagonist-cover-img'));
  assert.ok(jsContent.includes('ep-market-impact-callout'));
  assert.ok(jsContent.includes('ep-metrics-cards-row'));
  assert.ok(jsContent.includes('ep-lesson-box'));
  assert.ok(jsContent.includes('Lição para o Futuro'));

  // Modal com Stepper Wizard
  assert.ok(jsContent.includes('ep-stepper-bar'));
  assert.ok(jsContent.includes('Identificação'));
  assert.ok(jsContent.includes('Contexto &amp; Operação'));
  assert.ok(jsContent.includes('Métricas &amp; Lição'));
});

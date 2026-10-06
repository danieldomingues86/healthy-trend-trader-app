const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const news = require('../src/market-news');

test('market news aceita apenas artigos HTTPS de veículos aprovados e classifica o contexto', () => {
  const article = news.normalizeArticle({ url: 'https://www.reuters.com/world/markets/petrobras-petr4-vale3/', title: 'Petrobras PETR4 e Vale VALE3 reagem a petróleo e commodities', seendate: '20261005T153000Z' }, 0);
  assert.equal(article.source, 'Reuters');
  assert.equal(article.market, 'br');
  assert.equal(article.category, 'Commodities');
  assert.deepEqual(article.tickers, ['PETR4', 'VALE3']);
  assert.equal(news.normalizeArticle({ url: 'https://untrusted.example/article', title: 'Sem procedência' }, 1), null);
});

test('market news atualiza o cache com resposta GDELT e reutiliza o cache quando ainda está recente', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'htt-news-'));
  const file = path.join(directory, 'news.json');
  let calls = 0;
  const fetchImpl = async () => ({ ok: true, json: async () => {
    calls += 1;
    return { articles: [{ url: 'https://www.cnbc.com/2026/10/05/nasdaq.html', title: 'Nasdaq e NVDA avançam após decisão do Federal Reserve', seendate: '20261005T150000Z' }] };
  } });
  const first = await news.refresh({ force: true, fetchImpl, file, now: new Date('2026-10-05T15:30:00Z') });
  const second = await news.refresh({ fetchImpl, file, now: new Date('2026-10-05T15:35:00Z') });
  assert.equal(first.stories.length, 1);
  assert.equal(second.stories[0].source, 'CNBC');
  assert.equal(calls, 1);
  await fs.rm(directory, { recursive: true, force: true });
});

test('market news preserva o último feed válido quando a fonte falha', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'htt-news-'));
  const file = path.join(directory, 'news.json');
  await news.writeCache({ provider: 'GDELT DOC 2.0', updatedAt: '2026-10-05T10:00:00Z', stories: [{ id: 'saved', title: 'Última notícia válida' }] }, file);
  const result = await news.refresh({ force: true, fetchImpl: async () => { throw new Error('offline'); }, file });
  assert.equal(result.stale, true);
  assert.equal(result.stories[0].id, 'saved');
  await fs.rm(directory, { recursive: true, force: true });
});

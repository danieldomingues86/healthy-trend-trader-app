const test = require('node:test');
const assert = require('node:assert/strict');
const MarketNewsModel = require('./market-news-model.js');

test('MarketNewsModel: exporta catálogos e dados essenciais', () => {
  assert.ok(Array.isArray(MarketNewsModel.MARKETS));
  assert.equal(MarketNewsModel.MARKETS.length, 4);

  assert.ok(Array.isArray(MarketNewsModel.CATEGORIES));
  assert.equal(MarketNewsModel.CATEGORIES.length, 7);

  assert.ok(Array.isArray(MarketNewsModel.MARKET_INDICATORS));
  assert.equal(MarketNewsModel.MARKET_INDICATORS.length, 7);

  assert.ok(Array.isArray(MarketNewsModel.SECTORS_OVERVIEW));
  assert.equal(MarketNewsModel.SECTORS_OVERVIEW.length, 7);

  assert.ok(MarketNewsModel.FEATURED_STORY);
  assert.equal(MarketNewsModel.FEATURED_STORY.id, 'story-hero-fed');
  assert.ok(Array.isArray(MarketNewsModel.TOP_STORIES));
  assert.equal(MarketNewsModel.TOP_STORIES.length, 5);
});

test('MarketNewsModel: filterStories filtra por mercado e categoria', () => {
  // Filtro por mercado US
  const usFiltered = MarketNewsModel.filterStories({ market: 'us' });
  assert.ok(usFiltered.watchlistStories.every(s => s.market === 'us'));
  assert.ok(usFiltered.latestStories.every(s => s.market === 'us'));

  // Filtro por categoria Commodities
  const commFiltered = MarketNewsModel.filterStories({ category: 'Commodities' });
  assert.ok(commFiltered.watchlistStories.every(s => s.category.toLowerCase().includes('commodities')));
  assert.ok(commFiltered.latestStories.every(s => s.category.toLowerCase().includes('commodities')));
});

test('MarketNewsModel: filterStories filtra por busca textual (ativos e termos)', () => {
  const searchNvidia = MarketNewsModel.filterStories({ search: 'Nvidia' });
  assert.ok(searchNvidia.watchlistStories.some(s => s.ticker === 'NVDA'));
  assert.ok(searchNvidia.latestStories.some(s => s.headline.includes('Nvidia')));

  const searchFed = MarketNewsModel.filterStories({ search: 'Fed' });
  assert.ok(searchFed.latestStories.some(s => s.headline.includes('Fed')));
});

test('MarketNewsModel: filterStories respeita watchlist do usuário', () => {
  const customWatchlist = ['NVDA', 'AAPL'];
  const res = MarketNewsModel.filterStories({
    watchlistOnly: true,
    userWatchlistTickers: customWatchlist
  });

  assert.ok(res.watchlistStories.length > 0);
  assert.ok(res.watchlistStories.every(s => customWatchlist.includes(s.ticker)));
});

test('MarketNewsModel: getStoryById e getMarketSessionInfo operam corretamente', () => {
  const story = MarketNewsModel.getStoryById('story-hero-fed');
  assert.ok(story);
  assert.equal(story.title, 'Fed mantém juros e sinaliza cautela com próximos passos');

  const wlStory = MarketNewsModel.getStoryById('wl-story-1');
  assert.ok(wlStory);
  assert.equal(wlStory.tickers[0], 'NVDA');

  const session = MarketNewsModel.getMarketSessionInfo();
  assert.ok(typeof session.isOpen === 'boolean');
  assert.ok(session.statusLabel.includes('Mercado'));
});

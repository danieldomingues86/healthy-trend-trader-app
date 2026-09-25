(function (root, factory) {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  if (root) root.HealthyTrendInstruments = catalog;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MARKETS = ['Ações', 'Futuros', 'BDR', 'FII', 'Cripto', 'Forex', 'Outros'];
  const INSTRUMENTS = [
    // Base local para que o seletor continue útil enquanto o cache de Força Relativa é atualizado.
    // A lista dinâmica complementa estes instrumentos; a classificação permanece centralizada aqui.
    { symbol: 'WEGE3', name: 'WEG', market: 'Ações' },
    { symbol: 'PETR4', name: 'Petrobras PN', market: 'Ações' },
    { symbol: 'VALE3', name: 'Vale ON', market: 'Ações' },
    { symbol: 'BBAS3', name: 'Banco do Brasil ON', market: 'Ações' },
    { symbol: 'ITUB4', name: 'Itaú Unibanco PN', market: 'Ações' },
    { symbol: 'BBDC4', name: 'Bradesco PN', market: 'Ações' },
    { symbol: 'MGLU3', name: 'Magazine Luiza ON', market: 'Ações' },
    { symbol: 'UGPA3', name: 'Ultrapar ON', market: 'Ações' },
    { symbol: 'PRIO3', name: 'PRIO ON', market: 'Ações' },
    { symbol: 'FLRY3', name: 'Fleury ON', market: 'Ações' },
    { symbol: 'WDO', name: 'Mini Dólar', market: 'Futuros' },
    { symbol: 'WIN', name: 'Mini Índice', market: 'Futuros' },
    { symbol: 'CCM', name: 'Milho', market: 'Futuros' },
    { symbol: 'BGI', name: 'Boi Gordo', market: 'Futuros' },
    { symbol: 'ICF', name: 'Café Arábica', market: 'Futuros' },
    { symbol: 'OZ', name: 'Ouro', market: 'Futuros' },
    { symbol: 'DOL', name: 'Dólar Comercial', market: 'Futuros' },
    { symbol: 'IND', name: 'Ibovespa Futuro', market: 'Futuros' },
    { symbol: 'ROXO34', name: 'Nu Holdings', market: 'BDR' },
    { symbol: 'MELI34', name: 'MercadoLibre', market: 'BDR' },
    { symbol: 'M1TA34', name: 'Meta Platforms', market: 'BDR' },
    { symbol: 'NVDC34', name: 'NVIDIA', market: 'BDR' },
    { symbol: 'TSLA34', name: 'Tesla', market: 'BDR' },
    { symbol: 'ITLC34', name: 'Intel', market: 'BDR' },
    { symbol: 'AMZO34', name: 'Amazon', market: 'BDR' },
    { symbol: 'GOGL34', name: 'Alphabet', market: 'BDR' },
    { symbol: 'MSFT34', name: 'Microsoft', market: 'BDR' },
    { symbol: 'M2ST34', name: 'MicroStrategy', market: 'BDR' },
    { symbol: 'SPCX34', name: 'SpaceX / Destiny', market: 'BDR' },
    { symbol: 'TSMC34', name: 'TSMC', market: 'BDR' },
    { symbol: 'P2LT34', name: 'Palantir', market: 'BDR' },
    { symbol: 'ORCL34', name: 'Oracle', market: 'BDR' },
    { symbol: 'MUTC34', name: 'Micron Technology', market: 'BDR' },
    { symbol: 'AAPL34', name: 'Apple', market: 'BDR' },
    { symbol: 'NFLX34', name: 'Netflix', market: 'BDR' },
    { symbol: 'BABA34', name: 'Alibaba', market: 'BDR' },
    { symbol: 'LILY34', name: 'Eli Lilly', market: 'BDR' },
    { symbol: 'A1MD34', name: 'AMD', market: 'BDR' },
    { symbol: 'JPMC34', name: 'JPMorgan Chase', market: 'BDR' },
    { symbol: 'AVGO34', name: 'Broadcom', market: 'BDR' },
    { symbol: 'BOAC34', name: 'Bank of America', market: 'BDR' },
    { symbol: 'C2OI34', name: 'Coinbase', market: 'BDR' },
    { symbol: 'COCA34', name: 'Coca-Cola', market: 'BDR' },
    { symbol: 'BERK34', name: 'Berkshire Hathaway', market: 'BDR' },
    { symbol: 'BKNG34', name: 'Booking Holdings', market: 'BDR' },
    { symbol: 'S2GM34', name: 'Sigma Lithium', market: 'BDR' },
    { symbol: 'NIKE34', name: 'Nike', market: 'BDR' },
    { symbol: 'WALM34', name: 'Walmart', market: 'BDR' },
    { symbol: 'JNJB34', name: 'Johnson & Johnson', market: 'BDR' },
    { symbol: 'DISB34', name: 'Walt Disney', market: 'BDR' },
    { symbol: 'PAGS34', name: 'PagSeguro', market: 'BDR' },
    { symbol: 'CHVX34', name: 'Chevron', market: 'BDR' },
    { symbol: 'HGLG11', name: 'CSHG Logística', market: 'FII' },
    { symbol: 'KNRI11', name: 'Kinea Renda Imobiliária', market: 'FII' },
    { symbol: 'VISC11', name: 'Vinci Shopping Centers', market: 'FII' },
    { symbol: 'XPLG11', name: 'XP Log', market: 'FII' },
    { symbol: 'BTC', name: 'Bitcoin', market: 'Cripto' },
    { symbol: 'ETH', name: 'Ethereum', market: 'Cripto' },
    { symbol: 'SOL', name: 'Solana', market: 'Cripto' },
    { symbol: 'USD-BRL', name: 'Dólar / Real', market: 'Forex' },
    { symbol: 'EUR-USD', name: 'Euro / Dólar', market: 'Forex' },
    { symbol: 'GBP-USD', name: 'Libra / Dólar', market: 'Forex' },
    { symbol: 'IBOV', name: 'Ibovespa', market: 'Outros' },
    { symbol: 'DXY', name: 'Dollar Index', market: 'Outros' }
  ];

  const normalizeSymbol = value => String(value || '').trim().toUpperCase();
  const normalizeMarket = value => String(value || '').trim();
  const futureFamily = value => {
    const symbol = normalizeSymbol(value);
    const match = symbol.match(/^([A-Z0-9]{2,12}?)(?:FUT|[FGHJKMNQUVXZ]\d{1,2})$/);
    return match ? match[1] : symbol;
  };
  function assetFamily(symbol, market) {
    const normalized = normalizeSymbol(symbol);
    return normalizeMarket(market) === 'Futuros' ? futureFamily(normalized) : normalized;
  }
  function matchesBlacklistRule(tradeAsset, blacklistEntry) {
    const tradeMarket = normalizeMarket(tradeAsset && tradeAsset.market);
    const ruleMarket = normalizeMarket(blacklistEntry && blacklistEntry.market);
    const tradeSymbol = normalizeSymbol(tradeAsset && tradeAsset.symbol);
    const ruleSymbol = normalizeSymbol(blacklistEntry && blacklistEntry.symbol);
    if (!tradeSymbol || !ruleSymbol || !tradeMarket || tradeMarket !== ruleMarket) return false;
    if (tradeSymbol === ruleSymbol) return true;
    if (tradeMarket !== 'Futuros') return false;
    return assetFamily(tradeSymbol, tradeMarket) === assetFamily(ruleSymbol, ruleMarket);
  }
  const normalize = (item, defaultMarket) => {
    const symbol = normalizeSymbol(item && item.symbol);
    if (!symbol) return null;
    return { ...item, symbol, name: String(item.name || symbol).trim(), market: item.market || defaultMarket || '' };
  };
  function forMarket(market, dynamicItems = []) {
    const selected = String(market || '').trim();
    const merged = new Map();
    INSTRUMENTS.concat(dynamicItems.map(item => normalize(item, 'Ações')).filter(Boolean)).forEach(item => {
      if (item.market === selected) merged.set(item.symbol, item);
    });
    return [...merged.values()].sort((left, right) => left.symbol.localeCompare(right.symbol, 'pt-BR'));
  }
  function find(symbol, market, dynamicItems = []) {
    const items = forMarket(market, dynamicItems);
    const exact = items.find(item => item.symbol === normalizeSymbol(symbol));
    if (exact) return exact;
    if (normalizeMarket(market) !== 'Futuros') return null;
    return items.find(item => matchesBlacklistRule({ symbol, market }, item)) || null;
  }
  function belongsToMarket(symbol, market, dynamicItems = []) {
    return Boolean(find(symbol, market, dynamicItems));
  }

  return { MARKETS, INSTRUMENTS, normalizeSymbol, assetFamily, matchesBlacklistRule, normalize, forMarket, find, belongsToMarket };
});

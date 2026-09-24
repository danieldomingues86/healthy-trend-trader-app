(function (root, factory) {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  if (root) root.HealthyTrendInstruments = catalog;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MARKETS = ['Ações', 'Futuros', 'BDR', 'FII', 'Cripto', 'Forex', 'Outros'];
  const INSTRUMENTS = [
    { symbol: 'WDO', name: 'Mini Dólar', market: 'Futuros' },
    { symbol: 'WIN', name: 'Mini Índice', market: 'Futuros' },
    { symbol: 'CCM', name: 'Milho', market: 'Futuros' },
    { symbol: 'BGI', name: 'Boi Gordo', market: 'Futuros' },
    { symbol: 'ICF', name: 'Café Arábica', market: 'Futuros' },
    { symbol: 'OZ', name: 'Ouro', market: 'Futuros' },
    { symbol: 'DOL', name: 'Dólar Comercial', market: 'Futuros' },
    { symbol: 'IND', name: 'Ibovespa Futuro', market: 'Futuros' },
    { symbol: 'AAPL34', name: 'Apple', market: 'BDR' },
    { symbol: 'AMZO34', name: 'Amazon', market: 'BDR' },
    { symbol: 'GOGL34', name: 'Alphabet', market: 'BDR' },
    { symbol: 'MSFT34', name: 'Microsoft', market: 'BDR' },
    { symbol: 'NVDC34', name: 'NVIDIA', market: 'BDR' },
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
    return forMarket(market, dynamicItems).find(item => item.symbol === normalizeSymbol(symbol)) || null;
  }
  function belongsToMarket(symbol, market, dynamicItems = []) {
    return Boolean(find(symbol, market, dynamicItems));
  }

  return { MARKETS, INSTRUMENTS, normalizeSymbol, normalize, forMarket, find, belongsToMarket };
});

// Minimum stock/unit coverage requested by the product owner. Prices are never seeded here.
const REQUIRED_STOCK_SYMBOLS = `SLCE3 BRKM5 RECV3 EMBJ3 CMIN3 PRIO3 YDUQ3 PETR3 PETR4 BRAV3 USIM5 CSNA3 SUZB3 KLBN11 TIMS3 VALE3 VIVT3 AXIA6 RDOR3 FLRY3 RAIL3 UGPA3 AURE3 BEEF3 EGIE3 SBSP3 GOAU4 VBBR3 NATU3 BRAP4 ASAI3 GGBR4 EQTL3 ENGI11 HAPV3 HYPE3 BBAS3 TAEE11 BBDC3 PSSA3 ABEV3 MOTV3 CPLE3 ITSA4 ISAE4 ITUB4 CURY3 CYRE3 MGLU3 ENEV3 CSMG3 AXIA7 BBDC4 MULT3 BBSE3 TOTS3 SMFT3 CYRE4 IRBR3 CPFE3 AXIA3 RENT4 CXSE3 POMO4 IGTI11 LREN3 VIVA3 WEGE3 B3SA3 CSAN3 CMIG4 ALOS3 BPAC11 MBRF3 RENT3 COGN3 SANB11 CEAB3 RADL3 MRVE3 DIRR3 AZZA3 VAMO3`.split(/\s+/);
function stockUniverse(metadata, indexSymbols = []) {
  const discovered = [...metadata].filter(([symbol, item]) => item.type === 'stock' && /^[A-Z]{4}(3|4|5|6|7|8|11)$/.test(symbol) && !['fii','etf','bdr'].includes(item.subType)).map(([symbol]) => symbol);
  return [...new Set([...REQUIRED_STOCK_SYMBOLS, ...indexSymbols, ...discovered])].sort();
}
function splitStockUniverse(symbols, ibovSymbols, smallCapSymbols) {
  const ibov = new Set(ibovSymbols);
  const small = new Set(smallCapSymbols.filter((symbol) => !ibov.has(symbol)));
  return {
    ibov: symbols.filter((symbol) => ibov.has(symbol)),
    small: symbols.filter((symbol) => small.has(symbol)),
    other: symbols.filter((symbol) => !ibov.has(symbol) && !small.has(symbol))
  };
}
module.exports = { REQUIRED_STOCK_SYMBOLS, stockUniverse, splitStockUniverse };

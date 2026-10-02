'use strict';

/**
 * Nasdaq-100 Universe Entity & Composition.
 * Supports active constituents, sectors, metadata and temporal composition validity (validFrom, validTo).
 */
class MarketUniverse {
  constructor(name, benchmark, constituents = []) {
    this.name = name;
    this.benchmark = benchmark;
    this.constituents = constituents;
  }

  getConstituents(asOfDate = null) {
    if (!asOfDate) {
      return this.constituents.filter(item => item.active !== false);
    }
    const target = new Date(asOfDate).getTime();
    return this.constituents.filter(item => {
      const from = item.validFrom ? new Date(item.validFrom).getTime() : -Infinity;
      const to = item.validTo ? new Date(item.validTo).getTime() : Infinity;
      return target >= from && target <= to;
    });
  }

  getSymbols(asOfDate = null) {
    return this.getConstituents(asOfDate).map(c => c.symbol);
  }

  getBenchmark() {
    return this.benchmark;
  }

  getSymbolMeta(symbol) {
    const clean = String(symbol || '').trim().toUpperCase();
    if (clean === this.benchmark.symbol) return this.benchmark;
    return this.constituents.find(c => c.symbol === clean) || {
      symbol: clean,
      companyName: clean,
      exchange: 'NASDAQ',
      sector: 'Não classificado',
      active: true
    };
  }
}

const BENCHMARK_QQQ = {
  symbol: 'QQQ',
  companyName: 'Invesco QQQ Trust (Nasdaq-100 Index)',
  exchange: 'NASDAQ',
  sector: 'Índice Benchmark',
  active: true,
  isBenchmark: true
};

const NASDAQ_100_CONSTITUENTS = [
  { symbol: 'NVDA', companyName: 'NVIDIA Corporation', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'AVGO', companyName: 'Broadcom Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'TSLA', companyName: 'Tesla Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'PLTR', companyName: 'Palantir Technologies Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'AAPL', companyName: 'Apple Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'MSFT', companyName: 'Microsoft Corporation', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'AMZN', companyName: 'Amazon.com Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'META', companyName: 'Meta Platforms Inc.', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'GOOGL', companyName: 'Alphabet Inc. (Class A)', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'GOOG', companyName: 'Alphabet Inc. (Class C)', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'COST', companyName: 'Costco Wholesale Corporation', sector: 'Consumo Básico', exchange: 'NASDAQ', active: true },
  { symbol: 'AMD', companyName: 'Advanced Micro Devices Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'NFLX', companyName: 'Netflix Inc.', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'PEP', companyName: 'PepsiCo Inc.', sector: 'Consumo Básico', exchange: 'NASDAQ', active: true },
  { symbol: 'LIN', companyName: 'Linde plc', sector: 'Materiais Básicos', exchange: 'NASDAQ', active: true },
  { symbol: 'CSCO', companyName: 'Cisco Systems Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'TMUS', companyName: 'T-Mobile US Inc.', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'QCOM', companyName: 'QUALCOMM Incorporated', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'INTU', companyName: 'Intuit Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'TXN', companyName: 'Texas Instruments Incorporated', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'AMAT', companyName: 'Applied Materials Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'ISRG', companyName: 'Intuitive Surgical Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'BKNG', companyName: 'Booking Holdings Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'HON', companyName: 'Honeywell International Inc.', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'VRTX', companyName: 'Vertex Pharmaceuticals Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'CMCSA', companyName: 'Comcast Corporation', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'ADP', companyName: 'Automatic Data Processing Inc.', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'PANW', companyName: 'Palo Alto Networks Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'AMGN', companyName: 'Amgen Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'LRCX', companyName: 'Lam Research Corporation', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'ADI', companyName: 'Analog Devices Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'MU', companyName: 'Micron Technology Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'GILD', companyName: 'Gilead Sciences Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'MELI', companyName: 'MercadoLibre Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'KLAC', companyName: 'KLA Corporation', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'SBUX', companyName: 'Starbucks Corporation', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'CRWD', companyName: 'CrowdStrike Holdings Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'MDLZ', companyName: 'Mondelez International Inc.', sector: 'Consumo Básico', exchange: 'NASDAQ', active: true },
  { symbol: 'REGN', companyName: 'Regeneron Pharmaceuticals Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'SNPS', companyName: 'Synopsys Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'CDNS', companyName: 'Cadence Design Systems Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'ASML', companyName: 'ASML Holding N.V.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'ABNB', companyName: 'Airbnb Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'CEG', companyName: 'Constellation Energy Corporation', sector: 'Utilities', exchange: 'NASDAQ', active: true },
  { symbol: 'CTAS', companyName: 'Cintas Corporation', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'MAR', companyName: 'Marriott International Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'DASH', companyName: 'DoorDash Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'PYPL', companyName: 'PayPal Holdings Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'ORLY', companyName: "O'Reilly Automotive Inc.", sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'PCAR', companyName: 'PACCAR Inc.', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'NXPI', companyName: 'NXP Semiconductors N.V.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'KDP', companyName: 'Keurig Dr Pepper Inc.', sector: 'Consumo Básico', exchange: 'NASDAQ', active: true },
  { symbol: 'MNST', companyName: 'Monster Beverage Corporation', sector: 'Consumo Básico', exchange: 'NASDAQ', active: true },
  { symbol: 'ROP', companyName: 'Roper Technologies Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'MCHP', companyName: 'Microchip Technology Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'LULU', companyName: 'Lululemon Athletica Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'ADSK', companyName: 'Autodesk Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'DXCM', companyName: 'DexCom Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'IDXX', companyName: 'IDEXX Laboratories Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'PAYX', companyName: 'Paychex Inc.', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'ROST', companyName: 'Ross Stores Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'KHC', companyName: 'The Kraft Heinz Company', sector: 'Consumo Básico', exchange: 'NASDAQ', active: true },
  { symbol: 'FTNT', companyName: 'Fortinet Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'CPRT', companyName: 'Copart Inc.', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'TEAM', companyName: 'Atlassian Corporation', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'CHTR', companyName: 'Charter Communications Inc.', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'FAST', companyName: 'Fastenal Company', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'EXC', companyName: 'Exelon Corporation', sector: 'Utilities', exchange: 'NASDAQ', active: true },
  { symbol: 'BIIB', companyName: 'Biogen Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'ODFL', companyName: 'Old Dominion Freight Line Inc.', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'GEHC', companyName: 'GE HealthCare Technologies Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'CSX', companyName: 'CSX Corporation', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'VRSK', companyName: 'Verisk Analytics Inc.', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'DDOG', companyName: 'Datadog Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'WBD', companyName: 'Warner Bros. Discovery Inc.', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'TER', companyName: 'Teradyne Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'DLTR', companyName: 'Dollar Tree Inc.', sector: 'Consumo Básico', exchange: 'NASDAQ', active: true },
  { symbol: 'TTWO', companyName: 'Take-Two Interactive Software Inc.', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'MDB', companyName: 'MongoDB Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'ILMN', companyName: 'Illumina Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'ZS', companyName: 'Zscaler Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'ON', companyName: 'ON Semiconductor Corporation', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'CDW', companyName: 'CDW Corporation', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'MRNA', companyName: 'Moderna Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'BMRN', companyName: 'BioMarin Pharmaceutical Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'ALGN', companyName: 'Align Technology Inc.', sector: 'Saúde', exchange: 'NASDAQ', active: true },
  { symbol: 'SIRI', companyName: 'Sirius XM Holdings Inc.', sector: 'Comunicação', exchange: 'NASDAQ', active: true },
  { symbol: 'FANG', companyName: 'Diamondback Energy Inc.', sector: 'Energia', exchange: 'NASDAQ', active: true },
  { symbol: 'CCEP', companyName: 'Coca-Cola Europacific Partners plc', sector: 'Consumo Básico', exchange: 'NASDAQ', active: true },
  { symbol: 'AXON', companyName: 'Axon Enterprise Inc.', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'APP', companyName: 'AppLovin Corporation', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'ARM', companyName: 'Arm Holdings plc', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'MSTR', companyName: 'MicroStrategy Incorporated', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'TTD', companyName: 'The Trade Desk Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'PDD', companyName: 'PDD Holdings Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'GFS', companyName: 'GlobalFoundries Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'VRT', companyName: 'Vertiv Holdings Co', sector: 'Industriais', exchange: 'NASDAQ', active: true },
  { symbol: 'MPWR', companyName: 'Monolithic Power Systems Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'SMCI', companyName: 'Super Micro Computer Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true },
  { symbol: 'MELI', companyName: 'MercadoLibre Inc.', sector: 'Consumo Discricionário', exchange: 'NASDAQ', active: true },
  { symbol: 'WDAY', companyName: 'Workday Inc.', sector: 'Tecnologia', exchange: 'NASDAQ', active: true }
];

// Deduplicate symbols
const seen = new Set();
const uniqueConstituents = NASDAQ_100_CONSTITUENTS.filter(item => {
  if (seen.has(item.symbol)) return false;
  seen.add(item.symbol);
  return true;
});

const NASDAQ_100_UNIVERSE = new MarketUniverse('NASDAQ_100', BENCHMARK_QQQ, uniqueConstituents);

module.exports = {
  MarketUniverse,
  NASDAQ_100_UNIVERSE,
  BENCHMARK_QQQ,
  NASDAQ_100_CONSTITUENTS: uniqueConstituents
};

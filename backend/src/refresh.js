require('./env');
const { refreshMarketData } = require('./market-data');
refreshMarketData({ force: true, fallback: false }).then((cache) => console.log(`Cache atualizado: ${cache.universe.available}/${cache.universe.requested} ativos.`)).catch((error) => { console.error(error); process.exitCode = 1; });

require('./env');
const http = require('node:http');
const { URL } = require('node:url');
const { readCache, refreshIfDue } = require('./market-data');
const { PLAN_CATALOG } = require('./subscription-plans');
const { fetchFundamentals } = require('./fundamentals');

const port = Number(process.env.PORT || 8787);
function send(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' }); response.end(JSON.stringify(body)); }
function page(rows, query) { const page = Math.max(1, Number(query.get('page')) || 1); const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 50)); const search = (query.get('search') || '').toUpperCase(); const filtered = rows.filter((row) => !search || row.symbol.includes(search)); return { items: filtered.slice((page - 1) * limit, page * limit), page, limit, total: filtered.length }; }
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method !== 'GET') return send(response, 405, { error: 'Method not allowed' });
  try {
    if (url.pathname === '/api/subscription/plans') return send(response, 200, { currency: 'BRL', plans: PLAN_CATALOG });
    if (url.pathname === '/api/fundamentals') return send(response, 200, await fetchFundamentals(url.searchParams.get('ticker')));
    const cache = await refreshIfDue();
    if (url.pathname === '/api/health') return send(response, 200, { status: 'ok', cachedAt: cache?.updatedAt || null, brapiTokenConfigured: Boolean(process.env.BRAPI_TOKEN) });
    if (!cache) return send(response, 503, { error: 'Dados ainda não disponíveis. Execute a primeira atualização após configurar BRAPI_TOKEN.' });
    if (url.pathname === '/api/market-cycle') return send(response, 200, { updatedAt: cache.updatedAt, source: cache.source, cycle: cache.cycle, benchmark: cache.benchmark });
    if (url.pathname === '/api/market-overview') return send(response, 200, { updatedAt: cache.updatedAt, source: cache.source, universe: cache.universe, cycle: cache.cycle, benchmark: cache.benchmark, overview: cache.overview });
    if (url.pathname === '/api/relative-strength') return send(response, 200, { updatedAt: cache.updatedAt, benchmark: cache.benchmark.symbol, universe: cache.universe, ...page(cache.relativeStrength, url.searchParams) });
    return send(response, 404, { error: 'Not found' });
  } catch (error) { console.error(error); return send(response, 502, { error: 'Falha ao consultar os dados solicitados', detail: error.message }); }
});
server.listen(port, () => console.log(`Market data API em http://localhost:${port}`));
setInterval(() => refreshIfDue().catch((error) => console.error('[scheduler]', error.message)), 60 * 60 * 1000);
refreshIfDue().catch((error) => console.error('[startup]', error.message));

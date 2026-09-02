require('./env');
const http = require('node:http');
const { URL } = require('node:url');
const { readCache, refreshIfDue } = require('./market-data');
const { PLAN_CATALOG } = require('./subscription-plans');
const { fetchFundamentals } = require('./fundamentals');
const database = require('./database');
const auth = require('./auth');
const trades = require('./trades');
const wealth = require('./wealth');
const riskPolicy = require('./risk-policy');
const platformAccess = require('./platform-access');
const profitMonitor = require('./profit-monitor');

const port = Number(process.env.PORT || 8787);
function send(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS' }); response.end(JSON.stringify(body)); }
function page(rows, query) { const page = Math.max(1, Number(query.get('page')) || 1); const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 50)); const search = (query.get('search') || '').toUpperCase(); const filtered = rows.filter((row) => !search || row.symbol.includes(search)); return { items: filtered.slice((page - 1) * limit, page * limit), page, limit, total: filtered.length }; }

async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > 100_000) { const error = new Error('Payload muito grande'); error.status = 413; throw error; } chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new Error('JSON inválido'); }
}
function bearer(request) { return request.headers.authorization?.replace(/^Bearer\s+/i, '') || ''; }

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === 'OPTIONS') return send(response, 204, {});
  try {
    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      if (!database.configured()) return send(response, 503, { error: 'Autenticação ainda não configurada no servidor.' });
      const credentials = await body(request);
      const session = await auth.login(credentials.email, credentials.password);
      return session ? send(response, 200, session) : send(response, 401, { error: 'E-mail ou senha inválidos.' });
    }
    if (request.method === 'GET' && url.pathname === '/api/auth/me') {
      if (!database.configured()) return send(response, 503, { error: 'Autenticação ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      return user ? send(response, 200, { user }) : send(response, 401, { error: 'Sessão inválida ou expirada.' });
    }
    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      if (database.configured()) await auth.logout(bearer(request));
      return send(response, 200, { ok: true });
    }
    if (request.method === 'POST' && url.pathname === '/api/platform-access/sessions') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 201, await platformAccess.start(user.id, await body(request)));
    }
    const platformAccessSessionMatch = url.pathname.match(/^\/api\/platform-access\/sessions\/([^/]+)\/(heartbeat|close)$/);
    if (request.method === 'POST' && platformAccessSessionMatch) {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      const [, sessionId, action] = platformAccessSessionMatch;
      const session = action === 'heartbeat' ? await platformAccess.heartbeat(user.id, sessionId) : await platformAccess.close(user.id, sessionId);
      return send(response, 200, { session });
    }
    if (request.method === 'GET' && url.pathname === '/api/platform-access/sessions') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { sessions: await platformAccess.list(user.id, url.searchParams.get('days')) });
    }
    if (request.method === 'GET' && url.pathname === '/api/platform-access/preferences') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { preferences: await platformAccess.preferences(user.id) });
    }
    if (request.method === 'PUT' && url.pathname === '/api/platform-access/preferences') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { preferences: await platformAccess.savePreferences(user.id, await body(request)) });
    }
    if (request.method === 'POST' && url.pathname === '/api/platform-access/monitor/start') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { monitor: await profitMonitor.start(user.id) });
    }
    if (request.method === 'POST' && url.pathname === '/api/platform-access/monitor/stop') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      profitMonitor.stop(user.id);
      return send(response, 200, { monitor: profitMonitor.status(user.id) });
    }
    if (request.method === 'GET' && url.pathname === '/api/platform-access/monitor') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { monitor: profitMonitor.status(user.id) });
    }
    if (request.method === 'POST' && url.pathname === '/api/trades') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      const trade = await trades.createPlan(user.id, await body(request));
      return send(response, 201, { trade });
    }
    if (request.method === 'GET' && url.pathname === '/api/trades') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { trades: await trades.listPlans(user.id) });
    }
    if (request.method === 'GET' && url.pathname === '/api/wealth') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, await wealth.list(user.id));
    }
    if (request.method === 'GET' && url.pathname === '/api/risk-policy') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, await riskPolicy.get(user.id));
    }
    if (request.method === 'PUT' && url.pathname === '/api/risk-policy') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, await riskPolicy.save(user.id, await body(request)));
    }
    if (request.method === 'POST' && url.pathname === '/api/wealth/movements') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 201, { movement: await wealth.createMovement(user.id, await body(request)) });
    }
    if (request.method === 'POST' && url.pathname === '/api/wealth/allocations') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 201, { allocation: await wealth.createAllocation(user.id, await body(request)) });
    }
    const allocationMatch = url.pathname.match(/^\/api\/wealth\/allocations\/([^/]+)$/);
    if (request.method === 'PUT' && allocationMatch) {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { allocation: await wealth.updateAllocation(user.id, allocationMatch[1], await body(request)) });
    }
    const eventMatch = url.pathname.match(/^\/api\/trades\/([^/]+)\/events$/);
    if (request.method === 'POST' && eventMatch) {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      const payload = await body(request);
      const event = await trades.recordPositionEvent(user.id, eventMatch[1], payload.type, payload);
      return send(response, 201, { event });
    }
    const executionMatch = url.pathname.match(/^\/api\/trades\/([^/]+)\/execute$/);
    if (request.method === 'POST' && executionMatch) {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      const trade = await trades.executePlan(user.id, executionMatch[1], await body(request));
      return send(response, 200, { trade });
    }
    if (request.method !== 'GET') return send(response, 405, { error: 'Method not allowed' });
    if (url.pathname === '/api/subscription/plans') return send(response, 200, { currency: 'BRL', plans: PLAN_CATALOG });
    if (url.pathname === '/api/fundamentals') return send(response, 200, await fetchFundamentals(url.searchParams.get('ticker')));
    const cache = await refreshIfDue();
    if (url.pathname === '/api/health') return send(response, 200, { status: 'ok', cachedAt: cache?.updatedAt || null, brapiTokenConfigured: Boolean(process.env.BRAPI_TOKEN), databaseConfigured: database.configured() });
    if (!cache) return send(response, 503, { error: 'Dados ainda não disponíveis. Execute a primeira atualização após configurar BRAPI_TOKEN.' });
    if (url.pathname === '/api/market-cycle') return send(response, 200, { updatedAt: cache.updatedAt, source: cache.source, cycle: cache.cycle, benchmark: cache.benchmark });
    if (url.pathname === '/api/market-overview') return send(response, 200, { updatedAt: cache.updatedAt, source: cache.source, universe: cache.universe, cycle: cache.cycle, benchmark: cache.benchmark, overview: cache.overview });
    if (url.pathname === '/api/relative-strength') return send(response, 200, { updatedAt: cache.updatedAt, benchmark: cache.benchmark.symbol, universe: cache.universe, ...page(cache.relativeStrength, url.searchParams) });
    return send(response, 404, { error: 'Not found' });
  } catch (error) { console.error(error); return send(response, error.status || 502, { error: error.status ? error.message : 'Falha ao consultar os dados solicitados', detail: error.message }); }
});
server.listen(port, async () => {
  try { await database.migrate(); await auth.ensureAdmin(); } catch (error) { console.error(`[database] ${error.message}`); }
  console.log(`Market data API em http://localhost:${port}`);
});
setInterval(() => refreshIfDue().catch((error) => console.error('[scheduler]', error.message)), 60 * 60 * 1000);
refreshIfDue().catch((error) => console.error('[startup]', error.message));

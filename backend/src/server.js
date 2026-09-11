require('./env');
const http = require('node:http');
const { URL } = require('node:url');
const fs = require('node:fs/promises');
const path = require('node:path');
const { readCache, refreshIfDue, refreshClassStrength, refreshLiveScanQuotes, marketDataStatus, classStrengthFromCache, classifyAsset } = require('./market-data');
const { marketScansFromCache } = require('./market-scans');
const { PLAN_CATALOG } = require('./subscription-plans');
const { fetchFundamentals } = require('./fundamentals');
const { refreshFundamentusIfDue } = require('./fundamentus');
const database = require('./database');
const auth = require('./auth');
const trades = require('./trades');
const wealth = require('./wealth');
const riskPolicy = require('./risk-policy');
const platformAccess = require('./platform-access');
const profitMonitor = require('./profit-monitor');
const workspaceState = require('./workspace-state');
const materials = require('./materials');
const watchlist = require('./watchlist');
const journalAttachments = require('./journal-attachments');
const zenPractices = require('./zen-practices');
const habits = require('./habits');

const port = Number(process.env.PORT || 8787);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-File-Name, X-Journal-Record', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' };
function send(response, status, body) { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...cors }); response.end(JSON.stringify(body)); }
function sendFile(response, status, bytes, type, name) {
  const contentType = type || 'application/octet-stream';
  const disposition = /^(image|audio|video)\//.test(contentType) || contentType === 'application/pdf' ? 'inline' : 'attachment';
  response.writeHead(status, { 'Content-Type': contentType, 'Content-Length': bytes.length, 'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, max-age=300', ...cors }); response.end(bytes);
}
function page(rows, query) { const page = Math.max(1, Number(query.get('page')) || 1); const limit = Math.min(100, Math.max(1, Number(query.get('limit')) || 50)); const search = (query.get('search') || '').toUpperCase(); const filtered = rows.filter((row) => !search || row.symbol.includes(search)); return { items: filtered.slice((page - 1) * limit, page * limit), page, limit, total: filtered.length }; }

async function listTraderWisdomAssets() {
  const root = path.join(__dirname, '..', '..', 'assets', 'trader-wisdom');
  async function walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]));
    return nested.flat();
  }
  const files = await walk(root);
  return files.filter((file) => /\.(jpe?g|png|webp)$/i.test(file)).map((file) => path.relative(path.join(__dirname, '..', '..'), file).split(path.sep).join('/')).sort();
}

async function body(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > 1_000_000) { const error = new Error('Payload muito grande'); error.status = 413; throw error; } chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new Error('JSON inválido'); }
}
async function binaryBody(request, maxBytes = journalAttachments.MAX_BYTES) {
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > maxBytes) { const error = new Error('O arquivo ultrapassa o limite de 20 MB.'); error.status = 413; throw error; } chunks.push(chunk); }
  return Buffer.concat(chunks);
}
function bearer(request) { return request.headers.authorization?.replace(/^Bearer\s+/i, '') || ''; }
function headerText(value) {
  try { return decodeURIComponent(String(value || '')); }
  catch { const error = new Error('Cabeçalho de arquivo inválido.'); error.status = 400; throw error; }
}

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
    if (request.method === 'POST' && url.pathname === '/api/auth/register') {
      if (!database.configured()) return send(response, 503, { error: 'Cadastro ainda não configurado no servidor.' });
      return send(response, 201, await auth.register(await body(request)));
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
    if (request.method === 'GET' && url.pathname === '/api/workspace-state') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { state: await workspaceState.get(user.id) });
    }
    const workspaceStateMatch = url.pathname.match(/^\/api\/workspace-state\/([^/]+)$/);
    if (workspaceStateMatch && request.method === 'PUT') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { state: await workspaceState.save(user.id, workspaceStateMatch[1], (await body(request)).value) });
    }
    if (workspaceStateMatch && request.method === 'DELETE') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { state: await workspaceState.remove(user.id, workspaceStateMatch[1]) });
    }
    if (request.method === 'GET' && url.pathname === '/api/habits') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request)); if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, await habits.list(user.id));
    }
    if (request.method === 'POST' && url.pathname === '/api/habits') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request)); if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 201, { habit: await habits.save(user.id, await body(request)) });
    }
    if (request.method === 'POST' && url.pathname === '/api/habits/migrate') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request)); if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, await habits.migrate(user.id, (await body(request)).state));
    }
    const habitMatch = url.pathname.match(/^\/api\/habits\/([^/]+)$/);
    if (habitMatch && request.method === 'PUT') { if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' }); const user = await auth.session(bearer(request)); if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' }); return send(response, 200, { habit: await habits.save(user.id, { ...(await body(request)), id: habitMatch[1] }) }); }
    if (habitMatch && request.method === 'DELETE') { if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' }); const user = await auth.session(bearer(request)); if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' }); return send(response, 200, { habit: await habits.remove(user.id, habitMatch[1]) }); }
    const habitCheckinMatch = url.pathname.match(/^\/api\/habits\/([^/]+)\/checkins$/);
    if (habitCheckinMatch && request.method === 'PUT') { if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' }); const user = await auth.session(bearer(request)); if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' }); return send(response, 200, { checkin: await habits.checkin(user.id, habitCheckinMatch[1], await body(request)) }); }
    if (request.method === 'PUT' && url.pathname === '/api/habits/ignored-days') { if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' }); const user = await auth.session(bearer(request)); if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' }); return send(response, 200, { ignoredDay: await habits.ignoredDay(user.id, await body(request)) }); }
    if (request.method === 'GET' && url.pathname === '/api/zen-practices/summary') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { summary: await zenPractices.summary(user.id) });
    }
    if (request.method === 'POST' && url.pathname === '/api/zen-practices/sessions') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 201, { session: await zenPractices.start(user.id, await body(request)) });
    }
    const zenSessionMatch = url.pathname.match(/^\/api\/zen-practices\/sessions\/([^/]+)\/complete$/);
    if (zenSessionMatch && request.method === 'POST') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { session: await zenPractices.complete(user.id, zenSessionMatch[1]) });
    }
    const attachmentContentMatch = url.pathname.match(/^\/api\/journal-attachments\/([^/]+)\/content$/);
    if (attachmentContentMatch && request.method === 'GET') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      const file = await journalAttachments.content(user.id, attachmentContentMatch[1]);
      return sendFile(response, 200, file.bytes, file.content_type, file.original_name);
    }
    if (request.method === 'POST' && url.pathname === '/api/journal-attachments') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      const attachment = await journalAttachments.create(user.id, { recordId: request.headers['x-journal-record'], name: headerText(request.headers['x-file-name']), contentType: request.headers['content-type'], bytes: await binaryBody(request) });
      return send(response, 201, { attachment });
    }
    const attachmentMatch = url.pathname.match(/^\/api\/journal-attachments\/([^/]+)$/);
    if (attachmentMatch && request.method === 'DELETE') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { attachment: await journalAttachments.remove(user.id, attachmentMatch[1]) });
    }
    if (request.method === 'GET' && url.pathname === '/api/materials') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { entitlements: await materials.list(user.id) });
    }
    if (request.method === 'POST' && url.pathname === '/api/materials/entitlements') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 201, { entitlement: await materials.grant(user.id, await body(request)) });
    }
    if (request.method === 'GET' && url.pathname === '/api/watchlist') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { items: await watchlist.list(user.id) });
    }
    const watchlistMatch = url.pathname.match(/^\/api\/watchlist\/([^/]+)$/);
    if (watchlistMatch && request.method === 'PUT') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { item: await watchlist.add(user.id, watchlistMatch[1]) });
    }
    if (watchlistMatch && request.method === 'DELETE') {
      if (!database.configured()) return send(response, 503, { error: 'Persistência ainda não configurada no servidor.' });
      const user = await auth.session(bearer(request));
      if (!user) return send(response, 401, { error: 'Sessão inválida ou expirada.' });
      return send(response, 200, { item: await watchlist.remove(user.id, watchlistMatch[1]) });
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
    if (url.pathname === '/api/trader-wisdom/assets') {
      const items = await listTraderWisdomAssets();
      const pageNumber = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const limit = Math.min(48, Math.max(1, Number(url.searchParams.get('limit')) || 24));
      return send(response, 200, { items: items.slice((pageNumber - 1) * limit, pageNumber * limit), page: pageNumber, limit, total: items.length });
    }
    if (url.pathname === '/api/fundamentals') return send(response, 200, await fetchFundamentals(url.searchParams.get('ticker')));
    if (url.pathname === '/api/health') {
      const cached = await readCache();
      return send(response, 200, { status: 'ok', cachedAt: cached?.updatedAt || null, brapiTokenConfigured: Boolean(process.env.BRAPI_TOKEN), databaseConfigured: database.configured(), provider: await marketDataStatus() });
    }
    if (!['/api/market-cycle','/api/market-overview','/api/market-scans','/api/relative-strength/classes','/api/relative-strength/classify','/api/relative-strength'].includes(url.pathname)) return send(response, 404, { error: 'Not found' });
    let cache = await refreshIfDue();
    if (!cache) return send(response, 503, { error: 'Dados ainda não disponíveis. Execute a primeira atualização após configurar BRAPI_TOKEN.' });
    if (url.pathname === '/api/market-cycle') return send(response, 200, { updatedAt: cache.updatedAt, source: cache.source, cycle: cache.cycle, benchmark: cache.benchmark });
    if (url.pathname === '/api/market-overview') return send(response, 200, { updatedAt: cache.updatedAt, source: cache.source, universe: cache.universe, cycle: cache.cycle, benchmark: cache.benchmark, overview: cache.overview });
    if (url.pathname === '/api/market-scans') {
      cache = await refreshClassStrength(cache);
      cache = await refreshLiveScanQuotes(cache);
      return send(response, 200, marketScansFromCache(cache));
    }
    if (url.pathname === '/api/relative-strength/classes') {
      cache = await refreshClassStrength(cache);
      const classes = classStrengthFromCache(cache);
      return send(response, 200, { updatedAt: cache.updatedAt, source: cache.source, classes });
    }
    if (url.pathname === '/api/relative-strength/classify') return send(response, 200, classifyAsset(url.searchParams.get('ticker'), cache));
    if (url.pathname === '/api/relative-strength') {
      const assetClass = url.searchParams.get('assetClass') || 'stock';
      const classes = classStrengthFromCache(cache);
      const selected = classes[assetClass] || classes.stock;
      return send(response, 200, { updatedAt: cache.updatedAt, assetClass: selected.key, benchmark: selected.benchmark, universe: { requested: selected.requested, available: selected.available }, ...page(selected.items || [], url.searchParams) });
    }
    return send(response, 404, { error: 'Not found' });
  } catch (error) { console.error(error); return send(response, error.status || 502, { error: error.status ? error.message : 'Falha ao consultar os dados solicitados', detail: error.message }); }
});
server.listen(port, async () => {
  try { await database.migrate(); await auth.ensureAdmin(); } catch (error) { console.error(`[database] ${error.message}`); }
  console.log(`Market data API em http://localhost:${port}`);
});
setInterval(() => refreshIfDue().catch((error) => console.error('[scheduler]', error.message)), 60 * 60 * 1000);
refreshIfDue().catch((error) => console.error('[startup]', error.message));
setInterval(() => refreshFundamentusIfDue().catch((error) => console.error('[fundamentus scheduler]', error.message)), 24 * 60 * 60 * 1000);
refreshFundamentusIfDue().catch((error) => console.error('[fundamentus startup]', error.message));

'use strict';

/**
 * CAPITAL INTELLIGENCE — ORQUESTRADOR DE PIPELINE, AGENDAMENTO E API INTERNA
 *
 * Separação estrita de camadas:
 * - Ingestão: capital-intelligence-ingestion.js (jobs por mercado/fuso, retry, rate limit)
 * - Armazenamento: capital-intelligence-store.js (PostgreSQL + cache atômico em disco, idempotente)
 * - Cálculo: capital-intelligence-calculator.js (janelas 21p/63p, frescor atualizado/atrasado/indisponivel/parcial)
 * - Consumo: getSnapshotForUser / getSeries / getStatus (ZERO chamadas externas por acesso da interface)
 */

const crypto = require('node:crypto');
const { CapitalIntelligenceStore } = require('./capital-intelligence-store');
const ingestion = require('./capital-intelligence-ingestion');
const calculator = require('./capital-intelligence-calculator');
const capitalIntelligencePortfolio = require('./capital-intelligence-portfolio');
const allocationEngine = require('./capital-intelligence-allocation');

const JOB_DEFINITIONS = {
  br_ptax_macro: {
    jobKey: 'br_ptax_macro',
    market: 'BR',
    scheduleKey: 'BR_PTAX',
    description: 'Coleta BCB SGS (Dólar PTAX, Selic Meta, IPCA) após 13h30 America/Sao_Paulo'
  },
  br_market_close: {
    jobKey: 'br_market_close',
    market: 'BR',
    scheduleKey: 'BR',
    description: 'Sincroniza Ciclos B3 (IBOV, IFIX, BDRX) via market-regime.js após 18h30 America/Sao_Paulo'
  },
  us_market_close: {
    jobKey: 'us_market_close',
    market: 'US',
    scheduleKey: 'US',
    description: 'Sincroniza Ciclos EUA (SPY, QQQ), VIX (CBOE), Macro EUA (FRED) e ETFs Setoriais/Ouro (Twelve Data) após 16h45 America/New_York'
  }
};

class CapitalIntelligencePipeline {
  constructor(options = {}) {
    this.store = options.store || new CapitalIntelligenceStore(options.storeOptions);
    this.collectors = Object.assign({
      collectFromMarketRegime: ingestion.collectFromMarketRegime,
      collectBcbMacro: ingestion.collectBcbMacro,
      collectCboeVix: ingestion.collectCboeVix,
      collectFredMacro: ingestion.collectFredMacro,
      collectTwelveDataEtfs: ingestion.collectTwelveDataEtfs
    }, options.collectors || {});

    this.dependencies = Object.assign({
      wealth: null,
      trades: null,
      riskPolicy: null,
      workspaceState: null,
      eventPlaybook: null
    }, options.dependencies || {});

    this.activeJobs = new Map();
    this.schedulerTimer = null;
    this.schedulerStartedAt = null;
    this.manualRefreshCooldownMs = Number(options.manualRefreshCooldownMs ?? 60_000);
    this.lastManualRefreshAt = 0;
  }

  _dep(name, modulePath) {
    if (this.dependencies[name]) return this.dependencies[name];
    try {
      this.dependencies[name] = require(modulePath);
      return this.dependencies[name];
    } catch (_) {
      return null;
    }
  }

  /**
   * Carrega séries já disponíveis nos caches locais do backend (market-regimes-cache.json / us-benchmarks-cache.json)
   * sem disparar chamadas externas, garantindo resposta imediata na primeira consulta.
   */
  async bootstrapFromLocalCaches(now = new Date()) {
    try {
      const brRes = await this.collectors.collectFromMarketRegime(['IBOV', 'IFIX', 'BDRX'], { forceSync: false, now });
      const usRes = await this.collectors.collectFromMarketRegime(['SP500', 'NASDAQ'], { forceSync: false, now });
      const allObs = [...(brRes.observations || []), ...(usRes.observations || [])];
      if (allObs.length) {
        await this.store.upsertObservations(allObs);
      }
      return await this.rebuildAndPersistSnapshot(now);
    } catch (err) {
      console.warn('[ci-pipeline] Aviso no bootstrap local:', err.message);
      return null;
    }
  }

  /**
   * Verifica se um job específico já precisa ser executado com base no fuso horário do mercado
   * e na data de referência esperada (evitando coletas redundantes ou prematuras).
   */
  isJobDue(jobKey, now = new Date()) {
    const def = JOB_DEFINITIONS[jobKey];
    if (!def) return { due: false, reason: 'UNKNOWN_JOB' };

    const scheduleInfo = ingestion.getExpectedReferenceDate({
      market: def.market,
      scheduleKey: def.scheduleKey,
      publishLagDays: 0
    }, now);

    const lastSuccess = this.store.getLastJobSuccess(jobKey);
    if (lastSuccess && lastSuccess.expectedReferenceDate >= scheduleInfo.expectedDate && lastSuccess.status === 'atualizado') {
      return {
        due: false,
        reason: 'ALREADY_UPDATED_FOR_EXPECTED_DATE',
        expectedReferenceDate: scheduleInfo.expectedDate,
        scheduleInfo
      };
    }

    return {
      due: true,
      reason: lastSuccess ? 'NEW_TRADING_DATE_AVAILABLE' : 'INITIAL_COLLECTION_REQUIRED',
      expectedReferenceDate: scheduleInfo.expectedDate,
      scheduleInfo
    };
  }

  /**
   * Executa um job de ingestão com lock de concorrência, idempotência e telemetria.
   */
  async runJob(jobKey, options = {}) {
    const def = JOB_DEFINITIONS[jobKey];
    if (!def) {
      throw Object.assign(new Error(`Job inválido: ${jobKey}`), { status: 400 });
    }

    if (this.activeJobs.has(jobKey)) {
      return this.activeJobs.get(jobKey);
    }

    const now = options.now ? new Date(options.now) : new Date();
    const force = Boolean(options.force);
    const dueCheck = this.isJobDue(jobKey, now);

    if (!force && !dueCheck.due) {
      return {
        jobKey,
        market: def.market,
        status: 'skipped',
        reason: dueCheck.reason,
        expectedReferenceDate: dueCheck.expectedReferenceDate
      };
    }

    const jobPromise = (async () => {
      const startedAt = new Date();
      const allObservations = [];
      const updatedIds = [];
      const errors = [];
      let creditsUsed = 0;

      const absorb = (result) => {
        if (!result) return;
        if (Array.isArray(result.observations)) allObservations.push(...result.observations);
        if (Array.isArray(result.updatedIds)) updatedIds.push(...result.updatedIds);
        if (Array.isArray(result.errors)) errors.push(...result.errors);
        creditsUsed += Number(result.creditsUsed || 0);
      };

      try {
        if (jobKey === 'br_ptax_macro') {
          absorb(await this.collectors.collectBcbMacro({ now, fetchImpl: options.fetchImpl }));
        } else if (jobKey === 'br_market_close') {
          absorb(await this.collectors.collectFromMarketRegime(['IBOV', 'IFIX', 'BDRX'], {
            forceSync: options.forceSyncMarketRegime !== false,
            now
          }));
        } else if (jobKey === 'us_market_close') {
          // 1. Ciclos EUA (SPY, QQQ) via motor canônico market-regime.js
          absorb(await this.collectors.collectFromMarketRegime(['SP500', 'NASDAQ'], {
            forceSync: options.forceSyncMarketRegime !== false,
            now
          }));
          // 2. CBOE VIX oficial (gratuito)
          absorb(await this.collectors.collectCboeVix({ now, fetchImpl: options.fetchImpl }));
          // 3. FRED US10Y & Fed Funds (gratuito quando FRED_API_KEY presente)
          absorb(await this.collectors.collectFredMacro({ now, fetchImpl: options.fetchImpl }));
          // 4. Twelve Data ETFs (Equal-Weight RSP + Ouro/Commodities + 12 Setores EUA — respeitando UsageGuard)
          if (options.includeTwelveDataEtfs !== false) {
            absorb(await this.collectors.collectTwelveDataEtfs(
              ['cycle_us_rsp', ...ingestion.COMMODITY_IDS, ...ingestion.US_SECTOR_IDS],
              { now, provider: options.twelveDataProvider }
            ));
          }
        }

        const upsertRes = await this.store.upsertObservations(allObservations);
        const finishedAt = new Date();

        let status = 'atualizado';
        if (updatedIds.length === 0 && errors.length > 0) status = 'indisponivel';
        else if (errors.length > 0) status = 'parcial';

        const runRecord = await this.store.recordJobRun({
          id: crypto.randomUUID(),
          jobKey,
          market: def.market,
          status,
          expectedReferenceDate: dueCheck.expectedReferenceDate,
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          recordsUpserted: upsertRes.upserted,
          indicatorsUpdated: [...new Set(updatedIds)],
          errors,
          creditsUsed
        });

        await this.rebuildAndPersistSnapshot(now);
        return runRecord;
      } catch (fatalErr) {
        const finishedAt = new Date();
        return await this.store.recordJobRun({
          id: crypto.randomUUID(),
          jobKey,
          market: def.market,
          status: 'indisponivel',
          expectedReferenceDate: dueCheck.expectedReferenceDate,
          startedAt: startedAt.toISOString(),
          finishedAt: finishedAt.toISOString(),
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          recordsUpserted: 0,
          indicatorsUpdated: [],
          errors: [{ message: fatalErr.message }],
          creditsUsed
        });
      }
    })().finally(() => {
      this.activeJobs.delete(jobKey);
    });

    this.activeJobs.set(jobKey, jobPromise);
    return jobPromise;
  }

  /**
   * Executa todos os jobs vencidos (ou todos em modo force).
   */
  async runDueJobs(options = {}) {
    const now = options.now ? new Date(options.now) : new Date();
    const results = [];
    for (const jobKey of Object.keys(JOB_DEFINITIONS)) {
      const res = await this.runJob(jobKey, { ...options, now });
      results.push(res);
    }
    return results;
  }

  /**
   * Disparo manual protegido por cooldown para evitar abuso de cota.
   */
  async triggerManualRefresh({ jobKey = 'all', now = new Date() } = {}) {
    const nowMs = now instanceof Date ? now.getTime() : Date.now();
    if (nowMs - this.lastManualRefreshAt < this.manualRefreshCooldownMs) {
      const waitSec = Math.ceil((this.manualRefreshCooldownMs - (nowMs - this.lastManualRefreshAt)) / 1000);
      const err = new Error(`Atualização recente já executada. Aguarde ${waitSec}s para proteger as cotas de API.`);
      err.status = 429;
      throw err;
    }
    this.lastManualRefreshAt = nowMs;

    if (jobKey === 'all') {
      const runs = await this.runDueJobs({ force: true, now });
      return { triggered: 'all', runs };
    }
    const run = await this.runJob(jobKey, { force: true, now });
    return { triggered: jobKey, runs: [run] };
  }

  async _loadLocalB3Breadth(now = new Date()) {
    try {
      const marketDataSvc = this._dep('marketData', './market-data');
      const marketCentralSvc = this._dep('marketCentral', './market-central');
      if (!marketDataSvc?.readCache || !marketCentralSvc?.calculateMarketBreadth) return null;

      const cache = await marketDataSvc.readCache();
      if (!cache || !Array.isArray(cache.relativeStrength) || !cache.relativeStrength.length) return null;

      const rawDate = cache.b3CotahistDate || cache.dataAsOf || null;
      const asOfDate = rawDate ? String(rawDate).trim().replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3').slice(0, 10) : null;
      const expectedBr = ingestion.getExpectedReferenceDate('cycle_br_ibov', now).expectedDate;

      // Nunca usar dado futuro ou incompleto
      if (asOfDate && expectedBr && asOfDate > expectedBr) return null;

      const breadth = marketCentralSvc.calculateMarketBreadth(cache.relativeStrength);
      if (!breadth || !breadth.dataAvailable) return null;

      const lag = (asOfDate && expectedBr && asOfDate < expectedBr)
        ? ingestion.countBusinessDaysBetween(asOfDate, expectedBr, 'BR')
        : 0;

      return {
        ...breadth,
        universe: 'stock_b3',
        asOfDate,
        status: lag === 0 ? calculator.FRESHNESS.ATUALIZADO : calculator.FRESHNESS.ATRASADO,
        lagBusinessDays: lag
      };
    } catch (_) {
      return null;
    }
  }

  async _loadLocalUsBreadth(now = new Date()) {
    try {
      if (typeof this.dependencies.usBreadthLoader === 'function') {
        return await this.dependencies.usBreadthLoader(now);
      }
      const expectedUsDate = ingestion.getExpectedReferenceDate({ market: 'US', scheduleKey: 'US', publishLagDays: 0 }, now).expectedDate;
      if (
        this._usBreadthCache &&
        this._usBreadthCache.expectedUsDate === expectedUsDate &&
        Date.now() - this._usBreadthCache.loadedAt < 5 * 60 * 1000
      ) {
        return this._usBreadthCache.data;
      }

      const usBreadthSvc = this._dep('usMarketBreadth', './us-market-breadth');
      if (!usBreadthSvc?.computeUsMarketBreadthFromDisk) return null;
      const computed = usBreadthSvc.computeUsMarketBreadthFromDisk({ now });
      this._usBreadthCache = { expectedUsDate, loadedAt: Date.now(), data: computed };
      return computed;
    } catch (_) {
      return null;
    }
  }

  /**
   * Reconstrói e persiste o snapshot diário estritamente a partir das séries armazenadas.
   * Zero I/O externo.
   */
  async rebuildAndPersistSnapshot(now = new Date()) {
    const seriesById = {};
    for (const id of Object.keys(ingestion.INSTRUMENT_CATALOG)) {
      seriesById[id] = await this.store.getSeries(id, { limit: 120 });
    }

    const [brBreadth, usBreadth] = await Promise.all([
      this._loadLocalB3Breadth(now),
      this._loadLocalUsBreadth(now)
    ]);
    const snapshot = calculator.buildDailySnapshot(seriesById, { now, brBreadth, usBreadth });
    await this.store.saveDailySnapshot(snapshot);
    return snapshot;
  }

  /**
   * Agendador independente da abertura da tela.
   */
  startScheduler({ intervalMs = 10 * 60 * 1000, runImmediateBootstrap = true } = {}) {
    if (this.schedulerTimer) return;
    this.schedulerStartedAt = new Date().toISOString();

    if (runImmediateBootstrap) {
      this.bootstrapFromLocalCaches()
        .then(() => this.runDueJobs())
        .catch(err => console.warn('[ci-scheduler] Falha no ciclo inicial:', err.message));
    }

    this.schedulerTimer = setInterval(() => {
      this.runDueJobs().catch(err => console.warn('[ci-scheduler] Falha no ciclo agendado:', err.message));
    }, intervalMs);
    if (typeof this.schedulerTimer.unref === 'function') {
      this.schedulerTimer.unref();
    }
  }

  stopScheduler() {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  // ===========================================================================
  // API INTERNA DE CONSUMO (ZERO CHAMADAS EXTERNAS POR ACESSO DA INTERFACE)
  // ===========================================================================

  async _buildUserPortfolioDimension(userId) {
    if (!userId) {
      return {
        id: 'my_portfolio',
        metricNature: 'portfolio_allocation',
        status: calculator.FRESHNESS.INDISPONIVEL,
        isLive: false,
        equity: null,
        operationalEquity: null,
        realWealth: null,
        checkingWealth: 0,
        heatPct: null,
        heatLimitPct: 5.0,
        openPositionsCount: 0,
        reason: 'UNAUTHENTICATED'
      };
    }

    const wealthSvc = this._dep('wealth', './wealth');
    const tradesSvc = this._dep('trades', './trades');
    const riskSvc = this._dep('riskPolicy', './risk-policy');
    const workspaceStateSvc = this._dep('workspaceState', './workspace-state');

    try {
      const [wealthData, tradesData, policyData, workspaceStateData] = await Promise.all([
        wealthSvc?.list ? wealthSvc.list(userId).catch(() => null) : null,
        tradesSvc?.listPlans
          ? tradesSvc.listPlans(userId).catch(() => [])
          : (tradesSvc?.list ? tradesSvc.list(userId).catch(() => []) : []),
        riskSvc?.get ? riskSvc.get(userId).catch(() => null) : null,
        workspaceStateSvc?.get ? workspaceStateSvc.get(userId).catch(() => ({})) : {}
      ]);

      const tradesList = Array.isArray(tradesData) ? tradesData : (tradesData?.trades || []);
      const wsData = workspaceStateData?.state || workspaceStateData || {};

      const portDim = capitalIntelligencePortfolio.buildPortfolioDimension({
        wealthData,
        tradesData: tradesList,
        policyData,
        workspaceStateData: wsData,
        now: new Date()
      });

      if (portDim.isLive || portDim.operationalEquity > 0 || portDim.realWealth > 0) {
        return {
          ...portDim,
          metricNature: 'portfolio_allocation',
          equity: portDim.operationalEquity,
          localExposureValue: portDim.exposureByRegion?.brazil?.amount || 0,
          globalExposureValue: portDim.exposureByRegion?.global?.amount || 0
        };
      }
    } catch (_) {}

    return {
      id: 'my_portfolio',
      metricNature: 'portfolio_allocation',
      status: calculator.FRESHNESS.INDISPONIVEL,
      isLive: false,
      equity: null,
      operationalEquity: null,
      realWealth: null,
      checkingWealth: 0,
      heatPct: null,
      heatLimitPct: 5.0,
      openPositionsCount: 0,
      reason: 'NO_EQUITY_PERSISTED'
    };
  }

  /**
   * Serve o snapshot mais recente (ou de uma data histórica específica) EXCLUSIVAMENTE do cache/banco interno.
   * Nunca realiza chamadas HTTP externas.
   */
  async getSnapshotForUser(userId, { date = null, now = new Date() } = {}) {
    let baseSnapshot = date
      ? await this.store.getSnapshotByDate(date)
      : await this.store.getLatestSnapshot();

    if (!baseSnapshot && !date) {
      baseSnapshot = await this.rebuildAndPersistSnapshot(now);
    }

    if (!baseSnapshot) {
      return {
        found: false,
        snapshotDate: date,
        overallStatus: calculator.FRESHNESS.INDISPONIVEL,
        message: 'Nenhum snapshot encontrado para a data solicitada.'
      };
    }

    // Reavalia frescor relativo ao `now` atual para NUNCA apresentar dado antigo como atualizado
    const seriesById = {};
    if (!date) {
      for (const id of Object.keys(ingestion.INSTRUMENT_CATALOG)) {
        seriesById[id] = await this.store.getSeries(id, { limit: 120 });
      }
      const [brBreadth, usBreadth] = await Promise.all([
        this._loadLocalB3Breadth(now),
        this._loadLocalUsBreadth(now)
      ]);
      baseSnapshot = calculator.buildDailySnapshot(seriesById, { now, brBreadth, usBreadth });
    }

    const portfolioDim = await this._buildUserPortfolioDimension(userId);

    // Enriquecer eventos oficiais com playbooks do usuário (isolado por tenant)
    let userEvents = [];
    if (userId) {
      const epSvc = this._dep('eventPlaybook', './event-playbook');
      if (epSvc?.list) {
        userEvents = await epSvc.list(userId).catch(() => []);
      }
    }

    const enrichedEvents = calculator.resolveUpcomingOfficialEvents(now, userEvents);

    const enrichedSpheres = {
      ...baseSnapshot.spheres,
      macro_events: {
        ...baseSnapshot.spheres.macro_events,
        upcomingEvents: enrichedEvents
      },
      my_portfolio: portfolioDim
    };

    const allocationSuggestion = allocationEngine.buildAllocationSuggestion({
      snapshot: { ...baseSnapshot, spheres: enrichedSpheres },
      portfolioDimension: portfolioDim,
      now
    });

    return {
      ...baseSnapshot,
      servedFromCache: true,
      spheres: enrichedSpheres,
      allocationSuggestion
    };
  }

  async getSeries(indicatorId, options = {}) {
    const spec = ingestion.INSTRUMENT_CATALOG[indicatorId];
    if (!spec) {
      const err = new Error(`Indicador não encontrado no catálogo: ${indicatorId}`);
      err.status = 404;
      throw err;
    }

    const series = await this.store.getSeries(indicatorId, options);
    const metrics = calculator.computeIndicatorMetrics(indicatorId, series, options.now || new Date());
    return {
      indicator: spec,
      status: metrics.status,
      freshness: metrics.freshness,
      summary: {
        latestValue: metrics.latestValue,
        change1dPct: metrics.change1dPct,
        change5dPct: metrics.change5dPct,
        change21dPct: metrics.change21dPct,
        change63dPct: metrics.change63dPct,
        delta21dPp: metrics.delta21dPp
      },
      observations: series
    };
  }

  async getStatus(now = new Date()) {
    const obs = await this.store.getObservabilitySummary();
    const snapshot = await this.getSnapshotForUser(null, { now });
    const schedules = {};
    for (const [key, def] of Object.entries(JOB_DEFINITIONS)) {
      const check = this.isJobDue(key, now);
      schedules[key] = {
        market: def.market,
        description: def.description,
        expectedReferenceDate: check.expectedReferenceDate,
        isDue: check.due,
        reason: check.reason,
        lastSuccess: this.store.getLastJobSuccess(key)
      };
    }

    let twelveDataQuota = null;
    try {
      const { TwelveDataUsageGuard } = require('./twelve-data-usage-guard');
      twelveDataQuota = new TwelveDataUsageGuard().getStatus();
    } catch (_) {}

    return {
      schedulerActive: Boolean(this.schedulerTimer),
      schedulerStartedAt: this.schedulerStartedAt,
      overallStatus: snapshot?.overallStatus || calculator.FRESHNESS.INDISPONIVEL,
      freshnessSummary: snapshot?.freshnessSummary || null,
      lastSnapshotAt: snapshot?.generatedAt || null,
      schedules,
      storage: obs,
      providers: {
        twelveData: twelveDataQuota,
        fredConfigured: Boolean(process.env.FRED_API_KEY),
        bcbSgs: { configured: true, cost: 'free_official' },
        cboeCsv: { configured: true, cost: 'free_official' }
      },
      availableSnapshotDates: await this.store.listSnapshotDates(30)
    };
  }
}

const defaultPipeline = new CapitalIntelligencePipeline();

module.exports = {
  CapitalIntelligencePipeline,
  JOB_DEFINITIONS,
  pipeline: defaultPipeline
};

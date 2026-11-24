'use strict';

/**
 * CAPITAL INTELLIGENCE — CAMADA DE ARMAZENAMENTO (STORE)
 *
 * Responsabilidades:
 * - Persistência idempotente de séries históricas padronizadas (PostgreSQL + cache atômico em disco).
 * - Persistência de snapshots diários calculados para leitura rápida sem chamadas externas.
 * - Registro de execuções de jobs (observabilidade, duração, créditos e erros).
 *
 * Regra de idempotência:
 * - Cada observação é identificada exclusivamente por (indicator_id, reference_date).
 * - Reprocessamentos sobrescrevem metadados/valores de forma determinística sem jamais duplicar registros.
 */

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const database = require('./database');

const DEFAULT_STORE_PATH = path.join(__dirname, '..', 'data', 'capital-intelligence-store.json');
const MAX_STORED_RUNS = 100;
const MAX_STORED_SNAPSHOTS = 90;

function normalizeDateIso(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const d = new Date(s);
  if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function finiteOrNull(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

class CapitalIntelligenceStore {
  constructor(options = {}) {
    this.storePath = options.storePath || DEFAULT_STORE_PATH;
    this.useDatabase = options.useDatabase !== undefined ? Boolean(options.useDatabase) : null;
    this.state = {
      series: {},        // { [indicatorId]: { [referenceDate]: Observation } }
      snapshots: {},     // { [snapshotDate]: SnapshotRecord }
      runs: [],          // Array<JobRunRecord> (mais recentes primeiro)
      lastJobSuccess: {} // { [jobKey]: { expectedReferenceDate, finishedAt, status } }
    };
    this._loaded = false;
  }

  _dbEnabled() {
    if (this.useDatabase !== null) return this.useDatabase && database.configured();
    return database.configured();
  }

  _ensureLoadedSync() {
    if (this._loaded) return;
    this._loaded = true;
    try {
      if (fs.existsSync(this.storePath)) {
        const raw = fs.readFileSync(this.storePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.state.series = parsed.series || {};
          this.state.snapshots = parsed.snapshots || {};
          this.state.runs = Array.isArray(parsed.runs) ? parsed.runs : [];
          this.state.lastJobSuccess = parsed.lastJobSuccess || {};
        }
      }
    } catch (err) {
      console.warn('[ci-store] Falha ao carregar cache em disco (iniciando vazio):', err.message);
    }
  }

  async _persistDiskAtomic() {
    const dir = path.dirname(this.storePath);
    await fsp.mkdir(dir, { recursive: true });
    const tmp = `${this.storePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(this.state), 'utf8');
    await fsp.rename(tmp, this.storePath);
  }

  /**
   * Normaliza uma observação antes da persistência.
   */
  normalizeObservation(row) {
    if (!row || !row.indicatorId) return null;
    const referenceDate = normalizeDateIso(row.referenceDate || row.date);
    const closeValue = finiteOrNull(row.closeValue ?? row.close ?? row.value);
    if (!referenceDate || closeValue === null) return null;

    return {
      indicatorId: String(row.indicatorId).trim(),
      symbol: String(row.symbol || row.indicatorId).trim().toUpperCase(),
      market: String(row.market || 'GLOBAL').trim().toUpperCase(),
      currency: String(row.currency || 'USD').trim().toUpperCase(),
      unit: String(row.unit || 'pts').trim(),
      metricNature: String(row.metricNature || 'price_performance').trim(),
      referenceDate,
      openValue: finiteOrNull(row.openValue ?? row.open),
      highValue: finiteOrNull(row.highValue ?? row.high),
      lowValue: finiteOrNull(row.lowValue ?? row.low),
      closeValue,
      volume: finiteOrNull(row.volume),
      sourceProvider: String(row.sourceProvider || row.provider || 'unknown').trim(),
      sourceTimestamp: row.sourceTimestamp ? new Date(row.sourceTimestamp).toISOString() : null,
      collectedAt: row.collectedAt ? new Date(row.collectedAt).toISOString() : new Date().toISOString(),
      qualityStatus: String(row.qualityStatus || 'valid').trim(),
      metadata: (row.metadata && typeof row.metadata === 'object') ? row.metadata : {}
    };
  }

  /**
   * Upsert idempotente de lote de observações diárias.
   * Nunca duplica registros para o mesmo (indicatorId, referenceDate).
   */
  async upsertObservations(rows = []) {
    this._ensureLoadedSync();
    if (!Array.isArray(rows) || !rows.length) {
      return { upserted: 0, inserted: 0, updated: 0 };
    }

    const normalized = [];
    const dedupMap = new Map();
    for (const r of rows) {
      const obs = this.normalizeObservation(r);
      if (!obs) continue;
      dedupMap.set(`${obs.indicatorId}::${obs.referenceDate}`, obs);
    }
    for (const obs of dedupMap.values()) normalized.push(obs);

    if (!normalized.length) return { upserted: 0, inserted: 0, updated: 0 };

    let inserted = 0;
    let updated = 0;

    for (const obs of normalized) {
      if (!this.state.series[obs.indicatorId]) {
        this.state.series[obs.indicatorId] = {};
      }
      const exists = Boolean(this.state.series[obs.indicatorId][obs.referenceDate]);
      this.state.series[obs.indicatorId][obs.referenceDate] = obs;
      if (exists) updated += 1;
      else inserted += 1;
    }

    if (this._dbEnabled()) {
      try {
        await database.transaction(async (client) => {
          for (const obs of normalized) {
            await client.query(
              `INSERT INTO app.ci_indicator_series (
                 indicator_id, symbol, market, currency, unit, metric_nature,
                 reference_date, open_value, high_value, low_value, close_value, volume,
                 source_provider, source_timestamp, collected_at, quality_status, metadata
               ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
               ON CONFLICT (indicator_id, reference_date) DO UPDATE SET
                 symbol = EXCLUDED.symbol,
                 market = EXCLUDED.market,
                 currency = EXCLUDED.currency,
                 unit = EXCLUDED.unit,
                 metric_nature = EXCLUDED.metric_nature,
                 open_value = COALESCE(EXCLUDED.open_value, app.ci_indicator_series.open_value),
                 high_value = COALESCE(EXCLUDED.high_value, app.ci_indicator_series.high_value),
                 low_value = COALESCE(EXCLUDED.low_value, app.ci_indicator_series.low_value),
                 close_value = EXCLUDED.close_value,
                 volume = COALESCE(EXCLUDED.volume, app.ci_indicator_series.volume),
                 source_provider = EXCLUDED.source_provider,
                 source_timestamp = COALESCE(EXCLUDED.source_timestamp, app.ci_indicator_series.source_timestamp),
                 collected_at = EXCLUDED.collected_at,
                 quality_status = EXCLUDED.quality_status,
                 metadata = EXCLUDED.metadata`,
              [
                obs.indicatorId, obs.symbol, obs.market, obs.currency, obs.unit, obs.metricNature,
                obs.referenceDate, obs.openValue, obs.highValue, obs.lowValue, obs.closeValue, obs.volume,
                obs.sourceProvider, obs.sourceTimestamp, obs.collectedAt, obs.qualityStatus, JSON.stringify(obs.metadata)
              ]
            );
          }
        });
      } catch (dbErr) {
        console.warn('[ci-store] Falha ao persistir séries no PostgreSQL (cache em disco preservado):', dbErr.message);
      }
    }

    await this._persistDiskAtomic();
    return { upserted: normalized.length, inserted, updated };
  }

  /**
   * Consulta série histórica ordenada cronologicamente (ASC).
   */
  async getSeries(indicatorId, { limit = 260, from = null, to = null } = {}) {
    this._ensureLoadedSync();
    const id = String(indicatorId || '').trim();
    if (!id) return [];

    if (this._dbEnabled()) {
      try {
        const params = [id];
        const where = ['indicator_id = $1'];
        if (from) {
          params.push(from);
          where.push(`reference_date >= $${params.length}`);
        }
        if (to) {
          params.push(to);
          where.push(`reference_date <= $${params.length}`);
        }
        params.push(Math.max(1, Math.min(1000, Number(limit) || 260)));

        const res = await database.query(
          `SELECT indicator_id, symbol, market, currency, unit, metric_nature,
                  reference_date::text AS reference_date,
                  open_value, high_value, low_value, close_value, volume,
                  source_provider, source_timestamp, collected_at, quality_status, metadata
           FROM app.ci_indicator_series
           WHERE ${where.join(' AND ')}
           ORDER BY reference_date DESC
           LIMIT $${params.length}`,
          params
        );

        if (res.rowCount > 0) {
          return res.rows.map(r => ({
            indicatorId: r.indicator_id,
            symbol: r.symbol,
            market: r.market,
            currency: r.currency,
            unit: r.unit,
            metricNature: r.metric_nature,
            referenceDate: r.reference_date,
            openValue: finiteOrNull(r.open_value),
            highValue: finiteOrNull(r.high_value),
            lowValue: finiteOrNull(r.low_value),
            closeValue: finiteOrNull(r.close_value),
            volume: finiteOrNull(r.volume),
            sourceProvider: r.source_provider,
            sourceTimestamp: r.source_timestamp ? new Date(r.source_timestamp).toISOString() : null,
            collectedAt: r.collected_at ? new Date(r.collected_at).toISOString() : null,
            qualityStatus: r.quality_status,
            metadata: r.metadata || {}
          })).reverse();
        }
      } catch (err) {
        // Fallback silencioso para memória/disco
      }
    }

    const bucket = this.state.series[id] || {};
    let rows = Object.values(bucket);
    if (from) rows = rows.filter(r => r.referenceDate >= from);
    if (to) rows = rows.filter(r => r.referenceDate <= to);
    rows.sort((a, b) => a.referenceDate.localeCompare(b.referenceDate));
    const lim = Math.max(1, Math.min(1000, Number(limit) || 260));
    return rows.slice(-lim);
  }

  async getLatestObservation(indicatorId) {
    const series = await this.getSeries(indicatorId, { limit: 1 });
    return series.length ? series[series.length - 1] : null;
  }

  async listStoredIndicatorIds() {
    this._ensureLoadedSync();
    return Object.keys(this.state.series).sort();
  }

  /**
   * Salva snapshot diário idempotente (1 snapshot por snapshotDate + schemaVersion).
   */
  async saveDailySnapshot(snapshot) {
    this._ensureLoadedSync();
    if (!snapshot || !snapshot.snapshotDate) return null;

    const date = normalizeDateIso(snapshot.snapshotDate);
    const schemaVersion = String(snapshot.schemaVersion || '1.0');
    const overallStatus = String(snapshot.overallStatus || 'parcial');
    const generatedAt = snapshot.generatedAt || new Date().toISOString();

    const record = {
      snapshotDate: date,
      schemaVersion,
      overallStatus,
      generatedAt,
      payload: snapshot
    };

    this.state.snapshots[date] = record;

    // Mantém janela dos últimos N snapshots no disco
    const dates = Object.keys(this.state.snapshots).sort();
    if (dates.length > MAX_STORED_SNAPSHOTS) {
      for (const oldDate of dates.slice(0, dates.length - MAX_STORED_SNAPSHOTS)) {
        delete this.state.snapshots[oldDate];
      }
    }

    if (this._dbEnabled()) {
      try {
        await database.query(
          `INSERT INTO app.ci_daily_snapshots (snapshot_date, schema_version, overall_status, payload, generated_at)
           VALUES ($1, $2, $3, $4::jsonb, $5)
           ON CONFLICT (snapshot_date, schema_version) DO UPDATE SET
             overall_status = EXCLUDED.overall_status,
             payload = EXCLUDED.payload,
             generated_at = EXCLUDED.generated_at`,
          [date, schemaVersion, overallStatus, JSON.stringify(snapshot), generatedAt]
        );
      } catch (dbErr) {
        console.warn('[ci-store] Falha ao salvar snapshot no PostgreSQL:', dbErr.message);
      }
    }

    await this._persistDiskAtomic();
    return record;
  }

  async getLatestSnapshot() {
    this._ensureLoadedSync();

    if (this._dbEnabled()) {
      try {
        const res = await database.query(
          `SELECT snapshot_date::text AS snapshot_date, schema_version, overall_status, payload, generated_at
           FROM app.ci_daily_snapshots
           ORDER BY snapshot_date DESC, generated_at DESC
           LIMIT 1`
        );
        if (res.rowCount > 0) {
          const r = res.rows[0];
          return r.payload;
        }
      } catch (_) {}
    }

    const dates = Object.keys(this.state.snapshots).sort();
    if (!dates.length) return null;
    return this.state.snapshots[dates[dates.length - 1]]?.payload || null;
  }

  async getSnapshotByDate(date) {
    this._ensureLoadedSync();
    const clean = normalizeDateIso(date);
    if (!clean) return null;

    if (this._dbEnabled()) {
      try {
        const res = await database.query(
          `SELECT payload FROM app.ci_daily_snapshots WHERE snapshot_date = $1 ORDER BY generated_at DESC LIMIT 1`,
          [clean]
        );
        if (res.rowCount > 0) return res.rows[0].payload;
      } catch (_) {}
    }

    return this.state.snapshots[clean]?.payload || null;
  }

  async listSnapshotDates(limit = 30) {
    this._ensureLoadedSync();
    const lim = Math.max(1, Math.min(365, Number(limit) || 30));

    if (this._dbEnabled()) {
      try {
        const res = await database.query(
          `SELECT snapshot_date::text AS snapshot_date, overall_status, generated_at
           FROM app.ci_daily_snapshots
           ORDER BY snapshot_date DESC
           LIMIT $1`,
          [lim]
        );
        if (res.rowCount > 0) {
          return res.rows.map(r => ({
            snapshotDate: r.snapshot_date,
            overallStatus: r.overall_status,
            generatedAt: r.generated_at
          }));
        }
      } catch (_) {}
    }

    return Object.values(this.state.snapshots)
      .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))
      .slice(0, lim)
      .map(s => ({
        snapshotDate: s.snapshotDate,
        overallStatus: s.overallStatus,
        generatedAt: s.generatedAt
      }));
  }

  /**
   * Registra telemetria de execução de um job agendado ou manual.
   */
  async recordJobRun(run) {
    this._ensureLoadedSync();
    const record = {
      id: run.id || crypto.randomUUID(),
      jobKey: String(run.jobKey || 'unknown'),
      market: String(run.market || 'GLOBAL'),
      status: String(run.status || 'completed'), // 'atualizado' | 'parcial' | 'indisponivel' | 'skipped'
      expectedReferenceDate: normalizeDateIso(run.expectedReferenceDate),
      startedAt: run.startedAt || new Date().toISOString(),
      finishedAt: run.finishedAt || new Date().toISOString(),
      durationMs: Number(run.durationMs || 0),
      recordsUpserted: Number(run.recordsUpserted || 0),
      indicatorsUpdated: Array.isArray(run.indicatorsUpdated) ? run.indicatorsUpdated : [],
      errors: Array.isArray(run.errors) ? run.errors : [],
      creditsUsed: Number(run.creditsUsed || 0)
    };

    this.state.runs.unshift(record);
    if (this.state.runs.length > MAX_STORED_RUNS) {
      this.state.runs = this.state.runs.slice(0, MAX_STORED_RUNS);
    }

    if (record.status === 'atualizado' || record.status === 'parcial') {
      this.state.lastJobSuccess[record.jobKey] = {
        expectedReferenceDate: record.expectedReferenceDate,
        finishedAt: record.finishedAt,
        status: record.status
      };
    }

    if (this._dbEnabled()) {
      try {
        await database.query(
          `INSERT INTO app.ci_pipeline_runs (
             id, job_key, market, status, expected_reference_date, started_at, finished_at,
             duration_ms, records_upserted, indicators_updated, errors, credits_used
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12)`,
          [
            record.id, record.jobKey, record.market, record.status, record.expectedReferenceDate,
            record.startedAt, record.finishedAt, record.durationMs, record.recordsUpserted,
            JSON.stringify(record.indicatorsUpdated), JSON.stringify(record.errors), record.creditsUsed
          ]
        );
      } catch (dbErr) {
        console.warn('[ci-store] Falha ao gravar log de execução no PostgreSQL:', dbErr.message);
      }
    }

    await this._persistDiskAtomic();
    return record;
  }

  getLastJobSuccess(jobKey) {
    this._ensureLoadedSync();
    return this.state.lastJobSuccess[jobKey] || null;
  }

  async getJobRuns(limit = 20) {
    this._ensureLoadedSync();
    const lim = Math.max(1, Math.min(100, Number(limit) || 20));
    return this.state.runs.slice(0, lim);
  }

  async getObservabilitySummary() {
    this._ensureLoadedSync();
    const indicatorIds = Object.keys(this.state.series);
    let totalObservations = 0;
    for (const id of indicatorIds) {
      totalObservations += Object.keys(this.state.series[id] || {}).length;
    }

    return {
      storageMode: this._dbEnabled() ? 'postgresql+disk-cache' : 'disk-cache',
      indicatorsTracked: indicatorIds.length,
      totalObservations,
      snapshotsStored: Object.keys(this.state.snapshots).length,
      lastJobSuccess: Object.assign({}, this.state.lastJobSuccess),
      recentRuns: this.state.runs.slice(0, 12)
    };
  }
}

module.exports = {
  CapitalIntelligenceStore,
  normalizeDateIso
};
